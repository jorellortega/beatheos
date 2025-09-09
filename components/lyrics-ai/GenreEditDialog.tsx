"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'

interface GenreEditDialogProps {
  isOpen: boolean
  onClose: () => void
  currentGenre: string
  onSave: (genre: string) => void
}

const commonGenres = [
  'Hip-Hop', 'Rap', 'Pop', 'Rock', 'R&B', 'Country', 'Jazz', 'Blues',
  'Electronic', 'Dance', 'Reggae', 'Folk', 'Classical', 'Alternative',
  'Indie', 'Punk', 'Metal', 'Gospel', 'Soul', 'Funk', 'Disco',
  'Trap', 'Drill', 'Afrobeats', 'Latin', 'K-Pop', 'Other'
]

export function GenreEditDialog({ isOpen, onClose, currentGenre, onSave }: GenreEditDialogProps) {
  const [genre, setGenre] = useState(currentGenre || '')
  const [customGenre, setCustomGenre] = useState('')

  const handleSave = () => {
    const finalGenre = customGenre.trim() || genre
    onSave(finalGenre)
    onClose()
  }

  const handleGenreSelect = (selectedGenre: string) => {
    setGenre(selectedGenre)
    setCustomGenre('')
  }

  const handleCustomGenre = (value: string) => {
    setCustomGenre(value)
    setGenre('')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Genre</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Common Genres */}
          <div>
            <h4 className="text-sm font-medium mb-2">Common Genres</h4>
            <div className="flex flex-wrap gap-2">
              {commonGenres.map((g) => (
                <Badge
                  key={g}
                  variant={genre === g ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/10"
                  onClick={() => handleGenreSelect(g)}
                >
                  {g}
                </Badge>
              ))}
            </div>
          </div>

          {/* Custom Genre Input */}
          <div>
            <h4 className="text-sm font-medium mb-2">Custom Genre</h4>
            <Input
              placeholder="Enter custom genre..."
              value={customGenre}
              onChange={(e) => handleCustomGenre(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Current Selection */}
          {(genre || customGenre) && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Selected:</span>
                <Badge variant="default">
                  {customGenre.trim() || genre}
                </Badge>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Genre
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
