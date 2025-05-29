"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import Image from 'next/image'
import Link from 'next/link'
import { Search, Shuffle, Award } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

export default function ProducersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [displayedProducers, setDisplayedProducers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [beatCounts, setBeatCounts] = useState<{ [producerId: string]: number }>({})

  const shuffleProducers = () => {
    setDisplayedProducers(prev => {
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
  };

  useEffect(() => {
    async function fetchProducers() {
      try {
      setLoading(true)
        setError(null)
        
      const { data, error } = await supabase.from('producers').select('*')
        
        if (error) throw error
        
        if (!data) {
        setDisplayedProducers([])
          return
        }

        setDisplayedProducers(data)
        
        // Fetch beat counts for each producer
        const counts: { [producerId: string]: number } = {}
        await Promise.all(
          data.map(async (producer: any) => {
            if (!producer.user_id) return
            try {
            const res = await fetch(`/api/beats?producerId=${producer.user_id}`)
              if (!res.ok) throw new Error('Failed to fetch beat count')
            const beats = await res.json()
            counts[producer.id] = Array.isArray(beats) ? beats.length : 0
            } catch (err) {
              console.error(`Error fetching beats for producer ${producer.id}:`, err)
              counts[producer.id] = 0
            }
          })
        )
        setBeatCounts(counts)
      } catch (err) {
        console.error('Error fetching producers:', err)
        setError('Failed to load producers. Please try again.')
        setDisplayedProducers([])
      } finally {
      setLoading(false)
    }
    }

    fetchProducers()
  }, [])

  const filteredProducers = displayedProducers
    .filter(producer => (beatCounts[producer.id] ?? 0) > 0)
    .filter(producer =>
    producer.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
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
    <main style={{ backgroundColor: '#141414', minHeight: '100vh', padding: '2rem' }}>
      <h1 className="text-4xl font-bold mb-8 font-display tracking-wider text-primary mt-8 sm:mt-0">Producers</h1>
      <p className="text-xl mb-8 text-gray-300">Discover beat making deities.</p>
      
      <div className="flex justify-between items-center mb-8">
        <div className="relative w-64">
          <Input
            type="text"
            placeholder="Search producers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-secondary text-white focus:bg-accent w-full"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        </div>
        <Button 
          variant="outline" 
          className="bg-black border-primary text-white hover:bg-primary hover:text-black transition-colors"
          onClick={shuffleProducers}
        >
          <Shuffle className="h-4 w-4 mr-2" />
          Shuffle
        </Button>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredProducers.map((producer) => (
          <Card key={producer.id} className="bg-black border-primary">
            <CardHeader className="relative pb-0 pt-0 px-0 flex items-center justify-center">
              <div className="relative w-full aspect-square">
              <Image
                src={producer.profile_image_url || "/placeholder.svg"}
                alt={producer.display_name}
                  fill
                  className="rounded-t-lg object-cover"
              />
              </div>
              {producer.isTop10 && (
                <Badge className="absolute top-2 left-2 bg-primary text-black">
                  <Award className="h-4 w-4 mr-1" />
                  Top 10
                </Badge>
              )}
            </CardHeader>
            <CardContent className="pt-4 bg-black">
              <CardTitle className="text-lg mb-2">
                <Link href={`/producers/${producer.slug}`} className="hover:underline truncate max-w-full block">
                  {producer.display_name}
                </Link>
              </CardTitle>
              <p className="text-sm text-gray-400 mb-2">{beatCounts[producer.id] ?? 0} beats</p>
              <Badge variant="secondary">{producer.genre}</Badge>
              <Button asChild className="gradient-button text-black font-medium py-2 px-4 rounded-full shadow-lg hover:text-white mt-4 w-full">
                <Link href={`/producers/${producer.slug}`}>View Profile</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  )
}