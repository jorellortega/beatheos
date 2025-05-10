"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Play, Pause, SkipForward, Rewind, Volume2, Share2, ShoppingCart } from 'lucide-react'
import { WaveformVisualizer } from "@/components/waveform-visualizer"

// Mock data for beats
const mockBeats = [
  { id: 1, title: "Chill Vibes", artist: "LoFi Producer", price: 29.99 },
  { id: 2, title: "Trap Anthem", artist: "Beat Master", price: 39.99 },
  { id: 3, title: "Melodic Dreams", artist: "Harmony Creator", price: 34.99 },
  { id: 4, title: "Hard Knock", artist: "Street Beatz", price: 44.99 },
  { id: 5, title: "Smooth Jazz", artist: "Jazz Maestro", price: 49.99 },
]

export default function ShufflePage() {
  const [currentBeat, setCurrentBeat] = useState(mockBeats[0])
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(80)
  const [progress, setProgress] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    // Simulating beat change every 30 seconds when playing
    let interval: NodeJS.Timeout
    if (isPlaying) {
      interval = setInterval(() => {
        const nextBeat = mockBeats[Math.floor(Math.random() * mockBeats.length)]
        setCurrentBeat(nextBeat)
        setProgress(0)
      }, 30000)
    }
    return () => clearInterval(interval)
  }, [isPlaying])

  useEffect(() => {
    const audio = audioRef.current
    if (audio) {
      audio.volume = volume / 100
      if (isPlaying) {
        audio.play()
      } else {
        audio.pause()
      }
    }
  }, [isPlaying, volume])

  const togglePlay = () => setIsPlaying(!isPlaying)

  const nextBeat = () => {
    const nextBeat = mockBeats[Math.floor(Math.random() * mockBeats.length)]
    setCurrentBeat(nextBeat)
    setProgress(0)
  }

  const prevBeat = () => {
    const prevBeat = mockBeats[Math.floor(Math.random() * mockBeats.length)]
    setCurrentBeat(prevBeat)
    setProgress(0)
  }

  const handleVolumeChange = (newVolume: number[]) => {
    setVolume(newVolume[0])
  }

  const handleBuy = () => {
    alert(`Purchasing ${currentBeat.title} for $${currentBeat.price}`)
  }

  const handleShare = () => {
    alert(`Sharing ${currentBeat.title} on social media`)
  }

  const handleSeek = (newProgress: number) => {
    setProgress(newProgress)
    if (audioRef.current) {
      audioRef.current.currentTime = (newProgress / 100) * audioRef.current.duration
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Shuffle Beats</h1>
      <Card className="w-full max-w-3xl mx-auto">
        <CardContent className="p-6">
          <div className="mb-4">
            <h2 className="text-2xl font-semibold">{currentBeat.title}</h2>
            <p className="text-muted-foreground">{currentBeat.artist}</p>
          </div>
          <WaveformVisualizer progress={progress} onSeek={handleSeek} />
          <div className="flex items-center justify-between mb-4 mt-4">
            <div className="flex items-center space-x-4">
              <Button size="lg" variant="secondary" onClick={prevBeat}>
                <Rewind className="h-6 w-6" />
              </Button>
              <Button size="lg" variant="secondary" onClick={togglePlay}>
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
              </Button>
              <Button size="lg" variant="secondary" onClick={nextBeat}>
                <SkipForward className="h-6 w-6" />
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <Slider
                className="w-24"
                value={[volume]}
                max={100}
                step={1}
                onValueChange={handleVolumeChange}
              />
            </div>
          </div>
          <div className="flex justify-between items-center">
            <Button variant="default" className="bg-emerald-500 hover:bg-emerald-600" onClick={handleBuy}>
              <ShoppingCart className="mr-2 h-4 w-4" />
              Buy for ${currentBeat.price}
            </Button>
            <Button variant="secondary" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </div>
        </CardContent>
      </Card>
      <audio
        ref={audioRef}
        src="/placeholder-audio.mp3"
        onTimeUpdate={(e) => setProgress((e.currentTarget.currentTime / e.currentTarget.duration) * 100)}
      />
    </div>
  )
}

