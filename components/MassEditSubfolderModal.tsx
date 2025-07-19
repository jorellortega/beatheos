import React, { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Badge } from './ui/badge'
import { X, Plus, Music, Drum, Piano, FileAudio, FileMusic, File } from 'lucide-react'
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

interface MassEditSubfolderModalProps {
  isOpen: boolean
  onClose: () => void
  pack: AudioPack
  subfolder: AudioSubfolder
  audioItems: AudioLibraryItem[]
  onUpdate: () => void
}

  const AUDIO_TYPE_CATEGORIES = {
    'Drums': ['Kick', 'Snare', 'Hihat', 'Clap', 'Crash', 'Ride', 'Tom', 'Cymbal', 'Percussion'],
    'Bass': ['Bass', 'Sub', '808'],
    'Melodic': ['Melody', 'Lead', 'Pad', 'Chord', 'Arp'],
    'Loops': ['Melody Loop', 'Piano Loop', '808 Loop', 'Drum Loop', 'Snare Loop', 'Kick Loop', 'Hihat Loop', 'Clap Loop', 'Crash Loop', 'Ride Loop', 'Tom Loop', 'Bass Loop', 'Vocal Loop', 'Guitar Loop', 'Synth Loop', 'Lead Loop', 'Pad Loop', 'Arp Loop', 'Chord Loop', 'FX Loop', 'Ambient Loop', 'Break', 'Fill', 'Transition', 'Other'],
    'Effects': ['FX', 'Vocal', 'Sample'],
    'Technical': ['MIDI', 'Patch', 'Preset'],
    'Other': ['Other']
  }

const MUSICAL_KEYS = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
  'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm'
]

const TYPE_ICONS = {
  midi: Piano,
  soundkit: Drum,
  loop: Music,
  patch: Music,
  sample: FileAudio,
  clip: FileMusic,
  other: File
}

const MASS_EDIT_FIELDS = [
  { value: 'type', label: 'Type' },
  { value: 'bpm', label: 'BPM' },
  { value: 'key', label: 'Key' },
  { value: 'audio_type', label: 'Audio Type' },
  { value: 'tags', label: 'Tags' },
]

