import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from '@/lib/supabaseClient'
import { useToast } from "@/components/ui/use-toast"

interface ProfilePictureUploadProps {
  producerId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploadSuccess: () => void
  currentImageUrl: string
}

export function ProfilePictureUpload({ producerId, open, onOpenChange, onUploadSuccess, currentImageUrl }: ProfilePictureUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setIsLoading(true)

    const fileExt = file.name.split('.').pop()
    const fileName = `${producerId}-${Math.random()}.${fileExt}`
    const filePath = `profiles/${producerId}/profile-pics/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('beats')
      .upload(filePath, file)

    if (uploadError) {
      toast({
        title: "Error",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      })
      setIsLoading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('beats')
      .getPublicUrl(filePath)

    const { error: updateError } = await supabase
      .from('producers')
      .update({ profile_image_url: publicUrl })
      .eq('id', producerId)

    setIsLoading(false)

    if (updateError) {
      toast({
        title: "Error",
        description: "Failed to update profile picture. Please try again.",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success",
        description: "Profile picture updated successfully.",
      })
      onUploadSuccess()
      onOpenChange(false)
    }
  }

  const handleDelete = async () => {
    setIsLoading(true)
    const { error: updateError } = await supabase
      .from('producers')
      .update({ profile_image_url: '/placeholder.svg' })
      .eq('id', producerId)
    setIsLoading(false)
    if (updateError) {
      toast({
        title: "Error",
        description: "Failed to delete profile picture. Please try again.",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success",
        description: "Profile picture removed.",
      })
      onUploadSuccess()
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Profile Picture</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="profile-picture">Choose an image</Label>
            <Input
              id="profile-picture"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />
          </div>
          <DialogFooter>
            <Button onClick={handleUpload} disabled={!file || isLoading}>
              {isLoading ? "Uploading..." : "Upload"}
            </Button>
            {currentImageUrl !== "/placeholder.svg" && (
              <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
                {isLoading ? "Deleting..." : "Delete Picture"}
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
} 