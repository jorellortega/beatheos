-- Store ElevenLabs song ID so WAV can be downloaded from ElevenLabs after MP3 bucket upload
ALTER TABLE album_tracks
ADD COLUMN IF NOT EXISTS elevenlabs_song_id TEXT,
ADD COLUMN IF NOT EXISTS elevenlabs_music_length_ms INTEGER;

COMMENT ON COLUMN album_tracks.elevenlabs_song_id IS 'ElevenLabs song ID from music generation (for WAV export via inpainting API)';
COMMENT ON COLUMN album_tracks.elevenlabs_music_length_ms IS 'Duration in ms used when generating ElevenLabs instrumental';
