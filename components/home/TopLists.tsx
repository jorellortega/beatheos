"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Crown, Flame } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePlayer } from '@/contexts/PlayerContext'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

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
  const { setCurrentBeat, setIsPlaying } = usePlayer()
  const [topBeats, setTopBeats] = useState<Beat[]>([])
  const [topProducers, setTopProducers] = useState<Producer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    async function fetchTopLists() {
      setLoading(true)
      // Fetch top 10 beats this week
      const { data: beatsData } = await supabase
        .from('beats')
        .select('id, title, play_count, cover_art_url, producer_id, created_at, mp3_url')
        .gte('created_at', new Date(new Date().setDate(new Date().getDate() - new Date().getDay())).toISOString())
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
      setLoading(false)
    }
    fetchTopLists()
  }, [])

  const handleBeatClick = (beat: Beat) => {
    setCurrentBeat({
      id: beat.id.toString(),
      title: beat.title,
      artist: beat.producer_name,
      audioUrl: beat.audioUrl || '/placeholder-audio.mp3',
    })
    setIsPlaying(true)
  }

  if (loading) return <div className="text-center py-8">Loading top lists...</div>

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <Card className="bg-card border-primary">
        <CardHeader>
          <CardTitle className="flex items-center text-primary">
            <Flame className="mr-2 h-6 w-6" />
            Top 10 Beats This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {topBeats.map((beat, index) => (
              <li key={beat.id} className="flex items-center justify-between p-2 hover:bg-secondary rounded-lg transition-colors">
                <div className="flex items-center">
                  <span className="text-2xl font-bold text-primary w-8 mr-4">{index + 1}</span>
                  <div className="relative w-10 h-10 mr-3">
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
                  <div className="flex flex-col">
                    <button 
                      onClick={() => handleBeatClick(beat)} 
                      className="font-semibold text-left hover:text-primary transition-colors"
                    >
                      {beat.title}
                    </button>
                    <div className="flex items-center">
                      <div className="relative w-4 h-4 mr-2">
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
                  </div>
                </div>
                <span className="text-sm text-gray-400">{beat.plays.toLocaleString()} plays</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="bg-card border-primary">
        <CardHeader>
          <CardTitle className="flex items-center text-primary">
            <Crown className="mr-2 h-6 w-6" />
            Top 10 Producers This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {topProducers.map((producer, index) => (
              <li key={producer.id} className="flex items-center justify-between p-2 hover:bg-secondary rounded-lg transition-colors">
                <div className="flex items-center">
                  <span className="text-2xl font-bold text-primary w-8 mr-4">{index + 1}</span>
                  <div className="relative w-10 h-10 mr-3">
                    <Image
                      src={producer.image || '/placeholder.svg'}
                      alt={producer.name}
                      className="rounded-full object-cover"
                      fill
                      sizes="40px"
                    />
                  </div>
                  <Link href={`/producers/${producer.id}`} className="font-semibold hover:text-primary transition-colors">
                    {producer.name}
                  </Link>
                </div>
                <span className="text-sm text-gray-400">{producer.weekly_plays.toLocaleString()} plays</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}