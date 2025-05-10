import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Play, Pause } from 'lucide-react'

interface Loop {
  id: string
  name: string
  category: string
  duration: number
}

const mockLoops: Loop[] = [
  { id: '1', name: 'Funky Guitar', category: 'Guitar', duration: 4 },
  { id: '2', name: 'Deep Bass', category: 'Bass', duration: 2 },
  { id: '3', name: 'Snare Roll', category: 'Drums', duration: 1 },
  { id: '4', name: 'Synth Pad', category: 'Synth', duration: 8 },
  { id: '5', name: 'Hi-Hat Groove', category: 'Drums', duration: 2 },
  { id: '6', name: 'Vocal Chop', category: 'Vocal', duration: 1 },
  { id: '7', name: 'Ambient Texture', category: 'FX', duration: 4 },
  { id: '8', name: 'Trap 808', category: 'Bass', duration: 2 },
]

interface LoopLibraryProps {
  onLoopSelect: (loopId: string) => void
}

export function LoopLibrary({ onLoopSelect }: LoopLibraryProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [playingLoop, setPlayingLoop] = useState<string | null>(null)

  const filteredLoops = mockLoops.filter(loop => 
    loop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loop.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handlePlay = (loopId: string) => {
    if (playingLoop === loopId) {
      setPlayingLoop(null)
      // TODO: Stop audio playback
    } else {
      setPlayingLoop(loopId)
      // TODO: Start audio playback
    }
  }

  return (
    <div className="bg-card rounded-lg p-4">
      <h2 className="text-xl font-semibold mb-4">Loop Library</h2>
      <Input 
        placeholder="Search loops..." 
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-4"
      />
      <ScrollArea className="h-[calc(100vh-300px)]">
        {filteredLoops.map((loop) => (
          <div key={loop.id} className="flex items-center justify-between p-2 hover:bg-accent rounded-md">
            <div>
              <h3 className="font-medium">{loop.name}</h3>
              <p className="text-sm text-muted-foreground">{loop.category} - {loop.duration}s</p>
            </div>
            <div className="flex space-x-2">
              <Button size="icon" variant="ghost" onClick={() => handlePlay(loop.id)}>
                {playingLoop === loop.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button size="sm" onClick={() => onLoopSelect(loop.id)}>Add</Button>
            </div>
          </div>
        ))}
      </ScrollArea>
    </div>
  )
}

