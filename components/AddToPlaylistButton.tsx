"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Music } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from '@/lib/supabaseClient';

interface Playlist {
  id: string
  name: string
  description: string | null
  cover_image_url: string | null
  is_public: boolean
  beat_count: number
}

interface AddToPlaylistButtonProps {
  beatId: string
  beatTitle: string
}

export function AddToPlaylistButton({ beatId, beatTitle }: AddToPlaylistButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [newPlaylistName, setNewPlaylistName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { user } = useAuth();

  const getAccessToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  };

  const fetchPlaylists = async () => {
    try {
      const accessToken = await getAccessToken();
      const response = await fetch("/api/playlists", {
        headers: user?.id && accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      })
      if (!response.ok) throw new Error("Failed to fetch playlists")
      const data = await response.json()
      setPlaylists(data)
    } catch (error) {
      console.error("Error fetching playlists:", error)
      toast({
        title: "Error",
        description: "Failed to load playlists",
        variant: "destructive",
      })
    }
  }

  const handleOpen = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to use playlists.",
        variant: "destructive",
      })
      router.push("/login")
      return
    }
    setIsOpen(true)
    await fetchPlaylists()
  }

  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) return
    setIsLoading(true)
    try {
      const accessToken = await getAccessToken();
      const response = await fetch("/api/playlists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: accessToken ? `Bearer ${accessToken}` : "",
        },
        body: JSON.stringify({ name: newPlaylistName }),
      })
      if (!response.ok) throw new Error("Failed to create playlist")
      const newPlaylist = await response.json()
      setPlaylists([...playlists, newPlaylist])
      setNewPlaylistName("")
      toast({
        title: "Success",
        description: "Playlist created successfully",
      })
    } catch (error) {
      console.error("Error creating playlist:", error)
      toast({
        title: "Error",
        description: "Failed to create playlist",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const addToPlaylist = async (playlistId: string) => {
    try {
      const accessToken = await getAccessToken();
      const response = await fetch(`/api/playlists/${playlistId}/beats`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: accessToken ? `Bearer ${accessToken}` : "",
        },
        body: JSON.stringify({ beatId }),
      })
      if (!response.ok) throw new Error("Failed to add beat to playlist")
      toast({
        title: "Success",
        description: `"${beatTitle}" has been added to the playlist`,
      })
      setIsOpen(false)
    } catch (error) {
      console.error("Error adding beat to playlist:", error)
      toast({
        title: "Error",
        description: "Failed to add beat to playlist",
        variant: "destructive",
      })
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpen}
        className="w-9 h-9 p-0 flex items-center justify-center"
        title="Add to Playlist"
      >
        <Music className="w-4 h-4" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Playlist</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex space-x-2">
              <Input
                placeholder="New playlist name"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    createPlaylist()
                  }
                }}
              />
              <Button
                onClick={createPlaylist}
                disabled={isLoading || !newPlaylistName.trim()}
                size="sm"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <ScrollArea className="h-[200px]">
              {playlists.length > 0 ? (
                <div className="space-y-2">
                  {playlists.map((playlist) => (
                    <div
                      key={playlist.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-secondary hover:bg-secondary/80"
                    >
                      <div>
                        <p className="font-medium text-sm">{playlist.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {playlist.beat_count} beats
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => addToPlaylist(playlist.id)}
                        title={`Add to ${playlist.name}`}
                        className="ml-2"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8 text-sm">
                  No playlists found. Create one to get started!
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
} 