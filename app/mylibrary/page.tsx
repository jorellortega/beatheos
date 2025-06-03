"use client"

import { useState } from 'react'
import { Plus, Music, Upload, Calendar, Globe, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'

interface Album {
  id: string
  title: string
  artist: string
  releaseDate: string
  coverArt: string
  platforms: {
    name: string
    status: 'published' | 'pending' | 'not_published'
    url?: string
  }[]
  tracks: {
    id: string
    title: string
    duration: string
    isrc: string
  }[]
}

interface Single {
  id: string
  title: string
  artist: string
  releaseDate: string
  coverArt: string
  platforms: {
    name: string
    status: 'published' | 'pending' | 'not_published'
    url?: string
  }[]
  duration: string
}

const mockAlbums: Album[] = [
  {
    id: '1',
    title: 'Midnight Dreams',
    artist: 'Your Artist Name',
    releaseDate: '2024-03-15',
    coverArt: 'https://picsum.photos/200',
    platforms: [
      { name: 'Spotify', status: 'published', url: 'https://spotify.com/album/1' },
      { name: 'Apple Music', status: 'published', url: 'https://music.apple.com/album/1' },
      { name: 'SoundCloud', status: 'pending' },
      { name: 'YouTube Music', status: 'not_published' }
    ],
    tracks: [
      { id: '1', title: 'Midnight Dreams', duration: '3:45', isrc: 'USRC12345678' },
      { id: '2', title: 'Summer Nights', duration: '4:20', isrc: 'USRC12345679' }
    ]
  },
  {
    id: '2',
    title: 'Urban Echoes',
    artist: 'Your Artist Name',
    releaseDate: '2024-02-01',
    coverArt: 'https://picsum.photos/201',
    platforms: [
      { name: 'Spotify', status: 'published', url: 'https://spotify.com/album/2' },
      { name: 'Apple Music', status: 'published', url: 'https://music.apple.com/album/2' },
      { name: 'SoundCloud', status: 'published', url: 'https://soundcloud.com/album/2' },
      { name: 'YouTube Music', status: 'not_published' }
    ],
    tracks: [
      { id: '1', title: 'Urban Echoes', duration: '3:30', isrc: 'USRC12345680' },
      { id: '2', title: 'City Lights', duration: '4:15', isrc: 'USRC12345681' }
    ]
  }
]

const mockSingles: Single[] = [
  {
    id: '1',
    title: 'Night Runner',
    artist: 'Your Artist Name',
    releaseDate: '2024-04-10',
    coverArt: 'https://picsum.photos/210',
    platforms: [
      { name: 'Spotify', status: 'published', url: 'https://spotify.com/track/1' },
      { name: 'Apple Music', status: 'pending' },
      { name: 'SoundCloud', status: 'published', url: 'https://soundcloud.com/track/1' },
      { name: 'YouTube Music', status: 'not_published' }
    ],
    duration: '3:12'
  },
  {
    id: '2',
    title: 'Sunset Drive',
    artist: 'Your Artist Name',
    releaseDate: '2024-03-22',
    coverArt: 'https://picsum.photos/211',
    platforms: [
      { name: 'Spotify', status: 'published', url: 'https://spotify.com/track/2' },
      { name: 'Apple Music', status: 'published', url: 'https://music.apple.com/track/2' },
      { name: 'SoundCloud', status: 'pending' },
      { name: 'YouTube Music', status: 'not_published' }
    ],
    duration: '2:58'
  }
]

export default function MyLibrary() {
  const [albums] = useState<Album[]>(mockAlbums)

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Library</h1>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add New Album
        </Button>
      </div>

      <Tabs defaultValue="albums" className="space-y-4">
        <TabsList>
          <TabsTrigger value="albums">Albums</TabsTrigger>
          <TabsTrigger value="tracks">Tracks</TabsTrigger>
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
          <TabsTrigger value="singles">Singles</TabsTrigger>
        </TabsList>

        <TabsContent value="albums" className="space-y-4">
          {albums.map((album) => (
            <Card key={album.id} className="p-6">
              <div className="flex gap-6">
                <img
                  src={album.coverArt}
                  alt={album.title}
                  className="w-32 h-32 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-semibold">{album.title}</h2>
                      <p className="text-gray-500">{album.artist}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </Button>
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Link href={`/myalbums/${album.id}`} passHref legacyBehavior>
                        <Button asChild variant="default" size="sm">
                          <span>View Details</span>
                        </Button>
                      </Link>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                      <Calendar className="h-4 w-4" />
                      Released: {new Date(album.releaseDate).toLocaleDateString()}
                    </div>
                    
                    <div className="mt-4">
                      <h3 className="font-medium mb-2">Platform Distribution</h3>
                      <div className="flex flex-wrap gap-2">
                        {album.platforms.map((platform) => (
                          <Badge
                            key={platform.name}
                            variant={
                              platform.status === 'published'
                                ? 'default'
                                : platform.status === 'pending'
                                ? 'secondary'
                                : 'outline'
                            }
                            className="flex items-center gap-1"
                          >
                            <Globe className="h-3 w-3" />
                            {platform.name}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4">
                      <h3 className="font-medium mb-2">Tracks</h3>
                      <div className="space-y-2">
                        {album.tracks.map((track) => (
                          <div
                            key={track.id}
                            className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded"
                          >
                            <div className="flex items-center gap-2">
                              <Music className="h-4 w-4 text-gray-400" />
                              <span>{track.title}</span>
                            </div>
                            <div className="flex items-center gap-4 text-gray-500">
                              <span>{track.duration}</span>
                              <span>ISRC: {track.isrc}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="tracks">
          <div className="text-center py-8 text-gray-500">
            Track management coming soon...
          </div>
        </TabsContent>

        <TabsContent value="platforms">
          <div className="text-center py-8 text-gray-500">
            Platform distribution management coming soon...
          </div>
        </TabsContent>

        <TabsContent value="singles">
          <div className="space-y-4">
            {mockSingles.map((single) => (
              <Card key={single.id} className="p-6 flex gap-6 items-center">
                <img
                  src={single.coverArt}
                  alt={single.title}
                  className="w-24 h-24 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-semibold">{single.title}</h2>
                      <p className="text-gray-500">{single.artist}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                    <Calendar className="h-4 w-4" />
                    Released: {new Date(single.releaseDate).toLocaleDateString()}
                    <span className="ml-4">Duration: {single.duration}</span>
                  </div>
                  <div className="mt-3">
                    <h3 className="font-medium mb-1">Platform Distribution</h3>
                    <div className="flex flex-wrap gap-2">
                      {single.platforms.map((platform) => (
                        <Badge
                          key={platform.name}
                          variant={
                            platform.status === 'published'
                              ? 'default'
                              : platform.status === 'pending'
                              ? 'secondary'
                              : 'outline'
                          }
                          className="flex items-center gap-1"
                        >
                          <Globe className="h-3 w-3" />
                          {platform.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 