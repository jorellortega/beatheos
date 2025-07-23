-- Add is_ready column to audio_library_items for marking files as ready/not ready
ALTER TABLE audio_library_items ADD COLUMN IF NOT EXISTS is_ready BOOLEAN DEFAULT false;

-- Create index for better performance when filtering by ready status
CREATE INDEX IF NOT EXISTS audio_library_items_is_ready_idx ON audio_library_items(is_ready);

-- Add comment for documentation
COMMENT ON COLUMN audio_library_items.is_ready IS 'Boolean flag to mark audio files or MIDI as ready for use (true) or not ready (false)'; 