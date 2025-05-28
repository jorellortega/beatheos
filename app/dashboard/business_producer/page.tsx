"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Plus, Edit, Trash2, BarChart2, Package, Activity, Users, Upload, HelpCircle, Star, Percent, Mic, Play, Wand2, Music2, Layers, Shuffle, User, Pause, ExternalLink, ShoppingCart, Receipt, FileText } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from '@/lib/supabaseClient'
import { Suspense } from "react"
import Image from "next/image"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Mock marketplace items
const mockItems = [
  { id: 1, title: "Trap Essentials Vol. 1", type: "soundkit", price: 24.99, sales: 128, rating: 4.8, promo: false },
  { id: 2, title: "Lo-Fi Melodies", type: "loops", price: 19.99, sales: 75, rating: 4.5, promo: true },
  { id: 3, title: "808 Collection Pro", type: "soundkit", price: 34.99, sales: 210, rating: 4.9, promo: false },
]

interface Beat {
  id: string | number;
  slug: string;
  title: string;
  genre: string;
  bpm: number;
  key: string;
  is_draft: boolean;
  play_count: number;
  mp3_url: string;
  mp3_path: string;
  cover_art_url?: string;
  signed_mp3_url?: string;
  wav_url?: string;
  stems_url?: string;
  producer: {
    display_name: string;
  };
  tags?: string[];
  price_lease?: number;
  price_premium_lease?: number;
  price_exclusive?: number;
  price_buyout?: number;
  producer_ids?: string[];
  license_id?: string | null;
}

interface License {
  id: string;
  name: string;
}

interface BeatActionsProps {
  beat: Beat;
  onEdit: (beat: Beat) => void;
  onDelete: (id: string | number) => void;
  setAudioRef?: (el: HTMLAudioElement | null) => void;
}

function BeatActions({ beat, onEdit, onDelete, isPlaying, onPlayPause, setAudioRef }: BeatActionsProps & { isPlaying: boolean; onPlayPause: (id: string | number) => void }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPlayPause(beat.id);
  };

  return (
    <div className="flex items-center space-x-2">
      <audio
        ref={el => {
          audioRef.current = el;
          setAudioRef && setAudioRef(el);
        }}
        src={beat.signed_mp3_url || beat.mp3_url}
        style={{ display: 'none' }}
        preload="none"
      />
      <button
        className={`rounded-full p-2 ${isPlaying ? 'bg-primary text-white' : 'bg-secondary text-primary'} transition-colors`}
        onClick={handlePlayPause}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        type="button"
      >
        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
      </button>
      <Button size="sm" variant="outline" onClick={() => onEdit(beat)}>
        Edit
      </Button>
      <Button size="sm" variant="destructive" onClick={() => onDelete(beat.id)}>
        Delete
      </Button>
    </div>
  );
}

