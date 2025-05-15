"use client"

import { useEffect, useState, useRef } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import Image from "next/image"

export default function CEOBrandingPage() {
  const { user } = useAuth()
  const [branding, setBranding] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) return
    if (user.role !== "ceo") return
    fetchBranding()
  }, [user])

  async function fetchBranding() {
    setLoading(true)
    const { data, error } = await supabase.from("branding").select("*").order('id', { ascending: true }).limit(1)
    if (error) setError(error.message)
    setBranding(data?.[0] || null)
    setLoading(false)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Upload to Supabase Storage (optional, or use base64 for demo)
    const fileName = `ceo/logo_${Date.now()}_${file.name}`
    const { data: storageData, error: storageError } = await supabase.storage.from('beats').upload(fileName, file, { upsert: true })
    if (storageError) { setError(storageError.message); return }
    const { data: urlData } = supabase.storage.from('beats').getPublicUrl(fileName)
    const image_url = urlData?.publicUrl
    if (!image_url) { setError("Failed to get public URL"); return }
    // Insert or update branding row
    if (branding) {
      await supabase.from("branding").update({ image_url }).eq("id", branding.id)
    } else {
      await supabase.from("branding").insert({ image_url })
    }
    fetchBranding()
  }

  async function handleDelete() {
    if (!branding) return
    await supabase.from("branding").delete().eq("id", branding.id)
    setBranding(null)
  }

  if (!user) return <div className="p-8 text-center">Loading...</div>
  if (user.role !== "ceo") return <div className="p-8 text-center text-red-500 font-bold">Access Denied</div>

  return (
    <div className="container mx-auto px-4 py-12 max-w-xl">
      <h1 className="text-3xl font-bold mb-6 text-primary">Branding Admin</h1>
      {error && <div className="mb-4 text-red-500">{error}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="space-y-6">
          {branding ? (
            <div className="flex flex-col items-center gap-4">
              <Image src={branding.image_url} alt="Logo" width={180} height={72} className="rounded shadow" />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>Replace Logo</Button>
                <Button variant="destructive" onClick={handleDelete}>Delete Logo</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="text-gray-400">No logo uploaded yet.</div>
              <Button onClick={() => fileInputRef.current?.click()}>Upload Logo</Button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
        </div>
      )}
    </div>
  )
} 