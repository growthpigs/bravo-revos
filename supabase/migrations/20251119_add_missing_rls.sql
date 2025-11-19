-- Migration: Add Row Level Security to pods, posts, linkedin_accounts
-- Date: 2025-11-19

-- Supabase Project: kvjcidxbyimoswntpjcp
-- Click: https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp/sql/new

-- ============================================================
-- PODS TABLE - Users see pods they're members of
-- ============================================================

ALTER TABLE pods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see pods they're members of"
ON pods FOR SELECT
USING (
  id IN (
    SELECT pod_id FROM pod_memberships
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Service role full access pods"
ON pods FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- POSTS TABLE - Deferred (campaigns table needs user_id first)
-- RLS will be added after campaigns migration
-- ============================================================
-- NOTE: Posts RLS deferred until campaigns table has user_id
-- For now, service role only access is enforced in application code

-- ============================================================
-- LINKEDIN_ACCOUNTS TABLE - Users see their own accounts
-- ============================================================

ALTER TABLE linkedin_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own linkedin accounts"
ON linkedin_accounts FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own linkedin accounts"
ON linkedin_accounts FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own linkedin accounts"
ON linkedin_accounts FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own linkedin accounts"
ON linkedin_accounts FOR DELETE
USING (user_id = auth.uid());

CREATE POLICY "Service role full access linkedin_accounts"
ON linkedin_accounts FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- INDEXES for performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_pods_id ON pods(id);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_accounts_user_id ON linkedin_accounts(user_id);
