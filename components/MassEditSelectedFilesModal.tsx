import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Badge } from './ui/badge'
import { X, Plus, Music, Drum, Piano, FileAudio, FileMusic, File, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

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
  genre?: string
  subgenre?: string
  tags?: string[]
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

interface MassEditSelectedFilesModalProps {
  isOpen: boolean
  onClose: () => void
  selectedFiles: AudioLibraryItem[]
  onUpdate: () => void
}

const AUDIO_TYPE_CATEGORIES = {
  'Drums': ['Kick', 'Snare', 'Hihat', 'Clap', 'Crash', 'Ride', 'Tom', 'Cymbal', 'Percussion'],
  'Bass': ['Bass', 'Sub', '808'],
  'Melodic': ['Melody', 'Lead', 'Pad', 'Chord', 'Arp'],
  'Loops': ['Melody Loop', 'Piano Loop', '808 Loop', 'Drum Loop', 'Snare Loop', 'Kick Loop', 'Hihat Loop', 'Clap Loop', 'Crash Loop', 'Ride Loop', 'Tom Loop', 'Bass Loop', 'Vocal Loop', 'Guitar Loop', 'Synth Loop', 'Percussion Loop', 'Lead Loop', 'Pad Loop', 'Arp Loop', 'Chord Loop', 'FX Loop', 'Ambient Loop', 'Break', 'Fill', 'Transition', 'Other'],
  'Effects': ['FX', 'Vocal', 'Sample'],
  'Technical': ['MIDI', 'Patch', 'Preset'],
  'Other': ['Other']
}

const MUSICAL_KEYS = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
  'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm'
]

const MASS_EDIT_FIELDS = [
  { value: 'bpm', label: 'BPM' },
  { value: 'key', label: 'Key' },
  { value: 'audio_type', label: 'Audio Type' },
  { value: 'genre', label: 'Genre' },
  { value: 'subgenre', label: 'Subgenre' },
  { value: 'tags', label: 'Tags' },
]

