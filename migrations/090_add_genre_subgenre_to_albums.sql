-- Add genre and subgenre to albums (matches singles table)
ALTER TABLE albums ADD COLUMN IF NOT EXISTS genre VARCHAR(100);
ALTER TABLE albums ADD COLUMN IF NOT EXISTS subgenre VARCHAR(100);

COMMENT ON COLUMN albums.genre IS 'Primary music genre for the album';
COMMENT ON COLUMN albums.subgenre IS 'Subgenre for the album';

CREATE INDEX IF NOT EXISTS albums_genre_idx ON albums(genre);
CREATE INDEX IF NOT EXISTS albums_subgenre_idx ON albums(subgenre);
