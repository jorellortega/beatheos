"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import Link from "next/link"

const tiers = [
  {
    name: "Free Account",
    id: "artist_free",
    role: "free_artist",
    price: "0",
    features: [
      "1 month free trial with 50 free credits",
      "MP3/MP4 Converter",
      "AI Lyrics",
      "AI Cover Maker",
      "AI Album Creation",
    ],
    buttonText: "Signup Free",
    buttonVariant: "outline",
    popular: false,
    subtext: "1 month free trial with 50 free credits",
  },
  {
    name: "Pro Account",
    id: "artist_pro",
    role: "pro_artist",
    price: "20",
    description: "For professional artists",
    features: [
      "500 credits per month included",
      "MP3/MP4 Converter",
      "AI Lyrics",
      "AI Cover Maker",
      "AI Album Creation",
    ],
    buttonText: "Upgrade to Pro",
    buttonVariant: "default",
    popular: true,
  },
]

export default function SubscriptionPlansPage() {
  return (
    <div className="min-h-screen bg-[#141414] py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-primary">Subscription Plans</h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Choose the perfect plan for your music production journey. All plans include access to our marketplace and community features.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {tiers.map((tier) => {
            const cardContent = (
              <Card
                className={`bg-black border-primary hover:border-yellow-400 transition-all relative ${tier.popular ? 'border-2' : ''}`}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-primary text-black px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-primary">{tier.name}</CardTitle>
                  <div className="mt-4">
                    {tier.name === "Free Account" ? null : (
                      <span className="text-4xl font-bold">${tier.price}</span>
                    )}
                    <div className="text-gray-400 text-base font-medium mb-2">{tier.subtext}</div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start">
                        <Check className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className={`text-sm${feature === 'Create sessions' ? ' text-primary font-semibold' : ''}`}>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant={tier.buttonVariant as "default" | "outline"} 
                    className={`w-full ${tier.popular ? 'gradient-button' : ''}`}
                  >
                    {tier.buttonText}
                  </Button>
                </CardFooter>
              </Card>
            );
            return (
              <Link key={tier.id} href={`/signup?plan=${tier.id}`} className="block group">
                {cardContent}
            </Link>
            );
          })}
        </div>
      </div>
    </div>
  )
} 