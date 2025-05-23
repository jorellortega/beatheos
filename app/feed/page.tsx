"use client";

import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Mock feed data
const mockFeed = [
  {
    id: 1,
    user: {
      name: "Jorell Ortega",
      role: "Producer",
      avatar: "/placeholder.svg",
    },
    content: "Just dropped a new beat pack! Check it out on my profile.",
    timestamp: "2 hours ago",
  },
  {
    id: 2,
    user: {
      name: "Ava Smith",
      role: "Artist",
      avatar: "/placeholder.svg",
    },
    content: "Looking for a producer to collab on a summer project! DM me.",
    timestamp: "3 hours ago",
  },
  {
    id: 3,
    user: {
      name: "DJ Metro",
      role: "Producer",
      avatar: "/placeholder.svg",
    },
    content: "Hosting a live Q&A this Friday. Drop your questions below!",
    timestamp: "5 hours ago",
  },
];

export default function FeedPage() {
  return (
    <div style={{ background: '#141414', minHeight: '100vh', width: '100vw' }}>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-4xl font-bold mb-8 font-display tracking-wider text-primary">Feed</h1>
        <div className="space-y-6">
          {mockFeed.map((post) => (
            <Card key={post.id} className="bg-black border-primary">
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <Image
                  src={post.user.avatar}
                  alt={post.user.name}
                  width={48}
                  height={48}
                  className="rounded-full object-cover border border-primary"
                />
                <div>
                  <CardTitle className="text-lg font-semibold text-primary mb-0">{post.user.name}</CardTitle>
                  <CardDescription className="capitalize text-xs text-gray-400">{post.user.role} • {post.timestamp}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-base text-white mb-2">{post.content}</p>
                <Button variant="outline" size="sm" className="text-primary border-primary">Comment</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
} 