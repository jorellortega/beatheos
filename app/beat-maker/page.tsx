'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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
import { Play, Square, RotateCcw, Settings, Save, Upload, Music, List, Disc, Shuffle, FolderOpen, Clock, Plus, Brain } from 'lucide-react'
import { SequencerGrid } from '@/components/beat-maker/SequencerGrid'
import { TrackList } from '@/components/beat-maker/TrackList'
import { SampleLibrary } from '@/components/beat-maker/SampleLibrary'
import { PianoRoll } from '@/components/beat-maker/PianoRoll'
import { AudioPianoRoll } from '@/components/beat-maker/AudioPianoRoll'
import { TrackPianoRoll } from '@/components/beat-maker/TrackPianoRoll'
import { useBeatMaker, Track } from '@/hooks/useBeatMaker'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export default function BeatMakerPage() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [bpm, setBpm] = useState(120)
  const [transportKey, setTransportKey] = useState('C') // Add transport key state
  const [currentStep, setCurrentStep] = useState(0)
  const [tracks, setTracks] = useState<Track[]>([
    { id: 1, name: 'Kick', audioUrl: null, color: 'bg-red-500' },
    { id: 2, name: 'Snare', audioUrl: null, color: 'bg-blue-500' },
    { id: 3, name: 'Hi-Hat', audioUrl: null, color: 'bg-green-500' },
  ])
  const [steps, setSteps] = useState(16)
  const [showSampleLibrary, setShowSampleLibrary] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState<number | null>(null)
  const [showPianoRoll, setShowPianoRoll] = useState(false)
  const [pianoRollTrack, setPianoRollTrack] = useState<number | null>(null)
  const [showAudioPianoRoll, setShowAudioPianoRoll] = useState(false)
  const [audioPianoRollNotes, setAudioPianoRollNotes] = useState<any[]>([])
  const [showTrackPianoRoll, setShowTrackPianoRoll] = useState(false)
  const [trackPianoRollTrack, setTrackPianoRollTrack] = useState<Track | null>(null)
  const [trackPianoRollNotes, setTrackPianoRollNotes] = useState<any[]>([])
  
  // Track type selection modal
  const [showTrackTypeModal, setShowTrackTypeModal] = useState(false)
  
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

  // Song arrangement state (after useBeatMaker hook)
  const [savedPatterns, setSavedPatterns] = useState<{id: string, name: string, tracks: Track[], sequencerData: any, bpm: number, transportKey: string, steps: number}[]>([])
  const [activeTab, setActiveTab] = useState('sequencer')
  const [lastLoadedPattern, setLastLoadedPattern] = useState<string | null>(null)
  const [showPatternDetails, setShowPatternDetails] = useState(true)
  
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
  const [bpmInputValue, setBpmInputValue] = useState('')
  const [positionInputValue, setPositionInputValue] = useState('')

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

  // Toggle a track's pattern on/off for a specific bar
  const toggleTrackAtBar = (trackId: number, barPosition: number) => {
    // This function is no longer needed as song playback is automatic
    // setSongArrangement(prev => {
    //   const newArrangement = {
    //     ...prev,
    //     [trackId]: prev[trackId]?.map((isActive, index) => 
    //       index === barPosition ? !isActive : isActive
    //     ) || new Array(32).fill(false).map((_, index) => index === barPosition)
    //   }
    //   return newArrangement
    // })
  }

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
    intervalId: NodeJS.Timeout | null
    stepIntervalId: NodeJS.Timeout | null
    currentStep: number
    players: {[trackId: number]: any}
  }>({
    intervalId: null,
    stepIntervalId: null,
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
  const playSongArrangement = () => {
    if (songPlayback.isPlaying) {
      // Stop song playback
      setSongPlayback(prev => ({ ...prev, isPlaying: false }))
      
      // Stop song intervals
      if (songPlaybackRef.current.intervalId) {
        clearInterval(songPlaybackRef.current.intervalId)
        songPlaybackRef.current.intervalId = null
      }
      if (songPlaybackRef.current.stepIntervalId) {
        clearInterval(songPlaybackRef.current.stepIntervalId)
        songPlaybackRef.current.stepIntervalId = null
      }
      
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

    // Check if any tracks are activated
    const hasActiveArrangement = Object.values(sequencerData || {}).some(trackData => 
      trackData && trackData.some((isActive: boolean) => isActive)
    )
    
    if (!hasActiveArrangement) {
      alert('No sequencer patterns found! Program patterns in the Sequencer tab first.')
      return
    }

    // Start song playback
    setSongPlayback(prev => ({ ...prev, isPlaying: true, currentBar: 0 }))
    songPlaybackRef.current.currentStep = 0
    
    // Start the song step sequencer
    startSongStepSequencer()
  }

  // Separate step sequencer for song playback
  const startSongStepSequencer = () => {
    const stepDuration = (60 / bpm / 4) * 1000 // 16th note duration in ms
    
    // Play the first step immediately
    playSongStep(0)
    
    // Set up step interval
    songPlaybackRef.current.stepIntervalId = setInterval(() => {
      songPlaybackRef.current.currentStep = (songPlaybackRef.current.currentStep + 1) % steps
      playSongStep(songPlaybackRef.current.currentStep)
    }, stepDuration)
    
    // Set up bar progression interval
    const barDuration = (60 / bpm) * 4 * 1000 // 4 beats per bar in ms
    songPlaybackRef.current.intervalId = setInterval(() => {
      setSongPlayback(prev => {
        const nextBar = (prev.currentBar + 1) % 32 // Loop after 32 bars
        return { ...prev, currentBar: nextBar }
      })
    }, barDuration)
  }

  // Play a step in the song arrangement
  const playSongStep = (step: number) => {
    tracks.forEach(track => {
      const player = songPlaybackRef.current.players[track.id]
      const trackSequencerData = sequencerData[track.id] || []
      const isTrackActiveInCurrentBar = trackSequencerData[songPlayback.currentBar]
      const shouldPlayStep = trackSequencerData[step] && isTrackActiveInCurrentBar
      
      if (shouldPlayStep && player && track.audioUrl && track.audioUrl !== 'undefined') {
        try {
          // Stop if already playing to prevent overlap
          if (player.state === 'started') {
            player.stop()
          }
          
          // Start immediately (Tone.js will handle proper timing)
          player.start()
        } catch (error) {
          console.warn(`[SONG] Error playing step for track ${track.name}:`, error)
        }
      }
    })
  }

  // Clean up song playback on unmount
  useEffect(() => {
    return () => {
      if (songPlaybackRef.current.intervalId) {
        clearInterval(songPlaybackRef.current.intervalId)
      }
      if (songPlaybackRef.current.stepIntervalId) {
        clearInterval(songPlaybackRef.current.stepIntervalId)
      }
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

  // Update Pattern 1 with current sequencer state
  useEffect(() => {
    setSavedPatterns(prev => {
      const existingPattern = prev.find(p => p.id === 'pattern1')
      const updatedPattern = {
        id: 'pattern1',
        name: 'Pattern 1',
        tracks: tracks,
        sequencerData: sequencerData,
        bpm: bpm,
        transportKey: transportKey,
        steps: steps
      }
      
      if (existingPattern) {
        return prev.map(p => p.id === 'pattern1' ? updatedPattern : p)
      } else {
        return [updatedPattern, ...prev]
      }
    })
    
    // Clear loaded pattern indicator if user modifies sequencer and it's not Pattern 1
    if (lastLoadedPattern && lastLoadedPattern !== 'pattern1') {
      setLastLoadedPattern(null)
    }
  }, [tracks, sequencerData, bpm, transportKey, steps, lastLoadedPattern])

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
      await handleSavePattern(patternName.trim(), patternDescription.trim(), patternCategory.trim(), tags)
      setShowSavePatternDialog(false)
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
      await handleSaveTrackPattern(selectedTrackForPattern.id, patternName.trim(), patternDescription.trim(), patternCategory.trim(), tags)
      setShowSaveTrackPatternDialog(false)
      setSelectedTrackForPattern(null)
    } catch (error) {
      console.error('Error saving track pattern:', error)
    }
  }

  // Load a pattern into the sequencer
  const loadPattern = (patternId: string) => {
    const pattern = savedPatterns.find(p => p.id === patternId)
    if (pattern) {
      // Only load the sequencer pattern data, not the track configuration
      setBpm(pattern.bpm)
      setTransportKey(pattern.transportKey || 'C')
      setSteps(pattern.steps)
      setLastLoadedPattern(patternId)
      // Load only the sequencer data, keep current tracks unchanged
      if (pattern.sequencerData) {
        // Merge the pattern data with existing sequencer data instead of replacing
        setSequencerDataFromSession(prev => {
          const mergedData = { ...prev }
          
          // Only update tracks that have data in the loaded pattern
          Object.keys(pattern.sequencerData).forEach(trackIdStr => {
            const trackId = parseInt(trackIdStr)
            mergedData[trackId] = pattern.sequencerData[trackId]
          })
          
          console.log('Merged sequencer data:', mergedData)
          return mergedData
        })
      } else {
        console.warn(`Pattern "${pattern.name}" has no sequencer data`)
        // Don't clear existing data if pattern has no sequencer data
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
    console.log('Pattern sequencerData:', selectedPattern.sequencerData)
    console.log('Pattern sequencer_data:', selectedPattern.sequencer_data)
    
    // Load only the sequencer pattern data, not the track configuration
    setBpm(selectedPattern.bpm)
    setSteps(selectedPattern.steps)
    
    // Try both camelCase and snake_case property names
    const patternSequencerData = selectedPattern.sequencerData || selectedPattern.sequencer_data
    
    // Ensure sequencerData is not null/undefined before loading
    if (patternSequencerData) {
      console.log('Loading sequencer data:', patternSequencerData)
      
      // Merge the pattern data with existing sequencer data instead of replacing
      // This preserves patterns on other tracks that aren't in the loaded pattern
      setSequencerDataFromSession(prev => {
        const mergedData = { ...prev }
        
        // Only update tracks that have data in the loaded pattern
        Object.keys(patternSequencerData).forEach(trackIdStr => {
          const trackId = parseInt(trackIdStr)
          mergedData[trackId] = patternSequencerData[trackId]
        })
        
        console.log('Merged sequencer data:', mergedData)
        return mergedData
      })
    } else {
      console.warn(`Pattern "${selectedPattern.name}" has no sequencer data`)
      // Don't clear existing data if pattern has no sequencer data
    }
    
    // Show success message
    alert(`Loaded pattern: ${selectedPattern.name}`)
    console.log(`Loaded pattern "${selectedPattern.name}" - sequencer data only, tracks unchanged`)
    
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
          // Play song arrangement in Song tab
          playSongArrangement()
        } else if (hasLoadedAudio) {
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
  }, [isPlaying, hasLoadedAudio, activeTab])

  const handlePlayPause = () => {
    console.log(`[MAIN TRANSPORT] Play/Pause called. isPlaying: ${isPlaying}, pianoRollData:`, pianoRollData)
    if (isPlaying) {
      stopSequence()
    } else {
      playSequence()
    }
  }

  const handleReset = () => {
    stopSequence()
    setCurrentStep(0)
    
    // Also stop song playback if it's running
    if (songPlayback.isPlaying) {
      setSongPlayback(prev => ({ ...prev, isPlaying: false }))
      
      // Stop song intervals
      if (songPlaybackRef.current.intervalId) {
        clearInterval(songPlaybackRef.current.intervalId)
        songPlaybackRef.current.intervalId = null
      }
      if (songPlaybackRef.current.stepIntervalId) {
        clearInterval(songPlaybackRef.current.stepIntervalId)
        songPlaybackRef.current.stepIntervalId = null
      }
      
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
    }
  }

  const handleTrackPitchChange = (trackId: number, pitchShift: number, originalKey?: string, currentKey?: string) => {
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
      
      // Add filters only if the data exists
      if (originalTrack.audio_type) {
        query = query.eq('audio_type', originalTrack.audio_type)
      }
      
      if (originalTrack.key) {
        query = query.eq('key', originalTrack.key)
      }
      
      // Try to exclude current audio if it's a database ID
      if (originalTrack.audioUrl && !originalTrack.audioUrl.startsWith('http')) {
        query = query.neq('id', originalTrack.audioUrl)
      }
      
      const { data: shuffledAudio, error } = await query.limit(10)

      if (error) {
        console.error('Error fetching shuffled audio:', error)
        // Fallback: try without key filter
        if (originalTrack.key) {
          console.log('Retrying without key filter...')
          const { data: fallbackAudio, error: fallbackError } = await supabase
            .from('audio_library_items')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('audio_type', originalTrack.audio_type || 'Melody Loop')
            .limit(10)
          
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

      if (!shuffledAudio || shuffledAudio.length === 0) {
        console.log('No alternative audio found with same key and type, trying broader search...')
        // Try broader search
        const { data: broaderAudio, error: broaderError } = await supabase
          .from('audio_library_items')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('audio_type', originalTrack.audio_type || 'Melody Loop')
          .limit(10)
        
        if (broaderError) {
          console.error('Broader search failed:', broaderError)
          return
        }
        
        if (broaderAudio && broaderAudio.length > 0) {
          const randomAudio = broaderAudio[Math.floor(Math.random() * broaderAudio.length)]
          createDuplicateTrack(originalTrack, randomAudio)
          return
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
      const randomAudio = shuffledAudio[Math.floor(Math.random() * shuffledAudio.length)]
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
  const addNewTrack = () => {
    setShowTrackTypeModal(true)
  }

  const addTrackByType = (trackType: string) => {
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
    setShowTrackTypeModal(false)
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

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to shuffle audio files')
        return
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

      const audioType = trackTypeMap[track.name]
      if (!audioType) {
        alert('Shuffle not available for this track type')
        return
      }

      // Fetch audio files of the specific type using the new audio_type system
      let audioFiles: any[] = []
      
      // Get files by exact audio_type match (primary method)
      const { data: typeFiles, error: typeError } = await supabase
        .from('audio_library_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('audio_type', audioType)
      
      if (typeFiles && typeFiles.length > 0) {
        audioFiles = [...audioFiles, ...typeFiles]
      }
      
      // If no exact matches, try to get files by name containing the type (fallback)
      if (audioFiles.length === 0) {
        const { data: nameFiles, error: nameError } = await supabase
          .from('audio_library_items')
          .select('*')
          .eq('user_id', user.id)
          .ilike('name', `%${audioType.toLowerCase()}%`)
        
        if (nameFiles) {
          audioFiles = [...audioFiles, ...nameFiles]
        }
      }
      
      // Special handling for Hi-Hat to search for multiple variations
      if (audioType === 'Hihat' && audioFiles.length === 0) {
        const hiHatVariations = ['Hihat', 'Hi-Hat', 'Hi Hat']
        for (const variation of hiHatVariations) {
          const { data: variationFiles, error: variationError } = await supabase
            .from('audio_library_items')
            .select('*')
            .eq('user_id', user.id)
            .eq('audio_type', variation)
          
          if (variationFiles) {
            audioFiles = [...audioFiles, ...variationFiles]
          }
        }
      }
      
      // Remove duplicates based on id
      audioFiles = audioFiles.filter((file, index, self) => 
        index === self.findIndex(f => f.id === file.id)
      )
      
      if (typeError) {
        console.error('Error fetching audio files by type:', typeError)
        alert('Failed to fetch audio files')
        return
      }

      if (!audioFiles || audioFiles.length === 0) {
        alert(`No ${audioType} audio files found in your library`)
        return
      }

      // Randomly select one audio file
      const randomIndex = Math.floor(Math.random() * audioFiles.length)
      const selectedAudio = audioFiles[randomIndex]

      // Update the track with the new audio
      const publicUrl = getPublicAudioUrl(selectedAudio.file_url || '')
      setTracks(prev => prev.map(t => 
        t.id === trackId ? { 
          ...t, 
          audioUrl: publicUrl,
          audioName: selectedAudio.name,
          // Initialize tempo properties with default values or use metadata
          originalBpm: selectedAudio.bpm || 120,
          currentBpm: selectedAudio.bpm || 120,
          playbackRate: 1.0,
          // Initialize pitch properties with default values or use metadata
          originalKey: selectedAudio.key || 'C',
          currentKey: selectedAudio.key || 'C',
          pitchShift: 0,
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

  const handleShuffleAll = async () => {
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
          'Kick', 'Snare', 'Hi-Hat', 'Clap', 'Crash', 'Ride', 'Tom', 'Cymbal',
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

      // Shuffle patterns for all tracks (except locked ones)
      const patternShufflePromises = tracks
        .filter(track => !track.locked) // Skip locked tracks
        .map(track => {
          // Get type-specific pattern library
          const patternLibrary = getPatternLibraryForTrackType(track.name)
          
          // Select a random pattern from the library
          const randomPattern = patternLibrary[Math.floor(Math.random() * patternLibrary.length)]
          
          // Extend or truncate the pattern to match current step count
          let newPattern: boolean[]
          if (steps === 16) {
            newPattern = randomPattern
          } else if (steps === 8) {
            newPattern = randomPattern.slice(0, 8)
          } else if (steps === 32) {
            // Repeat the 16-step pattern twice for 32 steps
            newPattern = [...randomPattern, ...randomPattern]
          } else {
            // For any other step count, use the first N steps
            newPattern = randomPattern.slice(0, steps)
          }
          
          return { trackId: track.id, pattern: newPattern }
        })

      // Execute both audio and pattern shuffles
      await Promise.all(audioShufflePromises)
      
      // Update all patterns at once
      setSequencerDataFromSession(prev => {
        const newSequencerData = { ...prev }
        patternShufflePromises.forEach(({ trackId, pattern }) => {
          newSequencerData[trackId] = pattern
        })
        return newSequencerData
      })

      console.log('Shuffled all audio samples and patterns')
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
    }

    // Return patterns for the specific track type, or default patterns if not found
    return patterns[trackType] || patterns['Kick'] // Default to kick patterns if type not found
  }

  // Shuffle individual track pattern with type-specific patterns
  const handleShuffleTrackPattern = (trackId: number) => {
    const track = tracks.find(t => t.id === trackId)
    if (!track) return

    // Skip if track is locked
    if (track.locked) {
      alert(`${track.name} is locked and cannot be shuffled`)
      return
    }

    // Get type-specific pattern library
    const patternLibrary = getPatternLibraryForTrackType(track.name)
    
    // Select a random pattern from the library
    const randomPattern = patternLibrary[Math.floor(Math.random() * patternLibrary.length)]
    
    // Extend or truncate the pattern to match current step count
    let newPattern: boolean[]
    if (steps === 16) {
      newPattern = randomPattern
    } else if (steps === 8) {
      newPattern = randomPattern.slice(0, 8)
    } else if (steps === 32) {
      // Repeat the 16-step pattern twice for 32 steps
      newPattern = [...randomPattern, ...randomPattern]
    } else {
      // For any other step count, use the first N steps
      newPattern = randomPattern.slice(0, steps)
    }
    
    // Update the sequencer data for this track only
    setSequencerDataFromSession(prev => ({
      ...prev,
      [trackId]: newPattern
    }))

    console.log(`Shuffled ${track.name} pattern with type-specific library`)
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
          'Kick', 'Snare', 'Hi-Hat', 'Clap', 'Crash', 'Ride', 'Tom', 'Cymbal',
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
  const handleShuffleAllPatterns = () => {
    try {
      // Shuffle patterns for all tracks (except locked ones)
      const patternShufflePromises = tracks
        .filter(track => !track.locked) // Skip locked tracks
        .map(track => {
          // Get type-specific pattern library
          const patternLibrary = getPatternLibraryForTrackType(track.name)
          
          // Select a random pattern from the library
          const randomPattern = patternLibrary[Math.floor(Math.random() * patternLibrary.length)]
          
          // Extend or truncate the pattern to match current step count
          let newPattern: boolean[]
          if (steps === 16) {
            newPattern = randomPattern
          } else if (steps === 8) {
            newPattern = randomPattern.slice(0, 8)
          } else if (steps === 32) {
            // Repeat the 16-step pattern twice for 32 steps
            newPattern = [...randomPattern, ...randomPattern]
          } else {
            // For any other step count, use the first N steps
            newPattern = randomPattern.slice(0, steps)
          }
          
          return { trackId: track.id, pattern: newPattern }
        })

      // Update all patterns at once
      setSequencerDataFromSession(prev => {
        const newSequencerData = { ...prev }
        patternShufflePromises.forEach(({ trackId, pattern }) => {
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

  const handleSavePattern = async (name: string, description?: string, category?: string, tags?: string[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to save patterns')
        return
      }

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
          category
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
            tags: [track.name.toLowerCase()]
          })
      })

      await Promise.all(savePromises)
      alert('All patterns saved successfully!')
    } catch (error) {
      console.error('Error saving all patterns:', error)
      alert('Failed to save patterns')
    }
  }

  const handleSaveTrackPattern = async (trackId: number, name: string, description?: string, category?: string, tags?: string[]) => {
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
          category
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
  }, [])

  // Function to open save session dialog with cleared form
  const openSaveSessionDialog = () => {
    setSessionName('')
    setSessionDescription('')
    setSessionCategory('')
    setSessionTags('')
    setShowSessionDialog(true)
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
          <Button variant="outline" size="sm" onClick={saveAsNewPattern}>
            <Save className="w-4 h-4 mr-2" />
            Save Pattern
          </Button>
          <Button variant="outline" size="sm" onClick={handleLoadPattern}>
            <FolderOpen className="w-4 h-4 mr-2" />
            Load Pattern
          </Button>
          <Button variant="outline" size="sm" onClick={openSaveSessionDialog}>
            <Save className="w-4 h-4 mr-2" />
            Save Session
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Export Audio
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
          <CardTitle className="text-white">Transport</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
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
                onClick={debugPianoRollPlayback}
                variant="outline"
                size="sm"
                className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20"
              >
                Debug Piano Roll
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-white text-sm">BPM:</span>
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
                    className="min-w-[60px] text-center cursor-pointer hover:bg-gray-600 transition-colors"
                    onClick={handleBpmEdit}
                    title="Click to edit BPM"
                  >
                    {bpm}
                  </Badge>
                )}
              </div>
              <div className="w-32">
                <Slider
                  value={[bpm]}
                  onValueChange={(value) => setBpm(value[0])}
                  min={60}
                  max={200}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-white text-sm">Key:</span>
              <Badge 
                variant="secondary" 
                className="min-w-[40px] text-center cursor-pointer hover:bg-gray-600 transition-colors"
                title="Transport key (click track key badges to change)"
              >
                {transportKey}
              </Badge>
            </div>
            
            {/* MIDI Controls */}
            <div className="flex items-center gap-2">
              <span className="text-white text-sm">MIDI:</span>
              <select
                value={midiSoundType}
                onChange={(e) => setMidiSoundType(e.target.value as 'piano' | 'synth' | 'bass')}
                className="bg-[#1a1a1a] border border-gray-600 rounded px-2 py-1 text-xs text-white"
              >
                <option value="piano">Piano</option>
                <option value="synth">Synth</option>
                <option value="bass">Bass</option>
              </select>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={midiVolume}
                onChange={(e) => setMidiVolume(parseFloat(e.target.value))}
                className="w-16"
              />
              <span className="text-white text-xs">{Math.round(midiVolume * 100)}%</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-white text-sm">Steps:</span>
              <div className="flex gap-1">
                {[8, 16, 32].map((stepCount) => (
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

            <div className="flex items-center gap-2">
              <span className="text-white text-sm">Position:</span>
              {editingPosition ? (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={positionInputValue}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPositionInputValue(e.target.value)}
                    onBlur={handlePositionSave}
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === 'Enter') {
                        handlePositionSave()
                      } else if (e.key === 'Escape') {
                        handlePositionCancel()
                      }
                    }}
                    min="1"
                    max={steps.toString()}
                    className="w-12 h-8 text-center text-sm"
                    autoFocus
                  />
                  <span className="text-gray-400 text-sm">/{steps}</span>
                </div>
              ) : (
                <Badge 
                  variant="outline" 
                  className="min-w-[60px] text-center cursor-pointer hover:bg-gray-700 transition-colors"
                  onClick={handlePositionEdit}
                  title="Click to edit position"
                >
                  {currentStep + 1}/{steps}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Track List */}
        <div className="lg:col-span-1">
          <TrackList
            tracks={tracks}
            onTrackAudioSelect={handleOpenSampleLibrary}
            currentStep={currentStep}
            sequencerData={sequencerData}
            onAddTrack={addNewTrack}
            onRemoveTrack={removeTrack}
            onReorderTracks={reorderTracks}
            onDirectAudioDrop={handleDirectAudioDrop}
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
          />
        </div>

        {/* Sequencer Grid */}
        <div className="lg:col-span-3">
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
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex h-[600px]">
                {/* Pattern List Sidebar */}
                <div className="w-48 bg-[#0f0f0f] border-r border-gray-600 p-4">
                  <h3 className="text-white font-medium mb-4">Patterns</h3>
                  <div className="space-y-2">
                    {savedPatterns.map((pattern, index) => (
                      <div key={pattern.id} className="space-y-1">
                        <div
                          className={`flex items-center p-2 rounded border cursor-pointer transition-all ${
                            lastLoadedPattern === pattern.id
                              ? 'bg-[#1f3a5f] border-blue-500'
                              : 'bg-[#1f1f1f] border-gray-600 hover:border-gray-500'
                          }`}
                          onClick={() => loadPattern(pattern.id)}
                        >
                          <div className={`w-3 h-3 rounded mr-2 ${
                            index === 0 ? 'bg-green-500' : 
                            index === 1 ? 'bg-blue-500' : 
                            index === 2 ? 'bg-purple-500' : 'bg-orange-500'
                          }`}></div>
                          <span className="text-white text-sm">{pattern.name}</span>
                          <div className="ml-auto flex items-center gap-2">
                            {lastLoadedPattern === pattern.id && (
                              <div className="text-blue-400 text-xs">🎛️ Loaded</div>
                            )}
                            <div className="text-xs text-gray-500">
                              {pattern.tracks.length > 0 ? `${pattern.tracks.filter(t => t.audioUrl).length}/${pattern.tracks.length}` : 'Pattern Only'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 space-y-2">
                    <Button size="sm" variant="outline" className="w-full" onClick={saveAsNewPattern}>
                      <Music className="w-4 h-4 mr-2" />
                      Save Pattern
                    </Button>
                    <div className="text-xs text-gray-500 text-center space-y-1">
                      <div className="text-blue-500">🎛️ Blue = Loaded in sequencer</div>
                      <div className="text-green-500">🔊 Green = Currently playing</div>
                      <div className="text-purple-400 mt-2">🎼 Each track plays its own pattern!</div>
                      <div className="text-orange-400 text-xs">🎯 Click timeline to toggle tracks</div>
                      <div className="text-cyan-400 text-xs">👁️ Toggle button to show/hide patterns</div>
                    </div>
                  </div>
                </div>

                {/* Song Timeline */}
                <div className="flex-1 overflow-auto">
                  {/* Timeline Header */}
                  <div className="sticky top-0 bg-[#141414] border-b border-gray-600 p-2">
                    <div className="flex relative">
                      <div className="w-24 text-center text-gray-400 text-xs py-2">Tracks</div>
                      {Array.from({ length: 32 }, (_, i) => {
                        // Check if any track has patterns at this bar
                        const hasActiveTracks = Object.values(sequencerData || {}).some(trackData => 
                          trackData && trackData[i]
                        )
                        
                        return (
                          <div 
                            key={i} 
                            className={`w-16 text-center text-xs py-2 border-r border-gray-700 relative ${
                              songPlayback.isPlaying && songPlayback.currentBar === i 
                                ? 'bg-green-500/20 text-green-400' 
                                : hasActiveTracks
                                  ? 'text-blue-400'
                                  : 'text-gray-400'
                            }`}
                          >
                            {i + 1}
                            {hasActiveTracks && !songPlayback.isPlaying && (
                              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full"></div>
                            )}
                            {songPlayback.isPlaying && songPlayback.currentBar === i && (
                              <div className="absolute top-0 left-0 w-full h-full bg-green-500/30 animate-pulse"></div>
                            )}
                          </div>
                        )
                      })}
                      
                      {/* Playhead */}
                      {songPlayback.isPlaying && (
                        <div 
                          className="absolute top-0 w-1 h-full bg-green-500 z-10 transition-all duration-100"
                          style={{ left: `${96 + songPlayback.currentBar * 64}px` }}
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
                            <div className="text-white text-xs font-medium truncate">{track.name}</div>
                            <div className={`text-xs ${track.audioUrl ? 'text-green-500' : 'text-gray-500'}`}>
                              {track.audioUrl ? 'LOADED' : 'EMPTY'}
                            </div>
                          </div>
                        </div>

                        {/* Timeline Grid */}
                        <div className="flex-1 flex relative">
                          {/* Timeline grid */}
                          {Array.from({ length: 32 }, (_, i) => {
                            const isActive = sequencerData[track.id]?.[i]
                            const isCurrentBar = songPlayback.isPlaying && songPlayback.currentBar === i
                            
                            return (
                              <div 
                                key={i} 
                                className={`w-16 h-8 border-r border-gray-700/30 cursor-pointer transition-colors flex items-center justify-center relative ${
                                  isActive 
                                    ? 'bg-gray-800/50 border-gray-600' 
                                    : 'hover:bg-gray-700/30'
                                } ${isCurrentBar && isActive ? 'ring-2 ring-green-400 animate-pulse' : ''}`}
                                onClick={() => toggleTrackAtBar(track.id, i)}
                                title={`Bar ${i + 1} - ${track.name} ${isActive ? '(Active)' : '(Inactive)'} - Click to toggle`}
                              >
                                {isActive && (
                                  <div className="absolute inset-0 p-1">
                                    {showPatternDetails ? (
                                      <>
                                        {/* Show the sequencer pattern for this track */}
                                        <div className="w-full h-full flex items-center gap-0.5">
                                          {sequencerData[track.id]?.slice(0, 8).map((stepActive, stepIndex) => (
                                            <div
                                              key={stepIndex}
                                              className={`flex-1 h-full rounded-sm ${
                                                stepActive 
                                                  ? getTrackColorHex(track.color) 
                                                  : 'bg-gray-600/30'
                                              }`}
                                              style={{
                                                backgroundColor: stepActive ? getTrackColorHex(track.color) : undefined
                                              }}
                                            />
                                          )) || Array.from({ length: 8 }, (_, stepIndex) => (
                                            <div
                                              key={stepIndex}
                                              className="flex-1 h-full bg-gray-600/30 rounded-sm"
                                            />
                                          ))}
                                        </div>
                                        
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
                                
                                {!isActive && (
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
                    disabled={!songPlayback.isPlaying && !Object.values(sequencerData || {}).some(trackData => 
                      trackData && trackData.some((isActive: boolean) => isActive)
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
                        {!Object.values(sequencerData || {}).some(trackData => 
                          trackData && trackData.some((isActive: boolean) => isActive)
                        ) 
                          ? 'No Active Tracks' 
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

      {/* Track Type Selection Modal */}
      {showTrackTypeModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <Card className="w-[90vw] max-w-2xl bg-[#141414] border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span>Add New Track</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTrackTypeModal(false)}
                >
                  Close
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 mb-6">Choose the type of track you want to add:</p>
              
              {/* Drums Category */}
              <div className="mb-6">
                <h3 className="text-white font-semibold mb-3 text-sm">🥁 Drums</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button
                    onClick={() => addTrackByType('Kick')}
                    className="h-16 flex flex-col items-center justify-center bg-gray-700 hover:bg-gray-600 text-white border border-gray-600"
                  >
                    <div className="text-sm font-bold">Kick</div>
                  </Button>
                  <Button
                    onClick={() => addTrackByType('Snare')}
                    className="h-16 flex flex-col items-center justify-center bg-gray-700 hover:bg-gray-600 text-white border border-gray-600"
                  >
                    <div className="text-sm font-bold">Snare</div>
                  </Button>
                  <Button
                    onClick={() => addTrackByType('Hi-Hat')}
                    className="h-16 flex flex-col items-center justify-center bg-gray-700 hover:bg-gray-600 text-white border border-gray-600"
                  >
                    <div className="text-sm font-bold">Hi-Hat</div>
                  </Button>
                  <Button
                    onClick={() => addTrackByType('Clap')}
                    className="h-16 flex flex-col items-center justify-center bg-gray-700 hover:bg-gray-600 text-white border border-gray-600"
                  >
                    <div className="text-sm font-bold">Clap</div>
                  </Button>
                  <Button
                    onClick={() => addTrackByType('Crash')}
                    className="h-16 flex flex-col items-center justify-center bg-gray-700 hover:bg-gray-600 text-white border border-gray-600"
                  >
                    <div className="text-sm font-bold">Crash</div>
                  </Button>
                  <Button
                    onClick={() => addTrackByType('Ride')}
                    className="h-16 flex flex-col items-center justify-center bg-gray-700 hover:bg-gray-600 text-white border border-gray-600"
                  >
                    <div className="text-sm font-bold">Ride</div>
                  </Button>
                  <Button
                    onClick={() => addTrackByType('Tom')}
                    className="h-16 flex flex-col items-center justify-center bg-gray-700 hover:bg-gray-600 text-white border border-gray-600"
                  >
                    <div className="text-sm font-bold">Tom</div>
                  </Button>
                  <Button
                    onClick={() => addTrackByType('Cymbal')}
                    className="h-16 flex flex-col items-center justify-center bg-gray-700 hover:bg-gray-600 text-white border border-gray-600"
                  >
                    <div className="text-sm font-bold">Cymbal</div>
                  </Button>
                </div>
              </div>

              {/* Bass Category */}
              <div className="mb-6">
                <h3 className="text-white font-semibold mb-3 text-sm">🎸 Bass</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <Button
                    onClick={() => addTrackByType('Bass')}
                    className="h-16 flex flex-col items-center justify-center bg-slate-700 hover:bg-slate-600 text-white border border-slate-600"
                  >
                    <div className="text-sm font-bold">Bass</div>
                  </Button>
                  <Button
                    onClick={() => addTrackByType('Sub')}
                    className="h-16 flex flex-col items-center justify-center bg-slate-700 hover:bg-slate-600 text-white border border-slate-600"
                  >
                    <div className="text-sm font-bold">Sub</div>
                  </Button>
                  <Button
                    onClick={() => addTrackByType('808')}
                    className="h-16 flex flex-col items-center justify-center bg-slate-700 hover:bg-slate-600 text-white border border-slate-600"
                  >
                    <div className="text-sm font-bold">808</div>
                  </Button>
                </div>
              </div>

              {/* Melodic Category */}
              <div className="mb-6">
                <h3 className="text-white font-semibold mb-3 text-sm">🎹 Melodic</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <Button
                    onClick={() => addTrackByType('Melody')}
                    className="h-16 flex flex-col items-center justify-center bg-zinc-700 hover:bg-zinc-600 text-white border border-zinc-600"
                  >
                    <div className="text-sm font-bold">Melody</div>
                  </Button>
                  <Button
                    onClick={() => addTrackByType('Lead')}
                    className="h-16 flex flex-col items-center justify-center bg-zinc-700 hover:bg-zinc-600 text-white border border-zinc-600"
                  >
                    <div className="text-sm font-bold">Lead</div>
                  </Button>
                  <Button
                    onClick={() => addTrackByType('Pad')}
                    className="h-16 flex flex-col items-center justify-center bg-zinc-700 hover:bg-zinc-600 text-white border border-zinc-600"
                  >
                    <div className="text-sm font-bold">Pad</div>
                  </Button>
                  <Button
                    onClick={() => addTrackByType('Chord')}
                    className="h-16 flex flex-col items-center justify-center bg-zinc-700 hover:bg-zinc-600 text-white border border-zinc-600"
                  >
                    <div className="text-sm font-bold">Chord</div>
                  </Button>
                  <Button
                    onClick={() => addTrackByType('Arp')}
                    className="h-16 flex flex-col items-center justify-center bg-zinc-700 hover:bg-zinc-600 text-white border border-zinc-600"
                  >
                    <div className="text-sm font-bold">Arp</div>
                  </Button>
                </div>
              </div>

              {/* Loops Category */}
              <div className="mb-6">
                <h3 className="text-white font-semibold mb-3 text-sm">🔄 Loops</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button
                    onClick={() => addTrackByType('Melody Loop')}
                    className="h-16 flex flex-col items-center justify-center bg-neutral-700 hover:bg-neutral-600 text-white border border-neutral-600"
                  >
                    <div className="text-sm font-bold">Melody Loop</div>
                  </Button>
                  <Button
                    onClick={() => addTrackByType('Piano Loop')}
                    className="h-16 flex flex-col items-center justify-center bg-neutral-700 hover:bg-neutral-600 text-white border border-neutral-600"
                  >
                    <div className="text-sm font-bold">Piano Loop</div>
                  </Button>
                  <Button
                    onClick={() => addTrackByType('808 Loop')}
                    className="h-16 flex flex-col items-center justify-center bg-neutral-700 hover:bg-neutral-600 text-white border border-neutral-600"
                  >
                    <div className="text-sm font-bold">808 Loop</div>
                  </Button>
                  <Button
                    onClick={() => addTrackByType('Drum Loop')}
                    className="h-16 flex flex-col items-center justify-center bg-neutral-700 hover:bg-neutral-600 text-white border border-neutral-600"
                  >
                    <div className="text-sm font-bold">Drum Loop</div>
                  </Button>
                  <Button
                    onClick={() => addTrackByType('Bass Loop')}
                    className="h-16 flex flex-col items-center justify-center bg-neutral-700 hover:bg-neutral-600 text-white border border-neutral-600"
                  >
                    <div className="text-sm font-bold">Bass Loop</div>
                  </Button>
                  <Button
                    onClick={() => addTrackByType('Vocal Loop')}
                    className="h-16 flex flex-col items-center justify-center bg-neutral-700 hover:bg-neutral-600 text-white border border-neutral-600"
                  >
                    <div className="text-sm font-bold">Vocal Loop</div>
                  </Button>
                  <Button
                    onClick={() => addTrackByType('Guitar Loop')}
                    className="h-16 flex flex-col items-center justify-center bg-neutral-700 hover:bg-neutral-600 text-white border border-neutral-600"
                  >
                    <div className="text-sm font-bold">Guitar Loop</div>
                  </Button>
                  <Button
                    onClick={() => addTrackByType('Synth Loop')}
                    className="h-16 flex flex-col items-center justify-center bg-neutral-700 hover:bg-neutral-600 text-white border border-neutral-600"
                  >
                    <div className="text-sm font-bold">Synth Loop</div>
                  </Button>
                </div>
              </div>

              {/* Effects & Technical */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-white font-semibold mb-3 text-sm">🎛️ Effects</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => addTrackByType('FX')}
                      className="h-16 flex flex-col items-center justify-center bg-stone-700 hover:bg-stone-600 text-white border border-stone-600"
                    >
                      <div className="text-sm font-bold">FX</div>
                    </Button>
                    <Button
                      onClick={() => addTrackByType('Vocal')}
                      className="h-16 flex flex-col items-center justify-center bg-stone-700 hover:bg-stone-600 text-white border border-stone-600"
                    >
                      <div className="text-sm font-bold">Vocal</div>
                    </Button>
                    <Button
                      onClick={() => addTrackByType('Sample')}
                      className="h-16 flex flex-col items-center justify-center bg-stone-700 hover:bg-stone-600 text-white border border-stone-600"
                    >
                      <div className="text-sm font-bold">Sample</div>
                    </Button>
                  </div>
                </div>

                <div>
                  <h3 className="text-white font-semibold mb-3 text-sm">⚙️ Technical</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => addTrackByType('MIDI')}
                      className="h-16 flex flex-col items-center justify-center bg-slate-600 hover:bg-slate-500 text-white border border-slate-500"
                    >
                      <div className="text-sm font-bold">MIDI</div>
                    </Button>
                    <Button
                      onClick={() => addTrackByType('Patch')}
                      className="h-16 flex flex-col items-center justify-center bg-slate-600 hover:bg-slate-500 text-white border border-slate-500"
                    >
                      <div className="text-sm font-bold">Patch</div>
                    </Button>
                    <Button
                      onClick={() => addTrackByType('Preset')}
                      className="h-16 flex flex-col items-center justify-center bg-slate-600 hover:bg-slate-500 text-white border border-slate-500"
                    >
                      <div className="text-sm font-bold">Preset</div>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
                placeholder="e.g., kick, snare, hi-hat (comma separated)"
                className="bg-[#2a2a2a] border-gray-600 text-white"
              />
            </div>
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
                          {pattern.category && <span>Category: {pattern.category}</span>}
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
    </div>
  )
}

