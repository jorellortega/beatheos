"use client"

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Upload, FileText, File, X, Loader2, CheckCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface FileImportProps {
  onImport: (content: string, title: string, contentType: string) => void
  acceptedTypes?: string[]
}

interface ImportedFile {
  name: string
  content: string
  type: string
  size: number
}

export function FileImport({ onImport, acceptedTypes = ['.txt', '.pdf', '.docx'] }: FileImportProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [importedFiles, setImportedFiles] = useState<ImportedFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [manualText, setManualText] = useState('')
  const [manualTitle, setManualTitle] = useState('')
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    handleFiles(files)
  }

  const handleFiles = async (files: File[]) => {
    setIsProcessing(true)
    
    try {
      const processedFiles: ImportedFile[] = []
      
      for (const file of files) {
        const fileExtension = file.name.split('.').pop()?.toLowerCase()
        
        if (!acceptedTypes.includes(`.${fileExtension}`)) {
          toast({
            title: "Unsupported file type",
            description: `${file.name} is not supported. Accepted types: ${acceptedTypes.join(', ')}`,
            variant: "destructive"
          })
          continue
        }

        let content = ''
        
        try {
          if (fileExtension === 'txt') {
            content = await file.text()
          } else if (fileExtension === 'pdf') {
            content = await extractTextFromPDF(file)
          } else if (fileExtension === 'docx') {
            content = await extractTextFromDocx(file)
          }
          
          processedFiles.push({
            name: file.name,
            content,
            type: fileExtension || 'unknown',
            size: file.size
          })
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error)
          toast({
            title: "Error processing file",
            description: `Failed to extract text from ${file.name}`,
            variant: "destructive"
          })
        }
      }
      
      setImportedFiles(processedFiles)
      
      if (processedFiles.length > 0) {
        toast({
          title: "Files imported successfully",
          description: `Successfully imported ${processedFiles.length} file(s)`
        })
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const extractTextFromPDF = async (file: File): Promise<string> => {
    // This is a simplified implementation
    // In a real app, you'd use a library like pdfjs-dist
    return `[PDF content from ${file.name} - Text extraction not implemented in this demo]`
  }

  const extractTextFromDocx = async (file: File): Promise<string> => {
    // This is a simplified implementation
    // In a real app, you'd use a library like mammoth
    return `[DOCX content from ${file.name} - Text extraction not implemented in this demo]`
  }

  const handleImportFile = (file: ImportedFile) => {
    const title = file.name.replace(/\.[^/.]+$/, "") // Remove extension
    const contentType = determineContentType(file.content)
    onImport(file.content, title, contentType)
    
    // Remove the file from the list
    setImportedFiles(prev => prev.filter(f => f.name !== file.name))
    
    toast({
      title: "Content imported",
      description: `"${title}" has been imported as ${contentType}`
    })
  }

  const handleManualImport = () => {
    if (!manualText.trim() || !manualTitle.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both title and content",
        variant: "destructive"
      })
      return
    }

    const contentType = determineContentType(manualText)
    onImport(manualText, manualTitle, contentType)
    
    setManualText('')
    setManualTitle('')
    
    toast({
      title: "Content imported",
      description: `"${manualTitle}" has been imported as ${contentType}`
    })
  }

  const determineContentType = (content: string): 'script' | 'lyrics' | 'poetry' | 'prose' => {
    // Simple heuristics to determine content type
    const lowerContent = content.toLowerCase()
    
    if (lowerContent.includes('verse') || lowerContent.includes('chorus') || lowerContent.includes('bridge')) {
      return 'lyrics'
    }
    
    if (lowerContent.includes('scene') || lowerContent.includes('character') || lowerContent.includes('dialogue')) {
      return 'script'
    }
    
    if (content.split('\n').length > 10 && content.length < 1000) {
      return 'poetry'
    }
    
    return 'prose'
  }

  const removeFile = (fileName: string) => {
    setImportedFiles(prev => prev.filter(f => f.name !== fileName))
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Import Content
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">Drop files here or click to browse</p>
          <p className="text-sm text-muted-foreground mb-4">
            Supported formats: {acceptedTypes.join(', ')}
          </p>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Choose Files'
            )}
          </Button>
          <Input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedTypes.join(',')}
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Imported Files */}
        {importedFiles.length > 0 && (
          <div>
            <Label className="text-base font-medium">Imported Files</Label>
            <div className="space-y-2 mt-2">
              {importedFiles.map((file) => (
                <div
                  key={file.name}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {file.type.toUpperCase()} • {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleImportFile(file)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Import
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.name)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manual Text Input */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <File className="h-5 w-5" />
            <Label className="text-base font-medium">Manual Text Input</Label>
          </div>
          
          <div>
            <Label htmlFor="manual-title">Title</Label>
            <Input
              id="manual-title"
              placeholder="Enter a title for your content"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="manual-content">Content</Label>
            <Textarea
              id="manual-content"
              placeholder="Paste or type your content here..."
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              rows={6}
            />
          </div>
          
          <Button
            onClick={handleManualImport}
            disabled={!manualText.trim() || !manualTitle.trim()}
            className="w-full"
          >
            Import Manual Content
          </Button>
        </div>

        {/* Content Type Detection Info */}
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Content Type Detection:</strong> The system will automatically detect whether your content is 
            lyrics, script, poetry, or prose based on keywords and structure.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}



