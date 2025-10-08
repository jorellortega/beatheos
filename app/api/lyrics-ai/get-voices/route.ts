import { NextRequest, NextResponse } from 'next/server'
import { ElevenLabsService } from '@/lib/ai-services'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { apiKey } = body

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing required field: apiKey' },
        { status: 400 }
      )
    }

    const voicesResponse = await ElevenLabsService.getAvailableVoices(apiKey)

    return NextResponse.json({ 
      success: true, 
      voices: voicesResponse.voices,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Get voices error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to get voices',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}




