"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import Image from 'next/image'
import Link from 'next/link'
import { Search, Shuffle, Award } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ProducersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [displayedProducers, setDisplayedProducers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [beatCounts, setBeatCounts] = useState<{ [producerId: string]: number }>({})

  useEffect(() => {
    async function fetchProducers() {
      setLoading(true)
      const { data, error } = await supabase.from('producers').select('*')
      if (error) {
        setDisplayedProducers([])
    } else {
        setDisplayedProducers(data || [])
        // Fetch beat counts for each producer
        const counts: { [producerId: string]: number } = {}
        await Promise.all(
          (data || []).map(async (producer: any) => {
            if (!producer.user_id) return
            const res = await fetch(`/api/beats?producerId=${producer.user_id}`)
            const beats = await res.json()
            counts[producer.id] = Array.isArray(beats) ? beats.length : 0
          })
        )
        setBeatCounts(counts)
      }
      setLoading(false)
    }
    fetchProducers()
  }, [])

  const filteredProducers = displayedProducers.filter(producer =>
    producer.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) return <div>Loading producers...</div>

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 font-display tracking-wider text-primary">Sonic Deities</h1>
      <p className="text-xl mb-8 text-gray-300">Explore the pantheon of beat-making gods and their divine creations.</p>
      
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
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredProducers.map((producer) => (
          <Card key={producer.id} className="bg-card border-primary">
            <CardHeader className="relative pb-0 pt-0 px-0">
              <Image
                src={producer.profile_image_url || "/placeholder.svg"}
                alt={producer.display_name}
                width={300}
                height={300}
                className="rounded-t-lg"
              />
              {producer.isTop10 && (
                <Badge className="absolute top-2 left-2 bg-primary text-black">
                  <Award className="h-4 w-4 mr-1" />
                  Top 10
                </Badge>
              )}
            </CardHeader>
            <CardContent className="pt-4">
              <CardTitle className="text-lg mb-2">
                <Link href={`/producers/${producer.id}`} className="hover:underline">
                  {producer.display_name}
                </Link>
              </CardTitle>
              <p className="text-sm text-gray-400 mb-2">{beatCounts[producer.id] ?? 0} beats</p>
              <Badge variant="secondary">{producer.genre}</Badge>
              <Button asChild className="gradient-button text-black font-medium py-2 px-4 rounded-full shadow-lg hover:text-white mt-4 w-full">
                <Link href={`/producers/${producer.id}`}>View Profile</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

