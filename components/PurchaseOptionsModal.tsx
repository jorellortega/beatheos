"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { X } from "lucide-react"
import { loadStripe } from '@stripe/stripe-js'
import { useAuth } from "@/contexts/AuthContext"

interface PurchaseOptionsModalProps {
  isOpen: boolean
  onClose: () => void
  beat: {
    id: string | number
    title: string
    price: number
    price_lease?: number
    price_premium_lease?: number
    price_exclusive?: number
    price_buyout?: number
  } | null
}

const licenseOptions = [
  { id: 'lease', label: 'Lease License', priceKey: 'price_lease' },
  { id: 'premium', label: 'Premium Lease License', priceKey: 'price_premium_lease' },
  { id: 'exclusive', label: 'Exclusive License', priceKey: 'price_exclusive' },
  { id: 'buyout', label: 'Buy Out License', priceKey: 'price_buyout' },
]

export function PurchaseOptionsModal({ isOpen, onClose, beat }: PurchaseOptionsModalProps) {
  const { toast } = useToast()
  const { user } = useAuth();
  const [selectedLicense, setSelectedLicense] = useState('lease')
  const [price, setPrice] = useState(0)
  const [guestEmail, setGuestEmail] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (beat && selectedLicense) {
      const option = licenseOptions.find(opt => opt.id === selectedLicense)
      setPrice(option && beat[option.priceKey as keyof typeof beat] ? Number(beat[option.priceKey as keyof typeof beat]) : 0)
    }
  }, [beat, selectedLicense])

  const handlePurchase = async () => {
    if (!beat) return
    console.log('[DEBUG] handlePurchase beat:', beat)
    if (!user && !guestEmail) {
      toast({ title: 'Error', description: 'Please enter your email to continue', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const payload = {
        beatId: String(beat.id),
        licenseType: selectedLicense,
        price,
        productName: beat.title,
        userId: user ? user.id : null,
        guestEmail: !user ? guestEmail : null
      }
      console.log('[DEBUG] handlePurchase payload:', payload)
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        toast({ title: 'Stripe Error', description: data.error || 'Could not start checkout', variant: 'destructive' })
      }
    } catch (e) {
      toast({ title: 'Stripe Error', description: 'Could not start checkout', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  if (!beat) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black border-none sm:rounded-lg p-6">
        <DialogTitle className="text-2xl font-bold mb-6">Purchase</DialogTitle>
        <div className="space-y-6">
          <div>
            <label className="block mb-2 font-semibold">Choose License</label>
            <select
              className="w-full p-2 rounded bg-secondary text-white"
              tabIndex={-1}
              value={selectedLicense}
              onChange={e => setSelectedLicense(e.target.value as string)}
            >
              {licenseOptions.filter(opt => {
                const priceValue = beat[opt.priceKey as keyof typeof beat];
                return priceValue && Number(priceValue) > 0;
              }).map(opt => {
                const priceValue = beat[opt.priceKey as keyof typeof beat];
                return (
                  <option key={opt.id} value={opt.id}>
                    {opt.label} - ${priceValue}
                  </option>
                );
              })}
            </select>
          </div>
          {!user && (
            <div>
              <label className="block mb-2 font-semibold">Guest Email</label>
              <input
                type="email"
                className="w-full p-2 rounded bg-secondary text-white"
                value={guestEmail}
                onChange={e => setGuestEmail(e.target.value)}
                placeholder="Enter your email"
              />
            </div>
          )}
          <div className="text-xl">Price: ${price}</div>
          <Button 
            onClick={handlePurchase} 
            className="w-full bg-[#FFD700] hover:bg-[#FFE55C] text-black font-semibold py-6 text-lg rounded-lg"
            disabled={loading || !price}
          >
            {loading ? 'Redirecting...' : 'Checkout'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

