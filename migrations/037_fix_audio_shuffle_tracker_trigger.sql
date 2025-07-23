-- Fix audio_shuffle_tracker trigger and function issues
-- Drop the problematic trigger that references non-existent updated_at column
DROP TRIGGER IF EXISTS update_audio_shuffle_tracker_updated_at ON audio_shuffle_tracker;

-- Drop the trigger function
DROP FUNCTION IF EXISTS update_audio_shuffle_tracker_updated_at();

-- Update the increment function to use the correct column name
CREATE OR REPLACE FUNCTION increment_shuffle_load_count(p_user_id UUID, p_audio_ids UUID[])
RETURNS VOID AS $$
BEGIN
  UPDATE audio_shuffle_tracker 
  SET load_count = load_count + 1,
      last_loaded_at = NOW()
  WHERE user_id = p_user_id 
    AND audio_id = ANY(p_audio_ids)
    AND was_loaded = true;
END;
$$ LANGUAGE plpgsql; 