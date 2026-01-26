-- E-02: Pod Session Management & LinkedIn Authentication
-- Adds invitation tokens and session expiry monitoring for pod members
-- Run this migration in Supabase SQL editor

-- Add invitation fields to pod_members
ALTER TABLE pod_members
ADD COLUMN IF NOT EXISTS invitation_token TEXT,
ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS invitation_expires_at TIMESTAMPTZ;

-- Add index for invitation token lookups
CREATE INDEX IF NOT EXISTS idx_pod_members_invitation_token
ON pod_members(invitation_token)
WHERE invitation_token IS NOT NULL;

-- Add client_id to linkedin_accounts (for multi-tenant isolation)
ALTER TABLE linkedin_accounts
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

-- Create index for client_id
CREATE INDEX IF NOT EXISTS idx_linkedin_accounts_client
ON linkedin_accounts(client_id);

-- Create session_expiry_alerts table for tracking notifications
CREATE TABLE IF NOT EXISTS session_expiry_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  linkedin_account_id UUID NOT NULL REFERENCES linkedin_accounts(id) ON DELETE CASCADE,
  pod_member_id UUID REFERENCES pod_members(id) ON DELETE CASCADE,

  -- Alert details
  alert_type TEXT CHECK (alert_type IN ('7_days', '1_day', 'expired')) NOT NULL,
  session_expires_at TIMESTAMPTZ NOT NULL,

  -- Notification channels
  sent_via TEXT[] DEFAULT '{}', -- ['email', 'slack', 'sms']

  -- Status
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,

  -- Reauthentication tracking
  reauth_completed_at TIMESTAMPTZ,

  UNIQUE(linkedin_account_id, alert_type, session_expires_at)
);

-- Create indexes for session monitoring
CREATE INDEX IF NOT EXISTS idx_session_alerts_account
ON session_expiry_alerts(linkedin_account_id);

CREATE INDEX IF NOT EXISTS idx_session_alerts_sent
ON session_expiry_alerts(sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_linkedin_accounts_expiry
ON linkedin_accounts(session_expires_at)
WHERE status = 'active';

-- Function to check for expiring sessions and create alerts
CREATE OR REPLACE FUNCTION check_expiring_sessions()
RETURNS void AS $$
BEGIN
  -- Alert 7 days before expiry
  INSERT INTO session_expiry_alerts (linkedin_account_id, pod_member_id, alert_type, session_expires_at)
  SELECT
    la.id,
    pm.id,
    '7_days',
    la.session_expires_at
  FROM linkedin_accounts la
  LEFT JOIN pod_members pm ON pm.linkedin_account_id = la.id
  WHERE
    la.status = 'active'
    AND la.session_expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'
    AND la.session_expires_at > NOW() + INTERVAL '6 days' -- Window: exactly 7 days out
    AND NOT EXISTS (
      SELECT 1 FROM session_expiry_alerts
      WHERE linkedin_account_id = la.id
      AND alert_type = '7_days'
      AND session_expires_at = la.session_expires_at
    )
  ON CONFLICT (linkedin_account_id, alert_type, session_expires_at) DO NOTHING;

  -- Alert 1 day before expiry
  INSERT INTO session_expiry_alerts (linkedin_account_id, pod_member_id, alert_type, session_expires_at)
  SELECT
    la.id,
    pm.id,
    '1_day',
    la.session_expires_at
  FROM linkedin_accounts la
  LEFT JOIN pod_members pm ON pm.linkedin_account_id = la.id
  WHERE
    la.status = 'active'
    AND la.session_expires_at BETWEEN NOW() AND NOW() + INTERVAL '1 day'
    AND la.session_expires_at > NOW() + INTERVAL '12 hours' -- Window: 12-24 hours out
    AND NOT EXISTS (
      SELECT 1 FROM session_expiry_alerts
      WHERE linkedin_account_id = la.id
      AND alert_type = '1_day'
      AND session_expires_at = la.session_expires_at
    )
  ON CONFLICT (linkedin_account_id, alert_type, session_expires_at) DO NOTHING;

  -- Alert when expired
  INSERT INTO session_expiry_alerts (linkedin_account_id, pod_member_id, alert_type, session_expires_at)
  SELECT
    la.id,
    pm.id,
    'expired',
    la.session_expires_at
  FROM linkedin_accounts la
  LEFT JOIN pod_members pm ON pm.linkedin_account_id = la.id
  WHERE
    la.status = 'active'
    AND la.session_expires_at < NOW()
    AND NOT EXISTS (
      SELECT 1 FROM session_expiry_alerts
      WHERE linkedin_account_id = la.id
      AND alert_type = 'expired'
      AND session_expires_at = la.session_expires_at
    )
  ON CONFLICT (linkedin_account_id, alert_type, session_expires_at) DO NOTHING;

  -- Update expired accounts to 'expired' status
  UPDATE linkedin_accounts
  SET status = 'expired'
  WHERE session_expires_at < NOW()
  AND status = 'active';
END;
$$ LANGUAGE plpgsql;

-- RLS policies for session_expiry_alerts
ALTER TABLE session_expiry_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view alerts for their accounts" ON session_expiry_alerts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM linkedin_accounts la
      JOIN users u ON u.id = la.user_id
      WHERE la.id = session_expiry_alerts.linkedin_account_id
      AND u.id = auth.uid()::uuid
    )
  );

-- Service role can manage all alerts
CREATE POLICY "Service role can manage alerts" ON session_expiry_alerts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Comments for documentation
COMMENT ON TABLE session_expiry_alerts IS 'Tracks session expiry notifications for LinkedIn accounts';
COMMENT ON COLUMN session_expiry_alerts.alert_type IS '7_days: Warning 7 days before, 1_day: Warning 1 day before, expired: Session has expired';
COMMENT ON COLUMN session_expiry_alerts.sent_via IS 'Array of notification channels used: email, slack, sms';
COMMENT ON COLUMN pod_members.invitation_token IS 'Secure token for pod member to authenticate LinkedIn (expires in 48 hours)';
COMMENT ON COLUMN pod_members.invitation_expires_at IS 'When the invitation token expires (48 hours from creation)';
