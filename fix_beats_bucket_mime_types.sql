-- Fix Supabase Storage "beats" bucket to allow all necessary MIME types
-- This will enable uploads of WAV files, ZIP files (stems), and images (cover art)

-- Update the "beats" bucket to allow all required MIME types
UPDATE storage.buckets
SET 
  allowed_mime_types = ARRAY[
    -- Audio formats
    'audio/mpeg',           -- MP3 (standard)
    'audio/mp3',            -- MP3 (alternative)
    'audio/wav',            -- WAV (standard)
    'audio/x-wav',          -- WAV (variant)
    'audio/wave',           -- WAV (another variant)
    'audio/x-pn-wav',       -- WAV (Windows variant)
    
    -- Archive formats (for stems/track files)
    'application/zip',                  -- ZIP (standard)
    'application/x-zip',                -- ZIP (variant)
    'application/x-zip-compressed',     -- ZIP (compressed variant)
    
    -- Image formats (for cover art)
    'image/jpeg',           -- JPEG
    'image/jpg',            -- JPG
    'image/png',            -- PNG
    'image/gif',            -- GIF
    'image/webp',           -- WebP
    'image/svg+xml'         -- SVG
  ]
WHERE name = 'beats';

-- Verify the update
SELECT name, allowed_mime_types 
FROM storage.buckets 
WHERE name = 'beats';

