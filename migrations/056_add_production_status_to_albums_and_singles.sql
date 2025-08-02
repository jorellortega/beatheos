-- Add production_status column to albums and singles tables
ALTER TABLE albums ADD COLUMN IF NOT EXISTS production_status VARCHAR(50) DEFAULT 'production';
ALTER TABLE singles ADD COLUMN IF NOT EXISTS production_status VARCHAR(50) DEFAULT 'production'; 