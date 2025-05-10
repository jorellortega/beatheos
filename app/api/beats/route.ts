import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    // Get the access token from the Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')

    // Get the user from the token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const genre = formData.get('genre') as string
    const bpm = formData.get('bpm') as string
    const key = formData.get('key') as string
    const tags = JSON.parse(formData.get('tags') as string)
    const licensing = JSON.parse(formData.get('licensing') as string)
    const isDraft = formData.get('isDraft') === 'true'
    
    // Handle file uploads
    const mp3File = formData.get('mp3File') as File
    const wavFile = formData.get('wavFile') as File | null
    const stemsFile = formData.get('stemsFile') as File | null
    const coverArt = formData.get('coverArt') as File | null

    if (!mp3File) {
      return NextResponse.json({ error: 'MP3 file is required' }, { status: 400 })
    }

    // Upload files to Supabase Storage
    const mp3Path = `${user.id}/${title.trim()}/${mp3File.name.trim()}`
    const { data: mp3Data, error: mp3Error } = await supabase.storage
      .from('beats')
      .upload(mp3Path, mp3File)

    if (mp3Error) {
      console.error('MP3 upload error:', mp3Error)
      return NextResponse.json({ error: 'Failed to upload MP3 file' }, { status: 500 })
    }

    const mp3Url = supabase.storage.from('beats').getPublicUrl(mp3Path).data.publicUrl

    let wavUrl = null
    if (wavFile) {
      const wavPath = `${user.id}/${title.trim()}/wav/${wavFile.name.trim()}`
      const { data: wavData, error: wavError } = await supabase.storage
        .from('beats')
        .upload(wavPath, wavFile)
      
      if (!wavError) {
        wavUrl = supabase.storage.from('beats').getPublicUrl(wavPath).data.publicUrl
      }
    }

    let stemsUrl = null
    if (stemsFile) {
      const stemsPath = `${user.id}/${title.trim()}/stems/${stemsFile.name.trim()}`
      const { data: stemsData, error: stemsError } = await supabase.storage
        .from('beats')
        .upload(stemsPath, stemsFile)
      
      if (!stemsError) {
        stemsUrl = supabase.storage.from('beats').getPublicUrl(stemsPath).data.publicUrl
      }
    }

    let coverArtUrl = null
    if (coverArt) {
      const coverPath = `${user.id}/${title.trim()}/cover/${coverArt.name.trim()}`
      const { data: coverData, error: coverError } = await supabase.storage
        .from('beats')
        .upload(coverPath, coverArt)
      
      if (!coverError) {
        coverArtUrl = supabase.storage.from('beats').getPublicUrl(coverPath).data.publicUrl
      }
    }

    // Prepare beat data
    const beatData = {
      producer_id: user.id,
      title,
      description,
      genre,
      bpm: parseInt(bpm),
      key,
      tags,
      licensing,
      mp3_url: mp3Url,
      mp3_path: mp3Path,
      wav_url: wavUrl,
      stems_url: stemsUrl,
      cover_art_url: coverArtUrl,
      is_draft: isDraft
    }

    console.log('Uploading beat with data:', beatData)

    // Insert beat into database using service role key
    const { data: beat, error: dbError } = await supabaseAdmin
      .from('beats')
      .insert(beatData)
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ error: 'Failed to save beat data', details: dbError }, { status: 500 })
    }

    return NextResponse.json(beat)
  } catch (error) {
    console.error('Error uploading beat:', error)
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const producerId = searchParams.get('producerId')
    const isDraft = searchParams.get('isDraft')

    let query = supabase
      .from('beats')
      .select('*')

    if (producerId) {
      query = query.eq('producer_id', producerId)
    }

    if (isDraft !== null) {
      query = query.eq('is_draft', isDraft === 'true')
    }

    const { data: beats, error } = await query

    console.log('Fetched beats:', beats)

    if (error) {
      console.error('Supabase error in /api/beats:', error)
      // Always return an array to prevent frontend crash
      return NextResponse.json([], { status: 200 })
    }

    // Defensive: if beats is not an array, return empty array
    if (!Array.isArray(beats)) {
      return NextResponse.json([], { status: 200 })
    }

    return NextResponse.json(beats)
  } catch (error) {
    console.error('Error fetching beats:', error)
    // Always return an array to prevent frontend crash
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Missing beat id' }, { status: 400 })
  }

  // Fetch the beat to get the mp3_path
  const { data: beat, error: fetchError } = await supabaseAdmin
    .from('beats')
    .select('mp3_path')
    .eq('id', id)
    .single()

  if (fetchError) {
    return NextResponse.json({ error: 'Failed to fetch beat', details: fetchError }, { status: 500 })
  }

  // Delete the file from storage if mp3_path exists
  if (beat?.mp3_path) {
    const { error: storageError } = await supabaseAdmin.storage.from('beats').remove([beat.mp3_path])
    if (storageError) {
      return NextResponse.json({ error: 'Failed to delete file from storage', details: storageError }, { status: 500 })
    }
  }

  // Delete the beat from the database
  const { error } = await supabaseAdmin
    .from('beats')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Failed to delete beat', details: error }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Missing beat id' }, { status: 400 })
  }

  const body = await request.json()

  const { data, error } = await supabaseAdmin
    .from('beats')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to update beat', details: error }, { status: 500 })
  }

  return NextResponse.json(data)
}

// Increment play count endpoint
export async function PUT(request: Request) {
  // Only handle /api/beats/play
  const { pathname } = new URL(request.url)
  if (!pathname.endsWith('/api/beats/play')) return new Response('Not found', { status: 404 })

  try {
    const { id } = await request.json()
    if (!id) return new Response(JSON.stringify({ error: 'Missing beat id' }), { status: 400 })

    // Use Supabase admin client
    const { error } = await supabaseAdmin.rpc('increment_play_count', { beat_id: id })
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }
    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 })
  }
} 