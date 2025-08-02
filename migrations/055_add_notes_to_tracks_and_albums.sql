-- Add notes fields to albums, album_tracks, and singles tables
-- This migration adds comprehensive notes functionality

-- Add notes column to albums table
ALTER TABLE albums 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add notes column to album_tracks table
ALTER TABLE album_tracks 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add notes column to singles table
ALTER TABLE singles 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comments for documentation
COMMENT ON COLUMN albums.notes IS 'User notes and comments for the album';
COMMENT ON COLUMN album_tracks.notes IS 'User notes and comments for the track';
COMMENT ON COLUMN singles.notes IS 'User notes and comments for the single'; 