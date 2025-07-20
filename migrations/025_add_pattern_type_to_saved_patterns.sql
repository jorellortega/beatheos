-- Add pattern_type column to saved_patterns table
ALTER TABLE saved_patterns 
ADD COLUMN pattern_type VARCHAR(50);

-- Add index for pattern_type for better query performance
CREATE INDEX saved_patterns_pattern_type_idx ON saved_patterns(pattern_type);

-- Add comment to explain the pattern_type field
COMMENT ON COLUMN saved_patterns.pattern_type IS 'Type of pattern: kick, snare, hihat, melody, bass, chord, fx, etc.'; 