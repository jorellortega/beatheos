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
  EyeOff,
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
  Star as StarIcon,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

// Types
interface ChecklistItem {
  id: string
  category: 'music_rights' | 'social_media' | 'legal' | 'marketing' | 'business'
  task: string
  completed: boolean
  date_completed?: string
  notes?: string
}

interface ProductionScheduleItem {
  id?: string
  user_id?: string
  title: string
  description?: string
  type: 'collaboration' | 'song_production' | 'beat_production' | 'mixing' | 'mastering' | 'recording' | 'other'
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  scheduled_date: string
  due_date: string
  assigned_to?: string
  collaborators?: string[]
  project_id?: string
  project_type?: 'album' | 'single' | 'track' | 'other'
  notes?: string
  budget?: number
  currency?: string
  location?: string
  equipment_needed?: string[]
  artist_name?: string
  created_at?: string
  updated_at?: string
}

interface SampleClearance {
  id: string
  sample_name: string
  original_artist: string
  original_song: string
  usage_type: 'interpolation' | 'direct_sample' | 'replay' | 'interpolation_replay'
  clearance_status: 'pending' | 'approved' | 'denied' | 'not_required'
  cleared_date?: string
  clearance_cost?: number
  usage_percentage?: number
  notes?: string
  contact_info?: string
}

interface PublishingRights {
  id: string
  song_title: string
  writers: string[]
  publishers: string[]
  publishing_splits: { [writer: string]: number }
  mechanical_license: boolean
  sync_license_available: boolean
  territory_restrictions?: string[]
  notes?: string
}

interface RightsMetadata {
  // Identification Codes
  isrc_codes: { [song_title: string]: string }
  upc_codes: { [release_title: string]: string }
  
  // Copyright & Publishing
  publishing_rights: PublishingRights[]
  master_rights_owner: string
  publishing_administrator?: string
  
  // Sample Clearances
  sample_clearances: SampleClearance[]
  
  // Sync & Licensing
  sync_licensing_contact?: string
  mechanical_licensing_agency?: string
  performance_rights_org: 'ASCAP' | 'BMI' | 'SESAC' | 'Other' | 'None'
  
  // Legal Documents
  copyright_registrations: { [song_title: string]: { registration_number?: string; filed_date?: string; status: 'pending' | 'registered' | 'rejected' } }
  
  // Additional Metadata
  producer_credits: { [song_title: string]: string[] }
  featured_artist_clearances: { [song_title: string]: { artist: string; cleared: boolean; date?: string } }
  
  // Notes & Documentation
  rights_notes?: string
  legal_contact?: string
  last_updated?: string
}

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
  artist_class: 'superstar' | 'platinum' | 'gold' | 'silver' | 'bronze' | 'emerging' | 'indie'
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
  streaming_platforms: {
    spotify?: {
      monthly_listeners: number
      followers: number
      streams: number
    }
    apple_music?: {
      monthly_listeners: number
      followers: number
      streams: number
    }
    youtube_music?: {
      subscribers: number
      views: number
      streams: number
    }
    tidal?: {
      followers: number
      streams: number
    }
    amazon_music?: {
      followers: number
      streams: number
    }
    soundcloud?: {
      followers: number
      plays: number
    }
  }
  checklist: ChecklistItem[]
  rights_metadata: RightsMetadata
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

// Remove this section - will be moved inside component

