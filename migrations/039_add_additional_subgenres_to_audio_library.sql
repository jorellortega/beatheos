-- Add additional_subgenres column to audio_library_items for storing multiple subgenres
ALTER TABLE audio_library_items 
ADD COLUMN IF NOT EXISTS additional_subgenres JSONB DEFAULT '[]'::jsonb;

-- Create index for additional_subgenres column with proper operator class for JSONB
CREATE INDEX IF NOT EXISTS audio_library_items_additional_subgenres_idx ON audio_library_items USING GIN (additional_subgenres jsonb_path_ops);

-- Add comment explaining the column
COMMENT ON COLUMN audio_library_items.additional_subgenres IS 'JSONB array of additional subgenres for categorizing audio files (e.g., ["drill", "dark trap", "melodic"])'; 