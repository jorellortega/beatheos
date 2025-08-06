-- Add missing columns to tracks table for full feature parity with albums and singles

-- Add ISRC column (International Standard Recording Code) - commonly used for tracks
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS isrc VARCHAR(12);

-- Add UPC column (Universal Product Code) - for commercial releases
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS upc VARCHAR(13);

-- Add explicit license information
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS license_type VARCHAR(100);
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS license_terms TEXT;

-- Add distribution and publishing info
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS publisher VARCHAR(255);
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS publishing_rights VARCHAR(255);
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS distribution_rights VARCHAR(255);

-- Add commercial metadata
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS price DECIMAL(10,2);
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS is_available_for_purchase BOOLEAN DEFAULT false;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS is_available_for_streaming BOOLEAN DEFAULT false;

-- Add additional metadata fields
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en';
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS explicit_content BOOLEAN DEFAULT false;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS parental_advisory VARCHAR(10);

-- Add collaboration and credits
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS featured_artists TEXT[];
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS producers TEXT[];
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS writers TEXT[];
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS mixers TEXT[];
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS mastering_engineer VARCHAR(255);

-- Add technical metadata
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS sample_rate INTEGER;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS bit_depth INTEGER;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS file_format VARCHAR(10);
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS file_size BIGINT;

-- Add playlist and collection info
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS playlist_position INTEGER;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS collection_id UUID;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS collection_position INTEGER;

-- Add social and engagement metrics
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS play_count INTEGER DEFAULT 0;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0;

-- Add review and rating info
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2);
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- Add workflow and approval fields
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add version control
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS version VARCHAR(20) DEFAULT '1.0';
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS is_remix BOOLEAN DEFAULT false;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS original_track_id UUID;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS remix_credits TEXT;

-- Add external platform integration
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS spotify_id VARCHAR(255);
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS apple_music_id VARCHAR(255);
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS youtube_id VARCHAR(255);
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS soundcloud_id VARCHAR(255);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS tracks_isrc_idx ON tracks(isrc);
CREATE INDEX IF NOT EXISTS tracks_upc_idx ON tracks(upc);
CREATE INDEX IF NOT EXISTS tracks_license_type_idx ON tracks(license_type);
CREATE INDEX IF NOT EXISTS tracks_price_idx ON tracks(price);
CREATE INDEX IF NOT EXISTS tracks_approval_status_idx ON tracks(approval_status);
CREATE INDEX IF NOT EXISTS tracks_version_idx ON tracks(version);
CREATE INDEX IF NOT EXISTS tracks_play_count_idx ON tracks(play_count);
CREATE INDEX IF NOT EXISTS tracks_average_rating_idx ON tracks(average_rating);

-- Add comments for documentation
COMMENT ON COLUMN tracks.isrc IS 'International Standard Recording Code';
COMMENT ON COLUMN tracks.upc IS 'Universal Product Code for commercial releases';
COMMENT ON COLUMN tracks.license_type IS 'Type of license (exclusive, non-exclusive, etc.)';
COMMENT ON COLUMN tracks.publisher IS 'Music publisher information';
COMMENT ON COLUMN tracks.price IS 'Price in the specified currency';
COMMENT ON COLUMN tracks.explicit_content IS 'Whether the track contains explicit content';
COMMENT ON COLUMN tracks.featured_artists IS 'Array of featured artist names';
COMMENT ON COLUMN tracks.producers IS 'Array of producer names';
COMMENT ON COLUMN tracks.writers IS 'Array of songwriter names';
COMMENT ON COLUMN tracks.approval_status IS 'Status of track approval workflow';
COMMENT ON COLUMN tracks.version IS 'Version number of the track';
COMMENT ON COLUMN tracks.spotify_id IS 'Spotify track ID for integration';
COMMENT ON COLUMN tracks.apple_music_id IS 'Apple Music track ID for integration'; 