"use client"

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, FileText, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

interface Album {
  id: string
  title: string
  artist: string
  release_date: string
  cover_art_url: string
  description?: string
  additional_covers?: { label: string; url: string }[]
}

export default function AlbumDetailsPage() {
  const params = useParams() || {}
  const albumId = params && 'albumId' in params ? (Array.isArray(params.albumId) ? params.albumId[0] : params.albumId) : ''
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
    supabase.from('album_tracks').select('*').eq('album_id', albumId).order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) setTrackError(error.message);
        setTracks(data || []);
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
              <Button variant="outline" size="sm"><FileText className="h-4 w-4 mr-2" />Edit</Button>
              <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4 mr-2" />Delete</Button>
            </div>
          </div>
          <p className="text-xl text-gray-400 mb-2">{album.artist}</p>
          <div className="flex items-center gap-2 text-gray-400 mb-4">
            <Calendar className="h-5 w-5" />
            Released: {album.release_date ? new Date(album.release_date).toLocaleDateString() : 'N/A'}
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
            {tracks.map((track, idx) => (
              <div key={track.id} className="flex items-center gap-4 bg-zinc-800 rounded px-4 py-2">
                <span className="font-bold text-lg text-gray-300">{idx + 1}</span>
                <span className="flex-1">{track.title}</span>
                <span className="text-gray-400">{track.duration}</span>
                <span className="text-gray-400">ISRC: {track.isrc}</span>
                {track.audio_url && (
                  <audio controls src={track.audio_url} className="h-8" />
                )}
                <Button size="sm" variant="outline" onClick={() => handleOpenEditTrack(track)}>Edit</Button>
              </div>
            ))}
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
    </div>
  )
} 