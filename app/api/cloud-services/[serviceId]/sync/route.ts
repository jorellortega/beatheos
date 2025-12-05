import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

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
    
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's connection (or system connection as fallback)
    const { data: userConnection } = await supabase
      .from('cloud_services')
      .select('*')
      .eq('user_id', user.id)
      .eq('service_id', serviceId)
      .eq('connection_type', 'user')
      .eq('is_active', true)
      .maybeSingle()

    let connection = userConnection

    if (!connection) {
      // Fallback to system connection
      const { data: systemConnection } = await supabase
        .from('cloud_services')
        .select('*')
        .eq('service_id', serviceId)
        .eq('connection_type', 'system')
        .is('user_id', null)
        .eq('is_active', true)
        .maybeSingle()

      connection = systemConnection
    }

    if (!connection) {
      return NextResponse.json(
        { error: 'No active connection found' },
        { status: 404 }
      )
    }

    // Create sync log entry
    const { data: syncLog, error: logError } = await supabase
      .from('cloud_service_sync_logs')
      .insert({
        cloud_service_id: connection.id,
        sync_type: 'manual',
        status: 'started',
        files_processed: 0,
      })
      .select()
      .single()

    if (logError) {
      console.error('Error creating sync log:', logError)
    }

    // TODO: Implement actual sync logic here
    // For now, just update the last_sync timestamp
    await supabase
      .from('cloud_services')
      .update({ last_sync: new Date().toISOString() })
      .eq('id', connection.id)

    if (syncLog) {
      await supabase
        .from('cloud_service_sync_logs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', syncLog.id)
    }

    return NextResponse.json({ success: true, message: 'Sync completed' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

