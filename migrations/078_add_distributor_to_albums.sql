-- Migration: Add distributor field to albums table
-- This adds a distributor field to track which distribution account is associated with each album

-- Add distributor column to albums table
ALTER TABLE albums 
ADD COLUMN IF NOT EXISTS distributor VARCHAR(255);

-- Add distributor_notes column for additional distributor-specific notes
ALTER TABLE albums 
ADD COLUMN IF NOT EXISTS distributor_notes TEXT;

-- Create index for better query performance when filtering by distributor
CREATE INDEX IF NOT EXISTS albums_distributor_idx ON albums(distributor);

-- Add comments for documentation
COMMENT ON COLUMN albums.distributor IS 'Distribution account/service associated with this album (e.g., DistroKid, TuneCore, CD Baby)';
COMMENT ON COLUMN albums.distributor_notes IS 'Additional notes specific to distribution (account details, submission notes, etc.)';

-- Update existing albums to have empty distributor field
UPDATE albums 
SET distributor = NULL, distributor_notes = NULL 
WHERE distributor IS NULL;
