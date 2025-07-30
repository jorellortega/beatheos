import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { LoadArrangementRequest } from '@/types/arrangements'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body: LoadArrangementRequest = await request.json()
    const { arrangementId, versionNumber } = body

    // Get the current user
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Validate required fields
    if (!arrangementId) {
      return NextResponse.json({ error: 'Missing arrangementId' }, { status: 400 })
    }

    // Load the arrangement
    const { data: arrangement, error } = await supabase
      .from('track_arrangements')
      .select(`
        *,
        arrangement_versions (
          id,
          version_number,
          name,
          description,
          pattern_blocks,
          total_bars,
          created_at
        ),
        arrangement_tags (
          tag_name
        )
      `)
      .eq('id', arrangementId)
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Error loading arrangement:', error)
      return NextResponse.json({ error: 'Failed to load arrangement' }, { status: 500 })
    }

    if (!arrangement) {
      return NextResponse.json({ error: 'Arrangement not found' }, { status: 404 })
    }

    // Get the specific version or latest version
    let versionData
    if (versionNumber) {
      versionData = arrangement.arrangement_versions?.find(v => v.version_number === versionNumber)
      if (!versionData) {
        return NextResponse.json({ error: 'Version not found' }, { status: 404 })
      }
    } else {
      // Get latest version
      versionData = arrangement.arrangement_versions?.sort((a, b) => b.version_number - a.version_number)[0]
      if (!versionData) {
        return NextResponse.json({ error: 'No versions found' }, { status: 404 })
      }
    }

    // Update last_used_at timestamp
    await supabase
      .from('track_arrangements')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', arrangementId)

    // Format the response
    const formattedArrangement = {
      id: arrangement.id,
      userId: arrangement.user_id,
      sessionId: arrangement.session_id,
      trackId: arrangement.track_id,
      trackName: arrangement.track_name,
      name: arrangement.name,
      description: arrangement.description,
      version: arrangement.version,
      patternBlocks: JSON.parse(versionData.pattern_blocks),
      totalBars: versionData.total_bars,
      zoomLevel: arrangement.zoom_level,
      bpm: arrangement.bpm,
      steps: arrangement.steps,
      tags: arrangement.arrangement_tags?.map(t => t.tag_name) || [],
      category: arrangement.category,
      isFavorite: arrangement.is_favorite,
      isTemplate: arrangement.is_template,
      createdAt: arrangement.created_at,
      updatedAt: arrangement.updated_at,
      lastUsedAt: arrangement.last_used_at,
      currentVersion: {
        id: versionData.id,
        versionNumber: versionData.version_number,
        name: versionData.name,
        description: versionData.description,
        createdAt: versionData.created_at,
      },
      availableVersions: arrangement.arrangement_versions?.map(v => ({
        id: v.id,
        versionNumber: v.version_number,
        name: v.name,
        description: v.description,
        createdAt: v.created_at,
      })) || [],
    }

    return NextResponse.json({ 
      success: true, 
      arrangement: formattedArrangement
    })

  } catch (error) {
    console.error('Error in load arrangement route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 