"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, Loader } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { toast } from "@/components/ui/use-toast"

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function UploadPage() {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Auto-save draft to localStorage
  useEffect(() => {
    const draft = { title, description, file: file ? file.name : null };
    localStorage.setItem('beatDraft', JSON.stringify(draft));
  }, [title, description, file]);

  // Load draft from localStorage on page load
  useEffect(() => {
    const savedDraft = localStorage.getItem('beatDraft');
    if (savedDraft) {
      const { title, description, file } = JSON.parse(savedDraft);
      setTitle(title);
      setDescription(description);
      // Optionally, restore the file if you can
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted'); // Debug log

    if (!file || !user) {
      toast({
        title: "Error",
        description: "Please select a file and ensure you're logged in.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsUploading(true);
      console.log('Starting upload process'); // Debug log

      // Upload file to Supabase Storage
      const { data: fileData, error: fileError } = await supabase.storage
        .from('beats')
        .upload(`${user.id}/${file.name}`, file);

      if (fileError) {
        console.error('File upload error:', fileError); // Debug log
        throw new Error(`Error uploading file: ${fileError.message}`);
      }

      console.log('File uploaded successfully'); // Debug log

      // Get the public URL of the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('beats')
        .getPublicUrl(`${user.id}/${file.name}`);

      // Save beat details to the beats table
      const { data: beatData, error: beatError } = await supabase
        .from('beats')
        .insert({
          title,
          description,
          mp3_url: publicUrl,
          producer_id: user.id,
          play_count: 0,
          price: 0
        });

      if (beatError) {
        console.error('Database error:', beatError); // Debug log
        throw new Error(`Error saving beat: ${beatError.message}`);
      }

      console.log('Beat saved to database'); // Debug log
      
      toast({
        title: "Success",
        description: "Beat uploaded successfully!",
      });

      // Reset form
      setTitle('');
      setDescription('');
      setFile(null);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred during upload",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
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
                disabled={isUploading}
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
                disabled={isUploading}
              />
            </div>
            <div>
              <label htmlFor="file" className="block text-sm font-medium text-gray-300">Beat File</label>
              <Input
                id="file"
                type="file"
                accept="audio/*"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0];
                  console.log('File selected:', selectedFile?.name); // Debug log
                  setFile(selectedFile || null);
                }}
                required
                className="bg-secondary text-white"
                disabled={isUploading}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full gradient-button text-black font-medium hover:text-white"
              disabled={isUploading || !file}
              onClick={() => console.log('Button clicked')} // Debug log
            >
              {isUploading ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Beat
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

