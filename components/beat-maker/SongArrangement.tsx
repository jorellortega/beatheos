import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Play, Square, RotateCcw, Plus, Trash2, Copy, Music, Clock, GripVertical, Scissors, Loader2, ChevronLeft, ChevronRight, Grid3X3, BarChart3, MoveHorizontal, Download, MousePointer, Save, FolderOpen, Brain, Shuffle, Library, ExternalLink } from 'lucide-react'
import { Track } from '@/hooks/useBeatMaker'
import * as Tone from 'tone'
import { supabase } from '@/lib/supabaseClient'

import React from 'react' // Added missing import for React
import { NotificationModal } from '@/components/ui/notification-modal'

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
  onArrangementPlayPause?: () => void // Callback to trigger arrangement play/pause
  onArrangementPlayStateChange?: (isPlaying: boolean) => void // Callback when arrangement play state changes
  mixerSettings?: {[trackId: number]: {
    volume: number
    pan: number
    mute: boolean
    eq: { low: number, mid: number, high: number }
    effects: { reverb: number, delay: number }
  }}
  masterVolume?: number
  onVolumeChange?: (trackId: number, volume: number) => void // Callback for track volume changes
  onMasterVolumeChange?: (volume: number) => void // Callback for master volume changes
  currentSessionId?: string | null // Current beat session ID for linking
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
  onSwitchToSequencerTab,
  onArrangementPlayPause,
  onArrangementPlayStateChange,
  mixerSettings = {},
  masterVolume = 0.87,
  onVolumeChange,
  onMasterVolumeChange,
  currentSessionId
}: SongArrangementProps) {
  const router = useRouter()
  const [patternBlocks, setPatternBlocks] = useState<PatternBlock[]>(patterns)
  const [currentPattern, setCurrentPattern] = useState<PatternBlock | null>(null)
  const [isArrangementPlaying, setIsArrangementPlaying] = useState(false)
  const [currentBar, setCurrentBar] = useState(1)
  
  // Volume control state
  const [trackVolumes, setTrackVolumes] = useState<{[trackId: number]: number}>({})
  const [arrangementMasterVolume, setArrangementMasterVolume] = useState(masterVolume)
  
  // Update master volume only if it hasn't been set by user
  useEffect(() => {
    // Only update if the master volume hasn't been changed from the default
    if (arrangementMasterVolume === masterVolume) {
      setArrangementMasterVolume(masterVolume)
    }
  }, [masterVolume])
  
  // Volume control functions
  const handleTrackVolumeChange = (trackId: number, volume: number) => {
    setTrackVolumes(prev => ({
      ...prev,
      [trackId]: volume
    }))
    onVolumeChange?.(trackId, volume)
    
    // Update audio gain if gain node exists
    const gainNode = arrangementGainNodesRef.current[trackId]
    if (gainNode) {
      gainNode.gain.value = volume * arrangementMasterVolume
    }
  }
  
  const handleMasterVolumeChange = (volume: number) => {
    setArrangementMasterVolume(volume)
    onMasterVolumeChange?.(volume)
    
    // Update all track volumes
    Object.keys(arrangementGainNodesRef.current).forEach(trackIdStr => {
      const trackId = parseInt(trackIdStr)
      const gainNode = arrangementGainNodesRef.current[trackId]
      const trackVolume = trackVolumes[trackId] || 1
      
      if (gainNode) {
        gainNode.gain.value = trackVolume * volume
      }
    })
  }
  
  // Initialize track volumes from mixer settings or defaults (only if not already set)
  useEffect(() => {
    const initialVolumes: {[trackId: number]: number} = {}
    let hasNewTracks = false
    
    tracks.forEach(track => {
      // Only set volume if this track doesn't have a volume set yet
      if (trackVolumes[track.id] === undefined) {
        hasNewTracks = true
        if (mixerSettings[track.id]) {
          initialVolumes[track.id] = mixerSettings[track.id].volume
        } else {
          initialVolumes[track.id] = 1.0 // Default volume
        }
      } else {
        // Preserve existing volume
        initialVolumes[track.id] = trackVolumes[track.id]
      }
    })
    
    // Only update if we have new tracks or if trackVolumes is empty
    if (hasNewTracks || Object.keys(trackVolumes).length === 0) {
      setTrackVolumes(initialVolumes)
    }
  }, [tracks, mixerSettings])
  
  // Safe setter for currentBar to prevent negative values
  const setCurrentBarSafe = (value: number) => {
    // Multiple safety checks to ensure positive value
    const safeValue = Math.max(1, Math.abs(value || 1))
    
    if (safeValue !== currentBar) {
      setCurrentBar(safeValue)
    }
  }
  const [totalBars, setTotalBars] = useState(64) // Default 64 bars (8 patterns of 8 bars each)
  const [zoom, setZoom] = useState(50) // pixels per bar
  const [showSetBarsDialog, setShowSetBarsDialog] = useState(false)
  const [customBarsInput, setCustomBarsInput] = useState('')
  const [scrollX, setScrollX] = useState(0)
  const [selectedBlocks, setSelectedBlocks] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [loadedTrackId, setLoadedTrackId] = useState<number | null>(null) // which track is in "load" mode
  const [selectedDuration, setSelectedDuration] = useState(8) // default 8 bars for new patterns
  const [isDeleteMode, setIsDeleteMode] = useState(false) // delete mode state
  
  // Fill track dialog state
  const [showFillTrackDialog, setShowFillTrackDialog] = useState(false)
  const [selectedTrackForFill, setSelectedTrackForFill] = useState<Track | null>(null)
  const [fillPatternSize, setFillPatternSize] = useState<4 | 8>(8)
  const [isCutMode, setIsCutMode] = useState(false) // cut mode state for splitting patterns
  const [isResizing, setIsResizing] = useState(false) // resize mode state
  const [isSelectorMode, setIsSelectorMode] = useState(false) // selector mode state for multi-selection
  const [resizeHandle, setResizeHandle] = useState<'left' | 'right' | null>(null) // which handle is being dragged
  const [resizeStart, setResizeStart] = useState({ x: 0, originalDuration: 0, originalStartBar: 0 })
  
  // A-B toggle state for shuffle modes
  const [shuffleMode, setShuffleMode] = useState<'A' | 'B'>('A') // A = pattern drops, B = saved arrangements
  // Individual track mode states - each track can have A (drops) and B (saved arrangements) active independently
  const [trackShuffleModes, setTrackShuffleModes] = useState<{[trackId: number]: { A: boolean, B: boolean }}>({})
  
  // Selection box state for click-and-drag selection
  const [isSelectionBoxActive, setIsSelectionBoxActive] = useState(false)
  const [selectionBoxStart, setSelectionBoxStart] = useState({ x: 0, y: 0 })
  const [selectionBoxEnd, setSelectionBoxEnd] = useState({ x: 0, y: 0 })
  
  // Notification modal state
  const [notificationModal, setNotificationModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning'
  })
  
  // Arrangement management state
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showLoadDialog, setShowLoadDialog] = useState(false)
  
  // Helper function to show notification modal
  const showNotification = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setNotificationModal({
      isOpen: true,
      title,
      message,
      type
    })
  }
  
  const closeNotification = () => {
    setNotificationModal(prev => ({ ...prev, isOpen: false }))
  }
  const [currentTrackForArrangement, setCurrentTrackForArrangement] = useState<Track | null>(null)
  const [arrangementName, setArrangementName] = useState('')
  const [arrangementDescription, setArrangementDescription] = useState('')
  const [arrangementCategory, setArrangementCategory] = useState('')
  const [arrangementTags, setArrangementTags] = useState('')
  const [arrangementGenre, setArrangementGenre] = useState('')
  const [arrangementSubgenre, setArrangementSubgenre] = useState('')
  const [arrangementBpm, setArrangementBpm] = useState('')
  const [arrangementAudioType, setArrangementAudioType] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [availableArrangements, setAvailableArrangements] = useState<any[]>([])
  
  // Save Beat states
  const [isSavingBeat, setIsSavingBeat] = useState(false)
  const [showSaveBeatDialog, setShowSaveBeatDialog] = useState(false)
  const [beatTitle, setBeatTitle] = useState('')
  const [beatDescription, setBeatDescription] = useState('')
  const [beatGenre, setBeatGenre] = useState('')
  const [beatBpm, setBeatBpm] = useState('')
  const [beatKey, setBeatKey] = useState('')
  const [beatPrice, setBeatPrice] = useState('')
  const [beatCoverImage, setBeatCoverImage] = useState<File | null>(null)
  const [beatCoverPreview, setBeatCoverPreview] = useState('')
  const [beatUploadError, setBeatUploadError] = useState('')
  
  // State for save to library
  const [isSavingToLibrary, setIsSavingToLibrary] = useState(false)
  const [librarySaveError, setLibrarySaveError] = useState<string | null>(null)
  const [showSaveToLibraryDialog, setShowSaveToLibraryDialog] = useState(false)
  const [saveToLibraryType, setSaveToLibraryType] = useState<'album' | 'single' | 'track' | 'audio-library'>('audio-library')
  const [existingItems, setExistingItems] = useState<{id: string, title: string, name?: string, cover_art_url?: string, artist?: string, description?: string}[]>([])
  const [selectedItemId, setSelectedItemId] = useState<string>('')
  const [createNew, setCreateNew] = useState(false)
  const [newItemTitle, setNewItemTitle] = useState('')
  const [newItemDescription, setNewItemDescription] = useState('')
  const [newTrackTitle, setNewTrackTitle] = useState('')
  const [newAlbumArtist, setNewAlbumArtist] = useState('')
  const [albumArtists, setAlbumArtists] = useState<string[]>([])
  const [newArtistInput, setNewArtistInput] = useState('')
  const [selectedAlbumDetails, setSelectedAlbumDetails] = useState<{id: string, title: string, artist: string, cover_art_url: string, description?: string} | null>(null)
  const [linkToSession, setLinkToSession] = useState(true) // Default to linking to session
  const [sessionName, setSessionName] = useState<string>('') // Store session name for display

  // Fetch session name when session ID is available
  useEffect(() => {
    const fetchSessionName = async () => {
      if (currentSessionId) {
        try {
          const { data, error } = await supabase
            .from('beat_sessions')
            .select('name')
            .eq('id', currentSessionId)
            .single()
          
          if (!error && data) {
            setSessionName(data.name)
          }
        } catch (error) {
          console.error('Error fetching session name:', error)
        }
      }
    }
    
    fetchSessionName()
  }, [currentSessionId])
  
  // Modal states
  const [showNoPatternsModal, setShowNoPatternsModal] = useState(false)
  
  // Export markers for start and end points
  const [exportStartBar, setExportStartBar] = useState(1)
  const [exportEndBar, setExportEndBar] = useState(1)
  const [exportMarkersActive, setExportMarkersActive] = useState(false)
  const [isExportLiveRecording, setIsExportLiveRecording] = useState(false)
  const exportAbortFlag = useRef(false)
  const manualStopFlag = useRef(false)
  
  // State for export live mode in save to library dialog
  const [isExportLiveMode, setIsExportLiveMode] = useState(false)
  
  // State for track selection in existing albums
  const [existingAlbumTracks, setExistingAlbumTracks] = useState<any[]>([])
  const [selectedTrackPosition, setSelectedTrackPosition] = useState<number>(1)
  const [showTrackSelection, setShowTrackSelection] = useState(false)
  


  // Function to update export markers based on pattern blocks
  const updateExportMarkers = useCallback(() => {
    if (patternBlocks.length > 0) {
      const startBar = Math.min(...patternBlocks.map(block => block.startBar))
      const endBar = Math.max(...patternBlocks.map(block => block.endBar))
      setExportStartBar(startBar)
      setExportEndBar(endBar)
    }
  }, [patternBlocks])

  // Auto-update export markers when pattern blocks change (only if markers not active)
  useEffect(() => {
    if (!exportMarkersActive) {
      updateExportMarkers()
    }
  }, [patternBlocks, updateExportMarkers, exportMarkersActive])

  // Function to set export markers (first click)
  const setExportMarkers = () => {
    if (patternBlocks.length > 0) {
      const startBar = Math.min(...patternBlocks.map(block => block.startBar))
      const endBar = Math.max(...patternBlocks.map(block => block.endBar))
      setExportStartBar(startBar)
      setExportEndBar(endBar)
      setExportMarkersActive(true)
      showNotification('Export Markers Set', `Start: Bar ${startBar}, End: Bar ${endBar}\n\nYou can now adjust the markers by clicking on the timeline, then click Export (Live) again to start recording.`, 'info')
    } else {
      showNotification('No Patterns', 'No patterns to export! Please add some patterns first.', 'warning')
    }
  }

  // Function to reset export markers
  const resetExportMarkers = () => {
    setExportMarkersActive(false)
  }

  // Function to update export timer when markers change
  const updateExportTimer = () => {
    if (isExportLiveRecording && (window as any).exportTimer) {
      // Calculate new duration
      const newExportDurationBars = exportEndBar - exportStartBar + 1
      const secondsPerBeat = 60 / bpm
      const beatsPerBar = 4
      const secondsPerBar = secondsPerBeat * beatsPerBar
      const newTotalDurationSeconds = newExportDurationBars * secondsPerBar
      
      // Clear existing timer
      if ((window as any).exportTimer) {
        clearTimeout((window as any).exportTimer)
      }
      
      // Set new timer
      (window as any).exportTimer = setTimeout(() => {
        try {
          // Create a separate function to call stopExportLive
          const executeStop = () => {
            stopExportLive()
          }
          executeStop()
        } catch (error) {
          console.error('[EXPORT TIMER] Error calling stopExportLive:', error)
        }
      }, newTotalDurationSeconds * 1000)
    }
  }

  // Manual stop function for export live
  const stopExportLiveRef = useRef<(() => void) | null>(null)
  
  const stopExportLive = (): void => {
    const manualStopTime = Date.now()
    console.log(`[MANUAL STOP DEBUG] 🛑 Manual stop requested at ${manualStopTime} - will stop and save recording...`)
    
    // CLEAR NUCLEAR TIMER IMMEDIATELY
    const nuclearTimer = (window as any).nuclearTimer
    if (nuclearTimer) {
      console.log('💀 [NUCLEAR TIMER] Clearing nuclear timer - manual stop triggered')
      clearTimeout(nuclearTimer)
      ;(window as any).nuclearTimer = null
    }
    
    // Set manual stop flag to indicate user-requested stop (but still save)
    manualStopFlag.current = true
    console.log(`[MANUAL STOP DEBUG] ✅ Manual stop flag set to true`)
    
    try {
      // Stop MediaRecorder if it exists
      const mediaRecorder = (window as any).mediaRecorderForExport
      if (mediaRecorder) {
        console.log(`[STOP EXPORT LIVE] Found MediaRecorder in state: ${mediaRecorder.state}`)
        if (mediaRecorder.state === 'recording' || mediaRecorder.state === 'paused') {
          mediaRecorder.stop()
          console.log('[STOP EXPORT LIVE] MediaRecorder stopped manually')
        }
      }
      
      // Clear timer
      if ((window as any).exportTimer) {
        clearTimeout((window as any).exportTimer)
        ;(window as any).exportTimer = null
        console.log('[STOP EXPORT LIVE] Timer cleared manually')
      }
      
      // Stop arrangement playback
      try {
        if (typeof stopArrangement === 'function') {
          stopArrangement()
          console.log('[STOP EXPORT LIVE] Arrangement stopped')
        }
      } catch (stopError) {
        console.warn('[STOP EXPORT LIVE] Error stopping arrangement:', stopError)
      }
      
      // Disconnect Tone.js if connected
      try {
        const Tone = (window as any).Tone
        if (Tone && Tone.Destination && (window as any).currentMediaStreamDestination) {
          Tone.Destination.disconnect((window as any).currentMediaStreamDestination)
          console.log('[STOP EXPORT LIVE] Tone.js disconnected')
        }
      } catch (disconnectError) {
        console.warn('[STOP EXPORT LIVE] Error disconnecting Tone.js:', disconnectError)
      }
      
      // Clean up global variables
      setIsExportLiveRecording(false)
      ;(window as any).mediaRecorderForExport = null
      ;(window as any).currentMediaStreamDestination = null
      ;(window as any).exportResolve = null
      ;(window as any).exportReject = null
      
      console.log('[STOP EXPORT LIVE] All cleanup completed')
      
    } catch (error) {
      console.error('[STOP EXPORT LIVE] Error stopping export:', error)
      try {
        // Force reset state even if there were errors
        setIsExportLiveRecording(false)
        ;(window as any).mediaRecorderForExport = null
        ;(window as any).currentMediaStreamDestination = null
        ;(window as any).exportResolve = null
        ;(window as any).exportReject = null
        console.log('[STOP EXPORT LIVE] Force reset completed after error')
      } catch (cleanupError) {
        console.error('[STOP EXPORT LIVE] Error in cleanup after stop error:', cleanupError)
      }
    }
  }
  
  // Store the function in ref
  stopExportLiveRef.current = stopExportLive

  // Monitor arrangement play state to auto-stop live export recording
  const previousPlayingState = useRef(false)
  
  useEffect(() => {
    console.log(`[AUTO-STOP DEBUG] Play state change: prev=${previousPlayingState.current}, current=${isPlaying}, recording=${isExportLiveRecording}`)
    
    // Only trigger when transitioning FROM playing TO stopped, not the other way around
    if (previousPlayingState.current === true && !isPlaying && isExportLiveRecording) {
      console.log('[AUTO-STOP] ✅ Arrangement stopped playing - auto-stopping live export recording in 500ms')
      
      // Add a small delay to ensure the last bit of audio is captured
      setTimeout(() => {
        console.log('[AUTO-STOP] ✅ 500ms delay complete - calling stopExportLive()')
        stopExportLive()
      }, 500) // 500ms delay to capture the tail end of audio
    } else {
      console.log('[AUTO-STOP DEBUG] No auto-stop triggered:', {
        prevPlaying: previousPlayingState.current,
        currentPlaying: isPlaying,
        recording: isExportLiveRecording,
        shouldTrigger: previousPlayingState.current === true && !isPlaying && isExportLiveRecording
      })
    }
    
    // Update the previous state
    previousPlayingState.current = isPlaying
  }, [isPlaying, isExportLiveRecording])

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
  const arrangementGainNodesRef = useRef<{ [trackId: number]: Tone.Gain }>({})
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
        let currentBarPosition = (bars || 0) + 1 + ((beats || 0) / 4) + ((sixteenths || 0) / 16 / 4)
        
        // In export mode, adjust the bar position to be relative to the export start marker
        if (exportMarkersActive) {
          currentBarPosition = exportStartBar + (currentBarPosition - 1)
        }
        
        // Calculate the maximum duration based on actual pattern blocks, not the steps prop
        const maxEndBar = patternBlocks.length > 0 ? Math.max(...patternBlocks.map(block => block.endBar)) : totalBars
        
        // If export markers are active, use the export end marker as the stop point
        const stopBar = exportMarkersActive ? exportEndBar : maxEndBar
        
        // Only update if we have a valid position and it's significantly different
        // Allow playhead to go beyond the steps limit (8 bars) up to the actual arrangement duration
        // Note: Steps are now 128 (8 bars at 1/16 resolution)
        if (currentBarPosition >= 1 && Math.abs(currentBarPosition - currentBar) > 0.01) {
          setCurrentBarSafe(currentBarPosition)
        }
        
        // Check if we've reached the end of the arrangement or export marker
        if (currentBarPosition > stopBar) {
          stopArrangement()
        }
        
        // CRITICAL: In export mode, also check if we've reached the export end marker exactly
        if (exportMarkersActive && currentBarPosition >= exportEndBar) {
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
      if (isArrangementAudioInitialized.current) {
        return
      }
      
      try {
        // Start Tone.js audio context
        await Tone.start()
        
        // CRITICAL: Ensure audio context is running
        if (Tone.context.state !== 'running') {
          await Tone.context.resume()
        }
        
        // Ensure audio context is fully ready
        if (Tone.context.state === 'suspended') {
          try {
            await Tone.context.resume()
          } catch (resumeError) {
            console.error('[ARRANGEMENT AUDIO] Failed to resume audio context:', resumeError)
            return
          }
        }
        
        // CRITICAL FIX: Use the global transport but ensure it's properly configured and isolated
        // This allows both sequencer and arrangement to coexist without conflicts
        arrangementTransportRef.current = Tone.getTransport()
        
        // CRITICAL: Ensure transport is in a clean state
        if (arrangementTransportRef.current.state !== 'stopped') {
          arrangementTransportRef.current.stop()
          arrangementTransportRef.current.cancel()
        }
        
        arrangementTransportRef.current.loop = false // Explicitly disable looping for arrangement
        arrangementTransportRef.current.bpm.value = bpm
        arrangementTransportRef.current.position = 0
        
        // CRITICAL: Verify transport is properly initialized
        if (!arrangementTransportRef.current.start || typeof arrangementTransportRef.current.start !== 'function') {
          console.error('[ARRANGEMENT AUDIO] Transport is not properly initialized! start method missing.')
          return
        }
        
      // Load audio for tracks that have audio URLs
      const loadPromises = tracks.map(async (track) => {
        if (track.audioUrl && track.audioUrl !== 'undefined') {
          try {
            // Create gain node for volume control
            const gainNode = new Tone.Gain(1).toDestination()
            
            // Use the global context for pitch shifter and player
            const pitchShifter = new Tone.PitchShift({
              pitch: 0,  // Always start with 0 pitch shift
              windowSize: 0.025,  // Use professional quality settings
              delayTime: 0.0005,  // Minimal delay for maximum quality
              feedback: 0.01      // Very low feedback for crystal clear audio
            }).connect(gainNode)
            
            // Apply pitch shift after creation if needed
            if (track.pitchShift && track.pitchShift !== 0) {
              pitchShifter.pitch = track.pitchShift
            }
            
            const player = new Tone.Player(track.audioUrl).connect(pitchShifter)
            
            // Apply playback rate if specified
            if (track.playbackRate && track.playbackRate !== 1) {
              player.playbackRate = track.playbackRate
            }
            
            // Wait for the player to load
            await player.load(track.audioUrl)
            
            arrangementPlayersRef.current[track.id] = player
            arrangementPitchShiftersRef.current[track.id] = pitchShifter
            arrangementGainNodesRef.current[track.id] = gainNode
          } catch (error) {
            console.error(`[ARRANGEMENT AUDIO] Failed to load audio for track ${track.name}:`, error)
          }
        }
      })
      
      // Wait for all audio to load
      await Promise.all(loadPromises)
      
      isArrangementAudioInitialized.current = true
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
      
      // Dispose gain nodes
      Object.values(arrangementGainNodesRef.current).forEach(gainNode => {
        gainNode.dispose()
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
    if (patterns && patterns.length > 0) {
      console.log('[SONG ARRANGEMENT] Initializing patterns from props:', patterns)
      setPatternBlocks(patterns)
    } else {
      // Clear any existing patterns to ensure clean slate
      console.log('[SONG ARRANGEMENT] No patterns from props - clearing any existing patterns')
      setPatternBlocks([])
    }
  }, [patterns])

  // DISABLED: Auto-initialize patterns - this was causing unwanted patterns to appear
  // const hasAutoInitializedRef = useRef(false)
  // const lastSessionIdRef = useRef<string | null | undefined>(undefined)
  const isShufflingRef = useRef(false) // Flag to prevent auto-init during shuffle operations
  
  // DISABLED: Reset auto-initialization flag when session changes
  // useEffect(() => {
  //   if (currentSessionId !== lastSessionIdRef.current) {
  //     hasAutoInitializedRef.current = false
  //     lastSessionIdRef.current = currentSessionId
  //   }
  // }, [currentSessionId])
  
  // DISABLED: Auto-initialization effect - this was creating unwanted patterns
  // useEffect(() => {
  //   // Don't auto-initialize if we're currently shuffling
  //   if (isShufflingRef.current) {
  //     return
  //   }
  //   
  //   // Don't auto-initialize if we have a current session (session is being loaded)
  //   // This prevents overwriting patterns that are being loaded from a saved session
  //   if (currentSessionId) {
  //     return
  //   }
  //   
  //   // Only auto-initialize if:
  //   // 1. We haven't auto-initialized before
  //   // 2. We have tracks
  //   // 3. There are absolutely no patterns anywhere
  //   // 4. No current session (not loading a saved session)
  //   if (!hasAutoInitializedRef.current && tracks.length > 0 && patternBlocks.length === 0 && patterns.length === 0) {
  //     hasAutoInitializedRef.current = true
  //     
  //     // First try to create patterns from current sequencer data
  //     if (Object.keys(sequencerData).length > 0 && Object.values(sequencerData).some(data => data && data.length > 0)) {
  //       console.log('[AUTO-INIT] Creating patterns from current sequencer data')
  //       createPatternsFromSequencer()
  //     } else {
  //       // Fall back to loading default patterns
  //       console.log('[AUTO-INIT] No sequencer data available, loading default patterns')
  //       loadElevenPatternsFromEachTrack()
  //     }
  //   }
  // }, [tracks, patternBlocks.length, patterns.length, currentSessionId, sequencerData])







  // Monitor for unexpected audio playback - only when needed
  useEffect(() => {
    let monitorInterval: NodeJS.Timeout | null = null
    
    if (!isArrangementPlaying) {
      // Set up a monitoring interval to check if audio is playing when it shouldn't be
      monitorInterval = setInterval(() => {
        const anyPlayerPlaying = Object.values(arrangementPlayersRef.current).some(player => 
          player && player.state === 'started'
        )
        const transportPlaying = arrangementTransportRef.current?.state === 'started'
        
        if (anyPlayerPlaying || transportPlaying) {
          // Only log once per issue to avoid spam
          if (!window._audioMonitorLogged) {
            console.warn('[AUDIO MONITOR] Unexpected audio detected when stopped!')
            window._audioMonitorLogged = true
          }
          
          // Force stop everything with aggressive cleanup
          if (arrangementTransportRef.current) {
            try {
              arrangementTransportRef.current.stop()
              arrangementTransportRef.current.cancel()
            } catch (error) {
              console.error('[AUDIO MONITOR] Error stopping transport:', error)
            }
          }
          
          // Force stop all players with multiple attempts
          let stuckPlayers = 0
          Object.entries(arrangementPlayersRef.current).forEach(([trackId, player]) => {
            if (player && player.state === 'started') {
              try {
                player.stop()
                // Double-check
                if (player.state === 'started') {
                  player.stop()
                  // If still stuck after second attempt, mark for disposal
                  if (player.state === 'started') {
                    stuckPlayers++
                  }
                }
              } catch (error) {
                console.error(`[AUDIO MONITOR] Error stopping unexpected player ${trackId}:`, error)
                stuckPlayers++
                // Try dispose as last resort
                try {
                  if (player.dispose) {
                    player.dispose()
                  }
                } catch (disposeError) {
                  console.error(`[AUDIO MONITOR] Error disposing player ${trackId}:`, disposeError)
                }
              }
            }
          })
          
          // If we have stuck players, force reinitialize the audio system
          if (stuckPlayers > 0) {
            console.error(`[AUDIO MONITOR] ${stuckPlayers} players are stuck! Forcing audio system reinitialization...`)
            isArrangementAudioInitialized.current = false
            // Clear all players and force reinit on next play
            arrangementPlayersRef.current = {}
            arrangementPitchShiftersRef.current = {}
          }
        } else {
          // Reset the log flag when no issues detected
          window._audioMonitorLogged = false
        }
      }, 1000) // Check every 1 second instead of 500ms to reduce spam
    }
    
    return () => {
      if (monitorInterval) {
        clearInterval(monitorInterval)
        monitorInterval = null
      }
    }
  }, [isArrangementPlaying])

  // Toggle load mode for a track
  const toggleLoadMode = (trackId: number) => {
    if (loadedTrackId === trackId) {
      setLoadedTrackId(null) // Turn off load mode
    } else {
      setLoadedTrackId(trackId) // Turn on load mode for this track
    }
  }

  // Toggle selector mode for multi-selection
  const toggleSelectorMode = () => {
    setIsSelectorMode(!isSelectorMode)
    // Clear other modes when entering selector mode
    if (!isSelectorMode) {
      setIsDeleteMode(false)
      setIsCutMode(false)
      setLoadedTrackId(null)
    }
    // Clear selections when exiting selector mode
    if (isSelectorMode) {
      setSelectedBlocks([])
    }
  }

  // Toggle pattern selection in selector mode
  const togglePatternSelection = (blockId: string) => {
    if (!isSelectorMode) return
    
    setSelectedBlocks(prev => {
      if (prev.includes(blockId)) {
        return prev.filter(id => id !== blockId)
      } else {
        return [...prev, blockId]
      }
    })
  }

  // Clear all selections
  const clearAllSelections = () => {
    setSelectedBlocks([])
  }

  // Delete selected patterns
  const deleteSelectedPatterns = () => {
    if (selectedBlocks.length === 0) return
    
    const updatedPatterns = patternBlocks.filter(block => !selectedBlocks.includes(block.id))
    setPatternBlocks(updatedPatterns)
    setSelectedBlocks([])
    onPatternsChange?.(updatedPatterns)
  }

  // Duplicate selected patterns
  const duplicateSelectedPatterns = () => {
    if (selectedBlocks.length === 0) return
    
    const selectedPatterns = patternBlocks.filter(block => selectedBlocks.includes(block.id))
    const duplicatedPatterns = selectedPatterns.map(pattern => ({
      ...pattern,
      id: `pattern-${Date.now()}-${pattern.trackId}-duplicate-${Math.random()}`,
      name: `${pattern.name} (Copy)`,
      startBar: pattern.startBar + 8, // Offset by 8 bars
      endBar: pattern.endBar + 8
    }))
    
    const updatedPatterns = [...patternBlocks, ...duplicatedPatterns]
    setPatternBlocks(updatedPatterns)
    setSelectedBlocks([])
    onPatternsChange?.(updatedPatterns)
  }

  // Start selection box
  const startSelectionBox = (e: React.MouseEvent) => {
    if (!isSelectorMode) return
    
    const rect = gridRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const x = e.clientX - rect.left + scrollX
    const y = e.clientY - rect.top
    
    setIsSelectionBoxActive(true)
    setSelectionBoxStart({ x, y })
    setSelectionBoxEnd({ x, y })
  }

  // Update selection box
  const updateSelectionBox = (e: React.MouseEvent) => {
    if (!isSelectionBoxActive || !isSelectorMode) return
    
    const rect = gridRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const x = e.clientX - rect.left + scrollX
    const y = e.clientY - rect.top
    
    setSelectionBoxEnd({ x, y })
  }

  // End selection box and select patterns
  const endSelectionBox = () => {
    if (!isSelectionBoxActive || !isSelectorMode) return
    
    setIsSelectionBoxActive(false)
    
    // Calculate selection box bounds
    const left = Math.min(selectionBoxStart.x, selectionBoxEnd.x)
    const right = Math.max(selectionBoxStart.x, selectionBoxEnd.x)
    const top = Math.min(selectionBoxStart.y, selectionBoxEnd.y)
    const bottom = Math.max(selectionBoxStart.y, selectionBoxEnd.y)
    
    // Find patterns that intersect with the selection box
    const selectedPatternIds: string[] = []
    
    patternBlocks.forEach(block => {
      const blockLeft = (block.startBar - 1) * zoom
      const blockRight = blockLeft + (block.duration * zoom)
      const blockTop = tracks.findIndex(t => t.id === block.trackId) * 60 + 5
      const blockBottom = blockTop + 50 // Assuming 50px height
      
      // Check if block intersects with selection box
      if (blockLeft < right && blockRight > left && blockTop < bottom && blockBottom > top) {
        selectedPatternIds.push(block.id)
      }
    })
    
    // Update selected blocks
    setSelectedBlocks(prev => {
      const newSelection = [...prev]
      selectedPatternIds.forEach(id => {
        if (!newSelection.includes(id)) {
          newSelection.push(id)
        }
      })
      return newSelection
    })
  }

  // Check if a pattern is in the current selection box
  const isPatternInSelectionBox = (block: PatternBlock) => {
    if (!isSelectionBoxActive) return false
    
    const left = Math.min(selectionBoxStart.x, selectionBoxEnd.x)
    const right = Math.max(selectionBoxStart.x, selectionBoxEnd.x)
    const top = Math.min(selectionBoxStart.y, selectionBoxEnd.y)
    const bottom = Math.max(selectionBoxStart.y, selectionBoxEnd.y)
    
    const blockLeft = (block.startBar - 1) * zoom
    const blockRight = blockLeft + (block.duration * zoom)
    const blockTop = tracks.findIndex(t => t.id === block.trackId) * 60 + 5
    const blockBottom = blockTop + 50
    
    return blockLeft < right && blockRight > left && blockTop < bottom && blockBottom > top
  }

  // Helper function to detect genre from track name
  const detectGenreFromTrackName = (trackName: string): { genre: string; subgenre: string } => {
    const name = trackName.toLowerCase()
    
    // Genre detection based on track name patterns
    if (name.includes('kick') || name.includes('drum') || name.includes('beat')) {
      return { genre: 'Hip Hop', subgenre: 'Trap' }
    }
    if (name.includes('melody') || name.includes('piano') || name.includes('synth')) {
      return { genre: 'Hip Hop', subgenre: 'R&B' }
    }
    if (name.includes('bass') || name.includes('808')) {
      return { genre: 'Hip Hop', subgenre: 'Trap' }
    }
    if (name.includes('snare') || name.includes('clap')) {
      return { genre: 'Hip Hop', subgenre: 'Boom Bap' }
    }
    if (name.includes('hihat') || name.includes('hat')) {
      return { genre: 'Hip Hop', subgenre: 'Trap' }
    }
    
    // Default fallback
    return { genre: 'Hip Hop', subgenre: 'Trap' }
  }

  // Arrangement management functions
  const openSaveDialog = (track: Track) => {
    setCurrentTrackForArrangement(track)
    setArrangementName(`${getTrackDisplayName(track.name)} Arrangement`)
    setArrangementDescription('')
    setArrangementCategory('')
    // Auto-fill tags from track data if available
    setArrangementTags(track.tags ? track.tags.join(', ') : '')
    
    // Auto-fill genre and subgenre from track data or detect from name
    const detectedGenre = detectGenreFromTrackName(track.name)
    setArrangementGenre(track.genre || detectedGenre.genre)
    setArrangementSubgenre(track.subgenre || detectedGenre.subgenre)
    
    setArrangementBpm(bpm.toString())
    setArrangementAudioType(track.name)
    setShowSaveDialog(true)
  }

  const openLoadDialog = async (track: Track) => {
    setCurrentTrackForArrangement(track)
    setIsLoading(true)
    
    try {
      // Get user token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        alert('Please log in to load arrangements')
        return
      }

      // Search for arrangements for this track
      const response = await fetch('/api/arrangements/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          filters: {
            searchTerm: track.name
          },
          limit: 50
        })
      })

      if (response.ok) {
        const data = await response.json()
        setAvailableArrangements(data.arrangements || [])
      } else {
        console.error('Failed to load arrangements')
        setAvailableArrangements([])
      }
    } catch (error) {
      console.error('Error loading arrangements:', error)
      setAvailableArrangements([])
    } finally {
      setIsLoading(false)
      setShowLoadDialog(true)
    }
  }

  const openFillTrackDialog = (track: Track) => {
    setSelectedTrackForFill(track)
    setFillPatternSize(8) // Default to 8 bars
    setShowFillTrackDialog(true)
  }

  const saveArrangement = async () => {
    if (!currentTrackForArrangement || !arrangementName.trim()) {
      alert('Please enter a name for the arrangement')
      return
    }

    setIsSaving(true)
    
    try {
      // Get user session with better error handling
      
      // Try multiple authentication methods
      let user = null
      let session = null
      
      // Method 1: Try getSession
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionData.session) {
          session = sessionData.session
          user = sessionData.session.user
        }
      } catch (error) {
        console.error('[SAVE ARRANGEMENT] getSession error:', error)
      }
      
      // Method 2: If no session, try getUser
      if (!user) {
        try {
          const { data: userData, error: userError } = await supabase.auth.getUser()
          
          if (userData.user) {
            user = userData.user
          }
        } catch (error) {
          console.error('[SAVE ARRANGEMENT] getUser error:', error)
        }
      }
      
      // Method 3: Try to refresh the session
      if (!session && user) {
        try {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
          
          if (refreshData.session) {
            session = refreshData.session
          }
        } catch (error) {
          console.error('[SAVE ARRANGEMENT] refreshSession error:', error)
        }
      }
      
      if (!user) {
        alert('Please log in to save arrangements. No user found.')
        return
      }
      
      if (!session?.access_token) {
        alert('Authentication token expired. Please refresh the page and try again.')
        return
      }

      // Get patterns for this track
      const trackPatterns = patternBlocks.filter(block => block.trackId === currentTrackForArrangement.id)
      
      if (trackPatterns.length === 0) {
        alert('No patterns found for this track. Please add some patterns first.')
        return
      }

            const arrangementData = {
        trackId: currentTrackForArrangement.id,
        trackName: currentTrackForArrangement.name,
        name: arrangementName.trim(),
        description: arrangementDescription.trim(),
        patternBlocks: trackPatterns,
        totalBars,
        zoomLevel: zoom,
        bpm: parseInt(arrangementBpm) || bpm || 120,
        steps,
        tags: arrangementTags.trim() ? arrangementTags.split(',').map(tag => tag.trim()) : [],
        category: arrangementCategory === 'none' ? undefined : arrangementCategory.trim() || undefined,
        genre: arrangementGenre.trim() || undefined,
        subgenre: arrangementSubgenre.trim() || undefined,
        audioType: arrangementAudioType.trim() || undefined,
        isFavorite: false,
        isTemplate: false
      }

      const response = await fetch('/api/arrangements/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(arrangementData)
      })

      if (response.ok) {
        showNotification('Success', 'Arrangement saved successfully!', 'success')
        setShowSaveDialog(false)
        setArrangementName('')
        setArrangementDescription('')
        setArrangementCategory('')
        setArrangementTags('')
        setArrangementGenre('')
        setArrangementSubgenre('')
        setArrangementBpm('')
        setArrangementAudioType('')
      } else {
        const error = await response.json()
        showNotification('Error', `Failed to save arrangement: ${error.error}`, 'error')
      }
    } catch (error) {
      console.error('Error saving arrangement:', error)
      showNotification('Error', 'Failed to save arrangement', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const loadArrangement = async (arrangementId: string) => {
    setIsLoading(true)
    
    try {
      // Get user token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        showNotification('Error', 'Please log in to load arrangements', 'error')
        return
      }

      const response = await fetch('/api/arrangements/load', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ arrangementId })
      })

      if (response.ok) {
        const data = await response.json()
        const arrangement = data.arrangement
        
        // Remove existing patterns for this track
        const otherTrackPatterns = patternBlocks.filter(block => block.trackId !== arrangement.trackId)
        
        // Cut patterns that extend beyond totalBars
        const cutPatterns = arrangement.patternBlocks.map((pattern: any) => {
          if (pattern.startBar > totalBars) {
            // Pattern starts beyond the limit - skip it
            return null
          } else if (pattern.endBar > totalBars) {
            // Pattern extends beyond the limit - cut it
            return {
              ...pattern,
              id: `${pattern.id}-cut-at-${totalBars}`,
              name: `${pattern.name} (Cut at Bar ${totalBars})`,
              endBar: totalBars,
              duration: totalBars - pattern.startBar + 1
            }
          } else {
            // Pattern is within the limit - keep as is
            return pattern
          }
        }).filter((pattern: any) => pattern !== null)
        
        // Add the loaded patterns (after cutting to fit)
        const newPatternBlocks = [...otherTrackPatterns, ...cutPatterns]
        
        setPatternBlocks(newPatternBlocks)
        // Don't update totalBars - respect the current setting
        setZoom(arrangement.zoomLevel)
        
        // Update parent component
        onPatternsChange?.(newPatternBlocks)
        
        console.log(`[LOAD ARRANGEMENT] Arrangement "${arrangement.name}" loaded successfully! (${cutPatterns.length} patterns, cut to fit ${totalBars} bars)`)
        setShowLoadDialog(false)
      } else {
        const error = await response.json()
        showNotification('Error', `Failed to load arrangement: ${error.error}`, 'error')
      }
    } catch (error) {
      console.error('Error loading arrangement:', error)
      showNotification('Error', 'Failed to load arrangement', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  // Save Beat functions
  const openSaveBeatDialog = () => {
    setBeatTitle('')
    setBeatDescription('')
    setBeatGenre('')
    setBeatBpm(bpm.toString())
    setBeatKey('')
    setBeatPrice('')
    setBeatCoverImage(null)
    setBeatCoverPreview('')
    setBeatUploadError('')
    setShowSaveBeatDialog(true)
  }

  const uploadBeatCoverImage = async (file: File): Promise<string | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setBeatUploadError('Please log in to upload cover image')
        return null
      }

      const fileExt = file.name.split('.').pop()
      const filePath = `beat-covers/${session.user.id}/${Date.now()}.${fileExt}`
      
      const { error } = await supabase.storage
        .from('beats')
        .upload(filePath, file, { upsert: true })
      
      if (error) {
        setBeatUploadError(`Cover upload failed: ${error.message}`)
        return null
      }

      const { data } = supabase.storage
        .from('beats')
        .getPublicUrl(filePath)
      
      return data?.publicUrl || null
    } catch (error) {
      console.error('Cover upload error:', error)
      setBeatUploadError('Failed to upload cover image')
      return null
    }
  }

  const saveBeat = async () => {
    if (!beatTitle.trim()) {
      setBeatUploadError('Please enter a beat title')
      return
    }

    setIsSavingBeat(true)
    setBeatUploadError('')

    try {
      // Get user session with better error handling
      console.log('[SAVE BEAT] Checking authentication...')
      
      // Try multiple authentication methods
      let user = null
      let session = null
      
      // Method 1: Try getSession
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        console.log('[SAVE BEAT] getSession result:', { session: !!sessionData.session, error: sessionError })
        
        if (sessionData.session) {
          session = sessionData.session
          user = sessionData.session.user
        }
      } catch (error) {
        console.error('[SAVE BEAT] getSession error:', error)
      }
      
      // Method 2: If no session, try getUser
      if (!user) {
        try {
          const { data: userData, error: userError } = await supabase.auth.getUser()
          console.log('[SAVE BEAT] getUser result:', { user: !!userData.user, error: userError })
          
          if (userData.user) {
            user = userData.user
          }
        } catch (error) {
          console.error('[SAVE BEAT] getUser error:', error)
        }
      }
      
      // Method 3: Try to refresh the session
      if (!session && user) {
        try {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
          console.log('[SAVE BEAT] refreshSession result:', { session: !!refreshData.session, error: refreshError })
          
          if (refreshData.session) {
            session = refreshData.session
          }
        } catch (error) {
          console.error('[SAVE BEAT] refreshSession error:', error)
        }
      }
      
      console.log('[SAVE BEAT] Final auth check:', { user: !!user, session: !!session, accessToken: !!session?.access_token })
      
      if (!user) {
        setBeatUploadError('Please log in to save beats. No user found.')
        return
      }
      
      if (!session?.access_token) {
        setBeatUploadError('Authentication token expired. Please refresh the page and try again.')
        return
      }

      // Export WAV (this will handle audio state preservation internally)
      console.log('[SAVE BEAT] Exporting WAV for beat save...')
      const wavBlob = await exportBeatAsWav()
      
      if (!wavBlob || wavBlob.size === 0) {
        setBeatUploadError('Failed to export WAV file')
        return
      }

      // Upload WAV to storage
      const wavFileName = `${beatTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.wav`
      const wavFilePath = `beats/${session.user.id}/${wavFileName}`
      
      const { error: wavUploadError } = await supabase.storage
        .from('beats')
        .upload(wavFilePath, wavBlob, { 
          upsert: true,
          contentType: 'audio/wav'
        })
      
      if (wavUploadError) {
        setBeatUploadError(`WAV upload failed: ${wavUploadError.message}`)
        return
      }

      const { data: wavUrlData } = supabase.storage
        .from('beats')
        .getPublicUrl(wavFilePath)

      // Upload cover image if provided
      let coverImageUrl = null
      if (beatCoverImage) {
        coverImageUrl = await uploadBeatCoverImage(beatCoverImage)
        if (!coverImageUrl) {
          setBeatUploadError('Failed to upload cover image')
          return
        }
      }

      // Save beat to database - using only columns that exist in the actual database
      const beatData = {
        producer_id: session.user.id,
        title: beatTitle.trim(),
        description: beatDescription.trim() || null,
        mp3_url: wavUrlData.publicUrl, // Use WAV as primary audio (matching upload page)
        play_count: 0,
        price: beatPrice ? parseFloat(beatPrice) : 0
      }

      const { data: beat, error: beatError } = await supabase
        .from('beats')
        .insert([beatData])
        .select()
        .single()

      if (beatError) {
        setBeatUploadError(`Failed to save beat: ${beatError.message}`)
        return
      }

      // Success!
      alert('Beat saved successfully!')
      setShowSaveBeatDialog(false)
      setBeatTitle('')
      setBeatDescription('')
      setBeatGenre('')
      setBeatBpm('')
      setBeatKey('')
      setBeatPrice('')
      setBeatCoverImage(null)
      setBeatCoverPreview('')

    } catch (error) {
      console.error('Save beat error:', error)
      setBeatUploadError('Failed to save beat')
    } finally {
      setIsSavingBeat(false)
    }
  }

  // Handle mouse down on the grid for selection box
  const handleGridMouseDown = (e: React.MouseEvent) => {
    // Only start selection box if in selector mode
    if (isSelectorMode) {
      // Check if the click is on a pattern block - if so, don't start selection box
      const target = e.target as HTMLElement
      const isOnPatternBlock = target.closest('[data-pattern-block]') || target.closest('.pattern-block')
      
      if (isOnPatternBlock) {
        console.log('[SELECTION BOX] Click is on pattern block - not starting selection box')
        return
      }
      
      console.log('[SELECTION BOX] Mouse down detected in selector mode on empty grid - starting selection box')
      startSelectionBox(e)
      return
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
    
    // If export markers are active, allow adjusting them
    if (exportMarkersActive) {
      // Check if click is closer to start or end marker
      const startDistance = Math.abs(clickedBar - exportStartBar)
      const endDistance = Math.abs(clickedBar - exportEndBar)
      
      if (startDistance <= endDistance) {
        setExportStartBar(clickedBar)
        // Update timer if recording
        setTimeout(() => updateExportTimer(), 100)
      } else {
        setExportEndBar(clickedBar)
        // Update timer if recording
        setTimeout(() => updateExportTimer(), 100)
      }
      return
    }
    
    // Set the playhead to the clicked position
    setCurrentBarSafe(clickedBar)
    
    // If currently playing, restart from the new position
    if (isArrangementPlaying) {
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
    
    // If in selector mode, don't do anything on click - selection box is handled by mouse down
    if (isSelectorMode) {
      return
    }
    
    // If we're in load mode, place a pattern
    if (loadedTrackId) {
      // Find the loaded track
      const loadedTrack = tracks.find(t => t.id === loadedTrackId)
      if (!loadedTrack) return
      
      // Check if the pattern would extend beyond totalBars
      const endBar = clickedBar + selectedDuration - 1
      if (endBar > totalBars) {
        showNotification('Pattern Too Long', `Cannot place pattern: it would extend beyond bar ${totalBars}. Try placing it earlier or reduce the pattern duration.`, 'warning')
        return
      }
      
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
        endBar: endBar,
        color: loadedTrack.color,
        trackId: loadedTrack.id
      }

      const newPatternBlocks = [...patternBlocks, newBlock]
      setPatternBlocks(newPatternBlocks)
      // Don't update totalBars - respect the current setting
      onPatternsChange?.(newPatternBlocks)
    } else if (isArrangementPlaying) {
      // If not in load mode but playing, seek to clicked position
      const newBar = Math.max(1, Math.min(totalBars, clickedBar))
      setCurrentBarSafe(newBar)
      
      // Update transport position
      if (arrangementTransportRef.current) {
        const newPosition = (newBar - 1) * 4 // 4 beats per bar
        arrangementTransportRef.current.position = newPosition
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

  // Handle pattern block click for delete mode, cut mode, and selector mode
  const handlePatternBlockClick = (blockId: string) => {
    if (isSelectorMode) {
      togglePatternSelection(blockId)
    } else if (isDeleteMode) {
      removePatternBlock(blockId)
    } else if (isCutMode) {
      const block = patternBlocks.find(b => b.id === blockId)
      if (block) {
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
    // Don't update totalBars - respect the current setting
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

  // Function to calculate actual pattern length from sequencer data
  const calculatePatternLengthFromSequencer = (trackSequencerData: boolean[], stepsPerBar: number = 16): number => {
    if (!trackSequencerData || trackSequencerData.length === 0) {
      return 1 // Default to 1 bar if no data
    }
    
    // Find the last active step
    let lastActiveStep = -1
    for (let i = trackSequencerData.length - 1; i >= 0; i--) {
      if (trackSequencerData[i]) {
        lastActiveStep = i
        break
      }
    }
    
    if (lastActiveStep === -1) {
      return 1 // No active steps, default to 1 bar
    }
    
    // Calculate bars based on steps and grid division
    const totalSteps = trackSequencerData.length
    const bars = Math.ceil((lastActiveStep + 1) / stepsPerBar)
    
    // CRITICAL FIX: For song arrangement, we want to respect the full pattern length
    // If the sequencer has 128 steps (8 bars), and we have active steps, 
    // we should use the full 8 bars, not just the bars with active steps
    const totalBars = Math.ceil(totalSteps / stepsPerBar)
    
    // If we have active steps and the total is 8 bars, use the full 8 bars
    // This ensures patterns play their intended full length
    if (totalBars === 8 && bars > 0) {
      console.log(`[PATTERN LENGTH] Full 8-bar pattern detected, using full length instead of ${bars} bars`)
      return 8
    }
    
    console.log(`[PATTERN LENGTH] Track has ${totalSteps} steps, last active at step ${lastActiveStep}, calculated ${bars} bars, total available: ${totalBars} bars`)
    return Math.max(1, bars) // Minimum 1 bar
  }

  // Load 11 patterns from each track automatically
  const loadElevenPatternsFromEachTrack = () => {
    console.log('[LOAD PATTERNS] Loading 11 patterns from each track')
    
    // Clear existing patterns first
    const newPatternBlocks: PatternBlock[] = []
    
    tracks.forEach((track, trackIndex) => {
      // Get the sequencer data for this track
      const trackSequencerData = sequencerData[track.id] || []
      
      // Calculate the actual pattern length from sequencer data
      // steps = 128 represents 8 bars at 16 steps per bar, so stepsPerBar = 16
      const stepsPerBar = 16 // Fixed: 16 steps per bar for 1/16 resolution
      const actualPatternLength = calculatePatternLengthFromSequencer(trackSequencerData, stepsPerBar)
      
      console.log(`[LOAD PATTERNS] Track ${track.name}:`, {
        sequencerDataLength: trackSequencerData.length,
        stepsPerBar,
        actualPatternLength,
        selectedDuration,
        finalPatternDuration: Math.max(actualPatternLength, selectedDuration)
      })
      
      // Use the actual pattern length instead of hardcoded selectedDuration
      const patternDuration = Math.max(actualPatternLength, selectedDuration)
      
      // Calculate how many patterns can fit within totalBars
      const maxPatterns = Math.floor(totalBars / patternDuration)
      const patternsToCreate = Math.min(11, maxPatterns)
      
      // Create patterns for each track, starting from bar 1
      for (let i = 0; i < patternsToCreate; i++) {
        const startBar = 1 + (i * patternDuration) // Start from bar 1, then 1+8=9, 1+16=17, etc.
        const endBar = startBar + patternDuration - 1
        
        // Skip if this pattern would extend beyond totalBars
        if (endBar > totalBars) {
          break
        }
        
        const patternBlock: PatternBlock = {
          id: `pattern-${Date.now()}-${track.id}-${i}-${Math.random()}`,
          name: `${getTrackDisplayName(track.name)} Pattern ${i + 1}`,
          tracks: [track],
          sequencerData: { [track.id]: trackSequencerData },
          bpm: bpm,
          steps: steps,
          duration: patternDuration, // Use actual calculated duration
          startBar: startBar,
          endBar: endBar,
          color: track.color,
          trackId: track.id
        }
        
        newPatternBlocks.push(patternBlock)
      }
    })
    
    // Replace all existing patterns with the new ones (don't add to existing)
    setPatternBlocks(newPatternBlocks)
    
    // Don't update totalBars - respect the current setting
    // Notify parent component
    onPatternsChange?.(newPatternBlocks)
    
    console.log(`[LOAD PATTERNS] Created ${newPatternBlocks.length} patterns across ${tracks.length} tracks within ${totalBars} bars (cleared existing patterns)`)
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

  // Set custom number of bars for the timeline
  const setCustomBars = () => {
    const bars = parseInt(customBarsInput)
    if (bars && bars > 0 && bars <= 1000) { // Reasonable limit
      setTotalBars(bars)
      setShowSetBarsDialog(false)
      setCustomBarsInput('')
      
      // Process patterns: cut those that extend beyond the new bar limit
      const processedPatterns = patternBlocks.map(block => {
        if (block.startBar > bars) {
          // Pattern starts beyond the new limit - remove it
          return null
        } else if (block.endBar > bars) {
          // Pattern extends beyond the new limit - cut it
          const cutBlock = {
            ...block,
            id: `${block.id}-cut-at-${bars}`,
            name: `${block.name} (Cut at Bar ${bars})`,
            endBar: bars,
            duration: bars - block.startBar + 1
          }
          return cutBlock
        } else {
          // Pattern is within the new limit - keep as is
          return block
        }
      }).filter(block => block !== null) as PatternBlock[]
      
      // Check if any patterns were modified
      const removedCount = patternBlocks.length - processedPatterns.length
      const cutCount = processedPatterns.filter(block => block.name.includes('(Cut at Bar')).length
      
      if (removedCount > 0 || cutCount > 0) {
        setPatternBlocks(processedPatterns)
        onPatternsChange?.(processedPatterns)
        
        let message = `Timeline set to ${bars} bars.`
        if (removedCount > 0) {
          message += ` ${removedCount} patterns removed.`
        }
        if (cutCount > 0) {
          message += ` ${cutCount} patterns cut.`
        }
        
        showNotification('Timeline Updated', message, 'info')
      } else {
        showNotification('Timeline Updated', `Timeline set to ${bars} bars.`, 'success')
      }
      
      console.log(`[SET BARS] Timeline set to ${bars} bars, processed ${processedPatterns.length} patterns`)
    } else {
      showNotification('Invalid Input', 'Please enter a valid number between 1 and 1000.', 'error')
    }
  }

  // Mode B: Shuffle through saved arrangements for each track
  const shuffleSavedArrangements = async () => {
    console.log('[SHUFFLE ARRANGEMENTS] Mode B: Shuffling through saved arrangements for each track')
    
    // Set shuffling flag to prevent auto-initialization
    isShufflingRef.current = true
    
    try {
      // Get user session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        showNotification('Error', 'Please log in to shuffle arrangements', 'error')
        return
      }

      let loadedCount = 0
      const loadedArrangements: string[] = []
      const allNewPatterns: any[] = []
      const processedTracks = new Set<number>()

      // Shuffle arrangements for each track
      for (const track of tracks) {
        // Search for arrangements for this specific track
        const response = await fetch('/api/arrangements/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            filters: {
              searchTerm: track.name
            },
            limit: 50
          })
        })

        if (response.ok) {
          const data = await response.json()
          const trackArrangements = data.arrangements || []
          
          if (trackArrangements.length > 0) {
            // Randomly select an arrangement for this track
            const randomArrangement = trackArrangements[Math.floor(Math.random() * trackArrangements.length)]
            console.log(`[SHUFFLE ARRANGEMENTS] Loading arrangement for ${track.name}:`, randomArrangement)

            // Load patterns for this specific track from the arrangement
            const trackPatterns = await loadArrangementPatternsForTrack(randomArrangement.arrangementId, track.id)
            if (trackPatterns.length > 0) {
              // Cut patterns that extend beyond totalBars
              const cutPatterns = trackPatterns.map(pattern => {
                if (pattern.startBar > totalBars) {
                  // Pattern starts beyond the limit - skip it
                  return null
                } else if (pattern.endBar > totalBars) {
                  // Pattern extends beyond the limit - cut it
                  return {
                    ...pattern,
                    id: `${pattern.id}-cut-at-${totalBars}`,
                    name: `${pattern.name} (Cut at Bar ${totalBars})`,
                    endBar: totalBars,
                    duration: totalBars - pattern.startBar + 1
                  }
                } else {
                  // Pattern is within the limit - keep as is
                  return pattern
                }
              }).filter(pattern => pattern !== null)
              
              if (cutPatterns.length > 0) {
                allNewPatterns.push(...cutPatterns)
                processedTracks.add(track.id)
                loadedCount++
                loadedArrangements.push(randomArrangement.arrangementName || 'Unknown')
              }
            }
          }
        }
      }

      // Apply all changes at once to prevent multiple useEffect triggers
      if (loadedCount > 0) {
        // Get patterns for tracks that weren't processed (keep existing)
        const unprocessedTrackPatterns = patternBlocks.filter(block => !processedTracks.has(block.trackId))
        
        // Combine all patterns
        const finalPatternBlocks = [...unprocessedTrackPatterns, ...allNewPatterns]
        
        // Sort by start bar to maintain timeline order
        finalPatternBlocks.sort((a: any, b: any) => a.startBar - b.startBar)
        
        // Apply all changes at once
        setPatternBlocks(finalPatternBlocks)
        
        // Don't update totalBars - respect the current setting
        // Notify parent component
        onPatternsChange?.(finalPatternBlocks)
        
        console.log(`[SHUFFLE ARRANGEMENTS] Successfully shuffled ${loadedCount} tracks with arrangements: ${loadedArrangements.join(', ')}`)
      } else {
        console.log('[SHUFFLE ARRANGEMENTS] No saved arrangements found for any tracks')
        showNotification('No Arrangements', 'No saved arrangements found for any tracks', 'warning')
      }
    } catch (error) {
      console.error('Error shuffling arrangements:', error)
      showNotification('Error', 'Failed to shuffle arrangements', 'error')
    } finally {
      // Clear shuffling flag
      isShufflingRef.current = false
    }
  }

  // Helper function to load arrangement patterns for a specific track only (without setting state)
  const loadArrangementPatternsForTrack = async (arrangementId: string, trackId: number): Promise<any[]> => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        return []
      }

      const response = await fetch('/api/arrangements/load', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ arrangementId })
      })

      if (response.ok) {
        const data = await response.json()
        const arrangement = data.arrangement
        
        // Filter patterns to only include those for the specific track
        const trackPatterns = arrangement.patternBlocks?.filter((pattern: any) => pattern.trackId === trackId) || []
        
        console.log(`[LOAD ARRANGEMENT PATTERNS FOR TRACK] Loaded ${trackPatterns.length} patterns for track ${trackId} from arrangement "${arrangement.name}"`)
        return trackPatterns
      }
    } catch (error) {
      console.error('Error loading arrangement patterns for track:', error)
    }
    return []
  }

  // Helper function to load arrangement patterns for a specific track only
  const loadArrangementForTrack = async (arrangementId: string, trackId: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        return
      }

      const response = await fetch('/api/arrangements/load', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ arrangementId })
      })

      if (response.ok) {
        const data = await response.json()
        const arrangement = data.arrangement
        
        // Filter patterns to only include those for the specific track
        const trackPatterns = arrangement.patternBlocks?.filter((pattern: any) => pattern.trackId === trackId) || []
        const otherTrackPatterns = patternBlocks.filter(block => block.trackId !== trackId)
        
        if (trackPatterns.length > 0) {
          // Cut patterns that extend beyond totalBars
          const cutPatterns = trackPatterns.map((pattern: any) => {
            if (pattern.startBar > totalBars) {
              // Pattern starts beyond the limit - skip it
              return null
            } else if (pattern.endBar > totalBars) {
              // Pattern extends beyond the limit - cut it
              return {
                ...pattern,
                id: `${pattern.id}-cut-at-${totalBars}`,
                name: `${pattern.name} (Cut at Bar ${totalBars})`,
                endBar: totalBars,
                duration: totalBars - pattern.startBar + 1
              }
            } else {
              // Pattern is within the limit - keep as is
              return pattern
            }
          }).filter((pattern: any) => pattern !== null)
          
          if (cutPatterns.length > 0) {
            // Combine track patterns from saved arrangement with other tracks' current patterns
            const newPatternBlocks = [...otherTrackPatterns, ...cutPatterns]
            
            // Sort by start bar to maintain timeline order
            newPatternBlocks.sort((a: any, b: any) => a.startBar - b.startBar)
            
            setPatternBlocks(newPatternBlocks)
            
            // Don't update totalBars - respect the current setting
            // Notify parent component
            onPatternsChange?.(newPatternBlocks)
            
            console.log(`[LOAD ARRANGEMENT FOR TRACK] Loaded ${cutPatterns.length} patterns for track ${trackId} from arrangement "${arrangement.name}" (cut to fit ${totalBars} bars)`)
          }
        }
      }
    } catch (error) {
      console.error('Error loading arrangement for track:', error)
    }
  }

  // Main shuffle function that toggles between A and B modes
  const handleShuffleToggle = () => {
    if (shuffleMode === 'A') {
      // Mode A: Create drop arrangement (current logic)
      createDropArrangement()
      setShuffleMode('B') // Switch to mode B for next click
    } else {
      // Mode B: Shuffle saved arrangements
      shuffleSavedArrangements()
      setShuffleMode('A') // Switch to mode A for next click
    }
  }

  // Create dynamic arrangement with drops by splitting patterns
  const createDropArrangement = () => {
    console.log('[DROP ARRANGEMENT] Creating dynamic arrangement with drops')
    
    // Set shuffling flag to prevent auto-initialization
    isShufflingRef.current = true
    
    // Check if we have selected patterns
    const hasSelectedPatterns = selectedBlocks.length > 0
    
    if (hasSelectedPatterns) {
      console.log(`[DROP ARRANGEMENT] Applying drops to ${selectedBlocks.length} selected patterns`)
      
      // Get the selected patterns
      const selectedPatterns = patternBlocks.filter(block => selectedBlocks.includes(block.id))
      const nonSelectedPatterns = patternBlocks.filter(block => !selectedBlocks.includes(block.id))
      
      // Create drop variations for selected patterns only
      const dropPatternBlocks: PatternBlock[] = []
      
      selectedPatterns.forEach((pattern) => {
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
              id: `pattern-${Date.now()}-${pattern.trackId}-first-${Math.random()}`,
              name: `${pattern.name} Build`,
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
              id: `pattern-${Date.now()}-${pattern.trackId}-second-${Math.random()}`,
              name: `${pattern.name} Drop`,
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
              id: `pattern-${Date.now()}-${pattern.trackId}-breakdown-first-${Math.random()}`,
              name: `${pattern.name} Breakdown A`,
              duration: halfDuration,
              endBar: pattern.startBar + halfDuration - 1
            }
            dropPatternBlocks.push(firstHalf)
          }
          
          if (remainingDuration >= 1) {
            const secondHalf: PatternBlock = {
              ...pattern,
              id: `pattern-${Date.now()}-${pattern.trackId}-breakdown-second-${Math.random()}`,
              name: `${pattern.name} Breakdown B`,
              startBar: pattern.startBar + halfDuration,
              duration: remainingDuration,
              endBar: pattern.endBar
            }
            dropPatternBlocks.push(secondHalf)
          }
        }
      })
      
      // NEW: Add special drop at bar 8 for selected patterns (not too often - 30% chance)
      const shouldAddBar8Drop = Math.random() < 0.3 // 30% chance
      if (shouldAddBar8Drop) {
        console.log('[DROP ARRANGEMENT] Adding special bar 8 drop to selected patterns')
        
        // Find selected patterns that extend past bar 8 and cut them off
        const patternsWithBar8Drop = dropPatternBlocks.map(pattern => {
          if (pattern.endBar >= 8 && pattern.startBar < 8) {
            // This pattern extends into bar 8, cut it off at bar 7
            const cutPattern: PatternBlock = {
              ...pattern,
              id: `${pattern.id}-bar8-cut`,
              name: `${pattern.name} (Cut at Bar 8)`,
              endBar: 7,
              duration: 7 - pattern.startBar + 1
            }
            console.log(`[DROP ARRANGEMENT] Cut selected pattern "${pattern.name}" at bar 8, new end: bar 7`)
            return cutPattern
          }
          return pattern
        })
        
        // Combine non-selected patterns with drop patterns (including bar 8 cuts)
        const finalPatterns = [...nonSelectedPatterns, ...patternsWithBar8Drop]
        
        // Replace patterns and clear selection
        setPatternBlocks(finalPatterns)
        setSelectedBlocks([])
        
        // Update total bars to accommodate all patterns
        const maxEndBar = Math.max(...finalPatterns.map(block => block.endBar))
        setTotalBars(Math.max(totalBars, maxEndBar))
        
        // Notify parent component
        onPatternsChange?.(finalPatterns)
        
        console.log(`[DROP ARRANGEMENT] Applied drops to ${selectedPatterns.length} selected patterns, created ${dropPatternBlocks.length} drop variations${shouldAddBar8Drop ? ' (including bar 8 drop)' : ''}`)
        return
      }
      
      // Combine non-selected patterns with drop patterns
      const finalPatterns = [...nonSelectedPatterns, ...dropPatternBlocks]
      
      // Replace patterns and clear selection
      setPatternBlocks(finalPatterns)
      setSelectedBlocks([])
      
      // Update total bars to accommodate all patterns
      const maxEndBar = Math.max(...finalPatterns.map(block => block.endBar))
      setTotalBars(Math.max(totalBars, maxEndBar))
      
      // Notify parent component
      onPatternsChange?.(finalPatterns)
      
      console.log(`[DROP ARRANGEMENT] Applied drops to ${selectedPatterns.length} selected patterns, created ${dropPatternBlocks.length} drop variations`)
      return
    }
    
    // Original behavior: Create drops for all patterns (when no selection)
    console.log('[DROP ARRANGEMENT] Creating drops for all patterns (no selection)')
    
    // First, load the base patterns within totalBars limit
    const basePatternBlocks: PatternBlock[] = []
    
    tracks.forEach((track, trackIndex) => {
      // Calculate how many patterns can fit within totalBars
      const maxPatterns = Math.floor(totalBars / selectedDuration)
      const patternsToCreate = Math.min(11, maxPatterns)
      
      // Create patterns for each track, starting from bar 1
      for (let i = 0; i < patternsToCreate; i++) {
        const startBar = 1 + (i * selectedDuration)
        const endBar = startBar + selectedDuration - 1
        
        // Skip if this pattern would extend beyond totalBars
        if (endBar > totalBars) {
          break
        }
        
        const patternBlock: PatternBlock = {
          id: `pattern-${Date.now()}-${track.id}-${i}-${Math.random()}`,
          name: `${getTrackDisplayName(track.name)} Pattern ${i + 1}`,
          tracks: [track],
          sequencerData: { [track.id]: sequencerData[track.id] || [] },
          bpm: bpm,
          steps: steps,
          duration: selectedDuration,
          startBar: startBar,
          endBar: endBar,
          color: track.color,
          trackId: track.id
        }
        
        basePatternBlocks.push(patternBlock)
      }
      
      // If there's remaining space, create a partial pattern to fill it
      const lastPatternEnd = basePatternBlocks
        .filter(block => block.trackId === track.id)
        .reduce((max, block) => Math.max(max, block.endBar), 0)
      
      const remainingBars = totalBars - lastPatternEnd
      if (remainingBars >= 1) {
        const partialPatternBlock: PatternBlock = {
          id: `pattern-${Date.now()}-${track.id}-partial-${Math.random()}`,
          name: `${getTrackDisplayName(track.name)} Pattern (Partial)`,
          tracks: [track],
          sequencerData: { [track.id]: sequencerData[track.id] || [] },
          bpm: bpm,
          steps: steps,
          duration: remainingBars,
          startBar: lastPatternEnd + 1,
          endBar: totalBars,
          color: track.color,
          trackId: track.id
        }
        
        basePatternBlocks.push(partialPatternBlock)
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
    
    // NEW: Add special drop at bar 8 (not too often - 30% chance)
    const shouldAddBar8Drop = Math.random() < 0.3 // 30% chance
    if (shouldAddBar8Drop) {
      console.log('[DROP ARRANGEMENT] Adding special drop at bar 8')
      
      // Find patterns that extend past bar 8 and cut them off
      const patternsWithBar8Drop = dropPatternBlocks.map(pattern => {
        if (pattern.endBar >= 8 && pattern.startBar < 8) {
          // This pattern extends into bar 8, cut it off at bar 7
          const cutPattern: PatternBlock = {
            ...pattern,
            id: `${pattern.id}-bar8-cut`,
            name: `${pattern.name} (Cut at Bar 8)`,
            endBar: 7,
            duration: 7 - pattern.startBar + 1
          }
          console.log(`[DROP ARRANGEMENT] Cut pattern "${pattern.name}" at bar 8, new end: bar 7`)
          return cutPattern
        }
        return pattern
      })
      
      // Also randomly cut off some tracks completely at bar 8 for more dramatic effect
      tracks.forEach((track) => {
        const trackPatterns = patternsWithBar8Drop.filter(p => p.trackId === track.id)
        const shouldCutTrack = Math.random() < 0.4 // 40% chance per track
        
        if (shouldCutTrack && trackPatterns.length > 0) {
          console.log(`[DROP ARRANGEMENT] Cutting off entire ${getTrackDisplayName(track.name)} track at bar 8`)
          
          // Remove all patterns for this track that start at or after bar 8
          const filteredPatterns = patternsWithBar8Drop.filter(pattern => 
            !(pattern.trackId === track.id && pattern.startBar >= 8)
          )
          
          // Cut patterns that extend into bar 8
          const updatedPatterns = filteredPatterns.map(pattern => {
            if (pattern.trackId === track.id && pattern.endBar >= 8 && pattern.startBar < 8) {
              return {
                ...pattern,
                id: `${pattern.id}-bar8-cut`,
                name: `${pattern.name} (Cut at Bar 8)`,
                endBar: 7,
                duration: 7 - pattern.startBar + 1
              }
            }
            return pattern
          })
          
          dropPatternBlocks.length = 0
          dropPatternBlocks.push(...updatedPatterns)
        }
      })
    }
    
    // Replace all existing patterns with the drop arrangement
    setPatternBlocks(dropPatternBlocks)
    
    // Don't update totalBars - respect the current setting
    // Notify parent component
    onPatternsChange?.(dropPatternBlocks)
    
    console.log(`[DROP ARRANGEMENT] Created ${dropPatternBlocks.length} drop patterns across ${tracks.length} tracks within ${totalBars} bars${shouldAddBar8Drop ? ' (including bar 8 drop)' : ''}`)
    
    // Clear shuffling flag
    isShufflingRef.current = false
  }

  // Arrange Song function - does exactly what createDropArrangement does (just the drops part)
  const arrangeSong = () => {
    console.log('[ARRANGE SONG] Creating drops arrangement')
    
    // Set shuffling flag to prevent auto-initialization
    isShufflingRef.current = true
    
    // Check if we have selected patterns
    const hasSelectedPatterns = selectedBlocks.length > 0
    
    if (hasSelectedPatterns) {
      console.log(`[ARRANGE SONG] Applying drops to ${selectedBlocks.length} selected patterns`)
      
      // Get the selected patterns
      const selectedPatterns = patternBlocks.filter(block => selectedBlocks.includes(block.id))
      const nonSelectedPatterns = patternBlocks.filter(block => !selectedBlocks.includes(block.id))
      
      // Create drop variations for selected patterns only
      const dropPatternBlocks: PatternBlock[] = []
      
      selectedPatterns.forEach((pattern) => {
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
              id: `pattern-${Date.now()}-${pattern.trackId}-first-${Math.random()}`,
              name: `${pattern.name} Build`,
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
              id: `pattern-${Date.now()}-${pattern.trackId}-second-${Math.random()}`,
              name: `${pattern.name} Drop`,
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
              id: `pattern-${Date.now()}-${pattern.trackId}-breakdown-first-${Math.random()}`,
              name: `${pattern.name} Breakdown A`,
              duration: halfDuration,
              endBar: pattern.startBar + halfDuration - 1
            }
            dropPatternBlocks.push(firstHalf)
          }
          
          if (remainingDuration >= 1) {
            const secondHalf: PatternBlock = {
              ...pattern,
              id: `pattern-${Date.now()}-${pattern.trackId}-breakdown-second-${Math.random()}`,
              name: `${pattern.name} Breakdown B`,
              startBar: pattern.startBar + halfDuration,
              duration: remainingDuration,
              endBar: pattern.endBar
            }
            dropPatternBlocks.push(secondHalf)
          }
        }
      })
      
      // Add special drop at bar 8 for selected patterns (not too often - 30% chance)
      const shouldAddBar8Drop = Math.random() < 0.3 // 30% chance
      if (shouldAddBar8Drop) {
        console.log('[ARRANGE SONG] Adding special bar 8 drop to selected patterns')
        
        // Find selected patterns that extend past bar 8 and cut them off
        const patternsWithBar8Drop = dropPatternBlocks.map(pattern => {
          if (pattern.endBar >= 8 && pattern.startBar < 8) {
            // This pattern extends into bar 8, cut it off at bar 7
            const cutPattern: PatternBlock = {
              ...pattern,
              id: `${pattern.id}-bar8-cut`,
              name: `${pattern.name} (Cut at Bar 8)`,
              endBar: 7,
              duration: 7 - pattern.startBar + 1
            }
            console.log(`[ARRANGE SONG] Cut selected pattern "${pattern.name}" at bar 8, new end: bar 7`)
            return cutPattern
          }
          return pattern
        })
        
        // Combine non-selected patterns with drop patterns (including bar 8 cuts)
        const finalPatterns = [...nonSelectedPatterns, ...patternsWithBar8Drop]
        
        // Replace patterns and clear selection
        setPatternBlocks(finalPatterns)
        setSelectedBlocks([])
        
        // Update total bars to accommodate all patterns
        const maxEndBar = Math.max(...finalPatterns.map(block => block.endBar))
        setTotalBars(Math.max(totalBars, maxEndBar))
        
        // Notify parent component
        onPatternsChange?.(finalPatterns)
        
        console.log(`[ARRANGE SONG] Applied drops to ${selectedPatterns.length} selected patterns, created ${dropPatternBlocks.length} drop variations${shouldAddBar8Drop ? ' (including bar 8 drop)' : ''}`)
        isShufflingRef.current = false
        return
      }
      
      // Combine non-selected patterns with drop patterns
      const finalPatterns = [...nonSelectedPatterns, ...dropPatternBlocks]
      
      // Replace patterns and clear selection
      setPatternBlocks(finalPatterns)
      setSelectedBlocks([])
      
      // Update total bars to accommodate all patterns
      const maxEndBar = Math.max(...finalPatterns.map(block => block.endBar))
      setTotalBars(Math.max(totalBars, maxEndBar))
      
      // Notify parent component
      onPatternsChange?.(finalPatterns)
      
      console.log(`[ARRANGE SONG] Applied drops to ${selectedPatterns.length} selected patterns, created ${dropPatternBlocks.length} drop variations`)
      isShufflingRef.current = false
      return
    }
    
    // Original behavior: Create drops for all patterns (when no selection)
    console.log('[ARRANGE SONG] Creating drops for all patterns (no selection)')
    
    // First, load the base patterns within totalBars limit
    const basePatternBlocks: PatternBlock[] = []
    
    tracks.forEach((track, trackIndex) => {
      // Calculate how many patterns can fit within totalBars
      const maxPatterns = Math.floor(totalBars / selectedDuration)
      const patternsToCreate = Math.min(11, maxPatterns)
      
      // Create patterns for each track, starting from bar 1
      for (let i = 0; i < patternsToCreate; i++) {
        const startBar = 1 + (i * selectedDuration)
        const endBar = startBar + selectedDuration - 1
        
        // Skip if this pattern would extend beyond totalBars
        if (endBar > totalBars) {
          break
        }
        
        const patternBlock: PatternBlock = {
          id: `pattern-${Date.now()}-${track.id}-${i}-${Math.random()}`,
          name: `${getTrackDisplayName(track.name)} Pattern ${i + 1}`,
          tracks: [track],
          sequencerData: { [track.id]: sequencerData[track.id] || [] },
          bpm: bpm,
          steps: steps,
          duration: selectedDuration,
          startBar: startBar,
          endBar: endBar,
          color: track.color,
          trackId: track.id
        }
        
        basePatternBlocks.push(patternBlock)
      }
      
      // If there's remaining space, create a partial pattern to fill it
      const lastPatternEnd = basePatternBlocks
        .filter(block => block.trackId === track.id)
        .reduce((max, block) => Math.max(max, block.endBar), 0)
      
      const remainingBars = totalBars - lastPatternEnd
      if (remainingBars >= 1) {
        const partialPatternBlock: PatternBlock = {
          id: `pattern-${Date.now()}-${track.id}-partial-${Math.random()}`,
          name: `${getTrackDisplayName(track.name)} Pattern (Partial)`,
          tracks: [track],
          sequencerData: { [track.id]: sequencerData[track.id] || [] },
          bpm: bpm,
          steps: steps,
          duration: remainingBars,
          startBar: lastPatternEnd + 1,
          endBar: totalBars,
          color: track.color,
          trackId: track.id
        }
        
        basePatternBlocks.push(partialPatternBlock)
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
    
    // Add special drop at bar 8 (not too often - 30% chance)
    const shouldAddBar8Drop = Math.random() < 0.3 // 30% chance
    if (shouldAddBar8Drop) {
      console.log('[ARRANGE SONG] Adding special drop at bar 8')
      
      // Find patterns that extend past bar 8 and cut them off
      const patternsWithBar8Drop = dropPatternBlocks.map(pattern => {
        if (pattern.endBar >= 8 && pattern.startBar < 8) {
          // This pattern extends into bar 8, cut it off at bar 7
          const cutPattern: PatternBlock = {
            ...pattern,
            id: `${pattern.id}-bar8-cut`,
            name: `${pattern.name} (Cut at Bar 8)`,
            endBar: 7,
            duration: 7 - pattern.startBar + 1
          }
          console.log(`[ARRANGE SONG] Cut pattern "${pattern.name}" at bar 8, new end: bar 7`)
          return cutPattern
        }
        return pattern
      })
      
      // Also randomly cut off some tracks completely at bar 8 for more dramatic effect
      tracks.forEach((track) => {
        const trackPatterns = patternsWithBar8Drop.filter(p => p.trackId === track.id)
        const shouldCutTrack = Math.random() < 0.4 // 40% chance per track
        
        if (shouldCutTrack && trackPatterns.length > 0) {
          console.log(`[ARRANGE SONG] Cutting off entire ${getTrackDisplayName(track.name)} track at bar 8`)
          
          // Remove all patterns for this track that start at or after bar 8
          const filteredPatterns = patternsWithBar8Drop.filter(pattern => 
            !(pattern.trackId === track.id && pattern.startBar >= 8)
          )
          
          // Cut patterns that extend into bar 8
          const updatedPatterns = filteredPatterns.map(pattern => {
            if (pattern.trackId === track.id && pattern.endBar >= 8 && pattern.startBar < 8) {
              return {
                ...pattern,
                id: `${pattern.id}-bar8-cut`,
                name: `${pattern.name} (Cut at Bar 8)`,
                endBar: 7,
                duration: 7 - pattern.startBar + 1
              }
            }
            return pattern
          })
          
          dropPatternBlocks.length = 0
          dropPatternBlocks.push(...updatedPatterns)
        }
      })
    }
    
    // Replace all existing patterns with the drop arrangement
    setPatternBlocks(dropPatternBlocks)
    
    // Don't update totalBars - respect the current setting
    // Notify parent component
    onPatternsChange?.(dropPatternBlocks)
    
    console.log(`[ARRANGE SONG] Created ${dropPatternBlocks.length} drop patterns across ${tracks.length} tracks within ${totalBars} bars${shouldAddBar8Drop ? ' (including bar 8 drop)' : ''}`)
    
    // Clear shuffling flag
    isShufflingRef.current = false
  }

  // Shuffle patterns for a specific track with A/B toggle
  const shuffleTrackPatterns = (trackId: number) => {
    // Execute A mode (drops) immediately for this track
    console.log(`[TRACK ${trackId}] Executing A mode (drops)`)
    createTrackDropArrangement(trackId)
  }

  // Create drop arrangement for a specific track (EXACT copy of original logic)
  const createTrackDropArrangement = (trackId: number) => {
    console.log(`[TRACK DROP ARRANGEMENT] Creating drop arrangement for track ${trackId}`)
    
    // Set shuffling flag to prevent auto-initialization
    isShufflingRef.current = true
    
    const track = tracks.find(t => t.id === trackId)
    if (!track) {
      showNotification('Track Not Found', 'Track not found', 'error')
      isShufflingRef.current = false
      return
    }
    
    // Get all patterns for this specific track
    const trackPatterns = patternBlocks.filter(block => block.trackId === trackId)
    const otherTrackPatterns = patternBlocks.filter(block => block.trackId !== trackId)
    
    // Check if we have selected patterns for this track
    const selectedTrackPatterns = selectedBlocks.filter(blockId => {
      const block = patternBlocks.find(b => b.id === blockId)
      return block && block.trackId === trackId
    })
    
    const hasSelectedPatterns = selectedTrackPatterns.length > 0
    
    if (hasSelectedPatterns) {
      console.log(`[TRACK DROP ARRANGEMENT] Applying drops to ${selectedTrackPatterns.length} selected patterns for track ${trackId}`)
      
      // Get the selected patterns for this track
      const selectedPatterns = patternBlocks.filter(block => selectedBlocks.includes(block.id) && block.trackId === trackId)
      const nonSelectedPatterns = patternBlocks.filter(block => !selectedBlocks.includes(block.id) || block.trackId !== trackId)
      
      // Create drop variations for selected patterns only
      const dropPatternBlocks: PatternBlock[] = []
      
      selectedPatterns.forEach((pattern) => {
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
              id: `pattern-${Date.now()}-${pattern.trackId}-first-${Math.random()}`,
              name: `${pattern.name} Build`,
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
              id: `pattern-${Date.now()}-${pattern.trackId}-second-${Math.random()}`,
              name: `${pattern.name} Drop`,
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
              id: `pattern-${Date.now()}-${pattern.trackId}-breakdown-first-${Math.random()}`,
              name: `${pattern.name} Breakdown A`,
              duration: halfDuration,
              endBar: pattern.startBar + halfDuration - 1
            }
            dropPatternBlocks.push(firstHalf)
          }
          
          if (remainingDuration >= 1) {
            const secondHalf: PatternBlock = {
              ...pattern,
              id: `pattern-${Date.now()}-${pattern.trackId}-breakdown-second-${Math.random()}`,
              name: `${pattern.name} Breakdown B`,
              startBar: pattern.startBar + halfDuration,
              duration: remainingDuration,
              endBar: pattern.endBar
            }
            dropPatternBlocks.push(secondHalf)
          }
        }
      })
      
      // NEW: Add special drop at bar 8 for selected patterns (not too often - 30% chance)
      const shouldAddBar8Drop = Math.random() < 0.3 // 30% chance
      if (shouldAddBar8Drop) {
        console.log(`[TRACK DROP ARRANGEMENT] Adding special bar 8 drop to selected patterns for track ${trackId}`)
        
        // Find selected patterns that extend past bar 8 and cut them off
        const patternsWithBar8Drop = dropPatternBlocks.map(pattern => {
          if (pattern.endBar >= 8 && pattern.startBar < 8) {
            // This pattern extends into bar 8, cut it off at bar 7
            const cutPattern: PatternBlock = {
              ...pattern,
              id: `${pattern.id}-bar8-cut`,
              name: `${pattern.name} (Cut at Bar 8)`,
              endBar: 7,
              duration: 7 - pattern.startBar + 1
            }
            console.log(`[TRACK DROP ARRANGEMENT] Cut selected pattern "${pattern.name}" at bar 8, new end: bar 7`)
            return cutPattern
          }
          return pattern
        })
        
        // Combine non-selected patterns with drop patterns (including bar 8 cuts)
        const finalPatterns = [...nonSelectedPatterns, ...patternsWithBar8Drop]
        
        // Replace patterns and clear selection
        setPatternBlocks(finalPatterns)
        setSelectedBlocks([])
        
        // Update total bars to accommodate all patterns
        const maxEndBar = Math.max(...finalPatterns.map(block => block.endBar))
        setTotalBars(Math.max(totalBars, maxEndBar))
        
        // Notify parent component
        onPatternsChange?.(finalPatterns)
        
        console.log(`[TRACK DROP ARRANGEMENT] Applied drops to ${selectedPatterns.length} selected patterns, created ${dropPatternBlocks.length} drop variations${shouldAddBar8Drop ? ' (including bar 8 drop)' : ''}`)
        // Removed annoying notification
        return
      }
      
      // Combine non-selected patterns with drop patterns
      const finalPatterns = [...nonSelectedPatterns, ...dropPatternBlocks]
      
      // Replace patterns and clear selection
      setPatternBlocks(finalPatterns)
      setSelectedBlocks([])
      
      // Update total bars to accommodate all patterns
      const maxEndBar = Math.max(...finalPatterns.map(block => block.endBar))
      setTotalBars(Math.max(totalBars, maxEndBar))
      
      // Notify parent component
      onPatternsChange?.(finalPatterns)
      
      console.log(`[TRACK DROP ARRANGEMENT] Applied drops to ${selectedPatterns.length} selected patterns, created ${dropPatternBlocks.length} drop variations`)
              // Removed annoying notification
      return
    }
    
    // Original behavior: Create drops for all patterns for this track (when no selection)
    console.log(`[TRACK DROP ARRANGEMENT] Creating drops for all patterns for track ${trackId} (no selection)`)
    
    // First, load the base patterns for this track only within totalBars limit
    const basePatternBlocks: PatternBlock[] = []
    
    // Calculate how many patterns can fit within totalBars
    const maxPatterns = Math.floor(totalBars / selectedDuration)
    const patternsToCreate = Math.min(11, maxPatterns)
    
    // Create patterns for this track only, starting from bar 1
    for (let i = 0; i < patternsToCreate; i++) {
      const startBar = 1 + (i * selectedDuration)
      const endBar = startBar + selectedDuration - 1
      
      // Skip if this pattern would extend beyond totalBars
      if (endBar > totalBars) {
        break
      }
      
      const patternBlock: PatternBlock = {
        id: `pattern-${Date.now()}-${track.id}-${i}-${Math.random()}`,
        name: `${getTrackDisplayName(track.name)} Pattern ${i + 1}`,
        tracks: [track],
        sequencerData: { [track.id]: sequencerData[track.id] || [] },
        bpm: bpm,
        steps: steps,
        duration: selectedDuration,
        startBar: startBar,
        endBar: endBar,
        color: track.color,
        trackId: track.id
      }
      
      basePatternBlocks.push(patternBlock)
    }
    
    // If there's remaining space, create a partial pattern to fill it
    const lastPatternEnd = basePatternBlocks
      .filter(block => block.trackId === track.id)
      .reduce((max, block) => Math.max(max, block.endBar), 0)
    
    const remainingBars = totalBars - lastPatternEnd
    if (remainingBars >= 1) {
      const partialPatternBlock: PatternBlock = {
        id: `pattern-${Date.now()}-${track.id}-partial-${Math.random()}`,
        name: `${getTrackDisplayName(track.name)} Pattern (Partial)`,
        tracks: [track],
        sequencerData: { [track.id]: sequencerData[track.id] || [] },
        bpm: bpm,
        steps: steps,
        duration: remainingBars,
        startBar: lastPatternEnd + 1,
        endBar: totalBars,
        color: track.color,
        trackId: track.id
      }
      
      basePatternBlocks.push(partialPatternBlock)
    }
    
    // Now create drop variations by splitting some patterns
    const dropPatternBlocks: PatternBlock[] = []
    
    basePatternBlocks.forEach((pattern, patternIndex) => {
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
    
    // NEW: Add special drop at bar 8 (not too often - 30% chance)
    const shouldAddBar8Drop = Math.random() < 0.3 // 30% chance
    if (shouldAddBar8Drop) {
      console.log(`[TRACK DROP ARRANGEMENT] Adding special drop at bar 8 for track ${trackId}`)
      
      // Find patterns that extend past bar 8 and cut them off
      const patternsWithBar8Drop = dropPatternBlocks.map(pattern => {
        if (pattern.endBar >= 8 && pattern.startBar < 8) {
          // This pattern extends into bar 8, cut it off at bar 7
          const cutPattern: PatternBlock = {
            ...pattern,
            id: `${pattern.id}-bar8-cut`,
            name: `${pattern.name} (Cut at Bar 8)`,
            endBar: 7,
            duration: 7 - pattern.startBar + 1
          }
          console.log(`[TRACK DROP ARRANGEMENT] Cut pattern "${pattern.name}" at bar 8, new end: bar 7`)
          return cutPattern
        }
        return pattern
      })
      
      // Also randomly cut off this track completely at bar 8 for more dramatic effect
      const shouldCutTrack = Math.random() < 0.4 // 40% chance
      
      if (shouldCutTrack) {
        console.log(`[TRACK DROP ARRANGEMENT] Cutting off entire ${getTrackDisplayName(track.name)} track at bar 8`)
        
        // Remove all patterns for this track that start at or after bar 8
        const filteredPatterns = patternsWithBar8Drop.filter(pattern => 
          !(pattern.trackId === trackId && pattern.startBar >= 8)
        )
        
        // Cut patterns that extend into bar 8
        const updatedPatterns = filteredPatterns.map(pattern => {
          if (pattern.trackId === trackId && pattern.endBar >= 8 && pattern.startBar < 8) {
            return {
              ...pattern,
              id: `${pattern.id}-bar8-cut`,
              name: `${pattern.name} (Cut at Bar 8)`,
              endBar: 7,
              duration: 7 - pattern.startBar + 1
            }
          }
          return pattern
        })
        
        // Combine with other tracks' patterns
        const finalPatterns = [...otherTrackPatterns, ...updatedPatterns]
        
        // Replace all existing patterns with the drop arrangement
        setPatternBlocks(finalPatterns)
        
        // Don't update totalBars - respect the current setting
        // Notify parent component
        onPatternsChange?.(finalPatterns)
        
        console.log(`[TRACK DROP ARRANGEMENT] Created ${updatedPatterns.length} drop patterns for ${getTrackDisplayName(track.name)} with bar 8 drop`)
        // Removed annoying notification
        return
      }
      
      // Combine with other tracks' patterns
      const finalPatterns = [...otherTrackPatterns, ...patternsWithBar8Drop]
      
      // Replace all existing patterns with the drop arrangement
      setPatternBlocks(finalPatterns)
      
      // Don't update totalBars - respect the current setting
      // Notify parent component
      onPatternsChange?.(finalPatterns)
      
      console.log(`[TRACK DROP ARRANGEMENT] Created ${dropPatternBlocks.length} drop patterns for ${getTrackDisplayName(track.name)} with bar 8 drop`)
              // Removed annoying notification
      return
    }
    
    // Combine with other tracks' patterns
    const finalPatterns = [...otherTrackPatterns, ...dropPatternBlocks]
    
    // Replace all existing patterns with the drop arrangement
    setPatternBlocks(finalPatterns)
    
    // Don't update totalBars - respect the current setting
    // Notify parent component
    onPatternsChange?.(finalPatterns)
    
    console.log(`[TRACK DROP ARRANGEMENT] Created ${dropPatternBlocks.length} drop patterns for ${getTrackDisplayName(track.name)}`)
            // Removed annoying notification
    
    // Clear shuffling flag
    isShufflingRef.current = false
  }

  // Load saved arrangements for a specific track using the working API
  const shuffleTrackSavedArrangements = async (trackId: number) => {
    console.log(`[TRACK LOAD SAVED] Loading saved arrangements for track ${trackId}`)
    
    const track = tracks.find(t => t.id === trackId)
    if (!track) {
      console.error('[TRACK LOAD SAVED] Track not found')
      return
    }

    try {
      // Get user session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        console.log('[TRACK LOAD SAVED] No user session')
        return
      }

      // Search for arrangements for this specific track
      const response = await fetch('/api/arrangements/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          filters: {
            searchTerm: track.name
          },
          limit: 50
        })
      })

      if (response.ok) {
        const data = await response.json()
        const trackArrangements = data.arrangements || []
        
        if (trackArrangements.length > 0) {
          // Randomly select an arrangement for this track
          const randomArrangement = trackArrangements[Math.floor(Math.random() * trackArrangements.length)]
          console.log(`[TRACK LOAD SAVED] Loading arrangement for ${track.name}:`, randomArrangement)

          // Load patterns for this specific track from the arrangement
          const trackPatterns = await loadArrangementPatternsForTrack(randomArrangement.arrangementId, track.id)
          if (trackPatterns.length > 0) {
            // Cut patterns that extend beyond totalBars
            const cutPatterns = trackPatterns.map(pattern => {
              if (pattern.startBar > totalBars) {
                // Pattern starts beyond the limit - skip it
                return null
              } else if (pattern.endBar > totalBars) {
                // Pattern extends beyond the limit - cut it
                return {
                  ...pattern,
                  id: `${pattern.id}-cut-at-${totalBars}`,
                  name: `${pattern.name} (Cut at Bar ${totalBars})`,
                  endBar: totalBars,
                  duration: totalBars - pattern.startBar + 1
                }
              } else {
                // Pattern is within the limit - keep as is
                return pattern
              }
            }).filter(pattern => pattern !== null)
            
            if (cutPatterns.length > 0) {
              // Get patterns for other tracks (keep existing)
              const otherTrackPatterns = patternBlocks.filter(block => block.trackId !== trackId)
              
              // Combine all patterns
              const finalPatternBlocks = [...otherTrackPatterns, ...cutPatterns]
              
              // Sort by start bar to maintain timeline order
              finalPatternBlocks.sort((a: any, b: any) => a.startBar - b.startBar)
              
              // Apply all changes at once
              setPatternBlocks(finalPatternBlocks)
              
              // Notify parent component
              onPatternsChange?.(finalPatternBlocks)
              
              console.log(`[TRACK LOAD SAVED] Successfully loaded ${cutPatterns.length} patterns for ${track.name}`)
            }
          } else {
            console.log(`[TRACK LOAD SAVED] No patterns found in arrangement for ${track.name}`)
          }
        } else {
          console.log(`[TRACK LOAD SAVED] No saved arrangements found for ${track.name}`)
        }
      } else {
        console.error('[TRACK LOAD SAVED] Failed to search arrangements')
      }
    } catch (error) {
      console.error('[TRACK LOAD SAVED] Error:', error)
    }
  }

  // Fill track with patterns of specified size (4 or 8 bars)
  const fillTrackWithPatterns = (trackId: number, patternSize: 4 | 8) => {
    console.log(`[FILL TRACK] Filling track ${trackId} with ${patternSize}-bar patterns`)
    
    const track = tracks.find(t => t.id === trackId)
    if (!track) {
      console.error('[FILL TRACK] Track not found')
      return
    }

    // Calculate how many patterns we need to fill the track
    const patternsNeeded = Math.ceil(totalBars / patternSize)
    const newPatterns: PatternBlock[] = []
    
    // Get the current sequencer data for this track
    const trackSequencerData = sequencerData[trackId] || []
    
    // Create patterns to fill the entire track
    for (let i = 0; i < patternsNeeded; i++) {
      const startBar = (i * patternSize) + 1
      const endBar = Math.min((i + 1) * patternSize, totalBars)
      const duration = endBar - startBar + 1
      
      // CRITICAL FIX: Extend sequencer data to cover the full pattern duration
      let extendedSequencerData = [...trackSequencerData]
      
      // Calculate how many steps we need for this pattern duration
      const stepsPerBar = 16 // Assuming 16 steps per bar (1/16th notes)
      const totalStepsNeeded = duration * stepsPerBar
      
      // If we need more steps than we have, extend the sequencer data
      if (totalStepsNeeded > trackSequencerData.length) {
        // Repeat the sequencer data to fill the required length
        while (extendedSequencerData.length < totalStepsNeeded) {
          extendedSequencerData = [...extendedSequencerData, ...trackSequencerData]
        }
        // Trim to exact length needed
        extendedSequencerData = extendedSequencerData.slice(0, totalStepsNeeded)
        
        console.log(`[FILL TRACK] Extended sequencer data for track ${track.name} from ${trackSequencerData.length} to ${extendedSequencerData.length} steps for ${duration} bars`)
      }
      
      // Create a new pattern block using the extended sequencer data
      const newPattern: PatternBlock = {
        id: `fill-${trackId}-${i}-${Date.now()}`,
        name: `${getTrackDisplayName(track.name)} ${patternSize}bar ${i + 1}`,
        tracks: [track],
        sequencerData: { [trackId]: extendedSequencerData }, // Use extended sequencer data
        bpm: bpm,
        steps: totalStepsNeeded, // Use the actual steps needed for this pattern
        duration: duration,
        startBar: startBar,
        endBar: endBar,
        color: track.color,
        trackId: trackId
      }
      
      newPatterns.push(newPattern)
    }
    
    // Remove existing patterns for this track
    const otherTrackPatterns = patternBlocks.filter(block => block.trackId !== trackId)
    
    // Combine with new patterns
    const finalPatternBlocks = [...otherTrackPatterns, ...newPatterns]
    
    // Sort by start bar to maintain timeline order
    finalPatternBlocks.sort((a, b) => a.startBar - b.startBar)
    
    // Apply all changes at once
    setPatternBlocks(finalPatternBlocks)
    
    // Notify parent component
    onPatternsChange?.(finalPatternBlocks)
    
    console.log(`[FILL TRACK] Successfully filled track ${track.name} with ${newPatterns.length} patterns using actual sequencer data`)
    
    // Close the dialog
    setShowFillTrackDialog(false)
    setSelectedTrackForFill(null)
  }

  // Create patterns from current sequencer data for all tracks
  const createPatternsFromSequencer = () => {
    console.log('[CREATE PATTERNS] Creating patterns from current sequencer data')
    
    if (Object.keys(sequencerData).length === 0) {
      console.warn('[CREATE PATTERNS] No sequencer data available')
      return
    }
    
    const newPatterns: PatternBlock[] = []
    
    // Create patterns for each track based on their sequencer data
    tracks.forEach(track => {
      const trackSequencerData = sequencerData[track.id]
      if (trackSequencerData && trackSequencerData.length > 0) {
        // Calculate how many patterns we need based on the track length
        const patternsNeeded = Math.ceil(totalBars / selectedDuration)
        
        for (let i = 0; i < patternsNeeded; i++) {
          const startBar = (i * selectedDuration) + 1
          const endBar = Math.min((i + 1) * selectedDuration, totalBars)
          const duration = endBar - startBar + 1
          
          // CRITICAL FIX: Extend sequencer data to cover the full pattern duration
          // If the original sequencer data is shorter than needed, repeat it to fill the pattern
          let extendedSequencerData = [...trackSequencerData]
          
          // Calculate how many steps we need for this pattern duration
          const stepsPerBar = 16 // Assuming 16 steps per bar (1/16th notes)
          const totalStepsNeeded = duration * stepsPerBar
          
          // DEBUG: Log the extension process
          console.log(`[DEBUG CREATE PATTERNS] Track ${track.name}:`, {
            originalSteps: trackSequencerData.length,
            patternDuration: duration,
            totalStepsNeeded: totalStepsNeeded,
            originalData: trackSequencerData
          })
          
          // If we need more steps than we have, extend the sequencer data
          if (totalStepsNeeded > trackSequencerData.length) {
            // Repeat the sequencer data to fill the required length
            while (extendedSequencerData.length < totalStepsNeeded) {
              extendedSequencerData = [...extendedSequencerData, ...trackSequencerData]
            }
            // Trim to exact length needed
            extendedSequencerData = extendedSequencerData.slice(0, totalStepsNeeded)
            
            console.log(`[CREATE PATTERNS] Extended sequencer data for track ${track.name} from ${trackSequencerData.length} to ${extendedSequencerData.length} steps for ${duration} bars`)
            console.log(`[DEBUG] Extended data:`, extendedSequencerData)
          }
          
          const newPattern: PatternBlock = {
            id: `sequencer-${track.id}-${i}-${Date.now()}`,
            name: `${getTrackDisplayName(track.name)} Pattern ${i + 1}`,
            tracks: [track],
            sequencerData: { [track.id]: extendedSequencerData }, // Use extended sequencer data
            bpm: bpm,
            steps: totalStepsNeeded, // Use the actual steps needed for this pattern
            duration: duration,
            startBar: startBar,
            endBar: endBar,
            color: track.color,
            trackId: track.id
          }
          
          newPatterns.push(newPattern)
        }
      }
    })
    
    if (newPatterns.length > 0) {
      // Replace existing patterns with new ones from sequencer
      setPatternBlocks(newPatterns)
      onPatternsChange?.(newPatterns)
      console.log(`[CREATE PATTERNS] Created ${newPatterns.length} patterns from sequencer data`)
    } else {
      console.warn('[CREATE PATTERNS] No patterns could be created from sequencer data')
    }
  }

  // Export the arrangement as a high-quality WAV file (Option 1: Offline rendering)
  const exportBeatAsWav = async () => {
    console.log('[EXPORT] Starting WAV export of arrangement with mixer settings applied')
    
    if (patternBlocks.length === 0) {
      alert('No patterns to export. Please add some patterns first.')
      return
    }

    // Store current audio state to restore later
    const currentIsPlaying = isArrangementPlaying
    const currentBar = arrangementTransportRef.current?.position || 0
    
    // Stop current playback to prevent interference
    if (currentIsPlaying) {
      console.log('[EXPORT] Stopping current playback for export')
      stopArrangement()
      // Small delay to ensure stop is processed
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    try {
      // Apply mixer settings to exported audio:
      // - Volume: track volume * master volume
      // - Mute: muted tracks are excluded from export
      // - Pan: logged but not yet implemented in offline context
      // - EQ: not yet implemented in offline context
      
      // Calculate total duration based on actual audio end times, not just pattern block boundaries
      const secondsPerBeat = 60 / bpm
      const beatsPerBar = 4
      const secondsPerBar = secondsPerBeat * beatsPerBar
      
      // Calculate the actual last moment when any audio finishes playing
      let actualAudioEndTime = 0
      for (const block of patternBlocks) {
        const track = tracks.find(t => t.id === block.trackId)
        if (!track?.audioUrl || track.audioUrl === 'undefined') {
          continue // Skip tracks without audio
        }
        
        // Check if track is muted in mixer settings
        const trackMixerSettings = mixerSettings[track.id]
        if (trackMixerSettings?.mute) {
          continue // Skip muted tracks
        }
        
        const startTimeSeconds = (block.startBar - 1) * secondsPerBar
        const patternDurationSeconds = block.duration * secondsPerBar
        const blockAudioEndTime = startTimeSeconds + patternDurationSeconds
        
        if (blockAudioEndTime > actualAudioEndTime) {
          actualAudioEndTime = blockAudioEndTime
        }
      }
      
      // Fallback to maxEndBar calculation if no audio blocks found
      if (actualAudioEndTime === 0) {
        const maxEndBar = Math.max(...patternBlocks.map(block => block.endBar))
        actualAudioEndTime = maxEndBar * secondsPerBar
      }
      
      const totalDurationSeconds = actualAudioEndTime
      const actualDurationBars = totalDurationSeconds / secondsPerBar
      
      console.log(`[EXPORT] Total duration: ${totalDurationSeconds}s (${actualDurationBars.toFixed(2)} bars) at ${bpm} BPM based on actual audio end times`)

      // Create completely isolated offline audio context for rendering (stereo output)
      // Use maximum quality settings - 96kHz sample rate for professional quality
      const sampleRate = 96000
      const offlineContext = new OfflineAudioContext(
        2, // stereo output
        Math.ceil(totalDurationSeconds * sampleRate), // length in samples
        sampleRate
      )
      
      // Ensure precise timing by using sample-accurate calculations
      const samplesPerSecond = sampleRate
      const samplesPerBeat = Math.round(samplesPerSecond * secondsPerBeat)
      const samplesPerBar = samplesPerBeat * beatsPerBar
      
      console.log(`[EXPORT] Created offline context at ${sampleRate}Hz for maximum quality`)

      // Create a master gain node
      const masterGain = offlineContext.createGain()
      masterGain.gain.value = 0.8 // Prevent clipping
      masterGain.connect(offlineContext.destination)

      // Helper function to get public audio URL
      const getPublicAudioUrl = (audioUrlOrPath: string) => {
        if (audioUrlOrPath.startsWith('http')) {
          return audioUrlOrPath
        }
        // Handle relative paths - assume they're in the public folder
        if (audioUrlOrPath.startsWith('/')) {
          return `${window.location.origin}${audioUrlOrPath}`
        }
        // Handle relative paths without leading slash
        return `${window.location.origin}/${audioUrlOrPath}`
      }

      // Schedule all patterns
      for (const block of patternBlocks) {
        const track = tracks.find(t => t.id === block.trackId)
        if (!track?.audioUrl || track.audioUrl === 'undefined') {
          console.warn(`[EXPORT] No audio URL for track ${track?.name}`)
          continue
        }

        try {
          console.log(`[EXPORT] Processing ${block.name} from track ${track.name}`)
          
          // Get the public URL for the audio file
          const publicAudioUrl = getPublicAudioUrl(track.audioUrl)
          console.log(`[EXPORT] Fetching audio from: ${publicAudioUrl}`)
          
          // Use maximum quality audio loading - fetch original file and decode at full quality
          console.log(`[EXPORT] Loading audio at maximum quality from: ${publicAudioUrl}`)
          
          const response = await fetch(publicAudioUrl)
          if (!response.ok) {
            throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`)
          }
          
          const arrayBuffer = await response.arrayBuffer()
          
          // Create a temporary audio context to decode at full quality
          const tempAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
          const audioBuffer = await tempAudioContext.decodeAudioData(arrayBuffer)
          
          console.log(`[EXPORT] Maximum quality audio loaded: ${audioBuffer.duration}s duration, ${audioBuffer.sampleRate}Hz, ${audioBuffer.numberOfChannels} channels`)
          
          // Close temporary context
          tempAudioContext.close()

          // Create high-quality audio processing chain (matching mixer quality)
          const trackGain = offlineContext.createGain()
          const trackPanner = offlineContext.createStereoPanner()
          
          // Apply volume settings from arrangement
          const trackVolume = trackVolumes[track.id] || 1
          const combinedVolume = trackVolume * arrangementMasterVolume
          trackGain.gain.value = combinedVolume
          console.log(`[EXPORT] Applied arrangement volume to ${track.name}: ${combinedVolume} (track: ${trackVolume}, master: ${arrangementMasterVolume})`)
          
          // Apply mixer settings if available (for additional processing)
          const trackMixerSettings = mixerSettings[track.id]
          if (trackMixerSettings) {
            // Check if track is muted
            if (trackMixerSettings.mute) {
              console.log(`[EXPORT] Track ${track.name} is muted, skipping`)
              continue
            }
            
            // Apply pan with stereo panner
            if (trackMixerSettings.pan !== 0) {
              trackPanner.pan.value = trackMixerSettings.pan
              console.log(`[EXPORT] Applied pan to ${track.name}: ${trackMixerSettings.pan}`)
            }
            
            // Apply EQ if settings exist (create filters)
            if (trackMixerSettings.eq && (trackMixerSettings.eq.low !== 0 || trackMixerSettings.eq.mid !== 0 || trackMixerSettings.eq.high !== 0)) {
              console.log(`[EXPORT] EQ settings for ${track.name}:`, trackMixerSettings.eq)
              
              // Create EQ filters (low, mid, high)
              const lowFilter = offlineContext.createBiquadFilter()
              const midFilter = offlineContext.createBiquadFilter()
              const highFilter = offlineContext.createBiquadFilter()
              
              // Configure filters
              lowFilter.type = 'lowshelf'
              lowFilter.frequency.value = 200
              lowFilter.gain.value = trackMixerSettings.eq.low
              
              midFilter.type = 'peaking'
              midFilter.frequency.value = 1000
              midFilter.Q.value = 1
              midFilter.gain.value = trackMixerSettings.eq.mid
              
              highFilter.type = 'highshelf'
              highFilter.frequency.value = 4000
              highFilter.gain.value = trackMixerSettings.eq.high
              
              // Connect EQ chain
              trackGain.connect(lowFilter)
              lowFilter.connect(midFilter)
              midFilter.connect(highFilter)
              highFilter.connect(trackPanner)
            } else {
              // No EQ - connect directly to panner
              trackGain.connect(trackPanner)
            }
          } else {
            // No mixer settings - connect directly to panner
            trackGain.connect(trackPanner)
          }

          // Apply playback rate if track has different tempo
          let effectivePlaybackRate = 1.0
          if (track.playbackRate && track.playbackRate !== 1) {
            effectivePlaybackRate = track.playbackRate
            console.log(`[EXPORT] Applying playback rate: ${effectivePlaybackRate}x`)
          }

          // Connect panner to master
          trackPanner.connect(masterGain)

          // Calculate start time (convert from bars to seconds) - use precise timing
          const startTimeSeconds = (block.startBar - 1) * secondsPerBar
          
          // Calculate pattern duration in seconds
          const patternDurationSeconds = block.duration * secondsPerBar
          
          // Use precise timing calculation to match live playback
          console.log(`[EXPORT] Scheduling ${block.name} at ${startTimeSeconds}s for ${patternDurationSeconds}s`)
          
          const audioDuration = audioBuffer.duration / effectivePlaybackRate
          
          // Calculate exact number of loops needed
          const loopCount = Math.ceil(patternDurationSeconds / audioDuration)
          
          // Use precise timing for each loop
          for (let i = 0; i < loopCount; i++) {
            const loopSource = offlineContext.createBufferSource()
            loopSource.buffer = audioBuffer
            loopSource.playbackRate.value = effectivePlaybackRate
            loopSource.connect(trackGain) // Always connect to trackGain (first node in chain)
            
            // Calculate precise start time for this loop
            const loopStartTime = startTimeSeconds + (i * audioDuration)
            
            // Calculate precise duration for this loop (don't exceed pattern duration)
            const remainingDuration = startTimeSeconds + patternDurationSeconds - loopStartTime
            const loopDuration = Math.min(audioDuration, remainingDuration)
            
            // Only schedule if we have remaining duration
            if (loopDuration > 0) {
              loopSource.start(loopStartTime, 0, loopDuration)
              
              console.log(`[EXPORT] Scheduled loop ${i + 1}/${loopCount} of ${block.name} at ${loopStartTime.toFixed(3)}s (duration: ${loopDuration.toFixed(3)}s)`)
            }
          }
          
        } catch (error) {
          console.error(`[EXPORT] Error processing track ${track?.name}:`, error)
          // Continue with other tracks instead of failing completely
        }
      }

      // Render the audio
      console.log('[EXPORT] Rendering audio...')
      const renderedBuffer = await offlineContext.startRendering()
      console.log('[EXPORT] Audio rendered successfully')
      
      // Convert to WAV
      const wavBlob = audioBufferToWav(renderedBuffer)
      
      console.log('[EXPORT] WAV blob created successfully')
      
      // Restore audio state if it was playing before
      if (currentIsPlaying) {
        console.log('[EXPORT] Restoring previous playback state')
        // Small delay to ensure cleanup is complete
        setTimeout(() => {
          // Reset transport to where it was
          if (arrangementTransportRef.current) {
            arrangementTransportRef.current.position = currentBar
          }
          // Resume playback
          playArrangement()
        }, 200)
      }
      
      return wavBlob
      
    } catch (error) {
      console.error('[EXPORT] Error exporting WAV:', error)
      alert('Error exporting WAV file. Please check the console for details and try again.')
      
      // Restore audio state even on error
      if (currentIsPlaying) {
        console.log('[EXPORT] Restoring playback state after error')
        setTimeout(() => {
          if (arrangementTransportRef.current) {
            arrangementTransportRef.current.position = currentBar
          }
          playArrangement()
        }, 200)
      }
      
      return null
    }
  }

  // Separate function for downloading WAV (for the existing export button)
  const downloadBeatAsWav = async () => {
    const wavBlob = await exportBeatAsWav()
    if (!wavBlob) return

    // Create download link with enhanced filename
    const url = URL.createObjectURL(wavBlob)
    const a = document.createElement('a')
    a.href = url
    
    // Create enhanced filename with arrangement info
    const patternCount = patternBlocks.length
    const maxEndBar = Math.max(...patternBlocks.map(block => block.endBar))
    const secondsPerBeat = 60 / bpm
    const beatsPerBar = 4
    const secondsPerBar = secondsPerBeat * beatsPerBar
    const totalDurationSeconds = maxEndBar * secondsPerBar
    const durationMinutes = Math.floor(totalDurationSeconds / 60)
    const durationSeconds = Math.floor(totalDurationSeconds % 60)
    
    const filename = `beat-arrangement-${bpm}bpm-${maxEndBar}bars-${patternCount}patterns-${durationMinutes}m${durationSeconds}s-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.wav`
    
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    console.log(`[EXPORT] Downloaded: ${filename}`)
  }

  // Export by recording live audio output (Option 2: Real-time capture)
  const exportBeatAsWavLive = async (): Promise<Blob | null> => {
    console.log('[EXPORT LIVE] HIGH QUALITY RECORDING - Starting export')
    
    try {
      // HIGH QUALITY RECORDING: Verify export markers are active
      if (!exportMarkersActive) {
        throw new Error('Export markers not set! Please click Export (Live) first to set markers.')
      }
      
      // HIGH QUALITY RECORDING: Calculate duration based on actual audio end times, not just export markers
      const secondsPerBeat = 60 / bpm
      const beatsPerBar = 4
      const secondsPerBar = secondsPerBeat * beatsPerBar
      
      // Calculate the actual last moment when any audio finishes playing within export range
      let actualAudioEndTime = 0
      for (const block of patternBlocks) {
        const track = tracks.find(t => t.id === block.trackId)
        if (!track?.audioUrl || track.audioUrl === 'undefined') {
          continue // Skip tracks without audio
        }
        
        // Check if track is muted in mixer settings
        const trackMixerSettings = mixerSettings[track.id]
        if (trackMixerSettings?.mute) {
          continue // Skip muted tracks
        }
        
        // Only consider patterns that overlap with export range
        if (block.endBar < exportStartBar || block.startBar > exportEndBar) {
          continue // Skip patterns outside export range
        }
        
        // Calculate effective start and end within export range
        const effectiveStartBar = Math.max(block.startBar, exportStartBar)
        const effectiveEndBar = Math.min(block.endBar, exportEndBar)
        
        const startTimeSeconds = (effectiveStartBar - 1) * secondsPerBar
        const patternDurationSeconds = (effectiveEndBar - effectiveStartBar + 1) * secondsPerBar
        const blockAudioEndTime = startTimeSeconds + patternDurationSeconds
        
        if (blockAudioEndTime > actualAudioEndTime) {
          actualAudioEndTime = blockAudioEndTime
        }
      }
      
      // Fallback to export marker calculation if no audio blocks found
      let totalDurationSeconds
      if (actualAudioEndTime === 0) {
        const exportDurationBars = exportEndBar - exportStartBar + 1
        totalDurationSeconds = exportDurationBars * secondsPerBar
        console.log('[EXPORT LIVE] No audio patterns found - using export marker duration')
      } else {
        // Adjust for export start position
        const exportStartTimeSeconds = (exportStartBar - 1) * secondsPerBar
        totalDurationSeconds = actualAudioEndTime - exportStartTimeSeconds
        console.log('[EXPORT LIVE] Using actual audio end time for precise duration')
      }
      
      const actualDurationBars = totalDurationSeconds / secondsPerBar
      console.log(`[EXPORT LIVE] HIGH QUALITY RECORDING: Duration = ${totalDurationSeconds}s (${actualDurationBars.toFixed(2)} bars) based on actual audio end times`)
      
      // HIGH QUALITY RECORDING: Import Tone.js
      const Tone = await import('tone')
      await Tone.start()
      
      // HIGH QUALITY RECORDING: Create audio context
      const audioContext = Tone.context
      if (audioContext.state !== 'running') {
        await audioContext.resume()
      }
      
      // HIGH QUALITY RECORDING: Create MediaStreamDestination
      const mediaStreamDestination = audioContext.createMediaStreamDestination()
      Tone.Destination.connect(mediaStreamDestination)
      
      // HIGH QUALITY RECORDING: Create MediaRecorder with high quality settings
      let mimeType = 'audio/webm;codecs=opus'
      
      // HIGH QUALITY RECORDING: Check MIME type support
      if (!window.MediaRecorder.isTypeSupported(mimeType)) {
        if (window.MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm'
        } else if (window.MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4'
        } else {
          mimeType = ''
        }
      }
      
      // HIGH QUALITY RECORDING: Create MediaRecorder with high quality settings
      let mediaRecorder: any
      
      try {
        // Try different approaches to create MediaRecorder
        if (typeof window.MediaRecorder === 'function') {
          mediaRecorder = new window.MediaRecorder(mediaStreamDestination.stream, {
            mimeType: mimeType || undefined,
            audioBitsPerSecond: 320000 // High quality bitrate
          })
        } else if ((window as any).MediaRecorder) {
          mediaRecorder = new (window as any).MediaRecorder(mediaStreamDestination.stream, {
            mimeType: mimeType || undefined,
            audioBitsPerSecond: 320000 // High quality bitrate
          })
        } else {
          // Fallback: try to get MediaRecorder from global scope
          const MediaRecorderGlobal = (globalThis as any).MediaRecorder || (window as any).MediaRecorder
          if (MediaRecorderGlobal) {
            mediaRecorder = new MediaRecorderGlobal(mediaStreamDestination.stream, {
              mimeType: mimeType || undefined,
              audioBitsPerSecond: 320000 // High quality bitrate
            })
          } else {
            throw new Error('MediaRecorder not available in this browser')
          }
        }
      } catch (error) {
        console.error('[EXPORT LIVE] HIGH QUALITY RECORDING: MediaRecorder creation failed:', error)
        throw new Error('Failed to create MediaRecorder: ' + (error as Error).message)
      }
      
      // HIGH QUALITY RECORDING: Store globally
      (window as any).mediaRecorderForExport = mediaRecorder
      
      // HIGH QUALITY RECORDING: Setup chunks array
      const recordedChunks: Blob[] = []
      
      // HIGH QUALITY RECORDING: Setup data handler
      mediaRecorder.ondataavailable = (event: any) => {
        if (event.data.size > 0) {
          recordedChunks.push(event.data)
          console.log(`[EXPORT LIVE] HIGH QUALITY RECORDING: Chunk ${recordedChunks.length} - ${event.data.size} bytes`)
        }
      }
      
      // HIGH QUALITY RECORDING: Setup stop handler
      mediaRecorder.onstop = () => {
        console.log(`[EXPORT LIVE] HIGH QUALITY RECORDING: MediaRecorder stopped - ${recordedChunks.length} chunks`)
        
        // Check abort flag - only skip if truly aborted (not manual stop)
        if (exportAbortFlag.current && !manualStopFlag.current) {
          console.log('[EXPORT LIVE] Export was aborted - skipping processing')
          setIsExportLiveRecording(false)
          return
        }
        
        // If manual stop, log it but continue processing
        if (manualStopFlag.current) {
          console.log('[EXPORT LIVE] Manual stop detected - processing recording up to this point')
        }
        
        // HIGH QUALITY RECORDING: Process immediately
        setTimeout(async () => {
          try {
            if (recordedChunks.length > 0) {
              const recordedBlob = new Blob(recordedChunks, { type: mimeType || 'audio/webm' })
              console.log(`[EXPORT LIVE] HIGH QUALITY RECORDING: Blob created - ${recordedBlob.size} bytes`)
              
              if (recordedBlob.size > 0) {
                const wavBlob = await convertBlobToWav(recordedBlob, totalDurationSeconds)
                
                if (wavBlob) {
                  // HIGH QUALITY RECORDING: Download immediately
                  const url = URL.createObjectURL(wavBlob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `HIGH-QUALITY-RECORDING-${bpm}bpm-${Math.max(...patternBlocks.map(block => block.endBar))}bars-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.wav`
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                  URL.revokeObjectURL(url)
                  
                  console.log('[EXPORT LIVE] HIGH QUALITY RECORDING: Export completed and downloaded!')
                  
                  // HIGH QUALITY RECORDING: Clean up with error handling
                  try {
                    ;(window as any).mediaRecorderForExport = null
                  } catch (error) {
                    console.error('[EXPORT LIVE] Error setting mediaRecorderForExport to null:', error)
                  }
                  
                  try {
                    // Check if Tone.Destination and mediaStreamDestination are still valid before disconnecting
                    if (Tone.Destination && mediaStreamDestination && mediaStreamDestination.stream) {
                      Tone.Destination.disconnect(mediaStreamDestination)
                    }
                  } catch (disconnectError) {
                    console.error('[EXPORT LIVE] Error disconnecting from mediaStreamDestination:', disconnectError)
                  }
                  
                  setIsExportLiveRecording(false)
                  
                  // Resolve the promise with the blob
                  if ((window as any).exportResolve) {
                    (window as any).exportResolve(wavBlob)
                  }
                }
              }
            }
          } catch (error) {
            console.error('[EXPORT LIVE] HIGH QUALITY RECORDING: Error in onstop:', error)
            
            // Handle InvalidAccessError specifically
            if (error instanceof Error && error.name === 'InvalidAccessError') {
              console.log('[EXPORT LIVE] InvalidAccessError in onstop - this is expected when audio resources are cleaned up')
              // Don't reject the promise for InvalidAccessError as the export was successful
              if ((window as any).exportResolve) {
                // Resolve with null since the export was successful but we can't return the blob
                ;(window as any).exportResolve(null)
              }
            } else {
              // Reject the promise for other errors
              if ((window as any).exportReject) {
                (window as any).exportReject(error)
              }
            }
          }
        }, 100)
      }
      
      // HIGH QUALITY RECORDING: Start recording with high quality settings
      setIsExportLiveRecording(true)
      mediaRecorder.start(100) // Smaller chunks for better quality
      console.log('[EXPORT LIVE] HIGH QUALITY RECORDING: Recording started')
      
      // HIGH QUALITY RECORDING: Play the arrangement for the exact duration
      console.log('[EXPORT LIVE] HIGH QUALITY RECORDING: Starting arrangement playback...')
      
      // Start playback from the export start bar
      const startTime = (exportStartBar - 1) * secondsPerBar
      const endTime = exportEndBar * secondsPerBar
      
      // Schedule the arrangement to play for the exact duration
      if (typeof playArrangement === 'function') {
        playArrangement()
      }
      
      // FORCE A MINIMUM TIMER - NO MORE INFINITE RECORDING!
      let safeTimerMs
      if (!totalDurationSeconds || totalDurationSeconds <= 0 || totalDurationSeconds > 300) {
        console.log(`🚨 [TIMER FIX] totalDurationSeconds is broken (${totalDurationSeconds}) - FORCING 60 second maximum!`)
        safeTimerMs = 60000 // Force max 60 seconds
      } else {
        safeTimerMs = Math.floor(totalDurationSeconds * 1000)
      }
      
      const timerMinutes = Math.floor(safeTimerMs / 60000)
      const timerSeconds = Math.floor((safeTimerMs % 60000) / 1000)
      console.log(`🔥 [FORCED TIMER] ⏱️ FORCED Timer set for ${safeTimerMs}ms (${timerMinutes}m ${timerSeconds}s) - original duration: ${totalDurationSeconds}s`)
      
      setTimeout(() => {
        console.log(`🔥 [FORCED TIMER] ⏰ FORCED Timer fired after ${safeTimerMs}ms - STOPPING RECORDING NOW!`)
        
        // FORCE STOP - NO EXCEPTIONS
        manualStopFlag.current = false // Make sure it's treated as auto-stop
        
        try {
          if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop()
            console.log('[EXPORT LIVE] HIGH QUALITY RECORDING: MediaRecorder.stop() called')
          }
          
          // Stop arrangement playback
          if (typeof stopArrangement === 'function') {
            stopArrangement()
          }
          
          // HIGH QUALITY RECORDING: Clean up with error handling
          try {
            (window as any).mediaRecorderForExport = null
          } catch (error) {
            console.error('[EXPORT LIVE] Error setting mediaRecorderForExport to null in timer:', error)
          }
          
          try {
            // Check if Tone.Destination and mediaStreamDestination are still valid before disconnecting
            if (Tone.Destination && mediaStreamDestination && mediaStreamDestination.stream) {
              Tone.Destination.disconnect(mediaStreamDestination)
            }
          } catch (disconnectError) {
            console.error('[EXPORT LIVE] Error disconnecting from mediaStreamDestination in timer:', disconnectError)
          }
          
          setIsExportLiveRecording(false)
          
          console.log('[EXPORT LIVE] HIGH QUALITY RECORDING: Timer cleanup complete')
        } catch (error) {
          console.error('[EXPORT LIVE] HIGH QUALITY RECORDING: Timer error:', error)
        }
      }, safeTimerMs)
      
      console.log('[EXPORT LIVE] HIGH QUALITY RECORDING: Export setup complete - recording with high quality...')
      
      // HIGH QUALITY RECORDING: Return a promise that resolves with the blob when recording is complete
      return new Promise<Blob | null>((resolve, reject) => {
        try {
          ;(window as any).exportResolve = resolve
          ;(window as any).exportReject = reject
        } catch (error) {
          console.error('[EXPORT LIVE] Error setting export resolve/reject:', error)
        }
      })
      
    } catch (error) {
      console.error('[EXPORT LIVE] HIGH QUALITY RECORDING: Error:', error)
      alert('HIGH QUALITY RECORDING ERROR: ' + (error as Error).message)
      setIsExportLiveRecording(false)
      throw error
    }
  }

  // Helper function to convert recorded blob to WAV
  const convertBlobToWav = async (blob: Blob, duration: number): Promise<Blob> => {
    try {
      // Create audio context to decode the recorded audio
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const arrayBuffer = await blob.arrayBuffer()
      
      // Handle WebM format from MediaRecorder
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      
      console.log(`[EXPORT LIVE] Converting recorded audio: ${audioBuffer.duration}s, ${audioBuffer.sampleRate}Hz`)
      
      // Convert to WAV using the same high-quality function
      const wavBlob = audioBufferToWav(audioBuffer)
      
      audioContext.close()
      return wavBlob
      
    } catch (error) {
      console.error('[EXPORT LIVE] Error converting recorded audio to WAV:', error)
      throw error
    }
  }

  // Download function for live capture export
  const downloadBeatAsWavLive = async () => {
    try {
      const wavBlob = await exportBeatAsWavLive()
      if (!wavBlob) return

      // Create download link with enhanced filename
      const url = URL.createObjectURL(wavBlob)
      const a = document.createElement('a')
      a.href = url
      
      // Create enhanced filename with arrangement info
      const patternCount = patternBlocks.length
      const maxEndBar = Math.max(...patternBlocks.map(block => block.endBar))
      const downloadSecondsPerBeat = 60 / bpm
      const downloadBeatsPerBar = 4
      const downloadSecondsPerBar = downloadSecondsPerBeat * downloadBeatsPerBar
      const downloadTotalDurationSeconds = maxEndBar * downloadSecondsPerBar
      const durationMinutes = Math.floor(downloadTotalDurationSeconds / 60)
      const durationSeconds = Math.floor(downloadTotalDurationSeconds % 60)
      
      const filename = `beat-arrangement-LIVE-${bpm}bpm-${maxEndBar}bars-${patternCount}patterns-${durationMinutes}m${durationSeconds}s-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.wav`
      
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      console.log(`[EXPORT LIVE] Downloaded: ${filename}`)
    } catch (error) {
      console.error('[EXPORT LIVE] Error downloading live capture WAV:', error)
      alert('Error exporting live capture WAV file. Please check the console for details.')
    }
  }

  // Export arrangement to loop-editor
  const exportToLoopEditor = async () => {
    try {
      console.log('[EXPORT TO LOOP EDITOR] Starting export...')
      
      // Check if we have patterns to export
      if (patternBlocks.length === 0) {
        showNotification('No Patterns', 'No patterns to export! Please add some patterns first.', 'warning')
        return
      }

      // Set export markers if not already set
      if (!exportMarkersActive) {
        setExportMarkers()
        showNotification('Export Markers Set', 'Export markers have been set. Click "Export to Loop Editor" again to start the export.', 'info')
        return
      }

      // Show loading notification
      showNotification('Exporting...', 'Exporting arrangement to loop editor...', 'info')

      // Export the arrangement as WAV with better error handling
      let wavBlob: Blob | null = null
      try {
        // Ensure audio is stopped before export to prevent InvalidAccessError
        if (isArrangementPlaying) {
          console.log('[EXPORT TO LOOP EDITOR] Stopping arrangement before export')
          stopArrangement()
          // Small delay to ensure audio is fully stopped
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
        wavBlob = await exportBeatAsWavLive()
      } catch (exportError) {
        console.error('[EXPORT TO LOOP EDITOR] Export error:', exportError)
        
        // Check if it's an InvalidAccessError and handle gracefully
        if (exportError instanceof Error && exportError.name === 'InvalidAccessError') {
          console.log('[EXPORT TO LOOP EDITOR] InvalidAccessError detected - creating fallback audio')
          showNotification('Export Warning', 'Audio access error, creating simple audio file...', 'warning')
        } else {
          showNotification('Export Warning', 'Live export failed, creating simple audio file...', 'warning')
        }
        
        // Create a simple WAV file as fallback
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
          const sampleRate = 44100
          const duration = (exportEndBar - exportStartBar + 1) * 4 * (60 / bpm) // Calculate duration in seconds
          const buffer = audioContext.createBuffer(2, sampleRate * duration, sampleRate)
          
          // Fill with silence (or you could add a simple tone)
          for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const channelData = buffer.getChannelData(channel)
            for (let i = 0; i < channelData.length; i++) {
              channelData[i] = 0 // Silence
            }
          }
          
          // Convert to WAV
          wavBlob = audioBufferToWav(buffer)
          
          // Clean up audio context
          audioContext.close()
        } catch (fallbackError) {
          console.error('[EXPORT TO LOOP EDITOR] Fallback audio creation failed:', fallbackError)
          showNotification('Export Failed', 'Failed to create fallback audio file.', 'error')
          return
        }
      }
      
      if (!wavBlob || wavBlob.size === 0) {
        showNotification('Export Failed', 'Failed to generate audio file for export.', 'error')
        return
      }

      // Get user session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        showNotification('Authentication Error', 'Please log in to export to loop editor.', 'error')
        return
      }

      // Create a unique filename for the exported audio
      const timestamp = Date.now()
      const filename = `beat-arrangement-${timestamp}.wav`
      
      // Upload the WAV file to storage
      const filePath = `loop-editor-exports/${session.user.id}/${filename}`
      
      const { error: uploadError } = await supabase.storage
        .from('beats')
        .upload(filePath, wavBlob, { 
          upsert: true,
          contentType: 'audio/wav'
        })
      
      if (uploadError) {
        console.error('[EXPORT TO LOOP EDITOR] Upload error:', uploadError)
        showNotification('Upload Failed', 'Failed to upload audio file.', 'error')
        return
      }

      // Get the public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from('beats')
        .getPublicUrl(filePath)

      // Create a loop-editor session
      const sessionData = {
        name: `Beat Arrangement - ${new Date().toLocaleString()}`,
        audio_file_name: filename,
        audio_file_url: urlData.publicUrl,
        bpm: bpm,
        markers: [], // Start with empty markers
        regions: [], // Start with empty regions
        user_id: session.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Save the session to the database
      const { data: savedSession, error: sessionError } = await supabase
        .from('loop_editor_sessions')
        .insert([sessionData])
        .select()
        .single()

      if (sessionError) {
        console.error('[EXPORT TO LOOP EDITOR] Session save error:', sessionError)
        showNotification('Session Save Failed', 'Failed to save loop editor session.', 'error')
        return
      }

      console.log('[EXPORT TO LOOP EDITOR] Session saved:', savedSession)

      // Show success notification before navigation
      showNotification('Export Successful', 'Arrangement exported! Opening loop editor...', 'success')
      
      // Small delay to ensure notification is shown
      setTimeout(() => {
        // Navigate to loop-editor with the session ID (using loop-session to avoid conflict with beat-maker)
        const loopEditorUrl = `/loop-editor?loop-session=${savedSession.id}`
        console.log('[EXPORT TO LOOP EDITOR] Navigating to:', loopEditorUrl)
        
        // Try router.push first, fallback to window.location if needed
        try {
          router.push(loopEditorUrl)
        } catch (navError) {
          console.error('[EXPORT TO LOOP EDITOR] Router navigation failed:', navError)
          console.log('[EXPORT TO LOOP EDITOR] Falling back to window.location')
          window.location.href = loopEditorUrl
        }
      }, 1000)
      
    } catch (error) {
      console.error('[EXPORT TO LOOP EDITOR] Error:', error)
      showNotification('Export Failed', 'Failed to export to loop editor. Please try again.', 'error')
    }
  }

  // Open save to library dialog
  const openSaveToLibraryDialog = async () => {
    if (patternBlocks.length === 0) {
      showNotification('No Patterns', 'No patterns to save. Please add some patterns first.', 'warning')
      return
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      showNotification('Authentication Error', 'Please log in to save to library.', 'error')
      return
    }

    // Load existing items based on selected type (default to 'album')
    await loadExistingItems(user.id, saveToLibraryType)
    
    setShowSaveToLibraryDialog(true)
    setNewTrackTitle('') // Reset track title when dialog opens
    setNewAlbumArtist('') // Reset album artist when dialog opens
    setAlbumArtists([]) // Reset album artists array when dialog opens
    setNewArtistInput('') // Reset artist input when dialog opens
    setCreateNew(true) // Default to "Create New" when dialog opens
    setSelectedItemId('') // Reset selected item
    setSelectedAlbumDetails(null) // Reset selected album details
    setIsExportLiveMode(false) // Default to save arrangement mode
    
    // Autofill title from session name if available
    if (sessionName && sessionName.trim()) {
      setNewItemTitle(sessionName)
    } else {
      setNewItemTitle('') // Reset if no session name
    }
  }



  // Load existing items for the selected type
  const loadExistingItems = async (userId: string, type?: 'album' | 'single' | 'track' | 'audio-library') => {
    try {
      const fetchType = type || saveToLibraryType
      console.log('[DEBUG] loadExistingItems called with type:', fetchType)
      
      let items: {id: string, title: string, name?: string, cover_art_url?: string, artist?: string}[] = []
      
      if (fetchType === 'album') {
        console.log('[DEBUG] Fetching albums for user:', userId)
        const { data, error } = await supabase
          .from('albums')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
        
        if (!error && data) {
          console.log('[LIBRARY] Fetched albums:', data)
          items = data.map(item => ({ 
            id: item.id, 
            title: item.title,
            artist: item.artist,
            cover_art_url: item.cover_art_url,
            description: item.description
          }))
        } else if (error) {
          console.error('[LIBRARY] Error fetching albums:', error)
        }
      } else if (fetchType === 'single') {
        console.log('[DEBUG] Fetching singles for user:', userId)
        const { data, error } = await supabase
          .from('singles')
          .select('id, title, artist, cover_art_url')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
        
        if (!error && data) {
          console.log('[LIBRARY] Fetched singles:', data)
          items = data.map(item => ({ 
            id: item.id, 
            title: item.title,
            artist: item.artist,
            cover_art_url: item.cover_art_url
          }))
        } else if (error) {
          console.error('[LIBRARY] Error fetching singles:', error)
        }
      } else if (fetchType === 'track') {
        console.log('[DEBUG] Fetching tracks for user:', userId)
        const { data, error } = await supabase
          .from('tracks')
          .select('id, title, artist, cover_art_url')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
        
        if (!error && data) {
          console.log('[LIBRARY] Fetched tracks:', data)
          items = data.map(item => ({ 
            id: item.id, 
            title: item.title,
            artist: item.artist,
            cover_art_url: item.cover_art_url
          }))
        } else if (error) {
          console.error('[LIBRARY] Error fetching tracks:', error)
        }
      } else if (fetchType === 'audio-library') {
        console.log('[DEBUG] Fetching audio library items for user:', userId)
        const { data, error } = await supabase
          .from('audio_library_items')
          .select('id, name')
          .eq('user_id', userId)
          .eq('type', 'beat')
          .order('created_at', { ascending: false })
        
        if (!error && data) {
          console.log('[LIBRARY] Fetched audio library items:', data)
          items = data.map(item => ({ id: item.id, title: item.name || 'Untitled' }))
        } else if (error) {
          console.error('[LIBRARY] Error fetching audio library items:', error)
        }
      }
      
      console.log('[DEBUG] Setting existingItems:', items)
      setExistingItems(items)
      setSelectedItemId('')
      setSelectedAlbumDetails(null)
      setCreateNew(false)
    } catch (error) {
      console.error('[LIBRARY] Error loading existing items:', error)
    }
  }

  // Handle type change in dialog
  // Add artist to the list
  const addArtist = () => {
    if (newArtistInput.trim() && !albumArtists.includes(newArtistInput.trim())) {
      setAlbumArtists([...albumArtists, newArtistInput.trim()])
      setNewArtistInput('')
    }
  }

  // Remove artist from the list
  const removeArtist = (artistToRemove: string) => {
    setAlbumArtists(albumArtists.filter(artist => artist !== artistToRemove))
  }

  // Handle Enter key in artist input
  const handleArtistInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addArtist()
    }
  }

  // Handle album selection
  const handleAlbumSelection = async (albumId: string) => {
    setSelectedItemId(albumId)
    const selectedAlbum = existingItems.find(item => item.id === albumId)
    if (selectedAlbum && saveToLibraryType === 'album') {
      setSelectedAlbumDetails({
        id: selectedAlbum.id,
        title: selectedAlbum.title,
        artist: selectedAlbum.artist || '',
        cover_art_url: selectedAlbum.cover_art_url || '',
        description: selectedAlbum.description
      })
      
      // Load existing tracks for this album
      try {
        const { data: tracks, error } = await supabase
          .from('album_tracks')
          .select('id, title, track_order, duration')
          .eq('album_id', albumId)
          .order('track_order', { ascending: true })
        
        if (!error && tracks) {
          setExistingAlbumTracks(tracks)
          // Set default position to after the last track
          const maxTrackOrder = tracks.length > 0 ? Math.max(...tracks.map(t => t.track_order)) : 0
          setSelectedTrackPosition(maxTrackOrder + 1)
          setShowTrackSelection(true)
        } else if (error) {
          console.error('Error loading album tracks:', error)
          setExistingAlbumTracks([])
          setSelectedTrackPosition(1)
          setShowTrackSelection(true)
        }
      } catch (error) {
        console.error('Error loading album tracks:', error)
        setExistingAlbumTracks([])
        setSelectedTrackPosition(1)
        setShowTrackSelection(true)
      }
    } else {
      setSelectedAlbumDetails(null)
      setExistingAlbumTracks([])
      setShowTrackSelection(false)
    }
  }

  const handleTypeChange = async (type: 'album' | 'single' | 'track' | 'audio-library') => {
    console.log('[DEBUG] handleTypeChange called with type:', type)
    setSaveToLibraryType(type)
    setNewTrackTitle('') // Reset track title when type changes
    setNewAlbumArtist('') // Reset album artist when type changes
    setAlbumArtists([]) // Reset album artists array when type changes
    setNewArtistInput('') // Reset artist input when type changes
    
    // Load items immediately with the correct type
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      console.log('[DEBUG] Loading items for user:', user.id, 'with type:', type)
      await loadExistingItems(user.id, type)
    }
  }

  // Save arrangement to library as WAV file
  const saveArrangementToLibrary = async () => {
    if (!newItemTitle.trim() && createNew) {
      showNotification('Title Required', 'Please enter a title for your new item.', 'warning')
      return
    }

    if (!selectedItemId && !createNew) {
      showNotification('Selection Required', 'Please select an existing item or create a new one.', 'warning')
      return
    }

    if (saveToLibraryType === 'album' && !newTrackTitle.trim()) {
      showNotification('Track Title Required', 'Please enter a title for your track.', 'warning')
      return
    }

    if (saveToLibraryType === 'album' && createNew && albumArtists.length === 0) {
      showNotification('Artist Required', 'Please add at least one artist for your album.', 'warning')
      return
    }

    setIsSavingToLibrary(true)
    setLibrarySaveError(null)

    try {
      // Generate WAV blob using existing export function
      const wavBlob = await exportBeatAsWav()
      if (!wavBlob) {
        throw new Error('Failed to generate WAV file')
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('User not authenticated')
      }

      // Create filename with arrangement info
      const patternCount = patternBlocks.length
      const maxEndBar = Math.max(...patternBlocks.map(block => block.endBar))
      const secondsPerBeat = 60 / bpm
      const beatsPerBar = 4
      const secondsPerBar = secondsPerBeat * beatsPerBar
      const totalDurationSeconds = maxEndBar * secondsPerBar
      const durationMinutes = Math.floor(totalDurationSeconds / 60)
      const durationSeconds = Math.floor(totalDurationSeconds % 60)
      
      const filename = `beat-arrangement-${bpm}bpm-${maxEndBar}bars-${patternCount}patterns-${durationMinutes}m${durationSeconds}s-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.wav`
      
      // Upload to Supabase storage
      const filePath = `library/${user.id}/${filename}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('beats')
        .upload(filePath, wavBlob, {
          contentType: 'audio/wav',
          cacheControl: '3600'
        })

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('beats')
        .getPublicUrl(filePath)

      // Detect genre from track names
      const { genre, subgenre } = detectGenreFromTrackName(tracks[0]?.name || 'beat')

      let savedItem: any = null

      if (saveToLibraryType === 'album') {
        if (createNew) {
          // Create new album
          const { data: albumData, error: albumError } = await supabase
            .from('albums')
            .insert({
              user_id: user.id,
              title: newItemTitle,
              artist: albumArtists.length > 0 ? albumArtists.join(', ') : user.email?.split('@')[0] || 'Unknown Artist',
              release_date: new Date().toISOString().split('T')[0],
              description: newItemDescription,
              cover_art_url: '' // Could be enhanced to add cover art
            })
            .select()
            .single()

          if (albumError) {
            throw new Error(`Album creation failed: ${albumError.message}`)
          }
          savedItem = albumData

          // Now add the track to the album
          const { data: trackData, error: trackError } = await supabase
            .from('album_tracks')
            .insert({
              album_id: albumData.id,
              title: newTrackTitle, // Track title is required for albums
              duration: `${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}`,
              audio_url: urlData.publicUrl,
              isrc: '', // Optional ISRC code
              session_id: linkToSession && currentSessionId ? currentSessionId : null, // Link to current session if enabled
              track_order: 1, // First track in new album
              created_at: new Date().toISOString()
            })
            .select()
            .single()

          if (trackError) {
            throw new Error(`Track creation failed: ${trackError.message}`)
          }

          console.log('[LIBRARY] Created album and added track:', { album: albumData, track: trackData })
        } else {
          // Add to existing album
          console.log('[DEBUG] selectedItemId:', selectedItemId)
          console.log('[DEBUG] existingItems:', existingItems)
          
          const existingAlbum = existingItems.find(item => item.id === selectedItemId)
          if (!existingAlbum) {
            throw new Error(`Selected album not found. ID: ${selectedItemId}`)
          }
          savedItem = existingAlbum

          console.log('[DEBUG] Using album_id:', existingAlbum.id)

          // Verify the album exists in the database
          const { data: albumCheck, error: albumCheckError } = await supabase
            .from('albums')
            .select('id')
            .eq('id', existingAlbum.id)
            .single()

          if (albumCheckError || !albumCheck) {
            throw new Error(`Album with ID ${existingAlbum.id} does not exist in the database`)
          }

          // Update existing tracks to make room for the new track
          if (selectedTrackPosition > 0) {
            // Get all tracks that need to be moved
            const { data: tracksToUpdate, error: fetchError } = await supabase
              .from('album_tracks')
              .select('id, track_order')
              .eq('album_id', existingAlbum.id)
              .gte('track_order', selectedTrackPosition)
              .order('track_order', { ascending: false }) // Update from highest to lowest to avoid conflicts
            
            if (fetchError) {
              throw new Error(`Failed to fetch tracks for reordering: ${fetchError.message}`)
            }
            
            // Update each track's position
            for (const track of tracksToUpdate || []) {
              const { error: updateError } = await supabase
                .from('album_tracks')
                .update({ track_order: track.track_order + 1 })
                .eq('id', track.id)
              
              if (updateError) {
                throw new Error(`Failed to update track position: ${updateError.message}`)
              }
            }
          }

          // Add the track to the existing album at the selected position
          const { data: trackData, error: trackError } = await supabase
            .from('album_tracks')
            .insert({
              album_id: existingAlbum.id, // Use the actual album ID from the found album
              title: newTrackTitle, // Track title is required for albums
              duration: `${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}`,
              audio_url: urlData.publicUrl,
              isrc: '', // Optional ISRC code
              session_id: linkToSession && currentSessionId ? currentSessionId : null, // Link to current session if enabled
              track_order: selectedTrackPosition, // Use user-selected track position
              created_at: new Date().toISOString()
            })
            .select()
            .single()

          if (trackError) {
            throw new Error(`Track creation failed: ${trackError.message}`)
          }

          console.log('[LIBRARY] Added track to existing album:', { album: existingAlbum, track: trackData })
        }
      } else if (saveToLibraryType === 'single') {
        if (createNew) {
          // Create new single
          const { data: singleData, error: singleError } = await supabase
            .from('singles')
            .insert({
              user_id: user.id,
              title: newItemTitle,
              artist: user.email?.split('@')[0] || 'Unknown Artist',
              release_date: new Date().toISOString().split('T')[0],
              description: newItemDescription,
              duration: `${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}`,
              audio_url: urlData.publicUrl,
              cover_art_url: null, // Set to null to avoid console error
              session_id: linkToSession && currentSessionId ? currentSessionId : null // Link to current session if enabled
            })
            .select()
            .single()

          if (singleError) {
            throw new Error(`Single creation failed: ${singleError.message}`)
          }
          savedItem = singleData
        } else {
          // Update existing single with new audio file
          const { data: singleData, error: singleError } = await supabase
            .from('singles')
            .update({
              audio_url: urlData.publicUrl,
              duration: `${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}`,
              description: newItemDescription || `Beat arrangement with ${patternCount} patterns, ${maxEndBar} bars at ${bpm} BPM`
            })
            .eq('id', selectedItemId)
            .select()
            .single()

          if (singleError) {
            throw new Error(`Single update failed: ${singleError.message}`)
          }
          savedItem = singleData
        }
      } else if (saveToLibraryType === 'track') {
        if (createNew) {
          // Create new track
          const { data: trackData, error: trackError } = await supabase
            .from('tracks')
            .insert({
              user_id: user.id,
              title: newItemTitle,
              artist: user.email?.split('@')[0] || 'Unknown Artist',
              release_date: new Date().toISOString().split('T')[0],
              description: newItemDescription,
              duration: `${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}`,
              audio_url: urlData.publicUrl,
              cover_art_url: null, // Set to null to avoid console error
              session_id: linkToSession && currentSessionId ? currentSessionId : null, // Link to current session if enabled
              bpm: bpm,
              genre: genre,
              subgenre: subgenre
            })
            .select()
            .single()

          if (trackError) {
            throw new Error(`Track creation failed: ${trackError.message}`)
          }
          savedItem = trackData
        } else {
          // Update existing track with new audio file
          const { data: trackData, error: trackError } = await supabase
            .from('tracks')
            .update({
              audio_url: urlData.publicUrl,
              duration: `${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}`,
              description: newItemDescription || `Beat arrangement with ${patternCount} patterns, ${maxEndBar} bars at ${bpm} BPM`,
              bpm: bpm,
              genre: genre,
              subgenre: subgenre
            })
            .eq('id', selectedItemId)
            .select()
            .single()

          if (trackError) {
            throw new Error(`Track update failed: ${trackError.message}`)
          }
          savedItem = trackData
        }
      } else if (saveToLibraryType === 'audio-library') {
        // Create record in audio_library_items table
        const { data: libraryData, error: libraryError } = await supabase
          .from('audio_library_items')
          .insert({
            user_id: user.id,
            name: createNew ? newItemTitle : `Beat Arrangement - ${bpm} BPM`,
            file_path: filePath,
            file_url: urlData.publicUrl,
            file_size: wavBlob.size,
            type: 'beat',
            audio_type: 'arrangement',
            description: createNew ? newItemDescription : `Beat arrangement with ${patternCount} patterns, ${maxEndBar} bars at ${bpm} BPM`,
            bpm: bpm,
            key: '', // Could be enhanced to detect key
            genre: genre,
            subgenre: subgenre,
            duration: totalDurationSeconds,
            sample_rate: 96000, // From exportBeatAsWav function
            bit_depth: 32, // From exportBeatAsWav function
            distribution_type: 'private',
            is_new: true
          })
          .select()
          .single()

        if (libraryError) {
          throw new Error(`Database error: ${libraryError.message}`)
        }
        savedItem = libraryData
      }

      showNotification(
        'Saved to Library', 
        `Beat arrangement saved successfully to ${saveToLibraryType === 'album' ? 'album' : saveToLibraryType === 'single' ? 'single' : saveToLibraryType === 'track' ? 'track' : 'audio library'}!\n\nFile: ${filename}\nDuration: ${durationMinutes}m ${durationSeconds}s\nPatterns: ${patternCount}\nBPM: ${bpm}\n\n💡 Tip: If you experience sync issues, try using "Export (Live)" instead for perfect timing.`, 
        'success'
      )

      console.log('[LIBRARY] Successfully saved arrangement:', savedItem)
      setShowSaveToLibraryDialog(false)

    } catch (error) {
      console.error('[LIBRARY] Error saving to library:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setLibrarySaveError(errorMessage)
      showNotification('Save Failed', `Failed to save to library: ${errorMessage}`, 'error')
    } finally {
      setIsSavingToLibrary(false)
    }
  }



  // Export live and save directly to library
  const exportLiveToLibrary = async () => {
    console.log('🚨🚨🚨 [EXPORT LIVE TO LIBRARY] FUNCTION CALLED - STARTING DEBUGGING 🚨🚨🚨')
    console.log('🚨 [EXPORT DEBUG] Function entry point reached!')
    
    try {
    // Check for title based on the current mode and type
    let title = ''
    if (saveToLibraryType === 'album' && !createNew) {
      // When adding to existing album, use track title
      title = newTrackTitle
    } else {
      // When creating new or for singles/audio-library, use item title
      title = newItemTitle
    }
    
    if (!title.trim()) {
      console.log('🚨 [EXPORT DEBUG] ERROR: No title provided!')
      showNotification('Export Error', 'Please enter a title for the export', 'error')
      return
    }
    
    console.log('🚨 [EXPORT DEBUG] Title check passed:', title)

    // CRITICAL: Reset flags and force cleanup any existing recording session before starting new one
    exportAbortFlag.current = false
    manualStopFlag.current = false
    console.log('[EXPORT LIVE TO LIBRARY] Forcing cleanup of any existing recording sessions...')
    
    try {
      // Force stop any existing MediaRecorder
      const existingMediaRecorder = (window as any).mediaRecorderForExport
      if (existingMediaRecorder) {
        console.log('[EXPORT LIVE TO LIBRARY] Found existing MediaRecorder - forcing stop')
        if (existingMediaRecorder.state === 'recording') {
          existingMediaRecorder.stop()
        }
        (window as any).mediaRecorderForExport = null
      }
      
      // Clear any existing timer
      if ((window as any).exportTimer) {
        console.log('[EXPORT LIVE TO LIBRARY] Clearing existing export timer')
        clearTimeout((window as any).exportTimer)
        ;(window as any).exportTimer = null
      }
      
      // Reset export state
      setIsExportLiveRecording(false)
      
      // Force stop arrangement if it's playing
      try {
        if (typeof stopArrangement === 'function') {
          stopArrangement()
        }
      } catch (stopError) {
        console.warn('[EXPORT LIVE TO LIBRARY] Error stopping arrangement:', stopError)
      }
      
      // Wait a moment for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 200))
      
    } catch (cleanupError) {
      console.error('[EXPORT LIVE TO LIBRARY] Error during cleanup:', cleanupError)
    }

    console.log('🚨 [EXPORT DEBUG] Cleanup completed, starting fresh recording session...')
    console.log('[EXPORT LIVE TO LIBRARY] Starting fresh recording session...')
    setIsExportLiveRecording(true)

    try {
      // Get current user
      console.log('🚨 [EXPORT DEBUG] Getting user authentication...')
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        console.log('🚨 [EXPORT DEBUG] ERROR: User not authenticated!')
        throw new Error('User not authenticated')
      }
      console.log('🚨 [EXPORT DEBUG] User authenticated:', user.id)

      // Calculate duration WITH INTENSIVE DEBUGGING
      console.log('🧮 [DURATION DEBUG] ========== CALCULATING TOTAL DURATION ==========')
      const patternCount = patternBlocks.length
      console.log(`🧮 [DURATION DEBUG] patternBlocks.length: ${patternCount}`)
      console.log(`🧮 [DURATION DEBUG] patternBlocks:`, JSON.stringify(patternBlocks, null, 2))
      
      if (patternCount === 0) {
        console.log('🚨 [DURATION DEBUG] ERROR: NO PATTERN BLOCKS FOUND!')
        throw new Error('No pattern blocks found - cannot calculate duration')
      }
      
      const endBars = patternBlocks.map(block => block.endBar)
      console.log(`🧮 [DURATION DEBUG] All endBars:`, endBars)
      const maxEndBar = Math.max(...endBars)
      console.log(`🧮 [DURATION DEBUG] maxEndBar: ${maxEndBar}`)
      
      const secondsPerBeat = 60 / bpm
      console.log(`🧮 [DURATION DEBUG] BPM: ${bpm}, secondsPerBeat: ${secondsPerBeat}`)
      const beatsPerBar = 4
      console.log(`🧮 [DURATION DEBUG] beatsPerBar: ${beatsPerBar}`)
      const secondsPerBar = secondsPerBeat * beatsPerBar
      console.log(`🧮 [DURATION DEBUG] secondsPerBar: ${secondsPerBar}`)
      
      const totalDurationSeconds = maxEndBar * secondsPerBar
      console.log(`🧮 [DURATION DEBUG] CALCULATION: ${maxEndBar} * ${secondsPerBar} = ${totalDurationSeconds} seconds`)
      
      const durationMinutes = Math.floor(totalDurationSeconds / 60)
      const durationSeconds = Math.floor(totalDurationSeconds % 60)
      console.log(`🧮 [DURATION DEBUG] FINAL: ${totalDurationSeconds}s = ${durationMinutes}m ${durationSeconds}s`)
      console.log('🧮 [DURATION DEBUG] ==============================================')

      // Import Tone.js and start recording
      console.log('🚨 [EXPORT DEBUG] Importing Tone.js...')
      const Tone = await import('tone')
      console.log('🚨 [EXPORT DEBUG] Starting Tone.js...')
      await Tone.start()
      console.log('🚨 [EXPORT DEBUG] Tone.js started successfully')
      
      // Create audio context
      console.log('🚨 [EXPORT DEBUG] Creating audio context...')
      const audioContext = Tone.context
      if (audioContext.state !== 'running') {
        console.log('🚨 [EXPORT DEBUG] Resuming audio context...')
        await audioContext.resume()
      }
      console.log('🚨 [EXPORT DEBUG] Audio context ready, state:', audioContext.state)
      
      // Create MediaStreamDestination
      console.log('🚨 [EXPORT DEBUG] Creating MediaStreamDestination...')
      const mediaStreamDestination = audioContext.createMediaStreamDestination()
      Tone.Destination.connect(mediaStreamDestination)
      
      // Store reference for cleanup
      ;(window as any).currentMediaStreamDestination = mediaStreamDestination
      console.log('🚨 [EXPORT DEBUG] MediaStreamDestination created and connected')
      
      // Create MediaRecorder with high quality settings
      let mimeType = 'audio/webm;codecs=opus'
      
      if (!window.MediaRecorder.isTypeSupported(mimeType)) {
        if (window.MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm'
        } else if (window.MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4'
        } else {
          mimeType = ''
        }
      }
      
      console.log('🚨 [EXPORT DEBUG] Creating MediaRecorder with mimeType:', mimeType)
      const recordedChunks: Blob[] = []
      const mediaRecorder = new MediaRecorder(mediaStreamDestination.stream, { mimeType })
      
      // Store global reference for cleanup
      ;(window as any).mediaRecorderForExport = mediaRecorder
      console.log('🚨 [EXPORT DEBUG] MediaRecorder created and stored globally')
      console.log('[EXPORT LIVE TO LIBRARY] MediaRecorder created and stored globally')
      
      // Setup data handler
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.push(event.data)
          console.log(`[EXPORT LIVE TO LIBRARY] Chunk recorded: ${recordedChunks.length} - ${event.data.size} bytes`)
        }
      }
      
      // Setup stop handler
      mediaRecorder.onstop = async () => {
        // CLEAR NUCLEAR TIMER IMMEDIATELY
        const nuclearTimer = (window as any).nuclearTimer
        if (nuclearTimer) {
          console.log('💀 [NUCLEAR TIMER] Clearing nuclear timer - recording stopped normally')
          clearTimeout(nuclearTimer)
          ;(window as any).nuclearTimer = null
        }
        
        const stopTime = Date.now()
        const startTime = (window as any).recordingStartTime || stopTime
        const elapsedMs = stopTime - startTime
        const elapsedSeconds = elapsedMs / 1000
        console.log(`[ONSTOP DEBUG] 🛑 MediaRecorder stopped - ${recordedChunks.length} chunks at ${stopTime}`)
        console.log(`[ONSTOP DEBUG] ⏱️ Recording duration: ${elapsedSeconds.toFixed(2)}s (expected: ${totalDurationSeconds}s)`)
        console.log(`[ONSTOP DEBUG] Flags: manual=${manualStopFlag.current}, abort=${exportAbortFlag.current}`)
        
        // Check abort flag - only skip if truly aborted (not manual stop)
        if (exportAbortFlag.current && !manualStopFlag.current) {
          console.log('[ONSTOP DEBUG] ❌ Export was aborted - skipping save')
          setIsExportLiveRecording(false)
          return
        }
        
        // If manual stop, log it but continue saving
        if (manualStopFlag.current) {
          console.log('[ONSTOP DEBUG] ⏸️ Manual stop detected - saving recording up to this point')
        } else {
          console.log('[ONSTOP DEBUG] ⏰ Auto-stop detected - saving complete recording')
        }
        
        try {
          if (recordedChunks.length > 0) {
            const recordedBlob = new Blob(recordedChunks, { type: mimeType || 'audio/webm' })
            console.log(`[EXPORT LIVE TO LIBRARY] Blob created - ${recordedBlob.size} bytes`)
            
            if (recordedBlob.size > 0) {
              console.log('🔄 [CONVERSION] Starting audio conversion - please wait...')
              const conversionStartTime = Date.now()
              const wavBlob = await convertBlobToWav(recordedBlob, totalDurationSeconds)
              const conversionEndTime = Date.now()
              const conversionDuration = (conversionEndTime - conversionStartTime) / 1000
              console.log(`✅ [CONVERSION] Audio conversion completed in ${conversionDuration.toFixed(2)}s`)
              
              if (wavBlob) {
                // Create filename
                const filename = `${title.replace(/[^a-zA-Z0-9]/g, '-')}-${bpm}bpm-${maxEndBar}bars-${patternCount}patterns-${durationMinutes}m${durationSeconds}s-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.wav`
                
                // Upload to Supabase storage
                const filePath = `library/${user.id}/${filename}`
                const { data: uploadData, error: uploadError } = await supabase.storage
                  .from('beats')
                  .upload(filePath, wavBlob, {
                    contentType: 'audio/wav',
                    cacheControl: '3600'
                  })

                if (uploadError) {
                  throw new Error(`Upload failed: ${uploadError.message}`)
                }

                // Get public URL
                const { data: urlData } = supabase.storage
                  .from('beats')
                  .getPublicUrl(filePath)

                // Detect genre from track names
                const { genre, subgenre } = detectGenreFromTrackName(tracks[0]?.name || 'beat')

                // Fetch session name if linking to session
                let sessionName = null
                if (linkToSession && currentSessionId) {
                  try {
                    const { data: sessionData, error: sessionError } = await supabase
                      .from('beat_sessions')
                      .select('name')
                      .eq('id', currentSessionId)
                      .single()
                    
                    if (!sessionError && sessionData) {
                      sessionName = sessionData.name
                    }
                  } catch (error) {
                    console.error('Error fetching session name:', error)
                  }
                }

                // Save based on the selected library type (same logic as saveArrangementToLibrary)
                let savedItem: any = null

                if (saveToLibraryType === 'album') {
                  if (createNew) {
                    // Create new album
                    const { data: albumData, error: albumError } = await supabase
                      .from('albums')
                      .insert({
                        user_id: user.id,
                        title: newItemTitle,
                        artist: albumArtists.length > 0 ? albumArtists.join(', ') : user.email?.split('@')[0] || 'Unknown Artist',
                        release_date: new Date().toISOString().split('T')[0],
                        description: newItemDescription,
                        cover_art_url: '' // Could be enhanced to add cover art
                      })
                      .select()
                      .single()

                    if (albumError) {
                      throw new Error(`Album creation failed: ${albumError.message}`)
                    }
                    savedItem = albumData

                    // Now add the track to the album
                    const { data: trackData, error: trackError } = await supabase
                      .from('album_tracks')
                      .insert({
                        album_id: albumData.id,
                        title: newTrackTitle, // Track title is required for albums
                        duration: `${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}`,
                        audio_url: urlData.publicUrl,
                        isrc: '', // Optional ISRC code
                        session_id: linkToSession && currentSessionId ? currentSessionId : null, // Link to current session if enabled
                        session_name: sessionName, // Store session name for UI display
                        track_order: 1, // First track in new album
                        created_at: new Date().toISOString()
                      })
                      .select()
                      .single()

                    if (trackError) {
                      throw new Error(`Track creation failed: ${trackError.message}`)
                    }

                    console.log('[EXPORT LIVE TO LIBRARY] Created album and added track:', { album: albumData, track: trackData })
                  } else {
                    // Add to existing album
                    const existingAlbum = existingItems.find(item => item.id === selectedItemId)
                    if (!existingAlbum) {
                      throw new Error(`Selected album not found. ID: ${selectedItemId}`)
                    }
                    savedItem = existingAlbum

                    // Update existing tracks to make room for the new track
                    if (selectedTrackPosition > 0) {
                      // Get all tracks that need to be moved
                      const { data: tracksToUpdate, error: fetchError } = await supabase
                        .from('album_tracks')
                        .select('id, track_order')
                        .eq('album_id', existingAlbum.id)
                        .gte('track_order', selectedTrackPosition)
                        .order('track_order', { ascending: false }) // Update from highest to lowest to avoid conflicts
                      
                      if (fetchError) {
                        throw new Error(`Failed to fetch tracks for reordering: ${fetchError.message}`)
                      }
                      
                      // Update each track's position
                      for (const track of tracksToUpdate || []) {
                        const { error: updateError } = await supabase
                          .from('album_tracks')
                          .update({ track_order: track.track_order + 1 })
                          .eq('id', track.id)
                        
                        if (updateError) {
                          throw new Error(`Failed to update track position: ${updateError.message}`)
                        }
                      }
                    }

                    // Add the track to the existing album at the selected position
                    const { data: trackData, error: trackError } = await supabase
                      .from('album_tracks')
                      .insert({
                        album_id: existingAlbum.id,
                        title: newTrackTitle, // Track title is required for albums
                        duration: `${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}`,
                        audio_url: urlData.publicUrl,
                        isrc: '', // Optional ISRC code
                        session_id: linkToSession && currentSessionId ? currentSessionId : null, // Link to current session if enabled
                        session_name: sessionName, // Store session name for UI display
                        track_order: selectedTrackPosition, // Use user-selected track position
                        created_at: new Date().toISOString()
                      })
                      .select()
                      .single()

                    if (trackError) {
                      throw new Error(`Track creation failed: ${trackError.message}`)
                    }

                    console.log('[EXPORT LIVE TO LIBRARY] Added track to existing album:', { album: existingAlbum, track: trackData })
                  }
                } else if (saveToLibraryType === 'single') {
                  if (createNew) {
                    // Create new single
                    const { data: singleData, error: singleError } = await supabase
                      .from('singles')
                      .insert({
                        user_id: user.id,
                        title: newItemTitle,
                        artist: user.email?.split('@')[0] || 'Unknown Artist',
                        release_date: new Date().toISOString().split('T')[0],
                        description: newItemDescription,
                        duration: `${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}`,
                        audio_url: urlData.publicUrl,
                        cover_art_url: null, // Set to null to avoid console error
                        session_id: linkToSession && currentSessionId ? currentSessionId : null, // Link to current session if enabled
                        session_name: sessionName // Store session name for UI display
                      })
                      .select()
                      .single()

                    if (singleError) {
                      throw new Error(`Single creation failed: ${singleError.message}`)
                    }
                    savedItem = singleData
                  } else {
                    // Update existing single with new audio file
                    const { data: singleData, error: singleError } = await supabase
                      .from('singles')
                      .update({
                        audio_url: urlData.publicUrl,
                        duration: `${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}`,
                        description: newItemDescription || `Live export with ${patternCount} patterns, ${maxEndBar} bars at ${bpm} BPM`
                      })
                      .eq('id', selectedItemId)
                      .select()
                      .single()

                    if (singleError) {
                      throw new Error(`Single update failed: ${singleError.message}`)
                    }
                    savedItem = singleData
                  }
                } else if (saveToLibraryType === 'track') {
                  if (createNew) {
                    // Create new track
                    const { data: trackData, error: trackError } = await supabase
                      .from('tracks')
                      .insert({
                        user_id: user.id,
                        title: newItemTitle,
                        artist: user.email?.split('@')[0] || 'Unknown Artist',
                        release_date: new Date().toISOString().split('T')[0],
                        description: newItemDescription,
                        duration: `${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}`,
                        audio_url: urlData.publicUrl,
                        cover_art_url: null, // Set to null to avoid console error
                        session_id: linkToSession && currentSessionId ? currentSessionId : null, // Link to current session if enabled
                        session_name: sessionName, // Store session name for UI display
                        bpm: bpm,
                        genre: '', // Could be enhanced to detect genre
                        subgenre: '' // Could be enhanced to detect subgenre
                      })
                      .select()
                      .single()

                    if (trackError) {
                      throw new Error(`Track creation failed: ${trackError.message}`)
                    }
                    savedItem = trackData
                  } else {
                    // Update existing track with new audio file
                    const { data: trackData, error: trackError } = await supabase
                      .from('tracks')
                      .update({
                        audio_url: urlData.publicUrl,
                        duration: `${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}`,
                        description: newItemDescription || `Live export with ${patternCount} patterns, ${maxEndBar} bars at ${bpm} BPM`,
                        bpm: bpm,
                        genre: '', // Could be enhanced to detect genre
                        subgenre: '' // Could be enhanced to detect subgenre
                      })
                      .eq('id', selectedItemId)
                      .select()
                      .single()

                    if (trackError) {
                      throw new Error(`Track update failed: ${trackError.message}`)
                    }
                    savedItem = trackData
                  }
                } else if (saveToLibraryType === 'audio-library') {
                  // Create record in audio_library_items table
                  const insertData = {
                    user_id: user.id,
                    name: title,
                    file_path: filePath,
                    file_url: urlData.publicUrl,
                    file_size: wavBlob.size,
                    type: 'beat',
                    audio_type: 'arrangement', // Use same type as working function
                    description: newItemDescription,
                    bpm: bpm,
                    key: '', // Could be enhanced to detect key
                    genre: '', // Could be enhanced to detect genre
                    subgenre: '', // Could be enhanced to detect subgenre
                    duration: totalDurationSeconds,
                    sample_rate: 96000,
                    bit_depth: 32,
                    distribution_type: 'private',
                    is_new: true
                  }
                  
                  console.log('[EXPORT LIVE TO LIBRARY] Inserting into audio_library_items:', insertData)
                  
                  const { data: libraryData, error: libraryError } = await supabase
                    .from('audio_library_items')
                    .insert(insertData)
                    .select()
                    .single()

                  if (libraryError) {
                    console.error('[EXPORT LIVE TO LIBRARY] Database error:', libraryError)
                    throw new Error(`Database error: ${libraryError.message}`)
                  }
                  
                  console.log('[EXPORT LIVE TO LIBRARY] Database insert successful:', libraryData)
                  savedItem = libraryData
                }

                showNotification(
                  'Live Export Saved to Library', 
                  `Live export saved successfully to your ${saveToLibraryType === 'album' ? 'album' : saveToLibraryType === 'single' ? 'single' : saveToLibraryType === 'track' ? 'track' : 'audio library'}!\n\nFile: ${filename}\nDuration: ${durationMinutes}m ${durationSeconds}s\nPatterns: ${patternCount}\nBPM: ${bpm}\n\n🎵 Perfect timing preserved with live recording!`, 
                  'success'
                )

                console.log('[EXPORT LIVE TO LIBRARY] Successfully saved:', savedItem)
                setShowSaveToLibraryDialog(false)
              }
            }
          }
        } catch (error) {
          console.error('[EXPORT LIVE TO LIBRARY] Error in onstop:', error)
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
          showNotification('Export Failed', `Failed to save live export: ${errorMessage}`, 'error')
        } finally {
          setIsExportLiveRecording(false)
        }
      }
      
      // NUCLEAR OPTION: GLOBAL KILLER TIMER - STARTS IMMEDIATELY
      console.log('💀 [NUCLEAR TIMER] Setting up GLOBAL KILLER TIMER for 60 seconds MAX!')
      const nuclearTimer = setTimeout(() => {
        console.log('💀 [NUCLEAR TIMER] 🔥 NUCLEAR TIMER FIRED - KILLING EVERYTHING!')
        console.log('🔥 NUCLEAR TIMER SUCCESS - Auto-stopping recording at 60 second limit!')
        
        // Force stop everything
        try {
          const globalRecorder = (window as any).mediaRecorderForExport
          if (globalRecorder && globalRecorder.state === 'recording') {
            console.log('💀 [NUCLEAR TIMER] Stopping global recorder')
            globalRecorder.stop()
          }
          
          // Force stop arrangement
          if (typeof stopArrangement === 'function') {
            console.log('💀 [NUCLEAR TIMER] Force stopping arrangement')
            stopArrangement()
          }
          
          setIsExportLiveRecording(false)
        } catch (error) {
          console.error('💀 [NUCLEAR TIMER] Error in nuclear timer:', error)
        }
      }, 60000) // 60 second ABSOLUTE MAX
      
      // Store nuclear timer globally so it can be cleared
      ;(window as any).nuclearTimer = nuclearTimer
      
      // Start recording
      setIsExportLiveRecording(true)
      const recordingStartTime = Date.now()
      console.log(`📹 [RECORDING DEBUG] About to start MediaRecorder - current state: ${mediaRecorder.state}`)
      mediaRecorder.start(100) // Smaller chunks for better quality
      console.log(`📹 [RECORDING DEBUG] ▶️ Recording started at ${recordingStartTime} - expecting ${totalDurationSeconds}s duration`)
      console.log(`📹 [RECORDING DEBUG] MediaRecorder state after start(): ${mediaRecorder.state}`)
      
      // Store start time for debugging
      ;(window as any).recordingStartTime = recordingStartTime
      
      // Play the arrangement
      console.log('🎵 [PLAYBACK DEBUG] About to start arrangement playback...')
      playArrangement()
      console.log('🎵 [PLAYBACK DEBUG] playArrangement() called')
      
      // FORCE A MINIMUM TIMER - NO MORE INFINITE RECORDING!
      console.log('⏰ [TIMER DEBUG] ========== SETTING UP TIMER ==========')
      console.log(`⏰ [TIMER DEBUG] totalDurationSeconds value: ${totalDurationSeconds}`)
      console.log(`⏰ [TIMER DEBUG] totalDurationSeconds type: ${typeof totalDurationSeconds}`)
      console.log(`⏰ [TIMER DEBUG] totalDurationSeconds <= 0: ${totalDurationSeconds <= 0}`)
      console.log(`⏰ [TIMER DEBUG] totalDurationSeconds > 300: ${totalDurationSeconds > 300}`)
      console.log(`⏰ [TIMER DEBUG] !totalDurationSeconds: ${!totalDurationSeconds}`)
      
      let safeTimerMs
      if (!totalDurationSeconds || totalDurationSeconds <= 0 || totalDurationSeconds > 300) {
        console.log(`🚨 [TIMER FIX] totalDurationSeconds is broken (${totalDurationSeconds}) - FORCING 60 second maximum!`)
        safeTimerMs = 60000 // Force max 60 seconds
        console.log(`⏰ [TIMER DEBUG] FORCED safeTimerMs = ${safeTimerMs}`)
      } else {
        safeTimerMs = Math.floor(totalDurationSeconds * 1000)
        console.log(`⏰ [TIMER DEBUG] CALCULATED safeTimerMs = ${safeTimerMs} (from ${totalDurationSeconds} * 1000)`)
      }
      
      const timerMinutes = Math.floor(safeTimerMs / 60000)
      const timerSeconds = Math.floor((safeTimerMs % 60000) / 1000)
      console.log(`🔥 [FORCED TIMER] ⏱️ FORCED Timer set for ${safeTimerMs}ms (${timerMinutes}m ${timerSeconds}s) - original duration: ${totalDurationSeconds}s`)
      
      const timerStartTime = Date.now()
      console.log(`⏰ [TIMER DEBUG] Timer started at: ${timerStartTime}`)
      console.log(`⏰ [TIMER DEBUG] Timer should fire at: ${timerStartTime + safeTimerMs}`)
      
      const timerId = setTimeout(() => {
        const timerFireTime = Date.now()
        const actualDelay = timerFireTime - timerStartTime
        console.log(`🔥 [FORCED TIMER] ⏰ FORCED Timer fired at ${timerFireTime} after ${actualDelay}ms (expected: ${safeTimerMs}ms) - STOPPING RECORDING NOW!`)
        
        // Check if manual stop already happened - don't auto-stop
        if (manualStopFlag.current) {
          console.log('[TIMER DEBUG] ⏸️ Manual stop already occurred - skipping auto-stop')
          return
        }
        
        // Check abort flag - if aborted, don't auto-stop
        if (exportAbortFlag.current) {
          console.log('[TIMER DEBUG] ❌ Export was aborted - skipping auto-stop')
          return
        }
        
        console.log('[TIMER DEBUG] ✅ No conflicts - proceeding with auto-stop')
        
        try {
          console.log(`[TIMER DEBUG] MediaRecorder check: exists=${!!mediaRecorder}, state=${mediaRecorder?.state}`)
          if (mediaRecorder && mediaRecorder.state === 'recording') {
            console.log('[TIMER DEBUG] 🛑 Stopping MediaRecorder via timer')
            mediaRecorder.stop()
            console.log('[EXPORT LIVE TO LIBRARY] MediaRecorder.stop() called')
          } else {
            console.log('[TIMER DEBUG] ⚠️ MediaRecorder not recording or not found')
            console.log(`[TIMER DEBUG] MediaRecorder exists: ${!!mediaRecorder}`)
            console.log(`[TIMER DEBUG] MediaRecorder state: ${mediaRecorder?.state}`)
          }
          
          // Stop arrangement playback
          console.log('[TIMER DEBUG] 🛑 Stopping arrangement via timer')
          stopArrangement()
          
          // Clean up
          console.log('[TIMER DEBUG] 🔌 Disconnecting Tone.js via timer')
          Tone.Destination.disconnect(mediaStreamDestination)
          
          console.log('[EXPORT LIVE TO LIBRARY] Timer cleanup complete')
        } catch (error) {
          console.error('[EXPORT LIVE TO LIBRARY] Timer error:', error)
        }
      }, safeTimerMs)
      
      console.log(`⏰ [TIMER DEBUG] setTimeout returned timerId: ${timerId}`)
      console.log('⏰ [TIMER DEBUG] ===========================================')
      console.log('[EXPORT LIVE TO LIBRARY] Export setup complete - recording with high quality...')
      
    } catch (error) {
      console.log('🚨 [EXPORT DEBUG] ❌ CRITICAL ERROR IN EXPORT FUNCTION!')
      console.error('[EXPORT LIVE TO LIBRARY] Error starting export:', error)
      console.log('🚨 [EXPORT DEBUG] Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      })
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      showNotification('Export Failed', `Failed to start live export: ${errorMessage}`, 'error')
      setIsExportLiveRecording(false)
    }
    } catch (outerError) {
      console.log('🚨 [EXPORT DEBUG] ❌ OUTER CATCH - FUNCTION FAILED BEFORE TRY BLOCK!')
      console.error('[EXPORT LIVE TO LIBRARY] Outer error:', outerError)
    }
  }

  // Helper function to convert AudioBuffer to maximum quality WAV format (32-bit float)
  const audioBufferToWav = (buffer: AudioBuffer): Blob => {
    const length = buffer.length
    const numberOfChannels = buffer.numberOfChannels
    const sampleRate = buffer.sampleRate
    const bytesPerSample = 4 // 32-bit float
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * bytesPerSample)
    const view = new DataView(arrayBuffer)

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }

    writeString(0, 'RIFF')
    view.setUint32(4, 36 + length * numberOfChannels * bytesPerSample, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 3, true) // IEEE float format
    view.setUint16(22, numberOfChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * numberOfChannels * bytesPerSample, true)
    view.setUint16(32, numberOfChannels * bytesPerSample, true)
    view.setUint16(34, 32, true) // 32-bit float
    writeString(36, 'data')
    view.setUint32(40, length * numberOfChannels * bytesPerSample, true)

    // Convert audio data to 32-bit float (maximum quality)
    let offset = 44
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]))
        
        // Write 32-bit float sample (little-endian)
        view.setFloat32(offset, sample, true)
        offset += 4
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
    
    // Stop all players with better error handling
    Object.entries(arrangementPlayersRef.current).forEach(([trackId, player]) => {
      console.log(`[RESET DEBUG] Stopping player for track ${trackId}, state: ${player?.state}`)
      if (player) {
        try {
          // Force stop regardless of state
          player.stop()
          // Double-check the stop worked
          if (player.state === 'started') {
            console.warn(`[RESET DEBUG] Player for track ${trackId} still started after stop, trying again...`)
            player.stop()
          }
          console.log(`[RESET DEBUG] Player for track ${trackId} stopped successfully, final state: ${player.state}`)
        } catch (error) {
          console.error(`[RESET DEBUG] Error stopping player for track ${trackId}:`, error)
          // Try alternative stop method
          try {
            if (player.dispose) {
              player.dispose()
              console.log(`[RESET DEBUG] Disposed player for track ${trackId} as fallback`)
            }
          } catch (disposeError) {
            console.error(`[RESET DEBUG] Error disposing player for track ${trackId}:`, disposeError)
          }
        }
      }
    })
    
    // Reset pitch shifters to 0 before disposing
    Object.entries(arrangementPitchShiftersRef.current).forEach(([trackId, pitchShifter]) => {
      console.log(`[RESET DEBUG] Resetting pitch shifter for track ${trackId} to 0`)
      if (pitchShifter) {
        try {
          // Reset pitch to 0 before disposing
          pitchShifter.pitch = 0
          pitchShifter.dispose()
          console.log(`[RESET DEBUG] Reset and disposed pitch shifter for track ${trackId}`)
        } catch (error) {
          console.error(`[RESET DEBUG] Error resetting pitch shifter for track ${trackId}:`, error)
        }
      }
    })
    
    // Reset transport with better error handling
    if (arrangementTransportRef.current) {
      console.log('[RESET DEBUG] Stopping and cancelling transport...')
      try {
        arrangementTransportRef.current.stop()
        arrangementTransportRef.current.cancel()
        console.log('[RESET DEBUG] Transport stopped and cancelled successfully')
      } catch (error) {
        console.error('[RESET DEBUG] Error resetting transport:', error)
      }
    }
    
    // Clear progress interval
    if (progressIntervalRef.current) {
      console.log('[RESET DEBUG] Clearing progress interval')
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
    
    // Reset state flags
    isPlayingRef.current = false
    
    // Clear all audio references to force fresh initialization
    arrangementPlayersRef.current = {}
    arrangementPitchShiftersRef.current = {}
    arrangementGainNodesRef.current = {}
    
    // Reset initialization flag to force fresh audio setup
    isArrangementAudioInitialized.current = false
    
    console.log('[ARRANGEMENT AUDIO] Audio system reset complete')
  }

  // Play the entire arrangement using arrangement audio system
  const playArrangement = async (): Promise<void> => {
    console.log('=== PLAY ARRANGEMENT FUNCTION STARTED ===')
    console.log('[PLAY DEBUG] Current state:', {
      isArrangementPlaying,
      patternBlocksLength: patternBlocks.length,
      currentBar,
      transportState: arrangementTransportRef.current?.state,
      playersCount: Object.keys(arrangementPlayersRef.current).length
    })
    console.log('[ARRANGEMENT AUDIO] Play arrangement called')
    console.log('[PLAY DEBUG] Current state:', { 
      isArrangementPlaying, 
      patternBlocksLength: patternBlocks.length, 
      currentBar,
      transportState: arrangementTransportRef.current?.state,
      playersCount: Object.keys(arrangementPlayersRef.current).length
    })
          console.log('[ARRANGEMENT AUDIO] Pattern blocks:', patternBlocks)
      console.log('[ARRANGEMENT AUDIO] Pattern blocks length:', patternBlocks.length)
      console.log('[ARRANGEMENT AUDIO] Patterns prop length:', patterns.length)
      console.log('[ARRANGEMENT AUDIO] Available tracks:', tracks)
      console.log('[ARRANGEMENT AUDIO] Current players:', arrangementPlayersRef.current)
      
      // CRITICAL: Check if we have any pattern blocks to play
      if (patternBlocks.length === 0) {
        console.error('[ARRANGEMENT AUDIO] No pattern blocks to play!')
        return
      }
      
      // CRITICAL: Check if we have any players loaded
      const loadedPlayers = Object.values(arrangementPlayersRef.current).filter(player => player && player.loaded)
      console.log('[ARRANGEMENT AUDIO] Loaded players count:', loadedPlayers.length)
      
      if (loadedPlayers.length === 0) {
        console.error('[ARRANGEMENT AUDIO] No players loaded! Cannot start arrangement.')
        return
      }
    
    if (patternBlocks.length === 0) {
      console.log('[ARRANGEMENT AUDIO] No pattern blocks found - manual loading required')
      showNotification('No Patterns', 'Please load patterns manually before playing the arrangement', 'warning')
      return
    }
    
    // CRITICAL: Ensure we're completely stopped before starting
    if (isArrangementPlaying) {
      console.log('[PLAY DEBUG] Already playing, stopping first...')
      stopArrangement()
      // Wait a moment for cleanup
      await new Promise(resolve => setTimeout(resolve, 200))
    }
    
    // CRITICAL: Reset playhead position when starting fresh
    console.log('[PLAY DEBUG] Resetting playhead position for fresh start')
    // If export markers are active, start from the export start marker
    const startBar = exportMarkersActive ? exportStartBar : 1
    setCurrentBarSafe(startBar) // Start from export start marker or bar 1
    console.log(`[PLAY DEBUG] Playhead reset to bar ${startBar}`)
    
    // CRITICAL: If export markers are active, we need to schedule patterns differently
    if (exportMarkersActive) {
      console.log(`[PLAY DEBUG] Export mode: will play from bar ${exportStartBar} to bar ${exportEndBar}`)
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
                pitch: 0,  // Always start with 0 pitch shift
                windowSize: 0.025,  // Use professional quality settings
                delayTime: 0.0005,  // Minimal delay for maximum quality
                feedback: 0.01      // Very low feedback for crystal clear audio
              })
              
              // Apply pitch shift after creation if needed
              if (track.pitchShift && track.pitchShift !== 0) {
                pitchShifter.pitch = track.pitchShift
                console.log(`[PLAY ARRANGEMENT] Applied pitch shift ${track.pitchShift} to track ${track.name}`)
              }
              
              const player = new Tone.Player(track.audioUrl).connect(pitchShifter)
              
              // Apply mixer settings (volume, pan, EQ)
              const trackMixerSettings = mixerSettings[track.id]
              if (trackMixerSettings) {
                // Apply volume with safety check
                if (trackMixerSettings.volume !== undefined) {
                  let volumeDb = -Infinity
                  if (!trackMixerSettings.mute && trackMixerSettings.volume > 0) {
                    volumeDb = Math.max(-60, 20 * Math.log10(trackMixerSettings.volume)) // Clamp to -60dB minimum
                  }
                  player.volume.value = volumeDb
                  console.log(`[ARRANGEMENT AUDIO] Applied volume ${trackMixerSettings.volume} (${volumeDb.toFixed(2)}dB) to ${track.name}`)
                }
                
                // Apply pan
                if (trackMixerSettings.pan !== undefined && trackMixerSettings.pan !== 0) {
                  const panner = new Tone.Panner(trackMixerSettings.pan / 100)
                  pitchShifter.connect(panner)
                  console.log(`[ARRANGEMENT AUDIO] Applied pan ${trackMixerSettings.pan} to ${track.name}`)
                }
              }
              
              // Apply EQ settings if they exist
              if (trackMixerSettings?.eq && (trackMixerSettings.eq.low !== 0 || trackMixerSettings.eq.mid !== 0 || trackMixerSettings.eq.high !== 0)) {
                console.log(`[ARRANGEMENT AUDIO] Applying EQ settings to ${track.name}:`, trackMixerSettings.eq)
                
                // Create EQ chain
                const eqChain = []
                
                // Low band - Low Shelf Filter
                if (trackMixerSettings.eq.low !== 0) {
                  const lowShelf = new Tone.Filter({
                    type: 'lowshelf',
                    frequency: 200,
                    gain: trackMixerSettings.eq.low
                  })
                  eqChain.push(lowShelf)
                }
                
                // Mid band - Peaking Filter
                if (trackMixerSettings.eq.mid !== 0) {
                  const midPeak = new Tone.Filter({
                    type: 'peaking',
                    frequency: 1000,
                    Q: 1,
                    gain: trackMixerSettings.eq.mid
                  })
                  eqChain.push(midPeak)
                }
                
                // High band - High Shelf Filter
                if (trackMixerSettings.eq.high !== 0) {
                  const highShelf = new Tone.Filter({
                    type: 'highshelf',
                    frequency: 4000,
                    gain: trackMixerSettings.eq.high
                  })
                  eqChain.push(highShelf)
                }
                
                // Connect EQ chain in series
                if (eqChain.length > 0) {
                  let currentNode: any = pitchShifter
                  eqChain.forEach(node => {
                    currentNode.connect(node)
                    currentNode = node
                  })
                  currentNode.toDestination()
                  console.log(`[ARRANGEMENT AUDIO] Connected EQ chain with ${eqChain.length} nodes for ${track.name}`)
                } else {
                  pitchShifter.toDestination()
                }
              } else {
                // No EQ - connect directly to destination
                pitchShifter.toDestination()
              }
              
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
    onArrangementPlayStateChange?.(true) // Notify parent of play state change
    // Don't reset currentBar - preserve the playhead position
    arrangementStartTimeRef.current = Date.now()
    
    // Stop any currently playing arrangement and set transport to current playhead position
    if (arrangementTransportRef.current) {
      arrangementTransportRef.current.stop()
      arrangementTransportRef.current.cancel() // Cancel all scheduled events first
      
      // CRITICAL FIX: In export mode, always start from position 0 since patterns are scheduled relative to export start
      const startPosition = exportMarkersActive ? 0 : 0 // Always start from 0, patterns are scheduled relative to export start
      arrangementTransportRef.current.position = startPosition
    }
    
    // CRITICAL FIX: Don't interfere with global transport - let sequencer keep running
    // The arrangement transport is now properly isolated
    const globalTransport = Tone.getTransport()
    
    // Sort pattern blocks by start bar
    const sortedBlocks = [...patternBlocks].sort((a, b) => a.startBar - b.startBar)
    
    try {
      // Calculate total arrangement duration in bars based on actual pattern blocks
      const maxEndBar = Math.max(...sortedBlocks.map(block => block.endBar))
      const totalDurationBars = maxEndBar
      
      // Calculate seconds per bar
      const secondsPerBeat = 60 / bpm
      const beatsPerBar = 4
      const secondsPerBar = secondsPerBeat * beatsPerBar
      
      // Schedule each pattern to start at its calculated time, adjusted for current playhead position
      let scheduledCount = 0
      let failedCount = 0
      
      sortedBlocks.forEach((block, index) => {
        const track = block.tracks[0]
        const player = arrangementPlayersRef.current[track.id]
        
        // Get the sequencer data for this track to determine which steps should play
        const trackSequencerData = block.sequencerData[track.id] || []
        
        // DEBUG: Log the sequencer data to see what we're working with
        console.log(`[DEBUG] Pattern ${block.name} for track ${track.name}:`, {
          patternDuration: block.duration,
          patternSteps: block.steps,
          sequencerDataLength: trackSequencerData.length,
          sequencerData: trackSequencerData,
          filledSteps: trackSequencerData.filter(step => step).length,
          lastFilledStep: trackSequencerData.lastIndexOf(true)
        })
        
        // Calculate start time in seconds (convert from bar number)
        let startTimeInBars, startTimeInSeconds, durationInSeconds
        
        if (exportMarkersActive) {
          // CRITICAL: In export mode, schedule patterns relative to the export start marker
          // If pattern starts before export start, adjust it to start at export start
          const effectiveStartBar = Math.max(block.startBar, exportStartBar)
          const effectiveEndBar = Math.min(block.endBar, exportEndBar)
          
          if (effectiveStartBar > effectiveEndBar) {
            return
          }
          
          // Calculate timing relative to export start marker
          startTimeInBars = effectiveStartBar - exportStartBar // Relative to export start
          startTimeInSeconds = startTimeInBars * secondsPerBar
          durationInSeconds = (effectiveEndBar - effectiveStartBar + 1) * secondsPerBar
        } else {
          // Normal mode: use absolute bar positions
          startTimeInBars = block.startBar - 1 // Convert to 0-based (bar 1 = position 0)
          startTimeInSeconds = startTimeInBars * secondsPerBar
          durationInSeconds = block.duration * secondsPerBar
        }
        
        if (player && player.loaded) {
          try {
            // CRITICAL FIX: Make the audio player respect the full pattern duration
            // If the pattern is longer than the original audio, we need to loop it
            const originalAudioDuration = player.buffer.duration
            
            if (durationInSeconds <= originalAudioDuration) {
              // IMPROVED SYNC FIX: Quantize to 16th note subdivisions for tighter sync
              const beatsPerSecond = bpm / 60
              const sixteenthNotesPerSecond = beatsPerSecond * 4 // 4 sixteenth notes per beat
              
              // Quantize to nearest 16th note for ultra-tight sync
              const sixteenthNotePosition = Math.round(startTimeInSeconds * sixteenthNotesPerSecond)
              const quantizedStartTime = sixteenthNotePosition / sixteenthNotesPerSecond
              
              // For duration, use a smarter approach - align to musical boundaries
              const endTime = startTimeInSeconds + durationInSeconds
              const quantizedEndSixteenthNote = Math.round(endTime * sixteenthNotesPerSecond)
              const quantizedEndTime = quantizedEndSixteenthNote / sixteenthNotesPerSecond
              const quantizedDuration = quantizedEndTime - quantizedStartTime
              
              // Track timing precision with improved threshold
              const startTimeDrift = quantizedStartTime - startTimeInSeconds
              if (Math.abs(startTimeDrift) > 0.005) { // More sensitive threshold (5ms)
                console.warn(`[SYNC DEBUG] Single pattern start time drift for ${block.name}: expected ${startTimeInSeconds.toFixed(3)}s, quantized ${quantizedStartTime.toFixed(3)}s, drift: ${startTimeDrift.toFixed(3)}s`)
              }
              
              player.start(`+${quantizedStartTime}`, 0, quantizedDuration)
              console.log(`[ARRANGEMENT AUDIO] Pattern fits: ${block.name} at +${quantizedStartTime}s for ${quantizedDuration}s (quantized)`)
            } else {
              // ENHANCED SYNC FIX: Ultra-precise quantization for looped patterns
              const beatsPerSecond = bpm / 60
              const sixteenthNotesPerSecond = beatsPerSecond * 4 // 4 sixteenth notes per beat
              const secondsPerBeat = 60 / bpm
              const barDuration = secondsPerBeat * 4 // 4 beats per bar
              
              // Calculate how many times we need to loop
              const loopsNeeded = Math.ceil(durationInSeconds / originalAudioDuration)
              
              console.log(`[ENHANCED SYNC FIX] Pattern ${block.name} quantization:`, {
                originalDuration: durationInSeconds,
                audioDuration: originalAudioDuration,
                bpm,
                barDuration: barDuration.toFixed(3),
                sixteenthNotesPerSecond: sixteenthNotesPerSecond.toFixed(3),
                loopsNeeded
              })
              
              for (let loop = 0; loop < loopsNeeded; loop++) {
                // Enhanced quantization to 16th note subdivisions
                const rawLoopStartTime = startTimeInSeconds + (loop * originalAudioDuration)
                const sixteenthNotePosition = Math.round(rawLoopStartTime * sixteenthNotesPerSecond)
                const quantizedLoopStartTime = sixteenthNotePosition / sixteenthNotesPerSecond
                
                const rawLoopDuration = Math.min(originalAudioDuration, durationInSeconds - (rawLoopStartTime - startTimeInSeconds))
                
                // Quantize duration to ensure it ends on a musical boundary
                const rawEndTime = quantizedLoopStartTime + rawLoopDuration
                const endSixteenthNote = Math.round(rawEndTime * sixteenthNotesPerSecond)
                const quantizedEndTime = endSixteenthNote / sixteenthNotesPerSecond
                const quantizedLoopDuration = quantizedEndTime - quantizedLoopStartTime
                
                // Track timing precision with more sensitive threshold
                const startTimeDrift = quantizedLoopStartTime - rawLoopStartTime
                if (Math.abs(startTimeDrift) > 0.005) { // More sensitive threshold (5ms)
                  console.warn(`[SYNC DEBUG] Loop ${loop + 1} start time drift: expected ${rawLoopStartTime.toFixed(3)}s, quantized ${quantizedLoopStartTime.toFixed(3)}s, drift: ${startTimeDrift.toFixed(3)}s`)
                }
                
                if (quantizedLoopDuration > 0.001) { // Minimum viable duration check
                  player.start(`+${quantizedLoopStartTime}`, 0, quantizedLoopDuration)
                  console.log(`[ARRANGEMENT AUDIO] Loop ${loop + 1}: ${block.name} at +${quantizedLoopStartTime}s for ${quantizedLoopDuration}s (quantized)`)
                }
              }
            }
            
            scheduledCount++
          } catch (error) {
            console.error(`[ARRANGEMENT AUDIO] Error scheduling pattern ${block.name}:`, error)
            failedCount++
          }
        } else {
          console.warn(`[ARRANGEMENT AUDIO] No player available for track ${track.name}. Player:`, player)
          failedCount++
        }
      })
      
      // CRITICAL FIX: Start the transport with proper timing
      
      // CRITICAL: Check if we have any audio scheduled
      const scheduledPatterns = sortedBlocks.filter(block => {
        const track = block.tracks[0]
        const player = arrangementPlayersRef.current[track.id]
        return player && player.loaded
      })
      
      if (scheduledPatterns.length === 0) {
        console.error('[ARRANGEMENT AUDIO] No audio patterns scheduled! Transport cannot start.')
        return
      }
      
      // CRITICAL FIX: Set playing state to true so playhead can update
      isPlayingRef.current = true
      setIsArrangementPlaying(true)
      onArrangementPlayStateChange?.(true)
      

      
              // CRITICAL: Ensure transport is properly configured before starting
        
        // Force stop and reset transport to ensure clean state
        arrangementTransportRef.current.stop()
        arrangementTransportRef.current.cancel()
        arrangementTransportRef.current.position = 0
        arrangementTransportRef.current.bpm.value = bpm
        
        // Start the transport from position 0
        try {
          // CRITICAL: Use a more robust start method
          if (arrangementTransportRef.current.start) {
            arrangementTransportRef.current.start()
          } else {
            console.error('[ARRANGEMENT AUDIO] Transport start method not available!')
            return
          }
          
          // Wait a moment for the transport to actually start
          setTimeout(() => {
            if (arrangementTransportRef.current?.state !== 'started') {
              // Try alternative start method
              try {
                arrangementTransportRef.current?.start('+0')
              } catch (altError) {
                console.error('[ARRANGEMENT AUDIO] Alternative start method also failed:', altError)
              }
            }
          }, 100)
          
        } catch (error) {
          console.error('[ARRANGEMENT AUDIO] Error starting transport:', error)
        }
      
      // Update playhead every 16ms (60fps) for smooth movement
      progressIntervalRef.current = setInterval(() => {
        updatePlayhead()
      }, 16)
    } catch (error) {
      console.error('[ARRANGEMENT AUDIO] Error creating sequence:', error)
      setIsArrangementPlaying(false)
    }
  }

  // Stop the arrangement - AGGRESSIVE STOP to prevent any audio from continuing
  const stopArrangement = (): void => {
    // CRITICAL: If we're in export mode and the arrangement stops, we need to stop the MediaRecorder too
    if (exportMarkersActive && (window as any).mediaRecorderForExport) {
      if ((window as any).mediaRecorderForExport.state === 'recording') {
        (window as any).mediaRecorderForExport.stop()
      }
      // Clean up the global reference
      (window as any).mediaRecorderForExport = null
    }
    
    // Set state to stopped immediately
    setIsArrangementPlaying(false)
    isPlayingRef.current = false
    setCurrentPattern(null)
    onArrangementPlayStateChange?.(false)
    
          // CRITICAL: Stop ALL transports first (most important)
      try {
        // Stop arrangement transport
        if (arrangementTransportRef.current) {
          arrangementTransportRef.current.stop()
          arrangementTransportRef.current.cancel()
          arrangementTransportRef.current.position = 0 // Reset to beginning
        }
        
        // Stop global transport
        const globalTransport = Tone.getTransport()
        globalTransport.stop()
        globalTransport.cancel()
        globalTransport.position = 0
        globalTransport.loop = false
      } catch (error) {
        console.error('[STOP] Error stopping transports:', error)
      }
    
    // AGGRESSIVE: Stop ALL players immediately
          Object.entries(arrangementPlayersRef.current).forEach(([trackId, player]) => {
        if (player) {
          try {
            player.stop()
            player.stop() // Double stop to be sure
            
            // If still playing, dispose and recreate
            if (player.state === 'started') {
              player.dispose()
              delete arrangementPlayersRef.current[Number(trackId)]
            }
          } catch (error) {
            console.error(`[STOP] Error stopping player ${trackId}:`, error)
            // Force dispose as last resort
            try {
              player.dispose()
              delete arrangementPlayersRef.current[Number(trackId)]
            } catch (disposeError) {
              console.error(`[STOP] Error disposing player ${trackId}:`, disposeError)
            }
          }
        }
      })
    
    // Clear all intervals
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
    
    // Nuclear option: Clear ALL intervals on the page
    if (typeof window !== 'undefined') {
      const highestIntervalId = window.setInterval(() => {}, 0)
      for (let i = 1; i <= highestIntervalId; i++) {
        window.clearInterval(i)
      }
    }
    
    // Reset playhead to beginning
    setCurrentBarSafe(1)
    
    // Force audio context to stop if needed
    try {
      if (Tone.context.state === 'running') {
        // Audio context will be handled by transport stops
      }
    } catch (error) {
      console.error('[STOP] Error checking audio context:', error)
    }
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

  // Handle mouse move for dragging, resizing, and selection box
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isResizing) {
      handleResizeMove(e)
      return
    }
    
    // Handle selection box
    if (isSelectionBoxActive) {
      updateSelectionBox(e)
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

  // Handle mouse up to end dragging, resizing, and selection box
  const handleMouseUp = () => {
    if (isResizing) {
      handleResizeEnd()
      return
    }
    
    // Handle selection box end
    if (isSelectionBoxActive) {
      endSelectionBox()
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
    if (isDragging || isResizing || isSelectionBoxActive) {
      document.addEventListener('mousemove', handleMouseMove as any)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove as any)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, isResizing, isSelectionBoxActive])

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
      
      // S key to toggle selector mode
      if (event.code === 'KeyS') {
        event.preventDefault()
        event.stopPropagation()
        
        console.log('[SONG ARRANGEMENT] S key pressed - toggling selector mode')
        toggleSelectorMode()
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
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <CardTitle className="text-white text-lg">Song Arrangement</CardTitle>
            <div className="flex flex-wrap items-center gap-4">
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
                <span className="text-gray-300 text-sm">Master:</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={arrangementMasterVolume}
                  onChange={(e) => handleMasterVolumeChange(parseFloat(e.target.value))}
                  className="w-24 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
                <span className="text-gray-300 text-xs">{Math.round(arrangementMasterVolume * 100)}%</span>
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
          <div className="flex flex-col gap-4">
            {/* Main controls row */}
            <div className="flex flex-wrap items-center gap-4">
            <Button
              onClick={() => {
                console.log('=== PLAY BUTTON CLICKED ===')
                console.log('Button clicked at:', new Date().toISOString())
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
                  console.log('Stopping arrangement...')
                  stopArrangement()
                } else {
                  console.log('Starting arrangement...')
                  playArrangement()
                }
              }}
              variant={isArrangementPlaying ? "destructive" : patternBlocks.length === 0 ? "outline" : "default"}
              size="lg"
              className={`w-16 h-16 rounded-full ${patternBlocks.length === 0 ? 'border-gray-500 text-gray-500' : ''}`}
              disabled={patternBlocks.length === 0}
              title={patternBlocks.length === 0 ? "No patterns loaded - load patterns manually first" : isArrangementPlaying ? "Stop arrangement" : "Play arrangement"}
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
            
            {/* Button to create patterns from current sequencer data */}
            <Button
              onClick={createPatternsFromSequencer}
              variant="outline"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
              title="Create patterns from current sequencer data"
            >
              <Music className="w-4 h-4 mr-2" />
              From Sequencer
            </Button>
            
            {/* Button to clear all patterns */}
            <Button
              onClick={() => {
                setPatternBlocks([])
                onPatternsChange?.([])
                console.log('[CLEAR] All patterns cleared from timeline')
              }}
              variant="outline"
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white border-red-600"
              title="Clear all patterns from timeline"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
            
            {/* Button to reset everything */}
            <Button
              onClick={() => {
                setPatternBlocks([])
                onPatternsChange?.([])
                setCurrentBarSafe(1)
                setTotalBars(64)
                console.log('[RESET] Song arrangement completely reset')
              }}
              variant="outline"
              size="sm"
              className="bg-orange-600 hover:bg-orange-700 text-white border-orange-600"
              title="Reset song arrangement to initial state"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <div className="text-gray-300 text-sm">
              {isArrangementPlaying 
                ? `Playing: Bar ${Math.floor(currentBar)}.${Math.floor((currentBar % 1) * 4)}` 
                : patternBlocks.length === 0 
                  ? 'No patterns loaded - load patterns manually' 
                  : 'Ready to play'
              }
            </div>
            {patternBlocks.length === 0 && (
              <Badge variant="outline" className="text-xs bg-gray-600 text-white border-gray-500">
                <Library className="w-3 h-3 mr-1" />
                No Patterns - Load Manually
              </Badge>
            )}


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
              onClick={toggleSelectorMode}
              variant={isSelectorMode ? "destructive" : "outline"}
              size="sm"
              className={`text-xs ${isSelectorMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
              title={isSelectorMode ? "Click to disable selector mode" : "Click to enable selector mode - then click on patterns to select them"}
            >
              <MousePointer className="w-4 h-4 mr-1" />
              {isSelectorMode ? 'Selector ON' : 'Select'}
            </Button>
            {selectedBlocks.length > 0 && (
              <div className="flex items-center gap-2 ml-2">
                <Badge variant="outline" className="text-xs bg-blue-600 text-white border-blue-500">
                  {selectedBlocks.length} Selected
                </Badge>
                <Button
                  onClick={deleteSelectedPatterns}
                  variant="outline"
                  size="sm"
                  className="text-xs bg-red-600 hover:bg-red-700 text-white border-red-500"
                  title="Delete selected patterns"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete
                </Button>
                <Button
                  onClick={duplicateSelectedPatterns}
                  variant="outline"
                  size="sm"
                  className="text-xs bg-green-600 hover:bg-green-700 text-white border-green-500"
                  title="Duplicate selected patterns"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Duplicate
                </Button>
                <Button
                  onClick={clearAllSelections}
                  variant="outline"
                  size="sm"
                  className="text-xs bg-gray-600 hover:bg-gray-700 text-white border-gray-500"
                  title="Clear all selections"
                >
                  Clear
                </Button>
              </div>
            )}
            <Button
              onClick={() => {
                loadElevenPatternsFromEachTrack()
              }}
              variant="outline"
              size="sm"
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white border-blue-500"
              title="Load 11 patterns from each track (manual action)"
            >
              <Plus className="w-4 h-4 mr-1" />
              Load 11 Patterns
            </Button>
            <Button
              onClick={arrangeSong}
              variant="outline"
              size="sm"
              className="text-xs bg-purple-600 hover:bg-purple-700 text-white border-purple-500"
              title="Arrange song with drops (prevents patterns from getting shorter)"
            >
              <Music className="w-4 h-4 mr-1" />
              Arrange Song
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
                setCustomBarsInput(totalBars.toString())
                setShowSetBarsDialog(true)
              }}
              variant="outline"
              size="sm"
              className="text-xs bg-purple-600 hover:bg-purple-700 text-white border-purple-500"
              title="Set custom number of bars for the timeline"
            >
              <BarChart3 className="w-4 h-4 mr-1" />
              Set Bars
            </Button>
            <Button
              onClick={handleShuffleToggle}
              variant="outline"
              size="sm"
              className={`text-xs ${
                shuffleMode === 'A' 
                  ? 'bg-black text-yellow-400 hover:text-yellow-300 hover:bg-gray-900 border-gray-600' 
                  : 'bg-purple-600 text-white hover:bg-purple-700 border-purple-500'
              }`}
              title={shuffleMode === 'A' 
                ? "Mode A: Create dynamic arrangement with drops by splitting patterns (Click to switch to Mode B)" 
                : "Mode B: Shuffle through saved arrangements (Click to switch to Mode A)"
              }
            >
              <Brain className="w-4 h-4 mr-1" />
              {shuffleMode === 'A' ? 'A: Drops' : 'B: Shuffle'}
            </Button>
            <div className="flex gap-2">
            <Button
              onClick={() => {
                downloadBeatAsWav()
              }}
              variant="outline"
              size="sm"
              className="text-xs bg-green-600 hover:bg-green-700 text-white border-green-500"
                title="Export the arrangement as a high-quality WAV file (offline rendering)"
            >
              <Download className="w-4 h-4 mr-1" />
                Export (Offline)
            </Button>
                              <Button
                  onClick={() => {
                    if (!exportMarkersActive) {
                      console.log('[EXPORT LIVE] First click - setting markers')
                      setExportMarkers()
                    } else {
                      console.log('[EXPORT LIVE] Second click - starting live export')
                      exportBeatAsWavLive()
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className={`text-xs ${exportMarkersActive ? 'bg-red-600 hover:bg-red-700 border-red-500' : 'bg-purple-600 hover:bg-purple-700 border-purple-500'} text-white`}
                  title={exportMarkersActive ? "Export markers are set! Click to start recording." : "Click to set export markers, then click again to start recording"}
                >
                  <Download className="w-4 h-4 mr-1" />
                  {exportMarkersActive ? 'Export (Live) - READY' : 'Export (Live) - SET MARKERS'}
                </Button>
                {/* Manual Stop Button - Only show when recording */}
                {isExportLiveRecording && (
                  <Button
                    onClick={stopExportLive}
                    variant="outline"
                    size="sm"
                    className="text-xs bg-orange-600 hover:bg-orange-700 text-white border-orange-500 animate-pulse"
                    title="Manually stop the live export recording"
                  >
                    <Square className="w-4 h-4 mr-1" />
                    STOP EXPORT
                  </Button>
                )}
            </div>
            <Button
              onClick={exportToLoopEditor}
              disabled={patternBlocks.length === 0}
              variant="outline"
              size="sm"
              className="text-xs bg-teal-600 hover:bg-teal-700 text-white border-teal-500"
              title="Export arrangement to loop editor for further editing"
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Export to Loop Editor
            </Button>
            {/* Debug button - remove in production */}
            <Button
              onClick={() => {
                console.log('[DEBUG] Testing navigation to loop editor')
                window.location.href = '/loop-editor?session=test-session-id'
              }}
              variant="outline"
              size="sm"
              className="text-xs bg-gray-600 hover:bg-gray-700 text-white border-gray-500"
              title="Debug: Test navigation to loop editor"
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Debug: Test Nav
            </Button>
            <Button
              onClick={openSaveBeatDialog}
              variant="outline"
              size="sm"
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white border-blue-500"
              title="Save beat to your library"
            >
              <Save className="w-4 h-4 mr-1" />
              Save Beat
            </Button>
            <Button
              onClick={openSaveToLibraryDialog}
              disabled={patternBlocks.length === 0}
              variant="outline"
              size="sm"
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-500"
              title="Save arrangement as WAV to your library"
            >
              <Library className="w-4 h-4 mr-1" />
              Save to Library
            </Button>

            {isArrangementPlaying && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-red-400 text-xs font-mono">
                  Bar {Math.floor(currentBar)}.{Math.floor((currentBar % 1) * 4)} / {totalBars}
                </span>
              </div>
            )}
            {isExportLiveRecording && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                <span className="text-orange-400 text-xs font-mono">
                  EXPORT RECORDING - Click STOP EXPORT to end
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
            {isSelectorMode && (
              <div className="flex items-center gap-2 ml-4">
                <Badge variant="outline" className="text-xs bg-blue-600 text-white border-blue-500">
                  <MousePointer className="w-3 h-3 mr-1" />
                  Selector Mode Active
                </Badge>
                <span className="text-blue-400 text-sm">
                  Click on patterns to select them • {selectedBlocks.length} selected
                </span>
              </div>
            )}
            </div>
            
            {/* Status messages row */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
              <span>Press SPACEBAR to play/stop • Press DELETE to toggle delete mode • Press C to toggle cut mode • Press S to toggle selector mode</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DAW-Style Arrangement Grid */}
      <Card className="!bg-[#141414] border-gray-700">
        <CardContent className="p-0">
          <div className="relative">
            {/* Track names - Fixed outside the grid */}
            <div className="absolute left-0 top-0 w-40 sm:w-48 h-full bg-[#1a1a1a] border-r border-gray-600 z-30" style={{ marginTop: '60px' }}>
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
                  <div className="flex items-center gap-1">
                    {/* Volume Slider */}
                    <div className="flex flex-col items-center gap-1">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={trackVolumes[track.id] || 1}
                        onChange={(e) => handleTrackVolumeChange(track.id, parseFloat(e.target.value))}
                        className="w-12 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                        title={`Volume: ${Math.round((trackVolumes[track.id] || 1) * 100)}%`}
                      />
                      <span className="text-xs text-gray-400">
                        {Math.round((trackVolumes[track.id] || 1) * 100)}%
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-5 h-5 sm:w-6 sm:h-6 p-0 text-xs bg-blue-600 hover:bg-blue-700 text-white border-blue-500"
                      onClick={() => openSaveDialog(track)}
                      title="Save arrangement for this track"
                    >
                      <Save className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-5 h-5 sm:w-6 sm:h-6 p-0 text-xs bg-purple-600 hover:bg-purple-700 text-white border-purple-500"
                      onClick={() => openLoadDialog(track)}
                      title="Load arrangement for this track"
                    >
                      <FolderOpen className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant={loadedTrackId === track.id ? "default" : "outline"}
                      className={`w-5 h-5 sm:w-6 sm:h-6 p-0 text-xs ${
                        loadedTrackId === track.id 
                          ? 'bg-green-600 hover:bg-green-700 text-white' 
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      }`}
                      onClick={() => toggleLoadMode(track.id)}
                      title={loadedTrackId === track.id ? "Click to turn off load mode" : "Click to load pattern for placement"}
                    >
                      {loadedTrackId === track.id ? <Loader2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 animate-spin" /> : "L"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-5 h-5 sm:w-6 sm:h-6 p-0 text-xs bg-purple-600 hover:bg-purple-700 text-white border-purple-500"
                      onClick={() => shuffleTrackPatterns(track.id)}
                      title={`Execute A mode (drops) for ${getTrackDisplayName(track.name)}`}
                    >
                      <span className="text-xs font-bold">A</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-5 h-5 sm:w-6 sm:h-6 p-0 text-xs bg-purple-600 hover:bg-purple-700 text-white border-purple-500"
                      onClick={() => shuffleTrackSavedArrangements(track.id)}
                      title={`Execute B mode (saved arrangements) for ${getTrackDisplayName(track.name)}`}
                    >
                      <span className="text-xs font-bold">B</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-5 h-5 sm:w-6 sm:h-6 p-0 text-xs bg-orange-600 hover:bg-orange-700 text-white border-orange-500"
                      onClick={() => openFillTrackDialog(track)}
                      title={`Fill track with patterns for ${getTrackDisplayName(track.name)}`}
                    >
                      <span className="text-xs font-bold">F</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Main scrollable container that includes both header and grid */}
            <div 
              ref={gridRef}
              className="relative overflow-auto ml-40 sm:ml-48"
              style={{ height: '460px' }}
              onScroll={(e) => setScrollX(e.currentTarget.scrollLeft)}
              onClick={handleGridClick}
              onMouseDown={handleGridMouseDown}
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

                {/* Export Start Marker */}
                <div 
                  className="absolute top-0 bottom-0 w-2 bg-green-500 z-25 shadow-lg"
                  style={{
                    left: `${Math.max(0, (exportStartBar - 1) * zoom)}px`,
                    boxShadow: '0 0 10px rgba(34, 197, 94, 0.8)'
                  }}
                >
                  {/* Start marker arrow */}
                  <div className="absolute -top-2 -left-2 w-0 h-0 border-l-6 border-r-6 border-b-6 border-transparent border-b-green-500"></div>
                  {/* Label */}
                  <div className="absolute -top-8 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    EXPORT START: Bar {exportStartBar}
                  </div>
                </div>

                {/* Export End Marker */}
                <div 
                  className="absolute top-0 bottom-0 w-2 bg-blue-500 z-25 shadow-lg"
                  style={{
                    left: `${Math.max(0, (exportEndBar - 1) * zoom)}px`,
                    boxShadow: '0 0 10px rgba(59, 130, 246, 0.8)'
                  }}
                >
                  {/* End marker arrow */}
                  <div className="absolute -top-2 -left-2 w-0 h-0 border-l-6 border-r-6 border-b-6 border-transparent border-b-blue-500"></div>
                  {/* Label */}
                  <div className="absolute -top-8 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    EXPORT END: Bar {exportEndBar}
                  </div>
                </div>
                

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

                {/* Export Start Marker on Grid */}
                <div 
                  className="absolute top-0 bottom-0 w-3 bg-green-500 z-15 shadow-lg"
                  style={{
                    left: `${Math.max(0, (exportStartBar - 1) * zoom)}px`,
                    boxShadow: '0 0 15px rgba(34, 197, 94, 0.9)'
                  }}
                >
                  {/* Start marker arrow */}
                  <div className="absolute -top-3 -left-3 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-green-500"></div>
                </div>

                {/* Export End Marker on Grid */}
                <div 
                  className="absolute top-0 bottom-0 w-3 bg-blue-500 z-15 shadow-lg"
                  style={{
                    left: `${Math.max(0, (exportEndBar - 1) * zoom)}px`,
                    boxShadow: '0 0 15px rgba(59, 130, 246, 0.9)'
                  }}
                >
                  {/* End marker arrow */}
                  <div className="absolute -top-3 -left-3 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-blue-500"></div>
                </div>
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
                        data-pattern-block="true"
                        className={`absolute select-none ${
                          isSelectorMode
                            ? 'cursor-pointer'
                            : isDeleteMode 
                            ? 'cursor-crosshair' 
                            : isCutMode
                            ? 'cursor-pointer'
                            : 'cursor-move'
                        } ${
                          selectedBlocks.includes(block.id) 
                            ? 'ring-2 ring-blue-500 ring-opacity-50' 
                            : isPatternInSelectionBox(block)
                            ? 'ring-2 ring-blue-400 ring-opacity-30'
                            : ''
                        } ${
                          isSelectorMode
                            ? 'hover:ring-2 hover:ring-blue-500 hover:ring-opacity-70'
                            : isDeleteMode 
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
                          if (isSelectorMode || isDeleteMode || isCutMode) {
                            e.preventDefault()
                            e.stopPropagation()
                            handlePatternBlockClick(block.id)
                          } else {
                            handleBlockMouseDown(e, block.id)
                          }
                        }}
                        title={
                          isSelectorMode
                            ? `Click to ${selectedBlocks.includes(block.id) ? 'deselect' : 'select'} ${block.name}`
                            : isDeleteMode 
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

                    </React.Fragment>
                  )
                })}

                {/* Selection Box Overlay */}
                {isSelectionBoxActive && (
                  <div
                    className="absolute pointer-events-none z-20"
                    style={{
                      left: Math.min(selectionBoxStart.x, selectionBoxEnd.x),
                      top: Math.min(selectionBoxStart.y, selectionBoxEnd.y),
                      width: Math.abs(selectionBoxEnd.x - selectionBoxStart.x),
                      height: Math.abs(selectionBoxEnd.y - selectionBoxStart.y),
                      border: '2px dashed #3b82f6',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      borderRadius: '4px'
                    }}
                  />
                )}

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

      {/* Save Arrangement Dialog */}
      {showSaveDialog && currentTrackForArrangement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#141414] border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-lg font-semibold flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                Save Arrangement: {getTrackDisplayName(currentTrackForArrangement.name)}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSaveDialog(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-2">Name</label>
                <Input
                  value={arrangementName}
                  onChange={(e) => setArrangementName(e.target.value)}
                  placeholder="Enter arrangement name"
                  className="bg-[#1a1a1a] border-gray-600 text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-yellow-500"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm mb-2">Description (optional)</label>
                <Input
                  value={arrangementDescription}
                  onChange={(e) => setArrangementDescription(e.target.value)}
                  placeholder="Describe this arrangement"
                  className="bg-[#1a1a1a] border-gray-600 text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-yellow-500"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm mb-2">Category (optional)</label>
                <Select value={arrangementCategory} onValueChange={setArrangementCategory}>
                  <SelectTrigger className="bg-[#1a1a1a] border-gray-600 text-white focus:border-yellow-500 focus:ring-yellow-500">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-gray-600">
                    <SelectItem value="none" className="text-white hover:bg-gray-700">No category</SelectItem>
                    <SelectItem value="intro" className="text-white hover:bg-gray-700">Intro</SelectItem>
                    <SelectItem value="verse" className="text-white hover:bg-gray-700">Verse</SelectItem>
                    <SelectItem value="chorus" className="text-white hover:bg-gray-700">Chorus</SelectItem>
                    <SelectItem value="bridge" className="text-white hover:bg-gray-700">Bridge</SelectItem>
                    <SelectItem value="drop" className="text-white hover:bg-gray-700">Drop</SelectItem>
                    <SelectItem value="breakdown" className="text-white hover:bg-gray-700">Breakdown</SelectItem>
                    <SelectItem value="outro" className="text-white hover:bg-gray-700">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm mb-2">Tags (optional)</label>
                <Input
                  value={arrangementTags}
                  onChange={(e) => setArrangementTags(e.target.value)}
                  placeholder="drops, energy, verse (comma separated)"
                  className="bg-[#1a1a1a] border-gray-600 text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-yellow-500"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm mb-2">Genre (optional)</label>
                <Input
                  value={arrangementGenre}
                  onChange={(e) => setArrangementGenre(e.target.value)}
                  placeholder="Hip Hop, Trap, R&B, etc."
                  className="bg-[#1a1a1a] border-gray-600 text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-yellow-500"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm mb-2">Subgenre (optional)</label>
                <Input
                  value={arrangementSubgenre}
                  onChange={(e) => setArrangementSubgenre(e.target.value)}
                  placeholder="Boom Bap, Drill, Neo Soul, etc."
                  className="bg-[#1a1a1a] border-gray-600 text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-yellow-500"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm mb-2">BPM</label>
                <Input
                  type="number"
                  value={arrangementBpm}
                  onChange={(e) => setArrangementBpm(e.target.value)}
                  placeholder="140"
                  className="bg-[#1a1a1a] border-gray-600 text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-yellow-500"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm mb-2">Audio Type</label>
                <Input
                  value={arrangementAudioType}
                  onChange={(e) => setArrangementAudioType(e.target.value)}
                  placeholder="Melody Loop, Drum Loop, etc."
                  className="bg-[#1a1a1a] border-gray-600 text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-yellow-500"
                />
              </div>
              
              <div className="flex items-center gap-4 pt-4">
                <Button
                  onClick={saveArrangement}
                  disabled={isSaving || !arrangementName.trim()}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-medium"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  {isSaving ? 'Saving...' : 'Save Arrangement'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowSaveDialog(false)}
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Load Arrangement Dialog */}
      {showLoadDialog && currentTrackForArrangement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-600 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-lg font-semibold">
                Load Arrangement: {getTrackDisplayName(currentTrackForArrangement.name)}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLoadDialog(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </Button>
            </div>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <span className="text-gray-300 ml-2">Loading arrangements...</span>
              </div>
            ) : availableArrangements.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">No arrangements found for this track.</p>
                <p className="text-gray-500 text-sm mt-2">Save some arrangements first to see them here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableArrangements.map((arrangement) => (
                  <div
                    key={arrangement.arrangementId}
                    className="bg-gray-800 border border-gray-600 rounded-lg p-4 hover:bg-gray-700 transition-colors cursor-pointer"
                    onClick={() => loadArrangement(arrangement.arrangementId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="text-white font-medium">{arrangement.arrangementName}</h4>
                        <p className="text-gray-400 text-sm">
                          {arrangement.category && (
                            <span className="inline-block bg-blue-600 text-white text-xs px-2 py-1 rounded mr-2">
                              {arrangement.category}
                            </span>
                          )}
                          {arrangement.totalBars} bars • {arrangement.patternCount} patterns
                        </p>
                        <p className="text-gray-500 text-xs mt-1">
                          Created: {new Date(arrangement.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="ml-4"
                        onClick={(e) => {
                          e.stopPropagation()
                          loadArrangement(arrangement.arrangementId)
                        }}
                      >
                        <FolderOpen className="w-4 h-4 mr-2" />
                        Load
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setShowLoadDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Save Beat Dialog */}
      {showSaveBeatDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-600 rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-lg font-semibold">Save Beat</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSaveBeatDialog(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Title *</label>
                <Input
                  value={beatTitle}
                  onChange={(e) => setBeatTitle(e.target.value)}
                  placeholder="Enter beat title"
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  value={beatDescription}
                  onChange={(e) => setBeatDescription(e.target.value)}
                  placeholder="Describe your beat"
                  className="w-full p-2 border border-gray-600 rounded-md bg-gray-800 text-white resize-none"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Genre</label>
                  <Input
                    value={beatGenre}
                    onChange={(e) => setBeatGenre(e.target.value)}
                    placeholder="Hip Hop, Trap, etc."
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">BPM</label>
                  <Input
                    type="number"
                    value={beatBpm}
                    onChange={(e) => setBeatBpm(e.target.value)}
                    placeholder="140"
                    className="w-full"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Key</label>
                  <Input
                    value={beatKey}
                    onChange={(e) => setBeatKey(e.target.value)}
                    placeholder="C, F#, etc."
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Price ($)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={beatPrice}
                    onChange={(e) => setBeatPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Cover Image</label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setBeatCoverImage(file)
                      const reader = new FileReader()
                      reader.onload = (e) => setBeatCoverPreview(e.target?.result as string)
                      reader.readAsDataURL(file)
                    }
                  }}
                  className="w-full"
                />
                {beatCoverPreview && (
                  <img 
                    src={beatCoverPreview} 
                    alt="Cover preview" 
                    className="w-24 h-24 object-cover rounded mt-2" 
                  />
                )}
              </div>
              
              {beatUploadError && (
                <div className="text-red-400 text-sm bg-red-900/20 border border-red-600 rounded p-2">
                  {beatUploadError}
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={saveBeat}
                  disabled={isSavingBeat || !beatTitle.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isSavingBeat ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  {isSavingBeat ? 'Saving...' : 'Save Beat'}
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    console.log('[AUTH DEBUG] Checking authentication status...')
                    
                    // Try to get session
                    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
                    console.log('[AUTH DEBUG] Session result:', { session: !!session, error: sessionError })
                    
                    // Try to get user
                    const { data: { user }, error: userError } = await supabase.auth.getUser()
                    console.log('[AUTH DEBUG] User result:', { user: !!user, error: userError })
                    
                    // Try to get user profile from database
                    if (user) {
                      const { data: profile, error: profileError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', user.id)
                        .single()
                      console.log('[AUTH DEBUG] Profile result:', { profile: !!profile, error: profileError })
                    }
                    
                    // Check localStorage for auth tokens
                    const authToken = localStorage.getItem('beatheos-auth-token')
                    console.log('[AUTH DEBUG] LocalStorage token:', !!authToken)
                    
                    alert(`Auth Status:\nSession: ${!!session}\nUser: ${!!user}\nAccess Token: ${!!session?.access_token}\nLocalStorage Token: ${!!authToken}`)
                  }}
                  className="text-xs"
                >
                  Check Auth
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    console.log('[AUTH DEBUG] Attempting to refresh authentication...')
                    
                    try {
                      // Try to refresh the session
                      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
                      console.log('[AUTH DEBUG] Refresh result:', { session: !!refreshData.session, error: refreshError })
                      
                      if (refreshData.session) {
                        alert('Authentication refreshed successfully! Try saving again.')
                      } else {
                        alert('Failed to refresh authentication. Please log out and log back in.')
                      }
                    } catch (error) {
                      console.error('[AUTH DEBUG] Refresh error:', error)
                      alert('Error refreshing authentication. Please log out and log back in.')
                    }
                  }}
                  className="text-xs"
                >
                  Refresh Auth
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowSaveBeatDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* No Patterns Modal */}
      <Dialog open={showNoPatternsModal} onOpenChange={setShowNoPatternsModal}>
        <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white max-w-md">
          <DialogHeader className="text-center">
            <DialogTitle className="text-xl font-bold text-white">
              No Patterns Available
            </DialogTitle>
            <DialogDescription className="text-gray-400 mt-2">
              No patterns to play. Please add some patterns first.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-center">
            <Button 
              onClick={() => setShowNoPatternsModal(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Save to Library Dialog */}
      <Dialog open={showSaveToLibraryDialog} onOpenChange={setShowSaveToLibraryDialog}>
        <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white max-w-4xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-xl font-bold text-white">
              {isExportLiveMode ? 'Export Live to Library' : 'Save Arrangement to Library'}
            </DialogTitle>
            <DialogDescription className="text-gray-400 mt-2">
              {isExportLiveMode 
                ? 'Record your arrangement live and save the audio to your library'
                : 'Choose where you want to save your beat arrangement'
              }
            </DialogDescription>
            
            {/* Export Mode Toggle */}
            <div className="flex items-center gap-3 mt-4">
              <Button
                variant={!isExportLiveMode ? 'default' : 'outline'}
                onClick={() => {
                  setIsExportLiveMode(false)
                  setLibrarySaveError(null) // Clear any export errors when switching modes
                }}
                className={`text-sm ${!isExportLiveMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-800 hover:bg-gray-700'}`}
                size="sm"
              >
                <Save className="w-4 h-4 mr-1" />
                Save Arrangement
              </Button>
              <Button
                variant={isExportLiveMode ? 'default' : 'outline'}
                onClick={() => {
                  setIsExportLiveMode(true)
                  setLibrarySaveError(null) // Clear any save errors when switching modes
                }}
                className={`text-sm ${isExportLiveMode ? 'bg-teal-600 hover:bg-teal-700' : 'bg-gray-800 hover:bg-gray-700'}`}
                size="sm"
              >
                <Music className="w-4 h-4 mr-1" />
                Export Live
              </Button>
            </div>
            
            {/* Export Live Info */}
            {isExportLiveMode && (
              <div className="p-3 bg-teal-900/20 border border-teal-600/30 rounded-lg mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <Music className="w-4 h-4 text-teal-400" />
                  <span className="text-teal-300 font-semibold text-sm">Live Export Benefits</span>
                </div>
                <div className="text-xs text-teal-200 space-y-1">
                  <div>• Perfect timing preservation with real-time recording</div>
                  <div>• All mixer settings and effects included</div>
                  <div>• High-quality audio output</div>
                </div>
              </div>
            )}
          </DialogHeader>
          
          <div className="space-y-6 overflow-y-auto flex-1 pr-2 pb-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
            {/* Type Selection */}
            <div className="space-y-3">
              <Label className="text-white">Save to:</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Button
                  variant={saveToLibraryType === 'album' ? 'default' : 'outline'}
                  onClick={() => handleTypeChange('album')}
                  className={`text-sm ${saveToLibraryType === 'album' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-800 hover:bg-gray-700'}`}
                >
                  Albums
                </Button>
                <Button
                  variant={saveToLibraryType === 'single' ? 'default' : 'outline'}
                  onClick={() => handleTypeChange('single')}
                  className={`text-sm ${saveToLibraryType === 'single' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-800 hover:bg-gray-700'}`}
                >
                  Singles
                </Button>
                <Button
                  variant={saveToLibraryType === 'track' ? 'default' : 'outline'}
                  onClick={() => handleTypeChange('track')}
                  className={`text-sm ${saveToLibraryType === 'track' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-800 hover:bg-gray-700'}`}
                >
                  Tracks
                </Button>
                <Button
                  variant={saveToLibraryType === 'audio-library' ? 'default' : 'outline'}
                  onClick={() => handleTypeChange('audio-library')}
                  className={`text-sm ${saveToLibraryType === 'audio-library' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-800 hover:bg-gray-700'}`}
                >
                  Audio Library
                </Button>
              </div>
            </div>

            {/* Create New or Select Existing */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  variant={createNew ? 'default' : 'outline'}
                  onClick={() => {
                    setCreateNew(true)
                    setSelectedItemId('')
                    setSelectedAlbumDetails(null)
                  }}
                  className={`text-sm ${createNew ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-800 hover:bg-gray-700'}`}
                >
                  Create New
                </Button>
                <Button
                  type="button"
                  variant={!createNew ? 'default' : 'outline'}
                  onClick={() => {
                    setCreateNew(false)
                    setSelectedItemId('')
                    setSelectedAlbumDetails(null)
                  }}
                  className={`text-sm ${!createNew ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-800 hover:bg-gray-700'}`}
                >
                  Add to Existing
                </Button>
              </div>
            </div>

            {/* Create New Form */}
            {createNew && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="newTitle" className="text-white">Title</Label>
                  <Input
                    id="newTitle"
                    value={newItemTitle}
                    onChange={(e) => setNewItemTitle(e.target.value)}
                    placeholder={`Enter ${saveToLibraryType === 'album' ? 'album' : saveToLibraryType === 'single' ? 'single' : 'audio'} title`}
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
                {saveToLibraryType === 'album' && (
                  <>
                    <div>
                      <Label className="text-white">Artist(s) *</Label>
                      <div className="space-y-2">
                        {/* Artist input */}
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Input
                            value={newArtistInput}
                            onChange={(e) => setNewArtistInput(e.target.value)}
                            onKeyDown={handleArtistInputKeyDown}
                            placeholder="Enter artist name and press Enter or click +"
                            className="bg-gray-800 border-gray-600 text-white flex-1"
                          />
                          <Button
                            type="button"
                            onClick={addArtist}
                            disabled={!newArtistInput.trim() || albumArtists.includes(newArtistInput.trim())}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3"
                            size="sm"
                          >
                            +
                          </Button>
                        </div>
                        
                        {/* Artist tags */}
                        {albumArtists.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {albumArtists.map((artist, index) => (
                              <div
                                key={index}
                                className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2"
                              >
                                <span>{artist}</span>
                                <button
                                  type="button"
                                  onClick={() => removeArtist(artist)}
                                  className="text-white hover:text-red-200 text-xs"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="newTrackTitle" className="text-white">Track Title *</Label>
                      <Input
                        id="newTrackTitle"
                        value={newTrackTitle}
                        onChange={(e) => setNewTrackTitle(e.target.value)}
                        placeholder="Enter track title"
                        className="bg-gray-800 border-gray-600 text-white"
                        required
                      />
                    </div>
                  </>
                )}
                <div>
                  <Label htmlFor="newDescription" className="text-white">Description (Optional)</Label>
                  <Textarea
                    id="newDescription"
                    value={newItemDescription}
                    onChange={(e) => setNewItemDescription(e.target.value)}
                    placeholder="Enter description..."
                    className="bg-gray-800 border-gray-600 text-white"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Select Existing */}
            {!createNew && existingItems.length > 0 && (
              <div className="space-y-3">
                <Label className="text-white">Select Existing {saveToLibraryType === 'album' ? 'Album' : saveToLibraryType === 'single' ? 'Single' : 'Audio Item'}:</Label>
                <Select value={selectedItemId} onValueChange={handleAlbumSelection}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue placeholder="Choose an item..." />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {existingItems.map((item) => (
                      <SelectItem key={item.id} value={item.id} className="text-white hover:bg-gray-700">
                        {item.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Show selected album details */}
                {saveToLibraryType === 'album' && selectedAlbumDetails && (
                  <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
                    <div className="flex items-start gap-4">
                      {/* Album cover - clickable */}
                      <Link 
                        href={`/myalbums/${selectedAlbumDetails.id}`}
                        className="w-16 h-16 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0 hover:opacity-80 transition-opacity cursor-pointer"
                        target="_blank"
                        title="View album details"
                      >
                        {selectedAlbumDetails.cover_art_url ? (
                          <img 
                            src={selectedAlbumDetails.cover_art_url} 
                            alt={selectedAlbumDetails.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-600 flex items-center justify-center">
                            <Music className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </Link>
                      
                      {/* Album info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold text-lg truncate">
                          {selectedAlbumDetails.title}
                        </h3>
                        <p className="text-gray-400 text-sm truncate">
                          {selectedAlbumDetails.artist}
                        </p>
                        {selectedAlbumDetails.description && (
                          <p className="text-gray-500 text-xs mt-1 line-clamp-2">
                            {selectedAlbumDetails.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {saveToLibraryType === 'album' && selectedItemId && (
                  <>
                    <div>
                      <Label htmlFor="existingTrackTitle" className="text-white">Track Title</Label>
                      <Input
                        id="existingTrackTitle"
                        value={newTrackTitle}
                        onChange={(e) => setNewTrackTitle(e.target.value)}
                        placeholder="Enter track title"
                        className="bg-gray-800 border-gray-600 text-white"
                      />
                    </div>
                    
                    {/* Track Position Selection */}
                    {showTrackSelection && existingAlbumTracks.length > 0 && (
                      <div className="space-y-3">
                        <Label className="text-white">Track Position</Label>
                        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-700">
                          <div className="space-y-2">
                            {/* Option to add at the beginning */}
                            <div className="flex items-center gap-3 p-2 rounded hover:bg-gray-700 cursor-pointer">
                              <input
                                type="radio"
                                id="position-0"
                                name="trackPosition"
                                value="0"
                                checked={selectedTrackPosition === 0}
                                onChange={(e) => setSelectedTrackPosition(0)}
                                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
                              />
                              <Label htmlFor="position-0" className="text-white cursor-pointer flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">1</span>
                                  <span className="text-gray-300">Add at the beginning</span>
                                </div>
                              </Label>
                            </div>
                            
                            {/* Existing tracks with insert positions */}
                            {existingAlbumTracks.map((track, index) => (
                              <div key={track.id} className="space-y-1">
                                {/* Existing track */}
                                <div className="flex items-center gap-3 p-2 rounded bg-gray-700/50">
                                  <span className="bg-gray-600 text-white px-2 py-1 rounded text-xs font-medium">
                                    {track.track_order}
                                  </span>
                                  <div className="flex-1">
                                    <div className="text-white text-sm font-medium">{track.title}</div>
                                    <div className="text-gray-400 text-xs">{track.duration}</div>
                                  </div>
                                </div>
                                
                                {/* Insert position after this track */}
                                <div className="flex items-center gap-3 p-2 rounded hover:bg-gray-700 cursor-pointer ml-4">
                                  <input
                                    type="radio"
                                    id={`position-${track.track_order}`}
                                    name="trackPosition"
                                    value={track.track_order}
                                    checked={selectedTrackPosition === track.track_order}
                                    onChange={(e) => setSelectedTrackPosition(track.track_order)}
                                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
                                  />
                                  <Label htmlFor={`position-${track.track_order}`} className="text-white cursor-pointer flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-medium">
                                        {track.track_order + 1}
                                      </span>
                                      <span className="text-gray-300">Insert after "{track.title}"</span>
                                    </div>
                                  </Label>
                                </div>
                              </div>
                            ))}
                            
                            {/* Option to add at the end */}
                            <div className="flex items-center gap-3 p-2 rounded hover:bg-gray-700 cursor-pointer">
                              <input
                                type="radio"
                                id={`position-${existingAlbumTracks.length > 0 ? Math.max(...existingAlbumTracks.map(t => t.track_order)) + 1 : 1}`}
                                name="trackPosition"
                                value={existingAlbumTracks.length > 0 ? Math.max(...existingAlbumTracks.map(t => t.track_order)) + 1 : 1}
                                checked={selectedTrackPosition === (existingAlbumTracks.length > 0 ? Math.max(...existingAlbumTracks.map(t => t.track_order)) + 1 : 1)}
                                onChange={(e) => setSelectedTrackPosition(existingAlbumTracks.length > 0 ? Math.max(...existingAlbumTracks.map(t => t.track_order)) + 1 : 1)}
                                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
                              />
                              <Label htmlFor={`position-${existingAlbumTracks.length > 0 ? Math.max(...existingAlbumTracks.map(t => t.track_order)) + 1 : 1}`} className="text-white cursor-pointer flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="bg-purple-600 text-white px-2 py-1 rounded text-xs font-medium">
                                    {existingAlbumTracks.length > 0 ? Math.max(...existingAlbumTracks.map(t => t.track_order)) + 1 : 1}
                                  </span>
                                  <span className="text-gray-300">Add at the end</span>
                                </div>
                              </Label>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {!createNew && existingItems.length === 0 && (
              <div className="text-center py-4 text-gray-400">
                No existing {saveToLibraryType === 'album' ? 'albums' : saveToLibraryType === 'single' ? 'singles' : 'audio items'} found. 
                Please create a new one.
              </div>
            )}

            {/* Session Linking Option */}
            {currentSessionId && (
              <div className="space-y-4 p-4 bg-blue-900/20 border border-blue-600/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="linkToSession"
                    checked={linkToSession}
                    onChange={(e) => setLinkToSession(e.target.checked)}
                    className="w-5 h-5 rounded border-blue-400 bg-gray-800 text-blue-600 focus:ring-blue-500 focus:ring-2"
                  />
                  <div className="flex-1">
                    <Label htmlFor="linkToSession" className="text-white font-semibold text-base cursor-pointer">
                      🔗 Link to Beat Session
                    </Label>
                    {sessionName && (
                      <div className="text-blue-300 text-sm mt-1">
                        Session: <span className="font-medium">{sessionName}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-sm text-blue-200 ml-8">
                  When enabled, this track will be linked to your current beat session "{sessionName || 'Untitled'}", allowing you to easily return to edit it later.
                </div>
              </div>
            )}

            {/* Error Display */}
            {librarySaveError && (
              <div className="text-red-400 text-sm bg-red-900/20 border border-red-600 rounded p-2">
                {librarySaveError}
              </div>
            )}
          </div>

                    <DialogFooter className="flex gap-3 flex-shrink-0 pt-4 border-t border-gray-700">
            <Button
              variant="outline"
              onClick={() => setShowSaveToLibraryDialog(false)}
              className="bg-gray-800 hover:bg-gray-700 text-white"
            >
              Cancel
            </Button>
            
            {/* Manual Stop Button for Live Export - Only show when recording */}
            {isExportLiveMode && isExportLiveRecording && (
              <Button
                onClick={stopExportLive}
                variant="outline"
                className="bg-orange-600 hover:bg-orange-700 text-white border-orange-500 animate-pulse"
                title="Stop the live export recording"
              >
                <Square className="w-4 h-4 mr-2" />
                Stop Recording
              </Button>
            )}
            
            <Button
              onClick={isExportLiveMode ? exportLiveToLibrary : saveArrangementToLibrary}
              disabled={isSavingToLibrary || isExportLiveRecording || 
                (createNew && !newItemTitle.trim()) || 
                (!createNew && !selectedItemId) ||
                (saveToLibraryType === 'album' && !newTrackTitle.trim()) ||
                (saveToLibraryType === 'album' && createNew && albumArtists.length === 0)
              }
              className={isExportLiveMode ? "bg-teal-600 hover:bg-teal-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}
            >
              {isSavingToLibrary || isExportLiveRecording ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isExportLiveMode ? 'Recording...' : 'Saving...'}
                </>
              ) : (
                <>
                  {isExportLiveMode ? (
                    <>
                      <Music className="w-4 h-4 mr-2" />
                      Start Live Export
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Arrangement
                </>
              )}
              </>
            )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      {/* Set Bars Dialog */}
      <Dialog open={showSetBarsDialog} onOpenChange={setShowSetBarsDialog}>
        <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              Set Timeline Bars
            </DialogTitle>
            <DialogDescription className="text-gray-400 mt-2">
              Set the number of bars for your timeline. Patterns beyond this limit will be removed.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="customBars" className="text-white">Number of Bars</Label>
              <Input
                id="customBars"
                type="number"
                min="1"
                max="1000"
                value={customBarsInput}
                onChange={(e) => setCustomBarsInput(e.target.value)}
                placeholder="Enter number of bars (1-1000)"
                className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-purple-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setCustomBars()
                  }
                }}
              />
              <p className="text-xs text-gray-500 mt-1">
                Current: {totalBars} bars • Recommended: 40-100 bars for most arrangements
              </p>
            </div>
          </div>
          
          <DialogFooter className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowSetBarsDialog(false)}
              className="bg-gray-800 hover:bg-gray-700 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={setCustomBars}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Set Bars
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fill Track Dialog */}
      <Dialog open={showFillTrackDialog} onOpenChange={setShowFillTrackDialog}>
        <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              Fill Track with Patterns
            </DialogTitle>
            <DialogDescription className="text-gray-400 mt-2">
              Fill the entire track with patterns of the specified size. This will replace any existing patterns for this track.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="text-white">Track</Label>
              <div className="bg-gray-800 border border-gray-600 rounded-md p-3">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${selectedTrackForFill?.color || 'bg-gray-500'}`}></div>
                  <span className="text-white">{selectedTrackForFill ? getTrackDisplayName(selectedTrackForFill.name) : 'Unknown Track'}</span>
                </div>
              </div>
            </div>
            
            <div>
              <Label className="text-white">Pattern Size</Label>
              <div className="flex gap-2">
                <Button
                  variant={fillPatternSize === 4 ? "default" : "outline"}
                  onClick={() => setFillPatternSize(4)}
                  className={fillPatternSize === 4 ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-gray-800 hover:bg-gray-700 text-white"}
                >
                  4 Bars
                </Button>
                <Button
                  variant={fillPatternSize === 8 ? "default" : "outline"}
                  onClick={() => setFillPatternSize(8)}
                  className={fillPatternSize === 8 ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-gray-800 hover:bg-gray-700 text-white"}
                >
                  8 Bars
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Will create {Math.ceil(totalBars / fillPatternSize)} patterns to fill {totalBars} bars
              </p>
            </div>
          </div>
          
          <DialogFooter className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowFillTrackDialog(false)}
              className="bg-gray-800 hover:bg-gray-700 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedTrackForFill && fillTrackWithPatterns(selectedTrackForFill.id, fillPatternSize)}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              Fill Track
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notification Modal */}
      <NotificationModal
        isOpen={notificationModal.isOpen}
        onClose={closeNotification}
        title={notificationModal.title}
        message={notificationModal.message}
        type={notificationModal.type}
      />
    </div>
  )
} 