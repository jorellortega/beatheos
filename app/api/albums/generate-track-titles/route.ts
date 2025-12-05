import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest, getAISettings, mapSettings } from '@/lib/ai-api-helpers'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper to convert image URL to base64
async function imageUrlToBase64(imageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(imageUrl)
    if (!response.ok) {
      return null
    }
    const arrayBuffer = await arrayBufferToBase64(await response.arrayBuffer())
    return arrayBuffer
  } catch (error) {
    console.error('Error converting image to base64:', error)
    return null
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// Call OpenAI Vision API
async function callOpenAIVision(
  imageUrl: string,
  numTracks: number,
  settings: Record<string, string>,
  context?: { otherTracks?: string[]; currentTitle?: string; albumTitle?: string }
): Promise<string[] | null> {
  const apiKey = settings['openai_api_key']?.trim()
  const model = settings['openai_model']?.trim() || 'gpt-4o-mini'

  if (!apiKey) {
    return null
  }

  try {
    // Convert image to base64
    const base64Image = await imageUrlToBase64(imageUrl)
    if (!base64Image) {
      return null
    }

    // Determine image format from URL
    const imageFormat = imageUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)?.[1]?.toLowerCase() || 'jpeg'
    const mimeType = `image/${imageFormat === 'jpg' ? 'jpeg' : imageFormat}`

    // Build context-aware prompt
    let prompt = `Analyze this album cover art and generate ${numTracks} creative and engaging track title${numTracks > 1 ? 's' : ''} that match the mood, theme, and aesthetic of the artwork.`;
    
    // Add context if provided (for single track regeneration)
    if (context && context.otherTracks && context.otherTracks.length > 0) {
      prompt += `\n\nIMPORTANT: The following tracks already exist in this album:\n${context.otherTracks.map((t: string, i: number) => `${i + 1}. ${t}`).join('\n')}`;
      
      // If regenerating a single track, explicitly exclude the current title
      if (context.currentTitle && numTracks === 1) {
        prompt += `\n\nThe current title for this track is "${context.currentTitle}". DO NOT use this title or any variation of it. Generate a completely new and different title that fits cohesively with the existing track titles while matching the cover art aesthetic.`;
      } else {
        prompt += `\n\nGenerate a title that fits cohesively with these existing track titles while matching the cover art aesthetic.`;
      }
    }
    
    prompt += `\n\nThe title${numTracks > 1 ? 's should' : ' should'} be:
- Unique and memorable
- Appropriate for the visual style and mood
- Suitable for a music album
- Between 1-5 words each
- Return ONLY a JSON array of strings, no other text

Example format: ${numTracks > 1 ? '["Title 1", "Title 2", "Title 3"]' : '["Title 1"]'}`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model.includes('gpt-4') ? model : 'gpt-4o', // Use vision-capable model
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.8,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
      console.error('OpenAI Vision API error:', error)
      return null
    }

    const data = await response.json()
    const message = data?.choices?.[0]?.message?.content?.trim()

    if (!message) {
      return null
    }

    // Try to parse JSON array from response
    try {
      // Extract JSON array from response (handle cases where there's extra text)
      const jsonMatch = message.match(/\[.*\]/s)
      if (jsonMatch) {
        const titles = JSON.parse(jsonMatch[0])
        if (Array.isArray(titles) && titles.length > 0) {
          return titles.map((t: any) => String(t).trim()).filter((t: string) => t.length > 0)
        }
      }
      // Fallback: try to parse the whole message
      const titles = JSON.parse(message)
      if (Array.isArray(titles)) {
        return titles.map((t: any) => String(t).trim()).filter((t: string) => t.length > 0)
      }
    } catch (parseError) {
      // If JSON parsing fails, try to extract titles from text
      const lines = message.split('\n').filter(line => line.trim().length > 0)
      const titles = lines
        .map(line => {
          // Remove numbering, bullets, quotes, etc.
          return line.replace(/^[\d\-•\*\"\']+\s*/, '').replace(/[\"\'`]/g, '').trim()
        })
        .filter(title => title.length > 0 && title.length < 50)
      
      if (titles.length > 0) {
        return titles.slice(0, numTracks)
      }
    }

    return null
  } catch (error) {
    console.error('Error calling OpenAI Vision:', error)
    return null
  }
}

// Call Anthropic Vision API
async function callAnthropicVision(
  imageUrl: string,
  numTracks: number,
  settings: Record<string, string>,
  context?: { otherTracks?: string[]; currentTitle?: string; albumTitle?: string }
): Promise<string[] | null> {
  const apiKey = settings['anthropic_api_key']?.trim()
  const model = settings['anthropic_model']?.trim() || 'claude-3-5-sonnet-20241022'

  if (!apiKey) {
    return null
  }

  try {
    // Convert image to base64
    const base64Image = await imageUrlToBase64(imageUrl)
    if (!base64Image) {
      return null
    }

    // Determine image format from URL
    const imageFormat = imageUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)?.[1]?.toLowerCase() || 'jpeg'
    const mimeType = `image/${imageFormat === 'jpg' ? 'jpeg' : imageFormat}`

    // Build context-aware prompt
    let prompt = `Analyze this album cover art and generate ${numTracks} creative and engaging track title${numTracks > 1 ? 's' : ''} that match the mood, theme, and aesthetic of the artwork.`;
    
    // Add context if provided (for single track regeneration)
    if (context && context.otherTracks && context.otherTracks.length > 0) {
      prompt += `\n\nIMPORTANT: The following tracks already exist in this album:\n${context.otherTracks.map((t: string, i: number) => `${i + 1}. ${t}`).join('\n')}`;
      
      // If regenerating a single track, explicitly exclude the current title
      if (context.currentTitle && numTracks === 1) {
        prompt += `\n\nThe current title for this track is "${context.currentTitle}". DO NOT use this title or any variation of it. Generate a completely new and different title that fits cohesively with the existing track titles while matching the cover art aesthetic.`;
      } else {
        prompt += `\n\nGenerate a title that fits cohesively with these existing track titles while matching the cover art aesthetic.`;
      }
    }
    
    prompt += `\n\nThe title${numTracks > 1 ? 's should' : ' should'} be:
- Unique and memorable
- Appropriate for the visual style and mood
- Suitable for a music album
- Between 1-5 words each
- Return ONLY a JSON array of strings, no other text

Example format: ${numTracks > 1 ? '["Title 1", "Title 2", "Title 3"]' : '["Title 1"]'}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType,
                  data: base64Image
                }
              },
              {
                type: 'text',
                text: prompt
              }
            ]
          }
        ],
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
      console.error('Anthropic Vision API error:', error)
      return null
    }

    const data = await response.json()
    const message = data?.content?.[0]?.text?.trim()

    if (!message) {
      return null
    }

    // Try to parse JSON array from response
    try {
      // Extract JSON array from response
      const jsonMatch = message.match(/\[.*\]/s)
      if (jsonMatch) {
        const titles = JSON.parse(jsonMatch[0])
        if (Array.isArray(titles) && titles.length > 0) {
          return titles.map((t: any) => String(t).trim()).filter((t: string) => t.length > 0)
        }
      }
      // Fallback: try to parse the whole message
      const titles = JSON.parse(message)
      if (Array.isArray(titles)) {
        return titles.map((t: any) => String(t).trim()).filter((t: string) => t.length > 0)
      }
    } catch (parseError) {
      // If JSON parsing fails, try to extract titles from text
      const lines = message.split('\n').filter(line => line.trim().length > 0)
      const titles = lines
        .map(line => {
          // Remove numbering, bullets, quotes, etc.
          return line.replace(/^[\d\-•\*\"\']+\s*/, '').replace(/[\"\'`]/g, '').trim()
        })
        .filter(title => title.length > 0 && title.length < 50)
      
      if (titles.length > 0) {
        return titles.slice(0, numTracks)
      }
    }

    return null
  } catch (error) {
    console.error('Error calling Anthropic Vision:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { albumId, coverArtUrl, numTracks, context } = body

    if (!albumId || !coverArtUrl || !numTracks) {
      return NextResponse.json(
        { error: 'Missing required fields: albumId, coverArtUrl, numTracks' },
        { status: 400 }
      )
    }

    // Verify album belongs to user
    const { data: album, error: albumError } = await supabase
      .from('albums')
      .select('id, user_id')
      .eq('id', albumId)
      .single()

    if (albumError || !album) {
      return NextResponse.json(
        { error: 'Album not found' },
        { status: 404 }
      )
    }

    if (album.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
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

    // Try OpenAI Vision first
    let titles = await callOpenAIVision(coverArtUrl, numTracks, settings, context)

    // Fallback to Anthropic Vision if OpenAI fails
    if (!titles || titles.length === 0) {
      titles = await callAnthropicVision(coverArtUrl, numTracks, settings, context)
    }

    if (!titles || titles.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate track titles. Please ensure AI API keys are configured in /ai-settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({ titles })
  } catch (error) {
    console.error('Error generating track titles:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

