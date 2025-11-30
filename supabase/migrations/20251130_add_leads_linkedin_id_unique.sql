-- Supabase Project: trdoainmejxanrownbuz
-- Click: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new
-- Description: Add UNIQUE constraint to leads.linkedin_id for upsert support

-- Add unique constraint on linkedin_id (needed for ON CONFLICT in upsert)
-- First, remove any duplicates (keep the most recent)
DELETE FROM leads a
USING leads b
WHERE a.linkedin_id = b.linkedin_id
  AND a.created_at < b.created_at;

-- Now add the unique constraint
ALTER TABLE leads ADD CONSTRAINT leads_linkedin_id_unique UNIQUE (linkedin_id);

-- Add status values needed for lead capture flow
-- (These may already exist, so use a safe approach)
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check CHECK (status IN (
  'comment_detected',
  'dm_sent',
  'dm_replied',
  'email_captured',
  'webhook_sent',
  'completed',
  'new',
  'connection_pending',
  'connection_expired'
));
