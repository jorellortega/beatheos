"use client"

import { useState, useEffect, useRef } from 'react'
import { Plus, Music, Upload, Calendar, Globe, FileText, CheckCircle2, XCircle, AlertCircle, ExternalLink, Info, FileMusic, FileArchive, FileAudio, File, Music2, Piano, Drum, Trash2, Save, Pencil, Folder, Grid, List, Package } from 'lucide-react'
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
import { MassEditSubfolderModal } from '@/components/MassEditSubfolderModal'

// Types for DB tables
interface Album {
  id: string
  title: string
  artist: string
  release_date: string
  cover_art_url: string
  description?: string
  additional_covers?: { label: string; url: string }[]
}
interface Single {
  id: string
  title: string
  artist: string
  release_date: string
  cover_art_url: string
  duration?: string
  description?: string
}
interface PlatformProfile {
  id: string
  platform: string
  username: string
  status: string
  claim_status: string
    url?: string
  followers?: number
  monthly_listeners?: number
  last_synced?: string
  verification_status?: string
}
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
  tags?: string[]
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

export default function MyLibrary() {
  const { user } = useAuth();
  // Albums
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loadingAlbums, setLoadingAlbums] = useState(false);
  const [albumError, setAlbumError] = useState<string | null>(null);
  // Singles
  const [singles, setSingles] = useState<Single[]>([]);
  const [loadingSingles, setLoadingSingles] = useState(false);
  const [singleError, setSingleError] = useState<string | null>(null);
  // Platform Profiles
  const [platformProfiles, setPlatformProfiles] = useState<PlatformProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  // Audio Library
  const [audioItems, setAudioItems] = useState<AudioLibraryItem[]>([]);
  const [allAudioItems, setAllAudioItems] = useState<AudioLibraryItem[]>([]); // For packs view
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  
  // Pagination for All Files view
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Audio Packs
  const [audioPacks, setAudioPacks] = useState<AudioPack[]>([]);
  const [loadingPacks, setLoadingPacks] = useState(false);
  const [packError, setPackError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'packs'>('grid');
  const [selectedPack, setSelectedPack] = useState<string | null>(null);
  
  // Subfolders
  const [subfolders, setSubfolders] = useState<AudioSubfolder[]>([]);
  const [expandedSubfolders, setExpandedSubfolders] = useState<Set<string>>(new Set());
  
  // Drag and drop
  const [draggedItem, setDraggedItem] = useState<AudioLibraryItem | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [showDragDialog, setShowDragDialog] = useState(false);
  const [dragDialogInfo, setDragDialogInfo] = useState<{
    folderName: string;
    folderType: 'pack' | 'subfolder' | 'unpacked';
    packName?: string;
  } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{
    isUploading: boolean;
    currentFile: string;
    currentIndex: number;
    totalFiles: number;
    completedFiles: string[];
  }>({
    isUploading: false,
    currentFile: '',
    currentIndex: 0,
    totalFiles: 0,
    completedFiles: []
  });
  
  // Multi-select for moving files
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  
  // Edit audio file modal
  const [showEditAudioModal, setShowEditAudioModal] = useState(false);
  const [editingAudio, setEditingAudio] = useState<AudioLibraryItem | null>(null);
  const [editAudioForm, setEditAudioForm] = useState({
    bpm: '',
    key: '',
    audio_type: '',
    description: '',
    tags: ''
  });
  const [savingAudio, setSavingAudio] = useState(false);
  const [audioEditError, setAudioEditError] = useState<string | null>(null);
  
  // Handle file selection
  const toggleFileSelection = (fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };
  
  // Select all files in current pack root
  const selectAllInPackRoot = (packId: string) => {
    const packRootFiles = audioItems.filter(item => item.pack_id === packId && !item.subfolder);
    const newSelected = new Set(selectedFiles);
    packRootFiles.forEach(file => newSelected.add(file.id));
    setSelectedFiles(newSelected);
  };
  
  // Clear selection
  const clearSelection = () => {
    setSelectedFiles(new Set());
    setShowMoveMenu(false);
  };
  
  // Move selected files to subfolder
  const moveSelectedFiles = async (targetSubfolder: string, targetPackId: string) => {
    if (!user || selectedFiles.size === 0) return;
    
    try {
      // Update all selected files in database
      for (const fileId of selectedFiles) {
        const { error } = await supabase
          .from('audio_library_items')
          .update({ subfolder: targetSubfolder })
          .eq('id', fileId);
          
        if (error) {
          console.error('Error moving file:', error);
          continue;
        }
      }
      
      // Update local state
      setAudioItems(audioItems.map(item => 
        selectedFiles.has(item.id) 
          ? { ...item, subfolder: targetSubfolder }
          : item
      ));
      
      console.log(`Moved ${selectedFiles.size} files to ${targetSubfolder}`);
      clearSelection();
      
    } catch (error) {
      console.error('Error moving files:', error);
    }
  };

  // Modal state for creating a new album
  const [showAlbumModal, setShowAlbumModal] = useState(false);
  const [newAlbum, setNewAlbum] = useState({
    title: '',
    artist: '',
    release_date: '',
    cover_art_url: '',
    description: '',
  });
  const [creatingAlbum, setCreatingAlbum] = useState(false);
  const [createAlbumError, setCreateAlbumError] = useState<string | null>(null);

  // Edit state for cover art
  const [editAlbumId, setEditAlbumId] = useState<string | null>(null);
  const [editCoverUrl, setEditCoverUrl] = useState<string>('');
  const [editUploading, setEditUploading] = useState(false);
  const [editUploadError, setEditUploadError] = useState<string | null>(null);

  // Edit Album Modal state
  const [editAlbum, setEditAlbum] = useState<Album | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    artist: '',
    release_date: '',
    cover_art_url: '',
    description: '',
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Add state for additional covers in create modal
  const [newAdditionalCovers, setNewAdditionalCovers] = useState<{ label: string; url: string; uploading?: boolean; error?: string }[]>([]);

  // Add state for additional covers in edit modal
  const [editAdditionalCovers, setEditAdditionalCovers] = useState<{ label: string; url: string; uploading?: boolean; error?: string }[]>([]);

  // When editAlbumId is set, populate editForm
  useEffect(() => {
    if (editAlbumId) {
      const album = albums.find(a => a.id === editAlbumId);
      if (album) {
        setEditAlbum(album);
        setEditForm({
          title: album.title || '',
          artist: album.artist || '',
          release_date: album.release_date || '',
          cover_art_url: album.cover_art_url || '',
          description: album.description || '',
        });
      }
    } else {
      setEditAlbum(null);
      setEditForm({ title: '', artist: '', release_date: '', cover_art_url: '', description: '' });
      setEditError(null);
    }
  }, [editAlbumId, albums]);

  // When opening edit modal, populate editAdditionalCovers
  useEffect(() => {
    if (editAlbumId) {
      const album = albums.find(a => a.id === editAlbumId);
      if (album) {
        setEditAdditionalCovers(album.additional_covers ? album.additional_covers.map(c => ({ ...c })) : []);
      }
    } else {
      setEditAdditionalCovers([]);
    }
  }, [editAlbumId, albums]);

  // State for cover art upload
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Fetch all data on mount
  useEffect(() => {
    if (!user?.id) return;
    // Albums
    setLoadingAlbums(true);
    supabase.from('albums').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setAlbumError(error.message);
        setAlbums(data || []);
        setLoadingAlbums(false);
      });
    // Singles
    setLoadingSingles(true);
    supabase.from('singles').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setSingleError(error.message);
        setSingles(data || []);
        setLoadingSingles(false);
      });
    // Platform Profiles
    setLoadingProfiles(true);
    supabase.from('platform_profiles').select('*').eq('user_id', user.id)
      .then(({ data, error }) => {
        if (error) setProfileError(error.message);
        setPlatformProfiles(data || []);
        setLoadingProfiles(false);
      });
    // Audio Library - Load all items for packs view
    setLoadingAudio(true);
    supabase.from('audio_library_items')
      .select(`
        *,
        pack:audio_packs(id, name, color)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data: allData, error: allError }) => {
        if (allError) setAudioError(allError.message);
        setAllAudioItems(allData || []);
        setLoadingAudio(false);
      });
      
    // Load first page for All Files view
    supabase.from('audio_library_items')
      .select(`
        *,
        pack:audio_packs(id, name, color)
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(0, itemsPerPage - 1)
      .then(({ data, error, count }) => {
        if (error) setAudioError(error.message);
        setAudioItems(data || []);
        setTotalItems(count || 0);
        setCurrentPage(1);
      });
      
    // Audio Packs
    setLoadingPacks(true);
    supabase.from('audio_packs')
      .select(`
        *,
        item_count:audio_library_items(count),
        subfolders:audio_subfolders(*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setPackError(error.message);
        setAudioPacks(data || []);
        setLoadingPacks(false);
      });
      
    // Subfolders
    supabase.from('audio_subfolders')
      .select('*')
      .in('pack_id', audioPacks.map(pack => pack.id))
      .order('position', { ascending: true })
      .then(({ data, error }) => {
        if (!error) setSubfolders(data || []);
      });
  }, [user?.id]);

  // Global drag and drop detection for file uploads
  useEffect(() => {
    const handleWindowDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) {
        e.preventDefault();
        setIsDraggingFiles(true);
      }
    };

    const handleWindowDragLeave = (e: DragEvent) => {
      // Only clear if we're leaving the window entirely
      if (e.clientX === 0 && e.clientY === 0) {
        setIsDraggingFiles(false);
        setShowDragDialog(false);
        setDragDialogInfo(null);
      }
    };

    const handleWindowDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDraggingFiles(false);
      setShowDragDialog(false);
      setDragDialogInfo(null);
    };

    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('dragleave', handleWindowDragLeave);
    window.addEventListener('drop', handleWindowDrop);

    return () => {
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('dragleave', handleWindowDragLeave);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, []);

  // CRUD handlers (examples for albums, repeat for others as needed)
  async function handleDeleteAlbum(id: string) {
    await supabase.from('albums').delete().eq('id', id);
    setAlbums(albums.filter(a => a.id !== id));
  }
  // ...repeat for singles, platformProfiles, audioItems

  async function handleCreateAlbum(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id) return;
    if (uploadingCover) {
      setCreateAlbumError('Please wait for the cover art to finish uploading.');
      return;
    }
    if (!newAlbum.cover_art_url) {
      setCreateAlbumError('Please upload a cover art image.');
      return;
    }
    if (newAdditionalCovers.some(c => c.uploading)) {
      setCreateAlbumError('Please wait for all additional covers to finish uploading.');
      return;
    }
    setCreatingAlbum(true);
    setCreateAlbumError(null);
    const { data, error } = await supabase.from('albums').insert([
      {
        ...newAlbum,
        user_id: user.id,
        additional_covers: newAdditionalCovers.filter(c => c.label && c.url).map(({ label, url }) => ({ label, url })),
      },
    ]).select('*').single();
    setCreatingAlbum(false);
    if (error) {
      setCreateAlbumError(error.message);
      return;
    }
    setAlbums([data, ...albums]);
    setShowAlbumModal(false);
    setNewAlbum({ title: '', artist: '', release_date: '', cover_art_url: '', description: '' });
    setNewAdditionalCovers([]);
  }

  async function handleEditAlbum(e: React.FormEvent) {
    e.preventDefault();
    if (!editAlbumId) return;
    if (uploadingCover) {
      setEditError('Please wait for the cover art to finish uploading.');
      return;
    }
    if (!editForm.cover_art_url) {
      setEditError('Please upload a cover art image.');
      return;
    }
    if (editAdditionalCovers.some(c => c.uploading)) {
      setEditError('Please wait for all additional covers to finish uploading.');
      return;
    }
    setEditSaving(true);
    setEditError(null);
    const { error } = await supabase.from('albums').update({
      ...editForm,
      additional_covers: editAdditionalCovers.filter(c => c.label && c.url).map(({ label, url }) => ({ label, url })),
    }).eq('id', editAlbumId);
    setEditSaving(false);
    if (error) {
      setEditError(error.message);
      return;
    }
    setAlbums(albums.map(a => a.id === editAlbumId ? { ...a, ...editForm, additional_covers: editAdditionalCovers.filter(c => c.label && c.url).map(({ label, url }) => ({ label, url })) } : a));
    setEditAlbumId(null);
    setEditAdditionalCovers([]);
  }

  // Add/Edit forms can be implemented as modals or inline (not shown for brevity)

  // Helper to upload cover art to Supabase Storage
  async function uploadCoverArt(file: File): Promise<string | null> {
    if (!user?.id) return null;
    setUploadingCover(true);
    setUploadError(null);
    const fileExt = file.name.split('.').pop();
    const filePath = `albums/${user.id}/${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from('beats').upload(filePath, file, { upsert: true });
    if (error) {
      setUploadError(error.message);
      setUploadingCover(false);
      return null;
    }
    // Get public URL
    const { data } = supabase.storage.from('beats').getPublicUrl(filePath);
    setUploadingCover(false);
    return data?.publicUrl || null;
  }

  // Helper to upload additional cover art
  async function uploadAdditionalCoverArt(file: File): Promise<string | null> {
    if (!user?.id) return null;
    setUploadingCover(true);
    setUploadError(null);
    const fileExt = file.name.split('.').pop();
    const filePath = `albums/${user.id}/additional_${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from('beats').upload(filePath, file, { upsert: true });
    if (error) {
      setUploadError(error.message);
      setUploadingCover(false);
      return null;
    }
    const { data } = supabase.storage.from('beats').getPublicUrl(filePath);
    setUploadingCover(false);
    return data?.publicUrl || null;
  }

  async function handleEditCoverArt(albumId: string, file: File) {
    setEditUploading(true);
    setEditUploadError(null);
    const url = await uploadCoverArt(file);
    if (!url) {
      setEditUploading(false);
      return;
    }
    const { error } = await supabase.from('albums').update({ cover_art_url: url }).eq('id', albumId);
    if (error) {
      setEditUploadError(error.message);
      setEditUploading(false);
      return;
    }
    setAlbums(albums.map(a => a.id === albumId ? { ...a, cover_art_url: url } : a));
    setEditUploading(false);
    setEditAlbumId(null);
    setEditCoverUrl('');
  }

  // Add/Remove additional covers in create modal
  function handleAddNewAdditionalCover() {
    setNewAdditionalCovers([...newAdditionalCovers, { label: '', url: '' }]);
  }
  function handleRemoveNewAdditionalCover(idx: number) {
    setNewAdditionalCovers(newAdditionalCovers.filter((_, i) => i !== idx));
  }

  // Add/Remove additional covers in edit modal
  function handleAddEditAdditionalCover() {
    setEditAdditionalCovers([...editAdditionalCovers, { label: '', url: '' }]);
  }
  function handleRemoveEditAdditionalCover(idx: number) {
    setEditAdditionalCovers(editAdditionalCovers.filter((_, i) => i !== idx));
  }

  const [selectedTab, setSelectedTab] = useState('audio');
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [newAudio, setNewAudio] = useState({ 
    name: '', 
    type: '', 
    description: '', 
    file_url: '', 
    pack_id: '', 
    subfolder: '',
    bpm: '',
    key: '',
    audio_type: '',
    tags: ''
  });
  const [audioUploading, setAudioUploading] = useState(false);
  const [audioUploadError, setAudioUploadError] = useState<string | null>(null);
  
  // Pack creation modal
  const [showPackModal, setShowPackModal] = useState(false);
  const [newPack, setNewPack] = useState({ name: '', description: '', color: '#3B82F6' });
  const [packCreating, setPackCreating] = useState(false);
  const [packCreateError, setPackCreateError] = useState<string | null>(null);
  
  // Subfolder creation modal
  const [showSubfolderModal, setShowSubfolderModal] = useState(false);
  const [newSubfolder, setNewSubfolder] = useState({ name: '', description: '', color: '#6B7280', pack_id: '' });
  const [subfolderCreating, setSubfolderCreating] = useState(false);
  const [subfolderCreateError, setSubfolderCreateError] = useState<string | null>(null);
  
  // Mass edit subfolder modal
  const [showMassEditModal, setShowMassEditModal] = useState(false);
  const [massEditPack, setMassEditPack] = useState<AudioPack | null>(null);
  const [massEditSubfolder, setMassEditSubfolder] = useState<AudioSubfolder | null>(null);

  // Audio upload logic for Audio Library tab
  async function uploadAudioLibraryFile(file: File): Promise<string | null> {
    if (!user?.id) return null;
    setAudioUploading(true);
    setAudioUploadError(null);
    const fileExt = file.name.split('.').pop();
    const filePath = `audio-library/${user.id}_${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from('beats').upload(filePath, file, { upsert: true });
    if (error) {
      setAudioUploadError(error.message);
      setAudioUploading(false);
      return null;
    }
    const { data } = supabase.storage.from('beats').getPublicUrl(filePath);
    setAudioUploading(false);
    return data?.publicUrl || null;
  }

  // Handle add audio
  async function handleAddAudio(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (audioUploading) {
      setAudioUploadError('Please wait for the audio upload to finish.');
      return;
    }
    if (!newAudio.file_url) {
      setAudioUploadError('Please upload an audio file.');
      return;
    }
    const insertData = {
      ...newAudio,
      user_id: user.id,
      pack_id: newAudio.pack_id || null,
      subfolder: newAudio.subfolder || null,
      bpm: newAudio.bpm ? parseInt(newAudio.bpm) : null,
      key: newAudio.key || null,
      audio_type: newAudio.audio_type || null,
      tags: newAudio.tags ? newAudio.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : null
    };
    const { error } = await supabase.from('audio_library_items').insert([insertData]);
    if (error) {
      setAudioUploadError(error.message);
      return;
    }
    setShowAudioModal(false);
    setNewAudio({ 
      name: '', 
      type: '', 
      description: '', 
      file_url: '', 
      pack_id: '', 
      subfolder: '',
      bpm: '',
      key: '',
      audio_type: '',
      tags: ''
    });
    // Refresh data
    await refreshAudioData();
  }

  // Handle create pack
  async function handleCreatePack(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setPackCreating(true);
    setPackCreateError(null);
    
    const { error } = await supabase.from('audio_packs').insert([
      { ...newPack, user_id: user.id }
    ]);
    
    if (error) {
      setPackCreateError(error.message);
      setPackCreating(false);
      return;
    }
    
    setShowPackModal(false);
    setNewPack({ name: '', description: '', color: '#3B82F6' });
    setPackCreating(false);
    // Refresh data
    await refreshAudioData();
  }

  // Handle delete pack
  async function handleDeletePack(packId: string) {
    if (!user) return;
    
    // Confirm deletion
    if (!confirm('Are you sure you want to delete this pack? This will permanently delete all audio files and subfolders inside it.')) {
      return;
    }
    
    try {
      console.log(`Deleting pack and all its contents...`);
      
      // Delete all audio files in this pack
      const { error: audioDeleteError } = await supabase
        .from('audio_library_items')
        .delete()
        .eq('pack_id', packId);
        
      if (audioDeleteError) {
        console.error('Error deleting audio files:', audioDeleteError);
        return;
      }
      
      // Delete all subfolders in this pack
      const { error: subfoldersDeleteError } = await supabase
        .from('audio_subfolders')
        .delete()
        .eq('pack_id', packId);
        
      if (subfoldersDeleteError) {
        console.error('Error deleting subfolders:', subfoldersDeleteError);
        return;
      }
      
      // Finally delete the pack itself
      const { error: packDeleteError } = await supabase
        .from('audio_packs')
        .delete()
        .eq('id', packId);
        
      if (packDeleteError) {
        console.error('Error deleting pack:', packDeleteError);
        return;
      }
      
      console.log(`Successfully deleted pack and all its contents`);
      
      // Update local state
      setAudioPacks(audioPacks.filter(p => p.id !== packId));
      
      // Remove audio files from local state
      setAudioItems(audioItems.filter(item => item.pack_id !== packId));
      
      // Remove subfolders from local state
      setSubfolders(subfolders.filter(sf => sf.pack_id !== packId));
      
    } catch (error) {
      console.error('Error during pack deletion:', error);
    }
  }

  // Handle delete audio item
  async function handleDeleteAudio(itemId: string) {
    if (!user) return;
    await supabase.from('audio_library_items').delete().eq('id', itemId);
    setAudioItems(audioItems.filter(item => item.id !== itemId));
  }
  
  // Handle edit audio file
  async function handleEditAudio(e: React.FormEvent) {
    e.preventDefault();
    if (!editingAudio || !user) return;
    
    setSavingAudio(true);
    setAudioEditError(null);
    
    const updateData = {
      bpm: editAudioForm.bpm ? parseInt(editAudioForm.bpm) : null,
      key: editAudioForm.key || null,
      audio_type: editAudioForm.audio_type || null,
      description: editAudioForm.description || null,
      tags: editAudioForm.tags ? editAudioForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : null
    };
    
    const { error } = await supabase
      .from('audio_library_items')
      .update(updateData)
      .eq('id', editingAudio.id);
    
    if (error) {
      setAudioEditError(error.message);
      setSavingAudio(false);
      return;
    }
    
    // Update local state
    const updatedItem: AudioLibraryItem = { 
      ...editingAudio, 
      bpm: updateData.bpm || undefined,
      key: updateData.key || undefined,
      audio_type: updateData.audio_type || undefined,
      description: updateData.description || undefined,
      tags: updateData.tags || undefined
    };
    setAudioItems(audioItems.map(item => 
      item.id === editingAudio.id ? updatedItem : item
    ));
    setAllAudioItems(allAudioItems.map(item => 
      item.id === editingAudio.id ? updatedItem : item
    ));
    
    setShowEditAudioModal(false);
    setEditingAudio(null);
    setEditAudioForm({ bpm: '', key: '', audio_type: '', description: '', tags: '' });
    setSavingAudio(false);
  }
  
  // Open edit modal for audio file
  function openEditAudioModal(item: AudioLibraryItem) {
    setEditingAudio(item);
    setEditAudioForm({
      bpm: item.bpm?.toString() || '',
      key: item.key || '',
      audio_type: item.audio_type || '',
      description: item.description || '',
      tags: item.tags ? item.tags.join(', ') : ''
    });
    setShowEditAudioModal(true);
  }

  // Load specific page of audio items
  async function loadPage(pageNumber: number) {
    if (!user?.id || loadingMore) return;
    
    setLoadingMore(true);
    const startIndex = (pageNumber - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage - 1;
    
    const { data: pageData, error: pageError } = await supabase
      .from('audio_library_items')
      .select(`
        *,
        pack:audio_packs(id, name, color)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(startIndex, endIndex);
    
    if (pageError) {
      console.error('Error loading page:', pageError);
      setLoadingMore(false);
      return;
    }
    
    setAudioItems(pageData || []);
    setLoadingMore(false);
  }

  // Refresh audio data without page reload
  async function refreshAudioData() {
    if (!user?.id) return;
    
    // Refresh all audio items for packs view
    const { data: allData, error: allError } = await supabase
      .from('audio_library_items')
      .select(`
        *,
        pack:audio_packs(id, name, color)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (allError) setAudioError(allError.message);
    setAllAudioItems(allData || []);
    
    // Refresh Audio Library with pagination
    setLoadingAudio(true);
    const { data: audioData, error: audioError, count } = await supabase
      .from('audio_library_items')
      .select(`
        *,
        pack:audio_packs(id, name, color)
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(0, itemsPerPage - 1);
    
    if (audioError) setAudioError(audioError.message);
    setAudioItems(audioData || []);
    setTotalItems(count || 0);
    setCurrentPage(1);
    setLoadingAudio(false);
      
    // Refresh Audio Packs
    setLoadingPacks(true);
    const { data: packsData, error: packsError } = await supabase
      .from('audio_packs')
      .select(`
        *,
        item_count:audio_library_items(count),
        subfolders:audio_subfolders(*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (packsError) setPackError(packsError.message);
    setAudioPacks(packsData || []);
    setLoadingPacks(false);
  }

  // Handle create subfolder
  async function handleCreateSubfolder(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubfolderCreating(true);
    setSubfolderCreateError(null);
    
    const { error } = await supabase.from('audio_subfolders').insert([newSubfolder]);
    
    if (error) {
      setSubfolderCreateError(error.message);
      setSubfolderCreating(false);
      return;
    }
    
    setShowSubfolderModal(false);
    setNewSubfolder({ name: '', description: '', color: '#6B7280', pack_id: '' });
    setSubfolderCreating(false);
    // Refresh data
    await refreshAudioData();
  }

  // Open mass edit modal for subfolder
  function openMassEditModal(pack: AudioPack, subfolder: AudioSubfolder) {
    setMassEditPack(pack)
    setMassEditSubfolder(subfolder)
    setShowMassEditModal(true)
  }
  
  // Handle delete subfolder
  async function handleDeleteSubfolder(subfolderId: string) {
    if (!user) return;
    
    // Confirm deletion
    if (!confirm('Are you sure you want to delete this subfolder? This will permanently delete all audio files inside it.')) {
      return;
    }
    
    try {
      // First, get the subfolder details to find associated audio files
      const { data: subfolderData, error: subfolderError } = await supabase
        .from('audio_subfolders')
        .select('name, pack_id')
        .eq('id', subfolderId)
        .single();
        
      if (subfolderError) {
        console.error('Error fetching subfolder:', subfolderError);
        return;
      }
      
      console.log(`Deleting subfolder "${subfolderData.name}" and all its contents...`);
      
      // Delete all audio files in this subfolder
      const { error: audioDeleteError } = await supabase
        .from('audio_library_items')
        .delete()
        .eq('pack_id', subfolderData.pack_id)
        .eq('subfolder', subfolderData.name);
        
      if (audioDeleteError) {
        console.error('Error deleting audio files:', audioDeleteError);
        return;
      }
      
      // Then delete the subfolder itself
      const { error: subfolderDeleteError } = await supabase
        .from('audio_subfolders')
        .delete()
        .eq('id', subfolderId);
        
      if (subfolderDeleteError) {
        console.error('Error deleting subfolder:', subfolderDeleteError);
        return;
      }
      
      console.log(`Successfully deleted subfolder "${subfolderData.name}" and all its audio files`);
      
      // Update local state
      setSubfolders(subfolders.filter(sf => sf.id !== subfolderId));
      
      // Remove audio files from local state
      setAudioItems(audioItems.filter(item => 
        !(item.pack_id === subfolderData.pack_id && item.subfolder === subfolderData.name)
      ));
      
    } catch (error) {
      console.error('Error during subfolder deletion:', error);
    }
  }

  // Toggle subfolder expansion
  const toggleSubfolder = (subfolderId: string) => {
    const newExpanded = new Set(expandedSubfolders);
    if (newExpanded.has(subfolderId)) {
      newExpanded.delete(subfolderId);
    } else {
      newExpanded.add(subfolderId);
    }
    setExpandedSubfolders(newExpanded);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, item: AudioLibraryItem) => {
    console.log('Drag started:', item.name);
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverTarget(null);
    setShowDragDialog(false);
    setDragDialogInfo(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    // Check if files are being dragged from file system
    if (e.dataTransfer.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy';
      setIsDraggingFiles(true);
    } else {
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDragEnter = (target: string) => {
    console.log('Drag enter:', target);
    setDragOverTarget(target);
    
    // Show drag dialog when hovering over folders
    if (isDraggingFiles || draggedItem) {
      if (target === 'unpacked') {
        setDragDialogInfo({
          folderName: 'Unpacked Files',
          folderType: 'unpacked'
        });
        setShowDragDialog(true);
      } else if (target.includes('-root')) {
        const packId = target.replace('-root', '');
        const pack = audioPacks.find(p => p.id === packId);
        if (pack) {
          setDragDialogInfo({
            folderName: pack.name,
            folderType: 'pack',
            packName: pack.name
          });
          setShowDragDialog(true);
        }
      } else if (target.includes('-')) {
        const [packId, subfolderName] = target.split('-');
        const pack = audioPacks.find(p => p.id === packId);
        if (pack) {
          setDragDialogInfo({
            folderName: subfolderName,
            folderType: 'subfolder',
            packName: pack.name
          });
          setShowDragDialog(true);
        }
      }
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    console.log('Drag leave triggered');
    setDragOverTarget(null);
    setShowDragDialog(false);
    setDragDialogInfo(null);
  };

  const handleDrop = async (e: React.DragEvent, targetSubfolder: string | null, targetPackId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Drop triggered:', { isDraggingFiles, draggedItem, targetSubfolder, targetPackId });
    
    if (!user) {
      console.log('No user');
      return;
    }

    setIsDraggingFiles(false);
    setDragOverTarget(null);
    setShowDragDialog(false);
    setDragDialogInfo(null);

    // Handle file uploads from computer
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      console.log('Files dropped:', e.dataTransfer.files.length);
      
      // Convert FileList to Array for better handling
      const filesArray = Array.from(e.dataTransfer.files);
      const audioFiles = filesArray.filter(file => {
        const audioExtensions = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma'];
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
        return file.type.startsWith('audio/') || audioExtensions.includes(fileExtension);
      });
      
      console.log('Audio files to upload:', audioFiles.map(f => f.name));
      
      if (audioFiles.length === 0) {
        console.log('No audio files to upload');
        return;
      }
      
      // Initialize upload progress
      setUploadProgress({
        isUploading: true,
        currentFile: '',
        currentIndex: 0,
        totalFiles: audioFiles.length,
        completedFiles: []
      });
      
      // Show loading state during upload
      setLoadingAudio(true);
      let successfulUploads = 0;
      let processedFiles = 0;
      
      for (const file of audioFiles) {
        processedFiles++;
        
        // Update upload progress
        setUploadProgress(prev => ({
          ...prev,
          currentFile: file.name,
          currentIndex: processedFiles
        }));
        
        console.log(`Processing file ${processedFiles}/${audioFiles.length}: ${file.name} (type: ${file.type})`);

        try {
          console.log(`Uploading file ${processedFiles}/${audioFiles.length}:`, file.name);
          
          // Upload file to storage with unique filename
          const fileExt = file.name.split('.').pop();
          const timestamp = Date.now();
          const randomId = Math.random().toString(36).substring(2);
          const fileName = `${timestamp}-${processedFiles}-${randomId}.${fileExt}`;
          const filePath = `audio-library/${user.id}_${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('beats')
            .upload(filePath, file, { upsert: false });

          if (uploadError) {
            console.error(`Upload error for ${file.name}:`, uploadError);
            continue;
          }

          console.log(`Storage upload successful for ${file.name}`);

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('beats')
            .getPublicUrl(filePath);

          // Save to database
          const insertData = {
            user_id: user.id,
            name: file.name,
            type: 'sample', // Default type
            file_url: urlData.publicUrl,
            file_size: file.size,
            pack_id: targetPackId,
            subfolder: targetSubfolder
          };

          const { error: dbError } = await supabase
            .from('audio_library_items')
            .insert([insertData]);

          if (dbError) {
            console.error(`Database error for ${file.name}:`, dbError);
            continue;
          }

          console.log(`File uploaded successfully: ${file.name}`);
          successfulUploads++;
          
          // Update upload progress with completed file
          setUploadProgress(prev => ({
            ...prev,
            completedFiles: [...prev.completedFiles, file.name]
          }));
        } catch (error) {
          console.error(`Error uploading file ${file.name}:`, error);
          // Still update progress even on error to show we tried this file
          setUploadProgress(prev => ({
            ...prev,
            completedFiles: [...prev.completedFiles, `❌ ${file.name} (failed)`]
          }));
        }
      }
      
      // Refresh data to show new files and stay on audio tab
      console.log(`Upload complete: ${successfulUploads}/${audioFiles.length} files uploaded successfully`);
      
      // Reset upload progress
      setUploadProgress({
        isUploading: false,
        currentFile: '',
        currentIndex: 0,
        totalFiles: 0,
        completedFiles: []
      });
      
      if (successfulUploads > 0) {
        await refreshAudioData();
        console.log(`Data refreshed. Successfully uploaded ${successfulUploads} file(s)`);
      } else {
        console.log('No files were uploaded successfully');
        setLoadingAudio(false);
      }
      return;
    }

    // Handle moving existing items
    if (!draggedItem) {
      console.log('No dragged item');
      return;
    }

    try {
      // Update the database
      const updateData = {
        pack_id: targetPackId,
        subfolder: targetSubfolder
      };
      
      console.log('Updating database with:', updateData);
      
      const { error } = await supabase
        .from('audio_library_items')
        .update(updateData)
        .eq('id', draggedItem.id);

      if (error) {
        console.error('Error moving file:', error);
        return;
      }

      console.log('Database updated successfully');

      // Update local state
      setAudioItems(audioItems.map(item => 
        item.id === draggedItem.id 
          ? { 
              ...item, 
              pack_id: targetPackId || undefined, 
              subfolder: targetSubfolder || undefined,
              pack: targetPackId ? item.pack : undefined  // Clear pack info if moving to unpacked
            }
          : item
      ));

      setDraggedItem(null);
    } catch (error) {
      console.error('Error moving file:', error);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Library</h1>
        {selectedTab === 'albums' && (
          <Button className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-6 py-2 rounded" onClick={() => setShowAlbumModal(true)}>
          <Plus className="h-4 w-4" />
          Add New Album
        </Button>
        )}
        {selectedTab === 'audio' && (
          <div className="flex gap-2">
          <Button className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-6 py-2 rounded" onClick={() => setShowAudioModal(true)}>
            <Plus className="h-4 w-4" />
            Add Audio
          </Button>
            <Button className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-2 rounded" onClick={() => setShowPackModal(true)}>
              <Plus className="h-4 w-4" />
              Create Pack
            </Button>
          </div>
        )}
      </div>
      {/* Create Album Modal */}
      <Dialog open={showAlbumModal} onOpenChange={setShowAlbumModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Album</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateAlbum} className="space-y-4">
            <Input
              placeholder="Album Title"
              value={newAlbum.title}
              onChange={e => setNewAlbum({ ...newAlbum, title: e.target.value })}
              required
            />
            <Input
              placeholder="Artist Name"
              value={newAlbum.artist}
              onChange={e => setNewAlbum({ ...newAlbum, artist: e.target.value })}
              required
            />
            <Input
              type="date"
              placeholder="Release Date"
              value={newAlbum.release_date}
              onChange={e => setNewAlbum({ ...newAlbum, release_date: e.target.value })}
            />
            <Input
              type="file"
              accept="image/*"
              ref={coverInputRef}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const url = await uploadCoverArt(file);
                  if (url) setNewAlbum({ ...newAlbum, cover_art_url: url });
                }
              }}
            />
            {uploadingCover && <div className="text-sm text-gray-500">Uploading cover...</div>}
            {uploadError && <div className="text-red-500 text-sm">{uploadError}</div>}
            {newAlbum.cover_art_url && (
              <img src={newAlbum.cover_art_url} alt="Cover preview" className="w-24 h-24 object-cover rounded mt-2" />
            )}
            <Textarea
              placeholder="Description"
              value={newAlbum.description}
              onChange={e => setNewAlbum({ ...newAlbum, description: e.target.value })}
            />
            {/* Additional Covers */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Additional Covers</span>
                <Button type="button" size="sm" onClick={handleAddNewAdditionalCover}>Add Cover</Button>
              </div>
              {newAdditionalCovers.map((cover, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder="Label (e.g. YouTube Banner)"
                    value={cover.label}
                    onChange={e => {
                      const arr = [...newAdditionalCovers];
                      arr[idx].label = e.target.value;
                      setNewAdditionalCovers(arr);
                    }}
                    className="w-40"
                  />
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const arr = [...newAdditionalCovers];
                        arr[idx].uploading = true;
                        setNewAdditionalCovers(arr);
                        const url = await uploadAdditionalCoverArt(file);
                        arr[idx].url = url || '';
                        arr[idx].uploading = false;
                        arr[idx].error = url ? '' : 'Upload failed';
                        setNewAdditionalCovers([...arr]);
                      }
                    }}
                  />
                  {cover.uploading && <span className="text-xs text-gray-500">Uploading...</span>}
                  {cover.url && <img src={cover.url} alt={cover.label} className="w-12 h-12 object-cover rounded" />}
                  <Button type="button" size="sm" variant="destructive" onClick={() => handleRemoveNewAdditionalCover(idx)}>Remove</Button>
                </div>
              ))}
            </div>
            {createAlbumError && <div className="text-red-500 text-sm">{createAlbumError}</div>}
            <DialogFooter>
              <Button type="submit" disabled={creatingAlbum || uploadingCover} className="bg-yellow-400 hover:bg-yellow-500 text-black">
                {creatingAlbum ? 'Creating...' : uploadingCover ? 'Uploading cover...' : 'Create Album'}
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Edit Cover Art Modal */}
      <Dialog open={!!editAlbumId} onOpenChange={open => { if (!open) setEditAlbumId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Album</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditAlbum} className="space-y-4">
            <Input
              placeholder="Album Title"
              value={editForm.title}
              onChange={e => setEditForm({ ...editForm, title: e.target.value })}
              required
            />
            <Input
              placeholder="Artist Name"
              value={editForm.artist}
              onChange={e => setEditForm({ ...editForm, artist: e.target.value })}
              required
            />
            <Input
              type="date"
              placeholder="Release Date"
              value={editForm.release_date}
              onChange={e => setEditForm({ ...editForm, release_date: e.target.value })}
            />
            <Input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const url = await uploadCoverArt(file);
                  if (url) setEditForm({ ...editForm, cover_art_url: url });
                }
              }}
            />
            {editForm.cover_art_url && (
              <img src={editForm.cover_art_url} alt="Cover preview" className="w-24 h-24 object-cover rounded mt-2" />
            )}
            <Textarea
              placeholder="Description"
              value={editForm.description}
              onChange={e => setEditForm({ ...editForm, description: e.target.value })}
            />
            {/* Additional Covers */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Additional Covers</span>
                <Button type="button" size="sm" onClick={handleAddEditAdditionalCover}>Add Cover</Button>
              </div>
              {editAdditionalCovers.map((cover, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder="Label (e.g. YouTube Banner)"
                    value={cover.label}
                    onChange={e => {
                      const arr = [...editAdditionalCovers];
                      arr[idx].label = e.target.value;
                      setEditAdditionalCovers(arr);
                    }}
                    className="w-40"
                  />
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const arr = [...editAdditionalCovers];
                        arr[idx].uploading = true;
                        setEditAdditionalCovers(arr);
                        const url = await uploadAdditionalCoverArt(file);
                        arr[idx].url = url || '';
                        arr[idx].uploading = false;
                        arr[idx].error = url ? '' : 'Upload failed';
                        setEditAdditionalCovers([...arr]);
                      }
                    }}
                  />
                  {cover.uploading && <span className="text-xs text-gray-500">Uploading...</span>}
                  {cover.url && <img src={cover.url} alt={cover.label} className="w-12 h-12 object-cover rounded" />}
                  <Button type="button" size="sm" variant="destructive" onClick={() => handleRemoveEditAdditionalCover(idx)}>Remove</Button>
                </div>
              ))}
            </div>
            {editError && <div className="text-red-500 text-sm">{editError}</div>}
            <DialogFooter>
              <Button type="submit" disabled={editSaving || uploadingCover} className="bg-yellow-400 hover:bg-yellow-500 text-black">
                {editSaving ? 'Saving...' : uploadingCover ? 'Uploading cover...' : 'Save Changes'}
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Audio Library Upload Modal */}
      <Dialog open={showAudioModal} onOpenChange={setShowAudioModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Audio File</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddAudio} className="space-y-4">
            <Input
              placeholder="Name"
              value={newAudio.name}
              onChange={e => setNewAudio({ ...newAudio, name: e.target.value })}
              required
            />
            <Input
              placeholder="Type (e.g. loop, sample, kit)"
              value={newAudio.type}
              onChange={e => setNewAudio({ ...newAudio, type: e.target.value })}
            />
            <Input
              type="number"
              placeholder="BPM (e.g., 140)"
              value={newAudio.bpm}
              onChange={e => setNewAudio({ ...newAudio, bpm: e.target.value })}
            />
            <Input
              placeholder="Key (e.g., C, Am, F#)"
              value={newAudio.key}
              onChange={e => setNewAudio({ ...newAudio, key: e.target.value })}
            />
            <Input
              placeholder="Audio Type (e.g., kick, snare, hihat, bass, melody, loop)"
              value={newAudio.audio_type}
              onChange={e => setNewAudio({ ...newAudio, audio_type: e.target.value })}
            />
            <Input
              placeholder="Tags (comma-separated, e.g., trap, dark, aggressive, 808)"
              value={newAudio.tags}
              onChange={e => setNewAudio({ ...newAudio, tags: e.target.value })}
            />
            <Textarea
              placeholder="Description"
              value={newAudio.description}
              onChange={e => setNewAudio({ ...newAudio, description: e.target.value })}
            />
            <select
              value={newAudio.pack_id}
              onChange={e => {
                setNewAudio({ ...newAudio, pack_id: e.target.value, subfolder: '' });
              }}
              className="w-full p-2 border border-gray-300 rounded-md bg-background text-foreground"
            >
              <option value="">No Pack (Individual File)</option>
              {audioPacks.map(pack => (
                <option key={pack.id} value={pack.id}>{pack.name}</option>
              ))}
            </select>
            
            {newAudio.pack_id && (
              <select
                value={newAudio.subfolder}
                onChange={e => setNewAudio({ ...newAudio, subfolder: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md bg-background text-foreground"
              >
                <option value="">Root of Pack (No Subfolder)</option>
                {audioPacks
                  .find(pack => pack.id === newAudio.pack_id)
                  ?.subfolders?.map(subfolder => (
                    <option key={subfolder.id} value={subfolder.name}>
                      📁 {subfolder.name}
                    </option>
                  ))}
              </select>
            )}
            <Input
              type="file"
              accept="audio/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const url = await uploadAudioLibraryFile(file);
                  if (url) setNewAudio({ ...newAudio, file_url: url });
                }
              }}
            />
            {audioUploading && <div className="text-sm text-gray-500">Uploading audio...</div>}
            {audioUploadError && <div className="text-red-500 text-sm">{audioUploadError}</div>}
            {newAudio.file_url && (
              <audio 
                controls 
                src={newAudio.file_url} 
                className="h-8 mt-2"
                onDragStart={(e) => e.preventDefault()}
              />
            )}
            <DialogFooter>
              <Button type="submit" disabled={audioUploading} className="bg-yellow-400 hover:bg-yellow-500 text-black">
                {audioUploading ? 'Uploading...' : 'Add Audio'}
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Create Pack Modal */}
      <Dialog open={showPackModal} onOpenChange={setShowPackModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Audio Pack</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreatePack} className="space-y-4">
            <Input
              placeholder="Pack Name"
              value={newPack.name}
              onChange={e => setNewPack({ ...newPack, name: e.target.value })}
              required
            />
            <Textarea
              placeholder="Description"
              value={newPack.description}
              onChange={e => setNewPack({ ...newPack, description: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium mb-2">Pack Color</label>
              <input
                type="color"
                value={newPack.color}
                onChange={e => setNewPack({ ...newPack, color: e.target.value })}
                className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
              />
            </div>
            {packCreateError && <div className="text-red-500 text-sm">{packCreateError}</div>}
            <DialogFooter>
              <Button type="submit" disabled={packCreating} className="bg-blue-500 hover:bg-blue-600 text-white">
                {packCreating ? 'Creating...' : 'Create Pack'}
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Create Subfolder Modal */}
      <Dialog open={showSubfolderModal} onOpenChange={setShowSubfolderModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Subfolder</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubfolder} className="space-y-4">
            <select
              value={newSubfolder.pack_id}
              onChange={e => setNewSubfolder({ ...newSubfolder, pack_id: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md bg-background text-foreground"
              required
            >
              <option value="">Select Pack</option>
              {audioPacks.map(pack => (
                <option key={pack.id} value={pack.id}>{pack.name}</option>
              ))}
            </select>
            <Input
              placeholder="Subfolder Name (e.g. Kicks, Snares, 808s)"
              value={newSubfolder.name}
              onChange={e => setNewSubfolder({ ...newSubfolder, name: e.target.value })}
              required
            />
            <Textarea
              placeholder="Description"
              value={newSubfolder.description}
              onChange={e => setNewSubfolder({ ...newSubfolder, description: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium mb-2">Subfolder Color</label>
              <input
                type="color"
                value={newSubfolder.color}
                onChange={e => setNewSubfolder({ ...newSubfolder, color: e.target.value })}
                className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
              />
            </div>
            {subfolderCreateError && <div className="text-red-500 text-sm">{subfolderCreateError}</div>}
            <DialogFooter>
              <Button type="submit" disabled={subfolderCreating} className="bg-green-500 hover:bg-green-600 text-white">
                {subfolderCreating ? 'Creating...' : 'Create Subfolder'}
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      <Tabs defaultValue={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="albums">Albums</TabsTrigger>
          <TabsTrigger value="tracks">Tracks</TabsTrigger>
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
          <TabsTrigger value="singles">Singles</TabsTrigger>
          <TabsTrigger value="profiles">Music Profiles</TabsTrigger>
          <TabsTrigger value="audio">Audio Library</TabsTrigger>
          <TabsTrigger value="top">Top Releases</TabsTrigger>
        </TabsList>
        {/* Albums Tab */}
        <TabsContent value="albums" className="space-y-4">
          {loadingAlbums ? <div>Loading albums...</div> : albumError ? <div className="text-red-500">{albumError}</div> : albums.length === 0 ? <div>No albums found.</div> : albums.map(album => (
            <Card key={album.id} className="p-6">
              <div className="flex gap-6">
                {album.cover_art_url ? (
                  <img src={album.cover_art_url} alt={album.title} className="w-32 h-32 object-cover rounded-lg" />
                ) : (
                  <img src="/placeholder.jpg" alt="No cover art" className="w-32 h-32 object-cover rounded-lg" />
                )}
                {album.additional_covers && album.additional_covers.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-medium mb-2">Additional Covers</h3>
                    <div className="flex flex-wrap gap-2">
                      {album.additional_covers.map((cover, idx) => (
                        <div key={idx} className="flex flex-col items-center">
                          <img src={cover.url} alt={cover.label} className="w-16 h-16 object-cover rounded" />
                          <span className="text-xs text-gray-400 mt-1">{cover.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <Link href={`/myalbums/${album.id}`} className="hover:underline">
                      <h2 className="text-2xl font-semibold">{album.title}</h2>
                      </Link>
                      <p className="text-gray-500">{album.artist}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditAlbumId(album.id)}><FileText className="h-4 w-4 mr-2" />Edit</Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteAlbum(album.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</Button>
                      <Link href={`/myalbums/${album.id}`} passHref legacyBehavior>
                        <Button asChild variant="default" size="sm">View Album</Button>
                      </Link>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                      <Calendar className="h-4 w-4" />
                      Released: {album.release_date ? new Date(album.release_date).toLocaleDateString() : 'N/A'}
                    </div>
                    <div className="mt-4">
                      <h3 className="font-medium mb-2">Description</h3>
                      <div className="text-sm text-gray-500 font-semibold">{album.description || 'No description.'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>
        {/* Tracks Tab (placeholder) */}
        <TabsContent value="tracks">
          <div className="text-center py-8 text-gray-500">
            Track management coming soon...
          </div>
        </TabsContent>
        {/* Platforms Tab (placeholder) */}
        <TabsContent value="platforms">
          <div className="text-center py-8 text-gray-500">
            Platform distribution management coming soon...
          </div>
        </TabsContent>
        {/* Singles Tab */}
        <TabsContent value="singles" className="space-y-4">
          {loadingSingles ? <div>Loading singles...</div> : singleError ? <div className="text-red-500">{singleError}</div> : singles.length === 0 ? <div>No singles found.</div> : singles.map(single => (
              <Card key={single.id} className="p-6 flex gap-6 items-center">
              <img src={single.cover_art_url} alt={single.title} className="w-24 h-24 object-cover rounded-lg" />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-semibold">{single.title}</h2>
                      <p className="text-gray-500">{single.artist}</p>
                    </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => {/* show edit form */}}><FileText className="h-4 w-4 mr-2" />Edit</Button>
                    <Button variant="destructive" size="sm" onClick={() => {/* handleDeleteSingle(single.id) */}}><Trash2 className="h-4 w-4 mr-2" />Delete</Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                    <Calendar className="h-4 w-4" />
                  Released: {single.release_date ? new Date(single.release_date).toLocaleDateString() : 'N/A'}
                  <span className="ml-4">Duration: {single.duration || 'N/A'}</span>
                  </div>
                  <div className="mt-3">
                  <h3 className="font-medium mb-1">Description</h3>
                  <div className="text-sm text-gray-500 font-semibold">{single.description || 'No description.'}</div>
                </div>
                </div>
              </Card>
            ))}
        </TabsContent>
        {/* Platform Profiles Tab */}
        <TabsContent value="profiles" className="space-y-4">
          {loadingProfiles ? <div>Loading profiles...</div> : profileError ? <div className="text-red-500">{profileError}</div> : platformProfiles.length === 0 ? <div>No profiles found.</div> : platformProfiles.map(profile => (
              <Card key={profile.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
                      <Globe className="h-6 w-6 text-gray-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">{profile.platform}</h3>
                      {profile.verification_status === 'verified' && (<Badge variant="default" className="bg-blue-500">Verified</Badge>)}
                      {profile.claim_status === 'claimed' && (<Badge variant="default" className="bg-green-600">Claimed</Badge>)}
                      {profile.claim_status === 'pending' && (<Badge variant="secondary" className="bg-yellow-500 text-black">Pending Claim</Badge>)}
                      {profile.claim_status === 'unclaimed' && (<Badge variant="outline" className="bg-red-500 text-white">Unclaimed</Badge>)}
                      </div>
                      <p className="text-sm text-gray-400">@{profile.username}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => {/* show edit form */}}><Pencil className="h-4 w-4 mr-2" />Edit</Button>
                  <Button variant="destructive" size="sm" onClick={() => {/* handleDeleteProfile(profile.id) */}}><Trash2 className="h-4 w-4 mr-2" />Delete</Button>
                  </div>
                </div>
              </Card>
            ))}
        </TabsContent>
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
              ) : audioItems.length === 0 ? (
                <div>No audio files found.</div>
              ) : (
                <>
                  <div className="text-sm text-gray-400 mb-4">
                    Page {currentPage} of {Math.ceil(totalItems / itemsPerPage)} - Showing {audioItems.length} files
                  </div>
                  {audioItems.map(item => (
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
                  {totalItems > itemsPerPage && (
                    <div className="flex justify-center items-center gap-2 mt-6">
                      <Button
                        onClick={() => {
                          if (currentPage > 1) {
                            setCurrentPage(currentPage - 1);
                            loadPage(currentPage - 1);
                          }
                        }}
                        disabled={currentPage === 1 || loadingMore}
                        variant="outline"
                        size="sm"
                        className="px-3 py-1"
                      >
                        ← Previous
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, Math.ceil(totalItems / itemsPerPage)) }, (_, i) => {
                          const pageNum = i + 1;
                          return (
                            <Button
                              key={pageNum}
                              onClick={() => {
                                setCurrentPage(pageNum);
                                loadPage(pageNum);
                              }}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              className="px-3 py-1 min-w-[40px]"
                              disabled={loadingMore}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                        
                        {Math.ceil(totalItems / itemsPerPage) > 5 && (
                          <>
                            <span className="text-gray-400">...</span>
                            <Button
                              onClick={() => {
                                const lastPage = Math.ceil(totalItems / itemsPerPage);
                                setCurrentPage(lastPage);
                                loadPage(lastPage);
                              }}
                              variant="outline"
                              size="sm"
                              className="px-3 py-1"
                              disabled={loadingMore}
                            >
                              {Math.ceil(totalItems / itemsPerPage)}
                            </Button>
                          </>
                        )}
                      </div>
                      
                      <Button
                        onClick={() => {
                          if (currentPage < Math.ceil(totalItems / itemsPerPage)) {
                            setCurrentPage(currentPage + 1);
                            loadPage(currentPage + 1);
                          }
                        }}
                        disabled={currentPage >= Math.ceil(totalItems / itemsPerPage) || loadingMore}
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
              ) : audioPacks.length === 0 ? (
                <div>No packs found. Create your first pack to organize your sounds!</div>
              ) : (
                audioPacks.map(pack => (
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
                            {allAudioItems.filter(item => item.pack_id === pack.id).length} items
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
                          onClick={() => {
                            setNewSubfolder({ ...newSubfolder, pack_id: pack.id });
                            setShowSubfolderModal(true);
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
                                      {allAudioItems.filter(item => item.pack_id === pack.id && item.subfolder === subfolder.name).length} files
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
                                                                          {allAudioItems
                                        .filter(item => item.pack_id === pack.id && item.subfolder === subfolder.name)
                                        .map(item => (
                                          <div 
                                            key={item.id} 
                                            className={`flex items-center gap-4 p-2 bg-black rounded-lg ml-4 cursor-move transition-opacity ${
                                              draggedItem?.id === item.id ? 'opacity-50' : ''
                                            }`}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, item)}
                                            onDragEnd={handleDragEnd}
                                          >
                                          <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center">
                                            {item.type === 'midi' && <Piano className="h-3 w-3 text-yellow-400" />}
                                            {item.type === 'soundkit' && <Drum className="h-3 w-3 text-red-400" />}
                                            {item.type === 'loop' && <Music className="h-3 w-3 text-blue-400" />}
                                            {item.type === 'patch' && <Music2 className="h-3 w-3 text-green-400" />}
                                            {item.type === 'sample' && <FileAudio className="h-3 w-3 text-purple-400" />}
                                            {item.type === 'clip' && <FileMusic className="h-3 w-3 text-pink-400" />}
                                            {item.type === 'other' && <File className="h-3 w-3 text-gray-400" />}
                                          </div>
                                          <div className="flex-1">
                                            <h5 className="text-sm font-medium">{item.name}</h5>
                                            <p className="text-xs text-gray-500 capitalize">{item.type}</p>
                                            <div className="flex items-center gap-1 mt-1">
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
                                            </div>
                                            {item.tags && item.tags.length > 0 && (
                                              <div className="flex flex-wrap gap-1 mt-1">
                                                {item.tags.slice(0, 2).map((tag, index) => (
                                                  <Badge key={index} variant="secondary" className="text-xs">
                                                    {tag}
                                                  </Badge>
                                                ))}
                                                {item.tags.length > 2 && (
                                                  <Badge variant="secondary" className="text-xs">
                                                    +{item.tags.length - 2}
                                                  </Badge>
                                                )}
                                              </div>
                                            )}
                                                                                         {item.file_url && (
                                               <audio 
                                                 controls 
                                                 src={item.file_url} 
                                                 className="h-6 mt-1" 
                                                 style={{ maxWidth: '200px' }}
                                                 onDragStart={(e) => e.preventDefault()}
                                               />
                                             )}
                                          </div>
                                          <div className="flex gap-1">
                                            <Button variant="outline" size="sm" onClick={() => openEditAudioModal(item)}>
                                              <Pencil className="h-3 w-3" />
                                            </Button>
                                            <Button variant="outline" size="sm" asChild>
                                              <a href={item.file_url} download className="text-xs">⬇️</a>
                                            </Button>
                                            <Button 
                                              variant="destructive" 
                                              size="sm" 
                                              onClick={() => handleDeleteAudio(item.id)}
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                    {allAudioItems.filter(item => item.pack_id === pack.id && item.subfolder === subfolder.name).length === 0 && (
                                      <p className="text-center text-gray-400 py-2 text-sm ml-4">No files in this folder yet.</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Show root level files (no subfolder) */}
                        <div 
                          className={`space-y-2 p-3 rounded-lg border-2 border-dashed transition-colors ${
                            dragOverTarget === `${pack.id}-root` 
                              ? isDraggingFiles 
                                ? 'border-yellow-400 bg-yellow-100' 
                                : 'border-yellow-400 bg-yellow-100'
                              : isDraggingFiles
                                ? 'border-yellow-300'
                                : 'border-gray-200'
                          }`}
                          onDragOver={handleDragOver}
                          onDragEnter={() => handleDragEnter(`${pack.id}-root`)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, null, pack.id)}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-gray-600 text-sm flex items-center gap-2">
                              <Folder className="h-4 w-4" />
                              Pack Root 
                              {dragOverTarget === `${pack.id}-root` && 
                                (isDraggingFiles ? '(Upload files here)' : '(Drop here)')
                              }
                              {isDraggingFiles && dragOverTarget !== `${pack.id}-root` && 
                                ' (Upload files here)'
                              }
                            </h4>
                            
                            {/* Selection Controls */}
                            {allAudioItems.filter(item => item.pack_id === pack.id && !item.subfolder).length > 0 && (
                              <div className="flex items-center gap-2">
                                {selectedFiles.size > 0 && (
                                  <>
                                    <span className="text-xs text-yellow-600">
                                      {selectedFiles.size} selected
                                    </span>
                                    <select
                                      className="text-xs p-1 rounded border bg-yellow-100 text-black"
                                      value=""
                                      onChange={(e) => {
                                        if (e.target.value) {
                                          moveSelectedFiles(e.target.value, pack.id);
                                        }
                                      }}
                                    >
                                      <option value="">Move to subfolder...</option>
                                      {pack.subfolders?.map(subfolder => (
                                        <option key={subfolder.id} value={subfolder.name}>
                                          {subfolder.name}
                                        </option>
                                      ))}
                                    </select>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={clearSelection}
                                      className="text-xs h-6"
                                    >
                                      Clear
                                    </Button>
                                  </>
                                )}
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => selectAllInPackRoot(pack.id)}
                                  className="text-xs h-6"
                                >
                                  Select All
                                </Button>
                              </div>
                            )}
                          </div>
                          {allAudioItems
                            .filter(item => item.pack_id === pack.id && !item.subfolder)
                            .map(item => (
                              <div 
                                key={item.id} 
                                className={`flex items-center gap-4 p-3 bg-black rounded-lg transition-opacity ${
                                  selectedFiles.has(item.id) ? 'ring-2 ring-yellow-400' : ''
                                } ${draggedItem?.id === item.id ? 'opacity-50' : ''}`}
                                draggable={!selectedFiles.has(item.id)}
                                onDragStart={(e) => selectedFiles.has(item.id) ? e.preventDefault() : handleDragStart(e, item)}
                                onDragEnd={handleDragEnd}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedFiles.has(item.id)}
                                  onChange={() => toggleFileSelection(item.id)}
                                  className="w-4 h-4 text-yellow-400 bg-gray-100 border-gray-300 rounded focus:ring-yellow-500"
                                  onClick={(e) => e.stopPropagation()}
                                />
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
                                  <h4 className="font-medium">{item.name}</h4>
                                  <p className="text-xs text-gray-500 capitalize">{item.type}</p>
                                  <div className="flex items-center gap-1 mt-1">
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
                                  </div>
                                  {item.tags && item.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {item.tags.slice(0, 2).map((tag, index) => (
                                        <Badge key={index} variant="secondary" className="text-xs">
                                          {tag}
                                        </Badge>
                                      ))}
                                      {item.tags.length > 2 && (
                                        <Badge variant="secondary" className="text-xs">
                                          +{item.tags.length - 2}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                  {item.file_url && (
                                                                    <audio 
                                  controls 
                                  src={item.file_url} 
                                  className="h-6 mt-1"
                                  onDragStart={(e) => e.preventDefault()}
                                />
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button variant="outline" size="sm" onClick={() => openEditAudioModal(item)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="outline" size="sm" asChild>
                                <a href={item.file_url} download className="text-xs">Download</a>
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                onClick={() => handleDeleteAudio(item.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                              </div>
                            ))}
                          {allAudioItems.filter(item => item.pack_id === pack.id && !item.subfolder).length === 0 && (
                            <p className="text-center text-gray-500 py-2 text-sm">No root files.</p>
                          )}
                        </div>
                        
                        {allAudioItems.filter(item => item.pack_id === pack.id).length === 0 && (
                          <p className="text-center text-gray-500 py-4">No files in this pack yet.</p>
                        )}
                      </div>
                    )}
                  </Card>
                ))
              )}
              
              {/* Show unpacked files in packs view */}
              {allAudioItems.filter(item => !item.pack_id).length > 0 && (
                <Card 
                  className={`p-6 transition-colors ${
                    dragOverTarget === 'unpacked' 
                      ? isDraggingFiles 
                        ? 'bg-yellow-100 border-yellow-400 border-2' 
                        : 'bg-yellow-100 border-yellow-400 border-2'
                      : isDraggingFiles
                        ? 'border-dashed border-yellow-300'
                        : ''
                  }`}
                  onDragOver={handleDragOver}
                  onDragEnter={() => handleDragEnter('unpacked')}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, null, null)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center">
                        <Folder className="h-6 w-6 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">
                          Unpacked Files {dragOverTarget === 'unpacked' && '(Drop here)'}
                        </h3>
                        <p className="text-sm text-gray-400">Files not organized in any pack</p>
                        <p className="text-xs text-gray-500">
                          {allAudioItems.filter(item => !item.pack_id).length} items
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedPack(selectedPack === 'unpacked' ? null : 'unpacked')}
                    >
                      {selectedPack === 'unpacked' ? 'Hide' : 'View'} Files
                    </Button>
                  </div>
                  
                  {selectedPack === 'unpacked' && (
                    <div className="mt-4 space-y-3 border-t pt-4">
                                              {allAudioItems
                          .filter(item => !item.pack_id)
                          .map(item => (
                            <div 
                              key={item.id} 
                              className={`flex items-center gap-4 p-3 bg-black rounded-lg cursor-move transition-opacity ${
                                draggedItem?.id === item.id ? 'opacity-50' : ''
                              }`}
                              draggable
                              onDragStart={(e) => handleDragStart(e, item)}
                              onDragEnd={handleDragEnd}
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
                              <h4 className="font-medium">{item.name}</h4>
                              <p className="text-xs text-gray-500 capitalize">{item.type}</p>
                              <div className="flex items-center gap-1 mt-1">
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
                              </div>
                              {item.tags && item.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {item.tags.slice(0, 2).map((tag, index) => (
                                    <Badge key={index} variant="secondary" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                  {item.tags.length > 2 && (
                                    <Badge variant="secondary" className="text-xs">
                                      +{item.tags.length - 2}
                                    </Badge>
                                  )}
                                </div>
                              )}
                              {item.file_url && (
                                <audio 
                                  controls 
                                  src={item.file_url} 
                                  className="h-6 mt-1"
                                  onDragStart={(e) => e.preventDefault()}
                                />
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button variant="outline" size="sm" onClick={() => openEditAudioModal(item)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="outline" size="sm" asChild>
                                <a href={item.file_url} download className="text-xs">Download</a>
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                onClick={() => handleDeleteAudio(item.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </Card>
              )}
            </div>
          )}
        </TabsContent>
        {/* Top Releases Tab (placeholder) */}
        <TabsContent value="top" className="space-y-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Top Releases</h2>
          </div>
          <div className="grid gap-4">
            <div className="text-center py-8 text-gray-500">Top releases analytics coming soon...</div>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Edit Audio Modal */}
      <Dialog open={showEditAudioModal} onOpenChange={setShowEditAudioModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Audio File</DialogTitle>
          </DialogHeader>
          {editingAudio && (
            <form onSubmit={handleEditAudio} className="space-y-4">
              <div>
                <label className="text-sm font-medium">File Name</label>
                <p className="text-sm text-gray-500">{editingAudio.name}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium">BPM</label>
                <Input
                  type="number"
                  placeholder="e.g., 140"
                  value={editAudioForm.bpm}
                  onChange={e => setEditAudioForm({ ...editAudioForm, bpm: e.target.value })}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Key</label>
                <Input
                  placeholder="e.g., C, Am, F#"
                  value={editAudioForm.key}
                  onChange={e => setEditAudioForm({ ...editAudioForm, key: e.target.value })}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Audio Type</label>
                <Input
                  placeholder="e.g., kick, snare, hihat, bass, melody, loop"
                  value={editAudioForm.audio_type}
                  onChange={e => setEditAudioForm({ ...editAudioForm, audio_type: e.target.value })}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Tags</label>
                <Input
                  placeholder="comma-separated, e.g., trap, dark, aggressive, 808"
                  value={editAudioForm.tags}
                  onChange={e => setEditAudioForm({ ...editAudioForm, tags: e.target.value })}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Optional description"
                  value={editAudioForm.description}
                  onChange={e => setEditAudioForm({ ...editAudioForm, description: e.target.value })}
                />
              </div>
              
              {audioEditError && (
                <div className="text-red-500 text-sm">{audioEditError}</div>
              )}
              
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={savingAudio}>
                  {savingAudio ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Drag Dialog */}
      {showDragDialog && dragDialogInfo && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
          <div className="bg-black border-2 border-blue-400 rounded-lg shadow-2xl p-6 max-w-sm mx-4 pointer-events-none animate-pulse">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-900 flex items-center justify-center">
                {dragDialogInfo.folderType === 'pack' && <Package className="h-8 w-8 text-blue-400" />}
                {dragDialogInfo.folderType === 'subfolder' && <Folder className="h-8 w-8 text-blue-400" />}
                {dragDialogInfo.folderType === 'unpacked' && <Folder className="h-8 w-8 text-gray-400" />}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {isDraggingFiles ? 'Upload to:' : 'Move to:'}
              </h3>
              <div className="text-sm text-gray-300">
                {dragDialogInfo.folderType === 'subfolder' && (
                  <div>
                    <span className="font-medium">{dragDialogInfo.packName}</span>
                    <span className="text-gray-500"> / </span>
                    <span className="font-medium">{dragDialogInfo.folderName}</span>
                  </div>
                )}
                {dragDialogInfo.folderType === 'pack' && (
                  <span className="font-medium">{dragDialogInfo.folderName}</span>
                )}
                {dragDialogInfo.folderType === 'unpacked' && (
                  <span className="font-medium text-gray-400">{dragDialogInfo.folderName}</span>
                )}
              </div>
              <div className="mt-3 text-xs text-gray-400">
                {isDraggingFiles ? 'Release to upload files' : 'Release to move file'}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Mass Edit Subfolder Modal */}
      {massEditPack && massEditSubfolder && (
        <MassEditSubfolderModal
          isOpen={showMassEditModal}
          onClose={() => {
            setShowMassEditModal(false)
            setMassEditPack(null)
            setMassEditSubfolder(null)
          }}
          pack={massEditPack}
          subfolder={massEditSubfolder}
          audioItems={allAudioItems}
          onUpdate={refreshAudioData}
        />
      )}
    </div>
  )
} 