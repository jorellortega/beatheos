"use client"

import { useState } from 'react'
import { Plus, Music, Upload, Calendar, Globe, FileText, CheckCircle2, XCircle, AlertCircle, ExternalLink, Info, FileMusic, FileArchive, FileAudio, File, Music2, Piano, Drum } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'

// Add platform profile types
type ClaimStatus = 'claimed' | 'pending' | 'unclaimed'

type ProfileStatus = 'connected' | 'pending' | 'not_connected'

interface PlatformProfile {
  id: string
  platform: string
  username: string
  status: ProfileStatus
  claimStatus: ClaimStatus
  url?: string
  followers?: number
  monthlyListeners?: number
  lastSynced?: string
  verificationStatus?: 'verified' | 'unverified'
}

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
  plays: number
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
  plays: number
}

// Add audio library item type and mock data
interface AudioLibraryItem {
  id: string;
  name: string;
  type: 'midi' | 'soundkit' | 'loop' | 'patch' | 'sample' | 'clip' | 'other';
  description?: string;
  fileUrl?: string;
}

// Add Top Releases mock data
interface TopRelease {
  id: string;
  title: string;
  artist: string;
  coverArt: string;
  type: 'album' | 'single' | 'track';
  releaseDate: string;
  plays: number;
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
    ],
    plays: 12000,
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
    ],
    plays: 8500,
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
    duration: '3:12',
    plays: 9000,
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
    duration: '2:58',
    plays: 7000,
  }
]

// Mock platform profiles
const mockPlatformProfiles: PlatformProfile[] = [
  {
    id: '1',
    platform: 'Spotify',
    username: 'your_artist_name',
    status: 'connected',
    claimStatus: 'claimed',
    url: 'https://open.spotify.com/artist/your_artist_name',
    followers: 25000,
    monthlyListeners: 45000,
    lastSynced: '2024-03-15',
    verificationStatus: 'verified'
  },
  {
    id: '2',
    platform: 'Apple Music',
    username: 'your_artist_name',
    status: 'connected',
    claimStatus: 'pending',
    url: 'https://music.apple.com/artist/your_artist_name',
    followers: undefined,
    monthlyListeners: undefined,
    lastSynced: undefined,
    verificationStatus: 'verified'
  },
  {
    id: '3',
    platform: 'SoundCloud',
    username: 'your_artist_name',
    status: 'pending',
    claimStatus: 'pending',
    url: 'https://soundcloud.com/your_artist_name',
    followers: undefined,
    monthlyListeners: undefined,
    lastSynced: undefined,
    verificationStatus: 'unverified'
  },
  {
    id: '4',
    platform: 'YouTube Music',
    username: 'your_artist_name',
    status: 'not_connected',
    claimStatus: 'unclaimed',
    verificationStatus: 'unverified'
  },
  {
    id: '5',
    platform: 'TikTok',
    username: 'your_artist_name',
    status: 'not_connected',
    claimStatus: 'unclaimed',
    verificationStatus: 'unverified'
  },
  {
    id: '6',
    platform: 'Instagram Music',
    username: 'your_artist_name',
    status: 'not_connected',
    claimStatus: 'unclaimed',
    verificationStatus: 'unverified'
  }
]

const mockAudioLibrary: AudioLibraryItem[] = [
  { id: '1', name: 'Trap Drum Kit', type: 'soundkit', description: 'Essential trap drums', fileUrl: '#' },
  { id: '2', name: 'Lo-Fi Piano Loop', type: 'loop', description: 'Chill piano loop in C minor', fileUrl: '#' },
  { id: '3', name: '808 Bass Sample', type: 'sample', description: 'Deep 808 bass', fileUrl: '#' },
  { id: '4', name: 'Future RnB MIDI Chords', type: 'midi', description: 'MIDI chord progression', fileUrl: '#' },
  { id: '5', name: 'Serum Pluck Patch', type: 'patch', description: 'Custom pluck for Serum VST', fileUrl: '#' },
  { id: '6', name: 'Vocal Chop Clip', type: 'clip', description: 'Vocal chop for hooks', fileUrl: '#' },
  { id: '7', name: 'FX Riser', type: 'other', description: 'FX riser for transitions', fileUrl: '#' },
];

const mockTopReleases: TopRelease[] = [
  { id: '1', title: 'Midnight Dreams', artist: 'Your Artist Name', coverArt: 'https://picsum.photos/200', type: 'album', releaseDate: '2024-03-15', plays: 12000 },
  { id: '2', title: 'Night Runner', artist: 'Your Artist Name', coverArt: 'https://picsum.photos/210', type: 'single', releaseDate: '2024-04-10', plays: 9000 },
  { id: '3', title: 'Urban Echoes', artist: 'Your Artist Name', coverArt: 'https://picsum.photos/201', type: 'album', releaseDate: '2024-02-01', plays: 8500 },
  { id: '4', title: 'Sunset Drive', artist: 'Your Artist Name', coverArt: 'https://picsum.photos/211', type: 'single', releaseDate: '2024-03-22', plays: 7000 },
];

