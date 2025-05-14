import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function PUT(request: Request) {
  try {
    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'Missing beat id' }, { status: 400 })

    const { error } = await supabase.rpc('increment_play_count', { beat_id: id })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
} 