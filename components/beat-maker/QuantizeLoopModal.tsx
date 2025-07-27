import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, Play, Pause, RotateCcw, Grid3X3, Scissors, Move, MapPin } from 'lucide-react'

interface QuantizeLoopModalProps {
  isOpen: boolean
  onClose: () => void
  track: any
  bpm: number
  steps: number
  currentStep?: number
  onQuantize: (trackId: number, startTime: number, endTime: number, playbackRate: number) => void
}

interface WaveformPoint {
  x: number
  y: number
}

export function QuantizeLoopModal({ 
  isOpen, 
  onClose, 
  track, 
  bpm, 
  steps, 
  currentStep = 0,
  onQuantize 
}: QuantizeLoopModalProps) {
  const [waveformData, setWaveformData] = useState<WaveformPoint[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [gridSnap, setGridSnap] = useState(true)
  const [scrollOffset, setScrollOffset] = useState(0)
  const [viewWidth, setViewWidth] = useState(0)
  const [waveformOffset, setWaveformOffset] = useState(0) // Time offset for waveform positioning
  const [waveformOffsetSlider, setWaveformOffsetSlider] = useState(0) // Debounced slider value
  const [playheadPosition, setPlayheadPosition] = useState(0) // Playhead position in seconds
  const [markers, setMarkers] = useState<Array<{id: string, time: number, name: string, category: string}>>([]) // Markers array
  const [editingMarker, setEditingMarker] = useState<string | null>(null) // Currently editing marker ID
  const [editingMarkerName, setEditingMarkerName] = useState('') // Temporary name for editing
  const [editingMarkerTime, setEditingMarkerTime] = useState('') // Temporary time for editing
  const [editingMarkerStep, setEditingMarkerStep] = useState('') // Temporary step for editing
  const [editingMarkerBar, setEditingMarkerBar] = useState('') // Temporary bar for editing
  const [editingMarkerCategory, setEditingMarkerCategory] = useState('') // Temporary category for editing
  const [selectedCategory, setSelectedCategory] = useState<string>('all') // Currently selected category filter
  const [customCategories, setCustomCategories] = useState<string[]>([]) // Custom category names
  const [showCategoryInput, setShowCategoryInput] = useState(false) // Show/hide custom category input
  const [newCategoryName, setNewCategoryName] = useState('') // New category name input
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const animationRef = useRef<number | undefined>(undefined)
  const isDraggingRef = useRef<boolean>(false)
  const dragTypeRef = useRef<'start' | 'end' | 'move' | null>(null)

  // Calculate grid positions
  const secondsPerBeat = 60 / bpm
  const beatsPerStep = 1 // Assuming 16th notes
  const stepDuration = secondsPerBeat * beatsPerStep
  
  // Calculate total duration for all steps
  const totalDuration = steps * stepDuration

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
    return [...new Set([...defaultCategories, ...customCategories, ...usedCategories])]
  }

  const getFilteredMarkers = () => {
    if (selectedCategory === 'all') {
      return markers
    }
    return markers.filter(marker => marker.category === selectedCategory)
  }

  // Add custom category
  const addCustomCategory = () => {
    if (newCategoryName.trim() && !getAvailableCategories().includes(newCategoryName.trim())) {
      setCustomCategories(prev => [...prev, newCategoryName.trim()])
      setNewCategoryName('')
      setShowCategoryInput(false)
    }
  }

  // Remove custom category
  const removeCustomCategory = (categoryName: string) => {
    setCustomCategories(prev => prev.filter(cat => cat !== categoryName))
    // Update markers that use this category to "General"
    setMarkers(prev => prev.map(marker => 
      marker.category === categoryName ? { ...marker, category: 'General' } : marker
    ))
  }
  
  // Create grid lines for all steps, not just visible ones (memoized)
  const gridLines = useMemo(() => 
    Array.from({ length: steps + 1 }, (_, i) => i * stepDuration),
    [steps, stepDuration]
  )

  // Load and analyze audio waveform
  useEffect(() => {
    if (!isOpen || !track?.audioUrl) return

    const loadWaveform = async () => {
      setIsLoading(true)
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const response = await fetch(track.audioUrl)
        const arrayBuffer = await response.arrayBuffer()
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
        
        // Get audio data
        const channelData = audioBuffer.getChannelData(0)
        const sampleRate = audioBuffer.sampleRate
        const duration = audioBuffer.duration
        
        setDuration(duration)
        
        // Set the loop region to cover all transport steps by default
        setStartTime(0)
        setEndTime(totalDuration)
        
        // Ensure we're using the total duration for the full step range
        const effectiveDuration = Math.max(duration, totalDuration)
        
                  // Generate waveform data with better resolution
          const numPoints = Math.max(2000, steps * 50) // More points for more steps
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
            
            // Combine RMS and peak for better visualization
            const amplitude = (rms * 0.7 + peak * 0.3)
            const x = (i / numPoints) * effectiveDuration
            const y = Math.min(amplitude * 2, 1) // Scale and clamp
            
            waveform.push({ x, y })
          }
        
        setWaveformData(waveform)
        
        // Set up audio element
        if (audioRef.current) {
          audioRef.current.src = track.audioUrl
          audioRef.current.load()
        }
        
        console.log(`[WAVEFORM] Loaded ${waveform.length} points for ${duration.toFixed(2)}s audio`)
        
        // If no waveform data was generated, create a simple one
        if (waveform.length === 0) {
          console.log('[WAVEFORM] No data generated, creating fallback waveform')
          for (let i = 0; i < 100; i++) {
            const x = (i / 100) * duration
            const y = 0.1 + Math.random() * 0.2 // Random small amplitude
            waveform.push({ x, y })
          }
          setWaveformData(waveform)
        }
        
      } catch (error) {
        console.error('Error loading waveform:', error)
        // Create a simple fallback waveform on error
        const fallbackWaveform: WaveformPoint[] = []
        for (let i = 0; i < 100; i++) {
          const x = (i / 100) * 5 // 5 second fallback
          const y = 0.1 + Math.random() * 0.2
          fallbackWaveform.push({ x, y })
        }
        setWaveformData(fallbackWaveform)
        setDuration(5)
        setEndTime(5)
      } finally {
        setIsLoading(false)
      }
    }

    loadWaveform()
  }, [isOpen, track?.audioUrl])

  // Draw waveform and grid
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !waveformData.length) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    
    // Set the total canvas width to accommodate all steps with zoom
    const pixelsPerStep = 80 // Minimum pixels per step for visibility
    const baseCanvasWidth = Math.max(rect.width, steps * pixelsPerStep)
    const totalCanvasWidth = baseCanvasWidth * zoom
    
    // Set canvas dimensions
    canvas.width = totalCanvasWidth * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    canvas.style.width = `${totalCanvasWidth}px`
    canvas.style.height = `${rect.height}px`
    
    // Scale context for high DPI displays
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    
    // Only update viewWidth if it actually changed
    if (viewWidth !== rect.width) {
      setViewWidth(rect.width)
    }
    
    console.log(`[CANVAS] Steps: ${steps}, Total Duration: ${totalDuration}s, Canvas Width: ${totalCanvasWidth}px, Pixels per Step: ${totalCanvasWidth / steps}`)

    console.log(`[WAVEFORM DRAW] Canvas: ${rect.width}x${rect.height}, Total Width: ${totalCanvasWidth}, Points: ${waveformData.length}, Duration: ${duration}s, Total Steps: ${steps}`)

    // Clear canvas
    ctx.clearRect(0, 0, totalCanvasWidth, rect.height)

    // Draw background
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, totalCanvasWidth, rect.height)

    // Draw grid lines with step numbers for all steps
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 1
    ctx.setLineDash([2, 2])
    
    gridLines.forEach((time: number, stepIndex: number) => {
      const x = (time / totalDuration) * totalCanvasWidth
      
            // Only draw grid lines that are within the visible area
      if (x >= 0 && x <= totalCanvasWidth) {
        // Draw grid line
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, rect.height)
        ctx.stroke()
      
        // Draw step number
        ctx.setLineDash([])
        ctx.fillStyle = stepIndex % 4 === 0 ? '#888' : '#555' // Highlight every 4th step
        ctx.font = stepIndex % 4 === 0 ? 'bold 12px monospace' : '10px monospace'
        ctx.textAlign = 'center'
        
        // Draw step number at top
        ctx.fillText(stepIndex.toString(), x, 20)
        
        // Draw bar number (every 4 steps = 1 bar)
        if (stepIndex % 4 === 0) {
          const barNumber = Math.floor(stepIndex / 4) + 1
          ctx.fillStyle = '#ffffff' // White color for bar numbers
          ctx.font = 'bold 24px monospace'
          
          // Draw bar number above step number at top
          ctx.fillText(barNumber.toString(), x, 40)
        }
        
        ctx.setLineDash([2, 2])
      }
    })
    
    ctx.setLineDash([])

    // Draw waveform with better visibility
    if (waveformData.length > 0) {
      // Draw waveform as filled area for better visibility
      ctx.fillStyle = 'rgba(74, 222, 128, 0.3)'
      ctx.beginPath()
      
      // Draw the top half with offset
      waveformData.forEach((point, index) => {
        const adjustedX = point.x + waveformOffset
        const x = (adjustedX / totalDuration) * totalCanvasWidth
        const y = rect.height / 2 - (point.y * rect.height * 0.4)
        
        if (index === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      
      // Draw the bottom half (mirrored) with offset
      for (let i = waveformData.length - 1; i >= 0; i--) {
        const point = waveformData[i]
        const adjustedX = point.x + waveformOffset
        const x = (adjustedX / totalDuration) * totalCanvasWidth
        const y = rect.height / 2 + (point.y * rect.height * 0.4)
        ctx.lineTo(x, y)
      }
      
      ctx.closePath()
      ctx.fill()
      
      // Draw waveform outline
      ctx.strokeStyle = '#4ade80'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      
      waveformData.forEach((point, index) => {
        const adjustedX = point.x + waveformOffset
        const x = (adjustedX / totalDuration) * totalCanvasWidth
        const y = rect.height / 2 - (point.y * rect.height * 0.4)
        
        if (index === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      
      ctx.stroke()
      
      // Draw bottom outline
      ctx.beginPath()
      for (let i = waveformData.length - 1; i >= 0; i--) {
        const point = waveformData[i]
        const adjustedX = point.x + waveformOffset
        const x = (adjustedX / totalDuration) * totalCanvasWidth
        const y = rect.height / 2 + (point.y * rect.height * 0.4)
        
        if (i === waveformData.length - 1) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.stroke()
    }

    // Draw loop region
    const startX = (startTime / totalDuration) * totalCanvasWidth
    const endX = (endTime / totalDuration) * totalCanvasWidth
    
    // Highlight loop region
    ctx.fillStyle = 'rgba(74, 222, 128, 0.2)'
    ctx.fillRect(startX, 0, endX - startX, rect.height)
    
    // Draw loop boundaries
    ctx.strokeStyle = '#4ade80'
    ctx.lineWidth = 3
    
    // Start line
    ctx.beginPath()
    ctx.moveTo(startX, 0)
    ctx.lineTo(startX, rect.height)
    ctx.stroke()
    
    // End line
    ctx.beginPath()
    ctx.moveTo(endX, 0)
    ctx.lineTo(endX, rect.height)
    ctx.stroke()

    // Draw handles
    const handleSize = 8
    ctx.fillStyle = '#4ade80'
    
    // Start handle
    ctx.fillRect(startX - handleSize/2, rect.height/2 - handleSize/2, handleSize, handleSize)
    
    // End handle
    ctx.fillRect(endX - handleSize/2, rect.height/2 - handleSize/2, handleSize, handleSize)

    // Draw current sequencer step indicator
    if (currentStep !== undefined) {
      const stepTime = currentStep * stepDuration
      const stepX = (stepTime / totalDuration) * totalCanvasWidth
      if (stepX >= 0 && stepX <= totalCanvasWidth) {
        ctx.strokeStyle = '#ff6b35'
        ctx.lineWidth = 3
        ctx.setLineDash([])
        ctx.beginPath()
        ctx.moveTo(stepX, 0)
        ctx.lineTo(stepX, rect.height)
        ctx.stroke()
        
        // Draw step number indicator
        ctx.fillStyle = '#ff6b35'
        ctx.font = 'bold 14px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(`Step ${currentStep}`, stepX, 35)
      }
    }

    // Draw playhead position (moves with playback when playing, or shows click position when stopped)
    const playheadTime = isPlaying ? currentTime : playheadPosition
    const playheadX = (playheadTime / totalDuration) * totalCanvasWidth
    console.log(`[PLAYHEAD DRAW] isPlaying=${isPlaying}, currentTime=${currentTime.toFixed(2)}s, playheadPosition=${playheadPosition.toFixed(2)}s, playheadTime=${playheadTime.toFixed(2)}s, playheadX=${playheadX.toFixed(1)}px`)
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
      const markerX = (marker.time / totalDuration) * totalCanvasWidth
      
      // Draw marker line
      ctx.strokeStyle = '#00ff00'
      ctx.lineWidth = 2
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(markerX, 0)
      ctx.lineTo(markerX, rect.height)
      ctx.stroke()
      ctx.setLineDash([])
      
      // Draw marker triangle
      ctx.fillStyle = '#00ff00'
      ctx.beginPath()
      ctx.moveTo(markerX - 6, 10)
      ctx.lineTo(markerX + 6, 10)
      ctx.lineTo(markerX, 20)
      ctx.closePath()
      ctx.fill()
      
      // Draw marker name
      ctx.fillStyle = '#00ff00'
      ctx.font = 'bold 10px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(marker.name, markerX, 35)
    })
      }, [waveformData, duration, totalDuration, startTime, endTime, currentTime, isPlaying, currentStep, stepDuration, steps, zoom, viewWidth, waveformOffset, playheadPosition, markers])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      drawWaveform()
    }, 16) // ~60fps debounce
    
    return () => clearTimeout(timeoutId)
  }, [drawWaveform])

  // Force redraw when playing to ensure smooth playhead movement
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        drawWaveform()
      }, 50) // Update every 50ms when playing
      
      return () => clearInterval(interval)
    }
  }, [isPlaying, drawWaveform])



  // Handle mouse events for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    
    // Calculate time based on actual canvas width and total duration
    const time = (x / rect.width) * totalDuration
    
    const startX = (startTime / totalDuration) * rect.width
    const endX = (endTime / totalDuration) * rect.width
    const handleSize = 8

    // Check if clicking on handles first (highest priority)
    if (Math.abs(x - startX) < handleSize) {
      dragTypeRef.current = 'start'
    } else if (Math.abs(x - endX) < handleSize) {
      dragTypeRef.current = 'end'
    } else {
      // Click anywhere on waveform - set playhead position and toggle playback
      dragTypeRef.current = null
      const clampedTime = Math.max(0, Math.min(time, totalDuration))
      console.log(`[PLAYHEAD] Click at x=${x}, calculated time=${time.toFixed(2)}s, clamped=${clampedTime.toFixed(2)}s`)
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
          audioRef.current.play()
          setIsPlaying(true)
          
          const updatePlayhead = () => {
            if (audioRef.current && isPlaying) {
              const time = audioRef.current.currentTime
              setCurrentTime(time)
              console.log(`[PLAYHEAD] Current time: ${time.toFixed(2)}s`)
              
              // Loop playback
              if (time >= endTime) {
                audioRef.current.currentTime = startTime
              }
              
              animationRef.current = requestAnimationFrame(updatePlayhead)
            }
          }
          
          updatePlayhead()
        }
      }
      return
    }

    isDraggingRef.current = true
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !dragTypeRef.current) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    let time = (x / rect.width) * totalDuration

    // Snap to grid if enabled
    if (gridSnap) {
      const snappedTime = gridLines.reduce((prev: number, curr: number) => 
        Math.abs(curr - time) < Math.abs(prev - time) ? curr : prev
      )
      time = snappedTime
    }

    // Clamp values
    time = Math.max(0, Math.min(totalDuration, time))

    if (dragTypeRef.current === 'start') {
      setStartTime(Math.min(time, endTime - stepDuration))
    } else if (dragTypeRef.current === 'end') {
      setEndTime(Math.max(time, startTime + stepDuration))
    } else if (dragTypeRef.current === 'move') {
      const loopLength = endTime - startTime
      const newStartTime = Math.max(0, Math.min(duration - loopLength, time - loopLength / 2))
      const newEndTime = newStartTime + loopLength
      setStartTime(newStartTime)
      setEndTime(newEndTime)
    }
  }

  const handleMouseUp = () => {
    isDraggingRef.current = false
    dragTypeRef.current = null
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
      // Start playback from playhead position, but ensure it's within the loop region
      const startFromTime = Math.max(0, Math.min(playheadPosition, totalDuration))
      audioRef.current.currentTime = startFromTime
      audioRef.current.playbackRate = playbackRate
      audioRef.current.play()
      setIsPlaying(true)
      
      const updatePlayhead = () => {
        if (audioRef.current && isPlaying) {
          const time = audioRef.current.currentTime
          setCurrentTime(time)
          console.log(`[PLAYHEAD] Current time: ${time.toFixed(2)}s`)
          
          // Loop playback
          if (time >= endTime) {
            audioRef.current.currentTime = startTime
          }
          
          animationRef.current = requestAnimationFrame(updatePlayhead)
        }
      }
      
      updatePlayhead()
    }
  }

  // Auto-quantize to grid
  const autoQuantize = () => {
    // Auto-quantize to cover all transport steps
    const quantizedStart = 0
    const quantizedEnd = totalDuration
    
    setStartTime(quantizedStart)
    setEndTime(quantizedEnd)
    
    console.log(`[AUTO-QUANTIZE] Set loop to cover all ${steps} steps (${totalDuration.toFixed(2)}s)`)
  }

  // Apply quantization
  const applyQuantization = () => {
    const loopLength = endTime - startTime
    const targetLength = steps * stepDuration
    const newPlaybackRate = targetLength / loopLength
    
    // Include waveform offset in the quantization
    const adjustedStartTime = startTime + waveformOffset
    const adjustedEndTime = endTime + waveformOffset
    
    onQuantize(track.id, adjustedStartTime, adjustedEndTime, newPlaybackRate)
    onClose()
  }

  // Reload waveform function
  const reloadWaveform = async () => {
    if (!track?.audioUrl) return
    
    setIsLoading(true)
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const response = await fetch(track.audioUrl)
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      
      // Get audio data
      const channelData = audioBuffer.getChannelData(0)
      const sampleRate = audioBuffer.sampleRate
      const duration = audioBuffer.duration
      
      setDuration(duration)
      
      // Set the loop region to cover all transport steps by default
      setStartTime(0)
      setEndTime(totalDuration)
      
      // Ensure we're using the total duration for the full step range
      const effectiveDuration = Math.max(duration, totalDuration)
      
      // Generate waveform data with better resolution
      const numPoints = Math.max(2000, steps * 50) // More points for more steps
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
        
        // Combine RMS and peak for better visualization
        const amplitude = (rms * 0.7 + peak * 0.3)
        const x = (i / numPoints) * effectiveDuration
        const y = Math.min(amplitude * 2, 1) // Scale and clamp
        
        waveform.push({ x, y })
      }
    
      setWaveformData(waveform)
      
      // Set up audio element
      if (audioRef.current) {
        audioRef.current.src = track.audioUrl
        audioRef.current.load()
      }
      
      console.log(`[WAVEFORM] Reloaded ${waveform.length} points for ${duration.toFixed(2)}s audio`)
      
      // If no waveform data was generated, create a simple one
      if (waveform.length === 0) {
        console.log('[WAVEFORM] No data generated, creating fallback waveform')
        for (let i = 0; i < 100; i++) {
          const x = (i / 100) * duration
          const y = 0.1 + Math.random() * 0.2 // Random small amplitude
          waveform.push({ x, y })
        }
        setWaveformData(waveform)
      }
      
    } catch (error) {
      console.error('Error reloading waveform:', error)
      // Create a simple fallback waveform on error
      const fallbackWaveform: WaveformPoint[] = []
      for (let i = 0; i < 100; i++) {
        const x = (i / 100) * 5 // 5 second fallback
        const y = 0.1 + Math.random() * 0.2
        fallbackWaveform.push({ x, y })
      }
      setWaveformData(fallbackWaveform)
      setDuration(5)
      setEndTime(5)
    } finally {
      setIsLoading(false)
    }
  }

  // Reset to original
  const resetToOriginal = () => {
    // Stop playback if playing
    if (isPlaying) {
      setIsPlaying(false)
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
    }
    
    // Reset all state variables
    setStartTime(0)
    setEndTime(totalDuration) // Use full transport steps instead of just audio duration
    setPlaybackRate(1)
    setWaveformOffset(0) // Reset waveform timing
    setPlayheadPosition(0) // Reset playhead position
    setCurrentTime(0) // Reset current time
    setMarkers([]) // Clear all markers
    setEditingMarker(null) // Clear any editing state
    setEditingMarkerName('')
    setEditingMarkerTime('')
    setEditingMarkerStep('')
    setEditingMarkerBar('')
    setZoom(1) // Reset zoom to 100%
    
    // Reload the waveform
    setIsLoading(true)
    setWaveformData([])
    
    // Force reload by clearing and reloading
    if (audioRef.current) {
      audioRef.current.src = ''
      audioRef.current.load()
    }
    
    // Reload waveform after a short delay to ensure audio is cleared
    setTimeout(() => {
      if (track?.audioUrl) {
        reloadWaveform()
      }
    }, 100)
    
    console.log('[RESET] Reset all settings and reloading waveform')
  }

  // Add marker at current playhead position
  const addMarker = () => {
    const markerTime = isPlaying ? currentTime : playheadPosition
    const markerName = `Marker ${markers.length + 1}`
    const newMarker = {
      id: `marker-${Date.now()}`,
      time: markerTime,
      name: markerName,
      category: 'General'
    }
    setMarkers(prev => [...prev, newMarker])
    console.log(`[MARKER] Added marker at ${markerTime.toFixed(2)}s: ${markerName}`)
  }

  // Remove marker by ID
  const removeMarker = (markerId: string) => {
    setMarkers(prev => prev.filter(marker => marker.id !== markerId))
  }

  // Jump to marker
  const jumpToMarker = (markerTime: number) => {
    setPlayheadPosition(markerTime)
    if (audioRef.current) {
      audioRef.current.currentTime = markerTime
    }
    console.log(`[MARKER] Jumped to marker at ${markerTime.toFixed(2)}s`)
  }

  // Start editing marker
  const startEditingMarker = (marker: {id: string, time: number, name: string, category: string}) => {
    setEditingMarker(marker.id)
    setEditingMarkerName(marker.name)
    setEditingMarkerTime(marker.time.toFixed(2))
    setEditingMarkerStep(timeToStep(marker.time).toString())
    setEditingMarkerBar(timeToBar(marker.time).toString())
    setEditingMarkerCategory(marker.category)
  }

  // Save marker edits
  const saveMarkerEdit = () => {
    if (!editingMarker) return
    
    let newTime = parseFloat(editingMarkerTime) || 0
    
    // If step is provided, use it to calculate time
    if (editingMarkerStep && editingMarkerStep.trim() !== '') {
      const step = parseInt(editingMarkerStep) || 0
      newTime = stepToTime(Math.max(0, Math.min(step, steps - 1)))
    }
    
    // If bar is provided, use it to calculate time
    if (editingMarkerBar && editingMarkerBar.trim() !== '') {
      const bar = parseInt(editingMarkerBar) || 1
      const maxBars = Math.ceil(steps / 4)
      newTime = barToTime(Math.max(1, Math.min(bar, maxBars)))
    }
    
    const clampedTime = Math.max(0, Math.min(newTime, totalDuration))
    
    setMarkers(prev => prev.map(marker => 
      marker.id === editingMarker 
        ? { ...marker, name: editingMarkerName, time: clampedTime, category: editingMarkerCategory }
        : marker
    ))
    
    setEditingMarker(null)
    setEditingMarkerName('')
    setEditingMarkerTime('')
    setEditingMarkerStep('')
    setEditingMarkerBar('')
    setEditingMarkerCategory('')
    console.log(`[MARKER] Updated marker: ${editingMarkerName} at ${clampedTime.toFixed(2)}s (Step ${timeToStep(clampedTime)}, Bar ${timeToBar(clampedTime)})`)
  }

  // Cancel marker editing
  const cancelMarkerEdit = () => {
    setEditingMarker(null)
    setEditingMarkerName('')
    setEditingMarkerTime('')
    setEditingMarkerStep('')
    setEditingMarkerBar('')
    setEditingMarkerCategory('')
  }

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault() // Prevent page scroll
        togglePlayback()
      } else if (e.code === 'KeyM') {
        e.preventDefault() // Add marker
        addMarker()
      } else if (e.code === 'KeyJ' && e.ctrlKey) {
        e.preventDefault() // Jump to previous marker
        const currentPos = isPlaying ? currentTime : playheadPosition
        const prevMarker = markers
          .filter(m => m.time < currentPos)
          .sort((a, b) => b.time - a.time)[0]
        if (prevMarker) {
          jumpToMarker(prevMarker.time)
        }
      } else if (e.code === 'KeyK' && e.ctrlKey) {
        e.preventDefault() // Jump to next marker
        const currentPos = isPlaying ? currentTime : playheadPosition
        const nextMarker = markers
          .filter(m => m.time > currentPos)
          .sort((a, b) => a.time - b.time)[0]
        if (nextMarker) {
          jumpToMarker(nextMarker.time)
        }
      } else if (e.code === 'Enter' && editingMarker) {
        e.preventDefault() // Save marker edit
        saveMarkerEdit()
      } else if (e.code === 'Escape' && editingMarker) {
        e.preventDefault() // Cancel marker edit
        cancelMarkerEdit()
      } else if (e.code === 'Equal' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault() // Zoom in (Ctrl/Cmd + =)
        setZoom(Math.min(5, zoom + 0.2))
      } else if (e.code === 'Minus' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault() // Zoom out (Ctrl/Cmd + -)
        setZoom(Math.max(0.1, zoom - 0.2))
      } else if (e.code === 'Digit0' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault() // Reset zoom (Ctrl/Cmd + 0)
        setZoom(1)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, togglePlayback, addMarker, jumpToMarker, markers, currentTime, playheadPosition, editingMarker, saveMarkerEdit, cancelMarkerEdit, zoom])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Grid3X3 className="w-5 h-5" />
            Edit Loop: {track?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 overflow-y-auto pb-4">
          {/* Controls */}
          <div className="flex items-center gap-2 p-4 bg-gray-900 rounded-lg overflow-x-auto">
            <Button
              size="sm"
              onClick={togglePlayback}
              className="flex items-center gap-2"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPlaying ? 'Pause' : 'Play Loop'}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={autoQuantize}
              className="flex items-center gap-2"
            >
              <Grid3X3 className="w-4 h-4" />
              Auto-Quantize
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={addMarker}
              className="flex items-center gap-2"
              title="Add marker at current position (M)"
            >
              <MapPin className="w-4 h-4" />
              Add Marker
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={resetToOriginal}
              className="flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="gridSnap"
                checked={gridSnap}
                onChange={(e) => setGridSnap(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="gridSnap" className="text-sm">Snap to Grid</Label>
            </div>

            <div className="ml-auto flex items-center gap-4">
              <div className="text-sm">
                <span className="text-gray-400">Loop Length: </span>
                <span className="font-mono">{(endTime - startTime).toFixed(2)}s</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-400">Beats: </span>
                <span className="font-mono">{((endTime - startTime) / secondsPerBeat).toFixed(1)}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-400">Loop Steps: </span>
                <span className="font-mono">{Math.round((endTime - startTime) / stepDuration)}</span>
              </div>
            </div>
          </div>

          {/* Zoom Control */}
          <div className="flex items-center gap-4 p-4 bg-gray-900 rounded-lg">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-gray-300">Zoom:</Label>
              <span className="text-xs text-gray-500">(Ctrl/Cmd + +/-/0)</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setZoom(Math.max(0.1, zoom - 0.2))}
                className="h-8 w-8 p-0"
                title="Zoom Out"
              >
                -
              </Button>
              <Slider
                value={[zoom]}
                onValueChange={(value) => setZoom(value[0])}
                min={0.1}
                max={5}
                step={0.1}
                className="flex-1 w-32"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => setZoom(Math.min(5, zoom + 0.2))}
                className="h-8 w-8 p-0"
                title="Zoom In"
              >
                +
              </Button>
            </div>
            <span className="text-sm font-mono text-gray-300 min-w-[3rem]">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setZoom(1)}
              className="text-xs"
              title="Reset Zoom"
            >
              Reset
            </Button>
          </div>

          {/* Waveform Timing Control */}
          <div className="flex items-center gap-4 p-4 bg-gray-900 rounded-lg">
            <Label className="text-sm text-gray-300">Waveform Timing:</Label>
            <Slider
              value={[waveformOffset]}
              onValueChange={(value) => {
                setWaveformOffset(value[0])
                setWaveformOffsetSlider(value[0])
              }}
              min={-totalDuration / 2}
              max={totalDuration / 2}
              step={0.0001}
              className="flex-1"
            />
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={waveformOffset.toFixed(4)}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0
                  const clampedValue = Math.max(-totalDuration / 2, Math.min(totalDuration / 2, value))
                  setWaveformOffset(clampedValue)
                  setWaveformOffsetSlider(clampedValue)
                }}
                step="0.0001"
                min={-totalDuration / 2}
                max={totalDuration / 2}
                className="w-20 h-8 text-xs"
              />
              <span className="text-xs text-gray-400">s</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setWaveformOffset(0)
                setWaveformOffsetSlider(0)
              }}
              className="text-xs"
            >
              Reset
            </Button>
          </div>

          {/* Waveform Canvas */}
          <div className="relative bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
            {/* Step Counter Overlay */}
            <div className="absolute top-2 left-2 z-10 bg-black/70 px-2 py-1 rounded text-xs text-white">
              Showing {steps} steps ({totalDuration.toFixed(1)}s total)
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="flex items-center gap-2 text-gray-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-400"></div>
                  Loading waveform...
                </div>
              </div>
            ) : (
              <div className="relative overflow-x-auto overflow-y-hidden">
                <canvas
                  ref={canvasRef}
                  className="h-64 cursor-crosshair"
                  style={{ minWidth: '100%' }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                />
                {waveformData.length === 0 && !isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-gray-500 text-center">
                      <div>No waveform data available</div>
                      <div className="text-sm">Try loading a different audio file</div>
                                  </div>
            </div>
          )}

          {/* Custom Categories Management */}
          {customCategories.length > 0 && (
            <div className="p-4 bg-gray-900 rounded-lg">
              <h3 className="text-sm font-medium text-white mb-2">Custom Categories</h3>
              <div className="flex flex-wrap gap-2">
                {customCategories.map(category => (
                  <div key={category} className="flex items-center gap-1 bg-gray-800 rounded px-2 py-1">
                    <span className="text-xs text-white">{category}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeCustomCategory(category)}
                      className="h-4 w-4 p-0 text-xs text-red-400 hover:text-red-300"
                      title={`Remove ${category} category`}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
              </div>
            )}
          </div>

          {/* Time Controls */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">Start Time (s)</Label>
              <Input
                type="number"
                value={startTime.toFixed(3)}
                onChange={(e) => setStartTime(parseFloat(e.target.value) || 0)}
                step="0.001"
                min="0"
                max={duration}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">End Time (s)</Label>
              <Input
                type="number"
                value={endTime.toFixed(3)}
                onChange={(e) => setEndTime(parseFloat(e.target.value) || duration)}
                step="0.001"
                min={startTime}
                max={duration}
                className="mt-1"
              />
            </div>
          </div>

          {/* Grid Info */}
          <div className="p-4 bg-gray-900 rounded-lg">
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-400">BPM: </span>
                <span className="font-mono">{bpm}</span>
              </div>
              <div>
                <span className="text-gray-400">Step Duration: </span>
                <span className="font-mono">{stepDuration.toFixed(3)}s</span>
              </div>
              <div>
                <span className="text-gray-400">Sequencer Steps: </span>
                <span className="font-mono">{steps}</span>
              </div>
              <div>
                <span className="text-gray-400">Total Duration: </span>
                <span className="font-mono">{totalDuration.toFixed(3)}s</span>
              </div>
            </div>
          </div>

          {/* Markers List */}
          {markers.length > 0 && (
            <div className="p-4 bg-gray-900 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-white">Markers</h3>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="text-xs bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white"
                    >
                      <option value="all">All Categories</option>
                      {getAvailableCategories().map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowCategoryInput(!showCategoryInput)}
                      className="h-6 px-2 text-xs"
                      title="Add custom category"
                    >
                      +
                    </Button>
                  </div>
                  {showCategoryInput && (
                    <div className="flex items-center gap-1">
                      <Input
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="New category name"
                        className="h-6 text-xs w-24"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addCustomCategory()
                          } else if (e.key === 'Escape') {
                            setShowCategoryInput(false)
                            setNewCategoryName('')
                          }
                        }}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={addCustomCategory}
                        className="h-6 px-2 text-xs bg-green-600 hover:bg-green-700"
                      >
                        ✓
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowCategoryInput(false)
                          setNewCategoryName('')
                        }}
                        className="h-6 px-2 text-xs bg-red-600 hover:bg-red-700"
                      >
                        ✗
                      </Button>
                    </div>
                  )}
                  <div className="text-xs text-gray-400">
                    Ctrl+J: Previous | Ctrl+K: Next | M: Add | Enter: Save | Esc: Cancel
                  </div>
                </div>
              </div>
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
                        max={steps - 1}
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
                        max={Math.ceil(steps / 4)}
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
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={applyQuantization} className="bg-green-600 hover:bg-green-700">
              Apply Quantization
            </Button>
          </div>
        </div>

        {/* Hidden audio element */}
        <audio
          ref={audioRef}
          onEnded={() => setIsPlaying(false)}
          style={{ display: 'none' }}
        />
      </DialogContent>
    </Dialog>
  )
} 