-- Create pattern_packs table for organizing saved patterns into packs/folders
CREATE TABLE IF NOT EXISTS pattern_packs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cover_image_url VARCHAR(255),
  color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color for pack
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add pack_id column to saved_patterns for direct pack assignment
ALTER TABLE saved_patterns ADD COLUMN IF NOT EXISTS pack_id UUID REFERENCES pattern_packs(id) ON DELETE SET NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS pattern_packs_user_id_idx ON pattern_packs(user_id);
CREATE INDEX IF NOT EXISTS pattern_packs_created_at_idx ON pattern_packs(created_at);
CREATE INDEX IF NOT EXISTS saved_patterns_pack_id_idx ON saved_patterns(pack_id);

-- Enable RLS (Row Level Security)
ALTER TABLE pattern_packs ENABLE ROW LEVEL SECURITY;

-- Create policies so users can only access their own pattern packs
CREATE POLICY "Users can manage their own pattern packs" ON pattern_packs
  FOR ALL USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pattern_packs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_pattern_packs_updated_at
  BEFORE UPDATE ON pattern_packs
  FOR EACH ROW EXECUTE FUNCTION update_pattern_packs_updated_at(); 