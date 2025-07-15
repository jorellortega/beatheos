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

  // Initialize sequencer data
  useEffect(() => {
    const initialData: SequencerData = {}
    tracks.forEach(track => {
      if (!sequencerData[track.id]) {
        initialData[track.id] = new Array(steps).fill(false)
      }
    })
    if (Object.keys(initialData).length > 0) {
      setSequencerData(prev => ({ ...prev, ...initialData }))
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
      Object.values(samplesRef.current).forEach(player => player.dispose())
      samplesRef.current = {}

      // Load new samples
      for (const track of tracks) {
        if (track.audioUrl && track.audioUrl !== 'undefined') {
          try {
            console.log(`[DEBUG] Creating Tone.Player for track ${track.name} (id: ${track.id}) with audioUrl: ${track.audioUrl}`)
            const player = new Tone.Player(track.audioUrl).toDestination()
            samplesRef.current[track.id] = player
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(samplesRef.current).forEach(player => player.dispose())
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  // Restart interval when BPM changes while playing
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
  }, [bpm, isSequencePlaying])

  const toggleStep = useCallback((trackId: number, stepIndex: number) => {
    setSequencerData(prev => ({
      ...prev,
      [trackId]: prev[trackId]?.map((value, index) => 
        index === stepIndex ? !value : value
      ) || new Array(steps).fill(false)
    }))
  }, [steps])

  const playStep = (step: number) => {
    setCurrentStep(step)
    // Play samples for this step
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
        player.start()
      }
    })
  }

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
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
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