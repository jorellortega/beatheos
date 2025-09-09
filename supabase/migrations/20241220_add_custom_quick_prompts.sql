-- Add custom quick prompts column to sessions table
-- Created: 2024-12-20

-- Add custom_quick_prompts column to store user's custom quick prompts
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS custom_quick_prompts TEXT[] DEFAULT '{}';

-- Add index for performance when filtering by custom quick prompts
CREATE INDEX IF NOT EXISTS idx_sessions_custom_quick_prompts ON sessions USING GIN(custom_quick_prompts);

-- Add comment to document the column
COMMENT ON COLUMN sessions.custom_quick_prompts IS 'Array of custom quick prompts created by the user for AI text generation';
