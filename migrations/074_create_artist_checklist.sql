-- Migration: Create artist checklist table
-- Description: Task management and tracking system for artists

-- Create label_artist_checklist table
CREATE TABLE IF NOT EXISTS label_artist_checklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Label Artist Association
    label_artist_id UUID NOT NULL REFERENCES label_artists(id) ON DELETE CASCADE,
    
    -- Task Information
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'music_rights', 'social_media', 'distribution', 'marketing', 'legal', 'other'
    )),
    task VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Status and Progress
    completed BOOLEAN DEFAULT false,
    completed_date TIMESTAMP WITH TIME ZONE,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    
    -- Additional Data
    notes TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    assigned_to VARCHAR(255),
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    completed_by UUID REFERENCES auth.users(id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_label_checklist_artist_id ON label_artist_checklist(label_artist_id);
CREATE INDEX IF NOT EXISTS idx_label_checklist_category ON label_artist_checklist(category);
CREATE INDEX IF NOT EXISTS idx_label_checklist_completed ON label_artist_checklist(completed);
CREATE INDEX IF NOT EXISTS idx_label_checklist_priority ON label_artist_checklist(priority);
CREATE INDEX IF NOT EXISTS idx_label_checklist_due_date ON label_artist_checklist(due_date);

-- Add updated_at trigger
CREATE TRIGGER update_label_checklist_updated_at 
    BEFORE UPDATE ON label_artist_checklist 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically set completed_date when completed becomes true
CREATE OR REPLACE FUNCTION set_checklist_completed_date()
RETURNS TRIGGER AS $$
BEGIN
    -- If completed is being set to true and completed_date is null, set it to now
    IF NEW.completed = true AND OLD.completed = false AND NEW.completed_date IS NULL THEN
        NEW.completed_date = NOW();
        NEW.completed_by = auth.uid();
    END IF;
    
    -- If completed is being set to false, clear completed_date and completed_by
    IF NEW.completed = false AND OLD.completed = true THEN
        NEW.completed_date = NULL;
        NEW.completed_by = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_label_checklist_completed_date_trigger 
    BEFORE UPDATE ON label_artist_checklist 
    FOR EACH ROW 
    EXECUTE FUNCTION set_checklist_completed_date();

-- Add RLS policies
ALTER TABLE label_artist_checklist ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view checklist items for label artists they can see
CREATE POLICY "Label checklist items are viewable by authenticated users" 
    ON label_artist_checklist FOR SELECT 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM label_artists 
            WHERE label_artists.id = label_artist_checklist.label_artist_id
        )
    );

-- Policy: Users can insert checklist items for their label artists
CREATE POLICY "Users can insert label checklist items" 
    ON label_artist_checklist FOR INSERT 
    TO authenticated 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM label_artists 
            WHERE label_artists.id = label_artist_checklist.label_artist_id 
            AND (label_artists.managed_by = auth.uid() OR label_artists.managed_by IS NULL)
        )
    );

-- Policy: Users can update checklist items for their label artists
CREATE POLICY "Users can update label checklist items" 
    ON label_artist_checklist FOR UPDATE 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM label_artists 
            WHERE label_artists.id = label_artist_checklist.label_artist_id 
            AND (label_artists.managed_by = auth.uid() OR label_artists.managed_by IS NULL)
        )
    );

-- Policy: Users can delete checklist items for their label artists
CREATE POLICY "Users can delete label checklist items" 
    ON label_artist_checklist FOR DELETE 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM label_artists 
            WHERE label_artists.id = label_artist_checklist.label_artist_id 
            AND (label_artists.managed_by = auth.uid() OR label_artists.managed_by IS NULL)
        )
    );

-- Create template checklist items table (separate from artist-specific checklist)
CREATE TABLE IF NOT EXISTS label_checklist_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'music_rights', 'social_media', 'distribution', 'marketing', 'legal', 'other'
    )),
    task VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low'))
);

-- Insert common checklist templates
INSERT INTO label_checklist_templates (category, task, description, priority) 
VALUES 
    ('music_rights', 'Claim music copyrights', 'Register all songs with appropriate copyright offices', 'high'),
    ('social_media', 'Verify Instagram profile', 'Get verified checkmark on Instagram', 'medium'),
    ('social_media', 'Setup Spotify for Artists', 'Claim and setup Spotify for Artists profile', 'high'),
    ('distribution', 'Setup distribution channels', 'Get music on all major streaming platforms', 'high'),
    ('marketing', 'Create press kit', 'Professional photos, bio, and media assets', 'medium'),
    ('legal', 'Register with PRO', 'Register with ASCAP, BMI, or SESAC for performance royalties', 'high')
ON CONFLICT DO NOTHING;
