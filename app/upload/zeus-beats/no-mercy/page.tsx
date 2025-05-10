"use client"

import { useState, useEffect } from 'react'
import { BeatUploadForm } from '@/components/beat-upload/BeatUploadForm'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

export default function UploadNoMercyPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push('/login')
    } else if (user.username !== 'ZeusBeats') {
      router.push('/dashboard')
    } else {
      setIsLoading(false)
    }
  }, [user, router])

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 font-display tracking-wider text-primary">Upload "No Mercy" Beat</h1>
      <Card className="w-full bg-card border-primary">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary">Beat Details</CardTitle>
        </CardHeader>
        <CardContent>
          <BeatUploadForm 
            initialData={{
              title: "No Mercy",
              file: {
                name: "No Mercy.mp3",
                url: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/No%20Mercy%20-HcT4que7ad06o3cGFyOIG61i3DJ6S2.mp3"
              }
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}

