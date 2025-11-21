-- Supabase Project: trdoainmejxanrownbuz
-- Click: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new

-- Extend pod_activities for comment→DM flow
ALTER TABLE pod_activities ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id);
ALTER TABLE pod_activities ADD COLUMN IF NOT EXISTS unipile_account_id TEXT;
ALTER TABLE pod_activities ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE pod_activities ADD COLUMN IF NOT EXISTS linkedin_profile_id TEXT;
ALTER TABLE pod_activities ADD COLUMN IF NOT EXISTS email TEXT;

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_pod_activities_campaign ON pod_activities(campaign_id);
CREATE INDEX IF NOT EXISTS idx_pod_activities_unipile_account ON pod_activities(unipile_account_id);
CREATE INDEX IF NOT EXISTS idx_pod_activities_linkedin_profile ON pod_activities(linkedin_profile_id);
CREATE INDEX IF NOT EXISTS idx_pod_activities_action_status ON pod_activities(action, status);

-- Add secret to webhook_configs for HMAC signing
ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS secret TEXT;

COMMENT ON COLUMN pod_activities.campaign_id IS 'Campaign this activity belongs to (for comment→DM flow)';
COMMENT ON COLUMN pod_activities.unipile_account_id IS 'Unipile account used for this activity';
COMMENT ON COLUMN pod_activities.metadata IS 'Additional activity data (comment_id, trigger_word, etc)';
COMMENT ON COLUMN pod_activities.linkedin_profile_id IS 'LinkedIn profile ID of the lead';
COMMENT ON COLUMN pod_activities.email IS 'Captured email from DM reply';
COMMENT ON COLUMN webhook_configs.secret IS 'Secret key for HMAC webhook signing';
