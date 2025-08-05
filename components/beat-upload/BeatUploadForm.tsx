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
      // Get session for API call
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('You must be logged in to upload beats');
      }

      // Prepare form data for API call
      const formData = new FormData();
      formData.append('title', values.title);
      formData.append('description', '');
      formData.append('genre', values.genre);
      formData.append('bpm', values.bpm);
      formData.append('key', values.key);
      formData.append('tags', JSON.stringify([]));
      formData.append('licensing', JSON.stringify({}));
      formData.append('isDraft', 'false');
      formData.append('mp3File', selectedFile);
      
      if (selectedWavFile) formData.append('wavFile', selectedWavFile);
      if (coverArtFile) formData.append('coverArt', coverArtFile);

      console.log('[DEBUG] Calling /api/beats endpoint');
      const response = await fetch('/api/beats', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('[DEBUG] API response error:', error);
        throw new Error(error.error || 'Failed to upload beat');
      }

      const beat = await response.json();
      console.log('[DEBUG] Beat uploaded successfully:', beat);

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

