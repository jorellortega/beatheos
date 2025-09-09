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

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('search')

    let lyrics
    if (query) {
      lyrics = await SimpleLyricsService.searchLyricsSessions(user.id, query)
    } else {
      lyrics = await SimpleLyricsService.getUserLyricsSessions(user.id)
    }
    
    return NextResponse.json({ success: true, lyrics })
  } catch (error) {
    console.error('Get lyrics error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get lyrics' },
      { status: 401 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    const body = await request.json()
    
    const lyrics = await SimpleLyricsService.createLyricsSession(body, user.id)
    
    return NextResponse.json({ success: true, lyrics })
  } catch (error) {
    console.error('Create lyrics error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create lyrics' },
      { status: 500 }
    )
  }
}

