import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest, isAdminOrCEO, getAISettings } from '@/lib/ai-api-helpers'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin/ceo role
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin or ceo
    const adminOrCEO = await isAdminOrCEO(user.id)
    if (!adminOrCEO) {
      return NextResponse.json(
        { error: 'Forbidden - Admin or CEO access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { prompt } = body

    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { error: 'Prompt is required' },
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

    const settings: Record<string, string> = {}
    for (const setting of settingsData || []) {
      settings[setting.setting_key] = setting.setting_value
    }

    const openaiKey = settings['openai_api_key']?.trim()

    if (!openaiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 400 }
      )
    }

    // Call OpenAI to enhance the prompt
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: settings['openai_model']?.trim() || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a prompt engineering expert. Your task is to improve and enhance prompts to make them more effective, clear, and comprehensive while maintaining the original intent.'
          },
          {
            role: 'user',
            content: `Please improve and enhance this prompt:\n\n${prompt.trim()}\n\nProvide an improved version that is more effective, clear, and comprehensive.`
          }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
      console.error('OpenAI API error:', error)
      return NextResponse.json(
        { error: 'Failed to generate improved prompt' },
        { status: 500 }
      )
    }

    const data = await response.json()
    const improvedPrompt = data?.choices?.[0]?.message?.content?.trim()

    if (!improvedPrompt) {
      return NextResponse.json(
        { error: 'No improved prompt generated' },
        { status: 500 }
      )
    }

    return NextResponse.json({ prompt: improvedPrompt })
  } catch (error) {
    console.error('Error in generate AI prompt:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

