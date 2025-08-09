import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get current user
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: platforms, error } = await supabase
      .from('label_artist_streaming_platforms')
      .select('*')
      .eq('label_artist_id', params.id)
      .order('monthly_listeners', { ascending: false, nullsLast: true })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform to match frontend expectations
    const streamingPlatforms: Record<string, any> = {}
    platforms?.forEach(platform => {
      streamingPlatforms[platform.platform] = {
        monthly_listeners: platform.monthly_listeners,
        followers: platform.followers,
        streams: platform.streams,
        subscribers: platform.subscribers,
        plays: platform.plays,
        verified: platform.verified,
        profile_url: platform.profile_url
      }
    })

    return NextResponse.json({ streaming_platforms: streamingPlatforms })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get current user
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    const platformData = {
      label_artist_id: params.id,
      platform: body.platform,
      monthly_listeners: body.monthly_listeners,
      followers: body.followers,
      streams: body.streams,
      subscribers: body.subscribers,
      plays: body.plays,
      verified: body.verified || false,
      profile_url: body.profile_url,
      data_source: 'manual'
    }

    const { data: platform, error } = await supabase
      .from('label_artist_streaming_platforms')
      .upsert(platformData, { 
        onConflict: 'label_artist_id,platform',
        ignoreDuplicates: false 
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ platform })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get current user
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const platform = searchParams.get('platform')

    if (!platform) {
      return NextResponse.json({ error: 'Platform required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('label_artist_streaming_platforms')
      .delete()
      .eq('label_artist_id', params.id)
      .eq('platform', platform)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
