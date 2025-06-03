"use client"

import { useParams } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Music, Calendar, Globe } from 'lucide-react'
import Link from 'next/link'

const mockAlbums = [
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
      { id: '2', title: 'Summer Nights', duration: '4:20', isrc: 'USRC12345679' },
      { id: '3', title: 'Starlit Road', duration: '3:55', isrc: 'USRC12345680' },
      { id: '4', title: 'Neon Skies', duration: '4:10', isrc: 'USRC12345681' },
      { id: '5', title: 'Velvet Moon', duration: '3:50', isrc: 'USRC12345682' },
      { id: '6', title: 'City Lights', duration: '4:05', isrc: 'USRC12345683' },
      { id: '7', title: 'Dreamscape', duration: '3:40', isrc: 'USRC12345684' },
      { id: '8', title: 'After Hours', duration: '4:00', isrc: 'USRC12345685' },
      { id: '9', title: 'Night Drive', duration: '3:35', isrc: 'USRC12345686' },
      { id: '10', title: 'Aurora', duration: '4:15', isrc: 'USRC12345687' }
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

export default function AlbumDetailsPage() {
  const params = useParams() || {}
  const albumId = params && 'albumId' in params ? (Array.isArray(params.albumId) ? params.albumId[0] : params.albumId) : ''
  const album = mockAlbums.find((a) => a.id === albumId)

  if (!album) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">Album Not Found</h1>
        <Link href="/mylibrary">
          <Button variant="default">Back to Library</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <Link href="/mylibrary">
        <Button variant="outline" className="mb-6">&larr; Back to Library</Button>
      </Link>
      <div className="flex gap-8 items-start bg-zinc-900 rounded-xl p-8 shadow-lg">
        <img
          src={album.coverArt}
          alt={album.title}
          className="w-48 h-48 object-cover rounded-lg"
        />
        <div className="flex-1">
          <h1 className="text-4xl font-bold mb-2">{album.title}</h1>
          <p className="text-xl text-gray-400 mb-2">{album.artist}</p>
          <div className="flex items-center gap-2 text-gray-400 mb-4">
            <Calendar className="h-5 w-5" />
            Released: {new Date(album.releaseDate).toLocaleDateString()}
          </div>
          <h2 className="text-lg font-semibold mb-2">Platform Distribution</h2>
          <div className="flex flex-wrap gap-2 mb-6">
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
                className="flex items-center gap-1 px-3 py-1 text-base"
              >
                <Globe className="h-4 w-4" />
                {platform.name}
              </Badge>
            ))}
          </div>
          <h2 className="text-lg font-semibold mb-2">Tracks</h2>
          <div className="space-y-2">
            {album.tracks.map((track, idx) => (
              <div key={track.id} className="flex items-center">
                <div className="w-8 flex-shrink-0 flex justify-center">
                  <span className="font-bold text-lg text-gray-300">{idx + 1}</span>
                </div>
                <div
                  className="flex-1 flex items-center justify-between bg-zinc-800 rounded px-4 py-2 text-base ml-2"
                >
                  <div className="flex items-center gap-2">
                    <Music className="h-5 w-5 text-gray-400" />
                    <span>{track.title}</span>
                  </div>
                  <div className="flex items-center gap-6 text-gray-400">
                    <span>{track.duration}</span>
                    <span>ISRC: {track.isrc}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 