import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Piano, Music, Play, Square, RotateCcw, Eraser, MousePointer, Volume2, Save } from 'lucide-react'
import { Track } from '@/hooks/useBeatMaker'

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
  onSavePattern?: (name: string, description?: string, category?: string, tags?: string[]) => void
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
  const [showSaveForm, setShowSaveForm] = useState(false)
  
  // Audio player ref
  const audioPlayerRef = useRef<any>(null)

  // Generate all note names for the piano roll
  const allNotes = OCTAVES.flatMap(octave => 
    NOTES.map(note => `${note}${octave}`)
  ).reverse() // Reverse to show higher notes at top

  // Calculate pitch shift from note
  const getPitchShiftFromNote = (note: string, originalKey: string = 'C'): number => {
    const noteIndex = NOTES.indexOf(note.replace(/\d/, ''))
    const originalIndex = NOTES.indexOf(originalKey)
    return noteIndex - originalIndex
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

  // Function to play audio when clicking on piano keys
  const playPianoKey = async (note: string) => {
    if (!track.audioUrl) {
      console.warn('No audio URL available for this track')
      return
    }

    try {
      const Tone = await import('tone')
      
      // Calculate pitch shift for this note
      const pitchShift = getPitchShiftFromNote(note, track.key || 'C')
      
      // Create a new player for this specific note with pitch shift
      const notePlayer = new Tone.Player(track.audioUrl)
      
      // Apply pitch shift if needed
      if (pitchShift !== 0) {
        const pitchShiftNode = new Tone.PitchShift({
          pitch: pitchShift,
          windowSize: 0.1,
          delayTime: 0
        }).toDestination()
        notePlayer.connect(pitchShiftNode)
      } else {
        notePlayer.toDestination()
      }
      
      // Set volume
      notePlayer.volume.value = Tone.gainToDb(volume)
      
      // Use the existing playAudioNote function which handles loading properly
      const mockNote: AudioNote = {
        id: `piano-key-${note}`,
        note,
        startStep: 0,
        duration: 1,
        velocity: 100,
        pitchShift
      }
      
      await playAudioNote(mockNote)
      
      console.log(`[PIANO KEY] Playing ${note} with pitch shift: ${pitchShift} semitones`)
    } catch (error) {
      console.error('Error playing piano key:', error)
    }
  }

  // Initialize audio player
  useEffect(() => {
    const initAudioPlayer = async () => {
      try {
        const Tone = await import('tone')
        
        // Clean up existing player
        if (audioPlayerRef.current) {
          if (audioPlayerRef.current.state === 'started') {
            audioPlayerRef.current.stop()
          }
          audioPlayerRef.current.dispose()
        }

        // Create new player
        if (track.audioUrl) {
          audioPlayerRef.current = new Tone.Player(track.audioUrl).toDestination()
          audioPlayerRef.current.volume.value = Tone.gainToDb(volume)
        }
        
      } catch (error) {
        console.error('Failed to initialize audio player:', error)
      }
    }
    
    if (isOpen && track.audioUrl) {
      initAudioPlayer()
    }
  }, [isOpen, volume, track.audioUrl])

  const playAudioNote = async (note: AudioNote) => {
    try {
      const player = audioPlayerRef.current
      if (player && player.loaded) {
        // Apply pitch shift
        const pitchShift = note.pitchShift
        if (pitchShift !== 0) {
          const Tone = await import('tone')
          const pitchShiftNode = new Tone.PitchShift({
            pitch: pitchShift,
            windowSize: 0.1,
            delayTime: 0
          }).toDestination()
          
          player.connect(pitchShiftNode)
          player.start()
          
          // Disconnect after playback
          setTimeout(() => {
            player.disconnect(pitchShiftNode)
            pitchShiftNode.dispose()
          }, 1000)
        } else {
          player.start()
        }
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
    
    onSavePattern?.(patternName, `${track.name} Piano Roll Pattern`, 'Audio', ['piano-roll', 'audio', track.name.toLowerCase()])
    setPatternName('')
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