"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Edit, Upload, Image, Music, FileAudio } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface Beat {
  id: string
  title: string
  coverImage: string
  mp3File: string
  wavFile: string | null
  stemsFile: string | null
  genre: string
  bpm: number
  key: string
  price: number
  description: string
}

const initialBeats: Beat[] = [
  {
    id: "1",
    title: "Urban Symphony",
    coverImage: "/placeholder.svg",
    mp3File: "/placeholder-audio.mp3",
    wavFile: null,
    stemsFile: null,
    genre: "Hip-Hop",
    bpm: 95,
    key: "Am",
    price: 49.99,
    description: "A vibrant urban beat with a symphonic twist.",
  },
  {
    id: "2",
    title: "Neon Nights",
    coverImage: "/placeholder.svg",
    mp3File: "/placeholder-audio.mp3",
    wavFile: "/placeholder-audio.wav",
    stemsFile: null,
    genre: "Electronic",
    bpm: 128,
    key: "F#m",
    price: 39.99,
    description: "Electrifying beat perfect for night-time vibes.",
  },
  {
    id: "3",
    title: "Rhythm & Soul",
    coverImage: "/placeholder.svg",
    mp3File: "/placeholder-audio.mp3",
    wavFile: null,
    stemsFile: "/placeholder-stems.zip",
    genre: "R&B",
    bpm: 75,
    key: "Dm",
    price: 34.99,
    description: "Soulful rhythm with a modern R&B twist.",
  },
]

// Mock function for handling file uploads
const handleFileUpload = async (file: File, beatId: string, fileType: string) => {
  console.log('Mock file upload:', { file, beatId, fileType })
  // Return a mock public URL
  return `https://mock-storage.com/${beatId}/${fileType}/${file.name}`
}

// Mock function for updating beat data
const updateBeat = async (updatedBeat: any) => {
  console.log('Mock beat update:', updatedBeat)
  return { data: updatedBeat, error: null }
}

export function MediaManagement() {
  const [beats, setBeats] = useState<Beat[]>(initialBeats)
  const [editingBeat, setEditingBeat] = useState<Beat | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleEdit = (beat: Beat) => {
    setEditingBeat(beat)
    setIsDialogOpen(true)
  }

  const handleSave = async (updatedBeat: Beat) => {
    try {
      // Update the beats array with the new data
      setBeats(beats.map((beat) => (beat.id === updatedBeat.id ? updatedBeat : beat)))
      setIsDialogOpen(false)
      toast({
        title: "Beat Updated",
        description: `${updatedBeat.title} has been successfully updated.`,
      })
    } catch (error) {
      console.error("Error updating beat:", error)
      toast({
        title: "Update Error",
        description: "Failed to update beat. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    try {
      // Mock beatId for demonstration
      const beatId = 'mock-beat-id'
      const fileType = 'audio'
      
      const publicUrl = await handleFileUpload(selectedFile, beatId, fileType)
      
      const updatedBeat = {
        id: beatId,
        audioUrl: publicUrl,
        // Add other beat properties as needed
      }
      
      const { error } = await updateBeat(updatedBeat)
      
      if (error) {
        console.error('Error updating beat:', error)
        return
      }

      console.log('File uploaded successfully:', publicUrl)
      setSelectedFile(null)
    } catch (error) {
      console.error('Error uploading file:', error)
    }
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Media Management</CardTitle>
        <CardDescription>Upload and manage your beat files</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Genre</TableHead>
              <TableHead>BPM</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {beats.map((beat) => (
              <TableRow key={beat.id}>
                <TableCell>{beat.title}</TableCell>
                <TableCell>{beat.genre}</TableCell>
                <TableCell>{beat.bpm}</TableCell>
                <TableCell>{beat.key}</TableCell>
                <TableCell>${beat.price.toFixed(2)}</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(beat)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Beat</DialogTitle>
            </DialogHeader>
            {editingBeat && (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSave(editingBeat)
                }}
              >
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="title" className="text-right">
                      Title
                    </Label>
                    <Input
                      id="title"
                      value={editingBeat.title}
                      onChange={(e) => setEditingBeat({ ...editingBeat, title: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="genre" className="text-right">
                      Genre
                    </Label>
                    <Input
                      id="genre"
                      value={editingBeat.genre}
                      onChange={(e) => setEditingBeat({ ...editingBeat, genre: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="bpm" className="text-right">
                      BPM
                    </Label>
                    <Input
                      id="bpm"
                      type="number"
                      value={editingBeat.bpm}
                      onChange={(e) => setEditingBeat({ ...editingBeat, bpm: Number(e.target.value) })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="key" className="text-right">
                      Key
                    </Label>
                    <Input
                      id="key"
                      value={editingBeat.key}
                      onChange={(e) => setEditingBeat({ ...editingBeat, key: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="price" className="text-right">
                      Price
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={editingBeat.price}
                      onChange={(e) => setEditingBeat({ ...editingBeat, price: Number(e.target.value) })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={editingBeat.description}
                      onChange={(e) => setEditingBeat({ ...editingBeat, description: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Cover Image</Label>
                    <div className="col-span-3">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            handleFileUpload(file, editingBeat.id, "coverImage")
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">MP3 File</Label>
                    <div className="col-span-3">
                      <Input
                        type="file"
                        accept="audio/mpeg"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            handleFileUpload(file, editingBeat.id, "mp3File")
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">WAV File</Label>
                    <div className="col-span-3">
                      <Input
                        type="file"
                        accept="audio/wav"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            handleFileUpload(file, editingBeat.id, "wavFile")
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Stems File</Label>
                    <div className="col-span-3">
                      <Input
                        type="file"
                        accept=".zip"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            handleFileUpload(file, editingBeat.id, "stemsFile")
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button type="submit">Save Changes</Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="audio">Audio File</Label>
          <Input
            id="audio"
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
          />
          <Button 
            onClick={handleUpload}
            disabled={!selectedFile}
          >
            Upload
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

