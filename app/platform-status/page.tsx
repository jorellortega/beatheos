"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Globe, 
  Music, 
  Play, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  XCircle,
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  Link as LinkIcon
} from 'lucide-react'
import Link from 'next/link'

interface PlatformStatus {
  id: string
  title: string
  artist: string
  type: 'album' | 'single'
  cover_art_url?: string
  platforms: {
    spotify: { status: 'distributed' | 'pending' | 'failed'; url?: string; date?: string; streams?: number; revenue?: number }
    apple_music: { status: 'distributed' | 'pending' | 'failed'; url?: string; date?: string; streams?: number; revenue?: number }
    youtube_music: { status: 'distributed' | 'pending' | 'failed'; url?: string; date?: string; views?: number; revenue?: number }
    amazon_music: { status: 'distributed' | 'pending' | 'failed'; url?: string; date?: string; streams?: number; revenue?: number }
    tidal: { status: 'distributed' | 'pending' | 'failed'; url?: string; date?: string; streams?: number; revenue?: number }
    deezer: { status: 'distributed' | 'pending' | 'failed'; url?: string; date?: string; streams?: number; revenue?: number }
  }
  distribution_status: 'active' | 'paused' | 'scheduled' | 'draft'
  release_date: string
  total_streams: number
  total_revenue: number
  followers_gained: number
  isrc: string
  upc?: string
  genre: string
  subgenre: string
  mood: string
  energy_level: number
  bpm: number
  key: string
  language: string
  explicit: boolean
  territories: string[]
  distribution_notes?: string
  marketing_notes?: string
  performance_notes?: string
}

