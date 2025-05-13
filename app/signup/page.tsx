"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SubscriptionDropdown } from "@/components/SubscriptionDropdown"
import Link from "next/link"
import { toast } from "@/components/ui/use-toast"

export default function SignupPage() {
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [subscription, setSubscription] = useState("")
  const { signup } = useAuth()
  const router = useRouter()

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
    try {
      const user = await signup(email, password, username, role)
      if (user) {
        toast({
          title: "Signup Successful",
          description: "Your account has been created. Welcome to Beatheos!",
        })
        router.push(`/dashboard/${user.role}`)
      } else {
        throw new Error("Failed to create user")
      }
    } catch (error) {
      console.error("Signup failed:", error)
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

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-50 pointer-events-auto" style={{backdropFilter: 'blur(2px)'}}>
        <h2 className="text-3xl font-bold text-white mb-2">Coming Soon</h2>
        <p className="text-lg text-gray-200">Sign up will be available soon.</p>
      </div>
      <div className="opacity-40 pointer-events-none">
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
              <SubscriptionDropdown onSubscriptionChange={setSubscription} />
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
      </div>
    </div>
  )
}

