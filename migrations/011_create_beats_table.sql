CREATE TABLE IF NOT EXISTS beats (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    producer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    genre VARCHAR(100),
    bpm INTEGER,
    key VARCHAR(10),
    price DECIMAL(10,2),
    mp3_url VARCHAR(255) NOT NULL,
    wav_url VARCHAR(255),
    stems_url VARCHAR(255),
    cover_art_url VARCHAR(255),
    tags TEXT[],
    licensing JSONB,
    is_draft BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
); 