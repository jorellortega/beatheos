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
import { FileAudio, Link, Download, Upload, Music, FileText, Search, Filter, RefreshCw, X, Package, ChevronDown, Play, Pause, Volume2, Trash2, Cloud, Database, HardDrive, ExternalLink, Copy, Replace, Settings } from 'lucide-react'

interface AudioFile {
  id: string
  name: string
  type: string
  description?: string
  file_url?: string
  file_path?: string
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
    url?: string
    original_url?: string
  }
  created_at: string
  updated_at: string
  linked_files?: string[]
  conversion_status?: 'pending' | 'processing' | 'completed' | 'failed'
  file_format?: string
  original_file_id?: string
  replacement_status?: 'original' | 'replaced' | 'replacement'
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
  link_type?: 'conversion' | 'external_copy' | 'replacement'
  created_at: string
}

interface StorageProvider {
  id: string
  name: string
  type: 'aws-s3' | 'google-cloud' | 'azure' | 'dropbox' | 'local'
  config: {
    bucket?: string
    folder?: string
    region?: string
    access_key?: string
    secret_key?: string
    endpoint?: string
  }
  is_active: boolean
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
  
  // New state for file replacement and external storage
  const [showReplaceDialog, setShowReplaceDialog] = useState(false)
  const [replacingFile, setReplacingFile] = useState<AudioFile | null>(null)
  const [replacementFile, setReplacementFile] = useState<File | null>(null)
  const [replacementFormat, setReplacementFormat] = useState<string>('')
  const [storageProviders, setStorageProviders] = useState<StorageProvider[]>([])
  const [showStorageDialog, setShowStorageDialog] = useState(false)
  const [selectedStorageProvider, setSelectedStorageProvider] = useState<string>('')
  const [movingToExternal, setMovingToExternal] = useState<string | null>(null)
  const [preserveUrl, setPreserveUrl] = useState(true)
  const [showUrlPreservationDialog, setShowUrlPreservationDialog] = useState(false)
  const [urlPreservationMode, setUrlPreservationMode] = useState<'redirect' | 'copy' | 'replace'>('redirect')
  
  // Save WAV & Replace workflow
  const [showSaveWavDialog, setShowSaveWavDialog] = useState(false)
  const [savingWavFile, setSavingWavFile] = useState<AudioFile | null>(null)
  const [wavStorageProvider, setWavStorageProvider] = useState<string>('')
  const [mp3ReplacementFile, setMp3ReplacementFile] = useState<File | null>(null)
  const [saveWavStep, setSaveWavStep] = useState<'select-provider' | 'upload-wav' | 'upload-mp3' | 'complete'>('select-provider')
  
  // Compression and copy dialogs
  const [showCompressionDialog, setShowCompressionDialog] = useState(false)
  const [compressionFile, setCompressionFile] = useState<{ id: string; url: string } | null>(null)
  const [showCopyDialog, setShowCopyDialog] = useState(false)
  const [copyFile, setCopyFile] = useState<{ id: string; url: string; name: string } | null>(null)
  const [showBulkCompressionDialog, setShowBulkCompressionDialog] = useState(false)
  const [bulkCompressionLevel, setBulkCompressionLevel] = useState<'ultra_high' | 'high' | 'medium' | 'low'>('medium')
  
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
    fetchStorageProviders()
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

      // First, get all packs
      const { data: packsData, error: packsError } = await supabase
        .from('audio_packs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (packsError) {
        console.error('Supabase error fetching packs:', packsError)
        throw packsError
      }

      // Then, get the file count for each pack
      const packsWithCounts = await Promise.all(
        (packsData || []).map(async (pack) => {
          const { count, error: countError } = await supabase
            .from('audio_library_items')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('pack_id', pack.id)

          if (countError) {
            console.error(`Error counting files for pack ${pack.id}:`, countError)
            return { ...pack, item_count: 0 }
          }

          return { ...pack, item_count: count || 0 }
        })
      )

      console.log('Fetched audio packs with counts:', packsWithCounts.length, 'packs')
      console.log('Pack counts:', packsWithCounts.map(p => `${p.name}: ${p.item_count} files`))
      setAudioPacks(packsWithCounts)
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
      const linkedFile = audioFiles.find(f => f.id === linkedFileId) || allAudioFiles.find(f => f.id === linkedFileId)
      
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

  const togglePackExpansion = async (packId: string) => {
    const newExpanded = new Set(expandedPacks)
    if (newExpanded.has(packId)) {
      newExpanded.delete(packId)
    } else {
      newExpanded.add(packId)
      // Load all files for this pack when expanding
      await loadPackFiles(packId)
    }
    setExpandedPacks(newExpanded)
  }

