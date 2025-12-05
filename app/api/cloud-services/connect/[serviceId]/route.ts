import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getOAuthConfig, generateState, getBaseUrl, CloudServiceId } from "@/lib/cloud-oauth-config"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ serviceId: string }> }
) {
  try {
    const { serviceId } = await context.params
    
    if (!['google-drive', 'dropbox', 'onedrive', 'box'].includes(serviceId)) {
      return NextResponse.json(
        { error: 'Invalid service ID' },
        { status: 400 }
      )
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get base URL from request to support both local and production
    const baseUrl = getBaseUrl({ ...request, url: request.url })
    console.log(`[OAuth] Using base URL: ${baseUrl} for ${serviceId}`)
    console.log(`[OAuth] Request URL: ${request.url}`)
    console.log(`[OAuth] Request headers:`, {
      host: request.headers.get('host'),
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer'),
    })

    const config = getOAuthConfig(serviceId, baseUrl)
    if (!config) {
      console.error(`[OAuth] Config not found for service: ${serviceId}`)
      return NextResponse.json(
        { error: `OAuth configuration not found for ${serviceId}` },
        { status: 500 }
      )
    }

    if (!config.clientId) {
      console.error(`[OAuth] Missing CLIENT_ID for ${serviceId}. Check environment variables.`)
      console.error(`[OAuth] DROPBOX_CLIENT_ID exists: ${!!process.env.DROPBOX_CLIENT_ID}`)
      return NextResponse.json(
        { error: `OAuth not configured for ${serviceId}. Missing CLIENT_ID environment variable.` },
        { status: 500 }
      )
    }

    console.log(`[OAuth] Redirect URI: ${config.redirectUri}`)

    // Generate state parameter for CSRF protection
    const state = generateState(user.id, serviceId)

    // Build OAuth URL
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scope,
      state,
    })

    // Add Dropbox-specific params
    if (serviceId === 'dropbox') {
      // Dropbox doesn't use access_type or prompt
    } else {
      // For Google Drive and others
      params.append('access_type', 'offline')
      params.append('prompt', 'consent')
    }

    const authUrl = `${config.authUrl}?${params.toString()}`
    console.log(`[OAuth] Generated auth URL for ${serviceId}`)

    return NextResponse.json({ authUrl })
  } catch (error: any) {
    console.error('[OAuth] Error in connect route:', error)
    console.error('[OAuth] Error stack:', error?.stack)
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    )
  }
}

