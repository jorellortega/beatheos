"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

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
            <CardTitle className="text-2xl font-bold text-primary">Recording Studios</CardTitle>
            <CardDescription>Post and manage your recording studios</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/recordingstudios">
              <Button className="w-full gradient-button text-black font-medium hover:text-white">
                Go to Recording Studios
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-card border-primary hover:border-primary transition-all">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary">Artist Collaborations</CardTitle>
            <CardDescription>Collaborate with other artists</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/features">
              <Button className="w-full gradient-button text-black font-medium hover:text-white">
                Go to Collaborations
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

