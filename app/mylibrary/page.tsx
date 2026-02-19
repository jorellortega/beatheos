"use client"

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Plus, Music, Upload, Calendar, Globe, FileText, CheckCircle2, XCircle, AlertCircle, ExternalLink, Info, FileMusic, FileArchive, FileAudio, File, Music2, Piano, Drum, Trash2, Save, Pencil, Folder, Grid, List, Package, Search, Play, Pause, Loader2, Link as LinkIcon, Circle, Clock, Archive, Download, FileText as FileTextIcon, StickyNote, MoreHorizontal, Image, Edit3, Unlink, RefreshCw, Video, Eye, EyeOff, Lock, ChevronDown, ChevronUp } from 'lucide-react'
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
import { TrackMetadataDialog } from '@/components/TrackMetadataDialog'
import { NotesDialog } from '@/components/NotesDialog'
import { useToast } from '@/hooks/use-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

// Types for DB tables
interface Album {
  id: string
  title: string
  artist: string
  release_date: string
  cover_art_url: string
  description?: string
  additional_covers?: { label: string; url: string }[]
  status?: 'production' | 'draft' | 'distribute' | 'error' | 'published' | 'other'
  production_status?: 'marketing' | 'organization' | 'production' | 'quality_control' | 'ready_for_distribution'
  distributor?: string
  distributor_notes?: string
  notes?: string
  visibility?: 'private' | 'public' | 'pause' | 'upcoming'
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
  session_id?: string | null
  session_name?: string | null
  status?: 'production' | 'draft' | 'distribute' | 'error' | 'published' | 'other'
  production_status?: 'marketing' | 'organization' | 'production' | 'quality_control' | 'ready_for_distribution'
  replaced_at?: string | null
}

interface Track {
  id: string
  title: string
  artist: string
  release_date?: string | null
  cover_art_url?: string
  audio_url?: string | null
  duration?: string
  description?: string
  session_id?: string | null
  session_name?: string | null
  bpm?: number | null
  key?: string | null
  genre?: string | null
  subgenre?: string | null
  tags?: string[]
  notes?: string
  status?: 'production' | 'draft' | 'distribute' | 'error' | 'published' | 'other'
  production_status?: 'marketing' | 'organization' | 'production' | 'quality_control' | 'ready_for_distribution'
  replaced_at?: string | null
  
  // Commercial & Legal
  isrc?: string
  upc?: string
  license_type?: string
  license_terms?: string
  publisher?: string
  publishing_rights?: string
  distribution_rights?: string
  
  // Commercial Metadata
  price?: number
  currency?: string
  is_available_for_purchase?: boolean
  is_available_for_streaming?: boolean
  
  // Content & Credits
  language?: string
  explicit_content?: boolean
  parental_advisory?: string
  featured_artists?: string[]
  producers?: string[]
  writers?: string[]
  mixers?: string[]
  mastering_engineer?: string
  
  // Technical Metadata
  sample_rate?: number
  bit_depth?: number
  file_format?: string
  file_size?: number
  
  // Analytics & Engagement
  play_count?: number
  like_count?: number
  share_count?: number
  download_count?: number
  average_rating?: number
  rating_count?: number
  review_count?: number
  
  // Workflow & Approval
  approval_status?: string
  approved_by?: string
  approved_at?: string
  rejection_reason?: string
  
  // Version Control
  version?: string
  is_remix?: boolean
  original_track_id?: string
  remix_credits?: string
  
