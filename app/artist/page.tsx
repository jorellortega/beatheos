"use client"

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Youtube, Music2, Apple, Instagram, Music, Image, Video } from 'lucide-react'
import { BeatRating } from '@/components/beats/BeatRating'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// Mock data for artists
const mockArtists = [
  {
    id: '1',
    name: 'Alex Beats',
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop',
    bio: 'Producer from Los Angeles specializing in trap and hip-hop beats.',
    totalBeats: 45,
    totalPlays: 125000,
    averageRating: 4.5,
    totalSales: 89,
    monthlyListeners: 25000,
    platforms: {
      youtube: 'https://youtube.com/@alexbeats',
      spotify: 'https://open.spotify.com/artist/alexbeats',
      apple: 'https://music.apple.com/artist/alexbeats',
      instagram: 'https://instagram.com/alexbeats',
      soundcloud: 'https://soundcloud.com/alexbeats'
    },
    media: {
      images: [
        'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop'
      ],
      videos: [
        {
          id: 'video1',
          title: 'Studio Session',
          thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&h=600&fit=crop',
          url: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
        },
        {
          id: 'video2',
          title: 'Live Performance',
          thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=600&fit=crop',
          url: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
        }
      ]
    },
    beats: [
      {
        id: '1',
        title: 'Midnight Dreams',
        genre: 'Trap',
        plays: 25000,
        price: 49.99,
        averageRating: 4.8,
        totalRatings: 45,
        createdAt: '2024-03-15'
      },
      {
        id: '2',
        title: 'Summer Vibes',
        genre: 'Hip-Hop',
        plays: 18000,
        price: 39.99,
        averageRating: 4.6,
        totalRatings: 32,
        createdAt: '2024-03-10'
      },
      // Add more mock beats as needed
    ]
  },
  {
    id: '2',
    name: 'Sarah Melodies',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop',
    bio: 'Electronic music producer creating unique soundscapes and melodies.',
    totalBeats: 32,
    totalPlays: 98000,
    averageRating: 4.7,
    totalSales: 76,
    monthlyListeners: 18000,
    platforms: {
      youtube: 'https://youtube.com/@sarahmelodies',
      spotify: 'https://open.spotify.com/artist/sarahmelodies',
      apple: 'https://music.apple.com/artist/sarahmelodies',
      instagram: 'https://instagram.com/sarahmelodies',
      soundcloud: 'https://soundcloud.com/sarahmelodies'
    },
    media: {
      images: [],
      videos: []
    },
    beats: [
      {
        id: '3',
        title: 'Neon Lights',
        genre: 'Electronic',
        plays: 15000,
        price: 59.99,
        averageRating: 4.9,
        totalRatings: 28,
        createdAt: '2024-03-12'
      },
      {
        id: '4',
        title: 'Digital Dreams',
        genre: 'EDM',
        plays: 12000,
        price: 44.99,
        averageRating: 4.7,
        totalRatings: 25,
        createdAt: '2024-03-08'
      },
    ]
  }
]

