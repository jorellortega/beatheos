import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"

interface EffectsRackProps {
  onEffectChange: (effect: string, value: number) => void
}

export function EffectsRack({ onEffectChange }: EffectsRackProps) {
  return (
    <Card className="bg-secondary border-primary neon-border-green mb-4">
      <CardHeader>
        <CardTitle className="text-white">Effects Rack</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="reverb">Reverb</Label>
            <Slider
              id="reverb"
              min={0}
              max={1}
              step={0.01}
              defaultValue={[0]}
              onValueChange={([value]) => onEffectChange('reverb', value)}
            />
          </div>
          <div>
            <Label htmlFor="delay">Delay</Label>
            <Slider
              id="delay"
              min={0}
              max={1}
              step={0.01}
              defaultValue={[0]}
              onValueChange={([value]) => onEffectChange('delay', value)}
            />
          </div>
          <div>
            <Label htmlFor="distortion">Distortion</Label>
            <Slider
              id="distortion"
              min={0}
              max={1}
              step={0.01}
              defaultValue={[0]}
              onValueChange={([value]) => onEffectChange('distortion', value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

