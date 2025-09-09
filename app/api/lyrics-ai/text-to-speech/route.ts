import { NextRequest, NextResponse } from 'next/server'
import { ElevenLabsService } from '@/lib/ai-services'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, voiceId, apiKey } = body

    if (!text || !voiceId || !apiKey) {
      return NextResponse.json(
        { error: 'Missing required fields: text, voiceId, apiKey' },
        { status: 400 }
      )
    }

    const speechResponse = await ElevenLabsService.generateSpeech({
      text,
      voiceId,
      apiKey
    })

    return NextResponse.json({ 
      success: true, 
      audioUrl: speechResponse.audio_url,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Text-to-speech error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to generate speech',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

