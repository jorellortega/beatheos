-- Lyrics AI Migration - Uses existing sessions table (Fixed for existing policies)
-- Created: 2024-12-20

-- Add lyrics AI specific columns to existing sessions table
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS lyrics_title VARCHAR(255),
ADD COLUMN IF NOT EXISTS lyrics_content_type VARCHAR(50) DEFAULT 'lyrics' CHECK (lyrics_content_type IN ('script', 'lyrics', 'poetry', 'prose')),
ADD COLUMN IF NOT EXISTS lyrics_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS lyrics_version_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS lyrics_is_latest_version BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS lyrics_parent_id UUID,
ADD COLUMN IF NOT EXISTS lyrics_genre VARCHAR(100),
ADD COLUMN IF NOT EXISTS lyrics_mood VARCHAR(100),
ADD COLUMN IF NOT EXISTS lyrics_language VARCHAR(50) DEFAULT 'English',
ADD COLUMN IF NOT EXISTS lyrics_tags TEXT[],
ADD COLUMN IF NOT EXISTS lyrics_description TEXT,
ADD COLUMN IF NOT EXISTS lyrics_locked_sections JSONB,
ADD COLUMN IF NOT EXISTS lyrics_ai_prompt TEXT,
ADD COLUMN IF NOT EXISTS lyrics_ai_model VARCHAR(100),
ADD COLUMN IF NOT EXISTS lyrics_ai_generation_settings JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS lyrics_ai_metadata JSONB DEFAULT '{}';

-- Create a simple user_api_keys table for AI services (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS user_api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  openai_api_key TEXT,
  anthropic_api_key TEXT,
  elevenlabs_api_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_lyrics_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_lyrics_content_type ON sessions(lyrics_content_type);
CREATE INDEX IF NOT EXISTS idx_sessions_lyrics_latest_versions ON sessions(user_id, lyrics_is_latest_version);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);

-- Enable RLS (Row Level Security) - only if not already enabled
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class WHERE relname = 'user_api_keys' AND relrowsecurity = true
    ) THEN
        ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Create RLS policies only if they don't exist
DO $$
BEGIN
    -- Check and create "Users can view own api_keys" policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_api_keys' 
        AND policyname = 'Users can view own api_keys'
    ) THEN
        CREATE POLICY "Users can view own api_keys" ON user_api_keys
          FOR SELECT USING (auth.uid() = user_id);
    END IF;

    -- Check and create "Users can insert own api_keys" policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_api_keys' 
        AND policyname = 'Users can insert own api_keys'
    ) THEN
        CREATE POLICY "Users can insert own api_keys" ON user_api_keys
          FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    -- Check and create "Users can update own api_keys" policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_api_keys' 
        AND policyname = 'Users can update own api_keys'
    ) THEN
        CREATE POLICY "Users can update own api_keys" ON user_api_keys
          FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    -- Check and create "Users can delete own api_keys" policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_api_keys' 
        AND policyname = 'Users can delete own api_keys'
    ) THEN
        CREATE POLICY "Users can delete own api_keys" ON user_api_keys
          FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_user_api_keys_updated_at'
    ) THEN
        CREATE TRIGGER update_user_api_keys_updated_at
          BEFORE UPDATE ON user_api_keys
          FOR EACH ROW
          EXECUTE FUNCTION update_user_api_keys_updated_at();
    END IF;
END $$;
