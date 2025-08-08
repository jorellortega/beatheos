"use client"

import { useState, useEffect } from 'react'
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Star, 
  TrendingUp, 
  Users, 
  Music, 
  Globe, 
  Calendar,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Award,
  BarChart3,
  Target,
  DollarSign,
  Headphones,
  Mic,
  Guitar,
  Drum,
  Piano,
  FileText,
  Settings,
  RefreshCw,
  ArrowUpDown,
  Star as StarIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'

// Types
interface Artist {
  id: string
  name: string
  stage_name?: string
  real_name?: string
  email?: string
  phone?: string
  bio?: string
  image_url?: string
  status: 'active' | 'inactive' | 'pending' | 'suspended' | 'archived'
  rank: 'A' | 'B' | 'C' | 'D' | 'E'
  priority: 'high' | 'medium' | 'low'
  genre: string
  subgenre?: string
  location: string
  country: string
  followers: number
  monthly_listeners: number
  total_streams: number
  revenue: number
  contract_start: string
  contract_end?: string
  royalty_rate: number
  distributors: string[]
  manager?: string
  agent?: string
  social_media: {
    instagram?: string
    twitter?: string
    tiktok?: string
    youtube?: string
  }
  releases: number
  upcoming_releases: number
  last_activity: string
  notes?: string
  tags: string[]
  performance_score: number
  growth_rate: number
  engagement_rate: number
  market_potential: number
}

interface Distributor {
  id: string
  name: string
  type: 'major' | 'independent' | 'digital' | 'regional'
  status: 'active' | 'inactive'
  commission_rate: number
  territories: string[]
  genres: string[]
}

