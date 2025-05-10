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

// Mock function for handling file uploads
const handleFileUpload = async (file: File, filePath: string) => {
  console.log('Mock file upload:', { file, filePath })
  // Return a mock public URL
  return `https://mock-storage.com/${filePath}`
}

export function BeatUploadForm() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!selectedFile) {
      toast.error("Please select an audio file")
      return
    }

    setIsUploading(true)

    try {
      // Mock user ID for demonstration
      const userId = 'mock-user-id'
      const filePath = `${userId}/${values.title}/${selectedFile.name}`
      
      const publicUrl = await handleFileUpload(selectedFile, filePath)
      
      const beatData = {
        ...values,
        audioUrl: publicUrl,
        producerId: userId,
      }
      
      // Mock API call to save beat data
      console.log('Saving beat data:', beatData)
      
      toast.success("Beat uploaded successfully!")
      form.reset()
      setSelectedFile(null)
    } catch (error) {
      console.error('Error uploading beat:', error)
      toast.error("Failed to upload beat")
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
                <Input placeholder="Musical key" {...field} />
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
                <Input placeholder="Genre" {...field} />
              </FormControl>
              <FormDescription>
                The genre of your beat.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <FormLabel>Audio File</FormLabel>
          <Input
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
          />
          <FormDescription>
            Upload your beat audio file.
          </FormDescription>
        </div>

        <Button type="submit" disabled={isUploading || !selectedFile}>
          {isUploading ? "Uploading..." : "Upload Beat"}
        </Button>
      </form>
    </Form>
  )
}

