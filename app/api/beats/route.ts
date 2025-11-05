import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { generateUniqueSlug } from '@/lib/slugGenerator'

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
    
    // Generate unique slug for the beat
    const slug = await generateUniqueSlug(title)
    
    // Handle file uploads
    console.log('[DEBUG API] ========== EXTRACTING FILES FROM FORMDATA ==========');
    const mp3File = formData.get('mp3File') as File
    const wavFile = formData.get('wavFile') as File | null
    const stemsFile = formData.get('stemsFile') as File | null
    const coverArt = formData.get('coverArt') as File | null

    console.log('[DEBUG API] Files received from FormData:');
    console.log('[DEBUG API]   - mp3File:', mp3File ? { name: mp3File.name, size: mp3File.size, type: mp3File.type } : 'NULL');
    console.log('[DEBUG API]   - wavFile:', wavFile ? { name: wavFile.name, size: wavFile.size, type: wavFile.type } : 'NULL');
    console.log('[DEBUG API]   - stemsFile:', stemsFile ? { name: stemsFile.name, size: stemsFile.size, type: stemsFile.type } : 'NULL');
    console.log('[DEBUG API]   - coverArt:', coverArt ? { name: coverArt.name, size: coverArt.size, type: coverArt.type } : 'NULL');

    if (!mp3File) {
      console.log('[DEBUG API] ERROR: MP3 file is required but not provided');
      return NextResponse.json({ error: 'MP3 file is required' }, { status: 400 })
    }

    // Upload files to Supabase Storage
    const mp3Ext = mp3File.name.split('.').pop();
    const mp3Base = mp3File.name.replace(/\.[^/.]+$/, '');
    const mp3Unique = `${mp3Base}_${Date.now()}-${Math.round(Math.random() * 1e9)}.${mp3Ext}`;
    const mp3Path = `profiles/${user.id}/${slug}/${mp3Unique}`;
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
      console.log('[DEBUG API] ========== UPLOADING WAV FILE ==========');
      console.log('[DEBUG API] WAV file details:', { name: wavFile.name, size: wavFile.size, type: wavFile.type });
      const wavExt = wavFile.name.split('.').pop();
      const wavBase = wavFile.name.replace(/\.[^/.]+$/, '');
      const wavUnique = `${wavBase}_${Date.now()}-${Math.round(Math.random() * 1e9)}.${wavExt}`;
      const wavPath = `profiles/${user.id}/${slug}/wav/${wavUnique}`;
      console.log('[DEBUG API] WAV upload path:', wavPath);
      
      const { data: wavData, error: wavError } = await supabase.storage
        .from('beats')
        .upload(wavPath, wavFile)
      
      if (wavError) {
        console.error('[DEBUG API] WAV upload ERROR:', wavError);
      } else {
        wavUrl = supabase.storage.from('beats').getPublicUrl(wavPath).data.publicUrl
        console.log('[DEBUG API] WAV uploaded successfully:', wavUrl);
      }
    } else {
      console.log('[DEBUG API] WAV file is NULL - skipping upload');
    }

    let stemsUrl = null
    if (stemsFile) {
      console.log('[DEBUG API] ========== UPLOADING STEMS FILE ==========');
      console.log('[DEBUG API] Stems file details:', { name: stemsFile.name, size: stemsFile.size, type: stemsFile.type });
      const stemsExt = stemsFile.name.split('.').pop();
      const stemsBase = stemsFile.name.replace(/\.[^/.]+$/, '');
      const stemsUnique = `${stemsBase}_${Date.now()}-${Math.round(Math.random() * 1e9)}.${stemsExt}`;
      const stemsPath = `profiles/${user.id}/${slug}/stems/${stemsUnique}`;
      console.log('[DEBUG API] Stems upload path:', stemsPath);
      
      const { data: stemsData, error: stemsError } = await supabase.storage
        .from('beats')
        .upload(stemsPath, stemsFile)
      
      if (stemsError) {
        console.error('[DEBUG API] Stems upload ERROR:', stemsError);
      } else {
        stemsUrl = supabase.storage.from('beats').getPublicUrl(stemsPath).data.publicUrl
        console.log('[DEBUG API] Stems uploaded successfully:', stemsUrl);
      }
    } else {
      console.log('[DEBUG API] Stems file is NULL - skipping upload');
    }

    let coverArtUrl = null
    if (coverArt) {
      console.log('[DEBUG API] ========== UPLOADING COVER ART ==========');
      console.log('[DEBUG API] Cover art details:', { name: coverArt.name, size: coverArt.size, type: coverArt.type });
      const coverExt = coverArt.name.split('.').pop();
      const coverBase = coverArt.name.replace(/\.[^/.]+$/, '');
      const coverUnique = `${coverBase}_${Date.now()}-${Math.round(Math.random() * 1e9)}.${coverExt}`;
      const coverPath = `profiles/${user.id}/${slug}/cover/${coverUnique}`;
      console.log('[DEBUG API] Cover art upload path:', coverPath);
      
      const { data: coverData, error: coverError } = await supabase.storage
        .from('beats')
        .upload(coverPath, coverArt)
      
      if (coverError) {
        console.error('[DEBUG API] Cover art upload ERROR:', coverError);
      } else {
        coverArtUrl = supabase.storage.from('beats').getPublicUrl(coverPath).data.publicUrl
        console.log('[DEBUG API] Cover art uploaded successfully:', coverArtUrl);
      }
    } else {
      console.log('[DEBUG API] Cover art is NULL - skipping upload');
    }

    // Prepare beat data
    console.log('[DEBUG API] ========== PREPARING BEAT DATA ==========');
    console.log('[DEBUG API] Final URLs:');
    console.log('[DEBUG API]   - mp3_url:', mp3Url ? 'SET' : 'NULL');
    console.log('[DEBUG API]   - wav_url:', wavUrl ? 'SET' : 'NULL');
    console.log('[DEBUG API]   - stems_url:', stemsUrl ? 'SET' : 'NULL');
    console.log('[DEBUG API]   - cover_art_url:', coverArtUrl ? 'SET' : 'NULL');
    
    const beatData = {
      producer_id: user.id,
      title,
      description,
      genre,
      bpm: bpm && /^\d+$/.test(bpm) ? parseInt(bpm) : null,
      key,
      tags,
      licensing,
      mp3_url: mp3Url,
      mp3_path: mp3Path,
      wav_url: wavUrl,
      stems_url: stemsUrl,
      cover_art_url: coverArtUrl,
      is_draft: isDraft,
      price_lease: licensing.lease ?? null,
      price_premium_lease: licensing.premium ?? null,
      price_exclusive: licensing.exclusive ?? null,
      price_buyout: licensing.buyout ?? null,
      slug
    }

    console.log('Uploading beat with data:', beatData)

    // Insert beat into database using service role key
    const { data: beat, error: dbError } = await supabase.from('beats')
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
      // Fetch beats where producerId is either the main producer or a collaborator
      query = query.or(`producer_id.eq.${producerId},producer_ids.cs.{${producerId}}`)
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
  const { data: beat, error: fetchError } = await supabase.from('beats')
    .select('mp3_path')
    .eq('id', id)
    .single()

  if (fetchError) {
    return NextResponse.json({ error: 'Failed to fetch beat', details: fetchError }, { status: 500 })
  }

  // Delete the file from storage if mp3_path exists
  if (beat?.mp3_path) {
    const { error: storageError } = await supabase.storage.from('beats').remove([beat.mp3_path])
    if (storageError) {
      return NextResponse.json({ error: 'Failed to delete file from storage', details: storageError }, { status: 500 })
    }
  }

  // Delete the beat from the database
  const { error } = await supabase.from('beats')
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

  // Map price columns to licensing keys
  const priceToLicenseKey = {
    price_lease: 'template-lease',
    price_premium_lease: 'template-premium-lease',
    price_exclusive: 'template-exclusive',
    price_buyout: 'template-buy-out',
  }

  // If a price column is being updated, also update the licensing JSONB
  let updateBody = { ...body }
  const priceKeys = Object.keys(priceToLicenseKey) as (keyof typeof priceToLicenseKey)[];
  const priceKeyUpdated = priceKeys.find((key) => key in body)
  if (priceKeyUpdated) {
    // Fetch current licensing JSONB
    const { data: beat, error: fetchError } = await supabase.from('beats').select('licensing').eq('id', id).single()
    let licensing = beat?.licensing || {}
    // Update the relevant key
    licensing = { ...licensing, [priceToLicenseKey[priceKeyUpdated]]: body[priceKeyUpdated] }
    updateBody.licensing = licensing
  }

  const { data, error } = await supabase.from('beats')
    .update(updateBody)
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
    const { error } = await supabase.rpc('increment_play_count', { beat_id: id })
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }
    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 })
  }
} 