// Mock Data
const mockArtists: Artist[] = [
  {
    id: '1',
    name: 'Alex Rivera',
    stage_name: 'ALEX R',
    real_name: 'Alexandra Rivera',
    email: 'alex@label.com',
    phone: '+1-555-0123',
    bio: 'Rising star in the electronic dance music scene with a unique blend of Latin rhythms and modern EDM.',
    image_url: '/placeholder-artist-1.jpg',
    status: 'active',
    rank: 'A',
    priority: 'high',
    genre: 'Electronic',
    subgenre: 'EDM',
    location: 'Los Angeles',
    country: 'USA',
    followers: 125000,
    monthly_listeners: 450000,
    total_streams: 25000000,
    revenue: 85000,
    contract_start: '2023-01-15',
    contract_end: '2026-01-15',
    royalty_rate: 15,
    distributors: ['Sony Music', 'Spotify', 'Apple Music'],
    manager: 'Sarah Johnson',
    agent: 'Mike Chen',
    social_media: {
      instagram: '@alexr_music',
      twitter: '@alexr_official',
      tiktok: '@alexr_tiktok',
      youtube: 'ALEX R Official'
    },
    releases: 8,
    upcoming_releases: 2,
    last_activity: '2024-01-15',
    notes: 'High potential artist with strong social media presence. Consider increasing marketing budget.',
    tags: ['rising star', 'social media savvy', 'high engagement'],
    performance_score: 92,
    growth_rate: 15.5,
    engagement_rate: 8.7,
    market_potential: 95
  },
  {
    id: '2',
    name: 'Marcus Thompson',
    stage_name: 'MARCUS T',
    real_name: 'Marcus Thompson',
    email: 'marcus@label.com',
    phone: '+1-555-0124',
    bio: 'Hip-hop artist known for conscious lyrics and innovative production.',
    image_url: '/placeholder-artist-2.jpg',
    status: 'active',
    rank: 'B',
    priority: 'medium',
    genre: 'Hip-Hop',
    subgenre: 'Conscious Hip-Hop',
    location: 'New York',
    country: 'USA',
    followers: 89000,
    monthly_listeners: 320000,
    total_streams: 18000000,
    revenue: 62000,
    contract_start: '2022-08-20',
    contract_end: '2025-08-20',
    royalty_rate: 12,
    distributors: ['Universal Music', 'Tidal', 'SoundCloud'],
    manager: 'David Wilson',
    agent: 'Lisa Park',
    social_media: {
      instagram: '@marcust_official',
      twitter: '@marcust_hiphop',
      youtube: 'Marcus T Music'
    },
    releases: 12,
    upcoming_releases: 1,
    last_activity: '2024-01-10',
    notes: 'Consistent performer with loyal fanbase. Consider expanding to international markets.',
    tags: ['conscious rap', 'loyal fanbase', 'consistent'],
    performance_score: 78,
    growth_rate: 8.2,
    engagement_rate: 6.5,
    market_potential: 82
  },
  {
    id: '3',
    name: 'Sophia Chen',
    stage_name: 'SOPHIA',
    real_name: 'Sophia Chen',
    email: 'sophia@label.com',
    phone: '+1-555-0125',
    bio: 'Pop singer-songwriter with powerful vocals and emotional storytelling.',
    image_url: '/placeholder-artist-3.jpg',
    status: 'active',
    rank: 'A',
    priority: 'high',
    genre: 'Pop',
    subgenre: 'Pop-Rock',
    location: 'Nashville',
    country: 'USA',
    followers: 210000,
    monthly_listeners: 780000,
    total_streams: 45000000,
    revenue: 120000,
    contract_start: '2021-03-10',
    contract_end: '2026-03-10',
    royalty_rate: 18,
    distributors: ['Warner Music', 'Spotify', 'Apple Music', 'Amazon Music'],
    manager: 'Jennifer Lee',
    agent: 'Robert Martinez',
    social_media: {
      instagram: '@sophia_official',
      twitter: '@sophia_music',
      tiktok: '@sophia_tiktok',
      youtube: 'Sophia Official'
    },
    releases: 15,
    upcoming_releases: 3,
    last_activity: '2024-01-18',
    notes: 'Top performer with excellent streaming numbers. Ready for major festival bookings.',
    tags: ['top performer', 'high revenue', 'festival ready'],
    performance_score: 96,
    growth_rate: 22.1,
    engagement_rate: 9.8,
    market_potential: 98
  },
  {
    id: '4',
    name: 'Jake Williams',
    stage_name: 'JAKE W',
    real_name: 'Jake Williams',
    email: 'jake@label.com',
    phone: '+1-555-0126',
    bio: 'Country artist with traditional roots and modern appeal.',
    image_url: '/placeholder-artist-4.jpg',
    status: 'active',
    rank: 'C',
    priority: 'low',
    genre: 'Country',
    subgenre: 'Modern Country',
    location: 'Austin',
    country: 'USA',
    followers: 45000,
    monthly_listeners: 180000,
    total_streams: 8500000,
    revenue: 35000,
    contract_start: '2023-06-15',
    contract_end: '2025-06-15',
    royalty_rate: 10,
    distributors: ['Sony Music', 'Spotify'],
    manager: 'Tom Anderson',
    agent: 'Rachel Green',
    social_media: {
      instagram: '@jakew_country',
      twitter: '@jakew_official'
    },
    releases: 5,
    upcoming_releases: 0,
    last_activity: '2024-01-05',
    notes: 'Steady performer in country market. Consider regional tour opportunities.',
    tags: ['country', 'regional', 'steady'],
    performance_score: 65,
    growth_rate: 5.3,
    engagement_rate: 4.2,
    market_potential: 68
  },
  {
    id: '5',
    name: 'Emma Rodriguez',
    stage_name: 'EMMA R',
    real_name: 'Emma Rodriguez',
    email: 'emma@label.com',
    phone: '+1-555-0127',
    bio: 'R&B singer with soulful voice and contemporary sound.',
    image_url: '/placeholder-artist-5.jpg',
    status: 'pending',
    rank: 'B',
    priority: 'medium',
    genre: 'R&B',
    subgenre: 'Contemporary R&B',
    location: 'Atlanta',
    country: 'USA',
    followers: 67000,
    monthly_listeners: 250000,
    total_streams: 12000000,
    revenue: 48000,
    contract_start: '2023-11-01',
    contract_end: '2026-11-01',
    royalty_rate: 13,
    distributors: ['Universal Music', 'Spotify', 'Apple Music'],
    manager: 'Carlos Rodriguez',
    agent: 'Amanda White',
    social_media: {
      instagram: '@emmar_official',
      twitter: '@emmar_music',
      youtube: 'Emma R Official'
    },
    releases: 6,
    upcoming_releases: 1,
    last_activity: '2024-01-12',
    notes: 'Promising R&B artist with growing fanbase. Contract renewal pending.',
    tags: ['promising', 'growing fanbase', 'contract pending'],
    performance_score: 74,
    growth_rate: 12.8,
    engagement_rate: 7.1,
    market_potential: 79
  }
]

