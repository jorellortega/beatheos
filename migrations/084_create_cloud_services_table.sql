-- Create cloud_services table for OAuth connections
CREATE TABLE IF NOT EXISTS cloud_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL for system connections
    service_id VARCHAR(50) NOT NULL, -- 'google-drive', 'dropbox', 'onedrive', 'box'
    service_name VARCHAR(100) NOT NULL,
    connection_type VARCHAR(20) DEFAULT 'user' CHECK (connection_type IN ('system', 'user')),
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    account_info JSONB, -- User account info (name, email, etc.)
    scopes TEXT[], -- OAuth scopes granted
    is_active BOOLEAN DEFAULT true,
    last_sync TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cloud_service_files table for tracking synced files
CREATE TABLE IF NOT EXISTS cloud_service_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cloud_service_id UUID REFERENCES cloud_services(id) ON DELETE CASCADE,
    file_id VARCHAR(255) NOT NULL, -- External file ID from cloud service
    file_name VARCHAR(500) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    file_hash VARCHAR(255), -- For change detection
    is_folder BOOLEAN DEFAULT false,
    parent_folder_id VARCHAR(255),
    last_modified TIMESTAMP WITH TIME ZONE,
    sync_status VARCHAR(20) DEFAULT 'synced', -- 'synced', 'pending', 'error'
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(cloud_service_id, file_id)
);

-- Create cloud_service_sync_logs table for tracking sync operations
CREATE TABLE IF NOT EXISTS cloud_service_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cloud_service_id UUID REFERENCES cloud_services(id) ON DELETE CASCADE,
    sync_type VARCHAR(50) NOT NULL, -- 'full', 'incremental', 'manual'
    status VARCHAR(20) NOT NULL, -- 'started', 'completed', 'failed'
    files_processed INTEGER DEFAULT 0,
    files_added INTEGER DEFAULT 0,
    files_updated INTEGER DEFAULT 0,
    files_deleted INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cloud_services_user_id ON cloud_services(user_id);
CREATE INDEX IF NOT EXISTS idx_cloud_services_service_id ON cloud_services(service_id);
CREATE INDEX IF NOT EXISTS idx_cloud_services_connection_type ON cloud_services(connection_type);
CREATE INDEX IF NOT EXISTS idx_cloud_services_is_active ON cloud_services(is_active);
CREATE INDEX IF NOT EXISTS idx_cloud_service_files_cloud_service_id ON cloud_service_files(cloud_service_id);
CREATE INDEX IF NOT EXISTS idx_cloud_service_files_sync_status ON cloud_service_files(sync_status);
CREATE INDEX IF NOT EXISTS idx_cloud_service_sync_logs_cloud_service_id ON cloud_service_sync_logs(cloud_service_id);

-- Create partial unique indexes for one connection per user per service (user connections)
CREATE UNIQUE INDEX IF NOT EXISTS idx_cloud_services_user_service_unique 
ON cloud_services(user_id, service_id) 
WHERE user_id IS NOT NULL AND connection_type = 'user';

-- Create partial unique index for one system connection per service
CREATE UNIQUE INDEX IF NOT EXISTS idx_cloud_services_system_service_unique 
ON cloud_services(service_id) 
WHERE user_id IS NULL AND connection_type = 'system';

-- Enable RLS (Row Level Security)
ALTER TABLE cloud_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_service_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_service_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own user connections
CREATE POLICY "Users can view their own user connections" ON cloud_services
    FOR SELECT
    USING (auth.uid() = user_id AND connection_type = 'user');

-- RLS Policy: All authenticated users can view system connections (read-only)
CREATE POLICY "Users can view system connections" ON cloud_services
    FOR SELECT
    USING (connection_type = 'system' AND user_id IS NULL);

-- RLS Policy: Users can insert their own user connections
CREATE POLICY "Users can insert their own user connections" ON cloud_services
    FOR INSERT
    WITH CHECK (auth.uid() = user_id AND connection_type = 'user');

-- RLS Policy: Users can update their own user connections
CREATE POLICY "Users can update their own user connections" ON cloud_services
    FOR UPDATE
    USING (auth.uid() = user_id AND connection_type = 'user');

-- RLS Policy: Users can delete their own user connections
CREATE POLICY "Users can delete their own user connections" ON cloud_services
    FOR DELETE
    USING (auth.uid() = user_id AND connection_type = 'user');

-- RLS Policies for cloud_service_files
CREATE POLICY "Users can view files from their connections" ON cloud_service_files
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM cloud_services
            WHERE cloud_services.id = cloud_service_files.cloud_service_id
            AND (
                (cloud_services.user_id = auth.uid() AND cloud_services.connection_type = 'user')
                OR (cloud_services.connection_type = 'system' AND cloud_services.user_id IS NULL)
            )
        )
    );

-- RLS Policies for cloud_service_sync_logs
CREATE POLICY "Users can view sync logs from their connections" ON cloud_service_sync_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM cloud_services
            WHERE cloud_services.id = cloud_service_sync_logs.cloud_service_id
            AND (
                (cloud_services.user_id = auth.uid() AND cloud_services.connection_type = 'user')
                OR (cloud_services.connection_type = 'system' AND cloud_services.user_id IS NULL)
            )
        )
    );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_cloud_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_cloud_services_updated_at
    BEFORE UPDATE ON cloud_services
    FOR EACH ROW EXECUTE FUNCTION update_cloud_services_updated_at();

-- Add comments for documentation
COMMENT ON TABLE cloud_services IS 'OAuth connections to cloud storage services (user and system connections)';
COMMENT ON COLUMN cloud_services.user_id IS 'User ID for user connections, NULL for system connections';
COMMENT ON COLUMN cloud_services.connection_type IS 'Type of connection: user (personal) or system (platform-wide)';
COMMENT ON COLUMN cloud_services.account_info IS 'User account information from OAuth provider (name, email, etc.)';

