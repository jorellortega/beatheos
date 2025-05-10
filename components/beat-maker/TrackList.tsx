import { Button } from "@/components/ui/button"
import { Plus, Trash2, Volume2, VolumeX } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface Track {
  id: string
  name: string
  mute: boolean
  solo: boolean
}

interface TrackListProps {
  tracks: Track[]
  onAddTrack: () => void
  onRemoveTrack: (id: string) => void
  onToggleMute: (id: string) => void
  onToggleSolo: (id: string) => void
}

export function TrackList({ tracks, onAddTrack, onRemoveTrack, onToggleMute, onToggleSolo }: TrackListProps) {
  return (
    <div className="bg-secondary p-4 rounded-lg">
      <h2 className="text-lg font-semibold mb-4 text-white">Tracks</h2>
      <ul className="space-y-2">
        {tracks.map((track) => (
          <li key={track.id} className="flex items-center justify-between bg-gray-700 p-2 rounded">
            <span className="text-white truncate">{track.name}</span>
            <div className="flex space-x-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={() => onToggleMute(track.id)} variant="ghost" size="sm">
                      {track.mute ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{track.mute ? 'Unmute' : 'Mute'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={() => onToggleSolo(track.id)} variant="ghost" size="sm" className={track.solo ? "bg-primary" : ""}>
                      S
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{track.solo ? 'Unsolo' : 'Solo'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={() => onRemoveTrack(track.id)} variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Remove Track</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </li>
        ))}
      </ul>
      <Button onClick={onAddTrack} className="w-full mt-4">
        <Plus className="h-4 w-4 mr-2" />
        Add Track
      </Button>
    </div>
  )
}

