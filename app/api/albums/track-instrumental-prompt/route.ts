import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserFromRequest } from '@/lib/ai-api-helpers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { albumId, trackId, instrumentalPrompt } = body

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
      .select('id')
      .eq('id', trackId)
      .eq('album_id', albumId)
      .single()

    if (trackError || !track) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 })
    }

    const trimmed =
      typeof instrumentalPrompt === 'string' ? instrumentalPrompt.trim() : ''

    const { error: updateError } = await supabase
      .from('album_tracks')
      .update({ instrumental_prompt: trimmed || null })
      .eq('id', trackId)

    if (updateError) {
      console.error('[track-instrumental-prompt] update failed:', updateError)
      const message = updateError.message || 'Failed to save instrumental notes'
      const needsMigration =
        message.includes('instrumental_prompt') ||
        message.includes('column') ||
        updateError.code === 'PGRST204'

      return NextResponse.json(
        {
          error: needsMigration
            ? 'Database column missing. Run migration 091_add_instrumental_prompt_to_album_tracks.sql in Supabase.'
            : message,
          code: updateError.code,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      instrumentalPrompt: trimmed || null,
    })
  } catch (error) {
    console.error('[track-instrumental-prompt] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
