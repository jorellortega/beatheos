import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Upload, Play } from 'lucide-react'

interface LoopLibraryProps {
  loops: { id: string; name: string; duration: number }[]
  onLoopSelect: (loopId: string) => void
  onAddLoop: (file: File) => void
}

export function LoopLibrary({ loops, onLoopSelect, onAddLoop }: LoopLibraryProps) {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onAddLoop(file)
    }
  }

  return (
    <Card className="bg-secondary border-primary neon-border-green">
      <CardHeader>
        <CardTitle className="text-white">Loop Library</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex space-x-2 mb-4">
          <Input
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            className="hidden"
            id="loop-upload"
          />
          <label htmlFor="loop-upload" className="w-full">
            <Button variant="outline" className="w-full">
              <Upload className="h-4 w-4 mr-2" />
              Upload Loop
            </Button>
          </label>
        </div>
        <ScrollArea className="h-[calc(100vh-300px)]">
          {loops.map((loop) => (
            <div key={loop.id} className="flex items-center justify-between p-2 hover:bg-accent rounded-md">
              <div>
                <h3 className="font-medium text-white">{loop.name}</h3>
                <p className="text-sm text-muted-foreground">{loop.duration.toFixed(2)}s</p>
              </div>
              <Button size="sm" onClick={() => onLoopSelect(loop.id)}>
                <Play className="h-4 w-4 mr-2" />
                Use
              </Button>
            </div>
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

