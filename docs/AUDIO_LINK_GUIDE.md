# Audio Link Manager Guide

The Audio Link Manager (`/audiolink`) is a powerful tool for converting and linking your audio files across different formats. This allows you to maintain relationships between different versions of the same audio file (e.g., WAV and MP3 versions).

## Features

### 1. Audio File Conversion
- Convert audio files to MP3 format
- Support for multiple input formats (WAV, FLAC, AIFF, etc.)
- Automatic file linking after conversion
- Progress tracking during conversion

### 2. File Linking
- Manually link existing files of different formats
- View all linked files in a dedicated tab
- Delete file links when no longer needed
- Maintain relationships between original and converted files

### 3. File Management
- Search and filter audio files by format
- View file metadata (BPM, key, genre, file size)
- See linked file relationships
- Refresh file list to get latest updates

## How to Use

### Converting Files to MP3

1. Navigate to `/audiolink`
2. In the "Audio Files" tab, find the file you want to convert
3. Click the "Convert to MP3" button
4. Wait for the conversion to complete
5. The converted file will automatically be linked to the original

### Linking Existing Files

1. In the "Audio Files" tab, click the "Link" button on a file
2. Select the target file you want to link with
3. Click "Create Link" to establish the relationship
4. View the link in the "File Links" tab

### Managing File Links

1. Switch to the "File Links" tab to see all relationships
2. Click the "X" button to delete a link
3. Links show the original and converted file names with their formats

## Database Schema

### audio_file_links Table

```sql
CREATE TABLE audio_file_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  original_file_id UUID NOT NULL REFERENCES audio_library_items(id),
  converted_file_id UUID NOT NULL REFERENCES audio_library_items(id),
  original_format VARCHAR(10) NOT NULL,
  converted_format VARCHAR(10) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Key Features:
- **User Isolation**: Each user can only see and manage their own file links
- **Referential Integrity**: Links reference actual audio files in the library
- **Format Tracking**: Stores both original and converted formats
- **Unique Constraints**: Prevents duplicate links between the same files

## API Endpoints

### Convert Audio File
```
POST /api/audio/convert
{
  "fileId": "uuid",
  "filePath": "path/to/file.wav",
  "targetFormat": "mp3"
}
```

### Manage File Links
```
GET /api/audio/links - Fetch user's file links
POST /api/audio/links - Create a new file link
DELETE /api/audio/links?id=uuid - Delete a file link
```

## File Storage

Files are stored in the Supabase storage bucket `beats` with the following structure:
- Original files: `{original_path}`
- Converted files: `{original_path_without_extension}.{new_format}`

For example:
- Original: `beats/my-song.wav`
- Converted: `beats/my-song.mp3`

## Benefits

1. **No Re-uploading**: Convert existing files without re-uploading
2. **Format Flexibility**: Maintain multiple formats of the same audio
3. **Relationship Tracking**: Always know which files are related
4. **Bucket Independence**: File relationships persist even if you change storage buckets
5. **User Control**: Full control over file conversions and links

## Future Enhancements

- Batch conversion of multiple files
- Additional output formats (AAC, OGG, etc.)
- Quality settings for conversions
- Automatic metadata extraction
- Integration with external audio processing services

## Technical Notes

- The current implementation uses a placeholder audio converter
- For production use, integrate with a proper audio conversion service (FFmpeg, etc.)
- File links are automatically created during conversion
- All operations are user-scoped for security
- The system supports the 'beats' storage bucket as specified in the requirements 