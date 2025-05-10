"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

export default function RequestBeatPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    title: "",
    genre: "",
    mood: "",
    tempo: "",
    budget: "",
    description: "",
    referenceLinks: "",
    deadline: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement beat request submission logic
    toast({
      title: "Beat Request Submitted",
      description: "Your beat request has been submitted successfully. Producers will be able to view and respond to your request.",
    })
    router.push("/dashboard/artist")
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 font-display tracking-wider text-primary">Request a Custom Beat</h1>
        <p className="text-xl text-gray-400 mb-8">Fill out the form below to request a custom beat from our producers</p>

        <Card>
          <CardHeader>
            <CardTitle>Beat Request Details</CardTitle>
            <CardDescription>Provide as much detail as possible to help producers understand your vision</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Beat Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter a title for your beat request"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="genre">Genre</Label>
                  <Select
                    value={formData.genre}
                    onValueChange={(value) => setFormData({ ...formData, genre: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a genre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hip_hop">Hip Hop</SelectItem>
                      <SelectItem value="trap">Trap</SelectItem>
                      <SelectItem value="r&b">R&B</SelectItem>
                      <SelectItem value="pop">Pop</SelectItem>
                      <SelectItem value="electronic">Electronic</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="mood">Mood</Label>
                  <Select
                    value={formData.mood}
                    onValueChange={(value) => setFormData({ ...formData, mood: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a mood" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aggressive">Aggressive</SelectItem>
                      <SelectItem value="chill">Chill</SelectItem>
                      <SelectItem value="emotional">Emotional</SelectItem>
                      <SelectItem value="energetic">Energetic</SelectItem>
                      <SelectItem value="melancholic">Melancholic</SelectItem>
                      <SelectItem value="upbeat">Upbeat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="tempo">Tempo (BPM)</Label>
                  <Input
                    id="tempo"
                    type="number"
                    value={formData.tempo}
                    onChange={(e) => setFormData({ ...formData, tempo: e.target.value })}
                    placeholder="Enter desired BPM"
                    min="60"
                    max="200"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="budget">Budget Range</Label>
                  <Select
                    value={formData.budget}
                    onValueChange={(value) => setFormData({ ...formData, budget: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your budget range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50-100">$50 - $100</SelectItem>
                      <SelectItem value="100-200">$100 - $200</SelectItem>
                      <SelectItem value="200-500">$200 - $500</SelectItem>
                      <SelectItem value="500+">$500+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Detailed Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the beat you're looking for in detail..."
                    rows={4}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="referenceLinks">Reference Links (Optional)</Label>
                  <Textarea
                    id="referenceLinks"
                    value={formData.referenceLinks}
                    onChange={(e) => setFormData({ ...formData, referenceLinks: e.target.value })}
                    placeholder="Paste links to reference tracks or examples..."
                    rows={2}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="deadline">Deadline (Optional)</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/dashboard/artist")}
                >
                  Cancel
                </Button>
                <Button type="submit" className="gradient-button">
                  Submit Request
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 