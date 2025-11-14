# Apply Pod Campaign Integration Migration

## Quick Link
**🔗 [Open Supabase SQL Editor](https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new)**

## Migration SQL

Copy and paste this entire SQL block into the Supabase SQL Editor and click "Run":

```sql
-- Pod Campaign Integration Migration
-- Connects campaigns to pods and adds webhook tracking

-- 1. Add pod association to campaigns
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS pod_id UUID REFERENCES pods(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS last_post_url TEXT,
ADD COLUMN IF NOT EXISTS last_post_at TIMESTAMP WITH TIME ZONE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_pod_id ON campaigns(pod_id);

-- Add comments
COMMENT ON COLUMN campaigns.pod_id IS 'Associated pod for post amplification';
COMMENT ON COLUMN campaigns.last_post_url IS 'LinkedIn URL of most recent published post';
COMMENT ON COLUMN campaigns.last_post_at IS 'Timestamp when last post was published';

-- 2. Create webhook_logs table for audit trail
CREATE TABLE IF NOT EXISTS webhook_logs (
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
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event ON webhook_logs(event);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_campaign_id ON webhook_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at DESC);

-- Enable RLS
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- RLS: Only service role can access webhook logs (admin/debugging only)
CREATE POLICY "Service role can manage webhook logs"
  ON webhook_logs
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

-- Add comments
COMMENT ON COLUMN pod_activities.urgency IS 'Priority level: urgent, normal, low';
COMMENT ON COLUMN pod_activities.deadline IS 'When pod members should complete engagement';

-- 5. Grant permissions
GRANT SELECT ON webhook_logs TO authenticated;
GRANT ALL ON webhook_logs TO service_role;

GRANT SELECT ON triggered_comments TO authenticated;
GRANT ALL ON triggered_comments TO service_role;
```

## Verification Query

After running the migration, execute this to verify:

```sql
-- Check campaigns with pod columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'campaigns'
AND column_name IN ('pod_id', 'last_post_url', 'last_post_at');

-- Check new tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('webhook_logs', 'triggered_comments')
AND table_schema = 'public';

-- Check pod_activities columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'pod_activities'
AND column_name IN ('post_content', 'urgency', 'deadline');
```

## Expected Results

You should see:
- ✅ 3 new columns in `campaigns` table
- ✅ 2 new tables created: `webhook_logs`, `triggered_comments`
- ✅ 3 new columns in `pod_activities` table

## Next Step

After applying the migration, test the manual trigger button:
1. Navigate to: http://localhost:3000/dashboard/campaigns
2. Click any campaign
3. Look for "Trigger Pod Amplification" button
4. Click it and provide a LinkedIn post URL
