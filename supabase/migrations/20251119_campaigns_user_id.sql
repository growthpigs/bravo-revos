-- Supabase Project: kvjcidxbyimoswntpjcp
-- Click: https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp/sql/new

-- Add user_id to campaigns table
ALTER TABLE campaigns
ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Populate user_id from client_id
UPDATE campaigns c
SET user_id = (
  SELECT u.id FROM users u
  WHERE u.client_id = c.client_id
  LIMIT 1
)
WHERE user_id IS NULL AND client_id IS NOT NULL;

-- Make client_id optional (not required for new campaigns)
ALTER TABLE campaigns
ALTER COLUMN client_id DROP NOT NULL;

-- Add index for performance
CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);

-- Enable Row Level Security
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users see only their own campaigns
CREATE POLICY "Users see own campaigns"
ON campaigns FOR SELECT
USING (user_id = auth.uid());

-- RLS Policy: Users insert only their own campaigns
CREATE POLICY "Users insert own campaigns"
ON campaigns FOR INSERT
WITH CHECK (user_id = auth.uid());

-- RLS Policy: Users update only their own campaigns
CREATE POLICY "Users update own campaigns"
ON campaigns FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- RLS Policy: Users delete only their own campaigns
CREATE POLICY "Users delete own campaigns"
ON campaigns FOR DELETE
USING (user_id = auth.uid());

-- RLS Policy: Service role (backend) can access all
CREATE POLICY "Service role full access campaigns"
ON campaigns FOR ALL
USING (auth.role() = 'service_role');
