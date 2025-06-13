-- Add new lyrics section columns to sessions table
ALTER TABLE sessions
ADD COLUMN verse_lyrics TEXT,
ADD COLUMN hook_lyrics TEXT,
ADD COLUMN others_lyrics TEXT;

-- Update existing sessions to split lyrics into sections
UPDATE sessions
SET 
  verse_lyrics = SPLIT_PART(lyrics, E'\n\n', 1),
  hook_lyrics = SPLIT_PART(lyrics, E'\n\n', 2),
  others_lyrics = SPLIT_PART(lyrics, E'\n\n', 3)
WHERE lyrics IS NOT NULL; 