"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function MyBeatsPage() {
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
      <h1 className="text-4xl font-bold mb-8 font-display tracking-wider text-primary">My Beats</h1>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Your Beat Collection</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">As a free artist, you can browse and favorite beats from our marketplace.</p>
          <Button className="gradient-button text-black font-medium hover:text-white">Explore Beats Marketplace</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Upgrade to Pro</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">Upgrade to a Pro Artist account to start uploading and selling your own beats!</p>
          <Button className="gradient-button text-black font-medium hover:text-white">Upgrade Now</Button>
        </CardContent>
      </Card>
    </div>
  )
}

