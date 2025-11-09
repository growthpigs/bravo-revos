-- Add INSERT policy for clients table
-- Allows authenticated users to create clients for agencies they belong to
CREATE POLICY "Users can create clients in their agency"
  ON clients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User's agency must match the client's agency
    agency_id IN (
      SELECT agency_id FROM users WHERE id = auth.uid()
    )
  );
