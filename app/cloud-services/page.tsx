"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Cloud, Settings, Loader2, CheckCircle2, AlertCircle, LogOut, ExternalLink, X } from "lucide-react"
import { supabase } from '@/lib/supabaseClient'

interface CloudServiceConnection {
  id: string
  user_id: string | null
  service_id: string
  service_name: string
  connection_type: 'user' | 'system'
  account_info: Record<string, any> | null
  is_active: boolean
  last_sync: string | null
  created_at: string
}

const AVAILABLE_SERVICES = [
  { id: 'dropbox', name: 'Dropbox', icon: '📦' },
  { id: 'google-drive', name: 'Google Drive', icon: '📁' },
  { id: 'onedrive', name: 'OneDrive', icon: '☁️' },
  { id: 'box', name: 'Box', icon: '📦' },
]

export default function CloudServicesPage() {
  const { user, isLoading: authLoading, hydrated } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [userConnections, setUserConnections] = useState<CloudServiceConnection[]>([])
  const [systemConnections, setSystemConnections] = useState<CloudServiceConnection[]>([])
  const [connecting, setConnecting] = useState<string | null>(null)

  useEffect(() => {
    // Check for OAuth callback success/error FIRST (before any other checks)
    // This way we can show the message even if auth is still loading
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    const service = searchParams.get('service')

    // If we have callback params, handle them immediately and don't redirect
    if (success === 'connected' && service) {
      console.log(`[Cloud Services] ✅ Success! ${service} connected`)
      setLoading(false) // Stop loading to show the page
      toast({
        title: "✅ Connected Successfully!",
        description: `Your ${service} account has been connected and is ready to use.`,
        duration: 5000,
      })
      // Wait for auth to hydrate, then reload connections
      if (hydrated && !authLoading && user) {
        checkDatabase()
        loadConnectedServices()
      }
      // Clean URL after showing the success message
      setTimeout(() => {
        router.replace('/cloud-services')
      }, 2000)
      return // Don't redirect to login if we just got a success
    }

    if (error) {
      const message = searchParams.get('message') || error
      console.error(`[Cloud Services] OAuth error: ${error} - ${message}`)
      setLoading(false) // Stop loading to show the page
      toast({
        title: "Connection Error",
        description: `Error: ${error}. ${message}`,
        variant: "destructive"
      })
      // Clean URL after showing the error
      setTimeout(() => {
        router.replace('/cloud-services')
      }, 2000)
      return // Don't redirect to login if we have an error to show
    }

    // Wait for auth to hydrate before checking user (only if no callback params)
    if (!hydrated || authLoading) {
      console.log('[Cloud Services] Waiting for auth to hydrate...', { hydrated, authLoading })
      return
    }

    // Only redirect to login if we don't have callback params and user is not authenticated
    if (!user && !success && !error) {
      console.log('[Cloud Services] No user and no callback params, redirecting to login')
      setLoading(false) // Make sure to stop loading before redirect
      router.push("/login")
      return
    }
    
    // If we have a user, load the data
    if (user) {
      // Check database first
      checkDatabase()
      loadConnectedServices()
    } else {
      // No user but we have callback params - stop loading to show the processing message
      setLoading(false)
    }
  }, [user, router, searchParams, toast, hydrated, authLoading])

  const checkDatabase = async () => {
    try {
      const response = await fetch('/api/cloud-services/check-db')
      const data = await response.json()
      
      if (!data.exists) {
        console.warn('[Cloud Services] Database check failed:', data.message)
        toast({
          title: "Database Setup Required",
          description: "Please run migrations 084 and 085 to create the cloud_services tables.",
          variant: "destructive"
        })
      } else {
        console.log('[Cloud Services] Database check passed:', data.message)
      }
    } catch (error) {
      console.error('[Cloud Services] Error checking database:', error)
    }
  }

  const loadConnectedServices = async () => {
    try {
      console.log('[Cloud Services] Loading connections...')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.log('[Cloud Services] No session, skipping load')
        setLoading(false)
        return
      }

      const response = await fetch('/api/cloud-services/connections', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      console.log(`[Cloud Services] Connections response status: ${response.status}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Cloud Services] Failed to load connections:', errorText)
        // Don't throw - just log and continue
        console.warn('[Cloud Services] Continuing without connections data')
        setUserConnections([])
        setSystemConnections([])
        setLoading(false)
        return
      }

      const data = await response.json()
      console.log('[Cloud Services] Loaded connections:', {
        userConnections: data.userConnections?.length || 0,
        systemConnections: data.systemConnections?.length || 0,
        userConnectionsList: data.userConnections?.map((c: any) => c.service_id) || [],
        systemConnectionsList: data.systemConnections?.map((c: any) => c.service_id) || []
      })
      
      setUserConnections(data.userConnections || [])
      setSystemConnections(data.systemConnections || [])
      
      // Log if Dropbox is connected
      const dropboxConnected = [...(data.userConnections || []), ...(data.systemConnections || [])]
        .find((c: any) => c.service_id === 'dropbox')
      if (dropboxConnected) {
        console.log('[Cloud Services] ✅ Dropbox is connected!', {
          type: dropboxConnected.connection_type,
          account: dropboxConnected.account_info?.name || dropboxConnected.account_info?.email || 'Unknown'
        })
      } else {
        console.log('[Cloud Services] ⚠️ Dropbox is not connected')
      }
    } catch (error) {
      console.error('[Cloud Services] Error loading connections:', error)
      toast({
        title: "Error",
        description: "Failed to load cloud service connections. Make sure the database migrations have been run.",
        variant: "destructive"
      })
      // Make sure to set loading to false even on error
      setUserConnections([])
      setSystemConnections([])
    } finally {
      setLoading(false)
      console.log('[Cloud Services] Loading complete, loading state set to false')
    }
  }

  const handleConnect = async (serviceId: string) => {
    if (!user) return

    setConnecting(serviceId)
    console.log(`[Cloud Services] Starting connection to ${serviceId}...`)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.error('[Cloud Services] No session found')
        toast({
          title: "Error",
          description: "Please log in again",
          variant: "destructive"
        })
        setConnecting(null)
        return
      }

      console.log(`[Cloud Services] Calling /api/cloud-services/connect/${serviceId}`)
      const response = await fetch(`/api/cloud-services/connect/${serviceId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      console.log(`[Cloud Services] Response status: ${response.status}`)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('[Cloud Services] Connect error:', errorData)
        throw new Error(errorData.error || errorData.details || 'Failed to initiate connection')
      }

      const { authUrl } = await response.json()
      console.log(`[Cloud Services] Received authUrl: ${authUrl ? 'Yes' : 'No'}`)
      
      if (!authUrl) {
        throw new Error('No OAuth URL returned from server')
      }
      
      console.log(`[Cloud Services] Redirecting to OAuth provider...`)
      // Redirect to OAuth provider
      window.location.href = authUrl
    } catch (error: any) {
      console.error('[Cloud Services] Error connecting:', error)
      toast({
        title: "Connection Error",
        description: error.message || "Failed to connect service. Please check your environment variables.",
        variant: "destructive"
      })
      setConnecting(null)
    }
  }

  const handleDisconnect = async (serviceId: string) => {
    if (!user) return

    if (!confirm(`Are you sure you want to disconnect ${serviceId}?`)) {
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast({
          title: "Error",
          description: "Please log in again",
          variant: "destructive"
        })
        return
      }

      const response = await fetch(`/api/cloud-services/disconnect/${serviceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to disconnect')
      }

      toast({
        title: "Success",
        description: `${serviceId} disconnected successfully`,
      })

      await loadConnectedServices()
    } catch (error: any) {
      console.error('Error disconnecting:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to disconnect service",
        variant: "destructive"
      })
    }
  }

  const getConnectionStatus = (serviceId: string) => {
    const userConn = userConnections.find(c => c.service_id === serviceId)
    if (userConn) {
      return { connected: true, connection: userConn, type: 'user' as const }
    }
    const systemConn = systemConnections.find(c => c.service_id === serviceId)
    if (systemConn) {
      return { connected: true, connection: systemConn, type: 'system' as const }
    }
    return { connected: false, connection: null, type: null }
  }

  // Show loading while auth is hydrating or data is loading
  if (!hydrated || authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4 text-gray-400">Loading cloud services...</p>
      </div>
    )
  }

  // Check for OAuth callback params - show message even if user isn't loaded yet
  const success = searchParams.get('success')
  const error = searchParams.get('error')
  const service = searchParams.get('service')

  // Only redirect to login if we're sure there's no user (after hydration) AND no callback params
  if (!user && !success && !error) {
    console.log('[Cloud Services] No user, no callback params - redirecting to login')
    router.push("/login")
    return null
  }

  // If we have callback params but no user yet, show a message
  if ((success || error) && !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-gray-400">
              {success ? `Processing ${service} connection...` : 'Processing OAuth callback...'}
            </p>
            <p className="text-sm text-gray-500 mt-2">Please wait while we verify your connection.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 font-display tracking-wider text-primary">Cloud Services</h1>
          <p className="text-xl text-gray-400">Connect and manage your cloud storage services</p>
        </div>
        <Button
          onClick={() => router.push('/settings')}
          variant="outline"
        >
          <Settings className="h-4 w-4 mr-2" />
          Back to Settings
        </Button>
      </div>

      <div className="grid gap-6">
        {AVAILABLE_SERVICES.map((service) => {
          const status = getConnectionStatus(service.id)
          const isConnecting = connecting === service.id

          return (
            <Card key={service.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{service.icon}</span>
                    <div>
                      <CardTitle>{service.name}</CardTitle>
                      <CardDescription>
                        {status.connected
                          ? status.type === 'user'
                            ? 'Your personal connection'
                            : 'System connection (read-only)'
                          : 'Not connected'}
                      </CardDescription>
                    </div>
                  </div>
                  {status.connected && status.connection && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                        Connected
                      </span>
                      {status.type === 'user' && (
                        <Button
                          onClick={() => handleDisconnect(service.id)}
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:text-red-300"
                        >
                          <LogOut className="h-4 w-4 mr-1" />
                          Disconnect
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {status.connected && status.connection ? (
                  <div className="space-y-4">
                    {status.connection.account_info && (
                      <div className="p-4 bg-gray-800/30 rounded-lg border">
                        <p className="text-sm font-medium mb-2">Account Information</p>
                        <div className="space-y-1 text-sm text-gray-400">
                          {status.connection.account_info.name && (
                            <p>Name: {status.connection.account_info.name}</p>
                          )}
                          {status.connection.account_info.email && (
                            <p>Email: {status.connection.account_info.email}</p>
                          )}
                          {status.connection.account_info.display_name && (
                            <p>Display Name: {status.connection.account_info.display_name}</p>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => router.push(`/cloud-services/${service.id}`)}
                        variant="outline"
                        className="flex-1"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Manage
                      </Button>
                      {status.type === 'user' && (
                        <Button
                          onClick={() => handleDisconnect(service.id)}
                          variant="outline"
                          className="text-red-400 hover:text-red-300"
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Disconnect
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-400">
                      Connect your {service.name} account to use it for file storage and syncing.
                    </p>
                    <Button
                      onClick={() => handleConnect(service.id)}
                      disabled={isConnecting}
                      className="bg-gradient-to-r from-[#F4C430] to-[#E8E8E8] text-black font-semibold hover:scale-105 transition-all duration-300"
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Redirecting to {service.name}...
                        </>
                      ) : (
                        <>
                          <Cloud className="h-4 w-4 mr-2" />
                          Connect {service.name}
                        </>
                      )}
                    </Button>
                    {isConnecting && (
                      <p className="text-xs text-gray-500">
                        You will be redirected to {service.name} to authorize the connection...
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {systemConnections.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>System Connections</CardTitle>
            <CardDescription>
              Platform-wide cloud storage connections managed by administrators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {systemConnections.map((connection) => (
                <div
                  key={connection.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-gray-800/30"
                >
                  <div>
                    <p className="font-medium">{connection.service_name}</p>
                    <p className="text-sm text-gray-400">System connection (read-only)</p>
                  </div>
                  <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                    System
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
