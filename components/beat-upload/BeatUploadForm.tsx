"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { FileUploader } from "./FileUploader"
import { Music } from "lucide-react"
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'

const formSchema = z.object({
  title: z.string().min(2, {
    message: "Title must be at least 2 characters.",
  }),
  bpm: z.string().min(2, {
    message: "BPM must be at least 2 characters.",
  }),
  key: z.string().min(1, {
    message: "Key must be at least 1 character.",
  }),
  genre: z.string().min(2, {
    message: "Genre must be at least 2 characters.",
  }),
})

  // Helper function to normalize key notation
  const normalizeKey = (key: string): string => {
    if (!key) return key
    
    // Convert to lowercase for easier processing
    const lowerKey = key.toLowerCase().trim()
    
    // Remove common suffixes and normalize
    const normalized = lowerKey
      .replace(/\s*(minor|min)\b/g, 'm')  // minor, min -> m
      .replace(/\s*(major|maj)\b/g, '')   // major, maj -> (remove)
      .replace(/\s+/g, '')                // remove spaces
    
    // Convert back to proper case (first letter uppercase)
    return normalized.charAt(0).toUpperCase() + normalized.slice(1)
  }

  // Audio type suggestions for auto-complete
  const audioTypeSuggestions = [
    'Melody', 'Bass', 'Lead', 'Pad', 'Pluck', 'Arp', 'Chords', 'Stab',
    'Kick', 'Snare', 'Hi-Hat', 'Clap', 'Crash', 'Ride', 'Tom', 'Percussion',
    'Vocal', 'Adlib', 'Hook', 'Verse', 'Chorus', 'Bridge',
    'FX', 'Reverb', 'Delay', 'Filter', 'Sweep', 'Impact', 'Transition',
    'Melody Loop', 'Drum Loop', 'Bass Loop', 'Vocal Loop', 'FX Loop'
  ]

