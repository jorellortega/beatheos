import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Play, Plus } from 'lucide-react'

interface Sample {
  id: string
  name: string
  tempo: number
  key: string
}

interface SuggestedSamplesProps {
  onAddLayer: (sample: Sample) => void
}

const mockSamples: Sample[] = [
  { id: '1', name: 'Deep Bass', tempo: 120, key: 'C' },
  { id: '2', name: 'Funky Drums', tempo: 110, key: 'Am' },
  { id: '3', name: 'Synth Lead', tempo: 128, key: 'G' },
]

export function SuggestedSamples({ onAddLayer }: SuggestedSamplesProps) {
  const [playingSample, setPlayingSample] = useState<string | null>(null)

  const playSample = (id: string) => {
    // TODO: Implement actual audio playback
    setPlayingSample(id)
    setTimeout(() => setPlayingSample(null), 2000) // Simulate 2 seconds of playback
  }

  return (
    <div className="space-y-4">
      {mockSamples.map((sample) => (
        <Card key={sample.id} className="bg-secondary">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <h3 className="text-white font-medium">{sample.name}</h3>
              <p className="text-sm text-gray-400">{sample.tempo} BPM | Key: {sample.key}</p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => playSample(sample.id)}
                className="text-primary hover:text-white"
              >
                <Play size={16} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAddLayer(sample)}
                className="text-primary border-primary hover:bg-primary hover:text-white"
              >
                <Plus size={16} className="mr-1" />
                Add
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

