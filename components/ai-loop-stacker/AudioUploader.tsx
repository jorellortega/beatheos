import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Upload } from 'lucide-react'

interface AudioUploaderProps {
  onUpload: (file: File) => void
}

export function AudioUploader({ onUpload }: AudioUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleUpload = () => {
    if (selectedFile) {
      onUpload(selectedFile)
    }
  }

  return (
    <div className="flex items-center space-x-2">
      <Input
        type="file"
        accept="audio/*"
        onChange={handleFileChange}
        className="hidden"
        id="audio-upload"
      />
      <label htmlFor="audio-upload" className="cursor-pointer">
        <Button variant="outline" className="text-primary border-primary hover:bg-primary hover:text-white">
          <Upload className="h-4 w-4 mr-2" />
          Select Audio
        </Button>
      </label>
      {selectedFile && (
        <Button onClick={handleUpload} className="gradient-button text-black font-medium hover:text-white">
          Upload and Analyze
        </Button>
      )}
    </div>
  )
}

