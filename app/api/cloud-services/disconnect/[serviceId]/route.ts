import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getOAuthConfig } from "@/lib/cloud-oauth-config"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function DELETE(
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

    // Get the connection
    const { data: connection, error: fetchError } = await supabase
      .from('cloud_services')
      .select('*')
      .eq('user_id', user.id)
      .eq('service_id', serviceId)
      .eq('connection_type', 'user')
      .single()

    if (fetchError || !connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      )
    }

    // Try to revoke the token (service-specific)
    try {
      if (serviceId === 'dropbox') {
        await fetch('https://api.dropboxapi.com/2/auth/token/revoke', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
          },
        })
      } else if (serviceId === 'google-drive') {
        const config = getOAuthConfig('google-drive')
        await fetch('https://oauth2.googleapis.com/revoke', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            token: connection.access_token,
            client_id: config.clientId,
            client_secret: config.clientSecret,
          }),
        })
      }
      // Add other services as needed
    } catch (revokeError) {
      console.error('Error revoking token:', revokeError)
      // Continue with deletion even if revocation fails
    }

    // Delete associated files and sync logs
    await supabase
      .from('cloud_service_files')
      .delete()
      .eq('cloud_service_id', connection.id)

    await supabase
      .from('cloud_service_sync_logs')
      .delete()
      .eq('cloud_service_id', connection.id)

    // Delete the connection
    const { error: deleteError } = await supabase
      .from('cloud_services')
      .delete()
      .eq('id', connection.id)

    if (deleteError) {
      console.error('Error deleting connection:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete connection' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'Connection disconnected successfully' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

