import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { imageUrl, fileName, userId, albumId } = body

    if (!imageUrl || !fileName || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: imageUrl, fileName, userId' },
        { status: 400 }
      )
    }

    console.log('🖼️ DOWNLOAD-AND-STORE - Starting download:', {
      imageUrl: imageUrl.substring(0, 100) + '...',
      fileName,
      userId
    })

    // Download image from URL (server-side, no CORS issues)
    const imageResponse = await fetch(imageUrl)
    
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`)
    }

    const arrayBuffer = await imageResponse.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Determine file path
    let filePath: string
    if (albumId) {
      filePath = `albums/${albumId}/${Date.now()}_${fileName}.png`
    } else {
      filePath = `user_uploads/${userId}/${Date.now()}_${fileName}.png`
    }

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from('beats')
      .upload(filePath, buffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('🖼️ DOWNLOAD-AND-STORE - Upload error:', uploadError)
      throw new Error(`Failed to upload image: ${uploadError.message}`)
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('beats')
      .getPublicUrl(filePath)

    console.log('🖼️ DOWNLOAD-AND-STORE - Success:', publicUrl)

    return NextResponse.json({
      success: true,
      supabaseUrl: publicUrl,
      filePath
    })
  } catch (error: any) {
    console.error('🖼️ DOWNLOAD-AND-STORE - Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to download and store image' 
      },
      { status: 500 }
    )
  }
}



