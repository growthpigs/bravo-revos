-- ============================================================================
-- FIX: LinkedIn Accounts RLS Policy for Service Role Bypass
-- ============================================================================
-- Problem: RLS policy requires user_id = auth.uid(), but service role
-- has auth.uid() = NULL, blocking inserts via service role
-- Solution: Add service_role bypass policy that allows all operations
-- ============================================================================

-- Drop the old policy that blocks service role
DROP POLICY IF EXISTS "Users can manage their linkedin accounts" ON linkedin_accounts;

-- Create new policy for authenticated users
CREATE POLICY "Users can manage their linkedin accounts"
  ON linkedin_accounts
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
  );

-- Create service role bypass policy
CREATE POLICY "Service role can manage all linkedin accounts"
  ON linkedin_accounts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
