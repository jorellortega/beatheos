-- Create release_platforms table for tracking platform distribution status
-- This tracks the distribution status, claims, and analytics for each release on each platform

CREATE TABLE IF NOT EXISTS release_platforms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    release_id UUID NOT NULL,
    release_type VARCHAR(20) NOT NULL CHECK (release_type IN ('album', 'single')),
    platform VARCHAR(100) NOT NULL,
    platform_release_id VARCHAR(255), -- Platform's internal release ID
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'processing', 'distributed', 'rejected', 'paused', 'archived')),
    claim_status VARCHAR(50) DEFAULT 'unclaimed' CHECK (claim_status IN ('unclaimed', 'pending', 'claimed', 'verified', 'rejected')),
    submission_date TIMESTAMP WITH TIME ZONE,
    distribution_date TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    custom_fields JSONB DEFAULT '{}', -- For platform-specific custom fields
    analytics JSONB DEFAULT '{}', -- For platform analytics data
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS release_platforms_release_id_idx ON release_platforms(release_id);
CREATE INDEX IF NOT EXISTS release_platforms_platform_idx ON release_platforms(platform);
CREATE INDEX IF NOT EXISTS release_platforms_status_idx ON release_platforms(status);
CREATE INDEX IF NOT EXISTS release_platforms_claim_status_idx ON release_platforms(claim_status);
CREATE INDEX IF NOT EXISTS release_platforms_release_type_idx ON release_platforms(release_type);

-- Add foreign key constraints
ALTER TABLE release_platforms 
ADD CONSTRAINT release_platforms_albums_fk 
FOREIGN KEY (release_id) REFERENCES albums(id) ON DELETE CASCADE;

ALTER TABLE release_platforms 
ADD CONSTRAINT release_platforms_singles_fk 
FOREIGN KEY (release_id) REFERENCES singles(id) ON DELETE CASCADE;

-- Add comments for documentation
COMMENT ON TABLE release_platforms IS 'Tracks platform distribution status for each album/single release';
COMMENT ON COLUMN release_platforms.release_id IS 'ID of the album or single';
COMMENT ON COLUMN release_platforms.release_type IS 'Type of release: album or single';
COMMENT ON COLUMN release_platforms.platform IS 'Platform name (e.g., Spotify, Apple Music, etc.)';
COMMENT ON COLUMN release_platforms.platform_release_id IS 'Platform-specific release identifier';
COMMENT ON COLUMN release_platforms.status IS 'Distribution status on the platform';
COMMENT ON COLUMN release_platforms.claim_status IS 'Artist profile claim status on the platform';
COMMENT ON COLUMN release_platforms.custom_fields IS 'Platform-specific custom fields as JSON';
COMMENT ON COLUMN release_platforms.analytics IS 'Platform analytics data as JSON'; 