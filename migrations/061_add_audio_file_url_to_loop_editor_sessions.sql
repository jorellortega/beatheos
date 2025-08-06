-- Add audio_file_url column to loop_editor_sessions table
-- This allows sessions to store the URL of the uploaded audio file

ALTER TABLE loop_editor_sessions 
ADD COLUMN audio_file_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN loop_editor_sessions.audio_file_url IS 'URL to the uploaded audio file in storage for automatic loading'; 