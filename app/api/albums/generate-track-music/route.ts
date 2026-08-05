import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserFromRequest, resolveElevenLabsApiKeyForUser } from '@/lib/ai-api-helpers'
import { ElevenLabsService } from '@/lib/ai-services'
import { pcm16ToWav } from '@/lib/pcm-to-wav'
import {
  ELEVENLABS_MUSIC_OUTPUT_FORMAT,
  ELEVENLABS_MUSIC_PCM_CHANNELS,
  ELEVENLABS_MUSIC_PCM_SAMPLE_RATE,
} from '@/lib/elevenlabs-config'

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

function extractStyleTags(album: { description?: string | null; genre?: string | null; subgenre?: string | null }): string {
  const parts = [album.genre, album.subgenre, album.description]
    .filter((value): value is string => !!value?.trim())
    .flatMap((value) =>
      value
        .split(/[,;|]/)
        .map((tag) => sanitizeMusicText(tag.trim()))
        .filter((tag) => tag.length > 0 && tag.length < 40)
    )

  return [...new Set(parts)].slice(0, 8).join(', ')
}

function buildMusicPrompt(
  trackTitle: string,
  album: { title: string; description?: string | null; genre?: string | null; subgenre?: string | null }
): string {
  const trackConcept = sanitizeMusicText(trackTitle)
  const styleTags = extractStyleTags(album)

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

function formatElevenLabsErrorMessage(detail: unknown): string {
  if (!detail) return 'ElevenLabs music generation failed'
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object' && 'msg' in item) return String(item.msg)
        if (item && typeof item === 'object' && 'message' in item) return String(item.message)
        return JSON.stringify(item)
      })
      .join('; ')
  }
  if (typeof detail === 'object' && detail !== null && 'message' in detail) {
    return String((detail as { message?: string }).message)
  }
  return JSON.stringify(detail)
}

function isMisconfiguredApiKeyError(message: string): boolean {
  return /must start with ['"]?sk_/i.test(message)
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

function prepareGeneratedAudioForStorage(audioBuffer: ArrayBuffer): {
  fileBuffer: Buffer
  extension: 'wav' | 'mp3'
  contentType: string
} {
  if (ELEVENLABS_MUSIC_OUTPUT_FORMAT.startsWith('pcm_')) {
    return {
      fileBuffer: pcm16ToWav(audioBuffer, {
        sampleRate: ELEVENLABS_MUSIC_PCM_SAMPLE_RATE,
        channels: ELEVENLABS_MUSIC_PCM_CHANNELS,
      }),
      extension: 'wav',
      contentType: 'audio/wav',
    }
  }

  return {
    fileBuffer: Buffer.from(audioBuffer),
    extension: 'mp3',
    contentType: 'audio/mpeg',
  }
}

async function composeTrackMusic(prompt: string, apiKey: string): Promise<ArrayBuffer> {
  return ElevenLabsService.composeMusic({
    prompt,
    apiKey,
    modelId: 'music_v2',
    musicLengthMs: 120000,
    forceInstrumental: true,
    outputFormat: ELEVENLABS_MUSIC_OUTPUT_FORMAT,
  })
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
      .select('id, title, description, genre, subgenre, user_id')
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

    const { apiKey, source } = await resolveElevenLabsApiKeyForUser(user.id)

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'ElevenLabs API key not configured. Add a valid key in Setup AI, or ask an admin to set the platform ElevenLabs key.',
        },
        { status: 400 }
      )
    }

    console.log('[generate-track-music] Using ElevenLabs key from:', source)

    const styleTags = extractStyleTags(album)
    let prompt = buildMusicPrompt(track.title, album)
    let audioBuffer: ArrayBuffer

    try {
      audioBuffer = await composeTrackMusic(prompt, apiKey)
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (!isTermsOfServiceError(message)) {
        throw error
      }

      prompt = buildFallbackMusicPrompt(styleTags)
      audioBuffer = await composeTrackMusic(prompt, apiKey)
    }

    const { fileBuffer, extension, contentType } = prepareGeneratedAudioForStorage(audioBuffer)
    const filePath = `album_tracks/${albumId}/${trackId}_elevenlabs_${Date.now()}.${extension}`
    const { error: uploadError } = await supabase.storage
      .from('beats')
      .upload(filePath, fileBuffer, {
        contentType,
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
      format: extension,
      prompt,
    })
  } catch (error) {
    console.error('Generate track music error:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate music'

    if (isMisconfiguredApiKeyError(message)) {
      return NextResponse.json(
        {
          error:
            'Invalid ElevenLabs API key. If you saved an OpenAI or Stripe key in Setup AI under ElevenLabs, remove it and add your ElevenLabs key (from elevenlabs.io → API Keys), or clear Setup AI to use the platform key.',
        },
        { status: 400 }
      )
    }

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
