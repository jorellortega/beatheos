-- Add genre and subgenre fields to saved_patterns table
ALTER TABLE saved_patterns 
ADD COLUMN genre_id UUID REFERENCES genres(id) ON DELETE SET NULL,
ADD COLUMN subgenre VARCHAR(100);

-- Add indexes for better performance
CREATE INDEX saved_patterns_genre_id_idx ON saved_patterns(genre_id);
CREATE INDEX saved_patterns_subgenre_idx ON saved_patterns(subgenre);

-- Add constraint to ensure subgenre is valid for the selected genre
-- This will be enforced at the application level for better performance
-- but we can add a comment for documentation
COMMENT ON COLUMN saved_patterns.subgenre IS 'Subgenre should be validated against genre_subgenres table for the selected genre';

-- Create a function to validate genre-subgenre relationships
CREATE OR REPLACE FUNCTION validate_genre_subgenre(
  p_genre_id UUID,
  p_subgenre VARCHAR(100)
)
RETURNS BOOLEAN AS $$
DECLARE
  genre_name VARCHAR(100);
  is_valid BOOLEAN;
BEGIN
  -- If no genre is selected, subgenre should be NULL
  IF p_genre_id IS NULL THEN
    RETURN p_subgenre IS NULL;
  END IF;
  
  -- If no subgenre is provided, it's valid
  IF p_subgenre IS NULL OR p_subgenre = '' THEN
    RETURN TRUE;
  END IF;
  
  -- Get the genre name
  SELECT name INTO genre_name 
  FROM genres 
  WHERE id = p_genre_id;
  
  -- Check if the genre-subgenre combination exists
  SELECT EXISTS(
    SELECT 1 
    FROM genre_subgenres 
    WHERE genre = genre_name 
    AND subgenre = p_subgenre
  ) INTO is_valid;
  
  RETURN is_valid;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get valid subgenres for a genre
CREATE OR REPLACE FUNCTION get_valid_subgenres(p_genre_id UUID)
RETURNS TABLE(subgenre VARCHAR(100)) AS $$
DECLARE
  genre_name VARCHAR(100);
BEGIN
  -- Get the genre name
  SELECT name INTO genre_name 
  FROM genres 
  WHERE id = p_genre_id;
  
  -- Return valid subgenres
  RETURN QUERY
  SELECT gs.subgenre
  FROM genre_subgenres gs
  WHERE gs.genre = genre_name
  ORDER BY gs.subgenre;
END;
$$ LANGUAGE plpgsql; 