import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserFromRequest, resolveElevenLabsApiKeyForUser } from '@/lib/ai-api-helpers'
import { ElevenLabsService } from '@/lib/ai-services'
import { pcm16ToWav } from '@/lib/pcm-to-wav'
import {
  buildFallbackSongPrompt,
  buildSongWithLyricsPrompt,
  ELEVENLABS_DEFAULT_MUSIC_LENGTH_MS,
} from '@/lib/elevenlabs-music-helpers'
import {
  ELEVENLABS_MUSIC_OUTPUT_FORMAT,
  ELEVENLABS_MUSIC_MP3_FALLBACK_FORMAT,
  ELEVENLABS_MUSIC_PCM_CHANNELS,
  ELEVENLABS_MUSIC_PCM_SAMPLE_RATE,
} from '@/lib/elevenlabs-config'

export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MIN_LENGTH_MS = 10_000
const MAX_LENGTH_MS = 240_000

function formatMusicErrorMessage(detail: unknown): string {
  if (!detail) return 'Music generation failed'
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

function isMusicApiKeyFormatError(message: string): boolean {
  return /must start with ['"]?sk_/i.test(message)
}

function isAuthApiKeyError(message: string, httpStatus?: number): boolean {
  if (isMusicApiKeyFormatError(message)) return false
  if (httpStatus === 401 || httpStatus === 403) return true
  const lower = message.toLowerCase()
  return (
    lower.includes('invalid api key') ||
    lower.includes('unauthorized') ||
    lower.includes('authentication')
  )
}

function buildMusicApiKeyErrorMessage(
  message: string,
  keyDebug?: Awaited<ReturnType<typeof resolveElevenLabsApiKeyForUser>>['debug']
): string {
  if (isMusicApiKeyFormatError(message)) {
    if (keyDebug?.selectedKeyStartsWithSkUnderscore) {
      return 'Music access is not enabled on your API key. Update the key permissions and try again.'
    }
    if (keyDebug?.selectedSource === 'user_api_keys') {
      return 'Your saved music API key is outdated. Add a new music-enabled key in Setup AI and try again.'
    }
    return 'A valid music API key is required. Add one in Setup AI and try again.'
  }

  const keyHint =
    keyDebug?.selectedSource === 'env' || keyDebug?.selectedSource === 'ai_settings'
      ? ' Your Setup AI key was not used — add your music key there.'
      : ' Check your music API key in Setup AI.'

  return message + keyHint
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

function prepareGeneratedAudioForStorage(
  audioBuffer: ArrayBuffer,
  outputFormat: string
): {
  fileBuffer: Buffer
  extension: 'wav' | 'mp3'
  contentType: string
} {
  if (outputFormat.startsWith('pcm_')) {
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

async function composeSong(
  prompt: string,
  apiKey: string,
  outputFormat: string,
  musicLengthMs: number,
  forceInstrumental: boolean
): Promise<{ audioBuffer: ArrayBuffer; songId: string | null }> {
  return ElevenLabsService.composeMusic({
    prompt,
    apiKey,
    modelId: 'music_v2',
    musicLengthMs,
    forceInstrumental,
    outputFormat,
    storeForInpainting: true,
  })
}

async function composeSongWithFallback(
  prompt: string,
  apiKey: string,
  musicLengthMs: number,
  forceInstrumental: boolean
): Promise<{ audioBuffer: ArrayBuffer; outputFormat: string; songId: string | null }> {
  const preferredFormat = ELEVENLABS_MUSIC_OUTPUT_FORMAT

  try {
    const composed = await composeSong(
      prompt,
      apiKey,
      preferredFormat,
      musicLengthMs,
      forceInstrumental
    )
    return {
      audioBuffer: composed.audioBuffer,
      outputFormat: preferredFormat,
      songId: composed.songId,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    const httpStatus =
      error && typeof error === 'object' && 'httpStatus' in error
        ? (error as { httpStatus?: number }).httpStatus
        : undefined

    const canFallbackToMp3 =
      preferredFormat !== ELEVENLABS_MUSIC_MP3_FALLBACK_FORMAT &&
      !isAuthApiKeyError(message, httpStatus)

    if (!canFallbackToMp3) {
      throw error
    }

    const composed = await composeSong(
      prompt,
      apiKey,
      ELEVENLABS_MUSIC_MP3_FALLBACK_FORMAT,
      musicLengthMs,
      forceInstrumental
    )
    return {
      audioBuffer: composed.audioBuffer,
      outputFormat: ELEVENLABS_MUSIC_MP3_FALLBACK_FORMAT,
      songId: composed.songId,
    }
  }
}

export async function POST(request: NextRequest) {
  let keyDebug: Awaited<ReturnType<typeof resolveElevenLabsApiKeyForUser>>['debug'] | undefined

  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const styleNotes = typeof body.styleNotes === 'string' ? body.styleNotes.trim() : ''
    const lyricsTextInput = typeof body.lyricsText === 'string' ? body.lyricsText.trim() : ''
    const lyricsSessionId =
      typeof body.lyricsSessionId === 'string' ? body.lyricsSessionId.trim() : ''
    const instrumental = body.instrumental === true
    const requestedLength = Number(body.musicLengthMs)
    const musicLengthMs = Number.isFinite(requestedLength)
      ? Math.min(Math.max(Math.round(requestedLength), MIN_LENGTH_MS), MAX_LENGTH_MS)
      : ELEVENLABS_DEFAULT_MUSIC_LENGTH_MS

    if (!title) {
      return NextResponse.json({ error: 'Song title is required' }, { status: 400 })
    }

    let lyricsText = lyricsTextInput
    let lyricsGenre: string | null = null
    let lyricsMood: string | null = null
    let resolvedLyricsSessionId: string | null = null

    if (lyricsSessionId) {
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('id, user_id, lyrics, lyrics_genre, lyrics_mood, lyrics_title, name')
        .eq('id', lyricsSessionId)
        .maybeSingle()

      if (sessionError || !session || session.user_id !== user.id) {
        return NextResponse.json({ error: 'Lyrics not found' }, { status: 404 })
      }
      lyricsText = session.lyrics?.trim() || lyricsText
      lyricsGenre = session.lyrics_genre || null
      lyricsMood = session.lyrics_mood || null
      resolvedLyricsSessionId = session.id
    }

    if (!instrumental && !lyricsText) {
      return NextResponse.json(
        {
          error:
            'Add lyrics or pick from your lyrics library. For instrumental-only, turn on Instrumental.',
        },
        { status: 400 }
      )
    }

    const resolved = await resolveElevenLabsApiKeyForUser(user.id)
    const { apiKey, source } = resolved
    keyDebug = resolved.debug

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'Music API key not configured. Add a valid key in Setup AI, or ask an admin to configure the platform music key.',
          debug: { keyResolution: keyDebug },
        },
        { status: 400 }
      )
    }

    console.log('[songs/generate] Using music key from:', source, keyDebug.selectedKeyPreview)

    let prompt = buildSongWithLyricsPrompt({
      title,
      styleNotes,
      lyricsText,
      genre: lyricsGenre,
      mood: lyricsMood,
      instrumental,
    })

    let audioBuffer: ArrayBuffer
    let outputFormat = ELEVENLABS_MUSIC_OUTPUT_FORMAT
    let elevenlabsSongId: string | null = null

    try {
      const composed = await composeSongWithFallback(
        prompt,
        apiKey,
        musicLengthMs,
        instrumental
      )
      audioBuffer = composed.audioBuffer
      outputFormat = composed.outputFormat
      elevenlabsSongId = composed.songId
    } catch (error) {
      const message = error instanceof Error ? error.message : formatMusicErrorMessage(error)
      if (!isTermsOfServiceError(message)) {
        throw error
      }

      prompt = buildFallbackSongPrompt({
        title,
        genre: lyricsGenre,
        mood: lyricsMood,
        instrumental,
      })
      const composed = await composeSongWithFallback(
        prompt,
        apiKey,
        musicLengthMs,
        instrumental
      )
      audioBuffer = composed.audioBuffer
      outputFormat = composed.outputFormat
      elevenlabsSongId = composed.songId
    }

    const { fileBuffer, extension, contentType } = prepareGeneratedAudioForStorage(
      audioBuffer,
      outputFormat
    )
    const filePath = `generated_songs/${user.id}/${Date.now()}_elevenlabs.${extension}`
    const { error: uploadError } = await supabase.storage
      .from('beats')
      .upload(filePath, fileBuffer, {
        contentType,
        upsert: true,
      })

    if (uploadError) {
      console.error('[songs/generate] upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload generated audio' }, { status: 500 })
    }

    const { data: publicUrlData } = supabase.storage.from('beats').getPublicUrl(filePath)
    const audioUrl = publicUrlData?.publicUrl

    if (!audioUrl) {
      return NextResponse.json({ error: 'Failed to get public URL for audio' }, { status: 500 })
    }

    let songId: string | null = null
    const { data: inserted, error: insertError } = await supabase
      .from('generated_songs')
      .insert({
        user_id: user.id,
        title,
        prompt,
        style_notes: styleNotes || null,
        lyrics_session_id: resolvedLyricsSessionId,
        lyrics_snapshot: lyricsText || null,
        audio_url: audioUrl,
        elevenlabs_song_id: elevenlabsSongId,
        elevenlabs_music_length_ms: musicLengthMs,
        instrumental,
        format: extension,
      })
      .select('id')
      .single()

    if (insertError) {
      console.warn('[songs/generate] generated_songs insert skipped:', insertError.message)
    } else {
      songId = inserted?.id ?? null
    }

    return NextResponse.json({
      success: true,
      id: songId,
      title,
      audioUrl,
      format: extension,
      prompt,
      instrumental,
      musicLengthMs,
      elevenlabsSongId,
      lyricsSessionId: resolvedLyricsSessionId,
    })
  } catch (error) {
    console.error('[songs/generate] error:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate song'
    const httpStatus =
      error && typeof error === 'object' && 'httpStatus' in error
        ? (error as { httpStatus?: number }).httpStatus
        : undefined
    const elevenLabsRaw =
      error && typeof error === 'object' && 'elevenLabsRaw' in error
        ? (error as { elevenLabsRaw?: unknown }).elevenLabsRaw
        : undefined

    const debugPayload = {
      keyResolution: keyDebug,
      elevenLabsHttpStatus: httpStatus,
      elevenLabsRaw,
      isAuthApiKeyError: isAuthApiKeyError(message, httpStatus),
    }

    if (isAuthApiKeyError(message, httpStatus) || isMusicApiKeyFormatError(message)) {
      return NextResponse.json(
        {
          error: buildMusicApiKeyErrorMessage(message, keyDebug),
          detail: message,
          debug: debugPayload,
        },
        { status: 400 }
      )
    }

    const status = isTermsOfServiceError(message) ? 400 : 500
    return NextResponse.json(
      {
        error: isTermsOfServiceError(message)
          ? 'This prompt was blocked by content policy. Soften the lyrics/style notes and try again.'
          : message,
        detail: message,
        debug: debugPayload,
      },
      { status }
    )
  }
}
