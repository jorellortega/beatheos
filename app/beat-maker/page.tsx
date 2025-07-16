'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Play, Square, RotateCcw, Settings, Save, Upload, Music, List, Disc } from 'lucide-react'
import { SequencerGrid } from '@/components/beat-maker/SequencerGrid'
import { TrackList } from '@/components/beat-maker/TrackList'
import { SampleLibrary } from '@/components/beat-maker/SampleLibrary'
import { PianoRoll } from '@/components/beat-maker/PianoRoll'
import { useBeatMaker, Track } from '@/hooks/useBeatMaker'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export default function BeatMakerPage() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [bpm, setBpm] = useState(120)
  const [currentStep, setCurrentStep] = useState(0)
  const [tracks, setTracks] = useState<Track[]>([
    { id: 1, name: 'Kick', audioUrl: null, color: 'bg-red-500' },
    { id: 2, name: 'Snare', audioUrl: null, color: 'bg-blue-500' },
    { id: 3, name: 'Hi-Hat', audioUrl: null, color: 'bg-green-500' },
    { id: 4, name: 'Sample', audioUrl: null, color: 'bg-purple-500' },
    { id: 5, name: 'MIDI', audioUrl: null, color: 'bg-orange-500' },
  ])
  const [steps, setSteps] = useState(16)
  const [showSampleLibrary, setShowSampleLibrary] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState<number | null>(null)
  const [showPianoRoll, setShowPianoRoll] = useState(false)
  const [pianoRollTrack, setPianoRollTrack] = useState<number | null>(null)
  
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
    toggleStep,
    playSequence,
    stopSequence,
    isSequencePlaying,
    currentStep: sequencerCurrentStep,
    updateTrackTempo,
    updateTrackPitch
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
  const [savedPatterns, setSavedPatterns] = useState<{id: string, name: string, tracks: Track[], sequencerData: any, bpm: number, steps: number}[]>([])
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
      Object.values(songPlaybackRef.current.players).forEach(player => {
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
      Object.values(songPlaybackRef.current.players).forEach(player => {
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
    const hasActiveArrangement = Object.values(sequencerData).some(trackData => 
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
      Object.values(songPlaybackRef.current.players).forEach(player => {
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
  }, [tracks, sequencerData, bpm, steps, lastLoadedPattern])

  // Save current pattern as new pattern
  const saveAsNewPattern = () => {
    const newPatternId = `pattern${savedPatterns.length + 1}`
    const newPattern = {
      id: newPatternId,
      name: `Pattern ${savedPatterns.length + 1}`,
      tracks: [...tracks],
      sequencerData: {...sequencerData},
      bpm: bpm,
      steps: steps
    }
    setSavedPatterns(prev => [...prev, newPattern])
  }

  // Load a pattern into the sequencer
  const loadPattern = (patternId: string) => {
    const pattern = savedPatterns.find(p => p.id === patternId)
    if (pattern) {
      setTracks(pattern.tracks)
      setBpm(pattern.bpm)
      setSteps(pattern.steps)
      setLastLoadedPattern(patternId)
      // Note: sequencerData will be updated by the useBeatMaker hook
      
      // Show feedback notification
      console.log(`Loaded pattern: ${pattern.name}`)
    }
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

  // Function to add a new track
  const addNewTrack = () => {
    const trackColors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500',
      'bg-yellow-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500',
      'bg-teal-500', 'bg-cyan-500', 'bg-lime-500', 'bg-rose-500'
    ]
    
    const newTrackId = Math.max(...tracks.map(t => t.id)) + 1
    const colorIndex = (tracks.length) % trackColors.length
    
    const newTrack: Track = {
      id: newTrackId,
      name: 'audio',
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

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to shuffle audio files')
        return
      }

      // Map track names to audio types for filtering
      const trackTypeMap: { [key: string]: string } = {
        'Kick': 'kick',
        'Snare': 'snare', 
        'Hi-Hat': 'hi-hat',
        'Sample': 'sample',
        'MIDI': 'midi'
      }

      const audioType = trackTypeMap[track.name]
      if (!audioType) {
        alert('Shuffle not available for this track type')
        return
      }

      // Fetch audio files of the specific type - try multiple approaches
      let audioFiles: any[] = []
      
      // First try to get files by audio_type
      const { data: typeFiles, error: typeError } = await supabase
        .from('audio_library_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('audio_type', audioType)
      
      if (typeFiles) {
        audioFiles = [...audioFiles, ...typeFiles]
      }
      
      // Then try to get files by name containing the type
      const { data: nameFiles, error: nameError } = await supabase
        .from('audio_library_items')
        .select('*')
        .eq('user_id', user.id)
        .ilike('name', `%${audioType}%`)
      
      if (nameFiles) {
        audioFiles = [...audioFiles, ...nameFiles]
      }
      
      // Remove duplicates based on id
      audioFiles = audioFiles.filter((file, index, self) => 
        index === self.findIndex(f => f.id === file.id)
      )
      
      const error = typeError || nameError

      if (error) {
        console.error('Error fetching audio files:', error)
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Beat Maker</h1>
          <p className="text-gray-400">Create beats with our professional tools</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={saveAsNewPattern}>
            <Save className="w-4 h-4 mr-2" />
            Save Pattern
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
            onOpenPianoRoll={handleOpenPianoRoll}
          />
        </div>

        {/* Sequencer Grid */}
        <div className="lg:col-span-3">
          <SequencerGrid
            tracks={tracks}
            steps={steps}
            sequencerData={sequencerData}
            onToggleStep={toggleStep}
            currentStep={currentStep}
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
                              {pattern.tracks.filter(t => t.audioUrl).length}/{pattern.tracks.length}
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
                        const hasActiveTracks = Object.values(sequencerData).some(trackData => 
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
                    disabled={!songPlayback.isPlaying && !Object.values(sequencerData).some(trackData => 
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
                        {!Object.values(sequencerData).some(trackData => 
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
                    disabled={!Object.values(sequencerData).some(trackData => 
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
                        {Object.values(sequencerData).reduce((total, trackData) => 
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
              <CardTitle className="text-white">Beat Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <List className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Session Management</h3>
                <p className="text-gray-400 mb-4">Save, load, and manage your beat projects</p>
                <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                  Coming Soon
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

