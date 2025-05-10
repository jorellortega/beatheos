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
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button size="icon" variant="secondary" onClick={() => {}}>
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button size="icon" onClick={onPlayPause}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">BPM:</span>
          <Input
            type="number"
            value={bpm}
            onChange={(e) => onBpmChange(Number(e.target.value))}
            className="w-16"
          />
        </div>
      </div>
    </div>
  )
}

