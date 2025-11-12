-- Supabase Project: kvjcidxbyimoswntpjcp
-- Click to open in SQL editor: https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp/sql/new
--
-- Pod Campaign Integration Migration
-- Connects campaigns to pods and adds webhook tracking

-- 1. Add pod association to campaigns
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS pod_id UUID REFERENCES pods(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS last_post_url TEXT,
ADD COLUMN IF NOT EXISTS last_post_at TIMESTAMP WITH TIME ZONE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_pod_id ON campaigns(pod_id);

-- Add comment
COMMENT ON COLUMN campaigns.pod_id IS 'Associated pod for post amplification';
COMMENT ON COLUMN campaigns.last_post_url IS 'LinkedIn URL of most recent published post';
COMMENT ON COLUMN campaigns.last_post_at IS 'Timestamp when last post was published';

-- 2. Create unipile_webhook_logs table for audit trail
-- (Renamed from webhook_logs to avoid collision with ESP webhook tracking table)
CREATE TABLE IF NOT EXISTS unipile_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  activity_id UUID REFERENCES pod_activities(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_unipile_webhook_logs_event ON unipile_webhook_logs(event);
CREATE INDEX IF NOT EXISTS idx_unipile_webhook_logs_campaign_id ON unipile_webhook_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_unipile_webhook_logs_created_at ON unipile_webhook_logs(created_at DESC);

-- Enable RLS
ALTER TABLE unipile_webhook_logs ENABLE ROW LEVEL SECURITY;

-- RLS: Only service role can access webhook logs (admin/debugging only)
CREATE POLICY "Service role can manage unipile webhook logs"
  ON unipile_webhook_logs
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- 3. Create triggered_comments table for lead magnet automation
CREATE TABLE IF NOT EXISTS triggered_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  commenter_profile JSONB,
  trigger_detected BOOLEAN DEFAULT false,
  processed BOOLEAN DEFAULT false,
  dm_sent BOOLEAN DEFAULT false,
  dm_sent_at TIMESTAMP WITH TIME ZONE,
  lead_magnet_id UUID,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_triggered_comments_post_id ON triggered_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_triggered_comments_processed ON triggered_comments(processed);
CREATE INDEX IF NOT EXISTS idx_triggered_comments_created_at ON triggered_comments(created_at DESC);

-- Enable RLS
ALTER TABLE triggered_comments ENABLE ROW LEVEL SECURITY;

-- RLS: Service role and authenticated users can read/write
CREATE POLICY "Service role can manage triggered comments"
  ON triggered_comments
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Authenticated users can view triggered comments"
  ON triggered_comments
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- 4. Update pod_activities table if needed (add missing columns)
ALTER TABLE pod_activities
ADD COLUMN IF NOT EXISTS post_content TEXT,
ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS deadline TIMESTAMP WITH TIME ZONE;

-- Add comment
COMMENT ON COLUMN pod_activities.urgency IS 'Priority level: urgent, normal, low';
COMMENT ON COLUMN pod_activities.deadline IS 'When pod members should complete engagement';

-- 5. Grant permissions
GRANT SELECT ON unipile_webhook_logs TO authenticated;
GRANT ALL ON unipile_webhook_logs TO service_role;

GRANT SELECT ON triggered_comments TO authenticated;
GRANT ALL ON triggered_comments TO service_role;

-- 6. Verification queries (comment out when not needed)

-- Check campaigns with pods
-- SELECT
--   c.id,
--   c.name,
--   c.status,
--   c.pod_id,
--   p.name as pod_name,
--   c.last_post_url,
--   c.last_post_at
-- FROM campaigns c
-- LEFT JOIN pods p ON p.id = c.pod_id
-- ORDER BY c.created_at DESC
-- LIMIT 10;

-- Check unipile webhook logs
-- SELECT
--   id,
--   event,
--   processed,
--   campaign_id,
--   activity_id,
--   created_at
-- FROM unipile_webhook_logs
-- ORDER BY created_at DESC
-- LIMIT 20;

-- Check triggered comments
-- SELECT
--   id,
--   post_id,
--   comment_text,
--   trigger_detected,
--   processed,
--   created_at
-- FROM triggered_comments
-- ORDER BY created_at DESC
-- LIMIT 20;
