-- Add session_id to album_tracks table for linking beat sessions
ALTER TABLE album_tracks 
ADD COLUMN session_id UUID REFERENCES beat_sessions(id) ON DELETE SET NULL;

-- Add session_id to singles table for linking beat sessions
ALTER TABLE singles 
ADD COLUMN session_id UUID REFERENCES beat_sessions(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX album_tracks_session_id_idx ON album_tracks(session_id);
CREATE INDEX singles_session_id_idx ON singles(session_id);

-- Add comments for documentation
COMMENT ON COLUMN album_tracks.session_id IS 'Optional link to the beat session that created this track';
COMMENT ON COLUMN singles.session_id IS 'Optional link to the beat session that created this single'; 