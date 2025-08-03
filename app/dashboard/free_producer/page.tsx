"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Music2, Users, Package } from "lucide-react"
import Link from "next/link"
import { supabase } from '@/lib/supabaseClient'

export default function FreeProducerDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [playlistId, setPlaylistId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== "free_producer") {
      router.push("/login")
    }
  }, [user, router])

  useEffect(() => {
    async function fetchOrCreatePlaylist() {
      if (!user) return;
      const { data, error } = await supabase
        .from('playlists')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        .single();
      if (data && data.id) {
        setPlaylistId(data.id);
      } else {
        const { data: newPlaylist, error: createError } = await supabase
          .from('playlists')
          .insert([{ user_id: user.id, name: 'My Playlist' }])
          .select('id')
          .single();
        if (newPlaylist && newPlaylist.id) setPlaylistId(newPlaylist.id);
      }
    }
    fetchOrCreatePlaylist();
  }, [user]);

  if (!user) return null

  return (
    <div className="min-h-screen bg-[#141414]">
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 font-display tracking-wider text-primary">Free Producer Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Link href="/playlist/edit">
          <Card className="hover:border-primary transition-all cursor-pointer">
            <CardHeader>
              <CardTitle>My Playlists</CardTitle>
              <CardDescription>Manage, edit, delete, add, search, and advanced edit your playlists.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Music2 className="h-8 w-8 text-primary" />
                <span className="font-semibold text-lg">Go to Playlists</span>
              </div>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/mylibrary">
          <Card className="hover:border-primary transition-all cursor-pointer">
            <CardHeader>
              <CardTitle>My Library</CardTitle>
              <CardDescription>Manage your albums, singles, and audio library files.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Package className="h-8 w-8 text-primary" />
                <span className="font-semibold text-lg">Go to Library</span>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-black border-primary hover:border-primary transition-all">
          <CardHeader>
            <CardTitle>Beat Marketplace</CardTitle>
          </CardHeader>
          <CardContent>
            <p>List and sell your beats with 15% commission.</p>
            <Button className="mt-4">Manage Beats</Button>
          </CardContent>
        </Card>
          <Card className="bg-black border-primary hover:border-primary transition-all">
          <CardHeader>
            <CardTitle>Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <p>View basic analytics for your beats.</p>
            <Button className="mt-4">View Analytics</Button>
          </CardContent>
        </Card>
        <Card className="bg-black border-primary hover:border-primary transition-all">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Community Feed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>See what the community is posting and join the conversation.</p>
            <Button className="mt-4" asChild>
              <Link href="/feed">Go to Feed</Link>
            </Button>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  )
}

