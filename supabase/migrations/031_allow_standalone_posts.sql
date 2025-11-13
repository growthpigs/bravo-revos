-- Supabase Project: kvjcidxbyimoswntpjcp
-- Click to open in SQL editor: https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp/sql/new
--
-- Allow standalone posts (posts without campaign_id)
-- This enables users to create LinkedIn posts that aren't linked to a campaign

-- Add policy to allow users to create standalone posts
CREATE POLICY "Users can create standalone posts"
  ON posts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if campaign_id is NULL (standalone post)
    campaign_id IS NULL
    AND
    -- Must belong to user's client
    user_id = auth.uid()
  );

-- Add policy to allow users to view their standalone posts
CREATE POLICY "Users can view their standalone posts"
  ON posts
  FOR SELECT
  TO authenticated
  USING (
    -- Allow if campaign_id is NULL and belongs to user
    campaign_id IS NULL
    AND
    user_id = auth.uid()
  );

-- Add policy to allow users to update/delete their standalone posts
CREATE POLICY "Users can manage their standalone posts"
  ON posts
  FOR UPDATE
  TO authenticated
  USING (
    campaign_id IS NULL
    AND
    user_id = auth.uid()
  )
  WITH CHECK (
    campaign_id IS NULL
    AND
    user_id = auth.uid()
  );

CREATE POLICY "Users can delete their standalone posts"
  ON posts
  FOR DELETE
  TO authenticated
  USING (
    campaign_id IS NULL
    AND
    user_id = auth.uid()
  );
