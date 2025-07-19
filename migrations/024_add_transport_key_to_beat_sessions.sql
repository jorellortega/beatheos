-- Add transport_key column to beat_sessions table
ALTER TABLE beat_sessions 
ADD COLUMN transport_key VARCHAR(10) DEFAULT 'C';

-- Update existing records to have a default transport key
UPDATE beat_sessions 
SET transport_key = 'C' 
WHERE transport_key IS NULL; 