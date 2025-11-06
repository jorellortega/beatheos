-- Migration: Add visibility field to albums table
-- This adds a visibility field to control whether albums are shown on artist profiles
-- Options: private (default), public, pause, upcoming

-- Add visibility column to albums table
ALTER TABLE albums 
ADD COLUMN IF NOT EXISTS visibility VARCHAR(50) DEFAULT 'private';

-- Create index for better query performance when filtering by visibility
CREATE INDEX IF NOT EXISTS albums_visibility_idx ON albums(visibility);

-- Add constraint to ensure valid visibility values
ALTER TABLE albums 
DROP CONSTRAINT IF EXISTS albums_visibility_check;

ALTER TABLE albums 
ADD CONSTRAINT albums_visibility_check 
CHECK (visibility IN ('private', 'public', 'pause', 'upcoming'));

-- Add comment for documentation
COMMENT ON COLUMN albums.visibility IS 'Visibility status: private (default, not shown on profile), public (shown on profile), pause (temporarily hidden), upcoming (scheduled for future release)';

-- Update existing albums to have 'private' visibility by default
UPDATE albums 
SET visibility = 'private' 
WHERE visibility IS NULL;

