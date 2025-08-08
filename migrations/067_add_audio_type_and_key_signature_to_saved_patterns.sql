-- Add audio_type and key_signature columns to saved_patterns table
ALTER TABLE saved_patterns 
ADD COLUMN audio_type TEXT,
ADD COLUMN key_signature TEXT;

-- Add comments for documentation
COMMENT ON COLUMN saved_patterns.audio_type IS 'Type of audio (e.g., Drum, Bass, Melody)';
COMMENT ON COLUMN saved_patterns.key_signature IS 'Musical key (e.g., C, C#, D, etc.)';
