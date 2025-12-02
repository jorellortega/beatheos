import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from "next/link"
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

interface Artist {
  id: string;
  display_name: string;
  slug: string;
  avatar_url?: string;
  bio?: string;
}

interface LabelArtist {
  id: string;
  name: string;
  stage_name?: string;
  slug?: string;
  image_url?: string;
  bio?: string;
}

// Create an admin client for public data queries (bypasses RLS)
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  : null

export default async function ArtistsPage() {
  const cookieStore = await cookies()
  const supabase = createServerComponentClient({ 
    cookies: () => cookieStore 
  })
  
  // Use admin client for public viewing (bypasses RLS)
  const queryClient = supabaseAdmin || supabase
  
  // Fetch both regular artists and label artists
  const [artistsResult, labelArtistsResult] = await Promise.all([
    supabase
      .from('artists')
      .select('id, display_name, slug, avatar_url, bio')
      .order('display_name'),
    queryClient
      .from('label_artists')
      .select('id, name, stage_name, slug, image_url, bio')
      .not('slug', 'is', null)
      .order('name')
  ])
  
  // Log for debugging
  if (labelArtistsResult.error) {
    console.error('Error fetching label artists:', labelArtistsResult.error)
  }
  console.log('Label artists fetched:', labelArtistsResult.data?.length || 0)

  const artists = artistsResult.data || []
  const labelArtists = labelArtistsResult.data || []

  // Combine and transform artists
  const allArtists = [
    ...artists.map(a => ({
      id: a.id,
      name: a.display_name,
      slug: a.slug,
      image_url: a.avatar_url,
      bio: a.bio,
      type: 'artist' as const
    })),
    ...labelArtists.map(a => ({
      id: a.id,
      name: a.stage_name || a.name,
      slug: a.slug!,
      image_url: a.image_url,
      bio: a.bio,
      type: 'label_artist' as const
    }))
  ]

  return (
    <div className="container mx-auto py-12">
      <h1 className="text-3xl font-bold mb-8">Artists</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
        {allArtists.map((artist) => (
          <Link key={artist.id} href={`/artist/${artist.slug}`}>
            <div className="bg-card p-6 rounded-lg shadow hover:scale-105 transition-transform cursor-pointer">
              <img
                src={artist.image_url || "/placeholder-user.jpg"}
                alt={artist.name}
                className="w-24 h-24 rounded-full object-cover mb-4 border-2 border-primary"
              />
              <h2 className="text-xl font-semibold">{artist.name}</h2>
              <p className="text-gray-400 text-sm mt-2">{artist.bio?.slice(0, 80)}{artist.bio && artist.bio.length > 80 ? "..." : ""}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
} 