const mockDistributors: Distributor[] = [
  {
    id: '1',
    name: 'Sony Music',
    type: 'major',
    status: 'active',
    commission_rate: 15,
    territories: ['Global'],
    genres: ['All']
  },
  {
    id: '2',
    name: 'Universal Music',
    type: 'major',
    status: 'active',
    commission_rate: 18,
    territories: ['Global'],
    genres: ['All']
  },
  {
    id: '3',
    name: 'Warner Music',
    type: 'major',
    status: 'active',
    commission_rate: 16,
    territories: ['Global'],
    genres: ['All']
  },
  {
    id: '4',
    name: 'Spotify',
    type: 'digital',
    status: 'active',
    commission_rate: 12,
    territories: ['Global'],
    genres: ['All']
  },
  {
    id: '5',
    name: 'Apple Music',
    type: 'digital',
    status: 'active',
    commission_rate: 13,
    territories: ['Global'],
    genres: ['All']
  },
  {
    id: '6',
    name: 'Tidal',
    type: 'digital',
    status: 'active',
    commission_rate: 14,
    territories: ['Global'],
    genres: ['All']
  },
  {
    id: '7',
    name: 'SoundCloud',
    type: 'digital',
    status: 'active',
    commission_rate: 10,
    territories: ['Global'],
    genres: ['All']
  },
  {
    id: '8',
    name: 'Amazon Music',
    type: 'digital',
    status: 'active',
    commission_rate: 11,
    territories: ['Global'],
    genres: ['All']
  }
]

