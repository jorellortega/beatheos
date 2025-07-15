"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Pencil, Trash2, Save, X } from "lucide-react";

export default function ArtistSongUploadPage() {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [songs, setSongs] = useState<any[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
  const [editCoverPreview, setEditCoverPreview] = useState<string | null>(null);

  // Fetch artist profile
  const [artist, setArtist] = useState<any>(null);
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
        .select("id, title, audio_url, created_at, cover_image_url")
        .eq("artist_id", artist.id)
        .order("created_at", { ascending: false });
      setSongs(data || []);
    }
    fetchSongs();
  }, [artist?.id, success]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!file || !title.trim() || !artist?.id) {
      setError("Please provide a song title and file.");
      return;
    }
    setUploading(true);
    try {
      // Upload song file to Supabase Storage
      const ext = file.name.split(".").pop();
      const filePath = `songs/${artist.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("beats").upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from("beats").getPublicUrl(filePath);
      const audio_url = publicUrlData.publicUrl;

      // Upload cover image if provided
      let cover_image_url = null;
      if (coverFile) {
        const coverExt = coverFile.name.split(".").pop();
        const coverPath = `songs/covers/${artist.id}-${Date.now()}.${coverExt}`;
        const { error: coverUploadError } = await supabase.storage.from("beats").upload(coverPath, coverFile, { upsert: true });
        if (coverUploadError) throw coverUploadError;
        const { data: coverUrlData } = supabase.storage.from("beats").getPublicUrl(coverPath);
        cover_image_url = coverUrlData.publicUrl;
      }

      // Save metadata to DB
      const { error: insertError } = await supabase.from("songs").insert({
        artist_id: artist.id,
        title,
        audio_url,
        cover_image_url,
      });
      if (insertError) throw insertError;
      setSuccess("Song uploaded successfully!");
      setTitle("");
      setFile(null);
      setCoverFile(null);
      setCoverPreview(null);
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(song: any) {
    if (!confirm("Are you sure you want to delete this song?")) return;
    // Remove from storage (audio and cover)
    if (song.audio_url) {
      const audioPath = song.audio_url.split("/storage/v1/object/public/beats/")[1];
      if (audioPath) await supabase.storage.from("beats").remove([audioPath]);
    }
    if (song.cover_image_url) {
      const coverPath = song.cover_image_url.split("/storage/v1/object/public/beats/")[1];
      if (coverPath) await supabase.storage.from("beats").remove([coverPath]);
    }
    // Remove from DB
    await supabase.from("songs").delete().eq("id", song.id);
    setSongs(songs => songs.filter(s => s.id !== song.id));
  }

  function startEdit(song: any) {
    setEditingId(song.id);
    setEditTitle(song.title);
    setEditCoverPreview(song.cover_image_url || null);
    setEditCoverFile(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle("");
    setEditCoverFile(null);
    setEditCoverPreview(null);
  }

  async function handleEditSave(song: any) {
    let newCoverUrl = song.cover_image_url;
    if (editCoverFile) {
      // Upload new cover
      const coverExt = editCoverFile.name.split(".").pop();
      const coverPath = `songs/covers/${artist.id}-${Date.now()}.${coverExt}`;
      const { error: coverUploadError } = await supabase.storage.from("beats").upload(coverPath, editCoverFile, { upsert: true });
      if (coverUploadError) {
        setError(coverUploadError.message);
        return;
      }
      const { data: coverUrlData } = supabase.storage.from("beats").getPublicUrl(coverPath);
      newCoverUrl = coverUrlData.publicUrl;
      // Optionally remove old cover
      if (song.cover_image_url) {
        const oldCoverPath = song.cover_image_url.split("/storage/v1/object/public/beats/")[1];
        if (oldCoverPath) await supabase.storage.from("beats").remove([oldCoverPath]);
      }
    }
    // Update DB
    const { error: updateError } = await supabase.from("songs").update({ title: editTitle, cover_image_url: newCoverUrl }).eq("id", song.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSongs(songs => songs.map(s => s.id === song.id ? { ...s, title: editTitle, cover_image_url: newCoverUrl } : s));
    cancelEdit();
  }

  return (
    <div className="container mx-auto py-12 max-w-xl">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Upload a Song</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block font-medium mb-1">Song Title</label>
              <Input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Enter song title" />
            </div>
            <div>
              <label className="block font-medium mb-1">Song File (mp3, wav, etc.)</label>
              <Input type="file" accept="audio/*" onChange={e => setFile(e.target.files?.[0] || null)} required />
            </div>
            <div>
              <label className="block font-medium mb-1">Cover Image (optional)</label>
              <Input type="file" accept="image/*" onChange={e => {
                const file = e.target.files?.[0] || null;
                setCoverFile(file);
                if (file) {
                  const reader = new FileReader();
                  reader.onload = e => setCoverPreview(e.target?.result as string);
                  reader.readAsDataURL(file);
                } else {
                  setCoverPreview(null);
                }
              }} />
              {coverPreview && (
                <img src={coverPreview} alt="Cover Preview" className="mt-2 w-32 h-32 object-cover rounded border" />
              )}
            </div>
            {error && <div className="text-red-500 text-sm">{error}</div>}
            {success && <div className="text-green-500 text-sm">{success}</div>}
            <Button type="submit" disabled={uploading || !artist?.id} className="w-full">
              {uploading ? "Uploading..." : "Upload Song"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Your Uploaded Songs</CardTitle>
        </CardHeader>
        <CardContent>
          {songs.length === 0 ? (
            <div className="text-gray-400">No songs uploaded yet.</div>
          ) : (
            <ul className="space-y-4">
              {songs.map(song => (
                <li key={song.id} className="flex flex-col gap-1 border-b pb-3">
                  {editingId === song.id ? (
                    <div className="flex flex-col gap-2">
                      <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="font-semibold" />
                      <div className="flex items-center gap-4">
                        {editCoverPreview && (
                          <img src={editCoverPreview} alt="Cover" className="w-24 h-24 object-cover rounded border" />
                        )}
                        <Input type="file" accept="image/*" onChange={e => {
                          const file = e.target.files?.[0] || null;
                          setEditCoverFile(file);
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = e => setEditCoverPreview(e.target?.result as string);
                            reader.readAsDataURL(file);
                          } else {
                            setEditCoverPreview(song.cover_image_url || null);
                          }
                        }} />
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" onClick={() => handleEditSave(song)}><Save className="w-4 h-4 mr-1" />Save</Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit}><X className="w-4 h-4 mr-1" />Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="font-semibold flex items-center gap-2">{song.title}
                        <Button size="icon" variant="ghost" className="ml-1" onClick={() => startEdit(song)}><Pencil className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" className="ml-1" onClick={() => handleDelete(song)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                      </span>
                      {song.cover_image_url && (
                        <img src={song.cover_image_url} alt="Cover" className="w-24 h-24 object-cover rounded border mb-2" />
                      )}
                      <audio src={song.audio_url} controls className="w-full" />
                      <span className="text-xs text-gray-400">Uploaded {new Date(song.created_at).toLocaleString()}</span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 