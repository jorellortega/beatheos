-- Add function to clear shuffle tracker for a user
CREATE OR REPLACE FUNCTION clear_shuffle_tracker(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE audio_shuffle_tracker 
  SET was_loaded = false,
      load_count = 0,
      last_loaded_at = NULL
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION clear_shuffle_tracker(UUID) TO authenticated; 