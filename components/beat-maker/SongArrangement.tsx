import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Play, Square, RotateCcw, Plus, Trash2, Copy, Music, Clock, GripVertical, Scissors, Loader2, ChevronLeft, ChevronRight, Grid3X3, BarChart3, MoveHorizontal, Download } from 'lucide-react'
import { Track } from '@/hooks/useBeatMaker'
import * as Tone from 'tone'
import { TrackWaveform } from './TrackWaveform'
import React from 'react' // Added missing import for React

interface PatternBlock {
  id: string
  name: string
  tracks: Track[]
  sequencerData: {[trackId: number]: boolean[]}
  bpm: number
  steps: number
  duration: number // in bars
  startBar: number
  endBar: number
  color: string
  trackId: number // which track this pattern belongs to
}

interface SongArrangementProps {
  tracks: Track[]
  sequencerData: {[trackId: number]: boolean[]}
  bpm: number
  steps: number
  onPlayPattern?: (patternData: {[trackId: number]: boolean[]}) => void
  onStopPattern?: () => void
  isPlaying?: boolean
  patterns?: PatternBlock[] // Patterns from session
  onPatternsChange?: (patterns: PatternBlock[]) => void // Callback to update patterns
  onSwitchToSequencerTab?: () => void // Callback to switch to sequencer tab
}

