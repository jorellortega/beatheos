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
import { Plus, Edit, Trash2, BarChart2, Package, Activity, Users, Upload, HelpCircle, Star, Percent, Mic, Play, Wand2, Music2, Layers, Shuffle, User, Pause, ExternalLink, Library, CreditCard, Sparkles } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from '@/lib/supabaseClient'
import { Suspense } from "react"
import Image from "next/image"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"

// Mock marketplace items
const mockItems = [
  { id: 1, title: "Trap Essentials Vol. 1", type: "soundkit", price: 24.99, sales: 128, rating: 4.8, promo: false },
  { id: 2, title: "Lo-Fi Melodies", type: "loops", price: 19.99, sales: 75, rating: 4.5, promo: true },
  { id: 3, title: "808 Collection Pro", type: "soundkit", price: 34.99, sales: 210, rating: 4.9, promo: false },
]

interface Beat {
  id: string | number;
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

    fetchBeats();
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
        const ext = file.name.split('.').pop();
        const base = file.name.replace(/\.[^/.]+$/, '');
        const uniqueFileName = `${base}_${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
        let storagePath = `profiles/${userId}/${beat.title.trim()}/${fileType}/${uniqueFileName}`;
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
                              const coverExt = file.name.split('.').pop();
                              const coverBase = file.name.replace(/\.[^/.]+$/, '');
                              const coverUnique = `${coverBase}_${Date.now()}-${Math.round(Math.random() * 1e9)}.${coverExt}`;
                              const coverPath = `profiles/${userId}/${beat.title.trim()}/cover/${coverUnique}`;
                              
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
                    <div className="flex items-center gap-2">
                      <Input
                        value={editForm.title}
                        onChange={handleEditChange}
                        name="title"
                        className="w-full bg-secondary"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleEditSave(beat.id);
                          }
                        }}
                      />
                      <Button size="sm" type="button" onClick={() => handleEditSave(beat.id)}>Save</Button>
                      <Button size="sm" variant="ghost" type="button" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
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
                    href={`/beat/${beat.id}`}
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
    if (searchParams) {
      const tab = searchParams.get('tab');
      if (tab) setActiveTab(tab);
    }
  }, [searchParams, setActiveTab]);
  return null;
}

export default function FreeArtistDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [playlistId, setPlaylistId] = useState<string | null>(null);
  const [hasArtistProfile, setHasArtistProfile] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user || user.role !== "free_artist") {
      router.push("/login")
    }
  }, [user, router])

  useEffect(() => {
    async function fetchOrCreatePlaylist() {
      if (!user) return;
      // Try to fetch the user's first playlist
      const { data, error } = await supabase
        .from('playlists')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        .single();
      if (data && data.id) {
        setPlaylistId(data.id);
      } else {
        // Create a new playlist if none exists
        const { data: newPlaylist, error: createError } = await supabase
          .from('playlists')
          .insert([{ user_id: user.id, name: 'My Playlist' }])
          .select('id')
          .single();
        if (newPlaylist && newPlaylist.id) setPlaylistId(newPlaylist.id);
      }
    }
    fetchOrCreatePlaylist();
  }, [user]);

  useEffect(() => {
    async function checkArtistProfile() {
      if (!user) return;
      console.log('Checking artist profile for user:', user.id);
      const { data, error } = await supabase
        .from('artists')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      console.log('Artist profile check result:', { data, error, hasProfile: !!data });
      setHasArtistProfile(!!data);
    }
    checkArtistProfile();
  }, [user]);

  if (!user) return null

  console.log('Dashboard state:', { 
    userId: user?.id, 
    userRole: user?.role, 
    hasArtistProfile, 
    playlistId 
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold font-display tracking-wider text-primary">Artist Dashboard</h1>
        <div className="flex gap-2">
          <Link href="/dashboard/payments">
            <Button variant="outline" className="bg-primary text-black hover:bg-primary/90">
              <CreditCard className="h-4 w-4 mr-2" />
              Payments
            </Button>
          </Link>
          <Link href="/mylibrary">
            <Button variant="outline" className="bg-primary text-black hover:bg-primary/90">
              <Library className="h-4 w-4 mr-2" />
              My Library
            </Button>
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
        {/* Activate Artist Account Card */}
        <Card className="bg-card border-primary hover:border-primary transition-all">
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              Artist Account Status
            </CardTitle>
            <CardDescription>
              {hasArtistProfile 
                ? "Your artist profile is active and ready to use." 
                : "Set up your public artist profile and start uploading songs."
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasArtistProfile ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-400">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="font-medium">Artist Account Activated</span>
                </div>
                <Link href="/activate-artist">
                  <Button variant="outline" className="w-full bg-black text-white border border-white font-medium transition-all duration-200 hover:gradient-button hover:text-black hover:border-0">
                    Manage Profile
                  </Button>
                </Link>
              </div>
            ) : (
              <Link href="/activate-artist">
                <Button className="w-full gradient-button text-black font-medium transition-all duration-200 hover:bg-black hover:text-white hover:border hover:border-white">
                  Activate Now
                </Button>
              </Link>
            )}
          </CardContent>
                  </Card>
          {playlistId && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Link href="/playlist/edit">
                <Card className="hover:border-primary transition-all cursor-pointer">
                  <CardHeader>
                    <CardTitle>My Playlists</CardTitle>
                    <CardDescription>Manage, edit, delete, add, search, and advanced edit your playlists.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Music2 className="h-8 w-8 text-primary" />
                      <span className="font-semibold text-lg">Go to Playlists</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              
              <Link href="/mylibrary">
                <Card className="hover:border-primary transition-all cursor-pointer">
                  <CardHeader>
                    <CardTitle>My Library</CardTitle>
                    <CardDescription>Manage your albums, singles, and audio library files.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Package className="h-8 w-8 text-primary" />
                      <span className="font-semibold text-lg">Go to Library</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          )}
        {/* Artist Upload Card */}
        <Link href="/artist-upload" className="block mb-8">
          <Card className="hover:border-primary transition-all cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="mr-2 h-6 w-6 text-primary" />
                Upload a Song
              </CardTitle>
              <CardDescription>Upload new songs to your artist profile and share them with your fans.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full gradient-button text-black font-medium transition-all duration-200 hover:bg-black hover:text-white hover:border hover:border-white">
                Go to Upload
              </Button>
            </CardContent>
          </Card>
        </Link>
        <Card className="bg-card border-primary hover:border-primary transition-all">
          <CardHeader>
            <CardTitle>Browse Beats</CardTitle>
            <CardDescription>Explore and purchase beats from the marketplace.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/beats">
              <Button className="w-full bg-black text-white border border-white font-medium transition-all duration-200 hover:gradient-button hover:text-black hover:border-0">
                Browse Beats
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card className="bg-card border-primary hover:border-primary transition-all">
          <CardHeader>
            <CardTitle>My Beats</CardTitle>
            <CardDescription>View and download your beats.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/mybeats">
              <Button className="w-full gradient-button text-black font-medium transition-all duration-200 hover:bg-black hover:text-white hover:border hover:border-white">
                My Beats
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card className="bg-card border-primary hover:border-primary transition-all">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Sparkles className="mr-2 h-5 w-5 text-primary" />
              AI Covers
            </CardTitle>
            <CardDescription>View and manage your AI-generated album covers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/my-ai-covers" className="block">
              <Button className="w-full gradient-button text-black font-medium transition-all duration-200 hover:bg-black hover:text-white hover:border hover:border-white">
                View Covers
              </Button>
            </Link>
            <Link href="/ai-cover" className="block">
              <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary hover:text-black font-medium transition-all duration-200">
                Create AI Cover
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Link href="/sessions" className="block group">
          <Card className="bg-card border-primary hover:border-primary transition-all cursor-pointer group-hover:border-yellow-400">
            <CardHeader>
              <Mic className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Sessions</CardTitle>
              <CardDescription>Manage and upload your recording sessions, or collaborate with others.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Recent Sessions</span>
                  <Button variant="outline" size="sm" className="bg-black text-white border border-white font-medium transition-all duration-200 hover:gradient-button hover:text-black hover:border-0">
                    <Plus className="h-4 w-4 mr-2" />
                    New Session
                  </Button>
                </div>
                <div className="text-gray-400">No recent sessions</div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Card className="bg-card border-primary hover:border-primary transition-all">
          <CardHeader>
            <CardTitle>Profile & Settings</CardTitle>
            <CardDescription>Manage your artist profile and account settings.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/settings">
              <Button className="w-full bg-black text-white border border-white font-medium transition-all duration-200 hover:gradient-button hover:text-black hover:border-0">
                Profile & Settings
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card className="bg-card border-primary hover:border-primary transition-all">
          <CardHeader>
            <CardTitle>Support & Help</CardTitle>
            <CardDescription>Get help or contact support.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/contact">
              <Button className="w-full bg-black text-white border border-white font-medium transition-all duration-200 hover:gradient-button hover:text-black hover:border-0">
                Support & Help
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card className="bg-black border-primary hover:border-primary transition-all">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Community Feed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>See what the community is posting and join the conversation.</p>
            <Button className="mt-4" asChild>
              <Link href="/feed">Go to Feed</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="bg-card border-primary hover:border-primary transition-all">
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              Artist Profile
            </CardTitle>
            <CardDescription>View and manage your public artist profile page.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/artist/${user?.username?.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-') || 'my-profile'}`}>
              <Button className="w-full gradient-button text-black font-medium transition-all duration-200 hover:bg-black hover:text-white hover:border hover:border-white">
                View My Profile
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card className="bg-card border-primary hover:border-primary transition-all">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Sparkles className="mr-2 h-5 w-5" />
              Lyrics AI
            </CardTitle>
            <CardDescription>Create, edit, and enhance your lyrics with AI-powered tools.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/lyrics-ai">
              <Button className="w-full gradient-button text-black font-medium transition-all duration-200 hover:bg-black hover:text-white hover:border hover:border-white">
                Go to Lyrics AI
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Link href="/dashboard/payments">
          <Card className="bg-card border-primary hover:border-primary transition-all cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="mr-2 h-5 w-5" />
                Payments
              </CardTitle>
              <CardDescription>Manage payment methods, transactions, and enable Stripe onboarding for payouts.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full gradient-button text-black font-medium transition-all duration-200 hover:bg-black hover:text-white hover:border hover:border-white">
                Manage Payments
              </Button>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}

// Minimal type for beats in the 'Beats' tab
type SimpleBeat = { id: string | number; title: string; mp3_url: string; cover_art_url?: string };

function SimpleBeatsList({ userId }: { userId: string }) {
  const [beats, setBeats] = useState<SimpleBeat[]>([]);
  const [playingId, setPlayingId] = useState<string | number | null>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({});

  useEffect(() => {
    async function fetchBeats() {
      const { data } = await supabase
        .from('beats')
        .select('id, title, mp3_url, cover_art_url')
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
              href={`/beat/${beat.id}`}
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

