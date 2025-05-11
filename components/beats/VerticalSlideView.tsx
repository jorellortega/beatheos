"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, Volume2, Heart, Share2 } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import Image from "next/image"

interface Beat {
  id: number
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

interface VerticalSlideViewProps {
  beats: Beat[]
  onClose: () => void
  disableGlobalPlayer?: boolean
}

export function VerticalSlideView({ beats, onClose, disableGlobalPlayer }: VerticalSlideViewProps) {
  const [currentBeatIndex, setCurrentBeatIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(80)
  const [progress, setProgress] = useState(0)
  
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100
    }
  }, [volume])

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play()
      } else {
        audioRef.current.pause()
      }
    }
  }, [isPlaying])

  const handleSwipe = (direction: number) => {
    const newIndex = currentBeatIndex + direction
    if (newIndex >= 0 && newIndex < beats.length) {
      setCurrentBeatIndex(newIndex)
      setIsPlaying(true)
      setProgress(0)
    }
  }

  const togglePlay = () => setIsPlaying(!isPlaying)

  const handleVolumeChange = (newVolume: number[]) => {
    setVolume(newVolume[0])
  }

  const currentBeat = beats[currentBeatIndex]

  return (
    <div className="fixed inset-0 bg-black z-50 overflow-hidden">
      <Button className="absolute top-4 right-4 z-10" variant="ghost" onClick={onClose}>
        Close
      </Button>
      <AnimatePresence initial={false}>
        <motion.div
          key={currentBeatIndex}
          className="absolute inset-0 flex flex-col"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "-100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 100) {
              handleSwipe(1)
            } else if (info.offset.y < -100) {
              handleSwipe(-1)
            }
          }}
        >
          <div className="flex-1 flex flex-col p-4">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-white">{currentBeat.title}</h2>
              <p className="text-gray-300">{currentBeat.producer}</p>
            </div>
            <div className="flex-1 relative overflow-hidden bg-black">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-full h-full">
                  <Image
                    src={currentBeat.image || "/placeholder.svg"}
                    alt={currentBeat.title}
                    fill
                    className="object-contain"
                    sizes="(max-width: 1600px) 100vw, 1600px"
                  />
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1 bg-primary"
                    style={{
                      height: `${progress}%`,
                      transition: "height 0.1s linear",
                    }}
                  />
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black opacity-50 pointer-events-none"></div>
            </div>
            <div className="mt-4 flex justify-between items-center">
              <Badge>{currentBeat.genre}</Badge>
              <Badge>{currentBeat.bpm} BPM</Badge>
            </div>
          </div>
          <Card className="rounded-t-3xl">
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-4">
                <Button variant="ghost" size="icon" onClick={togglePlay}>
                  {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                </Button>
                <div className="flex items-center space-x-2">
                  <Volume2 className="h-4 w-4" />
                  <Slider className="w-24" value={[volume]} max={100} step={1} onValueChange={handleVolumeChange} />
                </div>
              </div>
              <Slider
                className="mb-4"
                value={[progress]}
                max={100}
                step={0.1}
                onValueChange={(value) => {
                  if (audioRef.current) {
                    audioRef.current.currentTime = (value[0] / 100) * audioRef.current.duration
                  }
                }}
              />
              <div className="flex justify-between">
                <Button variant="ghost" size="icon">
                  <Heart className="h-6 w-6" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Share2 className="h-6 w-6" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
      <audio
        ref={audioRef}
        src={currentBeat.audioUrl}
        onTimeUpdate={(e) => setProgress((e.currentTarget.currentTime / e.currentTarget.duration) * 100)}
        onEnded={() => setIsPlaying(false)}
      />
    </div>
  )
}

