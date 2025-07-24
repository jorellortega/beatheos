'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Play, Square, RotateCcw, Settings, Save, Upload, Music, List, Disc, Shuffle, FolderOpen, Clock, Plus, Brain, Lock, Unlock, Bug } from 'lucide-react'
import { SequencerGrid } from '@/components/beat-maker/SequencerGrid'
import { TrackList } from '@/components/beat-maker/TrackList'
import { SampleLibrary } from '@/components/beat-maker/SampleLibrary'
import { QuantizeLoopModal } from '@/components/beat-maker/QuantizeLoopModal'
import { PianoRoll } from '@/components/beat-maker/PianoRoll'
import { AudioPianoRoll } from '@/components/beat-maker/AudioPianoRoll'
import { TrackPianoRoll } from '@/components/beat-maker/TrackPianoRoll'
import { useBeatMaker, Track } from '@/hooks/useBeatMaker'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { calculatePitchShift, validatePitchShift } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'

export default function BeatMakerPage() {
  const searchParams = useSearchParams()
  const [isPlaying, setIsPlaying] = useState(false)
  const [bpm, setBpm] = useState(120)
  const [transportKey, setTransportKey] = useState('C') // Add transport key state
  const [currentStep, setCurrentStep] = useState(0)
  const [layoutMode, setLayoutMode] = useState<'default' | 'vertical' | 'horizontal'>('default')
  const [savedSongArrangements, setSavedSongArrangements] = useState<any[]>([])
  const [showSaveSongDialog, setShowSaveSongDialog] = useState(false)
  const [songName, setSongName] = useState('')
  const [songDescription, setSongDescription] = useState('')
  const [songCategory, setSongCategory] = useState('')
  const [songGenre, setSongGenre] = useState('')
  const [songSubgenre, setSongSubgenre] = useState('')
  const [songTags, setSongTags] = useState('')
  const [showLoadSongDialog, setShowLoadSongDialog] = useState(false)
  const [showSaveSongTrackPatternDialog, setShowSaveSongTrackPatternDialog] = useState(false)
  const [showLoadSongTrackPatternDialog, setShowLoadSongTrackPatternDialog] = useState(false)
  const [selectedSongTrackForPattern, setSelectedSongTrackForPattern] = useState<number | null>(null)
  const [songTrackPatternName, setSongTrackPatternName] = useState('')
  const [songTrackPatternDescription, setSongTrackPatternDescription] = useState('')
  const [songTrackPatternCategory, setSongTrackPatternCategory] = useState('')
  const [songTrackPatternTags, setSongTrackPatternTags] = useState('')
  const [savedSongTrackPatterns, setSavedSongTrackPatterns] = useState<any[]>([])
  
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
  
  const [tracks, setTracks] = useState<Track[]>([])
  const [isAutoMode, setIsAutoMode] = useState(false) // Auto mode is on by default when no template is loaded
  const [steps, setSteps] = useState(64)
  
  // Initialize sequencer with first step active for each track when in auto mode
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
        console.log('[AUTO MODE] Initialized sequencer data for new session')
      } else {
        console.log('[AUTO MODE] Skipping initialization - sequencer data already exists')
      }
    }
  }, [isAutoMode, steps]) // Remove tracks dependency to prevent clearing patterns
  const [showSampleLibrary, setShowSampleLibrary] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState<number | null>(null)
  const [showPianoRoll, setShowPianoRoll] = useState(false)
  const [pianoRollTrack, setPianoRollTrack] = useState<number | null>(null)
  const [showAudioPianoRoll, setShowAudioPianoRoll] = useState(false)
  const [audioPianoRollNotes, setAudioPianoRollNotes] = useState<any[]>([])
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

  // Helper to check if any track has a valid audio file
  const hasLoadedAudio = tracks.some(track => track.audioUrl && track.audioUrl !== 'undefined')

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
    debugPianoRollPlayback
  } = useBeatMaker(tracks, steps, bpm)

  // Custom playStep function that includes MIDI playback
  const customPlayStep = useCallback((step: number) => {
    tracks.forEach(track => {
      const shouldPlay = sequencerData[track.id]?.[step]
      
      // Handle MIDI notes
      if (track.name === 'MIDI' && track.midiNotes && track.midiNotes.length > 0 && shouldPlay) {
        const notesAtStep = track.midiNotes.filter(note => note.startStep === step)
        notesAtStep.forEach(note => {
          console.log(`[DEBUG] Playing MIDI note: ${note.note} at step ${step}`)
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

  // Handle loading patterns from URL parameters
  useEffect(() => {
    if (searchParams) {
      const loadPatternId = searchParams.get('load-pattern')
      if (loadPatternId) {
        console.log(`[BEAT MAKER] Loading pattern from URL: ${loadPatternId}`)
        loadPatternFromDatabase(loadPatternId)
      }
    }
  }, [searchParams])

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

      // Turn off auto mode when a template/pattern is loaded
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
    } catch (error) {
      console.error('Error loading pattern from database:', error)
    }
  }

  // Song arrangement state (after useBeatMaker hook)
  const [savedPatterns, setSavedPatterns] = useState<{id: string, name: string, tracks: Track[], sequencerData: any, bpm: number, transportKey: string, steps: number, trackKey?: string, originalKey?: string, pitchShift?: number}[]>([])
  const [activeTab, setActiveTab] = useState('sequencer')
  const [lastLoadedPattern, setLastLoadedPattern] = useState<string | null>(null)
  const [showPatternDetails, setShowPatternDetails] = useState(true)
  
  // Song arrangement pattern assignments: {trackId: {barIndex: patternId}}
  const [songPatternAssignments, setSongPatternAssignments] = useState<{[trackId: number]: {[barIndex: number]: string}}>({})
  const [selectedPatternForPlacement, setSelectedPatternForPlacement] = useState<string | null>(null)
  
  // Debug: Log initial state
  useEffect(() => {
    console.log('[INIT DEBUG] songPatternAssignments initialized:', songPatternAssignments)
  }, [])
  
  // Current sequencer patterns - these are the patterns currently active in the sequencer
  const [currentSequencerPatterns, setCurrentSequencerPatterns] = useState<{id: string, name: string, tracks: Track[], sequencerData: any, bpm: number, transportKey: string, steps: number, trackKey?: string, originalKey?: string, pitchShift?: number, trackBpm?: number, originalBpm?: number, playbackRate?: number}[]>([])
  
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
  
  // Function to get just the track type name (first word)
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
    solo: boolean,
    eq: { low: number, mid: number, high: number },
    effects: { reverb: number, delay: number }
  }}>({})

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
        setMixerSettings(prev => ({
          ...prev,
          [track.id]: {
            volume: 0.7,
            pan: 0,
            mute: false,
            solo: false,
            eq: { low: 0, mid: 0, high: 0 },
            effects: { reverb: 0, delay: 0 }
          }
        }))
      }
    })
  }, [tracks, mixerSettings])

  // Monitor songPatternAssignments state changes
  useEffect(() => {
    console.log(`[STATE DEBUG] songPatternAssignments changed:`, songPatternAssignments)
    console.log(`[STATE DEBUG] Has active arrangement:`, Object.values(songPatternAssignments).some(trackAssignments => 
      Object.keys(trackAssignments).length > 0
    ))
  }, [songPatternAssignments])

  // Initialize song arrangement for each track (32 bars)
  useEffect(() => {
    // This effect is no longer needed as song playback is automatic
    // setSongArrangement(prev => {
    //   const newArrangement = { ...prev }
    //   let hasChanges = false
      
    //   tracks.forEach(track => {
    //     if (!newArrangement[track.id]) {
    //       newArrangement[track.id] = new Array(32).fill(false)
    //       hasChanges = true
    //     }
    //   })
      
    //   if (hasChanges) {
    //     return newArrangement
    //   }
      
    //   return prev
    // })
  }, [tracks.length]) // Only depend on tracks length to avoid unnecessary re-runs

  // Assign a pattern to a track at a specific bar
  const assignPatternToTrack = (trackId: number, barPosition: number, patternId: string | null) => {
    console.log(`[PATTERN ASSIGNMENT DEBUG] Assigning pattern ${patternId} to track ${trackId} at bar ${barPosition}`)
    
    setSongPatternAssignments(prev => {
      const newAssignments = { ...prev }
      
      if (!newAssignments[trackId]) {
        newAssignments[trackId] = {}
      }
      
      if (patternId) {
        // Assign the pattern
        newAssignments[trackId][barPosition] = patternId
        console.log(`[PATTERN ASSIGNMENT DEBUG] ✓ Assigned pattern ${patternId} to track ${trackId} at bar ${barPosition}`)
      } else {
        // Remove the pattern assignment
        delete newAssignments[trackId][barPosition]
        console.log(`[PATTERN ASSIGNMENT DEBUG] ✓ Removed pattern from track ${trackId} at bar ${barPosition}`)
      }
      
      console.log(`[PATTERN ASSIGNMENT DEBUG] New assignments for track ${trackId}:`, newAssignments[trackId])
      console.log(`[PATTERN ASSIGNMENT DEBUG] Complete new assignments:`, newAssignments)
      return newAssignments
    })
  }
  
  // Get the pattern assigned to a track at a specific bar
  const getAssignedPattern = (trackId: number, barPosition: number) => {
    return songPatternAssignments[trackId]?.[barPosition] || null
  }

  // Calculate playhead base position (start of current bar)
  const getPlayheadBasePosition = () => {
    let position = 0
    for (let bar = 0; bar < songPlayback.currentBar; bar++) {
      // Use the sequencer's current step count for consistent bar width
      const sequencerSteps = steps
      // Each step should be 4px wide, so a 16-step pattern should be 64px wide, 32-step = 128px, 64-step = 256px
      const barWidth = Math.max(64, sequencerSteps * 4)
      position += barWidth
    }
    return position
  }

  // Calculate playhead offset within the current bar based on sequencer step count
  const getPlayheadOffset = () => {
    if (!songPlayback.isPlaying) return 0
    
    const currentBar = songPlayback.currentBar
    const currentStep = songPlaybackRef.current.currentStep || 0
    
    // Use the sequencer's current step count for consistent measuring
    const sequencerSteps = steps
    
    // Calculate step position within the current bar
    const stepInBar = currentStep % sequencerSteps
    
    // Calculate bar width based on sequencer step count
    // Each step should be 4px wide, so a 16-step pattern should be 64px wide, 32-step = 128px, 64-step = 256px
    const barWidth = Math.max(64, sequencerSteps * 4)
    
    // Calculate offset: each step is barWidth / sequencerSteps wide
    const stepWidth = barWidth / sequencerSteps
    const offset = stepInBar * stepWidth
    
    return offset
  }
  
  // Select a pattern for placement
  const selectPatternForPlacement = (patternId: string) => {
    setSelectedPatternForPlacement(patternId)
  }
  
  // Clear pattern selection
  const clearPatternSelection = () => {
    setSelectedPatternForPlacement(null)
  }
  
  // Create individual track patterns from current sequencer state
  const createCurrentTrackPatterns = () => {
    return tracks.map(track => {
      const trackPattern = {
        id: `track-${track.id}`,
        name: track.name,
        tracks: [track],
        sequencerData: { [track.id]: sequencerData[track.id] || [] },
        bpm: bpm,
        transportKey: transportKey,
        steps: steps,
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

  // Clear all arrangements
  const clearAllArrangements = () => {
    // This function is no longer needed as song playback is automatic
    // setSongArrangement(prev => {
    //   const cleared: {[trackId: number]: boolean[]} = {}
    //   tracks.forEach(track => {
    //     cleared[track.id] = new Array(32).fill(false)
    //   })
    //   return cleared
    // })
  }

  // Song playback state
  const [songPlayback, setSongPlayback] = useState({
    isPlaying: false,
    currentBar: 0
  })
  const songPlaybackRef = useRef<{
    sequence: any | null
    currentStep: number
    players: {[trackId: number]: any}
  }>({
    sequence: null,
    currentStep: 0,
    players: {}
  })

  // Initialize song players separately from sequencer
  useEffect(() => {
    const initializeSongPlayers = async () => {
      // Clean up existing song players
      Object.values(songPlaybackRef.current.players || {}).forEach(player => {
        try {
          if (player.state === 'started') {
            player.stop()
          }
          player.dispose()
        } catch (error) {
          console.warn('[SONG] Error disposing player:', error)
        }
      })
      songPlaybackRef.current.players = {}

      // Create separate players for song playback
      for (const track of tracks) {
        if (track.audioUrl && track.audioUrl !== 'undefined') {
          try {
            // Use dynamic import to ensure Tone is available
            const Tone = await import('tone')
            const player = new Tone.Player(track.audioUrl).toDestination()
            
            // Apply the same tempo adjustments as the sequencer
            if (track.playbackRate && track.playbackRate !== 1) {
              const precisePlaybackRate = Math.round(track.playbackRate * 10000) / 10000
              player.playbackRate = precisePlaybackRate
              console.log(`[SONG INIT] Track ${track.name} playback rate: ${precisePlaybackRate} (${track.currentBpm}/${track.originalBpm})`)
            }
            
            songPlaybackRef.current.players[track.id] = player
          } catch (error) {
            console.error(`[SONG] Failed to create player for track ${track.id}:`, error)
          }
        }
      }
    }

    initializeSongPlayers()
  }, [tracks])

  // Play song arrangement with separate audio system
  const playSongArrangement = async () => {
    if (songPlayback.isPlaying) {
      // Stop song playback
      setSongPlayback(prev => ({ ...prev, isPlaying: false }))
      
      // Stop Tone.js sequence
      if (songPlaybackRef.current.sequence) {
        songPlaybackRef.current.sequence.stop()
        songPlaybackRef.current.sequence.dispose()
        songPlaybackRef.current.sequence = null
      }
      
      // Stop Tone.js transport
      import('tone').then(Tone => {
        Tone.Transport.stop()
      }).catch(console.warn)
      
      // Stop any playing song samples
      Object.values(songPlaybackRef.current.players || {}).forEach(player => {
        try {
          if (player.state === 'started') {
            player.stop()
          }
        } catch (error) {
          console.warn('[SONG] Error stopping player:', error)
        }
      })
      
      return
    }

    // Stop sequencer if it's playing - ensure it's completely stopped
    if (isPlaying) {
      console.log('[SONG ARRANGEMENT] Stopping regular sequencer to prevent interference')
      stopSequence()
      // Force stop any ongoing sequencer playback
      setIsPlaying(false)
    }

    // Check if any patterns are assigned to tracks - use a more robust check
    const hasActiveArrangement = Object.values(songPatternAssignments).some(trackAssignments => 
      Object.keys(trackAssignments).length > 0
    )
    
    console.log('[SONG DEBUG] Pattern assignments:', songPatternAssignments)
    console.log('[SONG DEBUG] Available patterns:', currentSequencerPatterns)
    console.log('[SONG DEBUG] Has active arrangement:', hasActiveArrangement)
    
    // Debug: Show detailed pattern assignments
    console.log('[SONG DEBUG] === DETAILED PATTERN ASSIGNMENTS ===')
    Object.entries(songPatternAssignments).forEach(([trackId, trackAssignments]) => {
      const track = tracks.find(t => t.id === parseInt(trackId))
      console.log(`[SONG DEBUG] Track ${track?.name || trackId}:`, trackAssignments)
      Object.entries(trackAssignments).forEach(([bar, patternId]) => {
        const pattern = currentSequencerPatterns.find(p => p.id === patternId)
        console.log(`[SONG DEBUG]   Bar ${bar}: ${patternId} (${pattern?.name || 'Unknown'})`)
      })
    })
    console.log('[SONG DEBUG] === END DETAILED ASSIGNMENTS ===')
    
    // More detailed check for active arrangements
    const totalAssignments = Object.values(songPatternAssignments).reduce((total, trackAssignments) => 
      total + Object.keys(trackAssignments).length, 0
    )
    console.log('[SONG DEBUG] Total pattern assignments:', totalAssignments)
    
    if (!hasActiveArrangement || totalAssignments === 0) {
      console.log('[SONG DEBUG] ❌ No active arrangements found - showing alert')
      alert('No patterns assigned! Select patterns and assign them to tracks in the timeline.')
      return
    }
    
    console.log('[SONG DEBUG] ✓ Active arrangements found - proceeding with playback')

    // Start Tone.js audio context
    const Tone = await import('tone')
    await Tone.start()
    
    // Synchronize Tone.js Transport BPM with sequencer BPM
    Tone.Transport.bpm.value = bpm
    console.log(`[SONG ARRANGEMENT] Starting with BPM: ${bpm}`)
    
    // Start song playback
    setSongPlayback(prev => ({ ...prev, isPlaying: true, currentBar: 0 }))
    songPlaybackRef.current.currentStep = 0
    
    // Start the song step sequencer using Tone.js
    startSongStepSequencer()
  }

  // Separate step sequencer for song playback using Tone.js
  const startSongStepSequencer = async () => {
    const Tone = await import('tone')
    
    // Double-check that we have active arrangements before starting
    const hasActiveArrangement = Object.values(songPatternAssignments).some(trackAssignments => 
      Object.keys(trackAssignments).length > 0
    )
    
    if (!hasActiveArrangement) {
      console.log('[SONG SEQUENCE] ❌ No active arrangements found - stopping song playback')
      setSongPlayback(prev => ({ ...prev, isPlaying: false }))
      return
    }
    
    console.log('[SONG SEQUENCE] ✓ Active arrangements found - starting sequence')
    
    // Stop any existing sequence
    if (songPlaybackRef.current.sequence) {
      songPlaybackRef.current.sequence.stop()
      songPlaybackRef.current.sequence.dispose()
    }
    
    // Calculate the total number of steps needed for the song arrangement
    // Use transport steps to determine pattern boundaries
    let maxSteps = 16 // Default minimum
    Object.values(songPatternAssignments).forEach(trackAssignments => {
      Object.entries(trackAssignments).forEach(([barStr, patternId]) => {
        const bar = parseInt(barStr)
        const pattern = currentSequencerPatterns.find(p => p.id === patternId)
        if (pattern) {
          // Use transport steps, not pattern steps
          const transportSteps = steps
          const barEndStep = (bar + 1) * transportSteps
          maxSteps = Math.max(maxSteps, barEndStep)
        }
      })
    })
    
    console.log(`[SONG SEQUENCE] Total steps for song arrangement: ${maxSteps}`)
    
    // Set the BPM for Tone.js Transport to match the sequencer
    Tone.Transport.bpm.value = bpm
    
    // Calculate step duration to match sequencer timing
    const stepDuration = 60 / bpm / 4 // 16th note duration - same as sequencer
    
    // Create a sequence that uses the same timing as the sequencer
    songPlaybackRef.current.sequence = new Tone.Sequence((time, step) => {
      songPlaybackRef.current.currentStep = step
      console.log(`[SONG SEQUENCE] Playing step ${step} at time ${time}, BPM: ${bpm}, stepDuration: ${stepDuration}s`)
      playSongStep(step)
      
      // Update bar position based on transport step count
      // Find which bar this step belongs to using transport steps
      let currentBar = 0
      const maxBars = Math.max(64, Math.ceil(128 / steps) * 4)
      for (let bar = 0; bar < maxBars; bar++) {
        // Check if any pattern is assigned to this bar
        const hasPattern = Object.values(songPatternAssignments).some(trackAssignments => {
          const patternId = trackAssignments[bar]
          if (patternId) {
            const pattern = currentSequencerPatterns.find(p => p.id === patternId)
            if (pattern) {
              // Use transport steps, not pattern steps
              const transportSteps = steps
              const barStartStep = bar * transportSteps
              const barEndStep = (bar + 1) * transportSteps - 1
              return step >= barStartStep && step <= barEndStep
            }
          }
          return false
        })
        
        if (hasPattern) {
          currentBar = bar
          break
        }
      }
      
      // Update bar position when we start a new bar
      const previousBar = songPlayback.currentBar
      if (currentBar !== previousBar) {
        console.log(`[SONG SEQUENCE] Moving to bar ${currentBar + 1}`)
        setSongPlayback(prev => ({ ...prev, currentBar }))
      }
    }, Array.from({ length: maxSteps }, (_, i) => i), stepDuration)
    
    // Start the sequence
    songPlaybackRef.current.sequence.start(0)
    Tone.Transport.start()
  }

  // Play a step in the song arrangement
  const playSongStep = (step: number) => {
    console.log(`[SONG STEP DEBUG] === Step ${step} ===`)
    console.log(`[SONG STEP DEBUG] Current songPatternAssignments:`, JSON.stringify(songPatternAssignments, null, 2))
    
    tracks.forEach(track => {
      const player = songPlaybackRef.current.players[track.id]
      const trackAssignments = songPatternAssignments[track.id] || {}
      
      // Special debug for Melody Loop
      if (track.name.toLowerCase().includes('melody')) {
        console.log(`[MELODY DEBUG] 🎵 Melody Loop Step ${step}: assignments=`, trackAssignments)
      }
      
      console.log(`[SONG STEP DEBUG] Track ${track.name} (ID: ${track.id}) assignments:`, trackAssignments)
      
      // Use the SAME logic as sequencer grid - simple step-by-step calculation
      // Find which pattern is assigned to this track at this step
      let assignedPatternId: string | null = null
      
      // Check each bar assignment to see if this step falls within it
      // Use the transport's step count to determine pattern boundaries
      Object.entries(trackAssignments).forEach(([barStr, patternId]) => {
        const bar = parseInt(barStr)
        const pattern = currentSequencerPatterns.find(p => p.id === patternId)
        if (pattern) {
          // Use the transport's step count, not the pattern's step count
          const transportSteps = steps // This is the key fix - use transport steps
          const barStartStep = bar * transportSteps
          const barEndStep = (bar + 1) * transportSteps - 1
          
          console.log(`[SONG STEP DEBUG] Bar ${bar}: patternId=${patternId}, transportSteps=${transportSteps}, barStartStep=${barStartStep}, barEndStep=${barEndStep}, step=${step}`)
          
          if (step >= barStartStep && step <= barEndStep) {
            assignedPatternId = patternId
            console.log(`[SONG STEP DEBUG] ✓ Step ${step} belongs to Bar ${bar} with pattern ${patternId}`)
          }
        }
      })
      
      // If no pattern is assigned to this track at this step, don't play
      if (!assignedPatternId) {
        console.log(`[SONG STEP DEBUG] ❌ Track ${track.name}, Step ${step}: No pattern assigned, skipping`)
        
        // Special debug for Melody Loop
        if (track.name.toLowerCase().includes('melody')) {
          console.log(`[MELODY DEBUG] ❌ Melody Loop Step ${step}: No pattern assigned, should NOT play`)
        }
        return
      }
      
      console.log(`[SONG STEP DEBUG] ✓ Track ${track.name}, Step ${step}: Pattern assigned (assignedPatternId=${assignedPatternId})`)
      
      // Special debug for Melody Loop
      if (track.name.toLowerCase().includes('melody')) {
        console.log(`[MELODY DEBUG] ✓ Melody Loop Step ${step}: Pattern assigned`)
      }
      
      // Find the assigned pattern
      const assignedPattern = currentSequencerPatterns.find(p => p.id === assignedPatternId)
      if (!assignedPattern) {
        console.log(`[SONG STEP DEBUG] ❌ Track ${track.name}, Step ${step}: Pattern ${assignedPatternId} not found in currentSequencerPatterns`)
        return
      }
      
      console.log(`[SONG STEP DEBUG] ✓ Track ${track.name}, Step ${step}: Found pattern ${assignedPattern.name}`)
      
      // Get the pattern data for this track
      let patternSequencerData: boolean[] = []
      
      if (assignedPattern.id.startsWith('track-')) {
        // Track pattern - use the track's specific data
        patternSequencerData = assignedPattern.sequencerData[track.id] || []
        console.log(`[SONG STEP DEBUG] Track pattern: using track-specific data for track ${track.id}`)
      } else {
        // Full pattern - use the track's data from the pattern
        patternSequencerData = assignedPattern.sequencerData[track.id] || []
        console.log(`[SONG STEP DEBUG] Full pattern: using track data from pattern for track ${track.id}`)
      }
      
      console.log(`[SONG STEP DEBUG] Pattern sequencer data:`, patternSequencerData)
      
      // Use the transport's step count to determine pattern playback
      const transportSteps = steps // Use transport steps, not pattern steps
      
      // Calculate the step within the pattern using transport steps
      // This ensures patterns respect the transport's step count
      const stepInPattern = step % transportSteps
      
      console.log(`[SONG STEP DEBUG] Transport steps: ${transportSteps}, step in pattern: ${stepInPattern}`)
      
      // Check if this track should play at the current step within the pattern
      const shouldPlayStep = patternSequencerData[stepInPattern]
      
      console.log(`[SONG STEP DEBUG] Should play step: ${shouldPlayStep} (patternSequencerData[${stepInPattern}] = ${patternSequencerData[stepInPattern]})`)
      
      // Debug logging for pattern playback
      if (assignedPattern && patternSequencerData.length > 0) {
        console.log(`[SONG STEP DEBUG] ✓ Track ${track.name}, Step ${stepInPattern}/${transportSteps}: patternData=${patternSequencerData}, shouldPlay=${shouldPlayStep}, patternId=${assignedPatternId}`)
      } else if (assignedPattern) {
        console.log(`[SONG STEP DEBUG] ⚠️ Track ${track.name}: Pattern found but no sequencer data`)
      }
      
      if (shouldPlayStep && assignedPattern && player && track.audioUrl && track.audioUrl !== 'undefined') {
        console.log(`[SONG STEP DEBUG] 🔊 PLAYING: Track ${track.name}, Step ${step}`)
        
        // Special debug for Melody Loop
        if (track.name.toLowerCase().includes('melody')) {
          console.log(`[MELODY DEBUG] 🔊 PLAYING: Melody Loop Step ${step}, Pattern: ${assignedPattern.name}`)
        }
        
        try {
          // Stop if already playing to prevent overlap
          if (player.state === 'started') {
            player.stop()
          }
          
          // Apply the same tempo adjustments as the sequencer
          if (track.playbackRate && track.playbackRate !== 1) {
            const precisePlaybackRate = Math.round(track.playbackRate * 10000) / 10000
            player.playbackRate = precisePlaybackRate
            console.log(`[SONG TEMPO] Track ${track.name} playback rate: ${precisePlaybackRate} (${track.currentBpm}/${track.originalBpm})`)
          }
          
          // Start with proper timing using Tone.js
          player.start()
        } catch (error) {
          console.warn(`[SONG] Error playing step for track ${track.name}:`, error)
        }
      } else {
        console.log(`[SONG STEP DEBUG] 🔇 NOT PLAYING: Track ${track.name}, Step ${step} - shouldPlayStep=${shouldPlayStep}, assignedPattern=${!!assignedPattern}, player=${!!player}, audioUrl=${!!track.audioUrl}`)
        
        // Special debug for Melody Loop
        if (track.name.toLowerCase().includes('melody')) {
          console.log(`[MELODY DEBUG] 🔇 NOT PLAYING: Melody Loop Step ${step} - shouldPlayStep=${shouldPlayStep}, assignedPattern=${!!assignedPattern}, player=${!!player}, audioUrl=${!!track.audioUrl}`)
        }
      }
    })
  }

  // Debug function to show current pattern assignments
  const debugPatternAssignments = () => {
    console.log('[DEBUG] === CURRENT PATTERN ASSIGNMENTS ===')
    console.log('[DEBUG] songPatternAssignments state:', songPatternAssignments)
    console.log('[DEBUG] Has active arrangement:', Object.values(songPatternAssignments).some(trackAssignments => 
      Object.keys(trackAssignments).length > 0
    ))
    
    Object.entries(songPatternAssignments).forEach(([trackId, trackAssignments]) => {
      const track = tracks.find(t => t.id === parseInt(trackId))
      console.log(`[DEBUG] Track ${track?.name || trackId} (ID: ${trackId}):`)
      if (Object.keys(trackAssignments).length === 0) {
        console.log(`[DEBUG]   No patterns assigned`)
      } else {
        Object.entries(trackAssignments).forEach(([bar, patternId]) => {
          const pattern = currentSequencerPatterns.find(p => p.id === patternId)
          console.log(`[DEBUG]   Bar ${bar}: ${patternId} (${pattern?.name || 'Unknown'})`)
        })
      }
    })
    console.log('[DEBUG] === END PATTERN ASSIGNMENTS ===')
  }

  // Clean up song playback on unmount
  useEffect(() => {
    return () => {
      // Stop Tone.js sequence
      if (songPlaybackRef.current.sequence) {
        songPlaybackRef.current.sequence.stop()
        songPlaybackRef.current.sequence.dispose()
      }
      
      // Stop Tone.js transport
      import('tone').then(Tone => {
        Tone.Transport.stop()
      }).catch(console.warn)
      
      Object.values(songPlaybackRef.current.players || {}).forEach(player => {
        try {
          if (player.state === 'started') {
            player.stop()
          }
          player.dispose()
        } catch (error) {
          console.warn('[SONG] Error disposing player on unmount:', error)
        }
      })
    }
  }, [])



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
    loadSavedSongArrangements()
    loadSavedSongTrackPatterns()
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
      alert('Please enter a pattern name')
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
      alert('Please enter a pattern name')
      return
    }
    
    if (!selectedTrackForPattern) {
      alert('No track selected')
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
      // Turn off auto mode when a template/pattern is loaded
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
    
    // Turn off auto mode when a template/pattern is loaded
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
    alert(`Loaded pattern: ${selectedPattern.name}`)
    console.log(`Loaded pattern "${selectedPattern.name}" - sequencer data and track metadata updated`)
    
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
  }



  const updateEQ = (trackId: number, band: 'low' | 'mid' | 'high', value: number) => {
    setMixerSettings(prev => ({
      ...prev,
      [trackId]: {
        ...prev[trackId],
        eq: {
          ...prev[trackId]?.eq,
          [band]: value
        }
      }
    }))
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
            
            // Color coding: green (0-60%), yellow (60-85%), red (85-100%)
            let color = 'bg-gray-800'
            if (isActive || isPeak) {
              if (segmentLevel > 0.85) color = 'bg-red-500'
              else if (segmentLevel > 0.6) color = 'bg-yellow-500'
              else color = 'bg-green-500'
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

  // Add keyboard shortcut handling
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if user is typing in an input field
      const isTyping = event.target instanceof HTMLInputElement ||
                      event.target instanceof HTMLTextAreaElement ||
                      (event.target instanceof HTMLElement && event.target.contentEditable === 'true')

      // Only handle spacebar if not typing
      if (event.code === 'Space' && !isTyping) {
        event.preventDefault()
        
        if (activeTab === 'song') {
          console.log('[SPACEBAR DEBUG] Spacebar pressed in song tab')
          console.log('[SPACEBAR DEBUG] Current songPatternAssignments:', songPatternAssignments)
          console.log('[SPACEBAR DEBUG] Has active arrangement:', Object.values(songPatternAssignments).some(trackAssignments => 
            Object.keys(trackAssignments).length > 0
          ))
          
          // Stop sequencer if it's playing before starting song arrangement
          if (isPlaying) {
            stopSequence()
          }
          // Play song arrangement in Song tab
          playSongArrangement()
        } else if (hasLoadedAudio) {
          // Stop song arrangement if it's playing before starting sequencer
          if (songPlayback.isPlaying) {
            setSongPlayback(prev => ({ ...prev, isPlaying: false }))
            
            // Stop Tone.js sequence
            if (songPlaybackRef.current.sequence) {
              songPlaybackRef.current.sequence.stop()
              songPlaybackRef.current.sequence.dispose()
              songPlaybackRef.current.sequence = null
            }
            
            // Stop Tone.js transport
            import('tone').then(Tone => {
              Tone.Transport.stop()
            }).catch(console.warn)
            
            // Stop any playing song samples
            Object.values(songPlaybackRef.current.players || {}).forEach(player => {
              try {
                if (player.state === 'started') {
                  player.stop()
                }
              } catch (error) {
                console.warn('[SPACEBAR] Error stopping song player:', error)
              }
            })
          }
          // Play current sequencer pattern in Sequencer tab
          handlePlayPause()
        }
      }

      // Clear pattern selection with Escape key
      // if (event.code === 'Escape' && selectedPatternForPlacement) {
      //   event.preventDefault()
      //   setSelectedPatternForPlacement(null)
      // }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPlaying, hasLoadedAudio, activeTab, songPlayback.isPlaying, songPatternAssignments])

  const handlePlayPause = () => {
    console.log(`[MAIN TRANSPORT] Play/Pause called. isPlaying: ${isPlaying}, pianoRollData:`, pianoRollData)
    if (isPlaying) {
      stopSequence()
    } else {
      // Stop song arrangement if it's playing
      if (songPlayback.isPlaying) {
        setSongPlayback(prev => ({ ...prev, isPlaying: false }))
        
        // Stop Tone.js sequence
        if (songPlaybackRef.current.sequence) {
          songPlaybackRef.current.sequence.stop()
          songPlaybackRef.current.sequence.dispose()
          songPlaybackRef.current.sequence = null
        }
        
        // Stop Tone.js transport
        import('tone').then(Tone => {
          Tone.Transport.stop()
        }).catch(console.warn)
        
        // Stop any playing song samples
        Object.values(songPlaybackRef.current.players || {}).forEach(player => {
          try {
            if (player.state === 'started') {
              player.stop()
            }
          } catch (error) {
            console.warn('[SEQUENCER] Error stopping song player:', error)
          }
        })
      }
      playSequence()
    }
  }

  const handleReset = () => {
    stopSequence()
    setCurrentStep(0)
    
    // Also stop song playback if it's running
    if (songPlayback.isPlaying) {
      setSongPlayback(prev => ({ ...prev, isPlaying: false }))
      
      // Stop Tone.js sequence
      if (songPlaybackRef.current.sequence) {
        songPlaybackRef.current.sequence.stop()
        songPlaybackRef.current.sequence.dispose()
        songPlaybackRef.current.sequence = null
      }
      
      // Stop Tone.js transport
      import('tone').then(Tone => {
        Tone.Transport.stop()
      }).catch(console.warn)
      
      // Stop any playing song samples
      Object.values(songPlaybackRef.current.players || {}).forEach(player => {
        try {
          if (player.state === 'started') {
            player.stop()
          }
        } catch (error) {
          console.warn('[RESET] Error stopping song player:', error)
        }
      })
    }
  }

  const handleTrackAudioSelect = (trackId: number, audioUrlOrPath: string, audioName?: string, metadata?: {
    bpm?: number
    key?: string
    audio_type?: string
    tags?: string[]
  }) => {
    const publicUrl = getPublicAudioUrl(audioUrlOrPath)
    setTracks(prev => prev.map(track => 
      track.id === trackId ? { 
        ...track, 
        audioUrl: publicUrl,
        audioName: audioName || null,
        // Initialize tempo properties with default values or use metadata
        originalBpm: metadata?.bpm || 120, // Use metadata BPM if available
        currentBpm: metadata?.bpm || 120,
        playbackRate: 1.0,
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

  const handleOpenAudioPianoRoll = () => {
    setShowAudioPianoRoll(true)
  }

  const handleAudioPianoRollNotesChange = (notes: any[]) => {
    setAudioPianoRollNotes(notes)
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
      
      // Update song arrangement player tempo
      const songPlayer = songPlaybackRef.current.players[trackId]
      if (songPlayer) {
        const precisePlaybackRate = Math.round(tempoData.playbackRate * 10000) / 10000
        songPlayer.playbackRate = precisePlaybackRate
        console.log(`[SONG TEMPO UPDATE] Track ${currentTrack.name} song player playback rate: ${precisePlaybackRate}`)
      }
      
      // If this is an Original BPM change, update the database
      if (isOriginalBpmChange && currentTrack.audioUrl) {
        updateAudioFileBpmInDatabase(currentTrack, tempoData.originalBpm)
      }
      
      // Force reload of samples to ensure playback rate is applied correctly
      console.log(`[TEMPO CHANGE] Forcing sample reload for track ${trackId} with playback rate ${tempoData.playbackRate}`)
      
      // For Original BPM changes, we need to be more careful about the reload timing
      if (isOriginalBpmChange) {
        // Add a longer delay for Original BPM changes to ensure clean reload
        setTimeout(async () => {
          try {
            await forceReloadTrackSamples(trackId)
            console.log(`[TEMPO CHANGE] Successfully reloaded track ${currentTrack.name} after Original BPM change`)
            
            setTimeout(() => {
              quantizeTrackTiming(trackId)
            }, 200)
          } catch (error) {
            console.error(`[TEMPO CHANGE] Failed to reload track ${currentTrack.name}:`, error)
          }
        }, 300) // Increased delay for Original BPM changes
      } else {
        // Regular tempo change - use normal timing
        setTimeout(async () => {
          try {
            await forceReloadTrackSamples(trackId)
            console.log(`[TEMPO CHANGE] Successfully reloaded track ${currentTrack.name} after tempo change`)
            
            setTimeout(() => {
              quantizeTrackTiming(trackId)
            }, 200)
          } catch (error) {
            console.error(`[TEMPO CHANGE] Failed to reload track ${currentTrack.name}:`, error)
          }
        }, 150) // Shorter delay for regular tempo changes
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

  const handleBpmSave = () => {
    const newBpm = parseFloat(bpmInputValue)
    if (newBpm >= 60 && newBpm <= 200) {
      setBpm(newBpm)
      
      // Synchronize Tone.js Transport BPM
      import('tone').then(Tone => {
        Tone.Transport.bpm.value = newBpm
        console.log(`[TRANSPORT BPM] Tone.js Transport BPM set to: ${newBpm}`)
      }).catch(console.warn)
      
      // Restart song arrangement if it's playing to sync with new BPM
      if (songPlayback.isPlaying) {
        console.log(`[TRANSPORT BPM] Restarting song arrangement to sync with new BPM: ${newBpm}`)
        // Stop current song arrangement
        setSongPlayback(prev => ({ ...prev, isPlaying: false }))
        if (songPlaybackRef.current.sequence) {
          songPlaybackRef.current.sequence.stop()
          songPlaybackRef.current.sequence.dispose()
          songPlaybackRef.current.sequence = null
        }
        
        // Restart with new BPM after a short delay
        setTimeout(() => {
          startSongStepSequencer()
        }, 100)
      }
      
      // Synchronize all tracks when transport BPM changes
      // BUT respect M-T/T-M mode - only sync tracks in T-M mode
      if (melodyLoopMode === 'transport-dominates') {
        console.log(`[TRANSPORT BPM] T-M mode: Syncing all tracks to new BPM: ${newBpm}`)
        tracks.forEach(track => {
          if (track.audioUrl && track.originalBpm) {
            // Recalculate playback rate for this track
            const newPlaybackRate = newBpm / track.originalBpm
            const precisePlaybackRate = Math.round(newPlaybackRate * 10000) / 10000
            
            // Update track state
            setTracks(prev => prev.map(t => 
              t.id === track.id ? { 
                ...t, 
                currentBpm: newBpm,
                playbackRate: precisePlaybackRate
              } : t
            ))
            
            // Force reload with new playback rate
            setTimeout(() => {
              forceReloadTrackSamples(track.id)
            }, 50 * track.id) // Stagger reloads to prevent conflicts
          }
        })
      } else {
        console.log(`[TRANSPORT BPM] M-T mode: Skipping track sync - Melody Loop controls transport`)
      }
    }
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

  const handleTransportKeyEdit = () => {
    setEditingTransportKey(true)
    setTransportKeyInputValue(transportKey)
  }

  const handleTransportKeySelect = (key: string) => {
    setTransportKey(key)
    setEditingTransportKey(false)
  }

  const handleTransportKeySave = () => {
    const newKey = transportKeyInputValue.trim().toUpperCase()
    if (newKey && /^[A-G][#b]?$/.test(newKey)) {
      setTransportKey(newKey)
    }
    setEditingTransportKey(false)
    setTransportKeyInputValue('')
  }

  const handleTransportKeyCancel = () => {
    setEditingTransportKey(false)
    setTransportKeyInputValue('')
  }

  // Function to toggle track lock
  const handleToggleTrackLock = (trackId: number) => {
    setTracks(prev => prev.map(track => 
      track.id === trackId ? { ...track, locked: !track.locked } : track
    ))
  }

  // Function to toggle track mute
  const handleToggleTrackMute = (trackId: number) => {
    setTracks(prev => prev.map(track => 
      track.id === trackId ? { ...track, mute: !track.mute } : track
    ))
  }

  // Copy key from one track to another
  const handleCopyTrackKey = (fromTrackId: number, toTrackId: number, key: string) => {
    setTracks(prev => prev.map(track => 
      track.id === toTrackId ? { ...track, key: key } : track
    ))
    console.log(`Copied key ${key} from track ${fromTrackId} to track ${toTrackId}`)
  }

  // Copy BPM from one track to another
  const handleCopyTrackBpm = (fromTrackId: number, toTrackId: number, bpm: number) => {
    setTracks(prev => prev.map(track => 
      track.id === toTrackId ? { ...track, bpm: bpm } : track
    ))
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
      
      if (originalTrack.key) {
        query = query.eq('key', originalTrack.key)
      }
      
              // Add genre filter if a genre is selected and locked
        if (selectedGenre && selectedGenre.name && isGenreLocked) {
          query = query.eq('genre', selectedGenre.name)
          console.log(`[DEBUG] Duplicate shuffle filtering by locked genre: ${selectedGenre.name}`)
        }
        
        // Add subgenre filter if a subgenre is selected and locked
        if (selectedSubgenre && selectedSubgenre.trim() && isSubgenreLocked) {
          query = query.ilike('subgenre', selectedSubgenre.trim())
          console.log(`[DEBUG] Duplicate shuffle filtering by locked subgenre (case-insensitive): ${selectedSubgenre.trim()}`)
        }
      
      // Try to exclude current audio if it's a database ID
      if (originalTrack.audioUrl && !originalTrack.audioUrl.startsWith('http')) {
        query = query.neq('id', originalTrack.audioUrl)
      }
      
      const { data: shuffledAudio, error } = await query.limit(10)

      // Apply tempo tolerance filtering to prevent excessive time-stretching
      let filteredAudio = shuffledAudio || []
      if (filteredAudio.length > 0) {
        const tempoTolerance = 5 // ±5 BPM tolerance
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
          
          // Add genre filter if a genre is selected and locked
          if (selectedGenre && selectedGenre.name && isGenreLocked) {
            fallbackQuery = fallbackQuery.eq('genre', selectedGenre.name)
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
        name: `${originalTrack.name} (Shuffle)`,
        audioUrl: randomAudio.file_url,
        audioName: randomAudio.name,
        bpm: randomAudio.bpm,
        key: randomAudio.key,
        audio_type: randomAudio.audio_type,
        tags: randomAudio.tags || [],
        // Keep same sequencer pattern as parent
        locked: false, // Allow shuffling of the duplicate
        mute: false
      }

    // Add the duplicate track
    setTracks(prev => [...prev, duplicateTrack])
    
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
      color: trackColors[colorIndex]
    }
    
    setTracks(prev => [...prev, newTrack])
  }

  // Function to remove a track
  const removeTrack = (trackId: number) => {
    if (tracks.length > 1) { // Keep at least one track
      setTracks(prev => prev.filter(track => track.id !== trackId))
    }
  }

  // Function to reorder tracks
  const reorderTracks = (newOrder: Track[]) => {
    setTracks(newOrder)
  }

  // Function to shuffle audio files by type
  const handleShuffleAudio = async (trackId: number) => {
    try {
      const track = tracks.find(t => t.id === trackId)
      if (!track) return

      // Debug: Log the current state
      console.log(`[DEBUG] Shuffle triggered for track: ${track.name}`)
      console.log(`[DEBUG] Current state - selectedGenre:`, selectedGenre)
      console.log(`[DEBUG] Current state - selectedSubgenre:`, selectedSubgenre)
      console.log(`[DEBUG] Current state - isGenreLocked:`, isGenreLocked)
      console.log(`[DEBUG] Current state - isSubgenreLocked:`, isSubgenreLocked)
      console.log(`[DEBUG] Current state - selectedPacks:`, selectedPacks)
      console.log(`[DEBUG] Current state - isPackLocked:`, isPackLocked)

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
      
      console.log(`[DEBUG] User has ${allUserFiles?.length || 0} total audio files`)
      if (allUserFiles && allUserFiles.length > 0) {
        console.log('[DEBUG] Available audio types:', [...new Set(allUserFiles.map(f => f.audio_type))])
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
      console.log(`[DEBUG] Track: ${track.name}, Base: ${baseTrackName}, AudioType: ${audioType}`)
      if (!audioType) {
        console.log(`No audio type mapping found for track: ${track.name} (base: ${baseTrackName})`)
        console.log(`[DEBUG] Available track types:`, Object.keys(trackTypeMap))
        return
      }

      // Fetch audio files of the specific type using the new audio_type system
      let audioFiles: any[] = []
      
      // Build query with genre filtering if a genre is selected
      // Try to include files with BPM and key metadata first, but fall back if needed
      let query = supabase
        .from('audio_library_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('audio_type', audioType)
        .eq('is_ready', true) // Only include ready audio files
      
      // Add pack filter if packs are selected and locked
      if (selectedPacks.length > 0 && isPackLocked) {
        const packIds = selectedPacks.map(pack => pack.id)
        query = query.in('pack_id', packIds)
        console.log(`[DEBUG] Filtering by locked packs: ${selectedPacks.map(p => p.name).join(', ')} (${packIds.join(', ')})`)
      }
      
      // Flexible genre/subgenre filtering - handle both combinations
      if (selectedGenre && selectedGenre.name && isGenreLocked && selectedSubgenre && selectedSubgenre.trim() && isSubgenreLocked) {
        // When both genre and subgenre are selected, try both combinations
        console.log(`[DEBUG] Flexible filtering for: ${selectedGenre.name} + ${selectedSubgenre.trim()}`)
        
        // Try combination 1: genre=selectedGenre AND subgenre=selectedSubgenre
        let query1 = supabase
          .from('audio_library_items')
          .select('*')
          .eq('user_id', user.id)
          .eq('audio_type', audioType)
          .eq('is_ready', true) // Only include ready audio files
          .eq('genre', selectedGenre.name)
          .ilike('subgenre', selectedSubgenre.trim())
        
        // Add pack filter if locked
        if (selectedPacks.length > 0 && isPackLocked) {
          const packIds = selectedPacks.map(pack => pack.id)
          query1 = query1.in('pack_id', packIds)
        }
        
        console.log(`[DEBUG] Query 1: genre="${selectedGenre.name}" AND subgenre ILIKE "${selectedSubgenre.trim()}"`)
        const { data: files1, error: error1 } = await query1
        
        // Try combination 2: genre=selectedSubgenre AND subgenre=selectedGenre (swapped)
        let query2 = supabase
          .from('audio_library_items')
          .select('*')
          .eq('user_id', user.id)
          .eq('audio_type', audioType)
          .eq('is_ready', true) // Only include ready audio files
          .eq('genre', selectedSubgenre.trim())
          .ilike('subgenre', selectedGenre.name)
        
        // Add pack filter if locked
        if (selectedPacks.length > 0 && isPackLocked) {
          const packIds = selectedPacks.map(pack => pack.id)
          query2 = query2.in('pack_id', packIds)
        }
        
        console.log(`[DEBUG] Query 2: genre="${selectedSubgenre.trim()}" AND subgenre ILIKE "${selectedGenre.name}"`)
        const { data: files2, error: error2 } = await query2
        
        // Combine results
        const allFiles = [...(files1 || []), ...(files2 || [])]
        
        console.log(`[DEBUG] Found ${files1?.length || 0} files with ${selectedGenre.name} + ${selectedSubgenre.trim()}`)
        if (files1 && files1.length > 0) {
          console.log(`[DEBUG] Files from query 1:`, files1.map(f => ({ name: f.name, genre: f.genre, subgenre: f.subgenre })))
        }
        
        console.log(`[DEBUG] Found ${files2?.length || 0} files with ${selectedSubgenre.trim()} + ${selectedGenre.name}`)
        if (files2 && files2.length > 0) {
          console.log(`[DEBUG] Files from query 2:`, files2.map(f => ({ name: f.name, genre: f.genre, subgenre: f.subgenre })))
        }
        
        console.log(`[DEBUG] Total files found: ${allFiles.length}`)
        
        if (allFiles.length > 0) {
          // Filter files to prioritize those with BPM and key metadata
          const filesWithMetadata = allFiles.filter(f => f.bpm && f.key && f.bpm !== '' && f.key !== '')
          console.log(`[DEBUG] Found ${filesWithMetadata.length} files with BPM and key metadata`)
          
          if (filesWithMetadata.length > 0) {
            // Use files with metadata
            audioFiles = filesWithMetadata
            console.log(`[DEBUG] Using files with metadata:`, filesWithMetadata.slice(0, 3).map(f => ({ 
              name: f.name, 
              bpm: f.bpm,
              key: f.key,
              genre: f.genre, 
              subgenre: f.subgenre,
              audio_type: f.audio_type
            })))
          } else {
            // Fall back to all files if none have metadata
            console.log(`[DEBUG] No files with metadata found, using all files`)
            audioFiles = allFiles
            console.log(`[DEBUG] Sample files found:`, allFiles.slice(0, 3).map(f => ({ 
              name: f.name, 
              bpm: f.bpm || 'none',
              key: f.key || 'none',
              genre: f.genre, 
              subgenre: f.subgenre,
              audio_type: f.audio_type,
              pack_id: f.pack_id
            })))
          }
        } else {
          // Debug: Check what files exist with the genre/subgenre combination regardless of audio_type
          console.log(`[DEBUG] No files found with audio_type="${audioType}", checking all files with genre/subgenre combination...`)
          
          let debugQuery = supabase
            .from('audio_library_items')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_ready', true) // Only include ready audio files
            .eq('genre', selectedGenre.name)
            .ilike('subgenre', selectedSubgenre.trim())
          
          const { data: debugFiles, error: debugError } = await debugQuery
          
          console.log(`[DEBUG] Found ${debugFiles?.length || 0} files with genre="${selectedGenre.name}" AND subgenre ILIKE "${selectedSubgenre.trim()}" (any audio_type)`)
          if (debugFiles && debugFiles.length > 0) {
            console.log(`[DEBUG] Available files:`, debugFiles.map(f => ({ name: f.name, genre: f.genre, subgenre: f.subgenre, audio_type: f.audio_type })))
          }
        }
        

      } else {
        // Single filter logic (only genre, subgenre, or pack)
      if (selectedGenre && selectedGenre.name && isGenreLocked) {
        query = query.eq('genre', selectedGenre.name)
        console.log(`[DEBUG] Filtering by locked genre: ${selectedGenre.name}`)
      }
      
      if (selectedSubgenre && selectedSubgenre.trim() && isSubgenreLocked) {
          query = query.ilike('subgenre', selectedSubgenre.trim())
          console.log(`[DEBUG] Filtering by locked subgenre (case-insensitive): ${selectedSubgenre.trim()}`)
        }
        
        // Pack filtering is already applied above, but let's add debug info
        if (selectedPacks.length > 0 && isPackLocked) {
          console.log(`[DEBUG] Pack filter already applied: ${selectedPacks.map(p => p.name).join(', ')} (${selectedPacks.map(p => p.id).join(', ')})`)
          
          // Debug: Check what files exist with just these packs
          let packDebugQuery = supabase
            .from('audio_library_items')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_ready', true) // Only include ready audio files
            .in('pack_id', selectedPacks.map(p => p.id))
          
          const { data: packDebugFiles, error: packDebugError } = await packDebugQuery
          
          console.log(`[DEBUG] Found ${packDebugFiles?.length || 0} files in packs "${selectedPacks.map(p => p.name).join(', ')}" (any audio_type)`)
          if (packDebugFiles && packDebugFiles.length > 0) {
            console.log(`[DEBUG] Pack files:`, packDebugFiles.slice(0, 5).map(f => ({ 
              name: f.name, 
              audio_type: f.audio_type,
              pack_id: f.pack_id
            })))
          }
      }
      
      const { data: typeFiles, error: typeError } = await query
      
      console.log(`[DEBUG] Found ${typeFiles?.length || 0} files with audio_type: ${audioType}`)
      
      // Filter files to prioritize those with BPM and key metadata
      if (typeFiles && typeFiles.length > 0) {
        // First, try to get files with both BPM and key
        const filesWithMetadata = typeFiles.filter(f => f.bpm && f.key && f.bpm !== '' && f.key !== '')
        console.log(`[DEBUG] Found ${filesWithMetadata.length} files with BPM and key metadata`)
        
        if (filesWithMetadata.length > 0) {
          // Use files with metadata
          audioFiles = [...audioFiles, ...filesWithMetadata]
          console.log(`[DEBUG] Using files with metadata:`, filesWithMetadata.slice(0, 3).map(f => ({ 
            name: f.name, 
            bpm: f.bpm,
            key: f.key,
            genre: f.genre, 
            subgenre: f.subgenre,
            audio_type: f.audio_type
          })))
        } else {
          // Fall back to all files if none have metadata
          console.log(`[DEBUG] No files with metadata found, using all files`)
          audioFiles = [...audioFiles, ...typeFiles]
          console.log(`[DEBUG] Sample files found:`, typeFiles.slice(0, 3).map(f => ({ 
            name: f.name, 
            bpm: f.bpm || 'none',
            key: f.key || 'none',
            genre: f.genre, 
            subgenre: f.subgenre,
            audio_type: f.audio_type,
            pack_id: f.pack_id
          })))
        }
      }
      }
      
      // Debug: Log the current filter state
      console.log(`[DEBUG] Current filters - Genre: ${selectedGenre?.name || 'none'}, Subgenre: ${selectedSubgenre || 'none'}, GenreLocked: ${isGenreLocked}, SubgenreLocked: ${isSubgenreLocked}`)
      console.log(`[DEBUG] BPM/Key filtering: Prioritizing files with BPM and key metadata, falling back to all files if needed`)
      
      // If no exact matches, try to get files by name containing the type (fallback)
      if (audioFiles.length === 0) {
        let fallbackQuery = supabase
          .from('audio_library_items')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_ready', true) // Only include ready audio files
          .ilike('name', `%${audioType.toLowerCase()}%`)
        
        // Add genre filter if a genre is selected and locked
        if (selectedGenre && selectedGenre.name && isGenreLocked) {
          fallbackQuery = fallbackQuery.eq('genre', selectedGenre.name)
        }
        
        // Add subgenre filter if a subgenre is selected and locked
        if (selectedSubgenre && selectedSubgenre.trim() && isSubgenreLocked) {
          fallbackQuery = fallbackQuery.ilike('subgenre', selectedSubgenre.trim())
        }
        
        const { data: nameFiles, error: nameError } = await fallbackQuery
        
        console.log(`[DEBUG] Found ${nameFiles?.length || 0} files with name containing: ${audioType}`)
        if (nameFiles) {
          audioFiles = [...audioFiles, ...nameFiles]
        }
      }
      
      // Special handling for Hi-Hat to search for multiple variations
      if ((audioType === 'Hihat' || audioType === 'Hi-Hat') && audioFiles.length === 0) {
        const hiHatVariations = ['Hihat', 'Hi-Hat', 'Hi Hat', 'hihat', 'hi-hat', 'hi hat']
        for (const variation of hiHatVariations) {
          let hiHatQuery = supabase
            .from('audio_library_items')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_ready', true) // Only include ready audio files
            .eq('audio_type', variation)
          
          // Add genre filter if a genre is selected and locked
          if (selectedGenre && selectedGenre.name && isGenreLocked) {
            hiHatQuery = hiHatQuery.eq('genre', selectedGenre.name)
          }
          
          // Add subgenre filter if a subgenre is selected and locked
          if (selectedSubgenre && selectedSubgenre.trim() && isSubgenreLocked) {
            hiHatQuery = hiHatQuery.ilike('subgenre', selectedSubgenre.trim())
          }
          
          const { data: variationFiles, error: variationError } = await hiHatQuery
          
          if (variationFiles) {
            audioFiles = [...audioFiles, ...variationFiles]
          }
        }
        
        // Also try a broader search if still no results
        if (audioFiles.length === 0) {
          console.log('[DEBUG] No hi-hat files found with exact audio_type, trying broader search...')
          let broaderQuery = supabase
            .from('audio_library_items')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_ready', true) // Only include ready audio files
            .or('name.ilike.%hihat%,name.ilike.%hi-hat%,name.ilike.%hi hat%')
          
          // Add genre filter if a genre is selected and locked
          if (selectedGenre && selectedGenre.name && isGenreLocked) {
            broaderQuery = broaderQuery.eq('genre', selectedGenre.name)
          }
          
          // Add subgenre filter if a subgenre is selected and locked
          if (selectedSubgenre && selectedSubgenre.trim() && isSubgenreLocked) {
            broaderQuery = broaderQuery.ilike('subgenre', selectedSubgenre.trim())
          }
          
          const { data: broaderFiles, error: broaderError } = await broaderQuery
          
          if (broaderFiles) {
            audioFiles = [...audioFiles, ...broaderFiles]
            console.log(`[DEBUG] Found ${broaderFiles.length} hi-hat files with broader search`)
          }
        }
      }
      
      // Remove duplicates based on id
      audioFiles = audioFiles.filter((file, index, self) => 
        index === self.findIndex(f => f.id === file.id)
      )

      // Apply tempo tolerance filtering to prevent excessive time-stretching
      if (audioFiles.length > 0) {
        const tempoTolerance = 5 // ±5 BPM tolerance
        const transportTempo = bpm
        
        console.log(`[TEMPO FILTER] Transport tempo: ${transportTempo} BPM, tolerance: ±${tempoTolerance} BPM`)
        console.log(`[TEMPO FILTER] Checking ${audioFiles.length} audio files for tempo compatibility`)
        
        // First, try to find files with exact tempo matches
        const exactMatches = audioFiles.filter(file => {
          const fileBpm = parseFloat(file.bpm) || 0
          return fileBpm > 0 && Math.abs(fileBpm - transportTempo) === 0
        })
        
        if (exactMatches.length > 0) {
          console.log(`[TEMPO FILTER] Found ${exactMatches.length} files with exact tempo match (${transportTempo} BPM)`)
          audioFiles = exactMatches
        } else {
          // Fall back to files within tolerance range
          const toleranceMatches = audioFiles.filter(file => {
            const fileBpm = parseFloat(file.bpm) || 0
            return fileBpm > 0 && Math.abs(fileBpm - transportTempo) <= tempoTolerance
          })
          
          if (toleranceMatches.length > 0) {
            console.log(`[TEMPO FILTER] Found ${toleranceMatches.length} files within tolerance range (${transportTempo - tempoTolerance}-${transportTempo + tempoTolerance} BPM)`)
            audioFiles = toleranceMatches
          } else {
            console.log(`[TEMPO FILTER] No files found within tempo tolerance. Rejecting all files to prevent excessive time-stretching.`)
            console.log(`[TEMPO FILTER] Transport: ${transportTempo} BPM, tolerance: ±${tempoTolerance} BPM, required range: ${transportTempo - tempoTolerance}-${transportTempo + tempoTolerance} BPM`)
            // Reject all files if none match tempo criteria - no fallback to prevent audio quality issues
            audioFiles = []
          }
        }
        
        // Log sample of filtered files
        if (audioFiles.length > 0) {
          console.log(`[TEMPO FILTER] Sample filtered files:`, audioFiles.slice(0, 3).map(f => ({
            name: f.name,
            bpm: f.bpm,
            tempoDiff: Math.abs((parseFloat(f.bpm) || 0) - transportTempo)
          })))
        }
      }
      


      if (!audioFiles || audioFiles.length === 0) {
        console.log(`No ${audioType} audio files found with current filters`)
        
        // Check if both genre and subgenre are locked
        const bothLocked = selectedGenre && selectedGenre.name && isGenreLocked && selectedSubgenre && isSubgenreLocked
        
        if (bothLocked) {
          console.log(`[STRICT MODE] Both genre and subgenre are locked - no fallback allowed`)
          console.log(`[STRICT MODE] Required: genre="${selectedGenre.name}" AND subgenre="${selectedSubgenre.trim()}"`)
          
          // Let's check what files exist with these exact requirements
          let strictQuery = supabase
            .from('audio_library_items')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_ready', true) // Only include ready audio files
            .eq('genre', selectedGenre.name)
            .ilike('subgenre', selectedSubgenre.trim())
          
          const { data: strictFiles, error: strictError } = await strictQuery
          
          console.log(`[STRICT MODE] Found ${strictFiles?.length || 0} files with exact genre="${selectedGenre.name}" AND subgenre="${selectedSubgenre.trim()}"`)
          
          if (strictFiles && strictFiles.length > 0) {
            console.log(`[STRICT MODE] Available files:`, strictFiles.map(f => ({ 
              name: f.name, 
              genre: f.genre, 
              subgenre: f.subgenre, 
              audio_type: f.audio_type 
            })))
            
            // Filter by audio_type
            const typeFiles = strictFiles.filter(f => f.audio_type === audioType)
            console.log(`[STRICT MODE] Of those, ${typeFiles.length} have audio_type="${audioType}"`)
            
            if (typeFiles.length > 0) {
              audioFiles = typeFiles
            } else {
              console.log(`[STRICT MODE] No files with audio_type="${audioType}" found - cannot shuffle this track type`)
        return
      }
          } else {
            console.log(`[STRICT MODE] No files found with exact genre/subgenre combination - cannot shuffle`)
            return
          }
        } else {
          // Only use fallback if NOT both genre and subgenre are locked
          console.log(`[FALLBACK] Trying with no genre/subgenre filters (not both locked)`)
          let noFilterQuery = supabase
            .from('audio_library_items')
            .select('*')
            .eq('user_id', user.id)
            .eq('audio_type', audioType)
            .eq('is_ready', true) // Only include ready audio files
          
          const { data: noFilterFiles, error: noFilterError } = await noFilterQuery
          
          if (noFilterFiles && noFilterFiles.length > 0) {
            console.log(`[FALLBACK] Found ${noFilterFiles.length} files with no genre filters`)
            audioFiles = noFilterFiles
          } else {
            console.log(`[FALLBACK] No files found with no genre filters`)
          }
        }
        
        // If still no files, give up
      if (!audioFiles || audioFiles.length === 0) {
          console.log(`No ${audioType} audio files found in your library with current filter requirements`)
        return
        }
      }

      // Randomly select one audio file
      const randomIndex = Math.floor(Math.random() * audioFiles.length)
      const selectedAudio = audioFiles[randomIndex]

      // Update the track with the new audio
      const publicUrl = getPublicAudioUrl(selectedAudio.file_url || '')
      
      // Handle tempo and key based on transport lock status
      let finalBpm = selectedAudio.bpm || 120
      let finalKey = selectedAudio.key || 'C'
      let pitchShift = 0
      let playbackRate = 1.0
      
      if (isBpmLocked || isKeyLocked) {
        // Transport is partially or fully locked - adapt tracks accordingly
        if (isBpmLocked) {
          finalBpm = bpm
          // Calculate playback rate to match transport tempo
          if (selectedAudio.bpm && selectedAudio.bpm > 0) {
            playbackRate = bpm / selectedAudio.bpm
          }
        }
        
        if (isKeyLocked) {
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
        }
        
        console.log(`[TRANSPORT LOCKED] Track adapts to Transport: ${selectedAudio.bpm}BPM ${selectedAudio.key} -> ${finalBpm}BPM ${finalKey} (pitch: ${pitchShift}, rate: ${playbackRate.toFixed(2)})`)
      } else if (track.name === 'Melody Loop') {
        // Transport not locked - special handling for Melody Loop tracks
        if (melodyLoopMode === 'transport-dominates') {
          // Mode B: Transport dominates - Melody Loop adapts to transport
          finalBpm = bpm
          finalKey = transportKey
          
          // Calculate playback rate to match transport tempo
          if (selectedAudio.bpm && selectedAudio.bpm > 0) {
            playbackRate = bpm / selectedAudio.bpm
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
          
          console.log(`[Mode B] Melody Loop adapts to Transport: ${selectedAudio.bpm}BPM ${selectedAudio.key} -> ${bpm}BPM ${transportKey} (pitch: ${pitchShift}, rate: ${playbackRate.toFixed(2)})`)
        } else {
          // Mode A: Melody Loop dominates - Transport adapts to melody loop's ORIGINAL BPM
          finalBpm = selectedAudio.bpm || 120
          finalKey = selectedAudio.key || 'C'
          playbackRate = 1.0
          pitchShift = 0
          
          // Update transport to match melody loop's ORIGINAL BPM from the database
          // This is the true original BPM of the audio file, not the current adjusted BPM
          const originalBpm = selectedAudio.bpm || 120
          console.log(`[Mode A] DEBUG - selectedAudio:`, selectedAudio)
          console.log(`[Mode A] DEBUG - selectedAudio.bpm: ${selectedAudio.bpm}`)
          console.log(`[Mode A] DEBUG - originalBpm calculated: ${originalBpm}`)
          console.log(`[Mode A] Setting transport BPM to ORIGINAL: ${originalBpm} (from selectedAudio.bpm: ${selectedAudio.bpm})`)
          setBpm(originalBpm)
          setTransportKey(selectedAudio.key || 'C')
          
          console.log(`[Mode A] Transport adapts to Melody Loop ORIGINAL BPM: ${bpm}BPM ${transportKey} -> ${originalBpm}BPM ${selectedAudio.key}`)
          
          // CRITICAL FIX: In M-T mode, ensure Current BPM matches Original BPM to prevent confusion
          // Update the track's currentBpm to match the originalBpm
          setTracks(prev => prev.map(track => 
            track.name === 'Melody Loop' ? {
              ...track,
              currentBpm: originalBpm,
              playbackRate: 1.0 // Reset playback rate since we're using original BPM
            } : track
          ))
          
          console.log(`[Mode A] CRITICAL FIX: Updated Melody Loop currentBpm to match originalBpm: ${originalBpm}`)
          
          // Force immediate update to ensure transport BPM is set correctly
          setTimeout(() => {
            console.log(`[Mode A] Verifying transport BPM is set to: ${originalBpm}`)
            setBpm(originalBpm)
          }, 10)
        }
      } else if (track.name.includes(' Loop')) {
        // Transport not locked - handle other loop tracks (Drum Loop, Hihat Loop, Percussion Loop, 808 Loop, etc.)
        // These should adapt to transport tempo and key like Melody Loop in transport-dominates mode
        finalBpm = bpm
        finalKey = transportKey
        
        // Calculate playback rate to match transport tempo
        if (selectedAudio.bpm && selectedAudio.bpm > 0) {
          playbackRate = bpm / selectedAudio.bpm
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
        
        console.log(`[LOOP TRACK] ${track.name} adapts to Transport: ${selectedAudio.bpm}BPM ${selectedAudio.key} -> ${bpm}BPM ${transportKey} (pitch: ${pitchShift}, rate: ${playbackRate.toFixed(2)})`)
      } else {
        // Transport not locked and not a loop track - use original audio BPM and key
        finalBpm = selectedAudio.bpm || 120
        finalKey = selectedAudio.key || 'C'
        playbackRate = 1.0
        pitchShift = 0
        
        console.log(`[NORMAL] Using original audio: ${selectedAudio.bpm}BPM ${selectedAudio.key}`)
      }
      
      setTracks(prev => prev.map(t => 
        t.id === trackId ? { 
          ...t, 
          audioUrl: publicUrl,
          audioName: selectedAudio.name,
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
          tags: selectedAudio.tags
        } : t
      ))

    } catch (error) {
      console.error('Error shuffling audio:', error)
      alert('Failed to shuffle audio')
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
      
      console.log('=== AUDIO LIBRARY DEBUG ===')
      
      // Check what's in the genres table
      const { data: genresData } = await supabase
        .from('genres')
        .select('*')
        .order('name')
      
      console.log('[DEBUG] Genres table data:', genresData)
      
      // Check what's in the genre_subgenres table
      const { data: subgenresData } = await supabase
        .from('genre_subgenres')
        .select('*')
        .order('genre, subgenre')
      
      console.log('[DEBUG] Genre_subgenres table data:', subgenresData)
      
      // Check what's in the audio_library_items table
      const { data: allFiles } = await supabase
        .from('audio_library_items')
        .select('name, genre, subgenre, audio_type, is_ready')
        .eq('user_id', user.id)
        .limit(50)
      
      console.log('[DEBUG] Audio library items data:', allFiles)
      
      // Show unique genres and subgenres in audio files
      const audioGenres = [...new Set(allFiles?.map(f => f.genre).filter(Boolean) || [])]
      const audioSubgenres = [...new Set(allFiles?.map(f => f.subgenre).filter(Boolean) || [])]
      
      console.log('[DEBUG] Genres in audio files:', audioGenres)
      console.log('[DEBUG] Subgenres in audio files:', audioSubgenres)
      
      // Check for kick files specifically
      console.log('\n=== KICK FILES ANALYSIS ===')
      const kickFiles = allFiles?.filter(f => f.audio_type === 'Kick') || []
      console.log('[DEBUG] Kick files (audio_type="Kick"):', kickFiles)
      console.log('[DEBUG] Kick files count:', kickFiles.length)
      
      const readyKickFiles = kickFiles.filter(f => f.is_ready)
      console.log('[DEBUG] Ready kick files:', readyKickFiles)
      console.log('[DEBUG] Ready kick files count:', readyKickFiles.length)
      
      // Check for files with "kick" in name
      const kickNameFiles = allFiles?.filter(f => f.name?.toLowerCase().includes('kick')) || []
      console.log('[DEBUG] Files with "kick" in name:', kickNameFiles)
      console.log('[DEBUG] Files with "kick" in name count:', kickNameFiles.length)
      
      // Check ready check status
      const readyFiles = allFiles?.filter(f => f.is_ready) || []
      const notReadyFiles = allFiles?.filter(f => !f.is_ready) || []
      console.log('[DEBUG] Ready files count:', readyFiles.length)
      console.log('[DEBUG] Not ready files count:', notReadyFiles.length)
      console.log('[DEBUG] Ready check enabled:', isReadyCheckEnabled)
      console.log('[DEBUG] Shuffle tracker enabled:', isShuffleTrackerEnabled)
      console.log('[DEBUG] Selected packs:', selectedPacks.map(p => p.name))
      
      // Check for Trap + LA specifically
      if (selectedGenre?.name === 'Trap' && selectedSubgenre === 'LA') {
        console.log('\n=== TRAP + LA ANALYSIS ===')
        
        // Check if "Trap" exists in genres table
        const trapInGenres = genresData?.find(g => g.name === 'Trap')
        console.log('[DEBUG] "Trap" in genres table:', trapInGenres)
        
        // Check if "LA" exists in genre_subgenres table
        const laInSubgenres = subgenresData?.find(s => s.genre === 'Trap' && s.subgenre === 'LA')
        console.log('[DEBUG] "LA" subgenre for "Trap" in genre_subgenres table:', laInSubgenres)
        
        // Check if any audio files have genre="Trap" AND subgenre="LA"
        const trapLAFiles = allFiles?.filter(f => f.genre === 'Trap' && f.subgenre === 'LA') || []
        console.log('[DEBUG] Audio files with genre="Trap" AND subgenre="LA":', trapLAFiles)
        
        // Check if any audio files have genre="LA" AND subgenre="Trap" (swapped)
        const laTrapFiles = allFiles?.filter(f => f.genre === 'LA' && f.subgenre === 'Trap') || []
        console.log('[DEBUG] Audio files with genre="LA" AND subgenre="Trap":', laTrapFiles)
      }
    } catch (error) {
      console.error('[DEBUG] Error checking audio library data:', error)
    }
  }

  // Helper function to manage shuffle tracking
  const getShuffleAudioBatch = async (user: any, audioType: string) => {
    try {
      // If shuffle tracker is disabled, get random files without tracking
      if (!isShuffleTrackerEnabled) {
        console.log(`[SHUFFLE TRACKER] Tracker disabled - getting random files for ${audioType}`)
        
        let query = supabase
          .from('audio_library_items')
          .select('*')
          .eq('user_id', user.id)
          .eq('audio_type', audioType)
          .order('created_at', { ascending: false })
          .limit(10)
        
        if (isReadyCheckEnabled) {
          query = query.eq('is_ready', true)
        }
        
        const { data: randomFiles } = await query
        return randomFiles || []
      }

      // Shuffle tracker is enabled - use tracking logic
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

      // Get 10 audio files that haven't been loaded yet
      // 5 from the top (oldest) and 5 from the bottom (newest) of created_at order
      let topFilesQuery = supabase
        .from('audio_library_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('audio_type', audioType)
        .not('id', 'in', `(${trackedFiles?.map(t => t.audio_id).join(',') || '00000000-0000-0000-0000-000000000000'})`)
        .order('created_at', { ascending: true })
        .limit(5)
      if (isReadyCheckEnabled) {
        topFilesQuery = topFilesQuery.eq('is_ready', true) // Only include ready audio files when ready check is enabled
      }
      const { data: topFiles } = await topFilesQuery

      let bottomFilesQuery = supabase
        .from('audio_library_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('audio_type', audioType)
        .not('id', 'in', `(${trackedFiles?.map(t => t.audio_id).join(',') || '00000000-0000-0000-0000-000000000000'})`)
        .order('created_at', { ascending: false })
        .limit(5)
      if (isReadyCheckEnabled) {
        bottomFilesQuery = bottomFilesQuery.eq('is_ready', true) // Only include ready audio files when ready check is enabled
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
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to shuffle audio files')
        return
      }

      // Set transport to 64 steps when shuffling all
      setSteps(64)
      console.log('[SHUFFLE ALL] Set transport to 64 steps')

      // Handle track loading based on auto mode
      if (isAutoMode) {
        // Auto mode ON: Load loop tracks + drum tracks for comprehensive shuffling
        const defaultTrackNames = ['Melody Loop', 'Drum Loop', 'Hihat Loop', 'Percussion Loop', '808 Loop', 'Kick', 'Snare', 'Hi-Hat']
        const currentTrackNames = tracks.map(t => t.name)
        
        // Check if any default tracks are missing
        const missingTracks = defaultTrackNames.filter(name => !currentTrackNames.includes(name))
        
        if (missingTracks.length > 0) {
          console.log(`[AUTO MODE ON] Missing tracks detected: ${missingTracks.join(', ')}. Reloading default tracks with loops + drums.`)
          
          // Reset to default tracks including both loops and drums
          const defaultTracks: Track[] = [
            { id: 1, name: 'Melody Loop', audioUrl: null, color: 'bg-red-500' },
            { id: 2, name: 'Drum Loop', audioUrl: null, color: 'bg-blue-500' },
            { id: 3, name: 'Hihat Loop', audioUrl: null, color: 'bg-green-500' },
            { id: 4, name: 'Percussion Loop', audioUrl: null, color: 'bg-purple-500' },
            { id: 5, name: '808 Loop', audioUrl: null, color: 'bg-yellow-500' },
            { id: 6, name: 'Kick', audioUrl: null, color: 'bg-orange-500' },
            { id: 7, name: 'Snare', audioUrl: null, color: 'bg-pink-500' },
            { id: 8, name: 'Hi-Hat', audioUrl: null, color: 'bg-indigo-500' },
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
      } else {
        // Auto mode OFF: Load drum tracks
        console.log(`[AUTO MODE OFF] Loading drum tracks for shuffle all`)
        
        // Reset to drum tracks
        const drumTracks: Track[] = [
          { id: 1, name: 'Kick', audioUrl: null, color: 'bg-red-500' },
          { id: 2, name: 'Snare', audioUrl: null, color: 'bg-blue-500' },
          { id: 3, name: 'Hi-Hat', audioUrl: null, color: 'bg-green-500' },
          { id: 4, name: 'Percussion', audioUrl: null, color: 'bg-purple-500' },
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
      console.log(`[SHUFFLE DEBUG] selectedGenreId: "${selectedGenreId}"`)
      console.log(`[SHUFFLE DEBUG] selectedGenreId !== 'none': ${selectedGenreId !== 'none'}`)
      console.log(`[SHUFFLE DEBUG] selectedGenreId && selectedGenreId !== 'none': ${selectedGenreId && selectedGenreId !== 'none'}`)
      console.log(`[SHUFFLE DEBUG] Current BPM range: ${bpmRange[0]}-${bpmRange[1]}`)
      
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
        'Melody Loop', 'Piano Loop', '808 Loop', 'Drum Loop', 'Bass Loop', 'Vocal Loop', 'Guitar Loop', 'Synth Loop',
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

      // Shuffle audio for each track using the new tracking system
      for (const track of tracksToShuffle) {
        try {
          // Extract base track type from name (remove key suffix for loops)
          let baseTrackName = track.name
          if (track.name.includes(' Loop ') && track.name.split(' ').length > 2) {
            const parts = track.name.split(' ')
            baseTrackName = parts.slice(0, -1).join(' ') // Remove the last part (the key)
          }
          
          const audioType = trackTypeMap[baseTrackName]
          if (!audioType) {
            console.log(`No audio type mapping found for track: ${track.name}`)
            continue
          }

          console.log(`[SHUFFLE TRACKER] Getting batch for track: ${track.name} (${audioType})`)
          
          // Get batch of audio files using the tracking system
          const audioFiles = await getShuffleAudioBatch(user, audioType)
          
          if (audioFiles.length === 0) {
            console.log(`[SHUFFLE TRACKER] No audio files available for ${audioType}`)
            continue
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
          
          if (isBpmLocked || isKeyLocked) {
            // Transport is partially or fully locked - adapt tracks accordingly
            if (isBpmLocked) {
              finalBpm = bpm
              // Calculate playback rate to match transport tempo
              if (selectedAudio.bpm && selectedAudio.bpm > 0) {
                playbackRate = bpm / selectedAudio.bpm
              }
            }
            
            if (isKeyLocked) {
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
            }
          } else if (track.name === 'Melody Loop') {
            // Transport not locked - special handling for Melody Loop tracks
            if (melodyLoopMode === 'transport-dominates') {
              // Mode B: Transport dominates - Melody Loop adapts to transport
              finalBpm = bpm
              finalKey = transportKey
              
              // Calculate playback rate to match transport tempo
              if (selectedAudio.bpm && selectedAudio.bpm > 0) {
                playbackRate = bpm / selectedAudio.bpm
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
            // These should adapt to transport tempo and key like Melody Loop in transport-dominates mode
            finalBpm = bpm
            finalKey = transportKey
            
            // Calculate playback rate to match transport tempo
            if (selectedAudio.bpm && selectedAudio.bpm > 0) {
              playbackRate = bpm / selectedAudio.bpm
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
            // Transport not locked and not a loop track - use original audio BPM and key
            finalBpm = selectedAudio.bpm || 120
            finalKey = selectedAudio.key || 'C'
            playbackRate = 1.0
            pitchShift = 0
          }
          
          setTracks(prev => prev.map(t => 
            t.id === track.id ? { 
              ...t, 
              audioUrl: publicUrl,
              audioName: selectedAudio.name,
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
              tags: selectedAudio.tags
            } : t
          ))

          console.log(`[SHUFFLE TRACKER] Updated track ${track.name} with ${selectedAudio.name}`)
        } catch (error) {
          console.error(`Error shuffling audio for track ${track.name}:`, error)
        }
      }

      // Shuffle patterns for all tracks (except locked ones)
      const patternShufflePromises = tracks
        .filter(track => !track.locked) // Skip locked tracks
        .map(async track => {
          // Special handling for loop tracks - only first step active
          if (track.name === 'Melody Loop' || track.name.includes(' Loop')) {
            const newPattern = new Array(steps).fill(false)
            newPattern[0] = true // Always keep the first step active
            return { trackId: track.id, pattern: newPattern }
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
            selectedPattern = patternLibrary[Math.floor(Math.random() * patternLibrary.length)]
          } else {
            // Use database pattern
            const randomPattern = patterns[Math.floor(Math.random() * patterns.length)]
            const sequencerData = randomPattern.sequencer_data || randomPattern.sequencerData
            
            if (!sequencerData) {
              // Fallback to built-in patterns
              const patternLibrary = getPatternLibraryForTrackType(track.name)
              selectedPattern = patternLibrary[Math.floor(Math.random() * patternLibrary.length)]
            } else {
              // Extract the pattern for this specific track
              const trackPattern = sequencerData[track.id]
              
              if (!trackPattern) {
                // Fallback to built-in patterns
                const patternLibrary = getPatternLibraryForTrackType(track.name)
                selectedPattern = patternLibrary[Math.floor(Math.random() * patternLibrary.length)]
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

      // Update BPM based on genre tempo range (unless BPM is locked)
      // BUT respect M-T mode - if Melody Loop dominates, don't override the BPM set by individual track shuffles
      console.log(`[SHUFFLE DEBUG] Current melodyLoopMode: ${melodyLoopMode}`)
      console.log(`[SHUFFLE DEBUG] melodyLoopMode === 'transport-dominates': ${melodyLoopMode === 'transport-dominates'}`)
      
      if (!isBpmLocked) {
        // Only set genre-based BPM if we're in T-M mode (Transport dominates)
        // In M-T mode, the Melody Loop's original BPM should control the transport
        if (melodyLoopMode === 'transport-dominates') {
          setBpm(newBpm)
          console.log(`[SHUFFLE] Updated BPM to ${newBpm} based on genre tempo range (T-M mode)`)
        } else {
          console.log(`[SHUFFLE] Skipping genre BPM update - M-T mode active, Melody Loop controls transport BPM`)
        }
      } else {
        // Restore BPM if locked
        if (originalBpm !== null) setBpm(originalBpm)
        console.log('BPM locked - restored BPM setting')
      }
      
      // Restore Key if locked
      if (isKeyLocked && originalKey !== null) {
        setTransportKey(originalKey)
        console.log('Key locked - restored Key setting')
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
        const randomPattern = patternLibrary[Math.floor(Math.random() * patternLibrary.length)]
        
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
        const randomPattern = patternLibrary[Math.floor(Math.random() * patternLibrary.length)]
        
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
      const randomPattern = patterns[Math.floor(Math.random() * patterns.length)]
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
      const randomPattern = patternLibrary[Math.floor(Math.random() * patternLibrary.length)]
      
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
          // Special handling for loop tracks - only first step active
          if (track.name === 'Melody Loop' || track.name.includes(' Loop')) {
            const newPattern = new Array(steps).fill(false)
            newPattern[0] = true // Always keep the first step active
            return { trackId: track.id, pattern: newPattern }
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
            const randomPattern = patternLibrary[Math.floor(Math.random() * patternLibrary.length)]
            
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
            const randomPattern = patterns[Math.floor(Math.random() * patterns.length)]
            const sequencerData = randomPattern.sequencer_data || randomPattern.sequencerData
            
            if (!sequencerData) {
              // Fallback to built-in patterns
              const patternLibrary = getPatternLibraryForTrackType(track.name)
              const fallbackPattern = patternLibrary[Math.floor(Math.random() * patternLibrary.length)]
              
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
                const fallbackPattern = patternLibrary[Math.floor(Math.random() * patternLibrary.length)]
                
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

      alert(`Pattern "${name}" saved successfully!`)
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

      alert(`"${name}" saved successfully!`)
    } catch (error) {
      console.error('Error saving track pattern:', error)
      alert('Failed to save track pattern')
    }
  }

  // Session management state
  const [savedSessions, setSavedSessions] = useState<any[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [showSessionDialog, setShowSessionDialog] = useState(false)
  const [sessionName, setSessionName] = useState('')
  const [sessionDescription, setSessionDescription] = useState('')
  const [sessionCategory, setSessionCategory] = useState('')
  const [sessionTags, setSessionTags] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

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
  const [isReadyCheckLocked, setIsReadyCheckLocked] = useState(false)
  const [melodyLoopMode, setMelodyLoopMode] = useState<'transport-dominates' | 'melody-dominates'>('transport-dominates')

  // Pattern management state
  const [showSavePatternDialog, setShowSavePatternDialog] = useState(false)
  const [showLoadPatternDialog, setShowLoadPatternDialog] = useState(false)
  const [showSaveTrackPatternDialog, setShowSaveTrackPatternDialog] = useState(false)
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
      alert('Please enter a session name')
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

      // Collect all session data
      const sessionData = {
        user_id: user.id,
        name: sessionName,
        description: sessionDescription,
        category: sessionCategory,
        tags,
        bpm,
        transport_key: transportKey, // Save transport key
        steps,
        tracks,
        sequencer_data: sequencerData,
        mixer_data: mixerSettings,
        effects_data: {}, // Will be implemented when effects are added
        piano_roll_data: {}, // Will be populated when piano roll is used
        sample_library_data: {}, // Will be populated when sample library is used
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
        alert('Failed to save session')
        return
      }

      setCurrentSessionId(result.data.id)
      setSessionName('')
      setSessionDescription('')
      setSessionCategory('')
      setSessionTags('')
      setShowSessionDialog(false)
      alert(`Session "${result.data.name}" saved successfully!`)
      
      // Refresh saved sessions list
      loadSavedSessions()
    } catch (error) {
      console.error('Error saving session:', error)
      alert('Failed to save session')
    } finally {
      setIsSaving(false)
    }
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
    } catch (error) {
      console.error('Error loading sessions:', error)
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
        alert('Failed to load session')
        return
      }

      // Restore session data
      setBpm(data.bpm)
      setSteps(data.steps)
      setTracks(data.tracks)
      setTransportKey(data.transport_key || 'C') // Restore transport key
      
      // Restore sequencer data directly
      if (data.sequencer_data) {
        setSequencerDataFromSession(data.sequencer_data)
      }

      // Restore mixer settings
      if (data.mixer_data) {
        setMixerSettings(data.mixer_data)
      }

      // Restore playback state
      if (data.playback_state) {
        const wasPlaying = data.playback_state.isPlaying || false
        setCurrentStep(data.playback_state.currentStep || 0)
        
        // If the session was playing when saved, we need to restart the sequencer
        // But we need to wait for the tracks and sequencer data to be fully loaded first
        if (wasPlaying) {
          // Use setTimeout to ensure all state updates are complete
          setTimeout(async () => {
            console.log('[SESSION LOAD] Restarting sequencer after session load')
            try {
              // Check if there are tracks with audio before starting
              const tracksWithAudio = tracks.filter(track => track.audioUrl && track.audioUrl !== 'undefined')
              if (tracksWithAudio.length === 0) {
                console.log('[SESSION LOAD] No tracks with audio found, not starting playback')
                setIsPlaying(false)
                return
              }
              
              // Start the sequencer directly through the hook
              await playSequence()
              console.log('[SESSION LOAD] Sequencer started successfully')
            } catch (error) {
              console.error('[SESSION LOAD] Failed to start sequencer:', error)
              // If playback fails, set playing to false
              setIsPlaying(false)
            }
          }, 200) // Increased delay to ensure audio samples are loaded
        } else {
          // If not playing, just set the state
          setIsPlaying(false)
        }
      }

      // Restore UI state
      if (data.ui_state) {
        setActiveTab(data.ui_state.activeTab || 'sequencer')
        setShowSampleLibrary(data.ui_state.showSampleLibrary || false)
        setShowPianoRoll(data.ui_state.showPianoRoll || false)
        setSelectedTrack(data.ui_state.selectedTrack || null)
        setPianoRollTrack(data.ui_state.pianoRollTrack || null)
      }

      setCurrentSessionId(sessionId)
      alert(`Session "${data.name}" loaded successfully!`)
    } catch (error) {
      console.error('Error loading session:', error)
      alert('Failed to load session')
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
  }, [])

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
    console.log(`[DEBUG] Toggling genre lock from ${isGenreLocked} to ${!isGenreLocked}`)
    setIsGenreLocked(!isGenreLocked)
  }

  const handleToggleSubgenreLock = () => {
    console.log(`[DEBUG] Toggling subgenre lock from ${isSubgenreLocked} to ${!isSubgenreLocked}`)
    setIsSubgenreLocked(!isSubgenreLocked)
  }

  const handleTogglePackLock = () => {
    console.log(`[DEBUG] Toggling pack lock from ${isPackLocked} to ${!isPackLocked}`)
    setIsPackLocked(!isPackLocked)
  }

  // Handle quantization
  const handleQuantizeLoop = (trackId: number, startTime: number, endTime: number, playbackRate: number) => {
    console.log(`[QUANTIZE] Applying quantization to track ${trackId}`)
    console.log(`[QUANTIZE] Start: ${startTime}s, End: ${endTime}s, Rate: ${playbackRate}`)
    
    // Update track with new loop points and playback rate
    setTracks(prev => prev.map(track => 
      track.id === trackId ? { 
        ...track, 
        loopStartTime: startTime,
        loopEndTime: endTime,
        playbackRate: playbackRate
      } : track
    ))
    
    // Force reload the sample with new settings
    setTimeout(() => {
      forceReloadTrackSamples(trackId)
    }, 100)
  }

  // Open quantization modal
  const openQuantizeModal = (track: any) => {
    setQuantizeTrack(track)
    setShowQuantizeModal(true)
  }

  const handleClearAll = () => {
    // Reset transport settings
    setBpm(120)
    setTransportKey('C')
    setSteps(16)
    setCurrentStep(0)
    setBpmRange([70, 165]) // Reset BPM range to default
    
    // Reset tracks to default (Auto mode tracks)
    setTracks([
      { id: 1, name: 'Melody Loop', audioUrl: null, color: 'bg-red-500' },
      { id: 2, name: 'Drum Loop', audioUrl: null, color: 'bg-blue-500' },
      { id: 3, name: 'Hihat Loop', audioUrl: null, color: 'bg-green-500' },
      { id: 4, name: 'Percussion Loop', audioUrl: null, color: 'bg-purple-500' },
      { id: 5, name: '808 Loop', audioUrl: null, color: 'bg-yellow-500' },
    ])
    
    // Turn auto mode back on when clearing all
    setIsAutoMode(true)
    
    // Clear all sequencer data (will be re-initialized by the useEffect when auto mode is set to true)
    setSequencerDataFromSession({})
    
    // Clear piano roll data
    setPianoRollDataFromSession({})
    
    // Reset mixer settings
    setMixerSettings({})
    
    // Reset genre selection
    setSelectedGenre(null)
    setSelectedSubgenre('')
    setIsGenreLocked(false)
    setIsSubgenreLocked(false)
    setAvailableSubgenres([])
    setGenreSubgenres({})
    setGenreTemplates([])
    
    // Reset session
    setCurrentSessionId(null)
    
    // Stop playback
    stopSequence()
    setIsPlaying(false)
    
    // Reset transport locks
    setIsBpmLocked(false)
    setIsKeyLocked(false)
    setIsReadyCheckEnabled(true)
    setIsReadyCheckLocked(false)
    
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

  // Function to open save session dialog with cleared form
  const openSaveSessionDialog = () => {
    setSessionName('')
    setSessionDescription('')
    setSessionCategory('')
    setSessionTags('')
    setShowSessionDialog(true)
  }

  // Song Arrangement functions
  const loadSavedSongArrangements = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('song_arrangements')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading song arrangements:', error)
        return
      }

      setSavedSongArrangements(data || [])
    } catch (error) {
      console.error('Error loading song arrangements:', error)
    }
  }

  const saveSongArrangement = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to save song arrangements')
        return
      }

      if (!songName.trim()) {
        alert('Please enter a song name')
        return
      }

      const tags = songTags.split(',').map(tag => tag.trim()).filter(Boolean)

      // Prepare track patterns data
      const trackPatternsData: any = {}
      tracks.forEach(track => {
        if (sequencerData[track.id]) {
          trackPatternsData[track.id] = {
            name: track.name,
            sequencer_data: sequencerData[track.id],
            bpm: bpm,
            key: transportKey,
            color: track.color,
            audioUrl: track.audioUrl
          }
        }
      })

      const { data, error } = await supabase
        .from('song_arrangements')
        .insert({
          user_id: user.id,
          name: songName,
          description: songDescription,
          category: songCategory,
          genre: songGenre,
          subgenre: songSubgenre,
          tags: tags,
          bpm: bpm,
          steps: steps,
          transport_key: transportKey,
          pattern_assignments: songPatternAssignments,
          track_patterns: trackPatternsData
        })
        .select()
        .single()

      if (error) {
        console.error('Error saving song arrangement:', error)
        alert('Failed to save song arrangement')
        return
      }

      console.log('Song arrangement saved:', data)
      setShowSaveSongDialog(false)
      setSongName('')
      setSongDescription('')
      setSongCategory('')
      setSongGenre('')
      setSongSubgenre('')
      setSongTags('')
      
      // Refresh the list
      loadSavedSongArrangements()
      
      alert('Song arrangement saved successfully!')
    } catch (error) {
      console.error('Error saving song arrangement:', error)
      alert('Failed to save song arrangement')
    }
  }

  const loadSongArrangement = async (arrangementId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('song_arrangements')
        .select('*')
        .eq('id', arrangementId)
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.error('Error loading song arrangement:', error)
        return
      }

      if (!data) {
        alert('Song arrangement not found')
        return
      }

      // Load the song arrangement data
      setBpm(data.bpm)
      setSteps(data.steps)
      setTransportKey(data.transport_key || 'C')
      
      // Load pattern assignments
      if (data.pattern_assignments) {
        setSongPatternAssignments(data.pattern_assignments)
      }

      // Load track patterns if available
      if (data.track_patterns) {
        // Restore sequencer data for each track
        const restoredSequencerData: any = {}
        Object.entries(data.track_patterns).forEach(([trackId, trackData]: [string, any]) => {
          if (trackData.sequencer_data) {
            restoredSequencerData[parseInt(trackId)] = trackData.sequencer_data
          }
        })
        
        // Update the sequencer data
        if (Object.keys(restoredSequencerData).length > 0) {
          setSequencerDataFromSession(restoredSequencerData)
        }
      }

      // Load genre and subgenre if available
      if (data.genre) {
        setSongGenre(data.genre)
      }
      if (data.subgenre) {
        setSongSubgenre(data.subgenre)
      }

      setShowLoadSongDialog(false)
      alert(`Song arrangement "${data.name}" loaded successfully!`)
    } catch (error) {
      console.error('Error loading song arrangement:', error)
      alert('Failed to load song arrangement')
    }
  }

  const deleteSongArrangement = async (arrangementId: string) => {
    if (!confirm('Are you sure you want to delete this song arrangement?')) {
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('song_arrangements')
        .delete()
        .eq('id', arrangementId)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error deleting song arrangement:', error)
        alert('Failed to delete song arrangement')
        return
      }

      // Refresh the list
      loadSavedSongArrangements()
      alert('Song arrangement deleted successfully!')
    } catch (error) {
      console.error('Error deleting song arrangement:', error)
      alert('Failed to delete song arrangement')
    }
  }

  const openSaveSongDialog = () => {
    setSongName('')
    setSongDescription('')
    setSongCategory('')
    setSongGenre('')
    setSongSubgenre('')
    setSongTags('')
    setShowSaveSongDialog(true)
  }

  // Song Track Pattern functions
  const loadSavedSongTrackPatterns = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('song_arrangements')
        .select('*')
        .eq('user_id', user.id)
        .not('track_patterns', 'is', null)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading song track patterns:', error)
        return
      }

      // Extract track patterns from song arrangements
      const trackPatterns: any[] = []
      data?.forEach(arrangement => {
        if (arrangement.track_patterns) {
          Object.entries(arrangement.track_patterns).forEach(([trackId, trackData]: [string, any]) => {
            trackPatterns.push({
              id: `${arrangement.id}_${trackId}`,
              arrangementId: arrangement.id,
              arrangementName: arrangement.name,
              trackId: parseInt(trackId),
              trackName: trackData.name,
              sequencerData: trackData.sequencer_data,
              bpm: trackData.bpm,
              key: trackData.key,
              color: trackData.color,
              created_at: arrangement.created_at
            })
          })
        }
      })

      setSavedSongTrackPatterns(trackPatterns)
    } catch (error) {
      console.error('Error loading song track patterns:', error)
    }
  }

  const saveSongTrackPattern = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to save track patterns')
        return
      }

      if (!songTrackPatternName.trim()) {
        alert('Please enter a pattern name')
        return
      }

      if (!selectedSongTrackForPattern) {
        alert('No track selected')
        return
      }

      const track = tracks.find(t => t.id === selectedSongTrackForPattern)
      if (!track) {
        alert('Track not found')
        return
      }

      const tags = songTrackPatternTags.split(',').map(tag => tag.trim()).filter(Boolean)

      // Create a new song arrangement with just this track pattern
      const trackPatternsData: any = {}
      trackPatternsData[selectedSongTrackForPattern] = {
        name: track.name,
        sequencer_data: sequencerData[selectedSongTrackForPattern] || [],
        bpm: bpm,
        key: transportKey,
        color: track.color,
        audioUrl: track.audioUrl
      }

      const { data, error } = await supabase
        .from('song_arrangements')
        .insert({
          user_id: user.id,
          name: `${songTrackPatternName} - ${track.name}`,
          description: songTrackPatternDescription || `Track pattern for ${track.name}`,
          category: songTrackPatternCategory,
          genre: '',
          subgenre: '',
          tags: tags,
          bpm: bpm,
          steps: steps,
          transport_key: transportKey,
          pattern_assignments: {},
          track_patterns: trackPatternsData
        })
        .select()
        .single()

      if (error) {
        console.error('Error saving song track pattern:', error)
        alert('Failed to save track pattern')
        return
      }

      console.log('Song track pattern saved:', data)
      setShowSaveSongTrackPatternDialog(false)
      setSongTrackPatternName('')
      setSongTrackPatternDescription('')
      setSongTrackPatternCategory('')
      setSongTrackPatternTags('')
      setSelectedSongTrackForPattern(null)
      
      // Refresh the list
      loadSavedSongTrackPatterns()
      
      alert('Track pattern saved successfully!')
    } catch (error) {
      console.error('Error saving song track pattern:', error)
      alert('Failed to save track pattern')
    }
  }

  const loadSongTrackPattern = async (patternId: string) => {
    try {
      const [arrangementId, trackId] = patternId.split('_')
      const trackIdNum = parseInt(trackId)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('song_arrangements')
        .select('*')
        .eq('id', arrangementId)
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.error('Error loading song track pattern:', error)
        return
      }

      if (!data || !data.track_patterns || !data.track_patterns[trackIdNum]) {
        alert('Track pattern not found')
        return
      }

      const trackData = data.track_patterns[trackIdNum]

      // Load the track pattern data
      if (trackData.sequencer_data) {
        const restoredSequencerData: any = {}
        restoredSequencerData[trackIdNum] = trackData.sequencer_data
        setSequencerDataFromSession(restoredSequencerData)
      }

      // Update BPM and key if they're different
      if (trackData.bpm && trackData.bpm !== bpm) {
        setBpm(trackData.bpm)
      }
      if (trackData.key && trackData.key !== transportKey) {
        setTransportKey(trackData.key)
      }

      setShowLoadSongTrackPatternDialog(false)
      alert(`Track pattern "${trackData.name}" loaded successfully!`)
    } catch (error) {
      console.error('Error loading song track pattern:', error)
      alert('Failed to load track pattern')
    }
  }

  const openSaveSongTrackPatternDialog = (trackId: number) => {
    setSelectedSongTrackForPattern(trackId)
    setSongTrackPatternName('')
    setSongTrackPatternDescription('')
    setSongTrackPatternCategory('')
    setSongTrackPatternTags('')
    setShowSaveSongTrackPatternDialog(true)
  }

  const savePatternAsTrackPattern = async (patternData: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to save track patterns')
        return
      }

      // Create a new song arrangement with just this pattern
      const trackPatternsData: any = {}
      trackPatternsData[1] = { // Use track ID 1 for pattern-only saves
        name: patternData.name,
        sequencer_data: patternData.sequencer_data,
        bpm: patternData.bpm,
        key: patternData.key,
        color: patternData.color,
        audioUrl: patternData.audioUrl
      }

      const { data, error } = await supabase
        .from('song_arrangements')
        .insert({
          user_id: user.id,
          name: `${patternData.name} - Pattern`,
          description: `Track pattern for ${patternData.name}`,
          category: '',
          genre: '',
          subgenre: '',
          tags: [],
          bpm: patternData.bpm,
          steps: steps,
          transport_key: patternData.key,
          pattern_assignments: {},
          track_patterns: trackPatternsData
        })
        .select()
        .single()

      if (error) {
        console.error('Error saving pattern as track pattern:', error)
        alert('Failed to save pattern')
        return
      }

      console.log('Pattern saved as track pattern:', data)
      alert(`Pattern "${patternData.name}" saved successfully!`)
      
      // Refresh the list
      loadSavedSongTrackPatterns()
    } catch (error) {
      console.error('Error saving pattern as track pattern:', error)
      alert('Failed to save pattern')
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Ortega Beat Maker</h1>
          <p className="text-gray-400">Create beats with our professional tools</p>
        </div>
        <div className="flex gap-2">
          
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
          
          {/* Subgenre Selector */}
          <div className="relative">
            <select
              value={selectedSubgenre}
              onChange={(e) => handleSubgenreChange(e.target.value)}
              className="bg-black border border-blue-400 text-white px-3 py-2 rounded pr-8"
              disabled={!selectedGenre}
            >
              <option value="">
                {selectedGenre ? 'All Subgenres' : 'Select Genre First'}
              </option>
              {availableSubgenres.map((subgenre) => (
                <option key={subgenre} value={subgenre}>
                  {subgenre}
                </option>
              ))}
            </select>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowGenreDialog(true)}
            className="border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black"
          >
            <Music className="w-4 h-4 mr-2" />
            Genres
          </Button>

          

        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="sequencer" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 bg-[#141414] border-gray-700">
          <TabsTrigger value="sequencer" className="data-[state=active]:bg-[#2a2a2a] text-white">
            <Disc className="w-4 h-4 mr-2" />
            Sequencer
          </TabsTrigger>
          <TabsTrigger value="song" className="data-[state=active]:bg-[#2a2a2a] text-white">
            <Music className="w-4 h-4 mr-2" />
            Song
          </TabsTrigger>
          <TabsTrigger value="mixer" className="data-[state=active]:bg-[#2a2a2a] text-white">
            <Settings className="w-4 h-4 mr-2" />
            Mixer
          </TabsTrigger>
          <TabsTrigger value="sessions" className="data-[state=active]:bg-[#2a2a2a] text-white">
            <List className="w-4 h-4 mr-2" />
            Sessions
          </TabsTrigger>
        </TabsList>

        {/* Sequencer Tab */}
        <TabsContent value="sequencer" className="space-y-6 mt-6">

      {/* Transport Controls */}
      <Card className="!bg-[#141414] border-gray-700">
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {/* Main Transport Controls Row */}
            <div className="flex items-center gap-4 flex-wrap">
              {/* Playback Controls */}
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          onClick={handlePlayPause}
                          variant={isPlaying ? "destructive" : "default"}
                          size="lg"
                          className="w-16 h-16 rounded-full"
                          disabled={!hasLoadedAudio}
                        >
                          {isPlaying ? <Square className="w-6 h-6" /> : <Play className="w-6 h-6" />}
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
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button
                  onClick={handleShuffleAll}
                  variant="outline"
                  size="sm"
                  className="bg-black text-yellow-400 hover:text-yellow-300 hover:bg-gray-900 border-gray-600"
                >
                  <Brain className="w-4 h-4 mr-1" />
                  AI
                </Button>
                <Button
                  onClick={handleClearAll}
                  variant="outline"
                  size="sm"
                  className="bg-red-900 text-red-400 hover:text-red-300 hover:bg-red-800 border-red-600"
                  title="Clear all data and reset to fresh start"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
                <Button
                  onClick={() => setIsAutoMode(!isAutoMode)}
                  variant="outline"
                  size="sm"
                  className={`${
                    isAutoMode 
                      ? 'bg-green-600 text-white hover:bg-green-700 border-green-500' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500'
                  }`}
                  title={isAutoMode ? "Auto mode is ON - Click to turn off" : "Auto mode is OFF - Click to turn on"}
                >
                  <Settings className="w-4 h-4 mr-1" />
                  Auto
                </Button>
                <Button
                  onClick={openSaveSessionDialog}
                  variant="outline"
                  size="sm"
                  className="bg-blue-600 text-white hover:bg-blue-700 border-blue-500"
                  title="Save current session"
                >
                  <Save className="w-4 h-4 mr-1" />
                  Save Session
                </Button>
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
                <Button
                  onClick={debugAudioLibraryData}
                  variant="outline"
                  size="sm"
                  className="bg-gray-600 text-white hover:bg-gray-700 border-gray-500"
                  title="Debug audio library data - check kick files and ready status"
                >
                  <Bug className="w-4 h-4 mr-1" />
                  Debug
                </Button>
              </div>

              {/* BPM Controls */}
              <div className="flex items-center gap-2">
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
                    onValueChange={(value) => setBpm(value[0])}
                    min={60}
                    max={200}
                    step={1}
                    className="w-full"
                    disabled={isBpmLocked}
                  />
                </div>
              </div>
              
              {/* Key Controls */}
              <div className="flex items-center gap-2">
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
              {/* Melody Loop Mode */}
              <div className="flex items-center gap-2">
                
                {/* Melody Loop Mode Indicator */}
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={`text-xs px-2 py-1 ${
                      melodyLoopMode === 'transport-dominates' 
                        ? 'bg-blue-400/20 border-blue-400 text-blue-300' 
                        : 'bg-purple-400/20 border-purple-400 text-purple-300'
                    }`}
                    title={`Melody Loop Mode: ${melodyLoopMode === 'transport-dominates' ? 'Transport dominates (Mode B)' : 'Melody Loop dominates (Mode A)'}`}
                  >
                    {melodyLoopMode === 'transport-dominates' ? 'T→M' : 'M→T'}
                  </Badge>
                  <span className="text-gray-400 text-xs">
                    {melodyLoopMode === 'transport-dominates' 
                      ? 'Transport controls Melody Loop' 
                      : 'Melody Loop controls Transport'
                    }
                  </span>
                </div>
              </div>
              


              {/* Steps Controls */}
              <div className="flex items-center gap-2">
                <span className="text-white text-sm">Steps:</span>
                <div className="flex gap-1">
                  {[8, 16, 32, 64].map((stepCount) => (
                    <Button
                      key={stepCount}
                      variant={steps === stepCount ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSteps(stepCount)}
                      className="w-8 h-8 p-0"
                    >
                      {stepCount}
                    </Button>
                  ))}
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
            transportKey={transportKey}
            melodyLoopMode={melodyLoopMode}
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
            onToggleStep={toggleStep}
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
          />
        </div>
      </div>

      {/* Sample Library Modal */}
      {showSampleLibrary && selectedTrack && (
        <SampleLibrary
          isOpen={showSampleLibrary}
          onClose={() => setShowSampleLibrary(false)}
          onSelectAudio={(audioUrl, audioName, metadata) => handleTrackAudioSelect(selectedTrack, audioUrl, audioName, metadata)}
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

      {/* Audio Piano Roll Modal */}
      {showAudioPianoRoll && (
        <AudioPianoRoll
          isOpen={showAudioPianoRoll}
          onClose={() => setShowAudioPianoRoll(false)}
          steps={steps}
          bpm={bpm}
          tracks={tracks}
          onNotesChange={handleAudioPianoRollNotesChange}
          initialNotes={audioPianoRollNotes}
          onSavePattern={handleSavePattern}
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

        {/* Song Tab */}
        <TabsContent value="song" className="space-y-6 mt-6">
          <Card className="!bg-[#141414] border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Song Arrangement</CardTitle>
                  <p className="text-gray-400 text-sm">
                    Automatic playback - tracks with sequencer patterns will play
                  </p>
    </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openSaveSongDialog}
                    className="text-green-400 hover:text-green-300 hover:bg-green-900/20"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Save Song
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowLoadSongDialog(true)}
                    className="text-orange-400 hover:text-orange-300 hover:bg-orange-900/20"
                  >
                    <FolderOpen className="w-4 h-4 mr-1" />
                    Load Song
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPatternDetails(!showPatternDetails)}
                    className="flex items-center gap-2"
                  >
                    {showPatternDetails ? (
                      <>
                        <div className="w-4 h-4 flex gap-0.5">
                          <div className="flex-1 bg-blue-500 rounded-sm"></div>
                          <div className="flex-1 bg-gray-400 rounded-sm"></div>
                          <div className="flex-1 bg-blue-500 rounded-sm"></div>
                          <div className="flex-1 bg-gray-400 rounded-sm"></div>
                        </div>
                        Hide Patterns
                      </>
                    ) : (
                      <>
                        <div className="w-4 h-4 bg-blue-500 rounded"></div>
                        Show Patterns
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex h-[600px]">
                {/* Pattern List Sidebar */}
                <div className="w-48 bg-[#0f0f0f] border-r border-gray-600 p-4">
                  <h3 className="text-white font-medium mb-4">Patterns</h3>
                  <div className="space-y-2">
                    {currentSequencerPatterns.length === 0 ? (
                      <div className="text-center text-gray-500 text-sm py-4">
                        <div className="mb-2">No active patterns</div>
                        <div className="text-xs">Create patterns in the Sequencer tab first</div>
                      </div>
                    ) : (
                      currentSequencerPatterns.map((pattern, index) => (
                        <div key={pattern.id} className="space-y-1">
                          <div
                            className={`flex items-center p-2 rounded border transition-all cursor-pointer hover:bg-[#2a2a2a] ${
                                selectedPatternForPlacement === pattern.id
                                  ? 'bg-[#1f5f3a] border-green-500'
                                  : 'bg-[#1f1f1f] border-gray-600 hover:border-gray-500'
                            }`}
                            onClick={() => {
                              // Toggle pattern selection - if already selected, deselect it
                              if (selectedPatternForPlacement === pattern.id) {
                                clearPatternSelection()
                              } else {
                                selectPatternForPlacement(pattern.id)
                              }
                            }}
                            title="Click to select/deselect this pattern for placement"
                          >
                            <div className={`w-3 h-3 rounded mr-2 ${
                              pattern.id.startsWith('track-') && pattern.tracks[0] ? pattern.tracks[0].color : (index === 0 ? 'bg-green-500' : 
                              index === 1 ? 'bg-blue-500' : 
                              index === 2 ? 'bg-purple-500' : 'bg-orange-500')
                            }`}></div>
                            <span className="text-white text-sm flex-1">{pattern.name}</span>
                            <div className="ml-auto flex items-center gap-1">
                              {pattern.id.startsWith('track-') && (
                                <div className="text-blue-400 text-xs">🎛️</div>
                              )}
                              {selectedPatternForPlacement === pattern.id && (
                                <div className="text-green-400 text-xs">📌</div>
                              )}
                              {!pattern.id.startsWith('track-') && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-xs h-6 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    removeCurrentSequencerPattern(pattern.id)
                                  }}
                                  title="Remove this pattern"
                                >
                                  ×
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          {/* Pattern action buttons */}
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 text-xs h-6"
                              onClick={(e) => {
                                e.stopPropagation()
                                selectPatternForPlacement(pattern.id)
                              }}
                            >
                              Use
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-6 text-green-400 hover:text-green-300 hover:bg-green-900/20"
                              onClick={(e) => {
                                e.stopPropagation()
                                // Save this track pattern
                                const patternName = pattern.id.startsWith('track-') ? `${pattern.name} Pattern` : pattern.name
                                handleSavePattern(patternName)
                              }}
                              title="Save this pattern"
                            >
                              <Save className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-6 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                              onClick={(e) => {
                                e.stopPropagation()
                                // Load saved patterns
                                refreshSavedPatterns()
                                setShowLoadPatternDialog(true)
                              }}
                              title="Load saved patterns"
                            >
                              <FolderOpen className="w-3 h-3" />
                            </Button>
                          </div>
                          
                          {/* Pattern info */}
                          <div className="text-xs text-gray-500 text-center">
                            BPM: {pattern.bpm} | Steps: {pattern.steps} 
                            {pattern.id.startsWith('track-') ? (
                              <>
                                | Live
                                {pattern.trackKey && (
                                  <span className="text-blue-400"> | Key: {pattern.trackKey}</span>
                                )}
                                {pattern.trackBpm && pattern.trackBpm !== pattern.bpm && (
                                  <span className="text-orange-400"> | Track: {pattern.trackBpm}BPM</span>
                                )}
                              </>
                            ) : (
                              pattern.transportKey && (
                                <span> | Key: {pattern.transportKey}</span>
                              )
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-6 space-y-2">
                    <Button size="sm" variant="outline" className="w-full" onClick={() => captureCurrentSequencerAsPattern()}>
                      <Music className="w-4 h-4 mr-2" />
                      Capture Full Pattern
                    </Button>
                    <Button size="sm" variant="outline" className="w-full" onClick={saveAsNewPattern}>
                      <Save className="w-4 h-4 mr-2" />
                      Save to Database
                    </Button>
                    <Button size="sm" variant="outline" className="w-full" onClick={refreshSavedPatterns}>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Load Saved Patterns
                    </Button>
                    <div className="text-xs text-gray-500 text-center space-y-1">
                      <div className="text-blue-500">🎛️ Blue = Live track patterns</div>
                      <div className="text-green-500">📌 Green = Selected for placement</div>
                      <div className="text-purple-400 mt-2">🎼 Click pattern then click timeline to assign!</div>
                      <div className="text-orange-400 text-xs">🎯 Track patterns only work on their specific track</div>
                      <div className="text-cyan-400 text-xs">👁️ Toggle button to show/hide pattern details</div>
                    </div>
                  </div>
                </div>

                {/* Song Timeline */}
                <div className="flex-1 overflow-auto">
                  {/* Timeline Header */}
                  <div className="sticky top-0 bg-[#141414] border-b border-gray-600 p-2">
                    <div className="flex relative">
                      <div className="w-24 text-center text-gray-400 text-xs py-2">Steps</div>
                      {/* Dynamic timeline based on sequencer steps - calculate how many bars we need */}
                      {Array.from({ length: Math.max(64, Math.ceil(128 / steps) * 4) }, (_, i) => {
                        // Check if any track has pattern assignments at this bar
                        const hasPatternAssignments = Object.values(songPatternAssignments).some(trackAssignments => 
                          trackAssignments[i]
                        )
                        
                        // Check if this bar is currently playing based on step position
                        const isCurrentlyPlaying = songPlayback.isPlaying && songPlayback.currentBar === i
                        
                        // Use the sequencer's current step count for consistent bar width
                const sequencerSteps = steps
                // Each step should be 4px wide, so a 16-step pattern should be 64px wide, 32-step = 128px, 64-step = 256px
                const barWidth = Math.max(64, sequencerSteps * 4)
                        
                        return (
                          <div 
                            key={i} 
                            className={`text-center text-xs py-2 border-r border-gray-700 relative ${
                              isCurrentlyPlaying
                                ? 'bg-green-500/20 text-green-400' 
                                : hasPatternAssignments
                                  ? 'text-blue-400'
                                  : 'text-gray-400'
                            }`}
                            style={{ width: `${barWidth}px` }}
                          >
                                {i + 1}
                                {hasPatternAssignments && !songPlayback.isPlaying && (
                                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full"></div>
                                )}
                                {isCurrentlyPlaying && (
                                  <div className="absolute top-0 left-0 w-full h-full bg-green-500/30 animate-pulse"></div>
                                )}
                              </div>
                            )
                          })}
                      
                      {/* Playhead */}
                      {songPlayback.isPlaying && (
                        <div 
                          className="absolute top-0 w-1 h-full bg-green-500 z-10 transition-all duration-100"
                          style={{ 
                            left: `${96 + getPlayheadBasePosition()}px`,
                            transform: `translateX(${getPlayheadOffset()}px)`
                          }}
                        >
                          <div className="w-3 h-3 bg-green-500 rounded-full -ml-1 -mt-1"></div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Track Rows */}
                  <div className="space-y-1 p-2">
                    {tracks.map((track, trackIndex) => (
                      <div key={track.id} className="flex items-center h-12 bg-[#1a1a1a] rounded">
                        {/* Track Header */}
                        <div className="w-24 px-2 flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${track.color}`}></div>
                          <div className="flex flex-col">
                            <div className="text-white text-xs font-medium truncate">
                              {getTrackTypeName(track.name)}
                            </div>
                            <div className={`text-xs ${track.audioUrl ? 'text-green-500' : 'text-gray-500'}`}>
                              {track.audioUrl ? 'LOADED' : 'EMPTY'}
                            </div>
                          </div>
                        </div>

                        {/* Timeline Grid */}
                        <div className="flex-1 flex relative">
                          {/* Timeline grid - dynamic based on sequencer steps */}
                          {Array.from({ length: Math.max(64, Math.ceil(128 / steps) * 4) }, (_, i) => {
                            const assignedPatternId = getAssignedPattern(track.id, i)
                            const assignedPattern = assignedPatternId ? currentSequencerPatterns.find(p => p.id === assignedPatternId) : null
                            const isCurrentBar = songPlayback.isPlaying && songPlayback.currentBar === i
                            const isSelected = selectedPatternForPlacement === assignedPatternId
                            
                            // Use the sequencer's current step count for consistent bar width
                            const sequencerSteps = steps
                            
                            // Calculate if this specific step is currently playing
                            const isCurrentStep = isCurrentBar && assignedPattern && songPlayback.isPlaying
                            const currentStepInBar = songPlaybackRef.current.currentStep % sequencerSteps
                            // Each step should be 4px wide, so a 16-step pattern should be 64px wide, 32-step = 128px, 64-step = 256px
                            const barWidth = Math.max(64, sequencerSteps * 4)
                            
                            return (
                              <div 
                                key={i} 
                                className={`h-8 border-r border-gray-700/30 cursor-pointer transition-colors flex items-center justify-center relative ${
                                  assignedPattern 
                                    ? 'bg-gray-800/50 border-gray-600' 
                                    : 'hover:bg-gray-700/30'
                                } ${isCurrentBar && assignedPattern ? 'ring-2 ring-green-400 animate-pulse' : ''} ${isSelected ? 'ring-2 ring-blue-400' : ''}`}
                                style={{ width: `${barWidth}px` }}
                                onClick={() => {
                                  if (selectedPatternForPlacement) {
                                    // Check if the selected pattern is compatible with this track
                                    const selectedPattern = currentSequencerPatterns.find(p => p.id === selectedPatternForPlacement)
                                    if (selectedPattern) {
                                      if (selectedPattern.id.startsWith('track-')) {
                                        // Track pattern - only assign if it matches this track
                                        const patternTrackId = parseInt(selectedPattern.id.replace('track-', ''))
                                        if (patternTrackId === track.id) {
                                    assignPatternToTrack(track.id, i, selectedPatternForPlacement)
                                        } else {
                                          // Show a message that this pattern is for a different track
                                          alert(`This pattern is for ${selectedPattern.name}, not ${track.name}`)
                                        }
                                      } else {
                                        // Full pattern - assign to all tracks
                                        assignPatternToTrack(track.id, i, selectedPatternForPlacement)
                                      }
                                    }
                                    // Don't clear selection - keep it selected for multiple assignments
                                  } else if (assignedPatternId) {
                                    // Remove the assigned pattern
                                    assignPatternToTrack(track.id, i, null)
                                  }
                                }}
                                title={`Bar ${i + 1} - ${track.name} ${assignedPattern ? `(${assignedPattern.name}, ${assignedPattern.steps || 16} steps${assignedPattern.trackKey ? `, Key: ${assignedPattern.trackKey}` : ''}${assignedPattern.trackBpm && assignedPattern.trackBpm !== assignedPattern.bpm ? `, Track BPM: ${assignedPattern.trackBpm}` : ''})` : '(No Pattern)'} - ${selectedPatternForPlacement ? 'Click to assign pattern' : 'Click to remove pattern'}`}
                              >
                                {assignedPattern && (
                                  <div className="absolute inset-0 p-1">
                                    {showPatternDetails ? (
                                      <>
                                        {/* Show the assigned pattern for this track */}
                                        <div className="w-full h-full flex items-center gap-0.5">
                                          {(assignedPattern.sequencerData[track.id] || []).slice(0, sequencerSteps).map((stepActive: boolean, stepIndex: number) => (
                                            <div
                                              key={stepIndex}
                                              className={`h-full rounded-sm ${
                                                stepActive 
                                                  ? getTrackColorHex(track.color) 
                                                  : 'bg-gray-600/30'
                                              } ${isCurrentStep && currentStepInBar === stepIndex ? 'ring-1 ring-white' : ''}`}
                                              style={{
                                                backgroundColor: stepActive ? getTrackColorHex(track.color) : undefined,
                                                width: `${100 / sequencerSteps}%`
                                              }}
                                            />
                                          )) || Array.from({ length: sequencerSteps }, (_, stepIndex) => (
                                            <div
                                              key={stepIndex}
                                              className={`h-full bg-gray-600/30 rounded-sm ${isCurrentStep && currentStepInBar === stepIndex ? 'ring-1 ring-white' : ''}`}
                                              style={{
                                                width: `${100 / sequencerSteps}%`
                                              }}
                                            />
                                          ))}
                                        </div>
                                        
                                        {/* Show pattern name and step count */}
                                        <div className="absolute bottom-0 left-0 right-0 text-center">
                                          <div className="text-white text-xs font-bold truncate px-1">
                                            {assignedPattern.name}
                                          </div>
                                          <div className="text-gray-400 text-xs">
                                            {sequencerSteps} steps
                                            {assignedPattern.trackKey && (
                                              <span className="text-blue-400"> | {assignedPattern.trackKey}</span>
                                            )}
                                          </div>
                                        </div>
                                        
                                        {/* Show current step position when playing */}
                                        {isCurrentStep && (
                                          <div className="absolute top-0 left-0 right-0 text-center">
                                            <div className="text-yellow-300 text-xs font-bold bg-black/50 px-1 rounded">
                                              Step {currentStepInBar + 1}
                                            </div>
                                          </div>
                                        )}
                                        
                                        {/* Show playing indicator */}
                                        {isCurrentBar && songPlayback.isPlaying && (
                                          <div className="absolute top-1 right-1 text-green-400 text-xs font-bold">
                                            🔊
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <>
                                        {/* Simple solid bar view */}
                                        <div 
                                          className="w-full h-full rounded-sm"
                                          style={{
                                            backgroundColor: isCurrentBar && songPlayback.isPlaying 
                                              ? '#22c55e' 
                                              : getTrackColorHex(track.color)
                                          }}
                                        />
                                        
                                        {/* Show simple playing indicator */}
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <div className="text-white text-xs font-bold">
                                            {isCurrentBar && songPlayback.isPlaying ? '🔊' : '●'}
                                          </div>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )}
                                
                                {!assignedPattern && (
                                  <div className="text-gray-500 text-xs">+</div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="p-4 border-t border-gray-600 bg-[#0f0f0f]">
                <div className="flex items-center gap-4">
                  <Button 
                    size="sm" 
                    variant={songPlayback.isPlaying ? "destructive" : "outline"}
                    onClick={playSongArrangement}
                    disabled={!songPlayback.isPlaying && !Object.values(songPatternAssignments).some(trackAssignments => 
                      Object.keys(trackAssignments).length > 0
                    )}
                  >
                    {songPlayback.isPlaying ? (
                      <>
                        <Square className="w-4 h-4 mr-2" />
                        Stop Song
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        {!Object.values(songPatternAssignments).some(trackAssignments => 
                          Object.keys(trackAssignments).length > 0
                        ) 
                          ? 'No Patterns Assigned' 
                          : 'Play Song'
                        }
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setSongPlayback(prev => ({ ...prev, currentBar: 0 }))}
                    disabled={songPlayback.isPlaying}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                  
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={clearAllArrangements}
                    disabled={!Object.values(sequencerData || {}).some(trackData => 
                      trackData && trackData.some((isActive: boolean) => isActive)
                    )}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Clear All
                  </Button>
                  
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={debugPatternAssignments}
                    className="text-purple-400 hover:text-purple-300 hover:bg-purple-900/20"
                  >
                    <Bug className="w-4 h-4 mr-2" />
                    Debug Assignments
                  </Button>
                  
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      console.log('[MANUAL DEBUG] Manually assigning test patterns...')
                      assignPatternToTrack(1, 0, 'track-1')
                      assignPatternToTrack(2, 0, 'track-2')
                      setTimeout(() => {
                        console.log('[MANUAL DEBUG] After manual assignment:')
                        debugPatternAssignments()
                      }, 100)
                    }}
                    className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Test Assign
                  </Button>

                  {lastLoadedPattern && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-purple-600 rounded">
                      <span className="text-white text-sm">🎛️ In Sequencer:</span>
                      <span className="text-purple-200 text-sm font-medium">
                        {savedPatterns.find(p => p.id === lastLoadedPattern)?.name}
                      </span>
                    </div>
                  )}

                  {songPlayback.isPlaying && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-green-600 rounded animate-pulse">
                      <span className="text-white text-sm">🔊 Playing Bar:</span>
                      <span className="text-green-200 text-sm font-medium">
                        {songPlayback.currentBar + 1}
                      </span>
                    </div>
                  )}

                  {/* Debug Info */}
                  <div className="flex items-center gap-2 px-3 py-1 bg-gray-700 rounded">
                    <span className="text-white text-sm">Debug:</span>
                    <span className="text-gray-200 text-sm">
                      Global Steps: {steps} | Patterns: {currentSequencerPatterns.length} | BPM: {bpm} | Timeline Bars: {Math.max(64, Math.ceil(128 / steps) * 4)}
                    </span>
                  </div>
                  
                  {/* Timing Sync Info */}
                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-700 rounded">
                    <span className="text-white text-sm">Timing:</span>
                    <span className="text-blue-200 text-sm">
                      Step Duration: {(60 / bpm / 4).toFixed(3)}s | 
                      {songPlayback.isPlaying ? 'Song Playing' : 'Song Stopped'} | 
                      {isPlaying ? 'Sequencer Playing' : 'Sequencer Stopped'}
                    </span>
                  </div>
                  
                  {/* Tempo Sync Info */}
                  <div className="flex items-center gap-2 px-3 py-1 bg-green-700 rounded">
                    <span className="text-white text-sm">Tempo:</span>
                    <span className="text-green-200 text-sm">
                      Transport: {bpm} BPM | 
                      {tracks.filter(t => t.playbackRate && t.playbackRate !== 1).length > 0 
                        ? `${tracks.filter(t => t.playbackRate && t.playbackRate !== 1).length} tracks adjusted` 
                        : 'All tracks at original tempo'}
                    </span>
                  </div>
                  
                  {/* Visual Width Info */}
                  <div className="flex items-center gap-2 px-3 py-1 bg-purple-700 rounded">
                    <span className="text-white text-sm">Visual:</span>
                    <span className="text-purple-200 text-sm">
                      {songPlayback.isPlaying ? `Bar ${songPlayback.currentBar + 1}: ${songPlaybackRef.current.currentStep || 0} steps` : 'Stopped'} | 
                      Bar Width: {Math.max(64, steps * 4)}px | 
                      {currentSequencerPatterns.filter(p => p.steps && p.steps > 16).length > 0 
                        ? `${currentSequencerPatterns.filter(p => p.steps && p.steps > 16).length} long patterns` 
                        : 'All patterns 16 steps'}
                    </span>
                  </div>
                  
                  {/* M-T Mode Debug */}
                  <div className="flex items-center gap-2 px-3 py-1 bg-purple-900 rounded">
                    <span className="text-white text-sm">M-T Debug:</span>
                    <span className="text-purple-200 text-sm">
                      {melodyLoopMode === 'melody-dominates' ? (
                        tracks.find(t => t.name === 'Melody Loop') ? (
                          `ML Original: ${tracks.find(t => t.name === 'Melody Loop')?.originalBpm} | ` +
                          `ML Current: ${tracks.find(t => t.name === 'Melody Loop')?.currentBpm} | ` +
                          `Transport: ${bpm}`
                        ) : 'No Melody Loop track'
                      ) : 'Not in M-T mode'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 ml-auto">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm">Position:</span>
                      <span className={`text-sm font-mono ${songPlayback.isPlaying ? 'text-green-500' : 'text-white'}`}>
                        Bar {songPlayback.currentBar + 1}/32
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm">Tempo:</span>
                      <span className="text-white text-sm font-mono">{bpm} BPM</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm">Active Bars:</span>
                      <span className="text-white text-sm font-mono">
                        {Object.values(sequencerData || {}).reduce((total, trackData) => 
                          total + (trackData ? trackData.filter((isActive: boolean) => isActive).length : 0), 0
                        )}
                      </span>
                    </div>
                    <div className="ml-auto">
                      <Badge 
                        variant="outline" 
                        className={`${
                          songPlayback.isPlaying 
                            ? 'text-green-400 border-green-400 animate-pulse' 
                            : 'text-green-500 border-green-500'
                        }`}
                      >
                        {songPlayback.isPlaying ? '🔊 PLAYING SONG' : '🎵 Simple Toggle Mode'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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
                    volume: 0.7, pan: 0, mute: false, solo: false,
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
                        <div className="text-white text-xs font-medium truncate">{track.name}</div>
                        <div className={`text-xs ${
                          !track.audioUrl ? 'text-gray-500' :
                          isPlaying && sequencerData[track.id]?.[currentStep] ? 'text-green-500' :
                          'text-gray-400'
                        }`}>
                          {!track.audioUrl ? 'EMPTY' :
                           isPlaying && sequencerData[track.id]?.[currentStep] ? 'ACTIVE' : 'LOADED'}
                        </div>
                      </div>

                      {/* VU Meter */}
                      <div className="mb-4">
                        <div className="text-gray-400 text-xs mb-2 text-center">LEVEL</div>
                        <VUMeter 
                          level={audioLevels[track.id] || 0} 
                          peak={peakLevels[track.id] || 0} 
                          height={60}
                        />
                        <div className="text-gray-500 text-xs text-center mt-1">
                          {Math.round((audioLevels[track.id] || 0) * 100)}%
                        </div>
                      </div>

                      {/* EQ Section */}
                      <div className="mb-4">
                        <div className="text-gray-400 text-xs mb-2 text-center">EQ</div>
                        {/* High */}
                        <div className="mb-2">
                          <div className="text-gray-500 text-xs mb-1">HIGH</div>
                          <Slider
                            value={[settings.eq.high]}
                            onValueChange={(value) => updateEQ(track.id, 'high', value[0])}
                            min={-12}
                            max={12}
                            step={0.1}
                            orientation="vertical"
                            className="h-12"
                          />
                          <div className="text-gray-500 text-xs text-center mt-1">
                            {settings.eq.high.toFixed(1)}
                          </div>
                        </div>
                        {/* Mid */}
                        <div className="mb-2">
                          <div className="text-gray-500 text-xs mb-1">MID</div>
                          <Slider
                            value={[settings.eq.mid]}
                            onValueChange={(value) => updateEQ(track.id, 'mid', value[0])}
                            min={-12}
                            max={12}
                            step={0.1}
                            orientation="vertical"
                            className="h-12"
                          />
                          <div className="text-gray-500 text-xs text-center mt-1">
                            {settings.eq.mid.toFixed(1)}
                          </div>
                        </div>
                        {/* Low */}
                        <div className="mb-2">
                          <div className="text-gray-500 text-xs mb-1">LOW</div>
                          <Slider
                            value={[settings.eq.low]}
                            onValueChange={(value) => updateEQ(track.id, 'low', value[0])}
                            min={-12}
                            max={12}
                            step={0.1}
                            orientation="vertical"
                            className="h-12"
                          />
                          <div className="text-gray-500 text-xs text-center mt-1">
                            {settings.eq.low.toFixed(1)}
                          </div>
                        </div>
                      </div>

                      {/* Effects Section */}
                      <div className="mb-4">
                        <div className="text-gray-400 text-xs mb-2 text-center">FX</div>
                        {/* Reverb */}
                        <div className="mb-2">
                          <div className="text-gray-500 text-xs mb-1">REV</div>
                          <Slider
                            value={[settings.effects.reverb]}
                            onValueChange={(value) => updateEffect(track.id, 'reverb', value[0])}
                            min={0}
                            max={100}
                            step={1}
                            orientation="vertical"
                            className="h-8"
                          />
                          <div className="text-gray-500 text-xs text-center mt-1">
                            {settings.effects.reverb}
                          </div>
                        </div>
                        {/* Delay */}
                        <div className="mb-2">
                          <div className="text-gray-500 text-xs mb-1">DLY</div>
                          <Slider
                            value={[settings.effects.delay]}
                            onValueChange={(value) => updateEffect(track.id, 'delay', value[0])}
                            min={0}
                            max={100}
                            step={1}
                            orientation="vertical"
                            className="h-8"
                          />
                          <div className="text-gray-500 text-xs text-center mt-1">
                            {settings.effects.delay}
                          </div>
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

                      {/* Mute/Solo Buttons */}
                      <div className="mb-4 space-y-1">
                        <Button
                          size="sm"
                          variant={settings.mute ? "destructive" : "outline"}
                          className="w-full h-6 text-xs"
                          onClick={() => updateMixerSetting(track.id, 'mute', !settings.mute)}
                        >
                          MUTE
                        </Button>
                        <Button
                          size="sm"
                          variant={settings.solo ? "default" : "outline"}
                          className="w-full h-6 text-xs"
                          onClick={() => updateMixerSetting(track.id, 'solo', !settings.solo)}
                        >
                          SOLO
                        </Button>
                      </div>

                      {/* Volume Fader */}
                      <div className="mb-2">
                        <div className="text-gray-400 text-xs mb-2 text-center">VOLUME</div>
                        <div className="h-32 flex justify-center">
                          <Slider
                            value={[settings.volume]}
                            onValueChange={(value) => updateMixerSetting(track.id, 'volume', value[0])}
                            min={0}
                            max={1}
                            step={0.01}
                            orientation="vertical"
                            className="h-full"
                          />
                        </div>
                        <div className="text-gray-500 text-xs text-center mt-2">
                          {Math.round(settings.volume * 100)}%
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

                  {/* Master VU Meter */}
                  <div className="mb-4">
                    <div className="text-gray-400 text-xs mb-2 text-center">MASTER</div>
                    <VUMeter 
                      level={masterLevel} 
                      peak={masterPeak} 
                      height={60}
                    />
                    <div className="text-gray-500 text-xs text-center mt-1">
                      {Math.round(masterLevel * 100)}%
                    </div>
                  </div>

                  {/* Master EQ */}
                  <div className="mb-4">
                    <div className="text-gray-400 text-xs mb-2 text-center">MASTER EQ</div>
                    <div className="space-y-2">
                      <Slider value={[0]} min={-12} max={12} step={0.1} orientation="vertical" className="h-8" />
                      <Slider value={[0]} min={-12} max={12} step={0.1} orientation="vertical" className="h-8" />
                      <Slider value={[0]} min={-12} max={12} step={0.1} orientation="vertical" className="h-8" />
                    </div>
                  </div>

                  {/* Master Volume */}
                  <div className="mb-2">
                    <div className="text-gray-400 text-xs mb-2 text-center">MASTER</div>
                    <div className="h-32 flex justify-center">
                      <Slider
                        value={[0.8]}
                        min={0}
                        max={1}
                        step={0.01}
                        orientation="vertical"
                        className="h-full"
                      />
                    </div>
                    <div className="text-gray-500 text-xs text-center mt-2">80%</div>
                  </div>
                </div>
              </div>

              {/* Mixer Controls */}
              <div className="mt-6 p-4 border-t border-gray-600 bg-[#0f0f0f] rounded">
                <div className="flex items-center gap-4">
                  <Button size="sm" variant="outline">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset All
                  </Button>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm">Master Volume:</span>
                    <span className="text-white text-sm font-mono">80%</span>
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

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-6 mt-6">
          <Card className="!bg-[#141414] border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Beat Sessions</CardTitle>
                <Button
                  onClick={() => setShowSessionDialog(true)}
                  variant="outline"
                  size="sm"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save New Session
                </Button>
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
                      {savedSessions.length} session{savedSessions.length !== 1 ? 's' : ''} found
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
                  
                  <div className="grid gap-4">
                    {savedSessions.map((session) => (
                      <div
                        key={session.id}
                        className={`p-4 rounded-lg border transition-colors ${
                          currentSessionId === session.id
                            ? 'bg-[#2a2a2a] border-green-500'
                            : 'bg-[#1a1a1a] border-gray-600 hover:border-gray-500'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-white font-semibold text-lg">{session.name}</h3>
                              {currentSessionId === session.id && (
                                <Badge variant="outline" className="text-green-500 border-green-500 text-xs">
                                  Current
                                </Badge>
                              )}
                            </div>
                            
                            {session.description && (
                              <p className="text-gray-400 text-sm mb-3">{session.description}</p>
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
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              size="sm"
                              onClick={() => handleLoadSession(session.id)}
                              disabled={isLoading}
                              className="text-green-400 hover:text-green-300"
                            >
                              {isLoading ? 'Loading...' : 'Load'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteSession(session.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              Delete
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
        <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white max-w-4xl">
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
                <Button
                  onClick={handleSaveSession}
                  disabled={isSaving || !sessionName.trim()}
                  className="w-full"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Session
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
                      className="p-4 rounded-lg border border-gray-600 bg-[#2a2a2a] hover:bg-[#3a3a3a] transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-white">{session.name}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                            <span>BPM: {session.bpm}</span>
                            <span>Steps: {session.steps}</span>
                            {session.category && <span>Category: {session.category}</span>}
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
                            className="w-full"
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
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteSession(session.id)}
                            className="w-full text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          >
                            Delete
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

      {/* Save Song Arrangement Dialog */}
      <Dialog open={showSaveSongDialog} onOpenChange={setShowSaveSongDialog}>
        <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              Save Song Arrangement
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Save your current song arrangement with pattern assignments.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="song-name" className="text-white">Song Name *</Label>
              <Input
                id="song-name"
                value={songName}
                onChange={(e) => setSongName(e.target.value)}
                placeholder="My Awesome Song"
                className="bg-[#2a2a2a] border-gray-600 text-white"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="song-description" className="text-white">Description</Label>
              <Textarea
                id="song-description"
                value={songDescription}
                onChange={(e) => setSongDescription(e.target.value)}
                placeholder="Describe your song..."
                className="bg-[#2a2a2a] border-gray-600 text-white"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="song-category" className="text-white">Category</Label>
              <Input
                id="song-category"
                value={songCategory}
                onChange={(e) => setSongCategory(e.target.value)}
                placeholder="Hip Hop, Trap, etc."
                className="bg-[#2a2a2a] border-gray-600 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="song-genre" className="text-white">Genre</Label>
                <Input
                  id="song-genre"
                  value={songGenre}
                  onChange={(e) => setSongGenre(e.target.value)}
                  placeholder="Hip Hop, Trap, etc."
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="song-subgenre" className="text-white">Subgenre</Label>
                <Input
                  id="song-subgenre"
                  value={songSubgenre}
                  onChange={(e) => setSongSubgenre(e.target.value)}
                  placeholder="Type Beat, Drill, etc."
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="song-tags" className="text-white">Tags (comma separated)</Label>
              <Input
                id="song-tags"
                value={songTags}
                onChange={(e) => setSongTags(e.target.value)}
                placeholder="drums, bass, melody, etc."
                className="bg-[#2a2a2a] border-gray-600 text-white"
              />
            </div>
            <div className="text-sm text-gray-400">
              <div>Current BPM: {bpm}</div>
              <div>Current Steps: {steps}</div>
              <div>Current Key: {transportKey}</div>
              <div>Pattern Assignments: {Object.keys(songPatternAssignments).length} tracks</div>
              <div>Track Patterns: {Object.keys(sequencerData).length} tracks with sequencer data</div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveSongDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={saveSongArrangement}
              disabled={!songName.trim()}
              className="bg-green-400 text-black hover:bg-green-300"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Song
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Song Arrangement Dialog */}
      <Dialog open={showLoadSongDialog} onOpenChange={setShowLoadSongDialog}>
        <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              Load Song Arrangement
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Choose a saved song arrangement to load.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {savedSongArrangements.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <div className="mb-2">No saved song arrangements yet</div>
                <div className="text-sm">Save a song arrangement first to see it here</div>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {savedSongArrangements.map((arrangement) => (
                  <div
                    key={arrangement.id}
                    className="flex items-center justify-between p-3 bg-[#2a2a2a] rounded border border-gray-600 hover:border-gray-500 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="text-white font-medium">{arrangement.name}</div>
                      <div className="text-gray-400 text-sm">
                        {arrangement.description && `${arrangement.description} • `}
                        BPM: {arrangement.bpm} • Steps: {arrangement.steps} • Key: {arrangement.transport_key}
                      </div>
                      <div className="text-gray-500 text-xs">
                        {arrangement.category && `${arrangement.category} • `}
                        {arrangement.genre && `${arrangement.genre} • `}
                        {arrangement.subgenre && `${arrangement.subgenre} • `}
                        {arrangement.tags && arrangement.tags.length > 0 && `Tags: ${arrangement.tags.join(', ')} • `}
                        Created: {new Date(arrangement.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => loadSongArrangement(arrangement.id)}
                        className="text-green-400 hover:text-green-300 hover:bg-green-900/20"
                      >
                        Load
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteSongArrangement(arrangement.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLoadSongDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Song Track Pattern Dialog */}
      <Dialog open={showSaveSongTrackPatternDialog} onOpenChange={setShowSaveSongTrackPatternDialog}>
        <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              Save Track Pattern
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Save the current pattern for this track.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="track-pattern-name" className="text-white">Pattern Name *</Label>
              <Input
                id="track-pattern-name"
                value={songTrackPatternName}
                onChange={(e) => setSongTrackPatternName(e.target.value)}
                placeholder="My Awesome Pattern"
                className="bg-[#2a2a2a] border-gray-600 text-white"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="track-pattern-description" className="text-white">Description</Label>
              <Textarea
                id="track-pattern-description"
                value={songTrackPatternDescription}
                onChange={(e) => setSongTrackPatternDescription(e.target.value)}
                placeholder="Describe this pattern..."
                className="bg-[#2a2a2a] border-gray-600 text-white"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="track-pattern-category" className="text-white">Category</Label>
              <Input
                id="track-pattern-category"
                value={songTrackPatternCategory}
                onChange={(e) => setSongTrackPatternCategory(e.target.value)}
                placeholder="Drums, Bass, etc."
                className="bg-[#2a2a2a] border-gray-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="track-pattern-tags" className="text-white">Tags (comma separated)</Label>
              <Input
                id="track-pattern-tags"
                value={songTrackPatternTags}
                onChange={(e) => setSongTrackPatternTags(e.target.value)}
                placeholder="kick, heavy, etc."
                className="bg-[#2a2a2a] border-gray-600 text-white"
              />
            </div>
            <div className="text-sm text-gray-400">
              <div>Track: {selectedSongTrackForPattern ? tracks.find(t => t.id === selectedSongTrackForPattern)?.name : 'Unknown'}</div>
              <div>Current BPM: {bpm}</div>
              <div>Current Key: {transportKey}</div>
              <div>Steps: {steps}</div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveSongTrackPatternDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={saveSongTrackPattern}
              disabled={!songTrackPatternName.trim()}
              className="bg-green-400 text-black hover:bg-green-300"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Pattern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Song Track Pattern Dialog */}
      <Dialog open={showLoadSongTrackPatternDialog} onOpenChange={setShowLoadSongTrackPatternDialog}>
        <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              Load Track Pattern
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Choose a saved track pattern to load.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {savedSongTrackPatterns.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <div className="mb-2">No saved track patterns yet</div>
                <div className="text-sm">Save track patterns first to see them here</div>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {savedSongTrackPatterns.map((pattern) => (
                  <div
                    key={pattern.id}
                    className="flex items-center justify-between p-3 bg-[#2a2a2a] rounded border border-gray-600 hover:border-gray-500 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="text-white font-medium">{pattern.trackName}</div>
                      <div className="text-gray-400 text-sm">
                        From: {pattern.arrangementName} • BPM: {pattern.bpm} • Key: {pattern.key}
                      </div>
                      <div className="text-gray-500 text-xs">
                        Track ID: {pattern.trackId} • Created: {new Date(pattern.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => loadSongTrackPattern(pattern.id)}
                        className="text-green-400 hover:text-green-300 hover:bg-green-900/20"
                      >
                        Load
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLoadSongTrackPatternDialog(false)}>
              Close
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
    </div>
  )
}

