import { NextRequest, NextResponse } from 'next/server'
import { OpenAIService, AnthropicService } from '@/lib/ai-services'
import { AIGenerationParams } from '@/types/lyrics'

export async function POST(request: NextRequest) {
  try {
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

    switch (service) {
      case 'openai':
        generatedText = await OpenAIService.generateText(params)
        break
      case 'anthropic':
        generatedText = await AnthropicService.generateText(params)
        break
      default:
        return NextResponse.json(
          { error: 'Invalid service. Must be "openai" or "anthropic"' },
          { status: 400 }
        )
    }

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

