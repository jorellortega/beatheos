import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Play, Pause, SkipBack } from 'lucide-react'

interface PlaybackControlsProps {
  bpm: number
  isPlaying: boolean
  onPlayPause: () => void
  onBpmChange: (bpm: number) => void
}

export function PlaybackControls({ bpm, isPlaying, onPlayPause, onBpmChange }: PlaybackControlsProps) {
  return (
    <div className="flex items-center justify-between bg-secondary p-4 rounded-lg">
      <div className="flex items-center space-x-2">
        <Button size="icon" variant="secondary" onClick={() => {}}>
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button size="icon" onClick={onPlayPause}>
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
      </div>
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-white">BPM:</span>
        <Input
          type="number"
          value={bpm}
          onChange={(e) => onBpmChange(Number(e.target.value))}
          className="w-16 bg-secondary text-white"
        />
      </div>
    </div>
  )
}

