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

-- Policy: Authenticated users can create invitations (page-level auth guard)
CREATE POLICY "Authenticated users can create invitations"
ON user_invitations FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
);

-- Policy: All users can select invitations
-- Token-based verification happens at application level in API
CREATE POLICY "Users can select invitations"
ON user_invitations FOR SELECT
USING (
  true
);

-- Policy: Users can update invitations they created
CREATE POLICY "Users can update invitations they created"
ON user_invitations FOR UPDATE
USING (
  invited_by = auth.uid()
);
