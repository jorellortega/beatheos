import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { notFound } from "next/navigation"
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import EditArtistProfileModal from '@/components/EditArtistProfileModal'
import { ArtistAlbumsView } from '@/components/ArtistAlbumsView'
import { getUser } from '@/lib/supabaseUserServer'

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

interface Song {
  id: string;
  title: string;
  genre?: string;
  price?: number;
  cover_image_url?: string;
  audio_url: string;
  created_at?: string;
}

interface AlbumTrack {
  id: string;
  title: string;
  audio_url?: string;
  duration?: string;
  track_order?: number;
}

interface Album {
  id: string;
  title: string;
  artist: string;
  release_date?: string;
  cover_art_url?: string;
  description?: string;
  visibility?: 'private' | 'public' | 'pause' | 'upcoming';
  tracks?: AlbumTrack[];
}

interface ArtistProfilePageProps {
  params: Promise<{ slug: string }>
}

export default async function ArtistProfilePage({ params }: ArtistProfilePageProps) {
  const { slug } = await params
  const cookieStore = await cookies()
  const supabase = createServerComponentClient({ 
    cookies: () => cookieStore 
  })

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

  // Fetch public albums for this artist
  // Use admin client to bypass RLS since public albums should be viewable by anyone
  let albums: Album[] | null = null
  let albumsError: any = null
  let debugInfo: any = {
    artistUserId: artist.user_id,
    slug: slug,
    queryMethod: 'direct',
    allAlbumsForUser: null,
    publicAlbumsFromQuery: null,
    filteredAlbums: null,
    usingAdminClient: false
  }
  
  // Use admin client if available (bypasses RLS), otherwise use regular client
  const albumsClient = supabaseAdmin || supabase
  debugInfo.usingAdminClient = !!supabaseAdmin
  
  // First, let's get ALL albums for this user to see what we're working with
  const { data: allAlbumsForUser, error: allAlbumsError } = await albumsClient
    .from('albums')
    .select('*')
    .eq('user_id', artist.user_id)
    .order('created_at', { ascending: false })

  debugInfo.allAlbumsForUser = allAlbumsForUser || []
  debugInfo.allAlbumsError = allAlbumsError
  console.log('🔍 [DEBUG] Artist user_id:', artist.user_id)
  console.log('🔍 [DEBUG] Using admin client:', !!supabaseAdmin)
  console.log('🔍 [DEBUG] All albums for user:', JSON.stringify(allAlbumsForUser, null, 2))
  console.log('🔍 [DEBUG] All albums error:', allAlbumsError)
  
  // Now try the public query
  const { data: albumsData, error: albumsQueryError } = await albumsClient
    .from('albums')
    .select('*')
    .eq('user_id', artist.user_id)
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })

  debugInfo.publicAlbumsFromQuery = albumsData || []
  console.log('🔍 [DEBUG] Query filter: visibility = "public"')
  console.log('🔍 [DEBUG] Public albums from query:', JSON.stringify(albumsData, null, 2))
  console.log('🔍 [DEBUG] Query error:', albumsQueryError)

  if (albumsQueryError) {
    albumsError = albumsQueryError
    console.log('🔍 [DEBUG] Query error occurred:', albumsQueryError.message)
    // If the error is about the column not existing, try fetching all albums
    // and we'll filter client-side (as a fallback)
    if (albumsQueryError.message?.includes('column') || albumsQueryError.message?.includes('visibility')) {
      debugInfo.queryMethod = 'fallback_filter'
      console.log('🔍 [DEBUG] Using fallback filter method')
      
      // Filter for public albums only (NULL visibility is treated as private)
      albums = (allAlbumsForUser || []).filter((album: any) => {
        const isPublic = album.visibility === 'public'
        console.log(`🔍 [DEBUG] Album "${album.title}": visibility="${album.visibility}", isPublic=${isPublic}`)
        return isPublic
      }) as Album[]
      
      debugInfo.filteredAlbums = albums
      console.log('🔍 [DEBUG] Filtered albums result:', JSON.stringify(albums, null, 2))
    } else {
      // For other errors, set albums to empty array
      albums = []
      debugInfo.filteredAlbums = []
    }
  } else {
    albums = albumsData as Album[]
    debugInfo.filteredAlbums = albums
    console.log('🔍 [DEBUG] Direct query successful, albums:', JSON.stringify(albums, null, 2))
  }
  
  console.log('🔍 [DEBUG] Final albums count:', albums?.length || 0)

  // Fetch tracks for each album
  if (albums && albums.length > 0) {
    const albumsWithTracks = await Promise.all(
      albums.map(async (album) => {
        const { data: tracks, error: tracksError } = await albumsClient
          .from('album_tracks')
          .select('id, title, audio_url, duration, track_order')
          .eq('album_id', album.id)
          .order('track_order', { ascending: true })
        
        if (tracksError) {
          console.log(`🔍 [DEBUG] Error fetching tracks for album ${album.title}:`, tracksError)
        }
        
        return {
          ...album,
          tracks: tracks || []
        }
      })
    )
    albums = albumsWithTracks
  }

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
      
      {/* Debug Section */}
      {isOwner && (
        <div className="mb-12 p-4 bg-gray-900/50 border border-gray-700 rounded">
          <h3 className="text-lg font-semibold mb-2 text-yellow-400">🔍 Debug Info</h3>
          <div className="space-y-2 text-sm font-mono">
            <p><span className="text-gray-400">Artist user_id:</span> <span className="text-white">{debugInfo.artistUserId}</span></p>
            <p><span className="text-gray-400">Using admin client:</span> <span className="text-white">{debugInfo.usingAdminClient ? 'Yes' : 'No'}</span></p>
            <p><span className="text-gray-400">Query method:</span> <span className="text-white">{debugInfo.queryMethod}</span></p>
            <p><span className="text-gray-400">Total albums for user:</span> <span className="text-white">{debugInfo.allAlbumsForUser?.length || 0}</span></p>
            <p><span className="text-gray-400">Public albums from query:</span> <span className="text-white">{debugInfo.publicAlbumsFromQuery?.length || 0}</span></p>
            <p><span className="text-gray-400">Final albums count:</span> <span className="text-white">{albums?.length || 0}</span></p>
            {debugInfo.allAlbumsError && (
              <p><span className="text-red-400">All albums error:</span> <span className="text-red-300">{debugInfo.allAlbumsError.message}</span></p>
            )}
            {albumsError && (
              <p><span className="text-red-400">Query error:</span> <span className="text-red-300">{albumsError.message}</span></p>
            )}
            {debugInfo.allAlbumsForUser && debugInfo.allAlbumsForUser.length > 0 && (
              <div className="mt-4">
                <p className="text-gray-400 mb-2">All albums visibility status:</p>
                <ul className="list-disc list-inside space-y-1">
                  {debugInfo.allAlbumsForUser.map((album: any) => (
                    <li key={album.id} className="text-white">
                      <span className="font-semibold">{album.title}</span>: visibility = <span className={album.visibility === 'public' ? 'text-green-400' : 'text-gray-400'}>{album.visibility || 'NULL (private)'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Albums Section */}
      {albumsError && (
        <div className="mb-12 p-4 bg-yellow-900/20 border border-yellow-600 rounded">
          <p className="text-yellow-400">Error loading albums: {albumsError.message}</p>
          <p className="text-yellow-300 text-sm mt-2">Make sure the migration has been run to add the visibility column.</p>
        </div>
      )}
      {albums && albums.length > 0 ? (
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Albums</h2>
          <ArtistAlbumsView albums={albums} />
        </div>
      ) : albums && albums.length === 0 && isOwner && (
        <div className="mb-12 p-4 bg-blue-900/20 border border-blue-600 rounded">
          <p className="text-blue-400">No public albums found. Set your albums to "public" visibility in your library to show them here.</p>
        </div>
      )}

      {/* Songs Section */}
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