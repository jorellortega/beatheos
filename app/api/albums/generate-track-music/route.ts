import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserFromRequest } from '@/lib/ai-api-helpers'
import { ElevenLabsService } from '@/lib/ai-services'

export const maxDuration = 300

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const STYLE_TERM_ALIASES: Record<string, string> = {
  ratchet: 'high-energy party',
  gang: 'hard-hitting',
  gangsta: 'street-influenced',
  murder: 'intense',
  kill: 'aggressive',
  drug: 'gritty',
  explicit: 'edgy',
}

function sanitizeMusicText(text: string): string {
  let result = text
  for (const [term, replacement] of Object.entries(STYLE_TERM_ALIASES)) {
    result = result.replace(new RegExp(`\\b${term}\\b`, 'gi'), replacement)
  }
  return result.replace(/\s+/g, ' ').trim()
}

function extractStyleTags(description?: string | null): string {
  if (!description?.trim()) return ''

  const tags = description
    .split(/[,;|]/)
    .map(tag => sanitizeMusicText(tag.trim()))
    .filter(tag => tag.length > 0 && tag.length < 40)

  return tags.slice(0, 8).join(', ')
}

function buildMusicPrompt(
  trackTitle: string,
  album: { title: string; description?: string | null }
): string {
  const trackConcept = sanitizeMusicText(trackTitle)
  const styleTags = extractStyleTags(album.description)

  const parts = [
    'Instrumental only. No vocals. No singing. No lyrics.',
    'Create an original instrumental music production.',
    `Track concept inspired by the title "${trackConcept}".`,
  ]

  if (styleTags) {
    parts.push(`Musical style and mood: ${styleTags}.`)
  } else {
    parts.push('Musical style: modern hip-hop instrumental with polished studio production.')
  }

  parts.push(
    'Use drums, bass, synths, and melody only. Match tempo and energy to the track concept. Professional mix quality suitable for a commercial music release. Instrumental beat — no vocals.'
  )

  return parts.join(' ')
}

function buildFallbackMusicPrompt(styleTags: string): string {
  const style = styleTags || 'trap, dark, energetic, bouncy, party'
  return [
    'Instrumental only. No vocals. No singing. No lyrics.',
    `Style: ${style}.`,
    'Dark atmospheric synths, punchy drums, deep 808 bass, club-ready energy, professional hip-hop production. Instrumental beat — no vocals.',
  ].join(' ')
}

function isTermsOfServiceError(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes('terms of service') ||
    lower.includes('content policy') ||
    lower.includes('violated') ||
    lower.includes('not allowed')
  )
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { albumId, trackId } = body

    if (!albumId || !trackId) {
      return NextResponse.json(
        { error: 'Missing required fields: albumId, trackId' },
        { status: 400 }
      )
    }

    const { data: album, error: albumError } = await supabase
      .from('albums')
      .select('id, title, description, user_id')
      .eq('id', albumId)
      .single()

    if (albumError || !album) {
      return NextResponse.json({ error: 'Album not found' }, { status: 404 })
    }

    if (album.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: track, error: trackError } = await supabase
      .from('album_tracks')
      .select('id, title, album_id')
      .eq('id', trackId)
      .eq('album_id', albumId)
      .single()

    if (trackError || !track) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 })
    }

    const { data: apiKeys } = await supabase
      .from('user_api_keys')
      .select('elevenlabs_api_key')
      .eq('user_id', user.id)
      .single()

    const apiKey = apiKeys?.elevenlabs_api_key || process.env.ELEVENLABS_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured. Add your key in Setup AI.' },
        { status: 400 }
      )
    }

    const styleTags = extractStyleTags(album.description)
    let prompt = buildMusicPrompt(track.title, album)
    let audioBuffer: ArrayBuffer

    try {
      audioBuffer = await ElevenLabsService.composeMusic({
        prompt,
        apiKey,
        modelId: 'music_v2',
        musicLengthMs: 120000,
        forceInstrumental: true,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (!isTermsOfServiceError(message)) {
        throw error
      }

      prompt = buildFallbackMusicPrompt(styleTags)
      audioBuffer = await ElevenLabsService.composeMusic({
        prompt,
        apiKey,
        modelId: 'music_v2',
        musicLengthMs: 120000,
        forceInstrumental: true,
      })
    }

    const filePath = `album_tracks/${albumId}/${trackId}_elevenlabs_${Date.now()}.mp3`
    const { error: uploadError } = await supabase.storage
      .from('beats')
      .upload(filePath, Buffer.from(audioBuffer), {
        contentType: 'audio/mpeg',
        upsert: true,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload generated audio' }, { status: 500 })
    }

    const { data: publicUrlData } = supabase.storage.from('beats').getPublicUrl(filePath)
    const audioUrl = publicUrlData?.publicUrl

    if (!audioUrl) {
      return NextResponse.json({ error: 'Failed to get public URL for audio' }, { status: 500 })
    }

    const { error: updateError } = await supabase
      .from('album_tracks')
      .update({ audio_url: audioUrl })
      .eq('id', trackId)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update track audio' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      audioUrl,
      prompt,
    })
  } catch (error) {
    console.error('Generate track music error:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate music'
    const status = isTermsOfServiceError(message) ? 400 : 500

    return NextResponse.json(
      {
        error: isTermsOfServiceError(message)
          ? 'ElevenLabs blocked this prompt due to content policy. Try a different track title or album description.'
          : message,
      },
      { status }
    )
  }
}
