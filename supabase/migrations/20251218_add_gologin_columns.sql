-- Migration: Add GoLogin support for pod repost feature
-- Date: 2024-12-18
-- Purpose: Enable LinkedIn repost automation via GoLogin browser profiles
--
-- Architecture:
-- - Unipile handles likes/comments (API-based)
-- - GoLogin handles reposts (browser automation)
-- - Each user can optionally enable reposts by authenticating via GoLogin

-- Add GoLogin profile ID and status to linkedin_accounts
ALTER TABLE linkedin_accounts
ADD COLUMN IF NOT EXISTS gologin_profile_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS gologin_status TEXT DEFAULT 'none'
  CHECK (gologin_status IN ('none', 'pending_auth', 'active', 'expired'));

-- Index for lookups by GoLogin profile ID
CREATE INDEX IF NOT EXISTS idx_linkedin_accounts_gologin_profile
ON linkedin_accounts(gologin_profile_id)
WHERE gologin_profile_id IS NOT NULL;

-- Add repost_enabled toggle to pod_members
-- Users can opt-out of automatic reposting via iOS toggle
ALTER TABLE pod_members
ADD COLUMN IF NOT EXISTS repost_enabled BOOLEAN DEFAULT true;

-- Index for filtering members with repost enabled
CREATE INDEX IF NOT EXISTS idx_pod_members_repost_enabled
ON pod_members(pod_id, repost_enabled)
WHERE repost_enabled = true;

-- Comments for documentation
COMMENT ON COLUMN linkedin_accounts.gologin_profile_id IS
'GoLogin browser profile ID for repost automation. Created when user enables repost feature.';

COMMENT ON COLUMN linkedin_accounts.gologin_status IS
'GoLogin session status: none (not set up), pending_auth (awaiting user login), active (ready for automation), expired (needs re-auth)';

COMMENT ON COLUMN pod_members.repost_enabled IS
'Whether this member participates in automatic reposts. Controlled by iOS toggle. Default true.';
