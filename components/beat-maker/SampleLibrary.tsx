import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Music, Play, Pause, Upload, X, Package, Folder, Grid, FileAudio, Piano, Drum, Music2, FileMusic, File } from 'lucide-react'

// Audio type categories matching the mass edit modal
const AUDIO_TYPE_CATEGORIES = {
  'Drums': ['Kick', 'Snare', 'Hihat', 'Clap', 'Crash', 'Ride', 'Tom', 'Cymbal', 'Percussion'],
  'Bass': ['Bass', 'Sub', '808'],
  'Melodic': ['Melody', 'Lead', 'Pad', 'Chord', 'Arp'],
  'Loops': ['Melody Loop', 'Piano Loop', '808 Loop', 'Drum Loop', 'Snare Loop', 'Kick Loop', 'Hihat Loop', 'Clap Loop', 'Crash Loop', 'Ride Loop', 'Tom Loop', 'Bass Loop', 'Vocal Loop', 'Guitar Loop', 'Synth Loop', 'Percussion Loop', 'Lead Loop', 'Pad Loop', 'Arp Loop', 'Chord Loop', 'FX Loop', 'Ambient Loop', 'Break', 'Fill', 'Transition', 'Other'],
  'Effects': ['FX', 'Vocal', 'Sample'],
  'Technical': ['MIDI', 'Patch', 'Preset'],
  'Other': ['Other']
}
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'

interface AudioLibraryItem {
  id: string
  name: string
  type: string
  description?: string
  file_url?: string
  file_size?: number
  pack_id?: string
  subfolder?: string
  pack?: AudioPack
  bpm?: number
  key?: string
  audio_type?: string
  tags?: string[]
  created_at: string
}

interface AudioPack {
  id: string
  name: string
  description?: string
  cover_image_url?: string
  color: string
  created_at: string
  updated_at: string
  item_count?: number
  subfolders?: AudioSubfolder[]
}

interface AudioSubfolder {
  id: string
  pack_id: string
  name: string
  description?: string
  color: string
  position: number
  created_at: string
  updated_at: string
}

interface SampleLibraryProps {
  isOpen: boolean
  onClose: () => void
  onSelectAudio: (audioUrl: string, audioName?: string, metadata?: {
    bpm?: number
    key?: string
    audio_type?: string
    tags?: string[]
    audioFileId?: string
  }) => void
  preferMp3?: boolean
  onToggleFormat?: (preferMp3: boolean) => void
}

