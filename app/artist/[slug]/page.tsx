import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { notFound } from "next/navigation"
import { cookies } from 'next/headers'
import EditArtistProfileModal from '@/components/EditArtistProfileModal'
import { getUser } from '@/lib/supabaseUserServer'

interface Song {
  id: string;
  title: string;
  genre?: string;
  price?: number;
  cover_image_url?: string;
  audio_url: string;
  created_at?: string;
}

interface ArtistProfilePageProps {
  params: { slug: string }
}

export default async function ArtistProfilePage({ params }: ArtistProfilePageProps) {
  const supabase = createServerComponentClient({ cookies })
  const { slug } = params

  // Fetch artist by slug
  const { data: artist } = await supabase
    .from('artists')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!artist) return notFound()

  // Fetch songs for this artist
  const { data: songs } = await supabase
    .from('songs')
    .select('*')
    .eq('artist_id', artist.id)
    .order('created_at', { ascending: false })

  // Get the currently logged-in user (server-side)
  const user = await getUser();
  const isOwner = user && user.id === artist.user_id;

  return (
    <div className="container mx-auto py-12">
      <div className="flex flex-col items-center mb-8">
        <img
          src={artist.avatar_url || "/placeholder-user.jpg"}
          alt={artist.display_name}
          className="w-32 h-32 rounded-full object-cover mb-4 border-2 border-primary"
        />
        <h1 className="text-3xl font-bold mb-2">{artist.display_name}</h1>
        <p className="text-gray-400 text-center max-w-xl">{artist.bio}</p>
        {/* Social links */}
        <div className="flex gap-4 mt-4">
          {artist.spotify_url && <a href={artist.spotify_url} target="_blank" rel="noopener noreferrer">Spotify</a>}
          {artist.apple_url && <a href={artist.apple_url} target="_blank" rel="noopener noreferrer">Apple Music</a>}
          {artist.instagram_url && <a href={artist.instagram_url} target="_blank" rel="noopener noreferrer">Instagram</a>}
          {artist.soundcloud_url && <a href={artist.soundcloud_url} target="_blank" rel="noopener noreferrer">SoundCloud</a>}
          {artist.website_url && <a href={artist.website_url} target="_blank" rel="noopener noreferrer">Website</a>}
        </div>
        {/* Edit and Delete Buttons (owner only) */}
        {isOwner && (
          <div className="flex gap-4 mt-6">
            <EditArtistProfileModal artist={artist} />
          </div>
        )}
      </div>
      <h2 className="text-2xl font-semibold mb-4">Songs</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {songs?.length ? songs.map((song: Song) => (
          <div key={song.id} className="bg-card p-4 rounded-lg shadow">
            <div className="flex items-center gap-4 mb-2">
              <img
                src={song.cover_image_url || "/placeholder.jpg"}
                alt={song.title}
                className="w-16 h-16 rounded object-cover"
              />
              <div>
                <h3 className="text-lg font-bold">{song.title}</h3>
                <p className="text-gray-400 text-sm">{song.genre}</p>
              </div>
            </div>
            <audio controls src={song.audio_url} className="w-full mt-2" />
          </div>
        )) : (
          <p className="text-gray-400">No songs uploaded yet.</p>
        )}
      </div>
    </div>
  )
} 