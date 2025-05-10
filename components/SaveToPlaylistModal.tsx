"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus } from 'lucide-react'

interface Playlist {
  id: string
  name: string
}

interface SaveToPlaylistModalProps {
  isOpen: boolean
  onClose: () => void
  beat: { id: string; title: string } | null
}

export function SaveToPlaylistModal({ isOpen, onClose, beat }: SaveToPlaylistModalProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([
    { id: '1', name: 'Workout Beats' },
    { id: '2', name: 'Chill Vibes' },
    { id: '3', name: 'Party Mix' },
  ])
  const [newPlaylistName, setNewPlaylistName] = useState('')

  const handleSaveToPlaylist = (playlistId: string) => {
    // Logic to save beat to playlist
    console.log(`Saving beat ${beat?.id} to playlist ${playlistId}`)
    onClose()
  }

  const handleCreatePlaylist = () => {
    if (newPlaylistName.trim()) {
      const newPlaylist = { id: Date.now().toString(), name: newPlaylistName.trim() }
      setPlaylists([...playlists, newPlaylist])
      setNewPlaylistName('')
      handleSaveToPlaylist(newPlaylist.id)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save "{beat?.title}" to Playlist</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {playlists.map((playlist) => (
            <Button
              key={playlist.id}
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleSaveToPlaylist(playlist.id)}
            >
              {playlist.name}
            </Button>
          ))}
          <div className="flex space-x-2">
            <Input
              placeholder="New playlist name"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
            />
            <Button onClick={handleCreatePlaylist}>
              <Plus className="h-4 w-4 mr-2" />
              Create
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

