-- Migration: Create streaming platforms table
-- Description: Store streaming platform statistics for artists

-- Create streaming_platforms table
CREATE TABLE IF NOT EXISTS label_artist_streaming_platforms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Label Artist Association
    label_artist_id UUID NOT NULL REFERENCES label_artists(id) ON DELETE CASCADE,
    
    -- Platform Information
    platform VARCHAR(50) NOT NULL CHECK (platform IN (
        'spotify', 'apple_music', 'youtube_music', 'tidal', 
        'amazon_music', 'soundcloud', 'bandcamp', 'deezer'
    )),
    
    -- Platform Metrics (nullable because different platforms have different metrics)
    monthly_listeners INTEGER,
    followers INTEGER,
    streams BIGINT,
    subscribers INTEGER,
    plays BIGINT,
    
    -- Platform-specific data
    profile_url VARCHAR(500),
    verified BOOLEAN DEFAULT false,
    
    -- Metadata
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_source VARCHAR(100), -- 'manual', 'api', 'imported', etc.
    
    -- Ensure one record per label artist per platform
    UNIQUE(label_artist_id, platform)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_label_streaming_platforms_artist_id ON label_artist_streaming_platforms(label_artist_id);
CREATE INDEX IF NOT EXISTS idx_label_streaming_platforms_platform ON label_artist_streaming_platforms(platform);
CREATE INDEX IF NOT EXISTS idx_label_streaming_platforms_monthly_listeners ON label_artist_streaming_platforms(monthly_listeners);
CREATE INDEX IF NOT EXISTS idx_label_streaming_platforms_followers ON label_artist_streaming_platforms(followers);

-- Add updated_at trigger
CREATE TRIGGER update_label_streaming_platforms_updated_at 
    BEFORE UPDATE ON label_artist_streaming_platforms 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE label_artist_streaming_platforms ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view streaming platforms for label artists they can see
CREATE POLICY "Label streaming platforms are viewable by authenticated users" 
    ON label_artist_streaming_platforms FOR SELECT 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM label_artists 
            WHERE label_artists.id = label_artist_streaming_platforms.label_artist_id
        )
    );

-- Policy: Users can insert streaming platforms for their label artists
CREATE POLICY "Users can insert label streaming platforms" 
    ON label_artist_streaming_platforms FOR INSERT 
    TO authenticated 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM label_artists 
            WHERE label_artists.id = label_artist_streaming_platforms.label_artist_id 
            AND (label_artists.managed_by = auth.uid() OR label_artists.managed_by IS NULL)
        )
    );

-- Policy: Users can update streaming platforms for their label artists
CREATE POLICY "Users can update label streaming platforms" 
    ON label_artist_streaming_platforms FOR UPDATE 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM label_artists 
            WHERE label_artists.id = label_artist_streaming_platforms.label_artist_id 
            AND (label_artists.managed_by = auth.uid() OR label_artists.managed_by IS NULL)
        )
    );

-- Policy: Users can delete streaming platforms for their label artists
CREATE POLICY "Users can delete label streaming platforms" 
    ON label_artist_streaming_platforms FOR DELETE 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM label_artists 
            WHERE label_artists.id = label_artist_streaming_platforms.label_artist_id 
            AND (label_artists.managed_by = auth.uid() OR label_artists.managed_by IS NULL)
        )
    );
