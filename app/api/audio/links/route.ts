import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// GET - Fetch file links for a user
export async function GET(request: NextRequest) {
  try {
    // Get the access token from the Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')

    // Get the user from the token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabaseAdmin
      .from('audio_file_links')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching file links:', error)
      return NextResponse.json(
        { error: 'Failed to fetch file links' },
        { status: 500 }
      )
    }

    return NextResponse.json({ links: data })
  } catch (error) {
    console.error('Error in GET /api/audio/links:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create a new file link
export async function POST(request: NextRequest) {
  try {
    const { originalFileId, convertedFileId, originalFormat, convertedFormat } = await request.json()

    if (!originalFileId || !convertedFileId || !originalFormat || !convertedFormat) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Get the access token from the Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')

    // Get the user from the token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify that both files belong to the user
    const { data: files, error: filesError } = await supabaseAdmin
      .from('audio_library_items')
      .select('id')
      .in('id', [originalFileId, convertedFileId])
      .eq('user_id', user.id)

    if (filesError || files.length !== 2) {
      return NextResponse.json(
        { error: 'One or both files not found or access denied' },
        { status: 403 }
      )
    }

    // Create the link
    const { data, error } = await supabaseAdmin
      .from('audio_file_links')
      .insert({
        user_id: user.id,
        original_file_id: originalFileId,
        converted_file_id: convertedFileId,
        original_format: originalFormat,
        converted_format: convertedFormat
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating file link:', error)
      return NextResponse.json(
        { error: 'Failed to create file link' },
        { status: 500 }
      )
    }

    return NextResponse.json({ link: data })
  } catch (error) {
    console.error('Error in POST /api/audio/links:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Remove a file link
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const linkId = searchParams.get('id')

    if (!linkId) {
      return NextResponse.json(
        { error: 'Link ID is required' },
        { status: 400 }
      )
    }

    // Get the access token from the Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')

    // Get the user from the token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete the link (only if it belongs to the user)
    const { error } = await supabaseAdmin
      .from('audio_file_links')
      .delete()
      .eq('id', linkId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting file link:', error)
      return NextResponse.json(
        { error: 'Failed to delete file link' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/audio/links:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 