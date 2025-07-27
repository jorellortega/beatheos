import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Audio and pitch shifting utilities
export const PITCH_SHIFT_SETTINGS = {
  // Professional quality settings for pitch shifting
  windowSize: 0.025,  // Very small window for excellent transient preservation
  delayTime: 0.0005,  // Minimal delay for maximum quality
  feedback: 0.01      // Very low feedback for crystal clear audio
}

// Enhanced pitch shift settings for different quality levels
export const PITCH_SHIFT_QUALITY = {
  // Standard quality (balanced performance/quality)
  standard: {
    windowSize: 0.05,
    delayTime: 0.001,
    feedback: 0.02
  },
  // High quality (professional grade)
  high: {
    windowSize: 0.025,
    delayTime: 0.0005,
    feedback: 0.01
  },
  // Ultra quality (studio grade, maximum CPU usage)
  ultra: {
    windowSize: 0.01,
    delayTime: 0.0002,
    feedback: 0.005
  }
}

// Calculate pitch shift from note difference
export function calculatePitchShift(fromNote: string, toNote: string): number {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const fromIndex = notes.indexOf(fromNote.replace(/\d/, ''))
  const toIndex = notes.indexOf(toNote.replace(/\d/, ''))
  
  if (fromIndex === -1 || toIndex === -1) return 0
  
  // Calculate the shortest distance between notes (handling octave wrapping)
  let diff = toIndex - fromIndex
  
  // Handle octave wrapping for shortest distance
  if (diff > 6) diff -= 12
  if (diff < -6) diff += 12
  
  return diff
}

// Get note from pitch shift
export function getNoteFromPitchShift(baseNote: string, pitchShift: number): string {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const baseIndex = notes.indexOf(baseNote.replace(/\d/, ''))
  
  if (baseIndex === -1) return baseNote
  
  const newIndex = (baseIndex + pitchShift + 12) % 12
  const octave = baseNote.match(/\d/)?.[0] || '4'
  
  return `${notes[newIndex]}${octave}`
}

// Validate pitch shift value
export function validatePitchShift(pitchShift: number): number {
  // Clamp pitch shift to reasonable range (-24 to +24 semitones)
  return Math.max(-24, Math.min(24, pitchShift))
}

// Create enhanced pitch shifter with better quality
export function createEnhancedPitchShifter(quality: 'standard' | 'high' | 'ultra' = 'high') {
  const settings = PITCH_SHIFT_QUALITY[quality]
  
  return {
    windowSize: settings.windowSize,
    delayTime: settings.delayTime,
    feedback: settings.feedback
  }
}

// Create professional grade pitch shifter chain
export function createProfessionalPitchShifter(quality: 'standard' | 'high' | 'ultra' = 'high') {
  const settings = PITCH_SHIFT_QUALITY[quality]
  
  return {
    // Primary pitch shifter with optimal settings
    primary: {
      windowSize: settings.windowSize,
      delayTime: settings.delayTime,
      feedback: settings.feedback
    },
    // Additional processing for better quality
    processing: {
      // Use smaller windows for better transient preservation
      transientWindow: settings.windowSize * 0.5,
      // Minimal delay for maximum quality
      processingDelay: settings.delayTime * 0.5,
      // Very low feedback for clarity
      clarityFeedback: settings.feedback * 0.5
    }
  }
}

// Apply pitch shift with enhanced processing
export function applyPitchShiftWithEnhancement(pitchShifter: any, pitch: number, quality: 'standard' | 'high' | 'ultra' = 'high') {
  // Validate pitch value
  const validatedPitch = validatePitchShift(pitch)
  
  // Apply pitch shift (this property is writable)
  pitchShifter.pitch = validatedPitch
  
  // Note: windowSize, delayTime, and feedback are read-only after creation
  // These must be set during PitchShift creation, not modified after
  // For now, we only apply the pitch value and let the quality be set during creation
  
  return validatedPitch
}

// Get optimal pitch shifter settings based on pitch amount
export function getOptimalPitchSettings(pitchAmount: number) {
  const absPitch = Math.abs(pitchAmount)
  
  if (absPitch <= 3) {
    // Small pitch shifts: Use standard quality for efficiency
    return {
      quality: 'standard' as const,
      windowSize: 0.05,
      delayTime: 0.001,
      feedback: 0.02
    }
  } else if (absPitch <= 7) {
    // Medium pitch shifts: Use high quality for better results
    return {
      quality: 'high' as const,
      windowSize: 0.025,
      delayTime: 0.0005,
      feedback: 0.01
    }
  } else if (absPitch <= 12) {
    // Large pitch shifts: Use ultra quality for maximum clarity
    return {
      quality: 'ultra' as const,
      windowSize: 0.01,
      delayTime: 0.0002,
      feedback: 0.005
    }
  } else {
    // Extreme pitch shifts: Use the most aggressive settings
    return {
      quality: 'ultra' as const,
      windowSize: 0.005,
      delayTime: 0.0001,
      feedback: 0.002
    }
  }
}

// Create different types of pitch shifters for better quality
export function createPitchShifter(type: 'phase-vocoder' | 'playback-rate' | 'granular' | 'auto', pitchAmount: number) {
  const absPitch = Math.abs(pitchAmount)
  
  // Auto-select the best method based on pitch amount
  if (type === 'auto') {
    if (absPitch <= 2) {
      type = 'playback-rate' // Best for small changes
    } else if (absPitch <= 7) {
      type = 'phase-vocoder' // Good for medium changes
    } else {
      type = 'granular' // Best for large changes
    }
  }
  
  switch (type) {
    case 'playback-rate':
      // Simple playback rate change - most natural for small shifts
      return {
        type: 'playback-rate',
        settings: {
          playbackRate: Math.pow(2, pitchAmount / 12) // Convert semitones to playback rate
        }
      }
      
    case 'phase-vocoder':
      // Phase vocoder with optimized settings
      return {
        type: 'phase-vocoder',
        settings: {
          windowSize: absPitch <= 3 ? 0.1 : absPitch <= 7 ? 0.05 : 0.025,
          delayTime: absPitch <= 3 ? 0.002 : absPitch <= 7 ? 0.001 : 0.0005,
          feedback: absPitch <= 3 ? 0.05 : absPitch <= 7 ? 0.02 : 0.01
        }
      }
      
    case 'granular':
      // Granular synthesis approach for large pitch shifts
      return {
        type: 'granular',
        settings: {
          grainSize: 0.1,
          overlap: 0.5,
          windowType: 'hann'
        }
      }
      
    default:
      return {
        type: 'phase-vocoder',
        settings: getOptimalPitchSettings(pitchAmount)
      }
  }
}
