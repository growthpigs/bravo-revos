-- Supabase Project: kvjcidxbyimoswntpjcp
-- Click to open in SQL editor: https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp/sql/new
--
-- Admin Users Table
-- Simple dedicated table to track which users have admin privileges
-- This avoids JWT modifications and auth.users queries

CREATE TABLE admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  notes TEXT
);

-- Bootstrap: Seed first admin BEFORE enabling RLS (migration runs as postgres superuser)
-- This solves the chicken-and-egg problem: can't insert first admin if RLS blocks inserts
INSERT INTO admin_users (user_id, notes)
SELECT id, 'Bootstrap admin seeded during migration 035'
FROM auth.users
WHERE email = 'rodericandrews@icloud.com'
ON CONFLICT (user_id) DO NOTHING;

-- CRITICAL: Verify admin was created
DO $$
DECLARE
  admin_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO admin_count FROM admin_users;

  IF admin_count = 0 THEN
    RAISE EXCEPTION 'FATAL: Bootstrap admin not created. User rodericandrews@icloud.com must exist in auth.users before running this migration.';
  END IF;

  RAISE NOTICE 'Bootstrap admin verified: % admin(s) exist', admin_count;
END $$;

-- Enable RLS (only after verifying admin exists)
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Policy 1: Anyone can check if user is admin (read-only)
CREATE POLICY "Anyone can read admin_users for verification"
  ON admin_users FOR SELECT
  USING (true);

-- Policy 2: Only admins can insert new admins
CREATE POLICY "Only admins can add admin users"
  ON admin_users FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM admin_users)
  );

-- Policy 3: Only admins can update admin records
CREATE POLICY "Only admins can update admin_users"
  ON admin_users FOR UPDATE
  USING (
    auth.uid() IN (SELECT user_id FROM admin_users)
  );

-- Policy 4: Only admins can delete admins
CREATE POLICY "Only admins can delete admin_users"
  ON admin_users FOR DELETE
  USING (
    auth.uid() IN (SELECT user_id FROM admin_users)
  );

-- Index for fast lookups
CREATE INDEX idx_admin_users_user_id ON admin_users(user_id);