export function MassEditSelectedFilesModal({
  isOpen,
  onClose,
  selectedFiles,
  onUpdate
}: MassEditSelectedFilesModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [massEditValues, setMassEditValues] = useState({
    bpm: '',
    key: '',
    audio_type: '',
    genre: '',
    subgenre: '',
    tags: ''
  })
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set())
  const [genres, setGenres] = useState<any[]>([])
  const [subgenres, setSubgenres] = useState<string[]>([])

  // Load genres on mount
  useEffect(() => {
    loadGenres()
  }, [])

  const loadGenres = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let query = supabase
        .from('genres')
        .select('*')
        .order('name')

      if (user) {
        query = query.or(`user_id.eq.${user.id},is_public.eq.true,user_id.is.null`)
      } else {
        query = query.or(`is_public.eq.true,user_id.is.null`)
      }

      const { data, error } = await query
      if (error) {
        console.error('Error loading genres:', error)
        return
      }

      setGenres(data || [])
    } catch (error) {
      console.error('Error loading genres:', error)
    }
  }

  const loadSubgenresForGenre = async (genreName: string) => {
    try {
      const { data, error } = await supabase
        .from('genre_subgenres')
        .select('subgenre')
        .eq('genre', genreName)
        .order('subgenre')

      if (error) {
        console.error('Error loading subgenres:', error)
        return
      }

      setSubgenres(data?.map(item => item.subgenre) || [])
    } catch (error) {
      console.error('Error loading subgenres:', error)
    }
  }

  const handleFieldToggle = (field: string) => {
    const newSelected = new Set(selectedFields)
    if (newSelected.has(field)) {
      newSelected.delete(field)
    } else {
      newSelected.add(field)
    }
    setSelectedFields(newSelected)
  }

  const handleMassEditValueChange = (field: string, value: string) => {
    setMassEditValues(prev => ({
      ...prev,
      [field]: value
    }))

    // Auto-load subgenres when genre changes
    if (field === 'genre') {
      loadSubgenresForGenre(value)
    }
  }

  const applyMassEdit = async () => {
    if (selectedFields.size === 0) {
      alert('Please select at least one field to edit')
      return
    }

    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to edit files')
        return
      }

      let successCount = 0
      let errorCount = 0

      for (const file of selectedFiles) {
        const updates: any = {}

        // Only update selected fields
        if (selectedFields.has('bpm') && massEditValues.bpm.trim()) {
          updates.bpm = parseInt(massEditValues.bpm.trim())
        }
        if (selectedFields.has('key') && massEditValues.key.trim()) {
          updates.key = massEditValues.key.trim()
        }
        if (selectedFields.has('audio_type') && massEditValues.audio_type.trim()) {
          updates.audio_type = massEditValues.audio_type.trim()
        }
        if (selectedFields.has('genre') && massEditValues.genre.trim()) {
          updates.genre = massEditValues.genre.trim()
        }
        if (selectedFields.has('subgenre') && massEditValues.subgenre.trim()) {
          updates.subgenre = massEditValues.subgenre.trim()
        }
        if (selectedFields.has('tags') && massEditValues.tags.trim()) {
          // Parse tags from comma-separated string
          const tags = massEditValues.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
          updates.tags = tags
        }

        if (Object.keys(updates).length > 0) {
          const { error } = await supabase
            .from('audio_library_items')
            .update(updates)
            .eq('id', file.id)
            .eq('user_id', user.id)

          if (error) {
            console.error(`Error updating file ${file.name}:`, error)
            errorCount++
          } else {
            successCount++
          }
        }
      }

      if (successCount > 0) {
        alert(`Successfully updated ${successCount} files${errorCount > 0 ? ` (${errorCount} errors)` : ''}`)
        onUpdate()
        onClose()
      } else {
        alert('No files were updated')
      }
    } catch (error) {
      console.error('Error in mass edit:', error)
      alert('Error updating files')
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setMassEditValues({
      bpm: '',
      key: '',
      audio_type: '',
      genre: '',
      subgenre: '',
      tags: ''
    })
    setSelectedFields(new Set())
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">
            Mass Edit Selected Files
          </DialogTitle>
          <div className="text-gray-400 text-sm">
            Editing {selectedFiles.length} selected files
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Field Selection */}
          <div>
            <Label className="text-white font-medium mb-3 block">Select Fields to Edit:</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {MASS_EDIT_FIELDS.map((field) => (
                <Button
                  key={field.value}
                  variant={selectedFields.has(field.value) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFieldToggle(field.value)}
                  className={`justify-start ${
                    selectedFields.has(field.value)
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  {selectedFields.has(field.value) && <CheckCircle2 className="w-4 h-4 mr-2" />}
                  {field.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Edit Values */}
          {selectedFields.size > 0 && (
            <div className="space-y-4">
              <Label className="text-white font-medium">Edit Values:</Label>
              
              {selectedFields.has('bpm') && (
                <div>
                  <Label htmlFor="mass-bpm" className="text-white">BPM</Label>
                  <Input
                    id="mass-bpm"
                    type="number"
                    placeholder="e.g., 140"
                    value={massEditValues.bpm}
                    onChange={(e) => handleMassEditValueChange('bpm', e.target.value)}
                    className="bg-[#2a2a2a] border-gray-600 text-white"
                  />
                </div>
              )}

              {selectedFields.has('key') && (
                <div>
                  <Label htmlFor="mass-key" className="text-white">Key</Label>
                  <Select value={massEditValues.key} onValueChange={(value) => handleMassEditValueChange('key', value)}>
                    <SelectTrigger className="bg-[#2a2a2a] border-gray-600 text-white">
                      <SelectValue placeholder="Select key" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#2a2a2a] border-gray-600">
                      {MUSICAL_KEYS.map((key) => (
                        <SelectItem key={key} value={key} className="text-white hover:bg-gray-700">
                          {key}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedFields.has('audio_type') && (
                <div>
                  <Label htmlFor="mass-audio-type" className="text-white">Audio Type</Label>
                  <Select value={massEditValues.audio_type} onValueChange={(value) => handleMassEditValueChange('audio_type', value)}>
                    <SelectTrigger className="bg-[#2a2a2a] border-gray-600 text-white">
                      <SelectValue placeholder="Select audio type" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#2a2a2a] border-gray-600 max-h-60">
                      {Object.entries(AUDIO_TYPE_CATEGORIES).map(([category, types]) => (
                        <div key={category}>
                          <div className="px-2 py-1 text-xs font-medium text-gray-400 bg-gray-800">
                            {category}
                          </div>
                          {types.map((type) => (
                            <SelectItem key={type} value={type} className="text-white hover:bg-gray-700">
                              {type}
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedFields.has('genre') && (
                <div>
                  <Label htmlFor="mass-genre" className="text-white">Genre</Label>
                  <Select value={massEditValues.genre} onValueChange={(value) => handleMassEditValueChange('genre', value)}>
                    <SelectTrigger className="bg-[#2a2a2a] border-gray-600 text-white">
                      <SelectValue placeholder="Select genre" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#2a2a2a] border-gray-600">
                      {genres.map((genre) => (
                        <SelectItem key={genre.id} value={genre.name} className="text-white hover:bg-gray-700">
                          {genre.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedFields.has('subgenre') && (
                <div>
                  <Label htmlFor="mass-subgenre" className="text-white">Subgenre</Label>
                  <Select value={massEditValues.subgenre} onValueChange={(value) => handleMassEditValueChange('subgenre', value)}>
                    <SelectTrigger className="bg-[#2a2a2a] border-gray-600 text-white">
                      <SelectValue placeholder="Select subgenre" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#2a2a2a] border-gray-600">
                      {subgenres.map((subgenre) => (
                        <SelectItem key={subgenre} value={subgenre} className="text-white hover:bg-gray-700">
                          {subgenre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedFields.has('tags') && (
                <div>
                  <Label htmlFor="mass-tags" className="text-white">Tags</Label>
                  <Input
                    id="mass-tags"
                    placeholder="comma-separated, e.g., trap, dark, aggressive, 808"
                    value={massEditValues.tags}
                    onChange={(e) => handleMassEditValueChange('tags', e.target.value)}
                    className="bg-[#2a2a2a] border-gray-600 text-white"
                  />
                </div>
              )}
            </div>
          )}

          {/* Selected Files Preview */}
          <div>
            <Label className="text-white font-medium mb-3 block">Selected Files ({selectedFiles.length}):</Label>
            <div className="max-h-40 overflow-y-auto bg-[#2a2a2a] rounded border border-gray-600 p-3">
              {selectedFiles.map((file) => (
                <div key={file.id} className="text-sm text-gray-300 py-1 border-b border-gray-700 last:border-b-0">
                  {file.name}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={resetForm} disabled={isLoading}>
            Reset
          </Button>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={applyMassEdit}
            disabled={isLoading || selectedFields.size === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? 'Updating...' : `Update ${selectedFiles.length} Files`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 