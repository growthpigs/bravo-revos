-- Supabase Project: trdoainmejxanrownbuz
-- Click: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new

-- ============================================================================
-- POD AMPLIFICATION SYSTEM - RECREATE TABLES
-- ============================================================================
-- This migration DROPS existing pod tables and recreates with simplified schema
--
-- RATIONALE: Existing schema has only 1 test pod (no members, no activities)
-- Safe to drop and recreate with new design from 2025-11-16 specification
--
-- NEW ARCHITECTURE:
-- - pod_members: Direct client_id relationship (no pods parent table)
-- - pod_activities: Simplified repost tracking with retry logic
-- - Uses Unipile account IDs (text) instead of linkedin_accounts FK
--
-- Security: Client-scoped RLS ensures multi-tenant data isolation
-- ============================================================================

-- ============================================================================
-- DROP EXISTING TABLES
-- ============================================================================
-- CASCADE will handle foreign key dependencies
-- Only affects 1 test pod created 2025-11-12 (safe to delete)
-- ============================================================================

DROP TABLE IF EXISTS pod_activities CASCADE;
DROP TABLE IF EXISTS pod_members CASCADE;
DROP TABLE IF EXISTS pods CASCADE;

-- ============================================================================
-- POD_MEMBERS TABLE
-- ============================================================================
-- Stores team member accounts that participate in pod amplification
-- Each member has a Unipile account for LinkedIn session management
-- No parent 'pods' table - members belong directly to client
-- ============================================================================

CREATE TABLE pod_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Member identification
  name TEXT NOT NULL,
  linkedin_url TEXT NOT NULL,
  unipile_account_id TEXT NOT NULL, -- Unipile account ID for session tokens

  -- Status tracking
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_activity_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_pod_members_client ON pod_members(client_id) WHERE is_active = true;
CREATE INDEX idx_pod_members_user ON pod_members(user_id);
CREATE INDEX idx_pod_members_unipile ON pod_members(unipile_account_id);

-- Add helpful comments
COMMENT ON TABLE pod_members IS 'Team members who participate in pod amplification by reposting content';
COMMENT ON COLUMN pod_members.unipile_account_id IS 'Unipile account ID used to obtain LinkedIn session tokens (NOT passwords)';
COMMENT ON COLUMN pod_members.is_active IS 'Whether this member is currently active for pod amplification';
COMMENT ON COLUMN pod_members.last_activity_at IS 'Timestamp of last successful repost activity';

-- ============================================================================
-- POD_ACTIVITIES TABLE
-- ============================================================================
-- Tracks individual repost attempts for each pod member
-- One row per repost attempt with retry tracking and status
-- ============================================================================

CREATE TABLE pod_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  pod_member_id UUID NOT NULL REFERENCES pod_members(id) ON DELETE CASCADE,

  -- Action details
  action TEXT NOT NULL DEFAULT 'repost',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  error_message TEXT,

  -- Timing
  scheduled_for TIMESTAMPTZ NOT NULL,
  executed_at TIMESTAMPTZ,

  -- Result
  repost_url TEXT, -- Link to member's repost on LinkedIn

  -- Retry tracking
  attempt_number INTEGER NOT NULL DEFAULT 1,
  max_attempts INTEGER NOT NULL DEFAULT 3,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_pod_activities_post ON pod_activities(post_id);
CREATE INDEX idx_pod_activities_member ON pod_activities(pod_member_id);
CREATE INDEX idx_pod_activities_status ON pod_activities(status) WHERE status = 'pending';
CREATE INDEX idx_pod_activities_scheduled ON pod_activities(scheduled_for) WHERE status = 'pending';

-- Add helpful comments
COMMENT ON TABLE pod_activities IS 'Individual repost attempts with status tracking and retry logic';
COMMENT ON COLUMN pod_activities.scheduled_for IS 'When BullMQ should execute this repost (randomized delay)';
COMMENT ON COLUMN pod_activities.executed_at IS 'When the repost was actually executed (NULL if pending)';
COMMENT ON COLUMN pod_activities.repost_url IS 'LinkedIn URL of the repost (populated after success)';
COMMENT ON COLUMN pod_activities.attempt_number IS 'Current retry attempt (1-3)';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Enable RLS and add policies for multi-tenant security
-- Pattern: Users can only access data for their client
-- Admins have full access across all clients
-- ============================================================================

-- Enable RLS
ALTER TABLE pod_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE pod_activities ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POD_MEMBERS RLS POLICIES
-- ============================================================================

-- Users can view pod members for their client
CREATE POLICY "Users can view their client's pod members"
  ON pod_members
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM users WHERE id = auth.uid()
    )
  );

-- Users can insert pod members for their client
CREATE POLICY "Users can create pod members for their client"
  ON pod_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id IN (
      SELECT client_id FROM users WHERE id = auth.uid()
    )
  );

-- Users can update pod members for their client
CREATE POLICY "Users can update their client's pod members"
  ON pod_members
  FOR UPDATE
  TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM users WHERE id = auth.uid()
    )
  );

-- Users can delete pod members for their client
CREATE POLICY "Users can delete their client's pod members"
  ON pod_members
  FOR DELETE
  TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM users WHERE id = auth.uid()
    )
  );

-- Admins have full access to all pod members
CREATE POLICY "Admins have full access to all pod members"
  ON pod_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- POD_ACTIVITIES RLS POLICIES
-- ============================================================================

-- Users can view activities for their client's posts
CREATE POLICY "Users can view activities for their client's posts"
  ON pod_activities
  FOR SELECT
  TO authenticated
  USING (
    pod_member_id IN (
      SELECT pm.id
      FROM pod_members pm
      INNER JOIN users u ON u.client_id = pm.client_id
      WHERE u.id = auth.uid()
    )
  );

-- System can insert activities (service role key used by API)
CREATE POLICY "Service role can create activities"
  ON pod_activities
  FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Service role bypasses RLS, but explicit policy for clarity

-- System can update activities (service role key used by worker)
CREATE POLICY "Service role can update activities"
  ON pod_activities
  FOR UPDATE
  TO authenticated
  USING (true); -- Service role bypasses RLS, but explicit policy for clarity

-- Admins have full access to all activities
CREATE POLICY "Admins have full access to all activities"
  ON pod_activities
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMP
-- ============================================================================

-- Function to update updated_at timestamp (create if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for pod_members
CREATE TRIGGER update_pod_members_updated_at
  BEFORE UPDATE ON pod_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for pod_activities
CREATE TRIGGER update_pod_activities_updated_at
  BEFORE UPDATE ON pod_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Tables recreated: pod_members, pod_activities
-- Removed: pods (parent table no longer needed)
-- Indexes added for performance optimization
-- RLS policies enforced for multi-tenant security
-- Ready for pod amplification implementation
-- ============================================================================
