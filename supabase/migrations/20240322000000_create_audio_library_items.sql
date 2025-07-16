-- Create audio_library_items table for storing user uploaded audio samples
CREATE TABLE audio_library_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  file_url VARCHAR(500),
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX audio_library_items_user_id_idx ON audio_library_items(user_id);
CREATE INDEX audio_library_items_created_at_idx ON audio_library_items(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE audio_library_items ENABLE ROW LEVEL SECURITY;

-- Create policy so users can only access their own audio files
CREATE POLICY "Users can manage their own audio files" ON audio_library_items
  FOR ALL USING (auth.uid() = user_id); 