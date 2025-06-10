const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// DEBUG: Log Supabase client creation
console.debug('[DEBUG] Creating Supabase client in rhythm-forge/audio-library/upload.js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Function to read metadata from a beat folder
function readMetadata(beatPath) {
  const metadataPath = path.join(beatPath, 'metadata.json');
  if (fs.existsSync(metadataPath)) {
    return JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  }
  return null;
}

// Function to upload a file to Supabase storage
async function uploadFile(filePath, storagePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    // Append unique suffix to file name
    const ext = path.extname(storagePath);
    const base = path.basename(storagePath, ext);
    const dir = path.dirname(storagePath);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const uniqueFileName = `${base}_${uniqueSuffix}${ext}`;
    const uniqueStoragePath = path.join(dir, uniqueFileName);
    const { data, error } = await supabase.storage
      .from('beats')
      .upload(uniqueStoragePath, fileBuffer);
    if (error) throw error;
    return { data, uniqueStoragePath };
  } catch (error) {
    console.error(`Error uploading ${filePath}:`, error.message);
    return null;
  }
}

// Function to process a beat folder
async function processBeatFolder(beatFolder) {
  const beatName = path.basename(beatFolder);
  console.log(`\nProcessing beat: ${beatName}`);
  
  const metadata = readMetadata(beatFolder);
  if (!metadata) {
    console.log(`No metadata found for ${beatName}`);
    return;
  }

  // Use the producer_id from metadata.json directly
  // Ensure it's a valid UUID for your Supabase users

  // Upload MP3 file
  const mp3Path = path.join(beatFolder, 'mp3', `${beatName}.mp3`);
  if (fs.existsSync(mp3Path)) {
    const { data, uniqueStoragePath } = await uploadFile(mp3Path, `${metadata.producer_id}/${beatName}/mp3/${beatName}.mp3`);
    if (data) {
      metadata.mp3_path = uniqueStoragePath;
      metadata.mp3_url = supabase.storage.from('beats').getPublicUrl(uniqueStoragePath).data.publicUrl;
    }
  } else {
    console.log(`No MP3 file found for ${beatName}`);
  }

  // Upload WAV file
  const wavPath = path.join(beatFolder, 'wav', `${beatName}.wav`);
  if (fs.existsSync(wavPath)) {
    const { data, uniqueStoragePath } = await uploadFile(wavPath, `${metadata.producer_id}/${beatName}/wav/${beatName}.wav`);
    if (data) {
      metadata.wav_path = uniqueStoragePath;
      metadata.wav_url = supabase.storage.from('beats').getPublicUrl(uniqueStoragePath).data.publicUrl;
    }
  } else {
    console.log(`No WAV file found for ${beatName}`);
  }

  // Upload stems
  const stemsPath = path.join(beatFolder, 'stems', `${beatName}.zip`);
  if (fs.existsSync(stemsPath)) {
    const { data, uniqueStoragePath } = await uploadFile(stemsPath, `${metadata.producer_id}/${beatName}/stems/${beatName}.zip`);
    if (data) {
      metadata.stems_path = uniqueStoragePath;
      metadata.stems_url = supabase.storage.from('beats').getPublicUrl(uniqueStoragePath).data.publicUrl;
    }
  } else {
    console.log(`No stems file found for ${beatName}`);
  }

  // Upload cover art
  const coverPath = path.join(beatFolder, 'cover', `${beatName}.jpg`);
  if (fs.existsSync(coverPath)) {
    const { data, uniqueStoragePath } = await uploadFile(coverPath, `${metadata.producer_id}/${beatName}/cover/${beatName}.jpg`);
    if (data) {
      metadata.cover_art_path = uniqueStoragePath;
      metadata.cover_art_url = supabase.storage.from('beats').getPublicUrl(uniqueStoragePath).data.publicUrl;
    }
  } else {
    console.log(`No cover art found for ${beatName}`);
  }

  // Update beat metadata in database
  try {
    const { data, error } = await supabase
      .from('beats')
      .upsert({
        ...metadata,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
    console.log(`Successfully updated database for ${beatName}`);
  } catch (error) {
    console.error(`Error updating database for ${beatName}:`, error);
  }
}

// Main function to process all beat folders
async function main() {
  const beatsDir = path.join(__dirname, 'beats');
  const beatFolders = fs.readdirSync(beatsDir)
    .filter(folder => fs.statSync(path.join(beatsDir, folder)).isDirectory());

  for (const folder of beatFolders) {
    await processBeatFolder(path.join(beatsDir, folder));
  }
}

main().catch(console.error); 