-- Create audio_shuffle_tracker table for tracking which sounds have been used in shuffle
CREATE TABLE IF NOT EXISTS audio_shuffle_tracker (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audio_id UUID NOT NULL REFERENCES audio_library_items(id) ON DELETE CASCADE,
  was_loaded BOOLEAN DEFAULT false,
  load_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, audio_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS audio_shuffle_tracker_user_id_idx ON audio_shuffle_tracker(user_id);
CREATE INDEX IF NOT EXISTS audio_shuffle_tracker_audio_id_idx ON audio_shuffle_tracker(audio_id);
CREATE INDEX IF NOT EXISTS audio_shuffle_tracker_was_loaded_idx ON audio_shuffle_tracker(was_loaded);
CREATE INDEX IF NOT EXISTS audio_shuffle_tracker_user_was_loaded_idx ON audio_shuffle_tracker(user_id, was_loaded);

-- Enable RLS (Row Level Security)
ALTER TABLE audio_shuffle_tracker ENABLE ROW LEVEL SECURITY;

-- Create policy so users can only access their own shuffle tracking data
CREATE POLICY "Users can manage their own shuffle tracking" ON audio_shuffle_tracker
  FOR ALL USING (auth.uid() = user_id);

-- Function to increment load_count for existing records
CREATE OR REPLACE FUNCTION increment_shuffle_load_count(p_user_id UUID, p_audio_ids UUID[])
RETURNS VOID AS $$
BEGIN
  UPDATE audio_shuffle_tracker 
  SET load_count = load_count + 1,
      updated_at = NOW()
  WHERE user_id = p_user_id 
    AND audio_id = ANY(p_audio_ids)
    AND was_loaded = true;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_audio_shuffle_tracker_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_audio_shuffle_tracker_updated_at
  BEFORE UPDATE ON audio_shuffle_tracker
  FOR EACH ROW EXECUTE FUNCTION update_audio_shuffle_tracker_updated_at(); 