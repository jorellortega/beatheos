"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Crown, Flame } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePlayer } from '@/contexts/PlayerContext'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface Beat {
  id: number
  title: string
  producer_name: string
  plays: number
  image: string
  producer_image: string
  producer_profile_id: string
  audioUrl: string
}

interface Producer {
  id: string
  name: string
  weekly_plays: number
  image: string
}

export function TopLists() {
  const { currentBeat, setCurrentBeat, isPlaying, setIsPlaying } = usePlayer()
  const [topBeats, setTopBeats] = useState<Beat[]>([])
  const [topProducers, setTopProducers] = useState<Producer[]>([])
  const [loading, setLoading] = useState(true)
  const lastClickRef = useRef<{ id: string; time: number } | null>(null)
  const [revealedBeats, setRevealedBeats] = useState<number>(0)
  const [revealedProducers, setRevealedProducers] = useState<number>(0)

  useEffect(() => {
    async function fetchTopLists() {
      setLoading(true)
      // Fetch top 10 beats from the last 7 days
      const { data: beatsData } = await supabase
        .from('beats')
        .select('id, title, play_count, cover_art_url, producer_id, created_at, mp3_url')
        .eq('is_draft', false)
        .gte('created_at', new Date(new Date().setDate(new Date().getDate() - 7)).toISOString())
        .order('play_count', { ascending: false })
        .limit(10)

      // Fetch producer info for each beat
      let beats: Beat[] = []
      if (beatsData && beatsData.length > 0) {
        const producerIds = [...new Set(beatsData.map((b: any) => b.producer_id))]
        const { data: producersData } = await supabase
          .from('producers')
          .select('id, user_id, display_name, image')
          .in('user_id', producerIds)
        beats = beatsData.map((b: any) => {
          const producer = producersData?.find((p: any) => p.user_id === b.producer_id)
          return {
            id: b.id,
            title: b.title,
            producer_name: producer?.display_name || 'Unknown',
            plays: b.play_count || 0,
            image: b.cover_art_url || '/placeholder.svg',
            producer_image: producer?.image || '/placeholder.svg',
            producer_profile_id: producer?.id,
            audioUrl: b.mp3_url || '',
          }
        })
      }
      setTopBeats(beats)
      setRevealedBeats(0)

      // Fetch top 10 producers this week
      const { data: topProducersData } = await supabase.rpc('top_producers_this_week')
      // Now fetch the producers table ids for these user_ids
      const userIds = (topProducersData || []).map((p: any) => p.user_id)
      const { data: producersData } = await supabase
        .from('producers')
        .select('id, user_id, profile_image_url')
        .in('user_id', userIds)
      setTopProducers(
        (topProducersData || []).map((p: any) => {
          const producer = producersData?.find((prod: any) => prod.user_id === p.user_id)
          return {
            id: producer?.id,
            name: p.display_name,
            weekly_plays: p.total_plays,
            image: producer?.profile_image_url || '/placeholder.svg',
          }
        })
      )
      setRevealedProducers(0)
      setLoading(false)
    }
    fetchTopLists()
  }, [])

  // Progressive reveal for beats
  useEffect(() => {
    if (!loading && topBeats.length > 0 && revealedBeats < topBeats.length) {
      const timer = setTimeout(() => setRevealedBeats(revealedBeats + 1), 100)
      return () => clearTimeout(timer)
    }
  }, [loading, topBeats, revealedBeats])

  // Progressive reveal for producers
  useEffect(() => {
    if (!loading && topProducers.length > 0 && revealedProducers < topProducers.length) {
      const timer = setTimeout(() => setRevealedProducers(revealedProducers + 1), 100)
      return () => clearTimeout(timer)
    }
  }, [loading, topProducers, revealedProducers])

  const handleBeatClick = (beat: Beat) => {
    const now = Date.now();
    const beatId = beat.id.toString();
    if (currentBeat && currentBeat.id === beatId) {
      if (lastClickRef.current && lastClickRef.current.id === beatId && now - lastClickRef.current.time < 300) {
        // Double click detected: restart from beginning
        const audio = document.querySelector('audio[src="' + (beat.audioUrl || '/placeholder-audio.mp3') + '"]') as HTMLAudioElement | null;
        if (audio) {
          audio.currentTime = 0;
          audio.play();
        }
        setIsPlaying(true);
      } else {
        setIsPlaying(!isPlaying);
      }
      lastClickRef.current = { id: beatId, time: now };
    } else {
    setCurrentBeat({
        id: beatId,
      title: beat.title,
      artist: beat.producer_name,
      audioUrl: beat.audioUrl || '/placeholder-audio.mp3',
    })
    setIsPlaying(true)
      lastClickRef.current = { id: beatId, time: now };
    }
  }

  if (loading) return <div className="text-center py-8">Loading top lists...</div>

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <Card className="bg-black border-primary">
        <CardHeader>
          <CardTitle className="flex items-center text-primary">
            <Flame className="mr-2 h-6 w-6" />
            Top 10 Beats This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {[...Array(10)].map((_, index) => {
              if (loading || index >= revealedBeats || !topBeats[index]) {
                // Skeleton row
                return (
                  <li key={index} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 animate-pulse bg-secondary/10 rounded-lg gap-y-2 sm:gap-y-0">
                    <div className="flex items-center gap-x-2 sm:gap-x-4">
                      <span className="text-2xl font-bold text-primary w-8 text-center">{index + 1}</span>
                      <div className="relative w-10 h-10 bg-gray-800 rounded-md" />
                      <div className="flex flex-col justify-center">
                        <div className="h-4 w-24 bg-gray-700 rounded mb-1" />
                        <div className="flex items-center gap-x-1 mt-1">
                          <div className="relative w-4 h-4 bg-gray-800 rounded-full" />
                          <div className="h-3 w-12 bg-gray-700 rounded" />
                        </div>
                        <span className="h-3 w-16 bg-gray-700 rounded mt-1 block sm:hidden" />
                      </div>
                    </div>
                    <span className="h-3 w-12 bg-gray-700 rounded text-right sm:text-left mt-1 sm:mt-0 hidden sm:block" />
                  </li>
                )
              } else {
                const beat = topBeats[index]
                return (
              <li
                key={beat.id + '-' + index}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-2 hover:bg-secondary rounded-lg transition-colors gap-y-2 sm:gap-y-0 cursor-pointer"
                onClick={() => handleBeatClick(beat)}
              >
                <div className="flex items-center gap-x-2 sm:gap-x-4">
                  <span className="text-2xl font-bold text-primary w-8 text-center">{index + 1}</span>
                  <div className="relative w-10 h-10">
                    <Image
                      src={beat.image}
                      alt={beat.title}
                      className="rounded-md object-cover"
                      fill
                      sizes="40px"
                      quality={75}
                      priority={index < 3}
                    />
                  </div>
                  <div className="flex flex-col justify-center">
                    <button 
                      onClick={e => { e.stopPropagation(); handleBeatClick(beat); }} 
                      className="font-semibold text-left hover:text-primary transition-colors text-base sm:text-lg"
                    >
                      {beat.title}
                    </button>
                    <div className="flex items-center gap-x-1 mt-1">
                      <div className="relative w-4 h-4">
                        <Image
                          src={beat.producer_image}
                          alt={beat.producer_name}
                          className="rounded-full object-cover"
                          fill
                          sizes="16px"
                          quality={75}
                        />
                      </div>
                      <Link href={`/producers/${beat.producer_profile_id}`} className="text-sm text-gray-400 hover:text-primary transition-colors">
                        {beat.producer_name}
                      </Link>
                    </div>
                    <span className="text-sm text-gray-400 mt-1 block sm:hidden">{beat.plays.toLocaleString()} plays</span>
                  </div>
                </div>
                <span className="text-sm text-gray-400 text-right sm:text-left mt-1 sm:mt-0 hidden sm:block">{beat.plays.toLocaleString()} plays</span>
              </li>
                )
              }
            })}
          </ul>
        </CardContent>
      </Card>

      <Card className="bg-black border-primary">
        <CardHeader>
          <CardTitle className="flex items-center text-primary">
            <Crown className="mr-2 h-6 w-6" />
            Top 10 Producers This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {[...Array(10)].map((_, index) => {
              if (loading || index >= revealedProducers || !topProducers[index]) {
                // Skeleton row
                return (
                  <li key={index} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 animate-pulse bg-secondary/10 rounded-lg gap-y-2 sm:gap-y-0">
                    <div className="flex items-center gap-x-2 sm:gap-x-4">
                      <span className="text-2xl font-bold text-primary w-8 text-center">{index + 1}</span>
                      <div className="relative w-10 h-10 bg-gray-800 rounded-full" />
                      <div className="flex flex-col justify-center">
                        <div className="h-4 w-24 bg-gray-700 rounded mb-1" />
                      </div>
                    </div>
                    <span className="h-3 w-12 bg-gray-700 rounded text-right sm:text-left mt-1 sm:mt-0" />
                  </li>
                )
              } else {
                const producer = topProducers[index]
                return (
              <li key={producer.id + '-' + index} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 hover:bg-secondary rounded-lg transition-colors gap-y-2 sm:gap-y-0">
                <div className="flex items-center gap-x-2 sm:gap-x-4">
                  <span className="text-2xl font-bold text-primary w-8 text-center">{index + 1}</span>
                  <div className="relative w-10 h-10">
                    <Image
                          src={producer.image}
                      alt={producer.name}
                      className="rounded-full object-cover"
                      fill
                      sizes="40px"
                          quality={75}
                          priority={index < 3}
                    />
                  </div>
                      <div className="flex flex-col justify-center">
                        <span className="font-semibold text-base sm:text-lg">{producer.name}</span>
                  </div>
                </div>
                    <span className="text-sm text-gray-400 text-right sm:text-left mt-1 sm:mt-0">{producer.weekly_plays.toLocaleString()} plays</span>
              </li>
                )
              }
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}