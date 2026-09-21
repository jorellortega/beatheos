-- Standalone songs generated via ElevenLabs Music (/create-song)
CREATE TABLE IF NOT EXISTS generated_songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  prompt text,
  style_notes text,
  lyrics_session_id uuid,
  lyrics_snapshot text,
  audio_url text NOT NULL,
  elevenlabs_song_id text,
  elevenlabs_music_length_ms integer,
  instrumental boolean NOT NULL DEFAULT false,
  format text NOT NULL DEFAULT 'mp3',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generated_songs_user_id ON generated_songs(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_songs_created_at ON generated_songs(created_at DESC);

ALTER TABLE generated_songs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own generated_songs" ON generated_songs;
CREATE POLICY "Users can view own generated_songs" ON generated_songs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own generated_songs" ON generated_songs;
CREATE POLICY "Users can insert own generated_songs" ON generated_songs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own generated_songs" ON generated_songs;
CREATE POLICY "Users can delete own generated_songs" ON generated_songs
  FOR DELETE USING (auth.uid() = user_id);
