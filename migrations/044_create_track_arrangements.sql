-- Create track_arrangements table for saving individual track pattern arrangements
CREATE TABLE IF NOT EXISTS track_arrangements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES beat_sessions(id) ON DELETE CASCADE, -- Optional: link to a session
  track_id INTEGER NOT NULL, -- The track ID from the beat maker
  track_name VARCHAR(255) NOT NULL, -- Track name for display
  
  -- Arrangement metadata
  name VARCHAR(255) NOT NULL, -- User-defined name for this arrangement
  description TEXT,
  version VARCHAR(50) DEFAULT '1.0',
  
  -- Pattern arrangement data
  pattern_blocks JSONB NOT NULL, -- Array of PatternBlock objects with positions, cuts, drops, etc.
  total_bars INTEGER NOT NULL DEFAULT 64,
  zoom_level INTEGER DEFAULT 50,
  
  -- Arrangement settings
  bpm INTEGER NOT NULL,
  steps INTEGER NOT NULL DEFAULT 16,
  
  -- Tags and categorization
  tags TEXT[],
  category VARCHAR(100), -- e.g., 'intro', 'verse', 'chorus', 'bridge', 'drop', 'breakdown'
  is_favorite BOOLEAN DEFAULT false,
  is_template BOOLEAN DEFAULT false, -- Mark as template for reuse
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- Create arrangement_versions table for version control of arrangements
CREATE TABLE IF NOT EXISTS arrangement_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  arrangement_id UUID NOT NULL REFERENCES track_arrangements(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  name VARCHAR(255),
  description TEXT,
  pattern_blocks JSONB NOT NULL,
  total_bars INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(arrangement_id, version_number)
);

-- Create arrangement_tags table for better tag management
CREATE TABLE IF NOT EXISTS arrangement_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  arrangement_id UUID NOT NULL REFERENCES track_arrangements(id) ON DELETE CASCADE,
  tag_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(arrangement_id, tag_name)
);

-- Indexes for better performance
CREATE INDEX track_arrangements_user_id_idx ON track_arrangements(user_id);
CREATE INDEX track_arrangements_session_id_idx ON track_arrangements(session_id);
CREATE INDEX track_arrangements_track_id_idx ON track_arrangements(track_id);
CREATE INDEX track_arrangements_category_idx ON track_arrangements(category);
CREATE INDEX track_arrangements_is_favorite_idx ON track_arrangements(is_favorite);
CREATE INDEX track_arrangements_is_template_idx ON track_arrangements(is_template);
CREATE INDEX track_arrangements_created_at_idx ON track_arrangements(created_at);
CREATE INDEX track_arrangements_last_used_at_idx ON track_arrangements(last_used_at);

CREATE INDEX arrangement_versions_arrangement_id_idx ON arrangement_versions(arrangement_id);
CREATE INDEX arrangement_versions_version_number_idx ON arrangement_versions(version_number);

CREATE INDEX arrangement_tags_arrangement_id_idx ON arrangement_tags(arrangement_id);
CREATE INDEX arrangement_tags_tag_name_idx ON arrangement_tags(tag_name);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_track_arrangements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_track_arrangements_updated_at
  BEFORE UPDATE ON track_arrangements
  FOR EACH ROW EXECUTE FUNCTION update_track_arrangements_updated_at();

-- Function to create a new arrangement version
CREATE OR REPLACE FUNCTION create_arrangement_version(
  p_arrangement_id UUID,
  p_version_number INTEGER,
  p_name VARCHAR(255),
  p_description TEXT,
  p_pattern_blocks JSONB,
  p_total_bars INTEGER
)
RETURNS UUID AS $$
DECLARE
  v_version_id UUID;
BEGIN
  INSERT INTO arrangement_versions (
    arrangement_id,
    version_number,
    name,
    description,
    pattern_blocks,
    total_bars
  ) VALUES (
    p_arrangement_id,
    p_version_number,
    p_name,
    p_description,
    p_pattern_blocks,
    p_total_bars
  ) RETURNING id INTO v_version_id;
  
  RETURN v_version_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get the latest arrangement version
CREATE OR REPLACE FUNCTION get_latest_arrangement_version(p_arrangement_id UUID)
RETURNS TABLE(
  version_id UUID,
  version_number INTEGER,
  name VARCHAR(255),
  description TEXT,
  pattern_blocks JSONB,
  total_bars INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    av.id,
    av.version_number,
    av.name,
    av.description,
    av.pattern_blocks,
    av.total_bars,
    av.created_at
  FROM arrangement_versions av
  WHERE av.arrangement_id = p_arrangement_id
  ORDER BY av.version_number DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to search arrangements by pattern characteristics
CREATE OR REPLACE FUNCTION search_arrangements_by_patterns(
  p_user_id UUID,
  p_search_term TEXT DEFAULT NULL,
  p_category VARCHAR(100) DEFAULT NULL,
  p_has_drops BOOLEAN DEFAULT NULL,
  p_has_cuts BOOLEAN DEFAULT NULL,
  p_min_bars INTEGER DEFAULT NULL,
  p_max_bars INTEGER DEFAULT NULL
)
RETURNS TABLE(
  arrangement_id UUID,
  track_name VARCHAR(255),
  arrangement_name VARCHAR(255),
  category VARCHAR(100),
  total_bars INTEGER,
  pattern_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ta.id,
    ta.track_name,
    ta.name,
    ta.category,
    ta.total_bars,
    jsonb_array_length(ta.pattern_blocks) as pattern_count,
    ta.created_at
  FROM track_arrangements ta
  WHERE ta.user_id = p_user_id
    AND (p_search_term IS NULL OR 
         ta.name ILIKE '%' || p_search_term || '%' OR 
         ta.track_name ILIKE '%' || p_search_term || '%')
    AND (p_category IS NULL OR ta.category = p_category)
    AND (p_min_bars IS NULL OR ta.total_bars >= p_min_bars)
    AND (p_max_bars IS NULL OR ta.total_bars <= p_max_bars)
    AND (p_has_drops IS NULL OR 
         (p_has_drops = true AND ta.pattern_blocks::text ILIKE '%drop%') OR
         (p_has_drops = false AND ta.pattern_blocks::text NOT ILIKE '%drop%'))
    AND (p_has_cuts IS NULL OR 
         (p_has_cuts = true AND ta.pattern_blocks::text ILIKE '%cut%') OR
         (p_has_cuts = false AND ta.pattern_blocks::text NOT ILIKE '%cut%'))
  ORDER BY ta.last_used_at DESC NULLS LAST, ta.created_at DESC;
END;
$$ LANGUAGE plpgsql; 