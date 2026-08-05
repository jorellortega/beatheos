import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest, getAISettingsForUserWithSources, usesOwnResolvedAIKeys, type AIKeySource } from '@/lib/ai-api-helpers'
import { resolveOpenAIVisionModel, buildOpenAITokenLimit, buildOpenAITemperature } from '@/lib/openai-models'
import { createClient } from '@supabase/supabase-js'
import { deductCredits } from '@/lib/credits'

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

function parseTitlesFromMessage(message: string, numTracks: number): string[] | null {
  try {
    const jsonMatch = message.match(/\[.*\]/s)
    if (jsonMatch) {
      const titles = JSON.parse(jsonMatch[0])
      if (Array.isArray(titles) && titles.length > 0) {
        return titles.map((t: unknown) => String(t).trim()).filter((t: string) => t.length > 0)
      }
    }
    const titles = JSON.parse(message)
    if (Array.isArray(titles)) {
      return titles.map((t: unknown) => String(t).trim()).filter((t: string) => t.length > 0)
    }
  } catch {
    const lines = message.split('\n').filter(line => line.trim().length > 0)
    const titles = lines
      .map(line => line.replace(/^[\d\-•\*\"']+\s*/, '').replace(/[\"'`]/g, '').trim())
      .filter(title => title.length > 0 && title.length < 50)

    if (titles.length > 0) {
      return titles.slice(0, numTracks)
    }
  }

  return null
}

type VisionResult = { titles: string[] } | { error: string; code?: string }

const KEY_SOURCE_PATHS: Record<AIKeySource, string> = {
  user_api_keys: '/setup-ai → user_api_keys table',
  ai_settings: '/ai-settings → ai_settings table (global)',
  users_table: 'users.openai_api_key (legacy)',
  env: 'OPENAI_API_KEY environment variable',
  none: 'not configured',
}

// Call OpenAI Vision API
async function callOpenAIVision(
  imageUrl: string,
  numTracks: number,
  settings: Record<string, string>,
  context?: { otherTracks?: string[]; currentTitle?: string; albumTitle?: string }
): Promise<VisionResult> {
  const apiKey = settings['openai_api_key']?.trim()
  const model = resolveOpenAIVisionModel(settings['openai_model'])

  if (!apiKey) {
    return { error: 'No OpenAI API key configured' }
  }

  try {
    // Convert image to base64
    const base64Image = await imageUrlToBase64(imageUrl)
    if (!base64Image) {
      return { error: 'Failed to load cover art image' }
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
        model,
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
        ...buildOpenAITokenLimit(model, 1000),
        ...buildOpenAITemperature(model, 0.8),
      }),
    })

    if (!response.ok) {
      const raw = await response.text()
      let errorBody: { error?: { message?: string; code?: string } } = {}
      try {
        errorBody = raw ? JSON.parse(raw) : {}
      } catch {
        errorBody = { error: { message: raw || `OpenAI HTTP ${response.status}` } }
      }
      console.error('OpenAI Vision API error:', { model, status: response.status, error: errorBody })
      const message = errorBody?.error?.message || `OpenAI API request failed (HTTP ${response.status})`
      const code = errorBody?.error?.code || (response.status === 401 ? 'invalid_api_key' : undefined)
      return { error: message, code }
    }

    const data = await response.json()
    const message = data?.choices?.[0]?.message?.content?.trim()

    if (!message) {
      return { error: 'OpenAI returned an empty response' }
    }

    const parsed = parseTitlesFromMessage(message, numTracks)
    if (parsed && parsed.length > 0) {
      return { titles: parsed }
    }

    return { error: 'OpenAI returned a response that could not be parsed as track titles' }
  } catch (error) {
    console.error('Error calling OpenAI Vision:', error)
    return { error: error instanceof Error ? error.message : 'OpenAI request failed' }
  }
}

