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

    const { path = "" } = await request.json()

    // Get user's Dropbox connection
    const connection = await getUserCloudStorageConnection(user.id, 'dropbox')
    if (!connection) {
      return NextResponse.json(
        { error: 'Dropbox connection not found' },
        { status: 404 }
      )
    }

    // List files using Dropbox API with pagination support
    let allEntries: any[] = []
    let cursor: string | null = null
    let hasMore = true
    let pageCount = 0

    console.log('[Dropbox List] Starting list for path:', path || "(root)")

    while (hasMore) {
      pageCount++
      
      // If we have a cursor, use list_folder_continue (only accepts cursor)
      // Otherwise, use list_folder (accepts path and recursive)
      let requestBody: any
      let endpoint: string
      
      if (cursor) {
        // list_folder/continue only accepts cursor, not path or recursive
        endpoint = 'https://api.dropboxapi.com/2/files/list_folder/continue'
        requestBody = { cursor }
        console.log(`[Dropbox List] Fetching page ${pageCount} with cursor`)
      } else {
        // Initial request accepts path and recursive
        endpoint = 'https://api.dropboxapi.com/2/files/list_folder'
        requestBody = {
          path: path || "",
          recursive: false,
        }
        console.log(`[Dropbox List] Fetching initial page for path: ${path || "(root)"}`)
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${connection.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        // Try to parse as JSON first, fallback to text
        let error: any
        const contentType = response.headers.get('content-type')
        try {
          if (contentType?.includes('application/json')) {
            error = await response.json()
          } else {
            const errorText = await response.text()
            error = { error: errorText, error_summary: errorText }
          }
        } catch (parseError) {
          const errorText = await response.text().catch(() => 'Unknown error')
          error = { error: errorText, error_summary: errorText }
        }
        
        console.error('[Dropbox List] Error:', error)
        console.error('[Dropbox List] Response status:', response.status)
        console.error('[Dropbox List] Response headers:', Object.fromEntries(response.headers.entries()))
        
        return NextResponse.json(
          { error: error.error_summary || error.error || 'Failed to list files' },
          { status: response.status }
        )
      }

      const data = await response.json()
      
      // Accumulate entries
      if (data.entries) {
        allEntries = [...allEntries, ...data.entries]
        console.log(`[Dropbox List] Page ${pageCount}: Got ${data.entries.length} entries (total: ${allEntries.length})`)
      } else {
        console.warn(`[Dropbox List] Page ${pageCount}: No entries in response`)
      }

      // Check if there are more results
      hasMore = data.has_more === true
      cursor = data.cursor || null

      console.log(`[Dropbox List] Page ${pageCount}: has_more=${hasMore}, cursor=${cursor ? 'present' : 'null'}`)

      // Safety limit to prevent infinite loops
      if (allEntries.length > 10000) {
        console.warn('[Dropbox List] Reached safety limit of 10000 entries')
        break
      }

      // Safety limit on page count
      if (pageCount > 100) {
        console.warn('[Dropbox List] Reached safety limit of 100 pages')
        break
      }
    }

    console.log(`[Dropbox List] Completed: Total entries fetched: ${allEntries.length}`)

    // Return all entries in the same format as Dropbox API
    return NextResponse.json({
      entries: allEntries,
      cursor: cursor,
      has_more: false, // We've fetched everything
    })
  } catch (error: any) {
    console.error('[Dropbox List] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    )
  }
}

