import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Upload, Folder } from 'lucide-react'

export function SampleLibrary() {
  const sampleKits = [
    { id: 1, name: "Trap Essentials" },
    { id: 2, name: "Lo-Fi Dreams" },
    { id: 3, name: "808 Madness" },
  ]

  return (
    <div className="bg-card rounded-lg p-4">
      <h2 className="text-xl font-semibold mb-4">Sample Library</h2>
      <div className="flex space-x-2 mb-4">
        <Input placeholder="Search samples..." />
        <Button>
          <Upload className="h-4 w-4 mr-2" />
          Upload
        </Button>
      </div>
      {sampleKits.map((kit) => (
        <Button key={kit.id} variant="ghost" className="w-full justify-start mb-2">
          <Folder className="h-4 w-4 mr-2" />
          {kit.name}
        </Button>
      ))}
    </div>
  )
}

