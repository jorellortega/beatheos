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
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
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
  // Database uses snake_case
  format: 'youtube' | 'reels'
  duration: number
  fade_in: number
  fade_out: number
  text_overlay: string
  text_color: string
  text_size: number
  text_position: 'top' | 'center' | 'bottom'
  background_color: string
  description?: string // Stores crop settings and other metadata as JSON
  created_at: Date
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
  const [videoFormat, setVideoFormat] = useState<'youtube' | 'reels' | 'both'>('youtube')
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
  
  // Search states
  const [audioSearch, setAudioSearch] = useState('')
  const [coverSearch, setCoverSearch] = useState('')
  
  // State for video generation
  const [generating, setGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [generationStatus, setGenerationStatus] = useState('')
  
  // Audio preview
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  
  // Refs
  const audioFileInputRef = useRef<HTMLInputElement>(null)
  const coverFileInputRef = useRef<HTMLInputElement>(null)
  const ffmpegRef = useRef(new FFmpeg())
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false)

  useEffect(() => {
    if (user) {
      loadContent()
      loadProjects()
    }
  }, [user])

  // Load FFmpeg on component mount
  useEffect(() => {
    loadFFmpeg()
  }, [])

  const loadFFmpeg = async () => {
    try {
      console.log('[DEBUG] Loading FFmpeg...')
      const ffmpeg = ffmpegRef.current
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
      
      ffmpeg.on('log', ({ message }) => {
        console.log('[FFMPEG LOG]', message)
      })
      
      ffmpeg.on('progress', ({ progress, time }) => {
        const percent = Math.round(progress * 100)
        console.log('[FFMPEG PROGRESS]', percent + '%', 'time:', time)
        if (generating) {
          const adjustedProgress = 45 + (percent * 0.45) // 45-90% range for encoding
          setGenerationProgress(adjustedProgress)
          console.log('[DEBUG] Updated progress to:', adjustedProgress)
        }
      })

      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      })
      
      setFfmpegLoaded(true)
      console.log('[DEBUG] FFmpeg loaded successfully')
    } catch (error) {
      console.error('[ERROR] Failed to load FFmpeg:', error)
    }
  }

  const generateVideoWithFFmpeg = async (
    coverImg: HTMLImageElement,
    audioBlob: Blob,
    duration: number,
    format: 'youtube' | 'reels'
  ) => {
    const ffmpeg = ffmpegRef.current
    
    try {
      console.log('[DEBUG] Starting FFmpeg video generation for format:', format)
      setGenerationProgress(15)
      setGenerationStatus(`Creating ${format} video frames...`)
      
      // Create canvas and draw cover image
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Could not get canvas context')
      
      // Set canvas size based on format
      if (format === 'youtube') {
        canvas.width = 1920
        canvas.height = 1080
      } else {
        canvas.width = 1080
        canvas.height = 1920
      }
      
      console.log('[DEBUG] ========================================')
      console.log('[DEBUG] CANVAS RENDERING - Format:', format)
      console.log('[DEBUG] Canvas size:', canvas.width, 'x', canvas.height)
      console.log('[DEBUG] Cover image original size:', coverImg.width, 'x', coverImg.height)
      
      // Draw background first
      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      const crop = format === 'youtube' ? youtubeCrop : reelsCrop
      console.log('[DEBUG] Crop settings:', JSON.stringify(crop))
      
      // STEP 1: The preview container is the visible preview area
      // For canvas, this is the full canvas size
      const containerWidth = canvas.width
      const containerHeight = canvas.height
      console.log('[DEBUG] Step 1 - Container (visible area):', containerWidth, 'x', containerHeight)
      
      // STEP 2: Inside preview, there's a 400% container positioned at -150%
      // This creates a larger workspace, but we work relative to the visible container
      // The image is set to crop.scale * 300% of this workspace
      const innerContainerWidth = containerWidth * 4 // 400%
      const innerContainerHeight = containerHeight * 4 // 400%
      console.log('[DEBUG] Step 2 - Inner container (400%):', innerContainerWidth, 'x', innerContainerHeight)
      
      // STEP 3: Image element has width/height: crop.scale * 300%
      // In CSS, 300% = 3x, so crop.scale * 300% = crop.scale * 3
      // This is relative to the INNER container
      const imgElementWidth = innerContainerWidth * crop.scale * 3
      const imgElementHeight = innerContainerHeight * crop.scale * 3
      console.log('[DEBUG] Step 3 - Image element bounds (crop.scale * 300%):', imgElementWidth, 'x', imgElementHeight)
      console.log('[DEBUG] Step 3 - Calculation: innerContainer', innerContainerWidth, '* scale', crop.scale, '* 3 =', imgElementWidth)
      
      // STEP 4: Apply object-contain within these bounds
      const imgAspect = coverImg.width / coverImg.height
      const boundsAspect = imgElementWidth / imgElementHeight
      console.log('[DEBUG] Step 4 - Aspect ratios - Image:', imgAspect.toFixed(3), 'Bounds:', boundsAspect.toFixed(3))
      
      let finalWidth, finalHeight
      if (imgAspect > boundsAspect) {
        // Image is wider - fit to element width
        finalWidth = imgElementWidth
        finalHeight = imgElementWidth / imgAspect
        console.log('[DEBUG] Step 4 - Image is WIDER, fitting to width')
      } else {
        // Image is taller - fit to element height  
        finalHeight = imgElementHeight
        finalWidth = imgElementHeight * imgAspect
        console.log('[DEBUG] Step 4 - Image is TALLER, fitting to height')
      }
      console.log('[DEBUG] Step 4 - Final contained size:', finalWidth, 'x', finalHeight)
      
      // STEP 5: Center within the canvas and apply crop offset
      // The inner container is at -150% offset, which centers it
      // Then the image is centered within that
      const xPos = (containerWidth - finalWidth) / 2 + crop.x
      const yPos = (containerHeight - finalHeight) / 2 + crop.y
      console.log('[DEBUG] Step 5 - Centering offset:', (containerWidth - finalWidth) / 2, ',', (containerHeight - finalHeight) / 2)
      console.log('[DEBUG] Step 5 - Crop offset:', crop.x, ',', crop.y)
      console.log('[DEBUG] Step 5 - Final position:', xPos, ',', yPos)
      
      console.log('[DEBUG] ========================================')
      
      // Draw cover art
      ctx.drawImage(coverImg, xPos, yPos, finalWidth, finalHeight)
      
      // Add text overlay if specified
      if (textOverlay) {
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
        
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
        ctx.shadowBlur = 10
        ctx.shadowOffsetX = 3
        ctx.shadowOffsetY = 3
        
        ctx.fillText(textOverlay, canvas.width / 2, textY)
      }
      
      console.log('[DEBUG] Canvas rendered')
      setGenerationProgress(25)
      setGenerationStatus('Converting canvas to image...')
      
      // Convert canvas to blob
      const imageBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob)
        }, 'image/png')
      })
      
      console.log('[DEBUG] Image blob created, size:', imageBlob.size)
      setGenerationProgress(35)
      setGenerationStatus('Writing files to FFmpeg...')
      
      // Write files to FFmpeg virtual filesystem
      await ffmpeg.writeFile('cover.png', await fetchFile(imageBlob))
      await ffmpeg.writeFile('audio.mp3', await fetchFile(audioBlob))
      
      console.log('[DEBUG] Files written to FFmpeg')
      setGenerationProgress(45)
      setGenerationStatus(`Encoding video (this is FAST!)...`)
      
      // Use FFmpeg to create video from image + audio
      console.log('[DEBUG] ===== STARTING FFMPEG ENCODING =====')
      console.log('[DEBUG] Canvas dimensions:', canvas.width, 'x', canvas.height)
      console.log('[DEBUG] Duration:', duration, 'seconds')
      
      const ffmpegArgs = [
        '-loop', '1',
        '-framerate', '1',  // Only 1 frame per second since image is static!
        '-i', 'cover.png',
        '-i', 'audio.mp3',
        '-c:v', 'libx264',
        '-tune', 'stillimage',  // Optimize for still images
        '-preset', 'ultrafast',  // Fastest encoding preset
        '-t', duration.toString(),
        '-pix_fmt', 'yuv420p',
        '-vf', `scale=${canvas.width}:${canvas.height}`,
        '-c:a', 'aac',
        '-b:a', '128k',
        '-shortest',
        '-y',  // Overwrite output file
        'output.mp4'
      ]
      
      console.log('[DEBUG] FFmpeg command:', 'ffmpeg', ffmpegArgs.join(' '))
      console.log('[DEBUG] Calling ffmpeg.exec()...')
      
      try {
        await ffmpeg.exec(ffmpegArgs)
        console.log('[DEBUG] FFmpeg encoding complete successfully!')
      } catch (error) {
        console.error('[ERROR] FFmpeg exec failed:', error)
        throw new Error(`FFmpeg encoding failed: ${error}`)
      }
      console.log('[DEBUG] FFmpeg exec completed, setting progress to 90%')
      setGenerationProgress(90)
      setGenerationStatus('Reading output file...')
      
      console.log('[DEBUG] Calling ffmpeg.readFile("output.mp4")...')
      const data = await ffmpeg.readFile('output.mp4')
      console.log('[DEBUG] Read file data, type:', typeof data, 'size:', data.length || data.byteLength || 'unknown')
      
      const videoBlob = new Blob([data], { type: 'video/mp4' })
      console.log('[DEBUG] Video blob created, size:', videoBlob.size, 'bytes')
      console.log('[DEBUG] Video blob size in MB:', (videoBlob.size / 1024 / 1024).toFixed(2), 'MB')
      
      setGenerationProgress(100)
      setGenerationStatus('Complete!')
      console.log('[DEBUG] Progress set to 100%, status: Complete!')
      
      return videoBlob
      
    } catch (error) {
      console.error('[ERROR] FFmpeg generation failed:', error)
      throw error
    }
  }

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
      
      // Process data with null safety and filter out items without audio URLs
      const processedSingles = Array.isArray(singlesData) ? singlesData
        .filter(single => {
          const hasAudio = single.audio_url && single.audio_url !== ''
          if (!hasAudio) {
            console.warn('[WARN] Single without audio URL:', single.title, single.id)
          }
          return hasAudio
        })
        .map(single => ({
          ...single,
          type: 'single' as const,
          source: 'singles' as const
        })) : []
      
      const processedAlbumTracks = Array.isArray(albumTracksData) ? albumTracksData
        .filter(track => {
          const hasAudio = track.audio_url && track.audio_url !== ''
          if (!hasAudio) {
            console.warn('[WARN] Album track without audio URL:', track.title, track.id)
          }
          return hasAudio
        })
        .map(track => ({
          id: track.id,
          title: track.title,
          artist: track.albums?.artist || '',
          audio_url: track.audio_url,
          duration: track.duration,
          cover_art_url: track.albums?.cover_art_url,
          type: 'album_track' as const,
          source: 'albums' as const
        })) : []
      
      const processedTracks = Array.isArray(tracksData) ? tracksData
        .filter(track => {
          const hasAudio = track.audio_url && track.audio_url !== ''
          if (!hasAudio) {
            console.warn('[WARN] Track without audio URL:', track.title, track.id)
          }
          return hasAudio
        })
        .map(track => ({
          ...track,
          type: 'track' as const,
          source: 'tracks' as const
        })) : []
      
      console.log('[DEBUG] Loaded audio items:')
      console.log('[DEBUG]   - Singles with audio:', processedSingles.length)
      console.log('[DEBUG]   - Album tracks with audio:', processedAlbumTracks.length)
      console.log('[DEBUG]   - Tracks with audio:', processedTracks.length)
      
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
          createdAt: new Date(project.created_at || project.createdAt)
        })))
      }
    } catch (error) {
      console.error('Error loading projects:', error)
      // Set empty projects on error
      setProjects([])
    }
  }

  const handleAudioSelect = (audio: AudioItem) => {
    // Validate audio URL before selection
    if (!audio.audio_url || audio.audio_url === '') {
      console.error('[ERROR] Cannot select audio without valid URL:', audio)
      toast({
        title: "Invalid Audio",
        description: `"${audio.title}" has no audio file. Please select a different track or upload a custom audio file.`,
        variant: "destructive"
      })
      return
    }
    
    console.log('[DEBUG] Audio selected:', audio.title, '-', audio.audio_url)
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

  // Filter audio items based on search
  const filteredSingles = singles.filter(item => {
    if (!audioSearch) return true
    const searchLower = audioSearch.toLowerCase()
    return (
      item.title.toLowerCase().includes(searchLower) ||
      item.artist.toLowerCase().includes(searchLower)
    )
  })

  const filteredAlbums = albums.filter(item => {
    if (!audioSearch) return true
    const searchLower = audioSearch.toLowerCase()
    return (
      item.title.toLowerCase().includes(searchLower) ||
      item.artist.toLowerCase().includes(searchLower)
    )
  })

  const filteredTracks = tracks.filter(item => {
    if (!audioSearch) return true
    const searchLower = audioSearch.toLowerCase()
    return (
      item.title.toLowerCase().includes(searchLower) ||
      item.artist.toLowerCase().includes(searchLower)
    )
  })

  // Total filtered audio count for display
  const totalFilteredAudio = filteredSingles.length + filteredAlbums.length + filteredTracks.length

  // Filter cover items based on search
  const filteredCovers = covers.filter(cover => {
    if (!coverSearch) return true
    const searchLower = coverSearch.toLowerCase()
    return (
      cover.name.toLowerCase().includes(searchLower) ||
      cover.type.toLowerCase().includes(searchLower)
    )
  })

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
      // Map camelCase to snake_case for database and only save when format is single
      // Note: Database only supports 'youtube' or 'reels', not 'both'
      const formatToSave = videoFormat === 'both' ? 'youtube' : videoFormat
      
      const projectData = {
        name: projectName,
        audio: selectedAudio,
        cover: selectedCover,
        // customAudio and customCover File objects can't be saved to DB
        format: formatToSave,
        duration,
        fade_in: fadeIn,
        fade_out: fadeOut,
        text_overlay: textOverlay,
        text_color: textColor,
        text_size: textSize,
        text_position: textPosition,
        background_color: backgroundColor,
        // Store crop settings as metadata in description for now
        description: JSON.stringify({ youtubeCrop, reelsCrop, originalFormat: videoFormat }),
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
    console.log('[DEBUG] ===== GENERATE VIDEO CALLED (FFMPEG MODE) =====')
    console.log('[DEBUG] selectedAudio:', selectedAudio)
    console.log('[DEBUG] customAudio:', customAudio)
    console.log('[DEBUG] selectedCover:', selectedCover)
    console.log('[DEBUG] customCover:', customCover)
    
    if (!selectedAudio && !customAudio) {
      console.log('[ERROR] No audio selected')
      toast({
        title: "Error",
        description: "Please select or upload audio",
        variant: "destructive"
      })
      return
    }
  
    if (!selectedCover && !customCover) {
      console.log('[ERROR] No cover selected')
      toast({
        title: "Error",
        description: "Please select or upload cover art",
        variant: "destructive"
      })
      return
    }
    
    // Validate audio URL
    if (selectedAudio) {
      console.log('[DEBUG] Validating selected audio:', JSON.stringify(selectedAudio, null, 2))
      if (!selectedAudio.audio_url || selectedAudio.audio_url === '') {
        console.error('[ERROR] Selected audio has no valid audio_url!')
        console.error('[ERROR] Audio object:', selectedAudio)
        toast({
          title: "Error",
          description: "The selected audio file has no valid URL. Please try uploading a custom audio file instead.",
          variant: "destructive"
        })
        return
      }
    }
    
    if (!ffmpegLoaded) {
      toast({
        title: "Please Wait",
        description: "FFmpeg is still loading. Please try again in a moment.",
        variant: "default"
      })
      return
    }
  
    try {
      console.log('[DEBUG] Starting FAST video generation with FFmpeg...')
      setGenerating(true)
      setGenerationProgress(5)
      setGenerationStatus('Loading audio...')
      
      // Load audio as blob
      console.log('[DEBUG] ===== LOADING AUDIO =====')
      let audioBlob: Blob
      if (selectedAudio) {
        const audioSrc = selectedAudio.audio_url || ''
        console.log('[DEBUG] Loading audio from URL:', audioSrc)
        
        if (!audioSrc || audioSrc === '') {
          throw new Error(`Selected audio "${selectedAudio.title}" has no valid audio URL.`)
        }
        
        const response = await fetch(audioSrc)
        if (!response.ok) throw new Error('Failed to fetch audio file')
        audioBlob = await response.blob()
        console.log('[DEBUG] Audio loaded, size:', audioBlob.size, 'bytes')
      } else if (customAudio) {
        audioBlob = customAudio
        console.log('[DEBUG] Using custom audio file:', customAudio.name, customAudio.size, 'bytes')
      } else {
        throw new Error('No audio source available')
      }
      
      setGenerationProgress(10)
      setGenerationStatus('Loading cover image...')
      
      // Load cover image
      console.log('[DEBUG] ===== LOADING COVER IMAGE =====')
      const coverImg = new window.Image()
      coverImg.crossOrigin = 'anonymous'
      
      await new Promise((resolve, reject) => {
        coverImg.onload = () => {
          console.log('[DEBUG] Cover loaded:', coverImg.width, 'x', coverImg.height)
          resolve(null)
        }
        coverImg.onerror = (error) => {
          console.error('[ERROR] Cover failed to load:', error)
          reject(error)
        }
        
        if (selectedCover) {
          coverImg.src = selectedCover.url
        } else if (customCover) {
          coverImg.src = URL.createObjectURL(customCover)
        }
      })
      
      // Generate video with FFmpeg (FAST!)
      if (videoFormat === 'both') {
        console.log('[DEBUG] Generating BOTH formats...')
        
        // Generate YouTube version
        setGenerationStatus('Generating YouTube version...')
        const youtubeBlob = await generateVideoWithFFmpeg(coverImg, audioBlob, duration, 'youtube')
        console.log('[DEBUG] YouTube video complete:', (youtubeBlob.size / 1024 / 1024).toFixed(2), 'MB')
        
        // Download YouTube
        const youtubeLink = document.createElement('a')
        youtubeLink.href = URL.createObjectURL(youtubeBlob)
        youtubeLink.download = `video-youtube-${Date.now()}.mp4`
        youtubeLink.click()
        
        // Generate Reels version
        setGenerationStatus('Generating Reels version...')
        const reelsBlob = await generateVideoWithFFmpeg(coverImg, audioBlob, duration, 'reels')
        console.log('[DEBUG] Reels video complete:', (reelsBlob.size / 1024 / 1024).toFixed(2), 'MB')
        
        // Download Reels
        setTimeout(() => {
          const reelsLink = document.createElement('a')
          reelsLink.href = URL.createObjectURL(reelsBlob)
          reelsLink.download = `video-reels-${Date.now()}.mp4`
          reelsLink.click()
        }, 500)
        
        toast({
          title: "Success!",
          description: `Both videos created! YouTube: ${(youtubeBlob.size / 1024 / 1024).toFixed(2)} MB, Reels: ${(reelsBlob.size / 1024 / 1024).toFixed(2)} MB`,
        })
      } else {
        // Single format
        const videoBlob = await generateVideoWithFFmpeg(coverImg, audioBlob, duration, videoFormat as 'youtube' | 'reels')
        
        console.log('[DEBUG] Video generation complete!')
        console.log('[DEBUG] Final video size:', (videoBlob.size / 1024 / 1024).toFixed(2), 'MB')
        
        // Download the video
        toast({
          title: "Success!",
          description: `Video created! Size: ${(videoBlob.size / 1024 / 1024).toFixed(2)} MB`,
        })
        
        setTimeout(() => {
          const link = document.createElement('a')
          link.href = URL.createObjectURL(videoBlob)
          link.download = `video-${videoFormat}-${Date.now()}.mp4`
          link.click()
          console.log('[DEBUG] Download initiated')
        }, 500)
      }
       
    } catch (error) {
      console.error('[ERROR] Video generation failed:', error)
      
      let errorMessage = "Failed to generate video"
      if (error instanceof Error) {
        if (error.message.includes('Failed to load audio')) {
          errorMessage = "Failed to load audio file. Please check the audio URL or try uploading a custom audio file."
        } else if (error.message.includes('timeout')) {
          errorMessage = "Audio loading timed out. Please try again or use a different audio file."
        } else {
          errorMessage = error.message
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      console.log('Finally block executed, cleaning up...')
      setGenerating(false)
      setGenerationProgress(0)
      setGenerationStatus('')
    }
  }

  const openProject = (project: any) => {
    setEditingProject(project)
    setProjectName(project.name)
    setSelectedAudio(project.audio)
    setSelectedCover(project.cover)
    // Custom uploaded files are not saved with projects
    setCustomAudio(null)
    setCustomCover(null)
    
    // Try to parse description for crop settings and original format
    let metadata = { youtubeCrop: { scale: 1.0, x: 0, y: 0 }, reelsCrop: { scale: 1.0, x: 0, y: 0 }, originalFormat: project.format }
    if (project.description) {
      try {
        metadata = JSON.parse(project.description)
      } catch (e) {
        console.log('[DEBUG] Could not parse project description as JSON')
      }
    }
    
    setVideoFormat(metadata.originalFormat || project.format)
    setDuration(project.duration)
    setFadeIn(project.fade_in || project.fadeIn || 2)
    setFadeOut(project.fade_out || project.fadeOut || 2)
    setTextOverlay(project.text_overlay || project.textOverlay || '')
    setTextColor(project.text_color || project.textColor || '#ffffff')
    setTextSize(project.text_size || project.textSize || 48)
    setTextPosition(project.text_position || project.textPosition || 'center')
    setBackgroundColor(project.background_color || project.backgroundColor || '#000000')
    setYoutubeCrop(metadata.youtubeCrop)
    setReelsCrop(metadata.reelsCrop)
    
    // Show success message
    toast({
      title: "Project Loaded!",
      description: `"${project.name}" has been loaded successfully.`,
    })
    
    // Scroll to video settings section
    setTimeout(() => {
      const videoSettings = document.querySelector('[data-video-settings]')
      if (videoSettings) {
        videoSettings.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
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

      {/* Saved Projects - Quick Load */}
      {projects.length > 0 && (
        <Card className="mb-8 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold">Your Saved Projects</h2>
              <Badge variant="secondary">{projects.length}</Badge>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {projects.map(project => (
              <Card 
                key={project.id} 
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors border-2 hover:border-blue-500"
                onClick={() => openProject(project)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm line-clamp-1">{project.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {project.format === 'youtube' ? (
                        <Badge variant="outline" className="text-xs">
                          <Youtube className="h-3 w-3 mr-1 text-red-600" />
                          16:9
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          <Instagram className="h-3 w-3 mr-1 text-purple-600" />
                          9:16
                        </Badge>
                      )}
                      <span className="text-xs text-gray-500">{formatTime(project.duration)}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteProject(project.id)
                    }}
                    className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                
                <div className="space-y-1 text-xs text-gray-600 mt-3">
                  <p className="line-clamp-1">
                    <Music className="h-3 w-3 inline mr-1" />
                    {project.audio?.title || 'Custom Audio'}
                  </p>
                  <p className="line-clamp-1">
                    <Image className="h-3 w-3 inline mr-1" />
                    {project.cover?.name || 'Custom Cover'}
                  </p>
                  <p className="text-gray-400">
                    {project.createdAt.toLocaleDateString()}
                  </p>
                </div>
                
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-blue-600 font-medium flex items-center">
                    <Eye className="h-3 w-3 mr-1" />
                    Click to load project
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}

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
                {/* Search Bar */}
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search by title, artist, or source..."
                    value={audioSearch}
                    onChange={(e) => setAudioSearch(e.target.value)}
                    className="pl-10"
                  />
                  <Music className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  {audioSearch && (
                    <button
                      onClick={() => setAudioSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Your Music</Label>
                  <p className="text-xs text-gray-500 mt-1 mb-2">
                    {audioSearch 
                      ? `Found ${totalFilteredAudio} matching items`
                      : 'Only showing items with uploaded audio files'
                    }
                  </p>
                  {(singles.length === 0 && albums.length === 0 && tracks.length === 0) && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 mb-2">
                      No audio files found. Please upload a custom audio file below or add audio files to your library first.
                    </div>
                  )}
                  <div className="space-y-2 mt-2 max-h-60 overflow-y-auto">
                    {filteredSingles.length === 0 && filteredAlbums.length === 0 && filteredTracks.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        {audioSearch ? 'No matching audio files found' : 'No audio files available'}
                      </p>
                    )}
                    {filteredSingles.map(single => (
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
                                        
                    {filteredAlbums.map(track => (
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
                                        
                    {filteredTracks.map(track => (
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
                {/* Search Bar */}
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search by name or type..."
                    value={coverSearch}
                    onChange={(e) => setCoverSearch(e.target.value)}
                    className="pl-10"
                  />
                  <Image className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  {coverSearch && (
                    <button
                      onClick={() => setCoverSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Your Covers</Label>
                  <p className="text-xs text-gray-500 mt-1 mb-2">
                    {coverSearch 
                      ? `Found ${filteredCovers.length} matching covers`
                      : `${covers.length} covers available`
                    }
                  </p>
                  <div className="space-y-2 mt-2 max-h-60 overflow-y-auto">
                    {filteredCovers.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        {coverSearch ? 'No matching covers found' : 'No covers available'}
                      </p>
                    )}
                    {filteredCovers.map(cover => (
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
        <div className="lg:col-span-2" data-video-settings>
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
                      onChange={(e) => setVideoFormat(e.target.value as 'youtube' | 'reels' | 'both')}
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
                      onChange={(e) => setVideoFormat(e.target.value as 'youtube' | 'reels' | 'both')}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="reels" className="flex items-center gap-2 cursor-pointer">
                      <Instagram className="h-4 w-4 text-purple-600" />
                      Reels (9:16)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="both"
                      name="format"
                      value="both"
                      checked={videoFormat === 'both'}
                      onChange={(e) => setVideoFormat(e.target.value as 'youtube' | 'reels' | 'both')}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="both" className="flex items-center gap-2 cursor-pointer">
                      <Video className="h-4 w-4 text-blue-600" />
                      Both Formats
                    </Label>
                  </div>
                  {videoFormat === 'both' && (
                    <p className="text-xs text-blue-600 mt-2 flex items-start gap-1">
                      <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>Both YouTube (16:9) and Reels (9:16) videos will be generated and downloaded automatically.</span>
                    </p>
                  )}
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
                  {(videoFormat === 'youtube' || videoFormat === 'both') && (
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
                  )}
                  
                  {/* Reels Preview (9:16) */}
                  {(videoFormat === 'reels' || videoFormat === 'both') && (
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
                  )}
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

            {/* Live Preview Toggle */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900">Fast Offline Processing with FFmpeg</p>
                    <p className="text-blue-700 mt-1">
                      Video generation uses FFmpeg for ultra-fast offline processing. No real-time playback needed!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <div className="mt-4">
              <Button
                onClick={() => {
                  console.log('[DEBUG] Button clicked!')
                  console.log('[DEBUG] hasCompleteSelection():', hasCompleteSelection())
                  console.log('[DEBUG] ffmpegLoaded:', ffmpegLoaded)
                  console.log('[DEBUG] generating:', generating)
                  generateVideo()
                }}
                disabled={generating || !hasCompleteSelection() || !ffmpegLoaded}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white disabled:opacity-50"
                size="lg"
              >
                {!ffmpegLoaded ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Loading FFmpeg...
                  </>
                ) : generating ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Generating Video... {Math.round(generationProgress)}%
                  </>
                ) : (
                  <>
                    <Video className="h-5 w-5 mr-2" />
                    {videoFormat === 'both' ? 'Generate Both Videos (Fast!)' : 'Generate MP4 Video (Fast!)'}
                  </>
                )}
              </Button>
            </div>

            {/* Progress Bar */}
            {generating && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{generationStatus}</span>
                  <span className="font-semibold text-gray-800">{Math.round(generationProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${generationProgress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 text-center">
                  Processing with FFmpeg... This is much faster than real-time!
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>


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
