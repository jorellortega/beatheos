-- Add replaced_at column to tracks, singles, and album_tracks tables to track when items are replaced

-- Add replaced_at column to tracks table
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS replaced_at TIMESTAMP WITH TIME ZONE;

-- Add replaced_at column to singles table
ALTER TABLE singles ADD COLUMN IF NOT EXISTS replaced_at TIMESTAMP WITH TIME ZONE;

-- Add replaced_at column to album_tracks table
ALTER TABLE album_tracks ADD COLUMN IF NOT EXISTS replaced_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS tracks_replaced_at_idx ON tracks(replaced_at);
CREATE INDEX IF NOT EXISTS singles_replaced_at_idx ON singles(replaced_at);
CREATE INDEX IF NOT EXISTS album_tracks_replaced_at_idx ON album_tracks(replaced_at);

-- Add comments for documentation
COMMENT ON COLUMN tracks.replaced_at IS 'Timestamp when this track was last replaced/updated with new audio';
COMMENT ON COLUMN singles.replaced_at IS 'Timestamp when this single was last replaced/updated with new audio';
COMMENT ON COLUMN album_tracks.replaced_at IS 'Timestamp when this album track was last replaced/updated with new audio';
