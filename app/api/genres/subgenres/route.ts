import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

// GET /api/genres/subgenres?genre=Hip%20Hop
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const genre = searchParams.get('genre')
    
    if (!genre) {
      return NextResponse.json({ error: 'Genre parameter is required' }, { status: 400 })
    }
    
    const { data, error } = await supabase
      .from('genre_subgenres')
      .select('subgenre')
      .eq('genre', genre)
      .order('subgenre')
    
    if (error) {
      console.error('Error fetching subgenres:', error)
      return NextResponse.json({ error: 'Failed to fetch subgenres' }, { status: 500 })
    }
    
    const subgenres = data?.map(item => item.subgenre) || []
    return NextResponse.json({ subgenres })
  } catch (error) {
    console.error('Error in subgenres API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/genres/subgenres
export async function POST(request: NextRequest) {
  try {
    const { genre, subgenre } = await request.json()
    
    if (!genre || !subgenre) {
      return NextResponse.json({ error: 'Genre and subgenre are required' }, { status: 400 })
    }
    
    const { data, error } = await supabase
      .from('genre_subgenres')
      .insert([{ genre, subgenre }])
      .select()
    
    if (error) {
      console.error('Error creating subgenre:', error)
      return NextResponse.json({ error: 'Failed to create subgenre' }, { status: 500 })
    }
    
    return NextResponse.json({ success: true, data: data[0] })
  } catch (error) {
    console.error('Error in subgenres API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 