"use client"

import { useState, useRef } from "react"
import { supabase } from '@/lib/supabaseClient'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useRouter } from "next/navigation"

export default function EditArtistProfileModal({ artist }: { artist: any }) {
  const [open, setOpen] = useState(false)
  const [displayName, setDisplayName] = useState(artist.display_name || "")
  const [bio, setBio] = useState(artist.bio || "")
  const [spotify, setSpotify] = useState(artist.spotify_url || "")
  const [apple, setApple] = useState(artist.apple_url || "")
  const [instagram, setInstagram] = useState(artist.instagram_url || "")
  const [soundcloud, setSoundcloud] = useState(artist.soundcloud_url || "")
  const [website, setWebsite] = useState(artist.website_url || "")
  const [avatarUrl, setAvatarUrl] = useState(artist.avatar_url || "")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    let newAvatarUrl = avatarUrl
    // Upload avatar if changed
    if (avatarFile) {
      const fileExt = avatarFile.name.split('.').pop()
      const filePath = `artist-profiles/${artist.id}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('beats').upload(filePath, avatarFile, { upsert: true })
      if (uploadError) {
        setError("Failed to upload image: " + uploadError.message)
        setLoading(false)
        return
      }
      const { data: publicUrlData } = supabase.storage.from('beats').getPublicUrl(filePath)
      newAvatarUrl = publicUrlData.publicUrl
    }
    // Update artist profile
    const { error: updateError } = await supabase.from('artists').update({
      display_name: displayName,
      bio,
      spotify_url: spotify,
      apple_url: apple,
      instagram_url: instagram,
      soundcloud_url: soundcloud,
      website_url: website,
      avatar_url: newAvatarUrl,
    }).eq('id', artist.id)
    setLoading(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setOpen(false)
    router.refresh()
  }

  async function handleDelete() {
    setLoading(true)
    setError(null)
    const { error: deleteError } = await supabase.from('artists').delete().eq('id', artist.id)
    setLoading(false)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    setOpen(false)
    router.push('/artists')
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Edit Profile
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Artist Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block font-medium mb-1">Display Name</label>
              <Input value={displayName} onChange={e => setDisplayName(e.target.value)} required />
            </div>
            <div>
              <label className="block font-medium mb-1">Bio</label>
              <textarea className="w-full border rounded p-2" value={bio} onChange={e => setBio(e.target.value)} rows={3} />
            </div>
            <div>
              <label className="block font-medium mb-1">Profile Picture</label>
              <input type="file" accept="image/*" ref={fileInputRef} onChange={e => setAvatarFile(e.target.files?.[0] || null)} />
              {avatarUrl && <img src={avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full mt-2" />}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Spotify URL" value={spotify} onChange={e => setSpotify(e.target.value)} />
              <Input placeholder="Apple Music URL" value={apple} onChange={e => setApple(e.target.value)} />
              <Input placeholder="Instagram URL" value={instagram} onChange={e => setInstagram(e.target.value)} />
              <Input placeholder="SoundCloud URL" value={soundcloud} onChange={e => setSoundcloud(e.target.value)} />
              <Input placeholder="Website URL" value={website} onChange={e => setWebsite(e.target.value)} />
            </div>
            {error && <div className="text-red-500 text-sm">{error}</div>}
            <DialogFooter>
              <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Changes"}</Button>
              <Button type="button" variant="destructive" onClick={() => setDeleteConfirm(true)} disabled={loading}>Delete Profile</Button>
            </DialogFooter>
          </form>
          {/* Delete confirmation */}
          {deleteConfirm && (
            <div className="mt-4 p-4 border border-red-500 rounded bg-red-50">
              <p className="mb-2 text-red-700">Are you sure you want to delete your artist profile? This cannot be undone.</p>
              <div className="flex gap-2">
                <Button variant="destructive" onClick={handleDelete} disabled={loading}>Yes, Delete</Button>
                <Button onClick={() => setDeleteConfirm(false)} disabled={loading}>Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
} 