export default function ArtistList() {
  const [artists, setArtists] = useState<Artist[]>(mockArtists)
  const [distributors] = useState<Distributor[]>(mockDistributors)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [rankFilter, setRankFilter] = useState<string>('all')
  const [genreFilter, setGenreFilter] = useState<string>('all')
  const [selectedTab, setSelectedTab] = useState('overview')
  const [showAddArtistDialog, setShowAddArtistDialog] = useState(false)
  const [showEditArtistDialog, setShowEditArtistDialog] = useState(false)
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null)
  const [sortBy, setSortBy] = useState<string>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const { toast } = useToast()

  // Filter and sort artists
  const filteredArtists = artists
    .filter(artist => {
      const matchesSearch = artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          artist.stage_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          artist.genre.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'all' || artist.status === statusFilter
      const matchesRank = rankFilter === 'all' || artist.rank === rankFilter
      const matchesGenre = genreFilter === 'all' || artist.genre === genreFilter
      
      return matchesSearch && matchesStatus && matchesRank && matchesGenre
    })
    .sort((a, b) => {
      let aValue: any
      let bValue: any
      
      switch (sortBy) {
        case 'name':
          aValue = a.name
          bValue = b.name
          break
        case 'rank':
          aValue = a.rank
          bValue = b.rank
          break
        case 'revenue':
          aValue = a.revenue
          bValue = b.revenue
          break
        case 'followers':
          aValue = a.followers
          bValue = b.followers
          break
        case 'performance_score':
          aValue = a.performance_score
          bValue = b.performance_score
          break
        default:
          aValue = a.name
          bValue = b.name
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

  // Statistics
  const totalArtists = artists.length
  const activeArtists = artists.filter(a => a.status === 'active').length
  const totalRevenue = artists.reduce((sum, a) => sum + a.revenue, 0)
  const totalFollowers = artists.reduce((sum, a) => sum + a.followers, 0)
  const avgPerformanceScore = artists.reduce((sum, a) => sum + a.performance_score, 0) / artists.length

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'suspended': return 'bg-red-100 text-red-800'
      case 'archived': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRankColor = (rank: string) => {
    switch (rank) {
      case 'A': return 'bg-purple-100 text-purple-800'
      case 'B': return 'bg-blue-100 text-blue-800'
      case 'C': return 'bg-green-100 text-green-800'
      case 'D': return 'bg-yellow-100 text-yellow-800'
      case 'E': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleAddArtist = () => {
    // Mock implementation
    toast({
      title: "Success",
      description: "Artist added successfully!",
    })
    setShowAddArtistDialog(false)
  }

  const handleEditArtist = () => {
    // Mock implementation
    toast({
      title: "Success",
      description: "Artist updated successfully!",
    })
    setShowEditArtistDialog(false)
    setSelectedArtist(null)
  }

  const handleDeleteArtist = (artistId: string) => {
    // Mock implementation
    setArtists(prev => prev.filter(a => a.id !== artistId))
    toast({
      title: "Success",
      description: "Artist deleted successfully!",
    })
  }

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Artist Management</h1>
          <p className="text-gray-600">Manage your label's artist roster and track performance</p>
        </div>
        <Button onClick={() => setShowAddArtistDialog(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Artist
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Artists</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalArtists}</div>
            <p className="text-xs text-muted-foreground">
              {activeArtists} active
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Monthly revenue
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Followers</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFollowers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Combined followers
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Performance</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgPerformanceScore.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              Performance score
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search artists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={rankFilter} onValueChange={setRankFilter}>
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="Rank" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ranks</SelectItem>
            <SelectItem value="A">A Rank</SelectItem>
            <SelectItem value="B">B Rank</SelectItem>
            <SelectItem value="C">C Rank</SelectItem>
            <SelectItem value="D">D Rank</SelectItem>
            <SelectItem value="E">E Rank</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={genreFilter} onValueChange={setGenreFilter}>
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="Genre" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Genres</SelectItem>
            <SelectItem value="Electronic">Electronic</SelectItem>
            <SelectItem value="Hip-Hop">Hip-Hop</SelectItem>
            <SelectItem value="Pop">Pop</SelectItem>
            <SelectItem value="Country">Country</SelectItem>
            <SelectItem value="R&B">R&B</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="rank">Rank</SelectItem>
            <SelectItem value="revenue">Revenue</SelectItem>
            <SelectItem value="followers">Followers</SelectItem>
            <SelectItem value="performance_score">Performance</SelectItem>
          </SelectContent>
        </Select>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
        >
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      </div>

      {/* Artist List */}
      <div className="grid gap-4">
        {filteredArtists.map((artist) => (
          <Card key={artist.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Artist Image and Basic Info */}
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <img
                      src={artist.image_url || '/placeholder-artist.jpg'}
                      alt={artist.name}
                      className="w-20 h-20 rounded-full object-cover"
                    />
                    <div className="absolute -top-1 -right-1">
                      <Badge className={getRankColor(artist.rank)}>
                        {artist.rank}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-semibold">{artist.name}</h3>
                      {artist.stage_name && artist.stage_name !== artist.name && (
                        <span className="text-sm text-gray-500">({artist.stage_name})</span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge className={getStatusColor(artist.status)}>
                        {artist.status}
                      </Badge>
                      <Badge className={getPriorityColor(artist.priority)}>
                        {artist.priority} priority
                      </Badge>
                      <Badge variant="outline">
                        {artist.genre}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">{artist.bio}</p>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Followers:</span>
                        <div className="font-semibold">{artist.followers.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Monthly Listeners:</span>
                        <div className="font-semibold">{artist.monthly_listeners.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Revenue:</span>
                        <div className="font-semibold">${artist.revenue.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Performance:</span>
                        <div className="font-semibold">{artist.performance_score}/100</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-col gap-2 lg:ml-auto">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedArtist(artist)
                        setShowEditArtistDialog(true)
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Download className="h-4 w-4 mr-2" />
                          Export Data
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <BarChart3 className="h-4 w-4 mr-2" />
                          View Analytics
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Globe className="h-4 w-4 mr-2" />
                          Manage Distributors
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDeleteArtist(artist.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Artist
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  {/* Distributors */}
                  <div className="text-sm">
                    <span className="text-gray-500">Distributors:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {artist.distributors.map((distributor, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {distributor}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Artist Dialog */}
      <Dialog open={showAddArtistDialog} onOpenChange={setShowAddArtistDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Artist</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Artist Name</Label>
              <Input id="name" placeholder="Enter artist name" />
            </div>
            <div>
              <Label htmlFor="stage_name">Stage Name</Label>
              <Input id="stage_name" placeholder="Enter stage name" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="Enter email" />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" placeholder="Enter phone number" />
            </div>
            <div>
              <Label htmlFor="genre">Genre</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select genre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="electronic">Electronic</SelectItem>
                  <SelectItem value="hip-hop">Hip-Hop</SelectItem>
                  <SelectItem value="pop">Pop</SelectItem>
                  <SelectItem value="country">Country</SelectItem>
                  <SelectItem value="r&b">R&B</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input id="location" placeholder="Enter location" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" placeholder="Enter artist bio" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddArtistDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddArtist}>
              Add Artist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Artist Dialog */}
      <Dialog open={showEditArtistDialog} onOpenChange={setShowEditArtistDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Artist</DialogTitle>
          </DialogHeader>
          {selectedArtist && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Artist Name</Label>
                <Input id="edit-name" defaultValue={selectedArtist.name} />
              </div>
              <div>
                <Label htmlFor="edit-stage-name">Stage Name</Label>
                <Input id="edit-stage-name" defaultValue={selectedArtist.stage_name} />
              </div>
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input id="edit-email" type="email" defaultValue={selectedArtist.email} />
              </div>
              <div>
                <Label htmlFor="edit-phone">Phone</Label>
                <Input id="edit-phone" defaultValue={selectedArtist.phone} />
              </div>
              <div>
                <Label htmlFor="edit-genre">Genre</Label>
                <Select defaultValue={selectedArtist.genre}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Electronic">Electronic</SelectItem>
                    <SelectItem value="Hip-Hop">Hip-Hop</SelectItem>
                    <SelectItem value="Pop">Pop</SelectItem>
                    <SelectItem value="Country">Country</SelectItem>
                    <SelectItem value="R&B">R&B</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-location">Location</Label>
                <Input id="edit-location" defaultValue={selectedArtist.location} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="edit-bio">Bio</Label>
                <Textarea id="edit-bio" defaultValue={selectedArtist.bio} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditArtistDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditArtist}>
              Update Artist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
