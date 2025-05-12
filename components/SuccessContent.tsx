'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function SuccessContent() {
  const searchParams = useSearchParams()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [beat, setBeat] = useState<{ mp3_url?: string; wav_url?: string; stems_url?: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const id = searchParams.get('session_id')
    setSessionId(id)
    if (id) {
      setLoading(true)
      fetch('/api/stripe/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: id })
      })
        .then(res => res.json())
        .then(data => {
          if (data.beat) setBeat(data.beat)
          else setError(data.error || 'Could not fetch beat info')
        })
        .catch(() => setError('Could not fetch beat info'))
        .finally(() => setLoading(false))
    }
  }, [searchParams])

  return (
    <>
      <p className="mb-4">Thank you for your purchase. Your transaction was successful.</p>
      {sessionId && (
        <div className="mb-4 break-all" style={{ maxWidth: '100%' }}>
          <span className="text-xs text-gray-400 block" style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}>
            Session ID:<br />{sessionId}
          </span>
        </div>
      )}
      {loading && <p>Loading your download...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {beat && (
        <div className="mt-4 space-y-2">
          {beat.mp3_url && (
            <a href={beat.mp3_url} download="beat.mp3" className="block text-primary underline font-semibold text-lg">
              Download MP3
            </a>
          )}
          {beat.wav_url && (
            <a href={beat.wav_url} download="beat.wav" className="block text-primary underline font-semibold text-lg">
              Download WAV
            </a>
          )}
          {beat.stems_url && (
            <a href={beat.stems_url} download="beat-stems.zip" className="block text-primary underline font-semibold text-lg">
              Download Stems
            </a>
          )}
        </div>
      )}
    </>
  )
}

