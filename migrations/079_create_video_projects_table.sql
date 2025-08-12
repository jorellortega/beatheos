-- Migration: Create video_projects table for MP4 converter
-- This table stores video project configurations for creating MP4 videos from music content

CREATE TABLE IF NOT EXISTS video_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    
    -- Audio and cover references
    audio JSONB, -- Store selected audio item data
    cover JSONB, -- Store selected cover item data
    custom_audio_url VARCHAR(500), -- URL to uploaded custom audio file
    custom_cover_url VARCHAR(500), -- URL to uploaded custom cover file
    
    -- Video format and settings
    format VARCHAR(20) NOT NULL CHECK (format IN ('youtube', 'reels')),
    duration INTEGER NOT NULL DEFAULT 30,
    fade_in NUMERIC(3,1) DEFAULT 2.0,
    fade_out NUMERIC(3,1) DEFAULT 2.0,
    
    -- Text overlay settings
    text_overlay TEXT,
    text_color VARCHAR(7) DEFAULT '#ffffff',
    text_size INTEGER DEFAULT 48,
    text_position VARCHAR(10) DEFAULT 'center' CHECK (text_position IN ('top', 'center', 'bottom')),
    
    -- Visual settings
    background_color VARCHAR(7) DEFAULT '#000000',
    
    -- Project metadata
    is_public BOOLEAN DEFAULT false,
    tags TEXT[],
    description TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS video_projects_user_id_idx ON video_projects(user_id);
CREATE INDEX IF NOT EXISTS video_projects_format_idx ON video_projects(format);
CREATE INDEX IF NOT EXISTS video_projects_created_at_idx ON video_projects(created_at);
CREATE INDEX IF NOT EXISTS video_projects_is_public_idx ON video_projects(is_public);

-- Enable RLS (Row Level Security)
ALTER TABLE video_projects ENABLE ROW LEVEL SECURITY;

-- Create policy so users can only access their own projects
CREATE POLICY "Users can manage their own video projects" ON video_projects
    FOR ALL USING (auth.uid() = user_id);

-- Create policy for public projects (if needed)
CREATE POLICY "Public video projects are viewable by everyone" ON video_projects
    FOR SELECT USING (is_public = true);

-- Add comments for documentation
COMMENT ON TABLE video_projects IS 'Stores video project configurations for MP4 converter';
COMMENT ON COLUMN video_projects.audio IS 'JSON data of selected audio item (singles, albums, tracks)';
COMMENT ON COLUMN video_projects.cover IS 'JSON data of selected cover art';
COMMENT ON COLUMN video_projects.format IS 'Video format: youtube (16:9) or reels (9:16)';
COMMENT ON COLUMN video_projects.duration IS 'Video duration in seconds';
COMMENT ON COLUMN video_projects.fade_in IS 'Fade in duration in seconds';
COMMENT ON COLUMN video_projects.fade_out IS 'Fade out duration in seconds';
COMMENT ON COLUMN video_projects.text_overlay IS 'Text to display over the video';
COMMENT ON COLUMN video_projects.text_color IS 'Hex color code for text';
COMMENT ON COLUMN video_projects.text_size IS 'Font size for text overlay';
COMMENT ON COLUMN video_projects.text_position IS 'Position of text overlay: top, center, or bottom';
COMMENT ON COLUMN video_projects.background_color IS 'Hex color code for background';
COMMENT ON COLUMN video_projects.is_public IS 'Whether the project is publicly viewable';
COMMENT ON COLUMN video_projects.tags IS 'Array of tags for categorizing projects';
COMMENT ON COLUMN video_projects.description IS 'Project description and notes';

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_video_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER video_projects_updated_at
    BEFORE UPDATE ON video_projects
    FOR EACH ROW
    EXECUTE FUNCTION update_video_projects_updated_at();
