import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { AIMessage, AISettingsMap } from '@/types/ai'

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

// Call OpenAI API
export async function callOpenAI(
  messages: AIMessage[],
  settings: AISettingsMap
): Promise<{ message: string } | null> {
  const apiKey = settings['openai_api_key']?.trim()
  const model = settings['openai_model']?.trim() || 'gpt-4o-mini'

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
        max_tokens: 2000,
        temperature: 0.7,
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

