"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Edit, ChevronDown, ChevronRight, Play, Pause, Search } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/components/ui/use-toast";
import { usePlayer } from "@/contexts/PlayerContext";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Beat {
  id: string;
  title: string;
  producer_display_name: string;
  mp3_url: string;
  cover_art_url: string;
}

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  beats: Beat[];
}

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<{ [id: string]: boolean }>({});
  const [search, setSearch] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingPlaylistId, setDeletingPlaylistId] = useState<string | null>(null);
  const { currentBeat, setCurrentBeat, isPlaying, setIsPlaying } = usePlayer();

  useEffect(() => {
    async function fetchPlaylists() {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        setLoading(false);
        return;
      }
      const response = await fetch("/api/playlists", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) {
        setPlaylists([]);
        setLoading(false);
        return;
      }
      const data = await response.json();
      // For each playlist, fetch its beats
      const playlistsWithBeats = await Promise.all(
        data.map(async (playlist: any) => {
          const beatsRes = await fetch(`/api/playlists/${playlist.id}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (!beatsRes.ok) return { ...playlist, beats: [] };
          const playlistData = await beatsRes.json();
          return { ...playlist, beats: playlistData.beats || [] };
        })
      );
      setPlaylists(playlistsWithBeats);
      setLoading(false);
    }
    fetchPlaylists();
  }, []);

  const handleExpand = (playlistId: string) => {
    setExpanded((prev) => ({ ...prev, [playlistId]: !prev[playlistId] }));
  };

  const handlePlayBeat = (beat: Beat) => {
    if (currentBeat?.id === beat.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentBeat({
        ...beat,
        audioUrl: beat.mp3_url,
        artist: beat.producer_display_name,
        image: beat.cover_art_url,
      });
      setIsPlaying(true);
    }
  };

  const handleOpenCreate = () => {
    setNewPlaylistName("");
    setNewPlaylistDescription("");
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    setNewPlaylistName(playlist.name);
    setNewPlaylistDescription(playlist.description || "");
    setIsEditModalOpen(true);
  };

  const handleOpenDelete = (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    setIsDeleteModalOpen(true);
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a playlist name",
        variant: "destructive",
      });
      return;
    }
    try {
      setIsSubmitting(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      const response = await fetch("/api/playlists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: newPlaylistName,
          description: newPlaylistDescription,
        }),
      });
      if (!response.ok) throw new Error("Failed to create playlist");
      const newPlaylist = await response.json();
      setPlaylists((prev) => [...prev, { ...newPlaylist, beats: [] }]);
      setIsCreateModalOpen(false);
      setNewPlaylistName("");
      setNewPlaylistDescription("");
      toast({ title: "Success", description: "Playlist created successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to create playlist", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditPlaylist = async () => {
    if (!selectedPlaylist || !newPlaylistName.trim()) return;
    try {
      setIsSubmitting(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      const response = await fetch(`/api/playlists/${selectedPlaylist.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: newPlaylistName,
          description: newPlaylistDescription,
        }),
      });
      if (!response.ok) throw new Error("Failed to update playlist");
      setPlaylists((prev) =>
        prev.map((pl) =>
          pl.id === selectedPlaylist.id
            ? { ...pl, name: newPlaylistName, description: newPlaylistDescription }
            : pl
        )
      );
      setIsEditModalOpen(false);
      toast({ title: "Success", description: "Playlist updated successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update playlist", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePlaylist = async () => {
    if (!selectedPlaylist) return;
    try {
      setDeletingPlaylistId(selectedPlaylist.id);
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      const response = await fetch(`/api/playlists/${selectedPlaylist.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error("Failed to delete playlist");
      setPlaylists((prev) => prev.filter((pl) => pl.id !== selectedPlaylist.id));
      setIsDeleteModalOpen(false);
      toast({ title: "Success", description: "Playlist deleted successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete playlist", variant: "destructive" });
    } finally {
      setDeletingPlaylistId(null);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading playlists...</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold flex-1">My Playlists</h1>
        <Button onClick={handleOpenCreate} variant="outline">
          <Plus className="h-4 w-4 mr-2" /> New Playlist
        </Button>
      </div>
      <Input
        placeholder="Search playlists..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-6"
      />
      <div className="space-y-4">
        {playlists
          .filter((pl) => pl.name.toLowerCase().includes(search.toLowerCase()))
          .map((playlist) => (
            <Card key={playlist.id}>
              <CardHeader className="flex flex-row items-center justify-between cursor-pointer" onClick={() => handleExpand(playlist.id)}>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="mr-2">
                    {expanded[playlist.id] ? <ChevronDown /> : <ChevronRight />}
                  </Button>
                  <CardTitle>{playlist.name}</CardTitle>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); handleOpenEdit(playlist); }}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={e => { e.stopPropagation(); handleOpenDelete(playlist); }} disabled={deletingPlaylistId === playlist.id}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              {expanded[playlist.id] && (
                <CardContent>
                  <CardDescription>{playlist.description}</CardDescription>
                  <div className="bg-secondary rounded p-4 min-h-[100px] mt-2">
                    {playlist.beats && playlist.beats.length > 0 ? (
                      <ul className="space-y-2">
                        {playlist.beats.map((beat: Beat) => (
                          <li key={beat.id} className="flex items-center gap-4 p-2 hover:bg-secondary/80 rounded group">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handlePlayBeat(beat)}
                            >
                              {currentBeat?.id === beat.id && isPlaying ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                            {beat.cover_art_url && (
                              <div className="relative h-10 w-10 flex-shrink-0">
                                <Image
                                  src={beat.cover_art_url}
                                  alt={beat.title}
                                  fill
                                  className="object-cover rounded"
                                />
                              </div>
                            )}
                            <div className="flex flex-col">
                              <span className="font-medium">{beat.title}</span>
                              <span className="text-sm text-muted-foreground">{beat.producer_display_name}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-gray-400 text-center">No beats in this playlist yet.</div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
      </div>

      {/* Create Playlist Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Playlist</DialogTitle>
            <DialogDescription>
              Create a new playlist to organize your beats.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Enter playlist name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newPlaylistDescription}
                onChange={(e) => setNewPlaylistDescription(e.target.value)}
                placeholder="Enter playlist description (optional)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePlaylist} disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Playlist"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Playlist Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Playlist</DialogTitle>
            <DialogDescription>
              Update your playlist details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Enter playlist name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={newPlaylistDescription}
                onChange={(e) => setNewPlaylistDescription(e.target.value)}
                placeholder="Enter playlist description (optional)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditPlaylist} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Playlist Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Playlist</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this playlist? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeletePlaylist} disabled={deletingPlaylistId !== null}>
              {deletingPlaylistId !== null ? "Deleting..." : "Delete Playlist"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 