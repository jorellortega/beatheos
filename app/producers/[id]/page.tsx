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
import { createClient } from '@supabase/supabase-js'
import { EditProfileDialog } from "@/components/EditProfileDialog"
import { ProfilePictureUpload } from "@/components/ProfilePictureUpload"
import { useToast } from "@/components/ui/use-toast"

interface Producer {
  id: string
  user_id: string
  name: string
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

  const fetchProducer = async () => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data, error } = await supabase
      .from('producers')
      .select('*')
      .eq('id', id)
      .single()
    if (data) {
      setProducer({
        id: data.id,
        user_id: data.user_id,
        name: data.display_name,
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
    fetchProducer()
  }, [id, user])

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
            <Avatar className="w-full h-full">
              <AvatarImage src={producer.profile_image_url || "/placeholder.svg"} alt={producer.name} />
              <AvatarFallback>{producer.name.slice(0, 2).toUpperCase()}</AvatarFallback>
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
            <h1 className="text-3xl font-bold mb-2">{producer.name}</h1>
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
                <span className="font-bold">{producer.followers.toLocaleString()}</span> followers
              </div>
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
              <div className="flex gap-2 justify-center md:justify-start">
                <Button
                  className="gradient-button text-black font-medium hover:text-white"
                  onClick={() => setIsEditDialogOpen(true)}
                >
                  Edit Profile
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete your profile? This action cannot be undone.')) {
                      // TODO: Add delete logic here
                    }
                  }}
                >
                  Delete Profile
                </Button>
              </div>
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
            <TabsTrigger value="pictures">Pictures</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>
          <TabsContent value="beats">
            <ProducerBeats producerId={producer.user_id} searchQuery={searchQuery} isOwnProfile={isOwnProfile} onBeatsFetched={setBeats} />
          </TabsContent>
          <TabsContent value="pictures">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {producer.pictures?.map((picture) => (
                <Card key={picture.id} className="overflow-hidden">
                  <div className="relative aspect-square">
                    <img
                      src={picture.url}
                      alt={picture.caption}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <CardContent className="p-4">
                    <p className="text-sm mb-2">{picture.caption}</p>
                    <div className="flex items-center justify-between text-sm text-gray-400">
                      <div className="flex items-center space-x-4">
                        <span>{picture.likes} likes</span>
                        <span>{picture.comments} comments</span>
                      </div>
                      <span>{picture.date}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {isOwnProfile && (
                <Card className="aspect-square flex items-center justify-center cursor-pointer hover:bg-secondary transition-colors">
                  <div className="text-center">
                    <Plus className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <span className="text-sm text-gray-400">Add Picture</span>
                  </div>
                </Card>
              )}
            </div>
          </TabsContent>
          <TabsContent value="about">
            <Card>
              <CardHeader>
                <CardTitle>About {producer.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">{producer.bio}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold">Followers</h3>
                    <p>{producer.followers.toLocaleString()}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Beats</h3>
                    <p>{producer.beatsCount}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Genre</h3>
                    <p>{producer.genre}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Top 10 Appearances</h3>
                    <p>Producer: {producer.topProducerCount}, Beats: {producer.topBeatsCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
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
          />
        </>
      )}
    </>
  )
}

