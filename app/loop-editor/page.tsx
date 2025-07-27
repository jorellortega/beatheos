'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Grid3X3, 
  MapPin, 
  ZoomIn, 
  ZoomOut,
  Scissors,
  Copy,
  Clipboard,
  Undo,
  Redo,
  Save,
  Loader2,
  BarChart3,
  Settings,
  Layers,
  Palette,
  Type,
  Music,
  Clock,
  Target,
  Square
} from 'lucide-react'

interface WaveformPoint {
  x: number
  y: number
}

interface Marker {
  id: string
  time: number
  name: string
  category: string
  color?: string
}

interface Region {
  id: string
  startTime: number
  endTime: number
  name: string
  color: string
  isSelected: boolean
}

interface EditHistory {
  id: string
  type: 'cut' | 'copy' | 'paste' | 'delete' | 'fade' | 'normalize' | 'reverse'
  data: any
  timestamp: number
}

interface AudioLibraryItem {
  id: string
  name: string
  type: string
  description?: string
  file_url?: string
  file_size?: number
  pack_id?: string
  subfolder?: string
  pack?: AudioPack
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
  subfolders?: AudioSubfolder[]
}

interface AudioSubfolder {
  id: string
  pack_id: string
  name: string
  description?: string
  color: string
  position: number
  created_at: string
  updated_at: string
}

