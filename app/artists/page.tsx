"use client"

import React from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import Link from "next/link"

// Mock data for artists
const mockArtists = [
  {
    id: "1",
    slug: "alex-beats",
    name: "Alex Beats",
    image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop",
    bio: "Producer from Los Angeles specializing in trap and hip-hop beats.",
  },
  {
    id: "2",
    slug: "sarah-melodies",
    name: "Sarah Melodies",
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop",
    bio: "Electronic music producer creating unique soundscapes and melodies.",
  },
  {
    id: "3",
    slug: "dj-nova",
    name: "DJ Nova",
    image: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=200&h=200&fit=crop",
    bio: "House and EDM artist with a passion for cosmic rhythms.",
  },
  {
    id: "4",
    slug: "luna-vox",
    name: "Luna Vox",
    image: "https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=200&h=200&fit=crop",
    bio: "Indie pop singer-songwriter and beat creator.",
  },
]

export default function ArtistsPage() {
  const [search, setSearch] = React.useState("")
  const filteredArtists = mockArtists.filter(artist =>
    artist.name.toLowerCase().includes(search.toLowerCase())
  )
  return (
    <div className="container mx-auto py-12">
      <h1 className="text-3xl font-bold mb-8 text-center">Artists</h1>
      <div className="flex justify-center mb-8">
        <Input
          type="text"
          placeholder="Search artists..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-md"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {filteredArtists.map((artist) => (
          <Link key={artist.id} href={`/artist/${artist.slug}`} className="hover:scale-105 transition-transform">
            <Card className="flex flex-col items-center p-6 bg-[#232323] cursor-pointer">
              <img
                src={artist.image}
                alt={artist.name}
                className="w-24 h-24 rounded-full object-cover mb-4 border-2 border-white"
              />
              <h2 className="text-xl font-semibold mb-2">{artist.name}</h2>
              <p className="text-gray-400 text-center text-sm">{artist.bio}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
} 