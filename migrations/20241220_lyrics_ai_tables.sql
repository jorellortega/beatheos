-- Migration for Lyrics AI Tables
-- Created: 2024-12-20

-- Lyrics Assets Table
CREATE TABLE IF NOT EXISTS lyrics_assets (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('script', 'lyrics', 'poetry', 'prose')),
  content TEXT,
  content_url VARCHAR(500),
  version INT DEFAULT 1,
  version_name VARCHAR(255),
  is_latest_version BOOLEAN DEFAULT true,
  parent_asset_id VARCHAR(255),
  prompt TEXT,
  model VARCHAR(100),
  generation_settings TEXT, -- JSON
  metadata TEXT, -- JSON
  locked_sections TEXT, -- JSON for text locking
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_lyrics_assets_user_content_type (user_id, content_type),
  INDEX idx_lyrics_assets_latest_versions (user_id, is_latest_version),
  INDEX idx_lyrics_assets_parent (parent_asset_id)
);

-- Lyrics Table (Specialized for Lyrics)
CREATE TABLE IF NOT EXISTS lyrics (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  movie_id VARCHAR(255),
  scene_id VARCHAR(255),
  version INT DEFAULT 1,
  version_name VARCHAR(255),
  is_latest_version BOOLEAN DEFAULT true,
  parent_lyrics_id VARCHAR(255),
  genre VARCHAR(100),
  mood VARCHAR(100),
  language VARCHAR(50) DEFAULT 'English',
  tags TEXT, -- JSON array
  description TEXT,
  locked_sections TEXT, -- JSON for text locking
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_lyrics_user_id (user_id),
  INDEX idx_lyrics_latest_versions (user_id, is_latest_version),
  INDEX idx_lyrics_parent (parent_lyrics_id),
  INDEX idx_lyrics_genre (genre),
  INDEX idx_lyrics_mood (mood)
);

-- User API Keys for AI Services
CREATE TABLE IF NOT EXISTS user_api_keys (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL UNIQUE,
  openai_api_key TEXT,
  anthropic_api_key TEXT,
  elevenlabs_api_key TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_user_api_keys_user_id (user_id)
);

-- Add foreign key constraints if they don't exist
-- Note: These might need to be adjusted based on your existing user table structure

-- Add triggers for updated_at timestamps
DELIMITER $$

CREATE TRIGGER IF NOT EXISTS lyrics_assets_updated_at
  BEFORE UPDATE ON lyrics_assets
  FOR EACH ROW
BEGIN
  SET NEW.updated_at = CURRENT_TIMESTAMP;
END$$

CREATE TRIGGER IF NOT EXISTS lyrics_updated_at
  BEFORE UPDATE ON lyrics
  FOR EACH ROW
BEGIN
  SET NEW.updated_at = CURRENT_TIMESTAMP;
END$$

CREATE TRIGGER IF NOT EXISTS user_api_keys_updated_at
  BEFORE UPDATE ON user_api_keys
  FOR EACH ROW
BEGIN
  SET NEW.updated_at = CURRENT_TIMESTAMP;
END$$

DELIMITER ;

-- Insert sample data (optional)
-- You can uncomment these if you want sample data for testing

/*
INSERT INTO lyrics_assets (id, user_id, title, content_type, content, version, is_latest_version) VALUES
('sample-asset-1', 'sample-user-1', 'Sample Song Lyrics', 'lyrics', 'Verse 1:\nThis is a sample lyric\n\nChorus:\nSing along with me', 1, true),
('sample-asset-2', 'sample-user-1', 'Sample Script', 'script', 'SCENE 1\n\nCHARACTER: Hello, world!\n\nNARRATOR: The story begins...', 1, true);

INSERT INTO lyrics (id, user_id, title, content, genre, mood, language, version, is_latest_version) VALUES
('sample-lyric-1', 'sample-user-1', 'My First Song', 'Verse 1:\nThis is my first song\nI hope you like it\n\nChorus:\nSing it loud and strong', 'Pop', 'Happy', 'English', 1, true);
*/

