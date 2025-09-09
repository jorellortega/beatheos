import { NextRequest, NextResponse } from 'next/server'
import { SimpleLyricsService } from '@/lib/lyrics-simple-service'
import { supabase } from '@/lib/supabaseClient'

async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No authorization header')
  }

  const token = authHeader.substring(7)
  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error || !user) {
    throw new Error('Invalid token')
  }
  
  return user
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request)
    const lyrics = await SimpleLyricsService.getLyricsSessionById(params.id)
    
    if (!lyrics || lyrics.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Lyrics not found or access denied' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ success: true, lyrics })
  } catch (error) {
    console.error('Get lyrics by ID error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get lyrics' },
      { status: 401 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request)
    const body = await request.json()
    
    const lyrics = await SimpleLyricsService.updateLyricsSession(params.id, user.id, body)
    
    return NextResponse.json({ success: true, lyrics })
  } catch (error) {
    console.error('Update lyrics error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update lyrics' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request)
    
    await SimpleLyricsService.deleteLyricsSession(params.id, user.id)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete lyrics error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete lyrics' },
      { status: 500 }
    )
  }
}

