-- Add BPM, genre, and subgenre columns to singles table for loop editor compatibility
-- This migration adds the missing columns that the loop editor tries to save

-- Add BPM column to singles table
ALTER TABLE singles ADD COLUMN IF NOT EXISTS bpm INTEGER;

-- Add genre column to singles table (different from primary_genre which is for distribution)
ALTER TABLE singles ADD COLUMN IF NOT EXISTS genre VARCHAR(100);

-- Add subgenre column to singles table
ALTER TABLE singles ADD COLUMN IF NOT EXISTS subgenre VARCHAR(100);

-- Add comments for documentation
COMMENT ON COLUMN singles.bpm IS 'Beats per minute of the track';
COMMENT ON COLUMN singles.genre IS 'Music genre of the track';
COMMENT ON COLUMN singles.subgenre IS 'Subgenre of the track';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS singles_bpm_idx ON singles(bpm);
CREATE INDEX IF NOT EXISTS singles_genre_idx ON singles(genre);
CREATE INDEX IF NOT EXISTS singles_subgenre_idx ON singles(subgenre);
