import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from "next/link"
import { cookies } from 'next/headers'

interface Artist {
  id: string;
  display_name: string;
  slug: string;
  avatar_url?: string;
  bio?: string;
}

export default async function ArtistsPage() {
  const supabase = createServerComponentClient({ cookies })
  const { data: artists } = await supabase
    .from('artists')
    .select('id, display_name, slug, avatar_url, bio')
    .order('display_name')

  return (
    <div className="container mx-auto py-12">
      <h1 className="text-3xl font-bold mb-8">Artists</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
        {artists?.map((artist: Artist) => (
          <Link key={artist.id} href={`/artist/${artist.slug}`}>
            <div className="bg-card p-6 rounded-lg shadow hover:scale-105 transition-transform cursor-pointer">
              <img
                src={artist.avatar_url || "/placeholder-user.jpg"}
                alt={artist.display_name}
                className="w-24 h-24 rounded-full object-cover mb-4 border-2 border-primary"
              />
              <h2 className="text-xl font-semibold">{artist.display_name}</h2>
              <p className="text-gray-400 text-sm mt-2">{artist.bio?.slice(0, 80)}{artist.bio?.length > 80 ? "..." : ""}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
} 