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
  slug: string
  title: string
  producer_name: string
  producer_names: string[]
  producer_slugs: string[]
  producers: any[]
  plays: number
  image: string
  producer_image: string
  producer_slug: string
  audioUrl: string
}

interface Producer {
  id: string
  name: string
  weekly_plays: number
  image: string
  slug: string
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
        .select('id, slug, title, play_count, cover_art_url, producer_id, producer_ids, created_at, mp3_url')
        .eq('is_draft', false)
        .gte('created_at', new Date(new Date().setDate(new Date().getDate() - 7)).toISOString())
        .order('play_count', { ascending: false })
        .limit(10)

      // Fetch producer info for each beat
      let beats: Beat[] = []
      if (beatsData && beatsData.length > 0) {
        // Get all unique producer IDs from both producer_id and producer_ids
        const allProducerIds = Array.from(new Set([
          ...beatsData.map((b: any) => b.producer_id),
          ...beatsData.flatMap((b: any) => b.producer_ids || [])
        ].filter(Boolean)))

        const { data: producersData } = await supabase
          .from('producers')
          .select('id, user_id, display_name, image, slug')
          .in('user_id', allProducerIds)

        // Create a map for quick lookup
        const producerMap = Object.fromEntries((producersData || []).map((p: any) => [
          p.user_id,
          { display_name: p.display_name, slug: p.slug, image: p.image }
        ]))

        beats = beatsData.map((b: any) => {
          // Get all producer ids, names, and slugs for this beat
          const ids = [b.producer_id, ...(b.producer_ids || []).filter((id: string) => id !== b.producer_id)]
          const producers = ids.map((id: string) => producerMap[id]).filter(Boolean)
          const producerNames = producers.map((p: any) => p.display_name)
          const producerSlugs = producers.map((p: any) => p.slug)
          const producerImages = producers.map((p: any) => p.image)

          return {
            id: b.id,
            slug: b.slug,
            title: b.title,
            producer_name: producerNames.join(', '),
            producer_names: producerNames,
            producer_slugs: producerSlugs,
            producers: producers,
            plays: b.play_count || 0,
            image: b.cover_art_url || '/placeholder.svg',
            producer_image: producerImages[0] || '/placeholder.svg',
            producer_slug: producerSlugs[0] || '',
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
        .select('id, user_id, profile_image_url, slug')
        .in('user_id', userIds)
      // Fetch user roles for these user_ids
      const { data: usersData } = await supabase
        .from('users')
        .select('id, role')
        .in('id', userIds)
      const userRoleMap = Object.fromEntries((usersData || []).map((u: any) => [u.id, u.role]))
      setTopProducers(
        (topProducersData || [])
          .filter((p: any) => userRoleMap[p.user_id] !== 'free_artist')
          .map((p: any) => {
          const producer = producersData?.find((prod: any) => prod.user_id === p.user_id)
          return {
            id: producer?.id,
            slug: producer?.slug,
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
        producerSlug: beat.producer_slugs[0] || '',
        producers: beat.producers || [],
        slug: beat.slug || beatId,
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
                  <Link href={`/beat/${beat.slug}`}>
                    <div className="relative w-10 h-10 cursor-pointer group">
                    <Image
                      src={beat.image}
                      alt={beat.title}
                        className="rounded-md object-cover transition-transform duration-200 group-hover:scale-110 group-hover:shadow-lg"
                      fill
                      sizes="40px"
                      quality={75}
                      priority={index < 3}
                    />
                  </div>
                  </Link>
                  <div className="flex flex-col justify-center">
                    <button 
                      onClick={e => { e.stopPropagation(); handleBeatClick(beat); }} 
                      className="font-semibold text-left hover:text-primary transition-colors text-base sm:text-lg"
                    >
                      {beat.title}
                    </button>
                    <div className="text-sm text-gray-400">
                      by {beat.producers && beat.producers.map((producer, idx) => (
                        <span key={producer.slug}>
                          <Link href={`/producers/${producer.slug}`} className="hover:text-primary transition-colors">
                            {producer.display_name}
                          </Link>
                          {idx < beat.producers.length - 1 && ', '}
                        </span>
                      ))}
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
                <Link href={`/producers/${producer.slug}`} className="flex items-center gap-x-2 sm:gap-x-4 group">
                  <span className="text-2xl font-bold text-primary w-8 text-center">{index + 1}</span>
                  <div className="relative w-10 h-10 cursor-pointer group-hover:scale-110 group-hover:shadow-lg transition-transform duration-200">
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
                </Link>
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