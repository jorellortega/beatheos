-- Fix RLS Policies for user_api_keys table
-- Created: 2024-12-20

-- Enable RLS on user_api_keys table
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own api_keys" ON user_api_keys;
DROP POLICY IF EXISTS "Users can insert own api_keys" ON user_api_keys;
DROP POLICY IF EXISTS "Users can update own api_keys" ON user_api_keys;
DROP POLICY IF EXISTS "Users can delete own api_keys" ON user_api_keys;

-- Create RLS policies for user_api_keys
CREATE POLICY "Users can view own api_keys" ON user_api_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own api_keys" ON user_api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own api_keys" ON user_api_keys
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own api_keys" ON user_api_keys
  FOR DELETE USING (auth.uid() = user_id);
