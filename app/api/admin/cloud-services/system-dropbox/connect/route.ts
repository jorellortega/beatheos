import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getOAuthConfig, generateState } from "@/lib/cloud-oauth-config"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function isAdminOrCEO(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  if (error || !data) {
    return false
  }

  return data.role === 'admin' || data.role === 'ceo'
}

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

    const hasAccess = await isAdminOrCEO(user.id)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden - Admin or CEO access required' },
        { status: 403 }
      )
    }

    const config = getOAuthConfig('dropbox')
    if (!config || !config.clientId) {
      return NextResponse.json(
        { error: 'OAuth not configured for Dropbox' },
        { status: 500 }
      )
    }

    // Generate state parameter (use 'system' as userId for system connections)
    const state = generateState('system', 'dropbox')

    // Build OAuth URL
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: `${config.redirectUri}?system=true`,
      response_type: 'code',
      scope: config.scope,
      state,
      access_type: 'offline',
      prompt: 'consent',
    })

    const authUrl = `${config.authUrl}?${params.toString()}`

    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

