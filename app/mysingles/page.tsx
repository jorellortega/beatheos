"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Calendar, FileText, Trash2, FileAudio, Play, Pause, Clock, Archive, Edit, Plus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

interface Single {
  id: string
  title: string
  artist: string
  release_date: string
  cover_art_url: string
  audio_url?: string | null
  duration?: string
  description?: string
  session_id?: string | null
  session_name?: string | null
  status?: 'draft' | 'active' | 'paused' | 'scheduled' | 'archived'
}

export default function MySingles() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [singles, setSingles] = useState<Single[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingSingle, setEditingSingle] = useState<Single | null>(null)
  const [playingSingleId, setPlayingSingleId] = useState<string | null>(null)
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    description: '',
    release_date: '',
    audio_url: '',
    duration: ''
  })

  useEffect(() => {
    if (user) {
      loadSingles()
    }
  }, [user])

  const loadSingles = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('singles')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSingles(data || [])
    } catch (error) {
      console.error('Error loading singles:', error)
      toast({
        title: "Error",
        description: "Failed to load singles",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const playSingle = (singleId: string, audioUrl: string) => {
    if (playingSingleId === singleId) {
      // Stop playing
      if (audioRef) {
        audioRef.pause()
        audioRef.currentTime = 0
      }
      setPlayingSingleId(null)
      setAudioRef(null)
    } else {
      // Start playing
      if (audioRef) {
        audioRef.pause()
      }
      const audio = new Audio(audioUrl)
      audio.play()
      setAudioRef(audio)
      setPlayingSingleId(singleId)
      
      audio.onended = () => {
        setPlayingSingleId(null)
        setAudioRef(null)
      }
    }
  }

  const stopSingle = () => {
    if (audioRef) {
      audioRef.pause()
      audioRef.currentTime = 0
    }
    setPlayingSingleId(null)
    setAudioRef(null)
  }

  const openEditDialog = (single: Single) => {
    setEditingSingle(single)
    setFormData({
      title: single.title,
      artist: single.artist,
      description: single.description || '',
      release_date: single.release_date,
      audio_url: single.audio_url || '',
      duration: single.duration || ''
    })
    setShowEditDialog(true)
  }

  const handleCreateSingle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      const { error } = await supabase
        .from('singles')
        .insert({
          ...formData,
          user_id: user.id,
          status: 'draft'
        })

      if (error) throw error

      toast({
        title: "Success",
        description: "Single created successfully"
      })
      
      setShowCreateDialog(false)
      setFormData({
        title: '',
        artist: '',
        description: '',
        release_date: '',
        audio_url: '',
        duration: ''
      })
      loadSingles()
    } catch (error) {
      console.error('Error creating single:', error)
      toast({
        title: "Error",
        description: "Failed to create single",
        variant: "destructive"
      })
    }
  }

  const handleUpdateSingle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSingle) return

    try {
      const { error } = await supabase
        .from('singles')
        .update(formData)
        .eq('id', editingSingle.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Single updated successfully"
      })
      
      setShowEditDialog(false)
      setEditingSingle(null)
      loadSingles()
    } catch (error) {
      console.error('Error updating single:', error)
      toast({
        title: "Error",
        description: "Failed to update single",
        variant: "destructive"
      })
    }
  }

  const handleDeleteSingle = async (singleId: string) => {
    if (!confirm('Are you sure you want to delete this single?')) return

    try {
      const { error } = await supabase
        .from('singles')
        .delete()
        .eq('id', singleId)

      if (error) throw error

      toast({
        title: "Success",
        description: "Single deleted successfully"
      })
      
      loadSingles()
    } catch (error) {
      console.error('Error deleting single:', error)
      toast({
        title: "Error",
        description: "Failed to delete single",
        variant: "destructive"
      })
    }
  }

  const updateSingleStatus = async (singleId: string, newStatus: 'production' | 'draft' | 'distribute' | 'error' | 'published' | 'other') => {
    try {
      const { error } = await supabase
        .from('singles')
        .update({ status: newStatus })
        .eq('id', singleId)

      if (error) throw error

      setSingles(prev => prev.map(single =>
        single.id === singleId ? { ...single, status: newStatus } : single
      ))

      toast({
        title: "Success",
        description: `Single status updated to ${newStatus}`
      })
    } catch (error) {
      console.error('Error updating single status:', error)
      toast({
        title: "Error",
        description: "Failed to update single status",
        variant: "destructive"
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200'
      case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'archived': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading singles...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Singles</h1>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Single
        </Button>
      </div>

      <div className="grid gap-6">
        {singles.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500 mb-4">No singles found.</p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Single
              </Button>
            </CardContent>
          </Card>
        ) : (
          singles.map(single => (
            <Card key={single.id} className="p-6">
              <div className="flex gap-6">
                {single.cover_art_url ? (
                  <img src={single.cover_art_url} alt={single.title} className="w-32 h-32 object-cover rounded-lg" />
                ) : (
                  <img src="/placeholder.jpg" alt="No cover art" className="w-32 h-32 object-cover rounded-lg" />
                )}
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-semibold">{single.title}</h2>
                      <p className="text-gray-500">{single.artist}</p>
                    </div>
                    <div className="flex gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className={`capitalize ${getStatusColor(single.status || 'draft')}`}>
                            {single.status || 'draft'}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => updateSingleStatus(single.id, 'production')}>
                            Production
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateSingleStatus(single.id, 'draft')}>
                            Draft
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateSingleStatus(single.id, 'distribute')}>
                            Distribute
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateSingleStatus(single.id, 'error')}>
                            Error
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateSingleStatus(single.id, 'published')}>
                            Published
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateSingleStatus(single.id, 'other')}>
                            Other
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(single)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteSingle(single.id)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                      {single.audio_url && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => playSingle(single.id, single.audio_url!)}
                        >
                          {playingSingleId === single.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                      <Calendar className="h-4 w-4" />
                      Released: {single.release_date ? new Date(single.release_date).toLocaleDateString() : 'N/A'}
                    </div>
                    {single.duration && (
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                        <Clock className="h-4 w-4" />
                        Duration: {single.duration}
                      </div>
                    )}
                    {single.session_name && (
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                        <FileAudio className="h-4 w-4" />
                        Session: {single.session_name}
                      </div>
                    )}
                    <div className="mt-4">
                      <h3 className="font-medium mb-2">Description</h3>
                      <div className="text-sm text-gray-500">{single.description || 'No description.'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Create Single Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Single</DialogTitle>
            <DialogDescription>
              Add a new single to your library.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSingle}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="artist">Artist</Label>
                <Input
                  id="artist"
                  value={formData.artist}
                  onChange={(e) => setFormData(prev => ({ ...prev, artist: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="release_date">Release Date</Label>
                <Input
                  id="release_date"
                  type="date"
                  value={formData.release_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, release_date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="audio_url">Audio URL</Label>
                <Input
                  id="audio_url"
                  value={formData.audio_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, audio_url: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="duration">Duration</Label>
                <Input
                  id="duration"
                  value={formData.duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                  placeholder="e.g., 3:45"
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Single</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Single Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Single</DialogTitle>
            <DialogDescription>
              Update your single information.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateSingle}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-artist">Artist</Label>
                <Input
                  id="edit-artist"
                  value={formData.artist}
                  onChange={(e) => setFormData(prev => ({ ...prev, artist: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-release_date">Release Date</Label>
                <Input
                  id="edit-release_date"
                  type="date"
                  value={formData.release_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, release_date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-audio_url">Audio URL</Label>
                <Input
                  id="edit-audio_url"
                  value={formData.audio_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, audio_url: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-duration">Duration</Label>
                <Input
                  id="edit-duration"
                  value={formData.duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                  placeholder="e.g., 3:45"
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Single</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
} 