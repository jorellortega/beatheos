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
    const contentType = searchParams.get('contentType')

    const assets = await SimpleLyricsService.getUserLyricsSessions(user.id, contentType || undefined)
    
    return NextResponse.json({ success: true, assets })
  } catch (error) {
    console.error('Get assets error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get assets' },
      { status: 401 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    const body = await request.json()
    
    const asset = await SimpleLyricsService.createLyricsSession(body, user.id)
    
    return NextResponse.json({ success: true, asset })
  } catch (error) {
    console.error('Create asset error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create asset' },
      { status: 500 }
    )
  }
}

