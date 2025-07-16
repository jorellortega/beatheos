-- Create audio_packs table for organizing audio library items into packs/folders
CREATE TABLE IF NOT EXISTS audio_packs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cover_image_url VARCHAR(255),
  color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color for pack
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create audio_pack_items table to link audio items to packs
CREATE TABLE IF NOT EXISTS audio_pack_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pack_id UUID NOT NULL REFERENCES audio_packs(id) ON DELETE CASCADE,
  audio_item_id UUID NOT NULL,
  position INTEGER DEFAULT 0,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(pack_id, audio_item_id)
);

-- Add pack_id column to audio_library_items for direct pack assignment
ALTER TABLE audio_library_items ADD COLUMN IF NOT EXISTS pack_id UUID REFERENCES audio_packs(id) ON DELETE SET NULL;

-- Add type column to audio_library_items if it doesn't exist
ALTER TABLE audio_library_items ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'sample';

-- Add description column to audio_library_items if it doesn't exist  
ALTER TABLE audio_library_items ADD COLUMN IF NOT EXISTS description TEXT;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS audio_packs_user_id_idx ON audio_packs(user_id);
CREATE INDEX IF NOT EXISTS audio_packs_created_at_idx ON audio_packs(created_at);
CREATE INDEX IF NOT EXISTS audio_pack_items_pack_id_idx ON audio_pack_items(pack_id);
CREATE INDEX IF NOT EXISTS audio_pack_items_audio_item_id_idx ON audio_pack_items(audio_item_id);
CREATE INDEX IF NOT EXISTS audio_library_items_pack_id_idx ON audio_library_items(pack_id);

-- Enable RLS (Row Level Security)
ALTER TABLE audio_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_pack_items ENABLE ROW LEVEL SECURITY;

-- Create policies so users can only access their own packs
CREATE POLICY "Users can manage their own audio packs" ON audio_packs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own pack items" ON audio_pack_items
  FOR ALL USING (
    pack_id IN (
      SELECT id FROM audio_packs WHERE user_id = auth.uid()
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_audio_packs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_audio_packs_updated_at
  BEFORE UPDATE ON audio_packs
  FOR EACH ROW EXECUTE FUNCTION update_audio_packs_updated_at(); 