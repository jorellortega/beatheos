"use client"

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, FileText, Trash2, FileAudio, Loader2, Link as LinkIcon, Globe, Circle, Play, Pause, Clock, Archive } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
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
  const [showCompressionDialog, setShowCompressionDialog] = useState(false);
  const [compressionFile, setCompressionFile] = useState<{ id: string; url: string } | null>(null);

  // Album editing state
  const [showEditAlbum, setShowEditAlbum] = useState(false);
  const [editAlbumForm, setEditAlbumForm] = useState({ title: '', artist: '', release_date: '', description: '', cover_art_url: '' });
  const [editAlbumSaving, setEditAlbumSaving] = useState(false);
  const [editAlbumError, setEditAlbumError] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);


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
    supabase.from('album_tracks').select(`
      *,
      beat_sessions!inner(name)
    `).eq('album_id', albumId).order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) setTrackError(error.message);
        
        // Transform data to include session_name
        const tracksWithSessionName = data?.map(track => ({
          ...track,
          session_name: track.beat_sessions?.name || null
        })) || [];
        
        setTracks(tracksWithSessionName);
        setLoadingTracks(false);
      });
  }, [albumId, showAddTrack]);

  // Helper to upload audio file
  async function uploadTrackAudio(file: File, trackId?: string): Promise<string | null> {
    if (!albumId) return null;
    setAudioUploading(true);
    setAudioUploadError(null);
    const fileExt = file.name.split('.').pop();
    const filePath = `album_tracks/${albumId}/${trackId || 'new'}_${Date.now()}.${fileExt}`;
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
    setAddingTrack(true);
    setAddTrackError(null);
    if (audioUploading) {
      setAddTrackError('Please wait for the audio upload to finish.');
      setAddingTrack(false);
      return;
    }
    const { data, error } = await supabase.from('album_tracks').insert([{ ...newTrack, album_id: albumId, audio_url: audioUrl }]).select('*').single();
    setAddingTrack(false);
    if (error) {
      setAddTrackError(error.message);
      return;
    }
    setTracks([...tracks, data]);
    setShowAddTrack(false);
    setNewTrack({ title: '', duration: '', isrc: '' });
    setAudioUrl('');
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
        cover_art_url: album.cover_art_url || ''
      });
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
    const { error } = await supabase.from('albums').update({
      ...editAlbumForm
    }).eq('id', album.id);
    setEditAlbumSaving(false);
    if (error) {
      setEditAlbumError(error.message);
      return;
    }
    setAlbum({ ...album, ...editAlbumForm });
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
      case 'draft':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      case 'active':
        return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'paused':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      case 'scheduled':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'archived':
        return 'bg-red-500/10 text-red-400 border-red-500/20'
      default:
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <Circle className="h-3 w-3" />
      case 'active':
        return <Play className="h-3 w-3" />
      case 'paused':
        return <Pause className="h-3 w-3" />
      case 'scheduled':
        return <Clock className="h-3 w-3" />
      case 'archived':
        return <Archive className="h-3 w-3" />
      default:
        return <Circle className="h-3 w-3" />
    }
  }

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
        {album.cover_art_url ? (
          <img src={album.cover_art_url} alt={album.title} className="w-48 h-48 object-cover rounded-lg" />
        ) : (
          <img src="/placeholder.jpg" alt="No cover art" className="w-48 h-48 object-cover rounded-lg" />
        )}
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h1 className="text-4xl font-bold mb-2">{album.title}</h1>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={openEditAlbumDialog}><FileText className="h-4 w-4 mr-2" />Edit</Button>
              <Link href="/platform-status">
                <Button variant="outline" size="sm"><Globe className="h-4 w-4 mr-2" />Platform Status</Button>
              </Link>
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
          </div>
          <h2 className="text-lg font-semibold mb-2">Description</h2>
          <div className="mb-6 text-gray-400">{album.description || <span className="italic">No description.</span>}</div>
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
          <Button onClick={() => setShowAddTrack(true)} variant="default">Add Track</Button>
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
                <div key={track.id} className="bg-zinc-800 rounded px-4 py-2">
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-lg text-gray-300">{idx + 1}</span>
                    <span className="flex-1">{track.title}</span>
                    <span className="text-gray-400">{track.duration}</span>
                    <span className="text-gray-400">ISRC: {track.isrc}</span>
                    {track.audio_url && (
                      <audio controls src={track.audio_url} className="h-8" />
                    )}
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
                            <>
                              <FileAudio className="h-4 w-4 mr-2" />
                              MP3 Converter
                            </>
                          )}
                        </Button>
                      )}
                      {track.session_id && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.open(`/beat-maker?session=${track.session_id}`, '_blank')}
                          className="bg-blue-600 hover:bg-blue-700 text-white border-blue-500"
                        >
                          <LinkIcon className="h-4 w-4 mr-2" />
                          Session
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => handleOpenEditTrack(track)}>Edit</Button>
                    </div>
                  </div>
                  {track.session_id && track.session_name && (
                    <div className="mt-2 ml-20">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600/20 border border-blue-500/30 rounded-md">
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
                          <div key={mp3Track.id} className="flex items-center gap-4 bg-zinc-700 rounded px-3 py-2 ml-8">
                            <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                            </div>
                            <span className="text-sm text-gray-300">{mp3Track.title}</span>
                            <span className="text-xs text-gray-500">MP3</span>
                            {mp3Track.audio_url && (
                              <audio controls src={mp3Track.audio_url} className="h-6 text-xs" />
                            )}
                            <Button size="sm" variant="outline" onClick={() => handleOpenEditTrack(mp3Track)} className="text-xs h-6 px-2">
                              Edit
                            </Button>
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
              <Button type="submit" disabled={editTrackSaving || editAudioUploading} className="bg-yellow-400 hover:bg-yellow-500 text-black">
                {editTrackSaving ? 'Saving...' : editAudioUploading ? 'Uploading audio...' : 'Save Changes'}
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
            </DialogFooter>
          </form>
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
                <label className="text-sm font-medium">Artist</label>
                <Input
                  value={editAlbumForm.artist}
                  onChange={(e) => setEditAlbumForm(prev => ({ ...prev, artist: e.target.value }))}
                  required
                />
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
    </div>
  )
} 