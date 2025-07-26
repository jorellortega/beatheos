-- Add external storage support to audio_library_items table
-- This allows tracking files that are copied to external storage services

-- Add external_storage column to store JSON data about external storage
ALTER TABLE audio_library_items 
ADD COLUMN external_storage JSONB;

-- Add index for querying external storage files
CREATE INDEX idx_audio_library_items_external_storage 
ON audio_library_items USING GIN (external_storage);

-- Add link_type column to audio_file_links table to distinguish between conversion and copy links
ALTER TABLE audio_file_links 
ADD COLUMN link_type VARCHAR(50) DEFAULT 'conversion';

-- Add index for link_type
CREATE INDEX idx_audio_file_links_link_type 
ON audio_file_links (link_type);

-- Add comment to explain the external_storage JSON structure
COMMENT ON COLUMN audio_library_items.external_storage IS 'JSON object containing external storage information: {"provider": "aws-s3", "bucket": "my-bucket", "folder": "wav-files/"}';

-- Add comment to explain link_type values
COMMENT ON COLUMN audio_file_links.link_type IS 'Type of link: "conversion" for format conversion, "external_copy" for external storage copy'; 