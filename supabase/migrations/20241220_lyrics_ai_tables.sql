-- Migration for Lyrics AI Tables in Supabase
-- Created: 2024-12-20

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Lyrics Assets Table
CREATE TABLE IF NOT EXISTS lyrics_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('script', 'lyrics', 'poetry', 'prose')),
  content TEXT,
  content_url TEXT,
  version INTEGER DEFAULT 1,
  version_name TEXT,
  is_latest_version BOOLEAN DEFAULT true,
  parent_asset_id UUID REFERENCES lyrics_assets(id),
  prompt TEXT,
  model TEXT,
  generation_settings JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  locked_sections JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lyrics Table (Specialized for Lyrics)
CREATE TABLE IF NOT EXISTS lyrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  movie_id UUID,
  scene_id UUID,
  version INTEGER DEFAULT 1,
  version_name TEXT,
  is_latest_version BOOLEAN DEFAULT true,
  parent_lyrics_id UUID REFERENCES lyrics(id),
  genre TEXT,
  mood TEXT,
  language TEXT DEFAULT 'English',
  tags TEXT[] DEFAULT '{}',
  description TEXT,
  locked_sections JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User API Keys for AI Services
CREATE TABLE IF NOT EXISTS user_api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  openai_api_key TEXT,
  anthropic_api_key TEXT,
  elevenlabs_api_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_lyrics_assets_user_content_type ON lyrics_assets(user_id, content_type);
CREATE INDEX IF NOT EXISTS idx_lyrics_assets_latest_versions ON lyrics_assets(user_id, is_latest_version);
CREATE INDEX IF NOT EXISTS idx_lyrics_assets_parent ON lyrics_assets(parent_asset_id);

CREATE INDEX IF NOT EXISTS idx_lyrics_user_id ON lyrics(user_id);
CREATE INDEX IF NOT EXISTS idx_lyrics_latest_versions ON lyrics(user_id, is_latest_version);
CREATE INDEX IF NOT EXISTS idx_lyrics_parent ON lyrics(parent_lyrics_id);
CREATE INDEX IF NOT EXISTS idx_lyrics_genre ON lyrics(genre);
CREATE INDEX IF NOT EXISTS idx_lyrics_mood ON lyrics(mood);

CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE lyrics_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE lyrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for lyrics_assets
CREATE POLICY "Users can view own lyrics_assets" ON lyrics_assets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lyrics_assets" ON lyrics_assets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lyrics_assets" ON lyrics_assets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own lyrics_assets" ON lyrics_assets
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for lyrics
CREATE POLICY "Users can view own lyrics" ON lyrics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lyrics" ON lyrics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lyrics" ON lyrics
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own lyrics" ON lyrics
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for user_api_keys
CREATE POLICY "Users can view own api_keys" ON user_api_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own api_keys" ON user_api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own api_keys" ON user_api_keys
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own api_keys" ON user_api_keys
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_lyrics_assets_updated_at
  BEFORE UPDATE ON lyrics_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lyrics_updated_at
  BEFORE UPDATE ON lyrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_api_keys_updated_at
  BEFORE UPDATE ON user_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
