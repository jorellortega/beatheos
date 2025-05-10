"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Play, Pause, SkipForward, Rewind, Volume2, Mic, FileText } from 'lucide-react'
import { Slider } from "@/components/ui/slider"
import { toast } from "@/components/ui/use-toast"

interface BeatPlayerProps {
  beatId: string
  beatUrl: string
  beatTitle: string
}

export function BeatPlayer({ beatId, beatUrl, beatTitle }: BeatPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(80)
  const [progress, setProgress] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null)
  const [lyrics, setLyrics] = useState('')
  const audioRef = useRef<HTMLAudioElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)

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

  const handleVolumeChange = (newVolume: number[]) => {
    setVolume(newVolume[0])
  }

  const handleSeek = (newProgress: number[]) => {
    const newProgressValue = newProgress[0]
    setProgress(newProgressValue)
    if (audioRef.current) {
      audioRef.current.currentTime = (newProgressValue / 100) * audioRef.current.duration
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      const chunks: BlobPart[] = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/ogg; codecs=opus' })
        setRecordedAudio(blob)
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
      audioRef.current?.play()
    } catch (error) {
      console.error('Error starting recording:', error)
      toast({
        title: "Recording Error",
        description: "Failed to start recording. Please check your microphone permissions.",
        variant: "destructive",
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      audioRef.current?.pause()
      saveRecording()
    }
  }

  const saveRecording = () => {
    if (recordedAudio) {
      // TODO: Implement actual saving logic
      console.log('Saving recording for beat:', beatId)
      toast({
        title: "Recording Saved",
        description: "Your recording has been saved and added to your playlist.",
      })
    }
  }

  const saveLyrics = () => {
    // TODO: Implement actual saving logic
    console.log('Saving lyrics for beat:', beatId)
    toast({
      title: "Lyrics Saved",
      description: "Your lyrics have been saved with the beat.",
    })
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardContent className="p-6">
        <div className="mb-4">
          <h2 className="text-2xl font-semibold">{beatTitle}</h2>
        </div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Button size="icon" variant="secondary" onClick={() => {}}>
              <Rewind className="h-6 w-6" />
            </Button>
            <Button size="icon" variant="secondary" onClick={togglePlay}>
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            </Button>
            <Button size="icon" variant="secondary" onClick={() => {}}>
              <SkipForward className="h-6 w-6" />
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary" size="icon">
                  <FileText className="h-6 w-6" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Lyrics/Notes for {beatTitle}</DialogTitle>
                </DialogHeader>
                <Textarea
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                  placeholder="Write your lyrics or notes here..."
                  className="min-h-[200px]"
                />
                <Button onClick={saveLyrics}>Save Lyrics</Button>
              </DialogContent>
            </Dialog>
            <Button
              variant={isRecording ? "destructive" : "secondary"}
              size="icon"
              onClick={isRecording ? stopRecording : startRecording}
            >
              <Mic className="h-6 w-6" />
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
        <Slider
          className="mb-4"
          value={[progress]}
          max={100}
          step={0.1}
          onValueChange={handleSeek}
        />
      </CardContent>
      <audio
        ref={audioRef}
        src={beatUrl}
        onTimeUpdate={(e) => setProgress((e.currentTarget.currentTime / e.currentTarget.duration) * 100)}
      />
    </Card>
  )
}

