"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, ShoppingCart, Award, Plus, Pause, Star } from 'lucide-react'
import { SaveToPlaylistModal } from "@/components/SaveToPlaylistModal"
import { PurchaseOptionsModal } from "@/components/PurchaseOptionsModal"
import { usePlayer } from '@/contexts/PlayerContext'
import Link from 'next/link'
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabaseClient"

interface Beat {
  id: string | number
  slug: string
  title: string
  plays: number
  isTopBeat: boolean
  price: number
  price_lease: number
  price_premium_lease: number
  price_exclusive: number
  price_buyout: number
  audioUrl: string
  producers: {
    display_name: string
    slug: string
  }[]
  producer_names: string[]
  producer_slugs: string[]
  isTopPlayed?: boolean
  cover: string
  cover_art_url: string
  producer_ids?: string[]
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
  const { user } = useAuth();

  useEffect(() => {
    // Fetch beats for the producer from the API
    const fetchBeats = async () => {
      const res = await fetch(`/api/beats?producerId=${producerId}`)
      const data = await res.json()
      // Collect all unique producer_ids (from both producer_id and producer_ids)
      const allProducerIds = Array.from(new Set([
        ...data.map((b: any) => b.producer_id),
        ...data.flatMap((b: any) => b.producer_ids || [])
      ].filter(Boolean)))

      // Fetch all producer display names and slugs
      let producerMap: Record<string, { display_name: string, slug: string }> = {}
      if (allProducerIds.length > 0) {
        const { data: producersData, error: producersError } = await supabase
          .from('producers')
          .select('user_id, display_name, slug')
          .in('user_id', allProducerIds)
        if (!producersError && producersData) {
          producerMap = Object.fromEntries((producersData || []).map((p: any) => [
            p.user_id,
            { display_name: p.display_name, slug: p.slug }
          ]))
        }
      }

      let beats = (data || []).map((beat: any) => {
        // Get all producer ids, names, and slugs for this beat
        const ids = [beat.producer_id, ...(beat.producer_ids || []).filter((id: string) => id !== beat.producer_id)]
        const producerNames = ids.map((id: string) => producerMap[id]?.display_name || 'Unknown').filter(Boolean)
        const producerSlugs = ids.map((id: string) => producerMap[id]?.slug || '').filter(Boolean)
        return {
          id: beat.id,
          slug: beat.slug,
          title: beat.title,
          plays: beat.play_count ?? 0,
          isTopBeat: false,
          price: beat.price ?? 0,
          price_lease: beat.price_lease,
          price_premium_lease: beat.price_premium_lease,
          price_exclusive: beat.price_exclusive,
          price_buyout: beat.price_buyout,
          audioUrl: beat.mp3_url || '',
          producers: beat.producers,
          producer_names: producerNames,
          producer_slugs: producerSlugs,
          cover: beat.cover_art_url || '/placeholder.svg',
          cover_art_url: beat.cover_art_url || '/placeholder.svg',
          producer_ids: ids,
        }
      })
      // Sort by plays descending and flag top 5
      const sorted = [...beats].sort((a: Beat, b: Beat): number => {
        return (b.plays - a.plays);
      })
      const topIds = new Set(sorted.slice(0, 5).map((b: Beat) => b.id))
      beats = beats.map((b: Beat) => ({ ...b, isTopPlayed: topIds.has(b.id) }))
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
        artist: beat.producer_names.join(', '),
        audioUrl: beat.audioUrl,
        producerSlug: beat.producer_slugs[0] || '',
        producers: beat.producers || [],
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
                    href={`/beat/${beat.slug}`}
                    onClick={e => e.stopPropagation()}
                    tabIndex={0}
                    aria-label={`View details for ${beat.title}`}
                  >
                    <div className="w-16 h-16 rounded overflow-hidden border border-primary shadow flex items-center justify-center bg-black">
                    <img
                      src={beat.cover}
                      alt={beat.title}
                        className="w-full h-full object-cover"
                    />
                    </div>
                  </a>
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      {beat.title}
                      {beat.isTopPlayed && (
                        <Star className="w-5 h-5 text-yellow-400" fill="#facc15" stroke="#facc15" />
                      )}
                    </h3>
                    <div className="text-sm text-gray-500">
                      by {(beat.producer_ids ?? []).length > 0 && beat.producer_names && beat.producer_names.length > 0
                        ? beat.producer_names.map((name: string, idx: number) => (
                            <span key={(beat.producer_ids ?? [])[idx] || idx}>
                              <Link href={`/producers/${beat.producer_slugs[idx]}`} className="text-gray-400 hover:text-yellow-400">
                                {name}
                              </Link>{idx < beat.producer_names.length - 1 ? ', ' : ''}
                            </span>
                          ))
                        : beat.producers && beat.producers.map((producer, idx) => (
                        <span key={producer.slug}>
                          <Link href={`/producers/${producer.slug}`} className="hover:text-primary transition-colors">
                            {producer.display_name}
                          </Link>
                          {idx < beat.producers.length - 1 && ', '}
                        </span>
                      ))}
                    </div>
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
                    onClick={e => { e.stopPropagation(); handlePurchase(beat); }}
                  >
                    {user ? 'BUY' : 'BUY INSTANTLY'}
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
          id: String(selectedBeat.id)
        } : null}
      />
    </>
  )
}