function MyBeatsManager({ userId }: { userId: string }) {
  const [beats, setBeats] = useState<Beat[]>([])
  const [licenses, setLicenses] = useState<License[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | number | null>(null)
  const [editForm, setEditForm] = useState<{
    title?: string;
    genre?: string;
    bpm?: number;
    key?: string;
    is_draft?: boolean;
  }>({})
  const [playingId, setPlayingId] = useState<string | number | null>(null);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [editColumn, setEditColumn] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [showEditInput, setShowEditInput] = useState(false);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({});
  const { toast } = useToast();
  const [expandedTagsId, setExpandedTagsId] = useState<string | number | null>(null);
  const [expandedPricesId, setExpandedPricesId] = useState<string | number | null>(null);
  const [expandAllTags, setExpandAllTags] = useState(false);
  const [expandAllPrices, setExpandAllPrices] = useState(false);
  const [expandAllPricesType, setExpandAllPricesType] = useState<null | 'lease' | 'premium' | 'exclusive' | 'buyout' | 'all'>(null);
  const [showPricesMenu, setShowPricesMenu] = useState(false);
  const [showFilesMenu, setShowFilesMenu] = useState(false);
  const [expandAllFilesType, setExpandAllFilesType] = useState<null | 'mp3' | 'wav' | 'stems' | 'all'>(null);
  const [collabSearch, setCollabSearch] = useState<{ [beatId: string]: string }>({});
  const [collabResults, setCollabResults] = useState<{ [beatId: string]: any[] }>({});
  const [collabLoading, setCollabLoading] = useState<{ [beatId: string]: boolean }>({});
  const [collabError, setCollabError] = useState<{ [beatId: string]: string | null }>({});

  useEffect(() => {
    async function fetchBeats() {
      try {
      setLoading(true)
        setError(null)

        // Fetch beats for this user (producer_id === userId)
        const { data: beatsData, error: beatsError } = await supabase
          .from('beats')
          .select(`
            id,
            slug,
            title,
            genre,
            bpm,
            key,
            is_draft,
            play_count,
            mp3_url,
            mp3_path,
            cover_art_url,
            tags,
            price_lease,
            price_premium_lease,
            price_exclusive,
            price_buyout
          `)
          .eq('producer_id', userId)
          .order('created_at', { ascending: false });

        // Fetch the producer's display_name
        const { data: producer, error: producerError } = await supabase
          .from('producers')
          .select('display_name')
          .eq('user_id', userId)
          .single();

        if (beatsError) {
          setError('Failed to fetch beats: ' + beatsError.message);
          setBeats([]);
          setLoading(false);
          return;
        }

        // Attach display_name to each beat
        const beatsWithProducer = (beatsData || []).map(beat => ({
          ...beat,
          producer: { display_name: producer?.display_name || 'Unknown' }
        }));

        setBeats(beatsWithProducer);
      } catch (err) {
        setError('Failed to load beats. Please try again.');
        setBeats([]);
      } finally {
        setLoading(false);
      }
    }

    async function fetchLicenses() {
      const { data } = await supabase.from('licenses').select('id, name').order('name')
      setLicenses(data || [])
    }

    fetchBeats()
    fetchLicenses()
  }, [userId]);

  const handleDelete = async (id: string | number) => {
    const res = await fetch(`/api/beats?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setBeats(beats.filter((b: Beat) => b.id !== id))
    } else {
      alert('Failed to delete beat.')
    }
  }

  const handleEdit = (beat: Beat) => {
    setEditingId(beat.id)
    setEditForm({
      title: beat.title,
      genre: beat.genre,
      bpm: beat.bpm,
      key: beat.key,
      is_draft: beat.is_draft
    })
  }

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setEditForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleEditSave = async (id: string | number) => {
    const res = await fetch(`/api/beats?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm)
    })
    if (res.ok) {
      const updated: Beat = await res.json()
      setBeats(beats.map((b: Beat) => b.id === id ? { ...b, ...updated } : b))
      setEditingId(null)
    } else {
      alert('Failed to update beat.')
    }
  }

  const handlePlayPause = (id: string | number) => {
    if (playingId === id) {
      const audio = audioRefs.current[id];
      if (audio) audio.pause();
      setPlayingId(null);
    } else {
      if (playingId && audioRefs.current[playingId]) {
        audioRefs.current[playingId]?.pause();
        audioRefs.current[playingId]?.currentTime && (audioRefs.current[playingId]!.currentTime = 0);
      }
      const audio = audioRefs.current[id];
      if (audio) {
        audio.play();
        setPlayingId(id);
      }
    }
  };

  const setAudioRef = (id: string | number, el: HTMLAudioElement | null) => {
    audioRefs.current[id] = el;
  };

  // Handle file upload for MP3, WAV, Stems
  const handleFileUpload = async (beat: Beat, fileType: 'mp3' | 'wav' | 'stems') => {
    const input = document.createElement('input');
    input.type = 'file';
    if (fileType === 'mp3') input.accept = 'audio/mpeg';
    if (fileType === 'wav') input.accept = 'audio/wav';
    if (fileType === 'stems') input.accept = '.zip,application/zip';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        let storagePath = `profiles/${userId}/${beat.title.trim()}/${fileType}/${file.name.trim()}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('beats')
          .upload(storagePath, file, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from('beats')
          .getPublicUrl(storagePath);
        // Update the beat in the database
        const updateField = fileType === 'mp3' ? { mp3_url: publicUrl } : fileType === 'wav' ? { wav_url: publicUrl } : { stems_url: publicUrl };
        const { error: updateError } = await supabase
          .from('beats')
          .update(updateField)
          .eq('id', beat.id);
        if (updateError) throw updateError;
        // Update local state
        setBeats(beats.map(b => b.id === beat.id ? { ...b, ...updateField } : b));
        toast({
          title: `${fileType.toUpperCase()} File Updated`,
          description: `The beat's ${fileType.toUpperCase()} file has been updated successfully.`,
        });
      } catch (error) {
        console.error('Error uploading file:', error);
        toast({
          title: 'Error',
          description: `Failed to update ${fileType.toUpperCase()} file. Please try again.`,
          variant: 'destructive',
        });
      }
    };
    input.click();
  };

  // Helper to fetch producer by email (search users table, then join with producers)
  const handleCollabSearch = async (beatId: string, email: string) => {
    setCollabLoading(prev => ({ ...prev, [beatId]: true }));
    setCollabError(prev => ({ ...prev, [beatId]: null }));
    // 1. Search users by email
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .ilike('email', `%${email}%`);
    if (userError) {
      setCollabError(prev => ({ ...prev, [beatId]: userError.message }));
      setCollabResults(prev => ({ ...prev, [beatId]: [] }));
      setCollabLoading(prev => ({ ...prev, [beatId]: false }));
      return;
    }
    if (!users || users.length === 0) {
      setCollabResults(prev => ({ ...prev, [beatId]: [] }));
      setCollabLoading(prev => ({ ...prev, [beatId]: false }));
      return;
    }
    const userIds = users.map(u => u.id);
    // 2. Fetch producers for those user_ids
    const { data: producers, error: producerError } = await supabase
      .from('producers')
      .select('user_id, display_name')
      .in('user_id', userIds);
    if (producerError) {
      setCollabError(prev => ({ ...prev, [beatId]: producerError.message }));
      setCollabResults(prev => ({ ...prev, [beatId]: [] }));
      setCollabLoading(prev => ({ ...prev, [beatId]: false }));
      return;
    }
    // 3. Combine results for display
    const results = (producers || []).map(p => {
      const user = users.find(u => u.id === p.user_id);
      return {
        user_id: p.user_id,
        display_name: p.display_name,
        email: user?.email || '',
      };
    });
    setCollabResults(prev => ({ ...prev, [beatId]: results }));
    setCollabLoading(prev => ({ ...prev, [beatId]: false }));
  };

  // Helper to add producer to beat
  const handleAddProducer = async (beat: any, producerId: string) => {
    const currentIds = Array.isArray(beat.producer_ids) ? beat.producer_ids : [];
    if (currentIds.includes(producerId)) return;
    const newIds = [...currentIds, producerId];
    const { error } = await supabase
      .from('beats')
      .update({ producer_ids: newIds })
      .eq('id', beat.id);
    if (!error) {
      setBeats(beats => beats.map(b => b.id === beat.id ? { ...b, producer_ids: newIds } : b));
      toast({ title: 'Collaborator Added', description: 'Producer added to this beat.' });
    } else {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Add this function to handle license change
  const handleLicenseChange = async (beatId: string | number, licenseId: string) => {
    const newLicenseId = licenseId === 'none' ? null : licenseId;
    const { error } = await supabase.from('beats').update({ license_id: newLicenseId }).eq('id', beatId)
    if (!error) {
      setBeats(beats => beats.map(b => b.id === beatId ? { ...b, license_id: newLicenseId } : b))
      toast({ title: 'License Updated', description: 'Beat license updated.' })
    } else {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-500">{error}</div>
      </div>
    )
  }

  if (!beats.length) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-400">No beats uploaded yet.</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center mb-4">
        <h2 className="text-2xl font-bold mr-4">My Uploaded Beats</h2>
        {selectedIds.length > 0 && (
          <div className="flex gap-2 items-center">
            <Button size="sm" variant="destructive" onClick={() => {
              if (!confirm('Delete selected beats?')) return;
              selectedIds.forEach(id => handleDelete(id));
              setSelectedIds([]);
            }}>Delete Selected</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">Edit</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {['title', 'genre', 'tags', 'price_lease', 'price_premium_lease', 'price_exclusive', 'price_buyout'].map(col => (
                  <DropdownMenuItem key={col} onClick={() => { setEditColumn(col); setShowEditInput(true); }}>
                    Edit {col === 'price_lease' ? 'Lease Price' :
                          col === 'price_premium_lease' ? 'Premium Lease Price' :
                          col === 'price_exclusive' ? 'Exclusive Price' :
                          col === 'price_buyout' ? 'Buy Out Price' :
                          col.charAt(0).toUpperCase() + col.slice(1)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Bulk License Assignment Dropdown */}
            <Select
              value=""
              onValueChange={async (val) => {
                const newLicenseId = val === 'none' ? null : val;
                // Update all selected beats in DB
                await Promise.all(selectedIds.map(async (id) => {
                  await supabase.from('beats').update({ license_id: newLicenseId }).eq('id', id);
                }));
                // Update UI
                setBeats(beats => beats.map(b => selectedIds.includes(b.id) ? { ...b, license_id: newLicenseId } : b));
                toast({ title: 'Bulk License Updated', description: 'Selected beats updated.' });
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Assign License to Selected" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {licenses.map(license => (
                  <SelectItem key={license.id} value={license.id}>{license.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {showEditInput && editColumn && (
              <form className="flex items-center gap-2 ml-2" onSubmit={async e => {
                e.preventDefault();
                for (const id of selectedIds) {
                  await fetch(`/api/beats?id=${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ [editColumn]: editColumn === 'tags' ? editValue.split(',').map(t => t.trim()) : editColumn.startsWith('price_') ? Number(editValue) : editValue })
                  });
                }
                setBeats(beats.map(b => selectedIds.includes(b.id) ? { ...b, [editColumn]: editColumn === 'tags' ? editValue.split(',').map(t => t.trim()) : editColumn.startsWith('price_') ? Number(editValue) : editValue } : b));
                setShowEditInput(false);
                setEditColumn(null);
                setEditValue("");
              }}>
                <Input
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  placeholder={`New ${editColumn}`}
                  className="w-32"
                  autoFocus
                  type={editColumn.startsWith('price_') ? 'number' : 'text'}
                />
                <Button size="sm" type="submit">Save</Button>
                <Button size="sm" variant="ghost" type="button" onClick={() => { setShowEditInput(false); setEditColumn(null); setEditValue(""); }}>Cancel</Button>
              </form>
            )}
          </div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table
          className="min-w-full"
          style={{ borderCollapse: 'separate' }}
        >
          <thead>
            <tr>
              <th className="px-4 py-2 text-left border-r border-[#232323] last:border-r-0 bg-secondary">
                <input
                  type="checkbox"
                  checked={selectedIds.length === beats.length && beats.length > 0}
                  onChange={e => {
                    if (e.target.checked) {
                      setSelectedIds(beats.map(b => b.id));
                    } else {
                      setSelectedIds([]);
                    }
                  }}
                />
              </th>
              <th className="px-4 py-2 text-left border-r border-[#232323] last:border-r-0 bg-secondary">Cover</th>
              <th className="px-4 py-2 text-left border-r border-[#232323] last:border-r-0 bg-secondary">Title</th>
              <th className="px-4 py-2 text-left border-r border-[#232323] last:border-r-0 bg-secondary">View</th>
              <th className="px-4 py-2 text-left border-r border-[#232323] last:border-r-0 bg-secondary">Genre</th>
              <th
                className="px-4 py-2 text-left border-r border-[#232323] last:border-r-0 bg-secondary cursor-pointer select-none hover:text-yellow-400"
                onClick={() => setExpandAllTags(v => !v)}
              >
                Tags
              </th>
              <th
                className="px-4 py-2 text-left border-r border-[#232323] last:border-r-0 bg-secondary cursor-pointer select-none hover:text-yellow-400 relative"
                onClick={() => setShowPricesMenu(v => !v)}
              >
                Prices
                {showPricesMenu && (
                  <div className="absolute z-10 mt-2 bg-black border border-primary rounded shadow-lg p-2">
                    <div className="hover:bg-primary/10 px-2 py-1 cursor-pointer" onClick={e => { e.stopPropagation(); setExpandAllPricesType('lease'); setShowPricesMenu(false); }}>Lease</div>
                    <div className="hover:bg-primary/10 px-2 py-1 cursor-pointer" onClick={e => { e.stopPropagation(); setExpandAllPricesType('premium'); setShowPricesMenu(false); }}>Premium Lease</div>
                    <div className="hover:bg-primary/10 px-2 py-1 cursor-pointer" onClick={e => { e.stopPropagation(); setExpandAllPricesType('exclusive'); setShowPricesMenu(false); }}>Exclusive</div>
                    <div className="hover:bg-primary/10 px-2 py-1 cursor-pointer" onClick={e => { e.stopPropagation(); setExpandAllPricesType('buyout'); setShowPricesMenu(false); }}>Buy Out</div>
                    <div className="hover:bg-primary/10 px-2 py-1 cursor-pointer" onClick={e => { e.stopPropagation(); setExpandAllPricesType('all'); setShowPricesMenu(false); }}>All</div>
                    <div className="hover:bg-primary/10 px-2 py-1 cursor-pointer text-red-400" onClick={e => { e.stopPropagation(); setExpandAllPricesType(null); setShowPricesMenu(false); }}>Cancel</div>
                  </div>
                )}
              </th>
              <th className="px-4 py-2 text-left border-r border-[#232323] last:border-r-0 bg-secondary">Plays</th>
              <th
                className="px-4 py-2 text-left border-r border-[#232323] last:border-r-0 bg-secondary cursor-pointer select-none hover:text-yellow-400 relative"
                onClick={() => setShowFilesMenu(v => !v)}
              >
                File
                {showFilesMenu && (
                  <div className="absolute z-10 mt-2 bg-black border border-primary rounded shadow-lg p-2">
                    <div className="hover:bg-primary/10 px-2 py-1 cursor-pointer" onClick={e => { e.stopPropagation(); setExpandAllFilesType('mp3'); setShowFilesMenu(false); }}>MP3</div>
                    <div className="hover:bg-primary/10 px-2 py-1 cursor-pointer" onClick={e => { e.stopPropagation(); setExpandAllFilesType('wav'); setShowFilesMenu(false); }}>WAV</div>
                    <div className="hover:bg-primary/10 px-2 py-1 cursor-pointer" onClick={e => { e.stopPropagation(); setExpandAllFilesType('stems'); setShowFilesMenu(false); }}>Stems</div>
                    <div className="hover:bg-primary/10 px-2 py-1 cursor-pointer" onClick={e => { e.stopPropagation(); setExpandAllFilesType('all'); setShowFilesMenu(false); }}>All</div>
                    <div className="hover:bg-primary/10 px-2 py-1 cursor-pointer text-red-400" onClick={e => { e.stopPropagation(); setExpandAllFilesType(null); setShowFilesMenu(false); }}>Cancel</div>
                  </div>
                )}
              </th>
              <th className="px-4 py-2 text-left border-r border-[#232323] last:border-r-0 bg-secondary">Collab</th>
              <th className="px-4 py-2 text-left border-r border-[#232323] last:border-r-0 bg-secondary">License</th>
              <th className="px-4 py-2 text-left border-r border-[#232323] last:border-r-0 bg-secondary">Actions</th>
            </tr>
          </thead>
          <tbody>
            {beats.map(beat => (
              <tr key={beat.id} className="border-t border-gray-700 bg-[#141414]">
                <td className="px-4 py-2 border-r border-[#232323] last:border-r-0 bg-secondary">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(beat.id)}
                    onChange={e => {
                      if (e.target.checked) {
                        setSelectedIds(ids => [...ids, beat.id]);
                      } else {
                        setSelectedIds(ids => ids.filter(id => id !== beat.id));
                      }
                    }}
                  />
                </td>
                <td className="px-4 py-2 border-r border-[#232323] last:border-r-0 bg-secondary">
                  <div className="relative w-12 h-12 aspect-square">
                    <Image
                      src={beat.cover_art_url || "/placeholder.svg"}
                      alt={beat.title}
                      width={1600}
                      height={1600}
                      className="rounded object-cover w-full h-full"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute -top-1 -right-1 h-6 w-6 bg-secondary hover:bg-secondary/80"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = async (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) {
                            try {
                              // Upload to Supabase Storage using the same structure as beat upload
                              const coverPath = `profiles/${userId}/${beat.title.trim()}/cover/${file.name.trim()}`;
                              
                              const { data: uploadData, error: uploadError } = await supabase.storage
                                .from('beats')
                                .upload(coverPath, file);

                              if (uploadError) throw uploadError;

                              // Get the public URL
                              const { data: { publicUrl } } = supabase.storage
                                .from('beats')
                                .getPublicUrl(coverPath);

                              // Update the beat in the database
                              const { error: updateError } = await supabase
                                .from('beats')
                                .update({ cover_art_url: publicUrl })
                                .eq('id', beat.id);

                              if (updateError) throw updateError;

                              // Update local state
                              setBeats(beats.map(b => 
                                b.id === beat.id ? { ...b, cover_art_url: publicUrl } : b
                              ));

                              toast({
                                title: "Cover Art Updated",
                                description: "The beat's cover art has been updated successfully.",
                              });
                            } catch (error) {
                              console.error('Error uploading cover art:', error);
                              toast({
                                title: "Error",
                                description: "Failed to update cover art. Please try again.",
                                variant: "destructive",
                              });
                            }
                          }
                        };
                        input.click();
                      }}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </td>
                <td className="px-4 py-2 border-r border-[#232323] last:border-r-0 bg-secondary">
                  {editingId === beat.id ? (
                    <Input
                      value={editForm.title}
                      onChange={handleEditChange}
                      name="title"
                      className="w-full bg-secondary text-white"
                      autoFocus
                      onBlur={() => handleEditSave(beat.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleEditSave(beat.id);
                        }
                      }}
                    />
                  ) : (
                    <span
                      className="text-yellow-400 font-medium cursor-pointer hover:underline"
                      onClick={() => handleEdit(beat)}
                    >
                      {beat.title}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 border-r border-[#232323] last:border-r-0 bg-secondary">
                  <a
                    href={`/beat/${beat.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center text-primary hover:text-yellow-400"
                    title="View beat details"
                  >
                    <ExternalLink className="h-5 w-5" />
                  </a>
                </td>
                <td className="px-4 py-2 border-r border-[#232323] last:border-r-0 bg-secondary">{beat.genre}</td>
                <td className="px-4 py-2 border-r border-[#232323] last:border-r-0 bg-secondary">
                  {expandAllTags || expandedTagsId === beat.id ? (
                    <div className="flex flex-wrap gap-2 items-center">
                      {(Array.isArray(beat.tags) ? beat.tags : []).length > 0
                        ? (Array.isArray(beat.tags) ? beat.tags : []).map((tag, idx) => (
                            <span key={idx} className="bg-primary/20 text-primary px-2 py-1 rounded text-xs font-medium">
                              {tag}
                            </span>
                          ))
                        : <span className="text-muted-foreground">No tags</span>
                      }
                      {!expandAllTags && (
                        <Button size="sm" variant="ghost" onClick={() => setExpandedTagsId(null)}>Hide</Button>
                      )}
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setExpandedTagsId(beat.id)}>
                      View Tags
                    </Button>
                  )}
                </td>
                <td className="px-4 py-2 border-r border-[#232323] last:border-r-0 bg-secondary">
                  {expandAllPricesType ? (
                    <div className="flex flex-col gap-1">
                      {(expandAllPricesType === 'lease' || expandAllPricesType === 'all') && (
                        beat.price_lease && beat.price_lease > 0 ?
                          <span>Lease: ${beat.price_lease}</span> :
                          <span className="bg-black text-muted-foreground px-2 py-1 rounded">Lease: N/A</span>
                      )}
                      {(expandAllPricesType === 'premium' || expandAllPricesType === 'all') && (
                        beat.price_premium_lease && beat.price_premium_lease > 0 ?
                          <span>Premium Lease: ${beat.price_premium_lease}</span> :
                          <span className="bg-black text-muted-foreground px-2 py-1 rounded">Premium Lease: N/A</span>
                      )}
                      {(expandAllPricesType === 'exclusive' || expandAllPricesType === 'all') && (
                        beat.price_exclusive && beat.price_exclusive > 0 ?
                          <span>Exclusive: ${beat.price_exclusive}</span> :
                          <span className="bg-black text-muted-foreground px-2 py-1 rounded">Exclusive: N/A</span>
                      )}
                      {(expandAllPricesType === 'buyout' || expandAllPricesType === 'all') && (
                        beat.price_buyout && beat.price_buyout > 0 ?
                          <span>Buy Out: ${beat.price_buyout}</span> :
                          <span className="bg-black text-muted-foreground px-2 py-1 rounded">Buy Out: N/A</span>
                      )}
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setExpandedPricesId(beat.id)}>
                      View Prices
                    </Button>
                  )}
                </td>
                <td className="px-4 py-2 border-r border-[#232323] last:border-r-0 bg-secondary">{beat.play_count ?? 0}</td>
                <td className="px-4 py-2 border-r border-[#232323] last:border-r-0 bg-secondary">
                  {expandAllFilesType ? (
                    <div className="flex flex-col gap-1">
                      {(expandAllFilesType === 'mp3' || expandAllFilesType === 'all') && (
                        <span>
                          MP3: {beat.mp3_url ? (
                            <>
                              <a href={beat.mp3_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">Download</a>
                              <Button size="sm" variant="ghost" onClick={() => handleFileUpload(beat, 'mp3')}>Replace</Button>
                            </>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => handleFileUpload(beat, 'mp3')}>Add</Button>
                          )}
                        </span>
                      )}
                      {(expandAllFilesType === 'wav' || expandAllFilesType === 'all') && (
                        <span>
                          WAV: {beat.wav_url ? (
                            <>
                              <a href={beat.wav_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">Download</a>
                              <Button size="sm" variant="ghost" onClick={() => handleFileUpload(beat, 'wav')}>Replace</Button>
                            </>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => handleFileUpload(beat, 'wav')}>Add</Button>
                          )}
                        </span>
                      )}
                      {(expandAllFilesType === 'stems' || expandAllFilesType === 'all') && (
                        <span>
                          Stems: {beat.stems_url ? (
                            <>
                              <a href={beat.stems_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">Download</a>
                              <Button size="sm" variant="ghost" onClick={() => handleFileUpload(beat, 'stems')}>Replace</Button>
                            </>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => handleFileUpload(beat, 'stems')}>Add</Button>
                          )}
                        </span>
                      )}
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setExpandAllFilesType('all')}>
                      View Files
                    </Button>
                  )}
                </td>
                <td className="px-4 py-2 border-r border-[#232323] last:border-r-0 bg-secondary">
                  {/* Show current collaborators */}
                  <div className="mb-2">
                    <span className="text-xs text-gray-400">Current:</span>
                    <div className="flex flex-wrap gap-1">
                      {(beat.producer_ids || []).length > 0 ? (
                        (beat.producer_ids || []).map((pid) => (
                          <span key={String(pid)} className="bg-primary/20 text-primary px-2 py-1 rounded text-xs font-medium">
                            {pid}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </div>
                  </div>
                  {/* Search and add new collaborator */}
                  <div className="flex gap-1 items-center">
                    <input
                      type="text"
                      value={collabSearch[String(beat.id)] || ''}
                      onChange={e => setCollabSearch(prev => ({ ...prev, [String(beat.id)]: e.target.value }))}
                      placeholder="Producer email"
                      className="px-2 py-1 rounded bg-[#232323] text-white text-xs border border-gray-700"
                    />
                    <Button size="sm" variant="outline" onClick={() => handleCollabSearch(String(beat.id), collabSearch[String(beat.id)] || '')} disabled={collabLoading[String(beat.id)]}>Search</Button>
                  </div>
                  {collabError[String(beat.id)] && <div className="text-xs text-red-500">{collabError[String(beat.id)]}</div>}
                  {collabResults[String(beat.id)] && collabResults[String(beat.id)].length > 0 && (
                    <div className="mt-1 space-y-1">
                      {collabResults[String(beat.id)].map((producer: any) => (
                        <div key={producer.user_id} className="flex items-center gap-1">
                          <span className="text-xs text-white">{producer.display_name} ({producer.email})</span>
                          <Button size="sm" variant="secondary" onClick={() => handleAddProducer(beat, producer.user_id)}>Add</Button>
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-2 border-r border-[#232323] last:border-r-0 bg-secondary">
                  <Select
                    value={beat.license_id || 'none'}
                    onValueChange={val => handleLicenseChange(beat.id, val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Assign License" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {licenses.map(license => (
                        <SelectItem key={license.id} value={license.id}>{license.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-2 border-r border-[#232323] last:border-r-0 bg-secondary">
                  <BeatActions
                    beat={beat}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    isPlaying={playingId === beat.id}
                    onPlayPause={handlePlayPause}
                    setAudioRef={setAudioRef ? (el: HTMLAudioElement | null) => setAudioRef(beat.id, el) : undefined}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TabManager({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams, setActiveTab]);
  return null;
}

export default function BusinessProducerDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")
  const [items, setItems] = useState(mockItems)
  const [promoEnabled, setPromoEnabled] = useState(false)
  const { toast } = useToast()
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [beatStats, setBeatStats] = useState<{ totalBeats: number; totalPlays: number }>({ totalBeats: 0, totalPlays: 0 });
  const [topBeats, setTopBeats] = useState<any[]>([]);
  const [recentSessions, setRecentSessions] = useState<any[]>([])
  const [totalSales, setTotalSales] = useState(0);
  const [totalMade, setTotalMade] = useState(0);

  useEffect(() => {
    if (!user || user.role !== "business_producer") {
      router.push("/login")
    } else {
      // Fetch display_name from producers table
      supabase
        .from('producers')
        .select('display_name')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          setDisplayName(data?.display_name || null)
        })

      // Restore original analytics stats logic for total beats and total plays
      supabase
        .from('beats')
        .select('id, play_count')
        .eq('producer_id', user.id)
        .then(({ data }) => {
          const totalBeats = data?.length || 0;
          const totalPlays = (data || []).reduce((sum, b) => sum + (b.play_count || 0), 0);
          setBeatStats({ totalBeats, totalPlays });
        });

      // Fetch top 5 most played beats (unchanged)
      supabase
        .from('beats')
        .select('id, slug, title, play_count, cover_art_url')
        .eq('producer_id', user.id)
        .then(({ data }) => {
          const sorted = (data || []).sort((a, b) => (b.play_count || 0) - (a.play_count || 0));
          setTopBeats(sorted.slice(0, 5));
        });

      // Fetch total sales (beats sold by this producer) and total made (sum of price)
      (async () => {
        const { data: beatsData, error: beatsError } = await supabase
          .from('beats')
          .select('id')
          .eq('producer_id', user.id);
        if (beatsError || !beatsData || beatsData.length === 0) {
          setTotalSales(0);
          setTotalMade(0);
        } else {
          const beatIds = beatsData.map((b: any) => b.id);
          if (beatIds.length === 0) {
            setTotalSales(0);
            setTotalMade(0);
          } else {
            const { data: salesData, count } = await supabase
              .from('beat_purchases')
              .select('id, price', { count: 'exact' })
              .in('beat_id', beatIds);
            setTotalSales(count || 0);
            const total = (salesData || []).reduce((sum: number, s: any) => sum + (Number(s.price) || 0), 0);
            setTotalMade(total);
          }
        }
      })();
    }
  }, [user, router])

  useEffect(() => {
    if (!user) return;
    supabase
      .from('sessions')
      .select('id, name, last_modified')
      .eq('user_id', user.id)
      .order('last_modified', { ascending: false })
      .limit(2)
      .then(({ data }) => {
        if (data) setRecentSessions(data);
      });
  }, [user]);

  const togglePromo = (id: number) => {
    const updatedItems = items.map(item => 
      item.id === id ? { ...item, promo: !item.promo } : item
    )
    setItems(updatedItems)
    
    const item = updatedItems.find(item => item.id === id)
    toast({
      title: item?.promo ? "Promo Enabled" : "Promo Disabled",
      description: `${item?.title} is ${item?.promo ? "now" : "no longer"} being promoted.`,
    })
  }

  const toggleGlobalPromo = () => {
    setPromoEnabled(!promoEnabled)
    toast({
      title: !promoEnabled ? "Promo Mode Enabled" : "Promo Mode Disabled",
      description: !promoEnabled ? "Promotions are now active across your catalog." : "Promotions have been deactivated.",
    })
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-[#141414]">
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 font-display tracking-wider text-primary">Business Producer Dashboard</h1>
            <p className="text-xl text-gray-400">Welcome back, {displayName || ('username' in user ? (user as any).username : user?.email?.split('@')[0])}</p>
        </div>
      </div>
      
        <Suspense fallback={null}>
          <TabManager setActiveTab={setActiveTab} />
        </Suspense>
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="flex w-full overflow-x-auto whitespace-nowrap gap-2 sm:grid sm:grid-cols-8 sm:gap-0">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="mybeats">My Beats</TabsTrigger>
            <TabsTrigger value="beats">Beats</TabsTrigger>
            <TabsTrigger value="promo">Promo</TabsTrigger>
            <TabsTrigger value="support">Support</TabsTrigger>
            <TabsTrigger value="others" disabled style={{ pointerEvents: 'none', opacity: 0.6, cursor: 'not-allowed' }}>Others</TabsTrigger>
          </TabsList>
        
        <TabsContent value="overview" className="mt-6">
          {/* Analytics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-black border-primary">
              <CardContent className="p-6 flex flex-col items-center justify-center">
                <div className="text-4xl font-bold text-primary">{beatStats.totalBeats}</div>
                <div className="text-lg text-gray-300 mt-2">Total Beats</div>
              </CardContent>
            </Card>
            <Card className="bg-black border-primary">
              <CardContent className="p-6 flex flex-col items-center justify-center">
                <div className="text-4xl font-bold text-primary">{formatK(beatStats.totalPlays)}</div>
                <div className="text-lg text-gray-300 mt-2">Total Plays</div>
              </CardContent>
            </Card>
            <Link href="/sold" className="block">
              <Card className="bg-black border-primary hover:border-yellow-400 transition-colors cursor-pointer">
                <CardContent className="p-6 flex flex-col items-center justify-center">
                  <div className="text-4xl font-bold text-primary flex items-center gap-2">
                    <span>{totalSales}</span>
                    <ShoppingCart className="h-7 w-7 text-yellow-400" />
                  </div>
                  <div className="text-lg text-gray-300 mt-2">Beats Sold</div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/sold" className="block">
              <Card className="bg-black border-primary hover:border-yellow-400 transition-colors cursor-pointer">
                <CardContent className="p-6 flex flex-col items-center justify-center">
                  <div className="text-4xl font-bold flex items-center gap-2 break-words text-center w-full justify-center">
                    <span className="text-green-600 break-words text-center">{formatMoneyK(totalMade)}</span>
                    <Receipt className="h-7 w-7 text-green-600 flex-shrink-0" />
                  </div>
                  <div className="text-lg text-white mt-2">Total Sales</div>
                </CardContent>
              </Card>
            </Link>
          </div>
          {/* Top 5 Beats by Plays */}
          <div className="mb-8">
            <div className="text-xl font-bold text-primary mb-4">Top 5 Most Played Beats</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {topBeats.length === 0 ? (
                <div className="text-gray-400 col-span-full">No beats found.</div>
              ) : (
                topBeats.map((beat) => (
                  <Link key={beat.id} href={`/beat/${beat.slug}`} target="_blank" rel="noopener noreferrer" className="block">
                    <Card className="bg-black border-primary flex flex-col items-center p-2 min-w-0 hover:border-yellow-400 transition-colors cursor-pointer">
                      <div className="w-14 h-14 mb-1 relative">
                        <Image
                          src={beat.cover_art_url || "/placeholder.svg"}
                          alt={beat.title}
                          width={56}
                          height={56}
                          className="rounded object-cover w-full h-full"
                        />
                      </div>
                      <div className="font-semibold text-white text-center truncate w-full text-base" title={beat.title}>{beat.title}</div>
                      <div className="text-primary text-xs mt-0.5">{beat.play_count ?? 0} plays</div>
                    </Card>
                  </Link>
                ))
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Quick Upload Card */}
            <Card className="bg-black border-primary hover:border-primary transition-all">
              <CardHeader>
                <Upload className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Quick Upload</CardTitle>
                <CardDescription>Upload new content to your marketplace.</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/upload-beat">
                  <Button className="w-full">Upload Content</Button>
                </Link>
              </CardContent>
            </Card>
            {/* Recording Sessions Card */}
            <Link href="/sessions">
              <Card className="hover:border-primary transition-all cursor-pointer">
                <CardHeader>
                  <Mic className="h-8 w-8 mb-2 text-primary" />
                  <CardTitle>Sessions</CardTitle>
                  <CardDescription>Manage your sessions and drafts.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Recent Sessions</span>
                      <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        New Session
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {recentSessions.length === 0 ? (
                        <div className="text-gray-400">No recent sessions</div>
                      ) : (
                        recentSessions.map(session => (
                          <div key={session.id} className="flex items-center justify-between p-2 bg-secondary rounded-md">
                        <div>
                              <div className="font-medium">{session.name}</div>
                              <div className="text-sm text-gray-400">Last modified: {session.last_modified ? new Date(session.last_modified).toLocaleString() : '-'}</div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Play className="h-4 w-4" />
                        </Button>
                      </div>
                        ))
                      )}
                        </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
            {/* Licenses Card */}
            <Link href="/mylicenses">
              <Card className="hover:border-primary transition-all cursor-pointer">
                <CardHeader>
                  <FileText className="h-8 w-8 mb-2 text-primary" />
                  <CardTitle>Licenses</CardTitle>
                  <CardDescription>Manage your license templates and terms.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">License Management</span>
                      <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        New License
                        </Button>
                      </div>
                    <div className="text-gray-400">
                      Create and manage custom license templates for your beats.
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </TabsContent>
        
        <TabsContent value="mybeats" className="mt-6">
            <Card className="bg-black border-primary">
              <CardContent className="p-6">
                <MyBeatsManager userId={user.id} />
                </CardContent>
              </Card>
        </TabsContent>
        
        <TabsContent value="beats" className="mt-6">
          <Card className="bg-black border-primary">
            <CardContent className="p-6">
              <SimpleBeatsList userId={user.id} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="promo" className="mt-6">
          <Card className="bg-black border-primary">
            <CardContent className="p-8 text-center">
              <div className="text-2xl font-bold text-primary mb-2">Promo Tab</div>
              <div className="text-gray-300 text-lg">This feature is under development.</div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="support" className="mt-6">
            <Card className="bg-black border-primary">
            <CardHeader>
              <CardTitle>Business Producer Support</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p>As a Business Producer, you have access to priority support.</p>
                <Link href="/contact">
                  <Button>Contact Support Team</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="others" className="mt-6">
          <Card className="bg-black border-primary">
            <CardContent className="p-8 text-center">
              <div className="text-2xl font-bold text-primary mb-2">Others Tab</div>
              <div className="text-gray-300 text-lg">This feature is under development.</div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  )
}

// Minimal type for beats in the 'Beats' tab
type SimpleBeat = { id: string | number; slug: string; title: string; mp3_url: string; cover_art_url?: string };

function SimpleBeatsList({ userId }: { userId: string }) {
  const [beats, setBeats] = useState<SimpleBeat[]>([]);
  const [playingId, setPlayingId] = useState<string | number | null>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({});

  useEffect(() => {
    async function fetchBeats() {
      const { data } = await supabase
        .from('beats')
        .select('id, slug, title, mp3_url, cover_art_url')
        .eq('producer_id', userId)
        .order('created_at', { ascending: false });
      setBeats(data || []);
    }
    fetchBeats();
  }, [userId]);

  const handlePlayPause = (id: string | number) => {
    if (playingId === id) {
      const audio = audioRefs.current[id];
      if (audio) audio.pause();
      setPlayingId(null);
    } else {
      if (playingId && audioRefs.current[playingId]) {
        audioRefs.current[playingId]?.pause();
        audioRefs.current[playingId]?.currentTime && (audioRefs.current[playingId]!.currentTime = 0);
      }
      const audio = audioRefs.current[id];
      if (audio) {
        audio.play();
        setPlayingId(id);
      }
    }
  };

  const setAudioRef = (id: string | number, el: HTMLAudioElement | null) => {
    audioRefs.current[id] = el;
  };

  if (!beats.length) {
    return <div className="text-gray-400 text-center">No beats uploaded yet.</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {beats.map(beat => (
        <div key={beat.id} className="flex flex-col items-center bg-[#181818] rounded-lg p-4 border border-primary">
          <div className="w-20 h-20 mb-2 relative">
            <Image
              src={beat.cover_art_url || "/placeholder.svg"}
              alt={beat.title}
              width={160}
              height={160}
              className="rounded object-cover w-full h-full"
            />
            <audio
              ref={el => setAudioRef(beat.id, el)}
              src={beat.mp3_url}
              style={{ display: 'none' }}
              preload="none"
              onEnded={() => setPlayingId(null)}
            />
          </div>
          <div className="font-semibold text-white text-center truncate w-full mb-1" title={beat.title}>{beat.title}</div>
          <div className="flex gap-2 mt-2">
            <a
              href={`/beat/${beat.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center text-primary hover:text-yellow-400"
              title="View beat details"
            >
              <ExternalLink className="h-5 w-5" />
            </a>
            <button
              className={`rounded-full p-2 ${playingId === beat.id ? 'bg-primary text-white' : 'bg-secondary text-primary'} transition-colors`}
              onClick={() => handlePlayPause(beat.id)}
              aria-label={playingId === beat.id ? 'Pause' : 'Play'}
              type="button"
            >
              {playingId === beat.id ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Utility function for k-format
function formatMoneyK(value: number) {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`;
  }
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Utility function for k-format (shared)
function formatK(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toLocaleString();
}

