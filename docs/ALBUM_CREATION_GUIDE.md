# Album Creation Feature - Upload Beat Page

## Overview
You can now create albums directly from the upload-beat page when uploading multiple files. This feature allows you to drag and drop multiple audio files, set a cover image, and publish them all as tracks in a single album.

## How to Use

### Step 1: Navigate to Upload Beat Page
Go to `http://localhost:3000/upload-beat` and click on the **"Files"** tab.

### Step 2: Add Multiple Files
Drag and drop multiple audio files (MP3s) into the dropzone. You can also:
- Add WAV files for high-quality versions
- Add ZIP files containing stems
- Add image files for cover art

### Step 3: Set Cover Art
If you've added an image file, you can:
1. Select it from the files list
2. Click **"Set as Cover"** button
3. Or select multiple audio files and click **"Apply Cover to Selected"**

### Step 4: Enable Album Mode
1. Toggle the **"Create as Album"** switch
2. A form will appear asking for album information:
   - **Album Title** (required)
   - **Artist** (optional - defaults to your username)
   - **Release Date** (optional - defaults to today)
   - **Description** (optional)

### Step 5: Select Tracks
Select the audio files you want to include in the album by checking their checkboxes.

### Step 6: Create Album
Click the **"Create Album"** button. The system will:
1. Upload the cover art (if provided)
2. Create the album in the database
3. Upload each selected audio file
4. Create tracks in the album_tracks table
5. Automatically navigate you to the album details page

## Features

### Album Structure
- **Albums Table**: Stores album metadata (title, artist, release_date, cover_art_url, description, status, production_status)
- **Album Tracks Table**: Stores individual tracks with references to audio files
  - Each track can have: audio_url, wav_url, stems_url
  - Tracks are ordered by track_order field
  - Each track inherits the album's cover art by default

### File Support
- **Audio Files**: MP3, WAV
- **Stems**: ZIP files
- **Cover Art**: JPEG, PNG, GIF, WebP

### Status System
- Albums are created with `status: 'draft'` and `production_status: 'production'`
- You can later update these in the album details page

## Debug Logging
The feature includes comprehensive debug logging. Check your browser console for:
- `[DEBUG handlePublishAsAlbum]` - Album creation process
- File upload progress
- Track creation status
- Error messages if something goes wrong

## Navigation
After successful album creation, you'll be automatically redirected to:
```
/myalbums/{album_id}
```

You can also find your albums in:
- `/mylibrary` - View all your albums
- `/myalbums` - Manage your albums

## Technical Details

### Database Tables Used
1. **albums**: Main album information
2. **album_tracks**: Individual tracks within albums

### Storage Paths
- Cover art: `albums/{user_id}/{timestamp}.{ext}`
- Audio files: `albums/{user_id}/{album_id}/{timestamp}_{title}.{ext}`
- WAV files: `albums/{user_id}/{album_id}/{timestamp}_{title}_wav.{ext}`
- Stems: `albums/{user_id}/{album_id}/{timestamp}_{title}_stems.{ext}`

## Tips
1. **Edit Track Names**: Before creating the album, you can edit individual file names which will become the track titles
2. **Batch Operations**: Use "Select All" to quickly select all files for the album
3. **Cover Art**: Always set cover art before creating the album for best results
4. **Track Order**: Files are added as tracks in the order they appear in the selection

## Troubleshooting

### "Album Title Required" Error
Make sure you've entered a title in the Album Title field when album mode is enabled.

### Files Not Uploading
Check your browser console for specific error messages. Common issues:
- Network connectivity
- Supabase storage bucket permissions
- File size limits

### Album Not Created
Verify:
- You're logged in
- At least one file is selected
- Album title is provided
- Your Supabase connection is working

## Example Workflow
1. Drag 10 MP3 files onto the page
2. Drag 1 cover image onto the page
3. Click "Set as Cover" on the image
4. Toggle "Create as Album"
5. Enter "My Awesome Beats Vol. 1" as title
6. Enter "DJ Producer" as artist
7. Click "Select All" to select all MP3 files
8. Click "Create Album"
9. Wait for upload progress
10. Get redirected to your new album page!

