import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"

interface Track {
  id: string
  name: string
  effects: {
    reverb: number
    delay: number
    distortion: number
  }
}

interface EffectsRackProps {
  tracks: Track[]
  onEffectChange: (trackId: string, effect: string, value: number) => void
}

export function EffectsRack({ tracks, onEffectChange }: EffectsRackProps) {
  return (
    <Card className="bg-secondary border-primary neon-border-green mb-4">
      <CardHeader>
        <CardTitle className="text-white">Effects Rack</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tracks.map((track) => (
            <div key={track.id} className="space-y-4">
              <h3 className="text-lg font-semibold text-white">{track.name}</h3>
              <div>
                <Label htmlFor={`reverb-${track.id}`} className="text-white">Reverb</Label>
                <Slider
                  id={`reverb-${track.id}`}
                  min={0}
                  max={1}
                  step={0.01}
                  value={[track.effects?.reverb ?? 0]}
                  onValueChange={([value]) => onEffectChange(track.id, 'reverb', value)}
                />
              </div>
              <div>
                <Label htmlFor={`delay-${track.id}`} className="text-white">Delay</Label>
                <Slider
                  id={`delay-${track.id}`}
                  min={0}
                  max={1}
                  step={0.01}
                  value={[track.effects?.delay ?? 0]}
                  onValueChange={([value]) => onEffectChange(track.id, 'delay', value)}
                />
              </div>
              <div>
                <Label htmlFor={`distortion-${track.id}`} className="text-white">Distortion</Label>
                <Slider
                  id={`distortion-${track.id}`}
                  min={0}
                  max={1}
                  step={0.01}
                  value={[track.effects?.distortion ?? 0]}
                  onValueChange={([value]) => onEffectChange(track.id, 'distortion', value)}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

