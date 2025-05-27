'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'

export default function SuccessContent() {
  const searchParams = useSearchParams()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [beat, setBeat] = useState<{ mp3_url?: string; wav_url?: string; stems_url?: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debug, setDebug] = useState<any>(null)
  const { user, error: authError } = useAuth()

  // Force a session re-check after payment
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      // No-op: AuthProvider will sync context if session exists
      if (!session) {
        // Optionally, you could redirect or show an error here
        // window.location.href = '/login';
      }
    })
  }, [])

  useEffect(() => {
    const id = searchParams?.get('session_id') ?? null
    setSessionId(id)
    if (id) {
      setLoading(true)
      fetch('/api/stripe/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: id })
      })
        .then(async res => {
          const data = await res.json()
          setDebug({ status: res.status, data })
          if (data.beat) setBeat(data.beat)
          else setError(data.error || 'Could not fetch beat info')
        })
        .catch((e) => {
          setDebug({ error: e.message })
          setError('Could not fetch beat info')
        })
        .finally(() => setLoading(false))
    }
  }, [searchParams])

  return (
    <>
      <p className="mb-4">Thank you for your purchase. Your transaction was successful.</p>
      {loading && <p>Loading your download...</p>}
      {error && (
        <div>
          <p className="text-red-500">{error}</p>
          <p>Your payment was received, but we're still processing your order. If your download link doesn't appear soon, please contact support.</p>
        </div>
      )}
      {beat && (
        <div className="mt-4 space-y-2">
          {beat.mp3_url && (
            <a href={beat.mp3_url} download className="block text-primary underline font-semibold text-lg">
              Download MP3
            </a>
          )}
          {beat.wav_url && (
            <a href={beat.wav_url} download className="block text-primary underline font-semibold text-lg">
              Download WAV
            </a>
          )}
          {beat.stems_url && (
            <a href={beat.stems_url} download className="block text-primary underline font-semibold text-lg">
              Download Stems
            </a>
          )}
        </div>
      )}
    </>
  )
}

