import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserFromRequest } from '@/lib/ai-api-helpers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('generated_songs')
      .select(
        'id, title, prompt, style_notes, lyrics_session_id, audio_url, elevenlabs_song_id, elevenlabs_music_length_ms, instrumental, format, created_at'
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      // Table may not exist until migration is applied
      console.warn('[songs/list]', error.message)
      return NextResponse.json({ success: true, songs: [], warning: error.message })
    }

    return NextResponse.json({ success: true, songs: data ?? [] })
  } catch (error) {
    console.error('[songs/list] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list songs' },
      { status: 500 }
    )
  }
}
