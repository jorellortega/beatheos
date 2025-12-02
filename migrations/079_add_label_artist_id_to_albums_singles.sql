-- Add label_artist_id to albums and singles tables
-- This allows linking albums and singles to artists from the label_artists table

-- Add label_artist_id to albums table
ALTER TABLE albums 
ADD COLUMN IF NOT EXISTS label_artist_id UUID REFERENCES label_artists(id) ON DELETE SET NULL;

-- Add label_artist_id to singles table
ALTER TABLE singles 
ADD COLUMN IF NOT EXISTS label_artist_id UUID REFERENCES label_artists(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_albums_label_artist_id ON albums(label_artist_id);
CREATE INDEX IF NOT EXISTS idx_singles_label_artist_id ON singles(label_artist_id);

-- Add comments for documentation
COMMENT ON COLUMN albums.label_artist_id IS 'Link to label_artists table - allows publishing albums to artist pages';
COMMENT ON COLUMN singles.label_artist_id IS 'Link to label_artists table - allows publishing singles to artist pages';

