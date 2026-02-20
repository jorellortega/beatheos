-- Create user_ai_covers table to store AI-generated covers
CREATE TABLE IF NOT EXISTS user_ai_covers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255),
  cover_url VARCHAR(500) NOT NULL,
  cover_size VARCHAR(50),
  prompt TEXT,
  storage_path VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX user_ai_covers_user_id_idx ON user_ai_covers(user_id);
CREATE INDEX user_ai_covers_created_at_idx ON user_ai_covers(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE user_ai_covers ENABLE ROW LEVEL SECURITY;

-- Create policy so users can only access their own covers
CREATE POLICY "Users can manage their own AI covers" ON user_ai_covers
  FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_ai_covers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_user_ai_covers_updated_at
  BEFORE UPDATE ON user_ai_covers
  FOR EACH ROW
  EXECUTE FUNCTION update_user_ai_covers_updated_at();

-- Add comment
COMMENT ON TABLE user_ai_covers IS 'Stores AI-generated covers for users to access on dashboards';

