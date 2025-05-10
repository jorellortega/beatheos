CREATE TABLE IF NOT EXISTS products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL, -- e.g. 'beat', 'soundkit', 'loop'
    price NUMERIC(10,2) NOT NULL,
    rating NUMERIC(2,1) DEFAULT 0,
    sales INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
); 