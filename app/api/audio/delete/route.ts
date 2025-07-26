import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function DELETE(request: NextRequest) {
  try {
    const { fileId, fileName } = await request.json()

    if (!fileId) {
      return NextResponse.json(
        { error: 'Missing file ID' },
        { status: 400 }
      )
    }

    console.log('Delete request:', { fileId, fileName })

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

    // Get the file data from database
    const { data: fileData, error: fileError } = await supabaseAdmin
      .from('audio_library_items')
      .select('*')
      .eq('id', fileId)
      .eq('user_id', user.id) // Ensure user owns the file
      .single()

    if (fileError || !fileData) {
      console.error('Error fetching file data:', fileError)
      return NextResponse.json(
        { error: 'File not found or access denied' },
        { status: 404 }
      )
    }

    // Extract the file path from the URL
    let filePath = fileData.file_url
    if (filePath && filePath.startsWith('http')) {
      const urlParts = filePath.split('/storage/v1/object/public/beats/')
      if (urlParts.length > 1) {
        filePath = urlParts[1]
      } else {
        console.error('Invalid file URL format:', filePath)
        return NextResponse.json(
          { error: 'Invalid file URL format' },
          { status: 400 }
        )
      }
    }

    // Delete file from storage if it exists
    if (filePath) {
      const { error: storageError } = await supabaseAdmin.storage
        .from('beats')
        .remove([filePath])

      if (storageError) {
        console.error('Error deleting file from storage:', storageError)
        // Don't fail if storage deletion fails, continue with database deletion
      } else {
        console.log('File deleted from storage:', filePath)
      }
    }

    // Delete any file links that reference this file
    const { error: linkDeleteError } = await supabaseAdmin
      .from('audio_file_links')
      .delete()
      .or(`original_file_id.eq.${fileId},converted_file_id.eq.${fileId}`)

    if (linkDeleteError) {
      console.error('Error deleting file links:', linkDeleteError)
      // Don't fail if link deletion fails
    } else {
      console.log('File links deleted for file:', fileId)
    }

    // Delete the file record from database
    const { error: deleteError } = await supabaseAdmin
      .from('audio_library_items')
      .delete()
      .eq('id', fileId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting file from database:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete file from database' },
        { status: 500 }
      )
    }

    console.log('Successfully deleted file:', {
      fileId,
      fileName: fileData.name,
      filePath
    })

    return NextResponse.json({
      success: true,
      message: `File ${fileData.name} has been permanently deleted`
    })

  } catch (error) {
    console.error('Error deleting file:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 