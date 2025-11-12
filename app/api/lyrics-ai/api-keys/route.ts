import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdminOrCEO } from '@/lib/ai-api-helpers'

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    
    // Create Supabase client with the token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin or ceo
    const hasAccess = await isAdminOrCEO(user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden - Admin or CEO access required' }, { status: 403 })
    }

    // Get user's API keys
    const { data: apiKeys, error } = await supabase
      .from('user_api_keys')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching API keys:', error)
      return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 })
    }

    // Return API keys (masked for security)
    const response = {
      openai: apiKeys?.openai_api_key ? maskAPIKey(apiKeys.openai_api_key) : '',
      anthropic: apiKeys?.anthropic_api_key ? maskAPIKey(apiKeys.anthropic_api_key) : '',
      elevenlabs: apiKeys?.elevenlabs_api_key ? maskAPIKey(apiKeys.elevenlabs_api_key) : '',
      openart: '', // Not in current schema, but keeping for future
      kling: '', // Not in current schema, but keeping for future
      runway: '' // Not in current schema, but keeping for future
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('API keys GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    
    // Create Supabase client with the token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin or ceo
    const hasAccess = await isAdminOrCEO(user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden - Admin or CEO access required' }, { status: 403 })
    }

    const { serviceId, apiKey } = await request.json()

    if (!serviceId || !apiKey) {
      return NextResponse.json({ error: 'Service ID and API key are required' }, { status: 400 })
    }

    // Validate API key format
    if (!isValidAPIKey(serviceId, apiKey)) {
      return NextResponse.json({ error: 'Invalid API key format' }, { status: 400 })
    }

    // Check if user already has API keys record
    const { data: existingKeys } = await supabase
      .from('user_api_keys')
      .select('*')
      .eq('user_id', user.id)
      .single()

    let updateData: any = {
      user_id: user.id,
      updated_at: new Date().toISOString()
    }

    // Set the appropriate API key field
    switch (serviceId) {
      case 'openai':
        updateData.openai_api_key = apiKey
        break
      case 'anthropic':
        updateData.anthropic_api_key = apiKey
        break
      case 'elevenlabs':
        updateData.elevenlabs_api_key = apiKey
        break
      default:
        return NextResponse.json({ error: 'Unsupported service' }, { status: 400 })
    }

    let result
    if (existingKeys) {
      // Update existing record
      result = await supabase
        .from('user_api_keys')
        .update(updateData)
        .eq('user_id', user.id)
    } else {
      // Create new record
      updateData.created_at = new Date().toISOString()
      result = await supabase
        .from('user_api_keys')
        .insert(updateData)
    }

    if (result.error) {
      console.error('Error saving API key:', result.error)
      return NextResponse.json({ error: 'Failed to save API key' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API keys POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    
    // Create Supabase client with the token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin or ceo
    const hasAccess = await isAdminOrCEO(user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden - Admin or CEO access required' }, { status: 403 })
    }

    const { serviceId } = await request.json()

    if (!serviceId) {
      return NextResponse.json({ error: 'Service ID is required' }, { status: 400 })
    }

    // Get existing API keys
    const { data: existingKeys } = await supabase
      .from('user_api_keys')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!existingKeys) {
      return NextResponse.json({ error: 'No API keys found' }, { status: 404 })
    }

    let updateData: any = {
      updated_at: new Date().toISOString()
    }

    // Clear the appropriate API key field
    switch (serviceId) {
      case 'openai':
        updateData.openai_api_key = null
        break
      case 'anthropic':
        updateData.anthropic_api_key = null
        break
      case 'elevenlabs':
        updateData.elevenlabs_api_key = null
        break
      default:
        return NextResponse.json({ error: 'Unsupported service' }, { status: 400 })
    }

    const result = await supabase
      .from('user_api_keys')
      .update(updateData)
      .eq('user_id', user.id)

    if (result.error) {
      console.error('Error clearing API key:', result.error)
      return NextResponse.json({ error: 'Failed to clear API key' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API keys DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function maskAPIKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 8) return apiKey
  
  const start = apiKey.substring(0, 4)
  const end = apiKey.substring(apiKey.length - 4)
  const middle = '*'.repeat(Math.max(apiKey.length - 8, 4))
  
  return `${start}${middle}${end}`
}

function isValidAPIKey(serviceId: string, apiKey: string): boolean {
  if (!apiKey || apiKey.trim().length < 10) return false

  switch (serviceId) {
    case 'openai':
      return apiKey.startsWith('sk-')
    case 'anthropic':
      return apiKey.startsWith('sk-ant-')
    case 'elevenlabs':
      return apiKey.length >= 20 // ElevenLabs keys are typically longer
    default:
      return true // For other services, just check minimum length
  }
}
