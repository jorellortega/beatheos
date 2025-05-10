"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import FreeArtistDashboard from "../free_artist/page"
import ProArtistDashboard from "../pro_artist/page"
import FreeProducerDashboard from "../free_producer/page"
import PremiumProducerDashboard from "../premium_producer/page"
import BusinessProducerDashboard from "../business_producer/page"
import AdminDashboard from "../admin/page"

export default function DynamicDashboard({ params }: { params: Promise<{ role: string }> }) {
  const resolvedParams = use(params)
  const { user } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) {
        router.push("/login")
      return
      }
    if (user.role !== resolvedParams.role) {
      router.push("/login")
      return
    }
    setIsLoading(false)
  }, [user, router, resolvedParams.role])

  if (isLoading) return <div>Loading...</div>
  if (!user) return null

  switch (resolvedParams.role) {
    case "free_artist": return <FreeArtistDashboard />
    case "pro_artist": return <ProArtistDashboard />
    case "free_producer": return <FreeProducerDashboard />
    case "premium_producer": return <PremiumProducerDashboard />
    case "business_producer": return <BusinessProducerDashboard />
    case "admin": return <AdminDashboard />
    default:
      useEffect(() => { router.push("/login") }, [router])
      return null
  }
}

