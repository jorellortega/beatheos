-- Add session_name column to singles table for UI display
ALTER TABLE singles 
ADD COLUMN session_name VARCHAR(255);

-- Add session_name column to album_tracks table for UI display
ALTER TABLE album_tracks 
ADD COLUMN session_name VARCHAR(255);

-- Add comments for documentation
COMMENT ON COLUMN singles.session_name IS 'Name of the beat session that created this single (for UI display)';
COMMENT ON COLUMN album_tracks.session_name IS 'Name of the beat session that created this track (for UI display)';
