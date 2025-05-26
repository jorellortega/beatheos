-- Add slug column to producers table
ALTER TABLE producers
ADD COLUMN IF NOT EXISTS slug VARCHAR(255);

-- Create a unique index on the slug column
CREATE UNIQUE INDEX IF NOT EXISTS producers_slug_idx ON producers (slug);

-- Update existing producers to have a slug based on their display_name
UPDATE producers
SET slug = LOWER(REGEXP_REPLACE(display_name, '[^a-zA-Z0-9]', '-', 'g'))
WHERE slug IS NULL; 