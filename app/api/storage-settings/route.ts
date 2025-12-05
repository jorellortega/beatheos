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

    const { data, error } = await supabase
      .from('user_storage_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching storage settings:', error)
      return NextResponse.json({ error: 'Failed to fetch storage settings' }, { status: 500 })
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

    const body = await request.json()
    const {
      storage_provider_type,
      custom_storage_provider_id,
      default_bucket,
      default_folder,
      auto_migrate_enabled,
      storage_config
    } = body

    if (!storage_provider_type || !['supabase', 'system', 'custom'].includes(storage_provider_type)) {
      return NextResponse.json(
        { error: 'Invalid storage_provider_type. Must be supabase, system, or custom' },
        { status: 400 }
      )
    }

    // If custom storage, validate that the provider exists and belongs to the user
    if (storage_provider_type === 'custom' && custom_storage_provider_id) {
      const { data: provider, error: providerError } = await supabase
        .from('storage_providers')
        .select('id')
        .eq('id', custom_storage_provider_id)
        .eq('user_id', user.id)
        .single()

      if (providerError || !provider) {
        return NextResponse.json(
          { error: 'Invalid custom storage provider' },
          { status: 400 }
        )
      }
    }

    // Check if settings already exist
    const { data: existing } = await supabase
      .from('user_storage_settings')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    const settingsData = {
      user_id: user.id,
      storage_provider_type,
      custom_storage_provider_id: storage_provider_type === 'custom' ? custom_storage_provider_id : null,
      default_bucket: default_bucket || null,
      default_folder: default_folder || null,
      auto_migrate_enabled: auto_migrate_enabled || false,
      storage_config: storage_config || {}
    }

    let error
    if (existing) {
      const { error: updateError } = await supabase
        .from('user_storage_settings')
        .update(settingsData)
        .eq('user_id', user.id)
      error = updateError
    } else {
      const { error: insertError } = await supabase
        .from('user_storage_settings')
        .insert(settingsData)
      error = insertError
    }

    if (error) {
      console.error('Error saving storage settings:', error)
      return NextResponse.json({ error: 'Failed to save storage settings' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Storage settings saved successfully' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  // PUT is the same as POST for upsert behavior
  return POST(request)
}


