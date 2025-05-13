"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import Link from "next/link"

const tiers = [
  {
    name: "Free",
    id: "free",
    price: "0",
    description: "Basic features for casual producers",
    features: [
      "Upload up to 5 beats",
      "Basic analytics",
      "Standard support",
      "Community access",
    ],
    buttonText: "Current Plan",
    buttonVariant: "outline",
  },
  {
    name: "Premium Producer",
    id: "premium_producer",
    price: "12",
    description: "Essential features for growing producers",
    features: [
      "Upload up to 20 beats",
      "Enhanced analytics",
      "Priority support",
      "Basic promotion tools",
      "Royalty-free samples",
    ],
    buttonText: "Upgrade to Premium",
    buttonVariant: "default",
  },
  {
    name: "Pro Artist",
    id: "pro_artist",
    price: "15",
    description: "Professional features for artists",
    features: [
      "Unlimited beat uploads",
      "Advanced analytics",
      "Priority support",
      "Custom branding",
      "Promotion tools",
      "Royalty-free samples",
      "Artist collaboration tools",
    ],
    buttonText: "Upgrade to Pro",
    buttonVariant: "default",
  },
  {
    name: "Business Producer",
    id: "business_producer",
    price: "25",
    description: "Advanced features for professional studios",
    features: [
      "Everything in Pro Artist",
      "Team collaboration",
      "API access",
      "Custom integrations",
      "Dedicated account manager",
      "White-label options",
      "Advanced analytics dashboard",
    ],
    buttonText: "Upgrade to Business",
    buttonVariant: "default",
  },
]

export default function SubscriptionsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const handleSubscribe = (tierId: string) => {
    router.push(`/signup?plan=${tierId}`)
  }

  return (
    <div className="min-h-screen bg-[#141414] py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-primary">Choose Your Plan</h1>
          <p className="text-xl text-gray-400">
            Select the perfect plan for your production needs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {tiers.map((tier) => (
            <Link key={tier.id} href={`/signup?plan=${tier.id}`} className="block group">
              <Card className="bg-black border-primary hover:border-yellow-400 transition-all">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-primary">{tier.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">${tier.price}</span>
                    <span className="text-gray-400">/month</span>
                  </div>
                  <CardDescription className="mt-2">{tier.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-center">
                        <Check className="h-5 w-5 text-primary mr-2" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <span className="w-full text-center font-semibold text-primary group-hover:underline">{tier.buttonText}</span>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
} 