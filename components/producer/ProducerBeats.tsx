"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, ShoppingCart, Award, Plus, Pause, Star } from 'lucide-react'
import { SaveToPlaylistModal } from "@/components/SaveToPlaylistModal"
import { PurchaseOptionsModal } from "@/components/PurchaseOptionsModal"
import { usePlayer } from '@/contexts/PlayerContext'

interface Beat {
  id: string | number
  title: string
  plays: number
  isTopBeat: boolean
  price: number
  price_lease: number
  price_premium_lease: number
  price_exclusive: number
  price_buyout: number
  audioUrl: string
  producers: any
  isTopPlayed?: boolean
  cover: string
  cover_art_url: string
}

interface ProducerBeatsProps {
  producerId: string
  searchQuery: string
  isOwnProfile: boolean
  onBeatsFetched?: (beats: Beat[]) => void
}

export function ProducerBeats({ producerId, searchQuery, isOwnProfile, onBeatsFetched }: ProducerBeatsProps) {
  const [beats, setBeats] = useState<Beat[]>([])
  const [selectedBeat, setSelectedBeat] = useState<Beat | null>(null)
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false)
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false)
  const [playingBeatId, setPlayingBeatId] = useState<string | null>(null);
  const { setCurrentBeat, setIsPlaying, isPlaying, currentBeat } = usePlayer()

  useEffect(() => {
    // Fetch beats for the producer from the API
    const fetchBeats = async () => {
      const res = await fetch(`/api/beats?producerId=${producerId}`)
      const data = await res.json()
      let beats = (data || []).map((beat: any) => ({
        id: beat.id,
        title: beat.title,
        plays: beat.play_count ?? 0,
        isTopBeat: false, // You can update this logic if you have a field for top beats
        price: beat.price ?? 0,
        price_lease: beat.price_lease,
        price_premium_lease: beat.price_premium_lease,
        price_exclusive: beat.price_exclusive,
        price_buyout: beat.price_buyout,
        audioUrl: beat.mp3_url || '',
        producers: beat.producers,
        cover: beat.cover_art_url || '/placeholder.svg',
        cover_art_url: beat.cover_art_url || '/placeholder.svg',
      }))
      // Sort by plays descending and flag top 5
      const sorted = [...beats].sort((a: Beat, b: Beat): number => {
        return (b.plays - a.plays);
      })
      const topIds = new Set(sorted.slice(0, 5).map(b => b.id))
      beats = beats.map(b => ({ ...b, isTopPlayed: topIds.has(b.id) }))
      setBeats(beats)
      if (onBeatsFetched) onBeatsFetched(beats)
      }
    fetchBeats()
  }, [producerId, onBeatsFetched])

  const filteredBeats = beats.filter(beat =>
    beat.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSaveToPlaylist = (beat: Beat) => {
    setSelectedBeat(beat)
    setIsPlaylistModalOpen(true)
  }

  const handlePurchase = (beat: Beat) => {
    setSelectedBeat(beat)
    setIsPurchaseModalOpen(true)
  }

  const handlePlay = (beat: Beat) => {
    const isCurrent = currentBeat && String(currentBeat.id) === String(beat.id);
    if (isCurrent) {
      setIsPlaying(!isPlaying);
    } else {
    setCurrentBeat({
      id: String(beat.id),
      title: beat.title,
      artist: beat.producers?.display_name || 'Unknown Producer',
      audioUrl: beat.audioUrl
      });
      setIsPlaying(true);
    }
    setPlayingBeatId(String(beat.id));
  }

  return (
    <>
      <Card className="bg-black">
        <CardHeader>
          <CardTitle>Beats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredBeats.map((beat) => (
              <div
                key={beat.id}
                className={`flex items-center justify-between p-4 bg-secondary rounded-lg transition-all duration-200 ${currentBeat && String(currentBeat.id) === String(beat.id) ? 'border-2 border-primary bg-primary/10 shadow-lg' : ''}`}
                onClick={() => handlePlay(beat)}
              >
                <div className="flex items-center space-x-4">
                  <a
                    href={`/beat/${beat.id}`}
                    onClick={e => e.stopPropagation()}
                    tabIndex={0}
                    aria-label={`View details for ${beat.title}`}
                  >
                    <img
                      src={beat.cover}
                      alt={beat.title}
                      className="w-16 h-16 aspect-square rounded object-cover border border-primary shadow cursor-pointer hover:opacity-80 transition"
                    />
                  </a>
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      {beat.title}
                      {beat.isTopPlayed && (
                        <Star className="w-5 h-5 text-yellow-400" fill="#facc15" stroke="#facc15" />
                      )}
                    </h3>
                    <p className="text-sm text-gray-500">{beat.plays.toLocaleString()} plays</p>
                  </div>
                  {beat.isTopBeat && (
                    <Badge variant="secondary" className="flex items-center">
                      <Award className="w-4 h-4 mr-1" />
                      Top 10
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="icon" onClick={() => handlePlay(beat)}>
                    {currentBeat && String(currentBeat.id) === String(beat.id) && isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    className="gradient-button text-black font-medium hover:text-white"
                    onClick={() => handlePurchase(beat)}
                  >
                    BUY
                      </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <SaveToPlaylistModal
        isOpen={isPlaylistModalOpen}
        onClose={() => setIsPlaylistModalOpen(false)}
        beat={selectedBeat ? { id: String(selectedBeat.id), title: selectedBeat.title } : null}
      />

      <PurchaseOptionsModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        beat={selectedBeat && selectedBeat.id ? {
          ...selectedBeat,
          id: typeof selectedBeat.id === 'string' ? Number(selectedBeat.id) : selectedBeat.id
        } : null}
      />
    </>
  )
}

