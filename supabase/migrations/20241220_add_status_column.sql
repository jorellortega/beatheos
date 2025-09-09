-- Add status column to sessions table for lyrics status tracking
-- Created: 2024-12-20

-- Add status column if it doesn't exist
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';

-- Add comment to document the column
COMMENT ON COLUMN sessions.status IS 'Status of the lyrics/session (draft, in-progress, review, completed, archived)';

-- Add index for performance when filtering by status
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
