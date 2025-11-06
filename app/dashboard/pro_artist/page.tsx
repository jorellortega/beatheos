"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Music2, Users, User, Package, Library, CreditCard, Sparkles } from "lucide-react"

export default function ProArtistDashboardPage() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push("/login")
    }
  }, [user, router])

  if (!user) return null

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 font-display tracking-wider text-primary">Pro Artist Dashboard</h1>
          <p className="text-xl text-gray-400">Welcome back, {user?.email?.split('@')[0]}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/payments">
            <Button variant="outline" className="bg-primary text-black hover:bg-primary/90">
              <CreditCard className="h-4 w-4 mr-2" />
              Payments
            </Button>
          </Link>
          <Link href="/mylibrary">
            <Button variant="outline" className="bg-primary text-black hover:bg-primary/90">
              <Library className="h-4 w-4 mr-2" />
              My Library
            </Button>
          </Link>
        </div>
      </div>

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-card border-primary hover:border-primary transition-all">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary">Browse Beats</CardTitle>
            <CardDescription>Explore our collection of high-quality beats</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/beats">
              <Button className="w-full gradient-button text-black font-medium hover:text-white">
                Browse Beats
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-card border-primary hover:border-primary transition-all">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary">Request Custom Beat</CardTitle>
            <CardDescription>Get a beat made specifically for your project</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/artist/request-beat">
              <Button className="w-full gradient-button text-black font-medium hover:text-white">
                Request Beat
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-card border-primary hover:border-primary transition-all">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary">My Purchases</CardTitle>
            <CardDescription>View and download your purchased beats</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/artist/purchases">
              <Button className="w-full gradient-button text-black font-medium hover:text-white">
                View Purchases
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-card border-primary hover:border-primary transition-all">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Community Feed
            </CardTitle>
            <CardDescription>See what the community is posting and join the conversation.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/feed">
              <Button className="w-full gradient-button text-black font-medium hover:text-white">
                Go to Feed
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-card border-primary hover:border-primary transition-all">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary flex items-center">
              <User className="mr-2 h-5 w-5" />
              Artist Profile
            </CardTitle>
            <CardDescription>View and manage your public artist profile page.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/artist/${user?.username?.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-') || 'my-profile'}`}>
              <Button className="w-full gradient-button text-black font-medium hover:text-white">
                View My Profile
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-card border-primary hover:border-primary transition-all">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary flex items-center">
              <Sparkles className="mr-2 h-5 w-5" />
              Lyrics AI
            </CardTitle>
            <CardDescription>Create, edit, and enhance your lyrics with AI-powered tools.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/lyrics-ai">
              <Button className="w-full gradient-button text-black font-medium hover:text-white">
                Go to Lyrics AI
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

