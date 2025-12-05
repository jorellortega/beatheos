-- Create user_storage_settings table for managing user's preferred storage provider
-- This table tracks which storage provider each user wants to use for their files
-- Supports: supabase (default), system-wide storage, or user's own cloud storage

-- First, update storage_providers table to include 'supabase' and 'system' as valid types
ALTER TABLE storage_providers 
DROP CONSTRAINT IF EXISTS storage_providers_type_check;

ALTER TABLE storage_providers 
ADD CONSTRAINT storage_providers_type_check 
CHECK (type IN ('supabase', 'system', 'aws-s3', 'google-cloud', 'azure', 'dropbox', 'google-drive', 'local'));

-- Create user_storage_settings table
CREATE TABLE IF NOT EXISTS user_storage_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Primary storage provider selection
  -- 'supabase' = Use Supabase storage (default)
  -- 'system' = Use system-wide storage (future)
  -- 'custom' = Use user's own cloud storage (from storage_providers table)
  storage_provider_type VARCHAR(50) NOT NULL DEFAULT 'supabase' 
    CHECK (storage_provider_type IN ('supabase', 'system', 'custom')),
  
  -- Reference to storage_providers table if using custom storage
  custom_storage_provider_id UUID REFERENCES storage_providers(id) ON DELETE SET NULL,
  
  -- Storage configuration (JSONB for flexible settings)
  -- For supabase: { bucket: 'beats', folder: 'user-uploads' }
  -- For system: { endpoint: 'https://...', region: 'us-east-1' }
  -- For custom: references storage_providers.config
  storage_config JSONB DEFAULT '{}',
  
  -- Default bucket/folder settings
  default_bucket VARCHAR(255),
  default_folder VARCHAR(255),
  
  -- Auto-migration settings (for future use)
  auto_migrate_enabled BOOLEAN DEFAULT false,
  migration_status VARCHAR(50) DEFAULT 'not_started' 
    CHECK (migration_status IN ('not_started', 'in_progress', 'completed', 'failed')),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_synced_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_storage_settings_user_id ON user_storage_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_storage_settings_type ON user_storage_settings(storage_provider_type);
CREATE INDEX IF NOT EXISTS idx_user_storage_settings_custom_provider ON user_storage_settings(custom_storage_provider_id);

-- Enable RLS (Row Level Security)
ALTER TABLE user_storage_settings ENABLE ROW LEVEL SECURITY;

-- Create policy so users can only access their own storage settings
CREATE POLICY "Users can manage their own storage settings" ON user_storage_settings
  FOR ALL USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_storage_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_user_storage_settings_updated_at
  BEFORE UPDATE ON user_storage_settings
  FOR EACH ROW EXECUTE FUNCTION update_user_storage_settings_updated_at();

-- Add comments for documentation
COMMENT ON TABLE user_storage_settings IS 'User preferences for storage provider (Supabase, system-wide, or custom cloud storage)';
COMMENT ON COLUMN user_storage_settings.storage_provider_type IS 'Type of storage: supabase (default), system (system-wide), or custom (user-provided)';
COMMENT ON COLUMN user_storage_settings.custom_storage_provider_id IS 'Reference to storage_providers table when using custom storage';
COMMENT ON COLUMN user_storage_settings.storage_config IS 'Provider-specific configuration (buckets, folders, endpoints, etc.)';
COMMENT ON COLUMN user_storage_settings.auto_migrate_enabled IS 'Whether to automatically migrate files when switching providers';

