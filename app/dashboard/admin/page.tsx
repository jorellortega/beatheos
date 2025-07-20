"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Music, BarChart, Settings, Music2 } from "lucide-react"
import Link from "next/link"
import { supabase } from '@/lib/supabaseClient'

export default function AdminDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [playlistId, setPlaylistId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== "admin") {
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
      <h1 className="text-4xl font-bold mb-8 font-display tracking-wider text-primary">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-black border-primary hover:border-primary transition-all">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              User Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Manage user accounts and permissions.</p>
            <Button className="mt-4" asChild>
              <Link href="/dashboard/admin/users">Manage Users</Link>
            </Button>
          </CardContent>
        </Card>
          <Card className="bg-black border-primary hover:border-primary transition-all">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Music className="mr-2 h-5 w-5" />
              Content Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Manage beats and content moderation.</p>
            <Button className="mt-4" asChild>
              <Link href="/dashboard/admin/content">Manage Content</Link>
            </Button>
          </CardContent>
        </Card>
          <Card className="bg-black border-primary hover:border-primary transition-all">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart className="mr-2 h-5 w-5" />
              Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>View platform analytics and reports.</p>
            <Button className="mt-4">View Analytics</Button>
          </CardContent>
        </Card>
          <Card className="bg-black border-primary hover:border-primary transition-all">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              System Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Manage system configuration and settings.</p>
            <Button className="mt-4" asChild>
              <Link href="/dashboard/admin/settings">System Settings</Link>
            </Button>
          </CardContent>
        </Card>
          <Card className="bg-black border-primary hover:border-primary transition-all">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Music2 className="mr-2 h-5 w-5" />
              Genre Tempo Manager
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Manage genre and subgenre tempo ranges.</p>
            <Button className="mt-4" asChild>
              <Link href="/dashboard/admin/genre-tempo">Tempo Manager</Link>
            </Button>
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
        {playlistId && (
          <Link href="/playlist/edit" className="block mb-8">
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
        )}
      </div>
    </div>
  )
} 