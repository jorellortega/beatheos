import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"

interface Track {
  id: string
  name: string
  volume: number
}

interface MixerPanelProps {
  tracks: Track[]
  onVolumeChange: (trackId: string, volume: number) => void
}

export function MixerPanel({ tracks, onVolumeChange }: MixerPanelProps) {
  return (
    <div className="bg-secondary p-4 rounded-lg mt-8">
      <h2 className="text-lg font-semibold mb-4 text-white">Mixer</h2>
      <div className="grid grid-cols-8 gap-4">
        {tracks.map((track) => (
          <div key={track.id} className="flex flex-col items-center">
            <Slider
              orientation="vertical"
              min={0}
              max={100}
              step={1}
              value={[track.volume]}
              onValueChange={(value) => onVolumeChange(track.id, value[0])}
              className="h-32"
            />
            <Label className="mt-2 text-white">{track.name}</Label>
          </div>
        ))}
      </div>
    </div>
  )
}

