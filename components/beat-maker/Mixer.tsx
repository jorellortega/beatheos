import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"

interface Track {
  id: string
  name: string
}

interface MixerProps {
  tracks: Track[]
  onVolumeChange: (trackId: string, volume: number) => void
}

export function Mixer({ tracks, onVolumeChange }: MixerProps) {
  return (
    <Card className="bg-secondary border-primary neon-border-green mb-4">
      <CardHeader>
        <CardTitle className="text-white">Mixer</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tracks.map((track) => (
            <div key={track.id}>
              <Label htmlFor={`volume-${track.id}`}>{track.name}</Label>
              <Slider
                id={`volume-${track.id}`}
                min={0}
                max={1}
                step={0.01}
                defaultValue={[0.75]}
                onValueChange={([value]) => onVolumeChange(track.id, value)}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

