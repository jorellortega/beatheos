-- Add status columns to albums and singles tables for distribution tracking
-- This allows users to track the status of their releases (draft, active, paused, scheduled, etc.)

-- Add status to albums table
ALTER TABLE albums 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';

-- Add status to singles table  
ALTER TABLE singles 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS albums_status_idx ON albums(status);
CREATE INDEX IF NOT EXISTS singles_status_idx ON singles(status);

-- Add comments for documentation
COMMENT ON COLUMN albums.status IS 'Distribution status: draft, active, paused, scheduled, archived';
COMMENT ON COLUMN singles.status IS 'Distribution status: draft, active, paused, scheduled, archived';

-- Add constraint to ensure valid status values
ALTER TABLE albums 
ADD CONSTRAINT albums_status_check 
CHECK (status IN ('draft', 'active', 'paused', 'scheduled', 'archived'));

ALTER TABLE singles 
ADD CONSTRAINT singles_status_check 
CHECK (status IN ('draft', 'active', 'paused', 'scheduled', 'archived')); 