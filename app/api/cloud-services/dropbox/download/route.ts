import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getUserCloudStorageConnection } from "@/lib/cloud-storage"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { path } = await request.json()

    if (!path) {
      return NextResponse.json(
        { error: 'Path is required' },
        { status: 400 }
      )
    }

    // Get user's Dropbox connection
    const connection = await getUserCloudStorageConnection(user.id, 'dropbox')
    if (!connection) {
      return NextResponse.json(
        { error: 'Dropbox connection not found' },
        { status: 404 }
      )
    }

    // Download file using Dropbox API
    const response = await fetch('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${connection.access_token}`,
        'Dropbox-API-Arg': JSON.stringify({
          path: path,
        }),
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to download file' }))
      console.error('[Dropbox Download] Error:', error)
      return NextResponse.json(
        { error: error.error_summary || error.error || 'Failed to download file' },
        { status: response.status }
      )
    }

    // Get file content as array buffer
    const arrayBuffer = await response.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    
    // Get filename from path
    const filename = path.split('/').pop() || 'download'
    
    // Get content type from response or default to application/octet-stream
    const contentType = response.headers.get('content-type') || 'application/octet-stream'

    // Return file data as base64 for easier transfer
    const base64 = Buffer.from(uint8Array).toString('base64')

    return NextResponse.json({
      success: true,
      filename,
      contentType,
      data: base64,
      size: arrayBuffer.byteLength
    })
  } catch (error: any) {
    console.error('[Dropbox Download] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    )
  }
}

