"use client"

import { useState, useEffect, useRef } from 'react'
import { Plus, Music, Upload, Calendar, Globe, FileText, CheckCircle2, XCircle, AlertCircle, ExternalLink, Info, FileMusic, FileArchive, FileAudio, File, Music2, Piano, Drum, Trash2, Save, Pencil } from 'lucide-react'
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
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

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
    // Audio Library
    setLoadingAudio(true);
    supabase.from('audio_library_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setAudioError(error.message);
        setAudioItems(data || []);
        setLoadingAudio(false);
      });
  }, [user?.id]);

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

  const [selectedTab, setSelectedTab] = useState('albums');
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [newAudio, setNewAudio] = useState({ name: '', type: '', description: '', file_url: '' });
  const [audioUploading, setAudioUploading] = useState(false);
  const [audioUploadError, setAudioUploadError] = useState<string | null>(null);

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
    const { error } = await supabase.from('audio_library_items').insert([
      { ...newAudio, user_id: user.id }
    ]);
    if (error) {
      setAudioUploadError(error.message);
      return;
    }
    setShowAudioModal(false);
    setNewAudio({ name: '', type: '', description: '', file_url: '' });
  }

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
          <Button className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-6 py-2 rounded" onClick={() => setShowAudioModal(true)}>
            <Plus className="h-4 w-4" />
            Add Audio
          </Button>
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
            <Textarea
              placeholder="Description"
              value={newAudio.description}
              onChange={e => setNewAudio({ ...newAudio, description: e.target.value })}
            />
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
              <audio controls src={newAudio.file_url} className="h-8 mt-2" />
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
          {loadingAudio ? <div>Loading audio files...</div> : audioError ? <div className="text-red-500">{audioError}</div> : audioItems.length === 0 ? <div>No audio files found.</div> : audioItems.map(item => (
              <Card key={item.id} className="p-6 flex items-center gap-6">
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
                  <span className="text-xs text-gray-500 capitalize">{item.type}</span>
                  {item.file_url && (
                    <audio controls src={item.file_url} className="h-8 mt-2" />
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                  <a href={item.file_url} download>Download</a>
                  </Button>
                <Button variant="destructive" size="sm" onClick={() => {/* handleDeleteAudio(item.id) */}}><Trash2 className="h-4 w-4 mr-2" />Delete</Button>
                </div>
              </Card>
            ))}
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
    </div>
  )
} 