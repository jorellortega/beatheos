"use client"

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { BeatRating } from '@/components/beats/BeatRating'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import { Search } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface Beat {
  id: string
  title: string
  plays: number
  average_rating?: number
  total_ratings?: number
}

interface RatingData {
  averageRating: number
  totalRatings: number
}

export default function BeatRatingAdminPage() {
  const { user } = useAuth();
  const [beats, setBeats] = useState<Beat[]>([])
  const [ratings, setRatings] = useState<Record<string, RatingData>>({})
  const [selected, setSelected] = useState<string[]>([])
  const [editId, setEditId] = useState<string | null>(null)
  const [editPlays, setEditPlays] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'title' | 'rating'>('title')
  const [showHighRatings, setShowHighRatings] = useState(false)
  const [bulkAction, setBulkAction] = useState<'' | 'edit_plays' | 'edit_name'>('')
  const [bulkValue, setBulkValue] = useState('')
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)

  useEffect(() => {
    async function fetchBeats() {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from('beats')
        .select('id, title, play_count, average_rating, total_ratings')
      if (error) {
        setError('Error fetching beats')
        setBeats([])
        setLoading(false)
        return
      }
      setBeats((data || []).map((b: any) => ({
        id: b.id,
        title: b.title,
        plays: b.play_count ?? 0,
        average_rating: b.average_rating ?? 0,
        total_ratings: b.total_ratings ?? 0
      })))
      setLoading(false)
    }
    fetchBeats()
  }, [])

  useEffect(() => {
    async function fetchRatings() {
      const newRatings: Record<string, RatingData> = {}
      await Promise.all(
        beats.map(async (beat) => {
          try {
            const res = await fetch(`/api/beats/${beat.id}/rate`)
            if (res.ok) {
              const data = await res.json()
              newRatings[beat.id] = {
                averageRating: data.averageRating,
                totalRatings: data.totalRatings
              }
            } else {
              newRatings[beat.id] = { averageRating: 0, totalRatings: 0 }
            }
          } catch {
            newRatings[beat.id] = { averageRating: 0, totalRatings: 0 }
          }
        })
      )
      setRatings(newRatings)
    }
    if (beats.length > 0) fetchRatings()
  }, [beats])

  const allSelected = selected.length === beats.length && beats.length > 0

  const handleSelect = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }
  const handleSelectAll = () => {
    setSelected(beats.map(b => b.id))
  }
  const handleDeselectAll = () => {
    setSelected([])
  }
  const startEdit = (beat: Beat) => {
    setEditId(beat.id)
    setEditPlays(beat.plays?.toString() ?? '')
  }
  const saveEdit = async (id: string) => {
    const plays = Number(editPlays)
    const { error } = await supabase
      .from('beats')
      .update({ play_count: plays })
      .eq('id', id)
    if (!error) {
      setBeats(beats.map(b => b.id === id ? { ...b, plays } : b))
      setEditId(null)
      setEditPlays('')
    } else {
      alert('Failed to update plays')
    }
  }
  const cancelEdit = () => {
    setEditId(null)
    setEditPlays('')
  }

  const handleBulkAction = (action: 'edit_plays' | 'edit_name') => {
    setBulkAction(action)
    setBulkValue('')
    setBulkDialogOpen(true)
  }
  const handleBulkSave = async () => {
    setBulkLoading(true)
    if (bulkAction === 'edit_plays') {
      const plays = Number(bulkValue)
      const { error } = await supabase
        .from('beats')
        .update({ play_count: plays })
        .in('id', selected)
      if (!error) {
        setBeats(beats.map(b => selected.includes(b.id) ? { ...b, plays } : b))
      }
    } else if (bulkAction === 'edit_name') {
      const { error } = await supabase
        .from('beats')
        .update({ title: bulkValue })
        .in('id', selected)
      if (!error) {
        setBeats(beats.map(b => selected.includes(b.id) ? { ...b, title: bulkValue } : b))
      }
    }
    setBulkLoading(false)
    setBulkDialogOpen(false)
    setBulkAction('')
    setBulkValue('')
  }

  let filteredBeats = beats.filter(beat =>
    beat.title.toLowerCase().includes(search.toLowerCase())
  )
  if (showHighRatings) {
    filteredBeats = filteredBeats.filter(beat => (beat.average_rating ?? 0) >= 3)
  }
  if (sortBy === 'rating') {
    filteredBeats = [...filteredBeats].sort((a, b) => (b.average_rating ?? 0) - (a.average_rating ?? 0))
  } else {
    filteredBeats = [...filteredBeats].sort((a, b) => a.title.localeCompare(b.title))
  }

  if (!user) {
    return <div className="flex items-center justify-center min-h-[300px]">Loading...</div>;
  }
  if (user.role !== 'ceo') {
    return <div className="flex items-center justify-center min-h-[300px] text-red-500 font-bold">Access Denied</div>;
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[300px]">Loading...</div>
  }
  if (error) {
    return <div className="flex items-center justify-center min-h-[300px] text-red-500">{error}</div>
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Beat Ratings & Stats</h1>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 max-w-2xl mx-auto">
        <div className="flex items-center relative flex-1">
          <Input
            type="text"
            placeholder="Search by title..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-secondary text-white focus:bg-accent w-full"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">Sort by:</span>
          <Select value={sortBy} onValueChange={v => setSortBy(v as 'title' | 'rating')}>
            <SelectTrigger className="w-32 bg-secondary text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="rating">Rating</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          className={`bg-yellow-400 hover:bg-yellow-300 text-black font-semibold px-4 py-2 rounded shadow ${showHighRatings ? 'ring-2 ring-yellow-500' : ''}`}
          onClick={() => setShowHighRatings(v => !v)}
        >
          {showHighRatings ? 'Show All' : 'Show High Ratings (3+)'}
        </Button>
      </div>
      <Card className="p-6">
        <div className="flex gap-2 mb-4">
          <Button variant="outline" onClick={handleSelectAll} disabled={allSelected}>Select All</Button>
          <Button variant="outline" onClick={handleDeselectAll} disabled={selected.length === 0}>Deselect All</Button>
          <Select value={bulkAction} onValueChange={v => handleBulkAction(v as 'edit_plays' | 'edit_name')} disabled={selected.length === 0}>
            <SelectTrigger className="w-40 bg-secondary text-white">
              <SelectValue placeholder="Bulk Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="edit_plays">Edit Plays</SelectItem>
              <SelectItem value="edit_name">Edit Name</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{bulkAction === 'edit_plays' ? 'Edit Plays' : 'Edit Name'} for {selected.length} Beats</DialogTitle>
            </DialogHeader>
            <Input
              type={bulkAction === 'edit_plays' ? 'number' : 'text'}
              placeholder={bulkAction === 'edit_plays' ? 'New plays count' : 'New name'}
              value={bulkValue}
              onChange={e => setBulkValue(e.target.value)}
              className="mb-4"
            />
            <Button onClick={handleBulkSave} disabled={bulkLoading || !bulkValue} className="w-full">
              {bulkLoading ? 'Saving...' : 'Save'}
            </Button>
          </DialogContent>
        </Dialog>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left border-separate border-spacing-y-2">
            <thead>
              <tr className="text-gray-400 text-sm">
                <th className="px-2 py-2"><Checkbox checked={allSelected} onCheckedChange={v => v ? handleSelectAll() : handleDeselectAll()} /></th>
                <th className="px-2 py-2">Title</th>
                <th className="px-2 py-2">Rating</th>
                <th className="px-2 py-2">Plays</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBeats.map((beat) => (
                <tr key={beat.id} className="bg-zinc-900 rounded-lg">
                  <td className="px-2 py-2 align-middle">
                    <Checkbox checked={selected.includes(beat.id)} onCheckedChange={() => handleSelect(beat.id)} />
                  </td>
                  <td className="px-2 py-2 font-semibold align-middle">{beat.title}</td>
                  <td className="px-2 py-2 align-middle">
                    <BeatRating
                      beatId={beat.id}
                      initialAverageRating={ratings[beat.id]?.averageRating ?? 0}
                      initialTotalRatings={ratings[beat.id]?.totalRatings ?? 0}
                      compact
                    />
                  </td>
                  <td className="px-2 py-2 align-middle">
                    {editId === beat.id ? (
                      <Input value={editPlays} onChange={e => setEditPlays(e.target.value)} className="w-20" />
                    ) : (
                      beat.plays
                    )}
                  </td>
                  <td className="px-2 py-2 align-middle">
                    {editId === beat.id ? (
                      <>
                        <Button size="sm" variant="default" onClick={() => saveEdit(beat.id)} className="mr-2">Save</Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => startEdit(beat)}>Edit</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
} 