'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Eye, EyeOff, Save, Trash2, Settings } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'

interface AIService {
  id: string
  name: string
  description: string
  apiKey: string
  isConfigured: boolean
  placeholder: string
}

export default function SetupAIPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [services, setServices] = useState<AIService[]>([
    {
      id: 'openai',
      name: 'OpenAI (ChatGPT & DALL-E)',
      description: 'Generate scripts with ChatGPT and images with DALL-E.',
      apiKey: '',
      isConfigured: false,
      placeholder: 'OpenAI API Key'
    },
    {
      id: 'anthropic',
      name: 'Anthropic (Claude)',
      description: 'Advanced text generation and analysis with Claude.',
      apiKey: '',
      isConfigured: false,
      placeholder: 'Anthropic API Key'
    },
    {
      id: 'elevenlabs',
      name: 'ElevenLabs',
      description: 'High-quality AI text-to-speech and voice generation.',
      apiKey: '',
      isConfigured: false,
      placeholder: 'ElevenLabs API Key'
    },
    {
      id: 'openart',
      name: 'OpenArt',
      description: 'AI image generation with multiple models.',
      apiKey: '',
      isConfigured: false,
      placeholder: 'OpenArt API Key'
    },
    {
      id: 'kling',
      name: 'Kling',
      description: 'High-quality AI video generation.',
      apiKey: '',
      isConfigured: false,
      placeholder: 'Kling API Key'
    },
    {
      id: 'runway',
      name: 'Runway ML',
      description: 'AI-powered video generation and editing.',
      apiKey: '',
      isConfigured: false,
      placeholder: 'Runway ML API Key'
    }
  ])
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (user) {
      loadAPIKeys()
    }
  }, [user])

  const loadAPIKeys = async () => {
    try {
      // Get the auth token from localStorage
      const authToken = localStorage.getItem('beatheos-auth-token')
      if (!authToken) {
        console.error('No auth token found')
        return
      }

      const authData = JSON.parse(authToken)
      const response = await fetch('/api/lyrics-ai/api-keys', {
        headers: {
          'Authorization': `Bearer ${authData.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        const data = await response.json()
        setServices(prev => prev.map(service => ({
          ...service,
          apiKey: data[service.id] || '',
          isConfigured: !!data[service.id]
        })))
      } else {
        console.error('Failed to load API keys:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Failed to load API keys:', error)
    }
  }

  const toggleKeyVisibility = (serviceId: string) => {
    setVisibleKeys(prev => ({
      ...prev,
      [serviceId]: !prev[serviceId]
    }))
  }

  const saveAPIKey = async (serviceId: string, apiKey: string) => {
    if (!user) return

    setLoading(prev => ({ ...prev, [serviceId]: true }))

    try {
      // Get the auth token from localStorage
      const authToken = localStorage.getItem('beatheos-auth-token')
      if (!authToken) {
        toast({
          title: "Error",
          description: "Authentication token not found. Please log in again.",
          variant: "destructive",
        })
        return
      }

      const authData = JSON.parse(authToken)
      const response = await fetch('/api/lyrics-ai/api-keys', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authData.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceId,
          apiKey
        })
      })

      if (response.ok) {
        setServices(prev => prev.map(service => 
          service.id === serviceId 
            ? { ...service, apiKey, isConfigured: !!apiKey }
            : service
        ))
        toast({
          title: "API Key Saved",
          description: `${services.find(s => s.id === serviceId)?.name} API key has been saved successfully.`,
        })
      } else {
        throw new Error('Failed to save API key')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save API key. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(prev => ({ ...prev, [serviceId]: false }))
    }
  }

  const clearAPIKey = async (serviceId: string) => {
    if (!user) return

    setLoading(prev => ({ ...prev, [serviceId]: true }))

    try {
      // Get the auth token from localStorage
      const authToken = localStorage.getItem('beatheos-auth-token')
      if (!authToken) {
        toast({
          title: "Error",
          description: "Authentication token not found. Please log in again.",
          variant: "destructive",
        })
        return
      }

      const authData = JSON.parse(authToken)
      const response = await fetch('/api/lyrics-ai/api-keys', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authData.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ serviceId })
      })

      if (response.ok) {
        setServices(prev => prev.map(service => 
          service.id === serviceId 
            ? { ...service, apiKey: '', isConfigured: false }
            : service
        ))
        toast({
          title: "API Key Cleared",
          description: `${services.find(s => s.id === serviceId)?.name} API key has been cleared.`,
        })
      } else {
        throw new Error('Failed to clear API key')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear API key. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(prev => ({ ...prev, [serviceId]: false }))
    }
  }

  const updateServiceKey = (serviceId: string, value: string) => {
    setServices(prev => prev.map(service => 
      service.id === serviceId 
        ? { ...service, apiKey: value }
        : service
    ))
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-muted-foreground">Please log in to configure AI services.</p>
        </div>
      </div>
    )
  }

  if (user.role !== "admin" && user.role !== "ceo") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">This page is only accessible to Admin or CEO roles.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Configure All AI Services</h1>
            <p className="text-muted-foreground mt-1">
              Set up API keys for all AI services to unlock full functionality
            </p>
          </div>
        </div>

        {/* Services Grid */}
        <div className="space-y-6">
          {services.map((service) => (
            <Card key={service.id} className="border-border/50">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{service.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {service.description}
                    </CardDescription>
                  </div>
                  <Badge 
                    variant={service.isConfigured ? "default" : "secondary"}
                    className="ml-4"
                  >
                    {service.isConfigured ? "Configured" : "Not Configured"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* API Key Input */}
                  <div className="relative">
                    <Input
                      type={visibleKeys[service.id] ? "text" : "password"}
                      placeholder={service.placeholder}
                      value={service.apiKey}
                      onChange={(e) => updateServiceKey(service.id, e.target.value)}
                      className="pr-20"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                      onClick={() => toggleKeyVisibility(service.id)}
                    >
                      {visibleKeys[service.id] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => saveAPIKey(service.id, service.apiKey)}
                      disabled={!service.apiKey.trim() || loading[service.id]}
                      className="flex-1"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {loading[service.id] ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => clearAPIKey(service.id)}
                      disabled={!service.isConfigured || loading[service.id]}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer Info */}
        <div className="mt-12 p-6 bg-muted/50 rounded-lg">
          <h3 className="font-semibold mb-2">Security & Privacy</h3>
          <p className="text-sm text-muted-foreground">
            Your API keys are encrypted and stored securely. They are only used to authenticate 
            with the respective AI services and are never shared with third parties. You can 
            clear any API key at any time.
          </p>
        </div>
      </div>
    </div>
  )
}
