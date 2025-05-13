"use client"

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ProducerBeats } from "@/components/producer/ProducerBeats"
import Header from '@/components/header'
import { Search, Award, Music, Plus, Camera } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { EditProfileDialog } from "@/components/EditProfileDialog"
import { ProfilePictureUpload } from "@/components/ProfilePictureUpload"
import { useToast } from "@/components/ui/use-toast"

interface Producer {
  id: string
  user_id: string
  display_name: string
  profile_image_url: string
  bio: string
  followers: number
  beatsCount: number
  genre: string
  topProducerCount: number
  topBeatsCount: number
  pictures: {
    id: string
    url: string
    caption: string
    likes: number
    comments: number
    date: string
  }[]
}

export default function ProducerProfilePage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [producer, setProducer] = useState<Producer | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [beats, setBeats] = useState<any[]>([])
  const totalPlays = beats.reduce((sum, beat) => sum + (beat.plays || 0), 0)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // DEBUG: Log when the Supabase client is created
  console.debug('[DEBUG] Creating Supabase client in ProducerProfilePage');

    const fetchProducer = async () => {
    console.debug('[DEBUG] fetchProducer called for id:', id);
    const { data, error } = await supabase
      .from('producers')
      .select('*')
      .eq('id', id)
      .single()
    if (data) {
      setProducer({
        id: data.id,
        user_id: data.user_id,
        display_name: data.display_name,
        profile_image_url: data.profile_image_url || "/placeholder.svg",
        bio: data.bio || "",
        followers: data.followers ?? 0,
        beatsCount: data.total_beats ?? 0,
        genre: data.genre || "",
        topProducerCount: data.top_producer_count ?? 0,
        topBeatsCount: data.top_beats_count ?? 0,
        pictures: data.pictures || [],
      })
      // Check if this is the user's own profile
      if (user && user.id === data.user_id) {
        setIsOwnProfile(true)
      } else {
        setIsOwnProfile(false)
      }
    }
  }

  useEffect(() => {
    console.debug('[DEBUG] useEffect triggered: id =', id);
    fetchProducer()
  }, [id])

  if (!producer) {
    return <div>Loading...</div>
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center md:items-start mb-8">
          <div
            className="relative group w-32 h-32 md:w-48 md:h-48 mb-4 md:mb-0 md:mr-8"
            style={{ borderRadius: '50%', overflow: 'hidden' }}
          >
            <Avatar className="w-full h-full" style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '100%' }}>
              <AvatarImage
                src={producer.profile_image_url || "/placeholder.svg"}
                alt={producer.display_name}
                style={{ objectFit: "cover", width: "100%", height: "100%" }}
              />
              <AvatarFallback>{producer.display_name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
            {isOwnProfile && (
              <div
                className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => setIsUploadDialogOpen(true)}
                style={{ borderRadius: '50%' }}
              >
                <Camera size={36} color="white" />
              </div>
            )}
          </div>
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-bold mb-2">{producer.display_name}</h1>
            <div className="flex flex-wrap gap-2 mb-4 justify-center md:justify-start">
              {producer.topProducerCount > 0 && (
                <Badge variant="secondary" className="flex items-center">
                  <Award className="w-4 h-4 mr-1" />
                  Top 10 Producer x{producer.topProducerCount}
                </Badge>
              )}
              {producer.topBeatsCount > 0 && (
                <Badge variant="secondary" className="flex items-center">
                  <Music className="w-4 h-4 mr-1" />
                  Top 10 Beats x{producer.topBeatsCount}
                </Badge>
              )}
            </div>
            <p className="text-gray-500 mb-4">{producer.bio}</p>
            <div className="flex justify-center md:justify-start space-x-4 mb-4">
              <div>
                <span className="font-bold">{beats.length}</span> beats
              </div>
              <div>
                <span className="font-bold">{totalPlays}</span> plays
              </div>
              <div>
                <span className="font-bold">{producer.genre}</span>
              </div>
            </div>
            {isOwnProfile && (
              null
            )}
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search beats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary text-white focus:bg-accent w-full"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          </div>
        </div>

        <Tabs defaultValue="beats" className="w-full">
          <TabsList>
            <TabsTrigger value="beats">Beats</TabsTrigger>
          </TabsList>
          <TabsContent value="beats">
            <ProducerBeats producerId={producer.user_id} searchQuery={searchQuery} isOwnProfile={isOwnProfile} onBeatsFetched={setBeats} />
          </TabsContent>
        </Tabs>
      </main>

      {producer && (
        <>
          <EditProfileDialog
            producer={producer}
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            onProfileUpdated={fetchProducer}
          />
          <ProfilePictureUpload
            producerId={producer.id}
            open={isUploadDialogOpen}
            onOpenChange={setIsUploadDialogOpen}
            onUploadSuccess={fetchProducer}
            currentImageUrl={producer.profile_image_url}
          />
        </>
      )}
    </>
  )
}

