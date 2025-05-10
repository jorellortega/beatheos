"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FileAudio, Music, ImageIcon, FileArchive, FileText, X, Pencil, Upload } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { PairedFile } from "@/types/draft"
import Image from "next/image"

export default function CreatePlaylistPage() {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [selectedFiles, setSelectedFiles] = useState<PairedFile[]>([])
  const [editingFileId, setEditingFileId] = useState<string | null>(null)
  const [editingFileName, setEditingFileName] = useState("")
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Load selected files from localStorage
    const savedFiles = localStorage.getItem('selectedFiles')
    if (savedFiles) {
      const files = JSON.parse(savedFiles)
      setSelectedFiles(files)
      
      // Find the first cover image
      const cover = files.find(f => f.type === 'cover')
      if (cover?.file) {
        setCoverFile(cover.file)
        setCoverPreview(URL.createObjectURL(cover.file))
      }
      
      // Clear the localStorage after loading
      localStorage.removeItem('selectedFiles')
    }
  }, [])

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type.startsWith('image/')) {
        setCoverFile(file)
        setCoverPreview(URL.createObjectURL(file))
      } else {
        toast({
          title: "Invalid File",
          description: "Please upload an image file.",
          variant: "destructive",
        })
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title) {
      toast({
        title: "Title Required",
        description: "Please enter a title for your playlist/album.",
        variant: "destructive",
      })
      return
    }

    // Here you would typically save the playlist/album
    toast({
      title: "Success",
      description: "Playlist/Album created successfully!",
    })
    router.push("/beatupload")
  }

  const removeFile = (fileId: string) => {
    setSelectedFiles(files => files.filter(f => f.id !== fileId))
  }

  const startEditing = (file: PairedFile) => {
    setEditingFileId(file.id)
    setEditingFileName(file.title || '')
  }

  const handleRename = (fileId: string) => {
    setSelectedFiles(files => 
      files.map(f => 
        f.id === fileId ? { ...f, title: editingFileName } : f
      )
    )
    setEditingFileId(null)
  }

  const getFileIcon = (file: PairedFile) => {
    switch (file.type) {
      case 'audio':
        if (file.file?.type === 'audio/wav') return <FileAudio className="w-5 h-5 text-blue-400" />
        return <Music className="w-5 h-5 text-purple-400" />
      case 'cover':
        return <ImageIcon className="w-5 h-5 text-green-400" />
      case 'stems':
        return <FileArchive className="w-5 h-5 text-yellow-400" />
      case 'contract':
        return <FileText className="w-5 h-5 text-red-400" />
      default:
        return <FileText className="w-5 h-5 text-gray-400" />
    }
  }

  const getFileTypeLabel = (file: PairedFile) => {
    switch (file.type) {
      case 'audio':
        if (file.file?.type === 'audio/wav') return 'WAV'
        return 'MP3'
      case 'cover':
        return 'JPEG'
      case 'stems':
        return 'ZIP'
      case 'contract':
        return 'PDF'
      default:
        return 'FILE'
    }
  }

  const getTypeColor = (file: PairedFile) => {
    switch (file.type) {
      case 'audio':
        if (file.file?.type === 'audio/wav') return 'blue'
        return 'purple'
      case 'cover':
        return 'green'
      case 'stems':
        return 'yellow'
      case 'contract':
        return 'red'
      default:
        return 'gray'
    }
  }

  const handleTitleClick = () => {
    setIsEditingTitle(true)
  }

  const handleTitleBlur = () => {
    setIsEditingTitle(false)
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditingTitle(false)
    }
  }

  return (
    <div className="container max-w-3xl py-8">
      <Card>
        <CardHeader>
          <div className="flex items-start space-x-4">
            <div className="w-48 h-48 relative rounded-lg overflow-hidden bg-secondary/20">
              {coverPreview ? (
                <Image
                  src={coverPreview}
                  alt="Cover Art"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                  <ImageIcon className="w-12 h-12 mb-2" />
                  <span className="text-sm">No Cover Art</span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <CardTitle>
                {isEditingTitle ? (
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={handleTitleBlur}
                    onKeyDown={handleTitleKeyDown}
                    className="text-2xl font-bold bg-secondary"
                    autoFocus
                  />
                ) : (
                  <div 
                    onClick={handleTitleClick}
                    className="cursor-pointer hover:bg-secondary/20 p-2 rounded-lg transition-colors"
                  >
                    {title || "Create Playlist/Album"}
                  </div>
                )}
              </CardTitle>
              <CardDescription className="mt-2">
                Organize your selected files into a playlist or album
              </CardDescription>
              <div className="mt-4">
                <Label htmlFor="cover-upload" className="cursor-pointer">
                  <Button variant="outline" className="w-full">
                    <Upload className="w-4 h-4 mr-2" />
                    {coverPreview ? "Change Cover Art" : "Upload Cover Art"}
                  </Button>
                </Label>
                <input
                  id="cover-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  className="hidden"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter playlist/album description"
                className="bg-secondary"
              />
            </div>

            <div className="space-y-2">
              <Label>Selected Files</Label>
              {selectedFiles.length === 0 ? (
                <p className="text-sm text-gray-400">No files selected</p>
              ) : (
                <div className="space-y-2">
                  {selectedFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-3 bg-black rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 flex items-center justify-center bg-secondary/20 rounded">
                          {getFileIcon(file)}
                        </div>
                        <div className="space-y-1">
                          {editingFileId === file.id ? (
                            <div className="flex items-center space-x-2">
                              <Input
                                value={editingFileName}
                                onChange={(e) => setEditingFileName(e.target.value)}
                                className="w-64 bg-secondary"
                                autoFocus
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleRename(file.id)}
                              >
                                Save
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <div 
                                className="cursor-pointer hover:bg-secondary/20 p-2 rounded-lg transition-colors"
                                onClick={() => startEditing(file)}
                              >
                                <p className="font-medium text-white">{file.title || file.file?.name}</p>
                                {file.title && file.title !== file.file?.name && (
                                  <p className="text-xs text-gray-400">Original: {file.file?.name}</p>
                                )}
                              </div>
                            </div>
                          )}
                          <span className={`inline-flex items-center px-2 py-1 bg-${getTypeColor(file)}-500/20 rounded text-sm`}>
                            {getFileIcon(file)}
                            <span className={`ml-1 text-${getTypeColor(file)}-300`}>
                              {getFileTypeLabel(file)}
                            </span>
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                        className="text-gray-400 hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/beatupload")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={selectedFiles.length === 0}>
                Create Playlist/Album
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 