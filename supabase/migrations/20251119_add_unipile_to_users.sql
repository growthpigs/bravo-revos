-- Supabase Project: kvjcidxbyimoswntpjcp
-- Click: https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp/sql/new

-- Add Unipile account tracking to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS unipile_account_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS unipile_provider TEXT DEFAULT 'linkedin';

-- Create index for fast lookup by Unipile account
CREATE INDEX IF NOT EXISTS idx_users_unipile_account_id ON users(unipile_account_id);

-- Add constraint: active users must have Unipile account
ALTER TABLE users
ADD CONSTRAINT check_active_has_unipile
CHECK (is_active IS FALSE OR unipile_account_id IS NOT NULL);
