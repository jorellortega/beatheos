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
import { Plus, Edit, Trash2, BarChart2, Package, Activity, Users, Upload, HelpCircle, Star, Percent, Mic, Play, Wand2, Music2, Layers, Shuffle, User, Pause } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from '@/lib/supabaseClient'
import { Suspense } from "react"
import Image from "next/image"

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
  producer: {
    display_name: string;
  };
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
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({});
  const { toast } = useToast();

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
            cover_art_url
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
    if (!confirm('Are you sure you want to delete this beat?')) return
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
      <h2 className="text-2xl font-bold mb-4">My Uploaded Beats</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-secondary rounded-lg">
          <thead>
            <tr>
              <th className="p-2 text-left">Cover</th>
              <th className="p-2 text-left">Title</th>
              <th className="p-2 text-left">Genre</th>
              <th className="p-2 text-left">BPM</th>
              <th className="p-2 text-left">Key</th>
              <th className="p-2 text-left">Plays</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {beats.map(beat => (
              <tr key={beat.id} className="border-t border-gray-700">
                <td className="p-2">
                  <div className="relative w-12 h-12 aspect-square overflow-hidden">
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
                              const coverPath = `${userId}/${beat.title.trim()}/cover/${file.name.trim()}`;
                              
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
                <td className="p-2">{beat.title}</td>
                <td className="p-2">{beat.genre}</td>
                <td className="p-2">{beat.bpm}</td>
                <td className="p-2">{beat.key}</td>
                <td className="p-2">{beat.play_count ?? 0}</td>
                <td className="p-2">
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
    const tab = searchParams.get('tab');
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
    }
  }, [user, router])

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
          <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
            <TabsTrigger value="mybeats">My Beats</TabsTrigger>
          <TabsTrigger value="promo">Promo</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
          <TabsTrigger value="others">Others</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="bg-black border-primary hover:border-primary transition-all">
              <CardHeader>
                <Package className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Beat Marketplace</CardTitle>
                <CardDescription>List and sell your beats with 0% commission.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => setActiveTab("marketplace")}>Manage Marketplace</Button>
              </CardContent>
            </Card>
            
              <Card className="bg-black border-primary hover:border-primary transition-all">
              <CardHeader>
                <BarChart2 className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Professional Analytics</CardTitle>
                <CardDescription>Access comprehensive analytics and forecasting.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => setActiveTab("analytics")}>View Analytics</Button>
              </CardContent>
            </Card>
            
              <Card className="bg-black border-primary hover:border-primary transition-all">
              <CardHeader>
                <Activity className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Rhythm Forge Pro</CardTitle>
                <CardDescription>Use our most advanced beat creation tools.</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/rhythm-forge">
                  <Button className="w-full">Open Rhythm Forge Pro</Button>
                </Link>
              </CardContent>
            </Card>
            
              <Card className="bg-black border-primary hover:border-primary transition-all">
              <CardHeader>
                <HelpCircle className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Dedicated Support</CardTitle>
                <CardDescription>Get priority support from our team.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => setActiveTab("support")}>Contact Support</Button>
              </CardContent>
            </Card>
            
              <Card className="bg-black border-primary hover:border-primary transition-all">
              <CardHeader>
                <Users className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Fan Management</CardTitle>
                <CardDescription>Engage with your audience and grow your fan base.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Manage Audience</Button>
              </CardContent>
            </Card>
            
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

            <Link href="/sessions">
              <Card className="hover:border-primary transition-all cursor-pointer">
                <CardHeader>
                  <Mic className="h-8 w-8 mb-2 text-primary" />
                  <CardTitle>Recording Sessions</CardTitle>
                  <CardDescription>Manage your recording sessions and drafts.</CardDescription>
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
                      <div className="flex items-center justify-between p-2 bg-secondary rounded-md">
                        <div>
                          <div className="font-medium">Cosmic Rhythm Session</div>
                          <div className="text-sm text-gray-400">Last modified: 2 hours ago</div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Play className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-secondary rounded-md">
                        <div>
                          <div className="font-medium">Trap Essentials Draft</div>
                          <div className="text-sm text-gray-400">Last modified: 1 day ago</div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Play className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Card className="bg-card border-primary hover:border-primary transition-all">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-primary">Recording Studios</CardTitle>
                <CardDescription>Post and manage your recording studios</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/recordingstudios">
                  <Button className="w-full gradient-button text-black font-medium hover:text-white">
                    Go to Recording Studios
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="bg-card border-primary hover:border-primary transition-all">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-primary">Artist Collaborations</CardTitle>
                <CardDescription>Collaborate with other artists</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/features">
                  <Button className="w-full gradient-button text-black font-medium hover:text-white">
                    Go to Collaborations
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="marketplace" className="mt-6">
            <Card className="bg-black border-primary">
              <CardHeader>
                <CardTitle>Marketplace Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-black border border-primary p-4 rounded-md">
                    <div className="text-sm text-gray-400">Total Revenue</div>
                    <div className="text-2xl font-bold">$7,892.45</div>
                    <div className="text-sm text-green-500">+12% from last month</div>
                  </div>
                  <div className="bg-black border border-primary p-4 rounded-md">
                    <div className="text-sm text-gray-400">Total Sales</div>
                    <div className="text-2xl font-bold">413</div>
                    <div className="text-sm text-green-500">+8% from last month</div>
                  </div>
                  <div className="bg-black border border-primary p-4 rounded-md">
                    <div className="text-sm text-gray-400">Avg. Rating</div>
                    <div className="text-2xl font-bold flex items-center">
                      4.7
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400 ml-2" />
                    </div>
                    <div className="text-sm text-gray-400">Based on 213 reviews</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="mybeats" className="mt-6">
            <Card className="bg-black border-primary">
              <CardContent className="p-6">
                <MyBeatsManager userId={user.id} />
                </CardContent>
              </Card>
        </TabsContent>
        
        <TabsContent value="promo" className="mt-6">
          <div className="grid grid-cols-1 gap-6">
              <Card className="bg-black border-primary">
              <CardHeader>
                <CardTitle>Active Promotions</CardTitle>
                <CardDescription>Manage your ongoing promotional campaigns</CardDescription>
              </CardHeader>
              <CardContent>
                  <div className="border border-primary rounded-md">
                    <div className="grid grid-cols-5 bg-black p-3 rounded-t-md">
                    <div className="font-medium">Item</div>
                    <div className="font-medium">Original Price</div>
                    <div className="font-medium">Promo Price</div>
                    <div className="font-medium">Status</div>
                    <div className="font-medium">Actions</div>
                  </div>
                  {items.filter(item => item.promo).map((item) => (
                      <div key={item.id} className="grid grid-cols-5 p-4 border-t border-primary items-center">
                      <div className="font-medium">{item.title}</div>
                      <div className="line-through">${item.price.toFixed(2)}</div>
                      <div className="text-green-500 font-medium">${(item.price * 0.75).toFixed(2)}</div>
                      <div>
                        <span className="bg-green-500/20 text-green-600 px-2 py-1 rounded-full text-xs font-medium">
                          Active
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => togglePromo(item.id)}>
                          End Promo
                        </Button>
                      </div>
                    </div>
                  ))}
                  {items.filter(item => item.promo).length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                      No active promotions. Enable promotions for your products in the Marketplace tab.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

              <Card className="bg-black border-primary">
              <CardHeader>
                <CardTitle>Promo Settings</CardTitle>
                <CardDescription>Configure how promotions work for your products</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="discount-percent">Default Discount (%)</Label>
                      <Input id="discount-percent" type="number" min="5" max="75" defaultValue="25" />
                    </div>
                    <div>
                      <Label htmlFor="promo-duration">Default Duration (days)</Label>
                      <Input id="promo-duration" type="number" min="1" max="30" defaultValue="7" />
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2">
                    <div className="space-y-0.5">
                      <Label htmlFor="feature-promos">Feature Promoted Items</Label>
                      <p className="text-sm text-muted-foreground">Promoted items appear at the top of marketplace listings</p>
                    </div>
                    <Switch id="feature-promos" defaultChecked />
                  </div>
                  
                  <div className="flex justify-between items-center pt-2">
                    <div className="space-y-0.5">
                      <Label htmlFor="auto-social">Auto-share to Social</Label>
                      <p className="text-sm text-muted-foreground">Automatically announce promotions on your social profiles</p>
                    </div>
                    <Switch id="auto-social" />
                  </div>
                  
                  <Button className="w-full">Save Promo Settings</Button>
                </div>
              </CardContent>
            </Card>
            
              <Card className="bg-black border-primary">
              <CardHeader>
                <CardTitle>Schedule Promotion</CardTitle>
                <CardDescription>Plan future promotional campaigns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="promo-name">Campaign Name</Label>
                    <Input id="promo-name" placeholder="e.g. Summer Sale 2023" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start-date">Start Date</Label>
                      <Input id="start-date" type="date" />
                    </div>
                    <div>
                      <Label htmlFor="end-date">End Date</Label>
                      <Input id="end-date" type="date" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="promo-items">Select Items</Label>
                      <div className="border border-primary rounded-md p-4 mt-2 space-y-2 max-h-40 overflow-y-auto">
                      {items.map(item => (
                        <div key={item.id} className="flex items-center space-x-2">
                          <Checkbox id={`item-${item.id}`} />
                          <label htmlFor={`item-${item.id}`} className="text-sm">{item.title}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button className="w-full">Schedule Promotion</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="analytics" className="mt-6">
            <Card className="bg-black border-primary">
            <CardHeader>
              <CardTitle>Performance Analytics</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-80 flex items-center justify-center border border-primary rounded-md">
                <p className="text-gray-500">Analytics charts and data visualizations would appear here</p>
              </div>
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
                <Button>Contact Support Team</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="others" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link href="/ai-loop-stacker">
                <Card className="bg-black border-primary hover:border-primary transition-all cursor-pointer">
                <CardHeader>
                  <Wand2 className="h-8 w-8 mb-2 text-primary" />
                  <CardTitle>AI Loop Stacker</CardTitle>
                  <CardDescription>Create unique loops with AI assistance.</CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/eternal-loops">
                <Card className="bg-black border-primary hover:border-primary transition-all cursor-pointer">
                <CardHeader>
                  <Music2 className="h-8 w-8 mb-2 text-primary" />
                  <CardTitle>Eternal Loops</CardTitle>
                  <CardDescription>Explore and create endless loop combinations.</CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/beat-maker">
                <Card className="bg-black border-primary hover:border-primary transition-all cursor-pointer">
                <CardHeader>
                  <Layers className="h-8 w-8 mb-2 text-primary" />
                  <CardTitle>Beat Maker</CardTitle>
                  <CardDescription>Professional beat creation studio.</CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/shuffle">
                <Card className="bg-black border-primary hover:border-primary transition-all cursor-pointer">
                <CardHeader>
                  <Shuffle className="h-8 w-8 mb-2 text-primary" />
                  <CardTitle>Shuffle</CardTitle>
                  <CardDescription>Mix and match beats in new ways.</CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/producer">
                <Card className="bg-black border-primary hover:border-primary transition-all cursor-pointer">
                <CardHeader>
                  <User className="h-8 w-8 mb-2 text-primary" />
                  <CardTitle>Producer Profile</CardTitle>
                  <CardDescription>Manage your producer profile and settings.</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  )
}

