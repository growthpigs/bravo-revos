-- Supabase Project: trdoainmejxanrownbuz
-- Click: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new
-- Description: Add columns for invitation email extraction and unique constraint

-- Add columns for storing invitation info from poll-invitations cron
ALTER TABLE pending_connections ADD COLUMN IF NOT EXISTS invitation_note TEXT;
ALTER TABLE pending_connections ADD COLUMN IF NOT EXISTS invitation_email TEXT;
ALTER TABLE pending_connections ADD COLUMN IF NOT EXISTS invitation_received_at TIMESTAMPTZ;

-- Add unique constraint on commenter_linkedin_id + campaign_id to prevent duplicates
-- First, remove any duplicates (keep the most recent)
DELETE FROM pending_connections a
USING pending_connections b
WHERE a.commenter_linkedin_id = b.commenter_linkedin_id
  AND a.campaign_id = b.campaign_id
  AND a.created_at < b.created_at;

-- Now add the unique constraint
ALTER TABLE pending_connections
ADD CONSTRAINT pending_connections_campaign_linkedin_unique
UNIQUE (campaign_id, commenter_linkedin_id);

-- Add index for faster lookups by commenter_linkedin_id (used by poll-invitations)
CREATE INDEX IF NOT EXISTS idx_pending_connections_commenter_linkedin_id
ON pending_connections(commenter_linkedin_id);

-- Add index for status lookups
CREATE INDEX IF NOT EXISTS idx_pending_connections_status
ON pending_connections(status);
