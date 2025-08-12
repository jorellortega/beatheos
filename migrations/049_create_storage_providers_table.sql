-- Create storage_providers table for user-specific storage configurations
CREATE TABLE storage_providers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('aws-s3', 'google-cloud', 'azure', 'dropbox', 'google-drive', 'local')),
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX storage_providers_user_id_idx ON storage_providers(user_id);
CREATE INDEX storage_providers_type_idx ON storage_providers(type);
CREATE INDEX storage_providers_is_active_idx ON storage_providers(is_active);

-- Enable RLS (Row Level Security)
ALTER TABLE storage_providers ENABLE ROW LEVEL SECURITY;

-- Create policy so users can only access their own storage providers
CREATE POLICY "Users can manage their own storage providers" ON storage_providers
  FOR ALL USING (auth.uid() = user_id);

-- Add unique constraint to prevent duplicate providers per user
ALTER TABLE storage_providers 
ADD CONSTRAINT unique_user_provider_type 
UNIQUE (user_id, type);

-- Add comments for documentation
COMMENT ON TABLE storage_providers IS 'User-specific storage provider configurations (Dropbox, S3, etc.)';
COMMENT ON COLUMN storage_providers.config IS 'Provider-specific configuration including OAuth tokens, API keys, etc.';
COMMENT ON COLUMN storage_providers.type IS 'Type of storage provider (dropbox, aws-s3, etc.)';
