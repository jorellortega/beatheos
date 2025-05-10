import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download } from 'lucide-react'

interface ExportOptionsProps {
  layers: any[]
}

export function ExportOptions({ layers }: ExportOptionsProps) {
  const [exportFormat, setExportFormat] = useState('stems')

  const handleExport = () => {
    // TODO: Implement actual export functionality
    console.log(`Exporting ${layers.length} layers as ${exportFormat}`)
  }

  return (
    <div className="flex items-center space-x-4">
      <Select value={exportFormat} onValueChange={setExportFormat}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Export format" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="stems">Stems</SelectItem>
          <SelectItem value="project">DAW Project</SelectItem>
          <SelectItem value="mixed">Mixed Audio</SelectItem>
        </SelectContent>
      </Select>
      <Button onClick={handleExport} className="gradient-button text-black font-medium hover:text-white">
        <Download className="h-4 w-4 mr-2" />
        Export
      </Button>
    </div>
  )
}

