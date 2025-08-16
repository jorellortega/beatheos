'use client'

// Extend Window interface to include our custom properties
declare global {
  interface Window {
  audioPlayers?: { [key: number]: any }
  shuffleIntervals?: NodeJS.Timeout[]
  _eqSoloState?: {
    hasAnySolo: boolean
    isThisTrackSoloed: boolean
    soloedTracks: number[]
    trackId: number
  }
  _masterEQChain?: any[]
  _audioMonitorLogged?: boolean
}
}

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Fader } from '@/components/ui/fader'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Play, Square, RotateCcw, Settings, Save, Upload, Music, List, Disc, Shuffle, FolderOpen, Clock, Plus, Brain, Lock, Unlock, Download, Mic, Trash2, CheckCircle, ChevronDown, Link as LinkIcon, Edit3, X, CheckCircle2, Copy } from 'lucide-react'
import { SequencerGrid } from '@/components/beat-maker/SequencerGrid'
import { TrackList } from '@/components/beat-maker/TrackList'
import { SampleLibrary } from '@/components/beat-maker/SampleLibrary'
import { SongArrangement } from '@/components/beat-maker/SongArrangement'
import { QuantizeLoopModal } from '@/components/beat-maker/QuantizeLoopModal'
import { PianoRoll } from '@/components/beat-maker/PianoRoll'
import { TrackPianoRoll } from '@/components/beat-maker/TrackPianoRoll'
import { useBeatMaker, Track } from '@/hooks/useBeatMaker'
import { useUndoRedo, BeatMakerState } from '@/hooks/useUndoRedo'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { calculatePitchShift, validatePitchShift, applyPitchShiftWithEnhancement } from '@/lib/utils'
import { shuffleArray } from '@/utils/shuffle'
import { toast } from '@/hooks/use-toast'
import { NotificationModal } from '@/components/ui/notification-modal'

export default function BeatMakerPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // Initialize undo/redo functionality
  const undoRedo = useUndoRedo(50) // 50 versions max
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [bpm, setBpm] = useState(120)
  const [transportKey, setTransportKey] = useState('C') // Add transport key state
  const [originalKey, setOriginalKey] = useState('C') // Original key before pitch shifting
  const [pitchShift, setPitchShift] = useState(0) // Pitch shifter in semitones
  const [pitchQuality, setPitchQuality] = useState<'standard' | 'high' | 'ultra'>('high') // Pitch shifter quality
  const [isPitchShifting, setIsPitchShifting] = useState(false) // Visual indicator for pitch shifting
  const [currentStep, setCurrentStep] = useState(0)
  const [layoutMode, setLayoutMode] = useState<'default' | 'vertical' | 'horizontal'>('default')
  
  // Export state
  const [isExporting, setIsExporting] = useState(false)
  
  // Version history state
  const [showVersionHistoryDialog, setShowVersionHistoryDialog] = useState(false)
  const [sessionVersions, setSessionVersions] = useState<any[]>([])
  const [isLoadingVersions, setIsLoadingVersions] = useState(false)
  
  // Session loading state to prevent auto-reload on refresh
  const [hasLoadedSessionFromUrl, setHasLoadedSessionFromUrl] = useState(false)
  
  // Debug dropdown state

  
  // Advanced settings toggle state
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  
  // Close debug dropdown when clicking outside

  
  // AI Prompt state
  const [aiPrompt, setAiPrompt] = useState('')
  const [isAiPromptVisible, setIsAiPromptVisible] = useState(false)
  
  // Edit track metadata state
  const [showEditTrackModal, setShowEditTrackModal] = useState(false)
  const [editingTrack, setEditingTrack] = useState<Track | null>(null)
  const [editTrackForm, setEditTrackForm] = useState({
    name: '',
    bpm: '',
    key: '',
    audio_type: '',
    tags: ''
  })
  const [savingTrack, setSavingTrack] = useState(false)
  const [trackEditError, setTrackEditError] = useState<string | null>(null)
  
  // BPM Range state for shuffle all
  const [bpmRange, setBpmRange] = useState<[number, number]>([70, 165])
  const [showBpmRangeControls, setShowBpmRangeControls] = useState(false)
  
  // Notification modal state
  const [notificationModal, setNotificationModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning'
  })
  
  const [tracks, setTracks] = useState<Track[]>([])
  const [isAutoMode, setIsAutoMode] = useState(false) // Strata mode is on by default when no template is loaded
  const [isLatidoMode, setIsLatidoMode] = useState(false) // Latido mode controls drum track loading in shuffle all
  const [isHeliosMode, setIsHeliosMode] = useState(false) // Helios mode creates hybrid drum/loop track combinations
  const [isBpmToleranceEnabled, setIsBpmToleranceEnabled] = useState(false) // ±10 BPM tolerance rule
  const [timeStretchMode, setTimeStretchMode] = useState<'resampling' | 'flex-time'>('resampling') // RM vs FT mode
  const [steps, setSteps] = useState(128) // 8 bars at 1/16 resolution (default)
  const [gridDivision, setGridDivision] = useState(16) // Grid quantization (1/4, 1/8, 1/16, 1/32) - default to 1/16
  const [showSampleLibrary, setShowSampleLibrary] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState<number | null>(null)
  const [showPianoRoll, setShowPianoRoll] = useState(false)
  const [pianoRollTrack, setPianoRollTrack] = useState<number | null>(null)

  const [showTrackPianoRoll, setShowTrackPianoRoll] = useState(false)
  const [trackPianoRollTrack, setTrackPianoRollTrack] = useState<Track | null>(null)
  const [trackPianoRollNotes, setTrackPianoRollNotes] = useState<any[]>([])
  
  // MIDI synthesizers
  const [midiSoundType, setMidiSoundType] = useState<'piano' | 'synth' | 'bass'>('piano')
  const [midiVolume, setMidiVolume] = useState(0.7)
  const pianoSynthRef = useRef<any>(null)
  const synthRef = useRef<any>(null)
  const bassSynthRef = useRef<any>(null)
  
  // Audio level state for VU meters
  const [audioLevels, setAudioLevels] = useState<{[trackId: number]: number}>({})
  const [peakLevels, setPeakLevels] = useState<{[trackId: number]: number}>({})
  const [masterLevel, setMasterLevel] = useState(0)
  const [masterPeak, setMasterPeak] = useState(0)
  
  // Real VU meter refs
  const masterMeterRef = useRef<any>(null)
  const trackMeterRefs = useRef<{[trackId: number]: any}>({})

  // Format toggle state
  const [preferMp3, setPreferMp3] = useState(true)
  const [fileLinks, setFileLinks] = useState<any[]>([])
  const [totalAudioItems, setTotalAudioItems] = useState(0)
  const [queryLimit, setQueryLimit] = useState(5000) // Default to 5k
  const [formatSystemEnabled, setFormatSystemEnabled] = useState(false) // Disable MP3/WAV system by default

  // Helper to check if any track has a valid audio file
  const hasLoadedAudio = tracks.some(track => track.audioUrl && track.audioUrl !== 'undefined')
  
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

  // Handler for track audio URL changes when format preference changes
  const handleTrackAudioUrlChange = (trackId: number, newAudioUrl: string) => {
    setTracks(prev => prev.map(track => 
      track.id === trackId ? { ...track, audioUrl: newAudioUrl } : track
    ))
    
    // Auto-reload will handle the audio reload automatically via useEffect
    console.log(`[FORMAT CHANGE] Track state updated - auto-reload will handle audio reload`)
  }

  // Handler for track halftime changes
  const handleTrackHalfTimeChange = (trackId: number, isHalfTime: boolean, ratio: number) => {
    console.log(`🔍 TRACK HALFTIME - Track ${trackId} ${isHalfTime ? 'enabled' : 'disabled'} at ${ratio}x`)
    
    // Find the track to get its current BPM
    const track = tracks.find(t => t.id === trackId)
    if (!track) return
    
    // Calculate the effective BPM and playback rate for halftime
    const originalBpm = track.originalBpm || track.bpm || bpm
    let effectiveBpm = originalBpm
    let calculatedPlaybackRate = 1.0
    
    if (isHalfTime) {
      // Half-time enabled: slow down the track
      effectiveBpm = originalBpm * ratio
      calculatedPlaybackRate = ratio
    } else {
      // Half-time disabled: restore to original speed
      effectiveBpm = originalBpm
      calculatedPlaybackRate = 1.0
    }
    
    console.log(`🔍 TRACK HALFTIME - Track ${trackId}: originalBpm=${originalBpm}, effectiveBpm=${effectiveBpm}, ratio=${ratio}, playbackRate=${calculatedPlaybackRate}`)
    
    // Update the track with both the effective BPM and the calculated playback rate
    setTracks(prevTracks => 
      prevTracks.map(t => 
        t.id === trackId 
          ? { 
              ...t, 
              currentBpm: effectiveBpm,
              playbackRate: calculatedPlaybackRate
            }
          : t
      )
    )
    
    // Stop transport to prevent timing issues during reload
    const stopTransport = async () => {
      const ToneModule = await import('tone')
      if (ToneModule.Transport.state === 'started') {
        ToneModule.Transport.stop()
        console.log(`🔍 TRACK HALFTIME - Stopped transport for track ${trackId}`)
      }
    }
    
    // Auto-reload will handle the audio reload automatically via useEffect
    console.log(`🔍 TRACK HALFTIME - Track state updated - auto-reload will handle audio reload`)
  }

  // Fetch total audio items count
  const fetchTotalAudioItems = async () => {
    // Always fetch to respect current query limit
    
    console.log(`[QUERY LIMIT] Fetching total audio items with limit: ${queryLimit}`)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        console.log('❌ No session available, skipping total audio items fetch')
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) {
        console.log('❌ No user found, skipping total audio items fetch')
        return
      }

      const { data, error } = await supabase
        .from('audio_library_items')
        .select('*')
        .eq('user_id', user.id)
        .limit(queryLimit)

      if (error) {
        console.error('Error fetching total audio items count:', error)
        return
      }

      console.log(`📊 Total audio items fetched (limited to ${queryLimit}): ${data?.length || 0}`)
      setTotalAudioItems(data?.length || 0)
    } catch (error) {
      console.error('Error fetching total audio items count:', error)
    }
  }

  // Fetch file links for format detection
  const fetchFileLinks = async () => {
    // CRITICAL: Don't fetch file links if format system is disabled
    if (!formatSystemEnabled) {
      console.log('[FORMAT OFF] Skipping file links fetch - format system disabled')
      return
    }
    
    // Always fetch to respect current query limit
    console.log(`[QUERY LIMIT] Fetching with limit: ${queryLimit}`)
    try {
      console.log('🔄 Fetching file links from API...')
      
      // Get the current session for authentication
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        console.log('❌ No session available, skipping file links fetch')
        return
      }
      
      const response = await fetch(`/api/audio/links?limit=${queryLimit}&t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Cache-Control': 'no-cache'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log(`✅ Fetched ${data?.links?.length || 0} file links with limit ${queryLimit}:`, data?.links?.slice(0, 3))
      console.log(`🔍 All file links:`, data?.links?.map((l: any) => ({
        id: l.id,
        original: l.original_file_id,
        converted: l.converted_file_id,
        originalFormat: l.original_format,
        convertedFormat: l.converted_format
      })))
      
      // Check if we have any MP3 links
      const mp3Links = data?.links?.filter((l: any) => l.converted_format === 'mp3') || []
      console.log(`🎵 Found ${mp3Links.length} MP3 links out of ${data?.links?.length || 0} total links`)
      
      if (mp3Links.length > 0) {
        console.log(`🎵 Sample MP3 links:`, mp3Links.slice(0, 3).map((l: any) => ({
          original: l.original_file_id,
          converted: l.converted_file_id
        })))
      }
        
              // Fetch the actual MP3 file URLs for each link - BATCHED for performance
      const mp3LinkIds = data?.links?.filter((l: any) => l.converted_format === 'mp3').map((l: any) => l.converted_file_id) || []
      
      let mp3FilesMap = new Map()
      if (mp3LinkIds.length > 0) {
        try {
          // Batch fetch all MP3 files in one query
          const { data: mp3Files, error } = await supabase
            .from('audio_library_items')
            .select('id, file_url, name, file_size')
            .in('id', mp3LinkIds)
          
          if (!error && mp3Files) {
            mp3FilesMap = new Map(mp3Files.map(f => [f.id, f]))
            console.log(`🔗 Batch fetched ${mp3Files.length} MP3 files`)
          }
        } catch (error) {
          console.error('Error batch fetching MP3 files:', error)
        }
      }
      
      const linksWithUrls = data?.links?.map((link: any) => {
        if (link.converted_format === 'mp3') {
          const mp3File = mp3FilesMap.get(link.converted_file_id)
          if (mp3File) {
            console.log(`🔗 Found MP3 URL for link ${link.id}: ${mp3File.file_url} (${mp3File.name})`)
            return {
              ...link,
              mp3_file_url: mp3File.file_url,
              mp3_file_name: mp3File.name,
              mp3_file_size: mp3File.file_size
            }
          }
        }
        return link
      }) || []
        
        setFileLinks(linksWithUrls || [])
      } else {
        console.error('❌ Failed to fetch file links:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('❌ Error fetching file links:', error)
    }
  }

  // Initialize MIDI synthesizers
  useEffect(() => {
    const initMidiSynthesizers = async () => {
      try {
        const Tone = await import('tone')
        
        // Piano synthesizer (sampled piano)
        pianoSynthRef.current = new Tone.Sampler({
          urls: {
            "C4": "C4.mp3",
            "D#4": "Ds4.mp3", 
            "F#4": "Fs4.mp3",
          },
          baseUrl: "https://tonejs.github.io/audio/salamander/",
        }).toDestination()
        
        // Simple synth
        synthRef.current = new Tone.Synth({
          oscillator: {
            type: "square"
          },
          envelope: {
            attack: 0.1,
            decay: 0.2,
            sustain: 0.3,
            release: 1
          }
        }).toDestination()
        
        // Bass synth
        bassSynthRef.current = new Tone.MonoSynth({
          oscillator: {
            type: "sawtooth"
          },
          envelope: {
            attack: 0.1,
            decay: 0.2,
            sustain: 0.4,
            release: 0.8
          },
          filterEnvelope: {
            attack: 0.001,
            decay: 0.1,
            sustain: 0.3,
            release: 0.1,
            baseFrequency: 200,
            octaves: 2.6
          }
        }).toDestination()
        
        // Set initial volumes
        pianoSynthRef.current.volume.value = Tone.gainToDb(midiVolume)
        synthRef.current.volume.value = Tone.gainToDb(midiVolume)
        bassSynthRef.current.volume.value = Tone.gainToDb(midiVolume)
        
      } catch (error) {
        console.error('Failed to initialize MIDI synthesizers:', error)
      }
    }
    
    initMidiSynthesizers()
  }, [midiVolume])

  // MIDI note playback function
  const playMidiNote = (note: string) => {
    try {
      let synth = pianoSynthRef.current
      if (midiSoundType === 'synth') synth = synthRef.current
      if (midiSoundType === 'bass') synth = bassSynthRef.current
      
      if (synth) {
        synth.triggerAttackRelease(note, "8n")
      }
    } catch (error) {
      console.error('Failed to play MIDI note:', error)
    }
  }

  // Helper to ensure we always use a public URL
  const getPublicAudioUrl = (audioUrlOrPath: string) => {
    if (!audioUrlOrPath) return ''
    // If it's already a public URL, return as is
    if (audioUrlOrPath.startsWith('http')) return audioUrlOrPath
    // Otherwise, treat as file path and get public URL
    const { data } = supabase.storage.from('beats').getPublicUrl(audioUrlOrPath)
    return data.publicUrl || ''
  }

  const {
    sequencerData,
    pianoRollData,
    toggleStep,
    playSequence,
    stopSequence,
    isSequencePlaying,
    currentStep: sequencerCurrentStep,
    updateTrackTempo,
    updateTrackPitch,
    forceReloadTrackSamples,
    quantizeTrackTiming,
    setSequencerDataFromSession,
    setPianoRollDataFromSession,
    updatePianoRollData,
    clearAllPatterns,
    clearTrackPattern,
    clearPianoRollData,
    debugPianoRollPlayback,
    debugLoopTiming,
    getCurrentPlayheadPosition,
    getCurrentStepFromTransport,
    restartAllLoopsAtPatternBoundary,
    stopAllLoops,
    samplesRef,
    pitchShiftersRef,
    reloadingTracks
  } = useBeatMaker(tracks, steps, bpm, timeStretchMode, gridDivision)

  // Custom playStep function that includes MIDI playback
  const customPlayStep = useCallback((step: number) => {
    tracks.forEach(track => {
      const shouldPlay = sequencerData[track.id]?.[step]
      
      // Handle MIDI notes
      if (track.name === 'MIDI' && track.midiNotes && track.midiNotes.length > 0 && shouldPlay) {
        const notesAtStep = track.midiNotes.filter(note => note.startStep === step)
        notesAtStep.forEach(note => {
          playMidiNote(note.note)
        })
      }
    })
  }, [tracks, sequencerData, playMidiNote])

  // Sync state with the hook
  useEffect(() => {
    setIsPlaying(isSequencePlaying)
    setCurrentStep(sequencerCurrentStep)
  }, [isSequencePlaying, sequencerCurrentStep])

  // Handle loading patterns and sessions from URL parameters
  useEffect(() => {
    if (searchParams && !hasLoadedSessionFromUrl) {
      const loadPatternId = searchParams.get('load-pattern')
      const loadSessionId = searchParams.get('session')
      
        loadPatternId,
        loadSessionId,
        allParams: Object.fromEntries(searchParams.entries()),
        hasLoadedSessionFromUrl
      })
      
      if (loadPatternId) {
        console.log(`[BEAT MAKER] Loading pattern from URL: ${loadPatternId}`)
        loadPatternFromDatabase(loadPatternId)
      }
      
      if (loadSessionId) {
        console.log(`[BEAT MAKER] Loading session from URL: ${loadSessionId}`)
        setHasLoadedSessionFromUrl(true) // Mark as loaded to prevent re-loading on refresh
        handleLoadSession(loadSessionId)
      }
    } else if (searchParams && hasLoadedSessionFromUrl) {
    }
  }, [searchParams, hasLoadedSessionFromUrl])

  // Load pattern from database by ID
  const loadPatternFromDatabase = async (patternId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('User not authenticated')
        return
      }

      const { data: pattern, error } = await supabase
        .from('saved_patterns')
        .select('*')
        .eq('id', patternId)
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.error('Error loading pattern from database:', error)
        return
      }

      if (!pattern) {
        console.error('Pattern not found')
        return
      }

      console.log('Loaded pattern from database:', pattern)

      // Turn off Strata mode when a template/pattern is loaded
      setIsAutoMode(false)

      // Load pattern BPM and steps
      setBpm(pattern.bpm)
      setSteps(pattern.steps)
      
      // Load sequencer data
      const patternSequencerData = pattern.sequencerData || pattern.sequencer_data
      if (patternSequencerData) {
        console.log('Loading sequencer data from database:', patternSequencerData)
        
        // Create a mapping from pattern track IDs to current sequencer track IDs
        const trackIdMapping: { [patternTrackId: number]: number } = {}
        
        if (pattern.tracks && pattern.tracks.length > 0) {
          // Map pattern tracks to sequencer tracks by name and type
          pattern.tracks.forEach((patternTrack: any, index: number) => {
            const patternTrackId = patternTrack.id
            
            // Try to find matching track by name first
            let matchingTrack = tracks.find(track => 
              track.name.toLowerCase() === patternTrack.name.toLowerCase()
            )
            
            // If no name match, try to find by audio type
            if (!matchingTrack && patternTrack.audio_type) {
              matchingTrack = tracks.find(track => 
                track.audio_type === patternTrack.audio_type
              )
            }
            
            // If still no match, use track by position (index)
            if (!matchingTrack && index < tracks.length) {
              matchingTrack = tracks[index]
            }
            
            if (matchingTrack) {
              trackIdMapping[patternTrackId] = matchingTrack.id
              console.log(`Mapped pattern track ${patternTrackId} (${patternTrack.name}) to sequencer track ${matchingTrack.id} (${matchingTrack.name})`)
            }
          })
        }
        
        // Merge the pattern data with existing sequencer data using the mapping
        setSequencerDataFromSession(prev => {
          const mergedData = { ...prev }
          
          // Map pattern track IDs to current sequencer track IDs
          Object.keys(patternSequencerData).forEach(patternTrackIdStr => {
            const patternTrackId = parseInt(patternTrackIdStr)
            const sequencerTrackId = trackIdMapping[patternTrackId]
            
            if (sequencerTrackId && patternSequencerData[patternTrackId]) {
              mergedData[sequencerTrackId] = patternSequencerData[patternTrackId]
              console.log(`Mapped sequencer data from pattern track ${patternTrackId} to sequencer track ${sequencerTrackId}`)
            }
          })
          
          console.log('Final merged sequencer data:', mergedData)
          return mergedData
        })
      }
      
      // Update track metadata if available
      if (pattern.tracks && pattern.tracks.length > 0) {
        console.log('Updating track metadata from database pattern:', pattern.tracks)
        
        setTracks(prev => prev.map(track => {
          // Find matching track in pattern by name or audio type
          const patternTrack = pattern.tracks.find((pt: any) => 
            pt.name.toLowerCase() === track.name.toLowerCase() ||
            (pt.audio_type && pt.audio_type === track.audio_type)
          )
          
          if (patternTrack) {
            console.log(`Updating track ${track.name} with metadata from database pattern:`, patternTrack)
            return {
              ...track,
              // Update track metadata
              name: patternTrack.name || track.name,
              bpm: patternTrack.bpm || track.bpm,
              key: patternTrack.key || track.key,
              audio_type: patternTrack.audio_type || track.audio_type,
              tags: patternTrack.tags || track.tags,
              // Update tempo and pitch properties
              originalBpm: patternTrack.originalBpm || patternTrack.bpm || track.originalBpm,
              currentBpm: patternTrack.currentBpm || patternTrack.bpm || track.currentBpm,
              playbackRate: patternTrack.playbackRate || track.playbackRate,
              originalKey: patternTrack.originalKey || patternTrack.key || track.originalKey,
              currentKey: patternTrack.currentKey || patternTrack.key || track.currentKey,
              pitchShift: patternTrack.pitchShift || track.pitchShift,
              // Update color if available
              color: patternTrack.color || track.color,
              // Update MIDI notes if available
              midiNotes: patternTrack.midiNotes || track.midiNotes
            }
          }
          return track
        }))
      }
      
      console.log(`Successfully loaded pattern from database: ${pattern.name}`)
      
      // Always go to sequencer tab after loading a pattern (with a small delay to ensure state updates)
      setTimeout(() => {
        setActiveTab('sequencer')
      }, 100)
    } catch (error) {
      console.error('Error loading pattern from database:', error)
    }
  }

  // Pattern management state
  const [savedPatterns, setSavedPatterns] = useState<{id: string, name: string, tracks: Track[], sequencerData: any, bpm: number, transportKey: string, steps: number, trackKey?: string, originalKey?: string, pitchShift?: number}[]>([])
  const [activeTab, setActiveTab] = useState('sequencer')
  const [lastLoadedPattern, setLastLoadedPattern] = useState<string | null>(null)
  const [showPatternDetails, setShowPatternDetails] = useState(true)
  
  // Song arrangement state
  const [songArrangementPatterns, setSongArrangementPatterns] = useState<any[]>([])
  
  // Current sequencer patterns - these are the patterns currently active in the sequencer
  const [currentSequencerPatterns, setCurrentSequencerPatterns] = useState<{id: string, name: string, tracks: Track[], sequencerData: any, bpm: number, transportKey: string, steps: number, trackKey?: string, originalKey?: string, pitchShift?: number, trackBpm?: number, originalBpm?: number, playbackRate?: number}[]>([])
  
  // --- FORCE EXACT SEQUENCER GRID CONSTANTS ---
  const STEP_WIDTH = 32; // EXACT COPY from sequencer grid
  
  // EXACT SEQUENCER GRID TIMING SYSTEM
  const secondsPerBeat = 60 / bpm
  const stepDuration = secondsPerBeat / (gridDivision / 4)
  
      // EXACT SEQUENCER GRID BAR SYSTEM
    const STEPS_PER_BAR = 16 // 16 steps per bar for 1/16 resolution
  const stepToBar = (stepIndex: number) => Math.floor(stepIndex / 16) + 1 // 16 steps per bar for 1/16 resolution
  const isBarStart = (stepIndex: number) => stepIndex % 16 === 0 // 16 steps per bar for 1/16 resolution
  const getGridStepNumber = (stepIndex: number) => (stepIndex + 1).toString()
  
  // Initialize sequencer with first step active for each track when in Strata mode
  useEffect(() => {
    if (isAutoMode) {
      // Only initialize if we don't have any sequencer data yet
      const hasExistingData = Object.keys(sequencerData).length > 0
      
      if (!hasExistingData) {
        // Set first step active for each track
        const initialSequencerData: {[trackId: number]: boolean[]} = {}
        tracks.forEach(track => {
          const stepPattern = new Array(steps).fill(false)
          stepPattern[0] = true // Activate first step
          initialSequencerData[track.id] = stepPattern
        })
        setSequencerDataFromSession(initialSequencerData)
        console.log('[STRATA MODE] Initialized sequencer data for new session')
      } else {
        console.log('[STRATA MODE] Skipping initialization - sequencer data already exists')
      }
    }
  }, [isAutoMode, steps]) // Remove tracks dependency to prevent clearing patterns

  // Function to capture current sequencer state as a pattern
  const captureCurrentSequencerAsPattern = (patternName?: string) => {
    const newPattern = {
      id: `pattern-${Date.now()}`,
      name: patternName || `Pattern ${currentSequencerPatterns.length + 1}`,
      tracks: tracks,
      sequencerData: { ...sequencerData },
      bpm: bpm,
      transportKey: transportKey,
      steps: steps,
      // Include track key information for each track
      trackKey: tracks[0]?.currentKey || tracks[0]?.key,
      originalKey: tracks[0]?.originalKey,
      pitchShift: tracks[0]?.pitchShift,
      // Include track BPM information for tempo sync
      trackBpm: tracks[0]?.currentBpm || tracks[0]?.bpm,
      originalBpm: tracks[0]?.originalBpm,
      playbackRate: tracks[0]?.playbackRate
    }
    
    setCurrentSequencerPatterns(prev => [...prev, newPattern])
    return newPattern
  }
  
  // Function to remove a pattern from current sequencer patterns
  const removeCurrentSequencerPattern = (patternId: string) => {
    setCurrentSequencerPatterns(prev => prev.filter(p => p.id !== patternId))
  }
  
  // Function to get track display name with icons
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

  // Function to get just the track type name (first word) - for backward compatibility
  const getTrackTypeName = (trackName: string) => {
    // Handle common track name patterns
    if (trackName.toLowerCase().includes('hi-hat') || trackName.toLowerCase().includes('hihat')) {
      return 'Hi-Hat'
    }
    if (trackName.toLowerCase().includes('melody loop')) {
      return 'Melody'
    }
    if (trackName.toLowerCase().includes('bass loop')) {
      return 'Bass'
    }
    if (trackName.toLowerCase().includes('drum loop')) {
      return 'Drums'
    }
    if (trackName.toLowerCase().includes('piano loop')) {
      return 'Piano'
    }
    if (trackName.toLowerCase().includes('guitar loop')) {
      return 'Guitar'
    }
    if (trackName.toLowerCase().includes('synth loop')) {
      return 'Synth'
    }
    if (trackName.toLowerCase().includes('vocal loop')) {
      return 'Vocal'
    }
    if (trackName.toLowerCase().includes('808 loop')) {
      return '808'
    }
    
    // For other tracks, just take the first word
    return trackName.split(' ')[0]
  }
  
  // Mixer state for each track
  const [mixerSettings, setMixerSettings] = useState<{[trackId: number]: {
    volume: number, 
    pan: number, 
    mute: boolean, 
    eq: { low: number, mid: number, high: number },
    effects: { reverb: number, delay: number }
  }}>({})

  // Master volume state
  const [masterVolume, setMasterVolume] = useState(0.8)
  
  // Arrangement playback state
  const [isArrangementPlaying, setIsArrangementPlaying] = useState(false)

  // Transport inline editing states
  const [editingBpm, setEditingBpm] = useState(false)
  const [editingPosition, setEditingPosition] = useState(false)
  const [editingTransportKey, setEditingTransportKey] = useState(false)
  const [bpmInputValue, setBpmInputValue] = useState('')
  const [positionInputValue, setPositionInputValue] = useState('')
  const [transportKeyInputValue, setTransportKeyInputValue] = useState('')

  // Initialize mixer settings for tracks
  useEffect(() => {
    tracks.forEach(track => {
      if (!mixerSettings[track.id]) {
        console.log(`[MIXER INIT] Initializing mixer settings for track ${track.id}`)
        setMixerSettings(prev => ({
          ...prev,
          [track.id]: {
            volume: 0.7,
            pan: 0,
            mute: false,

            eq: { low: 0, mid: 0, high: 0 },
            effects: { reverb: 0, delay: 0 }
          }
        }))
      }
    })
  }, [tracks, mixerSettings])

  // Apply mixer settings to audio players when they're created
  useEffect(() => {
    tracks.forEach(track => {
      const trackSettings = mixerSettings[track.id]
      if (trackSettings && samplesRef?.current?.[track.id]) {
        const player = samplesRef.current[track.id]
        if (player && player.volume) {
          // Apply volume setting with safety check for negative values
          let volumeDb = -Infinity
          if (!trackSettings.mute && trackSettings.volume > 0) {
            volumeDb = Math.max(-60, 20 * Math.log10(trackSettings.volume)) // Clamp to -60dB minimum
          }
          player.volume.value = volumeDb
          console.log(`[MIXER INIT] Applied volume ${trackSettings.volume} (${volumeDb.toFixed(2)}dB) to track ${track.id}`)
          
          // Apply EQ settings if they exist
          if (trackSettings.eq) {
            applyEQToPlayer(player, track.id, trackSettings.eq)
            console.log(`[MIXER INIT] Applied EQ settings to track ${track.id}:`, trackSettings.eq)
          }
        }
      }
    })
  }, [tracks, mixerSettings, samplesRef])

  // Apply EQ settings when new audio players are created
  useEffect(() => {
    tracks.forEach(track => {
      const trackSettings = mixerSettings[track.id]
      if (trackSettings?.eq && samplesRef?.current?.[track.id]) {
        const player = samplesRef.current[track.id] as any
        if (player && !player._eqApplied) {
          applyEQToPlayer(player, track.id, trackSettings.eq)
          player._eqApplied = true
          console.log(`[EQ INIT] Applied EQ settings to newly created player for track ${track.id}:`, trackSettings.eq)
        }
      }
    })
  }, [samplesRef, tracks, mixerSettings])


  
  // Create individual track patterns from current sequencer state
  const createCurrentTrackPatterns = () => {
    return tracks.map(track => {
      // Ensure we have the correct number of steps of sequencer data
      const currentTrackData = sequencerData[track.id] || []
      const extendedTrackData = [...currentTrackData]
      
      // Extend the array to match the current steps if it's shorter
      while (extendedTrackData.length < steps) {
        extendedTrackData.push(false)
      }
      
      const trackPattern = {
        id: `track-${track.id}`,
        name: track.name,
        tracks: [track],
        sequencerData: { [track.id]: extendedTrackData },
        bpm: bpm,
        transportKey: transportKey,
        steps: 32, // Force 32 steps
        trackId: track.id,
        color: track.color,
        // Include current track key information to keep patterns in sync with track cards
        trackKey: track.currentKey || track.key,
        originalKey: track.originalKey,
        pitchShift: track.pitchShift,
        // Include current BPM information for tempo sync
        trackBpm: track.currentBpm || track.bpm,
        originalBpm: track.originalBpm,
        playbackRate: track.playbackRate
      }
      return trackPattern
    }).filter(pattern => {
      // Only include tracks that have active sequencer data
      const trackData = sequencerData[pattern.trackId]
      return trackData && trackData.some(step => step === true)
    })
  }
  
  // Initialize with current track patterns
  useEffect(() => {
    if (currentSequencerPatterns.length === 0) {
      const trackPatterns = createCurrentTrackPatterns()
      setCurrentSequencerPatterns(trackPatterns)
    }
  }, [])
  
  // Update track patterns whenever sequencer data changes
  useEffect(() => {
    const trackPatterns = createCurrentTrackPatterns()
    
    setCurrentSequencerPatterns(prev => {
      // Keep any manually captured patterns (not track patterns)
      const manualPatterns = prev.filter(p => !p.id.startsWith('track-'))
      
      // Combine manual patterns with current track patterns
      return [...manualPatterns, ...trackPatterns]
    })
  }, [sequencerData, tracks, bpm, transportKey, steps])



  // State restoration function for undo/redo
  const restoreState = useCallback((state: BeatMakerState) => {
    // Restore all state from the saved version
    setTracks(state.tracks || [])
    setBpm(state.bpm || 120)
    setSteps(state.steps || 32)
    setGridDivision(state.gridDivision || 4)
    setTransportKey(state.transportKey || 'C')
    setLayoutMode(state.layoutMode || 'default')
    setTimeStretchMode(state.timeStretchMode || 'resampling')
    setMasterVolume(state.masterVolume || 0.8)
    setCurrentSequencerPatterns(state.currentSequencerPatterns || [])
    setIsAutoMode(state.isAutoMode || false)
    setIsLatidoMode(state.isLatidoMode || false)
    setIsHeliosMode(state.isHeliosMode || false)
    setIsBpmToleranceEnabled(state.isBpmToleranceEnabled || false)
    setMidiSoundType(state.midiSoundType || 'piano')
    setMidiVolume(state.midiVolume || 0.7)
    setAudioLevels(state.audioLevels || {})
    setPeakLevels(state.peakLevels || {})
    setMasterLevel(state.masterLevel || 0)
    setMasterPeak(state.masterPeak || 0)
    setSavedPatterns(state.savedPatterns || [])
    setActiveTab(state.activeTab || 'sequencer')
    setLastLoadedPattern(state.lastLoadedPattern || null)
    setShowPatternDetails(state.showPatternDetails !== undefined ? state.showPatternDetails : true)
    
    setEditingBpm(state.editingBpm || false)
    setEditingPosition(state.editingPosition || false)
    setEditingTransportKey(state.editingTransportKey || false)
    setBpmInputValue(state.bpmInputValue || '')
    setPositionInputValue(state.positionInputValue || '')
    setTransportKeyInputValue(state.transportKeyInputValue || '')
    setShowSampleLibrary(state.showSampleLibrary || false)
    setSelectedTrack(state.selectedTrack || null)
    setShowPianoRoll(state.showPianoRoll || false)
    setPianoRollTrack(state.pianoRollTrack || null)

    setShowTrackPianoRoll(state.showTrackPianoRoll || false)
    setTrackPianoRollTrack(state.trackPianoRollTrack || null)
    setTrackPianoRollNotes(state.trackPianoRollNotes || [])
    setShowEditTrackModal(state.showEditTrackModal || false)
    setEditingTrack(state.editingTrack || null)
    setEditTrackForm(state.editTrackForm || { name: '', bpm: '', key: '', audio_type: '', tags: '' })
    setSavingTrack(state.savingTrack || false)
    setTrackEditError(state.trackEditError || null)
    setBpmRange(state.bpmRange || [70, 165])
    setShowBpmRangeControls(state.showBpmRangeControls || false)
    setAiPrompt(state.aiPrompt || '')
    setIsAiPromptVisible(state.isAiPromptVisible || false)
    
    // Restore sequencer data through the hook
    if (state.sequencerData) {
      setSequencerDataFromSession(state.sequencerData)
    }
    
    // Restore piano roll data through the hook
    if (state.pianoRollData) {
      setPianoRollDataFromSession(state.pianoRollData)
    }
    
    // Restore mixer settings
    if (state.mixerSettings) {
      setMixerSettings(state.mixerSettings)
    }
    
    console.log('[UNDO/REDO] State restored successfully')
  }, [setSequencerDataFromSession, setPianoRollDataFromSession])
  
  // Function to capture current state for undo/redo
  const captureCurrentState = useCallback((): BeatMakerState => {
    return {
      sequencerData,
      pianoRollData,
      tracks,
      bpm,
      steps,
      gridDivision,
      transportKey,
      mixerSettings,
      masterVolume,
      currentSequencerPatterns,
      layoutMode,
      timeStretchMode,
      isAutoMode,
      isLatidoMode,
      isHeliosMode,
      isBpmToleranceEnabled,
      midiSoundType,
      midiVolume,
      audioLevels,
      peakLevels,
      masterLevel,
      masterPeak,
      savedPatterns,
      activeTab,
      lastLoadedPattern,
      showPatternDetails,
      
      editingBpm,
      editingPosition,
      editingTransportKey,
      bpmInputValue,
      positionInputValue,
      transportKeyInputValue,
      showSampleLibrary,
      selectedTrack,
      showPianoRoll,
      pianoRollTrack,


      showTrackPianoRoll,
      trackPianoRollTrack,
      trackPianoRollNotes,
      showEditTrackModal,
      editingTrack,
      editTrackForm,
      savingTrack,
      trackEditError,
      bpmRange,
      showBpmRangeControls,
      aiPrompt,
      isAiPromptVisible,

    }
  }, [
    sequencerData, pianoRollData, tracks, bpm, steps, gridDivision, transportKey, mixerSettings, masterVolume,
    currentSequencerPatterns, layoutMode, timeStretchMode,
    isAutoMode, isLatidoMode, isHeliosMode, isBpmToleranceEnabled, midiSoundType, midiVolume,
            audioLevels, peakLevels, masterLevel, masterPeak, savedPatterns, activeTab, lastLoadedPattern, showPatternDetails,
    editingBpm, editingPosition, editingTransportKey, bpmInputValue, positionInputValue, transportKeyInputValue,
    showSampleLibrary, selectedTrack, showPianoRoll, pianoRollTrack,
    showTrackPianoRoll, trackPianoRollTrack, trackPianoRollNotes, showEditTrackModal, editingTrack,
    editTrackForm, savingTrack, trackEditError, bpmRange, showBpmRangeControls, aiPrompt, isAiPromptVisible,

  ])





  // Simulate audio level monitoring for VU meters
  useEffect(() => {
    let intervalId: NodeJS.Timeout

    if (isPlaying) {
      intervalId = setInterval(() => {
        const newLevels: {[trackId: number]: number} = {}
        let mixedLevel = 0

        tracks.forEach(track => {
          const trackSettings = mixerSettings[track.id]
          if (track.audioUrl && trackSettings && !trackSettings.mute) {
            // Simulate audio level based on step activity and volume
            const isActiveStep = sequencerData[track.id]?.[currentStep]
            const baseLevel = isActiveStep ? Math.random() * 0.7 + 0.3 : Math.random() * 0.2
            const volumeLevel = baseLevel * trackSettings.volume
            
            newLevels[track.id] = volumeLevel
            
            // Add to master mix
            mixedLevel += volumeLevel * 0.3
          } else {
            newLevels[track.id] = 0
          }
        })

        setAudioLevels(newLevels)
        
        // Update peak levels using functional update
        setPeakLevels(prev => {
          const updated = { ...prev }
          Object.keys(newLevels).forEach(trackIdStr => {
            const trackId = parseInt(trackIdStr)
            const currentLevel = newLevels[trackId]
            updated[trackId] = Math.max(prev[trackId] || 0, currentLevel)
          })
          return updated
        })
        
        setMasterLevel(Math.min(mixedLevel, 1))
        setMasterPeak(prev => Math.max(prev, mixedLevel))
      }, 50) // 20fps update rate

      // Peak hold decay
      const peakDecayInterval = setInterval(() => {
        setPeakLevels(prev => {
          const updated = { ...prev }
          Object.keys(updated).forEach(trackId => {
            updated[parseInt(trackId)] = Math.max(0, updated[parseInt(trackId)] - 0.02)
          })
          return updated
        })
        setMasterPeak(prev => Math.max(0, prev - 0.02))
      }, 100)

      return () => {
        clearInterval(intervalId)
        clearInterval(peakDecayInterval)
      }
    } else {
      // Reset levels when stopped
      setAudioLevels({})
      setPeakLevels({})
      setMasterLevel(0)
      setMasterPeak(0)
    }
  }, [isPlaying, tracks, mixerSettings, sequencerData, currentStep])

  // Load saved patterns from database
  useEffect(() => {
    const loadSavedPatterns = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: patterns, error } = await supabase
          .from('saved_patterns')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error loading saved patterns:', error)
          return
        }

        // Convert database patterns to the format expected by the UI
        const convertedPatterns = patterns.map(pattern => ({
          id: pattern.id,
          name: pattern.name,
          tracks: pattern.tracks || [],
          sequencerData: pattern.sequencer_data || pattern.sequencerData || {},
          bpm: pattern.bpm,
          transportKey: 'C', // Default transport key
          steps: pattern.steps,
          genre_id: pattern.genre_id,
          subgenre: pattern.subgenre,
          category: pattern.category,
          description: pattern.description,
          tags: pattern.tags,
          pattern_type: pattern.pattern_type,
          created_at: pattern.created_at
        }))

        setSavedPatterns(convertedPatterns)
      } catch (error) {
        console.error('Error loading saved patterns:', error)
      }
    }

    loadSavedPatterns()
  }, [])

  // Save current pattern as new pattern
  const saveAsNewPattern = async () => {
    setPatternName('')
    setPatternDescription('')
    setPatternCategory('')
    setPatternTags('')
    setShowSavePatternDialog(true)
  }

  const handleSavePatternSubmit = async () => {
    if (!patternName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a pattern name",
        variant: "destructive"
      })
      return
    }
    
    try {
      const tags = patternTags.trim() ? patternTags.split(',').map(tag => tag.trim()) : []
      await handleSavePattern(patternName.trim(), patternDescription.trim(), patternCategory.trim(), tags, selectedGenreId === 'none' ? '' : selectedGenreId, selectedSubgenre === 'none' ? '' : selectedSubgenre)
      setShowSavePatternDialog(false)
      
      // Reset genre/subgenre selection
      setSelectedGenreId('none')
      setSelectedSubgenre('none')
      
      // Refresh the patterns list after saving
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: patterns, error } = await supabase
          .from('saved_patterns')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (!error && patterns) {
          const convertedPatterns = patterns.map(pattern => ({
            id: pattern.id,
            name: pattern.name,
            tracks: pattern.tracks || [],
            sequencerData: pattern.sequencer_data || pattern.sequencerData || {},
            bpm: pattern.bpm,
            transportKey: 'C',
            steps: pattern.steps,
            genre_id: pattern.genre_id,
            subgenre: pattern.subgenre,
            category: pattern.category,
            description: pattern.description,
            tags: pattern.tags,
            pattern_type: pattern.pattern_type,
            created_at: pattern.created_at
          }))
          setSavedPatterns(convertedPatterns)
        }
      }
    } catch (error) {
      console.error('Error saving pattern:', error)
    }
  }

  const openSaveTrackPatternDialog = (track: Track) => {
    setSelectedTrackForPattern(track)
    setPatternName('')
    setPatternDescription('')
    setPatternCategory('')
    setPatternTags('')
    setShowSaveTrackPatternDialog(true)
  }

  const handleSaveTrackPatternSubmit = async () => {
    if (!patternName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a pattern name",
        variant: "destructive"
      })
      return
    }
    
    if (!selectedTrackForPattern) {
      toast({
        title: "Validation Error",
        description: "No track selected",
        variant: "destructive"
      })
      return
    }
    
    try {
      const tags = patternTags.trim() ? patternTags.split(',').map(tag => tag.trim()) : []
      await handleSaveTrackPattern(selectedTrackForPattern.id, patternName.trim(), patternDescription.trim(), patternCategory.trim(), tags, selectedGenreId === 'none' ? '' : selectedGenreId, selectedSubgenre === 'none' ? '' : selectedSubgenre)
      setShowSaveTrackPatternDialog(false)
      setSelectedTrackForPattern(null)
      
      // Reset genre/subgenre selection
      setSelectedGenreId('none')
      setSelectedSubgenre('none')
      
      // Refresh the patterns list after saving
      await refreshSavedPatterns()
    } catch (error) {
      console.error('Error saving track pattern:', error)
    }
  }
  
  // Function to refresh saved patterns from database
  const refreshSavedPatterns = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: patterns, error } = await supabase
        .from('saved_patterns')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error refreshing saved patterns:', error)
        return
      }

      // Convert database patterns to the format expected by the UI
      const convertedPatterns = patterns.map(pattern => ({
        id: pattern.id,
        name: pattern.name,
        tracks: pattern.tracks || [],
        sequencerData: pattern.sequencer_data || pattern.sequencerData || {},
        bpm: pattern.bpm,
        transportKey: 'C', // Default transport key
        steps: pattern.steps,
        genre_id: pattern.genre_id,
        subgenre: pattern.subgenre,
        category: pattern.category,
        description: pattern.description,
        tags: pattern.tags,
        pattern_type: pattern.pattern_type,
        created_at: pattern.created_at
      }))

      setSavedPatterns(convertedPatterns)
    } catch (error) {
      console.error('Error refreshing saved patterns:', error)
    }
  }

  // Load a pattern into the sequencer
  const loadPattern = (patternId: string) => {
    const pattern = savedPatterns.find(p => p.id === patternId)
    if (pattern) {
      // Turn off Strata mode when a template/pattern is loaded
      setIsAutoMode(false)
      
      // Load pattern BPM, transport key, and steps
      setBpm(pattern.bpm)
      setTransportKey(pattern.transportKey || 'C')
      setSteps(pattern.steps)
      setLastLoadedPattern(patternId)
      
      // Load sequencer data
      if (pattern.sequencerData) {
        // Create a mapping from pattern track IDs to current sequencer track IDs
        const trackIdMapping: { [patternTrackId: number]: number } = {}
        
        if (pattern.tracks && pattern.tracks.length > 0) {
          // Map pattern tracks to sequencer tracks by name and type
          pattern.tracks.forEach((patternTrack: any, index: number) => {
            const patternTrackId = patternTrack.id
            
            // Try to find matching track by name first
            let matchingTrack = tracks.find(track => 
              track.name.toLowerCase() === patternTrack.name.toLowerCase()
            )
            
            // If no name match, try to find by audio type
            if (!matchingTrack && patternTrack.audio_type) {
              matchingTrack = tracks.find(track => 
                track.audio_type === patternTrack.audio_type
              )
            }
            
            // If still no match, use track by position (index)
            if (!matchingTrack && index < tracks.length) {
              matchingTrack = tracks[index]
            }
            
            if (matchingTrack) {
              trackIdMapping[patternTrackId] = matchingTrack.id
              console.log(`Mapped pattern track ${patternTrackId} (${patternTrack.name}) to sequencer track ${matchingTrack.id} (${matchingTrack.name})`)
            }
          })
        }
        
        // Merge the pattern data with existing sequencer data using the mapping
        setSequencerDataFromSession(prev => {
          const mergedData = { ...prev }
          
          // Map pattern track IDs to current sequencer track IDs
          Object.keys(pattern.sequencerData).forEach(patternTrackIdStr => {
            const patternTrackId = parseInt(patternTrackIdStr)
            const sequencerTrackId = trackIdMapping[patternTrackId]
            
            if (sequencerTrackId && pattern.sequencerData[patternTrackId]) {
              mergedData[sequencerTrackId] = pattern.sequencerData[patternTrackId]
              console.log(`Mapped sequencer data from pattern track ${patternTrackId} to sequencer track ${sequencerTrackId}`)
            }
          })
          
          console.log('Final merged sequencer data:', mergedData)
          return mergedData
        })
      } else {
        console.warn(`Pattern "${pattern.name}" has no sequencer data`)
        // Don't clear existing data if pattern has no sequencer data
      }
      
      // Update track metadata if available
      if (pattern.tracks && pattern.tracks.length > 0) {
        console.log('Updating track metadata from pattern:', pattern.tracks)
        
        setTracks(prev => prev.map(track => {
          // Find matching track in pattern by name or audio type
          const patternTrack = pattern.tracks.find((pt: any) => 
            pt.name.toLowerCase() === track.name.toLowerCase() ||
            (pt.audio_type && pt.audio_type === track.audio_type)
          )
          
          if (patternTrack) {
            console.log(`Updating track ${track.name} with metadata from pattern:`, patternTrack)
            return {
              ...track,
              // Update track metadata
              name: patternTrack.name || track.name,
              bpm: patternTrack.bpm || track.bpm,
              key: patternTrack.key || track.key,
              audio_type: patternTrack.audio_type || track.audio_type,
              tags: patternTrack.tags || track.tags,
              // Update tempo and pitch properties
              originalBpm: patternTrack.originalBpm || patternTrack.bpm || track.originalBpm,
              currentBpm: patternTrack.currentBpm || patternTrack.bpm || track.currentBpm,
              playbackRate: patternTrack.playbackRate || track.playbackRate,
              originalKey: patternTrack.originalKey || patternTrack.key || track.originalKey,
              currentKey: patternTrack.currentKey || patternTrack.key || track.currentKey,
              pitchShift: patternTrack.pitchShift || track.pitchShift,
              // Update color if available
              color: patternTrack.color || track.color,
              // Update MIDI notes if available
              midiNotes: patternTrack.midiNotes || track.midiNotes
            }
          }
          return track
        }))
      }
      
      // Show feedback notification
      console.log(`Loaded pattern: ${pattern.name}`)
    }
  }

  // Load pattern from database
  const handleLoadPattern = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to load patterns')
        return
      }

      // Fetch user's saved patterns
      const { data: patterns, error } = await supabase
        .from('saved_patterns')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading patterns:', error)
        alert('Failed to load patterns')
        return
      }

      if (!patterns || patterns.length === 0) {
        alert('No saved patterns found. Save some patterns first!')
        return
      }

      setAvailablePatterns(patterns)
      setSelectedPatternToLoad(null)
      setShowLoadPatternDialog(true)
      
    } catch (error) {
      console.error('Error loading pattern:', error)
      alert('Failed to load patterns')
    }
  }

  // Shared function to map track names to pattern types
  const getPatternTypeForTrack = (trackName: string) => {
    const name = trackName.toLowerCase()
    if (name.includes('hi-hat') || name.includes('hihat')) {
      return 'hihat loop'
    } else if (name.includes('kick')) {
      return 'kick'
    } else if (name.includes('snare')) {
      return 'snare'
    } else if (name.includes('clap')) {
      return 'clap'
    } else if (name.includes('tom')) {
      return 'tom'
    } else if (name.includes('crash')) {
      return 'crash'
    } else if (name.includes('ride')) {
      return 'ride'
    } else if (name.includes('808')) {
      return '808'
    } else if (name.includes('bass')) {
      return 'bass loop'
    } else if (name.includes('melody')) {
      return 'melody loop'
    } else if (name.includes('lead')) {
      return 'lead'
    } else if (name.includes('pad')) {
      return 'pad'
    } else if (name.includes('arp')) {
      return 'arp'
    } else if (name.includes('chord')) {
      return 'chord'
    } else if (name.includes('fx') || name.includes('effect')) {
      return 'fx'
    } else if (name.includes('percussion') || name.includes('perc')) {
      return 'percussion'
    } else if (name.includes('vocal')) {
      return 'vocal'
    } else {
      return name // fallback to track name
    }
  }

  // Load patterns for a specific track type
  const handleLoadTrackPattern = async (trackId: number) => {
    const track = tracks.find(t => t.id === trackId)
    if (!track) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to load patterns')
        return
      }

      const patternType = getPatternTypeForTrack(track.name)
      console.log(`[LOAD PATTERN] Track: ${track.name}, Looking for pattern type: ${patternType}`)

      // Fetch patterns filtered by pattern type
      const { data: patterns, error } = await supabase
        .from('saved_patterns')
        .select('*')
        .eq('user_id', user.id)
        .eq('pattern_type', patternType)
        .order('created_at', { ascending: false })

      console.log(`[LOAD PATTERN] Query result: ${patterns?.length || 0} patterns found`)
      if (patterns && patterns.length > 0) {
        console.log(`[LOAD PATTERN] Found patterns:`, patterns.map(p => ({ id: p.id, name: p.name, pattern_type: p.pattern_type })))
      }

      if (error) {
        console.error('Error loading patterns:', error)
        alert('Failed to load patterns')
        return
      }

      if (!patterns || patterns.length === 0) {
        // Try a broader search with partial matching
        console.log(`[LOAD PATTERN] No exact matches for "${patternType}", trying broader search...`)
        
        const { data: broaderPatterns, error: broaderError } = await supabase
          .from('saved_patterns')
          .select('*')
          .eq('user_id', user.id)
          .ilike('pattern_type', `%${patternType.split(' ')[0]}%`) // Search for first word of pattern type
          .order('created_at', { ascending: false })
        
        if (broaderError) {
          console.error('Error in broader pattern search:', broaderError)
        }
        
        if (broaderPatterns && broaderPatterns.length > 0) {
          console.log(`[LOAD PATTERN] Found ${broaderPatterns.length} patterns with broader search:`, broaderPatterns.map(p => ({ id: p.id, name: p.name, pattern_type: p.pattern_type })))
          setAvailablePatterns(broaderPatterns)
          setSelectedPatternToLoad(null)
          setShowLoadPatternDialog(true)
          return
        }
        
        alert(`No ${patternType} patterns found. Save some ${patternType} patterns first!`)
        console.log(`[LOAD PATTERN] No patterns found for type: ${patternType} (even with broader search)`)
        return
      }

      setAvailablePatterns(patterns)
      setSelectedPatternToLoad(null)
      setShowLoadPatternDialog(true)
      
    } catch (error) {
      console.error('Error loading track patterns:', error)
      alert('Failed to load patterns')
    }
  }

  const handleLoadPatternSubmit = async () => {
    if (!selectedPatternToLoad) {
      alert('Please select a pattern to load')
      return
    }

    const selectedPattern = availablePatterns.find(p => p.id === selectedPatternToLoad)
    if (!selectedPattern) {
      alert('Selected pattern not found')
      return
    }

    // Debug: Log the pattern data to see what we're getting
    console.log('Selected pattern data:', selectedPattern)
    console.log('Pattern tracks:', selectedPattern.tracks)
    console.log('Pattern sequencerData:', selectedPattern.sequencerData)
    console.log('Pattern sequencer_data:', selectedPattern.sequencer_data)
    console.log('Current tracks in sequencer:', tracks)
    
    // Turn off Strata mode when a template/pattern is loaded
    setIsAutoMode(false)
    
    // Load pattern BPM and steps
    setBpm(selectedPattern.bpm)
    setSteps(selectedPattern.steps)
    
    // Try both camelCase and snake_case property names
    const patternSequencerData = selectedPattern.sequencerData || selectedPattern.sequencer_data
    
    // Ensure sequencerData is not null/undefined before loading
    if (patternSequencerData) {
      console.log('Loading sequencer data:', patternSequencerData)
      
      // Create a mapping from pattern track IDs to current sequencer track IDs
      const trackIdMapping: { [patternTrackId: number]: number } = {}
      
      if (selectedPattern.tracks && selectedPattern.tracks.length > 0) {
        // Map pattern tracks to sequencer tracks by name and type
        selectedPattern.tracks.forEach((patternTrack: any, index: number) => {
          const patternTrackId = patternTrack.id
          
          // Try to find matching track by name first
          let matchingTrack = tracks.find(track => 
            track.name.toLowerCase() === patternTrack.name.toLowerCase()
          )
          
          // If no name match, try to find by audio type
          if (!matchingTrack && patternTrack.audio_type) {
            matchingTrack = tracks.find(track => 
              track.audio_type === patternTrack.audio_type
            )
          }
          
          // If still no match, use track by position (index)
          if (!matchingTrack && index < tracks.length) {
            matchingTrack = tracks[index]
          }
          
          if (matchingTrack) {
            trackIdMapping[patternTrackId] = matchingTrack.id
            console.log(`Mapped pattern track ${patternTrackId} (${patternTrack.name}) to sequencer track ${matchingTrack.id} (${matchingTrack.name})`)
          }
        })
      }
      
      // Merge the pattern data with existing sequencer data using the mapping
      setSequencerDataFromSession(prev => {
        const mergedData = { ...prev }
        
        // Map pattern track IDs to current sequencer track IDs
        Object.keys(patternSequencerData).forEach(patternTrackIdStr => {
          const patternTrackId = parseInt(patternTrackIdStr)
          const sequencerTrackId = trackIdMapping[patternTrackId]
          
          if (sequencerTrackId && patternSequencerData[patternTrackId]) {
            mergedData[sequencerTrackId] = patternSequencerData[patternTrackId]
            console.log(`Mapped sequencer data from pattern track ${patternTrackId} to sequencer track ${sequencerTrackId}`)
          }
        })
        
        console.log('Final merged sequencer data:', mergedData)
        return mergedData
      })
    } else {
      console.warn(`Pattern "${selectedPattern.name}" has no sequencer data`)
      // Don't clear existing data if pattern has no sequencer data
    }
    
    // Update track metadata if the pattern has track information
    if (selectedPattern.tracks && selectedPattern.tracks.length > 0) {
      console.log('Updating track metadata from pattern:', selectedPattern.tracks)
      
      setTracks(prev => prev.map(track => {
        // Find matching track in pattern by name or audio type
        const patternTrack = selectedPattern.tracks.find((pt: any) => 
          pt.name.toLowerCase() === track.name.toLowerCase() ||
          (pt.audio_type && pt.audio_type === track.audio_type)
        )
        
        if (patternTrack) {
          console.log(`Updating track ${track.name} with metadata from pattern:`, patternTrack)
          return {
            ...track,
            // Update track metadata
            name: patternTrack.name || track.name,
            bpm: patternTrack.bpm || track.bpm,
            key: patternTrack.key || track.key,
            audio_type: patternTrack.audio_type || track.audio_type,
            tags: patternTrack.tags || track.tags,
            // Update tempo and pitch properties
            originalBpm: patternTrack.originalBpm || patternTrack.bpm || track.originalBpm,
            currentBpm: patternTrack.currentBpm || patternTrack.bpm || track.currentBpm,
            playbackRate: patternTrack.playbackRate || track.playbackRate,
            originalKey: patternTrack.originalKey || patternTrack.key || track.originalKey,
            currentKey: patternTrack.currentKey || patternTrack.key || track.currentKey,
            pitchShift: patternTrack.pitchShift || track.pitchShift,
            // Update color if available
            color: patternTrack.color || track.color,
            // Update MIDI notes if available
            midiNotes: patternTrack.midiNotes || track.midiNotes
          }
        }
        return track
      }))
    }
    
    // Show success message
    showNotification('Success', `Loaded pattern: ${selectedPattern.name}`, 'success')
    console.log(`Loaded pattern "${selectedPattern.name}" - sequencer data and track metadata updated`)
    
    // Always go to sequencer tab after loading a pattern (with a small delay to ensure state updates)
    setTimeout(() => {
      setActiveTab('sequencer')
    }, 100)
    
    setShowLoadPatternDialog(false)
  }

  // Mixer control functions
  const updateMixerSetting = (trackId: number, setting: string, value: any) => {
    setMixerSettings(prev => ({
      ...prev,
      [trackId]: {
        ...prev[trackId],
        [setting]: value
      }
    }))

    // Apply volume changes to audio players in real-time
    if (setting === 'volume') {
      const trackSettings = mixerSettings[trackId]
      const isMuted = trackSettings?.mute || false
      
      if (!isMuted) {
        // Calculate combined volume (track volume * master volume) with safety check
        const combinedVolume = value * masterVolume
        let volumeDb = -Infinity
        if (combinedVolume > 0) {
          volumeDb = Math.max(-60, 20 * Math.log10(combinedVolume)) // Clamp to -60dB minimum
        }
        
        // Update regular sequencer players
        if (samplesRef?.current?.[trackId]) {
          const player = samplesRef.current[trackId]
          if (player && player.volume) {
            player.volume.value = volumeDb
            console.log(`[MIXER] Set track ${trackId} volume to ${value} (combined: ${combinedVolume}, ${volumeDb.toFixed(2)}dB)`)
          }
        }


      }
    }

    // Apply mute changes to audio players in real-time
    if (setting === 'mute') {
      // Synchronize with track mute state
      setTracks(prev => prev.map(track => 
        track.id === trackId ? { ...track, mute: value } : track
      ))
      
      if (samplesRef?.current?.[trackId]) {
        const player = samplesRef.current[trackId]
        if (player && player.volume) {
          if (value) {
            // Mute: set volume to -Infinity
            player.volume.value = -Infinity
            console.log(`[MIXER] Muted track ${trackId}`)
          } else {
            // Unmute: restore volume from mixer settings
            const trackSettings = mixerSettings[trackId]
            if (trackSettings) {
              let volumeDb = -Infinity
              if (trackSettings.volume > 0) {
                volumeDb = Math.max(-60, 20 * Math.log10(trackSettings.volume)) // Clamp to -60dB minimum
              }
              player.volume.value = volumeDb
              console.log(`[MIXER] Unmuted track ${trackId}, restored volume to ${trackSettings.volume}`)
            }
          }
        }
      }
    }


    
    // Mark session as changed so mixer settings are saved
    markSessionChanged()
  }



  const updateEQ = (trackId: number, band: 'low' | 'mid' | 'high', value: number) => {
    console.log(`[EQ UPDATE] Updating ${band} band to ${value}dB for track ${trackId}`)
    
    setMixerSettings(prev => {
      const newSettings = {
        ...prev,
        [trackId]: {
          ...prev[trackId],
          eq: {
            ...prev[trackId]?.eq,
            [band]: value
          }
        }
      }
      console.log(`[EQ UPDATE] New mixer settings for track ${trackId}:`, newSettings[trackId])
      return newSettings
    })

    // Apply EQ to the audio player
    const player = samplesRef?.current?.[trackId]
    if (player) {
      // Get current EQ settings from the updated state
      const currentSettings = mixerSettings[trackId]?.eq || { low: 0, mid: 0, high: 0 }
      const newSettings = { ...currentSettings, [band]: value }
      
      console.log(`[EQ UPDATE] Applying EQ settings to player:`, newSettings)
      
      // Apply EQ using Tone.js filters
      applyEQToPlayer(player, trackId, newSettings)
      console.log(`[EQ] Applied ${band} band EQ (${value}dB) to track ${trackId}`)
    } else {
      console.warn(`[EQ UPDATE] No player found for track ${trackId}`)
    }
  }

  // Function to apply EQ settings to a Tone.js player
  const applyEQToPlayer = (player: any, trackId: number, eqSettings: { low: number, mid: number, high: number }) => {
    // Import Tone.js dynamically
    import('tone').then(Tone => {
      console.log('[EQ] Applying EQ settings to track', trackId, ':', eqSettings)
      
      // Get the pitch shifter that the player is connected to
      const pitchShifter = pitchShiftersRef?.current?.[trackId] as any
      
      if (!pitchShifter) {
        console.warn('[EQ] No pitch shifter found for track', trackId)
        return
      }
      
      // Clean up existing EQ chain if it exists
      if (player._eqChain) {
        player._eqChain.forEach((node: any) => {
          try {
            if (node && typeof node.disconnect === 'function') {
              node.disconnect()
            }
            if (node && typeof node.dispose === 'function') {
              node.dispose()
            }
          } catch (error) {
            console.warn('[EQ] Error disposing EQ node:', error)
          }
        })
        player._eqChain = []
      }
      
      // Check if any EQ settings are active
      const hasEQ = eqSettings.low !== 0 || eqSettings.mid !== 0 || eqSettings.high !== 0
      
      if (hasEQ) {
        // Create a proper 3-band EQ using serial processing
        const eqChain = []
        
        // Create input gain
        const inputGain = new Tone.Gain()
        inputGain.gain.value = 1
        eqChain.push(inputGain)
        
        // Low band - Low Shelf Filter (affects frequencies below 200Hz)
        if (eqSettings.low !== 0) {
          const lowShelf = new Tone.Filter({
            type: 'lowshelf',
            frequency: 200,
            gain: eqSettings.low
          })
          eqChain.push(lowShelf)
          console.log('[EQ] Created low shelf at 200Hz with gain:', eqSettings.low, 'dB')
        }
        
        // Mid band - Peaking Filter (affects frequencies around 1kHz)
        if (eqSettings.mid !== 0) {
          const midPeak = new Tone.Filter({
            type: 'peaking',
            frequency: 1000,
            Q: 1,
            gain: eqSettings.mid
          })
          eqChain.push(midPeak)
          console.log('[EQ] Created mid peak at 1kHz with gain:', eqSettings.mid, 'dB')
        }
        
        // High band - High Shelf Filter (affects frequencies above 4kHz)
        if (eqSettings.high !== 0) {
          const highShelf = new Tone.Filter({
            type: 'highshelf',
            frequency: 4000,
            gain: eqSettings.high
          })
          eqChain.push(highShelf)
          console.log('[EQ] Created high shelf at 4kHz with gain:', eqSettings.high, 'dB')
        }
        
        // Create output gain
        const outputGain = new Tone.Gain()
        outputGain.gain.value = 1
        eqChain.push(outputGain)
        
        // Connect the EQ chain in series
        let currentNode = pitchShifter
        eqChain.forEach(node => {
          currentNode.connect(node)
          currentNode = node
        })
        
        // Connect the final node to destination
        currentNode.toDestination()
        
        // Store the EQ chain for later cleanup
        player._eqChain = eqChain
        console.log('[EQ] Connected EQ chain with', eqChain.length, 'nodes in series')
        console.log('[EQ] Applied EQ settings successfully')
      } else {
        // No EQ, connect pitch shifter directly to destination
        pitchShifter.toDestination()
        player._eqChain = []
        console.log('[EQ] No EQ settings, connected pitch shifter directly to destination')
      }
      
    }).catch(error => {
      console.error('[EQ] Failed to apply EQ settings:', error)
    })
  }

  const updateEffect = (trackId: number, effect: 'reverb' | 'delay', value: number) => {
    setMixerSettings(prev => ({
      ...prev,
      [trackId]: {
        ...prev[trackId],
        effects: {
          ...prev[trackId]?.effects,
          [effect]: value
        }
      }
    }))
  }

  const toggleTrackMute = (trackId: number) => {
    const currentMute = mixerSettings[trackId]?.mute || false
    updateMixerSetting(trackId, 'mute', !currentMute)
  }

  // Master volume control function
  const handleMasterVolumeChange = (value: number) => {
    setMasterVolume(value)
    // Add to undo/redo history
    undoRedo.addToHistory(captureCurrentState(), `Change master volume to ${value}`)
    
    // Apply master volume to all tracks
    tracks.forEach(track => {
      const trackSettings = mixerSettings[track.id]
      if (trackSettings && !trackSettings.mute) {
        // Calculate combined volume (track volume * master volume)
        const combinedVolume = trackSettings.volume * value
        const volumeDb = combinedVolume === 0 ? -Infinity : 20 * Math.log10(combinedVolume)
        
        // Update regular sequencer players
        if (samplesRef?.current?.[track.id]) {
          const player = samplesRef.current[track.id]
          if (player && player.volume) {
            player.volume.value = volumeDb
          }
        }
        

      }
    })
    
    console.log(`[MIXER] Set master volume to ${value} (${(20 * Math.log10(value)).toFixed(2)}dB)`)
  }

  // Color mapping for pattern blocks
  const getTrackColorHex = (colorClass: string) => {
    const colorMap: {[key: string]: string} = {
      'bg-red-500': '#ef4444',
      'bg-blue-500': '#3b82f6',
      'bg-green-500': '#22c55e',
      'bg-purple-500': '#a855f7',
      'bg-yellow-500': '#eab308',
      'bg-pink-500': '#ec4899',
      'bg-indigo-500': '#6366f1',
      'bg-orange-500': '#f97316',
      'bg-teal-500': '#14b8a6',
      'bg-cyan-500': '#06b6d4',
      'bg-lime-500': '#84cc16',
      'bg-rose-500': '#f43f5e'
    }
    return colorMap[colorClass] || '#6b7280'
  }

  // VU Meter component
  const VUMeter = ({ level, peak, height = 80 }: { level: number, peak: number, height?: number }) => {
    const segments = 12
    const segmentHeight = height / segments
    
    return (
      <div className="w-4 mx-auto" style={{ height: `${height}px` }}>
        <div className="relative w-full h-full bg-black border border-gray-600 rounded">
          {Array.from({ length: segments }, (_, i) => {
            const segmentLevel = (segments - i) / segments
            const isActive = level >= segmentLevel
            const isPeak = peak >= segmentLevel
            
            // Color coding: yellow (0-60%), yellow (60-85%), red (85-100%)
            let color = 'bg-gray-800'
            if (isActive || isPeak) {
              if (segmentLevel > 0.85) color = 'bg-red-500'
              else if (segmentLevel > 0.6) color = 'bg-yellow-500'
              else color = 'bg-yellow-500'
            }
            
            // Peak indicator styling
            if (isPeak && !isActive) {
              color += ' opacity-70'
            }
            
            return (
              <div
                key={i}
                className={`absolute w-full ${color} transition-colors duration-75`}
                style={{
                  height: `${segmentHeight - 1}px`,
                  top: `${i * segmentHeight}px`,
                }}
              />
            )
          })}
        </div>
      </div>
    )
  }



  const handlePlayPause = () => {
    console.log(`[MAIN TRANSPORT] Play/Pause called. isPlaying: ${isPlaying}, arrangementPlaying: ${isArrangementPlaying}, pianoRollData:`, pianoRollData)
    
    // If arrangement is playing, stop it first
    if (isArrangementPlaying) {
      console.log('[MAIN TRANSPORT] Stopping arrangement before starting sequencer')
      setIsArrangementPlaying(false)
      // The arrangement will handle its own cleanup via the callback
    }
    
    if (isPlaying) {
      stopSequence()
    } else {
      playSequence()
    }
  }

  const handleReset = () => {
    stopSequence()
    setCurrentStep(0)
    

  }

  const handleTrackAudioSelect = (trackId: number, audioUrlOrPath: string, audioName?: string, metadata?: {
    bpm?: number
    key?: string
    audio_type?: string
    tags?: string[]
    audioFileId?: string // Add audio file ID to metadata
  }) => {
    const publicUrl = getPublicAudioUrl(audioUrlOrPath)
    console.log(`[AUDIO SELECT] Assigning audio to track ${trackId}: ${audioName} (${publicUrl})`)
    
    setTracks(prev => prev.map(track => 
      track.id === trackId ? { 
        ...track, 
        audioUrl: publicUrl,
        audioName: audioName || null,
        audioFileId: metadata?.audioFileId || null, // Store audio file ID
        // Initialize tempo properties with default values or use metadata
        originalBpm: metadata?.bpm || 120, // Use metadata BPM if available
        currentBpm: metadata?.bpm || 120,  // Use metadata BPM if available
        playbackRate: 1.0,                 // ALWAYS start with normal playback rate
        // Initialize pitch properties with default values or use metadata
        originalKey: metadata?.key || 'C', // Use metadata key if available
        currentKey: metadata?.key || 'C',
        pitchShift: 0,
        // Store metadata
        bpm: metadata?.bpm,
        key: metadata?.key,
        audio_type: metadata?.audio_type,
        tags: metadata?.tags
      } : track
    ))
    setShowSampleLibrary(false)
    setSelectedTrack(null)
    markSessionChanged()
  }

  const handleOpenSampleLibrary = (trackId: number) => {
    setSelectedTrack(trackId)
    setShowSampleLibrary(true)
  }

  const handleOpenPianoRoll = (trackId: number) => {
    setPianoRollTrack(trackId)
    setShowPianoRoll(true)
  }

  const handlePianoRollNotesChange = (trackId: number, notes: any[]) => {
    setTracks(prev => prev.map(track => 
      track.id === trackId ? { ...track, midiNotes: notes } : track
    ))
  }



  const handleOpenTrackPianoRoll = (trackId: number) => {
    const track = tracks.find(t => t.id === trackId)
    if (track && track.audioUrl) {
      setTrackPianoRollTrack(track)
      // Load existing piano roll notes for this track
      const existingNotes = pianoRollData[trackId] || []
      setTrackPianoRollNotes(existingNotes)
      setShowTrackPianoRoll(true)
    }
  }

  const handleCloseTrackPianoRoll = () => {
    console.log(`[PIANO ROLL CLOSE] Closing piano roll for track ${trackPianoRollTrack?.name}, final notes:`, trackPianoRollNotes)
    // Make sure the final notes are saved before closing
    if (trackPianoRollTrack && trackPianoRollNotes.length > 0) {
      updatePianoRollData(trackPianoRollTrack.id, trackPianoRollNotes)
    }
    setShowTrackPianoRoll(false)
    setTrackPianoRollTrack(null)
  }

  const handleTrackPianoRollNotesChange = (notes: any[]) => {
    setTrackPianoRollNotes(notes)
    // Update the piano roll data in the hook for the current track
    if (trackPianoRollTrack) {
      console.log(`[PIANO ROLL UPDATE] Updating track ${trackPianoRollTrack.name} with ${notes.length} notes:`, notes)
      updatePianoRollData(trackPianoRollTrack.id, notes)
    }
    markSessionChanged()
  }

  const handleTrackTempoChange = (trackId: number, newBpm: number, originalBpm?: number) => {
    // Find the current track to understand what's changing
    const currentTrack = tracks.find(t => t.id === trackId)
    if (!currentTrack) return
    
    // Check if this is an Original BPM change (originalBpm parameter is provided and different from current)
    const isOriginalBpmChange = originalBpm !== undefined && originalBpm !== currentTrack.originalBpm
    
    console.log(`[TEMPO CHANGE] Track: ${currentTrack.name}`)
    console.log(`[TEMPO CHANGE] Is Original BPM change: ${isOriginalBpmChange}`)
    console.log(`[TEMPO CHANGE] Old original BPM: ${currentTrack.originalBpm}, New original BPM: ${originalBpm}`)
    console.log(`[TEMPO CHANGE] Current BPM: ${currentTrack.currentBpm}, New BPM: ${newBpm}`)
    
    // Update the tempo in the hook and get the calculated values
    const tempoData = updateTrackTempo(trackId, newBpm, originalBpm)
    
    if (tempoData) {
      // Update the tracks state with the new tempo values
      setTracks(prev => prev.map(track => 
        track.id === trackId ? { 
          ...track, 
          originalBpm: tempoData.originalBpm,
          currentBpm: tempoData.currentBpm,
          playbackRate: tempoData.playbackRate
        } : track
      ))
      

      
      // If this is an Original BPM change, update the database
      if (isOriginalBpmChange && currentTrack.audioUrl) {
        updateAudioFileBpmInDatabase(currentTrack, tempoData.originalBpm)
      }
      
      // Only force reload if there's a significant change in playback rate
      const currentPlaybackRate = currentTrack.playbackRate || 1.0
      const newPlaybackRate = tempoData.playbackRate || 1.0
      const playbackRateChange = Math.abs(newPlaybackRate - currentPlaybackRate)
      
      if (playbackRateChange > 0.001) {
        console.log(`[TEMPO CHANGE] Significant playback rate change detected: ${currentPlaybackRate} -> ${newPlaybackRate} (change: ${playbackRateChange.toFixed(4)})`)
        
        // Auto-reload will handle the audio reload automatically via useEffect
        console.log(`[TEMPO CHANGE] Track state updated - auto-reload will handle audio reload`)
        
        // Schedule quantization after auto-reload completes
        setTimeout(() => {
          quantizeTrackTiming(trackId)
        }, 500) // Increased delay to allow auto-reload to complete
      } else {
        console.log(`[TEMPO CHANGE] No significant playback rate change (${playbackRateChange.toFixed(4)}), skipping reload`)
      }
    }
  }



  // Function to update the BPM of an audio file in the database
  const updateAudioFileBpmInDatabase = async (track: Track, newBpm: number) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.warn('[DATABASE UPDATE] User not authenticated, cannot update database')
        return
      }

      // Extract the file path from the audio URL to find the database record
      // The URL format is typically: https://.../audio-library/user_id_filename.ext
      const audioUrl = track.audioUrl
      if (!audioUrl) {
        console.warn('[DATABASE UPDATE] No audio URL found for track')
        return
      }

      // Try to find the audio file in the database by matching the URL
      const { data: audioFiles, error: fetchError } = await supabase
        .from('audio_library_items')
        .select('id, name, file_url, bpm')
        .eq('user_id', user.id)
        .eq('file_url', audioUrl)

      if (fetchError) {
        console.error('[DATABASE UPDATE] Error fetching audio file:', fetchError)
        return
      }

      if (!audioFiles || audioFiles.length === 0) {
        console.warn(`[DATABASE UPDATE] No audio file found in database for URL: ${audioUrl}`)
        return
      }

      // Update the BPM for the found audio file
      const audioFile = audioFiles[0]
      const { error: updateError } = await supabase
        .from('audio_library_items')
        .update({ 
          bpm: newBpm,
          updated_at: new Date().toISOString()
        })
        .eq('id', audioFile.id)
        .eq('user_id', user.id)

      if (updateError) {
        console.error('[DATABASE UPDATE] Error updating BPM in database:', updateError)
        return
      }

      console.log(`[DATABASE UPDATE] Successfully updated BPM for "${audioFile.name}" from ${audioFile.bpm || 'unknown'} to ${newBpm}`)
      
      // Show a subtle notification to the user
      toast({
        title: "BPM Updated",
        description: `Updated "${audioFile.name}" BPM from ${audioFile.bpm || 'unknown'} to ${newBpm}`,
        duration: 3000,
      })
      
    } catch (error) {
      console.error('[DATABASE UPDATE] Unexpected error updating BPM:', error)
    }
  }

  const handleTrackPitchChange = (trackId: number, pitchShift: number, originalKey?: string, currentKey?: string) => {
    // Find the current track to understand what's changing
    const currentTrack = tracks.find(t => t.id === trackId)
    if (!currentTrack) return
    
    // Check if this is an Original Key change (originalKey parameter is provided and different from current)
    const isOriginalKeyChange = originalKey !== undefined && originalKey !== currentTrack.originalKey
    
    console.log(`[PITCH CHANGE] Track: ${currentTrack.name}`)
    console.log(`[PITCH CHANGE] Is Original Key change: ${isOriginalKeyChange}`)
    console.log(`[PITCH CHANGE] Old original Key: ${currentTrack.originalKey}, New original Key: ${originalKey}`)
    
    // Update the pitch in the hook and get the calculated values
    const pitchData = updateTrackPitch(trackId, pitchShift, originalKey, currentKey)
    
    if (pitchData) {
      // Update the tracks state with the new pitch values
      setTracks(prev => prev.map(track => 
        track.id === trackId ? { 
          ...track, 
          originalKey: pitchData.originalKey,
          currentKey: pitchData.currentKey,
          pitchShift: pitchData.pitchShift
        } : track
      ))
      
      // If this is an Original Key change, update the database
      if (isOriginalKeyChange && currentTrack.audioUrl) {
        updateAudioFileKeyInDatabase(currentTrack, pitchData.originalKey)
      }
      
      // Recalculate piano roll notes for this track with the new key
      const track = tracks.find(t => t.id === trackId)
      if (track && track.pianoRollNotes && track.pianoRollNotes.length > 0) {
        const recalculatedNotes = track.pianoRollNotes.map(note => ({
          ...note,
          pitchShift: calculatePitchShift(pitchData.originalKey || 'C', note.note.replace(/\d/, ''))
        }))
        
        // Update piano roll data with recalculated notes
        updatePianoRollData(trackId, recalculatedNotes)
      }
    }
  }

  // Function to update the Key of an audio file in the database
  const updateAudioFileKeyInDatabase = async (track: Track, newKey: string) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.warn('[DATABASE UPDATE] User not authenticated, cannot update database')
        return
      }

      // Extract the file path from the audio URL to find the database record
      const audioUrl = track.audioUrl
      if (!audioUrl) {
        console.warn('[DATABASE UPDATE] No audio URL found for track')
        return
      }

      // Try to find the audio file in the database by matching the URL
      const { data: audioFiles, error: fetchError } = await supabase
        .from('audio_library_items')
        .select('id, name, file_url, key')
        .eq('user_id', user.id)
        .eq('file_url', audioUrl)

      if (fetchError) {
        console.error('[DATABASE UPDATE] Error fetching audio file:', fetchError)
        return
      }

      if (!audioFiles || audioFiles.length === 0) {
        console.warn(`[DATABASE UPDATE] No audio file found in database for URL: ${audioUrl}`)
        return
      }

      // Update the Key for the found audio file
      const audioFile = audioFiles[0]
      const { error: updateError } = await supabase
        .from('audio_library_items')
        .update({ 
          key: newKey,
          updated_at: new Date().toISOString()
        })
        .eq('id', audioFile.id)
        .eq('user_id', user.id)

      if (updateError) {
        console.error('[DATABASE UPDATE] Error updating Key in database:', updateError)
        return
      }

      console.log(`[DATABASE UPDATE] Successfully updated Key for "${audioFile.name}" from ${audioFile.key || 'unknown'} to ${newKey}`)
      
      // Show a subtle notification to the user
      toast({
        title: "Key Updated",
        description: `Updated "${audioFile.name}" key from ${audioFile.key || 'unknown'} to ${newKey}`,
        duration: 3000,
      })
      
    } catch (error) {
      console.error('[DATABASE UPDATE] Unexpected error updating Key:', error)
    }
  }

  // Transport inline editing handlers
  const handleBpmEdit = () => {
    setBpmInputValue(bpm.toString())
    setEditingBpm(true)
  }

  // Function to handle BPM changes (used by both text input and slider)
  const handleBpmChange = (newBpm: number) => {
    if (newBpm >= 60 && newBpm <= 200) {
      setBpm(newBpm)
      markSessionChanged()
      // Add to undo/redo history
      undoRedo.addToHistory(captureCurrentState(), `Change BPM to ${newBpm}`)
      
      // Synchronize Tone.js Transport BPM
      import('tone').then(Tone => {
        Tone.Transport.bpm.value = newBpm
        console.log(`[TRANSPORT BPM] Tone.js Transport BPM set to: ${newBpm}`)
      }).catch(console.warn)
      
      // Restart song arrangement if it's playing to sync with new BPM

      
      // Synchronize loop tracks when transport BPM changes
      // BUT respect M-T/T-M mode - only sync tracks in T-M mode
      console.log(`[TRANSPORT BPM] Current melody loop mode: ${melodyLoopMode}`)
      console.log(`[TRANSPORT BPM] Available tracks:`, tracks.map(t => ({ id: t.id, name: t.name, hasAudio: !!t.audioUrl, originalBpm: t.originalBpm })))
      
      if (melodyLoopMode === 'transport-dominates') {
        console.log(`[TRANSPORT BPM] T-M mode: Syncing loop tracks to new BPM: ${newBpm}`)
        let updatedTracks = 0
        
        tracks.forEach(track => {
          // Only update loop tracks (tracks with "Loop" in their name)
          if (track.audioUrl && track.originalBpm && track.name.toLowerCase().includes('loop')) {
            console.log(`[TRANSPORT BPM] Updating loop track: ${track.name} (ID: ${track.id})`)
            console.log(`[TRANSPORT BPM] Original BPM: ${track.originalBpm}, New BPM: ${newBpm}`)
            
            // Recalculate playback rate for this track
            const newPlaybackRate = newBpm / track.originalBpm
            const precisePlaybackRate = Math.round(newPlaybackRate * 10000) / 10000
            
            console.log(`[TRANSPORT BPM] New playback rate: ${precisePlaybackRate}`)
            console.log(`[TRANSPORT BPM] Time stretch mode: ${timeStretchMode}`)
            console.log(`[TRANSPORT BPM] ${timeStretchMode === 'resampling' ? 'RM: Changing pitch & speed' : 'FT: Changing speed only, keeping original pitch'}`)
            
            // Update track state based on time stretch mode
            setTracks(prev => prev.map(t => 
              t.id === track.id ? { 
                ...t, 
                currentBpm: newBpm,
                playbackRate: precisePlaybackRate,
                // In flex-time mode, keep pitch shift at 0 to maintain original pitch
                // In resampling mode, pitch shift will be calculated based on playback rate
                pitchShift: timeStretchMode === 'flex-time' ? 0 : t.pitchShift
              } : t
            ))
            
            updatedTracks++
            
            // Auto-reload will handle the audio reload automatically via useEffect
            console.log(`[TRANSPORT BPM] Track state updated - auto-reload will handle audio reload`)
          }
        })
        
        console.log(`[TRANSPORT BPM] Updated ${updatedTracks} loop tracks`)
      } else {
        console.log(`[TRANSPORT BPM] M-T mode: Skipping track sync - Melody Loop controls transport`)
      }
      
      // Auto-reload will handle the audio reload automatically via useEffect
      console.log(`[TRANSPORT BPM] Track states updated - auto-reload will handle audio reload`)
    }
  }

  const handleBpmSave = () => {
    const newBpm = parseFloat(bpmInputValue)
    handleBpmChange(newBpm)
    setEditingBpm(false)
  }

  const handleBpmCancel = () => {
    setEditingBpm(false)
    setBpmInputValue('')
  }

  const handlePositionEdit = () => {
    setPositionInputValue((currentStep + 1).toString())
    setEditingPosition(true)
  }

  const handlePositionSave = () => {
    const newPosition = parseInt(positionInputValue)
    if (newPosition >= 1 && newPosition <= steps) {
      setCurrentStep(newPosition - 1) // Convert to 0-based index
    }
    setEditingPosition(false)
  }

  const handlePositionCancel = () => {
    setEditingPosition(false)
    setPositionInputValue('')
  }

  // Reset all audio samples - useful when tracks don't play properly
  const handleResetAllAudio = async () => {
    console.log('[AUDIO RESET] Starting simple audio reset...')
    
    // Show countdown
    const countdownElement = document.getElementById('reset-countdown')
    if (countdownElement) {
      for (let i = 5; i > 0; i--) {
        countdownElement.textContent = `Resetting audio in ${i}...`
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      countdownElement.textContent = 'Resetting...'
    }
    
    // Stop all audio players first
    const audioPlayers = window.audioPlayers
    if (audioPlayers && typeof audioPlayers === 'object') {
      Object.keys(audioPlayers).forEach(trackId => {
        const player = audioPlayers[parseInt(trackId)]
        if (player && player.stop) {
          try {
            player.stop()
            player.dispose()
            console.log(`[AUDIO RESET] Stopped audio player for track ${trackId}`)
          } catch (error) {
            console.warn(`[AUDIO RESET] Error stopping player for track ${trackId}:`, error)
          }
        }
      })
      // Clear the audio players object
      window.audioPlayers = {}
    }
    
    // Reset transport position
    setCurrentStep(0)
    
    // Reset Tone.js Transport
    import('tone').then(Tone => {
      Tone.Transport.stop()
      Tone.Transport.position = 0
      console.log('[AUDIO RESET] Tone.js Transport reset')
    }).catch(console.warn)
    
    // Simple reload - don't change any track settings, just reload the audio
    const tracksWithAudio = tracks.filter(track => track.audioUrl && track.audioUrl !== 'undefined')
    console.log(`[AUDIO RESET] Reloading ${tracksWithAudio.length} tracks with current settings`)
    
    // Auto-reload will handle the audio reload automatically via useEffect
    console.log(`[AUDIO RESET] Track states updated - auto-reload will handle audio reload`)
    
    if (countdownElement) {
      countdownElement.textContent = 'Audio reset complete!'
      setTimeout(() => {
        countdownElement.textContent = ''
      }, 2000)
    }
    
    console.log('[AUDIO RESET] Simple audio reset complete')
  }

  const handleTransportKeyEdit = () => {
    setEditingTransportKey(true)
    setTransportKeyInputValue(transportKey)
  }

  const handleTransportKeySelect = (key: string) => {
    setOriginalKey(key) // Set the original key
    setTransportKey(key) // Set the displayed key
    setPitchShift(0) // Reset pitch shift when manually changing key
    setEditingTransportKey(false)
    markSessionChanged()
  }

  const handleTransportKeySave = () => {
    const newKey = transportKeyInputValue.trim().toUpperCase()
    if (newKey && /^[A-G][#b]?$/.test(newKey)) {
      setOriginalKey(newKey) // Set the original key
      setTransportKey(newKey) // Set the displayed key
      setPitchShift(0) // Reset pitch shift when manually changing key
    }
    setEditingTransportKey(false)
    setTransportKeyInputValue('')
  }

  const handleTransportKeyCancel = () => {
    setEditingTransportKey(false)
    setTransportKeyInputValue('')
  }

  // Function to calculate new key based on pitch shift
  const calculateNewKey = (currentKey: string, semitones: number): string => {
    const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    const currentIndex = keys.indexOf(currentKey)
    if (currentIndex === -1) return currentKey
    
    const newIndex = (currentIndex + semitones + 12) % 12
    return keys[newIndex]
  }

    // Function to handle pitch shift change
  const handlePitchShiftChange = (value: number) => {
    setPitchShift(value)
    setIsPitchShifting(true) // Show visual indicator
    
    // Calculate the actual current key based on the original key + pitch shift
    const actualCurrentKey = calculateNewKey(originalKey, value)
    setTransportKey(actualCurrentKey)
    markSessionChanged()
    
    // Check if we need to force reload tracks for better pitch shifting
    const absPitch = Math.abs(value)
    const needsReload = absPitch > 7 // Reload for large pitch changes to use better algorithm
    
    if (needsReload) {
      console.log(`[PITCH SHIFT] Large pitch change detected (${value}), auto-reload will handle track reload for better quality`)
    } else {
      // Apply pitch shift to all tracks immediately
      tracks.forEach(track => {
        if (pitchShiftersRef?.current?.[track.id]) {
          const pitchShifter = pitchShiftersRef.current[track.id]
          
          try {
            // Check the pitch shifter type and apply accordingly
            const pitchShifterAny = pitchShifter as any
            if (pitchShifterAny._pitchShifterType === 'playback-rate') {
              // Playback rate method - apply immediately
              const newPlaybackRate = Math.pow(2, value / 12)
              pitchShifterAny.playbackRate = newPlaybackRate
              console.log(`[PITCH SHIFT] Applied playback rate ${newPlaybackRate} to track ${track.name}`)
            } else if (pitchShifterAny._pitchShifterType === 'phase-vocoder' || pitchShifterAny.pitch !== undefined) {
              // Phase vocoder method - apply immediately
              pitchShifterAny.pitch = value
              console.log(`[PITCH SHIFT] Applied pitch shift ${value} to track ${track.name}`)
            }
          } catch (error) {
            console.error(`[PITCH SHIFT] Error applying pitch shift to track ${track.name}:`, error)
          }
        }
      })
    }
    
    // Force a small audio update to ensure changes are applied
    setTimeout(() => {
      console.log(`[PITCH SHIFT] Pitch shift updated to ${value} semitones, key: ${actualCurrentKey}`)
      setIsPitchShifting(false) // Hide visual indicator
    }, 100)
  }

  // Function to handle pitch quality change
  const handlePitchQualityChange = (quality: 'standard' | 'high' | 'ultra') => {
    setPitchQuality(quality)
    markSessionChanged()
    
    // Note: Quality changes require recreating pitch shifters
    // This will happen automatically when tracks are reloaded
    toast({
      title: "Quality setting updated",
      description: `Pitch shifter quality changed to ${quality}. Quality changes will apply to new audio loads.`,
    })
  }

  // Function to toggle track lock
  const handleToggleTrackLock = (trackId: number) => {
    setTracks(prev => prev.map(track => 
      track.id === trackId ? { ...track, locked: !track.locked } : track
    ))
    markSessionChanged()
  }

  // Function to toggle track mute
  const handleToggleTrackMute = (trackId: number) => {
    const currentTrack = tracks.find(t => t.id === trackId)
    const newMuteState = !currentTrack?.mute
    
    // Update track mute state
    setTracks(prev => prev.map(track => 
      track.id === trackId ? { ...track, mute: newMuteState } : track
    ))
    
    // Synchronize with mixer settings
    updateMixerSetting(trackId, 'mute', newMuteState)
    
    markSessionChanged()
  }



  // Copy key from one track to another
  const handleCopyTrackKey = (fromTrackId: number, toTrackId: number, key: string) => {
    setTracks(prev => prev.map(track => 
      track.id === toTrackId ? { ...track, key: key } : track
    ))
    markSessionChanged()
    console.log(`Copied key ${key} from track ${fromTrackId} to track ${toTrackId}`)
  }

  // Copy BPM from one track to another
  const handleCopyTrackBpm = (fromTrackId: number, toTrackId: number, bpm: number) => {
    setTracks(prev => prev.map(track => 
      track.id === toTrackId ? { ...track, bpm: bpm } : track
    ))
    markSessionChanged()
    console.log(`Copied BPM ${bpm} from track ${fromTrackId} to track ${toTrackId}`)
  }

  // Duplicate track with shuffle functionality
  const handleDuplicateWithShuffle = async (trackId: number) => {
    const originalTrack = tracks.find(t => t.id === trackId)
    if (!originalTrack || !originalTrack.audioUrl) {
      console.error('Cannot duplicate track: no audio loaded')
      return
    }

    try {
      console.log('Attempting to duplicate track:', originalTrack.name, 'with type:', originalTrack.audio_type, 'and key:', originalTrack.key)
      
      // Get current user for filtering
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        console.error('No user found, cannot fetch audio library')
        return
      }

      // Build query based on available data
      let query = supabase.from('audio_library_items').select('*').eq('user_id', currentUser.id)
      if (isReadyCheckEnabled) {
        query = query.eq('is_ready', true) // Only include ready audio files when ready check is enabled
      }
      
      // Add filters only if the data exists
      if (originalTrack.audio_type) {
        query = query.eq('audio_type', originalTrack.audio_type)
      }
      
      // Add key filtering with ALL 12 chromatic keys if we're in T-M mode
      if (originalTrack.key && melodyLoopMode === 'transport-dominates') {
        // USE ALL 12 CHROMATIC KEYS instead of just 5 relative keys for maximum variety
        const allChromaticKeys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        const allKeysWithModes = [
          ...allChromaticKeys, // Major keys
          ...allChromaticKeys.map(k => k + 'm'), // Minor keys
          ...allChromaticKeys.map(k => k + 'min'), // Alternative minor format
          ...allChromaticKeys.map(k => k + ' minor'), // Key signature format
          ...allChromaticKeys.map(k => k + ' major') // Key signature format
        ]
        
        console.log(`[DUPLICATE KEY FILTER] Using ALL 12 chromatic keys instead of just 5 relative keys for maximum variety`)
        console.log(`[DUPLICATE KEY FILTER] Total expanded keys: ${allKeysWithModes.length}`)
        query = query.in('key', allKeysWithModes)
      } else if (originalTrack.key) {
        // Fallback to exact key match if not in T-M mode
        query = query.eq('key', originalTrack.key)
      }
      
              // Add genre filter if a genre is selected and locked
        if (selectedGenre && selectedGenre.name && isGenreLocked) {
          query = query.eq('genre', selectedGenre.name)
        }
        
        // Add subgenre filter if a subgenre is selected and locked
        if (selectedSubgenre && selectedSubgenre.trim() && isSubgenreLocked) {
          query = query.ilike('subgenre', selectedSubgenre.trim())
        }
      
      // Try to exclude current audio if it's a database ID
      if (originalTrack.audioUrl && !originalTrack.audioUrl.startsWith('http')) {
        query = query.neq('id', originalTrack.audioUrl)
      }
      
      const { data: shuffledAudio, error } = await query.limit(10)

      // Apply tempo tolerance filtering to prevent excessive time-stretching
      let filteredAudio = shuffledAudio || []
      if (filteredAudio.length > 0) {
        const tempoTolerance = 10 // ±10 BPM tolerance
        const transportTempo = bpm
        
        console.log(`[DUPLICATE TEMPO FILTER] Transport tempo: ${transportTempo} BPM, tolerance: ±${tempoTolerance} BPM`)
        console.log(`[DUPLICATE TEMPO FILTER] Checking ${filteredAudio.length} audio files for tempo compatibility`)
        
        // First, try to find files with exact tempo matches
        const exactMatches = filteredAudio.filter(file => {
          const fileBpm = parseFloat(file.bpm) || 0
          return fileBpm > 0 && Math.abs(fileBpm - transportTempo) === 0
        })
        
        if (exactMatches.length > 0) {
          console.log(`[DUPLICATE TEMPO FILTER] Found ${exactMatches.length} files with exact tempo match (${transportTempo} BPM)`)
          filteredAudio = exactMatches
        } else {
          // Fall back to files within tolerance range
          const toleranceMatches = filteredAudio.filter(file => {
            const fileBpm = parseFloat(file.bpm) || 0
            return fileBpm > 0 && Math.abs(fileBpm - transportTempo) <= tempoTolerance
          })
          
          if (toleranceMatches.length > 0) {
            console.log(`[DUPLICATE TEMPO FILTER] Found ${toleranceMatches.length} files within tolerance range (${transportTempo - tempoTolerance}-${transportTempo + tempoTolerance} BPM)`)
            filteredAudio = toleranceMatches
          } else {
            console.log(`[DUPLICATE TEMPO FILTER] No files found within tempo tolerance. Rejecting all files to prevent excessive time-stretching.`)
            console.log(`[DUPLICATE TEMPO FILTER] Transport: ${transportTempo} BPM, tolerance: ±${tempoTolerance} BPM, required range: ${transportTempo - tempoTolerance}-${transportTempo + tempoTolerance} BPM`)
            // Reject all files if none match tempo criteria - no fallback to prevent audio quality issues
            filteredAudio = []
          }
        }
        
        // Log sample of filtered files
        if (filteredAudio.length > 0) {
          console.log(`[DUPLICATE TEMPO FILTER] Sample filtered files:`, filteredAudio.slice(0, 3).map(f => ({
            name: f.name,
            bpm: f.bpm,
            tempoDiff: Math.abs((parseFloat(f.bpm) || 0) - transportTempo)
          })))
        }
      }

      if (error) {
        console.error('Error fetching shuffled audio:', error)
        // Fallback: try without key filter
        if (originalTrack.key) {
          console.log('Retrying without key filter...')
          let fallbackQuery = supabase
            .from('audio_library_items')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('audio_type', originalTrack.audio_type || 'Melody Loop')
          if (isReadyCheckEnabled) {
            fallbackQuery = fallbackQuery.eq('is_ready', true) // Only include ready audio files when ready check is enabled
          }
          
          const { data: fallbackAudio, error: fallbackError } = await fallbackQuery.limit(10)
          
          if (fallbackError) {
            console.error('Fallback query also failed:', fallbackError)
            return
          }
          
          if (fallbackAudio && fallbackAudio.length > 0) {
            const randomAudio = fallbackAudio[Math.floor(Math.random() * fallbackAudio.length)]
            createDuplicateTrack(originalTrack, randomAudio)
            return
          }
        }
        return
      }

      if (!filteredAudio || filteredAudio.length === 0) {
        console.log('No alternative audio found with same key and type')
        
        // Only use fallback if NOT both genre and subgenre are locked
        // If both are locked, we want to be strict and only play files that match both
        if (!(selectedGenre && selectedGenre.name && isGenreLocked && selectedSubgenre && isSubgenreLocked)) {
          console.log(`[FALLBACK] Trying with no genre/subgenre filters (not both locked)`)
          let noFilterQuery = supabase
          .from('audio_library_items')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('audio_type', originalTrack.audio_type || 'Melody Loop')
          if (isReadyCheckEnabled) {
            noFilterQuery = noFilterQuery.eq('is_ready', true) // Only include ready audio files when ready check is enabled
          }
        
          const { data: noFilterAudio, error: noFilterError } = await noFilterQuery.limit(10)
        
          if (noFilterAudio && noFilterAudio.length > 0) {
            console.log(`[FALLBACK] Found ${noFilterAudio.length} files with no genre filters`)
            const randomAudio = noFilterAudio[Math.floor(Math.random() * noFilterAudio.length)]
          createDuplicateTrack(originalTrack, randomAudio)
          return
          }
        }
        
        console.log('No audio found in database, creating duplicate with same audio but different settings')
        // Fallback: create duplicate with same audio but different settings
        const fallbackDuplicate: Track = {
          ...originalTrack,
          id: Math.max(...tracks.map(t => t.id)) + 1,
          name: `${originalTrack.name} (Variation)`,
          // Keep same audio but adjust settings
          currentBpm: originalTrack.bpm ? originalTrack.bpm + Math.floor(Math.random() * 20) - 10 : originalTrack.bpm, // ±10 BPM variation
          currentKey: originalTrack.key, // Keep same key
          // Keep same sequencer pattern as parent
          locked: false, // Allow shuffling of the duplicate
          mute: false
        }
        setTracks(prev => [...prev, fallbackDuplicate])
        console.log(`Created fallback duplicate track: ${fallbackDuplicate.name}`)
        return
      }

      // Pick a random audio from the results
      const randomAudio = filteredAudio[Math.floor(Math.random() * filteredAudio.length)]
      createDuplicateTrack(originalTrack, randomAudio)
      
    } catch (error) {
      console.error('Error duplicating track with shuffle:', error)
    }
  }

  // Helper function to create duplicate track
  const createDuplicateTrack = (originalTrack: Track, randomAudio: any) => {
    // Create new track ID
    const newTrackId = Math.max(...tracks.map(t => t.id)) + 1
    
          // Create duplicate track with shuffled audio
      const duplicateTrack: Track = {
        ...originalTrack,
        id: newTrackId,
        name: `${originalTrack.name} 🔄`,
        audioUrl: randomAudio.file_url,
        audioName: randomAudio.name,
        bpm: randomAudio.bpm,
        key: randomAudio.key,
        audio_type: randomAudio.audio_type,
        tags: randomAudio.tags || [],
        // CRITICAL: Reset halftime settings for duplicated tracks
        playbackRate: 1.0,  // Always start with normal playback rate (halftime OFF)
        pitchShift: 0,      // Always start with no pitch shift
        // Keep same sequencer pattern as parent
        locked: false, // Allow shuffling of the duplicate
        mute: false
      }

    // Add the duplicate track
    setTracks(prev => [...prev, duplicateTrack])
    
    // Check if this is a Loop track and automatically activate the first step
    const isLoopTrack = duplicateTrack.name.toLowerCase().includes('loop')
    if (isLoopTrack) {
      // Initialize sequencer data for the new loop track with first step active
      const stepPattern = new Array(steps).fill(false)
      stepPattern[0] = true // Activate first step
      setSequencerDataFromSession(prev => ({
        ...prev,
        [newTrackId]: stepPattern
      }))
      console.log(`[LOOP TRACK] Auto-activated first step for duplicated ${duplicateTrack.name} track`)
    }
    
    console.log(`Duplicated track ${originalTrack.name} with shuffled audio: ${randomAudio.name}`)
  }

  // Function to add a new track
  const addNewTrack = (trackType?: string) => {
    if (trackType) {
      addTrackByType(trackType)
    }
  }

  const addTrackByType = async (trackType: string) => {
    const trackColors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500',
      'bg-yellow-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500',
      'bg-teal-500', 'bg-cyan-500', 'bg-lime-500', 'bg-rose-500'
    ]
    
    const newTrackId = Math.max(...tracks.map(t => t.id)) + 1
    const colorIndex = (tracks.length) % trackColors.length
    
    const newTrack: Track = {
      id: newTrackId,
      name: trackType,
      audioUrl: null,
      color: trackColors[colorIndex],
      playbackRate: 1.0,  // CRITICAL: Always start with normal playback rate (halftime OFF)
      pitchShift: 0       // CRITICAL: Always start with no pitch shift
    }
    
    setTracks(prev => [...prev, newTrack])
    
    // Initialize mixer settings for the new track
    setMixerSettings(prev => ({
      ...prev,
      [newTrackId]: {
        volume: 0.7,
        pan: 0,
        mute: false, // Initialize with unmuted state
        eq: { low: 0, mid: 0, high: 0 },
        effects: { reverb: 0, delay: 0 }
      }
    }))
    
    console.log(`[TRACK CREATION] Created new track: ${trackType} with ID: ${newTrackId}`)
    
    // Check if this is a Loop track and automatically activate the first step
    const isLoopTrack = trackType.toLowerCase().includes('loop')
    if (isLoopTrack) {
      // Initialize sequencer data for the new loop track with first step active
      const stepPattern = new Array(steps).fill(false)
      stepPattern[0] = true // Activate first step
      setSequencerDataFromSession(prev => ({
        ...prev,
        [newTrackId]: stepPattern
      }))
      console.log(`[LOOP TRACK] Auto-activated first step for new ${trackType} track`)
    }
    
    // Add to undo/redo history
    undoRedo.addToHistory(captureCurrentState(), `Add ${trackType} track`)
  }

  // Function to remove a track
  const removeTrack = (trackId: number) => {
    if (tracks.length > 1) { // Keep at least one track
      setTracks(prev => prev.filter(track => track.id !== trackId))
      // Add to undo/redo history
      undoRedo.addToHistory(captureCurrentState(), 'Remove track')
      markSessionChanged()
    }
  }

  // Function to reorder tracks
  const reorderTracks = (newOrder: Track[]) => {
    setTracks(newOrder)
    // Add to undo/redo history
    undoRedo.addToHistory(captureCurrentState(), 'Reorder tracks')
    markSessionChanged()
  }

  // Function to shuffle audio files by type
  const handleShuffleAudio = async (trackId: number) => {
    try {
      const track = tracks.find(t => t.id === trackId)
      if (!track) return

      // CRITICAL DEBUG: Log the exact state before shuffling

      // CRITICAL: Stop any existing audio for this track first
      console.log(`[SHUFFLE AUDIO] Stopping existing audio for track: ${track.name}`)
      
      // Stop Tone.js Transport if it's running
      const Tone = await import('tone')
      if (Tone.Transport.state === 'started') {
        Tone.Transport.stop()
        Tone.Transport.cancel()
        console.log(`[SHUFFLE AUDIO] Stopped Tone.js Transport for track: ${track.name}`)
      }
      
      // Stop any existing audio players for this track
      if (window.audioPlayers && window.audioPlayers[trackId]) {
        try {
          const player = window.audioPlayers[trackId]
          if (player && player.stop) {
            player.stop()
            player.dispose()
          }
          delete window.audioPlayers[trackId]
          console.log(`[SHUFFLE AUDIO] Stopped audio player for track: ${track.name}`)
        } catch (error) {
          console.warn(`[SHUFFLE AUDIO] Error stopping player for track ${track.name}:`, error)
        }
      }
      
      // Also stop any Tone.js samples for this track
      const samples = samplesRef?.current
      if (samples && samples[trackId]) {
        try {
          const sample = samples[trackId]
          if (sample && sample.stop) {
            sample.stop()
            sample.dispose()
          }
          delete samples[trackId]
          console.log(`[SHUFFLE AUDIO] Stopped Tone.js sample for track: ${track.name}`)
        } catch (error) {
          console.warn(`[SHUFFLE AUDIO] Error stopping Tone.js sample for track ${track.name}:`, error)
        }
      }
      
      // CRITICAL: Preserve mute state when shuffling
      console.log(`[SHUFFLE AUDIO] Preserving mute state for track: ${track.name}`)
      const currentTrack = tracks.find(t => t.id === trackId)
      const preserveMute = currentTrack?.mute || false
      
      // Small delay to ensure cleanup is complete and halftime states are reset
      await new Promise(resolve => setTimeout(resolve, 200))

      // Debug: Log the current state

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to shuffle audio files')
        return
      }

      // Debug: Check what audio files exist for this user
      const { data: allUserFiles } = await supabase
        .from('audio_library_items')
        .select('*')
        .eq('user_id', user.id)
      
      if (allUserFiles && allUserFiles.length > 0) {
      }

      // Special debug for Kick track
      if (track.name === 'Kick') {
        
        // Check Kick files specifically
        const kickFiles = allUserFiles?.filter(f => f.audio_type === 'Kick') || []
        
        const readyKickFiles = kickFiles.filter(f => f.is_ready)
        
        const notReadyKickFiles = kickFiles.filter(f => !f.is_ready)
        
        if (kickFiles.length > 0) {
            id: f.id,
            name: f.name,
            is_ready: f.is_ready,
            genre: f.genre,
            subgenre: f.subgenre,
            bpm: f.bpm,
            key: f.key
          })))
        }
      }

      // Map track names to audio types for filtering using the new categorized system
      const trackTypeMap: { [key: string]: string } = {
        // Drums
        'Kick': 'Kick',
        'Snare': 'Snare', 
        'Hi-Hat': 'Hihat',
        'Clap': 'Clap',
        'Crash': 'Crash',
        'Ride': 'Ride',
        'Tom': 'Tom',
        'Cymbal': 'Cymbal',
        'Percussion': 'Percussion',
        
        // Bass
        'Bass': 'Bass',
        'Sub': 'Sub',
        '808': '808',
        
        // Melodic
        'Melody': 'Melody',
        'Lead': 'Lead',
        'Pad': 'Pad',
        'Chord': 'Chord',
        'Arp': 'Arp',
        
        // Loops
        'Melody Loop': 'Melody Loop',
        'Piano Loop': 'Piano Loop',
        '808 Loop': '808 Loop',
        'Drum Loop': 'Drum Loop',
        'Hihat Loop': 'Hihat Loop',
        'Bass Loop': 'Bass Loop',
        'Vocal Loop': 'Vocal Loop',
        'Guitar Loop': 'Guitar Loop',
        'Synth Loop': 'Synth Loop',
        
        // Effects & Technical
        'FX': 'FX',
        'Vocal': 'Vocal',
        'Sample': 'Sample',
        'MIDI': 'MIDI',
        'Patch': 'Patch',
        'Preset': 'Preset'
      }

      // Extract base track type from name (remove key suffix for loops)
      let baseTrackName = track.name
      if (track.name.includes(' Loop ') && track.name.split(' ').length > 2) {
        // For loop tracks with keys like "Melody Loop A", extract just "Melody Loop"
        const parts = track.name.split(' ')
        baseTrackName = parts.slice(0, -1).join(' ') // Remove the last part (the key)
      }
      
      const audioType = trackTypeMap[baseTrackName]
      if (!audioType) {
        console.log(`No audio type mapping found for track: ${track.name} (base: ${baseTrackName})`)
        return
      }

      // Use the same shuffle tracking system as "shuffle all" for consistency
      console.log(`[SHUFFLE TRACKER] Getting batch for track: ${track.name} (${audioType})`)
      
      // Check if this is a drum track (should not be pitch-shifted or key-filtered)
      const isDrumTrack = ['Kick', 'Snare', 'Hi-Hat', 'Clap', 'Crash', 'Ride', 'Tom', 'Cymbal', 'Percussion', 'Drum Loop'].includes(track.name)
      
                // Check if this track should be filtered by key (skip drum tracks - they don't need key filtering)
      const shouldFilterByKey = !isDrumTrack
      const keyToUse = shouldFilterByKey ? transportKey : undefined
      
      // Use track's individual genre/subgenre if available, otherwise fall back to global settings
      const trackGenre = track.genre || selectedGenre?.name
      const trackSubgenre = track.subgenre
      
      console.log(`[TRACK GENRE] Track ${track.name} using genre: ${trackGenre}, subgenre: ${trackSubgenre}`)
      
      // Get batch of audio files using the smart cache system
      // Apply BPM filtering only when BPM tolerance is enabled
      const audioFiles = await getAudioFromCacheOrDatabase(user, audioType, keyToUse, trackGenre ? { name: trackGenre } : selectedGenre, trackSubgenre, bpm, isBpmToleranceEnabled)

      if (!audioFiles || audioFiles.length === 0) {
        console.log(`[SHUFFLE TRACKER] No audio files available for ${audioType}`)
        return
      }

      // Randomly select one from the batch
      const randomIndex = Math.floor(Math.random() * audioFiles.length)
      const selectedAudio = audioFiles[randomIndex]

      // Update the track with the new audio
      const publicUrl = getPublicAudioUrl(selectedAudio.file_url || '')
      
      // Handle tempo and key based on track type and transport lock status
      // IMPORTANT: Loop tracks MUST match transport BPM, drum tracks can use original BPM
      let finalBpm = selectedAudio.bpm || 120
      let finalKey = selectedAudio.key || 'C'
      let pitchShift = 0
      let playbackRate = 1.0
      
      // CRITICAL DEBUG: Log BPM calculation process
      
      // Mark session as changed
      markSessionChanged()
      
      if (isBpmLocked || isKeyLocked) {
        // Transport is partially or fully locked - adapt tracks accordingly
        if (isBpmLocked) {
          // For loop tracks, always adapt to transport BPM regardless of lock status
          if (track.name.includes(' Loop')) {
            finalBpm = bpm
            if (selectedAudio.bpm && selectedAudio.bpm > 0) {
              playbackRate = bpm / selectedAudio.bpm
            } else {
              playbackRate = 1.0
            }
            console.log(`[LOOP TRACK LOCKED] ${track.name} adapted to transport BPM: ${bpm} (rate: ${playbackRate.toFixed(3)})`)
          } else {
            // For non-loop tracks, use original BPM when locked
            finalBpm = selectedAudio.bpm || 120
            playbackRate = 1.0
            console.log(`[NON-LOOP LOCKED] ${track.name} using original BPM: ${finalBpm}`)
          }
        }
        
        if (isKeyLocked && !isDrumTrack) {
          // Only apply key matching for non-drum tracks
          finalKey = transportKey
          // Calculate pitch shift needed to match transport key
          if (selectedAudio.key && transportKey) {
            const chromaticScale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
            const originalIndex = chromaticScale.indexOf(selectedAudio.key)
            const targetIndex = chromaticScale.indexOf(transportKey)
            
            if (originalIndex !== -1 && targetIndex !== -1) {
              pitchShift = targetIndex - originalIndex
              // Handle octave wrapping
              if (pitchShift > 6) pitchShift -= 12
              if (pitchShift < -6) pitchShift += 12
            }
          }
        } else if (isKeyLocked && isDrumTrack) {
          // For drum tracks, keep original key even when key is locked
          finalKey = selectedAudio.key || 'C'
          pitchShift = 0
          console.log(`[DRUM TRACK] ${track.name} keeps original key (no pitch shift): ${selectedAudio.key}`)
        }
        
        if (isDrumTrack) {
          console.log(`[DRUM TRACK] ${track.name} adapts to Transport BPM only: ${selectedAudio.bpm}BPM -> ${finalBpm}BPM (rate: ${playbackRate.toFixed(2)}, no pitch shift)`)
        } else {
        console.log(`[TRANSPORT LOCKED] Track adapts to Transport: ${selectedAudio.bpm}BPM ${selectedAudio.key} -> ${finalBpm}BPM ${finalKey} (pitch: ${pitchShift}, rate: ${playbackRate.toFixed(2)})`)
        }
      } else if (track.name === 'Melody Loop') {
        // Melody Loop: Adapt to transport BPM based on melody loop mode
        if (melodyLoopMode === 'transport-dominates') {
          // Transport dominates: Melody Loop adapts to transport
          finalBpm = bpm // Use transport BPM
          finalKey = transportKey || selectedAudio.key || 'C'
          
          // Calculate playback rate to match transport tempo
          if (selectedAudio.bpm && selectedAudio.bpm > 0) {
            playbackRate = bpm / selectedAudio.bpm
          } else {
            playbackRate = 1.0
          }
          
          // Calculate pitch shift if needed
          if (selectedAudio.key && transportKey && selectedAudio.key !== transportKey) {
            const chromaticScale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
            const originalIndex = chromaticScale.indexOf(selectedAudio.key)
            const targetIndex = chromaticScale.indexOf(transportKey)
            
            if (originalIndex !== -1 && targetIndex !== -1) {
              pitchShift = targetIndex - originalIndex
              if (pitchShift > 6) pitchShift -= 12
              if (pitchShift < -6) pitchShift += 12
            }
          }
          
          console.log(`[MELODY LOOP T→M] Original ${selectedAudio.bpm}BPM ${selectedAudio.key} → Transport ${bpm}BPM ${transportKey} (rate: ${playbackRate.toFixed(3)}, pitch: ${pitchShift})`)
        } else {
          // Melody Loop dominates: Transport adapts to melody loop
          finalBpm = selectedAudio.bpm || 120
          finalKey = selectedAudio.key || 'C'
          playbackRate = 1.0
          pitchShift = 0
          
          console.log(`[MELODY LOOP M→T] Using original audio: ${selectedAudio.bpm}BPM ${selectedAudio.key}`)
        }
      } else if (track.name.includes(' Loop')) {
        // Loop tracks: currentBpm MUST match transport BPM for proper sync
        finalBpm = bpm // Use transport BPM, not original audio BPM
        finalKey = selectedAudio.key || 'C'
        
        // Calculate playback rate to match transport tempo
        if (selectedAudio.bpm && selectedAudio.bpm > 0) {
          playbackRate = bpm / selectedAudio.bpm
        } else {
          playbackRate = 1.0
        }
        
        pitchShift = 0
        
        console.log(`[LOOP TRACK] ${track.name}: Original ${selectedAudio.bpm}BPM → Transport ${bpm}BPM (rate: ${playbackRate.toFixed(3)})`)
      } else {
        // Transport not locked and not a loop track - use original audio BPM and key
        finalBpm = selectedAudio.bpm || 120
        finalKey = selectedAudio.key || 'C'
        playbackRate = 1.0
        pitchShift = 0
        
        console.log(`[NORMAL] Using original audio: ${selectedAudio.bpm}BPM ${selectedAudio.key}`)
      }
      
      // Check if this is a relative key (not exact match with transport key)
      // Skip drum tracks as they don't need key matching
      const isRelativeKey = !isDrumTrack && transportKey && selectedAudio.key && selectedAudio.key !== transportKey
      
      // CRITICAL DEBUG: Log final calculated values
      
      // CRITICAL: For Drum Loop tracks, ensure they ALWAYS match transport BPM
      // This must be the FINAL override to ensure Drum Loop tracks always sync properly
      if (track.name === 'Drum Loop') {
        console.log(`[DRUM LOOP CRITICAL] FINAL OVERRIDE: Ensuring Drum Loop matches transport BPM: ${bpm}`)
        finalBpm = bpm
        if (selectedAudio.bpm && selectedAudio.bpm > 0) {
          playbackRate = bpm / selectedAudio.bpm
          console.log(`[DRUM LOOP CRITICAL] FINAL OVERRIDE: Calculated playback rate: ${playbackRate} (${bpm} / ${selectedAudio.bpm})`)
        } else {
          playbackRate = 1.0
          console.log(`[DRUM LOOP CRITICAL] FINAL OVERRIDE: No original BPM found, using playback rate: 1.0`)
        }
        console.log(`[DRUM LOOP CRITICAL] FINAL OVERRIDE: Final values - BPM: ${finalBpm}, Rate: ${playbackRate}`)
      }
      
      // CRITICAL: For ALL loop tracks, ensure they ALWAYS match transport BPM
      // This is a final safety check to ensure loop tracks sync properly
      if (track.name.includes(' Loop') && track.name !== 'Drum Loop') {
        console.log(`[LOOP TRACK CRITICAL] FINAL OVERRIDE: Ensuring ${track.name} matches transport BPM: ${bpm}`)
        finalBpm = bpm
        if (selectedAudio.bpm && selectedAudio.bpm > 0) {
          playbackRate = bpm / selectedAudio.bpm
          console.log(`[LOOP TRACK CRITICAL] FINAL OVERRIDE: Calculated playback rate: ${playbackRate} (${bpm} / ${selectedAudio.bpm})`)
        } else {
          playbackRate = 1.0
          console.log(`[LOOP TRACK CRITICAL] FINAL OVERRIDE: No original BPM found, using playback rate: 1.0`)
        }
        console.log(`[LOOP TRACK CRITICAL] FINAL OVERRIDE: Final values - BPM: ${finalBpm}, Rate: ${playbackRate}`)
      }
      
      setTracks(prev => prev.map(t => 
        t.id === trackId ? { 
          ...t, 
          audioUrl: publicUrl,
          audioName: selectedAudio.name,
          audioFileId: selectedAudio.id,
          // CRITICAL: Use the SAME selectedAudio.bpm that was used in calculations
          originalBpm: selectedAudio.bpm || 120,
          currentBpm: finalBpm,
          playbackRate: playbackRate,
          // Use calculated key values
          originalKey: selectedAudio.key || 'C',
          currentKey: finalKey,
          pitchShift: pitchShift,
          // Store metadata
          bpm: selectedAudio.bpm,
          key: selectedAudio.key,
          audio_type: selectedAudio.audio_type,
          tags: selectedAudio.tags,
          // Store relative key indicator
          isRelativeKey: isRelativeKey,
          // CRITICAL: Preserve mute state
          mute: preserveMute
        } : t
      ))

      // CRITICAL DEBUG: Log the calculated values that will be set
      
      // CRITICAL: Verify that the calculated values are correct (before state update)
      if (track.name.includes(' Loop')) {
        const expectedBpm = bpm
        const actualBpm = finalBpm
        const expectedRate = playbackRate
        
        console.log(`[LOOP TRACK VERIFICATION] ${track.name}:`)
        console.log(`[LOOP TRACK VERIFICATION] Expected BPM: ${expectedBpm}, Calculated BPM: ${actualBpm}, Match: ${expectedBpm === actualBpm}`)
        console.log(`[LOOP TRACK VERIFICATION] Expected Rate: ${expectedRate.toFixed(4)}, Calculated Rate: ${expectedRate.toFixed(4)}, Match: true`)
        console.log(`[LOOP TRACK VERIFICATION] Using final calculated playbackRate: ${playbackRate} for verification`)
        
        if (expectedBpm !== actualBpm) {
          console.error(`[LOOP TRACK VERIFICATION ERROR] ${track.name} BPM mismatch detected!`)
          console.error(`[LOOP TRACK VERIFICATION ERROR] Expected BPM: ${expectedBpm}`)
          console.error(`[LOOP TRACK VERIFICATION ERROR] Calculated BPM: ${actualBpm}`)
        }
      }
      
      // Auto-reload will handle the audio reload automatically via useEffect
      console.log(`[SHUFFLE AUDIO] Track state updated - auto-reload will handle audio reload`)

    } catch (error) {
      console.error('Error shuffling audio:', error)
      
      // More detailed error logging
      if (error instanceof Error) {
        console.error(`[SHUFFLE AUDIO ERROR] ${error.message}`)
        console.error(`[SHUFFLE AUDIO ERROR] Stack: ${error.stack}`)
      }
      
      // Auto-reload will handle recovery automatically
      console.log(`[SHUFFLE AUDIO] Error occurred - auto-reload will handle recovery`)
      alert('Failed to shuffle audio. Please try again or reset the audio.')
    }
  }

  // Function to handle direct audio file drop on tracks
  const handleDirectAudioDrop = async (trackId: number, file: File) => {
    try {
      // Upload file to Supabase storage
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to upload files')
        return
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `audio-samples/${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('beats')
        .upload(filePath, file)

      if (uploadError) {
        console.error('Upload error:', uploadError)
        alert('Failed to upload file')
        return
      }

      // Get public URL and assign to track
      const { data: urlData } = supabase.storage
        .from('beats')
        .getPublicUrl(filePath)

      // Extract filename without extension for track name
      const trackName = file.name.replace(/\.[^/.]+$/, "")

      setTracks(prev => prev.map(track => 
        track.id === trackId ? { 
          ...track, 
          audioUrl: urlData.publicUrl,
          audioName: file.name,
          name: trackName,
          // Initialize tempo properties with default values
          originalBpm: 120, // Default BPM, could be auto-detected in the future
          currentBpm: 120,
          playbackRate: 1.0,
          // Initialize pitch properties with default values
          originalKey: 'C', // Default key
          currentKey: 'C',
          pitchShift: 0
        } : track
      ))

      // Also save to database for future use
      await supabase
        .from('audio_library_items')
        .insert({
          user_id: user.id,
          name: file.name,
          file_path: filePath,
          file_url: urlData.publicUrl,
          file_size: file.size
        })

    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Failed to upload file')
    }
  }

  // New function to create a custom sample track from dropped file
  const handleCreateCustomSampleTrack = async (file: File) => {
    try {
      // Upload file to Supabase storage
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to upload files')
        return
      }
      
      console.log('User ID:', user.id, 'Type:', typeof user.id)

      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `audio-samples/${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('beats')
        .upload(filePath, file)

      if (uploadError) {
        console.error('Upload error:', uploadError)
        alert('Failed to upload file')
        return
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('beats')
        .getPublicUrl(filePath)

      // Extract filename without extension for track name
      const trackName = file.name.replace(/\.[^/.]+$/, "")

      // Create new track with custom sample
      const newTrackId = Math.max(...tracks.map(t => t.id), 0) + 1
      const newTrack: Track = {
        id: newTrackId,
        name: `Custom Sample - ${trackName}`,
        audioUrl: urlData.publicUrl,
        audioName: file.name,
        color: 'bg-pink-500', // Custom color for custom samples
        // Initialize tempo properties with default values
        originalBpm: 120, // Default BPM, could be auto-detected in the future
        currentBpm: 120,
        playbackRate: 1.0,
        // Initialize pitch properties with default values
        originalKey: 'C', // Default key
        currentKey: 'C',
        pitchShift: 0
      }

      // Add the new track to the tracks array
      setTracks(prev => [...prev, newTrack])

      // Also save to database for future use
      const insertData = {
        user_id: user.id,
        name: file.name,
        file_url: urlData.publicUrl,
        file_size: file.size,
        type: 'sample' // Default type
      }
      
      console.log('Inserting audio library item:', insertData)
      
      const { error: insertError } = await supabase
        .from('audio_library_items')
        .insert(insertData)
        
      if (insertError) {
        console.error('Error inserting audio library item:', insertError)
        // Don't throw error here, just log it - the track was still created successfully
      }

      // Initialize sequencer data for the new track
      const newSequencerData = { ...sequencerData }
      newSequencerData[newTrackId] = new Array(steps).fill(false)
      newSequencerData[newTrackId][0] = true // Activate first step
      setSequencerDataFromSession(newSequencerData)

      toast({
        title: "Custom Sample Track Created",
        description: `"${trackName}" has been uploaded and added as a new track.`,
      })

    } catch (error) {
      console.error('Error creating custom sample track:', error)
      alert('Failed to create custom sample track')
    }
  }

  // Open edit track modal
  const openEditTrackModal = (track: Track) => {
    setEditingTrack(track)
    setEditTrackForm({
      name: track.name.replace('Custom Sample - ', ''),
      bpm: track.bpm?.toString() || '',
      key: track.key || '',
      audio_type: track.audio_type || '',
      tags: track.tags ? track.tags.join(', ') : ''
    })
    setShowEditTrackModal(true)
    setTrackEditError(null)
  }

  // Handle edit track form submission
  const handleEditTrack = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTrack) return

    setSavingTrack(true)
    setTrackEditError(null)

    try {
      // Update the track in local state
      const updatedTrack: Track = {
        ...editingTrack,
        name: `Custom Sample - ${editTrackForm.name}`,
        bpm: editTrackForm.bpm ? parseInt(editTrackForm.bpm) : undefined,
        key: editTrackForm.key || undefined,
        audio_type: editTrackForm.audio_type || undefined,
        tags: editTrackForm.tags ? editTrackForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : undefined
      }

      setTracks(prev => prev.map(track => 
        track.id === editingTrack.id ? updatedTrack : track
      ))

      // Update the audio library item in the database if it exists
      if (editingTrack.audioName) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          console.log('Edit - User ID:', user.id, 'Type:', typeof user.id)
          // Find the audio library item by file name
          const { data: audioItems } = await supabase
            .from('audio_library_items')
            .select('*')
            .eq('user_id', user.id)
            .eq('name', editingTrack.audioName)

          if (audioItems && audioItems.length > 0) {
            const audioItem = audioItems[0]
            const updateData = {
              bpm: editTrackForm.bpm ? parseInt(editTrackForm.bpm) : null,
              key: editTrackForm.key || null,
              audio_type: editTrackForm.audio_type || null,
              tags: editTrackForm.tags ? editTrackForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : null
            }

            console.log('Updating audio library item:', { id: audioItem.id, updateData })
            
            const { error: updateError } = await supabase
              .from('audio_library_items')
              .update(updateData)
              .eq('id', audioItem.id)
              
            if (updateError) {
              console.error('Error updating audio library item:', updateError)
              setTrackEditError('Failed to update database: ' + updateError.message)
              return
            }
          }
        }
      }

      setShowEditTrackModal(false)
      setEditingTrack(null)
      setEditTrackForm({ name: '', bpm: '', key: '', audio_type: '', tags: '' })

      toast({
        title: "Track Updated",
        description: "Track metadata has been updated successfully.",
      })

    } catch (error) {
      console.error('Error updating track:', error)
      setTrackEditError('Failed to update track metadata')
    } finally {
      setSavingTrack(false)
    }
  }

  const handleTrackStockSoundSelect = (trackId: number, sound: any) => {
    setTracks(prev => prev.map(track =>
      track.id === trackId ? { ...track, stockSound: sound, name: sound.name } : track
    ))
    if (sound.id.includes('piano')) setMidiSoundType('piano')
    else if (sound.id.includes('synth')) setMidiSoundType('synth')
    else if (sound.id.includes('bass')) setMidiSoundType('bass')
    // Open the Piano Roll for this track
    setPianoRollTrack(trackId)
    setShowPianoRoll(true)
  }

  // Debug function to check audio library genre/subgenre data
  const debugAudioLibraryData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      
      // Check what's in the genres table
      const { data: genresData } = await supabase
        .from('genres')
        .select('*')
        .order('name')
      
      
      // Check what's in the genre_subgenres table
      const { data: subgenresData } = await supabase
        .from('genre_subgenres')
        .select('*')
        .order('genre, subgenre')
      
      
      // Check what's in the audio_library_items table
      const { data: allFiles } = await supabase
        .from('audio_library_items')
        .select('name, genre, subgenre, audio_type, is_ready')
        .eq('user_id', user.id)
        .limit(50)
      
      
      // Show unique genres and subgenres in audio files
      const audioGenres = [...new Set(allFiles?.map(f => f.genre).filter(Boolean) || [])]
      const audioSubgenres = [...new Set(allFiles?.map(f => f.subgenre).filter(Boolean) || [])]
      
      
      // Check for kick files specifically
      console.log('\n=== KICK FILES ANALYSIS ===')
      const kickFiles = allFiles?.filter(f => f.audio_type === 'Kick') || []
      
      const readyKickFiles = kickFiles.filter(f => f.is_ready)
      
      // Check for files with "kick" in name
      const kickNameFiles = allFiles?.filter(f => f.name?.toLowerCase().includes('kick')) || []
      
      // Check ready check status
      const readyFiles = allFiles?.filter(f => f.is_ready) || []
      const notReadyFiles = allFiles?.filter(f => !f.is_ready) || []
      
      // Check for Trap + LA specifically
      if (selectedGenre?.name === 'Trap' && selectedSubgenre === 'LA') {
        console.log('\n=== TRAP + LA ANALYSIS ===')
        
        // Check if "Trap" exists in genres table
        const trapInGenres = genresData?.find(g => g.name === 'Trap')
        
        // Check if "LA" exists in genre_subgenres table
        const laInSubgenres = subgenresData?.find(s => s.genre === 'Trap' && s.subgenre === 'LA')
        
        // Check if any audio files have genre="Trap" AND subgenre="LA"
        const trapLAFiles = allFiles?.filter(f => f.genre === 'Trap' && f.subgenre === 'LA') || []
        
        // Check if any audio files have genre="LA" AND subgenre="Trap" (swapped)
        const laTrapFiles = allFiles?.filter(f => f.genre === 'LA' && f.subgenre === 'Trap') || []
      }
    } catch (error) {
      console.error('[DEBUG] Error checking audio library data:', error)
    }
  }

  // Smart hybrid caching system for audio shuffles
  const [batchedAudioCache, setBatchedAudioCache] = useState<Record<string, any[]>>({})
  const [cacheTimestamp, setCacheTimestamp] = useState<number>(0)
  const CACHE_EXPIRY_TIME = 5 * 60 * 1000 // 5 minutes in milliseconds

  // Helper function to check if cache is valid
  const isCacheValid = () => {
    return Date.now() - cacheTimestamp < CACHE_EXPIRY_TIME
  }

  // Helper function to get audio from cache or database
  const getAudioFromCacheOrDatabase = async (
    user: any, 
    audioType: string, 
    transportKey?: string, 
    selectedGenre?: any, 
    selectedSubgenre?: string, 
    transportBpm?: number, 
    applyBpmFilter?: boolean
  ) => {
    // Create cache key based on all filter parameters
    const cacheKey = `${audioType}_${selectedGenre?.name || 'none'}_${selectedSubgenre || 'none'}_${transportKey || 'none'}_${transportBpm || 'none'}_${applyBpmFilter || false}`
    
    // Check if we have valid cached data
    if (batchedAudioCache[cacheKey] && isCacheValid()) {
      console.log(`[CACHE HIT] Using cached audio for ${audioType} (${cacheKey})`)
      return batchedAudioCache[cacheKey]
    }
    
    // Cache miss or expired - fetch from database
    console.log(`[CACHE MISS] Fetching audio for ${audioType} from database`)
    const audioFiles = await getShuffleAudioBatch(user, audioType, transportKey, selectedGenre, selectedSubgenre, transportBpm, applyBpmFilter)
    
    // Update cache with new data
    setBatchedAudioCache(prev => ({
      ...prev,
      [cacheKey]: audioFiles
    }))
    setCacheTimestamp(Date.now())
    
    return audioFiles
  }

  // Function to update cache with batched results
  const updateBatchedCache = (batchedResults: Record<string, any[]>) => {
    const newCache: Record<string, any[]> = {}
    
    // Convert batched results to individual cache entries
    Object.keys(batchedResults).forEach(audioType => {
      const audioFiles = batchedResults[audioType]
      if (audioFiles && audioFiles.length > 0) {
        // Create cache key for this audio type with current global settings
        const cacheKey = `${audioType}_${selectedGenre?.name || 'none'}_${selectedSubgenre || 'none'}_${transportKey || 'none'}_${bpm || 'none'}_${isBpmToleranceEnabled || false}`
        newCache[cacheKey] = audioFiles
      }
    })
    
    setBatchedAudioCache(prev => ({
      ...prev,
      ...newCache
    }))
    setCacheTimestamp(Date.now())
    
    console.log(`[CACHE UPDATE] Updated cache with ${Object.keys(newCache).length} entries`)
  }

  // Function to clear expired cache entries
  const clearExpiredCache = () => {
    if (!isCacheValid()) {
      setBatchedAudioCache({})
      setCacheTimestamp(0)
      console.log('[CACHE CLEAR] Cleared expired cache')
    }
  }

  // Function to manually clear cache (for debugging/testing)
  const clearAudioCache = () => {
    setBatchedAudioCache({})
    setCacheTimestamp(0)
    console.log('[CACHE CLEAR] Manually cleared audio cache')
  }





  // Function to get cache status for debugging
  const getCacheStatus = () => {
    const cacheSize = Object.keys(batchedAudioCache).length
    const isValid = isCacheValid()
    const age = Date.now() - cacheTimestamp
    return {
      size: cacheSize,
      isValid,
      age: Math.round(age / 1000), // age in seconds
      entries: Object.keys(batchedAudioCache)
    }
  }

  // Helper function to get relative keys for a given key
  const getRelativeKeys = (key: string): string[] => {
    const chromaticScale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    
    // Parse the key to get the root note and whether it's minor
    const isMinor = key.toLowerCase().includes('m') || key.toLowerCase().includes('minor')
    const rootNote = key.replace(/[mM]|inor?/g, '').trim()
    
    const rootIndex = chromaticScale.indexOf(rootNote)
    if (rootIndex === -1) {
      console.warn(`[KEY FILTER] Unknown root note: ${rootNote}`)
      return [key] // Return original key if we can't parse it
    }
    
    const relativeKeys: string[] = [key] // Always include the original key
    
    if (isMinor) {
      // For minor keys, add relative major (3 semitones up)
      const relativeMajorIndex = (rootIndex + 3) % 12
      const relativeMajor = chromaticScale[relativeMajorIndex]
      relativeKeys.push(relativeMajor)
      
      // Add parallel major (same root note, major)
      relativeKeys.push(rootNote)
      
      // Add dominant (7 semitones up from minor root)
      const dominantIndex = (rootIndex + 7) % 12
      const dominant = chromaticScale[dominantIndex]
      relativeKeys.push(dominant)
      
      // Add subdominant (5 semitones up from minor root)
      const subdominantIndex = (rootIndex + 5) % 12
      const subdominant = chromaticScale[subdominantIndex]
      relativeKeys.push(subdominant)
    } else {
      // For major keys, add relative minor (3 semitones down)
      const relativeMinorIndex = (rootIndex - 3 + 12) % 12
      const relativeMinor = chromaticScale[relativeMinorIndex] + 'm'
      relativeKeys.push(relativeMinor)
      
      // Add parallel minor (same root note, minor)
      relativeKeys.push(rootNote + 'm')
      
      // Add dominant (7 semitones up from major root)
      const dominantIndex = (rootIndex + 7) % 12
      const dominant = chromaticScale[dominantIndex]
      relativeKeys.push(dominant)
      
      // Add subdominant (5 semitones up from major root)
      const subdominantIndex = (rootIndex + 5) % 12
      const subdominant = chromaticScale[subdominantIndex]
      relativeKeys.push(subdominant)
    }
    
    console.log(`[KEY FILTER] Relative keys for ${key}:`, relativeKeys)
    return relativeKeys
  }

  // OPTIMIZATION: Batch multiple audio type queries into a single database call
  const getBatchedShuffleAudio = async (user: any, audioTypes: string[], transportKey?: string, selectedGenre?: any, selectedSubgenre?: string, transportBpm?: number, applyBpmFilter?: boolean) => {
    try {
      // Lazy load file links if format system is enabled and not already loaded
      if (formatSystemEnabled && fileLinks.length === 0) {
        console.log('[LAZY LOAD] Loading file links for batch shuffle (format system enabled)...')
        await fetchFileLinks()
        await fetchTotalAudioItems()
      } else if (!formatSystemEnabled) {
        console.log('[DIRECT LOAD] Format system disabled - loading directly from audio_library_items')
        await fetchTotalAudioItems()
      }

      // If shuffle tracker is disabled, get random files from entire table without tracking
      if (!isShuffleTrackerEnabled) {
        console.log(`[BATCH SHUFFLE] Tracker disabled - getting random files for multiple audio types: ${audioTypes.join(', ')}`)
        
        let query = supabase
          .from('audio_library_items')
          .select('*')
          .eq('user_id', user.id)
          .in('audio_type', audioTypes)
        
        if (isReadyCheckEnabled) {
          query = query.eq('is_ready', true)
        }
        
        // Add genre filtering if genre is selected
        if (selectedGenre && selectedGenre.name && selectedGenre.name !== 'none') {
          query = query.eq('genre', selectedGenre.name)
          console.log(`[GENRE FILTER] Filtering by genre: ${selectedGenre.name}`)
          
          // Add subgenre filtering if subgenre is selected
          if (selectedSubgenre && selectedSubgenre !== 'none') {
            query = query.eq('subgenre', selectedSubgenre)
            console.log(`[SUBGENRE FILTER] Filtering by subgenre: ${selectedSubgenre}`)
          }
        }
        
        // Add BPM filtering if transport BPM is provided and BPM filter is enabled
        if (applyBpmFilter && transportBpm) {
          const bpmTolerance = 10 // ±10 BPM tolerance
          const minBpm = transportBpm - bpmTolerance
          const maxBpm = transportBpm + bpmTolerance
          
          console.log(`[BPM FILTER] Filtering by BPM range: ${minBpm}-${maxBpm} (transport: ${transportBpm} ±${bpmTolerance})`)
          query = query.gte('bpm', minBpm).lte('bpm', maxBpm)
        }
        
        // Add key filtering if transport key is provided and we're in T-M mode
        if (transportKey && melodyLoopMode === 'transport-dominates') {
          // USE ALL 12 CHROMATIC KEYS instead of just 5 relative keys for maximum variety
          const allChromaticKeys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
          const allKeysWithModes = [
            ...allChromaticKeys, // Major keys
            ...allChromaticKeys.map(k => k + 'm'), // Minor keys
            ...allChromaticKeys.map(k => k + 'min'), // Alternative minor format
            ...allChromaticKeys.map(k => k + ' minor'), // Key signature format
            ...allChromaticKeys.map(k => k + ' major') // Key signature format
          ]
          
          console.log(`[KEY FILTER] Using ALL 12 chromatic keys instead of just 5 relative keys for maximum variety`)
          console.log(`[KEY FILTER] Total expanded keys: ${allKeysWithModes.length}`)
          query = query.in('key', allKeysWithModes)
        }
        
        const { data: allFiles } = await query
        
        if (!allFiles || allFiles.length === 0) {
          console.log(`[BATCH SHUFFLE] No files found for audio types: ${audioTypes.join(', ')}`)
          return {}
        }
        
        // Group files by audio type
        const filesByType: { [audioType: string]: any[] } = {}
        audioTypes.forEach(type => {
          filesByType[type] = allFiles.filter(file => file.audio_type === type)
        })
        
        // Group files by audio type (using existing filesByType from above)
        audioTypes.forEach(type => {
          filesByType[type] = allFiles.filter(file => file.audio_type === type)
        })
        
        // Shuffle each group and apply limitation
        const result: { [audioType: string]: any[] } = {}
        Object.keys(filesByType).forEach(audioType => {
          const files = filesByType[audioType]

          
          const shuffledFiles = shuffleArray(files)
          

          
          if (isShuffleLimitEnabled) {
            result[audioType] = shuffledFiles.slice(0, 10)
            console.log(`[BATCH SHUFFLE] ${audioType}: Found ${filesByType[audioType].length} files, returning ${result[audioType].length} limited files`)
          } else {
            result[audioType] = shuffledFiles
            console.log(`[BATCH SHUFFLE] ${audioType}: Found ${filesByType[audioType].length} files, returning all shuffled files`)
          }
        })
        
        return result
      }

      // Shuffle tracker is enabled - use tracking logic
      console.log(`[BATCH SHUFFLE] Tracker enabled - using tracking for audio types: ${audioTypes.join(', ')}`)
      
      // Get tracked files for all audio types
      const { data: trackedFiles } = await supabase
        .from('audio_shuffle_tracker')
        .select('audio_id')
        .eq('user_id', user.id)
        .eq('was_loaded', true)

      // Get all available files for the audio types
      let query = supabase
        .from('audio_library_items')
        .select('*')
        .eq('user_id', user.id)
        .in('audio_type', audioTypes)
        .not('id', 'in', `(${trackedFiles?.map(t => t.audio_id).join(',') || '00000000-0000-0000-0000-000000000000'})`)
        .order('created_at', { ascending: true })
        .limit(5000) // Large limit for batch processing
      
      if (isReadyCheckEnabled) {
        query = query.eq('is_ready', true)
      }
      
      // Add filters
      if (selectedGenre && selectedGenre.name && selectedGenre.name !== 'none') {
        query = query.eq('genre', selectedGenre.name)
        if (selectedSubgenre && selectedSubgenre !== 'none') {
          query = query.eq('subgenre', selectedSubgenre)
        }
      }
      
      if (transportKey && melodyLoopMode === 'transport-dominates') {
        // USE ALL 12 CHROMATIC KEYS instead of just 5 relative keys for maximum variety
        const allChromaticKeys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        const allKeysWithModes = [
          ...allChromaticKeys, // Major keys
          ...allChromaticKeys.map(k => k + 'm'), // Minor keys
          ...allChromaticKeys.map(k => k + 'min'), // Alternative minor format
          ...allChromaticKeys.map(k => k + ' minor'), // Key signature format
          ...allChromaticKeys.map(k => k + ' major') // Key signature format
        ]
        
        console.log(`[KEY FILTER] Using ALL 12 chromatic keys instead of just 5 relative keys`)
        console.log(`[KEY FILTER] Total keys available: ${allKeysWithModes.length}`)
        console.log(`[KEY FILTER] Keys: ${allKeysWithModes.slice(0, 10).join(', ')}...`)
        
        query = query.in('key', allKeysWithModes)
      }
      
      if (applyBpmFilter && transportBpm) {
        const bpmTolerance = 10
        const minBpm = transportBpm - bpmTolerance
        const maxBpm = transportBpm + bpmTolerance
        query = query.gte('bpm', minBpm).lte('bpm', maxBpm)
      }
      
      const { data: availableFiles } = await query
      
      if (!availableFiles || availableFiles.length === 0) {
        console.log(`[BATCH SHUFFLE] No available files found for audio types: ${audioTypes.join(', ')}`)
        return {}
      }
      
      // Group files by audio type (using existing filesByType from above)
      audioTypes.forEach(type => {
        filesByType[type] = availableFiles.filter(file => file.audio_type === type)
      })
      
      // Apply limit and shuffle for each type
      const result: { [audioType: string]: any[] } = {}
      const filesToTrack: any[] = []
      
      Object.keys(filesByType).forEach(audioType => {
        const files = filesByType[audioType]
        const shuffledFiles = shuffleArray(files)
        
        if (isShuffleLimitEnabled) {
          result[audioType] = shuffledFiles.slice(0, 10)
        } else {
          result[audioType] = shuffledFiles
        }
        
        // Add files to tracking list
        filesToTrack.push(...result[audioType])
      })
      
      // Mark files as loaded in the tracker
      if (filesToTrack.length > 0) {
        const trackerUpdates = filesToTrack.map(file => ({
          user_id: user.id,
          audio_id: file.id,
          was_loaded: true,
          load_count: 1
        }))

        await supabase
          .from('audio_shuffle_tracker')
          .upsert(trackerUpdates, { 
            onConflict: 'user_id,audio_id',
            ignoreDuplicates: false 
          })

        await supabase.rpc('increment_shuffle_load_count', {
          p_user_id: user.id,
          p_audio_ids: filesToTrack.map(f => f.id)
        })

        console.log(`[BATCH SHUFFLE] Marked ${filesToTrack.length} files as loaded across ${audioTypes.length} audio types`)
      }
      
      return result
    } catch (error) {
      console.error('Error in getBatchedShuffleAudio:', error)
      return {}
    }
  }

  // Helper function to manage shuffle tracking with key filtering
  const getShuffleAudioBatch = async (user: any, audioType: string, transportKey?: string, selectedGenre?: any, selectedSubgenre?: string, transportBpm?: number, applyBpmFilter?: boolean) => {
    try {
      // Lazy load file links if format system is enabled and not already loaded
      if (formatSystemEnabled && fileLinks.length === 0) {
        console.log('[LAZY LOAD] Loading file links for shuffle (format system enabled)...')
        await fetchFileLinks()
        await fetchTotalAudioItems()
      } else if (!formatSystemEnabled) {
        console.log('[DIRECT LOAD] Format system disabled - loading directly from audio_library_items')
        await fetchTotalAudioItems()
      }
      // If shuffle tracker is disabled, get random files from entire table without tracking
      if (!isShuffleTrackerEnabled) {
        console.log(`[SHUFFLE TRACKER] Tracker disabled - getting random files from entire table for ${audioType}`)
        
        // Special debug for Kick audio type
        if (audioType === 'Kick') {
        }
        
        let query = supabase
          .from('audio_library_items')
          .select('*')
          .eq('user_id', user.id)
          .eq('audio_type', audioType)
        
        if (isReadyCheckEnabled) {
          query = query.eq('is_ready', true)
        }
        
        // Add genre filtering if genre is selected
        if (selectedGenre && selectedGenre.name && selectedGenre.name !== 'none') {
          query = query.eq('genre', selectedGenre.name)
          console.log(`[GENRE FILTER] Filtering by genre: ${selectedGenre.name}`)
          
          // Add subgenre filtering if subgenre is selected
          if (selectedSubgenre && selectedSubgenre !== 'none') {
            query = query.eq('subgenre', selectedSubgenre)
            console.log(`[SUBGENRE FILTER] Filtering by subgenre: ${selectedSubgenre}`)
          }
        }
        
        // Add BPM filtering if transport BPM is provided and BPM filter is enabled (Strata mode shuffle all)
        if (applyBpmFilter && transportBpm) {
          const bpmTolerance = 10 // ±10 BPM tolerance
          const minBpm = transportBpm - bpmTolerance
          const maxBpm = transportBpm + bpmTolerance
          
          console.log(`[BPM FILTER] Filtering by BPM range: ${minBpm}-${maxBpm} (transport: ${transportBpm} ±${bpmTolerance})`)
          
          // Filter by BPM range
          query = query.gte('bpm', minBpm).lte('bpm', maxBpm)
        }
        
        // Add key filtering if transport key is provided and we're in T-M mode
        if (transportKey && melodyLoopMode === 'transport-dominates') {
          // USE ALL 12 CHROMATIC KEYS instead of just 5 relative keys for maximum variety
          const allChromaticKeys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
          const allKeysWithModes = [
            ...allChromaticKeys, // Major keys
            ...allChromaticKeys.map(k => k + 'm'), // Minor keys
            ...allChromaticKeys.map(k => k + 'min'), // Alternative minor format
            ...allChromaticKeys.map(k => k + ' minor'), // Key signature format
            ...allChromaticKeys.map(k => k + ' major') // Key signature format
          ]
          
          console.log(`[KEY FILTER] Using ALL 12 chromatic keys instead of just 5 relative keys`)
          console.log(`[KEY FILTER] Total keys available: ${allKeysWithModes.length}`)
          console.log(`[KEY FILTER] Keys: ${allKeysWithModes.slice(0, 10).join(', ')}...`)
          
          // Filter by key column first
          query = query.in('key', allKeysWithModes)
          
          // If no results from key column, try key_signature column as fallback
          const { data: keyFilteredFiles } = await query
          if (!keyFilteredFiles || keyFilteredFiles.length === 0) {
            console.log(`[KEY FILTER] No files found with key column, trying key_signature fallback`)
            
            // Reset query and try key_signature
            query = supabase
              .from('audio_library_items')
              .select('*')
              .eq('user_id', user.id)
              .eq('audio_type', audioType)
            
            if (isReadyCheckEnabled) {
              query = query.eq('is_ready', true)
            }
            
            // Add genre filtering to fallback query
            if (selectedGenre && selectedGenre.name && selectedGenre.name !== 'none') {
              query = query.eq('genre', selectedGenre.name)
              
              if (selectedSubgenre && selectedSubgenre !== 'none') {
                query = query.eq('subgenre', selectedSubgenre)
              }
            }
            
            // Add BPM filtering to fallback query
            if (applyBpmFilter && transportBpm) {
              const bpmTolerance = 10
              const minBpm = transportBpm - bpmTolerance
              const maxBpm = transportBpm + bpmTolerance
              query = query.gte('bpm', minBpm).lte('bpm', maxBpm)
            }
            
            // Map ALL 12 chromatic keys to key_signature format for fallback
            const allChromaticKeys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
            const keySignatureFilters = [
              ...allChromaticKeys.map(k => `${k} major`),
              ...allChromaticKeys.map(k => `${k} minor`)
            ]
            
            query = query.in('key_signature', keySignatureFilters)
            console.log(`[KEY FILTER] Fallback: Using ALL 12 chromatic keys in key_signature format`)
            console.log(`[KEY FILTER] Fallback keys: ${keySignatureFilters.slice(0, 10).join(', ')}...`)
          }
        }
        
        const { data: allFiles } = await query
        

        
        if (!allFiles || allFiles.length === 0) {
          console.log(`[KEY FILTER] No files found with key filtering for ${audioType}`)
          return []
        }
        
        // Shuffle the entire array and apply limitation based on toggle
        const shuffledFiles = shuffleArray(allFiles)
        
        if (isShuffleLimitEnabled) {
          // Apply 10 file limitation when enabled
          const limitedFiles = shuffledFiles.slice(0, 10)
          console.log(`[SHUFFLE LIMIT] Limit enabled - Found ${allFiles.length} total files, returning ${limitedFiles.length} limited files`)
          return limitedFiles
        } else {
          // No limitation when disabled
          console.log(`[SHUFFLE LIMIT] Limit disabled - Found ${allFiles.length} total files, returning all shuffled files`)
          return shuffledFiles
        }
      }

      // Shuffle tracker is enabled - use tracking logic with key filtering
      console.log(`[SHUFFLE TRACKER] Tracker enabled - using tracking for ${audioType}`)
      
      // First, check if we need to reset the tracker (all sounds have been used)
      let totalAudioQuery = supabase
        .from('audio_library_items')
        .select('id')
        .eq('user_id', user.id)
        .eq('audio_type', audioType)
      if (isReadyCheckEnabled) {
        totalAudioQuery = totalAudioQuery.eq('is_ready', true) // Only include ready audio files when ready check is enabled
      }
      
      // Add genre filtering to total count query
      if (selectedGenre && selectedGenre.name && selectedGenre.name !== 'none') {
        totalAudioQuery = totalAudioQuery.eq('genre', selectedGenre.name)
        
        if (selectedSubgenre && selectedSubgenre !== 'none') {
          totalAudioQuery = totalAudioQuery.eq('subgenre', selectedSubgenre)
        }
      }
      
      // Add key filtering to total count query
      if (transportKey && melodyLoopMode === 'transport-dominates') {
        // USE ALL 12 CHROMATIC KEYS instead of just 5 relative keys for maximum variety
        const allChromaticKeys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        const allKeysWithModes = [
          ...allChromaticKeys, // Major keys
          ...allChromaticKeys.map(k => k + 'm'), // Minor keys
          ...allChromaticKeys.map(k => k + 'min'), // Alternative minor format
          ...allChromaticKeys.map(k => k + ' minor'), // Key signature format
          ...allChromaticKeys.map(k => k + ' major') // Key signature format
        ]
        totalAudioQuery = totalAudioQuery.in('key', allKeysWithModes)
      }
      
      const { data: totalAudioFiles } = await totalAudioQuery

      const { data: trackedFiles } = await supabase
        .from('audio_shuffle_tracker')
        .select('audio_id')
        .eq('user_id', user.id)
        .eq('was_loaded', true)

      // If all audio files have been tracked as loaded, reset the tracker
      if (totalAudioFiles && trackedFiles && totalAudioFiles.length > 0 && 
          trackedFiles.length >= totalAudioFiles.length) {
        console.log(`[SHUFFLE TRACKER] All ${totalAudioFiles.length} ${audioType} files have been used. Resetting tracker.`)
        
        await supabase
          .from('audio_shuffle_tracker')
          .update({ was_loaded: false })
          .eq('user_id', user.id)
      }

      // Get audio files that haven't been loaded yet
      // When limit is enabled: 5 from the top (oldest) and 5 from the bottom (newest) of created_at order
      // When limit is disabled: Get all available files
      const limitCount = isShuffleLimitEnabled ? 5 : 5000 // Large number when limit disabled
      
      let topFilesQuery = supabase
        .from('audio_library_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('audio_type', audioType)
        .not('id', 'in', `(${trackedFiles?.map(t => t.audio_id).join(',') || '00000000-0000-0000-0000-000000000000'})`)
        .order('created_at', { ascending: true })
        .limit(isShuffleLimitEnabled ? limitCount : 5000)
      if (isReadyCheckEnabled) {
        topFilesQuery = topFilesQuery.eq('is_ready', true) // Only include ready audio files when ready check is enabled
      }
      
      // Add key filtering to top files query
      if (transportKey && melodyLoopMode === 'transport-dominates') {
        // USE ALL 12 CHROMATIC KEYS instead of just 5 relative keys for maximum variety
        const allChromaticKeys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        const allKeysWithModes = [
          ...allChromaticKeys, // Major keys
          ...allChromaticKeys.map(k => k + 'm'), // Minor keys
          ...allChromaticKeys.map(k => k + 'min'), // Alternative minor format
          ...allChromaticKeys.map(k => k + ' minor'), // Key signature format
          ...allChromaticKeys.map(k => k + ' major') // Key signature format
        ]
        topFilesQuery = topFilesQuery.in('key', allKeysWithModes)
      }
      
      // Add BPM filtering to top files query
      if (applyBpmFilter && transportBpm) {
        const bpmTolerance = 10
        const minBpm = transportBpm - bpmTolerance
        const maxBpm = transportBpm + bpmTolerance
        topFilesQuery = topFilesQuery.gte('bpm', minBpm).lte('bpm', maxBpm)
      }
      
      const { data: topFiles } = await topFilesQuery

      let bottomFilesQuery = supabase
        .from('audio_library_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('audio_type', audioType)
        .not('id', 'in', `(${trackedFiles?.map(t => t.audio_id).join(',') || '00000000-0000-0000-0000-000000000000'})`)
        .order('created_at', { ascending: false })
        .limit(isShuffleLimitEnabled ? limitCount : 5000)
      if (isReadyCheckEnabled) {
        bottomFilesQuery = bottomFilesQuery.eq('is_ready', true) // Only include ready audio files when ready check is enabled
      }
      
      // Add key filtering to bottom files query
      if (transportKey && melodyLoopMode === 'transport-dominates') {
        // USE ALL 12 CHROMATIC KEYS instead of just 5 relative keys for maximum variety
        const allChromaticKeys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        const allKeysWithModes = [
          ...allChromaticKeys, // Major keys
          ...allChromaticKeys.map(k => k + 'm'), // Minor keys
          ...allChromaticKeys.map(k => k + 'min'), // Alternative minor format
          ...allChromaticKeys.map(k => k + ' minor'), // Key signature format
          ...allChromaticKeys.map(k => k + ' major') // Key signature format
        ]
        bottomFilesQuery = bottomFilesQuery.in('key', allKeysWithModes)
      }
      
      // Add BPM filtering to bottom files query
      if (applyBpmFilter && transportBpm) {
        const bpmTolerance = 10
        const minBpm = transportBpm - bpmTolerance
        const maxBpm = transportBpm + bpmTolerance
        bottomFilesQuery = bottomFilesQuery.gte('bpm', minBpm).lte('bpm', maxBpm)
      }
      
      const { data: bottomFiles } = await bottomFilesQuery

      // Combine and remove duplicates
      const allFiles = [...(topFiles || []), ...(bottomFiles || [])]
      const uniqueFiles = allFiles.filter((file, index, self) => 
        index === self.findIndex(f => f.id === file.id)
      )

      // Mark these files as loaded in the tracker
      if (uniqueFiles.length > 0) {
        const trackerUpdates = uniqueFiles.map(file => ({
          user_id: user.id,
          audio_id: file.id,
          was_loaded: true,
          load_count: 1 // Will be incremented by the database
        }))

        // Use upsert to handle both insert and update cases
        await supabase
          .from('audio_shuffle_tracker')
          .upsert(trackerUpdates, { 
            onConflict: 'user_id,audio_id',
            ignoreDuplicates: false 
          })

        // Increment load_count for existing records
        await supabase.rpc('increment_shuffle_load_count', {
          p_user_id: user.id,
          p_audio_ids: uniqueFiles.map(f => f.id)
        })

        console.log(`[SHUFFLE TRACKER] Marked ${uniqueFiles.length} ${audioType} files as loaded`)
      }

      return uniqueFiles
    } catch (error) {
      console.error('Error in getShuffleAudioBatch:', error)
      return []
    }
  }

  const handleShuffleAll = async () => {
    try {
      console.log('[SHUFFLE ALL] Starting shuffle all operation...')
      
      // CRITICAL: Reset all halftime states before shuffling
      console.log('[SHUFFLE ALL] Resetting all halftime states...')
      setTracks(prevTracks => 
        prevTracks.map(track => ({
          ...track,
          pitchShift: 0,  // Reset pitch shift
          playbackRate: 1.0,  // Reset playback rate to normal
          currentBpm: track.originalBpm || track.bpm || bpm  // Reset to original BPM
        }))
      )
      
      // CRITICAL: Stop all audio and clear any existing loops first
      console.log('[SHUFFLE ALL] Stopping all audio and clearing loops...')
      
      // Stop Tone.js Transport
      const Tone = await import('tone')
      if (Tone.Transport.state === 'started') {
        Tone.Transport.stop()
        Tone.Transport.cancel()
        Tone.Transport.position = 0
        console.log('[SHUFFLE ALL] Stopped Tone.js Transport')
      }
      
      // Stop all audio players
      if (window.audioPlayers) {
        Object.values(window.audioPlayers).forEach((player: any) => {
          if (player && player.stop) {
            try {
              player.stop()
              player.dispose()
            } catch (error) {
              console.warn('[SHUFFLE ALL] Error stopping player:', error)
            }
          }
        })
        window.audioPlayers = {}
        console.log('[SHUFFLE ALL] Stopped all audio players')
      }
      
      // Clear any intervals
      if (window.shuffleIntervals) {
        window.shuffleIntervals.forEach(interval => {
          clearInterval(interval)
        })
        window.shuffleIntervals = []
        console.log('[SHUFFLE ALL] Cleared all intervals')
      }
      
      // Small delay to ensure cleanup is complete and halftime states are reset
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to shuffle audio files')
        return
      }

      // Close current session to prevent accidental overwrites
      if (currentSessionId) {
        console.log('[SHUFFLE ALL] Closing current session to prevent accidental overwrites')
        setCurrentSessionId(null)
        setCurrentSessionName('')
        setHasUnsavedChanges(false)
        showNotification('Info', 'Session closed. Shuffle All will create a new session state.', 'info')
      }

      // Set transport to 8 bars (128 steps) when shuffling all
      setSteps(128)
      console.log('[SHUFFLE ALL] Set transport to 8 bars (128 steps)')

      // Handle track loading based on Strata mode, Latido mode, and Helios mode
      if (isAutoMode) {
        // Strata mode ON: Load only loop tracks (not drum tracks)
        const defaultTrackNames = ['Melody Loop', 'Drum Loop', 'Hihat Loop', 'Percussion Loop', '808 Loop']
        const currentTrackNames = tracks.map(t => t.name)
        
        // Check if any default tracks are missing
        const missingTracks = defaultTrackNames.filter(name => !currentTrackNames.includes(name))
        
        if (missingTracks.length > 0) {
          console.log(`[STRATA MODE ON] Missing tracks detected: ${missingTracks.join(', ')}. Reloading default loop tracks only.`)
          
          // Reset to default tracks - only loop tracks (no drum tracks)
          const defaultTracks: Track[] = [
            { id: 1, name: 'Melody Loop', audioUrl: null, color: 'bg-red-500', playbackRate: 1.0, pitchShift: 0 },
            { id: 2, name: 'Drum Loop', audioUrl: null, color: 'bg-blue-500', playbackRate: 1.0, pitchShift: 0 },
            { id: 3, name: 'Hihat Loop', audioUrl: null, color: 'bg-green-500', playbackRate: 1.0, pitchShift: 0 },
            { id: 4, name: 'Percussion Loop', audioUrl: null, color: 'bg-purple-500', playbackRate: 1.0, pitchShift: 0 },
            { id: 5, name: '808 Loop', audioUrl: null, color: 'bg-yellow-500', playbackRate: 1.0, pitchShift: 0 },
          ]
          
          setTracks(defaultTracks)
          
          // Initialize sequencer data for new tracks
          const initialSequencerData: {[trackId: number]: boolean[]} = {}
          defaultTracks.forEach(track => {
            const stepPattern = new Array(steps).fill(false)
            stepPattern[0] = true // Activate first step
            initialSequencerData[track.id] = stepPattern
          })
          setSequencerDataFromSession(initialSequencerData)
        }
      } else if (isLatidoMode) {
        // Latido mode ON: Load drum tracks (same as old Strata OFF behavior)
        console.log(`[LATIDO MODE ON] Loading drum tracks for shuffle all`)
        
        // Reset to drum tracks
        const drumTracks: Track[] = [
          { id: 1, name: 'Kick', audioUrl: null, color: 'bg-red-500', playbackRate: 1.0, pitchShift: 0 },
          { id: 2, name: 'Snare', audioUrl: null, color: 'bg-blue-500', playbackRate: 1.0, pitchShift: 0 },
          { id: 3, name: 'Hi-Hat', audioUrl: null, color: 'bg-green-500', playbackRate: 1.0, pitchShift: 0 },
          { id: 4, name: 'Percussion', audioUrl: null, color: 'bg-purple-500', playbackRate: 1.0, pitchShift: 0 },
        ]
        
        setTracks(drumTracks)
        
        // Initialize sequencer data for new tracks
        const initialSequencerData: {[trackId: number]: boolean[]} = {}
        drumTracks.forEach(track => {
          const stepPattern = new Array(steps).fill(false)
          stepPattern[0] = true // Activate first step
          initialSequencerData[track.id] = stepPattern
        })
        setSequencerDataFromSession(initialSequencerData)
      } else if (isHeliosMode) {
        // Helios mode ON: Create hybrid drum/loop track combinations
        console.log(`[HELIOS MODE ON] Creating hybrid drum/loop track combinations`)
        
        // Define all possible track options for Helios mode
        const heliosTrackOptions = [
          // Drum tracks
          { name: 'Kick', color: 'bg-red-500', isDrum: true },
          { name: 'Snare', color: 'bg-blue-500', isDrum: true },
          { name: 'Hi-Hat', color: 'bg-green-500', isDrum: true },
          { name: 'Bass', color: 'bg-purple-500', isDrum: true },
          { name: 'Percussion', color: 'bg-orange-500', isDrum: true },
          // Loop tracks
          { name: 'Melody Loop', color: 'bg-red-500', isDrum: false },
          { name: 'Drum Loop', color: 'bg-blue-500', isDrum: false },
          { name: 'Hihat Loop', color: 'bg-green-500', isDrum: false },
          { name: 'Bass Loop', color: 'bg-purple-500', isDrum: false },
          { name: 'Percussion Loop', color: 'bg-orange-500', isDrum: false },
        ]
        
        // Randomly select 4-5 tracks, ensuring no duplicates
        const selectedTracks: Track[] = []
        const usedNames = new Set<string>()
        
        // Shuffle the options
        const shuffledOptions = shuffleArray(heliosTrackOptions)
        
        // Select 4-5 tracks randomly
        const numTracks = Math.random() > 0.5 ? 4 : 5
        
        for (let i = 0; i < shuffledOptions.length && selectedTracks.length < numTracks; i++) {
          const option = shuffledOptions[i]
          if (!usedNames.has(option.name)) {
            selectedTracks.push({
              id: selectedTracks.length + 1,
              name: option.name,
              audioUrl: null,
              color: option.color,
              playbackRate: 1.0,  // CRITICAL: Always start with normal playback rate (halftime OFF)
              pitchShift: 0       // CRITICAL: Always start with no pitch shift
            })
            usedNames.add(option.name)
          }
        }
        
        console.log(`[HELIOS MODE] Selected tracks: ${selectedTracks.map(t => t.name).join(', ')}`)
        
        setTracks(selectedTracks)
        
        // Initialize sequencer data for new tracks
        const initialSequencerData: {[trackId: number]: boolean[]} = {}
        selectedTracks.forEach(track => {
          const displayName = getTrackDisplayName(track.name);
          const isLoopTrack = displayName.includes('🔄');
          
          if (isLoopTrack) {
            // Loop tracks: only first step active
            const stepPattern = new Array(steps).fill(false)
            stepPattern[0] = true // Activate first step only
            initialSequencerData[track.id] = stepPattern
          } else {
            // Drum tracks: get shuffled pattern
            const patternLibrary = getPatternLibraryForTrackType(track.name)
            const shuffledPatterns = shuffleArray(patternLibrary)
            const randomPattern = shuffledPatterns[0]
            
            let newPattern: boolean[]
            if (steps === 16) {
              newPattern = randomPattern
            } else if (steps === 8) {
              newPattern = randomPattern.slice(0, 8)
            } else if (steps === 32) {
              newPattern = [...randomPattern, ...randomPattern]
            } else if (steps === 64) {
              newPattern = [...randomPattern, ...randomPattern, ...randomPattern, ...randomPattern]
            } else {
              newPattern = randomPattern.slice(0, steps)
            }
            
            initialSequencerData[track.id] = newPattern
          }
                })
        setSequencerDataFromSession(initialSequencerData)
      } else {
        // All modes OFF: Don't change tracks, just shuffle audio
        console.log(`[ALL MODES OFF] Keeping current tracks, only shuffling audio`)
      }

      // DON'T toggle melody loop mode on shuffle - keep the current mode
      // The mode should only be changed when explicitly requested, not automatically
      console.log(`[SHUFFLE ALL] Keeping current Melody Loop Mode: ${melodyLoopMode} (${melodyLoopMode === 'transport-dominates' ? 'T→M' : 'M→T'})`)
      
      // Store current transport settings if locked
      const originalBpm = isBpmLocked ? bpm : null
      const originalKey = isKeyLocked ? transportKey : null

      // Store current genre/subgenre settings if locked
      const originalGenre = isGenreLocked ? selectedGenre : null
      const originalSubgenre = isSubgenreLocked ? selectedSubgenre : null

      // Get tempo range based on current genre/subgenre or use transport BPM range
      let newBpm = bpm
      
      if (selectedGenreId && selectedGenreId !== 'none') {
        try {
          const { data: tempoRange, error } = await supabase.rpc('get_tempo_range', {
            p_genre_id: selectedGenreId,
            p_subgenre: selectedSubgenre === 'none' ? null : selectedSubgenre
          })
          
          if (!error && tempoRange && tempoRange.length > 0) {
            const range = tempoRange[0]
            // Use the transport BPM range if it's different from the genre's default range
            const minBpm = Math.max(range.min_bpm, bpmRange[0])
            const maxBpm = Math.min(range.max_bpm, bpmRange[1])
            
            if (minBpm <= maxBpm) {
              // Generate random BPM within the intersection of genre range and transport range
              newBpm = Math.floor(Math.random() * (maxBpm - minBpm + 1)) + minBpm
              console.log(`[SHUFFLE] Genre range: ${range.min_bpm}-${range.max_bpm}, Transport range: ${bpmRange[0]}-${bpmRange[1]}, Using: ${minBpm}-${maxBpm}, new BPM: ${newBpm}`)
            } else {
              // If ranges don't overlap, use transport range
              newBpm = Math.floor(Math.random() * (bpmRange[1] - bpmRange[0] + 1)) + bpmRange[0]
              console.log(`[SHUFFLE] Ranges don't overlap, using transport range: ${bpmRange[0]}-${bpmRange[1]}, new BPM: ${newBpm}`)
            }
          }
        } catch (error) {
          console.warn('Error getting tempo range:', error)
          // Fallback to transport BPM range
          newBpm = Math.floor(Math.random() * (bpmRange[1] - bpmRange[0] + 1)) + bpmRange[0]
          console.log(`[SHUFFLE] Error getting genre range, using transport range: ${bpmRange[0]}-${bpmRange[1]}, new BPM: ${newBpm}`)
        }
      } else {
        // No genre selected, use transport BPM range
        newBpm = Math.floor(Math.random() * (bpmRange[1] - bpmRange[0] + 1)) + bpmRange[0]
        console.log(`[SHUFFLE] No genre selected, using transport BPM range: ${bpmRange[0]}-${bpmRange[1]}, new BPM: ${newBpm}`)
      }

      // NEW: Shuffle audio samples using the tracking system
      // Get tracks that need audio shuffling (skip locked tracks)
      const tracksToShuffle = tracks.filter(track => [
        // Drums
        'Kick', 'Snare', 'Hi-Hat', 'Clap', 'Crash', 'Ride', 'Tom', 'Cymbal', 'Percussion',
        // Bass
        'Bass', 'Sub', '808',
        // Melodic
        'Melody', 'Lead', 'Pad', 'Chord', 'Arp',
        // Loops
        'Melody Loop', 'Piano Loop', '808 Loop', 'Drum Loop', 'Hihat Loop', 'Percussion Loop', 'Bass Loop', 'Vocal Loop', 'Guitar Loop', 'Synth Loop',
        // Effects & Technical
        'FX', 'Vocal', 'Sample', 'MIDI', 'Patch', 'Preset'
      ].includes(track.name) && !track.locked)

      // Map track names to audio types
      const trackTypeMap: { [key: string]: string } = {
        // Drums
        'Kick': 'Kick',
        'Snare': 'Snare', 
        'Hi-Hat': 'Hihat',
        'Clap': 'Clap',
        'Crash': 'Crash',
        'Ride': 'Ride',
        'Tom': 'Tom',
        'Cymbal': 'Cymbal',
        'Percussion': 'Percussion',
        
        // Bass
        'Bass': 'Bass',
        'Sub': 'Sub',
        '808': '808',
        
        // Melodic
        'Melody': 'Melody',
        'Lead': 'Lead',
        'Pad': 'Pad',
        'Chord': 'Chord',
        'Arp': 'Arp',
        
        // Loops
        'Melody Loop': 'Melody Loop',
        'Piano Loop': 'Piano Loop',
        '808 Loop': '808 Loop',
        'Drum Loop': 'Drum Loop',
        'Hihat Loop': 'Hihat Loop',
        'Percussion Loop': 'Percussion Loop',
        'Bass Loop': 'Bass Loop',
        'Vocal Loop': 'Vocal Loop',
        'Guitar Loop': 'Guitar Loop',
        'Synth Loop': 'Synth Loop',
        
        // Effects & Technical
        'FX': 'FX',
        'Vocal': 'Vocal',
        'Sample': 'Sample',
        'MIDI': 'MIDI',
        'Patch': 'Patch',
        'Preset': 'Preset'
      }

      // OPTIMIZATION: Use batched audio queries to reduce database calls
      // First, collect all unique audio types needed
      const audioTypesNeeded = new Set<string>()
      const trackAudioTypeMap = new Map<number, string>()
      
      tracksToShuffle.forEach(track => {
        // Extract base track type from name (remove key suffix for loops)
        let baseTrackName = track.name
        if (track.name.includes(' Loop ') && track.name.split(' ').length > 2) {
          const parts = track.name.split(' ')
          baseTrackName = parts.slice(0, -1).join(' ') // Remove the last part (the key)
        }
        
        const audioType = trackTypeMap[baseTrackName]
        if (audioType) {
          audioTypesNeeded.add(audioType)
          trackAudioTypeMap.set(track.id, audioType)
        }
      })
      
      // Get all audio files in a single batched query
      console.log(`[OPTIMIZATION] Batching ${audioTypesNeeded.size} audio types into single query instead of ${tracksToShuffle.length} individual queries`)
      const batchedAudioFiles = await getBatchedShuffleAudio(
        user, 
        Array.from(audioTypesNeeded), 
        transportKey, 
        selectedGenre, 
        selectedSubgenre, 
        bpm, 
        isBpmToleranceEnabled
      )
      
      // Update the cache with batched results for individual shuffles to use
      updateBatchedCache(batchedAudioFiles)
      
      // Log cache status for debugging
      const cacheStatus = getCacheStatus()
      console.log(`[CACHE STATUS] Cache updated: ${cacheStatus.size} entries, age: ${cacheStatus.age}s, valid: ${cacheStatus.isValid}`)
      
      // Now process each track using the pre-fetched audio files
      const audioShufflePromises = tracksToShuffle.map(async track => {
        try {
          // Helios mode: Shuffle all tracks (both drum and loop tracks)
          if (isHeliosMode) {
            const isDrumTrack = ['Kick', 'Snare', 'Hi-Hat', 'Bass', 'Percussion', 'Drum Loop'].includes(track.name)
            const isLoopTrack = track.name.includes(' Loop')
            
            console.log(`[HELIOS MODE] Processing ${isDrumTrack ? 'drum' : isLoopTrack ? 'loop' : 'other'} track: ${track.name}`)
          }
          
          // Extract base track type from name (remove key suffix for loops)
          let baseTrackName = track.name
          if (track.name.includes(' Loop ') && track.name.split(' ').length > 2) {
            const parts = track.name.split(' ')
            baseTrackName = parts.slice(0, -1).join(' ') // Remove the last part (the key)
          }
          
          const audioType = trackAudioTypeMap.get(track.id)
          if (!audioType) {
            console.log(`No audio type mapping found for track: ${track.name}`)
            return { track, success: false }
          }

          console.log(`[BATCHED SHUFFLE] Getting audio for track: ${track.name} (${audioType})`)
          
          // Check if this track should be filtered by key (skip drum tracks - they don't need key filtering)
          const isDrumTrack = ['Kick', 'Snare', 'Hi-Hat', 'Clap', 'Crash', 'Ride', 'Tom', 'Cymbal', 'Percussion', 'Drum Loop'].includes(track.name)
          const isDrumLoop = ['Drum Loop', 'Percussion Loop', 'Hihat Loop'].includes(track.name)
          const shouldFilterByKey = !isDrumTrack && !isDrumLoop
          const keyToUse = shouldFilterByKey ? transportKey : undefined
          
          // Get audio files from the batched result
          const audioFiles = batchedAudioFiles[audioType] || []
          
          if (audioFiles.length === 0) {
            console.log(`[SHUFFLE TRACKER] No audio files available for ${audioType}`)
            return { track, success: false }
          }

          // Randomly select one from the batch
          const randomIndex = Math.floor(Math.random() * audioFiles.length)
          const selectedAudio = audioFiles[randomIndex]

          // Update the track with the new audio
          const publicUrl = getPublicAudioUrl(selectedAudio.file_url || '')
          
          // Handle tempo and key based on transport lock status
          let finalBpm = selectedAudio.bpm || 120
          let finalKey = selectedAudio.key || 'C'
          let pitchShift = 0
          let playbackRate = 1.0
          
          // Check if this is a relative key (not exact match with transport key)
          // Only mark as relative key if it's not a drum-related loop
          const isRelativeKey = !isDrumLoop && transportKey && selectedAudio.key && selectedAudio.key !== transportKey
          
          if (isBpmLocked || isKeyLocked) {
            // Transport is partially or fully locked - adapt tracks accordingly
            if (isBpmLocked) {
              // DISABLED: Automatic BPM adaptation to prevent halftime-like behavior
              // finalBpm = bpm
              // Instead, always use original BPM to prevent automatic halftime
              finalBpm = selectedAudio.bpm || 120
              console.log(`[DISABLED] Automatic BPM adaptation prevented for locked track`)
              
              // DISABLED: Automatic playback rate calculation to prevent halftime-like behavior
              // Calculate playback rate to match transport tempo
              if (selectedAudio.bpm && selectedAudio.bpm > 0) {
                // DISABLED: playbackRate = bpm / selectedAudio.bpm
                // Instead, keep original playback rate to prevent automatic halftime
                playbackRate = 1.0
                console.log(`[DISABLED] Automatic BPM adaptation prevented for locked track`)
              }
            }
            
            if (isKeyLocked && !isDrumTrack) {
              // Only apply key matching for non-drum tracks
              finalKey = transportKey
              // Calculate pitch shift needed to match transport key
              if (selectedAudio.key && transportKey) {
                const chromaticScale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
                const originalIndex = chromaticScale.indexOf(selectedAudio.key)
                const targetIndex = chromaticScale.indexOf(transportKey)
                
                if (originalIndex !== -1 && targetIndex !== -1) {
                  pitchShift = targetIndex - originalIndex
                  // Handle octave wrapping
                  if (pitchShift > 6) pitchShift -= 12
                  if (pitchShift < -6) pitchShift += 12
                }
              }
            } else if (isKeyLocked && isDrumTrack) {
              // For drum tracks, keep original key even when key is locked
              finalKey = selectedAudio.key || 'C'
              pitchShift = 0
            }
          } else if (track.name === 'Melody Loop') {
            // Transport not locked - special handling for Melody Loop tracks
            if (melodyLoopMode === 'transport-dominates') {
              // DISABLED: Automatic BPM adaptation to prevent halftime-like behavior
              // Mode B: Transport dominates - Melody Loop adapts to transport
              // finalBpm = bpm
              // Instead, always use original BPM to prevent automatic halftime
              finalBpm = selectedAudio.bpm || 120
              finalKey = transportKey
              
              // DISABLED: Automatic playback rate calculation to prevent halftime-like behavior
              // Calculate playback rate to match transport tempo
              if (selectedAudio.bpm && selectedAudio.bpm > 0) {
                // DISABLED: playbackRate = bpm / selectedAudio.bpm
                // Instead, keep original playback rate to prevent automatic halftime
                playbackRate = 1.0
                console.log(`[DISABLED] Automatic BPM adaptation prevented for Melody Loop`)
              }
              
              // Calculate pitch shift needed to match transport key
              if (selectedAudio.key && transportKey) {
                const chromaticScale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
                const originalIndex = chromaticScale.indexOf(selectedAudio.key)
                const targetIndex = chromaticScale.indexOf(transportKey)
                
                if (originalIndex !== -1 && targetIndex !== -1) {
                  pitchShift = targetIndex - originalIndex
                  // Handle octave wrapping
                  if (pitchShift > 6) pitchShift -= 12
                  if (pitchShift < -6) pitchShift += 12
                }
              }
            } else {
              // Mode A: Melody Loop dominates - Transport adapts to melody loop's ORIGINAL BPM
              finalBpm = selectedAudio.bpm || 120
              finalKey = selectedAudio.key || 'C'
              playbackRate = 1.0
              pitchShift = 0
              
              // Update transport to match melody loop's ORIGINAL BPM from the database
              const originalBpm = selectedAudio.bpm || 120
              setBpm(originalBpm)
              setTransportKey(selectedAudio.key || 'C')
              
              // Update the track's currentBpm to match the originalBpm
              setTracks(prev => prev.map(t => 
                t.name === 'Melody Loop' ? {
                  ...t,
                  currentBpm: originalBpm,
                  playbackRate: 1.0
                } : t
              ))
            }
          } else if (track.name.includes(' Loop')) {
            // Transport not locked - handle other loop tracks (Drum Loop, Hihat Loop, Percussion Loop, 808 Loop, etc.)
            if (melodyLoopMode === 'transport-dominates') {
              // DISABLED: Automatic BPM adaptation to prevent halftime-like behavior
              // T-M mode: Loop tracks adapt to transport tempo and key
              // finalBpm = bpm
              // Instead, always use original BPM to prevent automatic halftime
              finalBpm = selectedAudio.bpm || 120
              finalKey = transportKey
              
              // DISABLED: Automatic playback rate calculation to prevent halftime-like behavior
              // Calculate playback rate to match transport tempo
              if (selectedAudio.bpm && selectedAudio.bpm > 0) {
                // DISABLED: playbackRate = bpm / selectedAudio.bpm
                // Instead, keep original playback rate to prevent automatic halftime
                playbackRate = 1.0
                console.log(`[DISABLED] Automatic BPM adaptation prevented for loop track`)
              }
              
              // Calculate pitch shift needed to match transport key
              if (selectedAudio.key && transportKey) {
                const chromaticScale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
                const originalIndex = chromaticScale.indexOf(selectedAudio.key)
                const targetIndex = chromaticScale.indexOf(transportKey)
                
                if (originalIndex !== -1 && targetIndex !== -1) {
                  pitchShift = targetIndex - originalIndex
                  // Handle octave wrapping
                  if (pitchShift > 6) pitchShift -= 12
                  if (pitchShift < -6) pitchShift += 12
                }
              }
            } else {
              // M-T mode: Loop tracks use their original BPM and key, transport adapts to them
              finalBpm = selectedAudio.bpm || 120
              finalKey = selectedAudio.key || 'C'
              playbackRate = 1.0
              pitchShift = 0
            }
          } else {
            // Transport not locked and not a loop track - use original audio BPM and key
            finalBpm = selectedAudio.bpm || 120
            finalKey = selectedAudio.key || 'C'
            playbackRate = 1.0
            pitchShift = 0
          }
          
          // Return the updated track data instead of immediately updating state
          return {
            track,
            success: true,
            updatedTrack: {
              ...track,
              audioUrl: publicUrl,
              audioName: selectedAudio.name,
              audioFileId: selectedAudio.id,
              // Use calculated tempo and key values
              originalBpm: selectedAudio.bpm || 120,
              currentBpm: finalBpm,
              playbackRate: playbackRate,
              // Use calculated key values
              originalKey: selectedAudio.key || 'C',
              currentKey: finalKey,
              pitchShift: pitchShift,
              // Store metadata
              bpm: selectedAudio.bpm,
              key: selectedAudio.key,
              audio_type: selectedAudio.audio_type,
              tags: selectedAudio.tags,
              // Store relative key indicator
              isRelativeKey: isRelativeKey
            }
          }

        } catch (error) {
          console.error(`Error shuffling audio for track ${track.name}:`, error)
          return { track, success: false }
        }
      })

      // Wait for all audio shuffles to complete
      const audioResults = await Promise.all(audioShufflePromises)
      
      // Update all tracks at once
      setTracks(prev => {
        const newTracks = [...prev]
        audioResults.forEach(({ track, success, updatedTrack }) => {
          if (success && updatedTrack) {
            const trackIndex = newTracks.findIndex(t => t.id === track.id)
            if (trackIndex !== -1) {
              newTracks[trackIndex] = updatedTrack
              console.log(`[SHUFFLE TRACKER] Updated track ${track.name} with ${updatedTrack.audioName}`)
            }
          }
        })
        return newTracks
      })

      // Shuffle patterns for all tracks (except locked ones)
      const patternShufflePromises = tracks
        .filter(track => !track.locked) // Skip locked tracks
        .map(async track => {
          // Use display name logic to detect loop tracks (those with the repeat/loop icon)
          const displayName = getTrackDisplayName(track.name);
          const isLoopTrack = displayName.includes('🔄');
          
          
          if (isLoopTrack) {
            console.log(`[SHUFFLE ALL] Loop track (icon detected) ${track.name}: Setting first step only`);
            const newPattern = new Array(steps).fill(false);
            newPattern[0] = true; // Only first step active
            return { trackId: track.id, pattern: newPattern };
          }
          
          // For other tracks, try database patterns first with genre/subgenre filtering
          const patternType = track.name.toLowerCase()
          
          // Build query for patterns from database filtered by pattern type and genre/subgenre
          let query = supabase
            .from('saved_patterns')
            .select('*')
            .eq('user_id', user.id)
            .eq('pattern_type', patternType)
          
          // Add genre filter if selected and not locked
          if (selectedGenreId && selectedGenreId !== 'none' && !isGenreLocked) {
            query = query.eq('genre_id', selectedGenreId)
          }
          
          // Add subgenre filter if selected and not locked
          if (selectedSubgenre && selectedSubgenre !== 'none' && !isSubgenreLocked) {
            query = query.eq('subgenre', selectedSubgenre)
          }
          
          const { data: patterns, error } = await query.order('created_at', { ascending: false })

          let selectedPattern: boolean[]
          
          if (error || !patterns || patterns.length === 0) {
            // Fallback to built-in patterns
            console.log(`No saved patterns found for ${patternType}, using built-in patterns`)
            const patternLibrary = getPatternLibraryForTrackType(track.name)
            const shuffledPatterns = shuffleArray(patternLibrary)
            selectedPattern = shuffledPatterns[0]
          } else {
            // Use database pattern
            const shuffledPatterns = shuffleArray(patterns)
            const randomPattern = shuffledPatterns[0]
            const sequencerData = randomPattern.sequencer_data || randomPattern.sequencerData
            
            if (!sequencerData) {
              // Fallback to built-in patterns
              const patternLibrary = getPatternLibraryForTrackType(track.name)
              const shuffledPatterns = shuffleArray(patternLibrary)
              selectedPattern = shuffledPatterns[0]
            } else {
              // Extract the pattern for this specific track
              const trackPattern = sequencerData[track.id]
              
              if (!trackPattern) {
                // Fallback to built-in patterns
                const patternLibrary = getPatternLibraryForTrackType(track.name)
                const shuffledPatterns = shuffleArray(patternLibrary)
                selectedPattern = shuffledPatterns[0]
              } else {
                // Use database pattern
                selectedPattern = trackPattern
              }
            }
          }
          
          // Extend or truncate the pattern to match current step count
          let newPattern: boolean[]
          if (steps === 16) {
            newPattern = selectedPattern
          } else if (steps === 8) {
            newPattern = selectedPattern.slice(0, 8)
          } else if (steps === 32) {
            // Repeat the 16-step pattern twice for 32 steps
            newPattern = [...selectedPattern, ...selectedPattern]
          } else if (steps === 64) {
            // Repeat the 16-step pattern four times for 64 steps
            newPattern = [...selectedPattern, ...selectedPattern, ...selectedPattern, ...selectedPattern]
          } else {
            // For any other step count, use the first N steps
            newPattern = selectedPattern.slice(0, steps)
          }
          
          return { trackId: track.id, pattern: newPattern }
        })

      // Wait for all pattern shuffles to complete
      const patternResults = await Promise.all(patternShufflePromises)
      
      // Update all patterns at once
      setSequencerDataFromSession(prev => {
        const newSequencerData = { ...prev }
        patternResults.forEach(({ trackId, pattern }) => {
          newSequencerData[trackId] = pattern
        })
        return newSequencerData
      })
      
      // Add to undo/redo history
      undoRedo.addToHistory(captureCurrentState(), 'Shuffle all audio and patterns')

      // Update BPM based on loop tracks when in T-M mode (Transport-Melody)
      // In T-M mode, transport should adapt to loop tracks' BPM
      
      if (!isBpmLocked) {
        if (melodyLoopMode === 'transport-dominates') {
          // T-M mode: Transport should adapt to loop tracks' BPM
          // Find loop tracks and use their BPM to set transport
          const loopTracks = tracks.filter(track => 
            track.name === 'Melody Loop' || 
            track.name === 'Drum Loop' || 
            track.name === 'Hihat Loop' || 
            track.name === 'Percussion Loop' || 
            track.name === '808 Loop'
          )
          
          if (loopTracks.length > 0) {
            // Use the first loop track's ORIGINAL BPM (not currentBpm which might be adapted)
            const loopTrackBpm = loopTracks[0].originalBpm || 120
            setBpm(loopTrackBpm)
            console.log(`[SHUFFLE] Updated transport BPM to ${loopTrackBpm} based on loop track original BPM (T-M mode)`)
            
            // Now update all loop tracks to match the transport BPM
            setTracks(prev => prev.map(track => {
              if (track.name === 'Melody Loop' || track.name.includes(' Loop')) {
                const originalBpm = track.originalBpm || 120
                const playbackRate = loopTrackBpm / originalBpm
                return {
                  ...track,
                  currentBpm: loopTrackBpm,
                  playbackRate: playbackRate
                }
              }
              return track
            }))
          } else {
            // Fallback to genre-based BPM if no loop tracks found
            setBpm(newBpm)
            console.log(`[SHUFFLE] No loop tracks found, updated BPM to ${newBpm} based on genre tempo range (T-M mode)`)
          }
        } else {
          // M-T mode: Melody Loop controls transport BPM (already handled in individual track shuffling)
          console.log(`[SHUFFLE] M-T mode active, Melody Loop controls transport BPM`)
        }
      } else {
        // Restore BPM if locked
        if (originalBpm !== null) setBpm(originalBpm)
        console.log('BPM locked - restored BPM setting')
      }
      
      // Update Key based on loop tracks when Strata mode is on
      if (!isKeyLocked) {
        if (melodyLoopMode === 'transport-dominates') {
          // T-M mode: Transport should adapt to loop tracks' key
          // Find loop tracks and use their key to set transport
          const loopTracks = tracks.filter(track => 
            track.name === 'Melody Loop' || 
            track.name === 'Drum Loop' || 
            track.name === 'Hihat Loop' || 
            track.name === 'Percussion Loop' || 
            track.name === '808 Loop'
          )
          
          if (loopTracks.length > 0) {
            // Use the first loop track's ORIGINAL key (not currentKey which might be adapted)
            const loopTrackKey = loopTracks[0].originalKey || 'C'
            setTransportKey(loopTrackKey)
            console.log(`[SHUFFLE] Updated transport key to ${loopTrackKey} based on loop track original key (T-M mode)`)
          } else {
            // Fallback to a random key if no loop tracks found
            const randomKeys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
            const randomKey = randomKeys[Math.floor(Math.random() * randomKeys.length)]
            setTransportKey(randomKey)
            console.log(`[SHUFFLE] No loop tracks found, updated key to ${randomKey} (T-M mode)`)
          }
        } else {
          // M-T mode: Melody Loop controls transport key (already handled in individual track shuffling)
          console.log(`[SHUFFLE] M-T mode active, Melody Loop controls transport key`)
        }
      } else {
        // Restore Key if locked
        if (originalKey !== null) {
          setTransportKey(originalKey)
          console.log('Key locked - restored Key setting')
        }
      }

      // Restore genre/subgenre settings if locked
      if (isGenreLocked && originalGenre) {
        setSelectedGenre(originalGenre)
        console.log('Genre locked - restored genre settings')
      }
      if (isSubgenreLocked && originalSubgenre) {
        setSelectedSubgenre(originalSubgenre)
        console.log('Subgenre locked - restored subgenre settings')
      }

      console.log('Shuffled all audio samples and patterns using tracking system')
      
      // CRITICAL DEBUG: Log final state after shuffle all
        name: t.name, 
        currentBpm: t.currentBpm, 
        originalBpm: t.originalBpm, 
        playbackRate: t.playbackRate,
        pitchShift: t.pitchShift,
        audioName: t.audioName
      })))
      
      markSessionChanged()
    } catch (error) {
      console.error('Error shuffling all tracks:', error)
      alert('Failed to shuffle all tracks')
    }
  }

  // Type-specific pattern libraries
  const getPatternLibraryForTrackType = (trackType: string) => {
    const patterns: { [key: string]: boolean[][] } = {
      // Kick patterns - typically on beats 1 and 3
      'Kick': [
        [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false], // Basic 4/4
        [true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false], // Half time
        [true, false, false, true, false, false, false, false, true, false, false, true, false, false, false, false], // Double kick
        [true, false, false, false, true, false, true, false, true, false, false, false, true, false, true, false], // Kick + offbeat
        [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false], // Every other beat
        [true, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Single hit
        [true, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false], // 3-beat pattern
      ],
      
      // Snare patterns - typically on beats 2 and 4
      'Snare': [
        [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false], // Basic 2 and 4
        [false, false, false, false, true, false, false, false, false, false, false, false, false, false, false, false], // Single snare
        [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false], // Offbeat pattern
        [false, false, false, false, true, false, true, false, false, false, false, false, true, false, true, false], // 2 and 4 + offbeat
        [false, false, true, false, true, false, true, false, false, false, true, false, true, false, true, false], // Offbeat heavy
        [false, false, false, false, true, false, false, false, false, false, false, false, true, false, true, false], // 2 and 4 + last offbeat
      ],
      
      // Bass patterns - typically following kick but with more variation
      'Bass': [
        [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false], // Follow kick
        [true, false, false, true, false, false, false, false, true, false, false, true, false, false, false, false], // Bass line feel
        [true, false, true, false, false, false, true, false, true, false, true, false, false, false, true, false], // Melodic bass
        [true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false], // Half time
        [true, false, true, false, true, false, true, false, false, false, false, false, false, false, false, false], // Build up
        [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false], // Sync with snare
      ],
      
      // Melody patterns - more varied and melodic
      'Melody': [
        [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false], // Basic melody
        [true, false, true, false, false, false, true, false, true, false, true, false, false, false, true, false], // Melodic phrase
        [true, false, false, true, true, false, false, false, true, false, false, true, true, false, false, false], // Call and response
        [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false], // Offbeat melody
        [true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false], // Sparse melody
        [true, true, false, false, true, true, false, false, true, true, false, false, true, true, false, false], // Rhythmic melody
      ],
      
      // Clap patterns - similar to snare but with variation
      'Clap': [
        [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false], // Basic 2 and 4
        [false, false, false, false, true, false, true, false, false, false, false, false, true, false, true, false], // 2 and 4 + offbeat
        [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false], // Offbeat pattern
        [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false], // Every beat
        [false, false, false, false, true, false, false, false, false, false, false, false, false, false, false, false], // Single clap
      ],
      
      // 808 patterns - typically following bass/kick patterns
      '808': [
        [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false], // Follow kick
        [true, false, false, true, false, false, false, false, true, false, false, true, false, false, false, false], // Bass line
        [true, false, true, false, false, false, true, false, true, false, true, false, false, false, true, false], // Melodic 808
        [true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false], // Half time
        [true, false, true, false, true, false, true, false, false, false, false, false, false, false, false, false], // Build up
      ],
      
      // Percussion patterns - varied rhythmic patterns
      'Percussion': [
        [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false], // Every other beat
        [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false], // Offbeat pattern
        [true, false, false, true, true, false, false, true, true, false, false, true, true, false, false, true], // Rhythmic pattern
        [true, false, true, false, false, false, true, false, true, false, true, false, false, false, true, false], // Syncopated
        [true, true, false, false, true, true, false, false, true, true, false, false, true, true, false, false], // Double hits
        [false, false, true, false, true, false, true, false, false, false, true, false, true, false, true, false], // Offbeat heavy
      ],
    }

    // Return patterns for the specific track type, or default patterns if not found
    return patterns[trackType] || patterns['Kick'] // Default to kick patterns if type not found
  }

  // Shuffle individual track pattern with type-specific patterns from database
  const handleShuffleTrackPattern = async (trackId: number) => {
    const track = tracks.find(t => t.id === trackId)
    if (!track) return

    // Skip if track is locked
    if (track.locked) {
      alert(`${track.name} is locked and cannot be shuffled`)
      return
    }

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to shuffle patterns')
        return
      }



      const patternType = getPatternTypeForTrack(track.name)
      console.log(`[SHUFFLE PATTERN] Track: ${track.name}, Looking for pattern type: ${patternType}`)

      // Build query for patterns from database filtered by pattern type and genre/subgenre
      let query = supabase
        .from('saved_patterns')
        .select('*')
        .eq('user_id', user.id)
        .eq('pattern_type', patternType)
      
      console.log(`[SHUFFLE PATTERN] Query: user_id=${user.id}, pattern_type=${patternType}`)
      
      // Add genre filter if selected and not locked
      if (selectedGenreId && selectedGenreId !== 'none' && !isGenreLocked) {
        query = query.eq('genre_id', selectedGenreId)
      }
      
      // Add subgenre filter if selected and not locked
      if (selectedSubgenre && selectedSubgenre !== 'none' && !isSubgenreLocked) {
        query = query.eq('subgenre', selectedSubgenre)
      }
      
      const { data: patterns, error } = await query.order('created_at', { ascending: false })

      console.log(`[SHUFFLE PATTERN] Query result: ${patterns?.length || 0} patterns found`)
      if (patterns && patterns.length > 0) {
        console.log(`[SHUFFLE PATTERN] Found patterns:`, patterns.map(p => ({ 
          id: p.id, 
          name: p.name, 
          pattern_type: p.pattern_type,
          has_sequencer_data: !!p.sequencer_data,
          has_sequencerData: !!p.sequencerData,
          track_ids: p.sequencer_data ? Object.keys(p.sequencer_data) : p.sequencerData ? Object.keys(p.sequencerData) : []
        })))
      }

      if (error) {
        console.error('Error fetching patterns:', error)
        // Fallback to built-in patterns
        console.log('Falling back to built-in patterns')
        const patternLibrary = getPatternLibraryForTrackType(track.name)
        const shuffledPatterns = shuffleArray(patternLibrary)
        const randomPattern = shuffledPatterns[0]
        
        let newPattern: boolean[]
        if (steps === 16) {
          newPattern = randomPattern
        } else if (steps === 8) {
          newPattern = randomPattern.slice(0, 8)
        } else if (steps === 32) {
          newPattern = [...randomPattern, ...randomPattern]
        } else if (steps === 64) {
          newPattern = [...randomPattern, ...randomPattern, ...randomPattern, ...randomPattern]
        } else {
          newPattern = randomPattern.slice(0, steps)
        }
        
        setSequencerDataFromSession(prev => ({
          ...prev,
          [trackId]: newPattern
        }))
        return
      }

      if (!patterns || patterns.length === 0) {
        console.log(`No saved patterns found for ${patternType}, using built-in patterns`)
        // Fallback to built-in patterns
        const patternLibrary = getPatternLibraryForTrackType(track.name)
        const shuffledPatterns = shuffleArray(patternLibrary)
        const randomPattern = shuffledPatterns[0]
        
        let newPattern: boolean[]
        if (steps === 16) {
          newPattern = randomPattern
        } else if (steps === 8) {
          newPattern = randomPattern.slice(0, 8)
        } else if (steps === 32) {
          newPattern = [...randomPattern, ...randomPattern]
        } else if (steps === 64) {
          newPattern = [...randomPattern, ...randomPattern, ...randomPattern, ...randomPattern]
        } else {
          newPattern = randomPattern.slice(0, steps)
        }
        
        setSequencerDataFromSession(prev => ({
          ...prev,
          [trackId]: newPattern
        }))
        return
      }

      // Select a random pattern from the database
      const shuffledPatterns = shuffleArray(patterns)
      const randomPattern = shuffledPatterns[0]
      console.log(`[SHUFFLE PATTERN] Selected pattern:`, { 
        id: randomPattern.id, 
        name: randomPattern.name, 
        pattern_type: randomPattern.pattern_type 
      })
      
      const sequencerData = randomPattern.sequencer_data || randomPattern.sequencerData
      console.log(`[SHUFFLE PATTERN] Sequencer data keys:`, sequencerData ? Object.keys(sequencerData) : 'none')
      console.log(`[SHUFFLE PATTERN] Looking for track ID: ${trackId} or ${track.id}`)
      
      if (!sequencerData) {
        console.warn('Selected pattern has no sequencer data')
        return
      }

      // Extract the pattern for this specific track
      let trackPattern = sequencerData[trackId] || sequencerData[track.id]
      console.log(`[SHUFFLE PATTERN] Track pattern found:`, !!trackPattern, trackPattern ? trackPattern.length : 'N/A')
      
      if (!trackPattern) {
        console.warn('Selected pattern has no data for this track')
        console.log(`[SHUFFLE PATTERN] Available track IDs in pattern:`, Object.keys(sequencerData))
        
        // Try to find any pattern data in the sequencer data (fallback to first available)
        const availableTrackIds = Object.keys(sequencerData)
        if (availableTrackIds.length > 0) {
          const fallbackTrackId = availableTrackIds[0]
          trackPattern = sequencerData[fallbackTrackId]
          console.log(`[SHUFFLE PATTERN] Using fallback pattern from track ID: ${fallbackTrackId}`)
        } else {
          console.warn('No pattern data found in sequencer data')
          return
        }
      }

      // Extend or truncate the pattern to match current step count
      let newPattern: boolean[]
      if (steps === 16) {
        newPattern = trackPattern
      } else if (steps === 8) {
        newPattern = trackPattern.slice(0, 8)
      } else if (steps === 32) {
        // Repeat the pattern to fill 32 steps
        newPattern = [...trackPattern, ...trackPattern]
      } else if (steps === 64) {
        // Repeat the pattern to fill 64 steps
        newPattern = [...trackPattern, ...trackPattern, ...trackPattern, ...trackPattern]
      } else {
        // For any other step count, use the first N steps
        newPattern = trackPattern.slice(0, steps)
      }
      
      // Update the sequencer data for this track only
      setSequencerDataFromSession(prev => ({
        ...prev,
        [trackId]: newPattern
      }))

      console.log(`Shuffled ${track.name} pattern with database pattern: ${randomPattern.name}`)
    } catch (error) {
      console.error('Error shuffling track pattern:', error)
      // Fallback to built-in patterns
      const patternLibrary = getPatternLibraryForTrackType(track.name)
      const shuffledPatterns = shuffleArray(patternLibrary)
      const randomPattern = shuffledPatterns[0]
      
      let newPattern: boolean[]
      if (steps === 16) {
        newPattern = randomPattern
      } else if (steps === 8) {
        newPattern = randomPattern.slice(0, 8)
      } else if (steps === 32) {
        newPattern = [...randomPattern, ...randomPattern]
      } else if (steps === 64) {
        newPattern = [...randomPattern, ...randomPattern, ...randomPattern, ...randomPattern]
      } else {
        newPattern = randomPattern.slice(0, steps)
      }
      
      setSequencerDataFromSession(prev => ({
        ...prev,
        [trackId]: newPattern
      }))
    }
  }

  // Shuffle all audio samples for tracks that support it
  const handleShuffleAllAudio = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to shuffle audio files')
        return
      }

      // Shuffle audio samples for each track that has shuffle capability
      // BUT skip tracks that are locked
      const audioShufflePromises = tracks
        .filter(track => [
          // Drums
          'Kick', 'Snare', 'Hi-Hat', 'Clap', 'Crash', 'Ride', 'Tom', 'Cymbal', 'Percussion',
          // Bass
          'Bass', 'Sub', '808',
          // Melodic
          'Melody', 'Lead', 'Pad', 'Chord', 'Arp',
          // Loops
          'Melody Loop', 'Piano Loop', '808 Loop', 'Drum Loop', 'Bass Loop', 'Vocal Loop', 'Guitar Loop', 'Synth Loop',
          // Effects & Technical
          'FX', 'Vocal', 'Sample', 'MIDI', 'Patch', 'Preset'
        ].includes(track.name) && !track.locked) // Skip locked tracks
        .map(track => handleShuffleAudio(track.id))

      // Execute audio shuffles
      await Promise.all(audioShufflePromises)

      console.log('Shuffled all audio samples')
    } catch (error) {
      console.error('Error shuffling all audio samples:', error)
      alert('Failed to shuffle all audio samples')
    }
  }

  // Shuffle all sequencer patterns for tracks that support it
  const handleShuffleAllPatterns = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to shuffle patterns')
        return
      }

      // Shuffle patterns for all tracks (except locked ones)
      const patternShufflePromises = tracks
        .filter(track => !track.locked) // Skip locked tracks
        .map(async track => {
          // Use display name logic to detect loop tracks (those with the repeat/loop icon)
          const displayName = getTrackDisplayName(track.name);
          const isLoopTrack = displayName.includes('🔄');
          
          if (isLoopTrack) {
            console.log(`[SHUFFLE ALL] Loop track (icon detected) ${track.name}: Setting first step only`);
            const newPattern = new Array(steps).fill(false);
            newPattern[0] = true; // Only first step active
            return { trackId: track.id, pattern: newPattern };
          }
          
          const patternType = track.name.toLowerCase()
          
          // Build query for patterns from database filtered by pattern type and genre/subgenre
          let query = supabase
            .from('saved_patterns')
            .select('*')
            .eq('user_id', user.id)
            .eq('pattern_type', patternType)
          
          // Add genre filter if selected and not locked
          if (selectedGenreId && selectedGenreId !== 'none' && !isGenreLocked) {
            query = query.eq('genre_id', selectedGenreId)
          }
          
          // Add subgenre filter if selected and not locked
          if (selectedSubgenre && selectedSubgenre !== 'none' && !isSubgenreLocked) {
            query = query.eq('subgenre', selectedSubgenre)
          }
          
          const { data: patterns, error } = await query.order('created_at', { ascending: false })

          let newPattern: boolean[]
          
          if (error || !patterns || patterns.length === 0) {
            // Fallback to built-in patterns
            console.log(`No saved patterns found for ${patternType}, using built-in patterns`)
            const patternLibrary = getPatternLibraryForTrackType(track.name)
            const shuffledPatterns = shuffleArray(patternLibrary)
            const randomPattern = shuffledPatterns[0]
            
            if (steps === 16) {
              newPattern = randomPattern
            } else if (steps === 8) {
              newPattern = randomPattern.slice(0, 8)
            } else if (steps === 32) {
              newPattern = [...randomPattern, ...randomPattern]
            } else if (steps === 64) {
              newPattern = [...randomPattern, ...randomPattern, ...randomPattern, ...randomPattern]
            } else {
              newPattern = randomPattern.slice(0, steps)
            }
          } else {
            // Use database pattern
            const shuffledPatterns = shuffleArray(patterns)
            const randomPattern = shuffledPatterns[0]
            const sequencerData = randomPattern.sequencer_data || randomPattern.sequencerData
            
            if (!sequencerData) {
              // Fallback to built-in patterns
              const patternLibrary = getPatternLibraryForTrackType(track.name)
              const shuffledPatterns = shuffleArray(patternLibrary)
              const fallbackPattern = shuffledPatterns[0]
              
              if (steps === 16) {
                newPattern = fallbackPattern
              } else if (steps === 8) {
                newPattern = fallbackPattern.slice(0, 8)
              } else if (steps === 32) {
                newPattern = [...fallbackPattern, ...fallbackPattern]
              } else if (steps === 64) {
                newPattern = [...fallbackPattern, ...fallbackPattern, ...fallbackPattern, ...fallbackPattern]
              } else {
                newPattern = fallbackPattern.slice(0, steps)
              }
            } else {
              // Extract the pattern for this specific track
              const trackPattern = sequencerData[track.id]
              
              if (!trackPattern) {
                // Fallback to built-in patterns
                const patternLibrary = getPatternLibraryForTrackType(track.name)
                const shuffledPatterns = shuffleArray(patternLibrary)
                const fallbackPattern = shuffledPatterns[0]
                
                if (steps === 16) {
                  newPattern = fallbackPattern
                } else if (steps === 8) {
                  newPattern = fallbackPattern.slice(0, 8)
                } else if (steps === 32) {
                  newPattern = [...fallbackPattern, ...fallbackPattern]
                } else if (steps === 64) {
                  newPattern = [...fallbackPattern, ...fallbackPattern, ...fallbackPattern, ...fallbackPattern]
                } else {
                  newPattern = fallbackPattern.slice(0, steps)
                }
              } else {
                // Use database pattern
                if (steps === 16) {
                  newPattern = trackPattern
                } else if (steps === 8) {
                  newPattern = trackPattern.slice(0, 8)
                } else if (steps === 32) {
                  newPattern = [...trackPattern, ...trackPattern]
                } else if (steps === 64) {
                  newPattern = [...trackPattern, ...trackPattern, ...trackPattern, ...trackPattern]
                } else {
                  newPattern = trackPattern.slice(0, steps)
                }
              }
            }
          }
          
          return { trackId: track.id, pattern: newPattern }
        })

      // Wait for all pattern shuffles to complete
      const results = await Promise.all(patternShufflePromises)

      // Update all patterns at once
      setSequencerDataFromSession(prev => {
        const newSequencerData = { ...prev }
        results.forEach(({ trackId, pattern }) => {
          newSequencerData[trackId] = pattern
        })
        return newSequencerData
      })

      console.log('Shuffled all sequencer patterns')
    } catch (error) {
      console.error('Error shuffling all patterns:', error)
      alert('Failed to shuffle all patterns')
    }
  }

  const handleSavePattern = async (name: string, description?: string, category?: string, tags?: string[], genreId?: string, subgenre?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to save patterns')
        return
      }

      // Determine pattern type based on the tracks that have data
      const tracksWithData = Object.keys(sequencerData).map(trackId => {
        const track = tracks.find(t => t.id === parseInt(trackId))
        return track?.name || 'unknown'
      })
      
      // Use the first track name as pattern type, or 'mixed' if multiple tracks
      const patternType = tracksWithData.length === 1 ? tracksWithData[0].toLowerCase() : 'mixed'

      // Only save the sequencer pattern data, not the entire tracks configuration
      const { data, error } = await supabase
        .from('saved_patterns')
        .insert([{
          user_id: user.id,
          name,
          description,
          tracks: [], // Save empty array instead of null to satisfy NOT NULL constraint
          sequencer_data: sequencerData, // Only save the pattern
          bpm,
          steps,
          tags,
          category,
          genre_id: genreId || null,
          subgenre: subgenre || null,
          pattern_type: patternType
        }])
        .select()
        .single()

      if (error) {
        console.error('Error saving pattern:', error)
        alert('Failed to save pattern')
        return
      }

      toast({
        title: "Success",
        description: `Pattern "${name}" saved successfully!`
      })
    } catch (error) {
      console.error('Error saving pattern:', error)
      alert('Failed to save pattern')
    }
  }

  const handleSaveAllPatterns = async () => {
    const baseName = prompt('Enter a base name for all patterns (e.g., "My Beat" will create "My Beat Pattern 1", "My Beat Pattern 2", etc.):')
    if (!baseName || !baseName.trim()) {
      return // User cancelled or entered empty name
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to save patterns')
        return
      }

      // Save each track as a separate pattern
      const savePromises = tracks.map(async (track, index) => {
        const patternName = `${baseName.trim()} Pattern ${index + 1}`
        
        return supabase
          .from('saved_patterns')
          .insert({
            user_id: user.id,
            name: patternName,
            description: `Auto-saved ${track.name} pattern`,
            tracks: [], // Save empty array instead of null to satisfy NOT NULL constraint
            sequencer_data: { [track.id]: sequencerData[track.id] || [] }, // Only save the pattern
            bpm,
            steps,
            category: 'Auto-saved',
            tags: [track.name.toLowerCase()],
            pattern_type: getPatternTypeForTrack(track.name)
          })
      })

      await Promise.all(savePromises)
      alert('All patterns saved successfully!')
    } catch (error) {
      console.error('Error saving all patterns:', error)
      alert('Failed to save patterns')
    }
  }

  const handleSaveTrackPattern = async (trackId: number, name: string, description?: string, category?: string, tags?: string[], genreId?: string, subgenre?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to save patterns')
        return
      }

      const track = tracks.find(t => t.id === trackId)
      if (!track) {
        alert('Track not found')
        return
      }

      const { data, error } = await supabase
        .from('saved_patterns')
        .insert([{
          user_id: user.id,
          name,
          description,
          tracks: [], // Save empty array instead of null to satisfy NOT NULL constraint
          sequencer_data: { [trackId]: sequencerData[trackId] || [] }, // Save only this track's pattern
          bpm,
          steps,
          tags,
          category,
          genre_id: genreId || null,
          subgenre: subgenre || null,
          pattern_type: getPatternTypeForTrack(track.name)
        }])
        .select()
        .single()

      if (error) {
        console.error('Error saving track pattern:', error)
        alert('Failed to save track pattern')
        return
      }

      toast({
        title: "Success",
        description: `"${name}" saved successfully!`
      })
    } catch (error) {
      console.error('Error saving track pattern:', error)
      alert('Failed to save track pattern')
    }
  }

  // Session management state
  const [savedSessions, setSavedSessions] = useState<any[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [currentSessionName, setCurrentSessionName] = useState<string>('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false)
  const [showSessionDialog, setShowSessionDialog] = useState(false)
  const [sessionName, setSessionName] = useState('')
  const [sessionDescription, setSessionDescription] = useState('')
  const [sessionCategory, setSessionCategory] = useState('')
  const [sessionTags, setSessionTags] = useState('')
  const [sessionStatus, setSessionStatus] = useState('draft')
  const [sessionStatusFilter, setSessionStatusFilter] = useState('all')
  const [sessionLinks, setSessionLinks] = useState<{[sessionId: string]: {albums: any[], singles: any[], tracks: any[]}}>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  // Session edit state
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingSessionName, setEditingSessionName] = useState('')
  const [savingSessionName, setSavingSessionName] = useState(false)

  // Genre management state
  const [genres, setGenres] = useState<any[]>([])
  const [subgenres, setSubgenres] = useState<string[]>([])
  const [selectedGenreId, setSelectedGenreId] = useState<string>('none')
  const [selectedSubgenre, setSelectedSubgenre] = useState<string>('none')
  const [selectedGenre, setSelectedGenre] = useState<any>(null)
  const [isGenreLocked, setIsGenreLocked] = useState<boolean>(false)
  const [isSubgenreLocked, setIsSubgenreLocked] = useState<boolean>(false)
  const [audioPacks, setAudioPacks] = useState<any[]>([])
  const [selectedPacks, setSelectedPacks] = useState<any[]>([])
  const [isPackLocked, setIsPackLocked] = useState<boolean>(false)
  const [availableSubgenres, setAvailableSubgenres] = useState<string[]>([])
  const [genreSubgenres, setGenreSubgenres] = useState<{[key: string]: string[]}>({})
  const [genreSubgenresData, setGenreSubgenresData] = useState<any[]>([])
  const [genreTemplates, setGenreTemplates] = useState<any[]>([])
  const [showGenreDialog, setShowGenreDialog] = useState(false)
  const [showGenreTemplateDialog, setShowGenreTemplateDialog] = useState(false)
  const [showPackDialog, setShowPackDialog] = useState(false)
  const [selectedGenreTemplate, setSelectedGenreTemplate] = useState<any>(null)
  
  // New genre creation state
  const [showCreateGenreDialog, setShowCreateGenreDialog] = useState(false)
  const [newGenreName, setNewGenreName] = useState('')
  const [newGenreDescription, setNewGenreDescription] = useState('')
  const [newGenreBpm, setNewGenreBpm] = useState(120)
  const [newGenreMinBpm, setNewGenreMinBpm] = useState(80)
  const [newGenreMaxBpm, setNewGenreMaxBpm] = useState(180)
  const [newGenreKey, setNewGenreKey] = useState('C')
  const [newGenreSteps, setNewGenreSteps] = useState(16)
  const [newGenreColor, setNewGenreColor] = useState('#F4C430')
  const [newGenreSubgenres, setNewGenreSubgenres] = useState<string[]>([])
  const [newSubgenreInput, setNewSubgenreInput] = useState('')
  const [isCreatingGenre, setIsCreatingGenre] = useState(false)
  
  // Genre editing state
  const [editingGenre, setEditingGenre] = useState<any>(null)
  const [editingSubgenre, setEditingSubgenre] = useState<any>(null)
  const [showEditGenreDialog, setShowEditGenreDialog] = useState(false)
  const [showEditSubgenreDialog, setShowEditSubgenreDialog] = useState(false)
  const [showSubgenreManagerDialog, setShowSubgenreManagerDialog] = useState(false)
  const [selectedGenreForSubgenreManager, setSelectedGenreForSubgenreManager] = useState<any>(null)
  
  // Subgenre editing state
  const [editingSubgenres, setEditingSubgenres] = useState<{[genreId: string]: boolean}>({})
  const [subgenreInputs, setSubgenreInputs] = useState<{[genreId: string]: string}>({})
  const [isSavingSubgenres, setIsSavingSubgenres] = useState(false)
  
  // Quantization modal state
  const [showQuantizeModal, setShowQuantizeModal] = useState(false)
  const [quantizeTrack, setQuantizeTrack] = useState<any>(null)

  // Add keyboard shortcut handling (moved here to access showQuantizeModal)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if user is typing in an input field
      const isTyping = event.target instanceof HTMLInputElement ||
                      event.target instanceof HTMLTextAreaElement ||
                      (event.target instanceof HTMLElement && event.target.contentEditable === 'true')

      // Only handle spacebar if not typing and quantize modal is not open
      if (event.code === 'Space' && !isTyping && !showQuantizeModal) {
        // Don't handle spacebar in song arrangement tab - let it handle its own spacebar
        if (activeTab === 'song-arrangement') {
          return // Don't prevent default, let song arrangement handle it
        }
        
        // Only handle spacebar for sequencer tab
        if (hasLoadedAudio) {
          event.preventDefault()
          // Play current sequencer pattern in Sequencer tab
          handlePlayPause()
        }
      }

      // Clear pattern selection with Escape key
      // if (event.code === 'Escape' && selectedPatternForPlacement) {
      //   event.preventDefault()
      //   setSelectedPatternForPlacement(null)
      // }

      // Update session with Ctrl+S or Cmd+S
      if ((event.ctrlKey || event.metaKey) && event.code === 'KeyS') {
        event.preventDefault()
        if (currentSessionId && hasUnsavedChanges) {
          handleUpdateSession()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPlaying, hasLoadedAudio, activeTab, showQuantizeModal, currentSessionId, hasUnsavedChanges])
  
  // EQ Panel state

  const [selectedTrackForEQ, setSelectedTrackForEQ] = useState<number | null>(null)
  // Master EQ state
  const [masterEQ, setMasterEQ] = useState({ low: 0, mid: 0, high: 0 })


  // Add subgenre to new genre
  const addSubgenreToNewGenre = () => {
    if (newSubgenreInput.trim() && !newGenreSubgenres.includes(newSubgenreInput.trim())) {
      setNewGenreSubgenres([...newGenreSubgenres, newSubgenreInput.trim()])
      setNewSubgenreInput('')
    }
  }

  // Remove subgenre from new genre
  const removeSubgenreFromNewGenre = (subgenreToRemove: string) => {
    setNewGenreSubgenres(newGenreSubgenres.filter(subgenre => subgenre !== subgenreToRemove))
  }
  
  // Start editing subgenres for a genre
  const startEditingSubgenres = (genreId: string) => {
    setEditingSubgenres(prev => ({ ...prev, [genreId]: true }))
    setSubgenreInputs(prev => ({ ...prev, [genreId]: '' }))
  }
  
  // Stop editing subgenres for a genre
  const stopEditingSubgenres = (genreId: string) => {
    setEditingSubgenres(prev => ({ ...prev, [genreId]: false }))
    setSubgenreInputs(prev => ({ ...prev, [genreId]: '' }))
  }
  
  // Add subgenre to existing genre
  const addSubgenreToGenre = async (genreId: string, genreName: string) => {
    const subgenre = subgenreInputs[genreId]?.trim()
    if (!subgenre) return
    
    setIsSavingSubgenres(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to edit subgenres')
        return
      }
      
      // Check if subgenre already exists for this genre
      const { data: existingSubgenre } = await supabase
        .from('genre_subgenres')
        .select('subgenre')
        .eq('genre', genreName)
        .eq('subgenre', subgenre)
        .single()
      
      if (existingSubgenre) {
        alert('This subgenre already exists for this genre')
        return
      }
      
      // Add the new subgenre
      const { error } = await supabase
        .from('genre_subgenres')
        .insert({
          genre: genreName,
          subgenre: subgenre
        })
      
      if (error) {
        console.error('Error adding subgenre:', error)
        alert('Failed to add subgenre')
        return
      }
      
      // Update local state
      setGenreSubgenres(prev => ({
        ...prev,
        [genreName]: [...(prev[genreName] || []), subgenre].sort()
      }))
      
      // Clear input
      setSubgenreInputs(prev => ({ ...prev, [genreId]: '' }))
      
      console.log(`Added subgenre "${subgenre}" to genre "${genreName}"`)
    } catch (error) {
      console.error('Error adding subgenre:', error)
      alert('Failed to add subgenre')
    } finally {
      setIsSavingSubgenres(false)
    }
  }
  
  // Remove subgenre from existing genre
  const removeSubgenreFromGenre = async (genreName: string, subgenreToRemove: string) => {
    setIsSavingSubgenres(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to edit subgenres')
        return
      }
      
      // Remove the subgenre
      const { error } = await supabase
        .from('genre_subgenres')
        .delete()
        .eq('genre', genreName)
        .eq('subgenre', subgenreToRemove)
      
      if (error) {
        console.error('Error removing subgenre:', error)
        alert('Failed to remove subgenre')
        return
      }
      
      // Update local state
      setGenreSubgenres(prev => ({
        ...prev,
        [genreName]: (prev[genreName] || []).filter(subgenre => subgenre !== subgenreToRemove)
      }))
      
      console.log(`Removed subgenre "${subgenreToRemove}" from genre "${genreName}"`)
    } catch (error) {
      console.error('Error removing subgenre:', error)
      alert('Failed to remove subgenre')
    } finally {
      setIsSavingSubgenres(false)
    }
  }

  // Transport lock states
  const [isBpmLocked, setIsBpmLocked] = useState(false)
  const [isKeyLocked, setIsKeyLocked] = useState(false)
  const [isReadyCheckEnabled, setIsReadyCheckEnabled] = useState(false)
  const [isShuffleTrackerEnabled, setIsShuffleTrackerEnabled] = useState(false)
  const [isShuffleLimitEnabled, setIsShuffleLimitEnabled] = useState(false) // Separate toggle for 10 file limitation
  const [isReadyCheckLocked, setIsReadyCheckLocked] = useState(false)
  const [showWaveforms, setShowWaveforms] = useState(false) // New state for waveform visibility

  const [melodyLoopMode, setMelodyLoopMode] = useState<'transport-dominates' | 'melody-dominates'>('transport-dominates')

  // Pattern management state
  const [showSavePatternDialog, setShowSavePatternDialog] = useState(false)
  const [showLoadPatternDialog, setShowLoadPatternDialog] = useState(false)
  const [showSaveTrackPatternDialog, setShowSaveTrackPatternDialog] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [selectedTrackForPattern, setSelectedTrackForPattern] = useState<Track | null>(null)
  const [patternName, setPatternName] = useState('')
  const [patternDescription, setPatternDescription] = useState('')
  const [patternCategory, setPatternCategory] = useState('')
  const [patternTags, setPatternTags] = useState('')
  const [availablePatterns, setAvailablePatterns] = useState<any[]>([])
  const [selectedPatternToLoad, setSelectedPatternToLoad] = useState<string | null>(null)

  // Save session function
  const handleSaveSession = async () => {
    if (!sessionName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a session name",
        variant: "destructive"
      })
      return
    }

    setIsSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to save sessions')
        return
      }

      const tags = sessionTags.trim() ? sessionTags.split(',').map(tag => tag.trim()) : []

      // Validate and sanitize song arrangement data before saving
      
      let validatedSongArrangementData = songArrangementPatterns
      try {
        // Test if the data can be serialized
        const serialized = JSON.stringify(songArrangementPatterns)
        
        // Validate pattern structure
        if (Array.isArray(validatedSongArrangementData)) {
          validatedSongArrangementData.forEach((pattern, index) => {
            if (!pattern.id || !pattern.name || !pattern.trackId) {
              console.warn(`[SESSION DEBUG] Pattern ${index} missing required fields:`, pattern)
            }
          })
        }
      } catch (error) {
        console.error('[SESSION DEBUG] Song arrangement data is not serializable, using empty array:', error)
        validatedSongArrangementData = []
      }

      // Sanitize tracks data to remove any non-serializable objects
      const sanitizedTracks = tracks.map(track => ({
        id: track.id,
        name: track.name,
        color: track.color,
        audioUrl: track.audioUrl,
        audioName: track.audioName,
        audioFileId: track.audioFileId,
        pitchShift: track.pitchShift,
        playbackRate: track.playbackRate,
        currentKey: track.currentKey,
        originalKey: track.originalKey,
        currentBpm: track.currentBpm,
        originalBpm: track.originalBpm,
        bpm: track.bpm,
        key: track.key,
        audio_type: track.audio_type,
        tags: track.tags,
        // Exclude any audio players, samples, or other complex objects
      }))
      

      // Collect all session data
      const sessionData = {
        user_id: user.id,
        name: sessionName,
        description: sessionDescription,
        category: sessionCategory,
        tags,
        status: sessionStatus,
        bpm,
        transport_key: transportKey, // Save transport key
        steps,
        tracks: sanitizedTracks, // Use sanitized tracks
        sequencer_data: sequencerData,
        mixer_data: mixerSettings,
        effects_data: {}, // Will be implemented when effects are added
        piano_roll_data: {}, // Will be populated when piano roll is used
        sample_library_data: {}, // Will be populated when sample library is used
        song_arrangement_data: validatedSongArrangementData, // Use validated song arrangement patterns
        playback_state: {
          isPlaying,
          currentStep,
          lastPlayedAt: new Date().toISOString()
        },
        ui_state: {
          activeTab,
          showSampleLibrary,
          showPianoRoll,
          selectedTrack,
          pianoRollTrack
        },
        genre: '',
        key: '',
        is_public: false,
        is_template: false,
        allow_collaboration: false
      }

      // Debug: Log the session data being sent
      
      // Test if the entire session data can be serialized
      try {
        const fullSessionSerialized = JSON.stringify(sessionData)
      } catch (error) {
        console.error('[SESSION DEBUG] Full session data is NOT serializable:', error)
        throw new Error('Session data contains non-serializable content')
      }

      let result
      if (currentSessionId) {
        // Update existing session
        result = await supabase
          .from('beat_sessions')
          .update(sessionData)
          .eq('id', currentSessionId)
          .select()
          .single()
      } else {
        // Create new session
        result = await supabase
          .from('beat_sessions')
          .insert([sessionData])
          .select()
          .single()
      }

      if (result.error) {
        console.error('Error saving session:', result.error)
        showNotification('Error', 'Failed to save session', 'error')
        return
      }

      setCurrentSessionId(result.data.id)
      setCurrentSessionName(result.data.name)
      setHasUnsavedChanges(false)
      setSessionName('')
      setSessionDescription('')
      setSessionCategory('')
      setSessionTags('')
      setSessionStatus('draft')
      setShowSessionDialog(false)
      showNotification('Success', `Session "${result.data.name}" saved successfully!`, 'success')
      
      // Refresh saved sessions list
      loadSavedSessions()
    } catch (error) {
      console.error('Error saving session:', error)
      showNotification('Error', 'Failed to save session', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  // Update current session function
  const handleUpdateSession = async () => {
    if (!currentSessionId) {
      showNotification('Warning', 'No session loaded to update', 'warning')
      return
    }

    setIsSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        showNotification('Error', 'Please log in to update sessions', 'error')
        return
      }

      // Validate and sanitize song arrangement data before saving
      
      let validatedSongArrangementData = songArrangementPatterns
      try {
        // Test if the data can be serialized
        const serialized = JSON.stringify(songArrangementPatterns)
        
        // Validate pattern structure
        if (Array.isArray(validatedSongArrangementData)) {
          validatedSongArrangementData.forEach((pattern, index) => {
            if (!pattern.id || !pattern.name || !pattern.trackId) {
              console.warn(`[SESSION DEBUG] Pattern ${index} missing required fields:`, pattern)
            }
          })
        }
      } catch (error) {
        console.error('[SESSION DEBUG] Song arrangement data is not serializable, using empty array:', error)
        validatedSongArrangementData = []
      }

      // Sanitize tracks data to remove any non-serializable objects
      const sanitizedTracks = tracks.map(track => ({
        id: track.id,
        name: track.name,
        color: track.color,
        audioUrl: track.audioUrl,
        audioName: track.audioName,
        audioFileId: track.audioFileId,
        pitchShift: track.pitchShift,
        playbackRate: track.playbackRate,
        currentKey: track.currentKey,
        originalKey: track.originalKey,
        currentBpm: track.currentBpm,
        originalBpm: track.originalBpm,
        bpm: track.bpm,
        key: track.key,
        audio_type: track.audio_type,
        tags: track.tags,
        // Exclude any audio players, samples, or other complex objects
      }))
      

      // Collect all session data
      const sessionData = {
        bpm,
        transport_key: transportKey,
        steps,
        tracks: sanitizedTracks, // Use sanitized tracks
        sequencer_data: sequencerData,
        mixer_data: mixerSettings,
        effects_data: {}, // Will be implemented when effects are added
        piano_roll_data: {}, // Will be populated when piano roll is used
        sample_library_data: {}, // Will be populated when sample roll is used
        song_arrangement_data: validatedSongArrangementData, // Include song arrangement data
        playback_state: {
          isPlaying,
          currentStep,
          lastPlayedAt: new Date().toISOString()
        },
        ui_state: {
          activeTab,
          showSampleLibrary,
          showPianoRoll,
          selectedTrack,
          pianoRollTrack
        }
      }

      // Debug: Log the session data being sent

      const result = await supabase
        .from('beat_sessions')
        .update(sessionData)
        .eq('id', currentSessionId)
        .select()
        .single()

      if (result.error) {
        console.error('Error updating session:', result.error)
        toast({
          title: "Error",
          description: "Failed to update session",
          variant: "destructive"
        })
        return
      }

      setHasUnsavedChanges(false)
      toast({
        title: "Success",
        description: `Session "${currentSessionName}" updated successfully!`
      })
      
      // Refresh saved sessions list
      loadSavedSessions()
    } catch (error) {
      console.error('Error updating session:', error)
      toast({
        title: "Error",
        description: "Failed to update session",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Function to mark session as having unsaved changes
  const markSessionChanged = () => {
    if (currentSessionId) {
      setHasUnsavedChanges(true)
    } else {
    }
  }

  // Wrapper function for toggleStep that also marks session as changed
  const handleToggleStep = (trackId: number, stepIndex: number) => {
    
    toggleStep(trackId, stepIndex)
    
    
    markSessionChanged()
    // Add to undo/redo history
    undoRedo.addToHistory(captureCurrentState(), 'Toggle step')
    
    // Log the state after all updates
    setTimeout(() => {
    }, 100)
  }

  // Load saved sessions
  const loadSavedSessions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('beat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error loading sessions:', error)
        return
      }

      setSavedSessions(data || [])
      
      // Load linked albums and singles for each session
      await loadSessionLinks(data || [])
    } catch (error) {
      console.error('Error loading sessions:', error)
    }
  }

  // Load linked albums, singles, and tracks for sessions
  const loadSessionLinks = async (sessions: any[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const sessionIds = sessions.map(session => session.id)
      const newSessionLinks: {[sessionId: string]: {albums: any[], singles: any[], tracks: any[]}} = {}

      // Load linked albums
      const { data: albumTracks } = await supabase
        .from('album_tracks')
        .select('session_id, albums!inner(id, title, artist)')
        .in('session_id', sessionIds)
        .not('session_id', 'is', null)

      // Load linked singles
      const { data: singles } = await supabase
        .from('singles')
        .select('id, title, artist, session_id')
        .in('session_id', sessionIds)
        .not('session_id', 'is', null)

      // Load linked tracks
      const { data: tracks } = await supabase
        .from('tracks')
        .select('id, title, artist, session_id')
        .in('session_id', sessionIds)
        .not('session_id', 'is', null)

      // Organize the data by session ID
      sessionIds.forEach(sessionId => {
        const linkedAlbums = albumTracks
          ?.filter(track => track.session_id === sessionId)
          .map(track => track.albums)
          .filter(Boolean) || []
        
        const linkedSingles = singles
          ?.filter(single => single.session_id === sessionId) || []

        const linkedTracks = tracks
          ?.filter(track => track.session_id === sessionId) || []

        newSessionLinks[sessionId] = {
          albums: linkedAlbums,
          singles: linkedSingles,
          tracks: linkedTracks
        }
      })

      setSessionLinks(newSessionLinks)
    } catch (error) {
      console.error('Error loading session links:', error)
    }
  }

  // Navigate to album page
  const navigateToAlbum = (albumId: string) => {
    router.push(`/myalbums/${albumId}`)
  }

  // Navigate to singles page
  const navigateToSingle = (singleId: string) => {
    router.push(`/mysingles`)
  }

  // Navigate to tracks page
  const navigateToTrack = (trackId: string) => {
    router.push(`/mylibrary?tab=tracks`)
  }

  // Update session status
  const handleUpdateSessionStatus = async (sessionId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('beat_sessions')
        .update({ status: newStatus })
        .eq('id', sessionId)

      if (error) {
        console.error('Error updating session status:', error)
        toast({
          title: "Error",
          description: "Failed to update session status",
          variant: "destructive"
        })
        return
      }

      // Update the local state
      setSavedSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? { ...session, status: newStatus }
          : session
      ))

      toast({
        title: "Success",
        description: `Session status updated to ${newStatus.replace('_', ' ')}`
      })
    } catch (error) {
      console.error('Error updating session status:', error)
      toast({
        title: "Error",
        description: "Failed to update session status",
        variant: "destructive"
      })
    }
  }

  // Start editing session name
  const handleStartEditSession = (session: any) => {
    setEditingSessionId(session.id)
    setEditingSessionName(session.name)
  }

  // Save session name
  const handleSaveSessionName = async () => {
    if (!editingSessionId || !editingSessionName.trim()) return
    
    setSavingSessionName(true)
    try {
      const { error } = await supabase
        .from('beat_sessions')
        .update({ name: editingSessionName.trim() })
        .eq('id', editingSessionId)

      if (error) {
        console.error('Error updating session name:', error)
        toast({
          title: "Error",
          description: "Failed to update session name",
          variant: "destructive"
        })
        return
      }

      // Update the local state
      setSavedSessions(prev => prev.map(session => 
        session.id === editingSessionId 
          ? { ...session, name: editingSessionName.trim() }
          : session
      ))

      // Update current session name if it's the one being edited
      if (currentSessionId === editingSessionId) {
        setCurrentSessionName(editingSessionName.trim())
      }

      toast({
        title: "Success",
        description: "Session name updated"
      })
    } catch (error) {
      console.error('Error updating session name:', error)
      toast({
        title: "Error",
        description: "Failed to update session name",
        variant: "destructive"
      })
    } finally {
      setSavingSessionName(false)
      setEditingSessionId(null)
      setEditingSessionName('')
    }
  }

  // Cancel editing session name
  const handleCancelEditSession = () => {
    setEditingSessionId(null)
    setEditingSessionName('')
  }

  // Duplicate a session
  const handleDuplicateSession = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('beat_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (error) {
        console.error('Error loading session for duplication:', error)
        toast({
          title: "Error",
          description: "Failed to load session for duplication",
          variant: "destructive"
        })
        return
      }

      // Generate a new name with "Copy" suffix
      let newName = `${data.name} Copy`
      let copyNumber = 1
      
      // Check if name already exists and increment copy number
      while (true) {
        const { data: existingSession } = await supabase
          .from('beat_sessions')
          .select('id')
          .eq('name', newName)
          .eq('user_id', data.user_id)
          .single()
        
        if (!existingSession) break
        copyNumber++
        newName = `${data.name} Copy ${copyNumber}`
      }

      // Create new session data with copied content
      const newSessionData = {
        user_id: data.user_id,
        name: newName,
        description: data.description,
        category: data.category,
        tags: data.tags,
        status: 'draft', // Always start as draft
        bpm: data.bpm,
        transport_key: data.transport_key,
        steps: data.steps,
        tracks: data.tracks,
        sequencer_data: data.sequencer_data,
        mixer_data: data.mixer_data,
        effects_data: data.effects_data,
        piano_roll_data: data.piano_roll_data,
        sample_library_data: data.sample_library_data,
        song_arrangement_data: data.song_arrangement_data,
        playback_state: {
          isPlaying: false,
          currentStep: 0,
          lastPlayedAt: new Date().toISOString()
        },
        ui_state: data.ui_state,
        genre: data.genre,
        key: data.key,
        is_public: false,
        is_template: false,
        allow_collaboration: false
      }

      // Save the duplicated session
      const { data: newSession, error: saveError } = await supabase
        .from('beat_sessions')
        .insert(newSessionData)
        .select()
        .single()

      if (saveError) {
        console.error('Error saving duplicated session:', saveError)
        toast({
          title: "Error",
          description: "Failed to save duplicated session",
          variant: "destructive"
        })
        return
      }

      // Refresh the sessions list
      await loadSavedSessions()
      
      toast({
        title: "Success",
        description: `Session "${newName}" created successfully!`,
        variant: "default"
      })

    } catch (error) {
      console.error('Error duplicating session:', error)
      toast({
        title: "Error",
        description: "Failed to duplicate session",
        variant: "destructive"
      })
    }
  }

  // Load a specific session
  const handleLoadSession = async (sessionId: string) => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('beat_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (error) {
        console.error('Error loading session:', error)
        toast({
          title: "Error",
          description: "Failed to load session",
          variant: "destructive"
        })
        return
      }

      // Restore session data
      setBpm(data.bpm)
      setSteps(data.steps)
      
      // CRITICAL: Ensure all tracks loaded from session have halftime OFF by default
      const tracksWithHalftimeOff = data.tracks.map((track: Track) => ({
        ...track,
        playbackRate: track.playbackRate || 1.0,  // Default to 1.0 if not set
        pitchShift: track.pitchShift || 0         // Default to 0 if not set
      }))
      setTracks(tracksWithHalftimeOff)
      
      setTransportKey(data.transport_key || 'C') // Restore transport key
      
      // Restore sequencer data directly
      if (data.sequencer_data) {
        setSequencerDataFromSession(data.sequencer_data)
      }

      // Restore mixer settings
      if (data.mixer_data) {
        setMixerSettings(data.mixer_data)
        
        // Synchronize track mute states with mixer settings
        const tracksWithSyncedMute = tracksWithHalftimeOff.map((track: Track) => ({
          ...track,
          mute: data.mixer_data[track.id]?.mute || false
        }))
        setTracks(tracksWithSyncedMute)
      }

      // Restore song arrangement data
      if (data.song_arrangement_data && Array.isArray(data.song_arrangement_data)) {
        console.log('[SESSION LOAD] Restoring song arrangement patterns:', data.song_arrangement_data.length)
        console.log('[SESSION LOAD] Pattern data:', data.song_arrangement_data)
        setSongArrangementPatterns(data.song_arrangement_data)
      } else {
        // Clear song arrangement patterns if no data exists
        setSongArrangementPatterns([])
        console.log('[SESSION LOAD] No song arrangement data found, cleared patterns')
      }

      // Restore playback state (but don't auto-play)
      if (data.playback_state) {
        setCurrentStep(data.playback_state.currentStep || 0)
        // Always set to not playing when loading a session
        setIsPlaying(false)
      }

      // Restore UI state
      if (data.ui_state) {
        setShowSampleLibrary(data.ui_state.showSampleLibrary || false)
        setShowPianoRoll(data.ui_state.showPianoRoll || false)
        setSelectedTrack(data.ui_state.selectedTrack || null)
        setPianoRollTrack(data.ui_state.pianoRollTrack || null)
      }
      
      // Always go to sequencer tab after loading session
      setActiveTab('sequencer')
      
      // Force a re-render to ensure tab change takes effect
      setTimeout(() => {
        setActiveTab('sequencer')
      }, 50)

      setCurrentSessionId(sessionId)
      setCurrentSessionName(data.name)
      setHasUnsavedChanges(false)
      
      // Clear the session parameter from URL to prevent auto-reload on refresh
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href)
        url.searchParams.delete('session')
        window.history.replaceState({}, '', url.toString())
      }
      
      // Populate form fields with current session data
      setSessionName(data.name)
      setSessionDescription(data.description || '')
      setSessionCategory(data.category || '')
      setSessionTags(data.tags ? data.tags.join(', ') : '')
      setSessionStatus(data.status || 'draft')
      
      // Show modern success dialog instead of alert
      setSuccessMessage(`Session "${data.name}" loaded successfully!`)
      setShowSuccessDialog(true)
    } catch (error) {
      console.error('Error loading session:', error)
      setSuccessMessage('Failed to load session')
      setShowSuccessDialog(true)
    } finally {
      setIsLoading(false)
    }
  }

  // Delete a session
  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return

    try {
      const { error } = await supabase
        .from('beat_sessions')
        .delete()
        .eq('id', sessionId)

      if (error) {
        console.error('Error deleting session:', error)
        alert('Failed to delete session')
        return
      }

      if (currentSessionId === sessionId) {
        setCurrentSessionId(null)
        setCurrentSessionName('')
        setHasUnsavedChanges(false)
      }
      
      alert('Session deleted successfully!')
      loadSavedSessions()
    } catch (error) {
      console.error('Error deleting session:', error)
      alert('Failed to delete session')
    }
  }

  // Load saved sessions on component mount
  useEffect(() => {
    loadSavedSessions()
    loadGenres()
    loadAudioPacks()
    // Removed fetchFileLinks() and fetchTotalAudioItems() - will load on demand
  }, [])

  // Removed automatic file links fetching - now lazy loaded only when needed

  // Debug: Log file links when they change
  useEffect(() => {
    console.log('📊 File links updated:', {
      count: fileLinks.length,
      links: fileLinks.slice(0, 3),
      preferMp3
    })
  }, [fileLinks, preferMp3])

  // Debug: Log tracks with audioFileId
  useEffect(() => {
    const tracksWithAudio = tracks.filter(track => track.audioUrl && track.audioFileId)
    if (tracksWithAudio.length > 0) {
      console.log('🎵 Tracks with audioFileId:', tracksWithAudio.map(track => ({
        name: track.name,
        audioFileId: track.audioFileId,
        audioUrl: track.audioUrl?.substring(0, 50) + '...'
      })))
    }
  }, [tracks])

  // Version history functions
  const loadSessionVersions = async () => {
    if (!currentSessionId) return
    
    setIsLoadingVersions(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // For now, we'll use the in-memory undo/redo history
      // In the future, this could load from a database table
      const versions = undoRedo.getHistorySummary()
      setSessionVersions(versions)
    } catch (error) {
      console.error('Error loading session versions:', error)
    } finally {
      setIsLoadingVersions(false)
    }
  }

  const openVersionHistoryDialog = () => {
    if (!currentSessionId) {
      alert('Please load a session first to view version history')
      return
    }
    loadSessionVersions()
    setShowVersionHistoryDialog(true)
  }

  const loadVersion = (versionId: string) => {
    try {
      undoRedo.jumpToVersion(versionId)
      setShowVersionHistoryDialog(false)
      toast({
        title: "Version loaded",
        description: "The selected version has been loaded successfully.",
      })
    } catch (error) {
      console.error('Error loading version:', error)
      toast({
        title: "Error",
        description: "Failed to load the selected version.",
        variant: "destructive",
      })
    }
  }

  // Load genres from database
  const loadGenres = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      let query = supabase
        .from('genres')
        .select('*')
        .order('name')

      // If user is logged in, include their genres and public genres
      if (user) {
        query = query.or(`user_id.eq.${user.id},is_public.eq.true,user_id.is.null`)
      } else {
        // If not logged in, only show public and system genres
        query = query.or(`is_public.eq.true,user_id.is.null`)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error loading genres:', error)
        return
      }

      setGenres(data || [])
      
      // Load subgenres for all genres
      await loadAllGenreSubgenres()
    } catch (error) {
      console.error('Error loading genres:', error)
    }
  }

  // Load audio packs from database
  const loadAudioPacks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('audio_packs')
        .select('*')
        .eq('user_id', user.id)
        .order('name')

      if (error) {
        console.error('Error loading audio packs:', error)
        return
      }

      setAudioPacks(data || [])
      console.log('Loaded audio packs:', data)
    } catch (error) {
      console.error('Error loading audio packs:', error)
    }
  }

  // Load subgenres for all genres
  const loadAllGenreSubgenres = async () => {
    try {
      const { data, error } = await supabase
        .from('genre_subgenres')
        .select('genre, subgenre, bpm_range_min, bpm_range_max, default_bpm')
        .order('genre, subgenre')
      
      if (error) {
        console.error('Error loading all subgenres:', error)
        return
      }
      
      // Group subgenres by genre
      const subgenresByGenre: {[key: string]: string[]} = {}
      data?.forEach(item => {
        if (!subgenresByGenre[item.genre]) {
          subgenresByGenre[item.genre] = []
        }
        subgenresByGenre[item.genre].push(item.subgenre)
      })
      
      setGenreSubgenres(subgenresByGenre)
      setGenreSubgenresData(data || [])
      console.log('Loaded subgenres for all genres:', subgenresByGenre)
    } catch (error) {
      console.error('Error loading all subgenres:', error)
    }
  }

  // Load subgenres for a specific genre
  const loadSubgenres = async (genreId: string) => {
    try {
      // Don't load subgenres if "none" is selected
      if (genreId === 'none') {
        setSubgenres([])
        setSelectedSubgenre('none')
        return
      }

      const genre = genres.find(g => g.id === genreId)
      if (!genre) {
        setSubgenres([])
        setSelectedSubgenre('none')
        return
      }

      const { data, error } = await supabase
        .rpc('get_valid_subgenres', { p_genre_id: genreId })

      if (error) {
        console.error('Error loading subgenres:', error)
        setSubgenres([])
        setSelectedSubgenre('none')
        return
      }

      setSubgenres(data?.map((item: any) => item.subgenre) || [])
      setSelectedSubgenre('none') // Reset subgenre when genre changes
    } catch (error) {
      console.error('Error loading subgenres:', error)
      setSubgenres([])
      setSelectedSubgenre('none')
    }
  }

  // Update BPM range when subgenre is selected
  const handleSubgenreChange = async (subgenre: string) => {
    setSelectedSubgenre(subgenre)
    
    // If a subgenre is selected and we have a genre, try to get the subgenre's BPM range
    if (subgenre && subgenre !== 'none' && selectedGenre) {
      try {
        const { data: tempoRange, error } = await supabase.rpc('get_tempo_range', {
          p_genre_id: selectedGenre.id,
          p_subgenre: subgenre
        })
        
        if (!error && tempoRange && tempoRange.length > 0) {
          const range = tempoRange[0]
          // Update BPM range to the intersection of genre range and subgenre range
          const minBpm = Math.max(range.min_bpm, bpmRange[0])
          const maxBpm = Math.min(range.max_bpm, bpmRange[1])
          
          if (minBpm <= maxBpm) {
            setBpmRange([minBpm, maxBpm])
            console.log(`[SUBGENRE] Updated BPM range to ${minBpm}-${maxBpm} for ${selectedGenre.name} - ${subgenre}`)
          } else {
            // If ranges don't overlap, use subgenre range
            setBpmRange([range.min_bpm, range.max_bpm])
            console.log(`[SUBGENRE] Ranges don't overlap, using subgenre range: ${range.min_bpm}-${range.max_bpm} for ${subgenre}`)
          }
        }
      } catch (error) {
        console.warn('Error getting subgenre tempo range:', error)
      }
    }
  }

  // Update genre tempo range
  const handleUpdateGenre = async (genre: any) => {
    try {
      const { error } = await supabase
        .from('genres')
        .update({
          bpm_range_min: genre.bpm_range_min,
          bpm_range_max: genre.bpm_range_max,
          default_bpm: genre.default_bpm
        })
        .eq('id', genre.id)
      
      if (error) throw error
      
      setShowEditGenreDialog(false)
      setEditingGenre(null)
      loadGenres() // Refresh genres
    } catch (error) {
      console.error('Error updating genre:', error)
      alert('Failed to update genre')
    }
  }

  // Update subgenre tempo range
  const handleUpdateSubgenre = async (subgenre: any) => {
    try {
      const { error } = await supabase
        .from('genre_subgenres')
        .update({
          bpm_range_min: subgenre.bpm_range_min,
          bpm_range_max: subgenre.bpm_range_max,
          default_bpm: subgenre.default_bpm
        })
        .eq('genre', subgenre.genre)
        .eq('subgenre', subgenre.subgenre)
      
      if (error) throw error
      
      setShowEditSubgenreDialog(false)
      setEditingSubgenre(null)
      loadGenres() // Refresh genres
      loadAllGenreSubgenres() // Refresh subgenre data
    } catch (error) {
      console.error('Error updating subgenre:', error)
      alert('Failed to update subgenre')
    }
  }

  // Load genre templates
  const loadGenreTemplates = async (genreId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('genre_templates')
        .select('*')
        .eq('genre_id', genreId)
        .or(`user_id.eq.${user.id},is_public.eq.true`)
        .order('name')

      if (error) {
        console.error('Error loading genre templates:', error)
        return
      }

      setGenreTemplates(data || [])
    } catch (error) {
      console.error('Error loading genre templates:', error)
    }
  }

  // Save current state as genre template
  const saveAsGenreTemplate = async (genreId: string, templateName: string, description?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to save templates')
        return
      }

      const templateData = {
        bpm,
        transport_key: transportKey,
        steps,
        tracks,
        sequencer_data: sequencerData,
        mixer_data: mixerSettings,
        effects_data: {},
        piano_roll_data: pianoRollData
      }

      const { error } = await supabase
        .from('genre_templates')
        .insert({
          genre_id: genreId,
          user_id: user.id,
          name: templateName,
          description,
          template_data: templateData,
          bpm,
          key: transportKey,
          steps,
          transport_key: transportKey,
          tracks,
          sequencer_data: sequencerData,
          mixer_data: mixerSettings
        })

      if (error) {
        console.error('Error saving genre template:', error)
        alert('Failed to save template')
        return
      }

      alert('Template saved successfully!')
      loadGenreTemplates(genreId)
    } catch (error) {
      console.error('Error saving genre template:', error)
      alert('Failed to save template')
    }
  }

  // Load genre template
  const loadGenreTemplate = async (template: any) => {
    try {
      const templateData = template.template_data || {}
      
      // Load BPM and transport settings
      if (templateData.bpm) setBpm(templateData.bpm)
      if (templateData.transport_key) setTransportKey(templateData.transport_key)
      if (templateData.steps) setSteps(templateData.steps)
      
      // Load tracks
      if (templateData.tracks) setTracks(templateData.tracks)
      
      // Load sequencer data
      if (templateData.sequencer_data) {
        setSequencerDataFromSession(templateData.sequencer_data)
      }
      
      // Load mixer settings
      if (templateData.mixer_data) {
        setMixerSettings(templateData.mixer_data)
      }
      
      // Load piano roll data
      if (templateData.piano_roll_data) {
        setPianoRollDataFromSession(templateData.piano_roll_data)
      }
      
      setSelectedGenre(template.genre_id)
      setShowGenreTemplateDialog(false)
      
      console.log('Genre template loaded successfully:', template.name)
    } catch (error) {
      console.error('Error loading genre template:', error)
      alert('Failed to load template')
    }
  }

  // Create new genre
  const createNewGenre = async () => {
    if (!newGenreName.trim()) {
      alert('Please enter a genre name')
      return
    }

    setIsCreatingGenre(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to create genres')
        return
      }

      // Check if genre name already exists for this user
      const { data: existingGenres } = await supabase
        .from('genres')
        .select('name')
        .eq('user_id', user.id)
        .eq('name', newGenreName.trim())

      if (existingGenres && existingGenres.length > 0) {
        alert('A genre with this name already exists')
        return
      }

      // Create the new genre
      const { data: newGenre, error } = await supabase
        .from('genres')
        .insert({
          user_id: user.id,
          name: newGenreName.trim(),
          description: newGenreDescription.trim() || null,
          color: newGenreColor,
          bpm_range_min: newGenreMinBpm,
          bpm_range_max: newGenreMaxBpm,
          default_bpm: newGenreBpm,
          default_key: newGenreKey,
          default_steps: newGenreSteps,
          is_public: false,
          is_template: true
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating genre:', error)
        alert('Failed to create genre')
        return
      }

      // Create subgenre relationships if any subgenres were added
      if (newGenreSubgenres.length > 0) {
        const subgenreData = newGenreSubgenres.map(subgenre => ({
          genre: newGenre.name,
          subgenre: subgenre
        }))
        
        const { error: subgenreError } = await supabase
          .from('genre_subgenres')
          .insert(subgenreData)
        
        if (subgenreError) {
          console.error('Error creating subgenre relationships:', subgenreError)
          // Don't fail the whole operation, just log the error
        } else {
          console.log(`Created ${newGenreSubgenres.length} subgenre relationships for ${newGenre.name}`)
        }
      }

      // Reset form
      setNewGenreName('')
      setNewGenreDescription('')
      setNewGenreBpm(120)
      setNewGenreMinBpm(80)
      setNewGenreMaxBpm(180)
      setNewGenreKey('C')
      setNewGenreSteps(16)
      setNewGenreColor('#F4C430')
      setNewGenreSubgenres([])
      setNewSubgenreInput('')
      setShowCreateGenreDialog(false)

      // Reload genres and select the new one
      await loadGenres()
      setSelectedGenre(newGenre)
      applyGenreSettings(newGenre)

      alert(`Genre "${newGenre.name}" created successfully!`)
    } catch (error) {
      console.error('Error creating genre:', error)
      alert('Failed to create genre')
    } finally {
      setIsCreatingGenre(false)
    }
  }

  // Apply genre settings
  const applyGenreSettings = (genre: any) => {
    setBpm(genre.default_bpm || 120)
    setTransportKey(genre.default_key || 'C')
    setSteps(genre.default_steps || 16)
    setSelectedGenre(genre)
    setSelectedSubgenre('') // Clear subgenre when genre changes
    
    // Update BPM range based on genre
    if (genre.bpm_range_min && genre.bpm_range_max) {
      setBpmRange([genre.bpm_range_min, genre.bpm_range_max])
      console.log(`[GENRE] Updated BPM range to ${genre.bpm_range_min}-${genre.bpm_range_max} for ${genre.name}`)
    } else {
      // Default range if genre doesn't have BPM range set
      setBpmRange([70, 165])
      console.log(`[GENRE] Using default BPM range 70-165 for ${genre.name}`)
    }
    
    // Load available subgenres for this genre
    loadSubgenresForGenre(genre.name)
    
    // Load genre templates
    loadGenreTemplates(genre.id)
  }

  // Automate trap beat creation process
  const automateTrapBeatCreation = async () => {
    console.log('[AUTOMATION] Starting trap beat creation automation...')
    
    try {
      // Step 1: Turn on Strata mode
      console.log('[AUTOMATION] Step 1: Turning on Strata mode')
      setIsAutoMode(true)
      
      // Step 2: Wait for Strata mode to be applied
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Step 3: Hit shuffle all once
      console.log('[AUTOMATION] Step 3: First shuffle all')
      await handleShuffleAll()
      
      // Step 4: Wait 2 seconds
      console.log('[AUTOMATION] Step 4: Waiting 2 seconds')
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Step 5: Hit shuffle all again
      console.log('[AUTOMATION] Step 5: Second shuffle all')
      await handleShuffleAll()
      
      // Step 6: Wait for shuffle to complete
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Step 7: Play transport for 5 seconds then stop
      console.log('[AUTOMATION] Step 7: Playing transport for 5 seconds')
      playSequence()
      await new Promise(resolve => setTimeout(resolve, 5000))
      stopSequence()
      
      // Step 8: Open song arrangement tab and set bars to 44
      console.log('[AUTOMATION] Step 8: Opening song arrangement and setting bars to 44')
      setActiveTab('song-arrangement')
      
      // Step 9: Wait for tab to load
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Step 10: Set custom bars to 44 (we need to access the song arrangement component)
      // This will be handled by the song arrangement component itself
      console.log('[AUTOMATION] Step 10: Setting bars to 44')
      
      // Step 11: Create drops once
      console.log('[AUTOMATION] Step 11: Creating drops')
      // This will be handled by the song arrangement component
      
      // Step 12: Play transport
      console.log('[AUTOMATION] Step 12: Playing transport')
      // This will be handled by the song arrangement component
      
      console.log('[AUTOMATION] Trap beat creation automation completed!')
      
      // Show notification
      showNotification('Automation Complete', 'Trap beat creation automation completed! Check the song arrangement tab.', 'success')
      
    } catch (error) {
      console.error('[AUTOMATION] Error during trap beat creation:', error)
      showNotification('Automation Error', 'An error occurred during automation. Please try again.', 'error')
    }
  }

  // Load subgenres for a specific genre
  const loadSubgenresForGenre = async (genreName: string) => {
    if (!genreName) {
      setAvailableSubgenres([])
      return
    }
    
    try {
      const { data, error } = await supabase
        .from('genre_subgenres')
        .select('subgenre')
        .eq('genre', genreName)
        .order('subgenre')
      
      if (error) {
        console.error('Error fetching subgenres:', error)
        setAvailableSubgenres([])
        return
      }
      
      const subgenres = data?.map(item => item.subgenre) || []
      setAvailableSubgenres(subgenres)
      console.log(`Loaded ${subgenres.length} subgenres for ${genreName}:`, subgenres)
    } catch (error) {
      console.error('Error fetching subgenres:', error)
      setAvailableSubgenres([])
    }
  }

  // Clear all function - reset to fresh start
  const handleToggleGenreLock = () => {
    setIsGenreLocked(!isGenreLocked)
  }

  const handleToggleSubgenreLock = () => {
    setIsSubgenreLocked(!isSubgenreLocked)
  }

  const handleTogglePackLock = () => {
    setIsPackLocked(!isPackLocked)
  }



  // Monitor patterns state changes for debugging
  useEffect(() => {
  }, [songArrangementPatterns])

  // Song arrangement pattern management
  const handleSongArrangementPatternsChange = (patterns: any[]) => {
    
    try {
      // Sanitize the patterns data to ensure it can be stored in the database
      const sanitizedPatterns = patterns.map(pattern => {
        // Remove any circular references or non-serializable data
        const sanitizedPattern = {
          id: pattern.id,
          name: pattern.name,
          tracks: pattern.tracks ? pattern.tracks.map((track: any) => ({
            id: track.id,
            name: track.name,
            color: track.color,
            audioUrl: track.audioUrl,
            // Only include essential track properties, exclude audio players and other complex objects
            pitchShift: track.pitchShift,
            playbackRate: track.playbackRate,
            currentKey: track.currentKey,
            originalKey: track.originalKey,
            currentBpm: track.currentBpm,
            originalBpm: track.originalBpm
          })) : [],
          sequencerData: pattern.sequencerData,
          bpm: pattern.bpm,
          steps: pattern.steps,
          duration: pattern.duration,
          startBar: pattern.startBar,
          endBar: pattern.endBar,
          color: pattern.color,
          trackId: pattern.trackId
        }
        return sanitizedPattern
      })
      
      
      setSongArrangementPatterns(sanitizedPatterns)
      markSessionChanged() // Mark session as changed when patterns are modified
    } catch (error) {
      console.error('[SESSION DEBUG] Error updating song arrangement patterns:', error)
    }
  }

  // Handle quantization
  const handleQuantizeLoop = (trackId: number, startTime: number, endTime: number, playbackRate: number) => {
    console.log(`[QUANTIZE] Applying quantization to track ${trackId}`)
    console.log(`[QUANTIZE] Start: ${startTime}s, End: ${endTime}s, Rate: ${playbackRate}`)
    
    // Update track with new loop points and playback rate
    setTracks(prev => {
      const newTracks = prev.map(track => 
        track.id === trackId ? { 
          ...track, 
          loopStartTime: startTime,
          loopEndTime: endTime,
          playbackRate: playbackRate
        } : track
      )
      
      // Debug: Log the updated track
      const updatedTrack = newTracks.find(t => t.id === trackId)
      console.log(`[QUANTIZE] Updated track:`, updatedTrack)
      console.log(`[QUANTIZE] Track loop points: startTime=${updatedTrack?.loopStartTime}, endTime=${updatedTrack?.loopEndTime}`)
      
      return newTracks
    })
    
    // Auto-reload will handle the audio reload automatically via useEffect
    console.log(`[QUANTIZE] Track state updated - auto-reload will handle audio reload`)
  }

  // Open quantization modal
  const openQuantizeModal = (track: any) => {
    setQuantizeTrack(track)
    setShowQuantizeModal(true)
  }

  const handleClearAll = () => {
    // Close current session to prevent accidental overwrites
    if (currentSessionId) {
      console.log('[CLEAR ALL] Closing current session to prevent accidental overwrites')
      setCurrentSessionId(null)
      setCurrentSessionName('')
      setHasUnsavedChanges(false)
      alert('Session closed. Clear All will create a fresh start.')
    }

    // Reset transport settings to defaults
    setBpm(120)
    setTransportKey('C')
    setSteps(32) // Default steps
    setCurrentStep(0)
    setBpmRange([70, 165]) // Reset BPM range to default
    
    // Reset tracks to empty array (like page refresh)
    setTracks([])
    
    // Reset to default state (Strata mode OFF)
    setIsAutoMode(false)
    
    // Reset all transport and shuffle settings to defaults
    setIsBpmToleranceEnabled(false)
    setIsBpmLocked(false)
    setIsKeyLocked(false)
    setIsReadyCheckEnabled(false)
    setIsShuffleTrackerEnabled(false)
    setIsShuffleLimitEnabled(false)
    setIsReadyCheckLocked(false)
    setShowWaveforms(false)

    setMelodyLoopMode('transport-dominates')
    
    // Clear all sequencer data (will be re-initialized by the useEffect when Strata mode is set to true)
    setSequencerDataFromSession({})
    
    // Clear piano roll data
    setPianoRollDataFromSession({})
    
    // Reset mixer settings
    setMixerSettings({})
    
    // Reset all UI states to defaults
    setShowSampleLibrary(false)
    setSelectedTrack(null)
    setShowPianoRoll(false)
    setPianoRollTrack(null)

    setShowTrackPianoRoll(false)
    setTrackPianoRollTrack(null)
    setTrackPianoRollNotes([])
    setShowBpmRangeControls(false)
    setShowEditTrackModal(false)
    setEditingTrack(null)
    setShowSavePatternDialog(false)
    setShowLoadPatternDialog(false)
    setShowSaveTrackPatternDialog(false)
    setSelectedTrackForPattern(null)
    setPatternName('')
    setPatternDescription('')
    setPatternCategory('')
    setPatternTags('')
    setSelectedPatternToLoad(null)
    
    // Reset genre selection
    setSelectedGenre(null)
    setSelectedGenreId('none')
    setSelectedSubgenre('none')
    setIsGenreLocked(false)
    setIsSubgenreLocked(false)
    setIsPackLocked(false)
    setSelectedPacks([])
    setAvailableSubgenres([])
    setGenreSubgenres({})
    setGenreTemplates([])
    setShowGenreDialog(false)
    setShowGenreTemplateDialog(false)
    setShowPackDialog(false)
    setSelectedGenreTemplate(null)
    setShowCreateGenreDialog(false)
    setShowEditGenreDialog(false)
    setShowEditSubgenreDialog(false)
    setShowSubgenreManagerDialog(false)
    setShowQuantizeModal(false)
    setQuantizeTrack(null)
    
    // Reset session
    setCurrentSessionId(null)
    setCurrentSessionName('')
    setHasUnsavedChanges(false)
    setShowSessionDialog(false)
    setSessionName('')
    setSessionDescription('')
    setSessionCategory('')
    setSessionTags('')
    setSessionStatus('draft')
    setIsSaving(false)
    setIsLoading(false)
    

    
    // Reset AI prompt
    setAiPrompt('')
    setIsAiPromptVisible(false)
    
    // Reset editing states
    setEditingBpm(false)
    setEditingPosition(false)
    setEditingTransportKey(false)
    setSavingTrack(false)
    setTrackEditError(null)
    
    // Stop playback
    stopSequence()
    setIsPlaying(false)
    
    console.log('Cleared all data - fresh start!')
  }

  // Function to clear the audio shuffle tracker
  const handleClearShuffleTracker = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to clear shuffle tracker')
        return
      }

      // Use a raw SQL query to avoid trigger issues
      const { error } = await supabase.rpc('clear_shuffle_tracker', {
        p_user_id: user.id
      })

      if (error) {
        console.error('Error clearing shuffle tracker:', error)
        alert('Failed to clear shuffle tracker')
        return
      }

      console.log('[SHUFFLE TRACKER] Cleared all shuffle tracking data')
      alert('Shuffle tracker cleared! All audio files will be available for shuffling again.')
    } catch (error) {
      console.error('Error clearing shuffle tracker:', error)
      alert('Failed to clear shuffle tracker')
    }
  }

  // Function to switch track type between Snare/Clap and Hi-Hat/Cymbal
  const handleSwitchTrackType = (trackId: number) => {
    setTracks(prev => prev.map(track => {
      if (track.id === trackId) {
        if (track.name === 'Snare') {
          return { ...track, name: 'Clap' }
        } else if (track.name === 'Clap') {
          return { ...track, name: 'Snare' }
        } else if (track.name === 'Hi-Hat') {
          return { ...track, name: 'Cymbal' }
        } else if (track.name === 'Cymbal') {
          return { ...track, name: 'Hi-Hat' }
        }
      }
      return track
    }))
  }

  // Function to duplicate a track as empty
  const handleDuplicateTrackEmpty = (trackId: number) => {
    const trackToDuplicate = tracks.find(t => t.id === trackId)
    if (!trackToDuplicate) return

    const newTrackId = Math.max(...tracks.map(t => t.id)) + 1
    const trackColors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500',
      'bg-yellow-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500',
      'bg-teal-500', 'bg-cyan-500', 'bg-lime-500', 'bg-rose-500'
    ]
    const colorIndex = (tracks.length) % trackColors.length

    const emptyTrack: Track = {
      id: newTrackId,
      name: trackToDuplicate.name,
      audioUrl: null, // Empty - no audio loaded
      color: trackColors[colorIndex]
    }

    // Find the index of the track being duplicated and insert the new track right after it
    const trackIndex = tracks.findIndex(t => t.id === trackId)
    setTracks(prev => {
      const newTracks = [...prev]
      newTracks.splice(trackIndex + 1, 0, emptyTrack)
      return newTracks
    })

    // Initialize sequencer data for the new track
    const stepPattern = new Array(steps).fill(false)
    stepPattern[0] = true // Activate first step
    setSequencerDataFromSession(prev => ({
      ...prev,
      [newTrackId]: stepPattern
    }))

    console.log(`Duplicated ${trackToDuplicate.name} as empty track`)
  }

  // Handle individual track genre change
  const handleTrackGenreChange = (trackId: number, genre: string, subgenre: string) => {
    setTracks(prev => prev.map(track => 
      track.id === trackId 
        ? { ...track, genre, subgenre }
        : track
    ))
  }


  
  const updateMasterEQ = (band: 'low' | 'mid' | 'high', value: number) => {
    console.log(`[MASTER EQ] Updating ${band} band to ${value}dB`)
    
    setMasterEQ(prev => ({
      ...prev,
      [band]: value
    }))
    
    // Apply master EQ to the master output
    // This should be applied to a master bus, but for now we'll apply it to the destination
    import('tone').then(Tone => {
      // Clean up existing master EQ chain
      if (window._masterEQChain) {
        window._masterEQChain.forEach((node: any) => {
          try {
            if (node && typeof node.disconnect === 'function') {
              node.disconnect()
            }
            if (node && typeof node.dispose === 'function') {
              node.dispose()
            }
          } catch (error) {
            console.warn('[MASTER EQ] Error disposing master EQ node:', error)
          }
        })
        window._masterEQChain = []
      }
      
      // Check if any master EQ settings are active
      const newMasterEQ = { ...masterEQ, [band]: value }
      const hasMasterEQ = newMasterEQ.low !== 0 || newMasterEQ.mid !== 0 || newMasterEQ.high !== 0
      
      if (hasMasterEQ) {
        // Create master EQ chain
        const masterEQChain = []
        
        // Low band - Low Shelf Filter
        if (newMasterEQ.low !== 0) {
          const lowShelf = new Tone.Filter({
            type: 'lowshelf',
            frequency: 200,
            gain: newMasterEQ.low
          })
          masterEQChain.push(lowShelf)
          console.log('[MASTER EQ] Created low shelf at 200Hz with gain:', newMasterEQ.low, 'dB')
        }
        
        // Mid band - Peaking Filter
        if (newMasterEQ.mid !== 0) {
          const midPeak = new Tone.Filter({
            type: 'peaking',
            frequency: 1000,
            Q: 1,
            gain: newMasterEQ.mid
          })
          masterEQChain.push(midPeak)
          console.log('[MASTER EQ] Created mid peak at 1kHz with gain:', newMasterEQ.mid, 'dB')
        }
        
        // High band - High Shelf Filter
        if (newMasterEQ.high !== 0) {
          const highShelf = new Tone.Filter({
            type: 'highshelf',
            frequency: 4000,
            gain: newMasterEQ.high
          })
          masterEQChain.push(highShelf)
          console.log('[MASTER EQ] Created high shelf at 4kHz with gain:', newMasterEQ.high, 'dB')
        }
        
        // Connect master EQ chain to destination
        if (masterEQChain.length > 0) {
          let currentNode = masterEQChain[0]
          for (let i = 1; i < masterEQChain.length; i++) {
            currentNode.connect(masterEQChain[i])
            currentNode = masterEQChain[i]
          }
          currentNode.toDestination()
          
          // Store the master EQ chain
          window._masterEQChain = masterEQChain
          console.log('[MASTER EQ] Applied master EQ chain with', masterEQChain.length, 'nodes')
        }
      } else {
        // No master EQ, ensure direct connection to destination
        window._masterEQChain = []
        console.log('[MASTER EQ] No master EQ settings, direct connection to destination')
      }
    }).catch(error => {
      console.error('[MASTER EQ] Failed to apply master EQ settings:', error)
    })
  }

  // Function to open save session dialog with cleared form
  const openSaveSessionDialog = () => {
    setSessionName('')
    setSessionDescription('')
    setSessionCategory('')
    setSessionTags('')
    setSessionStatus('draft')
    setShowSessionDialog(true)
  }





  // Note: True MP3 encoding requires additional libraries like lamejs
  // For now, we'll provide WAV files with different quality settings
  const createOptimizedWav = async (wavBlob: Blob, isHighQuality: boolean = false): Promise<Blob> => {
    try {
      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Convert blob to array buffer
      const arrayBuffer = await wavBlob.arrayBuffer()
      
      // Decode the audio data
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      
      // For now, return the original WAV but with appropriate MIME type
      // In a real implementation, you'd apply compression here
      return new Blob([arrayBuffer], { 
        type: isHighQuality ? 'audio/wav' : 'audio/wav' 
      })
    } catch (error) {
      console.error('[WAV OPTIMIZATION] Error optimizing WAV:', error)
      return wavBlob
    }
  }



  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Ortega AI Beat Maker</h1>
          <p className="text-gray-400 text-sm sm:text-base">Create beats with our professional tools</p>
          {currentSessionId && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="outline" className="text-green-500 border-green-500 text-xs">
                Session: {currentSessionName}
              </Badge>
              {hasUnsavedChanges && (
                <Badge variant="outline" className="text-orange-500 border-orange-500 text-xs">
                  Unsaved Changes
                </Badge>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          
          {/* AI Prompt Window */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAiPromptVisible(!isAiPromptVisible)}
              className="border-purple-400 text-purple-400 hover:bg-purple-400 hover:text-black"
            >
              <Brain className="w-4 h-4 mr-2" />
              AI Prompt
            </Button>
            
            {isAiPromptVisible && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-[#1a1a1a] border border-purple-400 rounded-lg shadow-lg z-50">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white text-sm font-semibold">AI Beat Generation</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsAiPromptVisible(false)}
                      className="text-gray-400 hover:text-white p-1 h-6 w-6"
                    >
                      ×
                    </Button>
                  </div>
                  <Textarea
                    value={aiPrompt}
                    onChange={(e) => {
                      const newValue = e.target.value
                      setAiPrompt(newValue)
                      
                      // Auto-trigger shuffle all when "make a beat" is typed
                      if (newValue.toLowerCase().includes('make a beat')) {
                        setTimeout(() => {
                          handleShuffleAll()
                          setIsAiPromptVisible(false)
                          setAiPrompt('')
                        }, 500) // Small delay to let user see the text
                      }
                      
                      // Auto-set genre to Trap when "make a trap beat" is typed
                      if (newValue.toLowerCase().includes('make a trap beat')) {
                        const trapGenre = genres.find(g => g.name.toLowerCase() === 'trap')
                        if (trapGenre) {
                          applyGenreSettings(trapGenre)
                        }
                        
                        // Automate the full trap beat creation process
                        setTimeout(() => {
                          automateTrapBeatCreation()
                        }, 1000) // Small delay to let genre settings apply
                      }
                    }}
                    placeholder="Describe the beat you want to create... (e.g., 'Dark trap beat with heavy 808s and atmospheric melodies')"
                    className="w-full h-20 bg-black border border-gray-600 text-white text-sm resize-none"
                  />
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (aiPrompt.trim()) {
                          handleShuffleAll()
                          setIsAiPromptVisible(false)
                        }
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white flex-1"
                      disabled={!aiPrompt.trim()}
                    >
                      Generate Beat
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAiPrompt('')}
                      className="border-gray-600 text-gray-400 hover:text-white"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* Genre Selector */}
          <div className="relative">
            <select
              value={selectedGenre?.id || ''}
              onChange={(e) => {
                if (e.target.value === 'create-new') {
                  setShowCreateGenreDialog(true)
                  return
                }
                const genre = genres.find(g => g.id === e.target.value)
                if (genre) {
                  applyGenreSettings(genre)
                }
              }}
              className="bg-black border border-yellow-400 text-white px-3 py-2 rounded pr-8"
            >
              <option value="">Select Genre</option>
              {genres.map((genre) => (
                <option key={genre.id} value={genre.id}>
                  {genre.name}
                </option>
              ))}
              <option value="create-new" className="text-green-400 font-semibold">
                ➕ New
              </option>
            </select>
          </div>
          
          {/* Subgenre Selector - Only show when genre is selected */}
          {selectedGenre && (
            <div className="relative">
              <select
                value={selectedSubgenre}
                onChange={(e) => handleSubgenreChange(e.target.value)}
                className="bg-black border border-blue-400 text-white px-3 py-2 rounded pr-8"
              >
                <option value="">All Subgenres</option>
                {availableSubgenres.map((subgenre) => (
                  <option key={subgenre} value={subgenre}>
                    {subgenre}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowGenreDialog(true)}
            className="border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black"
          >
            <Music className="w-4 h-4 mr-2" />
            Genres
          </Button>
          
          {/* Quick Session Update Button */}
          {currentSessionId && hasUnsavedChanges && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleUpdateSession}
              disabled={isSaving}
              className="border-green-400 text-green-400 hover:bg-green-400 hover:text-black"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                  Updating...
                </>
              ) : (
                <>
                  <Save className="w-3 h-3 mr-1" />
                  Update Session
                </>
              )}
            </Button>
          )}

          

        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} className="w-full" onValueChange={setActiveTab}>
        <div className="overflow-x-auto">
          <TabsList className="grid w-full grid-cols-5 bg-[#141414] border-gray-700 min-w-[600px] sm:min-w-0">
            <TabsTrigger value="sequencer" className="data-[state=active]:bg-[#2a2a2a] text-white text-xs sm:text-sm">
              <Disc className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Sequencer</span>
              <span className="sm:hidden">Seq</span>
            </TabsTrigger>
            <TabsTrigger value="song-arrangement" className="data-[state=active]:bg-[#2a2a2a] text-white text-xs sm:text-sm">
              <Music className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Song Arrangement</span>
              <span className="sm:hidden">Song</span>
            </TabsTrigger>
            <TabsTrigger value="mixer" className="data-[state=active]:bg-[#2a2a2a] text-white text-xs sm:text-sm">
              <Settings className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Mixer</span>
              <span className="sm:hidden">Mix</span>
            </TabsTrigger>
            <TabsTrigger value="record" className="data-[state=active]:bg-[#2a2a2a] text-white text-xs sm:text-sm">
              <Mic className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Record</span>
              <span className="sm:hidden">Rec</span>
            </TabsTrigger>
            <TabsTrigger value="sessions" className="data-[state=active]:bg-[#2a2a2a] text-white text-xs sm:text-sm">
              <List className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Sessions</span>
              <span className="sm:hidden">Sess</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Sequencer Tab */}
        <TabsContent value="sequencer" className="space-y-6 mt-6">

      {/* Transport Controls */}
      <Card className="!bg-[#141414] border-gray-700 relative">
        <CardHeader>
          <div className="flex items-center gap-3">
          <CardTitle className="text-white">Transport</CardTitle>
            <Badge 
              variant="outline" 
              className="text-xs px-2 py-1 bg-gray-800/50 border-gray-600 text-gray-300"
              title="Default mode - all features disabled"
            >
              Default Mode
            </Badge>
            {/* Playback System Indicator */}
            {(isPlaying || isArrangementPlaying) && (
              <Badge 
                variant="outline" 
                className={`text-xs px-2 py-1 ${
                  isPlaying 
                    ? 'bg-green-600/20 border-green-500 text-green-400' 
                    : 'bg-blue-600/20 border-blue-500 text-blue-400'
                }`}
                title={isPlaying ? "Sequencer is playing" : "Song Arrangement is playing"}
              >
                {isPlaying ? "Sequencer" : "Arrangement"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {/* Main Transport Controls Row */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              {/* Playback Controls */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          onClick={handlePlayPause}
                          variant={isPlaying ? "destructive" : "default"}
                          size="lg"
                          className="w-12 h-12 sm:w-16 sm:h-16 rounded-full"
                          disabled={!hasLoadedAudio}
                        >
                          {isPlaying ? <Square className="w-4 h-4 sm:w-6 sm:h-6" /> : <Play className="w-4 h-4 sm:w-6 sm:h-6" />}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {!hasLoadedAudio && (
                      <TooltipContent>
                        <span>Assign audio to at least one track to enable playback.</span>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button
                  onClick={handleShuffleAll}
                  variant="outline"
                  size="sm"
                  className="bg-black text-yellow-400 hover:text-yellow-300 hover:bg-gray-900 border-gray-600 flex-shrink-0"
                >
                  <Brain className="w-4 h-4 mr-1" />
                  AI
                </Button>
                <Button
                  onClick={handleClearAll}
                  variant="outline"
                  size="sm"
                  className="bg-red-900 text-red-400 hover:text-red-300 hover:bg-red-800 border-red-600 flex-shrink-0"
                  title="Clear all data and reset to fresh start"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Clear All</span>
                  <span className="sm:hidden">Clear</span>
                </Button>
                <Button
                  onClick={() => setIsAutoMode(!isAutoMode)}
                  variant="outline"
                  size="sm"
                  className={`flex-shrink-0 ${
                    isAutoMode 
                      ? 'bg-green-600 text-white hover:bg-green-700 border-green-500 shadow-lg shadow-green-500/30' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500'
                  }`}
                  title={isAutoMode ? "Strata mode is ON - Click to turn off" : "Strata mode is OFF - Click to turn on"}
                >
                  Strata
                </Button>
                <Button
                  onClick={() => setIsLatidoMode(!isLatidoMode)}
                  variant="outline"
                  size="sm"
                  className={`flex-shrink-0 ${
                    isLatidoMode 
                      ? 'bg-blue-600 text-white hover:bg-blue-700 border-blue-500 shadow-lg shadow-blue-500/30' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500'
                  }`}
                  title={isLatidoMode ? "Latido mode is ON - Click to turn off" : "Latido mode is OFF - Click to turn on"}
                >
                  Latido
                </Button>
                

                <Button
                  onClick={() => setIsHeliosMode(!isHeliosMode)}
                  variant="outline"
                  size="sm"
                  className={`flex-shrink-0 ${
                    isHeliosMode 
                      ? 'bg-yellow-600 text-white hover:bg-yellow-700 border-yellow-500 shadow-lg shadow-yellow-500/30' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500'
                  }`}
                  title={isHeliosMode ? "Helios mode is ON - Click to turn off" : "Helios mode is OFF - Click to turn on"}
                >
                  <div className="flex items-center gap-1">
                    <span className="hidden sm:inline">Helios</span>
                    <span className="sm:hidden">H</span>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                    </svg>
                  </div>
                </Button>
                
                {/* Always Visible: Reset Audio and Save Session */}
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleResetAllAudio}
                    variant="outline"
                    size="sm"
                    className="bg-red-600 text-white hover:bg-red-700 border-red-500"
                    title="Reset all audio samples - useful when tracks don't play properly"
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Reset Audio
                  </Button>
                  <div 
                    id="reset-countdown" 
                    className="text-xs font-mono text-yellow-400 bg-yellow-900/20 px-2 py-1 rounded border border-yellow-500/30"
                  ></div>
                </div>

                <Button
                  onClick={openSaveSessionDialog}
                  variant="outline"
                  size="sm"
                  className={`${
                    currentSessionId && hasUnsavedChanges 
                      ? 'bg-green-600 text-white hover:bg-green-700 border-green-500' 
                      : 'bg-blue-600 text-white hover:bg-blue-700 border-blue-500'
                  }`}
                  title={currentSessionId && hasUnsavedChanges ? "Update current session" : "Save current session"}
                >
                  <Save className="w-4 h-4 mr-1" />
                  {currentSessionId && hasUnsavedChanges ? 'Update Session' : 'Save Session'}
                </Button>

                {/* Advanced Settings Toggle */}
                <button
                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                  className="text-xs font-bold px-3 py-1 rounded-full transition-all duration-300 cursor-pointer hover:scale-105 text-gray-300 bg-gray-800/40 border border-gray-600/60 flex items-center gap-1"
                  title={`Advanced Settings: ${showAdvancedSettings ? 'HIDE' : 'SHOW'}`}
                >
                  <Settings className="w-3 h-3" />
                  {showAdvancedSettings ? 'Hide Advanced' : 'Show Advanced'}
                </button>

                {/* Advanced Settings Section */}
                {showAdvancedSettings && (
                  <>
                    {/* ±10 BPM Tolerance Indicator */}
                    <button
                      onClick={() => setIsBpmToleranceEnabled(!isBpmToleranceEnabled)}
                      className={`text-xs font-bold px-2 py-1 rounded-full transition-all duration-300 cursor-pointer hover:scale-105 ${
                        isBpmToleranceEnabled 
                          ? 'text-yellow-300 bg-yellow-900/40 border border-yellow-500/60 shadow-lg shadow-yellow-500/30' 
                          : 'text-gray-400 bg-gray-800/40 border border-gray-600/60'
                      }`}
                      title={`±10 BPM tolerance: ${isBpmToleranceEnabled ? 'ON' : 'OFF'} - Click to toggle`}
                    >
                      ±10
                    </button>
                
                {/* Time Stretch Mode Toggle (RM/FT) */}
                <button
                  onClick={() => {
                    const newMode = timeStretchMode === 'resampling' ? 'flex-time' : 'resampling'
                    setTimeStretchMode(newMode)
                    console.log(`[TIME STRETCH] Mode changed to: ${newMode}`)
                    
                    // Auto-reload will handle the audio reload automatically via useEffect
                    console.log(`[TIME STRETCH] Mode changed to ${newMode} - auto-reload will handle audio reload`)
                  }}
                  className={`text-xs font-bold px-2 py-1 rounded-full transition-all duration-300 cursor-pointer hover:scale-105 ${
                    timeStretchMode === 'resampling'
                      ? 'text-orange-300 bg-orange-900/40 border border-orange-500/60 shadow-lg shadow-orange-500/30' 
                      : 'text-blue-300 bg-blue-900/40 border border-blue-500/60 shadow-lg shadow-blue-500/30'
                  }`}
                  title={`Time stretch mode: ${timeStretchMode === 'resampling' ? 'RM (Resampling - changes pitch & speed)' : 'FT (Flex Time - changes speed only)'} - Click to toggle`}
                >
                  {timeStretchMode === 'resampling' ? 'RM' : 'FT'}
                </button>

                {/* Format System Toggle */}
                <button
                  onClick={() => {
                    const newState = !formatSystemEnabled
                    setFormatSystemEnabled(newState)
                    console.log(`[FORMAT SYSTEM] ${newState ? 'ENABLED' : 'DISABLED'}`)
                    
                    toast({
                      title: `Format system ${newState ? 'enabled' : 'disabled'}`,
                      description: newState ? 'Using MP3/WAV conversion system' : 'Loading files directly from audio library',
                    })
                  }}
                  className={`text-xs font-bold px-2 py-1 rounded-full transition-all duration-300 cursor-pointer hover:scale-105 ${
                    formatSystemEnabled
                      ? 'text-purple-300 bg-purple-900/40 border border-purple-500/60 shadow-lg shadow-purple-500/30' 
                      : 'text-gray-300 bg-gray-900/40 border border-gray-500/60 shadow-lg shadow-gray-500/30'
                  }`}
                  title={`Format system: ${formatSystemEnabled ? 'ENABLED (MP3/WAV conversion)' : 'DISABLED (direct loading)'} - Click to toggle`}
                >
                  {formatSystemEnabled ? 'FORMAT ON' : 'FORMAT OFF'}
                </button>

                

                {/* Format Toggle (WAV/MP3) - Only show when format system is enabled */}
                {formatSystemEnabled && (
                  <button
                    onClick={() => {
                      const newFormat = preferMp3 ? false : true
                      setPreferMp3(newFormat)
                      console.log(`[FORMAT TOGGLE] Changed to: ${newFormat ? 'MP3' : 'WAV'}`)
                      console.log(`[FORMAT TOGGLE] Current file links:`, fileLinks.length)
                      console.log(`[FORMAT TOGGLE] Current tracks:`, tracks.filter(t => t.audioUrl).map(t => ({
                        name: t.name,
                        audioFileId: t.audioFileId,
                        audioUrl: t.audioUrl?.substring(0, 50) + '...'
                      })))
                      
                      // Force refetch file links to ensure we have the latest data
                      setTimeout(() => {
                        fetchFileLinks()
                      }, 100)
                      
                      toast({
                        title: `Format changed to ${newFormat ? 'MP3' : 'WAV'}`,
                        description: `Audio files will now load as ${newFormat ? 'compressed MP3' : 'high quality WAV'} format.`,
                      })
                    }}
                    className={`text-xs font-bold px-2 py-1 rounded-full transition-all duration-300 cursor-pointer hover:scale-105 ${
                      preferMp3
                        ? 'text-green-300 bg-green-900/40 border border-green-500/60 shadow-lg shadow-green-500/30' 
                        : 'text-blue-300 bg-blue-900/40 border border-blue-500/60 shadow-lg shadow-blue-500/30'
                    }`}
                    title={`Audio format: ${preferMp3 ? 'MP3 (compressed)' : 'WAV (high quality)'} - Click to toggle`}
                  >
                    {preferMp3 ? 'MP3' : 'WAV'}
                  </button>
                )}

                {/* Query Limit Toggle */}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400">Limit:</span>
                  <select
                    value={queryLimit}
                    onChange={(e) => {
                      const newLimit = parseInt(e.target.value)
                      setQueryLimit(newLimit)
                      console.log(`[QUERY LIMIT] Changed to: ${newLimit}`)
                      
                      // Force refresh with new limit
                      setTimeout(() => {
                        fetchFileLinks()
                        fetchTotalAudioItems()
                      }, 100)
                      
                      toast({
                        title: `Query limit changed to ${newLimit}`,
                        description: `Database queries will now fetch up to ${newLimit} records.`,
                      })
                    }}
                    className="text-xs bg-gray-800 border border-gray-600 text-white rounded px-2 py-1 focus:outline-none focus:border-blue-500"
                  >
                    <option value={100}>100</option>
                    <option value={500}>500</option>
                    <option value={1000}>1K</option>
                    <option value={5000}>5K</option>
                  </select>
                </div>


                <Button
                  onClick={handleClearShuffleTracker}
                  variant="outline"
                  size="sm"
                  disabled={!isShuffleTrackerEnabled}
                  className={`${
                    isShuffleTrackerEnabled 
                      ? 'bg-purple-600 text-white hover:bg-purple-700 border-purple-500' 
                      : 'bg-gray-600 text-gray-400 border-gray-500 opacity-50 cursor-not-allowed'
                  }`}
                  title={isShuffleTrackerEnabled ? "Clear shuffle tracker - reset which audio files have been used" : "Shuffle tracker is disabled"}
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Clear Tracker
                </Button>



                {/* Melody Loop Mode Toggle (T→M/M→T) */}
                <button
                  onClick={() => {
                    const newMode = melodyLoopMode === 'transport-dominates' ? 'melody-dominates' : 'transport-dominates'
                    setMelodyLoopMode(newMode)
                    console.log(`[MELODY LOOP MODE] Changed to: ${newMode} (${newMode === 'transport-dominates' ? 'T→M' : 'M→T'})`)
                  }}
                  className={`text-xs font-bold px-2 py-1 rounded-full transition-all duration-300 cursor-pointer hover:scale-105 ${
                    melodyLoopMode === 'transport-dominates'
                      ? 'text-blue-300 bg-blue-900/40 border border-blue-500/60 shadow-lg shadow-blue-500/30' 
                      : 'text-purple-300 bg-purple-900/40 border border-purple-500/60 shadow-lg shadow-purple-500/30'
                  }`}
                  title={`Melody Loop Mode: ${melodyLoopMode === 'transport-dominates' ? 'Transport dominates (T→M)' : 'Melody Loop dominates (M→T)'} - Click to toggle`}
                >
                  {melodyLoopMode === 'transport-dominates' ? 'T→M' : 'M→T'}
                </button>

                {/* Ready Check Controls */}
                <div className="flex items-center gap-2">
                  <span 
                    className={`text-sm cursor-pointer transition-colors px-2 py-1 rounded-full ${
                      isReadyCheckLocked 
                        ? 'bg-yellow-400 text-black hover:bg-yellow-300' 
                        : 'text-white hover:text-yellow-400 hover:bg-yellow-400/20'
                    }`}
                    onClick={() => setIsReadyCheckLocked(!isReadyCheckLocked)}
                    title={isReadyCheckLocked ? "Click to unlock Ready Check" : "Click to lock Ready Check"}
                  >
                    Ready Check:
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={isReadyCheckEnabled ? "default" : "outline"}
                      size="sm"
                      onClick={() => !isReadyCheckLocked && setIsReadyCheckEnabled(!isReadyCheckEnabled)}
                      disabled={isReadyCheckLocked}
                      className={`${
                        isReadyCheckEnabled 
                          ? 'bg-green-600 text-white hover:bg-green-700 border-green-500' 
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500'
                      } ${
                        isReadyCheckLocked ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      title={isReadyCheckLocked ? "Ready Check is locked" : (isReadyCheckEnabled ? "Ready Check is ON - Click to turn OFF" : "Ready Check is OFF - Click to turn ON")}
                    >
                      {isReadyCheckEnabled ? 'ON' : 'OFF'}
                    </Button>
                    <Badge 
                      variant="secondary" 
                      className={`min-w-[40px] text-center ${
                        isReadyCheckLocked ? 'bg-yellow-400/20 border-yellow-400' : ''
                      }`}
                    >
                      {isReadyCheckLocked ? '🔒' : '🔓'}
                    </Badge>
                    {isReadyCheckEnabled && (
                      <Badge 
                        variant="secondary" 
                        className="min-w-[60px] text-center bg-green-400/20 border-green-400 text-green-300 text-xs"
                        title="Only ready files will be loaded"
                      >
                        Ready Only
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Shuffle Tracker Controls */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white">
                    Shuffle Tracker:
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={isShuffleTrackerEnabled ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIsShuffleTrackerEnabled(!isShuffleTrackerEnabled)}
                      className={`${
                        isShuffleTrackerEnabled 
                          ? 'bg-blue-600 text-white hover:bg-blue-700 border-blue-500' 
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500'
                      }`}
                      title={isShuffleTrackerEnabled ? "Shuffle Tracker is ON - tracks which files have been used to ensure variety" : "Shuffle Tracker is OFF - random selection without tracking"}
                    >
                      {isShuffleTrackerEnabled ? 'ON' : 'OFF'}
                    </Button>
                    {isShuffleTrackerEnabled && (
                      <Badge 
                        variant="secondary" 
                        className="min-w-[60px] text-center bg-blue-400/20 border-blue-400 text-blue-300 text-xs"
                        title="Tracks which files have been used to ensure variety"
                      >
                        Tracking
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Shuffle Limit Controls */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white">
                    Shuffle Limit:
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={isShuffleLimitEnabled ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIsShuffleLimitEnabled(!isShuffleLimitEnabled)}
                      className={`${
                        isShuffleLimitEnabled 
                          ? 'bg-green-600 text-white hover:bg-green-700 border-green-500' 
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500'
                      }`}
                      title={isShuffleLimitEnabled ? "Shuffle Limit is ON - limits to 10 files for faster loading" : "Shuffle Limit is OFF - loads all available files"}
                    >
                      {isShuffleLimitEnabled ? 'ON' : 'OFF'}
                    </Button>
                    {isShuffleLimitEnabled && (
                      <Badge 
                        variant="secondary" 
                        className="min-w-[60px] text-center bg-green-400/20 border-green-400 text-green-300 text-xs"
                        title="Limits shuffle to 10 files for faster loading"
                      >
                        Limited
                      </Badge>
                    )}
                  </div>
                </div>

                {/* BPM Range Controls for Shuffle All */}
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm">Range:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={bpmRange[0]}
                      onChange={(e) => {
                        const newMin = parseInt(e.target.value)
                        if (newMin >= 60 && newMin <= bpmRange[1]) {
                          setBpmRange([newMin, bpmRange[1]])
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          e.currentTarget.blur()
                        }
                      }}
                      min="60"
                      max={bpmRange[1]}
                      className="w-12 h-8 text-center text-sm bg-[#1a1a1a] border border-gray-600 text-white rounded px-1 hover:border-gray-500 focus:border-blue-500 focus:outline-none"
                    />
                    <span className="text-white text-sm">-</span>
                    <input
                      type="number"
                      value={bpmRange[1]}
                      onChange={(e) => {
                        const newMax = parseInt(e.target.value)
                        if (newMax >= bpmRange[0] && newMax <= 200) {
                          setBpmRange([bpmRange[0], newMax])
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          e.currentTarget.blur()
                        }
                      }}
                      min={bpmRange[0]}
                      max="200"
                      className="w-12 h-8 text-center text-sm bg-[#1a1a1a] border border-gray-600 text-white rounded px-1 hover:border-gray-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
                
                {/* Genre & Subgenre Display */}
                {(selectedGenre || selectedSubgenre) && (
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm">Style:</span>
                    <div className="flex items-center gap-1">
                      {selectedGenre && (
                        <div className="flex items-center gap-1">
                          <Badge 
                            variant="secondary" 
                            className="bg-purple-100 text-purple-800 border-purple-300 text-xs cursor-pointer hover:opacity-80 transition-opacity"
                            style={{ backgroundColor: selectedGenre.color + '20', borderColor: selectedGenre.color }}
                            onClick={() => setShowGenreDialog(true)}
                            title="Click to change genre"
                          >
                            {selectedGenre.name}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleToggleGenreLock}
                            className={`w-6 h-6 p-0 ${
                              isGenreLocked 
                                ? 'text-yellow-400 hover:text-yellow-300' 
                                : 'text-gray-400 hover:text-gray-300'
                            }`}
                            title={isGenreLocked ? "Unlock genre (will shuffle)" : "Lock genre (won't shuffle)"}
                          >
                            {isGenreLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                          </Button>
                        </div>
                      )}
                      {selectedSubgenre && (
                        <div className="flex items-center gap-1">
                          <Badge 
                            variant="secondary" 
                            className="bg-blue-100 text-blue-800 border-blue-300 text-xs"
                          >
                            {selectedSubgenre}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleToggleSubgenreLock}
                            className={`w-6 h-6 p-0 ${
                              isSubgenreLocked 
                                ? 'text-yellow-400 hover:text-yellow-300' 
                                : 'text-gray-400 hover:text-gray-300'
                            }`}
                            title={isSubgenreLocked ? "Unlock subgenre (will shuffle)" : "Lock subgenre (won't shuffle)"}
                          >
                            {isSubgenreLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                  </>
                )}
              </div>

              {/* BPM Controls */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span 
                  className={`text-sm cursor-pointer transition-colors px-2 py-1 rounded-full ${
                    isBpmLocked 
                      ? 'bg-yellow-400 text-black hover:bg-yellow-300' 
                      : 'text-white hover:text-yellow-400 hover:bg-yellow-400/20'
                  }`}
                  onClick={() => setIsBpmLocked(!isBpmLocked)}
                  title={isBpmLocked ? "Click to unlock BPM" : "Click to lock BPM"}
                >
                  BPM:
                </span>
                {editingBpm ? (
                  <Input
                    type="number"
                    value={bpmInputValue}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBpmInputValue(e.target.value)}
                    onBlur={handleBpmSave}
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === 'Enter') {
                        handleBpmSave()
                      } else if (e.key === 'Escape') {
                        handleBpmCancel()
                      }
                    }}
                    min="60"
                    max="200"
                    className="w-16 h-8 text-center text-sm"
                    autoFocus
                  />
                ) : (
                                  <Badge 
                  variant="secondary" 
                  className={`min-w-[60px] text-center cursor-pointer hover:bg-gray-600 transition-colors ${
                    isBpmLocked ? 'bg-yellow-400/20 border-yellow-400' : ''
                  } ${
                    // Add yellow outline when in T-M mode (Transport dominates)
                    // In M-T mode, transport should NOT have yellow outline since Melody Loop controls it
                    melodyLoopMode === 'transport-dominates' ? 'ring-2 ring-yellow-400 border-yellow-400 bg-yellow-400/10' : ''
                  }`}
                    onClick={handleBpmEdit}
                    title="Click to edit BPM (or click 'BPM' label to lock/unlock)"
                  >
                    {bpm}
                  </Badge>
                )}
                <div className={`w-24 ${
                  // Add yellow outline when in T-M mode (Transport dominates)
                  // In M-T mode, transport should NOT have yellow outline since Melody Loop controls it
                  melodyLoopMode === 'transport-dominates' ? 'ring-2 ring-yellow-400 rounded p-1 bg-yellow-400/10' : ''
                }`}>
                  <Slider
                    value={[bpm]}
                    onValueChange={(value) => handleBpmChange(value[0])}
                    min={60}
                    max={200}
                    step={1}
                    className="w-full"
                    disabled={isBpmLocked}
                  />
                </div>
              </div>
              
              {/* Key Controls */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span 
                  className={`text-sm cursor-pointer transition-colors px-2 py-1 rounded-full ${
                    isKeyLocked 
                      ? 'bg-yellow-400 text-black hover:bg-yellow-300' 
                      : 'text-white hover:text-yellow-400 hover:bg-yellow-400/20'
                  }`}
                  onClick={() => setIsKeyLocked(!isKeyLocked)}
                  title={isKeyLocked ? "Click to unlock Key" : "Click to lock Key"}
                >
                  Key:
                </span>
                {editingTransportKey ? (
                  <div className="flex items-center gap-1">
                    <select
                      value={transportKeyInputValue}
                      onChange={(e) => handleTransportKeySelect(e.target.value)}
                      onBlur={handleTransportKeyCancel}
                      className="w-16 h-8 text-center text-sm bg-[#1a1a1a] border border-gray-600 rounded text-white"
                      autoFocus
                    >
                      <option value="C">C</option>
                      <option value="C#">C#</option>
                      <option value="Db">Db</option>
                      <option value="D">D</option>
                      <option value="D#">D#</option>
                      <option value="Eb">Eb</option>
                      <option value="E">E</option>
                      <option value="F">F</option>
                      <option value="F#">F#</option>
                      <option value="Gb">Gb</option>
                      <option value="G">G</option>
                      <option value="G#">G#</option>
                      <option value="Ab">Ab</option>
                      <option value="A">A</option>
                      <option value="A#">A#</option>
                      <option value="Bb">Bb</option>
                      <option value="B">B</option>
                    </select>
                  </div>
                ) : (
                  <Badge 
                    variant="secondary" 
                    className={`min-w-[40px] text-center cursor-pointer hover:bg-gray-600 hover:scale-105 transition-all duration-200 ${
                      isKeyLocked ? 'bg-yellow-400/20 border-yellow-400' : ''
                    } ${
                      // Add yellow outline when in T-M mode (Transport dominates)
                      // In M-T mode, transport should NOT have yellow outline since Melody Loop controls it
                      melodyLoopMode === 'transport-dominates' ? 'ring-2 ring-yellow-400 border-yellow-400 bg-yellow-400/10' : ''
                    }`}
                    onClick={handleTransportKeyEdit}
                    title="Click to edit transport key (or click 'Key' label to lock/unlock)"
                  >
                    {transportKey}
                  </Badge>
                )}
              </div>

              {/* Pitch Shifter Controls */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-sm text-white">
                  Pitch:
                </span>
                <Badge 
                  variant="secondary" 
                  className={`min-w-[50px] text-center border-purple-500 text-purple-300 transition-colors ${
                    isPitchShifting ? 'bg-purple-500/40 animate-pulse' : 'bg-purple-600/20'
                  }`}
                  title={`Pitch shift: ${pitchShift > 0 ? '+' : ''}${pitchShift} semitones`}
                >
                  {pitchShift > 0 ? '+' : ''}{pitchShift}
                </Badge>
                <div className="w-32">
                  <Slider
                    value={[pitchShift]}
                    onValueChange={(value) => handlePitchShiftChange(value[0])}
                    min={-12}
                    max={12}
                    step={1}
                    className="w-full"
                    title="Adjust overall pitch (affects key automatically)"
                  />
                </div>
                {/* Quality Selector */}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400">Q:</span>
                  <select
                    value={pitchQuality}
                    onChange={(e) => handlePitchQualityChange(e.target.value as 'standard' | 'high' | 'ultra')}
                    className="text-xs bg-[#1a1a1a] border border-gray-600 rounded px-1 py-0.5 text-white"
                    title="Pitch shifter quality (higher = better quality, more CPU)"
                  >
                    <option value="standard">Std</option>
                    <option value="high">High</option>
                    <option value="ultra">Ultra</option>
                  </select>
                </div>
                {/* Pitch Shifting Indicator */}
                {isPitchShifting && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                    <span className="text-xs text-purple-300">Processing...</span>
                  </div>
                )}
              </div>
              


              {/* Pack Display */}
              <div className="flex items-center gap-2">
                <span className="text-white text-sm">Packs:</span>
                {selectedPacks.length > 0 ? (
                  <div className="flex items-center gap-1 flex-wrap">
                    {selectedPacks.map((pack) => (
                    <Badge 
                        key={pack.id}
                      variant="secondary" 
                      className="bg-green-100 text-green-800 border-green-300 text-xs cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setShowPackDialog(true)}
                        title="Click to change packs"
                    >
                        {pack.name}
                    </Badge>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleTogglePackLock}
                      className={`w-6 h-6 p-0 ${
                        isPackLocked 
                          ? 'text-yellow-400 hover:text-yellow-300' 
                          : 'text-gray-400 hover:text-gray-300'
                      }`}
                      title={isPackLocked ? "Unlock packs (will shuffle)" : "Lock packs (won't shuffle)"}
                    >
                      {isPackLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPackDialog(true)}
                    className="text-green-400 border-green-400 hover:bg-green-400 hover:text-black"
                  >
                    Select Packs
                  </Button>
                )}
              </div>
            </div>

            {/* Secondary Controls Row */}
            <div className="flex items-center gap-4 flex-wrap">
              {/* Bars Controls */}
              <div className="flex items-center gap-2">
                <span className="text-white text-sm">Bars:</span>
                <div className="flex gap-1">
                  {[2, 4, 8, 16].map((barCount) => {
                    const stepCount = barCount * 16; // Convert bars to steps (16 steps per bar for 1/16 resolution)
                    return (
                      <Button
                        key={stepCount}
                        variant={steps === stepCount ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSteps(stepCount)}
                        className="w-8 h-8 p-0"
                      >
                        {barCount}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Layout Controls */}
              <div className="flex items-center gap-2">
                <span className="text-white text-sm">Layout:</span>
                <div className="flex gap-1">
                  <Button
                    variant={layoutMode === 'default' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setLayoutMode('default')}
                    className="px-2 py-1 text-xs"
                    title="Default layout (1:3 ratio)"
                  >
                    Default
                  </Button>
                  <Button
                    variant={layoutMode === 'vertical' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setLayoutMode('vertical')}
                    className="px-2 py-1 text-xs"
                    title="Vertical stack layout"
                  >
                    Vertical
                  </Button>
                  <Button
                    variant={layoutMode === 'horizontal' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setLayoutMode('horizontal')}
                    className="px-2 py-1 text-xs"
                    title="Horizontal layout (equal width)"
                  >
                    Horizontal
                  </Button>
                </div>
              </div>


            </div>
          </div>
        </CardContent>
      </Card>

      <div className={
        layoutMode === 'default' 
          ? "grid grid-cols-1 lg:grid-cols-4 gap-6"
          : layoutMode === 'vertical'
          ? "flex flex-col gap-6"
          : "grid grid-cols-1 lg:grid-cols-2 gap-6"
      }>
        {/* Track List */}
        <div className={
          layoutMode === 'default' 
            ? "lg:col-span-1"
            : layoutMode === 'vertical'
            ? "w-full"
            : "lg:col-span-1"
        }>
          <TrackList
            tracks={tracks}
            onTrackAudioSelect={handleOpenSampleLibrary}
            currentStep={currentStep}
            sequencerData={sequencerData}
            onAddTrack={addNewTrack}
            onRemoveTrack={removeTrack}
            onReorderTracks={reorderTracks}
            onDirectAudioDrop={handleDirectAudioDrop}
            onCreateCustomSampleTrack={handleCreateCustomSampleTrack}
            onEditTrack={openEditTrackModal}
            onTrackTempoChange={handleTrackTempoChange}
            onTrackPitchChange={handleTrackPitchChange}
            onShuffleAudio={handleShuffleAudio}
            onShuffleAllAudio={handleShuffleAllAudio}
            onDuplicateWithShuffle={handleDuplicateWithShuffle}
            onCopyTrackKey={handleCopyTrackKey}
            onCopyTrackBpm={handleCopyTrackBpm}
            onOpenPianoRoll={handleOpenPianoRoll}
            onTrackStockSoundSelect={handleTrackStockSoundSelect}
            onSetTransportBpm={setBpm}
            onSetTransportKey={setTransportKey}
            onToggleTrackLock={handleToggleTrackLock}
            onToggleTrackMute={handleToggleTrackMute}
            onQuantizeLoop={openQuantizeModal}
            onSwitchTrackType={handleSwitchTrackType}
            onDuplicateTrackEmpty={handleDuplicateTrackEmpty}
            onTrackGenreChange={handleTrackGenreChange}
            transportKey={transportKey}
            melodyLoopMode={melodyLoopMode}
            preferMp3={formatSystemEnabled ? preferMp3 : false}
            fileLinks={fileLinks}
            genres={genres}
            genreSubgenres={genreSubgenres}
            onTrackAudioUrlChange={handleTrackAudioUrlChange}
            mixerSettings={mixerSettings}
            onVolumeChange={(trackId, volume) => updateMixerSetting(trackId, 'volume', volume)}
          />
        </div>

        {/* Sequencer Grid */}
        <div className={
          layoutMode === 'default' 
            ? "lg:col-span-3"
            : layoutMode === 'vertical'
            ? "w-full"
            : "lg:col-span-1"
        }>
          <SequencerGrid
            tracks={tracks}
            steps={steps}
            sequencerData={sequencerData}
            pianoRollData={pianoRollData}
                            onToggleStep={handleToggleStep}
            currentStep={currentStep}
            bpm={bpm}
            onSavePattern={handleSavePattern}
            onSaveTrackPattern={openSaveTrackPatternDialog}
            onSaveAllPatterns={handleSaveAllPatterns}
            onLoadPattern={handleLoadPattern}
            onLoadTrackPattern={handleLoadTrackPattern}
            onClearAllPatterns={clearAllPatterns}
            onClearTrackPattern={clearTrackPattern}
            onToggleTrackMute={toggleTrackMute}
            trackMuteStates={Object.fromEntries(
              tracks.map(track => [track.id, mixerSettings[track.id]?.mute || false])
            )}
            onOpenTrackPianoRoll={handleOpenTrackPianoRoll}
            onShuffleTrack={handleShuffleAudio}
            onShuffleTrackPattern={handleShuffleTrackPattern}
            onShuffleAllPatterns={handleShuffleAllPatterns}
            genres={genres}
            subgenres={subgenres}
            onGenreChange={loadSubgenres}
            showWaveforms={showWaveforms}
            onToggleWaveforms={() => setShowWaveforms(!showWaveforms)}


            onGridDivisionChange={setGridDivision}
            onQuantizeSequencerData={(trackId, quantizedData) => {
              // Use the hook's setSequencerDataFromSession function instead
              setSequencerDataFromSession(prev => ({
                ...prev,
                [trackId]: quantizedData
              }))
            }}
            onNavigateToSongArrangement={() => setActiveTab('song-arrangement')}
          />
        </div>
      </div>

      {/* Sample Library Modal */}
      {showSampleLibrary && selectedTrack && (
        <SampleLibrary
          isOpen={showSampleLibrary}
          onClose={() => setShowSampleLibrary(false)}
          onSelectAudio={(audioUrl, audioName, metadata) => handleTrackAudioSelect(selectedTrack, audioUrl, audioName, metadata)}
          preferMp3={formatSystemEnabled ? preferMp3 : false} // Only use format preference if system is enabled
          onToggleFormat={setPreferMp3} // Use transport format setter
        />
      )}

      {/* Piano Roll Modal */}
      {showPianoRoll && pianoRollTrack && (
        <PianoRoll
          isOpen={showPianoRoll}
          onClose={() => setShowPianoRoll(false)}
          steps={steps}
          bpm={bpm}
          onNotesChange={(notes) => handlePianoRollNotesChange(pianoRollTrack, notes)}
          initialNotes={tracks.find(t => t.id === pianoRollTrack)?.midiNotes || []}
        />
      )}



      {/* Track Piano Roll Modal */}
      {showTrackPianoRoll && trackPianoRollTrack && (
        <TrackPianoRoll
          isOpen={showTrackPianoRoll}
          onClose={handleCloseTrackPianoRoll}
          steps={steps}
          bpm={bpm}
          track={trackPianoRollTrack}
          onNotesChange={handleTrackPianoRollNotesChange}
          initialNotes={trackPianoRollNotes}
          onSavePattern={handleSavePattern}
        />
      )}
        </TabsContent>

        {/* Song Arrangement Tab */}
        <TabsContent value="song-arrangement" className="space-y-6 mt-6">
          <SongArrangement
            tracks={tracks}
            sequencerData={sequencerData}
            bpm={bpm}
            steps={steps}
            onPlayPattern={(patternData) => {
              // The song arrangement now has its own audio system
              // This callback is kept for compatibility but not used
              console.log('[BEAT MAKER] Song arrangement pattern play requested')
            }}
            onStopPattern={() => {
              // The song arrangement now has its own audio system
              // This callback is kept for compatibility but not used
              console.log('[BEAT MAKER] Song arrangement pattern stop requested')
            }}
            isPlaying={isPlaying}
            patterns={songArrangementPatterns}
            onPatternsChange={handleSongArrangementPatternsChange}
            onArrangementPlayStateChange={(isPlaying) => {
              console.log('[BEAT MAKER] Song arrangement play state changed:', isPlaying)
              
              // If arrangement is starting to play, stop the sequencer
              if (isPlaying) {
                console.log('[BEAT MAKER] Stopping sequencer because arrangement is starting')
                stopSequence()
              }
              
              setIsArrangementPlaying(isPlaying)
            }}
            mixerSettings={mixerSettings}
            masterVolume={masterVolume}
            currentSessionId={currentSessionId}
          />
        </TabsContent>

        {/* Mixer Tab */}
        <TabsContent value="mixer" className="space-y-6 mt-6">
          <Card className="!bg-[#141414] border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Mixing Console</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex gap-4 overflow-x-auto">
                {tracks.map((track) => {
                  const settings = mixerSettings[track.id] || {
                    volume: 0.7, pan: 0, mute: false,
                    eq: { low: 0, mid: 0, high: 0 },
                    effects: { reverb: 0, delay: 0 }
                  }
                  
                  return (
                    <div key={track.id} className="flex-shrink-0 w-24 bg-[#1a1a1a] rounded-lg border border-gray-600 p-3">
                      {/* Track Header */}
                      <div className="text-center mb-4">
                        <div className={`w-4 h-4 rounded-full ${track.color} mx-auto mb-1 ${
                          isPlaying && sequencerData[track.id]?.[currentStep] ? 'animate-pulse' : ''
                        }`}></div>
                        <div className="text-white text-xs font-medium truncate">{getTrackDisplayName(track.name)}</div>
                        <div className={`text-xs ${
                          !track.audioUrl ? 'text-gray-500' :
                          isPlaying && sequencerData[track.id]?.[currentStep] ? 'text-green-500' :
                          'text-gray-400'
                        }`}>
                          {!track.audioUrl ? 'EMPTY' :
                           isPlaying && sequencerData[track.id]?.[currentStep] ? 'ACTIVE' : 'LOADED'}
                        </div>
                        
                        {/* EQ Button - positioned below track name */}
                        <div className="mt-2">
                          <Button
                            size="sm"
                            variant={settings.eq && (settings.eq.low !== 0 || settings.eq.mid !== 0 || settings.eq.high !== 0) ? "default" : "outline"}
                            onClick={() => console.log('EQ functionality removed')}
                            className={`w-full h-6 text-xs ${
                              settings.eq && (settings.eq.low !== 0 || settings.eq.mid !== 0 || settings.eq.high !== 0)
                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                : 'border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white'
                            }`}
                            title={`Open EQ for ${getTrackDisplayName(track.name)} (current: Low ${settings.eq?.low || 0}dB, Mid ${settings.eq?.mid || 0}dB, High ${settings.eq?.high || 0}dB)`}
                          >
                            {settings.eq && (settings.eq.low !== 0 || settings.eq.mid !== 0 || settings.eq.high !== 0) 
                              ? `EQ (${settings.eq.low}/${settings.eq.mid}/${settings.eq.high})` 
                              : 'EQ'
                            }
                          </Button>
                        </div>
                      </div>







                      {/* Pan Control */}
                      <div className="mb-4">
                        <div className="text-gray-400 text-xs mb-1 text-center">PAN</div>
                        <Slider
                          value={[settings.pan]}
                          onValueChange={(value) => updateMixerSetting(track.id, 'pan', value[0])}
                          min={-100}
                          max={100}
                          step={1}
                          className="mb-1"
                        />
                        <div className="text-gray-500 text-xs text-center">
                          {settings.pan === 0 ? 'C' : settings.pan > 0 ? `R${settings.pan}` : `L${Math.abs(settings.pan)}`}
                        </div>
                      </div>

                      {/* Mute Button */}
                      <div className="mb-4 space-y-1">
                        <Button
                          size="sm"
                          variant={settings.mute ? "destructive" : "outline"}
                          className="w-full h-6 text-xs"
                          onClick={() => updateMixerSetting(track.id, 'mute', !settings.mute)}
                        >
                          MUTE
                        </Button>
                      </div>

                      {/* Volume Fader */}
                      <div className="mb-2">
                        <div className="text-gray-400 text-xs mb-2 text-center">VOLUME</div>
                        <div className="flex justify-center">
                          <Fader
                            value={settings.volume}
                            onValueChange={(value) => updateMixerSetting(track.id, 'volume', value)}
                            min={0}
                            max={1}
                            step={0.01}
                            height={128}
                            level={audioLevels[track.id] || 0}
                            peak={peakLevels[track.id] || 0}
                          />
                        </div>
                      </div>


                    </div>
                  )
                })}
                
                {/* Master Channel */}
                <div className="flex-shrink-0 w-24 bg-[#2a1a1a] rounded-lg border border-red-600 p-3">
                  <div className="text-center mb-4">
                    <div className="w-4 h-4 rounded-full bg-red-500 mx-auto mb-1"></div>
                    <div className="text-white text-xs font-medium">MASTER</div>
                    <div className="text-gray-500 text-xs">OUT</div>
                  </div>





                  {/* Master Volume */}
                  <div className="mb-2">
                    <div className="text-gray-400 text-xs mb-2 text-center">MASTER</div>
                    <div className="flex justify-center">
                      <Fader
                        value={masterVolume}
                        onValueChange={handleMasterVolumeChange}
                        min={0}
                        max={1}
                        step={0.01}
                        height={128}
                        level={masterLevel}
                        peak={masterPeak}
                      />
                    </div>
                  </div>
                  
                  {/* Master EQ Button */}
                  <div className="mb-2">
                    <Button
                      size="sm"
                      variant={masterEQ.low !== 0 || masterEQ.mid !== 0 || masterEQ.high !== 0 ? "default" : "outline"}
                      onClick={() => console.log('Master EQ functionality removed')}
                      className={`w-full h-6 text-xs ${
                        masterEQ.low !== 0 || masterEQ.mid !== 0 || masterEQ.high !== 0
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'border-red-600 text-red-300 hover:bg-red-800 hover:text-white'
                      }`}
                      title={`Master EQ (current: Low ${masterEQ.low}dB, Mid ${masterEQ.mid}dB, High ${masterEQ.high}dB)`}
                    >
                      {masterEQ.low !== 0 || masterEQ.mid !== 0 || masterEQ.high !== 0 
                        ? `MASTER EQ (${masterEQ.low}/${masterEQ.mid}/${masterEQ.high})` 
                        : 'MASTER EQ'
                      }
                    </Button>
                  </div>
                </div>
              </div>

              {/* Mixer Controls */}
              <div className="mt-6 p-4 border-t border-gray-600 bg-[#0f0f0f] rounded">
                <div className="flex items-center gap-4">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      // Reset all mixer settings
                      setMixerSettings({})
                      setMasterEQ({ low: 0, mid: 0, high: 0 })
                      setMasterVolume(0.8)
                      
                      // Clean up master EQ chain
                      if (window._masterEQChain) {
                        window._masterEQChain.forEach((node: any) => {
                          try {
                            if (node && typeof node.disconnect === 'function') {
                              node.disconnect()
                            }
                            if (node && typeof node.dispose === 'function') {
                              node.dispose()
                            }
                          } catch (error) {
                            console.warn('[MIXER RESET] Error disposing node:', error)
                          }
                        })
                        window._masterEQChain = []
                      }
                      
                      console.log('[MIXER RESET] Reset all mixer settings')
                    }}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset All
                  </Button>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm">Master Volume:</span>
                    <span className="text-white text-sm font-mono">{Math.round(masterVolume * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm">Active Tracks:</span>
                    <span className="text-white text-sm font-mono">
                      {tracks.filter(t => t.audioUrl).length}/{tracks.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm">Playing:</span>
                    <span className={`text-sm font-mono ${isPlaying ? 'text-green-500' : 'text-gray-500'}`}>
                      {isPlaying ? 'LIVE' : 'STOPPED'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm">Peak Level:</span>
                    <span className={`text-sm font-mono ${masterPeak > 0.85 ? 'text-red-500' : masterPeak > 0.6 ? 'text-yellow-500' : 'text-green-500'}`}>
                      {Math.round(masterPeak * 100)}%
                    </span>
                  </div>
                  <div className="ml-auto">
                    <Badge variant="outline" className="text-blue-500 border-blue-500">
                      Professional Mixer
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

                {/* Record Tab */}
        <TabsContent value="record" className="space-y-6 mt-6">
          <Card className="!bg-[#141414] border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Digital Audio Workstation</CardTitle>
                  <p className="text-gray-400 text-sm">
                    Professional recording interface for vocals and beat import
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                  >
                    <Upload className="w-4 h-4 mr-1" />
                    Import Beat
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-green-400 hover:text-green-300 hover:bg-green-900/20"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Save Project
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-orange-400 hover:text-orange-300 hover:bg-orange-900/20"
                  >
                    <FolderOpen className="w-4 h-4 mr-1" />
                    Load Project
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="bg-[#0f0f0f] border border-gray-700 rounded-lg overflow-hidden">
                {/* Transport Bar */}
                <div className="bg-[#1a1a1a] border-b border-gray-600 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      {/* Transport Controls */}
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="bg-[#2a2a2a] text-gray-300 hover:bg-[#3a3a3a] border-gray-600 h-10 w-10 p-0">
                          <RotateCcw className="w-5 h-5" />
                        </Button>
                        <Button variant="outline" size="sm" className="bg-[#2a2a2a] text-gray-300 hover:bg-[#3a3a3a] border-gray-600 h-10 w-10 p-0">
                          <Play className="w-5 h-5" />
                        </Button>
                        <Button variant="outline" size="sm" className="bg-[#2a2a2a] text-gray-300 hover:bg-[#3a3a3a] border-gray-600 h-10 w-10 p-0">
                          <Square className="w-5 h-5" />
                        </Button>
                        <Button variant="outline" size="sm" className="bg-red-800 text-red-300 hover:bg-red-700 border-red-600 h-10 w-10 p-0">
                          <Mic className="w-5 h-5" />
                        </Button>
                      </div>
                      
                      {/* Time Display */}
                      <div className="flex items-center gap-2 bg-[#2a2a2a] px-4 py-2 rounded border border-gray-600">
                        <span className="text-white text-lg font-mono">00:00:00</span>
                        <span className="text-gray-400">/</span>
                        <span className="text-gray-400 text-lg font-mono">03:45:00</span>
                      </div>
                      
                      {/* BPM and Key */}
                      <div className="flex items-center gap-3">
                        <div className="bg-[#2a2a2a] px-3 py-2 rounded border border-gray-600">
                          <span className="text-white text-sm font-medium">120 BPM</span>
                        </div>
                        <div className="bg-[#2a2a2a] px-3 py-2 rounded border border-gray-600">
                          <span className="text-white text-sm font-medium">Key: C</span>
                        </div>
                        <div className="bg-[#2a2a2a] px-3 py-2 rounded border border-gray-600">
                          <span className="text-white text-sm font-medium">4/4</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-sm bg-[#2a2a2a] border-gray-600 text-gray-300">
                        Pro Tools Style
                      </Badge>
                      <Badge variant="outline" className="text-sm bg-green-900/20 border-green-600 text-green-400">
                        Ready to Record
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Main DAW Interface */}
                <div className="flex h-[600px]">
                  {/* Track List Panel (Left) */}
                  <div className="w-72 bg-[#1a1a1a] border-r border-gray-600 flex flex-col">
                    {/* Track List Header */}
                    <div className="bg-[#2a2a2a] border-b border-gray-600 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-white text-sm font-medium">Tracks</span>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" className="text-gray-400 border-gray-600 h-7 w-7 p-0">
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" className="text-gray-400 border-gray-600 h-7 w-7 p-0">
                            <Settings className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Track List */}
                    <div className="flex-1 p-3 space-y-2">
                      {/* Beat Track */}
                      <div className="bg-[#2a2a2a] border border-gray-600 rounded p-3 hover:bg-[#3a3a3a] transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span className="text-white text-sm font-medium">Beat Track</span>
                          </div>
                          <Button size="sm" variant="outline" className="text-gray-400 border-gray-600 h-6 w-6 p-0">
                            <Music className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <Button size="sm" variant="outline" className="text-gray-400 border-gray-600 h-6 w-6 p-0 text-xs font-bold">M</Button>
                          <Button size="sm" variant="outline" className="text-gray-400 border-gray-600 h-6 w-6 p-0 text-xs font-bold">S</Button>
                          <Button size="sm" variant="outline" className="text-red-400 border-red-600 h-6 w-6 p-0 text-xs font-bold">R</Button>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">Imported from Beat Library</div>
                      </div>
                      
                      {/* Vocal Track 1 */}
                      <div className="bg-[#2a2a2a] border border-gray-600 rounded p-3 hover:bg-[#3a3a3a] transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <span className="text-white text-sm font-medium">Vocal 1</span>
                          </div>
                          <Button size="sm" variant="outline" className="text-gray-400 border-gray-600 h-6 w-6 p-0">
                            <Mic className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <Button size="sm" variant="outline" className="text-gray-400 border-gray-600 h-6 w-6 p-0 text-xs font-bold">M</Button>
                          <Button size="sm" variant="outline" className="text-gray-400 border-gray-600 h-6 w-6 p-0 text-xs font-bold">S</Button>
                          <Button size="sm" variant="outline" className="text-red-400 border-red-600 h-6 w-6 p-0 text-xs font-bold">R</Button>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">Microphone Input 1</div>
                      </div>
                      
                      {/* Vocal Track 2 */}
                      <div className="bg-[#2a2a2a] border border-gray-600 rounded p-3 hover:bg-[#3a3a3a] transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                            <span className="text-white text-sm font-medium">Vocal 2</span>
                          </div>
                          <Button size="sm" variant="outline" className="text-gray-400 border-gray-600 h-6 w-6 p-0">
                            <Mic className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <Button size="sm" variant="outline" className="text-gray-400 border-gray-600 h-6 w-6 p-0 text-xs font-bold">M</Button>
                          <Button size="sm" variant="outline" className="text-gray-400 border-gray-600 h-6 w-6 p-0 text-xs font-bold">S</Button>
                          <Button size="sm" variant="outline" className="text-red-400 border-red-600 h-6 w-6 p-0 text-xs font-bold">R</Button>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">Microphone Input 2</div>
                      </div>
                      
                      {/* Add Track Button */}
                      <div className="mt-4">
                        <Button 
                          variant="outline" 
                          className="w-full border-dashed border-gray-600 text-gray-400 hover:text-gray-300 hover:border-gray-500 hover:bg-[#3a3a3a]"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add New Track
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Timeline Panel (Right) */}
                  <div className="flex-1 bg-[#1a1a1a] flex flex-col">
                    {/* Timeline Header */}
                    <div className="bg-[#2a2a2a] border-b border-gray-600 p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-white text-sm font-medium">Timeline</span>
                          <div className="flex items-center gap-2">
                            <div className="bg-[#3a3a3a] px-2 py-1 rounded border border-gray-600">
                              <span className="text-white text-xs">Grid: 1/4</span>
                            </div>
                            <div className="bg-[#3a3a3a] px-2 py-1 rounded border border-gray-600">
                              <span className="text-white text-xs">Snap: On</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" className="text-gray-400 border-gray-600">
                            <Settings className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Timeline Grid */}
                    <div className="flex-1 p-4">
                      <div className="space-y-2">
                        {/* Beat Track Timeline */}
                        <div className="flex items-center h-12 bg-[#2a2a2a] border border-gray-600 rounded">
                          <div className="w-20 text-white text-sm font-medium px-3">Beat</div>
                          <div className="flex-1 bg-[#3a3a3a] h-full relative rounded-r overflow-hidden">
                            {/* Beat Waveform */}
                            <div className="absolute left-0 top-0 w-1/3 h-full flex items-center justify-center">
                              <div className="flex items-end gap-0.5 h-8">
                                {[...Array(20)].map((_, i) => (
                                  <div
                                    key={i}
                                    className="w-0.5 bg-green-400 rounded-sm animate-pulse"
                                    style={{
                                      height: `${Math.random() * 60 + 20}%`,
                                      animationDelay: `${i * 0.1}s`,
                                      animationDuration: '1s'
                                    }}
                                  ></div>
                                ))}
                              </div>
                            </div>
                            <div className="absolute left-1/3 top-0 w-1/6 h-full flex items-center justify-center">
                              <div className="flex items-end gap-0.5 h-8">
                                {[...Array(12)].map((_, i) => (
                                  <div
                                    key={i}
                                    className="w-0.5 bg-green-400/70 rounded-sm animate-pulse"
                                    style={{
                                      height: `${Math.random() * 50 + 15}%`,
                                      animationDelay: `${i * 0.15}s`,
                                      animationDuration: '1.2s'
                                    }}
                                  ></div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Vocal 1 Timeline */}
                        <div className="flex items-center h-12 bg-[#2a2a2a] border border-gray-600 rounded">
                          <div className="w-20 text-white text-sm font-medium px-3">Vocal 1</div>
                          <div className="flex-1 bg-[#3a3a3a] h-full relative rounded-r overflow-hidden">
                            {/* Vocal 1 Waveform */}
                            <div className="absolute left-1/3 top-0 w-1/4 h-full flex items-center justify-center">
                              <div className="flex items-end gap-0.5 h-8">
                                {[...Array(25)].map((_, i) => (
                                  <div
                                    key={i}
                                    className="w-0.5 bg-red-400 rounded-sm animate-pulse"
                                    style={{
                                      height: `${Math.random() * 80 + 10}%`,
                                      animationDelay: `${i * 0.08}s`,
                                      animationDuration: '0.8s'
                                    }}
                                  ></div>
                                ))}
                              </div>
                            </div>
                            <div className="absolute left-2/3 top-0 w-1/8 h-full flex items-center justify-center">
                              <div className="flex items-end gap-0.5 h-8">
                                {[...Array(8)].map((_, i) => (
                                  <div
                                    key={i}
                                    className="w-0.5 bg-red-400/70 rounded-sm animate-pulse"
                                    style={{
                                      height: `${Math.random() * 60 + 20}%`,
                                      animationDelay: `${i * 0.12}s`,
                                      animationDuration: '1s'
                                    }}
                                  ></div>
                                ))}
                              </div>
                            </div>
                            {/* Live Recording Indicator */}
                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                <span className="text-red-400 text-xs font-mono">REC</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Vocal 2 Timeline */}
                        <div className="flex items-center h-12 bg-[#2a2a2a] border border-gray-600 rounded">
                          <div className="w-20 text-white text-sm font-medium px-3">Vocal 2</div>
                          <div className="flex-1 bg-[#3a3a3a] h-full relative rounded-r overflow-hidden">
                            {/* Vocal 2 Waveform */}
                            <div className="absolute left-2/3 top-0 w-1/6 h-full flex items-center justify-center">
                              <div className="flex items-end gap-0.5 h-8">
                                {[...Array(15)].map((_, i) => (
                                  <div
                                    key={i}
                                    className="w-0.5 bg-blue-400 rounded-sm animate-pulse"
                                    style={{
                                      height: `${Math.random() * 70 + 15}%`,
                                      animationDelay: `${i * 0.1}s`,
                                      animationDuration: '0.9s'
                                    }}
                                  ></div>
                                ))}
                              </div>
                            </div>
                            {/* Live Recording Indicator */}
                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                <span className="text-blue-400 text-xs font-mono">REC</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mixer Panel (Bottom) */}
                <div className="bg-[#1a1a1a] border-t border-gray-600 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-white text-sm font-medium">Mixer Console</span>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="text-gray-400 border-gray-600">
                        <Settings className="w-3 h-3 mr-1" />
                        Settings
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-5 gap-4">
                    {/* Beat Channel */}
                    <div className="bg-[#2a2a2a] rounded-lg border border-gray-600 p-4">
                      <div className="text-center mb-4">
                        <div className="w-3 h-3 rounded-full bg-green-500 mx-auto mb-2"></div>
                        <div className="text-white text-sm font-medium">Beat</div>
                        <div className="text-gray-500 text-xs">-6 dB</div>
                      </div>
                      <div className="space-y-3">
                        <div className="h-20 bg-[#3a3a3a] rounded border border-gray-600 flex items-end justify-center p-2">
                          <div className="w-2 bg-green-500 rounded-sm h-3/4"></div>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">-∞</span>
                          <span className="text-white">0</span>
                          <span className="text-gray-400">+12</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <Button size="sm" variant="outline" className="text-gray-400 border-gray-600 h-6 w-6 p-0 text-xs">M</Button>
                          <Button size="sm" variant="outline" className="text-gray-400 border-gray-600 h-6 w-6 p-0 text-xs">S</Button>
                          <Button size="sm" variant="outline" className="text-blue-400 border-blue-600 h-6 w-6 p-0 text-xs">EQ</Button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Vocal 1 Channel */}
                    <div className="bg-[#2a2a2a] rounded-lg border border-gray-600 p-4">
                      <div className="text-center mb-4">
                        <div className="w-3 h-3 rounded-full bg-red-500 mx-auto mb-2"></div>
                        <div className="text-white text-sm font-medium">Vocal 1</div>
                        <div className="text-gray-500 text-xs">-3 dB</div>
                      </div>
                      <div className="space-y-3">
                        <div className="h-20 bg-[#3a3a3a] rounded border border-gray-600 flex items-end justify-center p-2">
                          <div className="w-2 bg-red-500 rounded-sm h-1/2"></div>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">-∞</span>
                          <span className="text-white">0</span>
                          <span className="text-gray-400">+12</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <Button size="sm" variant="outline" className="text-gray-400 border-gray-600 h-6 w-6 p-0 text-xs">M</Button>
                          <Button size="sm" variant="outline" className="text-gray-400 border-gray-600 h-6 w-6 p-0 text-xs">S</Button>
                          <Button size="sm" variant="outline" className="text-blue-400 border-blue-600 h-6 w-6 p-0 text-xs">EQ</Button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Vocal 2 Channel */}
                    <div className="bg-[#2a2a2a] rounded-lg border border-gray-600 p-4">
                      <div className="text-center mb-4">
                        <div className="w-3 h-3 rounded-full bg-blue-500 mx-auto mb-2"></div>
                        <div className="text-white text-sm font-medium">Vocal 2</div>
                        <div className="text-gray-500 text-xs">-9 dB</div>
                      </div>
                      <div className="space-y-3">
                        <div className="h-20 bg-[#3a3a3a] rounded border border-gray-600 flex items-end justify-center p-2">
                          <div className="w-2 bg-blue-500 rounded-sm h-1/3"></div>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">-∞</span>
                          <span className="text-white">0</span>
                          <span className="text-gray-400">+12</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <Button size="sm" variant="outline" className="text-gray-400 border-gray-600 h-6 w-6 p-0 text-xs">M</Button>
                          <Button size="sm" variant="outline" className="text-gray-400 border-gray-600 h-6 w-6 p-0 text-xs">S</Button>
                          <Button size="sm" variant="outline" className="text-blue-400 border-blue-600 h-6 w-6 p-0 text-xs">EQ</Button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Master Channel */}
                    <div className="bg-[#2a2a2a] rounded-lg border border-gray-600 p-4">
                      <div className="text-center mb-4">
                        <div className="w-3 h-3 rounded-full bg-yellow-500 mx-auto mb-2"></div>
                        <div className="text-white text-sm font-medium">Master</div>
                        <div className="text-gray-500 text-xs">-1 dB</div>
                      </div>
                      <div className="space-y-3">
                        <div className="h-20 bg-[#3a3a3a] rounded border border-gray-600 flex items-end justify-center p-2">
                          <div className="w-2 bg-yellow-500 rounded-sm h-2/3"></div>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">-∞</span>
                          <span className="text-white">0</span>
                          <span className="text-gray-400">+12</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <Button size="sm" variant="outline" className="text-gray-400 border-gray-600 h-6 w-6 p-0 text-xs">M</Button>
                          <Button size="sm" variant="outline" className="text-gray-400 border-gray-600 h-6 w-6 p-0 text-xs">S</Button>
                          <Button size="sm" variant="outline" className="text-blue-400 border-blue-600 h-6 w-6 p-0 text-xs">EQ</Button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Effects Rack */}
                    <div className="bg-[#2a2a2a] rounded-lg border border-gray-600 p-4">
                      <div className="text-center mb-4">
                        <div className="w-3 h-3 rounded-full bg-purple-500 mx-auto mb-2"></div>
                        <div className="text-white text-sm font-medium">Effects</div>
                        <div className="text-gray-500 text-xs">Rack</div>
                      </div>
                      <div className="space-y-2">
                        <Button size="sm" variant="outline" className="w-full text-gray-400 border-gray-600 h-6 text-xs">Reverb</Button>
                        <Button size="sm" variant="outline" className="w-full text-gray-400 border-gray-600 h-6 text-xs">Delay</Button>
                        <Button size="sm" variant="outline" className="w-full text-gray-400 border-gray-600 h-6 text-xs">Comp</Button>
                        <Button size="sm" variant="outline" className="w-full text-gray-400 border-gray-600 h-6 text-xs">EQ</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-6 mt-6">
          <Card className="!bg-[#141414] border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Beat Sessions</CardTitle>
                <div className="flex items-center gap-2">
                  {currentSessionId && (
                    <div className="flex items-center gap-2 mr-4">
                      <Badge variant="outline" className="text-green-500 border-green-500 text-xs">
                        {currentSessionName}
                      </Badge>
                      {hasUnsavedChanges && (
                        <Badge variant="outline" className="text-orange-500 border-orange-500 text-xs">
                          Unsaved Changes
                        </Badge>
                      )}
                      <Button
                        onClick={handleUpdateSession}
                        disabled={isSaving || !hasUnsavedChanges}
                        size="lg"
                        className="bg-black text-white font-bold px-6 py-2 rounded shadow hover:bg-gray-900 transition-colors border-none"
                      >
                        {isSaving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Updating...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Update Session
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={openVersionHistoryDialog}
                        variant="outline"
                        size="lg"
                        className="bg-gray-800 text-white font-bold px-6 py-2 rounded shadow hover:bg-gray-700 transition-colors border-gray-600"
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        Version History
                      </Button>
                    </div>
                  )}
                  <Button
                    onClick={() => setShowSessionDialog(true)}
                    variant="outline"
                    size="sm"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save New Session
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {savedSessions.length === 0 ? (
                <div className="text-center py-12">
                  <List className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No saved sessions</h3>
                  <p className="text-gray-400 mb-4">Create your first session to get started</p>
                  <Button
                    onClick={() => setShowSessionDialog(true)}
                    className="text-green-400 hover:text-green-300"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Current Session
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-gray-400 text-sm">
                      {savedSessions.filter(session => 
                        sessionStatusFilter === 'all' || session.status === sessionStatusFilter
                      ).length} session{savedSessions.filter(session => 
                        sessionStatusFilter === 'all' || session.status === sessionStatusFilter
                      ).length !== 1 ? 's' : ''} found
                    </div>
                    <Button
                      onClick={loadSavedSessions}
                      variant="outline"
                      size="sm"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                  
                  {/* Status Filter Tabs */}
                  <div className="flex gap-2 mb-4 overflow-x-auto">
                    <Button
                      variant={sessionStatusFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSessionStatusFilter('all')}
                      className="whitespace-nowrap"
                    >
                      All ({savedSessions.length})
                    </Button>
                    <Button
                      variant={sessionStatusFilter === 'draft' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSessionStatusFilter('draft')}
                      className="whitespace-nowrap"
                    >
                      Draft ({savedSessions.filter(s => s.status === 'draft').length})
                    </Button>
                    <Button
                      variant={sessionStatusFilter === 'in_progress' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSessionStatusFilter('in_progress')}
                      className="whitespace-nowrap"
                    >
                      In Progress ({savedSessions.filter(s => s.status === 'in_progress').length})
                    </Button>
                    <Button
                      variant={sessionStatusFilter === 'complete' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSessionStatusFilter('complete')}
                      className="whitespace-nowrap"
                    >
                      Complete ({savedSessions.filter(s => s.status === 'complete').length})
                    </Button>
                    <Button
                      variant={sessionStatusFilter === 'archived' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSessionStatusFilter('archived')}
                      className="whitespace-nowrap"
                    >
                      Archived ({savedSessions.filter(s => s.status === 'archived').length})
                    </Button>
                  </div>
                  
                  <div className="grid gap-4">
                    {savedSessions
                      .filter(session => sessionStatusFilter === 'all' || session.status === sessionStatusFilter)
                      .map((session) => (
                      <div
                        key={session.id}
                        className={`p-4 rounded-lg border transition-colors relative ${
                          currentSessionId === session.id
                            ? 'bg-[#2a2a2a] border-green-500'
                            : 'bg-[#1a1a1a] border-gray-600 hover:border-gray-500'
                        }`}
                      >

                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {editingSessionId === session.id ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={editingSessionName}
                                    onChange={(e) => setEditingSessionName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleSaveSessionName()
                                      } else if (e.key === 'Escape') {
                                        handleCancelEditSession()
                                      }
                                    }}
                                    className="bg-gray-800 text-white border border-gray-600 rounded px-2 py-1 text-lg font-semibold focus:outline-none focus:border-blue-500"
                                    autoFocus
                                  />
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={handleSaveSessionName}
                                    disabled={savingSessionName}
                                    className="h-6 w-6 text-green-400 hover:text-green-300 hover:bg-green-900/20"
                                    title="Save"
                                  >
                                    {savingSessionName ? (
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-400"></div>
                                    ) : (
                                      <CheckCircle2 className="h-3 w-3" />
                                    )}
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={handleCancelEditSession}
                                    className="h-6 w-6 text-gray-400 hover:text-gray-300 hover:bg-gray-900/20"
                                    title="Cancel"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <h3 className="text-white font-semibold text-lg">{session.name}</h3>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleStartEditSession(session)}
                                    className="h-5 w-5 text-gray-400 hover:text-gray-300 hover:bg-gray-900/20"
                                    title="Edit session name"
                                  >
                                    <Edit3 className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                              {currentSessionId === session.id && (
                                <Badge variant="outline" className="text-green-500 border-green-500 text-xs">
                                  Current
                                </Badge>
                              )}
                            </div>
                            
                            {session.description && (
                              <p className="text-gray-400 text-sm mb-3">{session.description}</p>
                            )}
                            
                            {/* Linked Albums and Singles */}
                            {sessionLinks[session.id] && (
                              <div className="mb-3">
                                {sessionLinks[session.id].albums.length > 0 && (
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge 
                                      variant="outline" 
                                      className="text-purple-400 border-purple-500 text-xs cursor-pointer hover:bg-purple-500 hover:text-white transition-colors"
                                      onClick={() => navigateToAlbum(sessionLinks[session.id].albums[0].id)}
                                      title="Click to view album"
                                    >
                                      <LinkIcon className="w-3 h-3 mr-1" />
                                      Album: {sessionLinks[session.id].albums[0].title}
                                      {sessionLinks[session.id].albums.length > 1 && ` (+${sessionLinks[session.id].albums.length - 1} more)`}
                                    </Badge>
                                  </div>
                                )}
                                {sessionLinks[session.id].singles.length > 0 && (
                                  <div className="flex items-center gap-2">
                                    <Badge 
                                      variant="outline" 
                                      className="text-orange-400 border-orange-500 text-xs cursor-pointer hover:bg-orange-500 hover:text-white transition-colors"
                                      onClick={() => navigateToSingle(sessionLinks[session.id].singles[0].id)}
                                      title="Click to view single"
                                    >
                                      <LinkIcon className="w-3 h-3 mr-1" />
                                      Single: {sessionLinks[session.id].singles[0].title}
                                      {sessionLinks[session.id].singles.length > 1 && ` (+${sessionLinks[session.id].singles.length - 1} more)`}
                                    </Badge>
                                  </div>
                                )}
                                {sessionLinks[session.id].tracks.length > 0 && (
                                  <div className="flex items-center gap-2">
                                    <Badge 
                                      variant="outline" 
                                      className="text-blue-400 border-blue-500 text-xs cursor-pointer hover:bg-blue-500 hover:text-white transition-colors"
                                      onClick={() => router.push(`/mylibrary?tab=tracks`)}
                                      title="Click to view track"
                                    >
                                      <LinkIcon className="w-3 h-3 mr-1" />
                                      Track: {sessionLinks[session.id].tracks[0].title}
                                      {sessionLinks[session.id].tracks.length > 1 && ` (+${sessionLinks[session.id].tracks.length - 1} more)`}
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{new Date(session.updated_at).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Music className="w-3 h-3" />
                                <span>{session.bpm} BPM</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Disc className="w-3 h-3" />
                                <span>{session.steps} Steps</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <List className="w-3 h-3" />
                                <span>{session.tracks?.length || 0} Tracks</span>
                              </div>
                              <div className="flex items-center gap-1">
                                {/* Duplicate button to the left of status */}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleDuplicateSession(session.id)}
                                  className="h-5 w-5 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                                  title="Duplicate session"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Badge 
                                      className={`cursor-pointer hover:opacity-80 transition-opacity ${
                                        session.status === 'draft' ? 'bg-gray-600 text-gray-200 border-gray-500' :
                                        session.status === 'in_progress' ? 'bg-blue-600 text-white border-blue-500' :
                                        session.status === 'complete' ? 'bg-green-600 text-white border-green-500' :
                                        'bg-orange-600 text-white border-orange-500'
                                      }`}
                                      title="Click to change status"
                                    >
                                      {session.status?.replace('_', ' ') || 'draft'}
                                      <ChevronDown className="w-3 h-3 ml-1" />
                                    </Badge>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent className="bg-[#2a2a2a] border-gray-600">
                                    <DropdownMenuItem 
                                      onClick={() => handleUpdateSessionStatus(session.id, 'draft')}
                                      className="text-gray-200 hover:bg-gray-600"
                                    >
                                      <div className="w-3 h-3 rounded-full bg-gray-500 mr-2"></div>
                                      Draft
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleUpdateSessionStatus(session.id, 'in_progress')}
                                      className="text-blue-200 hover:bg-blue-600"
                                    >
                                      <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                                      In Progress
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleUpdateSessionStatus(session.id, 'complete')}
                                      className="text-green-200 hover:bg-green-600"
                                    >
                                      <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                                      Complete
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleUpdateSessionStatus(session.id, 'archived')}
                                      className="text-orange-200 hover:bg-orange-600"
                                    >
                                      <div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div>
                                      Archived
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                {/* Delete button next to status label */}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to delete "${session.name}"? This action cannot be undone.`)) {
                                      handleDeleteSession(session.id)
                                    }
                                  }}
                                  className="h-5 w-5 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                  title="Delete session"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              size="sm"
                              onClick={() => handleLoadSession(session.id)}
                              disabled={isLoading}
                              className="bg-black text-white hover:bg-yellow-400 hover:text-black transition-colors"
                            >
                              {isLoading ? 'Loading...' : 'Load'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Session Dialog */}
      <Dialog open={showSessionDialog} onOpenChange={setShowSessionDialog}>
        <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Session Management</DialogTitle>
            <DialogDescription className="text-gray-400">
              Save your current session or load a previously saved session.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Save New Session */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">Save Current Session</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="session-name" className="text-white">Session Name *</Label>
                  <Input
                    id="session-name"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    placeholder="Enter session name..."
                    className="bg-[#2a2a2a] border-gray-600 text-white"
                    autoFocus
                  />
                </div>
                <div>
                  <Label htmlFor="session-description" className="text-white">Description</Label>
                  <Textarea
                    id="session-description"
                    value={sessionDescription}
                    onChange={(e) => setSessionDescription(e.target.value)}
                    placeholder="Optional description..."
                    className="bg-[#2a2a2a] border-gray-600 text-white"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="session-category" className="text-white">Category</Label>
                  <Input
                    id="session-category"
                    value={sessionCategory}
                    onChange={(e) => setSessionCategory(e.target.value)}
                    placeholder="e.g., Hip Hop, Trap, House..."
                    className="bg-[#2a2a2a] border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="session-tags" className="text-white">Tags</Label>
                  <Input
                    id="session-tags"
                    value={sessionTags}
                    onChange={(e) => setSessionTags(e.target.value)}
                    placeholder="e.g., drums, bass, melody (comma separated)"
                    className="bg-[#2a2a2a] border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="session-status" className="text-white">Status</Label>
                  <Select value={sessionStatus} onValueChange={setSessionStatus}>
                    <SelectTrigger className="bg-[#2a2a2a] border-gray-600 text-white">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#2a2a2a] border-gray-600">
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="complete">Complete</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={currentSessionId ? handleUpdateSession : handleSaveSession}
                  disabled={isSaving || !sessionName.trim()}
                  className="w-full"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {currentSessionId ? 'Updating...' : 'Saving...'}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {currentSessionId ? 'Update Session' : 'Save Session'}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Load Saved Sessions */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">Load Saved Sessions</h3>
              {savedSessions.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No saved sessions found.</p>
                  <p className="text-sm">Save some sessions first to see them here.</p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {savedSessions.map((session) => (
                    <div
                      key={session.id}
                      className="p-4 rounded-lg border border-gray-600 bg-[#2a2a2a] hover:bg-[#3a3a3a] transition-colors relative"
                    >

                                              <div className="flex items-start justify-between">
                          <div className="flex-1">
                                                         <div className="flex items-center gap-2 mb-1">
                               <h3 className="font-semibold text-white">{session.name}</h3>
                             </div>
                          <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                            <span>BPM: {session.bpm}</span>
                            <span>Steps: {session.steps}</span>
                            {session.category && <span>Category: {session.category}</span>}
                            {/* Duplicate button to the left of status label */}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDuplicateSession(session.id)}
                              className="h-5 w-5 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                              title="Duplicate session"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <span className={`${
                              session.status === 'draft' ? 'text-gray-400' :
                              session.status === 'in_progress' ? 'text-blue-400' :
                              session.status === 'complete' ? 'text-green-400' :
                              'text-orange-400'
                            }`}>Status: {session.status.replace('_', ' ')}</span>
                            {/* Delete button next to status label */}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete "${session.name}"? This action cannot be undone.`)) {
                                  handleDeleteSession(session.id)
                                }
                              }}
                              className="h-5 w-5 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                              title="Delete session"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          {session.description && (
                            <p className="text-sm text-gray-500 mt-1">{session.description}</p>
                          )}
                          {session.tags && session.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {session.tags.map((tag: string, index: number) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 mt-2">
                            {new Date(session.updated_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 ml-4">
                          <Button
                            size="sm"
                            onClick={() => handleLoadSession(session.id)}
                            disabled={isLoading}
                            className="w-full bg-black text-white hover:bg-yellow-400 hover:text-black transition-colors"
                          >
                            {isLoading ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                Loading...
                              </>
                            ) : (
                              <>
                                <FolderOpen className="w-3 h-3 mr-1" />
                                Load
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSessionDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={showVersionHistoryDialog} onOpenChange={setShowVersionHistoryDialog}>
        <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Version History</DialogTitle>
            <DialogDescription className="text-gray-400">
              View and restore previous versions of your session.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {isLoadingVersions ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-gray-400">Loading versions...</p>
              </div>
            ) : sessionVersions.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No versions found</h3>
                <p className="text-gray-400">Start making changes to create version history</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessionVersions.map((version) => (
                  <div
                    key={version.id}
                    className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                      version.isCurrent
                        ? 'bg-[#2a2a2a] border-green-500'
                        : 'bg-[#1a1a1a] border-gray-600 hover:border-gray-500 hover:bg-[#2a2a2a]'
                    }`}
                    onClick={() => !version.isCurrent && loadVersion(version.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-white font-semibold text-lg">{version.name}</h3>
                          {version.isCurrent && (
                            <Badge variant="outline" className="text-green-500 border-green-500 text-xs">
                              Current
                            </Badge>
                          )}
                          {version.isAutoSave && (
                            <Badge variant="outline" className="text-blue-500 border-blue-500 text-xs">
                              Auto-save
                            </Badge>
                          )}
                        </div>
                        {version.description && (
                          <p className="text-gray-400 text-sm mb-2">{version.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {new Date(version.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      {!version.isCurrent && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            loadVersion(version.id)
                          }}
                          className="bg-blue-600 text-white hover:bg-blue-700 border-blue-500"
                        >
                          Restore
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVersionHistoryDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Pattern Dialog */}
      <Dialog open={showSavePatternDialog} onOpenChange={setShowSavePatternDialog}>
        <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Save Pattern</DialogTitle>
            <DialogDescription className="text-gray-400">
              Save your current sequencer pattern for later use.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="pattern-name" className="text-white">Pattern Name *</Label>
              <Input
                id="pattern-name"
                value={patternName}
                onChange={(e) => setPatternName(e.target.value)}
                placeholder="Enter pattern name..."
                className="bg-[#2a2a2a] border-gray-600 text-white"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="pattern-description" className="text-white">Description</Label>
              <Textarea
                id="pattern-description"
                value={patternDescription}
                onChange={(e) => setPatternDescription(e.target.value)}
                placeholder="Optional description..."
                className="bg-[#2a2a2a] border-gray-600 text-white"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="pattern-category" className="text-white">Category</Label>
              <Input
                id="pattern-category"
                value={patternCategory}
                onChange={(e) => setPatternCategory(e.target.value)}
                placeholder="e.g., Hip Hop, Trap, House..."
                className="bg-[#2a2a2a] border-gray-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="pattern-tags" className="text-white">Tags</Label>
              <Input
                id="pattern-tags"
                value={patternTags}
                onChange={(e) => setPatternTags(e.target.value)}
                placeholder="e.g., melody loop, drum loop, hihat loop (comma separated)"
                className="bg-[#2a2a2a] border-gray-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="pattern-genre" className="text-white">Genre</Label>
              <Select value={selectedGenreId} onValueChange={setSelectedGenreId}>
                <SelectTrigger className="bg-[#2a2a2a] border-gray-600 text-white">
                  <SelectValue placeholder="Select a genre..." />
                </SelectTrigger>
                <SelectContent className="bg-[#2a2a2a] border-gray-600">
                  <SelectItem value="none">None</SelectItem>
                  {genres.map((genre) => (
                    <SelectItem key={genre.id} value={genre.id}>
                      {genre.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedGenreId && selectedGenreId !== 'none' && (
              <div>
                <Label htmlFor="pattern-subgenre" className="text-white">Subgenre</Label>
                <Select value={selectedSubgenre} onValueChange={setSelectedSubgenre}>
                  <SelectTrigger className="bg-[#2a2a2a] border-gray-600 text-white">
                    <SelectValue placeholder="Select a subgenre..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2a2a2a] border-gray-600">
                    <SelectItem value="none">None</SelectItem>
                    {subgenres.map((subgenre) => (
                      <SelectItem key={subgenre} value={subgenre}>
                        {subgenre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSavePatternDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePatternSubmit} disabled={!patternName.trim()}>
              <Save className="w-4 h-4 mr-2" />
              Save Pattern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Pattern Dialog */}
      <Dialog open={showLoadPatternDialog} onOpenChange={setShowLoadPatternDialog}>
        <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Load Pattern</DialogTitle>
            <DialogDescription className="text-gray-400">
              Select a pattern to load into your sequencer. This will merge with your current patterns.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {availablePatterns.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No saved patterns found.</p>
                <p className="text-sm">Save some patterns first to see them here.</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {availablePatterns.map((pattern) => (
                  <div
                    key={pattern.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedPatternToLoad === pattern.id
                        ? 'bg-blue-600/20 border-blue-500'
                        : 'bg-[#2a2a2a] border-gray-600 hover:bg-[#3a3a3a]'
                    }`}
                    onClick={() => setSelectedPatternToLoad(pattern.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-white">{pattern.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                          <span>BPM: {pattern.bpm}</span>
                          <span>Steps: {pattern.steps}</span>
                          {pattern.pattern_type && <span>Type: {pattern.pattern_type}</span>}
                          {pattern.category && <span>Category: {pattern.category}</span>}
                          {pattern.genre_id && (
                            <span>Genre: {genres.find(g => g.id === pattern.genre_id)?.name || 'Unknown'}</span>
                          )}
                          {pattern.subgenre && <span>Subgenre: {pattern.subgenre}</span>}
                        </div>
                        {pattern.description && (
                          <p className="text-sm text-gray-500 mt-1">{pattern.description}</p>
                        )}
                        {pattern.tags && pattern.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {pattern.tags.map((tag: string, index: number) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(pattern.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLoadPatternDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleLoadPatternSubmit} 
              disabled={!selectedPatternToLoad}
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              Load Pattern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Track Pattern Dialog */}
      <Dialog open={showSaveTrackPatternDialog} onOpenChange={setShowSaveTrackPatternDialog}>
        <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              Save Track Pattern
              {selectedTrackForPattern && (
                <span className="text-blue-400 ml-2">- {selectedTrackForPattern.name}</span>
              )}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Save the pattern for this specific track only.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="track-pattern-name" className="text-white">Pattern Name *</Label>
              <Input
                id="track-pattern-name"
                value={patternName}
                onChange={(e) => setPatternName(e.target.value)}
                placeholder={`${selectedTrackForPattern?.name || 'Track'} Pattern`}
                className="bg-[#2a2a2a] border-gray-600 text-white"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="track-pattern-description" className="text-white">Description</Label>
              <Textarea
                id="track-pattern-description"
                value={patternDescription}
                onChange={(e) => setPatternDescription(e.target.value)}
                placeholder="Optional description..."
                className="bg-[#2a2a2a] border-gray-600 text-white"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="track-pattern-category" className="text-white">Category</Label>
              <Input
                id="track-pattern-category"
                value={patternCategory}
                onChange={(e) => setPatternCategory(e.target.value)}
                placeholder="e.g., Drums, Bass, Melody..."
                className="bg-[#2a2a2a] border-gray-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="track-pattern-tags" className="text-white">Tags</Label>
              <Input
                id="track-pattern-tags"
                value={patternTags}
                onChange={(e) => setPatternTags(e.target.value)}
                placeholder={`${selectedTrackForPattern?.name?.toLowerCase() || 'track'}, pattern (comma separated)`}
                className="bg-[#2a2a2a] border-gray-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="track-pattern-genre" className="text-white">Genre</Label>
              <Select value={selectedGenreId} onValueChange={setSelectedGenreId}>
                <SelectTrigger className="bg-[#2a2a2a] border-gray-600 text-white">
                  <SelectValue placeholder="Select a genre..." />
                </SelectTrigger>
                <SelectContent className="bg-[#2a2a2a] border-gray-600">
                  <SelectItem value="none">None</SelectItem>
                  {genres.map((genre) => (
                    <SelectItem key={genre.id} value={genre.id}>
                      {genre.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedGenreId && selectedGenreId !== 'none' && (
              <div>
                <Label htmlFor="track-pattern-subgenre" className="text-white">Subgenre</Label>
                <Select value={selectedSubgenre} onValueChange={setSelectedSubgenre}>
                  <SelectTrigger className="bg-[#2a2a2a] border-gray-600 text-white">
                    <SelectValue placeholder="Select a subgenre..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2a2a2a] border-gray-600">
                    <SelectItem value="none">None</SelectItem>
                    {subgenres.map((subgenre) => (
                      <SelectItem key={subgenre} value={subgenre}>
                        {subgenre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveTrackPatternDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTrackPatternSubmit} disabled={!patternName.trim()}>
              <Save className="w-4 h-4 mr-2" />
              Save Track Pattern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Genre Dialog */}
      <Dialog open={showGenreDialog} onOpenChange={setShowGenreDialog}>
        <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Genres & Templates</DialogTitle>
            <DialogDescription className="text-gray-400">
              Select a genre to apply its settings and browse templates.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Genres List */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Available Genres</h3>
                <Button
                  size="sm"
                  onClick={() => setShowCreateGenreDialog(true)}
                  className="bg-green-400 text-black hover:bg-green-300"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Genre
                </Button>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {genres.map((genre) => (
                  <div
                    key={genre.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedGenre?.id === genre.id
                        ? 'bg-yellow-400/20 border-yellow-400'
                        : 'bg-[#2a2a2a] border-gray-600 hover:bg-[#3a3a3a]'
                    }`}
                    onClick={() => applyGenreSettings(genre)}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: genre.color }}
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold text-white">{genre.name}</h4>
                        <p className="text-sm text-gray-400">{genre.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                          <span>BPM: {genre.default_bpm}</span>
                          <span>Key: {genre.default_key}</span>
                          <span>Steps: {genre.default_steps}</span>
                          <span>Tempo Range: {genre.bpm_range_min}-{genre.bpm_range_max}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-6 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingGenre(genre)
                              setShowEditGenreDialog(true)
                            }}
                          >
                            Edit Tempo
                          </Button>
                        </div>
                          <div className="mt-2">
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-xs text-gray-500">Subgenres:</div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-6 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 border-blue-600"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  // Show all subgenres for editing
                                  if (genreSubgenres[genre.name] && genreSubgenres[genre.name].length > 0) {
                                    // Open a dialog to show all subgenres with edit buttons
                                    setShowSubgenreManagerDialog(true)
                                    setSelectedGenreForSubgenreManager(genre)
                                  }
                                }}
                                title="Manage all subgenres"
                              >
                                Manage
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs h-6 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (editingSubgenres[genre.id]) {
                                    stopEditingSubgenres(genre.id)
                                  } else {
                                    startEditingSubgenres(genre.id)
                                  }
                                }}
                              >
                                {editingSubgenres[genre.id] ? 'Cancel' : 'Add'}
                              </Button>
                            </div>
                          </div>
                          
                          {editingSubgenres[genre.id] ? (
                            // Edit mode
                            <div className="space-y-2">
                              <div className="flex gap-1">
                                <Input
                                  size={1}
                                  placeholder="New subgenre..."
                                  value={subgenreInputs[genre.id] || ''}
                                  onChange={(e) => setSubgenreInputs(prev => ({ ...prev, [genre.id]: e.target.value }))}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      addSubgenreToGenre(genre.id, genre.name)
                                    }
                                  }}
                                  className="text-xs h-6"
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-6"
                                  onClick={() => addSubgenreToGenre(genre.id, genre.name)}
                                  disabled={isSavingSubgenres || !subgenreInputs[genre.id]?.trim()}
                                >
                                  {isSavingSubgenres ? '...' : '+'}
                                </Button>
                              </div>
                              
                              <div className="flex flex-wrap gap-1">
                                {(genreSubgenres[genre.name] || []).map((subgenre, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-900/50 text-blue-300 rounded border border-blue-700"
                                  >
                                    <span>{subgenre}</span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs h-5 px-1 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 border-blue-600"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        // Find the subgenre data and open edit dialog
                                        const subgenreData = genreSubgenresData.find(s => s.genre === genre.name && s.subgenre === subgenre)
                                        if (subgenreData) {
                                          setEditingSubgenre(subgenreData)
                                          setShowEditSubgenreDialog(true)
                                        }
                                      }}
                                      disabled={isSavingSubgenres}
                                      title="Edit tempo"
                                    >
                                      Edit
                                    </Button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        removeSubgenreFromGenre(genre.name, subgenre)
                                      }}
                                      className="text-red-400 hover:text-red-300 ml-1"
                                      disabled={isSavingSubgenres}
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            // View mode
                            genreSubgenres[genre.name] && genreSubgenres[genre.name].length > 0 ? (
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-1">
                                {genreSubgenres[genre.name].slice(0, 3).map((subgenre, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-900/50 text-blue-300 rounded border border-blue-700"
                                  >
                                    <span>{subgenre}</span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs h-5 px-1 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 border-blue-600"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        // Find the subgenre data and open edit dialog
                                        const subgenreData = genreSubgenresData.find(s => s.genre === genre.name && s.subgenre === subgenre)
                                        if (subgenreData) {
                                          setEditingSubgenre(subgenreData)
                                          setShowEditSubgenreDialog(true)
                                        }
                                      }}
                                      title="Edit tempo"
                                    >
                                      Edit
                                    </Button>
                                  </div>
                                ))}
                                {genreSubgenres[genre.name].length > 3 && (
                                  <span className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded border border-gray-600">
                                    +{genreSubgenres[genre.name].length - 3} more
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">
                                Click "Edit" on any subgenre to modify its tempo range
                              </div>
                            </div>
                            ) : (
                              <div className="text-xs text-gray-500 italic">No subgenres</div>
                            )
                        )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Templates List */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Templates
                  {selectedGenre && (
                    <span className="text-yellow-400 ml-2">- {selectedGenre.name}</span>
                  )}
                </h3>
                {selectedGenre && (
                  <Button
                    size="sm"
                    onClick={() => setShowGenreTemplateDialog(true)}
                    className="bg-yellow-400 text-black hover:bg-yellow-300"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Template
                  </Button>
                )}
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {selectedGenre ? (
                  genreTemplates.length > 0 ? (
                    genreTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="p-4 rounded-lg border bg-[#2a2a2a] border-gray-600 hover:bg-[#3a3a3a] cursor-pointer transition-all"
                        onClick={() => loadGenreTemplate(template)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-white">{template.name}</h4>
                            {template.description && (
                              <p className="text-sm text-gray-400">{template.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                              <span>BPM: {template.bpm}</span>
                              <span>Key: {template.key}</span>
                              <span>Steps: {template.steps}</span>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(template.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <Save className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No templates for this genre yet.</p>
                      <p className="text-sm">Create a template to get started.</p>
                    </div>
                  )
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Select a genre to see templates.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenreDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Genre Template Dialog */}
      <Dialog open={showGenreTemplateDialog} onOpenChange={setShowGenreTemplateDialog}>
        <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              Save Genre Template
              {selectedGenre && (
                <span className="text-yellow-400 ml-2">- {selectedGenre.name}</span>
              )}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Save your current setup as a template for this genre.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="template-name" className="text-white">Template Name *</Label>
              <Input
                id="template-name"
                placeholder="e.g., Basic Trap Beat"
                className="bg-[#2a2a2a] border-gray-600 text-white"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="template-description" className="text-white">Description</Label>
              <Textarea
                id="template-description"
                placeholder="Optional description..."
                className="bg-[#2a2a2a] border-gray-600 text-white"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenreTemplateDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                const name = (document.getElementById('template-name') as HTMLInputElement)?.value
                const description = (document.getElementById('template-description') as HTMLTextAreaElement)?.value
                if (name && selectedGenre) {
                  saveAsGenreTemplate(selectedGenre.id, name, description)
                  setShowGenreTemplateDialog(false)
                }
              }}
              className="bg-yellow-400 text-black hover:bg-yellow-300"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create New Genre Dialog */}
      <Dialog open={showCreateGenreDialog} onOpenChange={setShowCreateGenreDialog}>
        <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              Create New Genre
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Create a custom genre with your preferred settings. The tempo range will be used when shuffling patterns to stay within the genre's BPM limits.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="genre-name" className="text-white">Genre Name *</Label>
              <Input
                id="genre-name"
                value={newGenreName}
                onChange={(e) => setNewGenreName(e.target.value)}
                placeholder="e.g., Future Bass, Lo-Fi, Drum & Bass"
                className="bg-[#2a2a2a] border-gray-600 text-white"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="genre-description" className="text-white">Description</Label>
              <Textarea
                id="genre-description"
                value={newGenreDescription}
                onChange={(e) => setNewGenreDescription(e.target.value)}
                placeholder="Describe the genre's characteristics..."
                className="bg-[#2a2a2a] border-gray-600 text-white"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label htmlFor="genre-min-bpm" className="text-white">Min BPM</Label>
                <Input
                  id="genre-min-bpm"
                  type="number"
                  value={newGenreMinBpm}
                  onChange={(e) => setNewGenreMinBpm(parseInt(e.target.value) || 80)}
                  min="60"
                  max="200"
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="genre-max-bpm" className="text-white">Max BPM</Label>
                <Input
                  id="genre-max-bpm"
                  type="number"
                  value={newGenreMaxBpm}
                  onChange={(e) => setNewGenreMaxBpm(parseInt(e.target.value) || 180)}
                  min="60"
                  max="200"
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="genre-bpm" className="text-white">Default BPM</Label>
                <Input
                  id="genre-bpm"
                  type="number"
                  value={newGenreBpm}
                  onChange={(e) => setNewGenreBpm(parseInt(e.target.value) || 120)}
                  min="60"
                  max="200"
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="genre-key" className="text-white">Default Key</Label>
                <select
                  id="genre-key"
                  value={newGenreKey}
                  onChange={(e) => setNewGenreKey(e.target.value)}
                  className="w-full bg-[#2a2a2a] border border-gray-600 rounded px-3 py-2 text-white"
                >
                  <option value="C">C</option>
                  <option value="C#">C#</option>
                  <option value="D">D</option>
                  <option value="D#">D#</option>
                  <option value="E">E</option>
                  <option value="F">F</option>
                  <option value="F#">F#</option>
                  <option value="G">G</option>
                  <option value="G#">G#</option>
                  <option value="A">A</option>
                  <option value="A#">A#</option>
                  <option value="B">B</option>
                  <option value="Cm">Cm</option>
                  <option value="C#m">C#m</option>
                  <option value="Dm">Dm</option>
                  <option value="D#m">D#m</option>
                  <option value="Em">Em</option>
                  <option value="Fm">Fm</option>
                  <option value="F#m">F#m</option>
                  <option value="Gm">Gm</option>
                  <option value="G#m">G#m</option>
                  <option value="Am">Am</option>
                  <option value="A#m">A#m</option>
                  <option value="Bm">Bm</option>
                </select>
              </div>
              <div>
                <Label htmlFor="genre-steps" className="text-white">Default Steps</Label>
                <select
                  id="genre-steps"
                  value={newGenreSteps}
                  onChange={(e) => setNewGenreSteps(parseInt(e.target.value) || 16)}
                  className="w-full bg-[#2a2a2a] border border-gray-600 rounded px-3 py-2 text-white"
                >
                  <option value="8">8</option>
                  <option value="16">16</option>
                  <option value="32">32</option>
                </select>
              </div>
            </div>
            <div className="text-xs text-gray-400 mt-2">
              <p>• <strong>Min/Max BPM:</strong> When shuffling patterns, the BPM will randomly change within this range</p>
              <p>• <strong>Default BPM:</strong> The starting BPM when this genre is selected</p>
            </div>
            <div>
              <Label htmlFor="genre-color" className="text-white">Genre Color</Label>
              <div className="flex items-center gap-2">
                <input
                  id="genre-color"
                  type="color"
                  value={newGenreColor}
                  onChange={(e) => setNewGenreColor(e.target.value)}
                  className="w-12 h-10 rounded border border-gray-600 cursor-pointer"
                />
                <span className="text-sm text-gray-400">Choose a color to represent this genre</span>
              </div>
            </div>
            
            <div>
              <Label className="text-white">Subgenres (Optional)</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newSubgenreInput}
                    onChange={(e) => setNewSubgenreInput(e.target.value)}
                    placeholder="e.g., Type Beat, Drill, Melodic"
                    className="bg-[#2a2a2a] border-gray-600 text-white flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addSubgenreToNewGenre()
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={addSubgenreToNewGenre}
                    disabled={!newSubgenreInput.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                
                {newGenreSubgenres.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {newGenreSubgenres.map((subgenre, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 text-xs bg-blue-900/50 text-blue-300 rounded border border-blue-700 flex items-center gap-1"
                      >
                        {subgenre}
                        <button
                          type="button"
                          onClick={() => removeSubgenreFromNewGenre(subgenre)}
                          className="text-blue-400 hover:text-blue-200"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                
                <p className="text-xs text-gray-400">
                  Add subgenres to help organize your audio files. These will be available when filtering by this genre.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateGenreDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={createNewGenre}
              disabled={!newGenreName.trim() || isCreatingGenre}
              className="bg-green-400 text-black hover:bg-green-300"
            >
              {isCreatingGenre ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Genre
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      {/* Pack Selection Dialog */}
      <Dialog open={showPackDialog} onOpenChange={setShowPackDialog}>
        <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              Select Audio Packs
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Choose one or more audio packs to filter shuffle sounds from. Click packs to toggle selection.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {audioPacks.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <div className="mb-2">No audio packs found</div>
                <div className="text-sm">Create packs in My Library first</div>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {audioPacks.map((pack) => (
                  <div
                    key={pack.id}
                    className="flex items-center justify-between p-3 bg-[#2a2a2a] rounded border border-gray-600 hover:border-gray-500 transition-colors cursor-pointer"
                    onClick={() => {
                      // Toggle pack selection
                      setSelectedPacks(prev => {
                        const isSelected = prev.some(p => p.id === pack.id)
                        if (isSelected) {
                          return prev.filter(p => p.id !== pack.id)
                        } else {
                          return [...prev, pack]
                        }
                      })
                    }}
                  >
                    <div className="flex-1">
                      <div className="text-white font-medium">{pack.name}</div>
                      <div className="text-gray-400 text-sm">
                        {pack.description || 'No description'}
                      </div>
                      <div className="text-gray-500 text-xs">
                        Created: {new Date(pack.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedPacks.some(p => p.id === pack.id) && (
                        <Badge variant="secondary" className="bg-green-400 text-black">
                          Selected
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPackDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="default"
              onClick={() => setShowPackDialog(false)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Done
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                setSelectedPacks([])
                setShowPackDialog(false)
              }}
              className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
            >
              Clear Selection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

              {/* Quantize Loop Modal */}
        {quantizeTrack && (
          <QuantizeLoopModal
            isOpen={showQuantizeModal}
            onClose={() => setShowQuantizeModal(false)}
            track={quantizeTrack}
            bpm={bpm}
            steps={steps}
            currentStep={currentStep}
            onQuantize={handleQuantizeLoop}
          />
        )}

      {/* Edit Track Modal */}
      <Dialog open={showEditTrackModal} onOpenChange={setShowEditTrackModal}>
        <DialogContent className="bg-[#141414] border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Custom Sample Track</DialogTitle>
          </DialogHeader>
          {editingTrack && (
            <form onSubmit={handleEditTrack} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300">File Name</label>
                <p className="text-sm text-gray-500">{editingTrack.audioName}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-300">Track Name</label>
                <Input
                  placeholder="e.g., My Custom Kick"
                  value={editTrackForm.name}
                  onChange={e => setEditTrackForm({ ...editTrackForm, name: e.target.value })}
                  className="bg-black border-gray-600 text-white"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-300">BPM</label>
                <Input
                  type="number"
                  placeholder="e.g., 140"
                  value={editTrackForm.bpm}
                  onChange={e => setEditTrackForm({ ...editTrackForm, bpm: e.target.value })}
                  className="bg-black border-gray-600 text-white"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-300">Key</label>
                <Input
                  placeholder="e.g., C, Am, F#"
                  value={editTrackForm.key}
                  onChange={e => setEditTrackForm({ ...editTrackForm, key: e.target.value })}
                  className="bg-black border-gray-600 text-white"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-300">Audio Type</label>
                <Input
                  placeholder="e.g., kick, snare, hihat, bass, melody, loop"
                  value={editTrackForm.audio_type}
                  onChange={e => setEditTrackForm({ ...editTrackForm, audio_type: e.target.value })}
                  className="bg-black border-gray-600 text-white"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-300">Tags</label>
                <Input
                  placeholder="comma-separated, e.g., trap, dark, aggressive, 808"
                  value={editTrackForm.tags}
                  onChange={e => setEditTrackForm({ ...editTrackForm, tags: e.target.value })}
                  className="bg-black border-gray-600 text-white"
                />
              </div>
              
              {trackEditError && (
                <div className="text-red-500 text-sm">{trackEditError}</div>
              )}
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowEditTrackModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingTrack}>
                  {savingTrack ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Genre Tempo Dialog */}
      <Dialog open={showEditGenreDialog} onOpenChange={setShowEditGenreDialog}>
        <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              Edit Genre Tempo: {editingGenre?.name}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Update the tempo range and default BPM for this genre.
            </DialogDescription>
          </DialogHeader>
          {editingGenre && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="edit-genre-min-bpm" className="text-white">Min BPM</Label>
                  <Input
                    id="edit-genre-min-bpm"
                    type="number"
                    value={editingGenre.bpm_range_min}
                    onChange={(e) => setEditingGenre({...editingGenre, bpm_range_min: parseInt(e.target.value)})}
                    className="bg-[#2a2a2a] border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-genre-max-bpm" className="text-white">Max BPM</Label>
                  <Input
                    id="edit-genre-max-bpm"
                    type="number"
                    value={editingGenre.bpm_range_max}
                    onChange={(e) => setEditingGenre({...editingGenre, bpm_range_max: parseInt(e.target.value)})}
                    className="bg-[#2a2a2a] border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-genre-default-bpm" className="text-white">Default BPM</Label>
                  <Input
                    id="edit-genre-default-bpm"
                    type="number"
                    value={editingGenre.default_bpm}
                    onChange={(e) => setEditingGenre({...editingGenre, default_bpm: parseInt(e.target.value)})}
                    className="bg-[#2a2a2a] border-gray-600 text-white"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditGenreDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleUpdateGenre(editingGenre)}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Subgenre Tempo Dialog */}
      <Dialog open={showEditSubgenreDialog} onOpenChange={setShowEditSubgenreDialog}>
        <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              Edit Subgenre Tempo: {editingSubgenre?.subgenre}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Update the tempo range and default BPM for this subgenre.
            </DialogDescription>
          </DialogHeader>
          {editingSubgenre && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="edit-subgenre-min-bpm" className="text-white">Min BPM</Label>
                  <Input
                    id="edit-subgenre-min-bpm"
                    type="number"
                    value={editingSubgenre.bpm_range_min}
                    onChange={(e) => setEditingSubgenre({...editingSubgenre, bpm_range_min: parseInt(e.target.value)})}
                    className="bg-[#2a2a2a] border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-subgenre-max-bpm" className="text-white">Max BPM</Label>
                  <Input
                    id="edit-subgenre-max-bpm"
                    type="number"
                    value={editingSubgenre.bpm_range_max}
                    onChange={(e) => setEditingSubgenre({...editingSubgenre, bpm_range_max: parseInt(e.target.value)})}
                    className="bg-[#2a2a2a] border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-subgenre-default-bpm" className="text-white">Default BPM</Label>
                  <Input
                    id="edit-subgenre-default-bpm"
                    type="number"
                    value={editingSubgenre.default_bpm}
                    onChange={(e) => setEditingSubgenre({...editingSubgenre, default_bpm: parseInt(e.target.value)})}
                    className="bg-[#2a2a2a] border-gray-600 text-white"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditSubgenreDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleUpdateSubgenre(editingSubgenre)}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subgenre Manager Dialog */}
      <Dialog open={showSubgenreManagerDialog} onOpenChange={setShowSubgenreManagerDialog}>
        <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              Manage Subgenres: {selectedGenreForSubgenreManager?.name}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Edit tempo ranges for all subgenres in this genre.
            </DialogDescription>
          </DialogHeader>
          {selectedGenreForSubgenreManager && (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {(genreSubgenres[selectedGenreForSubgenreManager.name] || []).map((subgenre, index) => {
                const subgenreData = genreSubgenresData.find(s => s.genre === selectedGenreForSubgenreManager.name && s.subgenre === subgenre)
                return (
                  <div key={index} className="flex items-center gap-4 p-3 bg-[#2a2a2a] rounded-lg border border-gray-600">
                    <div className="flex-1">
                      <h4 className="font-semibold text-white">{subgenre}</h4>
                      {subgenreData && (
                        <p className="text-sm text-gray-400">
                          Tempo Range: {subgenreData.bpm_range_min}-{subgenreData.bpm_range_max} | Default: {subgenreData.default_bpm}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 border-blue-600"
                      onClick={() => {
                        if (subgenreData) {
                          setEditingSubgenre(subgenreData)
                          setShowEditSubgenreDialog(true)
                          setShowSubgenreManagerDialog(false)
                        }
                      }}
                    >
                      Edit Tempo
                    </Button>
                  </div>
                )
              })}
              {(genreSubgenres[selectedGenreForSubgenreManager.name] || []).length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <p>No subgenres found for this genre.</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubgenreManagerDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <DialogTitle className="text-xl font-semibold text-white">
              {successMessage.includes('Failed') ? 'Error' : 'Success'}
            </DialogTitle>
            <DialogDescription className="text-gray-300 mt-2">
              {successMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-center">
            <Button 
              onClick={() => setShowSuccessDialog(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Close
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

