import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Music, Volume2, VolumeX, Plus, Trash2, GripVertical, RotateCcw, Clock, Edit, ChevronDown, ChevronUp, Music2, Shuffle, Piano } from 'lucide-react'
import { Track } from '@/hooks/useBeatMaker'
import { useState } from 'react'
import { StockSoundSelector } from './StockSoundSelector'

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
  onAddTrack: () => void
  onRemoveTrack: (trackId: number) => void
  onReorderTracks?: (newOrder: Track[]) => void
  onDirectAudioDrop?: (trackId: number, file: File) => void
  onTrackTempoChange?: (trackId: number, newBpm: number, originalBpm?: number) => void
  onTrackPitchChange?: (trackId: number, pitchShift: number, originalKey?: string, currentKey?: string) => void
  onShuffleAudio?: (trackId: number) => void
  onOpenPianoRoll?: (trackId: number) => void
}

export function TrackList({ tracks, onTrackAudioSelect, currentStep, sequencerData, onAddTrack, onRemoveTrack, onReorderTracks, onDirectAudioDrop, onTrackTempoChange, onTrackPitchChange, onShuffleAudio, onOpenPianoRoll, onTrackStockSoundSelect }: TrackListProps & { onTrackStockSoundSelect?: (trackId: number, sound: any) => void }) {
  const [draggedTrack, setDraggedTrack] = useState<Track | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [audioDragOverTrack, setAudioDragOverTrack] = useState<number | null>(null)
  const [bpmInputValues, setBpmInputValues] = useState<{[trackId: number]: string}>({})
  const [originalBpmInputValues, setOriginalBpmInputValues] = useState<{[trackId: number]: string}>({})
  const [editingOriginalBpm, setEditingOriginalBpm] = useState<{[trackId: number]: boolean}>({})
  const [showTempoControls, setShowTempoControls] = useState<{[trackId: number]: boolean}>({})
  const [showKeyControls, setShowKeyControls] = useState<{[trackId: number]: boolean}>({})
  const [editingOriginalKey, setEditingOriginalKey] = useState<{[trackId: number]: boolean}>({})

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
      <Card className="!bg-[#141414] border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Audio Samples</CardTitle>
            <Button
              onClick={onAddTrack}
              size="sm"
              variant="outline"
              className="text-xs"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Track
            </Button>
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
                }}
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

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* MIDI: Show only stock sound name, no audio badge */}
                    {track.name === 'MIDI' && track.stockSound ? (
                      <Badge variant="secondary" className="text-xs bg-green-600 max-w-[200px]">
                        <Piano className="w-3 h-3 mr-1 flex-shrink-0" />
                        <span className="truncate">{track.stockSound.name}</span>
                      </Badge>
                    ) : (
                      // Audio tracks: show audio badge or No Audio
                      track.audioUrl ? (
                        <Badge variant="secondary" className="text-xs bg-green-600 max-w-[200px]">
                          <Music className="w-3 h-3 mr-1 flex-shrink-0" />
                          <span className="truncate">{track.audioName || 'Audio Loaded'}</span>
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
                          <Badge variant="outline" className="text-xs">{track.bpm} BPM</Badge>
                        )}
                        {track.key && (
                          <Badge variant="outline" className="text-xs">{track.key}</Badge>
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
                  <div className="flex items-center gap-2">
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
                        {/* Shuffle button - only show for specific track types */}
                        {onShuffleAudio && ['Kick', 'Snare', 'Hi-Hat', 'Sample'].includes(track.name) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onShuffleAudio(track.id)}
                            className="text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-900/20"
                            title={`Shuffle ${track.name} samples`}
                          >
                            <Shuffle className="w-3 h-3" />
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