  const loadPackFiles = async (packId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      console.log('Loading files for pack:', packId)

      const { data, error } = await supabase
        .from('audio_library_items')
        .select(`
          *,
          pack:audio_packs(id, name, color)
        `)
        .eq('user_id', user.id)
        .eq('pack_id', packId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading pack files:', error)
        return
      }

      console.log(`Loaded ${data?.length || 0} files for pack ${packId}`)

      // Add these files to allAudioFiles if they're not already there
      setAllAudioFiles(prev => {
        const existingIds = new Set(prev.map(f => f.id))
        const newFiles = (data || []).filter(f => !existingIds.has(f.id))
        return [...prev, ...newFiles]
      })
    } catch (error) {
      console.error('Error loading pack files:', error)
    }
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

  // Bulk action functions
  const bulkConvertToMp3 = async (compressionLevel: 'ultra_high' | 'high' | 'medium' | 'low' = 'medium') => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No Files Selected",
        description: "Please select files to convert.",
        variant: "destructive",
      })
      return
    }

    const filesToConvert = selectedFiles.map(fileId => {
      // Search in both audioFiles and allAudioFiles
      const file = audioFiles.find(f => f.id === fileId) || allAudioFiles.find(f => f.id === fileId)
      return file && file.file_url ? { id: fileId, url: file.file_url, name: file.name } : null
    }).filter(Boolean)

    if (filesToConvert.length === 0) {
      toast({
        title: "No Valid Files",
        description: "No valid files found for conversion.",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Starting Conversion",
      description: `Converting ${filesToConvert.length} files to MP3...`,
    })

    let completed = 0
    let failed = 0

    for (const file of filesToConvert) {
      if (!file) continue
      try {
        await convertToMp3(file.id, file.url, compressionLevel)
        completed++
      } catch (error) {
        console.error(`Failed to convert ${file.name}:`, error)
        failed++
      }
    }

    // Clear selection after bulk operation
    setSelectedFiles([])
    
    // Refresh files and links to show updated data
    await Promise.all([refreshFiles(), fetchFileLinks()])

    if (failed === 0) {
      toast({
        title: "Conversion Complete",
        description: `Successfully converted ${completed} files to MP3.`,
      })
    } else {
      toast({
        title: "Conversion Partially Complete",
        description: `Converted ${completed} files, ${failed} failed.`,
        variant: "destructive",
      })
    }
  }

  const bulkDownloadFiles = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No Files Selected",
        description: "Please select files to download.",
        variant: "destructive",
      })
      return
    }

    const filesToDownload = selectedFiles.map(fileId => {
      // Search in both audioFiles and allAudioFiles
      const file = audioFiles.find(f => f.id === fileId) || allAudioFiles.find(f => f.id === fileId)
      return file && file.file_url ? { id: fileId, url: file.file_url, name: file.name } : null
    }).filter(Boolean)

    if (filesToDownload.length === 0) {
      toast({
        title: "No Valid Files",
        description: "No valid files found for download.",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Starting Downloads",
      description: `Downloading ${filesToDownload.length} files...`,
    })

    let completed = 0
    let failed = 0

    for (const file of filesToDownload) {
      if (!file) continue
      try {
        await downloadFile(file.id, file.name, file.url)
        completed++
      } catch (error) {
        console.error(`Failed to download ${file.name}:`, error)
        failed++
      }
    }

    // Clear selection after bulk operation
    setSelectedFiles([])
    
    // Refresh files to show updated data
    await refreshFiles()

    if (failed === 0) {
      toast({
        title: "Downloads Complete",
        description: `Successfully downloaded ${completed} files.`,
      })
    } else {
      toast({
        title: "Downloads Partially Complete",
        description: `Downloaded ${completed} files, ${failed} failed.`,
        variant: "destructive",
      })
    }
  }

  const bulkDeleteFiles = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No Files Selected",
        description: "Please select files to delete.",
        variant: "destructive",
      })
      return
    }

    const filesToDelete = selectedFiles.map(fileId => {
      // Search in both audioFiles and allAudioFiles
      const file = audioFiles.find(f => f.id === fileId) || allAudioFiles.find(f => f.id === fileId)
      return file ? { id: fileId, name: file.name } : null
    }).filter(Boolean)

    if (filesToDelete.length === 0) {
      toast({
        title: "No Valid Files",
        description: "No valid files found for deletion.",
        variant: "destructive",
      })
      return
    }

    if (!confirm(`Are you sure you want to delete ${filesToDelete.length} files? This action cannot be undone.`)) {
      return
    }

    toast({
      title: "Starting Deletion",
      description: `Deleting ${filesToDelete.length} files...`,
    })

    let completed = 0
    let failed = 0

    for (const file of filesToDelete) {
      if (!file) continue
      try {
        await deleteFile(file.id, file.name)
        completed++
      } catch (error) {
        console.error(`Failed to delete ${file.name}:`, error)
        failed++
      }
    }

    // Clear selection after bulk operation
    setSelectedFiles([])
    
    // Refresh files to show updated data
    await refreshFiles()

    if (failed === 0) {
      toast({
        title: "Deletion Complete",
        description: `Successfully deleted ${completed} files.`,
      })
    } else {
      toast({
        title: "Deletion Partially Complete",
        description: `Deleted ${completed} files, ${failed} failed.`,
        variant: "destructive",
      })
    }
  }

  // ===== NEW FILE REPLACEMENT AND EXTERNAL STORAGE FUNCTIONS =====

  const fetchStorageProviders = async () => {
    try {
      const { data: providers, error } = await supabase
        .from('storage_providers')
        .select('*')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setStorageProviders(providers || [])
    } catch (error) {
      console.error('Error fetching storage providers:', error)
      toast({
        title: "Error",
        description: "Failed to load storage providers",
        variant: "destructive",
      })
    }
  }

  const openReplaceDialog = (file: AudioFile) => {
    console.log('Opening replace dialog for file:', file.name)
    setReplacingFile(file)
    setReplacementFile(null)
    setReplacementFormat('')
    setShowReplaceDialog(true)
  }

  const handleReplacementFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setReplacementFile(file)
      const extension = file.name.split('.').pop()?.toLowerCase() || ''
      setReplacementFormat(extension)
    }
  }

  const replaceFile = async () => {
    if (!replacingFile || !replacementFile) {
      toast({
        title: "Missing File",
        description: "Please select a replacement file",
        variant: "destructive",
      })
      return
    }

    try {
      setConverting(replacingFile.id)
      
      // Upload the replacement file
      const fileName = `${replacingFile.name.replace(/\.[^/.]+$/, '')}.${replacementFormat}`
      const filePath = `audio-files/${replacingFile.pack_id || 'unassigned'}/${fileName}`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('audio-files')
        .upload(filePath, replacementFile)

      if (uploadError) throw uploadError

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('audio-files')
        .getPublicUrl(filePath)

      // Create new audio library item for the replacement file
      const { data: newFile, error: insertError } = await supabase
        .from('audio_library_items')
        .insert({
          name: fileName,
          file_path: filePath,
          file_url: urlData.publicUrl,
          file_size: replacementFile.size,
          pack_id: replacingFile.pack_id,
          subfolder: replacingFile.subfolder,
          bpm: replacingFile.bpm,
          key: replacingFile.key,
          audio_type: replacingFile.audio_type,
          genre: replacingFile.genre,
          subgenre: replacingFile.subgenre,
          additional_subgenres: replacingFile.additional_subgenres,
          tags: replacingFile.tags,
          is_ready: replacingFile.is_ready,
          instrument_type: replacingFile.instrument_type,
          mood: replacingFile.mood,
          energy_level: replacingFile.energy_level,
          complexity: replacingFile.complexity,
          tempo_category: replacingFile.tempo_category,
          key_signature: replacingFile.key_signature,
          time_signature: replacingFile.time_signature,
          duration: replacingFile.duration,
          sample_rate: replacingFile.sample_rate,
          bit_depth: replacingFile.bit_depth,
          license_type: replacingFile.license_type,
          is_new: replacingFile.is_new,
          distribution_type: replacingFile.distribution_type,
          file_format: replacementFormat,
          original_file_id: replacingFile.id,
          replacement_status: 'replacement'
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Create file link between original and replacement
      const { error: linkError } = await supabase
        .from('audio_file_links')
        .insert({
          original_file_id: replacingFile.id,
          converted_file_id: newFile.id,
          original_format: replacingFile.file_format || getFileExtension(replacingFile.file_url),
          converted_format: replacementFormat,
          link_type: 'replacement'
        })

      if (linkError) throw linkError

      // Update original file to mark it as replaced
      const { error: updateError } = await supabase
        .from('audio_library_items')
        .update({ replacement_status: 'replaced' })
        .eq('id', replacingFile.id)

      if (updateError) throw updateError

      toast({
        title: "File Replaced Successfully",
        description: `${replacingFile.name} has been replaced with ${fileName}`,
      })

      setShowReplaceDialog(false)
      setReplacingFile(null)
      setReplacementFile(null)
      setReplacementFormat('')
      await refreshFiles()

    } catch (error) {
      console.error('Error replacing file:', error)
      toast({
        title: "Error",
        description: "Failed to replace file",
        variant: "destructive",
      })
    } finally {
      setConverting(null)
    }
  }

  const moveToExternalStorage = async (fileId: string, providerId: string) => {
    try {
      setMovingToExternal(fileId)
      
      const file = audioFiles.find(f => f.id === fileId) || allAudioFiles.find(f => f.id === fileId)
      if (!file) throw new Error('File not found')

      const provider = storageProviders.find(p => p.id === providerId)
      if (!provider) throw new Error('Storage provider not found')

      // Get the file from Supabase storage
      const response = await fetch(file.file_url!)
      const blob = await response.blob()

      // Upload to external storage (this would need to be implemented based on provider)
      let externalUrl = ''
      
      switch (provider.type) {
        case 'dropbox':
          externalUrl = await uploadToDropbox(blob, file.name, provider.config)
          break
        case 'aws-s3':
          externalUrl = await uploadToS3(blob, file.name, provider.config)
          break
        case 'google-cloud':
          externalUrl = await uploadToGoogleCloud(blob, file.name, provider.config)
          break
        case 'azure':
          externalUrl = await uploadToAzure(blob, file.name, provider.config)
          break
        default:
          throw new Error(`Unsupported storage provider: ${provider.type}`)
      }

      // Update the file with external storage info
      const { error: updateError } = await supabase
        .from('audio_library_items')
        .update({
          external_storage: {
            provider: provider.type,
            bucket: provider.config.bucket || '',
            folder: provider.config.folder || '',
            url: externalUrl,
            original_url: file.file_url
          }
        })
        .eq('id', fileId)

      if (updateError) throw updateError

      toast({
        title: "File Moved Successfully",
        description: `${file.name} has been moved to ${provider.name}`,
      })

      await refreshFiles()

    } catch (error) {
      console.error('Error moving file to external storage:', error)
      toast({
        title: "Error",
        description: "Failed to move file to external storage",
        variant: "destructive",
      })
    } finally {
      setMovingToExternal(null)
    }
  }

  // Placeholder functions for external storage uploads
  const uploadToDropbox = async (blob: Blob, fileName: string, config: any): Promise<string> => {
    // Implement Dropbox upload logic
    return `https://dropbox.com/${config.folder || ''}/${fileName}`
  }

  const uploadToS3 = async (blob: Blob, fileName: string, config: any): Promise<string> => {
    // Implement AWS S3 upload logic
    return `https://${config.bucket}.s3.${config.region || 'us-east-1'}.amazonaws.com/${config.folder || ''}/${fileName}`
  }

  const uploadToGoogleCloud = async (blob: Blob, fileName: string, config: any): Promise<string> => {
    // Implement Google Cloud Storage upload logic
    return `https://storage.googleapis.com/${config.bucket}/${config.folder || ''}/${fileName}`
  }

  const uploadToAzure = async (blob: Blob, fileName: string, config: any): Promise<string> => {
    // Implement Azure Blob Storage upload logic
    return `https://${config.bucket}.blob.core.windows.net/${config.folder || ''}/${fileName}`
  }

  const openUrlPreservationDialog = (file: AudioFile) => {
    setReplacingFile(file)
    setShowUrlPreservationDialog(true)
  }

  const handleUrlPreservation = async () => {
    if (!replacingFile) return

    try {
      let newUrl = replacingFile.file_url

      switch (urlPreservationMode) {
        case 'redirect':
          // Create a redirect URL that points to the new file
          newUrl = `/api/audio/redirect/${replacingFile.id}`
          break
        case 'copy':
          // Copy the file to maintain the same URL
          const response = await fetch(replacingFile.file_url!)
          const blob = await response.blob()
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('audio-files')
            .upload(replacingFile.file_path!, blob, { upsert: true })
          
          if (uploadError) throw uploadError
          break
        case 'replace':
          // Replace the file content but keep the same URL
          if (replacementFile) {
            const { error: uploadError } = await supabase.storage
              .from('audio-files')
              .upload(replacingFile.file_path!, replacementFile, { upsert: true })
            
            if (uploadError) throw uploadError
          }
          break
      }

      // Update the file URL if needed
      if (newUrl !== replacingFile.file_url) {
        const { error: updateError } = await supabase
          .from('audio_library_items')
          .update({ file_url: newUrl })
          .eq('id', replacingFile.id)

        if (updateError) throw updateError
      }

      toast({
        title: "URL Preservation Applied",
        description: `URL preservation mode "${urlPreservationMode}" has been applied to ${replacingFile.name}`,
      })

      setShowUrlPreservationDialog(false)
      setReplacingFile(null)
      await refreshFiles()

    } catch (error) {
      console.error('Error applying URL preservation:', error)
      toast({
        title: "Error",
        description: "Failed to apply URL preservation",
        variant: "destructive",
      })
    }
  }

  // ===== SAVE WAV & REPLACE WORKFLOW =====

  const openSaveWavDialog = (file: AudioFile) => {
    setSavingWavFile(file)
    setWavStorageProvider('')
    setMp3ReplacementFile(null)
    setSaveWavStep('select-provider')
    setShowSaveWavDialog(true)
  }

  const handleWavStorageProviderSelect = (providerId: string) => {
    setWavStorageProvider(providerId)
    setSaveWavStep('upload-wav')
  }

  const handleMp3ReplacementFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.name.toLowerCase().endsWith('.mp3')) {
      setMp3ReplacementFile(file)
    } else {
      toast({
        title: "Invalid File",
        description: "Please select an MP3 file",
        variant: "destructive",
      })
    }
  }

  const saveWavToExternalAndReplace = async () => {
    if (!savingWavFile || !wavStorageProvider || !mp3ReplacementFile) {
      toast({
        title: "Missing Information",
        description: "Please select storage provider and MP3 replacement file",
        variant: "destructive",
      })
      return
    }

    try {
      setConverting(savingWavFile.id)
      setSaveWavStep('upload-wav')

      const provider = storageProviders.find(p => p.id === wavStorageProvider)
      if (!provider) throw new Error('Storage provider not found')

      // Step 1: Save WAV to external storage with all metadata
      const wavFileName = `${savingWavFile.name.replace(/\.[^/.]+$/, '')}.wav`
      let externalWavUrl = ''

      // Get the WAV file from current storage
      const response = await fetch(savingWavFile.file_url!)
      const wavBlob = await response.blob()

      // Upload WAV to external storage
      switch (provider.type) {
        case 'dropbox':
          externalWavUrl = await uploadToDropbox(wavBlob, wavFileName, provider.config)
          break
        case 'aws-s3':
          externalWavUrl = await uploadToS3(wavBlob, wavFileName, provider.config)
          break
        case 'google-cloud':
          externalWavUrl = await uploadToGoogleCloud(wavBlob, wavFileName, provider.config)
          break
        case 'azure':
          externalWavUrl = await uploadToAzure(wavBlob, wavFileName, provider.config)
          break
        default:
          throw new Error(`Unsupported storage provider: ${provider.type}`)
      }

      // Step 2: Create new audio library item for the WAV in external storage
      const { data: externalWavFile, error: wavInsertError } = await supabase
        .from('audio_library_items')
        .insert({
          name: wavFileName,
          file_path: `${provider.type}/${provider.config.bucket || ''}/${provider.config.folder || ''}/${wavFileName}`,
          file_url: externalWavUrl,
          file_size: wavBlob.size,
          pack_id: savingWavFile.pack_id,
          subfolder: savingWavFile.subfolder,
          bpm: savingWavFile.bpm,
          key: savingWavFile.key,
          audio_type: savingWavFile.audio_type,
          genre: savingWavFile.genre,
          subgenre: savingWavFile.subgenre,
          additional_subgenres: savingWavFile.additional_subgenres,
          tags: savingWavFile.tags,
          is_ready: savingWavFile.is_ready,
          instrument_type: savingWavFile.instrument_type,
          mood: savingWavFile.mood,
          energy_level: savingWavFile.energy_level,
          complexity: savingWavFile.complexity,
          tempo_category: savingWavFile.tempo_category,
          key_signature: savingWavFile.key_signature,
          time_signature: savingWavFile.time_signature,
          duration: savingWavFile.duration,
          sample_rate: savingWavFile.sample_rate,
          bit_depth: savingWavFile.bit_depth,
          license_type: savingWavFile.license_type,
          is_new: savingWavFile.is_new,
          distribution_type: savingWavFile.distribution_type,
          file_format: 'wav',
          original_file_id: savingWavFile.id,
          replacement_status: 'original',
          external_storage: {
            provider: provider.type,
            bucket: provider.config.bucket || '',
            folder: provider.config.folder || '',
            url: externalWavUrl,
            original_url: savingWavFile.file_url
          }
        })
        .select()
        .single()

      if (wavInsertError) throw wavInsertError

      setSaveWavStep('upload-mp3')

      // Step 3: Upload MP3 replacement to main storage
      const mp3FileName = `${savingWavFile.name.replace(/\.[^/.]+$/, '')}.mp3`
      const mp3FilePath = `audio-files/${savingWavFile.pack_id || 'unassigned'}/${mp3FileName}`
      
      const { data: mp3UploadData, error: mp3UploadError } = await supabase.storage
        .from('audio-files')
        .upload(mp3FilePath, mp3ReplacementFile)

      if (mp3UploadError) throw mp3UploadError

      // Get the public URL for MP3
      const { data: mp3UrlData } = supabase.storage
        .from('audio-files')
        .getPublicUrl(mp3FilePath)

      // Step 4: Create new audio library item for the MP3 replacement
      const { data: mp3ReplacementFileData, error: mp3InsertError } = await supabase
        .from('audio_library_items')
        .insert({
          name: mp3FileName,
          file_path: mp3FilePath,
          file_url: mp3UrlData.publicUrl,
          file_size: mp3ReplacementFile.size,
          pack_id: savingWavFile.pack_id,
          subfolder: savingWavFile.subfolder,
          bpm: savingWavFile.bpm,
          key: savingWavFile.key,
          audio_type: savingWavFile.audio_type,
          genre: savingWavFile.genre,
          subgenre: savingWavFile.subgenre,
          additional_subgenres: savingWavFile.additional_subgenres,
          tags: savingWavFile.tags,
          is_ready: savingWavFile.is_ready,
          instrument_type: savingWavFile.instrument_type,
          mood: savingWavFile.mood,
          energy_level: savingWavFile.energy_level,
          complexity: savingWavFile.complexity,
          tempo_category: savingWavFile.tempo_category,
          key_signature: savingWavFile.key_signature,
          time_signature: savingWavFile.time_signature,
          duration: savingWavFile.duration,
          sample_rate: savingWavFile.sample_rate,
          bit_depth: savingWavFile.bit_depth,
          license_type: savingWavFile.license_type,
          is_new: savingWavFile.is_new,
          distribution_type: savingWavFile.distribution_type,
          file_format: 'mp3',
          original_file_id: savingWavFile.id,
          replacement_status: 'replacement'
        })
        .select()
        .single()

      if (mp3InsertError) throw mp3InsertError

      // Step 5: Create file links between all three files
      const linksToCreate = [
        {
          original_file_id: savingWavFile.id,
          converted_file_id: externalWavFile.id,
          original_format: savingWavFile.file_format || 'wav',
          converted_format: 'wav',
          link_type: 'external_copy'
        },
        {
          original_file_id: savingWavFile.id,
          converted_file_id: mp3ReplacementFileData.id,
          original_format: savingWavFile.file_format || 'wav',
          converted_format: 'mp3',
          link_type: 'replacement'
        },
        {
          original_file_id: externalWavFile.id,
          converted_file_id: mp3ReplacementFileData.id,
          original_format: 'wav',
          converted_format: 'mp3',
          link_type: 'replacement'
        }
      ]

      for (const link of linksToCreate) {
        const { error: linkError } = await supabase
          .from('audio_file_links')
          .insert(link)

        if (linkError) throw linkError
      }

      // Step 6: Update original file to mark it as replaced
      const { error: updateError } = await supabase
        .from('audio_library_items')
        .update({ 
          replacement_status: 'replaced',
          file_url: mp3UrlData.publicUrl, // Update to point to MP3
          file_path: mp3FilePath,
          file_size: mp3ReplacementFile.size,
          file_format: 'mp3'
        })
        .eq('id', savingWavFile.id)

      if (updateError) throw updateError

      setSaveWavStep('complete')

      toast({
        title: "WAV Saved & File Replaced Successfully",
        description: `${savingWavFile.name} WAV saved to ${provider.name}, replaced with MP3`,
      })

      // Reset and close dialog
      setTimeout(() => {
        setShowSaveWavDialog(false)
        setSavingWavFile(null)
        setWavStorageProvider('')
        setMp3ReplacementFile(null)
        setSaveWavStep('select-provider')
        refreshFiles()
      }, 2000)

    } catch (error) {
      console.error('Error in save WAV & replace workflow:', error)
      toast({
        title: "Error",
        description: "Failed to save WAV and replace file",
        variant: "destructive",
      })
    } finally {
      setConverting(null)
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
                  onClick={() => setShowBulkCompressionDialog(true)}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Convert Selected to MP3
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={bulkDownloadFiles}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={bulkDeleteFiles}
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
                      
                      {/* New File Replacement and Storage Buttons */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openReplaceDialog(file)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 flex-shrink-0"
                        title="Replace File"
                      >
                        <Replace className="h-3 w-3" />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setMovingToExternal(file.id)
                          setShowStorageDialog(true)
                        }}
                        className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 flex-shrink-0"
                        title="Move to External Storage"
                        disabled={movingToExternal === file.id}
                      >
                        {movingToExternal === file.id ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-orange-600"></div>
                        ) : (
                          <Cloud className="h-3 w-3" />
                        )}
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openUrlPreservationDialog(file)}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50 flex-shrink-0"
                        title="URL Preservation Options"
                      >
                        <Settings className="h-3 w-3" />
                      </Button>
                      
                      {/* Save WAV & Replace Button - only show for WAV files */}
                      {file.file_format === 'wav' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openSaveWavDialog(file)}
                          className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 flex-shrink-0"
                          title="Save WAV & Replace with MP3"
                        >
                          <HardDrive className="h-3 w-3" />
                        </Button>
                      )}
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
                  onClick={() => setShowBulkCompressionDialog(true)}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Convert Selected to MP3
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={bulkDownloadFiles}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={bulkDeleteFiles}
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
                  console.log(`Pack ${pack.name} (${pack.id}): ${packFiles.length} loaded files, ${pack.item_count || 0} total files`, packFiles.map(f => ({ name: f.name, pack_id: f.pack_id })))
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
                                {pack.item_count || 0} file{(pack.item_count || 0) !== 1 ? 's' : ''}
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
                              onClick={(e) => {
                                e.stopPropagation() // Prevent pack expansion
                                isAllSelectedInPack(pack.id) ? deselectAllFilesInPack(pack.id) : selectAllFilesInPack(pack.id)
                              }}
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

      {/* Bulk Compression Dialog */}
      <Dialog open={showBulkCompressionDialog} onOpenChange={setShowBulkCompressionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Convert to MP3</DialogTitle>
            <DialogDescription>
              Convert {selectedFiles.length} selected files to MP3 format. Choose your compression level:
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-3">
              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  bulkCompressionLevel === 'ultra_high' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setBulkCompressionLevel('ultra_high')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-lg">Ultra High Compression</div>
                    <div className="text-sm text-muted-foreground">Smallest file size, lower quality</div>
                    <div className="text-xs text-muted-foreground mt-1">~64 kbps • 97% compression • Best for storage</div>
                  </div>
                  <div className="w-4 h-4 rounded-full border-2 border-primary"></div>
                </div>
              </div>

              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  bulkCompressionLevel === 'high' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setBulkCompressionLevel('high')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-lg">High Compression</div>
                    <div className="text-sm text-muted-foreground">Small file size, good quality</div>
                    <div className="text-xs text-muted-foreground mt-1">~128 kbps • 94% compression • Best for streaming</div>
                  </div>
                  <div className="w-4 h-4 rounded-full border-2 border-primary"></div>
                </div>
              </div>

              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  bulkCompressionLevel === 'medium' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setBulkCompressionLevel('medium')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-lg">Medium Compression</div>
                    <div className="text-sm text-muted-foreground">Balanced size and quality</div>
                    <div className="text-xs text-muted-foreground mt-1">~192 kbps • 90% compression • Best for general use</div>
                  </div>
                  <div className="w-4 h-4 rounded-full border-2 border-primary"></div>
                </div>
              </div>

              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  bulkCompressionLevel === 'low' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setBulkCompressionLevel('low')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-lg">Low Compression</div>
                    <div className="text-sm text-muted-foreground">Better quality, larger file size</div>
                    <div className="text-xs text-muted-foreground mt-1">~320 kbps • 84% compression • Best for professional use</div>
                  </div>
                  <div className="w-4 h-4 rounded-full border-2 border-primary"></div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  bulkConvertToMp3(bulkCompressionLevel)
                  setShowBulkCompressionDialog(false)
                }}
                className="flex-1"
              >
                Convert {selectedFiles.length} Files
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowBulkCompressionDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save WAV & Replace Dialog */}
      <Dialog open={showSaveWavDialog} onOpenChange={setShowSaveWavDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Save WAV & Replace with MP3</DialogTitle>
            <DialogDescription>
              Save the WAV file to external storage and replace it with an MP3 file. All metadata will be preserved.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Step 1: Select Storage Provider */}
            {saveWavStep === 'select-provider' && (
              <div className="space-y-4">
                <div className="text-sm font-medium">Step 1: Select External Storage for WAV</div>
                <div className="grid gap-3">
                  {storageProviders.map((provider) => (
                    <div
                      key={provider.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        wavStorageProvider === provider.id ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleWavStorageProviderSelect(provider.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{provider.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {provider.type.toUpperCase()} • {provider.config.bucket || 'No bucket'}
                            {provider.config.folder && ` • ${provider.config.folder}`}
                          </div>
                        </div>
                        <div className="w-4 h-4 rounded-full border-2 border-primary"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Upload WAV */}
            {saveWavStep === 'upload-wav' && (
              <div className="space-y-4">
                <div className="text-sm font-medium">Step 2: Uploading WAV to External Storage</div>
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  <div className="text-sm text-muted-foreground">
                    Saving {savingWavFile?.name} to {storageProviders.find(p => p.id === wavStorageProvider)?.name}...
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Select MP3 Replacement */}
            {saveWavStep === 'upload-mp3' && (
              <div className="space-y-4">
                <div className="text-sm font-medium">Step 3: Select MP3 Replacement File</div>
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    Choose the MP3 file that will replace the original WAV file. All metadata will be copied.
                  </div>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept=".mp3"
                      onChange={handleMp3ReplacementFileChange}
                      className="hidden"
                      id="mp3-replacement-file"
                    />
                    <label htmlFor="mp3-replacement-file" className="cursor-pointer">
                      <div className="space-y-2">
                        <Upload className="h-8 w-8 mx-auto text-gray-400" />
                        <div className="text-sm font-medium">
                          {mp3ReplacementFile ? mp3ReplacementFile.name : 'Click to select MP3 file'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          MP3 files only
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Complete */}
            {saveWavStep === 'complete' && (
              <div className="space-y-4">
                <div className="text-sm font-medium text-green-600">✓ Complete!</div>
                <div className="text-sm text-muted-foreground">
                  WAV file saved to external storage and replaced with MP3. All metadata preserved.
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              {saveWavStep === 'upload-mp3' && mp3ReplacementFile && (
                <Button
                  onClick={saveWavToExternalAndReplace}
                  className="flex-1"
                  disabled={converting === savingWavFile?.id}
                >
                  {converting === savingWavFile?.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    'Save WAV & Replace with MP3'
                  )}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  setShowSaveWavDialog(false)
                  setSavingWavFile(null)
                  setWavStorageProvider('')
                  setMp3ReplacementFile(null)
                  setSaveWavStep('select-provider')
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Storage Provider Selection Dialog */}
      <Dialog open={showStorageDialog} onOpenChange={setShowStorageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to External Storage</DialogTitle>
            <DialogDescription>
              Select a storage provider to move this file to external storage.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid gap-3">
              {storageProviders.map((provider) => (
                <div
                  key={provider.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedStorageProvider === provider.id ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedStorageProvider(provider.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{provider.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {provider.type.toUpperCase()} • {provider.config.bucket || 'No bucket'}
                        {provider.config.folder && ` • ${provider.config.folder}`}
                      </div>
                    </div>
                    <div className="w-4 h-4 rounded-full border-2 border-primary"></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  if (selectedStorageProvider && movingToExternal) {
                    moveToExternalStorage(movingToExternal, selectedStorageProvider)
                    setShowStorageDialog(false)
                    setSelectedStorageProvider('')
                    setMovingToExternal(null)
                  }
                }}
                disabled={!selectedStorageProvider}
                className="flex-1"
              >
                Move File
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowStorageDialog(false)
                  setSelectedStorageProvider('')
                  setMovingToExternal(null)
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Replace File Dialog */}
      <Dialog open={showReplaceDialog} onOpenChange={setShowReplaceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace File</DialogTitle>
            <DialogDescription>
              Replace {replacingFile?.name} with a new file. All metadata will be preserved.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Choose the replacement file. The new file will inherit all metadata from the original.
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleReplacementFileChange}
                  className="hidden"
                  id="replacement-file"
                />
                <label htmlFor="replacement-file" className="cursor-pointer">
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-gray-400" />
                    <div className="text-sm font-medium">
                      {replacementFile ? replacementFile.name : 'Click to select replacement file'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Audio files only
                    </div>
                  </div>
                </label>
              </div>
              
              {replacementFile && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium">Selected File:</div>
                  <div className="text-sm text-muted-foreground">
                    {replacementFile.name} • {formatFileSize(replacementFile.size)} • {replacementFormat.toUpperCase()}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={replaceFile}
                className="flex-1"
                disabled={!replacementFile || converting === replacingFile?.id}
              >
                {converting === replacingFile?.id ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Replacing...
                  </>
                ) : (
                  'Replace File'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowReplaceDialog(false)
                  setReplacingFile(null)
                  setReplacementFile(null)
                  setReplacementFormat('')
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* URL Preservation Dialog */}
      <Dialog open={showUrlPreservationDialog} onOpenChange={setShowUrlPreservationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>URL Preservation Options</DialogTitle>
            <DialogDescription>
              Choose how to handle URL preservation when replacing files.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-3">
              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  urlPreservationMode === 'redirect' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setUrlPreservationMode('redirect')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">Redirect</div>
                    <div className="text-sm text-muted-foreground">Create a redirect URL that points to the new file</div>
                  </div>
                  <div className="w-4 h-4 rounded-full border-2 border-primary"></div>
                </div>
              </div>

              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  urlPreservationMode === 'copy' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setUrlPreservationMode('copy')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">Copy</div>
                    <div className="text-sm text-muted-foreground">Copy the file to maintain the same URL</div>
                  </div>
                  <div className="w-4 h-4 rounded-full border-2 border-primary"></div>
                </div>
              </div>

              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  urlPreservationMode === 'replace' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setUrlPreservationMode('replace')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">Replace</div>
                    <div className="text-sm text-muted-foreground">Replace the file content but keep the same URL</div>
                  </div>
                  <div className="w-4 h-4 rounded-full border-2 border-primary"></div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleUrlPreservation}
                className="flex-1"
              >
                Apply URL Preservation
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowUrlPreservationDialog(false)}
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