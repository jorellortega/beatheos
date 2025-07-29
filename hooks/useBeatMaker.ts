import { useState, useEffect, useRef, useCallback } from 'react'
import * as Tone from 'tone'
import { PITCH_SHIFT_SETTINGS, createEnhancedPitchShifter, createProfessionalPitchShifter, getOptimalPitchSettings, createPitchShifter, applyPitchShiftWithEnhancement } from '@/lib/utils'

export interface Track {
  id: number
  name: string
  audioUrl: string | null
  audioName?: string | null
  audioFileId?: string | null // Add audio file ID for format detection
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
  // Genre and subgenre for individual track filtering
  genre?: string
  subgenre?: string
  // MIDI properties
  midiNotes?: MidiNote[]
  // Piano roll properties for audio tracks
  pianoRollNotes?: AudioNote[]
  // Stock sound for MIDI tracks
  stockSound?: any
  // Loop properties for quantization
  loopStartTime?: number
  loopEndTime?: number
  // Relative key indicator for visual feedback
  isRelativeKey?: boolean
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

export function useBeatMaker(tracks: Track[], steps: number, bpm: number, timeStretchMode: 'resampling' | 'flex-time' = 'resampling', gridDivision: number = 16) {
  const [sequencerData, setSequencerData] = useState<SequencerData>({})
  const [pianoRollData, setPianoRollData] = useState<PianoRollData>({})
  const [isSequencePlaying, setIsSequencePlaying] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | any>(null)
  const playheadRef = useRef<number>(0)
  const animationFrameRef = useRef<number | null>(null)
  const transportSyncRef = useRef<boolean>(false)
  const samplesRef = useRef<{ [key: string]: Tone.Player }>({})
  const pitchShiftersRef = useRef<{ [key: string]: Tone.PitchShift }>({})
  const playingSamplesRef = useRef<Set<Tone.Player>>(new Set())
  const trackPlayersRef = useRef<{ [trackId: number]: Tone.Player[] }>({})
  
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

  // Initialize sequencer data for new tracks or step count changes
  useEffect(() => {
    const newSequencerData: SequencerData = {}
    let hasChanges = false
    
    // Handle step count changes for existing tracks
    tracks.forEach(track => {
      const existingData = sequencerData[track.id]
      const originalData = originalSequencerDataRef.current[track.id]
      
      if (!existingData) {
        // New track - create fresh array
        newSequencerData[track.id] = new Array(steps).fill(false)
        hasChanges = true
        console.log(`[HOOK] Created new track ${track.name} (id: ${track.id}) with fresh sequencer data`)
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
        hasChanges = true
      } else {
        // Existing track with correct length - keep as is (don't clear patterns!)
        newSequencerData[track.id] = existingData
      }
    })
    
    // Only update if there are changes AND we're not in the middle of loading a pattern
    if (hasChanges && !isLoadingPatternRef.current) {
      console.log('[HOOK] Initializing sequencer data for new tracks/steps')
      setSequencerData(newSequencerData)
    } else if (isLoadingPatternRef.current) {
      console.log('[HOOK] Skipping initialization - pattern is being loaded')
    }
  }, [steps]) // Only depend on steps, not tracks

  // Update BPM
  useEffect(() => {
    Tone.Transport.bpm.value = bpm
  }, [bpm])

  // Load samples with improved pitch shifting
  useEffect(() => {
    const loadSamples = async () => {
      const Tone = await import('tone')
      
      // Only reload samples that have actually changed
      const tracksToLoad = tracks.filter(track => {
        if (!track.audioUrl || track.audioUrl === 'undefined') return false
        
        const existingPlayer = samplesRef.current[track.id]
        const existingPitchShifter = pitchShiftersRef.current[track.id]
        
        // Check if we need to reload this track
        const needsReload = !existingPlayer || 
                           !existingPitchShifter ||
                           (track.playbackRate !== undefined && Math.abs((existingPlayer.playbackRate || 1) - track.playbackRate) > 0.001) ||
                           (track.pitchShift !== undefined && Math.abs((existingPitchShifter.pitch || 0) - track.pitchShift) > 0.1) ||
                           (track.loopStartTime !== undefined && existingPlayer.loopStart !== track.loopStartTime) ||
                           (track.loopEndTime !== undefined && existingPlayer.loopEnd !== track.loopEndTime)
        
        if (needsReload) {
          console.log(`[AUDIO LOAD] Track ${track.name} needs reload:`, {
            hasPlayer: !!existingPlayer,
            hasPitchShifter: !!existingPitchShifter,
            playbackRateChanged: existingPlayer ? Math.abs((existingPlayer.playbackRate || 1) - (track.playbackRate || 1)) > 0.001 : false,
            pitchChanged: existingPitchShifter ? Math.abs((existingPitchShifter.pitch || 0) - (track.pitchShift || 0)) > 0.1 : false,
            loopPointsChanged: existingPlayer ? (existingPlayer.loopStart !== track.loopStartTime || existingPlayer.loopEnd !== track.loopEndTime) : false
          })
        }
        
        return needsReload
      })
      
      if (tracksToLoad.length === 0) {
        console.log('[AUDIO LOAD] No tracks need reloading')
        return
      }
      
      console.log(`[AUDIO LOAD] Reloading ${tracksToLoad.length} tracks`)
      
      // Clean up only the tracks that need reloading
      tracksToLoad.forEach(track => {
        const existingPlayer = samplesRef.current[track.id]
        const existingPitchShifter = pitchShiftersRef.current[track.id]
        
        if (existingPlayer) {
          try {
            if (existingPlayer.state === 'started') {
              existingPlayer.stop()
            }
            existingPlayer.dispose()
          } catch (error) {
            console.warn(`[AUDIO LOAD] Error disposing player for track ${track.name}:`, error)
          }
        }
        
        if (existingPitchShifter) {
          try {
            existingPitchShifter.dispose()
          } catch (error) {
            console.warn(`[AUDIO LOAD] Error disposing pitch shifter for track ${track.name}:`, error)
          }
        }
        
        // Remove from refs
        delete samplesRef.current[track.id]
        delete pitchShiftersRef.current[track.id]
      })

      // Load only the tracks that need reloading
      for (const track of tracksToLoad) {
        if (track.audioUrl && track.audioUrl !== 'undefined') {
          try {
            console.log(`[AUDIO LOAD] Creating Tone.Player for track ${track.name} (id: ${track.id})`)
            
            // Special debugging for Percussion Loop
            if (track.name === 'Perc' || track.name === 'Percussion Loop') {
              console.log(`[PERC LOAD] Loading Percussion Loop: audioUrl=${track.audioUrl}, loopStartTime=${track.loopStartTime}, loopEndTime=${track.loopEndTime}`)
            }
            
            // Create pitch shifter using different techniques based on pitch amount
            const pitchAmount = Math.abs(track.pitchShift || 0)
            const pitchShifterConfig = createPitchShifter('auto', track.pitchShift || 0)
            
            let pitchShift: any
            let player: any
            
            if (pitchShifterConfig.type === 'playback-rate') {
              // Use simple playback rate for small pitch changes (most natural)
              player = new Tone.Player(track.audioUrl)
              player.playbackRate = (pitchShifterConfig.settings as any).playbackRate
              player.toDestination()
              pitchShiftersRef.current[track.id] = player // Store player as pitch shifter for consistency
            } else if (pitchShifterConfig.type === 'granular') {
              // For large pitch shifts, use a combination of techniques
              player = new Tone.Player(track.audioUrl)
              
              // Create a pitch shifter with very conservative settings
              pitchShift = new Tone.PitchShift({
                pitch: track.pitchShift || 0,
                windowSize: 0.05,
                delayTime: 0.001,
                feedback: 0.02
              })
              
              // Add subtle compression to smooth out artifacts
              const compressor = new Tone.Compressor({
                threshold: -20,
                ratio: 2,
                attack: 0.005,
                release: 0.1
              })
              
              // Create processing chain: Player -> PitchShift -> Compressor -> Destination
              pitchShift.chain(compressor, Tone.Destination)
              pitchShiftersRef.current[track.id] = pitchShift
              player.connect(pitchShift)
            } else {
              // Default phase vocoder approach
              pitchShift = new Tone.PitchShift({
                pitch: track.pitchShift || 0,
                windowSize: pitchShifterConfig.settings.windowSize,
                delayTime: pitchShifterConfig.settings.delayTime,
                feedback: pitchShifterConfig.settings.feedback
              })
              
              // For medium pitch shifts, add subtle processing
              if (pitchAmount > 5) {
                const compressor = new Tone.Compressor({
                  threshold: -24,
                  ratio: 3,
                  attack: 0.001,
                  release: 0.1
                })
                
                const eq = new Tone.EQ3({
                  low: 0,
                  mid: 0,
                  high: 0
                })
                
                pitchShift.chain(compressor, eq, Tone.Destination)
              } else {
                pitchShift.toDestination()
              }
              
              pitchShiftersRef.current[track.id] = pitchShift
              player = new Tone.Player(track.audioUrl).connect(pitchShift)
            }
            
                        // Apply loop start/end points if specified (from quantization)
            if (track.loopStartTime !== undefined && track.loopEndTime !== undefined) {
              player.loopStart = track.loopStartTime
              player.loopEnd = track.loopEndTime
              player.loop = true // Enable looping
              
              // Special debugging for Percussion Loop
              if (track.name === 'Perc' || track.name === 'Percussion Loop') {
                console.log(`[PERC LOOP SET] Percussion Loop loop points set: start=${track.loopStartTime}s, end=${track.loopEndTime}s`)
              }
              
              // Calculate loop and sequencer durations for reference
              const loopDuration = track.loopEndTime - track.loopStartTime
              const secondsPerBeat = 60 / bpm
              const stepDuration = secondsPerBeat / (gridDivision / 4)
              const sequencerDuration = steps * stepDuration // Total sequencer duration (8 bars)
              
              console.log(`[AUDIO LOAD] Loop timing for ${track.name}: loop=${loopDuration.toFixed(2)}s, sequencer=${sequencerDuration.toFixed(2)}s, ratio=${(loopDuration/sequencerDuration).toFixed(3)}`)
              
              // Store sequencer duration for boundary synchronization
              player._sequencerDuration = sequencerDuration
              player._loopDuration = loopDuration
              
              // Always extend loops to fill the sequencer duration, but handle differently based on playback rate
              const loopRepeatCount = Math.ceil(sequencerDuration / loopDuration)
              const adjustedLoopEnd = track.loopStartTime + (loopDuration * loopRepeatCount)
              
              // Set the loop to repeat enough times to fill the sequencer duration
              player.loopEnd = adjustedLoopEnd
              
              if (track.playbackRate && track.playbackRate !== 1.0) {
                // If playback rate is not 1.0, the loop is being stretched
                console.log(`[AUDIO LOAD] Set loop points for track ${track.name}: start=${track.loopStartTime}s, end=${adjustedLoopEnd.toFixed(2)}s, repeats=${loopRepeatCount}x, loop enabled (stretched to fill sequencer)`)
              } else {
                // If playback rate is 1.0, the loop is repeating naturally
                console.log(`[AUDIO LOAD] Set loop points for track ${track.name}: start=${track.loopStartTime}s, end=${adjustedLoopEnd.toFixed(2)}s, repeats=${loopRepeatCount}x, loop enabled (natural speed, repeating)`)
              }
            } else {
              // Special debugging for Percussion Loop without loop points
              if (track.name === 'Perc' || track.name === 'Percussion Loop') {
                console.log(`[PERC NO LOOP] Percussion Loop has no loop points: loopStartTime=${track.loopStartTime}, loopEndTime=${track.loopEndTime}`)
              }
            }
            
            // Apply playback rate if specified
            if (track.playbackRate && track.playbackRate !== 1) {
              player.playbackRate = track.playbackRate
              console.log(`[AUDIO LOAD] Set playback rate for track ${track.name} to ${track.playbackRate}`)
            }
            
            // Apply pitch shift based on time stretch mode and pitch shifter type
            if (timeStretchMode === 'flex-time') {
              // In flex-time mode, keep pitch shift at 0 to maintain original pitch
              if (pitchShifterConfig.type === 'playback-rate') {
                player.playbackRate = 1.0
              } else if (pitchShift) {
                pitchShift.pitch = 0
              }
              console.log(`[AUDIO LOAD] FT mode: Set pitch shift to 0 to maintain original pitch for track ${track.name}`)
            } else {
              // In resampling mode, apply the track's pitch shift
              if (track.pitchShift && track.pitchShift !== 0) {
                if (pitchShifterConfig.type === 'playback-rate') {
                  player.playbackRate = (pitchShifterConfig.settings as any).playbackRate
                } else if (pitchShift) {
                  pitchShift.pitch = track.pitchShift
                }
                console.log(`[AUDIO LOAD] RM mode: Set pitch shift for track ${track.name} to ${track.pitchShift} semitones`)
              } else {
                if (pitchShifterConfig.type === 'playback-rate') {
                  player.playbackRate = 1.0
                } else if (pitchShift) {
                  pitchShift.pitch = 0
                }
                console.log(`[AUDIO LOAD] RM mode: No pitch shift applied for track ${track.name}`)
              }
            }
            
            // Store the pitch shifter type for later updates
            if (pitchShifterConfig.type === 'playback-rate') {
              player._pitchShifterType = 'playback-rate'
            } else if (pitchShift) {
              pitchShift._pitchShifterType = 'phase-vocoder'
            }
            
            samplesRef.current[track.id] = player
            console.log(`[AUDIO LOAD] Successfully created player for track ${track.name}`)
          } catch (error) {
            console.error(`[AUDIO LOAD] Failed to load audio for track ${track.id}:`, error)
          }
        } else {
          console.log(`[AUDIO LOAD] Skipping Tone.Player for track ${track.name} (id: ${track.id}) - audioUrl is invalid:`, track.audioUrl)
        }
      }
    }

    loadSamples()
  }, [tracks, timeStretchMode])

  // Real-time playhead update function synchronized with Transport
  const updatePlayhead = useCallback((step: number) => {
    // Update ref immediately for real-time access
    playheadRef.current = step
    
    // Use requestAnimationFrame for smooth visual updates
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    
    animationFrameRef.current = requestAnimationFrame(() => {
      setCurrentStep(step)
    })
  }, [])

  // Function to get current step from Transport position
  const getCurrentStepFromTransport = useCallback(async () => {
    const Tone = await import('tone')
    const transportPosition = Tone.Transport.position as number
    const secondsPerBeat = 60 / bpm
    const stepDuration = secondsPerBeat / (gridDivision / 4)
    
    // Convert transport position to step number
    const currentStep = Math.floor(transportPosition / stepDuration) % steps
    return currentStep
  }, [bpm, steps, gridDivision])

  // Real-time Transport-synchronized playhead update
  const updatePlayheadFromTransport = useCallback(() => {
    if (!transportSyncRef.current) return
    
    getCurrentStepFromTransport().then(step => {
      if (step !== playheadRef.current) {
        playheadRef.current = step
        setCurrentStep(step)
        
        // Check if we need to restart loops at pattern boundary
        if (step === 0) {
          restartAllLoopsAtPatternBoundary()
        }
      }
    }).catch(console.error)
    
    // Continue the animation loop
    animationFrameRef.current = requestAnimationFrame(updatePlayheadFromTransport)
  }, [getCurrentStepFromTransport])

  // Function to restart all loops at the pattern boundary (8 bars)
  const restartAllLoopsAtPatternBoundary = useCallback(() => {
    console.log('[PATTERN BOUNDARY] Checking loops at 8-bar boundary')
    
    tracks.forEach(track => {
      const player = samplesRef.current[track.id]
      if (!player || !player.loaded || !track.audioUrl || track.audioUrl === 'undefined') return
      
      // Only handle tracks with loop points that are currently playing
      if (track.loopStartTime !== undefined && track.loopEndTime !== undefined && player.state === 'started') {
        const loopDuration = track.loopEndTime - track.loopStartTime
        const playbackRate = track.playbackRate || 1.0
        const actualDuration = loopDuration / playbackRate
        
        // Calculate sequencer duration
        const secondsPerBeat = 60 / bpm
        const stepDuration = secondsPerBeat / (gridDivision / 4)
        const sequencerDuration = steps * stepDuration
        
        console.log(`[PATTERN BOUNDARY DEBUG] Track ${track.name}: loop=${loopDuration.toFixed(2)}s, rate=${playbackRate.toFixed(2)}x, actual=${actualDuration.toFixed(2)}s, sequencer=${sequencerDuration.toFixed(2)}s`)
        
        // Check if the loop is extended to fill the sequencer duration
        // Compare the actual loop end time with the original loop end time
        const currentLoopEnd = player.loopEnd
        const isExtendedLoop = currentLoopEnd && 
          (typeof currentLoopEnd === 'number' ? currentLoopEnd > track.loopEndTime : 
           typeof currentLoopEnd === 'string' ? parseFloat(currentLoopEnd) > track.loopEndTime : false)
        
        if (isExtendedLoop) {
          // This is an extended loop that should continue seamlessly
          console.log(`[PATTERN BOUNDARY] Track ${track.name} has extended loop - letting it continue seamlessly`)
          
          // Special debugging for Percussion Loop
          if (track.name === 'Perc' || track.name === 'Percussion Loop') {
            console.log(`[PERC PATTERN BOUNDARY] Percussion Loop extended - continuing seamlessly`)
          }
        } else {
          // This is a short loop that needs to restart
          console.log(`[PATTERN BOUNDARY] Restarting short loop for track ${track.name}`)
          
          // Special debugging for Percussion Loop
          if (track.name === 'Perc' || track.name === 'Percussion Loop') {
            console.log(`[PERC PATTERN BOUNDARY] Restarting Percussion Loop at pattern boundary`)
          }
          
          // Stop the current loop
          player.stop()
          
          // Start the loop again from the beginning
          const startTime = Tone.now()
          player.start(startTime, track.loopStartTime)
        }
      }
    })
  }, [tracks, bpm, steps, gridDivision])

  // Function to force stop all loops (for manual control)
  const stopAllLoops = useCallback(() => {
    console.log('[MANUAL STOP] Stopping all loops')
    
    tracks.forEach(track => {
      const player = samplesRef.current[track.id]
      if (!player || !player.loaded || !track.audioUrl || track.audioUrl === 'undefined') return
      
      if (track.loopStartTime !== undefined && track.loopEndTime !== undefined && player.state === 'started') {
        console.log(`[MANUAL STOP] Stopping loop for track ${track.name}`)
        player.stop()
      }
    })
  }, [tracks])

  // Debug function to log the current state of all loops
  const debugLoopStates = useCallback(() => {
    console.log('[LOOP STATES DEBUG] Current state of all loops:')
    
    tracks.forEach(track => {
      const player = samplesRef.current[track.id]
      if (!player || !player.loaded || !track.audioUrl || track.audioUrl === 'undefined') return
      
      if (track.loopStartTime !== undefined && track.loopEndTime !== undefined) {
        const loopDuration = track.loopEndTime - track.loopStartTime
        const playbackRate = track.playbackRate || 1.0
        const actualDuration = loopDuration / playbackRate
        const currentLoopEnd = player.loopEnd
        const isExtended = currentLoopEnd && 
          (typeof currentLoopEnd === 'number' ? currentLoopEnd > track.loopEndTime : 
           typeof currentLoopEnd === 'string' ? parseFloat(currentLoopEnd) > track.loopEndTime : false)
        
        console.log(`[LOOP STATES] Track ${track.name}: state=${player.state}, loop=${loopDuration.toFixed(2)}s, rate=${playbackRate.toFixed(2)}x, actual=${actualDuration.toFixed(2)}s, extended=${isExtended}, loopEnd=${currentLoopEnd}`)
      }
    })
  }, [tracks])

  // Define playStep function first
  const playStep = useCallback((step: number) => {
    // Update playhead immediately for real-time response
    updatePlayhead(step)
    
    console.log(`[PLAYSTEP] Step ${step}/${steps} (${((step / steps) * 100).toFixed(1)}% through pattern)`)
    
    // Debug: Track which loops are playing at each step
    const playingLoops: string[] = []
    const stoppedLoops: string[] = []
    
          tracks.forEach(track => {
        const player = samplesRef.current[track.id]
        const shouldPlay = sequencerData[track.id]?.[step]
        const validAudio = track.audioUrl && track.audioUrl !== 'undefined'
        
        // Debug: Track loop state for this track
        const hasLoop = track.loopStartTime !== undefined && track.loopEndTime !== undefined
        const loopDuration = hasLoop && track.loopStartTime !== undefined && track.loopEndTime !== undefined 
          ? track.loopEndTime - track.loopStartTime : 0
        const playbackRate = track.playbackRate || 1.0
        const actualLoopDuration = loopDuration / playbackRate
        
        if (hasLoop) {
          console.log(`[LOOP DEBUG] Track ${track.name}: loop=${loopDuration.toFixed(2)}s, rate=${playbackRate.toFixed(2)}x, actual=${actualLoopDuration.toFixed(2)}s`)
        }
        
        // Special debugging for Percussion Loop
        if (track.name === 'Perc' || track.name === 'Percussion Loop') {
          console.log(`[PERC DEBUG] Step ${step}: Track ${track.name} - shouldPlay=${shouldPlay}, playerState=${player?.state}, hasLoop=${hasLoop}`)
          console.log(`[PERC DEBUG] Track details: loopStartTime=${track.loopStartTime}, loopEndTime=${track.loopEndTime}, audioUrl=${track.audioUrl}`)
        }
        
        // Handle audio samples (main sequencer pattern)
        if (
          shouldPlay &&
          player &&
          player.loaded &&
          validAudio
        ) {
        // If track is muted, stop any playing loops
        if (track.mute) {
          if (player.state === 'started') {
            player.stop()
            console.log(`[DEBUG] Stopped loop for muted track ${track.name}`)
          }
          return
        }
        console.log(`[DEBUG] Playing sample for track ${track.name} at step ${step}`)
        
        try {
          // For tracks with loop points, we need to handle them differently
          if (track.loopStartTime !== undefined && track.loopEndTime !== undefined) {
            // For looping tracks, we only start once and let it loop continuously
            if (step === 0) {
              // Start the loop from the quantized start position on first step
              const startTime = Tone.now()
              player.start(startTime, track.loopStartTime)
              console.log(`[LOOP START] Started loop for track ${track.name} at loop start: ${track.loopStartTime}s`)
              
              // Special debugging for Percussion Loop
              if (track.name === 'Perc' || track.name === 'Percussion Loop') {
                console.log(`[PERC START] Percussion Loop started at step ${step}, player state: ${player.state}`)
              }
              
              // Debug loop timing
              debugLoopTiming(track)
              
              // Track that this loop is now playing
              playingLoops.push(track.name)
            } else {
              // For subsequent steps, just ensure the loop is still playing
              // But don't restart if it's already playing - let it continue naturally
              if (player.state !== 'started') {
                console.log(`[LOOP RESTART] Restarting loop for track ${track.name} at step ${step}`)
                const startTime = Tone.now()
                player.start(startTime, track.loopStartTime)
                
                // Special debugging for Percussion Loop
                if (track.name === 'Perc' || track.name === 'Percussion Loop') {
                  console.log(`[PERC RESTART] Percussion Loop restarted at step ${step}, player state: ${player.state}`)
                }
                
                playingLoops.push(track.name)
              } else {
                // Loop is still playing
                playingLoops.push(track.name)
                
                // Special debugging for Percussion Loop
                if (track.name === 'Perc' || track.name === 'Percussion Loop') {
                  console.log(`[PERC CONTINUE] Percussion Loop continuing at step ${step}, player state: ${player.state}`)
                }
              }
            }
            
            // Always extend loops to fill the sequencer duration, but handle differently based on playback rate
            const loopDuration = track.loopEndTime - track.loopStartTime
            const secondsPerBeat = 60 / bpm
            const stepDuration = secondsPerBeat / (gridDivision / 4)
            const sequencerDuration = steps * stepDuration
            
            const loopRepeatCount = Math.ceil(sequencerDuration / loopDuration)
            const adjustedLoopEnd = track.loopStartTime + (loopDuration * loopRepeatCount)
            
            // Debug: Log loop extension details
            console.log(`[LOOP EXTEND DEBUG] Track ${track.name}: original=${loopDuration.toFixed(2)}s, sequencer=${sequencerDuration.toFixed(2)}s, repeats=${loopRepeatCount}, adjusted=${adjustedLoopEnd.toFixed(2)}s`)
            
            // Update the player's loop end point to ensure it plays for the full sequencer duration
            if (player.loopEnd !== adjustedLoopEnd) {
              player.loopEnd = adjustedLoopEnd
              
              if (track.playbackRate && track.playbackRate !== 1.0) {
                console.log(`[LOOP EXTEND] Extended loop for track ${track.name} to ${adjustedLoopEnd.toFixed(2)}s (${loopRepeatCount}x repeats, stretched)`)
              } else {
                console.log(`[LOOP EXTEND] Extended loop for track ${track.name} to ${adjustedLoopEnd.toFixed(2)}s (${loopRepeatCount}x repeats, natural speed)`)
              }
            }
          } else {
            // For non-looping tracks, restart each time
            if (player.state === 'started') {
              player.stop()
            }
            
            // Start the sample with precise timing to ensure perfect sync
            const startTime = Tone.now() + 0.001 // 1ms offset
            
            // Ensure the playback rate is still correctly set
            if (track.playbackRate && track.playbackRate !== 1) {
              const precisePlaybackRate = Math.round(track.playbackRate * 10000) / 10000
              player.playbackRate = precisePlaybackRate
            }
            
            player.start(startTime)
          }
          
          // Track the playing sample for cleanup
          playingSamplesRef.current.add(player)
          
          // Set up cleanup when sample stops (Tone.js way)
          player.onstop = () => {
            playingSamplesRef.current.delete(player)
            console.log(`[LOOP STOPPED] Track ${track.name} stopped playing`)
            
            // Special debugging for Percussion Loop
            if (track.name === 'Perc' || track.name === 'Percussion Loop') {
              console.log(`[PERC STOPPED] Percussion Loop stopped playing at step ${step}`)
            }
            
            stoppedLoops.push(track.name)
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
        
        // Only stop players that are currently playing to prevent overlap
        if (trackPlayersRef.current[track.id]) {
          trackPlayersRef.current[track.id].forEach(player => {
            try {
              if (player.state === 'started') {
                player.stop()
              }
            } catch (error) {
              console.warn('Error stopping existing player:', error)
            }
          })
        }
        
        pianoRollNotesAtStep.forEach(note => {
          try {
            // Create a new player for this specific note to avoid conflicts
            const notePlayer = new Tone.Player(track.audioUrl!)
            
            // Create a pitch shifter for this note
            const notePitchShifter = new Tone.PitchShift({
              pitch: note.pitchShift,
              windowSize: 0.1,    // Smaller window for better quality
              delayTime: 0.001,   // Smaller delay for better quality
              feedback: 0.05      // Smaller feedback for stability
            }).toDestination()
            
            // Connect player to pitch shifter
            notePlayer.connect(notePitchShifter)
            
            // Track this player for this track
            if (!trackPlayersRef.current[track.id]) {
              trackPlayersRef.current[track.id] = []
            }
            trackPlayersRef.current[track.id].push(notePlayer)
            
            // Load and play the note with pitch shifting
            notePlayer.load(track.audioUrl!).then(() => {
              // Track the playing sample for cleanup
              playingSamplesRef.current.add(notePlayer)
              
              // Start the sample immediately (in sync with sequencer step)
              notePlayer.start()
              
              console.log(`[DEBUG] Successfully played piano roll note ${note.note} with pitch shift ${note.pitchShift} for track ${track.name} at step ${step}`)
              
              // Clean up after playback
              const cleanup = () => {
                try {
                  notePlayer.stop()
                  notePlayer.disconnect()
                  notePitchShifter.disconnect()
                  notePlayer.dispose()
                  notePitchShifter.dispose()
                  playingSamplesRef.current.delete(notePlayer)
                  
                  // Remove from track players array
                  if (trackPlayersRef.current[track.id]) {
                    const index = trackPlayersRef.current[track.id].indexOf(notePlayer)
                    if (index > -1) {
                      trackPlayersRef.current[track.id].splice(index, 1)
                    }
                  }
                } catch (error) {
                  console.warn('Error during cleanup:', error)
                }
              }
              
              // Set up cleanup when player stops
              notePlayer.onstop = cleanup
              
              // Cleanup after the audio duration or 1.5 seconds, whichever is longer
              const audioDuration = notePlayer.buffer ? notePlayer.buffer.duration : 1.5
              setTimeout(cleanup, Math.max(audioDuration * 1000, 1500))
            }).catch((error) => {
              console.warn(`[DEBUG] Error loading audio for piano roll note:`, error)
            })
            
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
    
    // Debug: Log summary of loop states for this step
    if (playingLoops.length > 0 || stoppedLoops.length > 0) {
      console.log(`[STEP ${step} SUMMARY] Playing: [${playingLoops.join(', ')}], Stopped: [${stoppedLoops.join(', ')}]`)
    }
    
    // Debug loop states every 8 steps (every 2 bars)
    if (step % 8 === 0) {
      debugLoopStates()
    }
  }, [tracks, sequencerData, pianoRollData, debugLoopStates])

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
      
      // Dispose all track players
      Object.values(trackPlayersRef.current).flat().forEach(player => {
        try {
          if (player.state === 'started') {
            player.stop()
          }
          player.disconnect()
          player.dispose()
        } catch (error) {
          console.warn('Error disposing track player:', error)
        }
      })
      trackPlayersRef.current = {}
      
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
    
    console.log(`[SEQUENCER START] Starting sequencer with ${tracks.length} tracks, ${steps} steps, ${bpm} BPM`)
    
    // Debug: Log all tracks with loops
    tracks.forEach(track => {
      if (track.loopStartTime !== undefined && track.loopEndTime !== undefined) {
        const loopDuration = track.loopEndTime - track.loopStartTime
        const playbackRate = track.playbackRate || 1.0
        const actualDuration = loopDuration / playbackRate
        console.log(`[SEQUENCER DEBUG] Track ${track.name}: loop=${loopDuration.toFixed(2)}s, rate=${playbackRate.toFixed(2)}x, actual=${actualDuration.toFixed(2)}s`)
      }
    })
    
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // Use Tone.js Transport for precise timing
    const setupToneSequencer = async () => {
      const Tone = await import('tone')
      
      // Set the BPM for Tone.js Transport
      Tone.Transport.bpm.value = bpm
      
      // Calculate step duration based on grid division (like loop editor)
      const secondsPerBeat = 60 / bpm
      const stepDuration = secondsPerBeat / (gridDivision / 4)
      
      console.log(`[SEQUENCER SETUP] BPM: ${bpm}, Step duration: ${stepDuration}s, Steps: ${steps}`)
      
      // Create a sequence that loops perfectly
      const sequence = new Tone.Sequence((time, step) => {
        console.log(`[TONE SEQUENCER] Step: ${step} at time ${time}`)
        // Only trigger audio playback, let Transport handle playhead
        playStep(step)
      }, Array.from({ length: steps }, (_, i) => i), stepDuration)
      
      // Start the sequence with proper looping
      sequence.start(0)
      Tone.Transport.loop = true
      Tone.Transport.loopStart = 0
      Tone.Transport.loopEnd = steps * stepDuration
      Tone.Transport.start()
      
      console.log(`[SEQUENCER SETUP] Started sequence with loop: ${Tone.Transport.loopStart}s to ${Tone.Transport.loopEnd}s`)
      
      // Start Transport-synchronized playhead updates
      transportSyncRef.current = true
      updatePlayheadFromTransport()
      
      // Store the sequence for cleanup
      intervalRef.current = sequence as any
    }

    setupToneSequencer()

    return () => {
      // Cleanup function
      if (intervalRef.current) {
        const Tone = require('tone')
        if (intervalRef.current instanceof Tone.Sequence) {
          intervalRef.current.stop()
          intervalRef.current.dispose()
        } else {
          clearInterval(intervalRef.current)
        }
        intervalRef.current = null
      }
    }
  }, [bpm, isSequencePlaying, playStep, steps, gridDivision])

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

    // The actual sequencer setup is handled by the useEffect above
    // This function just starts the playback state
  }, [isSequencePlaying])

  // Function to play piano roll notes independently - TEMPO SYNCED VERSION
  const playPianoRollNotes = useCallback(async () => {
    console.log(`[PIANO ROLL PLAYBACK] Starting piano roll playback at ${bpm} BPM`)
    console.log(`[PIANO ROLL PLAYBACK] Full piano roll data:`, pianoRollData)
    
    // Calculate timing based on BPM and grid division
    const secondsPerBeat = 60 / bpm
    const stepDuration = secondsPerBeat / (gridDivision / 4)
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
        // Calculate when this note should play based on its step position and grid division
        const stepsPerBar = gridDivision // Each bar has gridDivision steps
        const noteStepInBar = (note.startStep - 1) % stepsPerBar // Convert to 0-based step
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
    playheadRef.current = 0
    
    // Stop Transport-synchronized playhead updates
    transportSyncRef.current = false
    
    // Cancel any pending animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    
    // Stop the Tone.js sequence
    if (intervalRef.current) {
      const Tone = require('tone')
      if (intervalRef.current instanceof Tone.Sequence) {
        intervalRef.current.stop()
        intervalRef.current.dispose()
        console.log('[STOP SEQUENCE] Tone.js Sequence stopped and disposed')
      } else {
        clearInterval(intervalRef.current)
      }
      intervalRef.current = null
    }
    
    // Stop ALL samples from ALL tracks, not just the ones tracked in playingSamplesRef
    // This ensures long samples that are still playing get stopped
    Object.values(samplesRef.current).forEach(player => {
      try {
        if (player && player.state === 'started') {
          // Find which track this player belongs to
          const trackId = Object.keys(samplesRef.current).find(key => samplesRef.current[parseInt(key)] === player)
          const track = tracks.find(t => t.id === parseInt(trackId || '0'))
          
          console.log(`[STOP SEQUENCE] Stopping player that was still playing: ${track?.name || 'Unknown track'}`)
          
          // Special debugging for Percussion Loop
          if (track?.name === 'Perc' || track?.name === 'Percussion Loop') {
            console.log(`[PERC STOP SEQUENCE] Stopping Percussion Loop player at step ${currentStep}`)
          }
          
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
    
    // Stop all track players (piano roll notes)
    Object.values(trackPlayersRef.current).flat().forEach(player => {
      try {
        if (player.state === 'started') {
          player.stop()
        }
      } catch (error) {
        console.warn('[DEBUG] Error stopping track player:', error)
      }
    })
    trackPlayersRef.current = {}
    
    console.log('[STOP SEQUENCE] All samples stopped')
    
    // Stop Tone.js Transport and disable looping
    import('tone').then(Tone => {
      Tone.Transport.stop()
      Tone.Transport.loop = false // Disable looping when stopping
      console.log('[STOP SEQUENCE] Tone.js Transport stopped and loop disabled')
    }).catch(console.warn)
  }, [])

  // Function to update track tempo and recalculate playback rate
  const updateTrackTempo = useCallback((trackId: number, newBpm: number, originalBpm?: number) => {
    const track = tracks.find(t => t.id === trackId)
    if (!track) return

    // Use provided originalBpm or default to 120 if not set
    const baseBpm = originalBpm || track.originalBpm || 120
    const playbackRate = newBpm / baseBpm

    console.log(`[TEMPO UPDATE] Track: ${track.name}`)
    console.log(`[TEMPO UPDATE] Original BPM: ${baseBpm}`)
    console.log(`[TEMPO UPDATE] New BPM: ${newBpm}`)
    console.log(`[TEMPO UPDATE] Playback Rate: ${playbackRate.toFixed(3)}`)

    // Update the player's playback rate if it exists
    const player = samplesRef.current[trackId]
    if (player) {
      // Stop the player first if it's playing to prevent timing issues
      if (player.state === 'started') {
        player.stop()
      }
      
      // Apply the new playback rate
      player.playbackRate = playbackRate
      console.log(`[DEBUG] Updated playback rate for track ${track.name} to ${playbackRate} (${newBpm}/${baseBpm})`)
      
      // Force a small delay to ensure the playback rate change takes effect
      setTimeout(() => {
        console.log(`[TEMPO UPDATE] Playback rate change applied for ${track.name}`)
      }, 10)
    }

    return {
      originalBpm: baseBpm,
      currentBpm: newBpm,
      playbackRate: playbackRate
    }
  }, [tracks])

  // Function to get real-time playhead position
  const getCurrentPlayheadPosition = useCallback(() => {
    return playheadRef.current
  }, [])

  // Function to debug loop timing for a track
  const debugLoopTiming = useCallback((track: any) => {
    if (!track.loopStartTime || !track.loopEndTime) {
      console.log(`[LOOP DEBUG] Track ${track.name}: No loop points set`)
      return
    }
    
    const loopDuration = track.loopEndTime - track.loopStartTime
    const secondsPerBeat = 60 / bpm
    const stepDuration = secondsPerBeat / (gridDivision / 4)
    const sequencerDuration = steps * stepDuration
    
    console.log(`[LOOP DEBUG] Track ${track.name}:`)
    console.log(`  - Loop: ${track.loopStartTime.toFixed(2)}s to ${track.loopEndTime.toFixed(2)}s (${loopDuration.toFixed(2)}s)`)
    console.log(`  - Sequencer: ${sequencerDuration.toFixed(2)}s (${steps} steps × ${stepDuration.toFixed(3)}s)`)
    console.log(`  - Ratio: ${(loopDuration/sequencerDuration).toFixed(3)}`)
    console.log(`  - Playback rate: ${track.playbackRate || 1.0}`)
    
    const player = samplesRef.current[track.id]
    if (player) {
      console.log(`  - Player loaded: ${player.loaded}`)
      console.log(`  - Player state: ${player.state}`)
      console.log(`  - Player loop: ${player.loop}`)
      console.log(`  - Player loopStart: ${player.loopStart}`)
      console.log(`  - Player loopEnd: ${player.loopEnd}`)
      console.log(`  - Player playbackRate: ${player.playbackRate}`)
    }
  }, [bpm, steps, gridDivision])

  // Function to force reload samples for a specific track with improved sync
  const forceReloadTrackSamples = useCallback(async (trackId: number) => {
    const track = tracks.find(t => t.id === trackId)
    if (!track || !track.audioUrl) {
      console.warn(`[FORCE RELOAD] No track or audio URL found for trackId: ${trackId}`)
      return
    }

    const Tone = await import('tone')
    
    // Clean up existing sample for this track
    const existingPlayer = samplesRef.current[trackId]
    if (existingPlayer) {
      try {
        if (existingPlayer.state === 'started') {
          existingPlayer.stop()
          console.log(`[FORCE RELOAD] Stopped existing player for track ${track.name}`)
        }
        existingPlayer.dispose()
        console.log(`[FORCE RELOAD] Disposed existing player for track ${track.name}`)
      } catch (error) {
        console.warn(`[FORCE RELOAD] Error disposing existing player for track ${track.name}:`, error)
      }
    }
    
    const existingPitchShifter = pitchShiftersRef.current[trackId]
    if (existingPitchShifter) {
      try {
        existingPitchShifter.dispose()
        console.log(`[FORCE RELOAD] Disposed existing pitch shifter for track ${track.name}`)
      } catch (error) {
        console.warn(`[FORCE RELOAD] Error disposing existing pitch shifter for track ${track.name}:`, error)
      }
    }

    try {
      console.log(`[FORCE RELOAD] Reloading sample for track ${track.name} with playback rate ${track.playbackRate}`)
      console.log(`[FORCE RELOAD] Original BPM: ${track.originalBpm}, Current BPM: ${track.currentBpm}`)
      console.log(`[FORCE RELOAD] Time stretch mode: ${timeStretchMode}`)
      console.log(`[FORCE RELOAD] ${timeStretchMode === 'resampling' ? 'RM: Changing pitch & speed' : 'FT: Changing speed only, keeping original pitch'}`)
      
      // Create new pitch shifter
      const pitchShift = new Tone.PitchShift({
        pitch: track.pitchShift || 0,
        windowSize: PITCH_SHIFT_SETTINGS.windowSize,
        delayTime: PITCH_SHIFT_SETTINGS.delayTime,
        feedback: PITCH_SHIFT_SETTINGS.feedback
      }).toDestination()
      pitchShiftersRef.current[trackId] = pitchShift
      
      // Create new player with correct playback rate
      const player = new Tone.Player(track.audioUrl).connect(pitchShift)
      
      // Apply playback rate with high precision
      if (track.playbackRate && track.playbackRate !== 1) {
        // Round to 4 decimal places to avoid floating point precision issues
        const precisePlaybackRate = Math.round(track.playbackRate * 10000) / 10000
        player.playbackRate = precisePlaybackRate
        console.log(`[FORCE RELOAD] Set precise playback rate for track ${track.name} to ${precisePlaybackRate}`)
      } else {
        // Ensure playback rate is reset to 1.0 if no rate is specified
        player.playbackRate = 1.0
        console.log(`[FORCE RELOAD] Reset playback rate for track ${track.name} to 1.0`)
      }
      
      // Apply pitch shift based on time stretch mode
      if (timeStretchMode === 'flex-time') {
        // In flex-time mode, keep pitch shift at 0 to maintain original pitch
        pitchShift.pitch = 0
        console.log(`[FORCE RELOAD] FT mode: Set pitch shift to 0 to maintain original pitch for track ${track.name}`)
      } else {
        // In resampling mode, apply the track's pitch shift
        if (track.pitchShift && track.pitchShift !== 0) {
          pitchShift.pitch = track.pitchShift
          console.log(`[FORCE RELOAD] RM mode: Set pitch shift for track ${track.name} to ${track.pitchShift} semitones`)
        } else {
          pitchShift.pitch = 0
          console.log(`[FORCE RELOAD] RM mode: No pitch shift applied for track ${track.name}`)
        }
      }
      
      // Wait for the player to load before setting it
      if (!player.loaded) {
        console.log(`[FORCE RELOAD] Loading audio buffer for track ${track.name}...`)
        await player.load(track.audioUrl)
        console.log(`[FORCE RELOAD] Audio buffer loaded for track ${track.name}`)
      }
      
      // Verify the player is properly loaded
      if (!player.loaded) {
        throw new Error(`Player failed to load for track ${track.name}`)
      }
      
      // Apply loop points if specified
      if (track.loopStartTime !== undefined && track.loopEndTime !== undefined) {
        player.loopStart = track.loopStartTime
        player.loopEnd = track.loopEndTime
        player.loop = true // Enable looping
        
        console.log(`[FORCE RELOAD] Applied loop points for track ${track.name}: start=${track.loopStartTime}s, end=${track.loopEndTime}s`)
        
        // Special debugging for Percussion Loop
        if (track.name === 'Perc' || track.name === 'Percussion Loop') {
          console.log(`[PERC FORCE RELOAD] Percussion Loop loop points applied: start=${track.loopStartTime}s, end=${track.loopEndTime}s`)
        }
      } else {
        console.log(`[FORCE RELOAD] No loop points for track ${track.name}`)
        
        // Special debugging for Percussion Loop
        if (track.name === 'Perc' || track.name === 'Percussion Loop') {
          console.log(`[PERC FORCE RELOAD] Percussion Loop has no loop points: loopStartTime=${track.loopStartTime}, loopEndTime=${track.loopEndTime}`)
        }
      }
      
      samplesRef.current[trackId] = player
      console.log(`[FORCE RELOAD] Successfully reloaded sample for track ${track.name} with ${timeStretchMode} mode`)
      
      // Test the player to ensure it's working
      setTimeout(() => {
        try {
          if (player.loaded && player.state !== 'started') {
            console.log(`[FORCE RELOAD] Player for track ${track.name} is ready for playback`)
          }
        } catch (error) {
          console.warn(`[FORCE RELOAD] Player test failed for track ${track.name}:`, error)
        }
      }, 100)
      
    } catch (error) {
      console.error(`[FORCE RELOAD] Failed to reload sample for track ${track.name}:`, error)
      throw error // Re-throw to allow calling code to handle the error
    }
  }, [tracks, timeStretchMode])

  // Function to quantize track timing for perfect sync
  const quantizeTrackTiming = useCallback((trackId: number) => {
    const track = tracks.find(t => t.id === trackId)
    if (!track) return

    console.log(`[QUANTIZE] Quantizing track ${track.name} for perfect sync`)
    
    // Calculate the exact loop length in seconds based on BPM and steps
    const secondsPerBeat = 60 / bpm
    const beatsPerStep = 1 // Assuming 16th notes
    const stepDuration = secondsPerBeat * beatsPerStep
    const loopDuration = stepDuration * steps
    
    console.log(`[QUANTIZE] Loop duration: ${loopDuration.toFixed(3)}s (${bpm} BPM, ${steps} steps)`)
    
    // For now, this is a placeholder for quantization logic
    // In a full implementation, this would adjust the loop start point
    // to align with the sequencer grid
    
    console.log(`[QUANTIZE] Track ${track.name} quantized to grid`)
  }, [tracks, bpm, steps])

  // Function to quantize a track to the grid (for tempo sync issues)
  const quantizeTrack = useCallback((trackId: number) => {
    const track = tracks.find(t => t.id === trackId)
    if (!track) return

    console.log(`[QUANTIZE] Quantizing track ${track.name} to grid`)
    
    // For now, this is a placeholder for quantization logic
    // In a full implementation, this would adjust the loop start point
    // to align with the sequencer grid
    
    console.log(`[QUANTIZE] Track ${track.name} quantized to grid`)
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

  // Function to apply EQ settings to a track
  const applyEQToTrack = useCallback((trackId: number, eqSettings: { low: number, mid: number, high: number }) => {
    const player = samplesRef.current[trackId]
    if (player) {
      // This will be implemented in the main component
      console.log(`[HOOK] EQ settings requested for track ${trackId}:`, eqSettings)
    }
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
    debugLoopStates,
    getCurrentPlayheadPosition,
    getCurrentStepFromTransport,
    restartAllLoopsAtPatternBoundary,
    stopAllLoops,
    samplesRef,
    pitchShiftersRef,
    applyEQToTrack
  }
} 