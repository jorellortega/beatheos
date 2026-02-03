'use client'

import { useState, useEffect, DragEvent } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { 
  Play, 
  Square, 
  Edit, 
  Trash2, 
  Save, 
  Copy, 
  Download, 
  Upload, 
  Search,
  Grid,
  List,
  Clock,
  Music,
  Plus,
  Package,
  Folder,
  Settings,
  CheckCircle2
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

// Track type for pattern editing
interface Track {
  id: number
  name: string
  audioUrl: string | null
  color: string
  midiNotes?: any[]
  sequencerData?: any
  audio_type?: string
  tags?: string[]
}

interface PianoRollEditorProps {
  track: any
  steps: number
  bpm: number
  onAddNote: (trackId: number, step: number, note: string, duration?: number) => void
  onRemoveNote: (trackId: number, noteId: string) => void
  onUpdateNote: (trackId: number, noteId: string, updates: any) => void
}

function PianoRollEditor({ track, steps, bpm, onAddNote, onRemoveNote, onUpdateNote }: PianoRollEditorProps) {
  const [selectedNote, setSelectedNote] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [visibleSteps, setVisibleSteps] = useState(16)
  const [scrollPosition, setScrollPosition] = useState(0)
  const [gridResolution, setGridResolution] = useState(4) // 1/4, 1/8, 1/16, 1/32
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; step: number; note: string } | null>(null)
  
  // Simple stable grid - no subdivisions to prevent crashes
  const stepsPerBeat = 4
  const totalGridSteps = steps // Always 16 steps, no subdivisions
  const [chopperModal, setChopperModal] = useState<{ step: number; note: string; divisions: number } | null>(null)
  const [chopperParams, setChopperParams] = useState({
    timeMultiplier: 1,
    pan: 0,
    velocity: 0.8,
    release: 0.1,
    modX: 0,
    modY: 0,
    pitch: 0,
    patternType: 'absolute' as 'absolute' | 'group',
    respectGrid: false
  })
  
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const octaves = [5, 4, 3, 2, 1, 0] // High to low
  const notes = octaves.flatMap(octave => 
    noteNames.map(note => `${note}${octave}`)
  )
  
  const handleGridClick = (step: number, note: string) => {
    console.log(`[PIANO ROLL] Grid click: step ${step + 1}, note ${note}`)
    
    // Apply grid snapping if enabled
    let snappedStep = step
    if (snapToGrid) {
      const gridSteps = 1 / gridResolution
      snappedStep = Math.round(step * gridResolution) / gridResolution
      console.log(`[PIANO ROLL] Grid snap: ${step} -> ${snappedStep} (grid: 1/${gridResolution})`)
    }
    
    const existingNote = track.midiNotes?.find((n: any) => 
      n.startStep === snappedStep && n.note === note
    )
    
    if (existingNote) {
      console.log(`[PIANO ROLL] Removing existing note:`, existingNote)
      onRemoveNote(track.id, existingNote.id)
    } else {
      console.log(`[PIANO ROLL] Adding new note: step ${snappedStep + 1}, note ${note}`)
      onAddNote(track.id, snappedStep, note)
    }
  }
  
  const handleNoteClick = (noteId: string) => {
    setSelectedNote(selectedNote === noteId ? null : noteId)
  }
  
  const handleNoteDrag = (noteId: string, newStep: number, newNote: string) => {
    onUpdateNote(track.id, noteId, { startStep: newStep, note: newNote })
  }

  const handleGridRightClick = (e: React.MouseEvent, step: number, note: string) => {
    e.preventDefault()
    console.log('[CONTEXT] Right-click detected:', { step, note, x: e.clientX, y: e.clientY })
    setContextMenu({ x: e.clientX, y: e.clientY, step, note })
  }

  const openChopper = (step: number, note: string, divisions: number) => {
    console.log('[CHOPPER] Opening chopper modal:', { step, note, divisions })
    setChopperModal({ step, note, divisions })
    setContextMenu(null)
  }

  const splitNote = (step: number, note: string, divisions: number) => {
    const existingNote = track.midiNotes?.find((n: any) => 
      n.startStep === step && n.note === note
    )
    
    if (existingNote) {
      // Remove the original note
      onRemoveNote(track.id, existingNote.id)
      
      // Add split notes
      const stepInterval = 1 / divisions
      for (let i = 0; i < divisions; i++) {
        const newStep = step + (i * stepInterval)
        if (snapToGrid) {
          const stepsPerBeat = 4
          const gridSteps = stepsPerBeat / gridResolution
          const snappedStep = Math.round(newStep / gridSteps) * gridSteps
          onAddNote(track.id, snappedStep, note, stepInterval)
        } else {
          onAddNote(track.id, newStep, note, stepInterval)
        }
      }
    }
    
    setContextMenu(null)
  }

  // Keyboard shortcuts for zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '=':
          case '+':
            e.preventDefault()
            const newZoomIn = Math.min(4, zoom + 0.25)
            setZoom(newZoomIn)
            setVisibleSteps(Math.max(8, Math.floor(16 / newZoomIn)))
            break
          case '-':
            e.preventDefault()
            const newZoomOut = Math.max(0.25, zoom - 0.25)
            setZoom(newZoomOut)
            setVisibleSteps(Math.max(8, Math.floor(16 / newZoomOut)))
            break
          case '0':
            e.preventDefault()
            setZoom(1)
            setVisibleSteps(16)
            setScrollPosition(0)
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [zoom])
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">{track.name}</h3>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-400">
            {track.midiNotes?.length || 0} notes • {bpm} BPM • {steps} steps
          </div>
          
          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Zoom:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newZoom = Math.max(0.25, zoom - 0.25)
                setZoom(newZoom)
                setVisibleSteps(Math.max(8, Math.floor(16 / newZoom)))
              }}
              className="w-8 h-8 p-0"
              title="Zoom Out (Ctrl/Cmd + -)"
            >
              -
            </Button>
            <span className="text-xs text-white min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newZoom = Math.min(4, zoom + 0.25)
                setZoom(newZoom)
                setVisibleSteps(Math.max(8, Math.floor(16 / newZoom)))
              }}
              className="w-8 h-8 p-0"
              title="Zoom In (Ctrl/Cmd + +)"
            >
              +
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setZoom(1)
                setVisibleSteps(16)
                setScrollPosition(0)
              }}
              className="text-xs"
              title="Reset Zoom (Ctrl/Cmd + 0)"
            >
              Reset
            </Button>
          </div>

          {/* Grid Snap Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Grid Snap:</span>
            <Button
              variant={snapToGrid ? "default" : "outline"}
              size="sm"
              onClick={() => setSnapToGrid(!snapToGrid)}
              className="w-8 h-8 p-0"
              title="Toggle Grid Snap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </Button>
          </div>
        </div>
      </div>
      
            <div className="flex-1 bg-[#0a0a0a] rounded-lg overflow-hidden">
        <div className="flex h-full">
          {/* Note Labels */}
          <div className="w-20 flex-shrink-0 bg-[#1a1a1a]">
            {notes.map((note) => (
              <div
                key={note}
                className="h-8 border-b border-gray-600 flex items-center justify-center text-xs font-mono text-gray-400"
              >
                {note}
              </div>
            ))}
          </div>
          
          {/* Grid Container with Scroll */}
          <div className="flex-1 overflow-auto">
            <div 
              className="grid gap-0 border-l border-gray-600"
              style={{ 
                gridTemplateColumns: `repeat(${totalGridSteps}, ${Math.max(40, 80 * zoom)}px)`,
                gridTemplateRows: `repeat(${notes.length}, 32px)`,
                minWidth: `${totalGridSteps * Math.max(40, 80 * zoom)}px`
              }}
            >
              {/* Grid cells */}
              {notes.map((note) => 
                Array.from({ length: totalGridSteps }, (_, step) => {
                  const isNoteActive = track.midiNotes?.some((n: any) => 
                    n.note === note && n.startStep === step
                  )
                  
                  // Calculate grid line styling
                  const isBeatLine = step % 4 === 0
                  const isGridLine = step % (4 / gridResolution) === 0
                  
                  return (
                    <div
                      key={`${note}-${step}`}
                      className={`border-r border-b cursor-pointer transition-colors ${
                        isBeatLine 
                          ? 'border-blue-400/50' 
                          : isGridLine 
                            ? 'border-gray-500/50' 
                            : 'border-gray-600/30'
                      } ${
                        isNoteActive 
                          ? 'bg-blue-500/80 hover:bg-blue-400/80' 
                          : 'hover:bg-gray-600/30'
                      }`}
                      onClick={() => handleGridClick(step, note)}
                      onContextMenu={(e) => handleGridRightClick(e, step, note)}
                      title={`${note} - Step ${step + 1} (Right-click for options)`}
                    />
                  )
                })
              )}
              
              {/* Step numbers */}
              <div className="absolute -top-6 left-0 right-0 flex bg-[#1a1a1a] border-b border-gray-600">
                {Array.from({ length: totalGridSteps }, (_, step) => {
                  const isBeatLine = step % 4 === 0
                  
                  return (
                    <div
                      key={step}
                      className={`text-center text-xs font-mono py-1 ${
                        isBeatLine ? 'text-blue-400' : 'text-gray-400'
                      }`}
                      style={{ width: `${Math.max(40, 80 * zoom)}px` }}
                    >
                      {isBeatLine ? step + 1 : ''}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Note Details */}
      {selectedNote && (
        <div className="mt-4 bg-[#1a1a1a] p-4 rounded-lg">
          <h4 className="text-white font-semibold mb-2">Note Details</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400">Note</label>
              <select
                value={track.midiNotes?.find((n: any) => n.id === selectedNote)?.note || ''}
                onChange={(e) => onUpdateNote(track.id, selectedNote, { note: e.target.value })}
                className="w-full bg-[#0a0a0a] border border-gray-600 rounded px-2 py-1 text-white text-sm"
              >
                {notes.map(note => (
                  <option key={note} value={note}>{note}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400">Step</label>
              <input
                type="number"
                min="0"
                max={steps - 1}
                value={track.midiNotes?.find((n: any) => n.id === selectedNote)?.startStep || 0}
                onChange={(e) => onUpdateNote(track.id, selectedNote, { startStep: parseInt(e.target.value) })}
                className="w-full bg-[#0a0a0a] border border-gray-600 rounded px-2 py-1 text-white text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Duration</label>
              <input
                type="number"
                min="1"
                max={steps}
                value={track.midiNotes?.find((n: any) => n.id === selectedNote)?.duration || 1}
                onChange={(e) => onUpdateNote(track.id, selectedNote, { duration: parseInt(e.target.value) })}
                className="w-full bg-[#0a0a0a] border border-gray-600 rounded px-2 py-1 text-white text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Velocity</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={track.midiNotes?.find((n: any) => n.id === selectedNote)?.velocity || 0.8}
                onChange={(e) => onUpdateNote(track.id, selectedNote, { velocity: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>
          <Button
            variant="destructive"
            size="sm"
            className="mt-2"
            onClick={() => {
              onRemoveNote(track.id, selectedNote)
              setSelectedNote(null)
            }}
          >
            Delete Note
          </Button>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="fixed z-50 bg-[#1a1a1a] border border-gray-600 rounded-lg shadow-lg p-2"
          style={{ 
            left: contextMenu.x, 
            top: contextMenu.y,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className="text-xs text-gray-400 mb-2 px-2">Split Note</div>
          <div className="space-y-1">
            {[2, 3, 4, 6, 8].map((divisions) => (
              <button
                key={divisions}
                className="block w-full text-left px-2 py-1 text-xs text-white hover:bg-gray-600 rounded"
                onClick={() => openChopper(contextMenu.step, contextMenu.note, divisions)}
              >
                Create {divisions} chopped notes
              </button>
            ))}
          </div>
          <div className="border-t border-gray-600 mt-2 pt-2">
            <button
              className="block w-full text-left px-2 py-1 text-xs text-gray-400 hover:bg-gray-600 rounded"
              onClick={() => setContextMenu(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Click outside to close context menu */}
      {contextMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setContextMenu(null)}
        />
      )}

      {/* Advanced Chopper Modal */}
      {chopperModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-[#1a1a1a] border border-gray-600 rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Piano Roll - Chopper</h3>
              <button
                onClick={() => setChopperModal(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Pattern Info */}
            <div className="mb-4 p-3 bg-[#0a0a0a] rounded">
              <div className="text-sm text-gray-400">Create Chopped Pattern</div>
              <div className="text-white font-mono">{chopperModal.note} starting at step {chopperModal.step + 1}</div>
              <div className="text-xs text-gray-500">Will create {chopperModal.divisions} consecutive notes</div>
            </div>

            {/* Time Multiplier */}
            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-2 block">Time mul</label>
              <div className="flex items-center gap-3">
                <div className="relative w-16 h-16">
                  <div className="w-full h-full border-2 border-gray-600 rounded-full flex items-center justify-center">
                    <div 
                      className="w-1 h-6 bg-orange-400 origin-bottom"
                      style={{ 
                        transform: `rotate(${(chopperParams.timeMultiplier - 1) * 90}deg)` 
                      }}
                    />
                  </div>
                </div>
                <input
                  type="range"
                  min="0.25"
                  max="4"
                  step="0.25"
                  value={chopperParams.timeMultiplier}
                  onChange={(e) => setChopperParams(prev => ({ ...prev, timeMultiplier: parseFloat(e.target.value) }))}
                  className="flex-1"
                />
                <span className="text-white text-sm w-12">{chopperParams.timeMultiplier}x</span>
              </div>
            </div>

            {/* Levels Controls */}
            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-2 block">Levels</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: 'pan', label: 'PAN', color: 'bg-cyan-400' },
                  { key: 'velocity', label: 'VEL', color: 'bg-green-400' },
                  { key: 'release', label: 'REL', color: 'bg-emerald-400' },
                  { key: 'modX', label: 'MOD X', color: 'bg-yellow-400' },
                  { key: 'modY', label: 'MOD Y', color: 'bg-orange-400' },
                  { key: 'pitch', label: 'PITCH', color: 'bg-pink-400' }
                ].map(({ key, label, color }) => (
                  <div key={key} className="text-center">
                    <div className="relative w-12 h-12 mx-auto mb-1">
                      <div className={`w-full h-full border-2 border-gray-600 rounded-full flex items-center justify-center ${color}`}>
                        <div 
                          className="w-1 h-4 bg-white origin-bottom"
                          style={{ 
                            transform: `rotate(${(chopperParams[key as keyof typeof chopperParams] as number) * 180 - 90}deg)` 
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">{label}</div>
                    <input
                      type="range"
                      min="-1"
                      max="1"
                      step="0.1"
                      value={chopperParams[key as keyof typeof chopperParams] as number}
                      onChange={(e) => setChopperParams(prev => ({ ...prev, [key]: parseFloat(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Pattern Type */}
            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-2 block">Pattern Type</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="absolute"
                    checked={chopperParams.patternType === 'absolute'}
                    onChange={(e) => setChopperParams(prev => ({ ...prev, patternType: e.target.value as 'absolute' | 'group' }))}
                    className="text-orange-500"
                  />
                  <span className="text-white text-sm">Absolute pattern</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="group"
                    checked={chopperParams.patternType === 'group'}
                    onChange={(e) => setChopperParams(prev => ({ ...prev, patternType: e.target.value as 'absolute' | 'group' }))}
                    className="text-orange-500"
                  />
                  <span className="text-white text-sm">Group notes</span>
                </label>
              </div>
            </div>

            {/* Grid Respect Toggle */}
            <div className="mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={chopperParams.respectGrid}
                  onChange={(e) => setChopperParams(prev => ({ ...prev, respectGrid: e.target.checked }))}
                  className="text-orange-500"
                />
                <span className="text-white text-sm">Respect grid snapping</span>
              </label>
              <div className="text-xs text-gray-500 mt-1">
                When enabled, chopped notes will snap to the current grid resolution
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  console.log('[CHOPPER] Test button clicked - adding a simple note')
                  onAddNote(track.id, chopperModal.step + 1, chopperModal.note, 0.5)
                }}
                className="flex-1"
              >
                Test Add Note
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setChopperParams({
                    timeMultiplier: 1,
                    pan: 0,
                    velocity: 0.8,
                    release: 0.1,
                    modX: 0,
                    modY: 0,
                    pitch: 0,
                    patternType: 'absolute',
                    respectGrid: false
                  })
                }}
                className="flex-1"
              >
                Reset
              </Button>
              <Button
                onClick={() => {
                  console.log('[CHOPPER] Starting chopper process...')
                  console.log('[CHOPPER] Modal data:', chopperModal)
                  console.log('[CHOPPER] Parameters:', chopperParams)
                  
                  // Remove any existing note at this position (optional)
                  const existingNote = track.midiNotes?.find((n: any) => 
                    n.startStep === chopperModal.step && n.note === chopperModal.note
                  )
                  
                  if (existingNote) {
                    console.log('[CHOPPER] Removing existing note...')
                    onRemoveNote(track.id, existingNote.id)
                  }
                  
                  // Calculate step interval for each chopped piece
                  const stepInterval = 1 / chopperModal.divisions
                  console.log('[CHOPPER] Step interval:', stepInterval)
                  
                  // Create chopped notes
                  for (let i = 0; i < chopperModal.divisions; i++) {
                    // Calculate the new step position with time multiplier
                    const newStep = chopperModal.step + (i * stepInterval * chopperParams.timeMultiplier)
                    
                                          // Apply grid snapping only if user wants it
                      let finalStep = newStep
                      if (chopperParams.respectGrid && snapToGrid) {
                        finalStep = Math.round(newStep * gridResolution) / gridResolution
                        console.log(`[CHOPPER] Grid snap: ${newStep} -> ${finalStep}`)
                      }
                    
                    console.log(`[CHOPPER] Adding chopped note ${i + 1}/${chopperModal.divisions}: step ${finalStep}, note ${chopperModal.note}`)
                    
                    // Use the proper onAddNote function
                    onAddNote(track.id, finalStep, chopperModal.note, stepInterval)
                  }
                  
                  console.log('[CHOPPER] Chopping complete!')
                  setChopperModal(null)
                }}
                className="flex-1"
              >
                Accept
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface SavedPattern {
  id: string
  user_id: string
  name: string
  description?: string
  tracks: Track[]
  sequencerData: { [trackId: number]: boolean[] }
  bpm: number
  steps: number
  created_at: string
  updated_at: string
  tags?: string[]
  category?: string
  pattern_type?: string
  pack_id?: string | null
  subfolder?: string | null
  pack?: PatternPack
}

interface PatternPack {
  id: string
  name: string
  description?: string
  cover_image_url?: string
  color: string
  created_at: string
  updated_at: string
  item_count?: number
  subfolders?: PatternSubfolder[]
}

interface PatternSubfolder {
  id: string
  pack_id: string
  name: string
  description?: string
  color: string
  position: number
  created_at: string
  updated_at: string
}

function EditPatternsPage() {
  const { user } = useAuth()
  const [patterns, setPatterns] = useState<SavedPattern[]>([])
  const [allPatterns, setAllPatterns] = useState<SavedPattern[]>([]) // For packs view
  const [loading, setLoading] = useState(true)
  
  // MIDI Parser Functions - moved to top to avoid hoisting issues
  const getNoteName = (midiNote: number) => {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    const octave = Math.floor(midiNote / 12) - 1
    const noteIndex = midiNote % 12
    return `${noteNames[noteIndex]}${octave}`
  }
  
  const readVariableLength = (dataView: DataView, offset: number) => {
    let value = 0
    let bytesRead = 0
    
    while (bytesRead < 4) {
      const byte = dataView.getUint8(offset + bytesRead)
      value = (value << 7) | (byte & 0x7F)
      bytesRead++
      
      if ((byte & 0x80) === 0) break
    }
    
    return { value, bytesRead }
  }
  
  const getTrackColor = (index: number) => {
    const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-gray-500']
    return colors[index % colors.length]
  }
  
  const getTrackColorByType = (audioType: string) => {
    const colorMap: { [key: string]: string } = {
      kick: 'bg-red-500',
      snare: 'bg-blue-500',
      hihat: 'bg-green-500',
      crash: 'bg-yellow-500',
      tom: 'bg-orange-500',
      bass: 'bg-purple-500',
      melody: 'bg-pink-500',
      lead: 'bg-indigo-500',
      pad: 'bg-teal-500',
      arp: 'bg-cyan-500',
      fx: 'bg-gray-500',
      vocal: 'bg-rose-500',
      piano: 'bg-amber-500',
      synth: 'bg-violet-500',
      guitar: 'bg-emerald-500',
      percussion: 'bg-slate-500',
      other: 'bg-gray-500'
    }
    return colorMap[audioType] || 'bg-gray-500'
  }
  
  const parseMIDIFile = (arrayBuffer: ArrayBuffer) => {
    try {
        const dataView = new DataView(arrayBuffer)
      let offset = 0
      
      // Check MIDI header
      const header = String.fromCharCode(...new Uint8Array(arrayBuffer, 0, 4))
      if (header !== 'MThd') {
        throw new Error('Invalid MIDI file: Missing MThd header')
      }
      
      console.log('[MIDI PARSER] Valid MIDI header found')
      console.log('[MIDI PARSER] File size:', arrayBuffer.byteLength, 'bytes')
      
      offset += 4
      const headerLength = dataView.getUint32(offset)
      offset += 4
      const format = dataView.getUint16(offset)
      offset += 2
      const numTracks = dataView.getUint16(offset)
      offset += 2
      const timeDivision = dataView.getUint16(offset)
      offset += 2
      
      console.log('[MIDI PARSER] Header length:', headerLength)
      console.log('[MIDI PARSER] Format:', format)
      console.log('[MIDI PARSER] Number of tracks:', numTracks)
      console.log('[MIDI PARSER] Time division:', timeDivision)
      
      // Calculate BPM (assuming 120 BPM if not specified)
      let bpm = 120
      let ticksPerBeat = timeDivision
      
      const tracks: any[] = []
      
      // Parse tracks
      for (let trackIndex = 0; trackIndex < numTracks; trackIndex++) {
        if (offset >= arrayBuffer.byteLength) break
        
        const trackHeader = String.fromCharCode(...new Uint8Array(arrayBuffer, offset, 4))
        if (trackHeader !== 'MTrk') {
          console.warn(`Invalid track header at offset ${offset}: ${trackHeader}`)
          break
        }
        
        offset += 4
        const trackLength = dataView.getUint32(offset)
        offset += 4
        const trackEnd = offset + trackLength
        
        const track = {
          notes: [] as any[],
          tempo: 120,
          name: `Track ${trackIndex + 1}`
        }
        
        let absoluteTime = 0
        
        while (offset < trackEnd) {
          const deltaTime = readVariableLength(dataView, offset)
          offset += deltaTime.bytesRead
          absoluteTime += deltaTime.value
          
          if (offset >= trackEnd) break
          
          const eventType = dataView.getUint8(offset)
          offset++
          
          console.log(`[MIDI PARSER] Track ${trackIndex}, Event: 0x${eventType.toString(16)}, Time: ${absoluteTime}`)
          
          if (eventType === 0xFF) {
            // Meta event
            const metaType = dataView.getUint8(offset)
            offset++
            const metaLength = readVariableLength(dataView, offset)
            offset += metaLength.bytesRead
            
            if (metaType === 0x03) {
              // Track name
              const nameBytes = new Uint8Array(arrayBuffer, offset, metaLength.value)
              // Filter out null bytes and other problematic characters before decoding
              const cleanBytes = nameBytes.filter(byte => byte !== 0 && byte >= 32 && byte <= 126)
              if (cleanBytes.length > 0) {
                track.name = new TextDecoder().decode(cleanBytes)
              } else {
                track.name = `Track ${trackIndex + 1}`
              }
            } else if (metaType === 0x51) {
              // Tempo
              const tempo = (dataView.getUint8(offset) << 16) | 
                           (dataView.getUint8(offset + 1) << 8) | 
                           dataView.getUint8(offset + 2)
              track.tempo = Math.round(60000000 / tempo)
              if (trackIndex === 0) bpm = track.tempo // Use first track's tempo as global BPM
            }
            
            offset += metaLength.value
                      } else if (eventType >= 0x80 && eventType <= 0xEF) {
              // MIDI event
              const channel = eventType & 0x0F
              const event = eventType >> 4
              
              if (event === 0x9) {
                // Note On
                const note = dataView.getUint8(offset)
                offset++
                const velocity = dataView.getUint8(offset)
                offset++
                
                console.log(`[MIDI PARSER] Note On: ${note} (${getNoteName(note)}), Velocity: ${velocity}, Channel: ${channel}`)
                
                if (velocity > 0) {
                  track.notes.push({
                    note: note,
                    startTime: absoluteTime,
                    velocity: velocity,
                    channel: channel
                  })
                }
              } else if (event === 0x8) {
                // Note Off
                const note = dataView.getUint8(offset)
                offset++
                const velocity = dataView.getUint8(offset)
                offset++
                
                console.log(`[MIDI PARSER] Note Off: ${note} (${getNoteName(note)}), Channel: ${channel}`)
                
                // Find corresponding note on and set end time
                const noteOn = track.notes.find(n => n.note === note && !n.endTime)
                if (noteOn) {
                  noteOn.endTime = absoluteTime
                  noteOn.duration = absoluteTime - noteOn.startTime
                  console.log(`[MIDI PARSER] Note duration: ${noteOn.duration} ticks`)
                }
              } else {
                // Skip other MIDI events
                offset += 2
              }
            } else {
              // Skip unknown events
              offset++
            }
        }
        
        tracks.push(track)
      }
      
      console.log(`[MIDI PARSER] Successfully parsed MIDI file: ${numTracks} tracks, ${bpm} BPM`)
      
      return {
        format,
        numTracks,
        timeDivision,
        bpm,
        tracks
      }
    } catch (error) {
      console.error('Error parsing MIDI file:', error)
      return null
    }
  }
  
  const convertMIDIToSequencer = (midiData: any) => {
    console.log('[MIDI CONVERTER] Starting conversion...')
    console.log('[MIDI CONVERTER] MIDI data:', midiData)
    
    const tracks: Track[] = []
    const sequencerData: { [trackId: number]: boolean[] } = {}
    
    // Determine steps based on the longest track
    let maxSteps = 16
    // Fix: Use proper time division calculation
    // MIDI time division is typically 480 ticks per quarter note
    // For 16th notes, we divide by 4
    const ticksPerQuarterNote = midiData.timeDivision
    const ticksPerStep = ticksPerQuarterNote / 4 // 16th notes
    
    console.log('[MIDI CONVERTER] Ticks per quarter note:', ticksPerQuarterNote)
    console.log('[MIDI CONVERTER] Ticks per step (16th note):', ticksPerStep)
    
    midiData.tracks.forEach((track: any, trackIndex: number) => {
      console.log(`[MIDI CONVERTER] Processing track ${trackIndex}:`, track)
      console.log(`[MIDI CONVERTER] Track ${trackIndex} has ${track.notes.length} notes`)
      
      if (track.notes.length === 0) {
        console.log(`[MIDI CONVERTER] Skipping track ${trackIndex} - no notes`)
        return
      }
      
      // Calculate track length in steps
      const maxTime = Math.max(...track.notes.map((n: any) => n.endTime || n.startTime))
      const trackSteps = Math.max(16, Math.ceil(maxTime / ticksPerStep))
      maxSteps = Math.max(maxSteps, trackSteps)
      
      console.log(`[MIDI CONVERTER] Track ${trackIndex} max time: ${maxTime}, steps: ${trackSteps}`)
    })
    
    // Create tracks and sequencer data
    midiData.tracks.forEach((track: any, trackIndex: number) => {
      if (track.notes.length === 0) return
      
      const trackId = trackIndex + 1
      
      // Calculate the maximum time in the track
      const maxTime = Math.max(...track.notes.map((n: any) => n.endTime || n.startTime))
      const trackSteps = Math.max(16, Math.ceil(maxTime / ticksPerStep))
      
      console.log(`[MIDI CONVERTER] Creating track ${trackId}`)
      console.log(`[MIDI CONVERTER] Track max time: ${maxTime} ticks`)
      console.log(`[MIDI CONVERTER] Track steps: ${trackSteps}`)
      
      // Create track
      const convertedNotes = track.notes.map((note: any) => {
        // Fix: Ensure proper step calculation
        const startStep = Math.max(0, Math.floor(note.startTime / ticksPerStep))
        const duration = Math.max(1, Math.ceil((note.duration || 1) / ticksPerStep))
        
        const convertedNote = {
          id: `${trackId}-${note.note}-${note.startTime}`,
          note: getNoteName(note.note),
          startStep: startStep,
          duration: duration,
          velocity: note.velocity / 127
        }
        console.log(`[MIDI CONVERTER] Converting note:`, note, '->', convertedNote)
        return convertedNote
      })
      
      tracks.push({
        id: trackId,
        name: track.name || `MIDI Track ${trackId}`,
        audioUrl: null,
        color: getTrackColor(trackId - 1),
        midiNotes: convertedNotes
      })
      
      // Create sequencer data based on converted notes
      const trackSequencerData = new Array(trackSteps).fill(false)
      convertedNotes.forEach((note: any) => {
        if (note.startStep < trackSteps) {
          trackSequencerData[note.startStep] = true
          console.log(`[MIDI CONVERTER] Setting step ${note.startStep} to true for track ${trackId} (note: ${note.note})`)
        }
      })
      
      sequencerData[trackId] = trackSequencerData
      console.log(`[MIDI CONVERTER] Track ${trackId} sequencer data:`, trackSequencerData)
    })
    
    console.log('[MIDI CONVERTER] Final result:', {
      tracks,
      sequencerData,
      steps: maxSteps,
      bpm: midiData.bpm
    })
    
    return {
      tracks,
      sequencerData,
      steps: maxSteps,
      bpm: midiData.bpm
    }
  }
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedPatternType, setSelectedPatternType] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'packs'>('grid')
  const [editingPattern, setEditingPattern] = useState<SavedPattern | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingDescription, setEditingDescription] = useState('')
  const [editingCategory, setEditingCategory] = useState('')
  const [editingPatternType, setEditingPatternType] = useState('')
  const [editingTags, setEditingTags] = useState('')
  const [editingNotes, setEditingNotes] = useState<SavedPattern | null>(null)
  const [selectedTrackForNotes, setSelectedTrackForNotes] = useState<number | null>(null)
  const [isPlaying, setIsPlaying] = useState<string | null>(null)
  const [categories, setCategories] = useState<string[]>()
  const [importingMIDI, setImportingMIDI] = useState(false)
  const [importProgress, setImportProgress] = useState('')
  const [previewPattern, setPreviewPattern] = useState<any>(null)
  const [patternName, setPatternName] = useState('')
  const [patternType, setPatternType] = useState('')
  
  // Pattern Packs
  const [patternPacks, setPatternPacks] = useState<PatternPack[]>([])
  const [loadingPacks, setLoadingPacks] = useState(false)
  const [packError, setPackError] = useState<string | null>(null)
  const [selectedPack, setSelectedPack] = useState<string | null>(null)
  
  // Pack creation modal
  const [showPackModal, setShowPackModal] = useState(false)
  const [newPack, setNewPack] = useState({ name: '', description: '', color: '#3B82F6' })
  const [packCreating, setPackCreating] = useState(false)
  const [packCreateError, setPackCreateError] = useState<string | null>(null)
  
  // Subfolders
  const [subfolders, setSubfolders] = useState<PatternSubfolder[]>([])
  const [expandedSubfolders, setExpandedSubfolders] = useState<Set<string>>(new Set())
  const [showSubfolderModal, setShowSubfolderModal] = useState(false)
  const [newSubfolder, setNewSubfolder] = useState({ name: '', description: '', color: '#6B7280', pack_id: '' })
  const [subfolderCreating, setSubfolderCreating] = useState(false)
  
  // Drag and drop
  const [draggedPattern, setDraggedPattern] = useState<SavedPattern | null>(null)
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null)
  
  // File upload from computer
  const [isDraggingFiles, setIsDraggingFiles] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({
    isUploading: false,
    currentFile: '',
    currentIndex: 0,
    totalFiles: 0,
    completedFiles: [] as string[]
  })

  // Pattern metadata editing
  const [editingPatternMetadata, setEditingPatternMetadata] = useState<SavedPattern | null>(null)
  const [editingTrackMetadata, setEditingTrackMetadata] = useState<{ [trackId: number]: any }>({})

  // Mass edit functionality
  const [selectedPatterns, setSelectedPatterns] = useState<Set<string>>(new Set())
  const [showMassEditModal, setShowMassEditModal] = useState(false)
  const [massEditValues, setMassEditValues] = useState({
    category: '',
    pattern_type: '',
    tags: '',
    bpm: '',
    key: ''
  })
  const [selectedMassEditFields, setSelectedMassEditFields] = useState<Set<string>>(new Set())
  const [massEditLoading, setMassEditLoading] = useState(false)

  // Pack search functionality
  const [packSearchTerm, setPackSearchTerm] = useState('')
  const [packFilterCategory, setPackFilterCategory] = useState('all')
  const [packFilterType, setPackFilterType] = useState('all')

  useEffect(() => {
    loadPatterns()
    loadPatternPacks()
  }, [user])

  // Global drag and drop detection for file uploads
  useEffect(() => {
    const handleWindowDragOver = (e: globalThis.DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) {
        e.preventDefault()
        setIsDraggingFiles(true)
      }
    }

    const handleWindowDragLeave = (e: globalThis.DragEvent) => {
      // Only clear if we're leaving the window entirely
      if (e.clientX === 0 && e.clientY === 0) {
        setIsDraggingFiles(false)
      }
    }

    const handleWindowDrop = (e: globalThis.DragEvent) => {
      e.preventDefault()
      setIsDraggingFiles(false)
    }

    window.addEventListener('dragover', handleWindowDragOver)
    window.addEventListener('dragleave', handleWindowDragLeave)
    window.addEventListener('drop', handleWindowDrop)

    return () => {
      window.removeEventListener('dragover', handleWindowDragOver)
      window.removeEventListener('dragleave', handleWindowDragLeave)
      window.removeEventListener('drop', handleWindowDrop)
    }
  }, [])

  const loadPatterns = async () => {
    try {
      if (!user?.id) {
        alert('Please log in to view patterns')
        return
      }
      
      // Load all patterns for packs view
      const { data: allData, error: allError } = await supabase
        .from('saved_patterns')
        .select(`
          *,
          pack:pattern_packs(id, name, color)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (allError) {
        console.error('Error loading all patterns:', allError)
        return
      }
      setAllPatterns(allData || [])
      
      // Load patterns for grid/list view (filtered)
      const { data, error } = await supabase
        .from('saved_patterns')
        .select(`
          *,
          pack:pattern_packs(id, name, color)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error loading patterns:', error)
        return
      }
      setPatterns(data || [])
      const uniqueCategories = [...new Set(data?.map(p => p.category).filter(Boolean) || [])]
      setCategories(uniqueCategories)
      
      // Load pattern packs
      await loadPatternPacks()
    } catch (error) {
      console.error('Error loading patterns:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPatternPacks = async () => {
    if (!user) return
    setLoadingPacks(true)
    
    try {
      const { data, error } = await supabase
        .from('pattern_packs')
        .select(`
          *,
          item_count:saved_patterns(count),
          subfolders:pattern_subfolders(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error loading pattern packs:', error)
        return
      }
      
      setPatternPacks(data || [])
      
      // Load subfolders separately for easier access
      const { data: subfoldersData, error: subfoldersError } = await supabase
        .from('pattern_subfolders')
        .select('*')
        .in('pack_id', data?.map(pack => pack.id) || [])
        .order('position', { ascending: true })
      
      if (!subfoldersError) {
        setSubfolders(subfoldersData || [])
      }
    } catch (error) {
      console.error('Error loading pattern packs:', error)
    } finally {
      setLoadingPacks(false)
    }
  }

  // Handle create pack
  const handleCreatePack = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return
    
    setPackCreating(true)
    setPackCreateError(null)
    
    try {
      const { error } = await supabase
        .from('pattern_packs')
        .insert([{
          user_id: user.id,
          name: newPack.name,
          description: newPack.description,
          color: newPack.color
        }])
      
      if (error) {
        setPackCreateError(error.message)
        setPackCreating(false)
        return
      }
      
      setShowPackModal(false)
      setNewPack({ name: '', description: '', color: '#3B82F6' })
      setPackCreating(false)
      
      // Refresh packs
      await loadPatternPacks()
    } catch (error) {
      console.error('Error creating pack:', error)
      setPackCreateError('Failed to create pack')
      setPackCreating(false)
    }
  }

  // Handle delete pack
  const handleDeletePack = async (packId: string) => {
    if (!confirm('Are you sure you want to delete this pack? This will move all patterns to unpacked.')) return
    
    try {
      // Move all patterns in this pack to unpacked
      const { error: updateError } = await supabase
        .from('saved_patterns')
        .update({ pack_id: null, subfolder: null })
        .eq('pack_id', packId)
      
      if (updateError) {
        console.error('Error moving patterns:', updateError)
        return
      }
      
      // Delete the pack
      const { error: deleteError } = await supabase
        .from('pattern_packs')
        .delete()
        .eq('id', packId)
      
      if (deleteError) {
        console.error('Error deleting pack:', deleteError)
        return
      }
      
      // Update local state
      setAllPatterns(prev => prev.map(p => 
        p.pack_id === packId 
          ? { ...p, pack_id: null, subfolder: null, pack: undefined }
          : p
      ))
      setPatternPacks(prev => prev.filter(p => p.id !== packId))
    } catch (error) {
      console.error('Error deleting pack:', error)
    }
  }

  // Handle create subfolder
  const handleCreateSubfolder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSubfolderCreating(true)
    
    try {
      const { error } = await supabase
        .from('pattern_subfolders')
        .insert([newSubfolder])
      
      if (error) {
        console.error('Error creating subfolder:', error)
        return
      }
      
      setShowSubfolderModal(false)
      setNewSubfolder({ name: '', description: '', color: '#6B7280', pack_id: '' })
      
      // Refresh data
      await loadPatternPacks()
    } catch (error) {
      console.error('Error creating subfolder:', error)
    } finally {
      setSubfolderCreating(false)
    }
  }

  // Handle delete subfolder
  const handleDeleteSubfolder = async (subfolderId: string) => {
    if (!user) return
    
    // Confirm deletion
    if (!confirm('Are you sure you want to delete this subfolder? This will move all patterns to the root of the pack.')) {
      return
    }
    
    try {
      // First, get the subfolder details to find associated patterns
      const { data: subfolderData, error: subfolderError } = await supabase
        .from('pattern_subfolders')
        .select('name, pack_id')
        .eq('id', subfolderId)
        .single()
        
      if (subfolderError) {
        console.error('Error fetching subfolder:', subfolderError)
        return
      }
      
      console.log(`Deleting subfolder "${subfolderData.name}" and moving patterns to root...`)
      
      // Move all patterns in this subfolder to root of pack
      const { error: patternUpdateError } = await supabase
        .from('saved_patterns')
        .update({ subfolder: null })
        .eq('pack_id', subfolderData.pack_id)
        .eq('subfolder', subfolderData.name)
        
      if (patternUpdateError) {
        console.error('Error moving patterns:', patternUpdateError)
        return
      }
      
      // Then delete the subfolder itself
      const { error: subfolderDeleteError } = await supabase
        .from('pattern_subfolders')
        .delete()
        .eq('id', subfolderId)
        
      if (subfolderDeleteError) {
        console.error('Error deleting subfolder:', subfolderDeleteError)
        return
      }
      
      console.log(`Successfully deleted subfolder "${subfolderData.name}"`)
      
      // Update local state
      setSubfolders(subfolders.filter(sf => sf.id !== subfolderId))
      setAllPatterns(prev => prev.map(p => 
        p.pack_id === subfolderData.pack_id && p.subfolder === subfolderData.name
          ? { ...p, subfolder: null }
          : p
      ))
      
      // Refresh packs to update subfolder counts
      await loadPatternPacks()
    } catch (error) {
      console.error('Error deleting subfolder:', error)
    }
  }

  // Toggle subfolder expansion
  const toggleSubfolder = (subfolderId: string) => {
    const newExpanded = new Set(expandedSubfolders)
    if (newExpanded.has(subfolderId)) {
      newExpanded.delete(subfolderId)
    } else {
      newExpanded.add(subfolderId)
    }
    setExpandedSubfolders(newExpanded)
  }

  // Handle drag and drop
  const handleDragStart = (e: React.DragEvent, pattern: SavedPattern) => {
    console.log('Drag start:', pattern.name, pattern.id)
    setDraggedPattern(pattern)
    e.dataTransfer.effectAllowed = 'move'
    // Set some data to make the drag work better
    e.dataTransfer.setData('text/plain', pattern.id)
  }

  const handleDragEnd = () => {
    console.log('Drag end')
    setDraggedPattern(null)
    setDragOverTarget(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDragEnter = (target: string) => {
    console.log('Drag enter target:', target)
    setDragOverTarget(target)
  }

  const handleDragLeave = () => {
    console.log('Drag leave')
    setDragOverTarget(null)
  }

  const handleDrop = async (e: React.DragEvent, packId: string | null, subfolderName?: string) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('Drop event:', packId, subfolderName, draggedPattern?.name)
    
    if (!user) {
      console.log('No user')
      return
    }

    setDragOverTarget(null)

    // Handle file uploads from computer
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      console.log('Files dropped:', e.dataTransfer.files.length)
      console.log('File types:', Array.from(e.dataTransfer.files).map(f => ({ name: f.name, type: f.type, size: f.size })))
      
      // Convert FileList to Array for better handling
      const filesArray = Array.from(e.dataTransfer.files)
      const midiFiles = filesArray.filter(file => {
        const midiExtensions = ['.mid', '.midi']
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
        const isMidi = midiExtensions.includes(fileExtension)
        console.log(`File ${file.name}: type=${file.type}, extension=${fileExtension}, isMidi=${isMidi}`)
        return isMidi
      })
      
      console.log('MIDI files to convert to patterns:', midiFiles.map(f => f.name))
      
      if (midiFiles.length === 0) {
        console.log('No MIDI files to convert to patterns')
        // For non-MIDI files, we could upload to audio library, but let's focus on patterns for now
        return
      }
      
      // Initialize upload progress
      setUploadProgress({
        isUploading: true,
        currentFile: '',
        currentIndex: 0,
        totalFiles: midiFiles.length,
        completedFiles: []
      })
      
      let successfulUploads = 0
      let processedFiles = 0
      
      for (const file of midiFiles) {
        processedFiles++
        
        // Update upload progress
        setUploadProgress(prev => ({
          ...prev,
          currentFile: file.name,
          currentIndex: processedFiles
        }))
        
        console.log(`Processing MIDI file ${processedFiles}/${midiFiles.length}: ${file.name}`)

        try {
          console.log(`Converting MIDI file to pattern: ${file.name}...`)
          
          // Read the MIDI file
          const arrayBuffer = await file.arrayBuffer()
          
          // Parse MIDI file using the existing functions
          const midiData = parseMIDIFile(arrayBuffer)
          
          if (!midiData) {
            console.error(`Failed to parse MIDI file: ${file.name}`)
            continue
          }
          
          console.log(`MIDI parsed successfully: ${midiData.tracks.length} tracks, ${midiData.bpm} BPM`)
          
          // Convert MIDI data to sequencer format
          const sequencerData = convertMIDIToSequencer(midiData)
          
          console.log(`Converted to sequencer format:`, sequencerData)
          
          // Validate the conversion
          if (sequencerData.tracks.length === 0) {
            console.error(`No tracks found after conversion for ${file.name}`)
            continue
          }
          
          // Create pattern name from filename
          const patternName = file.name.replace(/\.(mid|midi)$/i, '')
          
          // Enhance tracks with metadata for sequencer compatibility
          const enhancedTracks = sequencerData.tracks.map((track, index) => {
            // Determine audio type based on track name or MIDI channel
            let audioType = 'other'
            const trackNameLower = track.name.toLowerCase()
            
            if (trackNameLower.includes('kick') || trackNameLower.includes('bass drum')) {
              audioType = 'kick'
            } else if (trackNameLower.includes('snare') || trackNameLower.includes('clap')) {
              audioType = 'snare'
            } else if (trackNameLower.includes('hi') || trackNameLower.includes('hat') || trackNameLower.includes('cymbal')) {
              audioType = 'hihat'
            } else if (trackNameLower.includes('crash') || trackNameLower.includes('ride')) {
              audioType = 'crash'
            } else if (trackNameLower.includes('tom')) {
              audioType = 'tom'
            } else if (trackNameLower.includes('bass') || trackNameLower.includes('sub') || trackNameLower.includes('808')) {
              audioType = 'bass'
            } else if (trackNameLower.includes('melody') || trackNameLower.includes('lead')) {
              audioType = 'melody'
            } else if (trackNameLower.includes('pad') || trackNameLower.includes('chord')) {
              audioType = 'pad'
            } else if (trackNameLower.includes('arp')) {
              audioType = 'arp'
            } else if (trackNameLower.includes('fx') || trackNameLower.includes('effect')) {
              audioType = 'fx'
            } else if (trackNameLower.includes('vocal')) {
              audioType = 'vocal'
            } else if (trackNameLower.includes('piano') || trackNameLower.includes('keys')) {
              audioType = 'piano'
            } else if (trackNameLower.includes('synth')) {
              audioType = 'synth'
            } else if (trackNameLower.includes('guitar')) {
              audioType = 'guitar'
            } else if (trackNameLower.includes('percussion') || trackNameLower.includes('perc')) {
              audioType = 'percussion'
            }
            
            // Estimate key from MIDI notes (simple heuristic)
            let estimatedKey = 'C'
            if (track.midiNotes && track.midiNotes.length > 0) {
              const notes = track.midiNotes.map(note => note.note)
              const noteCounts: { [key: string]: number } = {}
              
              notes.forEach(note => {
                const baseNote = note.replace(/\d+$/, '') // Remove octave
                noteCounts[baseNote] = (noteCounts[baseNote] || 0) + 1
              })
              
              // Find most common note as potential key
              const mostCommonNote = Object.entries(noteCounts)
                .sort(([,a], [,b]) => b - a)[0]?.[0]
              
              if (mostCommonNote) {
                estimatedKey = mostCommonNote
              }
            }
            
            return {
              ...track,
              // Add sequencer-compatible metadata
              bpm: midiData.bpm,
              key: estimatedKey,
              audio_type: audioType,
              tags: [`imported`, `midi`, audioType],
              // Add tempo and pitch properties for sequencer
              originalBpm: midiData.bpm,
              currentBpm: midiData.bpm,
              playbackRate: 1.0,
              originalKey: estimatedKey,
              currentKey: estimatedKey,
              pitchShift: 0,
              // Add color based on audio type
              color: getTrackColorByType(audioType)
            }
          })
          
          // Sanitize pattern data to prevent database errors
          const sanitizeString = (str: string) => {
            if (!str) return str
            // Remove null characters and other problematic Unicode sequences
            return str.replace(/\u0000/g, '').replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
          }
          
          const sanitizeTracks = (tracks: any[]) => {
            return tracks.map(track => ({
              ...track,
              name: sanitizeString(track.name),
              // Sanitize any string properties in the track
              audio_type: sanitizeString(track.audio_type),
              key: sanitizeString(track.key),
              originalKey: sanitizeString(track.originalKey),
              currentKey: sanitizeString(track.currentKey),
              // Sanitize tags array
              tags: track.tags?.map((tag: string) => sanitizeString(tag)).filter(Boolean) || []
            }))
          }
          
          // Save as pattern to saved_patterns table
          const patternData = {
            user_id: user.id,
            name: sanitizeString(patternName),
            description: sanitizeString(`Imported from ${file.name} - ${midiData.tracks.length} tracks, ${midiData.bpm} BPM`),
            tracks: sanitizeTracks(enhancedTracks),
            sequencer_data: sequencerData.sequencerData,
            bpm: midiData.bpm,
            steps: sequencerData.steps,
            pack_id: packId,
            subfolder: subfolderName ? sanitizeString(subfolderName) : null,
            pattern_type: 'imported',
            category: 'imported'
          }
          
          console.log(`Saving pattern to database:`, patternData)

          const { data: newPattern, error: dbError } = await supabase
            .from('saved_patterns')
            .insert([patternData])
            .select()
            .single()

          if (dbError) {
            console.error(`Database error saving pattern for ${file.name}:`, dbError)
            // Try to provide more specific error information
            if (dbError.message?.includes('Unicode') || dbError.message?.includes('\\u0000')) {
              console.error('Unicode encoding issue detected. This may be due to invalid characters in the MIDI file.')
            }
            continue
          }

          console.log(`Pattern created successfully: ${newPattern.name}`)
          successfulUploads++
          
          // Update local state to show the new pattern
          setAllPatterns(prev => [newPattern, ...prev])
          
          // Update upload progress with completed file
          setUploadProgress(prev => ({
            ...prev,
            completedFiles: [...prev.completedFiles, `${file.name} → ${patternName}`]
          }))
        } catch (error) {
          console.error(`Error converting MIDI file ${file.name}:`, error)
          // Still update progress even on error to show we tried this file
          setUploadProgress(prev => ({
            ...prev,
            completedFiles: [...prev.completedFiles, `❌ ${file.name} (failed)`]
          }))
        }
      }
      
      // Reset upload progress
      setUploadProgress({
        isUploading: false,
        currentFile: '',
        currentIndex: 0,
        totalFiles: 0,
        completedFiles: []
      })
      
      if (successfulUploads > 0) {
        console.log(`Conversion complete: ${successfulUploads}/${midiFiles.length} MIDI files converted to patterns`)
        // Refresh patterns to show new ones
        await loadPatterns()
      } else {
        console.log('No MIDI files were converted successfully')
      }
      return
    }

    // Handle moving existing patterns
    if (!draggedPattern) {
      console.log('No dragged pattern')
      return
    }
    
    try {
      const { error } = await supabase
        .from('saved_patterns')
        .update({ 
          pack_id: packId,
          subfolder: subfolderName || null
        })
        .eq('id', draggedPattern.id)
      
      if (error) {
        console.error('Error moving pattern:', error)
        return
      }
      
      console.log('Successfully moved pattern to pack:', packId, 'subfolder:', subfolderName)
      
      // Update local state
      setAllPatterns(prev => prev.map(p => 
        p.id === draggedPattern.id 
          ? { 
              ...p, 
              pack_id: packId, 
              subfolder: subfolderName || null,
              pack: packId ? patternPacks.find(pack => pack.id === packId) : undefined 
            }
          : p
      ))
      
      setDraggedPattern(null)
      setDragOverTarget(null)
    } catch (error) {
      console.error('Error moving pattern:', error)
    }
  }

  const deletePattern = async (patternId: string) => {
    if (!confirm('Are you sure you want to delete this pattern?')) return
    try {
      const { error } = await supabase
        .from('saved_patterns')
        .delete()
        .eq('id', patternId)
      if (error) {
        console.error('Error deleting pattern:', error)
        return
      }
      setPatterns(prev => prev.filter(p => p.id !== patternId))
    } catch (error) {
      console.error('Error deleting pattern:', error)
    }
  }

  const duplicatePattern = async (pattern: SavedPattern) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const newPattern = {
        ...pattern,
        id: undefined,
        name: `${pattern.name} (Copy)`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      const { data, error } = await supabase
        .from('saved_patterns')
        .insert([{
          user_id: user.id,
          name: newPattern.name,
          description: newPattern.description,
          tracks: newPattern.tracks,
          sequencer_data: newPattern.sequencerData,
          bpm: newPattern.bpm,
          steps: newPattern.steps,
          tags: newPattern.tags,
          category: newPattern.category
        }])
        .select()
        .single()
      if (error) {
        console.error('Error duplicating pattern:', error)
        return
      }
      setPatterns(prev => [data, ...prev])
    } catch (error) {
      console.error('Error duplicating pattern:', error)
    }
  }

  const exportPattern = (pattern: SavedPattern) => {
    const dataStr = JSON.stringify(pattern, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${pattern.name}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const importPatterns = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const text = await file.text()
        const pattern = JSON.parse(text)
        const { error } = await supabase
          .from('saved_patterns')
          .insert([{
            user_id: user.id,
            name: pattern.name,
            description: pattern.description,
            tracks: pattern.tracks,
            sequencer_data: pattern.sequencerData,
            bpm: pattern.bpm,
            steps: pattern.steps,
            tags: pattern.tags,
            category: pattern.category
          }])
        if (error) {
          console.error('Error importing pattern:', error)
        }
      }
      loadPatterns()
    } catch (error) {
      console.error('Error importing patterns:', error)
    }
  }

  const importMIDI = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return
    
    setImportingMIDI(true)
    setImportProgress('Starting MIDI import...')
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setImportProgress('Please log in to import MIDI files')
        return
      }
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        setImportProgress(`Processing ${file.name}...`)
        
        console.log(`[MIDI IMPORT] Processing file: ${file.name}`)
        console.log(`[MIDI IMPORT] File size: ${file.size} bytes`)
        
        const arrayBuffer = await file.arrayBuffer()
        
        // Parse MIDI file
        const midiData = parseMIDIFile(arrayBuffer)
        
        if (midiData) {
          console.log(`[MIDI IMPORT] Successfully parsed MIDI file`)
          setImportProgress(`Converting ${file.name} to sequencer format...`)
          
          // Convert MIDI data to sequencer format
          const sequencerData = convertMIDIToSequencer(midiData)
          
          console.log(`[MIDI IMPORT] Conversion result:`, sequencerData)
          
          // Validate the conversion
          if (sequencerData.tracks.length === 0) {
            console.log(`[MIDI IMPORT] No tracks found after conversion`)
            setImportProgress(`No valid tracks found in ${file.name}`)
            continue
          }
          
          // Show preview before saving
          const defaultName = file.name.replace(/\.(mid|midi)$/i, '')
          setPatternName(defaultName)
          
          // Auto-detect pattern type based on filename
          let defaultPatternType = ''
          const lowerName = defaultName.toLowerCase()
          if (lowerName.includes('hihat') || lowerName.includes('hi-hat') || lowerName.includes('hat')) {
            defaultPatternType = 'hihat loop'
          } else if (lowerName.includes('melody') || lowerName.includes('lead')) {
            defaultPatternType = 'melody loop'
          } else if (lowerName.includes('bass')) {
            defaultPatternType = 'bass loop'
          } else if (lowerName.includes('kick')) {
            defaultPatternType = 'kick'
          } else if (lowerName.includes('snare')) {
            defaultPatternType = 'snare'
          }
          
          setPatternType(defaultPatternType)
          setPreviewPattern({
            name: defaultName,
            description: `Imported from ${file.name} - ${midiData.tracks.length} tracks, ${midiData.bpm} BPM`,
            tracks: sequencerData.tracks,
            sequencerData: sequencerData.sequencerData,
            bpm: midiData.bpm,
            steps: sequencerData.steps,
            tags: ['MIDI Import', 'Imported'],
            category: 'MIDI',
            midiData: midiData
          })
          
          setImportProgress(`Ready to save: ${file.name}`)
        } else {
          console.log(`[MIDI IMPORT] Failed to parse MIDI file`)
          setImportProgress(`Failed to parse ${file.name} - Invalid MIDI format`)
        }
      }
    } catch (error) {
      console.error('Error importing MIDI patterns:', error)
      setImportProgress(`Error: ${error}`)
    } finally {
      setImportingMIDI(false)
    }
  }



  const savePreviewPattern = async () => {
    if (!previewPattern) return
    
    if (!patternName.trim()) {
      setImportProgress('Please enter a pattern name')
      return
    }
    
    if (!patternType.trim()) {
      setImportProgress('Please select a pattern type')
      return
    }
    
    setImportProgress('Saving pattern to database...')
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
        const pattern = {
          user_id: user.id,
        name: patternName.trim(),
        description: previewPattern.description,
        tracks: previewPattern.tracks,
        sequencer_data: previewPattern.sequencerData,
        bpm: previewPattern.bpm,
        steps: previewPattern.steps,
        tags: previewPattern.tags,
        category: previewPattern.category,
        pattern_type: patternType.trim()
        }
        
        const { error } = await supabase
          .from('saved_patterns')
          .insert([pattern])
        
        if (error) {
        console.error('Error saving MIDI pattern:', error)
        setImportProgress(`Error saving: ${error.message}`)
      } else {
        console.log(`Successfully saved MIDI pattern: ${pattern.name}`)
        setImportProgress(`Successfully saved: ${pattern.name}`)
        setPreviewPattern(null)
        loadPatterns()
        
        // Show success message
        setTimeout(() => {
          setImportProgress('')
        }, 3000)
      }
    } catch (error) {
      console.error('Error saving MIDI pattern:', error)
      setImportProgress(`Error: ${error}`)
    }
  }

  const cancelPreviewPattern = () => {
    setPreviewPattern(null)
    setPatternName('')
    setPatternType('')
    setImportProgress('')
  }

  // Test function to create a simple pattern for debugging
  const createTestPattern = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const testPattern = {
        user_id: user.id,
        name: 'Test Pattern',
        description: 'Test pattern for debugging',
          tracks: [
            {
              id: 1,
            name: 'Test Track',
            audioUrl: null,
            color: 'bg-red-500',
            midiNotes: [
              {
                id: '1-C4-0',
                note: 'C4',
                startStep: 0,
                duration: 1,
                velocity: 0.8
              },
              {
                id: '1-E4-4',
                note: 'E4',
                startStep: 4,
                duration: 1,
                velocity: 0.8
              },
              {
                id: '1-G4-8',
                note: 'G4',
                startStep: 8,
                duration: 1,
                velocity: 0.8
              }
            ]
          }
        ],
        sequencer_data: {
          1: [true, false, false, false, true, false, false, false, true, false, false, false, false, false, false, false]
        },
        bpm: 120,
        steps: 16,
        tags: ['Test'],
        category: 'Test',
        pattern_type: 'melody'
        }
        
        const { error } = await supabase
          .from('saved_patterns')
        .insert([testPattern])
        
        if (error) {
        console.error('Error creating test pattern:', error)
      } else {
        console.log('Test pattern created successfully')
        loadPatterns()
      }
    } catch (error) {
      console.error('Error creating test pattern:', error)
    }
  }

  const openEditPattern = (pattern: SavedPattern) => {
    setEditingPattern(pattern)
    setEditingName(pattern.name)
    setEditingDescription(pattern.description || '')
    setEditingCategory(pattern.category || '')
    
    // Auto-correct pattern type for hi-hat patterns
    let correctedPatternType = pattern.pattern_type || ''
    if (correctedPatternType === 'hihat' || 
        pattern.name.toLowerCase().includes('hihat') || 
        pattern.name.toLowerCase().includes('hi-hat')) {
      correctedPatternType = 'hihat loop'
    }
    
    setEditingPatternType(correctedPatternType)
    setEditingTags(pattern.tags?.join(', ') || '')
  }

  const saveEditedPattern = async () => {
    if (!editingPattern) return
    
    if (!editingName.trim()) {
      alert('Please enter a pattern name')
      return
    }
    
    try {
      const tags = editingTags.split(',').map(tag => tag.trim()).filter(Boolean)
      
      const { error } = await supabase
        .from('saved_patterns')
        .update({
          name: editingName.trim(),
          description: editingDescription.trim() || null,
          category: editingCategory.trim() || null,
          pattern_type: editingPatternType.trim() || null,
          tags: tags.length > 0 ? tags : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingPattern.id)
      
      if (error) {
        console.error('Error updating pattern:', error)
        alert('Error updating pattern')
        return
      }
      
      // Update local state
      setPatterns(prev => prev.map(p => 
        p.id === editingPattern.id 
          ? {
              ...p,
              name: editingName.trim(),
              description: editingDescription.trim() || undefined,
              category: editingCategory.trim() || undefined,
              pattern_type: editingPatternType.trim() || undefined,
              tags: tags.length > 0 ? tags : undefined
            }
          : p
      ))
      
      setEditingPattern(null)
      setEditingName('')
      setEditingDescription('')
      setEditingCategory('')
      setEditingPatternType('')
      setEditingTags('')
      
      console.log('Pattern updated successfully')
    } catch (error) {
      console.error('Error updating pattern:', error)
      alert('Error updating pattern')
    }
  }

  const cancelEditPattern = () => {
    setEditingPattern(null)
    setEditingName('')
    setEditingDescription('')
    setEditingCategory('')
    setEditingPatternType('')
    setEditingTags('')
  }

  const openEditNotes = (pattern: SavedPattern) => {
    setEditingNotes(pattern)
    setSelectedTrackForNotes(pattern.tracks[0]?.id || null)
  }

  const saveEditedNotes = async () => {
    if (!editingNotes) return
    
    try {
      const { error } = await supabase
        .from('saved_patterns')
        .update({
          tracks: editingNotes.tracks,
          sequencer_data: editingNotes.sequencerData,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingNotes.id)
      
      if (error) {
        console.error('Error updating pattern notes:', error)
        alert('Error updating pattern notes')
        return
      }
      
      // Update local state
      setPatterns(prev => prev.map(p => 
        p.id === editingNotes.id 
          ? {
              ...p,
              tracks: editingNotes.tracks,
              sequencerData: editingNotes.sequencerData
            }
          : p
      ))
      
      setEditingNotes(null)
      setSelectedTrackForNotes(null)
      
      console.log('Pattern notes updated successfully')
    } catch (error) {
      console.error('Error updating pattern notes:', error)
      alert('Error updating pattern notes')
    }
  }

  const cancelEditNotes = () => {
    setEditingNotes(null)
    setSelectedTrackForNotes(null)
  }

  const updateTrackNotes = (trackId: number, notes: any[]) => {
    if (!editingNotes) return
    
    const updatedTracks = editingNotes.tracks.map(track => 
      track.id === trackId 
        ? { ...track, midiNotes: notes }
        : track
    )
    
    // Update sequencer data based on notes
    const updatedSequencerData = { ...editingNotes.sequencerData }
    updatedSequencerData[trackId] = new Array(editingNotes.steps).fill(false)
    
    notes.forEach(note => {
      if (note.startStep < editingNotes.steps) {
        updatedSequencerData[trackId][note.startStep] = true
      }
    })
    
    setEditingNotes({
      ...editingNotes,
      tracks: updatedTracks,
      sequencerData: updatedSequencerData
    })
  }

  const addNote = (trackId: number, step: number, note: string, duration: number = 1) => {
    if (!editingNotes) return
    
    const newNote = {
      id: `${trackId}-${note}-${step}-${Date.now()}`,
      note: note,
      startStep: step,
      duration: duration,
      velocity: 0.8
    }
    
    const track = editingNotes.tracks.find(t => t.id === trackId)
    if (!track) return
    
    const updatedNotes = [...(track.midiNotes || []), newNote]
    updateTrackNotes(trackId, updatedNotes)
  }

  const removeNote = (trackId: number, noteId: string) => {
    if (!editingNotes) return
    
    const track = editingNotes.tracks.find(t => t.id === trackId)
    if (!track) return
    
    const updatedNotes = (track.midiNotes || []).filter(note => note.id !== noteId)
    updateTrackNotes(trackId, updatedNotes)
  }

  const updateNote = (trackId: number, noteId: string, updates: any) => {
    if (!editingNotes) return
    
    const track = editingNotes.tracks.find(t => t.id === trackId)
    if (!track) return
    
    const updatedNotes = (track.midiNotes || []).map(note => 
      note.id === noteId ? { ...note, ...updates } : note
    )
    updateTrackNotes(trackId, updatedNotes)
  }

  const filteredPatterns = patterns.filter(pattern => {
    const matchesSearch = pattern.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pattern.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pattern.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = selectedCategory === 'all' || pattern.category === selectedCategory
    const matchesPatternType = selectedPatternType === 'all' || pattern.pattern_type === selectedPatternType
    return matchesSearch && matchesCategory && matchesPatternType
  })

  const openEditPatternMetadata = (pattern: SavedPattern) => {
    // Auto-correct pattern type for hi-hat patterns
    let correctedPattern = pattern
    if (pattern.pattern_type === 'hihat' || 
        pattern.name.toLowerCase().includes('hihat') || 
        pattern.name.toLowerCase().includes('hi-hat')) {
      correctedPattern = {
        ...pattern,
        pattern_type: 'hihat loop'
      }
    }
    
    setEditingPatternMetadata(correctedPattern)
    // Initialize track metadata for editing
    const trackMetadata: { [trackId: number]: any } = {}
    correctedPattern.tracks.forEach(track => {
      trackMetadata[track.id] = {
        name: track.name,
        bpm: track.bpm || correctedPattern.bpm,
        key: track.key || 'C',
        audio_type: track.audio_type || 'other',
        tags: track.tags?.join(', ') || ''
      }
    })
    setEditingTrackMetadata(trackMetadata)
  }

  const savePatternMetadata = async () => {
    if (!editingPatternMetadata) return
    
    try {
      console.log('Starting to save pattern metadata:', editingPatternMetadata.id)
      
      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        console.error('Authentication error:', authError)
        alert('You must be logged in to save patterns')
        return
      }
      
      console.log('User authenticated:', user.id)
      
      // Check if pattern belongs to current user
      if (editingPatternMetadata.user_id !== user.id) {
        console.error('Pattern does not belong to current user')
        alert('You can only edit your own patterns')
        return
      }
      
      console.log('Pattern belongs to current user, proceeding with update')
      console.log('Pattern data:', editingPatternMetadata)
      
      // Update tracks with new metadata
      const updatedTracks = editingPatternMetadata.tracks.map(track => {
        const metadata = editingTrackMetadata[track.id]
        if (!metadata) return track
        
        return {
          ...track,
          name: metadata.name,
          bpm: metadata.bpm,
          key: metadata.key,
          audio_type: metadata.audio_type,
          tags: metadata.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean),
          color: getTrackColorByType(metadata.audio_type)
        }
      })
      
      // Prepare update data with all metadata fields
      const updateData = {
        name: editingPatternMetadata.name,
        description: editingPatternMetadata.description,
        pattern_type: editingPatternMetadata.pattern_type,
        category: editingPatternMetadata.category,
        tags: editingPatternMetadata.tags,
        tracks: updatedTracks,
        updated_at: new Date().toISOString()
      }
      
      console.log('Updating pattern with data:', updateData)
      
      // Add timeout to the request
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 30000) // 30 second timeout
      })
      
      const updatePromise = supabase
        .from('saved_patterns')
        .update(updateData)
        .eq('id', editingPatternMetadata.id)
        .select()
      
      const { data, error } = await Promise.race([updatePromise, timeoutPromise]) as any
      
      if (error) {
        console.error('Error updating pattern metadata:', error)
        alert(`Error updating pattern metadata: ${error.message}`)
        return
      }
      
      console.log('Pattern updated successfully:', data)
      
      // Update local state
      setAllPatterns(prev => prev.map(p => 
        p.id === editingPatternMetadata.id 
          ? { ...p, ...updateData }
          : p
      ))
      
      setEditingPatternMetadata(null)
      setEditingTrackMetadata({})
      
      console.log('Pattern metadata updated successfully')
    } catch (error) {
      console.error('Error updating pattern metadata:', error)
      alert(`Error updating pattern metadata: ${error}`)
    }
  }

  const cancelEditPatternMetadata = () => {
    setEditingPatternMetadata(null)
    setEditingTrackMetadata({})
  }

  // Mass edit functionality
  const togglePatternSelection = (patternId: string) => {
    const newSelected = new Set(selectedPatterns)
    if (newSelected.has(patternId)) {
      newSelected.delete(patternId)
    } else {
      newSelected.add(patternId)
    }
    setSelectedPatterns(newSelected)
  }

  const selectAllPatternsInPack = (packId: string, subfolderName?: string) => {
    let packPatterns: SavedPattern[]
    
    if (packId === 'unpacked') {
      packPatterns = allPatterns.filter(pattern => !pattern.pack_id)
    } else {
      packPatterns = allPatterns.filter(pattern => 
        pattern.pack_id === packId && 
        (subfolderName ? pattern.subfolder === subfolderName : !pattern.subfolder)
      )
    }
    
    const newSelected = new Set(selectedPatterns)
    packPatterns.forEach(pattern => newSelected.add(pattern.id))
    setSelectedPatterns(newSelected)
  }

  const clearPatternSelection = () => {
    setSelectedPatterns(new Set())
  }

  const openMassEditModal = () => {
    if (selectedPatterns.size === 0) {
      alert('Please select at least one pattern to edit')
      return
    }
    setShowMassEditModal(true)
  }

  const handleMassEditFieldToggle = (field: string) => {
    const newSelected = new Set(selectedMassEditFields)
    if (newSelected.has(field)) {
      newSelected.delete(field)
    } else {
      newSelected.add(field)
    }
    setSelectedMassEditFields(newSelected)
  }

  const handleMassEditValueChange = (field: string, value: string) => {
    setMassEditValues(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const applyMassEdit = async () => {
    if (selectedMassEditFields.size === 0) {
      alert('Please select at least one field to edit')
      return
    }

    setMassEditLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to edit patterns')
        return
      }

      let successCount = 0
      let errorCount = 0

      for (const patternId of selectedPatterns) {
        const updates: any = {}

        // Only update selected fields
        if (selectedMassEditFields.has('category') && massEditValues.category.trim()) {
          updates.category = massEditValues.category.trim()
        }
        if (selectedMassEditFields.has('pattern_type') && massEditValues.pattern_type.trim()) {
          updates.pattern_type = massEditValues.pattern_type.trim()
        }
        if (selectedMassEditFields.has('tags') && massEditValues.tags.trim()) {
          const tags = massEditValues.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
          updates.tags = tags
        }
        if (selectedMassEditFields.has('bpm') && massEditValues.bpm.trim()) {
          updates.bpm = parseInt(massEditValues.bpm.trim())
        }
        if (selectedMassEditFields.has('key') && massEditValues.key.trim()) {
          updates.key = massEditValues.key.trim()
        }

        if (Object.keys(updates).length > 0) {
          const { error } = await supabase
            .from('saved_patterns')
            .update(updates)
            .eq('id', patternId)
            .eq('user_id', user.id)

          if (error) {
            console.error(`Error updating pattern ${patternId}:`, error)
            errorCount++
          } else {
            successCount++
          }
        }
      }

      if (successCount > 0) {
        alert(`Successfully updated ${successCount} patterns${errorCount > 0 ? ` (${errorCount} errors)` : ''}`)
        setSelectedPatterns(new Set())
        setShowMassEditModal(false)
        loadPatterns() // Refresh data
      } else {
        alert('No patterns were updated')
      }
    } catch (error) {
      console.error('Error in mass edit:', error)
      alert('Error updating patterns')
    } finally {
      setMassEditLoading(false)
    }
  }

  const resetMassEditForm = () => {
    setMassEditValues({
      category: '',
      pattern_type: '',
      tags: '',
      bpm: '',
      key: ''
    })
    setSelectedMassEditFields(new Set())
  }

  // Search and filter functions for packs view
  const getFilteredPatternsInPack = (packId: string, subfolderName?: string) => {
    let patterns = allPatterns.filter(pattern => 
      pattern.pack_id === packId && 
      (subfolderName ? pattern.subfolder === subfolderName : !pattern.subfolder)
    )

    // Apply search filter
    if (packSearchTerm) {
      patterns = patterns.filter(pattern =>
        pattern.name.toLowerCase().includes(packSearchTerm.toLowerCase()) ||
        pattern.description?.toLowerCase().includes(packSearchTerm.toLowerCase()) ||
        pattern.tags?.some(tag => tag.toLowerCase().includes(packSearchTerm.toLowerCase()))
      )
    }

    // Apply category filter
    if (packFilterCategory !== 'all') {
      patterns = patterns.filter(pattern => pattern.category === packFilterCategory)
    }

    // Apply type filter
    if (packFilterType !== 'all') {
      patterns = patterns.filter(pattern => pattern.pattern_type === packFilterType)
    }

    return patterns
  }

  const PatternCard = ({ pattern }: { pattern: SavedPattern }) => (
    <Card 
      className={`bg-[#141414] hover:border-gray-600 transition-colors cursor-move ${
        draggedPattern?.id === pattern.id ? 'opacity-50' : ''
      }`}
      draggable
      onDragStart={(e) => handleDragStart(e, pattern)}
      onDragEnd={handleDragEnd}
      title="Drag to organize into packs"
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gray-500 rounded-full opacity-50"></div>
          <CardTitle className="text-white text-lg">{pattern.name}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedPatterns.has(pattern.id)}
              onChange={() => togglePatternSelection(pattern.id)}
              className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
              onClick={(e) => e.stopPropagation()}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                setIsPlaying(isPlaying === pattern.id ? null : pattern.id)
              }}
              className="text-green-400 hover:text-green-300"
            >
              {isPlaying === pattern.id ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                openEditPattern(pattern)
              }}
              className="text-blue-400 hover:text-blue-300"
              title="Edit Pattern Info"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                openEditPatternMetadata(pattern)
              }}
              className="text-cyan-400 hover:text-cyan-300"
              title="Edit Track Metadata (BPM, Key, Type)"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                openEditNotes(pattern)
              }}
              className="text-purple-400 hover:text-purple-300"
              title="Edit MIDI Notes"
            >
              <Music className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                duplicatePattern(pattern)
              }}
              className="text-purple-400 hover:text-purple-300"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                exportPattern(pattern)
              }}
              className="text-yellow-400 hover:text-yellow-300"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 cursor-not-allowed"
              title="Beat Maker no longer available"
              disabled
            >
              <Play className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                deletePattern(pattern.id)
              }}
              className="text-red-400 hover:text-red-300"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {pattern.description && (
          <p className="text-gray-400 text-sm">{pattern.description}</p>
        )}
        {pattern.pack && (
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: pattern.pack.color }}
            />
            <span className="text-xs text-gray-400">{pattern.pack.name}</span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-gray-300">{pattern.bpm} BPM</span>
            </div>
            <div className="flex items-center gap-1">
              <Music className="w-4 h-4 text-gray-400" />
              <span className="text-gray-300">{pattern.steps} Steps</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-300">{pattern.tracks.length} Tracks</span>
            </div>
          </div>
          {pattern.tags && pattern.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {pattern.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          {pattern.category && (
            <Badge variant="outline" className="text-xs">
              {pattern.category}
            </Badge>
          )}
          {pattern.pattern_type && (
            <Badge variant="secondary" className="text-xs">
              {pattern.pattern_type}
            </Badge>
          )}
          <div className="text-xs text-gray-500">
            Created: {new Date(pattern.created_at).toLocaleDateString()}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-white">Loading patterns...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Pattern Library</h1>
          <p className="text-gray-400">Manage your saved beat patterns</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            <input
              type="file"
              multiple
              accept=".json"
              onChange={importPatterns}
              className="hidden"
              id="import-patterns"
            />
            <label htmlFor="import-patterns" className="cursor-pointer">
              Import JSON
            </label>
          </Button>
          <Button variant="outline" size="sm" disabled={importingMIDI}>
            <Music className="w-4 h-4 mr-2" />
            <input
              type="file"
              accept=".mid,.midi"
              onChange={importMIDI}
              className="hidden"
              id="import-midi"
              disabled={importingMIDI}
            />
            <label htmlFor="import-midi" className="cursor-pointer">
              {importingMIDI ? 'Importing...' : 'Import MIDI'}
            </label>
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={createTestPattern}
          >
            Test Pattern
          </Button>
        </div>
      </div>
      {/* Import Progress */}
      {importProgress && (
        <Card className="!bg-[#141414] border border-gray-600 rounded-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-blue-400" />
                <span className="text-white text-sm">{importProgress}</span>
              </div>
              {importingMIDI && (
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Upload Progress */}
      {uploadProgress.isUploading && (
        <Card className="!bg-[#141414] border border-green-600 rounded-lg">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-green-400" />
                  <span className="text-white text-sm font-medium">
                    Converting {uploadProgress.currentIndex}/{uploadProgress.totalFiles} MIDI files to patterns...
                  </span>
                </div>
                <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
              {uploadProgress.currentFile && (
                <div className="text-sm text-gray-300">
                  Current: {uploadProgress.currentFile}
                </div>
              )}
              {uploadProgress.completedFiles.length > 0 && (
                <div className="text-xs text-gray-400">
                  Completed: {uploadProgress.completedFiles.join(', ')}
                </div>
              )}
              <div className="text-xs text-green-400 bg-green-100/10 p-2 rounded">
                💡 MIDI files are being converted to patterns that you can use in the Beat Maker
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Search */}
      <Card className="!bg-[#141414] border border-gray-700 rounded-lg">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search patterns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-[#1a1a1a] border border-gray-600"
                />
              </div>
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-[#1a1a1a] border border-gray-600 rounded px-3 py-2 text-white"
            >
              <option value="all">All Categories</option>
              {categories?.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <select
              value={selectedPatternType}
              onChange={(e) => setSelectedPatternType(e.target.value)}
              className="bg-[#1a1a1a] border border-gray-600 rounded px-3 py-2 text-white"
            >
              <option value="all">All Types</option>
              <option value="kick">Kick</option>
              <option value="snare">Snare</option>
              <option value="hihat">Hi-Hat</option>
              <option value="hihat loop">Hi-Hat Loop</option>
              <option value="clap">Clap</option>
              <option value="tom">Tom</option>
              <option value="crash">Crash</option>
              <option value="ride">Ride</option>
              <option value="melody">Melody</option>
              <option value="melody loop">Melody Loop</option>
              <option value="bass">Bass</option>
              <option value="bass loop">Bass Loop</option>
              <option value="chord">Chord</option>
              <option value="arp">Arpeggio</option>
              <option value="lead">Lead</option>
              <option value="pad">Pad</option>
              <option value="fx">FX</option>
              <option value="percussion">Percussion</option>
              <option value="vocal">Vocal</option>
              <option value="other">Other</option>
            </select>
            <div className="flex gap-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'packs' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('packs')}
              >
                <Package className="w-4 h-4" />
              </Button>
              {viewMode !== 'packs' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newSelected = new Set(selectedPatterns)
                    filteredPatterns.forEach(pattern => newSelected.add(pattern.id))
                    setSelectedPatterns(newSelected)
                  }}
                >
                  Select All Filtered
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Patterns Display */}
      {viewMode === 'packs' ? (
        // Packs View
        <div className="space-y-4">
          {/* Pack Creation Button and Search Controls */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              {draggedPattern && (
                <div className="text-sm text-blue-600 font-medium bg-blue-100/10 px-3 py-1 rounded-lg border border-blue-400">
                  📁 Dragging "{draggedPattern.name}" - Drop it into a pack below
                </div>
              )}
              {selectedPatterns.size > 0 && (
                <div className="text-sm text-green-600 font-medium bg-green-100/10 px-3 py-1 rounded-lg border border-green-400">
                  ✓ {selectedPatterns.size} patterns selected
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedPatterns.size > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openMassEditModal}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Mass Edit ({selectedPatterns.size})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearPatternSelection}
                  >
                    Clear Selection
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPackModal(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Pack
              </Button>
            </div>
          </div>

          {/* Search and Filter Controls for Packs */}
          <Card className="!bg-[#141414] border border-gray-700 rounded-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search patterns in packs..."
                      value={packSearchTerm}
                      onChange={(e) => setPackSearchTerm(e.target.value)}
                      className="pl-10 bg-[#1a1a1a] border border-gray-600"
                    />
                  </div>
                </div>
                <select
                  value={packFilterCategory}
                  onChange={(e) => setPackFilterCategory(e.target.value)}
                  className="bg-[#1a1a1a] border border-gray-600 rounded px-3 py-2 text-white"
                >
                  <option value="all">All Categories</option>
                  {categories?.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                <select
                  value={packFilterType}
                  onChange={(e) => setPackFilterType(e.target.value)}
                  className="bg-[#1a1a1a] border border-gray-600 rounded px-3 py-2 text-white"
                >
                  <option value="all">All Types</option>
                  <option value="kick">Kick</option>
                  <option value="snare">Snare</option>
                  <option value="hihat">Hi-Hat</option>
                  <option value="hihat loop">Hi-Hat Loop</option>
                  <option value="clap">Clap</option>
                  <option value="tom">Tom</option>
                  <option value="crash">Crash</option>
                  <option value="ride">Ride</option>
                  <option value="melody">Melody</option>
                  <option value="melody loop">Melody Loop</option>
                  <option value="bass">Bass</option>
                  <option value="bass loop">Bass Loop</option>
                  <option value="chord">Chord</option>
                  <option value="arp">Arpeggio</option>
                  <option value="lead">Lead</option>
                  <option value="pad">Pad</option>
                  <option value="fx">FX</option>
                  <option value="percussion">Percussion</option>
                  <option value="vocal">Vocal</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {loadingPacks ? (
            <div className="text-white">Loading packs...</div>
          ) : packError ? (
            <div className="text-red-500">{packError}</div>
          ) : patternPacks.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No packs found</h3>
              <p className="text-gray-400">Create your first pack to organize your patterns!</p>
            </div>
          ) : (
            patternPacks.map(pack => (
              <Card key={pack.id} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: pack.color + '20', border: `2px solid ${pack.color}` }}
                    >
                      <Package className="h-6 w-6" style={{ color: pack.color }} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{pack.name}</h3>
                      <p className="text-sm text-gray-400">{pack.description}</p>
                      <p className="text-xs text-gray-500">
                        {allPatterns.filter(pattern => pattern.pack_id === pack.id).length} patterns
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedPack(selectedPack === pack.id ? null : pack.id)}
                    >
                      {selectedPack === pack.id ? 'Hide' : 'View'} Patterns
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => handleDeletePack(pack.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {selectedPack === pack.id && (
                  <div className="mt-4 space-y-3 border-t border-gray-700 pt-4">
                    {/* Subfolder Creation Button */}
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-white font-medium">Subfolders</h4>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => selectAllPatternsInPack(pack.id)}
                        >
                          Select All in Pack
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setNewSubfolder({ ...newSubfolder, pack_id: pack.id })
                            setShowSubfolderModal(true)
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Create Subfolder
                        </Button>
                      </div>
                    </div>

                    {/* Show subfolders */}
                    {pack.subfolders && pack.subfolders.length > 0 && (
                      <div className="space-y-2 mb-4">
                        {pack.subfolders.map(subfolder => (
                          <div 
                            key={subfolder.id} 
                            className={`border border-gray-600 rounded-lg transition-colors ${
                              dragOverTarget === `${pack.id}-${subfolder.name}` 
                                ? isDraggingFiles
                                  ? 'border-green-400 bg-green-100/10 shadow-lg' 
                                  : 'border-yellow-400 bg-yellow-100/10 shadow-lg' 
                                : draggedPattern || isDraggingFiles
                                  ? 'border-blue-400 bg-blue-100/5'
                                  : ''
                            }`}
                            onDragOver={handleDragOver}
                            onDragEnter={() => handleDragEnter(`${pack.id}-${subfolder.name}`)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, pack.id, subfolder.name)}
                          >
                            <div 
                              className="flex items-center gap-3 p-3 cursor-pointer bg-[#141414]"
                              onClick={() => toggleSubfolder(subfolder.id)}
                            >
                              <div 
                                className="w-6 h-6 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: subfolder.color + '20', border: `1px solid ${subfolder.color}` }}
                              >
                                <Folder className="h-3 w-3" style={{ color: subfolder.color }} />
                              </div>
                              <div className="flex-1">
                                <h4 
                                  className="text-white text-sm font-medium"
                                  style={{ 
                                    color: dragOverTarget === `${pack.id}-${subfolder.name}` && (draggedPattern || isDraggingFiles)
                                      ? isDraggingFiles ? '#10B981' : '#FCD34D' 
                                      : '#FFFFFF' 
                                  }}
                                >
                                  📁 {subfolder.name}
                                  {dragOverTarget === `${pack.id}-${subfolder.name}` && draggedPattern && ' (Drop here!)'}
                                  {dragOverTarget === `${pack.id}-${subfolder.name}` && isDraggingFiles && ' (Convert here!)'}
                                </h4>
                                <p className="text-gray-500 text-xs">
                                  {subfolder.description}
                                </p>
                                <p className="text-gray-400 text-xs">
                                  {allPatterns.filter(pattern => pattern.pack_id === pack.id && pattern.subfolder === subfolder.name).length} patterns
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteSubfolder(subfolder.id)
                                  }}
                                  className="text-red-400 hover:text-red-300"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            
                            {expandedSubfolders.has(subfolder.id) && (
                              <div className="px-3 pb-3 pt-4 space-y-2">
                                {allPatterns
                                  .filter(pattern => pattern.pack_id === pack.id && pattern.subfolder === subfolder.name)
                                  .map(pattern => (
                                    <div 
                                      key={pattern.id} 
                                      className={`flex items-center gap-4 p-2 bg-[#1a1a1a] rounded-lg ml-4 cursor-move transition-opacity ${
                                        draggedPattern?.id === pattern.id ? 'opacity-50' : ''
                                      }`}
                                      draggable
                                      onDragStart={(e) => handleDragStart(e, pattern)}
                                      onDragEnd={handleDragEnd}
                                    >
                                      <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center">
                                        <Music className="h-3 w-3 text-blue-400" />
                                      </div>
                                      <div className="flex-1">
                                        <div className="text-white text-sm font-medium">{pattern.name}</div>
                                        <div className="text-xs text-gray-400">
                                          {pattern.bpm} BPM • {pattern.steps} Steps • {pattern.tracks.length} Tracks
                                        </div>
                                      </div>
                                                                  <div className="flex gap-1">
                              <input
                                type="checkbox"
                                checked={selectedPatterns.has(pattern.id)}
                                onChange={() => togglePatternSelection(pattern.id)}
                                className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditPattern(pattern)}
                                className="text-blue-400 hover:text-blue-300"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deletePattern(pattern.id)}
                                className="text-red-400 hover:text-red-300"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                                    </div>
                                  ))}
                                {allPatterns.filter(pattern => pattern.pack_id === pack.id && pattern.subfolder === subfolder.name).length === 0 && (
                                  <p className="text-center text-gray-400 py-2 text-sm ml-4">No patterns in this folder yet.</p>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Show root level files (no subfolder) */}
                    <div 
                      className={`space-y-2 p-3 rounded-lg border-2 border-dashed transition-colors ${
                        dragOverTarget === `${pack.id}-root` 
                          ? isDraggingFiles
                            ? 'border-green-400 bg-green-100/10 shadow-lg' 
                            : 'border-yellow-400 bg-yellow-100/10 shadow-lg'
                          : draggedPattern || isDraggingFiles
                            ? 'border-blue-400 bg-blue-100/5'
                            : 'border-gray-600'
                      }`}
                      onDragOver={handleDragOver}
                      onDragEnter={() => handleDragEnter(`${pack.id}-root`)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, pack.id)}
                    >
                      <div className={`text-sm mb-2 ${
                        dragOverTarget === `${pack.id}-root` 
                          ? isDraggingFiles
                            ? 'text-green-400 font-medium' 
                            : 'text-yellow-400 font-medium' 
                          : draggedPattern || isDraggingFiles
                            ? 'text-blue-400' 
                            : 'text-gray-400'
                      }`}>
                        {dragOverTarget === `${pack.id}-root` 
                          ? isDraggingFiles
                            ? 'Drop MIDI files here to convert to patterns!' 
                            : 'Drop here to add to this pack!' 
                          : draggedPattern 
                            ? 'Drop patterns here to add to this pack' 
                            : isDraggingFiles
                              ? 'Drop MIDI files here to convert to patterns'
                              : 'Drop patterns here to add to this pack'
                        }
                      </div>
                      {allPatterns
                        .filter(pattern => pattern.pack_id === pack.id && !pattern.subfolder)
                        .map(pattern => (
                          <div 
                            key={pattern.id} 
                            className={`flex items-center gap-4 p-3 bg-[#1a1a1a] rounded-lg cursor-move transition-opacity ${
                              draggedPattern?.id === pattern.id ? 'opacity-50' : ''
                            }`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, pattern)}
                            onDragEnd={handleDragEnd}
                          >
                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                              <Music className="h-4 w-4 text-blue-400" />
                            </div>
                            <div className="flex-1">
                              <div className="text-white font-medium">{pattern.name}</div>
                              <div className="text-xs text-gray-400">
                                {pattern.bpm} BPM • {pattern.steps} Steps • {pattern.tracks.length} Tracks
                              </div>
                            </div>
                                                    <div className="flex gap-1">
                          <input
                            type="checkbox"
                            checked={selectedPatterns.has(pattern.id)}
                            onChange={() => togglePatternSelection(pattern.id)}
                            className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditPattern(pattern)}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deletePattern(pattern.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </Card>
            ))
          )}

          {/* Unpacked Patterns */}
          {allPatterns.filter(pattern => !pattern.pack_id).length > 0 && (
            <Card 
              className={`p-6 transition-colors ${
                dragOverTarget === 'unpacked' 
                  ? isDraggingFiles
                    ? 'bg-green-100/10 border-green-400 border-2 shadow-lg' 
                    : 'bg-yellow-100/10 border-yellow-400 border-2 shadow-lg' 
                  : draggedPattern || isDraggingFiles
                    ? 'bg-blue-100/5 border-blue-400 border-2'
                    : ''
              }`}
              onDragOver={handleDragOver}
              onDragEnter={() => handleDragEnter('unpacked')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, null)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center">
                    <Folder className="h-6 w-6 text-gray-400" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-semibold ${
                      dragOverTarget === 'unpacked' 
                        ? isDraggingFiles
                          ? 'text-green-400' 
                          : 'text-yellow-400' 
                        : draggedPattern || isDraggingFiles
                          ? 'text-blue-400' 
                          : 'text-white'
                    }`}>
                      Unpacked Patterns {dragOverTarget === 'unpacked' && draggedPattern && '(Drop here!)'}
                      Unpacked Patterns {dragOverTarget === 'unpacked' && isDraggingFiles && '(Convert here!)'}
                    </h3>
                    <p className="text-sm text-gray-400">Patterns not organized in any pack</p>
                    <p className="text-xs text-gray-500">
                      {allPatterns.filter(pattern => !pattern.pack_id).length} patterns
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectAllPatternsInPack('unpacked')}
                  >
                    Select All Unpacked
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPack(selectedPack === 'unpacked' ? null : 'unpacked')}
                  >
                    {selectedPack === 'unpacked' ? 'Hide' : 'View'} Patterns
                  </Button>
                </div>
              </div>
              
              {selectedPack === 'unpacked' && (
                <div className="mt-4 space-y-3 border-t border-gray-700 pt-4">
                  {allPatterns
                    .filter(pattern => !pattern.pack_id)
                    .map(pattern => (
                      <div 
                        key={pattern.id} 
                        className={`flex items-center gap-4 p-3 bg-[#1a1a1a] rounded-lg cursor-move transition-opacity ${
                          draggedPattern?.id === pattern.id ? 'opacity-50' : ''
                        }`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, pattern)}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                          <Music className="h-4 w-4 text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <div className="text-white font-medium">{pattern.name}</div>
                          <div className="text-xs text-gray-400">
                            {pattern.bpm} BPM • {pattern.steps} Steps • {pattern.tracks.length} Tracks
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <input
                            type="checkbox"
                            checked={selectedPatterns.has(pattern.id)}
                            onChange={() => togglePatternSelection(pattern.id)}
                            className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditPattern(pattern)}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deletePattern(pattern.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </Card>
          )}
        </div>
      ) : (
        // Grid/List View
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'space-y-4'}>
        {filteredPatterns.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Music className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No patterns found</h3>
            <p className="text-gray-400">
              {searchTerm || selectedCategory !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Create your first pattern in the Beat Maker'}
            </p>
          </div>
        ) : (
          filteredPatterns.map(pattern => (
            <PatternCard key={pattern.id} pattern={pattern} />
          ))
        )}
      </div>
      )}
      {/* Edit Pattern Modal */}
      {editingPattern && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <Card className="w-[90vw] max-h-[80vh] bg-[#141414] border border-gray-700 rounded-lg overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Edit Pattern: {editingPattern.name}</CardTitle>
                <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                    onClick={cancelEditPattern}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={saveEditedPattern}
                  >
                    Save Changes
                </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="overflow-y-auto max-h-[60vh]">
              <div className="space-y-6">
                {/* Pattern Name */}
                <div className="bg-[#1a1a1a] p-4 rounded-lg">
                  <h3 className="text-white font-semibold mb-3">Pattern Name *</h3>
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    placeholder="Enter pattern name..."
                    className="bg-[#0a0a0a] border-gray-600 text-white"
                  />
                </div>

                {/* Pattern Description */}
                <div className="bg-[#1a1a1a] p-4 rounded-lg">
                  <h3 className="text-white font-semibold mb-3">Description</h3>
                  <Textarea
                    value={editingDescription}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditingDescription(e.target.value)}
                    placeholder="Enter pattern description..."
                    className="bg-[#0a0a0a] border-gray-600 text-white min-h-[80px]"
                  />
                </div>

                {/* Pattern Type */}
                <div className="bg-[#1a1a1a] p-4 rounded-lg">
                  <h3 className="text-white font-semibold mb-3">Pattern Type</h3>
                  <select
                    value={editingPatternType}
                    onChange={(e) => setEditingPatternType(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-gray-600 rounded px-3 py-2 text-white"
                  >
                    <option value="">Select pattern type...</option>
                    <option value="kick">Kick</option>
                    <option value="snare">Snare</option>
                    <option value="hihat">Hi-Hat</option>
                    <option value="hihat loop">Hi-Hat Loop</option>
                    <option value="clap">Clap</option>
                    <option value="tom">Tom</option>
                    <option value="crash">Crash</option>
                    <option value="ride">Ride</option>
                    <option value="808">808</option>
                    <option value="melody">Melody</option>
                    <option value="melody loop">Melody Loop</option>
                    <option value="bass">Bass</option>
                    <option value="bass loop">Bass Loop</option>
                    <option value="chord">Chord</option>
                    <option value="arp">Arpeggio</option>
                    <option value="lead">Lead</option>
                    <option value="pad">Pad</option>
                    <option value="fx">FX</option>
                    <option value="percussion">Percussion</option>
                    <option value="vocal">Vocal</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Category */}
                <div className="bg-[#1a1a1a] p-4 rounded-lg">
                  <h3 className="text-white font-semibold mb-3">Category</h3>
                  <Input
                    value={editingCategory}
                    onChange={(e) => setEditingCategory(e.target.value)}
                    placeholder="Enter category (e.g., Hip Hop, Electronic, etc.)..."
                    className="bg-[#0a0a0a] border-gray-600 text-white"
                  />
                </div>

                {/* Tags */}
                <div className="bg-[#1a1a1a] p-4 rounded-lg">
                  <h3 className="text-white font-semibold mb-3">Tags</h3>
                  <Input
                    value={editingTags}
                    onChange={(e) => setEditingTags(e.target.value)}
                    placeholder="Enter tags separated by commas..."
                    className="bg-[#0a0a0a] border-gray-600 text-white"
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    Separate multiple tags with commas (e.g., trap, 808, dark)
                  </p>
                </div>

                {/* Pattern Info (Read-only) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#1a1a1a] p-4 rounded-lg">
                    <h3 className="text-white font-semibold mb-2">Pattern Details</h3>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-gray-400">BPM:</span> <span className="text-white">{editingPattern.bpm}</span></div>
                      <div><span className="text-gray-400">Steps:</span> <span className="text-white">{editingPattern.steps}</span></div>
                      <div><span className="text-gray-400">Tracks:</span> <span className="text-white">{editingPattern.tracks.length}</span></div>
                    </div>
                  </div>
                  
                  <div className="bg-[#1a1a1a] p-4 rounded-lg">
                    <h3 className="text-white font-semibold mb-2">Created</h3>
                    <div className="text-sm text-gray-300">
                      {new Date(editingPattern.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="bg-[#1a1a1a] p-4 rounded-lg">
                    <h3 className="text-white font-semibold mb-2">Last Updated</h3>
                    <div className="text-sm text-gray-300">
                      {new Date(editingPattern.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Tracks Preview */}
                <div>
                  <h3 className="text-white font-semibold mb-4">Tracks</h3>
                  <div className="space-y-2">
                    {editingPattern.tracks.map((track: any) => (
                      <div key={track.id} className="bg-[#1a1a1a] p-3 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded ${track.color}`}></div>
                          <span className="text-white text-sm">{track.name}</span>
                          {track.midiNotes && (
                            <span className="text-xs text-gray-400">
                              ({track.midiNotes.length} notes)
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Notes Piano Roll Modal */}
      {editingNotes && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <Card className="w-[95vw] h-[90vh] bg-[#141414] border border-gray-700 rounded-lg overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Edit MIDI Notes: {editingNotes.name}</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelEditNotes}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={saveEditedNotes}
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="h-full overflow-hidden">
              <div className="flex h-full gap-4">
                {/* Track List */}
                <div className="w-64 bg-[#1a1a1a] rounded-lg p-4 overflow-y-auto">
                  <h3 className="text-white font-semibold mb-4">Tracks</h3>
                  <div className="space-y-2">
                    {editingNotes.tracks.map((track: any) => (
                      <div
                        key={track.id}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedTrackForNotes === track.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-[#0a0a0a] text-gray-300 hover:bg-gray-700'
                        }`}
                        onClick={() => setSelectedTrackForNotes(track.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded ${track.color}`}></div>
                          <div className="flex-1">
                            <div className="font-medium">{track.name}</div>
                            <div className="text-xs text-gray-400">
                              {track.midiNotes?.length || 0} notes
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Piano Roll Editor */}
                <div className="flex-1 bg-[#1a1a1a] rounded-lg p-4 overflow-hidden">
                  {selectedTrackForNotes ? (
                    <PianoRollEditor
                      track={editingNotes.tracks.find((t: any) => t.id === selectedTrackForNotes)}
                      steps={editingNotes.steps}
                      bpm={editingNotes.bpm}
                      onAddNote={addNote}
                      onRemoveNote={removeNote}
                      onUpdateNote={updateNote}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      Select a track to edit notes
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MIDI Import Preview Modal */}
      {previewPattern && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <Card className="w-[90vw] max-h-[80vh] bg-[#141414] border border-gray-700 rounded-lg overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Preview MIDI Import: {previewPattern.name}</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelPreviewPattern}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={savePreviewPattern}
                  >
                    Save Pattern
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="overflow-y-auto max-h-[60vh]">
              <div className="space-y-6">
                {/* Pattern Name Input */}
                <div className="bg-[#1a1a1a] p-4 rounded-lg">
                  <h3 className="text-white font-semibold mb-3">Pattern Name</h3>
                  <Input
                    value={patternName}
                    onChange={(e) => setPatternName(e.target.value)}
                    placeholder="Enter pattern name..."
                    className="bg-[#0a0a0a] border-gray-600 text-white"
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    This will be the name of your saved pattern
                  </p>
                </div>

                {/* Pattern Type Selector */}
                <div className="bg-[#1a1a1a] p-4 rounded-lg">
                  <h3 className="text-white font-semibold mb-3">Pattern Type</h3>
                  <select
                    value={patternType}
                    onChange={(e) => setPatternType(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-gray-600 rounded px-3 py-2 text-white"
                  >
                    <option value="">Select pattern type...</option>
                    <option value="kick">Kick</option>
                    <option value="snare">Snare</option>
                    <option value="hihat">Hi-Hat</option>
                    <option value="hihat loop">Hi-Hat Loop</option>
                    <option value="clap">Clap</option>
                    <option value="tom">Tom</option>
                    <option value="crash">Crash</option>
                    <option value="ride">Ride</option>
                    <option value="808">808</option>
                    <option value="melody">Melody</option>
                    <option value="melody loop">Melody Loop</option>
                    <option value="bass">Bass</option>
                    <option value="bass loop">Bass Loop</option>
                    <option value="chord">Chord</option>
                    <option value="arp">Arpeggio</option>
                    <option value="lead">Lead</option>
                    <option value="pad">Pad</option>
                    <option value="fx">FX</option>
                    <option value="percussion">Percussion</option>
                    <option value="vocal">Vocal</option>
                    <option value="other">Other</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-2">
                    What type of pattern is this? (kick, snare, melody, etc.)
                  </p>
                </div>

                {/* Pattern Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#1a1a1a] p-4 rounded-lg">
                    <h3 className="text-white font-semibold mb-2">Pattern Details</h3>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-gray-400">Name:</span> <span className="text-white">{previewPattern.name}</span></div>
                      <div><span className="text-gray-400">BPM:</span> <span className="text-white">{previewPattern.bpm}</span></div>
                      <div><span className="text-gray-400">Steps:</span> <span className="text-white">{previewPattern.steps}</span></div>
                      <div><span className="text-gray-400">Tracks:</span> <span className="text-white">{previewPattern.tracks.length}</span></div>
                    </div>
                  </div>
                  
                  <div className="bg-[#1a1a1a] p-4 rounded-lg">
                    <h3 className="text-white font-semibold mb-2">MIDI Info</h3>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-gray-400">Format:</span> <span className="text-white">{previewPattern.midiData.format}</span></div>
                      <div><span className="text-gray-400">Tracks:</span> <span className="text-white">{previewPattern.midiData.numTracks}</span></div>
                      <div><span className="text-gray-400">Time Division:</span> <span className="text-white">{previewPattern.midiData.timeDivision}</span></div>
                    </div>
                  </div>
                  
                  <div className="bg-[#1a1a1a] p-4 rounded-lg">
                    <h3 className="text-white font-semibold mb-2">Description</h3>
                    <p className="text-sm text-gray-300">{previewPattern.description}</p>
                  </div>
                </div>

                {/* Tracks Preview */}
                <div>
                  <h3 className="text-white font-semibold mb-4">Tracks Preview</h3>
                  <div className="space-y-4">
                    {previewPattern.tracks.map((track: any) => (
                      <div key={track.id} className="bg-[#1a1a1a] p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded ${track.color}`}></div>
                            <span className="text-white font-medium">{track.name}</span>
                          </div>
                          <div className="text-sm text-gray-400">
                            {track.midiNotes?.length || 0} notes
                          </div>
                        </div>
                        
                        {/* Sequencer Grid Preview */}
                        <div className="bg-[#0a0a0a] p-3 rounded">
                          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.min(previewPattern.steps, 16)}, 1fr)` }}>
                            {previewPattern.sequencerData[track.id]?.slice(0, 16).map((step: boolean, stepIndex: number) => (
                              <div
                                key={stepIndex}
                                className={`w-4 h-4 rounded-sm border ${
                                  step 
                                    ? 'bg-green-500 border-green-400' 
                                    : 'bg-gray-800 border-gray-700'
                                }`}
                                title={`Step ${stepIndex + 1}: ${step ? 'ON' : 'OFF'}`}
                              />
                            ))}
                          </div>
                          {previewPattern.steps > 16 && (
                            <div className="text-xs text-gray-500 mt-2">
                              Showing first 16 of {previewPattern.steps} steps
                            </div>
                          )}
                        </div>
                        
                        {/* MIDI Notes Preview */}
                        {track.midiNotes && track.midiNotes.length > 0 && (
                          <div className="mt-3">
                            <h4 className="text-sm text-gray-400 mb-2">MIDI Notes:</h4>
                            <div className="flex flex-wrap gap-1">
                              {track.midiNotes.slice(0, 10).map((note: any, noteIndex: number) => (
                                <Badge key={noteIndex} variant="secondary" className="text-xs">
                                  {note.note} (step {note.startStep + 1})
                                </Badge>
                              ))}
                              {track.midiNotes.length > 10 && (
                                <Badge variant="outline" className="text-xs">
                                  +{track.midiNotes.length - 10} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pack Creation Modal */}
      <Dialog open={showPackModal} onOpenChange={setShowPackModal}>
        <DialogContent className="bg-[#141414] border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Create Pattern Pack</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreatePack} className="space-y-4">
            <div>
              <label className="text-sm text-gray-300 mb-1 block">Pack Name *</label>
              <Input
                value={newPack.name}
                onChange={(e) => setNewPack({ ...newPack, name: e.target.value })}
                placeholder="Enter pack name..."
                className="bg-[#1a1a1a] border-gray-600 text-white"
                required
              />
            </div>
            <div>
              <label className="text-sm text-gray-300 mb-1 block">Description</label>
              <Textarea
                value={newPack.description}
                onChange={(e) => setNewPack({ ...newPack, description: e.target.value })}
                placeholder="Enter pack description..."
                className="bg-[#1a1a1a] border-gray-600 text-white"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm text-gray-300 mb-1 block">Color</label>
              <div className="flex gap-2">
                {['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'].map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-colors ${
                      newPack.color === color ? 'border-white' : 'border-gray-600'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewPack({ ...newPack, color })}
                  />
                ))}
              </div>
            </div>
            {packCreateError && (
              <div className="text-red-400 text-sm">{packCreateError}</div>
            )}
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={packCreating}>
                {packCreating ? 'Creating...' : 'Create Pack'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Subfolder Creation Modal */}
      <Dialog open={showSubfolderModal} onOpenChange={setShowSubfolderModal}>
        <DialogContent className="bg-[#141414] border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Create Subfolder</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubfolder} className="space-y-4">
            <div>
              <label className="text-sm text-gray-300 mb-1 block">Pack</label>
              <select
                value={newSubfolder.pack_id}
                onChange={e => setNewSubfolder({ ...newSubfolder, pack_id: e.target.value })}
                className="w-full p-2 border border-gray-600 rounded-md bg-[#1a1a1a] text-white"
                required
              >
                <option value="">Select Pack</option>
                {patternPacks.map(pack => (
                  <option key={pack.id} value={pack.id}>{pack.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-300 mb-1 block">Subfolder Name *</label>
              <Input
                value={newSubfolder.name}
                onChange={(e) => setNewSubfolder({ ...newSubfolder, name: e.target.value })}
                placeholder="Enter subfolder name..."
                className="bg-[#1a1a1a] border-gray-600 text-white"
                required
              />
            </div>
            <div>
              <label className="text-sm text-gray-300 mb-1 block">Description</label>
              <Textarea
                value={newSubfolder.description}
                onChange={(e) => setNewSubfolder({ ...newSubfolder, description: e.target.value })}
                placeholder="Enter subfolder description..."
                className="bg-[#1a1a1a] border-gray-600 text-white"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm text-gray-300 mb-1 block">Color</label>
              <div className="flex gap-2">
                {['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'].map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-colors ${
                      newSubfolder.color === color ? 'border-white' : 'border-gray-600'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewSubfolder({ ...newSubfolder, color })}
                  />
                ))}
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={subfolderCreating}>
                {subfolderCreating ? 'Creating...' : 'Create Subfolder'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pattern Metadata Editing Modal */}
      {editingPatternMetadata && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <Card className="w-[90vw] max-h-[80vh] bg-[#141414] border border-gray-700 rounded-lg overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Edit Pattern Metadata: {editingPatternMetadata.name}</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelEditPatternMetadata}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={savePatternMetadata}
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="overflow-y-auto max-h-[60vh]">
              <div className="space-y-6">
                {/* Pattern Name */}
                <div className="bg-[#1a1a1a] p-4 rounded-lg">
                  <h3 className="text-white font-semibold mb-3">Pattern Name *</h3>
                  <Input
                    value={editingPatternMetadata.name}
                    onChange={(e) => setEditingPatternMetadata({ ...editingPatternMetadata, name: e.target.value })}
                    placeholder="Enter pattern name..."
                    className="bg-[#0a0a0a] border-gray-600 text-white"
                  />
                </div>

                {/* Pattern Description */}
                <div className="bg-[#1a1a1a] p-4 rounded-lg">
                  <h3 className="text-white font-semibold mb-3">Description</h3>
                  <Textarea
                    value={editingPatternMetadata.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditingPatternMetadata({ ...editingPatternMetadata, description: e.target.value })}
                    placeholder="Enter pattern description..."
                    className="bg-[#0a0a0a] border-gray-600 text-white min-h-[80px]"
                  />
                </div>

                {/* Pattern Type */}
                <div className="bg-[#1a1a1a] p-4 rounded-lg">
                  <h3 className="text-white font-semibold mb-3">Pattern Type</h3>
                  <select
                    value={editingPatternMetadata.pattern_type}
                    onChange={(e) => setEditingPatternMetadata({ ...editingPatternMetadata, pattern_type: e.target.value })}
                    className="w-full bg-[#0a0a0a] border border-gray-600 rounded px-3 py-2 text-white"
                  >
                    <option value="">Select pattern type...</option>
                    <option value="kick">Kick</option>
                    <option value="snare">Snare</option>
                    <option value="hihat">Hi-Hat</option>
                    <option value="hihat loop">Hi-Hat Loop</option>
                    <option value="clap">Clap</option>
                    <option value="tom">Tom</option>
                    <option value="crash">Crash</option>
                    <option value="ride">Ride</option>
                    <option value="808">808</option>
                    <option value="melody">Melody</option>
                    <option value="melody loop">Melody Loop</option>
                    <option value="bass">Bass</option>
                    <option value="bass loop">Bass Loop</option>
                    <option value="chord">Chord</option>
                    <option value="arp">Arpeggio</option>
                    <option value="lead">Lead</option>
                    <option value="pad">Pad</option>
                    <option value="fx">FX</option>
                    <option value="percussion">Percussion</option>
                    <option value="vocal">Vocal</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Category */}
                <div className="bg-[#1a1a1a] p-4 rounded-lg">
                  <h3 className="text-white font-semibold mb-3">Category</h3>
                  <Input
                    value={editingPatternMetadata.category}
                    onChange={(e) => setEditingPatternMetadata({ ...editingPatternMetadata, category: e.target.value })}
                    placeholder="Enter category (e.g., Hip Hop, Electronic, etc.)..."
                    className="bg-[#0a0a0a] border-gray-600 text-white"
                  />
                </div>

                {/* Tags */}
                <div className="bg-[#1a1a1a] p-4 rounded-lg">
                  <h3 className="text-white font-semibold mb-3">Tags</h3>
                  <Input
                    value={editingPatternMetadata.tags?.join(', ') || ''}
                    onChange={(e) => setEditingPatternMetadata({ ...editingPatternMetadata, tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean) })}
                    placeholder="Enter tags separated by commas..."
                    className="bg-[#0a0a0a] border-gray-600 text-white"
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    Separate multiple tags with commas (e.g., trap, 808, dark)
                  </p>
                </div>

                {/* Pattern Info (Read-only) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#1a1a1a] p-4 rounded-lg">
                    <h3 className="text-white font-semibold mb-2">Pattern Details</h3>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-gray-400">BPM:</span> <span className="text-white">{editingPatternMetadata.bpm}</span></div>
                      <div><span className="text-gray-400">Steps:</span> <span className="text-white">{editingPatternMetadata.steps}</span></div>
                      <div><span className="text-gray-400">Tracks:</span> <span className="text-white">{editingPatternMetadata.tracks.length}</span></div>
                    </div>
                  </div>
                  
                  <div className="bg-[#1a1a1a] p-4 rounded-lg">
                    <h3 className="text-white font-semibold mb-2">Created</h3>
                    <div className="text-sm text-gray-300">
                      {new Date(editingPatternMetadata.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="bg-[#1a1a1a] p-4 rounded-lg">
                    <h3 className="text-white font-semibold mb-2">Last Updated</h3>
                    <div className="text-sm text-gray-300">
                      {new Date(editingPatternMetadata.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Tracks Preview */}
                <div>
                  <h3 className="text-white font-semibold mb-4">Tracks</h3>
                  <div className="space-y-2">
                    {editingPatternMetadata.tracks.map((track: any) => (
                      <div key={track.id} className="bg-[#1a1a1a] p-3 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded ${track.color}`}></div>
                          <span className="text-white text-sm">{track.name}</span>
                          {track.midiNotes && (
                            <span className="text-xs text-gray-400">
                              ({track.midiNotes.length} notes)
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Mass Edit Modal */}
      <Dialog open={showMassEditModal} onOpenChange={setShowMassEditModal}>
        <DialogContent className="bg-[#141414] border-gray-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              Mass Edit Selected Patterns
            </DialogTitle>
            <div className="text-gray-400 text-sm">
              Editing {selectedPatterns.size} selected patterns
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Field Selection */}
            <div>
              <label className="text-white font-medium mb-3 block">Select Fields to Edit:</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  { value: 'category', label: 'Category' },
                  { value: 'pattern_type', label: 'Pattern Type' },
                  { value: 'tags', label: 'Tags' },
                  { value: 'bpm', label: 'BPM' },
                  { value: 'key', label: 'Key' }
                ].map((field) => (
                  <Button
                    key={field.value}
                    variant={selectedMassEditFields.has(field.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleMassEditFieldToggle(field.value)}
                    className={`justify-start ${
                      selectedMassEditFields.has(field.value)
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    {selectedMassEditFields.has(field.value) && <CheckCircle2 className="w-4 h-4 mr-2" />}
                    {field.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Edit Values */}
            {selectedMassEditFields.size > 0 && (
              <div className="space-y-4">
                <label className="text-white font-medium">Edit Values:</label>
                
                {selectedMassEditFields.has('category') && (
                  <div>
                    <label className="text-white text-sm">Category</label>
                    <Input
                      placeholder="e.g., Trap, Hip Hop, EDM"
                      value={massEditValues.category}
                      onChange={(e) => handleMassEditValueChange('category', e.target.value)}
                      className="bg-[#2a2a2a] border-gray-600 text-white"
                    />
                  </div>
                )}

                {selectedMassEditFields.has('pattern_type') && (
                  <div>
                    <label className="text-white text-sm">Pattern Type</label>
                    <select
                      value={massEditValues.pattern_type}
                      onChange={(e) => handleMassEditValueChange('pattern_type', e.target.value)}
                      className="w-full p-2 border border-gray-600 rounded-md bg-[#2a2a2a] text-white"
                    >
                      <option value="">Select type</option>
                      <option value="kick">Kick</option>
                      <option value="snare">Snare</option>
                      <option value="hihat">Hi-Hat</option>
                      <option value="hihat loop">Hi-Hat Loop</option>
                      <option value="clap">Clap</option>
                      <option value="tom">Tom</option>
                      <option value="crash">Crash</option>
                      <option value="ride">Ride</option>
                      <option value="melody">Melody</option>
                      <option value="melody loop">Melody Loop</option>
                      <option value="bass">Bass</option>
                      <option value="bass loop">Bass Loop</option>
                      <option value="chord">Chord</option>
                      <option value="arp">Arpeggio</option>
                      <option value="lead">Lead</option>
                      <option value="pad">Pad</option>
                      <option value="fx">FX</option>
                      <option value="percussion">Percussion</option>
                      <option value="vocal">Vocal</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                )}

                {selectedMassEditFields.has('tags') && (
                  <div>
                    <label className="text-white text-sm">Tags</label>
                    <Input
                      placeholder="comma-separated, e.g., trap, dark, aggressive, 808"
                      value={massEditValues.tags}
                      onChange={(e) => handleMassEditValueChange('tags', e.target.value)}
                      className="bg-[#2a2a2a] border-gray-600 text-white"
                    />
                  </div>
                )}

                {selectedMassEditFields.has('bpm') && (
                  <div>
                    <label className="text-white text-sm">BPM</label>
                    <Input
                      type="number"
                      placeholder="e.g., 140"
                      value={massEditValues.bpm}
                      onChange={(e) => handleMassEditValueChange('bpm', e.target.value)}
                      className="bg-[#2a2a2a] border-gray-600 text-white"
                    />
                  </div>
                )}

                {selectedMassEditFields.has('key') && (
                  <div>
                    <label className="text-white text-sm">Key</label>
                    <select
                      value={massEditValues.key}
                      onChange={(e) => handleMassEditValueChange('key', e.target.value)}
                      className="w-full p-2 border border-gray-600 rounded-md bg-[#2a2a2a] text-white"
                    >
                      <option value="">Select key</option>
                      <option value="C">C</option>
                      <option value="C#">C#</option>
                      <option value="D">D</option>
                      <option value="D#">D#</option>
                      <option value="E">E</option>
                      <option value="F">F</option>
                      <option value="F#">F#</option>
                      <option value="G">G</option>
                      <option value="G#">G#</option>
                      <option value="A">A</option>
                      <option value="A#">A#</option>
                      <option value="B">B</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Selected Patterns Preview */}
            <div>
              <label className="text-white font-medium mb-3 block">Selected Patterns ({selectedPatterns.size}):</label>
              <div className="max-h-40 overflow-y-auto bg-[#2a2a2a] rounded border border-gray-600 p-3">
                {allPatterns
                  .filter(pattern => selectedPatterns.has(pattern.id))
                  .map((pattern) => (
                    <div key={pattern.id} className="text-sm text-gray-300 py-1 border-b border-gray-700 last:border-b-0">
                      {pattern.name}
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={resetMassEditForm} disabled={massEditLoading}>
              Reset
            </Button>
            <Button variant="outline" onClick={() => setShowMassEditModal(false)} disabled={massEditLoading}>
              Cancel
            </Button>
            <Button 
              onClick={applyMassEdit}
              disabled={massEditLoading || selectedMassEditFields.size === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {massEditLoading ? 'Updating...' : `Update ${selectedPatterns.size} Patterns`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default EditPatternsPage; 