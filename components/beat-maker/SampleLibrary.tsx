import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Upload, Plus } from 'lucide-react'

interface SampleLibraryProps {
  samples: { id: string; name: string }[]
  onAddSample: (file: File) => void
  onAddTrack: (sampleId: string) => void
}

export function SampleLibrary({ samples, onAddSample, onAddTrack }: SampleLibraryProps) {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onAddSample(file)
    }
  }

  return (
    <Card className="bg-secondary border-primary neon-border-green">
      <CardHeader>
        <CardTitle className="text-white">Sample Library</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex space-x-2 mb-4">
          <Input
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            className="hidden"
            id="sample-upload"
          />
          <label htmlFor="sample-upload" className="w-full">
            <Button variant="outline" className="w-full">
              <Upload className="h-4 w-4 mr-2" />
              Upload Sample
            </Button>
          </label>
        </div>
        <ScrollArea className="h-[calc(100vh-300px)]">
          {samples.map((sample) => (
            <div key={sample.id} className="flex items-center justify-between p-2 hover:bg-accent rounded-md">
              <span className="text-white">{sample.name}</span>
              <Button size="sm" onClick={() => onAddTrack(sample.id)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Track
              </Button>
            </div>
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

