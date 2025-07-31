import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { createClient } from '@supabase/supabase-js'
import { getFileExtension, generateConvertedFileName, getFormatMimeType } from '@/lib/audioConverter'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

const execAsync = promisify(exec)

// Initialize Supabase client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Real audio conversion function using FFmpeg
async function convertAudioToMp3(inputBuffer: ArrayBuffer, compressionLevel: 'ultra_high' | 'high' | 'medium' | 'low'): Promise<ArrayBuffer> {
  try {
    // Set bitrate based on compression level
    let bitrate = '192k' // medium default
    switch (compressionLevel) {
      case 'ultra_high':
        bitrate = '64k'  // Maximum compression - very small files
        break
      case 'high':
        bitrate = '128k'
        break
      case 'medium':
        bitrate = '192k'
        break
      case 'low':
        bitrate = '320k'
        break
    }

    console.log(`Converting audio with bitrate: ${bitrate}`)
    
    // Create temporary files
    const tempDir = tmpdir()
    const inputPath = join(tempDir, `input_${Date.now()}.wav`)
    const outputPath = join(tempDir, `output_${Date.now()}.mp3`)
    
    try {
      // Write input buffer to temporary file
      await writeFile(inputPath, Buffer.from(inputBuffer))
      
      // Run FFmpeg conversion with additional compression settings for ultra high
      let ffmpegCommand = `ffmpeg -i "${inputPath}" -b:a ${bitrate} -ar 44100 -ac 2 -y "${outputPath}"`
      
      // Add extra compression settings for ultra high compression
      if (compressionLevel === 'ultra_high') {
        ffmpegCommand = `ffmpeg -i "${inputPath}" -b:a ${bitrate} -ar 22050 -ac 1 -compression_level 9 -y "${outputPath}"`
      }
      
      console.log('Running FFmpeg command:', ffmpegCommand)
      
      const { stdout, stderr } = await execAsync(ffmpegCommand)
      console.log('FFmpeg stdout:', stdout)
      if (stderr) console.log('FFmpeg stderr:', stderr)
      
      // Read the converted file
      const convertedFile = await import('fs/promises').then(fs => fs.readFile(outputPath))
      
      console.log(`Real conversion completed: ${inputBuffer.byteLength} → ${convertedFile.length} bytes`)
      
      return convertedFile as unknown as ArrayBuffer
    } finally {
      // Clean up temporary files
      try {
        await unlink(inputPath)
        await unlink(outputPath)
      } catch (cleanupError) {
        console.warn('Failed to cleanup temp files:', cleanupError)
      }
    }
  } catch (error) {
    console.error('FFmpeg conversion error:', error)
    throw new Error(`Failed to convert audio: ${error}`)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { fileId, filePath, targetFormat, compressionLevel = 'medium', fileType = 'audio_library' } = await request.json()

    if (!fileId || !filePath || !targetFormat) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    console.log('Conversion request:', { fileId, targetFormat, compressionLevel, fileType })

    // Extract the actual file path from the URL if it's a full URL
    let actualFilePath = filePath
    if (filePath.startsWith('http')) {
      // Extract path from URL like: https://.../storage/v1/object/public/beats/audio-library/file.wav
      const urlParts = filePath.split('/storage/v1/object/public/beats/')
      if (urlParts.length > 1) {
        actualFilePath = urlParts[1]
      } else {
        return NextResponse.json(
          { error: 'Invalid file URL format' },
          { status: 400 }
        )
      }
    }

    console.log('Downloading file with path:', actualFilePath)

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

    // Get the original file to copy its metadata based on file type
    let originalFileData: any = null
    let originalFileError: any = null

    if (fileType === 'album_track') {
      const { data, error } = await supabaseAdmin
        .from('album_tracks')
        .select('*')
        .eq('id', fileId)
        .single()
      originalFileData = data
      originalFileError = error
    } else if (fileType === 'single') {
      const { data, error } = await supabaseAdmin
        .from('singles')
        .select('*')
        .eq('id', fileId)
        .single()
      originalFileData = data
      originalFileError = error
    } else {
      // Default to audio_library_items
      const { data, error } = await supabaseAdmin
        .from('audio_library_items')
        .select('*')
        .eq('id', fileId)
        .single()
      originalFileData = data
      originalFileError = error
    }

    if (originalFileError) {
      console.error('Error fetching original file:', originalFileError)
      return NextResponse.json(
        { error: 'Failed to fetch original file metadata' },
        { status: 500 }
      )
    }

    console.log('Original file data:', {
      id: originalFileData.id,
      name: originalFileData.title || originalFileData.name,
      fileType: fileType
    })

    // Get the original file from Supabase storage
    const { data: originalFile, error: downloadError } = await supabaseAdmin.storage
      .from('beats')
      .download(actualFilePath)

    if (downloadError) {
      console.error('Error downloading original file:', downloadError)
      return NextResponse.json(
        { error: 'Failed to download original file' },
        { status: 500 }
      )
    }

    // Get the original file format
    const originalFormat = getFileExtension(actualFilePath)
    
    // Convert the file to the target format
    const originalBuffer = await originalFile.arrayBuffer()
    const convertedBuffer = await convertAudioToMp3(originalBuffer, compressionLevel)
    
    // Generate new file path for converted file
    const newFilePath = generateConvertedFileName(actualFilePath, targetFormat)
    
    // Generate the proper filename for the converted file
    const originalFileName = originalFileData.title || originalFileData.name
    const convertedFileName = generateConvertedFileName(originalFileName, targetFormat)
    
    // Upload converted file to Supabase storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('beats')
      .upload(newFilePath, convertedBuffer, {
        contentType: getFormatMimeType(targetFormat),
        upsert: true
      })

    if (uploadError) {
      console.error('Error uploading converted file:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload converted file' },
        { status: 500 }
      )
    }

    // Get the public URL for the converted file
    const { data: urlData } = supabaseAdmin.storage
      .from('beats')
      .getPublicUrl(newFilePath)

    // Prepare insert data based on file type
    let insertData: any = {}
    let targetTable = 'audio_library_items'

    if (fileType === 'album_track') {
      // Insert as new album track
      targetTable = 'album_tracks'
      insertData = {
        title: convertedFileName,
        audio_url: urlData.publicUrl,
        duration: originalFileData.duration,
        isrc: originalFileData.isrc,
        album_id: originalFileData.album_id
      }
    } else if (fileType === 'single') {
      // Insert as new single
      targetTable = 'singles'
      insertData = {
        title: convertedFileName,
        audio_url: urlData.publicUrl,
        duration: originalFileData.duration,
        artist: originalFileData.artist,
        release_date: originalFileData.release_date,
        description: originalFileData.description,
        cover_art_url: originalFileData.cover_art_url,
        user_id: user.id
      }
    } else {
      // Default to audio_library_items
      insertData = {
        name: convertedFileName,
        file_url: urlData.publicUrl,
        file_size: convertedBuffer.byteLength,
        user_id: user.id,
        type: 'sample',
        pack_id: originalFileData.pack_id,
        subfolder: originalFileData.subfolder,
        bpm: originalFileData.bpm,
        key: originalFileData.key,
        audio_type: originalFileData.audio_type,
        genre: originalFileData.genre,
        subgenre: originalFileData.subgenre,
        tags: originalFileData.tags,
        is_ready: originalFileData.is_ready,
        instrument_type: originalFileData.instrument_type,
        mood: originalFileData.mood,
        energy_level: originalFileData.energy_level,
        complexity: originalFileData.complexity,
        tempo_category: originalFileData.tempo_category,
        key_signature: originalFileData.key_signature,
        time_signature: originalFileData.time_signature,
        duration: originalFileData.duration,
        sample_rate: originalFileData.sample_rate,
        bit_depth: originalFileData.bit_depth,
        license_type: originalFileData.license_type,
        distribution_type: originalFileData.distribution_type,
        is_new: true
      }
    }

    console.log('Inserting converted file with data:', {
      table: targetTable,
      data: insertData
    })

    let newFile: any = null

    try {
      const { data: fileData, error: insertError } = await supabaseAdmin
        .from(targetTable)
        .insert(insertData)
        .select()
        .single()

      if (insertError) {
        console.error('Error inserting converted file:', insertError)
        return NextResponse.json(
          { error: 'Failed to save converted file to database' },
          { status: 500 }
        )
      }

      newFile = fileData
      console.log('Successfully created converted file:', {
        id: newFile.id,
        table: targetTable,
        name: newFile.title || newFile.name
      })
    } catch (error) {
      console.error('Error in database insert:', error)
      return NextResponse.json(
        { error: 'Failed to save converted file to database' },
        { status: 500 }
      )
    }

    // Create a link between the original and converted files
    if (newFile && user) {
      const { error: linkError } = await supabaseAdmin
        .from('audio_file_links')
        .insert({
          user_id: user.id,
          original_file_id: fileId,
          converted_file_id: newFile.id,
          original_format: originalFormat,
          converted_format: targetFormat
        })

      if (linkError) {
        console.error('Error creating file link:', linkError)
        // Don't fail the entire operation if linking fails
      }
    }

    return NextResponse.json({
      success: true,
      convertedFilePath: newFilePath,
      convertedFileUrl: urlData.publicUrl,
      convertedFileId: newFile?.id
    })

  } catch (error) {
    console.error('Error in audio conversion:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 