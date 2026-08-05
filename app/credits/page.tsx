"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Coins, CreditCard, ArrowUpRight, Loader2, Sparkles } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"

const stripePublishableKey = typeof process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY === "string" && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  : ""
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null

type CreditProduct = { id: string; name: string; credits: number; price_cents: number; sort_order: number }
type Transaction = { id: string; amount: number; balance_after: number; type: string; reference_id: string | null; created_at: string }

function SavePaymentForm({ clientSecret, onSuccess }: { clientSecret: string; onSuccess: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    try {
      const { error } = await stripe.confirmSetup({
        elements,
        confirmParams: { return_url: window.location.origin + "/credits" },
        redirect: "if_required",
      })
      if (error) {
        toast({ title: "Error", description: error.message ?? "Could not save card", variant: "destructive" })
      } else {
        onSuccess()
        toast({ title: "Success", description: "Payment method saved." })
      }
    } catch (err: any) {
      toast({ title: "Error", description: err?.message ?? "Failed", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />
      <Button type="submit" disabled={!stripe || loading} className="w-full">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save card for future purchases"}
      </Button>
    </form>
  )
}

export default function CreditsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, getAccessToken } = useAuth()
  const { toast } = useToast()
  const [balance, setBalance] = useState<number | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [products, setProducts] = useState<CreditProduct[]>([])
  const [actionCosts, setActionCosts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [buyingProductId, setBuyingProductId] = useState<string | null>(null)
  const [setupClientSecret, setSetupClientSecret] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }
  }, [user, router])

  const fetchCredits = async () => {
    const token = await getAccessToken()
    const res = await fetch("/api/credits", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) {
      if (res.status === 401) router.push("/login")
      return
    }
    const data = await res.json()
    const bal = data.balance ?? 0
    const txs = data.transactions ?? []
    setBalance(bal)
    setTransactions(txs)
    setProducts(data.products ?? [])
    setActionCosts(data.actionCosts ?? {})

    if (bal === 0 && txs.length === 0) {
      const bonusRes = await fetch("/api/credits/grant-signup-bonus", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (bonusRes.ok) {
        const refetchRes = await fetch("/api/credits", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (refetchRes.ok) {
          const refetchData = await refetchRes.json()
          setBalance(refetchData.balance ?? 50)
          setTransactions(refetchData.transactions ?? [])
        } else {
          setBalance(50)
          setTransactions((prev) => [
            { id: `signup-bonus-${Date.now()}`, amount: 50, balance_after: 50, type: "signup_bonus", reference_id: null, created_at: new Date().toISOString() },
            ...prev,
          ])
        }
      }
    }
  }

  useEffect(() => {
    if (!user) return
    fetchCredits().finally(() => setLoading(false))
  }, [user?.id])

  useEffect(() => {
    const success = searchParams.get("success")
    const pm = searchParams.get("payment_method")
    if (success === "1") {
      toast({ title: "Purchase complete", description: "Credits have been added to your account." })
      fetchCredits()
      window.history.replaceState({}, "", "/credits")
    }
    if (pm === "saved") {
      toast({ title: "Card saved", description: "You can use it for future credit purchases." })
      setSetupClientSecret(null)
      window.history.replaceState({}, "", "/credits")
    }
  }, [searchParams])

  const handleBuyCredits = async (productId: string) => {
    const token = await getAccessToken()
    setBuyingProductId(productId)
    try {
      const res = await fetch("/api/credits/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ product_id: productId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to create checkout")
      if (data.url) window.location.href = data.url
    } catch (err: any) {
      toast({ title: "Error", description: err.message ?? "Could not start checkout", variant: "destructive" })
    } finally {
      setBuyingProductId(null)
    }
  }

  const handleOpenSavePayment = async () => {
    const token = await getAccessToken()
    const res = await fetch("/api/credits/create-setup-intent", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? "Failed")
    setSetupClientSecret(data.clientSecret)
  }

  if (!user) return null
  if (loading) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#141414] text-white p-4 md:p-8">
      <div className="container max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-primary flex items-center gap-2">
              <Coins className="h-8 w-8" />
              Credits
            </h1>
            <p className="text-gray-400 mt-1">Manage your balance, buy credits, and upgrade your plan.</p>
          </div>
          <Link href="/">
            <Button variant="outline" className="border-primary text-primary hover:bg-primary/10">Home</Button>
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card className="bg-black border-primary">
            <CardHeader>
              <CardTitle className="text-primary flex items-center gap-2">
                <Coins className="h-5 w-5" />
                Your balance
              </CardTitle>
              <CardDescription>Use credits for AI cover, lyrics, and album creation.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary">{balance ?? 0} <span className="text-lg font-normal text-gray-400">credits</span></p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/aicovermaker">
                  <Button variant="outline" size="sm" className="border-primary text-primary">
                    Create cover <span className="text-gray-500 ml-1">({actionCosts.ai_cover ?? 25}/use)</span>
                  </Button>
                </Link>
                <Link href="/lyrics-ai">
                  <Button variant="outline" size="sm" className="border-primary text-primary">
                    AI Lyrics <span className="text-gray-500 ml-1">({actionCosts.ai_lyrics ?? 2}/use)</span>
                  </Button>
                </Link>
                <Link href="/ai-album-creation">
                  <Button variant="outline" size="sm" className="border-primary text-primary">
                    Album titles <span className="text-gray-500 ml-1">({actionCosts.ai_album_titles ?? 5}/use)</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black border-primary">
            <CardHeader>
              <CardTitle className="text-primary flex items-center gap-2">
                <ArrowUpRight className="h-5 w-5" />
                Upgrade plan
              </CardTitle>
              <CardDescription>Get more credits every month with Pro.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 mb-4">Pro includes 500 credits per month and all features.</p>
              <Link href="/subscriptionplans">
                <Button className="w-full bg-primary text-black hover:bg-primary/90">
                  View subscription plans
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-black border-primary mb-8">
          <CardHeader>
            <CardTitle className="text-primary">Buy credits</CardTitle>
            <CardDescription>One-time credit packs. Prices include 75% margin to support the platform.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] p-4 flex flex-col"
                >
                  <p className="font-semibold text-primary">{p.name}</p>
                  <p className="text-2xl font-bold mt-1">${(p.price_cents / 100).toFixed(2)}</p>
                  <p className="text-gray-500 text-sm">{(p.price_cents / 100 / p.credits).toFixed(3)} per credit</p>
                  <Button
                    className="mt-4 bg-primary text-black hover:bg-primary/90"
                    onClick={() => handleBuyCredits(p.id)}
                    disabled={buyingProductId !== null}
                  >
                    {buyingProductId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buy"}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black border-primary mb-8">
          <CardHeader>
            <CardTitle className="text-primary flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment method
            </CardTitle>
            <CardDescription>Save a card for faster credit purchases. Stored securely with Stripe.</CardDescription>
          </CardHeader>
          <CardContent>
            {setupClientSecret ? (
              stripePromise ? (
                <Elements stripe={stripePromise} options={{ clientSecret: setupClientSecret }}>
                  <SavePaymentForm
                    clientSecret={setupClientSecret}
                    onSuccess={() => setSetupClientSecret(null)}
                  />
                </Elements>
              ) : (
                <p className="text-amber-500 text-sm">Stripe is not configured. Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to enable saving cards.</p>
              )
            ) : (
              <Button
                variant="outline"
                className="border-primary text-primary"
                onClick={handleOpenSavePayment}
                disabled={!stripePromise}
              >
                Add or update card
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="bg-black border-primary">
          <CardHeader>
            <CardTitle className="text-primary">Recent activity</CardTitle>
            <CardDescription>Credit additions and usage.</CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-gray-500">No transactions yet.</p>
            ) : (
              <ul className="space-y-2">
                {transactions.map((tx) => (
                  <li key={tx.id} className="flex justify-between items-center py-2 border-b border-[#2a2a2a] last:border-0">
                    <span className="flex items-center gap-2">
                      {tx.amount > 0 ? (
                        <span className="text-green-400">+{tx.amount}</span>
                      ) : (
                        <span className="text-amber-400">{tx.amount}</span>
                      )}
                      <span className="text-gray-400 capitalize">{tx.type.replace(/_/g, " ")}</span>
                    </span>
                    <span className="text-gray-500 text-sm">
                      Balance after: {tx.balance_after} · {new Date(tx.created_at).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
