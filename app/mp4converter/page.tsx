"use client"

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { 
  Music, 
  Image, 
  Video, 
  Download, 
  Play, 
  Pause, 
  Upload, 
  FileAudio, 
  FileImage, 
  Settings,
  Youtube,
  Instagram,
  Square,
  Monitor,
  Smartphone,
  Loader2,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  Info
} from 'lucide-react'

interface AudioItem {
  id: string
  title: string
  artist: string
  audio_url: string
  duration?: string
  cover_art_url?: string
  type: 'single' | 'album_track' | 'track'
  source: 'singles' | 'albums' | 'tracks'
}

interface CoverItem {
  id: string
  name: string
  url: string
  type: 'album' | 'single' | 'custom'
}

interface VideoProject {
  id: string
  name: string
  audio: AudioItem | null
  cover: CoverItem | null
  customAudio: File | null
  customCover: File | null
  format: 'youtube' | 'reels'
  duration: number
  fadeIn: number
  fadeOut: number
  textOverlay: string
  textColor: string
  textSize: number
  textPosition: 'top' | 'center' | 'bottom'
  backgroundColor: string
  createdAt: Date
}

export default function MP4ConverterPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  
  // State for content
  const [singles, setSingles] = useState<any[]>([])
  const [albums, setAlbums] = useState<any[]>([])
  const [tracks, setTracks] = useState<any[]>([])
  const [covers, setCovers] = useState<CoverItem[]>([])
  const [loading, setLoading] = useState(true)
  
  // State for video creation
  const [selectedAudio, setSelectedAudio] = useState<AudioItem | null>(null)
  const [selectedCover, setSelectedCover] = useState<CoverItem | null>(null)
  const [customAudio, setCustomAudio] = useState<File | null>(null)
  const [customCover, setCustomCover] = useState<File | null>(null)
  const [videoFormat, setVideoFormat] = useState<'youtube' | 'reels'>('youtube')
  const [duration, setDuration] = useState(30)
  const [fadeIn, setFadeIn] = useState(2)
  const [fadeOut, setFadeOut] = useState(2)
  const [textOverlay, setTextOverlay] = useState('')
  const [textColor, setTextColor] = useState('#ffffff')
  const [textSize, setTextSize] = useState(48)
  const [textPosition, setTextPosition] = useState<'top' | 'center' | 'bottom'>('center')
  const [backgroundColor, setBackgroundColor] = useState('#000000')
  
  // Cropping controls for each format
  const [youtubeCrop, setYoutubeCrop] = useState({
    scale: 1.0,
    x: 0,
    y: 0
  })
  
  const [reelsCrop, setReelsCrop] = useState({
    scale: 1.0,
    x: 0,
    y: 0
  })
  
  // State for projects
  const [projects, setProjects] = useState<VideoProject[]>([])
  const [showProjectDialog, setShowProjectDialog] = useState(false)
  const [editingProject, setEditingProject] = useState<VideoProject | null>(null)
  const [projectName, setProjectName] = useState('')
  
  // State for video generation
  const [generating, setGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  
  // Audio preview
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  
  // Refs
  const audioFileInputRef = useRef<HTMLInputElement>(null)
  const coverFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user) {
      loadContent()
      loadProjects()
    }
  }, [user])

  const loadContent = async () => {
    try {
      setLoading(true)
      
      // Load singles
      const { data: singlesData, error: singlesError } = await supabase
        .from('singles')
        .select('id, title, artist, audio_url, duration, cover_art_url')
        .eq('user_id', user?.id)
      
      if (singlesError) {
        console.log('Singles table not found or error:', singlesError.message)
      }
      
      // Load albums
      const { data: albumsData, error: albumsError } = await supabase
        .from('albums')
        .select('id, title, artist, cover_art_url')
        .eq('user_id', user?.id)
      
      if (albumsError) {
        console.log('Albums table not found or error:', albumsError.message)
      }
      
      // Load album tracks
      const { data: albumTracksData, error: albumTracksError } = await supabase
        .from('album_tracks')
        .select(`
          id, title, duration, audio_url, session_id,
          albums!inner(id, title, artist, cover_art_url)
        `)
        .eq('albums.user_id', user?.id)
      
      if (albumTracksError) {
        console.log('Album tracks table not found or error:', albumTracksError.message)
      }
      
      // Load tracks
      const { data: tracksData, error: tracksError } = await supabase
        .from('tracks')
        .select('id, title, artist, audio_url, duration, cover_art_url')
        .eq('user_id', user?.id)
      
      if (tracksError) {
        console.log('Tracks table not found or error:', tracksError.message)
      }
      
      // Process data with null safety
      const processedSingles = Array.isArray(singlesData) ? singlesData.map(single => ({
        ...single,
        type: 'single' as const,
        source: 'singles' as const
      })) : []
      
      const processedAlbumTracks = Array.isArray(albumTracksData) ? albumTracksData.map(track => ({
        id: track.id,
        title: track.title,
        artist: track.albums?.artist || '',
        audio_url: track.audio_url,
        duration: track.duration,
        cover_art_url: track.albums?.cover_art_url,
        type: 'album_track' as const,
        source: 'albums' as const
      })) : []
      
      const processedTracks = Array.isArray(tracksData) ? tracksData.map(track => ({
        ...track,
        type: 'track' as const,
        source: 'tracks' as const
      })) : []
      
      setSingles(processedSingles)
      setAlbums(processedAlbumTracks)
      setTracks(processedTracks)
      
      // Load covers with null safety
      const allCovers: CoverItem[] = []
      
      // Add album covers
      if (Array.isArray(albumsData)) {
        albumsData.forEach(album => {
          if (album && album.cover_art_url) {
            allCovers.push({
              id: `album-${album.id}`,
              name: `${album.title} Cover`,
              url: album.cover_art_url,
              type: 'album'
            })
          }
        })
      }
      
      // Add single covers
      if (Array.isArray(singlesData)) {
        singlesData.forEach(single => {
          if (single && single.cover_art_url) {
            allCovers.push({
              id: `single-${single.id}`,
              name: `${single.title} Cover`,
              url: single.cover_art_url,
              type: 'single'
            })
          }
        })
      }
      
      setCovers(allCovers)
      
    } catch (error) {
      console.error('Error loading content:', error)
      toast({
        title: "Error",
        description: "Failed to load your content",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const loadProjects = async () => {
    try {
      // Check if video_projects table exists first
      const { data, error } = await supabase
        .from('video_projects')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
      
      if (error) {
        // Table doesn't exist yet, just set empty projects
        console.log('Video projects table not found yet:', error.message)
        setProjects([])
        return
      }
      
      if (data) {
        setProjects(data.map(project => ({
          ...project,
          createdAt: new Date(project.created_at)
        })))
      }
    } catch (error) {
      console.error('Error loading projects:', error)
      // Set empty projects on error
      setProjects([])
    }
  }

  const handleAudioSelect = (audio: AudioItem) => {
    setSelectedAudio(audio)
    setCustomAudio(null)
    
    // Automatically find and select the best available cover art
    const bestCover = getBestCoverForAudio(audio)
    if (bestCover) {
      setSelectedCover(bestCover)
      setCustomCover(null)
    } else {
      // If no cover found, clear current selection to prompt for custom upload
      setSelectedCover(null)
      setCustomCover(null)
    }
    
    // Create audio element for preview
    if (audio.audio_url) {
      const audioElement = new Audio(audio.audio_url)
      setAudioRef(audioElement)
      
      audioElement.addEventListener('loadedmetadata', () => {
        setDuration(Math.floor(audioElement.duration))
      })
      
      audioElement.addEventListener('timeupdate', () => {
        setCurrentTime(audioElement.currentTime)
      })
      
      audioElement.addEventListener('ended', () => {
        setIsPlaying(false)
        setCurrentTime(0)
      })
    }
  }

  const handleCustomAudioUpload = (file: File) => {
    setCustomAudio(file)
    setSelectedAudio(null)
    
    // Create audio element for preview
    const audioElement = new Audio(URL.createObjectURL(file))
    setAudioRef(audioElement)
    
    audioElement.addEventListener('loadedmetadata', () => {
      setDuration(Math.floor(audioElement.currentTime))
    })
    
    audioElement.addEventListener('timeupdate', () => {
      setCurrentTime(audioElement.currentTime)
    })
    
    audioElement.addEventListener('ended', () => {
      setIsPlaying(false)
      setCurrentTime(0)
    })
  }

  const handleCoverSelect = (cover: CoverItem) => {
    setSelectedCover(cover)
    setCustomCover(null)
  }

  const handleCustomCoverUpload = (file: File) => {
    setCustomCover(file)
    setSelectedCover(null)
  }

  // Function to check if we have a complete audio+cover selection
  const hasCompleteSelection = () => {
    return (selectedAudio || customAudio) && (selectedCover || customCover)
  }

  // Function to get the best available cover for selected audio
  const getBestCoverForAudio = (audio: AudioItem) => {
    // First try to find exact match
    if (audio.cover_art_url) {
      const exactMatch = covers.find(cover => cover.url === audio.cover_art_url)
      if (exactMatch) return exactMatch
    }
    
    // Then try to find by artist/title similarity
    const artistMatch = covers.find(cover => 
      cover.name.toLowerCase().includes(audio.artist.toLowerCase()) ||
      cover.name.toLowerCase().includes(audio.title.toLowerCase())
    )
    if (artistMatch) return artistMatch
    
    return null
  }

  const toggleAudioPlayback = () => {
    if (!audioRef) return
    
    if (isPlaying) {
      audioRef.pause()
      setIsPlaying(false)
    } else {
      audioRef.play()
      setIsPlaying(true)
    }
  }

  const saveProject = async () => {
    if (!projectName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a project name",
        variant: "destructive"
      })
      return
    }

    try {
      const projectData = {
        name: projectName,
        audio: selectedAudio,
        cover: selectedCover,
        customAudio: customAudio,
        customCover: customCover,
        format: videoFormat,
        duration,
        fadeIn,
        fadeOut,
        textOverlay,
        textColor,
        textSize,
        textPosition,
        backgroundColor,
        youtubeCrop,
        reelsCrop,
        user_id: user?.id
      }

      // Check if video_projects table exists first
      const { error: tableCheckError } = await supabase
        .from('video_projects')
        .select('id')
        .limit(1)
      
      if (tableCheckError) {
        toast({
          title: "Setup Required",
          description: "Please run the database migration first to create the video_projects table",
          variant: "destructive"
        })
        return
      }

      if (editingProject) {
        // Update existing project
        const { error } = await supabase
          .from('video_projects')
          .update(projectData)
          .eq('id', editingProject.id)
        
        if (error) throw error
        
        toast({
          title: "Success",
          description: "Project updated successfully"
        })
      } else {
        // Create new project
        const { error } = await supabase
          .from('video_projects')
          .insert([projectData])
        
        if (error) throw error
        
        toast({
          title: "Success",
          description: "Project saved successfully"
        })
      }

      setShowProjectDialog(false)
      setEditingProject(null)
      setProjectName('')
      loadProjects()
      
    } catch (error) {
      console.error('Error saving project:', error)
      toast({
        title: "Error",
        description: "Failed to save project",
        variant: "destructive"
      })
    }
  }

  const generateVideo = async () => {
    console.log('generateVideo function called!')
    console.log('selectedAudio:', selectedAudio)
    console.log('customAudio:', customAudio)
    console.log('selectedCover:', selectedCover)
    console.log('customCover:', customCover)
    
    if (!selectedAudio && !customAudio) {
      console.log('No audio selected')
      toast({
        title: "Error",
        description: "Please select or upload audio",
        variant: "destructive"
      })
      return
    }
  
    if (!selectedCover && !customCover) {
      console.log('No cover selected')
      toast({
        title: "Error",
        description: "Please select or upload cover art",
        variant: "destructive"
      })
      return
    }
  
    try {
      console.log('Starting video generation...')
      setGenerating(true)
      setGenerationProgress(0)
      
      // Create canvas for video generation
      console.log('Creating canvas...')
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('Could not get canvas context')
      }
      console.log('Canvas created successfully')
  
      // Set canvas size based on format
      if (videoFormat === 'youtube') {
        canvas.width = 1920
        canvas.height = 1080
      } else {
        canvas.width = 1080
        canvas.height = 1920
      }
      console.log('Canvas size set:', canvas.width, 'x', canvas.height)
  
      // Fill background
      console.log('Filling background with color:', backgroundColor)
      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)
  
      // Load and draw cover art
      console.log('Loading cover art...')
      const coverImg = new window.Image()
      coverImg.crossOrigin = 'anonymous'
      
      await new Promise((resolve, reject) => {
        coverImg.onload = () => {
          console.log('Cover art loaded successfully')
          resolve(null)
        }
        coverImg.onerror = (error) => {
          console.error('Cover art failed to load:', error)
          reject(error)
        }
        
        if (selectedCover) {
          console.log('Using selected cover:', selectedCover.url)
          coverImg.src = selectedCover.url
        } else if (customCover) {
          console.log('Using custom cover')
          coverImg.src = URL.createObjectURL(customCover)
        }
      })
      console.log('Cover art loaded, dimensions:', coverImg.width, 'x', coverImg.height)
  
      // Calculate cover art positioning and scaling
      const crop = videoFormat === 'youtube' ? youtubeCrop : reelsCrop
      const scale = crop.scale * 3 // Adjust scale factor for canvas
      const x = (canvas.width / 2) + crop.x * 2
      const y = (canvas.height / 2) + crop.y * 2
      
      const imgWidth = coverImg.width * scale
      const imgHeight = coverImg.height * scale
      
      console.log('Drawing cover art with crop settings:', { crop, scale, x, y, imgWidth, imgHeight })
      
      // Draw cover art
      ctx.drawImage(
        coverImg,
        x - (imgWidth / 2),
        y - (imgHeight / 2),
        imgWidth,
        imgHeight
      )
      console.log('Cover art drawn to canvas')
  
      // Add text overlay if specified
      if (textOverlay) {
        console.log('Adding text overlay:', textOverlay)
        ctx.fillStyle = textColor
        ctx.font = `bold ${textSize * 2}px Arial`
        ctx.textAlign = 'center'
        
        let textY
        if (textPosition === 'top') {
          textY = textSize * 3
        } else if (textPosition === 'bottom') {
          textY = canvas.height - textSize * 3
        } else {
          textY = canvas.height / 2
        }
        
        // Add text shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
        ctx.shadowBlur = 4
        ctx.shadowOffsetX = 2
        ctx.shadowOffsetY = 2
        
        ctx.fillText(textOverlay, canvas.width / 2, textY)
        console.log('Text overlay added')
      }
  
      // Check if MediaRecorder is supported at all
      console.log('Checking MediaRecorder support...')
      if (typeof MediaRecorder === 'undefined') {
        console.warn('MediaRecorder not supported, creating static image instead')
        
        // Convert canvas to blob and download as image
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => {
            if (blob) resolve(blob)
          }, 'image/png')
        })
        
        setGenerationProgress(100)
        
        toast({
          title: "Video Recording Not Supported",
          description: "Your browser doesn't support video recording. Downloading as image instead.",
          variant: "default"
        })
        
        // Download the generated image
        setTimeout(() => {
          const link = document.createElement('a')
          link.href = URL.createObjectURL(blob)
          link.download = `image-${videoFormat}-${Date.now()}.png`
          link.click()
        }, 1000)
        
        return
      }
      console.log('MediaRecorder is supported')
      
      // Create a MediaRecorder to record the canvas
      let canvasStream: MediaStream
      
      try {
        console.log('Attempting to capture canvas stream...')
        canvasStream = canvas.captureStream(30) // 30 FPS
        console.log('Canvas stream captured successfully:', canvasStream)
      } catch (error) {
        console.warn('canvas.captureStream not supported, creating static image instead:', error)
        
        // Convert canvas to blob and download as image
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => {
            if (blob) resolve(blob)
          }, 'image/png')
        })
        
        setGenerationProgress(100)
        
        toast({
          title: "Video Recording Not Supported",
          description: "Your browser doesn't support canvas recording. Downloading as image instead.",
          variant: "default"
        })
        
        // Download the generated image
        setTimeout(() => {
          const link = document.createElement('a')
          link.href = URL.createObjectURL(blob)
          link.download = `image-${videoFormat}-${Date.now()}.png`
          link.click()
        }, 1000)
        
        return
      }
       
      // Check for supported MediaRecorder formats with multiple fallbacks
      console.log('Checking supported MediaRecorder formats...')
      let mimeType = null
      const supportedTypes = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8', 
        'video/webm',
        'video/mp4',
        'video/ogg;codecs=theora'
      ]
      
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type
          console.log('Found supported mime type:', mimeType)
          break
        }
      }
      
      if (!mimeType) {
        // If no video recording is supported, fall back to creating a static image
        console.warn('Video recording not supported, creating static image instead')
        
        // Convert canvas to blob and download as image
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => {
            if (blob) resolve(blob)
          }, 'image/png')
        })
        
        setGenerationProgress(100)
        
        toast({
          title: "Video Recording Not Supported",
          description: "Your browser doesn't support video recording. Downloading as image instead.",
          variant: "default"
        })
        
        // Download the generated image
        setTimeout(() => {
          const link = document.createElement('a')
          link.href = URL.createObjectURL(blob)
          link.download = `image-${videoFormat}-${Date.now()}.png`
          link.click()
        }, 1000)
        
        return
      }
      
      console.log('Creating MediaRecorder with mime type:', mimeType)
      const mediaRecorder = new MediaRecorder(canvasStream, { mimeType })
      console.log('MediaRecorder created:', mediaRecorder)
       
      const chunks: Blob[] = []
      
      // Set up the recording
      console.log('Setting up MediaRecorder event handlers...')
      mediaRecorder.ondataavailable = (event) => {
        console.log('ondataavailable fired, data size:', event.data.size)
        if (event.data.size > 0) {
          chunks.push(event.data)
          console.log('Chunk added, total chunks:', chunks.length)
        }
      }
      
      mediaRecorder.onstop = async () => {
        console.log('onstop fired, processing video...')
        try {
          const videoBlob = new Blob(chunks, { type: 'video/webm' })
          console.log('Video blob created, size:', videoBlob.size)
          
          setGenerationProgress(100)
          
          toast({
            title: "Success",
            description: "Video generated successfully! Download will begin shortly."
          })
          
          // Download the generated video
          setTimeout(() => {
            const link = document.createElement('a')
            link.href = URL.createObjectURL(videoBlob)
            link.download = `video-${videoFormat}-${Date.now()}.webm`
            link.click()
            console.log('Video download initiated')
          }, 1000)
        } catch (error) {
          console.error('Error creating video blob:', error)
          toast({
            title: "Error",
            description: "Failed to create video file",
            variant: "destructive"
          })
        }
      }
      
      // Start recording
      console.log('Starting MediaRecorder...')
      mediaRecorder.start()
      console.log('MediaRecorder started, state:', mediaRecorder.state)
      
      // Update progress during recording
      console.log('Setting up progress interval...')
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, (duration * 1000) / 9) // Spread progress over 90% of duration
      console.log('Progress interval set up, duration:', duration, 'seconds')
       
      // Record for the specified duration
      console.log('Setting timeout to stop recording in', duration, 'seconds...')
      setTimeout(() => {
        console.log('Timeout fired, stopping recording...')
        try {
          clearInterval(progressInterval)
          console.log('Progress interval cleared')
          mediaRecorder.stop()
          console.log('MediaRecorder.stop() called')
        } catch (error) {
          console.error('Error stopping recording:', error)
          clearInterval(progressInterval)
          // Force stop if needed
          if (mediaRecorder.state === 'recording') {
            console.log('Force stopping MediaRecorder...')
            mediaRecorder.stop()
          }
        }
      }, duration * 1000)
      console.log('Timeout set successfully')
       
    } catch (error) {
      console.error('Error generating video:', error)
      toast({
        title: "Error",
        description: "Failed to generate video",
        variant: "destructive"
      })
    } finally {
      console.log('Finally block executed, cleaning up...')
      setGenerating(false)
      setGenerationProgress(0)
    }
  }

  const openProject = (project: VideoProject) => {
    setEditingProject(project)
    setProjectName(project.name)
    setSelectedAudio(project.audio)
    setSelectedCover(project.cover)
    setCustomAudio(project.customAudio)
    setCustomCover(project.customCover)
    setVideoFormat(project.format)
    setDuration(project.duration)
    setFadeIn(project.fadeIn)
    setFadeOut(project.fadeOut)
    setTextOverlay(project.textOverlay)
    setTextColor(project.textColor)
    setTextSize(project.textSize)
    setTextPosition(project.textPosition)
    setBackgroundColor(project.backgroundColor)
    setShowProjectDialog(true)
  }

  const deleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return
    
    try {
      // Check if video_projects table exists first
      const { error: tableCheckError } = await supabase
        .from('video_projects')
        .select('id')
        .limit(1)
      
      if (tableCheckError) {
        toast({
          title: "Setup Required",
          description: "Please run the database migration first to create the video_projects table",
          variant: "destructive"
        })
        return
      }

      const { error } = await supabase
        .from('video_projects')
        .delete()
        .eq('id', projectId)
      
      if (error) throw error
      
      toast({
        title: "Success",
        description: "Project deleted successfully"
      })
      
      loadProjects()
    } catch (error) {
      console.error('Error deleting project:', error)
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive"
      })
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading your content...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">MP4 Video Converter</h1>
        <p className="text-gray-600">Create videos from your music for YouTube and Reels</p>
        
        {/* Setup Notice */}
        {projects.length === 0 && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-blue-900">Setup Required</h3>
                <p className="text-sm text-blue-700 mt-1">
                  To save and manage video projects, you need to run the database migration first. 
                  The migration file is located at <code className="bg-blue-100 px-1 rounded">migrations/079_create_video_projects_table.sql</code>
                </p>
                <p className="text-sm text-blue-600 mt-2">
                  You can still use the converter to create videos, but projects won't be saved until the migration is complete.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Content Selection Panel */}
        <div className="lg:col-span-1">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Content Selection</h2>
            
            <Tabs defaultValue="audio" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="audio">Audio</TabsTrigger>
                <TabsTrigger value="covers">Covers</TabsTrigger>
              </TabsList>
              
              <TabsContent value="audio" className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Your Music</Label>
                  <div className="space-y-2 mt-2 max-h-60 overflow-y-auto">
                    {singles.map(single => (
                      <div
                        key={single.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedAudio?.id === single.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleAudioSelect(single)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Music className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{single.title}</p>
                            <p className="text-xs text-gray-500 truncate">{single.artist}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">Single</Badge>
                              {single.cover_art_url && (
                                <Badge variant="outline" className="text-xs text-green-600">
                                  Has Cover
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                                        
                    {albums.map(track => (
                      <div
                        key={track.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedAudio?.id === track.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleAudioSelect(track)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <Music className="h-5 w-5 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{track.title}</p>
                            <p className="text-xs text-gray-500 truncate">{track.artist}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">Album Track</Badge>
                              {track.cover_art_url && (
                                <Badge variant="outline" className="text-xs text-green-600">
                                  Has Cover
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                                        
                    {tracks.map(track => (
                      <div
                        key={track.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedAudio?.id === track.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleAudioSelect(track)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <Music className="h-5 w-5 text-purple-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{track.title}</p>
                            <p className="text-xs text-gray-500 truncate">{track.artist}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">Track</Badge>
                              {track.cover_art_url && (
                                <Badge variant="outline" className="text-xs text-green-600">
                                  Has Cover
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <Label className="text-sm font-medium">Custom Audio</Label>
                  <div className="mt-2">
                    <input
                      ref={audioFileInputRef}
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleCustomAudioUpload(file)
                      }}
                    />
                    <Button
                      variant="outline"
                      onClick={() => audioFileInputRef.current?.click()}
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Audio File
                    </Button>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="covers" className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Your Covers</Label>
                  <div className="space-y-2 mt-2 max-h-60 overflow-y-auto">
                    {covers.map(cover => (
                      <div
                        key={cover.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedCover?.id === cover.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleCoverSelect(cover)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                            <Image className="h-5 w-5 text-orange-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{cover.name}</p>
                            <Badge variant="secondary" className="text-xs">{cover.type}</Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <Label className="text-sm font-medium">Custom Cover</Label>
                  <div className="mt-2">
                    <input
                      ref={coverFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleCustomCoverUpload(file)
                      }}
                    />
                    <Button
                      variant="outline"
                      onClick={() => coverFileInputRef.current?.click()}
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Cover Image
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        {/* Video Settings Panel */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Video Settings</h2>
              <Button onClick={() => setShowProjectDialog(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Save Project
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Format Selection */}
              <div>
                <Label className="text-sm font-medium">Video Format</Label>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="youtube"
                      name="format"
                      value="youtube"
                      checked={videoFormat === 'youtube'}
                      onChange={(e) => setVideoFormat(e.target.value as 'youtube' | 'reels')}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="youtube" className="flex items-center gap-2 cursor-pointer">
                      <Youtube className="h-4 w-4 text-red-600" />
                      YouTube (16:9)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="reels"
                      name="format"
                      value="reels"
                      checked={videoFormat === 'reels'}
                      onChange={(e) => setVideoFormat(e.target.value as 'youtube' | 'reels')}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="reels" className="flex items-center gap-2 cursor-pointer">
                      <Instagram className="h-4 w-4 text-purple-600" />
                      Reels (9:16)
                    </Label>
                  </div>
                </div>
              </div>

              {/* Duration Settings */}
              <div>
                <Label className="text-sm font-medium">Duration (seconds)</Label>
                <Input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  min="1"
                  max="600"
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formatTime(duration)}
                </p>
              </div>

              {/* Fade Settings */}
              <div>
                <Label className="text-sm font-medium">Fade In (seconds)</Label>
                <Input
                  type="number"
                  value={fadeIn}
                  onChange={(e) => setFadeIn(Number(e.target.value))}
                  min="0"
                  max="10"
                  step="0.1"
                  className="mt-2"
                />
              </div>

              <div>
                <Label className="text-sm font-medium">Fade Out (seconds)</Label>
                <Input
                  type="number"
                  value={fadeOut}
                  onChange={(e) => setFadeOut(Number(e.target.value))}
                  min="0"
                  max="10"
                  step="0.1"
                  className="mt-2"
                />
              </div>

              {/* Text Overlay */}
              <div className="md:col-span-2">
                <Label className="text-sm font-medium">Text Overlay</Label>
                <Textarea
                  value={textOverlay}
                  onChange={(e) => setTextOverlay(e.target.value)}
                  placeholder="Enter text to display over the video..."
                  className="mt-2"
                  rows={3}
                />
              </div>

              {/* Text Styling */}
              <div>
                <Label className="text-sm font-medium">Text Color</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    type="text"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Text Size</Label>
                <Input
                  type="number"
                  value={textSize}
                  onChange={(e) => setTextSize(Number(e.target.value))}
                  min="12"
                  max="120"
                  className="mt-2"
                />
              </div>

              <div>
                <Label className="text-sm font-medium">Text Position</Label>
                <Select value={textPosition} onValueChange={(value: 'top' | 'center' | 'bottom') => setTextPosition(value)}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="top">Top</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="bottom">Bottom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">Background Color</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    type="text"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>



            {/* Video Preview */}
            {(selectedCover || customCover) && (
              <div className="mt-6 p-4 bg-[#141414] rounded-lg border border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-300">Video Preview</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Live Preview</span>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
                
                                <div className="flex flex-col lg:flex-row gap-6">
                  {/* YouTube Preview (16:9) */}
                  <div className="flex-1">
                    <h4 className="text-sm font-medium mb-2 text-gray-700 flex items-center gap-2">
                      <Youtube className="h-4 w-4 text-red-600" />
                      YouTube (16:9)
                    </h4>
                    <div 
                      className="relative bg-gray-800 rounded-lg overflow-hidden shadow-lg border-2 border-gray-300"
                      style={{
                        aspectRatio: '16/9',
                        backgroundColor: backgroundColor
                      }}
                    >
                      {/* Cover Art */}
                      {(selectedCover || customCover) && (
                        <div className="absolute inset-0 flex items-center justify-center overflow-visible" style={{ width: '400%', height: '400%', left: '-150%', top: '-150%' }}>
                          {selectedCover ? (
                            <img 
                              src={selectedCover.url} 
                              alt={selectedCover.name}
                              className="object-contain"
                              style={{
                                width: `${youtubeCrop.scale * 300}%`,
                                height: `${youtubeCrop.scale * 300}%`,
                                transform: `translate(${youtubeCrop.x}px, ${youtubeCrop.y}px)`
                              }}
                            />
                          ) : customCover ? (
                            <img 
                              src={URL.createObjectURL(customCover)} 
                              alt="Custom Cover"
                              className="object-contain"
                              style={{
                                width: `${youtubeCrop.scale * 300}%`,
                                height: `${youtubeCrop.scale * 300}%`,
                                transform: `translate(${youtubeCrop.x}px, ${youtubeCrop.y}px)`
                              }}
                            />
                          ) : null}
                        </div>
                      )}
                      
                      {/* Text Overlay */}
                      {textOverlay && (
                        <div 
                          className="absolute inset-0 flex items-center justify-center pointer-events-none"
                          style={{
                            alignItems: textPosition === 'top' ? 'flex-start' : 
                                     textPosition === 'bottom' ? 'flex-end' : 'center',
                            paddingTop: textPosition === 'top' ? '2rem' : '0',
                            paddingBottom: textPosition === 'bottom' ? '2rem' : '0'
                          }}
                        >
                          <div 
                            className="px-4 py-2 text-center font-bold"
                            style={{
                              color: textColor,
                              fontSize: `${textSize}px`,
                              textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                            }}
                          >
                            {textOverlay}
                          </div>
                        </div>
                      )}
                      
                      {/* Format Label */}
                      <div className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded font-medium">
                        YouTube
                      </div>
                      
                      {/* Duration Badge */}
                      <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                        {formatTime(duration)}
                      </div>
                    </div>
                    
                    {/* YouTube Cropping Controls - Directly under the preview */}
                    <div className="mt-3 p-3 bg-[#141414] rounded border border-gray-700">
                      <h5 className="text-xs font-medium mb-2 text-gray-300">Cropping Controls</h5>
                      <div className="space-y-2">
                        <div>
                          <Label className="text-xs text-gray-600">Scale</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="range"
                              min="0.1"
                              max="5.0"
                              step="0.05"
                              value={youtubeCrop.scale}
                              onChange={(e) => setYoutubeCrop(prev => ({ ...prev, scale: parseFloat(e.target.value) }))}
                              className="flex-1 h-2"
                            />
                            <span className="text-xs text-gray-500 min-w-[2.5rem]">{youtubeCrop.scale.toFixed(1)}x</span>
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-xs text-gray-600">X Position</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="range"
                              min="-150"
                              max="150"
                              step="10"
                              value={youtubeCrop.x}
                              onChange={(e) => setYoutubeCrop(prev => ({ ...prev, x: parseInt(e.target.value) }))}
                              className="flex-1 h-2"
                            />
                            <span className="text-xs text-gray-500 min-w-[2.5rem]">{youtubeCrop.x}</span>
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-xs text-gray-600">Y Position</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="range"
                              min="-150"
                              max="150"
                              step="10"
                              value={youtubeCrop.y}
                              onChange={(e) => setYoutubeCrop(prev => ({ ...prev, y: parseInt(e.target.value) }))}
                              className="flex-1 h-2"
                            />
                            <span className="text-xs text-gray-500 min-w-[2.5rem]">{youtubeCrop.y}</span>
                          </div>
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setYoutubeCrop({ scale: 1.0, x: 0, y: 0 })}
                          className="w-full text-xs"
                        >
                          Reset YouTube
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Reels Preview (9:16) */}
                  <div className="flex-1">
                    <h4 className="text-sm font-medium mb-2 text-gray-700 flex items-center gap-2">
                      <Instagram className="h-4 w-4 text-purple-600" />
                      Reels (9:16)
                    </h4>
                    <div 
                      className="relative bg-gray-800 rounded-lg overflow-hidden shadow-lg border-2 border-gray-300 mx-auto"
                      style={{
                        aspectRatio: '9/16',
                        width: '200px',
                        backgroundColor: backgroundColor
                      }}
                    >
                      {/* Cover Art */}
                      {(selectedCover || customCover) && (
                        <div className="absolute inset-0 flex items-center justify-center overflow-visible" style={{ width: '400%', height: '400%', left: '-150%', top: '-150%' }}>
                          {selectedCover ? (
                            <img 
                              src={selectedCover.url} 
                              alt={selectedCover.name}
                              className="object-contain"
                              style={{
                                width: `${reelsCrop.scale * 300}%`,
                                height: `${reelsCrop.scale * 300}%`,
                                transform: `translate(${reelsCrop.x}px, ${reelsCrop.y}px)`
                              }}
                            />
                          ) : customCover ? (
                            <img 
                              src={URL.createObjectURL(customCover)} 
                              alt="Custom Cover"
                              className="object-contain"
                              style={{
                                width: `${reelsCrop.scale * 300}%`,
                                height: `${reelsCrop.scale * 300}%`,
                                transform: `translate(${reelsCrop.x}px, ${reelsCrop.y}px)`
                              }}
                            />
                          ) : null}
                        </div>
                      )}
                      
                      {/* Text Overlay */}
                      {textOverlay && (
                        <div 
                          className="absolute inset-0 flex items-center justify-center pointer-events-none"
                          style={{
                            alignItems: textPosition === 'top' ? 'flex-start' : 
                                     textPosition === 'bottom' ? 'flex-end' : 'center',
                            paddingTop: textPosition === 'top' ? '2rem' : '0',
                            paddingBottom: textPosition === 'bottom' ? '2rem' : '0'
                          }}
                        >
                          <div 
                            className="px-4 py-2 text-center font-bold"
                            style={{
                              color: textColor,
                              fontSize: `${Math.min(textSize, 36)}px`, // Smaller for mobile
                              textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                            }}
                          >
                            {textOverlay}
                          </div>
                        </div>
                      )}
                      
                      {/* Format Label */}
                      <div className="absolute top-2 right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded font-medium">
                        Reels
                      </div>
                      
                      {/* Duration Badge */}
                      <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                        {formatTime(duration)}
                      </div>
                    </div>
                    
                    {/* Reels Cropping Controls - Directly under the preview */}
                    <div className="mt-3 p-3 bg-[#141414] rounded border border-gray-700">
                      <h5 className="text-xs font-medium mb-2 text-gray-300">Cropping Controls</h5>
                      <div className="space-y-2">
                        <div>
                          <Label className="text-xs text-gray-600">Scale</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="range"
                              min="0.1"
                              max="5.0"
                              step="0.05"
                              value={reelsCrop.scale}
                              onChange={(e) => setReelsCrop(prev => ({ ...prev, scale: parseFloat(e.target.value) }))}
                              className="flex-1 h-2"
                            />
                            <span className="text-xs text-gray-500 min-w-[2.5rem]">{reelsCrop.scale.toFixed(1)}x</span>
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-xs text-gray-600">X Position</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="range"
                              min="-100"
                              max="100"
                              step="5"
                              value={reelsCrop.x}
                              onChange={(e) => setReelsCrop(prev => ({ ...prev, x: parseInt(e.target.value) }))}
                              className="flex-1 h-2"
                            />
                            <span className="text-xs text-gray-500 min-w-[2.5rem]">{reelsCrop.x}</span>
                          </div>
                        </div>
                        
                                                  <div>
                            <Label className="text-xs text-gray-600">Y Position</Label>
                            <div className="flex items-center gap-2">
                            <Input
                              type="range"
                              min="-50"
                              max="50"
                              step="5"
                              value={reelsCrop.y}
                              onChange={(e) => setReelsCrop(prev => ({ ...prev, y: parseInt(e.target.value) }))}
                              className="flex-1 h-2"
                            />
                            <span className="text-xs text-gray-500 min-w-[2.5rem]">{reelsCrop.y}</span>
                          </div>
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReelsCrop({ scale: 1.0, x: 0, y: 0 })}
                          className="w-full text-xs"
                        >
                          Reset Reels
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Preview Controls & Info */}
                <div className="mt-4 p-3 bg-[#141414] rounded border border-gray-700">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-300">Background:</span> 
                      <div 
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: backgroundColor }}
                      />
                      <span className="text-gray-400">{backgroundColor}</span>
                    </div>
                    
                    {textOverlay && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-300">Text:</span> 
                        <span style={{ color: textColor }} className="font-medium">{textOverlay}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-300">Duration:</span> 
                      <span className="text-gray-400">{formatTime(duration)}</span>
                    </div>
                  </div>
                  
                  {/* Fade Effects Info */}
                  <div className="mt-3 pt-3 border-t border-gray-600 text-xs text-gray-400">
                    <span className="font-medium">Fade Effects:</span> 
                    <span className="ml-2">
                      In: {fadeIn}s | Out: {fadeOut}s
                    </span>
                  </div>
                </div>
              </div>
            )}



            {/* Audio Preview */}
            {(selectedAudio || customAudio) && (
              <div className="mt-6 p-4 bg-[#141414] rounded-lg border border-gray-700">
                <h3 className="font-medium mb-3 text-gray-300">Audio Preview</h3>
                <div className="flex items-center gap-4">
                  <Button
                    onClick={toggleAudioPlayback}
                    variant="outline"
                    size="sm"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-100"
                        style={{ width: `${(currentTime / duration) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  {selectedAudio ? `${selectedAudio.title} - ${selectedAudio.artist}` : customAudio?.name}
                </p>
              </div>
            )}

            {/* Selection Status */}
            <div className="mt-4 p-3 rounded-lg border">
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-3 h-3 rounded-full ${hasCompleteSelection() ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <span className={hasCompleteSelection() ? 'text-green-700' : 'text-yellow-700'}>
                  {hasCompleteSelection() 
                    ? 'Ready to generate video!' 
                    : 'Please select audio and cover art to continue'
                  }
                </span>
              </div>
              
              {selectedAudio && (
                <div className="mt-2 text-xs text-gray-600">
                  <span className="font-medium">Audio:</span> {selectedAudio.title} - {selectedAudio.artist}
                  {selectedCover && (
                    <span className="ml-2">
                      <span className="font-medium">Cover:</span> {selectedCover.name}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Generate Button */}
            <div className="mt-6">
              <Button
                onClick={() => {
                  console.log('Button clicked!')
                  console.log('hasCompleteSelection():', hasCompleteSelection())
                  console.log('generating:', generating)
                  console.log('selectedAudio:', selectedAudio)
                  console.log('customAudio:', customAudio)
                  console.log('selectedCover:', selectedCover)
                  console.log('customCover:', customCover)
                  generateVideo()
                }}
                disabled={generating || !hasCompleteSelection()}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                size="lg"
                style={{ cursor: 'pointer' }}
              >
                {generating ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Generating Video... {generationProgress}%
                  </>
                ) : (
                  <>
                    <Video className="h-5 w-5 mr-2" />
                    Generate MP4 Video
                  </>
                )}
              </Button>
            </div>

            {/* Progress Bar */}
            {generating && (
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${generationProgress}%` }}
                  />
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Saved Projects */}
      {projects.length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Saved Projects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => (
              <Card key={project.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{project.name}</h3>
                    <p className="text-sm text-gray-500">
                      {project.format === 'youtube' ? 'YouTube (16:9)' : 'Reels (9:16)'}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openProject(project)}
                    >
                      <Edit3 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteProject(project.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Audio:</span> {project.audio?.title || 'Custom'}</p>
                  <p><span className="font-medium">Cover:</span> {project.cover?.name || 'Custom'}</p>
                  <p><span className="font-medium">Duration:</span> {formatTime(project.duration)}</p>
                  <p><span className="font-medium">Created:</span> {project.createdAt.toLocaleDateString()}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Project Dialog */}
      <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProject ? 'Edit Project' : 'Save New Project'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Enter project name..."
                className="mt-2"
              />
            </div>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={saveProject}>
              {editingProject ? 'Update Project' : 'Save Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
