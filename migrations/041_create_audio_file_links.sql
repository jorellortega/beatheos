-- Create audio_file_links table for linking different formats of the same audio file
CREATE TABLE audio_file_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  original_file_id UUID NOT NULL REFERENCES audio_library_items(id) ON DELETE CASCADE,
  converted_file_id UUID NOT NULL REFERENCES audio_library_items(id) ON DELETE CASCADE,
  original_format VARCHAR(10) NOT NULL,
  converted_format VARCHAR(10) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX audio_file_links_user_id_idx ON audio_file_links(user_id);
CREATE INDEX audio_file_links_original_file_id_idx ON audio_file_links(original_file_id);
CREATE INDEX audio_file_links_converted_file_id_idx ON audio_file_links(converted_file_id);
CREATE INDEX audio_file_links_created_at_idx ON audio_file_links(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE audio_file_links ENABLE ROW LEVEL SECURITY;

-- Create policy so users can only access their own file links
CREATE POLICY "Users can manage their own file links" ON audio_file_links
  FOR ALL USING (auth.uid() = user_id);

-- Add unique constraint to prevent duplicate links
ALTER TABLE audio_file_links 
ADD CONSTRAINT unique_file_link 
UNIQUE (original_file_id, converted_file_id);

-- Add comments for documentation
COMMENT ON TABLE audio_file_links IS 'Links between different formats of the same audio file (e.g., WAV to MP3 conversion)';
COMMENT ON COLUMN audio_file_links.original_file_id IS 'Reference to the original audio file';
COMMENT ON COLUMN audio_file_links.converted_file_id IS 'Reference to the converted audio file';
COMMENT ON COLUMN audio_file_links.original_format IS 'File format of the original file (e.g., wav, flac)';
COMMENT ON COLUMN audio_file_links.converted_format IS 'File format of the converted file (e.g., mp3)'; 