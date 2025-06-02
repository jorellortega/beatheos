"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader, Download, Trash2, Save, Edit, X, ShoppingCart, Play, Pause } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { PurchaseOptionsModal } from "@/components/PurchaseOptionsModal"
import { useAuth } from '@/contexts/AuthContext'
import Image from "next/image"
import { AudioWaveform } from "@/components/AudioWaveform"
import Link from 'next/link'
import { usePlayer } from '@/contexts/PlayerContext'
import { BeatRating } from '@/components/beats/BeatRating'

interface Beat {
  id: string;
  title: string;
  description: string;
  genre: string;
  bpm: number;
  key: string;
  cover_art_url: string;
  mp3_url: string;
  wav_url: string;
  stems_url: string;
  price_lease: number;
  price_premium_lease: number;
  price_exclusive: number;
  price_buyout: number;
  producer_id: string;
  producer_ids?: string[];
  created_at: string;
  updated_at: string;
  tags?: string[];
  licensing?: Record<string, any>;
  [key: string]: any; // Add index signature for dynamic field access
}

const editableFields = [
  { key: "title", label: "Title", type: "input" },
  { key: "genre", label: "Genre", type: "input" },
  { key: "bpm", label: "BPM", type: "input" },
  { key: "key", label: "Key", type: "input" },
  { key: "tags", label: "Tags", type: "input" },
  { key: "licensing", label: "Licensing", type: "textarea" },
  { key: "cover_art_url", label: "Cover Art URL", type: "input" },
  { key: "description", label: "Description", type: "textarea" },
]

const licenseOptions = [
  { id: 'lease', label: 'Lease License', priceKey: 'price_lease' },
  { id: 'premium', label: 'Premium Lease License', priceKey: 'price_premium_lease' },
  { id: 'exclusive', label: 'Exclusive License', priceKey: 'price_exclusive' },
  { id: 'buyout', label: 'Buy Out License', priceKey: 'price_buyout' },
]

// Helper function to get license price from columns or JSON
function getLicensePrice(beat: any, key: string, jsonKey: string) {
  // Prefer the column if it exists and is a number
  if (beat && beat[key] != null && !isNaN(Number(beat[key]))) return Number(beat[key]);
  // Fallback to JSON if present
  if (beat && beat.licensing && beat.licensing[jsonKey] != null && !isNaN(Number(beat.licensing[jsonKey]))) return Number(beat.licensing[jsonKey]);
  return null;
}

