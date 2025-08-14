"use client"

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, FileText, Trash2, FileAudio, Loader2, Link as LinkIcon, Globe, Circle, Play, Pause, Clock, Archive, Download, CheckCircle2, XCircle, FileText as FileTextIcon, StickyNote, Folder, Music, ExternalLink, Upload, GripVertical } from 'lucide-react'
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

interface Album {
  id: string
  title: string
  artist: string
  release_date: string
  cover_art_url: string
  description?: string
  additional_covers?: { label: string; url: string }[]
  status?: 'draft' | 'active' | 'paused' | 'scheduled' | 'archived'
  production_status?: 'marketing' | 'organization' | 'production' | 'quality_control' | 'ready_for_distribution'
  distributor?: string
  distributor_notes?: string
  notes?: string
  user_id?: string
}

export default function AlbumDetailsPage() {
  const params = useParams() || {}
  const albumId = params && 'albumId' in params ? (Array.isArray(params.albumId) ? params.albumId[0] : params.albumId) : ''
  const { toast } = useToast()
  const [album, setAlbum] = useState<Album | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tracks, setTracks] = useState<any[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(true);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [showAddTrack, setShowAddTrack] = useState(false);
  const [addingTrack, setAddingTrack] = useState(false);
  const [addTrackError, setAddTrackError] = useState<string | null>(null);
  const [newTrack, setNewTrack] = useState({ title: '', duration: '', isrc: '' });
  const [audioUploading, setAudioUploading] = useState(false);
  const [audioUploadError, setAudioUploadError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState('');

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

  // Album editing state
  const [showEditAlbum, setShowEditAlbum] = useState(false);
  const [editAlbumForm, setEditAlbumForm] = useState({ title: '', artist: '', release_date: '', description: '', cover_art_url: '', distributor: '', distributor_notes: '', notes: '' });
  const [editAlbumSaving, setEditAlbumSaving] = useState(false);
  const [editAlbumError, setEditAlbumError] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Multiple artists state for edit album
  const [editAlbumArtists, setEditAlbumArtists] = useState<string[]>([]);
  const [newArtistInput, setNewArtistInput] = useState('');

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
  const updateAlbumStatus = async (newStatus: 'draft' | 'active' | 'paused' | 'scheduled' | 'archived') => {
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
  async function handleAddTrack(e: React.FormEvent) {
    e.preventDefault();
    console.log('=== ADD TRACK DEBUG ===');
    console.log('newTrack:', newTrack);
    console.log('albumId:', albumId);
    console.log('audioUrl:', audioUrl);
    
    if (!newTrack.title.trim()) {
      setAddTrackError('Track title is required');
      return;
    }
    
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
    
    const { error } = await supabase.from('albums').update({
      ...editAlbumForm,
      artist: artistString
    }).eq('id', album.id);
    setEditAlbumSaving(false);
    if (error) {
      setEditAlbumError(error.message);
      return;
    }
    setAlbum({ ...album, ...editAlbumForm, artist: artistString });
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
              <img 
                src={album.cover_art_url} 
                alt={album.title} 
                className="w-48 h-48 object-cover rounded-lg"
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

              <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4 mr-2" />Delete</Button>
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
                  <DropdownMenuItem onClick={() => updateAlbumStatus('draft')}>
                    Draft
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateAlbumStatus('active')}>
                    Active
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateAlbumStatus('paused')}>
                    Paused
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateAlbumStatus('scheduled')}>
                    Scheduled
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateAlbumStatus('archived')}>
                    Archived
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
            <Button onClick={() => setShowAddTrack(true)} variant="default">Add Track</Button>
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
                    draggable
                    onDragStart={(e) => handleDragStart(e, track)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={`bg-zinc-800 rounded px-4 py-2 border-l-4 transition-all duration-200 cursor-grab active:cursor-grabbing ${
                      getStatusBorderColor(track.status || 'draft')
                    } ${
                      draggedTrack?.id === track.id ? 'opacity-50 scale-95' : ''
                    } ${
                      dragOverIndex === idx ? 'ring-2 ring-blue-500 transform scale-[1.02]' : ''
                    }`}
                  >
                  <div className="flex items-center gap-4">
                    <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                    <span className="font-bold text-lg text-gray-300">{idx + 1}</span>
                    <div className="flex items-center gap-2 flex-1">
                      <span>{track.title}</span>
                      {recentlyReplacedTracks.has(track.id) && (
                        <Badge variant="secondary" className="bg-green-600 text-white text-xs px-2 py-1 animate-pulse">
                          File Replaced
                        </Badge>
                      )}
                    </div>
                    {/* Play Button - Always Show */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        console.log('Play button clicked for track:', track);
                        console.log('Track audio_url:', track.audio_url);
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
                    {/* Debug: Show if track has audio */}
                    <span className="text-xs text-gray-500">
                      {track.audio_url ? 'Has Audio' : 'No Audio'}
                    </span>

                    <span className="text-gray-400">{track.duration}</span>
                    <span className="text-gray-400">ISRC: {track.isrc}</span>
                    {track.audio_url && getAudioFileLabel(track.audio_url)}
                    <div className="flex items-center gap-2">
                      {track.audio_url && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          disabled={convertingTrack === track.id}
                          onClick={() => showCompressionOptions(track.id, track.audio_url)}
                        >
                          {convertingTrack === track.id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Converting...
                            </>
                          ) : (
                            "MP3 Converter"
                          )}
                        </Button>
                      )}
                      {/* Status Dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className={`capitalize flex items-center gap-2 ${getStatusColor(track.status || 'draft')}`}
                          >
                            {getStatusIcon(track.status || 'draft')}
                            {track.status || 'draft'}
                          </Button>
                        </DropdownMenuTrigger>
                                                  <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => updateTrackStatus(track.id, 'production')}>
                              Production
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateTrackStatus(track.id, 'draft')}>
                              Draft
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateTrackStatus(track.id, 'distribute')}>
                              Distribute
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateTrackStatus(track.id, 'error')}>
                              Error
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateTrackStatus(track.id, 'published')}>
                              Published
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateTrackStatus(track.id, 'other')}>
                              Other
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                      </DropdownMenu>
                      {track.audio_url && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => downloadTrack(track.id, track.audio_url, track.title)}
                          className="bg-green-600 hover:bg-green-700 text-white border-green-500"
                          title="Download audio file"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}

                      <Button size="sm" variant="outline" onClick={() => handleOpenEditTrack(track)}>Edit</Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => openMetadataDialog(track.id, 'album_track')}
                        className="bg-purple-600 hover:bg-purple-700 text-white border-purple-500"
                      >
                        <FileTextIcon className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => openNotesDialog(track.id, 'album_track', track.title)}
                        className="bg-orange-600 hover:bg-orange-700 text-white border-orange-500"
                      >
                        <StickyNote className="h-4 w-4" />
                      </Button>
                      {/* Upload Button */}
                      <input
                        type="file"
                        id={`upload-track-${track.id}`}
                        accept="audio/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length > 0) {
                            files.forEach(file => {
                              replaceTrackAudio(track.id, file);
                            });
                            e.target.value = ''; // Reset input
                          }
                        }}
                      />
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => document.getElementById(`upload-track-${track.id}`)?.click()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-500"
                        title="Upload new audio file"
                        disabled={replacingTrackId === track.id}
                      >
                        {replacingTrackId === track.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Replacing...
                          </>
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={() => handleDeleteTrack(track.id, track.title)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {track.session_id && track.session_name && (
                    <div className="mt-2 ml-20">
                      <div 
                        className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600/20 border border-blue-500/30 rounded-md cursor-pointer hover:bg-blue-600/30 transition-colors"
                        onClick={() => window.open(`/beat-maker?session=${track.session_id}`, '_blank')}
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
      <Dialog open={showAddTrack} onOpenChange={setShowAddTrack}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Track</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddTrack} className="space-y-4">
            <Input
              placeholder="Track Title"
              value={newTrack.title}
              onChange={e => setNewTrack({ ...newTrack, title: e.target.value })}
              required
            />
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
                  value={editAlbumForm.title}
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
                value={editAlbumForm.release_date}
                onChange={(e) => setEditAlbumForm(prev => ({ ...prev, release_date: e.target.value }))}
                required
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={editAlbumForm.description}
                onChange={(e) => setEditAlbumForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Distributor</label>
                <Input
                  value={editAlbumForm.distributor}
                  onChange={(e) => setEditAlbumForm(prev => ({ ...prev, distributor: e.target.value }))}
                  placeholder="e.g., DistroKid, TuneCore, CD Baby"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Distributor Notes</label>
                <Input
                  value={editAlbumForm.distributor_notes}
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
              <label className="text-sm font-medium">Cover Art</label>
              <div className="flex items-center gap-4">
                {editAlbumForm.cover_art_url && (
                  <img 
                    src={editAlbumForm.cover_art_url} 
                    alt="Cover preview" 
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                )}
                <div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverArtUpload}
                    disabled={uploadingCover}
                  />
                  {uploadingCover && <p className="text-sm text-blue-500 mt-1">Uploading...</p>}
                  {uploadError && <p className="text-sm text-red-500 mt-1">{uploadError}</p>}
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
            <div>
              <Label htmlFor="track-title">Track Title *</Label>
              <Input
                id="track-title"
                placeholder="Track Title"
                value={newTrack.title}
                onChange={e => setNewTrack({ ...newTrack, title: e.target.value })}
                required
              />
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
    </div>
  )
} 