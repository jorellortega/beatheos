'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Settings, Eye, EyeOff, Loader2, Save } from 'lucide-react'
import { AISetting } from '@/types/ai'
import { supabase } from '@/lib/supabaseClient'

const OPENAI_MODELS = [
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4-turbo',
  'gpt-4',
  'gpt-3.5-turbo',
]

const ANTHROPIC_MODELS = [
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307',
]

const SENSITIVE_KEYS = ['openai_api_key', 'anthropic_api_key']

export default function AISettingsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [settings, setSettings] = useState<AISetting[]>([])
  const [editedSettings, setEditedSettings] = useState<Record<string, string>>({})
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Check if user is admin or ceo
  const isAdminOrCEO = user && (user.role === 'admin' || user.role === 'ceo')

  // Redirect if not authenticated or not admin/ceo
  useEffect(() => {
    if (!authLoading && (!user || !isAdminOrCEO)) {
      router.push('/login')
    }
  }, [user, authLoading, router, isAdminOrCEO])

  // Load settings on mount
  useEffect(() => {
    if (user && isAdminOrCEO) {
      loadSettings()
    }
  }, [user, isAdminOrCEO])

  const loadSettings = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('ai_settings')
        .select('setting_key, setting_value, description, updated_at')
        .order('setting_key')

      if (error) {
        throw error
      }

      setSettings(data || [])
      // Initialize edited settings with current values
      const initial: Record<string, string> = {}
      for (const setting of data || []) {
        initial[setting.setting_key] = setting.setting_value
      }
      setEditedSettings(initial)
    } catch (error) {
      console.error('Error loading settings:', error)
      setError('Failed to load settings')
    } finally {
      setIsLoading(false)
    }
  }

  const updateValue = (key: string, value: string) => {
    setEditedSettings(prev => ({ ...prev, [key]: value }))
  }

  const toggleVisibility = (key: string) => {
    setVisibleKeys(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      setError(null)
      setSuccess(null)

      // Update each changed setting
      const updates = Object.entries(editedSettings).map(([key, value]) => {
        const setting = settings.find(s => s.setting_key === key)
        return {
          setting_key: key,
          setting_value: value,
          description: setting?.description || null,
          updated_at: new Date().toISOString()
        }
      })

      // Use upsert to update or insert settings
      for (const update of updates) {
        const { error } = await supabase
          .from('ai_settings')
          .upsert(update, {
            onConflict: 'setting_key'
          })

        if (error) {
          throw error
        }
      }

      setSuccess('Settings saved successfully!')
      setTimeout(() => setSuccess(null), 3000)
      // Reload settings to get updated timestamps
      await loadSettings()
    } catch (error) {
      console.error('Error saving settings:', error)
      setError('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const getSettingValue = (key: string): string => {
    return editedSettings[key] ?? settings.find(s => s.setting_key === key)?.setting_value ?? ''
  }

  const isSensitive = (key: string): boolean => {
    return SENSITIVE_KEYS.includes(key)
  }

  const maskValue = (value: string): string => {
    if (!value) return ''
    if (value.length <= 8) return '••••••••'
    return value.substring(0, 4) + '••••••••' + value.substring(value.length - 4)
  }

  const renderSettingInput = (setting: AISetting) => {
    const key = setting.setting_key
    const value = getSettingValue(key)
    const isVisible = visibleKeys[key] || false

    // Special handling for model selectors
    if (key === 'openai_model') {
      return (
        <Select
          value={value}
          onValueChange={(newValue) => updateValue(key, newValue)}
        >
          <SelectTrigger className="bg-gray-900 border-yellow-400/50 text-white">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            {OPENAI_MODELS.map(model => (
              <SelectItem key={model} value={model}>
                {model}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    if (key === 'anthropic_model') {
      return (
        <Select
          value={value}
          onValueChange={(newValue) => updateValue(key, newValue)}
        >
          <SelectTrigger className="bg-gray-900 border-yellow-400/50 text-white">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            {ANTHROPIC_MODELS.map(model => (
              <SelectItem key={model} value={model}>
                {model}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    // Regular text input
    return (
      <div className="relative">
        <Input
          type={isSensitive(key) && !isVisible ? 'password' : 'text'}
          value={isSensitive(key) && !isVisible ? maskValue(value) : value}
          onChange={(e) => updateValue(key, e.target.value)}
          className="bg-gray-900 border-yellow-400/50 text-white pr-10"
          placeholder={setting.description || ''}
        />
        {isSensitive(key) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 text-yellow-400 hover:text-yellow-300"
            onClick={() => toggleVisibility(key)}
          >
            {isVisible ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </Button>
        )}
      </div>
    )
  }

  if (authLoading || isLoading) {
    return (
      <main className="min-h-screen bg-[#141414] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </main>
    )
  }

  if (!user || !isAdminOrCEO) {
    return null
  }

  return (
    <main className="min-h-screen bg-[#141414] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-gradient-to-r from-yellow-400 to-yellow-200 rounded-lg">
            <Settings className="h-6 w-6 text-black" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">AI Settings</h1>
            <p className="text-yellow-200 text-sm mt-1">
              Configure AI provider API keys and model settings
            </p>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-500/20 border border-green-500 rounded-lg text-green-400">
            {success}
          </div>
        )}

        {/* Settings Card */}
        <Card className="bg-black border-yellow-400 shadow-xl">
          <CardHeader>
            <CardTitle className="text-yellow-400 text-2xl">Provider Configuration</CardTitle>
            <CardDescription className="text-gray-400">
              Configure API keys and model preferences for AI services
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {settings.map((setting) => (
              <div key={setting.setting_key} className="space-y-2">
                <Label className="text-white text-sm font-medium">
                  {setting.setting_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Label>
                {setting.description && (
                  <p className="text-gray-400 text-xs">{setting.description}</p>
                )}
                {renderSettingInput(setting)}
                {setting.updated_at && (
                  <p className="text-gray-500 text-xs">
                    Last updated: {new Date(setting.updated_at).toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="mt-6">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-gradient-to-r from-[#F4C430] to-[#E8E8E8] text-black font-semibold hover:scale-105 transition-all duration-300 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </main>
  )
}

