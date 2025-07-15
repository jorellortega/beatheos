"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

export default function ArtistSongsManagementPage() {
  const { user } = useAuth();
  const [artist, setArtist] = useState<any>(null);
  const [songs, setSongs] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<any>({});
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
  const [editCoverPreview, setEditCoverPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch artist profile
  useEffect(() => {
    async function fetchArtist() {
      if (!user?.id) return;
      const { data } = await supabase
        .from("artists")
        .select("id, display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      setArtist(data);
    }
    fetchArtist();
  }, [user?.id]);

  // Fetch uploaded songs for this artist
  useEffect(() => {
    async function fetchSongs() {
      if (!artist?.id) return;
      const { data } = await supabase
        .from("songs")
        .select("id, title, genre, price, cover_image_url, audio_url, created_at")
        .eq("artist_id", artist.id)
        .order("created_at", { ascending: false });
      setSongs(data || []);
    }
    fetchSongs();
  }, [artist?.id, loading]);

  function startEdit(song: any) {
    setEditingId(song.id);
    setEditFields({
      title: song.title,
      genre: song.genre || "",
      price: song.price || "",
    });
    setEditCoverPreview(song.cover_image_url || null);
    setEditCoverFile(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditFields({});
    setEditCoverFile(null);
    setEditCoverPreview(null);
  }

  async function handleEditSave(song: any) {
    setLoading(true);
    setError(null);
    try {
      let cover_image_url = song.cover_image_url;
      if (editCoverFile) {
        const ext = editCoverFile.name.split(".").pop();
        const coverPath = `songs/covers/${artist.id}-${Date.now()}.${ext}`;
        const { error: coverUploadError } = await supabase.storage.from("beats").upload(coverPath, editCoverFile, { upsert: true });
        if (coverUploadError) throw coverUploadError;
        const { data: coverUrlData } = supabase.storage.from("beats").getPublicUrl(coverPath);
        cover_image_url = coverUrlData.publicUrl;
      }
      const { error: updateError } = await supabase.from("songs").update({
        title: editFields.title,
        genre: editFields.genre,
        price: editFields.price,
        cover_image_url,
      }).eq("id", song.id);
      if (updateError) throw updateError;
      setEditingId(null);
      setEditFields({});
      setEditCoverFile(null);
      setEditCoverPreview(null);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || "Update failed");
      setLoading(false);
    }
  }

  async function handleDelete(songId: string) {
    setLoading(true);
    setError(null);
    try {
      const { error: deleteError } = await supabase.from("songs").delete().eq("id", songId);
      if (deleteError) throw deleteError;
      setLoading(false);
    } catch (err: any) {
      setError(err.message || "Delete failed");
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto py-12 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Manage Your Songs</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
          {songs.length === 0 ? (
            <div className="text-gray-400">No songs uploaded yet.</div>
          ) : (
            <ul className="space-y-8">
              {songs.map(song => (
                <li key={song.id} className="flex flex-col md:flex-row gap-6 border-b pb-6">
                  <div className="flex-shrink-0 flex flex-col items-center gap-2">
                    {editingId === song.id ? (
                      <>
                        <img
                          src={editCoverPreview || song.cover_image_url || "/placeholder.jpg"}
                          alt="Cover"
                          className="w-24 h-24 object-cover rounded border mb-2"
                        />
                        <Input type="file" accept="image/*" onChange={e => {
                          const file = e.target.files?.[0] || null;
                          setEditCoverFile(file);
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = e => setEditCoverPreview(e.target?.result as string);
                            reader.readAsDataURL(file);
                          } else {
                            setEditCoverPreview(null);
                          }
                        }} />
                      </>
                    ) : (
                      <img
                        src={song.cover_image_url || "/placeholder.jpg"}
                        alt="Cover"
                        className="w-24 h-24 object-cover rounded border mb-2"
                      />
                    )}
                  </div>
                  <div className="flex-1 flex flex-col gap-2">
                    {editingId === song.id ? (
                      <>
                        <Input
                          value={editFields.title}
                          onChange={e => setEditFields((f: any) => ({ ...f, title: e.target.value }))}
                          placeholder="Song Title"
                          className="mb-2"
                        />
                        <Input
                          value={editFields.genre}
                          onChange={e => setEditFields((f: any) => ({ ...f, genre: e.target.value }))}
                          placeholder="Genre"
                          className="mb-2"
                        />
                        <Input
                          value={editFields.price}
                          onChange={e => setEditFields((f: any) => ({ ...f, price: e.target.value }))}
                          placeholder="Price"
                          type="number"
                          min="0"
                          className="mb-2"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleEditSave(song)} disabled={loading}>
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit} disabled={loading}>
                            Cancel
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-lg">{song.title}</span>
                        <span className="text-sm text-gray-400">Genre: {song.genre || "-"}</span>
                        <span className="text-sm text-gray-400">Price: {song.price ? `$${song.price}` : "-"}</span>
                        <audio src={song.audio_url} controls className="w-full mt-2" />
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" variant="outline" onClick={() => startEdit(song)}>
                            Edit
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(song.id)} disabled={loading}>
                            Delete
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 