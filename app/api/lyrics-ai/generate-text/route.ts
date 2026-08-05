import { NextRequest, NextResponse } from 'next/server'
import { OpenAIService, AnthropicService } from '@/lib/ai-services'
import { AIGenerationParams } from '@/types/lyrics'
import { getUserFromRequest, userHasOwnAPIKeys } from '@/lib/ai-api-helpers'
import { deductCredits } from '@/lib/credits'

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const { 
      prompt, 
      selectedText, 
      fullContent, 
      service, 
      apiKey, 
      contentType,
      lockedSections 
    }: AIGenerationParams = body

    if (!prompt || !service || !apiKey || !contentType) {
      return NextResponse.json(
        { error: 'Missing required fields: prompt, service, apiKey, contentType' },
        { status: 400 }
      )
    }

    const ownKeys = await userHasOwnAPIKeys(user.id)
    const usesOwnAIKey =
      (service === 'openai' && ownKeys.openai) ||
      (service === 'anthropic' && ownKeys.anthropic)

    if (!usesOwnAIKey) {
      const deduct = await deductCredits(user.id, 'ai_lyrics')
      if (!deduct.success) {
        const status = deduct.error === 'Insufficient credits' ? 402 : 400
        return NextResponse.json(
          {
            error: deduct.error,
            balance: deduct.balance,
            required: deduct.required,
            hint: 'Add your API key in /setup-ai to use your own account without Beatheos credits, or buy credits at /credits.',
          },
          { status }
        )
      }
    }

    const params: AIGenerationParams = {
      prompt,
      selectedText,
      fullContent,
      service,
      apiKey,
      contentType,
      lockedSections
    }

    let generatedText: string

    console.log('=== AI GENERATE API DEBUG ===')
    console.log('Service:', service)
    console.log('API Key length:', apiKey?.length)
    console.log('Prompt length:', prompt?.length)
    console.log('Content type:', contentType)

    switch (service) {
      case 'openai':
        console.log('Calling OpenAI service...')
        generatedText = await OpenAIService.generateText(params)
        console.log('OpenAI response length:', generatedText?.length)
        console.log('OpenAI response preview:', generatedText?.substring(0, 200))
        break
      case 'anthropic':
        console.log('Calling Anthropic service...')
        generatedText = await AnthropicService.generateText(params)
        console.log('Anthropic response length:', generatedText?.length)
        console.log('Anthropic response preview:', generatedText?.substring(0, 200))
        break
      default:
        return NextResponse.json(
          { error: 'Invalid service. Must be "openai" or "anthropic"' },
          { status: 400 }
        )
    }

    console.log('Final generatedText length:', generatedText?.length)
    console.log('Final generatedText:', generatedText)
    console.log('=== END AI GENERATE API DEBUG ===')

    return NextResponse.json({ 
      success: true, 
      generatedText,
      service,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('AI text generation error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to generate text',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}



