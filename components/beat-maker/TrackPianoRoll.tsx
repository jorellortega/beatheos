import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Piano, Music, Play, Square, RotateCcw, Eraser, MousePointer, Volume2, Save } from 'lucide-react'
import { Track } from '@/hooks/useBeatMaker'
import { PITCH_SHIFT_SETTINGS, calculatePitchShift, validatePitchShift } from '@/lib/utils'

interface AudioNote {
  id: string
  note: string
  startStep: number
  duration: number
  velocity: number
  pitchShift: number // Semitones up/down from original
}

interface TrackPianoRollProps {
  isOpen: boolean
  onClose: () => void
  steps: number
  bpm: number
  track: Track
  onNotesChange: (notes: AudioNote[]) => void
  initialNotes?: AudioNote[]
  onSavePattern?: (name: string, description?: string, category?: string, tags?: string[], genreId?: string, subgenre?: string) => void
}

// Piano roll extends to 4 bars (64 steps) for more complex patterns
const PIANO_ROLL_STEPS = 64 // 4 bars * 16 steps per bar

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const OCTAVES = [5, 4, 3, 2] // C5 to C2 (middle C is C4)

export function TrackPianoRoll({ 
  isOpen, 
  onClose, 
  steps, 
  bpm, 
  track,
  onNotesChange, 
  initialNotes = [],
  onSavePattern
}: TrackPianoRollProps) {
  const [notes, setNotes] = useState<AudioNote[]>(initialNotes)
  
  // Update notes when initialNotes change (when opening piano roll with existing notes)
  useEffect(() => {
    console.log(`[TRACK PIANO ROLL] Loading initial notes:`, initialNotes)
    setNotes(initialNotes)
  }, [initialNotes])
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [tool, setTool] = useState<'draw' | 'erase'>('draw')
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentNote, setCurrentNote] = useState<string | null>(null)
  const [currentStartStep, setCurrentStartStep] = useState<number | null>(null)
  const [volume, setVolume] = useState(0.7)
  const [patternName, setPatternName] = useState('')
  const [selectedGenreId, setSelectedGenreId] = useState('none')
  const [selectedSubgenre, setSelectedSubgenre] = useState('none')
  const [showSaveForm, setShowSaveForm] = useState(false)
  
  // Audio player and pitch shifter refs - improved for better quality
  const audioPlayerRef = useRef<any>(null)
  const pitchShifterRef = useRef<any>(null)
  const audioContextRef = useRef<any>(null)

  // Generate all note names for the piano roll
  const allNotes = OCTAVES.flatMap(octave => 
    NOTES.map(note => `${note}${octave}`)
  ).reverse() // Reverse to show higher notes at top

  // Calculate pitch shift from note - improved with utility function
  const getPitchShiftFromNote = (note: string, originalKey: string = 'C'): number => {
    // Calculate pitch shift from the original key of the audio sample to the target note
    // This tells us how many semitones to shift the audio to match the target note
    const targetNote = note.replace(/\d/, '') // Remove octave number
    const pitchShift = calculatePitchShift(originalKey, targetNote)
    return validatePitchShift(pitchShift)
  }

  const handleNoteClick = (note: string, step: number) => {
    if (!track.audioUrl) {
      alert('This track has no audio loaded')
      return
    }

    if (tool === 'draw') {
      // Check if there's already a note at this position
      const existingNote = notes.find(n => n.note === note && n.startStep === step)
      if (existingNote) return

      const pitchShift = getPitchShiftFromNote(note, track.key || 'C')
      
      const newNote: AudioNote = {
        id: `${track.id}-${note}-${step}-${Date.now()}`,
        note,
        startStep: step,
        duration: 1,
        velocity: 100,
        pitchShift
      }
      
      const newNotes = [...notes, newNote]
      setNotes(newNotes)
      onNotesChange(newNotes)
    } else if (tool === 'erase') {
      const newNotes = notes.filter(n => !(n.note === note && n.startStep === step))
      setNotes(newNotes)
      onNotesChange(newNotes)
    }
  }

  const handleNoteMouseDown = (note: string, step: number) => {
    if (tool === 'draw') {
      setIsDrawing(true)
      setCurrentNote(note)
      setCurrentStartStep(step)
      handleNoteClick(note, step)
    }
  }

  const handleNoteMouseEnter = (note: string, step: number) => {
    if (isDrawing && tool === 'draw' && currentNote === note) {
      handleNoteClick(note, step)
    }
  }

  const handleMouseUp = () => {
    setIsDrawing(false)
    setCurrentNote(null)
    setCurrentStartStep(null)
  }

  const clearAllNotes = () => {
    setNotes([])
    onNotesChange([])
  }

  const playNotes = () => {
    setIsPlaying(true)
    setCurrentStep(0)
    
    const stepDuration = (60 / bpm) / 4 // 16th note duration
    
    const playStep = (step: number) => {
      if (step >= PIANO_ROLL_STEPS) {
        setIsPlaying(false)
        setCurrentStep(0)
        return
      }
      
      setCurrentStep(step)
      
      // Play notes at this step
      const notesAtStep = notes.filter(note => note.startStep === step)
      notesAtStep.forEach(note => {
        playAudioNote(note)
      })
      
      setTimeout(() => playStep(step + 1), stepDuration * 1000)
    }
    
    playStep(0)
  }

  const stopPlayback = () => {
    setIsPlaying(false)
    setCurrentStep(0)
  }

  const getNoteColor = (note: string) => {
    const baseNote = note.replace(/\d/, '')
    return baseNote.includes('#') ? 'bg-gray-800' : 'bg-white'
  }

  // Function to play audio when clicking on piano keys - improved quality
  const playPianoKey = async (note: string) => {
    if (!track.audioUrl) {
      console.warn('No audio URL available for this track')
      return
    }

    try {
      const Tone = await import('tone')
      
      // Calculate pitch shift for this note
      const pitchShift = getPitchShiftFromNote(note, track.key || 'C')
      
      // Create a dedicated player for this piano key note
      const notePlayer = new Tone.Player(track.audioUrl)
      notePlayer.volume.value = Tone.gainToDb(volume)
      
      // Create a dedicated pitch shifter for this note
      const notePitchShifter = new Tone.PitchShift({
        pitch: pitchShift,
        windowSize: PITCH_SHIFT_SETTINGS.windowSize,
        delayTime: PITCH_SHIFT_SETTINGS.delayTime,
        feedback: PITCH_SHIFT_SETTINGS.feedback
      }).toDestination()
      
      // Connect player to pitch shifter
      notePlayer.connect(notePitchShifter)
      
      // Wait for the player to load before playing
      await notePlayer.load(track.audioUrl)
      notePlayer.start()
      console.log(`[PIANO KEY] Playing ${note} with pitch shift: ${pitchShift} semitones`)
      
      // Clean up after playback
      const cleanup = () => {
        try {
          notePlayer.stop()
          notePlayer.disconnect()
          notePitchShifter.disconnect()
          notePlayer.dispose()
          notePitchShifter.dispose()
        } catch (error) {
          console.warn('Error during cleanup:', error)
        }
      }
      
      // Set up cleanup when player stops
      notePlayer.onstop = cleanup
      
      // Also cleanup after a reasonable time (2 seconds)
      setTimeout(cleanup, 2000)
      
    } catch (error) {
      console.error('Error playing piano key:', error)
    }
  }

  // Initialize audio player with improved pitch shifting
  useEffect(() => {
    const initAudioPlayer = async () => {
      try {
        const Tone = await import('tone')
        
        // Initialize audio context if not already done
        if (!audioContextRef.current) {
          await Tone.start()
          audioContextRef.current = Tone.context
        }
        
        // Clean up existing player and pitch shifter
        if (audioPlayerRef.current) {
          if (audioPlayerRef.current.state === 'started') {
            audioPlayerRef.current.stop()
          }
          audioPlayerRef.current.dispose()
        }
        if (pitchShifterRef.current) {
          pitchShifterRef.current.dispose()
        }

        // Create new player and pitch shifter with high quality settings
        if (track.audioUrl) {
          // Create master player
          audioPlayerRef.current = new Tone.Player(track.audioUrl)
          audioPlayerRef.current.volume.value = Tone.gainToDb(volume)
          
          // Create high-quality pitch shifter
          pitchShifterRef.current = new Tone.PitchShift({
            pitch: 0, // Will be set dynamically
            windowSize: PITCH_SHIFT_SETTINGS.windowSize,
            delayTime: PITCH_SHIFT_SETTINGS.delayTime,
            feedback: PITCH_SHIFT_SETTINGS.feedback
          }).toDestination()
          
          // Connect player to pitch shifter
          audioPlayerRef.current.connect(pitchShifterRef.current)
          
          // Load the audio buffer
          try {
            await audioPlayerRef.current.load(track.audioUrl)
          } catch (error) {
            console.error('Failed to load audio buffer:', error)
          }
        }
        
      } catch (error) {
        console.error('Failed to initialize audio player:', error)
      }
    }
    
    if (isOpen && track.audioUrl) {
      initAudioPlayer()
    }
  }, [isOpen, volume, track.audioUrl])

  // Cleanup audio resources on unmount
  useEffect(() => {
    return () => {
      // Clean up audio player and pitch shifter
      if (audioPlayerRef.current) {
        if (audioPlayerRef.current.state === 'started') {
          audioPlayerRef.current.stop()
        }
        audioPlayerRef.current.dispose()
      }
      if (pitchShifterRef.current) {
        pitchShifterRef.current.dispose()
      }
    }
  }, [])

  // Update volume when volume state changes
  useEffect(() => {
    const Tone = import('tone').then(Tone => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.volume.value = Tone.gainToDb(volume)
      }
    }).catch(error => {
      console.error('Failed to update volume:', error)
    })
  }, [volume])

  const playAudioNote = async (note: AudioNote) => {
    try {
      const player = audioPlayerRef.current
      const pitchShifter = pitchShifterRef.current
      
      if (player && player.loaded && pitchShifter) {
        // Create a new player instance for this specific note to avoid conflicts
        const Tone = await import('tone')
        const notePlayer = new Tone.Player(track.audioUrl!)
        notePlayer.volume.value = Tone.gainToDb(volume)
        
        // Create a dedicated pitch shifter for this note
        const notePitchShifter = new Tone.PitchShift({
          pitch: note.pitchShift,
          windowSize: PITCH_SHIFT_SETTINGS.windowSize,
          delayTime: PITCH_SHIFT_SETTINGS.delayTime,
          feedback: PITCH_SHIFT_SETTINGS.feedback
        }).toDestination()
        
        // Connect player to pitch shifter
        notePlayer.connect(notePitchShifter)
        
        // Wait for the player to load before playing
        await notePlayer.load(track.audioUrl!)
        notePlayer.start()
        
        // Clean up after playback
        const cleanup = () => {
          try {
            notePlayer.stop()
            notePlayer.disconnect()
            notePitchShifter.disconnect()
            notePlayer.dispose()
            notePitchShifter.dispose()
          } catch (error) {
            console.warn('Error during cleanup:', error)
          }
        }
        
        // Set up cleanup when player stops
        notePlayer.onstop = cleanup
        
        // Also cleanup after a reasonable time (2 seconds)
        setTimeout(cleanup, 2000)
      }
    } catch (error) {
      console.error('Failed to play audio note:', error)
    }
  }

  const handleSavePattern = () => {
    if (!patternName.trim()) {
      alert('Please enter a pattern name')
      return
    }
    
    onSavePattern?.(patternName, `${track.name} Piano Roll Pattern`, 'Audio', ['piano-roll', 'audio', track.name.toLowerCase()], selectedGenreId === 'none' ? '' : selectedGenreId, selectedSubgenre === 'none' ? '' : selectedSubgenre)
    setPatternName('')
    setSelectedGenreId('none')
    setSelectedSubgenre('none')
    setShowSaveForm(false)
  }

  const isNoteActive = (note: string, step: number) => {
    return notes.some(n => n.note === note && n.startStep === step)
  }

  const getNoteAtPosition = (note: string, step: number) => {
    return notes.find(n => n.note === note && n.startStep === step)
  }

  if (!isOpen || !track.audioUrl) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <Card className="w-[90vw] h-[80vh] bg-[#141414] border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Piano className="w-5 h-5" />
              {track.name} Piano Roll
              <div className={`w-3 h-3 rounded-full ${track.color} ml-2`}></div>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={tool === 'draw' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTool('draw')}
                className="text-xs"
              >
                <MousePointer className="w-3 h-3 mr-1" />
                Draw
              </Button>
              <Button
                variant={tool === 'erase' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTool('erase')}
                className="text-xs"
              >
                <Eraser className="w-3 h-3 mr-1" />
                Erase
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllNotes}
                className="text-xs"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Clear
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSaveForm(!showSaveForm)}
                className="text-xs"
              >
                <Save className="w-3 h-3 mr-1" />
                Save
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={isPlaying ? stopPlayback : playNotes}
                className="text-xs"
              >
                {isPlaying ? <Square className="w-3 h-3 mr-1" /> : <Play className="w-3 h-3 mr-1" />}
                {isPlaying ? 'Stop' : 'Play'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
          
          {/* Track Info */}
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${track.color}`}></div>
              <span className="text-xs text-gray-300">
                {track.audioName || 'Audio Sample'}
                {track.key && ` (Key: ${track.key})`}
                {track.bpm && ` (${track.bpm} BPM)`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Volume2 className="w-3 h-3 text-gray-300" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-20"
              />
              <span className="text-xs text-gray-300">{Math.round(volume * 100)}%</span>
            </div>
          </div>

          {/* Save Pattern Form */}
          {showSaveForm && (
            <div className="mt-4 bg-[#1a1a1a] border border-gray-600 rounded-md p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-300 mb-1 block">Pattern Name *</label>
                  <input
                    value={patternName}
                    onChange={(e) => setPatternName(e.target.value)}
                    placeholder={`${track.name} Piano Roll Pattern`}
                    className="w-full bg-[#0a0a0a] border border-gray-600 rounded px-2 py-1 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-300 mb-1 block">Genre</label>
                  <Select value={selectedGenreId} onValueChange={setSelectedGenreId}>
                    <SelectTrigger className="bg-[#0a0a0a] border-gray-600 text-white text-xs">
                      <SelectValue placeholder="Select a genre..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#2a2a2a] border-gray-600">
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {selectedGenreId && selectedGenreId !== 'none' && (
                  <div>
                    <label className="text-xs text-gray-300 mb-1 block">Subgenre</label>
                    <Select value={selectedSubgenre} onValueChange={setSelectedSubgenre}>
                      <SelectTrigger className="bg-[#0a0a0a] border-gray-600 text-white text-xs">
                        <SelectValue placeholder="Select a subgenre..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#2a2a2a] border-gray-600">
                        <SelectItem value="none">None</SelectItem>
                      </SelectContent>
                  </Select>
                  </div>
                )}
                <div className="flex items-end">
                  <Button
                    onClick={handleSavePattern}
                    className="bg-green-600 hover:bg-green-700 text-xs"
                  >
                    <Save className="w-3 h-3 mr-1" />
                    Save Pattern
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-4 overflow-auto">
          <div className="flex">
            {/* Piano keys */}
            <div className="w-20 flex-shrink-0">
              {allNotes.map((note) => (
                <div
                  key={note}
                  className={`h-8 border-b border-gray-600 flex items-center justify-center text-xs font-mono cursor-pointer hover:opacity-80 transition-opacity ${
                    getNoteColor(note) === 'bg-white' ? 'text-gray-800' : 'text-white'
                  } ${getNoteColor(note)}`}
                  title={`${note} - Click to test pitch-shifted audio`}
                  onClick={() => playPianoKey(note)}
                >
                  {note}
                </div>
              ))}
            </div>
            
            {/* Grid */}
            <div className="flex-1 relative">
              <div 
                className="grid gap-0 border-l border-gray-600"
                style={{ 
                  gridTemplateColumns: `repeat(${PIANO_ROLL_STEPS}, 1fr)`,
                  gridTemplateRows: `repeat(${allNotes.length}, 32px)`
                }}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* Grid cells */}
                {allNotes.map((note) => 
                  Array.from({ length: PIANO_ROLL_STEPS }, (_, step) => {
                    const audioNote = getNoteAtPosition(note, step)
                    const isBarStart = step % 16 === 0 // Highlight bar starts
                    const isDownbeat = step % 16 === 0 // Steps 1, 17, 33, 49
                    const isBeat = step % 4 === 0 // Steps 1, 5, 9, 13, 17, 21, etc.
                    
                    return (
                      <div
                        key={`${note}-${step}`}
                        className={`border-r border-b cursor-pointer transition-colors relative ${
                          isBarStart ? 'border-gray-500 border-r-2' : 
                          isBeat ? 'border-gray-600' : 'border-gray-600/30'
                        } ${
                          audioNote 
                            ? `${track.color.replace('bg-', 'bg-').replace('-500', '-500/80')} hover:opacity-80` 
                            : 'hover:bg-gray-600/30'
                        } ${currentStep === step ? 'ring-1 ring-yellow-400' : ''}`}
                        onClick={() => handleNoteClick(note, step)}
                        onMouseDown={() => handleNoteMouseDown(note, step)}
                        onMouseEnter={() => handleNoteMouseEnter(note, step)}
                        title={audioNote ? `Pitch: ${audioNote.pitchShift > 0 ? '+' : ''}${audioNote.pitchShift} semitones` : 'Click to place audio sample'}
                      >
                        {audioNote && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full opacity-80"></div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
                
                {/* Step numbers */}
                <div className="absolute -top-6 left-0 right-0 flex">
                  {Array.from({ length: PIANO_ROLL_STEPS }, (_, step) => {
                    const stepNumber = step + 1 // Use 1-based indexing to match sequencer grid display
                    const isBarStart = step % 16 === 0
                    const isBeat = step % 4 === 0
                    
                    return (
                      <div
                        key={step}
                        className={`flex-1 text-center text-xs font-mono ${
                          isBarStart ? 'text-yellow-400 font-bold' : 
                          isBeat ? 'text-gray-300' : 'text-gray-500'
                        }`}
                      >
                        {isBarStart ? `${Math.floor(step / 16) + 1}.${(step % 16) + 1}` : stepNumber}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
          
          {/* Info panel */}
          <div className="mt-4 p-3 bg-[#1a1a1a] rounded border border-gray-600">
            <div className="flex items-center gap-4 text-sm text-gray-300">
              <div>BPM: {bpm}</div>
              <div>Steps: {PIANO_ROLL_STEPS} (4 bars)</div>
              <div>Notes: {notes.length}</div>
              <div>Tool: {tool === 'draw' ? 'Draw' : 'Erase'}</div>
              <div>Track: {track.name}</div>
            </div>
            <div className="mt-2 text-xs text-gray-400">
              <p>💡 <strong>How to use:</strong></p>
              <p>1. Click on the grid to place {track.name} audio at different pitches</p>
              <p>2. Higher notes = higher pitch, Lower notes = lower pitch</p>
              <p>3. Piano roll extends 4 bars (64 steps) for complex patterns</p>
              <p>4. Yellow numbers = bar starts, Gray numbers = beats</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 