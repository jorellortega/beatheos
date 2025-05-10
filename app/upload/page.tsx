"use client"

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload } from 'lucide-react'

export default function UploadPage() {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement beat upload logic
    console.log('Beat uploaded:', { title, description, file })
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 font-display tracking-wider text-primary">Upload Your Beat</h1>
      <Card className="w-full max-w-md mx-auto bg-card border-primary">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary">Beat Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-300">Title</label>
              <Input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="bg-secondary text-white"
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-300">Description</label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-secondary text-white"
                rows={4}
              />
            </div>
            <div>
              <label htmlFor="file" className="block text-sm font-medium text-gray-300">Beat File</label>
              <Input
                id="file"
                type="file"
                accept="audio/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
                className="bg-secondary text-white"
              />
            </div>
            <Button type="submit" className="w-full gradient-button text-black font-medium hover:text-white">
              <Upload className="mr-2 h-4 w-4" />
              Upload Beat
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

