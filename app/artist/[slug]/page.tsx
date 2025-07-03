"use client"

import React, { useState } from "react"
import { useParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { BeatRating } from '@/components/beats/BeatRating'
import { Search, Music2, Apple, Instagram, Music, Globe } from 'lucide-react'

// Mock data for artists (should match /artists page)
const mockArtists = [
  {
    slug: "alex-beats",
    name: "Alex Beats",
    image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop",
    bio: "Producer from Los Angeles specializing in trap and hip-hop beats.",
    platforms: {
      spotify: 'https://open.spotify.com/artist/alexbeats',
      apple: 'https://music.apple.com/artist/alexbeats',
      instagram: 'https://instagram.com/alexbeats',
      soundcloud: 'https://soundcloud.com/alexbeats',
      website: 'https://alexbeats.com',
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
    ]
  },
  {
    slug: "sarah-melodies",
    name: "Sarah Melodies",
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop",
    bio: "Electronic music producer creating unique soundscapes and melodies.",
    platforms: {
      spotify: 'https://open.spotify.com/artist/sarahmelodies',
      apple: 'https://music.apple.com/artist/sarahmelodies',
      instagram: 'https://instagram.com/sarahmelodies',
      soundcloud: 'https://soundcloud.com/sarahmelodies',
      website: 'https://sarahmelodies.com',
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
  },
  {
    slug: "dj-nova",
    name: "DJ Nova",
    image: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=200&h=200&fit=crop",
    bio: "House and EDM artist with a passion for cosmic rhythms.",
    platforms: {
      spotify: '',
      apple: '',
      instagram: '',
      soundcloud: '',
      website: '',
    },
    beats: []
  },
  {
    slug: "luna-vox",
    name: "Luna Vox",
    image: "https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=200&h=200&fit=crop",
    bio: "Indie pop singer-songwriter and beat creator.",
    platforms: {
      spotify: '',
      apple: '',
      instagram: '',
      soundcloud: '',
      website: '',
    },
    beats: []
  },
]

export default function ArtistSlugPage() {
  const params = useParams()
  const slug = params?.slug as string
  const artist = mockArtists.find(a => a.slug === slug)
  const [search, setSearch] = React.useState("")
  const [sortBy, setSortBy] = React.useState<'plays' | 'rating' | 'date'>('plays')
  const [isFollowing, setIsFollowing] = useState(false)

  if (!artist) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h1 className="text-2xl font-bold mb-4">Artist Not Found</h1>
        <p className="text-gray-400">We couldn't find an artist with that name.</p>
      </div>
    )
  }

  const filteredBeats = (artist.beats || [])
    .filter(beat => beat.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'plays') return b.plays - a.plays
      if (sortBy === 'rating') return b.averageRating - a.averageRating
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

  return (
    <div className="container mx-auto py-12 flex flex-col items-center">
      <Card className="flex flex-col items-center p-8 bg-[#232323] max-w-lg w-full mb-8">
        <img
          src={artist.image}
          alt={artist.name}
          className="w-32 h-32 rounded-full object-cover mb-6 border-2 border-white"
        />
        <h1 className="text-3xl font-bold mb-2">{artist.name}</h1>
        <p className="text-gray-400 text-center text-lg mb-4">{artist.bio}</p>
        {/* Artist Links */}
        <div className="flex gap-4 mt-2 mb-4">
          {artist.platforms?.spotify && (
            <a href={artist.platforms.spotify} target="_blank" rel="noopener noreferrer" title="Spotify">
              <Music2 className="w-6 h-6 text-green-500 hover:scale-110 transition-transform" />
            </a>
          )}
          {artist.platforms?.apple && (
            <a href={artist.platforms.apple} target="_blank" rel="noopener noreferrer" title="Apple Music">
              <Apple className="w-6 h-6 text-pink-500 hover:scale-110 transition-transform" />
            </a>
          )}
          {artist.platforms?.instagram && (
            <a href={artist.platforms.instagram} target="_blank" rel="noopener noreferrer" title="Instagram">
              <Instagram className="w-6 h-6 text-purple-500 hover:scale-110 transition-transform" />
            </a>
          )}
          {artist.platforms?.soundcloud && (
            <a href={artist.platforms.soundcloud} target="_blank" rel="noopener noreferrer" title="SoundCloud">
              <Music className="w-6 h-6 text-orange-500 hover:scale-110 transition-transform" />
            </a>
          )}
          {artist.platforms?.website && (
            <a href={artist.platforms.website} target="_blank" rel="noopener noreferrer" title="Website">
              <Globe className="w-6 h-6 text-blue-400 hover:scale-110 transition-transform" />
            </a>
          )}
        </div>
        {/* Follow Button */}
        <Button
          variant={isFollowing ? "secondary" : "default"}
          onClick={() => setIsFollowing(f => !f)}
          className="w-32"
        >
          {isFollowing ? "Following" : "Follow"}
        </Button>
      </Card>
      {/* Track Layout */}
      <div className="w-full max-w-2xl">
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
          {/* Sorting can be added here if needed */}
        </div>
        <div className="space-y-4">
          {filteredBeats.length === 0 && (
            <div className="text-center text-gray-400">No beats found.</div>
          )}
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
  )
} 