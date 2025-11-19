-- Supabase Project: kvjcidxbyimoswntpjcp
-- Click: https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp/sql/new

-- Enable Row Level Security on posts table
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users see only their own posts
CREATE POLICY "Users see own posts"
ON posts FOR SELECT
USING (user_id = auth.uid());

-- RLS Policy: Users insert only their own posts
CREATE POLICY "Users insert own posts"
ON posts FOR INSERT
WITH CHECK (user_id = auth.uid());

-- RLS Policy: Users update only their own posts
CREATE POLICY "Users update own posts"
ON posts FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- RLS Policy: Users delete only their own posts
CREATE POLICY "Users delete own posts"
ON posts FOR DELETE
USING (user_id = auth.uid());

-- RLS Policy: Service role (backend) can access all
CREATE POLICY "Service role full access posts"
ON posts FOR ALL
USING (auth.role() = 'service_role');
