"use client"

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, FileText, Trash2, FileAudio, Loader2, Link as LinkIcon, Globe, Circle, Play, Pause, Clock, Archive, Download, CheckCircle2, XCircle, FileText as FileTextIcon, StickyNote, Folder, Music, ExternalLink, Upload, GripVertical, Sparkles, Edit2, RotateCcw, X, Settings } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import { TrackMetadataDialog } from '@/components/TrackMetadataDialog'
import { NotesDialog } from '@/components/NotesDialog'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { OpenAIService } from '@/lib/ai-services'

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
  user_id?: string
  label_artist_id?: string
}

interface LabelArtist {
  id: string
  name: string
  stage_name?: string
  image_url?: string
}

export default function AlbumDetailsPage() {
  const params = useParams() || {}
  const albumId = params && 'albumId' in params ? (Array.isArray(params.albumId) ? params.albumId[0] : params.albumId) : ''
  const router = useRouter()
  const { toast } = useToast()
  const { user, getAccessToken } = useAuth()
  const [album, setAlbum] = useState<Album | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tracks, setTracks] = useState<any[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(true);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [showAddTrack, setShowAddTrack] = useState(false);
  const [showAddTrackOptions, setShowAddTrackOptions] = useState(false);
  const [addingTrack, setAddingTrack] = useState(false);
  const [addTrackError, setAddTrackError] = useState<string | null>(null);
  const [newTrack, setNewTrack] = useState({ title: '', duration: '', isrc: '' });
  const [audioUploading, setAudioUploading] = useState(false);
  const [audioUploadError, setAudioUploadError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [addMultipleTracks, setAddMultipleTracks] = useState(false);
  const [numberOfTracks, setNumberOfTracks] = useState<number>(2);
  const [multipleTracks, setMultipleTracks] = useState<Array<{ title: string; duration: string; isrc: string; audio_url: string }>>([]);

  // Edit track modal state
  const [editTrackId, setEditTrackId] = useState<string | null>(null);
  const [editTrack, setEditTrack] = useState({ title: '', duration: '', isrc: '', audio_url: '' });
  const [editTrackSaving, setEditTrackSaving] = useState(false);
  const [editTrackError, setEditTrackError] = useState<string | null>(null);
  const [editAudioUploading, setEditAudioUploading] = useState(false);
  const [editAudioUploadError, setEditAudioUploadError] = useState<string | null>(null);

  // Conversion state
  const [convertingTrack, setConvertingTrack] = useState<string | null>(null);
  const [replacingTrackId, setReplacingTrackId] = useState<string | null>(null);
  const [showCompressionDialog, setShowCompressionDialog] = useState(false);
  const [compressionFile, setCompressionFile] = useState<{ id: string; url: string } | null>(null);
  
  // Track recently replaced files (for temporary labels)
  const [recentlyReplacedTracks, setRecentlyReplacedTracks] = useState<Set<string>>(new Set());
  
  // Audio playback state
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
  
  // Stems/ZIP file availability state
  const [trackStemsAvailability, setTrackStemsAvailability] = useState<Record<string, { available: boolean; paths: string[] }>>({});
  const [trackWavAvailability, setTrackWavAvailability] = useState<Record<string, { available: boolean; paths: string[] }>>({});
  const [checkingStems, setCheckingStems] = useState(false);
  
  // Track details dialog state
  const [viewDetailsTrack, setViewDetailsTrack] = useState<any | null>(null);
  const [showTrackDetailsDialog, setShowTrackDetailsDialog] = useState(false);

  // Album editing state
  const [showEditAlbum, setShowEditAlbum] = useState(false);
  const [editAlbumForm, setEditAlbumForm] = useState({ title: '', artist: '', release_date: '', description: '', cover_art_url: '', distributor: '', distributor_notes: '', notes: '' });
  const [editAlbumSaving, setEditAlbumSaving] = useState(false);
  const [editAlbumError, setEditAlbumError] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [generatingCoverArt, setGeneratingCoverArt] = useState(false);
  const [showCoverArtPromptDialog, setShowCoverArtPromptDialog] = useState(false);
  const [coverArtPrompt, setCoverArtPrompt] = useState('');
  
  // Cover art cropping state
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [cropImage, setCropImage] = useState<HTMLImageElement | null>(null);
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [cropSize, setCropSize] = useState<1600 | 3000>(1600);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const [cropCanvasRef, setCropCanvasRef] = useState<HTMLCanvasElement | null>(null);
  const [canvasScale, setCanvasScale] = useState(1);
  
  // Multiple artists state for edit album
  const [editAlbumArtists, setEditAlbumArtists] = useState<string[]>([]);
  const [newArtistInput, setNewArtistInput] = useState('');

  // Label artists state (for publishing to artist pages)
  const [labelArtists, setLabelArtists] = useState<LabelArtist[]>([]);
  const [loadingLabelArtists, setLoadingLabelArtists] = useState(false);
  const [selectedLabelArtistId, setSelectedLabelArtistId] = useState<string>('');
  const [publishingAlbum, setPublishingAlbum] = useState(false);

  // Move track state
  const [showMoveTrackDialog, setShowMoveTrackDialog] = useState(false);
  const [moveTrackId, setMoveTrackId] = useState<string | null>(null);
  const [moveTrackTitle, setMoveTrackTitle] = useState('');
  const [availableAlbums, setAvailableAlbums] = useState<any[]>([]);
  const [selectedTargetAlbum, setSelectedTargetAlbum] = useState<string>('');
  const [moveToSingles, setMoveToSingles] = useState(false);
  const [movingTrack, setMovingTrack] = useState(false);
  const [moveTrackError, setMoveTrackError] = useState<string | null>(null);

  // Metadata states
  const [showMetadataDialog, setShowMetadataDialog] = useState(false);
  
  // Drag and drop reordering state
  const [draggedTrack, setDraggedTrack] = useState<any>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [editingMetadata, setEditingMetadata] = useState<any>(null);
  const [editingTrackId, setEditingTrackId] = useState('');
  const [editingTrackType, setEditingTrackType] = useState<'single' | 'album_track'>('album_track');
  
  // Notes states
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [editingNotes, setEditingNotes] = useState('');
  const [editingNotesId, setEditingNotesId] = useState('');
  const [editingNotesType, setEditingNotesType] = useState<'album' | 'single' | 'album_track'>('album_track');
  const [editingNotesTitle, setEditingNotesTitle] = useState('');

  // AI track title generation state
  const [generatingTitles, setGeneratingTitles] = useState(false);
  const [generatedTitles, setGeneratedTitles] = useState<string[]>([]);
  const [showGeneratedTitlesDialog, setShowGeneratedTitlesDialog] = useState(false);
  const [editingTitleIndex, setEditingTitleIndex] = useState<number | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState<string>('');
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const [regeneratingTrackId, setRegeneratingTrackId] = useState<string | null>(null);
  const [editingTrackTitleId, setEditingTrackTitleId] = useState<string | null>(null);
  const [editingTrackTitleValue, setEditingTrackTitleValue] = useState<string>('');


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

  useEffect(() => {
    async function fetchAlbum() {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase.from('albums').select('*').eq('id', albumId).single()
      if (error) {
        setError('Album not found.')
        setAlbum(null)
      } else {
        setAlbum(data)
        // Set selected label artist if album is already published
        if (data.label_artist_id) {
          setSelectedLabelArtistId(data.label_artist_id)
        }
      }
      setLoading(false)
    }
    if (albumId) fetchAlbum()
  }, [albumId])

  // Fetch tracks for this album
  useEffect(() => {
    if (!albumId) return;
    setLoadingTracks(true);
    console.log('Fetching album tracks for album:', albumId);
    
    supabase.from('album_tracks')
      .select('*')
      .eq('album_id', albumId)
      .order('track_order', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error('Error fetching album tracks:', error);
          setTrackError(error.message);
        } else {
          console.log('Fetched album tracks:', data);
          
          // Transform data to include session_name if available
          const tracksWithSessionName = data?.map(track => ({
            ...track,
            session_name: track.beat_sessions?.name || null
          })) || [];
          
          console.log('Transformed tracks:', tracksWithSessionName);
          setTracks(tracksWithSessionName);
        }
        setLoadingTracks(false);
      });
  }, [albumId, showAddTrack]);
  
  // Check for additional files (stems/WAV) when tracks or album are loaded
  useEffect(() => {
    if (album && tracks.length > 0) {
      checkForAdditionalFiles();
    }
  }, [album, tracks.length]);

  // Cleanup audio when component unmounts
  useEffect(() => {
    return () => {
      if (audioRef) {
        audioRef.pause();
        audioRef.currentTime = 0;
      }
    };
  }, [audioRef]);

  // Audio playback management
  useEffect(() => {
    if (audioRef) {
      const handlePlay = () => {
        // Audio started playing
      };
      
      const handlePause = () => {
        // Audio paused
      };
      
      const handleEnded = () => {
        setPlayingTrackId(null);
      };
      
      const handleError = () => {
        setPlayingTrackId(null);
        toast({
          title: "Playback Error",
          description: "Failed to play audio track",
          variant: "destructive"
        });
      };

      audioRef.addEventListener('play', handlePlay);
      audioRef.addEventListener('pause', handlePause);
      audioRef.addEventListener('ended', handleEnded);
      audioRef.addEventListener('error', handleError);

      return () => {
        audioRef.removeEventListener('play', handlePlay);
        audioRef.removeEventListener('pause', handlePause);
        audioRef.removeEventListener('ended', handleEnded);
        audioRef.removeEventListener('error', handleError);
      };
    }
  }, [audioRef, toast]);

  // Helper to upload audio file
  const uploadTrackAudio = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `album_tracks/${albumId}/${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('beats').upload(filePath, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('beats').getPublicUrl(filePath);
      return data?.publicUrl || null;
    } catch (error) {
      console.error('Error uploading audio:', error);
      return null;
    }
  };

  // Helper to stop currently playing audio
  const stopCurrentAudio = () => {
    if (audioRef) {
      audioRef.pause();
      audioRef.currentTime = 0;
    }
    setPlayingTrackId(null);
  };

  // Helper to play a specific track
  const playTrack = (trackId: string, audioUrl: string) => {
    console.log('Playing track:', trackId, 'with URL:', audioUrl);
    // Stop any currently playing audio first
    stopCurrentAudio();
    
    // Start playing the new track
    setPlayingTrackId(trackId);
    if (audioRef) {
      audioRef.src = audioUrl;
      audioRef.play().catch(error => {
        console.error('Error playing audio:', error);
        setPlayingTrackId(null);
        toast({
          title: "Playback Error",
          description: "Failed to play audio track",
          variant: "destructive"
        });
      });
    }
  };



  // Update track status function
  const updateTrackStatus = async (trackId: string, newStatus: 'production' | 'draft' | 'distribute' | 'error' | 'published' | 'other') => {
    try {
      const { error } = await supabase
        .from('album_tracks')
        .update({ status: newStatus })
        .eq('id', trackId);

      if (error) throw error;

      setTracks(prev => prev.map(track =>
        track.id === trackId ? { ...track, status: newStatus } : track
      ));

      toast({
        title: "Success",
        description: `Track status updated to ${newStatus}`
      });
    } catch (error) {
      console.error('Error updating track status:', error);
      toast({
        title: "Error",
        description: "Failed to update track status",
        variant: "destructive"
      });
    }
  };

  // Check for stems and WAV files for all tracks
  const checkForAdditionalFiles = async () => {
    if (!album || !tracks.length) return;
    
    setCheckingStems(true);
    try {
      const stemsAvailability: Record<string, { available: boolean; paths: string[] }> = {};
      const wavAvailability: Record<string, { available: boolean; paths: string[] }> = {};
      
      // List all files in the album's folder
      const albumPath = `albums/${album.user_id}/${albumId}/`;
      const { data: files, error } = await supabase.storage
        .from('beats')
        .list(albumPath);
      
      if (error) {
        console.error('Error listing files:', error);
        return;
      }
      
      // Check each track for stems and WAV files
      for (const track of tracks) {
        const trackStemsFiles: string[] = [];
        const trackWavFiles: string[] = [];
        
        if (files) {
          // Look for files containing the track title and _stems or _wav
          const trackTitleClean = track.title.replace(/\.[^/.]+$/, ''); // Remove extension
          
          for (const file of files) {
            const fileName = file.name.toLowerCase();
            const trackLower = trackTitleClean.toLowerCase();
            
            // Check if this file belongs to this track
            if (fileName.includes(trackLower)) {
              if (fileName.includes('_stems') && fileName.endsWith('.zip')) {
                trackStemsFiles.push(`${albumPath}${file.name}`);
              } else if (fileName.includes('_wav') && fileName.endsWith('.wav')) {
                trackWavFiles.push(`${albumPath}${file.name}`);
              }
            }
          }
        }
        
        stemsAvailability[track.id] = {
          available: trackStemsFiles.length > 0,
          paths: trackStemsFiles
        };
        
        wavAvailability[track.id] = {
          available: trackWavFiles.length > 0,
          paths: trackWavFiles
        };
      }
      
      setTrackStemsAvailability(stemsAvailability);
      setTrackWavAvailability(wavAvailability);
    } catch (error) {
      console.error('Error checking for additional files:', error);
    } finally {
      setCheckingStems(false);
    }
  };
  
  // Download a file from storage
  const downloadFile = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('beats')
        .download(filePath);
      
      if (error) throw error;
      
      // Create a download link
      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Download Started",
        description: `Downloading ${fileName}...`
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Download Error",
        description: "Failed to download file",
        variant: "destructive"
      });
    }
  };
  
  // Delete a file from storage
  const deleteFile = async (filePath: string, trackId: string, fileType: 'stems' | 'wav') => {
    try {
      const { error } = await supabase.storage
        .from('beats')
        .remove([filePath]);
      
      if (error) throw error;
      
      // Refresh the availability
      await checkForAdditionalFiles();
      
      toast({
        title: "File Deleted",
        description: `${fileType === 'stems' ? 'Stems ZIP' : 'WAV'} file deleted successfully`
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: "Delete Error",
        description: "Failed to delete file",
        variant: "destructive"
      });
    }
  };
  
  // Open track details dialog
  const openTrackDetailsDialog = (track: any) => {
    setViewDetailsTrack(track);
    setShowTrackDetailsDialog(true);
  };

  // Drag and drop reordering functions
  const handleDragStart = (e: React.DragEvent, track: any) => {
    setDraggedTrack(track);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (!draggedTrack) return;

    const draggedIndex = tracks.findIndex(track => track.id === draggedTrack.id);
    if (draggedIndex === -1) return;

    const newTracks = [...tracks];
    const [removed] = newTracks.splice(draggedIndex, 1);
    newTracks.splice(dropIndex, 0, removed);

    setTracks(newTracks);
    setDraggedTrack(null);
    setDragOverIndex(null);

    // Save the new order to the database
    saveTrackOrder(newTracks);
  };

  const handleDragEnd = () => {
    setDraggedTrack(null);
    setDragOverIndex(null);
  };

  const saveTrackOrder = async (newTracks: any[]) => {
    try {
      // Update the track_order field in the album_tracks table
      // Include all existing track data to avoid NOT NULL constraint violations
      const updates = newTracks.map((track, index) => ({
        id: track.id,
        album_id: track.album_id,
        title: track.title,
        duration: track.duration,
        isrc: track.isrc,
        audio_url: track.audio_url,
        status: track.status,
        created_at: track.created_at,
        updated_at: track.updated_at,
        track_order: index + 1
      }));

      const { error } = await supabase
        .from('album_tracks')
        .upsert(updates, { onConflict: 'id' });

      if (error) {
        console.error('Error saving track order:', error);
        toast({
          title: "Error",
          description: "Failed to save track order",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success",
          description: "Track order updated",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error saving track order:', error);
      toast({
        title: "Error",
        description: "Failed to save track order",
        variant: "destructive"
      });
    }
  };

  // Update album status function
  const updateAlbumStatus = async (newStatus: 'production' | 'draft' | 'distribute' | 'error' | 'published' | 'other') => {
    if (!album) return;
    
    const { error } = await supabase
      .from('albums')
      .update({ status: newStatus })
      .eq('id', album.id);
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to update status: " + error.message,
        variant: "destructive"
      });
      return;
    }
    
    setAlbum({ ...album, status: newStatus });
    toast({
      title: "Success",
      description: `Status updated to ${newStatus}`,
    });
  };

  // Helper to upload audio for edit
  async function uploadEditTrackAudio(file: File, trackId: string): Promise<string | null> {
    setEditAudioUploading(true);
    setEditAudioUploadError(null);
    const fileExt = file.name.split('.').pop();
    const filePath = `album_tracks/${albumId}/${trackId}_${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from('beats').upload(filePath, file, { upsert: true });
    if (error) {
      setEditAudioUploadError(error.message);
      setEditAudioUploading(false);
      return null;
    }
    const { data } = supabase.storage.from('beats').getPublicUrl(filePath);
    setEditAudioUploading(false);
    return data?.publicUrl || null;
  }

  // Add Track: handle audio upload
  // In the Add Track modal, add a file input for audio
  // When a file is selected, upload and set audioUrl
  // On submit, use audioUrl as audio_url
  // Handle adding multiple tracks directly (no form)
  async function handleAddMultipleTracksDirectly(count: number) {
    if (!albumId || !album) {
      toast({
        title: "Error",
        description: "Album not found",
        variant: "destructive"
      });
      return;
    }
    if (addingTrack) return;
    
    setAddingTrack(true);
    
    try {
      const nextTrackOrder = tracks.length + 1;
      
      // Create tracks with auto-generated names
      const tracksToInsert = Array(count).fill(null).map((_, index) => ({
        title: `Track ${nextTrackOrder + index}`,
        duration: '',
        isrc: '',
        audio_url: '',
        album_id: albumId,
        track_order: nextTrackOrder + index,
        status: 'draft'
      }));
      
      const { data, error } = await supabase
        .from('album_tracks')
        .insert(tracksToInsert);
        
      if (error) {
        console.error('Error inserting tracks:', error);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
        setAddingTrack(false);
        return;
      }
      
      // Refresh tracks from database
      const { data: refreshedTracks, error: refreshError } = await supabase
        .from('album_tracks')
        .select('*')
        .eq('album_id', albumId)
        .order('track_order', { ascending: true });
        
      if (!refreshError && refreshedTracks) {
        const tracksWithSessionName = refreshedTracks.map(track => ({
          ...track,
          session_name: track.beat_sessions?.name || null
        }));
        setTracks(tracksWithSessionName);
      }
      
      toast({
        title: "Success",
        description: `${count} track(s) have been added to the album.`,
        variant: "default",
      });
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "Failed to add tracks",
        variant: "destructive"
      });
    } finally {
      setAddingTrack(false);
    }
  }

  // Handle adding multiple tracks (with form - kept for backward compatibility)
  async function handleAddMultipleTracks(e: React.FormEvent) {
    e.preventDefault();
    if (!albumId || !album) {
      setAddTrackError('Album not found');
      return;
    }
    if (addingTrack) return;
    
    setAddingTrack(true);
    setAddTrackError(null);
    
    try {
      const nextTrackOrder = tracks.length + 1;
      
      // Prepare tracks to insert - auto-generate titles based on order
      const tracksToInsert = multipleTracks.map((track, index) => ({
        ...track,
        title: `Track ${nextTrackOrder + index}`, // Auto-name based on track order
        album_id: albumId,
        track_order: nextTrackOrder + index,
        status: 'draft'
      }));
      
      if (tracksToInsert.length === 0) {
        setAddTrackError('No tracks to add');
        setAddingTrack(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('album_tracks')
        .insert(tracksToInsert);
        
      if (error) {
        console.error('Error inserting tracks:', error);
        setAddTrackError(error.message);
        setAddingTrack(false);
        return;
      }
      
      // Refresh tracks from database
      const { data: refreshedTracks, error: refreshError } = await supabase
        .from('album_tracks')
        .select('*')
        .eq('album_id', albumId)
        .order('track_order', { ascending: true });
        
      if (!refreshError && refreshedTracks) {
        const tracksWithSessionName = refreshedTracks.map(track => ({
          ...track,
          session_name: track.beat_sessions?.name || null
        }));
        setTracks(tracksWithSessionName);
      }
      
      toast({
        title: "Tracks Added",
        description: `${tracksToInsert.length} track(s) have been added to the album.`,
        variant: "default",
      });
      
      // Reset form and close dialog
      setShowAddTrack(false);
      setAddMultipleTracks(false);
      setMultipleTracks([]);
      setNumberOfTracks(2);
      setAddTrackError(null);
    } catch (error) {
      console.error('Unexpected error:', error);
      setAddTrackError('An unexpected error occurred');
    } finally {
      setAddingTrack(false);
    }
  }

  async function handleAddTrack(e: React.FormEvent) {
    e.preventDefault();
    console.log('=== ADD TRACK DEBUG ===');
    console.log('newTrack:', newTrack);
    console.log('albumId:', albumId);
    console.log('audioUrl:', audioUrl);
    
    setAddingTrack(true);
    setAddTrackError(null);
    
    if (audioUploading) {
      setAddTrackError('Please wait for the audio upload to finish.');
      setAddingTrack(false);
      return;
    }
    
    try {
      const nextTrackOrder = tracks.length + 1;
      const insertData = {
        ...newTrack,
        title: newTrack.title.trim() || `Track ${nextTrackOrder}`, // Auto-name if empty
        album_id: albumId,
        audio_url: audioUrl,
        track_order: nextTrackOrder,
        status: 'draft' // Set default status
      };
      
      console.log('Inserting track with data:', insertData);
      console.log('Album data:', album);
      console.log('Album user_id:', album?.user_id);
      
      const { data, error } = await supabase
        .from('album_tracks')
        .insert([insertData]);
        
      if (error) {
        console.error('Error inserting track:', error);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        console.error('Error code:', error.code);
        setAddTrackError(error.message);
        setAddingTrack(false);
        return;
      }
      
      console.log('Track created successfully, response:', data);
      
      // Create the track object manually since we can't select it back
      const newTrackData = {
        id: (data as any)?.[0]?.id || `temp-${Date.now()}`, // Use returned ID or generate temp one
        ...insertData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('New track data to add to state:', newTrackData);
      
      // Update local state
      setTracks([...tracks, newTrackData]);
      
      // Force refresh of tracks from database
      const { data: refreshedTracks, error: refreshError } = await supabase
        .from('album_tracks')
        .select('*')
        .eq('album_id', albumId)
        .order('track_order', { ascending: true });
        
      if (!refreshError && refreshedTracks) {
        console.log('Refreshed tracks from database:', refreshedTracks);
        
        // Transform data to include session_name if available
        const tracksWithSessionName = refreshedTracks.map(track => ({
          ...track,
          session_name: track.beat_sessions?.name || null
        }));
        
        console.log('Setting refreshed tracks:', tracksWithSessionName);
        setTracks(tracksWithSessionName);
      } else if (refreshError) {
        console.error('Error refreshing tracks:', refreshError);
      }
      
      // Show success message
      toast({
        title: "Track Added",
        description: `"${newTrack.title}" has been added to the album.`,
        variant: "default",
      });
      
      // Reset form and close dialog
      setShowAddTrack(false);
      setNewTrack({ title: '', duration: '', isrc: '' });
      setAudioUrl('');
      setAddTrackError(null);
    } catch (error) {
      console.error('Unexpected error:', error);
      setAddTrackError('An unexpected error occurred');
    } finally {
      setAddingTrack(false);
    }
  }

  // Edit Track: open modal and populate state
  function handleOpenEditTrack(track: any) {
    setEditTrackId(track.id);
    setEditTrack({ title: track.title, duration: track.duration, isrc: track.isrc, audio_url: track.audio_url || '' });
    setEditTrackError(null);
    setEditAudioUploadError(null);
  }

  async function handleEditTrack(e: React.FormEvent) {
    e.preventDefault();
    if (!editTrackId) return;
    setEditTrackSaving(true);
    setEditTrackError(null);
    if (editAudioUploading) {
      setEditTrackError('Please wait for the audio upload to finish.');
      setEditTrackSaving(false);
      return;
    }
    const { error } = await supabase.from('album_tracks').update({ ...editTrack }).eq('id', editTrackId);
    setEditTrackSaving(false);
    if (error) {
      setEditTrackError(error.message);
      return;
    }
    setTracks(tracks.map(t => t.id === editTrackId ? { ...t, ...editTrack } : t));
    setEditTrackId(null);
  }

  // Show compression options dialog
  const showCompressionOptions = (trackId: string, audioUrl: string) => {
    setCompressionFile({ id: trackId, url: audioUrl })
    setShowCompressionDialog(true)
  }

  // Convert album track to MP3
  // Album editing functions
  const openEditAlbumDialog = () => {
    if (album) {
      setEditAlbumForm({
        title: album.title,
        artist: album.artist,
        release_date: album.release_date,
        description: album.description || '',
        cover_art_url: album.cover_art_url || '',
        distributor: album.distributor || '',
        distributor_notes: album.distributor_notes || '',
        notes: album.notes || ''
      });
      // Initialize artists array from the album's artist field
      // Split by comma and trim whitespace, or use single artist if no comma
      const artists = album.artist ? album.artist.split(',').map(a => a.trim()).filter(a => a) : [];
      setEditAlbumArtists(artists);
      setNewArtistInput('');
      // Set selected label artist if album is published
      setSelectedLabelArtistId(album.label_artist_id || '');
      setShowEditAlbum(true);
    }
  };

  const handleEditAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!album) return;
    if (uploadingCover) {
      setEditAlbumError('Please wait for the cover art to finish uploading.');
      return;
    }
    setEditAlbumSaving(true);
    setEditAlbumError(null);
    
    // Combine artists array into a single string for the database
    const artistString = editAlbumArtists.join(', ');
    
    // Convert empty string to null for label_artist_id
    const labelArtistId = selectedLabelArtistId && selectedLabelArtistId.trim() !== '' ? selectedLabelArtistId : null;
    
    console.log('🔍 [ALBUM EDIT] Saving album:', {
      albumId: album.id,
      selectedLabelArtistId,
      labelArtistId,
      willSave: labelArtistId
    });
    
    const { error } = await supabase.from('albums').update({
      ...editAlbumForm,
      artist: artistString,
      label_artist_id: labelArtistId
    }).eq('id', album.id);
    setEditAlbumSaving(false);
    if (error) {
      setEditAlbumError(error.message);
      return;
    }
    setAlbum({ ...album, ...editAlbumForm, artist: artistString, label_artist_id: selectedLabelArtistId || undefined });
    
    // Show success message
    if (selectedLabelArtistId) {
      const selectedArtist = labelArtists.find(a => a.id === selectedLabelArtistId);
      toast({
        title: "Album Published",
        description: `Album has been published to ${selectedArtist?.stage_name || selectedArtist?.name || 'artist'}'s page`,
      });
    } else if (album.label_artist_id) {
      toast({
        title: "Album Unpublished",
        description: "Album has been removed from the artist page",
      });
    }
    setShowEditAlbum(false);
    toast({
      title: "Success",
      description: "Album updated successfully!",
    });
  };

  const uploadCoverArt = async (file: File): Promise<string | null> => {
    if (!album) return null;
    setUploadingCover(true);
    setUploadError(null);
    const fileExt = file.name.split('.').pop();
    const filePath = `albums/${album.id}/${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from('beats').upload(filePath, file, { upsert: true });
    if (error) {
      setUploadError(error.message);
      setUploadingCover(false);
      return null;
    }
    const { data } = supabase.storage.from('beats').getPublicUrl(filePath);
    setUploadingCover(false);
    return data?.publicUrl || null;
  };

  const handleCoverArtUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadCoverArt(file);
    if (url) {
      setEditAlbumForm(prev => ({ ...prev, cover_art_url: url }));
    }
  };

  // Open cover art generation dialog
  const handleOpenCoverArtDialog = () => {
    if (!album || !user?.id) {
      toast({
        title: "Error",
        description: "Please ensure you're logged in and an album is selected.",
        variant: "destructive",
      });
      return;
    }
    
    // Set default prompt with album context
    const defaultPrompt = `Create a professional album cover art for "${album.title}" by ${album.artist || 'Unknown Artist'}${album.description ? `. ${album.description}` : ''}. The cover should be visually striking, suitable for a music release, and reflect the artistic style of the album.`;
    setCoverArtPrompt(defaultPrompt);
    setShowCoverArtPromptDialog(true);
  };

  // Generate cover art using GPT Image 1
  const handleGenerateCoverArt = async (customPrompt?: string) => {
    if (!album || !user?.id) {
      toast({
        title: "Error",
        description: "Please ensure you're logged in and an album is selected.",
        variant: "destructive",
      });
      return;
    }

    const promptToUse = customPrompt || coverArtPrompt;
    if (!promptToUse || !promptToUse.trim()) {
      toast({
        title: "Error",
        description: "Please enter a prompt for the cover art.",
        variant: "destructive",
      });
      return;
    }

    setGeneratingCoverArt(true);
    setUploadError(null);
    setShowCoverArtPromptDialog(false);

    try {
      // Get AI settings from database
      const { data: settingsData, error: settingsError } = await supabase.rpc('get_ai_settings');
      
      if (settingsError) {
        throw new Error('Failed to fetch AI settings');
      }

      // Map settings array to object
      const settings: Record<string, string> = {};
      if (settingsData) {
        for (const setting of settingsData) {
          settings[setting.setting_key] = setting.setting_value;
        }
      }

      // Get image model from settings - look for common keys
      // Try to find image-related settings
      const imageModelKey = Object.keys(settings).find(key => 
        key.toLowerCase().includes('image') && 
        (key.toLowerCase().includes('model') || key.toLowerCase().includes('selected'))
      );
      
      // Default to gpt-image-1 (as requested by user)
      let model = 'gpt-image-1';
      if (imageModelKey && settings[imageModelKey]) {
        model = settings[imageModelKey];
      } else if (settings['images_selected_model']) {
        model = settings['images_selected_model'];
      } else if (settings['images_locked_model']) {
        model = settings['images_locked_model'];
      }

      // Get API key - try from settings first, then user table, then env
      let apiKey = settings['openai_api_key']?.trim();
      
      if (!apiKey) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('openai_api_key')
          .eq('id', user.id)
          .single();

        if (!userError && userData) {
          apiKey = userData.openai_api_key;
        }
      }

      if (!apiKey) {
        apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
      }

      if (!apiKey) {
        toast({
          title: "Missing API Key",
          description: "Please configure your OpenAI API key in settings.",
          variant: "destructive",
        });
        setGeneratingCoverArt(false);
        return;
      }

      // Normalize model - ensure it's in the correct format
      const normalizeImageModel = (modelValue: string) => {
        if (modelValue === 'gpt-image-1' || modelValue?.startsWith('gpt-')) {
          return modelValue;
        }
        // If it contains 'dall', use dall-e-3, otherwise default to gpt-image-1
        if (modelValue?.toLowerCase().includes('dall')) {
          return 'dall-e-3';
        }
        // Default to gpt-image-1 if not specified or empty
        return modelValue || 'gpt-image-1';
      };

      const normalizedModel = normalizeImageModel(model);

      console.log('🖼️ ALBUM COVER - Model selection:', {
        originalModel: model,
        normalizedModel: normalizedModel,
        settingsKeys: Object.keys(settings),
        imageModelKey: imageModelKey,
        willUseGPTImage: normalizedModel === 'gpt-image-1' || normalizedModel.startsWith('gpt-'),
        prompt: promptToUse.substring(0, 100) + '...'
      });

      // Generate image using OpenAIService
      const response = await OpenAIService.generateImage({
        prompt: promptToUse.trim(),
        style: 'cinematic, professional album cover',
        model: normalizedModel,
        apiKey: apiKey,
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to generate cover art');
      }

      // Handle both URL (DALL-E) and base64 (GPT Image) responses
      const imageData = response.data.data?.[0];
      const imageUrl = imageData?.url || (imageData?.b64_json ? `data:image/png;base64,${imageData.b64_json}` : '');

      if (!imageUrl) {
        throw new Error('No image data received');
      }

      // Save the image to the bucket
      setUploadingCover(true);
      
      let publicUrl: string;
      
      if (imageUrl.startsWith('data:')) {
        // Base64 data URI (GPT Image) - can be handled client-side
        const base64Data = imageUrl.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/png' });

        // Upload to Supabase storage
        const filePath = `albums/${album.id}/${Date.now()}_cover_art.png`;
        const { error: uploadError } = await supabase.storage
          .from('beats')
          .upload(filePath, blob, {
            contentType: 'image/png',
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error('Failed to upload cover art to storage');
        }

        const { data: { publicUrl: url } } = supabase.storage
          .from('beats')
          .getPublicUrl(filePath);
        
        publicUrl = url;
      } else {
        // URL (DALL-E) - need to download server-side due to CORS
        const token = await getAccessToken();
        if (!token) {
          throw new Error('Authentication required');
        }

        const downloadResponse = await fetch('/api/ai/download-and-store-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            imageUrl: imageUrl,
            fileName: 'cover_art',
            userId: user.id,
            albumId: album.id
          })
        });

        const downloadResult = await downloadResponse.json();

        if (!downloadResult.success) {
          throw new Error(downloadResult.error || 'Failed to download and store image');
        }

        publicUrl = downloadResult.supabaseUrl;
      }

      // Update album with new cover art
      const { error: updateError } = await supabase
        .from('albums')
        .update({ cover_art_url: publicUrl })
        .eq('id', album.id);

      if (updateError) {
        throw new Error('Failed to update album cover art');
      }

      // Update local state
      setAlbum(prev => prev ? { ...prev, cover_art_url: publicUrl } : null);
      setEditAlbumForm(prev => ({ ...prev, cover_art_url: publicUrl }));

      toast({
        title: "Success",
        description: "Album cover art generated and saved!",
      });
    } catch (error: any) {
      console.error('Error generating cover art:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate cover art. Please ensure AI API keys are configured in /ai-settings",
        variant: "destructive",
      });
    } finally {
      setGeneratingCoverArt(false);
      setUploadingCover(false);
    }
  };

  // Generate track titles using AI
  const handleGenerateTrackTitles = async () => {
    if (!album || !album.cover_art_url) {
      toast({
        title: "Error",
        description: "Album cover art is required to generate track titles.",
        variant: "destructive"
      });
      return;
    }

    if (tracks.length === 0) {
      toast({
        title: "Error",
        description: "Please add tracks to the album first.",
        variant: "destructive"
      });
      return;
    }

    setGeneratingTitles(true);
    try {
      // Get access token for authentication
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }

      const response = await fetch('/api/albums/generate-track-titles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          albumId: album.id,
          coverArtUrl: album.cover_art_url,
          numTracks: tracks.length
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate track titles');
      }

      if (data.titles && data.titles.length > 0) {
        setGeneratedTitles(data.titles);
        setShowGeneratedTitlesDialog(true);
      } else {
        throw new Error('No titles generated');
      }
    } catch (error: any) {
      console.error('Error generating track titles:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate track titles. Please ensure AI API keys are configured in /ai-settings",
        variant: "destructive"
      });
    } finally {
      setGeneratingTitles(false);
    }
  };

  // Start editing a title
  const handleStartEditTitle = (index: number) => {
    setEditingTitleIndex(index);
    setEditingTitleValue(generatedTitles[index]);
  };

  // Save edited title
  const handleSaveEditTitle = (index: number) => {
    if (editingTitleValue.trim()) {
      const updated = [...generatedTitles];
      updated[index] = editingTitleValue.trim();
      setGeneratedTitles(updated);
    }
    setEditingTitleIndex(null);
    setEditingTitleValue('');
  };

  // Cancel editing
  const handleCancelEditTitle = () => {
    setEditingTitleIndex(null);
    setEditingTitleValue('');
  };

  // Delete a title
  const handleDeleteTitle = (index: number) => {
    const updated = generatedTitles.filter((_, i) => i !== index);
    setGeneratedTitles(updated);
    if (editingTitleIndex === index) {
      setEditingTitleIndex(null);
      setEditingTitleValue('');
    }
  };

  // Regenerate a single title
  const handleRegenerateTitle = async (index: number) => {
    if (!album || !album.cover_art_url) return;

    setRegeneratingIndex(index);
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }

      const response = await fetch('/api/albums/generate-track-titles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          albumId: album.id,
          coverArtUrl: album.cover_art_url,
          numTracks: 1
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to regenerate title');
      }

      if (data.titles && data.titles.length > 0) {
        const updated = [...generatedTitles];
        updated[index] = data.titles[0];
        setGeneratedTitles(updated);
        toast({
          title: "Success",
          description: "Title regenerated successfully.",
          variant: "default"
        });
      } else {
        throw new Error('No title generated');
      }
    } catch (error: any) {
      console.error('Error regenerating title:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to regenerate title.",
        variant: "destructive"
      });
    } finally {
      setRegeneratingIndex(null);
    }
  };

  // Regenerate a single track title from the track list
  const handleRegenerateSingleTrackTitle = async (trackId: string, currentTitle: string) => {
    if (!album || !album.cover_art_url) return;

    setRegeneratingTrackId(trackId);
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }

      // Get other track titles for context
      const otherTracks = tracks
        .filter(t => t.id !== trackId)
        .map(t => t.title)
        .slice(0, 10); // Limit to 10 other tracks for context

      const response = await fetch('/api/albums/generate-track-titles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          albumId: album.id,
          coverArtUrl: album.cover_art_url,
          numTracks: 1,
          context: {
            currentTitle,
            otherTracks,
            albumTitle: album.title
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to regenerate title');
      }

      if (data.titles && data.titles.length > 0) {
        const newTitle = data.titles[0];
        
        // Update the track in the database
        const { error: updateError } = await supabase
          .from('album_tracks')
          .update({ title: newTitle })
          .eq('id', trackId);

        if (updateError) {
          throw new Error(updateError.message);
        }

        // Update local state
        setTracks(tracks.map(t => t.id === trackId ? { ...t, title: newTitle } : t));

        toast({
          title: "Success",
          description: `Track title updated to "${newTitle}"`,
          variant: "default"
        });
      } else {
        throw new Error('No title generated');
      }
    } catch (error: any) {
      console.error('Error regenerating track title:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to regenerate track title.",
        variant: "destructive"
      });
    } finally {
      setRegeneratingTrackId(null);
    }
  };

  // Apply generated titles to tracks
  const handleApplyGeneratedTitles = async () => {
    if (generatedTitles.length === 0 || tracks.length === 0) return;

    try {
      // Only update tracks that have corresponding generated titles
      // If a title was deleted, that track keeps its original title
      const updates = tracks
        .map((track, index) => {
          if (generatedTitles[index]) {
            return supabase
              .from('album_tracks')
              .update({ title: generatedTitles[index] })
              .eq('id', track.id);
          }
          return null;
        })
        .filter(update => update !== null);

      await Promise.all(updates);

      // Refresh tracks
      const { data: refreshedTracks, error: refreshError } = await supabase
        .from('album_tracks')
        .select('*')
        .eq('album_id', albumId)
        .order('track_order', { ascending: true });

      if (!refreshError && refreshedTracks) {
        setTracks(refreshedTracks);
      }

      toast({
        title: "Success",
        description: "Track titles have been updated.",
        variant: "default"
      });

      setShowGeneratedTitlesDialog(false);
      setGeneratedTitles([]);
      setEditingTitleIndex(null);
      setEditingTitleValue('');
    } catch (error: any) {
      console.error('Error applying titles:', error);
      toast({
        title: "Error",
        description: "Failed to apply track titles.",
        variant: "destructive"
      });
    }
  };

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
      case 'production':
        return <Loader2 className="h-3 w-3" />
      case 'draft':
        return <Circle className="h-3 w-3" />
      case 'distribute':
        return <CheckCircle2 className="h-3 w-3" />
      case 'error':
        return <XCircle className="h-3 w-3" />
      case 'published':
        return <Globe className="h-3 w-3" />
      default:
        return <Circle className="h-3 w-3" />
    }
  }

  const getStatusBorderColor = (status: string) => {
    switch (status) {
      case 'production':
        return 'border-l-yellow-500'
      case 'draft':
        return 'border-l-yellow-500'
      case 'distribute':
        return 'border-l-blue-500'
      case 'error':
        return 'border-l-red-500'
      case 'published':
        return 'border-l-green-500'
      case 'other':
        return 'border-l-purple-500'
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
          fileType: 'album_track'
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Conversion failed')
      }

      const result = await response.json()
      
      // Refresh tracks to show new MP3 track
      const { data } = await supabase.from('album_tracks').select('*').eq('album_id', albumId).order('created_at', { ascending: true });
      setTracks(data || []);
      
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

  // Delete track function
  const handleDeleteTrack = async (trackId: string, trackTitle: string) => {
    if (!confirm(`Are you sure you want to delete the track "${trackTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('album_tracks')
        .delete()
        .eq('id', trackId);

      if (error) {
        throw error;
      }

      // Remove the track from local state
      setTracks(prev => prev.filter(track => track.id !== trackId));

      toast({
        title: "Success",
        description: `Track "${trackTitle}" deleted successfully!`,
      });
    } catch (error) {
      console.error('Error deleting track:', error);
      toast({
        title: "Error",
        description: "Failed to delete track",
        variant: "destructive",
      });
    }
  };

  // Move track function
  const handleMoveTrack = async (trackId: string, trackTitle: string) => {
    setMoveTrackId(trackId);
    setMoveTrackTitle(trackTitle);
    setMoveTrackError(null);
    
    try {
      // Fetch available albums (excluding current album)
      const { data: albums, error } = await supabase
        .from('albums')
        .select('id, title')
        .neq('id', albumId)
        .order('title');

      if (error) {
        throw error;
      }

      setAvailableAlbums(albums || []);
      setShowMoveTrackDialog(true);
    } catch (error) {
      console.error('Error fetching albums:', error);
      toast({
        title: "Error",
        description: "Failed to load available albums",
        variant: "destructive",
      });
    }
  };

  // Execute move track
  const executeMoveTrack = async () => {
    if (!moveTrackId) return;

    setMovingTrack(true);
    setMoveTrackError(null);

    try {
      // Get the track data
      const trackToMove = tracks.find(track => track.id === moveTrackId);
      if (!trackToMove) {
        throw new Error('Track not found');
      }

      if (moveToSingles) {
        // Move to singles table
        const { error: singleError } = await supabase
          .from('singles')
          .insert([{
            title: trackToMove.title,
            artist: album?.artist || '',
            release_date: new Date().toISOString().split('T')[0],
            audio_url: trackToMove.audio_url,
            duration: trackToMove.duration,
            isrc: trackToMove.isrc,
            session_id: trackToMove.session_id,
            status: 'draft'
          }]);

        if (singleError) {
          throw singleError;
        }

        toast({
          title: "Success",
          description: `Track "${trackToMove.title}" moved to singles successfully!`,
        });
      } else if (selectedTargetAlbum) {
        // Move to another album
        const { error: albumError } = await supabase
          .from('album_tracks')
          .update({ album_id: selectedTargetAlbum })
          .eq('id', moveTrackId);

        if (albumError) {
          throw albumError;
        }

        toast({
          title: "Success",
          description: `Track "${trackToMove.title}" moved to album successfully!`,
        });
      } else {
        throw new Error('Please select a destination');
      }

      // Remove track from current album's tracks
      setTracks(prev => prev.filter(track => track.id !== moveTrackId));
      
      // Close dialog and reset state
      setShowMoveTrackDialog(false);
      setMoveTrackId(null);
      setMoveTrackTitle('');
      setSelectedTargetAlbum('');
      setMoveToSingles(false);

    } catch (error) {
      console.error('Error moving track:', error);
      setMoveTrackError(error instanceof Error ? error.message : 'Failed to move track');
      toast({
        title: "Error",
        description: "Failed to move track",
        variant: "destructive",
      });
    } finally {
      setMovingTrack(false);
    }
  };

  // Add artist to the edit album artists list
  const addEditAlbumArtist = () => {
    if (newArtistInput.trim() && !editAlbumArtists.includes(newArtistInput.trim())) {
      setEditAlbumArtists([...editAlbumArtists, newArtistInput.trim()]);
      setNewArtistInput('');
    }
  };

  // Remove artist from the edit album artists list
  const removeEditAlbumArtist = (artistToRemove: string) => {
    setEditAlbumArtists(editAlbumArtists.filter(artist => artist !== artistToRemove));
  };

  // Handle Enter key in artist input for edit album
  const handleEditAlbumArtistInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addEditAlbumArtist();
    }
  };

  // Download track function
  // Audio playback functions
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
        title: "Download started",
        description: `${title} is being downloaded.`,
      });
    } catch (error) {
      console.error('Error downloading track:', error);
      toast({
        title: "Download failed",
        description: "Failed to download the audio file. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Download album function
  const downloadAlbum = async () => {
    try {
      if (!album) {
        toast({
          title: "Album not found",
          description: "Album information is not available.",
          variant: "destructive"
        });
        return;
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
        description: `Downloading ${tracksWithAudio.length} tracks from ${album.title}...`,
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
          a.download = `${album.title} - ${track.title}.${track.audio_url.split('.').pop() || 'mp3'}`;
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
        description: `All tracks from ${album.title} have been downloaded.`,
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

  // Delete album function
  const handleDeleteAlbum = async () => {
    if (!album) return;
    
    if (!confirm(`Are you sure you want to delete the album "${album.title}"? This will delete the album and all its tracks. This action cannot be undone.`)) {
      return;
    }

    try {
      // First, delete all tracks in the album
      const { error: tracksError } = await supabase
        .from('album_tracks')
        .delete()
        .eq('album_id', albumId);

      if (tracksError) {
        throw new Error(`Failed to delete tracks: ${tracksError.message}`);
      }

      // Then delete the album
      const { error: albumError } = await supabase
        .from('albums')
        .delete()
        .eq('id', albumId);

      if (albumError) {
        throw new Error(`Failed to delete album: ${albumError.message}`);
      }

      // Optionally delete album folder from storage (this won't fail the deletion if it errors)
      if (album.user_id) {
        try {
          const albumPath = `albums/${album.user_id}/${albumId}/`;
          const { data: files } = await supabase.storage
            .from('beats')
            .list(albumPath);
          
          if (files && files.length > 0) {
            const filePaths = files.map(file => `${albumPath}${file.name}`);
            await supabase.storage
              .from('beats')
              .remove(filePaths);
          }
        } catch (storageError) {
          console.warn('Error deleting album files from storage:', storageError);
          // Don't fail the deletion if storage cleanup fails
        }
      }

      toast({
        title: "Album Deleted",
        description: `Album "${album.title}" has been deleted successfully.`,
      });

      // Navigate back to myalbums or mylibrary page
      router.push('/mylibrary');
    } catch (error) {
      console.error('Error deleting album:', error);
      toast({
        title: "Delete Error",
        description: error instanceof Error ? error.message : "Failed to delete album. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Upload track audio file for replacement
  const uploadTrackAudioForReplacement = async (file: File, trackId: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${trackId}-${Date.now()}.${fileExt}`
      const filePath = `album-tracks/${fileName}`

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

  // Replace track audio file
  const replaceTrackAudio = async (trackId: string, file: File) => {
    try {
      setReplacingTrackId(trackId);
      const audioUrl = await uploadTrackAudioForReplacement(file, trackId)
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
          description: "Failed to update track audio: " + error.message,
          variant: "destructive"
        });
        return;
      }

      // Update local state
      setTracks(prev => prev.map(track => 
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
  }

  const openMetadataDialog = async (trackId: string, trackType: 'single' | 'album_track') => {
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

      // Refresh the tracks data
      const { data } = await supabase.from('album_tracks').select(`
        *,
        beat_sessions!inner(name)
      `).eq('album_id', albumId).order('created_at', { ascending: true });
      
      if (data) {
        const tracksWithSessionName = data.map(track => ({
          ...track,
          session_name: track.beat_sessions?.name || null
        }));
        setTracks(tracksWithSessionName);
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

  const openNotesDialog = async (itemId: string, itemType: 'album' | 'single' | 'album_track', itemTitle: string) => {
    try {
      const table = itemType === 'album' ? 'albums' : itemType === 'single' ? 'singles' : 'album_tracks';
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

  // Initialize and redraw canvas with crop overlay
  useEffect(() => {
    if (!cropCanvasRef || !cropImage) return;
    
    const ctx = cropCanvasRef.getContext('2d', { willReadFrequently: false });
    if (!ctx) return;
    
    // Calculate display size
    const maxWidth = 800;
    const maxHeight = 600;
    const scale = Math.min(maxWidth / cropImage.width, maxHeight / cropImage.height, 1);
    const displayWidth = cropImage.width * scale;
    const displayHeight = cropImage.height * scale;
    
    // Only set canvas dimensions if they've changed (to avoid unnecessary clears)
    if (cropCanvasRef.width !== displayWidth || cropCanvasRef.height !== displayHeight) {
      cropCanvasRef.width = displayWidth;
      cropCanvasRef.height = displayHeight;
      setCanvasScale(scale);
    }
    
    // Redraw the image
    ctx.clearRect(0, 0, cropCanvasRef.width, cropCanvasRef.height);
    ctx.drawImage(cropImage, 0, 0, cropCanvasRef.width, cropCanvasRef.height);
    
    // Only draw overlay if crop box is initialized
    if (cropBox.width > 0 && cropBox.height > 0) {
      // Draw dark overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, cropCanvasRef.width, cropCanvasRef.height);
      
      // Calculate crop box position on canvas
      const scaleX = cropCanvasRef.width / cropImage.width;
      const scaleY = cropCanvasRef.height / cropImage.height;
      const cropX = cropBox.x * scaleX;
      const cropY = cropBox.y * scaleY;
      const cropW = cropBox.width * scaleX;
      const cropH = cropBox.height * scaleY;
      
      // Clear the crop area (show original image)
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillRect(cropX, cropY, cropW, cropH);
      ctx.restore();
      
      // Draw crop box border
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.strokeRect(cropX, cropY, cropW, cropH);
      
      // Draw corner handles
      const handleSize = 12;
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(cropX - handleSize/2, cropY - handleSize/2, handleSize, handleSize);
      ctx.fillRect(cropX + cropW - handleSize/2, cropY - handleSize/2, handleSize, handleSize);
      ctx.fillRect(cropX - handleSize/2, cropY + cropH - handleSize/2, handleSize, handleSize);
      ctx.fillRect(cropX + cropW - handleSize/2, cropY + cropH - handleSize/2, handleSize, handleSize);
    }
  }, [cropCanvasRef, cropImage, cropBox]);

  // Open crop dialog
  const openCropDialog = async () => {
    if (!album || !album.cover_art_url) {
      toast({
        title: "Error",
        description: "No cover art available to crop.",
        variant: "destructive"
      });
      return;
    }

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = album.cover_art_url;
      });

      setCropImage(img);
      
      // Initialize crop box to center square (80% of smaller dimension)
      const displaySize = Math.min(img.width, img.height);
      const cropSize = displaySize * 0.8;
      const cropX = (img.width - cropSize) / 2;
      const cropY = (img.height - cropSize) / 2;
      
      setCropBox({ x: cropX, y: cropY, width: cropSize, height: cropSize });
      setShowCropDialog(true);
    } catch (error) {
      console.error('Error loading image:', error);
      toast({
        title: "Error",
        description: "Failed to load cover art for cropping.",
        variant: "destructive"
      });
    }
  };

  // Handle mouse down on canvas
  const handleCropMouseDown = (e: React.MouseEvent) => {
    if (!cropImage || !cropCanvasRef) return;
    
    e.preventDefault();
    const rect = cropCanvasRef.getBoundingClientRect();
    const scaleX = cropImage.width / cropCanvasRef.width;
    const scaleY = cropImage.height / cropCanvasRef.height;
    
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    
    // Check if clicking on crop box (for dragging) or outside (to create new)
    const cropX = cropBox.x;
    const cropY = cropBox.y;
    const cropW = cropBox.width;
    const cropH = cropBox.height;
    
    // Check if clicking near the bottom-right corner (for resizing)
    const resizeHandleSize = 50 * scaleX; // Larger handle area
    const nearBottomRight = 
      mouseX > cropX + cropW - resizeHandleSize && 
      mouseX < cropX + cropW + resizeHandleSize &&
      mouseY > cropY + cropH - resizeHandleSize && 
      mouseY < cropY + cropH + resizeHandleSize;
    
    if (nearBottomRight) {
      setIsResizing(true);
    } else if (mouseX >= cropX && mouseX <= cropX + cropW && mouseY >= cropY && mouseY <= cropY + cropH) {
      // Clicking inside crop box - drag it
      setIsDragging(true);
    } else {
      // Clicking outside - move crop box center to click position
      const newSize = Math.min(cropW, cropImage.width - mouseX, cropImage.height - mouseY, mouseX, mouseY) * 1.8;
      const clampedSize = Math.max(50, Math.min(newSize, Math.min(cropImage.width, cropImage.height)));
      setCropBox({
        x: Math.max(0, Math.min(cropImage.width - clampedSize, mouseX - clampedSize / 2)),
        y: Math.max(0, Math.min(cropImage.height - clampedSize, mouseY - clampedSize / 2)),
        width: clampedSize,
        height: clampedSize
      });
      return;
    }
    
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  // Global mouse event listeners for smooth dragging/resizing
  useEffect(() => {
    if (!isDragging && !isResizing) return;
    if (!cropImage || !cropCanvasRef) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = cropCanvasRef.getBoundingClientRect();
      const scaleX = cropImage.width / cropCanvasRef.width;
      const scaleY = cropImage.height / cropCanvasRef.height;

      const deltaX = (e.clientX - dragStartRef.current.x) * scaleX;
      const deltaY = (e.clientY - dragStartRef.current.y) * scaleY;

      if (isDragging) {
        setCropBox(prevBox => ({
          ...prevBox,
          x: Math.max(0, Math.min(cropImage.width - prevBox.width, prevBox.x + deltaX)),
          y: Math.max(0, Math.min(cropImage.height - prevBox.height, prevBox.y + deltaY))
        }));
      } else if (isResizing) {
        setCropBox(prevBox => {
          const newWidth = Math.max(50, Math.min(cropImage.width - prevBox.x, prevBox.width + deltaX));
          const newHeight = newWidth; // Keep it square
          return {
            ...prevBox,
            width: newWidth,
            height: newHeight,
            x: Math.max(0, Math.min(cropImage.width - newWidth, prevBox.x)),
            y: Math.max(0, Math.min(cropImage.height - newHeight, prevBox.y))
          };
        });
      }

      dragStartRef.current = { x: e.clientX, y: e.clientY };
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, cropImage, cropCanvasRef]);

  // Apply crop and download
  const applyCropAndDownload = () => {
    if (!cropImage) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = cropSize;
      canvas.height = cropSize;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Draw the cropped and resized image
      ctx.drawImage(
        cropImage,
        cropBox.x, cropBox.y, cropBox.width, cropBox.height, // Source rectangle
        0, 0, cropSize, cropSize // Destination rectangle (resized to target size)
      );

      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error('Failed to create image blob');
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${album?.title.replace(/[^a-z0-9]/gi, '_')}_cover_${cropSize}x${cropSize}.png`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: "Success",
          description: `Cover art cropped to ${cropSize}x${cropSize} and downloaded!`,
        });

        setShowCropDialog(false);
      }, 'image/png');
    } catch (error) {
      console.error('Error applying crop:', error);
      toast({
        title: "Error",
        description: "Failed to crop and download cover art.",
        variant: "destructive"
      });
    }
  };

  const saveNotes = async (notes: string) => {
    try {
      const table = editingNotesType === 'album' ? 'albums' : editingNotesType === 'single' ? 'singles' : 'album_tracks';
      const { error } = await supabase
        .from(table)
        .update({ notes })
        .eq('id', editingNotesId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Notes saved successfully.",
      });

      // Refresh the tracks data
      const { data } = await supabase.from('album_tracks').select(`
        *,
        beat_sessions!inner(name)
      `).eq('album_id', albumId).order('created_at', { ascending: true });
      
      if (data) {
        const tracksWithSessionName = data.map(track => ({
          ...track,
          session_name: track.beat_sessions?.name || null
        }));
        setTracks(tracksWithSessionName);
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

  // Update album production status function
  const updateAlbumProductionStatus = async (newStatus: 'marketing' | 'organization' | 'production' | 'quality_control' | 'ready_for_distribution') => {
    try {
      const { error } = await supabase
        .from('albums')
        .update({ production_status: newStatus })
        .eq('id', albumId);

      if (error) throw error;

      setAlbum(prev => prev ? { ...prev, production_status: newStatus } : null);

      toast({
        title: "Success",
        description: `Album production status updated to ${newStatus}`
      });
    } catch (error) {
      console.error('Error updating album production status:', error);
      toast({
        title: "Error",
        description: "Failed to update album production status",
        variant: "destructive"
      });
    }
  };



  if (loading) {
    return <div className="container mx-auto py-8">Loading...</div>
  }
  if (error || !album) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">Album Not Found</h1>
        <Link href="/mylibrary">
          <Button variant="default">Back to Library</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <Link href="/mylibrary">
        <Button variant="outline" className="mb-6">&larr; Back to Library</Button>
      </Link>
      <div className="flex gap-8 items-start bg-zinc-900 rounded-xl p-8 shadow-lg">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            {album.cover_art_url ? (
              <Link href={`/cover-edit/${albumId}`}>
                <img 
                  src={album.cover_art_url} 
                  alt={album.title} 
                  className="w-48 h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onLoad={(e) => {
                    const img = e.target as HTMLImageElement;
                    const sizeInfo = img.parentElement?.parentElement?.querySelector('.image-size');
                    if (sizeInfo) {
                      sizeInfo.textContent = `${img.naturalWidth} × ${img.naturalHeight}`;
                    }
                  }}
                />
              </Link>
            ) : (
              <img 
                src="/placeholder.jpg" 
                alt="No cover art" 
                className="w-48 h-48 object-cover rounded-lg"
                onLoad={(e) => {
                  const img = e.target as HTMLImageElement;
                  const sizeInfo = img.parentElement?.querySelector('.image-size');
                  if (sizeInfo) {
                    sizeInfo.textContent = `${img.naturalWidth} × ${img.naturalHeight}`;
                  }
                }}
              />
            )}
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
              <span className="image-size">Loading...</span>
            </div>
          </div>
          <Link href={`/cover-edit/${albumId}`}>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full bg-purple-600 hover:bg-purple-700 text-white border-purple-500"
            >
              <Settings className="h-4 w-4 mr-2" />
              Cover Settings
            </Button>
          </Link>
          {album.cover_art_url && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={openCropDialog}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white border-blue-500"
            >
              <Download className="h-4 w-4 mr-2" />
              Crop & Download Cover Art
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleOpenCoverArtDialog}
            disabled={generatingCoverArt || uploadingCover}
            className="w-full"
          >
            {generatingCoverArt ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Cover Art
              </>
            )}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={downloadAlbum}
            className="bg-green-600 hover:bg-green-700 text-white border-green-500 w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Album
          </Button>
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h1 className="text-4xl font-bold mb-2">{album.title}</h1>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={openEditAlbumDialog}><FileText className="h-4 w-4 mr-2" />Edit</Button>

              <Button variant="destructive" size="sm" onClick={handleDeleteAlbum}><Trash2 className="h-4 w-4 mr-2" />Delete</Button>
            </div>
          </div>
          <p className="text-xl text-gray-400 mb-2">{album.artist}</p>
          <div className="flex items-center gap-4 text-gray-400 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Released: {album.release_date ? new Date(album.release_date).toLocaleDateString() : 'N/A'}
            </div>
            <div className="flex items-center gap-2">
              <span>Status:</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={`capitalize flex items-center gap-2 ${getStatusColor(album.status || 'draft')}`}
                  >
                    {getStatusIcon(album.status || 'draft')}
                    {album.status || 'draft'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => updateAlbumStatus('production')}>
                    Production
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateAlbumStatus('draft')}>
                    Draft
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateAlbumStatus('distribute')}>
                    Distribute
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateAlbumStatus('error')}>
                    Error
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateAlbumStatus('published')}>
                    Published
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateAlbumStatus('other')}>
                    Other
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-center gap-2">
              <span>Phase:</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={`capitalize flex items-center gap-2 ${getProductionStatusColor(album.production_status || 'production')}`}
                  >
                    {getProductionStatusIcon(album.production_status || 'production')}
                    {album.production_status || 'production'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => updateAlbumProductionStatus('marketing')}>
                    Marketing
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateAlbumProductionStatus('organization')}>
                    Organization
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateAlbumProductionStatus('production')}>
                    Production
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateAlbumProductionStatus('quality_control')}>
                    Quality Control
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateAlbumProductionStatus('ready_for_distribution')}>
                    Ready for Distribution
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <h2 className="text-lg font-semibold mb-2">Description</h2>
          <div className="mb-6 text-gray-400">{album.description || <span className="italic">No description.</span>}</div>
          
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-md font-semibold">Distributor</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={openEditAlbumDialog}
                  className="h-6 px-2 text-xs"
                >
                  <FileText className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              </div>
              <div className="text-gray-400">
                {album.distributor ? (
                  <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
                    {album.distributor}
                  </span>
                ) : (
                  <span className="italic text-gray-500">No distributor assigned</span>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-md font-semibold mb-2">Distributor Notes</h3>
              <div className="text-gray-400">
                {album.distributor_notes || <span className="italic text-gray-500">No distributor notes</span>}
              </div>
            </div>
          </div>
          
          {album.notes && (
            <div className="mb-6">
              <h3 className="text-md font-semibold mb-2">Notes</h3>
              <div className="text-gray-400 bg-zinc-800 p-3 rounded-lg">
                {album.notes}
              </div>
            </div>
          )}
          {album.additional_covers && album.additional_covers.length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">Additional Covers</h3>
              <div className="flex flex-wrap gap-4">
                {album.additional_covers.map((cover, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <img src={cover.url} alt={cover.label} className="w-20 h-20 object-cover rounded" />
                    <span className="text-xs text-gray-400 mt-1">{cover.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="mt-10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Tracks</h2>
          <div className="flex gap-2">
            {album?.cover_art_url && tracks.length > 0 && (
              <Button 
                onClick={handleGenerateTrackTitles} 
                variant="outline"
                disabled={generatingTitles}
                className="bg-purple-600 hover:bg-purple-700 text-white border-purple-500"
              >
                {generatingTitles ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI Generate Titles
                  </>
                )}
              </Button>
            )}
            <Button onClick={() => setShowAddTrackOptions(true)} variant="default">Add Track</Button>
          </div>
        </div>
        {loadingTracks ? (
          <div>Loading tracks...</div>
        ) : trackError ? (
          <div className="text-red-500">{trackError}</div>
        ) : tracks.length === 0 ? (
          <div>No tracks found.</div>
        ) : (
          <div className="space-y-2">
            {tracks.map((track, idx) => {
              // Check if this track has an MP3 conversion (title ends with .mp3)
              const isMp3Conversion = track.title.endsWith('.mp3')
              const originalTitle = isMp3Conversion ? track.title.replace('.mp3', '') : track.title
              
              // Find the original track if this is an MP3 conversion
              const originalTrack = isMp3Conversion ? tracks.find(t => t.title === originalTitle && !t.title.endsWith('.mp3')) : null
              
              // If this is an MP3 conversion and we have the original, skip rendering this one
              if (isMp3Conversion && originalTrack) {
                return null
              }
              
              // Only show original tracks (not MP3 conversions) as main tracks
              // But allow MP3 conversions if they don't have an original counterpart
              if (isMp3Conversion && originalTrack) {
                return null
              }
              
              // Find MP3 conversions for this track
              const mp3Conversions = tracks.filter(t => t.title === track.title + '.mp3')
              
                              return (
                  <div 
                    key={track.id} 
                    draggable={editingTrackTitleId !== track.id}
                    onDragStart={editingTrackTitleId !== track.id ? (e) => handleDragStart(e, track) : undefined}
                    onDragOver={editingTrackTitleId !== track.id ? (e) => handleDragOver(e, idx) : undefined}
                    onDragLeave={editingTrackTitleId !== track.id ? handleDragLeave : undefined}
                    onDrop={editingTrackTitleId !== track.id ? (e) => handleDrop(e, idx) : undefined}
                    onDragEnd={editingTrackTitleId !== track.id ? handleDragEnd : undefined}
                    className={`bg-zinc-800 rounded px-4 py-2 border-l-4 transition-all duration-200 ${
                      editingTrackTitleId === track.id ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
                    } ${
                      getStatusBorderColor(track.status || 'draft')
                    } ${
                      draggedTrack?.id === track.id ? 'opacity-50 scale-95' : ''
                    } ${
                      dragOverIndex === idx ? 'ring-2 ring-blue-500 transform scale-[1.02]' : ''
                    }`}
                  >
                  <div className="flex items-center gap-4">
                    {editingTrackTitleId !== track.id && (
                      <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                    )}
                    <span className="font-bold text-lg text-gray-300">{idx + 1}</span>
                    <div className="flex items-center gap-2 flex-1">
                      {editingTrackTitleId === track.id ? (
                        <Input
                          value={editingTrackTitleValue}
                          onChange={(e) => setEditingTrackTitleValue(e.target.value)}
                          onBlur={async () => {
                            if (editingTrackTitleValue.trim() && editingTrackTitleValue !== track.title) {
                              // Save the new title
                              const { error } = await supabase
                                .from('album_tracks')
                                .update({ title: editingTrackTitleValue.trim() })
                                .eq('id', track.id);
                              
                              if (!error) {
                                // Update local state
                                setTracks(tracks.map(t => t.id === track.id ? { ...t, title: editingTrackTitleValue.trim() } : t));
                                toast({
                                  title: "Success",
                                  description: "Track title updated",
                                  variant: "default"
                                });
                              } else {
                                toast({
                                  title: "Error",
                                  description: "Failed to update track title",
                                  variant: "destructive"
                                });
                              }
                            }
                            setEditingTrackTitleId(null);
                            setEditingTrackTitleValue('');
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            } else if (e.key === 'Escape') {
                              setEditingTrackTitleId(null);
                              setEditingTrackTitleValue('');
                            }
                          }}
                          className="h-7 px-2 text-sm font-medium bg-gray-700 border-gray-600 text-white"
                          autoFocus
                        />
                      ) : (
                        <>
                          <span 
                            className="font-medium cursor-pointer hover:text-yellow-400 transition-colors"
                            onClick={() => {
                              setEditingTrackTitleId(track.id);
                              setEditingTrackTitleValue(track.title);
                            }}
                            title="Click to edit"
                          >
                            {track.title}
                          </span>
                          {recentlyReplacedTracks.has(track.id) && (
                            <Badge variant="secondary" className="bg-green-600 text-white text-xs px-2 py-1 animate-pulse">
                              File Replaced
                            </Badge>
                          )}
                          {/* AI Regenerate Title Button */}
                          {album?.cover_art_url && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRegenerateSingleTrackTitle(track.id, track.title)}
                              disabled={regeneratingTrackId === track.id}
                              className="h-6 w-6 p-0 text-purple-400 hover:text-purple-300 hover:bg-purple-900/20"
                              title="AI Regenerate Title"
                            >
                              {regeneratingTrackId === track.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Sparkles className="w-3 h-3" />
                              )}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                    
                    {/* Play Button - Always Show */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (track.audio_url) {
                          if (playingTrackId === track.id) {
                            stopCurrentAudio();
                          } else {
                            playTrack(track.id, track.audio_url);
                          }
                        } else {
                          toast({
                            title: "No Audio File",
                            description: "This track doesn't have an audio file uploaded yet.",
                            variant: "destructive"
                          });
                        }
                      }}
                      disabled={!track.audio_url}
                      className={`${
                        !track.audio_url 
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                          : playingTrackId === track.id 
                            ? 'bg-green-600 hover:bg-green-700 text-white border-green-500' 
                            : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-500'
                      }`}
                      title={!track.audio_url ? 'No audio file' : playingTrackId === track.id ? 'Stop' : 'Play'}
                    >
                      {playingTrackId === track.id ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    
                    {/* Status Badge - Compact */}
                    <Badge 
                      variant="outline" 
                      className={`capitalize ${getStatusColor(track.status || 'draft')} text-xs`}
                    >
                      {getStatusIcon(track.status || 'draft')}
                      <span className="ml-1">{track.status || 'draft'}</span>
                    </Badge>
                    
                    {/* View Details Button */}
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => openTrackDetailsDialog(track)}
                      className="bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    
                    {/* Delete Button */}
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => handleDeleteTrack(track.id, track.title)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {track.session_id && track.session_name && (
                    <div className="mt-2 ml-20">
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
                  
                  {/* MP3 Conversions as subtracks */}
                  {mp3Conversions.length > 0 && (
                    <div className="mt-3 border-t border-gray-600 pt-3">
                      <h4 className="text-sm font-medium text-gray-400 mb-2">MP3 Conversions:</h4>
                      <div className="space-y-2">
                        {mp3Conversions.map((mp3Track) => (
                          <div key={mp3Track.id} className={`flex items-center gap-4 bg-zinc-700 rounded px-3 py-2 ml-8 border-l-4 ${getStatusBorderColor(mp3Track.status || 'draft')}`}>
                            <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                            </div>
                            <span className="text-sm text-gray-300">{mp3Track.title}</span>
                            <span className="text-xs text-gray-500">MP3</span>
                            {/* Play Button for MP3 Track */}
                            {mp3Track.audio_url && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (playingTrackId === mp3Track.id) {
                                    stopCurrentAudio();
                                  } else {
                                    playTrack(mp3Track.id, mp3Track.audio_url);
                                  }
                                }}
                                className={`${
                                  playingTrackId === mp3Track.id 
                                    ? 'bg-green-600 hover:bg-green-700 text-white border-green-500' 
                                    : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-500'
                                }`}
                                title={playingTrackId === mp3Track.id ? 'Stop' : 'Play'}
                              >
                                {playingTrackId === mp3Track.id ? (
                                  <Pause className="h-3 w-3" />
                                ) : (
                                  <Play className="h-3 w-3" />
                                )}
                              </Button>
                            )}

                            {/* Status Dropdown for MP3 Track */}
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
                                <DropdownMenuItem onClick={() => updateTrackStatus(mp3Track.id, 'production')}>
                                  Production
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateTrackStatus(mp3Track.id, 'draft')}>
                                  Draft
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateTrackStatus(mp3Track.id, 'distribute')}>
                                  Distribute
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateTrackStatus(mp3Track.id, 'error')}>
                                  Error
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateTrackStatus(mp3Track.id, 'published')}>
                                  Published
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateTrackStatus(mp3Track.id, 'other')}>
                                  Other
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <Button size="sm" variant="outline" onClick={() => handleOpenEditTrack(mp3Track)} className="text-xs h-6 px-2">
                              Edit
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => openMetadataDialog(mp3Track.id, 'album_track')}
                              className="text-xs h-6 px-2 bg-purple-600 hover:bg-purple-700 text-white border-purple-500"
                            >
                              <FileTextIcon className="h-3 w-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => openNotesDialog(mp3Track.id, 'album_track', mp3Track.title)}
                              className="text-xs h-6 px-2 bg-orange-600 hover:bg-orange-700 text-white border-orange-500"
                            >
                              <StickyNote className="h-3 w-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive" 
                              onClick={() => handleDeleteTrack(mp3Track.id, mp3Track.title)}
                              className="text-xs h-6 px-2 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                                                         {mp3Track.audio_url && (
                               <Button 
                                 size="sm" 
                                 variant="outline" 
                                 onClick={() => downloadTrack(mp3Track.id, mp3Track.audio_url, mp3Track.title)}
                                 className="text-xs h-6 px-2 text-green-400 hover:text-green-300 hover:bg-green-900/20"
                               >
                                 <Download className="h-3 w-3" />
                               </Button>
                             )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      
      {/* Add Track Options Dialog */}
      <Dialog open={showAddTrackOptions} onOpenChange={setShowAddTrackOptions}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Track</DialogTitle>
            <DialogDescription>
              Choose how you want to add tracks to this album.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Button
              type="button"
              onClick={async () => {
                setShowAddTrackOptions(false);
                // Immediately add 1 track without showing form
                await handleAddMultipleTracksDirectly(1);
              }}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-black"
            >
              Add 1 Track
            </Button>
            <div className="space-y-2">
              <Button
                type="button"
                onClick={async () => {
                  setShowAddTrackOptions(false);
                  // Immediately add the tracks without showing form
                  await handleAddMultipleTracksDirectly(numberOfTracks);
                }}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              >
                Add Multiple Tracks
              </Button>
              <div className="flex items-center gap-2">
                <Label htmlFor="numberOfTracks" className="text-sm">Number of tracks:</Label>
                <Input
                  id="numberOfTracks"
                  type="number"
                  min="2"
                  max="100"
                  value={numberOfTracks}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 2;
                    const clampedValue = Math.min(Math.max(value, 2), 100);
                    setNumberOfTracks(clampedValue);
                    // Update multiple tracks array if it exists
                    if (multipleTracks.length > 0) {
                      if (clampedValue > multipleTracks.length) {
                        // Add more tracks
                        const newTracks = Array(clampedValue - multipleTracks.length).fill(null).map(() => ({
                          title: '',
                          duration: '',
                          isrc: '',
                          audio_url: ''
                        }));
                        setMultipleTracks([...multipleTracks, ...newTracks]);
                      } else if (clampedValue < multipleTracks.length) {
                        // Remove tracks
                        setMultipleTracks(multipleTracks.slice(0, clampedValue));
                      }
                    }
                  }}
                  className="w-20"
                />
                <span className="text-sm text-gray-500">(max 100)</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddTrackOptions(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddTrack} onOpenChange={(open) => {
        setShowAddTrack(open);
        if (!open) {
          setAddMultipleTracks(false);
          setMultipleTracks([]);
          setNumberOfTracks(2);
          setNewTrack({ title: '', duration: '', isrc: '' });
          setAudioUrl('');
        }
      }}>
        <DialogContent className={addMultipleTracks ? "max-w-4xl max-h-[90vh] overflow-y-auto" : ""}>
          <DialogHeader>
            <DialogTitle>{addMultipleTracks ? `Add ${numberOfTracks} Tracks` : 'Add Track'}</DialogTitle>
          </DialogHeader>
          {addMultipleTracks ? (
            <form onSubmit={handleAddMultipleTracks} className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-700">
                <Label htmlFor="numberOfTracksDialog" className="text-sm">Number of tracks:</Label>
                <Input
                  id="numberOfTracksDialog"
                  type="number"
                  min="2"
                  max="100"
                  value={numberOfTracks}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 2;
                    const clampedValue = Math.min(Math.max(value, 2), 100);
                    setNumberOfTracks(clampedValue);
                    // Update multiple tracks array
                    if (clampedValue > multipleTracks.length) {
                      // Add more tracks
                      const newTracks = Array(clampedValue - multipleTracks.length).fill(null).map(() => ({
                        title: '',
                        duration: '',
                        isrc: '',
                        audio_url: ''
                      }));
                      setMultipleTracks([...multipleTracks, ...newTracks]);
                    } else if (clampedValue < multipleTracks.length) {
                      // Remove tracks
                      setMultipleTracks(multipleTracks.slice(0, clampedValue));
                    }
                  }}
                  className="w-20"
                />
                <span className="text-sm text-gray-500">(max 100)</span>
              </div>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {multipleTracks.map((track, index) => {
                  return (
                    <div key={index} className="p-4 border border-gray-700 rounded-lg space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-gray-400">Track {index + 1}</span>
                      </div>
                    <Input
                      placeholder="Duration (e.g. 3:45)"
                      value={track.duration}
                      onChange={e => {
                        const updated = [...multipleTracks];
                        updated[index].duration = e.target.value;
                        setMultipleTracks(updated);
                      }}
                    />
                    <Input
                      placeholder="ISRC"
                      value={track.isrc}
                      onChange={e => {
                        const updated = [...multipleTracks];
                        updated[index].isrc = e.target.value;
                        setMultipleTracks(updated);
                      }}
                    />
                    <Input
                      type="file"
                      accept="audio/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const url = await uploadTrackAudio(file);
                          if (url) {
                            const updated = [...multipleTracks];
                            updated[index].audio_url = url;
                            setMultipleTracks(updated);
                          }
                        }
                      }}
                    />
                    {track.audio_url && (
                      <audio controls src={track.audio_url} className="h-8 mt-2" />
                    )}
                  </div>
                  );
                })}
              </div>
              {addTrackError && <div className="text-red-500 text-sm">{addTrackError}</div>}
              <DialogFooter>
                <Button type="submit" disabled={addingTrack || audioUploading} className="bg-yellow-400 hover:bg-yellow-500 text-black">
                  {addingTrack ? 'Adding...' : audioUploading ? 'Uploading audio...' : `Add ${numberOfTracks} Track(s)`}
                </Button>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
              </DialogFooter>
            </form>
          ) : (
            <form onSubmit={handleAddTrack} className="space-y-4">
              <div className="text-sm text-gray-400 mb-2">
                Track will be auto-named as "Track {tracks.length + 1}"
              </div>
              <Input
                placeholder="Duration (e.g. 3:45)"
                value={newTrack.duration}
                onChange={e => setNewTrack({ ...newTrack, duration: e.target.value })}
              />
              <Input
                placeholder="ISRC"
                value={newTrack.isrc}
                onChange={e => setNewTrack({ ...newTrack, isrc: e.target.value })}
              />
              <Input
                type="file"
                accept="audio/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const url = await uploadTrackAudio(file);
                    if (url) setAudioUrl(url);
                  }
                }}
              />
              {audioUploading && <div className="text-sm text-gray-500">Uploading audio...</div>}
              {audioUploadError && <div className="text-red-500 text-sm">{audioUploadError}</div>}
              {audioUrl && (
                <audio controls src={audioUrl} className="h-8 mt-2" />
              )}
              {addTrackError && <div className="text-red-500 text-sm">{addTrackError}</div>}
              <DialogFooter>
                <Button type="submit" disabled={addingTrack || audioUploading} className="bg-yellow-400 hover:bg-yellow-500 text-black">
                  {addingTrack ? 'Adding...' : audioUploading ? 'Uploading audio...' : 'Add Track'}
                </Button>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={!!editTrackId} onOpenChange={open => { if (!open) setEditTrackId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Track</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditTrack} className="space-y-4">
            <Input
              placeholder="Track Title"
              value={editTrack.title}
              onChange={e => setEditTrack({ ...editTrack, title: e.target.value })}
              required
            />
            <Input
              placeholder="Duration (e.g. 3:45)"
              value={editTrack.duration}
              onChange={e => setEditTrack({ ...editTrack, duration: e.target.value })}
            />
            <Input
              placeholder="ISRC"
              value={editTrack.isrc}
              onChange={e => setEditTrack({ ...editTrack, isrc: e.target.value })}
            />
            <Input
              type="file"
              accept="audio/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file && editTrackId) {
                  const url = await uploadEditTrackAudio(file, editTrackId);
                  if (url) setEditTrack({ ...editTrack, audio_url: url });
                }
              }}
            />
            {editAudioUploading && <div className="text-sm text-gray-500">Uploading audio...</div>}
            {editAudioUploadError && <div className="text-red-500 text-sm">{editAudioUploadError}</div>}
            {editTrack.audio_url && (
              <audio controls src={editTrack.audio_url} className="h-8 mt-2" />
            )}
            {editTrackError && <div className="text-red-500 text-sm">{editTrackError}</div>}
            <DialogFooter>
              <div className="flex gap-2 w-full">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => handleMoveTrack(editTrackId!, editTrack.title)}
                  className="flex-1"
                >
                  Move Track
                </Button>
                <Button type="submit" disabled={editTrackSaving || editAudioUploading} className="bg-yellow-400 hover:bg-yellow-500 text-black">
                  {editTrackSaving ? 'Saving...' : editAudioUploading ? 'Uploading audio...' : 'Save Changes'}
                </Button>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Move Track Dialog */}
      <Dialog open={showMoveTrackDialog} onOpenChange={setShowMoveTrackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Track</DialogTitle>
            <DialogDescription>
              Move "{moveTrackTitle}" to another album or to singles.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Destination</Label>
              
              {/* Move to Singles Option */}
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="move-to-singles"
                  name="destination"
                  checked={moveToSingles}
                  onChange={() => {
                    setMoveToSingles(true);
                    setSelectedTargetAlbum('');
                  }}
                  className="w-4 h-4"
                />
                <Label htmlFor="move-to-singles" className="text-sm">
                  Move to Singles
                </Label>
              </div>

              {/* Move to Another Album Option */}
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="move-to-album"
                  name="destination"
                  checked={!moveToSingles}
                  onChange={() => {
                    setMoveToSingles(false);
                    setSelectedTargetAlbum('');
                  }}
                  className="w-4 h-4"
                />
                <Label htmlFor="move-to-album" className="text-sm">
                  Move to Another Album
                </Label>
              </div>
            </div>

            {/* Album Selection */}
            {!moveToSingles && (
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

            {moveTrackError && (
              <div className="text-red-500 text-sm">{moveTrackError}</div>
            )}
          </div>

          <DialogFooter>
            <Button 
              onClick={executeMoveTrack}
              disabled={movingTrack || (!moveToSingles && !selectedTargetAlbum)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {movingTrack ? 'Moving...' : 'Move Track'}
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
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
                    convertTrackToMp3(compressionFile.id, compressionFile.url, 'ultra_high')
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
                    convertTrackToMp3(compressionFile.id, compressionFile.url, 'high')
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
                    convertTrackToMp3(compressionFile.id, compressionFile.url, 'medium')
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
                    convertTrackToMp3(compressionFile.id, compressionFile.url, 'low')
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

      {/* Track Details Dialog */}
      <Dialog open={showTrackDetailsDialog} onOpenChange={setShowTrackDetailsDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Track Details: {viewDetailsTrack?.title}</DialogTitle>
            <DialogDescription>
              View and manage all track information and actions.
            </DialogDescription>
          </DialogHeader>
          
          {viewDetailsTrack && (
            <div className="space-y-6">
              {/* Track Information */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Track Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-400">Duration</Label>
                    <p className="text-sm">{viewDetailsTrack.duration || '0:00'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-400">ISRC</Label>
                    <p className="text-sm">{viewDetailsTrack.isrc || 'Not set'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-400">Status</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className={`capitalize ${getStatusColor(viewDetailsTrack.status || 'draft')}`}
                        >
                          {getStatusIcon(viewDetailsTrack.status || 'draft')}
                          <span className="ml-2">{viewDetailsTrack.status || 'draft'}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => {
                          updateTrackStatus(viewDetailsTrack.id, 'production');
                          setViewDetailsTrack({ ...viewDetailsTrack, status: 'production' });
                        }}>
                          Production
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          updateTrackStatus(viewDetailsTrack.id, 'draft');
                          setViewDetailsTrack({ ...viewDetailsTrack, status: 'draft' });
                        }}>
                          Draft
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          updateTrackStatus(viewDetailsTrack.id, 'distribute');
                          setViewDetailsTrack({ ...viewDetailsTrack, status: 'distribute' });
                        }}>
                          Distribute
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          updateTrackStatus(viewDetailsTrack.id, 'error');
                          setViewDetailsTrack({ ...viewDetailsTrack, status: 'error' });
                        }}>
                          Error
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          updateTrackStatus(viewDetailsTrack.id, 'published');
                          setViewDetailsTrack({ ...viewDetailsTrack, status: 'published' });
                        }}>
                          Published
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          updateTrackStatus(viewDetailsTrack.id, 'other');
                          setViewDetailsTrack({ ...viewDetailsTrack, status: 'other' });
                        }}>
                          Other
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {viewDetailsTrack.audio_url && (
                    <div className="col-span-2">
                      <Label className="text-sm text-gray-400">Audio File</Label>
                      <div className="flex items-center gap-2 mt-1">
                        {getAudioFileLabel(viewDetailsTrack.audio_url)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* File Actions */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">File Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  {viewDetailsTrack.audio_url && (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => downloadTrack(viewDetailsTrack.id, viewDetailsTrack.audio_url, viewDetailsTrack.title)}
                        className="bg-green-600 hover:bg-green-700 text-white border-green-500"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Audio
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        disabled={convertingTrack === viewDetailsTrack.id}
                        onClick={() => {
                          showCompressionOptions(viewDetailsTrack.id, viewDetailsTrack.audio_url);
                          setShowTrackDetailsDialog(false);
                        }}
                      >
                        {convertingTrack === viewDetailsTrack.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Converting...
                          </>
                        ) : (
                          <>
                            <FileAudio className="h-4 w-4 mr-2" />
                            MP3 Converter
                          </>
                        )}
                      </Button>
                    </>
                  )}
                  <input
                    type="file"
                    id={`upload-track-details-${viewDetailsTrack.id}`}
                    accept="audio/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length > 0) {
                        files.forEach(file => {
                          replaceTrackAudio(viewDetailsTrack.id, file);
                        });
                        e.target.value = '';
                      }
                    }}
                  />
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => document.getElementById(`upload-track-details-${viewDetailsTrack.id}`)?.click()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-500"
                    disabled={replacingTrackId === viewDetailsTrack.id}
                  >
                    {replacingTrackId === viewDetailsTrack.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Replacing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Replace Audio
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Stems & WAV Files */}
              {(trackStemsAvailability[viewDetailsTrack.id]?.available || trackWavAvailability[viewDetailsTrack.id]?.available) && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">Additional Files</h3>
                  <div className="space-y-3">
                    {trackStemsAvailability[viewDetailsTrack.id]?.available && (
                      <div className="flex items-center justify-between p-3 bg-purple-600/10 border border-purple-500/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Archive className="h-5 w-5 text-purple-400" />
                          <span className="font-medium">Stems (ZIP)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const filePath = trackStemsAvailability[viewDetailsTrack.id].paths[0];
                              const fileName = filePath.split('/').pop() || 'stems.zip';
                              downloadFile(filePath, fileName);
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete the stems file?')) {
                                deleteFile(trackStemsAvailability[viewDetailsTrack.id].paths[0], viewDetailsTrack.id, 'stems');
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                    {trackWavAvailability[viewDetailsTrack.id]?.available && (
                      <div className="flex items-center justify-between p-3 bg-blue-600/10 border border-blue-500/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileAudio className="h-5 w-5 text-blue-400" />
                          <span className="font-medium">WAV File</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const filePath = trackWavAvailability[viewDetailsTrack.id].paths[0];
                              const fileName = filePath.split('/').pop() || 'audio.wav';
                              downloadFile(filePath, fileName);
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete the WAV file?')) {
                                deleteFile(trackWavAvailability[viewDetailsTrack.id].paths[0], viewDetailsTrack.id, 'wav');
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Track Management */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Track Management</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      handleOpenEditTrack(viewDetailsTrack);
                      setShowTrackDetailsDialog(false);
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Edit Track
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      openMetadataDialog(viewDetailsTrack.id, 'album_track');
                      setShowTrackDetailsDialog(false);
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white border-purple-500"
                  >
                    <FileTextIcon className="h-4 w-4 mr-2" />
                    Metadata
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      openNotesDialog(viewDetailsTrack.id, 'album_track', viewDetailsTrack.title);
                      setShowTrackDetailsDialog(false);
                    }}
                    className="bg-orange-600 hover:bg-orange-700 text-white border-orange-500"
                  >
                    <StickyNote className="h-4 w-4 mr-2" />
                    Notes
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete "${viewDetailsTrack.title}"? This action cannot be undone.`)) {
                        handleDeleteTrack(viewDetailsTrack.id, viewDetailsTrack.title);
                        setShowTrackDetailsDialog(false);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Track
                  </Button>
                </div>
              </div>

              {/* Session Link */}
              {viewDetailsTrack.session_id && viewDetailsTrack.session_name && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Session Link</h3>
                  <div 
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 border border-blue-500/30 rounded-md"
                  >
                    <LinkIcon className="h-4 w-4 text-blue-400" />
                    <span className="text-sm font-medium text-blue-300">
                      Session: {viewDetailsTrack.session_name}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Album Dialog */}
      <Dialog open={showEditAlbum} onOpenChange={setShowEditAlbum}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Album</DialogTitle>
            <DialogDescription>
              Update your album information and cover art.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleEditAlbum} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={editAlbumForm.title || ''}
                  onChange={(e) => setEditAlbumForm(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Artist(s)</label>
                <div className="space-y-2">
                  {/* Artist input */}
                  <div className="flex gap-2">
                    <Input
                      value={newArtistInput}
                      onChange={(e) => setNewArtistInput(e.target.value)}
                      onKeyDown={handleEditAlbumArtistInputKeyDown}
                      placeholder="Enter artist name and press Enter or click +"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={addEditAlbumArtist}
                      disabled={!newArtistInput.trim() || editAlbumArtists.includes(newArtistInput.trim())}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3"
                      size="sm"
                    >
                      +
                    </Button>
                  </div>
                  
                  {/* Artist tags */}
                  {editAlbumArtists.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {editAlbumArtists.map((artist, index) => (
                        <div
                          key={index}
                          className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2"
                        >
                          <span>{artist}</span>
                          <button
                            type="button"
                            onClick={() => removeEditAlbumArtist(artist)}
                            className="text-white hover:text-red-200 text-xs"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Release Date</label>
              <Input
                type="date"
                value={editAlbumForm.release_date || ''}
                onChange={(e) => setEditAlbumForm(prev => ({ ...prev, release_date: e.target.value }))}
                required
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={editAlbumForm.description || ''}
                onChange={(e) => setEditAlbumForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Distributor</label>
                <Input
                  value={editAlbumForm.distributor || ''}
                  onChange={(e) => setEditAlbumForm(prev => ({ ...prev, distributor: e.target.value }))}
                  placeholder="e.g., DistroKid, TuneCore, CD Baby"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Distributor Notes</label>
                <Input
                  value={editAlbumForm.distributor_notes || ''}
                  onChange={(e) => setEditAlbumForm(prev => ({ ...prev, distributor_notes: e.target.value }))}
                  placeholder="Account details, submission notes..."
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={editAlbumForm.notes || ''}
                onChange={(e) => setEditAlbumForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="General album notes..."
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Publish to Artist Page</label>
              <Select
                value={selectedLabelArtistId || "none"}
                onValueChange={(value) => {
                  console.log('🔍 [ALBUM SELECT] Value changed:', value);
                  const newValue = value === "none" ? "" : value;
                  console.log('🔍 [ALBUM SELECT] Setting selectedLabelArtistId to:', newValue);
                  setSelectedLabelArtistId(newValue);
                }}
                disabled={loadingLabelArtists}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingLabelArtists ? "Loading artists..." : "Select an artist to publish this album"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Unpublish)</SelectItem>
                  {labelArtists.map((artist) => (
                    <SelectItem key={artist.id} value={artist.id}>
                      {artist.stage_name || artist.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400 mt-1">
                {selectedLabelArtistId 
                  ? "This album will appear on the selected artist's page" 
                  : "Select an artist to publish this album to their artist page"}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium">Cover Art</label>
              <div className="flex items-center gap-4">
                {editAlbumForm.cover_art_url && (
                  <img 
                    src={editAlbumForm.cover_art_url} 
                    alt="Cover preview" 
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                )}
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverArtUpload}
                      disabled={uploadingCover || generatingCoverArt}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleOpenCoverArtDialog}
                      disabled={uploadingCover || generatingCoverArt}
                      className="whitespace-nowrap"
                    >
                      {generatingCoverArt ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate with AI
                        </>
                      )}
                    </Button>
                  </div>
                  {uploadingCover && <p className="text-sm text-blue-500">Uploading...</p>}
                  {generatingCoverArt && <p className="text-sm text-blue-500">Generating cover art with AI...</p>}
                  {uploadError && <p className="text-sm text-red-500">{uploadError}</p>}
                </div>
              </div>
            </div>
            
            {editAlbumError && (
              <div className="text-red-500 text-sm">{editAlbumError}</div>
            )}
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditAlbum(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={editAlbumSaving || uploadingCover}
              >
                {editAlbumSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Generate Cover Art Prompt Dialog */}
      <Dialog open={showCoverArtPromptDialog} onOpenChange={setShowCoverArtPromptDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generate Album Cover Art</DialogTitle>
            <DialogDescription>
              Enter a description of the cover art you want to generate. The AI will create a professional album cover based on your prompt.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="cover-art-prompt">Cover Art Description</Label>
              <Textarea
                id="cover-art-prompt"
                value={coverArtPrompt}
                onChange={(e) => setCoverArtPrompt(e.target.value)}
                placeholder="Describe the album cover art you want to generate..."
                rows={6}
                className="mt-2"
              />
              <p className="text-xs text-gray-400 mt-2">
                Tip: Be specific about colors, mood, style, and any elements you want included in the cover art.
              </p>
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCoverArtPromptDialog(false)}
                disabled={generatingCoverArt}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => handleGenerateCoverArt()}
                disabled={generatingCoverArt || !coverArtPrompt.trim()}
              >
                {generatingCoverArt ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Cover Art
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Track Dialog */}
      <Dialog open={showAddTrack} onOpenChange={setShowAddTrack}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Track to Album</DialogTitle>
            <DialogDescription>
              Add a new track to "{album?.title}". You can add the audio file later.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddTrack} className="space-y-4">
            <div className="text-sm text-gray-400 mb-2">
              Track will be auto-named as "Track {tracks.length + 1}"
            </div>
            <div>
              <Label htmlFor="track-duration">Duration</Label>
              <Input
                id="track-duration"
                placeholder="3:45"
                value={newTrack.duration}
                onChange={e => setNewTrack({ ...newTrack, duration: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="track-isrc">ISRC</Label>
              <Input
                id="track-isrc"
                placeholder="ISRC Code"
                value={newTrack.isrc}
                onChange={e => setNewTrack({ ...newTrack, isrc: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="track-audio">Audio File (Optional)</Label>
              <Input
                id="track-audio"
                type="file"
                accept="audio/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setAudioUploading(true);
                    setAudioUploadError(null);
                    try {
                      const fileExt = file.name.split('.').pop();
                      const filePath = `album_tracks/${albumId}/${Date.now()}.${fileExt}`;
                      const { error } = await supabase.storage.from('beats').upload(filePath, file, { upsert: true });
                      if (error) {
                        setAudioUploadError(error.message);
                        return;
                      }
                      const { data } = supabase.storage.from('beats').getPublicUrl(filePath);
                      setAudioUrl(data?.publicUrl || '');
                    } catch (error) {
                      setAudioUploadError('Failed to upload audio file');
                    } finally {
                      setAudioUploading(false);
                    }
                  }
                }}
                disabled={audioUploading}
              />
              {audioUploading && <p className="text-sm text-blue-500 mt-1">Uploading audio...</p>}
              {audioUploadError && <p className="text-sm text-red-500 mt-1">{audioUploadError}</p>}
              {audioUrl && <p className="text-sm text-green-500 mt-1">Audio uploaded successfully!</p>}
            </div>
            
            {addTrackError && <div className="text-red-500 text-sm">{addTrackError}</div>}
            
            <DialogFooter>
              <Button type="submit" disabled={addingTrack || audioUploading} className="bg-blue-600 hover:bg-blue-700 text-white">
                {addingTrack ? 'Adding...' : 'Add Track'}
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
            </DialogFooter>
          </form>
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

      {/* Generated Track Titles Dialog */}
      <Dialog open={showGeneratedTitlesDialog} onOpenChange={setShowGeneratedTitlesDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              AI Generated Track Titles
            </DialogTitle>
            <DialogDescription>
              Review the generated track titles based on your album cover art. Click "Apply Titles" to update all tracks.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {generatedTitles.map((title, index) => {
              const track = tracks[index];
              const isEditing = editingTitleIndex === index;
              const isRegenerating = regeneratingIndex === index;
              
              return (
                <div key={index} className="flex items-start gap-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
                  <span className="font-bold text-gray-400 w-8 pt-1">{index + 1}</span>
                  <div className="flex-1 space-y-2">
                    {track && (
                      <div className="text-sm text-gray-500">
                        Current: <span className="line-through">{track.title}</span>
                      </div>
                    )}
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editingTitleValue}
                          onChange={(e) => setEditingTitleValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveEditTitle(index);
                            } else if (e.key === 'Escape') {
                              handleCancelEditTitle();
                            }
                          }}
                          className="bg-gray-900 border-gray-600 text-white"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={() => handleSaveEditTitle(index)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEditTitle}
                          className="border-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="text-white font-medium flex-1">{title}</div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStartEditTitle(index)}
                            className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                            title="Edit title"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRegenerateTitle(index)}
                            disabled={isRegenerating}
                            className="h-8 w-8 p-0 text-gray-400 hover:text-blue-400"
                            title="Regenerate title"
                          >
                            {isRegenerating ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <RotateCcw className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteTitle(index)}
                            className="h-8 w-8 p-0 text-gray-400 hover:text-red-400"
                            title="Delete title"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowGeneratedTitlesDialog(false);
                setGeneratedTitles([]);
                setEditingTitleIndex(null);
                setEditingTitleValue('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleApplyGeneratedTitles}
              disabled={generatedTitles.length === 0}
              className="bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
            >
              Apply Titles ({generatedTitles.length} of {tracks.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden Audio Element for Playback */}
      <audio
        ref={(el) => setAudioRef(el)}
        onEnded={() => setPlayingTrackId(null)}
        onError={() => {
          setPlayingTrackId(null);
          toast({
            title: "Playback Error",
            description: "Failed to play audio track",
            variant: "destructive"
          });
        }}
      />

      {/* Cover Art Crop Dialog */}
      <Dialog open={showCropDialog} onOpenChange={(open) => {
        setShowCropDialog(open);
        if (!open) {
          // Reset canvas ref when dialog closes to allow proper re-initialization
          setCropCanvasRef(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crop Cover Art</DialogTitle>
            <DialogDescription>
              Drag the crop box to select the area you want to keep. The crop box will be resized to a square.
            </DialogDescription>
          </DialogHeader>
          
          {cropImage && (
            <div className="space-y-4">
              {/* Size Selection */}
              <div className="flex items-center gap-4">
                <Label>Output Size:</Label>
                <Select value={cropSize.toString()} onValueChange={(value) => setCropSize(parseInt(value) as 1600 | 3000)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1600">1600 × 1600 px</SelectItem>
                    <SelectItem value="3000">3000 × 3000 px</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Canvas with crop overlay */}
              <div className="border border-gray-700 rounded-lg overflow-hidden bg-gray-900 flex justify-center items-center" style={{ maxHeight: '70vh', minHeight: '400px' }}>
                <div className="relative inline-block">
                  <canvas
                    ref={(el) => {
                      if (el && !cropCanvasRef) {
                        setCropCanvasRef(el);
                      }
                    }}
                    className="max-w-full h-auto block"
                    style={{ 
                      cursor: isDragging ? 'move' : isResizing ? 'nwse-resize' : 'crosshair',
                      touchAction: 'none',
                      userSelect: 'none'
                    }}
                    onMouseDown={handleCropMouseDown}
                  />
                </div>
              </div>

              {/* Instructions */}
              <div className="text-sm text-gray-400 space-y-1">
                <p>• Drag the blue box to move the crop area</p>
                <p>• Drag the bottom-right corner to resize</p>
                <p>• The crop will be saved as a square at {cropSize}×{cropSize} pixels</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCropDialog(false)}>
              Cancel
            </Button>
            <Button onClick={applyCropAndDownload} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Download className="h-4 w-4 mr-2" />
              Download Cropped Image
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 