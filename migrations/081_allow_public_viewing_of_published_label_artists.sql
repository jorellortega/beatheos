-- Allow public viewing of published label artists (those with slugs)
-- This enables the /artists page to show label artists to unauthenticated users

-- Policy: Anyone (including unauthenticated users) can view label artists that have slugs (published)
CREATE POLICY "Published label artists are viewable by everyone" 
    ON label_artists FOR SELECT 
    TO public
    USING (slug IS NOT NULL);