const mockPlatformStatus: PlatformStatus[] = [
  {
    id: '1',
    title: 'Midnight Dreams',
    artist: 'Alex Rivera',
    type: 'album',
    cover_art_url: '/placeholder.jpg',
    platforms: {
      spotify: { 
        status: 'distributed', 
        url: 'https://open.spotify.com/album/123', 
        date: '2024-01-15', 
        streams: 15420, 
        revenue: 45.60 
      },
      apple_music: { 
        status: 'distributed', 
        url: 'https://music.apple.com/album/456', 
        date: '2024-01-15', 
        streams: 8920, 
        revenue: 32.10 
      },
      youtube_music: { 
        status: 'distributed', 
        url: 'https://music.youtube.com/album/789', 
        date: '2024-01-15', 
        views: 23400, 
        revenue: 28.90 
      },
      amazon_music: { 
        status: 'pending', 
        date: '2024-01-20' 
      },
      tidal: { 
        status: 'distributed', 
        url: 'https://tidal.com/album/101', 
        date: '2024-01-15', 
        streams: 2100, 
        revenue: 8.40 
      },
      deezer: { 
        status: 'failed', 
        date: '2024-01-15' 
      }
    },
    distribution_status: 'active',
    release_date: '2024-01-15',
    total_streams: 26440,
    total_revenue: 115.00,
    followers_gained: 234,
    isrc: 'USRC12345678',
    upc: '123456789012',
    genre: 'Electronic',
    subgenre: 'House',
    mood: 'Energetic',
    energy_level: 8,
    bpm: 128,
    key: 'C Major',
    language: 'English',
    explicit: false,
    territories: ['US', 'CA', 'UK', 'DE', 'FR', 'JP'],
    distribution_notes: 'Successfully distributed to major platforms. Deezer failed due to metadata issues.',
    marketing_notes: 'Promoted through social media and playlist pitching.',
    performance_notes: 'Strong performance on Spotify, moderate on Apple Music.'
  },
  {
    id: '2',
    title: 'Ocean Waves',
    artist: 'Sarah Chen',
    type: 'single',
    cover_art_url: '/placeholder.jpg',
    platforms: {
      spotify: { 
        status: 'distributed', 
        url: 'https://open.spotify.com/track/321', 
        date: '2024-02-01', 
        streams: 8900, 
        revenue: 26.70 
      },
      apple_music: { 
        status: 'distributed', 
        url: 'https://music.apple.com/track/654', 
        date: '2024-02-01', 
        streams: 5400, 
        revenue: 19.40 
      },
      youtube_music: { 
        status: 'distributed', 
        url: 'https://music.youtube.com/track/987', 
        date: '2024-02-01', 
        views: 15600, 
        revenue: 19.20 
      },
      amazon_music: { 
        status: 'distributed', 
        url: 'https://amazon.com/music/track/111', 
        date: '2024-02-01', 
        streams: 3200, 
        revenue: 9.60 
      },
      tidal: { 
        status: 'distributed', 
        url: 'https://tidal.com/track/222', 
        date: '2024-02-01', 
        streams: 1800, 
        revenue: 7.20 
      },
      deezer: { 
        status: 'distributed', 
        url: 'https://deezer.com/track/333', 
        date: '2024-02-01', 
        streams: 2100, 
        revenue: 6.30 
      }
    },
    distribution_status: 'active',
    release_date: '2024-02-01',
    total_streams: 21400,
    total_revenue: 88.40,
    followers_gained: 156,
    isrc: 'USRC87654321',
    genre: 'Pop',
    subgenre: 'Indie Pop',
    mood: 'Chill',
    energy_level: 6,
    bpm: 95,
    key: 'G Major',
    language: 'English',
    explicit: false,
    territories: ['US', 'CA', 'UK', 'DE', 'FR', 'AU'],
    distribution_notes: 'All platforms successfully distributed. Strong initial performance.',
    marketing_notes: 'Featured in several indie playlists. Social media campaign ongoing.',
    performance_notes: 'Consistent performance across all platforms.'
  },
  {
    id: '3',
    title: 'Urban Nights',
    artist: 'Marcus Johnson',
    type: 'album',
    cover_art_url: '/placeholder.jpg',
    platforms: {
      spotify: { 
        status: 'scheduled', 
        date: '2024-03-01' 
      },
      apple_music: { 
        status: 'scheduled', 
        date: '2024-03-01' 
      },
      youtube_music: { 
        status: 'scheduled', 
        date: '2024-03-01' 
      },
      amazon_music: { 
        status: 'scheduled', 
        date: '2024-03-01' 
      },
      tidal: { 
        status: 'scheduled', 
        date: '2024-03-01' 
      },
      deezer: { 
        status: 'scheduled', 
        date: '2024-03-01' 
      }
    },
    distribution_status: 'scheduled',
    release_date: '2024-03-01',
    total_streams: 0,
    total_revenue: 0,
    followers_gained: 0,
    isrc: 'USRC11223344',
    upc: '987654321098',
    genre: 'Hip Hop',
    subgenre: 'Trap',
    mood: 'Aggressive',
    energy_level: 9,
    bpm: 140,
    key: 'F Minor',
    language: 'English',
    explicit: true,
    territories: ['US', 'CA', 'UK'],
    distribution_notes: 'Scheduled for release on March 1st, 2024.',
    marketing_notes: 'Pre-release campaign planned with influencer partnerships.',
    performance_notes: 'Pre-release buzz building on social media.'
  }
]

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'distributed':
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case 'pending':
      return <Clock className="h-4 w-4 text-yellow-500" />
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500" />
    case 'scheduled':
      return <Calendar className="h-4 w-4 text-blue-500" />
    default:
      return <AlertCircle className="h-4 w-4 text-gray-500" />
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'distributed':
      return 'bg-green-500/10 text-green-500 border-green-500/20'
    case 'pending':
      return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
    case 'failed':
      return 'bg-red-500/10 text-red-500 border-red-500/20'
    case 'scheduled':
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
    default:
      return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
  }
}

