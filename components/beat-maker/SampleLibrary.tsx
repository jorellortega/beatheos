import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Music, Play, Pause } from 'lucide-react'
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden !bg-[#141414]">
        <DialogHeader>
          <DialogTitle className="text-white">Select Audio from Library</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search audio files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-600 text-white"
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
                  className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
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

