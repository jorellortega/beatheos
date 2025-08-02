-- Update status column constraints for albums and singles to support new status values
-- Migration: 056_update_status_values.sql

-- First, update existing data to use valid status values
-- Map old status values to new ones
UPDATE albums 
SET status = 'draft' 
WHERE status NOT IN ('production', 'draft', 'distribute', 'error', 'published', 'other');

UPDATE singles 
SET status = 'draft' 
WHERE status NOT IN ('production', 'draft', 'distribute', 'error', 'published', 'other');

-- Update album_tracks if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'album_tracks' AND column_name = 'status') THEN
        UPDATE album_tracks 
        SET status = 'draft' 
        WHERE status NOT IN ('production', 'draft', 'distribute', 'error', 'published', 'other');
    END IF;
END $$;

-- Now update the constraints
-- Update albums table status constraint
ALTER TABLE albums 
DROP CONSTRAINT IF EXISTS albums_status_check;

ALTER TABLE albums 
ADD CONSTRAINT albums_status_check 
CHECK (status IN ('production', 'draft', 'distribute', 'error', 'published', 'other'));

-- Update singles table status constraint  
ALTER TABLE singles 
DROP CONSTRAINT IF EXISTS singles_status_check;

ALTER TABLE singles 
ADD CONSTRAINT singles_status_check 
CHECK (status IN ('production', 'draft', 'distribute', 'error', 'published', 'other'));

-- Update album_tracks table status constraint (if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'album_tracks' AND column_name = 'status') THEN
        ALTER TABLE album_tracks 
        DROP CONSTRAINT IF EXISTS album_tracks_status_check;
        
        ALTER TABLE album_tracks 
        ADD CONSTRAINT album_tracks_status_check 
        CHECK (status IN ('production', 'draft', 'distribute', 'error', 'published', 'other'));
    END IF;
END $$; 