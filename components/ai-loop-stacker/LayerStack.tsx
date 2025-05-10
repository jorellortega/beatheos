import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { X, Volume2 } from 'lucide-react'

interface Layer {
  name: string
  volume: number
}

interface LayerStackProps {
  layers: Layer[]
  onRemove: (index: number) => void
  onVolumeChange: (index: number, volume: number) => void
}

export function LayerStack({ layers, onRemove, onVolumeChange }: LayerStackProps) {
  return (
    <div className="space-y-4 mt-4">
      {layers.map((layer, index) => (
        <Card key={index} className="bg-secondary">
          <CardContent className="flex items-center justify-between p-4">
            <span className="text-white">{layer.name}</span>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Volume2 className="text-gray-400" size={16} />
                <Slider
                  value={[layer.volume]}
                  max={100}
                  step={1}
                  className="w-24"
                  onValueChange={(value) => onVolumeChange(index, value[0])}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(index)}
                className="text-gray-400 hover:text-white"
              >
                <X size={16} />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

