"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"

// Mock data - replace with actual API call
const mockRequest = {
  id: "1",
  title: "Dark Trap Beat",
  artist: "Artist123",
  genre: "Trap",
  mood: "Aggressive",
  budget: "$200-$500",
  deadline: "2024-04-15",
  description: "Looking for a dark, aggressive trap beat with heavy 808s and dark melodies.",
}

export default function SubmitBeatPage({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    beatTitle: "",
    price: "",
    description: "",
    audioFile: null as File | null,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement beat submission logic
    toast({
      title: "Beat Submitted",
      description: "Your beat has been submitted successfully. The artist will review it soon.",
    })
    router.push("/dashboard/beat-requests")
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, audioFile: e.target.files[0] })
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 font-display tracking-wider text-primary">Submit Beat</h1>
        <p className="text-xl text-gray-400 mb-8">Submit your beat for the request: {mockRequest.title}</p>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
            <CardDescription>Review the request details before submitting your beat</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Genre</Label>
                <p className="text-white">{mockRequest.genre}</p>
              </div>
              <div>
                <Label>Mood</Label>
                <p className="text-white">{mockRequest.mood}</p>
              </div>
              <div>
                <Label>Budget</Label>
                <p className="text-white">{mockRequest.budget}</p>
              </div>
              <div>
                <Label>Deadline</Label>
                <p className="text-white">{mockRequest.deadline}</p>
              </div>
              <div>
                <Label>Description</Label>
                <p className="text-white">{mockRequest.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Beat Submission</CardTitle>
            <CardDescription>Fill out the details of your beat submission</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="beatTitle">Beat Title</Label>
                  <Input
                    id="beatTitle"
                    value={formData.beatTitle}
                    onChange={(e) => setFormData({ ...formData, beatTitle: e.target.value })}
                    placeholder="Enter a title for your beat"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="Enter your price"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your beat and any special features..."
                    rows={4}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="audioFile">Audio File</Label>
                  <Input
                    id="audioFile"
                    type="file"
                    accept="audio/*"
                    onChange={handleFileChange}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/dashboard/beat-requests")}
                >
                  Cancel
                </Button>
                <Button type="submit" className="gradient-button">
                  Submit Beat
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 