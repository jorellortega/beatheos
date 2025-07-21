"use client"

import { useState, useEffect } from 'react'
import { Plus, Music, Upload, Calendar, Globe, FileText, CheckCircle2, XCircle, AlertCircle, ExternalLink, Info, FileMusic, FileArchive, FileAudio, File, Music2, Piano, Drum, Trash2, Save, Pencil, Folder, Grid, List, Package, Search, Edit3, Settings, RefreshCw, ChevronDown, ChevronRight, X, Download } from 'lucide-react'
import { MassEditSubfolderModal } from '@/components/MassEditSubfolderModal'
import { MassEditSelectedFilesModal } from '@/components/MassEditSelectedFilesModal'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

// Types for audio library data
interface AudioLibraryItem {
  id: string
  name: string
  type: string
  description?: string
  file_url?: string
  file_size?: number
  pack_id?: string
  subfolder?: string
  pack?: AudioPack
  bpm?: number
  key?: string
  audio_type?: string
  genre?: string
  subgenre?: string
  tags?: string[]
  created_at: string
  updated_at: string
}

interface AudioPack {
  id: string
  name: string
  description?: string
  cover_image_url?: string
  color: string
  created_at: string
  updated_at: string
  item_count?: number
  subfolders?: AudioSubfolder[]
}

interface AudioSubfolder {
  id: string
  pack_id: string
  name: string
  description?: string
  color: string
  position: number
  created_at: string
  updated_at: string
}

