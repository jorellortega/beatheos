"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Music, BarChart, Settings } from "lucide-react"
import Link from "next/link"

export default function AdminDashboard() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user || user.role !== "admin") {
      router.push("/login")
    }
  }, [user, router])

  if (!user) return null

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 font-display tracking-wider text-primary">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-card border-primary hover:border-primary transition-all">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              User Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Manage user accounts and permissions.</p>
            <Button className="mt-4" asChild>
              <Link href="/dashboard/admin/users">Manage Users</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="bg-card border-primary hover:border-primary transition-all">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Music className="mr-2 h-5 w-5" />
              Content Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Manage beats and content moderation.</p>
            <Button className="mt-4" asChild>
              <Link href="/dashboard/admin/content">Manage Content</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="bg-card border-primary hover:border-primary transition-all">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart className="mr-2 h-5 w-5" />
              Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>View platform analytics and reports.</p>
            <Button className="mt-4">View Analytics</Button>
          </CardContent>
        </Card>
        <Card className="bg-card border-primary hover:border-primary transition-all">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              System Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Configure platform settings.</p>
            <Button className="mt-4">Settings</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 