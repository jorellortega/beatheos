import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest, getAISettings, callOpenAI, callAnthropic, mapSettings } from '@/lib/ai-api-helpers'
import { AIMessage } from '@/types/ai'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { message, conversationHistory = [] } = body

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Get AI settings from database
    const { data: settingsData, error: settingsError } = await supabase.rpc('get_ai_settings')
    
    if (settingsError) {
      console.error('Error fetching AI settings:', settingsError)
      return NextResponse.json(
        { error: 'Failed to fetch AI settings' },
        { status: 500 }
      )
    }

    const settings = mapSettings(settingsData || [])
    const systemPrompt = settings['system_prompt']?.trim()

    // Build messages array
    const messages: AIMessage[] = []
    
    // Add system prompt if available
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }

    // Add conversation history
    if (Array.isArray(conversationHistory)) {
      messages.push(...conversationHistory)
    }

    // Add current user message
    messages.push({ role: 'user', content: message.trim() })

    // Try OpenAI first
    let responsePayload = await callOpenAI(messages, settings)

    // Fallback to Anthropic if OpenAI fails
    if (!responsePayload) {
      responsePayload = await callAnthropic(messages, settings, systemPrompt)
    }

    if (!responsePayload) {
      return NextResponse.json(
        { error: 'AI service unavailable. Please check API keys in settings.' },
        { status: 503 }
      )
    }

    // Remove markdown bold formatting
    const cleanedMessage = responsePayload.message.replace(/\*\*(.*?)\*\*/g, '$1')

    return NextResponse.json({ message: cleanedMessage })
  } catch (error) {
    console.error('Error in AI chat:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

