import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getUserFromRequest(req: Request) {
  console.log('🔍 [API] Getting user from request...')
  const authHeader = req.headers.get('authorization')
  console.log('🔍 [API] Auth header present:', !!authHeader)
  console.log('🔍 [API] Auth header preview:', authHeader ? `${authHeader.substring(0, 20)}...` : 'NONE')
  
  const token = authHeader?.replace('Bearer ', '')
  console.log('🔍 [API] Token length:', token?.length || 'NO TOKEN')
  
  if (!token) {
    console.log('❌ [API] No token found')
    return null
  }
  
  const { data: { user }, error } = await supabase.auth.getUser(token)
  console.log('🔍 [API] Supabase auth result:', { 
    user: user ? `${user.id} (${user.email})` : 'NO USER',
    error: error?.message || 'NO ERROR'
  })
  
  if (error || !user) {
    console.log('❌ [API] Auth failed:', error?.message || 'No user returned')
    return null
  }
  
  return user
}

export async function GET(request: Request) {
  try {
    console.log('🔍 [API] GET /api/label-artists called')
    
    // Use loop-editor approach - get user_id from query params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    
    console.log('🔍 [API] User ID from params:', userId)
    
    if (!userId) {
      console.log('❌ [API] No user_id parameter provided')
      return NextResponse.json({ error: 'user_id parameter is required' }, { status: 400 })
    }
    
    console.log('✅ [API] Using user_id (loop-editor style):', userId)
    const search = searchParams.get('search') || ''
    const genre = searchParams.get('genre') || ''
    const status = searchParams.get('status') || ''
    const priority = searchParams.get('priority') || ''
    const artistClass = searchParams.get('artist_class') || ''

    console.log('🔍 [API] Query params:', { search, genre, status, priority, artistClass })

    // Build query - Use base table instead of view for now
    let query = supabase
      .from('label_artists')
      .select('*')
      .order('created_at', { ascending: false })

    console.log('🔍 [API] Querying label_artists table...')

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,stage_name.ilike.%${search}%,email.ilike.%${search}%`)
    }
    if (genre) {
      query = query.eq('genre', genre)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (priority) {
      query = query.eq('priority', priority)
    }
    if (artistClass) {
      query = query.eq('artist_class', artistClass)
    }

    const { data: artists, error } = await query

    console.log('🔍 [API] Database query result:', { 
      success: !error, 
      artistsCount: artists?.length || 0,
      error: error?.message 
    })

    if (error) {
      console.error('❌ [API] Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('✅ [API] Returning artists:', artists?.length || 0)
    return NextResponse.json({ artists })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // Get user_id from request body (loop-editor style)
    const body = await request.json()
    const userId = body.user_id
    
    if (!userId) {
      return NextResponse.json({ error: 'user_id is required in request body' }, { status: 400 })
    }
    
    // Set managed_by to current user and exclude user_id from database insert
    const { user_id, ...bodyWithoutUserId } = body
    const artistData = {
      ...bodyWithoutUserId,
      managed_by: userId,
      social_media: body.social_media || {},
      distributors: body.distributors || [],
      tags: body.tags || []
    }

    const { data: artist, error } = await supabase
      .from('label_artists')
      .insert(artistData)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ artist })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    // Get user_id from request body (loop-editor style)
    const body = await request.json()
    const { id, user_id: userId, ...updateData } = body
    
    if (!userId) {
      return NextResponse.json({ error: 'user_id is required in request body' }, { status: 400 })
    }

    const { data: artist, error } = await supabase
      .from('label_artists')
      .update(updateData)
      .eq('id', id)
      .eq('managed_by', userId) // Only update artists managed by current user
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ artist })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    // Get user_id from query params (loop-editor style)
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const userId = searchParams.get('user_id')
    
    if (!userId) {
      return NextResponse.json({ error: 'user_id parameter is required' }, { status: 400 })
    }

    if (!id) {
      return NextResponse.json({ error: 'Artist ID required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('label_artists')
      .delete()
      .eq('id', id)
      .eq('managed_by', userId) // Only delete artists managed by current user

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
