'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function SuccessContent() {
  const searchParams = useSearchParams()
  const [sessionId, setSessionId] = useState<string | null>(null)

  useEffect(() => {
    setSessionId(searchParams.get('session_id'))
  }, [searchParams])

  return (
    <>
      <p className="mb-4">Thank you for your purchase. Your transaction was successful.</p>
      {sessionId && <p className="mb-4">Session ID: {sessionId}</p>}
    </>
  )
}