export default function BeatDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id;
  const router = useRouter()
  const [beat, setBeat] = useState<Beat | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [fieldValue, setFieldValue] = useState<any>("")
  const [savingField, setSavingField] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editingPrice, setEditingPrice] = useState<string | null>(null)
  const [priceValue, setPriceValue] = useState<string>("")
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [selectedLicense, setSelectedLicense] = useState<string | null>(null)
  const { user } = useAuth();
  const [producers, setProducers] = useState<any[]>([])
  const { setCurrentBeat, setIsPlaying, currentBeat, isPlaying } = usePlayer();
  const [ratingData, setRatingData] = useState<{
    userRating: number | null;
    averageRating: number;
    totalRatings: number;
  }>({
    userRating: null,
    averageRating: 0,
    totalRatings: 0
  });

  useEffect(() => {
    async function fetchBeat() {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from("beats")
        .select("*")
        .eq("slug", id)
        .single()
      if (error) {
        setError("Beat not found or error fetching beat.")
        setBeat(null)
      } else {
        setBeat(data)
      }
      setLoading(false)
    }
    if (id) fetchBeat()
  }, [id])

  useEffect(() => {
    async function fetchProducers() {
      if (!beat) return;
      // Collect all producer IDs
      const ids = [beat.producer_id, ...(beat.producer_ids || []).filter((id: string) => id !== beat.producer_id)]
      if (!ids.length) return;
      const { data: producersData } = await supabase
          .from('producers')
        .select('user_id, display_name, profile_image_url, slug')
        .in('user_id', ids)
      setProducers(producersData || [])
    }
    fetchProducers()
  }, [beat])

  useEffect(() => {
    async function fetchRatingData() {
      if (!beat?.id) return;
      console.log('[DEBUG] Fetching rating for beat id:', beat.id);
      try {
        const response = await fetch(`/api/beats/${beat.id}/rate`);
        if (response.ok) {
          const data = await response.json();
          console.log('[DEBUG] Rating API response:', data);
          setRatingData({
            userRating: null,
            averageRating: data.averageRating,
            totalRatings: data.totalRatings
          });
        } else {
          console.log('[DEBUG] Rating API error:', response.status, await response.text());
        }
      } catch (error) {
        console.error('[DEBUG] Error fetching rating data:', error);
      }
    }
    fetchRatingData();
  }, [beat?.id]);

  const startEdit = (field: string) => {
    if (!beat) return;
    setEditingField(field)
    if (field === "tags") {
      setFieldValue(Array.isArray(beat.tags) ? beat.tags.join(", ") : String(beat.tags || ""))
    } else if (field === "licensing") {
      setFieldValue(typeof beat.licensing === 'object' ? JSON.stringify(beat.licensing, null, 2) : String(beat.licensing || ""))
    } else {
      setFieldValue(beat[field] ?? "")
    }
  }

  const cancelEdit = () => {
    setEditingField(null)
    setFieldValue("")
  }

  const handleFieldChange = (e: any) => {
    setFieldValue(e.target.value)
  }

  const saveField = async () => {
    setSavingField(true)
    try {
      let updateData: any = {}
      if (editingField === "tags") {
        updateData.tags = fieldValue.split(",").map((t: string) => t.trim())
      } else if (editingField === "licensing") {
        updateData.licensing = JSON.parse(fieldValue)
      } else {
        updateData[editingField!] = fieldValue
      }
      const { error } = await supabase
        .from("beats")
        .update(updateData)
        .eq("id", id)
      if (error) throw error
      toast({ title: `Updated ${editingField}!` })
      setBeat((prev: any) => ({ ...prev, ...updateData }))
      setEditingField(null)
      setFieldValue("")
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" })
    } finally {
      setSavingField(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this beat?")) return
    setDeleting(true)
    try {
      const { error } = await supabase
        .from("beats")
        .delete()
        .eq("id", id)
      if (error) throw error
      toast({ title: "Beat deleted!" })
      router.push("/dashboard/business_producer?tab=mybeats")
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" })
    } finally {
      setDeleting(false)
    }
  }

  const downloadFile = (url: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  const startEditPrice = (licenseId: string, current: number) => {
    setEditingPrice(licenseId)
    setPriceValue(current?.toString() ?? "")
  }
  const cancelEditPrice = () => {
    setEditingPrice(null)
    setPriceValue("")
  }
  const savePrice = async (license: any) => {
    setSavingField(true)
    try {
      const priceKey = license.priceKey
      const updateData: any = {}
      updateData[priceKey] = Number(priceValue)
      const { error } = await supabase
        .from("beats")
        .update(updateData)
        .eq("id", id)
      if (error) throw error
      toast({ title: `Updated ${license.label} price!` })
      setBeat((prev: any) => ({ ...prev, ...updateData }))
      setEditingPrice(null)
      setPriceValue("")
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" })
    } finally {
      setSavingField(false)
    }
  }
  const handleBuy = (licenseId: string) => {
    setSelectedLicense(licenseId)
    setShowPurchaseModal(true)
  }

  const handlePurchase = async (licenseId: string, price: number) => {
    if (!beat) return
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beatId: beat.id,
          licenseType: licenseId,
          price: price ?? 0,
          productName: beat.title,
          userId: user ? user.id : null,
          guestEmail: !user ? null : null
        })
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        toast({ title: 'Stripe Error', description: data.error || 'Could not start checkout', variant: 'destructive' })
      }
    } catch (e) {
      toast({ title: 'Stripe Error', description: 'Could not start checkout', variant: 'destructive' })
    }
  }

  const handlePlay = () => {
    if (!beat) return;
    if (currentBeat?.id === beat.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentBeat({
        id: beat.id,
        title: beat.title,
        artist: producers.length > 0 ? producers[0].display_name : beat.producer_id || '',
        audioUrl: beat.mp3_url,
        image: beat.cover_art_url,
        producers: producers.map((p: any) => ({ display_name: p.display_name, slug: p.slug })),
      });
      setIsPlaying(true);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader className="animate-spin h-8 w-8 text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-red-500">{error}</div>
    )
  }

  if (!beat) return null

  return (
    <div className="min-h-screen w-full flex flex-col items-center px-4 py-10" style={{ background: '#141414' }}>
      <Card className="max-w-2xl w-full bg-black border-primary shadow-lg p-6">
        <CardHeader className="flex flex-col items-center pb-0">
          {beat.cover_art_url && (
            <img
              src={beat.cover_art_url}
              alt="Cover Art"
              className="w-64 h-64 sm:w-80 sm:h-80 object-cover rounded-lg border-4 border-primary mb-6 shadow-2xl cursor-pointer"
              onClick={handlePlay}
              aria-label="Play/Pause Beat"
              style={{ cursor: 'pointer' }}
            />
          )}
          <CardTitle className="text-5xl font-extrabold text-primary mb-4 flex items-center gap-3">
            {user && beat.producer_id === user.id ? (
              editingField === "title" ? (
              <div className="flex items-center gap-2 w-full">
                <Input name="title" value={fieldValue} onChange={handleFieldChange} className="text-2xl font-bold" />
                <Button size="icon" onClick={saveField} disabled={savingField}><Save /></Button>
                <Button size="icon" onClick={cancelEdit} variant="ghost"><X /></Button>
              </div>
            ) : (
              <span
                className="flex items-center gap-2 group w-full cursor-pointer"
                onClick={() => editingField !== "title" && startEdit("title")}
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' && editingField !== "title") startEdit("title") }}
                style={{ outline: 'none' }}
              >
                {beat.title}
                <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 transition" tabIndex={-1} onClick={e => { e.stopPropagation(); startEdit("title"); }}> <Edit className="h-5 w-5" /> </Button>
              </span>
              )
            ) : (
              <span>{beat.title}</span>
            )}
            <Button size="icon" variant="ghost" onClick={handlePlay} aria-label="Play" className="ml-2">
              {currentBeat?.id === beat.id && isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            </Button>
          </CardTitle>
          {/* Real waveform between beat name and display name */}
          {beat.mp3_url && (
            <div className="w-full flex justify-center mb-4">
              <AudioWaveform audioUrl={beat.mp3_url} />
            </div>
          )}
          <div className="h-6" />
          {producers.length > 0 ? (
            <div className="flex flex-wrap gap-4 justify-center items-center">
              {producers.map((prod: any) => (
                <Link key={prod.user_id} href={`/producers/${prod.slug}`} className="group flex items-center gap-2 transition-transform duration-200 hover:scale-105 focus:scale-105">
                  {prod.profile_image_url && (
                    <Image src={prod.profile_image_url} alt="Producer Avatar" width={40} height={40} className="rounded-full object-cover transition-transform duration-200" />
              )}
              <span className="text-lg font-semibold text-gray-300 transition-transform duration-200">
                    {prod.display_name}
              </span>
            </Link>
              ))}
            </div>
          ) : (
            <span className="text-lg font-semibold text-gray-300">NO PRODUCER FOUND</span>
          )}
          {!user || beat.producer_id !== user.id ? (
            <>
              <div className="h-4" />
              {user ? (
              <Button
                className="gradient-button text-black font-medium hover:text-white mb-4"
                onClick={() => setShowPurchaseModal(true)}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                BUY
              </Button>
              ) : (
                <Button
                  className="gradient-button text-black font-medium hover:text-white mb-4"
                  onClick={() => setShowPurchaseModal(true)}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  BUY INSTANTLY
                </Button>
              )}
            </>
          ) : null}
          <CardDescription className="text-lg text-muted-foreground text-center w-full">
            {user && beat.producer_id === user.id ? (
              editingField === "description" ? (
              <div className="flex items-center gap-2 w-full">
                <Textarea name="description" value={fieldValue} onChange={handleFieldChange} />
                <Button size="icon" onClick={saveField} disabled={savingField}><Save /></Button>
                <Button size="icon" onClick={cancelEdit} variant="ghost"><X /></Button>
              </div>
            ) : (
              <span
                className="flex items-center gap-2 group w-full cursor-pointer"
                onClick={() => editingField !== "description" && startEdit("description")}
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' && editingField !== "description") startEdit("description") }}
                style={{ outline: 'none' }}
              >
                {beat.description}
                <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 transition" tabIndex={-1} onClick={e => { e.stopPropagation(); startEdit("description"); }}> <Edit className="h-4 w-4" /> </Button>
              </span>
              )
            ) : (
              <span>{beat.description}</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {user && beat.producer_id === user.id && (
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 mt-8 justify-center bg-secondary/40 p-4 rounded-xl shadow-inner w-full">
              {beat.mp3_url && <Button variant="outline" className="w-full sm:w-auto" onClick={() => downloadFile(beat.mp3_url)}><Download className="mr-2 h-4 w-4" />Download MP3</Button>}
              {beat.wav_url && <Button variant="outline" className="w-full sm:w-auto" onClick={() => downloadFile(beat.wav_url)}><Download className="mr-2 h-4 w-4" />Download WAV</Button>}
              {beat.stems_url && <Button variant="outline" className="w-full sm:w-auto" onClick={() => downloadFile(beat.stems_url)}><Download className="mr-2 h-4 w-4" />Download Stems</Button>}
              {beat.cover_art_url && <Button variant="outline" className="w-full sm:w-auto" onClick={() => downloadFile(beat.cover_art_url)}><Download className="mr-2 h-4 w-4" />Download Cover Art</Button>}
            </div>
          )}
          {user && beat.producer_id === user.id && (
            <div className="flex flex-col sm:flex-row gap-2 mt-10 justify-center w-full">
              <Button onClick={handleDelete} variant="destructive" disabled={deleting} className="w-full sm:w-auto"><Trash2 className="mr-2 h-4 w-4" />{deleting ? "Deleting..." : "Delete"}</Button>
          </div>
          )}
        </CardContent>
      </Card>
      <Card className="max-w-2xl w-full bg-black border-primary shadow-lg p-6 mt-8">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary">Beat Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {editableFields.filter(f => ["genre","bpm","key","tags"].includes(f.key)).map(field => (
              <div key={field.key} className={`flex items-center justify-between p-2 rounded bg-secondary/60 hover:bg-secondary transition group ${editingField === field.key ? 'ring-2 ring-primary bg-secondary' : ''}`}> 
                <span className="font-semibold text-gray-300 w-32">{field.label}:</span>
                {user && beat.producer_id === user.id ? (
                <span className="flex-1 flex items-center gap-2 justify-end w-full cursor-pointer" 
                  onClick={() => editingField !== field.key && startEdit(field.key)}
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' && editingField !== field.key) startEdit(field.key) }}
                  style={{ outline: 'none' }}
                >
                  {editingField === field.key ? (
                    <>
                      {field.type === "input" ? (
                        <Input name={field.key} value={fieldValue} onChange={handleFieldChange} />
                      ) : (
                        <Textarea name={field.key} value={fieldValue} onChange={handleFieldChange} className="text-xs" />
                      )}
                      <Button size="icon" onClick={saveField} disabled={savingField}><Save /></Button>
                      <Button size="icon" onClick={cancelEdit} variant="ghost"><X /></Button>
                    </>
                  ) : (
                    <>
                      {field.key === "tags"
                        ? (Array.isArray(beat.tags) ? beat.tags.join(", ") : String(beat.tags))
                          : beat[field.key]}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition"
                        tabIndex={-1}
                        onClick={e => { e.stopPropagation(); startEdit(field.key); }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </span>
                ) : (
                  <span className="flex-1 flex items-center gap-2 justify-end w-full">
                    {field.key === "tags"
                      ? (Array.isArray(beat.tags) ? beat.tags.join(", ") : String(beat.tags))
                        : beat[field.key]}
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card className="max-w-2xl w-full bg-black border-primary shadow-lg p-6 mt-8">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary">Licenses & Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4">
            {licenseOptions.map(opt => {
              let jsonKey = '';
              if (opt.id === 'lease') jsonKey = 'template-lease';
              if (opt.id === 'premium') jsonKey = 'template-premium-lease';
              if (opt.id === 'exclusive') jsonKey = 'template-exclusive';
              if (opt.id === 'buyout') jsonKey = 'template-buy-out';
              const price = getLicensePrice(beat, opt.priceKey, jsonKey);
              return (
                <div key={opt.id} className={`flex items-center justify-between p-4 rounded-lg bg-secondary/60 hover:bg-secondary transition group ${editingPrice === opt.id ? 'ring-2 ring-primary bg-secondary' : ''}`}>
                  <span className="font-semibold text-gray-300 w-56">{opt.label}:</span>
                  {user && beat.producer_id === user.id ? (
                  <span className="flex-1 flex items-center gap-2 justify-end w-full cursor-pointer"
                    onClick={() => editingPrice !== opt.id && startEditPrice(opt.id, price ?? 0)}
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter' && editingPrice !== opt.id) startEditPrice(opt.id, price ?? 0) }}
                    style={{ outline: 'none' }}
                  >
                    {editingPrice === opt.id ? (
                      <>
                        <Input type="number" value={priceValue} onChange={e => setPriceValue(e.target.value)} className="w-24" />
                        <Button size="icon" onClick={() => savePrice(opt)} disabled={savingField}><Save /></Button>
                        <Button size="icon" onClick={cancelEditPrice} variant="ghost"><X /></Button>
                      </>
                    ) : (
                      <>
                        <span className="text-lg">{price != null ? `$${price}` : 'N/A'}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="opacity-0 group-hover:opacity-100 transition"
                          tabIndex={-1}
                          onClick={e => { e.stopPropagation(); startEditPrice(opt.id, price ?? 0); }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          className="ml-2 bg-[#FFD700] hover:bg-[#FFE55C] text-black font-semibold rounded"
                          onClick={e => { e.stopPropagation(); handlePurchase(opt.id, price ?? 0); }}
                        >
                          Checkout
                        </Button>
                      </>
                    )}
                  </span>
                  ) : (
                    <span className="flex-1 flex items-center gap-2 justify-end w-full">
                      <span className="text-lg">{price != null ? `$${price}` : 'N/A'}</span>
                      <Button
                        size="sm"
                        className="ml-2 bg-[#FFD700] hover:bg-[#FFE55C] text-black font-semibold rounded"
                        onClick={e => { e.stopPropagation(); handlePurchase(opt.id, price ?? 0); }}
                      >
                        Checkout
                      </Button>
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
      <PurchaseOptionsModal 
        isOpen={showPurchaseModal} 
        onClose={() => setShowPurchaseModal(false)} 
        beat={beat ? {
          id: String(beat.id),
          title: beat.title,
          price: getLicensePrice(beat, 'price_lease', 'template-lease') ?? 0,
          price_lease: getLicensePrice(beat, 'price_lease', 'template-lease') ?? 0,
          price_premium_lease: getLicensePrice(beat, 'price_premium_lease', 'template-premium-lease') ?? 0,
          price_exclusive: getLicensePrice(beat, 'price_exclusive', 'template-exclusive') ?? 0,
          price_buyout: getLicensePrice(beat, 'price_buyout', 'template-buy-out') ?? 0,
        } : null}
      />
      <Card className="max-w-2xl w-full bg-black border-primary shadow-lg p-6 mt-8">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary">Beat Rating</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center">
            {beat && beat.id && (
            <BeatRating
              beatId={beat.id}
              initialAverageRating={ratingData.averageRating}
              initialTotalRatings={ratingData.totalRatings}
            />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 