export function SampleLibrary({ isOpen, onClose, onSelectAudio, preferMp3 = false, onToggleFormat }: SampleLibraryProps) {
  const { user, isLoading: authLoading } = useAuth()
  const [audioItems, setAudioItems] = useState<AudioLibraryItem[]>([])
  const [audioPacks, setAudioPacks] = useState<AudioPack[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'packs'>('packs')
  const [selectedPack, setSelectedPack] = useState<string | null>(null)
  const [expandedSubfolders, setExpandedSubfolders] = useState<Set<string>>(new Set())
  const [fileLinks, setFileLinks] = useState<any[]>([])
  
  // Store refs to audio elements for preview
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({})

  // Debug auth state
  useEffect(() => {
    console.log('SampleLibrary: Auth state changed -', { 
      user: user ? { id: user.id, email: user.email } : null, 
      authLoading, 
      isOpen 
    })
  }, [user, authLoading, isOpen])

  // Fetch file links for format switching
  const fetchFileLinks = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        console.warn('No access token available')
        return
      }

      const response = await fetch('/api/audio/links', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      if (!response.ok) throw new Error('Failed to fetch file links')
      
      const { links } = await response.json()
      console.log('Fetched file links:', links)
      setFileLinks(links || [])
    } catch (error) {
      console.error('Error fetching file links:', error)
    }
  }

  // Get the preferred audio URL for a file
  const getPreferredAudioUrl = (file: AudioLibraryItem) => {
    if (!preferMp3) {
      return file.file_url
    }

    // Look for MP3 version in file links
    const mp3Link = fileLinks.find(link => 
      link.original_file_id === file.id && link.converted_format === 'mp3'
    )

    if (mp3Link) {
      // Find the MP3 file in audioItems
      const mp3File = audioItems.find(item => item.id === mp3Link.converted_file_id)
      return mp3File?.file_url || file.file_url
    }

    return file.file_url
  }

  useEffect(() => {
    console.log('SampleLibrary: Effect triggered -', { isOpen, authLoading, userId: user?.id })
    
    if (isOpen && !authLoading) {
      if (user?.id) {
        console.log('SampleLibrary: Fetching audio library for user:', user.id)
        fetchAudioLibrary()
      } else {
        console.log('SampleLibrary: No user found, showing empty state. User object:', user)
        setLoading(false)
      }
    } else if (isOpen && authLoading) {
      console.log('SampleLibrary: Auth still loading, waiting...')
      setLoading(true)
    } else if (!isOpen) {
      // Reset loading state when dialog closes
      setLoading(true)
    }
  }, [isOpen, user?.id, authLoading])

  const fetchAudioLibrary = async () => {
    try {
      setLoading(true)
      
      // Try to get user from context first, then fallback to direct supabase auth
      let currentUser = user
      if (!currentUser?.id) {
        console.log('No user in context, trying direct Supabase auth...')
        const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser()
        if (authError) {
          console.error('Error getting user from Supabase:', authError)
          setLoading(false)
          return
        }
        if (supabaseUser) {
          currentUser = { id: supabaseUser.id, email: supabaseUser.email || null, role: null }
          console.log('Got user from Supabase auth:', currentUser.id)
        }
      }

      if (!currentUser?.id) {
        console.log('No user found after all attempts, skipping audio library fetch')
        setLoading(false)
        return
      }

      console.log('Fetching audio library for user:', currentUser.id)

      // Fetch audio items with pack information
      const { data: audioData, error: audioError } = await supabase
        .from('audio_library_items')
        .select(`
          *,
          pack:audio_packs(id, name, color)
        `)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })

      if (audioError) {
        console.error('Error fetching audio library:', audioError)
        setLoading(false)
        return
      }

      console.log('Audio items fetched:', audioData?.length || 0)
      setAudioItems(audioData || [])

      // Fetch audio packs with subfolders
      const { data: packsData, error: packsError } = await supabase
        .from('audio_packs')
        .select(`
          *,
          item_count:audio_library_items(count),
          subfolders:audio_subfolders(*)
        `)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })

      if (packsError) {
        console.error('Error fetching audio packs:', packsError)
        setLoading(false)
        return
      }

      console.log('Audio packs fetched:', packsData?.length || 0)
      setAudioPacks(packsData || [])
    } catch (error) {
      console.error('Error fetching audio library:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch file links when audio library is loaded
  useEffect(() => {
    if (audioItems.length > 0) {
      fetchFileLinks()
    }
  }, [audioItems])

  const handlePlayAudio = (audioId: string, fileUrl: string) => {
    // Stop currently playing audio
    if (playingAudio && audioRefs.current[playingAudio]) {
      audioRefs.current[playingAudio]?.pause()
      audioRefs.current[playingAudio]!.currentTime = 0
    }

    // Play the audio using the <audio> element
    if (audioRefs.current[audioId]) {
      audioRefs.current[audioId]!.src = fileUrl
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

  const handleSelectAudio = (fileUrl: string, fileName?: string, item?: AudioLibraryItem) => {
    handleStopAudio()
    
    // Use preferred audio URL if item is provided
    const finalUrl = item ? getPreferredAudioUrl(item) || fileUrl : fileUrl
    const finalName = fileName || item?.name || 'Unknown'
    
    onSelectAudio(finalUrl, finalName, item ? {
      bpm: item.bpm,
      key: item.key,
      audio_type: item.audio_type,
      tags: item.tags,
      audioFileId: item.id // Include the audio file ID
    } : undefined)
  }

  const filteredAudioItems = audioItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Toggle subfolder expansion
  const toggleSubfolder = (subfolderId: string) => {
    const newExpanded = new Set(expandedSubfolders)
    if (newExpanded.has(subfolderId)) {
      newExpanded.delete(subfolderId)
    } else {
      newExpanded.add(subfolderId)
    }
    setExpandedSubfolders(newExpanded)
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown'
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  // Get category color for audio types
  const getAudioTypeCategoryColor = (audioType: string) => {
    for (const [category, types] of Object.entries(AUDIO_TYPE_CATEGORIES)) {
      if (types.includes(audioType)) {
        switch (category) {
          case 'Drums': return 'text-red-400 border-red-400'
          case 'Bass': return 'text-blue-400 border-blue-400'
          case 'Melodic': return 'text-green-400 border-green-400'
          case 'Loops': return 'text-yellow-400 border-yellow-400'
          case 'Effects': return 'text-purple-400 border-purple-400'
          case 'Technical': return 'text-orange-400 border-orange-400'
          case 'Other': return 'text-gray-400 border-gray-400'
          default: return 'text-gray-400 border-gray-400'
        }
      }
    }
    return 'text-gray-400 border-gray-400'
  }

  const uploadAudioFile = async (file: File) => {
    try {
      setUploading(true)
      
      if (!user?.id) {
        alert('Please log in to upload files')
        return
      }

      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(2)
      const fileName = `${timestamp}-${randomId}.${fileExt}`
      const filePath = `audio-library/${user.id}_${fileName}`

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('beats')
        .upload(filePath, file, { upsert: false })

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
          type: 'sample', // Default type
          file_url: urlData.publicUrl,
          file_size: file.size,
          pack_id: null,
          subfolder: null
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
      const audioExtensions = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma']
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
      if (file.type.startsWith('audio/') || audioExtensions.includes(fileExtension)) {
        uploadAudioFile(file)
      } else {
        alert('Please upload an audio file')
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden !bg-[#141414]" aria-describedby="audio-library-description">
        <DialogHeader>
          <DialogTitle className="text-white">Audio Library - Select Sample</DialogTitle>
          <p id="audio-library-description" className="text-gray-400 text-sm">
            Browse and select audio samples from your organized library. You can search, preview, and upload new files.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Format Toggle */}
          {onToggleFormat && (
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className={`text-lg font-bold ${!preferMp3 ? 'text-blue-600' : 'text-muted-foreground'}`}>
                    WAV
                  </div>
                  <div className="text-xs text-muted-foreground">High Quality</div>
                </div>
                
                <div 
                  className="relative inline-flex h-8 w-16 items-center rounded-full bg-gray-200 cursor-pointer shadow-inner transition-colors hover:bg-gray-300"
                  onClick={() => onToggleFormat(!preferMp3)}
                >
                  <div 
                    className={`h-6 w-6 transform rounded-full bg-[#141414] shadow-md transition-all duration-200 ease-in-out ${
                      preferMp3 ? 'translate-x-8' : 'translate-x-1'
                    }`}
                  />
                </div>
                
                <div className="text-center">
                  <div className={`text-lg font-bold ${preferMp3 ? 'text-green-600' : 'text-muted-foreground'}`}>
                    MP3
                  </div>
                  <div className="text-xs text-muted-foreground">Compressed</div>
                </div>
              </div>
              
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  <FileAudio className="h-3 w-3" />
                  Loading: {preferMp3 ? 'MP3' : 'WAV'} files
                </div>
              </div>
            </div>
          )}

          {/* Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
              dragOver ? 'border-yellow-400 bg-yellow-400/10' : 'border-gray-600 hover:border-gray-500'
            }`}
          >
            {uploading ? (
              <div className="space-y-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-400 mx-auto"></div>
                <p className="text-gray-400 text-sm">Uploading...</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                <div>
                  <p className="text-white text-sm font-medium">Drag & drop audio files here</p>
                  <p className="text-gray-400 text-xs">or</p>
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
                    <Button variant="outline" size="sm" className="cursor-pointer" asChild>
                      <span>Choose Files</span>
                    </Button>
                  </label>
                </div>
                <p className="text-gray-500 text-xs">Supports: MP3, WAV, FLAC, OGG, AAC, M4A</p>
              </div>
            )}
          </div>

          {/* Search and View Mode Toggle */}
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search audio files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[#1a1a1a] border-gray-600 text-white"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4 mr-2" />
                All Files
              </Button>
              <Button
                variant={viewMode === 'packs' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('packs')}
              >
                <Package className="w-4 h-4 mr-2" />
                Packs
              </Button>
            </div>
          </div>

          {/* Audio Files Content */}
          <div className="max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                <p className="text-gray-400 mt-2">Loading audio library...</p>
              </div>
            ) : viewMode === 'grid' ? (
              // Grid View - All Files
              <div className="space-y-2">
                {filteredAudioItems.length === 0 ? (
                  <div className="text-center py-8">
                    <Music className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-400">
                      {searchTerm ? 'No audio files found matching your search.' : 'No audio files in your library.'}
                    </p>
                  </div>
                ) : (
                  filteredAudioItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-black rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                          {item.type === 'midi' && <Piano className="h-4 w-4 text-yellow-400" />}
                          {item.type === 'soundkit' && <Drum className="h-4 w-4 text-red-400" />}
                          {item.type === 'loop' && <Music className="h-4 w-4 text-blue-400" />}
                          {item.type === 'patch' && <Music2 className="h-4 w-4 text-green-400" />}
                          {item.type === 'sample' && <FileAudio className="h-4 w-4 text-purple-400" />}
                          {item.type === 'clip' && <FileMusic className="h-4 w-4 text-pink-400" />}
                          {item.type === 'other' && <File className="h-4 w-4 text-gray-400" />}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePlayAudio(item.id, item.file_url || '')}
                            className="w-8 h-8 p-0"
                          >
                            {playingAudio === item.id ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </Button>
                          {/* Hidden audio element for preview */}
                          <audio
                            ref={el => { audioRefs.current[item.id] = el; }}
                            src={item.file_url || ''}
                            preload="metadata"
                            style={{ display: 'none' }}
                            onEnded={() => setPlayingAudio(null)}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{item.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs capitalize">
                              {item.type}
                            </Badge>
                            {item.bpm && (
                              <Badge variant="secondary" className="text-xs">
                                {item.bpm} BPM
                              </Badge>
                            )}
                            {item.key && (
                              <Badge variant="secondary" className="text-xs">
                                {item.key}
                              </Badge>
                            )}
                            {item.audio_type && (
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${getAudioTypeCategoryColor(item.audio_type)}`}
                              >
                                {item.audio_type}
                              </Badge>
                            )}
                            {item.pack && (
                              <Badge 
                                variant="outline" 
                                style={{ borderColor: item.pack.color, color: item.pack.color }}
                                className="text-xs"
                              >
                                {item.pack.name}
                                {item.subfolder && ` / ${item.subfolder}`}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {formatFileSize(item.file_size)}
                            </Badge>
                          </div>
                          {item.tags && item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.tags.slice(0, 2).map((tag, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {item.tags.length > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{item.tags.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <Button
                        onClick={() => handleSelectAudio(item.file_url || '', item.name, item)}
                        variant="default"
                        size="sm"
                        className="bg-yellow-400 hover:bg-yellow-500 text-black"
                      >
                        Select
                      </Button>
                    </div>
                  ))
                )}
              </div>
            ) : (
              // Packs View
              <div className="space-y-4">
                {audioPacks.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-400">No packs found. Create packs in your main Audio Library.</p>
                  </div>
                ) : (
                  audioPacks.map(pack => (
                    <div key={pack.id} className="bg-[#1a1a1a] rounded-lg border border-gray-700 overflow-hidden">
                      <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4">
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: pack.color + '20', border: `2px solid ${pack.color}` }}
                          >
                            <Package className="h-5 w-5" style={{ color: pack.color }} />
                          </div>
                          <div>
                            <h3 className="text-white font-medium">{pack.name}</h3>
                            <p className="text-gray-400 text-sm">{pack.description}</p>
                            <p className="text-gray-500 text-xs">
                              {audioItems.filter(item => item.pack_id === pack.id).length} items
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedPack(selectedPack === pack.id ? null : pack.id)}
                        >
                          {selectedPack === pack.id ? 'Hide' : 'View'} Files
                        </Button>
                      </div>
                      
                      {selectedPack === pack.id && (
                        <div className="border-t border-gray-700 p-4 space-y-3">
                          {/* Show subfolders */}
                          {pack.subfolders && pack.subfolders.length > 0 && (
                            <div className="space-y-2">
                              {pack.subfolders.map(subfolder => (
                                <div key={subfolder.id} className="border border-gray-600 rounded-lg overflow-hidden">
                                  <div 
                                    className="flex items-center gap-3 p-3 cursor-pointer bg-[#141414]"
                                    onClick={() => toggleSubfolder(subfolder.id)}
                                  >
                                    <div 
                                      className="w-6 h-6 rounded-full flex items-center justify-center"
                                      style={{ backgroundColor: subfolder.color + '20', border: `1px solid ${subfolder.color}` }}
                                    >
                                      <Folder className="h-3 w-3" style={{ color: subfolder.color }} />
                                    </div>
                                    <div className="flex-1">
                                      <h4 className="text-white text-sm font-medium">📁 {subfolder.name}</h4>
                                      <p className="text-gray-500 text-xs">
                                        {audioItems.filter(item => item.pack_id === pack.id && item.subfolder === subfolder.name).length} files
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {expandedSubfolders.has(subfolder.id) && (
                                    <div className="px-3 pb-3 space-y-2">
                                      {audioItems
                                        .filter(item => item.pack_id === pack.id && item.subfolder === subfolder.name)
                                        .map(item => (
                                          <div 
                                            key={item.id} 
                                            className="flex items-center gap-3 p-2 bg-black rounded-lg ml-4"
                                          >
                                            <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center">
                                              {item.type === 'midi' && <Piano className="h-3 w-3 text-yellow-400" />}
                                              {item.type === 'soundkit' && <Drum className="h-3 w-3 text-red-400" />}
                                              {item.type === 'loop' && <Music className="h-3 w-3 text-blue-400" />}
                                              {item.type === 'patch' && <Music2 className="h-3 w-3 text-green-400" />}
                                              {item.type === 'sample' && <FileAudio className="h-3 w-3 text-purple-400" />}
                                              {item.type === 'clip' && <FileMusic className="h-3 w-3 text-pink-400" />}
                                              {item.type === 'other' && <File className="h-3 w-3 text-gray-400" />}
                                            </div>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => handlePlayAudio(item.id, item.file_url || '')}
                                              className="w-6 h-6 p-0"
                                            >
                                              {playingAudio === item.id ? (
                                                <Pause className="w-3 h-3" />
                                              ) : (
                                                <Play className="w-3 h-3" />
                                              )}
                                            </Button>
                                            <audio
                                              ref={el => { audioRefs.current[item.id] = el; }}
                                              src={item.file_url || ''}
                                              preload="metadata"
                                              style={{ display: 'none' }}
                                              onEnded={() => setPlayingAudio(null)}
                                            />
                                            <div className="flex-1 min-w-0">
                                              <p className="text-white text-sm font-medium truncate">{item.name}</p>
                                              <div className="flex items-center gap-1 mt-1">
                                                <Badge variant="outline" className="text-xs capitalize">
                                                  {item.type}
                                                </Badge>
                                                {item.bpm && (
                                                  <Badge variant="secondary" className="text-xs">
                                                    {item.bpm} BPM
                                                  </Badge>
                                                )}
                                                {item.key && (
                                                  <Badge variant="secondary" className="text-xs">
                                                    {item.key}
                                                  </Badge>
                                                )}
                                                {item.audio_type && (
                                                  <Badge 
                                                    variant="outline" 
                                                    className={`text-xs ${getAudioTypeCategoryColor(item.audio_type)}`}
                                                  >
                                                    {item.audio_type}
                                                  </Badge>
                                                )}
                                              </div>
                                              {item.tags && item.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                  {item.tags.slice(0, 1).map((tag, index) => (
                                                    <Badge key={index} variant="secondary" className="text-xs">
                                                      {tag}
                                                    </Badge>
                                                  ))}
                                                  {item.tags.length > 1 && (
                                                    <Badge variant="secondary" className="text-xs">
                                                      +{item.tags.length - 1}
                                                    </Badge>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                                                                         <Button
                                               onClick={() => handleSelectAudio(item.file_url || '', item.name, item)}
                                               variant="default"
                                               size="sm"
                                               className="bg-yellow-400 hover:bg-yellow-500 text-black text-xs"
                                             >
                                               Select
                                             </Button>
                                          </div>
                                        ))}
                                      {audioItems.filter(item => item.pack_id === pack.id && item.subfolder === subfolder.name).length === 0 && (
                                        <p className="text-center text-gray-400 py-2 text-sm ml-4">No files in this folder.</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          
                                                      {/* Show root level files (no subfolder) */}
                           <div className="space-y-2">
                             <h4 className="text-gray-400 text-sm font-medium flex items-center gap-2">
                               <Folder className="h-4 w-4" />
                               Pack Root
                             </h4>
                             {audioItems
                               .filter(item => item.pack_id === pack.id && !item.subfolder)
                               .map(item => (
                                 <div 
                                   key={item.id} 
                                   className="flex items-center gap-3 p-3 bg-black rounded-lg"
                                 >
                                   <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center">
                                     {item.type === 'midi' && <Piano className="h-3 w-3 text-yellow-400" />}
                                     {item.type === 'soundkit' && <Drum className="h-3 w-3 text-red-400" />}
                                     {item.type === 'loop' && <Music className="h-3 w-3 text-blue-400" />}
                                     {item.type === 'patch' && <Music2 className="h-3 w-3 text-green-400" />}
                                     {item.type === 'sample' && <FileAudio className="h-3 w-3 text-purple-400" />}
                                     {item.type === 'clip' && <FileMusic className="h-3 w-3 text-pink-400" />}
                                     {item.type === 'other' && <File className="h-3 w-3 text-gray-400" />}
                                   </div>
                                   <Button
                                     variant="ghost"
                                     size="sm"
                                     onClick={() => handlePlayAudio(item.id, item.file_url || '')}
                                     className="w-6 h-6 p-0"
                                   >
                                     {playingAudio === item.id ? (
                                       <Pause className="w-3 h-3" />
                                     ) : (
                                       <Play className="w-3 h-3" />
                                     )}
                                   </Button>
                                   <audio
                                     ref={el => { audioRefs.current[item.id] = el; }}
                                     src={item.file_url || ''}
                                     preload="metadata"
                                     style={{ display: 'none' }}
                                     onEnded={() => setPlayingAudio(null)}
                                   />
                                   <div className="flex-1 min-w-0">
                                     <p className="text-white text-sm font-medium truncate">{item.name}</p>
                                     <div className="flex items-center gap-1 mt-1">
                                       <Badge variant="outline" className="text-xs capitalize">
                                         {item.type}
                                       </Badge>
                                       {item.bpm && (
                                         <Badge variant="secondary" className="text-xs">
                                           {item.bpm} BPM
                                         </Badge>
                                       )}
                                       {item.key && (
                                         <Badge variant="secondary" className="text-xs">
                                           {item.key}
                                         </Badge>
                                       )}
                                       {item.audio_type && (
                                         <Badge variant="outline" className="text-xs">
                                           {item.audio_type}
                                         </Badge>
                                       )}
                                     </div>
                                     {item.tags && item.tags.length > 0 && (
                                       <div className="flex flex-wrap gap-1 mt-1">
                                         {item.tags.slice(0, 1).map((tag, index) => (
                                           <Badge key={index} variant="secondary" className="text-xs">
                                             {tag}
                                           </Badge>
                                         ))}
                                         {item.tags.length > 1 && (
                                           <Badge variant="secondary" className="text-xs">
                                             +{item.tags.length - 1}
                                           </Badge>
                                         )}
                                       </div>
                                     )}
                                   </div>
                                   <Button
                                     onClick={() => handleSelectAudio(item.file_url || '', item.name, item)}
                                     variant="default"
                                     size="sm"
                                     className="bg-yellow-400 hover:bg-yellow-500 text-black"
                                   >
                                     Select
                                   </Button>
                                 </div>
                               ))}
                             {audioItems.filter(item => item.pack_id === pack.id && !item.subfolder).length === 0 && (
                               <p className="text-center text-gray-400 py-2 text-sm">No root files.</p>
                             )}
                           </div>
                          
                          {audioItems.filter(item => item.pack_id === pack.id).length === 0 && (
                            <p className="text-center text-gray-400 py-4 text-sm">No files in this pack.</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}

                {/* Show unpacked files in packs view */}
                {audioItems.filter(item => !item.pack_id).length > 0 && (
                  <div className="bg-[#1a1a1a] rounded-lg border border-gray-700 overflow-hidden">
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
                          <Folder className="h-5 w-5 text-gray-400" />
                        </div>
                        <div>
                          <h3 className="text-white font-medium">Unpacked Files</h3>
                          <p className="text-gray-400 text-sm">Files not organized in any pack</p>
                          <p className="text-gray-500 text-xs">
                            {audioItems.filter(item => !item.pack_id).length} items
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedPack(selectedPack === 'unpacked' ? null : 'unpacked')}
                      >
                        {selectedPack === 'unpacked' ? 'Hide' : 'View'} Files
                      </Button>
                    </div>
                    
                                         {selectedPack === 'unpacked' && (
                       <div className="border-t border-gray-700 p-4 space-y-2">
                         {audioItems
                           .filter(item => !item.pack_id)
                           .map(item => (
                             <div 
                               key={item.id} 
                               className="flex items-center gap-3 p-3 bg-black rounded-lg"
                             >
                               <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center">
                                 {item.type === 'midi' && <Piano className="h-3 w-3 text-yellow-400" />}
                                 {item.type === 'soundkit' && <Drum className="h-3 w-3 text-red-400" />}
                                 {item.type === 'loop' && <Music className="h-3 w-3 text-blue-400" />}
                                 {item.type === 'patch' && <Music2 className="h-3 w-3 text-green-400" />}
                                 {item.type === 'sample' && <FileAudio className="h-3 w-3 text-purple-400" />}
                                 {item.type === 'clip' && <FileMusic className="h-3 w-3 text-pink-400" />}
                                 {item.type === 'other' && <File className="h-3 w-3 text-gray-400" />}
                               </div>
                               <Button
                                 variant="ghost"
                                 size="sm"
                                 onClick={() => handlePlayAudio(item.id, item.file_url || '')}
                                 className="w-6 h-6 p-0"
                               >
                                 {playingAudio === item.id ? (
                                   <Pause className="w-3 h-3" />
                                 ) : (
                                   <Play className="w-3 h-3" />
                                 )}
                               </Button>
                               <audio
                                 ref={el => { audioRefs.current[item.id] = el; }}
                                 src={item.file_url || ''}
                                 preload="metadata"
                                 style={{ display: 'none' }}
                                 onEnded={() => setPlayingAudio(null)}
                               />
                               <div className="flex-1 min-w-0">
                                 <p className="text-white text-sm font-medium truncate">{item.name}</p>
                                 <div className="flex items-center gap-1 mt-1">
                                   <Badge variant="outline" className="text-xs capitalize">
                                     {item.type}
                                   </Badge>
                                   {item.bpm && (
                                     <Badge variant="secondary" className="text-xs">
                                       {item.bpm} BPM
                                     </Badge>
                                   )}
                                   {item.key && (
                                     <Badge variant="secondary" className="text-xs">
                                       {item.key}
                                     </Badge>
                                   )}
                                   {item.audio_type && (
                                     <Badge variant="outline" className="text-xs">
                                       {item.audio_type}
                                     </Badge>
                                   )}
                                 </div>
                                 {item.tags && item.tags.length > 0 && (
                                   <div className="flex flex-wrap gap-1 mt-1">
                                     {item.tags.slice(0, 1).map((tag, index) => (
                                       <Badge key={index} variant="secondary" className="text-xs">
                                         {tag}
                                       </Badge>
                                     ))}
                                     {item.tags.length > 1 && (
                                       <Badge variant="secondary" className="text-xs">
                                         +{item.tags.length - 1}
                                       </Badge>
                                     )}
                                   </div>
                                 )}
                               </div>
                               <Button
                                 onClick={() => handleSelectAudio(item.file_url || '', item.name, item)}
                                 variant="default"
                                 size="sm"
                                 className="bg-yellow-400 hover:bg-yellow-500 text-black"
                               >
                                 Select
                               </Button>
                             </div>
                           ))}
                       </div>
                     )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

