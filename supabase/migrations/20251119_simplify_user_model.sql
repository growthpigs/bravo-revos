-- Migration: Simplify user/client architecture
-- Objective: Remove agency/client hierarchy, move to user-centric pod memberships
-- Date: 2025-11-19

-- Supabase Project: kvjcidxbyimoswntpjcp
-- Click: https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp/sql/new

-- Step 1: Make client_id optional (for future multi-tenant, but not required)
ALTER TABLE users ALTER COLUMN client_id DROP NOT NULL;

-- Step 2: Create pod_memberships join table (user ↔ pod relationship)
CREATE TABLE IF NOT EXISTS pod_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pod_id UUID NOT NULL REFERENCES pods(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, pod_id)
);

-- Step 3: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_pod_memberships_user_id ON pod_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_pod_memberships_pod_id ON pod_memberships(pod_id);
CREATE INDEX IF NOT EXISTS idx_pod_memberships_active ON pod_memberships(is_active);

-- Step 4: Enable RLS on pod_memberships
ALTER TABLE pod_memberships ENABLE ROW LEVEL SECURITY;

-- Step 5: RLS Policies for pod_memberships

-- Policy 1: Users can see their own pod memberships
CREATE POLICY "Users see own pod memberships"
ON pod_memberships FOR SELECT
USING (user_id = auth.uid());

-- Policy 2: Users can update their own membership (if admin of that pod)
CREATE POLICY "Users can update own membership if pod admin"
ON pod_memberships FOR UPDATE
USING (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM pod_memberships pm
    WHERE pm.pod_id = pod_memberships.pod_id
    AND pm.user_id = auth.uid()
    AND pm.role = 'admin'
  )
);

-- Policy 3: Service role bypass for pod_memberships
CREATE POLICY "Service role full access pod_memberships"
ON pod_memberships FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Step 6: Migrate existing pod_members data to pod_memberships
-- This preserves historical pod membership relationships
INSERT INTO pod_memberships (user_id, pod_id, role, joined_at, is_active, created_at, updated_at)
SELECT
  pm.user_id,
  pm.pod_id,
  CASE WHEN pm.role = 'admin' THEN 'admin' ELSE 'member' END,
  COALESCE(pm.joined_at, NOW()),
  CASE WHEN pm.status = 'active' THEN true ELSE false END,
  COALESCE(pm.joined_at, NOW()),
  COALESCE(pm.joined_at, NOW())
FROM pod_members pm
WHERE pm.user_id IS NOT NULL
ON CONFLICT (user_id, pod_id) DO NOTHING;

-- Step 7: Add comment for clarity
COMMENT ON TABLE pod_memberships IS 'Join table: users ↔ pods. Replaces old pod_members system.';
COMMENT ON COLUMN pod_memberships.role IS 'Pod role: admin (can manage members) or member (can participate)';
COMMENT ON COLUMN pod_memberships.is_active IS 'Whether user is actively participating in pod';
