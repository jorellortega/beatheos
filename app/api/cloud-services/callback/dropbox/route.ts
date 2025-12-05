import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getOAuthConfig, parseState, getBaseUrl } from "@/lib/cloud-oauth-config"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  console.log('[Dropbox Callback] 🔔 Callback route hit!')
  console.log('[Dropbox Callback] Request URL:', request.url)
  
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const isSystem = searchParams.get('system') === 'true'

    console.log('[Dropbox Callback] Parameters:', {
      hasCode: !!code,
      hasState: !!state,
      hasError: !!error,
      isSystem: isSystem
    })

    const baseUrl = getBaseUrl(request)
    console.log('[Dropbox Callback] Base URL determined:', baseUrl)
    console.log('[Dropbox Callback] Request URL:', request.url)
    console.log('[Dropbox Callback] Request headers:', {
      host: request.headers.get('host'),
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer'),
      'x-forwarded-proto': request.headers.get('x-forwarded-proto'),
      'x-forwarded-host': request.headers.get('x-forwarded-host'),
    })

    if (error) {
      console.error('[Dropbox Callback] OAuth error:', error)
      return NextResponse.redirect(
        `${baseUrl}/cloud-services?error=oauth_error&message=${encodeURIComponent(error)}`
      )
    }

    if (!code || !state) {
      console.error('[Dropbox Callback] Missing parameters:', { code: !!code, state: !!state })
      return NextResponse.redirect(
        `${baseUrl}/cloud-services?error=missing_parameters`
      )
    }

    // Parse state to get userId and serviceId
    const stateData = parseState(state)
    if (!stateData) {
      console.error('[Dropbox Callback] Invalid state:', state)
      return NextResponse.redirect(
        `${baseUrl}/cloud-services?error=invalid_state`
      )
    }

    const { userId, serviceId } = stateData
    const isSystemConnection = isSystem || userId === 'system'

    // Verify user is authenticated and matches state
    const authHeader = request.headers.get('authorization')
    let authenticatedUser = null

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const { data: { user } } = await supabase.auth.getUser(token)
      authenticatedUser = user
    }

    // If no auth header, we'll verify via session cookie or redirect to login
    // For now, we'll trust the state parameter (in production, add session verification)

    const config = getOAuthConfig('dropbox', baseUrl)
    if (!config) {
      console.error('[Dropbox Callback] OAuth not configured')
      return NextResponse.redirect(
        `${baseUrl}/cloud-services?error=oauth_not_configured`
      )
    }
    console.log('[Dropbox Callback] Expected redirect URI:', config.redirectUri)

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
      const errorText = await tokenResponse.text()
      console.error('[Dropbox Callback] Token exchange failed:', errorText)
      return NextResponse.redirect(
        `${baseUrl}/cloud-services?error=token_exchange_failed&message=${encodeURIComponent(errorText)}`
      )
    }

    const tokenData = await tokenResponse.json()
    const { access_token, refresh_token, expires_in } = tokenData
    console.log('[Dropbox Callback] ✅ Token exchange successful')

    // Get user account info from Dropbox
    const accountResponse = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    })

    let accountInfo = null
    if (accountResponse.ok) {
      accountInfo = await accountResponse.json()
      console.log('[Dropbox Callback] ✅ Account info retrieved:', {
        name: accountInfo.name?.display_name,
        email: accountInfo.email
      })
    } else {
      console.warn('[Dropbox Callback] ⚠️ Could not fetch account info')
    }

    // Calculate token expiration
    const tokenExpiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000).toISOString()
      : null

    // Check if connection already exists
    let query = supabase
      .from('cloud_services')
      .select('id')
      .eq('service_id', 'dropbox')
      .eq('connection_type', isSystemConnection ? 'system' : 'user')

    if (isSystemConnection) {
      query = query.is('user_id', null)
    } else {
      query = query.eq('user_id', userId)
    }

    const { data: existing, error: queryError } = await query.maybeSingle()
    
    if (queryError) {
      console.error('[Dropbox Callback] Error checking existing connection:', queryError)
    }
    console.log('[Dropbox Callback] Existing connection check:', {
      exists: !!existing,
      isSystem: isSystemConnection,
      userId: userId
    })

    const connectionData = {
      user_id: isSystemConnection ? null : userId,
      service_id: 'dropbox',
      service_name: isSystemConnection ? 'Dropbox (System)' : 'Dropbox',
      connection_type: isSystemConnection ? 'system' : 'user',
      access_token,
      refresh_token: refresh_token || null,
      token_expires_at: tokenExpiresAt,
      account_info: accountInfo,
      scopes: config.scope.split(' '),
      is_active: true,
    }

    if (existing) {
      // Update existing connection
      const { error: updateError } = await supabase
        .from('cloud_services')
        .update(connectionData)
        .eq('id', existing.id)

      if (updateError) {
        console.error('[Dropbox Callback] Error updating connection:', updateError)
        return NextResponse.redirect(
          `${baseUrl}/cloud-services?error=update_failed&message=${encodeURIComponent(updateError.message)}`
        )
      }
      console.log('[Dropbox Callback] Connection updated successfully')
    } else {
      // Create new connection
      const { error: insertError } = await supabase
        .from('cloud_services')
        .insert(connectionData)

      if (insertError) {
        console.error('[Dropbox Callback] Error creating connection:', insertError)
        return NextResponse.redirect(
          `${baseUrl}/cloud-services?error=create_failed&message=${encodeURIComponent(insertError.message)}`
        )
      }
      console.log('[Dropbox Callback] ✅ Connection created successfully')
    }

    // Verify the connection was saved
    const { data: verifyConnection } = await supabase
      .from('cloud_services')
      .select('id, service_id, connection_type, account_info')
      .eq('service_id', 'dropbox')
      .eq('connection_type', isSystemConnection ? 'system' : 'user')
      .maybeSingle()

    if (verifyConnection) {
      console.log('[Dropbox Callback] ✅ Connection verified in database:', {
        id: verifyConnection.id,
        type: verifyConnection.connection_type,
        hasAccountInfo: !!verifyConnection.account_info
      })
    } else {
      console.error('[Dropbox Callback] ❌ Connection not found in database after save!')
    }

    console.log('[Dropbox Callback] Redirecting to:', `${baseUrl}/cloud-services?success=connected&service=dropbox`)
    return NextResponse.redirect(
      `${baseUrl}/cloud-services?success=connected&service=dropbox`
    )
  } catch (error: any) {
    console.error('[Dropbox Callback] Error in callback:', error)
    const baseUrl = getBaseUrl(request)
    return NextResponse.redirect(
      `${baseUrl}/cloud-services?error=callback_error&message=${encodeURIComponent(error?.message || 'Unknown error')}`
    )
  }
}

