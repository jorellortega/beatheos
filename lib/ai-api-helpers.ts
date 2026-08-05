import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { AIMessage, AISettingsMap } from '@/types/ai'
import { resolveOpenAIModel, buildOpenAITokenLimit, buildOpenAITemperature } from '@/lib/openai-models'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Get user from request (check both Authorization header and cookies)
export async function getUserFromRequest(req: NextRequest) {
  // Try Authorization header first
  const authHeader = req.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (!error && user) {
      return user
    }
  }

  // Try cookies
  const cookieStore = await cookies()
  const authCookie = cookieStore.get('beatheos-auth-token')
  if (authCookie?.value) {
    try {
      const authData = JSON.parse(authCookie.value)
      const accessToken = authData.access_token
      if (accessToken) {
        const { data: { user }, error } = await supabase.auth.getUser(accessToken)
        if (!error && user) {
          return user
        }
      }
    } catch (error) {
      console.error('Error parsing auth cookie:', error)
    }
  }

  return null
}

// Get user role from database
export async function getUserRole(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return data.role || null
}

// Check if user is admin
export async function isAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId)
  return role === 'admin'
}

// Check if user is admin or ceo
export async function isAdminOrCEO(userId: string): Promise<boolean> {
  const role = await getUserRole(userId)
  return role === 'admin' || role === 'ceo'
}

// Get AI settings from database
export async function getAISettings(): Promise<AISettingsMap> {
  const { data, error } = await supabase.rpc('get_ai_settings')

  if (error || !data) {
    console.error('Error fetching AI settings:', error)
    return {}
  }

  const settings: AISettingsMap = {}
  for (const setting of data) {
    settings[setting.setting_key] = setting.setting_value
  }

  return settings
}

// Map settings array to object
export function mapSettings(settings: any[]): AISettingsMap {
  const mapped: AISettingsMap = {}
  for (const setting of settings || []) {
    mapped[setting.setting_key] = setting.setting_value
  }
  return mapped
}

// Get AI settings merged with per-user keys from /setup-ai
export type AIKeySource = 'user_api_keys' | 'users_table' | 'ai_settings' | 'env' | 'none'

export type AISettingsWithSources = {
  settings: AISettingsMap
  keySources: {
    openai: AIKeySource
    anthropic: AIKeySource
    elevenlabs: AIKeySource
  }
}

export async function getAISettingsForUser(userId: string): Promise<AISettingsMap> {
  const { settings } = await getAISettingsForUserWithSources(userId)
  return settings
}

export async function getAISettingsForUserWithSources(userId: string): Promise<AISettingsWithSources> {
  const settings = await getAISettings()
  const keySources: AISettingsWithSources['keySources'] = {
    openai: settings['openai_api_key']?.trim() ? 'ai_settings' : 'none',
    anthropic: settings['anthropic_api_key']?.trim() ? 'ai_settings' : 'none',
    elevenlabs: settings['elevenlabs_api_key']?.trim() ? 'ai_settings' : 'none',
  }

  // Match album cover generation: platform key from /ai-settings wins over /setup-ai
  if (!settings['openai_api_key']?.trim()) {
    const { data: userData } = await supabase
      .from('users')
      .select('openai_api_key')
      .eq('id', userId)
      .maybeSingle()

    if (userData?.openai_api_key?.trim()) {
      settings['openai_api_key'] = userData.openai_api_key.trim()
      keySources.openai = 'users_table'
    }
  }

  const { data: userKeys } = await supabase
    .from('user_api_keys')
    .select('openai_api_key, anthropic_api_key, elevenlabs_api_key')
    .eq('user_id', userId)
    .maybeSingle()

  if (!settings['openai_api_key']?.trim() && userKeys?.openai_api_key?.trim()) {
    settings['openai_api_key'] = userKeys.openai_api_key.trim()
    keySources.openai = 'user_api_keys'
  }
  if (!settings['anthropic_api_key']?.trim() && userKeys?.anthropic_api_key?.trim()) {
    settings['anthropic_api_key'] = userKeys.anthropic_api_key.trim()
    keySources.anthropic = 'user_api_keys'
  }
  if (!settings['elevenlabs_api_key']?.trim() && userKeys?.elevenlabs_api_key?.trim()) {
    settings['elevenlabs_api_key'] = userKeys.elevenlabs_api_key.trim()
    keySources.elevenlabs = 'user_api_keys'
  }

  if (!settings['openai_api_key']?.trim() && process.env.OPENAI_API_KEY) {
    settings['openai_api_key'] = process.env.OPENAI_API_KEY
    keySources.openai = 'env'
  }
  if (!settings['elevenlabs_api_key']?.trim() && process.env.ELEVENLABS_API_KEY?.trim()) {
    settings['elevenlabs_api_key'] = process.env.ELEVENLABS_API_KEY.trim()
    keySources.elevenlabs = 'env'
  }

  return { settings, keySources }
}

