-- Fix RLS SELECT policy for clients to use agency-based architecture
-- Old policy: Users can only see clients where clients.id = their client_id
-- New policy: Users can see ALL clients in their agency

-- Drop the old user-centric policy
DROP POLICY IF EXISTS "Users can view their client" ON clients;

-- Create new agency-based SELECT policy
CREATE POLICY "Users can view clients in their agency"
  ON clients
  FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id
      FROM users
      WHERE id = auth.uid()
    )
  );
