-- Add subgenre column to audio_library_items table
ALTER TABLE audio_library_items 
ADD COLUMN subgenre VARCHAR(100);

-- Create index for efficient subgenre filtering
CREATE INDEX audio_library_items_subgenre_idx ON audio_library_items(subgenre);

-- Create composite index for genre + subgenre filtering
CREATE INDEX audio_library_items_genre_subgenre_idx ON audio_library_items(genre, subgenre); 