"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import Link from "next/link"

const tiers = [
  {
    name: "Artist Account",
    id: "artist_free",
    role: "free_artist",
    price: "0",
    features: [
      "Community access",
      "Basic profile customization",
      "Create sessions",
      "Purchase beats",
      "Save purchased beats",
    ],
    buttonText: "Get Started",
    buttonVariant: "outline",
    popular: false,
    subtext: "free to sign up",
  },
  {
    name: "Premium Producer",
    id: "producer_premium",
    role: "premium_producer",
    price: "12",
    description: "For growing producers",
    features: [
      "Upload up to 20 beats",
      "Enhanced analytics",
      "Priority support",
      "Basic promotion tools",
      "Royalty-free samples",
      "Advanced profile customization",
      "Premium beat licensing",
      "Basic collaboration tools",
    ],
    buttonText: "Upgrade to Premium",
    buttonVariant: "default",
    popular: true,
  },
  {
    name: "Pro Artist",
    id: "artist_pro",
    role: "pro_artist",
    price: "15",
    description: "For professional artists",
    features: [
      "Unlimited beat uploads",
      "Advanced analytics",
      "Priority support",
      "Custom branding",
      "Promotion tools",
      "Royalty-free samples",
      "Artist collaboration tools",
      "Premium beat licensing",
      "Custom domain support",
      "API access",
    ],
    buttonText: "Upgrade to Pro",
    buttonVariant: "default",
    popular: false,
  },
  {
    name: "Business Producer",
    id: "producer_business",
    role: "business_producer",
    price: "25",
    description: "For professional studios",
    features: [
      "Advanced analytics (Total Beats, Total Plays, Top Beats)",
      "Quick upload (Upload new content)",
      "Recording sessions management",
      "Full beat management (edit, delete, bulk actions, cover art, pricing, tags)",
      "Promo tools (enable/disable promo, item promo)",
      "Priority support",
      "Support tab access",
    ],
    buttonText: "Upgrade to Business",
    buttonVariant: "default",
    popular: false,
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {tiers.map((tier) => {
            const isDisabled = tier.name === "Pro Artist" || tier.name === "Premium Producer";
            const cardContent = (
              <Card
                className={`bg-black border-primary hover:border-yellow-400 transition-all relative ${tier.popular ? 'border-2' : ''} ${isDisabled ? 'opacity-50 pointer-events-none' : ''}`}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-primary text-black px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-primary">{tier.name}</CardTitle>
                  <div className="mt-4">
                    {tier.name === "Artist Account" ? null : (
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
                    disabled={isDisabled}
                  >
                    {tier.buttonText}
                  </Button>
                </CardFooter>
              </Card>
            );
            if (isDisabled) {
              return <div key={tier.id}>{cardContent}</div>;
            }
            return (
              <Link key={tier.id} href={`/signup?plan=${tier.id}`} className="block group">
                {cardContent}
            </Link>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-4 text-primary">Need a Custom Plan?</h2>
          <p className="text-gray-400 mb-6">
            Contact us for custom enterprise solutions and special requirements.
          </p>
          <Link href="/contact">
            <Button variant="outline" className="gradient-button">
              Contact Sales
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
} 