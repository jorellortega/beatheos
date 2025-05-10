import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Volume2, Mic } from 'lucide-react'

export function TrackList() {
  const tracks = [
    { id: 1, name: "Kick" },
    { id: 2, name: "Snare" },
    { id: 3, name: "Hi-Hat" },
    { id: 4, name: "Melody" },
  ]

  return (
    <div className="bg-card rounded-lg p-4 mb-4">
      <h2 className="text-xl font-semibold mb-4">Tracks</h2>
      {tracks.map((track) => (
        <div key={track.id} className="flex items-center space-x-2 mb-2">
          <Button size="icon" variant="secondary">
            <Mic className="h-4 w-4" />
          </Button>
          <Input value={track.name} className="w-32" />
          <Slider defaultValue={[75]} max={100} step={1} className="w-24" />
          <Volume2 className="h-4 w-4" />
        </div>
      ))}
      <Button className="w-full mt-2">Add Track</Button>
    </div>
  )
}

