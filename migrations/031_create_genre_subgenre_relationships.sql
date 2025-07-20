-- Create genre_subgenres table to define valid subgenre relationships
CREATE TABLE IF NOT EXISTS genre_subgenres (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  genre VARCHAR(100) NOT NULL,
  subgenre VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(genre, subgenre)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_genre_subgenres_genre ON genre_subgenres(genre);
CREATE INDEX IF NOT EXISTS idx_genre_subgenres_subgenre ON genre_subgenres(subgenre);

-- Insert some common genre-subgenre relationships
INSERT INTO genre_subgenres (genre, subgenre) VALUES
-- Hip Hop
('Hip Hop', 'Boom Bap'),
('Hip Hop', 'Trap'),
('Hip Hop', 'Drill'),
('Hip Hop', 'Conscious'),
('Hip Hop', 'Gangsta'),
('Hip Hop', 'Alternative'),
('Hip Hop', 'Experimental'),

-- Trap
('Trap', 'Type Beat'),
('Trap', 'Drill'),
('Trap', 'Melodic'),
('Trap', 'Dark'),
('Trap', 'Southern'),
('Trap', 'EDM'),

-- Electronic
('House', 'Deep House'),
('House', 'Progressive House'),
('House', 'Tech House'),
('House', 'Acid House'),
('House', 'Disco House'),

('Techno', 'Acid Techno'),
('Techno', 'Minimal Techno'),
('Techno', 'Industrial Techno'),
('Techno', 'Detroit Techno'),
('Techno', 'Melodic Techno'),

('Dubstep', 'Melodic Dubstep'),
('Dubstep', 'Heavy Dubstep'),
('Dubstep', 'Chillstep'),
('Dubstep', 'Brostep'),

-- Pop
('Pop', 'Indie Pop'),
('Pop', 'Electropop'),
('Pop', 'Synthpop'),
('Pop', 'Alternative Pop'),
('Pop', 'K-Pop'),

-- Rock
('Rock', 'Alternative Rock'),
('Rock', 'Indie Rock'),
('Rock', 'Hard Rock'),
('Rock', 'Progressive Rock'),
('Rock', 'Punk Rock'),

-- R&B
('R&B', 'Contemporary R&B'),
('R&B', 'Alternative R&B'),
('R&B', 'Neo Soul'),
('R&B', 'Soul'),

-- Country
('Country', 'Pop Country'),
('Country', 'Alternative Country'),
('Country', 'Bluegrass'),
('Country', 'Outlaw Country');

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_genre_subgenres_updated_at 
    BEFORE UPDATE ON genre_subgenres 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 