// Call Anthropic Vision API
async function callAnthropicVision(
  imageUrl: string,
  numTracks: number,
  settings: Record<string, string>,
  context?: { otherTracks?: string[]; currentTitle?: string; albumTitle?: string }
): Promise<VisionResult> {
  const apiKey = settings['anthropic_api_key']?.trim()
  const model = settings['anthropic_model']?.trim() || 'claude-3-5-sonnet-20241022'

  if (!apiKey) {
    return { error: 'No Anthropic API key configured' }
  }

  try {
    // Convert image to base64
    const base64Image = await imageUrlToBase64(imageUrl)
    if (!base64Image) {
      return { error: 'Failed to load cover art image' }
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
      const errorBody = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
      console.error('Anthropic Vision API error:', { model, status: response.status, error: errorBody })
      const message = errorBody?.error?.message || 'Anthropic API request failed'
      const code = errorBody?.error?.type || (response.status === 401 ? 'invalid_api_key' : undefined)
      return { error: message, code }
    }

    const data = await response.json()
    const message = data?.content?.[0]?.text?.trim()

    if (!message) {
      return { error: 'Anthropic returned an empty response' }
    }

    const parsed = parseTitlesFromMessage(message, numTracks)
    if (parsed && parsed.length > 0) {
      return { titles: parsed }
    }

    return { error: 'Anthropic returned a response that could not be parsed as track titles' }
  } catch (error) {
    console.error('Error calling Anthropic Vision:', error)
    return { error: error instanceof Error ? error.message : 'Anthropic request failed' }
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

    const { settings, keySources } = await getAISettingsForUserWithSources(user.id)
    const usesOwnAIKey = usesOwnResolvedAIKeys(keySources)

    if (!usesOwnAIKey) {
      const deduct = await deductCredits(user.id, 'ai_album_titles')
      if (!deduct.success) {
        const status = deduct.error === 'Insufficient credits' ? 402 : 400
        return NextResponse.json(
          {
            error: deduct.error,
            balance: deduct.balance,
            required: deduct.required,
            hint: 'Add your OpenAI key in /setup-ai to use your own account without Beatheos credits, or buy credits at /credits.',
          },
          { status }
        )
      }
    }

    const configuredChatModel = settings['openai_model'] || null
    const openaiModel = resolveOpenAIVisionModel(configuredChatModel)

    console.log('[generate-track-titles] AI key resolution:', {
      userId: user.id,
      openaiKeySource: keySources.openai,
      openaiKeyPath: KEY_SOURCE_PATHS[keySources.openai],
      anthropicKeySource: keySources.anthropic,
      anthropicKeyPath: KEY_SOURCE_PATHS[keySources.anthropic],
      hasOpenAI: !!settings['openai_api_key']?.trim(),
      hasAnthropic: !!settings['anthropic_api_key']?.trim(),
      configuredChatModel,
      openaiVisionModel: openaiModel,
      usesOwnAIKey,
    })

    // Try OpenAI Vision first
    const openaiResult = await callOpenAIVision(coverArtUrl, numTracks, settings, context)
    let titles: string[] | undefined
    let openaiError: { error: string; code?: string } | undefined
    let anthropicError: { error: string; code?: string } | undefined

    if ('titles' in openaiResult) {
      titles = openaiResult.titles
    } else {
      openaiError = openaiResult
      console.error('[generate-track-titles] OpenAI failed:', {
        code: openaiResult.code,
        error: openaiResult.error,
        keyPath: KEY_SOURCE_PATHS[keySources.openai],
        model: openaiModel,
      })
    }

    // Fallback to Anthropic only if OpenAI had no key; don't mask OpenAI errors
    if (!titles?.length && !settings['openai_api_key']?.trim()) {
      const anthropicResult = await callAnthropicVision(coverArtUrl, numTracks, settings, context)
      if ('titles' in anthropicResult) {
        titles = anthropicResult.titles
      } else {
        anthropicError = anthropicResult
        console.error('[generate-track-titles] Anthropic failed:', {
          code: anthropicResult.code,
          error: anthropicResult.error,
          keyPath: KEY_SOURCE_PATHS[keySources.anthropic],
        })
      }
    }

    if (!titles?.length) {
      const hasOpenAI = !!settings['openai_api_key']?.trim()
      const hasAnthropic = !!settings['anthropic_api_key']?.trim()
      const primaryError = openaiError || anthropicError

      if (!hasOpenAI && !hasAnthropic) {
        return NextResponse.json(
          {
            error: 'No AI API key found. Add your OpenAI key in /setup-ai (or configure global keys in /ai-settings).',
            debug: {
              openaiKeyPath: KEY_SOURCE_PATHS.none,
              anthropicKeyPath: KEY_SOURCE_PATHS.none,
            },
          },
          { status: 400 }
        )
      }

      const provider = openaiError ? 'openai' : 'anthropic'
      const keyPath = openaiError
        ? KEY_SOURCE_PATHS[keySources.openai]
        : KEY_SOURCE_PATHS[keySources.anthropic]
      const isInvalidKey = primaryError?.code === 'invalid_api_key'
      const updatePath =
        keySources.openai === 'user_api_keys' || keySources.anthropic === 'user_api_keys'
          ? '/setup-ai'
          : '/ai-settings'

      return NextResponse.json(
        {
          error: isInvalidKey
            ? `Invalid API key. Update your key in ${updatePath}.`
            : primaryError?.error || 'Failed to generate track titles. The AI service returned an error — try again in a moment.',
          debug: {
            openaiKeyPath: KEY_SOURCE_PATHS[keySources.openai],
            anthropicKeyPath: KEY_SOURCE_PATHS[keySources.anthropic],
            openaiModel,
            configuredChatModel: settings['openai_model'] || null,
            lastErrorCode: primaryError?.code,
            provider,
            keyPath,
            openaiError: openaiError?.error,
            anthropicError: anthropicError?.error,
          },
        },
        { status: isInvalidKey ? 401 : 500 }
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

