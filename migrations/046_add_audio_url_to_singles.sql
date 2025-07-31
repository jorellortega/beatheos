-- Add audio_url column to singles table
ALTER TABLE singles ADD COLUMN IF NOT EXISTS audio_url VARCHAR(500);

-- Add index for better performance when querying by audio_url
CREATE INDEX IF NOT EXISTS singles_audio_url_idx ON singles(audio_url); 