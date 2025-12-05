import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

    // Get user's personal connections
    const { data: userConnections, error: userError } = await supabase
      .from('cloud_services')
      .select('*')
      .eq('user_id', user.id)
      .eq('connection_type', 'user')
      .order('created_at', { ascending: false })

    if (userError) {
      console.error('Error fetching user connections:', userError)
    }

    // Get system connections (read-only for all users)
    const { data: systemConnections, error: systemError } = await supabase
      .from('cloud_services')
      .select('*')
      .eq('connection_type', 'system')
      .is('user_id', null)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (systemError) {
      console.error('Error fetching system connections:', systemError)
    }

    return NextResponse.json({
      userConnections: userConnections || [],
      systemConnections: systemConnections || []
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