export default function PlatformStatusPage() {
  const [selectedType, setSelectedType] = useState<'all' | 'album' | 'single'>('all')

  const filteredItems = selectedType === 'all' 
    ? mockPlatformStatus 
    : mockPlatformStatus.filter(item => item.type === selectedType)

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Platform Status</h1>
          <p className="text-gray-400">Track your music distribution across all platforms</p>
        </div>
        <Link href="/mylibrary">
          <Button variant="outline">&larr; Back to Library</Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Releases</p>
                <p className="text-2xl font-bold">{mockPlatformStatus.length}</p>
              </div>
              <Music className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Streams</p>
                <p className="text-2xl font-bold">
                  {mockPlatformStatus.reduce((sum, item) => sum + item.total_streams, 0).toLocaleString()}
                </p>
              </div>
              <Play className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Revenue</p>
                <p className="text-2xl font-bold">
                  ${mockPlatformStatus.reduce((sum, item) => sum + item.total_revenue, 0).toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Followers Gained</p>
                <p className="text-2xl font-bold">
                  {mockPlatformStatus.reduce((sum, item) => sum + item.followers_gained, 0).toLocaleString()}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs value={selectedType} onValueChange={(value) => setSelectedType(value as any)} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All Releases</TabsTrigger>
          <TabsTrigger value="album">Albums</TabsTrigger>
          <TabsTrigger value="single">Singles</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Releases List */}
      <div className="space-y-6">
        {filteredItems.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <img 
                    src={item.cover_art_url || '/placeholder.jpg'} 
                    alt={item.title}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div>
                    <CardTitle className="text-xl">{item.title}</CardTitle>
                    <CardDescription className="text-lg">{item.artist}</CardDescription>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="capitalize">
                        {item.type}
                      </Badge>
                      <Badge className={getStatusColor(item.distribution_status)}>
                        {item.distribution_status}
                      </Badge>
                      <span className="text-sm text-gray-400">
                        Released: {new Date(item.release_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-500">
                    ${item.total_revenue.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-400">
                    {item.total_streams.toLocaleString()} streams
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {/* Platform Status Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                {Object.entries(item.platforms).map(([platform, data]) => (
                  <div key={platform} className="text-center p-3 border rounded-lg">
                    <div className="flex items-center justify-center mb-2">
                      {getStatusIcon(data.status)}
                    </div>
                    <div className="text-sm font-medium capitalize mb-1">
                      {platform.replace('_', ' ')}
                    </div>
                    <Badge className={`text-xs ${getStatusColor(data.status)}`}>
                      {data.status}
                    </Badge>
                    {data.url && (
                      <a 
                        href={data.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block mt-2 text-blue-500 hover:text-blue-400"
                      >
                        <LinkIcon className="h-3 w-3 mx-auto" />
                      </a>
                    )}
                    {data.streams && (
                      <div className="text-xs text-gray-400 mt-1">
                        {data.streams.toLocaleString()} streams
                      </div>
                    )}
                    {data.views && (
                      <div className="text-xs text-gray-400 mt-1">
                        {data.views.toLocaleString()} views
                      </div>
                    )}
                    {data.revenue && (
                      <div className="text-xs text-green-500 mt-1">
                        ${data.revenue.toFixed(2)}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">ISRC:</span> {item.isrc}
                </div>
                {item.upc && (
                  <div>
                    <span className="text-gray-400">UPC:</span> {item.upc}
                  </div>
                )}
                <div>
                  <span className="text-gray-400">Genre:</span> {item.genre} / {item.subgenre}
                </div>
                <div>
                  <span className="text-gray-400">BPM:</span> {item.bpm} | Key: {item.key}
                </div>
                <div>
                  <span className="text-gray-400">Mood:</span> {item.mood}
                </div>
                <div>
                  <span className="text-gray-400">Energy:</span> {item.energy_level}/10
                </div>
                <div>
                  <span className="text-gray-400">Language:</span> {item.language}
                </div>
                <div>
                  <span className="text-gray-400">Explicit:</span> {item.explicit ? 'Yes' : 'No'}
                </div>
              </div>

              {/* Territories */}
              <div className="mt-4">
                <span className="text-gray-400 text-sm">Territories: </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {item.territories.map((territory) => (
                    <Badge key={territory} variant="outline" className="text-xs">
                      {territory}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {(item.distribution_notes || item.marketing_notes || item.performance_notes) && (
                <div className="mt-6 space-y-3">
                  {item.distribution_notes && (
                    <div>
                      <div className="text-sm font-medium text-gray-400 mb-1">Distribution Notes:</div>
                      <div className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded">
                        {item.distribution_notes}
                      </div>
                    </div>
                  )}
                  {item.marketing_notes && (
                    <div>
                      <div className="text-sm font-medium text-gray-400 mb-1">Marketing Notes:</div>
                      <div className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded">
                        {item.marketing_notes}
                      </div>
                    </div>
                  )}
                  {item.performance_notes && (
                    <div>
                      <div className="text-sm font-medium text-gray-400 mb-1">Performance Notes:</div>
                      <div className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded">
                        {item.performance_notes}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
} 