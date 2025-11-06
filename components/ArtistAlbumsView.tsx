"use client"

import { useState } from 'react'
import { Grid, List, LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/button'

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

interface ArtistAlbumsViewProps {
  albums: Album[];
}

export function ArtistAlbumsView({ albums }: ArtistAlbumsViewProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'detailed'>('detailed')

  // Grid View - Compact cards
  const GridView = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {albums.map((album) => (
        <div key={album.id} className="bg-card p-3 rounded-lg shadow hover:shadow-lg transition-shadow">
          <img
            src={album.cover_art_url || "/placeholder.jpg"}
            alt={album.title}
            className="w-full aspect-square object-cover rounded-lg mb-2"
          />
          <h3 className="text-sm font-bold mb-1 line-clamp-1">{album.title}</h3>
          <p className="text-gray-400 text-xs mb-1 line-clamp-1">{album.artist}</p>
          {album.release_date && (
            <p className="text-gray-500 text-xs">{new Date(album.release_date).getFullYear()}</p>
          )}
          {album.tracks && album.tracks.length > 0 && (
            <p className="text-gray-400 text-xs mt-1">{album.tracks.length} track{album.tracks.length !== 1 ? 's' : ''}</p>
          )}
        </div>
      ))}
    </div>
  )

  // List View - Horizontal cards
  const ListView = () => (
    <div className="space-y-4">
      {albums.map((album) => (
        <div key={album.id} className="bg-card p-4 rounded-lg shadow flex gap-4">
          <img
            src={album.cover_art_url || "/placeholder.jpg"}
            alt={album.title}
            className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold mb-1">{album.title}</h3>
            <p className="text-gray-400 text-sm mb-2">{album.artist}</p>
            {album.release_date && (
              <p className="text-gray-500 text-xs mb-2">{new Date(album.release_date).toLocaleDateString()}</p>
            )}
            {album.description && (
              <p className="text-gray-400 text-sm line-clamp-2">{album.description}</p>
            )}
            {album.tracks && album.tracks.length > 0 && (
              <p className="text-gray-400 text-xs mt-2">{album.tracks.length} track{album.tracks.length !== 1 ? 's' : ''}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )

  // Detailed View - Full expanded with tracks
  const DetailedView = () => (
    <div className="space-y-8">
      {albums.map((album) => (
        <div key={album.id} className="bg-card p-6 rounded-lg shadow">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Album Cover */}
            <div className="flex-shrink-0">
              <img
                src={album.cover_art_url || "/placeholder.jpg"}
                alt={album.title}
                className="w-full md:w-48 aspect-square object-cover rounded-lg"
              />
            </div>
            
            {/* Album Info and Tracks */}
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-2">{album.title}</h3>
              <p className="text-gray-400 text-lg mb-2">{album.artist}</p>
              {album.release_date && (
                <p className="text-gray-500 text-sm mb-4">{new Date(album.release_date).toLocaleDateString()}</p>
              )}
              {album.description && (
                <p className="text-gray-400 text-sm mb-4">{album.description}</p>
              )}
              
              {/* Tracks */}
              {album.tracks && album.tracks.length > 0 ? (
                <div className="mt-4">
                  <h4 className="text-lg font-semibold mb-3">Tracks</h4>
                  <div className="space-y-3">
                    {album.tracks.map((track) => (
                      <div key={track.id} className="flex items-center gap-4 p-3 bg-gray-900/50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{track.title}</p>
                          {track.duration && (
                            <p className="text-gray-400 text-sm">{track.duration}</p>
                          )}
                        </div>
                        {track.audio_url && (
                          <audio controls src={track.audio_url} className="flex-1 max-w-md" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm mt-4">No tracks available</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div>
      {/* View Toggle Buttons */}
      <div className="flex justify-end mb-4 gap-2">
        <Button
          variant={viewMode === 'grid' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('grid')}
          className="flex items-center gap-2"
        >
          <Grid className="w-4 h-4" />
          <span className="hidden sm:inline">Grid</span>
        </Button>
        <Button
          variant={viewMode === 'list' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('list')}
          className="flex items-center gap-2"
        >
          <List className="w-4 h-4" />
          <span className="hidden sm:inline">List</span>
        </Button>
        <Button
          variant={viewMode === 'detailed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('detailed')}
          className="flex items-center gap-2"
        >
          <LayoutGrid className="w-4 h-4" />
          <span className="hidden sm:inline">Detailed</span>
        </Button>
      </div>

      {/* View Content */}
      {viewMode === 'grid' && <GridView />}
      {viewMode === 'list' && <ListView />}
      {viewMode === 'detailed' && <DetailedView />}
    </div>
  )
}

