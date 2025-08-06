import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('id')
    const audioFileName = searchParams.get('audio_file_name')
    const userId = searchParams.get('user_id')
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    if (sessionId) {
      // Load specific session by ID
      const { data: session, error: fetchError } = await supabase
        .from('loop_editor_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .single()

      if (fetchError) {
        console.error('Error fetching session:', fetchError)
        return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      }

      return NextResponse.json({ 
        success: true, 
        session 
      })
    } else if (audioFileName) {
      // Load most recent session for specific audio file
      const { data: sessions, error: fetchError } = await supabase
        .from('loop_editor_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('audio_file_name', audioFileName)
        .order('updated_at', { ascending: false })
        .limit(1)

      if (fetchError) {
        console.error('Error fetching sessions:', fetchError)
        return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
      }

      if (sessions && sessions.length > 0) {
        return NextResponse.json({ 
          success: true, 
          session: sessions[0] 
        })
      } else {
        return NextResponse.json({ 
          success: false, 
          message: 'No sessions found for this audio file' 
        })
      }
    } else {
      // List all sessions for user
      const { data: sessions, error: fetchError } = await supabase
        .from('loop_editor_sessions')
        .select('id, name, description, audio_file_name, created_at, updated_at, is_draft, version')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })

      if (fetchError) {
        console.error('Error fetching sessions:', fetchError)
        return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        sessions: sessions || [] 
      })
    }

  } catch (error) {
    console.error('Error in load session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 