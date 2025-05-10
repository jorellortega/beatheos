"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function PremiumProducerDashboard() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user || user.role !== "premium_producer") {
      router.push("/login")
    }
  }, [user, router])

  if (!user) return null

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 font-display tracking-wider text-primary">Premium Producer Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-card border-primary hover:border-primary transition-all">
          <CardHeader>
            <CardTitle>Beat Marketplace</CardTitle>
          </CardHeader>
          <CardContent>
            <p>List and sell your beats with only 5% commission.</p>
            <Button className="mt-4">Manage Beats</Button>
          </CardContent>
        </Card>
        <Card className="bg-card border-primary hover:border-primary transition-all">
          <CardHeader>
            <CardTitle>Advanced Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Access detailed analytics and insights.</p>
            <Button className="mt-4">View Analytics</Button>
          </CardContent>
        </Card>
        <Card className="bg-card border-primary hover:border-primary transition-all">
          <CardHeader>
            <CardTitle>Rhythm Forge</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Use our advanced beat creation tool.</p>
            <Button className="mt-4">Open Rhythm Forge</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

