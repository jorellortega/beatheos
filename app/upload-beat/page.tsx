"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { MockBeatUploadForm } from "@/components/beat-upload/MockBeatUploadForm"
import { AdminControls } from "@/components/beat-upload/AdminControls"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { HelpCircle } from "lucide-react"
import Link from "next/link"

export default function UploadBeatPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push("/login")
    } else {
      // Check if user is admin (this would be a call to your backend in a real app)
      setIsAdmin(user.role === "admin")
    }
  }, [user, router])

  if (!user) {
    return null // or a loading spinner
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold font-display tracking-wider text-primary">Upload Your Beat</h1>
        <Button variant="outline" asChild>
          <Link href="/upload-guidelines">
            <HelpCircle className="mr-2 h-4 w-4" />
            Upload Guidelines
          </Link>
        </Button>
      </div>

      <Card className="w-full bg-card border-primary">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary">Beat Details</CardTitle>
        </CardHeader>
        <CardContent>
          <MockBeatUploadForm />
        </CardContent>
      </Card>

      {isAdmin && (
        <Card className="w-full bg-card border-primary mt-8">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary">Admin Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminControls />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

