import { useEffect, useState } from 'react'

interface TimeSettings {
  bpm: number
  timeSignature: string
  stepsPerBar: number
  totalBars: number
  totalSteps: number
  stepDuration: number
  barDuration: number
  totalDuration: number
  swingAmount: number
  quantization: number
  autoSync: boolean
  globalOffset: number
  transportKey: string
  masterVolume: number
  metronomeEnabled: boolean
  metronomeVolume: number
  syncMode: 'global' | 'local' | 'hybrid'
  latencyCompensation: number
}

export function useGlobalTimeSettings() {
  const [timeSettings, setTimeSettings] = useState<TimeSettings | null>(null)
  const [isListening, setIsListening] = useState(false)

  useEffect(() => {
    const handleGlobalTimeSettings = (event: CustomEvent<TimeSettings>) => {
      console.log('[GLOBAL TIME SETTINGS] Received settings:', event.detail)
      setTimeSettings(event.detail)
    }

    window.addEventListener('globalTimeSettingsChanged', handleGlobalTimeSettings as EventListener)
    setIsListening(true)

    return () => {
      window.removeEventListener('globalTimeSettingsChanged', handleGlobalTimeSettings as EventListener)
      setIsListening(false)
    }
  }, [])

  const applyTimeSettings = async (settings: TimeSettings) => {
    try {
      const Tone = await import('tone')
      
      // Apply BPM
      if (Tone.Transport) {
        Tone.Transport.bpm.value = settings.bpm
        Tone.Transport.timeSignature = settings.timeSignature.split('/').map(Number) as [number, number]
      }
      
      // Apply latency compensation
      if (settings.latencyCompensation > 0) {
        Tone.context.latencyHint = settings.latencyCompensation / 1000
      }
      
      console.log('[GLOBAL TIME SETTINGS] Applied settings to Tone.js')
    } catch (error) {
      console.error('[GLOBAL TIME SETTINGS] Failed to apply settings:', error)
    }
  }

  // Apply settings when they change
  useEffect(() => {
    if (timeSettings) {
      applyTimeSettings(timeSettings)
    }
  }, [timeSettings])

  return {
    timeSettings,
    isListening,
    applyTimeSettings
  }
} 