export default function MyLibrary() {
  const [albums] = useState<Album[]>(mockAlbums)
  const [platformProfiles] = useState<PlatformProfile[]>(mockPlatformProfiles)

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
          <TabsTrigger value="profiles">Music Profiles</TabsTrigger>
          <TabsTrigger value="audio">Audio Library</TabsTrigger>
          <TabsTrigger value="top">Top Releases</TabsTrigger>
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
                      <div className="text-sm text-gray-500 font-semibold">
                        {album.tracks.length} {album.tracks.length === 1 ? 'Track' : 'Tracks'}
                        <span className="ml-4 text-primary font-bold">{album.plays.toLocaleString()} Streams</span>
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
                    <span className="ml-4 text-primary font-bold">{single.plays.toLocaleString()} Streams</span>
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
                <div className="flex flex-col items-end gap-2">
                  <Link href={`/singles/${single.id}`} passHref legacyBehavior>
                    <Button variant="default" size="sm">View</Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="profiles" className="space-y-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Music Platform Profiles</h2>
            <Button variant="outline" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Connect New Platform
            </Button>
          </div>

          <div className="grid gap-4">
            {platformProfiles.map((profile) => (
              <Card key={profile.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
                      <Globe className="h-6 w-6 text-gray-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">{profile.platform}</h3>
                        {profile.verificationStatus === 'verified' && (
                          <Badge variant="default" className="bg-blue-500">Verified</Badge>
                        )}
                        {profile.claimStatus === 'claimed' && (
                          <Badge variant="default" className="bg-green-600">Claimed</Badge>
                        )}
                        {profile.claimStatus === 'pending' && (
                          <Badge variant="secondary" className="bg-yellow-500 text-black">Pending Claim</Badge>
                        )}
                        {profile.claimStatus === 'unclaimed' && (
                          <Badge variant="outline" className="bg-red-500 text-white">Unclaimed</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">@{profile.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="flex gap-8">
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Followers</p>
                        <p className="font-semibold">
                          {profile.claimStatus === 'claimed' && profile.status === 'connected' && profile.followers !== undefined
                            ? profile.followers.toLocaleString()
                            : <span className="text-gray-400 flex items-center gap-1"><Info className="h-4 w-4" />N/A</span>}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Monthly Listeners</p>
                        <p className="font-semibold">
                          {profile.claimStatus === 'claimed' && profile.status === 'connected' && profile.monthlyListeners !== undefined
                            ? profile.monthlyListeners.toLocaleString()
                            : <span className="text-gray-400 flex items-center gap-1"><Info className="h-4 w-4" />N/A</span>}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Last Synced</p>
                        <p className="font-semibold">
                          {profile.claimStatus === 'claimed' && profile.status === 'connected' && profile.lastSynced
                            ? new Date(profile.lastSynced).toLocaleDateString()
                            : <span className="text-gray-400 flex items-center gap-1"><Info className="h-4 w-4" />N/A</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {profile.claimStatus === 'unclaimed' && (
                        <Button variant="outline" size="sm" className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          Claim Profile
                        </Button>
                      )}
                      {profile.claimStatus === 'pending' && (
                        <Button variant="secondary" size="sm" className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          Check Status
                        </Button>
                      )}
                      {profile.claimStatus === 'claimed' && profile.status === 'connected' && profile.url && (
                        <>
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Connected
                          </Badge>
                          <Button variant="outline" size="sm" asChild>
                            <a href={profile.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                              <ExternalLink className="h-4 w-4" />
                              View Profile
                            </a>
                          </Button>
                        </>
                      )}
                      {profile.claimStatus === 'claimed' && profile.status !== 'connected' && (
                        <Button variant="outline" size="sm" className="flex items-center gap-2">
                          <XCircle className="h-4 w-4" />
                          Reconnect
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="audio" className="space-y-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Audio Library</h2>
            <Button variant="outline" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add New Audio File
            </Button>
          </div>
          <div className="grid gap-4">
            {mockAudioLibrary.map((item) => (
              <Card key={item.id} className="p-6 flex items-center gap-6">
                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
                  {item.type === 'midi' && <Piano className="h-6 w-6 text-yellow-400" />}
                  {item.type === 'soundkit' && <Drum className="h-6 w-6 text-red-400" />}
                  {item.type === 'loop' && <Music className="h-6 w-6 text-blue-400" />}
                  {item.type === 'patch' && <Music2 className="h-6 w-6 text-green-400" />}
                  {item.type === 'sample' && <FileAudio className="h-6 w-6 text-purple-400" />}
                  {item.type === 'clip' && <FileMusic className="h-6 w-6 text-pink-400" />}
                  {item.type === 'other' && <File className="h-6 w-6 text-gray-400" />}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{item.name}</h3>
                  <p className="text-sm text-gray-400 mb-1">{item.description}</p>
                  <span className="text-xs text-gray-500 capitalize">{item.type}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={item.fileUrl} download>
                      Download
                    </a>
                  </Button>
                  <Link href={`/audio/${item.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '')}`} passHref legacyBehavior>
                    <Button variant="default" size="sm">View</Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="top" className="space-y-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Top Releases</h2>
          </div>
          <div className="grid gap-4">
            {mockTopReleases.map((release) => (
              <Card key={release.id} className="p-6 flex items-center gap-6">
                <img src={release.coverArt} alt={release.title} className="w-20 h-20 object-cover rounded-lg" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{release.title}</h3>
                  <p className="text-sm text-gray-400 mb-1">{release.artist}</p>
                  <span className="text-xs text-gray-500 capitalize">{release.type} • Released: {new Date(release.releaseDate).toLocaleDateString()}</span>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-right">
                    <span className="text-sm text-gray-400">Plays</span>
                    <div className="text-lg font-bold text-primary">{release.plays.toLocaleString()}</div>
                  </div>
                  <Link href={release.type === 'album' ? `/myalbums/${release.id}` : release.type === 'single' ? `/singles/${release.id}` : '#'} passHref legacyBehavior>
                    <Button variant="default" size="sm">View</Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 