export default function ArtistPage() {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'plays' | 'rating' | 'date'>('plays')
  const [selectedArtist, setSelectedArtist] = useState(mockArtists[0])
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null)

  const filteredBeats = selectedArtist.beats
    .filter(beat => beat.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'plays') return b.plays - a.plays
      if (sortBy === 'rating') return b.averageRating - a.averageRating
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

  return (
    <div className="container mx-auto py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Artist Profile Card */}
        <Card className="p-6 col-span-1">
          <div className="flex flex-col items-center">
            <img
              src={selectedArtist.image}
              alt={selectedArtist.name}
              className="w-32 h-32 rounded-full object-cover mb-4"
            />
            <h1 className="text-2xl font-bold mb-2">{selectedArtist.name}</h1>
            <p className="text-gray-400 text-center mb-6">{selectedArtist.bio}</p>
            
            <div className="grid grid-cols-2 gap-4 w-full">
              <div className="text-center">
                <div className="text-2xl font-bold">{selectedArtist.totalBeats}</div>
                <div className="text-sm text-gray-400">Total Beats</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{selectedArtist.totalPlays.toLocaleString()}</div>
                <div className="text-sm text-gray-400">Total Plays</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{selectedArtist.averageRating.toFixed(1)}</div>
                <div className="text-sm text-gray-400">Avg Rating</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{selectedArtist.totalSales}</div>
                <div className="text-sm text-gray-400">Total Sales</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Platforms Card */}
        <Card className="p-6 col-span-1">
          <h2 className="text-xl font-bold mb-4">Platforms</h2>
          <div className="space-y-4">
            <a
              href={selectedArtist.platforms.youtube}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg bg-red-600/10 hover:bg-red-600/20 transition-colors"
            >
              <Youtube className="w-6 h-6 text-red-600" />
              <span>YouTube</span>
            </a>
            <a
              href={selectedArtist.platforms.spotify}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg bg-green-600/10 hover:bg-green-600/20 transition-colors"
            >
              <Music2 className="w-6 h-6 text-green-600" />
              <span>Spotify</span>
            </a>
            <a
              href={selectedArtist.platforms.apple}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg bg-pink-600/10 hover:bg-pink-600/20 transition-colors"
            >
              <Apple className="w-6 h-6 text-pink-600" />
              <span>Apple Music</span>
            </a>
            <a
              href={selectedArtist.platforms.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg bg-purple-600/10 hover:bg-purple-600/20 transition-colors"
            >
              <Instagram className="w-6 h-6 text-purple-600" />
              <span>Instagram</span>
            </a>
            <a
              href={selectedArtist.platforms.soundcloud}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg bg-orange-600/10 hover:bg-orange-600/20 transition-colors"
            >
              <Music className="w-6 h-6 text-orange-600" />
              <span>SoundCloud</span>
            </a>
          </div>
        </Card>

        {/* Media Section */}
        <Card className="p-6 col-span-1">
          <h2 className="text-xl font-bold mb-4">Media</h2>
          
          {/* Images */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Image className="w-5 h-5" />
              Photos
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {selectedArtist.media.images.map((image, index) => (
                <div
                  key={index}
                  className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setSelectedImage(image)}
                >
                  <img
                    src={image}
                    alt={`Artist photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Videos */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Video className="w-5 h-5" />
              Videos
            </h3>
            <div className="space-y-3">
              {selectedArtist.media.videos.map((video) => (
                <div
                  key={video.id}
                  className="relative aspect-video rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setSelectedVideo(video.url)}
                >
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Youtube className="w-12 h-12 text-white" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                    <p className="text-white text-sm font-medium">{video.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Image Preview Dialog */}
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Photo Preview</DialogTitle>
            </DialogHeader>
            {selectedImage && (
              <img
                src={selectedImage}
                alt="Preview"
                className="w-full h-auto rounded-lg"
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Video Preview Dialog */}
        <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Video Preview</DialogTitle>
            </DialogHeader>
            {selectedVideo && (
              <div className="aspect-video">
                <iframe
                  src={selectedVideo}
                  className="w-full h-full rounded-lg"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Beats List */}
        <div className="col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center relative flex-1">
              <Input
                type="text"
                placeholder="Search beats..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 bg-secondary text-white focus:bg-accent w-full"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">Sort by:</span>
              <Select value={sortBy} onValueChange={v => setSortBy(v as 'plays' | 'rating' | 'date')}>
                <SelectTrigger className="w-32 bg-secondary text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="plays">Plays</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            {filteredBeats.map((beat) => (
              <Card key={beat.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{beat.title}</h3>
                    <p className="text-sm text-gray-400">{beat.genre}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-gray-400">{beat.plays.toLocaleString()} plays</div>
                      <BeatRating
                        beatId={beat.id}
                        initialAverageRating={beat.averageRating}
                        initialTotalRatings={beat.totalRatings}
                        compact
                      />
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">${beat.price}</div>
                      <Button size="sm" variant="default">Preview</Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 