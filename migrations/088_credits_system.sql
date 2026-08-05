-- Credits system: balance on users, ledger, products, and action costs
-- 75% markup on cost: cover cost $0.25 → 25 credits charged per cover

-- Add credit balance to users (existing users get 0; new free accounts can get 50 in app/signup)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS credit_balance integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

-- Ledger: every add/deduct for auditing and display
CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount integer NOT NULL,  -- positive = add, negative = deduct
  balance_after integer NOT NULL,
  type text NOT NULL,  -- 'purchase' | 'ai_cover' | 'ai_lyrics' | 'ai_album_titles' | 'signup_bonus' | 'refund' | 'admin'
  reference_id text,   -- stripe payment id, cover id, etc.
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);

-- Credit packs for purchase (price with 75% markup)
CREATE TABLE IF NOT EXISTS credit_products (
  id text PRIMARY KEY,
  name text NOT NULL,
  credits integer NOT NULL,
  price_cents integer NOT NULL,
  stripe_price_id text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed packs: 100 credits ≈ $1.99, 500 ≈ $8.99, 1000 ≈ $16.99 (75% markup on cost basis)
INSERT INTO credit_products (id, name, credits, price_cents, sort_order) VALUES
  ('pack_100', '100 Credits', 100, 199, 1),
  ('pack_250', '250 Credits', 250, 449, 2),
  ('pack_500', '500 Credits', 500, 899, 3),
  ('pack_1000', '1000 Credits', 1000, 1699, 4)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  credits = EXCLUDED.credits,
  price_cents = EXCLUDED.price_cents,
  sort_order = EXCLUDED.sort_order;

-- Cost per action in credits (used by API to deduct)
-- ai_cover = 25 ($0.25 cost), ai_lyrics = 2 (~$0.02), ai_album_titles = 5 (~$0.05)
CREATE TABLE IF NOT EXISTS credit_actions (
  action_key text PRIMARY KEY,
  credits_cost integer NOT NULL,
  description text
);

INSERT INTO credit_actions (action_key, credits_cost, description) VALUES
  ('ai_cover', 25, 'Generate AI album cover'),
  ('ai_lyrics', 2, 'AI lyrics generation'),
  ('ai_album_titles', 5, 'AI album track titles')
ON CONFLICT (action_key) DO UPDATE SET
  credits_cost = EXCLUDED.credits_cost,
  description = EXCLUDED.description;

-- RLS: users see only their own transactions (insert/update via API with service role)
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own credit_transactions" ON credit_transactions;
CREATE POLICY "Users can view own credit_transactions" ON credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- credit_products: public read
ALTER TABLE credit_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read credit_products" ON credit_products;
CREATE POLICY "Anyone can read credit_products" ON credit_products
  FOR SELECT USING (true);
