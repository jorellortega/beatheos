"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Calendar, FileText, Trash2, FileAudio, Play, Pause, Clock, Archive, Edit, Plus, Globe, Link as LinkIcon, Download, Upload, Music, Folder, CheckCircle2, ExternalLink, Circle, Loader2, StickyNote, FileText as FileTextIcon } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

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
  label_artist_id?: string
}

interface LabelArtist {
  id: string
  name: string
  stage_name?: string
  image_url?: string
}

export default function SingleDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [single, setSingle] = useState<Single | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [playingSingleId, setPlayingSingleId] = useState<string | null>(null)
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null)
  const [convertingSingle, setConvertingSingle] = useState<string | null>(null)
  const [replacingSingleId, setReplacingSingleId] = useState<string | null>(null)
  const [showCompressionDialog, setShowCompressionDialog] = useState(false)
  const [compressionFile, setCompressionFile] = useState<{ id: string; url: string; type: 'single' | 'album_track' } | null>(null)
  const [showMetadataDialog, setShowMetadataDialog] = useState(false)
  const [editingMetadata, setEditingMetadata] = useState<any>(null)
  const [showNotesDialog, setShowNotesDialog] = useState(false)
  const [editingNotes, setEditingNotes] = useState('')
  const [editingNotesTitle, setEditingNotesTitle] = useState('')

  const [editForm, setEditForm] = useState({
    title: '',
    artist: '',
    description: '',
    release_date: '',
    audio_url: '',
    duration: ''
  })

  // Label artists state (for publishing to artist pages)
  const [labelArtists, setLabelArtists] = useState<LabelArtist[]>([]);
  const [loadingLabelArtists, setLoadingLabelArtists] = useState(false);
  const [selectedLabelArtistId, setSelectedLabelArtistId] = useState<string>('');

  const singleId = params.id as string

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
    if (user && singleId) {
      fetchSingle()
    }
  }, [user, singleId])

  async function fetchSingle() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('singles')
        .select('*')
        .eq('id', singleId)
        .eq('user_id', user?.id)
        .single()

      if (error) throw error
      setSingle(data)
      // Set selected label artist if single is already published
      if (data.label_artist_id) {
        setSelectedLabelArtistId(data.label_artist_id)
      }
    } catch (error) {
      console.error('Error fetching single:', error)
      setError('Single not found')
    } finally {
      setLoading(false)
    }
  }

  const playSingle = (singleId: string, audioUrl: string) => {
    if (playingSingleId === singleId) {
      // Stop playing
      if (audioRef) {
        audioRef.pause()
        audioRef.currentTime = 0
      }
      setPlayingSingleId(null)
      setAudioRef(null)
    } else {
      // Start playing
      if (audioRef) {
        audioRef.pause()
      }
      const audio = new Audio(audioUrl)
      audio.play()
      setAudioRef(audio)
      setPlayingSingleId(singleId)
      
      audio.onended = () => {
        setPlayingSingleId(null)
        setAudioRef(null)
      }
    }
  }

  const stopSingle = () => {
    if (audioRef) {
      audioRef.pause()
      audioRef.currentTime = 0
    }
    setPlayingSingleId(null)
    setAudioRef(null)
  }

  const openEditDialog = (single: Single) => {
    setEditForm({
      title: single.title,
      artist: single.artist,
      description: single.description || '',
      release_date: single.release_date,
      audio_url: single.audio_url || '',
      duration: single.duration || ''
    })
    // Set selected label artist if single is already published
    setSelectedLabelArtistId(single.label_artist_id || '')
    setShowEditDialog(true)
  }

  const handleUpdateSingle = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Convert empty string to null for label_artist_id
      const labelArtistId = selectedLabelArtistId && selectedLabelArtistId.trim() !== '' ? selectedLabelArtistId : null;
      
      console.log('🔍 [SINGLE EDIT] Saving single:', {
        singleId,
        selectedLabelArtistId,
        labelArtistId,
        willSave: labelArtistId
      });
      
      const { error } = await supabase
        .from('singles')
        .update({
          title: editForm.title,
          artist: editForm.artist,
          description: editForm.description,
          release_date: editForm.release_date,
          audio_url: editForm.audio_url,
          duration: editForm.duration,
          label_artist_id: labelArtistId
        })
        .eq('id', singleId)

      if (error) throw error

      // Show success message with publish status
      if (selectedLabelArtistId) {
        const selectedArtist = labelArtists.find(a => a.id === selectedLabelArtistId);
        toast({
          title: "Success",
          description: `Single updated and published to ${selectedArtist?.stage_name || selectedArtist?.name || 'artist'}'s page`,
        });
      } else if (single?.label_artist_id) {
        toast({
          title: "Success",
          description: "Single updated and unpublished from artist page",
        });
      } else {
        toast({
          title: "Success",
          description: "Single updated successfully",
        });
      }

      setShowEditDialog(false)
      fetchSingle()
    } catch (error) {
      console.error('Error updating single:', error)
      toast({
        title: "Error",
        description: "Failed to update single",
        variant: "destructive"
      })
    }
  }

  const handleDeleteSingle = async (singleId: string) => {
    if (!confirm('Are you sure you want to delete this single?')) return

    try {
      const { error } = await supabase
        .from('singles')
        .delete()
        .eq('id', singleId)

      if (error) throw error

      toast({
        title: "Success",
        description: "Single deleted successfully",
      })

      router.push('/mylibrary')
    } catch (error) {
      console.error('Error deleting single:', error)
      toast({
        title: "Error",
        description: "Failed to delete single",
        variant: "destructive"
      })
    }
  }

  const updateSingleStatus = async (singleId: string, newStatus: 'production' | 'draft' | 'distribute' | 'error' | 'published' | 'other') => {
    try {
      const { error } = await supabase
        .from('singles')
        .update({ status: newStatus })
        .eq('id', singleId)

      if (error) throw error

      setSingle(prev => prev ? { ...prev, status: newStatus } : null)

      toast({
        title: "Success",
        description: `Single status updated to ${newStatus}`
      })
    } catch (error) {
      console.error('Error updating single status:', error)
      toast({
        title: "Error",
        description: "Failed to update single status",
        variant: "destructive"
      })
    }
  }

  const updateSingleProductionStatus = async (singleId: string, newStatus: 'marketing' | 'organization' | 'production' | 'quality_control' | 'ready_for_distribution') => {
    try {
      const { error } = await supabase
        .from('singles')
        .update({ production_status: newStatus })
        .eq('id', singleId)

      if (error) throw error

      setSingle(prev => prev ? { ...prev, production_status: newStatus } : null)

      toast({
        title: "Success",
        description: `Single production status updated to ${newStatus}`
      })
    } catch (error) {
      console.error('Error updating single production status:', error)
      toast({
        title: "Error",
        description: "Failed to update single production status",
        variant: "destructive"
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'production':
        return 'bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-500'
      case 'draft':
        return 'bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-500'
      case 'distribute':
        return 'bg-blue-600 hover:bg-blue-700 text-white border-blue-500'
      case 'error':
        return 'bg-red-600 hover:bg-red-700 text-white border-red-500'
      case 'published':
        return 'bg-green-600 hover:bg-green-700 text-white border-green-500'
      case 'other':
        return 'bg-purple-600 hover:bg-purple-700 text-white border-purple-500'
      default:
        return 'bg-gray-600 hover:bg-gray-700 text-white border-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'production':
        return <Music className="h-4 w-4" />
      case 'draft':
        return <FileText className="h-4 w-4" />
      case 'distribute':
        return <ExternalLink className="h-4 w-4" />
      case 'error':
        return <Trash2 className="h-4 w-4" />
      case 'published':
        return <CheckCircle2 className="h-4 w-4" />
      case 'other':
        return <Circle className="h-4 w-4" />
      default:
        return <Circle className="h-4 w-4" />
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
      setSingle(prev => prev ? { ...prev, audio_url: audioUrl } : null);

      toast({
        title: "Success",
        description: "Audio file replaced successfully.",
      });
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
      
      // Refresh single data
      await fetchSingle()
      
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

  // Show compression options dialog
  const showCompressionOptions = (fileId: string, fileUrl: string, type: 'single' | 'album_track') => {
    setCompressionFile({ id: fileId, url: fileUrl, type })
    setShowCompressionDialog(true)
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
      const { error } = await supabase
        .from('singles')
        .update(metadata)
        .eq('id', singleId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Metadata saved successfully.",
      });

      // Refresh the data
      await fetchSingle();
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
      const { error } = await supabase
        .from('singles')
        .update({ notes })
        .eq('id', singleId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Notes saved successfully.",
      });

      // Refresh the data
      await fetchSingle();
    } catch (error) {
      console.error('Error saving notes:', error);
      toast({
        title: "Error",
        description: "Failed to save notes.",
        variant: "destructive"
      });
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

  if (loading) {
    return <div className="container mx-auto py-8">Loading...</div>
  }
  if (error || !single) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">Single Not Found</h1>
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
            {single.cover_art_url ? (
              <img 
                src={single.cover_art_url} 
                alt={single.title} 
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
          {single.audio_url && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => downloadSingle(single.id, single.audio_url!, single.title)}
              className="bg-blue-600 hover:bg-blue-700 text-white border-blue-500 w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Single
            </Button>
          )}
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h1 className="text-4xl font-bold mb-2">{single.title}</h1>
            <div className="flex gap-2 flex-wrap">
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
              
              {/* Download Button */}
              {single.audio_url && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => downloadSingle(single.id, single.audio_url!, single.title)}
                  className="bg-blue-600 hover:bg-blue-700 text-white border-blue-500"
                  title="Download audio file"
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
              
              <Button variant="outline" size="sm" onClick={() => openEditDialog(single)}><FileText className="h-4 w-4 mr-2" />Edit</Button>
              
              <Link href={`/release-platforms/${single.id}`}>
                <Button variant="outline" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white border-blue-500">
                  <Globe className="h-4 w-4 mr-2" />
                  Platforms
                </Button>
              </Link>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => openMetadataDialog(single.id, 'single')}
                className="bg-purple-600 hover:bg-purple-700 text-white border-purple-500"
              >
                <FileTextIcon className="h-4 w-4" />
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => openNotesDialog(single.id, 'single', single.title)}
                className="bg-orange-600 hover:bg-orange-700 text-white border-orange-500"
              >
                <StickyNote className="h-4 w-4" />
              </Button>
              
              {/* Upload Button */}
              <input
                type="file"
                id={`upload-single-${single.id}`}
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    replaceSingleAudio(single.id, file);
                  }
                }}
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => document.getElementById(`upload-single-${single.id}`)?.click()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-500"
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
              
              {/* MP3 Conversion Button */}
              {single.audio_url && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={convertingSingle === single.id}
                  onClick={() => showCompressionOptions(single.id, single.audio_url!, 'single')}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-500"
                >
                  {convertingSingle === single.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Converting...
                    </>
                  ) : (
                    <>
                      <FileAudio className="h-4 w-4 mr-2" />
                      Convert to MP3
                    </>
                  )}
                </Button>
              )}
              
              <Button variant="destructive" size="sm" onClick={() => handleDeleteSingle(single.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</Button>
            </div>
          </div>
          <p className="text-xl text-gray-400 mb-2">{single.artist}</p>
          <div className="flex items-center gap-4 text-gray-400 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Released: {single.release_date ? new Date(single.release_date).toLocaleDateString() : 'N/A'}
            </div>
            <div className="flex items-center gap-2">
              <span>Status:</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={`capitalize flex items-center gap-2 ${getStatusColor(single.status || 'draft')}`}
                  >
                    {getStatusIcon(single.status || 'draft')}
                    {single.status || 'draft'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => updateSingleStatus(single.id, 'production')}>
                    Production
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateSingleStatus(single.id, 'draft')}>
                    Draft
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateSingleStatus(single.id, 'distribute')}>
                    Distribute
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateSingleStatus(single.id, 'error')}>
                    Error
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateSingleStatus(single.id, 'published')}>
                    Published
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateSingleStatus(single.id, 'other')}>
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
                    className={`capitalize flex items-center gap-2 ${getProductionStatusColor(single.production_status || 'production')}`}
                  >
                    {getProductionStatusIcon(single.production_status || 'production')}
                    {single.production_status || 'production'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => updateSingleProductionStatus(single.id, 'marketing')}>
                    Marketing
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateSingleProductionStatus(single.id, 'organization')}>
                    Organization
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateSingleProductionStatus(single.id, 'production')}>
                    Production
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateSingleProductionStatus(single.id, 'quality_control')}>
                    Quality Control
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateSingleProductionStatus(single.id, 'ready_for_distribution')}>
                    Ready for Distribution
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <h2 className="text-lg font-semibold mb-2">Description</h2>
          <div className="mb-6 text-gray-400">{single.description || <span className="italic">No description.</span>}</div>
          
          {/* Audio Info */}
          {single.audio_url && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Audio</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <FileAudio className="h-5 w-5 text-blue-400" />
                  <span className="text-gray-300">Audio file available</span>
                  {getAudioFileLabel(single.audio_url)}
                </div>
                {single.duration && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-400">{single.duration}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Session Link */}
          {single.session_id && single.session_name && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Session</h3>
              <div 
                className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600/20 border border-blue-500/30 rounded-md"
              >
                <LinkIcon className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-300">
                  {single.session_name}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Edit Single</DialogTitle>
            <DialogDescription>
              Update the single information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateSingle} className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                required
                className="bg-[#2a2a2a] border-gray-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="artist">Artist</Label>
              <Input
                id="artist"
                value={editForm.artist}
                onChange={(e) => setEditForm(prev => ({ ...prev, artist: e.target.value }))}
                required
                className="bg-[#2a2a2a] border-gray-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="release_date">Release Date</Label>
              <Input
                id="release_date"
                type="date"
                value={editForm.release_date}
                onChange={(e) => setEditForm(prev => ({ ...prev, release_date: e.target.value }))}
                className="bg-[#2a2a2a] border-gray-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                className="bg-[#2a2a2a] border-gray-600 text-white"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="duration">Duration</Label>
              <Input
                id="duration"
                value={editForm.duration}
                onChange={(e) => setEditForm(prev => ({ ...prev, duration: e.target.value }))}
                placeholder="e.g., 3:45"
                className="bg-[#2a2a2a] border-gray-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="label_artist">Publish to Artist Page</Label>
              <Select
                value={selectedLabelArtistId || "none"}
                onValueChange={(value) => {
                  console.log('🔍 [SINGLE SELECT] Value changed:', value);
                  const newValue = value === "none" ? "" : value;
                  console.log('🔍 [SINGLE SELECT] Setting selectedLabelArtistId to:', newValue);
                  setSelectedLabelArtistId(newValue);
                }}
                disabled={loadingLabelArtists}
              >
                <SelectTrigger className="bg-[#2a2a2a] border-gray-600 text-white">
                  <SelectValue placeholder={loadingLabelArtists ? "Loading artists..." : "Select an artist to publish this single"} />
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
                  ? "This single will appear on the selected artist's page" 
                  : "Select an artist to publish this single to their artist page"}
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Compression Options Dialog */}
      <Dialog open={showCompressionDialog} onOpenChange={setShowCompressionDialog}>
        <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Convert to MP3</DialogTitle>
            <DialogDescription>
              Choose compression level for MP3 conversion
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => {
                  if (compressionFile) {
                    convertSingleToMp3(compressionFile.id, compressionFile.url, 'ultra_high');
                  }
                  setShowCompressionDialog(false);
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Ultra High (320kbps)
              </Button>
              <Button
                onClick={() => {
                  if (compressionFile) {
                    convertSingleToMp3(compressionFile.id, compressionFile.url, 'high');
                  }
                  setShowCompressionDialog(false);
                }}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                High (256kbps)
              </Button>
              <Button
                onClick={() => {
                  if (compressionFile) {
                    convertSingleToMp3(compressionFile.id, compressionFile.url, 'medium');
                  }
                  setShowCompressionDialog(false);
                }}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                Medium (192kbps)
              </Button>
              <Button
                onClick={() => {
                  if (compressionFile) {
                    convertSingleToMp3(compressionFile.id, compressionFile.url, 'low');
                  }
                  setShowCompressionDialog(false);
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Low (128kbps)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Metadata Dialog */}
      <Dialog open={showMetadataDialog} onOpenChange={setShowMetadataDialog}>
        <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Metadata</DialogTitle>
            <DialogDescription>
              Update distribution metadata for this single
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="distributor">Distributor</Label>
                <Input
                  id="distributor"
                  value={editingMetadata?.distributor || ''}
                  onChange={(e) => setEditingMetadata(prev => ({ ...prev, distributor: e.target.value }))}
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="deadline">Deadline to Distribute</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={editingMetadata?.deadline_to_distribute || ''}
                  onChange={(e) => setEditingMetadata(prev => ({ ...prev, deadline_to_distribute: e.target.value }))}
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="performing_artists">Performing Artists</Label>
                <Input
                  id="performing_artists"
                  value={editingMetadata?.performing_artists || ''}
                  onChange={(e) => setEditingMetadata(prev => ({ ...prev, performing_artists: e.target.value }))}
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="producers">Producers</Label>
                <Input
                  id="producers"
                  value={editingMetadata?.producers || ''}
                  onChange={(e) => setEditingMetadata(prev => ({ ...prev, producers: e.target.value }))}
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="engineers">Engineers</Label>
                <Input
                  id="engineers"
                  value={editingMetadata?.engineers || ''}
                  onChange={(e) => setEditingMetadata(prev => ({ ...prev, engineers: e.target.value }))}
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="songwriter">Songwriter</Label>
                <Input
                  id="songwriter"
                  value={editingMetadata?.songwriter || ''}
                  onChange={(e) => setEditingMetadata(prev => ({ ...prev, songwriter: e.target.value }))}
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="label">Label</Label>
                <Input
                  id="label"
                  value={editingMetadata?.label || ''}
                  onChange={(e) => setEditingMetadata(prev => ({ ...prev, label: e.target.value }))}
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="upc">UPC</Label>
                <Input
                  id="upc"
                  value={editingMetadata?.upc || ''}
                  onChange={(e) => setEditingMetadata(prev => ({ ...prev, upc: e.target.value }))}
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="isrc">ISRC</Label>
                <Input
                  id="isrc"
                  value={editingMetadata?.isrc || ''}
                  onChange={(e) => setEditingMetadata(prev => ({ ...prev, isrc: e.target.value }))}
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="primary_genre">Primary Genre</Label>
                <Input
                  id="primary_genre"
                  value={editingMetadata?.primary_genre || ''}
                  onChange={(e) => setEditingMetadata(prev => ({ ...prev, primary_genre: e.target.value }))}
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="copyright_info">Copyright Info</Label>
              <Textarea
                id="copyright_info"
                value={editingMetadata?.copyright_info || ''}
                onChange={(e) => setEditingMetadata(prev => ({ ...prev, copyright_info: e.target.value }))}
                className="bg-[#2a2a2a] border-gray-600 text-white"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="recording_location">Recording Location</Label>
              <Input
                id="recording_location"
                value={editingMetadata?.recording_location || ''}
                onChange={(e) => setEditingMetadata(prev => ({ ...prev, recording_location: e.target.value }))}
                className="bg-[#2a2a2a] border-gray-600 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mix_engineer">Mix Engineer</Label>
                <Input
                  id="mix_engineer"
                  value={editingMetadata?.mix_engineer || ''}
                  onChange={(e) => setEditingMetadata(prev => ({ ...prev, mix_engineer: e.target.value }))}
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="mastering_engineer">Mastering Engineer</Label>
                <Input
                  id="mastering_engineer"
                  value={editingMetadata?.mastering_engineer || ''}
                  onChange={(e) => setEditingMetadata(prev => ({ ...prev, mastering_engineer: e.target.value }))}
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="publishing_rights">Publishing Rights</Label>
                <Input
                  id="publishing_rights"
                  value={editingMetadata?.publishing_rights || ''}
                  onChange={(e) => setEditingMetadata(prev => ({ ...prev, publishing_rights: e.target.value }))}
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="mechanical_rights">Mechanical Rights</Label>
                <Input
                  id="mechanical_rights"
                  value={editingMetadata?.mechanical_rights || ''}
                  onChange={(e) => setEditingMetadata(prev => ({ ...prev, mechanical_rights: e.target.value }))}
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="territory">Territory</Label>
              <Input
                id="territory"
                value={editingMetadata?.territory || ''}
                onChange={(e) => setEditingMetadata(prev => ({ ...prev, territory: e.target.value }))}
                className="bg-[#2a2a2a] border-gray-600 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="explicit_content"
                  checked={editingMetadata?.explicit_content || false}
                  onChange={(e) => setEditingMetadata(prev => ({ ...prev, explicit_content: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="explicit_content" className="text-sm font-medium">
                  Explicit Content
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="parental_advisory"
                  checked={editingMetadata?.parental_advisory || false}
                  onChange={(e) => setEditingMetadata(prev => ({ ...prev, parental_advisory: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="parental_advisory" className="text-sm font-medium">
                  Parental Advisory
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowMetadataDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              saveMetadata(editingMetadata);
              setShowMetadataDialog(false);
            }}>
              Save Metadata
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Notes for {editingNotesTitle}</DialogTitle>
            <DialogDescription>
              Add or edit notes for this single
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={editingNotes}
                onChange={(e) => setEditingNotes(e.target.value)}
                className="bg-[#2a2a2a] border-gray-600 text-white"
                rows={6}
                placeholder="Add your notes here..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowNotesDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              saveNotes(editingNotes);
              setShowNotesDialog(false);
            }}>
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 