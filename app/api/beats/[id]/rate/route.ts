import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

// Helper to get beat UUID from slug or id
async function getBeatIdFromParam(param: string) {
  // Try to fetch by id (UUID)
  let { data: beat, error } = await supabase
    .from('beats')
    .select('id')
    .eq('id', param)
    .single()
  if (beat && beat.id) return beat.id
  // If not found, try by slug
  ;({ data: beat, error } = await supabase
    .from('beats')
    .select('id')
    .eq('slug', param)
    .single())
  if (beat && beat.id) return beat.id
  return null
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { rating } = await request.json()
    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Invalid rating value' }, { status: 400 })
    }
    const beatId = await getBeatIdFromParam(params.id)
    if (!beatId) {
      return NextResponse.json({ error: 'Beat not found' }, { status: 404 })
    }
    // Insert the rating as anonymous (no user_id)
    const { data, error } = await supabase
      .from('beat_ratings')
      .insert({ beat_id: beatId, rating })
      .select()
    if (error) {
      console.error('Error saving rating:', error)
      return NextResponse.json({ error: 'Failed to save rating' }, { status: 500 })
    }
    // Get average rating for the beat
    const { data: avgRating, error: avgError } = await supabase
      .from('beat_ratings')
      .select('rating')
      .eq('beat_id', beatId)
    if (avgError) {
      console.error('Error calculating average rating:', avgError)
      return NextResponse.json({ error: 'Failed to calculate average rating' }, { status: 500 })
    }
    const averageRating = avgRating.reduce((acc, curr) => acc + curr.rating, 0) / avgRating.length
    return NextResponse.json({
      message: 'Rating saved successfully',
      rating: data[0],
      averageRating: averageRating,
      totalRatings: avgRating.length
    })
  } catch (error) {
    console.error('Error in rate endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const beatId = await getBeatIdFromParam(params.id)
    if (!beatId) {
      return NextResponse.json({ error: 'Beat not found' }, { status: 404 })
    }
    // Get all ratings for the beat
    const { data: allRatings, error: avgError } = await supabase
      .from('beat_ratings')
      .select('rating')
      .eq('beat_id', beatId)
    if (avgError) {
      console.error('Error calculating average rating:', avgError)
      return NextResponse.json({ error: 'Failed to calculate average rating' }, { status: 500 })
    }
    const averageRating = allRatings.length > 0
      ? allRatings.reduce((acc, curr) => acc + curr.rating, 0) / allRatings.length
      : 0
    return NextResponse.json({
      averageRating: averageRating,
      totalRatings: allRatings.length
    })
  } catch (error) {
    console.error('Error in get rating endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 