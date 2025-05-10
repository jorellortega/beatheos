"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileAudio, Music, Search, Filter, Play, Pause } from "lucide-react"
import Image from "next/image"

interface SoundItem {
  id: string
  title: string
  description: string
  price: number
  type: 'soundkit' | 'loop'
  category: string
  previewUrl: string
  coverUrl: string
  tags: string[]
  isPlaying: boolean
}

export default function MarketplacePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("soundkits")
  const [playingItem, setPlayingItem] = useState<string | null>(null)

  // Mock data - replace with actual data from your backend
  const soundItems: SoundItem[] = [
    {
      id: "1",
      title: "Trap Essentials Kit",
      description: "Premium trap drum kit with 100+ high-quality sounds",
      price: 29.99,
      type: "soundkit",
      category: "trap",
      previewUrl: "/previews/trap-kit.mp3",
      coverUrl: "/covers/trap-kit.jpg",
      tags: ["trap", "drums", "kicks", "snares"],
      isPlaying: false
    },
    {
      id: "2",
      title: "Lo-Fi Loop Pack",
      description: "Chill lo-fi loops perfect for your next project",
      price: 19.99,
      type: "loop",
      category: "lofi",
      previewUrl: "/previews/lofi-loop.mp3",
      coverUrl: "/covers/lofi-loop.jpg",
      tags: ["lofi", "chill", "ambient"],
      isPlaying: false
    },
    {
      id: "3",
      title: "Hip Hop Drum Kit",
      description: "Classic hip hop drum samples and one-shots",
      price: 24.99,
      type: "soundkit",
      category: "hiphop",
      previewUrl: "/previews/hiphop-kit.mp3",
      coverUrl: "/covers/hiphop-kit.jpg",
      tags: ["hiphop", "drums", "samples"],
      isPlaying: false
    },
    {
      id: "4",
      title: "R&B Chord Progressions",
      description: "Smooth R&B chord progressions and melodies",
      price: 22.99,
      type: "loop",
      category: "rnb",
      previewUrl: "/previews/rnb-loops.mp3",
      coverUrl: "/covers/rnb-loops.jpg",
      tags: ["rnb", "chords", "melodies"],
      isPlaying: false
    },
    {
      id: "5",
      title: "Electronic Bass Pack",
      description: "Powerful electronic bass sounds and presets",
      price: 27.99,
      type: "soundkit",
      category: "electronic",
      previewUrl: "/previews/electronic-bass.mp3",
      coverUrl: "/covers/electronic-bass.jpg",
      tags: ["electronic", "bass", "synth"],
      isPlaying: false
    },
    {
      id: "6",
      title: "Pop Vocal Chops",
      description: "Modern pop vocal chops and adlibs",
      price: 21.99,
      type: "loop",
      category: "pop",
      previewUrl: "/previews/pop-vocals.mp3",
      coverUrl: "/covers/pop-vocals.jpg",
      tags: ["pop", "vocals", "chops"],
      isPlaying: false
    }
  ]

  const categories = [
    { id: "soundkits", name: "Soundkits" },
    { id: "loops", name: "Loops" },
  ]

  const genreCategories = [
    { id: "trap", name: "Trap" },
    { id: "lofi", name: "Lo-Fi" },
    { id: "hiphop", name: "Hip Hop" },
    { id: "electronic", name: "Electronic" },
    { id: "rnb", name: "R&B" },
    { id: "pop", name: "Pop" },
  ]

  const handlePlayPreview = (itemId: string) => {
    setPlayingItem(playingItem === itemId ? null : itemId)
  }

  const filteredItems = soundItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    
    if (selectedCategory === "soundkits") {
      return matchesSearch && item.type === "soundkit"
    } else if (selectedCategory === "loops") {
      return matchesSearch && item.type === "loop"
    } else {
      return matchesSearch && item.category === selectedCategory
    }
  })

  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Sound Marketplace</h1>
          <p className="text-gray-400">Discover and purchase high-quality soundkits and loops</p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search sounds..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-secondary"
          />
        </div>
      </div>

      <Tabs defaultValue="soundkits" className="mb-8">
        <TabsList className="grid w-full grid-cols-2">
          {categories.map(category => (
            <TabsTrigger
              key={category.id}
              value={category.id}
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap gap-2 mb-8">
        {genreCategories.map(genre => (
          <Button
            key={genre.id}
            variant={selectedCategory === genre.id ? "default" : "outline"}
            onClick={() => setSelectedCategory(genre.id)}
            className="rounded-full"
          >
            {genre.name}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map(item => (
          <Card key={item.id} className="overflow-hidden hover:border-primary transition-all">
            <div className="relative aspect-square">
              <Image
                src={item.coverUrl}
                alt={item.title}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30"
                  onClick={() => handlePlayPreview(item.id)}
                >
                  {playingItem === item.id ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6" />
                  )}
                </Button>
              </div>
            </div>
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {item.type === "soundkit" ? (
                    <FileAudio className="w-4 h-4 text-blue-400" />
                  ) : (
                    <Music className="w-4 h-4 text-purple-400" />
                  )}
                  <span className="text-sm text-gray-400">
                    {item.type === "soundkit" ? "Sound Kit" : "Loop Pack"}
                  </span>
                </div>
                <div className="text-lg font-semibold">${item.price}</div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {item.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-secondary text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <Button className="w-full mt-4">Add to Cart</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
} 