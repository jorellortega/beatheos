import React, { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, ShoppingCart, Plus } from 'lucide-react'
import Image from 'next/image'
import { Slider } from "@/components/ui/slider"

interface BeatDetailsProps {
  beat: {
    id: string
    title: string
    producer: string
    image: string
    plays: string
    bpm: number
    genre: string
    mood: string
    price: number
    audioUrl: string
  }
  onAddToPlaylist: () => void
  onPurchase: () => void
}

export function BeatDetails({ beat, onAddToPlaylist, onPurchase }: BeatDetailsProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleSeek = (newProgress: number[]) => {
    const newProgressValue = newProgress[0]
    setProgress(newProgressValue)
    if (audioRef.current) {
      audioRef.current.currentTime = (newProgressValue / 100) * audioRef.current.duration
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">{beat.title}</CardTitle>
        <p className="text-muted-foreground">by {beat.producer}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center">
          <Image src={beat.image} alt={beat.title} width={300} height={300} className="rounded-lg" />
        </div>
        <div className="flex justify-between items-center">
          <div className="space-x-2">
            <Badge>{beat.genre}</Badge>
            <Badge>{beat.mood}</Badge>
            <Badge>{beat.bpm} BPM</Badge>
          </div>
          <p className="text-muted-foreground">{beat.plays} plays</p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Button onClick={togglePlay} className="w-20">
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isPlaying ? 'Pause' : 'Play'}
            </Button>
            <Slider
              className="flex-grow"
              value={[progress]}
              max={100}
              step={0.1}
              onValueChange={handleSeek}
            />
          </div>
          <audio
            ref={audioRef}
            src={beat.audioUrl}
            onTimeUpdate={(e) => setProgress((e.currentTarget.currentTime / e.currentTarget.duration) * 100)}
            onEnded={() => setIsPlaying(false)}
          />
        </div>
        <div className="flex justify-between items-center">
          <Button onClick={onAddToPlaylist} variant="outline" className="w-1/2">
            <Plus className="mr-2 h-4 w-4" /> Add to Playlist
          </Button>
          <Button onClick={onPurchase} className="w-1/2">
            <ShoppingCart className="mr-2 h-4 w-4" /> ${beat.price.toFixed(2)}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