export default function LoopEditorPage() {
  // Core state
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [audioUrl, setAudioUrl] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [duration, setDuration] = useState(0)
  const [waveformData, setWaveformData] = useState<WaveformPoint[]>([])
  
  // Playback state
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [playheadPosition, setPlayheadPosition] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [volume, setVolume] = useState(1)
  
  // View state
  const [zoom, setZoom] = useState(1)
  const [verticalZoom, setVerticalZoom] = useState(1)
  const [scrollOffset, setScrollOffset] = useState(0)
  const [viewWidth, setViewWidth] = useState(0)
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [showGrid, setShowGrid] = useState(true)
  const [showWaveform, setShowWaveform] = useState(true)
  
  // Grid state
  const [bpm, setBpm] = useState(120)
  const [gridDivision, setGridDivision] = useState(16) // 16th notes
  const [gridLines, setGridLines] = useState<number[]>([])
  
  // Selection state
  const [selectionStart, setSelectionStart] = useState<number | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null)
  const [isSelecting, setIsSelecting] = useState(false)
  
  // Markers and regions
  const [markers, setMarkers] = useState<Marker[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [selectedMarkers, setSelectedMarkers] = useState<string[]>([])
  const [selectedRegions, setSelectedRegions] = useState<string[]>([])
  
  // Marker editing state
  const [editingMarker, setEditingMarker] = useState<string | null>(null)
  const [editingMarkerName, setEditingMarkerName] = useState('')
  const [editingMarkerTime, setEditingMarkerTime] = useState('')
  const [editingMarkerStep, setEditingMarkerStep] = useState('')
  const [editingMarkerBar, setEditingMarkerBar] = useState('')
  const [editingMarkerCategory, setEditingMarkerCategory] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [customCategories, setCustomCategories] = useState<string[]>([])
  const [showCategoryInput, setShowCategoryInput] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  
  // Editing state
  const [editingRegion, setEditingRegion] = useState<string | null>(null)
  const [clipboard, setClipboard] = useState<any>(null)
  const [editHistory, setEditHistory] = useState<EditHistory[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  
  // UI state
  const [showSettings, setShowSettings] = useState(false)
  const [showLayers, setShowLayers] = useState(false)
  const [activeTool, setActiveTool] = useState<'select' | 'cut' | 'fade' | 'marker' | 'region'>('select')
  
  // Library state
  const [showLibrary, setShowLibrary] = useState(false)
  const [audioLibraryItems, setAudioLibraryItems] = useState<AudioLibraryItem[]>([])
  const [audioPacks, setAudioPacks] = useState<AudioPack[]>([])
  const [loadingLibrary, setLoadingLibrary] = useState(false)
  const [selectedPack, setSelectedPack] = useState<string | null>(null)
  const [expandedSubfolders, setExpandedSubfolders] = useState<Set<string>>(new Set())
  const { user } = useAuth()
  
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const animationRef = useRef<number | undefined>(undefined)
  const isDraggingRef = useRef<boolean>(false)
  const dragTypeRef = useRef<'playhead' | 'selection' | 'region' | 'marker' | null>(null)
  
  // Calculate grid
  const secondsPerBeat = 60 / bpm
  const stepDuration = secondsPerBeat / (gridDivision / 4)
  const totalDuration = duration
  
  // Update grid lines when BPM or division changes
  useEffect(() => {
    const lines = []
    for (let i = 0; i <= Math.ceil(totalDuration / stepDuration); i++) {
      lines.push(i * stepDuration)
    }
    setGridLines(lines)
  }, [bpm, gridDivision, totalDuration, stepDuration])
  
  // Load audio file
  const loadAudioFile = useCallback(async (file: File) => {
    setIsLoading(true)
    try {
      const url = URL.createObjectURL(file)
      setAudioUrl(url)
      setAudioFile(file)
      
      // Load waveform
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const arrayBuffer = await file.arrayBuffer()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      
      const channelData = audioBuffer.getChannelData(0)
      const sampleRate = audioBuffer.sampleRate
      const duration = audioBuffer.duration
      
      setDuration(duration)
      
      // Generate waveform data
      const numPoints = Math.max(2000, Math.floor(duration * 50))
      const samplesPerPoint = Math.floor(channelData.length / numPoints)
      const waveform: WaveformPoint[] = []
      
      for (let i = 0; i < numPoints; i++) {
        const start = i * samplesPerPoint
        const end = Math.min(start + samplesPerPoint, channelData.length)
        
        let rms = 0
        let peak = 0
        let sampleCount = 0
        
        for (let j = start; j < end; j++) {
          const sample = Math.abs(channelData[j])
          rms += sample * sample
          peak = Math.max(peak, sample)
          sampleCount++
        }
        
        rms = Math.sqrt(rms / sampleCount)
        const amplitude = (rms * 0.7 + peak * 0.3)
        const x = (i / numPoints) * duration
        const y = Math.min(amplitude * 2, 1)
        
        waveform.push({ x, y })
      }
      
      setWaveformData(waveform)
      
      // Set up audio element
      if (audioRef.current) {
        audioRef.current.src = url
        audioRef.current.load()
      }
      
    } catch (error) {
      console.error('Error loading audio file:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  // Draw waveform
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !waveformData.length) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const rect = canvas.getBoundingClientRect()
    
    // Set canvas dimensions (don't resize on every draw)
    if (canvas.width !== rect.width * window.devicePixelRatio || canvas.height !== rect.height * window.devicePixelRatio) {
      canvas.width = rect.width * window.devicePixelRatio
      canvas.height = rect.height * window.devicePixelRatio
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
    }
    
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    
    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height)
    
    // Draw background
    ctx.fillStyle = '#141414'
    ctx.fillRect(0, 0, rect.width, rect.height)
    
    // Apply zoom transformation
    ctx.save()
    ctx.translate(0, 0)
    ctx.scale(zoom, 1)
    
    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = '#374151'
      ctx.lineWidth = 1
      ctx.setLineDash([2, 2])
      
      gridLines.forEach((time, index) => {
        const x = (time / totalDuration) * rect.width
        if (x >= 0 && x <= rect.width) {
          ctx.beginPath()
          ctx.moveTo(x, 0)
          ctx.lineTo(x, rect.height)
          ctx.stroke()
          
          // Draw step number at top
          ctx.fillStyle = '#9CA3AF'
          ctx.font = 'bold 12px monospace'
          ctx.textAlign = 'center'
          ctx.fillText(index.toString(), x, 20)
          
          // Draw bar number (every 4 steps = 1 bar)
          if (index % 4 === 0) {
            const barNumber = Math.floor(index / 4) + 1
            ctx.fillStyle = '#ffffff' // White color for bar numbers
            ctx.font = 'bold 24px monospace'
            
            // Draw bar number above step number at top
            ctx.fillText(barNumber.toString(), x, 40)
          }
          
          ctx.setLineDash([2, 2])
        }
      })
      
      ctx.setLineDash([])
    }
    
    // Draw waveform
    if (showWaveform && waveformData.length > 0) {
      ctx.fillStyle = 'rgba(74, 222, 128, 0.3)'
      ctx.beginPath()
      
      // Draw top half with vertical zoom
      waveformData.forEach((point, index) => {
        const x = (point.x / totalDuration) * rect.width
        const y = rect.height / 2 - (point.y * rect.height * 0.4 * verticalZoom)
        
        if (index === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      
      // Draw bottom half (mirrored) with vertical zoom
      for (let i = waveformData.length - 1; i >= 0; i--) {
        const point = waveformData[i]
        const x = (point.x / totalDuration) * rect.width
        const y = rect.height / 2 + (point.y * rect.height * 0.4 * verticalZoom)
        ctx.lineTo(x, y)
      }
      
      ctx.closePath()
      ctx.fill()
      
      // Draw waveform outline with vertical zoom
      ctx.strokeStyle = '#4ade80'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      
      waveformData.forEach((point, index) => {
        const x = (point.x / totalDuration) * rect.width
        const y = rect.height / 2 - (point.y * rect.height * 0.4 * verticalZoom)
        
        if (index === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      
      ctx.stroke()
    }
    
    // Draw selection
    if (selectionStart !== null && selectionEnd !== null) {
      const startX = (selectionStart / totalDuration) * rect.width
      const endX = (selectionEnd / totalDuration) * rect.width
      
      ctx.fillStyle = 'rgba(59, 130, 246, 0.3)'
      ctx.fillRect(startX, 0, endX - startX, rect.height)
      
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(startX, 0)
      ctx.lineTo(startX, rect.height)
      ctx.moveTo(endX, 0)
      ctx.lineTo(endX, rect.height)
      ctx.stroke()
    }
    
    // Draw playhead position (moves with playback when playing, or shows click position when stopped)
    const playheadTime = isPlaying ? currentTime : playheadPosition
    const playheadX = (playheadTime / totalDuration) * rect.width
    ctx.strokeStyle = isPlaying ? '#ef4444' : '#ffffff'
    ctx.lineWidth = 2
    ctx.setLineDash(isPlaying ? [5, 5] : [])
    ctx.beginPath()
    ctx.moveTo(playheadX, 0)
    ctx.lineTo(playheadX, rect.height)
    ctx.stroke()
    ctx.setLineDash([])
    
    // Draw playhead indicator
    ctx.fillStyle = isPlaying ? '#ef4444' : '#ffffff'
    ctx.font = 'bold 12px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('▶', playheadX, rect.height - 20)
    
    // Draw markers
    markers.forEach(marker => {
      const markerX = (marker.time / totalDuration) * rect.width
      ctx.strokeStyle = marker.color || '#10b981'
      ctx.lineWidth = 2
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(markerX, 0)
      ctx.lineTo(markerX, rect.height)
      ctx.stroke()
      ctx.setLineDash([])
      
      // Draw marker label
      ctx.fillStyle = marker.color || '#10b981'
      ctx.font = 'bold 10px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(marker.name, markerX, 40)
    })
    
    // Draw regions
    regions.forEach(region => {
      const startX = (region.startTime / totalDuration) * rect.width
      const endX = (region.endTime / totalDuration) * rect.width
      
      ctx.fillStyle = region.isSelected 
        ? 'rgba(59, 130, 246, 0.4)' 
        : `${region.color}40`
      ctx.fillRect(startX, 0, endX - startX, rect.height)
      
      ctx.strokeStyle = region.isSelected ? '#3b82f6' : region.color
      ctx.lineWidth = region.isSelected ? 3 : 2
      ctx.beginPath()
      ctx.moveTo(startX, 0)
      ctx.lineTo(startX, rect.height)
      ctx.moveTo(endX, 0)
      ctx.lineTo(endX, rect.height)
      ctx.stroke()
      
      // Draw region label
      ctx.fillStyle = region.color
      ctx.font = 'bold 10px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(region.name, (startX + endX) / 2, 60)
    })
    
    // Restore canvas state
    ctx.restore()
    
  }, [waveformData, duration, totalDuration, zoom, verticalZoom, showGrid, showWaveform, gridLines, 
      selectionStart, selectionEnd, playheadPosition, isPlaying, markers, regions])
  
  // Update waveform when dependencies change
  useEffect(() => {
    drawWaveform()
  }, [drawWaveform])
  
  // Force redraw when playing
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        drawWaveform()
      }, 50)
      
      return () => clearInterval(interval)
    }
  }, [isPlaying, drawWaveform])
  
  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    
    // Calculate time based on zoomed canvas width and total duration
    const time = (x / zoom) * (totalDuration / rect.width)
    
    if (activeTool === 'select') {
      // Click anywhere on waveform - set playhead position and toggle playback
      const clampedTime = Math.max(0, Math.min(time, totalDuration))
      setPlayheadPosition(clampedTime)
      
      // Toggle playback - if playing, stop; if stopped, start from new position
      if (isPlaying) {
        // Stop playback
        if (audioRef.current) {
          audioRef.current.pause()
        }
        setIsPlaying(false)
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current)
        }
      } else {
        // Start playback from new position
        if (audioRef.current) {
          audioRef.current.currentTime = clampedTime
          audioRef.current.playbackRate = playbackRate
          audioRef.current.volume = volume
          audioRef.current.play()
          setIsPlaying(true)
          
          const updatePlayhead = () => {
            if (audioRef.current && !audioRef.current.paused) {
              const time = audioRef.current.currentTime
              setCurrentTime(time)
              
              animationRef.current = requestAnimationFrame(updatePlayhead)
            }
          }
          
          updatePlayhead()
        }
      }
    } else if (activeTool === 'marker') {
      // Add marker
      const markerName = `Marker ${markers.length + 1}`
      const newMarker: Marker = {
        id: `marker-${Date.now()}`,
        time,
        name: markerName,
        category: 'General'
      }
      setMarkers(prev => [...prev, newMarker])
    } else if (activeTool === 'region') {
      // Start region selection
      setSelectionStart(time)
      setSelectionEnd(time)
      setIsSelecting(true)
      dragTypeRef.current = 'selection'
    }
    
    isDraggingRef.current = true
  }
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const time = (x / zoom) * (totalDuration / rect.width)
    
    if (dragTypeRef.current === 'selection' && selectionStart !== null) {
      setSelectionEnd(time)
    }
  }
  
  const handleMouseUp = () => {
    isDraggingRef.current = false
    dragTypeRef.current = null
    
    if (isSelecting && selectionStart !== null && selectionEnd !== null) {
      // Create region from selection
      const start = Math.min(selectionStart, selectionEnd)
      const end = Math.max(selectionStart, selectionEnd)
      
      const regionName = `Region ${regions.length + 1}`
      const newRegion: Region = {
        id: `region-${Date.now()}`,
        startTime: start,
        endTime: end,
        name: regionName,
        color: '#10b981',
        isSelected: false
      }
      
      setRegions(prev => [...prev, newRegion])
      setSelectionStart(null)
      setSelectionEnd(null)
      setIsSelecting(false)
    }
  }
  
  // Playback controls
  const togglePlayback = () => {
    if (!audioRef.current) return
    
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    } else {
      // Start playback from playhead position
      const startFromTime = Math.max(0, Math.min(playheadPosition, totalDuration))
      audioRef.current.currentTime = startFromTime
      audioRef.current.playbackRate = playbackRate
      audioRef.current.volume = volume
      audioRef.current.play()
      setIsPlaying(true)
      
      const updatePlayhead = () => {
        if (audioRef.current && !audioRef.current.paused) {
          const time = audioRef.current.currentTime
          setCurrentTime(time)
          
          animationRef.current = requestAnimationFrame(updatePlayhead)
        }
      }
      
      updatePlayhead()
    }
  }
  
  // File input handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      loadAudioFile(file)
    }
  }
  
  // Library functions
  const fetchAudioLibrary = async () => {
    if (!user?.id) return
    
    setLoadingLibrary(true)
    
    try {
      // Fetch all audio items
      const { data: audioData, error: audioError } = await supabase
        .from('audio_library_items')
        .select(`
          *,
          pack:audio_packs(id, name, color)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (audioError) {
        console.error('Error fetching audio library:', audioError)
        return
      }
      
      setAudioLibraryItems(audioData || [])
      
      // Fetch audio packs
      const { data: packsData, error: packsError } = await supabase
        .from('audio_packs')
        .select(`
          *,
          subfolders:audio_subfolders(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (packsError) {
        console.error('Error fetching audio packs:', packsError)
        return
      }
      
      // Get file counts for each pack
      const packsWithCounts = await Promise.all(
        (packsData || []).map(async (pack) => {
          const { data: files } = await supabase
            .from('audio_library_items')
            .select('id')
            .eq('user_id', user.id)
            .eq('pack_id', pack.id)
          
          const fileCount = files ? files.length : 0
          return { ...pack, item_count: fileCount }
        })
      )
      
      setAudioPacks(packsWithCounts)
    } catch (error) {
      console.error('Error fetching library:', error)
    } finally {
      setLoadingLibrary(false)
    }
  }
  
  const loadAudioFromLibrary = async (item: AudioLibraryItem) => {
    if (!item.file_url) return
    
    try {
      setIsLoading(true)
      
      // Fetch the audio file from the URL
      const response = await fetch(item.file_url)
      if (!response.ok) throw new Error('Failed to fetch audio file')
      
      const blob = await response.blob()
      const file = new File([blob], item.name, { type: 'audio/wav' })
      
      await loadAudioFile(file)
      setShowLibrary(false)
    } catch (error) {
      console.error('Error loading audio from library:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const toggleSubfolder = (subfolderId: string) => {
    setExpandedSubfolders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(subfolderId)) {
        newSet.delete(subfolderId)
      } else {
        newSet.add(subfolderId)
      }
      return newSet
    })
  }
  
  const getFilteredAudioItems = (items: AudioLibraryItem[]) => {
    if (!selectedPack) return items
    
    return items.filter(item => item.pack_id === selectedPack)
  }
  
  // Helper functions to convert between time, step, and bar
  const timeToStep = (time: number) => Math.floor(time / stepDuration)
  const stepToTime = (step: number) => step * stepDuration
  const timeToBar = (time: number) => Math.floor(time / (stepDuration * 4)) + 1 // 4 steps per bar
  const barToTime = (bar: number) => (bar - 1) * stepDuration * 4
  const stepToBar = (step: number) => Math.floor(step / 4) + 1
  const barToStep = (bar: number) => (bar - 1) * 4
  
  // Category helper functions
  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'General': 'bg-gray-500',
      'Verse': 'bg-blue-500',
      'Chorus': 'bg-green-500',
      'Bridge': 'bg-purple-500',
      'Intro': 'bg-yellow-500',
      'Outro': 'bg-red-500',
      'Hook': 'bg-pink-500',
      'Break': 'bg-orange-500'
    }
    return colors[category] || 'bg-gray-500'
  }
  
  const getAvailableCategories = () => {
    const usedCategories = [...new Set(markers.map(m => m.category))]
    const defaultCategories = ['General', 'Verse', 'Chorus', 'Bridge', 'Intro', 'Outro', 'Hook', 'Break']
    return [...new Set([...defaultCategories, ...usedCategories, ...customCategories])]
  }
  
  const getFilteredMarkers = () => {
    if (selectedCategory === 'all') return markers
    return markers.filter(marker => marker.category === selectedCategory)
  }
  
  const addCustomCategory = () => {
    if (newCategoryName.trim() && !customCategories.includes(newCategoryName.trim())) {
      setCustomCategories(prev => [...prev, newCategoryName.trim()])
      setNewCategoryName('')
      setShowCategoryInput(false)
    }
  }
  
  const removeCustomCategory = (categoryName: string) => {
    setCustomCategories(prev => prev.filter(cat => cat !== categoryName))
    // Update markers using this category to "General"
    setMarkers(prev => prev.map(marker => 
      marker.category === categoryName ? { ...marker, category: 'General' } : marker
    ))
  }
  
  // Edit functions
  const cutSelection = () => {
    if (selectionStart === null || selectionEnd === null) return
    
    const start = Math.min(selectionStart, selectionEnd)
    const end = Math.max(selectionStart, selectionEnd)
    
    // Add to history
    const historyItem: EditHistory = {
      id: `cut-${Date.now()}`,
      type: 'cut',
      data: { start, end, waveformData: waveformData.slice() },
      timestamp: Date.now()
    }
    
    setEditHistory(prev => [...prev.slice(0, historyIndex + 1), historyItem])
    setHistoryIndex(prev => prev + 1)
    
    // TODO: Implement actual cutting logic
    console.log('Cut selection:', start, end)
  }
  
  const copySelection = () => {
    if (selectionStart === null || selectionEnd === null) return
    
    const start = Math.min(selectionStart, selectionEnd)
    const end = Math.max(selectionStart, selectionEnd)
    
    setClipboard({ start, end, waveformData: waveformData.slice() })
    console.log('Copy selection:', start, end)
  }
  
  const pasteAtPlayhead = () => {
    if (!clipboard) return
    
    // TODO: Implement paste logic
    console.log('Paste at playhead:', playheadPosition)
  }
  
  const undo = () => {
    if (historyIndex >= 0) {
      setHistoryIndex(prev => prev - 1)
      // TODO: Implement undo logic
      console.log('Undo')
    }
  }
  
  const redo = () => {
    if (historyIndex < editHistory.length - 1) {
      setHistoryIndex(prev => prev + 1)
      // TODO: Implement redo logic
      console.log('Redo')
    }
  }
  
  // Marker functions
  const addMarker = () => {
    const markerName = `Marker ${markers.length + 1}`
    const newMarker = {
      id: `marker-${Date.now()}`,
      time: playheadPosition,
      name: markerName,
      category: 'General'
    }
    setMarkers(prev => [...prev, newMarker])
  }
  
  const removeMarker = (markerId: string) => {
    setMarkers(prev => prev.filter(marker => marker.id !== markerId))
  }
  
  const jumpToMarker = (markerTime: number) => {
    const clampedTime = Math.max(0, Math.min(markerTime, totalDuration))
    setPlayheadPosition(clampedTime)
    if (audioRef.current) {
      audioRef.current.currentTime = clampedTime
    }
  }
  
  const startEditingMarker = (marker: {id: string, time: number, name: string, category: string}) => {
    setEditingMarker(marker.id)
    setEditingMarkerName(marker.name)
    setEditingMarkerTime(marker.time.toFixed(3))
    setEditingMarkerStep(timeToStep(marker.time).toString())
    setEditingMarkerBar(timeToBar(marker.time).toString())
    setEditingMarkerCategory(marker.category)
  }
  
  const saveMarkerEdit = () => {
    if (!editingMarker) return
    
    let finalTime = parseFloat(editingMarkerTime)
    
    // Priority: Bar > Step > Time
    if (editingMarkerBar) {
      finalTime = barToTime(parseInt(editingMarkerBar))
    } else if (editingMarkerStep) {
      finalTime = stepToTime(parseInt(editingMarkerStep))
    }
    
    setMarkers(prev => prev.map(marker => 
      marker.id === editingMarker 
        ? {
            ...marker,
            name: editingMarkerName,
            time: finalTime,
            category: editingMarkerCategory
          }
        : marker
    ))
    
    setEditingMarker(null)
    setEditingMarkerName('')
    setEditingMarkerTime('')
    setEditingMarkerStep('')
    setEditingMarkerBar('')
    setEditingMarkerCategory('')
  }
  
  const cancelMarkerEdit = () => {
    setEditingMarker(null)
    setEditingMarkerName('')
    setEditingMarkerTime('')
    setEditingMarkerStep('')
    setEditingMarkerBar('')
    setEditingMarkerCategory('')
  }
  
  // Keyboard event handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input field
      const isTyping = e.target instanceof HTMLInputElement ||
                      e.target instanceof HTMLTextAreaElement ||
                      (e.target instanceof HTMLElement && e.target.contentEditable === 'true')
      
      if (isTyping) return
      
      // Spacebar for play/pause
      if (e.code === 'Space') {
        e.preventDefault()
        togglePlayback()
      }
      
      // Marker shortcuts
      if (e.code === 'KeyM') {
        e.preventDefault()
        addMarker()
      }
      
      // Marker navigation
      if (e.ctrlKey || e.metaKey) {
        if (e.code === 'KeyJ') {
          e.preventDefault()
          const currentMarkers = getFilteredMarkers()
          const currentIndex = currentMarkers.findIndex(m => m.time >= playheadPosition)
          const prevMarker = currentMarkers[currentIndex - 1] || currentMarkers[currentMarkers.length - 1]
          if (prevMarker) jumpToMarker(prevMarker.time)
        }
        if (e.code === 'KeyK') {
          e.preventDefault()
          const currentMarkers = getFilteredMarkers()
          const currentIndex = currentMarkers.findIndex(m => m.time > playheadPosition)
          const nextMarker = currentMarkers[currentIndex] || currentMarkers[0]
          if (nextMarker) jumpToMarker(nextMarker.time)
        }
      }
      
      // Marker editing
      if (editingMarker) {
        if (e.code === 'Enter') {
          e.preventDefault()
          saveMarkerEdit()
        }
        if (e.code === 'Escape') {
          e.preventDefault()
          cancelMarkerEdit()
        }
      }
      
      // Category input
      if (showCategoryInput) {
        if (e.code === 'Enter') {
          e.preventDefault()
          addCustomCategory()
        }
        if (e.code === 'Escape') {
          e.preventDefault()
          setShowCategoryInput(false)
          setNewCategoryName('')
        }
      }
      
      // Zoom shortcuts
      if (e.ctrlKey || e.metaKey) {
        if (e.code === 'Equal') {
          e.preventDefault()
          setZoom(Math.min(5, zoom + 0.2))
        }
        if (e.code === 'Minus') {
          e.preventDefault()
          setZoom(Math.max(0.1, zoom - 0.2))
        }
        if (e.code === 'Digit0') {
          e.preventDefault()
          setZoom(1)
          setVerticalZoom(1)
        }
        if (e.code === 'BracketLeft') {
          e.preventDefault()
          setVerticalZoom(Math.max(0.1, verticalZoom - 0.2))
        }
        if (e.code === 'BracketRight') {
          e.preventDefault()
          setVerticalZoom(Math.min(5, verticalZoom + 0.2))
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [playheadPosition, editingMarker, showCategoryInput, newCategoryName, markers, selectedCategory, zoom, verticalZoom, togglePlayback, addMarker, jumpToMarker, saveMarkerEdit, cancelMarkerEdit, addCustomCategory, setShowCategoryInput, setNewCategoryName, setZoom, setVerticalZoom])
  
  return (
    <div className="min-h-screen bg-[#141414] text-white">
      {/* Header */}
      <div className="bg-[#141414] border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Audio Science Lab</h1>
              <p className="text-sm text-gray-400">Professional Waveform Analysis & Editing Suite</p>
              {audioFile && (
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs text-gray-500">Current File:</span>
                  <span className="text-sm text-blue-400 font-mono bg-blue-900/20 px-2 py-1 rounded border border-blue-800">
                    {audioFile.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({duration.toFixed(2)}s • {Math.round((audioFile.size / 1024 / 1024) * 100) / 100}MB)
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileSelect}
                className="hidden"
                id="audio-file-input"
              />
              <label htmlFor="audio-file-input">
                <Button variant="outline" className="cursor-pointer border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white">
                  Load Audio
                </Button>
              </label>
              <Button 
                variant="outline" 
                className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                onClick={() => {
                  setShowLibrary(true)
                  fetchAudioLibrary()
                }}
              >
                Library
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowSettings(!showSettings)}
              size="sm"
              className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowLayers(!showLayers)}
              size="sm"
              className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              <Layers className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Toolbar */}
      <div className="bg-[#141414] border-b border-gray-700 p-2">
        <div className="flex items-center gap-4">
          {/* Playback Controls */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={togglePlayback}
              disabled={!audioFile}
              className="bg-black text-white font-bold hover:bg-gray-900 transition-colors border-none"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPlayheadPosition(0)}
              disabled={!audioFile}
              className="bg-gray-800 text-white font-bold hover:bg-gray-700 transition-colors border-gray-600"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Tools */}
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={activeTool === 'select' ? 'default' : 'outline'}
              onClick={() => setActiveTool('select')}
              className={activeTool === 'select' 
                ? 'bg-black text-white font-bold hover:bg-gray-900 transition-colors border-none' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500'
              }
            >
              <Target className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={activeTool === 'cut' ? 'default' : 'outline'}
              onClick={() => setActiveTool('cut')}
              className={activeTool === 'cut' 
                ? 'bg-black text-white font-bold hover:bg-gray-900 transition-colors border-none' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500'
              }
            >
              <Scissors className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={activeTool === 'fade' ? 'default' : 'outline'}
              onClick={() => setActiveTool('fade')}
              className={activeTool === 'fade' 
                ? 'bg-black text-white font-bold hover:bg-gray-900 transition-colors border-none' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500'
              }
            >
              <BarChart3 className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={activeTool === 'marker' ? 'default' : 'outline'}
              onClick={() => setActiveTool('marker')}
              className={activeTool === 'marker' 
                ? 'bg-black text-white font-bold hover:bg-gray-900 transition-colors border-none' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500'
              }
            >
              <MapPin className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={activeTool === 'region' ? 'default' : 'outline'}
              onClick={() => setActiveTool('region')}
              className={activeTool === 'region' 
                ? 'bg-black text-white font-bold hover:bg-gray-900 transition-colors border-none' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500'
              }
            >
              <Type className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Edit Operations */}
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={cutSelection}
              disabled={selectionStart === null || selectionEnd === null}
              className="bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500"
            >
              <Scissors className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={copySelection}
              disabled={selectionStart === null || selectionEnd === null}
              className="bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={pasteAtPlayhead}
              disabled={!clipboard}
              className="bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500"
            >
              <Clipboard className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={undo}
              disabled={historyIndex < 0}
              className="bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500"
            >
              <Undo className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={redo}
              disabled={historyIndex >= editHistory.length - 1}
              className="bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500"
            >
              <Redo className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Grid Controls */}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-gray-300">Grid:</Label>
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
              className="w-4 h-4 bg-gray-700 border-gray-600 text-blue-500"
            />
            <input
              type="checkbox"
              checked={snapToGrid}
              onChange={(e) => setSnapToGrid(e.target.checked)}
              className="w-4 h-4 bg-gray-700 border-gray-600 text-blue-500"
            />
          </div>
          
          {/* Zoom Controls */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-gray-300 min-w-[1rem]">H:</Label>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setZoom(Math.max(0.1, zoom - 0.2))}
                  className="bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Slider
                  value={[zoom]}
                  onValueChange={(value) => setZoom(value[0])}
                  min={0.1}
                  max={5}
                  step={0.1}
                  className="w-20"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setZoom(Math.min(5, zoom + 0.2))}
                  className="bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <span className="text-xs min-w-[3rem] text-gray-300">{Math.round(zoom * 100)}%</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Label className="text-xs text-gray-300 min-w-[1rem]">V:</Label>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setVerticalZoom(Math.max(0.1, verticalZoom - 0.2))}
                  className="bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Slider
                  value={[verticalZoom]}
                  onValueChange={(value) => setVerticalZoom(value[0])}
                  min={0.1}
                  max={5}
                  step={0.1}
                  className="w-20"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setVerticalZoom(Math.min(5, verticalZoom + 0.2))}
                  className="bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <span className="text-xs min-w-[3rem] text-gray-300">{Math.round(verticalZoom * 100)}%</span>
              </div>
            </div>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setZoom(1)
                setVerticalZoom(1)
                setPlayheadPosition(0)
                setCurrentTime(0)
                setMarkers([])
                setRegions([])
                setSelectionStart(null)
                setSelectionEnd(null)
                setIsSelecting(false)
                setEditingMarker(null)
                setSelectedCategory('all')
                setCustomCategories([])
                if (audioRef.current) {
                  audioRef.current.currentTime = 0
                }
                // Force reload waveform
                if (audioFile) {
                  loadAudioFile(audioFile)
                }
              }}
              className="bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500"
            >
              Reset All
            </Button>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex h-[calc(100vh-120px)]">
        {/* Left Side - Waveform and Transport */}
        <div className="flex-1 flex flex-col">
          {/* Waveform Canvas */}
          <div className="flex-1 relative bg-[#141414] overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin" />
                Loading audio...
              </div>
            </div>
          ) : !audioFile ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-400">
                <Music className="w-16 h-16 mx-auto mb-4" />
                <p className="text-lg">Load an audio file to start editing</p>
                <p className="text-sm">Supports MP3, WAV, and other audio formats</p>
              </div>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              className="w-full h-full cursor-crosshair"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          )}
        </div>
        
        {/* Transport Controls - Below Waveform */}
        <div className="bg-[#0f0f0f] border-t border-gray-600 p-8">
          <div className="flex items-center justify-between max-w-none">
            {/* Left Section - Transport Info */}
            <div className="flex items-center gap-12">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-gray-400 text-sm font-medium min-w-[3rem]">Time:</span>
                  <span className="text-white text-sm font-mono bg-[#1a1a1a] px-4 py-2 rounded border border-gray-600 min-w-[8rem] text-center">
                    {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-gray-400 text-sm font-medium min-w-[3rem]">BPM:</span>
                  <Input
                    type="number"
                    value={bpm}
                    onChange={(e) => setBpm(parseInt(e.target.value) || 120)}
                    className="w-28 h-10 text-sm bg-[#1a1a1a] border-gray-600 text-white font-mono text-center"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-gray-400 text-sm font-medium min-w-[3rem]">Grid:</span>
                  <select
                    value={gridDivision}
                    onChange={(e) => setGridDivision(parseInt(e.target.value))}
                    className="w-28 h-10 text-sm bg-[#1a1a1a] border border-gray-600 rounded text-white font-mono text-center"
                  >
                    <option value={4}>1/4</option>
                    <option value={8}>1/8</option>
                    <option value={16}>1/16</option>
                    <option value={32}>1/32</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Center Section - Playback Controls */}
            <div className="flex items-center gap-12">
              <div className="flex items-center gap-6">
                <Label className="text-gray-400 text-sm font-medium min-w-[3rem]">Rate:</Label>
                <Slider
                  value={[playbackRate]}
                  onValueChange={(value) => setPlaybackRate(value[0])}
                  min={0.1}
                  max={4}
                  step={0.1}
                  className="w-48"
                />
                <span className="text-white text-sm font-mono min-w-[4rem] bg-[#1a1a1a] px-3 py-2 rounded border border-gray-600 text-center">
                  {playbackRate}x
                </span>
              </div>
              <div className="flex items-center gap-6">
                <Label className="text-gray-400 text-sm font-medium min-w-[4rem]">Volume:</Label>
                <Slider
                  value={[volume]}
                  onValueChange={(value) => setVolume(value[0])}
                  min={0}
                  max={1}
                  step={0.01}
                  className="w-48"
                />
                <span className="text-white text-sm font-mono min-w-[4rem] bg-[#1a1a1a] px-3 py-2 rounded border border-gray-600 text-center">
                  {Math.round(volume * 100)}%
                </span>
              </div>
            </div>
            
            {/* Right Section - Status Information */}
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-4">
                <span className="text-gray-400 text-sm font-medium min-w-[3rem]">Status:</span>
                <span className={`text-sm font-mono px-4 py-2 rounded border min-w-[5rem] text-center ${
                  isPlaying 
                    ? 'text-green-400 border-green-400 bg-green-900/20' 
                    : 'text-gray-400 border-gray-600 bg-[#1a1a1a]'
                }`}>
                  {isPlaying ? 'LIVE' : 'STOPPED'}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-gray-400 text-sm font-medium min-w-[4rem]">Markers:</span>
                <span className="text-blue-400 text-sm font-mono bg-[#1a1a1a] px-4 py-2 rounded border border-blue-600 min-w-[3rem] text-center">
                  {markers.length}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-gray-400 text-sm font-medium min-w-[4rem]">Regions:</span>
                <span className="text-purple-400 text-sm font-mono bg-[#1a1a1a] px-4 py-2 rounded border border-purple-600 min-w-[3rem] text-center">
                  {regions.length}
                </span>
              </div>
              <div className="ml-6">
                <Badge variant="outline" className="text-blue-500 border-blue-500 bg-blue-900/20 px-4 py-2 text-sm font-medium">
                  Audio Science Lab
                </Badge>
              </div>
            </div>
          </div>
        </div>
        
        {/* Sidebar */}
        <div className="w-80 bg-[#141414] border-l border-gray-700 overflow-y-auto">
          {/* Markers */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-white">Temporal Markers</h3>
              <div className="flex items-center gap-1">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="text-xs bg-gray-700 border border-gray-600 rounded text-white px-1"
                >
                  <option value="all">All</option>
                  {getAvailableCategories().map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCategoryInput(!showCategoryInput)}
                  className="w-6 h-6 p-0 bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500"
                >
                  +
                </Button>
              </div>
            </div>
            
            {showCategoryInput && (
              <div className="mb-2 p-2 bg-gray-800 rounded border border-gray-600">
                <div className="flex items-center gap-1">
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Category name"
                    className="h-6 text-xs bg-gray-700 border-gray-600 text-white"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addCustomCategory()
                      if (e.key === 'Escape') {
                        setShowCategoryInput(false)
                        setNewCategoryName('')
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={addCustomCategory}
                    className="h-6 px-2 text-xs bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500"
                  >
                    Add
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowCategoryInput(false)
                      setNewCategoryName('')
                    }}
                    className="h-6 px-2 text-xs bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            
            <div className="space-y-2 max-h-48 overflow-y-auto overflow-x-hidden">
              {getFilteredMarkers().map((marker) => (
                <div key={marker.id} className="flex items-center justify-between p-2 bg-gray-800 rounded border border-gray-600 min-w-0">
                  <div className="flex items-center gap-3 flex-1">
                    <MapPin className="w-4 h-4 text-green-400" />
                    
                    {editingMarker === marker.id ? (
                      // Editing mode
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center gap-2 flex-1">
                          <Label className="text-xs text-gray-400 whitespace-nowrap">Name:</Label>
                          <Input
                            value={editingMarkerName}
                            onChange={(e) => setEditingMarkerName(e.target.value)}
                            className="h-6 text-xs flex-1"
                            placeholder="Marker name"
                            autoFocus
                          />
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Label className="text-xs text-gray-400 whitespace-nowrap">Time:</Label>
                            <Input
                              value={editingMarkerTime}
                              onChange={(e) => setEditingMarkerTime(e.target.value)}
                              className="h-6 text-xs w-16"
                              placeholder="Time"
                              type="number"
                              step="0.01"
                              min="0"
                              max={totalDuration}
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <Label className="text-xs text-gray-400 whitespace-nowrap">Step:</Label>
                            <Input
                              value={editingMarkerStep}
                              onChange={(e) => setEditingMarkerStep(e.target.value)}
                              className="h-6 text-xs w-14"
                              placeholder="Step"
                              type="number"
                              min="0"
                              max={Math.ceil(totalDuration / stepDuration) - 1}
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <Label className="text-xs text-gray-400 whitespace-nowrap">Bar:</Label>
                            <Input
                              value={editingMarkerBar}
                              onChange={(e) => setEditingMarkerBar(e.target.value)}
                              className="h-6 text-xs w-12"
                              placeholder="Bar"
                              type="number"
                              min="1"
                              max={Math.ceil(totalDuration / (stepDuration * 4))}
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <Label className="text-xs text-gray-400 whitespace-nowrap">Category:</Label>
                            <select
                              value={editingMarkerCategory}
                              onChange={(e) => setEditingMarkerCategory(e.target.value)}
                              className="h-6 text-xs w-20 bg-gray-700 border border-gray-600 rounded px-1 text-white"
                            >
                              {getAvailableCategories().map(category => (
                                <option key={category} value={category}>{category}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Display mode
                      <>
                        <span 
                          className="text-sm text-white cursor-pointer hover:text-blue-300"
                          onClick={() => startEditingMarker(marker)}
                          title="Click to edit name"
                        >
                          {marker.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span 
                            className="text-xs text-gray-400 font-mono cursor-pointer hover:text-blue-300"
                            onClick={() => startEditingMarker(marker)}
                            title="Click to edit time"
                          >
                            {marker.time.toFixed(2)}s
                          </span>
                          <span className="text-xs text-gray-500">|</span>
                          <span 
                            className="text-xs text-gray-400 font-mono cursor-pointer hover:text-blue-300"
                            onClick={() => startEditingMarker(marker)}
                            title="Click to edit step"
                          >
                            Step {timeToStep(marker.time)}
                          </span>
                          <span className="text-xs text-gray-500">|</span>
                          <span 
                            className="text-xs text-gray-400 font-mono cursor-pointer hover:text-blue-300"
                            onClick={() => startEditingMarker(marker)}
                            title="Click to edit bar"
                          >
                            Bar {timeToBar(marker.time)}
                          </span>
                          <span className="text-xs text-gray-500">|</span>
                          <span 
                            className={`text-xs px-2 py-1 rounded cursor-pointer hover:opacity-80 ${getCategoryColor(marker.category)}`}
                            onClick={() => startEditingMarker(marker)}
                            title="Click to edit category"
                          >
                            {marker.category}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {editingMarker === marker.id ? (
                      // Editing buttons
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={saveMarkerEdit}
                          className="h-6 px-2 text-xs bg-green-600 hover:bg-green-700"
                        >
                          ✓
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelMarkerEdit}
                          className="h-6 px-2 text-xs bg-red-600 hover:bg-red-700"
                        >
                          ✗
                        </Button>
                      </>
                    ) : (
                      // Normal buttons
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => jumpToMarker(marker.time)}
                          className="h-6 px-2 text-xs"
                        >
                          Jump
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeMarker(marker.id)}
                          className="h-6 px-2 text-xs text-red-400 hover:text-red-300"
                        >
                          ×
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <Button
              size="sm"
              variant="outline"
              onClick={addMarker}
              className="w-full mt-2 bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500"
            >
              Add Marker (M)
            </Button>
            
            <div className="text-xs text-gray-400 mt-2 text-center">
              Ctrl+J: Previous | Ctrl+K: Next | M: Add | Enter: Save | Esc: Cancel
            </div>
          </div>
          
          {/* Regions */}
          <div className="p-4">
            <h3 className="text-sm font-medium mb-2 text-white">Regions</h3>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {regions.map(region => (
                <div key={region.id} className="flex items-center justify-between p-1 bg-gray-800/50 border-gray-600 text-gray-300 rounded text-xs">
                  <span className="text-white">{region.name}</span>
                  <span className="text-gray-400">{(region.endTime - region.startTime).toFixed(2)}s</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        </div>
      </div>
      
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime)
          }
        }}
        onEnded={() => setIsPlaying(false)}
        style={{ display: 'none' }}
      />
      
      {/* Library Modal */}
      <Dialog open={showLibrary} onOpenChange={setShowLibrary}>
        <DialogContent className="bg-[#141414] border-gray-700 max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-white">Audio Library</DialogTitle>
          </DialogHeader>
          
          <div className="flex h-[60vh]">
            {/* Packs Sidebar */}
            <div className="w-64 border-r border-gray-700 overflow-y-auto">
              <div className="p-4">
                <h3 className="text-sm font-medium text-white mb-3">Packs</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedPack(null)}
                    className={`w-full text-left p-2 rounded text-sm transition-colors ${
                      selectedPack === null 
                        ? 'bg-black text-white' 
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    All Files ({audioLibraryItems.length})
                  </button>
                  
                  {audioPacks.map(pack => (
                    <div key={pack.id}>
                      <button
                        onClick={() => setSelectedPack(pack.id)}
                        className={`w-full text-left p-2 rounded text-sm transition-colors ${
                          selectedPack === pack.id 
                            ? 'bg-black text-white' 
                            : 'text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{pack.name}</span>
                          <Badge variant="outline" className="text-xs border-gray-600 text-gray-400">
                            {pack.item_count || 0}
                          </Badge>
                        </div>
                      </button>
                      
                      {/* Subfolders */}
                      {pack.subfolders && pack.subfolders.length > 0 && (
                        <div className="ml-4 mt-1 space-y-1">
                          {pack.subfolders.map(subfolder => (
                            <button
                              key={subfolder.id}
                              onClick={() => setSelectedPack(`${pack.id}-${subfolder.name}`)}
                              className={`w-full text-left p-1 rounded text-xs transition-colors ${
                                selectedPack === `${pack.id}-${subfolder.name}` 
                                  ? 'bg-gray-800 text-white' 
                                  : 'text-gray-400 hover:bg-gray-700'
                              }`}
                            >
                              📁 {subfolder.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Files List */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                {loadingLibrary ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Loading library...
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {getFilteredAudioItems(audioLibraryItems).map(item => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-gray-800/50 border border-gray-600 rounded hover:bg-gray-700 transition-colors cursor-pointer"
                        onClick={() => loadAudioFromLibrary(item)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Music className="w-4 h-4 text-gray-400" />
                            <span className="text-white font-medium">{item.name}</span>
                            {item.pack && (
                              <Badge 
                                variant="outline" 
                                className="text-xs border-gray-600 text-gray-400"
                                style={{ borderColor: item.pack.color, color: item.pack.color }}
                              >
                                {item.pack.name}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {item.bpm && <span>BPM: {item.bpm} </span>}
                            {item.key && <span>Key: {item.key} </span>}
                            {item.duration && <span>Duration: {item.duration.toFixed(1)}s</span>}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500"
                          onClick={(e) => {
                            e.stopPropagation()
                            loadAudioFromLibrary(item)
                          }}
                        >
                          Load
                        </Button>
                      </div>
                    ))}
                    
                    {getFilteredAudioItems(audioLibraryItems).length === 0 && (
                      <div className="text-center text-gray-400 py-8">
                        <Music className="w-12 h-12 mx-auto mb-2" />
                        <p>No audio files found</p>
                        <p className="text-sm">Upload files to your library first</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 