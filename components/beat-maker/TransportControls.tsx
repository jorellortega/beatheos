import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Play, Pause, Square, Mic } from 'lucide-react'

interface TransportControlsProps {
  bpm: number
  isPlaying: boolean
  isRecording: boolean
  onPlayPause: () => void
  onRecord: () => void
  onBpmChange: (bpm: number) => void
}

export function TransportControls({
  bpm,
  isPlaying,
  isRecording,
  onPlayPause,
  onRecord,
  onBpmChange
}: TransportControlsProps) {
  return (
    <div className="flex items-center justify-between bg-secondary p-4 rounded-lg mt-8">
      <div className="flex items-center space-x-2">
        <Button onClick={onPlayPause} variant="outline">
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button onClick={onRecord} variant="outline" className={isRecording ? "bg-red-500" : ""}>
          <Mic className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center space-x-2">
        <span className="text-white">BPM:</span>
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

