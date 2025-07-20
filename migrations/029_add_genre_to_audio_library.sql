-- Add genre column to audio_library_items for genre-based filtering in shuffle operations
-- Genre for categorizing audio files by musical style (e.g., "trap", "hip-hop", "house", "techno", etc.)
ALTER TABLE audio_library_items ADD COLUMN IF NOT EXISTS genre VARCHAR(100);

-- Add index for better performance when filtering by genre
CREATE INDEX IF NOT EXISTS audio_library_items_genre_idx ON audio_library_items(genre);

-- Add a composite index for common filtering combinations with genre
CREATE INDEX IF NOT EXISTS audio_library_items_genre_bpm_idx ON audio_library_items(genre, bpm);
CREATE INDEX IF NOT EXISTS audio_library_items_genre_key_idx ON audio_library_items(genre, key);
CREATE INDEX IF NOT EXISTS audio_library_items_genre_audio_type_idx ON audio_library_items(genre, audio_type);

-- Add comment for documentation
COMMENT ON COLUMN audio_library_items.genre IS 'Musical genre/style for categorizing audio files (e.g., "trap", "hip-hop", "house", "techno", "dubstep", "pop", "rock", etc.)'; 