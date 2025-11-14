-- Supabase Project: kvjcidxbyimoswntpjcp
-- Migration: Create connected_accounts table for UniPile multi-channel integration
-- Date: 2025-01-12

-- Create connected_accounts table
CREATE TABLE IF NOT EXISTS connected_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN (
    'LINKEDIN',
    'WHATSAPP',
    'INSTAGRAM',
    'TELEGRAM',
    'MESSENGER',
    'TWITTER',
    'EMAIL',
    'CALENDAR'
  )),
  account_id TEXT NOT NULL,  -- UniPile account_id
  account_name TEXT,  -- Display name (e.g., "+1234567890", "john@example.com")
  profile_data JSONB,  -- Full profile from UniPile
  capabilities TEXT[],  -- ['MESSAGING', 'POSTING', 'GROUPS']
  is_primary BOOLEAN DEFAULT false,  -- Primary account for this provider
  status TEXT CHECK (status IN ('active', 'expired', 'error', 'disconnected')) DEFAULT 'active',
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, provider, account_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_connected_accounts_user_provider ON connected_accounts(user_id, provider);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_status ON connected_accounts(status) WHERE status = 'active';

-- Enable RLS
ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own connections
CREATE POLICY connected_accounts_select ON connected_accounts
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own connections (via service role from API)
CREATE POLICY connected_accounts_insert ON connected_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own connections
CREATE POLICY connected_accounts_delete ON connected_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- Users can update their own connections
CREATE POLICY connected_accounts_update ON connected_accounts
  FOR UPDATE USING (auth.uid() = user_id);

-- Add comments
COMMENT ON TABLE connected_accounts IS 'Stores user-connected communication channel accounts via UniPile OAuth';
COMMENT ON COLUMN connected_accounts.provider IS 'UniPile provider type: LINKEDIN, WHATSAPP, INSTAGRAM, TELEGRAM, MESSENGER, TWITTER, EMAIL, CALENDAR';
COMMENT ON COLUMN connected_accounts.account_id IS 'UniPile account_id returned from OAuth flow';
COMMENT ON COLUMN connected_accounts.account_name IS 'Human-readable account name for display';
COMMENT ON COLUMN connected_accounts.profile_data IS 'Full profile JSON from UniPile API';
COMMENT ON COLUMN connected_accounts.capabilities IS 'Array of capabilities this account supports (MESSAGING, POSTING, etc.)';
COMMENT ON COLUMN connected_accounts.is_primary IS 'Whether this is the primary account for this provider (for users with multiple)';

-- Migrate existing linkedin_accounts data
INSERT INTO connected_accounts (
  user_id,
  provider,
  account_id,
  account_name,
  profile_data,
  status,
  last_sync_at,
  created_at,
  updated_at
)
SELECT
  user_id,
  'LINKEDIN' as provider,
  unipile_account_id,
  account_name,
  profile_data,
  status,
  last_sync_at,
  created_at,
  updated_at
FROM linkedin_accounts
WHERE unipile_account_id IS NOT NULL
ON CONFLICT (user_id, provider, account_id) DO NOTHING;
