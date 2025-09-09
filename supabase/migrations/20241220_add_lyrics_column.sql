-- Ensure lyrics column exists in sessions table
-- Created: 2024-12-20

-- Add the basic lyrics column if it doesn't exist
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS lyrics TEXT;

-- Add comment to document the column
COMMENT ON COLUMN sessions.lyrics IS 'Main lyrics content for the session';
