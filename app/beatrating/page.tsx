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
import { toast } from '@/components/ui/use-toast'

interface Beat {
  id: string
  title: string
  plays: number
  average_rating?: number
  total_ratings?: number
  price?: number | null
  price_lease?: number | null
  price_premium_lease?: number | null
  price_exclusive?: number | null
  price_buyout?: number | null
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
  const [showNoPrice, setShowNoPrice] = useState(false)
  const [showNullLicensing, setShowNullLicensing] = useState(false)
  const [bulkAction, setBulkAction] = useState<'' | 'edit_plays' | 'edit_name' | 'randomize_plays' | 'update_licensing'>('')
  const [bulkValue, setBulkValue] = useState('')
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [editPrice, setEditPrice] = useState<string | null>(null)
  const [editPriceValue, setEditPriceValue] = useState('')
  const [editLicensingPrice, setEditLicensingPrice] = useState<string | null>(null)
  const [editLicensingPriceValue, setEditLicensingPriceValue] = useState('')

  useEffect(() => {
    async function fetchBeats() {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from('beats')
        .select('id, title, play_count, average_rating, total_ratings, price, price_lease, price_premium_lease, price_exclusive, price_buyout')
        .limit(1000)
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
        total_ratings: b.total_ratings ?? 0,
        price: b.price !== undefined && b.price !== null ? Number(b.price) : null,
        price_lease: b.price_lease !== undefined && b.price_lease !== null ? Number(b.price_lease) : null,
        price_premium_lease: b.price_premium_lease !== undefined && b.price_premium_lease !== null ? Number(b.price_premium_lease) : null,
        price_exclusive: b.price_exclusive !== undefined && b.price_exclusive !== null ? Number(b.price_exclusive) : null,
        price_buyout: b.price_buyout !== undefined && b.price_buyout !== null ? Number(b.price_buyout) : null
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

  const handleBulkAction = (action: 'edit_plays' | 'edit_name' | 'randomize_plays' | 'update_licensing') => {
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
    } else if (bulkAction === 'randomize_plays') {
      const [min, max] = bulkValue.split(',').map(Number)
      if (isNaN(min) || isNaN(max) || min > max) {
        alert('Please enter valid min and max values separated by a comma.')
        setBulkLoading(false)
        return
      }
      // Generate a random play count for each selected beat
      const updates = await Promise.all(selected.map(async (id) => {
        const randomPlays = Math.floor(Math.random() * (max - min + 1)) + min
        const { error } = await supabase
          .from('beats')
          .update({ play_count: randomPlays })
          .eq('id', id)
        return { id, randomPlays, error }
      }))
      // Update local state for each beat
      setBeats(beats.map(b => {
        const update = updates.find(u => u.id === b.id)
        return update ? { ...b, plays: update.randomPlays } : b
      }))
    } else if (bulkAction === 'update_licensing') {
      // Default licensing prices
      const defaultLicensing = {
        price_lease: 20.00,
        price_premium_lease: 100.00,
        price_exclusive: 300.00,
        price_buyout: 1000.00
      }
      const defaultLicensingJson = {
        'template-lease': 20.00,
        'template-premium-lease': 100.00,
        'template-exclusive': 300.00,
        'template-buy-out': 1000.00
      }
      // Update each selected beat
      const updates = await Promise.all(selected.map(async (id) => {
        const { error } = await supabase
          .from('beats')
          .update({ ...defaultLicensing, licensing: defaultLicensingJson })
          .eq('id', id)
        return { id, error }
      }))
      // Update local state
      setBeats(beats.map(b => {
        if (selected.includes(b.id)) {
          return {
            ...b,
            ...defaultLicensing,
            licensing: defaultLicensingJson
          }
        }
        return b
      }))
      // Show success message
      toast({
        title: "Success",
        description: `Updated licensing prices for ${selected.length} beats`,
      })
    }
    setBulkLoading(false)
    setBulkDialogOpen(false)
    setBulkAction('')
    setBulkValue('')
  }

  const startEditPrice = (beatId: string, currentPrice: number | null) => {
    setEditPrice(beatId)
    setEditPriceValue(currentPrice?.toString() || '')
  }
  const startEditLicensingPrice = (beatId: string, currentPrice: number | null) => {
    setEditLicensingPrice(beatId)
    setEditLicensingPriceValue(currentPrice?.toString() || '')
  }
  const savePrice = async (beatId: string) => {
    const price = Number(editPriceValue)
    const { error } = await supabase
      .from('beats')
      .update({ price })
      .eq('id', beatId)
    if (!error) {
      setBeats(beats.map(b => b.id === beatId ? { ...b, price } : b))
      setEditPrice(null)
      setEditPriceValue('')
    } else {
      alert('Failed to update price')
    }
  }
  const saveLicensingPrice = async (beatId: string, licenseKey: string) => {
    const price = Number(editLicensingPriceValue)
    const { error } = await supabase
      .from('beats')
      .update({ [licenseKey]: price })
      .eq('id', beatId)
    if (!error) {
      setBeats(beats.map(b => b.id === beatId ? { ...b, [licenseKey]: price } : b))
      setEditLicensingPrice(null)
      setEditLicensingPriceValue('')
    } else {
      alert('Failed to update licensing price')
    }
  }

  let filteredBeats = beats.filter(beat =>
    beat.title.toLowerCase().includes(search.toLowerCase())
  )
  if (showHighRatings) {
    filteredBeats = filteredBeats.filter(beat => (beat.average_rating ?? 0) >= 3)
  }
  if (showNoPrice) {
    filteredBeats = filteredBeats.filter(beat => 
      (!beat.price || Number(beat.price) === 0) && 
      (!beat.price_lease || Number(beat.price_lease) === 0) && 
      (!beat.price_premium_lease || Number(beat.price_premium_lease) === 0) && 
      (!beat.price_exclusive || Number(beat.price_exclusive) === 0) && 
      (!beat.price_buyout || Number(beat.price_buyout) === 0)
    )
  }
  if (showNullLicensing) {
    filteredBeats = filteredBeats.filter(beat => {
      const licensing = (beat as any).licensing;
      // If licensing is missing or is an empty object
      if (!licensing || (typeof licensing === 'object' && Object.keys(licensing).length === 0)) return true;
      // If any required key is missing in licensing
      const requiredKeys = ['template-lease', 'template-premium-lease', 'template-exclusive', 'template-buy-out'];
      return requiredKeys.some(key => !(key in licensing));
    });
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
        <Button
          className={`bg-red-400 hover:bg-red-300 text-black font-semibold px-4 py-2 rounded shadow ${showNoPrice ? 'ring-2 ring-red-500' : ''}`}
          onClick={() => setShowNoPrice(v => !v)}
        >
          {showNoPrice ? 'Show All' : 'Show No Price'}
        </Button>
        <Button
          className={`bg-blue-400 hover:bg-blue-300 text-black font-semibold px-4 py-2 rounded shadow ${showNullLicensing ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => setShowNullLicensing(v => !v)}
        >
          {showNullLicensing ? 'Show All' : 'Show Null Licensing'}
        </Button>
      </div>
      <Card className="p-6">
        <div className="flex gap-2 mb-4">
          <Button variant="outline" onClick={handleSelectAll} disabled={allSelected}>Select All</Button>
          <Button variant="outline" onClick={handleDeselectAll} disabled={selected.length === 0}>Deselect All</Button>
          <Select value={bulkAction} onValueChange={v => handleBulkAction(v as 'edit_plays' | 'edit_name' | 'randomize_plays' | 'update_licensing')} disabled={selected.length === 0}>
            <SelectTrigger className="w-40 bg-secondary text-white">
              <SelectValue placeholder="Bulk Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="edit_plays">Edit Plays</SelectItem>
              <SelectItem value="edit_name">Edit Name</SelectItem>
              <SelectItem value="randomize_plays">Randomize Plays</SelectItem>
              <SelectItem value="update_licensing">Update Licensing Prices</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {bulkAction === 'edit_plays' && 'Set Play Count'}
                {bulkAction === 'edit_name' && 'Set Title'}
                {bulkAction === 'randomize_plays' && 'Randomize Play Count'}
                {bulkAction === 'update_licensing' && 'Update Licensing Prices'}
              </DialogTitle>
            </DialogHeader>
            {bulkAction === 'edit_plays' && (
              <div className="space-y-4">
                <p>Enter the play count to set for all selected beats:</p>
                <Input
                  type="number"
                  value={bulkValue}
                  onChange={e => setBulkValue(e.target.value)}
                  placeholder="Enter play count"
                />
              </div>
            )}
            {bulkAction === 'edit_name' && (
              <div className="space-y-4">
                <p>Enter the title to set for all selected beats:</p>
                <Input
                  value={bulkValue}
                  onChange={e => setBulkValue(e.target.value)}
                  placeholder="Enter title"
                />
              </div>
            )}
            {bulkAction === 'randomize_plays' && (
              <div className="space-y-4">
                <p>Enter min and max values separated by a comma:</p>
                <Input
                  value={bulkValue}
                  onChange={e => setBulkValue(e.target.value)}
                  placeholder="e.g., 100,1000"
                />
              </div>
            )}
            {bulkAction === 'update_licensing' && (
              <div className="space-y-4">
                <p>This will update the licensing prices for all selected beats to the default values:</p>
                <ul className="list-disc pl-4">
                  <li>Lease: $20.00</li>
                  <li>Premium Lease: $100.00</li>
                  <li>Exclusive: $300.00</li>
                  <li>Buy Out: $1000.00</li>
                </ul>
              </div>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleBulkSave} disabled={bulkLoading}>
                {bulkLoading ? 'Saving...' : 'Save'}
              </Button>
            </div>
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
                {showNoPrice && (
                  <>
                    <th className="px-2 py-2">Price</th>
                    <th className="px-2 py-2">Licensing Prices</th>
                  </>
                )}
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
                  {showNoPrice && (
                    <>
                      <td className="px-2 py-2 align-middle">
                        {editPrice === beat.id ? (
                          <Input value={editPriceValue} onChange={e => setEditPriceValue(e.target.value)} className="w-20" />
                        ) : (
                          <div onClick={() => startEditPrice(beat.id, beat.price ?? null)}>
                            {beat.price != null ? `$${beat.price.toFixed(2)}` : 'N/A'}
                          </div>
                        )}
                        {editPrice === beat.id && (
                          <Button size="sm" variant="default" onClick={() => savePrice(beat.id)}>Save</Button>
                        )}
                      </td>
                      <td className="px-2 py-2 align-middle">
                        <div>
                          Lease: {editLicensingPrice === beat.id ? (
                            <Input value={editLicensingPriceValue} onChange={e => setEditLicensingPriceValue(e.target.value)} className="w-20" />
                          ) : (
                            <div onClick={() => startEditLicensingPrice(beat.id, beat.price_lease ?? null)}>
                              {beat.price_lease != null ? `$${beat.price_lease.toFixed(2)}` : 'N/A'}
                            </div>
                          )}
                          {editLicensingPrice === beat.id && (
                            <Button size="sm" variant="default" onClick={() => saveLicensingPrice(beat.id, 'price_lease')}>Save</Button>
                          )}
                          <br />
                          Premium: {editLicensingPrice === beat.id ? (
                            <Input value={editLicensingPriceValue} onChange={e => setEditLicensingPriceValue(e.target.value)} className="w-20" />
                          ) : (
                            <div onClick={() => startEditLicensingPrice(beat.id, beat.price_premium_lease ?? null)}>
                              {beat.price_premium_lease != null ? `$${beat.price_premium_lease.toFixed(2)}` : 'N/A'}
                            </div>
                          )}
                          {editLicensingPrice === beat.id && (
                            <Button size="sm" variant="default" onClick={() => saveLicensingPrice(beat.id, 'price_premium_lease')}>Save</Button>
                          )}
                          <br />
                          Exclusive: {editLicensingPrice === beat.id ? (
                            <Input value={editLicensingPriceValue} onChange={e => setEditLicensingPriceValue(e.target.value)} className="w-20" />
                          ) : (
                            <div onClick={() => startEditLicensingPrice(beat.id, beat.price_exclusive ?? null)}>
                              {beat.price_exclusive != null ? `$${beat.price_exclusive.toFixed(2)}` : 'N/A'}
                            </div>
                          )}
                          {editLicensingPrice === beat.id && (
                            <Button size="sm" variant="default" onClick={() => saveLicensingPrice(beat.id, 'price_exclusive')}>Save</Button>
                          )}
                          <br />
                          Buyout: {editLicensingPrice === beat.id ? (
                            <Input value={editLicensingPriceValue} onChange={e => setEditLicensingPriceValue(e.target.value)} className="w-20" />
                          ) : (
                            <div onClick={() => startEditLicensingPrice(beat.id, beat.price_buyout ?? null)}>
                              {beat.price_buyout != null ? `$${beat.price_buyout.toFixed(2)}` : 'N/A'}
                            </div>
                          )}
                          {editLicensingPrice === beat.id && (
                            <Button size="sm" variant="default" onClick={() => saveLicensingPrice(beat.id, 'price_buyout')}>Save</Button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
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