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
import { useToast } from '@/hooks/use-toast'
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
  Square,
  Move,
  Maximize2
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
  positions?: number[] // Multiple positions within one marker
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
  const [waveformOffset, setWaveformOffset] = useState(0) // Horizontal offset for waveform dragging
  const [scrollOffset, setScrollOffset] = useState(0)
  const [viewWidth, setViewWidth] = useState(0)
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [showGrid, setShowGrid] = useState(true) // Always show grid
  const [showWaveform, setShowWaveform] = useState(true)
  const [markedBars, setMarkedBars] = useState<number[]>([])
  const [markedSubBars, setMarkedSubBars] = useState<number[]>([])
  
  // Duplicate wave state
  const [duplicateWave, setDuplicateWave] = useState<{
    audioFile: File | null
    waveformData: WaveformPoint[]
    audioRef: HTMLAudioElement | null
    isReversed: boolean
    offset: number
  } | null>(null)
  
  // Track which wave is currently the main one
  const [isDuplicateMain, setIsDuplicateMain] = useState(false)
  
  // Track if we're in "play both" mode
  const [playBothMode, setPlayBothMode] = useState(false)
  
  // Track if detailed grid is enabled
  const [showDetailedGrid, setShowDetailedGrid] = useState(false)
  
  // Grid state
  const [bpm, setBpm] = useState(120)
  const [gridDivision, setGridDivision] = useState(4) // quarter notes (1/4)
  const [gridLines, setGridLines] = useState<number[]>([])
  
  // Selection state
  const [selectionStart, setSelectionStart] = useState<number | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null)
  const [isSelecting, setIsSelecting] = useState(false)
  
  // Markers and regions
  const [markers, setMarkers] = useState<Marker[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [selectedMarkers, setSelectedMarkers] = useState<Set<string>>(new Set())
  const [selectedRegions, setSelectedRegions] = useState<string[]>([])
  
  // Marker editing state
  const [editingMarker, setEditingMarker] = useState<string | null>(null)
  const [editingMarkerName, setEditingMarkerName] = useState('')
  const [editingMarkerTime, setEditingMarkerTime] = useState('')
  const [editingMarkerStep, setEditingMarkerStep] = useState('')
  const [editingMarkerBar, setEditingMarkerBar] = useState('')
  const [editingMarkerCategory, setEditingMarkerCategory] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedBarCount, setSelectedBarCount] = useState(4) // Track selected bar count
  const [displayDuration, setDisplayDuration] = useState(0) // Track display duration for bar expansion
  const [isHalfTime, setIsHalfTime] = useState(false) // Track halftime mode
  const [halfTimeRatio, setHalfTimeRatio] = useState(0.5) // Track halftime ratio (0.5 = half speed)
  const [customCategories, setCustomCategories] = useState<string[]>([])
  const [showCategoryInput, setShowCategoryInput] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  
  // Edit mode state - ONLY this
  const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null)
  
  // Waveform selection state
  const [waveSelectionStart, setWaveSelectionStart] = useState<number | null>(null)
  const [waveSelectionEnd, setWaveSelectionEnd] = useState<number | null>(null)
  const [isWaveSelecting, setIsWaveSelecting] = useState(false)
  const [clipboardSegment, setClipboardSegment] = useState<{ start: number; end: number; audioData: Float32Array } | null>(null)
  

  
  // Editing state
  const [editingRegion, setEditingRegion] = useState<string | null>(null)
  const [clipboard, setClipboard] = useState<any>(null)
  const [editHistory, setEditHistory] = useState<EditHistory[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  
  // UI state
  const [showSettings, setShowSettings] = useState(false)
  const [showLayers, setShowLayers] = useState(false)
  const [activeTool, setActiveTool] = useState<'select' | 'cut' | 'fade' | 'marker' | 'region' | 'drag'>('select')
  
  // Library state
  const [showLibrary, setShowLibrary] = useState(false)
  const [audioLibraryItems, setAudioLibraryItems] = useState<AudioLibraryItem[]>([])
  const [audioPacks, setAudioPacks] = useState<AudioPack[]>([])
  const [loadingLibrary, setLoadingLibrary] = useState(false)
  const [selectedPack, setSelectedPack] = useState<string | null>(null)
  const [expandedSubfolders, setExpandedSubfolders] = useState<Set<string>>(new Set())
  const [projectData, setProjectData] = useState<any>(null)
  const { user } = useAuth()
  const { toast } = useToast()
  
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const animationRef = useRef<number | undefined>(undefined)
  const isDraggingRef = useRef<boolean>(false)
  const dragTypeRef = useRef<'playhead' | 'selection' | 'region' | 'marker' | 'waveform' | 'playhead-drag' | null>(null)
  const lastMouseXRef = useRef<number>(0)
  
  // Calculate grid
  const secondsPerBeat = 60 / bpm
  const stepDuration = secondsPerBeat / (gridDivision / 4)
  const totalDuration = duration
  const effectiveDuration = displayDuration > 0 ? displayDuration : totalDuration // Use display duration if set
  
  // Update grid lines when BPM or division changes
  useEffect(() => {
    console.log('🔍 UPDATING GRID LINES - BPM:', bpm, 'gridDivision:', gridDivision, 'effectiveDuration:', effectiveDuration, 'stepDuration:', stepDuration)
    // Calculate total number of steps based on duration
    const totalSteps = Math.ceil(effectiveDuration / stepDuration)
    const mainLines = Array.from({ length: totalSteps + 1 }, (_, i) => i * stepDuration)
    
    if (showDetailedGrid) {
      // Add detailed grid lines (finer subdivisions)
      const detailedDivision = Math.min(gridDivision * 2, 32) // 1/8, 1/16, 1/32, etc.
      const detailedStepDuration = 60 / bpm / detailedDivision
      const detailedTotalSteps = Math.ceil(effectiveDuration / detailedStepDuration)
      const detailedLines = Array.from({ length: detailedTotalSteps + 1 }, (_, i) => i * detailedStepDuration)
      
      // Combine main grid lines with detailed grid lines, avoiding duplicates
      const allLines = [...new Set([...mainLines, ...detailedLines])].sort((a, b) => a - b)
      console.log('🔍 DETAILED GRID LINES CREATED:', allLines.length, 'lines (main:', mainLines.length, 'detailed:', detailedLines.length, ')')
      setGridLines(allLines)
    } else {
      console.log('🔍 GRID LINES CREATED:', mainLines.length, 'lines for', totalSteps, 'steps')
      setGridLines(mainLines)
    }
  }, [bpm, gridDivision, effectiveDuration, stepDuration, showDetailedGrid])


  
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
      setDisplayDuration(duration) // Initialize display duration to match audio duration
      
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
      
      // Try to load saved project data for this audio file
      setTimeout(() => {
        loadProject()
      }, 100) // Small delay to ensure state is set
      
    } catch (error) {
      console.error('Error loading audio file:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  // Auto-update bar tracker when playhead position changes
  useEffect(() => {
    updateBarTracker()
  }, [playheadPosition])

  // Auto-show bars when audio file is loaded
  useEffect(() => {
    if (audioFile && totalDuration > 0 && markedBars.length === 0) {
      // Use the EXACT same math as sequencer grid
      // stepDuration = secondsPerBeat / (gridDivision / 4)
      // loopBars = Math.round((displayLoopDuration / stepDuration) / 4)
      const secondsPerBeat = 60 / bpm
      const gridDivision = 16 // 1/16 resolution like sequencer
      const stepDuration = secondsPerBeat / (gridDivision / 4)
      const loopBars = Math.round((totalDuration / stepDuration) / 4)
      
      const allBars = Array.from({ length: loopBars }, (_, i) => i + 1)
      setMarkedBars(allBars)
      console.log(`Auto-showing ${loopBars} bars for ${totalDuration.toFixed(2)}s loop at ${bpm} BPM`)
      
      // Auto-fit the waveform to view when audio is loaded
      setZoom(1.0) // Reset zoom to show full waveform
      setWaveformOffset(0) // Reset offset
    }
  }, [audioFile, totalDuration, bpm, markedBars.length])
  
  // Draw waveform
  const drawWaveform = useCallback(() => {
    console.log('🔍 DRAW WAVEFORM CALLED - zoom:', zoom, 'verticalZoom:', verticalZoom)
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
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Scale for device pixel ratio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    
    // Draw background
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, rect.width, rect.height)
    
    // Calculate effective width for zoomed coordinates (inverted zoom logic)
    const effectiveWidth = rect.width * zoom
    
    // Use effective duration for display calculations
    const displayDuration = effectiveDuration
    
    // Draw grid
    if (showGrid) {
      console.log('🔍 DRAWING GRID - zoom:', zoom, 'effectiveWidth:', effectiveWidth, 'rect.width:', rect.width, 'gridLines:', gridLines.length)
      ctx.strokeStyle = '#333'
      ctx.lineWidth = 1
      ctx.setLineDash([2, 2])
      
      gridLines.forEach((time, index) => {
        const x = (time / displayDuration) * effectiveWidth
        if (x >= 0 && x <= effectiveWidth) {
          // Draw grid line
          ctx.beginPath()
          ctx.moveTo(x, 0)
          ctx.lineTo(x, rect.height)
          ctx.stroke()
          
          // Draw step number (every step)
          ctx.setLineDash([])
          ctx.fillStyle = '#ffffff' // White color for all step numbers
          ctx.font = 'bold 16px monospace'
          ctx.textAlign = 'center'
          
          // Draw step number at top
          ctx.fillText(index.toString(), x, 25)
          
          // Draw bar number (every 16 steps, starting from step 0)
          if (index % 16 === 0) {
            const barNumber = Math.floor(index / 16) + 1
            ctx.fillStyle = '#4ade80' // Green color for bar numbers
            ctx.font = 'bold 18px monospace'
            ctx.fillText(`Bar ${barNumber}`, x, 50)
          }
          
          // Draw time label at bottom
          ctx.fillStyle = '#888888' // Gray color for time labels
          ctx.font = '12px monospace'
          ctx.fillText(time.toFixed(2) + 's', x, rect.height - 10)
          
          ctx.setLineDash([2, 2])
        }
      })
      
      ctx.setLineDash([])
    }
    
    // Draw bar marker lines (green vertical lines for marked bars)
    if (markedBars.length > 0) {
      ctx.strokeStyle = '#22c55e' // Green color for bar markers
      ctx.lineWidth = 3 // Make bar lines thicker
      ctx.setLineDash([])
      
      markedBars.forEach(barNumber => {
        const barTime = barToTime(barNumber)
        const barX = (barTime / displayDuration) * effectiveWidth
        
        if (barX >= 0 && barX <= effectiveWidth) {
          ctx.beginPath()
          ctx.moveTo(barX, 0)
          ctx.lineTo(barX, rect.height)
          ctx.stroke()
          
          // Add bar number label at the top
          ctx.fillStyle = '#22c55e' // Green color for bar numbers
          ctx.font = 'bold 14px monospace'
          ctx.textAlign = 'center'
          ctx.fillText(`Bar ${barNumber}`, barX, 20)
        }
      })
    }
    
    // Draw sub-bar marker lines (lighter green vertical lines for marked beats)
    if (markedSubBars.length > 0) {
      ctx.strokeStyle = '#4ade80' // Lighter green color for sub-bar markers
      ctx.lineWidth = 1
      ctx.setLineDash([2, 2]) // Dashed lines for sub-bars
      
      markedSubBars.forEach(beatNumber => {
        const beatTime = beatToTime(beatNumber)
        const beatX = (beatTime / displayDuration) * effectiveWidth
        
        if (beatX >= 0 && beatX <= effectiveWidth) {
          ctx.beginPath()
          ctx.moveTo(beatX, 0)
          ctx.lineTo(beatX, rect.height)
          ctx.stroke()
        }
      })
      
      ctx.setLineDash([]) // Reset line dash
    }
    
    // Draw waveforms based on which is the main one
    if (duplicateWave && duplicateWave.waveformData.length > 0) {
      // We have both waves - draw them in swapped positions based on which is main
      const topHeight = rect.height * 0.6 // 60% of canvas height for top wave
      const bottomHeight = rect.height * 0.3 // 30% of canvas height for bottom wave
      const bottomY = rect.height * 0.7 // Start at 70% of canvas height
      
      if (isDuplicateMain) {
        // Duplicate is main - draw it on top (green area)
        const mainWaveData = duplicateWave.waveformData
        const mainWaveColor = duplicateWave.isReversed ? '#ef4444' : '#4ade80' // Red if reversed, green if normal
        const mainWaveFill = duplicateWave.isReversed ? 'rgba(239, 68, 68, 0.3)' : 'rgba(74, 222, 128, 0.3)'
        
        // Draw main wave (duplicate) on top
        ctx.fillStyle = mainWaveFill
        ctx.beginPath()
        
        // Draw top half of main wave
        mainWaveData.forEach((point, index) => {
          const x = (point.x / displayDuration) * effectiveWidth + waveformOffset
          const y = rect.height / 2 - (point.y * rect.height * 0.4 * verticalZoom)
          
          if (index === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        })
        
        // Draw bottom half of main wave (mirrored)
        for (let i = mainWaveData.length - 1; i >= 0; i--) {
          const point = mainWaveData[i]
          const x = (point.x / displayDuration) * effectiveWidth + waveformOffset
          const y = rect.height / 2 + (point.y * rect.height * 0.4 * verticalZoom)
          ctx.lineTo(x, y)
        }
        
        ctx.closePath()
        ctx.fill()
        
        // Draw main wave outline
        ctx.strokeStyle = mainWaveColor
        ctx.lineWidth = 1.5
        ctx.beginPath()
        
        mainWaveData.forEach((point, index) => {
          const x = (point.x / displayDuration) * effectiveWidth + waveformOffset
          const y = rect.height / 2 - (point.y * rect.height * 0.4 * verticalZoom)
          
          if (index === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        })
        
        ctx.stroke()
        
        // Draw secondary wave (original) on bottom
        ctx.fillStyle = 'rgba(59, 130, 246, 0.3)' // Blue for original
        ctx.beginPath()
        
        // Draw top half of secondary wave
        waveformData.forEach((point, index) => {
          const x = (point.x / displayDuration) * effectiveWidth + waveformOffset
          const y = bottomY - (point.y * bottomHeight * 0.4 * verticalZoom)
          
          if (index === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        })
        
        // Draw bottom half of secondary wave (mirrored)
        for (let i = waveformData.length - 1; i >= 0; i--) {
          const point = waveformData[i]
          const x = (point.x / displayDuration) * effectiveWidth + waveformOffset
          const y = bottomY + (point.y * bottomHeight * 0.4 * verticalZoom)
          ctx.lineTo(x, y)
        }
        
        ctx.closePath()
        ctx.fill()
        
        // Draw secondary wave outline
        ctx.strokeStyle = '#3b82f6'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        
        waveformData.forEach((point, index) => {
          const x = (point.x / displayDuration) * effectiveWidth + waveformOffset
          const y = bottomY - (point.y * bottomHeight * 0.4 * verticalZoom)
          
          if (index === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        })
        
        ctx.stroke()
        
      } else {
        // Original is main - draw it on top (green area)
        // Draw main wave (original) on top
        ctx.fillStyle = 'rgba(74, 222, 128, 0.3)'
        ctx.beginPath()
        
        // Draw top half with vertical zoom and offset
        console.log('🔍 DRAWING WAVEFORM - offset:', waveformOffset, 'effectiveWidth:', effectiveWidth, 'points:', waveformData.length)
        waveformData.forEach((point, index) => {
          const x = (point.x / displayDuration) * effectiveWidth + waveformOffset
          const y = rect.height / 2 - (point.y * rect.height * 0.4 * verticalZoom)
          
          if (index === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        })
        
        // Draw bottom half (mirrored) with vertical zoom and offset
        for (let i = waveformData.length - 1; i >= 0; i--) {
          const point = waveformData[i]
          const x = (point.x / displayDuration) * effectiveWidth + waveformOffset
          const y = rect.height / 2 + (point.y * rect.height * 0.4 * verticalZoom)
          ctx.lineTo(x, y)
        }
        
        ctx.closePath()
        ctx.fill()
        
        // Draw main wave outline with vertical zoom
        ctx.strokeStyle = '#4ade80'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        
        waveformData.forEach((point, index) => {
          const x = (point.x / displayDuration) * effectiveWidth + waveformOffset
          const y = rect.height / 2 - (point.y * rect.height * 0.4 * verticalZoom)
          
          if (index === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        })
        
        ctx.stroke()
        
        // Draw secondary wave (duplicate) on bottom
        const secondaryWaveData = duplicateWave.waveformData
        const secondaryWaveColor = duplicateWave.isReversed ? '#ef4444' : '#3b82f6' // Red if reversed, blue if normal
        const secondaryWaveFill = duplicateWave.isReversed ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)'
        
        ctx.fillStyle = secondaryWaveFill
        ctx.beginPath()
        
        // Draw top half of secondary wave
        secondaryWaveData.forEach((point, index) => {
          const x = (point.x / displayDuration) * effectiveWidth + waveformOffset
          const y = bottomY - (point.y * bottomHeight * 0.4 * verticalZoom)
          
          if (index === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        })
        
        // Draw bottom half of secondary wave (mirrored)
        for (let i = secondaryWaveData.length - 1; i >= 0; i--) {
          const point = secondaryWaveData[i]
          const x = (point.x / displayDuration) * effectiveWidth + waveformOffset
          const y = bottomY + (point.y * bottomHeight * 0.4 * verticalZoom)
          ctx.lineTo(x, y)
        }
        
        ctx.closePath()
        ctx.fill()
        
        // Draw secondary wave outline
        ctx.strokeStyle = secondaryWaveColor
        ctx.lineWidth = 1.5
        ctx.beginPath()
        
        secondaryWaveData.forEach((point, index) => {
          const x = (point.x / displayDuration) * effectiveWidth + waveformOffset
          const y = bottomY - (point.y * bottomHeight * 0.4 * verticalZoom)
          
          if (index === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        })
        
        ctx.stroke()
      }
    } else {
      // Only original wave exists - draw it normally
    if (showWaveform && waveformData.length > 0) {
      ctx.fillStyle = 'rgba(74, 222, 128, 0.3)'
      ctx.beginPath()
      
        // Draw top half with vertical zoom and offset
        console.log('🔍 DRAWING WAVEFORM - offset:', waveformOffset, 'effectiveWidth:', effectiveWidth, 'points:', waveformData.length)
      waveformData.forEach((point, index) => {
          const x = (point.x / displayDuration) * effectiveWidth + waveformOffset
        const y = rect.height / 2 - (point.y * rect.height * 0.4 * verticalZoom)
        
        if (index === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      
        // Draw bottom half (mirrored) with vertical zoom and offset
      for (let i = waveformData.length - 1; i >= 0; i--) {
        const point = waveformData[i]
          const x = (point.x / displayDuration) * effectiveWidth + waveformOffset
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
          const x = (point.x / displayDuration) * effectiveWidth + waveformOffset
        const y = rect.height / 2 - (point.y * rect.height * 0.4 * verticalZoom)
        
        if (index === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      
      ctx.stroke()
      }
    }
    
    // Draw selection
    if (selectionStart !== null && selectionEnd !== null) {
      const startX = (selectionStart / displayDuration) * effectiveWidth
      const endX = (selectionEnd / displayDuration) * effectiveWidth
      
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
          const playheadX = displayDuration > 0 ? (playheadTime / displayDuration) * effectiveWidth : 0
      console.log('🔍 DRAWING PLAYHEAD - playheadTime:', playheadTime, 'playheadX:', playheadX, 'isPlaying:', isPlaying, 'displayDuration:', displayDuration, 'effectiveWidth:', effectiveWidth)
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
      const markerX = (marker.time / totalDuration) * effectiveWidth
      
      // Draw main vertical line (dashed)
      ctx.strokeStyle = marker.color || '#10b981'
      ctx.lineWidth = 2
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(markerX, 0)
      ctx.lineTo(markerX, rect.height)
      ctx.stroke()
      ctx.setLineDash([])
      
      // Draw small solid vertical line at exact position (more visible)
      ctx.strokeStyle = marker.color || '#10b981'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(markerX, 60)
      ctx.lineTo(markerX, 120)
      ctx.stroke()
      
      // Draw small triangle indicator at the top
      ctx.fillStyle = marker.color || '#10b981'
      ctx.beginPath()
      ctx.moveTo(markerX - 4, 60)
      ctx.lineTo(markerX + 4, 60)
      ctx.lineTo(markerX, 52)
      ctx.closePath()
      ctx.fill()
      
      // Draw marker label
      ctx.fillStyle = marker.color || '#10b981'
      ctx.font = 'bold 12px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(marker.name, markerX, 140)
      
      // Draw time position below label
      ctx.fillStyle = '#888888'
      ctx.font = '10px monospace'
      ctx.fillText(`${marker.time.toFixed(2)}s`, markerX, 155)
    })
    
    // Draw regions
    regions.forEach(region => {
      const startX = (region.startTime / totalDuration) * effectiveWidth
      const endX = (region.endTime / totalDuration) * effectiveWidth
      
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
    
    // Draw waveform selection highlight
    if (waveSelectionStart !== null && waveSelectionEnd !== null) {
      const start = Math.min(waveSelectionStart, waveSelectionEnd)
      const end = Math.max(waveSelectionStart, waveSelectionEnd)
      
      const startX = (start / totalDuration) * effectiveWidth + waveformOffset
      const endX = (end / totalDuration) * effectiveWidth + waveformOffset
      
      // Draw selection rectangle
      ctx.fillStyle = 'rgba(255, 255, 0, 0.3)' // Semi-transparent yellow
      ctx.fillRect(startX, 0, endX - startX, rect.height)
      
      // Draw selection border
      ctx.strokeStyle = '#ffff00' // Yellow border
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.strokeRect(startX, 0, endX - startX, rect.height)
      ctx.setLineDash([])
    }
    
    // No need to restore since we're not using ctx.save()
    
  }, [waveformData, duration, totalDuration, showGrid, showWaveform, gridLines, 
      selectionStart, selectionEnd, waveSelectionStart, waveSelectionEnd, playheadPosition, currentTime, isPlaying, markers, regions, zoom, verticalZoom, waveformOffset])
  
  // Remove this effect that was causing constant redraws
  
  // Redraw when audio loads or when markers/regions/grid changes
  useEffect(() => {
    console.log('🔍 REDRAW EFFECT TRIGGERED - waveformData:', waveformData.length, 'markers:', markers.length, 'regions:', regions.length, 'gridLines:', gridLines.length, 'markedBars:', markedBars.length, 'markedSubBars:', markedSubBars.length, 'duplicateWave:', !!duplicateWave)
    if (waveformData.length > 0) {
    drawWaveform()
    }
  }, [waveformData, markers, regions, gridLines, markedBars, markedSubBars, duplicateWave])
  
  // Force redraw during playback to update playhead position
  useEffect(() => {
    if (isPlaying && waveformData.length > 0) {
      const interval = setInterval(() => {
        console.log('🔍 FORCE REDRAW - currentTime:', currentTime)
        drawWaveform()
      }, 16) // ~60fps for smooth playhead movement
      
      return () => clearInterval(interval)
    }
  }, [isPlaying, waveformData.length, currentTime, drawWaveform])

  // Redraw when currentTime changes during playback
  useEffect(() => {
    if (isPlaying && waveformData.length > 0) {
      console.log('🔍 CURRENT TIME CHANGED - redrawing playhead at:', currentTime)
      drawWaveform()
    }
  }, [currentTime, isPlaying, waveformData.length, drawWaveform])

  // Redraw when waveform offset changes
  useEffect(() => {
    if (waveformData.length > 0) {
      console.log('🔍 WAVEFORM OFFSET CHANGED - redrawing with offset:', waveformOffset)
      drawWaveform()
    }
  }, [waveformOffset, waveformData.length, drawWaveform])

  // Remove zoom effect that causes infinite loops
  
  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    
    // Store initial mouse position for drag calculations
    lastMouseXRef.current = e.clientX
    
    // Calculate time based on zoomed canvas width and display duration
    const time = (x / zoom) * (displayDuration / rect.width)
    
    // Calculate current playhead position
    const playheadTime = isPlaying ? currentTime : playheadPosition
    const effectiveWidth = rect.width * zoom
          const playheadX = displayDuration > 0 ? (playheadTime / displayDuration) * effectiveWidth : 0
    
    // Check if click is near the playhead (within 10 pixels)
    const clickDistanceFromPlayhead = Math.abs(x - playheadX)
    const isClickingOnPlayhead = clickDistanceFromPlayhead <= 10
    
    console.log('🔍 MOUSE CLICK - x:', x, 'time:', time, 'activeTool:', activeTool, 'displayDuration:', displayDuration, 'zoom:', zoom, 'playheadX:', playheadX, 'distance:', clickDistanceFromPlayhead, 'onPlayhead:', isClickingOnPlayhead)
    
    if (isClickingOnPlayhead) {
      // Start playhead dragging
      dragTypeRef.current = 'playhead-drag'
      console.log('🔍 STARTING PLAYHEAD DRAG')
    } else if (activeTool === 'drag') {
      // Start waveform dragging
      dragTypeRef.current = 'waveform'
      console.log('🔍 STARTING WAVEFORM DRAG')
    } else if (activeTool === 'marker') {
      // Add marker
      const snappedTime = snapTimeToGrid(time)
      const markerName = `Marker ${markers.length + 1}`
      const newMarker: Marker = {
        id: `marker-${Date.now()}`,
        time: snappedTime,
        name: markerName,
        category: 'General'
      }
      setMarkers(prev => [...prev, newMarker])
    } else if (activeTool === 'region') {
      // Start region selection
      const snappedTime = snapTimeToGrid(time)
      setSelectionStart(snappedTime)
      setSelectionEnd(snappedTime)
      setIsSelecting(true)
      dragTypeRef.current = 'selection'
    } else {
      // Start waveform selection for free selection
      const clampedTime = Math.max(0, Math.min(time, displayDuration))
      const snappedTime = snapToGrid ? snapTimeToGrid(clampedTime) : clampedTime
      startWaveSelection(snappedTime)
      dragTypeRef.current = 'selection'
      
      // Also set playhead position
      setPlayheadPosition(snappedTime)
      if (isPlaying && audioRef.current) {
        audioRef.current.currentTime = snappedTime
      }
    }
    
    isDraggingRef.current = true
  }
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const time = (x / zoom) * (displayDuration / rect.width)
    
    if (dragTypeRef.current === 'selection' && selectionStart !== null) {
      const snappedTime = snapTimeToGrid(time)
      setSelectionEnd(snappedTime)
    } else if (dragTypeRef.current === 'selection' && isWaveSelecting) {
      // Update waveform selection
      const clampedTime = Math.max(0, Math.min(time, displayDuration))
      const snappedTime = snapToGrid ? snapTimeToGrid(clampedTime) : clampedTime
      updateWaveSelection(snappedTime)
    } else if (dragTypeRef.current === 'waveform') {
      // Calculate waveform offset based on mouse movement
      const deltaX = e.clientX - lastMouseXRef.current
      const newOffset = waveformOffset + deltaX
      console.log('🔍 WAVEFORM DRAG - deltaX:', deltaX, 'newOffset:', newOffset, 'currentX:', e.clientX, 'lastX:', lastMouseXRef.current)
      setWaveformOffset(newOffset)
      lastMouseXRef.current = e.clientX
      
      // Force immediate redraw for smooth dragging
      setTimeout(() => {
        console.log('🔍 FORCE REDRAW AFTER DRAG')
        drawWaveform()
      }, 0)
    } else if (dragTypeRef.current === 'playhead-drag') {
      // Update playhead position based on mouse movement
      const clampedTime = Math.max(0, Math.min(time, displayDuration))
      const snappedTime = snapTimeToGrid(clampedTime)
      console.log('🔍 PLAYHEAD DRAG - newTime:', clampedTime, 'snappedTime:', snappedTime, 'snapToGrid:', snapToGrid, 'currentX:', e.clientX, 'lastX:', lastMouseXRef.current)
      setPlayheadPosition(snappedTime)
      
      // If audio is playing, update the audio position
      if (isPlaying && audioRef.current) {
        audioRef.current.currentTime = snappedTime
      }
      
      lastMouseXRef.current = e.clientX
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
    
    // End waveform selection if active
    if (isWaveSelecting) {
      endWaveSelection()
    }
  }
  
  // Playback controls
  const togglePlayback = () => {
    console.log('🔍 TOGGLE PLAYBACK - audioRef:', !!audioRef.current, 'isPlaying:', isPlaying, 'totalDuration:', totalDuration, 'playheadPosition:', playheadPosition, 'isDuplicateMain:', isDuplicateMain, 'playBothMode:', playBothMode)
    
    if (playBothMode && duplicateWave?.audioRef) {
      // Play both waves mode
    if (isPlaying) {
        console.log('🔍 STOPPING BOTH WAVES')
        audioRef.current?.pause()
        duplicateWave.audioRef.pause()
      setIsPlaying(false)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    } else {
        // Start both waves from playhead position
      const startFromTime = Math.max(0, Math.min(playheadPosition, totalDuration))
        console.log('🔍 STARTING BOTH WAVES - startFromTime:', startFromTime, 'playbackRate:', playbackRate, 'volume:', volume)
        
        if (audioRef.current) {
      audioRef.current.currentTime = startFromTime
      audioRef.current.playbackRate = playbackRate
      audioRef.current.volume = volume
      audioRef.current.play()
        }
        
        duplicateWave.audioRef.currentTime = startFromTime
        duplicateWave.audioRef.playbackRate = playbackRate
        duplicateWave.audioRef.volume = volume
        duplicateWave.audioRef.play()
        
      setIsPlaying(true)
      
      const updatePlayhead = () => {
        if (audioRef.current && !audioRef.current.paused) {
          const time = audioRef.current.currentTime
            console.log('🔍 UPDATING PLAYHEAD - currentTime:', time)
          setCurrentTime(time)
          
          animationRef.current = requestAnimationFrame(updatePlayhead)
        }
      }
      
      updatePlayhead()
    }
    } else {
      // Play single wave mode (original or duplicate based on isDuplicateMain)
      const mainAudioRef = isDuplicateMain && duplicateWave?.audioRef ? duplicateWave.audioRef : audioRef.current
      
      if (!mainAudioRef) {
        console.log('🔍 NO AUDIO REF - cannot play')
        return
      }
      
      if (isPlaying) {
        console.log('🔍 STOPPING PLAYBACK')
        // Update playhead position to current position when stopping
        const currentPosition = mainAudioRef.currentTime
        console.log('🔍 UPDATING PLAYHEAD POSITION ON STOP - currentPosition:', currentPosition)
        setPlayheadPosition(currentPosition)
        
        mainAudioRef.pause()
        setIsPlaying(false)
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current)
        }
      } else {
        // Start playback from playhead position
        const startFromTime = Math.max(0, Math.min(playheadPosition, totalDuration))
        console.log('🔍 STARTING PLAYBACK - startFromTime:', startFromTime, 'playbackRate:', playbackRate, 'volume:', volume, 'mainAudio:', isDuplicateMain ? 'duplicate' : 'original')
        
        mainAudioRef.currentTime = startFromTime
        mainAudioRef.playbackRate = playbackRate
        mainAudioRef.volume = volume
        mainAudioRef.play()
        
        setIsPlaying(true)
        
        const updatePlayhead = () => {
          if (mainAudioRef && !mainAudioRef.paused) {
            const time = mainAudioRef.currentTime
            console.log('🔍 UPDATING PLAYHEAD - currentTime:', time)
            setCurrentTime(time)
            
            animationRef.current = requestAnimationFrame(updatePlayhead)
          }
        }
        
        updatePlayhead()
      }
    }
  }
  
  const togglePlayBothMode = () => {
    console.log('🔍 TOGGLE PLAY BOTH MODE - current:', playBothMode, 'duplicateWave:', !!duplicateWave)
    
    if (!duplicateWave) {
      console.log('🔍 NEED DUPLICATE WAVE TO ENABLE BOTH MODE')
      return
    }
    
    setPlayBothMode(!playBothMode)
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
    console.log('🔍 FETCHING AUDIO LIBRARY - user:', user?.id)
    if (!user?.id) {
      console.log('🔍 NO USER ID - cannot fetch library')
      return
    }
    
    setLoadingLibrary(true)
    
    try {
      // Fetch all audio items (no limit)
      console.log('🔍 FETCHING AUDIO ITEMS...')
      const { data: audioData, error: audioError } = await supabase
        .from('audio_library_items')
        .select(`
          *,
          pack:audio_packs(id, name, color)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1000000) // Set a very high limit to effectively remove the 1k limit
      
      if (audioError) {
        console.error('🔍 Error fetching audio library:', audioError)
        return
      }
      
      console.log('🔍 AUDIO ITEMS FETCHED:', audioData?.length || 0, 'items')
      setAudioLibraryItems(audioData || [])
      
      // Fetch audio packs
      console.log('🔍 FETCHING AUDIO PACKS...')
      const { data: packsData, error: packsError } = await supabase
        .from('audio_packs')
        .select(`
          *,
          subfolders:audio_subfolders(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (packsError) {
        console.error('🔍 Error fetching audio packs:', packsError)
        return
      }
      
      console.log('🔍 AUDIO PACKS FETCHED:', packsData?.length || 0, 'packs')
      
      // Get file counts for each pack
      const packsWithCounts = await Promise.all(
        (packsData || []).map(async (pack) => {
          const { data: files } = await supabase
            .from('audio_library_items')
            .select('id')
            .eq('user_id', user.id)
            .eq('pack_id', pack.id)
            .limit(1000000) // Set a very high limit to effectively remove the 1k limit
          
          const fileCount = files ? files.length : 0
          return { ...pack, item_count: fileCount }
        })
      )
      
      console.log('🔍 FINAL PACKS WITH COUNTS:', packsWithCounts.length, 'packs')
      setAudioPacks(packsWithCounts)
    } catch (error) {
      console.error('🔍 Error fetching library:', error)
    } finally {
      console.log('🔍 LIBRARY FETCH COMPLETE')
      setLoadingLibrary(false)
    }
  }
  
  // Store the current audio library item for BPM updates
  const [currentLibraryItem, setCurrentLibraryItem] = useState<AudioLibraryItem | null>(null)

  const loadAudioFromLibrary = async (item: AudioLibraryItem) => {
    if (!item.file_url) return
    
    try {
      setIsLoading(true)
      
      // Store the current item for BPM updates
      setCurrentLibraryItem(item)
      
      // Fetch the audio file from the URL
      const response = await fetch(item.file_url)
      if (!response.ok) throw new Error('Failed to fetch audio file')
      
      const blob = await response.blob()
      const file = new File([blob], item.name, { type: 'audio/wav' })
      
      await loadAudioFile(file)
      
      // Auto-set BPM from the audio library item if available
      if (item.bpm && item.bpm > 0) {
        console.log('🔍 AUTO-SETTING BPM FROM LIBRARY:', item.bpm)
        setBpm(item.bpm)
      } else {
        console.log('🔍 BPM IS EMPTY - SETTING TO DEFAULT')
        setBpm(120) // Default BPM when empty
      }
      
      setShowLibrary(false)
    } catch (error) {
      console.error('Error loading audio from library:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Function to update BPM in the database
  const updateBPMInLibrary = async (newBpm: number) => {
    if (!currentLibraryItem || !user?.id) return
    
    try {
      console.log('🔍 UPDATING BPM IN LIBRARY:', newBpm, 'for item:', currentLibraryItem.id)
      
      const { error } = await supabase
        .from('audio_library_items')
        .update({ bpm: newBpm })
        .eq('id', currentLibraryItem.id)
        .eq('user_id', user.id)
      
      if (error) {
        console.error('🔍 Error updating BPM in library:', error)
        toast({
          title: "Error updating BPM",
          description: "Failed to save BPM to database. Please try again.",
          variant: "destructive",
        })
      } else {
        console.log('🔍 BPM UPDATED SUCCESSFULLY IN LIBRARY')
        
        // Show success notification
        toast({
          title: "BPM Updated",
          description: `BPM saved to database: ${newBpm}`,
          variant: "default",
        })
        
        // Update the local state to reflect the change
        setAudioLibraryItems(prev => prev.map(item => 
          item.id === currentLibraryItem.id 
            ? { ...item, bpm: newBpm }
            : item
        ))
        
        // Update the current library item
        setCurrentLibraryItem(prev => prev ? { ...prev, bpm: newBpm } : null)
      }
    } catch (error) {
      console.error('🔍 Error updating BPM in library:', error)
      toast({
        title: "Error updating BPM",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
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
  const timeToBar = (time: number) => Math.floor(time / (stepDuration * 16)) + 1 // 16 steps per bar (like beat maker)
  const barToTime = (bar: number) => (bar - 1) * stepDuration * 16
  const stepToBar = (step: number) => Math.floor(step / 16) + 1
  const barToStep = (bar: number) => (bar - 1) * 16
  
  // Sub-bar (beat) conversion functions
  const beatToTime = (beat: number) => (beat - 1) * stepDuration
  const timeToBeat = (time: number) => Math.floor(time / stepDuration) + 1
  
  // Snap time to grid if snapToGrid is enabled
  const snapTimeToGrid = (time: number) => {
    if (!snapToGrid) return time
    const step = Math.round(time / stepDuration)
    return step * stepDuration
  }
  
  // Save/Load project functions
  const saveProject = () => {
    const projectState = {
      waveformOffset,
      zoom,
      verticalZoom,
      bpm,
      gridDivision,
      playheadPosition,
      markers,
      regions,
      duplicateWave,
      isDuplicateMain,
      playBothMode,
      showDetailedGrid,
      audioFileName: audioFile?.name,
      savedAt: new Date().toISOString()
    }
    
    // Save to localStorage
    localStorage.setItem('loopEditorProject', JSON.stringify(projectState))
    
    // Also save to state for reference
    setProjectData(projectState)
    
    console.log('🔍 PROJECT SAVED:', projectState)
  }
  
  const loadProject = () => {
    const saved = localStorage.getItem('loopEditorProject')
    if (saved) {
      try {
        const projectState = JSON.parse(saved)
        console.log('🔍 LOADING PROJECT:', projectState)
        
        // Only load if the audio file name matches
        if (projectState.audioFileName === audioFile?.name) {
          setWaveformOffset(projectState.waveformOffset || 0)
          setZoom(projectState.zoom || 1)
          setVerticalZoom(projectState.verticalZoom || 1)
          setBpm(projectState.bpm || 120)
          setGridDivision(projectState.gridDivision || 16)
          setPlayheadPosition(projectState.playheadPosition || 0)
          setMarkers(projectState.markers || [])
          setRegions(projectState.regions || [])
          setDuplicateWave(projectState.duplicateWave || null)
          setIsDuplicateMain(projectState.isDuplicateMain || false)
          setPlayBothMode(projectState.playBothMode || false)
          setShowDetailedGrid(projectState.showDetailedGrid || false)
          setProjectData(projectState)
          
          console.log('🔍 PROJECT LOADED SUCCESSFULLY')
        } else {
          console.log('🔍 AUDIO FILE MISMATCH - not loading project')
        }
      } catch (error) {
        console.error('🔍 ERROR LOADING PROJECT:', error)
      }
    }
  }
  
  // Auto-save when important values change
  useEffect(() => {
    if (audioFile && (waveformOffset !== 0 || markers.length > 0 || regions.length > 0 || duplicateWave)) {
      // Debounce auto-save
      const timeoutId = setTimeout(() => {
        saveProject()
      }, 1000) // Save after 1 second of no changes
      
      return () => clearTimeout(timeoutId)
    }
  }, [waveformOffset, markers, regions, duplicateWave, isDuplicateMain, playBothMode, showDetailedGrid, audioFile])
  
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
  
  const addBarTracker = () => {
    if (!audioFile || totalDuration <= 0) return
    
    // Use the EXACT same math as sequencer grid
    const secondsPerBeat = 60 / bpm
    const gridDivision = 16 // 1/16 resolution like sequencer
    const stepDuration = secondsPerBeat / (gridDivision / 4)
    const loopBars = Math.round((totalDuration / stepDuration) / 4)
    const beatsPerBar = 4 // Assuming 4/4 time signature
    const totalBeats = loopBars * beatsPerBar
    const currentBar = timeToBar(playheadPosition)
    
    // Check if a bar tracker marker already exists
    const existingBarTracker = markers.find(marker => 
      marker.category === 'Bar Tracker'
    )
    
    if (existingBarTracker) {
      // Update existing bar tracker
      setMarkers(prev => prev.map(marker => 
        marker.category === 'Bar Tracker' 
          ? {
              ...marker,
              name: `Bar ${currentBar} / ${loopBars}`,
              time: playheadPosition
            }
          : marker
      ))
      console.log(`Updated bar tracker: Bar ${currentBar} / ${loopBars}`)
    } else {
      // Create new bar tracker marker
      const newMarker: Marker = {
        id: `bar-tracker-${Date.now()}`,
        time: playheadPosition,
        name: `Bar ${currentBar} / ${loopBars}`,
        category: 'Bar Tracker'
      }
      setMarkers(prev => [...prev, newMarker])
      console.log(`Created bar tracker: Bar ${currentBar} / ${loopBars}`)
    }
    
    // Mark all bars as tracked
    const allBars = Array.from({ length: loopBars }, (_, i) => i + 1)
    setMarkedBars(allBars)
    console.log(`Marked ${loopBars} bars for visual tracking`)
    
    // Also mark all sub-bars (beats) for visual tracking
    const allSubBars = Array.from({ length: totalBeats }, (_, i) => i + 1)
    setMarkedSubBars(allSubBars)
    console.log(`Marked ${totalBeats} sub-bars (beats) for visual tracking`)
  }
  
  const updateBarTracker = () => {
    if (!audioFile || totalDuration <= 0) return
    
    const existingBarTracker = markers.find(marker => 
      marker.category === 'Bar Tracker'
    )
    
    if (existingBarTracker) {
      // Use the EXACT same math as sequencer grid
      const secondsPerBeat = 60 / bpm
      const gridDivision = 16 // 1/16 resolution like sequencer
      const stepDuration = secondsPerBeat / (gridDivision / 4)
      const loopBars = Math.round((totalDuration / stepDuration) / 4)
      const currentBar = timeToBar(playheadPosition)
      
      setMarkers(prev => prev.map(marker => 
        marker.category === 'Bar Tracker' 
          ? {
              ...marker,
              name: `Bar ${currentBar} / ${loopBars}`,
              time: playheadPosition
            }
          : marker
      ))
    }
  }
  
  const duplicateWaveTrack = async () => {
    if (!audioFile || !waveformData.length) {
      console.log('No audio file or waveform data to duplicate')
      return
    }
    
    try {
      // Create a new audio element for the duplicate
      const duplicateAudio = new Audio()
      duplicateAudio.src = URL.createObjectURL(audioFile)
      duplicateAudio.preload = 'auto'
      
      // Wait for audio to load
      await new Promise((resolve, reject) => {
        duplicateAudio.addEventListener('canplaythrough', resolve)
        duplicateAudio.addEventListener('error', reject)
        duplicateAudio.load()
      })
      
      // Create duplicate wave data
      const duplicateWaveformData = [...waveformData]
      
      // Set up the duplicate wave
      setDuplicateWave({
        audioFile: audioFile,
        waveformData: duplicateWaveformData,
        audioRef: duplicateAudio,
        isReversed: false,
        offset: 0
      })
      
      console.log('Wave duplicated successfully')
    } catch (error) {
      console.error('Error duplicating wave:', error)
    }
  }
  
  const reverseDuplicateWave = () => {
    if (!duplicateWave) return
    
    setDuplicateWave(prev => {
      if (!prev) return prev
      
      const willBeReversed = !prev.isReversed
      
      // Reverse the waveform data for visual representation
      let newWaveformData: WaveformPoint[]
      if (willBeReversed) {
        // When reversing, we need to flip the x-coordinates and reverse the array
        const reversedData = [...prev.waveformData].reverse()
        newWaveformData = reversedData.map(point => ({
          x: totalDuration - point.x, // Flip the x-coordinate
          y: point.y
        }))
      } else {
        // When restoring to normal, use the original waveform data
        newWaveformData = [...waveformData]
      }
      
      // Handle audio reversal
      if (prev.audioRef && prev.audioFile) {
        if (willBeReversed) {
          // Create a new audio context to reverse the audio
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
          
          // Fetch the audio file and decode it
          fetch(URL.createObjectURL(prev.audioFile))
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
            .then(audioBuffer => {
              // Create a new buffer with reversed audio
              const reversedBuffer = audioContext.createBuffer(
                audioBuffer.numberOfChannels,
                audioBuffer.length,
                audioBuffer.sampleRate
              )
              
              // Reverse each channel
              for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
                const originalData = audioBuffer.getChannelData(channel)
                const reversedData = reversedBuffer.getChannelData(channel)
                
                for (let i = 0; i < audioBuffer.length; i++) {
                  reversedData[i] = originalData[audioBuffer.length - 1 - i]
                }
              }
              
              // Create a new blob from the reversed audio
              const offlineContext = new OfflineAudioContext(
                audioBuffer.numberOfChannels,
                audioBuffer.length,
                audioBuffer.sampleRate
              )
              
              const source = offlineContext.createBufferSource()
              source.buffer = reversedBuffer
              source.connect(offlineContext.destination)
              source.start()
              
              offlineContext.startRendering().then(renderedBuffer => {
                // Convert the rendered buffer to a blob
                const wavBlob = audioBufferToWav(renderedBuffer)
                const reversedAudioUrl = URL.createObjectURL(wavBlob)
                
                // Update the audio element with the reversed audio
                if (prev.audioRef) {
                  prev.audioRef.src = reversedAudioUrl
                  prev.audioRef.load()
                  console.log('Audio reversed successfully')
                }
              })
            })
            .catch(error => {
              console.error('Error reversing audio:', error)
            })
        } else {
          // Restore original audio
          const originalAudioUrl = URL.createObjectURL(prev.audioFile)
          prev.audioRef.src = originalAudioUrl
          prev.audioRef.load()
          console.log('Audio restored to original')
        }
      }
      
      return {
        ...prev,
        waveformData: newWaveformData,
        isReversed: willBeReversed
      }
    })
  }
  
  // Helper function to convert AudioBuffer to WAV blob
  const audioBufferToWav = (buffer: AudioBuffer): Blob => {
    const length = buffer.length
    const numberOfChannels = buffer.numberOfChannels
    const sampleRate = buffer.sampleRate
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2)
    const view = new DataView(arrayBuffer)
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }
    
    writeString(0, 'RIFF')
    view.setUint32(4, 36 + length * numberOfChannels * 2, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, numberOfChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * numberOfChannels * 2, true)
    view.setUint16(32, numberOfChannels * 2, true)
    view.setUint16(34, 16, true)
    writeString(36, 'data')
    view.setUint32(40, length * numberOfChannels * 2, true)
    
    // Convert float samples to 16-bit PCM
    let offset = 44
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]))
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true)
        offset += 2
      }
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' })
  }
  
  const swapMainWave = () => {
    if (!duplicateWave) return
    
    console.log('🔍 SWAPPING MAIN WAVE - current main:', isDuplicateMain ? 'duplicate' : 'original')
    
    // Stop playback before swapping to avoid issues
    if (isPlaying) {
      if (audioRef.current) audioRef.current.pause()
      if (duplicateWave.audioRef) duplicateWave.audioRef.pause()
      setIsPlaying(false)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
    
    setIsDuplicateMain(!isDuplicateMain)
    
    console.log('🔍 MAIN WAVE SWAPPED TO:', !isDuplicateMain ? 'duplicate' : 'original')
  }
  
  const removeMarker = (markerId: string) => {
    setMarkers(prev => prev.filter(marker => marker.id !== markerId))
  }

  // Multi-selection functions


  const stopEditingMarker = () => {
    if (editingMarkerId) {
      console.log('🔍 Stopping marker editing')
      setEditingMarkerId(null)
      toast({
        title: "Editing Stopped",
        description: "Marker editing mode disabled",
        variant: "default",
      })
    }
  }

  // Shuffle audio segments based on markers
  const shuffleMarkers = async () => {
    if (!audioRef.current || markers.length === 0) {
      toast({
        title: "Cannot Shuffle",
        description: "Need audio file and markers to shuffle",
        variant: "destructive",
      })
      return
    }

    try {
      console.log('🔍 Starting marker shuffle...')
      
      // Get all marker positions (including positions within markers)
      const allPositions: number[] = []
      markers.forEach(marker => {
        if (marker.positions && marker.positions.length > 0) {
          allPositions.push(...marker.positions)
        } else {
          allPositions.push(marker.time)
        }
      })
      
      // Sort positions and add start/end
      const sortedPositions = [...new Set(allPositions)].sort((a, b) => a - b)
      if (sortedPositions[0] !== 0) sortedPositions.unshift(0)
      if (sortedPositions[sortedPositions.length - 1] !== totalDuration) {
        sortedPositions.push(totalDuration)
      }
      
      console.log('🔍 Positions for shuffling:', sortedPositions)
      
      // Create segments from positions
      const segments: { start: number; end: number; duration: number }[] = []
      for (let i = 0; i < sortedPositions.length - 1; i++) {
        segments.push({
          start: sortedPositions[i],
          end: sortedPositions[i + 1],
          duration: sortedPositions[i + 1] - sortedPositions[i]
        })
      }
      
      console.log('🔍 Audio segments:', segments)
      
      // Shuffle segments
      const shuffledSegments = [...segments].sort(() => Math.random() - 0.5)
      console.log('🔍 Shuffled segments:', shuffledSegments)
      
      // Create shuffled audio
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Get original audio buffer
      const response = await fetch(audioRef.current.src)
      const arrayBuffer = await response.arrayBuffer()
      const originalBuffer = await audioContext.decodeAudioData(arrayBuffer)
      
      // Calculate total duration of shuffled audio
      const totalShuffledDuration = shuffledSegments.reduce((sum, seg) => sum + seg.duration, 0)
      
      // Create new buffer for shuffled audio
      const shuffledBuffer = audioContext.createBuffer(
        originalBuffer.numberOfChannels,
        Math.ceil(totalShuffledDuration * originalBuffer.sampleRate),
        originalBuffer.sampleRate
      )
      
      // Copy shuffled segments to new buffer
      let shuffledTime = 0
      for (const segment of shuffledSegments) {
        const startSample = Math.floor(segment.start * originalBuffer.sampleRate)
        const endSample = Math.floor(segment.end * originalBuffer.sampleRate)
        const segmentLength = endSample - startSample
        
        for (let channel = 0; channel < originalBuffer.numberOfChannels; channel++) {
          const originalData = originalBuffer.getChannelData(channel)
          const shuffledData = shuffledBuffer.getChannelData(channel)
          
          // Copy segment data
          for (let i = 0; i < segmentLength; i++) {
            const shuffledIndex = Math.floor(shuffledTime * originalBuffer.sampleRate) + i
            if (shuffledIndex < shuffledData.length) {
              shuffledData[shuffledIndex] = originalData[startSample + i] || 0
            }
          }
        }
        
        shuffledTime += segment.duration
      }
      
      // Convert buffer to blob and create new audio source
      const shuffledBlob = audioBufferToWav(shuffledBuffer)
      const shuffledUrl = URL.createObjectURL(shuffledBlob)
      
      // Update audio source
      if (audioRef.current) {
        audioRef.current.src = shuffledUrl
        audioRef.current.load()
        
        // Reset playhead
        setPlayheadPosition(0)
        setCurrentTime(0)
        
        // Update waveform to match shuffled audio
        const shuffledAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const shuffledArrayBuffer = await shuffledBlob.arrayBuffer()
        const shuffledAudioBuffer = await shuffledAudioContext.decodeAudioData(shuffledArrayBuffer)
        
        const shuffledChannelData = shuffledAudioBuffer.getChannelData(0)
        const shuffledSampleRate = shuffledAudioBuffer.sampleRate
        const shuffledDuration = shuffledAudioBuffer.duration
        
        // Update duration
        setDuration(shuffledDuration)
        
        // Generate new waveform data for shuffled audio
        const numPoints = Math.max(2000, Math.floor(shuffledDuration * 50))
        const samplesPerPoint = Math.floor(shuffledChannelData.length / numPoints)
        const shuffledWaveform: WaveformPoint[] = []
        
        for (let i = 0; i < numPoints; i++) {
          const start = i * samplesPerPoint
          const end = Math.min(start + samplesPerPoint, shuffledChannelData.length)
          
          let rms = 0
          let peak = 0
          let sampleCount = 0
          
          for (let j = start; j < end; j++) {
            const sample = Math.abs(shuffledChannelData[j])
            rms += sample * sample
            peak = Math.max(peak, sample)
            sampleCount++
          }
          
          rms = Math.sqrt(rms / sampleCount)
          
          shuffledWaveform.push({
            x: (i / numPoints) * shuffledDuration,
            y: rms
          })
        }
        
        // Update waveform state
        setWaveformData(shuffledWaveform)
        setDuration(shuffledDuration)
      }
      
      toast({
        title: "Markers Shuffled!",
        description: `Audio shuffled with ${segments.length} segments`,
        variant: "default",
      })
      
      console.log('🔍 Shuffle complete!')
      
    } catch (error) {
      console.error('🔍 Shuffle error:', error)
      toast({
        title: "Shuffle Failed",
        description: "Error shuffling audio segments",
        variant: "destructive",
      })
    }
  }

  // Shuffle audio segments based on grid divisions
  const shuffleGrid = async () => {
    if (!audioRef.current || !bpm) {
      toast({
        title: "Cannot Shuffle Grid",
        description: "Need audio file and BPM to create grid",
        variant: "destructive",
      })
      return
    }

    try {
      console.log('🔍 Starting grid shuffle...')
      
      // Calculate grid divisions based on BPM
      const beatsPerSecond = bpm / 60
      const beatDuration = 1 / beatsPerSecond
      
      // Create grid positions (every beat)
      const gridPositions: number[] = []
      let currentTime = 0
      
      while (currentTime < totalDuration) {
        gridPositions.push(currentTime)
        currentTime += beatDuration
      }
      
      // Add end position if not already included
      if (gridPositions[gridPositions.length - 1] !== totalDuration) {
        gridPositions.push(totalDuration)
      }
      
      console.log('🔍 Grid positions for shuffling:', gridPositions)
      console.log('🔍 Grid divisions:', gridPositions.length - 1)
      
      // Create segments from grid positions
      const segments: { start: number; end: number; duration: number }[] = []
      for (let i = 0; i < gridPositions.length - 1; i++) {
        segments.push({
          start: gridPositions[i],
          end: gridPositions[i + 1],
          duration: gridPositions[i + 1] - gridPositions[i]
        })
      }
      
      console.log('🔍 Grid segments:', segments)
      
      // Shuffle segments
      const shuffledSegments = [...segments].sort(() => Math.random() - 0.5)
      console.log('🔍 Shuffled grid segments:', shuffledSegments)
      
      // Create shuffled audio
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Get original audio buffer
      const response = await fetch(audioRef.current.src)
      const arrayBuffer = await response.arrayBuffer()
      const originalBuffer = await audioContext.decodeAudioData(arrayBuffer)
      
      // Calculate total duration of shuffled audio
      const totalShuffledDuration = shuffledSegments.reduce((sum, seg) => sum + seg.duration, 0)
      
      // Create new buffer for shuffled audio
      const shuffledBuffer = audioContext.createBuffer(
        originalBuffer.numberOfChannels,
        Math.ceil(totalShuffledDuration * originalBuffer.sampleRate),
        originalBuffer.sampleRate
      )
      
      // Copy shuffled segments to new buffer
      let shuffledTime = 0
      for (const segment of shuffledSegments) {
        const startSample = Math.floor(segment.start * originalBuffer.sampleRate)
        const endSample = Math.floor(segment.end * originalBuffer.sampleRate)
        const segmentLength = endSample - startSample
        
        for (let channel = 0; channel < originalBuffer.numberOfChannels; channel++) {
          const originalData = originalBuffer.getChannelData(channel)
          const shuffledData = shuffledBuffer.getChannelData(channel)
          
          // Copy segment data
          for (let i = 0; i < segmentLength; i++) {
            const shuffledIndex = Math.floor(shuffledTime * originalBuffer.sampleRate) + i
            if (shuffledIndex < shuffledData.length) {
              shuffledData[shuffledIndex] = originalData[startSample + i] || 0
            }
          }
        }
        
        shuffledTime += segment.duration
      }
      
      // Convert buffer to blob and create new audio source
      const shuffledBlob = audioBufferToWav(shuffledBuffer)
      const shuffledUrl = URL.createObjectURL(shuffledBlob)
      
      // Update audio source
      if (audioRef.current) {
        audioRef.current.src = shuffledUrl
        audioRef.current.load()
        
        // Reset playhead
        setPlayheadPosition(0)
        setCurrentTime(0)
        
        // Update waveform to match shuffled audio
        const shuffledAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const shuffledArrayBuffer = await shuffledBlob.arrayBuffer()
        const shuffledAudioBuffer = await shuffledAudioContext.decodeAudioData(shuffledArrayBuffer)
        
        const shuffledChannelData = shuffledAudioBuffer.getChannelData(0)
        const shuffledSampleRate = shuffledAudioBuffer.sampleRate
        const shuffledDuration = shuffledAudioBuffer.duration
        
        // Update duration
        setDuration(shuffledDuration)
        
        // Generate new waveform data for shuffled audio
        const numPoints = Math.max(2000, Math.floor(shuffledDuration * 50))
        const samplesPerPoint = Math.floor(shuffledChannelData.length / numPoints)
        const shuffledWaveform: WaveformPoint[] = []
        
        for (let i = 0; i < numPoints; i++) {
          const start = i * samplesPerPoint
          const end = Math.min(start + samplesPerPoint, shuffledChannelData.length)
          
          let rms = 0
          let peak = 0
          let sampleCount = 0
          
          for (let j = start; j < end; j++) {
            const sample = Math.abs(shuffledChannelData[j])
            rms += sample * sample
            peak = Math.max(peak, sample)
            sampleCount++
          }
          
          rms = Math.sqrt(rms / sampleCount)
          
          shuffledWaveform.push({
            x: (i / numPoints) * shuffledDuration,
            y: rms
          })
        }
        
        // Update waveform state
        setWaveformData(shuffledWaveform)
        setDuration(shuffledDuration)
      }
      
      toast({
        title: "Grid Shuffled!",
        description: `Audio shuffled with ${segments.length} grid segments (${bpm} BPM)`,
        variant: "default",
      })
      
      console.log('🔍 Grid shuffle complete!')
      
    } catch (error) {
      console.error('🔍 Grid shuffle error:', error)
      toast({
        title: "Grid Shuffle Failed",
        description: "Error shuffling grid segments",
        variant: "destructive",
      })
    }
  }

  // Manual continuous shuffling - each click shuffles differently
  const handleShuffle = async (shuffleType: 'markers' | 'grid') => {
    if (shuffleType === 'markers') {
      await shuffleMarkers()
    } else {
      await shuffleGrid()
    }
  }

  // Waveform selection functions
  const startWaveSelection = (time: number) => {
    setWaveSelectionStart(time)
    setWaveSelectionEnd(time)
    setIsWaveSelecting(true)
  }

  const updateWaveSelection = (time: number) => {
    if (isWaveSelecting && waveSelectionStart !== null) {
      setWaveSelectionEnd(time)
    }
  }

  const endWaveSelection = () => {
    setIsWaveSelecting(false)
  }

  const clearWaveSelection = () => {
    setWaveSelectionStart(null)
    setWaveSelectionEnd(null)
    setIsWaveSelecting(false)
  }

  const getSelectedSegment = () => {
    if (waveSelectionStart === null || waveSelectionEnd === null) return null
    const start = Math.min(waveSelectionStart, waveSelectionEnd)
    const end = Math.max(waveSelectionStart, waveSelectionEnd)
    return { start, end, duration: end - start }
  }

  // Delete selected segment
  const deleteSelectedSegment = async () => {
    const segment = getSelectedSegment()
    if (!segment || !audioRef.current) return

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const response = await fetch(audioRef.current.src)
      const arrayBuffer = await response.arrayBuffer()
      const originalBuffer = await audioContext.decodeAudioData(arrayBuffer)

      // Create new buffer without the selected segment
      const newDuration = originalBuffer.duration - segment.duration
      const newBuffer = audioContext.createBuffer(
        originalBuffer.numberOfChannels,
        Math.ceil(newDuration * originalBuffer.sampleRate),
        originalBuffer.sampleRate
      )

      // Copy audio data before and after the segment
      for (let channel = 0; channel < originalBuffer.numberOfChannels; channel++) {
        const originalData = originalBuffer.getChannelData(channel)
        const newData = newBuffer.getChannelData(channel)
        
        // Copy before segment
        const beforeSamples = Math.floor(segment.start * originalBuffer.sampleRate)
        for (let i = 0; i < beforeSamples; i++) {
          newData[i] = originalData[i]
        }
        
        // Copy after segment
        const afterStart = Math.floor(segment.end * originalBuffer.sampleRate)
        const afterSamples = originalData.length - afterStart
        for (let i = 0; i < afterSamples; i++) {
          newData[beforeSamples + i] = originalData[afterStart + i]
        }
      }

      // Update audio
      const newBlob = audioBufferToWav(newBuffer)
      const newUrl = URL.createObjectURL(newBlob)
      
      if (audioRef.current) {
        audioRef.current.src = newUrl
        audioRef.current.load()
        setPlayheadPosition(0)
        setCurrentTime(0)
        
        // Update waveform
        await updateWaveformFromBuffer(newBuffer)
      }

      clearWaveSelection()
      toast({
        title: "Segment Deleted",
        description: `Deleted ${segment.duration.toFixed(2)}s segment`,
        variant: "default",
      })

    } catch (error) {
      console.error('Delete segment error:', error)
      toast({
        title: "Delete Failed",
        description: "Error deleting segment",
        variant: "destructive",
      })
    }
  }

  // Copy selected segment
  const copySelectedSegment = async () => {
    const segment = getSelectedSegment()
    if (!segment || !audioRef.current) return

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const response = await fetch(audioRef.current.src)
      const arrayBuffer = await response.arrayBuffer()
      const originalBuffer = await audioContext.decodeAudioData(arrayBuffer)

      // Extract segment data
      const startSample = Math.floor(segment.start * originalBuffer.sampleRate)
      const endSample = Math.floor(segment.end * originalBuffer.sampleRate)
      const segmentLength = endSample - startSample
      
      const segmentData = originalBuffer.getChannelData(0).slice(startSample, endSample)
      
      setClipboardSegment({
        start: segment.start,
        end: segment.end,
        audioData: segmentData
      })

      toast({
        title: "Segment Copied",
        description: `Copied ${segment.duration.toFixed(2)}s segment`,
        variant: "default",
      })

    } catch (error) {
      console.error('Copy segment error:', error)
      toast({
        title: "Copy Failed",
        description: "Error copying segment",
        variant: "destructive",
      })
    }
  }

  // Paste segment at playhead
  const pasteSegment = async () => {
    if (!clipboardSegment || !audioRef.current) return

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const response = await fetch(audioRef.current.src)
      const arrayBuffer = await response.arrayBuffer()
      const originalBuffer = await audioContext.decodeAudioData(arrayBuffer)

      // Create new buffer with pasted segment
      const segmentDuration = clipboardSegment.end - clipboardSegment.start
      const newDuration = originalBuffer.duration + segmentDuration
      const newBuffer = audioContext.createBuffer(
        originalBuffer.numberOfChannels,
        Math.ceil(newDuration * originalBuffer.sampleRate),
        originalBuffer.sampleRate
      )

      // Copy original data
      for (let channel = 0; channel < originalBuffer.numberOfChannels; channel++) {
        const originalData = originalBuffer.getChannelData(channel)
        const newData = newBuffer.getChannelData(channel)
        
        // Copy before paste point
        const pasteSample = Math.floor(playheadPosition * originalBuffer.sampleRate)
        for (let i = 0; i < pasteSample; i++) {
          newData[i] = originalData[i]
        }
        
        // Paste segment
        for (let i = 0; i < clipboardSegment.audioData.length; i++) {
          newData[pasteSample + i] = clipboardSegment.audioData[i]
        }
        
        // Copy after paste point
        for (let i = pasteSample; i < originalData.length; i++) {
          newData[i + clipboardSegment.audioData.length] = originalData[i]
        }
      }

      // Update audio
      const newBlob = audioBufferToWav(newBuffer)
      const newUrl = URL.createObjectURL(newBlob)
      
      if (audioRef.current) {
        audioRef.current.src = newUrl
        audioRef.current.load()
        
        // Update waveform
        await updateWaveformFromBuffer(newBuffer)
      }

      toast({
        title: "Segment Pasted",
        description: `Pasted ${segmentDuration.toFixed(2)}s segment`,
        variant: "default",
      })

    } catch (error) {
      console.error('Paste segment error:', error)
      toast({
        title: "Paste Failed",
        description: "Error pasting segment",
        variant: "destructive",
      })
    }
  }

  // Shuffle selected segment
  const shuffleSelectedSegment = async () => {
    const segment = getSelectedSegment()
    if (!segment || !audioRef.current) return

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const response = await fetch(audioRef.current.src)
      const arrayBuffer = await response.arrayBuffer()
      const originalBuffer = await audioContext.decodeAudioData(arrayBuffer)

      // Extract segment
      const startSample = Math.floor(segment.start * originalBuffer.sampleRate)
      const endSample = Math.floor(segment.end * originalBuffer.sampleRate)
      const segmentLength = endSample - startSample
      
      // Create segment buffer
      const segmentBuffer = audioContext.createBuffer(
        originalBuffer.numberOfChannels,
        segmentLength,
        originalBuffer.sampleRate
      )

      // Copy segment data
      for (let channel = 0; channel < originalBuffer.numberOfChannels; channel++) {
        const originalData = originalBuffer.getChannelData(channel)
        const segmentChannelData = segmentBuffer.getChannelData(channel)
        for (let i = 0; i < segmentLength; i++) {
          segmentChannelData[i] = originalData[startSample + i]
        }
      }

      // Shuffle segment (divide into smaller chunks and shuffle)
      const chunkSize = Math.floor(segmentLength / 8) // 8 chunks
      const chunks: Float32Array[] = []
      
      for (let i = 0; i < 8; i++) {
        const chunkStart = i * chunkSize
        const chunkEnd = i === 7 ? segmentLength : (i + 1) * chunkSize
        chunks.push(segmentBuffer.getChannelData(0).slice(chunkStart, chunkEnd))
      }

      // Shuffle chunks
      const shuffledChunks = [...chunks].sort(() => Math.random() - 0.5)

      // Create new buffer with shuffled segment
      const newBuffer = audioContext.createBuffer(
        originalBuffer.numberOfChannels,
        originalBuffer.length,
        originalBuffer.sampleRate
      )

      // Copy original data
      for (let channel = 0; channel < originalBuffer.numberOfChannels; channel++) {
        const originalData = originalBuffer.getChannelData(channel)
        const newData = newBuffer.getChannelData(channel)
        
        // Copy before segment
        for (let i = 0; i < startSample; i++) {
          newData[i] = originalData[i]
        }
        
        // Copy shuffled segment
        let chunkOffset = 0
        for (const chunk of shuffledChunks) {
          for (let i = 0; i < chunk.length; i++) {
            newData[startSample + chunkOffset + i] = chunk[i]
          }
          chunkOffset += chunk.length
        }
        
        // Copy after segment
        for (let i = endSample; i < originalData.length; i++) {
          newData[i] = originalData[i]
        }
      }

      // Update audio
      const newBlob = audioBufferToWav(newBuffer)
      const newUrl = URL.createObjectURL(newBlob)
      
      if (audioRef.current) {
        audioRef.current.src = newUrl
        audioRef.current.load()
        
        // Update waveform
        await updateWaveformFromBuffer(newBuffer)
      }

      clearWaveSelection()
      toast({
        title: "Segment Shuffled",
        description: `Shuffled ${segment.duration.toFixed(2)}s segment`,
        variant: "default",
      })

    } catch (error) {
      console.error('Shuffle segment error:', error)
      toast({
        title: "Shuffle Failed",
        description: "Error shuffling segment",
        variant: "destructive",
      })
    }
  }

  // Magic Shuffle selected segment - shuffles segment AND copies a sub-segment
  const magicShuffleSelectedSegment = async () => {
    const segment = getSelectedSegment()
    if (!segment || !audioRef.current) return

    try {
      console.log('🔍 Starting Magic Shuffle Selected Segment...')
      
      // First: Shuffle the selected segment
      await shuffleSelectedSegment()
      
      // Second: Find and copy an interesting sub-segment from the original segment
      const interestingSubSegments = findInterestingSubSegments(segment)
      
      if (interestingSubSegments.length > 0) {
        // Randomly select one of the interesting sub-segments
        const randomSubSegment = interestingSubSegments[Math.floor(Math.random() * interestingSubSegments.length)]
        
        // Copy the selected sub-segment
        await copySegmentToClipboard(randomSubSegment)
        
        // Set visual selection for the sub-segment
        setWaveSelectionStart(randomSubSegment.start)
        setWaveSelectionEnd(randomSubSegment.end)
        
        toast({
          title: "Magic Shuffle Complete!",
          description: `Segment shuffled + copied ${randomSubSegment.duration.toFixed(2)}s sub-segment`,
          variant: "default",
        })
      } else {
        toast({
          title: "Magic Shuffle Complete!",
          description: `Segment shuffled successfully`,
          variant: "default",
        })
      }
      
      console.log('🔍 Magic shuffle selected segment complete!')
      
    } catch (error) {
      console.error('🔍 Magic shuffle selected segment error:', error)
      toast({
        title: "Magic Shuffle Failed",
        description: "Error performing magic shuffle on selected segment",
        variant: "destructive",
      })
    }
  }

  // Find interesting sub-segments within a specific segment
  const findInterestingSubSegments = (parentSegment: { start: number; end: number; duration: number }) => {
    const subSegments: { start: number; end: number; duration: number; energy: number }[] = []
    
    // Find waveform points within the parent segment
    const segmentPoints = waveformData.filter(point => 
      point.x >= parentSegment.start && point.x <= parentSegment.end
    )
    
    if (segmentPoints.length < 10) return subSegments // Need enough points
    
    // Analyze sub-segments within the parent segment
    const windowSize = Math.floor(segmentPoints.length / 5) // 5 windows within segment
    const minSubDuration = 0.2 // Minimum 0.2 seconds
    const maxSubDuration = Math.min(parentSegment.duration * 0.8, 2.0) // Max 80% of parent or 2s
    
    for (let i = 0; i < segmentPoints.length - windowSize; i += windowSize) {
      const windowData = segmentPoints.slice(i, i + windowSize)
      
      // Calculate average energy for this window
      const avgEnergy = windowData.reduce((sum, point) => sum + point.y, 0) / windowData.length
      
      // Calculate energy variance
      const variance = windowData.reduce((sum, point) => sum + Math.pow(point.y - avgEnergy, 2), 0) / windowData.length
      
      // Calculate start and end times
      const startTime = windowData[0].x
      const endTime = windowData[windowData.length - 1].x
      const duration = endTime - startTime
      
      // Only include sub-segments within reasonable duration
      if (duration >= minSubDuration && duration <= maxSubDuration) {
        // Score based on energy and variance
        const score = avgEnergy * (1 + variance)
        
        subSegments.push({
          start: startTime,
          end: endTime,
          duration,
          energy: score
        })
      }
    }
    
    // Sort by energy score (most interesting first)
    subSegments.sort((a, b) => b.energy - a.energy)
    
    // Return top 3 most interesting sub-segments
    return subSegments.slice(0, 3)
  }

  // Helper function to update waveform from buffer
  const updateWaveformFromBuffer = async (buffer: AudioBuffer) => {
    const channelData = buffer.getChannelData(0)
    const sampleRate = buffer.sampleRate
    const duration = buffer.duration
    
    setDuration(duration)
    
    // Generate new waveform data
    const numPoints = Math.max(2000, Math.floor(duration * 50))
    const samplesPerPoint = Math.floor(channelData.length / numPoints)
    const newWaveform: WaveformPoint[] = []
    
    for (let i = 0; i < numPoints; i++) {
      const start = i * samplesPerPoint
      const end = Math.min(start + samplesPerPoint, channelData.length)
      
      let rms = 0
      let sampleCount = 0
      
      for (let j = start; j < end; j++) {
        const sample = Math.abs(channelData[j])
        rms += sample * sample
        sampleCount++
      }
      
      rms = Math.sqrt(rms / sampleCount)
      
      newWaveform.push({
        x: (i / numPoints) * duration,
        y: rms
      })
    }
    
    setWaveformData(newWaveform)
  }

  // Magic Shuffle - shuffles audio AND copies a random segment
  const magicShuffle = async () => {
    if (!audioRef.current || !waveformData.length) {
      toast({
        title: "Cannot Magic Shuffle",
        description: "Need audio file to perform magic shuffle",
        variant: "destructive",
      })
      return
    }

    try {
      console.log('🔍 Starting Magic Shuffle...')
      
      // First: Shuffle the audio (like other shuffle buttons)
      await shuffleGrid()
      
      // Second: Find and copy an interesting segment
      const interestingSegments = findInterestingSegments()
      
      if (interestingSegments.length > 0) {
        // Randomly select one of the interesting segments
        const randomSegment = interestingSegments[Math.floor(Math.random() * interestingSegments.length)]
        
        // Copy the selected segment
        await copySegmentToClipboard(randomSegment)
        
        // Set visual selection
        setWaveSelectionStart(randomSegment.start)
        setWaveSelectionEnd(randomSegment.end)
        
        toast({
          title: "Magic Shuffle Complete!",
          description: `Audio shuffled + copied ${randomSegment.duration.toFixed(2)}s segment`,
          variant: "default",
        })
      } else {
        toast({
          title: "Magic Shuffle Complete!",
          description: "Audio shuffled successfully",
          variant: "default",
        })
      }
      
      console.log('🔍 Magic shuffle complete!')
      
    } catch (error) {
      console.error('🔍 Magic shuffle error:', error)
      toast({
        title: "Magic Shuffle Failed",
        description: "Error performing magic shuffle",
        variant: "destructive",
      })
    }
  }

  // Find interesting segments based on waveform analysis
  const findInterestingSegments = () => {
    const segments: { start: number; end: number; duration: number; energy: number }[] = []
    
    // Analyze waveform for high-energy regions
    const windowSize = Math.floor(waveformData.length / 20) // 20 windows
    const minSegmentDuration = 0.5 // Minimum 0.5 seconds
    const maxSegmentDuration = 4.0 // Maximum 4 seconds
    
    for (let i = 0; i < waveformData.length - windowSize; i += windowSize) {
      const windowData = waveformData.slice(i, i + windowSize)
      
      // Calculate average energy for this window
      const avgEnergy = windowData.reduce((sum, point) => sum + point.y, 0) / windowData.length
      
      // Calculate energy variance (how dynamic this section is)
      const variance = windowData.reduce((sum, point) => sum + Math.pow(point.y - avgEnergy, 2), 0) / windowData.length
      
      // Calculate start and end times
      const startTime = windowData[0].x
      const endTime = windowData[windowData.length - 1].x
      const duration = endTime - startTime
      
      // Only include segments within reasonable duration
      if (duration >= minSegmentDuration && duration <= maxSegmentDuration) {
        // Score based on energy and variance (more dynamic = more interesting)
        const score = avgEnergy * (1 + variance)
        
        segments.push({
          start: startTime,
          end: endTime,
          duration,
          energy: score
        })
      }
    }
    
    // Sort by energy score (most interesting first)
    segments.sort((a, b) => b.energy - a.energy)
    
    // Return top 5 most interesting segments
    return segments.slice(0, 5)
  }

  // Copy segment to clipboard
  const copySegmentToClipboard = async (segment: { start: number; end: number; duration: number }) => {
    if (!audioRef.current) return

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const response = await fetch(audioRef.current.src)
      const arrayBuffer = await response.arrayBuffer()
      const originalBuffer = await audioContext.decodeAudioData(arrayBuffer)

      // Extract segment data
      const startSample = Math.floor(segment.start * originalBuffer.sampleRate)
      const endSample = Math.floor(segment.end * originalBuffer.sampleRate)
      const segmentLength = endSample - startSample
      
      const segmentData = originalBuffer.getChannelData(0).slice(startSample, endSample)
      
      setClipboardSegment({
        start: segment.start,
        end: segment.end,
        audioData: segmentData
      })

    } catch (error) {
      console.error('Copy segment error:', error)
      throw error
    }
  }

  // ADD POSITIONS to existing marker or create new marker
  const addMarkerToSelection = () => {
    console.log('🔍 ===== FUNCTION CALLED =====')
    console.log('🔍 editingMarkerId:', editingMarkerId)
    
    if (editingMarkerId) {
      console.log('🔍 EDIT MODE ACTIVE - Adding position to marker')
      // Add position to existing marker
      const editingMarker = markers.find(m => m.id === editingMarkerId)
      console.log('🔍 Found editing marker:', editingMarker)
      
      if (editingMarker) {
        // Initialize positions array if it doesn't exist
        const currentPositions = editingMarker.positions || [editingMarker.time]
        
        // Add new position if it's not already there
        if (!currentPositions.includes(playheadPosition)) {
          const updatedPositions = [...currentPositions, playheadPosition].sort((a, b) => a - b)
          
          console.log('🔍 ADDING POSITION TO MARKER:', editingMarker.name, 'at', playheadPosition)
          console.log('🔍 All positions:', updatedPositions)
          
          setMarkers(prev => prev.map(marker => 
            marker.id === editingMarkerId 
              ? { ...marker, positions: updatedPositions }
              : marker
          ))
          
          toast({
            title: "Position Added",
            description: `${editingMarker.name} now has ${updatedPositions.length} positions`,
            variant: "default",
          })
        } else {
          toast({
            title: "Position Already Exists",
            description: `Position ${playheadPosition.toFixed(2)}s already in ${editingMarker.name}`,
            variant: "default",
          })
        }
      } else {
        console.log('🔍 ERROR: Could not find editing marker!')
        setEditingMarkerId(null) // Clear invalid state
      }
    } else {
      console.log('🔍 NO EDIT MODE - Creating new marker')
      // Create new marker
      const newMarker: Marker = {
        id: `marker-${Date.now()}`,
        time: playheadPosition,
        name: `Marker ${markers.length + 1}`,
        category: 'General',
        positions: [playheadPosition] // Initialize with first position
      }
      setMarkers(prev => [...prev, newMarker])
      toast({
        title: "New Marker Created",
        description: `New marker created at ${playheadPosition.toFixed(2)}s`,
        variant: "default",
      })
    }
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
        addMarkerToSelection()
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
      
      // Continuous marker editing
      if (editingMarkerId) {
        if (e.code === 'Escape') {
          e.preventDefault()
          stopEditingMarker()
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
  }, [playheadPosition, editingMarker, editingMarkerId, showCategoryInput, newCategoryName, markers, selectedCategory, zoom, verticalZoom, togglePlayback, addMarker, addMarkerToSelection, jumpToMarker, saveMarkerEdit, cancelMarkerEdit, stopEditingMarker, addCustomCategory, setShowCategoryInput, setNewCategoryName, setZoom, setVerticalZoom])
  
  return (
    <div className="min-h-screen bg-[#141414] text-white">
      {/* Mobile-optimized Header */}
      <div className="bg-[#141414] border-b border-gray-700 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-white truncate">Audio Science Lab</h1>
              <p className="text-xs sm:text-sm text-gray-400">Professional Waveform Analysis & Editing Suite</p>
              {audioFile && (
                <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <span className="text-xs text-gray-500">Current File:</span>
                  <span className="text-xs sm:text-sm text-blue-400 font-mono bg-blue-900/20 px-2 py-1 rounded border border-blue-800 truncate">
                    {audioFile.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({duration.toFixed(2)}s • {Math.round((audioFile.size / 1024 / 1024) * 100) / 100}MB)
                  </span>
                </div>
              )}
              {/* Mobile-optimized Debug Info */}
              <div className="mt-1 grid grid-cols-2 sm:flex sm:items-center sm:gap-2 text-xs text-gray-400">
                <span>Audio: {audioRef.current ? '✓' : '✗'}</span>
                <span>Playing: {isPlaying ? '✓' : '✗'}</span>
                <span>Time: {currentTime.toFixed(2)}s</span>
                <span>Duration: {totalDuration.toFixed(2)}s</span>
                <span>BPM: {bpm}</span>
                <span>Bars: {Math.ceil(totalDuration / (60 / bpm * 4))}</span>
                <span>Waveform: {waveformData.length} points</span>
                <span>Offset: {waveformOffset.toFixed(0)}px</span>
                <span>Saved: {projectData ? '✓' : '✗'}</span>
                {duplicateWave && (
                  <span className="text-blue-400 col-span-2 sm:col-span-1">
                    Dup: {duplicateWave.isReversed ? 'Rev' : 'Norm'} | Main: {isDuplicateMain ? 'Dup' : 'Orig'} | Mode: {playBothMode ? 'Both' : 'Single'}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileSelect}
                className="hidden"
                id="audio-file-input"
              />
              <label htmlFor="audio-file-input">
                <Button variant="outline" className="cursor-pointer border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white text-xs sm:text-sm">
                  <span className="hidden sm:inline">Load Audio</span>
                  <span className="sm:hidden">Load</span>
                </Button>
              </label>
              <Button 
                variant="outline" 
                className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white text-xs sm:text-sm"
                onClick={() => {
                  setShowLibrary(true)
                  fetchAudioLibrary()
                }}
              >
                Library
              </Button>
              <Button 
                variant="outline" 
                className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                onClick={saveProject}
                disabled={!audioFile}
                title="Save project (waveform position, markers, etc.)"
              >
                <Save className="w-4 h-4" />
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
      
      {/* Mobile-optimized Toolbar */}
      <div className="bg-[#141414] border-b border-gray-700 p-2">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          {/* Mobile-optimized Playback Controls */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
            <Button
              size="sm"
              onClick={togglePlayback}
              disabled={!audioFile}
              className="bg-black text-white font-bold hover:bg-gray-900 transition-colors border-none flex-shrink-0"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPlayheadPosition(0)}
              disabled={!audioFile}
              className="bg-gray-800 text-white font-bold hover:bg-gray-700 transition-colors border-gray-600 flex-shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={togglePlayBothMode}
              disabled={!duplicateWave}
              className={`font-bold transition-colors border-gray-600 flex-shrink-0 ${
                playBothMode 
                  ? 'bg-green-800 text-white hover:bg-green-700' 
                  : 'bg-gray-800 text-white hover:bg-gray-700'
              }`}
              title={playBothMode ? "Currently playing both waves - click to play original only" : "Click to play both waves simultaneously"}
            >
              <Music className="w-4 h-4" />
              <span className="ml-1 text-xs">{playBothMode ? 'Both' : 'Single'}</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={swapMainWave}
              disabled={!duplicateWave}
              className={`font-bold transition-colors border-gray-600 flex-shrink-0 ${
                isDuplicateMain 
                  ? 'bg-blue-800 text-white hover:bg-blue-700' 
                  : 'bg-gray-800 text-white hover:bg-gray-700'
              }`}
              title={`Click to swap main wave. Current: ${isDuplicateMain ? 'Duplicate' : 'Original'} (editing affects this wave)`}
            >
              <Layers className="w-4 h-4" />
              <span className="ml-1 text-xs">{isDuplicateMain ? 'Dup' : 'Orig'}</span>
            </Button>
          </div>
          
          {/* Mobile-optimized Tools */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2 sm:pb-0">
            <Button
              size="sm"
              variant={activeTool === 'select' ? 'default' : 'outline'}
              onClick={() => setActiveTool(activeTool === 'select' ? 'select' : 'select')}
              className={`flex-shrink-0 ${activeTool === 'select' 
                ? 'bg-black text-white font-bold hover:bg-gray-900 transition-colors border-none' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500'
              }`}
              title="Select tool (default)"
            >
              <Target className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={activeTool === 'cut' ? 'default' : 'outline'}
              onClick={() => setActiveTool(activeTool === 'cut' ? 'select' : 'cut')}
              className={`flex-shrink-0 ${activeTool === 'cut' 
                ? 'bg-black text-white font-bold hover:bg-gray-900 transition-colors border-none' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500'
              }`}
              title={activeTool === 'cut' ? 'Click to turn off cut mode' : 'Click to enable cut mode'}
            >
              <Scissors className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={activeTool === 'fade' ? 'default' : 'outline'}
              onClick={() => setActiveTool(activeTool === 'fade' ? 'select' : 'fade')}
              className={`flex-shrink-0 ${activeTool === 'fade' 
                ? 'bg-black text-white font-bold hover:bg-gray-900 transition-colors border-none' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500'
              }`}
              title={activeTool === 'fade' ? 'Click to turn off fade mode' : 'Click to enable fade mode'}
            >
              <BarChart3 className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={activeTool === 'marker' ? 'default' : 'outline'}
              onClick={() => setActiveTool(activeTool === 'marker' ? 'select' : 'marker')}
              className={`flex-shrink-0 ${activeTool === 'marker' 
                ? 'bg-black text-white font-bold hover:bg-gray-900 transition-colors border-none' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500'
              }`}
              title={activeTool === 'marker' ? 'Click to turn off marker mode' : 'Click to enable marker mode'}
            >
              <MapPin className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={activeTool === 'region' ? 'default' : 'outline'}
              onClick={() => setActiveTool(activeTool === 'region' ? 'select' : 'region')}
              className={`flex-shrink-0 ${activeTool === 'region' 
                ? 'bg-black text-white font-bold hover:bg-gray-900 transition-colors border-none' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500'
              }`}
              title={activeTool === 'region' ? 'Click to turn off region mode' : 'Click to enable region mode'}
            >
              <Type className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={activeTool === 'drag' ? 'default' : 'outline'}
              onClick={() => setActiveTool(activeTool === 'drag' ? 'select' : 'drag')}
              className={`flex-shrink-0 ${activeTool === 'drag' 
                ? 'bg-black text-white font-bold hover:bg-gray-900 transition-colors border-none' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500'
              }`}
              title={activeTool === 'drag' ? 'Click to turn off drag mode' : 'Click to enable drag mode'}
            >
              <Move className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Mobile-optimized Edit Operations */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2 sm:pb-0">
            <Button
              size="sm"
              variant="outline"
              onClick={cutSelection}
              disabled={selectionStart === null || selectionEnd === null}
              className="bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500 flex-shrink-0"
            >
              <Scissors className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={copySelection}
              disabled={selectionStart === null || selectionEnd === null}
              className="bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500 flex-shrink-0"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={pasteAtPlayhead}
              disabled={!clipboard}
              className="bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500 flex-shrink-0"
            >
              <Clipboard className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={undo}
              disabled={historyIndex < 0}
              className="bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500 flex-shrink-0"
            >
              <Undo className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={redo}
              disabled={historyIndex >= editHistory.length - 1}
              className="bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500 flex-shrink-0"
            >
              <Redo className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Mobile-optimized Grid Controls */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={snapToGrid ? "default" : "outline"}
              onClick={() => setSnapToGrid(!snapToGrid)}
              className={`flex-shrink-0 ${snapToGrid 
                ? 'bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors border-none' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500'
              }`}
              title={`Snap to Grid: ${snapToGrid ? 'ON' : 'OFF'}`}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Mobile-optimized Zoom Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 overflow-x-auto pb-2 sm:pb-0">
            <div className="flex items-center gap-2 flex-shrink-0">
              <Label className="text-xs text-gray-300 min-w-[1rem]">H:</Label>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    console.log('🔍 ZOOM OUT CLICKED - current zoom:', zoom)
                    const newZoom = Math.max(0.1, zoom - 0.2)
                    console.log('🔍 SETTING ZOOM TO:', newZoom)
                    setZoom(newZoom)
                    setTimeout(() => {
                      console.log('🔍 MANUAL REDRAW AFTER ZOOM OUT')
                      drawWaveform()
                    }, 0)
                  }}
                  className="bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Slider
                  value={[zoom]}
                  onValueChange={(value) => {
                    console.log('🔍 ZOOM SLIDER CHANGED - new value:', value[0])
                    setZoom(value[0])
                    setTimeout(() => {
                      console.log('🔍 MANUAL REDRAW AFTER SLIDER')
                      drawWaveform()
                    }, 0)
                  }}
                  min={0.1}
                  max={5}
                  step={0.1}
                  className="w-16 sm:w-20"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    console.log('🔍 ZOOM IN CLICKED - current zoom:', zoom)
                    const newZoom = Math.min(5, zoom + 0.2)
                    console.log('🔍 SETTING ZOOM TO:', newZoom)
                    setZoom(newZoom)
                    setTimeout(() => {
                      console.log('🔍 MANUAL REDRAW AFTER ZOOM IN')
                      drawWaveform()
                    }, 0)
                  }}
                  className="bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <span className="text-xs min-w-[2rem] sm:min-w-[3rem] text-gray-300">{Math.round(zoom * 100)}%</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <Label className="text-xs text-gray-300 min-w-[1rem]">V:</Label>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setVerticalZoom(Math.max(0.1, verticalZoom - 0.2))
                    setTimeout(() => drawWaveform(), 0)
                  }}
                  className="bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Slider
                  value={[verticalZoom]}
                  onValueChange={(value) => {
                    setVerticalZoom(value[0])
                    setTimeout(() => drawWaveform(), 0)
                  }}
                  min={0.1}
                  max={5}
                  step={0.1}
                  className="w-16 sm:w-20"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setVerticalZoom(Math.min(5, verticalZoom + 0.2))
                    setTimeout(() => drawWaveform(), 0)
                  }}
                  className="bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <span className="text-xs min-w-[2rem] sm:min-w-[3rem] text-gray-300">{Math.round(verticalZoom * 100)}%</span>
              </div>
            </div>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setWaveformOffset(0)
                console.log('🔍 WAVEFORM OFFSET RESET')
              }}
              className="bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500 flex-shrink-0"
            >
              <span className="hidden sm:inline">Reset Wave</span>
              <span className="sm:hidden">Reset</span>
            </Button>
            
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
              className="bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500 flex-shrink-0"
            >
              <span className="hidden sm:inline">Reset All</span>
              <span className="sm:hidden">Reset</span>
            </Button>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex h-[calc(100vh-120px)]">
        {/* Left Side - Transport, Waveform, and Toolbar */}
        <div className="flex-1 flex flex-col">
          {/* Mobile-optimized Transport Controls - Above Waveform */}
          <div className="bg-[#0f0f0f] border-b border-gray-600 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-8">
            {/* Mobile-optimized Left Section - Transport Info */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8">
                <div className="flex items-center gap-2 sm:gap-4">
                  <span className="text-gray-400 text-xs sm:text-sm font-medium min-w-[2rem] sm:min-w-[3rem]">Time:</span>
                  <span className="text-white text-xs sm:text-sm font-mono bg-[#1a1a1a] px-2 sm:px-3 py-1 rounded border border-gray-600 min-w-[5rem] sm:min-w-[7rem] text-center">
                    {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
                  </span>
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                  <span className="text-gray-400 text-xs sm:text-sm font-medium min-w-[2rem] sm:min-w-[3rem]">BPM:</span>
                  <Input
                    type="number"
                    value={bpm}
                    onChange={(e) => {
                      const newBpm = parseInt(e.target.value) || 120
                      console.log('🔍 BPM CHANGED - old:', bpm, 'new:', newBpm)
                      setBpm(newBpm)
                      
                      // Update BPM in the database if we have a current library item
                      if (currentLibraryItem) {
                        updateBPMInLibrary(newBpm)
                      }
                    }}
                    className="w-16 sm:w-20 h-8 text-xs sm:text-sm bg-[#1a1a1a] border-gray-600 text-white font-mono text-center"
                  />
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                  <span className="text-gray-400 text-xs sm:text-sm font-medium min-w-[2rem] sm:min-w-[3rem]">Grid:</span>
                  <select
                    value={gridDivision}
                    onChange={(e) => setGridDivision(parseInt(e.target.value))}
                    className="w-16 sm:w-20 h-8 text-xs sm:text-sm bg-[#1a1a1a] border border-gray-600 rounded text-white font-mono text-center"
                  >
                    <option value={4}>1/4</option>
                    <option value={8}>1/8</option>
                    <option value={16}>1/16</option>
                    <option value={32}>1/32</option>
                  </select>
                </div>
                
                {/* Bars Controls - Like Beat Maker */}
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm font-medium min-w-[3rem]">Bars:</span>
                  <div className="flex gap-1">
                    {[2, 4, 8, 16].map((barCount) => {
                      const stepCount = barCount * 16; // Convert bars to steps (16 steps per bar for 1/16 resolution)
                      const calculatedBars = Math.round((totalDuration / stepDuration) / 4);
                      const isActive = selectedBarCount === barCount;
                      return (
                        <Button
                          key={stepCount}
                          variant={isActive ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setSelectedBarCount(barCount);
                            // Calculate the target duration for this bar count
                            const targetDuration = barCount * 4 * (60 / bpm); // bars * beats/bar * seconds/beat
                            console.log(`Setting bars to ${barCount} (${targetDuration.toFixed(2)}s at ${bpm} BPM)`);
                            
                            // Update the marked bars to show the selected bar count
                            const allBars = Array.from({ length: barCount }, (_, i) => i + 1);
                            setMarkedBars(allBars);
                            console.log(`Updated marked bars to show ${barCount} bars`);
                            
                            // Update the display duration to show the full bar count, even if audio is shorter
                            setDisplayDuration(targetDuration);
                            console.log(`Updated display duration to ${targetDuration.toFixed(2)}s to show ${barCount} bars`);
                          }}
                          className="w-8 h-8 p-0 text-xs"
                          title={`${barCount} bars (${(barCount * 4 * (60 / bpm)).toFixed(2)}s at ${bpm} BPM)`}
                        >
                          {barCount}
                        </Button>
                      );
                    })}
                  </div>
                </div>
                
                {/* Mobile-optimized Half Time Button - Like Fruity Loops Half Time Plugin */}
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs sm:text-sm font-medium min-w-[2rem] sm:min-w-[3rem]">Speed:</span>
                  <Button
                    variant={isHalfTime ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setIsHalfTime(!isHalfTime);
                      if (!isHalfTime) {
                        // Enable halftime - slow down playback rate
                        setPlaybackRate(halfTimeRatio);
                        console.log(`🔍 HALFTIME ENABLED - playback rate set to ${halfTimeRatio}x`);
                      } else {
                        // Disable halftime - restore normal playback rate
                        setPlaybackRate(1.0);
                        console.log('🔍 HALFTIME DISABLED - playback rate restored to 1.0x');
                      }
                    }}
                    className="px-2 sm:px-3 py-1 text-xs font-mono"
                    title={isHalfTime ? `Disable Half Time (restore normal speed)` : `Enable Half Time (slow down to ${halfTimeRatio}x speed)`}
                  >
                    {isHalfTime ? `${halfTimeRatio}x ✓` : `${halfTimeRatio}x`}
                  </Button>
                  <select
                    value={halfTimeRatio}
                    onChange={(e) => {
                      const newRatio = parseFloat(e.target.value);
                      setHalfTimeRatio(newRatio);
                      if (isHalfTime) {
                        // Update playback rate immediately if halftime is active
                        setPlaybackRate(newRatio);
                        console.log(`🔍 HALFTIME RATIO CHANGED - playback rate updated to ${newRatio}x`);
                      }
                    }}
                    className="w-12 sm:w-16 h-8 text-xs bg-[#1a1a1a] border border-gray-600 rounded text-white font-mono text-center"
                    title="Select halftime ratio"
                  >
                    <option value={0.25}>1/4</option>
                    <option value={0.5}>1/2</option>
                    <option value={0.75}>3/4</option>
                    <option value={2.0}>2x</option>
                    <option value={4.0}>4x</option>
                  </select>
                </div>
            </div>
            
            {/* Mobile-optimized Center Section - Playback Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8">
                <div className="flex items-center gap-2 sm:gap-4">
                <Label className="text-gray-400 text-xs sm:text-sm font-medium min-w-[2rem] sm:min-w-[3rem]">Rate:</Label>
                <Slider
                  value={[playbackRate]}
                  onValueChange={(value) => setPlaybackRate(value[0])}
                  min={0.1}
                  max={4}
                  step={0.1}
                    className="w-24 sm:w-32"
                />
                  <span className="text-white text-xs sm:text-sm font-mono min-w-[2rem] sm:min-w-[3rem] bg-[#1a1a1a] px-2 py-1 rounded border border-gray-600 text-center">
                  {playbackRate}x
                </span>
              </div>
                <div className="flex items-center gap-2 sm:gap-4">
                <Label className="text-gray-400 text-xs sm:text-sm font-medium min-w-[3rem] sm:min-w-[4rem]">Volume:</Label>
                <Slider
                  value={[volume]}
                  onValueChange={(value) => setVolume(value[0])}
                  min={0}
                  max={1}
                  step={0.01}
                    className="w-24 sm:w-32"
                />
                  <span className="text-white text-xs sm:text-sm font-mono min-w-[2rem] sm:min-w-[3rem] bg-[#1a1a1a] px-2 py-1 rounded border border-gray-600 text-center">
                  {Math.round(volume * 100)}%
                </span>
              </div>
            </div>
            
            {/* Mobile-optimized Right Section - Status Information */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-gray-400 text-xs sm:text-sm font-medium min-w-[2rem] sm:min-w-[3rem]">Status:</span>
                  <span className={`text-xs sm:text-sm font-mono px-2 sm:px-3 py-1 rounded border min-w-[3rem] sm:min-w-[4rem] text-center ${
                  isPlaying 
                    ? 'text-green-400 border-green-400 bg-green-900/20' 
                    : 'text-gray-400 border-gray-600 bg-[#1a1a1a]'
                }`}>
                  {isPlaying ? 'LIVE' : 'STOPPED'}
                </span>
              </div>
                <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-gray-400 text-xs sm:text-sm font-medium min-w-[3rem] sm:min-w-[4rem]">Markers:</span>
                  <span className="text-blue-400 text-xs sm:text-sm font-mono bg-[#1a1a1a] px-2 sm:px-3 py-1 rounded border border-blue-600 min-w-[1.5rem] sm:min-w-[2rem] text-center">
                  {markers.length}
                </span>
              </div>
                <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-gray-400 text-xs sm:text-sm font-medium min-w-[3rem] sm:min-w-[4rem]">Regions:</span>
                  <span className="text-purple-400 text-xs sm:text-sm font-mono bg-[#1a1a1a] px-2 sm:px-3 py-1 rounded border border-purple-600 min-w-[1.5rem] sm:min-w-[2rem] text-center">
                  {regions.length}
                </span>
              </div>
              </div>
            </div>
          </div>
          
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
              className={`w-full h-full ${
                activeTool === 'drag' ? 'cursor-grab active:cursor-grabbing' : 
                activeTool === 'select' ? 'cursor-crosshair' :
                activeTool === 'marker' ? 'cursor-pointer' :
                activeTool === 'region' ? 'cursor-crosshair' :
                'cursor-crosshair'
              }`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={(e) => {
                e.preventDefault();
                const touch = e.touches[0];
                const rect = canvasRef.current?.getBoundingClientRect();
                if (rect) {
                  const x = touch.clientX - rect.left;
                  const y = touch.clientY - rect.top;
                  const syntheticEvent = {
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    preventDefault: () => e.preventDefault(),
                    target: e.target
                  } as React.MouseEvent;
                  handleMouseDown(syntheticEvent);
                }
              }}
              onTouchMove={(e) => {
                e.preventDefault();
                const touch = e.touches[0];
                const rect = canvasRef.current?.getBoundingClientRect();
                if (rect) {
                  const x = touch.clientX - rect.left;
                  const y = touch.clientY - rect.top;
                  const syntheticEvent = {
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    preventDefault: () => e.preventDefault(),
                    target: e.target
                  } as React.MouseEvent;
                  handleMouseMove(syntheticEvent);
                }
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleMouseUp();
              }}
            />
          )}
        </div>
        
        {/* Mobile-optimized Toolbar - Below Waveform */}
        <div className="bg-[#141414] border-t border-gray-700 p-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            {/* Mobile-optimized Playback Controls */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
              <Button
                size="sm"
                onClick={togglePlayback}
                disabled={!audioFile}
                className="bg-black text-white font-bold hover:bg-gray-900 transition-colors border-none flex-shrink-0"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPlayheadPosition(0)}
                disabled={!audioFile}
                className="bg-gray-800 text-white font-bold hover:bg-gray-700 transition-colors border-gray-600 flex-shrink-0"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Tools */}
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant={activeTool === 'select' ? 'default' : 'outline'}
                onClick={() => setActiveTool(activeTool === 'select' ? 'select' : 'select')}
                className={activeTool === 'select' 
                  ? 'bg-black text-white font-bold hover:bg-gray-900 transition-colors border-none' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500'
                }
                title="Select tool (default)"
              >
                <Target className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={activeTool === 'cut' ? 'default' : 'outline'}
                onClick={() => setActiveTool(activeTool === 'cut' ? 'select' : 'cut')}
                className={activeTool === 'cut' 
                  ? 'bg-black text-white font-bold hover:bg-gray-900 transition-colors border-none' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500'
                }
                title={activeTool === 'cut' ? 'Click to turn off cut mode' : 'Click to enable cut mode'}
              >
                <Scissors className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={activeTool === 'fade' ? 'default' : 'outline'}
                onClick={() => setActiveTool(activeTool === 'fade' ? 'select' : 'fade')}
                className={activeTool === 'fade' 
                  ? 'bg-black text-white font-bold hover:bg-gray-900 transition-colors border-none' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500'
                }
                title={activeTool === 'fade' ? 'Click to turn off fade mode' : 'Click to enable fade mode'}
              >
                <BarChart3 className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={activeTool === 'marker' ? 'default' : 'outline'}
                onClick={() => setActiveTool(activeTool === 'marker' ? 'select' : 'marker')}
                className={activeTool === 'marker' 
                  ? 'bg-black text-white font-bold hover:bg-gray-900 transition-colors border-none' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500'
                }
                title={activeTool === 'marker' ? 'Click to turn off marker mode' : 'Click to enable marker mode'}
              >
                <MapPin className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={activeTool === 'region' ? 'default' : 'outline'}
                onClick={() => setActiveTool(activeTool === 'region' ? 'select' : 'region')}
                className={activeTool === 'region' 
                  ? 'bg-black text-white font-bold hover:bg-gray-900 transition-colors border-none' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500'
                }
                title={activeTool === 'region' ? 'Click to turn off region mode' : 'Click to enable region mode'}
              >
                <Type className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={activeTool === 'drag' ? 'default' : 'outline'}
                onClick={() => setActiveTool(activeTool === 'drag' ? 'select' : 'drag')}
                className={activeTool === 'drag' 
                  ? 'bg-black text-white font-bold hover:bg-gray-900 transition-colors border-none' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500'
                }
                title={activeTool === 'drag' ? 'Click to turn off drag mode' : 'Click to enable drag mode'}
              >
                <Move className="w-4 h-4" />
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
              <Button
                size="sm"
                variant={snapToGrid ? "default" : "outline"}
                onClick={() => setSnapToGrid(!snapToGrid)}
                className={snapToGrid 
                  ? 'bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors border-none' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500'
                }
                title={`Snap to Grid: ${snapToGrid ? 'ON' : 'OFF'}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowDetailedGrid(!showDetailedGrid)}
                className={showDetailedGrid 
                  ? 'bg-purple-600 text-white font-bold hover:bg-purple-700 transition-colors border-none' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500'
                }
                title={`Detailed Grid: ${showDetailedGrid ? 'ON' : 'OFF'} (shows finer subdivisions)`}
              >
                <Grid3X3 className="w-4 h-4" />
                <span className="ml-1 text-xs">+</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={addBarTracker}
                disabled={!audioFile}
                className="bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500"
                title="Add bar tracker marker with sub-bar tracking"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="ml-1 text-xs">Bar Tracker</span>
              </Button>
              <Button
                size="sm"
                variant={markedBars.length > 0 ? "default" : "outline"}
                onClick={() => {
                  if (markedBars.length > 0) {
                    setMarkedBars([])
                    setMarkedSubBars([])
                  } else {
                    // Use the EXACT same math as sequencer grid
                    const secondsPerBeat = 60 / bpm
                    const gridDivision = 16 // 1/16 resolution like sequencer
                    const stepDuration = secondsPerBeat / (gridDivision / 4)
                    const loopBars = Math.round((totalDuration / stepDuration) / 4)
                    const allBars = Array.from({ length: loopBars }, (_, i) => i + 1)
                    setMarkedBars(allBars)
                    const totalBeats = loopBars * 4
                    const allSubBars = Array.from({ length: totalBeats }, (_, i) => i + 1)
                    setMarkedSubBars(allSubBars)
                  }
                }}
                disabled={!audioFile}
                className={markedBars.length > 0 
                  ? 'bg-green-600 text-white font-bold hover:bg-green-700 transition-colors border-none' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500'
                }
                title={markedBars.length > 0 ? "Hide bars" : "Show bars"}
              >
                <BarChart3 className="w-4 h-4" />
                <span className="ml-1 text-xs">{markedBars.length > 0 ? 'Hide Bars' : 'Show Bars'}</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={duplicateWaveTrack}
                disabled={!audioFile}
                className="bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500"
                title="Duplicate wave track"
              >
                <Copy className="w-4 h-4" />
                <span className="ml-1 text-xs">Duplicate</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={reverseDuplicateWave}
                disabled={!duplicateWave}
                className="bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500"
                title="Reverse duplicate wave"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="ml-1 text-xs">Reverse</span>
              </Button>
            </div>
            
            {/* Zoom Controls */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-gray-300 min-w-[1rem]">H:</Label>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      console.log('🔍 ZOOM OUT CLICKED - current zoom:', zoom)
                      const newZoom = Math.max(0.1, zoom - 0.2)
                      console.log('🔍 SETTING ZOOM TO:', newZoom)
                      setZoom(newZoom)
                      setTimeout(() => {
                        console.log('🔍 MANUAL REDRAW AFTER ZOOM OUT')
                        drawWaveform()
                      }, 0)
                    }}
                    className="bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <Slider
                    value={[zoom]}
                    onValueChange={(value) => {
                      console.log('🔍 ZOOM SLIDER CHANGED - new value:', value[0])
                      setZoom(value[0])
                      setTimeout(() => {
                        console.log('🔍 MANUAL REDRAW AFTER SLIDER')
                        drawWaveform()
                      }, 0)
                    }}
                    min={0.1}
                    max={5}
                    step={0.1}
                    className="w-20"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      console.log('🔍 ZOOM IN CLICKED - current zoom:', zoom)
                      const newZoom = Math.min(5, zoom + 0.2)
                      console.log('🔍 SETTING ZOOM TO:', newZoom)
                      setZoom(newZoom)
                      setTimeout(() => {
                        console.log('🔍 MANUAL REDRAW AFTER ZOOM IN')
                        drawWaveform()
                      }, 0)
                    }}
                    className="bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <span className="text-xs min-w-[3rem] text-gray-300">{Math.round(zoom * 100)}%</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    console.log('🔍 FIT TO VIEW CLICKED')
                    setZoom(1.0) // Reset zoom to show full waveform
                    setWaveformOffset(0) // Reset offset
                    setTimeout(() => {
                      console.log('🔍 MANUAL REDRAW AFTER FIT TO VIEW')
                      drawWaveform()
                    }, 0)
                  }}
                  className="bg-blue-600 text-white hover:bg-blue-700 border-blue-500 ml-2"
                  title="Fit waveform to view"
                >
                  <Maximize2 className="w-4 h-4" />
                  <span className="ml-1 text-xs">Fit</span>
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <Label className="text-xs text-gray-300 min-w-[1rem]">V:</Label>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setVerticalZoom(Math.max(0.1, verticalZoom - 0.2))
                      setTimeout(() => drawWaveform(), 0)
                    }}
                    className="bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <Slider
                    value={[verticalZoom]}
                    onValueChange={(value) => {
                      setVerticalZoom(value[0])
                      setTimeout(() => drawWaveform(), 0)
                    }}
                    min={0.1}
                    max={5}
                    step={0.1}
                    className="w-20"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setVerticalZoom(Math.min(5, verticalZoom + 0.2))
                      setTimeout(() => drawWaveform(), 0)
                    }}
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
                  setWaveformOffset(0)
                  console.log('🔍 WAVEFORM OFFSET RESET')
                }}
                className="bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500"
              >
                Reset Wave
              </Button>
              
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
              
              <Button
                size="sm"
                variant="outline"
                onClick={saveProject}
                className="bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500"
              >
                <Save className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Sidebar */}
        <div className="w-[1000px] bg-[#141414] border-l border-gray-700 overflow-y-auto">
          {/* Markers */}
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Temporal Markers</h3>
              <div className="flex items-center gap-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="text-sm bg-[#1a1a1a] border border-gray-600 rounded text-white px-3 py-1"
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
                  className="w-8 h-8 p-0 bg-[#1a1a1a] text-gray-300 hover:bg-gray-600 border-gray-500"
                >
                  +
                </Button>
              </div>
            </div>
            
            {/* Edit mode indicator and shuffle button */}
            <div className="flex items-center gap-2 mb-4">
              {editingMarkerId && (
                <div className="flex items-center gap-2 px-3 py-1 bg-orange-600 text-white rounded text-sm font-medium">
                  <span>🎯 Editing Mode</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={stopEditingMarker}
                    className="h-6 px-2 text-xs bg-red-600 hover:bg-red-700 text-white"
                  >
                    Stop
                  </Button>
                </div>
              )}
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleShuffle('markers')}
                disabled={markers.length === 0}
                className="bg-purple-600 text-white hover:bg-purple-700 border-purple-500"
              >
                🔀 Shuffle Markers
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleShuffle('grid')}
                disabled={!bpm}
                className="bg-blue-600 text-white hover:bg-blue-700 border-blue-500"
              >
                🎵 Shuffle Grid
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={magicShuffle}
                disabled={!waveformData.length}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 border-purple-500"
              >
                ✨ Magic Shuffle
              </Button>
            </div>

            {/* Waveform Selection Actions */}
            {getSelectedSegment() && (
              <div className="flex items-center gap-2 mt-2 p-2 bg-black rounded">
                <span className="text-sm font-medium text-white">
                  Selected: {getSelectedSegment()?.duration.toFixed(2)}s
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={deleteSelectedSegment}
                  className="bg-red-600 text-white hover:bg-red-700 border-red-500"
                >
                  🗑️ Delete
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copySelectedSegment}
                  className="bg-green-600 text-white hover:bg-green-700 border-green-500"
                >
                  📋 Copy
                </Button>
                                <Button
                  size="sm"
                  variant="outline"
                  onClick={shuffleSelectedSegment}
                  className="bg-purple-600 text-white hover:bg-purple-700 border-purple-500"
                >
                  🔀 Shuffle
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={magicShuffleSelectedSegment}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 border-purple-500"
                >
                  ✨ Magic
                </Button>
                
 
                <Button
                  size="sm"
                  variant="outline"
                  onClick={clearWaveSelection}
                  className="bg-gray-600 text-white hover:bg-gray-700 border-gray-500"
                >
                  ✕ Clear
                </Button>
              </div>
            )}

            {/* Paste Button */}
            {clipboardSegment && (
              <div className="flex items-center gap-2 mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={pasteSegment}
                  className="bg-blue-600 text-white hover:bg-blue-700 border-blue-500"
                >
                  📋 Paste at Playhead
                </Button>
              </div>
            )}
            
            {showCategoryInput && (
              <div className="mb-4 p-4 bg-[#1a1a1a] rounded border border-gray-600">
                <div className="flex items-center gap-2">
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Category name"
                    className="h-8 text-sm bg-[#141414] border-gray-600 text-white"
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
                    className="h-8 px-3 text-sm bg-[#141414] text-gray-300 hover:bg-gray-600 border-gray-500"
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
                    className="h-8 px-3 text-sm bg-[#141414] text-gray-300 hover:bg-gray-600 border-gray-500"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            
            <div className="space-y-3 max-h-64 overflow-y-auto overflow-x-hidden">
              {getFilteredMarkers().map((marker) => (
                <div 
                  key={marker.id} 
                  className={`flex items-center justify-between p-4 rounded border min-w-0 ${
                    editingMarkerId === marker.id
                      ? 'bg-orange-900/30 border-orange-500' 
                      : selectedMarkers.has(marker.id) 
                        ? 'bg-blue-900/30 border-blue-500' 
                        : 'bg-[#1a1a1a] border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <MapPin className="w-5 h-5 text-green-400" />
                    
                    {editingMarker === marker.id ? (
                      // Editing mode
                      <div className="flex items-center gap-6 flex-1">
                        <div className="flex items-center gap-3 flex-1">
                          <Label className="text-sm text-gray-400 whitespace-nowrap">Name:</Label>
                          <Input
                            value={editingMarkerName}
                            onChange={(e) => setEditingMarkerName(e.target.value)}
                            className="h-8 text-sm flex-1 bg-[#141414] border-gray-600 text-white"
                            placeholder="Marker name"
                            autoFocus
                          />
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm text-gray-400 whitespace-nowrap">Time:</Label>
                            <Input
                              value={editingMarkerTime}
                              onChange={(e) => setEditingMarkerTime(e.target.value)}
                              className="h-8 text-sm w-20 bg-[#141414] border-gray-600 text-white"
                              placeholder="Time"
                              type="number"
                              step="0.01"
                              min="0"
                              max={totalDuration}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-sm text-gray-400 whitespace-nowrap">Step:</Label>
                            <Input
                              value={editingMarkerStep}
                              onChange={(e) => setEditingMarkerStep(e.target.value)}
                              className="h-8 text-sm w-16 bg-[#141414] border-gray-600 text-white"
                              placeholder="Step"
                              type="number"
                              min="0"
                              max={Math.ceil(totalDuration / stepDuration) - 1}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-sm text-gray-400 whitespace-nowrap">Bar:</Label>
                            <Input
                              value={editingMarkerBar}
                              onChange={(e) => setEditingMarkerBar(e.target.value)}
                              className="h-8 text-sm w-14 bg-[#141414] border-gray-600 text-white"
                              placeholder="Bar"
                              type="number"
                              min="1"
                              max={Math.round((totalDuration / stepDuration) / 4)}
                            />
                          </div>
                          <div className="flex items-center gap-3">
                            <Label className="text-sm text-gray-400 whitespace-nowrap min-w-[4rem]">Category:</Label>
                            <select
                              value={editingMarkerCategory}
                              onChange={(e) => setEditingMarkerCategory(e.target.value)}
                              className="h-8 text-sm w-44 bg-[#141414] border border-gray-600 rounded px-2 text-white"
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
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              console.log('🔍 ===== EDIT MODE BUTTON CLICKED =====')
                              console.log('🔍 Marker ID:', marker.id)
                              console.log('🔍 Marker Name:', marker.name)
                              console.log('🔍 Current editingMarkerId before setting:', editingMarkerId)
                              
                              setEditingMarkerId(marker.id)
                              setSelectedMarkers(new Set([marker.id]))
                              
                              console.log('🔍 Set editingMarkerId to:', marker.id)
                              
                              // Test: Log the current state after setting
                              setTimeout(() => {
                                console.log('🔍 TEST: Current editingMarkerId after setting:', editingMarkerId)
                              }, 100)
                              
                              toast({
                                title: "Edit Mode Activated",
                                description: `Now editing ${marker.name}. Press 'M' to move it, 'Escape' to stop.`,
                                variant: "default",
                              })
                            }}
                            className={`h-6 px-2 text-xs ${
                              editingMarkerId === marker.id 
                                ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                                : 'bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-500'
                            }`}
                          >
                            Edit Mode
                          </Button>
                          <span 
                            className="text-base text-white cursor-pointer hover:text-blue-300 font-medium min-w-0 flex-1 truncate"
                            onClick={() => startEditingMarker(marker)}
                            title="Click to edit name"
                          >
                            {marker.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span 
                            className="text-sm text-gray-400 font-mono cursor-pointer hover:text-blue-300"
                            onClick={() => startEditingMarker(marker)}
                            title="Click to edit time"
                          >
                            {marker.time.toFixed(2)}s
                          </span>
                          <span className="text-sm text-gray-500">|</span>
                          <span 
                            className="text-sm text-gray-400 font-mono cursor-pointer hover:text-blue-300"
                            onClick={() => startEditingMarker(marker)}
                            title="Click to edit step"
                          >
                            Step {timeToStep(marker.time)}
                          </span>
                          <span className="text-sm text-gray-500">|</span>
                          <span 
                            className="text-sm text-gray-400 font-mono cursor-pointer hover:text-blue-300"
                            onClick={() => startEditingMarker(marker)}
                            title="Click to edit bar"
                          >
                            Bar {timeToBar(marker.time)}
                          </span>
                          <span className="text-sm text-gray-500">|</span>
                          <span 
                            className={`text-sm px-3 py-1 rounded cursor-pointer hover:opacity-80 ${getCategoryColor(marker.category)}`}
                            onClick={() => startEditingMarker(marker)}
                            title="Click to edit category"
                          >
                            {marker.category}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 ml-8">
                    {editingMarker === marker.id ? (
                      // Editing buttons
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={saveMarkerEdit}
                          className="h-8 px-4 text-sm bg-green-600 hover:bg-green-700"
                        >
                          ✓
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelMarkerEdit}
                          className="h-8 px-4 text-sm bg-red-600 hover:bg-red-700"
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
                          className="h-8 px-4 text-sm bg-[#141414] text-gray-300 hover:bg-gray-600 border-gray-500"
                        >
                          Jump
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeMarker(marker.id)}
                          className="h-8 px-4 text-sm text-red-400 hover:text-red-300 bg-[#141414] border-gray-500"
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
              onClick={addMarkerToSelection}
              className="w-full mt-4 bg-[#1a1a1a] text-gray-300 hover:bg-gray-600 border-gray-500 h-10 text-base font-medium"
            >
              {editingMarkerId 
                ? `Add Position to Marker (M) - ${playheadPosition.toFixed(2)}s`
                : 'Add Marker (M)'
              }
            </Button>
            
            <div className="text-sm text-gray-400 mt-3 text-center">
              Ctrl+J: Previous | Ctrl+K: Next | M: Add | Enter: Save | Esc: Cancel
            </div>
          </div>
          
          {/* Regions */}
          <div className="p-6">
            <h3 className="text-lg font-bold mb-4 text-white">Regions</h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {regions.map(region => (
                <div key={region.id} className="flex items-center justify-between p-3 bg-[#1a1a1a] border border-gray-600 text-gray-300 rounded">
                  <span className="text-white font-medium">{region.name}</span>
                  <span className="text-gray-400 text-sm">{(region.endTime - region.startTime).toFixed(2)}s</span>
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
        onLoadedData={() => {
          console.log('🔍 AUDIO LOADED - duration:', audioRef.current?.duration, 'src:', audioRef.current?.src)
        }}
        onError={(e) => {
          console.error('🔍 AUDIO ERROR:', e)
        }}
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