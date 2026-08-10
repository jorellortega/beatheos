import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserFromRequest, resolveElevenLabsApiKeyForUser } from '@/lib/ai-api-helpers'
import { ElevenLabsService } from '@/lib/ai-services'
import { pcm16ToWav } from '@/lib/pcm-to-wav'
import {
  ELEVENLABS_DEFAULT_MUSIC_LENGTH_MS,
  isElevenLabsGeneratedAudioUrl,
} from '@/lib/elevenlabs-music-helpers'
import {
  ELEVENLABS_MUSIC_PCM_CHANNELS,
  ELEVENLABS_MUSIC_PCM_SAMPLE_RATE,
  ELEVENLABS_MUSIC_WAV_OUTPUT_FORMAT,
} from '@/lib/elevenlabs-config'
import { sanitizeDownloadFilename } from '@/lib/download-album-zip'

export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
      .select('id, user_id')
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
      .select('id, title, audio_url, elevenlabs_song_id, elevenlabs_music_length_ms')
      .eq('id', trackId)
      .eq('album_id', albumId)
      .single()

    if (trackError || !track) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 })
    }

    if (!track.elevenlabs_song_id) {
      const isElevenLabsAudio = isElevenLabsGeneratedAudioUrl(track.audio_url)
      return NextResponse.json(
        {
          error: isElevenLabsAudio
            ? 'WAV export is not available for this older instrumental. Regenerate the instrumental to enable ElevenLabs WAV download.'
            : 'This track was not generated with ElevenLabs.',
        },
        { status: 400 }
      )
    }

    const { apiKey } = await resolveElevenLabsApiKeyForUser(user.id)
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured. Add one in Setup AI.' },
        { status: 400 }
      )
    }

    const musicLengthMs = track.elevenlabs_music_length_ms || ELEVENLABS_DEFAULT_MUSIC_LENGTH_MS

    const pcmBuffer = await ElevenLabsService.composeStoredMusicWav({
      songId: track.elevenlabs_song_id,
      musicLengthMs,
      apiKey,
      outputFormat: ELEVENLABS_MUSIC_WAV_OUTPUT_FORMAT,
    })

    const wavBuffer = pcm16ToWav(pcmBuffer, {
      sampleRate: ELEVENLABS_MUSIC_PCM_SAMPLE_RATE,
      channels: ELEVENLABS_MUSIC_PCM_CHANNELS,
    })

    const filename = `${sanitizeDownloadFilename(track.title || 'track')}.wav`

    return new NextResponse(new Uint8Array(wavBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[download-track-music-wav] error:', error)
    const message = error instanceof Error ? error.message : 'Failed to download WAV from ElevenLabs'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
