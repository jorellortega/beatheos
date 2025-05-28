'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import jsPDF from 'jspdf'
import { Button } from '@/components/ui/button'

export default function SuccessContent() {
  const searchParams = useSearchParams()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [beat, setBeat] = useState<{ mp3_url?: string; wav_url?: string; stems_url?: string; license_type?: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debug, setDebug] = useState<any>(null)
  const { user, error: authError } = useAuth()
  const [licenseText, setLicenseText] = useState<string | null>(null)
  const [showFullLicense, setShowFullLicense] = useState(false)

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
          if (data.beat) {
            setBeat(data.beat)
            // Generate license text with all placeholders filled
            const buyerName = user?.email?.split('@')[0] || data.guestEmail || 'Artist'
            const producerName = data.beat.producer?.display_name || data.producer?.display_name || 'Producer'
            const beatTitle = data.beat.title || '[Name of Beat]'
            const purchaseDate = new Date().toLocaleDateString()
            const licenseTemplate = getLicenseTemplate(data.beat.license_type)
            const licenseWithNames = licenseTemplate
              .replace(/\[Your Name \/ Producer Name\]/g, producerName)
              .replace(/\[Artist's Name\]/g, buyerName)
              .replace(/\[Name of Beat\]/g, beatTitle)
              .replace(/\[Date\]/g, purchaseDate)
              .replace(/\[Amount\]/g, data.beat.price?.toString() || '0')
            setLicenseText(licenseWithNames)
            setError(null)
          } else {
            setError(data.error || 'Could not fetch beat info')
          }
        })
        .catch((e) => {
          setDebug({ error: e.message })
          setError('Could not fetch beat info')
        })
        .finally(() => setLoading(false))
    }
  }, [searchParams, user])

  // Helper function to get the appropriate license template based on license_type
  const getLicenseTemplate = (licenseType: string | undefined) => {
    switch (licenseType) {
      case 'Lease':
        return LEASE_TERMS
      case 'Premium Lease':
        return PREMIUM_LEASE_TERMS
      case 'Exclusive':
        return EXCLUSIVE_TERMS
      case 'Buy Out':
        return BUYOUT_TERMS
      default:
        return LEASE_TERMS
    }
  }

  // PDF download handler
  const handleDownloadPDF = () => {
    if (!licenseText) return
    const doc = new jsPDF()
    doc.setFont('courier', 'normal')
    doc.setFontSize(10)
    doc.text(licenseText, 10, 20, { maxWidth: 180 })
    doc.save('license-agreement.pdf')
  }

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
      {licenseText && (
        <div className="mt-4 p-4 border rounded bg-secondary/30">
          <h3 className="font-bold mb-2">License Agreement</h3>
          <div className="flex items-center gap-4 mb-2">
            <Button onClick={() => setShowFullLicense(v => !v)} variant="outline" size="sm">
              {showFullLicense ? 'Hide' : 'View'} Full License
            </Button>
            <Button onClick={handleDownloadPDF} variant="secondary" size="sm">
              Download PDF
            </Button>
          </div>
          {showFullLicense ? (
            <pre className="whitespace-pre-wrap text-xs max-h-96 overflow-auto bg-black/60 p-3 rounded border mt-2">{licenseText}</pre>
          ) : (
            <div className="text-xs text-muted-foreground italic">Click 'View Full License' to see the complete agreement.</div>
          )}
        </div>
      )}
      {debug && (
        <pre className="mt-4 p-2 bg-black/60 text-xs rounded border text-white overflow-auto max-h-64">
          {JSON.stringify(debug, null, 2)}
        </pre>
      )}
    </>
  )
}

