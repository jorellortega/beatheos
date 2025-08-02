-- Emergency fix for album_tracks status constraint
-- This will immediately drop the old constraint and add the new one

-- First, let's see what the current constraint looks like
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'album_tracks_status_check';

-- Drop the constraint immediately
ALTER TABLE album_tracks DROP CONSTRAINT IF EXISTS album_tracks_status_check;

-- Add the new constraint with 'distribute'
ALTER TABLE album_tracks 
ADD CONSTRAINT album_tracks_status_check 
CHECK (status IN ('production', 'draft', 'distribute', 'error', 'published', 'other'));

-- Verify the new constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'album_tracks_status_check'; 