import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, Play, Pause, RotateCcw, Grid3X3, Scissors, Move } from 'lucide-react'

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
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    // Set the total canvas width to accommodate all steps with zoom
    const pixelsPerStep = 80 // Minimum pixels per step for visibility
    const baseCanvasWidth = Math.max(rect.width, steps * pixelsPerStep)
    const totalCanvasWidth = baseCanvasWidth * zoom
    canvas.width = totalCanvasWidth * window.devicePixelRatio
    canvas.style.width = `${totalCanvasWidth}px`
    
    // Only update viewWidth if it actually changed
    if (viewWidth !== rect.width) {
      setViewWidth(rect.width)
    }
    
    console.log(`[CANVAS] Steps: ${steps}, Total Duration: ${totalDuration}s, Canvas Width: ${totalCanvasWidth}px, Pixels per Step: ${totalCanvasWidth / steps}`)

    console.log(`[WAVEFORM DRAW] Canvas: ${rect.width}x${rect.height}, Total Width: ${totalCanvasWidth}, Points: ${waveformData.length}, Duration: ${duration}s, Total Steps: ${steps}`)

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height)

    // Draw background
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, rect.width, rect.height)

    // Draw grid lines with step numbers for all steps
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 1
    ctx.setLineDash([2, 2])
    
    gridLines.forEach((time: number, stepIndex: number) => {
      const x = (time / totalDuration) * totalCanvasWidth
      
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
      
      // Draw step number at bottom
      ctx.fillText(stepIndex.toString(), x, rect.height - 10)
      
      ctx.setLineDash([2, 2])
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

    // Draw playhead
    if (isPlaying) {
      const playheadX = (currentTime / totalDuration) * totalCanvasWidth
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.moveTo(playheadX, 0)
      ctx.lineTo(playheadX, rect.height)
      ctx.stroke()
      ctx.setLineDash([])
    }
      }, [waveformData, duration, totalDuration, startTime, endTime, currentTime, isPlaying, currentStep, stepDuration, steps, zoom, viewWidth, waveformOffset])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      drawWaveform()
    }, 16) // ~60fps debounce
    
    return () => clearTimeout(timeoutId)
  }, [drawWaveform])

  // Handle mouse events for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const time = (x / rect.width) * totalDuration
    
    const startX = (startTime / totalDuration) * rect.width
    const endX = (endTime / totalDuration) * rect.width
    const handleSize = 8

    // Check if clicking on handles
    if (Math.abs(x - startX) < handleSize) {
      dragTypeRef.current = 'start'
    } else if (Math.abs(x - endX) < handleSize) {
      dragTypeRef.current = 'end'
    } else if (x > startX && x < endX) {
      dragTypeRef.current = 'move'
    } else {
      dragTypeRef.current = null
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
      audioRef.current.currentTime = startTime
      audioRef.current.playbackRate = playbackRate
      audioRef.current.play()
      setIsPlaying(true)
      
      const updatePlayhead = () => {
        if (audioRef.current && isPlaying) {
          const time = audioRef.current.currentTime
          setCurrentTime(time)
          
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

  // Reset to original
  const resetToOriginal = () => {
    setStartTime(0)
    setEndTime(totalDuration) // Use full transport steps instead of just audio duration
    setPlaybackRate(1)
    setWaveformOffset(0) // Also reset waveform timing
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Grid3X3 className="w-5 h-5" />
            Quantize Loop: {track?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Controls */}
          <div className="flex items-center gap-4 p-4 bg-gray-900 rounded-lg">
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
            <Label className="text-sm text-gray-300">Zoom:</Label>
            <Slider
              value={[zoom]}
              onValueChange={(value) => setZoom(value[0])}
              min={0.1}
              max={3}
              step={0.1}
              className="flex-1"
            />
            <span className="text-sm font-mono text-gray-300 min-w-[3rem]">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Waveform Timing Control */}
          <div className="flex items-center gap-4 p-4 bg-gray-900 rounded-lg">
            <Label className="text-sm text-gray-300">Waveform Timing:</Label>
            <Slider
              value={[waveformOffset]}
              onValueChange={(value) => setWaveformOffset(value[0])}
              min={-totalDuration / 2}
              max={totalDuration / 2}
              step={stepDuration / 4}
              className="flex-1"
            />
            <span className="text-sm font-mono text-gray-300 min-w-[4rem]">
              {waveformOffset.toFixed(2)}s
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setWaveformOffset(0)}
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
              <div className="relative overflow-x-auto">
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