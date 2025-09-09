# 🎵 Lyrics AI - Simple Setup Guide

## ✅ **What's Been Fixed**

I've successfully modified the lyrics AI implementation to work with your existing database structure instead of creating new tables. The system now uses your existing `sessions` table with additional columns for lyrics AI functionality.

## 🚀 **Quick Setup (2 Steps)**

### **Step 1: Run Database Migration**

Go to your **Supabase Dashboard** → **SQL Editor** and run this migration:

```sql
-- Simple Lyrics AI Migration - Uses existing tables
-- Created: 2024-12-20

-- Add lyrics AI specific columns to existing sessions table
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS lyrics_title VARCHAR(255),
ADD COLUMN IF NOT EXISTS lyrics_content_type VARCHAR(50) DEFAULT 'lyrics' CHECK (lyrics_content_type IN ('script', 'lyrics', 'poetry', 'prose')),
ADD COLUMN IF NOT EXISTS lyrics_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS lyrics_version_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS lyrics_is_latest_version BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS lyrics_parent_id UUID,
ADD COLUMN IF NOT EXISTS lyrics_genre VARCHAR(100),
ADD COLUMN IF NOT EXISTS lyrics_mood VARCHAR(100),
ADD COLUMN IF NOT EXISTS lyrics_language VARCHAR(50) DEFAULT 'English',
ADD COLUMN IF NOT EXISTS lyrics_tags TEXT[],
ADD COLUMN IF NOT EXISTS lyrics_description TEXT,
ADD COLUMN IF NOT EXISTS lyrics_locked_sections JSONB,
ADD COLUMN IF NOT EXISTS lyrics_ai_prompt TEXT,
ADD COLUMN IF NOT EXISTS lyrics_ai_model VARCHAR(100),
ADD COLUMN IF NOT EXISTS lyrics_ai_generation_settings JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS lyrics_ai_metadata JSONB DEFAULT '{}';

-- Create a simple user_api_keys table for AI services
CREATE TABLE IF NOT EXISTS user_api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  openai_api_key TEXT,
  anthropic_api_key TEXT,
  elevenlabs_api_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_lyrics_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_lyrics_content_type ON sessions(lyrics_content_type);
CREATE INDEX IF NOT EXISTS idx_sessions_lyrics_latest_versions ON sessions(user_id, lyrics_is_latest_version);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);

-- Enable RLS (Row Level Security)
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own api_keys" ON user_api_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own api_keys" ON user_api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own api_keys" ON user_api_keys
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own api_keys" ON user_api_keys
  FOR DELETE USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at timestamp
CREATE TRIGGER update_user_api_keys_updated_at
  BEFORE UPDATE ON user_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_user_api_keys_updated_at();
```

### **Step 2: Test the Feature**

1. Navigate to `/lyrics-ai` in your application
2. Create a new lyrics session
3. Test the AI text generation and text-to-speech features

## 🎯 **What Changed**

### **Database Structure**
- ✅ **Uses existing `sessions` table** instead of creating new tables
- ✅ **Adds lyrics AI columns** to your existing sessions table
- ✅ **Creates `user_api_keys` table** for storing AI service API keys
- ✅ **Maintains all existing functionality** of your sessions table

### **API Endpoints**
- ✅ **Updated to use `SimpleLyricsService`** instead of separate services
- ✅ **Works with existing authentication** system
- ✅ **Maintains all CRUD operations** for lyrics content

### **Frontend**
- ✅ **Updated to use new data structure** (sessions with lyrics columns)
- ✅ **Maintains all UI functionality** (AI editing, text-to-speech, etc.)
- ✅ **Works with existing authentication** context

## 🎨 **Features Available**

### **Content Management**
- ✅ Create lyrics, scripts, poetry, and prose
- ✅ Edit content with inline editing
- ✅ Search and filter content
- ✅ Version control and history

### **AI Integration**
- ✅ **OpenAI GPT-4** text generation
- ✅ **Anthropic Claude** text generation
- ✅ **Context-aware generation** with locked sections
- ✅ **Custom prompts** and quick suggestions

### **Text-to-Speech**
- ✅ **ElevenLabs integration** for voice synthesis
- ✅ **Multiple voice options** with preview
- ✅ **Audio playback** and download

### **File Import**
- ✅ **PDF, DOCX, TXT** file support
- ✅ **Drag & drop** functionality
- ✅ **Automatic content type detection**

## 🔧 **How It Works**

### **Data Storage**
- Each lyrics session is stored as a row in your existing `sessions` table
- The `lyrics` column stores the actual content
- Additional `lyrics_*` columns store metadata (title, genre, mood, etc.)
- AI generation settings and locked sections are stored as JSONB

### **API Structure**
```
/api/lyrics-ai/
├── lyrics/           # Main lyrics sessions (uses sessions table)
├── assets/           # Same as lyrics (for compatibility)
├── generate-text/    # AI text generation
├── text-to-speech/   # Speech synthesis
└── get-voices/       # Voice management
```

### **Authentication**
- Uses your existing Supabase authentication
- Row Level Security (RLS) ensures users only see their own content
- API keys are stored securely per user

## 🚀 **Ready to Use!**

After running the migration, your lyrics AI system will be fully functional:

1. **Navigate to `/lyrics-ai`** to access the interface
2. **Create new content** using the "New [type]" buttons
3. **Import files** using the Import button
4. **Use AI features** by clicking "AI Edit" on any content
5. **Generate speech** using the "TTS" button

The system integrates seamlessly with your existing Beatheos platform and uses your current database structure! 🎵✨
