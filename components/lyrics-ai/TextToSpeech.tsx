"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Volume2, Play, Pause, Download, Loader2, Settings } from 'lucide-react'
import { Voice } from '@/types/lyrics'

interface TextToSpeechProps {
  text: string
  apiKey?: string
  onAudioGenerated?: (audioUrl: string) => void
}

export function TextToSpeech({ text, apiKey, onAudioGenerated }: TextToSpeechProps) {
  const [voices, setVoices] = useState<Voice[]>([])
  const [selectedVoice, setSelectedVoice] = useState<string>('')
  const [userApiKey, setUserApiKey] = useState(apiKey || '')
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string>('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState([0.5])
  const [showSettings, setShowSettings] = useState(false)
  
  const audioRef = useRef<HTMLAudioElement>(null)

  // Load voices when API key is provided
  useEffect(() => {
    if (userApiKey && voices.length === 0) {
      loadVoices()
    }
  }, [userApiKey])

  // Handle audio playback
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume[0]
    }
  }, [volume])

  const loadVoices = async () => {
    if (!userApiKey) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/lyrics-ai/get-voices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: userApiKey }),
      })

      if (!response.ok) {
        throw new Error('Failed to load voices')
      }

      const data = await response.json()
      setVoices(data.voices)
      
      // Set default voice (first one)
      if (data.voices.length > 0) {
        setSelectedVoice(data.voices[0].voice_id)
      }
    } catch (error) {
      console.error('Error loading voices:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateSpeech = async () => {
    if (!text.trim() || !selectedVoice || !userApiKey) return

    setIsGenerating(true)
    try {
      const response = await fetch('/api/lyrics-ai/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.trim(),
          voiceId: selectedVoice,
          apiKey: userApiKey,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate speech')
      }

      const data = await response.json()
      setAudioUrl(data.audioUrl)
      onAudioGenerated?.(data.audioUrl)
    } catch (error) {
      console.error('Error generating speech:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const togglePlayback = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const handleAudioEnded = () => {
    setIsPlaying(false)
  }

  const downloadAudio = () => {
    if (!audioUrl) return

    const link = document.createElement('a')
    link.href = audioUrl
    link.download = `speech-${Date.now()}.mp3`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const selectedVoiceData = voices.find(v => v.voice_id === selectedVoice)

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          Text to Speech
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="ml-auto"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* API Key Input */}
        <div>
          <Label htmlFor="tts-api-key">ElevenLabs API Key</Label>
          <Input
            id="tts-api-key"
            type="password"
            placeholder="Enter your ElevenLabs API key"
            value={userApiKey}
            onChange={(e) => setUserApiKey(e.target.value)}
          />
        </div>

        {/* Voice Selection */}
        <div>
          <Label>Voice</Label>
          {isLoading ? (
            <div className="flex items-center gap-2 p-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading voices...
            </div>
          ) : (
            <Select value={selectedVoice} onValueChange={setSelectedVoice}>
              <SelectTrigger>
                <SelectValue placeholder="Select a voice" />
              </SelectTrigger>
              <SelectContent>
                {voices.map((voice) => (
                  <SelectItem key={voice.voice_id} value={voice.voice_id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{voice.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {voice.category} • {voice.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Settings */}
        {showSettings && (
          <div className="space-y-3 p-3 bg-muted rounded-lg">
            <div>
              <Label>Volume: {Math.round(volume[0] * 100)}%</Label>
              <Slider
                value={volume}
                onValueChange={setVolume}
                max={1}
                min={0}
                step={0.1}
                className="mt-2"
              />
            </div>
          </div>
        )}

        {/* Generate Button */}
        <Button
          onClick={generateSpeech}
          disabled={isGenerating || !text.trim() || !selectedVoice || !userApiKey}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Volume2 className="mr-2 h-4 w-4" />
              Generate Speech
            </>
          )}
        </Button>

        {/* Audio Controls */}
        {audioUrl && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={togglePlayback}
                disabled={!audioUrl}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadAudio}
              >
                <Download className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {selectedVoiceData?.name}
              </span>
            </div>
            
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={handleAudioEnded}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              className="w-full"
            />
          </div>
        )}

        {/* Text Preview */}
        {text && (
          <div className="p-3 bg-muted rounded-lg">
            <Label className="text-sm font-medium">Text to Convert:</Label>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
              {text}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}




