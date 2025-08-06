import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('id')
    const userId = searchParams.get('user_id')

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Delete session from database
    const { error: deleteError } = await supabase
      .from('loop_editor_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', userId)

    if (deleteError) {
      console.error('Error deleting session:', deleteError)
      return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Session deleted successfully' 
    })

  } catch (error) {
    console.error('Error in delete session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 