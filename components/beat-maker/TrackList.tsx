import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Music, Volume2, VolumeX, Plus, Trash2, GripVertical, RotateCcw, Clock, Edit, ChevronDown, ChevronUp, Music2, Brain, Piano, Lock, Unlock, Copy, X, Save, FolderOpen, Upload } from 'lucide-react'
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
  
  // Create multiple octaves for a fuller piano
  const octaves = [3, 4, 5] // C3, C4, C5
  const allKeys: { key: string, octave: number, pitchShift: number }[] = []
  
  octaves.forEach(octave => {
    CHROMATIC_SCALE.forEach(key => {
      // Calculate the absolute pitch shift from original key to this key in this octave
      const keyIndex = CHROMATIC_SCALE.indexOf(key)
      let pitchShift = keyIndex - originalKeyIndex
      
      // Add octave difference
      const octaveDiff = octave - 4 // Assuming original key is in octave 4
      pitchShift += octaveDiff * 12
      
      allKeys.push({ key, octave, pitchShift })
    })
  })
  
  // Filter to show a reasonable range (2 octaves worth of keys)
  const displayKeys = allKeys.filter((_, index) => index >= 12 && index < 36) // Show middle 2 octaves
  
  const getPitchShiftForKey = (key: string, octave: number) => {
    const keyIndex = CHROMATIC_SCALE.indexOf(key)
    let pitchShift = keyIndex - originalKeyIndex
    
    // Add octave difference
    const octaveDiff = octave - 4 // Assuming original key is in octave 4
    pitchShift += octaveDiff * 12
    
    return pitchShift
  }

  const isWhiteKey = (key: string) => ['C', 'D', 'E', 'F', 'G', 'A', 'B'].includes(key)
  
  const getCurrentKey = (key: string, octave: number) => {
    const pitchShift = getPitchShiftForKey(key, octave)
    return Math.abs(pitchShift - currentPitchShift) < 0.1 // Allow for small floating point differences
  }

  return (
    <div className="relative w-full h-16 bg-gray-900 rounded border border-gray-600 overflow-hidden">
      {/* Piano keys container */}
      <div className="flex h-full relative">
      {/* White keys */}
      <div className="flex h-full">
          {displayKeys.filter(k => isWhiteKey(k.key)).map((keyData, index) => {
            const { key, octave, pitchShift } = keyData
            const isOriginal = key === originalKey && octave === 4
            const isCurrent = getCurrentKey(key, octave)
          
          return (
            <button
                key={`${key}${octave}`}
              onClick={() => onKeySelect(pitchShift)}
                className={`w-6 h-full border-r border-gray-300 relative transition-all duration-150 shadow-sm ${
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
                title={`${key}${octave} (${pitchShift > 0 ? '+' : ''}${pitchShift})`}
            >
              <span className={`absolute bottom-0.5 left-1/2 transform -translate-x-1/2 text-xs font-semibold ${
                isOriginal || isCurrent ? 'text-black' : 'text-gray-700'
              }`}>
                {key}
              </span>
                {octave !== 4 && (
                  <span className={`absolute top-0.5 left-1/2 transform -translate-x-1/2 text-xs ${
                    isOriginal || isCurrent ? 'text-black' : 'text-gray-500'
                  }`}>
                    {octave}
                  </span>
                )}
            </button>
          )
        })}
      </div>

      {/* Black keys */}
        <div className="absolute top-0 left-0 w-full h-10 flex">
          {displayKeys.filter(k => !isWhiteKey(k.key)).map((keyData, index) => {
            const { key, octave, pitchShift } = keyData
            const isOriginal = key === originalKey && octave === 4
            const isCurrent = getCurrentKey(key, octave)
            
            // Calculate position for black keys
            const whiteKeyIndex = displayKeys.filter(k => isWhiteKey(k.key)).findIndex(wk => {
              const whiteKeyPos = CHROMATIC_SCALE.indexOf(wk.key)
              const blackKeyPos = CHROMATIC_SCALE.indexOf(key)
              return whiteKeyPos < blackKeyPos && 
                     (displayKeys.filter(k => isWhiteKey(k.key)).findIndex(wk2 => 
                       CHROMATIC_SCALE.indexOf(wk2.key) > blackKeyPos
                     ) === -1 || 
                     displayKeys.filter(k => isWhiteKey(k.key)).findIndex(wk2 => 
                       CHROMATIC_SCALE.indexOf(wk2.key) > blackKeyPos
                     ) > displayKeys.filter(k => isWhiteKey(k.key)).findIndex(wk3 => 
                       CHROMATIC_SCALE.indexOf(wk3.key) > whiteKeyPos
                     ))
            })
            
            if (whiteKeyIndex === -1) return null
            
            const leftOffset = whiteKeyIndex * 24 + (key === 'C#' || key === 'F#' ? 18 : 12) // Adjust positioning
            
            return (
        <button
                key={`${key}${octave}`}
                onClick={() => onKeySelect(pitchShift)}
                className={`w-3 h-full rounded-b shadow-md transition-all duration-150 absolute ${
                  isOriginal 
              ? 'bg-yellow-600 hover:bg-yellow-500 border border-yellow-700' 
                    : isCurrent 
                ? 'bg-blue-600 hover:bg-blue-500 border border-blue-700' 
                : 'bg-gray-800 hover:bg-gray-700 border border-gray-900'
          }`}
          style={{
                  left: `${leftOffset}px`,
                  background: isOriginal 
              ? 'linear-gradient(180deg, #d97706 0%, #92400e 100%)' 
                    : isCurrent 
                ? 'linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%)' 
                : 'linear-gradient(180deg, #374151 0%, #1f2937 100%)'
          }}
                title={`${key}${octave} (${pitchShift > 0 ? '+' : ''}${pitchShift})`}
        >
          <span className="text-xs font-semibold text-white">♯</span>
        </button>
            )
          })}
        </div>
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
  onCreateCustomSampleTrack?: (file: File) => void
  onEditTrack?: (track: Track) => void
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

  onQuantizeLoop?: (track: any) => void
  onSwitchTrackType?: (trackId: number) => void
  onDuplicateTrackEmpty?: (trackId: number) => void
  onTrackGenreChange?: (trackId: number, genre: string, subgenre: string) => void
  onSaveTrackPattern?: (track: Track) => void
  onLoadTrackPattern?: (trackId: number) => void
  onClearTrackPattern?: (trackId: number) => void
  onShuffleTrackPattern?: (trackId: number) => void
  transportKey?: string
  melodyLoopMode?: 'transport-dominates' | 'melody-dominates'
  preferMp3?: boolean // Add format preference
  fileLinks?: any[] // Add file links for format detection
  genres?: any[] // Available genres for track selection
  genreSubgenres?: {[key: string]: string[]} // Genre to subgenre mapping
  onTrackAudioUrlChange?: (trackId: number, newAudioUrl: string) => void, // Add callback for URL changes
  mixerSettings?: {[trackId: number]: {
    volume: number
    pan: number
    mute: boolean
    eq: { low: number, mid: number, high: number }
    effects: { reverb: number, delay: number }
  }}, // Mixer settings for volume sync
  onVolumeChange?: (trackId: number, volume: number) => void // Callback for volume changes
}

export function TrackList({ tracks, onTrackAudioSelect, currentStep, sequencerData, onAddTrack, onRemoveTrack, onReorderTracks, onDirectAudioDrop, onCreateCustomSampleTrack, onEditTrack, onTrackTempoChange, onTrackPitchChange, onShuffleAudio, onShuffleAllAudio, onDuplicateWithShuffle, onCopyTrackKey, onCopyTrackBpm, onOpenPianoRoll, onTrackStockSoundSelect, onSetTransportBpm, onSetTransportKey, onToggleTrackLock, onToggleTrackMute, onQuantizeLoop, onSwitchTrackType, onDuplicateTrackEmpty, onTrackGenreChange, onSaveTrackPattern, onLoadTrackPattern, onClearTrackPattern, onShuffleTrackPattern, transportKey, melodyLoopMode, preferMp3 = false, fileLinks = [], genres = [], genreSubgenres = {}, onTrackAudioUrlChange, mixerSettings = {}, onVolumeChange }: TrackListProps & { onTrackStockSoundSelect?: (trackId: number, sound: any) => void }) {
  const [draggedTrack, setDraggedTrack] = useState<Track | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [showGenreSelector, setShowGenreSelector] = useState(false)
  const [selectedTrackForGenre, setSelectedTrackForGenre] = useState<Track | null>(null)
  const [selectedGenreForTrack, setSelectedGenreForTrack] = useState<string>('')
  const [selectedSubgenreForTrack, setSelectedSubgenreForTrack] = useState<string>('')
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

  // Function to get track display name with icons
  const getTrackDisplayName = (trackName: string) => {
    if (trackName.includes(' Loop')) {
      const baseName = trackName.replace(' Loop', '')
      const loopIcon = '🔄'
      
      // Add specific icons for different loop types
      if (baseName === 'Melody') return `${loopIcon} Melody`
      if (baseName === 'Drum') return `${loopIcon} Drum`
      if (baseName === 'Hihat') return `${loopIcon} Hihat`
      if (baseName === 'Percussion') return `${loopIcon} Perc`
      if (baseName === '808') return `${loopIcon} 808`
      if (baseName === 'Bass') return `${loopIcon} Bass`
      if (baseName === 'Piano') return `${loopIcon} Piano`
      if (baseName === 'Guitar') return `${loopIcon} Guitar`
      if (baseName === 'Synth') return `${loopIcon} Synth`
      if (baseName === 'Vocal') return `${loopIcon} Vocal`
      
      // Default for other loop types
      return `${loopIcon} ${baseName}`
    }
    
    // For non-loop tracks, return the original name
    return trackName
  }

  // Function to get track display name for modal buttons (same logic as above)
  const getModalTrackDisplayName = (trackName: string) => {
    if (trackName.includes(' Loop')) {
      const baseName = trackName.replace(' Loop', '')
      const loopIcon = '🔄'
      
      // Add specific icons for different loop types
      if (baseName === 'Melody') return `${loopIcon} Melody`
      if (baseName === 'Drum') return `${loopIcon} Drum`
      if (baseName === 'Hihat') return `${loopIcon} Hihat`
      if (baseName === 'Percussion') return `${loopIcon} Perc`
      if (baseName === '808') return `${loopIcon} 808`
      if (baseName === 'Bass') return `${loopIcon} Bass`
      if (baseName === 'Piano') return `${loopIcon} Piano`
      if (baseName === 'Guitar') return `${loopIcon} Guitar`
      if (baseName === 'Synth') return `${loopIcon} Synth`
      if (baseName === 'Vocal') return `${loopIcon} Vocal`
      
      // Default for other loop types
      return `${loopIcon} ${baseName}`
    }
    
    // For non-loop tracks, return the original name
    return trackName
  }

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
    'Technical': ['MIDI', 'Patch', 'Preset'],
    'Custom': ['Custom Sample']
  }

  const categoryIcons = {
    'Drums': '🥁',
    'Bass': '🎸',
    'Loops': '🔄',
    'Effects': '🎛️',
    'Technical': '⚙️',
    'Custom': '🎵'
  }

  const categoryColors = {
    'Drums': 'text-green-400',
    'Bass': 'text-orange-400',
    'Loops': 'text-purple-400',
    'Effects': 'text-cyan-400',
    'Technical': 'text-blue-400',
    'Custom': 'text-pink-400'
  }

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category)
    setShowCategoryModal(true)
  }

  const handleTrackTypeSelect = (trackType: string) => {
    if (trackType === 'Custom Sample') {
      // For Custom Sample, we need to trigger a file input
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'audio/*'
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (file && onCreateCustomSampleTrack) {
          onCreateCustomSampleTrack(file)
        }
      }
      input.click()
    } else {
      // Call the existing addTrackByType function from the parent component
      onAddTrack(trackType)
    }
    setShowCategoryModal(false)
  }

  // Helper function to determine the current format for a track
  const getTrackFormat = (track: Track) => {
    if (!track.audioUrl) return null // No audio loaded
    
    // If WAV is preferred (FORMAT OFF), always show WAV without any detection
    if (!preferMp3) {
      console.log(`🎵 Track ${track.name}: Format detection skipped (FORMAT OFF)`)
      return 'WAV'
    }
    
    // Only do MP3 detection if preferMp3 is true (FORMAT ON)
    // Use audioFileId if available, otherwise fallback to track.id
    const audioFileId = track.audioFileId || track.id.toString()
    
    // Check both directions: original to converted and converted to original
    const mp3Link = fileLinks.find(link => {
      // Check if this track's audio file is the original and has an MP3 conversion
      if (link.original_file_id === audioFileId && link.converted_format === 'mp3') {
        return true
      }
      // Check if this track's audio file is the converted MP3 of another file
      if (link.converted_file_id === audioFileId && link.converted_format === 'mp3') {
        return true
      }
      return false
    })
    
    console.log(`🔍 Format detection for track ${track.name}:`, {
      audioFileId,
      preferMp3,
      fileLinksCount: fileLinks.length,
      mp3Link: mp3Link ? 'Found' : 'Not found',
      availableFileIds: fileLinks.map(l => l.original_file_id).slice(0, 5),
      availableConvertedIds: fileLinks.map(l => l.converted_file_id).slice(0, 5),
      trackAudioFileId: track.audioFileId,
      trackId: track.id,
      allFileLinks: fileLinks.map(l => ({
        original: l.original_file_id,
        converted: l.converted_file_id,
        originalFormat: l.original_format,
        convertedFormat: l.converted_format
      }))
    })
    
    if (mp3Link) {
      console.log(`✅ Found MP3 link for track ${track.name}:`, mp3Link)
      return 'MP3'
    }
    
    console.log(`❌ No MP3 link found for track ${track.name}, falling back to WAV`)
    // Fallback to WAV if no MP3 link exists
    return 'WAV'
  }

  // Helper function to get the appropriate audio URL based on format preference
  const getTrackAudioUrl = (track: Track) => {
    if (!track.audioUrl) return null
    
    // If WAV is preferred (FORMAT OFF), return the original URL immediately
    if (!preferMp3) {
      console.log(`🎵 Track ${track.name}: Using WAV (FORMAT OFF - no MP3 detection)`)
      return track.audioUrl
    }
    
    // Only do MP3 detection if preferMp3 is true (FORMAT ON)
    const audioFileId = track.audioFileId || track.id.toString()
    
    console.log(`🔍 Looking for MP3 link for track ${track.name} (audioFileId: ${audioFileId})`)
    console.log(`📊 Available file links:`, fileLinks.map(l => ({
      original: l.original_file_id,
      converted: l.converted_file_id,
      format: l.converted_format,
      hasMp3Url: !!l.mp3_file_url
    })))
    
    // Check both directions: original to converted and converted to original
    const mp3Link = fileLinks.find(link => {
      // Check if this track's audio file is the original and has an MP3 conversion
      if (link.original_file_id === audioFileId && link.converted_format === 'mp3') {
        console.log(`✅ Found MP3 link (original -> converted):`, link)
        return true
      }
      // Check if this track's audio file is the converted MP3 of another file
      if (link.converted_file_id === audioFileId && link.converted_format === 'mp3') {
        console.log(`✅ Found MP3 link (converted -> original):`, link)
        return true
      }
      return false
    })
    
    if (mp3Link) {
      // Find the MP3 file URL from the fileLinks data
      // The MP3 file URL should be available in the link data
      if (mp3Link.mp3_file_url) {
        console.log(`🔗 Switching to MP3 for track ${track.name}: ${mp3Link.mp3_file_url}`)
        return mp3Link.mp3_file_url
      }
      
      console.log(`❌ Found MP3 link for track ${track.name} but no URL available:`, mp3Link)
      return track.audioUrl
    }
    
    console.log(`❌ No MP3 link found for track ${track.name}, using original URL`)
    // Fallback to original URL if no MP3 link exists
    return track.audioUrl
  }

  // Function to switch track audio URL based on format preference
  const switchTrackAudioUrl = (track: Track) => {
    if (!track.audioUrl || !track.audioFileId) return track.audioUrl
    
    // If WAV is preferred, return the original URL
    if (!preferMp3) {
      return track.audioUrl
    }
    
    // If MP3 is preferred, check if there's a linked MP3 file
    const audioFileId = track.audioFileId
    
    // Check both directions: original to converted and converted to original
    const mp3Link = fileLinks.find(link => {
      // Check if this track's audio file is the original and has an MP3 conversion
      if (link.original_file_id === audioFileId && link.converted_format === 'mp3') {
        return true
      }
      // Check if this track's audio file is the converted MP3 of another file
      if (link.converted_file_id === audioFileId && link.converted_format === 'mp3') {
        return true
      }
      return false
    })
    
    if (mp3Link) {
      // TODO: We need to get the actual MP3 file URL from the database
      // For now, return the original URL but log that we would switch
      console.log(`🔗 Would switch to MP3 for track ${track.name}, but URL not implemented yet`)
      return track.audioUrl
    }
    
    // Fallback to original URL if no MP3 link exists
    return track.audioUrl
  }



  // Open genre selector for a specific track
  const openGenreSelector = (track: Track) => {
    setSelectedTrackForGenre(track)
    setSelectedGenreForTrack(track.genre || '')
    setSelectedSubgenreForTrack(track.subgenre || '')
    setShowGenreSelector(true)
  }

  // Handle genre change for track
  const handleGenreChangeForTrack = (genre: string) => {
    setSelectedGenreForTrack(genre)
    setSelectedSubgenreForTrack('') // Reset subgenre when genre changes
  }

  // Apply genre change to track
  const applyGenreChange = () => {
    if (selectedTrackForGenre && onTrackGenreChange) {
      onTrackGenreChange(selectedTrackForGenre.id, selectedGenreForTrack, selectedSubgenreForTrack)
    }
    setShowGenreSelector(false)
    setSelectedTrackForGenre(null)
  }

  // Effect to update track audio URLs when format preference changes
  useEffect(() => {
    if (onTrackAudioUrlChange && fileLinks.length > 0) {
      console.log(`🔄 Format preference changed to: ${preferMp3 ? 'MP3' : 'WAV'}`)
      
      // If FORMAT OFF, don't do any URL updates - just log and return
      if (!preferMp3) {
        console.log(`🎵 FORMAT OFF: Skipping URL updates (no MP3 detection)`)
        return
      }
      
      console.log(`📊 Available file links:`, fileLinks.length)
      
      let updatedTracks = 0
      tracks.forEach(track => {
        if (track.audioUrl && track.audioFileId) {
          const newAudioUrl = getTrackAudioUrl(track)
          
          if (newAudioUrl && newAudioUrl !== track.audioUrl) {
            console.log(`🔄 Updating track ${track.name} audio URL`)
            onTrackAudioUrlChange(track.id, newAudioUrl)
            updatedTracks++
          }
        }
      })
      
      if (updatedTracks === 0) {
        console.log(`🔄 No tracks needed URL updates`)
      } else {
        console.log(`🔄 Updated ${updatedTracks} track URLs`)
      }
    }
  }, [preferMp3, fileLinks, onTrackAudioUrlChange])

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
                    <div className="text-sm font-bold">{getModalTrackDisplayName(trackType)}</div>
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

            {/* Custom Sample Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
                e.currentTarget.classList.add('border-pink-500', 'bg-pink-500/10')
              }}
              onDragLeave={(e) => {
                e.preventDefault()
                e.stopPropagation()
                e.currentTarget.classList.remove('border-pink-500', 'bg-pink-500/10')
              }}
              onDrop={(e) => {
                e.preventDefault()
                e.stopPropagation()
                e.currentTarget.classList.remove('border-pink-500', 'bg-pink-500/10')
                
                const files = e.dataTransfer.files
                if (files.length > 0 && onCreateCustomSampleTrack) {
                  const file = files[0]
                  if (file.type.startsWith('audio/')) {
                    onCreateCustomSampleTrack(file)
                  } else {
                    alert('Please drop an audio file to create a custom sample track')
                  }
                }
              }}
              className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center transition-all duration-200 hover:border-gray-500 hover:bg-gray-800/20"
            >
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-6 h-6 text-gray-400" />
                <div className="text-sm text-gray-400">
                  <span className="font-medium">Drop audio file here</span>
                  <br />
                  <span className="text-xs">to create a Custom Sample track</span>
                </div>
              </div>
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
                className={`p-3 rounded-lg border transition-all duration-200 relative ${
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
                } ${
                  // Highlight Melody Loop track when in M-T mode (Melody Loop dominates)
                  melodyLoopMode === 'melody-dominates' && track.name === 'Melody Loop' 
                    ? 'ring-2 ring-purple-400 border-purple-400 bg-purple-500/10 shadow-lg shadow-purple-500/20' 
                    : ''
                } ${
                  // Highlight muted tracks with red tint
                  track.mute ? 'ring-2 ring-red-400 border-red-400 bg-red-500/10 shadow-lg shadow-red-500/20' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {onReorderTracks && (
                      <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                    )}
                    <div className={`w-3 h-3 rounded-full ${track.color}`}></div>
                    <span className="text-white font-medium">{getTrackDisplayName(track.name)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {sequencerData[track.id]?.[currentStep] ? (
                      <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                    ) : track.mute ? (
                      <div className="w-4 h-4 text-red-400 font-bold text-xs flex items-center justify-center">M</div>
                    ) : (
                      <div className="w-4 h-4 text-green-400 font-bold text-xs flex items-center justify-center">M</div>
                    )}
                  </div>
                </div>

                {/* Volume Fader - DAW-style synchronized with mixer */}
                {onVolumeChange && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex flex-col items-center">
                    <div className="text-gray-400 text-xs mb-1">
                      {Math.round((mixerSettings[track.id]?.volume || 0.7) * 100)}
                    </div>
                    <div className="relative w-4 h-16 bg-gray-700 rounded-full flex items-end">
                      <Slider
                        value={[mixerSettings[track.id]?.volume || 0.7]}
                        onValueChange={(value) => onVolumeChange(track.id, value[0])}
                        min={0}
                        max={1}
                        step={0.01}
                        orientation="vertical"
                        className="h-16"
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {/* Audio Info Row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* M-T Mode Indicator for Melody Loop */}
                    {melodyLoopMode === 'melody-dominates' && track.name === 'Melody Loop' && (
                      <Badge 
                        variant="secondary" 
                        className="text-xs bg-purple-600 text-white border-purple-400 animate-pulse"
                        title="Melody Loop is controlling Transport tempo and key"
                      >
                        🎵 M-T Mode
                      </Badge>
                    )}
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
                        <>
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
                          {/* Format Indicator - Only show when FORMAT ON */}
                          {preferMp3 && getTrackFormat(track) && (
                            <Badge 
                              variant="outline" 
                              className={`text-xs font-bold ${
                                getTrackFormat(track) === 'MP3' 
                                  ? 'text-green-300 bg-green-900/40 border-green-500/60' 
                                  : 'text-blue-300 bg-blue-900/40 border-blue-500/60'
                              }`}
                              title={`Currently playing: ${getTrackFormat(track)} format (${getTrackAudioUrl(track) === track.audioUrl ? 'Original' : 'Switched'})`}
                            >
                              {getTrackFormat(track)}
                              {getTrackAudioUrl(track) !== track.audioUrl && (
                                <span className="ml-1 text-xs">🔄</span>
                              )}
                            </Badge>
                          )}
                        </>
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
                          <div className="relative">
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
                              title={`Click to set transport key to ${track.key}. Click and drag to copy key to another track.${track.isRelativeKey ? ' (Relative key)' : ''}`}
                            >
                              {track.key}
                            </Badge>
                            {track.isRelativeKey && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 text-black text-[8px] font-bold rounded-full flex items-center justify-center border border-gray-800">
                                R
                              </div>
                            )}
                          </div>
                        )}
                        {track.audio_type && (
                          <Badge variant="outline" className="text-xs">{getTrackDisplayName(track.audio_type)}</Badge>
                        )}
                        {/* DISABLED: Effective BPM display to prevent halftime-like behavior
                        {track.currentBpm && track.currentBpm !== (track.originalBpm || track.bpm) && (
                          <Badge 
                            variant="outline" 
                            className="text-xs bg-purple-600 text-white border-purple-400"
                            title={`Effective BPM: ${track.currentBpm} (original: ${track.originalBpm || track.bpm})`}
                          >
                            {track.currentBpm} BPM
                          </Badge>
                        )}
                        */}
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
                    {/* Debug button for format detection */}

                    
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
                            variant={track.mute ? "destructive" : "outline"}
                            size="sm"
                            onClick={() => onToggleTrackMute(track.id)}
                            className={`w-8 h-8 text-sm font-bold transition-all duration-200 ${
                              track.mute 
                                ? 'bg-red-600 hover:bg-red-700 text-white border-red-500 shadow-lg' 
                                : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-600 hover:text-white hover:border-gray-500'
                            }`}
                            title={track.mute ? 'Unmute track' : 'Mute track'}
                          >
                            M
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
                          'Melody Loop', 'Piano Loop', '808 Loop', 'Drum Loop', 'Hihat Loop', 'Bass Loop', 'Vocal Loop', 'Guitar Loop', 'Synth Loop',
                          // Effects & Technical
                          'FX', 'Vocal', 'Sample', 'MIDI', 'Patch', 'Preset'
                        ].some(trackType => track.name.includes(trackType)) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onShuffleAudio(track.id)}
                            className="bg-black text-yellow-400 hover:text-yellow-300 hover:bg-gray-900 border-gray-600"
                            title={`AI ${getTrackDisplayName(track.name)} samples`}
                          >
                            <Brain className="w-3 h-3" />
                          </Button>
                        )}
                        
                        {/* Switch track type button - show for Snare/Clap and Hi-Hat/Cymbal tracks */}
                        {onSwitchTrackType && (track.name === 'Snare' || track.name === 'Clap') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onSwitchTrackType(track.id)}
                            className="text-purple-400 hover:text-purple-300 hover:bg-purple-900/20"
                            title={`Switch to ${track.name === 'Snare' ? 'Clap' : 'Snare'}`}
                          >
                            S/C
                          </Button>
                        )}
                        {onSwitchTrackType && (track.name === 'Hi-Hat' || track.name === 'Cymbal') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onSwitchTrackType(track.id)}
                            className="text-purple-400 hover:text-purple-300 hover:bg-purple-900/20"
                            title={`Switch to ${track.name === 'Hi-Hat' ? 'Cymbal' : 'Hi-Hat'}`}
                          >
                            H/C
                          </Button>
                        )}
                        
                        {/* Duplicate with Shuffle button - show for tracks with audio */}
                        {track.audioUrl && onDuplicateWithShuffle && [
                          // Loops (primary target for this feature)
                          'Melody Loop', 'Piano Loop', '808 Loop', 'Drum Loop', 'Hihat Loop', 'Bass Loop', 'Vocal Loop', 'Guitar Loop', 'Synth Loop',
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
                            title={`Duplicate ${getTrackDisplayName(track.name)} with shuffle (same key, different audio)`}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        )}
                        
                        {/* Duplicate Empty button - show for all tracks */}
                        {onDuplicateTrackEmpty && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDuplicateTrackEmpty(track.id)}
                            className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                            title={`Duplicate ${getTrackDisplayName(track.name)} as empty track`}
                          >
                            D
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
                        

                        
                        {/* Genre Selector button - show for tracks that can shuffle */}
                        {onShuffleAudio && [
                          // Loops
                          'Melody Loop', 'Piano Loop', '808 Loop', 'Drum Loop', 'Hihat Loop', 'Bass Loop', 'Vocal Loop', 'Guitar Loop', 'Synth Loop',
                          // Melodic
                          'Melody', 'Lead', 'Pad', 'Chord', 'Arp',
                          // Bass
                          'Bass', 'Sub', '808',
                          // Drums
                          'Kick', 'Snare', 'Hi-Hat', 'Clap', 'Crash', 'Ride', 'Tom', 'Cymbal', 'Percussion',
                          // Effects & Technical
                          'FX', 'Vocal', 'Sample', 'Patch', 'Preset'
                        ].some(trackType => track.name.includes(trackType)) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openGenreSelector(track)}
                            className="text-purple-400 hover:text-purple-300 hover:bg-purple-900/20"
                            title={`Change genre for ${getTrackDisplayName(track.name)} (current: ${track.genre || 'Global'} / ${track.subgenre || 'Global'})`}
                          >
                            {track.genre ? `${track.genre}${track.subgenre ? '/' + track.subgenre : ''}` : 'Genre'}
                          </Button>
                        )}
                        
                        {/* Edit button for Custom Sample tracks */}
                        {track.name.startsWith('Custom Sample') && onEditTrack && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditTrack(track)}
                            className="text-xs text-pink-400 hover:text-pink-300 hover:bg-pink-900/20"
                            title="Edit track metadata (BPM, key, audio type, tags)"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                        )}

                        {/* Save Pattern button - for tracks with sequencer data */}
                        {sequencerData[track.id] && onSaveTrackPattern && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onSaveTrackPattern(track)}
                            className="text-xs text-green-400 hover:text-green-300 hover:bg-green-900/20"
                            title="Save track pattern"
                          >
                            <Save className="w-3 h-3" />
                          </Button>
                        )}

                        {/* Load Pattern button - for all tracks */}
                        {onLoadTrackPattern && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onLoadTrackPattern(track.id)}
                            className="text-xs text-orange-400 hover:text-orange-300 hover:bg-orange-900/20"
                            title="Load track pattern"
                          >
                            <FolderOpen className="w-3 h-3" />
                          </Button>
                        )}

                        {/* Clear Pattern button - for tracks with sequencer data */}
                        {sequencerData[track.id] && onClearTrackPattern && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onClearTrackPattern(track.id)}
                            className="text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20"
                            title="Clear track pattern"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </Button>
                        )}

                        {/* Shuffle Pattern button - for tracks with sequencer data */}
                        {sequencerData[track.id] && onShuffleTrackPattern && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onShuffleTrackPattern(track.id)}
                            className="text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-900/20"
                            title="Shuffle track pattern"
                          >
                            <Brain className="w-3 h-3" />
                          </Button>
                        )}

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
                    {/* Debug info - Only show format when FORMAT ON */}
                    <div className="text-xs text-gray-400 mt-1">
                      {preferMp3 && `Format: ${getTrackFormat(track)} | `}
                      ID: {track.audioFileId}
                    </div>
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
                    <div className="text-xs text-gray-400 text-center mb-2">
                      Rate: {((track.currentBpm || track.originalBpm || 120) / (track.originalBpm || 120)).toFixed(2)}x
                    </div>

                    {/* Quantize Button for Tempo Sync Issues */}
                    {track.currentBpm !== track.originalBpm && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          console.log(`[QUANTIZE] Opening quantization modal for ${track.name}`)
                          onQuantizeLoop?.(track)
                        }}
                        className="w-full h-6 text-xs border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-black"
                        title="Align loop to grid for better tempo sync"
                      >
                        🔧 Edit Loop
                      </Button>
                    )}
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
      
      {/* Genre Selector Dialog */}
      {showGenreSelector && selectedTrackForGenre && (
        <Dialog open={showGenreSelector} onOpenChange={setShowGenreSelector}>
          <DialogContent className="bg-[#141414] border-gray-700 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">
                Change Genre for {getTrackDisplayName(selectedTrackForGenre.name)}
              </DialogTitle>
            </DialogHeader>
            <div className="p-6 space-y-4">
              {/* Genre Selection */}
              <div>
                <label className="text-sm text-gray-300 mb-2 block">Genre:</label>
                <select
                  value={selectedGenreForTrack}
                  onChange={(e) => handleGenreChangeForTrack(e.target.value)}
                  className="w-full bg-black border border-gray-600 rounded px-3 py-2 text-white"
                >
                  <option value="">Use Global Genre</option>
                  {genres.map((genre) => (
                    <option key={genre.id} value={genre.name}>
                      {genre.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Subgenre Selection */}
              <div>
                <label className="text-sm text-gray-300 mb-2 block">Subgenre:</label>
                <select
                  value={selectedSubgenreForTrack}
                  onChange={(e) => setSelectedSubgenreForTrack(e.target.value)}
                  className="w-full bg-black border border-gray-600 rounded px-3 py-2 text-white"
                  disabled={!selectedGenreForTrack}
                >
                  <option value="">Use Global Subgenre</option>
                  {selectedGenreForTrack && genreSubgenres[selectedGenreForTrack]?.map((subgenre) => (
                    <option key={subgenre} value={subgenre}>
                      {subgenre}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Current Settings Display */}
              <div className="text-xs text-gray-400 p-3 bg-gray-800 rounded">
                <div>Current: {selectedTrackForGenre.genre || 'Global'} / {selectedTrackForGenre.subgenre || 'Global'}</div>
                <div>New: {selectedGenreForTrack || 'Global'} / {selectedSubgenreForTrack || 'Global'}</div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowGenreSelector(false)}
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Cancel
                </Button>
                <Button
                  onClick={applyGenreChange}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Apply
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

