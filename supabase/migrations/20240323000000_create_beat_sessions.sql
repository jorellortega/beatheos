-- Create beat_sessions table for storing beat-maker projects
CREATE TABLE beat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  bpm INTEGER NOT NULL DEFAULT 120,
  steps INTEGER NOT NULL DEFAULT 16,
  tracks JSONB NOT NULL, -- Store track configuration (name, color, audioUrl, etc.)
  sequencer_data JSONB NOT NULL, -- Store the step pattern data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX beat_sessions_user_id_idx ON beat_sessions(user_id);
CREATE INDEX beat_sessions_created_at_idx ON beat_sessions(created_at);
CREATE INDEX beat_sessions_name_idx ON beat_sessions(name);

-- Enable RLS (Row Level Security)
ALTER TABLE beat_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy so users can only access their own sessions
CREATE POLICY "Users can manage their own beat sessions" ON beat_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_beat_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_beat_sessions_updated_at
  BEFORE UPDATE ON beat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_beat_sessions_updated_at(); 