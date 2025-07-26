-- Fix CORS settings for the beats storage bucket
-- Run this in your Supabase SQL editor

-- Update CORS policy for the beats bucket
UPDATE storage.buckets 
SET cors_origins = ARRAY[
  'http://localhost:3000',
  'http://localhost:3001', 
  'http://localhost:5173',
  'https://your-production-domain.com'
]
WHERE id = 'beats';

-- Alternative: If you want to allow all origins (less secure, but easier for development)
-- UPDATE storage.buckets 
-- SET cors_origins = ARRAY['*']
-- WHERE id = 'beats';

-- Verify the update
SELECT id, cors_origins FROM storage.buckets WHERE id = 'beats'; 