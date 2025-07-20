import { useState, useEffect, useRef, useCallback } from 'react'
import * as Tone from 'tone'
import { PITCH_SHIFT_SETTINGS } from '@/lib/utils'

export interface Track {
  id: number
  name: string
  audioUrl: string | null
  audioName?: string | null
  color: string
  mute?: boolean
  solo?: boolean
  locked?: boolean // Whether the track is locked from shuffle
  // Tempo properties for individual sample editing
  originalBpm?: number // The original BPM of the sample (auto-detected or user-set)
  currentBpm?: number  // The current BPM the sample should play at
  playbackRate?: number // The calculated playback rate (currentBpm / originalBpm)
  // Pitch properties for individual sample editing
  originalKey?: string // The original key of the sample (e.g., "C", "C#", "D")
  currentKey?: string  // The current key the sample should play at
  pitchShift?: number  // The pitch shift in semitones (-12 to +12)
  // Audio metadata from library
  bpm?: number
  key?: string
  audio_type?: string
  tags?: string[]
  // MIDI properties
  midiNotes?: MidiNote[]
  // Piano roll properties for audio tracks
  pianoRollNotes?: AudioNote[]
  // Stock sound for MIDI tracks
  stockSound?: any
}

export interface MidiNote {
  id: string
  note: string
  startStep: number
  duration: number
  velocity: number
}

export interface AudioNote {
  id: string
  note: string
  startStep: number
  duration: number
  velocity: number
  pitchShift: number // Semitones up/down from original
}

export interface SequencerData {
  [trackId: number]: boolean[]
}

export interface PianoRollData {
  [trackId: number]: AudioNote[]
}

