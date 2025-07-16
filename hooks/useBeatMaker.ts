import { useState, useEffect, useRef, useCallback } from 'react'
import * as Tone from 'tone'

export interface Track {
  id: number
  name: string
  audioUrl: string | null
  audioName?: string | null
  color: string
  mute?: boolean
  solo?: boolean
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
}

export interface MidiNote {
  id: string
  note: string
  startStep: number
  duration: number
  velocity: number
}

export interface SequencerData {
  [trackId: number]: boolean[]
}

export function useBeatMaker(tracks: Track[], steps: number, bpm: number) {
  const [sequencerData, setSequencerData] = useState<SequencerData>({})
  const [isSequencePlaying, setIsSequencePlaying] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const samplesRef = useRef<{ [key: string]: Tone.Player }>({})
  const pitchShiftersRef = useRef<{ [key: string]: Tone.PitchShift }>({})
  const playingSamplesRef = useRef<Set<Tone.Player>>(new Set())

  // Initialize sequencer data
  useEffect(() => {
    const newSequencerData: SequencerData = {}
    const currentTrackIds = tracks.map(track => track.id)
    
    // Handle all tracks - either create new or resize existing
    tracks.forEach(track => {
      const existingData = sequencerData[track.id]
      
      if (!existingData) {
        // New track - create fresh array
        newSequencerData[track.id] = new Array(steps).fill(false)
      } else if (existingData.length !== steps) {
        // Existing track but wrong length - resize array
        const resizedArray = new Array(steps).fill(false)
        // Copy existing data up to the minimum of old and new lengths
        const copyLength = Math.min(existingData.length, steps)
        for (let i = 0; i < copyLength; i++) {
          resizedArray[i] = existingData[i]
        }
        newSequencerData[track.id] = resizedArray
      } else {
        // Existing track with correct length - keep as is
        newSequencerData[track.id] = existingData
      }
    })
    
    // Only update if there are changes
    const hasChanges = tracks.some(track => {
      const existing = sequencerData[track.id]
      const newData = newSequencerData[track.id]
      return !existing || existing.length !== newData.length || JSON.stringify(existing) !== JSON.stringify(newData)
    }) || Object.keys(sequencerData).length !== Object.keys(newSequencerData).length
    
    if (hasChanges) {
      setSequencerData(newSequencerData)
    }
  }, [tracks, steps])

  // Update BPM
  useEffect(() => {
    Tone.Transport.bpm.value = bpm
  }, [bpm])

  // Load audio samples
  useEffect(() => {
    const loadSamples = async () => {
      // Clean up existing samples and pitch shifters
      Object.values(samplesRef.current).forEach(player => {
        try {
          if (player.state === 'started') {
            player.stop()
          }
          player.dispose()
        } catch (error) {
          console.warn('[DEBUG] Error disposing player:', error)
        }
      })
      Object.values(pitchShiftersRef.current).forEach(pitchShift => {
        try {
          pitchShift.dispose()
        } catch (error) {
          console.warn('[DEBUG] Error disposing pitch shifter:', error)
        }
      })
      samplesRef.current = {}
      pitchShiftersRef.current = {}

      // Load new samples
      for (const track of tracks) {
        if (track.audioUrl && track.audioUrl !== 'undefined') {
          try {
            console.log(`[DEBUG] Creating Tone.Player for track ${track.name} (id: ${track.id}) with audioUrl: ${track.audioUrl}`)
            
            // Create pitch shifter with high quality settings
            const pitchShift = new Tone.PitchShift({
              pitch: track.pitchShift || 0,
              windowSize: 0.1,     // Larger window for better quality
              delayTime: 0         // Minimize delay
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
    tracks.forEach(track => {
      const player = samplesRef.current[track.id]
      const shouldPlay = sequencerData[track.id]?.[step]
      const validAudio = track.audioUrl && track.audioUrl !== 'undefined'
      console.log(`[DEBUG] Step ${step} - Track ${track.name} (id: ${track.id}): shouldPlay=${shouldPlay}, playerLoaded=${player?.loaded}, audioUrl=${track.audioUrl}`)
      
      // Handle audio samples
      if (
        shouldPlay &&
        player &&
        player.loaded &&
        validAudio
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
  }, [tracks, sequencerData])

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
  }, [isSequencePlaying, bpm, tracks, sequencerData, steps])

  const stopSequence = useCallback(() => {
    setIsSequencePlaying(false)
    setCurrentStep(0)
    
    // Stop the sequencer interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    
    // Stop all currently playing samples with proper error handling
    playingSamplesRef.current.forEach(player => {
      try {
        if (player.state === 'started') {
          player.stop()
        }
      } catch (error) {
        console.warn('[DEBUG] Error stopping player:', error)
      }
    })
    playingSamplesRef.current.clear()
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

  return {
    sequencerData,
    toggleStep,
    playSequence,
    stopSequence,
    isSequencePlaying,
    currentStep,
    updateTrackTempo,
    updateTrackPitch
  }
} 