"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Image from "next/image"
import Link from "next/link"
import { Play, ShoppingCart, Search, Shuffle, Plus, Pause, ExternalLink, Edit } from "lucide-react"
import { ViewSelector } from "@/components/beats/ViewSelector"
import { SaveToPlaylistModal } from "@/components/SaveToPlaylistModal"
import { PurchaseOptionsModal } from "@/components/PurchaseOptionsModal"
import { VerticalSlideView } from "@/components/beats/VerticalSlideView"
import { usePlayer } from "@/contexts/PlayerContext"
import { BeatRating } from '@/components/beats/BeatRating'
import { supabase } from '@/lib/supabaseClient'
import React from "react"
import { useAuth } from "@/contexts/AuthContext"

// Helper function to get license price from columns or JSON
function getLicensePrice(beat: any, key: string, jsonKey: string) {
  // Prefer the column if it exists and is a number
  if (beat && beat[key] != null && !isNaN(Number(beat[key]))) return Number(beat[key]);
  // Fallback to JSON if present
  if (beat && beat.licensing && beat.licensing[jsonKey] != null && !isNaN(Number(beat.licensing[jsonKey]))) return Number(beat.licensing[jsonKey]);
  return null;
}

// Memoized BeatCard for performance
const BeatCard = React.memo(function BeatCard({ beat, isPlaying, onPlayPause, onPurchase }: { beat: any, isPlaying: boolean, onPlayPause: (beat: any) => void, onPurchase: (beat: any) => void }) {
  const leasePrice = getLicensePrice(beat, 'price_lease', 'template-lease');
  const premiumLeasePrice = getLicensePrice(beat, 'price_premium_lease', 'template-premium-lease');
  const exclusivePrice = getLicensePrice(beat, 'price_exclusive', 'template-exclusive');
  const buyoutPrice = getLicensePrice(beat, 'price_buyout', 'template-buy-out');
  const isThisPlaying = isPlaying;
  return (
    <div className={`flex flex-col bg-secondary rounded-lg overflow-hidden transition-all duration-200 ${isThisPlaying ? 'border-2 border-primary bg-primary/10 shadow-lg' : ''}`}> 
      <div className="relative w-full aspect-square">
        <Image
          src={beat.image || "/placeholder.svg"}
          alt={beat.title}
          width={300}
          height={300}
          className="w-full aspect-square object-cover border border-primary shadow"
          draggable={false}
        />
        <Link
          href={`/beat/${beat.slug}`}
          className="absolute inset-0 z-10"
          aria-label={`View details for ${beat.title}`}
          tabIndex={isThisPlaying ? 0 : -1}
          style={{
            opacity: isThisPlaying ? 1 : 0,
            pointerEvents: isThisPlaying ? 'auto' : 'none',
            transition: 'opacity 0.2s',
            background: 'transparent',
          }}
        />
        <button
          className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/60 transition focus:outline-none z-20"
          onClick={() => onPlayPause(beat)}
          aria-label="Play"
          type="button"
          style={{
            opacity: isThisPlaying ? 0 : 1,
            pointerEvents: isThisPlaying ? 'none' : 'auto',
            transition: 'opacity 0.2s',
          }}
        >
          <Play className="h-10 w-10 text-white" />
        </button>
      </div>
      <div className="p-4 relative">
        <h3 className="font-semibold w-full text-center whitespace-normal flex items-center justify-center gap-2">{beat.title}</h3>
        <p className="text-xs text-gray-400 mb-1 text-center w-full">by {beat.producer_names && beat.producer_names.length > 0 ? beat.producer_names.join(', ') : beat.producer}</p>
        <div className="mb-2">
          <BeatRating beatId={beat.id} initialAverageRating={beat.average_rating || 0} initialTotalRatings={beat.total_ratings || 0} />
        </div>
        <p className="text-sm text-gray-500 flex items-center justify-center gap-2">{beat.plays.toLocaleString()} plays</p>
        <div className="flex items-center justify-between mt-4">
          <Button variant="outline" size="icon" onClick={() => onPlayPause(beat)}>
            {isThisPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button className="gradient-button text-black font-medium hover:text-white" onClick={() => onPurchase({ ...beat, price: leasePrice ?? 0, price_lease: leasePrice ?? 0, price_premium_lease: premiumLeasePrice ?? 0, price_exclusive: exclusivePrice ?? 0, price_buyout: buyoutPrice ?? 0, licensing: beat.licensing })}>
            BUY
          </Button>
          <Link href={`/beat/${beat.slug}`} className="ml-2 inline-flex items-center justify-center text-primary hover:text-yellow-400" title="View beat details" aria-label="View beat details">
            <ExternalLink className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if beat or isPlaying changes
  return prevProps.beat === nextProps.beat && prevProps.isPlaying === nextProps.isPlaying;
});

export default function BeatsPage() {
  const { user } = useAuth();
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
  const { setCurrentBeat, setIsPlaying, isPlaying, currentBeat } = usePlayer()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1);
  const beatsPerPage = 30;
  const [totalBeats, setTotalBeats] = useState(0);
  const [ratingsMap, setRatingsMap] = useState<Record<string, { averageRating: number, totalRatings: number }>>({});
  const [sortOption, setSortOption] = useState<'recent' | 'rating' | 'plays' | 'playall'>('recent');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [editingBeatId, setEditingBeatId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'title' | 'play_count' | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  // Restore beats and scroll position from sessionStorage
  useEffect(() => {
    const storedBeats = sessionStorage.getItem('beatsList');
    const storedScroll = sessionStorage.getItem('beatsScroll');
    if (sortOption === 'recent' && currentPage === 1 && storedBeats) {
      setDisplayedBeats(JSON.parse(storedBeats));
      setLoading(false);
      setTimeout(() => {
        if (storedScroll) {
          window.scrollTo(0, parseInt(storedScroll, 10));
        }
      }, 0);
    } else {
      fetchBeats();
    }
  }, [sortOption, currentPage]);

  // Save beats and scroll position to sessionStorage on change/unload
  useEffect(() => {
    if (displayedBeats.length > 0) {
      sessionStorage.setItem('beatsList', JSON.stringify(displayedBeats));
    }
  }, [displayedBeats]);

  useEffect(() => {
    const saveScroll = () => {
      sessionStorage.setItem('beatsScroll', String(window.scrollY));
    };
    window.addEventListener('beforeunload', saveScroll);
    window.addEventListener('pagehide', saveScroll);
    return () => {
      window.removeEventListener('beforeunload', saveScroll);
      window.removeEventListener('pagehide', saveScroll);
    };
  }, []);

  // Only fetchBeats if not restoring from sessionStorage
    async function fetchBeats() {
      try {
      setLoading(true)
        setError(null)
        // Get total count for pagination
        const { count } = await supabase
          .from('beats')
          .select('*', { count: 'exact', head: true })
          .eq('is_draft', false)
        setTotalBeats(count || 0)
        // Fetch only the beats for the current page
        const from = (currentPage - 1) * beatsPerPage;
        const to = from + beatsPerPage - 1;
        let query = supabase
        .from('beats')
        .select('id, slug, title, play_count, cover_art_url, producer_id, producer_ids, mp3_url, genre, bpm, mood, price, average_rating, total_ratings, rating, created_at, description, key, tags, licensing, is_draft, updated_at, mp3_path, wav_path, stems_path, cover_art_path, wav_url, stems_url, price_lease, price_premium_lease, price_exclusive, price_buyout')
        .eq('is_draft', false)
        // Apply sort
        if (sortOption === 'recent') {
          query = query.order('created_at', { ascending: false })
        } else if (sortOption === 'rating') {
          query = query.gte('average_rating', 3).gt('total_ratings', 0).order('average_rating', { ascending: false }).order('created_at', { ascending: false })
        } else if (sortOption === 'plays') {
          query = query.order('play_count', { ascending: false }).order('created_at', { ascending: false })
        }
        query = query.range(from, to)
        const { data: beatsData, error: beatsError } = await query
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
        // Always extract prices from both columns and licensing JSON
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
          price_lease: getLicensePrice(b, 'price_lease', 'template-lease'),
          price_premium_lease: getLicensePrice(b, 'price_premium_lease', 'template-premium-lease'),
          price_exclusive: getLicensePrice(b, 'price_exclusive', 'template-exclusive'),
          price_buyout: getLicensePrice(b, 'price_buyout', 'template-buy-out'),
          licensing: b.licensing,
          average_rating: b.average_rating || 0,
          total_ratings: b.total_ratings || 0,
        }
      })

      // Shuffle the beats array on first load (Fisher-Yates)
      for (let i = beats.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [beats[i], beats[j]] = [beats[j], beats[i]];
      }

      setDisplayedBeats(beats)
      sessionStorage.setItem('beatsList', JSON.stringify(beats));
      } catch (err) {
        console.error('Error fetching beats:', err)
        setError('Failed to load beats. Please try again.')
        setDisplayedBeats([])
      } finally {
      setLoading(false)
      }
    }

  // Fetch ratings for all beats after displayedBeats is set
  useEffect(() => {
    async function fetchAllRatings() {
      if (!displayedBeats.length) return;
      const ratings: Record<string, { averageRating: number, totalRatings: number }> = {};
      await Promise.all(
        displayedBeats.map(async (beat) => {
          try {
            const res = await fetch(`/api/beats/${beat.id}/rate`);
            if (res.ok) {
              const data = await res.json();
              ratings[beat.id] = {
                averageRating: data.averageRating || 0,
                totalRatings: data.totalRatings || 0
              };
            } else {
              ratings[beat.id] = { averageRating: 0, totalRatings: 0 };
            }
          } catch (e) {
            ratings[beat.id] = { averageRating: 0, totalRatings: 0 };
          }
        })
      );
      setRatingsMap(ratings);
    }
    fetchAllRatings();
  }, [displayedBeats]);

  useEffect(() => {
    // On mount, if mobile, set to compact view
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      setCurrentView('compact');
    }
  }, []);

  // Search the entire beats table when searchQuery is not empty
  useEffect(() => {
    async function searchBeats() {
      if (!searchQuery) {
        fetchBeats();
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // Search in title, genre, mood, and fetch producer_ids for later mapping
        const { data: beatsData, error: beatsError } = await supabase
          .from('beats')
          .select('id, slug, title, play_count, cover_art_url, producer_id, producer_ids, mp3_url, genre, bpm, mood, price, average_rating, total_ratings, rating, created_at, description, key, tags, licensing, is_draft, updated_at, mp3_path, wav_path, stems_path, cover_art_path, wav_url, stems_url, price_lease, price_premium_lease, price_exclusive, price_buyout')
          .eq('is_draft', false)
          .or(`title.ilike.%${searchQuery}%,genre.ilike.%${searchQuery}%,mood.ilike.%${searchQuery}%`);
        if (beatsError) throw beatsError;
        if (!beatsData || beatsData.length === 0) {
          setDisplayedBeats([]);
          setLoading(false);
          return;
        }
        // Collect all unique producer_ids
        const allProducerIds = Array.from(new Set([
          ...beatsData.map((b: any) => b.producer_id),
          ...beatsData.flatMap((b: any) => b.producer_ids || [])
        ].filter(Boolean)));
        const { data: producersData, error: producersError } = await supabase
          .from('producers')
          .select('user_id, display_name, image, slug')
          .in('user_id', allProducerIds);
        if (producersError) throw producersError;
        const producerMap = Object.fromEntries((producersData || []).map((p: any) => [
          p.user_id,
          { display_name: p.display_name, slug: p.slug }
        ]));
        const beats = beatsData.map((b: any) => {
          const ids = [b.producer_id, ...(b.producer_ids || []).filter((id: string) => id !== b.producer_id)];
          const producerNames = ids.map((id: string) => producerMap[id]?.display_name || 'Unknown').filter(Boolean);
          const producerSlugs = ids.map((id: string) => producerMap[id]?.slug || '').filter(Boolean);
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
            price_lease: getLicensePrice(b, 'price_lease', 'template-lease'),
            price_premium_lease: getLicensePrice(b, 'price_premium_lease', 'template-premium-lease'),
            price_exclusive: getLicensePrice(b, 'price_exclusive', 'template-exclusive'),
            price_buyout: getLicensePrice(b, 'price_buyout', 'template-buy-out'),
            licensing: b.licensing,
            average_rating: b.average_rating || 0,
            total_ratings: b.total_ratings || 0,
          };
        });
        setDisplayedBeats(beats);
      } catch (err) {
        setError('Failed to search beats. Please try again.');
        setDisplayedBeats([]);
      } finally {
        setLoading(false);
      }
    }
    searchBeats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

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
    const leasePrice = getLicensePrice(beat, 'price_lease', 'template-lease');
    const premiumLeasePrice = getLicensePrice(beat, 'price_premium_lease', 'template-premium-lease');
    const exclusivePrice = getLicensePrice(beat, 'price_exclusive', 'template-exclusive');
    const buyoutPrice = getLicensePrice(beat, 'price_buyout', 'template-buy-out');

    setSelectedBeat(beat ? {
      ...beat,
      id: String(beat.id),
      price: leasePrice ?? 0,
      price_lease: leasePrice ?? 0,
      price_premium_lease: premiumLeasePrice ?? 0,
      price_exclusive: exclusivePrice ?? 0,
      price_buyout: buyoutPrice ?? 0,
      licensing: beat.licensing
    } : null)
    setIsPurchaseModalOpen(true)
  }

  const handlePlayPause = (beat: any) => {
    if (currentView === "vertical") return;
    if (currentBeat?.id === beat.id && isPlaying) {
      setIsPlaying(false); // Pause
    } else if (currentBeat?.id === beat.id && !isPlaying) {
      setIsPlaying(true); // Resume
    } else {
    setCurrentBeat({
      id: beat.id.toString(),
      title: beat.title,
      artist: beat.producer_names.join(', '),
      audioUrl: beat.audioUrl,
      producerSlug: beat.producer_slugs[0] || '',
      producers: beat.producers || [],
      slug: beat.slug || beat.id.toString(),
    });
      setIsPlaying(true); // Play
    }
  }

  const handleRatingChange = (beatId: number, newRating: number) => {
    // Implement your rating update logic here
    console.log(`Rating for beat ${beatId} changed to ${newRating}`)
  }

  // Update totalPages calculation
  const totalPages = Math.ceil(totalBeats / beatsPerPage);

  // Play all beats in order
  const playAllBeats = () => {
    if (displayedBeats.length === 0) return;
    let idx = 0;
    const playNext = () => {
      const beat = displayedBeats[idx];
      setCurrentBeat({
        id: beat.id.toString(),
        title: beat.title,
        artist: beat.producer_names.join(', '),
        audioUrl: beat.audioUrl,
        producerSlug: beat.producer_slugs[0] || '',
        producers: beat.producers || [],
        slug: beat.slug || beat.id.toString(),
      });
      setIsPlaying(true);
      idx++;
    };
    playNext();
    // Listen for when the current beat ends
    const audio = document.querySelector('audio');
    if (audio) {
      audio.onended = () => {
        if (idx < displayedBeats.length) {
          playNext();
        } else {
          audio.onended = null;
        }
      };
    }
  };

  // Save edit to Supabase
  async function saveEdit(beatId: string, field: 'title' | 'play_count', value: string) {
    if (!beatId || !value.trim()) return;
    const updateObj: any = {};
    updateObj[field] = field === 'play_count' ? Number(value) : value.trim();
    const { error } = await supabase.from('beats').update(updateObj).eq('id', beatId);
    if (!error) {
      setDisplayedBeats(beats => beats.map(b => b.id === beatId ? { ...b, [field]: field === 'play_count' ? Number(value) : value.trim() } : b));
    }
    setEditingBeatId(null);
    setEditingField(null);
    setEditValue("");
  }

  // Handle input events
  function handleEditInput(e: React.ChangeEvent<HTMLInputElement>) {
    setEditValue(e.target.value);
  }
  function handleEditKeyDown(e: React.KeyboardEvent<HTMLInputElement>, beatId: string, field: 'title' | 'play_count') {
    if (e.key === 'Enter') {
      saveEdit(beatId, field, editValue);
    } else if (e.key === 'Escape') {
      setEditingBeatId(null);
      setEditingField(null);
      setEditValue("");
    }
  }
  function handleEditBlur(beatId: string, field: 'title' | 'play_count') {
    saveEdit(beatId, field, editValue);
  }

  const GridView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {filteredBeats.map((beat) => (
        <BeatCard
          key={beat.id}
          beat={beat}
          isPlaying={currentBeat?.id === beat.id && isPlaying}
          onPlayPause={handlePlayPause}
          onPurchase={handlePurchase}
        />
      ))}
    </div>
  )

  const ListView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
      {filteredBeats.map((beat, idx) => (
        <div
          key={beat.id}
          className={`flex items-center justify-between p-4 bg-secondary/80 hover:bg-secondary transition rounded-lg group ${currentBeat?.id === beat.id && isPlaying ? 'border-2 border-primary bg-primary/10 shadow-lg' : ''}`}
        >
          <div className="flex items-center space-x-4 min-w-0">
            <a
              href={`/beat/${beat.slug}`}
              onClick={e => e.stopPropagation()}
              tabIndex={0}
              aria-label={`View details for ${beat.title}`}
            >
              <div className="w-16 h-16 flex-shrink-0">
              <Image
                src={beat.image || "/placeholder.svg"}
                alt={beat.title}
                  width={64}
                  height={64}
                  className="w-full h-full aspect-square rounded object-cover border border-primary shadow cursor-pointer hover:opacity-80 transition"
              />
              </div>
            </a>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-white w-full text-center whitespace-normal">{beat.title}</div>
              <div className="text-xs text-gray-400 truncate">
                {beat.genre && <span className="mr-2">{beat.genre}</span>}
                {beat.bpm && <span>{beat.bpm} BPM</span>}
              </div>
              <div className="text-sm text-gray-300 truncate">
                {beat.producer_ids && beat.producer_names && beat.producer_names.length > 0
                  ? beat.producer_names.map((name: string, idx: number) => (
                      <span key={beat.producer_ids[idx]}>
                        <Link href={`/producers/${beat.producer_slugs[idx]}`} className="hover:text-yellow-400 text-gray-300">
                          {name}
                        </Link>{idx < beat.producer_names.length - 1 ? ', ' : ''}
                      </span>
                    ))
                  : beat.producer}
              </div>
              <div className="mb-2">
                <BeatRating
                  beatId={beat.id}
                  initialAverageRating={beat.average_rating || 0}
                  initialTotalRatings={beat.total_ratings || 0}
                />
              </div>
              <div className="text-xs text-gray-400 mt-1">{beat.plays.toLocaleString()} plays</div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 ml-4 flex-shrink-0">
            <Button variant="outline" size="icon" onClick={() => handlePlayPause(beat)} aria-label={currentBeat?.id === beat.id && isPlaying ? 'Pause' : 'Play'}>
              {currentBeat?.id === beat.id && isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>
            <Button
              className="gradient-button text-black font-medium hover:text-white px-3 py-1"
              onClick={() => handlePurchase(beat)}
              aria-label="Buy"
            >
              <ShoppingCart className="h-5 w-5" />
            </Button>
            <a
              href={`/beat/${beat.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center text-primary hover:text-yellow-400"
              title="View beat details"
            >
              <ExternalLink className="h-5 w-5" />
            </a>
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
          className={`flex items-center justify-between p-4 bg-secondary rounded-lg transition-all duration-200 ${currentBeat?.id === beat.id && isPlaying ? 'border-2 border-primary bg-primary/10 shadow-lg' : ''}`}
          onClick={() => handlePlayPause(beat)}
        >
          <div className="flex items-center space-x-4">
            <a
              href={`/beat/${beat.slug}`}
              onClick={e => e.stopPropagation()}
              tabIndex={0}
              aria-label={`View details for ${beat.title}`}
            >
              <div className="w-16 h-16 flex-shrink-0">
              <Image
                src={beat.image || "/placeholder.svg"}
                alt={beat.title}
                width={64}
                height={64}
                  className="w-full h-full aspect-square rounded object-cover border border-primary shadow cursor-pointer hover:opacity-80 transition"
              />
              </div>
            </a>
            <div>
              <h3 className="font-semibold w-full text-center whitespace-normal">
                {beat.title}
              </h3>
              <p className="text-xs text-gray-400 mb-1 text-center w-full">
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
              <div className="mb-2">
                <BeatRating
                  beatId={beat.id}
                  initialAverageRating={beat.average_rating || 0}
                  initialTotalRatings={beat.total_ratings || 0}
                  compact={true}
                />
              </div>
              <p className="text-sm text-gray-500">{beat.plays.toLocaleString()} plays</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" onClick={e => { e.stopPropagation(); handlePlayPause(beat); }}>
              {currentBeat?.id === beat.id && isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <Button
              className="gradient-button text-black font-medium hover:text-white"
              onClick={e => { e.stopPropagation(); handlePurchase(beat); }}
            >
              <ShoppingCart className="h-5 w-5 sm:hidden" />
              <span className="hidden sm:inline">{user ? 'BUY' : 'BUY INSTANTLY'}</span>
            </Button>
          </div>
        </div>
      ))}
    </div>
  )

  // Pagination controls
  const Pagination = () => (
    <div className="flex justify-center items-center gap-4 mt-8">
      <Button
        variant="outline"
        disabled={currentPage === 1}
        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
      >
        Previous
      </Button>
      <span className="text-lg font-semibold text-primary">
        Page {currentPage} of {totalPages}
      </span>
      <Button
        variant="outline"
        disabled={currentPage === totalPages}
        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
      >
        Next
      </Button>
    </div>
  );

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
        {/* Sort/Filter Dropdown */}
        <div className="w-full sm:w-auto">
          <Select value={sortOption} onValueChange={v => setSortOption(v as any)}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Newest</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="plays">Most Plays</SelectItem>
              <SelectItem value="playall">View All</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
      <div className="min-h-[300px] w-full flex items-center justify-center">
        {loading ? (
          <div className="flex items-center justify-center w-full h-full min-h-[300px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <>
      {currentView === "grid" && <GridView />}
      {currentView === "list" && <ListView />}
      {currentView === "compact" && <CompactView />}
      {currentView === "vertical" && <VerticalSlideView beats={filteredBeats} onClose={() => setCurrentView("grid")} disableGlobalPlayer />}
          </>
        )}
      </div>
      <Pagination />

      {/* Modals */}
      <SaveToPlaylistModal
        isOpen={isPlaylistModalOpen}
        onClose={() => setIsPlaylistModalOpen(false)}
        beat={selectedBeat}
      />
      <PurchaseOptionsModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        beat={selectedBeat ? { ...selectedBeat, id: String(selectedBeat.id) } : null}
      />
      </div>
    </div>
  )
}

