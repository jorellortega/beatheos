# Audio Library

This directory contains the audio library for the Rhythm Forge project. It serves as a local storage and organization system for audio files before they are uploaded to the Supabase storage bucket.

## Directory Structure

```
audio-library/
├── beats/              # Main beats directory
│   ├── mp3/           # MP3 format beats
│   ├── wav/           # WAV format beats
│   └── stems/         # Beat stems and multitrack files
├── samples/           # Sample library
│   ├── drums/         # Drum samples
│   ├── instruments/   # Instrument samples
│   └── effects/       # Effect samples
└── temp/             # Temporary storage for processing
```

## File Organization

- **Beats**: Each beat should be organized in its own folder with the following structure:
  ```
  beats/[beat-title]/
  ├── [beat-title].mp3
  ├── [beat-title].wav
  ├── [beat-title]-stems.zip
  └── cover-art.jpg
  ```

- **Samples**: Samples should be organized by type and include metadata:
  ```
  samples/[type]/[sample-name]/
  ├── [sample-name].wav
  └── metadata.json
  ```

## File Naming Conventions

1. Use lowercase letters
2. Replace spaces with hyphens
3. Include BPM and key in the filename when applicable
4. Example: `trap-beat-140bpm-am.mp3`

## Metadata

Each beat folder should include a `metadata.json` file with the following structure:
```json
{
  "title": "Beat Title",
  "bpm": 140,
  "key": "Am",
  "genre": "Trap",
  "tags": ["trap", "dark", "melodic"],
  "description": "Beat description",
  "created_at": "2024-03-20T00:00:00Z",
  "updated_at": "2024-03-20T00:00:00Z"
}
```

## Usage

1. Place new beats in the appropriate format directory
2. Include all required files (MP3, WAV, stems if available)
3. Add cover art and metadata
4. Use the upload script to transfer to Supabase storage

## Best Practices

1. Always maintain both MP3 and WAV versions of beats
2. Keep stems organized and properly labeled
3. Use consistent naming conventions
4. Include metadata for all files
5. Regularly backup the library
6. Clean up temporary files 