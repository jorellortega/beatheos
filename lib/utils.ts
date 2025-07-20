import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Audio and pitch shifting utilities
export const PITCH_SHIFT_SETTINGS = {
  // High quality settings for pitch shifting
  windowSize: 0.2,    // Larger window for better quality
  delayTime: 0.003,   // Small delay for better quality  
  feedback: 0.1       // Small feedback for stability
}

// Calculate pitch shift from note difference
export function calculatePitchShift(fromNote: string, toNote: string): number {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const fromIndex = notes.indexOf(fromNote.replace(/\d/, ''))
  const toIndex = notes.indexOf(toNote.replace(/\d/, ''))
  
  if (fromIndex === -1 || toIndex === -1) return 0
  
  return toIndex - fromIndex
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
