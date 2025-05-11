"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Image from "next/image"
import Link from "next/link"
import { Play, ShoppingCart, Search, Shuffle, Plus, Pause } from "lucide-react"
import { ViewSelector } from "@/components/beats/ViewSelector"
import { SaveToPlaylistModal } from "@/components/SaveToPlaylistModal"
import { PurchaseOptionsModal } from "@/components/PurchaseOptionsModal"
import { VerticalSlideView } from "@/components/beats/VerticalSlideView"
import { usePlayer } from "@/contexts/PlayerContext"
import { Rating } from "@/components/ui/rating"
import { createClient } from '@supabase/supabase-js'
import React from "react"

const BeatCard = React.memo(function BeatCard({ beat, isPlaying, onPlayPause }: { beat: any, isPlaying: boolean, onPlayPause: (beat: any) => void }) {
  return (
    <Card key={beat.id} className="bg-card border-primary flex flex-col">
      <CardHeader className="relative pb-0 pt-0 px-0">
        <div className="relative w-full aspect-square">
          <Image
            src={beat.image || "/placeholder.svg"}
            alt={beat.title}
            fill
            className="rounded-t-lg object-cover cursor-pointer"
            onClick={() => onPlayPause(beat)}
          />
        </div>
        <Button
          size="icon"
          className="absolute top-2 right-2 rounded-full gradient-button"
          onClick={() => onPlayPause(beat)}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4 text-black" />
          ) : (
            <Play className="h-4 w-4 text-black" />
          )}
        </Button>
      </CardHeader>
      <CardContent className="pt-4 flex-grow flex flex-col justify-between">
        <div>
          <CardTitle className="text-sm mb-1">{beat.title}</CardTitle>
          <p className="text-xs text-gray-400 mb-1">by {beat.producer}</p>
          <div className="flex items-center mb-2">
            <Rating value={beat.rating || 0} onChange={(newRating) => {}} />
          </div>
          <div className="flex justify-between items-center mb-2">
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0.5 w-full flex items-center justify-center text-center"
            >
              <span className="inline-block">{beat.bpm} BPM</span>
            </Badge>
            <span className="text-xs text-gray-400">{beat.plays} plays</span>
          </div>
        </div>
        <div className="flex justify-between items-center mt-2">
          <Button variant="outline" size="icon" onClick={() => {}}>
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            className="gradient-button text-black font-medium hover:text-white"
            onClick={() => {}}
          >
            BUY
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

export default function BeatsPage() {
  const [currentView, setCurrentView] = useState<"grid" | "list" | "compact" | "vertical">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [advancedFilters, setAdvancedFilters] = useState({
    genre: "",
    producer: "",
    mood: "",
    bpm: "",
  })
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)
  const [selectedBeat, setSelectedBeat] = useState<any | null>(null)
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false)
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false)
  const [displayedBeats, setDisplayedBeats] = useState<any[]>([])
  const [playingBeatId, setPlayingBeatId] = useState<string | null>(null)
  const { setCurrentBeat, setIsPlaying, isPlaying } = usePlayer()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    async function fetchBeats() {
      try {
      setLoading(true)
        setError(null)
        
      const { data: beatsData, error: beatsError } = await supabase
        .from('beats')
        .select('id, title, play_count, cover_art_url, producer_id, mp3_url, genre, bpm, mood, price, rating, created_at, description, key, tags, licensing, is_draft, updated_at, mp3_path, wav_path, stems_path, cover_art_path, wav_url, stems_url')
        .eq('is_draft', false)
        .order('created_at', { ascending: false })
        .limit(100)

        if (beatsError) throw beatsError

      if (!beatsData || beatsData.length === 0) {
        setDisplayedBeats([])
        return
      }

      const producerIds = [...new Set(beatsData.map((b: any) => b.producer_id))]
      const { data: producersData, error: producersError } = await supabase
        .from('producers')
        .select('user_id, display_name, image')
        .in('user_id', producerIds)

        if (producersError) throw producersError

      const beats = beatsData.map((b: any) => {
        const producer = producersData?.find((p: any) => p.user_id === b.producer_id)
        return {
          id: b.id,
          title: b.title || '',
          producer: producer?.display_name || 'Unknown',
          image: b.cover_art_url || '/placeholder.svg',
          plays: b.play_count || 0,
          bpm: b.bpm || '',
          genre: b.genre || '',
          mood: b.mood || '',
          audioUrl: b.mp3_url || '',
          price: b.price || 0,
          rating: b.rating ?? 0,
          producer_image: producer?.image || '/placeholder.svg',
        }
      })

      setDisplayedBeats(beats)
      } catch (err) {
        console.error('Error fetching beats:', err)
        setError('Failed to load beats. Please try again.')
        setDisplayedBeats([])
      } finally {
      setLoading(false)
      }
    }

    fetchBeats()
  }, [])

  const filteredBeats = useMemo(() => {
    return displayedBeats.filter(
      (beat) =>
        (beat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          beat.producer.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (beat.genre || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (beat.mood || '').toLowerCase().includes(searchQuery.toLowerCase())) &&
        (advancedFilters.genre ? beat.genre === advancedFilters.genre : true) &&
        (advancedFilters.producer ? beat.producer === advancedFilters.producer : true) &&
        (advancedFilters.mood ? beat.mood === advancedFilters.mood : true) &&
        (advancedFilters.bpm ? String(beat.bpm) === advancedFilters.bpm : true),
    )
  }, [displayedBeats, searchQuery, advancedFilters])

  const shuffleBeats = () => {
    const shuffled = [...displayedBeats].sort(() => Math.random() - 0.5)
    setDisplayedBeats(shuffled)
  }

  const handleSaveToPlaylist = (beat: any) => {
    setSelectedBeat(beat)
    setIsPlaylistModalOpen(true)
  }

  const handlePurchase = (beat: any) => {
    setSelectedBeat(beat)
    setIsPurchaseModalOpen(true)
  }

  const handlePlayPause = (beat: any) => {
    if (currentView === "vertical") return;
    if (playingBeatId === beat.id && isPlaying) {
      setIsPlaying(false); // Pause
    } else if (playingBeatId === beat.id && !isPlaying) {
      setIsPlaying(true); // Resume
    } else {
    setCurrentBeat({
      id: beat.id.toString(),
      title: beat.title,
      artist: beat.producer,
        audioUrl: beat.audioUrl || '/placeholder-audio.mp3',
        image: beat.image || '/placeholder.svg',
      });
      setIsPlaying(true); // Play
      setPlayingBeatId(beat.id);
    }
  }

  const handleRatingChange = (beatId: number, newRating: number) => {
    // Implement your rating update logic here
    console.log(`Rating for beat ${beatId} changed to ${newRating}`)
  }

  const GridView = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {filteredBeats.map((beat) => (
        <BeatCard
          key={beat.id}
          beat={beat}
          isPlaying={playingBeatId === beat.id && isPlaying}
          onPlayPause={handlePlayPause}
        />
      ))}
    </div>
  )

  const ListView = () => (
    <div className="space-y-4">
      {filteredBeats.map((beat) => (
        <Card key={beat.id} className="bg-card border-primary">
          <CardContent className="flex flex-col sm:flex-row items-center p-4 space-y-4 sm:space-y-0">
            <Image
              src={beat.image || "/placeholder.svg"}
              alt={beat.title}
              width={100}
              height={100}
              className="rounded-lg sm:mr-4 w-full sm:w-auto h-32 sm:h-24 object-cover cursor-pointer"
              onClick={() => handlePlayPause(beat)}
            />
            <div className="flex-grow text-center sm:text-left">
              <h3 className="text-lg font-semibold text-white">{beat.title}</h3>
              <p className="text-sm text-gray-400">by {beat.producer}</p>
              <div className="flex items-center justify-center sm:justify-start mt-2">
                <Rating value={beat.rating || 0} readOnly onChange={() => {}} />
                <span className="text-xs text-gray-400 ml-2">({beat.rating || 0})</span>
              </div>
              <div className="flex items-center justify-center sm:justify-start mt-2">
                <Badge variant="secondary" className="mr-2">
                  {beat.bpm} BPM
                </Badge>
                <span className="text-sm text-gray-400">{beat.plays} plays</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  className="gradient-button text-black font-medium rounded-full shadow-lg hover:text-black"
                  onClick={() => handlePlayPause(beat)}
                >
                  {playingBeatId === beat.id && isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                  {playingBeatId === beat.id && isPlaying ? "Pause" : "Play"}
                </Button>
                <Button variant="outline" size="icon" onClick={() => handleSaveToPlaylist(beat)}>
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  className="gradient-button text-black font-medium hover:text-white"
                  onClick={() => handlePurchase(beat)}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  BUY
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  const CompactView = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="py-2 px-4 text-primary">Cover</th>
            <th className="py-2 px-4 text-primary">Title</th>
            <th className="py-2 px-4 text-primary">Producer</th>
            <th className="py-2 px-4 text-primary">BPM</th>
            <th className="py-2 px-4 text-primary">Plays</th>
            <th className="py-2 px-4 text-primary">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredBeats.map((beat) => (
            <tr key={beat.id} className="border-b border-gray-700 hover:bg-gray-800">
              <td className="py-3 px-4">
                <div className="w-10 h-10 relative">
                  <Image
                    src={beat.image || "/placeholder.svg"}
                    alt={beat.title}
                    width={40}
                    height={40}
                    className="rounded object-cover w-10 h-10"
                  />
                </div>
              </td>
              <td className="py-3 px-4 text-white">{beat.title}</td>
              <td className="py-3 px-4 text-gray-400">{beat.producer}</td>
              <td className="py-3 px-4 text-gray-400">{beat.bpm}</td>
              <td className="py-3 px-4 text-gray-400">{beat.plays}</td>
              <td className="py-3 px-4">
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-gray-400 hover:text-white"
                    onClick={() => handlePlayPause(beat)}
                  >
                    {playingBeatId === beat.id && isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-gray-400 hover:text-white"
                    onClick={() => handleSaveToPlaylist(beat)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    className="gradient-button text-black font-medium hover:text-white"
                    onClick={() => handlePurchase(beat)}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    BUY
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold font-display tracking-wider text-primary">Beats</h1>
        <ViewSelector currentView={currentView} onViewChange={setCurrentView} />
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder="Search beats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-secondary text-white focus:bg-accent w-full"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        </div>
        <Button onClick={shuffleBeats}>
          <Shuffle className="h-4 w-4 mr-2" />
          Shuffle
        </Button>
      </div>

      {/* Advanced filters */}
      {showAdvancedSearch && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Select value={advancedFilters.genre} onValueChange={(value) => setAdvancedFilters({ ...advancedFilters, genre: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Genre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Genres</SelectItem>
              <SelectItem value="Epic">Epic</SelectItem>
              <SelectItem value="Ambient">Ambient</SelectItem>
              <SelectItem value="Trap">Trap</SelectItem>
              <SelectItem value="Classical">Classical</SelectItem>
              <SelectItem value="EDM">EDM</SelectItem>
              <SelectItem value="Lo-Fi">Lo-Fi</SelectItem>
              <SelectItem value="Hip-Hop">Hip-Hop</SelectItem>
            </SelectContent>
          </Select>
          {/* Add other filters similarly */}
        </div>
      )}

      {/* View content */}
      {currentView === "grid" && <GridView />}
      {currentView === "list" && <ListView />}
      {currentView === "compact" && <CompactView />}
      {currentView === "vertical" && <VerticalSlideView beats={filteredBeats} onClose={() => setCurrentView("grid")} disableGlobalPlayer />}

      {/* Modals */}
      <SaveToPlaylistModal
        isOpen={isPlaylistModalOpen}
        onClose={() => setIsPlaylistModalOpen(false)}
        beat={selectedBeat}
      />
      <PurchaseOptionsModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        beat={selectedBeat}
      />
    </div>
  )
}

