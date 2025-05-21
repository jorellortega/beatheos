-- Add slug column to beats table
ALTER TABLE beats ADD COLUMN slug VARCHAR(255) UNIQUE;

-- Create index on slug for faster lookups
CREATE INDEX idx_beats_slug ON beats(slug); 