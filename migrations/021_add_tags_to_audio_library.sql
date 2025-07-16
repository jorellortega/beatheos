-- Add tags column to audio_library_items for storing multiple tags per audio file
-- Tags will be stored as a JSON array for flexibility
ALTER TABLE audio_library_items ADD COLUMN IF NOT EXISTS tags JSON;

-- Add a comment to explain the tags column structure
COMMENT ON COLUMN audio_library_items.tags IS 'JSON array of tags for categorizing audio files (e.g., ["trap", "dark", "aggressive", "808"])'; 