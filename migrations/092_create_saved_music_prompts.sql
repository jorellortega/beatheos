-- Reusable instrumental / music generation prompts per user
CREATE TABLE IF NOT EXISTS saved_music_prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  prompt TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS saved_music_prompts_user_id_idx ON saved_music_prompts(user_id);
CREATE INDEX IF NOT EXISTS saved_music_prompts_created_at_idx ON saved_music_prompts(created_at DESC);

ALTER TABLE saved_music_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own saved music prompts" ON saved_music_prompts
  FOR ALL USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_saved_music_prompts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_saved_music_prompts_updated_at ON saved_music_prompts;
CREATE TRIGGER update_saved_music_prompts_updated_at
  BEFORE UPDATE ON saved_music_prompts
  FOR EACH ROW EXECUTE FUNCTION update_saved_music_prompts_updated_at();

COMMENT ON TABLE saved_music_prompts IS 'User library of reusable ElevenLabs music/instrumental generation prompts';
