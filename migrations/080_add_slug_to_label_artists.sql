-- Add slug field to label_artists table
-- This allows label_artists to have URLs like /artist/[slug]

-- Add slug column
ALTER TABLE label_artists 
ADD COLUMN IF NOT EXISTS slug VARCHAR(255);

-- Generate slugs for existing artists based on stage_name or name
-- Use a function to ensure uniqueness
DO $$
DECLARE
  artist_record RECORD;
  base_slug TEXT;
  final_slug TEXT;
  slug_counter INTEGER;
BEGIN
  FOR artist_record IN 
    SELECT id, COALESCE(stage_name, name) as display_name
    FROM label_artists
    WHERE slug IS NULL
    ORDER BY created_at
  LOOP
    -- Generate base slug
    base_slug := LOWER(REGEXP_REPLACE(
      artist_record.display_name, 
      '[^a-zA-Z0-9]+', 
      '-', 
      'g'
    ));
    
    -- Remove leading/trailing dashes
    base_slug := TRIM(BOTH '-' FROM base_slug);
    
    -- If empty after processing, use a default
    IF base_slug = '' OR base_slug IS NULL THEN
      base_slug := 'artist';
    END IF;
    
    -- Check for uniqueness and append number if needed
    final_slug := base_slug;
    slug_counter := 1;
    
    WHILE EXISTS (
      SELECT 1 FROM label_artists 
      WHERE slug = final_slug AND id != artist_record.id
    ) LOOP
      final_slug := base_slug || '-' || slug_counter;
      slug_counter := slug_counter + 1;
    END LOOP;
    
    -- Update the artist with the unique slug
    UPDATE label_artists
    SET slug = final_slug
    WHERE id = artist_record.id;
  END LOOP;
END $$;

-- Create unique index on slug (after all slugs are generated)
CREATE UNIQUE INDEX IF NOT EXISTS idx_label_artists_slug ON label_artists(slug);

-- Add comment
COMMENT ON COLUMN label_artists.slug IS 'URL-friendly identifier for the artist (e.g., jorell-ortega)';

