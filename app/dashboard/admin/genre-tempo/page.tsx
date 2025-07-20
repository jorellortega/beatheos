"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { GenreTempoManager } from "@/components/GenreTempoManager"

export default function GenreTempoPage() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user || user.role !== "admin") {
      router.push("/login")
    }
  }, [user, router])

  if (!user) return null

  return (
    <div className="min-h-screen bg-[#141414]">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold font-display tracking-wider text-primary mb-2">
            Genre Tempo Manager
          </h1>
          <p className="text-gray-400">
            Manage tempo ranges for genres and subgenres. These ranges will be used when shuffling patterns.
          </p>
        </div>
        
        <GenreTempoManager />
      </div>
    </div>
  )
} 