// License templates
const LEASE_TERMS = `BEAT LICENSE AGREEMENT (LEASE LICENSE)

This Beat License Agreement ("Agreement") is made on [Date], by and between:

Licensor (Producer): [Your Name / Producer Name]
Licensee (Artist): [Artist's Name]

Beat Title: [Name of Beat]
Beat ID/Reference: [Optional - For internal tracking]

---

1. GRANT OF LICENSE

Licensor grants Licensee a non-exclusive, non-transferable, non-sublicensable license to use the Beat for one (1) commercial or non-commercial project (e.g., single, mixtape, EP, or small social media content).

---

2. USAGE RIGHTS

Licensee may:

* Distribute up to 5,000 copies/streams across all platforms
* Perform the song live up to 3 times
* Monetize on streaming platforms (e.g., Spotify, Apple Music, YouTube)
* Create one music video (non-televised)

---

3. RESTRICTIONS

Licensee may NOT:

* Sell or license the Beat to any third party
* Claim ownership or copyright of the Beat
* Use the Beat in TV, film, or large commercial projects without an upgraded license
* Exceed the usage limits (requires upgrade to Premium or Exclusive license)

---

4. DELIVERY

The Beat will be delivered in MP3 format after payment is received.

---

5. CREDIT

Licensee agrees to credit the Licensor in all releases as follows:
"Produced by [Your Name / Producer Name]"

---

6. TERMINATION

If Licensee violates the terms of this Agreement, the license is immediately revoked without refund, and all usage must cease.

---

7. OWNERSHIP

Licensor retains full ownership and copyright of the Beat. This license does not transfer any copyright or ownership to the Licensee.

---

8. PAYMENT

The License Fee for this Lease is $[Amount].

---

9. GOVERNING LAW

This Agreement shall be governed by and interpreted under the laws of [Your State/Country].

---

10. SIGNATURES

By signing below, both parties agree to the terms of this Agreement.

Licensor (Producer): _______________________
Licensee (Artist): _______________________
Date: _______________________
`;

const PREMIUM_LEASE_TERMS = `BEAT LICENSE AGREEMENT (PREMIUM LEASE)

This Beat License Agreement ("Agreement") is made on [Date], by and between:

Licensor (Producer): [Your Name / Producer Name]
Licensee (Artist): [Artist's Name]

Beat Title: [Name of Beat]
Beat ID/Reference: [Optional - For internal tracking]

---

1. GRANT OF LICENSE

Licensor grants Licensee a non-exclusive, non-transferable, non-sublicensable license to use the Beat for one (1) commercial or non-commercial project (e.g., album, EP, mixtape, YouTube content, podcast, or independent film).

---

2. USAGE RIGHTS

Licensee may:

* Distribute unlimited copies/streams across all platforms
* Monetize on streaming platforms (Spotify, Apple Music, YouTube, etc.)
* Use the Beat in one music video (non-televised or YouTube only)
* Perform the song live an unlimited number of times
* Use the Beat in small to mid-sized commercial projects (e.g., ads, promos, sync placements under $10,000 in budget)

---

3. RESTRICTIONS

Licensee may NOT:

* Sell or license the Beat to any third party
* Claim ownership or copyright of the Beat
* Use the Beat in major commercial projects (e.g., films, TV, large-budget advertising campaigns) without an upgraded Exclusive or Buy Out license
* Exceed the scope of this license without written permission

---

4. DELIVERY

The Beat will be delivered in the following formats:
✅ MP3
✅ WAV
✅ Trackouts (Stems)

---

5. CREDIT

Licensee agrees to credit the Licensor in all releases as follows:
"Produced by [Your Name / Producer Name]"

---

6. TERMINATION

If Licensee violates the terms of this Agreement, the license is immediately revoked without refund, and all usage must cease.

---

7. OWNERSHIP

Licensor retains full ownership and copyright of the Beat. This license does not transfer any copyright or ownership to the Licensee.

---

8. PAYMENT

The License Fee for this Premium Lease is $[Amount].

---

9. GOVERNING LAW

This Agreement shall be governed by and interpreted under the laws of [Your State/Country].

---

10. SIGNATURES

By signing below, both parties agree to the terms of this Agreement.

Licensor (Producer): _______________________
Licensee (Artist): _______________________
Date: _______________________
`;

