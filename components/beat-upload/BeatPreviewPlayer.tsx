import { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Play, Pause } from 'lucide-react'

interface BeatPreviewPlayerProps {
  file: File
}

export function BeatPreviewPlayer({ file }: BeatPreviewPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (audio) {
      audio.src = URL.createObjectURL(file)
      audio.onloadedmetadata = () => setDuration(audio.duration)
      audio.ontimeupdate = () => setCurrentTime(audio.currentTime)
    }
  }, [file])

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

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0]
    }
  }

  return (
    <div className="flex items-center space-x-4">
      <Button onClick={togglePlay} variant="outline" size="icon">
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <Slider
        value={[currentTime]}
        max={duration}
        step={0.1}
        onValueChange={handleSeek}
        className="w-full"
      />
      <audio ref={audioRef} />
    </div>
  )
}

