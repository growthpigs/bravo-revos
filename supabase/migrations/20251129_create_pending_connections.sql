-- Supabase Project: trdoainmejxanrownbuz
-- Migration: Create pending_connections table for tracking LinkedIn connection requests
-- Click: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new

-- Table to track pending LinkedIn connection requests sent to commenters
-- who are not yet connections (so we can't DM them directly)
CREATE TABLE IF NOT EXISTS pending_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to campaign that triggered this
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,

  -- Link to lead record (if created)
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,

  -- Commenter info
  commenter_linkedin_id TEXT NOT NULL,
  commenter_name TEXT,
  commenter_profile_url TEXT,

  -- Original comment info
  comment_id TEXT,
  comment_text TEXT,
  post_id TEXT,

  -- Connection request tracking
  connection_request_sent_at TIMESTAMPTZ,
  invitation_id TEXT,  -- Unipile invitation ID for tracking

  -- Connection acceptance tracking
  connection_accepted_at TIMESTAMPTZ,

  -- Follow-up DM tracking
  followup_dm_sent_at TIMESTAMPTZ,
  followup_dm_message TEXT,

  -- Status: pending, accepted, dm_sent, rejected, expired, cancelled
  status TEXT DEFAULT 'pending' NOT NULL,

  -- Error tracking
  last_error TEXT,
  retry_count INTEGER DEFAULT 0,

  -- User who owns the LinkedIn account
  user_id UUID REFERENCES auth.users(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_pending_connections_status ON pending_connections(status);
CREATE INDEX IF NOT EXISTS idx_pending_connections_commenter_linkedin_id ON pending_connections(commenter_linkedin_id);
CREATE INDEX IF NOT EXISTS idx_pending_connections_campaign_id ON pending_connections(campaign_id);
CREATE INDEX IF NOT EXISTS idx_pending_connections_user_id ON pending_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_connections_created_at ON pending_connections(created_at DESC);

-- Composite index for the cron job query (pending connections to check)
CREATE INDEX IF NOT EXISTS idx_pending_connections_pending_check
  ON pending_connections(status, created_at)
  WHERE status = 'pending';

-- Enable RLS
ALTER TABLE pending_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own pending connections
CREATE POLICY "Users can view own pending_connections"
  ON pending_connections FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own pending connections
CREATE POLICY "Users can insert own pending_connections"
  ON pending_connections FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own pending connections
CREATE POLICY "Users can update own pending_connections"
  ON pending_connections FOR UPDATE
  USING (user_id = auth.uid());

-- Service role can do everything (for cron jobs and workers)
CREATE POLICY "Service role has full access to pending_connections"
  ON pending_connections FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_pending_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pending_connections_updated_at
  BEFORE UPDATE ON pending_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_pending_connections_updated_at();

-- Comment for documentation
COMMENT ON TABLE pending_connections IS 'Tracks LinkedIn connection requests sent to non-connected commenters. Used to follow up with DM once they accept the connection.';
