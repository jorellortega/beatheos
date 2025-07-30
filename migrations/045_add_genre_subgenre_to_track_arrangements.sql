-- Add genre, subgenre, and audio_type columns to track_arrangements table
ALTER TABLE track_arrangements 
ADD COLUMN genre VARCHAR(100) NULL COMMENT 'e.g., Hip Hop, Trap, R&B',
ADD COLUMN subgenre VARCHAR(100) NULL COMMENT 'e.g., Boom Bap, Drill, Neo Soul',
ADD COLUMN audio_type VARCHAR(100) NULL COMMENT 'e.g., Melody Loop, Drum Loop, Kick, Snare';

-- Add indexes for better search performance
CREATE INDEX idx_track_arrangements_genre ON track_arrangements(genre);
CREATE INDEX idx_track_arrangements_subgenre ON track_arrangements(subgenre);
CREATE INDEX idx_track_arrangements_audio_type ON track_arrangements(audio_type);
CREATE INDEX idx_track_arrangements_genre_subgenre ON track_arrangements(genre, subgenre); 