const EXCLUSIVE_TERMS = `BEAT LICENSE AGREEMENT (EXCLUSIVE LICENSE)

This Beat License Agreement ("Agreement") is made on [Date], by and between:

Licensor (Producer): [Your Name / Producer Name]
Licensee (Artist): [Artist's Name]

Beat Title: [Name of Beat]
Beat ID/Reference: [Optional - For internal tracking]

---

1. GRANT OF LICENSE

Licensor grants Licensee an exclusive, non-transferable, non-sublicensable license to use the Beat for one (1) commercial or non-commercial project (e.g., album, single, film, podcast, commercial, or any media).

Upon purchase, the Beat will no longer be available for lease, exclusive, or sale to any other party.

---

2. USAGE RIGHTS

Licensee may:

* Distribute unlimited copies/streams across all platforms
* Monetize on streaming platforms (Spotify, Apple Music, YouTube, etc.)
* Use the Beat in unlimited music videos, films, TV, commercials, podcasts, and live performances
* Retain all master rights for the final song
* Sync the Beat in any project without limitations (budget, reach, or media type)

---

3. RESTRICTIONS

Licensee may NOT:

* Sell, transfer, or sublicense the Beat as-is (e.g., reselling the Beat for profit)
* Claim the underlying composition copyright of the Beat (unless a full Buy Out is purchased)

---

4. DELIVERY

The Beat will be delivered in the following formats:
✅ MP3
✅ WAV
✅ Trackouts (Stems)

Additional files (e.g., project files) available upon request.

---

5. CREDIT

Licensee agrees to credit the Licensor in all releases as follows:
"Produced by [Your Name / Producer Name]"

---

6. OWNERSHIP & COPYRIGHT

Licensor retains copyright ownership of the Beat (the musical composition and underlying work).
Licensee holds exclusive rights to commercially exploit the Beat as per this Agreement.

This is a license, not a copyright transfer. If full copyright transfer is desired, a separate Buy Out agreement must be executed.

---

7. PAYMENT

The License Fee for this Exclusive License is $[Amount].

---

8. GOVERNING LAW

This Agreement shall be governed by and interpreted under the laws of [Your State/Country].

---

9. SIGNATURES

By signing below, both parties agree to the terms of this Agreement.

Licensor (Producer): _______________________
Licensee (Artist): _______________________
Date: _______________________
`;

const BUYOUT_TERMS = `BEAT LICENSE AGREEMENT (BUY OUT / FULL RIGHTS LICENSE)

This Beat License Agreement ("Agreement") is made on [Date], by and between:

Licensor (Producer): [Your Name / Producer Name]
Licensee (Artist): [Artist's Name]

Beat Title: [Name of Beat]
Beat ID/Reference: [Optional - For internal tracking]

---

1. GRANT OF LICENSE & FULL RIGHTS TRANSFER

Licensor agrees to sell and transfer to Licensee all rights, title, and interest in and to the Beat, including but not limited to:

* Full copyright ownership
* All publishing rights
* All master rights
* All reproduction, distribution, and modification rights

This is a permanent, one-time transfer. The Licensor relinquishes all rights to the Beat upon completion of payment.

---

2. USAGE RIGHTS

Licensee may:

* Use, distribute, modify, and monetize the Beat without limitation
* Claim full ownership of the Beat in any form (e.g., as part of a song, instrumental, soundtrack, film, advertisement, video game, etc.)
* Resell, license, or sublicense the Beat at their discretion
* Register the Beat with any copyright office, PRO, or sync platform as their own

---

3. DELIVERY

The Beat will be delivered in the following formats:
✅ MP3
✅ WAV
✅ Trackouts (Stems)
✅ Project Files (if available)

All original materials associated with the Beat will be transferred upon request.

---

4. CREDIT

Credit to the Licensor is not required, but is appreciated when reasonable. Suggested credit:
"Produced by [Your Name / Producer Name]"

---

5. PAYMENT

The total fee for this Buy Out License is $[Amount].

Full payment is required before transfer of rights. No refunds will be issued after delivery of files.

---

6. REPRESENTATIONS

Licensor guarantees that the Beat is original, free of third-party samples requiring clearance (unless otherwise disclosed in writing), and that the Licensor has full rights to sell and transfer ownership.

---

7. GOVERNING LAW

This Agreement shall be governed by and interpreted under the laws of [Your State/Country].

---

8. SIGNATURES

By signing below, both parties agree to the terms of this Agreement and acknowledge the transfer of full ownership rights.

Licensor (Producer): _______________________
Licensee (Artist): _______________________
Date: _______________________
`;

