-- Create genres table for organizing beat maker templates and sounds
CREATE TABLE IF NOT EXISTS genres (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL for system genres
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#F4C430', -- Hex color for UI
  icon VARCHAR(50), -- Icon name for UI display
  bpm_range_min INTEGER DEFAULT 80,
  bpm_range_max INTEGER DEFAULT 180,
  default_bpm INTEGER DEFAULT 120,
  default_key VARCHAR(10) DEFAULT 'C',
  default_steps INTEGER DEFAULT 16,
  is_public BOOLEAN DEFAULT false,
  is_template BOOLEAN DEFAULT false, -- Whether this is a template genre
  parent_genre_id UUID REFERENCES genres(id) ON DELETE SET NULL, -- For sub-genres
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create genre_templates table for storing genre-specific templates
CREATE TABLE IF NOT EXISTS genre_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  genre_id UUID NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  template_data JSONB NOT NULL, -- Stores complete beat maker state
  bpm INTEGER NOT NULL DEFAULT 120,
  key VARCHAR(10) DEFAULT 'C',
  steps INTEGER DEFAULT 16,
  transport_key VARCHAR(10) DEFAULT 'C',
  tracks JSONB, -- Track configurations
  sequencer_data JSONB, -- Step patterns
  mixer_data JSONB, -- Mixer settings
  effects_data JSONB, -- Effects settings
  piano_roll_data JSONB, -- Piano roll data
  is_public BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false, -- Default template for this genre
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create genre_sounds table for organizing sounds by genre
CREATE TABLE IF NOT EXISTS genre_sounds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  genre_id UUID NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  sound_type VARCHAR(50) NOT NULL, -- 'kick', 'snare', 'hihat', 'bass', 'melody', 'fx', etc.
  audio_url TEXT, -- URL to audio file
  file_path TEXT, -- Storage path
  bpm INTEGER,
  key VARCHAR(10),
  tags TEXT[],
  metadata JSONB, -- Additional metadata
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create genre_patterns table for genre-specific patterns
CREATE TABLE IF NOT EXISTS genre_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  genre_id UUID NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  pattern_type VARCHAR(50) NOT NULL, -- 'drum', 'bass', 'melody', 'fx', etc.
  pattern_data JSONB NOT NULL, -- Pattern data
  bpm INTEGER NOT NULL DEFAULT 120,
  key VARCHAR(10) DEFAULT 'C',
  steps INTEGER DEFAULT 16,
  difficulty VARCHAR(20) DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX genres_user_id_idx ON genres(user_id);
CREATE INDEX genres_name_idx ON genres(name);
CREATE INDEX genres_is_public_idx ON genres(is_public);
CREATE INDEX genres_is_template_idx ON genres(is_template);
CREATE INDEX genres_parent_genre_id_idx ON genres(parent_genre_id);

CREATE INDEX genre_templates_genre_id_idx ON genre_templates(genre_id);
CREATE INDEX genre_templates_user_id_idx ON genre_templates(user_id);
CREATE INDEX genre_templates_is_public_idx ON genre_templates(is_public);
CREATE INDEX genre_templates_is_default_idx ON genre_templates(is_default);

CREATE INDEX genre_sounds_genre_id_idx ON genre_sounds(genre_id);
CREATE INDEX genre_sounds_user_id_idx ON genre_sounds(user_id);
CREATE INDEX genre_sounds_sound_type_idx ON genre_sounds(sound_type);
CREATE INDEX genre_sounds_is_public_idx ON genre_sounds(is_public);

CREATE INDEX genre_patterns_genre_id_idx ON genre_patterns(genre_id);
CREATE INDEX genre_patterns_user_id_idx ON genre_patterns(user_id);
CREATE INDEX genre_patterns_pattern_type_idx ON genre_patterns(pattern_type);
CREATE INDEX genre_patterns_is_public_idx ON genre_patterns(is_public);

-- Enable Row Level Security
ALTER TABLE genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE genre_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE genre_sounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE genre_patterns ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for genres
CREATE POLICY "Users can view their own genres" ON genres
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view public genres" ON genres
  FOR SELECT USING (is_public = true OR user_id IS NULL);

CREATE POLICY "Users can insert their own genres" ON genres
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own genres" ON genres
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own genres" ON genres
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for genre_templates
CREATE POLICY "Users can view their own genre templates" ON genre_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view public genre templates" ON genre_templates
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can insert their own genre templates" ON genre_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own genre templates" ON genre_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own genre templates" ON genre_templates
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for genre_sounds
CREATE POLICY "Users can view their own genre sounds" ON genre_sounds
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view public genre sounds" ON genre_sounds
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can insert their own genre sounds" ON genre_sounds
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own genre sounds" ON genre_sounds
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own genre sounds" ON genre_sounds
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for genre_patterns
CREATE POLICY "Users can view their own genre patterns" ON genre_patterns
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view public genre patterns" ON genre_patterns
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can insert their own genre patterns" ON genre_patterns
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own genre patterns" ON genre_patterns
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own genre patterns" ON genre_patterns
  FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_genres_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_genre_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_genre_sounds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_genre_patterns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_genres_updated_at
  BEFORE UPDATE ON genres
  FOR EACH ROW EXECUTE FUNCTION update_genres_updated_at();

CREATE TRIGGER update_genre_templates_updated_at
  BEFORE UPDATE ON genre_templates
  FOR EACH ROW EXECUTE FUNCTION update_genre_templates_updated_at();

CREATE TRIGGER update_genre_sounds_updated_at
  BEFORE UPDATE ON genre_sounds
  FOR EACH ROW EXECUTE FUNCTION update_genre_sounds_updated_at();

CREATE TRIGGER update_genre_patterns_updated_at
  BEFORE UPDATE ON genre_patterns
  FOR EACH ROW EXECUTE FUNCTION update_genre_patterns_updated_at();

-- Insert some default genres (system genres with NULL user_id)
INSERT INTO genres (user_id, name, description, color, icon, bpm_range_min, bpm_range_max, default_bpm, default_key, is_public, is_template) VALUES
  (NULL, 'Trap', 'Modern trap music with heavy 808s and hi-hats', '#FF6B6B', 'music', 130, 150, 140, 'Am', true, true),
  (NULL, 'House', 'Classic house music with four-on-the-floor beats', '#4ECDC4', 'music', 120, 130, 125, 'C', true, true),
  (NULL, 'Hip Hop', 'Traditional hip hop with boom bap style', '#45B7D1', 'music', 80, 100, 90, 'C', true, true),
  (NULL, 'Techno', 'Industrial techno with driving rhythms', '#96CEB4', 'music', 120, 140, 130, 'Am', true, true),
  (NULL, 'Jazz', 'Smooth jazz with complex harmonies', '#FFEAA7', 'music', 80, 140, 120, 'C', true, true),
  (NULL, 'Rock', 'Classic rock with guitar-driven beats', '#DDA0DD', 'music', 100, 140, 120, 'C', true, true),
  (NULL, 'Latin', 'Latin music with percussion and rhythm', '#FDCB6E', 'music', 100, 140, 120, 'C', true, true),
  (NULL, 'Pop', 'Mainstream pop with catchy melodies', '#74B9FF', 'music', 100, 140, 120, 'C', true, true),
  (NULL, 'R&B', 'Smooth R&B with soulful grooves', '#A29BFE', 'music', 70, 100, 85, 'C', true, true),
  (NULL, 'Dubstep', 'Heavy dubstep with wobbly bass', '#FD79A8', 'music', 140, 150, 140, 'Am', true, true); 