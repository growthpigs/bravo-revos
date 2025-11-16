-- Supabase Project: trdoainmejxanrownbuz
-- Click: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new

-- ============================================================================
-- POD MEMBERS ONBOARDING FIX - Database Schema Update
-- ============================================================================
-- This migration fixes the pod_members table to support self-service onboarding.
--
-- Problem: unipile_account_id NOT NULL blocks creating members before Unipile connection
-- Solution: Make nullable + add onboarding status tracking + invite token system
-- ============================================================================

-- 1. Make unipile_account_id nullable (allow creation before connection)
ALTER TABLE pod_members
ALTER COLUMN unipile_account_id DROP NOT NULL;

-- 2. Add onboarding status field with state machine
ALTER TABLE pod_members
ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'invited'
CHECK (onboarding_status IN ('invited', 'password_set', 'unipile_connected', 'active'));

-- 3. Add invite token system for secure onboarding URLs
ALTER TABLE pod_members
ADD COLUMN IF NOT EXISTS invite_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS invite_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS invite_accepted_at TIMESTAMPTZ;

-- 4. Add constraint: can't be active without Unipile connection
ALTER TABLE pod_members
ADD CONSTRAINT check_active_has_unipile
CHECK (
  onboarding_status != 'active' OR
  unipile_account_id IS NOT NULL
);

-- 5. Add helpful comments
COMMENT ON COLUMN pod_members.onboarding_status IS
'Onboarding flow: invited → password_set → unipile_connected → active';

COMMENT ON COLUMN pod_members.invite_token IS
'Unique token for invite URL. Single-use, expires after acceptance.';

COMMENT ON COLUMN pod_members.unipile_account_id IS
'Unipile account ID (NULL until member connects during onboarding)';

-- 6. Create index for invite token lookups (fast invite URL validation)
CREATE INDEX IF NOT EXISTS idx_pod_members_invite_token ON pod_members(invite_token)
WHERE invite_token IS NOT NULL;

-- 7. Create index for onboarding status queries (fast filtering by status)
CREATE INDEX IF NOT EXISTS idx_pod_members_onboarding_status ON pod_members(onboarding_status, is_active);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Schema now supports:
-- - Admin creates pod_member without Unipile (unipile_account_id = NULL)
-- - Invite token for secure onboarding links
-- - Onboarding state tracking (invited → password_set → unipile_connected → active)
-- - Database constraint prevents activation without Unipile
-- ============================================================================
