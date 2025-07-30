import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SaveArrangementRequest } from '@/types/arrangements'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body: SaveArrangementRequest = await request.json()
    const { 
      trackId, 
      trackName, 
      name, 
      description, 
      patternBlocks, 
      totalBars, 
      zoomLevel, 
      bpm, 
      steps, 
      tags, 
      category, 
      genre, 
      subgenre, 
      audioType, 
      isFavorite, 
      isTemplate, 
      sessionId 
    } = body

    // Get the current user
    const authHeader = request.headers.get('authorization')
    console.log('Auth header present:', !!authHeader)
    
    if (!authHeader) {
      console.log('No authorization header found')
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('Token length:', token.length)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    if (!user) {
      console.log('No user found')
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    console.log('User authenticated:', user.id)

    // Validate required fields
    if (!trackId || !trackName || !name || !patternBlocks) {
      return NextResponse.json({ 
        error: 'Missing required fields: trackId, trackName, name, patternBlocks' 
      }, { status: 400 })
    }

    // Save the arrangement
    const { data: arrangement, error } = await supabase
      .from('track_arrangements')
      .insert({
        user_id: user.id,
        session_id: sessionId,
        track_id: trackId,
        track_name: trackName,
        name,
        description,
        pattern_blocks: JSON.stringify(patternBlocks),
        total_bars: totalBars,
        zoom_level: zoomLevel,
        bpm,
        steps,
        tags: tags ? JSON.stringify(tags) : null,
        category,
        genre,
        subgenre,
        audio_type: audioType,
        is_favorite: isFavorite || false,
        is_template: isTemplate || false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving arrangement:', error)
      return NextResponse.json({ error: 'Failed to save arrangement' }, { status: 500 })
    }

    // Create initial version
    const { error: versionError } = await supabase
      .from('arrangement_versions')
      .insert({
        arrangement_id: arrangement.id,
        version_number: 1,
        name: 'Initial version',
        description: 'First version of this arrangement',
        pattern_blocks: JSON.stringify(patternBlocks),
        total_bars: totalBars,
      })

    if (versionError) {
      console.error('Error creating initial version:', versionError)
      // Don't fail the whole request if version creation fails
    }

    // Save tags separately if provided
    if (tags && tags.length > 0) {
      const tagInserts = tags.map(tag => ({
        arrangement_id: arrangement.id,
        tag_name: tag,
      }))

      const { error: tagError } = await supabase
        .from('arrangement_tags')
        .insert(tagInserts)

      if (tagError) {
        console.error('Error saving tags:', tagError)
        // Don't fail the whole request if tag creation fails
      }
    }

    return NextResponse.json({ 
      success: true, 
      arrangement: {
        ...arrangement,
        patternBlocks: JSON.parse(arrangement.pattern_blocks),
        tags: arrangement.tags ? JSON.parse(arrangement.tags) : [],
      }
    })

  } catch (error) {
    console.error('Error in save arrangement route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 