export function BeatUploadForm() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedWavFile, setSelectedWavFile] = useState<File | null>(null)
  const [coverArtFile, setCoverArtFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const { user } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      bpm: "",
      key: "",
      genre: "",
    },
  })

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleWavFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedWavFile(file)
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!selectedFile) {
      toast.error("Please select an audio file")
      return
    }
    if (!user) {
      toast.error("You must be logged in to upload beats")
      return
    }
    setIsUploading(true)
    try {
      const userId = user.id
      const cleanTitle = values.title.trim().replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_")
      // Helper to sanitize file names (especially for screenshots)
      const sanitizeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_")
      // MP3 upload
      const mp3Ext = selectedFile.name.split('.').pop();
      const mp3Base = selectedFile.name.replace(/\.[^/.]+$/, '');
      const mp3Unique = `${mp3Base}_${Date.now()}-${Math.round(Math.random() * 1e9)}.${mp3Ext}`;
      const mp3Path = `profiles/${userId}/${cleanTitle}/${mp3Unique}`;
      const { data: mp3Upload, error: mp3Error } = await supabase.storage.from('beats').upload(mp3Path, selectedFile, { upsert: true })
      if (mp3Error) throw new Error('MP3 upload failed: ' + (mp3Error.message || JSON.stringify(mp3Error)))
      const { data: { publicUrl: mp3Url } } = supabase.storage.from('beats').getPublicUrl(mp3Path)
      // WAV upload
      let wavUrl = null
      if (selectedWavFile) {
        const wavExt = selectedWavFile.name.split('.').pop();
        const wavBase = selectedWavFile.name.replace(/\.[^/.]+$/, '');
        const wavUnique = `${wavBase}_${Date.now()}-${Math.round(Math.random() * 1e9)}.${wavExt}`;
        const wavPath = `profiles/${userId}/${cleanTitle}/${wavUnique}`;
        const { data: wavUpload, error: wavError } = await supabase.storage.from('beats').upload(wavPath, selectedWavFile, { upsert: true })
        if (wavError) throw new Error('WAV upload failed: ' + (wavError.message || JSON.stringify(wavError)))
        const { data: { publicUrl: wUrl } } = supabase.storage.from('beats').getPublicUrl(wavPath)
        wavUrl = wUrl
      }
      // Cover art upload
      let coverArtUrl = null
      if (coverArtFile) {
        const coverExt = coverArtFile.name.split('.').pop();
        const coverBase = coverArtFile.name.replace(/\.[^/.]+$/, '');
        const coverUnique = `${coverBase}_${Date.now()}-${Math.round(Math.random() * 1e9)}.${coverExt}`;
        const coverPath = `profiles/${userId}/${cleanTitle}/cover/${coverUnique}`;
        const { data: coverUpload, error: coverError } = await supabase.storage.from('beats').upload(coverPath, coverArtFile, { upsert: true })
        if (coverError) throw new Error('Cover art upload failed: ' + (coverError.message || JSON.stringify(coverError)))
        const { data: { publicUrl: cUrl } } = supabase.storage.from('beats').getPublicUrl(coverPath)
        coverArtUrl = cUrl
      }
      // Prepare beat data for backend
      const beatData = {
        ...values,
        mp3_url: mp3Url,
        mp3_path: mp3Path,
        wav_url: wavUrl,
        cover_art_url: coverArtUrl,
        producer_id: userId,
      }
      // Send to backend (replace with your actual API call)
      console.log('Uploading beat with data:', beatData)
      toast.success("Beat uploaded successfully!")
      form.reset()
      setSelectedFile(null)
      setSelectedWavFile(null)
      setCoverArtFile(null)
    } catch (error) {
      console.error('Error uploading beat:', error)
      toast.error(error instanceof Error ? error.message : "Failed to upload beat")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Beat title" {...field} />
              </FormControl>
              <FormDescription>
                This is your beat's display title.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="bpm"
          render={({ field }) => (
            <FormItem>
              <FormLabel>BPM</FormLabel>
              <FormControl>
                <Input placeholder="Beats per minute" {...field} />
              </FormControl>
              <FormDescription>
                The tempo of your beat.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="key"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Key</FormLabel>
              <FormControl>
                <Input 
                  placeholder="e.g., C, Am, F#m, Bb" 
                  {...field} 
                  onChange={(e) => {
                    const normalizedKey = normalizeKey(e.target.value)
                    field.onChange(normalizedKey)
                  }}
                />
              </FormControl>
              <FormDescription>
                The musical key of your beat.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="genre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Genre</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Genre" 
                  {...field} 
                  onChange={(e) => {
                    const value = e.target.value
                    field.onChange(value)
                    
                    // Auto-complete logic for genre
                    if (value.length >= 2) {
                      // First try to find an exact word match (preferred)
                      let suggestion = audioTypeSuggestions.find(suggestion => 
                        suggestion.toLowerCase() === value.toLowerCase()
                      )
                      
                      // If no exact match, try to find a starts-with match
                      if (!suggestion) {
                        suggestion = audioTypeSuggestions.find(suggestion => 
                          suggestion.toLowerCase().startsWith(value.toLowerCase())
                        )
                      }
                      
                      // If still no match, try to find a word that contains the input as a complete word
                      if (!suggestion) {
                        suggestion = audioTypeSuggestions.find(suggestion => {
                          const words = suggestion.toLowerCase().split(' ')
                          return words.some(word => word === value.toLowerCase())
                        })
                      }
                      
                      if (suggestion && suggestion !== value) {
                        // Auto-fill the suggestion
                        setTimeout(() => {
                          field.onChange(suggestion)
                        }, 100)
                      }
                    }
                  }}
                />
              </FormControl>
              <FormDescription>
                The genre of your beat.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <FileUploader
            label="Audio File"
            accept="audio/*"
            file={selectedFile}
            onFileChange={setSelectedFile}
            icon={<Music className="mr-2 h-4 w-4" />}
          />
        </div>

        <div className="space-y-2">
          <FileUploader
            label="WAV File (Optional)"
            accept="audio/wav"
            file={selectedWavFile}
            onFileChange={setSelectedWavFile}
            icon={<Music className="mr-2 h-4 w-4" />}
          />
          <FormDescription>
            Optionally upload a high-quality .wav version of your beat.
          </FormDescription>
        </div>

        <div className="space-y-2">
          <FileUploader
            label="Cover Art"
            accept="image/*"
            file={coverArtFile}
            onFileChange={setCoverArtFile}
            icon={<Music className="mr-2 h-4 w-4" />}
          />
        </div>

        <Button type="submit" disabled={isUploading || !selectedFile}>
          {isUploading ? "Uploading..." : "Upload Beat"}
        </Button>
      </form>
    </Form>
  )
}

