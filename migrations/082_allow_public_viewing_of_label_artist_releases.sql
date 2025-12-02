-- Allow public viewing of albums and singles linked to published label artists
-- This enables albums/singles with label_artist_id to be visible on public artist pages

-- Enable RLS on albums and singles if not already enabled
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE singles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Public albums linked to published label artists are viewable by everyone" ON albums;
DROP POLICY IF EXISTS "Singles linked to published label artists are viewable by everyone" ON singles;

-- Policy: Anyone can view albums that are public AND linked to a published label artist (has slug)
CREATE POLICY "Public albums linked to published label artists are viewable by everyone" 
    ON albums FOR SELECT 
    TO public
    USING (
        visibility = 'public' 
        AND label_artist_id IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM label_artists 
            WHERE label_artists.id = albums.label_artist_id 
            AND label_artists.slug IS NOT NULL
        )
    );

-- Policy: Anyone can view singles linked to a published label artist (has slug)
CREATE POLICY "Singles linked to published label artists are viewable by everyone" 
    ON singles FOR SELECT 
    TO public
    USING (
        label_artist_id IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM label_artists 
            WHERE label_artists.id = singles.label_artist_id 
            AND label_artists.slug IS NOT NULL
        )
    );

