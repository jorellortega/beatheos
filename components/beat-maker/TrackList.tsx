import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Music, Volume2, VolumeX } from 'lucide-react'
import { Track } from '@/hooks/useBeatMaker'

interface TrackListProps {
  tracks: Track[]
  onTrackAudioSelect: (trackId: number) => void
  currentStep: number
  sequencerData: { [trackId: number]: boolean[] }
}

export function TrackList({ tracks, onTrackAudioSelect, currentStep, sequencerData }: TrackListProps) {
  return (
    <Card className="!bg-[#141414] border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Tracks</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tracks.map((track) => (
            <div
              key={track.id}
              className={`p-3 rounded-lg border transition-colors ${
                sequencerData[track.id]?.[currentStep] ? 'border-blue-400 bg-blue-900/20' : 'border-gray-700 bg-gray-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${track.color}`}></div>
                  <span className="text-white font-medium">{track.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  {sequencerData[track.id]?.[currentStep] ? (
                    <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
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
                    <Badge variant="secondary" className="text-xs">
                      <Music className="w-3 h-3 mr-1" />
                      Loaded
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-gray-400">
                      No Audio
                    </Badge>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onTrackAudioSelect(track.id)}
                  className="text-xs"
                >
                  {track.audioUrl ? 'Change' : 'Select Audio'}
                </Button>
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

