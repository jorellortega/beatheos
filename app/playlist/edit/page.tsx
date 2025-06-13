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

export default function PlaylistEditPage() {
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

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 font-display tracking-wider text-primary">My Playlists</h1>
      <div className="flex justify-between items-center mb-6">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Search playlists..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={handleOpenCreate} className="ml-4">
          <Plus className="mr-2 h-4 w-4" /> Create Playlist
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading playlists...</div>
      ) : playlists.length === 0 ? (
        <div className="text-center py-8">No playlists found. Create your first playlist!</div>
      ) : (
        <div className="space-y-4">
          {playlists
            .filter((playlist) => playlist.name.toLowerCase().includes(search.toLowerCase()))
            .map((playlist) => (
              <Card key={playlist.id} className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between p-4">
                  <div className="flex items-center space-x-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleExpand(playlist.id)}
                      className="h-8 w-8"
                    >
                      {expanded[playlist.id] ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                    <div>
                      <CardTitle className="text-xl">{playlist.name}</CardTitle>
                      <CardDescription>{playlist.description || "No description"}</CardDescription>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleOpenEdit(playlist)}
                      className="h-8 w-8"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleOpenDelete(playlist)}
                      className="h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                {expanded[playlist.id] && (
                  <CardContent className="p-4 pt-0">
                    <div className="space-y-2">
                      {playlist.beats.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">No beats in this playlist</div>
                      ) : (
                        playlist.beats.map((beat) => (
                          <div
                            key={beat.id}
                            className="flex items-center justify-between p-2 hover:bg-gray-100 rounded"
                          >
                            <div className="flex items-center space-x-4">
                              <Image
                                src={beat.cover_art_url}
                                alt={beat.title}
                                width={40}
                                height={40}
                                className="rounded"
                              />
                              <div>
                                <div className="font-medium">{beat.title}</div>
                                <div className="text-sm text-gray-500">{beat.producer_display_name}</div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handlePlayBeat(beat)}
                              className="h-8 w-8"
                            >
                              {currentBeat?.id === beat.id && isPlaying ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
        </div>
      )}

      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Playlist</DialogTitle>
            <DialogDescription>Enter the details for your new playlist.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Enter playlist name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newPlaylistDescription}
                onChange={(e) => setNewPlaylistDescription(e.target.value)}
                placeholder="Enter playlist description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePlaylist} disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Playlist</DialogTitle>
            <DialogDescription>Update your playlist details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Enter playlist name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={newPlaylistDescription}
                onChange={(e) => setNewPlaylistDescription(e.target.value)}
                placeholder="Enter playlist description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditPlaylist} disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <Button
              variant="destructive"
              onClick={handleDeletePlaylist}
              disabled={deletingPlaylistId === selectedPlaylist?.id}
            >
              {deletingPlaylistId === selectedPlaylist?.id ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 