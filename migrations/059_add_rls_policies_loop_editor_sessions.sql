-- Add Row Level Security policies for loop_editor_sessions table
-- This fixes the 401 Unauthorized error when trying to access sessions

-- Enable RLS on the table
ALTER TABLE loop_editor_sessions ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own sessions
CREATE POLICY "Users can view their own loop editor sessions" ON loop_editor_sessions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy for users to insert their own sessions
CREATE POLICY "Users can create their own loop editor sessions" ON loop_editor_sessions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own sessions
CREATE POLICY "Users can update their own loop editor sessions" ON loop_editor_sessions
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy for users to delete their own sessions
CREATE POLICY "Users can delete their own loop editor sessions" ON loop_editor_sessions
    FOR DELETE
    USING (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON POLICY "Users can view their own loop editor sessions" ON loop_editor_sessions IS 'Allows users to view only their own loop editor sessions';
COMMENT ON POLICY "Users can create their own loop editor sessions" ON loop_editor_sessions IS 'Allows users to create new loop editor sessions for themselves';
COMMENT ON POLICY "Users can update their own loop editor sessions" ON loop_editor_sessions IS 'Allows users to update only their own loop editor sessions';
COMMENT ON POLICY "Users can delete their own loop editor sessions" ON loop_editor_sessions IS 'Allows users to delete only their own loop editor sessions'; 