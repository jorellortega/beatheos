-- Fix album_tracks status constraint to use 'distribute' instead of 'ready_to_distribute'
-- This migration updates the constraint to match the new status values

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

-- Add new constraint with 'distribute' instead of 'ready_to_distribute'
ALTER TABLE album_tracks
ADD CONSTRAINT album_tracks_status_check
CHECK (status IN ('production', 'draft', 'distribute', 'error', 'published', 'other'));

-- Update comment for documentation
COMMENT ON COLUMN album_tracks.status IS 'Production status: production, draft, distribute, error, published, other'; 