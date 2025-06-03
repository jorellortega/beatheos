"use client"

import React, { createContext, useState, useContext } from 'react'

interface Beat {
  id: string
  title: string
  artist: string
  audioUrl: string
  image?: string
  lyrics?: string
  producerSlug?: string
  producers?: { display_name: string; slug: string }[]
  slug?: string
  averageRating?: number
  totalRatings?: number
}

interface PlayerContextType {
  currentBeat: Beat | null
  setCurrentBeat: (beat: Beat | null) => void
  isPlaying: boolean
  setIsPlaying: (playing: boolean) => void
  preloadedBeats: Beat[]
  setPreloadedBeats: (beats: Beat[]) => void
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined)

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentBeat, setCurrentBeat] = useState<Beat | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [preloadedBeats, setPreloadedBeats] = useState<Beat[]>([])

  return (
    <PlayerContext.Provider value={{ currentBeat, setCurrentBeat, isPlaying, setIsPlaying, preloadedBeats, setPreloadedBeats }}>
      {children}
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const context = useContext(PlayerContext)
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider')
  }
  return context
}

