-- Migration: Create notifications table for pod link distribution
-- Direct link: https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp/sql/new

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
-- Tracks pending notifications to be sent to users
-- Types: pod_repost (send LinkedIn post URL for engagement)
-- Background worker processes pending notifications

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Recipient
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Notification details
  type TEXT NOT NULL CHECK (type IN ('pod_repost', 'campaign_alert', 'system')),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  linkedin_url TEXT,
  message TEXT,

  -- Status tracking
  status TEXT CHECK (status IN ('pending', 'sent', 'failed')) DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  error_message TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- Update timestamp trigger
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for background workers)
CREATE POLICY "Service role full access" ON notifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their own notifications
CREATE POLICY "Users can view their notifications" ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can mark their notifications as read/dismissed
CREATE POLICY "Users can update their notifications" ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

COMMENT ON TABLE notifications IS 'Pending notifications to be sent to users (pod repost links, alerts, system messages)';
COMMENT ON COLUMN notifications.type IS 'pod_repost = LinkedIn post URL for pod engagement, campaign_alert = campaign updates, system = system messages';
COMMENT ON COLUMN notifications.linkedin_url IS 'For pod_repost: LinkedIn post URL to share with pod members';
