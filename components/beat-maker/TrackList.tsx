import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Music, Volume2, VolumeX, Plus, Trash2, GripVertical, RotateCcw, Clock, Edit, ChevronDown, ChevronUp, Music2, Brain, Piano, Lock, Unlock, Copy, X, Save, FolderOpen } from 'lucide-react'
import { Track } from '@/hooks/useBeatMaker'
import { useState, useEffect } from 'react'
import { StockSoundSelector } from './StockSoundSelector'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// Musical key calculation utilities
const CHROMATIC_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

const calculateKeyFromPitchShift = (originalKey: string, pitchShift: number): string => {
  const originalIndex = CHROMATIC_SCALE.indexOf(originalKey)
  if (originalIndex === -1) return originalKey // Invalid key, return as-is
  
  // Calculate new index with wrapping
  let newIndex = (originalIndex + pitchShift) % 12
  if (newIndex < 0) newIndex += 12
  
  return CHROMATIC_SCALE[newIndex]
}

const getIntervalName = (semitones: number): string => {
  const intervals: { [key: number]: string } = {
    0: 'Unison',
    1: 'Minor 2nd',
    2: 'Major 2nd', 
    3: 'Minor 3rd',
    4: 'Major 3rd',
    5: 'Perfect 4th',
    6: 'Tritone',
    7: 'Perfect 5th',
    8: 'Minor 6th',
    9: 'Major 6th',
    10: 'Minor 7th',
    11: 'Major 7th',
    12: 'Octave',
    [-12]: 'Octave Down',
    [-11]: 'Major 7th Down',
    [-10]: 'Minor 7th Down',
    [-9]: 'Major 6th Down',
    [-8]: 'Minor 6th Down',
    [-7]: 'Perfect 5th Down',
    [-6]: 'Tritone Down',
    [-5]: 'Perfect 4th Down',
    [-4]: 'Major 3rd Down',
    [-3]: 'Minor 3rd Down',
    [-2]: 'Major 2nd Down',
    [-1]: 'Minor 2nd Down'
  }
  return intervals[semitones] || `${semitones > 0 ? '+' : ''}${semitones} semi`
}

