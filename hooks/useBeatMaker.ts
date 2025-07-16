import { useState, useEffect, useRef, useCallback } from 'react'
import * as Tone from 'tone'

export interface Track {
  id: number
  name: string
  audioUrl: string | null
  color: string
  mute?: boolean
  solo?: boolean
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
      // Clean up existing samples
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
      samplesRef.current = {}

      // Load new samples
      for (const track of tracks) {
        if (track.audioUrl && track.audioUrl !== 'undefined') {
          try {
            console.log(`[DEBUG] Creating Tone.Player for track ${track.name} (id: ${track.id}) with audioUrl: ${track.audioUrl}`)
            const player = new Tone.Player(track.audioUrl).toDestination()
            samplesRef.current[track.id] = player
            console.log(`[DEBUG] Created player for track ${track.name}`)
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

  return {
    sequencerData,
    toggleStep,
    playSequence,
    stopSequence,
    isSequencePlaying,
    currentStep
  }
} 