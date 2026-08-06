import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserFromRequest } from '@/lib/ai-api-helpers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function isMissingTableError(message: string, code?: string): boolean {
  return (
    code === 'PGRST204' ||
    code === '42P01' ||
    message.includes('saved_music_prompts') ||
    message.includes('does not exist')
  )
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('saved_music_prompts')
      .select('id, name, prompt, created_at, updated_at')
      .eq('user_id', user.id)
      .order('name', { ascending: true })

    if (error) {
      if (isMissingTableError(error.message, error.code)) {
        return NextResponse.json({ prompts: [], needsMigration: true })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ prompts: data ?? [] })
  } catch (error) {
    console.error('[music-prompts] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''

    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 })
    }
    if (!prompt || prompt.length < 5) {
      return NextResponse.json({ error: 'Prompt must be at least 5 characters' }, { status: 400 })
    }

    const { data: existing } = await supabase
      .from('saved_music_prompts')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', name)
      .maybeSingle()

    let result
    if (existing?.id) {
      result = await supabase
        .from('saved_music_prompts')
        .update({ prompt, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select('id, name, prompt, created_at, updated_at')
        .single()
    } else {
      result = await supabase
        .from('saved_music_prompts')
        .insert({ user_id: user.id, name, prompt })
        .select('id, name, prompt, created_at, updated_at')
        .single()
    }

    if (result.error) {
      if (isMissingTableError(result.error.message, result.error.code)) {
        return NextResponse.json(
          {
            error:
              'Run migration 092_create_saved_music_prompts.sql in Supabase to enable saved music prompts.',
            needsMigration: true,
          },
          { status: 400 }
        )
      }
      return NextResponse.json({ error: result.error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, prompt: result.data })
  } catch (error) {
    console.error('[music-prompts] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = request.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Missing prompt id' }, { status: 400 })
    }

    const { error } = await supabase
      .from('saved_music_prompts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      if (isMissingTableError(error.message, error.code)) {
        return NextResponse.json(
          {
            error:
              'Run migration 092_create_saved_music_prompts.sql in Supabase to enable saved music prompts.',
            needsMigration: true,
          },
          { status: 400 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[music-prompts] DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