  // Platform Integration
  spotify_id?: string
  apple_music_id?: string
  youtube_id?: string
  soundcloud_id?: string
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

interface ChecklistItem {
  id: string
  title: string
  completed: boolean
  notes?: string
  completed_at?: string
  assigned_to?: string
}

interface ProductionScheduleItem {
  id: string
  user_id: string
  title: string
  description?: string
  type: 'collaboration' | 'song_production' | 'beat_production' | 'mixing' | 'mastering' | 'recording' | 'other'
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  scheduled_date: string
  due_date: string
  assigned_to?: string
  collaborators?: string[]
  project_id?: string
  project_type?: 'album' | 'single' | 'track' | 'other'
  notes?: string
  budget?: number
  currency?: string
  location?: string
  equipment_needed?: string[]
  checklist?: ChecklistItem[]
  linkedProject?: { id: string; title: string; artist: string } | null
  created_at: string
  updated_at: string
}

export default function MyLibrary() {
  const router = useRouter()
  const { user } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  // Albums
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loadingAlbums, setLoadingAlbums] = useState(false);
  const [albumError, setAlbumError] = useState<string | null>(null);
  // Singles
  const [singles, setSingles] = useState<Single[]>([]);
  const [loadingSingles, setLoadingSingles] = useState(false);
  const [singleError, setSingleError] = useState<string | null>(null);
  // Tracks
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);
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
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
  
  // Track replacement loading states
  const [replacingSingleId, setReplacingSingleId] = useState<string | null>(null);
  const [replacingAlbumTrackId, setReplacingAlbumTrackId] = useState<string | null>(null);
  const [replacingTrackId, setReplacingTrackId] = useState<string | null>(null);
  
  // Track recently replaced files (for temporary labels)
  const [recentlyReplacedSingles, setRecentlyReplacedSingles] = useState<Set<string>>(new Set());
  const [recentlyReplacedAlbumTracks, setRecentlyReplacedAlbumTracks] = useState<Set<string>>(new Set());
  const [recentlyReplacedTracks, setRecentlyReplacedTracks] = useState<Set<string>>(new Set());
  
  // Cover management state
  const [replacingCoverId, setReplacingCoverId] = useState<string | null>(null);
  const [replacingCoverType, setReplacingCoverType] = useState<'album' | 'single' | 'track' | null>(null);
  
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
  
  // Create single state
  const [showCreateSingleDialog, setShowCreateSingleDialog] = useState(false);
  const [newSingle, setNewSingle] = useState({
    title: '',
    artist: '',
    description: '',
    release_date: '',
    cover_art_url: '',
    audio_url: '',
    duration: ''
  });
  const [selectedLabelArtistIdForSingle, setSelectedLabelArtistIdForSingle] = useState<string>('');
  const [creatingSingle, setCreatingSingle] = useState(false);
  const [createSingleError, setCreateSingleError] = useState<string | null>(null);

  // Label artists state (for artist selection)
  const [labelArtists, setLabelArtists] = useState<{ id: string; name: string; stage_name?: string }[]>([]);
  const [loadingLabelArtists, setLoadingLabelArtists] = useState(false);

  // Fetch label artists
  useEffect(() => {
    async function fetchLabelArtists() {
      if (!user?.id) return;
      
      setLoadingLabelArtists(true);
      try {
        const params = new URLSearchParams();
        params.append('user_id', user.id);
        
        const response = await fetch(`/api/label-artists?${params.toString()}`);
        const data = await response.json();
        
        if (response.ok && data.artists) {
          setLabelArtists(data.artists);
        }
      } catch (error) {
        console.error('Error fetching label artists:', error);
      } finally {
        setLoadingLabelArtists(false);
      }
    }
    
    if (user?.id) {
      fetchLabelArtists();
    }
  }, [user?.id]);
  
  // Edit track state
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [showEditTrackDialog, setShowEditTrackDialog] = useState(false);
  const [editTrackTitle, setEditTrackTitle] = useState('');
  const [editTrackDescription, setEditTrackDescription] = useState('');
  const [editTrackArtist, setEditTrackArtist] = useState('');
  const [editTrackReleaseDate, setEditTrackReleaseDate] = useState('');
  const [editTrackDuration, setEditTrackDuration] = useState('');
  const [editTrackAudioUrl, setEditTrackAudioUrl] = useState('');
  const [editTrackBpm, setEditTrackBpm] = useState('');
  const [editTrackKey, setEditTrackKey] = useState('');
  const [editTrackGenre, setEditTrackGenre] = useState('');
  const [editTrackSubgenre, setEditTrackSubgenre] = useState('');
  const [isSavingTrack, setIsSavingTrack] = useState(false);
  
  // Create track state
  const [showCreateTrackDialog, setShowCreateTrackDialog] = useState(false);
  const [newTrackTitle, setNewTrackTitle] = useState('');
  const [newTrackDescription, setNewTrackDescription] = useState('');
  const [newTrackArtist, setNewTrackArtist] = useState('');
  const [newTrackReleaseDate, setNewTrackReleaseDate] = useState('');
  const [newTrackDuration, setNewTrackDuration] = useState('');
  const [newTrackBpm, setNewTrackBpm] = useState('');
  const [newTrackKey, setNewTrackKey] = useState('');
  const [newTrackGenre, setNewTrackGenre] = useState('');
  const [newTrackSubgenre, setNewTrackSubgenre] = useState('');
  const [newTrackAudioFile, setNewTrackAudioFile] = useState<File | null>(null);
  const [isCreatingTrack, setIsCreatingTrack] = useState(false);
  
  // Create album track state
  const [showCreateAlbumTrackDialog, setShowCreateAlbumTrackDialog] = useState(false);
  const [selectedAlbumForTrack, setSelectedAlbumForTrack] = useState<Album | null>(null);
  const [newAlbumTrack, setNewAlbumTrack] = useState({
    title: '',
    artist: '',
    description: '',
    release_date: '',
    cover_art_url: '',
    audio_url: '',
    duration: '',
    bpm: '',
    key: '',
    genre: '',
    subgenre: '',
    tags: ''
  });
  const [creatingAlbumTrack, setCreatingAlbumTrack] = useState(false);
  const [createAlbumTrackError, setCreateAlbumTrackError] = useState<string | null>(null);
  
  // Beat upload state
  const [showBeatUploadDialog, setShowBeatUploadDialog] = useState(false);
  const [beatTitle, setBeatTitle] = useState('');
  const [beatBpm, setBeatBpm] = useState('');
  const [beatKey, setBeatKey] = useState('');
  const [beatGenre, setBeatGenre] = useState('');
  const [beatPrice, setBeatPrice] = useState('');
  const [beatAudioFile, setBeatAudioFile] = useState<File | null>(null);
  const [beatWavFile, setBeatWavFile] = useState<File | null>(null);
  const [beatCoverArtFile, setBeatCoverArtFile] = useState<File | null>(null);
  const [isUploadingBeat, setIsUploadingBeat] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Audio Packs
  const [audioPacks, setAudioPacks] = useState<AudioPack[]>([]);
  const [loadingPacks, setLoadingPacks] = useState(false);
  const [packError, setPackError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'packs'>('grid');
  const [selectedPack, setSelectedPack] = useState<string | null>(null);
  
  // Pack name editing
  const [editingPackName, setEditingPackName] = useState<string | null>(null);
  const [editingPackNameValue, setEditingPackNameValue] = useState<string>('');
  
  // Pack description editing
  const [editingPackDescription, setEditingPackDescription] = useState<string | null>(null);
  const [editingPackDescriptionValue, setEditingPackDescriptionValue] = useState<string>('');
  
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
  })
  
  // Move single state
  const [showMoveSingleDialog, setShowMoveSingleDialog] = useState(false)
  const [moveSingleId, setMoveSingleId] = useState<string | null>(null)
  const [moveSingleTitle, setMoveSingleTitle] = useState('')
  const [moveToTracks, setMoveToTracks] = useState(false)
  const [selectedTargetAlbum, setSelectedTargetAlbum] = useState('')
  const [availableAlbums, setAvailableAlbums] = useState<{ id: string; title: string }[]>([])
  const [movingSingle, setMovingSingle] = useState(false)
  const [moveSingleError, setMoveSingleError] = useState<string | null>(null)
  const [savingAudio, setSavingAudio] = useState(false);
  const [audioEditError, setAudioEditError] = useState<string | null>(null);
  
  // Move track state
  const [showMoveTrackDialog, setShowMoveTrackDialog] = useState(false)
  const [moveTrackId, setMoveTrackId] = useState<string | null>(null)
  const [moveTrackTitle, setMoveTrackTitle] = useState('')
  const [moveTrackType, setMoveTrackType] = useState<'single' | 'album_track'>('single')
  const [selectedTargetAlbumForTrack, setSelectedTargetAlbumForTrack] = useState('')
  const [movingTrack, setMovingTrack] = useState(false)
  const [moveTrackError, setMoveTrackError] = useState<string | null>(null)
  
  // Bulk genre edit modal
  const [showBulkGenreModal, setShowBulkGenreModal] = useState(false);
  const [bulkGenrePack, setBulkGenrePack] = useState<AudioPack | null>(null);
  const [bulkGenreValue, setBulkGenreValue] = useState('');
  const [bulkSubgenreValue, setBulkSubgenreValue] = useState('');
  const [bulkGenreSaving, setBulkGenreSaving] = useState(false);
  const [bulkGenreError, setBulkGenreError] = useState<string | null>(null);
  
  // Conversion states
  const [convertingSingle, setConvertingSingle] = useState<string | null>(null);
  const [convertingAlbumTrack, setConvertingAlbumTrack] = useState<string | null>(null);
  const [convertingTrack, setConvertingTrack] = useState<string | null>(null);
  const [showCompressionDialog, setShowCompressionDialog] = useState(false);
  const [compressionFile, setCompressionFile] = useState<{ id: string; url: string; type: 'single' | 'album_track' | 'track' } | null>(null);
  
  // Metadata states
  const [showMetadataDialog, setShowMetadataDialog] = useState(false);
  const [editingMetadata, setEditingMetadata] = useState<any>(null);
  const [editingTrackId, setEditingTrackId] = useState('');
  const [editingTrackType, setEditingTrackType] = useState<'single' | 'album_track' | 'track'>('single');
  
  // Notes states
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [editingNotes, setEditingNotes] = useState('');
  const [editingNotesId, setEditingNotesId] = useState('');
  const [editingNotesType, setEditingNotesType] = useState<'album' | 'single' | 'album_track' | 'track'>('single');
  const [editingNotesTitle, setEditingNotesTitle] = useState('');
  
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
  const [selectedLabelArtistIdForAlbum, setSelectedLabelArtistIdForAlbum] = useState<string>('');
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
    distributor: '',
    distributor_notes: '',
    notes: '',
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
          distributor: album.distributor || '',
          distributor_notes: album.distributor_notes || '',
          notes: album.notes || '',
        });
      }
    } else {
      setEditAlbum(null);
      setEditForm({ title: '', artist: '', release_date: '', cover_art_url: '', description: '', distributor: '', distributor_notes: '', notes: '' });
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

  const playTrack = (trackId: string, audioUrl: string) => {
    if (playingTrackId === trackId) {
      stopTrack();
      return;
    }

    if (audioRef) {
      audioRef.pause();
    }

    const newAudioRef = new Audio(audioUrl);
    newAudioRef.addEventListener('ended', () => {
      setPlayingTrackId(null);
    });

    newAudioRef.play().catch(error => {
      console.error('Error playing track:', error);
      toast({
        title: "Error",
        description: "Failed to play track audio.",
        variant: "destructive"
      });
    });

    setAudioRef(newAudioRef);
    setPlayingTrackId(trackId);
  };

  const stopTrack = () => {
    if (audioRef) {
      audioRef.pause();
      audioRef.currentTime = 0;
    }
    setPlayingTrackId(null);
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

  // Create single functions
  const openCreateSingleDialog = () => {
    setNewSingle({
      title: '',
      artist: '',
      description: '',
      release_date: '',
      cover_art_url: '',
      audio_url: '',
      duration: ''
    });
    setShowCreateSingleDialog(true);
  };

  const createSingle = async () => {
    if (!newSingle.title.trim()) return;

    setCreatingSingle(true);
    try {
      // Get the selected artist's name if label_artist_id is set
      const selectedArtist = selectedLabelArtistIdForSingle 
        ? labelArtists.find(a => a.id === selectedLabelArtistIdForSingle)
        : null;
      const artistName = selectedArtist 
        ? (selectedArtist.stage_name || selectedArtist.name)
        : newSingle.artist;

      console.log('🔍 [LIBRARY CREATE SINGLE] Creating single:', {
        title: newSingle.title,
        artist: artistName,
        label_artist_id: selectedLabelArtistIdForSingle || null
      });

      const { data, error } = await supabase
        .from('singles')
        .insert([{
          title: newSingle.title,
          artist: artistName,
          description: newSingle.description,
          release_date: newSingle.release_date,
          cover_art_url: newSingle.cover_art_url,
          audio_url: newSingle.audio_url,
          duration: newSingle.duration,
          user_id: user?.id,
          status: 'draft',
          label_artist_id: selectedLabelArtistIdForSingle || null
        }])
        .select()
        .single();

      if (error) throw error;

      console.log('🔍 [LIBRARY CREATE SINGLE] Single created:', data);

      // Update local state
      if (data) {
        setSingles(prev => [data, ...prev]);
      }
      setShowCreateSingleDialog(false);
      setNewSingle({
        title: '',
        artist: '',
        description: '',
        release_date: '',
        cover_art_url: '',
        audio_url: '',
        duration: ''
      });
      setSelectedLabelArtistIdForSingle('');
      
      // Redirect to single detail page
      if (data && data.id) {
        router.push(`/mysingles/${data.id}`);
      }
    } catch (error) {
      console.error('Error creating single:', error);
      setCreateSingleError('Failed to create single. Please try again.');
    } finally {
      setCreatingSingle(false);
    }
  };

  // Create album track functions
  const openCreateAlbumTrackDialog = (album: Album) => {
    setSelectedAlbumForTrack(album);
    setNewAlbumTrack({
      title: '',
      artist: '',
      description: '',
      release_date: '',
      cover_art_url: '',
      audio_url: '',
      duration: '',
      bpm: '',
      key: '',
      genre: '',
      subgenre: '',
      tags: ''
    });
    setShowCreateAlbumTrackDialog(true);
  };

  const createAlbumTrack = async () => {
    if (!newAlbumTrack.title.trim() || !selectedAlbumForTrack) return;

    setCreatingAlbumTrack(true);
    try {
      // Get the next track order for this album
      const { data: existingTracks } = await supabase
        .from('album_tracks')
        .select('track_order')
        .eq('album_id', selectedAlbumForTrack.id)
        .order('track_order', { ascending: false })
        .limit(1);

      const nextTrackOrder = existingTracks && existingTracks.length > 0 
        ? (existingTracks[0].track_order || 0) + 1 
        : 1;

      const { data, error } = await supabase
        .from('album_tracks')
        .insert([{
          album_id: selectedAlbumForTrack.id,
          title: newAlbumTrack.title,
          audio_url: newAlbumTrack.audio_url,
          duration: newAlbumTrack.duration,
          status: 'draft',
          track_order: nextTrackOrder
        }])
        .select()
        .single();

      if (error) throw error;

      // Update local state
      if (data) {
        setTracks(prev => [data, ...prev]);
      }
      setShowCreateAlbumTrackDialog(false);
      setSelectedAlbumForTrack(null);
      setNewAlbumTrack({
        title: '',
        artist: '',
        description: '',
        release_date: '',
        cover_art_url: '',
        audio_url: '',
        duration: '',
        bpm: '',
        key: '',
        genre: '',
        subgenre: '',
        tags: ''
      });
    } catch (error) {
      console.error('Error creating album track:', error);
      setCreateAlbumTrackError('Failed to create album track. Please try again.');
    } finally {
      setCreatingAlbumTrack(false);
    }
  };

  // Edit track functions
  const openEditTrackDialog = (track: Track) => {
    setEditingTrack(track);
    setEditTrackTitle(track.title);
    setEditTrackDescription(track.description || '');
    setEditTrackArtist(track.artist);
    setEditTrackReleaseDate(track.release_date || '');
    setEditTrackDuration(track.duration || '');
    setEditTrackAudioUrl(track.audio_url || '');
    setEditTrackBpm(track.bpm?.toString() || '');
    setEditTrackKey(track.key || '');
    setEditTrackGenre(track.genre || '');
    setEditTrackSubgenre(track.subgenre || '');
    setShowEditTrackDialog(true);
  };

  const saveTrack = async () => {
    if (!editingTrack || !editTrackTitle.trim()) return;

    setIsSavingTrack(true);
    try {
      const { error } = await supabase
        .from('tracks')
        .update({
          title: editTrackTitle,
          description: editTrackDescription,
          artist: editTrackArtist,
          release_date: editTrackReleaseDate || null,
          duration: editTrackDuration,
          audio_url: editTrackAudioUrl || null,
          bpm: editTrackBpm ? parseInt(editTrackBpm) : null,
          key: editTrackKey || null,
          genre: editTrackGenre || null,
          subgenre: editTrackSubgenre || null
        })
        .eq('id', editingTrack.id);

      if (error) throw error;

      // Update local state
      setTracks(prev => prev.map(track => 
        track.id === editingTrack.id 
          ? { 
              ...track, 
              title: editTrackTitle,
              description: editTrackDescription,
              artist: editTrackArtist,
              release_date: editTrackReleaseDate || null,
              duration: editTrackDuration,
              audio_url: editTrackAudioUrl || null,
              bpm: editTrackBpm ? parseInt(editTrackBpm) : null,
              key: editTrackKey || null,
              genre: editTrackGenre || null,
              subgenre: editTrackSubgenre || null
            }
          : track
      ));

      setShowEditTrackDialog(false);
      setEditingTrack(null);
    } catch (error) {
      console.error('Error updating track:', error);
      alert('Failed to update track. Please try again.');
    } finally {
      setIsSavingTrack(false);
    }
  };

  const deleteTrack = async (trackId: string) => {
    if (!confirm('Are you sure you want to delete this track?')) return;

    try {
      const { error } = await supabase
        .from('tracks')
        .delete()
        .eq('id', trackId);

      if (error) throw error;

      // Update local state
      setTracks(prev => prev.filter(track => track.id !== trackId));
    } catch (error) {
      console.error('Error deleting track:', error);
      alert('Failed to delete track. Please try again.');
    }
  };

  // Create track functions
  const openCreateTrackDialog = (prefillTitle?: string, prefillArtist?: string, prefillReleaseDate?: string) => {
    setNewTrackTitle(prefillTitle || '');
    setNewTrackDescription('');
    setNewTrackArtist(prefillArtist || '');
    setNewTrackReleaseDate(prefillReleaseDate || '');
    setNewTrackDuration('');
    setNewTrackBpm('');
    setNewTrackKey('');
    setNewTrackGenre('');
    setNewTrackSubgenre('');
    setNewTrackAudioFile(null);
    setShowCreateTrackDialog(true);
  };

  const createTrack = async () => {
    if (!newTrackTitle.trim() || !newTrackArtist.trim()) {
      alert('Title and Artist are required.');
      return;
    }

    if (!user) {
      alert('You must be logged in to create a track.');
      return;
    }

    setIsCreatingTrack(true);
    try {
      // First create the track
      const { data, error } = await supabase
        .from('tracks')
        .insert([{
          user_id: user.id,
          title: newTrackTitle,
          description: newTrackDescription,
          artist: newTrackArtist,
          release_date: newTrackReleaseDate || null,
          duration: newTrackDuration,
          bpm: newTrackBpm ? parseInt(newTrackBpm) : null,
          key: newTrackKey || null,
          genre: newTrackGenre || null,
          subgenre: newTrackSubgenre || null,
          status: 'draft',
          production_status: 'production'
        }])
        .select();

      if (error) throw error;

      // If audio file is provided, upload it
      if (data && data[0] && newTrackAudioFile) {
        const audioUrl = await uploadTrackAudio(newTrackAudioFile, data[0].id);
        if (audioUrl) {
          // Update the track with the audio URL
          await supabase
            .from('tracks')
            .update({ audio_url: audioUrl })
            .eq('id', data[0].id);
          
          // Update local state with audio URL
          setTracks(prev => prev.map(track => 
            track.id === data[0].id 
              ? { ...track, audio_url: audioUrl }
              : track
          ));
        }
      }

      // Add to local state
      if (data && data[0]) {
        setTracks(prev => [data[0], ...prev]);
      }

      setShowCreateTrackDialog(false);
      toast({
        title: "Track created successfully!",
        description: "Your new track has been added to the library.",
      });
      
      // Redirect to track detail page
      if (data && data[0] && data[0].id) {
        router.push(`/trackfiles/${data[0].id}`);
      }
    } catch (error) {
      console.error('Error creating track:', error);
      alert('Failed to create track. Please try again.');
    } finally {
      setIsCreatingTrack(false);
    }
  };

  // Beat upload functions
  const openBeatUploadDialog = () => {
    setBeatTitle('');
    setBeatBpm('');
    setBeatKey('');
    setBeatGenre('');
    setBeatPrice('');
    setBeatAudioFile(null);
    setBeatWavFile(null);
    setBeatCoverArtFile(null);
    setShowBeatUploadDialog(true);
  };

  const uploadBeat = async () => {
    if (!beatTitle.trim() || !beatBpm.trim() || !beatKey.trim() || !beatGenre.trim()) {
      alert('Title, BPM, Key, and Genre are required.');
      return;
    }

    if (!beatAudioFile) {
      alert('Please select an audio file.');
      return;
    }

    if (!user) {
      alert('You must be logged in to upload beats.');
      return;
    }

    setIsUploadingBeat(true);
    try {
      const userId = user.id;
      const cleanTitle = beatTitle.trim().replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
      
      // MP3 upload
      const mp3Ext = beatAudioFile.name.split('.').pop();
      const mp3Base = beatAudioFile.name.replace(/\.[^/.]+$/, '');
      const mp3Unique = `${mp3Base}_${Date.now()}-${Math.round(Math.random() * 1e9)}.${mp3Ext}`;
      const mp3Path = `profiles/${userId}/${cleanTitle}/${mp3Unique}`;
      const { data: mp3Upload, error: mp3Error } = await supabase.storage.from('beats').upload(mp3Path, beatAudioFile, { upsert: true });
      if (mp3Error) throw new Error('MP3 upload failed: ' + (mp3Error.message || JSON.stringify(mp3Error)));
      const { data: { publicUrl: mp3Url } } = supabase.storage.from('beats').getPublicUrl(mp3Path);
      
      // WAV upload
      let wavUrl = null;
      if (beatWavFile) {
        const wavExt = beatWavFile.name.split('.').pop();
        const wavBase = beatWavFile.name.replace(/\.[^/.]+$/, '');
        const wavUnique = `${wavBase}_${Date.now()}-${Math.round(Math.random() * 1e9)}.${wavExt}`;
        const wavPath = `profiles/${userId}/${cleanTitle}/${wavUnique}`;
        const { data: wavUpload, error: wavError } = await supabase.storage.from('beats').upload(wavPath, beatWavFile, { upsert: true });
        if (wavError) throw new Error('WAV upload failed: ' + (wavError.message || JSON.stringify(wavError)));
        const { data: { publicUrl: wUrl } } = supabase.storage.from('beats').getPublicUrl(wavPath);
        wavUrl = wUrl;
      }
      
      // Cover art upload
      let coverArtUrl = null;
      if (beatCoverArtFile) {
        const coverExt = beatCoverArtFile.name.split('.').pop();
        const coverBase = beatCoverArtFile.name.replace(/\.[^/.]+$/, '');
        const coverUnique = `${coverBase}_${Date.now()}-${Math.round(Math.random() * 1e9)}.${coverExt}`;
        const coverPath = `profiles/${userId}/${cleanTitle}/cover/${coverUnique}`;
        const { data: coverUpload, error: coverError } = await supabase.storage.from('beats').upload(coverPath, beatCoverArtFile, { upsert: true });
        if (coverError) throw new Error('Cover art upload failed: ' + (coverError.message || JSON.stringify(coverError)));
        const { data: { publicUrl: cUrl } } = supabase.storage.from('beats').getPublicUrl(coverPath);
        coverArtUrl = cUrl;
      }
      
      // Insert beat into database
      const { data: beatData, error: insertError } = await supabase
        .from('beats')
        .insert([{
          producer_id: userId,
          title: beatTitle,
          bpm: parseInt(beatBpm),
          key: beatKey,
          genre: beatGenre,
          price: beatPrice ? parseFloat(beatPrice) : null,
          mp3_url: mp3Url,
          wav_url: wavUrl,
          cover_art_url: coverArtUrl,
          is_draft: false
        }])
        .select();

      if (insertError) throw insertError;

      setShowBeatUploadDialog(false);
      toast({
        title: "Beat uploaded successfully!",
        description: "Your beat has been published to the marketplace.",
      });
    } catch (error) {
      console.error('Error uploading beat:', error);
      alert('Failed to upload beat. Please try again.');
    } finally {
      setIsUploadingBeat(false);
    }
  };

  // Publish single to marketplace
  const publishSingleToMarketplace = async (single: Single) => {
    if (!single.audio_url) {
      alert('This single does not have an audio file to publish.');
      return;
    }

    if (!user) {
      alert('You must be logged in to publish beats.');
      return;
    }

    // Show a dialog to get required and optional fields for marketplace
    const title = prompt('Enter beat title for marketplace:', single.title);
    if (!title) return;

    const bpm = prompt('Enter BPM (optional, press Cancel to skip):', '120') || '120';
    const key = prompt('Enter musical key (optional, press Cancel to skip):', 'C Major') || 'C Major';
    const genre = prompt('Enter genre (optional, press Cancel to skip):', 'Hip Hop') || 'Hip Hop';
    
    const price = prompt('Enter price ($) - REQUIRED:', '29.99');
    if (!price) {
      alert('Price is required to publish to marketplace.');
      return;
    }

    try {
      const userId = user.id;
      const cleanTitle = title.trim().replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
      
      // Copy the audio file to the beats storage
      const audioExt = single.audio_url.split('.').pop() || 'mp3';
      const audioUnique = `${cleanTitle}_${Date.now()}-${Math.round(Math.random() * 1e9)}.${audioExt}`;
      const audioPath = `profiles/${userId}/${cleanTitle}/${audioUnique}`;
      
      // Download the audio file from singles storage and upload to beats storage
      const audioResponse = await fetch(single.audio_url);
      const audioBlob = await audioResponse.blob();
      const audioFile = new Blob([audioBlob], { type: `audio/${audioExt}` });
      
      const { data: audioUpload, error: audioError } = await supabase.storage
        .from('beats')
        .upload(audioPath, audioFile, { upsert: true });
      
      if (audioError) throw new Error('Audio upload failed: ' + (audioError.message || JSON.stringify(audioError)));
      const { data: { publicUrl: audioUrl } } = supabase.storage.from('beats').getPublicUrl(audioPath);
      
      // Copy cover art if it exists
      let coverArtUrl = null;
      if (single.cover_art_url) {
        const coverExt = single.cover_art_url.split('.').pop() || 'jpg';
        const coverUnique = `${cleanTitle}_cover_${Date.now()}-${Math.round(Math.random() * 1e9)}.${coverExt}`;
        const coverPath = `profiles/${userId}/${cleanTitle}/cover/${coverUnique}`;
        
        const coverResponse = await fetch(single.cover_art_url);
        const coverBlob = await coverResponse.blob();
        const coverFile = new Blob([coverBlob], { type: `image/${coverExt}` });
        
        const { data: coverUpload, error: coverError } = await supabase.storage
          .from('beats')
          .upload(coverPath, coverFile, { upsert: true });
        
        if (coverError) throw new Error('Cover art upload failed: ' + (coverError.message || JSON.stringify(coverError)));
        const { data: { publicUrl: cUrl } } = supabase.storage.from('beats').getPublicUrl(coverPath);
        coverArtUrl = cUrl;
      }
      
      // Insert beat into database
      const { data: beatData, error: insertError } = await supabase
        .from('beats')
        .insert([{
          producer_id: userId,
          title: title,
          description: single.description || '',
          bpm: parseInt(bpm),
          key: key,
          genre: genre,
          price: parseFloat(price),
          mp3_url: audioUrl,
          cover_art_url: coverArtUrl,
          is_draft: false
        }])
        .select();

      if (insertError) throw insertError;

      // Update the single's status to indicate it's been published
      await supabase
        .from('singles')
        .update({ status: 'published' })
        .eq('id', single.id);

      // Update local state
      setSingles(prev => prev.map(s => 
        s.id === single.id 
          ? { ...s, status: 'published' }
          : s
      ));

      toast({
        title: "✅ Beat Published Successfully!",
        description: `"${title}" has been published to the Beatheos marketplace and is now available for artists to discover and purchase.`,
      });
    } catch (error) {
      console.error('Error publishing single to marketplace:', error);
      alert('Failed to publish single to marketplace. Please try again.');
    }
  };

  // Convert single to MP3
  const convertSingleToMp3 = async (singleId: string, audioUrl: string, compressionLevel: 'ultra_high' | 'high' | 'medium' | 'low' = 'medium') => {
    setConvertingSingle(singleId)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No access token available')
      }

      const response = await fetch('/api/audio/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          fileId: singleId,
          filePath: audioUrl,
          targetFormat: 'mp3',
          compressionLevel,
          fileType: 'single'
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Conversion failed')
      }

      const result = await response.json()
      
      // Refresh singles data
      await refreshSingles()
      
      toast({
        title: "Conversion successful",
        description: `Single has been converted to MP3 format with ${compressionLevel} compression.`,
      })
    } catch (error) {
      console.error('Error converting single:', error)
      toast({
        title: "Conversion failed",
        description: error instanceof Error ? error.message : "Failed to convert single.",
        variant: "destructive"
      })
    } finally {
      setConvertingSingle(null)
    }
  }

  // Convert album track to MP3
  const convertAlbumTrackToMp3 = async (trackId: string, audioUrl: string, compressionLevel: 'ultra_high' | 'high' | 'medium' | 'low' = 'medium') => {
    setConvertingAlbumTrack(trackId)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No access token available')
      }

      const response = await fetch('/api/audio/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          fileId: trackId,
          filePath: audioUrl,
          targetFormat: 'mp3',
          compressionLevel,
          fileType: 'album_track'
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Conversion failed')
      }

      const result = await response.json()
      
      // Refresh albums data to show new MP3 tracks
      await refreshAlbums()
      
      toast({
        title: "Conversion successful",
        description: `Album track has been converted to MP3 format with ${compressionLevel} compression.`,
      })
    } catch (error) {
      console.error('Error converting album track:', error)
      toast({
        title: "Conversion failed",
        description: error instanceof Error ? error.message : "Failed to convert album track.",
        variant: "destructive"
      })
    } finally {
      setConvertingAlbumTrack(null)
    }
  }

  // Convert track to MP3
  const convertTrackToMp3 = async (trackId: string, audioUrl: string, compressionLevel: 'ultra_high' | 'high' | 'medium' | 'low' = 'medium') => {
    setConvertingTrack(trackId)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No access token available')
      }

      const response = await fetch('/api/audio/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          fileId: trackId,
          filePath: audioUrl,
          targetFormat: 'mp3',
          compressionLevel,
          fileType: 'track'
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Conversion failed')
      }

      const result = await response.json()
      
      // Refresh tracks data
      await refreshTracks()
      
      toast({
        title: "Conversion successful",
        description: `Track has been converted to MP3 format with ${compressionLevel} compression.`,
      })
    } catch (error) {
      console.error('Error converting track:', error)
      toast({
        title: "Conversion failed",
        description: error instanceof Error ? error.message : "Failed to convert track.",
        variant: "destructive"
      })
    } finally {
      setConvertingTrack(null)
    }
  }

  // Refresh functions
  const refreshSingles = async () => {
    try {
      const { data, error } = await supabase
        .from('singles')
        .select(`
          *,
          beat_sessions!inner(name)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Transform data to include session_name
      const singlesWithSessionName = data?.map(single => ({
        ...single,
        session_name: single.beat_sessions?.name || null
      })) || []
      
      setSingles(singlesWithSessionName)
    } catch (error) {
      console.error('Error refreshing singles:', error)
    }
  }

  const refreshTracks = async () => {
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select(`
          *,
          beat_sessions!inner(name)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Transform data to include session_name
      const tracksWithSessionName = data?.map(track => ({
        ...track,
        session_name: track.beat_sessions?.name || null
      })) || []
      
      setTracks(tracksWithSessionName)
    } catch (error) {
      console.error('Error refreshing tracks:', error)
    }
  }

      const getStatusColor = (status: string) => {
      switch (status) {
        case 'production':
          return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
        case 'draft':
          return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
        case 'distribute':
          return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
        case 'error':
          return 'bg-red-500/10 text-red-400 border-red-500/20'
        case 'published':
          return 'bg-green-500/10 text-green-400 border-green-500/20'
        case 'other':
          return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
        default:
          return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      }
    }

      const getStatusIcon = (status: string) => {
      switch (status) {
        case 'draft':
          return <Circle className="h-3 w-3" />
        case 'production':
          return <Music className="h-3 w-3" />
        case 'distribute':
          return <ExternalLink className="h-3 w-3" />
        case 'error':
          return <XCircle className="h-3 w-3" />
        case 'published':
          return <CheckCircle2 className="h-3 w-3" />
        case 'other':
          return <Circle className="h-3 w-3" />
        case 'active':
          return <CheckCircle2 className="h-3 w-3" />
        case 'paused':
          return <Pause className="h-3 w-3" />
        case 'scheduled':
          return <Calendar className="h-3 w-3" />
        case 'archived':
          return <Archive className="h-3 w-3" />
        default:
          return <Circle className="h-3 w-3" />
      }
    }

      const getStatusBorderColor = (status: string) => {
      switch (status) {
        case 'draft':
          return 'border-l-yellow-500'
        case 'production':
          return 'border-l-yellow-500'
        case 'distribute':
          return 'border-l-blue-500'
        case 'error':
          return 'border-l-red-500'
        case 'published':
          return 'border-l-green-500'
        case 'other':
          return 'border-l-purple-500'
        case 'active':
          return 'border-l-green-500'
        case 'paused':
          return 'border-l-orange-500'
        case 'scheduled':
          return 'border-l-blue-500'
        case 'archived':
          return 'border-l-gray-500'
        default:
          return 'border-l-yellow-500'
      }
    }

  const getProductionStatusColor = (status: string) => {
    switch (status) {
      case 'marketing':
        return 'bg-purple-600 hover:bg-purple-700 text-white border-purple-500';
      case 'organization':
        return 'bg-blue-600 hover:bg-blue-700 text-white border-blue-500';
      case 'production':
        return 'bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-500';
      case 'quality_control':
        return 'bg-orange-600 hover:bg-orange-700 text-white border-orange-500';
      case 'ready_for_distribution':
        return 'bg-green-600 hover:bg-green-700 text-white border-green-500';
      default:
        return 'bg-gray-600 hover:bg-gray-700 text-white border-gray-500';
    }
  }

  const getProductionStatusIcon = (status: string) => {
    switch (status) {
      case 'marketing':
        return <Globe className="h-4 w-4" />;
      case 'organization':
        return <Folder className="h-4 w-4" />;
      case 'production':
        return <Music className="h-4 w-4" />;
      case 'quality_control':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'ready_for_distribution':
        return <ExternalLink className="h-4 w-4" />;
      default:
        return <Circle className="h-4 w-4" />;
    }
  }

  const getVisibilityColor = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return 'bg-green-600 hover:bg-green-700 text-white border-green-500';
      case 'private':
        return 'bg-gray-600 hover:bg-gray-700 text-white border-gray-500';
      case 'pause':
        return 'bg-orange-600 hover:bg-orange-700 text-white border-orange-500';
      case 'upcoming':
        return 'bg-blue-600 hover:bg-blue-700 text-white border-blue-500';
      default:
        return 'bg-gray-600 hover:bg-gray-700 text-white border-gray-500';
    }
  }

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return <Eye className="h-3 w-3" />;
      case 'private':
        return <Lock className="h-3 w-3" />;
      case 'pause':
        return <Pause className="h-3 w-3" />;
      case 'upcoming':
        return <Clock className="h-3 w-3" />;
      default:
        return <Lock className="h-3 w-3" />;
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-600 hover:bg-red-700 text-white'
      case 'high': return 'bg-orange-600 hover:bg-orange-700 text-white'
      case 'medium': return 'bg-yellow-600 hover:bg-yellow-700 text-white'
      case 'low': return 'bg-green-600 hover:bg-green-700 text-white'
      default: return 'bg-gray-600 hover:bg-gray-700 text-white'
    }
  }

  const getAudioFileLabel = (audioUrl: string) => {
    if (!audioUrl) return null;
    const extension = audioUrl.split('.').pop()?.toLowerCase();
    if (extension === 'wav') {
      return <span className="text-xs px-2 py-1 bg-blue-600 text-white rounded font-medium">WAV</span>;
    } else if (extension === 'mp3') {
      return <span className="text-xs px-2 py-1 bg-green-600 text-white rounded font-medium">MP3</span>;
    } else {
      return <span className="text-xs px-2 py-1 bg-gray-600 text-white rounded font-medium">{extension?.toUpperCase()}</span>;
    }
  }

  const getFilteredAlbums = () => {
    if (albumPhaseTab === 'all') {
      return albums;
    }
    return albums.filter(album => album.production_status === albumPhaseTab);
  }

  const getFilteredSingles = () => {
    if (singlePhaseTab === 'all') {
      return singles;
    }
    return singles.filter(single => single.production_status === singlePhaseTab);
  }

  const getFilteredTracks = () => {
    if (trackPhaseTab === 'all') {
      return tracks;
    }
    return tracks.filter(track => track.production_status === trackPhaseTab);
  }

      const updateAlbumStatus = async (albumId: string, newStatus: 'production' | 'draft' | 'distribute' | 'error' | 'published' | 'other') => {
    const { error } = await supabase
      .from('albums')
      .update({ status: newStatus })
      .eq('id', albumId);
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to update album status: " + error.message,
        variant: "destructive"
      });
      return;
    }
    
    // Update local state
    setAlbums(albums.map(album => 
      album.id === albumId ? { ...album, status: newStatus } : album
    ));
    
    toast({
      title: "Success",
      description: `Album status updated to ${newStatus}`,
    });
  };

      const updateSingleStatus = async (singleId: string, newStatus: 'production' | 'draft' | 'distribute' | 'error' | 'published' | 'other') => {
    const { error } = await supabase
      .from('singles')
      .update({ status: newStatus })
      .eq('id', singleId);
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to update single status: " + error.message,
        variant: "destructive"
      });
      return;
    }
    
    // Update local state
    setSingles(singles.map(single => 
      single.id === singleId ? { ...single, status: newStatus } : single
    ));
    
    toast({
      title: "Success",
      description: `Single status updated to ${newStatus}`,
    });
  };

  const updateAlbumProductionStatus = async (albumId: string, newStatus: 'marketing' | 'organization' | 'production' | 'quality_control' | 'ready_for_distribution') => {
    const { error } = await supabase
      .from('albums')
      .update({ production_status: newStatus })
      .eq('id', albumId);
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to update album production status: " + error.message,
        variant: "destructive"
      });
      return;
    }
    
    // Update local state
    setAlbums(albums.map(album => 
      album.id === albumId ? { ...album, production_status: newStatus } : album
    ));
    
    toast({
      title: "Success",
      description: `Album production status updated to ${newStatus}`,
    });
  };

  const updateAlbumVisibility = async (albumId: string, newVisibility: 'private' | 'public' | 'pause' | 'upcoming') => {
    const { error } = await supabase
      .from('albums')
      .update({ visibility: newVisibility })
      .eq('id', albumId);
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to update album visibility: " + error.message,
        variant: "destructive"
      });
      return;
    }
    
    // Update local state
    setAlbums(albums.map(album => 
      album.id === albumId ? { ...album, visibility: newVisibility } : album
    ));
    
    toast({
      title: "Success",
      description: `Album visibility updated to ${newVisibility}`,
    });
  };

  const updateSingleProductionStatus = async (singleId: string, newStatus: 'marketing' | 'organization' | 'production' | 'quality_control' | 'ready_for_distribution') => {
    const { error } = await supabase
      .from('singles')
      .update({ production_status: newStatus })
      .eq('id', singleId);
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to update single production status: " + error.message,
        variant: "destructive"
      });
      return;
    }
    
    // Update local state
    setSingles(singles.map(single => 
      single.id === singleId ? { ...single, production_status: newStatus } : single
    ));
    
    toast({
      title: "Success",
      description: `Single production status updated to ${newStatus}`,
    });
  };

  const updateTrackStatus = async (trackId: string, newStatus: 'production' | 'draft' | 'distribute' | 'error' | 'published' | 'other') => {
    const { error } = await supabase
      .from('tracks')
      .update({ status: newStatus })
      .eq('id', trackId);
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to update track status: " + error.message,
        variant: "destructive"
      });
      return;
    }
    
    // Update local state
    setTracks(tracks.map(track => 
      track.id === trackId ? { ...track, status: newStatus } : track
    ));
    
    toast({
      title: "Success",
      description: `Track status updated to ${newStatus}`,
    });
  };

  const updateTrackProductionStatus = async (trackId: string, newStatus: 'marketing' | 'organization' | 'production' | 'quality_control' | 'ready_for_distribution') => {
    const { error } = await supabase
      .from('tracks')
      .update({ production_status: newStatus })
      .eq('id', trackId);
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to update track production status: " + error.message,
        variant: "destructive"
      });
      return;
    }
    
    // Update local state
    setTracks(tracks.map(track => 
      track.id === trackId ? { ...track, production_status: newStatus } : track
    ));
    
    toast({
      title: "Success",
      description: `Track production status updated to ${newStatus}`,
    });
  };

  const refreshAlbums = async () => {
    try {
      const { data, error } = await supabase
        .from('albums')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAlbums(data || [])
    } catch (error) {
      console.error('Error refreshing albums:', error)
    }
  }

  // Show compression options dialog
  const showCompressionOptions = (fileId: string, fileUrl: string, type: 'single' | 'album_track' | 'track') => {
    setCompressionFile({ id: fileId, url: fileUrl, type })
    setShowCompressionDialog(true)
  }

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
    // Tracks
    setLoadingTracks(true);
    supabase.from('tracks').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setTrackError(error.message);
        setTracks(data || []);
        setLoadingTracks(false);
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
        
    // Production Schedule
    loadProductionSchedule();
        
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

    if (newAdditionalCovers.some(c => c.uploading)) {
      setCreateAlbumError('Please wait for all additional covers to finish uploading.');
      return;
    }
    setCreatingAlbum(true);
    setCreateAlbumError(null);
    
    // Get the selected artist's name if label_artist_id is set
    const selectedArtist = selectedLabelArtistIdForAlbum 
      ? labelArtists.find(a => a.id === selectedLabelArtistIdForAlbum)
      : null;
    const artistName = selectedArtist 
      ? (selectedArtist.stage_name || selectedArtist.name)
      : newAlbum.artist;

    console.log('🔍 [LIBRARY CREATE ALBUM] Creating album:', {
      title: newAlbum.title,
      artist: artistName,
      label_artist_id: selectedLabelArtistIdForAlbum || null
    });

    // Filter out empty values to avoid database errors
    const albumData = {
      title: newAlbum.title,
      user_id: user.id,
      visibility: 'private', // Default to private
      ...(artistName && { artist: artistName }),
      ...(newAlbum.release_date && { release_date: newAlbum.release_date }),
      ...(newAlbum.cover_art_url && { cover_art_url: newAlbum.cover_art_url }),
      ...(newAlbum.description && { description: newAlbum.description }),
      additional_covers: newAdditionalCovers.filter(c => c.label && c.url).map(({ label, url }) => ({ label, url })),
      ...(selectedLabelArtistIdForAlbum && { label_artist_id: selectedLabelArtistIdForAlbum }),
    };

    const { data, error } = await supabase.from('albums').insert([albumData]).select('*').single();
    setCreatingAlbum(false);
    if (error) {
      console.error('🔍 [LIBRARY CREATE ALBUM] Error:', error);
      setCreateAlbumError(error.message);
      return;
    }
    console.log('🔍 [LIBRARY CREATE ALBUM] Album created:', data);
    setAlbums([data, ...albums]);
    setShowAlbumModal(false);
    setNewAlbum({ title: '', artist: '', release_date: '', cover_art_url: '', description: '' });
    setSelectedLabelArtistIdForAlbum('');
    setNewAdditionalCovers([]);
    
    // Redirect to album detail page
    if (data && data.id) {
      router.push(`/myalbums/${data.id}`);
    }
  }

  async function handleEditAlbum(e: React.FormEvent) {
    e.preventDefault();
    if (!editAlbumId) return;
    if (uploadingCover) {
      setEditError('Please wait for the cover art to finish uploading.');
      return;
    }

    if (editAdditionalCovers.some(c => c.uploading)) {
      setEditError('Please wait for all additional covers to finish uploading.');
      return;
    }
    setEditSaving(true);
    setEditError(null);
    // Filter out empty values to avoid database errors
    const updateData = {
      ...(editForm.title && { title: editForm.title }),
      ...(editForm.artist && { artist: editForm.artist }),
      ...(editForm.release_date && { release_date: editForm.release_date }),
      ...(editForm.cover_art_url && { cover_art_url: editForm.cover_art_url }),
      ...(editForm.description && { description: editForm.description }),
      additional_covers: editAdditionalCovers.filter(c => c.label && c.url).map(({ label, url }) => ({ label, url })),
    };

    const { error } = await supabase.from('albums').update(updateData).eq('id', editAlbumId);
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

  const [selectedTab, setSelectedTab] = useState(searchParams?.get('tab') || 'albums');
  
  // Check for openAlbum URL parameter to auto-open album modal
  useEffect(() => {
    if (searchParams?.get('openAlbum') === 'true') {
      setShowAlbumModal(true);
      // Remove the parameter from URL without reload
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.delete('openAlbum');
      const newUrl = `${window.location.pathname}${newSearchParams.toString() ? `?${newSearchParams.toString()}` : ''}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams]);
  
  const [albumPhaseTab, setAlbumPhaseTab] = useState('all');
  const [singlePhaseTab, setSinglePhaseTab] = useState('all');
  const [trackPhaseTab, setTrackPhaseTab] = useState('all');
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
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchFilter, setGlobalSearchFilter] = useState<'all' | 'albums' | 'singles' | 'tracks' | 'audio'>('all');

  // Production Schedule state
  const [productionScheduleItems, setProductionScheduleItems] = useState<ProductionScheduleItem[]>([]);
  const [loadingProductionSchedule, setLoadingProductionSchedule] = useState(false);
  const [productionScheduleError, setProductionScheduleError] = useState<string | null>(null);
  const [productionScheduleFilter, setProductionScheduleFilter] = useState<'all' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'>('all');
  const [expandedScheduleCards, setExpandedScheduleCards] = useState<{[key: string]: boolean}>({});

  const toggleScheduleCard = (itemId: string) => {
    setExpandedScheduleCards(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };
  const [showCreateScheduleItemDialog, setShowCreateScheduleItemDialog] = useState(false);
  const [newScheduleItem, setNewScheduleItem] = useState({
    title: '',
    description: '',
    type: 'collaboration' as const,
    priority: 'medium' as const,
    scheduled_date: '',
    due_date: '',
    assigned_to: '',
    collaborators: [] as string[],
    project_id: '',
    project_type: 'other' as const,
    notes: '',
    budget: '',
    currency: 'USD',
    location: '',
    equipment_needed: [] as string[],
    checklist: [] as ChecklistItem[]
  });
  const [scheduleItemCreating, setScheduleItemCreating] = useState(false);
  const [scheduleItemCreateError, setScheduleItemCreateError] = useState<string | null>(null);
  
  // Edit schedule item state
  const [showEditScheduleItemDialog, setShowEditScheduleItemDialog] = useState(false);
  const [editingScheduleItem, setEditingScheduleItem] = useState<ProductionScheduleItem | null>(null);
  const [editScheduleItemForm, setEditScheduleItemForm] = useState({
    title: '',
    description: '',
    type: 'collaboration' as 'collaboration' | 'song_production' | 'beat_production' | 'mixing' | 'mastering' | 'recording' | 'other',
    status: 'scheduled' as 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    scheduled_date: '',
    due_date: '',
    assigned_to: '',
    collaborators: [] as string[],
    project_id: '',
    project_type: 'other' as 'album' | 'single' | 'track' | 'other',
    notes: '',
    budget: '',
    currency: 'USD',
    location: '',
    equipment_needed: [] as string[],
    checklist: [] as ChecklistItem[]
  });
  const [scheduleItemUpdating, setScheduleItemUpdating] = useState(false);
  const [scheduleItemUpdateError, setScheduleItemUpdateError] = useState<string | null>(null);

  // Link project state
  const [showLinkProjectDialog, setShowLinkProjectDialog] = useState(false);
  const [linkingScheduleItem, setLinkingScheduleItem] = useState<ProductionScheduleItem | null>(null);
  const [linkProjectType, setLinkProjectType] = useState<'album' | 'single' | 'track'>('album');
  const [linkProjectSearchQuery, setLinkProjectSearchQuery] = useState('');
  const [linkProjectSearchResults, setLinkProjectSearchResults] = useState<{albums: Album[], singles: Single[], tracks: Track[]}>({
    albums: [],
    singles: [],
    tracks: []
  });
  const [linkProjectLoading, setLinkProjectLoading] = useState(false);
  const [linkProjectError, setLinkProjectError] = useState<string | null>(null);

  // Load production schedule items
  const loadProductionSchedule = async () => {
    if (!user?.id) return;
    
    setLoadingProductionSchedule(true);
    setProductionScheduleError(null);
    
    try {
      const { data, error } = await supabase
        .from('production_schedule')
        .select('*')
        .eq('user_id', user.id)
        .order('scheduled_date', { ascending: true });
      
      if (error) throw error;
      
      // Fetch linked project details for items that have project_id
      const itemsWithProjectDetails = await Promise.all(
        (data || []).map(async (item) => {
          if (item.project_id && item.project_type) {
            try {
              let projectData = null;
              
              if (item.project_type === 'album') {
                const { data: album } = await supabase
                  .from('albums')
                  .select('id, title, artist')
                  .eq('id', item.project_id)
                  .single();
                projectData = album;
              } else if (item.project_type === 'single') {
                const { data: single } = await supabase
                  .from('singles')
                  .select('id, title, artist')
                  .eq('id', item.project_id)
                  .single();
                projectData = single;
              } else if (item.project_type === 'track') {
                const { data: track } = await supabase
                  .from('tracks')
                  .select('id, title, artist')
                  .eq('id', item.project_id)
                  .single();
                projectData = track;
              }
              
              return {
                ...item,
                linkedProject: projectData
              };
            } catch (error) {
              console.error('Error fetching project details:', error);
              return item;
            }
          }
          return item;
        })
      );
      
      setProductionScheduleItems(itemsWithProjectDetails);
    } catch (error: any) {
      setProductionScheduleError(error.message);
      console.error('Error loading production schedule:', error);
    } finally {
      setLoadingProductionSchedule(false);
    }
  };

  // Create new production schedule item
  const createScheduleItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    
    setScheduleItemCreating(true);
    setScheduleItemCreateError(null);
    
    try {
      const { data, error } = await supabase
        .from('production_schedule')
        .insert({
          user_id: user.id,
          title: newScheduleItem.title,
          description: newScheduleItem.description || null,
          type: newScheduleItem.type,
          priority: newScheduleItem.priority,
          scheduled_date: newScheduleItem.scheduled_date,
          due_date: newScheduleItem.due_date,
          assigned_to: newScheduleItem.assigned_to || null,
          collaborators: newScheduleItem.collaborators.length > 0 ? newScheduleItem.collaborators : null,
          project_id: newScheduleItem.project_id || null,
          project_type: newScheduleItem.project_type,
          notes: newScheduleItem.notes || null,
          budget: newScheduleItem.budget ? parseFloat(newScheduleItem.budget) : null,
          currency: newScheduleItem.currency,
          location: newScheduleItem.location || null,
          equipment_needed: newScheduleItem.equipment_needed.length > 0 ? newScheduleItem.equipment_needed : null,
          checklist: newScheduleItem.checklist
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Add to local state
      setProductionScheduleItems([...productionScheduleItems, data]);
      
      // Reset form
      setNewScheduleItem({
        title: '',
        description: '',
        type: 'collaboration',
        priority: 'medium',
        scheduled_date: '',
        due_date: '',
        assigned_to: '',
        collaborators: [],
        project_id: '',
        project_type: 'other',
        notes: '',
        budget: '',
        currency: 'USD',
        location: '',
        equipment_needed: [],
        checklist: []
      });
      
      setShowCreateScheduleItemDialog(false);
      
      toast({
        title: "Success",
        description: "Production schedule item created successfully!",
      });
    } catch (error: any) {
      setScheduleItemCreateError(error.message);
      console.error('Error creating schedule item:', error);
    } finally {
      setScheduleItemCreating(false);
    }
  };

  // Open edit schedule item dialog
  const openEditScheduleItemDialog = (item: ProductionScheduleItem) => {
    setEditingScheduleItem(item);
    setEditScheduleItemForm({
      title: item.title,
      description: item.description || '',
      type: item.type,
      status: item.status,
      priority: item.priority,
      scheduled_date: item.scheduled_date,
      due_date: item.due_date,
      assigned_to: item.assigned_to || '',
      collaborators: item.collaborators || [],
      project_id: item.project_id || '',
      project_type: item.project_type || 'other',
      notes: item.notes || '',
      budget: item.budget ? item.budget.toString() : '',
      currency: item.currency || 'USD',
      location: item.location || '',
      equipment_needed: item.equipment_needed || [],
      checklist: item.checklist || []
    });
    setShowEditScheduleItemDialog(true);
  };

  // Update schedule item
  const updateScheduleItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !editingScheduleItem) return;
    
    setScheduleItemUpdating(true);
    setScheduleItemUpdateError(null);
    
    try {
      const { data, error } = await supabase
        .from('production_schedule')
        .update({
          title: editScheduleItemForm.title,
          description: editScheduleItemForm.description || null,
          type: editScheduleItemForm.type,
          status: editScheduleItemForm.status,
          priority: editScheduleItemForm.priority,
          scheduled_date: editScheduleItemForm.scheduled_date,
          due_date: editScheduleItemForm.due_date,
          assigned_to: editScheduleItemForm.assigned_to || null,
          collaborators: editScheduleItemForm.collaborators.length > 0 ? editScheduleItemForm.collaborators : null,
          project_id: editScheduleItemForm.project_id || null,
          project_type: editScheduleItemForm.project_type,
          notes: editScheduleItemForm.notes || null,
          budget: editScheduleItemForm.budget ? parseFloat(editScheduleItemForm.budget) : null,
          currency: editScheduleItemForm.currency,
          location: editScheduleItemForm.location || null,
          equipment_needed: editScheduleItemForm.equipment_needed.length > 0 ? editScheduleItemForm.equipment_needed : null,
          checklist: editScheduleItemForm.checklist,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingScheduleItem.id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Update local state
      setProductionScheduleItems(productionScheduleItems.map(item => 
        item.id === editingScheduleItem.id ? data : item
      ));
      
      setShowEditScheduleItemDialog(false);
      setEditingScheduleItem(null);
      
      toast({
        title: "Success",
        description: "Production schedule item updated successfully!",
      });
    } catch (error: any) {
      setScheduleItemUpdateError(error.message);
      console.error('Error updating schedule item:', error);
    } finally {
      setScheduleItemUpdating(false);
    }
  };

  // Get schedule status color
  const getScheduleStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-600 hover:bg-blue-700 text-white'
      case 'in_progress': return 'bg-yellow-600 hover:bg-yellow-700 text-white'
      case 'completed': return 'bg-green-600 hover:bg-green-700 text-white'
      case 'cancelled': return 'bg-red-600 hover:bg-red-700 text-white'
      case 'on_hold': return 'bg-gray-600 hover:bg-gray-700 text-white'
      default: return 'bg-gray-600 hover:bg-gray-700 text-white'
    }
  }

  // Update schedule item status
  const updateScheduleItemStatus = async (itemId: string, newStatus: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold') => {
    try {
      const { error } = await supabase
        .from('production_schedule')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId);
      
      if (error) throw error;
      
      // Update local state
      setProductionScheduleItems(productionScheduleItems.map(item => 
        item.id === itemId ? { ...item, status: newStatus } : item
      ));
      
      toast({
        title: "Status Updated",
        description: `Status changed to ${newStatus.replace('_', ' ')}`,
      });
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive"
      });
    }
  };

  // Update schedule item priority
  const updateScheduleItemPriority = async (itemId: string, newPriority: 'low' | 'medium' | 'high' | 'urgent') => {
    try {
      const { error } = await supabase
        .from('production_schedule')
        .update({ 
          priority: newPriority,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId);
      
      if (error) throw error;
      
      // Update local state
      setProductionScheduleItems(productionScheduleItems.map(item => 
        item.id === itemId ? { ...item, priority: newPriority } : item
      ));
      
      toast({
        title: "Priority Updated",
        description: `Priority changed to ${newPriority}`,
      });
    } catch (error: any) {
      console.error('Error updating priority:', error);
      toast({
        title: "Error",
        description: "Failed to update priority",
        variant: "destructive"
      });
    }
  };

  // Delete schedule item
  const deleteScheduleItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this schedule item?')) return;
    
    try {
      const { error } = await supabase
        .from('production_schedule')
        .delete()
        .eq('id', itemId);
      
      if (error) throw error;
      
      // Remove from local state
      setProductionScheduleItems(productionScheduleItems.filter(item => item.id !== itemId));
      
      toast({
        title: "Success",
        description: "Production schedule item deleted successfully!",
      });
    } catch (error: any) {
      console.error('Error deleting schedule item:', error);
      toast({
        title: "Error",
        description: "Failed to delete schedule item",
        variant: "destructive"
      });
    }
  };

  // Link project functions
  const openLinkProjectDialog = (item: ProductionScheduleItem) => {
    setLinkingScheduleItem(item);
    setLinkProjectType('album');
    setLinkProjectSearchQuery('');
    setLinkProjectSearchResults({ albums: [], singles: [], tracks: [] });
    setShowLinkProjectDialog(true);
    
    // Automatically load all projects when dialog opens
    setTimeout(() => {
      searchProjects('', 'all');
    }, 100);
  };

  const searchProjects = async (query: string, type: 'album' | 'single' | 'track' | 'all') => {
    if (!user?.id) {
      setLinkProjectSearchResults({ albums: [], singles: [], tracks: [] });
      return;
    }

    setLinkProjectLoading(true);
    setLinkProjectError(null);

    try {
      let results: { albums: any[], singles: any[], tracks: any[] } = { albums: [], singles: [], tracks: [] };

      if (type === 'album' || type === 'all') {
        const { data: albums } = await supabase
          .from('albums')
          .select('id, title, artist, release_date')
          .eq('user_id', user.id)
          .ilike('title', query ? `%${query}%` : '%')
          .limit(20);
        results.albums = albums || [];
      }

      if (type === 'single' || type === 'all') {
        const { data: singles } = await supabase
          .from('singles')
          .select('id, title, artist, release_date, session_id, session_name')
          .eq('user_id', user.id)
          .ilike('title', query ? `%${query}%` : '%')
          .limit(20);
        results.singles = singles || [];
        console.log('Singles with sessions:', singles);
      }

      if (type === 'track' || type === 'all') {
        const { data: tracks } = await supabase
          .from('tracks')
          .select('id, title, artist, release_date, session_id, session_name')
          .eq('user_id', user.id)
          .ilike('title', query ? `%${query}%` : '%')
          .limit(20);
        results.tracks = tracks || [];
        console.log('Tracks with sessions:', tracks);
      }

      setLinkProjectSearchResults(results);
    } catch (error: any) {
      setLinkProjectError(error.message);
      console.error('Error searching projects:', error);
    } finally {
      setLinkProjectLoading(false);
    }
  };

  const linkProjectToSchedule = async (projectId: string, projectType: 'album' | 'single' | 'track') => {
    if (!linkingScheduleItem) return;

    try {
      const { error } = await supabase
        .from('production_schedule')
        .update({
          project_id: projectId,
          project_type: projectType
        })
        .eq('id', linkingScheduleItem.id);

      if (error) throw error;

      // Update local state
      setProductionScheduleItems(prev => prev.map(item => 
        item.id === linkingScheduleItem.id 
          ? { ...item, project_id: projectId, project_type: projectType }
          : item
      ));

      setShowLinkProjectDialog(false);
      setLinkingScheduleItem(null);

      toast({
        title: "Success",
        description: `Project linked to schedule item successfully!`,
      });
    } catch (error: any) {
      console.error('Error linking project:', error);
      toast({
        title: "Error",
        description: "Failed to link project",
        variant: "destructive"
      });
    }
  };

  const unlinkProjectFromSchedule = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('production_schedule')
        .update({
          project_id: null,
          project_type: null
        })
        .eq('id', itemId);

      if (error) throw error;

      // Update local state
      setProductionScheduleItems(prev => prev.map(item => 
        item.id === itemId 
          ? { ...item, project_id: undefined, project_type: undefined }
          : item
      ));

      toast({
        title: "Success",
        description: "Project unlinked from schedule item successfully!",
      });
    } catch (error: any) {
      console.error('Error unlinking project:', error);
      toast({
        title: "Error",
        description: "Failed to unlink project",
        variant: "destructive"
      });
    }
  };

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

  // Upload single audio file
  const uploadSingleAudio = async (file: File, singleId: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${singleId}-${Date.now()}.${fileExt}`
      const filePath = `singles/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('beats')
        .upload(filePath, file)

      if (uploadError) {
        console.error('Error uploading single audio:', uploadError)
        return null
      }

      const { data } = supabase.storage
        .from('beats')
        .getPublicUrl(filePath)

      return data.publicUrl
    } catch (error) {
      console.error('Error uploading single audio:', error)
      return null
    }
  }

  const uploadTrackAudio = async (file: File, trackId: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${trackId}-${Date.now()}.${fileExt}`
      const filePath = `tracks/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('beats')
        .upload(filePath, file)

      if (uploadError) {
        console.error('Error uploading track audio:', uploadError)
        return null
      }

      const { data } = supabase.storage
        .from('beats')
        .getPublicUrl(filePath)

      return data.publicUrl
    } catch (error) {
      console.error('Error uploading track audio:', error)
      return null
    }
  }

  // Replace single audio file
  const replaceSingleAudio = async (singleId: string, file: File) => {
    try {
      setReplacingSingleId(singleId);
      const audioUrl = await uploadSingleAudio(file, singleId)
      if (!audioUrl) {
        toast({
          title: "Error",
          description: "Failed to upload audio file.",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('singles')
        .update({ audio_url: audioUrl })
        .eq('id', singleId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update single audio: " + error.message,
          variant: "destructive"
        });
        return;
      }

      // Update local state
      setSingles(singles.map(single => 
        single.id === singleId ? { ...single, audio_url: audioUrl } : single
      ));

      toast({
        title: "Success",
        description: "Audio file replaced successfully.",
      });
      
      // Add to recently replaced set
      setRecentlyReplacedSingles(prev => new Set([...prev, singleId]));
    } catch (error) {
      console.error('Error replacing single audio:', error);
      toast({
        title: "Error",
        description: "Failed to replace audio file.",
        variant: "destructive"
      });
    } finally {
      setReplacingSingleId(null);
    }
  }

  const replaceTrackAudio = async (trackId: string, file: File) => {
    try {
      setReplacingTrackId(trackId);
      const audioUrl = await uploadTrackAudio(file, trackId)
      if (!audioUrl) {
        toast({
          title: "Error",
          description: "Failed to upload audio file.",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('tracks')
        .update({ audio_url: audioUrl })
        .eq('id', trackId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update track audio: " + error.message,
          variant: "destructive"
        });
        return;
      }

      // Update local state
      setTracks(tracks.map(track => 
        track.id === trackId ? { ...track, audio_url: audioUrl } : track
      ));

      toast({
        title: "Success",
        description: "Audio file replaced successfully.",
      });
      
      // Add to recently replaced set
      setRecentlyReplacedTracks(prev => new Set([...prev, trackId]));
    } catch (error) {
      console.error('Error replacing track audio:', error);
      toast({
        title: "Error",
        description: "Failed to replace audio file.",
        variant: "destructive"
      });
    } finally {
      setReplacingTrackId(null);
    }
  };

  // Replace album track audio file
  // Cover management functions
  const uploadCoverArtForReplacement = async (file: File, itemId: string, type: 'album' | 'single' | 'track'): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${type}_covers/${itemId}_${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('beats').upload(filePath, file, { upsert: true });
      if (error) {
        console.error('Error uploading cover art:', error);
        return null;
      }
      const { data } = supabase.storage.from('beats').getPublicUrl(filePath);
      return data?.publicUrl || null;
    } catch (error) {
      console.error('Error uploading cover art:', error);
      return null;
    }
  };

  const replaceCoverArt = async (itemId: string, file: File, type: 'album' | 'single' | 'track') => {
    try {
      setReplacingCoverId(itemId);
      setReplacingCoverType(type);
      
      const coverUrl = await uploadCoverArtForReplacement(file, itemId, type);
      if (!coverUrl) {
        toast({
          title: "Error",
          description: "Failed to upload cover art.",
          variant: "destructive"
        });
        return;
      }

      const table = type === 'album' ? 'albums' : type === 'single' ? 'singles' : 'tracks';
      const { error } = await supabase
        .from(table)
        .update({ cover_art_url: coverUrl })
        .eq('id', itemId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update cover art: " + error.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: "Cover art replaced successfully.",
      });
      
      // Refresh data
      if (type === 'album') {
        refreshAlbums();
      } else {
        refreshSingles();
      }
    } catch (error) {
      console.error('Error replacing cover art:', error);
      toast({
        title: "Error",
        description: "Failed to replace cover art.",
        variant: "destructive"
      });
    } finally {
      setReplacingCoverId(null);
      setReplacingCoverType(null);
    }
  };

  const deleteCoverArt = async (itemId: string, type: 'album' | 'single' | 'track') => {
    try {
      const table = type === 'album' ? 'albums' : type === 'single' ? 'singles' : 'tracks';
      const { error } = await supabase
        .from(table)
        .update({ cover_art_url: null })
        .eq('id', itemId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to delete cover art: " + error.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: "Cover art deleted successfully.",
      });
      
      // Refresh data
      if (type === 'album') {
        refreshAlbums();
      } else {
        refreshSingles();
      }
    } catch (error) {
      console.error('Error deleting cover art:', error);
      toast({
        title: "Error",
        description: "Failed to delete cover art.",
        variant: "destructive"
      });
    }
  };

  const replaceAlbumTrackAudio = async (trackId: string, file: File) => {
    try {
      setReplacingAlbumTrackId(trackId);
      const audioUrl = await uploadSingleAudio(file, trackId) // Reuse the same upload function
      if (!audioUrl) {
        toast({
          title: "Error",
          description: "Failed to upload audio file.",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('album_tracks')
        .update({ audio_url: audioUrl })
        .eq('id', trackId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update album track audio: " + error.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: "Album track audio file replaced successfully.",
      });
      
      // Add to recently replaced set
      setRecentlyReplacedAlbumTracks(prev => new Set([...prev, trackId]));
    } catch (error) {
      console.error('Error replacing album track audio:', error);
      toast({
        title: "Error",
        description: "Failed to replace album track audio file.",
        variant: "destructive"
      });
    } finally {
      setReplacingAlbumTrackId(null);
    }
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
  
  // Handle pack name editing
  function startEditingPackName(packId: string, currentName: string) {
    setEditingPackName(packId);
    setEditingPackNameValue(currentName);
  }

  async function savePackName(packId: string) {
    if (!editingPackNameValue.trim()) {
      setEditingPackName(null);
      return;
    }

    try {
      const { error } = await supabase
        .from('audio_packs')
        .update({ name: editingPackNameValue.trim() })
        .eq('id', packId);

      if (error) {
        console.error('Error updating pack name:', error);
        return;
      }

      // Update local state
      setAudioPacks(prev => prev.map(pack => 
        pack.id === packId 
          ? { ...pack, name: editingPackNameValue.trim() }
          : pack
      ));

      console.log('Pack name updated successfully');
    } catch (error) {
      console.error('Error updating pack name:', error);
    } finally {
      setEditingPackName(null);
      setEditingPackNameValue('');
    }
  }

  function cancelEditingPackName() {
    setEditingPackName(null);
    setEditingPackNameValue('');
  }

  // Handle pack description editing
  function startEditingPackDescription(packId: string, currentDescription: string) {
    setEditingPackDescription(packId);
    setEditingPackDescriptionValue(currentDescription || '');
  }

  async function savePackDescription(packId: string) {
    try {
      const { error } = await supabase
        .from('audio_packs')
        .update({ description: editingPackDescriptionValue.trim() || null })
        .eq('id', packId);

      if (error) {
        console.error('Error updating pack description:', error);
        return;
      }

      // Update local state
      setAudioPacks(prev => prev.map(pack => 
        pack.id === packId 
          ? { ...pack, description: editingPackDescriptionValue.trim() || null }
          : pack
      ));

      console.log('Pack description updated successfully');
    } catch (error) {
      console.error('Error updating pack description:', error);
    } finally {
      setEditingPackDescription(null);
      setEditingPackDescriptionValue('');
    }
  }

  function cancelEditingPackDescription() {
    setEditingPackDescription(null);
    setEditingPackDescriptionValue('');
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

  // Global search functions
  const getFilteredAlbumsForSearch = () => {
    if (!globalSearchQuery.trim()) return getFilteredAlbums();
    
    const query = globalSearchQuery.toLowerCase().trim();
    const phaseFiltered = getFilteredAlbums();
    
    return phaseFiltered.filter(album => 
      album.title.toLowerCase().includes(query) ||
      album.artist.toLowerCase().includes(query) ||
      (album.description && album.description.toLowerCase().includes(query)) ||
      (album.status && album.status.toLowerCase().includes(query)) ||
      (album.production_status && album.production_status.toLowerCase().includes(query))
    );
  };

  const getFilteredSinglesForSearch = () => {
    if (!globalSearchQuery.trim()) return getFilteredSingles();
    
    const query = globalSearchQuery.toLowerCase().trim();
    const phaseFiltered = getFilteredSingles();
    
    return phaseFiltered.filter(single => 
      single.title.toLowerCase().includes(query) ||
      single.artist.toLowerCase().includes(query) ||
      (single.description && single.description.toLowerCase().includes(query)) ||
      (single.status && single.status.toLowerCase().includes(query)) ||
      (single.production_status && single.production_status.toLowerCase().includes(query)) ||
      (single.session_name && single.session_name.toLowerCase().includes(query))
    );
  };

  const getFilteredTracksForSearch = () => {
    if (!globalSearchQuery.trim()) return getFilteredTracks();
    
    const query = globalSearchQuery.toLowerCase().trim();
    const phaseFiltered = getFilteredTracks();
    
    return phaseFiltered.filter(track => 
      track.title.toLowerCase().includes(query) ||
      track.artist.toLowerCase().includes(query) ||
      (track.description && track.description.toLowerCase().includes(query)) ||
      (track.status && track.status.toLowerCase().includes(query)) ||
      (track.production_status && track.production_status.toLowerCase().includes(query)) ||
      (track.session_name && track.session_name.toLowerCase().includes(query)) ||
      (track.genre && track.genre.toLowerCase().includes(query)) ||
      (track.subgenre && track.subgenre.toLowerCase().includes(query))
    );
  };

  const getFilteredAudioItemsForSearch = () => {
    if (!globalSearchQuery.trim()) return getFilteredAudioItems(audioItems);
    
    const query = globalSearchQuery.toLowerCase().trim();
    const phaseFiltered = getFilteredAudioItems(audioItems);
    
    return phaseFiltered.filter(item => 
      item.name.toLowerCase().includes(query) ||
      item.type.toLowerCase().includes(query) ||
      (item.audio_type && item.audio_type.toLowerCase().includes(query)) ||
      (item.genre && item.genre.toLowerCase().includes(query)) ||
      (item.subgenre && item.subgenre.toLowerCase().includes(query)) ||
      (item.tags && item.tags.some(tag => tag.toLowerCase().includes(query))) ||
      (item.description && item.description.toLowerCase().includes(query)) ||
      (item.bpm && item.bpm.toString().includes(query)) ||
      (item.key && item.key.toLowerCase().includes(query))
    );
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

  // Download single function
  const downloadSingle = async (singleId: string, audioUrl: string, title: string) => {
    try {
      const response = await fetch(audioUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch audio file');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}.${audioUrl.split('.').pop() || 'mp3'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download started",
        description: `${title} is being downloaded.`,
      });
    } catch (error) {
      console.error('Error downloading single:', error);
      toast({
        title: "Download failed",
        description: "Failed to download the audio file. Please try again.",
        variant: "destructive"
      });
    }
  };

  const downloadAlbum = async (albumId: string, albumTitle: string) => {
    try {
      // Fetch album tracks
      const { data: tracks, error } = await supabase
        .from('album_tracks')
        .select('*')
        .eq('album_id', albumId);

      if (error) {
        throw error;
      }

      if (!tracks || tracks.length === 0) {
        toast({
          title: "No tracks available",
          description: "This album has no tracks to download.",
          variant: "destructive"
        });
        return;
      }

      const tracksWithAudio = tracks.filter(track => track.audio_url);
      if (tracksWithAudio.length === 0) {
        toast({
          title: "No audio files available",
          description: "This album has no audio files to download.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Download started",
        description: `Downloading ${tracksWithAudio.length} tracks from ${albumTitle}...`,
      });

      // Download each track individually
      for (const track of tracksWithAudio) {
        try {
          const response = await fetch(track.audio_url);
          if (!response.ok) {
            console.warn(`Failed to fetch track: ${track.title}`);
            continue;
          }
          
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${albumTitle} - ${track.title}.${track.audio_url.split('.').pop() || 'mp3'}`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          
          // Small delay to prevent browser from blocking multiple downloads
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Error downloading track ${track.title}:`, error);
        }
      }

      toast({
        title: "Download completed",
        description: `All tracks from ${albumTitle} have been downloaded.`,
      });
    } catch (error) {
      console.error('Error downloading album:', error);
      toast({
        title: "Download failed",
        description: "Failed to download the album. Please try again.",
        variant: "destructive"
      });
    }
  };

  const downloadTrack = async (trackId: string, audioUrl: string, title: string) => {
    try {
      const response = await fetch(audioUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch audio file');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}.${audioUrl.split('.').pop() || 'mp3'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download completed",
        description: `${title} has been downloaded successfully.`,
      });
    } catch (error) {
      console.error('Error downloading track:', error);
      toast({
        title: "Download failed",
        description: "Failed to download the track. Please try again.",
        variant: "destructive"
      });
    }
  };

  const openMetadataDialog = async (trackId: string, trackType: 'single' | 'album_track' | 'track') => {
    try {
      const table = trackType === 'single' ? 'singles' : 'album_tracks';
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', trackId)
        .single();

      if (error) throw error;

      // Extract metadata fields
      const metadata = {
        distributor: data.distributor,
        deadline_to_distribute: data.deadline_to_distribute,
        performing_artists: data.performing_artists,
        producers: data.producers,
        engineers: data.engineers,
        copyright_info: data.copyright_info,
        songwriter: data.songwriter,
        release_date: data.release_date,
        label: data.label,
        upc: data.upc,
        primary_genre: data.primary_genre,
        language: data.language,
        release_id: data.release_id,
        isrc: data.isrc,
        recording_location: data.recording_location,
        mix_engineer: data.mix_engineer,
        mastering_engineer: data.mastering_engineer,
        publishing_rights: data.publishing_rights,
        mechanical_rights: data.mechanical_rights,
        territory: data.territory,
        explicit_content: data.explicit_content,
        parental_advisory: data.parental_advisory
      };

      setEditingMetadata(metadata || {});
      setEditingTrackId(trackId);
      setEditingTrackType(trackType);
      setShowMetadataDialog(true);
    } catch (error) {
      console.error('Error loading metadata:', error);
      toast({
        title: "Error",
        description: "Failed to load metadata.",
        variant: "destructive"
      });
    }
  }

  const saveMetadata = async (metadata: any) => {
    try {
      const table = editingTrackType === 'single' ? 'singles' : 'album_tracks';
      const { error } = await supabase
        .from(table)
        .update(metadata)
        .eq('id', editingTrackId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Metadata saved successfully.",
      });

      // Refresh the data
      if (editingTrackType === 'single') {
        await refreshSingles();
      } else {
        await refreshAlbums();
      }
    } catch (error) {
      console.error('Error saving metadata:', error);
      toast({
        title: "Error",
        description: "Failed to save metadata.",
        variant: "destructive"
      });
    }
  }

  const openNotesDialog = async (itemId: string, itemType: 'album' | 'single' | 'album_track' | 'track', itemTitle: string) => {
    try {
              const table = itemType === 'album' ? 'albums' : itemType === 'single' ? 'singles' : itemType === 'track' ? 'tracks' : 'album_tracks';
      const { data, error } = await supabase
        .from(table)
        .select('notes')
        .eq('id', itemId)
        .single();

      if (error) throw error;

      setEditingNotes(data.notes || '');
      setEditingNotesId(itemId);
      setEditingNotesType(itemType);
      setEditingNotesTitle(itemTitle);
      setShowNotesDialog(true);
    } catch (error) {
      console.error('Error loading notes:', error);
      toast({
        title: "Error",
        description: "Failed to load notes.",
        variant: "destructive"
      });
    }
  }

  const saveNotes = async (notes: string) => {
    try {
      const table = editingNotesType === 'album' ? 'albums' : editingNotesType === 'single' ? 'singles' : editingNotesType === 'track' ? 'tracks' : 'album_tracks';
      const { error } = await supabase
        .from(table)
        .update({ notes })
        .eq('id', editingNotesId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Notes saved successfully.",
      });

      // Refresh the data
      if (editingNotesType === 'single') {
        await refreshSingles();
      } else if (editingNotesType === 'album') {
        await refreshAlbums();
      } else if (editingNotesType === 'track') {
        await refreshTracks();
      }
    } catch (error) {
      console.error('Error saving notes:', error);
      toast({
        title: "Error",
        description: "Failed to save notes.",
        variant: "destructive"
      });
    }
  }

  // Function to open audio file in loop editor
  const openInLoopEditor = async (audioUrl: string, fileName: string, bpm?: number) => {
    try {
      // Get user session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast({
          title: "Authentication Error",
          description: "Please log in to open files in loop editor.",
          variant: "destructive",
        })
        return
      }

      // Create a unique filename for the session
      const timestamp = Date.now()
      const sessionFileName = `${fileName}-${timestamp}.wav`
      
      // Create a loop-editor session
      const sessionData = {
        name: `Library File - ${fileName}`,
        audio_file_name: sessionFileName,
        audio_file_url: audioUrl,
        bpm: bpm || 120, // Default BPM if not provided
        markers: [],
        regions: [],
        user_id: session.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Save the session to the database
      const { data: savedSession, error: sessionError } = await supabase
        .from('loop_editor_sessions')
        .insert([sessionData])
        .select()
        .single()

      if (sessionError) {
        console.error('[OPEN IN LOOP EDITOR] Session save error:', sessionError)
        toast({
          title: "Session Save Failed",
          description: "Failed to create loop editor session.",
          variant: "destructive",
        })
        return
      }

      console.log('[OPEN IN LOOP EDITOR] Session saved:', savedSession)

      // Navigate to loop-editor with the session ID
      const loopEditorUrl = `/loop-editor?loop-session=${savedSession.id}`
      console.log('[OPEN IN LOOP EDITOR] Navigating to:', loopEditorUrl)
      router.push(loopEditorUrl)

    } catch (error) {
      console.error('[OPEN IN LOOP EDITOR] Error:', error)
      toast({
        title: "Error",
        description: "Failed to open file in loop editor. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Move single function
  const handleMoveSingle = async (singleId: string, singleTitle: string) => {
    setMoveSingleId(singleId)
    setMoveSingleTitle(singleTitle)
    setMoveSingleError(null)
    
    try {
      // Fetch available albums
      const { data: albums, error } = await supabase
        .from('albums')
        .select('id, title')
        .order('title')

      if (error) {
        throw error
      }

      setAvailableAlbums(albums || [])
      setShowMoveSingleDialog(true)
    } catch (error) {
      console.error('Error fetching albums:', error)
      toast({
        title: "Error",
        description: "Failed to load available albums",
        variant: "destructive",
      })
    }
  }

  // Move track function
  const handleMoveTrack = async (trackId: string, trackTitle: string) => {
    setMoveTrackId(trackId)
    setMoveTrackTitle(trackTitle)
    setMoveTrackType('single')
    setSelectedTargetAlbumForTrack('')
    setMoveTrackError(null)
    
    try {
      // Fetch available albums
      const { data: albums, error } = await supabase
        .from('albums')
        .select('id, title')
        .order('title')

      if (error) {
        throw error
      }

      setAvailableAlbums(albums || [])
      setShowMoveTrackDialog(true)
    } catch (error) {
      console.error('Error fetching albums:', error)
      toast({
        title: "Error",
        description: "Failed to load available albums",
        variant: "destructive",
      })
    }
  }

  // Execute move single
  const executeMoveSingle = async () => {
    if (!moveSingleId) return

    setMovingSingle(true)
    setMoveSingleError(null)

    try {
      // Get the single data
      const singleToMove = singles.find(single => single.id === moveSingleId)
      if (!singleToMove) {
        throw new Error('Single not found')
      }

      if (moveToTracks) {
        // Move to tracks table
        const { error: trackError } = await supabase
          .from('tracks')
          .insert([{
            title: singleToMove.title,
            artist: singleToMove.artist,
            release_date: singleToMove.release_date,
            audio_url: singleToMove.audio_url,
            duration: singleToMove.duration,
            description: singleToMove.description,
            session_id: singleToMove.session_id,
            status: 'draft',
            user_id: (await supabase.auth.getUser()).data.user?.id
          }])

        if (trackError) {
          throw trackError
        }

        toast({
          title: "Success",
          description: `Single "${singleToMove.title}" moved to tracks successfully!`,
        })
      } else if (selectedTargetAlbum) {
        // Move to album as a track
        // Get the next track order for this album
        const { data: existingTracks } = await supabase
          .from('album_tracks')
          .select('track_order')
          .eq('album_id', selectedTargetAlbum)
          .order('track_order', { ascending: false })
          .limit(1);

        const nextTrackOrder = existingTracks && existingTracks.length > 0 
          ? (existingTracks[0].track_order || 0) + 1 
          : 1;

        const { error: albumError } = await supabase
          .from('album_tracks')
          .insert([{
            album_id: selectedTargetAlbum,
            title: singleToMove.title,
            audio_url: singleToMove.audio_url,
            duration: singleToMove.duration,
            session_id: singleToMove.session_id,
            status: 'draft',
            track_order: nextTrackOrder
          }])

        if (albumError) {
          throw albumError
        }

        toast({
          title: "Success",
          description: `Single "${singleToMove.title}" moved to album successfully!`,
        })
      } else {
        throw new Error('Please select a destination')
      }

      // Delete the single from singles table
      const { error: deleteError } = await supabase
        .from('singles')
        .delete()
        .eq('id', moveSingleId)

      if (deleteError) {
        throw deleteError
      }

      // Remove single from local state
      setSingles(prev => prev.filter(single => single.id !== moveSingleId))
      
      // Close dialog and reset state
      setShowMoveSingleDialog(false)
      setMoveSingleId(null)
      setMoveSingleTitle('')
      setSelectedTargetAlbum('')
      setMoveToTracks(false)

    } catch (error) {
      console.error('Error moving single:', error)
      setMoveSingleError(error instanceof Error ? error.message : 'Failed to move single')
      toast({
        title: "Error",
        description: "Failed to move single",
        variant: "destructive",
      })
    } finally {
      setMovingSingle(false)
    }
  }

  // Execute move track
  const executeMoveTrack = async () => {
    if (!moveTrackId || !user?.id) return

    setMovingTrack(true)
    setMoveTrackError(null)

    try {
      // Get the track data
      const trackToMove = tracks.find(track => track.id === moveTrackId)
      if (!trackToMove) {
        throw new Error('Track not found')
      }

      if ((moveTrackType || 'single') === 'single') {
        // Move to singles table
        const { error: singleError } = await supabase
          .from('singles')
          .insert([{
            title: trackToMove.title,
            artist: trackToMove.artist,
            release_date: trackToMove.release_date,
            audio_url: trackToMove.audio_url,
            cover_art_url: trackToMove.cover_art_url,
            duration: trackToMove.duration,
            description: trackToMove.description,
            session_id: trackToMove.session_id,
            status: 'draft',
            user_id: user.id
          }])

        if (singleError) {
          throw singleError
        }

        toast({
          title: "Success",
          description: `Track "${trackToMove.title}" moved to singles successfully!`,
        })
      } else if (selectedTargetAlbumForTrack && (moveTrackType || 'single') === 'album_track') {
        // Move to album as a track
        // Get the next track order for this album
        const { data: existingTracks } = await supabase
          .from('album_tracks')
          .select('track_order')
          .eq('album_id', selectedTargetAlbumForTrack)
          .order('track_order', { ascending: false })
          .limit(1);

        const nextTrackOrder = existingTracks && existingTracks.length > 0 
          ? (existingTracks[0].track_order || 0) + 1 
          : 1;

        const { error: albumError } = await supabase
          .from('album_tracks')
          .insert([{
            album_id: selectedTargetAlbumForTrack,
            title: trackToMove.title,
            audio_url: trackToMove.audio_url,
            duration: trackToMove.duration,
            session_id: trackToMove.session_id,
            status: 'draft',
            track_order: nextTrackOrder
          }])

        if (albumError) {
          throw albumError
        }

        toast({
          title: "Success",
          description: `Track "${trackToMove.title}" moved to album successfully!`,
        })
      } else {
        throw new Error('Please select a destination')
      }

      // Delete the track from tracks table
      const { error: deleteError } = await supabase
        .from('tracks')
        .delete()
        .eq('id', moveTrackId)

      if (deleteError) {
        throw deleteError
      }

      // Remove track from local state
      setTracks(prev => prev.filter(track => track.id !== moveTrackId))
      
      // Close dialog and reset state
      setShowMoveTrackDialog(false)
      setMoveTrackId(null)
      setMoveTrackTitle('')
      setSelectedTargetAlbumForTrack('')
      setMoveTrackType('single')

    } catch (error) {
      console.error('Error moving track:', error)
      setMoveTrackError(error instanceof Error ? error.message : 'Failed to move track')
      toast({
        title: "Error",
        description: "Failed to move track",
        variant: "destructive",
      })
    } finally {
      setMovingTrack(false)
    }
  }

  return (
    <div className="container mx-auto py-4 sm:py-8 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">My Library</h1>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          {/* Global Search */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search all content..."
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                className="pl-10 w-full sm:w-64 bg-zinc-900 border-zinc-700 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <Select value={globalSearchFilter} onValueChange={(value: 'all' | 'albums' | 'singles' | 'audio') => setGlobalSearchFilter(value)}>
              <SelectTrigger className="w-full sm:w-32 bg-zinc-900 border-zinc-700 text-white focus:border-blue-500 focus:ring-blue-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="albums">Albums</SelectItem>
                <SelectItem value="singles">Singles</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Navigate to Artist List Button */}
          <Button 
            onClick={() => {
              window.location.href = '/artistlist'
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Artist Management
          </Button>
          
          {/* Navigate to MP4 Converter Button */}
          <Button 
            onClick={() => {
              window.location.href = '/mp4converter'
            }}
            className="bg-purple-600 hover:bg-purple-700 text-white w-full sm:w-auto"
          >
            <Video className="h-4 w-4 mr-2" />
            MP4 Converter
          </Button>
          
          {/* Action Buttons */}
          {selectedTab === 'albums' && albumPhaseTab === 'all' && (
            <Button className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-4 sm:px-6 py-2 rounded w-full sm:w-auto" onClick={() => setShowAlbumModal(true)}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add New Album</span>
              <span className="sm:hidden">Add Album</span>
            </Button>
          )}
          {selectedTab === 'audio' && (
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-4 sm:px-6 py-2 rounded w-full sm:w-auto" onClick={() => setShowAudioModal(true)}>
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Audio</span>
                <span className="sm:hidden">Add Audio</span>
              </Button>
              <Button className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 sm:px-6 py-2 rounded w-full sm:w-auto" onClick={() => setShowPackModal(true)}>
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Create Pack</span>
                <span className="sm:hidden">Create Pack</span>
              </Button>
            </div>
          )}
        </div>
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
            <div>
              <Label htmlFor="album-artist">Artist</Label>
              <Select
                value={selectedLabelArtistIdForAlbum || "none"}
                onValueChange={(value) => {
                  console.log('🔍 [LIBRARY ALBUM SELECT] Value changed:', value);
                  const artistId = value === "none" ? "" : value;
                  console.log('🔍 [LIBRARY ALBUM SELECT] Setting selectedLabelArtistIdForAlbum to:', artistId);
                  setSelectedLabelArtistIdForAlbum(artistId);
                  // Also set the artist name for display
                  if (artistId) {
                    const selectedArtist = labelArtists.find(a => a.id === artistId);
                    if (selectedArtist) {
                      setNewAlbum({ ...newAlbum, artist: selectedArtist.stage_name || selectedArtist.name });
                    }
                  } else {
                    setNewAlbum({ ...newAlbum, artist: '' });
                  }
                }}
                disabled={loadingLabelArtists}
              >
                <SelectTrigger id="album-artist">
                  <SelectValue placeholder={loadingLabelArtists ? "Loading artists..." : "Select an artist"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {labelArtists.map((artist) => (
                    <SelectItem key={artist.id} value={artist.id}>
                      {artist.stage_name || artist.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            
            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="Distributor (e.g., DistroKid, TuneCore)"
                value={editForm.distributor || ''}
                onChange={e => setEditForm({ ...editForm, distributor: e.target.value })}
              />
              <Input
                placeholder="Distributor Notes"
                value={editForm.distributor_notes || ''}
                onChange={e => setEditForm({ ...editForm, distributor_notes: e.target.value })}
              />
            </div>
            
            <Textarea
              placeholder="General Notes"
              value={editForm.notes || ''}
              onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
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
      
      {/* Global Search Results */}
      {globalSearchQuery.trim() && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              Search Results for "{globalSearchQuery}"
            </h2>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setGlobalSearchQuery('')}
            >
              Clear Search
            </Button>
          </div>
          
          {/* Show results based on filter */}
          {(globalSearchFilter === 'all' || globalSearchFilter === 'albums') && getFilteredAlbumsForSearch().length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3 text-gray-300">Albums ({getFilteredAlbumsForSearch().length})</h3>
              <div className="space-y-4">
                {getFilteredAlbumsForSearch().slice(0, 3).map(album => (
                  <Card key={album.id} className="p-4">
                    <div className="flex gap-4">
                      {album.cover_art_url ? (
                        <img src={album.cover_art_url} alt={album.title} className="w-16 h-16 object-cover rounded-lg" />
                      ) : (
                        <img src="/placeholder.jpg" alt="No cover art" className="w-16 h-16 object-cover rounded-lg" />
                      )}
                      <div className="flex-1">
                        <Link href={`/myalbums/${album.id}`} className="hover:underline">
                          <h4 className="text-lg font-semibold">{album.title}</h4>
                        </Link>
                        <p className="text-gray-500">{album.artist}</p>
                        <p className="text-sm text-gray-400">{album.description}</p>
                        <div className="mt-2">
                          {album.distributor ? (
                            <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs">
                              {album.distributor}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 italic">No distributor</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
                {getFilteredAlbumsForSearch().length > 3 && (
                  <div className="text-center">
                    <Link href="#albums">
                      <Button variant="outline" size="sm">
                        View all {getFilteredAlbumsForSearch().length} albums
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {(globalSearchFilter === 'all' || globalSearchFilter === 'singles') && getFilteredSinglesForSearch().length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3 text-gray-300">Singles ({getFilteredSinglesForSearch().length})</h3>
              <div className="space-y-4">
                {getFilteredSinglesForSearch().slice(0, 3).map(single => (
                  <Card key={single.id} className="p-4">
                    <div className="flex gap-4">
                      <div className="w-16 h-16 rounded-lg bg-gray-800 flex items-center justify-center">
                        {single.cover_art_url ? (
                          <img src={single.cover_art_url} alt={single.title} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <Music className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <Link href={`/mysingles/${single.id}`} className="hover:underline">
                          <h4 className="text-lg font-semibold">{single.title}</h4>
                        </Link>
                        <p className="text-gray-500">{single.artist}</p>
                        <p className="text-sm text-gray-400">{single.description}</p>
                      </div>
                    </div>
                  </Card>
                ))}
                {getFilteredSinglesForSearch().length > 3 && (
                  <div className="text-center">
                    <Link href="#singles">
                      <Button variant="outline" size="sm">
                        View all {getFilteredSinglesForSearch().length} singles
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {(globalSearchFilter === 'all' || globalSearchFilter === 'audio') && getFilteredAudioItemsForSearch().length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3 text-gray-300">Audio Files ({getFilteredAudioItemsForSearch().length})</h3>
              <div className="space-y-4">
                {getFilteredAudioItemsForSearch().slice(0, 3).map(item => (
                  <Card key={item.id} className="p-4">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
                        {item.type === 'midi' && <Piano className="h-5 w-5 text-yellow-400" />}
                        {item.type === 'soundkit' && <Drum className="h-5 w-5 text-red-400" />}
                        {item.type === 'loop' && <Music className="h-5 w-5 text-blue-400" />}
                        {item.type === 'patch' && <Music2 className="h-5 w-5 text-green-400" />}
                        {item.type === 'sample' && <FileAudio className="h-5 w-5 text-purple-400" />}
                        {item.type === 'clip' && <FileMusic className="h-5 w-5 text-pink-400" />}
                        {item.type === 'other' && <File className="h-5 w-5 text-gray-400" />}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold">{item.name}</h4>
                        <p className="text-sm text-gray-400">{item.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">{item.type}</Badge>
                          {item.bpm && <Badge variant="secondary" className="text-xs">{item.bpm} BPM</Badge>}
                          {item.key && <Badge variant="secondary" className="text-xs">{item.key}</Badge>}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
                {getFilteredAudioItemsForSearch().length > 3 && (
                  <div className="text-center">
                    <Link href="#audio">
                      <Button variant="outline" size="sm">
                        View all {getFilteredAudioItemsForSearch().length} audio files
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {globalSearchQuery.trim() && 
           getFilteredAlbumsForSearch().length === 0 && 
           getFilteredSinglesForSearch().length === 0 && 
           getFilteredAudioItemsForSearch().length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-400">No results found for "{globalSearchQuery}"</p>
              <p className="text-sm text-gray-500 mt-2">Try searching for different terms or check your spelling</p>
            </div>
          )}
        </div>
      )}

      <Tabs defaultValue={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <div className="w-full overflow-x-auto">
          <TabsList className="flex w-max min-w-full h-auto p-1">
            <TabsTrigger value="albums" className="text-xs sm:text-sm whitespace-nowrap px-3 py-2 flex-shrink-0">
              Albums
              {!loadingAlbums && (
                <span className="ml-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {getFilteredAlbumsForSearch().length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="tracks" className="text-xs sm:text-sm whitespace-nowrap px-3 py-2 flex-shrink-0">
              Tracks
              {!loadingTracks && (
                <span className="ml-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {getFilteredTracksForSearch().length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="platforms" className="text-xs sm:text-sm whitespace-nowrap px-3 py-2 flex-shrink-0">Platforms</TabsTrigger>
            <TabsTrigger value="singles" className="text-xs sm:text-sm whitespace-nowrap px-3 py-2 flex-shrink-0">
              Singles
              {!loadingSingles && (
                <span className="ml-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {getFilteredSinglesForSearch().length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="profiles" className="text-xs sm:text-sm whitespace-nowrap px-3 py-2 flex-shrink-0">Profiles</TabsTrigger>
            <TabsTrigger value="audio" className="text-xs sm:text-sm whitespace-nowrap px-3 py-2 flex-shrink-0">
              Audio
              {!loadingAudio && (
                <span className="ml-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {getFilteredAudioItemsForSearch().length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="top" className="text-xs sm:text-sm whitespace-nowrap px-3 py-2 flex-shrink-0">Top</TabsTrigger>
            <TabsTrigger value="production-schedule" className="text-xs sm:text-sm whitespace-nowrap px-3 py-2 flex-shrink-0">Schedule</TabsTrigger>
          </TabsList>
        </div>
        {/* Albums Tab */}
        <TabsContent value="albums" className="space-y-4">
          {/* Album Phase Tabs */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-700 overflow-x-auto">
              <button
                onClick={() => setAlbumPhaseTab('all')}
                className={`px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                  albumPhaseTab === 'all' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-300 hover:text-white hover:bg-zinc-800'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setAlbumPhaseTab('marketing')}
                className={`px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                  albumPhaseTab === 'marketing' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-300 hover:text-white hover:bg-zinc-800'
                }`}
              >
                Marketing
              </button>
              <button
                onClick={() => setAlbumPhaseTab('organization')}
                className={`px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                  albumPhaseTab === 'organization' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-300 hover:text-white hover:bg-zinc-800'
                }`}
              >
                Organization
              </button>
              <button
                onClick={() => setAlbumPhaseTab('production')}
                className={`px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                  albumPhaseTab === 'production' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-300 hover:text-white hover:bg-zinc-800'
                }`}
              >
                Production
              </button>
              <button
                onClick={() => setAlbumPhaseTab('quality_control')}
                className={`px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                  albumPhaseTab === 'quality_control' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-300 hover:text-white hover:bg-zinc-800'
                }`}
              >
                Quality Control
              </button>
              <button
                onClick={() => setAlbumPhaseTab('ready_for_distribution')}
                className={`px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                  albumPhaseTab === 'ready_for_distribution' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-300 hover:text-white hover:bg-zinc-800'
                }`}
              >
                Ready for Distribution
              </button>
            </div>
          </div>
          
          {loadingAlbums ? <div>Loading albums...</div> : albumError ? <div className="text-red-500">{albumError}</div> : getFilteredAlbumsForSearch().length === 0 ? <div>No albums found in this phase.</div> : getFilteredAlbumsForSearch().map(album => (
            <Card key={album.id} className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                <div className="relative">
                  {album.cover_art_url ? (
                    <img 
                      src={album.cover_art_url} 
                      alt={album.title} 
                      className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-lg mx-auto sm:mx-0"
                      onLoad={(e) => {
                        const img = e.target as HTMLImageElement;
                        const sizeInfo = img.parentElement?.querySelector('.image-size');
                        if (sizeInfo) {
                          sizeInfo.textContent = `${img.naturalWidth} × ${img.naturalHeight}`;
                        }
                      }}
                    />
                  ) : (
                    <img 
                      src="/placeholder.jpg" 
                      alt="No cover art" 
                      className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-lg mx-auto sm:mx-0"
                      onLoad={(e) => {
                        const img = e.target as HTMLImageElement;
                        const sizeInfo = img.parentElement?.querySelector('.image-size');
                        if (sizeInfo) {
                          sizeInfo.textContent = `${img.naturalWidth} × ${img.naturalHeight}`;
                        }
                      }}
                    />
                  )}
                  <div className="absolute bottom-1 left-1 bg-black bg-opacity-75 text-white text-xs px-1 py-0.5 rounded">
                    <span className="image-size">Loading...</span>
                  </div>
                  
                  {/* Cover Management Buttons */}
                  <div className="absolute top-1 right-1 flex gap-1">
                    <input
                      type="file"
                      id={`upload-cover-${album.id}`}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          replaceCoverArt(album.id, file, 'album');
                        }
                        e.target.value = '';
                      }}
                    />
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => document.getElementById(`upload-cover-${album.id}`)?.click()}
                      className="bg-blue-600 hover:bg-blue-700 text-white border-blue-500 text-xs px-2 py-1 h-6"
                      title="Replace cover art"
                      disabled={replacingCoverId === album.id && replacingCoverType === 'album'}
                    >
                      {replacingCoverId === album.id && replacingCoverType === 'album' ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Upload className="h-3 w-3" />
                      )}
                    </Button>
                    {album.cover_art_url && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => deleteCoverArt(album.id, 'album')}
                        className="bg-red-600 hover:bg-red-700 text-white border-red-500 text-xs px-2 py-1 h-6"
                        title="Delete cover art"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
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
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-2">
                        {/* Status badges row */}
                        <div className="flex flex-wrap gap-1 sm:gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Badge className={`text-xs cursor-pointer hover:opacity-80 ${getStatusColor(album.status || 'draft')}`}>
                                {getStatusIcon(album.status || 'draft')}
                                {album.status || 'draft'}
                              </Badge>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => updateAlbumStatus(album.id, 'production')}>
                                <Circle className="h-3 w-3 mr-2" />
                                Production
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateAlbumStatus(album.id, 'draft')}>
                                <Circle className="h-3 w-3 mr-2" />
                                Draft
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateAlbumStatus(album.id, 'distribute')}>
                                <Circle className="h-3 w-3 mr-2" />
                                Distribute
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateAlbumStatus(album.id, 'error')}>
                                <Circle className="h-3 w-3 mr-2" />
                                Error
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateAlbumStatus(album.id, 'published')}>
                                <Circle className="h-3 w-3 mr-2" />
                                Published
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateAlbumStatus(album.id, 'other')}>
                                <Circle className="h-3 w-3 mr-2" />
                                Other
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          {/* Phase Status Dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Badge className={`text-xs cursor-pointer hover:opacity-80 ${getProductionStatusColor(album.production_status || 'production')}`}>
                                {getProductionStatusIcon(album.production_status || 'production')}
                                {album.production_status || 'production'}
                              </Badge>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => updateAlbumProductionStatus(album.id, 'marketing')}>
                                <CheckCircle2 className="h-3 w-3 mr-2" />
                                Marketing
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateAlbumProductionStatus(album.id, 'organization')}>
                                <CheckCircle2 className="h-3 w-3 mr-2" />
                                Organization
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateAlbumProductionStatus(album.id, 'production')}>
                                <CheckCircle2 className="h-3 w-3 mr-2" />
                                Production
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateAlbumProductionStatus(album.id, 'quality_control')}>
                                <CheckCircle2 className="h-3 w-3 mr-2" />
                                Quality Control
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateAlbumProductionStatus(album.id, 'ready_for_distribution')}>
                                <CheckCircle2 className="h-3 w-3 mr-2" />
                                Ready for Distribution
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          {/* Visibility Dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Badge className={`text-xs cursor-pointer hover:opacity-80 ${getVisibilityColor(album.visibility || 'private')}`}>
                                {getVisibilityIcon(album.visibility || 'private')}
                                {album.visibility || 'private'}
                              </Badge>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => updateAlbumVisibility(album.id, 'private')}>
                                <Lock className="h-3 w-3 mr-2" />
                                Private
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateAlbumVisibility(album.id, 'public')}>
                                <Eye className="h-3 w-3 mr-2" />
                                Public
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateAlbumVisibility(album.id, 'pause')}>
                                <Pause className="h-3 w-3 mr-2" />
                                Pause
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateAlbumVisibility(album.id, 'upcoming')}>
                                <Clock className="h-3 w-3 mr-2" />
                                Upcoming
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        {/* Action buttons - split into rows on mobile */}
                        <div className="flex flex-wrap gap-1 sm:gap-2">
                          {/* Primary actions */}
                          <Link href={`/myalbums/${album.id}`}>
                            <Button variant="default" size="sm" className="text-xs px-2 py-1 h-8">
                              <span className="hidden sm:inline">View Album</span>
                              <span className="sm:hidden">View</span>
                            </Button>
                          </Link>
                          <Button variant="outline" size="sm" onClick={() => setEditAlbumId(album.id)} className="text-xs px-2 py-1 h-8">
                            <FileText className="h-3 w-3 sm:mr-1" />
                            <span className="hidden sm:inline">Edit</span>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => openCreateAlbumTrackDialog(album)}
                            className="bg-purple-600 hover:bg-purple-700 text-white border-purple-500 text-xs px-2 py-1 h-8"
                          >
                            <Plus className="h-3 w-3 sm:mr-1" />
                            <span className="hidden sm:inline">Add Track</span>
                            <span className="sm:hidden">Add</span>
                          </Button>
                        </div>
                        
                        {/* Secondary actions */}
                        <div className="flex flex-wrap gap-1 sm:gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => downloadAlbum(album.id, album.title)}
                            className="bg-green-600 hover:bg-green-700 text-white border-green-500 text-xs px-2 py-1 h-8"
                            title="Download Album"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                          <Link href={`/release-platforms/${album.id}`}>
                            <Button variant="outline" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white border-blue-500 text-xs px-2 py-1 h-8">
                              <Globe className="h-3 w-3 sm:mr-1" />
                              <span className="hidden sm:inline">Platforms</span>
                              <span className="sm:hidden">Plat</span>
                            </Button>
                          </Link>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteAlbum(album.id)} className="text-xs px-2 py-1 h-8">
                            <Trash2 className="h-3 w-3 sm:mr-1" />
                            <span className="hidden sm:inline">Delete</span>
                            <span className="sm:hidden">Del</span>
                          </Button>
                        </div>
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
                    
                    <div className="mt-4">
                      <h3 className="font-medium mb-2">Distributor</h3>
                      <div className="text-sm text-gray-500">
                        {album.distributor ? (
                          <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs">
                            {album.distributor}
                          </span>
                        ) : (
                          <span className="italic text-gray-400">No distributor assigned</span>
                        )}
                      </div>
                    </div>
                    
                    {album.distributor_notes && (
                      <div className="mt-4">
                        <h3 className="font-medium mb-2">Distributor Notes</h3>
                        <div className="text-sm text-gray-500 bg-zinc-800 p-2 rounded">
                          {album.distributor_notes}
                        </div>
                      </div>
                    )}
                    
                    {album.notes && (
                      <div className="mt-4">
                        <h3 className="font-medium mb-2">Notes</h3>
                        <div className="text-sm text-gray-500 bg-zinc-800 p-2 rounded">
                          {album.notes}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>
        {/* Tracks Tab */}
        <TabsContent value="tracks" className="space-y-4">
          {/* Create Track Button */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">Tracks</h2>
            <Button 
              onClick={openCreateTrackDialog}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Track
            </Button>
          </div>
          
          {/* Track Phase Tabs */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-700 overflow-x-auto">
              <button
                onClick={() => setTrackPhaseTab('all')}
                className={`px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                  trackPhaseTab === 'all' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-300 hover:text-white hover:bg-zinc-800'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setTrackPhaseTab('marketing')}
                className={`px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                  trackPhaseTab === 'marketing' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-300 hover:text-white hover:bg-zinc-800'
                }`}
              >
                Marketing
              </button>
              <button
                onClick={() => setTrackPhaseTab('organization')}
                className={`px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                  trackPhaseTab === 'organization' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-300 hover:text-white hover:bg-zinc-800'
                }`}
              >
                Organization
              </button>
              <button
                onClick={() => setTrackPhaseTab('production')}
                className={`px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                  trackPhaseTab === 'production' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-300 hover:text-white hover:bg-zinc-800'
                }`}
              >
                Production
              </button>
              <button
                onClick={() => setTrackPhaseTab('quality_control')}
                className={`px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                  trackPhaseTab === 'quality_control' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-300 hover:text-white hover:bg-zinc-800'
                }`}
              >
                Quality Control
              </button>
              <button
                onClick={() => setTrackPhaseTab('ready_for_distribution')}
                className={`px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                  trackPhaseTab === 'ready_for_distribution' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-300 hover:text-white hover:bg-zinc-800'
                }`}
              >
                Ready for Distribution
              </button>
            </div>
          </div>
          
          {loadingTracks ? <div>Loading tracks...</div> : trackError ? <div className="text-red-500">{trackError}</div> : getFilteredTracksForSearch().length === 0 ? <div>No tracks found in this phase.</div> : (
            <div className="space-y-4">
              {getFilteredTracksForSearch().map(track => (
                <Card key={track.id} className={`p-4 sm:p-6 border-l-4 ${getStatusBorderColor(track.status || 'draft')}`}>
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center">
                    {/* Cover Art - Show placeholder if no cover art */}
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-gray-800 flex items-center justify-center overflow-hidden mx-auto sm:mx-0">
                      {track.cover_art_url ? (
                        <img 
                          src={track.cover_art_url} 
                          alt={track.title} 
                          className="w-full h-full object-cover"
                          onLoad={(e) => {
                            const img = e.target as HTMLImageElement;
                            const sizeInfo = img.parentElement?.querySelector('.image-size');
                            if (sizeInfo) {
                              sizeInfo.textContent = `${img.naturalWidth} × ${img.naturalHeight}`;
                            }
                          }}
                        />
                      ) : (
                        <div className="text-center text-gray-400">
                          <Music className="w-8 h-8 mx-auto mb-1" />
                          <div className="text-xs font-medium">{track.title}</div>
                        </div>
                      )}
                      {track.cover_art_url && (
                        <div className="absolute bottom-0.5 left-0.5 bg-black bg-opacity-75 text-white text-xs px-1 py-0.5 rounded">
                          <span className="image-size">Loading...</span>
                        </div>
                      )}
                      
                      {/* Cover Management Buttons */}
                      <div className="absolute top-0.5 right-0.5 flex gap-1">
                        <input
                          type="file"
                          id={`upload-track-cover-${track.id}`}
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              replaceCoverArt(track.id, file, 'track');
                            }
                            e.target.value = '';
                          }}
                        />
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => document.getElementById(`upload-track-cover-${track.id}`)?.click()}
                          className="bg-blue-600 hover:bg-blue-700 text-white border-blue-500 text-xs px-1 py-0.5 h-5"
                          title="Replace cover art"
                          disabled={replacingCoverId === track.id && replacingCoverType === 'track'}
                        >
                          {replacingCoverId === track.id && replacingCoverType === 'track' ? (
                            <Loader2 className="h-2 w-2 animate-spin" />
                          ) : (
                            <Upload className="h-2 w-2" />
                          )}
                        </Button>
                        {track.cover_art_url && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => deleteCoverArt(track.id, 'track')}
                            className="bg-red-600 hover:bg-red-700 text-white border-red-500 text-xs px-1 py-0.5 h-5"
                            title="Delete cover art"
                          >
                            <Trash2 className="h-2 w-2" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {/* Track Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-white truncate">{track.title}</h3>
                            {track.replaced_at && (
                              <Badge variant="outline" className="text-orange-400 border-orange-500 text-xs">
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Replaced {new Date(track.replaced_at).toLocaleDateString()}
                              </Badge>
                            )}
                          </div>
                          <p className="text-gray-400 text-sm">{track.artist}</p>
                          
                          {/* Status Badges */}
                          <div className="flex flex-wrap gap-2 mt-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Badge className={`text-xs cursor-pointer hover:opacity-80 ${getStatusColor(track.status || 'draft')}`}>
                                  {getStatusIcon(track.status || 'draft')}
                                  {track.status || 'draft'}
                                </Badge>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => updateTrackStatus(track.id, 'production')}>
                                  <Circle className="h-3 w-3 mr-2" />
                                  Production
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateTrackStatus(track.id, 'draft')}>
                                  <Circle className="h-3 w-3 mr-2" />
                                  Draft
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateTrackStatus(track.id, 'distribute')}>
                                  <Circle className="h-3 w-3 mr-2" />
                                  Distribute
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateTrackStatus(track.id, 'error')}>
                                  <Circle className="h-3 w-3 mr-2" />
                                  Error
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateTrackStatus(track.id, 'published')}>
                                  <Circle className="h-3 w-3 mr-2" />
                                  Published
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateTrackStatus(track.id, 'other')}>
                                  <Circle className="h-3 w-3 mr-2" />
                                  Other
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Badge className={`text-xs cursor-pointer hover:opacity-80 ${getProductionStatusColor(track.production_status || 'production')}`}>
                                  {getProductionStatusIcon(track.production_status || 'production')}
                                  {track.production_status || 'production'}
                                </Badge>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => updateTrackProductionStatus(track.id, 'marketing')}>
                                  <CheckCircle2 className="h-3 w-3 mr-2" />
                                  Marketing
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateTrackProductionStatus(track.id, 'organization')}>
                                  <CheckCircle2 className="h-3 w-3 mr-2" />
                                  Organization
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateTrackProductionStatus(track.id, 'production')}>
                                  <CheckCircle2 className="h-3 w-3 mr-2" />
                                  Production
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateTrackProductionStatus(track.id, 'quality_control')}>
                                  <CheckCircle2 className="h-3 w-3 mr-2" />
                                  Quality Control
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateTrackProductionStatus(track.id, 'ready_for_distribution')}>
                                  <CheckCircle2 className="h-3 w-3 mr-2" />
                                  Ready for Distribution
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          
                          {/* Metadata */}
                          <div className="mt-2 text-sm text-gray-500 space-y-1">
                            {track.bpm && <div>BPM: {track.bpm}</div>}
                            {track.key && <div>Key: {track.key}</div>}
                            {track.genre && <div>Genre: {track.genre}</div>}
                            {track.subgenre && <div>Subgenre: {track.subgenre}</div>}
                            {track.duration && <div>Duration: {track.duration}</div>}
                          </div>
                          
                          {/* Session Link */}
                          {track.session_id && track.session_name && (
                            <div className="mt-2 ml-4">
                              <div 
                                className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600/20 border border-blue-500/30 rounded-md"
                              >
                                <LinkIcon className="h-3 w-3 text-blue-400" />
                                <span className="text-sm font-medium text-blue-300">
                                  Session: {track.session_name}
                                </span>
                              </div>
                            </div>
                          )}
                          
                          {/* Description */}
                          {track.description && (
                            <div className="mt-2 text-sm text-gray-400">
                              {track.description}
                            </div>
                          )}
                        </div>
                        
                        {/* Actions */}
                        <div className="flex flex-col gap-2 ml-4">
                          {/* Audio Controls */}
                          {track.audio_url && (
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => playTrack(track.id, track.audio_url!)}
                                className="text-xs h-6 px-2"
                              >
                                {playingTrackId === track.id ? (
                                  <Pause className="h-3 w-3" />
                                ) : (
                                  <Play className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          )}
                          
                          {/* Action Buttons */}
                          <div className="flex flex-col gap-2 sm:gap-1 max-w-full">
                            {/* Hidden inputs */}
                            <input
                              type="file"
                              id={`track-audio-${track.id}`}
                              accept="audio/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  replaceTrackAudio(track.id, file);
                                }
                              }}
                            />

                            {/* Row 1: Main Actions */}
                            <div className="flex flex-wrap gap-1">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" className="text-xs h-6 px-2">
                                    <MoreHorizontal className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Track Actions</DropdownMenuLabel>
                                
                                {/* Status Updates */}
                                <DropdownMenuItem onClick={() => updateTrackStatus(track.id, 'production')}>
                                  <Circle className="h-3 w-3 mr-2" />
                                  Set to Production
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateTrackStatus(track.id, 'draft')}>
                                  <Circle className="h-3 w-3 mr-2" />
                                  Set to Draft
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateTrackStatus(track.id, 'distribute')}>
                                  <Circle className="h-3 w-3 mr-2" />
                                  Set to Distribute
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateTrackStatus(track.id, 'published')}>
                                  <Circle className="h-3 w-3 mr-2" />
                                  Set to Published
                                </DropdownMenuItem>
                                
                                <DropdownMenuSeparator />
                                
                                {/* Production Status Updates */}
                                <DropdownMenuItem onClick={() => updateTrackProductionStatus(track.id, 'marketing')}>
                                  <CheckCircle2 className="h-3 w-3 mr-2" />
                                  Set to Marketing
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateTrackProductionStatus(track.id, 'organization')}>
                                  <CheckCircle2 className="h-3 w-3 mr-2" />
                                  Set to Organization
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateTrackProductionStatus(track.id, 'production')}>
                                  <CheckCircle2 className="h-3 w-3 mr-2" />
                                  Set to Production
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateTrackProductionStatus(track.id, 'quality_control')}>
                                  <CheckCircle2 className="h-3 w-3 mr-2" />
                                  Set to Quality Control
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateTrackProductionStatus(track.id, 'ready_for_distribution')}>
                                  <CheckCircle2 className="h-3 w-3 mr-2" />
                                  Set to Ready for Distribution
                                </DropdownMenuItem>
                                
                                <DropdownMenuSeparator />
                                
                                <DropdownMenuItem onClick={() => openEditTrackDialog(track)}>
                                  <Pencil className="h-3 w-3 mr-2" />
                                  Edit Track
                                </DropdownMenuItem>
                                
                                {/* Move Track */}
                                <DropdownMenuItem onClick={() => handleMoveTrack(track.id, track.title)}>
                                  <Package className="h-3 w-3 mr-2" />
                                  Move Track
                                </DropdownMenuItem>
                                
                                {/* Open in Loop Editor */}
                                {track.audio_url && (
                                  <DropdownMenuItem onClick={() => openInLoopEditor(track.audio_url!, track.title, track.bpm || undefined)}>
                                    <Edit3 className="h-3 w-3 mr-2" />
                                    Open in Loop Editor
                                  </DropdownMenuItem>
                                )}
                                
                                <DropdownMenuItem onClick={() => deleteTrack(track.id)}>
                                  <Trash2 className="h-3 w-3 mr-2" />
                                  Delete Track
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                              </DropdownMenu>
                              
                              {/* Download */}
                              {track.audio_url && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => downloadTrack(track.id, track.audio_url!, track.title)}
                                  className="text-xs h-6 px-2 bg-black hover:bg-blue-600 text-white border-gray-600 hover:border-blue-500"
                                  title="Download Track"
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                              )}
                              
                              {/* Metadata */}
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => openMetadataDialog(track.id, 'track')}
                                className="text-xs h-6 px-2 bg-black hover:bg-purple-600 text-white border-gray-600 hover:border-purple-500"
                                title="Edit Metadata"
                              >
                                <FileTextIcon className="h-3 w-3" />
                              </Button>
                              
                              {/* Notes */}
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => openNotesDialog(track.id, 'track', track.title)}
                                className="text-xs h-6 px-2 bg-black hover:bg-orange-600 text-white border-gray-600 hover:border-orange-500"
                                title="Add Notes"
                              >
                                <StickyNote className="h-3 w-3" />
                              </Button>
                            </div>
                            
                            {/* Row 2: Upload & Convert Actions */}
                            <div className="flex flex-wrap gap-1">
                              {/* Audio Upload/Replace */}
                              <input
                                type="file"
                                id={`track-audio-2-${track.id}`}
                                accept="audio/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    replaceTrackAudio(track.id, file);
                                  }
                                }}
                              />
                              <label
                                htmlFor={`track-audio-2-${track.id}`}
                                className="cursor-pointer"
                              >
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="text-xs h-6 px-2 bg-black hover:bg-green-600 text-white border-gray-600 hover:border-green-500"
                                  disabled={replacingTrackId === track.id}
                                  title="Upload Audio"
                                >
                                  {replacingTrackId === track.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Upload className="h-3 w-3" />
                                  )}
                                </Button>
                              </label>
                              
                              {/* Cover Art Upload/Replace */}
                              <input
                                type="file"
                                id={`track-cover-${track.id}`}
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    replaceCoverArt(track.id, file, 'track');
                                  }
                                }}
                              />
                              <label
                                htmlFor={`track-cover-${track.id}`}
                                className="cursor-pointer"
                              >
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="text-xs h-6 px-2 bg-black hover:bg-purple-600 text-white border-gray-600 hover:border-purple-500"
                                  disabled={replacingCoverId === track.id}
                                  title="Upload Cover Art"
                                >
                                  {replacingCoverId === track.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Image className="h-3 w-3" />
                                  )}
                                </Button>
                              </label>
                              
                              {/* Convert to MP3 */}
                              {track.audio_url && !track.audio_url.endsWith('.mp3') && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => showCompressionOptions(track.id, track.audio_url!, 'track')}
                                  className="text-xs h-6 px-2 bg-black hover:bg-orange-600 text-white border-gray-600 hover:border-orange-500"
                                  disabled={convertingTrack === track.id}
                                  title="Convert to MP3"
                                >
                                  {convertingTrack === track.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <FileAudio className="h-3 w-3" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      

                      
                      {/* Track Details */}
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                        <Calendar className="h-4 w-4" />
                        {track.release_date ? (
                          <>Released: {new Date(track.release_date).toLocaleDateString()}</>
                        ) : (
                          <>No release date</>
                        )}
                        {track.duration && (
                          <>
                            <span className="ml-4">Duration: {track.duration}</span>
                          </>
                        )}
                      </div>
                      
                      {/* Description */}
                      {track.description && (
                        <div className="mt-3">
                          <h3 className="font-medium mb-1">Description</h3>
                          <div className="text-sm text-gray-500 font-semibold">{track.description}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        {/* Platforms Tab (placeholder) */}
        <TabsContent value="platforms">
          <div className="text-center py-8 text-gray-500">
            Platform distribution management coming soon...
          </div>
        </TabsContent>
        {/* Singles Tab */}
        <TabsContent value="singles" className="space-y-4">
          {/* Upload Beat Button */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">Singles</h2>
            <div className="flex gap-2">
              <Button 
                onClick={openCreateSingleDialog}
                className="bg-black hover:bg-blue-600 text-white border-gray-600 hover:border-blue-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Single
              </Button>
              <Button 
                onClick={openBeatUploadDialog}
                className="bg-black hover:bg-green-600 text-white border-gray-600 hover:border-green-500"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Beat
              </Button>
            </div>
          </div>
          
          {/* Single Phase Tabs */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-700 overflow-x-auto">
              <button
                onClick={() => setSinglePhaseTab('all')}
                className={`px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                  singlePhaseTab === 'all' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-300 hover:text-white hover:bg-zinc-800'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSinglePhaseTab('marketing')}
                className={`px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                  singlePhaseTab === 'marketing' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-300 hover:text-white hover:bg-zinc-800'
                }`}
              >
                Marketing
              </button>
              <button
                onClick={() => setSinglePhaseTab('organization')}
                className={`px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                  singlePhaseTab === 'organization' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-300 hover:text-white hover:bg-zinc-800'
                }`}
              >
                Organization
              </button>
              <button
                onClick={() => setSinglePhaseTab('production')}
                className={`px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                  singlePhaseTab === 'production' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-300 hover:text-white hover:bg-zinc-800'
                }`}
              >
                Production
              </button>
              <button
                onClick={() => setSinglePhaseTab('quality_control')}
                className={`px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                  singlePhaseTab === 'quality_control' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-300 hover:text-white hover:bg-zinc-800'
                }`}
              >
                Quality Control
              </button>
              <button
                onClick={() => setSinglePhaseTab('ready_for_distribution')}
                className={`px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                  singlePhaseTab === 'ready_for_distribution' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-300 hover:text-white hover:bg-zinc-800'
                }`}
              >
                Ready for Distribution
              </button>
            </div>
          </div>
          
          {loadingSingles ? <div>Loading singles...</div> : singleError ? <div className="text-red-500">{singleError}</div> : getFilteredSinglesForSearch().length === 0 ? <div>No singles found in this phase.</div> : (
                          <div className="space-y-4">
                {getFilteredSinglesForSearch().map(single => {
                // Check if this single has an MP3 conversion (title ends with .mp3)
                const isMp3Conversion = single.title.endsWith('.mp3')
                const originalTitle = isMp3Conversion ? single.title.replace('.mp3', '') : single.title
                
                // Find the original single if this is an MP3 conversion
                const originalSingle = isMp3Conversion ? singles.find(s => s.title === originalTitle && !s.title.endsWith('.mp3')) : null
                
                // If this is an MP3 conversion and we have the original, skip rendering this one
                if (isMp3Conversion && originalSingle) {
                  return null
                }
                
                // Only show original singles (not MP3 conversions) as main singles
                // But allow MP3 conversions if they don't have an original counterpart
                if (isMp3Conversion && originalSingle) {
                  return null
                }
                
                // Find MP3 conversions for this single
                const mp3Conversions = singles.filter(s => s.title === single.title + '.mp3')
                
                return (
                  <Card key={single.id} className={`p-4 sm:p-6 border-l-4 ${getStatusBorderColor(single.status || 'draft')}`}>
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center">
                      {/* Cover Art - Show placeholder if no cover art */}
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-gray-800 flex items-center justify-center overflow-hidden mx-auto sm:mx-0">
                        {single.cover_art_url ? (
                          <img 
                            src={single.cover_art_url} 
                            alt={single.title} 
                            className="w-full h-full object-cover"
                            onLoad={(e) => {
                              const img = e.target as HTMLImageElement;
                              const sizeInfo = img.parentElement?.querySelector('.image-size');
                              if (sizeInfo) {
                                sizeInfo.textContent = `${img.naturalWidth} × ${img.naturalHeight}`;
                              }
                            }}
                          />
                        ) : (
                          <div className="text-center text-gray-400">
                            <Music className="w-8 h-8 mx-auto mb-1" />
                            <div className="text-xs font-medium">{single.title}</div>
                          </div>
                        )}
                        {single.cover_art_url && (
                          <div className="absolute bottom-0.5 left-0.5 bg-black bg-opacity-75 text-white text-xs px-1 py-0.5 rounded">
                            <span className="image-size">Loading...</span>
                          </div>
                        )}
                        
                        {/* Cover Management Buttons */}
                        <div className="absolute top-0.5 right-0.5 flex gap-1">
                          <input
                            type="file"
                            id={`upload-single-cover-${single.id}`}
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                replaceCoverArt(single.id, file, 'single');
                              }
                              e.target.value = '';
                            }}
                          />
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => document.getElementById(`upload-single-cover-${single.id}`)?.click()}
                            className="bg-blue-600 hover:bg-blue-700 text-white border-blue-500 text-xs px-1 py-0.5 h-5"
                            title="Replace cover art"
                            disabled={replacingCoverId === single.id && replacingCoverType === 'single'}
                          >
                            {replacingCoverId === single.id && replacingCoverType === 'single' ? (
                              <Loader2 className="h-2 w-2 animate-spin" />
                            ) : (
                              <Upload className="h-2 w-2" />
                            )}
                          </Button>
                          {single.cover_art_url && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => deleteCoverArt(single.id, 'single')}
                              className="bg-red-600 hover:bg-red-700 text-white border-red-500 text-xs px-1 py-0.5 h-5"
                              title="Delete cover art"
                            >
                              <Trash2 className="h-2 w-2" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 w-full">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 sm:gap-0">
                          <div>
                            <div className="flex items-center gap-2 text-center sm:text-left">
                              <div className="flex items-center gap-2">
                          <h2 className="text-lg sm:text-xl font-semibold">{single.title}</h2>
                          {single.replaced_at && (
                            <Badge variant="outline" className="text-orange-400 border-orange-500 text-xs">
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Replaced {new Date(single.replaced_at).toLocaleDateString()}
                            </Badge>
                          )}
                        </div>
                              {recentlyReplacedSingles.has(single.id) && (
                                <Badge variant="secondary" className="bg-green-600 text-white text-xs px-2 py-1 animate-pulse">
                                  File Replaced
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-center sm:text-left">
                              <p className="text-gray-500">{single.artist}</p>
                              {single.audio_url && getAudioFileLabel(single.audio_url)}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 overflow-x-auto">
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
                                  ? 'bg-black hover:bg-green-600 text-white border-gray-600 hover:border-green-500' 
                                  : 'bg-gray-600 text-gray-400 border-gray-500 cursor-not-allowed'
                              }`}
                              title={single.audio_url ? 'Play audio' : 'No audio file available'}
                            >
                              {playingSingleId === single.id ? (
                                <>
                                  <Pause className="h-4 w-4 sm:mr-2" />
                                  <span className="hidden sm:inline">Pause</span>
                                </>
                              ) : (
                                <>
                                  <Play className="h-4 w-4 sm:mr-2" />
                                  <span className="hidden sm:inline">Play</span>
                                </>
                              )}
                            </Button>
                            {/* Download Button */}
                            {single.audio_url && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => downloadSingle(single.id, single.audio_url!, single.title)}
                                className="bg-black hover:bg-blue-600 text-white border-gray-600 hover:border-blue-500"
                                title="Download audio file"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="outline" size="sm" onClick={() => openEditSingleDialog(single)}>
                              <FileText className="h-4 w-4 sm:mr-2" />
                              <span className="hidden sm:inline">Edit</span>
                            </Button>
                            <Link href={`/mysingles/${single.id}`}>
                              <Button variant="outline" size="sm" className="bg-black hover:bg-blue-600 text-white border-gray-600 hover:border-blue-500">
                                <span className="hidden sm:inline">View Single</span>
                                <span className="sm:hidden">View</span>
                              </Button>
                            </Link>
                            <Link href={`/release-platforms/${single.id}`}>
                              <Button variant="outline" size="sm" className="bg-black hover:bg-blue-600 text-white border-gray-600 hover:border-blue-500">
                                <Globe className="h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">Platforms</span>
                              </Button>
                            </Link>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => openMetadataDialog(single.id, 'single')}
                              className="bg-black hover:bg-purple-600 text-white border-gray-600 hover:border-purple-500"
                            >
                              <FileTextIcon className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => openNotesDialog(single.id, 'single', single.title)}
                              className="bg-black hover:bg-orange-600 text-white border-gray-600 hover:border-orange-500"
                            >
                              <StickyNote className="h-4 w-4" />
                            </Button>
                            {/* Open in Loop Editor Button */}
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => single.audio_url && openInLoopEditor(single.audio_url!, single.title)}
                              disabled={!single.audio_url}
                              className={`${
                                single.audio_url 
                                  ? 'bg-black hover:bg-teal-600 text-white border-gray-600 hover:border-teal-500' 
                                  : 'bg-gray-600 text-gray-400 border-gray-500 cursor-not-allowed'
                              }`}
                              title={single.audio_url ? 'Open in Loop Editor' : 'No audio file available'}
                            >
                              <Edit3 className="h-4 w-4 mr-1" />
                              <span className="hidden sm:inline">Loop Editor</span>
                            </Button>
                            {/* Upload Button */}
                            <input
                              type="file"
                              id={`upload-single-${single.id}`}
                              accept="audio/*"
                              multiple
                              className="hidden"
                              onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                if (files.length > 0) {
                                  files.forEach(file => {
                                    replaceSingleAudio(single.id, file);
                                  });
                                  e.target.value = ''; // Reset input
                                }
                              }}
                            />
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => document.getElementById(`upload-single-${single.id}`)?.click()}
                              className="bg-black hover:bg-indigo-600 text-white border-gray-600 hover:border-indigo-500"
                              title="Upload new audio file"
                              disabled={replacingSingleId === single.id}
                            >
                              {replacingSingleId === single.id ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Replacing...
                                </>
                              ) : (
                                <Upload className="h-4 w-4" />
                              )}
                            </Button>
                            {/* Phase Status Dropdown */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Badge className={`text-xs cursor-pointer hover:opacity-80 ${getProductionStatusColor(single.production_status || 'production')}`}>
                                  {getProductionStatusIcon(single.production_status || 'production')}
                                  {single.production_status || 'production'}
                                </Badge>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => updateSingleProductionStatus(single.id, 'marketing')}>
                                  <CheckCircle2 className="h-3 w-3 mr-2" />
                                  Marketing
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateSingleProductionStatus(single.id, 'organization')}>
                                  <CheckCircle2 className="h-3 w-3 mr-2" />
                                  Organization
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateSingleProductionStatus(single.id, 'production')}>
                                  <CheckCircle2 className="h-3 w-3 mr-2" />
                                  Production
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateSingleProductionStatus(single.id, 'quality_control')}>
                                  <CheckCircle2 className="h-3 w-3 mr-2" />
                                  Quality Control
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateSingleProductionStatus(single.id, 'ready_for_distribution')}>
                                  <CheckCircle2 className="h-3 w-3 mr-2" />
                                  Ready for Distribution
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => openNotesDialog(single.id, 'single', single.title)}
                              className="bg-black hover:bg-orange-600 text-white border-gray-600 hover:border-orange-500"
                            >
                              <StickyNote className="h-4 w-4" />
                            </Button>
                            {single.audio_url && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                disabled={convertingSingle === single.id}
                                onClick={() => showCompressionOptions(single.id, single.audio_url!, 'single')}
                                className="bg-black hover:bg-orange-600 text-white border-gray-600 hover:border-orange-500"
                              >
                                {convertingSingle === single.id ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Converting...
                                  </>
                                ) : (
                                  "MP3 Converter"
                                )}
                              </Button>
                            )}

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Badge className={`text-xs cursor-pointer hover:opacity-80 ${getStatusColor(single.status || 'draft')}`}>
                                  {getStatusIcon(single.status || 'draft')}
                                  {single.status || 'draft'}
                                </Badge>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => updateSingleStatus(single.id, 'production')}>
                                  <Circle className="h-3 w-3 mr-2" />
                                  Production
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateSingleStatus(single.id, 'draft')}>
                                  <Circle className="h-3 w-3 mr-2" />
                                  Draft
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateSingleStatus(single.id, 'distribute')}>
                                  <Circle className="h-3 w-3 mr-2" />
                                  Distribute
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateSingleStatus(single.id, 'error')}>
                                  <Circle className="h-3 w-3 mr-2" />
                                  Error
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateSingleStatus(single.id, 'published')}>
                                  <Circle className="h-3 w-3 mr-2" />
                                  Published
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateSingleStatus(single.id, 'other')}>
                                  <Circle className="h-3 w-3 mr-2" />
                                  Other
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>

                            {single.audio_url && (
                              single.status === 'published' ? (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  disabled
                                  className="bg-green-800 text-green-300 border-green-600 cursor-not-allowed"
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Published to Beatheos ✓
                                </Button>
                              ) : (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => publishSingleToMarketplace(single)}
                                  className="bg-black hover:bg-green-600 text-white border-gray-600 hover:border-green-500"
                                >
                                  <Upload className="h-4 w-4 mr-2" />
                                  Publish to Beatheos
                                </Button>
                              )
                            )}
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleMoveSingle(single.id, single.title)}
                              className="bg-black hover:bg-purple-600 text-white border-gray-600 hover:border-purple-500"
                            >
                              <Package className="h-4 w-4 mr-2" />
                              Move Single
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => deleteSingle(single.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</Button>
                          </div>
                        </div>
                        {single.session_id && single.session_name && (
                          <div className="mt-2 ml-4">
                            <div 
                              className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600/20 border border-blue-500/30 rounded-md"
                            >
                              <LinkIcon className="h-3 w-3 text-blue-400" />
                              <span className="text-sm font-medium text-blue-300">
                                Session: {single.session_name}
                              </span>
                            </div>
                          </div>
                        )}
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
                    </div>
                    
                    {/* MP3 Conversions as subtracks */}
                    {mp3Conversions.length > 0 && (
                      <div className="mt-4 border-t border-gray-700 pt-4">
                        <h4 className="text-sm font-medium text-gray-400 mb-2">MP3 Conversions:</h4>
                        <div className="space-y-2">
                          {mp3Conversions.map((mp3Track) => (
                            <div key={mp3Track.id} className={`flex items-center gap-2 sm:gap-4 bg-gray-800 rounded px-3 py-2 ml-6 border-l-4 ${getStatusBorderColor(mp3Track.status || 'draft')} overflow-x-auto`}>
                              <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                              </div>
                              <span className="text-sm text-gray-300">{mp3Track.title}</span>
                              <span className="text-xs text-gray-500">MP3</span>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => {
                                  if (mp3Track.audio_url) {
                                    if (playingSingleId === mp3Track.id) {
                                      stopSingle();
                                    } else {
                                      playSingle(mp3Track.id, mp3Track.audio_url);
                                    }
                                  }
                                }}
                                disabled={!mp3Track.audio_url}
                                className="text-xs h-6 px-2"
                              >
                                {playingSingleId === mp3Track.id ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                              </Button>
                              {/* Status Dropdown for MP3 Single */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className={`text-xs h-6 px-2 capitalize flex items-center gap-1 ${getStatusColor(mp3Track.status || 'draft')}`}
                                  >
                                    {getStatusIcon(mp3Track.status || 'draft')}
                                    {mp3Track.status || 'draft'}
                                  </Button>
                                </DropdownMenuTrigger>
                                                                                          <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => updateSingleStatus(mp3Track.id, 'production')}>
                            Production
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateSingleStatus(mp3Track.id, 'draft')}>
                            Draft
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateSingleStatus(mp3Track.id, 'distribute')}>
                            Distribute
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateSingleStatus(mp3Track.id, 'error')}>
                            Error
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateSingleStatus(mp3Track.id, 'published')}>
                            Published
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateSingleStatus(mp3Track.id, 'other')}>
                            Other
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                              </DropdownMenu>
                              {mp3Track.audio_url && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => downloadSingle(mp3Track.id, mp3Track.audio_url!, mp3Track.title)}
                                  className="text-xs h-6 px-2 bg-black hover:bg-blue-600 text-white border-gray-600 hover:border-blue-500"
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                              )}
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => openMetadataDialog(mp3Track.id, 'single')}
                                className="text-xs h-6 px-2 bg-black hover:bg-purple-600 text-white border-gray-600 hover:border-purple-500"
                              >
                                <FileTextIcon className="h-3 w-3" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => openNotesDialog(mp3Track.id, 'single', mp3Track.title)}
                                className="text-xs h-6 px-2 bg-black hover:bg-orange-600 text-white border-gray-600 hover:border-orange-500"
                              >
                                <StickyNote className="h-3 w-3" />
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => deleteSingle(mp3Track.id)} className="text-xs h-6 px-2">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
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
              ) : getFilteredAudioItemsForSearch().length === 0 ? (
                <div>No audio files found.</div>
              ) : (
                <>
                  <div className="text-sm text-gray-400 mb-4">
                    Page {currentPage} of {Math.ceil(totalItems / itemsPerPage)} - Showing {getFilteredAudioItemsForSearch().length} files
                  </div>
                  {getFilteredAudioItemsForSearch().map(item => (
                  <Card 
                    key={item.id} 
                    className={`p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 cursor-move transition-opacity ${
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
                <div className="flex flex-wrap gap-2 min-w-0 w-full sm:w-auto justify-start sm:justify-end">
                  <Button variant="outline" size="sm" onClick={() => openEditAudioModal(item)} className="flex-shrink-0">
                    <Pencil className="h-4 w-4 mr-2" />Edit
                  </Button>
                  {/* Open in Loop Editor Button */}
                  {item.file_url && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => openInLoopEditor(item.file_url!, item.name, item.bpm || undefined)}
                      className="bg-teal-600 hover:bg-teal-700 text-white border-teal-500 flex-shrink-0"
                      title="Open in Loop Editor"
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Loop Editor
                    </Button>
                  )}
                  <Button variant="outline" size="sm" asChild className="flex-shrink-0">
                  <a href={item.file_url} download>Download</a>
                  </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteAudio(item.id)} className="flex-shrink-0">
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
                          {editingPackName === pack.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editingPackNameValue}
                                onChange={(e) => setEditingPackNameValue(e.target.value)}
                                onBlur={() => savePackName(pack.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    savePackName(pack.id);
                                  } else if (e.key === 'Escape') {
                                    cancelEditingPackName();
                                  }
                                }}
                                className="text-lg font-semibold h-8 px-2 py-1"
                                autoFocus
                              />
                            </div>
                          ) : (
                            <h3 
                              className="text-lg font-semibold cursor-pointer hover:text-blue-500 transition-colors"
                              onClick={() => startEditingPackName(pack.id, pack.name)}
                              title="Click to edit pack name"
                            >
                              {pack.name}
                            </h3>
                          )}
                          {editingPackDescription === pack.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editingPackDescriptionValue}
                                onChange={(e) => setEditingPackDescriptionValue(e.target.value)}
                                onBlur={() => savePackDescription(pack.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    savePackDescription(pack.id);
                                  } else if (e.key === 'Escape') {
                                    cancelEditingPackDescription();
                                  }
                                }}
                                className="text-sm text-gray-400 h-6 px-2 py-1"
                                placeholder="Enter description..."
                                autoFocus
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 group">
                              <p className="text-sm text-gray-400">
                                {pack.description || 'No description'}
                              </p>
                              <button
                                onClick={() => startEditingPackDescription(pack.id, pack.description || '')}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                                title="Edit description"
                              >
                                <Pencil className="h-3 w-3 text-gray-500 hover:text-gray-700" />
                              </button>
                            </div>
                          )}
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
                                            className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-2 bg-black rounded-lg ml-4 cursor-move transition-opacity ${
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
                                          <div className="flex flex-wrap gap-1 min-w-0">
                                            <Button variant="outline" size="sm" onClick={() => openEditAudioModal(item)} className="flex-shrink-0">
                                              <Pencil className="h-3 w-3" />
                                            </Button>
                                            <Button variant="outline" size="sm" asChild className="flex-shrink-0">
                                              <a href={item.file_url} download className="text-xs">⬇️</a>
                                            </Button>
                                            <Button 
                                              variant="destructive" 
                                              size="sm" 
                                              onClick={() => handleDeleteAudio(item.id)}
                                              className="flex-shrink-0"
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
                                className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 bg-black rounded-lg transition-opacity ${
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
                              className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 bg-black rounded-lg cursor-move transition-opacity ${
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
                            <div className="flex flex-wrap gap-1 min-w-0">
                              <Button variant="outline" size="sm" onClick={() => openEditAudioModal(item)} className="flex-shrink-0">
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="outline" size="sm" asChild className="flex-shrink-0">
                                <a href={item.file_url} download className="text-xs">Download</a>
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                onClick={() => handleDeleteAudio(item.id)}
                                className="flex-shrink-0"
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
        
        {/* Production Schedule Tab */}
        <TabsContent value="production-schedule" className="space-y-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">Production Schedule</h2>
            <Button 
              onClick={() => setShowCreateScheduleItemDialog(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Schedule Item
            </Button>
          </div>
          
          {/* Production Schedule Filter Tabs */}
          <div className="mb-6">
            <div className="flex space-x-1 bg-zinc-900 p-1 rounded-lg border border-zinc-700">
              <button
                onClick={() => setProductionScheduleFilter('all')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  productionScheduleFilter === 'all' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-300 hover:text-white hover:bg-zinc-800'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setProductionScheduleFilter('scheduled')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  productionScheduleFilter === 'scheduled' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-300 hover:text-white hover:bg-zinc-800'
                }`}
              >
                Scheduled
              </button>
              <button
                onClick={() => setProductionScheduleFilter('in_progress')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  productionScheduleFilter === 'in_progress' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-300 hover:text-white hover:bg-zinc-800'
                }`}
              >
                In Progress
              </button>
              <button
                onClick={() => setProductionScheduleFilter('completed')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  productionScheduleFilter === 'completed' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-300 hover:text-white hover:bg-zinc-800'
                }`}
              >
                Completed
              </button>
              <button
                onClick={() => setProductionScheduleFilter('cancelled')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  productionScheduleFilter === 'cancelled' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-300 hover:text-white hover:bg-zinc-800'
                }`}
              >
                Cancelled
              </button>
              <button
                onClick={() => setProductionScheduleFilter('on_hold')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  productionScheduleFilter === 'on_hold' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-300 hover:text-white hover:bg-zinc-800'
                }`}
              >
                On Hold
              </button>
            </div>
          </div>
          
          {loadingProductionSchedule ? (
            <div className="text-center py-8 text-gray-500">Loading production schedule...</div>
          ) : productionScheduleError ? (
            <div className="text-red-500">{productionScheduleError}</div>
          ) : productionScheduleItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Music className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-300 mb-2">No Production Schedule Items</h3>
              <p className="text-gray-500 mb-4">Start scheduling your music production tasks, collaborations, and recording sessions.</p>
              <Button 
                onClick={() => setShowCreateScheduleItemDialog(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Schedule Item
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {productionScheduleItems
                .filter(item => productionScheduleFilter === 'all' || item.status === productionScheduleFilter)
                .map(item => (
                  <Collapsible 
                    key={item.id} 
                    open={expandedScheduleCards[item.id || ''] || false}
                    onOpenChange={() => toggleScheduleCard(item.id || '')}
                  >
                    <Card className={`border-l-4 border-blue-500 ${expandedScheduleCards[item.id || ''] ? 'p-4 sm:p-6' : 'p-3'}`}>
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-3">
                            <CollapsibleTrigger asChild>
                              <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity flex-1 min-w-0">
                                {expandedScheduleCards[item.id || ''] ? (
                                  <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                )}
                                <h3 className={`font-semibold text-white truncate ${expandedScheduleCards[item.id || ''] ? 'text-lg' : 'text-base'}`}>{item.title}</h3>
                              </div>
                            </CollapsibleTrigger>
                            <div className="flex gap-2 flex-shrink-0">
                              {/* Priority Badge - Clickable */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <div className="cursor-pointer hover:opacity-80 transition-opacity inline-block">
                                    <Badge className={`text-xs ${getPriorityColor(item.priority)}`}>
                                      {item.priority}
                                    </Badge>
                                  </div>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuLabel>Change Priority</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {['urgent', 'high', 'medium', 'low'].map((priority) => (
                                    <DropdownMenuItem
                                      key={priority}
                                      onClick={() => updateScheduleItemPriority(item.id || '', priority as 'low' | 'medium' | 'high' | 'urgent')}
                                      className={item.priority === priority ? 'bg-accent/50 font-medium' : ''}
                                    >
                                      <Badge className={getPriorityColor(priority)}>
                                        {priority}
                                      </Badge>
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>

                              {/* Status Badge - Clickable */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <div className="cursor-pointer hover:opacity-80 transition-opacity inline-block">
                                    <Badge className={`text-xs ${getScheduleStatusColor(item.status)}`}>
                                      {item.status.replace('_', ' ')}
                                    </Badge>
                                  </div>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {['scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold'].map((status) => (
                                    <DropdownMenuItem
                                      key={status}
                                      onClick={() => updateScheduleItemStatus(item.id || '', status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold')}
                                      className={item.status === status ? 'bg-accent/50 font-medium' : ''}
                                    >
                                      <Badge className={getScheduleStatusColor(status)}>
                                        {status.replace('_', ' ')}
                                      </Badge>
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          
                          <CollapsibleContent>
                          {item.description && (
                            <p className="text-gray-400 text-sm mb-3">{item.description}</p>
                          )}
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Type:</span>
                            <span className="text-white ml-2 capitalize">{item.type.replace('_', ' ')}</span>
                          </div>
                          {item.project_type && (
                            <div>
                              <span className="text-gray-500">Project Type:</span>
                              <span className="text-white ml-2 capitalize">{item.project_type}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-gray-500">Scheduled:</span>
                            <span className="text-white ml-2">{new Date(item.scheduled_date).toLocaleDateString()}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Due:</span>
                            <span className="text-white ml-2">{new Date(item.due_date).toLocaleDateString()}</span>
                          </div>
                          {item.assigned_to && (
                            <div>
                              <span className="text-gray-500">Assigned to:</span>
                              <span className="text-white ml-2">{item.assigned_to}</span>
                            </div>
                          )}
                          {item.location && (
                            <div>
                              <span className="text-gray-500">Location:</span>
                              <span className="text-white ml-2">{item.location}</span>
                            </div>
                          )}
                          {item.budget && (
                            <div>
                              <span className="text-gray-500">Budget:</span>
                              <span className="text-white ml-2">{item.currency} {item.budget}</span>
                            </div>
                          )}
                        </div>
                        
                        {item.collaborators && item.collaborators.length > 0 && (
                          <div className="mt-3">
                            <span className="text-gray-500 text-sm">Collaborators:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.collaborators.map((collaborator, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {collaborator}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {item.notes && (
                          <div className="mt-3">
                            <span className="text-gray-500 text-sm">Notes:</span>
                            <p className="text-gray-300 text-sm mt-1">{item.notes}</p>
                          </div>
                        )}
                        
                        {/* Linked Project Information */}
                        {item.project_id && item.project_type && (
                          <div className="mt-3">
                            <span className="text-gray-500 text-sm">Linked Project:</span>
                            <div className="mt-1">
                              <div 
                                className="inline-flex items-center gap-1 px-2 py-1 bg-purple-600/20 border border-purple-500/30 rounded text-xs cursor-pointer hover:bg-purple-500/30 transition-colors"
                                onClick={() => {
                                  if (item.project_type === 'album') {
                                    router.push(`/mylibrary?tab=albums`);
                                  } else if (item.project_type === 'single') {
                                    router.push(`/mylibrary?tab=singles`);
                                  } else if (item.project_type === 'track') {
                                    router.push(`/mylibrary?tab=tracks`);
                                  }
                                }}
                                title="Click to view project"
                              >
                                <LinkIcon className="h-3 w-3 text-purple-400" />
                                <span className="text-purple-300 capitalize">
                                  {item.project_type}: {item.linkedProject?.title || item.project_id}
                                </span>
                                {item.linkedProject?.artist && (
                                  <span className="text-purple-200 ml-1">
                                    by {item.linkedProject.artist}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {item.checklist && item.checklist.length > 0 && (
                          <div className="mt-4">
                            <span className="text-gray-500 text-sm font-medium">Checklist:</span>
                            <div className="mt-2 space-y-2">
                              {item.checklist.map((checkItem, index) => (
                                <div key={checkItem.id || index} className="flex items-start gap-2 p-2 bg-zinc-800 rounded-md">
                                  <div className="flex items-center gap-2 flex-1">
                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                      checkItem.completed 
                                        ? 'bg-green-600 border-green-600' 
                                        : 'border-gray-400'
                                    }`}>
                                      {checkItem.completed && (
                                        <CheckCircle2 className="w-3 h-3 text-white" />
                                      )}
                                    </div>
                                    <span className={`text-sm ${checkItem.completed ? 'line-through text-gray-500' : 'text-white'}`}>
                                      {checkItem.title}
                                    </span>
                                  </div>
                                  {checkItem.assigned_to && (
                                    <Badge variant="secondary" className="text-xs">
                                      {checkItem.assigned_to}
                                    </Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                            <div className="mt-2 text-xs text-gray-500">
                              {item.checklist.filter(item => item.completed).length} of {item.checklist.length} completed
                            </div>
                          </div>
                        )}
                          </CollapsibleContent>
                        </div>
                      
                      <div className={`flex ${expandedScheduleCards[item.id || ''] ? 'flex-col gap-2' : 'flex-row gap-1'} flex-shrink-0`}>
                        <Button 
                          variant="outline" 
                          size={expandedScheduleCards[item.id || ''] ? "sm" : "icon"}
                          className={`${expandedScheduleCards[item.id || ''] ? 'text-xs' : 'h-7 w-7 p-0'}`}
                          onClick={() => openEditScheduleItemDialog(item)}
                          title="Edit"
                        >
                          <Edit3 className={`${expandedScheduleCards[item.id || ''] ? 'h-3 w-3 mr-1' : 'h-3 w-3'}`} />
                          {expandedScheduleCards[item.id || ''] && 'Edit'}
                        </Button>
                        
                        {/* Link Project Button */}
                        <Button 
                          variant="outline" 
                          size={expandedScheduleCards[item.id || ''] ? "sm" : "icon"}
                          className={`${expandedScheduleCards[item.id || ''] ? 'text-xs bg-blue-600 hover:bg-blue-700 text-white border-blue-500' : 'h-7 w-7 p-0 bg-blue-600 hover:bg-blue-700 text-white border-blue-500'}`}
                          onClick={() => openLinkProjectDialog(item)}
                          title={item.project_id ? 'Change Link' : 'Link Project'}
                        >
                          <LinkIcon className={`${expandedScheduleCards[item.id || ''] ? 'h-3 w-3 mr-1' : 'h-3 w-3'}`} />
                          {expandedScheduleCards[item.id || ''] && (item.project_id ? 'Change Link' : 'Link Project')}
                        </Button>
                        
                        {/* Create Album/Track Button based on project_type */}
                        {item.project_type === 'album' && (
                          <Button 
                            variant="outline" 
                            size={expandedScheduleCards[item.id || ''] ? "sm" : "icon"}
                            className={`${expandedScheduleCards[item.id || ''] ? 'text-xs bg-yellow-400 hover:bg-yellow-500 text-black border-yellow-400' : 'h-7 w-7 p-0 bg-yellow-400 hover:bg-yellow-500 text-black border-yellow-400'}`}
                            onClick={() => {
                              // Try to find matching artist in labelArtists
                              const matchingArtist = item.artist_name 
                                ? labelArtists.find(a => 
                                    (a.name === item.artist_name || a.stage_name === item.artist_name)
                                  )
                                : null;
                              
                              // Use scheduled_date as release date, format it for the date input (YYYY-MM-DD)
                              const releaseDate = item.scheduled_date ? new Date(item.scheduled_date).toISOString().split('T')[0] : '';
                              
                              setNewAlbum({
                                title: item.title || '',
                                artist: item.artist_name || '',
                                release_date: releaseDate,
                                cover_art_url: '',
                                description: ''
                              });
                              
                              // If artist matches, set the selected ID, otherwise leave it empty
                              setSelectedLabelArtistIdForAlbum(matchingArtist?.id || '');
                              
                              setShowAlbumModal(true);
                            }}
                            title="Add New Album"
                          >
                            <Plus className={`${expandedScheduleCards[item.id || ''] ? 'h-3 w-3 mr-1' : 'h-3 w-3'}`} />
                            {expandedScheduleCards[item.id || ''] && 'Add New Album'}
                          </Button>
                        )}
                        {(item.project_type === 'single' || item.project_type === 'track') && (
                          <Button 
                            variant="outline" 
                            size={expandedScheduleCards[item.id || ''] ? "sm" : "icon"}
                            className={`${expandedScheduleCards[item.id || ''] ? 'text-xs bg-blue-600 hover:bg-blue-700 text-white border-blue-500' : 'h-7 w-7 p-0 bg-blue-600 hover:bg-blue-700 text-white border-blue-500'}`}
                            onClick={() => {
                              // Use scheduled_date as release date, format it for the date input (YYYY-MM-DD)
                              const releaseDate = item.scheduled_date ? new Date(item.scheduled_date).toISOString().split('T')[0] : '';
                              openCreateTrackDialog(item.title, item.artist_name, releaseDate);
                            }}
                            title="Create Track"
                          >
                            <Plus className={`${expandedScheduleCards[item.id || ''] ? 'h-3 w-3 mr-1' : 'h-3 w-3'}`} />
                            {expandedScheduleCards[item.id || ''] && 'Create Track'}
                          </Button>
                        )}
                        
                        {/* Status Update Dropdown */}
                        {expandedScheduleCards[item.id || ''] && (
                          <Select 
                            value={item.status} 
                            onValueChange={(value: any) => updateScheduleItemStatus(item.id, value)}
                          >
                            <SelectTrigger className="text-xs h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="scheduled">Scheduled</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                              <SelectItem value="on_hold">On Hold</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        
                        <Button 
                          variant="outline" 
                          size={expandedScheduleCards[item.id || ''] ? "sm" : "icon"}
                          className={`${expandedScheduleCards[item.id || ''] ? 'text-xs text-red-500 hover:text-red-700' : 'h-7 w-7 p-0 text-red-500 hover:text-red-700'}`}
                          onClick={() => deleteScheduleItem(item.id)}
                          title="Delete"
                        >
                          <Trash2 className={`${expandedScheduleCards[item.id || ''] ? 'h-3 w-3 mr-1' : 'h-3 w-3'}`} />
                          {expandedScheduleCards[item.id || ''] && 'Delete'}
                        </Button>
                      </div>
                    </div>
                  </Card>
                  </Collapsible>
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

      {/* Edit Track Dialog */}
      <Dialog open={showEditTrackDialog} onOpenChange={setShowEditTrackDialog}>
        <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              Edit Track
            </DialogTitle>
            <DialogDescription className="text-gray-400 mt-2">
              Update the details of your track
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="editTrackTitle" className="text-white">Title</Label>
              <Input
                id="editTrackTitle"
                value={editTrackTitle}
                onChange={(e) => setEditTrackTitle(e.target.value)}
                placeholder="Enter track title"
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            
            <div>
              <Label htmlFor="editTrackArtist" className="text-white">Artist</Label>
              <Input
                id="editTrackArtist"
                value={editTrackArtist}
                onChange={(e) => setEditTrackArtist(e.target.value)}
                placeholder="Enter artist name"
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editTrackBpm" className="text-white">BPM</Label>
                <Input
                  id="editTrackBpm"
                  value={editTrackBpm}
                  onChange={(e) => setEditTrackBpm(e.target.value)}
                  placeholder="120"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
              
              <div>
                <Label htmlFor="editTrackKey" className="text-white">Key</Label>
                <Input
                  id="editTrackKey"
                  value={editTrackKey}
                  onChange={(e) => setEditTrackKey(e.target.value)}
                  placeholder="C Major"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editTrackGenre" className="text-white">Genre</Label>
                <Input
                  id="editTrackGenre"
                  value={editTrackGenre}
                  onChange={(e) => setEditTrackGenre(e.target.value)}
                  placeholder="Hip Hop"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
              
              <div>
                <Label htmlFor="editTrackSubgenre" className="text-white">Subgenre</Label>
                <Input
                  id="editTrackSubgenre"
                  value={editTrackSubgenre}
                  onChange={(e) => setEditTrackSubgenre(e.target.value)}
                  placeholder="Trap"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="editTrackReleaseDate" className="text-white">Release Date</Label>
              <Input
                id="editTrackReleaseDate"
                type="date"
                value={editTrackReleaseDate}
                onChange={(e) => setEditTrackReleaseDate(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            
            <div>
              <Label htmlFor="editTrackDuration" className="text-white">Duration (e.g., 3:45)</Label>
              <Input
                id="editTrackDuration"
                value={editTrackDuration}
                onChange={(e) => setEditTrackDuration(e.target.value)}
                placeholder="Enter duration"
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            
            <div>
              <Label htmlFor="editTrackAudioUrl" className="text-white">Audio URL</Label>
              <Input
                id="editTrackAudioUrl"
                value={editTrackAudioUrl}
                onChange={(e) => setEditTrackAudioUrl(e.target.value)}
                placeholder="Enter audio file URL"
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            
            <div>
              <Label htmlFor="editTrackDescription" className="text-white">Description</Label>
              <Textarea
                id="editTrackDescription"
                value={editTrackDescription}
                onChange={(e) => setEditTrackDescription(e.target.value)}
                placeholder="Enter description..."
                className="bg-gray-800 border-gray-600 text-white"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowEditTrackDialog(false)}
              className="bg-gray-800 hover:bg-gray-700 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={saveTrack}
              disabled={isSavingTrack || !editTrackTitle.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSavingTrack ? (
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

      {/* Create Track Dialog */}
      <Dialog open={showCreateTrackDialog} onOpenChange={setShowCreateTrackDialog}>
        <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              Create New Track
            </DialogTitle>
            <DialogDescription className="text-gray-400 mt-2">
              Add a new track to your library
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="newTrackTitle" className="text-white">Title *</Label>
              <Input
                id="newTrackTitle"
                value={newTrackTitle}
                onChange={(e) => setNewTrackTitle(e.target.value)}
                placeholder="Enter track title"
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            
            <div>
              <Label htmlFor="newTrackArtist" className="text-white">Artist *</Label>
              <Input
                id="newTrackArtist"
                value={newTrackArtist}
                onChange={(e) => setNewTrackArtist(e.target.value)}
                placeholder="Enter artist name"
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="newTrackBpm" className="text-white">BPM</Label>
                <Input
                  id="newTrackBpm"
                  value={newTrackBpm}
                  onChange={(e) => setNewTrackBpm(e.target.value)}
                  placeholder="120"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
              
              <div>
                <Label htmlFor="newTrackKey" className="text-white">Key</Label>
                <Input
                  id="newTrackKey"
                  value={newTrackKey}
                  onChange={(e) => setNewTrackKey(e.target.value)}
                  placeholder="C Major"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="newTrackGenre" className="text-white">Genre</Label>
                <Input
                  id="newTrackGenre"
                  value={newTrackGenre}
                  onChange={(e) => setNewTrackGenre(e.target.value)}
                  placeholder="Hip Hop"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
              
              <div>
                <Label htmlFor="newTrackSubgenre" className="text-white">Subgenre</Label>
                <Input
                  id="newTrackSubgenre"
                  value={newTrackSubgenre}
                  onChange={(e) => setNewTrackSubgenre(e.target.value)}
                  placeholder="Trap"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="newTrackReleaseDate" className="text-white">Release Date</Label>
              <Input
                id="newTrackReleaseDate"
                type="date"
                value={newTrackReleaseDate}
                onChange={(e) => setNewTrackReleaseDate(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            
            <div>
              <Label htmlFor="newTrackDuration" className="text-white">Duration (e.g., 3:45)</Label>
              <Input
                id="newTrackDuration"
                value={newTrackDuration}
                onChange={(e) => setNewTrackDuration(e.target.value)}
                placeholder="Enter duration"
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            
            <div>
              <Label htmlFor="newTrackDescription" className="text-white">Description</Label>
              <Textarea
                id="newTrackDescription"
                value={newTrackDescription}
                onChange={(e) => setNewTrackDescription(e.target.value)}
                placeholder="Enter description..."
                className="bg-gray-800 border-gray-600 text-white"
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="newTrackAudio" className="text-white">Audio File</Label>
              <input
                type="file"
                id="newTrackAudio"
                accept="audio/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setNewTrackAudioFile(file);
                  }
                }}
                className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer bg-gray-800 border border-gray-600 rounded-md"
              />
              {newTrackAudioFile && (
                <p className="text-sm text-gray-400 mt-1">
                  Selected: {newTrackAudioFile.name}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowCreateTrackDialog(false)}
              className="bg-gray-800 hover:bg-gray-700 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={createTrack}
              disabled={isCreatingTrack || !newTrackTitle.trim() || !newTrackArtist.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isCreatingTrack ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Track
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Beat Upload Dialog */}
      <Dialog open={showBeatUploadDialog} onOpenChange={setShowBeatUploadDialog}>
        <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              Upload Beat to Marketplace
            </DialogTitle>
            <DialogDescription className="text-gray-400 mt-2">
              Publish your beat to the marketplace for artists to discover and purchase
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="beatTitle" className="text-white">Title *</Label>
              <Input
                id="beatTitle"
                value={beatTitle}
                onChange={(e) => setBeatTitle(e.target.value)}
                placeholder="Enter beat title"
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="beatBpm" className="text-white">BPM *</Label>
                <Input
                  id="beatBpm"
                  value={beatBpm}
                  onChange={(e) => setBeatBpm(e.target.value)}
                  placeholder="120"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
              
              <div>
                <Label htmlFor="beatKey" className="text-white">Key *</Label>
                <Input
                  id="beatKey"
                  value={beatKey}
                  onChange={(e) => setBeatKey(e.target.value)}
                  placeholder="C Major"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="beatGenre" className="text-white">Genre *</Label>
                <Input
                  id="beatGenre"
                  value={beatGenre}
                  onChange={(e) => setBeatGenre(e.target.value)}
                  placeholder="Hip Hop"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
              
              <div>
                <Label htmlFor="beatPrice" className="text-white">Price ($)</Label>
                <Input
                  id="beatPrice"
                  value={beatPrice}
                  onChange={(e) => setBeatPrice(e.target.value)}
                  placeholder="29.99"
                  type="number"
                  step="0.01"
                  min="0"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="beatAudioFile" className="text-white">Audio File (MP3) *</Label>
              <input
                type="file"
                id="beatAudioFile"
                accept="audio/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setBeatAudioFile(file);
                  }
                }}
                className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer bg-gray-800 border border-gray-600 rounded-md"
              />
              {beatAudioFile && (
                <p className="text-sm text-gray-400 mt-1">
                  Selected: {beatAudioFile.name}
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="beatWavFile" className="text-white">WAV File (Optional)</Label>
              <input
                type="file"
                id="beatWavFile"
                accept="audio/wav"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setBeatWavFile(file);
                  }
                }}
                className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-green-600 file:text-white hover:file:bg-green-700 file:cursor-pointer bg-gray-800 border border-gray-600 rounded-md"
              />
              {beatWavFile && (
                <p className="text-sm text-gray-400 mt-1">
                  Selected: {beatWavFile.name}
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="beatCoverArtFile" className="text-white">Cover Art (Optional)</Label>
              <input
                type="file"
                id="beatCoverArtFile"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setBeatCoverArtFile(file);
                  }
                }}
                className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-purple-600 file:text-white hover:file:bg-purple-700 file:cursor-pointer bg-gray-800 border border-gray-600 rounded-md"
              />
              {beatCoverArtFile && (
                <p className="text-sm text-gray-400 mt-1">
                  Selected: {beatCoverArtFile.name}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowBeatUploadDialog(false)}
              className="bg-gray-800 hover:bg-gray-700 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={uploadBeat}
              disabled={isUploadingBeat || !beatTitle.trim() || !beatBpm.trim() || !beatKey.trim() || !beatGenre.trim() || !beatAudioFile}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isUploadingBeat ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Beat
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compression Options Dialog */}
      <Dialog open={showCompressionDialog} onOpenChange={setShowCompressionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose Compression Level</DialogTitle>
            <DialogDescription>
              Select how much to compress your audio file. Higher compression saves storage but may reduce quality.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid gap-3">
              <div 
                className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => {
                  if (compressionFile) {
                    if (compressionFile.type === 'single') {
                      convertSingleToMp3(compressionFile.id, compressionFile.url, 'ultra_high')
                    } else if (compressionFile.type === 'track') {
                      convertTrackToMp3(compressionFile.id, compressionFile.url, 'ultra_high')
                    } else {
                      convertAlbumTrackToMp3(compressionFile.id, compressionFile.url, 'ultra_high')
                    }
                    setShowCompressionDialog(false)
                    setCompressionFile(null)
                  }
                }}
              >
                <div className="flex-1">
                  <div className="font-medium">Ultra High Compression</div>
                  <div className="text-sm text-muted-foreground">Smallest file size, lowest quality</div>
                  <div className="text-xs text-muted-foreground mt-1">~64 kbps • 97% compression • Good for extreme storage saving</div>
                </div>
                <div className="w-4 h-4 rounded-full border-2 border-primary"></div>
              </div>

              <div 
                className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors bg-primary/5 border-primary/20"
                onClick={() => {
                  if (compressionFile) {
                    if (compressionFile.type === 'single') {
                      convertSingleToMp3(compressionFile.id, compressionFile.url, 'high')
                    } else if (compressionFile.type === 'track') {
                      convertTrackToMp3(compressionFile.id, compressionFile.url, 'high')
                    } else {
                      convertAlbumTrackToMp3(compressionFile.id, compressionFile.url, 'high')
                    }
                    setShowCompressionDialog(false)
                    setCompressionFile(null)
                  }
                }}
              >
                <div className="flex-1">
                  <div className="font-medium">High Compression</div>
                  <div className="text-sm text-muted-foreground">Smaller file size, reduced quality</div>
                  <div className="text-xs text-muted-foreground mt-1">~128 kbps • 94% compression • Good for storage saving</div>
                </div>
                <div className="w-4 h-4 rounded-full border-2 border-primary bg-primary"></div>
              </div>

              <div 
                className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => {
                  if (compressionFile) {
                    if (compressionFile.type === 'single') {
                      convertSingleToMp3(compressionFile.id, compressionFile.url, 'medium')
                    } else {
                      convertAlbumTrackToMp3(compressionFile.id, compressionFile.url, 'medium')
                    }
                    setShowCompressionDialog(false)
                    setCompressionFile(null)
                  }
                }}
              >
                <div className="flex-1">
                  <div className="font-medium">Medium Compression</div>
                  <div className="text-sm text-muted-foreground">Balanced file size and quality</div>
                  <div className="text-xs text-muted-foreground mt-1">~192 kbps • 90% compression • Recommended for most uses</div>
                </div>
                <div className="w-4 h-4 rounded-full border-2 border-primary"></div>
              </div>

              <div 
                className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => {
                  if (compressionFile) {
                    if (compressionFile.type === 'single') {
                      convertSingleToMp3(compressionFile.id, compressionFile.url, 'low')
                    } else {
                      convertAlbumTrackToMp3(compressionFile.id, compressionFile.url, 'low')
                    }
                    setShowCompressionDialog(false)
                    setCompressionFile(null)
                  }
                }}
              >
                <div className="flex-1">
                  <div className="font-medium">Low Compression</div>
                  <div className="text-sm text-muted-foreground">Better quality, larger file size</div>
                  <div className="text-xs text-muted-foreground mt-1">~320 kbps • 84% compression • Best for professional use</div>
                </div>
                <div className="w-4 h-4 rounded-full border-2 border-primary"></div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCompressionDialog(false)
                  setCompressionFile(null)
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Track Metadata Dialog */}
      <TrackMetadataDialog
        open={showMetadataDialog}
        onOpenChange={setShowMetadataDialog}
        trackId={editingTrackId}
        trackType={editingTrackType}
        initialMetadata={editingMetadata}
        onSave={saveMetadata}
      />

      {/* Notes Dialog */}
      <NotesDialog
        open={showNotesDialog}
        onOpenChange={setShowNotesDialog}
        itemId={editingNotesId}
        itemType={editingNotesType}
        initialNotes={editingNotes}
        itemTitle={editingNotesTitle}
        onSave={saveNotes}
      />

      {/* Create Single Dialog */}
      <Dialog open={showCreateSingleDialog} onOpenChange={setShowCreateSingleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Single</DialogTitle>
            <DialogDescription>
              Create a new single without audio. You can add the audio file later.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createSingle(); }} className="space-y-4">
            <div>
              <Label htmlFor="single-title">Title *</Label>
              <Input
                id="single-title"
                placeholder="Single Title"
                value={newSingle.title}
                onChange={e => setNewSingle({ ...newSingle, title: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="single-artist">Artist *</Label>
              <Select
                value={selectedLabelArtistIdForSingle || "none"}
                onValueChange={(value) => {
                  console.log('🔍 [LIBRARY SINGLE SELECT] Value changed:', value);
                  const artistId = value === "none" ? "" : value;
                  console.log('🔍 [LIBRARY SINGLE SELECT] Setting selectedLabelArtistIdForSingle to:', artistId);
                  setSelectedLabelArtistIdForSingle(artistId);
                  // Also set the artist name for display
                  if (artistId) {
                    const selectedArtist = labelArtists.find(a => a.id === artistId);
                    if (selectedArtist) {
                      setNewSingle({ ...newSingle, artist: selectedArtist.stage_name || selectedArtist.name });
                    }
                  } else {
                    setNewSingle({ ...newSingle, artist: '' });
                  }
                }}
                disabled={loadingLabelArtists}
                required
              >
                <SelectTrigger id="single-artist">
                  <SelectValue placeholder={loadingLabelArtists ? "Loading artists..." : "Select an artist"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {labelArtists.map((artist) => (
                    <SelectItem key={artist.id} value={artist.id}>
                      {artist.stage_name || artist.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="single-release-date">Release Date</Label>
              <Input
                id="single-release-date"
                type="date"
                value={newSingle.release_date}
                onChange={e => setNewSingle({ ...newSingle, release_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="single-description">Description</Label>
              <Textarea
                id="single-description"
                placeholder="Description"
                value={newSingle.description}
                onChange={e => setNewSingle({ ...newSingle, description: e.target.value })}
              />
            </div>
            {createSingleError && <div className="text-red-500 text-sm">{createSingleError}</div>}
            <DialogFooter>
              <Button type="submit" disabled={creatingSingle} className="bg-blue-600 hover:bg-blue-700 text-white">
                {creatingSingle ? 'Creating...' : 'Create Single'}
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Album Track Dialog */}
      <Dialog open={showCreateAlbumTrackDialog} onOpenChange={setShowCreateAlbumTrackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Track to Album</DialogTitle>
            <DialogDescription>
              {selectedAlbumForTrack && `Add a new track to "${selectedAlbumForTrack.title}". You can add the audio file later.`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createAlbumTrack(); }} className="space-y-4">
            <div>
              <Label htmlFor="track-title">Track Title *</Label>
              <Input
                id="track-title"
                placeholder="Track Title"
                value={newAlbumTrack.title}
                onChange={e => setNewAlbumTrack({ ...newAlbumTrack, title: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="track-artist">Artist *</Label>
              <Input
                id="track-artist"
                placeholder="Artist Name"
                value={newAlbumTrack.artist}
                onChange={e => setNewAlbumTrack({ ...newAlbumTrack, artist: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="track-release-date">Release Date</Label>
              <Input
                id="track-release-date"
                type="date"
                value={newAlbumTrack.release_date}
                onChange={e => setNewAlbumTrack({ ...newAlbumTrack, release_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="track-description">Description</Label>
              <Textarea
                id="track-description"
                placeholder="Description"
                value={newAlbumTrack.description}
                onChange={e => setNewAlbumTrack({ ...newAlbumTrack, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="track-bpm">BPM</Label>
                <Input
                  id="track-bpm"
                  type="number"
                  placeholder="140"
                  value={newAlbumTrack.bpm}
                  onChange={e => setNewAlbumTrack({ ...newAlbumTrack, bpm: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="track-key">Key</Label>
                <Input
                  id="track-key"
                  placeholder="C, Am, F#"
                  value={newAlbumTrack.key}
                  onChange={e => setNewAlbumTrack({ ...newAlbumTrack, key: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="track-genre">Genre</Label>
                <Input
                  id="track-genre"
                  placeholder="Hip-hop, Trap, House"
                  value={newAlbumTrack.genre}
                  onChange={e => setNewAlbumTrack({ ...newAlbumTrack, genre: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="track-subgenre">Subgenre</Label>
                <Input
                  id="track-subgenre"
                  placeholder="Drill, Boom Bap, Deep House"
                  value={newAlbumTrack.subgenre}
                  onChange={e => setNewAlbumTrack({ ...newAlbumTrack, subgenre: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="track-tags">Tags</Label>
              <Input
                id="track-tags"
                placeholder="dark, aggressive, 808 (comma-separated)"
                value={newAlbumTrack.tags}
                onChange={e => setNewAlbumTrack({ ...newAlbumTrack, tags: e.target.value })}
              />
            </div>
            {createAlbumTrackError && <div className="text-red-500 text-sm">{createAlbumTrackError}</div>}
            <DialogFooter>
              <Button type="submit" disabled={creatingAlbumTrack} className="bg-purple-600 hover:bg-purple-700 text-white">
                {creatingAlbumTrack ? 'Creating...' : 'Add Track'}
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Move Single Dialog */}
      <Dialog open={showMoveSingleDialog} onOpenChange={setShowMoveSingleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Single</DialogTitle>
            <DialogDescription>
              Move "{moveSingleTitle}" to tracks or to an album.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Destination</Label>
              
              {/* Move to Tracks Option */}
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="move-to-tracks"
                  name="destination"
                  checked={moveToTracks}
                  onChange={() => {
                    setMoveToTracks(true);
                    setSelectedTargetAlbum('');
                  }}
                  className="w-4 h-4"
                />
                <Label htmlFor="move-to-tracks" className="text-sm">
                  Move to Tracks
                </Label>
              </div>

              {/* Move to Album Option */}
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="move-to-album"
                  name="destination"
                  checked={!moveToTracks}
                  onChange={() => {
                    setMoveToTracks(false);
                    setSelectedTargetAlbum('');
                  }}
                  className="w-4 h-4"
                />
                <Label htmlFor="move-to-album" className="text-sm">
                  Move to Album
                </Label>
              </div>
            </div>

            {/* Album Selection */}
            {!moveToTracks && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Select Album</Label>
                <Select value={selectedTargetAlbum} onValueChange={setSelectedTargetAlbum}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an album..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAlbums.map((album) => (
                      <SelectItem key={album.id} value={album.id}>
                        {album.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {moveSingleError && (
              <div className="text-red-500 text-sm">{moveSingleError}</div>
            )}
          </div>

          <DialogFooter>
            <Button 
              onClick={executeMoveSingle}
              disabled={movingSingle || (!moveToTracks && !selectedTargetAlbum)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {movingSingle ? 'Moving...' : 'Move Single'}
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Track Dialog */}
      <Dialog open={showMoveTrackDialog} onOpenChange={setShowMoveTrackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Track</DialogTitle>
            <DialogDescription>
              Move "{moveTrackTitle || 'Track'}" to singles or to an album.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Destination</Label>
              
              {/* Move to Singles Option */}
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="move-track-to-singles"
                  name="track-destination"
                  checked={(moveTrackType || 'single') === 'single'}
                  onChange={() => {
                    setMoveTrackType('single');
                    setSelectedTargetAlbumForTrack('');
                  }}
                  className="w-4 h-4"
                />
                <Label htmlFor="move-track-to-singles" className="text-sm">
                  Move to Singles
                </Label>
              </div>

              {/* Move to Album Option */}
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="move-track-to-album"
                  name="track-destination"
                  checked={(moveTrackType || 'single') === 'album_track'}
                  onChange={() => {
                    setMoveTrackType('album_track');
                    setSelectedTargetAlbumForTrack('');
                  }}
                  className="w-4 h-4"
                />
                <Label htmlFor="move-track-to-album" className="text-sm">
                  Move to Album
                </Label>
              </div>
            </div>

            {/* Album Selection */}
            {(moveTrackType || 'single') === 'album_track' && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Select Album</Label>
                <Select value={selectedTargetAlbumForTrack || ''} onValueChange={(value) => setSelectedTargetAlbumForTrack(value || '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an album..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(availableAlbums || [])
                      .filter(album => album && album.id && album.title) // Filter out null/undefined albums
                      .map((album) => (
                        <SelectItem key={album.id} value={album.id}>
                          {album.title || 'Untitled Album'}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {moveTrackError && (
              <div className="text-red-500 text-sm">{moveTrackError}</div>
            )}
          </div>

          <DialogFooter>
            <Button 
              onClick={executeMoveTrack}
              disabled={movingTrack || ((moveTrackType || 'single') === 'album_track' && !selectedTargetAlbumForTrack)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {movingTrack ? 'Moving...' : 'Move Track'}
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Production Schedule Item Dialog */}
      <Dialog open={showCreateScheduleItemDialog} onOpenChange={setShowCreateScheduleItemDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Production Schedule Item</DialogTitle>
            <DialogDescription>
              Schedule a new production task, collaboration, or recording session.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={createScheduleItem} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title" className="text-sm font-medium">Title *</Label>
                <Input
                  id="title"
                  value={newScheduleItem.title}
                  onChange={(e) => setNewScheduleItem({...newScheduleItem, title: e.target.value})}
                  placeholder="e.g., Studio Recording Session"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="type" className="text-sm font-medium">Type *</Label>
                <Select value={newScheduleItem.type} onValueChange={(value: any) => setNewScheduleItem({...newScheduleItem, type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="collaboration">Collaboration</SelectItem>
                    <SelectItem value="song_production">Song Production</SelectItem>
                    <SelectItem value="beat_production">Beat Production</SelectItem>
                    <SelectItem value="mixing">Mixing</SelectItem>
                    <SelectItem value="mastering">Mastering</SelectItem>
                    <SelectItem value="recording">Recording</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="priority" className="text-sm font-medium">Priority *</Label>
                <Select value={newScheduleItem.priority} onValueChange={(value: any) => setNewScheduleItem({...newScheduleItem, priority: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="assigned_to" className="text-sm font-medium">Assigned To</Label>
                <Input
                  id="assigned_to"
                  value={newScheduleItem.assigned_to}
                  onChange={(e) => setNewScheduleItem({...newScheduleItem, assigned_to: e.target.value})}
                  placeholder="e.g., John Producer"
                />
              </div>
              
              <div>
                <Label htmlFor="scheduled_date" className="text-sm font-medium">Scheduled Date *</Label>
                <Input
                  id="scheduled_date"
                  type="date"
                  value={newScheduleItem.scheduled_date}
                  onChange={(e) => setNewScheduleItem({...newScheduleItem, scheduled_date: e.target.value})}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="due_date" className="text-sm font-medium">Due Date *</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={newScheduleItem.due_date}
                  onChange={(e) => setNewScheduleItem({...newScheduleItem, due_date: e.target.value})}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="location" className="text-sm font-medium">Location</Label>
                <Input
                  id="location"
                  value={newScheduleItem.location}
                  onChange={(e) => setNewScheduleItem({...newScheduleItem, location: e.target.value})}
                  placeholder="e.g., Studio A, Home Studio"
                />
              </div>
              
              <div>
                <Label htmlFor="budget" className="text-sm font-medium">Budget</Label>
                <Input
                  id="budget"
                  type="number"
                  value={newScheduleItem.budget}
                  onChange={(e) => setNewScheduleItem({...newScheduleItem, budget: e.target.value})}
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
              
              <div>
                <Label htmlFor="currency" className="text-sm font-medium">Currency</Label>
                <Select value={newScheduleItem.currency} onValueChange={(value) => setNewScheduleItem({...newScheduleItem, currency: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="description" className="text-sm font-medium">Description</Label>
              <Textarea
                id="description"
                value={newScheduleItem.description}
                onChange={(e) => setNewScheduleItem({...newScheduleItem, description: e.target.value})}
                placeholder="Describe the production task or session..."
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
              <Textarea
                id="notes"
                value={newScheduleItem.notes}
                onChange={(e) => setNewScheduleItem({...newScheduleItem, notes: e.target.value})}
                placeholder="Additional notes or requirements..."
                rows={2}
              />
            </div>
            
            {scheduleItemCreateError && (
              <div className="text-red-500 text-sm">{scheduleItemCreateError}</div>
            )}
            
            <DialogFooter>
              <Button 
                type="submit" 
                disabled={scheduleItemCreating}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {scheduleItemCreating ? 'Creating...' : 'Create Schedule Item'}
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Production Schedule Item Dialog */}
      <Dialog open={showEditScheduleItemDialog} onOpenChange={setShowEditScheduleItemDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Production Schedule Item</DialogTitle>
            <DialogDescription>
              Update the production schedule item details.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={updateScheduleItem} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-title" className="text-sm font-medium">Title *</Label>
                <Input
                  id="edit-title"
                  value={editScheduleItemForm.title}
                  onChange={(e) => setEditScheduleItemForm({...editScheduleItemForm, title: e.target.value})}
                  placeholder="e.g., Studio Recording Session"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="edit-type" className="text-sm font-medium">Type *</Label>
                <Select value={editScheduleItemForm.type} onValueChange={(value: any) => setEditScheduleItemForm({...editScheduleItemForm, type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="collaboration">Collaboration</SelectItem>
                    <SelectItem value="song_production">Song Production</SelectItem>
                    <SelectItem value="beat_production">Beat Production</SelectItem>
                    <SelectItem value="mixing">Mixing</SelectItem>
                    <SelectItem value="mastering">Mastering</SelectItem>
                    <SelectItem value="recording">Recording</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="edit-status" className="text-sm font-medium">Status *</Label>
                <Select value={editScheduleItemForm.status} onValueChange={(value: any) => setEditScheduleItemForm({...editScheduleItemForm, status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="edit-priority" className="text-sm font-medium">Priority *</Label>
                <Select value={editScheduleItemForm.priority} onValueChange={(value: any) => setEditScheduleItemForm({...editScheduleItemForm, priority: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="edit-assigned_to" className="text-sm font-medium">Assigned To</Label>
                <Input
                  id="edit-assigned_to"
                  value={editScheduleItemForm.assigned_to}
                  onChange={(e) => setEditScheduleItemForm({...editScheduleItemForm, assigned_to: e.target.value})}
                  placeholder="e.g., John Producer"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-scheduled_date" className="text-sm font-medium">Scheduled Date *</Label>
                <Input
                  id="edit-scheduled_date"
                  type="date"
                  value={editScheduleItemForm.scheduled_date}
                  onChange={(e) => setEditScheduleItemForm({...editScheduleItemForm, scheduled_date: e.target.value})}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="edit-due_date" className="text-sm font-medium">Due Date *</Label>
                <Input
                  id="edit-due_date"
                  type="date"
                  value={editScheduleItemForm.due_date}
                  onChange={(e) => setEditScheduleItemForm({...editScheduleItemForm, due_date: e.target.value})}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="edit-location" className="text-sm font-medium">Location</Label>
                <Input
                  id="edit-location"
                  value={editScheduleItemForm.location}
                  onChange={(e) => setEditScheduleItemForm({...editScheduleItemForm, location: e.target.value})}
                  placeholder="e.g., Studio A, Home Studio"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-budget" className="text-sm font-medium">Budget</Label>
                <Input
                  id="edit-budget"
                  type="number"
                  value={editScheduleItemForm.budget}
                  onChange={(e) => setEditScheduleItemForm({...editScheduleItemForm, budget: e.target.value})}
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-currency" className="text-sm font-medium">Currency</Label>
                <Select value={editScheduleItemForm.currency} onValueChange={(value) => setEditScheduleItemForm({...editScheduleItemForm, currency: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="edit-description" className="text-sm font-medium">Description</Label>
              <Textarea
                id="edit-description"
                value={editScheduleItemForm.description}
                onChange={(e) => setEditScheduleItemForm({...editScheduleItemForm, description: e.target.value})}
                placeholder="Describe the production task or session..."
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="edit-notes" className="text-sm font-medium">Notes</Label>
              <Textarea
                id="edit-notes"
                value={editScheduleItemForm.notes}
                onChange={(e) => setEditScheduleItemForm({...editScheduleItemForm, notes: e.target.value})}
                placeholder="Additional notes or requirements..."
                rows={2}
              />
            </div>
            
            {scheduleItemUpdateError && (
              <div className="text-red-500 text-sm">{scheduleItemUpdateError}</div>
            )}
            
            <DialogFooter>
              <Button 
                type="submit" 
                disabled={scheduleItemUpdating}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {scheduleItemUpdating ? 'Updating...' : 'Update Schedule Item'}
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Link Project Dialog */}
      <Dialog open={showLinkProjectDialog} onOpenChange={setShowLinkProjectDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Link Project to Schedule Item</DialogTitle>
            <DialogDescription>
              Search and link an existing album, single, or track to this production schedule item.
            </DialogDescription>
          </DialogHeader>
          
          {linkingScheduleItem && (
            <div className="space-y-4">
              {/* Project Type Selection */}
              <div>
                <Label className="text-sm font-medium">Project Type</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant={linkProjectType === 'album' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLinkProjectType('album')}
                    className="text-xs"
                  >
                    Albums
                  </Button>
                  <Button
                    variant={linkProjectType === 'single' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLinkProjectType('single')}
                    className="text-xs"
                  >
                    Singles
                  </Button>
                  <Button
                    variant={linkProjectType === 'track' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLinkProjectType('track')}
                    className="text-xs"
                  >
                    Tracks
                  </Button>
                </div>
              </div>

              {/* Search Input */}
              <div>
                <Label htmlFor="project-search" className="text-sm font-medium">Search Projects</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="project-search"
                    placeholder={`Search ${linkProjectType}s...`}
                    value={linkProjectSearchQuery}
                    onChange={(e) => {
                      setLinkProjectSearchQuery(e.target.value);
                      if (e.target.value.trim()) {
                        searchProjects(e.target.value, linkProjectType);
                      } else {
                        setLinkProjectSearchResults({ albums: [], singles: [], tracks: [] });
                      }
                    }}
                  />
                  <Button
                    onClick={() => searchProjects(linkProjectSearchQuery, linkProjectType)}
                    disabled={linkProjectLoading || !linkProjectSearchQuery.trim()}
                    size="sm"
                  >
                    {linkProjectLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Search Results */}
              <div className="max-h-60 overflow-y-auto">
                {linkProjectError && (
                  <div className="text-red-500 text-sm p-2">{linkProjectError}</div>
                )}
                
                {linkProjectLoading ? (
                  <div className="text-center py-4 text-gray-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Searching...
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Albums */}
                    {linkProjectType === 'album' && linkProjectSearchResults.albums.map((album: any) => (
                      <div
                        key={album.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-800 cursor-pointer"
                        onClick={() => linkProjectToSchedule(album.id, 'album')}
                      >
                        <div>
                          <div className="font-medium text-white">{album.title}</div>
                          <div className="text-sm text-gray-400">{album.artist}</div>
                          <div className="text-xs text-gray-500">{album.release_date}</div>
                        </div>
                        <Button size="sm" variant="outline">
                          <LinkIcon className="h-3 w-3 mr-1" />
                          Link
                        </Button>
                      </div>
                    ))}

                    {/* Singles */}
                    {linkProjectType === 'single' && linkProjectSearchResults.singles.map((single: any) => (
                      <div
                        key={single.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-800 cursor-pointer"
                        onClick={() => linkProjectToSchedule(single.id, 'single')}
                      >
                        <div className="flex-1">
                          <div className="font-medium text-white">{single.title}</div>
                          <div className="text-sm text-gray-400">{single.artist}</div>
                          <div className="text-xs text-gray-500">{single.release_date}</div>
                          <div className="text-xs text-gray-400">Debug: session_id={single.session_id}, session_name={single.session_name}</div>
                          {single.session_id && single.session_name && (
                            <div className="mt-1">
                              <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600/20 border border-blue-500/30 rounded text-xs">
                                <LinkIcon className="h-3 w-3 text-blue-400" />
                                <span className="text-blue-300">Session: {single.session_name}</span>
                              </div>
                            </div>
                          )}
                        </div>
                        <Button size="sm" variant="outline">
                          <LinkIcon className="h-3 w-3 mr-1" />
                          Link
                        </Button>
                      </div>
                    ))}

                    {/* Tracks */}
                    {linkProjectType === 'track' && linkProjectSearchResults.tracks.map((track: any) => (
                      <div
                        key={track.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-800 cursor-pointer"
                        onClick={() => linkProjectToSchedule(track.id, 'track')}
                      >
                        <div className="flex-1">
                          <div className="font-medium text-white">{track.title}</div>
                          <div className="text-sm text-gray-400">{track.artist}</div>
                          <div className="text-xs text-gray-500">{track.release_date}</div>
                          <div className="text-xs text-gray-400">Debug: session_id={track.session_id}, session_name={track.session_name}</div>
                          {track.session_id && track.session_name && (
                            <div className="mt-1">
                              <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600/20 border border-blue-500/30 rounded text-xs">
                                <LinkIcon className="h-3 w-3 text-blue-400" />
                                <span className="text-blue-300">Session: {track.session_name}</span>
                              </div>
                            </div>
                          )}
                        </div>
                        <Button size="sm" variant="outline">
                          <LinkIcon className="h-3 w-3 mr-1" />
                          Link
                        </Button>
                      </div>
                    ))}

                                                             {!linkProjectLoading && linkProjectSearchQuery.trim() && 
                     (linkProjectSearchResults[linkProjectType as keyof typeof linkProjectSearchResults] || []).length === 0 && (
                      <div className="text-center py-4 text-gray-500">
                        No {linkProjectType}s found matching "{linkProjectSearchQuery}"
                      </div>
                    )}
                    
                    {!linkProjectLoading && !linkProjectSearchQuery.trim() && 
                     (linkProjectSearchResults[linkProjectType as keyof typeof linkProjectSearchResults] || []).length === 0 && (
                      <div className="text-center py-4 text-gray-500">
                        No {linkProjectType}s found in your library
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Current Link Display */}
              {linkingScheduleItem.project_id && (
                <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                  <div className="text-sm font-medium text-blue-300 mb-1">Currently Linked:</div>
                  <div className="text-sm text-white">
                    {linkingScheduleItem.project_type ? linkingScheduleItem.project_type.charAt(0).toUpperCase() + linkingScheduleItem.project_type.slice(1) : 'Project'} ID: {linkingScheduleItem.project_id}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 text-red-500 hover:text-red-700 border-red-500"
                    onClick={() => unlinkProjectFromSchedule(linkingScheduleItem.id)}
                  >
                    <Unlink className="h-3 w-3 mr-1" />
                    Unlink Project
                  </Button>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 