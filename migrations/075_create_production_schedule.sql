-- Migration: Enhance existing production schedule table for label artists
-- Description: Add label artist support to existing production_schedule table

-- Add new columns to existing production_schedule table
ALTER TABLE production_schedule 
ADD COLUMN IF NOT EXISTS label_artist_id UUID REFERENCES label_artists(id) ON DELETE CASCADE;

ALTER TABLE production_schedule 
ADD COLUMN IF NOT EXISTS artist_name VARCHAR(255);

ALTER TABLE production_schedule 
ADD COLUMN IF NOT EXISTS collaborators TEXT[];

-- First, let's see what type values currently exist and update them if needed
UPDATE production_schedule 
SET type = 'song_production' 
WHERE type IS NULL OR type = '';

-- Update existing type constraint to include new production types AND existing values
ALTER TABLE production_schedule 
DROP CONSTRAINT IF EXISTS production_schedule_type_check;

ALTER TABLE production_schedule 
ADD CONSTRAINT production_schedule_type_check 
CHECK (type IN (
    'song_production', 'album_production', 'single_release', 
    'ep_release', 'music_video', 'live_performance', 
    'recording_session', 'mixing_mastering', 'marketing_campaign',
    'distribution_setup', 'playlist_submission', 'radio_promotion',
    -- Include any existing values that might be in the table
    'track_production', 'beat_production', 'release', 'production'
));

-- Update any NULL or empty status values
UPDATE production_schedule 
SET status = 'scheduled' 
WHERE status IS NULL OR status = '';

-- Update existing status constraint to include new statuses AND existing values
ALTER TABLE production_schedule 
DROP CONSTRAINT IF EXISTS production_schedule_status_check;

ALTER TABLE production_schedule 
ADD CONSTRAINT production_schedule_status_check 
CHECK (status IN (
    'scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold',
    -- Include any existing values that might be in the table
    'pending', 'active', 'finished', 'draft'
));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_production_schedule_user_id ON production_schedule(user_id);
CREATE INDEX IF NOT EXISTS idx_production_schedule_label_artist_id ON production_schedule(label_artist_id);
CREATE INDEX IF NOT EXISTS idx_production_schedule_type ON production_schedule(type);
CREATE INDEX IF NOT EXISTS idx_production_schedule_status ON production_schedule(status);
CREATE INDEX IF NOT EXISTS idx_production_schedule_priority ON production_schedule(priority);
CREATE INDEX IF NOT EXISTS idx_production_schedule_scheduled_date ON production_schedule(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_production_schedule_due_date ON production_schedule(due_date);
CREATE INDEX IF NOT EXISTS idx_production_schedule_artist_name ON production_schedule(artist_name);

-- Add updated_at trigger
CREATE TRIGGER update_production_schedule_updated_at 
    BEFORE UPDATE ON production_schedule 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically set completed_date when status becomes completed
CREATE OR REPLACE FUNCTION set_production_completed_date()
RETURNS TRIGGER AS $$
BEGIN
    -- If status is being set to completed and completed_date is null, set it to now
    IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.completed_date IS NULL THEN
        NEW.completed_date = NOW();
        NEW.completed_by = auth.uid();
    END IF;
    
    -- If status is being changed from completed, clear completed_date and completed_by
    IF NEW.status != 'completed' AND OLD.status = 'completed' THEN
        NEW.completed_date = NULL;
        NEW.completed_by = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_production_completed_date_trigger 
    BEFORE UPDATE ON production_schedule 
    FOR EACH ROW 
    EXECUTE FUNCTION set_production_completed_date();

-- Function to sync artist_name when label_artist_id changes
CREATE OR REPLACE FUNCTION sync_production_artist_name()
RETURNS TRIGGER AS $$
BEGIN
    -- If label_artist_id is set and artist_name is null/different, update it
    IF NEW.label_artist_id IS NOT NULL THEN
        SELECT name INTO NEW.artist_name 
        FROM label_artists 
        WHERE id = NEW.label_artist_id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_production_artist_name_trigger ON production_schedule;

CREATE TRIGGER sync_production_artist_name_trigger 
    BEFORE INSERT OR UPDATE ON production_schedule 
    FOR EACH ROW 
    EXECUTE FUNCTION sync_production_artist_name();

-- Add RLS policies
ALTER TABLE production_schedule ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own production schedule items
CREATE POLICY "Users can view their own production schedule" 
    ON production_schedule FOR SELECT 
    TO authenticated 
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own production schedule items
CREATE POLICY "Users can insert production schedule items" 
    ON production_schedule FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own production schedule items
CREATE POLICY "Users can update their own production schedule" 
    ON production_schedule FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own production schedule items
CREATE POLICY "Users can delete their own production schedule" 
    ON production_schedule FOR DELETE 
    TO authenticated 
    USING (auth.uid() = user_id);
