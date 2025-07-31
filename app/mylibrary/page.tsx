"use client"

import { useState, useEffect, useRef } from 'react'
import { Plus, Music, Upload, Calendar, Globe, FileText, CheckCircle2, XCircle, AlertCircle, ExternalLink, Info, FileMusic, FileArchive, FileAudio, File, Music2, Piano, Drum, Trash2, Save, Pencil, Folder, Grid, List, Package, Search, Play, Pause, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MassEditSubfolderModal } from '@/components/MassEditSubfolderModal'
import { MassEditSelectedFilesModal } from '@/components/MassEditSelectedFilesModal'

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
  audio_url?: string | null
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
  genre?: string
  subgenre?: string
  additional_subgenres?: string[]
  tags?: string[]
  is_ready?: boolean
  instrument_type?: string
  mood?: string
  energy_level?: number
  complexity?: number
  tempo_category?: string
  key_signature?: string
  time_signature?: string
  duration?: number
  sample_rate?: number
  bit_depth?: number
  license_type?: string
  is_new?: boolean
  distribution_type?: string
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
  
  // Audio playback state
  const [playingSingleId, setPlayingSingleId] = useState<string | null>(null);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
  
  // Edit single state
  const [editingSingle, setEditingSingle] = useState<Single | null>(null);
  const [showEditSingleDialog, setShowEditSingleDialog] = useState(false);
  const [editSingleTitle, setEditSingleTitle] = useState('');
  const [editSingleDescription, setEditSingleDescription] = useState('');
  const [editSingleArtist, setEditSingleArtist] = useState('');
  const [editSingleReleaseDate, setEditSingleReleaseDate] = useState('');
  const [editSingleDuration, setEditSingleDuration] = useState('');
  const [editSingleAudioUrl, setEditSingleAudioUrl] = useState('');
  const [isSavingSingle, setIsSavingSingle] = useState(false);
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
    genre: '',
    subgenre: '',
    additional_subgenres: [] as string[],
    description: '',
    tags: '',
    is_ready: false,
    instrument_type: '',
    mood: '',
    energy_level: '',
    complexity: '',
    tempo_category: '',
    key_signature: '',
    time_signature: '',
    duration: '',
    sample_rate: '',
    bit_depth: '',
    license_type: '',
    is_new: true,
    distribution_type: 'private'
  });
  const [savingAudio, setSavingAudio] = useState(false);
  const [audioEditError, setAudioEditError] = useState<string | null>(null);
  
  // Bulk genre edit modal
  const [showBulkGenreModal, setShowBulkGenreModal] = useState(false);
  const [bulkGenrePack, setBulkGenrePack] = useState<AudioPack | null>(null);
  const [bulkGenreValue, setBulkGenreValue] = useState('');
  const [bulkSubgenreValue, setBulkSubgenreValue] = useState('');
  const [bulkGenreSaving, setBulkGenreSaving] = useState(false);
  const [bulkGenreError, setBulkGenreError] = useState<string | null>(null);
  
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
  
  // Move selected files to subfolder or pack
  const moveSelectedFiles = async (targetSubfolder: string | null, targetPackId: string | null) => {
    if (!user || selectedFiles.size === 0) return;
    
    try {
      console.log(`Moving ${selectedFiles.size} files to pack: ${targetPackId}, subfolder: ${targetSubfolder}`);
      
      // Update all selected files in database
      for (const fileId of selectedFiles) {
        const { error } = await supabase
          .from('audio_library_items')
          .update({ 
            pack_id: targetPackId,
            subfolder: targetSubfolder 
          })
          .eq('id', fileId);
          
        if (error) {
          console.error('Error moving file:', error);
          continue;
        }
      }
      
      // Update local state
      setAudioItems(audioItems.map(item => 
        selectedFiles.has(item.id) 
          ? { 
              ...item, 
              pack_id: targetPackId || undefined,
              subfolder: targetSubfolder || undefined,
              pack: targetPackId ? item.pack : undefined  // Clear pack info if moving to unpacked
            }
          : item
      ));
      
      setAllAudioItems(allAudioItems.map(item => 
        selectedFiles.has(item.id) 
          ? { 
              ...item, 
              pack_id: targetPackId || undefined,
              subfolder: targetSubfolder || undefined,
              pack: targetPackId ? item.pack : undefined  // Clear pack info if moving to unpacked
            }
          : item
      ));
      
      console.log(`Successfully moved ${selectedFiles.size} files`);
      clearSelection();
      
    } catch (error) {
      console.error('Error moving files:', error);
    }
  };

  // Select all files in current pack root
  const selectAllInPackRoot = (packId: string) => {
    const packRootFiles = allAudioItems.filter(item => item.pack_id === packId && !item.subfolder);
    const newSelected = new Set(selectedFiles);
    packRootFiles.forEach(file => newSelected.add(file.id));
    setSelectedFiles(newSelected);
    console.log(`Selected ${packRootFiles.length} files in pack root`);
  };

  // Select all files in a specific subfolder
  const selectAllInSubfolder = (packId: string, subfolderName: string) => {
    const subfolderFiles = allAudioItems.filter(item => 
      item.pack_id === packId && item.subfolder === subfolderName
    );
    const newSelected = new Set(selectedFiles);
    subfolderFiles.forEach(file => newSelected.add(file.id));
    setSelectedFiles(newSelected);
    console.log(`Selected ${subfolderFiles.length} files in subfolder ${subfolderName}`);
  };

  // Select all files across all packs and subfolders
  const selectAllFiles = () => {
    const newSelected = new Set(selectedFiles);
    allAudioItems.forEach(file => newSelected.add(file.id));
    setSelectedFiles(newSelected);
    console.log(`Selected all ${allAudioItems.length} files`);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedFiles(new Set());
    setShowMoveMenu(false);
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

  // Audio playback functions
  const playSingle = (singleId: string, audioUrl: string) => {
    // Stop any currently playing audio
    if (audioRef) {
      audioRef.pause();
      audioRef.currentTime = 0;
    }

    // Create new audio element
    const audio = new Audio(audioUrl);
    audio.addEventListener('ended', () => {
      setPlayingSingleId(null);
      setAudioRef(null);
    });

    audio.play().then(() => {
      setPlayingSingleId(singleId);
      setAudioRef(audio);
    }).catch((error) => {
      console.error('Error playing audio:', error);
      alert('Error playing audio. Please check if the file exists.');
    });
  };

  const stopSingle = () => {
    if (audioRef) {
      audioRef.pause();
      audioRef.currentTime = 0;
      setPlayingSingleId(null);
      setAudioRef(null);
    }
  };

  // Edit single functions
  const openEditSingleDialog = (single: Single) => {
    setEditingSingle(single);
    setEditSingleTitle(single.title);
    setEditSingleDescription(single.description || '');
    setEditSingleArtist(single.artist);
    setEditSingleReleaseDate(single.release_date);
    setEditSingleDuration(single.duration || '');
    setEditSingleAudioUrl(single.audio_url || '');
    setShowEditSingleDialog(true);
  };

  const saveSingle = async () => {
    if (!editingSingle || !editSingleTitle.trim()) return;

    setIsSavingSingle(true);
    try {
      const { error } = await supabase
        .from('singles')
        .update({
          title: editSingleTitle,
          description: editSingleDescription,
          artist: editSingleArtist,
          release_date: editSingleReleaseDate,
          duration: editSingleDuration,
          audio_url: editSingleAudioUrl || null
        })
        .eq('id', editingSingle.id);

      if (error) throw error;

      // Update local state
      setSingles(prev => prev.map(single => 
        single.id === editingSingle.id 
          ? { 
              ...single, 
              title: editSingleTitle,
              description: editSingleDescription,
              artist: editSingleArtist,
              release_date: editSingleReleaseDate,
              duration: editSingleDuration,
              audio_url: editSingleAudioUrl || null
            }
          : single
      ));

      setShowEditSingleDialog(false);
      setEditingSingle(null);
    } catch (error) {
      console.error('Error updating single:', error);
      alert('Failed to update single. Please try again.');
    } finally {
      setIsSavingSingle(false);
    }
  };

  const deleteSingle = async (singleId: string) => {
    if (!confirm('Are you sure you want to delete this single?')) return;

    try {
      const { error } = await supabase
        .from('singles')
        .delete()
        .eq('id', singleId);

      if (error) throw error;

      // Update local state
      setSingles(prev => prev.filter(single => single.id !== singleId));
    } catch (error) {
      console.error('Error deleting single:', error);
      alert('Failed to delete single. Please try again.');
    }
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef) {
        audioRef.pause();
        audioRef.currentTime = 0;
      }
    };
  }, [audioRef]);

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
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(0, itemsPerPage - 1)
      .then(async ({ data, error }) => {
        if (error) setAudioError(error.message);
        setAudioItems(data || []);
        
        // Get total count separately to avoid object issues
        const { count } = await supabase
          .from('audio_library_items')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        
        setTotalItems(typeof count === 'number' ? count : 0);
        setCurrentPage(1);
      });
      
    // Audio Packs - use the new approach that doesn't cause object rendering issues
    setLoadingPacks(true);
    supabase.from('audio_packs')
      .select(`
        *,
        subfolders:audio_subfolders(*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(async ({ data, error }) => {
        if (error) {
          setPackError(error.message);
          setLoadingPacks(false);
          return;
        }
        
        // Get file counts for each pack using the safe approach
        const packsWithCounts = await Promise.all(
          (data || []).map(async (pack) => {
            try {
              const { data: files } = await supabase
                .from('audio_library_items')
                .select('id')
                .eq('user_id', user.id)
                .eq('pack_id', pack.id);
              
              return { ...pack, item_count: files ? files.length : 0 };
            } catch (error) {
              console.error(`Error counting files for pack ${pack.id}:`, error);
              return { ...pack, item_count: 0 };
            }
          })
        );
        
        setAudioPacks(packsWithCounts);
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
    genre: '',
    subgenre: '',
    additional_subgenres: [] as string[],
    tags: '',
    instrument_type: '',
    mood: '',
    energy_level: '',
    complexity: '',
    tempo_category: '',
    key_signature: '',
    time_signature: '',
    duration: '',
    sample_rate: '',
    bit_depth: '',
    license_type: '',
    is_new: true,
    distribution_type: 'private'
  });
  const [audioUploading, setAudioUploading] = useState(false);
  const [audioUploadError, setAudioUploadError] = useState<string | null>(null);
  const [additionalSubgenreInput, setAdditionalSubgenreInput] = useState('');
  
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
  
  // Mass edit selected files modal
  const [showMassEditSelectedModal, setShowMassEditSelectedModal] = useState(false);
  
  // Search functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState<'all' | 'name' | 'type' | 'genre' | 'tags'>('all');

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

  // Add additional subgenre
  const addAdditionalSubgenre = () => {
    if (additionalSubgenreInput.trim() && !newAudio.additional_subgenres.includes(additionalSubgenreInput.trim())) {
      setNewAudio({
        ...newAudio,
        additional_subgenres: [...newAudio.additional_subgenres, additionalSubgenreInput.trim()]
      });
      setAdditionalSubgenreInput('');
    }
  };

  // Remove additional subgenre
  const removeAdditionalSubgenre = (subgenreToRemove: string) => {
    setNewAudio({
      ...newAudio,
      additional_subgenres: newAudio.additional_subgenres.filter(subgenre => subgenre !== subgenreToRemove)
    });
  };

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
      genre: newAudio.genre || null,
      subgenre: newAudio.subgenre || null,
      additional_subgenres: newAudio.additional_subgenres.length > 0 ? newAudio.additional_subgenres : null,
      tags: newAudio.tags ? newAudio.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : null,
      instrument_type: newAudio.instrument_type || null,
      mood: newAudio.mood || null,
      energy_level: newAudio.energy_level ? parseInt(newAudio.energy_level) : null,
      complexity: newAudio.complexity ? parseInt(newAudio.complexity) : null,
      tempo_category: newAudio.tempo_category || null,
      key_signature: newAudio.key_signature || null,
      time_signature: newAudio.time_signature || null,
      duration: newAudio.duration ? parseFloat(newAudio.duration) : null,
      sample_rate: newAudio.sample_rate ? parseInt(newAudio.sample_rate) : null,
      bit_depth: newAudio.bit_depth ? parseInt(newAudio.bit_depth) : null,
      license_type: newAudio.license_type || null,
      is_new: newAudio.is_new,
      distribution_type: newAudio.distribution_type || 'private'
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
      genre: '',
      subgenre: '',
      additional_subgenres: [],
      tags: '',
      instrument_type: '',
      mood: '',
      energy_level: '',
      complexity: '',
      tempo_category: '',
      key_signature: '',
      time_signature: '',
      duration: '',
      sample_rate: '',
      bit_depth: '',
      license_type: '',
      is_new: true,
      distribution_type: 'private'
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
      genre: editAudioForm.genre || null,
      subgenre: editAudioForm.subgenre || null,
      additional_subgenres: editAudioForm.additional_subgenres.length > 0 ? editAudioForm.additional_subgenres : null,
      description: editAudioForm.description || null,
      tags: editAudioForm.tags ? editAudioForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : null,
      is_ready: editAudioForm.is_ready,
      instrument_type: editAudioForm.instrument_type || null,
      mood: editAudioForm.mood || null,
      energy_level: editAudioForm.energy_level ? parseInt(editAudioForm.energy_level) : null,
      complexity: editAudioForm.complexity ? parseInt(editAudioForm.complexity) : null,
      tempo_category: editAudioForm.tempo_category || null,
      key_signature: editAudioForm.key_signature || null,
      time_signature: editAudioForm.time_signature || null,
      duration: editAudioForm.duration ? parseFloat(editAudioForm.duration) : null,
      sample_rate: editAudioForm.sample_rate ? parseInt(editAudioForm.sample_rate) : null,
      bit_depth: editAudioForm.bit_depth ? parseInt(editAudioForm.bit_depth) : null,
      license_type: editAudioForm.license_type || null,
      is_new: editAudioForm.is_new,
      distribution_type: editAudioForm.distribution_type || 'private'
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
      genre: updateData.genre || undefined,
      subgenre: updateData.subgenre || undefined,
      additional_subgenres: updateData.additional_subgenres || undefined,
      description: updateData.description || undefined,
      tags: updateData.tags || undefined,
      is_ready: updateData.is_ready,
      instrument_type: updateData.instrument_type || undefined,
      mood: updateData.mood || undefined,
      energy_level: updateData.energy_level || undefined,
      complexity: updateData.complexity || undefined,
      tempo_category: updateData.tempo_category || undefined,
      key_signature: updateData.key_signature || undefined,
      time_signature: updateData.time_signature || undefined,
      duration: updateData.duration || undefined,
      sample_rate: updateData.sample_rate || undefined,
      bit_depth: updateData.bit_depth || undefined,
      license_type: updateData.license_type || undefined,
      is_new: updateData.is_new,
      distribution_type: updateData.distribution_type || undefined
    };
    setAudioItems(audioItems.map(item => 
      item.id === editingAudio.id ? updatedItem : item
    ));
    setAllAudioItems(allAudioItems.map(item => 
      item.id === editingAudio.id ? updatedItem : item
    ));
    
    setShowEditAudioModal(false);
    setEditingAudio(null);
            setEditAudioForm({ 
      bpm: '', 
      key: '', 
      audio_type: '', 
      genre: '', 
      subgenre: '', 
      additional_subgenres: [], 
      description: '', 
      tags: '', 
      is_ready: false,
      instrument_type: '',
      mood: '',
      energy_level: '',
      complexity: '',
      tempo_category: '',
      key_signature: '',
      time_signature: '',
      duration: '',
      sample_rate: '',
      bit_depth: '',
      license_type: '',
      is_new: true,
      distribution_type: 'private'
    });
    setSavingAudio(false);
  }
  
  // Open edit modal for audio file
  function openEditAudioModal(item: AudioLibraryItem) {
    setEditingAudio(item);
    
    // Extract BPM and Key from filename if they exist and current values are empty
    let extractedBpm = item.bpm?.toString() || '';
    let extractedKey = item.key || '';
    
    // Try to extract BPM and Key from filename
    const filename = item.name;
    
    // Better BPM extraction - prioritize explicit BPM indicators first
    const bpmPatterns = [
      /(\d{2,4}\s*bpm)/i,  // 130bpm, 130 bpm, 130BPM, etc.
      /(bpm\s*\d{2,4})/i,  // bpm130, bpm 130, BPM 130, etc.
    ];
    
    let bpmMatch = null;
    for (const pattern of bpmPatterns) {
      bpmMatch = filename.match(pattern);
      if (bpmMatch) break;
    }
    
    // If no explicit BPM pattern found, try to find the best BPM candidate
    if (!bpmMatch) {
      // Find all numbers between 60-200 that could be BPM
      const allBpmCandidates = [];
      const bpmCandidateRegex = /[_\s]?(6[0-9]|[7-9]\d|1[0-9]\d|200)[_\s]?/g;
      let match;
      
      while ((match = bpmCandidateRegex.exec(filename)) !== null) {
        const [fullMatch] = match;
        const bpmNumber = fullMatch.replace(/[_\s]/g, '');
        const number = parseInt(bpmNumber);
        
        // Check if this number is likely to be BPM by looking at surrounding context
        const beforeMatch = filename.substring(Math.max(0, match.index - 10), match.index);
        const afterMatch = filename.substring(match.index + fullMatch.length, match.index + fullMatch.length + 10);
        
        // Prioritize numbers that are:
        // 1. Standalone (surrounded by spaces/underscores)
        // 2. Not part of other identifiers (like "91V")
        // 3. In positions where BPM typically appears
        
        let priority = 0;
        if (fullMatch.match(/^[_\s]\d+[_\s]$/)) {
          priority = 3; // Highest priority: _70_ or " 70 "
        } else if (fullMatch.match(/^[_\s]\d+$/) || fullMatch.match(/^\d+[_\s]$/)) {
          priority = 2; // High priority: _70 or 70_
        } else if (!beforeMatch.match(/[A-Za-z]$/) && !afterMatch.match(/^[A-Za-z]/)) {
          priority = 1; // Medium priority: not part of word
        } else {
          priority = 0; // Low priority: part of word like "91V"
        }
        
        allBpmCandidates.push({
          text: fullMatch,
          value: number,
          priority
        });
      }
      
      // Sort by priority and take the highest priority match
      if (allBpmCandidates.length > 0) {
        allBpmCandidates.sort((a, b) => b.priority - a.priority);
        bpmMatch = allBpmCandidates[0];
      }
    }
    
    // Better Key extraction - try multiple patterns
    const keyPatterns = [
      /\b([A-G][#b]?m?)\b/g,  // C, C#, Cb, Am, A#m, etc.
      /\b([A-G][#b]?\s*major)\b/gi,  // C major, F# major, etc.
      /\b([A-G][#b]?\s*minor)\b/gi,  // A minor, D# minor, etc.
      /\b([A-G][#b]?maj)\b/gi,  // Emaj, Cmaj, F#maj, etc.
      /\b([A-G][#b]?min)\b/gi,  // Emin, Amin, D#min, etc.
      /\b([A-G][#b]?m)\b/gi,  // Em, Am, C#m, etc.
      /\b([A-G][#b]?M)\b/g,  // EM, AM, C#M, etc.
      /[_\s]([A-G][#b]?)[_\s]/g,  // _A_, _C#_, _Bb_ etc. (keys surrounded by underscores or spaces)
      /[_\s]([A-G][#b]?min)[_\s]/gi,  // _Fmin_, _Amin_, etc. (minor keys with underscores)
      /[_\s]([A-G][#b]?maj)[_\s]/gi,  // _Fmaj_, _Amaj_, etc. (major keys with underscores)
      /[_\s]([A-G][#b]?m)[_\s]/gi,  // _Am_, _Em_, _Cm_ etc. (minor keys with m suffix and underscores)
      /([A-G][#b]?)(?=\.[a-zA-Z0-9]+$)/g,  // A#.wav, C.wav, etc. (keys right before file extension)
      /_([A-G][#b]?)(?=\.[a-zA-Z0-9]+$)/g,  // _A#.wav, _C.wav, etc. (keys with underscore before file extension)
    ];
    
    let keyMatch = null;
    for (const pattern of keyPatterns) {
      const match = filename.match(pattern);
      if (match) {
        keyMatch = match;
        break;
      }
    }
    
    if (!extractedBpm && bpmMatch) {
      if ('text' in bpmMatch) {
        extractedBpm = bpmMatch.text.replace(/\D/g, '');
      } else {
        extractedBpm = bpmMatch[0].replace(/\D/g, '');
      }
    }
    
    if (!extractedKey && keyMatch) {
      // For patterns with capture groups, use the captured group
      // For patterns without capture groups, use the full match
      extractedKey = keyMatch[1] || keyMatch[0].replace(/\s*(major|minor)/i, '').replace(/\s+/g, '');
    }
    
    setEditAudioForm({
      bpm: extractedBpm,
      key: extractedKey,
      audio_type: item.audio_type || '',
      genre: item.genre || '',
      subgenre: item.subgenre || '',
      additional_subgenres: item.additional_subgenres || [],
      description: item.description || '',
      tags: item.tags ? item.tags.join(', ') : '',
      is_ready: item.is_ready || false,
      instrument_type: item.instrument_type || '',
      mood: item.mood || '',
      energy_level: item.energy_level?.toString() || '',
      complexity: item.complexity?.toString() || '',
      tempo_category: item.tempo_category || '',
      key_signature: item.key_signature || '',
      time_signature: item.time_signature || '',
      duration: item.duration?.toString() || '',
      sample_rate: item.sample_rate?.toString() || '',
      bit_depth: item.bit_depth?.toString() || '',
      license_type: item.license_type || '',
      is_new: item.is_new || false,
      distribution_type: item.distribution_type || 'private'
    });
    setShowEditAudioModal(true);
  }
  
  // Open bulk genre edit modal for pack
  function openBulkGenreModal(pack: AudioPack) {
    setBulkGenrePack(pack);
    setBulkGenreValue('');
    setBulkSubgenreValue('');
    setBulkGenreError(null);
    setShowBulkGenreModal(true);
  }
  
  // Handle bulk genre edit
  async function handleBulkGenreEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !bulkGenrePack || !bulkGenreValue.trim()) return;
    
    setBulkGenreSaving(true);
    setBulkGenreError(null);
    
    try {
      // Get all audio items in this pack
      const packItems = allAudioItems.filter(item => item.pack_id === bulkGenrePack.id);
      
      if (packItems.length === 0) {
        setBulkGenreError('No audio files found in this pack');
        setBulkGenreSaving(false);
        return;
      }
      
      // Prepare update data
      const updateData: any = { genre: bulkGenreValue.trim() };
      if (bulkSubgenreValue.trim()) {
        updateData.subgenre = bulkSubgenreValue.trim();
      }
      
      // Update all items in the pack with the new genre and subgenre
      const { error } = await supabase
        .from('audio_library_items')
        .update(updateData)
        .eq('pack_id', bulkGenrePack.id);
      
      if (error) {
        setBulkGenreError(error.message);
        setBulkGenreSaving(false);
        return;
      }
      
      // Update local state
      const updatedItems = allAudioItems.map(item => 
        item.pack_id === bulkGenrePack.id 
          ? { 
              ...item, 
              genre: bulkGenreValue.trim(),
              subgenre: bulkSubgenreValue.trim() || undefined
            }
          : item
      );
      
      setAllAudioItems(updatedItems);
      setAudioItems(audioItems.map(item => 
        item.pack_id === bulkGenrePack.id 
          ? { 
              ...item, 
              genre: bulkGenreValue.trim(),
              subgenre: bulkSubgenreValue.trim() || undefined
            }
          : item
      ));
      
      setShowBulkGenreModal(false);
      setBulkGenrePack(null);
      setBulkGenreValue('');
      setBulkSubgenreValue('');
      setBulkGenreSaving(false);
      
      const subgenreText = bulkSubgenreValue.trim() ? ` and subgenre "${bulkSubgenreValue.trim()}"` : '';
      console.log(`Updated genre for ${packItems.length} files in pack "${bulkGenrePack.name}" to "${bulkGenreValue.trim()}"${subgenreText}`);
    } catch (error) {
      console.error('Error updating bulk genre:', error);
      setBulkGenreError('Failed to update genre');
      setBulkGenreSaving(false);
    }
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
    const { data: audioData, error: audioError } = await supabase
      .from('audio_library_items')
      .select(`
        *,
        pack:audio_packs(id, name, color)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(0, itemsPerPage - 1);
    
    if (audioError) setAudioError(audioError.message);
    setAudioItems(audioData || []);
    
    // Get total count separately to avoid object issues
    const { count } = await supabase
      .from('audio_library_items')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    
    setTotalItems(typeof count === 'number' ? count : 0);
    setCurrentPage(1);
    setLoadingAudio(false);
      
    // Refresh Audio Packs
    setLoadingPacks(true);
    
    // First, get all packs
    const { data: packsData, error: packsError } = await supabase
      .from('audio_packs')
      .select(`
        *,
        subfolders:audio_subfolders(*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (packsError) {
      setPackError(packsError.message);
      setLoadingPacks(false);
      return;
    }

    // Then, get the file count for each pack using a simpler approach
    const packsWithCounts = await Promise.all(
      (packsData || []).map(async (pack) => {
        try {
          // Use a simpler count query
          const { data: files, error: countError } = await supabase
            .from('audio_library_items')
            .select('id')
            .eq('user_id', user.id)
            .eq('pack_id', pack.id)

          if (countError) {
            console.error(`Error counting files for pack ${pack.id}:`, countError)
            return { ...pack, item_count: 0 }
          }

          const fileCount = files ? files.length : 0
          console.log(`Pack ${pack.name}: ${fileCount} files`)
          
          return { ...pack, item_count: fileCount }
        } catch (error) {
          console.error(`Error processing pack ${pack.id}:`, error)
          return { ...pack, item_count: 0 }
        }
      })
    )

    console.log('Fetched audio packs with counts:', packsWithCounts.length, 'packs')
    packsWithCounts.forEach(p => {
      console.log(`Pack: ${p.name}, Count: ${p.item_count}, Type: ${typeof p.item_count}`)
    }    )
    
    // Debug the final packs data
    console.log('Final packsWithCounts:', packsWithCounts.map(p => ({
      name: p.name,
      item_count: p.item_count,
      item_count_type: typeof p.item_count
    })));
    
    setAudioPacks(packsWithCounts);
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

  function openMassEditSelectedModal() {
    if (selectedFiles.size === 0) {
      alert('Please select files to edit')
      return
    }
    setShowMassEditSelectedModal(true)
  }

  // This function is now defined above with better functionality

  function selectAllSearchResults() {
    if (!searchQuery.trim()) return;
    
    console.log('[DEBUG] Select All Search Results called');
    console.log('[DEBUG] Search query:', searchQuery);
    console.log('[DEBUG] Search filter:', searchFilter);
    
    const searchResults = getFilteredAudioItems(allAudioItems);
    console.log('[DEBUG] Total search results found:', searchResults?.length || 0);
    
    const newSelected = new Set(selectedFiles);
    searchResults?.forEach(file => newSelected.add(file.id));
    console.log('[DEBUG] New selection size:', newSelected.size);
    
    setSelectedFiles(newSelected);
    
    // Show a confirmation message
    alert(`Selected ${searchResults?.length || 0} files matching "${searchQuery}" across all packs and subfolders.`);
  }

  function selectVisibleSearchResults(packId?: string, subfolderName?: string) {
    if (!searchQuery.trim()) return;
    
    console.log('[DEBUG] Select Visible Search Results called');
    console.log('[DEBUG] Pack ID:', packId);
    console.log('[DEBUG] Subfolder:', subfolderName);
    
    // Filter files based on current context
    let contextFiles = allAudioItems;
    if (packId && subfolderName) {
      // In a subfolder
      contextFiles = allAudioItems.filter(item => item.pack_id === packId && item.subfolder === subfolderName);
    } else if (packId) {
      // In pack root
      contextFiles = allAudioItems.filter(item => item.pack_id === packId && !item.subfolder);
    }
    
    const searchResults = getFilteredAudioItems(contextFiles);
    console.log('[DEBUG] Visible search results found:', searchResults?.length || 0);
    
    const newSelected = new Set(selectedFiles);
    searchResults?.forEach(file => newSelected.add(file.id));
    console.log('[DEBUG] New selection size:', newSelected.size);
    
    setSelectedFiles(newSelected);
    
    // Show a confirmation message
    const context = subfolderName ? `in ${subfolderName}` : packId ? 'in pack root' : 'across all packs';
    alert(`Selected ${searchResults?.length || 0} files matching "${searchQuery}" ${context}.`);
  }

  // Filter audio items based on search query
  const getFilteredAudioItems = (items: AudioLibraryItem[]) => {
    if (!searchQuery.trim()) return items;
    
    const query = searchQuery.toLowerCase().trim();
    console.log('[DEBUG] Filtering items with query:', query, 'filter:', searchFilter);
    
    const filtered = items.filter(item => {
      switch (searchFilter) {
        case 'name':
          return item.name.toLowerCase().includes(query);
        case 'type':
          return item.type.toLowerCase().includes(query) || 
                 (item.audio_type && item.audio_type.toLowerCase().includes(query));
        case 'genre':
          return (item.genre && item.genre.toLowerCase().includes(query)) ||
                 (item.subgenre && item.subgenre.toLowerCase().includes(query));
        case 'tags':
          return item.tags && item.tags.some(tag => tag.toLowerCase().includes(query));
        case 'all':
        default:
          return (
            item.name.toLowerCase().includes(query) ||
            item.type.toLowerCase().includes(query) ||
            (item.audio_type && item.audio_type.toLowerCase().includes(query)) ||
            (item.genre && item.genre.toLowerCase().includes(query)) ||
            (item.subgenre && item.subgenre.toLowerCase().includes(query)) ||
            (item.tags && item.tags.some(tag => tag.toLowerCase().includes(query))) ||
            (item.bpm && item.bpm.toString().includes(query)) ||
            (item.key && item.key.toLowerCase().includes(query))
          );
      }
    });
    
    console.log('[DEBUG] Filtered results:', filtered.length);
    return filtered;
  };
  
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
              placeholder="Genre (e.g., trap, hip-hop, house, techno, dubstep, pop, rock)"
              value={newAudio.genre}
              onChange={e => setNewAudio({ ...newAudio, genre: e.target.value })}
            />
            <Input
              placeholder="Subgenre (e.g., drill, boom bap, deep house, acid techno, melodic dubstep)"
              value={newAudio.subgenre}
              onChange={e => setNewAudio({ ...newAudio, subgenre: e.target.value })}
            />
            
            {/* Additional Subgenres */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Additional Subgenres</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add another subgenre..."
                  value={additionalSubgenreInput}
                  onChange={e => setAdditionalSubgenreInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addAdditionalSubgenre();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addAdditionalSubgenre}
                  disabled={!additionalSubgenreInput.trim()}
                  className="px-3"
                >
                  Add
                </Button>
              </div>
              {newAudio.additional_subgenres.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {newAudio.additional_subgenres.map((subgenre, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="bg-blue-100 text-blue-800 hover:bg-blue-200"
                    >
                      {subgenre}
                      <button
                        type="button"
                        onClick={() => removeAdditionalSubgenre(subgenre)}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            
            <Input
              placeholder="Tags (comma-separated, e.g., trap, dark, aggressive, 808)"
              value={newAudio.tags}
              onChange={e => setNewAudio({ ...newAudio, tags: e.target.value })}
            />
            
            {/* New Metadata Fields */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="Instrument Type (e.g., piano, guitar, synthesizer, drum machine)"
                value={newAudio.instrument_type}
                onChange={e => setNewAudio({ ...newAudio, instrument_type: e.target.value })}
              />
              <Input
                placeholder="Mood (e.g., dark, uplifting, melancholic, aggressive, chill)"
                value={newAudio.mood}
                onChange={e => setNewAudio({ ...newAudio, mood: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="number"
                min="1"
                max="10"
                placeholder="Energy Level (1-10)"
                value={newAudio.energy_level}
                onChange={e => setNewAudio({ ...newAudio, energy_level: e.target.value })}
              />
              <Input
                type="number"
                min="1"
                max="10"
                placeholder="Complexity (1-10)"
                value={newAudio.complexity}
                onChange={e => setNewAudio({ ...newAudio, complexity: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="Tempo Category (e.g., slow, medium, fast, very fast)"
                value={newAudio.tempo_category}
                onChange={e => setNewAudio({ ...newAudio, tempo_category: e.target.value })}
              />
              <Input
                placeholder="Key Signature (e.g., C major, A minor, F# minor)"
                value={newAudio.key_signature}
                onChange={e => setNewAudio({ ...newAudio, key_signature: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="Time Signature (e.g., 4/4, 3/4, 6/8)"
                value={newAudio.time_signature}
                onChange={e => setNewAudio({ ...newAudio, time_signature: e.target.value })}
              />
              <Input
                type="number"
                step="0.01"
                placeholder="Duration (seconds)"
                value={newAudio.duration}
                onChange={e => setNewAudio({ ...newAudio, duration: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="number"
                placeholder="Sample Rate (e.g., 44100, 48000)"
                value={newAudio.sample_rate}
                onChange={e => setNewAudio({ ...newAudio, sample_rate: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Bit Depth (e.g., 16, 24)"
                value={newAudio.bit_depth}
                onChange={e => setNewAudio({ ...newAudio, bit_depth: e.target.value })}
              />
            </div>
            
            <Input
              placeholder="License Type (e.g., royalty-free, commercial, personal use only)"
              value={newAudio.license_type}
              onChange={e => setNewAudio({ ...newAudio, license_type: e.target.value })}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_new"
                  checked={newAudio.is_new}
                  onChange={e => setNewAudio({ ...newAudio, is_new: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="is_new" className="text-sm font-medium">
                  Mark as New
                </label>
              </div>
              <div>
                <label className="text-sm font-medium">Distribution Type</label>
                <select
                  value={newAudio.distribution_type}
                  onChange={e => setNewAudio({ ...newAudio, distribution_type: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md bg-background text-foreground"
                >
                  <option value="private">Private</option>
                  <option value="public">Public</option>
                  <option value="commercial">Commercial</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            
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
                {/* Cover Art - Show placeholder if no cover art */}
                <div className="w-24 h-24 rounded-lg bg-gray-800 flex items-center justify-center overflow-hidden">
                  {single.cover_art_url ? (
                    <img src={single.cover_art_url} alt={single.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center text-gray-400">
                      <Music className="w-8 h-8 mx-auto mb-1" />
                      <div className="text-xs font-medium">{single.title}</div>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-semibold">{single.title}</h2>
                      <p className="text-gray-500">{single.artist}</p>
                    </div>
                    <div className="flex gap-2">
                      {/* Play Button */}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          if (single.audio_url) {
                            if (playingSingleId === single.id) {
                              stopSingle();
                            } else {
                              playSingle(single.id, single.audio_url);
                            }
                          }
                        }}
                        disabled={!single.audio_url}
                        className={`${
                          single.audio_url 
                            ? 'bg-green-600 hover:bg-green-700 text-white border-green-500' 
                            : 'bg-gray-600 text-gray-400 border-gray-500 cursor-not-allowed'
                        }`}
                        title={single.audio_url ? 'Play audio' : 'No audio file available'}
                      >
                        {playingSingleId === single.id ? (
                          <>
                            <Pause className="h-4 w-4 mr-2" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Play
                          </>
                        )}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openEditSingleDialog(single)}><FileText className="h-4 w-4 mr-2" />Edit</Button>
                      <Button variant="destructive" size="sm" onClick={() => deleteSingle(single.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</Button>
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
            
            {/* Global Selection Controls */}
            {viewMode === 'packs' && allAudioItems.length > 0 && (
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
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold">{item.name}</h3>
                    <Badge 
                      variant={item.is_ready ? "default" : "secondary"}
                      className={`text-xs ${item.is_ready ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-500 hover:bg-gray-600'}`}
                    >
                      {item.is_ready ? 'Ready' : 'Not Ready'}
                    </Badge>
                  </div>
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
                            {pack.item_count || 0} items
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
                          onClick={() => openBulkGenreModal(pack)}
                          className="bg-purple-500 hover:bg-purple-600 text-white border-purple-500"
                        >
                          <Music className="h-4 w-4 mr-1" />
                          Set Genre
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
                                      <Select value={searchFilter} onValueChange={(value: any) => setSearchFilter(value)}>
                                        <SelectTrigger className="w-24 bg-white border-gray-300 text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="all">All</SelectItem>
                                          <SelectItem value="name">Name</SelectItem>
                                          <SelectItem value="type">Type</SelectItem>
                                          <SelectItem value="genre">Genre</SelectItem>
                                          <SelectItem value="tags">Tags</SelectItem>
                                        </SelectContent>
                                      </Select>
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
                                        Found {getFilteredAudioItems(allAudioItems.filter(item => item.pack_id === pack.id && item.subfolder === subfolder.name)).length} files matching "{searchQuery}"
                                      </div>
                                    )}
                                    
                                    {/* Subfolder Selection Controls */}
                                    {getFilteredAudioItems(allAudioItems.filter(item => item.pack_id === pack.id && item.subfolder === subfolder.name)).length > 0 && (
                                      <div className="flex items-center gap-2 ml-4 mb-2">
                                                                            {selectedFiles.size > 0 && (
                                      <>
                                        <span className="text-xs text-yellow-600">
                                          {selectedFiles.size} selected
                                        </span>
                                        <div className="flex gap-1">
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
                                            {pack.subfolders?.filter(sf => sf.name !== subfolder.name).map(sf => (
                                              <option key={sf.id} value={sf.name}>
                                                {sf.name}
                                              </option>
                                            ))}
                                          </select>
                                          <select
                                            className="text-xs p-1 rounded border bg-blue-100 text-black"
                                            value=""
                                            onChange={(e) => {
                                              if (e.target.value) {
                                                const [targetPackId, targetSubfolder] = e.target.value.split('|');
                                                moveSelectedFiles(targetSubfolder || null, targetPackId);
                                              }
                                            }}
                                          >
                                            <option value="">Move to pack...</option>
                                            <option value={`${pack.id}|`}>📦 {pack.name} (root)</option>
                                            {audioPacks.filter(p => p.id !== pack.id).map(targetPack => (
                                              <option key={targetPack.id} value={`${targetPack.id}|`}>
                                                📦 {targetPack.name} (root)
                                              </option>
                                            ))}
                                            {audioPacks.filter(p => p.id !== pack.id).map(targetPack => 
                                              targetPack.subfolders?.map(sf => (
                                                <option key={`${targetPack.id}-${sf.name}`} value={`${targetPack.id}|${sf.name}`}>
                                                  📦 {targetPack.name} / 📁 {sf.name}
                                                </option>
                                              ))
                                            ).flat()}
                                            <option value="|">📁 Unpacked Files</option>
                                          </select>
                                        </div>
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
                                            const subfolderFiles = getFilteredAudioItems(allAudioItems.filter(item => 
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
                                                                          {getFilteredAudioItems(allAudioItems.filter(item => item.pack_id === pack.id && item.subfolder === subfolder.name))
                                        .map(item => (
                                          <div 
                                            key={`${pack.id}-${subfolder.name}-${item.id}`} 
                                            className={`flex items-center gap-4 p-2 bg-black rounded-lg ml-4 cursor-move transition-opacity ${
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
                                            <div className="flex items-center gap-2 mb-1">
                                              <h5 className="text-sm font-medium">{item.name}</h5>
                                              <Badge 
                                                variant={item.is_ready ? "default" : "secondary"}
                                                className={`text-xs ${item.is_ready ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-500 hover:bg-gray-600'}`}
                                              >
                                                {item.is_ready ? 'Ready' : 'Not Ready'}
                                              </Badge>
                                            </div>
                                            <p className="text-xs text-gray-500 capitalize">{item.type}</p>
                                            <div className="flex items-center gap-1 mt-1">
                                              {item.bpm && (
                                                <Badge key={`bpm-${item.id}`} variant="secondary" className="text-xs">
                                                  {item.bpm} BPM
                                                </Badge>
                                              )}
                                              {item.key && (
                                                <Badge key={`key-${item.id}`} variant="secondary" className="text-xs">
                                                  {item.key}
                                                </Badge>
                                              )}
                                              {item.audio_type && (
                                                <Badge key={`audio-type-${item.id}`} variant="outline" className="text-xs">
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
                                    {getFilteredAudioItems(allAudioItems.filter(item => item.pack_id === pack.id && item.subfolder === subfolder.name)).length === 0 && (
                                      <p className="text-center text-gray-400 py-2 text-sm ml-4">
                                        {searchQuery ? 'No files match your search.' : 'No files in this folder yet.'}
                                      </p>
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
                            
                            {/* Pack Root Search Bar */}
                            {getFilteredAudioItems(allAudioItems.filter(item => item.pack_id === pack.id && !item.subfolder)).length > 0 && (
                              <div className="flex items-center gap-2">
                                <div className="relative w-48">
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
                            )}
                            
                            {/* Selection Controls */}
                            {getFilteredAudioItems(allAudioItems.filter(item => item.pack_id === pack.id && !item.subfolder)).length > 0 && (
                              <div className="flex items-center gap-2">
                                {selectedFiles.size > 0 && (
                                  <>
                                    <span className="text-xs text-yellow-600">
                                      {selectedFiles.size} selected
                                    </span>
                                    <div className="flex gap-1">
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
                                      <select
                                        className="text-xs p-1 rounded border bg-blue-100 text-black"
                                        value=""
                                        onChange={(e) => {
                                          if (e.target.value) {
                                            const [targetPackId, targetSubfolder] = e.target.value.split('|');
                                            moveSelectedFiles(targetSubfolder || null, targetPackId);
                                          }
                                        }}
                                      >
                                        <option value="">Move to pack...</option>
                                        {audioPacks.filter(p => p.id !== pack.id).map(targetPack => (
                                          <option key={targetPack.id} value={`${targetPack.id}|`}>
                                            📦 {targetPack.name} (root)
                                          </option>
                                        ))}
                                        {audioPacks.filter(p => p.id !== pack.id).map(targetPack => 
                                          targetPack.subfolders?.map(subfolder => (
                                            <option key={`${targetPack.id}-${subfolder.name}`} value={`${targetPack.id}|${subfolder.name}`}>
                                              📦 {targetPack.name} / 📁 {subfolder.name}
                                            </option>
                                          ))
                                        ).flat()}
                                        <option value="|">📁 Unpacked Files</option>
                                      </select>
                                    </div>
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
                                  onClick={() => selectAllInPackRoot(pack.id)}
                                  className="text-xs h-6"
                                >
                                  Select All
                                </Button>
                              </div>
                            )}
                          </div>
                          
                          {/* Pack Root Search Results */}
                          {searchQuery && (
                            <div className="text-xs text-gray-600 mb-2">
                              Found {getFilteredAudioItems(allAudioItems.filter(item => item.pack_id === pack.id && !item.subfolder)).length} root files matching "{searchQuery}"
                            </div>
                          )}
                          
                          {getFilteredAudioItems(allAudioItems.filter(item => item.pack_id === pack.id && !item.subfolder))
                            .map(item => (
                              <div 
                                key={`${pack.id}-root-${item.id}`} 
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
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-medium">{item.name}</h4>
                                    <Badge 
                                      variant={item.is_ready ? "default" : "secondary"}
                                      className={`text-xs ${item.is_ready ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-500 hover:bg-gray-600'}`}
                                    >
                                      {item.is_ready ? 'Ready' : 'Not Ready'}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-gray-500 capitalize">{item.type}</p>
                                  <div className="flex items-center gap-1 mt-1">
                                    {item.bpm && (
                                      <Badge key={`bpm-${item.id}`} variant="secondary" className="text-xs">
                                        {item.bpm} BPM
                                      </Badge>
                                    )}
                                    {item.key && (
                                      <Badge key={`key-${item.id}`} variant="secondary" className="text-xs">
                                        {item.key}
                                      </Badge>
                                    )}
                                    {item.audio_type && (
                                      <Badge key={`audio-type-${item.id}`} variant="outline" className="text-xs">
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
                          {getFilteredAudioItems(allAudioItems.filter(item => item.pack_id === pack.id && !item.subfolder)).length === 0 && (
                            <p className="text-center text-gray-500 py-2 text-sm">
                              {searchQuery ? 'No root files match your search.' : 'No root files.'}
                            </p>
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
                      {/* Unpacked Files Selection Controls */}
                      {getFilteredAudioItems(allAudioItems.filter(item => !item.pack_id)).length > 0 && (
                        <div className="flex items-center gap-2 mb-3">
                          {selectedFiles.size > 0 && (
                            <>
                              <span className="text-xs text-yellow-600">
                                {selectedFiles.size} selected
                              </span>
                              <select
                                className="text-xs p-1 rounded border bg-blue-100 text-black"
                                value=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    const [targetPackId, targetSubfolder] = e.target.value.split('|');
                                    moveSelectedFiles(targetSubfolder || null, targetPackId);
                                  }
                                }}
                              >
                                <option value="">Move to pack...</option>
                                {audioPacks.map(targetPack => (
                                  <option key={targetPack.id} value={`${targetPack.id}|`}>
                                    📦 {targetPack.name} (root)
                                  </option>
                                ))}
                                {audioPacks.map(targetPack => 
                                  targetPack.subfolders?.map(subfolder => (
                                    <option key={`${targetPack.id}-${subfolder.name}`} value={`${targetPack.id}|${subfolder.name}`}>
                                      📦 {targetPack.name} / 📁 {subfolder.name}
                                    </option>
                                  ))
                                ).flat()}
                              </select>
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
                              const unpackedFiles = getFilteredAudioItems(allAudioItems.filter(item => !item.pack_id));
                              const newSelected = new Set(selectedFiles);
                              unpackedFiles.forEach(file => newSelected.add(file.id));
                              setSelectedFiles(newSelected);
                            }}
                            className="text-xs h-6"
                          >
                            Select All
                          </Button>
                        </div>
                      )}
                      
                      {getFilteredAudioItems(allAudioItems.filter(item => !item.pack_id))
                        .map(item => (
                            <div 
                              key={item.id} 
                              className={`flex items-center gap-4 p-3 bg-black rounded-lg cursor-move transition-opacity ${
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
                                {item.genre && (
                                  <Badge key={`genre-${item.id}`} variant="secondary" className="text-xs bg-purple-100 text-purple-800">
                                    {item.genre}
                                  </Badge>
                                )}
                                {item.subgenre && (
                                  <Badge key={`subgenre-${item.id}`} variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                                    {item.subgenre}
                                  </Badge>
                                )}
                                {item.additional_subgenres && item.additional_subgenres.length > 0 && (
                                  <>
                                    {item.additional_subgenres.map((subgenre, index) => (
                                      <Badge key={`additional-subgenre-${item.id}-${index}`} variant="secondary" className="text-xs bg-green-100 text-green-800">
                                        {subgenre}
                                      </Badge>
                                    ))}
                                  </>
                                )}
                                {item.is_new && (
                                  <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                                    New
                                  </Badge>
                                )}
                                {item.distribution_type && (
                                  <Badge variant="secondary" className={`text-xs ${
                                    item.distribution_type === 'public' ? 'bg-green-100 text-green-800' :
                                    item.distribution_type === 'commercial' ? 'bg-purple-100 text-purple-800' :
                                    item.distribution_type === 'other' ? 'bg-gray-100 text-gray-800' :
                                    'bg-blue-100 text-blue-800'
                                  }`}>
                                    {item.distribution_type}
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
                <label className="text-sm font-medium">Genre</label>
                <Input
                  placeholder="e.g., trap, hip-hop, house, techno, dubstep, pop, rock"
                  value={editAudioForm.genre}
                  onChange={e => setEditAudioForm({ ...editAudioForm, genre: e.target.value })}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Subgenre</label>
                <Input
                  placeholder="e.g., drill, boom bap, deep house, acid techno, melodic dubstep"
                  value={editAudioForm.subgenre}
                  onChange={e => setEditAudioForm({ ...editAudioForm, subgenre: e.target.value })}
                />
              </div>
              
              {/* Additional Subgenres */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Additional Subgenres</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add another subgenre..."
                    value={additionalSubgenreInput}
                    onChange={e => setAdditionalSubgenreInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (additionalSubgenreInput.trim() && !editAudioForm.additional_subgenres.includes(additionalSubgenreInput.trim())) {
                          setEditAudioForm({
                            ...editAudioForm,
                            additional_subgenres: [...editAudioForm.additional_subgenres, additionalSubgenreInput.trim()]
                          });
                          setAdditionalSubgenreInput('');
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (additionalSubgenreInput.trim() && !editAudioForm.additional_subgenres.includes(additionalSubgenreInput.trim())) {
                        setEditAudioForm({
                          ...editAudioForm,
                          additional_subgenres: [...editAudioForm.additional_subgenres, additionalSubgenreInput.trim()]
                        });
                        setAdditionalSubgenreInput('');
                      }
                    }}
                    disabled={!additionalSubgenreInput.trim()}
                    className="px-3"
                  >
                    Add
                  </Button>
                </div>
                {editAudioForm.additional_subgenres.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {editAudioForm.additional_subgenres.map((subgenre, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="bg-blue-100 text-blue-800 hover:bg-blue-200"
                      >
                        {subgenre}
                        <button
                          type="button"
                          onClick={() => {
                            setEditAudioForm({
                              ...editAudioForm,
                              additional_subgenres: editAudioForm.additional_subgenres.filter(s => s !== subgenre)
                            });
                          }}
                          className="ml-1 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              
              <div>
                <label className="text-sm font-medium">Tags</label>
                <Input
                  placeholder="comma-separated, e.g., trap, dark, aggressive, 808"
                  value={editAudioForm.tags}
                  onChange={e => setEditAudioForm({ ...editAudioForm, tags: e.target.value })}
                />
              </div>
              
              {/* New Metadata Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Instrument Type</label>
                  <Input
                    placeholder="e.g., piano, guitar, synthesizer, drum machine"
                    value={editAudioForm.instrument_type}
                    onChange={e => setEditAudioForm({ ...editAudioForm, instrument_type: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Mood</label>
                  <Input
                    placeholder="e.g., dark, uplifting, melancholic, aggressive, chill"
                    value={editAudioForm.mood}
                    onChange={e => setEditAudioForm({ ...editAudioForm, mood: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Energy Level (1-10)</label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    placeholder="1-10"
                    value={editAudioForm.energy_level}
                    onChange={e => setEditAudioForm({ ...editAudioForm, energy_level: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Complexity (1-10)</label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    placeholder="1-10"
                    value={editAudioForm.complexity}
                    onChange={e => setEditAudioForm({ ...editAudioForm, complexity: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Tempo Category</label>
                  <Input
                    placeholder="e.g., slow, medium, fast, very fast"
                    value={editAudioForm.tempo_category}
                    onChange={e => setEditAudioForm({ ...editAudioForm, tempo_category: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Key Signature</label>
                  <Input
                    placeholder="e.g., C major, A minor, F# minor"
                    value={editAudioForm.key_signature}
                    onChange={e => setEditAudioForm({ ...editAudioForm, key_signature: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Time Signature</label>
                  <Input
                    placeholder="e.g., 4/4, 3/4, 6/8"
                    value={editAudioForm.time_signature}
                    onChange={e => setEditAudioForm({ ...editAudioForm, time_signature: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Duration (seconds)</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 3.45"
                    value={editAudioForm.duration}
                    onChange={e => setEditAudioForm({ ...editAudioForm, duration: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Sample Rate</label>
                  <Input
                    type="number"
                    placeholder="e.g., 44100, 48000"
                    value={editAudioForm.sample_rate}
                    onChange={e => setEditAudioForm({ ...editAudioForm, sample_rate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Bit Depth</label>
                  <Input
                    type="number"
                    placeholder="e.g., 16, 24"
                    value={editAudioForm.bit_depth}
                    onChange={e => setEditAudioForm({ ...editAudioForm, bit_depth: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">License Type</label>
                <Input
                  placeholder="e.g., royalty-free, commercial, personal use only"
                  value={editAudioForm.license_type}
                  onChange={e => setEditAudioForm({ ...editAudioForm, license_type: e.target.value })}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_new"
                    checked={editAudioForm.is_new}
                    onChange={e => setEditAudioForm({ ...editAudioForm, is_new: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="is_new" className="text-sm font-medium">
                    Mark as New
                  </label>
                </div>
                <div>
                  <label className="text-sm font-medium">Distribution Type</label>
                  <select
                    value={editAudioForm.distribution_type}
                    onChange={e => setEditAudioForm({ ...editAudioForm, distribution_type: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md bg-background text-foreground"
                  >
                    <option value="private">Private</option>
                    <option value="public">Public</option>
                    <option value="commercial">Commercial</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_ready"
                  checked={editAudioForm.is_ready}
                  onChange={e => setEditAudioForm({ ...editAudioForm, is_ready: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="is_ready" className="text-sm font-medium">
                  Mark as Ready
                </label>
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
      
      {/* Bulk Genre Edit Modal */}
      <Dialog open={showBulkGenreModal} onOpenChange={setShowBulkGenreModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Genre & Subgenre for Pack: {bulkGenrePack?.name}</DialogTitle>
          </DialogHeader>
          {bulkGenrePack && (
            <form onSubmit={handleBulkGenreEdit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Genre *</label>
                <Input
                  placeholder="e.g., trap, hip-hop, house, techno, dubstep, pop, rock"
                  value={bulkGenreValue}
                  onChange={e => setBulkGenreValue(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Subgenre (Optional)</label>
                <Input
                  placeholder="e.g., drill, boom bap, deep house, acid techno, melodic dubstep"
                  value={bulkSubgenreValue}
                  onChange={e => setBulkSubgenreValue(e.target.value)}
                />
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">
                  This will set the genre{bulkSubgenreValue.trim() ? ' and subgenre' : ''} for <strong>{allAudioItems.filter(item => item.pack_id === bulkGenrePack.id).length} audio files</strong> in the "{bulkGenrePack.name}" pack.
                </p>
              </div>
              
              {bulkGenreError && (
                <div className="text-red-500 text-sm">{bulkGenreError}</div>
              )}
              
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button 
                  type="submit" 
                  disabled={bulkGenreSaving || !bulkGenreValue.trim()}
                  className="bg-purple-500 hover:bg-purple-600 text-white"
                >
                  {bulkGenreSaving ? 'Setting Genre...' : 'Set Genre & Subgenre'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      
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

      {/* Mass Edit Selected Files Modal */}
      <MassEditSelectedFilesModal
        isOpen={showMassEditSelectedModal}
        onClose={() => setShowMassEditSelectedModal(false)}
        selectedFiles={allAudioItems.filter(item => selectedFiles.has(item.id))}
        onUpdate={refreshAudioData}
      />

      {/* Edit Single Dialog */}
      <Dialog open={showEditSingleDialog} onOpenChange={setShowEditSingleDialog}>
        <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              Edit Single
            </DialogTitle>
            <DialogDescription className="text-gray-400 mt-2">
              Update the details of your single
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="editTitle" className="text-white">Title</Label>
              <Input
                id="editTitle"
                value={editSingleTitle}
                onChange={(e) => setEditSingleTitle(e.target.value)}
                placeholder="Enter single title"
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            
            <div>
              <Label htmlFor="editArtist" className="text-white">Artist</Label>
              <Input
                id="editArtist"
                value={editSingleArtist}
                onChange={(e) => setEditSingleArtist(e.target.value)}
                placeholder="Enter artist name"
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            
            <div>
              <Label htmlFor="editReleaseDate" className="text-white">Release Date</Label>
              <Input
                id="editReleaseDate"
                type="date"
                value={editSingleReleaseDate}
                onChange={(e) => setEditSingleReleaseDate(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            
            <div>
              <Label htmlFor="editDuration" className="text-white">Duration (e.g., 3:45)</Label>
              <Input
                id="editDuration"
                value={editSingleDuration}
                onChange={(e) => setEditSingleDuration(e.target.value)}
                placeholder="Enter duration"
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            
            <div>
              <Label htmlFor="editAudioUrl" className="text-white">Audio URL</Label>
              <Input
                id="editAudioUrl"
                value={editSingleAudioUrl}
                onChange={(e) => setEditSingleAudioUrl(e.target.value)}
                placeholder="Enter audio file URL"
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            
            <div>
              <Label htmlFor="editDescription" className="text-white">Description</Label>
              <Textarea
                id="editDescription"
                value={editSingleDescription}
                onChange={(e) => setEditSingleDescription(e.target.value)}
                placeholder="Enter description..."
                className="bg-gray-800 border-gray-600 text-white"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowEditSingleDialog(false)}
              className="bg-gray-800 hover:bg-gray-700 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={saveSingle}
              disabled={isSavingSingle || !editSingleTitle.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSavingSingle ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 