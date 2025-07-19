-- Create saved_patterns table for storing beat patterns
CREATE TABLE IF NOT EXISTS saved_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  tracks JSONB, -- Store track configuration and notes (nullable)
  sequencer_data JSONB NOT NULL, -- Store the step pattern data
  bpm INTEGER NOT NULL DEFAULT 120,
  steps INTEGER NOT NULL DEFAULT 16,
  tags TEXT[],
  category VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX saved_patterns_user_id_idx ON saved_patterns(user_id);
CREATE INDEX saved_patterns_created_at_idx ON saved_patterns(created_at);
CREATE INDEX saved_patterns_category_idx ON saved_patterns(category);

-- Enable RLS (Row Level Security)
ALTER TABLE saved_patterns ENABLE ROW LEVEL SECURITY;

-- Create policy so users can only access their own patterns
CREATE POLICY "Users can manage their own saved patterns" ON saved_patterns
  FOR ALL USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_saved_patterns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_saved_patterns_updated_at
  BEFORE UPDATE ON saved_patterns
  FOR EACH ROW EXECUTE FUNCTION update_saved_patterns_updated_at(); 