-- Create tracks table for completed beats that can be moved to singles or albums
CREATE TABLE IF NOT EXISTS tracks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  artist VARCHAR(255) NOT NULL,
  description TEXT,
  audio_url VARCHAR(255),
  cover_art_url VARCHAR(255),
  duration VARCHAR(50),
  bpm INTEGER,
  key VARCHAR(10),
  genre VARCHAR(100),
  subgenre VARCHAR(100),
  
  -- Session information (if exported from beat maker)
  session_id UUID REFERENCES beat_sessions(id) ON DELETE SET NULL,
  session_name VARCHAR(255),
  
  -- Status and production phase (same as singles)
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('production', 'draft', 'distribute', 'error', 'published', 'other')),
  production_status VARCHAR(50) DEFAULT 'production' CHECK (production_status IN ('marketing', 'organization', 'production', 'quality_control', 'ready_for_distribution')),
  
  -- Metadata
  tags TEXT[],
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  release_date DATE
);

-- Create indexes for better performance
CREATE INDEX tracks_user_id_idx ON tracks(user_id);
CREATE INDEX tracks_status_idx ON tracks(status);
CREATE INDEX tracks_production_status_idx ON tracks(production_status);
CREATE INDEX tracks_created_at_idx ON tracks(created_at);
CREATE INDEX tracks_session_id_idx ON tracks(session_id);

-- Enable RLS (Row Level Security)
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

-- Create policy so users can only access their own tracks
CREATE POLICY "Users can manage their own tracks" ON tracks
  FOR ALL USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tracks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_tracks_updated_at
  BEFORE UPDATE ON tracks
  FOR EACH ROW EXECUTE FUNCTION update_tracks_updated_at(); 