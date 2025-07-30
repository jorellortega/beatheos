import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SearchArrangementsRequest } from '@/types/arrangements'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body: SearchArrangementsRequest = await request.json()
    const { filters, limit = 20, offset = 0 } = body
    const { 
      searchTerm, 
      category, 
      hasDrops, 
      hasCuts, 
      minBars, 
      maxBars, 
      isFavorite, 
      isTemplate 
    } = filters

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

    // Build the query
    let query = supabase
      .from('track_arrangements')
      .select(`
        id,
        track_name,
        name,
        category,
        total_bars,
        pattern_blocks,
        created_at,
        is_favorite,
        is_template
      `)
      .eq('user_id', user.id)

    // Apply filters
    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,track_name.ilike.%${searchTerm}%`)
    }

    if (category) {
      query = query.eq('category', category)
    }

    if (minBars) {
      query = query.gte('total_bars', minBars)
    }

    if (maxBars) {
      query = query.lte('total_bars', maxBars)
    }

    if (isFavorite !== undefined) {
      query = query.eq('is_favorite', isFavorite)
    }

    if (isTemplate !== undefined) {
      query = query.eq('is_template', isTemplate)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)
    query = query.order('last_used_at', { ascending: false, nullsLast: true })
    query = query.order('created_at', { ascending: false })

    const { data: arrangements, error } = await query

    if (error) {
      console.error('Error searching arrangements:', error)
      return NextResponse.json({ error: 'Failed to search arrangements' }, { status: 500 })
    }

    // Filter by pattern characteristics (drops, cuts) in memory since JSONB filtering is complex
    let filteredArrangements = arrangements || []
    
    if (hasDrops !== undefined) {
      filteredArrangements = filteredArrangements.filter(arrangement => {
        try {
          const patternBlocks = JSON.parse(arrangement.pattern_blocks)
          const hasDropPatterns = patternBlocks.some((block: any) => 
            block.name?.toLowerCase().includes('drop') || 
            block.name?.toLowerCase().includes('breakdown')
          )
          return hasDrops === hasDropPatterns
        } catch {
          return false
        }
      })
    }

    if (hasCuts !== undefined) {
      filteredArrangements = filteredArrangements.filter(arrangement => {
        try {
          const patternBlocks = JSON.parse(arrangement.pattern_blocks)
          const hasCutPatterns = patternBlocks.some((block: any) => 
            block.name?.toLowerCase().includes('cut') || 
            block.name?.toLowerCase().includes('split')
          )
          return hasCuts === hasCutPatterns
        } catch {
          return false
        }
      })
    }

    // Format the response
    const formattedResults = filteredArrangements.map(arrangement => {
      let patternCount = 0
      try {
        const patternBlocks = JSON.parse(arrangement.pattern_blocks)
        patternCount = patternBlocks.length
      } catch {
        patternCount = 0
      }

      return {
        arrangementId: arrangement.id,
        trackName: arrangement.track_name,
        arrangementName: arrangement.name,
        category: arrangement.category,
        totalBars: arrangement.total_bars,
        patternCount,
        createdAt: arrangement.created_at,
        isFavorite: arrangement.is_favorite,
        isTemplate: arrangement.is_template,
      }
    })

    return NextResponse.json({ 
      success: true, 
      arrangements: formattedResults,
      total: formattedResults.length,
      limit,
      offset
    })

  } catch (error) {
    console.error('Error in search arrangements route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 