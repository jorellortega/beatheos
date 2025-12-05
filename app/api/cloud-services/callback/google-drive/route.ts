import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getOAuthConfig, parseState } from "@/lib/cloud-oauth-config"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(
        new URL(`/cloud-services?error=oauth_error&message=${encodeURIComponent(error)}`, request.url)
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/cloud-services?error=missing_parameters', request.url)
      )
    }

    const stateData = parseState(state)
    if (!stateData) {
      return NextResponse.redirect(
        new URL('/cloud-services?error=invalid_state', request.url)
      )
    }

    const { userId, serviceId } = stateData

    const config = getOAuthConfig('google-drive')
    if (!config) {
      return NextResponse.redirect(
        new URL('/cloud-services?error=oauth_not_configured', request.url)
      )
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      return NextResponse.redirect(
        new URL('/cloud-services?error=token_exchange_failed', request.url)
      )
    }

    const tokenData = await tokenResponse.json()
    const { access_token, refresh_token, expires_in } = tokenData

    // Get user account info
    const accountResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    })

    let accountInfo = null
    if (accountResponse.ok) {
      accountInfo = await accountResponse.json()
    }

    const tokenExpiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000).toISOString()
      : null

    const { data: existing } = await supabase
      .from('cloud_services')
      .select('id')
      .eq('user_id', userId)
      .eq('service_id', 'google-drive')
      .eq('connection_type', 'user')
      .maybeSingle()

    const connectionData = {
      user_id: userId,
      service_id: 'google-drive',
      service_name: 'Google Drive',
      connection_type: 'user',
      access_token,
      refresh_token: refresh_token || null,
      token_expires_at: tokenExpiresAt,
      account_info: accountInfo,
      scopes: config.scope.split(' '),
      is_active: true,
    }

    if (existing) {
      await supabase
        .from('cloud_services')
        .update(connectionData)
        .eq('id', existing.id)
    } else {
      await supabase
        .from('cloud_services')
        .insert(connectionData)
    }

    return NextResponse.redirect(
      new URL('/cloud-services?success=connected&service=google-drive', request.url)
    )
  } catch (error) {
    console.error('Error in Google Drive callback:', error)
    return NextResponse.redirect(
      new URL('/cloud-services?error=callback_error', request.url)
    )
  }
}

