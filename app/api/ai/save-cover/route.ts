import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { coverUrl, coverSize, prompt, storagePath, userId, name } = body

    if (!coverUrl || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: coverUrl, userId' },
        { status: 400 }
      )
    }

    console.log('💾 SAVE-COVER - Saving cover:', {
      userId,
      coverSize,
      storagePath: storagePath?.substring(0, 100)
    })

    // Insert cover record into database
    const { data, error } = await supabase
      .from('user_ai_covers')
      .insert({
        user_id: userId,
        name: name || null,
        cover_url: coverUrl,
        cover_size: coverSize || null,
        prompt: prompt || null,
        storage_path: storagePath || null
      })
      .select()
      .single()

    if (error) {
      console.error('💾 SAVE-COVER - Database error:', error)
      throw new Error(`Failed to save cover: ${error.message}`)
    }

    console.log('💾 SAVE-COVER - Success:', data.id)

    return NextResponse.json({
      success: true,
      cover: data
    })
  } catch (error: any) {
    console.error('💾 SAVE-COVER - Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to save cover' 
      },
      { status: 500 }
    )
  }
}

