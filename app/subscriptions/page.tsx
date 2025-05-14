"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"

export default function SubscriptionsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()

  useEffect(() => {
    const success = searchParams.get("success")
    if (success === "true" && user) {
      // Redirect to the user's dashboard based on their role
      router.replace(`/dashboard/${user.role}`)
    }
  }, [searchParams, user, router])

  if (searchParams.get("success") === "true") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <span className="ml-4 text-primary">Redirecting to your dashboard...</span>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-red-500">Subscription not completed or canceled.</div>
    </div>
  )
} 