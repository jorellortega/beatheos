'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Play, 
  Square, 
  Edit, 
  Trash2, 
  Save, 
  Copy, 
  Download, 
  Upload, 
  Search,
  Grid,
  List,
  Clock,
  Music,
  Plus
} from 'lucide-react'
import { Track } from '@/hooks/useBeatMaker'

interface SavedPattern {
  id: string
  name: string
  description?: string
  tracks: Track[]
  sequencerData: { [trackId: number]: boolean[] }
  bpm: number
  steps: number
  created_at: string
  updated_at: string
  tags?: string[]
  category?: string
}

function EditPatternsPage() {
  const [patterns, setPatterns] = useState<SavedPattern[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [editingPattern, setEditingPattern] = useState<SavedPattern | null>(null)
  const [isPlaying, setIsPlaying] = useState<string | null>(null)
  const [categories, setCategories] = useState<string[]>()
  useEffect(() => {
    loadPatterns()
  }, [])

  const loadPatterns = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to view patterns')
        return
      }
      const { data, error } = await supabase
        .from('saved_patterns')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) {
        console.error('Error loading patterns:', error)
        return
      }
      setPatterns(data || [])
      const uniqueCategories = [...new Set(data?.map(p => p.category).filter(Boolean) || [])]
      setCategories(uniqueCategories)
    } catch (error) {
      console.error('Error loading patterns:', error)
    } finally {
      setLoading(false)
    }
  }

  const deletePattern = async (patternId: string) => {
    if (!confirm('Are you sure you want to delete this pattern?')) return
    try {
      const { error } = await supabase
        .from('saved_patterns')
        .delete()
        .eq('id', patternId)
      if (error) {
        console.error('Error deleting pattern:', error)
        return
      }
      setPatterns(prev => prev.filter(p => p.id !== patternId))
    } catch (error) {
      console.error('Error deleting pattern:', error)
    }
  }

  const duplicatePattern = async (pattern: SavedPattern) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const newPattern = {
        ...pattern,
        id: undefined,
        name: `${pattern.name} (Copy)`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      const { data, error } = await supabase
        .from('saved_patterns')
        .insert([{
          user_id: user.id,
          name: newPattern.name,
          description: newPattern.description,
          tracks: newPattern.tracks,
          sequencer_data: newPattern.sequencerData,
          bpm: newPattern.bpm,
          steps: newPattern.steps,
          tags: newPattern.tags,
          category: newPattern.category
        }])
        .select()
        .single()
      if (error) {
        console.error('Error duplicating pattern:', error)
        return
      }
      setPatterns(prev => [data, ...prev])
    } catch (error) {
      console.error('Error duplicating pattern:', error)
    }
  }

  const exportPattern = (pattern: SavedPattern) => {
    const dataStr = JSON.stringify(pattern, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${pattern.name}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const importPatterns = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const text = await file.text()
        const pattern = JSON.parse(text)
        const { error } = await supabase
          .from('saved_patterns')
          .insert([{
            user_id: user.id,
            name: pattern.name,
            description: pattern.description,
            tracks: pattern.tracks,
            sequencer_data: pattern.sequencerData,
            bpm: pattern.bpm,
            steps: pattern.steps,
            tags: pattern.tags,
            category: pattern.category
          }])
        if (error) {
          console.error('Error importing pattern:', error)
        }
      }
      loadPatterns()
    } catch (error) {
      console.error('Error importing patterns:', error)
    }
  }

  const importMIDI = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const arrayBuffer = await file.arrayBuffer()
        const dataView = new DataView(arrayBuffer)
        
        // Simple MIDI parsing (basic implementation)
        const pattern = {
          user_id: user.id,
          name: file.name.replace(/\.(mid|midi)$/i, ''),
          description: `Imported from ${file.name}`,
          tracks: [
            {
              id: 1,
              name: 'Imported Track',
              notes: []
            }
          ],
          sequencerData: {
            [1]: []
          },
          bpm: 120, // Default BPM
          steps: 16, // Default steps
          tags: ['MIDI Import'],
          category: 'MIDI'
        }
        
        const { error } = await supabase
          .from('saved_patterns')
          .insert([pattern])
        
        if (error) {
          console.error('Error importing MIDI pattern:', error)
        }
      }
      
      loadPatterns()
    } catch (error) {
      console.error('Error importing MIDI patterns:', error)
    }
  }

  const filteredPatterns = patterns.filter(pattern => {
    const matchesSearch = pattern.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pattern.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pattern.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = selectedCategory === 'all' || pattern.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const PatternCard = ({ pattern }: { pattern: SavedPattern }) => (
    <Card className="bg-[#141414] hover:border-gray-600 transition-colors">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-lg">{pattern.name}</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPlaying(isPlaying === pattern.id ? null : pattern.id)}
              className="text-green-400 hover:text-green-300"
            >
              {isPlaying === pattern.id ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingPattern(pattern)}
              className="text-blue-400 hover:text-blue-300"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => duplicatePattern(pattern)}
              className="text-purple-400 hover:text-purple-300"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => exportPattern(pattern)}
              className="text-yellow-400 hover:text-yellow-300"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deletePattern(pattern.id)}
              className="text-red-400 hover:text-red-300"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {pattern.description && (
          <p className="text-gray-400 text-sm">{pattern.description}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-gray-300">{pattern.bpm} BPM</span>
            </div>
            <div className="flex items-center gap-1">
              <Music className="w-4 h-4 text-gray-400" />
              <span className="text-gray-300">{pattern.steps} Steps</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-300">{pattern.tracks.length} Tracks</span>
            </div>
          </div>
          {pattern.tags && pattern.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {pattern.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          {pattern.category && (
            <Badge variant="outline" className="text-xs">
              {pattern.category}
            </Badge>
          )}
          <div className="text-xs text-gray-500">
            Created: {new Date(pattern.created_at).toLocaleDateString()}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-white">Loading patterns...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Pattern Library</h1>
          <p className="text-gray-400">Manage your saved beat patterns</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            <input
              type="file"
              multiple
              accept=".json"
              onChange={importPatterns}
              className="hidden"
              id="import-patterns"
            />
            <label htmlFor="import-patterns" className="cursor-pointer">
              Import JSON
            </label>
          </Button>
          <Button variant="outline" size="sm">
            <Music className="w-4 h-4 mr-2" />
            <input
              type="file"
              accept=".mid,.midi"
              onChange={importMIDI}
              className="hidden"
              id="import-midi"
            />
            <label htmlFor="import-midi" className="cursor-pointer">
              Import MIDI
            </label>
          </Button>
          <Button variant="default" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            New Pattern
          </Button>
        </div>
      </div>
      {/* Filters and Search */}
      <Card className="!bg-[#141414] border border-gray-700 rounded-lg">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search patterns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-[#1a1a1a] border border-gray-600"
                />
              </div>
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-[#1a1a1a] border border-gray-600 rounded px-3 py-2 text-white"
            >
              <option value="all">All Categories</option>
              {categories?.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <div className="flex gap-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Patterns Grid/List */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'space-y-4'}>
        {filteredPatterns.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Music className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No patterns found</h3>
            <p className="text-gray-400">
              {searchTerm || selectedCategory !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Create your first pattern in the Beat Maker'}
            </p>
          </div>
        ) : (
          filteredPatterns.map(pattern => (
            <PatternCard key={pattern.id} pattern={pattern} />
          ))
        )}
      </div>
      {/* Edit Pattern Modal would go here */}
      {editingPattern && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <Card className="w-[90vw] h-[80vh] bg-[#141414] border border-gray-700 rounded-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Edit Pattern: {editingPattern.name}</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingPattern(null)}
                >
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Pattern editing form would go here */}
              <p className="text-gray-400">editing interface coming soon...</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default EditPatternsPage; 