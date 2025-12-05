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

    const body = await request.json()
    const { path, content, mode = 'add' } = body

    if (!path || !content) {
      return NextResponse.json(
        { error: 'Path and content are required' },
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

    // Convert content array back to Uint8Array
    // Content is sent as an array of numbers from the frontend
    const fileContent = new Uint8Array(content)

    // For small files (< 150MB), use simple upload
    // For larger files, we'd need to use chunked upload (session_start, append, finish)
    if (fileContent.length < 150 * 1024 * 1024) {
      // Simple upload
      const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${connection.access_token}`,
          'Content-Type': 'application/octet-stream',
          'Dropbox-API-Arg': JSON.stringify({
            path,
            mode: mode === 'overwrite' ? 'overwrite' : 'add',
            autorename: true,
            mute: false,
          }),
        },
        body: fileContent,
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('[Dropbox Upload] Error:', error)
        return NextResponse.json(
          { error: error.error_summary || 'Failed to upload file' },
          { status: response.status }
        )
      }

      const data = await response.json()
      return NextResponse.json(data)
    } else {
      // For large files, use chunked upload
      // This is a simplified version - in production, you'd want to handle this more robustly
      return NextResponse.json(
        { error: 'File too large. Chunked upload not yet implemented.' },
        { status: 413 }
      )
    }
  } catch (error: any) {
    console.error('[Dropbox Upload] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    )
  }
}

