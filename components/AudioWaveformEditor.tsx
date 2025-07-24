"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Play, 
  Square, 
  Pause, 
  SkipBack, 
  SkipForward,
  Plus,
  Minus,
  Music,
  Clock,
  Grid3X3,
  Layers,
  Edit3,
  Save,
  Trash2,
  Maximize2
} from 'lucide-react'

interface AudioWaveformEditorProps {
  audioUrl?: string
  bpm?: number
  musicalKey?: string
  timeSignature?: string
  onBpmChange?: (bpm: number) => void
  onKeyChange?: (key: string) => void
  onTimeSignatureChange?: (timeSignature: string) => void
  onMarkerAdd?: (position: number, label: string) => void
  onPatternAdd?: (startBar: number, endBar: number, label: string) => void
}

interface Marker {
  id: string
  position: number
  label: string
  color: string
}

interface Pattern {
  id: string
  startBar: number
  endBar: number
  label: string
  color: string
}

export default function AudioWaveformEditor({
  audioUrl,
  bpm = 120,
  musicalKey = 'C',
  timeSignature = '4/4',
  onBpmChange,
  onKeyChange,
  onTimeSignatureChange,
  onMarkerAdd,
  onPatternAdd
}: AudioWaveformEditorProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [zoom, setZoom] = useState(0.1) // Start with a much smaller zoom to show full length
  const [scrollPosition, setScrollPosition] = useState(0)
  const [markers, setMarkers] = useState<Marker[]>([])
  const [patterns, setPatterns] = useState<Pattern[]>([])
  const [showAddMarker, setShowAddMarker] = useState(false)
  const [showAddPattern, setShowAddPattern] = useState(false)
  const [newMarkerLabel, setNewMarkerLabel] = useState('')
  const [newPatternLabel, setNewPatternLabel] = useState('')
  const [selectedTool, setSelectedTool] = useState<'select' | 'marker' | 'pattern'>('select')
  
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const animationRef = useRef<number>()

  // Parse time signature
  const [beatsPerBar, setBeatsPerBar] = useState(4)
  const [beatUnit, setBeatUnit] = useState(4)

  useEffect(() => {
    if (timeSignature) {
      const [beats, unit] = timeSignature.split('/').map(Number)
      setBeatsPerBar(beats || 4)
      setBeatUnit(unit || 4)
    }
  }, [timeSignature])

  // Calculate time per bar based on BPM
  const secondsPerBar = (60 / bpm) * beatsPerBar
  const totalBars = duration > 0 ? Math.ceil(duration / secondsPerBar) : 0

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 1

    // Vertical lines for bars
    const barWidth = (width * zoom) / totalBars
    for (let i = 0; i <= totalBars; i++) {
      const x = (i * barWidth) - scrollPosition
      if (x >= -50 && x <= width + 50) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
    }

    // Horizontal lines for beats
    const beatHeight = height / beatsPerBar
    for (let i = 0; i <= beatsPerBar; i++) {
      const y = i * beatHeight
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
  }

  const drawTimelineRuler = (ctx: CanvasRenderingContext2D, width: number) => {
    const rulerHeight = 30
    ctx.fillStyle = '#2a2a2a'
    ctx.fillRect(0, 0, width, rulerHeight)

    // Draw beat markers and numbers
    ctx.strokeStyle = '#444'
    ctx.lineWidth = 1
    ctx.font = '8px monospace'
    ctx.textAlign = 'center'
    
    for (let i = 0; i < totalBars * beatsPerBar; i++) {
      const beatTime = i * (60 / bpm)
      const x = (beatTime / duration) * width * zoom - scrollPosition
      
      if (x >= -20 && x <= width + 20) {
        const bar = Math.floor(i / beatsPerBar) + 1
        const beat = (i % beatsPerBar) + 1
        const isBarStart = beat === 1
        
        // Draw beat line
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, 10)
        ctx.stroke()
        
        // Draw beat number
        const beatText = isBarStart ? `${bar}` : `${beat}`
        const isCurrentBeatInRuler = Math.floor(currentTime / (60 / bpm)) === i
        ctx.fillStyle = isCurrentBeatInRuler ? '#ef4444' : (isBarStart ? '#4ade80' : '#666') // Red for current beat, green for bar numbers, gray for beat numbers
        ctx.fillText(beatText, x, 20)
        
        // Highlight current beat with a red background
        if (isCurrentBeatInRuler) {
          ctx.fillStyle = '#ef4444'
          ctx.fillRect(x - 8, 22, 16, 8)
          ctx.fillStyle = '#fff'
          ctx.fillText(beatText, x, 28)
        }
        
        // Draw thicker line for bar starts
        if (isBarStart) {
          ctx.strokeStyle = '#4ade80'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(x, 0)
          ctx.lineTo(x, 8)
          ctx.stroke()
          ctx.strokeStyle = '#444'
          ctx.lineWidth = 1
        }
      }
    }

    // Draw time markers at the bottom
    ctx.textAlign = 'left'
    ctx.fillStyle = '#888'
    ctx.font = '10px monospace'
    for (let i = 0; i <= Math.ceil(duration); i += 5) {
      const x = (i / duration) * width * zoom - scrollPosition
      if (x >= -50 && x <= width + 50) {
        const timeStr = formatTime(i)
        ctx.fillText(timeStr, x + 5, 28)
      }
    }
  }

  const [audioData, setAudioData] = useState<Float32Array | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Analyze audio data when audio URL changes
  useEffect(() => {
    if (!audioUrl) return

    const analyzeAudio = async () => {
      setIsAnalyzing(true)
      console.log('🎵 Starting audio analysis for:', audioUrl)
      
      try {
        const response = await fetch(audioUrl)
        console.log('📡 Fetch response status:', response.status)
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const arrayBuffer = await response.arrayBuffer()
        console.log('📦 Array buffer size:', arrayBuffer.byteLength)
        
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
        
        console.log('🎼 Audio buffer decoded:', {
          duration: audioBuffer.duration,
          sampleRate: audioBuffer.sampleRate,
          numberOfChannels: audioBuffer.numberOfChannels,
          length: audioBuffer.length
        })
        
        // Get the first channel data
        const channelData = audioBuffer.getChannelData(0)
        console.log('📊 Channel data length:', channelData.length)
        console.log('📊 Sample values (first 10):', Array.from(channelData.slice(0, 10)))
        
        setAudioData(channelData)
        setDuration(audioBuffer.duration)
        
        // Auto-fit waveform to canvas width
        if (canvasRef.current) {
          const canvas = canvasRef.current
          const canvasWidth = canvas.width
          // Calculate zoom to fit the entire audio duration to the canvas width
          const autoZoom = canvasWidth / (audioBuffer.duration * 50) // Adjusted scale factor
          console.log('🎵 Auto-fit calculation:', {
            canvasWidth,
            duration: audioBuffer.duration,
            calculatedZoom: autoZoom,
            finalZoom: Math.max(0.01, Math.min(autoZoom, 10))
          })
          setZoom(Math.max(0.01, Math.min(autoZoom, 10))) // Clamp between 0.01 and 10
          setScrollPosition(0) // Reset scroll to beginning
        }
      } catch (error) {
        console.error('❌ Error analyzing audio with fetch method:', error)
        
        // Fallback: try to analyze using the audio element
        try {
          console.log('🔄 Trying fallback method with audio element...')
          if (audioRef.current) {
            const audio = audioRef.current
            audio.crossOrigin = 'anonymous'
            
            // Create a MediaElementSource and AnalyserNode
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
            const source = audioContext.createMediaElementSource(audio)
            const analyser = audioContext.createAnalyser()
            
            analyser.fftSize = 2048
            const bufferLength = analyser.frequencyBinCount
            const dataArray = new Uint8Array(bufferLength)
            
            source.connect(analyser)
            analyser.connect(audioContext.destination)
            
            // Get frequency data
            analyser.getByteFrequencyData(dataArray)
            
            // Convert to Float32Array for consistency
            const floatData = new Float32Array(dataArray.length)
            for (let i = 0; i < dataArray.length; i++) {
              floatData[i] = (dataArray[i] - 128) / 128
            }
            
            console.log('🎵 Fallback analysis successful:', {
              dataLength: floatData.length,
              sampleValues: Array.from(floatData.slice(0, 10))
            })
            
            setAudioData(floatData)
          }
        } catch (fallbackError) {
          console.error('❌ Fallback method also failed:', fallbackError)
          setAudioData(null)
        }
      } finally {
        setIsAnalyzing(false)
      }
    }

    analyzeAudio()
  }, [audioUrl])

  const drawRealWaveform = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (!audioData || !audioRef.current) {
      console.log('🎵 No audio data available for waveform drawing')
      return
    }

    console.log('🎵 Drawing real waveform:', {
      audioDataLength: audioData.length,
      duration,
      width,
      height,
      zoom,
      scrollPosition
    })

    ctx.strokeStyle = '#4ade80'
    ctx.lineWidth = 1

    const waveformHeight = height - 30
    const centerY = 30 + waveformHeight / 2

    // Calculate samples per pixel - show full audio length
    const totalWidth = width * zoom
    const samplesPerPixel = audioData.length / totalWidth
    const startSample = Math.floor(scrollPosition * samplesPerPixel)
    const endSample = Math.min(audioData.length, startSample + Math.floor(width * samplesPerPixel))

    console.log('🎵 Waveform calculation:', {
      samplesPerPixel,
      startSample,
      endSample,
      waveformHeight,
      centerY
    })

    ctx.beginPath()
    ctx.moveTo(0, centerY)

    // Draw waveform
    for (let x = 0; x < width; x++) {
      const sampleIndex = startSample + Math.floor(x * samplesPerPixel)
      if (sampleIndex >= audioData.length) break

      // Get average amplitude for this pixel
      let sum = 0
      let count = 0
      for (let i = 0; i < Math.floor(samplesPerPixel) && sampleIndex + i < audioData.length; i++) {
        sum += Math.abs(audioData[sampleIndex + i])
        count++
      }
      
      const averageAmplitude = count > 0 ? sum / count : 0
      const amplitude = averageAmplitude * (waveformHeight / 2)
      const y = centerY + amplitude
      
      ctx.lineTo(x, y)
    }

    ctx.stroke()

    // Draw mirror waveform
    ctx.beginPath()
    ctx.moveTo(0, centerY)

    for (let x = 0; x < width; x++) {
      const sampleIndex = startSample + Math.floor(x * samplesPerPixel)
      if (sampleIndex >= audioData.length) break

      let sum = 0
      let count = 0
      for (let i = 0; i < Math.floor(samplesPerPixel) && sampleIndex + i < audioData.length; i++) {
        sum += Math.abs(audioData[sampleIndex + i])
        count++
      }
      
      const averageAmplitude = count > 0 ? sum / count : 0
      const amplitude = averageAmplitude * (waveformHeight / 2)
      const y = centerY - amplitude
      
      ctx.lineTo(x, y)
    }

    ctx.stroke()
  }

  const drawSimplifiedWaveform = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (!audioRef.current) return

    ctx.strokeStyle = '#4ade80'
    ctx.lineWidth = 2

    const waveformHeight = height - 30
    const centerY = 30 + waveformHeight / 2

    ctx.beginPath()
    ctx.moveTo(0, centerY)

    // Create a simplified waveform based on time
    for (let x = 0; x < width; x++) {
      const time = (x + scrollPosition) / zoom / width * duration
      const amplitude = Math.sin(time * 10) * Math.exp(-time * 0.1) * 50
      const y = centerY + amplitude
      ctx.lineTo(x, y)
    }

    ctx.stroke()
  }

  const drawPlayhead = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const playheadX = (currentTime / duration) * width * zoom - scrollPosition
    
    if (playheadX >= -10 && playheadX <= width + 10) {
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(playheadX, 0)
      ctx.lineTo(playheadX, height)
      ctx.stroke()
    }
  }

  const drawMarkers = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    console.log('🎯 Drawing markers, count:', markers.length)
    
    markers.forEach((marker, index) => {
      // Calculate marker position with proper zoom and scroll
      const totalWidth = width * zoom
      const x = (marker.position / duration) * totalWidth - scrollPosition
      
      console.log(`🎯 Marker ${index + 1}:`, {
        markerLabel: marker.label,
        markerPosition: marker.position,
        duration,
        totalWidth,
        scrollPosition,
        calculatedX: x,
        visible: x >= -20 && x <= width + 20
      })
      
      if (x >= -20 && x <= width + 20) {
        // Draw marker line - make it more visible like the playhead
        ctx.strokeStyle = marker.color
        ctx.lineWidth = 3 // Thicker line like playhead
        ctx.beginPath()
        ctx.moveTo(x, 0) // Start from top
        ctx.lineTo(x, height) // Go to bottom
        ctx.stroke()

        // Draw marker label background
        ctx.fillStyle = '#1a1a1a'
        ctx.fillRect(x - 30, 5, 60, 20)

        // Draw marker label
        ctx.fillStyle = marker.color
        ctx.font = '12px monospace' // Slightly larger font
        ctx.textAlign = 'center'
        ctx.fillText(marker.label, x, 18)
        
        console.log(`🎯 Successfully drew marker "${marker.label}" at x=${x}`)
      } else {
        console.log(`🎯 Marker "${marker.label}" not visible (x=${x}, outside range)`)
      }
    })
  }

  const drawPatterns = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    patterns.forEach(pattern => {
      const startX = (pattern.startBar * secondsPerBar / duration) * width * zoom - scrollPosition
      const endX = (pattern.endBar * secondsPerBar / duration) * width * zoom - scrollPosition
      const patternWidth = endX - startX

      if (endX >= -50 && startX <= width + 50) {
        // Draw pattern background
        ctx.fillStyle = `${pattern.color}20`
        ctx.fillRect(startX, 30, patternWidth, height - 30)

        // Draw pattern border
        ctx.strokeStyle = pattern.color
        ctx.lineWidth = 2
        ctx.strokeRect(startX, 30, patternWidth, height - 30)

        // Draw pattern label
        ctx.fillStyle = pattern.color
        ctx.font = '12px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(pattern.label, startX + patternWidth / 2, 50)
      }
    })
  }

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !audioRef.current) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height)

    // Draw background
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, rect.width, rect.height)

    // Draw grid
    drawGrid(ctx, rect.width, rect.height)

    // Draw timeline ruler
    drawTimelineRuler(ctx, rect.width)

    // Draw real waveform from audio data
    if (audioData && !isAnalyzing) {
      drawRealWaveform(ctx, rect.width, rect.height)
    } else {
      drawSimplifiedWaveform(ctx, rect.width, rect.height)
    }

    // Draw playhead
    drawPlayhead(ctx, rect.width, rect.height)

    // Draw markers - make sure this runs
    console.log('🎨 About to draw markers, count:', markers.length)
    drawMarkers(ctx, rect.width, rect.height)
    
    // Draw a test marker at the center to verify drawing works
    const testX = rect.width / 2
    ctx.strokeStyle = '#ff0000'
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(testX, 0)
    ctx.lineTo(testX, rect.height)
    ctx.stroke()
    console.log('🎨 Drew test marker at center:', testX)

    // Draw patterns
    drawPatterns(ctx, rect.width, rect.height)
  }, [zoom, scrollPosition, currentTime, markers, patterns, duration, totalBars, secondsPerBar, audioData, isAnalyzing])

  // Initialize audio
  useEffect(() => {
    if (audioUrl) {
      if (!audioRef.current) {
        audioRef.current = new Audio(audioUrl)
      } else {
        audioRef.current.src = audioUrl
      }

      audioRef.current.addEventListener('loadedmetadata', () => {
        setDuration(audioRef.current?.duration || 0)
      })

      audioRef.current.addEventListener('timeupdate', () => {
        setCurrentTime(audioRef.current?.currentTime || 0)
      })

      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false)
        setCurrentTime(0)
      })
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [audioUrl])

  // Animation loop for waveform
  useEffect(() => {
    const animate = () => {
      if (canvasRef.current && audioRef.current) {
        drawWaveform()
      }
      animationRef.current = requestAnimationFrame(animate)
    }

    if (isPlaying) {
      animate()
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying, drawWaveform])

  const handlePlayPause = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent spacebar from scrolling the page
      if (e.code === 'Space') {
        e.preventDefault()
        handlePlayPause()
      }
    }

    // Add event listener to the document
    document.addEventListener('keydown', handleKeyDown)

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isPlaying]) // Re-add listener when isPlaying changes

  const handleSeek = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!audioRef.current || !canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const newTime = ((x + scrollPosition) / zoom / rect.width) * duration
    const clampedTime = Math.max(0, Math.min(duration, newTime))
    
    // If marker tool is selected, add a marker at the clicked position
    if (selectedTool === 'marker') {
      const markerLabel = prompt('Enter marker label:')
      if (markerLabel && markerLabel.trim()) {
        const newMarker: Marker = {
          id: Date.now().toString(),
          position: clampedTime,
          label: markerLabel.trim(),
          color: '#3b82f6'
        }
        setMarkers(prev => [...prev, newMarker])
        onMarkerAdd?.(clampedTime, markerLabel.trim())
        console.log('🎯 Added marker at:', clampedTime, 'with label:', markerLabel)
      }
    } else {
      // Otherwise, just seek to the position
      audioRef.current.currentTime = clampedTime
    }
  }

  const handleAddMarker = () => {
    if (!newMarkerLabel.trim()) return

    const newMarker: Marker = {
      id: Date.now().toString(),
      position: currentTime,
      label: newMarkerLabel,
      color: '#3b82f6'
    }

    setMarkers(prev => [...prev, newMarker])
    setNewMarkerLabel('')
    setShowAddMarker(false)
    onMarkerAdd?.(currentTime, newMarkerLabel)
  }

  const handleAddPattern = () => {
    if (!newPatternLabel.trim()) return

    const currentBar = Math.floor(currentTime / secondsPerBar)
    const newPattern: Pattern = {
      id: Date.now().toString(),
      startBar: currentBar,
      endBar: currentBar + 1,
      label: newPatternLabel,
      color: '#8b5cf6'
    }

    setPatterns(prev => [...prev, newPattern])
    setNewPatternLabel('')
    setShowAddPattern(false)
    onPatternAdd?.(currentBar, currentBar + 1, newPatternLabel)
  }

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 10))
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.01))
  
  const handleFitToView = () => {
    if (canvasRef.current && duration > 0) {
      const canvas = canvasRef.current
      const canvasWidth = canvas.width
      const autoZoom = canvasWidth / (duration * 50) // Same calculation as auto-fit
      console.log('🎵 Manual fit calculation:', {
        canvasWidth,
        duration,
        calculatedZoom: autoZoom,
        finalZoom: Math.max(0.01, Math.min(autoZoom, 10))
      })
      setZoom(Math.max(0.01, Math.min(autoZoom, 10)))
      setScrollPosition(0)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5" />
            Audio Waveform Editor
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoom <= 0.1}
            >
              <Minus className="w-4 h-4" />
            </Button>
            <span className="text-sm text-gray-500 w-16 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              disabled={zoom >= 10}
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleFitToView}
              title="Fit to view"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Transport Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = Math.max(0, currentTime - 5)
              }
            }}
          >
            <SkipBack className="w-4 h-4" />
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handlePlayPause}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = Math.min(duration, currentTime + 5)
              }
            }}
          >
            <SkipForward className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-500">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* Musical Properties */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>BPM</Label>
            <Input
              type="number"
              value={bpm}
              onChange={(e) => onBpmChange?.(parseInt(e.target.value) || 120)}
              onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
              min="60"
              max="200"
            />
          </div>
          <div>
            <Label>Key</Label>
            <Input
              value={musicalKey}
              onChange={(e) => onKeyChange?.(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
              placeholder="C, Am, F#"
            />
          </div>
          <div>
            <Label>Time Signature</Label>
            <Input
              value={timeSignature}
              onChange={(e) => onTimeSignatureChange?.(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
              placeholder="4/4, 3/4"
            />
          </div>
        </div>

        {/* Tool Selection */}
        <div className="flex items-center gap-2">
          <Label className="text-sm">Tools:</Label>
          <Button
            variant={selectedTool === 'select' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedTool('select')}
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button
            variant={selectedTool === 'marker' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedTool('marker')}
          >
            <Edit3 className="w-4 h-4" />
          </Button>
          <Button
            variant={selectedTool === 'pattern' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedTool('pattern')}
          >
            <Layers className="w-4 h-4" />
          </Button>
        </div>

        {/* Waveform Canvas */}
        <div 
          ref={containerRef}
          className="relative border border-gray-700 rounded-lg overflow-hidden bg-gray-900"
          style={{ height: '300px' }}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-crosshair"
            onClick={handleSeek}
            style={{ touchAction: 'none' }}
          />
          
          {/* Loading overlay */}
          {isAnalyzing && (
            <div className="absolute inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto mb-2"></div>
                <p className="text-sm text-gray-300">Analyzing audio...</p>
              </div>
            </div>
          )}
          
          {/* Overlay for tool interactions */}
          {selectedTool === 'marker' && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-xs">
                Click to add marker
              </div>
            </div>
          )}
          
          {selectedTool === 'pattern' && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-2 left-2 bg-purple-600 text-white px-2 py-1 rounded text-xs">
                Click to add pattern
              </div>
            </div>
          )}
        </div>

        {/* Timeline Info */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-4">
            <span>Total Bars: {totalBars}</span>
            <span>Bar Duration: {secondsPerBar.toFixed(2)}s</span>
            <span>Beats per Bar: {beatsPerBar}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Current Bar: {Math.floor(currentTime / secondsPerBar) + 1}</span>
          </div>
        </div>

        {/* Sequencer Grid */}
        <div className="border border-gray-700 rounded-lg overflow-hidden bg-gray-900">
          <div className="p-2 bg-gray-800 border-b border-gray-700">
            <h3 className="text-sm font-semibold text-gray-300">Sequencer Grid</h3>
          </div>
          <div className="p-4">
            <div 
              className="grid gap-1"
              style={{ 
                gridTemplateColumns: `repeat(${totalBars * beatsPerBar}, minmax(0, 1fr))`,
                maxWidth: '100%',
                overflowX: 'auto'
              }}
            >
              {Array.from({ length: totalBars * beatsPerBar }, (_, i) => {
                const bar = Math.floor(i / beatsPerBar) + 1
                const beat = (i % beatsPerBar) + 1
                const beatTime = i * (60 / bpm)
                const nextBeatTime = (i + 1) * (60 / bpm)
                const isCurrentBeat = currentTime >= beatTime && currentTime < nextBeatTime
                const isBarStart = beat === 1
                
                // Calculate the exact position within the beat for visual alignment
                const beatProgress = (currentTime - beatTime) / (60 / bpm)
                const isExactPosition = Math.abs(currentTime - beatTime) < 0.1 // Within 0.1 seconds
                
                return (
                  <div
                    key={i}
                    className={`
                      aspect-square border border-gray-600 rounded cursor-pointer relative
                      ${isCurrentBeat ? 'bg-red-500 border-red-400' : 'bg-gray-800 hover:bg-gray-700'}
                      ${isBarStart ? 'border-l-2 border-l-blue-400' : ''}
                      ${isExactPosition ? 'ring-2 ring-yellow-400' : ''}
                    `}
                    onClick={() => {
                      // Jump to this beat
                      const targetTime = i * (60 / bpm)
                      if (audioRef.current) {
                        audioRef.current.currentTime = Math.min(duration, targetTime)
                      }
                    }}
                    title={`Bar ${bar}, Beat ${beat} (${formatTime(i * (60 / bpm))})`}
                  >
                    <div className="text-xs text-center text-gray-400 p-1">
                      {isBarStart ? bar : beat}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-2 text-xs text-gray-500">
              <span>Click any beat to jump to that position</span>
              <div className="mt-1 text-yellow-400">
                Current Time: {formatTime(currentTime)} | 
                Current Beat: {Math.floor(currentTime / (60 / bpm)) + 1} | 
                Beat Time: {formatTime(Math.floor(currentTime / (60 / bpm)) * (60 / bpm))} |
                Exact Beat: {Math.floor(currentTime / (60 / bpm))} |
                Beat Progress: {((currentTime % (60 / bpm)) / (60 / bpm) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Markers and Patterns Management */}
        <Tabs defaultValue="markers" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="markers">Markers ({markers.length})</TabsTrigger>
            <TabsTrigger value="patterns">Patterns ({patterns.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="markers" className="space-y-2">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => setShowAddMarker(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Marker
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  // Add a test marker at current time
                  const testMarker: Marker = {
                    id: Date.now().toString(),
                    position: currentTime,
                    label: `Test ${markers.length + 1}`,
                    color: '#ef4444' // Red color like playhead
                  }
                  setMarkers(prev => [...prev, testMarker])
                  console.log('🎯 Added test marker:', testMarker)
                }}
              >
                Test Marker
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current.currentTime = Math.max(0, currentTime - 5)
                  }
                }}
              >
                <SkipBack className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current.currentTime = Math.min(duration, currentTime + 5)
                  }
                }}
              >
                <SkipForward className="w-4 h-4" />
              </Button>
            </div>
            
            {markers.map(marker => (
              <div key={marker.id} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: marker.color }}
                  />
                  <span className="text-sm">{marker.label}</span>
                  <span className="text-xs text-gray-500">
                    {formatTime(marker.position)}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setMarkers(prev => prev.filter(m => m.id !== marker.id))}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="patterns" className="space-y-2">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => setShowAddPattern(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Pattern
              </Button>
            </div>
            
            {patterns.map(pattern => (
              <div key={pattern.id} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: pattern.color }}
                  />
                  <span className="text-sm">{pattern.label}</span>
                  <span className="text-xs text-gray-500">
                    Bars {pattern.startBar + 1}-{pattern.endBar}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setPatterns(prev => prev.filter(p => p.id !== pattern.id))}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </TabsContent>
        </Tabs>

        {/* Add Marker Dialog */}
        {showAddMarker && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-4 rounded-lg w-80">
              <h3 className="text-lg font-semibold mb-4">Add Marker</h3>
              <Input
                placeholder="Marker label"
                value={newMarkerLabel}
                onChange={(e) => setNewMarkerLabel(e.target.value)}
                className="mb-4"
              />
              <div className="flex gap-2">
                <Button onClick={handleAddMarker} disabled={!newMarkerLabel.trim()}>
                  Add
                </Button>
                <Button variant="outline" onClick={() => setShowAddMarker(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Add Pattern Dialog */}
        {showAddPattern && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-4 rounded-lg w-80">
              <h3 className="text-lg font-semibold mb-4">Add Pattern</h3>
              <Input
                placeholder="Pattern label"
                value={newPatternLabel}
                onChange={(e) => setNewPatternLabel(e.target.value)}
                className="mb-4"
              />
              <div className="flex gap-2">
                <Button onClick={handleAddPattern} disabled={!newPatternLabel.trim()}>
                  Add
                </Button>
                <Button variant="outline" onClick={() => setShowAddPattern(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 