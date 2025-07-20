'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Music, Settings, Save, Plus, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

interface Genre {
  id: string
  name: string
  bpm_range_min: number
  bpm_range_max: number
  default_bpm: number
}

interface Subgenre {
  genre: string
  subgenre: string
  bpm_range_min: number
  bpm_range_max: number
  default_bpm: number
}

export function GenreTempoManager() {
  const [genres, setGenres] = useState<Genre[]>([])
  const [subgenres, setSubgenres] = useState<Subgenre[]>([])
  const [selectedGenre, setSelectedGenre] = useState<string>('')
  const [showAddGenre, setShowAddGenre] = useState(false)
  const [showAddSubgenre, setShowAddSubgenre] = useState(false)
  const [editingGenre, setEditingGenre] = useState<Genre | null>(null)
  const [editingSubgenre, setEditingSubgenre] = useState<Subgenre | null>(null)
  
  // Form states
  const [newGenreName, setNewGenreName] = useState('')
  const [newGenreMinBpm, setNewGenreMinBpm] = useState(80)
  const [newGenreMaxBpm, setNewGenreMaxBpm] = useState(180)
  const [newGenreDefaultBpm, setNewGenreDefaultBpm] = useState(120)
  
  const [newSubgenreName, setNewSubgenreName] = useState('')
  const [newSubgenreMinBpm, setNewSubgenreMinBpm] = useState(80)
  const [newSubgenreMaxBpm, setNewSubgenreMaxBpm] = useState(180)
  const [newSubgenreDefaultBpm, setNewSubgenreDefaultBpm] = useState(120)

  useEffect(() => {
    loadGenres()
    loadSubgenres()
  }, [])

  const loadGenres = async () => {
    try {
      const { data, error } = await supabase
        .from('genres')
        .select('id, name, bpm_range_min, bpm_range_max, default_bpm')
        .order('name')
      
      if (error) throw error
      setGenres(data || [])
    } catch (error) {
      console.error('Error loading genres:', error)
    }
  }

  const loadSubgenres = async () => {
    try {
      const { data, error } = await supabase
        .from('genre_subgenres')
        .select('genre, subgenre, bpm_range_min, bpm_range_max, default_bpm')
        .order('genre, subgenre')
      
      if (error) throw error
      setSubgenres(data || [])
    } catch (error) {
      console.error('Error loading subgenres:', error)
    }
  }

  const handleAddGenre = async () => {
    try {
      const { error } = await supabase
        .from('genres')
        .insert({
          name: newGenreName,
          bpm_range_min: newGenreMinBpm,
          bpm_range_max: newGenreMaxBpm,
          default_bpm: newGenreDefaultBpm
        })
      
      if (error) throw error
      
      setShowAddGenre(false)
      setNewGenreName('')
      setNewGenreMinBpm(80)
      setNewGenreMaxBpm(180)
      setNewGenreDefaultBpm(120)
      loadGenres()
    } catch (error) {
      console.error('Error adding genre:', error)
    }
  }

  const handleAddSubgenre = async () => {
    try {
      const { error } = await supabase
        .from('genre_subgenres')
        .insert({
          genre: selectedGenre,
          subgenre: newSubgenreName,
          bpm_range_min: newSubgenreMinBpm,
          bpm_range_max: newSubgenreMaxBpm,
          default_bpm: newSubgenreDefaultBpm
        })
      
      if (error) throw error
      
      setShowAddSubgenre(false)
      setNewSubgenreName('')
      setNewSubgenreMinBpm(80)
      setNewSubgenreMaxBpm(180)
      setNewSubgenreDefaultBpm(120)
      loadSubgenres()
    } catch (error) {
      console.error('Error adding subgenre:', error)
    }
  }

  const handleUpdateGenre = async (genre: Genre) => {
    try {
      const { error } = await supabase
        .from('genres')
        .update({
          bpm_range_min: genre.bpm_range_min,
          bpm_range_max: genre.bpm_range_max,
          default_bpm: genre.default_bpm
        })
        .eq('id', genre.id)
      
      if (error) throw error
      
      setEditingGenre(null)
      loadGenres()
    } catch (error) {
      console.error('Error updating genre:', error)
    }
  }

  const handleUpdateSubgenre = async (subgenre: Subgenre) => {
    try {
      const { error } = await supabase
        .from('genre_subgenres')
        .update({
          bpm_range_min: subgenre.bpm_range_min,
          bpm_range_max: subgenre.bpm_range_max,
          default_bpm: subgenre.default_bpm
        })
        .eq('genre', subgenre.genre)
        .eq('subgenre', subgenre.subgenre)
      
      if (error) throw error
      
      setEditingSubgenre(null)
      loadSubgenres()
    } catch (error) {
      console.error('Error updating subgenre:', error)
    }
  }

  const handleDeleteGenre = async (genreId: string) => {
    if (!confirm('Are you sure you want to delete this genre?')) return
    
    try {
      const { error } = await supabase
        .from('genres')
        .delete()
        .eq('id', genreId)
      
      if (error) throw error
      loadGenres()
    } catch (error) {
      console.error('Error deleting genre:', error)
    }
  }

  const handleDeleteSubgenre = async (genre: string, subgenre: string) => {
    if (!confirm('Are you sure you want to delete this subgenre?')) return
    
    try {
      const { error } = await supabase
        .from('genre_subgenres')
        .delete()
        .eq('genre', genre)
        .eq('subgenre', subgenre)
      
      if (error) throw error
      loadSubgenres()
    } catch (error) {
      console.error('Error deleting subgenre:', error)
    }
  }

  const filteredSubgenres = subgenres.filter(s => !selectedGenre || s.genre === selectedGenre)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Genre Tempo Manager</h2>
        <Button onClick={() => setShowAddGenre(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Genre
        </Button>
      </div>

      {/* Genres */}
      <Card className="bg-[#1a1a1a] border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Music className="w-5 h-5" />
            Genres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {genres.map((genre) => (
              <div key={genre.id} className="flex items-center gap-4 p-4 bg-[#2a2a2a] rounded-lg">
                <div className="flex-1">
                  <h3 className="text-white font-semibold">{genre.name}</h3>
                  <p className="text-gray-400 text-sm">
                    BPM Range: {genre.bpm_range_min}-{genre.bpm_range_max} | Default: {genre.default_bpm}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingGenre(genre)}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteGenre(genre.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Subgenres */}
      <Card className="bg-[#1a1a1a] border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Music className="w-5 h-5" />
              Subgenres
            </CardTitle>
            <Button onClick={() => setShowAddSubgenre(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Subgenre
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Select value={selectedGenre} onValueChange={setSelectedGenre}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Filter by genre..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Genres</SelectItem>
                {genres.map((genre) => (
                  <SelectItem key={genre.id} value={genre.name}>
                    {genre.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-4">
            {filteredSubgenres.map((subgenre, index) => (
              <div key={index} className="flex items-center gap-4 p-4 bg-[#2a2a2a] rounded-lg">
                <div className="flex-1">
                  <h3 className="text-white font-semibold">{subgenre.subgenre}</h3>
                  <p className="text-gray-400 text-sm">
                    Genre: {subgenre.genre} | BPM Range: {subgenre.bpm_range_min}-{subgenre.bpm_range_max} | Default: {subgenre.default_bpm}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingSubgenre(subgenre)}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteSubgenre(subgenre.genre, subgenre.subgenre)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Genre Dialog */}
      <Dialog open={showAddGenre} onOpenChange={setShowAddGenre}>
        <DialogContent className="bg-[#1a1a1a] border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Add New Genre</DialogTitle>
            <DialogDescription className="text-gray-400">
              Create a new genre with tempo range settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="genre-name" className="text-white">Genre Name</Label>
              <Input
                id="genre-name"
                value={newGenreName}
                onChange={(e) => setNewGenreName(e.target.value)}
                className="bg-[#2a2a2a] border-gray-600 text-white"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="genre-min-bpm" className="text-white">Min BPM</Label>
                <Input
                  id="genre-min-bpm"
                  type="number"
                  value={newGenreMinBpm}
                  onChange={(e) => setNewGenreMinBpm(parseInt(e.target.value))}
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="genre-max-bpm" className="text-white">Max BPM</Label>
                <Input
                  id="genre-max-bpm"
                  type="number"
                  value={newGenreMaxBpm}
                  onChange={(e) => setNewGenreMaxBpm(parseInt(e.target.value))}
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="genre-default-bpm" className="text-white">Default BPM</Label>
                <Input
                  id="genre-default-bpm"
                  type="number"
                  value={newGenreDefaultBpm}
                  onChange={(e) => setNewGenreDefaultBpm(parseInt(e.target.value))}
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddGenre(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddGenre}>
              <Save className="w-4 h-4 mr-2" />
              Add Genre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Subgenre Dialog */}
      <Dialog open={showAddSubgenre} onOpenChange={setShowAddSubgenre}>
        <DialogContent className="bg-[#1a1a1a] border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Add New Subgenre</DialogTitle>
            <DialogDescription className="text-gray-400">
              Create a new subgenre with tempo range settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="subgenre-genre" className="text-white">Parent Genre</Label>
              <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                <SelectTrigger className="bg-[#2a2a2a] border-gray-600 text-white">
                  <SelectValue placeholder="Select a genre..." />
                </SelectTrigger>
                <SelectContent className="bg-[#2a2a2a] border-gray-600">
                  {genres.map((genre) => (
                    <SelectItem key={genre.id} value={genre.name}>
                      {genre.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="subgenre-name" className="text-white">Subgenre Name</Label>
              <Input
                id="subgenre-name"
                value={newSubgenreName}
                onChange={(e) => setNewSubgenreName(e.target.value)}
                className="bg-[#2a2a2a] border-gray-600 text-white"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="subgenre-min-bpm" className="text-white">Min BPM</Label>
                <Input
                  id="subgenre-min-bpm"
                  type="number"
                  value={newSubgenreMinBpm}
                  onChange={(e) => setNewSubgenreMinBpm(parseInt(e.target.value))}
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="subgenre-max-bpm" className="text-white">Max BPM</Label>
                <Input
                  id="subgenre-max-bpm"
                  type="number"
                  value={newSubgenreMaxBpm}
                  onChange={(e) => setNewSubgenreMaxBpm(parseInt(e.target.value))}
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="subgenre-default-bpm" className="text-white">Default BPM</Label>
                <Input
                  id="subgenre-default-bpm"
                  type="number"
                  value={newSubgenreDefaultBpm}
                  onChange={(e) => setNewSubgenreDefaultBpm(parseInt(e.target.value))}
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSubgenre(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSubgenre} disabled={!selectedGenre}>
              <Save className="w-4 h-4 mr-2" />
              Add Subgenre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Genre Dialog */}
      {editingGenre && (
        <Dialog open={!!editingGenre} onOpenChange={() => setEditingGenre(null)}>
          <DialogContent className="bg-[#1a1a1a] border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">Edit Genre: {editingGenre.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="edit-genre-min-bpm" className="text-white">Min BPM</Label>
                  <Input
                    id="edit-genre-min-bpm"
                    type="number"
                    value={editingGenre.bpm_range_min}
                    onChange={(e) => setEditingGenre({...editingGenre, bpm_range_min: parseInt(e.target.value)})}
                    className="bg-[#2a2a2a] border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-genre-max-bpm" className="text-white">Max BPM</Label>
                  <Input
                    id="edit-genre-max-bpm"
                    type="number"
                    value={editingGenre.bpm_range_max}
                    onChange={(e) => setEditingGenre({...editingGenre, bpm_range_max: parseInt(e.target.value)})}
                    className="bg-[#2a2a2a] border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-genre-default-bpm" className="text-white">Default BPM</Label>
                  <Input
                    id="edit-genre-default-bpm"
                    type="number"
                    value={editingGenre.default_bpm}
                    onChange={(e) => setEditingGenre({...editingGenre, default_bpm: parseInt(e.target.value)})}
                    className="bg-[#2a2a2a] border-gray-600 text-white"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingGenre(null)}>
                Cancel
              </Button>
              <Button onClick={() => handleUpdateGenre(editingGenre)}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Subgenre Dialog */}
      {editingSubgenre && (
        <Dialog open={!!editingSubgenre} onOpenChange={() => setEditingSubgenre(null)}>
          <DialogContent className="bg-[#1a1a1a] border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">Edit Subgenre: {editingSubgenre.subgenre}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="edit-subgenre-min-bpm" className="text-white">Min BPM</Label>
                  <Input
                    id="edit-subgenre-min-bpm"
                    type="number"
                    value={editingSubgenre.bpm_range_min}
                    onChange={(e) => setEditingSubgenre({...editingSubgenre, bpm_range_min: parseInt(e.target.value)})}
                    className="bg-[#2a2a2a] border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-subgenre-max-bpm" className="text-white">Max BPM</Label>
                  <Input
                    id="edit-subgenre-max-bpm"
                    type="number"
                    value={editingSubgenre.bpm_range_max}
                    onChange={(e) => setEditingSubgenre({...editingSubgenre, bpm_range_max: parseInt(e.target.value)})}
                    className="bg-[#2a2a2a] border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-subgenre-default-bpm" className="text-white">Default BPM</Label>
                  <Input
                    id="edit-subgenre-default-bpm"
                    type="number"
                    value={editingSubgenre.default_bpm}
                    onChange={(e) => setEditingSubgenre({...editingSubgenre, default_bpm: parseInt(e.target.value)})}
                    className="bg-[#2a2a2a] border-gray-600 text-white"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingSubgenre(null)}>
                Cancel
              </Button>
              <Button onClick={() => handleUpdateSubgenre(editingSubgenre)}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
} 