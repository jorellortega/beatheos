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
    console.log('🔍 [API] Filtering by managed_by:', userId)

    // Filter by managed_by to only show artists managed by this user
    // Use a PostgREST filter: managed_by equals userId OR managed_by is null
    query = query.or(`managed_by.eq.${userId},managed_by.is.null`)

    // Apply additional filters
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
      error: error?.message,
      sampleManagedBy: artists?.[0]?.managed_by || 'N/A'
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
    
    // Generate slug from stage_name or name
    const slugify = (text: string) => {
      return text.toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
    }
    
    const baseName = body.stage_name || body.name || 'artist'
    let slug = slugify(baseName)
    
    // Check if slug exists and make it unique if needed
    let slugCounter = 1
    let finalSlug = slug
    while (true) {
      const { data: existing } = await supabase
        .from('label_artists')
        .select('id')
        .eq('slug', finalSlug)
        .maybeSingle()
      
      if (!existing) break
      finalSlug = `${slug}-${slugCounter}`
      slugCounter++
    }
    
    const artistData = {
      ...bodyWithoutUserId,
      managed_by: userId,
      slug: finalSlug,
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

    if (!id) {
      return NextResponse.json({ error: 'Artist ID is required' }, { status: 400 })
    }

    console.log('🔍 [API] PUT /api/label-artists - Updating artist:', { id, userId, updateDataKeys: Object.keys(updateData) })

    // First check if the artist exists and is managed by this user
    const { data: existingArtist, error: checkError } = await supabase
      .from('label_artists')
      .select('id, managed_by')
      .eq('id', id)
      .single()

    if (checkError || !existingArtist) {
      console.error('🔍 [API] Artist not found or error checking:', checkError)
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 })
    }

    // Check if user manages this artist (or if managed_by is null, allow update)
    if (existingArtist.managed_by && existingArtist.managed_by !== userId) {
      console.error('🔍 [API] User does not manage this artist')
      return NextResponse.json({ error: 'You do not have permission to update this artist' }, { status: 403 })
    }

    // Generate slug if stage_name or name is being updated
    if (updateData.stage_name || updateData.name) {
      const slugify = (text: string) => {
        return text.toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-')
          .replace(/^-+|-+$/g, '')
      }
      
      // Get current artist data to check existing slug
      const { data: currentArtist } = await supabase
        .from('label_artists')
        .select('stage_name, name, slug')
        .eq('id', id)
        .single()
      
      const newStageName = updateData.stage_name || currentArtist?.stage_name
      const newName = updateData.name || currentArtist?.name
      const baseName = newStageName || newName || 'artist'
      let slug = slugify(baseName)
      
      // Check if slug exists (excluding current artist) and make it unique if needed
      let slugCounter = 1
      let finalSlug = slug
      while (true) {
        const { data: existing } = await supabase
          .from('label_artists')
          .select('id')
          .eq('slug', finalSlug)
          .neq('id', id)
          .maybeSingle()
        
        if (!existing) break
        finalSlug = `${slug}-${slugCounter}`
        slugCounter++
      }
      
      updateData.slug = finalSlug
    }

    // Update the artist
    const { data: artist, error } = await supabase
      .from('label_artists')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('🔍 [API] Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!artist) {
      return NextResponse.json({ error: 'Artist update failed - no rows updated' }, { status: 500 })
    }

    console.log('✅ [API] Artist updated successfully')
    return NextResponse.json({ artist })
  } catch (error) {
    console.error('🔍 [API] API error:', error)
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

    console.log('🔍 [API] DELETE /api/label-artists - Deleting artist:', { id, userId })

    // First check if the artist exists (without permission filter)
    const { data: existingArtist, error: checkError } = await supabase
      .from('label_artists')
      .select('id, managed_by')
      .eq('id', id)
      .single()

    if (checkError || !existingArtist) {
      console.error('🔍 [API] Artist not found:', checkError)
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 })
    }

    console.log('🔍 [API] Found artist with managed_by:', existingArtist.managed_by, 'User ID:', userId)

    // Check permission: allow if managed_by is null OR matches userId
    // This matches the GET filter logic
    if (existingArtist.managed_by !== null && existingArtist.managed_by !== userId) {
      console.error('🔍 [API] Permission denied - managed_by:', existingArtist.managed_by, 'does not match userId:', userId)
      return NextResponse.json({ error: 'You do not have permission to delete this artist' }, { status: 403 })
    }

    console.log('✅ [API] Permission granted - proceeding with deletion')

    // Delete the artist
    const { error } = await supabase
      .from('label_artists')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('🔍 [API] Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('✅ [API] Artist deleted successfully')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
