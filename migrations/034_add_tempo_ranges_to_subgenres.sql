-- Add tempo range fields to genre_subgenres table
ALTER TABLE genre_subgenres 
ADD COLUMN bpm_range_min INTEGER DEFAULT 80,
ADD COLUMN bpm_range_max INTEGER DEFAULT 180,
ADD COLUMN default_bpm INTEGER DEFAULT 120;

-- Update existing genres with more specific BPM ranges
UPDATE genres SET 
  bpm_range_min = 90,
  bpm_range_max = 110,
  default_bpm = 100
WHERE name = 'Hip Hop';

UPDATE genres SET 
  bpm_range_min = 130,
  bpm_range_max = 150,
  default_bpm = 140
WHERE name = 'House';

UPDATE genres SET 
  bpm_range_min = 120,
  bpm_range_max = 140,
  default_bpm = 130
WHERE name = 'Trap';

UPDATE genres SET 
  bpm_range_min = 140,
  bpm_range_max = 160,
  default_bpm = 150
WHERE name = 'Dubstep';

UPDATE genres SET 
  bpm_range_min = 100,
  bpm_range_max = 120,
  default_bpm = 110
WHERE name = 'R&B';

UPDATE genres SET 
  bpm_range_min = 80,
  bpm_range_max = 100,
  default_bpm = 90
WHERE name = 'Lo-Fi';

UPDATE genres SET 
  bpm_range_min = 160,
  bpm_range_max = 180,
  default_bpm = 170
WHERE name = 'Drum & Bass';

UPDATE genres SET 
  bpm_range_min = 110,
  bpm_range_max = 130,
  default_bpm = 120
WHERE name = 'Pop';

-- Add some specific subgenre tempo ranges
UPDATE genre_subgenres SET 
  bpm_range_min = 85,
  bpm_range_max = 95,
  default_bpm = 90
WHERE genre = 'Hip Hop' AND subgenre = 'Boom Bap';

UPDATE genre_subgenres SET 
  bpm_range_min = 95,
  bpm_range_max = 105,
  default_bpm = 100
WHERE genre = 'Hip Hop' AND subgenre = 'Trap';

UPDATE genre_subgenres SET 
  bpm_range_min = 135,
  bpm_range_max = 145,
  default_bpm = 140
WHERE genre = 'House' AND subgenre = 'Deep House';

UPDATE genre_subgenres SET 
  bpm_range_min = 145,
  bpm_range_max = 155,
  default_bpm = 150
WHERE genre = 'House' AND subgenre = 'Tech House';

-- Create a function to get tempo range for a genre/subgenre combination
CREATE OR REPLACE FUNCTION get_tempo_range(
  p_genre_id UUID,
  p_subgenre VARCHAR(100)
)
RETURNS TABLE(
  min_bpm INTEGER,
  max_bpm INTEGER,
  default_bpm INTEGER
) AS $$
DECLARE
  genre_name VARCHAR(100);
BEGIN
  -- Get the genre name
  SELECT name INTO genre_name 
  FROM genres 
  WHERE id = p_genre_id;
  
  -- If subgenre is provided, try to get subgenre-specific range
  IF p_subgenre IS NOT NULL AND p_subgenre != '' THEN
    RETURN QUERY
    SELECT 
      COALESCE(gs.bpm_range_min, g.bpm_range_min) as min_bpm,
      COALESCE(gs.bpm_range_max, g.bpm_range_max) as max_bpm,
      COALESCE(gs.default_bpm, g.default_bpm) as default_bpm
    FROM genres g
    LEFT JOIN genre_subgenres gs ON gs.genre = g.name AND gs.subgenre = p_subgenre
    WHERE g.id = p_genre_id;
  ELSE
    -- Return genre default range
    RETURN QUERY
    SELECT 
      g.bpm_range_min,
      g.bpm_range_max,
      g.default_bpm
    FROM genres g
    WHERE g.id = p_genre_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get a random BPM within the genre/subgenre range
CREATE OR REPLACE FUNCTION get_random_bpm_in_range(
  p_genre_id UUID,
  p_subgenre VARCHAR(100)
)
RETURNS INTEGER AS $$
DECLARE
  tempo_range RECORD;
BEGIN
  -- Get the tempo range
  SELECT * INTO tempo_range FROM get_tempo_range(p_genre_id, p_subgenre);
  
  -- Return a random BPM within the range
  RETURN floor(random() * (tempo_range.max_bpm - tempo_range.min_bpm + 1) + tempo_range.min_bpm);
END;
$$ LANGUAGE plpgsql; 