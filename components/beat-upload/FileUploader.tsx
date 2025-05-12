import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRef, useState } from "react"

interface FileUploaderProps {
  label: string
  accept: string
  file: File | null
  onFileChange: (file: File | null) => void
  icon: React.ReactNode
}

export function FileUploader({ label, accept, file, onFileChange, icon }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragActive, setIsDragActive] = useState(false)
  const [lastDroppedFile, setLastDroppedFile] = useState<{name: string, type: string} | null>(null)

  const isFileAccepted = (file: File) => {
    const acceptList = accept.split(',').map(a => a.trim().toLowerCase())
    const fileType = file.type.toLowerCase()
    const fileName = file.name.toLowerCase()
    return acceptList.some(a => {
      if (a === 'audio/*') {
        return fileType.startsWith('audio/')
      }
      if (a === 'audio/wav') {
        // Accept if type contains 'wav' or extension is .wav (case-insensitive)
        return fileType.includes('wav') || fileName.endsWith('.wav')
      }
      if (a.startsWith('.')) {
        return fileName.endsWith(a)
      }
      // fallback: check if fileType matches accept
      return fileType === a
    })
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragActive(false)
    console.log('[FileUploader] drop event fired')
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      console.log('[FileUploader] Dropped file:', droppedFile.name, droppedFile.type)
      setLastDroppedFile({ name: droppedFile.name, type: droppedFile.type })
      // Always accept .wav extension regardless of MIME type
      if (accept.toLowerCase().includes('wav') && droppedFile.name.toLowerCase().endsWith('.wav')) {
        onFileChange(droppedFile)
        return
      }
      if (isFileAccepted(droppedFile)) {
        onFileChange(droppedFile)
      }
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragActive(true)
    console.log('[FileUploader] drag over event fired')
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragActive(false)
  }

  return (
    <div>
      <Label htmlFor={label}>{label}</Label>
      <div
        className={`flex items-center space-x-2 border rounded transition-colors ${isDragActive ? 'border-primary bg-primary/10' : 'border-transparent'}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        style={{ cursor: 'pointer', position: 'relative' }}
      >
        <Input
          id={label}
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={(e) => onFileChange(e.target.files?.[0] || null)}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          tabIndex={-1}
        >
          {icon}
          Choose File
        </Button>
        <span className="text-sm text-gray-500">
          {file ? file.name : 'No file chosen'}
        </span>
        {isDragActive && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.6)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '1.1rem',
            zIndex: 10,
            borderRadius: '0.375rem',
          }}>
            Drop file here!
          </div>
        )}
      </div>
      {label.toLowerCase().includes('cover art') && (
        <p className="text-xs text-gray-400 mt-1">
          Recommended size: 1600x1600 pixels. Images will be automatically cropped to this size if different.
        </p>
      )}
      {/* DEBUG: Drag-and-drop info */}
      <div style={{ marginTop: 8, fontSize: 12, color: '#aaa' }}>
        <div><b>DEBUG</b> accept: <code>{accept}</code></div>
        {lastDroppedFile && (
          <div>Last dropped: <code>{lastDroppedFile.name}</code> (<code>{lastDroppedFile.type}</code>)</div>
        )}
      </div>
    </div>
  )
}

