-- Add comprehensive metadata fields to album_tracks and singles tables
-- This migration adds distribution and production metadata fields

-- Add metadata columns to album_tracks table
ALTER TABLE album_tracks 
ADD COLUMN IF NOT EXISTS distributor VARCHAR(255),
ADD COLUMN IF NOT EXISTS deadline_to_distribute DATE,
ADD COLUMN IF NOT EXISTS performing_artists TEXT,
ADD COLUMN IF NOT EXISTS producers TEXT,
ADD COLUMN IF NOT EXISTS engineers TEXT,
ADD COLUMN IF NOT EXISTS copyright_info TEXT,
ADD COLUMN IF NOT EXISTS songwriter TEXT,
ADD COLUMN IF NOT EXISTS release_date DATE,
ADD COLUMN IF NOT EXISTS label VARCHAR(255),
ADD COLUMN IF NOT EXISTS upc VARCHAR(50),
ADD COLUMN IF NOT EXISTS primary_genre VARCHAR(100),
ADD COLUMN IF NOT EXISTS language VARCHAR(50),
ADD COLUMN IF NOT EXISTS release_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS isrc VARCHAR(50),
ADD COLUMN IF NOT EXISTS recording_location VARCHAR(255),
ADD COLUMN IF NOT EXISTS mix_engineer VARCHAR(255),
ADD COLUMN IF NOT EXISTS mastering_engineer VARCHAR(255),
ADD COLUMN IF NOT EXISTS publishing_rights TEXT,
ADD COLUMN IF NOT EXISTS mechanical_rights TEXT,
ADD COLUMN IF NOT EXISTS territory VARCHAR(255),
ADD COLUMN IF NOT EXISTS explicit_content BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS parental_advisory BOOLEAN DEFAULT false;

-- Add metadata columns to singles table
ALTER TABLE singles 
ADD COLUMN IF NOT EXISTS distributor VARCHAR(255),
ADD COLUMN IF NOT EXISTS deadline_to_distribute DATE,
ADD COLUMN IF NOT EXISTS performing_artists TEXT,
ADD COLUMN IF NOT EXISTS producers TEXT,
ADD COLUMN IF NOT EXISTS engineers TEXT,
ADD COLUMN IF NOT EXISTS copyright_info TEXT,
ADD COLUMN IF NOT EXISTS songwriter TEXT,
ADD COLUMN IF NOT EXISTS release_date DATE,
ADD COLUMN IF NOT EXISTS label VARCHAR(255),
ADD COLUMN IF NOT EXISTS upc VARCHAR(50),
ADD COLUMN IF NOT EXISTS primary_genre VARCHAR(100),
ADD COLUMN IF NOT EXISTS language VARCHAR(50),
ADD COLUMN IF NOT EXISTS release_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS isrc VARCHAR(50),
ADD COLUMN IF NOT EXISTS recording_location VARCHAR(255),
ADD COLUMN IF NOT EXISTS mix_engineer VARCHAR(255),
ADD COLUMN IF NOT EXISTS mastering_engineer VARCHAR(255),
ADD COLUMN IF NOT EXISTS publishing_rights TEXT,
ADD COLUMN IF NOT EXISTS mechanical_rights TEXT,
ADD COLUMN IF NOT EXISTS territory VARCHAR(255),
ADD COLUMN IF NOT EXISTS explicit_content BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS parental_advisory BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN album_tracks.distributor IS 'Distribution company or platform';
COMMENT ON COLUMN album_tracks.deadline_to_distribute IS 'Target date for distribution';
COMMENT ON COLUMN album_tracks.performing_artists IS 'Comma-separated list of performing artists';
COMMENT ON COLUMN album_tracks.producers IS 'Comma-separated list of producers';
COMMENT ON COLUMN album_tracks.engineers IS 'Comma-separated list of engineers';
COMMENT ON COLUMN album_tracks.copyright_info IS 'Copyright information and year';
COMMENT ON COLUMN album_tracks.songwriter IS 'Comma-separated list of songwriters';
COMMENT ON COLUMN album_tracks.release_date IS 'Official release date';
COMMENT ON COLUMN album_tracks.label IS 'Record label name';
COMMENT ON COLUMN album_tracks.upc IS 'Universal Product Code';
COMMENT ON COLUMN album_tracks.primary_genre IS 'Primary music genre';
COMMENT ON COLUMN album_tracks.language IS 'Primary language of the track';
COMMENT ON COLUMN album_tracks.release_id IS 'Platform-specific release identifier';
COMMENT ON COLUMN album_tracks.isrc IS 'International Standard Recording Code';
COMMENT ON COLUMN album_tracks.recording_location IS 'Where the track was recorded';
COMMENT ON COLUMN album_tracks.mix_engineer IS 'Mix engineer name';
COMMENT ON COLUMN album_tracks.mastering_engineer IS 'Mastering engineer name';
COMMENT ON COLUMN album_tracks.publishing_rights IS 'Publishing rights information';
COMMENT ON COLUMN album_tracks.mechanical_rights IS 'Mechanical rights information';
COMMENT ON COLUMN album_tracks.territory IS 'Distribution territory';
COMMENT ON COLUMN album_tracks.explicit_content IS 'Whether track contains explicit content';
COMMENT ON COLUMN album_tracks.parental_advisory IS 'Whether parental advisory is required';

-- Add same comments for singles table
COMMENT ON COLUMN singles.distributor IS 'Distribution company or platform';
COMMENT ON COLUMN singles.deadline_to_distribute IS 'Target date for distribution';
COMMENT ON COLUMN singles.performing_artists IS 'Comma-separated list of performing artists';
COMMENT ON COLUMN singles.producers IS 'Comma-separated list of producers';
COMMENT ON COLUMN singles.engineers IS 'Comma-separated list of engineers';
COMMENT ON COLUMN singles.copyright_info IS 'Copyright information and year';
COMMENT ON COLUMN singles.songwriter IS 'Comma-separated list of songwriters';
COMMENT ON COLUMN singles.release_date IS 'Official release date';
COMMENT ON COLUMN singles.label IS 'Record label name';
COMMENT ON COLUMN singles.upc IS 'Universal Product Code';
COMMENT ON COLUMN singles.primary_genre IS 'Primary music genre';
COMMENT ON COLUMN singles.language IS 'Primary language of the track';
COMMENT ON COLUMN singles.release_id IS 'Platform-specific release identifier';
COMMENT ON COLUMN singles.isrc IS 'International Standard Recording Code';
COMMENT ON COLUMN singles.recording_location IS 'Where the track was recorded';
COMMENT ON COLUMN singles.mix_engineer IS 'Mix engineer name';
COMMENT ON COLUMN singles.mastering_engineer IS 'Mastering engineer name';
COMMENT ON COLUMN singles.publishing_rights IS 'Publishing rights information';
COMMENT ON COLUMN singles.mechanical_rights IS 'Mechanical rights information';
COMMENT ON COLUMN singles.territory IS 'Distribution territory';
COMMENT ON COLUMN singles.explicit_content IS 'Whether track contains explicit content';
COMMENT ON COLUMN singles.parental_advisory IS 'Whether parental advisory is required'; 