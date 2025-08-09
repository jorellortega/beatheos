import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get current user
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all rights and metadata for the artist
    const [sampleClearances, publishingRights, copyrightRegistrations, isrcUpcCodes] = await Promise.all([
      supabase
        .from('label_artist_sample_clearances')
        .select('*')
        .eq('label_artist_id', params.id)
        .order('created_at', { ascending: false }),
      
      supabase
        .from('label_artist_publishing_rights')
        .select('*')
        .eq('label_artist_id', params.id)
        .order('created_at', { ascending: false }),
      
      supabase
        .from('label_artist_copyright_registrations')
        .select('*')
        .eq('label_artist_id', params.id)
        .order('created_at', { ascending: false }),
      
      supabase
        .from('label_artist_isrc_upc_codes')
        .select('*')
        .eq('label_artist_id', params.id)
        .order('created_at', { ascending: false })
    ])

    // Check for errors
    if (sampleClearances.error) {
      console.error('Sample clearances error:', sampleClearances.error)
      return NextResponse.json({ error: sampleClearances.error.message }, { status: 500 })
    }
    if (publishingRights.error) {
      console.error('Publishing rights error:', publishingRights.error)
      return NextResponse.json({ error: publishingRights.error.message }, { status: 500 })
    }
    if (copyrightRegistrations.error) {
      console.error('Copyright registrations error:', copyrightRegistrations.error)
      return NextResponse.json({ error: copyrightRegistrations.error.message }, { status: 500 })
    }
    if (isrcUpcCodes.error) {
      console.error('ISRC/UPC codes error:', isrcUpcCodes.error)
      return NextResponse.json({ error: isrcUpcCodes.error.message }, { status: 500 })
    }

    const rightsMetadata = {
      sample_clearances: sampleClearances.data || [],
      publishing_rights: publishingRights.data || [],
      copyright_registrations: copyrightRegistrations.data || [],
      isrc_upc_codes: isrcUpcCodes.data || []
    }

    return NextResponse.json({ rights_metadata: rightsMetadata })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get current user
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, data } = body

    if (!type || !data) {
      return NextResponse.json({ error: 'Type and data are required' }, { status: 400 })
    }

    // Add label_artist_id to the data
    const recordData = {
      ...data,
      label_artist_id: params.id
    }

    let result
    switch (type) {
      case 'sample_clearance':
        result = await supabase
          .from('label_artist_sample_clearances')
          .insert(recordData)
          .select()
          .single()
        break
      
      case 'publishing_rights':
        result = await supabase
          .from('label_artist_publishing_rights')
          .insert(recordData)
          .select()
          .single()
        break
      
      case 'copyright_registration':
        result = await supabase
          .from('label_artist_copyright_registrations')
          .insert(recordData)
          .select()
          .single()
        break
      
      case 'isrc_upc_code':
        result = await supabase
          .from('label_artist_isrc_upc_codes')
          .insert(recordData)
          .select()
          .single()
        break
      
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    if (result.error) {
      console.error('Database error:', result.error)
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }

    return NextResponse.json({ record: result.data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get current user
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, record_id, data } = body

    if (!type || !record_id || !data) {
      return NextResponse.json({ error: 'Type, record_id, and data are required' }, { status: 400 })
    }

    let result
    switch (type) {
      case 'sample_clearance':
        result = await supabase
          .from('label_artist_sample_clearances')
          .update(data)
          .eq('id', record_id)
          .eq('label_artist_id', params.id)
          .select()
          .single()
        break
      
      case 'publishing_rights':
        result = await supabase
          .from('label_artist_publishing_rights')
          .update(data)
          .eq('id', record_id)
          .eq('label_artist_id', params.id)
          .select()
          .single()
        break
      
      case 'copyright_registration':
        result = await supabase
          .from('label_artist_copyright_registrations')
          .update(data)
          .eq('id', record_id)
          .eq('label_artist_id', params.id)
          .select()
          .single()
        break
      
      case 'isrc_upc_code':
        result = await supabase
          .from('label_artist_isrc_upc_codes')
          .update(data)
          .eq('id', record_id)
          .eq('label_artist_id', params.id)
          .select()
          .single()
        break
      
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    if (result.error) {
      console.error('Database error:', result.error)
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }

    return NextResponse.json({ record: result.data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get current user
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const recordId = searchParams.get('record_id')

    if (!type || !recordId) {
      return NextResponse.json({ error: 'Type and record_id are required' }, { status: 400 })
    }

    let result
    switch (type) {
      case 'sample_clearance':
        result = await supabase
          .from('label_artist_sample_clearances')
          .delete()
          .eq('id', recordId)
          .eq('label_artist_id', params.id)
        break
      
      case 'publishing_rights':
        result = await supabase
          .from('label_artist_publishing_rights')
          .delete()
          .eq('id', recordId)
          .eq('label_artist_id', params.id)
        break
      
      case 'copyright_registration':
        result = await supabase
          .from('label_artist_copyright_registrations')
          .delete()
          .eq('id', recordId)
          .eq('label_artist_id', params.id)
        break
      
      case 'isrc_upc_code':
        result = await supabase
          .from('label_artist_isrc_upc_codes')
          .delete()
          .eq('id', recordId)
          .eq('label_artist_id', params.id)
        break
      
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    if (result.error) {
      console.error('Database error:', result.error)
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
