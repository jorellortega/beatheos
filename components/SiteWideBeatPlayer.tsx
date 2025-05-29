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
import WavesurferPlayer from "@wavesurfer/react"

interface Beat {
  id: string
  title: string
  artist: string
  audioUrl: string
  image?: string
  lyrics?: string
  producerSlug?: string
  producers: { display_name: string; slug: string }[]
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
  const [lyrics, setLyrics] = useState("")
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [newPlaylistName, setNewPlaylistName] = useState("")
  const [isRepeat, setIsRepeat] = useState(false)
  const [isShuffle, setIsShuffle] = useState(false)
  const [shuffledBeats, setShuffledBeats] = useState<any[]>([])
  const [currentBeatIndex, setCurrentBeatIndex] = useState(0)
  const [playerMode, setPlayerMode] = useState<'default' | 'full'>('default')
  const audioRef = useRef<HTMLAudioElement>(null)
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
  const [fullCurrentBeat, setFullCurrentBeat] = useState<any>(null)
  const lyricsTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [showSessionNameDialog, setShowSessionNameDialog] = useState(false)
  const [sessionNameInput, setSessionNameInput] = useState("")
  const [openSessionId, setOpenSessionId] = useState<string | null>(null)
  const [editingSessionName, setEditingSessionName] = useState(false)
  const [editingSessionNameValue, setEditingSessionNameValue] = useState("")

  const pathname = usePathname()

  useEffect(() => {
    setIsExpandedViewVisible(false)
    setIsExpanded(false)
  }, [pathname])