// Piano roll component for key selection
const PianoRoll = ({ 
  originalKey, 
  currentPitchShift, 
  onKeySelect 
}: { 
  originalKey: string
  currentPitchShift: number
  onKeySelect: (pitchShift: number) => void 
}) => {
  const originalKeyIndex = CHROMATIC_SCALE.indexOf(originalKey)
  const currentKeyIndex = (originalKeyIndex + currentPitchShift) % 12
  
  // Piano key layout: white keys and their positions
  const whiteKeys = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
  const blackKeys = ['C#', 'D#', '', 'F#', 'G#', 'A#', ''] // Empty strings for gaps
  
  const getKeyType = (key: string) => whiteKeys.includes(key) ? 'white' : 'black'
  
  const getPitchShiftForKey = (key: string) => {
    const keyIndex = CHROMATIC_SCALE.indexOf(key)
    let pitchShift = keyIndex - originalKeyIndex
    
    // Wrap to -6 to +6 range (closest path)
    if (pitchShift > 6) pitchShift -= 12
    if (pitchShift < -6) pitchShift += 12
    
    return pitchShift
  }

  return (
    <div className="relative w-full h-12 bg-gray-900 rounded border border-gray-600 overflow-hidden">
      {/* White keys */}
      <div className="flex h-full">
        {whiteKeys.map((key, index) => {
          const pitchShift = getPitchShiftForKey(key)
          const isOriginal = key === originalKey
          const isCurrent = CHROMATIC_SCALE.indexOf(key) === (currentKeyIndex < 0 ? currentKeyIndex + 12 : currentKeyIndex)
          
          return (
            <button
              key={key}
              onClick={() => onKeySelect(pitchShift)}
              className={`w-7 h-full border-r border-gray-300 relative transition-all duration-150 shadow-sm ${
                isOriginal 
                  ? 'bg-yellow-400 hover:bg-yellow-300 border-yellow-500' 
                  : isCurrent 
                    ? 'bg-blue-400 hover:bg-blue-300 border-blue-500' 
                    : 'bg-white hover:bg-gray-50 active:bg-gray-100'
              }`}
              style={{
                background: isOriginal 
                  ? 'linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%)' 
                  : isCurrent 
                    ? 'linear-gradient(180deg, #60a5fa 0%, #3b82f6 100%)' 
                    : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)'
              }}
              title={`${key} (${pitchShift > 0 ? '+' : ''}${pitchShift})`}
            >
              <span className={`absolute bottom-0.5 left-1/2 transform -translate-x-1/2 text-xs font-semibold ${
                isOriginal || isCurrent ? 'text-black' : 'text-gray-700'
              }`}>
                {key}
              </span>
            </button>
          )
        })}
      </div>

      {/* Black keys */}
      <div className="absolute top-0 left-0 w-full h-7 flex">
        {/* C# */}
        <div className="w-3.5"></div>
        <button
          onClick={() => onKeySelect(getPitchShiftForKey('C#'))}
          className={`w-4 h-full rounded-b shadow-md transition-all duration-150 ${
            originalKey === 'C#' 
              ? 'bg-yellow-600 hover:bg-yellow-500 border border-yellow-700' 
              : CHROMATIC_SCALE.indexOf('C#') === (currentKeyIndex < 0 ? currentKeyIndex + 12 : currentKeyIndex)
                ? 'bg-blue-600 hover:bg-blue-500 border border-blue-700' 
                : 'bg-gray-800 hover:bg-gray-700 border border-gray-900'
          }`}
          style={{
            background: originalKey === 'C#' 
              ? 'linear-gradient(180deg, #d97706 0%, #92400e 100%)' 
              : CHROMATIC_SCALE.indexOf('C#') === (currentKeyIndex < 0 ? currentKeyIndex + 12 : currentKeyIndex)
                ? 'linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%)' 
                : 'linear-gradient(180deg, #374151 0%, #1f2937 100%)'
          }}
          title={`C# (${getPitchShiftForKey('C#') > 0 ? '+' : ''}${getPitchShiftForKey('C#')})`}
        >
          <span className="text-xs font-semibold text-white">♯</span>
        </button>
        
        {/* D# */}
        <div className="w-3"></div>
        <button
          onClick={() => onKeySelect(getPitchShiftForKey('D#'))}
          className={`w-4 h-full rounded-b shadow-md transition-all duration-150 ${
            originalKey === 'D#' 
              ? 'bg-yellow-600 hover:bg-yellow-500 border border-yellow-700' 
              : CHROMATIC_SCALE.indexOf('D#') === (currentKeyIndex < 0 ? currentKeyIndex + 12 : currentKeyIndex)
                ? 'bg-blue-600 hover:bg-blue-500 border border-blue-700' 
                : 'bg-gray-800 hover:bg-gray-700 border border-gray-900'
          }`}
          style={{
            background: originalKey === 'D#' 
              ? 'linear-gradient(180deg, #d97706 0%, #92400e 100%)' 
              : CHROMATIC_SCALE.indexOf('D#') === (currentKeyIndex < 0 ? currentKeyIndex + 12 : currentKeyIndex)
                ? 'linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%)' 
                : 'linear-gradient(180deg, #374151 0%, #1f2937 100%)'
          }}
          title={`D# (${getPitchShiftForKey('D#') > 0 ? '+' : ''}${getPitchShiftForKey('D#')})`}
        >
          <span className="text-xs font-semibold text-white">♯</span>
        </button>
        
        {/* Gap for E */}
        <div className="w-7"></div>
        
        {/* F# */}
        <div className="w-3.5"></div>
        <button
          onClick={() => onKeySelect(getPitchShiftForKey('F#'))}
          className={`w-4 h-full rounded-b shadow-md transition-all duration-150 ${
            originalKey === 'F#' 
              ? 'bg-yellow-600 hover:bg-yellow-500 border border-yellow-700' 
              : CHROMATIC_SCALE.indexOf('F#') === (currentKeyIndex < 0 ? currentKeyIndex + 12 : currentKeyIndex)
                ? 'bg-blue-600 hover:bg-blue-500 border border-blue-700' 
                : 'bg-gray-800 hover:bg-gray-700 border border-gray-900'
          }`}
          style={{
            background: originalKey === 'F#' 
              ? 'linear-gradient(180deg, #d97706 0%, #92400e 100%)' 
              : CHROMATIC_SCALE.indexOf('F#') === (currentKeyIndex < 0 ? currentKeyIndex + 12 : currentKeyIndex)
                ? 'linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%)' 
                : 'linear-gradient(180deg, #374151 0%, #1f2937 100%)'
          }}
          title={`F# (${getPitchShiftForKey('F#') > 0 ? '+' : ''}${getPitchShiftForKey('F#')})`}
        >
          <span className="text-xs font-semibold text-white">♯</span>
        </button>
        
        {/* G# */}
        <div className="w-3"></div>
        <button
          onClick={() => onKeySelect(getPitchShiftForKey('G#'))}
          className={`w-4 h-full rounded-b shadow-md transition-all duration-150 ${
            originalKey === 'G#' 
              ? 'bg-yellow-600 hover:bg-yellow-500 border border-yellow-700' 
              : CHROMATIC_SCALE.indexOf('G#') === (currentKeyIndex < 0 ? currentKeyIndex + 12 : currentKeyIndex)
                ? 'bg-blue-600 hover:bg-blue-500 border border-blue-700' 
                : 'bg-gray-800 hover:bg-gray-700 border border-gray-900'
          }`}
          style={{
            background: originalKey === 'G#' 
              ? 'linear-gradient(180deg, #d97706 0%, #92400e 100%)' 
              : CHROMATIC_SCALE.indexOf('G#') === (currentKeyIndex < 0 ? currentKeyIndex + 12 : currentKeyIndex)
                ? 'linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%)' 
                : 'linear-gradient(180deg, #374151 0%, #1f2937 100%)'
          }}
          title={`G# (${getPitchShiftForKey('G#') > 0 ? '+' : ''}${getPitchShiftForKey('G#')})`}
        >
          <span className="text-xs font-semibold text-white">♯</span>
        </button>
        
        {/* A# */}
        <div className="w-3"></div>
        <button
          onClick={() => onKeySelect(getPitchShiftForKey('A#'))}
          className={`w-4 h-full rounded-b shadow-md transition-all duration-150 ${
            originalKey === 'A#' 
              ? 'bg-yellow-600 hover:bg-yellow-500 border border-yellow-700' 
              : CHROMATIC_SCALE.indexOf('A#') === (currentKeyIndex < 0 ? currentKeyIndex + 12 : currentKeyIndex)
                ? 'bg-blue-600 hover:bg-blue-500 border border-blue-700' 
                : 'bg-gray-800 hover:bg-gray-700 border border-gray-900'
          }`}
          style={{
            background: originalKey === 'A#' 
              ? 'linear-gradient(180deg, #d97706 0%, #92400e 100%)' 
              : CHROMATIC_SCALE.indexOf('A#') === (currentKeyIndex < 0 ? currentKeyIndex + 12 : currentKeyIndex)
                ? 'linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%)' 
                : 'linear-gradient(180deg, #374151 0%, #1f2937 100%)'
          }}
          title={`A# (${getPitchShiftForKey('A#') > 0 ? '+' : ''}${getPitchShiftForKey('A#')})`}
        >
          <span className="text-xs font-semibold text-white">♯</span>
        </button>
      </div>
    </div>
  )
}

