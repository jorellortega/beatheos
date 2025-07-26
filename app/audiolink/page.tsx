'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { FileAudio, Link, Download, Upload, Music, FileText, Search, Filter, RefreshCw, X, Package, ChevronDown, Play, Pause, Volume2, Trash2 } from 'lucide-react'

interface AudioFile {
  id: string
  name: string
  type: string
  description?: string
  file_url?: string
  file_size?: number
  pack_id?: string
  subfolder?: string
  pack?: {
    id: string
    name: string
    color: string
  }
  bpm?: number
  key?: string
  audio_type?: string
  genre?: string
  subgenre?: string
  additional_subgenres?: string[]
  tags?: string[]
  is_ready?: boolean
  instrument_type?: string
  mood?: string
  energy_level?: number
  complexity?: number
  tempo_category?: string
  key_signature?: string
  time_signature?: string
  duration?: number
  sample_rate?: number
  bit_depth?: number
  license_type?: string
  is_new?: boolean
  distribution_type?: string
  external_storage?: {
    provider: string
    bucket: string
    folder?: string
  }
  created_at: string
  updated_at: string
  linked_files?: string[]
  conversion_status?: 'pending' | 'processing' | 'completed' | 'failed'
}

interface AudioPack {
  id: string
  name: string
  description?: string
  cover_image_url?: string
  color: string
  created_at: string
  updated_at: string
  item_count?: number
}

interface FileLink {
  id: string
  original_file_id: string
  converted_file_id: string
  original_format: string
  converted_format: string
  link_type?: 'conversion' | 'external_copy'
  created_at: string
}

