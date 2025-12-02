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
  
  // Use admin client for public queries (bypasses RLS)
  const queryClient = supabaseAdmin || supabase

  // Try to fetch from artists table first
  let { data: artist } = await queryClient
    .from('artists')
    .select('*')
    .eq('slug', slug)
    .single()

  let isLabelArtist = false
  let labelArtist = null

  // If not found in artists table, try label_artists
  if (!artist) {
    const { data: labelArtistData } = await queryClient
      .from('label_artists')
      .select('*')
      .eq('slug', slug)
      .single()
    
    if (labelArtistData) {
      labelArtist = labelArtistData
      isLabelArtist = true
      // Transform label_artist to match artist structure for compatibility
      artist = {
        id: labelArtist.id,
        display_name: labelArtist.stage_name || labelArtist.name,
        slug: labelArtist.slug!,
        avatar_url: labelArtist.image_url,
        bio: labelArtist.bio,
        user_id: labelArtist.managed_by || null,
        spotify_url: (labelArtist.social_media as any)?.spotify_url,
        apple_url: (labelArtist.social_media as any)?.apple_url,
        instagram_url: (labelArtist.social_media as any)?.instagram_url,
        soundcloud_url: (labelArtist.social_media as any)?.soundcloud_url,
        website_url: labelArtist.website
      } as any
    }
  }

  if (!artist) return notFound()

  // Fetch songs for this artist (only for regular artists, not label_artists)
  let songs: Song[] | null = null
  if (!isLabelArtist) {
    const { data: songsData } = await queryClient
      .from('songs')
      .select('*')
      .eq('artist_id', artist.id)
      .order('created_at', { ascending: false })
    songs = songsData
  }

  // Fetch albums for this artist
  let albums: Album[] | null = null
  let albumsError: any = null
  let debugInfo: any = {
    artistUserId: artist.user_id,
    slug: slug,
    isLabelArtist: isLabelArtist,
    labelArtistId: isLabelArtist ? labelArtist?.id : null,
    queryMethod: 'direct',
    usingAdminClient: !!supabaseAdmin
  }

  if (isLabelArtist && labelArtist) {
    // For label_artists, fetch albums/singles by label_artist_id
    console.log('🔍 [DEBUG] Fetching albums for label artist:', labelArtist.id)
    
    // First, check ALL albums with this label_artist_id (without visibility filter)
    const { data: allAlbumsData, error: allAlbumsError } = await queryClient
      .from('albums')
      .select('id, title, label_artist_id, visibility, user_id')
      .eq('label_artist_id', labelArtist.id)
      .order('created_at', { ascending: false })
    
    console.log('🔍 [DEBUG] All albums with label_artist_id:', { 
      count: allAlbumsData?.length || 0, 
      error: allAlbumsError?.message,
      albums: allAlbumsData
    })
    
    // Now fetch only public albums
    const { data: albumsData, error: albumsQueryError } = await queryClient
      .from('albums')
      .select('*')
      .eq('label_artist_id', labelArtist.id)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
    
    console.log('🔍 [DEBUG] Public albums query result:', { 
      count: albumsData?.length || 0, 
      error: albumsQueryError?.message,
      albums: albumsData?.map(a => ({ id: a.id, title: a.title, label_artist_id: a.label_artist_id, visibility: a.visibility }))
    })
    
    albums = albumsData as Album[] || []
    albumsError = albumsQueryError
    
    // Also fetch singles for label_artists
    console.log('🔍 [DEBUG] Fetching singles for label artist:', labelArtist.id)
    const { data: singlesData, error: singlesError } = await queryClient
      .from('singles')
      .select('*')
      .eq('label_artist_id', labelArtist.id)
      .order('created_at', { ascending: false })
    
    console.log('🔍 [DEBUG] Singles query result:', { 
      count: singlesData?.length || 0, 
      error: singlesError?.message,
      singles: singlesData?.map(s => ({ id: s.id, title: s.title, label_artist_id: s.label_artist_id }))
    })
    
    // Transform singles to match songs format for display
    if (singlesData) {
      songs = singlesData.map(s => ({
        id: s.id,
        title: s.title,
        genre: undefined,
        price: undefined,
        cover_image_url: s.cover_art_url,
        audio_url: s.audio_url || '',
        created_at: s.created_at
      })) as Song[]
    }
  } else {
    // For regular artists, use the existing logic
    const { data: allAlbumsForUser, error: allAlbumsError } = await queryClient
      .from('albums')
      .select('*')
      .eq('user_id', artist.user_id)
      .order('created_at', { ascending: false })

    debugInfo.allAlbumsForUser = allAlbumsForUser || []
    debugInfo.allAlbumsError = allAlbumsError
    
    // Now try the public query
    const { data: albumsData, error: albumsQueryError } = await queryClient
      .from('albums')
      .select('*')
      .eq('user_id', artist.user_id)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })

    if (albumsQueryError) {
      albumsError = albumsQueryError
      if (albumsQueryError.message?.includes('column') || albumsQueryError.message?.includes('visibility')) {
        debugInfo.queryMethod = 'fallback_filter'
        albums = (allAlbumsForUser || []).filter((album: any) => album.visibility === 'public') as Album[]
      } else {
        albums = []
      }
    } else {
      albums = albumsData as Album[] || []
    }
  }
  
  console.log('🔍 [DEBUG] Final albums count:', albums?.length || 0)

  // Fetch tracks for each album
  if (albums && albums.length > 0) {
    const albumsWithTracks = await Promise.all(
      albums.map(async (album) => {
        const { data: tracks, error: tracksError } = await queryClient
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
  const isOwner = isLabelArtist 
    ? (user && labelArtist && user.id === labelArtist.managed_by)
    : (user && user.id === artist.user_id);

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