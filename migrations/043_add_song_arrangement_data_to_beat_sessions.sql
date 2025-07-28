-- Add song_arrangement_data column to beat_sessions table
ALTER TABLE beat_sessions 
ADD COLUMN song_arrangement_data JSONB DEFAULT '[]';

-- Add index for better performance when querying song arrangement data
CREATE INDEX beat_sessions_song_arrangement_data_idx ON beat_sessions USING GIN (song_arrangement_data); 