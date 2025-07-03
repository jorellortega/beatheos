"use client"

import React, { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Play } from "lucide-react"
import { Input } from "@/components/ui/input"

// Mock music tracks
const mockTracks = [
  {
    id: "1",
    title: "Midnight Dreams",
    artist: "Alex Beats",
    cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop",
    audioUrl: "#",
  },
  {
    id: "2",
    title: "Neon Lights",
    artist: "Sarah Melodies",
    cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
    audioUrl: "#",
  },
  {
    id: "3",
    title: "Summer Vibes",
    artist: "Alex Beats",
    cover: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&h=400&fit=crop",
    audioUrl: "#",
  },
  {
    id: "4",
    title: "Digital Dreams",
    artist: "Sarah Melodies",
    cover: "https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=400&h=400&fit=crop",
    audioUrl: "#",
  },
]

// Mock top 10 data
const topSongs = [
  { id: '1', title: 'Midnight Dreams', artist: 'Alex Beats', cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop' },
  { id: '2', title: 'Neon Lights', artist: 'Sarah Melodies', cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop' },
  { id: '3', title: 'Summer Vibes', artist: 'Alex Beats', cover: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=200&h=200&fit=crop' },
  { id: '4', title: 'Digital Dreams', artist: 'Sarah Melodies', cover: 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=200&h=200&fit=crop' },
  { id: '5', title: 'Cosmic Shuffle', artist: 'DJ Nova', cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=200&fit=crop' },
  { id: '6', title: 'Eternal Loops', artist: 'Luna Vox', cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&h=200&fit=crop' },
  { id: '7', title: 'Rhythm Forge', artist: 'DJ Nova', cover: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=200&h=200&fit=crop' },
  { id: '8', title: 'Beat Vault', artist: 'Alex Beats', cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop' },
  { id: '9', title: 'Loop Stacker', artist: 'Sarah Melodies', cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=200&fit=crop' },
  { id: '10', title: 'Shuffle', artist: 'Luna Vox', cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&h=200&fit=crop' },
]
const topAlbums = [
  { id: '1', title: 'Dreamscapes', artist: 'Alex Beats', cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop' },
  { id: '2', title: 'Neon Nights', artist: 'Sarah Melodies', cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop' },
  { id: '3', title: 'Cosmic Journey', artist: 'DJ Nova', cover: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=200&h=200&fit=crop' },
  { id: '4', title: 'Lunar Echoes', artist: 'Luna Vox', cover: 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=200&h=200&fit=crop' },
  { id: '5', title: 'Trap City', artist: 'Alex Beats', cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=200&fit=crop' },
  { id: '6', title: 'Electric Dreams', artist: 'Sarah Melodies', cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&h=200&fit=crop' },
  { id: '7', title: 'House Party', artist: 'DJ Nova', cover: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=200&h=200&fit=crop' },
  { id: '8', title: 'Indie Pop', artist: 'Luna Vox', cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop' },
  { id: '9', title: 'Beatheos', artist: 'Alex Beats', cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=200&fit=crop' },
  { id: '10', title: 'Melody Lane', artist: 'Sarah Melodies', cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&h=200&fit=crop' },
]
const topArtists = [
  { id: '1', name: 'Alex Beats', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop' },
  { id: '2', name: 'Sarah Melodies', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop' },
  { id: '3', name: 'DJ Nova', image: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=200&h=200&fit=crop' },
  { id: '4', name: 'Luna Vox', image: 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=200&h=200&fit=crop' },
  { id: '5', name: 'Beat Master', image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=200&fit=crop' },
  { id: '6', name: 'Groove King', image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&h=200&fit=crop' },
  { id: '7', name: 'Electro Queen', image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=200&h=200&fit=crop' },
  { id: '8', name: 'Trap Lord', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop' },
  { id: '9', name: 'Indie Star', image: 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=200&h=200&fit=crop' },
  { id: '10', name: 'Pop Icon', image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&h=200&fit=crop' },
]

export default function MusicPage() {
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  const filteredTracks = mockTracks.filter(
    (track) =>
      track.title.toLowerCase().includes(search.toLowerCase()) ||
      track.artist.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="container mx-auto py-12">
      <h1 className="text-3xl font-bold mb-8 text-center">Listen to Music</h1>
      {/* Second Search Bar (below heading, above Top 10 sections) */}
      <div className="flex justify-center mb-8">
        <Input
          type="text"
          placeholder="Search by title or artist..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-md"
        />
      </div>
      {/* Top 10 Sections */}
      <div className="mb-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Top 10 Songs */}
        <div>
          <h2 className="text-xl font-bold mb-4 text-center">Top 10 Songs</h2>
          <div className="space-y-3">
            {topSongs.map((song, i) => (
              <Card key={song.id} className="flex items-center gap-4 p-3 bg-[#181818]">
                <span className="text-lg font-bold w-6 text-center">{i + 1}</span>
                <img src={song.cover} alt={song.title} className="w-10 h-10 rounded object-cover" />
                <div className="flex-1">
                  <div className="font-semibold">{song.title}</div>
                  <div className="text-xs text-gray-400">{song.artist}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
        {/* Top 10 Albums */}
        <div>
          <h2 className="text-xl font-bold mb-4 text-center">Top 10 Albums</h2>
          <div className="space-y-3">
            {topAlbums.map((album, i) => (
              <Card key={album.id} className="flex items-center gap-4 p-3 bg-[#181818]">
                <span className="text-lg font-bold w-6 text-center">{i + 1}</span>
                <img src={album.cover} alt={album.title} className="w-10 h-10 rounded object-cover" />
                <div className="flex-1">
                  <div className="font-semibold">{album.title}</div>
                  <div className="text-xs text-gray-400">{album.artist}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
        {/* Top 10 Artists */}
        <div>
          <h2 className="text-xl font-bold mb-4 text-center">Top 10 Artists</h2>
          <div className="space-y-3">
            {topArtists.map((artist, i) => (
              <Card key={artist.id} className="flex items-center gap-4 p-3 bg-[#181818]">
                <span className="text-lg font-bold w-6 text-center">{i + 1}</span>
                <img src={artist.image} alt={artist.name} className="w-10 h-10 rounded-full object-cover" />
                <div className="flex-1">
                  <div className="font-semibold">{artist.name}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
      {/* Existing Search and Track Grid Search Bar */}
      <div className="flex justify-center mb-8">
        <Input
          type="text"
          placeholder="Search by title or artist..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-md"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {filteredTracks.map((track) => (
          <Card key={track.id} className="flex flex-col items-center p-6 bg-[#232323]">
            <img
              src={track.cover}
              alt={track.title}
              className="w-32 h-32 rounded-lg object-cover mb-4 border-2 border-white"
            />
            <h2 className="text-lg font-semibold mb-1">{track.title}</h2>
            <p className="text-gray-400 text-sm mb-4">{track.artist}</p>
            <Button
              onClick={() => setPlayingId(track.id)}
              variant={playingId === track.id ? "secondary" : "default"}
              className="w-24 flex items-center justify-center"
            >
              <Play className="w-5 h-5 mr-2" />
              {playingId === track.id ? "Playing" : "Play"}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
} 