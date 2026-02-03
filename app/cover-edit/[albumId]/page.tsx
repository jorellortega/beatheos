"use client"

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Sparkles, Upload, Download, Loader2, Image as ImageIcon, Crop, Settings } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { OpenAIService } from '@/lib/ai-services'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Album {
  id: string
  title: string
  artist: string
  cover_art_url: string
}

type CoverSize = '1600x1600' | '3000x3000' | '16:9' | '9:16'

export default function CoverEditPage() {
  const params = useParams() || {}
  const albumId = params && 'albumId' in params ? (Array.isArray(params.albumId) ? params.albumId[0] : params.albumId) : ''
  const router = useRouter()
  const { toast } = useToast()
  const { user, getAccessToken } = useAuth()
  
  const [album, setAlbum] = useState<Album | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Cover generation state
  const [generatingCover, setGeneratingCover] = useState(false)
  const [regeneratingSize, setRegeneratingSize] = useState<CoverSize | null>(null)
  const [coverPrompt, setCoverPrompt] = useState('')
  const [showGenerateDialog, setShowGenerateDialog] = useState(false)
  const [referenceImage, setReferenceImage] = useState<File | null>(null)
  const [referencePreview, setReferencePreview] = useState<string | null>(null)
  
  // Cover size/format
  const [selectedSize, setSelectedSize] = useState<CoverSize>('1600x1600')
  const [currentCoverUrl, setCurrentCoverUrl] = useState<string | null>(null)
  const [generatedCovers, setGeneratedCovers] = useState<Record<CoverSize, string | null>>({
    '1600x1600': null,
    '3000x3000': null,
    '16:9': null,
    '9:16': null
  })
  
  // Crop state
  const [cropImage, setCropImage] = useState<HTMLImageElement | null>(null)
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [showCropDialog, setShowCropDialog] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const [cropCanvasRef, setCropCanvasRef] = useState<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (albumId) {
      fetchAlbum()
    }
  }, [albumId])

  const fetchAlbum = async () => {
    try {
      const { data, error } = await supabase
        .from('albums')
        .select('id, title, artist, cover_art_url')
        .eq('id', albumId)
        .single()

      if (error) throw error

      setAlbum(data)
      setCurrentCoverUrl(data.cover_art_url)
      if (data.title && data.artist) {
        setCoverPrompt(`Create a professional album cover art for "${data.title}" by ${data.artist}. The cover should be visually striking and suitable for a music release.`)
      }
      setLoading(false)
    } catch (error: any) {
      console.error('Error fetching album:', error)
      toast({
        title: "Error",
        description: "Failed to load album data.",
        variant: "destructive"
      })
      setLoading(false)
    }
  }

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
      default:
        return { width: 1600, height: 1600 }
    }
  }

  const handleReferenceImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setReferenceImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setReferencePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeReferenceImage = () => {
    setReferenceImage(null)
    setReferencePreview(null)
  }

  const handleGenerateCover = async () => {
    if (!album || !user?.id || !coverPrompt.trim()) {
      toast({
        title: "Error",
        description: "Please provide a cover art description.",
        variant: "destructive"
      })
      return
    }

    setGeneratingCover(true)

    try {
      // Get AI settings - fetch all settings and create a map
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

      // Build prompt with reference image context if provided
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

        const filePath = `albums/${album.id}/${Date.now()}_cover_${selectedSize}.png`
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
            albumId: album.id,
            size: selectedSize
          })
        })

        if (!downloadResponse.ok) {
          throw new Error('Failed to download and store image')
        }

        const { url } = await downloadResponse.json()
        publicUrl = url
      }

      // Update album with new cover
      const { error: updateError } = await supabase
        .from('albums')
        .update({ cover_art_url: publicUrl })
        .eq('id', album.id)

      if (updateError) throw updateError

      setCurrentCoverUrl(publicUrl)
      setAlbum(prev => prev ? { ...prev, cover_art_url: publicUrl } : null)
      
      // Track the generated cover for this size
      setGeneratedCovers(prev => ({
        ...prev,
        [selectedSize]: publicUrl
      }))

      toast({
        title: "Success",
        description: `Cover art generated for ${selectedSize} format!`,
      })

      setShowGenerateDialog(false)
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

  const handleRegenerateToSize = async (targetSize: CoverSize) => {
    if (!currentCoverUrl || !album) {
      toast({
        title: "Error",
        description: "No existing cover to regenerate from.",
        variant: "destructive"
      })
      return
    }

    setRegeneratingSize(targetSize)

    try {
      // Get AI settings - fetch all settings and create a map
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

      // Use existing cover as reference to regenerate in new size
      const dims = getSizeDimensions(targetSize)
      const prompt = `Regenerate the album cover art for "${album.title}" by ${album.artist} in ${targetSize} aspect ratio (${dims.width} × ${dims.height} pixels). Maintain the same visual style, color palette, composition, and artistic vision as the original cover, but adapt it perfectly to the new ${targetSize === '16:9' ? 'landscape' : targetSize === '9:16' ? 'portrait' : 'square'} dimensions.`

      const response = await OpenAIService.generateImage({
        prompt: prompt,
        style: 'cinematic, professional album cover, maintain visual consistency',
        model: model,
        apiKey: apiKey,
      })

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to regenerate cover art')
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

        const filePath = `albums/${album.id}/${Date.now()}_cover_${targetSize}.png`
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
            albumId: album.id,
            size: targetSize
          })
        })

        if (!downloadResponse.ok) {
          throw new Error('Failed to download and store image')
        }

        const { url } = await downloadResponse.json()
        publicUrl = url
      }

      // Update current cover URL so it can be viewed and cropped
      setCurrentCoverUrl(publicUrl)
      
      // Track the generated cover for this size
      setGeneratedCovers(prev => ({
        ...prev,
        [targetSize]: publicUrl
      }))

      toast({
        title: "Success",
        description: `Cover art regenerated for ${targetSize} format!`,
      })

      // Note: This doesn't update the main album cover_art_url
      // User can crop and download this version if needed
    } catch (error: any) {
      console.error('Error regenerating cover:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to regenerate cover art.",
        variant: "destructive"
      })
    } finally {
      setRegeneratingSize(null)
    }
  }

  // Crop functionality (similar to existing implementation)
  const openCropDialog = async () => {
    if (!currentCoverUrl) {
      toast({
        title: "Error",
        description: "No cover art available to crop.",
        variant: "destructive"
      })
      return
    }

    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = currentCoverUrl
      })

      setCropImage(img)
      const dims = getSizeDimensions(selectedSize)
      const cropSize = Math.min(img.width, img.height) * 0.8
      const cropX = (img.width - cropSize) / 2
      const cropY = (img.height - cropSize) / 2
      
      setCropBox({ x: cropX, y: cropY, width: cropSize, height: cropSize })
      setShowCropDialog(true)
    } catch (error) {
      console.error('Error loading image:', error)
      toast({
        title: "Error",
        description: "Failed to load cover art for cropping.",
        variant: "destructive"
      })
    }
  }

  // Redraw canvas with crop overlay
  useEffect(() => {
    if (!cropCanvasRef || !cropImage) return
    
    const ctx = cropCanvasRef.getContext('2d', { willReadFrequently: false })
    if (!ctx) return
    
    const maxWidth = 800
    const maxHeight = 600
    const scale = Math.min(maxWidth / cropImage.width, maxHeight / cropImage.height, 1)
    const displayWidth = cropImage.width * scale
    const displayHeight = cropImage.height * scale
    
    if (cropCanvasRef.width !== displayWidth || cropCanvasRef.height !== displayHeight) {
      cropCanvasRef.width = displayWidth
      cropCanvasRef.height = displayHeight
    }
    
    ctx.clearRect(0, 0, cropCanvasRef.width, cropCanvasRef.height)
    ctx.drawImage(cropImage, 0, 0, cropCanvasRef.width, cropCanvasRef.height)
    
    if (cropBox.width > 0 && cropBox.height > 0) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
      ctx.fillRect(0, 0, cropCanvasRef.width, cropCanvasRef.height)
      
      const scaleX = cropCanvasRef.width / cropImage.width
      const scaleY = cropCanvasRef.height / cropImage.height
      const cropX = cropBox.x * scaleX
      const cropY = cropBox.y * scaleY
      const cropW = cropBox.width * scaleX
      const cropH = cropBox.height * scaleY
      
      ctx.save()
      ctx.globalCompositeOperation = 'destination-out'
      ctx.fillRect(cropX, cropY, cropW, cropH)
      ctx.restore()
      
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 3
      ctx.strokeRect(cropX, cropY, cropW, cropH)
      
      const handleSize = 12
      ctx.fillStyle = '#3b82f6'
      ctx.fillRect(cropX - handleSize/2, cropY - handleSize/2, handleSize, handleSize)
      ctx.fillRect(cropX + cropW - handleSize/2, cropY - handleSize/2, handleSize, handleSize)
      ctx.fillRect(cropX - handleSize/2, cropY + cropH - handleSize/2, handleSize, handleSize)
      ctx.fillRect(cropX + cropW - handleSize/2, cropY + cropH - handleSize/2, handleSize, handleSize)
    }
  }, [cropCanvasRef, cropImage, cropBox])

  const handleCropMouseDown = (e: React.MouseEvent) => {
    if (!cropImage || !cropCanvasRef) return
    
    e.preventDefault()
    const rect = cropCanvasRef.getBoundingClientRect()
    const scaleX = cropImage.width / cropCanvasRef.width
    const scaleY = cropImage.height / cropCanvasRef.height
    
    const mouseX = (e.clientX - rect.left) * scaleX
    const mouseY = (e.clientY - rect.top) * scaleY
    
    const cropX = cropBox.x
    const cropY = cropBox.y
    const cropW = cropBox.width
    const cropH = cropBox.height
    
    const resizeHandleSize = 50 * scaleX
    const nearBottomRight = 
      mouseX > cropX + cropW - resizeHandleSize && 
      mouseX < cropX + cropW + resizeHandleSize &&
      mouseY > cropY + cropH - resizeHandleSize && 
      mouseY < cropY + cropH + resizeHandleSize
    
    if (nearBottomRight) {
      setIsResizing(true)
    } else if (mouseX >= cropX && mouseX <= cropX + cropW && mouseY >= cropY && mouseY <= cropY + cropH) {
      setIsDragging(true)
    } else {
      const dims = getSizeDimensions(selectedSize)
      const aspectRatio = dims.width / dims.height
      let newWidth = Math.min(cropW, cropImage.width - mouseX, cropImage.height - mouseY, mouseX, mouseY) * 1.8
      let newHeight = newWidth / aspectRatio
      
      if (newHeight > cropImage.height || newWidth > cropImage.width) {
        newHeight = Math.min(cropImage.height - mouseY, mouseY) * 1.8
        newWidth = newHeight * aspectRatio
      }
      
      const clampedWidth = Math.max(50, Math.min(newWidth, cropImage.width))
      const clampedHeight = clampedWidth / aspectRatio
      
      setCropBox({
        x: Math.max(0, Math.min(cropImage.width - clampedWidth, mouseX - clampedWidth / 2)),
        y: Math.max(0, Math.min(cropImage.height - clampedHeight, mouseY - clampedHeight / 2)),
        width: clampedWidth,
        height: clampedHeight
      })
      return
    }
    
    dragStartRef.current = { x: e.clientX, y: e.clientY }
  }

  useEffect(() => {
    if (!isDragging && !isResizing) return
    if (!cropImage || !cropCanvasRef) return

    const handleMouseMove = (e: MouseEvent) => {
      const scaleX = cropImage.width / cropCanvasRef.width
      const scaleY = cropImage.height / cropCanvasRef.height

      const deltaX = (e.clientX - dragStartRef.current.x) * scaleX
      const deltaY = (e.clientY - dragStartRef.current.y) * scaleY

      if (isDragging) {
        setCropBox(prevBox => {
          const dims = getSizeDimensions(selectedSize)
          const aspectRatio = dims.width / dims.height
          return {
            ...prevBox,
            x: Math.max(0, Math.min(cropImage.width - prevBox.width, prevBox.x + deltaX)),
            y: Math.max(0, Math.min(cropImage.height - prevBox.height, prevBox.y + deltaY))
          }
        })
      } else if (isResizing) {
        setCropBox(prevBox => {
          const dims = getSizeDimensions(selectedSize)
          const aspectRatio = dims.width / dims.height
          const newWidth = Math.max(50, Math.min(cropImage.width - prevBox.x, prevBox.width + deltaX))
          const newHeight = newWidth / aspectRatio
          return {
            ...prevBox,
            width: newWidth,
            height: newHeight,
            x: Math.max(0, Math.min(cropImage.width - newWidth, prevBox.x)),
            y: Math.max(0, Math.min(cropImage.height - newHeight, prevBox.y))
          }
        })
      }

      dragStartRef.current = { x: e.clientX, y: e.clientY }
    }
    
    const handleMouseUp = () => {
      setIsDragging(false)
      setIsResizing(false)
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, isResizing, cropImage, cropCanvasRef, selectedSize])

  const applyCropAndDownload = () => {
    if (!cropImage) return

    try {
      const dims = getSizeDimensions(selectedSize)
      const canvas = document.createElement('canvas')
      canvas.width = dims.width
      canvas.height = dims.height
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        throw new Error('Failed to get canvas context')
      }

      ctx.drawImage(
        cropImage,
        cropBox.x, cropBox.y, cropBox.width, cropBox.height,
        0, 0, dims.width, dims.height
      )

      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error('Failed to create image blob')
        }

        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${album?.title.replace(/[^a-z0-9]/gi, '_')}_cover_${selectedSize}.png`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        toast({
          title: "Success",
          description: `Cover art cropped to ${selectedSize} and downloaded!`,
        })

        setShowCropDialog(false)
      }, 'image/png')
    } catch (error) {
      console.error('Error applying crop:', error)
      toast({
        title: "Error",
        description: "Failed to crop and download cover art.",
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return <div className="container mx-auto py-8">Loading...</div>
  }

  if (!album) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">Album Not Found</h1>
        <Link href="/mylibrary">
          <Button variant="default">Back to Library</Button>
        </Link>
      </div>
    )
  }

  const dims = getSizeDimensions(selectedSize)

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href={`/myalbums/${albumId}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Album
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Cover Art Editor</h1>
            <p className="text-gray-400">{album.title} by {album.artist}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="generate" className="space-y-4">
        <TabsList>
          <TabsTrigger value="generate">Generate New</TabsTrigger>
          <TabsTrigger value="regenerate">Regenerate Sizes</TabsTrigger>
          <TabsTrigger value="crop">Crop Existing</TabsTrigger>
        </TabsList>

        <TabsContent value="generate">
          <Card>
            <CardHeader>
              <CardTitle>Generate New Cover Art</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Output Size</Label>
                <Select value={selectedSize} onValueChange={(value) => setSelectedSize(value as CoverSize)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1600x1600">1600 × 1600 px (Square)</SelectItem>
                    <SelectItem value="3000x3000">3000 × 3000 px (Square)</SelectItem>
                    <SelectItem value="16:9">16:9 (1920 × 1080 px)</SelectItem>
                    <SelectItem value="9:16">9:16 (1080 × 1920 px)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Reference Image (Optional)</Label>
                <div className="flex items-center gap-4 mt-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleReferenceImageChange}
                    className="flex-1"
                  />
                  {referencePreview && (
                    <div className="relative">
                      <img src={referencePreview} alt="Reference" className="w-24 h-24 object-cover rounded" />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={removeReferenceImage}
                        className="absolute -top-2 -right-2"
                      >
                        ×
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  Upload a reference image to guide the AI generation style
                </p>
              </div>

              <div>
                <Label>Cover Art Description</Label>
                <Textarea
                  value={coverPrompt}
                  onChange={(e) => setCoverPrompt(e.target.value)}
                  placeholder="Describe the cover art you want to generate..."
                  rows={4}
                />
              </div>

              <Button
                onClick={() => setShowGenerateDialog(true)}
                disabled={generatingCover}
                className="w-full"
              >
                {generatingCover ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Cover Art
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regenerate">
          <Card>
            <CardHeader>
              <CardTitle>Regenerate to Different Sizes</CardTitle>
              <p className="text-sm text-gray-400 mt-2">
                If you have an existing cover, regenerate it to different aspect ratios while maintaining the same style
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentCoverUrl && (
                <>
                  {/* Preview of current cover */}
                  <div className="flex justify-center mb-4">
                    <div className="relative border border-gray-700 rounded-lg overflow-hidden bg-gray-900">
                      <img 
                        src={currentCoverUrl} 
                        alt="Current cover art" 
                        className="max-w-full h-auto max-h-48 object-contain"
                      />
                      <div className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                        Current Cover
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {(['1600x1600', '3000x3000', '16:9', '9:16'] as CoverSize[]).map((size) => {
                      const generatedCover = generatedCovers[size]
                      return (
                        <Card key={size}>
                          <CardContent className="p-4 space-y-3">
                            <div>
                              <h3 className="font-semibold">{size}</h3>
                              <p className="text-sm text-gray-400">
                                {getSizeDimensions(size).width} × {getSizeDimensions(size).height} px
                              </p>
                            </div>
                            
                            {/* Show generated cover preview if it exists */}
                            {generatedCover && (
                              <div className="border border-gray-700 rounded-lg overflow-hidden bg-gray-900 aspect-square flex items-center justify-center">
                                <img 
                                  src={generatedCover} 
                                  alt={`Generated ${size} cover`} 
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            
                            <Button
                              onClick={() => handleRegenerateToSize(size)}
                              disabled={regeneratingSize !== null}
                              className="w-full"
                              variant="outline"
                            >
                              {regeneratingSize === size ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Regenerating...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-4 w-4 mr-2" />
                                  {generatedCover ? 'Regenerate' : 'Generate'}
                                </>
                              )}
                            </Button>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </>
              )}
              {!currentCoverUrl && (
                <p className="text-gray-400 text-center py-8">
                  No existing cover art found. Generate a new cover first.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="crop">
          <Card>
            <CardHeader>
              <CardTitle>Crop Existing Cover</CardTitle>
              <p className="text-sm text-gray-400 mt-2">
                Crop the current cover art to a specific size. The current cover is shown below.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentCoverUrl ? (
                <>
                  {/* Preview of current cover */}
                  <div className="flex justify-center">
                    <div className="relative border border-gray-700 rounded-lg overflow-hidden bg-gray-900">
                      <img 
                        src={currentCoverUrl} 
                        alt="Current cover art" 
                        className="max-w-full h-auto max-h-64 object-contain"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Output Size</Label>
                    <Select value={selectedSize} onValueChange={(value) => setSelectedSize(value as CoverSize)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1600x1600">1600 × 1600 px (Square)</SelectItem>
                        <SelectItem value="3000x3000">3000 × 3000 px (Square)</SelectItem>
                        <SelectItem value="16:9">16:9 (1920 × 1080 px)</SelectItem>
                        <SelectItem value="9:16">9:16 (1080 × 1920 px)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={openCropDialog} className="w-full">
                    <Crop className="h-4 w-4 mr-2" />
                    Open Crop Editor
                  </Button>
                </>
              ) : (
                <p className="text-gray-400 text-center py-8">
                  No existing cover art found. Generate a new cover first.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Generate Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Cover Art</DialogTitle>
            <DialogDescription>
              This will generate a new cover art in {selectedSize} format ({dims.width} × {dims.height} px)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {referencePreview && (
              <div>
                <Label>Reference Image</Label>
                <img src={referencePreview} alt="Reference" className="mt-2 w-full max-w-xs rounded" />
              </div>
            )}
            <div>
              <Label>Description</Label>
              <Textarea value={coverPrompt} onChange={(e) => setCoverPrompt(e.target.value)} rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerateCover} disabled={generatingCover || !coverPrompt.trim()}>
              {generatingCover ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Crop Dialog */}
      <Dialog open={showCropDialog} onOpenChange={(open) => {
        setShowCropDialog(open)
        if (!open) {
          setCropCanvasRef(null)
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crop Cover Art</DialogTitle>
            <DialogDescription>
              Drag the crop box to select the area. Output will be {dims.width} × {dims.height} px
            </DialogDescription>
          </DialogHeader>
          
          {cropImage && (
            <div className="space-y-4">
              <div className="border border-gray-700 rounded-lg overflow-hidden bg-gray-900 flex justify-center items-center" style={{ maxHeight: '70vh', minHeight: '400px' }}>
                <div className="relative inline-block">
                  <canvas
                    ref={(el) => {
                      if (el && !cropCanvasRef) {
                        setCropCanvasRef(el)
                      }
                    }}
                    className="max-w-full h-auto block"
                    style={{ 
                      cursor: isDragging ? 'move' : isResizing ? 'nwse-resize' : 'crosshair',
                      touchAction: 'none',
                      userSelect: 'none'
                    }}
                    onMouseDown={handleCropMouseDown}
                  />
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCropDialog(false)}>
              Cancel
            </Button>
            <Button onClick={applyCropAndDownload} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Download className="h-4 w-4 mr-2" />
              Download Cropped Image
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

