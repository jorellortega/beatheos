"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Music, Upload, BarChart, Users, Package } from "lucide-react"

export default function SubscriptionPage() {
  const { toast } = useToast()
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)

  const handleSubscribe = () => {
    if (!selectedPlan) {
      toast({
        title: "No Plan Selected",
        description: "Please select a subscription plan",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Subscription Successful",
      description: `You have successfully subscribed to the ${selectedPlan} plan`,
    })
  }

  return (
    <div className="container max-w-6xl pt-4 pb-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Choose Your Path</h1>
        <p className="text-xl text-gray-400">Select the plan that best fits your creative journey</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-center items-stretch mx-auto max-w-5xl">
        {/* Free Artist Plan */}
        <Card className={`cursor-pointer hover:border-primary transition-all ${selectedPlan === 'free_artist' ? 'border-primary' : ''}`} onClick={() => setSelectedPlan('free_artist')}>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Music className="mr-2 h-5 w-5" />
              Free Artist
            </CardTitle>
            <CardDescription>Perfect for beginners</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-4">Free</div>
            <ul className="space-y-2">
              <li>✓ Basic music creation tools</li>
              <li>✓ Access to free beats</li>
              <li>✓ Community access</li>
              <li>✓ Basic support</li>
            </ul>
          </CardContent>
        </Card>

        {/* Pro Artist Plan */}
        <Card className={`cursor-pointer hover:border-primary transition-all ${selectedPlan === 'pro_artist' ? 'border-primary' : ''}`} onClick={() => setSelectedPlan('pro_artist')}>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="mr-2 h-5 w-5" />
              Pro Artist
            </CardTitle>
            <CardDescription>For serious artists</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-4">$15<span className="text-sm text-muted-foreground">/month</span></div>
            <ul className="space-y-2">
              <li>✓ Advanced beat creation tools</li>
              <li>✓ Unlimited storage</li>
              <li>✓ Beat uploading</li>
              <li>✓ Collaboration features</li>
              <li>✓ Priority support</li>
            </ul>
          </CardContent>
        </Card>

        {/* Free Producer Plan */}
        <Card className={`cursor-pointer hover:border-primary transition-all ${selectedPlan === 'free_producer' ? 'border-primary' : ''}`} onClick={() => setSelectedPlan('free_producer')}>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart className="mr-2 h-5 w-5" />
              Free Producer
            </CardTitle>
            <CardDescription>Start selling your beats</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-4">Free</div>
            <ul className="space-y-2">
              <li>✓ Basic marketplace access</li>
              <li>✓ 15% commission on sales</li>
              <li>✓ Basic analytics</li>
              <li>✓ Community access</li>
            </ul>
          </CardContent>
        </Card>

        {/* Premium Producer Plan */}
        <Card className={`cursor-pointer hover:border-primary transition-all ${selectedPlan === 'premium_producer' ? 'border-primary' : ''}`} onClick={() => setSelectedPlan('premium_producer')}>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Premium Producer
            </CardTitle>
            <CardDescription>For growing producers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-4">$12<span className="text-sm text-muted-foreground">/month</span></div>
            <ul className="space-y-2">
              <li>✓ Lower commission (5%)</li>
              <li>✓ Advanced analytics</li>
              <li>✓ Rhythm Forge access</li>
              <li>✓ Enhanced marketplace</li>
              <li>✓ Priority support</li>
            </ul>
          </CardContent>
        </Card>

        {/* Business Producer Plan */}
        <Card className={`cursor-pointer hover:border-primary transition-all ${selectedPlan === 'business_producer' ? 'border-primary' : ''}`} onClick={() => setSelectedPlan('business_producer')}>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="mr-2 h-5 w-5" />
              Business Producer
            </CardTitle>
            <CardDescription>For professional studios</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-4">$25<span className="text-sm text-muted-foreground">/month</span></div>
            <ul className="space-y-2">
              <li>✓ Full marketplace management</li>
              <li>✓ Promotional tools</li>
              <li>✓ Advanced analytics</li>
              <li>✓ Support features</li>
              <li>✓ Multiple product management</li>
              <li>✓ 24/7 priority support</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 flex justify-center">
        <Button size="lg" onClick={handleSubscribe} disabled={!selectedPlan} className="gradient-button text-black font-medium hover:text-white">
          Subscribe Now
        </Button>
      </div>
    </div>
  )
}

