CREATE TABLE IF NOT EXISTS beat_licenses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    beat_id uuid NOT NULL REFERENCES beats(id) ON DELETE CASCADE,
    license_id uuid NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    UNIQUE(beat_id, license_id)
); 