export function MassEditSubfolderModal({
  isOpen,
  onClose,
  pack,
  subfolder,
  audioItems,
  onUpdate
}: MassEditSubfolderModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1: Which field to edit
  const [selectedField, setSelectedField] = useState<string>('type')
  const [editValue, setEditValue] = useState<any>('')
  const [editTags, setEditTags] = useState<string>('')
  const [editingItems, setEditingItems] = useState<{ [key: string]: Partial<AudioLibraryItem> }>({})
  const [selectedAudioCategory, setSelectedAudioCategory] = useState<string>('Drums')
  const firstFieldBtn = useRef<HTMLButtonElement>(null)
  
  // Progress tracking for mass updates
  const [updateProgress, setUpdateProgress] = useState<{
    isUpdating: boolean
    currentIndex: number
    totalFiles: number
    currentFile: string
    completedFiles: string[]
    failedFiles: string[]
  }>({
    isUpdating: false,
    currentIndex: 0,
    totalFiles: 0,
    currentFile: '',
    completedFiles: [],
    failedFiles: []
  })

  // Filter items for this specific subfolder
  const subfolderItems = audioItems.filter(
    item => item.pack_id === pack.id && item.subfolder === subfolder.name
  )

  useEffect(() => {
    if (isOpen) {
      setSelectedField('type')
      setEditValue('')
      setEditTags('')
      setEditingItems({})
      setError(null)
      setTimeout(() => {
        firstFieldBtn.current?.focus()
      }, 100)
    }
  }, [isOpen])

  // Mass edit apply
  const applyMassEdit = async () => {
    if (!selectedField || subfolderItems.length === 0) return
    setLoading(true)
    setError(null)
    
    // Initialize progress tracking
    setUpdateProgress({
      isUpdating: true,
      currentIndex: 0,
      totalFiles: subfolderItems.length,
      currentFile: '',
      completedFiles: [],
      failedFiles: []
    })
    
    try {
      // Get current user for RLS
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Update each item individually to avoid null constraint issues
      for (let i = 0; i < subfolderItems.length; i++) {
        const item = subfolderItems[i]
        
        // Update progress
        setUpdateProgress(prev => ({
          ...prev,
          currentIndex: i + 1,
          currentFile: item.name
        }))
        
        const updateData: any = {}
        
        if (selectedField === 'tags') {
          const tags = editTags.split(',').map(tag => tag.trim()).filter(tag => tag)
          updateData.tags = tags
        } else if (selectedField === 'bpm') {
          updateData.bpm = parseInt(editValue)
        } else {
          updateData[selectedField] = editValue
        }
        
        const { error: updateError } = await supabase
          .from('audio_library_items')
          .update(updateData)
          .eq('id', item.id)
          .eq('user_id', user.id)
        
        if (updateError) {
          // Track failed files
          setUpdateProgress(prev => ({
            ...prev,
            failedFiles: [...prev.failedFiles, item.name]
          }))
          throw updateError
        } else {
          // Track completed files
          setUpdateProgress(prev => ({
            ...prev,
            completedFiles: [...prev.completedFiles, item.name]
          }))
        }
        
        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      setSelectedField('type')
      setEditValue('')
      setEditTags('')
      onUpdate()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to update audio files')
    } finally {
      setLoading(false)
      setUpdateProgress({
        isUpdating: false,
        currentIndex: 0,
        totalFiles: 0,
        currentFile: '',
        completedFiles: [],
        failedFiles: []
      })
    }
  }

  // Update individual item
  const updateIndividualItem = async (itemId: string, updates: Partial<AudioLibraryItem>) => {
    setLoading(true)
    setError(null)
    
    try {
      // Get current user for RLS
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { error: updateError } = await supabase
        .from('audio_library_items')
        .update({ ...updates, user_id: user.id })
        .eq('id', itemId)
      
      if (updateError) {
        throw updateError
      }
      
      // Remove from editing state
      setEditingItems(prev => {
        const newState = { ...prev }
        delete newState[itemId]
        return newState
      })
      
      // Notify parent to refresh data
      onUpdate()
      
    } catch (err: any) {
      setError(err.message || 'Failed to update audio file')
    } finally {
      setLoading(false)
    }
  }

  // Start editing an individual item
  const startEditingItem = (item: AudioLibraryItem) => {
    setEditingItems(prev => ({
      ...prev,
      [item.id]: {
        type: item.type || 'other',
        bpm: item.bpm || undefined,
        key: item.key || 'C',
        audio_type: item.audio_type || 'other',
        tags: item.tags || []
      }
    }))
  }

  // Cancel editing an individual item
  const cancelEditingItem = (itemId: string) => {
    setEditingItems(prev => {
      const newState = { ...prev }
      delete newState[itemId]
      return newState
    })
  }

  // Update editing state for an individual item
  const updateEditingItem = (itemId: string, field: string, value: any) => {
    setEditingItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }))
  }

  // Add tag to individual item
  const addTagToItem = (itemId: string, tag: string) => {
    const currentTags = editingItems[itemId]?.tags || []
    if (!currentTags.includes(tag) && tag.trim()) {
      updateEditingItem(itemId, 'tags', [...currentTags, tag.trim()])
    }
  }

  // Remove tag from individual item
  const removeTagFromItem = (itemId: string, tagToRemove: string) => {
    const currentTags = editingItems[itemId]?.tags || []
    updateEditingItem(itemId, 'tags', currentTags.filter(tag => tag !== tagToRemove))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: subfolder.color + '20', border: `1px solid ${subfolder.color}` }}
            >
              <File className="h-3 w-3" style={{ color: subfolder.color }} />
            </div>
            Mass Edit: {subfolder.name}
            <span className="text-sm text-gray-500">({subfolderItems.length} files)</span>
          </DialogTitle>
        </DialogHeader>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}
        
        <div className="space-y-4">
          {/* Mass Edit Section */}
          <div className="p-0 rounded-lg bg-transparent">
            <h3 className="font-semibold mb-3 text-gray-100 text-base">Mass Edit</h3>
            {/* Step 1: Show all fields as buttons */}
            <div className="flex flex-wrap gap-2 mb-3">
              {MASS_EDIT_FIELDS.map((f, i) => (
                <button
                  key={f.value}
                  ref={i === 0 ? firstFieldBtn : undefined}
                  className={`px-3 py-1 rounded border text-sm font-medium transition-colors ${selectedField === f.value ? 'bg-black text-white border-black' : 'bg-zinc-900 text-white border-gray-700 hover:bg-zinc-800'}`}
                  onClick={() => setSelectedField(f.value)}
                  type="button"
                >
                  {f.label}
                </button>
              ))}
            </div>
            {/* Step 2: Show input for selected field */}
            {selectedField === 'type' && (
              <div className="mb-3">
                <Label>Type</Label>
                <Select value={editValue} onValueChange={setEditValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="midi">MIDI - MIDI files (.mid)</SelectItem>
                    <SelectItem value="soundkit">Sound Kit - Collections of samples</SelectItem>
                    <SelectItem value="loop">Loop - Looped audio segments</SelectItem>
                    <SelectItem value="patch">Patch - Synthesizer patches</SelectItem>
                    <SelectItem value="sample">Sample - Individual audio samples</SelectItem>
                    <SelectItem value="clip">Clip - Audio clips</SelectItem>
                    <SelectItem value="other">Other - Miscellaneous files</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {selectedField === 'bpm' && (
              <div className="mb-3">
                <Label>BPM</Label>
                <Input
                  type="number"
                  placeholder="e.g., 140"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                />
              </div>
            )}
            {selectedField === 'key' && (
              <div className="mb-3">
                <Label>Key</Label>
                <Select value={editValue} onValueChange={setEditValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select key..." />
                  </SelectTrigger>
                  <SelectContent>
                    {MUSICAL_KEYS.map(key => (
                      <SelectItem key={key} value={key}>{key}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {selectedField === 'audio_type' && (
              <div className="mb-3">
                <Label>Audio Type</Label>
                
                {/* Category Tabs */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {Object.keys(AUDIO_TYPE_CATEGORIES).map((category) => (
                    <button
                      key={category}
                      type="button"
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        selectedAudioCategory === category
                          ? 'bg-yellow-500 text-black'
                          : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
                      }`}
                      onClick={() => setSelectedAudioCategory(category)}
                    >
                      {category}
                    </button>
                  ))}
                </div>
                
                {/* Audio Type Options */}
                <div className="grid grid-cols-3 gap-2">
                  {AUDIO_TYPE_CATEGORIES[selectedAudioCategory as keyof typeof AUDIO_TYPE_CATEGORIES]?.map((type: string) => (
                    <button
                      key={type}
                      type="button"
                      className={`p-2 rounded text-sm transition-colors ${
                        editValue === type
                          ? 'bg-yellow-500 text-black'
                          : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
                      }`}
                      onClick={() => setEditValue(type)}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {selectedField === 'tags' && (
              <div className="mb-3">
                <Label>Tags (comma-separated)</Label>
                <Input
                  placeholder="e.g., trap, dark, aggressive"
                  value={editTags}
                  onChange={e => setEditTags(e.target.value)}
                />
              </div>
            )}
            {/* Progress indicator */}
            {updateProgress.isUpdating && (
              <div className="mb-3 p-3 bg-yellow-900 border border-yellow-500 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-black">
                    Updating files... ({updateProgress.currentIndex}/{updateProgress.totalFiles})
                  </span>
                  <span className="text-sm text-black">
                    {Math.round((updateProgress.currentIndex / updateProgress.totalFiles) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-yellow-800 rounded-full h-2">
                  <div 
                    className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(updateProgress.currentIndex / updateProgress.totalFiles) * 100}%` }}
                  ></div>
                </div>
                {updateProgress.currentFile && (
                  <p className="text-xs text-black mt-1">
                    Currently updating: {updateProgress.currentFile}
                  </p>
                )}
                {updateProgress.completedFiles.length > 0 && (
                  <p className="text-xs text-green-700 mt-1">
                    ✅ Completed: {updateProgress.completedFiles.length} files
                  </p>
                )}
                {updateProgress.failedFiles.length > 0 && (
                  <p className="text-xs text-red-700 mt-1">
                    ❌ Failed: {updateProgress.failedFiles.length} files
                  </p>
                )}
              </div>
            )}
            
            {/* Apply button only if a field is selected and value is set */}
            {selectedField && ((selectedField !== 'tags' && editValue) || (selectedField === 'tags' && editTags)) && !updateProgress.isUpdating && (
              <Button 
                onClick={applyMassEdit} 
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Updating...' : `Apply to All ${subfolderItems.length} Files`}
              </Button>
            )}
          </div>
          
          {/* Individual Files Section */}
          <div>
            <h3 className="font-semibold mb-4 text-gray-100">Individual Files</h3>
            <div className="space-y-3">
              {subfolderItems.map(item => {
                const isEditing = editingItems[item.id]
                const IconComponent = TYPE_ICONS[item.type as keyof typeof TYPE_ICONS] || File
                
                return (
                  <div key={item.id} className="border rounded-lg p-3">
                    {!isEditing ? (
                      // Display mode
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                            <IconComponent className="h-4 w-4 text-gray-400" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-gray-500 flex gap-2">
                              {item.type && <span>Type: {item.type}</span>}
                              {item.bpm && <span>BPM: {item.bpm}</span>}
                              {item.key && <span>Key: {item.key}</span>}
                              {item.audio_type && <span>Audio: {item.audio_type}</span>}
                            </div>
                            {item.tags && item.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.tags.map((tag, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEditingItem(item)}
                        >
                          Edit
                        </Button>
                      </div>
                    ) : (
                      // Edit mode
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                              <IconComponent className="h-4 w-4 text-gray-400" />
                            </div>
                            <span className="font-medium">{item.name}</span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateIndividualItem(item.id, editingItems[item.id])}
                              disabled={loading}
                            >
                              {loading ? 'Saving...' : 'Save'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => cancelEditingItem(item.id)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Type</Label>
                            <Select 
                              value={editingItems[item.id]?.type || 'other'} 
                              onValueChange={(value) => updateEditingItem(item.id, 'type', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="midi">MIDI</SelectItem>
                                <SelectItem value="soundkit">Sound Kit</SelectItem>
                                <SelectItem value="loop">Loop</SelectItem>
                                <SelectItem value="patch">Patch</SelectItem>
                                <SelectItem value="sample">Sample</SelectItem>
                                <SelectItem value="clip">Clip</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label>BPM</Label>
                            <Input
                              type="number"
                              value={editingItems[item.id]?.bpm || ''}
                              onChange={(e) => updateEditingItem(item.id, 'bpm', e.target.value ? parseInt(e.target.value) : undefined)}
                              placeholder="e.g., 140"
                            />
                          </div>
                          
                          <div>
                            <Label>Key</Label>
                            <Select 
                              value={editingItems[item.id]?.key || 'C'} 
                              onValueChange={(value) => updateEditingItem(item.id, 'key', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select key..." />
                              </SelectTrigger>
                              <SelectContent>
                                {MUSICAL_KEYS.map(key => (
                                  <SelectItem key={key} value={key}>{key}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label>Audio Type</Label>
                            <Select 
                              value={editingItems[item.id]?.audio_type || 'other'} 
                              onValueChange={(value) => updateEditingItem(item.id, 'audio_type', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select audio type..." />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.values(AUDIO_TYPE_CATEGORIES).flat().map((type: string) => (
                                  <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div>
                          <Label>Tags</Label>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {(editingItems[item.id]?.tags || []).map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                                <button
                                  onClick={() => removeTagFromItem(item.id, tag)}
                                  className="ml-1 hover:text-red-500"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Add tag..."
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  const input = e.target as HTMLInputElement
                                  addTagToItem(item.id, input.value)
                                  input.value = ''
                                }
                              }}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const input = document.querySelector(`input[placeholder="Add tag..."]`) as HTMLInputElement
                                if (input) {
                                  addTagToItem(item.id, input.value)
                                  input.value = ''
                                }
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 