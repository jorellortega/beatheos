-- Complete fix for album_tracks status constraint and data
-- This migration handles both existing data and the constraint

-- Step 1: Update all existing data to valid status values
-- Set any NULL values to 'draft'
UPDATE album_tracks SET status = 'draft' WHERE status IS NULL;

-- Update old status values to new ones
UPDATE album_tracks SET status = 'draft' WHERE status = 'active';
UPDATE album_tracks SET status = 'distribute' WHERE status = 'ready_to_distribute';
UPDATE album_tracks SET status = 'published' WHERE status = 'scheduled';
UPDATE album_tracks SET status = 'error' WHERE status = 'archived';

-- Set any other unexpected status values to 'draft'
UPDATE album_tracks SET status = 'draft'
WHERE status NOT IN ('production', 'draft', 'distribute', 'error', 'published', 'other');

-- Step 2: Drop the existing constraint
ALTER TABLE album_tracks DROP CONSTRAINT IF EXISTS album_tracks_status_check;

-- Step 3: Add the new constraint
ALTER TABLE album_tracks 
ADD CONSTRAINT album_tracks_status_check 
CHECK (status IN ('production', 'draft', 'distribute', 'error', 'published', 'other'));

-- Step 4: Verify the fix
SELECT status, COUNT(*) as count 
FROM album_tracks 
GROUP BY status 
ORDER BY status; 