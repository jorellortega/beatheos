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
  Square,
  Move
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
  
  // Update grid lines when BPM or division changes
  useEffect(() => {
    console.log('🔍 UPDATING GRID LINES - BPM:', bpm, 'gridDivision:', gridDivision, 'totalDuration:', totalDuration, 'stepDuration:', stepDuration)
    // Calculate total number of steps based on duration
    const totalSteps = Math.ceil(totalDuration / stepDuration)
    const mainLines = Array.from({ length: totalSteps + 1 }, (_, i) => i * stepDuration)
    
    if (showDetailedGrid) {
      // Add detailed grid lines (finer subdivisions)
      const detailedDivision = Math.min(gridDivision * 2, 32) // 1/8, 1/16, 1/32, etc.
      const detailedStepDuration = 60 / bpm / detailedDivision
      const detailedTotalSteps = Math.ceil(totalDuration / detailedStepDuration)
      const detailedLines = Array.from({ length: detailedTotalSteps + 1 }, (_, i) => i * detailedStepDuration)
      
      // Combine main grid lines with detailed grid lines, avoiding duplicates
      const allLines = [...new Set([...mainLines, ...detailedLines])].sort((a, b) => a - b)
      console.log('🔍 DETAILED GRID LINES CREATED:', allLines.length, 'lines (main:', mainLines.length, 'detailed:', detailedLines.length, ')')
      setGridLines(allLines)
    } else {
      console.log('🔍 GRID LINES CREATED:', mainLines.length, 'lines for', totalSteps, 'steps')
      setGridLines(mainLines)
    }
  }, [bpm, gridDivision, totalDuration, stepDuration, showDetailedGrid])
  
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
    
    // Draw grid
    if (showGrid) {
      console.log('🔍 DRAWING GRID - zoom:', zoom, 'effectiveWidth:', effectiveWidth, 'rect.width:', rect.width, 'gridLines:', gridLines.length)
      ctx.strokeStyle = '#333'
      ctx.lineWidth = 1
      ctx.setLineDash([2, 2])
      
      gridLines.forEach((time, index) => {
        const x = (time / totalDuration) * effectiveWidth
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
          
          // Draw bar number (every 4 steps, starting from step 0)
          if (index % 4 === 0) {
            const barNumber = Math.floor(index / 4) + 1
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
      ctx.lineWidth = 2
      ctx.setLineDash([])
      
      markedBars.forEach(barNumber => {
        const barTime = barToTime(barNumber)
        const barX = (barTime / totalDuration) * effectiveWidth
        
        if (barX >= 0 && barX <= effectiveWidth) {
          ctx.beginPath()
          ctx.moveTo(barX, 0)
          ctx.lineTo(barX, rect.height)
          ctx.stroke()
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
        const beatX = (beatTime / totalDuration) * effectiveWidth
        
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
          const x = (point.x / totalDuration) * effectiveWidth + waveformOffset
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
          const x = (point.x / totalDuration) * effectiveWidth + waveformOffset
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
          const x = (point.x / totalDuration) * effectiveWidth + waveformOffset
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
          const x = (point.x / totalDuration) * effectiveWidth + waveformOffset
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
          const x = (point.x / totalDuration) * effectiveWidth + waveformOffset
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
          const x = (point.x / totalDuration) * effectiveWidth + waveformOffset
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
          const x = (point.x / totalDuration) * effectiveWidth + waveformOffset
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
          const x = (point.x / totalDuration) * effectiveWidth + waveformOffset
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
          const x = (point.x / totalDuration) * effectiveWidth + waveformOffset
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
          const x = (point.x / totalDuration) * effectiveWidth + waveformOffset
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
          const x = (point.x / totalDuration) * effectiveWidth + waveformOffset
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
          const x = (point.x / totalDuration) * effectiveWidth + waveformOffset
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
          const x = (point.x / totalDuration) * effectiveWidth + waveformOffset
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
          const x = (point.x / totalDuration) * effectiveWidth + waveformOffset
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
          const x = (point.x / totalDuration) * effectiveWidth + waveformOffset
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
      const startX = (selectionStart / totalDuration) * effectiveWidth
      const endX = (selectionEnd / totalDuration) * effectiveWidth
      
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
    const playheadX = totalDuration > 0 ? (playheadTime / totalDuration) * effectiveWidth : 0
    console.log('🔍 DRAWING PLAYHEAD - playheadTime:', playheadTime, 'playheadX:', playheadX, 'isPlaying:', isPlaying, 'totalDuration:', totalDuration, 'effectiveWidth:', effectiveWidth)
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
    
    // No need to restore since we're not using ctx.save()
    
  }, [waveformData, duration, totalDuration, showGrid, showWaveform, gridLines, 
      selectionStart, selectionEnd, playheadPosition, currentTime, isPlaying, markers, regions, zoom, verticalZoom, waveformOffset])
  
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
    
    // Calculate time based on zoomed canvas width and total duration
    const time = (x / zoom) * (totalDuration / rect.width)
    
    // Calculate current playhead position
    const playheadTime = isPlaying ? currentTime : playheadPosition
    const effectiveWidth = rect.width * zoom
    const playheadX = totalDuration > 0 ? (playheadTime / totalDuration) * effectiveWidth : 0
    
    // Check if click is near the playhead (within 10 pixels)
    const clickDistanceFromPlayhead = Math.abs(x - playheadX)
    const isClickingOnPlayhead = clickDistanceFromPlayhead <= 10
    
    console.log('🔍 MOUSE CLICK - x:', x, 'time:', time, 'activeTool:', activeTool, 'totalDuration:', totalDuration, 'zoom:', zoom, 'playheadX:', playheadX, 'distance:', clickDistanceFromPlayhead, 'onPlayhead:', isClickingOnPlayhead)
    
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
      // Default behavior: Click anywhere on waveform - set playhead position only (don't auto-play)
      const clampedTime = Math.max(0, Math.min(time, totalDuration))
      const snappedTime = snapTimeToGrid(clampedTime)
      console.log('🔍 SETTING PLAYHEAD - clampedTime:', clampedTime, 'snappedTime:', snappedTime, 'snapToGrid:', snapToGrid)
      setPlayheadPosition(snappedTime)
      
      // If audio is currently playing, update the audio position but keep playing
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
    const time = (x / zoom) * (totalDuration / rect.width)
    
    if (dragTypeRef.current === 'selection' && selectionStart !== null) {
      const snappedTime = snapTimeToGrid(time)
      setSelectionEnd(snappedTime)
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
      const clampedTime = Math.max(0, Math.min(time, totalDuration))
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
      // Fetch all audio items
      console.log('🔍 FETCHING AUDIO ITEMS...')
      const { data: audioData, error: audioError } = await supabase
        .from('audio_library_items')
        .select(`
          *,
          pack:audio_packs(id, name, color)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
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
    
    const totalBars = Math.ceil(totalDuration / (stepDuration * 4)) // 4 steps per bar
    const beatsPerBar = 4 // Assuming 4/4 time signature
    const totalBeats = totalBars * beatsPerBar
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
              name: `Bar ${currentBar} / ${totalBars}`,
              time: playheadPosition
            }
          : marker
      ))
      console.log(`Updated bar tracker: Bar ${currentBar} / ${totalBars}`)
    } else {
      // Create new bar tracker marker
      const newMarker: Marker = {
        id: `bar-tracker-${Date.now()}`,
        time: playheadPosition,
        name: `Bar ${currentBar} / ${totalBars}`,
        category: 'Bar Tracker'
      }
      setMarkers(prev => [...prev, newMarker])
      console.log(`Created bar tracker: Bar ${currentBar} / ${totalBars}`)
    }
    
    // Mark all bars as tracked
    const allBars = Array.from({ length: totalBars }, (_, i) => i + 1)
    setMarkedBars(allBars)
    console.log(`Marked ${totalBars} bars for visual tracking`)
    
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
      const totalBars = Math.ceil(totalDuration / (stepDuration * 4))
      const currentBar = timeToBar(playheadPosition)
      
      setMarkers(prev => prev.map(marker => 
        marker.category === 'Bar Tracker' 
          ? {
              ...marker,
              name: `Bar ${currentBar} / ${totalBars}`,
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
              {/* Debug Info */}
              <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
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
                  <span className="text-blue-400">
                    Duplicate: {duplicateWave.isReversed ? 'Reversed' : 'Normal'} | Main: {isDuplicateMain ? 'Duplicate' : 'Original'} | Mode: {playBothMode ? 'Both' : 'Single'}
                  </span>
                )}
              </div>
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
            <Button
              size="sm"
              variant="outline"
              onClick={togglePlayBothMode}
              disabled={!duplicateWave}
              className={`font-bold transition-colors border-gray-600 ${
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
              className={`font-bold transition-colors border-gray-600 ${
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
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex h-[calc(100vh-120px)]">
        {/* Left Side - Transport, Waveform, and Toolbar */}
        <div className="flex-1 flex flex-col">
          {/* Transport Controls - Above Waveform */}
          <div className="bg-[#0f0f0f] border-b border-gray-600 p-4">
          <div className="flex items-center justify-between max-w-none">
            {/* Left Section - Transport Info */}
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-4">
                  <span className="text-gray-400 text-sm font-medium min-w-[3rem]">Time:</span>
                  <span className="text-white text-sm font-mono bg-[#1a1a1a] px-3 py-1 rounded border border-gray-600 min-w-[7rem] text-center">
                    {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-gray-400 text-sm font-medium min-w-[3rem]">BPM:</span>
                  <Input
                    type="number"
                    value={bpm}
                    onChange={(e) => {
                      const newBpm = parseInt(e.target.value) || 120
                      console.log('🔍 BPM CHANGED - old:', bpm, 'new:', newBpm)
                      setBpm(newBpm)
                    }}
                    className="w-20 h-8 text-sm bg-[#1a1a1a] border-gray-600 text-white font-mono text-center"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-gray-400 text-sm font-medium min-w-[3rem]">Grid:</span>
                  <select
                    value={gridDivision}
                    onChange={(e) => setGridDivision(parseInt(e.target.value))}
                    className="w-20 h-8 text-sm bg-[#1a1a1a] border border-gray-600 rounded text-white font-mono text-center"
                  >
                    <option value={4}>1/4</option>
                    <option value={8}>1/8</option>
                    <option value={16}>1/16</option>
                    <option value={32}>1/32</option>
                  </select>
              </div>
            </div>
            
            {/* Center Section - Playback Controls */}
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-4">
                <Label className="text-gray-400 text-sm font-medium min-w-[3rem]">Rate:</Label>
                <Slider
                  value={[playbackRate]}
                  onValueChange={(value) => setPlaybackRate(value[0])}
                  min={0.1}
                  max={4}
                  step={0.1}
                    className="w-32"
                />
                  <span className="text-white text-sm font-mono min-w-[3rem] bg-[#1a1a1a] px-2 py-1 rounded border border-gray-600 text-center">
                  {playbackRate}x
                </span>
              </div>
                <div className="flex items-center gap-4">
                <Label className="text-gray-400 text-sm font-medium min-w-[4rem]">Volume:</Label>
                <Slider
                  value={[volume]}
                  onValueChange={(value) => setVolume(value[0])}
                  min={0}
                  max={1}
                  step={0.01}
                    className="w-32"
                />
                  <span className="text-white text-sm font-mono min-w-[3rem] bg-[#1a1a1a] px-2 py-1 rounded border border-gray-600 text-center">
                  {Math.round(volume * 100)}%
                </span>
              </div>
            </div>
            
            {/* Right Section - Status Information */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                <span className="text-gray-400 text-sm font-medium min-w-[3rem]">Status:</span>
                  <span className={`text-sm font-mono px-3 py-1 rounded border min-w-[4rem] text-center ${
                  isPlaying 
                    ? 'text-green-400 border-green-400 bg-green-900/20' 
                    : 'text-gray-400 border-gray-600 bg-[#1a1a1a]'
                }`}>
                  {isPlaying ? 'LIVE' : 'STOPPED'}
                </span>
              </div>
                <div className="flex items-center gap-3">
                <span className="text-gray-400 text-sm font-medium min-w-[4rem]">Markers:</span>
                  <span className="text-blue-400 text-sm font-mono bg-[#1a1a1a] px-3 py-1 rounded border border-blue-600 min-w-[2rem] text-center">
                  {markers.length}
                </span>
              </div>
                <div className="flex items-center gap-3">
                <span className="text-gray-400 text-sm font-medium min-w-[4rem]">Regions:</span>
                  <span className="text-purple-400 text-sm font-mono bg-[#1a1a1a] px-3 py-1 rounded border border-purple-600 min-w-[2rem] text-center">
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
            />
          )}
        </div>
        
        {/* Toolbar - Below Waveform */}
        <div className="bg-[#141414] border-t border-gray-700 p-2">
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
                <div key={marker.id} className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded border border-gray-600 min-w-0">
                  <div className="flex items-center gap-4 flex-1">
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
                              max={Math.ceil(totalDuration / (stepDuration * 4))}
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
                        <span 
                          className="text-base text-white cursor-pointer hover:text-blue-300 font-medium"
                          onClick={() => startEditingMarker(marker)}
                          title="Click to edit name"
                        >
                          {marker.name}
                        </span>
                        <div className="flex items-center gap-3">
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
              onClick={addMarker}
              className="w-full mt-4 bg-[#1a1a1a] text-gray-300 hover:bg-gray-600 border-gray-500 h-10 text-base font-medium"
            >
              Add Marker (M)
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