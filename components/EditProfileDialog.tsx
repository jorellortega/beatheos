import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { createClient } from '@supabase/supabase-js'
import { useToast } from "@/components/ui/use-toast"

interface Producer {
  id: string
  user_id: string
  display_name: string
  bio: string | null
  genres: string[] | null
  location: string | null
  phone: string | null
  instagram: string | null
  twitter: string | null
  youtube: string | null
}

interface EditProfileDialogProps {
  producer: Producer
  open: boolean
  onOpenChange: (open: boolean) => void
  onProfileUpdated: () => void
}

export function EditProfileDialog({ producer, open, onOpenChange, onProfileUpdated }: EditProfileDialogProps) {
  const [formData, setFormData] = useState({
    display_name: producer.display_name,
    bio: producer.bio || "",
    genres: producer.genres?.join(", ") || "",
    location: producer.location || "",
    phone: producer.phone || "",
    instagram: producer.instagram || "",
    twitter: producer.twitter || "",
    youtube: producer.youtube || "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { error } = await supabase
      .from("producers")
      .update({
        display_name: formData.display_name,
        bio: formData.bio,
        genres: formData.genres.split(",").map((g) => g.trim()),
        location: formData.location,
        phone: formData.phone,
        instagram: formData.instagram,
        twitter: formData.twitter,
        youtube: formData.youtube,
      })
      .eq("id", producer.id)

    setIsLoading(false)

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success",
        description: "Profile updated successfully.",
      })
      onProfileUpdated()
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="display_name">Display Name</Label>
            <Input
              id="display_name"
              name="display_name"
              value={formData.display_name}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={4}
            />
          </div>
          <div>
            <Label htmlFor="genres">Genres (comma-separated)</Label>
            <Input
              id="genres"
              name="genres"
              value={formData.genres}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="instagram">Instagram</Label>
            <Input
              id="instagram"
              name="instagram"
              value={formData.instagram}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="twitter">Twitter</Label>
            <Input
              id="twitter"
              name="twitter"
              value={formData.twitter}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="youtube">YouTube</Label>
            <Input
              id="youtube"
              name="youtube"
              value={formData.youtube}
              onChange={handleChange}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 