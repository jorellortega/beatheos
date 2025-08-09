-- Migration: Create label artists table
-- Description: Separate table for label-signed artists managed by the label (different from user-generated artist profiles)

-- Create label_artists table (separate from existing artists table)
CREATE TABLE IF NOT EXISTS label_artists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Basic Information
    name VARCHAR(255) NOT NULL,
    stage_name VARCHAR(255),
    real_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    
    -- Profile Information
    bio TEXT,
    image_url TEXT,
    location VARCHAR(255),
    country VARCHAR(255),
    website VARCHAR(255),
    
    -- Music Information
    genre VARCHAR(100),
    subgenre VARCHAR(100),
    years_active INTEGER,
    
    -- Label Business Information
    manager VARCHAR(255),
    agent VARCHAR(255),
    label VARCHAR(255),
    booking_agent VARCHAR(255),
    
    -- Contract Information
    contract_start DATE,
    contract_end DATE,
    royalty_rate DECIMAL(5,2), -- Percentage
    
    -- Performance Metrics
    performance_score INTEGER DEFAULT 0 CHECK (performance_score >= 0 AND performance_score <= 100),
    total_streams BIGINT DEFAULT 0,
    monthly_listeners INTEGER DEFAULT 0,
    followers INTEGER DEFAULT 0,
    revenue DECIMAL(12,2) DEFAULT 0,
    growth_rate DECIMAL(5,2) DEFAULT 0,
    engagement_rate DECIMAL(5,2) DEFAULT 0,
    market_potential INTEGER DEFAULT 0 CHECK (market_potential >= 0 AND market_potential <= 100),
    
    -- Classification and Priority
    artist_class VARCHAR(20) DEFAULT 'emerging' CHECK (artist_class IN ('superstar', 'platinum', 'gold', 'silver', 'bronze', 'emerging', 'indie')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'suspended', 'archived')),
    rank VARCHAR(1) DEFAULT 'C' CHECK (rank IN ('A', 'B', 'C', 'D', 'E')),
    
    -- Release Information
    releases INTEGER DEFAULT 0,
    upcoming_releases INTEGER DEFAULT 0,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Social Media (JSONB for flexibility)
    social_media JSONB DEFAULT '{}',
    
    -- Distributors
    distributors TEXT[],
    
    -- Additional Fields
    notes TEXT,
    tags TEXT[],
    
    -- User Association (who manages this artist)
    managed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_label_artists_name ON label_artists(name);
CREATE INDEX IF NOT EXISTS idx_label_artists_stage_name ON label_artists(stage_name);
CREATE INDEX IF NOT EXISTS idx_label_artists_genre ON label_artists(genre);
CREATE INDEX IF NOT EXISTS idx_label_artists_artist_class ON label_artists(artist_class);
CREATE INDEX IF NOT EXISTS idx_label_artists_priority ON label_artists(priority);
CREATE INDEX IF NOT EXISTS idx_label_artists_status ON label_artists(status);
CREATE INDEX IF NOT EXISTS idx_label_artists_rank ON label_artists(rank);
CREATE INDEX IF NOT EXISTS idx_label_artists_managed_by ON label_artists(managed_by);
CREATE INDEX IF NOT EXISTS idx_label_artists_contract_dates ON label_artists(contract_start, contract_end);
CREATE INDEX IF NOT EXISTS idx_label_artists_performance ON label_artists(performance_score DESC);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_label_artists_updated_at 
    BEFORE UPDATE ON label_artists 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE label_artists ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all label artists
CREATE POLICY "Label artists are viewable by authenticated users" 
    ON label_artists FOR SELECT 
    TO authenticated 
    USING (true);

-- Policy: Users can insert label artists
CREATE POLICY "Users can insert label artists" 
    ON label_artists FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = managed_by OR managed_by IS NULL);

-- Policy: Users can update label artists they manage or if managed_by is null (admin data)
CREATE POLICY "Users can update label artists they manage" 
    ON label_artists FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = managed_by OR managed_by IS NULL)
    WITH CHECK (auth.uid() = managed_by OR managed_by IS NULL);

-- Policy: Users can delete label artists they manage
CREATE POLICY "Users can delete label artists they manage" 
    ON label_artists FOR DELETE 
    TO authenticated 
    USING (auth.uid() = managed_by OR managed_by IS NULL);
