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
  Shuffle,
  ShoppingCart,
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
import { usePathname, useRouter } from "next/navigation"
import { supabase } from '@/lib/supabaseClient'
import { PurchaseOptionsModal } from "@/components/PurchaseOptionsModal"

interface Beat {
  id: string
  title: string
  artist: string
  audioUrl: string
  image?: string
  lyrics?: string
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
  const [isRepeat, setIsRepeat] = useState(false)
  const [isShuffle, setIsShuffle] = useState(false)
  const [shuffledBeats, setShuffledBeats] = useState<any[]>([])
  const [currentBeatIndex, setCurrentBeatIndex] = useState(0)
  const [playerMode, setPlayerMode] = useState<'default' | 'full'>('default')
  const audioRef = useRef<HTMLAudioElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const { user } = useAuth()
  const [session, setSession] = useState<{ lyrics: string; recordedAudio: Blob | null }>({
    lyrics: "",
    recordedAudio: null,
  })
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)
  const [showAuthWindow, setShowAuthWindow] = useState(false)
  const [savedSessions, setSavedSessions] = useState<{ id: string; name: string; last_modified: string }[]>([])
  const [isPlaylistsModalOpen, setIsPlaylistsModalOpen] = useState(false)
  const [isExpandedViewVisible, setIsExpandedViewVisible] = useState(true)
  const [savingLyrics, setSavingLyrics] = useState(false)
  const [savingSession, setSavingSession] = useState(false)
  const [lyricsFromSession, setLyricsFromSession] = useState(false)
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false)
  const router = useRouter()
  const [showFeatureAuthDialog, setShowFeatureAuthDialog] = useState(false)
  const [allBeats, setAllBeats] = useState<Beat[]>([])

  const pathname = usePathname()

  useEffect(() => {
    setIsExpandedViewVisible(false)
    setIsExpanded(false)
  }, [pathname])

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

  useEffect(() => {
    if (!user || !currentBeat) {
      setLyrics("")
      return
    }
    // Fetch user-specific lyrics from sessions table
    async function fetchUserLyrics() {
      const { data, error } = await supabase
        .from('sessions')
        .select('lyrics')
        .eq('user_id', user.id)
        .eq('beat_ids', String(currentBeat.id))
        .single()
      if (data && data.lyrics) setLyrics(data.lyrics)
      else setLyrics("")
    }
    fetchUserLyrics()
  }, [currentBeat, user])

  useEffect(() => {
    if (!user) return;
    supabase
      .from('sessions')
      .select('id, name, beat_ids, last_modified')
      .eq('user_id', user.id)
      .order('last_modified', { ascending: false })
      .then(({ data }) => {
        if (data) setSavedSessions(data);
      });
  }, [user]);

  useEffect(() => {
    // Only fetch if currentBeat exists and image is missing or empty
    if (currentBeat && (!currentBeat.image || currentBeat.image === "")) {
      supabase
        .from('beats')
        .select('cover_art_url')
        .eq('id', currentBeat.id)
        .single()
        .then(({ data, error }) => {
          if (data && data.cover_art_url) {
            setCurrentBeat(currentBeat ? { ...currentBeat, image: data.cover_art_url } : currentBeat);
          }
        });
    }
  }, [currentBeat]);

  useEffect(() => {
    if (currentBeat && !isShuffle && allBeats.length === 0) {
      (async () => {
        const { data: beats, error } = await supabase
          .from('beats')
          .select('id, title, producer_id, mp3_url, cover_art_url')
          .eq('is_draft', false)
          .order('created_at', { ascending: false })
          .limit(100)
        if (beats && !error) {
          const beatsWithProducers = await Promise.all(
            beats.map(async (beat) => {
              const { data: producer } = await supabase
                .from('producers')
                .select('display_name')
                .eq('user_id', beat.producer_id)
                .single();
              return {
                id: beat.id,
                title: beat.title,
                artist: producer?.display_name || beat.producer_id,
                audioUrl: beat.mp3_url,
                image: beat.cover_art_url,
              }
            })
          )
          setAllBeats(beatsWithProducers)
        }
      })()
    }
  }, [currentBeat, isShuffle, allBeats.length])

  useEffect(() => {
    if (!isShuffle && currentBeat && allBeats.length > 0) {
      const idx = allBeats.findIndex(b => b.id === currentBeat.id)
      if (idx !== -1) setCurrentBeatIndex(idx)
    }
  }, [currentBeat, isShuffle, allBeats])

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

  const toggleRepeat = () => setIsRepeat(!isRepeat)

  const toggleShuffle = async () => {
    if (!isShuffle) {
      // Fetch all beats from Supabase
      const { data: beats, error } = await supabase
        .from('beats')
        .select('id, title, producer_id, mp3_url, cover_art_url');
      
      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch beats for shuffle mode.",
          variant: "destructive",
        });
        return;
      }

      // Get producer display names
      const beatsWithProducers = await Promise.all(
        beats.map(async (beat) => {
          const { data: producer } = await supabase
            .from('producers')
            .select('display_name')
            .eq('user_id', beat.producer_id)
            .single();
          return {
            ...beat,
            artist: producer?.display_name || beat.producer_id,
            audioUrl: beat.mp3_url,
            coverImage: beat.cover_art_url,
          };
        })
      );

      // Shuffle the beats
      const shuffled = [...beatsWithProducers].sort(() => Math.random() - 0.5);
      setShuffledBeats(shuffled);
      setCurrentBeatIndex(0);
      setCurrentBeat(shuffled[0]);
      setIsShuffle(true);
      setIsPlaying(true);
    } else {
      setIsShuffle(false);
      setShuffledBeats([]);
      setCurrentBeatIndex(0);
    }
  };

  const playNextBeat = () => {
    if (isShuffle && shuffledBeats.length > 0) {
      const nextIndex = (currentBeatIndex + 1) % shuffledBeats.length
      setCurrentBeatIndex(nextIndex)
      setCurrentBeat(shuffledBeats[nextIndex])
      setIsPlaying(true)
    } else if (!isShuffle && allBeats.length > 0) {
      const nextIndex = (currentBeatIndex + 1) % allBeats.length
      setCurrentBeatIndex(nextIndex)
      setCurrentBeat(allBeats[nextIndex])
      setIsPlaying(true)
    }
  }

  const playPreviousBeat = () => {
    if (isShuffle && shuffledBeats.length > 0) {
      const prevIndex = (currentBeatIndex - 1 + shuffledBeats.length) % shuffledBeats.length
      setCurrentBeatIndex(prevIndex)
      setCurrentBeat(shuffledBeats[prevIndex])
      setIsPlaying(true)
    } else if (!isShuffle && allBeats.length > 0) {
      const prevIndex = (currentBeatIndex - 1 + allBeats.length) % allBeats.length
      setCurrentBeatIndex(prevIndex)
      setCurrentBeat(allBeats[prevIndex])
      setIsPlaying(true)
    }
  }

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

  const saveSession = async () => {
    if (!user) {
      setSession({ lyrics, recordedAudio })
      setShowAuthPrompt(true)
      return
    }
    if (currentBeat) {
      const { error } = await supabase.from('sessions').insert({
        user_id: user.id,
        name: `${currentBeat.title} Session`,
        beat_ids: String(currentBeat.id),
        lyrics, // Save lyrics to the session
      })
      if (!error) {
      toast({
        title: "Session Saved",
        description: "Your session has been saved to your Sessions playlist.",
      })
      } else {
        toast({
          title: "Error",
          description: "Failed to save session.",
          variant: "destructive",
        })
      }
    } else {
      toast({
        title: "Error",
        description: "No beat is currently playing. Unable to save session.",
        variant: "destructive",
      })
    }
  }

  const openSession = async (sessionId: string) => {
    const { data, error } = await supabase
      .from('sessions')
      .select('beat_ids, lyrics')
      .eq('id', sessionId)
      .single();
    if (data && data.beat_ids && data.beat_ids.length > 0) {
      // Fetch the full beat details
      const { data: beat, error: beatError } = await supabase
        .from('beats')
        .select('id, title, producer_id, mp3_url, cover_art_url')
        .eq('id', data.beat_ids[0])
        .single();
      if (beat) {
        // Fetch the producer's display name
        let displayName = beat.producer_id;
        const { data: producer } = await supabase
          .from('producers')
          .select('display_name')
          .eq('user_id', beat.producer_id)
          .single();
        if (producer && producer.display_name) {
          displayName = producer.display_name;
        }
        setLyricsFromSession(true);
        setCurrentBeat({
          id: beat.id,
          title: beat.title,
          artist: displayName, // Use display name here
          audioUrl: beat.mp3_url,
          image: beat.cover_art_url,
        });
        setLyrics(data.lyrics || "");
        toast({
          title: "Session Opened",
          description: `Session ${sessionId} has been loaded.`,
        });
      } else {
        toast({
          title: "Error",
          description: "Could not load beat details for this session.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Error",
        description: "Failed to open session or no beats in session.",
        variant: "destructive",
      });
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
    setPlayerMode('default')
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }

  const handleOpenSessionClick = () => {
    if (!user) {
      setShowFeatureAuthDialog(true)
      return
    }
    setIsPlaylistsModalOpen(true)
  }

  const handleSaveSessionClick = async () => {
    if (!user) {
      setShowFeatureAuthDialog(true)
      return
    }
    await saveSession();
    setSavingSession(false);
  }

  const handleMicClick = () => {
    if (!user) {
      setShowFeatureAuthDialog(true)
      return
    }
    isRecording ? stopRecording() : startRecording()
  }

  return (
    <div className={`fixed bottom-0 left-0 w-full z-50 transition-all duration-300 ${currentBeat ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full pointer-events-none'}`} style={{willChange: 'opacity, transform'}}>
      <Card
        className={`transition-all duration-300 ${
          playerMode === 'full'
            ? 'max-w-[680px] w-full mx-auto left-1/2 -translate-x-1/2 fixed bottom-4'
            : 'w-auto h-16 fixed bottom-4 right-4'
        }`}
        style={{ marginTop: playerMode === 'full' ? undefined : '0' }}
      >
        <CardContent className={`p-2 pt-0 h-full flex flex-col ${playerMode === 'full' ? "pb-16" : ""}`}>
          {playerMode === 'full' && (
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPlayerMode('default')}
                className="bg-background rounded-full"
              >
                <Minimize className="h-6 w-6" />
              </Button>
            </div>
          )}
          
          {playerMode === 'default' ? (
            <div className="flex items-center justify-end gap-3 h-full">
              <Button
                size="icon"
                variant="ghost"
                onClick={togglePlay}
                className="h-10 w-10"
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setPlayerMode('full')}
                className="h-10 w-10"
              >
                <Expand className="h-5 w-5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleClose}
                className="h-10 w-10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row items-center mb-4 gap-4 w-full">
                <Image
                  src={currentBeat?.image || "/placeholder.svg"}
                  alt={currentBeat?.title || "cover"}
                  width={100}
                  height={100}
                  className="rounded-md mb-2 sm:mb-0 sm:mr-4"
                />
                <div className="flex-grow flex flex-col items-center sm:items-start w-full">
                  <h3 className="font-semibold text-center sm:text-left w-full">{currentBeat?.title || ""}</h3>
                  <Link
                    href={currentBeat ? `/producers/${currentBeat.artist}` : "#"}
                    className="text-sm text-gray-400 hover:text-primary transition-colors text-center sm:text-left w-full"
                  >
                    {currentBeat?.artist || ""}
                  </Link>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-center items-center mb-4 gap-2 sm:gap-4 w-full">
                <div className="flex items-center justify-center gap-2">
                  <Button size="lg" variant="secondary" onClick={playPreviousBeat}>
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
                  <Button size="lg" variant="secondary" onClick={playNextBeat}>
                    <SkipForward className="h-6 w-6" />
                  </Button>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Button size="lg" variant="secondary" onClick={toggleRepeat}>
                    <Repeat className={`h-6 w-6 ${isRepeat ? "text-primary" : ""}`} />
                  </Button>
                  <Button size="lg" variant="secondary" onClick={toggleShuffle}>
                    <Shuffle className={`h-6 w-6 ${isShuffle ? "text-primary" : ""}`} />
                  </Button>
                  <Button size="lg" variant="secondary" onClick={openPlaylistsModal}>
                    Playlists
                  </Button>
                  <Button
                    size="lg"
                    className="bg-[#FFD700] hover:bg-[#FFE55C] text-black font-semibold flex items-center justify-center"
                    onClick={() => setIsPurchaseModalOpen(true)}
                  >
                    <ShoppingCart className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              <Slider className="mb-4" value={[progress]} max={100} step={0.1} onValueChange={handleSeek} />
              <div className="flex-grow overflow-hidden">
                <div className="flex flex-col h-full">
                  <div className="mb-4"></div>
                  <div className="flex-grow mb-2">
                    <h4 className="font-semibold mb-1">Lyrics</h4>
                    <Textarea
                      value={lyrics}
                      onChange={e => setLyrics(e.target.value)}
                      placeholder="Type or paste lyrics here..."
                      className="h-32 mb-2 resize-none bg-secondary text-white"
                    />
                    <Button
                      size="sm"
                      className="mt-1"
                      disabled={savingLyrics || !user || !currentBeat}
                      onClick={async () => {
                        if (!currentBeat || !user) return;
                        setSavingLyrics(true);
                        const { error } = await supabase
                          .from('sessions')
                          .upsert([
                            {
                              user_id: user.id,
                              name: `${currentBeat.title} Session`,
                              beat_ids: String(currentBeat.id),
                              lyrics,
                            }
                          ], { onConflict: 'user_id,beat_ids' })
                        setSavingLyrics(false);
                        if (!error) {
                          toast({
                            title: "Lyrics Saved",
                            description: "Your lyrics have been saved privately.",
                          });
                        } else {
                          toast({
                            title: "Error",
                            description: "Failed to save lyrics.",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      {savingLyrics ? <span className="animate-spin mr-2">⏳</span> : null}
                      Save Lyrics
                    </Button>
                  </div>
                </div>
                <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center space-x-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <span className="inline-flex">
                        <Button variant="secondary" size="sm" onClick={handleOpenSessionClick}>
                          Open Session
                        </Button>
                      </span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {savedSessions.length > 0 ? (
                        savedSessions.map((session) => (
                          <DropdownMenuItem key={session.id} onClick={() => openSession(session.id)}>
                            {session.name} - {session.last_modified ? new Date(session.last_modified).toLocaleString() : ''}
                          </DropdownMenuItem>
                        ))
                      ) : (
                        <DropdownMenuItem disabled>No saved sessions</DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant={isRecording ? "destructive" : "secondary"}
                    onClick={handleMicClick}
                    className={`w-12 h-12 rounded-full ${isRecording ? "animate-pulse" : ""}`}
                  >
                    <Mic className={`h-5 w-5 ${isRecording ? "text-white" : ""}`} />
                    <span className="sr-only">{isRecording ? "Stop Recording" : "Start Recording"}</span>
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handleSaveSessionClick} disabled={savingSession}>
                    {savingSession ? <span className="animate-spin mr-2">⏳</span> : null}
                    Save Session
                  </Button>
                </div>
              </div>
            </>
          )}
          {playerMode === 'full' && (
            <button
              onClick={handleClose}
              className="absolute bottom-3 right-3 z-10 bg-black/70 hover:bg-black/90 rounded-full p-2 shadow-lg"
              aria-label="Close player"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          )}
        </CardContent>
        {currentBeat?.audioUrl ? (
          <audio
            ref={audioRef}
            src={currentBeat.audioUrl}
            onTimeUpdate={(e) => setProgress((e.currentTarget.currentTime / e.currentTarget.duration) * 100)}
            onEnded={() => {
              if (isRepeat) {
                audioRef.current?.play()
              } else if (isShuffle) {
                playNextBeat()
              }
            }}
          />
        ) : null}
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
      <PurchaseOptionsModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        beat={currentBeat ? {
          id: Number(currentBeat.id),
          title: currentBeat.title,
          price: (currentBeat as any).price || 0,
          price_lease: (currentBeat as any).price_lease || 0,
          price_premium_lease: (currentBeat as any).price_premium_lease || 0,
          price_exclusive: (currentBeat as any).price_exclusive || 0,
          price_buyout: (currentBeat as any).price_buyout || 0,
        } : null}
      />
      {showFeatureAuthDialog && (
        <Dialog open={showFeatureAuthDialog} onOpenChange={setShowFeatureAuthDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sign Up or Log In</DialogTitle>
            </DialogHeader>
            <p className="mb-4">You need to be signed in to use this feature.</p>
            <div className="flex gap-4 justify-end">
              <Button onClick={() => router.push('/signup')} className="bg-primary text-black">Sign Up</Button>
              <Button variant="outline" onClick={() => router.push('/login')}>Log In</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

