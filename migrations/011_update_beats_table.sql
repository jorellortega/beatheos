-- First, drop the existing foreign key constraint if it exists
ALTER TABLE beats
DROP CONSTRAINT IF EXISTS fk_producer;

-- Change producer_id column type to UUID to match users.id
ALTER TABLE beats
ALTER COLUMN producer_id TYPE uuid USING producer_id::uuid;

-- Add new columns to beats table
ALTER TABLE beats
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS licensing JSONB,
ADD COLUMN IF NOT EXISTS wav_url VARCHAR(255),
ADD COLUMN IF NOT EXISTS stems_url VARCHAR(255),
ADD COLUMN IF NOT EXISTS cover_art_url VARCHAR(255);

-- Rename audio_url to mp3_url for consistency
ALTER TABLE beats
RENAME COLUMN audio_url TO mp3_url;

-- Add foreign key constraint for producer_id
ALTER TABLE beats
ADD CONSTRAINT fk_producer
FOREIGN KEY (producer_id)
REFERENCES users(id)
ON DELETE CASCADE; 