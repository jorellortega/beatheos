-- Per-track notes/prompts for AI instrumental generation (ElevenLabs Music)
ALTER TABLE album_tracks
ADD COLUMN IF NOT EXISTS instrumental_prompt TEXT;

COMMENT ON COLUMN album_tracks.instrumental_prompt IS 'Custom prompt notes for AI instrumental generation on this track';
