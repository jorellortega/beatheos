-- Test script to check if lyrics column exists and works
-- Run this in your Supabase SQL editor

-- Check if lyrics column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sessions' 
AND column_name = 'lyrics';

-- Test inserting lyrics data
INSERT INTO sessions (user_id, name, lyrics) 
VALUES ('f8648be8-c95e-4f81-b858-137194c5e928', 'Test Lyrics', 'This is a test lyrics content')
ON CONFLICT DO NOTHING;

-- Check if the data was inserted
SELECT id, name, lyrics 
FROM sessions 
WHERE name = 'Test Lyrics' 
AND user_id = 'f8648be8-c95e-4f81-b858-137194c5e928';

-- Clean up test data
DELETE FROM sessions 
WHERE name = 'Test Lyrics' 
AND user_id = 'f8648be8-c95e-4f81-b858-137194c5e928';