  useEffect(() => {
    const audio = audioRef.current
    if (audio) {
      audio.volume = volume / 100
      try {
        if (isPlaying) {
          audio.play().catch((err) => {
            if (err.name !== 'AbortError') throw err;
          });
        } else {
          audio.pause(); // pause() does not throw, but wrap for safety
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') throw err;
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
      setLyrics("");
      setOpenSessionId(null);
      if (lyricsTextareaRef.current) {
        lyricsTextareaRef.current.style.height = 'auto';
      }
      return;
    }
    // Fetch user-specific lyrics from sessions table
    async function fetchUserLyrics() {
      if (!user || !currentBeat) return;
      const { data, error } = await supabase
        .from('sessions')
        .select('id, lyrics')
        .eq('user_id', user.id)
        .contains('beat_ids', [String(currentBeat.id)])
        .single();
      if (data && data.lyrics) {
        setLyrics(data.lyrics);
        setOpenSessionId(data.id || null);
        setTimeout(() => {
          if (lyricsTextareaRef.current) {
            lyricsTextareaRef.current.style.height = 'auto';
            lyricsTextareaRef.current.style.height = lyricsTextareaRef.current.scrollHeight + 'px';
          }
        }, 0);
      } else {
        setLyrics("");
        setOpenSessionId(null);
        if (lyricsTextareaRef.current) {
          lyricsTextareaRef.current.style.height = 'auto';
        }
      }
    }
    fetchUserLyrics();
  }, [currentBeat, user]);

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
                .select('display_name, slug')
                .eq('user_id', beat.producer_id)
                .single();
              return {
                id: beat.id,
                title: beat.title,
                artist: producer?.display_name || beat.producer_id,
                audioUrl: beat.mp3_url,
                image: beat.cover_art_url,
                producerSlug: producer?.slug || '',
                producers: producer && producer.slug ? [{ display_name: producer.display_name, slug: producer.slug }] : [],
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

  useEffect(() => {
    if (currentBeat) {
      // Fetch complete beat data from the database
      supabase
        .from('beats')
        .select('id, title, price, price_lease, price_premium_lease, price_exclusive, price_buyout')
        .eq('id', currentBeat.id)
        .single()
        .then(({ data, error }) => {
          if (data) {
            setFullCurrentBeat({
              id: data.id,
              title: data.title,
              price: data.price || 0,
              price_lease: data.price_lease || 0,
              price_premium_lease: data.price_premium_lease || 0,
              price_exclusive: data.price_exclusive || 0,
              price_buyout: data.price_buyout || 0,
            });
          }
        });
    }
  }, [currentBeat]);

  useEffect(() => {
    // Listen for the homepage logo shuffle trigger
    const handler = async () => {
      // Always re-shuffle and start playing, even if isShuffle is true or currentBeat is null
      await toggleShuffle();
      setPlayerMode('full');
      setIsPlaying(true);
    };
    window.addEventListener('trigger-shuffle-full-player', handler);
    return () => window.removeEventListener('trigger-shuffle-full-player', handler);
  }, []); // Remove isShuffle from deps so handler is always fresh

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

      // Get producer display names and slugs
      const beatsWithProducers = await Promise.all(
        beats.map(async (beat) => {
          const { data: producer } = await supabase
            .from('producers')
            .select('display_name, slug')
            .eq('user_id', beat.producer_id)
            .single();
          return {
            ...beat,
            artist: producer?.display_name || beat.producer_id,
            audioUrl: beat.mp3_url,
            coverImage: beat.cover_art_url,
            producerSlug: producer?.slug || '',
            producers: producer && producer.slug ? [{ display_name: producer.display_name, slug: producer.slug }] : [],
          };
        })
      );

      // Shuffle and pick 10 beats
      const shuffled = [...beatsWithProducers].sort(() => Math.random() - 0.5).slice(0, 10);
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

  const saveSession = async (sessionName?: string, sessionId?: string) => {
    if (!user || !currentBeat) {
      setShowFeatureAuthDialog(true);
      return;
    }
    setSavingSession(true);
    try {
      let error;
      if (sessionId) {
        // Update existing session
        const sessionData = {
          name: sessionName || `${currentBeat.title} Session`,
          beat_ids: [String(currentBeat.id)],
          lyrics,
          last_modified: new Date().toISOString(),
        };
        const { error: updateError } = await supabase
          .from('sessions')
          .update(sessionData)
          .eq('id', sessionId);
        error = updateError;
      } else {
        // First check if a session already exists for this user and beat
        const { data: existingSession } = await supabase
          .from('sessions')
          .select('id')
          .eq('user_id', user.id)
          .contains('beat_ids', [String(currentBeat.id)])
          .single();
        const sessionData = {
          user_id: user.id,
          name: sessionName || `${currentBeat.title} Session`,
          beat_ids: [String(currentBeat.id)],
          lyrics,
          last_modified: new Date().toISOString(),
        };
        if (existingSession) {
          const { error: updateError } = await supabase
            .from('sessions')
            .update(sessionData)
            .eq('id', existingSession.id);
          error = updateError;
        } else {
          const { error: insertError } = await supabase
            .from('sessions')
            .insert(sessionData);
          error = insertError;
        }
      }
      if (error) throw error;
      toast({
        title: sessionId ? "Session Updated" : "Session Saved",
        description: sessionId ? "Your session has been updated successfully." : "Your session has been saved successfully.",
      });
      // Refresh saved sessions list
      const { data: updatedSessions } = await supabase
        .from('sessions')
        .select('id, name, last_modified')
        .eq('user_id', user.id)
        .order('last_modified', { ascending: false });
      if (updatedSessions) {
        setSavedSessions(updatedSessions);
      }
      if (!sessionId) {
        // If this was a new session, set it as open
        const { data: newSession } = await supabase
          .from('sessions')
          .select('id')
          .eq('user_id', user.id)
          .contains('beat_ids', [String(currentBeat.id)])
          .order('last_modified', { ascending: false })
          .limit(1)
          .single();
        if (newSession?.id) setOpenSessionId(newSession.id);
      }
    } catch (error) {
      console.error('Error saving session:', error);
      toast({
        title: "Error",
        description: "Failed to save session. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingSession(false);
    }
  };

  const openSession = async (sessionId: string) => {
    if (!user) {
      setShowFeatureAuthDialog(true);
      return;
    }

    try {
    const { data, error } = await supabase
      .from('sessions')
      .select('beat_ids, lyrics')
      .eq('id', sessionId)
        .eq('user_id', user.id)
      .single();

      if (error) throw error;

      if (!data || !data.beat_ids) {
        toast({
          title: "Error",
          description: "No beats found in this session.",
          variant: "destructive",
        });
        return;
      }

      // Fetch the full beat details
      const { data: beat, error: beatError } = await supabase
        .from('beats')
        .select('id, title, producer_id, mp3_url, cover_art_url')
        .eq('id', data.beat_ids)
        .single();

      if (beatError || !beat) throw beatError || new Error('Beat not found');

        // Fetch the producer's display name
        const { data: producer } = await supabase
          .from('producers')
          .select('display_name, slug')
          .eq('user_id', beat.producer_id)
          .single();

        setLyricsFromSession(true);
        setCurrentBeat({
          id: beat.id,
          title: beat.title,
        artist: producer?.display_name || beat.producer_id,
          audioUrl: beat.mp3_url,
          image: beat.cover_art_url,
          producers: producer && producer.slug ? [{ display_name: producer.display_name, slug: producer.slug }] : [],
        });
        setLyrics(data.lyrics || "");
      setOpenSessionId(sessionId);
        toast({
        title: "Session Loaded",
        description: "Your session has been loaded successfully.",
        });
    } catch (error) {
        toast({
          title: "Error",
        description: "Failed to load session. Please try again.",
          variant: "destructive",
        });
      }
  };

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
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch (err: any) {
        if (err.name !== 'AbortError') throw err;
      }
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
    if (openSessionId) {
      // If a session is open, update it directly
      await saveSession(undefined, openSessionId);
    setSavingSession(false);
    } else {
      setSessionNameInput(currentBeat ? `${currentBeat.title} Session` : "My Session");
      setShowSessionNameDialog(true);
    }
  }

  const handleConfirmSaveSession = async () => {
    setShowSessionNameDialog(false);
    await saveSession(sessionNameInput);
    setSavingSession(false);
  }

  const setBeatForPlayer = (beat: any) => {
    setCurrentBeat({
      id: beat.id.toString(),
      title: beat.title,
      artist: beat.producer || beat.artist,
      audioUrl: beat.audioUrl || beat.mp3_url,
      image: beat.image || beat.cover_art_url,
      producerSlug: beat.producerSlug || beat.slug || '',
      producers: beat.producers || [],
    })
    setFullCurrentBeat(beat)
  }

  // Update session name in DB and UI
  const handleSessionNameEdit = async () => {
    if (!openSessionId) return;
    const trimmed = editingSessionNameValue.trim();
    if (!trimmed) return;
    const { error } = await supabase
      .from('sessions')
      .update({ name: trimmed })
      .eq('id', openSessionId);
    if (!error) {
      setSavedSessions(sessions => sessions.map(s => s.id === openSessionId ? { ...s, name: trimmed } : s));
    }
    setEditingSessionName(false);
  };

  return (
    <div className={`fixed bottom-0 left-0 w-full z-50 transition-all duration-300 ${currentBeat ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full pointer-events-none'}`} style={{willChange: 'opacity, transform'}}>
      <Card
        className={`transition-all duration-300 ${
          playerMode === 'full'
            ? 'max-w-[680px] w-full mx-auto left-1/2 -translate-x-1/2 fixed bottom-4 max-h-[90vh] overflow-y-auto'
            : 'w-auto h-16 fixed bottom-4 right-4'
        }`}
        style={{ marginTop: playerMode === 'full' ? undefined : '0' }}
      >
        <CardContent className={`p-2 pt-0 flex flex-col ${playerMode === 'full' ? "pb-16" : ""}`} style={playerMode === 'full' ? { maxHeight: '80vh', overflowY: 'auto' } : {}}>
          {playerMode === 'full' && (
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <Button
              variant="ghost"
              size="icon"
                onClick={() => {
                  setIsExpanded(false);
                  setPlayerMode(playerMode === 'full' ? 'default' : 'full');
                }}
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
            <Link href={currentBeat ? `/beat/${currentBeat.id}` : '#'}>
            <Image
              src={currentBeat?.image || "/placeholder.svg"}
              alt={currentBeat?.title || "cover"}
              width={100}
              height={100}
                className="rounded-md mb-2 sm:mb-0 sm:mr-4 mt-12 sm:mt-0 cursor-pointer hover:opacity-80 transition"
            />
            </Link>
            <div className="flex-grow flex flex-col items-center sm:items-start w-full">
              <div className="flex flex-row items-center w-full">
              <h3 className="font-semibold text-center sm:text-left w-full">{currentBeat?.title || ""}</h3>
                {/* Modern waveform visualizer only on desktop */}
                <div className="hidden md:block ml-4 flex-shrink-0" style={{ minWidth: 180, maxWidth: 300 }}>
                  <div style={{ width: '100%', minWidth: 180, maxWidth: 300 }}>
                    {currentBeat?.audioUrl && (
                      <WavesurferPlayer
                        height={48}
                        waveColor="#888"
                        progressColor="#FFD700"
                        url={currentBeat.audioUrl}
                        barWidth={2}
                        barRadius={2}
                        cursorColor="#FFD700"
                        interact={false}
                        onAudioprocess={(ws: any) => {
                          if (audioRef.current && audioRef.current.duration) {
                            setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
                          }
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
              {currentBeat?.producers && (currentBeat?.producers ?? []).length > 0 ? (
                <div className="text-sm text-gray-400 text-center sm:text-left w-full">
                  by {(currentBeat.producers ?? []).map((producer, idx, arr) => (
                    <span key={producer.slug}>
                      <Link href={`/producers/${producer.slug}`} className="hover:text-primary transition-colors">
                        {producer.display_name}
                      </Link>
                      {idx < (arr.length - 1) ? ', ' : ''}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-400 text-center sm:text-left w-full">
                  {currentBeat?.artist || ''}
                </div>
              )}
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
                onClick={togglePlay}
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
                <Button
                  size="lg"
                  className="bg-[#FFD700] hover:bg-[#FFE55C] text-black font-semibold flex items-center justify-center"
                  onClick={() => setIsPurchaseModalOpen(true)}
                >
                  {user ? 'BUY' : 'BUY INSTANTLY'}
              </Button>
            </div>
          </div>
          <Slider className="mb-4" value={[progress]} max={100} step={0.1} onValueChange={handleSeek} />
            <div className="flex-grow overflow-hidden">
              <div className="flex flex-col h-full">
                <div className="mb-4"></div>
                <div className="flex-grow mb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">Lyrics</h4>
                    {openSessionId && (() => {
                      const session = savedSessions.find(s => s.id === openSessionId);
                      if (!editingSessionName) {
                        return (
                          <span
                            className="text-xs text-gray-400 font-normal truncate max-w-[200px] cursor-pointer hover:underline flex items-center gap-1"
                            title={session ? session.name : ''}
                            onClick={() => {
                              setEditingSessionNameValue(session ? session.name : "");
                              setEditingSessionName(true);
                            }}
                          >
                            {session ? session.name : ''}
                            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" className="inline ml-1 text-gray-400" xmlns="http://www.w3.org/2000/svg"><path d="M14.7 2.29a1 1 0 0 1 1.42 0l1.59 1.59a1 1 0 0 1 0 1.42l-9.3 9.3a1 1 0 0 1-.45.26l-3.59 1a1 1 0 0 1-1.23-1.23l1-3.59a1 1 0 0 1 .26-.45l9.3-9.3ZM15.41 4 14 2.59 4.29 12.3l-.7 2.52 2.52-.7L15.41 4Z" fill="currentColor"/></svg>
                          </span>
                        );
                      } else {
                        return (
                          <input
                            className="text-xs text-white bg-secondary border border-gray-500 rounded px-1 max-w-[200px] outline-none"
                            value={editingSessionNameValue}
                            autoFocus
                            onChange={e => setEditingSessionNameValue(e.target.value)}
                            onBlur={handleSessionNameEdit}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                handleSessionNameEdit();
                              } else if (e.key === 'Escape') {
                                setEditingSessionName(false);
                              }
                            }}
                          />
                        );
                      }
                    })()}
                  </div>
                  <Textarea
                    ref={lyricsTextareaRef}
                    value={lyrics}
                    onChange={e => {
                      setLyrics(e.target.value);
                      // Auto-resize logic
                      if (lyricsTextareaRef.current) {
                        lyricsTextareaRef.current.style.height = 'auto';
                        lyricsTextareaRef.current.style.height = lyricsTextareaRef.current.scrollHeight + 'px';
                      }
                    }}
                    placeholder="Type or paste lyrics here..."
                    className="mb-2 resize-none bg-secondary text-white overflow-hidden min-h-[80px] max-h-[400px]"
                  />
                </div>
              </div>
              {/* Center session buttons, keep round buttons at bottom right */}
              {playerMode === 'full' && (
                <>
                  <div className="absolute bottom-3 left-4 right-4 sm:left-0 sm:right-0 z-10 flex justify-start sm:justify-center items-center gap-2 w-full">
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
                    <Button variant="secondary" size="sm" onClick={handleSaveSessionClick} disabled={savingSession}>
                      {savingSession ? <span className="animate-spin mr-2">⏳</span> : null}
                      {openSessionId ? 'Update' : 'Save Session'}
                    </Button>
                  </div>
                  <div className="absolute bottom-3 right-4 z-20 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setIsExpanded(false);
                        setPlayerMode(playerMode === 'full' ? 'default' : 'full');
                      }}
                      className="bg-black/70 hover:bg-black/90 rounded-full p-2 shadow-lg"
                      aria-label={playerMode === 'full' ? 'Minimize player' : 'Expand player'}
                    >
                      {playerMode === 'full' ? <Minimize className="h-5 w-5 text-white" /> : <Expand className="h-5 w-5 text-white" />}
                    </button>
                    <button
                      onClick={handleClose}
                      className="bg-black/70 hover:bg-black/90 rounded-full p-2 shadow-lg"
                      aria-label="Close player"
                    >
                      <X className="h-5 w-5 text-white" />
                    </button>
                  </div>
                </>
              )}
            </div>
            </>
          )}
        </CardContent>
        {currentBeat?.audioUrl ? (
        <audio
          ref={audioRef}
          src={currentBeat.audioUrl}
          onTimeUpdate={(e) => setProgress((e.currentTarget.currentTime / e.currentTarget.duration) * 100)}
          onEnded={() => {
            if (isRepeat) {
              try {
                audioRef.current?.play();
              } catch (err: any) {
                if (err.name !== 'AbortError') throw err;
              }
            } else if (isShuffle) {
              playNextBeat();
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
        beat={fullCurrentBeat ? {
          id: String(fullCurrentBeat.id),
          title: fullCurrentBeat.title,
          price: fullCurrentBeat.price || 0,
          price_lease: fullCurrentBeat.price_lease || 0,
          price_premium_lease: fullCurrentBeat.price_premium_lease || 0,
          price_exclusive: fullCurrentBeat.price_exclusive || 0,
          price_buyout: fullCurrentBeat.price_buyout || 0,
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
      {/* Session Name Dialog */}
      <Dialog open={showSessionNameDialog} onOpenChange={setShowSessionNameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Name Your Session</DialogTitle>
          </DialogHeader>
          <input
            type="text"
            className="w-full border rounded p-2 mb-4 text-white bg-secondary placeholder:text-gray-400"
            value={sessionNameInput}
            onChange={e => setSessionNameInput(e.target.value)}
            placeholder="Session Name"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowSessionNameDialog(false)}>Cancel</Button>
            <Button onClick={handleConfirmSaveSession} disabled={!sessionNameInput.trim() || savingSession}>
              {savingSession ? <span className="animate-spin mr-2">⏳</span> : null}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

