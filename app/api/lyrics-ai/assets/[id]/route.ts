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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    const { id } = await params
    const asset = await SimpleLyricsService.getLyricsSessionById(id)
    
    if (!asset || asset.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ success: true, asset })
  } catch (error) {
    console.error('Get asset error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get asset' },
      { status: 401 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    const body = await request.json()
    const { id } = await params
    
    const asset = await SimpleLyricsService.updateLyricsSession(id, user.id, body)
    
    return NextResponse.json({ success: true, asset })
  } catch (error) {
    console.error('Update asset error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update asset' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    const { id } = await params
    
    await SimpleLyricsService.deleteLyricsSession(id, user.id)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete asset error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete asset' },
      { status: 500 }
    )
  }
}
