-- Migration: Create rights and metadata management tables
-- Description: Comprehensive rights, publishing, and metadata management for artists

-- Create sample_clearances table
CREATE TABLE IF NOT EXISTS label_artist_sample_clearances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Label Artist Association
    label_artist_id UUID NOT NULL REFERENCES label_artists(id) ON DELETE CASCADE,
    
    -- Sample Information
    sample_name VARCHAR(255) NOT NULL,
    original_song VARCHAR(255),
    original_artist VARCHAR(255),
    sample_duration INTEGER, -- in seconds
    usage_description TEXT,
    
    -- Clearance Status
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending', 'approved', 'denied', 'not_required'
    )),
    clearance_cost DECIMAL(10,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Legal Information
    rights_holder VARCHAR(255),
    contact_info TEXT,
    clearance_date DATE,
    expiry_date DATE,
    
    -- Documentation
    notes TEXT,
    documents JSONB DEFAULT '[]', -- Array of document URLs/references
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Create publishing_rights table
CREATE TABLE IF NOT EXISTS label_artist_publishing_rights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Label Artist Association
    label_artist_id UUID NOT NULL REFERENCES label_artists(id) ON DELETE CASCADE,
    
    -- Song Information
    song_title VARCHAR(255) NOT NULL,
    isrc_code VARCHAR(20),
    
    -- Rights Information
    master_owner VARCHAR(255),
    publishing_company VARCHAR(255),
    
    -- PRO Information
    pro_affiliation VARCHAR(100), -- ASCAP, BMI, SESAC, etc.
    
    -- Writers and Publishers
    writers TEXT[], -- Array of writer names
    publishers TEXT[], -- Array of publisher names
    splits JSONB DEFAULT '{}', -- Percentage splits for writers/publishers
    
    -- Licensing Status
    licensing_status VARCHAR(50) DEFAULT 'pending' CHECK (licensing_status IN (
        'pending', 'active', 'expired', 'terminated'
    )),
    license_start_date DATE,
    license_end_date DATE,
    
    -- Metadata
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Create copyright_registrations table
CREATE TABLE IF NOT EXISTS label_artist_copyright_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Label Artist Association
    label_artist_id UUID NOT NULL REFERENCES label_artists(id) ON DELETE CASCADE,
    
    -- Song Information
    song_title VARCHAR(255) NOT NULL,
    registration_number VARCHAR(100),
    
    -- Registration Details
    filed_date DATE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending', 'registered', 'rejected', 'expired'
    )),
    
    -- Copyright Information
    copyright_owner VARCHAR(255),
    copyright_year INTEGER,
    work_type VARCHAR(50) DEFAULT 'musical_work' CHECK (work_type IN (
        'musical_work', 'sound_recording', 'both'
    )),
    
    -- Documentation
    filing_documents JSONB DEFAULT '[]',
    certificate_url TEXT,
    
    -- Metadata
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Create isrc_upc_codes table
CREATE TABLE IF NOT EXISTS label_artist_isrc_upc_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Label Artist Association
    label_artist_id UUID NOT NULL REFERENCES label_artists(id) ON DELETE CASCADE,
    
    -- Code Information
    code_type VARCHAR(10) NOT NULL CHECK (code_type IN ('ISRC', 'UPC')),
    code_value VARCHAR(20) NOT NULL,
    
    -- Associated Content
    content_title VARCHAR(255) NOT NULL,
    content_type VARCHAR(50) CHECK (content_type IN (
        'single', 'album', 'ep', 'compilation'
    )),
    
    -- Status
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN (
        'active', 'inactive', 'expired'
    )),
    assigned_date DATE DEFAULT CURRENT_DATE,
    
    -- Metadata
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    
    -- Ensure unique codes
    UNIQUE(code_value)
);

-- Add indexes for all tables
CREATE INDEX IF NOT EXISTS idx_label_sample_clearances_artist_id ON label_artist_sample_clearances(label_artist_id);
CREATE INDEX IF NOT EXISTS idx_label_sample_clearances_status ON label_artist_sample_clearances(status);
CREATE INDEX IF NOT EXISTS idx_label_sample_clearances_sample_name ON label_artist_sample_clearances(sample_name);

