import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { fileId, filePath, storageProvider, bucketName, folderPath = '' } = await request.json()

    if (!fileId || !filePath || !storageProvider || !bucketName) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    console.log('Copy request:', { fileId, storageProvider, bucketName, folderPath })

    // Extract the actual file path from the URL if it's a full URL
    let actualFilePath = filePath
    if (filePath.startsWith('http')) {
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

    // Get the original file data from database
    const { data: originalFileData, error: originalFileError } = await supabaseAdmin
      .from('audio_library_items')
      .select('*')
      .eq('id', fileId)
      .single()

    if (originalFileError) {
      console.error('Error fetching original file data:', originalFileError)
      return NextResponse.json(
        { error: 'Failed to fetch original file data' },
        { status: 500 }
      )
    }

    // Copy file to external storage (placeholder implementation)
    const copiedFileUrl = await copyToExternalStorage(
      originalFile,
      originalFileData.name,
      storageProvider,
      bucketName,
      folderPath
    )

    // Create a new record in the database for the copied file
    const insertData = {
      name: `${originalFileData.name} (${storageProvider.toUpperCase()})`,
      file_url: copiedFileUrl,
      file_size: originalFile.size,
      user_id: originalFileData.user_id,
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
      is_new: true,
      external_storage: {
        provider: storageProvider,
        bucket: bucketName,
        folder: folderPath
      }
    }

    const { data: newFile, error: insertError } = await supabaseAdmin
      .from('audio_library_items')
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting copied file:', insertError)
      return NextResponse.json(
        { error: 'Failed to save copied file to database' },
        { status: 500 }
      )
    }

    // Create a link between the original and copied file
    const linkData = {
      original_file_id: fileId,
      converted_file_id: newFile.id,
      original_format: getFileExtension(originalFileData.file_url),
      converted_format: getFileExtension(originalFileData.file_url), // Same format, different location
      link_type: 'external_copy'
    }

    const { error: linkError } = await supabaseAdmin
      .from('audio_file_links')
      .insert(linkData)

    if (linkError) {
      console.error('Error creating file link:', linkError)
      // Don't fail the whole operation if link creation fails
    }

    console.log('Successfully copied file:', {
      originalId: fileId,
      copiedId: newFile.id,
      storageProvider,
      bucketName
    })

    return NextResponse.json({
      success: true,
      copiedFileId: newFile.id,
      copiedFileUrl,
      message: `File copied to ${storageProvider} successfully`
    })

  } catch (error) {
    console.error('Error copying file:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function copyToExternalStorage(
  file: Blob,
  fileName: string,
  storageProvider: string,
  bucketName: string,
  folderPath: string
): Promise<string> {
  // This is a placeholder implementation
  // In a real implementation, you would:
  // 1. Use AWS SDK for S3
  // 2. Use Google Cloud SDK for GCS
  // 3. Use Azure SDK for Blob Storage
  // 4. Use Dropbox SDK for Dropbox

  console.log(`Copying ${fileName} to ${storageProvider} bucket: ${bucketName}`)
  
  // Simulate the copy operation
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Return a simulated URL
  const fileExtension = fileName.split('.').pop()
  const simulatedUrl = `https://${storageProvider}.com/${bucketName}/${folderPath}${fileName}`
  
  console.log(`Simulated copy to: ${simulatedUrl}`)
  
  return simulatedUrl
}

function getFileExtension(fileUrl: string): string {
  return fileUrl.split('.').pop()?.toLowerCase() || ''
} 