interface TrackListProps {
  tracks: Track[]
  onTrackAudioSelect: (trackId: number) => void
  currentStep: number
  sequencerData: { [trackId: number]: boolean[] }
  onAddTrack: (trackType?: string) => void
  onRemoveTrack: (trackId: number) => void
  onReorderTracks?: (newOrder: Track[]) => void
  onDirectAudioDrop?: (trackId: number, file: File) => void
  onTrackTempoChange?: (trackId: number, newBpm: number, originalBpm?: number) => void
  onTrackPitchChange?: (trackId: number, pitchShift: number, originalKey?: string, currentKey?: string) => void
  onShuffleAudio?: (trackId: number) => void
  onShuffleAllAudio?: () => void
  onDuplicateWithShuffle?: (trackId: number) => void
  onCopyTrackKey?: (fromTrackId: number, toTrackId: number, key: string) => void
  onCopyTrackBpm?: (fromTrackId: number, toTrackId: number, bpm: number) => void
  onOpenPianoRoll?: (trackId: number) => void
  onSetTransportBpm?: (bpm: number) => void
  onSetTransportKey?: (key: string) => void
  onToggleTrackLock?: (trackId: number) => void
  onToggleTrackMute?: (trackId: number) => void
  transportKey?: string
}

export function TrackList({ tracks, onTrackAudioSelect, currentStep, sequencerData, onAddTrack, onRemoveTrack, onReorderTracks, onDirectAudioDrop, onTrackTempoChange, onTrackPitchChange, onShuffleAudio, onShuffleAllAudio, onDuplicateWithShuffle, onCopyTrackKey, onCopyTrackBpm, onOpenPianoRoll, onTrackStockSoundSelect, onSetTransportBpm, onSetTransportKey, onToggleTrackLock, onToggleTrackMute, transportKey }: TrackListProps & { onTrackStockSoundSelect?: (trackId: number, sound: any) => void }) {
  const [draggedTrack, setDraggedTrack] = useState<Track | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [draggedKey, setDraggedKey] = useState<string | null>(null)
  const [draggedKeyTrackId, setDraggedKeyTrackId] = useState<number | null>(null)
  const [draggedBpm, setDraggedBpm] = useState<number | null>(null)
  const [draggedBpmTrackId, setDraggedBpmTrackId] = useState<number | null>(null)
  const [dragLinePosition, setDragLinePosition] = useState<{ x: number, y: number } | null>(null)
  const [keyDropTarget, setKeyDropTarget] = useState<number | null>(null)
  const [bpmDropTarget, setBpmDropTarget] = useState<number | null>(null)
  const [audioDragOverTrack, setAudioDragOverTrack] = useState<number | null>(null)
  const [bpmInputValues, setBpmInputValues] = useState<{[trackId: number]: string}>({})
  const [originalBpmInputValues, setOriginalBpmInputValues] = useState<{[trackId: number]: string}>({})
  const [editingOriginalBpm, setEditingOriginalBpm] = useState<{[trackId: number]: boolean}>({})
  const [showTempoControls, setShowTempoControls] = useState<{[trackId: number]: boolean}>({})
  const [showKeyControls, setShowKeyControls] = useState<{[trackId: number]: boolean}>({})
  const [editingOriginalKey, setEditingOriginalKey] = useState<{[trackId: number]: boolean}>({})
  const [expandedNames, setExpandedNames] = useState<{[trackId: number]: boolean}>({})
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedKey, setSelectedKey] = useState<string>(transportKey || 'C')

  // Stock sound selector state
  const [showStockSoundSelector, setShowStockSoundSelector] = useState<{trackId: number | null}>({trackId: null})

  const handleDragStart = (e: React.DragEvent, track: Track) => {
    setDraggedTrack(track)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (!draggedTrack || !onReorderTracks) return

    const dragIndex = tracks.findIndex(t => t.id === draggedTrack.id)
    if (dragIndex === dropIndex) return

    const newTracks = [...tracks]
    const [removed] = newTracks.splice(dragIndex, 1)
    newTracks.splice(dropIndex, 0, removed)

    onReorderTracks(newTracks)
    setDraggedTrack(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedTrack(null)
    setDragOverIndex(null)
  }

  // Audio file drag handlers
  const handleAudioDragOver = (e: React.DragEvent, trackId: number) => {
    // Check if it's an audio file being dragged (not a track reorder)
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault()
      e.stopPropagation()
      setAudioDragOverTrack(trackId)
    }
  }

  const handleAudioDragLeave = (e: React.DragEvent) => {
    // Only clear if we're actually leaving the track area
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setAudioDragOverTrack(null)
    }
  }

  const handleAudioDrop = (e: React.DragEvent, trackId: number) => {
    e.preventDefault()
    e.stopPropagation()
    setAudioDragOverTrack(null)

    const files = e.dataTransfer.files
    if (files.length > 0 && onDirectAudioDrop) {
      const file = files[0]
      if (file.type.startsWith('audio/')) {
        onDirectAudioDrop(trackId, file)
      } else {
        alert('Please drop an audio file')
      }
    }
  }

  const handleKeyDrop = (e: React.DragEvent, toTrackId: number) => {
    e.preventDefault()
    e.stopPropagation()
    
    try {
      // Try to get the key data from the drag event
      const keyData = e.dataTransfer.getData('application/track-key')
      if (keyData) {
        const { key, trackId: fromTrackId } = JSON.parse(keyData)
        if (fromTrackId !== toTrackId && onCopyTrackKey) {
          onCopyTrackKey(fromTrackId, toTrackId, key)
          console.log(`Key ${key} copied from track ${fromTrackId} to track ${toTrackId}`)
        }
      }
    } catch (error) {
      console.error('Error handling key drop:', error)
    }
    
    // Clear drag state
    setDraggedKey(null)
    setDraggedKeyTrackId(null)
    setDragLinePosition(null)
    setKeyDropTarget(null)
  }

  // Handle mouse move for drag line
  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedKey || draggedBpm) {
      setDragLinePosition({ x: e.clientX, y: e.clientY })
    }
  }

  // Handle mouse up to clear drag state
  const handleMouseUp = () => {
    if (draggedKey && keyDropTarget && draggedKeyTrackId && onCopyTrackKey) {
      // Copy the key to the target track
      onCopyTrackKey(draggedKeyTrackId, keyDropTarget, draggedKey)
      console.log(`Key ${draggedKey} copied from track ${draggedKeyTrackId} to track ${keyDropTarget}`)
    }
    
    if (draggedBpm && bpmDropTarget && draggedBpmTrackId && onCopyTrackBpm) {
      // Copy the BPM to the target track
      onCopyTrackBpm(draggedBpmTrackId, bpmDropTarget, draggedBpm)
      console.log(`BPM ${draggedBpm} copied from track ${draggedBpmTrackId} to track ${bpmDropTarget}`)
    }
    
    // Clear all drag state
    setDraggedKey(null)
    setDraggedKeyTrackId(null)
    setDraggedBpm(null)
    setDraggedBpmTrackId(null)
    setDragLinePosition(null)
    setKeyDropTarget(null)
    setBpmDropTarget(null)
  }

  // Handle track hover for key drop
  const handleTrackHover = (trackId: number) => {
    if (draggedKey && draggedKeyTrackId && trackId !== draggedKeyTrackId) {
      setKeyDropTarget(trackId)
    }
    if (draggedBpm && draggedBpmTrackId && trackId !== draggedBpmTrackId) {
      setBpmDropTarget(trackId)
    }
  }

  const handleTrackLeave = () => {
    setKeyDropTarget(null)
    setBpmDropTarget(null)
  }

  // Global mouse up handler to clear drag state
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (draggedKey) {
        if (keyDropTarget && draggedKeyTrackId && onCopyTrackKey) {
          // Copy the key to the target track
          onCopyTrackKey(draggedKeyTrackId, keyDropTarget, draggedKey)
          console.log(`Key ${draggedKey} copied from track ${draggedKeyTrackId} to track ${keyDropTarget}`)
        }
        
        // Clear all drag state
        setDraggedKey(null)
        setDraggedKeyTrackId(null)
        setDragLinePosition(null)
        setKeyDropTarget(null)
      }
      
      if (draggedBpm) {
        if (bpmDropTarget && draggedBpmTrackId && onCopyTrackBpm) {
          // Copy the BPM to the target track
          onCopyTrackBpm(draggedBpmTrackId, bpmDropTarget, draggedBpm)
          console.log(`BPM ${draggedBpm} copied from track ${draggedBpmTrackId} to track ${bpmDropTarget}`)
        }
        
        // Clear all drag state
        setDraggedBpm(null)
        setDraggedBpmTrackId(null)
        setDragLinePosition(null)
        setBpmDropTarget(null)
      }
    }

    document.addEventListener('mouseup', handleGlobalMouseUp)
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [draggedKey, keyDropTarget, draggedKeyTrackId, onCopyTrackKey, draggedBpm, bpmDropTarget, draggedBpmTrackId, onCopyTrackBpm])

  const toggleNameExpansion = (trackId: number) => {
    setExpandedNames(prev => ({
      ...prev,
      [trackId]: !prev[trackId]
    }))
  }

  // Track categories and their options
  const trackCategories = {
    'Drums': ['Kick', 'Snare', 'Hi-Hat', 'Clap', 'Crash', 'Ride', 'Tom', 'Cymbal', 'Percussion'],
    'Bass': ['Bass', 'Sub', '808'],
    'Loops': ['Melody Loop', 'Piano Loop', '808 Loop', 'Drum Loop', 'Bass Loop', 'Vocal Loop', 'Guitar Loop', 'Synth Loop', 'Percussion Loop', 'Snare Loop', 'Kick Loop', 'Hihat Loop', 'Clap Loop', 'Crash Loop', 'Ride Loop', 'Tom Loop', 'Lead Loop', 'Pad Loop', 'Arp Loop', 'Chord Loop', 'FX Loop', 'Ambient Loop', 'Break', 'Fill', 'Transition'],
    'Effects': ['FX', 'Vocal', 'Sample'],
    'Technical': ['MIDI', 'Patch', 'Preset']
  }

  const categoryIcons = {
    'Drums': '🥁',
    'Bass': '🎸',
    'Loops': '🔄',
    'Effects': '🎛️',
    'Technical': '⚙️'
  }

  const categoryColors = {
    'Drums': 'text-green-400',
    'Bass': 'text-orange-400',
    'Loops': 'text-purple-400',
    'Effects': 'text-cyan-400',
    'Technical': 'text-blue-400'
  }

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category)
    setShowCategoryModal(true)
  }

  const handleTrackTypeSelect = (trackType: string) => {
    // Call the existing addTrackByType function from the parent component
    onAddTrack(trackType)
    setShowCategoryModal(false)
  }

  return (
    <>
      {/* Stock Sound Selector Modal */}
      {showStockSoundSelector.trackId !== null && (
        <StockSoundSelector
          isOpen={true}
          onClose={() => setShowStockSoundSelector({trackId: null})}
          onSelectSound={(sound) => {
            if (onTrackStockSoundSelect) {
              onTrackStockSoundSelect(showStockSoundSelector.trackId!, sound)
            }
            setShowStockSoundSelector({trackId: null})
          }}
        />
      )}
      
      {/* Category Selection Modal */}
      {showCategoryModal && (
        <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
          <DialogContent className="bg-[#141414] border-gray-700 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center justify-between">
                <span>Add {selectedCategory} Track</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCategoryModal(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div className="p-6">
              <p className="text-gray-400 mb-6">Choose the type of {selectedCategory.toLowerCase()} track you want to add:</p>
              

              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {trackCategories[selectedCategory as keyof typeof trackCategories]?.map((trackType) => (
                  <Button
                    key={trackType}
                    onClick={() => handleTrackTypeSelect(trackType)}
                    className={`h-16 flex flex-col items-center justify-center bg-black border-gray-700 hover:bg-gray-900 ${categoryColors[selectedCategory as keyof typeof categoryColors]}`}
                  >
                    <div className="text-sm font-bold">{trackType}</div>
                  </Button>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Drag Line Visual */}
      {(draggedKey || draggedBpm) && dragLinePosition && (
        <div 
          className="fixed pointer-events-none z-50"
          style={{
            left: dragLinePosition.x - 10,
            top: dragLinePosition.y - 10,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div className={`text-white px-2 py-1 rounded text-xs font-medium shadow-lg ${
            draggedKey ? 'bg-blue-500' : 'bg-orange-500'
          }`}>
            {draggedKey || `${draggedBpm} BPM`}
          </div>
          <div className={`w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent mx-auto ${
            draggedKey ? 'border-t-blue-500' : 'border-t-orange-500'
          }`}></div>
        </div>
      )}
      
      <Card 
        className="!bg-[#141414] border-gray-700"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <CardHeader>
          <div className="flex flex-col gap-4">
            {/* Title and Shuffle Row */}
            <div className="flex items-center gap-2">
              <CardTitle className="text-white">Tracks</CardTitle>
              <Button
                onClick={onShuffleAllAudio}
                size="sm"
                variant="outline"
                className="text-xs bg-black text-yellow-400 hover:text-yellow-300 hover:bg-gray-900 border-gray-600"
                title="Shuffle all audio samples"
              >
                <Brain className="w-4 h-4" />
              </Button>
            </div>

            {/* Category Buttons Row */}
            <div className="flex items-center gap-2 flex-wrap">
              {Object.entries(trackCategories).map(([category, options]) => (
                <Button
                  key={category}
                  onClick={() => handleCategoryClick(category)}
                  size="sm"
                  variant="outline"
                  className={`text-xs bg-black border-gray-700 hover:bg-gray-900 rounded-md px-3 py-1.5 font-medium ${categoryColors[category as keyof typeof categoryColors]}`}
                  title={`Add ${category} Track`}
                >
                  <span className="mr-1.5 text-sm">{categoryIcons[category as keyof typeof categoryIcons]}</span>
                  <span>Add {category}</span>
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tracks.map((track, index) => (
              <div
                key={track.id}
                draggable={!!onReorderTracks}
                onDragStart={(e) => handleDragStart(e, track)}
                onDragOver={(e) => {
                  handleDragOver(e, index)
                  handleAudioDragOver(e, track.id)
                }}
                onDragLeave={(e) => {
                  handleDragLeave()
                  handleAudioDragLeave(e)
                }}
                onDrop={(e) => {
                  handleDrop(e, index)
                  handleAudioDrop(e, track.id)
                  handleKeyDrop(e, track.id)
                }}
                onMouseEnter={() => handleTrackHover(track.id)}
                onMouseLeave={handleTrackLeave}
                onDragEnd={handleDragEnd}
                className={`p-3 rounded-lg border transition-all duration-200 ${
                  sequencerData[track.id]?.[currentStep] ? 'border-white bg-[#2a2a2a]' : 'border-gray-600 bg-[#1f1f1f]'
                } ${
                  draggedTrack?.id === track.id ? 'opacity-50 scale-95' : ''
                } ${
                  dragOverIndex === index ? 'ring-2 ring-blue-500 transform scale-[1.02]' : ''
                } ${
                  audioDragOverTrack === track.id ? 'ring-2 ring-green-500 bg-green-500/10' : ''
                } ${
                  keyDropTarget === track.id ? 'ring-2 ring-yellow-400 bg-yellow-500/10 border-yellow-400' : ''
                } ${
                  bpmDropTarget === track.id ? 'ring-2 ring-orange-400 bg-orange-500/10 border-orange-400' : ''
                } ${
                  onReorderTracks ? 'cursor-grab active:cursor-grabbing' : ''
                } ${
                  track.name === 'MIDI' && track.stockSound ? 'ring-2 ring-green-400 border-green-400' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {onReorderTracks && (
                      <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                    )}
                    <div className={`w-3 h-3 rounded-full ${track.color}`}></div>
                    <span className="text-white font-medium">{track.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {sequencerData[track.id]?.[currentStep] ? (
                      <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                    ) : track.mute ? (
                      <VolumeX className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-green-400" />
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {/* Audio Info Row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* MIDI: Show only stock sound name, no audio badge */}
                    {track.name === 'MIDI' && track.stockSound ? (
                      <Badge 
                        variant="secondary" 
                        className={`text-xs bg-green-600 cursor-pointer hover:bg-green-500 transition-colors ${
                          expandedNames[track.id] ? 'max-w-none' : 'max-w-[200px]'
                        }`}
                        onClick={() => toggleNameExpansion(track.id)}
                        title={expandedNames[track.id] ? 'Click to collapse' : 'Click to see full name'}
                      >
                        <Piano className="w-3 h-3 mr-1 flex-shrink-0" />
                        <span className={expandedNames[track.id] ? 'whitespace-normal break-words' : 'truncate'}>
                          {track.stockSound.name}
                        </span>
                      </Badge>
                    ) : (
                      // Audio tracks: show audio badge or No Audio
                      track.audioUrl ? (
                        <Badge 
                          variant="secondary" 
                          className={`text-xs bg-green-600 cursor-pointer hover:bg-green-500 transition-colors ${
                            expandedNames[track.id] ? 'max-w-none' : 'max-w-[200px]'
                          }`}
                          onClick={() => toggleNameExpansion(track.id)}
                          title={expandedNames[track.id] ? 'Click to collapse' : 'Click to see full name'}
                        >
                          <Music className="w-3 h-3 mr-1 flex-shrink-0" />
                          <span className={expandedNames[track.id] ? 'whitespace-normal break-words' : 'truncate'}>
                            {track.audioName || 'Audio Loaded'}
                          </span>
                        </Badge>
                      ) : (
                        track.name !== 'MIDI' && (
                          <Badge variant="outline" className="text-xs text-gray-400">No Audio</Badge>
                        )
                      )
                    )}
                    {/* Audio metadata badges (not for MIDI) */}
                    {track.name !== 'MIDI' && track.audioUrl && (
                      <div className="flex items-center gap-1">
                        {track.bpm && (
                          <Badge 
                            variant="outline" 
                            className={`text-xs cursor-pointer transition-colors ${
                              draggedBpm === track.bpm && draggedBpmTrackId === track.id
                                ? 'bg-blue-600 text-white shadow-lg scale-110'
                                : 'hover:bg-gray-600'
                            }`}
                            onClick={() => onSetTransportBpm?.(track.bpm!)}
                            onMouseDown={(e) => {
                              // Start drag operation for BPM transfer
                              e.preventDefault()
                              e.stopPropagation()
                              setDraggedBpm(track.bpm!)
                              setDraggedBpmTrackId(track.id)
                              setDragLinePosition({ x: e.clientX, y: e.clientY })
                            }}
                            title={`Click to set transport BPM to ${track.bpm}. Click and drag to copy BPM to another track.`}
                          >
                            {track.bpm} BPM
                          </Badge>
                        )}
                        {track.key && (
                          <Badge 
                            variant="outline" 
                            className={`text-xs cursor-pointer transition-colors ${
                              draggedKey === track.key && draggedKeyTrackId === track.id
                                ? 'bg-blue-600 text-white shadow-lg scale-110'
                                : 'hover:bg-gray-600'
                            }`}
                            onClick={() => onSetTransportKey?.(track.key!)}
                            onMouseDown={(e) => {
                              // Start drag operation for key transfer
                              e.preventDefault()
                              e.stopPropagation()
                              setDraggedKey(track.key!)
                              setDraggedKeyTrackId(track.id)
                              setDragLinePosition({ x: e.clientX, y: e.clientY })
                            }}
                            title={`Click to set transport key to ${track.key}. Click and drag to copy key to another track.`}
                          >
                            {track.key}
                          </Badge>
                        )}
                        {track.audio_type && (
                          <Badge variant="outline" className="text-xs">{track.audio_type}</Badge>
                        )}
                        {track.tags && track.tags.length > 0 && (
                          <div className="flex items-center gap-1">
                            {track.tags.slice(0, 1).map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">{tag}</Badge>
                            ))}
                            {track.tags.length > 1 && (
                              <Badge variant="secondary" className="text-xs">+{track.tags.length - 1}</Badge>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Controls Row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Only show Piano Roll button for MIDI */}
                    {onOpenPianoRoll && track.name === 'MIDI' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenPianoRoll(track.id)}
                        className="text-xs text-orange-400 hover:text-orange-300 hover:bg-orange-900/20"
                        title="Open Piano Roll"
                      >
                        <Piano className="w-3 h-3" />
                      </Button>
                    )}
                    {/* Select Sound button for MIDI */}
                    {track.name === 'MIDI' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowStockSoundSelector({trackId: track.id})}
                        className="text-xs"
                      >
                        {track.stockSound ? 'Change Sound' : 'Select Sound'}
                      </Button>
                    )}
                    {/* Audio controls for non-MIDI tracks only */}
                    {track.name !== 'MIDI' && (
                      <>
                        {/* Lock button - show for all tracks with audio */}
                        {track.audioUrl && onToggleTrackLock && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onToggleTrackLock(track.id)}
                            className={`text-xs transition-colors ${
                              track.locked 
                                ? 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20' 
                                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-900/20'
                            }`}
                            title={track.locked ? 'Unlock track (shuffle will change this track)' : 'Lock track (shuffle will skip this track)'}
                          >
                            {track.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                          </Button>
                        )}
                        {/* Mute button - show for all tracks */}
                        {onToggleTrackMute && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onToggleTrackMute(track.id)}
                            className={`text-xs transition-colors ${
                              track.mute 
                                ? 'text-red-400 hover:text-red-300 hover:bg-red-900/20' 
                                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-900/20'
                            }`}
                            title={track.mute ? 'Unmute track' : 'Mute track'}
                          >
                            {track.mute ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                          </Button>
                        )}
                        {/* Shuffle button - show for all track types that support shuffle */}
                        {onShuffleAudio && [
                          // Drums
                          'Kick', 'Snare', 'Hi-Hat', 'Clap', 'Crash', 'Ride', 'Tom', 'Cymbal', 'Percussion',
                          // Bass
                          'Bass', 'Sub', '808',
                          // Melodic
                          'Melody', 'Lead', 'Pad', 'Chord', 'Arp',
                          // Loops
                          'Melody Loop', 'Piano Loop', '808 Loop', 'Drum Loop', 'Bass Loop', 'Vocal Loop', 'Guitar Loop', 'Synth Loop',
                          // Effects & Technical
                          'FX', 'Vocal', 'Sample', 'MIDI', 'Patch', 'Preset'
                        ].includes(track.name) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onShuffleAudio(track.id)}
                            className="bg-black text-yellow-400 hover:text-yellow-300 hover:bg-gray-900 border-gray-600"
                            title={`AI ${track.name} samples`}
                          >
                            <Brain className="w-3 h-3" />
                          </Button>
                        )}
                        
                        {/* Duplicate with Shuffle button - show for tracks with audio */}
                        {track.audioUrl && onDuplicateWithShuffle && [
                          // Loops (primary target for this feature)
                          'Melody Loop', 'Piano Loop', '808 Loop', 'Drum Loop', 'Bass Loop', 'Vocal Loop', 'Guitar Loop', 'Synth Loop',
                          // Melodic
                          'Melody', 'Lead', 'Pad', 'Chord', 'Arp',
                          // Bass
                          'Bass', 'Sub', '808',
                          // Drums
                          'Kick', 'Snare', 'Hi-Hat', 'Clap', 'Crash', 'Ride', 'Tom', 'Cymbal', 'Percussion',
                          // Effects & Technical
                          'FX', 'Vocal', 'Sample', 'Patch', 'Preset'
                        ].includes(track.name) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDuplicateWithShuffle(track.id)}
                            className="text-green-400 hover:text-green-300 hover:bg-green-900/20"
                            title={`Duplicate ${track.name} with shuffle (same key, different audio)`}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        )}
                        {/* Tempo controls toggle - only show if audio is loaded */}
                        {track.audioUrl && onTrackTempoChange && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowTempoControls(prev => ({...prev, [track.id]: !prev[track.id]}))}
                            className="text-xs text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20"
                            title={showTempoControls[track.id] ? 'Hide tempo controls' : 'Show tempo controls'}
                          >
                            {showTempoControls[track.id] ? <ChevronUp className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          </Button>
                        )}
                        {/* Key controls toggle - only show if audio is loaded */}
                        {track.audioUrl && onTrackPitchChange && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowKeyControls(prev => ({...prev, [track.id]: !prev[track.id]}))}
                            className="text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                            title={showKeyControls[track.id] ? 'Hide key controls' : 'Show key controls'}
                          >
                            {showKeyControls[track.id] ? <ChevronUp className="w-3 h-3" /> : <Music2 className="w-3 h-3" />}
                          </Button>
                        )}
                        {/* Select Audio button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onTrackAudioSelect(track.id)}
                          className="text-xs"
                        >
                          {track.audioUrl ? 'Change' : 'Select Audio'}
                        </Button>

                      </>
                    )}
                    {/* Remove track button (all tracks) */}
                    {tracks.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveTrack(track.id)}
                        className="text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Audio preview if available */}
                {track.audioUrl && (
                  <div className="mt-2">
                    <audio
                      key={track.audioUrl} // Force re-render when audio URL changes
                      controls
                      className="w-full h-8"
                      preload="metadata"
                    >
                      <source src={track.audioUrl} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                )}

                {/* Tempo controls if audio is loaded and toggle is enabled */}
                {track.audioUrl && onTrackTempoChange && showTempoControls[track.id] && (
                  <div className="mt-3 p-3 bg-[#111111] rounded border border-gray-600 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm text-gray-300 font-medium">Tempo Controls</span>
                    </div>
                    
                    {/* Original BPM Setting */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">Original BPM</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingOriginalBpm(prev => ({...prev, [track.id]: !prev[track.id]}))}
                          className="w-5 h-5 p-0 text-gray-400 hover:text-white"
                          title="Edit original BPM"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                      </div>
                      {editingOriginalBpm[track.id] ? (
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            value={originalBpmInputValues[track.id] || (track.originalBpm || 120).toString()}
                            onChange={(e) => setOriginalBpmInputValues(prev => ({...prev, [track.id]: e.target.value}))}
                            onBlur={() => {
                              const newOriginalBpm = parseFloat(originalBpmInputValues[track.id] || '120')
                              if (newOriginalBpm >= 60 && newOriginalBpm <= 200) {
                                onTrackTempoChange(track.id, track.currentBpm || newOriginalBpm, newOriginalBpm)
                              }
                              setEditingOriginalBpm(prev => ({...prev, [track.id]: false}))
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const newOriginalBpm = parseFloat(originalBpmInputValues[track.id] || '120')
                                if (newOriginalBpm >= 60 && newOriginalBpm <= 200) {
                                  onTrackTempoChange(track.id, track.currentBpm || newOriginalBpm, newOriginalBpm)
                                }
                                setEditingOriginalBpm(prev => ({...prev, [track.id]: false}))
                              }
                            }}
                            min="60"
                            max="200"
                            className="flex-1 h-6 text-xs"
                            placeholder="120"
                          />
                          <Button
                            size="sm"
                            onClick={() => {
                              const newOriginalBpm = parseFloat(originalBpmInputValues[track.id] || '120')
                              if (newOriginalBpm >= 60 && newOriginalBpm <= 200) {
                                onTrackTempoChange(track.id, track.currentBpm || newOriginalBpm, newOriginalBpm)
                              }
                              setEditingOriginalBpm(prev => ({...prev, [track.id]: false}))
                            }}
                            className="h-6 px-2 text-xs"
                          >
                            Set
                          </Button>
                        </div>
                      ) : (
                        <div className="text-xs text-white font-mono bg-[#1a1a1a] px-2 py-1 rounded">
                          {Math.round(track.originalBpm || 120)} BPM
                        </div>
                      )}
                    </div>

                    {/* Current BPM Controls */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-400">Current BPM</span>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={bpmInputValues[track.id] || Math.round(track.currentBpm || track.originalBpm || 120).toString()}
                            onChange={(e) => setBpmInputValues(prev => ({...prev, [track.id]: e.target.value}))}
                            onBlur={() => {
                              const newBpm = parseFloat(bpmInputValues[track.id] || '120')
                              if (newBpm >= 60 && newBpm <= 200) {
                                onTrackTempoChange(track.id, newBpm, track.originalBpm || 120)
                              } else {
                                setBpmInputValues(prev => ({...prev, [track.id]: Math.round(track.currentBpm || track.originalBpm || 120).toString()}))
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const newBpm = parseFloat(bpmInputValues[track.id] || '120')
                                if (newBpm >= 60 && newBpm <= 200) {
                                  onTrackTempoChange(track.id, newBpm, track.originalBpm || 120)
                                }
                              }
                            }}
                            min="60"
                            max="200"
                            className="w-16 h-6 text-xs text-center"
                            placeholder="120"
                          />
                          {track.currentBpm !== track.originalBpm && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const originalBpm = track.originalBpm || 120
                                onTrackTempoChange(track.id, originalBpm, originalBpm)
                                setBpmInputValues(prev => ({...prev, [track.id]: originalBpm.toString()}))
                              }}
                              className="w-6 h-6 p-0 text-gray-400 hover:text-white"
                              title="Reset to original tempo"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {/* Slider for fine control */}
                      <Slider
                        value={[track.currentBpm || track.originalBpm || 120]}
                        onValueChange={(value) => {
                          onTrackTempoChange(track.id, value[0], track.originalBpm || 120)
                          setBpmInputValues(prev => ({...prev, [track.id]: value[0].toString()}))
                        }}
                        min={60}
                        max={200}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>60</span>
                        <span>130</span>
                        <span>200</span>
                      </div>
                    </div>

                    {/* Quick BPM Presets */}
                    <div className="mb-2">
                      <div className="text-xs text-gray-400 mb-1">Quick Sets:</div>
                      <div className="flex gap-1 flex-wrap">
                        {[80, 90, 100, 110, 120, 130, 140, 150, 160, 170].map(bpm => (
                          <Button
                            key={bpm}
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              onTrackTempoChange(track.id, bpm, track.originalBpm || 120)
                              setBpmInputValues(prev => ({...prev, [track.id]: bpm.toString()}))
                            }}
                            className="h-5 px-2 text-xs border-gray-600 hover:border-gray-400"
                          >
                            {bpm}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Playback Rate Display */}
                    <div className="text-xs text-gray-400 text-center">
                      Rate: {((track.currentBpm || track.originalBpm || 120) / (track.originalBpm || 120)).toFixed(2)}x
                    </div>
                  </div>
                )}

                {/* Key controls if audio is loaded and toggle is enabled */}
                {track.audioUrl && onTrackPitchChange && showKeyControls[track.id] && (
                  <div className="mt-3 p-3 bg-[#0a0a0a] rounded border border-blue-600 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Music2 className="w-4 h-4 text-blue-400" />
                      <span className="text-sm text-gray-300 font-medium">Key Controls</span>
                    </div>
                    
                    {/* Original Key Setting */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">Original Key</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingOriginalKey(prev => ({...prev, [track.id]: !prev[track.id]}))}
                          className="w-5 h-5 p-0 text-gray-400 hover:text-white"
                          title="Edit original key"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                      </div>
                      {editingOriginalKey[track.id] ? (
                        <div className="flex gap-1 flex-wrap">
                          {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map(key => (
                            <Button
                              key={key}
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newCurrentKey = calculateKeyFromPitchShift(key, track.pitchShift || 0)
                                onTrackPitchChange(track.id, track.pitchShift || 0, key, newCurrentKey)
                                setEditingOriginalKey(prev => ({...prev, [track.id]: false}))
                              }}
                              className="h-6 px-2 text-xs border-gray-600 hover:border-gray-400"
                            >
                              {key}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-white font-mono bg-[#1a1a1a] px-2 py-1 rounded">
                          {track.originalKey || 'C'}
                        </div>
                      )}
                    </div>

                    {/* Pitch Shift Controls */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-400">Pitch Shift</span>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <div className="text-xs text-white font-mono">
                              {calculateKeyFromPitchShift(track.originalKey || 'C', track.pitchShift || 0)}
                            </div>
                            <div className="text-xs text-gray-400">
                              {getIntervalName(track.pitchShift || 0)}
                            </div>
                          </div>
                          {track.pitchShift !== 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const resetKey = track.originalKey || 'C'
                                onTrackPitchChange(track.id, 0, track.originalKey, resetKey)
                              }}
                              className="w-6 h-6 p-0 text-gray-400 hover:text-white"
                              title="Reset pitch"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {/* Slider for pitch control */}
                      <Slider
                        value={[track.pitchShift || 0]}
                        onValueChange={(value) => {
                          const newCurrentKey = calculateKeyFromPitchShift(track.originalKey || 'C', value[0])
                          onTrackPitchChange(track.id, value[0], track.originalKey, newCurrentKey)
                        }}
                        min={-12}
                        max={12}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>-12</span>
                        <span>0</span>
                        <span>+12</span>
                      </div>
                    </div>

                    {/* Piano Roll Key Selection */}
                    <div className="mb-3">
                      <div className="text-xs text-gray-400 mb-2">Piano Roll - Click to Select Key:</div>
                      <PianoRoll
                        originalKey={track.originalKey || 'C'}
                        currentPitchShift={track.pitchShift || 0}
                        onKeySelect={(pitchShift) => {
                          const newCurrentKey = calculateKeyFromPitchShift(track.originalKey || 'C', pitchShift)
                          onTrackPitchChange(track.id, pitchShift, track.originalKey, newCurrentKey)
                        }}
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>🟡 Original Key</span>
                        <span>🔵 Current Key</span>
                      </div>
                      
                      {/* Octave Controls */}
                      <div className="flex gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newPitch = (track.pitchShift || 0) - 12
                            const newCurrentKey = calculateKeyFromPitchShift(track.originalKey || 'C', newPitch)
                            onTrackPitchChange(track.id, newPitch, track.originalKey, newCurrentKey)
                          }}
                          className="flex-1 h-6 text-xs border-gray-600 hover:border-gray-400"
                          disabled={(track.pitchShift || 0) <= -12}
                        >
                          -Oct
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const resetKey = track.originalKey || 'C'
                            onTrackPitchChange(track.id, 0, track.originalKey, resetKey)
                          }}
                          className="flex-1 h-6 text-xs border-gray-600 hover:border-gray-400"
                          disabled={(track.pitchShift || 0) === 0}
                        >
                          Reset
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newPitch = (track.pitchShift || 0) + 12
                            const newCurrentKey = calculateKeyFromPitchShift(track.originalKey || 'C', newPitch)
                            onTrackPitchChange(track.id, newPitch, track.originalKey, newCurrentKey)
                          }}
                          className="flex-1 h-6 text-xs border-gray-600 hover:border-gray-400"
                          disabled={(track.pitchShift || 0) >= 12}
                        >
                          +Oct
                        </Button>
                      </div>
                    </div>

                    {/* Current Key Display */}
                    <div className="text-xs text-gray-400 text-center">
                      <div className="mb-1">
                        Current Key: <span className="text-white font-mono">
                          {calculateKeyFromPitchShift(track.originalKey || 'C', track.pitchShift || 0)}
                        </span>
                      </div>
                      <div>
                        {track.originalKey || 'C'} → {calculateKeyFromPitchShift(track.originalKey || 'C', track.pitchShift || 0)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  )
}

