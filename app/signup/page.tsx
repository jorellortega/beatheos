"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SubscriptionDropdown } from "@/components/SubscriptionDropdown"
import Link from "next/link"
import { toast } from "@/components/ui/use-toast"
import { subscriptionOptions } from "@/components/SubscriptionDropdown"

function CreatingAccount({ email }: { email: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-6"></div>
      <div className="text-2xl font-bold text-primary mb-2">Creating your account…</div>
      <div className="text-gray-400 mb-4">We're setting things up for <span className="text-white font-semibold">{email}</span>. This may take a few moments.</div>
    </div>
  )
}

function SignupForm() {
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [subscription, setSubscription] = useState("")
  const [mounted, setMounted] = useState(false)
  const { signup } = useAuth()
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [createdEmail, setCreatedEmail] = useState("")

  const freePlans = ["artist_free", "producer_free"];

  useEffect(() => {
    setMounted(true)
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const plan = params.get("plan") || ""
      setSubscription((prev) => {
        if (!prev && plan) {
          console.log("Detected plan (set once):", plan)
          return plan
        }
        return prev
      })
    }
  }, [])

  useEffect(() => {
    console.log('subscription state updated:', subscription)
  }, [subscription])

  // Map subscription value to role
  const getRoleFromSubscription = (sub: string) => {
    switch (sub) {
      case "artist_free": return "free_artist"
      case "artist_pro": return "pro_artist"
      case "producer_free": return "free_producer"
      case "producer_premium": return "premium_producer"
      case "producer_business": return "business_producer"
      default: return "free_artist" // fallback if not selected
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const role = getRoleFromSubscription(subscription)
    const isFree = freePlans.includes(subscription)
    const subscriptionStatus = isFree ? "active" : "pending"

    try {
      setCreating(true)
      setCreatedEmail(email)
      if (typeof window !== 'undefined') localStorage.setItem('signup-in-progress', '1')
      // 1. Create user in Supabase Auth and DB (this now also inserts into users table)
      const user = await signup(email, password, username, role, subscription, subscriptionStatus)
      if (!user) throw new Error("Failed to create user")
      if (typeof window !== 'undefined') localStorage.removeItem('signup-in-progress')
        toast({
          title: "Signup Successful",
          description: "Your account has been created. Welcome to Beatheos!",
        })
        if (isFree) {
          if (user.role === 'free_artist') {
            router.push('/dashboard/artist')
          } else {
            router.push(`/dashboard/${user.role}`)
          }
        } else {
          // Paid plan: redirect to Stripe checkout
          const res = await fetch("/api/create-checkout-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user.id, plan: subscription }),
          })
          const { url } = await res.json()
          window.location.href = url
      }
    } catch (error) {
      setCreating(false)
      if (typeof window !== 'undefined') localStorage.removeItem('signup-in-progress')
      let errorMessage = "An unexpected error occurred during signup."
      if (error instanceof Error) {
        if (error.message.includes("Username already taken")) {
          errorMessage = "This username is already taken. Please choose another one."
        } else if (error.message.includes("User already registered")) {
          errorMessage = "This email is already registered. Please try logging in instead."
        } else if (error.message.includes("Password should be at least 6 characters")) {
          errorMessage = "Password must be at least 6 characters long."
        } else {
          errorMessage = error.message
        }
      }
      toast({
        title: "Signup Failed",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  if (creating) return <CreatingAccount email={createdEmail} />
  if (!mounted) return null

  return (
    <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-screen">
      <Card className="w-full max-w-md bg-card border-primary">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-primary">Sign up for Beatheos</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300">
                Display Name
              </label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-secondary text-white rounded-md"
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-secondary text-white rounded-md"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-secondary text-white rounded-md"
                required
              />
            </div>
            <div>
              <label htmlFor="subscription" className="block text-sm font-medium text-gray-300">
                Subscription Plan
              </label>
              <SubscriptionDropdown onSubscriptionChange={setSubscription} value={subscription} />
            </div>
            <div className="text-center text-primary font-bold mb-2">
              You are signing up for: {subscriptionOptions.find(opt => opt.value === subscription)?.label || "No plan selected"}
            </div>
            <Button type="submit" className="w-full gradient-button text-black font-medium hover:text-white">
              Sign Up
            </Button>
          </form>
          <p className="mt-4 text-center text-gray-400">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SignupForm />
    </Suspense>
  )
}