/** Reject keys that are clearly another provider (OpenAI/Stripe) pasted into ElevenLabs. */
export function isPlausibleElevenLabsApiKey(key?: string | null): boolean {
  const trimmed = key?.trim()
  if (!trimmed || trimmed.length < 20) return false
  if (/^sk[-_]/i.test(trimmed)) return false
  if (/^pk_/i.test(trimmed)) return false
  return true
}

export async function resolveElevenLabsApiKeyForUser(userId: string): Promise<{
  apiKey: string | null
  source: AIKeySource
}> {
  const { settings, keySources } = await getAISettingsForUserWithSources(userId)

  const candidates: Array<{ key?: string; source: AIKeySource }> = [
    { key: settings['elevenlabs_api_key'], source: keySources.elevenlabs },
    { key: process.env.ELEVENLABS_API_KEY, source: 'env' },
  ]

  for (const candidate of candidates) {
    if (isPlausibleElevenLabsApiKey(candidate.key)) {
      return { apiKey: candidate.key!.trim(), source: candidate.source }
    }
  }

  return { apiKey: null, source: 'none' }
}

/** True when the resolved settings will bill the user's own provider key (skip Beatheos credits). */
export function usesOwnResolvedAIKeys(keySources: AISettingsWithSources['keySources']): boolean {
  return keySources.openai === 'user_api_keys' || keySources.anthropic === 'user_api_keys'
}

export async function userHasOwnAPIKeys(userId: string): Promise<{
  openai: boolean
  anthropic: boolean
  elevenlabs: boolean
}> {
  const { data } = await supabase
    .from('user_api_keys')
    .select('openai_api_key, anthropic_api_key, elevenlabs_api_key')
    .eq('user_id', userId)
    .maybeSingle()

  return {
    openai: !!data?.openai_api_key?.trim(),
    anthropic: !!data?.anthropic_api_key?.trim(),
    elevenlabs: !!data?.elevenlabs_api_key?.trim(),
  }
}

export async function callOpenAI(
  messages: AIMessage[],
  settings: AISettingsMap
): Promise<{ message: string } | null> {
  const apiKey = settings['openai_api_key']?.trim()
  const model = resolveOpenAIModel(settings['openai_model'])

  if (!apiKey) {
    return null
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        ...buildOpenAITokenLimit(model, 2000),
        ...buildOpenAITemperature(model, 0.7),
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
      console.error('OpenAI API error:', error)
      return null
    }

    const data = await response.json()
    const message = data?.choices?.[0]?.message?.content?.trim()

    if (!message) {
      return null
    }

    return { message }
  } catch (error) {
    console.error('Error calling OpenAI:', error)
    return null
  }
}

// Call Anthropic API
export async function callAnthropic(
  messages: AIMessage[],
  settings: AISettingsMap,
  systemPrompt?: string
): Promise<{ message: string } | null> {
  const apiKey = settings['anthropic_api_key']?.trim()
  const model = settings['anthropic_model']?.trim() || 'claude-3-5-sonnet-20241022'

  if (!apiKey) {
    return null
  }

  try {
    // Filter out system messages and create user messages
    const userMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }))

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        system: systemPrompt || '',
        messages: userMessages,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
      console.error('Anthropic API error:', error)
      return null
    }

    const data = await response.json()
    const message = data?.content?.[0]?.text?.trim()

    if (!message) {
      return null
    }

    return { message }
  } catch (error) {
    console.error('Error calling Anthropic:', error)
    return null
  }
}

