-- Create production_schedule table for managing music production scheduling
CREATE TABLE production_schedule (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL CHECK (type IN ('collaboration', 'song_production', 'beat_production', 'mixing', 'mastering', 'recording', 'other')),
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold')),
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  scheduled_date DATE NOT NULL,
  due_date DATE NOT NULL,
  assigned_to VARCHAR(255),
  collaborators TEXT[], -- Array of collaborator names/emails
  project_id UUID, -- Reference to albums, singles, or tracks
  project_type VARCHAR(20) CHECK (project_type IN ('album', 'single', 'track', 'other')),
  notes TEXT,
  budget DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  location VARCHAR(255),
  equipment_needed TEXT[], -- Array of equipment items
  checklist JSONB DEFAULT '[]', -- Array of checklist items with status and notes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_production_schedule_user_id ON production_schedule(user_id);
CREATE INDEX idx_production_schedule_status ON production_schedule(status);
CREATE INDEX idx_production_schedule_priority ON production_schedule(priority);
CREATE INDEX idx_production_schedule_scheduled_date ON production_schedule(scheduled_date);
CREATE INDEX idx_production_schedule_due_date ON production_schedule(due_date);
CREATE INDEX idx_production_schedule_type ON production_schedule(type);

-- Create RLS policies
ALTER TABLE production_schedule ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own production schedule items
CREATE POLICY "Users can view own production schedule items" ON production_schedule
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own production schedule items
CREATE POLICY "Users can insert own production schedule items" ON production_schedule
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own production schedule items
CREATE POLICY "Users can update own production schedule items" ON production_schedule
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own production schedule items
CREATE POLICY "Users can delete own production schedule items" ON production_schedule
  FOR DELETE USING (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE production_schedule IS 'Table for managing music production scheduling, collaborations, and recording sessions';
COMMENT ON COLUMN production_schedule.type IS 'Type of production activity (collaboration, song_production, beat_production, mixing, mastering, recording, other)';
COMMENT ON COLUMN production_schedule.status IS 'Current status of the production item (scheduled, in_progress, completed, cancelled, on_hold)';
COMMENT ON COLUMN production_schedule.priority IS 'Priority level (low, medium, high, urgent)';
COMMENT ON COLUMN production_schedule.collaborators IS 'Array of collaborator names or email addresses';
COMMENT ON COLUMN production_schedule.project_id IS 'Reference to related project (album, single, or track ID)';
COMMENT ON COLUMN production_schedule.equipment_needed IS 'Array of equipment items needed for the session';
COMMENT ON COLUMN production_schedule.checklist IS 'JSON array of checklist items with status, notes, and assignment info';
