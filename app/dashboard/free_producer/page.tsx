"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function FreeProducerDashboard() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user || user.role !== "free_producer") {
      router.push("/login")
    }
  }, [user, router])

  if (!user) return null

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 font-display tracking-wider text-primary">Free Producer Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card border-primary hover:border-primary transition-all">
          <CardHeader>
            <CardTitle>Beat Marketplace</CardTitle>
          </CardHeader>
          <CardContent>
            <p>List and sell your beats with 15% commission.</p>
            <Button className="mt-4">Manage Beats</Button>
          </CardContent>
        </Card>
        <Card className="bg-card border-primary hover:border-primary transition-all">
          <CardHeader>
            <CardTitle>Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <p>View basic analytics for your beats.</p>
            <Button className="mt-4">View Analytics</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

