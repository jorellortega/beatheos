import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Music, Volume2, VolumeX, Plus, Trash2, GripVertical } from 'lucide-react'
import { Track } from '@/hooks/useBeatMaker'
import { useState } from 'react'

interface TrackListProps {
  tracks: Track[]
  onTrackAudioSelect: (trackId: number) => void
  currentStep: number
  sequencerData: { [trackId: number]: boolean[] }
  onAddTrack: () => void
  onRemoveTrack: (trackId: number) => void
  onReorderTracks?: (newOrder: Track[]) => void
  onDirectAudioDrop?: (trackId: number, file: File) => void
}

export function TrackList({ tracks, onTrackAudioSelect, currentStep, sequencerData, onAddTrack, onRemoveTrack, onReorderTracks, onDirectAudioDrop }: TrackListProps) {
  const [draggedTrack, setDraggedTrack] = useState<Track | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [audioDragOverTrack, setAudioDragOverTrack] = useState<number | null>(null)

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
                  {track.audioUrl ? (
                    <Badge variant="secondary" className="text-xs bg-green-600">
                      <Music className="w-3 h-3 mr-1" />
                      Audio Loaded
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-gray-400">
                      No Audio
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onTrackAudioSelect(track.id)}
                    className="text-xs"
                  >
                    {track.audioUrl ? 'Change' : 'Select Audio'}
                  </Button>
                  
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
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

