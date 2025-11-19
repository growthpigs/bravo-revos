-- Supabase Project: kvjcidxbyimoswntpjcp
-- Click: https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp/sql/new

-- Create user_invitations table for magic link invitations
CREATE TABLE user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  pod_id UUID REFERENCES pods(id),
  invitation_token UUID NOT NULL DEFAULT gen_random_uuid(),
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'expired'
  invited_by UUID REFERENCES users(id),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_token UNIQUE(invitation_token)
);

-- Create indexes for common queries
CREATE INDEX idx_invitation_token ON user_invitations(invitation_token);
CREATE INDEX idx_invitation_email ON user_invitations(email);
CREATE INDEX idx_invitation_pod_id ON user_invitations(pod_id);
CREATE INDEX idx_invitation_status ON user_invitations(status);
CREATE INDEX idx_invitation_expires_at ON user_invitations(expires_at);

-- Enable Row Level Security
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can manage all invitations
CREATE POLICY "Admins manage invitations"
ON user_invitations FOR ALL
USING (
  auth.uid() IN (SELECT user_id FROM admin_users)
);

-- Policy: Users who invited can see their invitations
CREATE POLICY "Users see invitations they sent"
ON user_invitations FOR SELECT
USING (
  invited_by = auth.uid()
);

-- Policy: Anyone can read invitations if they have valid token (for verification)
-- Note: This will be handled at application level since token is the key
CREATE POLICY "Read invitations by token"
ON user_invitations FOR SELECT
USING (
  true -- Token verification happens in API
);