CREATE INDEX IF NOT EXISTS idx_label_publishing_rights_artist_id ON label_artist_publishing_rights(label_artist_id);
CREATE INDEX IF NOT EXISTS idx_label_publishing_rights_song_title ON label_artist_publishing_rights(song_title);
CREATE INDEX IF NOT EXISTS idx_label_publishing_rights_isrc ON label_artist_publishing_rights(isrc_code);
CREATE INDEX IF NOT EXISTS idx_label_publishing_rights_licensing_status ON label_artist_publishing_rights(licensing_status);

CREATE INDEX IF NOT EXISTS idx_label_copyright_registrations_artist_id ON label_artist_copyright_registrations(label_artist_id);
CREATE INDEX IF NOT EXISTS idx_label_copyright_registrations_song_title ON label_artist_copyright_registrations(song_title);
CREATE INDEX IF NOT EXISTS idx_label_copyright_registrations_status ON label_artist_copyright_registrations(status);
CREATE INDEX IF NOT EXISTS idx_label_copyright_registrations_registration_number ON label_artist_copyright_registrations(registration_number);

CREATE INDEX IF NOT EXISTS idx_label_isrc_upc_codes_artist_id ON label_artist_isrc_upc_codes(label_artist_id);
CREATE INDEX IF NOT EXISTS idx_label_isrc_upc_codes_type ON label_artist_isrc_upc_codes(code_type);
CREATE INDEX IF NOT EXISTS idx_label_isrc_upc_codes_value ON label_artist_isrc_upc_codes(code_value);

-- Add updated_at triggers for all tables
CREATE TRIGGER update_label_sample_clearances_updated_at 
    BEFORE UPDATE ON label_artist_sample_clearances 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_label_publishing_rights_updated_at 
    BEFORE UPDATE ON label_artist_publishing_rights 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_label_copyright_registrations_updated_at 
    BEFORE UPDATE ON label_artist_copyright_registrations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_label_isrc_upc_codes_updated_at 
    BEFORE UPDATE ON label_artist_isrc_upc_codes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies for all tables

-- Sample Clearances Policies
ALTER TABLE label_artist_sample_clearances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Label sample clearances are viewable by authenticated users" 
    ON label_artist_sample_clearances FOR SELECT 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM label_artists 
            WHERE label_artists.id = label_artist_sample_clearances.label_artist_id
        )
    );

CREATE POLICY "Users can manage sample clearances for their label artists" 
    ON label_artist_sample_clearances FOR ALL 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM label_artists 
            WHERE label_artists.id = label_artist_sample_clearances.label_artist_id 
            AND (label_artists.managed_by = auth.uid() OR label_artists.managed_by IS NULL)
        )
    );

-- Publishing Rights Policies
ALTER TABLE label_artist_publishing_rights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Label publishing rights are viewable by authenticated users" 
    ON label_artist_publishing_rights FOR SELECT 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM label_artists 
            WHERE label_artists.id = label_artist_publishing_rights.label_artist_id
        )
    );

CREATE POLICY "Users can manage publishing rights for their label artists" 
    ON label_artist_publishing_rights FOR ALL 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM label_artists 
            WHERE label_artists.id = label_artist_publishing_rights.label_artist_id 
            AND (label_artists.managed_by = auth.uid() OR label_artists.managed_by IS NULL)
        )
    );

-- Copyright Registrations Policies
ALTER TABLE label_artist_copyright_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Label copyright registrations are viewable by authenticated users" 
    ON label_artist_copyright_registrations FOR SELECT 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM label_artists 
            WHERE label_artists.id = label_artist_copyright_registrations.label_artist_id
        )
    );

CREATE POLICY "Users can manage copyright registrations for their label artists" 
    ON label_artist_copyright_registrations FOR ALL 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM label_artists 
            WHERE label_artists.id = label_artist_copyright_registrations.label_artist_id 
            AND (label_artists.managed_by = auth.uid() OR label_artists.managed_by IS NULL)
        )
    );

-- ISRC/UPC Codes Policies
ALTER TABLE label_artist_isrc_upc_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Label ISRC/UPC codes are viewable by authenticated users" 
    ON label_artist_isrc_upc_codes FOR SELECT 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM label_artists 
            WHERE label_artists.id = label_artist_isrc_upc_codes.label_artist_id
        )
    );

CREATE POLICY "Users can manage ISRC/UPC codes for their label artists" 
    ON label_artist_isrc_upc_codes FOR ALL 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM label_artists 
            WHERE label_artists.id = label_artist_isrc_upc_codes.label_artist_id 
            AND (label_artists.managed_by = auth.uid() OR label_artists.managed_by IS NULL)
        )
    );