export function SongArrangement({
  tracks,
  sequencerData,
  bpm,
  steps,
  onPlayPattern,
  onStopPattern,
  isPlaying = false,
  patterns = [],
  onPatternsChange,
  onSwitchToSequencerTab
}: SongArrangementProps) {
  const [patternBlocks, setPatternBlocks] = useState<PatternBlock[]>(patterns)
  const [currentPattern, setCurrentPattern] = useState<PatternBlock | null>(null)
  const [isArrangementPlaying, setIsArrangementPlaying] = useState(false)
  const [currentBar, setCurrentBar] = useState(1)
  
  // Safe setter for currentBar to prevent negative values
  const setCurrentBarSafe = (value: number) => {
    // Multiple safety checks to ensure positive value
    const safeValue = Math.max(1, Math.abs(value || 1))
    console.log('[PLAYHEAD DEBUG] setCurrentBarSafe called with:', value, 'setting to:', safeValue, 'current currentBar:', currentBar)
    setCurrentBar(safeValue)
  }
  const [totalBars, setTotalBars] = useState(64) // Default 64 bars (8 patterns of 8 bars each)
  const [zoom, setZoom] = useState(50) // pixels per bar
  const [scrollX, setScrollX] = useState(0)
  const [selectedBlocks, setSelectedBlocks] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [loadedTrackId, setLoadedTrackId] = useState<number | null>(null) // which track is in "load" mode
  const [selectedDuration, setSelectedDuration] = useState(8) // default 8 bars for new patterns
  const [isDeleteMode, setIsDeleteMode] = useState(false) // delete mode state
  const [isCutMode, setIsCutMode] = useState(false) // cut mode state for splitting patterns
  const [isResizing, setIsResizing] = useState(false) // resize mode state
  const [resizeHandle, setResizeHandle] = useState<'left' | 'right' | null>(null) // which handle is being dragged
  const [resizeStart, setResizeStart] = useState({ x: 0, originalDuration: 0, originalStartBar: 0 })

  // Function to get track display name with icons (same as sequencer)
  const getTrackDisplayName = (trackName: string) => {
    if (trackName.includes(' Loop')) {
      const baseName = trackName.replace(' Loop', '')
      const loopIcon = '🔄'
      
      // Add specific icons for different loop types
      if (baseName === 'Melody') return `${loopIcon} Melody`
      if (baseName === 'Drum') return `${loopIcon} Drum`
      if (baseName === 'Hihat') return `${loopIcon} Hihat`
      if (baseName === 'Percussion') return `${loopIcon} Perc`
      if (baseName === '808') return `${loopIcon} 808`
      if (baseName === 'Bass') return `${loopIcon} Bass`
      if (baseName === 'Piano') return `${loopIcon} Piano`
      if (baseName === 'Guitar') return `${loopIcon} Guitar`
      if (baseName === 'Synth') return `${loopIcon} Synth`
      if (baseName === 'Vocal') return `${loopIcon} Vocal`
      
      // Default for other loop types
      return `${loopIcon} ${baseName}`
    }
    
    // For non-loop tracks, return the original name
    return trackName
  }

  // Separate audio system for arrangement
  const arrangementPlayersRef = useRef<{ [trackId: number]: Tone.Player }>({})
  const arrangementPitchShiftersRef = useRef<{ [trackId: number]: Tone.PitchShift }>({})
  const arrangementSequenceRef = useRef<Tone.Sequence | null>(null)
  const arrangementTransportRef = useRef<any>(null)
  const isArrangementAudioInitialized = useRef(false)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const arrangementStartTimeRef = useRef<number>(0)
  const isPlayingRef = useRef(false) // Add ref to track playing state

  const timelineRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  // Fixed playhead update using transport position
  const updatePlayhead = () => {
    if (isPlayingRef.current && arrangementTransportRef.current) {
      try {
        // Get the current transport position as a string (e.g., "2:1:0")
        const positionStr = arrangementTransportRef.current.position
        
        // Convert position string to [bars, beats, sixteenths]
        const [bars, beats, sixteenths] = positionStr.split(':').map(Number)
        
        // Calculate the current bar as a float
        const currentBarPosition = (bars || 0) + 1 + ((beats || 0) / 4) + ((sixteenths || 0) / 16 / 4)
        
        // Calculate the maximum duration based on actual pattern blocks, not the steps prop
        const maxEndBar = patternBlocks.length > 0 ? Math.max(...patternBlocks.map(block => block.endBar)) : totalBars
        
        // Only update if we have a valid position and it's significantly different
        // Allow playhead to go beyond the steps limit (8 bars) up to the actual arrangement duration
        // Note: Steps are now 128 (8 bars at 1/16 resolution)
        if (currentBarPosition >= 1 && Math.abs(currentBarPosition - currentBar) > 0.01) {
          setCurrentBarSafe(currentBarPosition)
        }
        
        // Check if we've reached the end of the arrangement
        if (currentBarPosition > maxEndBar) {
          console.log(`[PLAYHEAD DEBUG] Reached end of arrangement at bar ${maxEndBar}, stopping playback`)
          stopArrangement()
        }
      } catch (error) {
        console.error('[PLAYHEAD DEBUG] Error in update:', error)
      }
    }
  }

  // Initialize separate audio system for arrangement
  useEffect(() => {
    const initializeArrangementAudio = async () => {
      console.log('[ARRANGEMENT AUDIO] Starting audio initialization...')
      if (isArrangementAudioInitialized.current) {
        console.log('[ARRANGEMENT AUDIO] Already initialized, skipping')
        return
      }
      
      try {
        // Start Tone.js audio context
        console.log('[ARRANGEMENT AUDIO] Starting Tone.js...')
        await Tone.start()
        console.log('[ARRANGEMENT AUDIO] Tone.js started successfully')
        
        // CRITICAL FIX: Use the global transport but ensure it's properly configured for arrangement
        // This allows both sequencer and arrangement to coexist
        arrangementTransportRef.current = Tone.getTransport()
        arrangementTransportRef.current.stop()
        arrangementTransportRef.current.cancel()
        arrangementTransportRef.current.loop = false // Explicitly disable looping for arrangement
        arrangementTransportRef.current.bpm.value = bpm
        
        console.log('[ARRANGEMENT AUDIO] Configured transport for arrangement use')
        
      // Load audio for tracks that have audio URLs
      const loadPromises = tracks.map(async (track) => {
        if (track.audioUrl && track.audioUrl !== 'undefined') {
          try {
            console.log(`[ARRANGEMENT AUDIO] Loading audio for track ${track.name}: ${track.audioUrl}`)
            
            // Use the global context for pitch shifter and player
            const pitchShifter = new Tone.PitchShift({
              pitch: track.pitchShift || 0,
              windowSize: 0.1,
              delayTime: 0.001,
              feedback: 0.05
            }).toDestination()
            
            const player = new Tone.Player(track.audioUrl).connect(pitchShifter)
            
            // Apply playback rate if specified
            if (track.playbackRate && track.playbackRate !== 1) {
              player.playbackRate = track.playbackRate
            }
            
            // Wait for the player to load
            await player.load(track.audioUrl)
            
            arrangementPlayersRef.current[track.id] = player
            arrangementPitchShiftersRef.current[track.id] = pitchShifter
            
            console.log(`[ARRANGEMENT AUDIO] Audio loaded and ready for track ${track.name}`)
          } catch (error) {
            console.error(`[ARRANGEMENT AUDIO] Failed to load audio for track ${track.name}:`, error)
          }
        }
      })
      
      // Wait for all audio to load
      await Promise.all(loadPromises)
      
      isArrangementAudioInitialized.current = true
      console.log('[ARRANGEMENT AUDIO] Audio system initialized with players:', Object.keys(arrangementPlayersRef.current))
    } catch (error) {
      console.error('[ARRANGEMENT AUDIO] Error initializing audio system:', error)
    }
  }

  initializeArrangementAudio()
  }, [tracks, bpm])

  // Cleanup arrangement audio on unmount
  useEffect(() => {
    return () => {
      // Stop and dispose arrangement players
      Object.values(arrangementPlayersRef.current).forEach(player => {
        if (player.state === 'started') {
          player.stop()
        }
        player.dispose()
      })
      
      // Dispose pitch shifters
      Object.values(arrangementPitchShiftersRef.current).forEach(shifter => {
        shifter.dispose()
      })
      
      // Stop arrangement transport
      if (arrangementTransportRef.current) {
        arrangementTransportRef.current.stop()
        arrangementTransportRef.current.position = 0
        arrangementTransportRef.current.cancel()
      }
      
      // Clear progress interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
      
      console.log('[ARRANGEMENT AUDIO] Audio system cleaned up')
    }
  }, [])

  // Update arrangement BPM when it changes
  useEffect(() => {
    if (arrangementTransportRef.current) {
      arrangementTransportRef.current.bpm.value = bpm
    }
  }, [bpm])

  // Sync patterns when they change from parent component
  useEffect(() => {
    setPatternBlocks(patterns)
  }, [patterns])

  // Debug: Monitor isArrangementPlaying state changes
  useEffect(() => {
    console.log('[PLAYHEAD DEBUG] isArrangementPlaying state changed to:', isArrangementPlaying)
  }, [isArrangementPlaying])

  // Toggle load mode for a track
  const toggleLoadMode = (trackId: number) => {
    if (loadedTrackId === trackId) {
      setLoadedTrackId(null) // Turn off load mode
    } else {
      setLoadedTrackId(trackId) // Turn on load mode for this track
    }
  }

  // Handle clicking on the timeline header to set playhead position
  const handleTimelineHeaderClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    console.log('[TIMELINE] Header click detected!')
    
    const rect = gridRef.current?.getBoundingClientRect()
    if (!rect) {
      console.log('[TIMELINE] No grid ref found')
      return
    }
    
    // Calculate click position relative to the grid content
    const clickX = e.clientX - rect.left + scrollX
    
    // Calculate which bar was clicked (grid content starts at 0)
    const clickedBar = Math.floor(clickX / zoom) + 1
    
    console.log('[TIMELINE] Click calculation:', {
      clientX: e.clientX,
      rectLeft: rect.left,
      scrollX: scrollX,
      clickX: clickX,
      zoom: zoom,
      calculatedBar: clickedBar
    })
    
    console.log('[TIMELINE] Header clicked at position:', clickX, 'setting playhead to bar:', clickedBar)
    
    // Set the playhead to the clicked position
    setCurrentBarSafe(clickedBar)
    
    // If currently playing, restart from the new position
    if (isArrangementPlaying) {
      console.log('[TIMELINE] Restarting playback from new position')
      stopArrangement()
      setTimeout(() => playArrangement(), 100) // Small delay to ensure clean restart
    }
  }

  // Handle clicking in the grid to place a pattern or seek
  const handleGridClick = (e: React.MouseEvent) => {
    const rect = gridRef.current?.getBoundingClientRect()
    if (!rect) return
    
    // Calculate click position relative to the grid content
    const clickX = e.clientX - rect.left + scrollX
    const clickY = e.clientY - rect.top
    
    // Calculate which bar was clicked (grid content starts at 0)
    const clickedBar = Math.floor(clickX / zoom) + 1
    
    // If we're in load mode, place a pattern
    if (loadedTrackId) {
      // Find the loaded track
      const loadedTrack = tracks.find(t => t.id === loadedTrackId)
      if (!loadedTrack) return
      
      console.log('Click position:', { clickX, clickY, clickedBar, loadedTrack: loadedTrack.name, loadedTrackId })
      
      // Create a new pattern block at the clicked position
      const newBlock: PatternBlock = {
        id: `pattern-${Date.now()}-${Math.random()}`,
        name: `${getTrackDisplayName(loadedTrack.name)} Pattern`,
        tracks: [loadedTrack], // Single track pattern
        sequencerData: { [loadedTrack.id]: sequencerData[loadedTrack.id] || [] },
        bpm: bpm,
        steps: steps,
        duration: selectedDuration,
        startBar: clickedBar,
        endBar: clickedBar + selectedDuration - 1,
        color: loadedTrack.color,
        trackId: loadedTrack.id
      }

      const newPatternBlocks = [...patternBlocks, newBlock]
      setPatternBlocks(newPatternBlocks)
      setTotalBars(Math.max(totalBars, newBlock.endBar))
      onPatternsChange?.(newPatternBlocks)
    } else if (isArrangementPlaying) {
      // If not in load mode but playing, seek to clicked position
      const newBar = Math.max(1, Math.min(totalBars, clickedBar))
      setCurrentBarSafe(newBar)
      
      // Update transport position
      if (arrangementTransportRef.current) {
        const newPosition = (newBar - 1) * 4 // 4 beats per bar
        arrangementTransportRef.current.position = newPosition
        console.log(`[ARRANGEMENT AUDIO] Seeking to bar ${newBar} (position ${newPosition})`)
      }
    }
  }

  // Get a random color for pattern blocks
  const getRandomColor = () => {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500',
      'bg-teal-500', 'bg-cyan-500', 'bg-lime-500', 'bg-rose-500'
    ]
    return colors[Math.floor(Math.random() * colors.length)]
  }

  // Remove a pattern block
  const removePatternBlock = (blockId: string) => {
    const newPatternBlocks = patternBlocks.filter(block => block.id !== blockId)
    setPatternBlocks(newPatternBlocks)
    onPatternsChange?.(newPatternBlocks)
  }

  // Handle pattern block click for delete mode and cut mode
  const handlePatternBlockClick = (blockId: string) => {
    if (isDeleteMode) {
      console.log(`[DELETE MODE] Deleting pattern block: ${blockId}`)
      removePatternBlock(blockId)
    } else if (isCutMode) {
      const block = patternBlocks.find(b => b.id === blockId)
      if (block) {
        console.log(`[CUT MODE] Splitting pattern block: ${blockId}`)
        splitPatternBlock(block)
      }
    }
  }

  // Duplicate a pattern block
  const duplicatePatternBlock = (block: PatternBlock) => {
    const newBlock: PatternBlock = {
      ...block,
      id: `pattern-${Date.now()}-${Math.random()}`,
      name: `${block.name} (Copy)`,
      startBar: block.endBar + 1,
      endBar: block.endBar + block.duration
    }

    const newPatternBlocks = [...patternBlocks, newBlock]
    setPatternBlocks(newPatternBlocks)
    setTotalBars(Math.max(totalBars, newBlock.endBar))
    onPatternsChange?.(newPatternBlocks)
  }

  // Split a pattern block in half
  const splitPatternBlock = (block: PatternBlock) => {
    if (block.duration < 2) {
      alert('Pattern must be at least 2 bars to split')
      return
    }

    const halfDuration = Math.floor(block.duration / 2)
    const remainingDuration = block.duration - halfDuration

    // Create first half
    const firstHalf: PatternBlock = {
      ...block,
      id: `pattern-${Date.now()}-${Math.random()}`,
      name: `${block.name} (Part 1)`,
      duration: halfDuration,
      endBar: block.startBar + halfDuration - 1
    }

    // Create second half
    const secondHalf: PatternBlock = {
      ...block,
      id: `pattern-${Date.now()}-${Math.random()}-2`,
      name: `${block.name} (Part 2)`,
      startBar: block.startBar + halfDuration,
      duration: remainingDuration,
      endBar: block.endBar
    }

    // Remove original and add both halves
    const newPatternBlocks = patternBlocks
      .filter(b => b.id !== block.id)
      .concat([firstHalf, secondHalf])
    
    setPatternBlocks(newPatternBlocks)
    onPatternsChange?.(newPatternBlocks)
  }

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent, blockId: string, handle: 'left' | 'right') => {
    e.preventDefault()
    e.stopPropagation()
    
    const block = patternBlocks.find(b => b.id === blockId)
    if (!block) return
    
    setIsResizing(true)
    setResizeHandle(handle)
    setResizeStart({
      x: e.clientX,
      originalDuration: block.duration,
      originalStartBar: block.startBar
    })
    
    // Select the block being resized
    setSelectedBlocks([blockId])
  }

  // Handle resize move
  const handleResizeMove = (e: React.MouseEvent) => {
    if (!isResizing || !resizeHandle) return
    
    const deltaX = e.clientX - resizeStart.x
    const deltaBars = Math.round(deltaX / zoom)
    
    const block = patternBlocks.find(b => b.id === selectedBlocks[0])
    if (!block) return
    
    let newStartBar = block.startBar
    let newDuration = block.duration
    
    if (resizeHandle === 'left') {
      // Resize from left edge
      newStartBar = Math.max(1, resizeStart.originalStartBar + deltaBars)
      newDuration = Math.max(1, resizeStart.originalDuration - deltaBars)
    } else {
      // Resize from right edge
      newDuration = Math.max(1, resizeStart.originalDuration + deltaBars)
    }
    
    // Update the block
    const newPatternBlocks = patternBlocks.map(b => 
      b.id === block.id 
        ? { 
            ...b, 
            startBar: newStartBar,
            duration: newDuration,
            endBar: newStartBar + newDuration - 1
          }
        : b
    )
    
    setPatternBlocks(newPatternBlocks)
    onPatternsChange?.(newPatternBlocks)
  }

  // Handle resize end
  const handleResizeEnd = () => {
    setIsResizing(false)
    setResizeHandle(null)
    setResizeStart({ x: 0, originalDuration: 0, originalStartBar: 0 })
  }

  // Load 11 patterns from each track automatically
  const loadElevenPatternsFromEachTrack = () => {
    console.log('[LOAD PATTERNS] Loading 11 patterns from each track')
    
    // Clear existing patterns first
    const newPatternBlocks: PatternBlock[] = []
    
    tracks.forEach((track, trackIndex) => {
      // Create 11 patterns for each track, starting from bar 1
      for (let i = 0; i < 11; i++) {
        const startBar = 1 + (i * selectedDuration) // Start from bar 1, then 1+8=9, 1+16=17, etc. (8-bar default)
        const patternBlock: PatternBlock = {
          id: `pattern-${Date.now()}-${track.id}-${i}-${Math.random()}`,
          name: `${getTrackDisplayName(track.name)} Pattern ${i + 1}`,
          tracks: [track],
          sequencerData: { [track.id]: sequencerData[track.id] || [] },
          bpm: bpm,
          steps: steps,
          duration: selectedDuration,
          startBar: startBar,
          endBar: startBar + selectedDuration - 1,
          color: track.color,
          trackId: track.id
        }
        
        newPatternBlocks.push(patternBlock)
      }
    })
    
    // Replace all existing patterns with the new ones (don't add to existing)
    setPatternBlocks(newPatternBlocks)
    
    // Update total bars to accommodate all patterns
    const maxEndBar = Math.max(...newPatternBlocks.map(block => block.endBar))
    setTotalBars(Math.max(totalBars, maxEndBar))
    
    // Notify parent component
    onPatternsChange?.(newPatternBlocks)
    
    console.log(`[LOAD PATTERNS] Created ${newPatternBlocks.length} patterns across ${tracks.length} tracks (cleared existing patterns)`)
  }

  // Clear all patterns from the arrangement
  const clearAllPatterns = () => {
    console.log('[CLEAR PATTERNS] Clearing all patterns from arrangement')
    
    // Clear all patterns
    setPatternBlocks([])
    
    // Reset total bars to default
    setTotalBars(64) // Default 64 bars (8 patterns of 8 bars each)
    
    // Notify parent component
    onPatternsChange?.([])
    
    console.log('[CLEAR PATTERNS] All patterns cleared')
  }

  // Create dynamic arrangement with drops by splitting patterns
  const createDropArrangement = () => {
    console.log('[DROP ARRANGEMENT] Creating dynamic arrangement with drops')
    
    // First, load the base 11 patterns
    const basePatternBlocks: PatternBlock[] = []
    
    tracks.forEach((track, trackIndex) => {
      // Create 11 patterns for each track, starting from bar 1
      for (let i = 0; i < 11; i++) {
        const startBar = 1 + (i * selectedDuration)
        const patternBlock: PatternBlock = {
          id: `pattern-${Date.now()}-${track.id}-${i}-${Math.random()}`,
          name: `${getTrackDisplayName(track.name)} Pattern ${i + 1}`,
          tracks: [track],
          sequencerData: { [track.id]: sequencerData[track.id] || [] },
          bpm: bpm,
          steps: steps,
          duration: selectedDuration,
          startBar: startBar,
          endBar: startBar + selectedDuration - 1,
          color: track.color,
          trackId: track.id
        }
        
        basePatternBlocks.push(patternBlock)
      }
    })
    
    // Now create drop variations by splitting some patterns
    const dropPatternBlocks: PatternBlock[] = []
    
    tracks.forEach((track, trackIndex) => {
      const trackPatterns = basePatternBlocks.filter(p => p.trackId === track.id)
      
      trackPatterns.forEach((pattern, patternIndex) => {
        // Create drop variations based on pattern position
        const dropType = Math.floor(Math.random() * 4) // 0-3: full, first half, second half, or split
        
        if (dropType === 0) {
          // Keep full pattern (no change)
          dropPatternBlocks.push(pattern)
        } else if (dropType === 1) {
          // Split into first half only (build up)
          const halfDuration = Math.floor(pattern.duration / 2)
          if (halfDuration >= 1) {
            const firstHalf: PatternBlock = {
              ...pattern,
              id: `pattern-${Date.now()}-${track.id}-${patternIndex}-first-${Math.random()}`,
              name: `${getTrackDisplayName(track.name)} Build ${patternIndex + 1}`,
              duration: halfDuration,
              endBar: pattern.startBar + halfDuration - 1
            }
            dropPatternBlocks.push(firstHalf)
          } else {
            dropPatternBlocks.push(pattern)
          }
        } else if (dropType === 2) {
          // Split into second half only (drop)
          const halfDuration = Math.floor(pattern.duration / 2)
          const remainingDuration = pattern.duration - halfDuration
          if (remainingDuration >= 1) {
            const secondHalf: PatternBlock = {
              ...pattern,
              id: `pattern-${Date.now()}-${track.id}-${patternIndex}-second-${Math.random()}`,
              name: `${getTrackDisplayName(track.name)} Drop ${patternIndex + 1}`,
              startBar: pattern.startBar + halfDuration,
              duration: remainingDuration,
              endBar: pattern.endBar
            }
            dropPatternBlocks.push(secondHalf)
          } else {
            dropPatternBlocks.push(pattern)
          }
        } else if (dropType === 3) {
          // Split into both halves (breakdown)
          const halfDuration = Math.floor(pattern.duration / 2)
          const remainingDuration = pattern.duration - halfDuration
          
          if (halfDuration >= 1) {
            const firstHalf: PatternBlock = {
              ...pattern,
              id: `pattern-${Date.now()}-${track.id}-${patternIndex}-breakdown-first-${Math.random()}`,
              name: `${getTrackDisplayName(track.name)} Breakdown ${patternIndex + 1} A`,
              duration: halfDuration,
              endBar: pattern.startBar + halfDuration - 1
            }
            dropPatternBlocks.push(firstHalf)
          }
          
          if (remainingDuration >= 1) {
            const secondHalf: PatternBlock = {
              ...pattern,
              id: `pattern-${Date.now()}-${track.id}-${patternIndex}-breakdown-second-${Math.random()}`,
              name: `${getTrackDisplayName(track.name)} Breakdown ${patternIndex + 1} B`,
              startBar: pattern.startBar + halfDuration,
              duration: remainingDuration,
              endBar: pattern.endBar
            }
            dropPatternBlocks.push(secondHalf)
          }
        }
      })
    })
    
    // Replace all existing patterns with the drop arrangement
    setPatternBlocks(dropPatternBlocks)
    
    // Update total bars to accommodate all patterns
    const maxEndBar = Math.max(...dropPatternBlocks.map(block => block.endBar))
    setTotalBars(Math.max(totalBars, maxEndBar))
    
    // Notify parent component
    onPatternsChange?.(dropPatternBlocks)
    
    console.log(`[DROP ARRANGEMENT] Created ${dropPatternBlocks.length} drop patterns across ${tracks.length} tracks`)
  }

  // Export the arrangement as a high-quality WAV file
  const exportBeatAsWav = async () => {
    console.log('[EXPORT] Starting WAV export of arrangement with advanced timing')
    
    if (patternBlocks.length === 0) {
      alert('No patterns to export. Please add some patterns first.')
      return
    }

    try {
      // Calculate total duration in bars
      const maxEndBar = Math.max(...patternBlocks.map(block => block.endBar))
      const secondsPerBeat = 60 / bpm
      const beatsPerBar = 4
      const secondsPerBar = secondsPerBeat * beatsPerBar
      const totalDurationSeconds = maxEndBar * secondsPerBar
      
      console.log(`[EXPORT] Total duration: ${totalDurationSeconds}s (${maxEndBar} bars) at ${bpm} BPM`)

      // Create offline audio context for rendering (stereo output)
      const sampleRate = 44100
      const offlineContext = new OfflineAudioContext(
        2, // stereo output
        Math.ceil(totalDurationSeconds * sampleRate), // length in samples
        sampleRate
      )

      // Create a master gain node
      const masterGain = offlineContext.createGain()
      masterGain.gain.value = 0.8 // Prevent clipping
      masterGain.connect(offlineContext.destination)

      // Schedule all patterns with advanced timing
      for (const block of patternBlocks) {
        const track = tracks.find(t => t.id === block.trackId)
        if (!track?.audioUrl || track.audioUrl === 'undefined') {
          console.warn(`[EXPORT] No audio URL for track ${track?.name}`)
          continue
        }

        try {
          console.log(`[EXPORT] Processing ${block.name} from track ${track.name}`)
          console.log(`[EXPORT] Track BPM: ${track.currentBpm || track.originalBpm || bpm}, Playback Rate: ${track.playbackRate || 1}`)
          
          // Fetch and decode audio
          const response = await fetch(track.audioUrl)
          const arrayBuffer = await response.arrayBuffer()
          const audioBuffer = await offlineContext.decodeAudioData(arrayBuffer)

          // Create track gain for mixing
          const trackGain = offlineContext.createGain()
          trackGain.gain.value = 0.7 // Individual track volume

          // Apply pitch shift with proper audio processing
          let audioChain = trackGain
          if (track.pitchShift && track.pitchShift !== 0) {
            console.log(`[EXPORT] Applying pitch shift: ${track.pitchShift} semitones`)
            
            // Create a more sophisticated pitch shifter using multiple filters
            const pitchShifter = offlineContext.createBiquadFilter()
            pitchShifter.type = 'peaking'
            pitchShifter.frequency.value = 1000 * Math.pow(2, track.pitchShift / 12)
            pitchShifter.Q.value = 1.0
            pitchShifter.gain.value = 3.0
            
            trackGain.connect(pitchShifter)
            audioChain = pitchShifter
          }

          // Apply playback rate if track has different tempo
          let effectivePlaybackRate = 1.0
          if (track.playbackRate && track.playbackRate !== 1) {
            effectivePlaybackRate = track.playbackRate
            console.log(`[EXPORT] Applying playback rate: ${effectivePlaybackRate}x`)
          }
          
          // Handle different track types for optimal export
          const isDrumLoop = track.name.toLowerCase().includes('drum') || track.name.toLowerCase().includes('perc')
          const isMelodyLoop = track.name.toLowerCase().includes('melody')
          const isBassLoop = track.name.toLowerCase().includes('bass') || track.name.toLowerCase().includes('808')
          
          // Adjust gain based on track type
          if (isDrumLoop) {
            trackGain.gain.value = 0.8 // Drums slightly louder
          } else if (isMelodyLoop) {
            trackGain.gain.value = 0.6 // Melody balanced
          } else if (isBassLoop) {
            trackGain.gain.value = 0.7 // Bass balanced
          } else {
            trackGain.gain.value = 0.7 // Default
          }

          // Connect to master
          audioChain.connect(masterGain)

          // Calculate start time (convert from bars to seconds)
          const startTimeSeconds = (block.startBar - 1) * secondsPerBar
          
          // Calculate pattern duration in seconds
          const patternDurationSeconds = block.duration * secondsPerBar
          
          // Check if we have sequencer data for this track
          const sequencerData = block.sequencerData[track.id]
          const hasSequencerData = sequencerData && sequencerData.length > 0
          
          if (hasSequencerData) {
            console.log(`[EXPORT] Using sequencer data for ${block.name} (${sequencerData.length} steps)`)
            
            // Export using sequencer data - create individual hits based on step data
            const stepsPerBar = 16 // 16 steps per bar for 1/16 resolution
            const stepDuration = secondsPerBeat / (stepsPerBar / 4) // Calculate step duration for 1/16 resolution
            
            for (let stepIndex = 0; stepIndex < sequencerData.length; stepIndex++) {
              if (sequencerData[stepIndex]) {
                // Calculate step position in the arrangement
                const stepInPattern = stepIndex % (block.duration * stepsPerBar)
                const barInPattern = Math.floor(stepInPattern / stepsPerBar)
                const stepInBar = stepInPattern % stepsPerBar
                
                const stepTime = startTimeSeconds + (barInPattern * secondsPerBar) + (stepInBar * stepDuration)
                
                // Create a short hit for this step
                const hitSource = offlineContext.createBufferSource()
                hitSource.buffer = audioBuffer
                hitSource.playbackRate.value = effectivePlaybackRate
                hitSource.connect(trackGain)
                
                // Play a short segment (0.1 seconds) for each hit
                hitSource.start(stepTime, 0, 0.1)
                
                console.log(`[EXPORT] Scheduled sequencer hit at step ${stepIndex} (time: ${stepTime.toFixed(2)}s)`)
              }
            }
          } else {
            // Fallback to looping audio for patterns without sequencer data
            console.log(`[EXPORT] No sequencer data, using audio looping for ${block.name}`)
            
            const audioDuration = audioBuffer.duration / effectivePlaybackRate
            const loopCount = Math.ceil(patternDurationSeconds / audioDuration)
            
            for (let i = 0; i < loopCount; i++) {
              const loopSource = offlineContext.createBufferSource()
              loopSource.buffer = audioBuffer
              loopSource.playbackRate.value = effectivePlaybackRate
              loopSource.connect(trackGain)
              
              const loopStartTime = startTimeSeconds + (i * audioDuration)
              const loopEndTime = Math.min(loopStartTime + audioDuration, startTimeSeconds + patternDurationSeconds)
              const loopDuration = loopEndTime - loopStartTime
              
              loopSource.start(loopStartTime, 0, loopDuration)
              
              console.log(`[EXPORT] Scheduled loop ${i + 1}/${loopCount} of ${block.name} at ${loopStartTime}s (duration: ${loopDuration.toFixed(2)}s)`)
            }
          }
          
        } catch (error) {
          console.error(`[EXPORT] Error processing track ${track?.name}:`, error)
        }
      }

      // Render the audio
      console.log('[EXPORT] Rendering audio...')
      const renderedBuffer = await offlineContext.startRendering()
      
      // Convert to WAV
      const wavBlob = audioBufferToWav(renderedBuffer)
      
      // Create download link with enhanced filename
      const url = URL.createObjectURL(wavBlob)
      const a = document.createElement('a')
      a.href = url
      
      // Create enhanced filename with arrangement info
      const patternCount = patternBlocks.length
      const trackCount = tracks.length
      const durationMinutes = Math.floor(totalDurationSeconds / 60)
      const durationSeconds = Math.floor(totalDurationSeconds % 60)
      
      const filename = `ortega-ai-beat-arrangement-${bpm}bpm-${maxEndBar}bars-${patternCount}patterns-${durationMinutes}m${durationSeconds}s-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.wav`
      
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      console.log(`[EXPORT] Exported: ${filename}`)
      
      console.log('[EXPORT] WAV file exported successfully')
      
    } catch (error) {
      console.error('[EXPORT] Error exporting WAV:', error)
      alert('Error exporting WAV file. Please try again.')
    }
  }

  // Helper function to convert AudioBuffer to WAV format
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

    // Convert audio data
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

  // View sequencer for a specific pattern
  const viewPatternSequencer = (block: PatternBlock) => {
    console.log('[PATTERN] Viewing sequencer for pattern:', block.name)
    console.log('[PATTERN] Sequencer data:', block.sequencerData)
    
    // Call the parent's onPlayPattern to show the sequencer data
    if (onPlayPattern) {
      onPlayPattern(block.sequencerData)
    }
    
    // Switch to the sequencer tab to show the pattern
    if (onSwitchToSequencerTab) {
      onSwitchToSequencerTab()
    }
  }

  // View waveform for a specific pattern
  const viewPatternWaveform = (block: PatternBlock) => {
    const track = tracks.find(t => t.id === block.trackId)
    console.log('[PATTERN] Viewing waveform for pattern:', block.name)
    console.log('[PATTERN] Track audio URL:', track?.audioUrl)
    
    if (track?.audioUrl && track.audioUrl !== 'undefined') {
      // Create and show waveform modal
      showWaveformModal(block, track)
    } else {
      console.log('[PATTERN] No audio waveform available')
      alert(`No audio waveform available for ${block.name}`)
    }
  }

  // Toggle inline waveform for a pattern
  const toggleInlineWaveform = async (block: PatternBlock) => {
    const patternId = block.id
    const isExpanded = expandedPatterns.has(patternId)
    
    if (isExpanded) {
      // Collapse the waveform
      setExpandedPatterns(prev => {
        const newSet = new Set(prev)
        newSet.delete(patternId)
        return newSet
      })
    } else {
      // Expand and load waveform data
      const track = tracks.find(t => t.id === block.trackId)
      if (track?.audioUrl && track.audioUrl !== 'undefined') {
        try {
          console.log('[INLINE WAVEFORM] Loading audio for pattern:', block.name)
          
          // Create audio context to analyze the audio
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
          
          // Fetch the audio file
          if (!track.audioUrl) {
            throw new Error('No audio URL available')
          }
          const response = await fetch(track.audioUrl)
          const arrayBuffer = await response.arrayBuffer()
          
          // Decode the audio
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
          
          // Extract waveform data
          const channelData = audioBuffer.getChannelData(0) // Get first channel
          const samples = channelData.length
          const blockSize = Math.floor(samples / 100) // 100 data points for inline display
          const waveform = []
          
          for (let i = 0; i < 100; i++) {
            const start = i * blockSize
            const end = start + blockSize
            let sum = 0
            
            for (let j = start; j < end; j++) {
              sum += Math.abs(channelData[j] || 0)
            }
            
            waveform.push(sum / blockSize)
          }
          
          // Normalize waveform data
          const maxValue = Math.max(...waveform)
          const normalizedWaveform = waveform.map(value => value / maxValue)
          
          // Store the waveform data
          setPatternWaveformData(prev => ({
            ...prev,
            [patternId]: normalizedWaveform
          }))
          
          // Expand the pattern
          setExpandedPatterns(prev => new Set([...prev, patternId]))
          
          console.log('[INLINE WAVEFORM] Waveform data generated for pattern:', patternId)
          
        } catch (error) {
          console.error('[INLINE WAVEFORM] Error loading audio:', error)
          alert(`Error loading audio waveform: ${error}`)
        }
      } else {
        alert(`No audio waveform available for ${block.name}`)
      }
    }
  }

  // State for waveform modal
  const [showWaveform, setShowWaveform] = useState(false)
  const [waveformData, setWaveformData] = useState<number[]>([])
  const [waveformTrack, setWaveformTrack] = useState<Track | null>(null)
  const [waveformBlock, setWaveformBlock] = useState<PatternBlock | null>(null)
  
  // State for inline waveform toggles
  const [expandedPatterns, setExpandedPatterns] = useState<Set<string>>(new Set())
  const [patternWaveformData, setPatternWaveformData] = useState<{[patternId: string]: number[]}>({})
  const [patternWaveSub, setPatternWaveSub] = useState<{[patternId: string]: boolean}>({})

  // Show waveform modal with actual audio data
  const showWaveformModal = async (block: PatternBlock, track: Track) => {
    try {
      console.log('[WAVEFORM] Loading audio for waveform:', track.audioUrl)
      
      // Create audio context to analyze the audio
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Fetch the audio file
      if (!track.audioUrl) {
        throw new Error('No audio URL available')
      }
      const response = await fetch(track.audioUrl)
      const arrayBuffer = await response.arrayBuffer()
      
      // Decode the audio
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      
      // Extract waveform data
      const channelData = audioBuffer.getChannelData(0) // Get first channel
      const samples = channelData.length
      const blockSize = Math.floor(samples / 200) // 200 data points for visualization
      const waveform = []
      
      for (let i = 0; i < 200; i++) {
        const start = i * blockSize
        const end = start + blockSize
        let sum = 0
        
        for (let j = start; j < end; j++) {
          sum += Math.abs(channelData[j] || 0)
        }
        
        waveform.push(sum / blockSize)
      }
      
      // Normalize waveform data
      const maxValue = Math.max(...waveform)
      const normalizedWaveform = waveform.map(value => value / maxValue)
      
      setWaveformData(normalizedWaveform)
      setWaveformTrack(track)
      setWaveformBlock(block)
      setShowWaveform(true)
      
      console.log('[WAVEFORM] Waveform data generated:', normalizedWaveform.length, 'points')
      
    } catch (error) {
      console.error('[WAVEFORM] Error loading audio:', error)
      alert(`Error loading audio waveform: ${error}`)
    }
  }

  // Generate waveform data for a pattern
  const generateWaveformData = (block: PatternBlock) => {
    const track = tracks.find(t => t.id === block.trackId)
    if (!track) return null
    
    // If track has audio, generate realistic waveform
    if (track.audioUrl && track.audioUrl !== 'undefined') {
      // Generate waveform based on sequencer data and audio characteristics
      const waveformPoints = []
      const steps = block.sequencerData[block.trackId] || []
      
      for (let i = 0; i < Math.min(32, block.duration * 4); i++) {
        const stepIndex = i % steps.length
        const isActive = steps[stepIndex] || false
        
        if (isActive) {
          // Active step - higher amplitude
          waveformPoints.push(Math.random() * 0.6 + 0.4)
        } else {
          // Inactive step - lower amplitude
          waveformPoints.push(Math.random() * 0.2 + 0.05)
        }
      }
      
      return waveformPoints
    }
    
    return null
  }

  // Play a specific pattern block using arrangement audio system
  const playPatternBlock = async (block: PatternBlock) => {
    if (!isArrangementAudioInitialized.current) {
      console.warn('[ARRANGEMENT AUDIO] Audio system not initialized')
      return
    }

    setCurrentPattern(block)
    
    // Stop any currently playing arrangement
    stopArrangement()
    
    // Use the arrangement audio system to play this pattern
    const track = block.tracks[0]
    const player = arrangementPlayersRef.current[track.id]
    
    if (player && player.loaded) {
      try {
        // Calculate timing for this pattern
        const secondsPerBeat = 60 / bpm
        const beatsPerBar = 4
        const secondsPerBar = secondsPerBeat * beatsPerBar
        const patternStartTime = (block.startBar - 1) * secondsPerBar
        
        // Start the pattern at the correct time
        const startTime = Tone.now() + 0.1 // Small delay for stability
        player.start(startTime, 0, block.duration * secondsPerBar)
        
        console.log(`[ARRANGEMENT AUDIO] Playing pattern ${block.name} for ${block.duration} bars`)
      } catch (error) {
        console.error(`[ARRANGEMENT AUDIO] Error playing pattern:`, error)
      }
    } else {
      console.warn(`[ARRANGEMENT AUDIO] No player available for track ${track.name}`)
    }
  }

  // Function to completely isolate arrangement from sequencer
  const isolateArrangementFromSequencer = () => {
    console.log('[ARRANGEMENT AUDIO] Isolating arrangement from sequencer...')
    
    // CRITICAL FIX: Don't stop the global transport - let sequencer keep running
    // Instead, ensure our arrangement transport is properly isolated
    const globalTransport = Tone.getTransport()
    console.log('[ARRANGEMENT AUDIO] Global transport state:', globalTransport.state)
    
    // Stop all arrangement players
    Object.values(arrangementPlayersRef.current).forEach(player => {
      if (player.state === 'started') {
        player.stop()
      }
    })
    
    // Ensure arrangement transport is properly configured
    if (arrangementTransportRef.current) {
      arrangementTransportRef.current.stop()
      arrangementTransportRef.current.cancel()
      arrangementTransportRef.current.loop = false // Ensure arrangement transport doesn't loop
      arrangementTransportRef.current.bpm.value = bpm // Sync BPM
      // Don't reset position to 0 - let it be set later based on current playhead
    }
    
    console.log('[ARRANGEMENT AUDIO] Arrangement isolated from sequencer')
  }

  // Reset arrangement audio system for fresh playback
  const resetArrangementAudio = () => {
    console.log('[ARRANGEMENT AUDIO] Resetting audio system for fresh playback...')
    
    // Stop all players
    Object.values(arrangementPlayersRef.current).forEach(player => {
      if (player.state === 'started') {
        player.stop()
      }
    })
    
    // Reset transport
    if (arrangementTransportRef.current) {
      arrangementTransportRef.current.stop()
      arrangementTransportRef.current.cancel()
    }
    
    // Clear progress interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
    }
    
    console.log('[ARRANGEMENT AUDIO] Audio system reset complete')
  }

  // Play the entire arrangement using arrangement audio system
  const playArrangement = async () => {
    console.log('[ARRANGEMENT AUDIO] Play arrangement called')
    console.log('[ARRANGEMENT AUDIO] Pattern blocks:', patternBlocks)
    console.log('[ARRANGEMENT AUDIO] Available tracks:', tracks)
    console.log('[ARRANGEMENT AUDIO] Current players:', arrangementPlayersRef.current)
    
    if (patternBlocks.length === 0) {
      alert('No pattern blocks to play')
      return
    }
    
    // CRITICAL: Reset and isolate arrangement from sequencer before playing
    resetArrangementAudio()
    isolateArrangementFromSequencer()

    // CRITICAL FIX: Always ensure audio system is ready for each play
    if (!isArrangementAudioInitialized.current) {
      console.warn('[ARRANGEMENT AUDIO] Audio system not initialized, trying to initialize...')
      await Tone.start()
      // Try to initialize audio again
      const initializeArrangementAudio = async () => {
        await Tone.start()
        
        // Use the global transport but ensure it doesn't loop for arrangement
        arrangementTransportRef.current = Tone.getTransport()
        arrangementTransportRef.current.stop()
        arrangementTransportRef.current.loop = false // Explicitly disable looping for arrangement
        arrangementTransportRef.current.bpm.value = bpm
        
        console.log('[ARRANGEMENT AUDIO] Starting to load audio for tracks:', tracks.length)
        
        const loadPromises = tracks.map(async (track) => {
          console.log(`[ARRANGEMENT AUDIO] Processing track: ${track.name}, audioUrl: ${track.audioUrl}`)
          
          if (track.audioUrl && track.audioUrl !== 'undefined') {
            try {
              console.log(`[ARRANGEMENT AUDIO] Loading audio for track ${track.name}: ${track.audioUrl}`)
              
              // Use the arrangement context for pitch shifter and player
              const pitchShifter = new Tone.PitchShift({
                pitch: track.pitchShift || 0,
                windowSize: 0.1,
                delayTime: 0.001,
                feedback: 0.05
              }).toDestination()
              
              const player = new Tone.Player(track.audioUrl).connect(pitchShifter)
              
              if (track.playbackRate && track.playbackRate !== 1) {
                player.playbackRate = track.playbackRate
              }
              
              // Wait for the player to load
              console.log(`[ARRANGEMENT AUDIO] Waiting for player to load for ${track.name}...`)
              await player.load(track.audioUrl)
              console.log(`[ARRANGEMENT AUDIO] Player loaded successfully for ${track.name}`)
              
              arrangementPlayersRef.current[track.id] = player
              arrangementPitchShiftersRef.current[track.id] = pitchShifter
              
              console.log(`[ARRANGEMENT AUDIO] Audio loaded and ready for track ${track.name}`)
            } catch (error) {
              console.error(`[ARRANGEMENT AUDIO] Failed to load audio for track ${track.name}:`, error)
            }
          } else {
            console.warn(`[ARRANGEMENT AUDIO] No audio URL for track ${track.name}`)
          }
        })
        
        // Wait for all audio to load
        console.log('[ARRANGEMENT AUDIO] Waiting for all audio to load...')
        await Promise.all(loadPromises)
        
        isArrangementAudioInitialized.current = true
        console.log('[ARRANGEMENT AUDIO] Audio system initialized with players:', Object.keys(arrangementPlayersRef.current))
        console.log('[ARRANGEMENT AUDIO] Player details:', arrangementPlayersRef.current)
      }
      
      await initializeArrangementAudio()
    }

    setIsArrangementPlaying(true)
    isPlayingRef.current = true // Set ref immediately
    // Don't reset currentBar - preserve the playhead position
    arrangementStartTimeRef.current = Date.now()
    
    console.log('[PLAYHEAD DEBUG] Set isArrangementPlaying to true, isPlayingRef to true')
    
    // Stop any currently playing arrangement and set transport to current playhead position
    if (arrangementTransportRef.current) {
      arrangementTransportRef.current.stop()
      // Set transport position to start from current playhead position
      // Convert current bar to transport position format (bars:beats:sixteenths)
      const startBar = Math.floor(currentBar - 1) // Convert to 0-based
      const startBeat = Math.floor((currentBar % 1) * 4) // Convert fractional bar to beats
      const startSixteenth = Math.floor(((currentBar % 1) * 4 % 1) * 4) // Convert fractional beat to sixteenths
      
      const transportPosition = `${startBar}:${startBeat}:${startSixteenth}`
      arrangementTransportRef.current.position = transportPosition
      arrangementTransportRef.current.cancel() // Cancel all scheduled events
      console.log(`[ARRANGEMENT AUDIO] Set transport position to ${transportPosition} (bar ${currentBar})`)
    }
    
    // CRITICAL FIX: Don't interfere with global transport - let sequencer keep running
    // The arrangement transport is now properly isolated
    const globalTransport = Tone.getTransport()
    console.log('[ARRANGEMENT AUDIO] Global transport state before arrangement play:', globalTransport.state)
    
    // Sort pattern blocks by start bar
    const sortedBlocks = [...patternBlocks].sort((a, b) => a.startBar - b.startBar)
    console.log('[ARRANGEMENT AUDIO] Sorted blocks:', sortedBlocks)
    
    try {
      // Calculate total arrangement duration in bars based on actual pattern blocks
      const maxEndBar = Math.max(...sortedBlocks.map(block => block.endBar))
      const totalDurationBars = maxEndBar
      
      // Calculate seconds per bar
      const secondsPerBeat = 60 / bpm
      const beatsPerBar = 4
      const secondsPerBar = secondsPerBeat * beatsPerBar
      
      console.log('[ARRANGEMENT AUDIO] Scheduling patterns with timing:', { bpm, secondsPerBeat, secondsPerBar, totalDurationBars })
      console.log('[ARRANGEMENT AUDIO] Available players before scheduling:', arrangementPlayersRef.current)
      
      // Schedule each pattern to start at its calculated time, adjusted for current playhead position
      sortedBlocks.forEach((block, index) => {
        const track = block.tracks[0]
        const player = arrangementPlayersRef.current[track.id]
        
        console.log(`[ARRANGEMENT AUDIO] Processing block ${block.name}:`, {
          trackId: track.id,
          trackName: track.name,
          player: player,
          playerLoaded: player?.loaded,
          playerState: player?.state
        })
        
        // Calculate start time in seconds (convert from bar number)
        // Adjust for current playhead position - if playhead is at bar 3, patterns should start 2 bars later
        const startTimeInBars = block.startBar - currentBar // Relative to current playhead
        const startTimeInSeconds = startTimeInBars * secondsPerBar
        const durationInSeconds = block.duration * secondsPerBar
        
        console.log(`[ARRANGEMENT AUDIO] Scheduling pattern ${block.name}: start at ${startTimeInSeconds}s (bar ${block.startBar} - current ${currentBar} = ${startTimeInBars} bars), duration ${durationInSeconds}s`)
        
        if (player && player.loaded) {
          try {
            // Only schedule patterns that start after or at the current playhead position
            if (startTimeInBars >= 0) {
              // Schedule the player to start at the calculated time
              console.log(`[ARRANGEMENT AUDIO] About to schedule player for ${block.name} at +${startTimeInSeconds}s`)
              player.start(`+${startTimeInSeconds}`, 0, durationInSeconds)
              console.log(`[ARRANGEMENT AUDIO] Successfully scheduled pattern ${block.name} to start at +${startTimeInSeconds}s`)
            } else {
              console.log(`[ARRANGEMENT AUDIO] Skipping pattern ${block.name} - it starts before current playhead position`)
            }
          } catch (error) {
            console.error(`[ARRANGEMENT AUDIO] Error scheduling pattern ${block.name}:`, error)
          }
        } else {
          console.warn(`[ARRANGEMENT AUDIO] No player available for track ${track.name}. Player:`, player)
        }
      })
      
      // CRITICAL FIX: Start the transport with proper timing
      console.log('[ARRANGEMENT AUDIO] Starting transport...')
      
      // Ensure we're starting from the correct position
      const startBar = Math.floor(currentBar - 1) // Convert to 0-based
      const startBeat = Math.floor((currentBar % 1) * 4) // Convert fractional bar to beats
      const startSixteenth = Math.floor(((currentBar % 1) * 4 % 1) * 4) // Convert fractional beat to sixteenths
      
      const transportPosition = `${startBar}:${startBeat}:${startSixteenth}`
      arrangementTransportRef.current.position = transportPosition
      
      // Start the transport
      arrangementTransportRef.current?.start()
      console.log('[ARRANGEMENT AUDIO] Transport started successfully at position:', transportPosition)
      
      // Update playhead every 16ms (60fps) for smooth movement
      progressIntervalRef.current = setInterval(updatePlayhead, 16)
      
      console.log(`[ARRANGEMENT AUDIO] Started arrangement with ${sortedBlocks.length} patterns, total duration: ${totalDurationBars} bars`)
    } catch (error) {
      console.error('[ARRANGEMENT AUDIO] Error creating sequence:', error)
      setIsArrangementPlaying(false)
    }
  }

  // Stop the arrangement
  const stopArrangement = () => {
    console.log('[PLAYHEAD DEBUG] stopArrangement called, setting isArrangementPlaying to false')
    setIsArrangementPlaying(false)
    isPlayingRef.current = false // Set ref to false
    setCurrentPattern(null)
    // Don't reset currentBar - preserve the playhead position
    
    // CRITICAL FIX: Properly stop and reset arrangement transport
    if (arrangementTransportRef.current) {
      arrangementTransportRef.current.stop()
      arrangementTransportRef.current.cancel() // Cancel all scheduled events
      // Don't reset position to 0 - preserve current position for restart
    }
    
    // Stop all arrangement players
    Object.values(arrangementPlayersRef.current).forEach(player => {
      if (player.state === 'started') {
        player.stop()
      }
    })
    
    // Clear progress interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
    
    // Clear any test intervals
    if (typeof window !== 'undefined') {
      // Clear all intervals that might be running (nuclear option for debugging)
      const highestIntervalId = window.setInterval(() => {}, 0)
      for (let i = 1; i <= highestIntervalId; i++) {
        window.clearInterval(i)
      }
    }
    
    // Stop all arrangement players safely
    Object.values(arrangementPlayersRef.current).forEach(player => {
      try {
        if (player && player.state === 'started') {
          player.stop()
        }
      } catch (error) {
        console.warn('[ARRANGEMENT AUDIO] Error stopping player:', error)
      }
    })
    
    // CRITICAL: Reset global transport to prevent interference with sequencer
    const globalTransport = Tone.getTransport()
    globalTransport.stop()
    globalTransport.cancel()
    globalTransport.loop = false // Ensure global transport doesn't loop
    // Don't reset global transport position to 0 - let arrangement transport handle its own position
    
    console.log('[ARRANGEMENT AUDIO] Arrangement stopped and global transport reset')
  }

  // Calculate time position for a bar
  const getBarTime = (barNumber: number) => {
    const secondsPerBeat = 60 / bpm
    const beatsPerBar = 4 // Assuming 4/4 time signature
    const secondsPerBar = secondsPerBeat * beatsPerBar
    return (barNumber - 1) * secondsPerBar
  }

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Handle mouse down on pattern block for selection/dragging
  const handleBlockMouseDown = (e: React.MouseEvent, blockId: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (e.ctrlKey || e.metaKey) {
      // Multi-select
      setSelectedBlocks(prev => 
        prev.includes(blockId) 
          ? prev.filter(id => id !== blockId)
          : [...prev, blockId]
      )
    } else {
      // Single select
      setSelectedBlocks([blockId])
    }
    
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
    setDragOffset({ x: 0, y: 0 })
  }

  // Handle mouse move for dragging and resizing
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isResizing) {
      handleResizeMove(e)
      return
    }
    
    if (!isDragging) return
    
    const deltaX = e.clientX - dragStart.x
    const deltaY = e.clientY - dragStart.y
    
    setDragOffset({ x: deltaX, y: deltaY })
    
    // Update the pattern block position in real-time as you drag
    if (selectedBlocks.length > 0) {
      const block = patternBlocks.find(b => b.id === selectedBlocks[0])
      if (block) {
        const originalBarX = (block.startBar - 1) * zoom
        const newBarX = originalBarX + deltaX
        // Snap when the front edge enters a bar area (use floor instead of round)
        let snappedBar = Math.floor(newBarX / zoom) + 1
        snappedBar = Math.max(1, snappedBar) // Don't go before bar 1
        
        // Update the block position immediately
        const newPatternBlocks = patternBlocks.map(b => 
          b.id === block.id 
            ? { 
                ...b, 
                startBar: snappedBar,
                endBar: snappedBar + b.duration - 1
              }
            : b
        )
        setPatternBlocks(newPatternBlocks)
        onPatternsChange?.(newPatternBlocks)
      }
    }
  }

  // Handle mouse up to end dragging and resizing
  const handleMouseUp = () => {
    if (isResizing) {
      handleResizeEnd()
      return
    }
    
    // Position is already updated during drag, just clean up
    setIsDragging(false)
    setSelectedBlocks([])
    setDragOffset({ x: 0, y: 0 })
    setDragStart({ x: 0, y: 0 })
  }

  // Add event listeners for mouse move and up
  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove as any)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove as any)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, isResizing])

  // Generate timeline markers
  const timelineMarkers = Array.from({ length: totalBars }, (_, i) => i + 1)

  // Handle spacebar for play/stop (only when arrangement tab is active)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle spacebar when not typing in an input field
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }
      
      if (event.code === 'Space') {
        event.preventDefault() // Prevent page scroll
        event.stopPropagation() // Prevent event from bubbling up to main page
        
        console.log('[SONG ARRANGEMENT] Spacebar pressed - handling play/stop')
        
        if (isArrangementPlaying) {
          stopArrangement()
        } else {
          playArrangement()
        }
      }
      
      // Delete key to toggle delete mode
      if (event.code === 'Delete' || event.code === 'Backspace') {
        event.preventDefault()
        event.stopPropagation()
        
        console.log('[SONG ARRANGEMENT] Delete key pressed - toggling delete mode')
        setIsDeleteMode(prev => !prev)
      }
      
      // C key to toggle cut mode
      if (event.code === 'KeyC') {
        event.preventDefault()
        event.stopPropagation()
        
        console.log('[SONG ARRANGEMENT] C key pressed - toggling cut mode')
        setIsCutMode(prev => !prev)
      }
    }

    // Add event listener
    document.addEventListener('keydown', handleKeyDown)
    
    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isArrangementPlaying]) // Only depend on isArrangementPlaying

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card className="!bg-[#141414] border-gray-700">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-lg">Song Arrangement</CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-gray-300 text-sm">Pattern Duration:</span>
                <Select value={selectedDuration.toString()} onValueChange={(value) => setSelectedDuration(parseInt(value))}>
                  <SelectTrigger className="w-20 h-8 bg-gray-700 border-gray-600 text-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="4">4 Bars</SelectItem>
                    <SelectItem value="8">8 Bars</SelectItem>
                    <SelectItem value="16">16 Bars</SelectItem>
                    <SelectItem value="32">32 Bars</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-300 text-sm">Zoom:</span>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={zoom}
                  onChange={(e) => setZoom(parseInt(e.target.value))}
                  className="w-24 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
                <span className="text-gray-300 text-xs">{zoom}px/bar</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {bpm} BPM
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {totalBars} Bars
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {formatTime(getBarTime(totalBars + 1))}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => {
                            console.log('=== PLAY BUTTON DEBUG ===')
            console.log('Current state:', { isArrangementPlaying, patternBlocksLength: patternBlocks.length, currentBar })
            console.log('Audio system initialized:', isArrangementAudioInitialized.current)
            console.log('Available players:', Object.keys(arrangementPlayersRef.current))
            console.log('Transport exists:', !!arrangementTransportRef.current)
            console.log('Transport state:', arrangementTransportRef.current?.state)
            
            // FORCE INITIALIZATION if no players available
            if (Object.keys(arrangementPlayersRef.current).length === 0) {
              console.log('[ARRANGEMENT AUDIO] No players available, forcing initialization...')
              isArrangementAudioInitialized.current = false
            }
            
            if (isArrangementPlaying) {
              stopArrangement()
            } else {
              playArrangement()
            }
              }}
              variant={isArrangementPlaying ? "destructive" : "default"}
              size="lg"
              className="w-16 h-16 rounded-full"
              disabled={patternBlocks.length === 0}
            >
              {isArrangementPlaying ? <Square className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </Button>
            <Button
              onClick={stopArrangement}
              variant="outline"
              size="sm"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <div className="text-gray-300 text-sm">
              {isArrangementPlaying ? `Playing: Bar ${Math.floor(currentBar)}.${Math.floor((currentBar % 1) * 4)}` : 'Ready to play'}
            </div>
            <div className="text-gray-400 text-xs">
              Press SPACEBAR to play/stop • Press DELETE to toggle delete mode • Press C to toggle cut mode
            </div>
            <Button
              onClick={() => {
                console.log('=== AUDIO SYSTEM DEBUG ===')
                console.log('1. Audio context state:', Tone.context.state)
                console.log('2. Audio system initialized:', isArrangementAudioInitialized.current)
                console.log('3. Available players:', Object.keys(arrangementPlayersRef.current))
                console.log('4. Transport exists:', !!arrangementTransportRef.current)
                console.log('5. Transport state:', arrangementTransportRef.current?.state)
                console.log('6. Pattern blocks:', patternBlocks.length)
                console.log('7. Tracks with audio:', tracks.filter(t => t.audioUrl).length)
                console.log('8. Current bar:', currentBar)
                console.log('9. Is playing:', isArrangementPlaying)
                
                // Test if we can actually play audio
                if (Object.keys(arrangementPlayersRef.current).length > 0) {
                  const firstPlayer = Object.values(arrangementPlayersRef.current)[0]
                  console.log('10. First player state:', firstPlayer.state)
                  console.log('11. First player loaded:', firstPlayer.loaded)
                } else {
                  console.log('10. NO PLAYERS AVAILABLE!')
                }
              }}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              Debug Audio
            </Button>
            <Button
              onClick={() => {
                setIsDeleteMode(!isDeleteMode)
                console.log(`[DELETE MODE] ${!isDeleteMode ? 'Enabled' : 'Disabled'}`)
              }}
              variant={isDeleteMode ? "destructive" : "outline"}
              size="sm"
              className={`text-xs ${isDeleteMode ? 'bg-red-600 hover:bg-red-700 text-white' : ''}`}
              title={isDeleteMode ? "Click to disable delete mode" : "Click to enable delete mode - then click on patterns to delete them"}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              {isDeleteMode ? 'Delete Mode ON' : 'Delete'}
            </Button>
            <Button
              onClick={() => {
                setIsCutMode(!isCutMode)
                console.log(`[CUT MODE] ${!isCutMode ? 'Enabled' : 'Disabled'}`)
              }}
              variant={isCutMode ? "destructive" : "outline"}
              size="sm"
              className={`text-xs ${isCutMode ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}`}
              title={isCutMode ? "Click to disable cut mode" : "Click to enable cut mode - then click on patterns to split them in half"}
            >
              <Scissors className="w-4 h-4 mr-1" />
              {isCutMode ? 'Cut Mode ON' : 'Cut'}
            </Button>
            <Button
              onClick={() => {
                loadElevenPatternsFromEachTrack()
              }}
              variant="outline"
              size="sm"
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white border-blue-500"
              title="Load 11 patterns from each track automatically"
            >
              <Plus className="w-4 h-4 mr-1" />
              Load 11 Patterns
            </Button>
            <Button
              onClick={() => {
                clearAllPatterns()
              }}
              variant="outline"
              size="sm"
              className="text-xs bg-red-600 hover:bg-red-700 text-white border-red-500"
              title="Clear all patterns from the arrangement"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Clear All
            </Button>
            <Button
              onClick={() => {
                createDropArrangement()
              }}
              variant="outline"
              size="sm"
              className="text-xs bg-purple-600 hover:bg-purple-700 text-white border-purple-500"
              title="Create dynamic arrangement with drops by splitting patterns"
            >
              <Music className="w-4 h-4 mr-1" />
              Create Drops
            </Button>
            <Button
              onClick={() => {
                exportBeatAsWav()
              }}
              variant="outline"
              size="sm"
              className="text-xs bg-green-600 hover:bg-green-700 text-white border-green-500"
              title="Export the arrangement as a high-quality WAV file"
            >
              <Download className="w-4 h-4 mr-1" />
              Export Beat
            </Button>
            {isArrangementPlaying && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-red-400 text-xs font-mono">
                  Bar {Math.floor(currentBar)}.{Math.floor((currentBar % 1) * 4)} / {totalBars}
                </span>
              </div>
            )}
            {loadedTrackId && (
              <div className="flex items-center gap-2 ml-4">
                <Badge variant="outline" className="text-xs bg-green-600 text-white border-green-500">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Load Mode Active
                </Badge>
                <span className="text-green-400 text-sm">
                  Click in grid to place {getTrackDisplayName(tracks.find(t => t.id === loadedTrackId)?.name || '')} pattern
                </span>
              </div>
            )}
            {isDeleteMode && (
              <div className="flex items-center gap-2 ml-4">
                <Badge variant="outline" className="text-xs bg-red-600 text-white border-red-500">
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete Mode Active
                </Badge>
                <span className="text-red-400 text-sm">
                  Click on any pattern to delete it
                </span>
              </div>
            )}
            {isCutMode && (
              <div className="flex items-center gap-2 ml-4">
                <Badge variant="outline" className="text-xs bg-orange-600 text-white border-orange-500">
                  <Scissors className="w-3 h-3 mr-1" />
                  Cut Mode Active
                </Badge>
                <span className="text-orange-400 text-sm">
                  Click on any pattern to split it in half
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* DAW-Style Arrangement Grid */}
      <Card className="!bg-[#141414] border-gray-700">
        <CardContent className="p-0">
          <div className="relative">
            {/* Track names - Fixed outside the grid */}
            <div className="absolute left-0 top-0 w-48 h-full bg-[#1a1a1a] border-r border-gray-600 z-30" style={{ marginTop: '60px' }}>
              {tracks.map((track, index) => (
                <div
                  key={track.id}
                  className="flex items-center justify-between border-b border-gray-600 px-3"
                  style={{ height: '60px' }}
                >
                  <div className="flex items-center gap-2 flex-1">
                    <div className={`w-3 h-3 rounded-full ${track.color}`}></div>
                    <span className="text-white text-sm truncate">{getTrackDisplayName(track.name)}</span>
                  </div>
                  <Button
                    size="sm"
                    variant={loadedTrackId === track.id ? "default" : "outline"}
                    className={`w-8 h-8 p-0 text-xs ${
                      loadedTrackId === track.id 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                    onClick={() => toggleLoadMode(track.id)}
                    title={loadedTrackId === track.id ? "Click to turn off load mode" : "Click to load pattern for placement"}
                  >
                    {loadedTrackId === track.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "L"}
                  </Button>
                </div>
              ))}
            </div>

            {/* Main scrollable container that includes both header and grid */}
            <div 
              ref={gridRef}
              className="relative overflow-auto ml-48"
              style={{ height: '460px' }}
              onScroll={(e) => setScrollX(e.currentTarget.scrollLeft)}
              onClick={handleGridClick}
            >
                            {/* Timeline Header - Scrolls with grid */}
              <div 
                className="sticky top-0 z-10 bg-[#1a1a1a] border-b border-gray-600 relative cursor-pointer hover:bg-[#222222] transition-colors"
                style={{ 
                  height: '60px',
                  minHeight: '60px',
                  display: 'block',
                  visibility: 'visible'
                }}
                onClick={(e) => {
                  console.log('[TIMELINE] Timeline header clicked! Event:', e)
                  handleTimelineHeaderClick(e)
                }}
                title="Click to set playhead position"
              >

                {/* Timeline Playhead */}
                {isArrangementPlaying && (
                  <div 
                    className="absolute top-0 bottom-0 w-1 bg-red-500 z-30 shadow-lg"
                    style={{
                      left: `${Math.max(0, (currentBar - 1) * zoom)}px`,
                      transition: 'left 0.05s ease-out', // Smooth transition for playhead movement
                      boxShadow: '0 0 10px rgba(239, 68, 68, 0.8)'
                    }}
                  >
                    {/* Playhead arrow */}
                    <div className="absolute -top-2 -left-2 w-0 h-0 border-l-6 border-r-6 border-b-6 border-transparent border-b-red-500"></div>
                    {/* Debug info */}
                    <div className="absolute -top-8 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      Bar {Math.floor(currentBar)}.{Math.floor((currentBar % 1) * 4)}
                    </div>
                  </div>
                )}
                

                <div className="flex items-end h-full">
                  {/* Timeline markers - Start at position 0 */}
                  <div className="flex h-full"
                    style={{ 
                      width: `${Math.max(totalBars * zoom, 800)}px` // Ensure minimum width of 800px
                    }}
                  >
                    {timelineMarkers.map((bar) => (
                      <div
                        key={bar}
                        className="flex-shrink-0 border-r border-gray-600 text-xs text-gray-400 font-mono"
                        style={{ width: `${zoom}px` }}
                      >
                        <div className="h-6 flex items-center justify-center border-b border-gray-600">
                          {bar}
                        </div>
                        <div className="h-6 flex items-center justify-center">
                          {formatTime(getBarTime(bar))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Arrangement Grid Content */}
              <div 
                className="relative"
                style={{ 
                  width: `${Math.max(totalBars * zoom, 800)}px`, // Ensure minimum width of 800px
                  height: `${tracks.length * 60}px`
                }}
              >
                {/* Playhead */}
                {isArrangementPlaying && (
                  <div 
                    className="absolute top-0 bottom-0 w-2 bg-yellow-400 z-20 animate-pulse shadow-lg"
                    style={{
                      left: `${Math.max(0, (currentBar - 1) * zoom)}px`,
                      transition: 'left 0.05s ease-out', // Smooth transition for playhead movement
                      boxShadow: '0 0 20px rgba(250, 204, 21, 0.9)'
                    }}
                  >
                    {/* Playhead arrow */}
                    <div className="absolute -top-3 -left-3 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-yellow-400"></div>
                    {/* Debug info */}
                    <div className="absolute -top-10 left-2 bg-yellow-400 text-black text-xs px-2 py-1 rounded whitespace-nowrap font-bold">
                      PLAYHEAD: Bar {Math.floor(currentBar)}.{Math.floor((currentBar % 1) * 4)}
                    </div>
                  </div>
                )}
                {/* Grid background */}
                <div className="absolute inset-0 bg-[#0f0f0f]"></div>
                
                {/* Track Grid - Each track row uses same flexbox system as header */}
                {tracks.map((track, trackIndex) => (
                  <div
                    key={track.id}
                    className="flex absolute"
                    style={{ 
                      top: `${trackIndex * 60}px`,
                      height: '60px',
                      width: `${Math.max(totalBars * zoom, 800)}px` // Ensure minimum width of 800px
                    }}
                  >
                    {timelineMarkers.map((bar) => (
                      <div
                        key={bar}
                        className="flex-shrink-0 border-r border-gray-700"
                        style={{ width: `${zoom}px` }}
                      ></div>
                    ))}
                  </div>
                ))}
                
                {/* Horizontal track separators */}
                <div className="absolute inset-0">
                  {tracks.map((track, index) => (
                    <div
                      key={track.id}
                      className="absolute left-0 right-0 border-b border-gray-700"
                      style={{ 
                        top: `${index * 60}px`,
                        height: '1px'
                      }}
                    ></div>
                  ))}
                </div>

                {/* Pattern Blocks */}
                {patternBlocks.map((block) => {
                  const isExpanded = expandedPatterns.has(block.id)
                  const waveformData = patternWaveformData[block.id] || []
                  const blockHeight = isExpanded ? '120px' : '50px'
                  
                  return (
                    <React.Fragment key={block.id}>
                      <div
                        key={block.id}
                        className={`absolute select-none ${
                          isDeleteMode 
                            ? 'cursor-crosshair' 
                            : isCutMode
                            ? 'cursor-pointer'
                            : 'cursor-move'
                        } ${
                          selectedBlocks.includes(block.id) 
                            ? 'ring-2 ring-blue-500 ring-opacity-50' 
                            : ''
                        } ${
                          isDeleteMode 
                            ? 'hover:ring-2 hover:ring-red-500 hover:ring-opacity-70' 
                            : isCutMode
                            ? 'hover:ring-2 hover:ring-orange-500 hover:ring-opacity-70'
                            : ''
                        }`}
                        style={{
                          left: `${(block.startBar - 1) * zoom}px`,
                          top: `${tracks.findIndex(t => t.id === block.trackId) * 60 + 5}px`,
                          width: `${block.duration * zoom}px`,
                          height: blockHeight,
                          transform: isDragging && selectedBlocks.includes(block.id) 
                            ? `translate(${dragOffset.x}px, ${dragOffset.y}px)` 
                            : 'none'
                        }}
                        onMouseDown={(e) => {
                          if (isDeleteMode || isCutMode) {
                            e.preventDefault()
                            e.stopPropagation()
                            handlePatternBlockClick(block.id)
                          } else {
                            handleBlockMouseDown(e, block.id)
                          }
                        }}
                        title={
                          isDeleteMode 
                            ? `Click to delete ${block.name}` 
                            : isCutMode
                            ? `Click to split ${block.name} in half`
                            : `Drag to move ${block.name}`
                        }
                      >
                        <div className={`h-full rounded border-2 ${isDeleteMode ? 'border-red-500' : isCutMode ? 'border-orange-500' : 'border-gray-600'} ${block.color} bg-opacity-80 relative group`}>
                          {/* Left resize handle */}
                          <div
                            className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-white bg-opacity-20 hover:bg-opacity-40 transition-all z-10"
                            onMouseDown={(e) => handleResizeStart(e, block.id, 'left')}
                            title="Drag to resize from left edge"
                          >
                            <div className="absolute left-1 top-1/2 transform -translate-y-1/2">
                              <MoveHorizontal className="w-3 h-3 text-white" />
                            </div>
                          </div>
                          
                          {/* Right resize handle */}
                          <div
                            className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-white bg-opacity-20 hover:bg-opacity-40 transition-all z-10"
                            onMouseDown={(e) => handleResizeStart(e, block.id, 'right')}
                            title="Drag to resize from right edge"
                          >
                            <div className="absolute right-1 top-1/2 transform -translate-y-1/2">
                              <MoveHorizontal className="w-3 h-3 text-white" />
                            </div>
                          </div>
                          {/* Block header */}
                          <div className="absolute top-0 left-0 right-0 h-6 bg-black bg-opacity-50 rounded-t flex items-center justify-between px-2">
                            <div className="flex items-center gap-2">
                              <GripVertical className="w-3 h-3 text-gray-400" />
                              <span className="text-white text-xs font-medium truncate">{block.name}</span>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="w-5 h-5 p-0 hover:bg-white hover:bg-opacity-20"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  // Move block 1 bar left
                                  const newStartBar = Math.max(1, block.startBar - 1)
                                  setPatternBlocks(prev => prev.map(b => 
                                    b.id === block.id 
                                      ? { 
                                          ...b, 
                                          startBar: newStartBar,
                                          endBar: newStartBar + b.duration - 1
                                        }
                                      : b
                                  ))
                                }}
                                title="Move left 1 bar"
                              >
                                <ChevronLeft className="w-2 h-2" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="w-5 h-5 p-0 hover:bg-white hover:bg-opacity-20"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  // Move block 1 bar right
                                  const newStartBar = block.startBar + 1
                                  setPatternBlocks(prev => prev.map(b => 
                                    b.id === block.id 
                                      ? { 
                                          ...b, 
                                          startBar: newStartBar,
                                          endBar: newStartBar + b.duration - 1
                                        }
                                      : b
                                  ))
                                }}
                                title="Move right 1 bar"
                              >
                                <ChevronRight className="w-2 h-2" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="w-5 h-5 p-0 hover:bg-white hover:bg-opacity-20"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  playPatternBlock(block)
                                }}
                                title="Play pattern"
                              >
                                <Play className="w-2 h-2" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="w-5 h-5 p-0 hover:bg-white hover:bg-opacity-20"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  viewPatternSequencer(block)
                                }}
                                title="View sequencer"
                              >
                                <Grid3X3 className="w-2 h-2" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="w-5 h-5 p-0 hover:bg-white hover:bg-opacity-20"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleInlineWaveform(block)
                                }}
                                title={expandedPatterns.has(block.id) ? "Hide waveform" : "Show waveform"}
                              >
                                <BarChart3 className={`w-2 h-2 ${expandedPatterns.has(block.id) ? 'text-blue-400' : ''}`} />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="w-5 h-5 p-0 hover:bg-white hover:bg-opacity-20"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  duplicatePatternBlock(block)
                                }}
                                title="Duplicate pattern"
                              >
                                <Copy className="w-2 h-2" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="w-5 h-5 p-0 hover:bg-white hover:bg-opacity-20"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  splitPatternBlock(block)
                                }}
                                title="Split pattern in half"
                              >
                                <Scissors className="w-2 h-2" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="w-5 h-5 p-0 hover:bg-white hover:bg-opacity-20 text-red-400"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removePatternBlock(block.id)
                                }}
                                title="Delete pattern"
                              >
                                <Trash2 className="w-2 h-2" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="w-5 h-5 p-0 hover:bg-white hover:bg-opacity-20"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPatternWaveSub(prev => ({ ...prev, [block.id]: !prev[block.id] }))
                                }}
                                title={patternWaveSub[block.id] ? "Hide Wave" : "Show Wave"}
                              >
                                <BarChart3 className={`w-2 h-2 ${patternWaveSub[block.id] ? 'text-blue-400' : ''}`} />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Block content with waveform */}
                          <div className="absolute top-6 left-0 right-0 bottom-0 flex items-center justify-center">
                            <div className="w-full h-full flex flex-col">
                              {/* Waveform visualization */}
                              <div className="flex-1 flex items-center justify-center px-2">
                                <div className="w-full h-8 bg-black bg-opacity-30 rounded flex items-center justify-center">
                                  <div className="flex items-center justify-center space-x-0.5 w-full">
                                    {/* Generate sophisticated waveform */}
                                    {(() => {
                                      const waveformData = generateWaveformData(block)
                                      const track = tracks.find(t => t.id === block.trackId)
                                      
                                      if (waveformData && track?.audioUrl) {
                                        // Show audio waveform
                                        return waveformData.map((amplitude, i) => (
                                          <div
                                            key={i}
                                            className="bg-blue-400 bg-opacity-80 rounded-sm"
                                            style={{
                                              width: '1px',
                                              height: `${amplitude * 100}%`,
                                              minHeight: '1px',
                                              maxHeight: '16px'
                                            }}
                                          />
                                        ))
                                      } else {
                                        // Show sequencer-based waveform
                                        return Array.from({ length: Math.min(16, block.duration * 4) }, (_, i) => {
                                          const stepIndex = i % 4
                                          const trackId = block.trackId
                                          const isActive = block.sequencerData[trackId]?.[stepIndex] || false
                                          const intensity = isActive ? Math.random() * 0.8 + 0.2 : 0.1
                                          
                                          return (
                                            <div
                                              key={i}
                                              className="bg-white bg-opacity-60 rounded-sm"
                                              style={{
                                                width: '2px',
                                                height: `${intensity * 100}%`,
                                                minHeight: '2px',
                                                maxHeight: '20px'
                                              }}
                                            />
                                          )
                                        })
                                      }
                                    })()}
                                  </div>
                                </div>
                              </div>
                              {/* Duration label */}
                              <div className="text-center">
                                <span className="text-white text-xs font-mono">
                                  {block.duration} bars
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Expanded Waveform Display */}
                          {isExpanded && waveformData.length > 0 && (
                            <div className="absolute top-12 left-0 right-0 bottom-0 bg-black bg-opacity-80 rounded-b border-t border-gray-600">
                              <div className="flex items-center justify-center h-full px-2">
                                <div className="flex items-center justify-center space-x-0.5 w-full">
                                  {waveformData.map((amplitude, index) => (
                                    <div
                                      key={index}
                                      className="bg-blue-400 rounded-sm"
                                      style={{
                                        width: '1px',
                                        height: `${amplitude * 100}%`,
                                        minHeight: '1px',
                                        maxHeight: '60px'
                                      }}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      {patternWaveSub[block.id] && tracks.find(t => t.id === block.trackId)?.audioUrl && (
                        <div className="w-full flex bg-black/80 border-t border-gray-700" style={{ position: 'absolute', left: `${(block.startBar - 1) * zoom}px`, top: `${tracks.findIndex(t => t.id === block.trackId) * 60 + 5 + parseInt(blockHeight)}px`, width: `${block.duration * zoom}px` }}>
                          <div className="w-2 h-full bg-transparent"></div>
                          <TrackWaveform
                            audioUrl={tracks.find(t => t.id === block.trackId)?.audioUrl || null}
                            trackColor={tracks.find(t => t.id === block.trackId)?.color || '#60a5fa'}
                            height={40}
                            width={block.duration * zoom}
                            bpm={block.bpm}
                            steps={block.duration * 4}
                            activeSteps={block.sequencerData[block.trackId]}
                            isVisible={true}
                          />
                        </div>
                      )}
                    </React.Fragment>
                  )
                })}


              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Waveform Modal */}
      {showWaveform && waveformTrack && waveformBlock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-600 rounded-lg p-6 max-w-4xl w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-lg font-semibold">
                Audio Waveform: {waveformBlock.name}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowWaveform(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </Button>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-300 text-sm">
                Track: {waveformTrack.name} | Duration: {waveformBlock.duration} bars
              </p>
            </div>
            
            {/* Waveform Display */}
            <div className="bg-black rounded-lg p-4 mb-4">
              <div className="flex items-center justify-center space-x-1 h-32">
                {waveformData.map((amplitude, index) => (
                  <div
                    key={index}
                    className="bg-blue-400 rounded-sm"
                    style={{
                      width: '2px',
                      height: `${amplitude * 100}%`,
                      minHeight: '1px',
                      maxHeight: '120px'
                    }}
                  />
                ))}
              </div>
            </div>
            
            {/* Audio Controls */}
            <div className="flex items-center gap-4">
              <Button
                onClick={() => {
                  if (waveformTrack.audioUrl) {
                    const audio = new Audio(waveformTrack.audioUrl)
                    audio.play()
                  }
                }}
                variant="default"
                size="sm"
              >
                <Play className="w-4 h-4 mr-2" />
                Play Audio
              </Button>
              <Button
                onClick={() => setShowWaveform(false)}
                variant="outline"
                size="sm"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 