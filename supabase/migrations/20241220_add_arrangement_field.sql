-- Add arrangement field to sessions table for lyrics structure tracking
-- Created: 2024-12-20

-- Add arrangement column to store the structure of the lyrics
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS lyrics_arrangement JSONB DEFAULT '[]';

-- Add comment to document the column
COMMENT ON COLUMN sessions.lyrics_arrangement IS 'JSON array storing the arrangement structure of the lyrics (e.g., [{"type": "intro", "lines": 4}, {"type": "verse", "lines": 8}])';

-- Add GIN index for efficient JSON queries
CREATE INDEX IF NOT EXISTS idx_sessions_lyrics_arrangement ON sessions USING GIN (lyrics_arrangement);
