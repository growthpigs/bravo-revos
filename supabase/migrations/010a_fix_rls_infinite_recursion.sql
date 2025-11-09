-- Fix infinite recursion in RLS policies
-- Issue: Nested SELECT on users table within users table RLS check
-- Solution: Use client_id directly from users table without nested users query

-- ============================================================================
-- FIX LINKEDIN ACCOUNTS RLS POLICY - Remove nested users table reference
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their linkedin accounts" ON linkedin_accounts;

-- FIXED: Use auth.uid() directly with user's own record join
-- This avoids the circular subquery on the users table
CREATE POLICY "Users can view their linkedin accounts"
  ON linkedin_accounts
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    user_id IN (
      -- Get other users in same client
      SELECT u.id FROM users u
      WHERE u.client_id = (
        -- Get current user's client_id directly
        SELECT client_id FROM users WHERE id = auth.uid() LIMIT 1
      )
      AND u.client_id IS NOT NULL
    )
  );

-- ============================================================================
-- FIX CAMPAIGNS RLS POLICY - Remove nested users table reference if it exists
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their campaigns" ON campaigns;

CREATE POLICY "Users can view their campaigns"
  ON campaigns
  FOR SELECT
  TO authenticated
  USING (
    client_id = (
      SELECT client_id FROM users WHERE id = auth.uid() LIMIT 1
    )
  );

-- ============================================================================
-- FIX LEAD MAGNETS RLS POLICY - Remove nested users table reference if it exists
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their lead magnets" ON lead_magnets;

CREATE POLICY "Users can view their lead magnets"
  ON lead_magnets
  FOR SELECT
  TO authenticated
  USING (
    client_id = (
      SELECT client_id FROM users WHERE id = auth.uid() LIMIT 1
    )
  );

-- ============================================================================
-- FIX PODS RLS POLICY - Remove nested users table reference if it exists
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their pods" ON pods;

CREATE POLICY "Users can view their pods"
  ON pods
  FOR SELECT
  TO authenticated
  USING (
    client_id = (
      SELECT client_id FROM users WHERE id = auth.uid() LIMIT 1
    )
  );

-- ============================================================================
-- FIX LEADS RLS POLICY - Remove nested users table reference if it exists
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their leads" ON leads;

CREATE POLICY "Users can view their leads"
  ON leads
  FOR SELECT
  TO authenticated
  USING (
    client_id = (
      SELECT client_id FROM users WHERE id = auth.uid() LIMIT 1
    )
  );
