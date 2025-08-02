-- Update album_tracks status constraint to use new production-focused status values
-- This migration updates the existing status constraint to reflect the new workflow

-- First, update all existing data to use valid status values
-- This ensures no constraint violations when we add the new constraint

-- Set any NULL or invalid status values to 'draft'
UPDATE album_tracks SET status = 'draft' WHERE status IS NULL;

-- Map old status values to new ones
UPDATE album_tracks SET status = 'draft' WHERE status = 'active';
UPDATE album_tracks SET status = 'ready_to_distribute' WHERE status = 'paused';
UPDATE album_tracks SET status = 'published' WHERE status = 'scheduled';
UPDATE album_tracks SET status = 'error' WHERE status = 'archived';

-- Set any other unexpected status values to 'draft'
UPDATE album_tracks SET status = 'draft' 
WHERE status NOT IN ('production', 'draft', 'ready_to_distribute', 'error', 'published');

-- Drop existing constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'album_tracks_status_check' 
        AND table_name = 'album_tracks'
    ) THEN
        ALTER TABLE album_tracks DROP CONSTRAINT album_tracks_status_check;
    END IF;
END $$;

-- Add constraint to ensure valid status values
ALTER TABLE album_tracks 
ADD CONSTRAINT album_tracks_status_check 
CHECK (status IN ('production', 'draft', 'ready_to_distribute', 'error', 'published'));

-- Update comment for documentation
COMMENT ON COLUMN album_tracks.status IS 'Production status: production, draft, ready_to_distribute, error, published'; 