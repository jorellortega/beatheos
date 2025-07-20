import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Piano, Music, Play, Square, RotateCcw, Grid, Eraser, MousePointer, Volume2, Save, Download } from 'lucide-react'
import { Track } from '@/hooks/useBeatMaker'
import { PITCH_SHIFT_SETTINGS, calculatePitchShift, validatePitchShift } from '@/lib/utils'

interface AudioNote {
  id: string
  trackId: number
  note: string
  startStep: number
  duration: number
  velocity: number
  audioUrl: string
  audioName: string
  pitchShift: number // Semitones up/down from original
}

interface AudioPianoRollProps {
  isOpen: boolean
  onClose: () => void
  steps: number
  bpm: number
  tracks: Track[]
  onNotesChange: (notes: AudioNote[]) => void
  initialNotes?: AudioNote[]
  onSavePattern?: (name: string, description?: string, category?: string, tags?: string[]) => void
}

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const OCTAVES = [5, 4, 3, 2] // C5 to C2 (middle C is C4)

export function AudioPianoRoll({ 
  isOpen, 
  onClose, 
  steps, 
  bpm, 
  tracks,
  onNotesChange, 
  initialNotes = [],
  onSavePattern
}: AudioPianoRollProps) {
  const [notes, setNotes] = useState<AudioNote[]>(initialNotes)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [tool, setTool] = useState<'draw' | 'erase'>('draw')
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentNote, setCurrentNote] = useState<string | null>(null)
  const [currentStartStep, setCurrentStartStep] = useState<number | null>(null)
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null)
  const [volume, setVolume] = useState(0.7)
  const [patternName, setPatternName] = useState('')
  const [showSaveForm, setShowSaveForm] = useState(false)
  
  // Audio players and pitch shifters refs - improved for better quality
  const audioPlayersRef = useRef<{[noteId: string]: any}>({})
  const pitchShiftersRef = useRef<{[noteId: string]: any}>({})
  const audioContextRef = useRef<any>(null)

  // Generate all note names for the piano roll
  const allNotes = OCTAVES.flatMap(octave => 
    NOTES.map(note => `${note}${octave}`)
  ).reverse() // Reverse to show higher notes at top

  // Calculate pitch shift from note - improved with utility function
  const getPitchShiftFromNote = (note: string, originalKey: string = 'C'): number => {
    const pitchShift = calculatePitchShift(originalKey, note.replace(/\d/, ''))
    return validatePitchShift(pitchShift)
  }

  // Get note from pitch shift
  const getNoteFromPitchShift = (pitchShift: number, originalKey: string = 'C'): string => {
    const originalIndex = NOTES.indexOf(originalKey)
    const newIndex = (originalIndex + pitchShift + 12) % 12
    return NOTES[newIndex]
  }

  const handleNoteClick = (note: string, step: number) => {
    if (!selectedTrack || !selectedTrack.audioUrl) {
      alert('Please select a track with audio first')
      return
    }

    if (tool === 'draw') {
      // Check if there's already a note at this position for this track
      const existingNote = notes.find(n => n.trackId === selectedTrack.id && n.note === note && n.startStep === step)
      if (existingNote) return

      const pitchShift = getPitchShiftFromNote(note, selectedTrack.key || 'C')
      
      const newNote: AudioNote = {
        id: `${selectedTrack.id}-${note}-${step}-${Date.now()}`,
        trackId: selectedTrack.id,
        note,
        startStep: step,
        duration: 1,
        velocity: 100,
        audioUrl: selectedTrack.audioUrl!,
        audioName: selectedTrack.audioName || 'Audio Sample',
        pitchShift
      }
      
      const newNotes = [...notes, newNote]
      setNotes(newNotes)
      onNotesChange(newNotes)
    } else if (tool === 'erase') {
      const newNotes = notes.filter(n => !(n.trackId === selectedTrack.id && n.note === note && n.startStep === step))
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

  const clearTrackNotes = (trackId: number) => {
    const newNotes = notes.filter(n => n.trackId !== trackId)
    setNotes(newNotes)
    onNotesChange(newNotes)
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

  const getNoteBackgroundColor = (note: AudioNote) => {
    const track = tracks.find(t => t.id === note.trackId)
    if (!track) return 'bg-blue-500/80'
    
    // Use track color for the note
    const colorMap: {[key: string]: string} = {
      'bg-red-500': 'bg-red-500/80',
      'bg-blue-500': 'bg-blue-500/80',
      'bg-green-500': 'bg-green-500/80',
      'bg-purple-500': 'bg-purple-500/80',
      'bg-orange-500': 'bg-orange-500/80',
      'bg-pink-500': 'bg-pink-500/80',
      'bg-yellow-500': 'bg-yellow-500/80',
      'bg-cyan-500': 'bg-cyan-500/80'
    }
    
    return colorMap[track.color] || 'bg-blue-500/80'
  }

  // Initialize audio players with improved pitch shifting
  useEffect(() => {
    const initAudioPlayers = async () => {
      try {
        const Tone = await import('tone')
        
        // Initialize audio context if not already done
        if (!audioContextRef.current) {
          await Tone.start()
          audioContextRef.current = Tone.context
        }
        
        // Clean up existing players and pitch shifters
        Object.values(audioPlayersRef.current).forEach(player => {
          if (player.state === 'started') {
            player.stop()
          }
          player.dispose()
        })
        Object.values(pitchShiftersRef.current).forEach(shifter => {
          shifter.dispose()
        })
        audioPlayersRef.current = {}
        pitchShiftersRef.current = {}

        // Create players for each unique audio URL with pre-created pitch shifters
        const uniqueAudioUrls = [...new Set(notes.map(n => n.audioUrl))]
        
        for (const audioUrl of uniqueAudioUrls) {
          // Create a master player for this audio URL
          const masterPlayer = new Tone.Player(audioUrl)
          masterPlayer.volume.value = Tone.gainToDb(volume)
          
          // Create a high-quality pitch shifter for this audio URL
          const pitchShifter = new Tone.PitchShift({
            pitch: 0, // Will be set dynamically
            windowSize: PITCH_SHIFT_SETTINGS.windowSize,
            delayTime: PITCH_SHIFT_SETTINGS.delayTime,
            feedback: PITCH_SHIFT_SETTINGS.feedback
          }).toDestination()
          
          // Connect master player to pitch shifter
          masterPlayer.connect(pitchShifter)
          
          // Store references
          audioPlayersRef.current[audioUrl] = masterPlayer
          pitchShiftersRef.current[audioUrl] = pitchShifter
        }
        
      } catch (error) {
        console.error('Failed to initialize audio players:', error)
      }
    }
    
    if (isOpen && notes.length > 0) {
      initAudioPlayers()
    }
  }, [isOpen, volume, notes])

  // Cleanup audio resources on unmount
  useEffect(() => {
    return () => {
      // Clean up all audio players and pitch shifters
      Object.values(audioPlayersRef.current).forEach(player => {
        if (player.state === 'started') {
          player.stop()
        }
        player.dispose()
      })
      Object.values(pitchShiftersRef.current).forEach(shifter => {
        shifter.dispose()
      })
      audioPlayersRef.current = {}
      pitchShiftersRef.current = {}
    }
  }, [])

  // Update volume when volume state changes
  useEffect(() => {
    const Tone = import('tone').then(Tone => {
      Object.values(audioPlayersRef.current).forEach(player => {
        if (player) {
          player.volume.value = Tone.gainToDb(volume)
        }
      })
    }).catch(error => {
      console.error('Failed to update volume:', error)
    })
  }, [volume])

  const playAudioNote = async (note: AudioNote) => {
    try {
      const player = audioPlayersRef.current[note.audioUrl]
      const pitchShifter = pitchShiftersRef.current[note.audioUrl]
      
      if (player && player.loaded && pitchShifter) {
        // Create a new player instance for this specific note to avoid conflicts
        const Tone = await import('tone')
        const notePlayer = new Tone.Player(note.audioUrl)
        notePlayer.volume.value = Tone.gainToDb(volume)
        
        // Create a dedicated pitch shifter for this note
        const notePitchShifter = new Tone.PitchShift({
          pitch: note.pitchShift,
          windowSize: PITCH_SHIFT_SETTINGS.windowSize,
          delayTime: PITCH_SHIFT_SETTINGS.delayTime,
          feedback: PITCH_SHIFT_SETTINGS.feedback
        }).toDestination()
        
        // Connect and play
        notePlayer.connect(notePitchShifter)
        notePlayer.start()
        
        // Clean up after playback
        const cleanup = () => {
          notePlayer.stop()
          notePlayer.disconnect()
          notePitchShifter.disconnect()
          notePlayer.dispose()
          notePitchShifter.dispose()
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
    
    onSavePattern?.(patternName, 'Audio Piano Roll Pattern', 'Audio', ['piano-roll', 'audio'])
    setPatternName('')
    setShowSaveForm(false)
  }

  const isNoteActive = (note: string, step: number) => {
    return notes.some(n => n.note === note && n.startStep === step)
  }

  const getNoteAtPosition = (note: string, step: number) => {
    return notes.find(n => n.note === note && n.startStep === step)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <Card className="w-[95vw] h-[90vh] bg-[#141414] border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Piano className="w-5 h-5" />
              Audio Piano Roll
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
                Clear All
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
          
          {/* Track Selection */}
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-300">Selected Track:</span>
              <select
                value={selectedTrack?.id || ''}
                onChange={(e) => {
                  const track = tracks.find(t => t.id === parseInt(e.target.value))
                  setSelectedTrack(track || null)
                }}
                className="bg-[#1a1a1a] border border-gray-600 rounded px-2 py-1 text-xs text-white"
              >
                <option value="">Select a track...</option>
                {tracks.filter(t => t.audioUrl).map(track => (
                  <option key={track.id} value={track.id}>
                    {track.name} - {track.audioName || 'Audio Sample'}
                  </option>
                ))}
              </select>
            </div>
            {selectedTrack && (
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${selectedTrack.color}`}></div>
                <span className="text-xs text-gray-300">
                  {selectedTrack.audioName || 'Audio Sample'}
                  {selectedTrack.key && ` (Key: ${selectedTrack.key})`}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => clearTrackNotes(selectedTrack.id)}
                  className="text-xs"
                >
                  Clear Track
                </Button>
              </div>
            )}
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
                    placeholder="My Audio Piano Roll Pattern"
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
                  title={`${note} - Click to test`}
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
                  Array.from({ length: steps }, (_, step) => {
                    const audioNote = getNoteAtPosition(note, step)
                    return (
                      <div
                        key={`${note}-${step}`}
                        className={`border-r border-b border-gray-600/30 cursor-pointer transition-colors relative ${
                          audioNote 
                            ? `${getNoteBackgroundColor(audioNote)} hover:opacity-80` 
                            : 'hover:bg-gray-600/30'
                        } ${currentStep === step ? 'ring-1 ring-yellow-400' : ''}`}
                        onClick={() => handleNoteClick(note, step)}
                        onMouseDown={() => handleNoteMouseDown(note, step)}
                        onMouseEnter={() => handleNoteMouseEnter(note, step)}
                        title={audioNote ? `${audioNote.audioName} (${audioNote.pitchShift > 0 ? '+' : ''}${audioNote.pitchShift} semitones)` : 'Click to place audio sample'}
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
              <div>Audio Notes: {notes.length}</div>
              <div>Tool: {tool === 'draw' ? 'Draw' : 'Erase'}</div>
              <div>Selected: {selectedTrack?.name || 'None'}</div>
            </div>
            <div className="mt-2 text-xs text-gray-400">
              <p>💡 <strong>How to use:</strong></p>
              <p>1. Select a track with audio from the dropdown</p>
              <p>2. Click on the grid to place audio samples at different pitches</p>
              <p>3. Higher notes = higher pitch, Lower notes = lower pitch</p>
              <p>4. Use the sequencer to trigger your pitched audio samples</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 