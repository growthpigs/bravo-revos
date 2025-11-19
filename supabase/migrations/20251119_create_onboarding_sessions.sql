-- Track OAuth state during onboarding
CREATE TABLE onboarding_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_token TEXT NOT NULL UNIQUE,  -- Links to invitation
  oauth_state TEXT NOT NULL UNIQUE,       -- CSRF prevention
  unipile_account_id TEXT,                -- Will be filled by webhook
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'oauth_initiated', 'success', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + interval '1 hour',
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_onboarding_sessions_token ON onboarding_sessions(invitation_token);
CREATE INDEX idx_onboarding_sessions_state ON onboarding_sessions(oauth_state);

-- Allow service role to access during OAuth flow
ALTER TABLE onboarding_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role to manage sessions" ON onboarding_sessions
  FOR ALL USING (true) WITH CHECK (true);