export function useBeatMaker(tracks: Track[], steps: number, bpm: number) {
  const [sequencerData, setSequencerData] = useState<SequencerData>({})
  const [pianoRollData, setPianoRollData] = useState<PianoRollData>({})
  const [isSequencePlaying, setIsSequencePlaying] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const samplesRef = useRef<{ [key: string]: Tone.Player }>({})
  const pitchShiftersRef = useRef<{ [key: string]: Tone.PitchShift }>({})
  const playingSamplesRef = useRef<Set<Tone.Player>>(new Set())
  
  // Store original sequencer data to preserve patterns when steps change
  const originalSequencerDataRef = useRef<SequencerData>({})
  const isLoadingPatternRef = useRef<boolean>(false)

  // Function to set sequencer data from outside (for session loading)
  const setSequencerDataFromSession = useCallback((newSequencerData: SequencerData | ((prev: SequencerData) => SequencerData)) => {
    console.log('[HOOK] setSequencerDataFromSession called with:', newSequencerData)
    isLoadingPatternRef.current = true
    
    if (typeof newSequencerData === 'function') {
      // If it's a function, call it with current state
      setSequencerData(prev => {
        const result = newSequencerData(prev)
        // Save the result as original data for step preservation
        originalSequencerDataRef.current = { ...result }
        console.log('[HOOK] Sequencer data updated via function and original data saved')
        return result
      })
    } else {
      // If it's direct data, use it directly
      originalSequencerDataRef.current = { ...newSequencerData }
      setSequencerData(newSequencerData)
      console.log('[HOOK] Sequencer data updated directly and original data saved')
    }
    
    // Reset the loading flag after a short delay to allow the state to update
    setTimeout(() => {
      isLoadingPatternRef.current = false
    }, 100)
  }, [])

  // Initialize sequencer data
  useEffect(() => {
    const newSequencerData: SequencerData = {}
    const currentTrackIds = tracks.map(track => track.id)
    
    // Handle all tracks - either create new or resize existing
    tracks.forEach(track => {
      const existingData = sequencerData[track.id]
      const originalData = originalSequencerDataRef.current[track.id]
      
      if (!existingData) {
        // New track - create fresh array
        newSequencerData[track.id] = new Array(steps).fill(false)
      } else if (existingData.length !== steps) {
        // Existing track but wrong length - resize array
        const resizedArray = new Array(steps).fill(false)
        
        if (steps > existingData.length) {
          // Expanding steps - try to restore from original data if available
          if (originalData && originalData.length >= steps) {
            // Restore from original data
            for (let i = 0; i < steps; i++) {
              resizedArray[i] = originalData[i] || false
            }
            console.log(`[STEPS CHANGE] Restored ${steps} steps from original data for track ${track.name}`)
          } else {
            // No original data available, copy what we have
            const copyLength = Math.min(existingData.length, steps)
            for (let i = 0; i < copyLength; i++) {
              resizedArray[i] = existingData[i]
            }
            console.log(`[STEPS CHANGE] Expanded to ${steps} steps, copied ${copyLength} steps for track ${track.name}`)
          }
        } else {
          // Reducing steps - save current data as original and copy what fits
          if (!originalData || originalData.length < existingData.length) {
            originalSequencerDataRef.current[track.id] = [...existingData]
            console.log(`[STEPS CHANGE] Saved original ${existingData.length} steps for track ${track.name}`)
          }
          
          const copyLength = Math.min(existingData.length, steps)
          for (let i = 0; i < copyLength; i++) {
            resizedArray[i] = existingData[i]
          }
          console.log(`[STEPS CHANGE] Reduced to ${steps} steps, copied ${copyLength} steps for track ${track.name}`)
        }
        
        newSequencerData[track.id] = resizedArray
      } else {
        // Existing track with correct length - keep as is
        newSequencerData[track.id] = existingData
      }
    })
    
    // Only update if there are changes AND we're not in the middle of loading a pattern
    const hasChanges = tracks.some(track => {
      const existing = sequencerData[track.id]
      const newData = newSequencerData[track.id]
      return !existing || existing.length !== newData.length || JSON.stringify(existing) !== JSON.stringify(newData)
    }) || Object.keys(sequencerData).length !== Object.keys(newSequencerData).length
    
    // Don't override loaded pattern data unless we're actually changing tracks or steps
    if (hasChanges && !isLoadingPatternRef.current) {
      console.log('[HOOK] Initializing sequencer data for new tracks/steps')
      setSequencerData(newSequencerData)
    } else if (isLoadingPatternRef.current) {
      console.log('[HOOK] Skipping initialization - pattern is being loaded')
    }
  }, [tracks, steps])

  // Update BPM
  useEffect(() => {
    Tone.Transport.bpm.value = bpm
  }, [bpm])

  // Load samples with improved pitch shifting
  useEffect(() => {
    const loadSamples = async () => {
      const Tone = await import('tone')
      
      // Clean up existing samples and pitch shifters
      Object.values(samplesRef.current).forEach(player => {
        if (player.state === 'started') {
          player.stop()
        }
        player.dispose()
      })
      Object.values(pitchShiftersRef.current).forEach(shifter => {
        shifter.dispose()
      })
      samplesRef.current = {}
      pitchShiftersRef.current = {}

      for (const track of tracks) {
        if (track.audioUrl && track.audioUrl !== 'undefined') {
          try {
            console.log(`[DEBUG] Creating Tone.Player for track ${track.name} (id: ${track.id}) with audioUrl: ${track.audioUrl}`)
            
            // Create pitch shifter with high quality settings
            const pitchShift = new Tone.PitchShift({
              pitch: track.pitchShift || 0,
              windowSize: PITCH_SHIFT_SETTINGS.windowSize,
              delayTime: PITCH_SHIFT_SETTINGS.delayTime,
              feedback: PITCH_SHIFT_SETTINGS.feedback
            }).toDestination()
            pitchShiftersRef.current[track.id] = pitchShift
            
            // Create player and connect to pitch shifter
            const player = new Tone.Player(track.audioUrl).connect(pitchShift)
            
            // Apply playback rate if specified
            if (track.playbackRate && track.playbackRate !== 1) {
              player.playbackRate = track.playbackRate
              console.log(`[DEBUG] Set playback rate for track ${track.name} to ${track.playbackRate}`)
            }
            
            // Apply pitch shift if specified
            if (track.pitchShift && track.pitchShift !== 0) {
              pitchShift.pitch = track.pitchShift
              console.log(`[DEBUG] Set pitch shift for track ${track.name} to ${track.pitchShift} semitones`)
            }
            
            samplesRef.current[track.id] = player
            console.log(`[DEBUG] Created player and pitch shifter for track ${track.name}`)
          } catch (error) {
            console.error(`Failed to load audio for track ${track.id}:`, error)
          }
        } else {
          console.log(`[DEBUG] Skipping Tone.Player for track ${track.name} (id: ${track.id}) - audioUrl is invalid:`, track.audioUrl)
        }
      }
    }

    loadSamples()
  }, [tracks])

  // Define playStep function first
  const playStep = useCallback((step: number) => {
    setCurrentStep(step)
    console.log(`[PLAYSTEP DEBUG] Step ${step}, pianoRollData:`, pianoRollData)
    console.log(`[PLAYSTEP DEBUG] Total piano roll notes across all tracks:`, Object.values(pianoRollData || {}).flat().length)
    tracks.forEach(track => {
      const player = samplesRef.current[track.id]
      const shouldPlay = sequencerData[track.id]?.[step]
      const validAudio = track.audioUrl && track.audioUrl !== 'undefined'
      console.log(`[DEBUG] Step ${step} - Track ${track.name} (id: ${track.id}): shouldPlay=${shouldPlay}, playerLoaded=${player?.loaded}, audioUrl=${track.audioUrl}`)
      
      // Handle audio samples (main sequencer pattern)
      if (
        shouldPlay &&
        player &&
        player.loaded &&
        validAudio &&
        !track.mute // Don't play if track is muted
      ) {
        console.log(`[DEBUG] Playing sample for track ${track.name} at step ${step}`)
        
        try {
          // Stop the player first if it's already playing to prevent timing conflicts
          if (player.state === 'started') {
            player.stop()
          }
          
          // Track the playing sample for cleanup
          playingSamplesRef.current.add(player)
          
          // Start the sample with a small timing offset to prevent scheduling conflicts
          const startTime = Tone.now() + 0.001 // 1ms offset
          player.start(startTime)
          
          // Set up cleanup when sample stops (Tone.js way)
          player.onstop = () => {
            playingSamplesRef.current.delete(player)
          }
        } catch (error) {
          console.warn(`[DEBUG] Error playing sample for track ${track.name}:`, error)
          // Remove from playing samples if there was an error
          playingSamplesRef.current.delete(player)
        }
      }
      
      // Handle piano roll notes (sub-pattern) - these play independently of main sequencer
      const trackPianoRollNotes = pianoRollData[track.id] || []
      
      // Piano roll extends to 4 bars (64 steps), but sequencer is only 16 steps
      // We need to map sequencer steps to piano roll steps correctly
      // The sequencer loops every 16 steps, so we need to check if any piano roll notes
      // should play at the current step in the 16-step cycle
      const pianoRollNotesAtStep = trackPianoRollNotes.filter(note => {
        // SIMPLE MAPPING: Just check if the piano roll step matches the sequencer step directly
        // Since both use 1-based indexing for display, we can compare directly
        const shouldPlay = note.startStep === (step + 1) // Convert sequencer step to 1-based for comparison
        
        console.log(`[STEP MAPPING DEBUG] Note at step ${note.startStep} vs sequencer step ${step + 1} -> shouldPlay: ${shouldPlay}`)
        
        // Additional debug info
        if (shouldPlay) {
          console.log(`[STEP MAPPING SUCCESS] Piano roll note ${note.note} will play at sequencer step ${step + 1}`)
        }
        
        return shouldPlay
      })
      
      console.log(`[PIANO ROLL STEP DEBUG] Track ${track.name}: sequencer step=${step}, notesAtStep=${pianoRollNotesAtStep.length}, allNotes=${trackPianoRollNotes.map(n => `${n.startStep}:${n.pitchShift} (bar ${Math.floor((n.startStep-1)/16) + 1}, step ${(n.startStep-1) % 16})`).join(', ')}`)
      
      console.log(`[PIANO ROLL DEBUG] Track ${track.name}: step=${step}, notesAtStep=${pianoRollNotesAtStep.length}, totalNotes=${trackPianoRollNotes.length}`)
      
      // Debug: Show all piano roll notes for this track
      if (trackPianoRollNotes.length > 0) {
        console.log(`[PIANO ROLL DETAILED DEBUG] Track ${track.name} has ${trackPianoRollNotes.length} notes:`, trackPianoRollNotes.map(n => ({
          step: n.startStep,
          note: n.note,
          pitchShift: n.pitchShift,
          mappedStep: (n.startStep - 1) % 16
        })))
      }
      
      // Piano roll notes play in sync with sequencer steps
      if (pianoRollNotesAtStep.length > 0 && validAudio && !track.mute) {
        console.log(`[DEBUG] Playing ${pianoRollNotesAtStep.length} piano roll notes for track ${track.name} at step ${step}`)
        
        pianoRollNotesAtStep.forEach(note => {
          try {
            // Use the existing player that's already loaded and synced
            const existingPlayer = samplesRef.current[track.id]
            if (!existingPlayer || !existingPlayer.loaded) {
              console.warn(`[DEBUG] No loaded player for track ${track.name}`)
              return
            }
            
            // Stop the player first if it's already playing
            if (existingPlayer.state === 'started') {
              existingPlayer.stop()
            }
            
            // Track the playing sample for cleanup
            playingSamplesRef.current.add(existingPlayer)
            
            // Start the sample immediately (in sync with sequencer step)
            existingPlayer.start()
            
            console.log(`[DEBUG] Successfully played piano roll note ${note.note} for track ${track.name} at step ${step}`)
          } catch (error) {
            console.warn(`[DEBUG] Error playing piano roll note for track ${track.name}:`, error)
          }
        })
      }
      
      // Handle MIDI notes
      if (track.name === 'MIDI' && track.midiNotes && track.midiNotes.length > 0) {
        const notesAtStep = track.midiNotes.filter(note => note.startStep === step)
        notesAtStep.forEach(note => {
          console.log(`[DEBUG] Playing MIDI note: ${note.note} at step ${step}`)
          // Here we'll trigger the MIDI note - we'll implement this in the main component
          // where we have access to the synthesizers
        })
      }
    })
  }, [tracks, sequencerData, pianoRollData])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop all playing samples
      playingSamplesRef.current.forEach(player => {
        if (player.state === 'started') {
          player.stop()
        }
      })
      playingSamplesRef.current.clear()
      
      // Dispose all players
      Object.values(samplesRef.current).forEach(player => player.dispose())
      
      // Clear interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  // Restart interval when BPM changes, sequencer data changes, or playback state changes
  useEffect(() => {
    if (!isSequencePlaying) return
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    let step = currentStep
    const stepDuration = 60 / bpm / 4 // 16th note duration
    intervalRef.current = setInterval(() => {
      step = (step + 1) % steps
      console.log(`[SEQUENCER INTERVAL] Step: ${step} (cycling through 0-${steps-1})`)
      playStep(step)
    }, stepDuration * 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [bpm, isSequencePlaying, playStep, steps])

  const toggleStep = useCallback((trackId: number, stepIndex: number) => {
    setSequencerData(prev => ({
      ...prev,
      [trackId]: prev[trackId]?.map((value, index) => 
        index === stepIndex ? !value : value
      ) || new Array(steps).fill(false)
    }))
  }, [steps])

  const playSequence = useCallback(async () => {
    if (isSequencePlaying) return

    // Start Tone.js audio context
    await Tone.start()
    
    setIsSequencePlaying(true)
    setCurrentStep(0)

    const stepDuration = 60 / bpm / 4 // 16th note duration

    let step = 0;
    playStep(step);

    intervalRef.current = setInterval(() => {
      step = (step + 1) % steps;
      playStep(step);
    }, stepDuration * 1000)
  }, [isSequencePlaying, bpm, tracks, sequencerData, pianoRollData, steps, playStep])

  // Function to play piano roll notes independently - TEMPO SYNCED VERSION
  const playPianoRollNotes = useCallback(async () => {
    console.log(`[PIANO ROLL PLAYBACK] Starting piano roll playback at ${bpm} BPM`)
    console.log(`[PIANO ROLL PLAYBACK] Full piano roll data:`, pianoRollData)
    
    // Calculate timing based on BPM
    const stepDuration = (60 / bpm) / 4 // 16th note duration in seconds
    console.log(`[PIANO ROLL PLAYBACK] Step duration: ${stepDuration}s (${stepDuration * 1000}ms)`)
    
    // Use the existing loaded samples instead of creating new ones
    for (const track of tracks) {
      const trackPianoRollNotes = pianoRollData[track.id] || []
      if (trackPianoRollNotes.length === 0) {
        console.log(`[PIANO ROLL PLAYBACK] No notes for track ${track.name}`)
        continue
      }
      
      console.log(`[PIANO ROLL PLAYBACK] Track ${track.name} has ${trackPianoRollNotes.length} notes:`, trackPianoRollNotes)
      
      // Use the existing player that's already loaded
      const existingPlayer = samplesRef.current[track.id]
      if (!existingPlayer || !existingPlayer.loaded) {
        console.warn(`[PIANO ROLL PLAYBACK] No loaded player for track ${track.name}`)
        continue
      }
      
      // Play each note with proper timing based on step position
      trackPianoRollNotes.forEach((note) => {
        // Calculate when this note should play based on its step position
        const noteStepInBar = (note.startStep - 1) % 16 // Convert to 0-based step
        const playDelay = noteStepInBar * stepDuration * 1000 // Convert to milliseconds
        
        console.log(`[PIANO ROLL PLAYBACK] Note ${note.note} at step ${note.startStep} (bar step ${noteStepInBar}) will play in ${playDelay}ms`)
        
        setTimeout(() => {
          try {
            console.log(`[PIANO ROLL PLAYBACK] Playing note ${note.note} for track ${track.name} at step ${noteStepInBar}`)
            
            // Stop the player first if it's already playing
            if (existingPlayer.state === 'started') {
              existingPlayer.stop()
            }
            
            // Track the playing sample for cleanup
            playingSamplesRef.current.add(existingPlayer)
            
            // Start the sample
            existingPlayer.start()
            
            console.log(`[PIANO ROLL PLAYBACK] Successfully started note ${note.note} for track ${track.name}`)
          } catch (error) {
            console.error(`[PIANO ROLL PLAYBACK] Error playing note for track ${track.name}:`, error)
          }
        }, playDelay)
      })
    }
  }, [tracks, pianoRollData, bpm])

  const stopSequence = useCallback(() => {
    setIsSequencePlaying(false)
    setCurrentStep(0)
    
    // Stop the sequencer interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    
    // Stop ALL samples from ALL tracks, not just the ones tracked in playingSamplesRef
    // This ensures long samples that are still playing get stopped
    Object.values(samplesRef.current).forEach(player => {
      try {
        if (player && player.state === 'started') {
          console.log('[STOP SEQUENCE] Stopping player that was still playing')
          player.stop()
        }
      } catch (error) {
        console.warn('[DEBUG] Error stopping player:', error)
      }
    })
    
    // Also stop tracked playing samples
    playingSamplesRef.current.forEach(player => {
      try {
        if (player.state === 'started') {
          player.stop()
        }
      } catch (error) {
        console.warn('[DEBUG] Error stopping tracked player:', error)
      }
    })
    playingSamplesRef.current.clear()
    
    console.log('[STOP SEQUENCE] All samples stopped')
  }, [])

  // Function to update track tempo and recalculate playback rate
  const updateTrackTempo = useCallback((trackId: number, newBpm: number, originalBpm?: number) => {
    const track = tracks.find(t => t.id === trackId)
    if (!track) return

    // Use provided originalBpm or default to 120 if not set
    const baseBpm = originalBpm || track.originalBpm || 120
    const playbackRate = newBpm / baseBpm

    // Update the player's playback rate if it exists
    const player = samplesRef.current[trackId]
    if (player) {
      player.playbackRate = playbackRate
      console.log(`[DEBUG] Updated playback rate for track ${track.name} to ${playbackRate} (${newBpm}/${baseBpm})`)
    }

    return {
      originalBpm: baseBpm,
      currentBpm: newBpm,
      playbackRate: playbackRate
    }
  }, [tracks])

  // Function to update track pitch shift
  const updateTrackPitch = useCallback((trackId: number, pitchShift: number, originalKey?: string, currentKey?: string) => {
    const track = tracks.find(t => t.id === trackId)
    if (!track) return

    // Clamp pitch shift to reasonable range (-12 to +12 semitones)
    const clampedPitchShift = Math.max(-12, Math.min(12, pitchShift))

    // Update the pitch shifter if it exists
    const pitchShifter = pitchShiftersRef.current[trackId]
    if (pitchShifter) {
      pitchShifter.pitch = clampedPitchShift
      console.log(`[DEBUG] Updated pitch shift for track ${track.name} to ${clampedPitchShift} semitones`)
    }

    return {
      originalKey: originalKey || track.originalKey || 'C',
      currentKey: currentKey || track.currentKey || 'C',
      pitchShift: clampedPitchShift
    }
  }, [tracks])

  // Function to clear all sequencer patterns
  const clearAllPatterns = useCallback(() => {
    const clearedData: SequencerData = {}
    tracks.forEach(track => {
      clearedData[track.id] = new Array(steps).fill(false)
    })
    setSequencerData(clearedData)
  }, [tracks, steps])

  // Function to clear a single track's pattern
  const clearTrackPattern = useCallback((trackId: number) => {
    setSequencerData(prev => ({
      ...prev,
      [trackId]: new Array(steps).fill(false)
    }))
  }, [steps])

  // Function to toggle track mute state
  const toggleTrackMute = useCallback((trackId: number) => {
    // This will be handled by the parent component that manages track state
    // We'll pass this function up to the parent
  }, [])

  // Function to update piano roll data for a track
  const updatePianoRollData = useCallback((trackId: number, notes: AudioNote[]) => {
    console.log(`[PIANO ROLL HOOK] Updating track ${trackId} with ${notes.length} notes:`, notes)
    setPianoRollData(prev => {
      const newData = {
        ...prev,
        [trackId]: notes
      }
      console.log(`[PIANO ROLL HOOK] New piano roll data:`, newData)
      return newData
    })
  }, [])

  // Debug function to test piano roll playback
  const debugPianoRollPlayback = useCallback(() => {
    console.log(`[DEBUG PIANO ROLL] Current piano roll data:`, pianoRollData)
    console.log(`[DEBUG PIANO ROLL] Current sequencer step:`, currentStep)
    
    tracks.forEach(track => {
      const trackNotes = pianoRollData[track.id] || []
      console.log(`[DEBUG PIANO ROLL] Track ${track.name} (${track.id}) has ${trackNotes.length} notes`)
      
      trackNotes.forEach(note => {
        const noteStepInBar = (note.startStep - 1) % 16
        console.log(`[DEBUG PIANO ROLL] Note at step ${note.startStep} maps to sequencer step ${noteStepInBar}`)
      })
    })
    
    // Test step mapping for all steps 0-15
    console.log(`[DEBUG PIANO ROLL] Testing step mapping for all sequencer steps:`)
    for (let testStep = 0; testStep < 16; testStep++) {
      tracks.forEach(track => {
        const trackNotes = pianoRollData[track.id] || []
        const notesAtStep = trackNotes.filter(note => {
          const noteStepInBar = (note.startStep - 1) % 16
          return noteStepInBar === testStep
        })
        if (notesAtStep.length > 0) {
          console.log(`[DEBUG PIANO ROLL] Step ${testStep}: ${notesAtStep.length} notes for track ${track.name}`)
        }
      })
    }
    
    // Also test playing piano roll notes directly
    console.log(`[DEBUG PIANO ROLL] Testing direct piano roll playback...`)
    playPianoRollNotes()
  }, [pianoRollData, currentStep, tracks, playPianoRollNotes])

  // Function to set piano roll data from session
  const setPianoRollDataFromSession = useCallback((newPianoRollData: PianoRollData) => {
    setPianoRollData(newPianoRollData)
  }, [])

  // Function to clear piano roll data for a track
  const clearPianoRollData = useCallback((trackId: number) => {
    setPianoRollData(prev => {
      const newData = { ...prev }
      delete newData[trackId]
      return newData
    })
  }, [])

  return {
    sequencerData,
    pianoRollData,
    toggleStep,
    playSequence,
    stopSequence,
    isSequencePlaying,
    currentStep,
    updateTrackTempo,
    updateTrackPitch,
    setSequencerDataFromSession,
    setPianoRollDataFromSession,
    updatePianoRollData,
    clearAllPatterns,
    clearTrackPattern,
    clearPianoRollData,
    debugPianoRollPlayback
  }
} 