export default function AudioLinkPage() {
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([])
  const [audioPacks, setAudioPacks] = useState<AudioPack[]>([])
  const [fileLinks, setFileLinks] = useState<FileLink[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingPacks, setLoadingPacks] = useState(false)
  const [converting, setConverting] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterFormat, setFilterFormat] = useState('all')
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [linkTargetFile, setLinkTargetFile] = useState<string>('')
  const [expandedPacks, setExpandedPacks] = useState<Set<string>>(new Set())
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)
  const [formatView, setFormatView] = useState<Record<string, string>>({})
  const [showCompressionDialog, setShowCompressionDialog] = useState(false)
  const [compressionFile, setCompressionFile] = useState<{ id: string; url: string } | null>(null)
  const [showCopyDialog, setShowCopyDialog] = useState(false)
  const [copyFile, setCopyFile] = useState<{ id: string; url: string; name: string } | null>(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [filesPerPage] = useState(20)
  const [hasMoreFiles, setHasMoreFiles] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [allAudioFiles, setAllAudioFiles] = useState<AudioFile[]>([])
  
  const { toast } = useToast()

  useEffect(() => {
    fetchAudioFiles(1, filesPerPage)
    fetchAudioPacks()
    fetchFileLinks()
  }, [])

  // Cleanup audio when component unmounts
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause()
        audioElement.currentTime = 0
      }
    }
  }, [audioElement])

  const loadMoreFiles = async () => {
    if (loadingMore || !hasMoreFiles) return
    
    setLoadingMore(true)
    const nextPage = Math.floor(audioFiles.length / filesPerPage) + 1
    await fetchAudioFiles(nextPage, filesPerPage)
  }

  const refreshFiles = () => {
    setCurrentPage(1)
    fetchAudioFiles(1, filesPerPage)
  }

  const fetchAudioFiles = async (page: number = 1, limit: number = filesPerPage) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to access your audio files.",
          variant: "destructive"
        })
        return
      }

      console.log('Fetching audio files for user:', user.id, 'page:', page, 'limit:', limit)

      const from = (page - 1) * limit
      const to = from + limit - 1

      const { data, error, count } = await supabase
        .from('audio_library_items')
        .select(`
          *,
          pack:audio_packs(id, name, color)
        `, { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      console.log('Fetched audio files:', data?.length || 0, 'files, total count:', count)

      if (page === 1) {
        // First page - replace all files
        setAudioFiles(data || [])
        setAllAudioFiles(data || [])
      } else {
        // Subsequent pages - append to existing files
        setAudioFiles(prev => [...prev, ...(data || [])])
        setAllAudioFiles(prev => [...prev, ...(data || [])])
      }

      // Check if there are more files to load
      const totalFiles = count || 0
      const loadedFiles = (page * limit)
      setHasMoreFiles(loadedFiles < totalFiles)

    } catch (error) {
      console.error('Error fetching audio files:', error)
      toast({
        title: "Error",
        description: "Failed to fetch audio files.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const fetchAudioPacks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return
      }

      setLoadingPacks(true)
      console.log('Fetching audio packs for user:', user.id)

      const { data, error } = await supabase
        .from('audio_packs')
        .select(`
          *,
          item_count:audio_library_items(count)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase error fetching packs:', error)
        throw error
      }

      console.log('Fetched audio packs:', data?.length || 0, 'packs')
      setAudioPacks(data || [])
    } catch (error) {
      console.error('Error fetching audio packs:', error)
    } finally {
      setLoadingPacks(false)
    }
  }

  const fetchFileLinks = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        console.warn('No access token available')
        return
      }

      const response = await fetch('/api/audio/links', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      if (!response.ok) throw new Error('Failed to fetch file links')
      
      const { links } = await response.json()
      console.log('Fetched file links:', links)
      setFileLinks(links || [])
    } catch (error) {
      console.error('Error fetching file links:', error)
    }
  }

  const getFileExtension = (fileUrl: string | undefined | null) => {
    if (!fileUrl) return ''
    // Extract extension from URL or filename
    const urlParts = fileUrl.split('/')
    const filename = urlParts[urlParts.length - 1]
    return filename.split('.').pop()?.toLowerCase() || ''
  }

  const getFileType = (fileUrl: string | undefined | null) => {
    if (!fileUrl) return 'other'
    const ext = getFileExtension(fileUrl)
    if (['mp3', 'wav', 'flac', 'aiff'].includes(ext)) return 'audio'
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return 'image'
    return 'other'
  }

  const showCompressionOptions = (fileId: string, filePath: string) => {
    setCompressionFile({ id: fileId, url: filePath })
    setShowCompressionDialog(true)
  }

  const showCopyOptions = (fileId: string, filePath: string, fileName: string) => {
    setCopyFile({ id: fileId, url: filePath, name: fileName })
    setShowCopyDialog(true)
  }

  const copyToExternalStorage = async (fileId: string, filePath: string, storageProvider: 'aws-s3' | 'google-cloud' | 'azure' | 'dropbox', bucketName: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No access token available')
      }

      const response = await fetch('/api/audio/copy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          fileId,
          filePath,
          storageProvider,
          bucketName
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Copy failed')
      }

      const result = await response.json()
      
      // Refresh files and links
      await Promise.all([fetchAudioFiles(), fetchFileLinks()])
      
      toast({
        title: "Copy successful",
        description: `File copied to ${storageProvider} bucket: ${bucketName}`,
      })
    } catch (error) {
      console.error('Error copying file:', error)
      toast({
        title: "Copy failed",
        description: error instanceof Error ? error.message : "Failed to copy file.",
        variant: "destructive"
      })
    }
  }

  const convertToMp3 = async (fileId: string, filePath: string, compressionLevel: 'ultra_high' | 'high' | 'medium' | 'low' = 'medium') => {
    setConverting(fileId)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No access token available')
      }

      const response = await fetch('/api/audio/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          fileId,
          filePath,
          targetFormat: 'mp3',
          compressionLevel
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Conversion failed')
      }

      const result = await response.json()
      
      // Refresh files and links
      await Promise.all([fetchAudioFiles(), fetchFileLinks()])
      
      toast({
        title: "Conversion successful",
        description: `File has been converted to MP3 format with ${compressionLevel} compression.`,
      })
    } catch (error) {
      console.error('Error converting file:', error)
      toast({
        title: "Conversion failed",
        description: error instanceof Error ? error.message : "Failed to convert file.",
        variant: "destructive"
      })
    } finally {
      setConverting(null)
    }
  }

  const linkFiles = async (sourceFileId: string, targetFileId: string) => {
    try {
      const sourceFile = audioFiles.find(f => f.id === sourceFileId)
      const targetFile = audioFiles.find(f => f.id === targetFileId)
      
      if (!sourceFile || !targetFile) {
        throw new Error('One or both files not found')
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No access token available')
      }

      const response = await fetch('/api/audio/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          originalFileId: sourceFileId,
          convertedFileId: targetFileId,
          originalFormat: getFileExtension(sourceFile.file_url),
          convertedFormat: getFileExtension(targetFile.file_url)
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to link files')
      }

      await fetchFileLinks()
      setShowLinkDialog(false)
      setSelectedFiles([])
      setLinkTargetFile('')
      
      toast({
        title: "Files linked",
        description: "Files have been successfully linked.",
      })
    } catch (error) {
      console.error('Error linking files:', error)
      toast({
        title: "Linking failed",
        description: error instanceof Error ? error.message : "Failed to link files.",
        variant: "destructive"
      })
    }
  }

  const filteredFiles = audioFiles.filter(file => {
    // Skip files without required properties
    if (!file || !file.name || !file.file_url) {
      return false
    }
    
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFormat = filterFormat === 'all' || getFileExtension(file.file_url) === filterFormat
    return matchesSearch && matchesFormat
  })

  // Selection functions
  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    )
  }

  const selectAllFiles = () => {
    setSelectedFiles(filteredFiles.map(file => file.id))
  }

  const deselectAllFiles = () => {
    setSelectedFiles([])
  }

  // Pack-specific selection functions
  const selectAllFilesInPack = (packId: string) => {
    const packFiles = allAudioFiles.filter(file => file.pack_id === packId)
    const packFileIds = packFiles.map(file => file.id)
    setSelectedFiles(prev => [...new Set([...prev, ...packFileIds])])
  }

  const deselectAllFilesInPack = (packId: string) => {
    const packFiles = allAudioFiles.filter(file => file.pack_id === packId)
    const packFileIds = packFiles.map(file => file.id)
    setSelectedFiles(prev => prev.filter(id => !packFileIds.includes(id)))
  }

  const isAllSelectedInPack = (packId: string) => {
    const packFiles = allAudioFiles.filter(file => file.pack_id === packId)
    const packFileIds = packFiles.map(file => file.id)
    return packFileIds.length > 0 && packFileIds.every(id => selectedFiles.includes(id))
  }

  const isSomeSelectedInPack = (packId: string) => {
    const packFiles = allAudioFiles.filter(file => file.pack_id === packId)
    const packFileIds = packFiles.map(file => file.id)
    return packFileIds.some(id => selectedFiles.includes(id))
  }

  // Global selection state
  const isAllSelected = filteredFiles.length > 0 && selectedFiles.length === filteredFiles.length
  const isSomeSelected = selectedFiles.length > 0 && selectedFiles.length < filteredFiles.length
  
  const getLinkedFiles = (fileId: string) => {
    const linked = fileLinks.filter(link => 
      link.original_file_id === fileId || link.converted_file_id === fileId
    )
    console.log(`Linked files for ${fileId}:`, linked)
    return linked
  }

  const getCurrentFile = (file: AudioFile) => {
    const linkedFiles = getLinkedFiles(file.id)
    if (linkedFiles.length === 0) return file

    const currentFormat = formatView[file.id] || getFileExtension(file.file_url || '')
    const originalFormat = getFileExtension(file.file_url || '')
    
    console.log(`getCurrentFile for ${file.name}:`, {
      currentFormat,
      originalFormat,
      originalSize: file.file_size,
      linkedFiles: linkedFiles.length,
      formatView: formatView[file.id]
    })

    // If we're viewing the original format, return the original file
    if (currentFormat === originalFormat) {
      console.log(`Returning original file: ${file.name} (${file.file_size} bytes)`)
      return file
    } else {
      // We want to view the other format, so find the linked file
      const link = linkedFiles[0]
      const linkedFileId = link.original_file_id === file.id ? link.converted_file_id : link.original_file_id
      const linkedFile = audioFiles.find(f => f.id === linkedFileId)
      
      console.log(`Looking for linked file:`, {
        link,
        linkedFileId,
        linkedFile: linkedFile ? `${linkedFile.name} (${linkedFile.file_size} bytes)` : 'NOT FOUND',
        allAudioFiles: audioFiles.length,
        availableFileIds: audioFiles.map(f => f.id).slice(0, 5)
      })
      
      if (linkedFile) {
        console.log(`Returning linked file: ${linkedFile.name} (${linkedFile.file_size} bytes)`)
        return linkedFile
      } else {
        console.log(`Linked file not found, returning original: ${file.name}`)
        return file
      }
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const deleteFileLink = async (linkId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No access token available')
      }

      const response = await fetch(`/api/audio/links?id=${linkId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete link')
      }

      await fetchFileLinks()
      
      toast({
        title: "Link deleted",
        description: "File link has been removed.",
      })
    } catch (error) {
      console.error('Error deleting file link:', error)
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete link.",
        variant: "destructive"
      })
    }
  }

  const deleteFile = async (fileId: string, fileName: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No access token available')
      }

      const response = await fetch(`/api/audio/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          fileId,
          fileName
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete file')
      }

      // Refresh the file list and file links
      await Promise.all([refreshFiles(), fetchFileLinks()])
      
      toast({
        title: "File deleted",
        description: `${fileName} has been permanently deleted.`,
      })
    } catch (error) {
      console.error('Error deleting file:', error)
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete file.",
        variant: "destructive"
      })
    }
  }

  const togglePackExpansion = (packId: string) => {
    const newExpanded = new Set(expandedPacks)
    if (newExpanded.has(packId)) {
      newExpanded.delete(packId)
    } else {
      newExpanded.add(packId)
    }
    setExpandedPacks(newExpanded)
  }

  const playAudio = async (fileId: string, fileUrl: string) => {
    try {
      // Stop any currently playing audio
      if (audioElement) {
        audioElement.pause()
        audioElement.currentTime = 0
      }

      // If clicking the same file, just stop it
      if (playingAudio === fileId) {
        setPlayingAudio(null)
        setAudioElement(null)
        return
      }

      // Create new audio element
      const audio = new Audio(fileUrl)
      
      audio.addEventListener('ended', () => {
        setPlayingAudio(null)
        setAudioElement(null)
      })

      audio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e)
        toast({
          title: "Playback Error",
          description: "Failed to play audio file.",
          variant: "destructive"
        })
        setPlayingAudio(null)
        setAudioElement(null)
      })

      await audio.play()
      setPlayingAudio(fileId)
      setAudioElement(audio)
    } catch (error) {
      console.error('Error playing audio:', error)
      toast({
        title: "Playback Error",
        description: "Failed to play audio file.",
        variant: "destructive"
      })
    }
  }

  const downloadFile = async (fileId: string, fileName: string, fileUrl: string) => {
    try {
      const response = await fetch(fileUrl)
      if (!response.ok) {
        throw new Error('Failed to fetch file for download')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Download started",
        description: `${fileName} is being downloaded.`,
      })
    } catch (error) {
      console.error('Error downloading file:', error)
      toast({
        title: "Download failed",
        description: "Failed to download file.",
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading audio files...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audio Link Manager</h1>
          <p className="text-muted-foreground">
            Convert and link your audio files across different formats
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={refreshFiles} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Files
          </Button>
          <Button onClick={fetchFileLinks} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Links
          </Button>
        </div>
      </div>

      <Tabs defaultValue="files" className="space-y-4">
        <TabsList>
          <TabsTrigger value="files">Audio Files</TabsTrigger>
          <TabsTrigger value="packs">By Packs</TabsTrigger>
          <TabsTrigger value="links">File Links</TabsTrigger>
          <TabsTrigger value="debug">Debug</TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="space-y-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search files..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterFormat} onValueChange={setFilterFormat}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All formats</SelectItem>
                <SelectItem value="wav">WAV</SelectItem>
                <SelectItem value="mp3">MP3</SelectItem>
                <SelectItem value="flac">FLAC</SelectItem>
                <SelectItem value="aiff">AIFF</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Selection controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={isAllSelected ? deselectAllFiles : selectAllFiles}
                >
                  {isAllSelected ? 'Deselect All' : 'Select All'}
                </Button>
                {selectedFiles.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {selectedFiles.length} of {filteredFiles.length} selected
                  </span>
                )}
              </div>
            </div>
            {selectedFiles.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Bulk convert selected files to MP3
                    selectedFiles.forEach(fileId => {
                      const file = audioFiles.find(f => f.id === fileId)
                      if (file && file.file_url) {
                        showCompressionOptions(fileId, file.file_url)
                      }
                    })
                  }}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Convert Selected to MP3
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Bulk download selected files
                    selectedFiles.forEach(fileId => {
                      const file = audioFiles.find(f => f.id === fileId)
                      if (file && file.file_url) {
                        downloadFile(fileId, file.name, file.file_url)
                      }
                    })
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Bulk delete selected files
                    if (confirm(`Are you sure you want to delete ${selectedFiles.length} files?`)) {
                      selectedFiles.forEach(fileId => {
                        const file = audioFiles.find(f => f.id === fileId)
                        if (file) {
                          deleteFile(fileId, file.name)
                        }
                      })
                      setSelectedFiles([])
                    }
                  }}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
                </Button>
              </div>
            )}
          </div>


          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredFiles.map((file) => {
              // Add safety checks for file properties
              if (!file || !file.file_url) {
                console.warn('File or file_url is missing:', file)
                return null
              }
              
              const currentFile = getCurrentFile(file)
              const fileExt = getFileExtension(currentFile.file_url)
              const fileType = getFileType(currentFile.file_url)
              const linkedFiles = getLinkedFiles(file.id)
              const isConverting = converting === file.id
              
              console.log(`Rendering card for ${file.name}:`, {
                originalFile: `${file.name} (${file.file_size} bytes)`,
                currentFile: `${currentFile.name} (${currentFile.file_size} bytes)`,
                formatView: formatView[file.id],
                fileExt,
                isSameFile: file.id === currentFile.id,
                linkedFilesCount: linkedFiles.length
              })

              return (
                <Card key={file.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedFiles.includes(file.id)}
                          onChange={() => toggleFileSelection(file.id)}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-sm truncate">{currentFile.name}</CardTitle>
                          <CardDescription className="text-xs">
                            {currentFile.file_size ? formatFileSize(currentFile.file_size) : 'Unknown size'} • {fileExt.toUpperCase()}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {linkedFiles.length > 0 && (
                          <Badge variant="secondary" className="bg-green-600 text-white text-xs px-2 py-0.5">
                            LINKED
                          </Badge>
                        )}
                        {file.is_new && (
                          <Badge variant="secondary" className="bg-blue-600 text-white text-xs px-2 py-0.5">
                            NEW
                          </Badge>
                        )}
                        {file.external_storage && (
                          <Badge variant="outline" className="text-orange-600 border-orange-600 text-xs px-2 py-0.5">
                            {file.external_storage.provider.toUpperCase()}
                          </Badge>
                        )}
                        <Badge variant={fileType === 'audio' ? 'default' : 'secondary'} className="text-xs">
                          {fileExt.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    {currentFile.bpm && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Music className="h-3 w-3 flex-shrink-0" />
                        <span>{currentFile.bpm} BPM</span>
                        {currentFile.key && <span>• {currentFile.key}</span>}
                      </div>
                    )}
                    
                    {currentFile.genre && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <FileText className="h-3 w-3 flex-shrink-0" />
                        <span>{currentFile.genre}</span>
                      </div>
                    )}

                    {linkedFiles.length > 0 && (
                      <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
                        <div className="text-center">
                          <div className="text-sm font-medium text-foreground mb-2">Switch Format</div>
                          <div className="flex items-center justify-center gap-4">
                            <div className="text-center">
                              <div className={`text-lg font-bold ${(formatView[file.id] || getFileExtension(file.file_url || '')) === 'wav' ? 'text-blue-600' : 'text-muted-foreground'}`}>
                                WAV
                              </div>
                              <div className="text-xs text-muted-foreground">High Quality</div>
                            </div>
                            
                            <div 
                              className="relative inline-flex h-8 w-16 items-center rounded-full bg-gray-200 cursor-pointer shadow-inner transition-colors hover:bg-gray-300"
                              onClick={() => {
                                const currentFormat = formatView[file.id] || getFileExtension(file.file_url || '')
                                const newFormat = currentFormat === 'wav' ? 'mp3' : 'wav'
                                setFormatView(prev => ({ ...prev, [file.id]: newFormat }))
                              }}
                            >
                              <div 
                                className={`h-6 w-6 transform rounded-full bg-[#141414] shadow-md transition-all duration-200 ease-in-out ${
                                  (formatView[file.id] || getFileExtension(file.file_url || '')) === 'mp3' 
                                    ? 'translate-x-8' 
                                    : 'translate-x-1'
                                }`}
                              />
                            </div>
                            
                            <div className="text-center">
                              <div className={`text-lg font-bold ${(formatView[file.id] || getFileExtension(file.file_url || '')) === 'mp3' ? 'text-green-600' : 'text-muted-foreground'}`}>
                                MP3
                              </div>
                              <div className="text-xs text-muted-foreground">Compressed</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {fileType === 'audio' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => playAudio(currentFile.id, currentFile.file_url || '')}
                          className="flex-shrink-0"
                        >
                          {playingAudio === currentFile.id ? (
                            <>
                              <Pause className="h-3 w-3 mr-2" />
                              Stop
                            </>
                          ) : (
                            <>
                              <Play className="h-3 w-3 mr-2" />
                              Play
                            </>
                          )}
                        </Button>
                      )}
                      
                      {fileType === 'audio' && fileExt !== 'mp3' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => showCompressionOptions(file.id, file.file_url || '')}
                          disabled={isConverting}
                          className="flex-shrink-0"
                        >
                          {isConverting ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary mr-2"></div>
                              Converting...
                            </>
                          ) : (
                            <>
                              <Upload className="h-3 w-3 mr-2" />
                              Convert to MP3
                            </>
                          )}
                        </Button>
                      )}
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedFiles([file.id])
                          setShowLinkDialog(true)
                        }}
                        className="flex-shrink-0"
                      >
                        <Link className="h-3 w-3 mr-2" />
                        Link
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => showCopyOptions(file.id, file.file_url || '', file.name)}
                        className="flex-shrink-0"
                      >
                        <Upload className="h-3 w-3 mr-2" />
                        Copy
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadFile(file.id, currentFile.name, currentFile.file_url || '')}
                        className="flex-shrink-0"
                      >
                        <Download className="h-3 w-3 mr-2" />
                        Download
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteFile(file.id, file.name)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    {isConverting && (
                      <Progress value={50} className="w-full" />
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {filteredFiles.length === 0 && (
            <Alert>
              <AlertDescription>
                No audio files found. {searchTerm && 'Try adjusting your search terms.'}
              </AlertDescription>
            </Alert>
          )}

          {hasMoreFiles && (
            <div className="flex justify-center mt-6">
              <Button onClick={loadMoreFiles} disabled={loadingMore}>
                {loadingMore ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Load More
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="packs" className="space-y-4">
          {/* Selection controls for packs */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={isAllSelected ? deselectAllFiles : selectAllFiles}
                >
                  {isAllSelected ? 'Deselect All' : 'Select All'}
                </Button>
                {selectedFiles.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {selectedFiles.length} of {allAudioFiles.length} selected
                  </span>
                )}
              </div>
            </div>
            {selectedFiles.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Bulk convert selected files to MP3
                    selectedFiles.forEach(fileId => {
                      const file = audioFiles.find(f => f.id === fileId)
                      if (file && file.file_url) {
                        showCompressionOptions(fileId, file.file_url)
                      }
                    })
                  }}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Convert Selected to MP3
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Bulk download selected files
                    selectedFiles.forEach(fileId => {
                      const file = audioFiles.find(f => f.id === fileId)
                      if (file && file.file_url) {
                        downloadFile(fileId, file.name, file.file_url)
                      }
                    })
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Bulk delete selected files
                    if (confirm(`Are you sure you want to delete ${selectedFiles.length} files?`)) {
                      selectedFiles.forEach(fileId => {
                        const file = audioFiles.find(f => f.id === fileId)
                        if (file) {
                          deleteFile(fileId, file.name)
                        }
                      })
                      setSelectedFiles([])
                    }
                  }}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
                </Button>
              </div>
            )}
          </div>

          {loadingPacks ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading packs...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {audioPacks.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No audio packs found. Create some packs in your library first.
                  </AlertDescription>
                </Alert>
              ) : (
                audioPacks.map((pack) => {
                  const packFiles = allAudioFiles.filter(file => file.pack_id === pack.id)
                  console.log(`Pack ${pack.name} (${pack.id}): ${packFiles.length} files`, packFiles.map(f => ({ name: f.name, pack_id: f.pack_id })))
                  const filteredPackFiles = packFiles.filter(file => {
                    if (!file || !file.name || !file.file_url) return false
                    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase())
                    const matchesFormat = filterFormat === 'all' || getFileExtension(file.file_url) === filterFormat
                    return matchesSearch && matchesFormat
                  })
                  const isExpanded = expandedPacks.has(pack.id)

                  return (
                    <Card key={pack.id} className="overflow-hidden">
                      <CardHeader 
                        className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors" 
                        style={{ borderBottomColor: pack.color + '20' }}
                        onClick={() => togglePackExpansion(pack.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: pack.color }}
                            />
                            <div>
                              <CardTitle className="text-lg">{pack.name}</CardTitle>
                              <CardDescription>
                                {packFiles.length} file{packFiles.length !== 1 ? 's' : ''}
                                {pack.description && ` • ${pack.description}`}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {filteredPackFiles.length} shown
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => isAllSelectedInPack(pack.id) ? deselectAllFilesInPack(pack.id) : selectAllFilesInPack(pack.id)}
                              className="text-xs"
                            >
                              {isAllSelectedInPack(pack.id) ? 'Deselect Pack' : 'Select Pack'}
                            </Button>
                            <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                              <ChevronDown className="h-4 w-4" />
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      
                      {isExpanded && (
                        <CardContent className="pt-4">
                          {filteredPackFiles.length > 0 ? (
                            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                              {filteredPackFiles.map((file) => {
                                const currentFile = getCurrentFile(file)
                                const fileExt = getFileExtension(currentFile.file_url)
                                const fileType = getFileType(currentFile.file_url)
                                const linkedFiles = getLinkedFiles(file.id)
                                const isConverting = converting === file.id

                                return (
                                  <Card key={file.id} className="relative border-l-4" style={{ borderLeftColor: pack.color }}>
                                    <CardHeader className="pb-2">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-start gap-2 flex-1 min-w-0">
                                          <input
                                            type="checkbox"
                                            checked={selectedFiles.includes(file.id)}
                                            onChange={() => toggleFileSelection(file.id)}
                                            className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                          />
                                          <div className="flex-1 min-w-0">
                                            <CardTitle className="text-sm truncate">{currentFile.name}</CardTitle>
                                            <CardDescription className="text-xs">
                                              {currentFile.file_size ? formatFileSize(currentFile.file_size) : 'Unknown size'} • {fileExt.toUpperCase()}
                                            </CardDescription>
                                          </div>
                                        </div>
                                        <Badge variant={fileType === 'audio' ? 'default' : 'secondary'} className="text-xs flex-shrink-0">
                                          {fileExt.toUpperCase()}
                                        </Badge>
                                      </div>
                                    </CardHeader>
                                    
                                    <CardContent className="space-y-2">
                                      {currentFile.bpm && (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          <Music className="h-3 w-3" />
                                          <span>{currentFile.bpm} BPM</span>
                                          {currentFile.key && <span>• {currentFile.key}</span>}
                                        </div>
                                      )}
                                      
                                      {currentFile.genre && (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          <FileText className="h-3 w-3" />
                                          <span>{currentFile.genre}</span>
                                        </div>
                                      )}

                                      {linkedFiles.length > 0 && (
                                        <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
                                          <div className="text-center">
                                            <div className="text-sm font-medium text-foreground mb-2">Switch Format</div>
                                            <div className="flex items-center justify-center gap-4">
                                              <div className="text-center">
                                                <div className={`text-lg font-bold ${(formatView[file.id] || getFileExtension(file.file_url || '')) === 'wav' ? 'text-blue-600' : 'text-muted-foreground'}`}>
                                                  WAV
                                                </div>
                                                <div className="text-xs text-muted-foreground">High Quality</div>
                                              </div>
                                              
                                              <div 
                                                className="relative inline-flex h-8 w-16 items-center rounded-full bg-gray-200 cursor-pointer shadow-inner transition-colors hover:bg-gray-300"
                                                onClick={() => {
                                                  const currentFormat = formatView[file.id] || getFileExtension(file.file_url || '')
                                                  const newFormat = currentFormat === 'wav' ? 'mp3' : 'wav'
                                                  setFormatView(prev => ({ ...prev, [file.id]: newFormat }))
                                                }}
                                              >
                                                <div 
                                                  className={`h-6 w-6 transform rounded-full bg-[#141414] shadow-md transition-all duration-200 ease-in-out ${
                                                    (formatView[file.id] || getFileExtension(file.file_url || '')) === 'mp3' 
                                                      ? 'translate-x-8' 
                                                      : 'translate-x-1'
                                                  }`}
                                                />
                                              </div>
                                              
                                              <div className="text-center">
                                                <div className={`text-lg font-bold ${(formatView[file.id] || getFileExtension(file.file_url || '')) === 'mp3' ? 'text-green-600' : 'text-muted-foreground'}`}>
                                                  MP3
                                                </div>
                                                <div className="text-xs text-muted-foreground">Compressed</div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      <div className="flex flex-wrap gap-2 pt-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => playAudio(file.id, currentFile.file_url || '')}
                                          className="flex-shrink-0"
                                        >
                                          {playingAudio === file.id ? (
                                            <>
                                              <Pause className="h-3 w-3 mr-2" />
                                              Stop
                                            </>
                                          ) : (
                                            <>
                                              <Play className="h-3 w-3 mr-2" />
                                              Play
                                            </>
                                          )}
                                        </Button>
                                        
                                        {getFileExtension(file.file_url || '') === 'wav' && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => showCompressionOptions(file.id, file.file_url || '')}
                                            disabled={isConverting}
                                            className="flex-shrink-0"
                                          >
                                            {isConverting ? (
                                              <>
                                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary mr-2"></div>
                                                Converting...
                                              </>
                                            ) : (
                                              <>
                                                <Upload className="h-3 w-3 mr-2" />
                                                Convert to MP3
                                              </>
                                            )}
                                          </Button>
                                        )}
                                        
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            setSelectedFiles([file.id])
                                            setShowLinkDialog(true)
                                          }}
                                          className="flex-shrink-0"
                                        >
                                          <Link className="h-3 w-3 mr-2" />
                                          Link
                                        </Button>
                                        
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => showCopyOptions(file.id, file.file_url || '', file.name)}
                                          className="flex-shrink-0"
                                        >
                                          <Upload className="h-3 w-3 mr-2" />
                                          Copy
                                        </Button>
                                        
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => downloadFile(file.id, currentFile.name, currentFile.file_url || '')}
                                          className="flex-shrink-0"
                                        >
                                          <Download className="h-3 w-3 mr-2" />
                                          Download
                                        </Button>
                                        
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => deleteFile(file.id, file.name)}
                                          className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>

                                      {isConverting && (
                                        <Progress value={50} className="w-full" />
                                      )}
                                    </CardContent>
                                  </Card>
                                )
                              })}
                            </div>
                          ) : (
                            <Alert>
                              <AlertDescription>
                                {packFiles.length === 0 
                                  ? `No files found in this pack.` 
                                  : `No files match your current search/filter criteria.`
                                }
                              </AlertDescription>
                            </Alert>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  )
                })
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="links" className="space-y-4">
          <div className="space-y-4">
            {fileLinks.map((link) => {
              const originalFile = audioFiles.find(f => f.id === link.original_file_id)
              const convertedFile = audioFiles.find(f => f.id === link.converted_file_id)

              return (
                <Card key={link.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-sm">
                          <div className="font-medium">{originalFile?.name || 'Unknown File'}</div>
                          <div className="text-muted-foreground">{link.original_format?.toUpperCase() || 'UNKNOWN'}</div>
                        </div>
                        <Link className="h-4 w-4 text-muted-foreground" />
                        <div className="text-sm">
                          <div className="font-medium">{convertedFile?.name || 'Unknown File'}</div>
                          <div className="text-muted-foreground">{link.converted_format?.toUpperCase() || 'UNKNOWN'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          Linked
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteFileLink(link.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            {fileLinks.length === 0 && (
              <Alert>
                <AlertDescription>
                  No file links found. Create links between your audio files to organize them better.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </TabsContent>

        <TabsContent value="debug" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Debug Information</CardTitle>
              <CardDescription>Current state of files and links</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">File Links ({fileLinks.length})</h4>
                <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-40">
                  {JSON.stringify(fileLinks, null, 2)}
                </pre>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Audio Files ({audioFiles.length})</h4>
                <div className="space-y-2">
                  {audioFiles.slice(0, 5).map(file => (
                    <div key={file.id} className="text-xs">
                      <strong>{file.name}</strong> (ID: {file.id})
                      <br />
                      Pack ID: {file.pack_id || 'NO PACK'}
                      <br />
                      Linked files: {getLinkedFiles(file.id).length}
                    </div>
                  ))}
                  {audioFiles.length > 5 && (
                    <div className="text-xs text-muted-foreground">
                      ... and {audioFiles.length - 5} more files
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Files Without Pack ID</h4>
                <div className="space-y-1">
                  {audioFiles.filter(file => !file.pack_id).map(file => (
                    <div key={file.id} className="text-xs">
                      <strong>{file.name}</strong> (ID: {file.id}) - {getFileExtension(file.file_url).toUpperCase()}
                    </div>
                  ))}
                  {audioFiles.filter(file => !file.pack_id).length === 0 && (
                    <div className="text-xs text-muted-foreground">All files have pack IDs</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Audio Files</DialogTitle>
            <DialogDescription>
              Select a target file to link with the selected source file.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Source File</Label>
              <div className="text-sm text-muted-foreground mt-1">
                {audioFiles.find(f => f.id === selectedFiles[0])?.name || 'Unknown file'}
              </div>
            </div>
            
            <div>
              <Label>Target File</Label>
              <Select value={linkTargetFile} onValueChange={setLinkTargetFile}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a file to link with" />
                </SelectTrigger>
                <SelectContent>
                  {audioFiles
                    .filter(f => f.id !== selectedFiles[0] && f.name && f.file_url)
                    .map(file => (
                      <SelectItem key={file.id} value={file.id}>
                        {file.name} ({getFileExtension(file.file_url).toUpperCase()})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => linkFiles(selectedFiles[0] || '', linkTargetFile)}
                disabled={!linkTargetFile || !selectedFiles[0]}
                className="flex-1"
              >
                Create Link
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowLinkDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCompressionDialog} onOpenChange={setShowCompressionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose Compression Level</DialogTitle>
            <DialogDescription>
              Select how much to compress your audio file. Higher compression saves storage but may reduce quality.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid gap-3">
              <div 
                className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => {
                  if (compressionFile) {
                    convertToMp3(compressionFile.id, compressionFile.url, 'ultra_high')
                    setShowCompressionDialog(false)
                    setCompressionFile(null)
                  }
                }}
              >
                <div className="flex-1">
                  <div className="font-medium">Ultra High Compression</div>
                  <div className="text-sm text-muted-foreground">Smallest file size, lowest quality</div>
                  <div className="text-xs text-muted-foreground mt-1">~64 kbps • 97% compression • Good for extreme storage saving</div>
                </div>
                <div className="w-4 h-4 rounded-full border-2 border-primary"></div>
              </div>

              <div 
                className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors bg-primary/5 border-primary/20"
                onClick={() => {
                  if (compressionFile) {
                    convertToMp3(compressionFile.id, compressionFile.url, 'high')
                    setShowCompressionDialog(false)
                    setCompressionFile(null)
                  }
                }}
              >
                <div className="flex-1">
                  <div className="font-medium">High Compression</div>
                  <div className="text-sm text-muted-foreground">Smaller file size, reduced quality</div>
                  <div className="text-xs text-muted-foreground mt-1">~128 kbps • 94% compression • Good for storage saving</div>
                </div>
                <div className="w-4 h-4 rounded-full border-2 border-primary bg-primary"></div>
              </div>

              <div 
                className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => {
                  if (compressionFile) {
                    convertToMp3(compressionFile.id, compressionFile.url, 'medium')
                    setShowCompressionDialog(false)
                    setCompressionFile(null)
                  }
                }}
              >
                <div className="flex-1">
                  <div className="font-medium">Medium Compression</div>
                  <div className="text-sm text-muted-foreground">Balanced file size and quality</div>
                  <div className="text-xs text-muted-foreground mt-1">~192 kbps • 90% compression • Recommended for most uses</div>
                </div>
                <div className="w-4 h-4 rounded-full border-2 border-primary"></div>
              </div>

              <div 
                className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => {
                  if (compressionFile) {
                    convertToMp3(compressionFile.id, compressionFile.url, 'low')
                    setShowCompressionDialog(false)
                    setCompressionFile(null)
                  }
                }}
              >
                <div className="flex-1">
                  <div className="font-medium">Low Compression</div>
                  <div className="text-sm text-muted-foreground">Better quality, larger file size</div>
                  <div className="text-xs text-muted-foreground mt-1">~320 kbps • 84% compression • Best for professional use</div>
                </div>
                <div className="w-4 h-4 rounded-full border-2 border-primary"></div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCompressionDialog(false)
                  setCompressionFile(null)
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy to External Storage</DialogTitle>
            <DialogDescription>
              Copy your audio file to an external storage service and link it to your original file.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>File to Copy</Label>
              <div className="text-sm text-muted-foreground mt-1">
                {copyFile?.name || 'Unknown file'}
              </div>
            </div>
            
            <div>
              <Label>Storage Provider</Label>
              <Select defaultValue="aws-s3">
                <SelectTrigger>
                  <SelectValue placeholder="Select storage provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aws-s3">Amazon S3</SelectItem>
                  <SelectItem value="google-cloud">Google Cloud Storage</SelectItem>
                  <SelectItem value="azure">Azure Blob Storage</SelectItem>
                  <SelectItem value="dropbox">Dropbox</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Bucket/Container Name</Label>
              <Input 
                placeholder="Enter bucket name (e.g., my-audio-backup)" 
                defaultValue="audio-backup"
              />
            </div>
            
            <div>
              <Label>Folder Path (Optional)</Label>
              <Input 
                placeholder="Enter folder path (e.g., wav-files/)" 
                defaultValue=""
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  if (copyFile) {
                    copyToExternalStorage(copyFile.id, copyFile.url, 'aws-s3', 'audio-backup')
                    setShowCopyDialog(false)
                    setCopyFile(null)
                  }
                }}
                className="flex-1"
              >
                Copy File
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCopyDialog(false)
                  setCopyFile(null)
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 