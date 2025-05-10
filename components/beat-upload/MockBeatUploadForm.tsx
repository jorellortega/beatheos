"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import { Upload, Music, ImageIcon, Loader, FileText, AudioLines, FileAudio, FileArchive, File } from "lucide-react"
import { FileUploader } from "./FileUploader"
import { BeatPreviewPlayer } from "./BeatPreviewPlayer"
import { LicensingOptions } from "./LicensingOptions"
import { TagInput } from "./TagInput"
import { useDropzone } from "react-dropzone"
import { useRouter } from "next/navigation"
import { Draft, AudioFile, PairedFile, PlaylistAlbum } from "@/types/draft"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from "@/lib/supabase"

interface InitialData {
  title: string
  description: string
  tags: string[]
  bpm: string
  key: string
  genre: string
  file: File | undefined
  wavFile: File | null
  stemsFile: File | null
  coverArt: File | null
  licensing: Record<string, number>
}

interface MockBeatUploadFormProps {
  initialData?: InitialData
}

export function MockBeatUploadForm({ initialData }: MockBeatUploadFormProps) {
  const [activeTab, setActiveTab] = useState("upload")
  const [title, setTitle] = useState(initialData?.title || "")
  const [description, setDescription] = useState(initialData?.description || "")
  const [tags, setTags] = useState<string[]>(initialData?.tags || [])
  const [bpm, setBpm] = useState(initialData?.bpm || "")
  const [key, setKey] = useState(initialData?.key || "")
  const [genre, setGenre] = useState(initialData?.genre || "")
  const [mp3File, setMp3File] = useState<File | null>(null)
  const [wavFile, setWavFile] = useState<File | null>(initialData?.wavFile || null)
  const [stemsFile, setStemsFile] = useState<File | null>(initialData?.stemsFile || null)
  const [coverArt, setCoverArt] = useState<File | null>(initialData?.coverArt || null)
  const [licensing, setLicensing] = useState<Record<string, number>>(initialData?.licensing || {})
  const [isDraft, setIsDraft] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([])
  const [selectedFiles, setSelectedFiles] = useState<PairedFile[]>([])
  const [pairedFiles, setPairedFiles] = useState<PairedFile[]>([])
  const router = useRouter()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      const newAudioFile: AudioFile = {
        id: `af${audioFiles.length + 1}`,
        title: file.name,
        file: file.type === "audio/mpeg" ? file : null,
        wavFile: file.type === "audio/wav" ? file : null,
        stemsFile: file.type === "application/zip" ? file : null,
        coverArt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      setAudioFiles(prev => [...prev, newAudioFile])
    })
  }, [audioFiles])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop })

  const simulateUpload = async () => {
    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      setUploadProgress(i)
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUploading(true)

    if (!mp3File) {
      toast({
        title: "Missing Required File",
        description: "Please upload an MP3 file for your beat",
        variant: "destructive",
      })
      setIsUploading(false)
      return
    }

    try {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('description', description)
      formData.append('genre', genre || '')
      formData.append('bpm', bpm)
      formData.append('key', key)
      formData.append('tags', JSON.stringify(tags))
      formData.append('licensing', JSON.stringify(licensing))
      formData.append('isDraft', isDraft.toString())
      formData.append('mp3File', mp3File)
      if (wavFile) formData.append('wavFile', wavFile)
      if (stemsFile) formData.append('stemsFile', stemsFile)
      if (coverArt) formData.append('coverArt', coverArt)

      // Get the session from Supabase
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('You must be logged in to upload beats')
      }

      const response = await fetch('/api/beats', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to upload beat')
      }

      const beat = await response.json()

      if (isDraft) {
        toast({
          title: "Draft Saved",
          description: "Your beat draft has been saved successfully.",
        })
        router.push('/dashboard/business_producer?tab=mybeats')
      } else {
        toast({
          title: "Beat Uploaded",
          description: "Your beat has been successfully uploaded and is now live.",
        })
        router.push('/dashboard/business_producer?tab=mybeats')
      }

      // Reset form after submission
      setTitle("")
      setDescription("")
      setTags([])
      setBpm("")
      setKey("")
      setGenre("")
      setMp3File(null)
      setWavFile(null)
      setStemsFile(null)
      setCoverArt(null)
      setLicensing({})
      setIsDraft(false)
    } catch (error) {
      console.error("Error uploading beat:", error)
      toast({
        title: "Upload Error",
        description: error instanceof Error ? error.message : "An error occurred during the upload process. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const loadDraft = (draft: Draft) => {
    router.push(`/beatupload/${draft.id}`)
  }

  const deleteDraft = (draftId: string) => {
    setDrafts(drafts.filter(draft => draft.id !== draftId))
    toast({
      title: "Draft Deleted",
      description: "The draft has been deleted successfully.",
    })
  }

  const handleAudioFileUpload = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    const newAudioFile: AudioFile = {
      id: `af${audioFiles.length + 1}`,
      title: `New Audio File ${audioFiles.length + 1}`,
      file: null,
      wavFile: null,
      stemsFile: null,
      coverArt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    setAudioFiles([...audioFiles, newAudioFile])
    toast({
      title: "Audio file added",
      description: "Please edit the file details to complete the upload.",
    })
  }

  const handleEditAudioFile = (file: AudioFile) => {
    router.push(`/beatupload/${file.id}?type=audio`)
  }

  const handleDeleteAudioFile = (id: string) => {
    setAudioFiles(audioFiles.filter(file => file.id !== id))
    toast({
      title: "Audio file deleted",
      description: "The audio file has been removed from your list.",
    })
  }

  const handleFileSelect = (file: AudioFile, type: 'audio' | 'cover' | 'contract' | 'stems') => {
    const newPairedFile: PairedFile = {
      id: file.id,
      title: file.title,
      type,
      file: type === 'audio' ? file.file : 
            type === 'cover' ? file.coverArt :
            type === 'contract' ? null : // PDF would be handled separately
            file.stemsFile,
      createdAt: file.createdAt,
      updatedAt: new Date()
    }

    setPairedFiles(prev => [...prev, newPairedFile])
    setSelectedFiles(prev => [...prev, newPairedFile])
  }

  const handleCreatePlaylist = () => {
    if (selectedFiles.length > 0) {
      // Store selected files in localStorage
      localStorage.setItem('selectedFiles', JSON.stringify(selectedFiles))
      router.push('/create-playlist')
    }
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="upload">
          <Upload className="mr-2 h-4 w-4" />
          Upload Beat
        </TabsTrigger>
        <TabsTrigger value="drafts">
          <FileText className="mr-2 h-4 w-4" />
          Saved Drafts ({drafts.length})
        </TabsTrigger>
        <TabsTrigger value="audio">
          <AudioLines className="mr-2 h-4 w-4" />
          Files ({audioFiles.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="upload" className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div
            {...getRootProps()}
            className={`p-10 border-2 border-dashed rounded-lg text-center cursor-pointer ${
              isDragActive ? "border-primary" : "border-gray-300"
            }`}
          >
            <input {...getInputProps()} />
            {isDragActive ? <p>Drop the files here ...</p> : <p>Drag 'n' drop some files here, or click to select files</p>}
          </div>

          <div>
            <Label htmlFor="title">Title (Required)</Label>
            <Input
              id="title"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={60}
              className="bg-secondary text-white"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-secondary text-white"
              rows={4}
              maxLength={250}
            />
          </div>

          <TagInput tags={tags} setTags={setTags} />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bpm">BPM</Label>
              <Input
                id="bpm"
                type="number"
                value={bpm}
                onChange={(e) => setBpm(e.target.value)}
                className="bg-secondary text-white"
              />
            </div>
            <div>
              <Label htmlFor="key">Key</Label>
              <Select onValueChange={setKey}>
                <SelectTrigger id="key" className="bg-secondary text-white">
                  <SelectValue placeholder="Select key" />
                </SelectTrigger>
                <SelectContent>
                  {["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].map((note) => (
                    <SelectItem key={note} value={note}>
                      {note} Major
                    </SelectItem>
                  ))}
                  {["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].map((note) => (
                    <SelectItem key={`${note}m`} value={`${note}m`}>
                      {note} Minor
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <FileUploader
            label="MP3 File (Required)"
            accept="audio/mpeg"
            file={mp3File}
            onFileChange={setMp3File}
            icon={<Music className="mr-2 h-4 w-4" />}
          />

          <FileUploader
            label="WAV File (Optional)"
            accept="audio/wav"
            file={wavFile}
            onFileChange={setWavFile}
            icon={<Music className="mr-2 h-4 w-4" />}
          />

          <FileUploader
            label="Track Stems (Optional)"
            accept="application/zip"
            file={stemsFile}
            onFileChange={setStemsFile}
            icon={<Music className="mr-2 h-4 w-4" />}
          />

          <FileUploader
            label="Cover Art (Optional)"
            accept="image/*"
            file={coverArt}
            onFileChange={setCoverArt}
            icon={<ImageIcon className="mr-2 h-4 w-4" />}
          />

          {mp3File && <BeatPreviewPlayer file={mp3File} />}

          <LicensingOptions licensing={licensing} setLicensing={setLicensing} />

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsDraft(!isDraft)}
              className="ml-4"
            >
              {isDraft ? "Unmark as Draft" : "Save as Draft"}
            </Button>
          </div>

          <Button
            type="submit"
            className="w-full gradient-button text-black font-medium hover:text-white"
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                {uploadProgress < 100 ? `Uploading... ${Math.round(uploadProgress)}%` : "Processing..."}
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {isDraft ? "Save Draft" : "Publish Beat"}
              </>
            )}
          </Button>
        </form>
      </TabsContent>

      <TabsContent value="drafts">
        <div className="space-y-1">
          {drafts.length === 0 ? (
            <p className="text-center text-gray-400">No saved drafts yet.</p>
          ) : (
            drafts.map((draft) => (
              <div key={draft.id} className="border rounded-lg p-2 hover:bg-secondary/50 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-medium truncate">{draft.title}</h3>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => loadDraft(draft)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-destructive hover:text-destructive"
                      onClick={() => deleteDraft(draft.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </TabsContent>

      <TabsContent value="audio">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Files</h3>
            <div className="flex items-center space-x-2">
              {selectedFiles.length > 0 && (
                <Button onClick={handleCreatePlaylist} className="h-8">
                  Create Playlist/Album ({selectedFiles.length})
                </Button>
              )}
              <Button onClick={handleAudioFileUpload} className="h-8">
                Upload New
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {audioFiles.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-3 bg-black rounded-lg hover:bg-secondary/5">
                <div className="flex items-center space-x-4">
                  <Checkbox 
                    checked={selectedFiles.some(f => f.id === file.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        handleFileSelect(file, 'audio')
                      } else {
                        setSelectedFiles(prev => prev.filter(f => f.id !== file.id))
                      }
                    }}
                  />
                  <div className="w-10 h-10 flex items-center justify-center bg-secondary/20 rounded">
                    {file.wavFile ? (
                      <FileAudio className="w-5 h-5 text-blue-400" />
                    ) : file.file?.type === 'audio/mpeg' ? (
                      <Music className="w-5 h-5 text-purple-400" />
                    ) : file.coverArt ? (
                      <ImageIcon className="w-5 h-5 text-green-400" />
                    ) : file.stemsFile ? (
                      <FileArchive className="w-5 h-5 text-yellow-400" />
                    ) : file.file?.type === 'application/pdf' ? (
                      <FileText className="w-5 h-5 text-red-400" />
                    ) : (
                      <File className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-white">{file.title}</p>
                    <div className="flex items-center space-x-3 text-sm">
                      {file.wavFile && (
                        <span className="flex items-center px-2 py-1 bg-blue-500/20 rounded">
                          <FileAudio className="w-4 h-4 mr-1 text-blue-400" />
                          <span className="text-blue-300">WAV</span>
                        </span>
                      )}
                      {file.file?.type === 'audio/mpeg' && (
                        <span className="flex items-center px-2 py-1 bg-purple-500/20 rounded">
                          <Music className="w-4 h-4 mr-1 text-purple-400" />
                          <span className="text-purple-300">MP3</span>
                        </span>
                      )}
                      {file.coverArt && (
                        <span className="flex items-center px-2 py-1 bg-green-500/20 rounded">
                          <ImageIcon className="w-4 h-4 mr-1 text-green-400" />
                          <span className="text-green-300">JPEG</span>
                        </span>
                      )}
                      {file.stemsFile && (
                        <span className="flex items-center px-2 py-1 bg-yellow-500/20 rounded">
                          <FileArchive className="w-4 h-4 mr-1 text-yellow-400" />
                          <span className="text-yellow-300">ZIP</span>
                        </span>
                      )}
                      {file.file?.type === 'application/pdf' && (
                        <span className="flex items-center px-2 py-1 bg-red-500/20 rounded">
                          <FileText className="w-4 h-4 mr-1 text-red-400" />
                          <span className="text-red-300">PDF</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 text-gray-300 hover:text-white hover:bg-secondary/80"
                    onClick={() => router.push(`/beatupload/${file.id}?type=audio`)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 text-red-400 hover:text-red-300 hover:bg-secondary/80"
                    onClick={() => handleDeleteAudioFile(file.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </TabsContent>
    </Tabs>
  )
}

function AddSampleDialog() {
  const [name, setName] = useState("")
  const [source, setSource] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const event = new CustomEvent("add-sample", { detail: { name, source } })
    window.dispatchEvent(event)
    const dialog = document.getElementById('add-sample-dialog') as HTMLDialogElement
    dialog?.close()
    setName("")
    setSource("")
  }

  return (
    <dialog id="add-sample-dialog" className="rounded-lg p-6 max-w-md w-full">
      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="text-lg font-semibold">Add Sample</h3>
        <div>
          <Label htmlFor="sample-name">Sample Name</Label>
          <Input
            id="sample-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="bg-secondary text-white"
          />
        </div>
        <div>
          <Label htmlFor="sample-source">Source</Label>
          <Input
            id="sample-source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            required
            className="bg-secondary text-white"
            placeholder="e.g., Splice, Loopmasters, etc."
          />
        </div>
        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const dialog = document.getElementById('add-sample-dialog') as HTMLDialogElement
              dialog?.close()
            }}
          >
            Cancel
          </Button>
          <Button type="submit">Add Sample</Button>
        </div>
      </form>
    </dialog>
  )
}

