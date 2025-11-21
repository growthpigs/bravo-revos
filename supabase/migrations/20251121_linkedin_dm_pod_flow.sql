-- Supabase Project: trdoainmejxanrownbuz
-- Click: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new

-- LinkedIn DM Pod Comment→Email Flow
-- Complete schema for: comment monitoring → DM sending → email extraction

-- 1. Extend pod_activities for DM flow
ALTER TABLE pod_activities ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id);
ALTER TABLE pod_activities ADD COLUMN IF NOT EXISTS unipile_account_id TEXT;
ALTER TABLE pod_activities ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE pod_activities ADD COLUMN IF NOT EXISTS linkedin_profile_id TEXT;
ALTER TABLE pod_activities ADD COLUMN IF NOT EXISTS email TEXT;

-- Make legacy pod-repost columns nullable for new DM flow
ALTER TABLE pod_activities ALTER COLUMN post_id DROP NOT NULL;
ALTER TABLE pod_activities ALTER COLUMN pod_member_id DROP NOT NULL;
ALTER TABLE pod_activities ALTER COLUMN scheduled_for DROP NOT NULL;
ALTER TABLE pod_activities ALTER COLUMN attempt_number DROP NOT NULL;
ALTER TABLE pod_activities ALTER COLUMN max_attempts DROP NOT NULL;
ALTER TABLE pod_activities ALTER COLUMN activity_type DROP NOT NULL;

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_pod_activities_campaign ON pod_activities(campaign_id);
CREATE INDEX IF NOT EXISTS idx_pod_activities_unipile_account ON pod_activities(unipile_account_id);
CREATE INDEX IF NOT EXISTS idx_pod_activities_linkedin_profile ON pod_activities(linkedin_profile_id);
CREATE INDEX IF NOT EXISTS idx_pod_activities_action_status ON pod_activities(action, status);

-- 2. Add secret to webhook_configs for HMAC signing
ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS secret TEXT;

-- 3. Create processed_comments table
CREATE TABLE IF NOT EXISTS processed_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  comment_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  commenter_linkedin_id TEXT NOT NULL,
  dm_queued BOOLEAN DEFAULT FALSE,
  trigger_word TEXT,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, comment_id)
);

CREATE INDEX IF NOT EXISTS idx_processed_comments_campaign ON processed_comments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_processed_comments_comment ON processed_comments(comment_id);

-- 4. Create processed_messages table for reply monitor
CREATE TABLE IF NOT EXISTS processed_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT NOT NULL UNIQUE,
  lead_id UUID REFERENCES pod_activities(id),
  email_extracted TEXT,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processed_messages_message_id ON processed_messages(message_id);
CREATE INDEX IF NOT EXISTS idx_processed_messages_lead_id ON processed_messages(lead_id);

-- Comments
COMMENT ON COLUMN pod_activities.campaign_id IS 'Campaign this activity belongs to (for comment→DM flow)';
COMMENT ON COLUMN pod_activities.unipile_account_id IS 'Unipile account used for this activity';
COMMENT ON COLUMN pod_activities.metadata IS 'Additional activity data (comment_id, trigger_word, etc)';
COMMENT ON COLUMN pod_activities.linkedin_profile_id IS 'LinkedIn profile ID of the lead';
COMMENT ON COLUMN pod_activities.email IS 'Captured email from DM reply';
COMMENT ON COLUMN webhook_configs.secret IS 'Secret key for HMAC webhook signing';
COMMENT ON TABLE processed_comments IS 'Tracks LinkedIn comments processed by comment monitor';
COMMENT ON TABLE processed_messages IS 'Tracks DM messages processed by reply monitor';
