"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { ArrowLeft, Loader2, RefreshCw, FileText, Folder } from "lucide-react"
import { supabase } from '@/lib/supabaseClient'

interface CloudServiceConnection {
  id: string
  service_id: string
  service_name: string
  account_info: Record<string, any> | null
  last_sync: string | null
}

export default function ServiceDetailPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const serviceId = params?.serviceId as string
  const [loading, setLoading] = useState(true)
  const [connection, setConnection] = useState<CloudServiceConnection | null>(null)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }
    loadConnection()
  }, [user, router, serviceId])

  const loadConnection = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        return
      }

      const response = await fetch('/api/cloud-services/connections', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load connection')
      }

      const data = await response.json()
      const allConnections = [...(data.userConnections || []), ...(data.systemConnections || [])]
      const conn = allConnections.find((c: CloudServiceConnection) => c.service_id === serviceId)
      setConnection(conn || null)
    } catch (error) {
      console.error('Error loading connection:', error)
      toast({
        title: "Error",
        description: "Failed to load service connection",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    if (!serviceId) return

    setSyncing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        return
      }

      const response = await fetch(`/api/cloud-services/${serviceId}/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Sync failed')
      }

      toast({
        title: "Success",
        description: "Sync started successfully",
      })

      await loadConnection()
    } catch (error: any) {
      console.error('Error syncing:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to start sync",
        variant: "destructive"
      })
    } finally {
      setSyncing(false)
    }
  }

  if (!user) return null

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!connection) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button
          onClick={() => router.push('/cloud-services')}
          variant="outline"
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Cloud Services
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-400">Service not connected</p>
            <Button
              onClick={() => router.push('/cloud-services')}
              className="mt-4"
            >
              Go to Cloud Services
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Button
            onClick={() => router.push('/cloud-services')}
            variant="outline"
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-4xl font-bold mb-2 font-display tracking-wider text-primary">
            {connection.service_name}
          </h1>
          <p className="text-xl text-gray-400">Manage your {connection.service_name} connection</p>
        </div>
        <Button
          onClick={handleSync}
          disabled={syncing}
          variant="outline"
        >
          {syncing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Now
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            {connection.account_info ? (
              <div className="space-y-2">
                {connection.account_info.name && (
                  <div>
                    <span className="text-sm font-medium">Name: </span>
                    <span className="text-sm text-gray-400">{connection.account_info.name}</span>
                  </div>
                )}
                {connection.account_info.email && (
                  <div>
                    <span className="text-sm font-medium">Email: </span>
                    <span className="text-sm text-gray-400">{connection.account_info.email}</span>
                  </div>
                )}
                {connection.account_info.display_name && (
                  <div>
                    <span className="text-sm font-medium">Display Name: </span>
                    <span className="text-sm text-gray-400">{connection.account_info.display_name}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No account information available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sync Status</CardTitle>
            <CardDescription>Last sync information</CardDescription>
          </CardHeader>
          <CardContent>
            {connection.last_sync ? (
              <p className="text-sm text-gray-400">
                Last synced: {new Date(connection.last_sync).toLocaleString()}
              </p>
            ) : (
              <p className="text-sm text-gray-400">No sync performed yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

