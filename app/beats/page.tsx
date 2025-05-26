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
import { Play, ShoppingCart, Search, Shuffle, Plus, Pause, ExternalLink } from "lucide-react"
import { ViewSelector } from "@/components/beats/ViewSelector"
import { SaveToPlaylistModal } from "@/components/SaveToPlaylistModal"
import { PurchaseOptionsModal } from "@/components/PurchaseOptionsModal"
import { VerticalSlideView } from "@/components/beats/VerticalSlideView"
import { usePlayer } from "@/contexts/PlayerContext"
import { Rating } from "@/components/ui/rating"
import { supabase } from '@/lib/supabaseClient'
import React from "react"

const BeatCard = React.memo(function BeatCard({ beat, isPlaying, onPlayPause, onPurchase }: { beat: any, isPlaying: boolean, onPlayPause: (beat: any) => void, onPurchase: (beat: any) => void }) {
  return (
    <Card key={beat.id} className="bg-black border-primary flex flex-col">
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
        <div className="absolute top-2 right-2">
        <Button
          size="icon"
            className="rounded-full gradient-button"
          onClick={() => onPlayPause(beat)}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4 text-black" />
          ) : (
            <Play className="h-4 w-4 text-black" />
          )}
        </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4 flex-grow flex flex-col justify-between">
        <div>
          <CardTitle className="text-sm mb-1">{beat.title}</CardTitle>
          <p className="text-xs text-gray-400 mb-1">by {beat.producer_names && beat.producer_names.length > 0 ? beat.producer_names.join(', ') : beat.producer}</p>
          <div className="flex items-center mb-2">
            <Rating value={beat.rating || 0} onChange={(newRating) => {}} />
          </div>
          <div className="flex justify-between items-center mb-2">
            <Badge
              variant="secondary"
              className="text-[10px] px-2 py-0.5 w-auto flex items-center justify-center text-center"
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
            onClick={() => onPurchase(beat)}
          >
            BUY
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

export default function BeatsPage() {
  const [currentView, setCurrentView] = useState<"grid" | "list" | "compact" | "vertical">(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      return "compact";
    }
    return "grid";
  });
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
    async function fetchBeats() {
      try {
      setLoading(true)
        setError(null)
        
      const { data: beatsData, error: beatsError } = await supabase
        .from('beats')
        .select('id, slug, title, play_count, cover_art_url, producer_id, producer_ids, mp3_url, genre, bpm, mood, price, rating, created_at, description, key, tags, licensing, is_draft, updated_at, mp3_path, wav_path, stems_path, cover_art_path, wav_url, stems_url, price_lease, price_premium_lease, price_exclusive, price_buyout')
        .eq('is_draft', false)
        .order('created_at', { ascending: false })
        .limit(100)

        if (beatsError) throw beatsError

      if (!beatsData || beatsData.length === 0) {
        setDisplayedBeats([])
        return
      }

      // Collect all unique producer_ids (from both producer_id and producer_ids)
      const allProducerIds = Array.from(new Set([
        ...beatsData.map((b: any) => b.producer_id),
        ...beatsData.flatMap((b: any) => b.producer_ids || [])
      ].filter(Boolean)))

      const { data: producersData, error: producersError } = await supabase
        .from('producers')
        .select('user_id, display_name, image, slug')
        .in('user_id', allProducerIds)

      if (producersError) throw producersError

      // Map user_id to display_name and slug
      const producerMap = Object.fromEntries((producersData || []).map((p: any) => [
        p.user_id,
        { display_name: p.display_name, slug: p.slug }
      ]))

      const beats = beatsData.map((b: any) => {
        // Get all producer ids, names, and slugs for this beat
        const ids = [b.producer_id, ...(b.producer_ids || []).filter((id: string) => id !== b.producer_id)]
        const producerNames = ids.map((id: string) => producerMap[id]?.display_name || 'Unknown').filter(Boolean)
        const producerSlugs = ids.map((id: string) => producerMap[id]?.slug || '').filter(Boolean)
        return {
          id: b.id,
          slug: b.slug,
          title: b.title || '',
          producer: producerNames.join(', '),
          producer_ids: ids,
          producer_names: producerNames,
          producer_slugs: producerSlugs,
          image: b.cover_art_url || '/placeholder.svg',
          plays: b.play_count || 0,
          bpm: b.bpm || '',
          genre: b.genre || '',
          mood: b.mood || '',
          audioUrl: b.mp3_url || '',
          price: b.price || 0,
          rating: b.rating ?? 0,
          producer_image: producersData?.find((p: any) => p.user_id === b.producer_id)?.image || '/placeholder.svg',
          price_lease: b.price_lease,
          price_premium_lease: b.price_premium_lease,
          price_exclusive: b.price_exclusive,
          price_buyout: b.price_buyout,
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

  useEffect(() => {
    // On mount, if mobile, set to compact view
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      setCurrentView('compact');
    }
  }, []);

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
      artist: beat.producer_names.join(', '),
      audioUrl: beat.audioUrl,
      producerSlug: beat.producer_slugs[0] || '',
      producers: beat.producers || [],
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
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {filteredBeats.map((beat) => (
        <div
          key={beat.id}
          className={`flex flex-col bg-secondary rounded-lg overflow-hidden transition-all duration-200 ${playingBeatId === beat.id && isPlaying ? 'border-2 border-primary bg-primary/10 shadow-lg' : ''}`}
        >
          <a
            href={`/beat/${beat.slug}`}
            onClick={e => e.stopPropagation()}
            tabIndex={0}
            aria-label={`View details for ${beat.title}`}
          >
            <Image
              src={beat.image || "/placeholder.svg"}
              alt={beat.title}
              width={300}
              height={300}
              className="w-full aspect-square object-cover border border-primary shadow cursor-pointer hover:opacity-80 transition"
            />
          </a>
          <div className="p-4">
            <h3 className="font-semibold flex items-center gap-2">
              {beat.title}
            </h3>
            <p className="text-xs text-gray-400 mb-1">
              by {beat.producer_ids && beat.producer_names && beat.producer_names.length > 0
                ? beat.producer_names.map((name: string, idx: number) => (
                    <span key={beat.producer_ids[idx]}>
                      <Link href={`/producers/${beat.producer_slugs[idx]}`} className="text-gray-400 hover:text-yellow-400">
                        {name}
                      </Link>{idx < beat.producer_names.length - 1 ? ', ' : ''}
                    </span>
                  ))
                : beat.producer}
            </p>
            <p className="text-sm text-gray-500">{beat.plays.toLocaleString()} plays</p>
            <div className="flex items-center justify-between mt-4">
              <Button variant="outline" size="icon" onClick={() => handlePlayPause(beat)}>
                {playingBeatId === beat.id && isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              <Button
                className="gradient-button text-black font-medium hover:text-white"
                onClick={() => handlePurchase(beat)}
              >
                BUY
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  const ListView = () => (
    <div className="space-y-4">
      {filteredBeats.map((beat) => (
        <div
          key={beat.id}
          className={`flex items-center justify-between p-4 bg-secondary rounded-lg transition-all duration-200 ${playingBeatId === beat.id && isPlaying ? 'border-2 border-primary bg-primary/10 shadow-lg' : ''}`}
        >
          <div className="flex items-center space-x-4">
            <a
              href={`/beat/${beat.slug}`}
              onClick={e => e.stopPropagation()}
              tabIndex={0}
              aria-label={`View details for ${beat.title}`}
            >
              <Image
                src={beat.image || "/placeholder.svg"}
                alt={beat.title}
                width={64}
                height={64}
                className="w-16 h-16 aspect-square rounded object-cover border border-primary shadow cursor-pointer hover:opacity-80 transition"
              />
            </a>
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                {beat.title}
              </h3>
              <p className="text-xs text-gray-400 mb-1">
                by {beat.producer_ids && beat.producer_names && beat.producer_names.length > 0
                  ? beat.producer_names.map((name: string, idx: number) => (
                      <span key={beat.producer_ids[idx]}>
                        <Link href={`/producers/${beat.producer_slugs[idx]}`} className="text-gray-400 hover:text-yellow-400">
                          {name}
                        </Link>{idx < beat.producer_names.length - 1 ? ', ' : ''}
                      </span>
                    ))
                  : beat.producer}
              </p>
              <p className="text-sm text-gray-500">{beat.plays.toLocaleString()} plays</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" onClick={() => handlePlayPause(beat)}>
              {playingBeatId === beat.id && isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <Button
              className="gradient-button text-black font-medium hover:text-white"
              onClick={() => handlePurchase(beat)}
            >
              BUY
            </Button>
          </div>
        </div>
      ))}
    </div>
  )

  const CompactView = () => (
    <div className="space-y-4">
      {filteredBeats.map((beat) => (
        <div
          key={beat.id}
          className={`flex items-center justify-between p-4 bg-secondary rounded-lg transition-all duration-200 ${playingBeatId === beat.id && isPlaying ? 'border-2 border-primary bg-primary/10 shadow-lg' : ''}`}
          onClick={() => handlePlayPause(beat)}
        >
          <div className="flex items-center space-x-4">
            <a
              href={`/beat/${beat.slug}`}
              onClick={e => e.stopPropagation()}
              tabIndex={0}
              aria-label={`View details for ${beat.title}`}
            >
              <Image
                src={beat.image || "/placeholder.svg"}
                alt={beat.title}
                width={64}
                height={64}
                className="w-16 h-16 aspect-square rounded object-cover border border-primary shadow cursor-pointer hover:opacity-80 transition"
              />
            </a>
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                {beat.title}
              </h3>
              <p className="text-xs text-gray-400 mb-1">
                by {beat.producer_ids && beat.producer_names && beat.producer_names.length > 0
                  ? beat.producer_names.map((name: string, idx: number) => (
                      <span key={beat.producer_ids[idx]}>
                        <Link href={`/producers/${beat.producer_slugs[idx]}`} className="text-gray-400 hover:text-yellow-400">
                          {name}
                        </Link>{idx < beat.producer_names.length - 1 ? ', ' : ''}
                      </span>
                    ))
                  : beat.producer}
              </p>
              <p className="text-sm text-gray-500">{beat.plays.toLocaleString()} plays</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" onClick={e => { e.stopPropagation(); handlePlayPause(beat); }}>
              {playingBeatId === beat.id && isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <Button
              className="gradient-button text-black font-medium hover:text-white"
              onClick={e => { e.stopPropagation(); handlePurchase(beat); }}
            >
              BUY
            </Button>
          </div>
        </div>
      ))}
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
    <div style={{ background: '#141414', minHeight: '100vh' }} className="w-full">
    <div className="container mx-auto px-2 sm:px-4 py-8">
      <div className="flex flex-col items-center gap-4 mb-8 sm:flex-row sm:items-center sm:gap-8 beats-header-row mt-12 sm:mt-16">
        <h1 className="text-5xl sm:text-6xl font-bold font-display tracking-wider text-primary m-0 text-center sm:text-left mb-4">Beats</h1>
        <div className="w-full flex flex-col sm:flex-row justify-center sm:w-auto sm:justify-end gap-2">
          <ViewSelector currentView={currentView} onViewChange={setCurrentView} />
        </div>
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
    </div>
  )
}

