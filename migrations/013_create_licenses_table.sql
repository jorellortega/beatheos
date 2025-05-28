CREATE TABLE IF NOT EXISTS licenses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    terms TEXT,
    is_exclusive BOOLEAN DEFAULT false,
    is_buyout BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Insert default license types
INSERT INTO licenses (name, description, terms, is_exclusive, is_buyout) VALUES
    ('Lease License', 'Non-exclusive license for limited commercial use', 'Standard lease terms for limited commercial use', false, false),
    ('Premium Lease License', 'Non-exclusive license for broader commercial use', 'Premium lease terms for broader commercial use', false, false),
    ('Exclusive License', 'Exclusive rights—once purchased, the beat is removed from the marketplace', 'Exclusive license terms with full rights', true, false),
    ('Buy Out License', 'Full ownership transfer—buyer gains complete ownership, including resale rights', 'Full ownership transfer terms', true, true);

-- Add license_id column to beats table
ALTER TABLE beats ADD COLUMN license_id uuid REFERENCES licenses(id);

-- Add license_id column to beat_purchases table
ALTER TABLE beat_purchases ADD COLUMN license_id uuid REFERENCES licenses(id); 