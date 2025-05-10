"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

// Mock data - replace with actual API calls
const mockBeatAds = [
  {
    id: 1,
    title: "50% OFF All Trap Beats",
    producer: "TrapMaster",
    description: "Limited time offer - All trap beats half price!",
    expiryDate: "2024-04-30",
  },
  {
    id: 2,
    title: "Buy 2 Get 1 Free",
    producer: "BeatKing",
    description: "Purchase any two beats and get one free of equal or lesser value",
    expiryDate: "2024-05-15",
  },
]

const mockBeatRequests = [
  {
    id: 1,
    title: "Looking for Dark Trap Beat",
    artist: "Artist123",
    genre: "Trap",
    budget: "$200-500",
    deadline: "2024-04-20",
    submissions: 3,
  },
  {
    id: 2,
    title: "R&B Soul Type Beat Needed",
    artist: "SoulSinger",
    genre: "R&B",
    budget: "$300-700",
    deadline: "2024-04-25",
    submissions: 5,
  },
]

const mockBeatDeals = [
  {
    id: 1,
    title: "Summer Vibes Beat Pack",
    producer: "SummerBeats",
    price: 99.99,
    originalPrice: 199.99,
    description: "Pack of 5 summer-themed beats",
    genre: "Pop",
  },
  {
    id: 2,
    title: "Hip Hop Essentials",
    producer: "BeatMaster",
    price: 149.99,
    originalPrice: 299.99,
    description: "Collection of 10 premium hip hop beats",
    genre: "Hip Hop",
  },
]

export default function BeatDealsPage() {
  return (
    <main className="container mx-auto px-4 py-24">
      {/* Featured Beat Ads Section */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-6 font-display text-primary">Featured Beat Deals & Ads</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mockBeatAds.map((ad) => (
            <Card key={ad.id} className="bg-card border-primary">
              <CardHeader>
                <CardTitle className="text-xl font-bold">{ad.title}</CardTitle>
                <CardDescription>By {ad.producer}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-4">{ad.description}</p>
                <div className="flex justify-between items-center">
                  <Badge variant="secondary">Expires: {ad.expiryDate}</Badge>
                  <Button className="gradient-button">View Deal</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Beat Requests Section */}
      <section className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold font-display text-primary">Active Beat Requests</h2>
          <Button className="gradient-button">
            <Link href="/dashboard/beat-requests/create">Post a Request</Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mockBeatRequests.map((request) => (
            <Card key={request.id} className="bg-card border-primary">
              <CardHeader>
                <CardTitle className="text-xl font-bold">{request.title}</CardTitle>
                <CardDescription>Posted by {request.artist}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-400">Genre</p>
                    <p>{request.genre}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Budget</p>
                    <p>{request.budget}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Deadline</p>
                    <p>{request.deadline}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Submissions</p>
                    <p>{request.submissions} beats</p>
                  </div>
                </div>
                <Button className="w-full gradient-button">Submit Beat</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Beat Deals Section */}
      <section>
        <h2 className="text-3xl font-bold mb-6 font-display text-primary">Special Beat Deals</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockBeatDeals.map((deal) => (
            <Card key={deal.id} className="bg-card border-primary">
              <CardHeader>
                <CardTitle className="text-xl font-bold">{deal.title}</CardTitle>
                <CardDescription>By {deal.producer}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <p className="text-sm text-gray-400">Genre: {deal.genre}</p>
                  <p className="text-sm mb-2">{deal.description}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-primary">${deal.price}</span>
                    <span className="text-lg line-through text-gray-400">${deal.originalPrice}</span>
                  </div>
                </div>
                <Button className="w-full gradient-button">Get This Deal</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  )
} 