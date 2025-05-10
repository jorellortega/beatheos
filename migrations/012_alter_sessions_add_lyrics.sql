CREATE TABLE IF NOT EXISTS sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    last_modified TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
); ALTER TABLE sessions ADD COLUMN lyrics TEXT;
