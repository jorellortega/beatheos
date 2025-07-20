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
import { Play, Square, RotateCcw, Settings, Save, Upload, Music, List, Disc, Shuffle, FolderOpen, Clock, Plus, Brain, Lock, Unlock } from 'lucide-react'
import { SequencerGrid } from '@/components/beat-maker/SequencerGrid'
import { TrackList } from '@/components/beat-maker/TrackList'
import { SampleLibrary } from '@/components/beat-maker/SampleLibrary'
import { PianoRoll } from '@/components/beat-maker/PianoRoll'
import { AudioPianoRoll } from '@/components/beat-maker/AudioPianoRoll'
import { TrackPianoRoll } from '@/components/beat-maker/TrackPianoRoll'
import { useBeatMaker, Track } from '@/hooks/useBeatMaker'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

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
  const [savedPatterns, setSavedPatterns] = useState<{id: string, name: string, tracks: Track[], sequencerData: any, bpm: number, transportKey: string, steps: number}[]>([])
  const [activeTab, setActiveTab] = useState('sequencer')
  const [lastLoadedPattern, setLastLoadedPattern] = useState<string | null>(null)
  const [showPatternDetails, setShowPatternDetails] = useState(true)
  
  // Song arrangement pattern assignments: {trackId: {barIndex: patternId}}
  const [songPatternAssignments, setSongPatternAssignments] = useState<{[trackId: number]: {[barIndex: number]: string}}>({})
  const [selectedPatternForPlacement, setSelectedPatternForPlacement] = useState<string | null>(null)
  
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
    setSongPatternAssignments(prev => {
      const newAssignments = { ...prev }
      
      if (!newAssignments[trackId]) {
        newAssignments[trackId] = {}
      }
      
      if (patternId) {
        // Assign the pattern
        newAssignments[trackId][barPosition] = patternId
      } else {
        // Remove the pattern assignment
        delete newAssignments[trackId][barPosition]
      }
      
      return newAssignments
    })
  }
  
  // Get the pattern assigned to a track at a specific bar
  const getAssignedPattern = (trackId: number, barPosition: number) => {
    return songPatternAssignments[trackId]?.[barPosition] || null
  }
  
  // Select a pattern for placement
  const selectPatternForPlacement = (patternId: string) => {
    setSelectedPatternForPlacement(patternId)
  }
  
  // Clear pattern selection
  const clearPatternSelection = () => {
    setSelectedPatternForPlacement(null)
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

    // Check if any patterns are assigned to tracks
    const hasActiveArrangement = Object.values(songPatternAssignments).some(trackAssignments => 
      Object.keys(trackAssignments).length > 0
    )
    
    if (!hasActiveArrangement) {
      alert('No patterns assigned! Select patterns and assign them to tracks in the timeline.')
      return
    }

    // Start Tone.js audio context
    const Tone = await import('tone')
    await Tone.start()
    
    // Start song playback
    setSongPlayback(prev => ({ ...prev, isPlaying: true, currentBar: 0 }))
    songPlaybackRef.current.currentStep = 0
    
    // Start the song step sequencer using Tone.js
    startSongStepSequencer()
  }

  // Separate step sequencer for song playback using Tone.js
  const startSongStepSequencer = async () => {
    const Tone = await import('tone')
    
    // Stop any existing sequence
    if (songPlaybackRef.current.sequence) {
      songPlaybackRef.current.sequence.stop()
      songPlaybackRef.current.sequence.dispose()
    }
    
    // Create a sequence that plays every 16th note
    songPlaybackRef.current.sequence = new Tone.Sequence((time, step) => {
      songPlaybackRef.current.currentStep = step
      playSongStep(step)
      
      // Update bar position every 16 steps (one bar)
      if (step % 16 === 0) {
        const barIndex = Math.floor(step / 16) % 32
        setSongPlayback(prev => ({ ...prev, currentBar: barIndex }))
      }
    }, Array.from({ length: steps }, (_, i) => i), '16n')
    
    // Start the sequence
    songPlaybackRef.current.sequence.start(0)
    Tone.Transport.start()
  }

  // Play a step in the song arrangement
  const playSongStep = (step: number) => {
    tracks.forEach(track => {
      const player = songPlaybackRef.current.players[track.id]
      const trackAssignments = songPatternAssignments[track.id] || {}
      const currentBar = songPlayback.currentBar
      const assignedPatternId = trackAssignments[currentBar]
      
      // If no pattern is assigned to this track at this bar, don't play
      if (!assignedPatternId) return
      
      // Find the assigned pattern
      const assignedPattern = savedPatterns.find(p => p.id === assignedPatternId)
      if (!assignedPattern) return
      
      // Get the pattern data for this track
      const patternSequencerData = assignedPattern.sequencerData[track.id] || []
      
      // Check if this track should play at the current step
      const shouldPlayStep = patternSequencerData[step]
      
      if (shouldPlayStep && player && track.audioUrl && track.audioUrl !== 'undefined') {
        try {
          // Stop if already playing to prevent overlap
          if (player.state === 'started') {
            player.stop()
          }
          
          // Start with proper timing using Tone.js
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
          steps: pattern.steps
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
      await handleSavePattern(patternName.trim(), patternDescription.trim(), patternCategory.trim(), tags)
      setShowSavePatternDialog(false)
      
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
            steps: pattern.steps
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
      await handleSaveTrackPattern(selectedTrackForPattern.id, patternName.trim(), patternDescription.trim(), patternCategory.trim(), tags)
      setShowSaveTrackPatternDialog(false)
      setSelectedTrackForPattern(null)
      
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
        steps: pattern.steps
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

      const patternType = track.name.toLowerCase()

      // Fetch patterns filtered by pattern type
      const { data: patterns, error } = await supabase
        .from('saved_patterns')
        .select('*')
        .eq('user_id', user.id)
        .eq('pattern_type', patternType)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading patterns:', error)
        alert('Failed to load patterns')
        return
      }

      if (!patterns || patterns.length === 0) {
        alert(`No ${patternType} patterns found. Save some ${patternType} patterns first!`)
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
          query = query.eq('subgenre', selectedSubgenre.trim())
          console.log(`[DEBUG] Duplicate shuffle filtering by locked subgenre: ${selectedSubgenre}`)
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
          let fallbackQuery = supabase
            .from('audio_library_items')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('audio_type', originalTrack.audio_type || 'Melody Loop')
          
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

      if (!shuffledAudio || shuffledAudio.length === 0) {
        console.log('No alternative audio found with same key and type, trying broader search...')
        // Try broader search
        let broaderQuery = supabase
          .from('audio_library_items')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('audio_type', originalTrack.audio_type || 'Melody Loop')
        
        // Add genre filter if a genre is selected and locked
        if (selectedGenre && selectedGenre.name && isGenreLocked) {
          broaderQuery = broaderQuery.eq('genre', selectedGenre.name)
        }
        
        // Add subgenre filter if a subgenre is selected and locked
        if (selectedSubgenre && selectedSubgenre.trim() && isSubgenreLocked) {
          broaderQuery = broaderQuery.eq('subgenre', selectedSubgenre.trim())
        }
        
        const { data: broaderAudio, error: broaderError } = await broaderQuery.limit(10)
        
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
        return
      }

      // Fetch audio files of the specific type using the new audio_type system
      let audioFiles: any[] = []
      
      // Build query with genre filtering if a genre is selected
      let query = supabase
        .from('audio_library_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('audio_type', audioType)
      
      // Add genre filter if a genre is selected and locked
      if (selectedGenre && selectedGenre.name && isGenreLocked) {
        query = query.eq('genre', selectedGenre.name)
        console.log(`[DEBUG] Filtering by locked genre: ${selectedGenre.name}`)
      }
      
      // Add subgenre filter if a subgenre is selected and locked
      if (selectedSubgenre && selectedSubgenre.trim() && isSubgenreLocked) {
        query = query.eq('subgenre', selectedSubgenre.trim())
        console.log(`[DEBUG] Filtering by locked subgenre: ${selectedSubgenre}`)
      }
      
      const { data: typeFiles, error: typeError } = await query
      
      console.log(`[DEBUG] Found ${typeFiles?.length || 0} files with audio_type: ${audioType}`)
      if (typeFiles && typeFiles.length > 0) {
        audioFiles = [...audioFiles, ...typeFiles]
      }
      
      // If no exact matches, try to get files by name containing the type (fallback)
      if (audioFiles.length === 0) {
        let fallbackQuery = supabase
          .from('audio_library_items')
          .select('*')
          .eq('user_id', user.id)
          .ilike('name', `%${audioType.toLowerCase()}%`)
        
        // Add genre filter if a genre is selected and locked
        if (selectedGenre && selectedGenre.name && isGenreLocked) {
          fallbackQuery = fallbackQuery.eq('genre', selectedGenre.name)
        }
        
        // Add subgenre filter if a subgenre is selected and locked
        if (selectedSubgenre && selectedSubgenre.trim() && isSubgenreLocked) {
          fallbackQuery = fallbackQuery.eq('subgenre', selectedSubgenre.trim())
        }
        
        const { data: nameFiles, error: nameError } = await fallbackQuery
        
        console.log(`[DEBUG] Found ${nameFiles?.length || 0} files with name containing: ${audioType}`)
        if (nameFiles) {
          audioFiles = [...audioFiles, ...nameFiles]
        }
      }
      
      // Special handling for Hi-Hat to search for multiple variations
      if (audioType === 'Hihat' && audioFiles.length === 0) {
        const hiHatVariations = ['Hihat', 'Hi-Hat', 'Hi Hat']
        for (const variation of hiHatVariations) {
          let hiHatQuery = supabase
            .from('audio_library_items')
            .select('*')
            .eq('user_id', user.id)
            .eq('audio_type', variation)
          
          // Add genre filter if a genre is selected and locked
          if (selectedGenre && selectedGenre.name && isGenreLocked) {
            hiHatQuery = hiHatQuery.eq('genre', selectedGenre.name)
          }
          
          // Add subgenre filter if a subgenre is selected and locked
          if (selectedSubgenre && selectedSubgenre.trim() && isSubgenreLocked) {
            hiHatQuery = hiHatQuery.eq('subgenre', selectedSubgenre.trim())
          }
          
          const { data: variationFiles, error: variationError } = await hiHatQuery
          
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
        console.log(`No ${audioType} audio files found in your library`)
        return
      }

      // Randomly select one audio file
      const randomIndex = Math.floor(Math.random() * audioFiles.length)
      const selectedAudio = audioFiles[randomIndex]

      // Update the track with the new audio
      const publicUrl = getPublicAudioUrl(selectedAudio.file_url || '')
      
      // Special handling for Melody Loop tracks - sync with transport key and tempo
      let finalBpm = selectedAudio.bpm || 120
      let finalKey = selectedAudio.key || 'C'
      let pitchShift = 0
      let playbackRate = 1.0
      
      if (track.name === 'Melody Loop') {
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
          // Mode A: Melody Loop dominates - Transport adapts to melody loop
          finalBpm = selectedAudio.bpm || 120
          finalKey = selectedAudio.key || 'C'
          playbackRate = 1.0
          pitchShift = 0
          
          // Update transport to match melody loop
          setBpm(selectedAudio.bpm || 120)
          setTransportKey(selectedAudio.key || 'C')
          
          console.log(`[Mode A] Transport adapts to Melody Loop: ${bpm}BPM ${transportKey} -> ${selectedAudio.bpm}BPM ${selectedAudio.key}`)
        }
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

      // Toggle melody loop mode
      setMelodyLoopMode(prev => prev === 'transport-dominates' ? 'melody-dominates' : 'transport-dominates')
      
      // Store current transport settings if locked
      const originalBpm = isTransportLocked ? bpm : null
      const originalKey = isTransportLocked ? transportKey : null

      // Store current genre/subgenre settings if locked
      const originalGenre = isGenreLocked ? selectedGenre : null
      const originalSubgenre = isSubgenreLocked ? selectedSubgenre : null

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
          } else if (steps === 64) {
            // Repeat the 16-step pattern four times for 64 steps
            newPattern = [...randomPattern, ...randomPattern, ...randomPattern, ...randomPattern]
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

      // Restore transport settings if locked
      if (isTransportLocked) {
        if (originalBpm !== null) setBpm(originalBpm)
        if (originalKey !== null) setTransportKey(originalKey)
        console.log('Transport locked - restored BPM and Key settings')
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

      // Get pattern type from track name
      const patternType = track.name.toLowerCase()

      // Fetch patterns from database filtered by pattern type
      const { data: patterns, error } = await supabase
        .from('saved_patterns')
        .select('*')
        .eq('user_id', user.id)
        .eq('pattern_type', patternType)
        .order('created_at', { ascending: false })

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
      const sequencerData = randomPattern.sequencer_data || randomPattern.sequencerData
      
      if (!sequencerData) {
        console.warn('Selected pattern has no sequencer data')
        return
      }

      // Extract the pattern for this specific track
      const trackPattern = sequencerData[trackId] || sequencerData[track.id]
      
      if (!trackPattern) {
        console.warn('Selected pattern has no data for this track')
        return
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
          const patternType = track.name.toLowerCase()
          
          // Try to get patterns from database first
          const { data: patterns, error } = await supabase
            .from('saved_patterns')
            .select('*')
            .eq('user_id', user.id)
            .eq('pattern_type', patternType)
            .order('created_at', { ascending: false })

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

  const handleSavePattern = async (name: string, description?: string, category?: string, tags?: string[]) => {
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
            pattern_type: track.name.toLowerCase()
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
          category,
          pattern_type: track.name.toLowerCase()
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
  const [selectedGenre, setSelectedGenre] = useState<any>(null)
  const [selectedSubgenre, setSelectedSubgenre] = useState<string>('')
  const [isGenreLocked, setIsGenreLocked] = useState<boolean>(false)
  const [isSubgenreLocked, setIsSubgenreLocked] = useState<boolean>(false)
  const [availableSubgenres, setAvailableSubgenres] = useState<string[]>([])
  const [genreSubgenres, setGenreSubgenres] = useState<{[key: string]: string[]}>({})
  const [genreTemplates, setGenreTemplates] = useState<any[]>([])
  const [showGenreDialog, setShowGenreDialog] = useState(false)
  const [showGenreTemplateDialog, setShowGenreTemplateDialog] = useState(false)
  const [selectedGenreTemplate, setSelectedGenreTemplate] = useState<any>(null)
  
  // New genre creation state
  const [showCreateGenreDialog, setShowCreateGenreDialog] = useState(false)
  const [newGenreName, setNewGenreName] = useState('')
  const [newGenreDescription, setNewGenreDescription] = useState('')
  const [newGenreBpm, setNewGenreBpm] = useState(120)
  const [newGenreKey, setNewGenreKey] = useState('C')
  const [newGenreSteps, setNewGenreSteps] = useState(16)
  const [newGenreColor, setNewGenreColor] = useState('#F4C430')
  const [newGenreSubgenres, setNewGenreSubgenres] = useState<string[]>([])
  const [newSubgenreInput, setNewSubgenreInput] = useState('')
  const [isCreatingGenre, setIsCreatingGenre] = useState(false)

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

  // Transport lock state
  const [isTransportLocked, setIsTransportLocked] = useState(false)
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

  // Load subgenres for all genres
  const loadAllGenreSubgenres = async () => {
    try {
      const { data, error } = await supabase
        .from('genre_subgenres')
        .select('genre, subgenre')
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
      console.log('Loaded subgenres for all genres:', subgenresByGenre)
    } catch (error) {
      console.error('Error loading all subgenres:', error)
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
    setIsGenreLocked(!isGenreLocked)
  }

  const handleToggleSubgenreLock = () => {
    setIsSubgenreLocked(!isSubgenreLocked)
  }

  const handleClearAll = () => {
    // Reset transport settings
    setBpm(120)
    setTransportKey('C')
    setSteps(16)
    setCurrentStep(0)
    
    // Reset tracks to default
    setTracks([
      { id: 1, name: 'Kick', audioUrl: null, color: 'bg-red-500' },
      { id: 2, name: 'Snare', audioUrl: null, color: 'bg-blue-500' },
      { id: 3, name: 'Hi-Hat', audioUrl: null, color: 'bg-green-500' },
    ])
    
    // Clear all sequencer data
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
    
    // Reset transport lock
    setIsTransportLocked(false)
    
    console.log('Cleared all data - fresh start!')
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
              onChange={(e) => setSelectedSubgenre(e.target.value)}
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
              </div>

              {/* BPM Controls */}
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
                    className={`min-w-[60px] text-center cursor-pointer hover:bg-gray-600 transition-colors ${
                      isTransportLocked ? 'bg-yellow-400/20 border-yellow-400' : ''
                    }`}
                    onClick={handleBpmEdit}
                    title="Click to edit BPM"
                  >
                    {bpm}
                  </Badge>
                )}
                <div className="w-24">
                  <Slider
                    value={[bpm]}
                    onValueChange={(value) => setBpm(value[0])}
                    min={60}
                    max={200}
                    step={1}
                    className="w-full"
                    disabled={isTransportLocked}
                  />
                </div>
              </div>
              
              {/* Key Controls */}
              <div className="flex items-center gap-2">
                <span className="text-white text-sm">Key:</span>
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
                      isTransportLocked ? 'bg-yellow-400/20 border-yellow-400' : ''
                    }`}
                    onClick={handleTransportKeyEdit}
                    title="Click to edit transport key"
                  >
                    {transportKey}
                  </Badge>
                )}
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
            </div>

            {/* Secondary Controls Row */}
            <div className="flex items-center gap-4 flex-wrap">
              {/* Transport Lock and Mode */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsTransportLocked(!isTransportLocked)}
                  className={`${
                    isTransportLocked 
                      ? 'bg-yellow-400 text-black border-yellow-400 hover:bg-yellow-300' 
                      : 'bg-black text-yellow-400 border-yellow-400 hover:bg-yellow-400 hover:text-black'
                  }`}
                  title={isTransportLocked ? "Unlock transport (BPM & Key)" : "Lock transport (BPM & Key)"}
                >
                  {isTransportLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                </Button>
                
                {/* Melody Loop Mode Indicator */}
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
            transportKey={transportKey}
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
                    {savedPatterns.length === 0 ? (
                      <div className="text-center text-gray-500 text-sm py-4">
                        <div className="mb-2">No saved patterns yet</div>
                        <div className="text-xs">Save patterns in the Sequencer tab first</div>
                      </div>
                    ) : (
                      savedPatterns.map((pattern, index) => (
                        <div key={pattern.id} className="space-y-1">
                          <div
                            className={`flex items-center p-2 rounded border transition-all cursor-pointer hover:bg-[#2a2a2a] ${
                              lastLoadedPattern === pattern.id
                                ? 'bg-[#1f3a5f] border-blue-500'
                                : selectedPatternForPlacement === pattern.id
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
                              index === 0 ? 'bg-green-500' : 
                              index === 1 ? 'bg-blue-500' : 
                              index === 2 ? 'bg-purple-500' : 'bg-orange-500'
                            }`}></div>
                            <span className="text-white text-sm flex-1">{pattern.name}</span>
                            <div className="ml-auto flex items-center gap-1">
                              {lastLoadedPattern === pattern.id && (
                                <div className="text-blue-400 text-xs">🎛️</div>
                              )}
                              {selectedPatternForPlacement === pattern.id && (
                                <div className="text-green-400 text-xs">📌</div>
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
                                loadPattern(pattern.id)
                              }}
                            >
                              Load
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-6 text-green-400 hover:text-green-300 hover:bg-green-900/20"
                              onClick={(e) => {
                                e.stopPropagation()
                                // Save this pattern as a track pattern
                                const patternData = {
                                  name: pattern.name,
                                  sequencer_data: pattern.sequencerData || [],
                                  bpm: pattern.bpm,
                                  key: pattern.transportKey || transportKey,
                                  color: 'bg-gray-500',
                                  audioUrl: null
                                }
                                
                                // Create a new song arrangement with just this pattern
                                savePatternAsTrackPattern(patternData)
                              }}
                              title="Save this pattern as individual track pattern"
                            >
                              <Save className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-6 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                              onClick={(e) => {
                                e.stopPropagation()
                                setShowLoadSongTrackPatternDialog(true)
                              }}
                              title="Load saved track patterns"
                            >
                              <FolderOpen className="w-3 h-3" />
                            </Button>
                          </div>
                          
                          {/* Pattern info */}
                          <div className="text-xs text-gray-500 text-center">
                            BPM: {pattern.bpm} | Steps: {pattern.steps}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-6 space-y-2">
                    <Button size="sm" variant="outline" className="w-full" onClick={saveAsNewPattern}>
                      <Music className="w-4 h-4 mr-2" />
                      Save Pattern
                    </Button>
                    <Button size="sm" variant="outline" className="w-full" onClick={refreshSavedPatterns}>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Refresh Patterns
                    </Button>
                    <div className="text-xs text-gray-500 text-center space-y-1">
                      <div className="text-blue-500">🎛️ Blue = Loaded in sequencer</div>
                      <div className="text-green-500">📌 Green = Selected for placement</div>
                      <div className="text-purple-400 mt-2">🎼 Click pattern then click timeline to assign!</div>
                      <div className="text-orange-400 text-xs">🎯 Click timeline cell to assign/remove patterns</div>
                      <div className="text-cyan-400 text-xs">👁️ Toggle button to show/hide pattern details</div>
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
                        // Check if any track has pattern assignments at this bar
                        const hasPatternAssignments = Object.values(songPatternAssignments).some(trackAssignments => 
                          trackAssignments[i]
                        )
                        
                        return (
                          <div 
                            key={i} 
                            className={`w-16 text-center text-xs py-2 border-r border-gray-700 relative ${
                              songPlayback.isPlaying && songPlayback.currentBar === i 
                                ? 'bg-green-500/20 text-green-400' 
                                : hasPatternAssignments
                                  ? 'text-blue-400'
                                  : 'text-gray-400'
                            }`}
                          >
                            {i + 1}
                            {hasPatternAssignments && !songPlayback.isPlaying && (
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
                            const assignedPatternId = getAssignedPattern(track.id, i)
                            const assignedPattern = assignedPatternId ? savedPatterns.find(p => p.id === assignedPatternId) : null
                            const isCurrentBar = songPlayback.isPlaying && songPlayback.currentBar === i
                            const isSelected = selectedPatternForPlacement === assignedPatternId
                            
                            return (
                              <div 
                                key={i} 
                                className={`w-16 h-8 border-r border-gray-700/30 cursor-pointer transition-colors flex items-center justify-center relative ${
                                  assignedPattern 
                                    ? 'bg-gray-800/50 border-gray-600' 
                                    : 'hover:bg-gray-700/30'
                                } ${isCurrentBar && assignedPattern ? 'ring-2 ring-green-400 animate-pulse' : ''} ${isSelected ? 'ring-2 ring-blue-400' : ''}`}
                                onClick={() => {
                                  if (selectedPatternForPlacement) {
                                    // Assign the selected pattern
                                    assignPatternToTrack(track.id, i, selectedPatternForPlacement)
                                    // Don't clear selection - keep it selected for multiple assignments
                                  } else if (assignedPatternId) {
                                    // Remove the assigned pattern
                                    assignPatternToTrack(track.id, i, null)
                                  }
                                }}
                                title={`Bar ${i + 1} - ${track.name} ${assignedPattern ? `(${assignedPattern.name})` : '(No Pattern)'} - ${selectedPatternForPlacement ? 'Click to assign pattern' : 'Click to remove pattern'}`}
                              >
                                {assignedPattern && (
                                  <div className="absolute inset-0 p-1">
                                    {showPatternDetails ? (
                                      <>
                                        {/* Show the assigned pattern for this track */}
                                        <div className="w-full h-full flex items-center gap-0.5">
                                          {(assignedPattern.sequencerData[track.id] || []).slice(0, 8).map((stepActive: boolean, stepIndex: number) => (
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
                                        
                                        {/* Show pattern name */}
                                        <div className="absolute bottom-0 left-0 right-0 text-center">
                                          <div className="text-white text-xs font-bold truncate px-1">
                                            {assignedPattern.name}
                                          </div>
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
                          {pattern.pattern_type && <span>Type: {pattern.pattern_type}</span>}
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
                        </div>
                        {genreSubgenres[genre.name] && genreSubgenres[genre.name].length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs text-gray-500 mb-1">Subgenres:</div>
                            <div className="flex flex-wrap gap-1">
                              {genreSubgenres[genre.name].slice(0, 3).map((subgenre, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 text-xs bg-blue-900/50 text-blue-300 rounded border border-blue-700"
                                >
                                  {subgenre}
                                </span>
                              ))}
                              {genreSubgenres[genre.name].length > 3 && (
                                <span className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded border border-gray-600">
                                  +{genreSubgenres[genre.name].length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
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
              Create a custom genre with your preferred settings.
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
            <div className="grid grid-cols-3 gap-4">
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
    </div>
  )
}

