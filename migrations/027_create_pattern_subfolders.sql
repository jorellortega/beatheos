-- Add subfolder column to saved_patterns for hierarchical organization
ALTER TABLE saved_patterns ADD COLUMN IF NOT EXISTS subfolder VARCHAR(255);

-- Create pattern_subfolders table for managing subfolder metadata
CREATE TABLE IF NOT EXISTS pattern_subfolders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pack_id UUID NOT NULL REFERENCES pattern_packs(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#6B7280', -- Default gray color
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(pack_id, name) -- Prevent duplicate subfolder names within the same pack
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS pattern_subfolders_pack_id_idx ON pattern_subfolders(pack_id);
CREATE INDEX IF NOT EXISTS pattern_subfolders_name_idx ON pattern_subfolders(name);
CREATE INDEX IF NOT EXISTS saved_patterns_subfolder_idx ON saved_patterns(subfolder);

-- Enable RLS (Row Level Security)
ALTER TABLE pattern_subfolders ENABLE ROW LEVEL SECURITY;

-- Create policies so users can only access subfolders in their own packs
CREATE POLICY "Users can manage pattern subfolders in their own packs" ON pattern_subfolders
  FOR ALL USING (
    pack_id IN (
      SELECT id FROM pattern_packs WHERE user_id = auth.uid()
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pattern_subfolders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_pattern_subfolders_updated_at
  BEFORE UPDATE ON pattern_subfolders
  FOR EACH ROW EXECUTE FUNCTION update_pattern_subfolders_updated_at(); 