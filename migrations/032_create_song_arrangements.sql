-- Create song_arrangements table
CREATE TABLE IF NOT EXISTS song_arrangements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    genre VARCHAR(100),
    subgenre VARCHAR(100),
    tags TEXT[],
    bpm INTEGER NOT NULL,
    steps INTEGER NOT NULL,
    transport_key VARCHAR(10),
    pattern_assignments JSONB NOT NULL, -- Stores track_id to bar_position to pattern_id mappings
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_song_arrangements_user_id ON song_arrangements(user_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_song_arrangements_created_at ON song_arrangements(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE song_arrangements ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see their own song arrangements
CREATE POLICY "Users can view their own song arrangements" ON song_arrangements
    FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own song arrangements
CREATE POLICY "Users can insert their own song arrangements" ON song_arrangements
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own song arrangements
CREATE POLICY "Users can update their own song arrangements" ON song_arrangements
    FOR UPDATE USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own song arrangements
CREATE POLICY "Users can delete their own song arrangements" ON song_arrangements
    FOR DELETE USING (auth.uid() = user_id); 