"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from '@/lib/supabaseClient'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { User, Edit, Camera } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { X } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export default function ActivateArtistPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingArtist, setExistingArtist] = useState<{
    display_name: string;
    slug: string;
    avatar_url?: string;
    bio?: string;
    instagram_url?: string;
    spotify_url?: string;
    apple_url?: string;
    soundcloud_url?: string;
    website_url?: string;
  } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [openModal, setOpenModal] = useState<null | 'picture' | 'bio' | 'social'>(null);
  const { toast } = useToast();
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [bio, setBio] = useState<string>("");
  const [savingBio, setSavingBio] = useState(false);
  const [socialLinks, setSocialLinks] = useState({
    instagram_url: "",
    spotify_url: "",
    apple_url: "",
    soundcloud_url: "",
    website_url: ""
  });
  const [savingSocial, setSavingSocial] = useState(false);

  // Check for existing artist profile on component mount
  useEffect(() => {
    async function checkExistingProfile() {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('artists')
        .select('display_name, slug, avatar_url, bio, instagram_url, spotify_url, apple_url, soundcloud_url, website_url')
        .eq('user_id', user.id)
        .maybeSingle();
      
      console.log('DEBUG: user', user);
      console.log('DEBUG: artist fetch data', data);
      console.log('DEBUG: artist fetch error', error);
      if (data) {
        setExistingArtist(data);
        setDisplayName(data.display_name);
        setBio(data.bio || "");
        setSocialLinks({
          instagram_url: data.instagram_url || "",
          spotify_url: data.spotify_url || "",
          apple_url: data.apple_url || "",
          soundcloud_url: data.soundcloud_url || "",
          website_url: data.website_url || ""
        });
      }
      setCheckingProfile(false);
    }
    
    checkExistingProfile();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!displayName.trim()) {
      setError("Display name is required.");
      return;
    }
    if (!user) {
      setError("You must be logged in.");
      return;
    }
    setLoading(true);
    const slug = slugify(displayName);
    
    if (existingArtist) {
      // Update existing artist profile
      const { data, error: updateError } = await supabase
        .from('artists')
        .update({
          display_name: displayName,
          slug,
        })
        .eq('user_id', user.id)
        .select()
        .single();
      
      setLoading(false);
      if (updateError) {
        setError(updateError.message);
        return;
      }
      
      setExistingArtist({ ...existingArtist, display_name: displayName, slug });
      setIsEditing(false);
      return;
    }
    
    // Check if slug already exists (for new profiles)
    const { data: existing } = await supabase
      .from('artists')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (existing) {
      setError("That display name is already taken. Please choose another.");
      setLoading(false);
      return;
    }
    
    // Insert new artist
    const { data, error: insertError } = await supabase
      .from('artists')
      .insert({
        user_id: user.id,
        display_name: displayName,
        slug,
      })
      .select()
      .single();
    setLoading(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    // Redirect to artist profile
    router.push(`/artist/${slug}`);
  };

  if (checkingProfile) {
    return (
      <div className="container mx-auto py-12 max-w-lg">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 max-w-lg">
      <h1 className="text-3xl font-bold mb-6">Artist Account</h1>
      
      {existingArtist && !isEditing ? (
        <>
          <Card className="bg-card border-primary">
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                Artist Profile Active
              </CardTitle>
              <CardDescription>Your artist account is already activated</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <img
                    src={existingArtist?.avatar_url || '/placeholder-user.jpg'}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover border border-primary cursor-pointer group-hover:opacity-80 transition"
                    onClick={() => setOpenModal('picture')}
                  />
                  <button
                    className="absolute bottom-2 right-2 bg-black/70 rounded-full p-1 border border-white group-hover:scale-110 transition"
                    onClick={() => setOpenModal('picture')}
                    title={existingArtist?.avatar_url ? 'Change Profile Picture' : 'Add Profile Picture'}
                    type="button"
                  >
                    <Camera className="w-5 h-5 text-white" />
                  </button>
                  {!existingArtist?.avatar_url && (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400 pointer-events-none">
                      Add Photo
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-medium text-lg">{existingArtist.display_name}</div>
                  <div className="text-sm text-gray-400">Artist Name</div>
                  <div className="text-sm text-gray-400">/artist/{existingArtist.slug}</div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button 
                  onClick={() => setIsEditing(true)}
                  className="flex-1 bg-black text-white border border-white hover:gradient-button hover:text-black"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Profile
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => router.push(`/artist/${existingArtist.slug}`)}
                >
                  View Profile
                </Button>
              </div>
            </CardContent>
          </Card>
          {/* Profile Edit Options Section */}
          <div className="mt-8 space-y-4">
            <h2 className="text-xl font-semibold mb-2">Profile Page Options</h2>
            <div className="flex flex-wrap gap-4">
              <Button variant="secondary" className="min-w-[180px]" onClick={() => setOpenModal('picture')}>Change Profile Picture</Button>
              <Button variant="secondary" className="min-w-[180px]" onClick={() => setOpenModal('bio')}>Edit Bio</Button>
              <Button variant="secondary" className="min-w-[180px]" onClick={() => setOpenModal('social')}>Add Social Links</Button>
            </div>
          </div>

          {/* Modals for each option */}
          <Dialog open={openModal === 'picture'} onOpenChange={() => setOpenModal(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Change Profile Picture</DialogTitle>
                <DialogDescription>Upload a new profile picture for your artist profile.</DialogDescription>
              </DialogHeader>
              <div className="py-4 flex flex-col items-center gap-4">
                {/* Show current profile picture if available */}
                {existingArtist?.avatar_url && !profilePicPreview && (
                  <img
                    src={existingArtist.avatar_url}
                    alt="Current profile"
                    className="w-24 h-24 rounded-full object-cover border border-primary"
                  />
                )}
                {/* Show preview if a new file is selected */}
                {profilePicPreview && (
                  <img
                    src={profilePicPreview}
                    alt="Preview"
                    className="w-24 h-24 rounded-full object-cover border border-primary"
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    const file = e.target.files?.[0] || null;
                    setProfilePicFile(file);
                    setProfilePicPreview(file ? URL.createObjectURL(file) : null);
                  }}
                  disabled={uploadingPic}
                />
                <Button
                  onClick={async () => {
                    if (!profilePicFile || !user || !existingArtist) return;
                    setUploadingPic(true);
                    const fileExt = profilePicFile.name.split('.').pop();
                    const filePath = `artist-profiles/${user.id}_${Date.now()}.${fileExt}`;
                    // Upload to Supabase Storage
                    const { data: uploadData, error: uploadError } = await supabase.storage
                      .from('beats')
                      .upload(filePath, profilePicFile, { upsert: true });
                    if (uploadError) {
                      toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' });
                      setUploadingPic(false);
                      return;
                    }
                    // Get public URL
                    const { data: publicUrlData } = supabase.storage.from('beats').getPublicUrl(filePath);
                    const publicUrl = publicUrlData?.publicUrl;
                    // Update artist profile
                    const { error: updateError } = await supabase
                      .from('artists')
                      .update({ avatar_url: publicUrl })
                      .eq('user_id', user.id);
                    setUploadingPic(false);
                    if (updateError) {
                      toast({ title: 'Update failed', description: updateError.message, variant: 'destructive' });
                      return;
                    }
                    setExistingArtist({ ...existingArtist, avatar_url: publicUrl });
                    setProfilePicFile(null);
                    setProfilePicPreview(null);
                    toast({ title: 'Profile picture updated!' });
                  }}
                  disabled={!profilePicFile || uploadingPic}
                >
                  {uploadingPic ? 'Uploading...' : 'Save'}
                </Button>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setOpenModal(null); setProfilePicFile(null); setProfilePicPreview(null); }}><X className="mr-2 h-4 w-4" />Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={openModal === 'bio'} onOpenChange={() => setOpenModal(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Bio</DialogTitle>
                <DialogDescription>Write a short bio for your artist profile.</DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <textarea
                  className="w-full min-h-[100px] rounded-md border border-primary bg-black/40 p-2 text-white"
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  disabled={savingBio}
                />
              </div>
              <DialogFooter>
                <Button
                  onClick={async () => {
                    if (!user || !existingArtist) return;
                    setSavingBio(true);
                    const { error: updateError } = await supabase
                      .from('artists')
                      .update({ bio })
                      .eq('user_id', user.id);
                    setSavingBio(false);
                    if (updateError) {
                      toast({ title: 'Update failed', description: updateError.message, variant: 'destructive' });
                      return;
                    }
                    setExistingArtist({ ...existingArtist, bio });
                    setOpenModal(null);
                    toast({ title: 'Bio updated!' });
                  }}
                  disabled={savingBio}
                >
                  {savingBio ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="outline" onClick={() => setOpenModal(null)}><X className="mr-2 h-4 w-4" />Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={openModal === 'social'} onOpenChange={() => setOpenModal(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Social Links</DialogTitle>
                <DialogDescription>Add or edit your social media links.</DialogDescription>
              </DialogHeader>
              <form className="py-4 space-y-3" onSubmit={async e => {
                e.preventDefault();
                if (!user || !existingArtist) return;
                setSavingSocial(true);
                const { error: updateError } = await supabase
                  .from('artists')
                  .update(socialLinks)
                  .eq('user_id', user.id);
                setSavingSocial(false);
                if (updateError) {
                  toast({ title: 'Update failed', description: updateError.message, variant: 'destructive' });
                  return;
                }
                setExistingArtist({ ...existingArtist, ...socialLinks });
                setOpenModal(null);
                toast({ title: 'Social links updated!' });
              }}>
                <input
                  className="w-full rounded-md border border-primary bg-black/40 p-2 text-white"
                  value={socialLinks.instagram_url}
                  onChange={e => setSocialLinks(s => ({ ...s, instagram_url: e.target.value }))}
                  placeholder="Instagram URL"
                  disabled={savingSocial}
                />
                <input
                  className="w-full rounded-md border border-primary bg-black/40 p-2 text-white"
                  value={socialLinks.spotify_url}
                  onChange={e => setSocialLinks(s => ({ ...s, spotify_url: e.target.value }))}
                  placeholder="Spotify URL"
                  disabled={savingSocial}
                />
                <input
                  className="w-full rounded-md border border-primary bg-black/40 p-2 text-white"
                  value={socialLinks.apple_url}
                  onChange={e => setSocialLinks(s => ({ ...s, apple_url: e.target.value }))}
                  placeholder="Apple Music URL"
                  disabled={savingSocial}
                />
                <input
                  className="w-full rounded-md border border-primary bg-black/40 p-2 text-white"
                  value={socialLinks.soundcloud_url}
                  onChange={e => setSocialLinks(s => ({ ...s, soundcloud_url: e.target.value }))}
                  placeholder="SoundCloud URL"
                  disabled={savingSocial}
                />
                <input
                  className="w-full rounded-md border border-primary bg-black/40 p-2 text-white"
                  value={socialLinks.website_url}
                  onChange={e => setSocialLinks(s => ({ ...s, website_url: e.target.value }))}
                  placeholder="Website URL"
                  disabled={savingSocial}
                />
                <DialogFooter>
                  <Button type="submit" disabled={savingSocial}>
                    {savingSocial ? 'Saving...' : 'Save'}
                  </Button>
                  <Button variant="outline" type="button" onClick={() => setOpenModal(null)}><X className="mr-2 h-4 w-4" />Close</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Card className="bg-card border-primary">
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                {existingArtist ? "Edit Artist Profile" : "Activate Artist Account"}
              </CardTitle>
              <CardDescription>
                {existingArtist 
                  ? "Update your artist display name and profile information"
                  : "Set up your public artist profile and start uploading songs"
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="block font-medium">Display Name</label>
              <Input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Your artist name"
                disabled={loading}
              />
              {error && <div className="text-red-500 text-sm">{error}</div>}
              <div className="flex gap-3">
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading 
                    ? (existingArtist ? "Updating..." : "Activating...") 
                    : (existingArtist ? "Update Profile" : "Activate Artist Account")
                  }
                </Button>
                {existingArtist && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setIsEditing(false)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
} 