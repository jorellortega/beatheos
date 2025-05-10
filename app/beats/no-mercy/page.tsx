"use client"

import { useState } from 'react'
import { BeatDetails } from '@/components/BeatDetails'
import { SaveToPlaylistModal } from "@/components/SaveToPlaylistModal"
import { PurchaseOptionsModal } from "@/components/PurchaseOptionsModal"
import { usePlayer } from '@/contexts/PlayerContext'
import { toast } from "@/components/ui/use-toast"

export default function NoMercyBeatPage() {
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false)
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false)
  const { setCurrentBeat } = usePlayer()

  const noMercyBeat = {
    id: '7',
    title: 'No Mercy',
    producer: 'ZeusBeats',
    image: '/placeholder.svg',
    plays: '1.5M',
    bpm: 95,
    genre: 'Hip-Hop',
    mood: 'Intense',
    price: 39.99,
    audioUrl: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/No%20Mercy%20-HcT4que7ad06o3cGFyOIG61i3DJ6S2.mp3'
  }

  const handleAddToPlaylist = () => {
    setIsPlaylistModalOpen(true)
  }

  const handlePurchase = () => {
    setIsPurchaseModalOpen(true)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <BeatDetails
        beat={noMercyBeat}
        onAddToPlaylist={handleAddToPlaylist}
        onPurchase={handlePurchase}
      />
      <SaveToPlaylistModal
        isOpen={isPlaylistModalOpen}
        onClose={() => setIsPlaylistModalOpen(false)}
        beat={noMercyBeat}
      />
      <PurchaseOptionsModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        beat={noMercyBeat}
      />
    </div>
  )
}