// Old mock data (keeping for reference, will be removed)
const mockArtistsReference: Artist[] = [
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
    artist_class: 'gold',
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
    streaming_platforms: {
      spotify: {
        monthly_listeners: 450000,
        followers: 125000,
        streams: 15000000
      },
      apple_music: {
        monthly_listeners: 180000,
        followers: 89000,
        streams: 8500000
      },
      youtube_music: {
        subscribers: 95000,
        views: 12000000,
        streams: 1500000
      },
      tidal: {
        followers: 15000,
        streams: 350000
      }
    },
    checklist: [
      {
        id: '1',
        category: 'music_rights',
        task: 'Claim music rights and royalties',
        completed: true,
        date_completed: '2024-01-10',
        notes: 'All tracks claimed via ASCAP'
      },
      {
        id: '2',
        category: 'social_media',
        task: 'Collect Instagram account details',
        completed: true,
        date_completed: '2024-01-05'
      },
      {
        id: '3',
        category: 'social_media',
        task: 'Collect TikTok account details',
        completed: true,
        date_completed: '2024-01-05'
      },
      {
        id: '4',
        category: 'social_media',
        task: 'Collect YouTube channel details',
        completed: true,
        date_completed: '2024-01-05'
      },
      {
        id: '5',
        category: 'legal',
        task: 'Contract signed and executed',
        completed: true,
        date_completed: '2023-01-15'
      },
      {
        id: '6',
        category: 'marketing',
        task: 'Press kit completed',
        completed: false
      },
      {
        id: '7',
        category: 'business',
        task: 'Bank details and tax forms collected',
        completed: true,
        date_completed: '2023-01-20'
      }
    ],
    rights_metadata: {
      isrc_codes: {
        'Electric Dreams': 'USUM72301234',
        'Neon Nights': 'USUM72301235',
        'Pulse Wave': 'USUM72301236'
      },
      upc_codes: {
        'Electric Dreams EP': '123456789012',
        'Summer Vibes Album': '123456789013'
      },
      publishing_rights: [
        {
          id: '1',
          song_title: 'Electric Dreams',
          writers: ['Alex Rivera', 'Mike Producer'],
          publishers: ['Dream Music Publishing', 'Beat Label Publishing'],
          publishing_splits: { 'Alex Rivera': 60, 'Mike Producer': 40 },
          mechanical_license: true,
          sync_license_available: true,
          notes: 'Available for sync licensing in all territories'
        }
      ],
      master_rights_owner: 'Beat Marketplace Records',
      publishing_administrator: 'Dream Music Publishing',
      sample_clearances: [
        {
          id: '1',
          sample_name: 'Vintage Synth Loop',
          original_artist: 'Classic Electronic',
          original_song: 'Synth Symphony',
          usage_type: 'direct_sample',
          clearance_status: 'approved',
          cleared_date: '2023-01-20',
          clearance_cost: 2500,
          usage_percentage: 15,
          notes: 'Cleared for worldwide use'
        }
      ],
      performance_rights_org: 'ASCAP',
      copyright_registrations: {
        'Electric Dreams': { registration_number: 'PA2023-001234', filed_date: '2023-02-01', status: 'registered' },
        'Neon Nights': { filed_date: '2023-03-15', status: 'pending' }
      },
      producer_credits: {
        'Electric Dreams': ['Mike Producer', 'Alex Rivera'],
        'Neon Nights': ['Sarah Beats', 'Alex Rivera']
      },
      featured_artist_clearances: {
        'Electric Dreams': { artist: 'Luna Vocalist', cleared: true, date: '2023-01-10' }
      },
      legal_contact: 'legal@beatmarketplace.com',
      last_updated: '2024-01-15'
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
    artist_class: 'silver',
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
    streaming_platforms: {
      spotify: {
        monthly_listeners: 320000,
        followers: 89000,
        streams: 12000000
      },
      apple_music: {
        monthly_listeners: 145000,
        followers: 67000,
        streams: 6000000
      },
      tidal: {
        followers: 25000,
        streams: 950000
      },
      soundcloud: {
        followers: 45000,
        plays: 2500000
      }
    },
    checklist: [
      {
        id: '1',
        category: 'music_rights',
        task: 'Claim music rights and royalties',
        completed: true,
        date_completed: '2023-12-15'
      },
      {
        id: '2',
        category: 'social_media',
        task: 'Collect Instagram account details',
        completed: true,
        date_completed: '2022-08-25'
      },
      {
        id: '3',
        category: 'social_media',
        task: 'Collect Twitter account details',
        completed: true,
        date_completed: '2022-08-25'
      },
      {
        id: '4',
        category: 'social_media',
        task: 'Collect TikTok account details',
        completed: false
      },
      {
        id: '5',
        category: 'legal',
        task: 'Contract signed and executed',
        completed: true,
        date_completed: '2022-08-20'
      },
      {
        id: '6',
        category: 'marketing',
        task: 'Press kit completed',
        completed: true,
        date_completed: '2023-01-10'
      }
    ],
    rights_metadata: {
      isrc_codes: {
        'Street Chronicles': 'USUM72301240',
        'Real Talk': 'USUM72301241'
      },
      upc_codes: {
        'Chronicles Album': '123456789020'
      },
      publishing_rights: [],
      master_rights_owner: 'Beat Marketplace Records',
      sample_clearances: [
        {
          id: '1',
          sample_name: 'Jazz Piano Sample',
          original_artist: 'Classic Jazz Trio',
          original_song: 'Sunday Morning',
          usage_type: 'interpolation',
          clearance_status: 'pending',
          notes: 'Waiting for publisher response'
        }
      ],
      performance_rights_org: 'BMI',
      copyright_registrations: {},
      producer_credits: {},
      featured_artist_clearances: {},
      legal_contact: 'legal@beatmarketplace.com',
      last_updated: '2023-12-20'
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
    artist_class: 'platinum',
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
    streaming_platforms: {
      spotify: {
        monthly_listeners: 780000,
        followers: 210000,
        streams: 28000000
      },
      apple_music: {
        monthly_listeners: 350000,
        followers: 165000,
        streams: 17000000
      },
      youtube_music: {
        subscribers: 180000,
        views: 25000000,
        streams: 3200000
      },
      amazon_music: {
        followers: 95000,
        streams: 8500000
      },
      tidal: {
        followers: 32000,
        streams: 1200000
      }
    },
    checklist: [
      {
        id: '1',
        category: 'music_rights',
        task: 'Claim music rights and royalties',
        completed: true,
        date_completed: '2021-04-01'
      },
      {
        id: '2',
        category: 'social_media',
        task: 'Collect all social media accounts',
        completed: true,
        date_completed: '2021-03-15'
      },
      {
        id: '3',
        category: 'legal',
        task: 'Contract signed and executed',
        completed: true,
        date_completed: '2021-03-10'
      },
      {
        id: '4',
        category: 'marketing',
        task: 'Press kit completed',
        completed: true,
        date_completed: '2021-05-20'
      },
      {
        id: '5',
        category: 'marketing',
        task: 'Radio promotion setup',
        completed: true,
        date_completed: '2022-01-15'
      }
    ],
    rights_metadata: {
      isrc_codes: { 'Heartbreak Anthem': 'USUM72301250', 'Dancing Alone': 'USUM72301251', 'Golden Hour': 'USUM72301252' },
      upc_codes: { 'Pop Princess Album': '123456789030' },
      publishing_rights: [{ id: '1', song_title: 'Heartbreak Anthem', writers: ['Sophia Chen'], publishers: ['Pop Publishing'], publishing_splits: { 'Sophia Chen': 100 }, mechanical_license: true, sync_license_available: true }],
      master_rights_owner: 'Beat Marketplace Records',
      sample_clearances: [],
      performance_rights_org: 'ASCAP',
      copyright_registrations: { 'Heartbreak Anthem': { registration_number: 'PA2023-002000', status: 'registered' } },
      producer_credits: { 'Heartbreak Anthem': ['Top Producer', 'Sophia Chen'] },
      featured_artist_clearances: {},
      legal_contact: 'legal@beatmarketplace.com',
      last_updated: '2024-01-10'
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
    artist_class: 'bronze',
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
    streaming_platforms: {
      spotify: {
        monthly_listeners: 180000,
        followers: 45000,
        streams: 6500000
      },
      apple_music: {
        monthly_listeners: 85000,
        followers: 28000,
        streams: 2000000
      }
    },
    checklist: [
      {
        id: '1',
        category: 'music_rights',
        task: 'Claim music rights and royalties',
        completed: false
      },
      {
        id: '2',
        category: 'social_media',
        task: 'Collect Instagram account details',
        completed: true,
        date_completed: '2023-06-20'
      },
      {
        id: '3',
        category: 'social_media',
        task: 'Collect Twitter account details',
        completed: true,
        date_completed: '2023-06-20'
      },
      {
        id: '4',
        category: 'legal',
        task: 'Contract signed and executed',
        completed: true,
        date_completed: '2023-06-15'
      },
      {
        id: '5',
        category: 'marketing',
        task: 'Press kit completed',
        completed: false
      }
    ],
    rights_metadata: {
      isrc_codes: { 'Country Road': 'USUM72301260' },
      upc_codes: {},
      publishing_rights: [],
      master_rights_owner: 'Beat Marketplace Records',
      sample_clearances: [],
      performance_rights_org: 'ASCAP',
      copyright_registrations: {},
      producer_credits: {},
      featured_artist_clearances: {},
      legal_contact: 'legal@beatmarketplace.com',
      last_updated: '2023-08-01'
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
    artist_class: 'emerging',
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
    streaming_platforms: {
      spotify: {
        monthly_listeners: 250000,
        followers: 67000,
        streams: 9000000
      },
      apple_music: {
        monthly_listeners: 120000,
        followers: 48000,
        streams: 3000000
      },
      youtube_music: {
        subscribers: 45000,
        views: 8500000,
        streams: 850000
      }
    },
    checklist: [
      {
        id: '1',
        category: 'music_rights',
        task: 'Claim music rights and royalties',
        completed: false
      },
      {
        id: '2',
        category: 'social_media',
        task: 'Collect Instagram account details',
        completed: true,
        date_completed: '2023-11-05'
      },
      {
        id: '3',
        category: 'social_media',
        task: 'Collect YouTube account details',
        completed: true,
        date_completed: '2023-11-05'
      },
      {
        id: '4',
        category: 'legal',
        task: 'Contract signed and executed',
        completed: false,
        notes: 'Contract pending - waiting for legal review'
      },
      {
        id: '5',
        category: 'business',
        task: 'Bank details and tax forms collected',
        completed: false
      }
    ],
    rights_metadata: {
      isrc_codes: {},
      upc_codes: {},
      publishing_rights: [],
      master_rights_owner: 'Beat Marketplace Records',
      sample_clearances: [],
      performance_rights_org: 'None',
      copyright_registrations: {},
      producer_credits: {},
      featured_artist_clearances: {},
      legal_contact: 'legal@beatmarketplace.com',
      last_updated: '2023-11-15'
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
  // Auth
  const { user } = useAuth()
  const supabase = createClientComponentClient()
  const router = useRouter()
  
  // Database Data
  const [artists, setArtists] = useState<Artist[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [distributors] = useState<Distributor[]>(mockDistributors)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [rankFilter, setRankFilter] = useState<string>('all')
  const [genreFilter, setGenreFilter] = useState<string>('all')
  const [classFilter, setClassFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [selectedTab, setSelectedTab] = useState('overview')
  const [showAddArtistDialog, setShowAddArtistDialog] = useState(false)
  const [showEditArtistDialog, setShowEditArtistDialog] = useState(false)
  const [showChecklistDialog, setShowChecklistDialog] = useState(false)
  const [showScheduleReleaseDialog, setShowScheduleReleaseDialog] = useState(false)
  const [showRightsManagementDialog, setShowRightsManagementDialog] = useState(false)
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null)
  const [sortBy, setSortBy] = useState<string>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const { toast } = useToast()

  // Add artist form state
  const [newArtistForm, setNewArtistForm] = useState({
    name: '',
    stage_name: '',
    email: '',
    phone: '',
    genre: '',
    location: '',
    bio: ''
  })

  // Image upload state (for Add Artist)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImages, setUploadingImages] = useState(false)

  // Edit artist form state
  const [editArtistForm, setEditArtistForm] = useState({
    name: '',
    stage_name: '',
    email: '',
    phone: '',
    genre: '',
    location: '',
    bio: ''
  })

  // Image upload state (for Edit Artist)
  const [editThumbnailFile, setEditThumbnailFile] = useState<File | null>(null)
  const [editThumbnailPreview, setEditThumbnailPreview] = useState<string | null>(null)
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null)
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null)
  const [editImageFile, setEditImageFile] = useState<File | null>(null)
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null)
  const [uploadingEditImages, setUploadingEditImages] = useState(false)

  // Streaming platforms visibility state
  const [showStreamingPlatforms, setShowStreamingPlatforms] = useState<{[key: string]: boolean}>({})

  const toggleStreamingPlatforms = (artistId: string) => {
    setShowStreamingPlatforms(prev => ({
      ...prev,
      [artistId]: !prev[artistId]
    }))
  }

  // Artist card expand/collapse state (default: all collapsed)
  const [expandedCards, setExpandedCards] = useState<{[key: string]: boolean}>({})

  const toggleCard = (artistId: string) => {
    setExpandedCards(prev => ({
      ...prev,
      [artistId]: !prev[artistId]
    }))
  }

  // Image upload handlers
  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setThumbnailFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeThumbnail = () => {
    setThumbnailFile(null)
    setThumbnailPreview(null)
  }

  const removeLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
  }

  // Fetch artists from database
  const fetchArtists = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔍 [ARTISTLIST] Starting fetchArtists...')
      console.log('🔍 [ARTISTLIST] User from AuthContext:', user ? `${user.id} (${user.email})` : 'NO USER')
      
      if (!user) {
        console.log('❌ [ARTISTLIST] No user from AuthContext')
        setError('Please log in to view artists')
        setArtists([])
        setLoading(false)
        return
      }

      // COPY LOOP-EDITOR APPROACH: Send user_id instead of access token
      console.log('🔍 [ARTISTLIST] Using loop-editor approach - sending user_id only')
      console.log('🔍 [ARTISTLIST] User ID:', user.id)
      
      const params = new URLSearchParams()
      params.append('user_id', user.id) // Add user_id like loop-editor
      if (searchQuery) params.append('search', searchQuery)
      if (genreFilter && genreFilter !== 'all') params.append('genre', genreFilter)
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter)
      if (priorityFilter && priorityFilter !== 'all') params.append('priority', priorityFilter)
      if (classFilter && classFilter !== 'all') params.append('artist_class', classFilter)

      const url = `/api/label-artists?${params.toString()}`
      console.log('🔍 [ARTISTLIST] Making API call to:', url)
      console.log('🔍 [ARTISTLIST] NO AUTH HEADERS - using user_id approach like loop-editor')

      const response = await fetch(url)
      
      console.log('🔍 [ARTISTLIST] Response status:', response.status)
      console.log('🔍 [ARTISTLIST] Response ok:', response.ok)
      
      const data = await response.json()
      console.log('🔍 [ARTISTLIST] Response data:', data)

      if (!response.ok) {
        console.log('❌ [ARTISTLIST] API error:', data.error || 'Failed to fetch artists')
        throw new Error(data.error || 'Failed to fetch artists')
      }

      console.log('✅ [ARTISTLIST] API call successful, artists count:', data.artists?.length || 0)

      // Transform database data to match frontend interface
      const transformedArtists = data.artists.map((artist: any) => ({
        id: artist.id,
        name: artist.name,
        stage_name: artist.stage_name,
        real_name: artist.real_name,
        email: artist.email,
        phone: artist.phone,
        bio: artist.bio,
        image_url: artist.image_url,
        status: artist.status,
        rank: artist.rank || 'C',
        priority: artist.priority,
        artist_class: artist.artist_class,
        genre: artist.genre,
        subgenre: artist.subgenre,
        location: artist.location,
        country: artist.country,
        followers: artist.total_followers || 0,
        monthly_listeners: artist.total_monthly_listeners || 0,
        total_streams: artist.total_streams || 0,
        revenue: artist.revenue || 0,
        contract_start: artist.contract_start,
        contract_end: artist.contract_end,
        royalty_rate: artist.royalty_rate || 0,
        distributors: artist.distributors || [],
        manager: artist.manager,
        agent: artist.agent,
        social_media: artist.social_media || {},
        streaming_platforms: {}, // Will be loaded separately
        checklist: [
          {
            id: '1',
            category: 'music_rights',
            task: 'Claim music rights and royalties',
            completed: false,
            notes: 'Set up ASCAP/BMI/SESAC registration and claim all existing tracks'
          },
          {
            id: '2',
            category: 'social_media',
            task: 'Collect Instagram account details',
            completed: false,
            notes: 'Get username, follower count, and verification status'
          },
          {
            id: '3',
            category: 'social_media',
            task: 'Collect TikTok account details',
            completed: false,
            notes: 'Username, follower count, average views per video'
          },
          {
            id: '4',
            category: 'social_media',
            task: 'Collect YouTube channel details',
            completed: false,
            notes: 'Channel URL, subscriber count, monetization status'
          },
          {
            id: '5',
            category: 'social_media',
            task: 'Collect Twitter account details',
            completed: false,
            notes: 'Handle, follower count, verification status'
          },
          {
            id: '6',
            category: 'legal',
            task: 'Contract signed and executed',
            completed: false,
            notes: 'Recording contract with all terms agreed upon'
          },
          {
            id: '7',
            category: 'legal',
            task: 'Publishing agreement completed',
            completed: false,
            notes: 'Publishing rights and splits documented'
          },
          {
            id: '8',
            category: 'marketing',
            task: 'Press kit completed',
            completed: false,
            notes: 'Bio, photos, music samples, contact info'
          },
          {
            id: '9',
            category: 'marketing',
            task: 'Radio promotion setup',
            completed: false,
            notes: 'Radio plugger contact and strategy in place'
          },
          {
            id: '10',
            category: 'business',
            task: 'Bank details and tax forms collected',
            completed: false,
            notes: 'W-9/W-8, banking info for royalty payments'
          },
          {
            id: '11',
            category: 'business',
            task: 'Performance rights organization registration',
            completed: false,
            notes: 'Register with ASCAP, BMI, or SESAC'
          },
          {
            id: '12',
            category: 'music_rights',
            task: 'Master recording ownership documented',
            completed: false,
            notes: 'Clear ownership of master recordings established'
          }
        ], // Comprehensive checklist items
        rights_metadata: {
          isrc_codes: {},
          upc_codes: {},
          publishing_rights: [],
          master_rights_owner: '',
          sample_clearances: [],
          performance_rights_org: 'None',
          copyright_registrations: {}
        }, // Will be loaded separately
        releases: artist.releases || 0,
        upcoming_releases: artist.upcoming_releases || 0,
        last_activity: artist.last_activity || new Date().toISOString(),
        notes: artist.notes,
        tags: artist.tags || [],
        performance_score: artist.performance_score || 0,
        growth_rate: artist.growth_rate || 0,
        engagement_rate: artist.engagement_rate || 0,
        market_potential: artist.market_potential || 0
      }))

      console.log('✅ [ARTISTLIST] Transformed artists:', transformedArtists.length, 'artists')
      setArtists(transformedArtists)
    } catch (err) {
      console.error('❌ [ARTISTLIST] Error fetching artists:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch artists')
      setArtists([])
    } finally {
      setLoading(false)
    }
  }

  // Load streaming platforms for an artist
  const loadStreamingPlatforms = async (artistId: string) => {
    try {
      if (!user) {
        console.error('No user available')
        return
      }

      const response = await fetch(`/api/label-artists/${artistId}/streaming-platforms?user_id=${user.id}`)
      const data = await response.json()
      
      if (response.ok) {
        setArtists(prev => prev.map(artist => 
          artist.id === artistId 
            ? { ...artist, streaming_platforms: data.streaming_platforms }
            : artist
        ))
      }
    } catch (err) {
      console.error('Error loading streaming platforms:', err)
    }
  }

  // Load checklist for an artist
  const loadChecklist = async (artistId: string) => {
    // Checklist is already loaded with default items, no need to fetch from API
    console.log('Checklist already loaded with default items for artist:', artistId)
  }

  // Toggle checklist item
  const toggleChecklistItem = async (artistId: string, itemId: string, completed: boolean) => {
    // Update checklist item locally
    setArtists(prev => prev.map(artist => 
      artist.id === artistId 
        ? { 
            ...artist, 
            checklist: artist.checklist.map(item => 
              item.id === itemId 
                ? { 
                    ...item, 
                    completed, 
                    date_completed: completed ? new Date().toISOString() : undefined 
                  }
                : item
            )
          }
        : artist
    ))
    
    console.log(`Checklist item ${itemId} for artist ${artistId} marked as ${completed ? 'completed' : 'incomplete'}`)
  }

  // Load data on component mount and when filters change
  useEffect(() => {
    if (user) {
      fetchArtists()
    }
  }, [user, searchQuery, genreFilter, statusFilter, priorityFilter, classFilter])

  // Populate edit form when artist is selected
  useEffect(() => {
    if (selectedArtist && showEditArtistDialog) {
      setEditArtistForm({
        name: selectedArtist.name || '',
        stage_name: selectedArtist.stage_name || '',
        email: selectedArtist.email || '',
        phone: selectedArtist.phone || '',
        genre: selectedArtist.genre || '',
        location: selectedArtist.location || '',
        bio: selectedArtist.bio || ''
      })
      // Set previews to current images if they exist
      setEditThumbnailPreview(selectedArtist.image_url || null)
      setEditImagePreview(selectedArtist.image_url || null)
      // Get logo from social_media if it exists
      const logoUrl = (selectedArtist.social_media as any)?.logo_url
      setEditLogoPreview(logoUrl || null)
    }
  }, [selectedArtist, showEditArtistDialog])

  // Load streaming platforms when streaming sections are expanded
  useEffect(() => {
    artists.forEach(artist => {
      if (showStreamingPlatforms[artist.id] && Object.keys(artist.streaming_platforms).length === 0) {
        loadStreamingPlatforms(artist.id)
      }
    })
  }, [showStreamingPlatforms, artists])

  // Load checklist when checklist dialog is opened
  useEffect(() => {
    if (showChecklistDialog && selectedArtist && selectedArtist.checklist.length === 0) {
      loadChecklist(selectedArtist.id)
    }
  }, [showChecklistDialog, selectedArtist])

  // Production Schedule state
  const [newScheduleItem, setNewScheduleItem] = useState<ProductionScheduleItem>({
    title: '',
    description: '',
    type: 'song_production',
    status: 'scheduled',
    priority: 'medium',
    scheduled_date: '',
    due_date: '',
    assigned_to: '',
    notes: '',
    budget: 0,
    currency: 'USD',
    location: '',
    artist_name: ''
  })
  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>([])
  const [collaboratorInput, setCollaboratorInput] = useState('')
  const [scheduleItemCreating, setScheduleItemCreating] = useState(false)
  const [scheduleItemCreateError, setScheduleItemCreateError] = useState<string | null>(null)
  
  // Removed duplicate - moved to top of component

  // Filter and sort artists
  const filteredArtists = artists
    .filter(artist => {
      const matchesSearch = artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          artist.stage_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          artist.genre.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'all' || artist.status === statusFilter
      const matchesRank = rankFilter === 'all' || artist.rank === rankFilter
      const matchesGenre = genreFilter === 'all' || artist.genre === genreFilter
      const matchesClass = classFilter === 'all' || artist.artist_class === classFilter
      
      return matchesSearch && matchesStatus && matchesRank && matchesGenre && matchesClass
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

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'spotify': return '🎵'
      case 'apple_music': return '🍎'
      case 'youtube_music': return '📺'
      case 'tidal': return '🌊'
      case 'amazon_music': return '📦'
      case 'soundcloud': return '☁️'
      default: return '🎶'
    }
  }

  const getPlatformName = (platform: string) => {
    switch (platform) {
      case 'spotify': return 'Spotify'
      case 'apple_music': return 'Apple Music'
      case 'youtube_music': return 'YouTube Music'
      case 'tidal': return 'Tidal'
      case 'amazon_music': return 'Amazon Music'
      case 'soundcloud': return 'SoundCloud'
      default: return platform
    }
  }

  const getArtistClassColor = (artistClass: string) => {
    switch (artistClass) {
      case 'superstar': return 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black'
      case 'platinum': return 'bg-gradient-to-r from-gray-300 to-gray-400 text-black'
      case 'gold': return 'bg-gradient-to-r from-yellow-300 to-yellow-500 text-black'
      case 'silver': return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
      case 'bronze': return 'bg-gradient-to-r from-orange-400 to-orange-600 text-white'
      case 'emerging': return 'bg-gradient-to-r from-green-400 to-green-600 text-white'
      case 'indie': return 'bg-gradient-to-r from-purple-400 to-purple-600 text-white'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getArtistClassLabel = (artistClass: string) => {
    switch (artistClass) {
      case 'superstar': return '⭐ Superstar'
      case 'platinum': return '💎 Platinum'
      case 'gold': return '🏆 Gold'
      case 'silver': return '🥈 Silver'
      case 'bronze': return '🥉 Bronze'
      case 'emerging': return '🌱 Emerging'
      case 'indie': return '🎸 Indie'
      default: return artistClass
    }
  }

  // Helper function to upload image to Supabase
  const uploadImageToSupabase = async (file: File, folder: string, fileName: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop()
      const uniqueFileName = `${fileName}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `artist-profiles/${folder}/${uniqueFileName}`

      const { error: uploadError } = await supabase.storage
        .from('beats')
        .upload(filePath, file, { upsert: true })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw uploadError
      }

      const { data: { publicUrl } } = supabase.storage
        .from('beats')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Error uploading image:', error)
      return null
    }
  }

  const handleAddArtist = async () => {
    try {
      if (!user?.id) {
        toast({
          title: "Error",
          description: "Please log in to add an artist",
          variant: "destructive"
        })
        return
      }

      if (!newArtistForm.name.trim()) {
        toast({
          title: "Error",
          description: "Artist name is required!",
          variant: "destructive"
        })
        return
      }

      setUploadingImages(true)

      // Upload images first
      let thumbnailUrl: string | null = null
      let logoUrl: string | null = null
      let imageUrl: string | null = null

      if (thumbnailFile) {
        thumbnailUrl = await uploadImageToSupabase(thumbnailFile, user.id, 'thumbnail')
        if (!thumbnailUrl) {
          toast({
            title: "Error",
            description: "Failed to upload thumbnail. Please try again.",
            variant: "destructive"
          })
          setUploadingImages(false)
          return
        }
      }

      if (logoFile) {
        logoUrl = await uploadImageToSupabase(logoFile, user.id, 'logo')
        if (!logoUrl) {
          toast({
            title: "Error",
            description: "Failed to upload logo. Please try again.",
            variant: "destructive"
          })
          setUploadingImages(false)
          return
        }
      }

      if (imageFile) {
        imageUrl = await uploadImageToSupabase(imageFile, user.id, 'image')
        if (!imageUrl) {
          toast({
            title: "Error",
            description: "Failed to upload image. Please try again.",
            variant: "destructive"
          })
          setUploadingImages(false)
          return
        }
      }

      // Use imageUrl for the main image (thumbnail if no main image, logo if no thumbnail)
      const finalImageUrl = imageUrl || thumbnailUrl || logoUrl

      const artistData: any = {
        user_id: user.id, // For API authentication
        name: newArtistForm.name,
        stage_name: newArtistForm.stage_name,
        email: newArtistForm.email,
        phone: newArtistForm.phone,
        genre: newArtistForm.genre,
        location: newArtistForm.location,
        bio: newArtistForm.bio,
        status: 'active',
        priority: 'medium',
        artist_class: 'emerging',
        rank: 'C'
      }

      // Add image URLs - store logo in social_media JSONB for now, image_url for main image
      if (finalImageUrl) {
        artistData.image_url = finalImageUrl
      }
      
      // Store logo URL in social_media JSONB field (we can add a dedicated column later if needed)
      if (logoUrl) {
        artistData.social_media = { ...artistData.social_media, logo_url: logoUrl }
      }

      console.log('🚀 [ADD ARTIST] Making request to /api/label-artists with data:', artistData)
      
      const response = await fetch('/api/label-artists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(artistData)
      })
      
      console.log('🚀 [ADD ARTIST] Response status:', response.status)
      console.log('🚀 [ADD ARTIST] Response URL:', response.url)

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add artist')
      }

      toast({
        title: "Success",
        description: "Artist added successfully!",
      })
      
      // Reset form
      setNewArtistForm({
        name: '',
        stage_name: '',
        email: '',
        phone: '',
        genre: '',
        location: '',
        bio: ''
      })
      
      // Reset image uploads
      setThumbnailFile(null)
      setThumbnailPreview(null)
      setLogoFile(null)
      setLogoPreview(null)
      setImageFile(null)
      setImagePreview(null)
      
      setShowAddArtistDialog(false)
      setUploadingImages(false)
      
      // Refresh the artists list
      fetchArtists()
    } catch (error) {
      console.error('Error adding artist:', error)
      setUploadingImages(false)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add artist. Please try again.",
        variant: "destructive"
      })
    }
  }

  // Edit image upload handlers
  const handleEditThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setEditThumbnailFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setEditThumbnailPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleEditLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setEditLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setEditLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setEditImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setEditImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeEditThumbnail = () => {
    setEditThumbnailFile(null)
    setEditThumbnailPreview(null)
  }

  const removeEditLogo = () => {
    setEditLogoFile(null)
    setEditLogoPreview(null)
  }

  const removeEditImage = () => {
    setEditImageFile(null)
    setEditImagePreview(null)
  }

  const handleEditArtist = async () => {
    if (!selectedArtist || !user?.id) {
      toast({
        title: "Error",
        description: "Please select an artist and ensure you're logged in",
        variant: "destructive"
      })
      return
    }

    try {
      setUploadingEditImages(true)

      // Upload images first if any are selected
      let thumbnailUrl: string | null = null
      let logoUrl: string | null = null
      let imageUrl: string | null = null

      if (editThumbnailFile) {
        thumbnailUrl = await uploadImageToSupabase(editThumbnailFile, user.id, 'thumbnail')
        if (!thumbnailUrl) {
          toast({
            title: "Error",
            description: "Failed to upload thumbnail. Please try again.",
            variant: "destructive"
          })
          setUploadingEditImages(false)
          return
        }
      }

      if (editLogoFile) {
        logoUrl = await uploadImageToSupabase(editLogoFile, user.id, 'logo')
        if (!logoUrl) {
          toast({
            title: "Error",
            description: "Failed to upload logo. Please try again.",
            variant: "destructive"
          })
          setUploadingEditImages(false)
          return
        }
      }

      if (editImageFile) {
        imageUrl = await uploadImageToSupabase(editImageFile, user.id, 'image')
        if (!imageUrl) {
          toast({
            title: "Error",
            description: "Failed to upload image. Please try again.",
            variant: "destructive"
          })
          setUploadingEditImages(false)
          return
        }
      }

      // Use imageUrl for the main image (thumbnail if no main image, keep existing if no new uploads)
      const finalImageUrl = imageUrl || thumbnailUrl

      const updateData: any = {
        user_id: user.id,
        id: selectedArtist.id,
        name: editArtistForm.name || selectedArtist.name,
        stage_name: editArtistForm.stage_name !== undefined ? editArtistForm.stage_name : selectedArtist.stage_name,
        email: editArtistForm.email !== undefined ? editArtistForm.email : selectedArtist.email,
        phone: editArtistForm.phone !== undefined ? editArtistForm.phone : selectedArtist.phone,
        genre: editArtistForm.genre || selectedArtist.genre,
        location: editArtistForm.location !== undefined ? editArtistForm.location : selectedArtist.location,
        bio: editArtistForm.bio !== undefined ? editArtistForm.bio : selectedArtist.bio,
      }

      // Update image URLs if new images were uploaded
      if (finalImageUrl) {
        updateData.image_url = finalImageUrl
      }

      // Update logo in social_media if uploaded, otherwise keep existing
      const currentSocialMedia = selectedArtist.social_media || {}
      if (logoUrl) {
        updateData.social_media = { ...currentSocialMedia, logo_url: logoUrl }
      } else if (currentSocialMedia && Object.keys(currentSocialMedia).length > 0) {
        updateData.social_media = currentSocialMedia
      }

      console.log('🚀 [EDIT ARTIST] Making request to /api/label-artists with data:', updateData)

      const response = await fetch('/api/label-artists', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update artist')
      }

      toast({
        title: "Success",
        description: "Artist updated successfully!",
      })

      // Reset edit form and image uploads
      setEditArtistForm({
        name: '',
        stage_name: '',
        email: '',
        phone: '',
        genre: '',
        location: '',
        bio: ''
      })
      setEditThumbnailFile(null)
      setEditThumbnailPreview(null)
      setEditLogoFile(null)
      setEditLogoPreview(null)
      setEditImageFile(null)
      setEditImagePreview(null)

      setShowEditArtistDialog(false)
      setSelectedArtist(null)
      setUploadingEditImages(false)

      // Refresh the artists list
      fetchArtists()
    } catch (error) {
      console.error('Error updating artist:', error)
      setUploadingEditImages(false)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update artist. Please try again.",
        variant: "destructive"
      })
    }
  }

  // Quick update function for badge fields
  const handleQuickUpdate = async (artistId: string, field: 'status' | 'priority' | 'artist_class' | 'genre', value: string) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "Please log in to update an artist",
        variant: "destructive"
      })
      return
    }

    try {
      const updateData: any = {
        user_id: user.id,
        id: artistId,
      }
      updateData[field] = value

      const response = await fetch('/api/label-artists', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update artist')
      }

      toast({
        title: "Success",
        description: `${field === 'artist_class' ? 'Class' : field.charAt(0).toUpperCase() + field.slice(1)} updated successfully!`,
      })

      // Refresh the artists list
      fetchArtists()
    } catch (error) {
      console.error('Error updating artist:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update artist. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleDeleteArtist = async (artistId: string) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "Please log in to delete an artist",
        variant: "destructive"
      })
      return
    }

    // Confirm deletion
    if (!confirm('Are you sure you want to delete this artist? This action cannot be undone.')) {
      return
    }

    try {
      const params = new URLSearchParams()
      params.append('id', artistId)
      params.append('user_id', user.id)

      const response = await fetch(`/api/label-artists?${params.toString()}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete artist')
      }

      toast({
        title: "Success",
        description: "Artist deleted successfully!",
      })

      // Refresh the artists list
      fetchArtists()
    } catch (error) {
      console.error('Error deleting artist:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete artist. Please try again.",
        variant: "destructive"
      })
    }
  }

  const openChecklistModal = (artist: Artist) => {
    setSelectedArtist(artist)
    setShowChecklistDialog(true)
  }

  const openScheduleReleaseModal = (artist: Artist) => {
    setSelectedArtist(artist)
    // Pre-populate form with artist information
    const today = new Date().toISOString().split('T')[0]
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    setNewScheduleItem({
      title: `Release for ${artist.name}`,
      description: `Production schedule for ${artist.stage_name || artist.name}`,
      type: 'song_production',
      status: 'scheduled',
      priority: artist.priority === 'high' ? 'high' : 'medium',
      scheduled_date: today,
      due_date: nextWeek,
      assigned_to: artist.manager || '',
      notes: `Artist Class: ${artist.artist_class}, Genre: ${artist.genre}`,
      budget: 0,
      currency: 'USD',
      location: '',
      artist_name: artist.name
    })
    // Initialize collaborators with the selected artist
    setSelectedCollaborators([artist.name])
    setCollaboratorInput('')
    setShowScheduleReleaseDialog(true)
  }

  const openRightsManagementModal = (artist: Artist) => {
    setSelectedArtist(artist)
    setShowRightsManagementDialog(true)
  }



  const getChecklistProgress = (checklist: ChecklistItem[]) => {
    const completed = checklist.filter(item => item.completed).length
    const total = checklist.length
    return { completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'music_rights': return '🎵'
      case 'social_media': return '📱'
      case 'legal': return '📋'
      case 'marketing': return '📢'
      case 'business': return '💼'
      default: return '📝'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'music_rights': return 'bg-blue-100 text-blue-800'
      case 'social_media': return 'bg-purple-100 text-purple-800'
      case 'legal': return 'bg-gray-100 text-gray-800'
      case 'marketing': return 'bg-green-100 text-green-800'
      case 'business': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getClearanceStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'denied': return 'bg-red-100 text-red-800'
      case 'not_required': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCopyrightStatusColor = (status: string) => {
    switch (status) {
      case 'registered': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRightsCompletionStatus = (rights: RightsMetadata) => {
    let completed = 0
    let total = 0

    // Count ISRC codes
    total += 1
    if (rights?.isrc_codes && Object.keys(rights.isrc_codes).length > 0) completed += 1

    // Count master rights owner
    total += 1
    if (rights?.master_rights_owner) completed += 1

    // Count performance rights org
    total += 1
    if (rights?.performance_rights_org && rights.performance_rights_org !== 'None') completed += 1

    // Count sample clearances (if any samples exist)
    if (rights?.sample_clearances && rights.sample_clearances.length > 0) {
      total += 1
      if (rights.sample_clearances.every(s => s.clearance_status === 'approved' || s.clearance_status === 'not_required')) {
        completed += 1
      }
    }

    return { completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 100 }
  }

  const addCollaborator = (artistName: string) => {
    if (artistName && !selectedCollaborators.includes(artistName)) {
      setSelectedCollaborators([...selectedCollaborators, artistName])
    }
  }

  const removeCollaborator = (artistName: string) => {
    setSelectedCollaborators(selectedCollaborators.filter(name => name !== artistName))
  }

  const handleAddCollaboratorFromInput = () => {
    const trimmed = collaboratorInput.trim()
    if (trimmed) {
      addCollaborator(trimmed)
      setCollaboratorInput('')
    }
  }

  const handleAddCollaboratorFromDropdown = (artistName: string) => {
    addCollaborator(artistName)
  }

  const createScheduleItem = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newScheduleItem.title || !newScheduleItem.scheduled_date || !newScheduleItem.due_date) {
      setScheduleItemCreateError('Please fill in all required fields')
      return
    }

    setScheduleItemCreating(true)
    setScheduleItemCreateError(null)

    try {
      // Include collaborators in the schedule item
      const scheduleItemWithCollaborators = {
        ...newScheduleItem,
        collaborators: selectedCollaborators
      }
      
      // Mock creation - in real app, this would save to database
      console.log('Creating schedule item:', scheduleItemWithCollaborators)
      
      const collaboratorsList = selectedCollaborators.length > 1 
        ? ` with ${selectedCollaborators.slice(1).join(', ')}`
        : ''
      
      toast({
        title: "Success",
        description: `Production schedule created for ${selectedCollaborators[0]}${collaboratorsList}!`,
      })
      
      // Reset form and close dialog
      setNewScheduleItem({
        title: '',
        description: '',
        type: 'song_production',
        status: 'scheduled',
        priority: 'medium',
        scheduled_date: '',
        due_date: '',
        assigned_to: '',
        notes: '',
        budget: 0,
        currency: 'USD',
        location: '',
        artist_name: ''
      })
      setSelectedCollaborators([])
      setCollaboratorInput('')
      setShowScheduleReleaseDialog(false)
      setSelectedArtist(null)
      
    } catch (error) {
      console.error('Error creating schedule item:', error)
      setScheduleItemCreateError('Failed to create schedule item. Please try again.')
    } finally {
      setScheduleItemCreating(false)
    }
  }

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Artist Management</h1>
          <p className="text-gray-600">Manage your label's artist roster and track performance</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button 
            onClick={() => {
              window.location.href = '/mylibrary'
            }}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <Music className="h-4 w-4 mr-2" />
            My Library
          </Button>
          <Button onClick={() => setShowAddArtistDialog(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Artist
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-700">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchArtists}
              className="ml-auto text-red-600 hover:text-red-700"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mr-3" />
          <p className="text-gray-600">Loading artists...</p>
        </div>
      )}

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
            <SelectItem value="Rock">Rock</SelectItem>
            <SelectItem value="R&B">R&B</SelectItem>
            <SelectItem value="Country">Country</SelectItem>
            <SelectItem value="Jazz">Jazz</SelectItem>
            <SelectItem value="Blues">Blues</SelectItem>
            <SelectItem value="Classical">Classical</SelectItem>
            <SelectItem value="Folk">Folk</SelectItem>
            <SelectItem value="Latin">Latin</SelectItem>
            <SelectItem value="Reggae">Reggae</SelectItem>
            <SelectItem value="Metal">Metal</SelectItem>
            <SelectItem value="Punk">Punk</SelectItem>
            <SelectItem value="Indie">Indie</SelectItem>
            <SelectItem value="Alternative">Alternative</SelectItem>
            <SelectItem value="Soul">Soul</SelectItem>
            <SelectItem value="Funk">Funk</SelectItem>
            <SelectItem value="Gospel">Gospel</SelectItem>
            <SelectItem value="World Music">World Music</SelectItem>
            <SelectItem value="Ambient">Ambient</SelectItem>
            <SelectItem value="Techno">Techno</SelectItem>
            <SelectItem value="House">House</SelectItem>
            <SelectItem value="Trap">Trap</SelectItem>
            <SelectItem value="Drill">Drill</SelectItem>
            <SelectItem value="Afrobeats">Afrobeats</SelectItem>
            <SelectItem value="K-Pop">K-Pop</SelectItem>
            <SelectItem value="J-Pop">J-Pop</SelectItem>
            <SelectItem value="Dancehall">Dancehall</SelectItem>
            <SelectItem value="Soca">Soca</SelectItem>
            <SelectItem value="Christian">Christian</SelectItem>
            <SelectItem value="Grunge">Grunge</SelectItem>
            <SelectItem value="Progressive Rock">Progressive Rock</SelectItem>
            <SelectItem value="Hard Rock">Hard Rock</SelectItem>
            <SelectItem value="Soft Rock">Soft Rock</SelectItem>
            <SelectItem value="Country Rock">Country Rock</SelectItem>
            <SelectItem value="Rap">Rap</SelectItem>
            <SelectItem value="Trap">Trap</SelectItem>
            <SelectItem value="Drill">Drill</SelectItem>
            <SelectItem value="Mumble Rap">Mumble Rap</SelectItem>
            <SelectItem value="Conscious Hip-Hop">Conscious Hip-Hop</SelectItem>
            <SelectItem value="EDM">EDM</SelectItem>
            <SelectItem value="Dubstep">Dubstep</SelectItem>
            <SelectItem value="Trance">Trance</SelectItem>
            <SelectItem value="Drum & Bass">Drum & Bass</SelectItem>
            <SelectItem value="Garage">Garage</SelectItem>
            <SelectItem value="Disco">Disco</SelectItem>
            <SelectItem value="Swing">Swing</SelectItem>
            <SelectItem value="Bossa Nova">Bossa Nova</SelectItem>
            <SelectItem value="Salsa">Salsa</SelectItem>
            <SelectItem value="Bachata">Bachata</SelectItem>
            <SelectItem value="Reggaeton">Reggaeton</SelectItem>
            <SelectItem value="Cumbia">Cumbia</SelectItem>
            <SelectItem value="Flamenco">Flamenco</SelectItem>
            <SelectItem value="Bluegrass">Bluegrass</SelectItem>
            <SelectItem value="Americana">Americana</SelectItem>
            <SelectItem value="New Age">New Age</SelectItem>
            <SelectItem value="Experimental">Experimental</SelectItem>
            <SelectItem value="Industrial">Industrial</SelectItem>
            <SelectItem value="Goth">Goth</SelectItem>
            <SelectItem value="Emo">Emo</SelectItem>
            <SelectItem value="Screamo">Screamo</SelectItem>
            <SelectItem value="Post-Rock">Post-Rock</SelectItem>
            <SelectItem value="Shoegaze">Shoegaze</SelectItem>
            <SelectItem value="Synthwave">Synthwave</SelectItem>
            <SelectItem value="Vaporwave">Vaporwave</SelectItem>
            <SelectItem value="Lo-Fi">Lo-Fi</SelectItem>
            <SelectItem value="Chillhop">Chillhop</SelectItem>
            <SelectItem value="Lofi Hip-Hop">Lofi Hip-Hop</SelectItem>
            <SelectItem value="Instrumental">Instrumental</SelectItem>
            <SelectItem value="Orchestral">Orchestral</SelectItem>
            <SelectItem value="Film Score">Film Score</SelectItem>
            <SelectItem value="Video Game Music">Video Game Music</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            <SelectItem value="superstar">⭐ Superstar</SelectItem>
            <SelectItem value="platinum">💎 Platinum</SelectItem>
            <SelectItem value="gold">🏆 Gold</SelectItem>
            <SelectItem value="silver">🥈 Silver</SelectItem>
            <SelectItem value="bronze">🥉 Bronze</SelectItem>
            <SelectItem value="emerging">🌱 Emerging</SelectItem>
            <SelectItem value="indie">🎸 Indie</SelectItem>
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
          <Collapsible 
            key={artist.id} 
            open={expandedCards[artist.id] || false}
            onOpenChange={() => toggleCard(artist.id)}
          >
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* Artist Image and Basic Info */}
                  <div className="flex items-start gap-4 flex-1">
                    <div 
                      className="relative cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => router.push(`/artistlist/${artist.id}`)}
                    >
                      <img
                        src={artist.image_url || '/placeholder-user.jpg'}
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
                        <h3 
                          className="text-xl font-semibold cursor-pointer hover:text-blue-600 transition-colors"
                          onClick={() => router.push(`/artistlist/${artist.id}`)}
                        >
                          {artist.name}
                        </h3>
                        {artist.stage_name && artist.stage_name !== artist.name && (
                          <span className="text-sm text-gray-500">({artist.stage_name})</span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-3">
                        {/* Status Badge - Clickable */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <div className="cursor-pointer hover:opacity-80 transition-opacity inline-block">
                              <Badge className={getStatusColor(artist.status)}>
                                {artist.status}
                              </Badge>
                            </div>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {['active', 'inactive', 'pending', 'suspended', 'archived'].map((status) => (
                              <DropdownMenuItem
                                key={status}
                                onClick={() => handleQuickUpdate(artist.id, 'status', status)}
                                className={artist.status === status ? 'bg-accent/50 font-medium' : ''}
                              >
                                <Badge className={getStatusColor(status)}>
                                  {status}
                                </Badge>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Priority Badge - Clickable */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <div className="cursor-pointer hover:opacity-80 transition-opacity inline-block">
                              <Badge className={getPriorityColor(artist.priority)}>
                                {artist.priority} priority
                              </Badge>
                            </div>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuLabel>Change Priority</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {['high', 'medium', 'low'].map((priority) => (
                              <DropdownMenuItem
                                key={priority}
                                onClick={() => handleQuickUpdate(artist.id, 'priority', priority)}
                                className={artist.priority === priority ? 'bg-accent/50 font-medium' : ''}
                              >
                                <Badge className={getPriorityColor(priority)}>
                                  {priority} priority
                                </Badge>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Artist Class Badge - Clickable */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <div className="cursor-pointer hover:opacity-80 transition-opacity inline-block">
                              <Badge className={getArtistClassColor(artist.artist_class)}>
                                {getArtistClassLabel(artist.artist_class)}
                              </Badge>
                            </div>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuLabel>Change Class</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {['superstar', 'platinum', 'gold', 'silver', 'bronze', 'emerging', 'indie'].map((artistClass) => (
                              <DropdownMenuItem
                                key={artistClass}
                                onClick={() => handleQuickUpdate(artist.id, 'artist_class', artistClass)}
                                className={artist.artist_class === artistClass ? 'bg-accent/50 font-medium' : ''}
                              >
                                <Badge className={getArtistClassColor(artistClass)}>
                                  {getArtistClassLabel(artistClass)}
                                </Badge>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Genre Badge - Clickable */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <div className="cursor-pointer hover:opacity-80 transition-opacity inline-block">
                              <Badge variant="outline">
                                {artist.genre}
                              </Badge>
                            </div>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuLabel>Change Genre</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {['Pop', 'Hip Hop', 'R&B', 'Rock', 'Electronic', 'Country', 'Jazz', 'Classical', 'Latin', 'Reggae', 'Blues', 'Folk', 'Metal', 'Punk', 'Indie'].map((genre) => (
                              <DropdownMenuItem
                                key={genre}
                                onClick={() => handleQuickUpdate(artist.id, 'genre', genre)}
                                className={artist.genre === genre ? 'bg-accent/50 font-medium' : ''}
                              >
                                {genre}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => {
                              const newGenre = prompt('Enter custom genre:', artist.genre)
                              if (newGenre && newGenre.trim()) {
                                handleQuickUpdate(artist.id, 'genre', newGenre.trim())
                              }
                            }}>
                              + Custom Genre...
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                  
                  {/* View and Expand/Collapse Buttons */}
                  <div className="flex gap-2 items-center self-start mt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/artistlist/${artist.id}`)}
                      className="h-8"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-gray-100"
                      >
                        {expandedCards[artist.id] ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </div>
                
                {/* Expanded Content */}
                <CollapsibleContent>
                  <div className="flex flex-col lg:flex-row gap-6 mt-4 pt-4 border-t">
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-3">{artist.bio}</p>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-4">
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
                      
                      {/* Streaming Platform Statistics */}
                      {artist.streaming_platforms && Object.keys(artist.streaming_platforms).length > 0 && (
                        <div className="border-t pt-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                              <Headphones className="h-4 w-4" />
                              Top Streaming Platforms
                            </h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleStreamingPlatforms(artist.id)}
                              className="h-6 w-6 p-0 hover:bg-gray-100"
                            >
                              {showStreamingPlatforms[artist.id] ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          {showStreamingPlatforms[artist.id] === true && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {Object.entries(artist.streaming_platforms)
                                .sort(([,a], [,b]) => {
                                  const aFollowers = 'monthly_listeners' in a ? a.monthly_listeners : 
                                                   'followers' in a ? a.followers :
                                                   'subscribers' in a ? a.subscribers : 0
                                  const bFollowers = 'monthly_listeners' in b ? b.monthly_listeners : 
                                                   'followers' in b ? b.followers :
                                                   'subscribers' in b ? b.subscribers : 0
                                  return bFollowers - aFollowers
                                })
                                .slice(0, 3)
                                .map(([platform, stats]) => (
                                  <div key={platform} className="bg-black rounded-lg p-3 border border-gray-800">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-lg">{getPlatformIcon(platform)}</span>
                                      <span className="font-medium text-sm text-white">{getPlatformName(platform)}</span>
                                    </div>
                                    <div className="space-y-1 text-xs">
                                      {'monthly_listeners' in stats && (
                                        <div className="flex justify-between">
                                          <span className="text-gray-400">Monthly Listeners:</span>
                                          <span className="font-semibold text-blue-400">{formatNumber(stats.monthly_listeners)}</span>
                                        </div>
                                      )}
                                      {'followers' in stats && (
                                        <div className="flex justify-between">
                                          <span className="text-gray-400">Followers:</span>
                                          <span className="font-semibold text-green-400">{formatNumber(stats.followers)}</span>
                                        </div>
                                      )}
                                      {'subscribers' in stats && (
                                        <div className="flex justify-between">
                                          <span className="text-gray-400">Subscribers:</span>
                                          <span className="font-semibold text-red-400">{formatNumber(stats.subscribers)}</span>
                                        </div>
                                      )}
                                      {'plays' in stats && (
                                        <div className="flex justify-between">
                                          <span className="text-gray-400">Plays:</span>
                                          <span className="font-semibold text-purple-400">{formatNumber(stats.plays)}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 lg:ml-auto">
                  {/* Checklist Progress Indicator */}
                  {(() => {
                    const progress = getChecklistProgress(artist.checklist)
                    return (
                      <div className="bg-black rounded-lg p-3 border border-gray-800 mb-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-white">Task Progress</span>
                          <span className="text-xs text-gray-400">{progress.completed}/{progress.total}</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              progress.percentage === 100 ? 'bg-green-500' : 
                              progress.percentage >= 75 ? 'bg-blue-500' : 
                              progress.percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${progress.percentage}%` }}
                          ></div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openChecklistModal(artist)}
                          className="w-full text-xs bg-gray-800 text-white border-gray-600 hover:bg-gray-700"
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          View Checklist ({progress.percentage}%)
                        </Button>
                      </div>
                    )
                  })()}
                  
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openScheduleReleaseModal(artist)}
                      className="bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                      title="Schedule Release"
                    >
                      <Calendar className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openRightsManagementModal(artist)}
                      className="bg-purple-600 text-white border-purple-600 hover:bg-purple-700"
                      title="Rights & Metadata"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedArtist(artist)
                        setShowEditArtistDialog(true)
                      }}
                      title="Edit Artist"
                    >
                      <Edit className="h-4 w-4" />
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
                </CollapsibleContent>
              </CardContent>
            </Card>
          </Collapsible>
        ))}
      </div>

      {/* Add Artist Dialog */}
      <Dialog open={showAddArtistDialog} onOpenChange={(open) => {
        setShowAddArtistDialog(open)
        if (!open) {
          // Reset form and image uploads when dialog closes
          setNewArtistForm({
            name: '',
            stage_name: '',
            email: '',
            phone: '',
            genre: '',
            location: '',
            bio: ''
          })
          setThumbnailFile(null)
          setThumbnailPreview(null)
          setLogoFile(null)
          setLogoPreview(null)
          setImageFile(null)
          setImagePreview(null)
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Artist</DialogTitle>
            <DialogDescription>
              Add a new artist to your label's roster
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Artist Name *</Label>
              <Input 
                id="name" 
                value={newArtistForm.name}
                onChange={(e) => setNewArtistForm({...newArtistForm, name: e.target.value})}
                placeholder="Enter artist name" 
                required 
              />
            </div>
            <div>
              <Label htmlFor="stage_name">Stage Name</Label>
              <Input 
                id="stage_name" 
                value={newArtistForm.stage_name}
                onChange={(e) => setNewArtistForm({...newArtistForm, stage_name: e.target.value})}
                placeholder="Enter stage name" 
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={newArtistForm.email}
                onChange={(e) => setNewArtistForm({...newArtistForm, email: e.target.value})}
                placeholder="Enter email" 
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input 
                id="phone" 
                value={newArtistForm.phone}
                onChange={(e) => setNewArtistForm({...newArtistForm, phone: e.target.value})}
                placeholder="Enter phone number" 
              />
            </div>
            <div>
              <Label htmlFor="genre">Genre</Label>
              <Select 
                value={newArtistForm.genre} 
                onValueChange={(value) => setNewArtistForm({...newArtistForm, genre: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select genre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Electronic">Electronic</SelectItem>
                  <SelectItem value="Hip-Hop">Hip-Hop</SelectItem>
                  <SelectItem value="Pop">Pop</SelectItem>
                  <SelectItem value="Rock">Rock</SelectItem>
                  <SelectItem value="R&B">R&B</SelectItem>
                  <SelectItem value="Country">Country</SelectItem>
                  <SelectItem value="Jazz">Jazz</SelectItem>
                  <SelectItem value="Blues">Blues</SelectItem>
                  <SelectItem value="Classical">Classical</SelectItem>
                  <SelectItem value="Folk">Folk</SelectItem>
                  <SelectItem value="Latin">Latin</SelectItem>
                  <SelectItem value="Reggae">Reggae</SelectItem>
                  <SelectItem value="Metal">Metal</SelectItem>
                  <SelectItem value="Punk">Punk</SelectItem>
                  <SelectItem value="Indie">Indie</SelectItem>
                  <SelectItem value="Alternative">Alternative</SelectItem>
                  <SelectItem value="Soul">Soul</SelectItem>
                  <SelectItem value="Funk">Funk</SelectItem>
                  <SelectItem value="Gospel">Gospel</SelectItem>
                  <SelectItem value="World Music">World Music</SelectItem>
                  <SelectItem value="Ambient">Ambient</SelectItem>
                  <SelectItem value="Techno">Techno</SelectItem>
                  <SelectItem value="House">House</SelectItem>
                  <SelectItem value="Trap">Trap</SelectItem>
                  <SelectItem value="Drill">Drill</SelectItem>
                  <SelectItem value="Afrobeats">Afrobeats</SelectItem>
                  <SelectItem value="K-Pop">K-Pop</SelectItem>
                  <SelectItem value="J-Pop">J-Pop</SelectItem>
                  <SelectItem value="Dancehall">Dancehall</SelectItem>
                  <SelectItem value="Soca">Soca</SelectItem>
                  <SelectItem value="Christian">Christian</SelectItem>
                  <SelectItem value="Grunge">Grunge</SelectItem>
                  <SelectItem value="Progressive Rock">Progressive Rock</SelectItem>
                  <SelectItem value="Hard Rock">Hard Rock</SelectItem>
                  <SelectItem value="Soft Rock">Soft Rock</SelectItem>
                  <SelectItem value="Country Rock">Country Rock</SelectItem>
                  <SelectItem value="Rap">Rap</SelectItem>
                  <SelectItem value="Mumble Rap">Mumble Rap</SelectItem>
                  <SelectItem value="Conscious Hip-Hop">Conscious Hip-Hop</SelectItem>
                  <SelectItem value="EDM">EDM</SelectItem>
                  <SelectItem value="Dubstep">Dubstep</SelectItem>
                  <SelectItem value="Trance">Trance</SelectItem>
                  <SelectItem value="Drum & Bass">Drum & Bass</SelectItem>
                  <SelectItem value="Garage">Garage</SelectItem>
                  <SelectItem value="Disco">Disco</SelectItem>
                  <SelectItem value="Swing">Swing</SelectItem>
                  <SelectItem value="Bossa Nova">Bossa Nova</SelectItem>
                  <SelectItem value="Salsa">Salsa</SelectItem>
                  <SelectItem value="Bachata">Bachata</SelectItem>
                  <SelectItem value="Reggaeton">Reggaeton</SelectItem>
                  <SelectItem value="Cumbia">Cumbia</SelectItem>
                  <SelectItem value="Flamenco">Flamenco</SelectItem>
                  <SelectItem value="Bluegrass">Bluegrass</SelectItem>
                  <SelectItem value="Americana">Americana</SelectItem>
                  <SelectItem value="New Age">New Age</SelectItem>
                  <SelectItem value="Experimental">Experimental</SelectItem>
                  <SelectItem value="Industrial">Industrial</SelectItem>
                  <SelectItem value="Goth">Goth</SelectItem>
                  <SelectItem value="Emo">Emo</SelectItem>
                  <SelectItem value="Screamo">Screamo</SelectItem>
                  <SelectItem value="Post-Rock">Post-Rock</SelectItem>
                  <SelectItem value="Shoegaze">Shoegaze</SelectItem>
                  <SelectItem value="Synthwave">Synthwave</SelectItem>
                  <SelectItem value="Vaporwave">Vaporwave</SelectItem>
                  <SelectItem value="Lo-Fi">Lo-Fi</SelectItem>
                  <SelectItem value="Chillhop">Chillhop</SelectItem>
                  <SelectItem value="Lofi Hip-Hop">Lofi Hip-Hop</SelectItem>
                  <SelectItem value="Instrumental">Instrumental</SelectItem>
                  <SelectItem value="Orchestral">Orchestral</SelectItem>
                  <SelectItem value="Film Score">Film Score</SelectItem>
                  <SelectItem value="Video Game Music">Video Game Music</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input 
                id="location" 
                value={newArtistForm.location}
                onChange={(e) => setNewArtistForm({...newArtistForm, location: e.target.value})}
                placeholder="Enter location" 
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea 
                id="bio" 
                value={newArtistForm.bio}
                onChange={(e) => setNewArtistForm({...newArtistForm, bio: e.target.value})}
                placeholder="Enter artist bio" 
              />
            </div>
            
            {/* Image Uploads */}
            <div className="sm:col-span-2 border-t pt-4 mt-2">
              <h3 className="text-sm font-semibold mb-4">Images</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Thumbnail/Logo Upload */}
                <div>
                  <Label htmlFor="thumbnail">Thumbnail/Logo</Label>
                  <div className="mt-2">
                    {thumbnailPreview ? (
                      <div className="relative">
                        <img 
                          src={thumbnailPreview} 
                          alt="Thumbnail preview" 
                          className="w-full h-32 object-cover rounded-md border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1"
                          onClick={removeThumbnail}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed rounded-md p-4 text-center">
                        <img 
                          src="/placeholder-user.jpg" 
                          alt="Placeholder" 
                          className="w-full h-32 object-cover rounded-md opacity-50"
                        />
                        <Input
                          id="thumbnail"
                          type="file"
                          accept="image/*"
                          onChange={handleThumbnailChange}
                          className="mt-2"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Logo Upload */}
                <div>
                  <Label htmlFor="logo">Logo</Label>
                  <div className="mt-2">
                    {logoPreview ? (
                      <div className="relative">
                        <img 
                          src={logoPreview} 
                          alt="Logo preview" 
                          className="w-full h-32 object-cover rounded-md border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1"
                          onClick={removeLogo}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed rounded-md p-4 text-center">
                        <div className="w-full h-32 bg-gray-100 rounded-md flex items-center justify-center text-gray-400 text-sm">
                          No logo
                        </div>
                        <Input
                          id="logo"
                          type="file"
                          accept="image/*"
                          onChange={handleLogoChange}
                          className="mt-2"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Main Image Upload */}
                <div>
                  <Label htmlFor="image">Main Image</Label>
                  <div className="mt-2">
                    {imagePreview ? (
                      <div className="relative">
                        <img 
                          src={imagePreview} 
                          alt="Image preview" 
                          className="w-full h-32 object-cover rounded-md border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1"
                          onClick={removeImage}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed rounded-md p-4 text-center">
                        <div className="w-full h-32 bg-gray-100 rounded-md flex items-center justify-center text-gray-400 text-sm">
                          No image
                        </div>
                        <Input
                          id="image"
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="mt-2"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddArtistDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddArtist} disabled={uploadingImages}>
              {uploadingImages ? "Uploading..." : "Add Artist"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Artist Dialog */}
      <Dialog open={showEditArtistDialog} onOpenChange={(open) => {
        setShowEditArtistDialog(open)
        if (!open) {
          // Reset edit form and image uploads when dialog closes
          setEditArtistForm({
            name: '',
            stage_name: '',
            email: '',
            phone: '',
            genre: '',
            location: '',
            bio: ''
          })
          setEditThumbnailFile(null)
          setEditThumbnailPreview(null)
          setEditLogoFile(null)
          setEditLogoPreview(null)
          setEditImageFile(null)
          setEditImagePreview(null)
          setSelectedArtist(null)
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Artist</DialogTitle>
            <DialogDescription>
              Update artist information and details
            </DialogDescription>
          </DialogHeader>
          {selectedArtist && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Artist Name</Label>
                <Input 
                  id="edit-name" 
                  value={editArtistForm.name}
                  onChange={(e) => setEditArtistForm({...editArtistForm, name: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit-stage-name">Stage Name</Label>
                <Input 
                  id="edit-stage-name" 
                  value={editArtistForm.stage_name}
                  onChange={(e) => setEditArtistForm({...editArtistForm, stage_name: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input 
                  id="edit-email" 
                  type="email" 
                  value={editArtistForm.email}
                  onChange={(e) => setEditArtistForm({...editArtistForm, email: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit-phone">Phone</Label>
                <Input 
                  id="edit-phone" 
                  value={editArtistForm.phone}
                  onChange={(e) => setEditArtistForm({...editArtistForm, phone: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit-genre">Genre</Label>
                <Select 
                  value={editArtistForm.genre}
                  onValueChange={(value) => setEditArtistForm({...editArtistForm, genre: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Electronic">Electronic</SelectItem>
                    <SelectItem value="Hip-Hop">Hip-Hop</SelectItem>
                    <SelectItem value="Pop">Pop</SelectItem>
                    <SelectItem value="Rock">Rock</SelectItem>
                    <SelectItem value="R&B">R&B</SelectItem>
                    <SelectItem value="Country">Country</SelectItem>
                    <SelectItem value="Jazz">Jazz</SelectItem>
                    <SelectItem value="Blues">Blues</SelectItem>
                    <SelectItem value="Classical">Classical</SelectItem>
                    <SelectItem value="Folk">Folk</SelectItem>
                    <SelectItem value="Latin">Latin</SelectItem>
                    <SelectItem value="Reggae">Reggae</SelectItem>
                    <SelectItem value="Metal">Metal</SelectItem>
                    <SelectItem value="Punk">Punk</SelectItem>
                    <SelectItem value="Indie">Indie</SelectItem>
                    <SelectItem value="Alternative">Alternative</SelectItem>
                    <SelectItem value="Soul">Soul</SelectItem>
                    <SelectItem value="Funk">Funk</SelectItem>
                    <SelectItem value="Gospel">Gospel</SelectItem>
                    <SelectItem value="World Music">World Music</SelectItem>
                    <SelectItem value="Ambient">Ambient</SelectItem>
                    <SelectItem value="Techno">Techno</SelectItem>
                    <SelectItem value="House">House</SelectItem>
                    <SelectItem value="Trap">Trap</SelectItem>
                    <SelectItem value="Drill">Drill</SelectItem>
                    <SelectItem value="Afrobeats">Afrobeats</SelectItem>
                    <SelectItem value="K-Pop">K-Pop</SelectItem>
                    <SelectItem value="J-Pop">J-Pop</SelectItem>
                    <SelectItem value="Dancehall">Dancehall</SelectItem>
                    <SelectItem value="Soca">Soca</SelectItem>
                    <SelectItem value="Christian">Christian</SelectItem>
                    <SelectItem value="Grunge">Grunge</SelectItem>
                    <SelectItem value="Progressive Rock">Progressive Rock</SelectItem>
                    <SelectItem value="Hard Rock">Hard Rock</SelectItem>
                    <SelectItem value="Soft Rock">Soft Rock</SelectItem>
                    <SelectItem value="Country Rock">Country Rock</SelectItem>
                    <SelectItem value="Rap">Rap</SelectItem>
                    <SelectItem value="Mumble Rap">Mumble Rap</SelectItem>
                    <SelectItem value="Conscious Hip-Hop">Conscious Hip-Hop</SelectItem>
                    <SelectItem value="EDM">EDM</SelectItem>
                    <SelectItem value="Dubstep">Dubstep</SelectItem>
                    <SelectItem value="Trance">Trance</SelectItem>
                    <SelectItem value="Drum & Bass">Drum & Bass</SelectItem>
                    <SelectItem value="Garage">Garage</SelectItem>
                    <SelectItem value="Disco">Disco</SelectItem>
                    <SelectItem value="Swing">Swing</SelectItem>
                    <SelectItem value="Bossa Nova">Bossa Nova</SelectItem>
                    <SelectItem value="Salsa">Salsa</SelectItem>
                    <SelectItem value="Bachata">Bachata</SelectItem>
                    <SelectItem value="Reggaeton">Reggaeton</SelectItem>
                    <SelectItem value="Cumbia">Cumbia</SelectItem>
                    <SelectItem value="Flamenco">Flamenco</SelectItem>
                    <SelectItem value="Bluegrass">Bluegrass</SelectItem>
                    <SelectItem value="Americana">Americana</SelectItem>
                    <SelectItem value="New Age">New Age</SelectItem>
                    <SelectItem value="Experimental">Experimental</SelectItem>
                    <SelectItem value="Industrial">Industrial</SelectItem>
                    <SelectItem value="Goth">Goth</SelectItem>
                    <SelectItem value="Emo">Emo</SelectItem>
                    <SelectItem value="Screamo">Screamo</SelectItem>
                    <SelectItem value="Post-Rock">Post-Rock</SelectItem>
                    <SelectItem value="Shoegaze">Shoegaze</SelectItem>
                    <SelectItem value="Synthwave">Synthwave</SelectItem>
                    <SelectItem value="Vaporwave">Vaporwave</SelectItem>
                    <SelectItem value="Lo-Fi">Lo-Fi</SelectItem>
                    <SelectItem value="Chillhop">Chillhop</SelectItem>
                    <SelectItem value="Lofi Hip-Hop">Lofi Hip-Hop</SelectItem>
                    <SelectItem value="Instrumental">Instrumental</SelectItem>
                    <SelectItem value="Orchestral">Orchestral</SelectItem>
                    <SelectItem value="Film Score">Film Score</SelectItem>
                    <SelectItem value="Video Game Music">Video Game Music</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-location">Location</Label>
                <Input 
                  id="edit-location" 
                  value={editArtistForm.location}
                  onChange={(e) => setEditArtistForm({...editArtistForm, location: e.target.value})}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="edit-bio">Bio</Label>
                <Textarea 
                  id="edit-bio" 
                  value={editArtistForm.bio}
                  onChange={(e) => setEditArtistForm({...editArtistForm, bio: e.target.value})}
                />
              </div>

              {/* Image Uploads for Edit */}
              <div className="sm:col-span-2 border-t pt-4 mt-2">
                <h3 className="text-sm font-semibold mb-4">Images</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Thumbnail/Logo Upload */}
                  <div>
                    <Label htmlFor="edit-thumbnail">Thumbnail/Logo</Label>
                    <div className="mt-2">
                      {editThumbnailPreview ? (
                        <div className="relative">
                          <img 
                            src={editThumbnailPreview} 
                            alt="Thumbnail preview" 
                            className="w-full h-32 object-cover rounded-md border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-1 right-1"
                            onClick={removeEditThumbnail}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed rounded-md p-4 text-center">
                          <img 
                            src={selectedArtist.image_url || '/placeholder-user.jpg'} 
                            alt="Current thumbnail" 
                            className="w-full h-32 object-cover rounded-md opacity-50"
                          />
                          <Input
                            id="edit-thumbnail"
                            type="file"
                            accept="image/*"
                            onChange={handleEditThumbnailChange}
                            className="mt-2"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Logo Upload */}
                  <div>
                    <Label htmlFor="edit-logo">Logo</Label>
                    <div className="mt-2">
                      {editLogoPreview ? (
                        <div className="relative">
                          <img 
                            src={editLogoPreview} 
                            alt="Logo preview" 
                            className="w-full h-32 object-cover rounded-md border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-1 right-1"
                            onClick={removeEditLogo}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed rounded-md p-4 text-center">
                          {(selectedArtist.social_media as any)?.logo_url ? (
                            <img 
                              src={(selectedArtist.social_media as any).logo_url} 
                              alt="Current logo" 
                              className="w-full h-32 object-cover rounded-md opacity-50"
                            />
                          ) : (
                            <div className="w-full h-32 bg-gray-100 rounded-md flex items-center justify-center text-gray-400 text-sm">
                              No logo
                            </div>
                          )}
                          <Input
                            id="edit-logo"
                            type="file"
                            accept="image/*"
                            onChange={handleEditLogoChange}
                            className="mt-2"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Main Image Upload */}
                  <div>
                    <Label htmlFor="edit-image">Main Image</Label>
                    <div className="mt-2">
                      {editImagePreview ? (
                        <div className="relative">
                          <img 
                            src={editImagePreview} 
                            alt="Image preview" 
                            className="w-full h-32 object-cover rounded-md border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-1 right-1"
                            onClick={removeEditImage}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed rounded-md p-4 text-center">
                          {selectedArtist.image_url ? (
                            <img 
                              src={selectedArtist.image_url} 
                              alt="Current image" 
                              className="w-full h-32 object-cover rounded-md opacity-50"
                            />
                          ) : (
                            <div className="w-full h-32 bg-gray-100 rounded-md flex items-center justify-center text-gray-400 text-sm">
                              No image
                            </div>
                          )}
                          <Input
                            id="edit-image"
                            type="file"
                            accept="image/*"
                            onChange={handleEditImageChange}
                            className="mt-2"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditArtistDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditArtist} disabled={uploadingEditImages}>
              {uploadingEditImages ? "Uploading..." : "Update Artist"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checklist Dialog */}
      <Dialog open={showChecklistDialog} onOpenChange={setShowChecklistDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-[#141414] border-gray-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <FileText className="h-5 w-5" />
              Task Checklist - {selectedArtist?.name}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Track and manage artist onboarding tasks
            </DialogDescription>
          </DialogHeader>
          {selectedArtist && (
            <div className="space-y-6">
              {/* Progress Overview */}
              {(() => {
                const progress = getChecklistProgress(selectedArtist.checklist)
                return (
                  <div className="bg-black rounded-lg p-4 border border-gray-800">
                    <h3 className="font-semibold text-white mb-3">Overall Progress</h3>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">
                        {progress.completed} of {progress.total} tasks completed
                      </span>
                      <span className="font-semibold text-lg text-white">{progress.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-300 ${
                          progress.percentage === 100 ? 'bg-green-500' : 
                          progress.percentage >= 75 ? 'bg-blue-500' : 
                          progress.percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${progress.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })()}

              {/* Checklist by Category */}
              {['music_rights', 'social_media', 'legal', 'marketing', 'business'].map(category => {
                const categoryItems = selectedArtist.checklist.filter(item => item.category === category)
                if (categoryItems.length === 0) return null

                const categoryProgress = getChecklistProgress(categoryItems)
                
                return (
                  <div key={category} className="border border-gray-800 rounded-lg overflow-hidden bg-black">
                    <div className="p-4 bg-gray-900 border-b border-gray-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getCategoryIcon(category)}</span>
                          <h3 className="font-semibold capitalize text-white">
                            {category.replace('_', ' ')} ({categoryProgress.completed}/{categoryProgress.total})
                          </h3>
                        </div>
                        <div className="text-sm font-medium text-gray-400">
                          {categoryProgress.percentage}%
                        </div>
                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      {categoryItems.map(item => (
                        <div key={item.id} className="flex items-start gap-3 p-3 border border-gray-700 rounded-lg hover:bg-gray-900 transition-colors">
                          <div className="flex items-center pt-0.5">
                            <input
                              type="checkbox"
                              checked={item.completed}
                              onChange={(e) => toggleChecklistItem(selectedArtist!.id, item.id, e.target.checked)}
                              className="h-4 w-4 text-blue-400 rounded border-gray-600 bg-gray-800 focus:ring-blue-500"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`font-medium ${item.completed ? 'line-through text-gray-500' : 'text-white'}`}>
                              {item.task}
                            </div>
                            {item.notes && (
                              <div className="text-sm text-gray-400 mt-1">
                                📝 {item.notes}
                              </div>
                            )}
                            {item.date_completed && (
                              <div className="text-sm text-green-400 mt-1">
                                ✅ Completed on {new Date(item.date_completed).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                          {item.completed && (
                            <div className="flex-shrink-0 text-green-500">
                              <CheckCircle className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <DialogFooter className="border-t border-gray-800 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowChecklistDialog(false)}
              className="bg-gray-800 text-white border-gray-600 hover:bg-gray-700"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Release Dialog */}
      <Dialog open={showScheduleReleaseDialog} onOpenChange={setShowScheduleReleaseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#141414] border-gray-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Calendar className="h-5 w-5" />
              Schedule Release - {selectedArtist?.name}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Create a production schedule for artist releases
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={createScheduleItem} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title" className="text-sm font-medium text-white">Title *</Label>
                <Input
                  id="title"
                  value={newScheduleItem.title}
                  onChange={(e) => setNewScheduleItem({...newScheduleItem, title: e.target.value})}
                  placeholder="e.g., New Single Release"
                  className="bg-gray-800 border-gray-600 text-white"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="type" className="text-sm font-medium text-white">Type *</Label>
                <Select value={newScheduleItem.type} onValueChange={(value: any) => setNewScheduleItem({...newScheduleItem, type: value})}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="collaboration">Collaboration</SelectItem>
                    <SelectItem value="song_production">Song Production</SelectItem>
                    <SelectItem value="beat_production">Beat Production</SelectItem>
                    <SelectItem value="mixing">Mixing</SelectItem>
                    <SelectItem value="mastering">Mastering</SelectItem>
                    <SelectItem value="recording">Recording</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="priority" className="text-sm font-medium text-white">Priority *</Label>
                <Select value={newScheduleItem.priority} onValueChange={(value: any) => setNewScheduleItem({...newScheduleItem, priority: value})}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="assigned_to" className="text-sm font-medium text-white">Assigned To</Label>
                <Input
                  id="assigned_to"
                  value={newScheduleItem.assigned_to}
                  onChange={(e) => setNewScheduleItem({...newScheduleItem, assigned_to: e.target.value})}
                  placeholder="e.g., Producer Name"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
              
              <div>
                <Label htmlFor="scheduled_date" className="text-sm font-medium text-white">Scheduled Date *</Label>
                <Input
                  id="scheduled_date"
                  type="date"
                  value={newScheduleItem.scheduled_date}
                  onChange={(e) => setNewScheduleItem({...newScheduleItem, scheduled_date: e.target.value})}
                  className="bg-gray-800 border-gray-600 text-white"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="due_date" className="text-sm font-medium text-white">Due Date *</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={newScheduleItem.due_date}
                  onChange={(e) => setNewScheduleItem({...newScheduleItem, due_date: e.target.value})}
                  className="bg-gray-800 border-gray-600 text-white"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="location" className="text-sm font-medium text-white">Location</Label>
                <Input
                  id="location"
                  value={newScheduleItem.location}
                  onChange={(e) => setNewScheduleItem({...newScheduleItem, location: e.target.value})}
                  placeholder="e.g., Studio A, Home Studio"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
              
              <div>
                <Label htmlFor="budget" className="text-sm font-medium text-white">Budget</Label>
                <Input
                  id="budget"
                  type="number"
                  value={newScheduleItem.budget}
                  onChange={(e) => setNewScheduleItem({...newScheduleItem, budget: parseFloat(e.target.value) || 0})}
                  placeholder="0.00"
                  step="0.01"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="description" className="text-sm font-medium text-white">Description</Label>
              <Textarea
                id="description"
                value={newScheduleItem.description}
                onChange={(e) => setNewScheduleItem({...newScheduleItem, description: e.target.value})}
                placeholder="Describe the production task or session..."
                rows={3}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            
            <div>
              <Label htmlFor="notes" className="text-sm font-medium text-white">Notes</Label>
              <Textarea
                id="notes"
                value={newScheduleItem.notes}
                onChange={(e) => setNewScheduleItem({...newScheduleItem, notes: e.target.value})}
                placeholder="Additional notes or requirements..."
                rows={2}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            
            {scheduleItemCreateError && (
              <div className="text-red-400 text-sm">{scheduleItemCreateError}</div>
            )}
            
            <DialogFooter className="border-t border-gray-800 pt-4">
              <Button 
                type="submit" 
                disabled={scheduleItemCreating}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {scheduleItemCreating ? 'Creating...' : 'Schedule Release'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowScheduleReleaseDialog(false)}
                className="bg-gray-800 text-white border-gray-600 hover:bg-gray-700"
              >
                Cancel
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rights Management Dialog */}
      <Dialog open={showRightsManagementDialog} onOpenChange={setShowRightsManagementDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-[#141414] border-gray-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <FileText className="h-5 w-5" />
              Rights & Metadata Management - {selectedArtist?.name}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Manage copyright, publishing rights, and metadata
            </DialogDescription>
          </DialogHeader>
          
          {selectedArtist && (
            <div className="space-y-6">
              {/* Rights Completion Overview */}
              {(() => {
                const rightsStatus = getRightsCompletionStatus(selectedArtist.rights_metadata)
                return (
                  <div className="bg-black rounded-lg p-4 border border-gray-800">
                    <h3 className="font-semibold text-white mb-3">Rights Completion Status</h3>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">
                        {rightsStatus.completed} of {rightsStatus.total} categories completed
                      </span>
                      <span className="font-semibold text-lg text-white">{rightsStatus.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-300 ${
                          rightsStatus.percentage === 100 ? 'bg-green-500' : 
                          rightsStatus.percentage >= 75 ? 'bg-blue-500' : 
                          rightsStatus.percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${rightsStatus.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })()}

              {/* ISRC & UPC Codes */}
              <div className="bg-black rounded-lg border border-gray-800 overflow-hidden">
                <div className="p-4 bg-gray-900 border-b border-gray-800">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    🔢 Identification Codes
                  </h3>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <h4 className="text-white font-medium mb-2">ISRC Codes</h4>
                    {selectedArtist.rights_metadata?.isrc_codes && Object.keys(selectedArtist.rights_metadata.isrc_codes).length > 0 ? (
                      <div className="space-y-2">
                        {Object.entries(selectedArtist.rights_metadata.isrc_codes).map(([song, code]) => (
                          <div key={song} className="flex justify-between items-center bg-gray-800 p-3 rounded border border-gray-700">
                            <span className="text-gray-300">{song}</span>
                            <span className="text-green-400 font-mono">{code}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No ISRC codes registered</p>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="text-white font-medium mb-2">UPC Codes</h4>
                    {selectedArtist.rights_metadata?.upc_codes && Object.keys(selectedArtist.rights_metadata.upc_codes).length > 0 ? (
                      <div className="space-y-2">
                        {Object.entries(selectedArtist.rights_metadata.upc_codes).map(([release, code]) => (
                          <div key={release} className="flex justify-between items-center bg-gray-800 p-3 rounded border border-gray-700">
                            <span className="text-gray-300">{release}</span>
                            <span className="text-blue-400 font-mono">{code}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No UPC codes registered</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Publishing Rights */}
              <div className="bg-black rounded-lg border border-gray-800 overflow-hidden">
                <div className="p-4 bg-gray-900 border-b border-gray-800">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    📝 Publishing Rights
                  </h3>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="text-gray-400 text-sm">Master Rights Owner:</span>
                      <div className="text-white font-medium">{selectedArtist.rights_metadata.master_rights_owner}</div>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Performance Rights Org:</span>
                      <div className="text-white font-medium">{selectedArtist.rights_metadata.performance_rights_org}</div>
                    </div>
                  </div>
                  
                  {selectedArtist.rights_metadata?.publishing_rights && selectedArtist.rights_metadata.publishing_rights.length > 0 ? (
                    <div className="space-y-3">
                      {selectedArtist.rights_metadata.publishing_rights.map((pub) => (
                        <div key={pub.id} className="bg-gray-800 p-4 rounded border border-gray-700">
                          <h4 className="text-white font-medium mb-2">{pub.song_title}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-gray-400">Writers:</span>
                              <div className="text-gray-300">{pub.writers.join(', ')}</div>
                            </div>
                            <div>
                              <span className="text-gray-400">Publishers:</span>
                              <div className="text-gray-300">{pub.publishers.join(', ')}</div>
                            </div>
                          </div>
                          <div className="mt-2 flex gap-4">
                            <Badge className={pub.mechanical_license ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                              Mechanical: {pub.mechanical_license ? 'Yes' : 'No'}
                            </Badge>
                            <Badge className={pub.sync_license_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                              Sync: {pub.sync_license_available ? 'Available' : 'Not Available'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No publishing rights registered</p>
                  )}
                </div>
              </div>

              {/* Sample Clearances */}
              <div className="bg-black rounded-lg border border-gray-800 overflow-hidden">
                <div className="p-4 bg-gray-900 border-b border-gray-800">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    🎵 Sample Clearances
                  </h3>
                </div>
                <div className="p-4">
                  {selectedArtist.rights_metadata?.sample_clearances && selectedArtist.rights_metadata.sample_clearances.length > 0 ? (
                    <div className="space-y-3">
                      {selectedArtist.rights_metadata.sample_clearances.map((sample) => (
                        <div key={sample.id} className="bg-gray-800 p-4 rounded border border-gray-700">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="text-white font-medium">{sample.sample_name}</h4>
                              <p className="text-gray-400 text-sm">
                                {sample.original_artist} - "{sample.original_song}"
                              </p>
                            </div>
                            <Badge className={getClearanceStatusColor(sample.clearance_status)}>
                              {sample.clearance_status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                            <div>
                              <span className="text-gray-400">Usage Type:</span>
                              <div className="text-gray-300">{sample.usage_type.replace('_', ' ')}</div>
                            </div>
                            {sample.usage_percentage && (
                              <div>
                                <span className="text-gray-400">Usage %:</span>
                                <div className="text-gray-300">{sample.usage_percentage}%</div>
                              </div>
                            )}
                            {sample.clearance_cost && (
                              <div>
                                <span className="text-gray-400">Cost:</span>
                                <div className="text-gray-300">${sample.clearance_cost.toLocaleString()}</div>
                              </div>
                            )}
                          </div>
                          {sample.notes && (
                            <div className="mt-2 text-sm">
                              <span className="text-gray-400">Notes: </span>
                              <span className="text-gray-300">{sample.notes}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No samples requiring clearance</p>
                  )}
                </div>
              </div>

              {/* Copyright Registrations */}
              <div className="bg-black rounded-lg border border-gray-800 overflow-hidden">
                <div className="p-4 bg-gray-900 border-b border-gray-800">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    ©️ Copyright Registrations
                  </h3>
                </div>
                <div className="p-4">
                  {selectedArtist.rights_metadata?.copyright_registrations && Object.keys(selectedArtist.rights_metadata.copyright_registrations).length > 0 ? (
                    <div className="space-y-3">
                      {Object.entries(selectedArtist.rights_metadata.copyright_registrations).map(([song, reg]) => (
                        <div key={song} className="bg-gray-800 p-4 rounded border border-gray-700">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="text-white font-medium">{song}</h4>
                            <Badge className={getCopyrightStatusColor(reg.status)}>
                              {reg.status}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            {reg.registration_number && (
                              <div>
                                <span className="text-gray-400">Registration #:</span>
                                <div className="text-gray-300 font-mono">{reg.registration_number}</div>
                              </div>
                            )}
                            {reg.filed_date && (
                              <div>
                                <span className="text-gray-400">Filed Date:</span>
                                <div className="text-gray-300">{new Date(reg.filed_date).toLocaleDateString()}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No copyright registrations filed</p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="border-t border-gray-800 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowRightsManagementDialog(false)}
              className="bg-gray-800 text-white border-gray-600 hover:bg-gray-700"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
