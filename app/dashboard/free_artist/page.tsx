"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function FreeArtistDashboard() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user || user.role !== "free_artist") {
      router.push("/login")
    }
  }, [user, router])

  if (!user) return null

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 font-display tracking-wider text-primary">Free Artist Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card border-primary hover:border-primary transition-all">
          <CardHeader>
            <CardTitle>Basic Tools</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Access basic music creation tools here.</p>
            <Button className="mt-4">Explore Tools</Button>
          </CardContent>
        </Card>
        <Card className="bg-card border-primary hover:border-primary transition-all">
          <CardHeader>
            <CardTitle>Upgrade Account</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Upgrade to Pro Artist to unlock beat uploading and more features!</p>
            <Button className="mt-4 gradient-button text-black font-medium hover:text-white">Upgrade Now</Button>
          </CardContent>
        </Card>
        <Card className="bg-card border-primary hover:border-primary transition-all">
          <CardHeader>
            <CardTitle>Recording Studios</CardTitle>
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
            <CardTitle>Artist Collaborations</CardTitle>
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

