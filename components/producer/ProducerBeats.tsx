"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, ShoppingCart, Award, Plus, Pause } from 'lucide-react'
import { SaveToPlaylistModal } from "@/components/SaveToPlaylistModal"
import { PurchaseOptionsModal } from "@/components/PurchaseOptionsModal"
import { usePlayer } from '@/contexts/PlayerContext'

interface Beat {
  id: string | number
  title: string
  plays: number
  isTopBeat: boolean
  price: number
  audioUrl: string
  producers?: {
    display_name: string
  }
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
  const { setCurrentBeat, setIsPlaying } = usePlayer()

  useEffect(() => {
    // Fetch beats for the producer from the API
    const fetchBeats = async () => {
      const res = await fetch(`/api/beats?producerId=${producerId}`)
      const data = await res.json()
      const beats = (data || []).map((beat: any) => ({
        id: beat.id,
        title: beat.title,
        plays: beat.play_count ?? 0,
        isTopBeat: false, // You can update this logic if you have a field for top beats
        price: beat.price ?? 0,
        audioUrl: beat.mp3_url || '',
        producers: beat.producers
      }))
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
    setCurrentBeat({
      id: String(beat.id),
      title: beat.title,
      artist: beat.producers?.display_name || String(producerId),
      audioUrl: beat.audioUrl
    })
    setIsPlaying(true)
    setPlayingBeatId(beat.id === playingBeatId ? null : String(beat.id))
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Beats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredBeats.map((beat) => (
              <div key={beat.id} className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                <div className="flex items-center space-x-4">
                  <div>
                    <h3 className="font-semibold">{beat.title}</h3>
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
                    {playingBeatId === beat.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  {!isOwnProfile && (
                    <>
                      <Button variant="outline" size="icon" onClick={() => handleSaveToPlaylist(beat)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button className="gradient-button text-black font-medium hover:text-white" onClick={() => handlePurchase(beat)}>
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        ${beat.price.toFixed(2)}
                      </Button>
                    </>
                  )}
                  {isOwnProfile && (
                    <Button variant="outline">Edit Beat</Button>
                  )}
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
        beat={selectedBeat && typeof selectedBeat.id === 'number' ? { id: selectedBeat.id, title: selectedBeat.title, price: selectedBeat.price } : selectedBeat && !isNaN(Number(selectedBeat.id)) ? { id: Number(selectedBeat.id), title: selectedBeat.title, price: selectedBeat.price } : null}
      />
    </>
  )
}

