"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  Play,
  Pause,
  SkipForward,
  Rewind,
  Volume2,
  Mic,
  FileText,
  Expand,
  Minimize,
  Plus,
  X,
  Repeat,
  DoorClosedIcon as CloseIcon,
} from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { toast } from "@/components/ui/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/AuthContext"
import Link from "next/link"
import { AuthWindow } from "@/components/AuthWindow"
import { usePlayer } from "@/contexts/PlayerContext"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { usePathname } from "next/navigation"

interface Beat {
  id: string
  title: string
  artist: string
  coverImage: string
  audioUrl: string
}

interface Playlist {
  id: string
  name: string
  beats: string[]
}

export function SiteWideBeatPlayer() {
  const { currentBeat, setCurrentBeat, isPlaying, setIsPlaying } = usePlayer()
  const [volume, setVolume] = useState(80)
  const [progress, setProgress] = useState(0)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null)
  const [lyrics, setLyrics] = useState("")
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [newPlaylistName, setNewPlaylistName] = useState("")
  const [isRepeat, setIsRepeat] = useState(false) // Added repeat state
  const audioRef = useRef<HTMLAudioElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const { user } = useAuth()
  const [session, setSession] = useState<{ lyrics: string; recordedAudio: Blob | null }>({
    lyrics: "",
    recordedAudio: null,
  })
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)
  const [showAuthWindow, setShowAuthWindow] = useState(false)
  const [savedSessions, setSavedSessions] = useState<{ id: string; name: string; date: string }[]>([])
  const [isPlaylistsModalOpen, setIsPlaylistsModalOpen] = useState(false)
  const [isExpandedViewVisible, setIsExpandedViewVisible] = useState(true) // Added expanded view state

  const pathname = usePathname()

  useEffect(() => {
    setIsExpandedViewVisible(false)
    setIsExpanded(false)
  }, [pathname])

  // useEffect(() => {
  //   // Simulating a beat being played
  //   setCurrentBeat({
  //     id: '1',
  //     title: 'Cosmic Rhythm',
  //     artist: 'ZeusBeats',
  //     coverImage: '/placeholder.svg',
  //     audioUrl: '/placeholder-audio.mp3'
  //   })
  // }, [])

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
  }, [isPlaying, volume, currentBeat])

  useEffect(() => {
    if (currentBeat && isPlaying) {
      fetch('/api/beats/play', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentBeat.id })
      })
    }
    // Only run when a new beat starts playing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBeat?.id, isPlaying])

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

  const toggleRepeat = () => setIsRepeat(!isRepeat) // Added toggleRepeat function

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

      // Create sources for microphone and beat
      const micSource = audioContext.createMediaStreamSource(stream)
      const beatSource = audioContext.createMediaElementSource(audioRef.current!)

      // Create gain nodes for volume control
      const micGain = audioContext.createGain()
      const beatGain = audioContext.createGain()

      // Set volumes
      micGain.gain.setValueAtTime(0.9, audioContext.currentTime) // 90% volume for mic
      beatGain.gain.setValueAtTime(0.65, audioContext.currentTime) // 65% volume for beat

      // Connect the sources to their respective gain nodes
      micSource.connect(micGain)
      beatSource.connect(beatGain)

      // Create a merger to combine both audio streams
      const merger = audioContext.createChannelMerger(2)
      micGain.connect(merger, 0, 0)
      beatGain.connect(merger, 0, 1)

      // Connect the merger to the destination (speakers)
      merger.connect(audioContext.destination)

      // Start recording the merged audio
      const destStream = audioContext.createMediaStreamDestination()
      merger.connect(destStream)

      mediaRecorderRef.current = new MediaRecorder(destStream.stream)
      const chunks: BlobPart[] = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/ogg; codecs=opus" })
        setRecordedAudio(blob)
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
      if (audioRef.current && !isPlaying) {
        audioRef.current.play()
        setIsPlaying(true)
      }
    } catch (error) {
      console.error("Error starting recording:", error)
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
      saveRecording()
    }
  }

  const saveRecording = () => {
    if (recordedAudio && currentBeat) {
      // TODO: Implement actual saving logic
      console.log("Saving recording for beat:", currentBeat.id)
      toast({
        title: "Recording Saved",
        description: "Your recording has been saved and added to your playlist.",
      })
    }
  }

  const saveSession = () => {
    if (!user) {
      setSession({ lyrics, recordedAudio })
      setShowAuthPrompt(true)
      return
    }

    if (currentBeat) {
      const newSession = {
        id: Date.now().toString(),
        name: `${currentBeat.title} Session`,
        date: new Date().toLocaleString(),
      }
      setSavedSessions([...savedSessions, newSession])

      // TODO: Implement actual saving logic
      console.log("Saving session for beat:", currentBeat.id)

      // Check if there's a saved session
      if (session.lyrics || session.recordedAudio) {
        // Use the saved session data
        console.log("Using saved session data:", session)
        // Reset the saved session
        setSession({ lyrics: "", recordedAudio: null })
      }

      toast({
        title: "Session Saved",
        description: "Your session has been saved to your Sessions playlist.",
      })
    } else {
      toast({
        title: "Error",
        description: "No beat is currently playing. Unable to save session.",
        variant: "destructive",
      })
    }
  }

  const addToPlaylist = (playlistId: string) => {
    if (currentBeat) {
      setPlaylists(
        playlists.map((playlist) =>
          playlist.id === playlistId ? { ...playlist, beats: [...playlist.beats, currentBeat.id] } : playlist,
        ),
      )
      toast({
        title: "Beat Added",
        description: `"${currentBeat.title}" has been added to your playlist.`,
      })
    }
  }

  const createPlaylist = () => {
    if (newPlaylistName.trim()) {
      const newPlaylist: Playlist = {
        id: Date.now().toString(),
        name: newPlaylistName,
        beats: currentBeat ? [currentBeat.id] : [],
      }
      setPlaylists([...playlists, newPlaylist])
      setNewPlaylistName("")
      toast({
        title: "Playlist Created",
        description: `New playlist "${newPlaylistName}" has been created.`,
      })
    }
  }

  const openSession = (sessionId: string) => {
    // TODO: Implement logic to load the selected session
    console.log(`Opening session with id: ${sessionId}`)
    toast({
      title: "Session Opened",
      description: `Session ${sessionId} has been loaded.`,
    })
  }

  const openPlaylistsModal = () => {
    if (playlists.length === 0) {
      toast({
        title: "No Playlists",
        description: "You haven't created any playlists yet.",
        variant: "destructive",
      })
    } else {
      setIsPlaylistsModalOpen(true)
    }
  }

  const handleClose = () => {
    setCurrentBeat(null)
    setIsPlaying(false)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }

  if (!currentBeat) return null

  return (
    <>
      <Card
        className={`site-wide-player ${isExpanded ? "expanded" : "collapsed"} ${
          isExpandedViewVisible ? "h-auto" : "h-20"
        }`}
        style={{ marginTop: isExpanded && isExpandedViewVisible ? "2rem" : "0" }}
      >
        <CardContent className={`p-4 pt-0 h-full flex flex-col ${isExpanded ? "pb-16" : ""}`}>
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setIsExpanded((prev) => !prev)
                setIsExpandedViewVisible(true) // Added to show expanded view on click
              }}
              className="bg-background rounded-full"
            >
              {isExpanded ? <Minimize className="h-6 w-6" /> : <Expand className="h-6 w-6" />}
            </Button>
          </div>
          <div className="flex items-center mb-4 relative">
            <Image
              src={(currentBeat as any).coverImage || "/placeholder.svg"}
              alt={currentBeat.title}
              width={100}
              height={100}
              className="rounded-md mr-4"
            />
            <div className="flex-grow">
              <h3 className="font-semibold">{currentBeat.title}</h3>
              <Link
                href={`/producers/${currentBeat.artist}`}
                className="text-sm text-gray-400 hover:text-primary transition-colors"
              >
                {currentBeat.artist}
              </Link>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleClose}
              className="absolute top-0 right-0 rounded-none h-8 w-8 p-0 flex items-center justify-center"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex justify-center items-center mb-4">
            <div className="flex items-center space-x-4">
              <Button size="lg" variant="secondary" onClick={() => {}}>
                <Rewind className="h-6 w-6" />
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => {
                  if (!isRecording) {
                    togglePlay()
                  }
                }}
              >
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
              </Button>
              <Button size="lg" variant="secondary" onClick={() => {}}>
                <SkipForward className="h-6 w-6" />
              </Button>
              <Button size="lg" variant="secondary" onClick={toggleRepeat}>
                <Repeat className={`h-6 w-6 ${isRepeat ? "text-primary" : ""}`} />
              </Button>
              <Button size="lg" variant="secondary" onClick={openPlaylistsModal}>
                Playlists
              </Button>
            </div>
          </div>
          <Slider className="mb-4" value={[progress]} max={100} step={0.1} onValueChange={handleSeek} />
          {isExpanded && isExpandedViewVisible && (
            <div className="flex-grow overflow-hidden">
              <div className="flex flex-col h-full">
                <div className="mb-4"></div>
                <div className="flex-grow mb-2">
                  <h4 className="font-semibold mb-1">Lyrics</h4>
                  <Textarea
                    value={lyrics}
                    onChange={(e) => setLyrics(e.target.value)}
                    placeholder="Write your lyrics here..."
                    className="h-[calc(100vh-350px)] mb-1 resize-none"
                  />
                </div>
              </div>
              <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center space-x-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="sm">
                      Open Session
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {savedSessions.length > 0 ? (
                      savedSessions.map((session) => (
                        <DropdownMenuItem key={session.id} onSelect={() => openSession(session.id)}>
                          {session.name} - {session.date}
                        </DropdownMenuItem>
                      ))
                    ) : (
                      <DropdownMenuItem disabled>No saved sessions</DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant={isRecording ? "destructive" : "secondary"}
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`w-12 h-12 rounded-full ${isRecording ? "animate-pulse" : ""}`}
                >
                  <Mic className={`h-5 w-5 ${isRecording ? "text-white" : ""}`} />
                  <span className="sr-only">{isRecording ? "Stop Recording" : "Start Recording"}</span>
                </Button>
                <Button variant="secondary" size="sm" onClick={saveSession}>
                  Save Session
                </Button>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4"
                onClick={() => setIsExpandedViewVisible(false)}
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
          )}
        </CardContent>
        <audio
          ref={audioRef}
          src={currentBeat?.audioUrl}
          onTimeUpdate={(e) => setProgress((e.currentTarget.currentTime / e.currentTarget.duration) * 100)}
          onEnded={() => {
            // Added onEnded handler for repeat functionality
            if (isRepeat) {
              audioRef.current?.play()
            } else {
              setIsPlaying(false)
              setProgress(0)
            }
          }}
        />
      </Card>
      {showAuthPrompt && (
        <Dialog open={showAuthPrompt} onOpenChange={setShowAuthPrompt}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create an account or log in</DialogTitle>
            </DialogHeader>
            <p>You need to be logged in to save your session. Your current session will be saved temporarily.</p>
            <div className="flex justify-between mt-4">
              <Button onClick={() => setShowAuthWindow(true)}>Sign Up / Log In</Button>
              <Button variant="outline" onClick={() => setShowAuthPrompt(false)}>
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {showAuthWindow && (
        <Dialog open={showAuthWindow} onOpenChange={setShowAuthWindow}>
          <DialogContent>
            <AuthWindow
              onClose={() => setShowAuthWindow(false)}
              onSuccess={() => {
                setShowAuthWindow(false)
                saveSession()
              }}
            />
          </DialogContent>
        </Dialog>
      )}
      <Dialog open={isPlaylistsModalOpen} onOpenChange={setIsPlaylistsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your Playlists</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[300px] w-full">
            {playlists.length > 0 ? (
              playlists.map((playlist) => (
                <div key={playlist.id} className="flex justify-between items-center mb-2 p-2 bg-secondary rounded">
                  <span>
                    {playlist.name} ({playlist.beats.length} beats)
                  </span>
                  <Button variant="outline" onClick={() => addToPlaylist(playlist.id)}>
                    Add Current Beat
                  </Button>
                </div>
              ))
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Playlists</AlertTitle>
                <AlertDescription>
                  You haven't created any playlists yet. Create a playlist to start organizing your favorite beats.
                </AlertDescription>
              </Alert>
            )}
          </ScrollArea>
          <div className="flex items-center mt-4">
            <Input
              type="text"
              placeholder="New playlist name"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              className="flex-grow mr-2"
            />
            <Button onClick={createPlaylist}>
              <Plus className="h-4 w-4 mr-2" />
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