export default function EditData() {
  const { user } = useAuth();
  
  // State for audio library data
  const [audioItems, setAudioItems] = useState<AudioLibraryItem[]>([]);
  const [audioPacks, setAudioPacks] = useState<AudioPack[]>([]);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  
  // State for editing
  const [selectedTab, setSelectedTab] = useState('audio');
  const [viewMode, setViewMode] = useState<'grid' | 'packs'>('packs');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState('all');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  
  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 20;
  
  // State for packs view
  const [loadingPacks, setLoadingPacks] = useState(false);
  const [packError, setPackError] = useState<string | null>(null);
  const [selectedPack, setSelectedPack] = useState<string | null>(null);
  const [expandedSubfolders, setExpandedSubfolders] = useState<Set<string>>(new Set());
  
  // State for drag and drop
  const [draggedItem, setDraggedItem] = useState<AudioLibraryItem | null>(null);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [showDragDialog, setShowDragDialog] = useState(false);
  const [dragDialogInfo, setDragDialogInfo] = useState<any>(null);
  
  // State for upload progress
  const [uploadProgress, setUploadProgress] = useState({
    isUploading: false,
    currentFile: '',
    currentIndex: 0,
    totalFiles: 0,
    completedFiles: [] as string[]
  });
  
  // State for mass edit modals
  const [showMassEditModal, setShowMassEditModal] = useState(false);
  const [showMassEditSelectedModal, setShowMassEditSelectedModal] = useState(false);
  const [massEditPack, setMassEditPack] = useState<AudioPack | null>(null);
  const [massEditSubfolder, setMassEditSubfolder] = useState<AudioSubfolder | null>(null);
  
  // State for modals
  const [showEditAudioModal, setShowEditAudioModal] = useState(false);
  const [showEditPackModal, setShowEditPackModal] = useState(false);
  const [showEditSubfolderModal, setShowEditSubfolderModal] = useState(false);
  const [editingItem, setEditingItem] = useState<AudioLibraryItem | null>(null);
  const [editingPack, setEditingPack] = useState<AudioPack | null>(null);
  const [editingSubfolder, setEditingSubfolder] = useState<AudioSubfolder | null>(null);
  
  // State for forms
  const [editForm, setEditForm] = useState({
    name: '',
    type: '',
    description: '',
    bpm: '',
    key: '',
    audio_type: '',
    genre: '',
    subgenre: '',
    tags: '',
    pack_id: '',
    subfolder: ''
  });
  
  const [editPackForm, setEditPackForm] = useState({
    name: '',
    description: '',
    color: '#3b82f6'
  });
  
  const [editSubfolderForm, setEditSubfolderForm] = useState({
    name: '',
    description: '',
    color: '#10b981',
    pack_id: ''
  });
  
  // State for operations
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // State for advanced search filters
  const [bpmRange, setBpmRange] = useState({ min: '', max: '' });
  const [missingDataFilter, setMissingDataFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [genreFilter, setGenreFilter] = useState('');

  // Load audio library data
  useEffect(() => {
    if (user) {
      loadAudioData();
      loadAudioPacks();
    }
  }, [user]);

  const loadAudioData = async (page: number = 1) => {
    if (!user) return;
    
    setLoadingAudio(true);
    setAudioError(null);
    
    try {
      // Calculate offset for pagination
      const offset = (page - 1) * itemsPerPage;
      
      // Get total count first
      const { count, error: countError } = await supabase
        .from('audio_library_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (countError) throw countError;
      
      setTotalItems(count || 0);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
      
      // Get paginated data
      const { data, error } = await supabase
        .from('audio_library_items')
        .select(`
          *,
          pack:audio_packs(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + itemsPerPage - 1);

      if (error) throw error;
      
      // Convert null values to undefined to match interface
      const processedData = (data || []).map(item => ({
        ...item,
        pack_id: item.pack_id || undefined,
        subfolder: item.subfolder || undefined,
        bpm: item.bpm || undefined,
        key: item.key || undefined,
        audio_type: item.audio_type || undefined,
        genre: item.genre || undefined,
        subgenre: item.subgenre || undefined,
        tags: item.tags || undefined
      }));
      
      setAudioItems(processedData);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error loading audio data:', error);
      setAudioError('Failed to load audio data');
    } finally {
      setLoadingAudio(false);
    }
  };

  const loadAudioPacks = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('audio_packs')
        .select(`
          *,
          subfolders:audio_subfolders(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setAudioPacks(data || []);
    } catch (error) {
      console.error('Error loading audio packs:', error);
    }
  };

  // File selection functions
  const toggleFileSelection = (fileId: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId);
    } else {
      newSelection.add(fileId);
    }
    setSelectedFiles(newSelection);
  };

  const clearSelection = () => {
    setSelectedFiles(new Set());
  };

  const selectAllFiles = () => {
    const allFileIds = new Set(audioItems.map(item => item.id));
    setSelectedFiles(allFileIds);
  };

  const selectAllSearchResults = () => {
    const searchResultIds = new Set(filteredAudioItems.map(item => item.id));
    setSelectedFiles(searchResultIds);
  };

  const selectVisibleSearchResults = (packId?: string, subfolderName?: string) => {
    const visibleItems = audioItems.filter(item => {
      if (packId && item.pack_id !== packId) return false;
      if (subfolderName && item.subfolder !== subfolderName) return false;
      return true;
    });
    const visibleIds = new Set(visibleItems.map(item => item.id));
    setSelectedFiles(visibleIds);
  };

  const moveSelectedFiles = async (targetSubfolder: string, targetPackId: string) => {
    if (selectedFiles.size === 0) return;

    try {
      const { error } = await supabase
        .from('audio_library_items')
        .update({
          pack_id: targetPackId,
          subfolder: targetSubfolder
        })
        .in('id', Array.from(selectedFiles));

      if (error) throw error;

      // Update local state
      setAudioItems(prev => prev.map(item => 
        selectedFiles.has(item.id) 
          ? { ...item, pack_id: targetPackId, subfolder: targetSubfolder }
          : item
      ));

      setSelectedFiles(new Set());
    } catch (error) {
      console.error('Error moving files:', error);
      alert('Failed to move files');
    }
  };

  // Drag and drop functions
  const handleDragStart = (e: React.DragEvent, item: AudioLibraryItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setIsDraggingFiles(false);
    setDragOverTarget(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (target: string) => {
    setDragOverTarget(target);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverTarget(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetSubfolder: string | null, targetPackId: string | null) => {
    e.preventDefault();
    
    setIsDraggingFiles(false);
    setDragOverTarget(null);
    setShowDragDialog(false);
    setDragDialogInfo(null);

    if (!draggedItem) return;

    try {
      const updateData = {
        pack_id: targetPackId,
        subfolder: targetSubfolder
      };
      
      const { error } = await supabase
        .from('audio_library_items')
        .update(updateData)
        .eq('id', draggedItem.id);

      if (error) throw error;

      // Update local state
      setAudioItems(prev => prev.map(item => 
        item.id === draggedItem.id 
          ? { ...item, pack_id: targetPackId || undefined, subfolder: targetSubfolder || undefined }
          : item
      ));

      setDraggedItem(null);
    } catch (error) {
      console.error('Error moving file:', error);
    }
  };

  const toggleSubfolder = (subfolderId: string) => {
    const newExpanded = new Set(expandedSubfolders);
    if (newExpanded.has(subfolderId)) {
      newExpanded.delete(subfolderId);
    } else {
      newExpanded.add(subfolderId);
    }
    setExpandedSubfolders(newExpanded);
  };

  // Mass edit functions
  const openMassEditModal = (pack: AudioPack, subfolder: AudioSubfolder) => {
    setMassEditPack(pack);
    setMassEditSubfolder(subfolder);
    setShowMassEditModal(true);
  };

  const openMassEditSelectedModal = () => {
    setShowMassEditSelectedModal(true);
  };

  // Edit functions
  const openEditAudioModal = (item: AudioLibraryItem) => {
    setEditingItem(item);
    setEditForm({
      name: item.name || '',
      type: item.type || '',
      description: item.description || '',
      bpm: item.bpm?.toString() || '',
      key: item.key || '',
      audio_type: item.audio_type || '',
      genre: item.genre || '',
      subgenre: item.subgenre || '',
      tags: item.tags?.join(', ') || '',
      pack_id: item.pack_id || '',
      subfolder: item.subfolder || ''
    });
    setShowEditAudioModal(true);
  };

  const openEditPackModal = (pack: AudioPack) => {
    setEditingPack(pack);
    setEditPackForm({
      name: pack.name || '',
      description: pack.description || '',
      color: pack.color || '#3b82f6'
    });
    setShowEditPackModal(true);
  };

  const openEditSubfolderModal = (subfolder: AudioSubfolder) => {
    setEditingSubfolder(subfolder);
    setEditSubfolderForm({
      name: subfolder.name || '',
      description: subfolder.description || '',
      color: subfolder.color || '#10b981',
      pack_id: subfolder.pack_id || ''
    });
    setShowEditSubfolderModal(true);
  };

  // Save functions
  const handleSaveAudio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !user) return;

    setSaving(true);
    
    try {
      const updateData = {
        name: editForm.name,
        type: editForm.type,
        description: editForm.description,
        bpm: editForm.bpm ? parseInt(editForm.bpm) : null,
        key: editForm.key,
        audio_type: editForm.audio_type,
        genre: editForm.genre,
        subgenre: editForm.subgenre,
        tags: editForm.tags ? editForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
        pack_id: editForm.pack_id || null,
        subfolder: editForm.subfolder || null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('audio_library_items')
        .update(updateData)
        .eq('id', editingItem.id);

      if (error) throw error;

      // Update local state
      setAudioItems(prev => prev.map(item => 
        item.id === editingItem.id 
          ? { ...item, ...updateData }
          : item
      ));

      setShowEditAudioModal(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Error saving audio item:', error);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPack || !user) return;

    setSaving(true);
    
    try {
      const updateData = {
        name: editPackForm.name,
        description: editPackForm.description,
        color: editPackForm.color,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('audio_packs')
        .update(updateData)
        .eq('id', editingPack.id);

      if (error) throw error;

      // Update local state
      setAudioPacks(prev => prev.map(pack => 
        pack.id === editingPack.id 
          ? { ...pack, ...updateData }
          : pack
      ));

      setShowEditPackModal(false);
      setEditingPack(null);
    } catch (error) {
      console.error('Error saving pack:', error);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSubfolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubfolder || !user) return;

    setSaving(true);
    
    try {
      const updateData = {
        name: editSubfolderForm.name,
        description: editSubfolderForm.description,
        color: editSubfolderForm.color,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('audio_subfolders')
        .update(updateData)
        .eq('id', editingSubfolder.id);

      if (error) throw error;

      // Update local state
      setAudioPacks(prev => prev.map(pack => ({
        ...pack,
        subfolders: pack.subfolders?.map(subfolder => 
          subfolder.id === editingSubfolder.id 
            ? { ...subfolder, ...updateData }
            : subfolder
        )
      })));

      setShowEditSubfolderModal(false);
      setEditingSubfolder(null);
    } catch (error) {
      console.error('Error saving subfolder:', error);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // Delete functions
  const handleDeleteAudio = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this audio item?')) return;

    setDeleting(true);
    
    try {
      const { error } = await supabase
        .from('audio_library_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      // Update local state
      setAudioItems(prev => prev.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('Error deleting audio item:', error);
      alert('Failed to delete item');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeletePack = async (packId: string) => {
    if (!confirm('Are you sure you want to delete this pack? This will also delete all subfolders and move all files to unpacked.')) return;

    setDeleting(true);
    
    try {
      // Move all files in this pack to unpacked
      const { error: updateError } = await supabase
        .from('audio_library_items')
        .update({ pack_id: null, subfolder: null })
        .eq('pack_id', packId);

      if (updateError) throw updateError;

      // Delete subfolders
      const { error: subfolderError } = await supabase
        .from('audio_subfolders')
        .delete()
        .eq('pack_id', packId);

      if (subfolderError) throw subfolderError;

      // Delete pack
      const { error: packError } = await supabase
        .from('audio_packs')
        .delete()
        .eq('id', packId);

      if (packError) throw packError;

      // Refresh data
      await loadAudioData();
      await loadAudioPacks();
    } catch (error) {
      console.error('Error deleting pack:', error);
      alert('Failed to delete pack');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSubfolder = async (subfolderId: string) => {
    if (!confirm('Are you sure you want to delete this subfolder? Files will be moved to the pack root.')) return;

    setDeleting(true);
    
    try {
      // Move all files in this subfolder to pack root
      const { error: updateError } = await supabase
        .from('audio_library_items')
        .update({ subfolder: null })
        .eq('subfolder', subfolderId);

      if (updateError) throw updateError;

      // Delete subfolder
      const { error: subfolderError } = await supabase
        .from('audio_subfolders')
        .delete()
        .eq('id', subfolderId);

      if (subfolderError) throw subfolderError;

      // Refresh data
      await loadAudioData();
      await loadAudioPacks();
    } catch (error) {
      console.error('Error deleting subfolder:', error);
      alert('Failed to delete subfolder');
    } finally {
      setDeleting(false);
    }
  };

  // Filter functions
  const getFilteredAudioItems = (items: AudioLibraryItem[]) => {
    if (!searchQuery) return items;
    
    const query = searchQuery.toLowerCase();
    return items.filter(item => 
      item.name.toLowerCase().includes(query) ||
      item.audio_type?.toLowerCase().includes(query) ||
      item.genre?.toLowerCase().includes(query) ||
      item.subgenre?.toLowerCase().includes(query) ||
      item.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  };

  // Filter packs based on search query
  const getFilteredPacks = (packs: AudioPack[]) => {
    if (!searchQuery) return packs;
    
    const query = searchQuery.toLowerCase();
    return packs.filter(pack => 
      pack.name.toLowerCase().includes(query) ||
      pack.description?.toLowerCase().includes(query) ||
      // Also include packs that contain matching audio items
      audioItems.some(item => 
        item.pack_id === pack.id && 
        (item.name.toLowerCase().includes(query) ||
         item.audio_type?.toLowerCase().includes(query) ||
         item.genre?.toLowerCase().includes(query) ||
         item.subgenre?.toLowerCase().includes(query) ||
         item.tags?.some(tag => tag.toLowerCase().includes(query)))
      )
    );
  };

  // Filter subfolders based on search query
  const getFilteredSubfolders = (subfolders: AudioSubfolder[]) => {
    if (!searchQuery) return subfolders;
    
    const query = searchQuery.toLowerCase();
    return subfolders.filter(subfolder => 
      subfolder.name.toLowerCase().includes(query) ||
      subfolder.description?.toLowerCase().includes(query) ||
      // Also include subfolders that contain matching audio items
      audioItems.some(item => 
        item.pack_id === subfolder.pack_id && 
        item.subfolder === subfolder.name &&
        (item.name.toLowerCase().includes(query) ||
         item.audio_type?.toLowerCase().includes(query) ||
         item.genre?.toLowerCase().includes(query) ||
         item.subgenre?.toLowerCase().includes(query) ||
         item.tags?.some(tag => tag.toLowerCase().includes(query)))
      )
    );
  };

  // Handle search with pagination
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query) {
      // For search, we need to load all items to filter client-side
      // This is a limitation of the current approach
      setCurrentPage(1);
    } else {
      // Reset to first page when clearing search
      await loadAudioData(1);
    }
  };

  const filteredAudioItems = getFilteredAudioItems(audioItems);
  const filteredPacks = getFilteredPacks(audioPacks);
  const filteredSubfolders = getFilteredSubfolders(audioPacks.flatMap(pack => pack.subfolders || []));

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Edit Data</h1>
          <p>Please log in to access the edit data page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-center mb-2">Beatheos AI Data Editor</h1>
        <p className="text-lg text-gray-600 text-center">Manage and edit your audio library, packs, and metadata with AI-powered organization</p>
      </div>

      {/* Global Search */}
      <div className="mb-6">
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search all audio files, packs, and subfolders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-3 text-lg border-2 focus:border-blue-500"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {searchQuery && (
            <div className="mt-2 text-sm text-gray-600 text-center">
              Searching for "{searchQuery}" across all data...
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-semibold">Edit Data</h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => loadAudioData()}
            disabled={loadingAudio}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="audio">Audio Library</TabsTrigger>
          <TabsTrigger value="packs">Packs</TabsTrigger>
          <TabsTrigger value="subfolders">Subfolders</TabsTrigger>
        </TabsList>

                {/* Audio Library Tab */}
        <TabsContent value="audio" className="space-y-4">
          {/* View Mode Toggle */}
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4 mr-2" />
                All Files
              </Button>
              <Button
                variant={viewMode === 'packs' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('packs')}
              >
                <Package className="h-4 w-4 mr-2" />
                Packs
              </Button>
            </div>
            
            {/* Global Selection Controls */}
            {viewMode === 'packs' && audioItems.length > 0 && (
              <div className="flex items-center gap-2">
                {selectedFiles.size > 0 && (
                  <>
                    <span className="text-sm text-yellow-600 font-medium">
                      {selectedFiles.size} files selected
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={clearSelection}
                      className="text-xs h-8"
                    >
                      Clear
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={openMassEditSelectedModal}
                      className="text-xs h-8 bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Mass Edit
                    </Button>
                  </>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={selectAllFiles}
                  className="text-xs h-8"
                >
                  Select All Files
                </Button>
                {searchQuery && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={selectAllSearchResults}
                    className="text-xs h-8 bg-green-600 text-white hover:bg-green-700"
                  >
                    Select All Matching Files
                  </Button>
                )}
              </div>
            )}
            
            {draggedItem && (
              <div className="text-sm text-blue-600 font-medium">
                📁 Drag "{draggedItem.name}" to organize it into a folder
              </div>
            )}
            {isDraggingFiles && (
              <div className="text-sm text-green-600 font-medium">
                📤 Drag audio files from your computer to upload them directly into folders
              </div>
            )}
            {dragOverTarget && (
              <div className="text-sm text-green-600 font-medium">
                🎯 Drop zone active: {dragOverTarget.replace(/.*-/, '')}
                {isDraggingFiles ? ' (Upload files here)' : ' (Move existing file here)'}
              </div>
            )}
          </div>

          {/* Upload Progress Indicator */}
          {uploadProgress.isUploading && (
            <div className="bg-yellow-900 border border-yellow-500 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white font-medium">Uploading Files...</span>
                    <span className="text-black text-sm font-medium">
                      {uploadProgress.currentIndex} / {uploadProgress.totalFiles}
                    </span>
                  </div>
                  <div className="text-sm text-black font-medium mb-2">
                    Current: {uploadProgress.currentFile}
                  </div>
                  <div className="w-full bg-yellow-800 rounded-full h-2">
                    <div 
                      className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${(uploadProgress.currentIndex / uploadProgress.totalFiles) * 100}%` 
                      }}
                    ></div>
                  </div>
                  {uploadProgress.completedFiles.length > 0 && (
                    <div className="mt-2 text-xs text-black font-medium">
                      ✅ Completed: {uploadProgress.completedFiles.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {viewMode === 'grid' && (
            <div className="space-y-4">
              {loadingAudio ? (
                <div>Loading audio files...</div>
              ) : audioError ? (
                <div className="text-red-500">{audioError}</div>
              ) : filteredAudioItems.length === 0 ? (
                <div>No audio files found.</div>
              ) : (
                <>
                  <div className="text-sm text-gray-400 mb-4">
                    Page {currentPage} of {Math.ceil(totalItems / itemsPerPage)} - Showing {filteredAudioItems.length} files
                  </div>
                  {filteredAudioItems.map(item => (
                    <Card 
                      key={item.id} 
                      className={`p-6 flex items-center gap-6 cursor-move transition-opacity ${
                        draggedItem?.id === item.id ? 'opacity-50' : ''
                      }`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
                        {item.type === 'midi' && <Piano className="h-6 w-6 text-yellow-400" />}
                        {item.type === 'soundkit' && <Drum className="h-6 w-6 text-red-400" />}
                        {item.type === 'loop' && <Music className="h-6 w-6 text-blue-400" />}
                        {item.type === 'patch' && <Music2 className="h-6 w-6 text-green-400" />}
                        {item.type === 'sample' && <FileAudio className="h-6 w-6 text-purple-400" />}
                        {item.type === 'clip' && <FileMusic className="h-6 w-6 text-pink-400" />}
                        {item.type === 'other' && <File className="h-6 w-6 text-gray-400" />}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">{item.name}</h3>
                        <p className="text-sm text-gray-400 mb-1">{item.description}</p>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-gray-500 capitalize">{item.type}</span>
                          {item.bpm && (
                            <Badge variant="secondary" className="text-xs">
                              {item.bpm} BPM
                            </Badge>
                          )}
                          {item.key && (
                            <Badge variant="secondary" className="text-xs">
                              {item.key}
                            </Badge>
                          )}
                          {item.audio_type && (
                            <Badge variant="outline" className="text-xs">
                              {item.audio_type}
                            </Badge>
                          )}
                          {item.tags && item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {item.tags.slice(0, 3).map((tag, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {item.tags.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{item.tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                          {item.pack && (
                            <Badge 
                              variant="outline" 
                              style={{ borderColor: item.pack.color, color: item.pack.color }}
                              className="text-xs"
                            >
                              {item.pack.name}
                              {item.subfolder && ` / ${item.subfolder}`}
                            </Badge>
                          )}
                        </div>
                        {item.file_url && (
                          <audio 
                            controls 
                            src={item.file_url} 
                            className="h-8 mt-2" 
                            onDragStart={(e) => e.preventDefault()}
                          />
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditAudioModal(item)}>
                          <Pencil className="h-4 w-4 mr-2" />Edit
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <a href={item.file_url} download>Download</a>
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteAudio(item.id)}>
                          <Trash2 className="h-4 w-4 mr-2" />Delete
                        </Button>
                      </div>
                    </Card>
                  ))}
                  
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-6">
                      <Button
                        onClick={() => loadAudioData(currentPage - 1)}
                        disabled={currentPage === 1 || loadingAudio}
                        variant="outline"
                        size="sm"
                        className="px-3 py-1"
                      >
                        ← Previous
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const pageNum = i + 1;
                          return (
                            <Button
                              key={pageNum}
                              onClick={() => loadAudioData(pageNum)}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              className="px-3 py-1 min-w-[40px]"
                              disabled={loadingAudio}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                        
                        {totalPages > 5 && (
                          <>
                            <span className="text-gray-400">...</span>
                            <Button
                              onClick={() => loadAudioData(totalPages)}
                              variant="outline"
                              size="sm"
                              className="px-3 py-1"
                              disabled={loadingAudio}
                            >
                              {totalPages}
                            </Button>
                          </>
                        )}
                      </div>
                      
                      <Button
                        onClick={() => loadAudioData(currentPage + 1)}
                        disabled={currentPage >= totalPages || loadingAudio}
                        variant="outline"
                        size="sm"
                        className="px-3 py-1"
                      >
                        Next →
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {viewMode === 'packs' && (
            <div className="space-y-4">
              {loadingPacks ? (
                <div>Loading packs...</div>
              ) : packError ? (
                <div className="text-red-500">{packError}</div>
              ) : filteredPacks.length === 0 ? (
                <div>
                  {searchQuery ? `No packs found matching "${searchQuery}"` : 'No packs found. Create your first pack to organize your sounds!'}
                </div>
              ) : (
                filteredPacks.map(pack => (
                  <Card key={pack.id} className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-12 h-12 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: pack.color + '20', border: `2px solid ${pack.color}` }}
                        >
                          <Package className="h-6 w-6" style={{ color: pack.color }} />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">{pack.name}</h3>
                          <p className="text-sm text-gray-400">{pack.description}</p>
                          <p className="text-xs text-gray-500">
                            {audioItems.filter(item => item.pack_id === pack.id).length} items
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedPack(selectedPack === pack.id ? null : pack.id)}
                        >
                          {selectedPack === pack.id ? 'Hide' : 'View'} Files
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditPackModal(pack)}
                          className="bg-blue-500 hover:bg-blue-600 text-white border-blue-500"
                        >
                          <Edit3 className="h-4 w-4 mr-1" />
                          Edit Pack
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            setEditSubfolderForm({ ...editSubfolderForm, pack_id: pack.id });
                            setShowEditSubfolderModal(true);
                          }}
                        >
                          <Folder className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => handleDeletePack(pack.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {selectedPack === pack.id && (
                      <div className="mt-4 space-y-3 border-t pt-4">
                        {/* Show subfolders */}
                        {pack.subfolders && pack.subfolders.length > 0 && (
                          <div className="space-y-2">
                            {pack.subfolders.map(subfolder => (
                              <div 
                                key={subfolder.id} 
                                className={`border border-gray-200 rounded-lg transition-colors ${
                                  dragOverTarget === `${pack.id}-${subfolder.name}` 
                                    ? isDraggingFiles 
                                      ? 'bg-yellow-100 border-yellow-400 border-2' 
                                      : 'bg-yellow-100 border-yellow-400 border-2' 
                                    : isDraggingFiles
                                      ? 'border-dashed border-yellow-300'
                                      : ''
                                }`}
                                onDragOver={handleDragOver}
                                onDragEnter={() => handleDragEnter(`${pack.id}-${subfolder.name}`)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, subfolder.name, pack.id)}
                              >
                                <div 
                                  className="flex items-center gap-3 p-3 cursor-pointer rounded-t-lg"
                                  style={{ 
                                    backgroundColor: dragOverTarget === `${pack.id}-${subfolder.name}` && isDraggingFiles 
                                      ? '#FCD34D' 
                                      : '#141414' 
                                  }}
                                  onClick={() => toggleSubfolder(subfolder.id)}
                                >
                                  <div 
                                    className="w-8 h-8 rounded-full flex items-center justify-center"
                                    style={{ backgroundColor: subfolder.color + '20', border: `1px solid ${subfolder.color}` }}
                                  >
                                    <Folder className="h-4 w-4" style={{ color: subfolder.color }} />
                                  </div>
                                  <div className="flex-1">
                                    <h4 
                                      className="font-medium"
                                      style={{ 
                                        color: dragOverTarget === `${pack.id}-${subfolder.name}` && isDraggingFiles 
                                          ? '#000000' 
                                          : '#FFFFFF' 
                                      }}
                                    >
                                      📁 {subfolder.name}
                                      {isDraggingFiles && ' (Upload here)'}
                                    </h4>
                                    <p 
                                      className="text-xs"
                                      style={{ 
                                        color: dragOverTarget === `${pack.id}-${subfolder.name}` && isDraggingFiles 
                                          ? '#374151' 
                                          : '#6B7280' 
                                      }}
                                    >
                                      {subfolder.description}
                                    </p>
                                    <p 
                                      className="text-xs"
                                      style={{ 
                                        color: dragOverTarget === `${pack.id}-${subfolder.name}` && isDraggingFiles 
                                          ? '#374151' 
                                          : '#9CA3AF' 
                                      }}
                                    >
                                      {audioItems.filter(item => item.pack_id === pack.id && item.subfolder === subfolder.name).length} files
                                    </p>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openMassEditModal(pack, subfolder);
                                      }}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteSubfolder(subfolder.id);
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                                
                                {expandedSubfolders.has(subfolder.id) && (
                                  <div className="px-3 pb-3 pt-4 space-y-2">
                                    {/* Subfolder Search Bar */}
                                    <div className="flex items-center gap-2 mb-3 p-2 bg-gray-50 rounded border">
                                      <div className="relative flex-1">
                                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                          placeholder={`Search in ${subfolder.name}...`}
                                          value={searchQuery}
                                          onChange={(e) => setSearchQuery(e.target.value)}
                                          className="pl-8 bg-white border-gray-300 text-sm text-black"
                                        />
                                      </div>
                                      {searchQuery && (
                                        <>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => selectVisibleSearchResults(pack.id, subfolder.name)}
                                            className="h-7 px-2 text-xs bg-green-600 text-white hover:bg-green-700"
                                          >
                                            Select All
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setSearchQuery('')}
                                            className="h-7 px-2 text-xs"
                                          >
                                            Clear
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                    {searchQuery && (
                                      <div className="text-xs text-gray-600 mb-2">
                                        Found {getFilteredAudioItems(audioItems.filter(item => item.pack_id === pack.id && item.subfolder === subfolder.name)).length} files matching "{searchQuery}"
                                      </div>
                                    )}
                                    
                                    {/* Subfolder Selection Controls */}
                                    {getFilteredAudioItems(audioItems.filter(item => item.pack_id === pack.id && item.subfolder === subfolder.name)).length > 0 && (
                                      <div className="flex items-center gap-2 ml-4 mb-2">
                                        {selectedFiles.size > 0 && (
                                          <>
                                            <span className="text-xs text-yellow-600">
                                              {selectedFiles.size} selected
                                            </span>
                                            <Button 
                                              variant="outline" 
                                              size="sm" 
                                              onClick={clearSelection}
                                              className="text-xs h-6"
                                            >
                                              Clear
                                            </Button>
                                            <Button 
                                              variant="outline" 
                                              size="sm" 
                                              onClick={openMassEditSelectedModal}
                                              className="text-xs h-6 bg-blue-600 text-white hover:bg-blue-700"
                                            >
                                              Mass Edit
                                            </Button>
                                          </>
                                        )}
                                        <Button 
                                          variant="outline" 
                                          size="sm" 
                                          onClick={() => {
                                            const subfolderFiles = getFilteredAudioItems(audioItems.filter(item => 
                                              item.pack_id === pack.id && item.subfolder === subfolder.name
                                            ))
                                            const newSelected = new Set(selectedFiles)
                                            subfolderFiles.forEach(file => newSelected.add(file.id))
                                            setSelectedFiles(newSelected)
                                          }}
                                          className="text-xs h-6"
                                        >
                                          Select All
                                        </Button>
                                      </div>
                                    )}
                                    
                                                                         {getFilteredAudioItems(audioItems.filter(item => item.pack_id === pack.id && item.subfolder === subfolder.name))
                                       .map(item => (
                                         <div 
                                           key={item.id} 
                                           className={`flex items-center gap-3 py-2 px-2 rounded transition-colors ${
                                             selectedFiles.has(item.id) ? 'bg-blue-50 border border-blue-200' : ''
                                           }`}
                                           onClick={() => toggleFileSelection(item.id)}
                                         >
                                           <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                                             {item.type === 'midi' && <Piano className="h-4 w-4 text-yellow-400" />}
                                             {item.type === 'soundkit' && <Drum className="h-4 w-4 text-red-400" />}
                                             {item.type === 'loop' && <Music className="h-4 w-4 text-blue-400" />}
                                             {item.type === 'patch' && <Music2 className="h-4 w-4 text-green-400" />}
                                             {item.type === 'sample' && <FileAudio className="h-4 w-4 text-purple-400" />}
                                             {item.type === 'clip' && <FileMusic className="h-4 w-4 text-pink-400" />}
                                             {item.type === 'other' && <File className="h-4 w-4 text-gray-400" />}
                                           </div>
                                           <div className="flex-1">
                                             <h5 className="text-sm font-medium">{item.name}</h5>
                                             <p className="text-xs text-gray-500">{item.audio_type}</p>
                                           </div>
                                           <div className="flex gap-1">
                                             <Button
                                               variant="outline"
                                               size="sm"
                                               onClick={(e) => {
                                                 e.stopPropagation();
                                                 openEditAudioModal(item);
                                               }}
                                             >
                                               <Edit3 className="h-3 w-3" />
                                             </Button>
                                             <Button
                                               variant="destructive"
                                               size="sm"
                                               onClick={(e) => {
                                                 e.stopPropagation();
                                                 handleDeleteAudio(item.id);
                                               }}
                                             >
                                               <Trash2 className="h-3 w-3" />
                                             </Button>
                                           </div>
                                         </div>
                                       ))}
                                     
                                     {getFilteredAudioItems(audioItems.filter(item => item.pack_id === pack.id && item.subfolder === subfolder.name)).length === 0 && (
                                       <div className="text-center py-4 text-gray-500 text-sm">
                                         {searchQuery ? 'No files match your search.' : 'No files in this folder yet.'}
                                       </div>
                                     )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        
                                                 {/* Show files in pack root */}
                         <div 
                           className={`border border-gray-200 rounded-lg transition-colors ${
                             dragOverTarget === `${pack.id}-root` 
                               ? isDraggingFiles 
                                 ? 'bg-yellow-100 border-yellow-400 border-2' 
                                 : 'bg-yellow-100 border-yellow-400 border-2' 
                               : isDraggingFiles
                                 ? 'border-dashed border-yellow-300'
                                 : ''
                           }`}
                           onDragOver={handleDragOver}
                           onDragEnter={() => handleDragEnter(`${pack.id}-root`)}
                           onDragLeave={handleDragLeave}
                           onDrop={(e) => handleDrop(e, null, pack.id)}
                         >
                           <div 
                             className="flex items-center gap-3 p-3 cursor-pointer rounded-lg"
                             style={{ 
                               backgroundColor: dragOverTarget === `${pack.id}-root` && isDraggingFiles 
                                 ? '#FCD34D' 
                                 : '#141414' 
                             }}
                             onClick={() => toggleSubfolder(`${pack.id}-root`)}
                           >
                             <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                               <Package className="h-4 w-4 text-gray-400" />
                             </div>
                             <div className="flex-1">
                               <h4 
                                 className="font-medium"
                                 style={{ 
                                   color: dragOverTarget === `${pack.id}-root` && isDraggingFiles 
                                     ? '#000000' 
                                     : '#FFFFFF' 
                                 }}
                               >
                                 📦 Pack Root
                                 {isDraggingFiles && ' (Upload here)'}
                               </h4>
                               <p 
                                 className="text-xs"
                                 style={{ 
                                   color: dragOverTarget === `${pack.id}-root` && isDraggingFiles 
                                     ? '#374151' 
                                     : '#6B7280' 
                                 }}
                               >
                                 {audioItems.filter(item => item.pack_id === pack.id && !item.subfolder).length} files
                               </p>
                             </div>
                             <div className="flex gap-1">
                               <Button 
                                 variant="ghost" 
                                 size="sm" 
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   toggleSubfolder(`${pack.id}-root`);
                                 }}
                               >
                                 <Pencil className="h-3 w-3" />
                               </Button>
                             </div>
                           </div>
                           
                           {expandedSubfolders.has(`${pack.id}-root`) && (
                             <div className="px-3 pb-3 pt-4 space-y-2">
                               {/* Pack Root Search Bar */}
                               <div className="flex items-center gap-2 mb-3 p-2 bg-gray-50 rounded border">
                                 <div className="relative flex-1">
                                   <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                   <Input
                                     placeholder="Search root files..."
                                     value={searchQuery}
                                     onChange={(e) => setSearchQuery(e.target.value)}
                                     className="pl-8 bg-white border-gray-300 text-sm text-black"
                                   />
                                 </div>
                                 {searchQuery && (
                                   <>
                                     <Button
                                       variant="outline"
                                       size="sm"
                                       onClick={() => selectVisibleSearchResults(pack.id)}
                                       className="h-7 px-2 text-xs bg-green-600 text-white hover:bg-green-700"
                                     >
                                       Select All
                                     </Button>
                                     <Button
                                       variant="outline"
                                       size="sm"
                                       onClick={() => setSearchQuery('')}
                                       className="h-7 px-2 text-xs"
                                     >
                                       Clear
                                     </Button>
                                   </>
                                 )}
                               </div>
                               {searchQuery && (
                                 <div className="text-xs text-gray-600 mb-2">
                                   Found {getFilteredAudioItems(audioItems.filter(item => item.pack_id === pack.id && !item.subfolder)).length} root files matching "{searchQuery}"
                                 </div>
                               )}
                               
                               {/* Pack Root Selection Controls */}
                               {getFilteredAudioItems(audioItems.filter(item => item.pack_id === pack.id && !item.subfolder)).length > 0 && (
                                 <div className="flex items-center gap-2 ml-4 mb-2">
                                   {selectedFiles.size > 0 && (
                                     <>
                                       <span className="text-xs text-yellow-600">
                                         {selectedFiles.size} selected
                                       </span>
                                       <Button 
                                         variant="outline" 
                                         size="sm" 
                                         onClick={clearSelection}
                                         className="text-xs h-6"
                                       >
                                         Clear
                                       </Button>
                                       <Button 
                                         variant="outline" 
                                         size="sm" 
                                         onClick={openMassEditSelectedModal}
                                         className="text-xs h-6 bg-blue-600 text-white hover:bg-blue-700"
                                       >
                                         Mass Edit
                                       </Button>
                                     </>
                                   )}
                                   <Button 
                                     variant="outline" 
                                     size="sm" 
                                     onClick={() => {
                                       const rootFiles = getFilteredAudioItems(audioItems.filter(item => 
                                         item.pack_id === pack.id && !item.subfolder
                                       ))
                                       const newSelected = new Set(selectedFiles)
                                       rootFiles.forEach(file => newSelected.add(file.id))
                                       setSelectedFiles(newSelected)
                                     }}
                                     className="text-xs h-6"
                                   >
                                     Select All
                                   </Button>
                                 </div>
                               )}
                               
                               {getFilteredAudioItems(audioItems.filter(item => item.pack_id === pack.id && !item.subfolder))
                                 .map(item => (
                                   <div 
                                     key={item.id} 
                                     className={`flex items-center gap-3 py-2 px-2 rounded transition-colors ${
                                       selectedFiles.has(item.id) ? 'bg-blue-50 border border-blue-200' : ''
                                     }`}
                                     onClick={() => toggleFileSelection(item.id)}
                                   >
                                     <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                                       {item.type === 'midi' && <Piano className="h-4 w-4 text-yellow-400" />}
                                       {item.type === 'soundkit' && <Drum className="h-4 w-4 text-red-400" />}
                                       {item.type === 'loop' && <Music className="h-4 w-4 text-blue-400" />}
                                       {item.type === 'patch' && <Music2 className="h-4 w-4 text-green-400" />}
                                       {item.type === 'sample' && <FileAudio className="h-4 w-4 text-purple-400" />}
                                       {item.type === 'clip' && <FileMusic className="h-4 w-4 text-pink-400" />}
                                       {item.type === 'other' && <File className="h-4 w-4 text-gray-400" />}
                                     </div>
                                     <div className="flex-1">
                                       <h5 className="text-sm font-medium">{item.name}</h5>
                                       <p className="text-xs text-gray-500">{item.audio_type}</p>
                                     </div>
                                     <div className="flex gap-1">
                                       <Button
                                         variant="outline"
                                         size="sm"
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           openEditAudioModal(item);
                                         }}
                                       >
                                         <Edit3 className="h-3 w-3" />
                                       </Button>
                                       <Button
                                         variant="destructive"
                                         size="sm"
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           handleDeleteAudio(item.id);
                                         }}
                                       >
                                         <Trash2 className="h-3 w-3" />
                                       </Button>
                                     </div>
                                   </div>
                                 ))}
                               
                               {getFilteredAudioItems(audioItems.filter(item => item.pack_id === pack.id && !item.subfolder)).length === 0 && (
                                 <div className="text-center py-4 text-gray-500 text-sm">
                                   {searchQuery ? 'No root files match your search.' : 'No root files.'}
                                 </div>
                               )}
                             </div>
                           )}
                         </div>
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>
          )}
        </TabsContent>

        {/* Packs Tab */}
        <TabsContent value="packs" className="space-y-4">
          {audioPacks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No packs found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {audioPacks.map(pack => (
                <Card key={pack.id} className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold">{pack.name}</h3>
                      <p className="text-sm text-gray-500">{pack.item_count || 0} items</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditPackModal(pack)}
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeletePack(pack.id)}
                        disabled={deleting}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {pack.description && (
                    <p className="text-sm text-gray-600 mb-3">{pack.description}</p>
                  )}
                  
                  {pack.subfolders && pack.subfolders.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Subfolders:</h4>
                      {pack.subfolders.map(subfolder => (
                        <div key={subfolder.id} className="flex justify-between items-center text-sm">
                          <span>{subfolder.name}</span>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditSubfolderModal(subfolder)}
                            >
                              <Edit3 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteSubfolder(subfolder.id)}
                              disabled={deleting}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Subfolders Tab */}
        <TabsContent value="subfolders" className="space-y-4">
          {audioPacks.flatMap(pack => pack.subfolders || []).length === 0 ? (
            <div className="text-center py-8 text-gray-500">No subfolders found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {audioPacks.flatMap(pack => 
                (pack.subfolders || []).map(subfolder => ({ ...subfolder, packName: pack.name }))
              ).map(subfolder => (
                <Card key={subfolder.id} className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold">{subfolder.name}</h3>
                      <p className="text-sm text-gray-500">Pack: {subfolder.packName}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditSubfolderModal(subfolder)}
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteSubfolder(subfolder.id)}
                        disabled={deleting}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {subfolder.description && (
                    <p className="text-sm text-gray-600">{subfolder.description}</p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Audio Modal */}
      <Dialog open={showEditAudioModal} onOpenChange={setShowEditAudioModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Audio File</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveAudio} className="space-y-4">
            <Input
              placeholder="Name"
              value={editForm.name}
              onChange={e => setEditForm({ ...editForm, name: e.target.value })}
              required
            />
            <Input
              placeholder="Type (e.g. loop, sample, kit)"
              value={editForm.type}
              onChange={e => setEditForm({ ...editForm, type: e.target.value })}
            />
            <Input
              type="number"
              placeholder="BPM (e.g., 140)"
              value={editForm.bpm}
              onChange={e => setEditForm({ ...editForm, bpm: e.target.value })}
            />
            <Input
              placeholder="Key (e.g., C, Am, F#)"
              value={editForm.key}
              onChange={e => setEditForm({ ...editForm, key: e.target.value })}
            />
            <Input
              placeholder="Audio Type (e.g., kick, snare, hihat, bass, melody, loop)"
              value={editForm.audio_type}
              onChange={e => setEditForm({ ...editForm, audio_type: e.target.value })}
            />
            <Input
              placeholder="Genre (e.g., trap, hip-hop, house, techno, dubstep, pop, rock)"
              value={editForm.genre}
              onChange={e => setEditForm({ ...editForm, genre: e.target.value })}
            />
            <Input
              placeholder="Subgenre (e.g., drill, boom bap, deep house, acid techno, melodic dubstep)"
              value={editForm.subgenre}
              onChange={e => setEditForm({ ...editForm, subgenre: e.target.value })}
            />
            <Input
              placeholder="Tags (comma-separated, e.g., trap, dark, aggressive, 808)"
              value={editForm.tags}
              onChange={e => setEditForm({ ...editForm, tags: e.target.value })}
            />
            <Textarea
              placeholder="Description"
              value={editForm.description}
              onChange={e => setEditForm({ ...editForm, description: e.target.value })}
            />
            <select
              value={editForm.pack_id}
              onChange={e => {
                setEditForm({ ...editForm, pack_id: e.target.value, subfolder: '' });
              }}
              className="w-full p-2 border border-gray-300 rounded-md bg-background text-foreground"
            >
              <option value="">No Pack (Individual File)</option>
              {audioPacks.map(pack => (
                <option key={pack.id} value={pack.id}>{pack.name}</option>
              ))}
            </select>
            
            {editForm.pack_id && (
              <select
                value={editForm.subfolder}
                onChange={e => setEditForm({ ...editForm, subfolder: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md bg-background text-foreground"
              >
                <option value="">Root of Pack (No Subfolder)</option>
                {audioPacks
                  .find(pack => pack.id === editForm.pack_id)
                  ?.subfolders?.map(subfolder => (
                    <option key={subfolder.id} value={subfolder.name}>
                      📁 {subfolder.name}
                    </option>
                  ))}
              </select>
            )}
            
            <DialogFooter>
              <Button type="submit" disabled={saving} className="bg-yellow-400 hover:bg-yellow-500 text-black">
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Pack Modal */}
      <Dialog open={showEditPackModal} onOpenChange={setShowEditPackModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Audio Pack</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSavePack} className="space-y-4">
            <Input
              placeholder="Pack Name"
              value={editPackForm.name}
              onChange={e => setEditPackForm({ ...editPackForm, name: e.target.value })}
              required
            />
            <Textarea
              placeholder="Description"
              value={editPackForm.description}
              onChange={e => setEditPackForm({ ...editPackForm, description: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium mb-2">Pack Color</label>
              <input
                type="color"
                value={editPackForm.color}
                onChange={e => setEditPackForm({ ...editPackForm, color: e.target.value })}
                className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving} className="bg-blue-500 hover:bg-blue-600 text-white">
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Subfolder Modal */}
      <Dialog open={showEditSubfolderModal} onOpenChange={setShowEditSubfolderModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subfolder</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveSubfolder} className="space-y-4">
            <Input
              placeholder="Subfolder Name"
              value={editSubfolderForm.name}
              onChange={e => setEditSubfolderForm({ ...editSubfolderForm, name: e.target.value })}
              required
            />
            <Textarea
              placeholder="Description"
              value={editSubfolderForm.description}
              onChange={e => setEditSubfolderForm({ ...editSubfolderForm, description: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium mb-2">Subfolder Color</label>
              <input
                type="color"
                value={editSubfolderForm.color}
                onChange={e => setEditSubfolderForm({ ...editSubfolderForm, color: e.target.value })}
                className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving} className="bg-green-500 hover:bg-green-600 text-white">
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Advanced Search & Analytics Card */}
      <div className="mt-8">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold">Advanced Search & Analytics</h3>
              <p className="text-gray-600">Find files needing updates, missing data, and similar content</p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => loadAudioData()}
              disabled={loadingAudio}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </div>

          {/* Data Overview Tabs */}
          <Tabs defaultValue="audio" className="mb-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="audio">Audio Library</TabsTrigger>
              <TabsTrigger value="genres">Genres</TabsTrigger>
              <TabsTrigger value="packs">Packs</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            {/* Audio Library Tab */}
            <TabsContent value="audio" className="space-y-4">
              {/* Data Quality Stats */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-medium mb-2 text-blue-900">Total Files</h4>
                  <p className="text-2xl font-bold text-blue-700">{audioItems.length}</p>
                  <p className="text-xs text-blue-600 mt-1">Audio library items</p>
                </div>
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
                  <h4 className="font-medium mb-2 text-yellow-900">Missing BPM</h4>
                  <p className="text-2xl font-bold text-yellow-700">
                    {audioItems.filter(item => !item.bpm).length}
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">
                    {audioItems.length > 0 ? `${Math.round((audioItems.filter(item => !item.bpm).length / audioItems.length) * 100)}%` : '0%'}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
                  <h4 className="font-medium mb-2 text-red-900">Missing Key</h4>
                  <p className="text-2xl font-bold text-red-700">
                    {audioItems.filter(item => !item.key).length}
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    {audioItems.length > 0 ? `${Math.round((audioItems.filter(item => !item.key).length / audioItems.length) * 100)}%` : '0%'}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                  <h4 className="font-medium mb-2 text-green-900">Missing Genre</h4>
                  <p className="text-2xl font-bold text-green-700">
                    {audioItems.filter(item => !item.genre).length}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    {audioItems.length > 0 ? `${Math.round((audioItems.filter(item => !item.genre).length / audioItems.length) * 100)}%` : '0%'}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                  <h4 className="font-medium mb-2 text-purple-900">Missing Tags</h4>
                  <p className="text-2xl font-bold text-purple-700">
                    {audioItems.filter(item => !item.tags || item.tags.length === 0).length}
                  </p>
                  <p className="text-xs text-purple-600 mt-1">
                    {audioItems.length > 0 ? `${Math.round((audioItems.filter(item => !item.tags || item.tags.length === 0).length / audioItems.length) * 100)}%` : '0%'}
                  </p>
                </div>
              </div>

              {/* Advanced Search Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="missing-data-filter">Missing Data Filter</Label>
                  <Select
                    value={missingDataFilter}
                    onValueChange={setMissingDataFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by missing data" />
                    </SelectTrigger>
                                         <SelectContent>
                       <SelectItem value="all">All Files</SelectItem>
                       <SelectItem value="bpm">Missing BPM</SelectItem>
                       <SelectItem value="key">Missing Key</SelectItem>
                       <SelectItem value="genre">Missing Genre</SelectItem>
                       <SelectItem value="subgenre">Missing Subgenre</SelectItem>
                       <SelectItem value="tags">Missing Tags</SelectItem>
                       <SelectItem value="pack">No Pack Assigned</SelectItem>
                       <SelectItem value="subfolder">No Subfolder</SelectItem>
                       <SelectItem value="description">No Description</SelectItem>
                       <SelectItem value="audio_type">No Audio Type</SelectItem>
                       <SelectItem value="file_url">No File URL</SelectItem>
                     </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="type-filter">Type Filter</Label>
                  <Select
                    value={typeFilter}
                    onValueChange={setTypeFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                                         <SelectContent>
                       <SelectItem value="all">All Types</SelectItem>
                       <SelectItem value="midi">MIDI</SelectItem>
                       <SelectItem value="soundkit">Soundkit</SelectItem>
                       <SelectItem value="loop">Loop</SelectItem>
                       <SelectItem value="patch">Patch</SelectItem>
                       <SelectItem value="sample">Sample</SelectItem>
                       <SelectItem value="clip">Clip</SelectItem>
                       <SelectItem value="other">Other</SelectItem>
                     </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="genre-filter">Genre Filter</Label>
                  <Select
                    value={genreFilter}
                    onValueChange={setGenreFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by genre" />
                    </SelectTrigger>
                                         <SelectContent>
                       <SelectItem value="all">All Genres</SelectItem>
                       {Array.from(new Set(audioItems.map(item => item.genre).filter(Boolean))).map(genre => (
                         <SelectItem key={genre} value={genre!}>{genre}</SelectItem>
                       ))}
                     </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="bpm-range">BPM Range</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={bpmRange.min}
                      onChange={(e) => setBpmRange(prev => ({ ...prev, min: e.target.value }))}
                      className="w-20"
                    />
                    <span className="text-gray-500 self-center">-</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={bpmRange.max}
                      onChange={(e) => setBpmRange(prev => ({ ...prev, max: e.target.value }))}
                      className="w-20"
                    />
                  </div>
                </div>
              </div>

                             {/* Quick Actions */}
               <div className="flex flex-wrap gap-2">
                 <Button
                   variant="outline"
                   onClick={() => {
                     const missingBpm = audioItems.filter(item => !item.bpm);
                     setSelectedFiles(new Set(missingBpm.map(item => item.id)));
                   }}
                   className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100"
                 >
                   Select Missing BPM
                 </Button>
                 <Button
                   variant="outline"
                   onClick={() => {
                     const missingKey = audioItems.filter(item => !item.key);
                     setSelectedFiles(new Set(missingKey.map(item => item.id)));
                   }}
                   className="text-xs bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                 >
                   Select Missing Key
                 </Button>
                 <Button
                   variant="outline"
                   onClick={() => {
                     const missingGenre = audioItems.filter(item => !item.genre);
                     setSelectedFiles(new Set(missingGenre.map(item => item.id)));
                   }}
                   className="text-xs bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                 >
                   Select Missing Genre
                 </Button>
                 <Button
                   variant="outline"
                   onClick={() => {
                     const missingSubgenre = audioItems.filter(item => !item.subgenre);
                     setSelectedFiles(new Set(missingSubgenre.map(item => item.id)));
                   }}
                   className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                 >
                   Select Missing Subgenre
                 </Button>
                 <Button
                   variant="outline"
                   onClick={() => {
                     const missingTags = audioItems.filter(item => !item.tags || item.tags.length === 0);
                     setSelectedFiles(new Set(missingTags.map(item => item.id)));
                   }}
                   className="text-xs bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                 >
                   Select Missing Tags
                 </Button>
                 <Button
                   variant="outline"
                   onClick={() => {
                     const noPack = audioItems.filter(item => !item.pack_id);
                     setSelectedFiles(new Set(noPack.map(item => item.id)));
                   }}
                   className="text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                 >
                   Select No Pack
                 </Button>
                 <Button
                   variant="outline"
                   onClick={() => {
                     const noSubfolder = audioItems.filter(item => !item.subfolder);
                     setSelectedFiles(new Set(noSubfolder.map(item => item.id)));
                   }}
                   className="text-xs bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
                 >
                   Select No Subfolder
                 </Button>
                 <Button
                   variant="outline"
                   onClick={() => {
                     const noDescription = audioItems.filter(item => !item.description);
                     setSelectedFiles(new Set(noDescription.map(item => item.id)));
                   }}
                   className="text-xs bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100"
                 >
                   Select No Description
                 </Button>
                 <Button
                   variant="outline"
                   onClick={() => {
                     const noAudioType = audioItems.filter(item => !item.audio_type);
                     setSelectedFiles(new Set(noAudioType.map(item => item.id)));
                   }}
                   className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                 >
                   Select No Audio Type
                 </Button>
                 <Button
                   variant="outline"
                   onClick={() => {
                     const noFileUrl = audioItems.filter(item => !item.file_url);
                     setSelectedFiles(new Set(noFileUrl.map(item => item.id)));
                   }}
                   className="text-xs bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                 >
                   Select No File URL
                 </Button>
               </div>
            </TabsContent>

            {/* Genres Tab */}
            <TabsContent value="genres" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-lg border border-indigo-200">
                  <h4 className="font-medium mb-2 text-indigo-900">Total Genres</h4>
                  <p className="text-2xl font-bold text-indigo-700">
                    {Array.from(new Set(audioItems.map(item => item.genre).filter(Boolean))).length}
                  </p>
                  <p className="text-xs text-indigo-600 mt-1">Unique genres found</p>
                </div>
                <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-4 rounded-lg border border-pink-200">
                  <h4 className="font-medium mb-2 text-pink-900">Most Popular</h4>
                  <p className="text-lg font-bold text-pink-700">
                    {(() => {
                      const genreCounts = audioItems.reduce((acc, item) => {
                        if (item.genre) {
                          acc[item.genre] = (acc[item.genre] || 0) + 1;
                        }
                        return acc;
                      }, {} as Record<string, number>);
                      const mostPopular = Object.entries(genreCounts).sort(([,a], [,b]) => b - a)[0];
                      return mostPopular ? mostPopular[0] : 'None';
                    })()}
                  </p>
                  <p className="text-xs text-pink-600 mt-1">Genre with most files</p>
                </div>
                <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-4 rounded-lg border border-teal-200">
                  <h4 className="font-medium mb-2 text-teal-900">Genre Distribution</h4>
                  <p className="text-2xl font-bold text-teal-700">
                    {audioItems.length > 0 ? 
                      `${Math.round((audioItems.filter(item => item.genre).length / audioItems.length) * 100)}%` : '0%'
                    }
                  </p>
                  <p className="text-xs text-teal-600 mt-1">Files with genre data</p>
                </div>
              </div>

              {/* Genre Breakdown */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Genre Breakdown</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {(() => {
                    const genreCounts = audioItems.reduce((acc, item) => {
                      if (item.genre) {
                        acc[item.genre] = (acc[item.genre] || 0) + 1;
                      }
                      return acc;
                    }, {} as Record<string, number>);
                    
                    return Object.entries(genreCounts)
                      .sort(([,a], [,b]) => b - a)
                      .map(([genre, count]) => (
                        <div key={genre} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{genre}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${(count / audioItems.length) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600 w-8 text-right">{count}</span>
                          </div>
                        </div>
                      ));
                  })()}
                </div>
              </div>
            </TabsContent>

            {/* Packs Tab */}
            <TabsContent value="packs" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-lg border border-emerald-200">
                  <h4 className="font-medium mb-2 text-emerald-900">Total Packs</h4>
                  <p className="text-2xl font-bold text-emerald-700">
                    {Array.from(new Set(audioItems.map(item => item.pack_id).filter(Boolean))).length}
                  </p>
                  <p className="text-xs text-emerald-600 mt-1">Unique packs</p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-lg border border-amber-200">
                  <h4 className="font-medium mb-2 text-amber-900">Largest Pack</h4>
                  <p className="text-lg font-bold text-amber-700">
                    {(() => {
                      const packCounts = audioItems.reduce((acc, item) => {
                        if (item.pack_id) {
                          acc[item.pack_id] = (acc[item.pack_id] || 0) + 1;
                        }
                        return acc;
                      }, {} as Record<string, number>);
                      const largestPack = Object.entries(packCounts).sort(([,a], [,b]) => b - a)[0];
                      return largestPack ? largestPack[1] : 0;
                    })()} files
                  </p>
                  <p className="text-xs text-amber-600 mt-1">Biggest pack size</p>
                </div>
                <div className="bg-gradient-to-br from-rose-50 to-rose-100 p-4 rounded-lg border border-rose-200">
                  <h4 className="font-medium mb-2 text-rose-900">Unorganized</h4>
                  <p className="text-2xl font-bold text-rose-700">
                    {audioItems.filter(item => !item.pack_id).length}
                  </p>
                  <p className="text-xs text-rose-600 mt-1">Files without packs</p>
                </div>
              </div>

              {/* Pack Management */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Pack Management</h4>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const noPack = audioItems.filter(item => !item.pack_id);
                      setSelectedFiles(new Set(noPack.map(item => item.id)));
                    }}
                    className="text-xs bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                  >
                    Select Unorganized Files
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const smallPacks = audioItems.filter(item => {
                        if (!item.pack_id) return false;
                        const packSize = audioItems.filter(other => other.pack_id === item.pack_id).length;
                        return packSize < 5;
                      });
                      setSelectedFiles(new Set(smallPacks.map(item => item.id)));
                    }}
                    className="text-xs bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
                  >
                    Select Small Packs (&lt;5 files)
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-lg border border-slate-200">
                  <h4 className="font-medium mb-2 text-slate-900">Data Completeness</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Complete Files</span>
                      <span className="text-sm font-medium">
                        {audioItems.filter(item => item.bpm && item.key && item.genre && item.tags && item.tags.length > 0).length}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ 
                          width: `${audioItems.length > 0 ? 
                            (audioItems.filter(item => item.bpm && item.key && item.genre && item.tags && item.tags.length > 0).length / audioItems.length) * 100 : 0
                          }%` 
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-600">
                      {audioItems.length > 0 ? 
                        `${Math.round((audioItems.filter(item => item.bpm && item.key && item.genre && item.tags && item.tags.length > 0).length / audioItems.length) * 100)}% complete`
                        : '0% complete'
                      }
                    </p>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-4 rounded-lg border border-cyan-200">
                  <h4 className="font-medium mb-2 text-cyan-900">Type Distribution</h4>
                  <div className="space-y-1">
                    {(() => {
                      const typeCounts = audioItems.reduce((acc, item) => {
                        acc[item.type] = (acc[item.type] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>);
                      
                      return Object.entries(typeCounts)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 5)
                        .map(([type, count]) => (
                          <div key={type} className="flex items-center justify-between">
                            <span className="text-sm capitalize">{type}</span>
                            <span className="text-sm font-medium">{count}</span>
                          </div>
                        ));
                    })()}
                  </div>
                </div>
              </div>

              {/* BPM Analysis */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-3">BPM Analysis</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {(() => {
                        const bpms = audioItems.map(item => item.bpm).filter(Boolean) as number[];
                        return bpms.length > 0 ? Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length) : 0;
                      })()}
                    </p>
                    <p className="text-xs text-gray-600">Average BPM</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {(() => {
                        const bpms = audioItems.map(item => item.bpm).filter(Boolean) as number[];
                        return bpms.length > 0 ? Math.min(...bpms) : 0;
                      })()}
                    </p>
                    <p className="text-xs text-gray-600">Min BPM</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">
                      {(() => {
                        const bpms = audioItems.map(item => item.bpm).filter(Boolean) as number[];
                        return bpms.length > 0 ? Math.max(...bpms) : 0;
                      })()}
                    </p>
                    <p className="text-xs text-gray-600">Max BPM</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      {(() => {
                        const bpms = audioItems.map(item => item.bpm).filter(Boolean) as number[];
                        return bpms.length > 0 ? 
                          bpms.sort((a, b) => a - b)[Math.floor(bpms.length / 2)] : 0;
                      })()}
                    </p>
                    <p className="text-xs text-gray-600">Median BPM</p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

                     {/* Data Quality Report */}
           <div className="mt-6 pt-6 border-t">
             <h4 className="text-lg font-semibold mb-4">Data Quality Report</h4>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div className="bg-gray-50 p-4 rounded-lg">
                 <h5 className="font-medium mb-2">Files with Complete Data</h5>
                 <p className="text-2xl font-bold text-green-600">
                   {audioItems.filter(item => item.bpm && item.key && item.genre && item.tags && item.tags.length > 0).length}
                 </p>
                 <p className="text-sm text-gray-600">
                   {audioItems.length > 0 ? 
                     `${Math.round((audioItems.filter(item => item.bpm && item.key && item.genre && item.tags && item.tags.length > 0).length / audioItems.length) * 100)}% complete`
                     : '0% complete'
                   }
                 </p>
               </div>
               <div className="bg-gray-50 p-4 rounded-lg">
                 <h5 className="font-medium mb-2">Files in Packs</h5>
                 <p className="text-2xl font-bold text-blue-600">
                   {audioItems.filter(item => item.pack_id).length}
                 </p>
                 <p className="text-sm text-gray-600">
                   {audioItems.length > 0 ? 
                     `${Math.round((audioItems.filter(item => item.pack_id).length / audioItems.length) * 100)}% organized`
                     : '0% organized'
                   }
                 </p>
               </div>
               <div className="bg-gray-50 p-4 rounded-lg">
                 <h5 className="font-medium mb-2">Files with Tags</h5>
                 <p className="text-2xl font-bold text-purple-600">
                   {audioItems.filter(item => item.tags && item.tags.length > 0).length}
                 </p>
                 <p className="text-sm text-gray-600">
                   {audioItems.length > 0 ? 
                     `${Math.round((audioItems.filter(item => item.tags && item.tags.length > 0).length / audioItems.length) * 100)}% tagged`
                     : '0% tagged'
                   }
                 </p>
               </div>
             </div>
           </div>

           {/* File Display Section */}
           <div className="mt-6 pt-6 border-t border-gray-200">
             <div className="flex items-center justify-between mb-4">
               <h4 className="text-lg font-semibold text-white">Files Found</h4>
               <div className="flex items-center gap-2">
                 <span className="text-sm text-gray-500">
                   {selectedFiles.size > 0 ? `${selectedFiles.size} selected` : 'No files selected'}
                 </span>
                 {selectedFiles.size > 0 && (
                   <>
                     <Button
                       variant="ghost"
                       size="sm"
                       onClick={() => setSelectedFiles(new Set())}
                       className="text-xs text-gray-600 hover:text-gray-900"
                     >
                       Clear Selection
                     </Button>
                     <Button
                       size="sm"
                       onClick={openMassEditSelectedModal}
                       className="text-xs bg-blue-600 text-white hover:bg-blue-700"
                     >
                       Mass Edit Selected
                     </Button>
                   </>
                 )}
               </div>
             </div>

             {/* File List */}
             <div className="space-y-1 max-h-96 overflow-y-auto">
               {audioItems.length === 0 ? (
                 <div className="text-center py-8 text-gray-500">
                   No audio files found. Load some data first.
                 </div>
               ) : (
                 audioItems.map(item => (
                   <div
                     key={item.id}
                     className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 cursor-pointer group ${
                       selectedFiles.has(item.id) 
                         ? 'border-blue-300 bg-blue-50/50' 
                         : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/30'
                     }`}
                     onClick={() => toggleFileSelection(item.id)}
                   >
                     {/* File Icon */}
                     <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                       selectedFiles.has(item.id) ? 'bg-blue-100' : 'bg-gray-100 group-hover:bg-gray-200'
                     }`}>
                       {item.type === 'midi' && <Piano className="h-4 w-4 text-yellow-600" />}
                       {item.type === 'soundkit' && <Drum className="h-4 w-4 text-red-600" />}
                       {item.type === 'loop' && <Music className="h-4 w-4 text-blue-600" />}
                       {item.type === 'patch' && <Music2 className="h-4 w-4 text-green-600" />}
                       {item.type === 'sample' && <FileAudio className="h-4 w-4 text-purple-600" />}
                       {item.type === 'clip' && <FileMusic className="h-4 w-4 text-pink-600" />}
                       {item.type === 'other' && <File className="h-4 w-4 text-gray-600" />}
                     </div>

                     {/* File Info */}
                     <div className="flex-1 min-w-0">
                       <h5 className="font-medium text-white truncate">{item.name}</h5>
                       <div className="flex items-center gap-2 text-xs text-gray-300 mt-0.5">
                         <span className="capitalize font-medium">{item.type}</span>
                         {item.bpm && <span>• {item.bpm} BPM</span>}
                         {item.key && <span>• {item.key}</span>}
                         {item.genre && <span>• {item.genre}</span>}
                         {item.pack && <span>• {item.pack.name}</span>}
                       </div>
                       {/* Missing Data Indicators */}
                       <div className="flex flex-wrap gap-1 mt-1.5">
                         {!item.bpm && <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-yellow-50 text-yellow-700 border-yellow-200">Missing BPM</Badge>}
                         {!item.key && <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-red-50 text-red-700 border-red-200">Missing Key</Badge>}
                         {!item.genre && <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-green-50 text-green-700 border-green-200">Missing Genre</Badge>}
                         {!item.subgenre && <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-200">Missing Subgenre</Badge>}
                         {(!item.tags || item.tags.length === 0) && <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-purple-50 text-purple-700 border-purple-200">Missing Tags</Badge>}
                         {!item.pack_id && <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 border-blue-200">No Pack</Badge>}
                         {!item.subfolder && <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-orange-50 text-orange-700 border-orange-200">No Subfolder</Badge>}
                         {!item.description && <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-pink-50 text-pink-700 border-pink-200">No Description</Badge>}
                         {!item.audio_type && <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border-indigo-200">No Audio Type</Badge>}
                         {!item.file_url && <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-gray-50 text-gray-700 border-gray-200">No File URL</Badge>}
                       </div>
                     </div>

                     {/* Audio Player */}
                     {item.file_url && (
                       <div className="flex-shrink-0">
                         <audio 
                           controls 
                           src={item.file_url} 
                           className="h-7 w-28" 
                           onDragStart={(e) => e.preventDefault()}
                         />
                       </div>
                     )}

                     {/* Action Buttons */}
                     <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                       <Button
                         variant="ghost"
                         size="sm"
                         onClick={(e) => {
                           e.stopPropagation();
                           openEditAudioModal(item);
                         }}
                         className="h-7 w-7 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                       >
                         <Edit3 className="h-3 w-3" />
                       </Button>
                       <Button
                         variant="ghost"
                         size="sm"
                         asChild
                         className="h-7 w-7 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                       >
                         <a href={item.file_url} download>
                           <Download className="h-3 w-3" />
                         </a>
                       </Button>
                       <Button
                         variant="ghost"
                         size="sm"
                         onClick={(e) => {
                           e.stopPropagation();
                           handleDeleteAudio(item.id);
                         }}
                         className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                       >
                         <Trash2 className="h-3 w-3" />
                       </Button>
                     </div>
                   </div>
                 ))
               )}
             </div>

             {/* No Results Message */}
             {audioItems.length > 0 && searchQuery && filteredAudioItems.length === 0 && (
               <div className="text-center py-8 text-gray-500">
                 No files found matching "{searchQuery}"
               </div>
             )}
           </div>
        </Card>
      </div>

      {/* Mass Edit Modals */}
      {showMassEditModal && massEditPack && massEditSubfolder && (
        <MassEditSubfolderModal
          isOpen={showMassEditModal}
          onClose={() => {
            setShowMassEditModal(false);
            setMassEditPack(null);
            setMassEditSubfolder(null);
          }}
          pack={massEditPack}
          subfolder={massEditSubfolder}
          audioItems={audioItems.filter(item => 
            item.pack_id === massEditPack.id && 
            item.subfolder === massEditSubfolder.name
          )}
          onUpdate={() => {
            loadAudioData(currentPage);
            loadAudioPacks();
          }}
        />
      )}

      {showMassEditSelectedModal && (
        <MassEditSelectedFilesModal
          isOpen={showMassEditSelectedModal}
          onClose={() => setShowMassEditSelectedModal(false)}
          selectedFiles={audioItems.filter(item => selectedFiles.has(item.id))}
          onUpdate={() => {
            loadAudioData(currentPage);
            loadAudioPacks();
            setSelectedFiles(new Set());
          }}
        />
      )}
    </div>
  );
} 