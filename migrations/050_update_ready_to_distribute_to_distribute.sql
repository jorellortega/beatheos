-- Update ready_to_distribute to distribute in album_tracks and singles tables
-- This migration updates existing data to match the new constraint

-- Update album_tracks table
UPDATE album_tracks 
SET status = 'distribute' 
WHERE status = 'ready_to_distribute';

-- Update singles table  
UPDATE singles 
SET status = 'distribute' 
WHERE status = 'ready_to_distribute';

-- Verify the updates
SELECT 'album_tracks' as table_name, status, COUNT(*) as count 
FROM album_tracks 
GROUP BY status
UNION ALL
SELECT 'singles' as table_name, status, COUNT(*) as count 
FROM singles 
GROUP BY status; 