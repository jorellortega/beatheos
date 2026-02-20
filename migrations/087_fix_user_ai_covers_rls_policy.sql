-- Fix user_ai_covers table: add missing name column and fix RLS policy
-- The table was created without the name column, and the RLS policy needs WITH CHECK clause for UPDATE

-- Add the name column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_ai_covers' 
    AND column_name = 'name'
  ) THEN
    ALTER TABLE user_ai_covers ADD COLUMN name VARCHAR(255);
  END IF;
END $$;

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can manage their own AI covers" ON user_ai_covers;

-- Recreate the policy with both USING and WITH CHECK clauses
-- UPDATE operations require both USING and WITH CHECK clauses
CREATE POLICY "Users can manage their own AI covers" ON user_ai_covers
  FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

