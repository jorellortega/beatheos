const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

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
    const { data, error } = await supabase.storage
      .from('beats')
      .upload(storagePath, fileBuffer);
    
    if (error) throw error;
    return data;
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
    const storagePath = `${metadata.producer_id}/${beatName}/mp3/${beatName}.mp3`;
    const uploadResult = await uploadFile(mp3Path, storagePath);
    if (uploadResult) {
      metadata.mp3_path = storagePath;
      metadata.mp3_url = supabase.storage.from('beats').getPublicUrl(storagePath).data.publicUrl;
    }
  } else {
    console.log(`No MP3 file found for ${beatName}`);
  }

  // Upload WAV file
  const wavPath = path.join(beatFolder, 'wav', `${beatName}.wav`);
  if (fs.existsSync(wavPath)) {
    const storagePath = `${metadata.producer_id}/${beatName}/wav/${beatName}.wav`;
    const uploadResult = await uploadFile(wavPath, storagePath);
    if (uploadResult) {
      metadata.wav_path = storagePath;
      metadata.wav_url = supabase.storage.from('beats').getPublicUrl(storagePath).data.publicUrl;
    }
  } else {
    console.log(`No WAV file found for ${beatName}`);
  }

  // Upload stems
  const stemsPath = path.join(beatFolder, 'stems', `${beatName}.zip`);
  if (fs.existsSync(stemsPath)) {
    const storagePath = `${metadata.producer_id}/${beatName}/stems/${beatName}.zip`;
    const uploadResult = await uploadFile(stemsPath, storagePath);
    if (uploadResult) {
      metadata.stems_path = storagePath;
      metadata.stems_url = supabase.storage.from('beats').getPublicUrl(storagePath).data.publicUrl;
    }
  } else {
    console.log(`No stems file found for ${beatName}`);
  }

  // Upload cover art
  const coverPath = path.join(beatFolder, 'cover', `${beatName}.jpg`);
  if (fs.existsSync(coverPath)) {
    const storagePath = `${metadata.producer_id}/${beatName}/cover/${beatName}.jpg`;
    const uploadResult = await uploadFile(coverPath, storagePath);
    if (uploadResult) {
      metadata.cover_art_path = storagePath;
      metadata.cover_art_url = supabase.storage.from('beats').getPublicUrl(storagePath).data.publicUrl;
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