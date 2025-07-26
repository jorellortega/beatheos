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
    const { fileId, filePath, targetFormat, compressionLevel = 'medium' } = await request.json()

    if (!fileId || !filePath || !targetFormat) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    console.log('Conversion request:', { fileId, targetFormat, compressionLevel })

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

    // Get the original file to copy its metadata
    const { data: originalFileData, error: originalFileError } = await supabaseAdmin
      .from('audio_library_items')
      .select('*')
      .eq('id', fileId)
      .single()

    if (originalFileError) {
      console.error('Error fetching original file:', originalFileError)
      return NextResponse.json(
        { error: 'Failed to fetch original file metadata' },
        { status: 500 }
      )
    }

    console.log('Original file data:', {
      id: originalFileData.id,
      name: originalFileData.name,
      pack_id: originalFileData.pack_id,
      subfolder: originalFileData.subfolder
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
    const originalFileName = originalFileData.name
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

    // Insert the converted file into audio_library_items
    const insertData = {
      name: convertedFileName, // Use the proper converted filename with correct extension
      file_url: urlData.publicUrl,
      file_size: convertedBuffer.byteLength,
      user_id: user.id,
      type: 'sample', // Set default type
      pack_id: originalFileData.pack_id, // Copy pack from original file
      subfolder: originalFileData.subfolder, // Copy subfolder from original file
      bpm: originalFileData.bpm, // Copy BPM from original file
      key: originalFileData.key, // Copy key from original file
      audio_type: originalFileData.audio_type, // Copy audio type from original file
      genre: originalFileData.genre, // Copy genre from original file
      subgenre: originalFileData.subgenre, // Copy subgenre from original file
      tags: originalFileData.tags, // Copy tags from original file
      is_ready: originalFileData.is_ready, // Copy ready status from original file
      instrument_type: originalFileData.instrument_type, // Copy instrument type from original file
      mood: originalFileData.mood, // Copy mood from original file
      energy_level: originalFileData.energy_level, // Copy energy level from original file
      complexity: originalFileData.complexity, // Copy complexity from original file
      tempo_category: originalFileData.tempo_category, // Copy tempo category from original file
      key_signature: originalFileData.key_signature, // Copy key signature from original file
      time_signature: originalFileData.time_signature, // Copy time signature from original file
      duration: originalFileData.duration, // Copy duration from original file
      sample_rate: originalFileData.sample_rate, // Copy sample rate from original file
      bit_depth: originalFileData.bit_depth, // Copy bit depth from original file
      license_type: originalFileData.license_type, // Copy license type from original file
      distribution_type: originalFileData.distribution_type, // Copy distribution type from original file
      is_new: true // Mark as new since it was just converted
    }

    console.log('Inserting converted file with data:', {
      name: insertData.name,
      pack_id: insertData.pack_id,
      subfolder: insertData.subfolder
    })

    let newFile: any = null

    try {
      const { data: fileData, error: insertError } = await supabaseAdmin
        .from('audio_library_items')
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
        name: newFile.name,
        pack_id: newFile.pack_id,
        subfolder: newFile.subfolder
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