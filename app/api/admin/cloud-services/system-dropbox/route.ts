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

export async function GET(request: NextRequest) {
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

    const { data, error } = await supabase
      .from('cloud_services')
      .select('*')
      .eq('service_id', 'dropbox')
      .eq('connection_type', 'system')
      .is('user_id', null)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching system Dropbox:', error)
      return NextResponse.json({ error: 'Failed to fetch connection' }, { status: 500 })
    }

    return NextResponse.json(data || null)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
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

    const body = await request.json()
    const { access_token, refresh_token, token_expires_at, account_info } = body

    if (!access_token) {
      return NextResponse.json(
        { error: 'Access token is required' },
        { status: 400 }
      )
    }

    // Check if system connection already exists
    const { data: existing } = await supabase
      .from('cloud_services')
      .select('id')
      .eq('service_id', 'dropbox')
      .eq('connection_type', 'system')
      .is('user_id', null)
      .maybeSingle()

    const connectionData = {
      user_id: null,
      service_id: 'dropbox',
      service_name: 'Dropbox (System)',
      connection_type: 'system',
      access_token,
      refresh_token: refresh_token || null,
      token_expires_at: token_expires_at || null,
      account_info: account_info || null,
      scopes: getOAuthConfig('dropbox')?.scope.split(' ') || [],
      is_active: true,
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from('cloud_services')
        .update(connectionData)
        .eq('id', existing.id)

      if (updateError) {
        console.error('Error updating system Dropbox:', updateError)
        return NextResponse.json({ error: 'Failed to update connection' }, { status: 500 })
      }
    } else {
      const { error: insertError } = await supabase
        .from('cloud_services')
        .insert(connectionData)

      if (insertError) {
        console.error('Error creating system Dropbox:', insertError)
        return NextResponse.json({ error: 'Failed to create connection' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, message: 'System Dropbox connection saved' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
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

    const { data: connection } = await supabase
      .from('cloud_services')
      .select('*')
      .eq('service_id', 'dropbox')
      .eq('connection_type', 'system')
      .is('user_id', null)
      .single()

    if (!connection) {
      return NextResponse.json(
        { error: 'System Dropbox connection not found' },
        { status: 404 }
      )
    }

    // Try to revoke token
    try {
      await fetch('https://api.dropboxapi.com/2/auth/token/revoke', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${connection.access_token}`,
        },
      })
    } catch (revokeError) {
      console.error('Error revoking token:', revokeError)
    }

    // Delete associated files and logs
    await supabase
      .from('cloud_service_files')
      .delete()
      .eq('cloud_service_id', connection.id)

    await supabase
      .from('cloud_service_sync_logs')
      .delete()
      .eq('cloud_service_id', connection.id)

    // Delete connection
    const { error: deleteError } = await supabase
      .from('cloud_services')
      .delete()
      .eq('id', connection.id)

    if (deleteError) {
      console.error('Error deleting system Dropbox:', deleteError)
      return NextResponse.json({ error: 'Failed to delete connection' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'System Dropbox disconnected' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

