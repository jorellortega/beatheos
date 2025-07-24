 -- Add additional metadata columns to audio_library_items for better audio file organization

-- Instrument type for categorizing specific instruments
ALTER TABLE audio_library_items 
ADD COLUMN IF NOT EXISTS instrument_type VARCHAR(100);

-- Mood for describing emotional feel
ALTER TABLE audio_library_items 
ADD COLUMN IF NOT EXISTS mood VARCHAR(100);

-- Energy level (1-10 scale)
ALTER TABLE audio_library_items 
ADD COLUMN IF NOT EXISTS energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10);

-- Complexity level (1-10 scale)
ALTER TABLE audio_library_items 
ADD COLUMN IF NOT EXISTS complexity INTEGER CHECK (complexity >= 1 AND complexity <= 10);

-- Tempo category for quick filtering
ALTER TABLE audio_library_items 
ADD COLUMN IF NOT EXISTS tempo_category VARCHAR(50);

-- Key signature for more detailed key information
ALTER TABLE audio_library_items 
ADD COLUMN IF NOT EXISTS key_signature VARCHAR(20);

-- Time signature for rhythm structure
ALTER TABLE audio_library_items 
ADD COLUMN IF NOT EXISTS time_signature VARCHAR(10);

-- Duration in seconds
ALTER TABLE audio_library_items 
ADD COLUMN IF NOT EXISTS duration DECIMAL(10,2);

-- Sample rate for audio quality info
ALTER TABLE audio_library_items 
ADD COLUMN IF NOT EXISTS sample_rate INTEGER;

-- Bit depth for audio quality info
ALTER TABLE audio_library_items 
ADD COLUMN IF NOT EXISTS bit_depth INTEGER;

-- License type for usage permissions
ALTER TABLE audio_library_items 
ADD COLUMN IF NOT EXISTS license_type VARCHAR(50);

-- New file flag for marking recently added files
ALTER TABLE audio_library_items 
ADD COLUMN IF NOT EXISTS is_new BOOLEAN DEFAULT true;

-- Distribution type for platform classification (private, public, commercial, other)
ALTER TABLE audio_library_items 
ADD COLUMN IF NOT EXISTS distribution_type VARCHAR(50) DEFAULT 'private';

-- Create indexes for commonly queried columns
CREATE INDEX IF NOT EXISTS audio_library_items_instrument_type_idx ON audio_library_items(instrument_type);
CREATE INDEX IF NOT EXISTS audio_library_items_mood_idx ON audio_library_items(mood);
CREATE INDEX IF NOT EXISTS audio_library_items_energy_level_idx ON audio_library_items(energy_level);
CREATE INDEX IF NOT EXISTS audio_library_items_complexity_idx ON audio_library_items(complexity);
CREATE INDEX IF NOT EXISTS audio_library_items_tempo_category_idx ON audio_library_items(tempo_category);
CREATE INDEX IF NOT EXISTS audio_library_items_key_signature_idx ON audio_library_items(key_signature);
CREATE INDEX IF NOT EXISTS audio_library_items_time_signature_idx ON audio_library_items(time_signature);
CREATE INDEX IF NOT EXISTS audio_library_items_duration_idx ON audio_library_items(duration);
CREATE INDEX IF NOT EXISTS audio_library_items_license_type_idx ON audio_library_items(license_type);
CREATE INDEX IF NOT EXISTS audio_library_items_is_new_idx ON audio_library_items(is_new);
CREATE INDEX IF NOT EXISTS audio_library_items_distribution_type_idx ON audio_library_items(distribution_type);

-- Add comments explaining the columns
COMMENT ON COLUMN audio_library_items.instrument_type IS 'Specific instrument type (e.g., "piano", "guitar", "synthesizer", "drum machine", "vocal", "bass guitar")';
COMMENT ON COLUMN audio_library_items.mood IS 'Emotional feel of the audio (e.g., "dark", "uplifting", "melancholic", "aggressive", "chill", "energetic")';
COMMENT ON COLUMN audio_library_items.energy_level IS 'Energy intensity on a scale of 1-10 (1=very calm, 10=very intense)';
COMMENT ON COLUMN audio_library_items.complexity IS 'Musical complexity on a scale of 1-10 (1=simple, 10=very complex)';
COMMENT ON COLUMN audio_library_items.tempo_category IS 'Categorical tempo range (e.g., "slow", "medium", "fast", "very fast")';
COMMENT ON COLUMN audio_library_items.key_signature IS 'Detailed key information (e.g., "C major", "A minor", "F# minor")';
COMMENT ON COLUMN audio_library_items.time_signature IS 'Rhythm structure (e.g., "4/4", "3/4", "6/8")';
COMMENT ON COLUMN audio_library_items.duration IS 'Length of audio file in seconds';
COMMENT ON COLUMN audio_library_items.sample_rate IS 'Audio sample rate in Hz (e.g., 44100, 48000)';
COMMENT ON COLUMN audio_library_items.bit_depth IS 'Audio bit depth (e.g., 16, 24)';
COMMENT ON COLUMN audio_library_items.license_type IS 'Usage license type (e.g., "royalty-free", "commercial", "personal use only")';
COMMENT ON COLUMN audio_library_items.is_new IS 'Boolean flag to mark audio files as newly added (true) or not new (false)';
COMMENT ON COLUMN audio_library_items.distribution_type IS 'Platform distribution classification (e.g., "private", "public", "commercial", "other")'; 