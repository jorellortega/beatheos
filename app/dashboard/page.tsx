"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import { BarChart, Users, Music, Headphones, Upload } from "lucide-react"
import { MediaManagement } from "@/components/dashboard/MediaManagement"

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({
    totalPlays: 0,
    followers: 0,
    beatsUploaded: 0,
    earnings: 0,
  })

  useEffect(() => {
    if (!user) {
      router.push("/login")
    } else {
      // Fetch user stats (mock data for now)
      setStats({
        totalPlays: 15000,
        followers: 500,
        beatsUploaded: 25,
        earnings: 1250,
      })
    }
  }, [user, router])

  if (!user) {
    return null
  }

  const username = user.email.split('@')[0]

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 font-display tracking-wider text-primary">
        Welcome, {username}!
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-card border-primary">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Plays</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPlays.toLocaleString()}</div>
            <Progress value={75} className="mt-2" />
          </CardContent>
        </Card>
        <Card className="bg-card border-primary">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Followers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.followers.toLocaleString()}</div>
            <Progress value={60} className="mt-2" />
          </CardContent>
        </Card>
        <Card className="bg-card border-primary">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Beats Uploaded</CardTitle>
            <Music className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.beatsUploaded}</div>
            <Progress value={40} className="mt-2" />
          </CardContent>
        </Card>
        <Card className="bg-card border-primary">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Earnings</CardTitle>
            <Headphones className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.earnings.toLocaleString()}</div>
            <Progress value={80} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      <MediaManagement />

      <Button className="gradient-button text-black font-medium hover:text-white mt-8">
        <Link href={`/producers/${username}`}>View My Profile</Link>
      </Button>
      <div className="mt-8">
        <Button className="w-full h-16 text-xl gradient-button text-black font-medium hover:text-white">
          <Link href="/upload-beat" className="flex items-center justify-center w-full h-full">
            <Upload className="mr-2 h-6 w-6" />
            Upload Beats
          </Link>
        </Button>
      </div>
    </div>
  )
}

