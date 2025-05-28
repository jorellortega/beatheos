"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { MockBeatUploadForm } from "@/components/beat-upload/MockBeatUploadForm"
import { AdminControls } from "@/components/beat-upload/AdminControls"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { HelpCircle } from "lucide-react"
import Link from "next/link"
import { toast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabaseClient"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { LicensingOptions } from '@/components/beat-upload/LicensingOptions'

interface BeatUploadForm {
  title: string
  description: string
  genre: string
  bpm: string
  key: string
  tags: string[]
  mp3File: File | null
  wavFile: File | null
  stemsFile: File | null
  coverArt: File | null
  licensing: Record<string, number>
}

async function uploadFile(file: File, type: 'mp3' | 'wav' | 'stems' | 'cover'): Promise<string> {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Math.random()}.${fileExt}`
  const filePath = `${type}/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('beats')
    .upload(filePath, file)

  if (uploadError) {
    throw new Error(`Error uploading ${type} file: ${uploadError.message}`)
  }

  const { data: { publicUrl } } = supabase.storage
    .from('beats')
    .getPublicUrl(filePath)

  return publicUrl
}

export default function UploadBeatPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [form, setForm] = useState<BeatUploadForm>({
    title: '',
    description: '',
    genre: '',
    bpm: '',
    key: '',
    tags: [],
    mp3File: null,
    wavFile: null,
    stemsFile: null,
    coverArt: null,
    licensing: {}
  })
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  useEffect(() => {
    if (!user) {
      router.push("/login")
    } else {
      // Check if user is admin (this would be a call to your backend in a real app)
      setIsAdmin(user.role === "admin")
    }
  }, [user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setUploading(true)
    setUploadProgress(0)

    try {
      // Upload files first
      const mp3Url = form.mp3File ? await uploadFile(form.mp3File, 'mp3') : null
      const wavUrl = form.wavFile ? await uploadFile(form.wavFile, 'wav') : null
      const stemsUrl = form.stemsFile ? await uploadFile(form.stemsFile, 'stems') : null
      const coverArtUrl = form.coverArt ? await uploadFile(form.coverArt, 'cover') : null

      // Create beat record
      const { data: beat, error: beatError } = await supabase
        .from('beats')
        .insert({
          producer_id: user.id,
          title: form.title,
          description: form.description,
          genre: form.genre,
          bpm: parseInt(form.bpm),
          key: form.key,
          tags: form.tags,
          mp3_url: mp3Url,
          wav_url: wavUrl,
          stems_url: stemsUrl,
          cover_art_url: coverArtUrl,
          is_draft: false
        })
        .select()
        .single()

      if (beatError) throw beatError

      // Create beat_licenses records for each selected license
      const licenseInserts = Object.entries(form.licensing).map(([licenseId, price]) => ({
        beat_id: beat.id,
        license_id: licenseId,
        price: price
      }))

      const { error: licenseError } = await supabase
        .from('beat_licenses')
        .insert(licenseInserts)

      if (licenseError) throw licenseError

      toast({
        title: "Success",
        description: "Beat uploaded successfully!",
      })

      // Reset form
      setForm({
        title: '',
        description: '',
        genre: '',
        bpm: '',
        key: '',
        tags: [],
        mp3File: null,
        wavFile: null,
        stemsFile: null,
        coverArt: null,
        licensing: {}
      })

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload beat",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  if (!user) {
    return null // or a loading spinner
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold font-display tracking-wider text-primary">Upload Your Beat</h1>
        <Button variant="outline" asChild>
          <Link href="/upload-guidelines">
            <HelpCircle className="mr-2 h-4 w-4" />
            Upload Guidelines
          </Link>
        </Button>
      </div>

      <Card className="w-full bg-card border-primary">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary">Beat Details</CardTitle>
        </CardHeader>
        <CardContent>
          <MockBeatUploadForm />
        </CardContent>
      </Card>

      {isAdmin && (
        <Card className="w-full bg-card border-primary mt-8">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary">Admin Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminControls />
          </CardContent>
        </Card>
      )}

      <div className="mt-8">
        <h2 className="text-xl font-bold text-primary mb-4">Licensing Options</h2>
        <ul className="space-y-4">
          <li className="flex items-center justify-between">
            <div>
              <h3 className="font-bold">Lease License</h3>
              <p className="text-sm text-gray-400">Non-exclusive license for limited commercial use</p>
            </div>
            <Button variant="outline" className="ml-4">Upload Custom License</Button>
          </li>
          <li className="flex items-center justify-between">
            <div>
              <h3 className="font-bold">Premium Lease License</h3>
              <p className="text-sm text-gray-400">Non-exclusive license for broader commercial use</p>
            </div>
            <Button variant="outline" className="ml-4">Upload Custom License</Button>
          </li>
          <li className="flex items-center justify-between">
            <div>
              <h3 className="font-bold">Exclusive License</h3>
              <p className="text-sm text-gray-400">Exclusive rights—once purchased, the beat is removed from the marketplace</p>
            </div>
            <Button variant="outline" className="ml-4">Upload Custom License</Button>
          </li>
          <li className="flex items-center justify-between">
            <div>
              <h3 className="font-bold">Buy Out License</h3>
              <p className="text-sm text-gray-400">Full ownership transfer—buyer gains complete ownership, including resale rights</p>
            </div>
            <Button variant="outline" className="ml-4">Upload Custom License</Button>
          </li>
        </ul>
      </div>
    </div>
  )
}

