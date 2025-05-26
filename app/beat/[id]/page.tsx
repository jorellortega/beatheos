"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader, Download, Trash2, Save, Edit, X, ShoppingCart } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { PurchaseOptionsModal } from "@/components/PurchaseOptionsModal"
import { useAuth } from '@/contexts/AuthContext'
import Image from "next/image"
import { AudioWaveform } from "@/components/AudioWaveform"
import Link from 'next/link'

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

export default function BeatDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [beat, setBeat] = useState<any>(null)
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
  const [producer, setProducer] = useState<any>(null)
  const [producerUser, setProducerUser] = useState<any>(null)

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
    async function fetchProducer() {
      if (beat?.producer_id) {
        const { data: producerData } = await supabase
          .from('producers')
          .select('*')
          .eq('user_id', beat.producer_id)
          .single()
        setProducer(producerData)
        console.log('producer:', producerData);
        if (producerData?.user_id) {
          const { data: userData } = await supabase
            .from('users')
            .select('display_name')
            .eq('id', producerData.user_id)
            .single()
          setProducerUser(userData)
          console.log('producerUser:', userData);
        } else {
          setProducerUser(null)
          console.log('producerUser: null');
        }
      }
    }
    fetchProducer()
  }, [beat?.producer_id])

  const startEdit = (field: string) => {
    setEditingField(field)
    if (field === "tags") {
      setFieldValue(Array.isArray(beat.tags) ? beat.tags.join(", ") : String(beat.tags))
    } else if (field === "licensing") {
      setFieldValue(typeof beat.licensing === 'object' ? JSON.stringify(beat.licensing, null, 2) : String(beat.licensing))
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
          price,
          productName: beat.title,
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
              className="w-64 h-64 sm:w-80 sm:h-80 object-cover rounded-lg border-4 border-primary mb-6 shadow-2xl"
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
          </CardTitle>
          {/* Real waveform between beat name and display name */}
          {beat.mp3_url && (
            <div className="w-full flex justify-center mb-4">
              <AudioWaveform audioUrl={beat.mp3_url} />
            </div>
          )}
          <div className="h-6" />
          {producer?.user_id ? (
            <Link href={`/producers/${producer.slug}`} className="group flex items-center gap-2 transition-transform duration-200 hover:scale-105 focus:scale-105">
              {producer?.profile_image_url && (
                <Image src={producer.profile_image_url} alt="Producer Avatar" width={40} height={40} className="rounded-full object-cover transition-transform duration-200" />
              )}
              <span className="text-lg font-semibold text-gray-300 transition-transform duration-200">
                {producerUser?.display_name || producer?.display_name}
              </span>
            </Link>
          ) : (
            <>
              {producer?.profile_image_url && (
                <Image src={producer.profile_image_url} alt="Producer Avatar" width={40} height={40} className="rounded-full object-cover" />
              )}
              <span className="text-lg font-semibold text-gray-300">
                {producerUser?.display_name || producer?.display_name || 'NO DISPLAY NAME FOUND'}
              </span>
            </>
          )}
          {!user || beat.producer_id !== user.id ? (
            <>
              <div className="h-4" />
              <Button
                className="gradient-button text-black font-medium hover:text-white mb-4"
                onClick={() => setShowPurchaseModal(true)}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                BUY
              </Button>
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
            {editableFields.filter(f => ["genre","bpm","key","tags","licensing"].includes(f.key)).map(field => (
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
                        : field.key === "licensing"
                          ? <pre className="bg-secondary p-2 rounded text-xs inline-block m-0">{JSON.stringify(beat.licensing, null, 2)}</pre>
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
                      : field.key === "licensing"
                        ? <pre className="bg-secondary p-2 rounded text-xs inline-block m-0">{JSON.stringify(beat.licensing, null, 2)}</pre>
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
              const price = beat[opt.priceKey]
              return (
                <div key={opt.id} className={`flex items-center justify-between p-4 rounded-lg bg-secondary/60 hover:bg-secondary transition group ${editingPrice === opt.id ? 'ring-2 ring-primary bg-secondary' : ''}`}>
                  <span className="font-semibold text-gray-300 w-56">{opt.label}:</span>
                  {user && beat.producer_id === user.id ? (
                  <span className="flex-1 flex items-center gap-2 justify-end w-full cursor-pointer"
                    onClick={() => editingPrice !== opt.id && startEditPrice(opt.id, price)}
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter' && editingPrice !== opt.id) startEditPrice(opt.id, price) }}
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
                        <span className="text-lg">${price ?? 0}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="opacity-0 group-hover:opacity-100 transition"
                          tabIndex={-1}
                          onClick={e => { e.stopPropagation(); startEditPrice(opt.id, price); }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          className="ml-2 bg-[#FFD700] hover:bg-[#FFE55C] text-black font-semibold rounded"
                          onClick={e => { e.stopPropagation(); handlePurchase(opt.id, price); }}
                        >
                          Checkout
                        </Button>
                      </>
                    )}
                  </span>
                  ) : (
                    <span className="flex-1 flex items-center gap-2 justify-end w-full">
                      <span className="text-lg">${price ?? 0}</span>
                      <Button
                        size="sm"
                        className="ml-2 bg-[#FFD700] hover:bg-[#FFE55C] text-black font-semibold rounded"
                        onClick={e => { e.stopPropagation(); handlePurchase(opt.id, price); }}
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
        beat={{
          id: beat.id,
          title: beat.title,
          price: beat.price,
          price_lease: beat.price_lease,
          price_premium_lease: beat.price_premium_lease,
          price_exclusive: beat.price_exclusive,
          price_buyout: beat.price_buyout,
        }}
      />
    </div>
  )
} 