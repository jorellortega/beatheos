import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Piano, Music, Play, Square, RotateCcw, Grid, Eraser, MousePointer, Volume2 } from 'lucide-react'

interface Note {
  id: string
  note: string
  startStep: number
  duration: number
  velocity: number
}

interface PianoRollProps {
  isOpen: boolean
  onClose: () => void
  steps: number
  bpm: number
  onNotesChange: (notes: Note[]) => void
  initialNotes?: Note[]
}

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const OCTAVES = [5, 4, 3, 2] // C5 to C2 (middle C is C4)

export function PianoRoll({ isOpen, onClose, steps, bpm, onNotesChange, initialNotes = [] }: PianoRollProps) {
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [tool, setTool] = useState<'draw' | 'erase'>('draw')
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentNote, setCurrentNote] = useState<string | null>(null)
  const [currentStartStep, setCurrentStartStep] = useState<number | null>(null)
  const [soundType, setSoundType] = useState<'piano' | 'synth' | 'bass'>('piano')
  const [volume, setVolume] = useState(0.7)
  
  // Tone.js synthesizer refs
  const pianoSynthRef = useRef<any>(null)
  const synthRef = useRef<any>(null)
  const bassSynthRef = useRef<any>(null)

  // Generate all note names for the piano roll
  const allNotes = OCTAVES.flatMap(octave => 
    NOTES.map(note => `${note}${octave}`)
  ).reverse() // Reverse to show higher notes at top

  const handleNoteClick = (note: string, step: number) => {
    if (tool === 'draw') {
      // Check if there's already a note at this position
      const existingNote = notes.find(n => n.note === note && n.startStep === step)
      if (existingNote) return

      const newNote: Note = {
        id: `${note}-${step}-${Date.now()}`,
        note,
        startStep: step,
        duration: 1,
        velocity: 100
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
      if (step >= steps) {
        setIsPlaying(false)
        setCurrentStep(0)
        return
      }
      
      setCurrentStep(step)
      
      // Play notes at this step
      const notesAtStep = notes.filter(note => note.startStep === step)
      notesAtStep.forEach(note => {
        playNote(note.note)
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

  // Initialize synthesizers
  useEffect(() => {
    const initSynthesizers = async () => {
      try {
        const Tone = await import('tone')
        
        // Piano synthesizer (sampled piano)
        pianoSynthRef.current = new Tone.Sampler({
          urls: {
            "C4": "C4.mp3",
            "D#4": "Ds4.mp3", 
            "F#4": "Fs4.mp3",
          },
          baseUrl: "https://tonejs.github.io/audio/salamander/",
        }).toDestination()
        
        // Simple synth
        synthRef.current = new Tone.Synth({
          oscillator: {
            type: "square"
          },
          envelope: {
            attack: 0.1,
            decay: 0.2,
            sustain: 0.3,
            release: 1
          }
        }).toDestination()
        
        // Bass synth
        bassSynthRef.current = new Tone.MonoSynth({
          oscillator: {
            type: "sawtooth"
          },
          envelope: {
            attack: 0.1,
            decay: 0.2,
            sustain: 0.4,
            release: 0.8
          },
          filterEnvelope: {
            attack: 0.001,
            decay: 0.1,
            sustain: 0.3,
            release: 0.1,
            baseFrequency: 200,
            octaves: 2.6
          }
        }).toDestination()
        
        // Set initial volumes
        pianoSynthRef.current.volume.value = Tone.gainToDb(volume)
        synthRef.current.volume.value = Tone.gainToDb(volume)
        bassSynthRef.current.volume.value = Tone.gainToDb(volume)
        
      } catch (error) {
        console.error('Failed to initialize synthesizers:', error)
      }
    }
    
    if (isOpen) {
      initSynthesizers()
    }
  }, [isOpen, volume])

  const playNote = (note: string) => {
    try {
      let synth = pianoSynthRef.current
      if (soundType === 'synth') synth = synthRef.current
      if (soundType === 'bass') synth = bassSynthRef.current
      
      if (synth) {
        synth.triggerAttackRelease(note, "8n")
      }
    } catch (error) {
      console.error('Failed to play note:', error)
    }
  }

  const isNoteActive = (note: string, step: number) => {
    return notes.some(n => n.note === note && n.startStep === step)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <Card className="w-[90vw] h-[80vh] bg-[#141414] border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Piano className="w-5 h-5" />
              Piano Roll
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
          
          {/* Sound Controls */}
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-300">Sound:</span>
              <select
                value={soundType}
                onChange={(e) => setSoundType(e.target.value as 'piano' | 'synth' | 'bass')}
                className="bg-[#1a1a1a] border border-gray-600 rounded px-2 py-1 text-xs text-white"
              >
                <option value="piano">Piano</option>
                <option value="synth">Synth</option>
                <option value="bass">Bass</option>
              </select>
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
                  onClick={() => playNote(note)}
                  title={`Click to test ${note}`}
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
                  gridTemplateColumns: `repeat(${steps}, 1fr)`,
                  gridTemplateRows: `repeat(${allNotes.length}, 32px)`
                }}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* Grid cells */}
                {allNotes.map((note) => 
                  Array.from({ length: steps }, (_, step) => (
                    <div
                      key={`${note}-${step}`}
                      className={`border-r border-b border-gray-600/30 cursor-pointer transition-colors ${
                        isNoteActive(note, step) 
                          ? 'bg-blue-500/80 hover:bg-blue-400/80' 
                          : 'hover:bg-gray-600/30'
                      } ${currentStep === step ? 'ring-1 ring-yellow-400' : ''}`}
                      onClick={() => handleNoteClick(note, step)}
                      onMouseDown={() => handleNoteMouseDown(note, step)}
                      onMouseEnter={() => handleNoteMouseEnter(note, step)}
                    />
                  ))
                )}
                
                {/* Step numbers */}
                <div className="absolute -top-6 left-0 right-0 flex">
                  {Array.from({ length: steps }, (_, step) => (
                    <div
                      key={step}
                      className="flex-1 text-center text-xs text-gray-400 font-mono"
                    >
                      {step + 1}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Info panel */}
          <div className="mt-4 p-3 bg-[#1a1a1a] rounded border border-gray-600">
            <div className="flex items-center gap-4 text-sm text-gray-300">
              <div>BPM: {bpm}</div>
              <div>Steps: {steps}</div>
              <div>Notes: {notes.length}</div>
              <div>Tool: {tool === 'draw' ? 'Draw' : 'Erase'}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 