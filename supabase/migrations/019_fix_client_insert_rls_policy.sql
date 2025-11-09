-- Drop the previous policy that might have issues
DROP POLICY IF EXISTS "Users can create clients in their agency" ON clients;

-- Create a simpler INSERT policy without subquery
-- Allow service_role to always insert (needed for API operations)
CREATE POLICY "Service role can manage clients"
  ON clients
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to create clients (will be restricted by application logic)
CREATE POLICY "Authenticated users can create clients"
  ON clients
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
