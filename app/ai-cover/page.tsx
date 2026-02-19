"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Sparkles, Download, Loader2, Image as ImageIcon } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { OpenAIService } from '@/lib/ai-services'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type CoverSize = '1600x1600' | '3000x3000' | '16:9' | '9:16'

export default function AICoverPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, getAccessToken } = useAuth()
  const [loading, setLoading] = useState(true)

  // Cover generation state
  const [generatingCover, setGeneratingCover] = useState(false)
  const [coverPrompt, setCoverPrompt] = useState('')
  const [selectedSize, setSelectedSize] = useState<CoverSize>('1600x1600')
  const [generatedCoverUrl, setGeneratedCoverUrl] = useState<string | null>(null)
  const [referenceImage, setReferenceImage] = useState<File | null>(null)
  const [referencePreview, setReferencePreview] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }
    setLoading(false)
  }, [user, router])

  const getSizeDimensions = (size: CoverSize): { width: number; height: number } => {
    switch (size) {
      case '1600x1600':
        return { width: 1600, height: 1600 }
      case '3000x3000':
        return { width: 3000, height: 3000 }
      case '16:9':
        return { width: 1920, height: 1080 }
      case '9:16':
        return { width: 1080, height: 1920 }
    }
  }

  const handleReferenceImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type.startsWith('image/')) {
        setReferenceImage(file)
        setReferencePreview(URL.createObjectURL(file))
      } else {
        toast({
          title: "Invalid File",
          description: "Please upload an image file.",
          variant: "destructive"
        })
      }
    }
  }

  const removeReferenceImage = () => {
    if (referencePreview) {
      URL.revokeObjectURL(referencePreview)
    }
    setReferenceImage(null)
    setReferencePreview(null)
  }

  const handleGenerateCover = async () => {
    if (!user?.id || !coverPrompt.trim()) {
      toast({
        title: "Error",
        description: "Please provide a cover art description.",
        variant: "destructive"
      })
      return
    }

    setGeneratingCover(true)

    try {
      // Get AI settings
      let settings: Record<string, string> = {}
      try {
        const { data: settingsData, error: settingsError } = await supabase
          .from('ai_settings')
          .select('setting_key, setting_value')

        if (!settingsError && settingsData) {
          for (const setting of settingsData) {
            settings[setting.setting_key] = setting.setting_value
          }
        }
      } catch (error) {
        console.warn('Could not fetch AI settings, using defaults:', error)
      }

      const imageModelKey = 'image_model'
      const model = settings[imageModelKey]?.trim() || 'gpt-image-1'

      let apiKey = settings['openai_api_key']?.trim()
      if (!apiKey) {
        const { data: userData } = await supabase
          .from('users')
          .select('openai_api_key')
          .eq('id', user.id)
          .single()
        apiKey = userData?.openai_api_key
      }
      if (!apiKey) {
        apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY
      }

      if (!apiKey) {
        throw new Error('OpenAI API key not configured')
      }

      // Build prompt
      let prompt = coverPrompt.trim()
      if (referenceImage) {
        prompt = `Using the provided reference image as a style guide, create a new ${selectedSize} album cover art: ${prompt}`
      }

      // Generate image
      const response = await OpenAIService.generateImage({
        prompt: prompt,
        style: 'cinematic, professional album cover',
        model: model,
        apiKey: apiKey,
      })

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to generate cover art')
      }

      const imageData = response.data.data?.[0]
      const imageUrl = imageData?.url || (imageData?.b64_json ? `data:image/png;base64,${imageData.b64_json}` : '')

      if (!imageUrl) {
        throw new Error('No image data received')
      }

      // Save to storage
      let publicUrl: string
      if (imageUrl.startsWith('data:')) {
        const base64Data = imageUrl.split(',')[1]
        const byteCharacters = atob(base64Data)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], { type: 'image/png' })

        const filePath = `ai-covers/${user.id}/${Date.now()}_cover_${selectedSize}.png`
        const { error: uploadError } = await supabase.storage
          .from('beats')
          .upload(filePath, blob, {
            contentType: 'image/png',
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) throw new Error('Failed to upload cover art to storage')

        const { data: { publicUrl: url } } = supabase.storage
          .from('beats')
          .getPublicUrl(filePath)
        
        publicUrl = url
      } else {
        const token = await getAccessToken()
        const downloadResponse = await fetch('/api/ai/download-and-store-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            imageUrl: imageUrl,
            fileName: `cover_${selectedSize}`,
            userId: user.id
          })
        })

        if (!downloadResponse.ok) {
          throw new Error('Failed to download and store image')
        }

        const { url } = await downloadResponse.json()
        publicUrl = url
      }

      setGeneratedCoverUrl(publicUrl)

      toast({
        title: "Success",
        description: `Cover art generated for ${selectedSize} format!`,
      })

      removeReferenceImage()
    } catch (error: any) {
      console.error('Error generating cover:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to generate cover art.",
        variant: "destructive"
      })
    } finally {
      setGeneratingCover(false)
    }
  }

  const handleDownload = () => {
    if (!generatedCoverUrl) return

    const a = document.createElement('a')
    a.href = generatedCoverUrl
    a.download = `ai_cover_${selectedSize}_${Date.now()}.png`
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    toast({
      title: "Success",
      description: "Cover art downloaded!",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#141414] text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-white hover:bg-gray-800">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#F4C430] to-[#E8E8E8] bg-clip-text text-transparent">
              Create AI Cover
            </h1>
            <p className="text-gray-400 mt-1">Generate stunning album covers with AI</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Generation Form */}
          <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border-[#2a2a2a]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#F4C430]" />
                Generate Cover Art
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="prompt" className="text-white mb-2 block">
                  Cover Art Description
                </Label>
                <Textarea
                  id="prompt"
                  value={coverPrompt}
                  onChange={(e) => setCoverPrompt(e.target.value)}
                  placeholder="Describe the album cover you want to create... e.g., 'A futuristic cityscape at night with neon lights, cyberpunk aesthetic, dark and moody'"
                  className="bg-[#0f0f0f] border-[#2a2a2a] text-white min-h-[120px]"
                />
              </div>

              <div>
                <Label htmlFor="size" className="text-white mb-2 block">
                  Cover Size
                </Label>
                <Select value={selectedSize} onValueChange={(value) => setSelectedSize(value as CoverSize)}>
                  <SelectTrigger className="bg-[#0f0f0f] border-[#2a2a2a] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a]">
                    <SelectItem value="1600x1600" className="text-white">1600x1600 (Square)</SelectItem>
                    <SelectItem value="3000x3000" className="text-white">3000x3000 (Square HD)</SelectItem>
                    <SelectItem value="16:9" className="text-white">16:9 (Landscape)</SelectItem>
                    <SelectItem value="9:16" className="text-white">9:16 (Portrait)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-gray-400 text-sm mt-2">
                  {getSizeDimensions(selectedSize).width} × {getSizeDimensions(selectedSize).height} pixels
                </p>
              </div>

              <div>
                <Label htmlFor="reference" className="text-white mb-2 block">
                  Reference Image (Optional)
                </Label>
                <Input
                  id="reference"
                  type="file"
                  accept="image/*"
                  onChange={handleReferenceImageChange}
                  className="bg-[#0f0f0f] border-[#2a2a2a] text-white"
                />
                {referencePreview && (
                  <div className="mt-4 relative">
                    <img
                      src={referencePreview}
                      alt="Reference preview"
                      className="max-w-full h-auto rounded-lg border border-[#2a2a2a]"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={removeReferenceImage}
                      className="absolute top-2 right-2"
                    >
                      Remove
                    </Button>
                  </div>
                )}
                <p className="text-gray-400 text-sm mt-2">
                  Upload an image to use as a style reference for your cover
                </p>
              </div>

              <Button
                onClick={handleGenerateCover}
                disabled={generatingCover || !coverPrompt.trim()}
                className="w-full bg-gradient-to-r from-[#F4C430] to-[#E8E8E8] text-black hover:from-[#E8E8E8] hover:to-[#F4C430] font-bold text-lg py-6"
              >
                {generatingCover ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Generate Cover Art
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border-[#2a2a2a]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-[#F4C430]" />
                Generated Cover
              </CardTitle>
            </CardHeader>
            <CardContent>
              {generatedCoverUrl ? (
                <div className="space-y-4">
                  <div className="relative rounded-lg overflow-hidden border border-[#2a2a2a]">
                    <img
                      src={generatedCoverUrl}
                      alt="Generated cover"
                      className="w-full h-auto"
                    />
                  </div>
                  <Button
                    onClick={handleDownload}
                    className="w-full bg-gradient-to-r from-[#F4C430] to-[#E8E8E8] text-black hover:from-[#E8E8E8] hover:to-[#F4C430] font-bold"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Cover
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <ImageIcon className="h-16 w-16 mb-4 opacity-50" />
                  <p className="text-center">
                    Your generated cover art will appear here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

