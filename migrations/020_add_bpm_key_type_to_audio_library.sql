-- Add BPM, Key, and Type columns to audio_library_items for better audio file organization
-- BPM (Beats Per Minute) for tempo information
ALTER TABLE audio_library_items ADD COLUMN IF NOT EXISTS bpm INTEGER;

-- Key for musical key information (e.g., "C", "Am", "F#", etc.)
ALTER TABLE audio_library_items ADD COLUMN IF NOT EXISTS key VARCHAR(10);

-- Type for categorizing audio files (e.g., "kick", "snare", "hihat", "bass", "melody", "loop", etc.)
-- Note: We already have a 'type' column, but this will be more specific for audio categorization
ALTER TABLE audio_library_items ADD COLUMN IF NOT EXISTS audio_type VARCHAR(50);

-- Add indexes for better performance when filtering by these new fields
CREATE INDEX IF NOT EXISTS audio_library_items_bpm_idx ON audio_library_items(bpm);
CREATE INDEX IF NOT EXISTS audio_library_items_key_idx ON audio_library_items(key);
CREATE INDEX IF NOT EXISTS audio_library_items_audio_type_idx ON audio_library_items(audio_type);

-- Add a composite index for common filtering combinations
CREATE INDEX IF NOT EXISTS audio_library_items_bpm_key_idx ON audio_library_items(bpm, key); 