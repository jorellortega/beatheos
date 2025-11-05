"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import Header from '@/components/header'
import Link from 'next/link'
import { Library } from 'lucide-react'

interface Producer {
  id: string
  name: string
  image: string
  bio: string
  genre: string
  prices: {
    lease: number
    premiumLease: number
    exclusive: number
    buyout: number
  }
}

export default function ProducerDashboardPage() {
  const [producer, setProducer] = useState<Producer>({
    id: '1',
    name: 'ZeusBeats',
    image: '/placeholder.svg',
    bio: 'Crafting celestial rhythms from Mount Olympus.',
    genre: 'Electro-Olympian',
    prices: {
      lease: 29.99,
      premiumLease: 49.99,
      exclusive: 199.99,
      buyout: 499.99
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Here you would typically send the updated producer data to your backend
    console.log('Updated producer:', producer)
    toast({
      title: "Profile Updated",
      description: "Your profile has been successfully updated.",
    })
  }

  const handlePriceChange = (licenseType: keyof Producer['prices'], value: string) => {
    setProducer(prev => ({
      ...prev,
      prices: {
        ...prev.prices,
        [licenseType]: parseFloat(value) || 0
      }
    }))
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Producer Dashboard</h1>
          <Link href="/mylibrary">
            <Button variant="outline" className="bg-primary text-black hover:bg-primary/90">
              <Library className="h-4 w-4 mr-2" />
              My Library
            </Button>
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
            <CardDescription>Update your producer profile information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input 
                  id="name" 
                  value={producer.name} 
                  onChange={(e) => setProducer({...producer, name: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="image">Image URL</Label>
                <Input 
                  id="image" 
                  value={producer.image} 
                  onChange={(e) => setProducer({...producer, image: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea 
                  id="bio" 
                  value={producer.bio} 
                  onChange={(e) => setProducer({...producer, bio: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="genre">Genre</Label>
                <Input 
                  id="genre" 
                  value={producer.genre} 
                  onChange={(e) => setProducer({...producer, genre: e.target.value})}
                />
              </div>
              <div>
                <Label>License Prices</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="lease">Lease</Label>
                    <Input 
                      id="lease" 
                      type="number" 
                      value={producer.prices.lease} 
                      onChange={(e) => handlePriceChange('lease', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="premiumLease">Premium Lease</Label>
                    <Input 
                      id="premiumLease" 
                      type="number" 
                      value={producer.prices.premiumLease} 
                      onChange={(e) => handlePriceChange('premiumLease', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="exclusive">Exclusive</Label>
                    <Input 
                      id="exclusive" 
                      type="number" 
                      value={producer.prices.exclusive} 
                      onChange={(e) => handlePriceChange('exclusive', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="buyout">Buyout</Label>
                    <Input 
                      id="buyout" 
                      type="number" 
                      value={producer.prices.buyout} 
                      onChange={(e) => handlePriceChange('buyout', e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <Button type="submit" className="gradient-button text-black font-medium hover:text-white">Save Changes</Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </>
  )
}

