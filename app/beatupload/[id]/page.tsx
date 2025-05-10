"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { MockBeatUploadForm } from "@/components/beat-upload/MockBeatUploadForm"
import { Draft, mockDrafts, AudioFile, mockAudioFiles } from "@/types/draft"

export default function EditBeatPage({ 
  params,
  searchParams 
}: { 
  params: Promise<{ id: string }>
  searchParams: Promise<{ type?: string }>
}) {
  const router = useRouter()
  const resolvedParams = use(params)
  const resolvedSearchParams = use(searchParams)
  const isAudioFile = resolvedSearchParams?.type === "audio"
  const [draft, setDraft] = useState<Draft | null>(null)
  const [audioFile, setAudioFile] = useState<AudioFile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        if (isAudioFile) {
          const foundAudioFile = mockAudioFiles.find(f => f.id === resolvedParams.id)
          if (foundAudioFile) {
            setAudioFile(foundAudioFile)
          } else {
            router.push("/upload-beat")
          }
        } else {
          const foundDraft = mockDrafts.find(d => d.id === resolvedParams.id)
          if (foundDraft) {
            setDraft(foundDraft)
          } else {
            router.push("/upload-beat")
          }
        }
      } catch (error) {
        console.error("Error loading data:", error)
        router.push("/upload-beat")
      } finally {
        setIsLoading(false)
      }
    }

    if (resolvedParams.id) {
      loadData()
    }
  }, [resolvedParams.id, router, isAudioFile])

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!draft && !audioFile) {
    return null
  }

  const initialData = isAudioFile ? {
    title: audioFile?.title || "",
    description: "",
    tags: [],
    bpm: "",
    key: "",
    file: audioFile?.file || undefined,
    wavFile: audioFile?.wavFile || null,
    stemsFile: audioFile?.stemsFile || null,
    coverArt: audioFile?.coverArt || null,
    licensing: {}
  } : {
    title: draft?.title || "",
    description: draft?.description || "",
    tags: draft?.tags || [],
    bpm: draft?.bpm || "",
    key: draft?.key || "",
    file: undefined,
    wavFile: null,
    stemsFile: null,
    coverArt: null,
    licensing: draft?.licensing || {}
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">
        {isAudioFile ? "Complete Beat Details" : `Edit Beat: ${draft?.title}`}
      </h1>
      <MockBeatUploadForm initialData={initialData} />
    </div>
  )
} 