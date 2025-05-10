import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface FileUploaderProps {
  label: string
  accept: string
  file: File | null
  onFileChange: (file: File | null) => void
  icon: React.ReactNode
}

export function FileUploader({ label, accept, file, onFileChange, icon }: FileUploaderProps) {
  return (
    <div>
      <Label htmlFor={label}>{label}</Label>
      <div className="flex items-center space-x-2">
        <Input
          id={label}
          type="file"
          accept={accept}
          onChange={(e) => onFileChange(e.target.files?.[0] || null)}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => document.getElementById(label)?.click()}
        >
          {icon}
          Choose File
        </Button>
        <span className="text-sm text-gray-500">
          {file ? file.name : 'No file chosen'}
        </span>
      </div>
      {label.toLowerCase().includes('cover art') && (
        <p className="text-xs text-gray-400 mt-1">
          Recommended size: 1600x1600 pixels. Images will be automatically cropped to this size if different.
        </p>
      )}
    </div>
  )
}

