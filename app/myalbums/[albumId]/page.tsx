"use client"

import { useParams } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Music, Calendar, Globe, FileText, CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import React from 'react'

// Add status types
type TrackStatus = 'ready' | 'processing' | 'error' | 'pending'

// Define interfaces
interface Track {
  id: string
  title: string
  duration: string
  isrc: string
  status: TrackStatus
}

interface Platform {
  name: string
  status: 'published' | 'pending' | 'not_published'
  url?: string
}

interface Album {
  id: string
  title: string
  artist: string
  releaseDate: string
  coverArt: string
  platforms: Platform[]
  tracks: Track[]
}

// Update mock data to include status
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
      { id: '1', title: 'Midnight Dreams', duration: '3:45', isrc: 'USRC12345678', status: 'ready' },
      { id: '2', title: 'Summer Nights', duration: '4:20', isrc: 'USRC12345679', status: 'processing' },
      { id: '3', title: 'Starlit Road', duration: '3:55', isrc: 'USRC12345680', status: 'error' },
      { id: '4', title: 'Neon Skies', duration: '4:10', isrc: 'USRC12345681', status: 'pending' },
      { id: '5', title: 'Velvet Moon', duration: '3:50', isrc: 'USRC12345682', status: 'ready' },
      { id: '6', title: 'City Lights', duration: '4:05', isrc: 'USRC12345683', status: 'ready' },
      { id: '7', title: 'Dreamscape', duration: '3:40', isrc: 'USRC12345684', status: 'ready' },
      { id: '8', title: 'After Hours', duration: '4:00', isrc: 'USRC12345685', status: 'ready' },
      { id: '9', title: 'Night Drive', duration: '3:35', isrc: 'USRC12345686', status: 'ready' },
      { id: '10', title: 'Aurora', duration: '4:15', isrc: 'USRC12345687', status: 'ready' }
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
      { id: '1', title: 'Urban Echoes', duration: '3:30', isrc: 'USRC12345680', status: 'ready' },
      { id: '2', title: 'City Lights', duration: '4:15', isrc: 'USRC12345681', status: 'ready' }
    ]
  }
]

// Status configuration
const statusConfig = {
  ready: {
    icon: CheckCircle2,
    color: 'text-green-500',
    label: 'Ready'
  },
  processing: {
    icon: Clock,
    color: 'text-yellow-500',
    label: 'Processing'
  },
  error: {
    icon: AlertCircle,
    color: 'text-red-500',
    label: 'Error'
  },
  pending: {
    icon: XCircle,
    color: 'text-gray-500',
    label: 'Pending'
  }
} as const

// Add mock platform stream data
const mockPlatformStreams = [
  { name: 'Spotify', count: 7000 },
  { name: 'Apple Music', count: 3000 },
  { name: 'SoundCloud', count: 1500 },
  { name: 'YouTube Music', count: 500 },
];
const totalStreams = mockPlatformStreams.reduce((sum, p) => sum + p.count, 0);

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
      {/* Stream Count Card */}
      <div className="mb-8">
        <div className="bg-black border border-primary rounded-xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-lg">
          <div>
            <h2 className="text-lg font-bold text-primary mb-2">Stream Counts</h2>
            <div className="flex flex-wrap gap-4 mb-2">
              {mockPlatformStreams.map((platform) => (
                <div key={platform.name} className="flex items-center gap-2 bg-zinc-900 px-4 py-2 rounded-lg">
                  <span className="font-semibold text-white">{platform.name}:</span>
                  <span className="text-primary font-bold">{platform.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-end justify-center">
            <span className="text-sm text-gray-400">Total Streams</span>
            <span className="text-3xl font-bold text-primary">{totalStreams.toLocaleString()}</span>
          </div>
        </div>
      </div>
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
            {album.platforms.map((platform, idx) => (
              <React.Fragment key={platform.name}>
                <Badge
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
                {platform.name === 'Spotify' && (
                  <Badge key="publishing" variant="secondary" className="flex items-center gap-1 px-3 py-1 text-base bg-green-700 text-white">
                    Publishing
                  </Badge>
                )}
              </React.Fragment>
            ))}
          </div>
          <h2 className="text-lg font-semibold mb-2">Tracks</h2>
          <div className="space-y-2">
            {album.tracks.map((track, idx) => {
              const StatusIcon = statusConfig[track.status].icon
              return (
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="flex items-center gap-2">
                            <StatusIcon className={`h-4 w-4 ${statusConfig[track.status].color}`} />
                            <span className={statusConfig[track.status].color}>
                              {statusConfig[track.status].label}
                            </span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span>Ready</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-yellow-500" />
                            <span>Processing</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-red-500" />
                            <span>Error</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-gray-500" />
                            <span>Pending</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Link href={`/trackfiles/${track.id}`}>
                        <Button variant="outline" size="sm" className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Files
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
} 