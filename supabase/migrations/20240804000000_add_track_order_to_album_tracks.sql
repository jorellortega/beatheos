-- Add track_order column to album_tracks table
ALTER TABLE album_tracks ADD COLUMN track_order INTEGER;

-- Update existing tracks to have sequential order based on creation time
UPDATE album_tracks 
SET track_order = subquery.row_num 
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY album_id ORDER BY created_at) as row_num
  FROM album_tracks
) subquery 
WHERE album_tracks.id = subquery.id;

-- Make track_order NOT NULL after populating existing data
ALTER TABLE album_tracks ALTER COLUMN track_order SET NOT NULL;

-- Add index for better performance when ordering
CREATE INDEX idx_album_tracks_track_order ON album_tracks(album_id, track_order); 