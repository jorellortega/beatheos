import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Music, Play, Pause, Upload, X } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

interface AudioLibraryItem {
  id: string
  name: string
  file_path: string
  file_url?: string // <-- add this line
  created_at: string
  file_size?: number
}

interface SampleLibraryProps {
  isOpen: boolean
  onClose: () => void
  onSelectAudio: (audioUrl: string) => void
}

export function SampleLibrary({ isOpen, onClose, onSelectAudio }: SampleLibraryProps) {
  const [audioFiles, setAudioFiles] = useState<AudioLibraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  // Store refs to audio elements for preview
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({})


  useEffect(() => {
    if (isOpen) {
      fetchAudioLibrary()
    }
  }, [isOpen])

  const fetchAudioLibrary = async () => {
    try {
      setLoading(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('audio_library_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching audio library:', error)
        return
      }

      setAudioFiles(data || [])
    } catch (error) {
      console.error('Error fetching audio library:', error)
    } finally {
      setLoading(false)
    }
  }

  const getAudioUrl = (filePath: string) => {
    const { data } = supabase.storage
      .from('beats')
      .getPublicUrl(filePath)
    return data.publicUrl
  }

  const handlePlayAudio = (audioId: string, fileUrl: string) => {
    // Stop currently playing audio
    if (playingAudio && audioRefs.current[playingAudio]) {
      audioRefs.current[playingAudio]?.pause()
      audioRefs.current[playingAudio]!.currentTime = 0
    }

    // Play the audio using the <audio> element
    const url = fileUrl
    if (audioRefs.current[audioId]) {
      audioRefs.current[audioId]!.src = url
      audioRefs.current[audioId]!.play()
      setPlayingAudio(audioId)
    }
  }

  const handleStopAudio = () => {
    if (playingAudio && audioRefs.current[playingAudio]) {
      audioRefs.current[playingAudio]?.pause()
      audioRefs.current[playingAudio]!.currentTime = 0
      setPlayingAudio(null)
    }
  }

  const handleSelectAudio = (fileUrl: string) => {
    handleStopAudio()
    onSelectAudio(fileUrl)
  }

  const filteredAudioFiles = audioFiles.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown'
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  const uploadAudioFile = async (file: File) => {
    try {
      setUploading(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to upload files')
        return
      }

      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `audio-samples/${user.id}/${fileName}`

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('beats')
        .upload(filePath, file)

      if (uploadError) {
        console.error('Upload error:', uploadError)
        alert('Failed to upload file')
        return
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('beats')
        .getPublicUrl(filePath)

      // Save metadata to database
      const { error: dbError } = await supabase
        .from('audio_library_items')
        .insert({
          user_id: user.id,
          name: file.name,
          file_path: filePath,
          file_url: urlData.publicUrl,
          file_size: file.size
        })

      if (dbError) {
        console.error('Database error:', dbError)
        alert('Failed to save file metadata')
        return
      }

      // Refresh the library
      await fetchAudioLibrary()
      
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      uploadAudioFile(files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      // Check if it's an audio file
      if (file.type.startsWith('audio/')) {
        uploadAudioFile(file)
      } else {
        alert('Please upload an audio file')
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden !bg-[#141414]">
        <DialogHeader>
          <DialogTitle className="text-white">Select Audio from Library</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragOver ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-gray-500'
            }`}
          >
            {uploading ? (
              <div className="space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-gray-400">Uploading...</p>
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                <div>
                  <p className="text-white font-medium">Drag & drop audio files here</p>
                  <p className="text-gray-400 text-sm">or</p>
                </div>
                <div>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="audio-upload"
                  />
                  <label htmlFor="audio-upload">
                    <Button variant="outline" className="cursor-pointer" asChild>
                      <span>Choose Files</span>
                    </Button>
                  </label>
                </div>
                <p className="text-gray-500 text-xs">Supports: MP3, WAV, FLAC, OGG</p>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search audio files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[#141414] border-gray-600 text-white"
            />
          </div>

          {/* Audio Files List */}
          <div className="max-h-[60vh] overflow-y-auto space-y-2">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                <p className="text-gray-400 mt-2">Loading audio library...</p>
              </div>
            ) : filteredAudioFiles.length === 0 ? (
              <div className="text-center py-8">
                <Music className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-400">
                  {searchTerm ? 'No audio files found matching your search.' : 'No audio files in your library.'}
                </p>
              </div>
            ) : (
              filteredAudioFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 bg-[#141414] rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePlayAudio(file.id, file.file_url || '')}
                        className="w-8 h-8 p-0"
                      >
                        {playingAudio === file.id ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                      {/* Hidden audio element for preview */}
                      <audio
                        ref={el => { audioRefs.current[file.id] = el; }}
                        src={file.file_url || ''}
                        preload="metadata"
                        style={{ display: 'none' }}
                        onEnded={() => setPlayingAudio(null)}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{file.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {formatFileSize(file.file_size)}
                        </Badge>
                        <span className="text-gray-400 text-xs">
                          {new Date(file.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleSelectAudio(file.file_url || '')}
                    variant="default"
                    size="sm"
                  >
                    Select
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

