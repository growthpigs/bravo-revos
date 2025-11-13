-- Supabase Project: kvjcidxbyimoswntpjcp
-- Click to open in SQL editor: https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp/sql/new
--
-- Fix Console Prompts RLS - Admin-Only Access
-- Restricts console prompt modifications to admins only

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Only authenticated users can manage console prompts" ON console_prompts;
DROP POLICY IF EXISTS "Only authenticated users can update console prompts" ON console_prompts;
DROP POLICY IF EXISTS "Only authenticated users can delete console prompts" ON console_prompts;

-- Create admin-only management policies
-- Admins can insert
CREATE POLICY "Only admins can create console prompts"
  ON console_prompts FOR INSERT
  WITH CHECK (
    (auth.jwt() ->> 'role')::text = 'admin'
    OR
    auth.uid() IN (
      SELECT id FROM auth.users
      WHERE raw_app_meta_data->>'role' = 'admin'
    )
  );

-- Admins can update
CREATE POLICY "Only admins can update console prompts"
  ON console_prompts FOR UPDATE
  USING (
    (auth.jwt() ->> 'role')::text = 'admin'
    OR
    auth.uid() IN (
      SELECT id FROM auth.users
      WHERE raw_app_meta_data->>'role' = 'admin'
    )
  );

-- Admins can delete
CREATE POLICY "Only admins can delete console prompts"
  ON console_prompts FOR DELETE
  USING (
    (auth.jwt() ->> 'role')::text = 'admin'
    OR
    auth.uid() IN (
      SELECT id FROM auth.users
      WHERE raw_app_meta_data->>'role' = 'admin'
    )
  );

-- SELECT policy remains: anyone can read active consoles
-- (already exists, don't need to modify)
