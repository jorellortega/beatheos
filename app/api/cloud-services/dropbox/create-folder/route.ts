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

    // Create folder using Dropbox API
    const response = await fetch('https://api.dropboxapi.com/2/files/create_folder_v2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${connection.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: path,
        autorename: false,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      // If folder already exists, that's okay
      if (response.status === 409) {
        return NextResponse.json({
          success: true,
          message: 'Folder already exists',
          metadata: error
        })
      }
      console.error('[Dropbox Create Folder] Error:', error)
      return NextResponse.json(
        { error: error.error_summary || 'Failed to create folder' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json({
      success: true,
      metadata: data.metadata
    })
  } catch (error: any) {
    console.error('[Dropbox Create Folder] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    )
  }
}

