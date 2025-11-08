-- Add per-client Unipile integration support
-- Allows each client to have their own Unipile API account for LinkedIn integration
-- This enables multi-tenant Unipile account setup

ALTER TABLE clients
ADD COLUMN unipile_api_key TEXT,
ADD COLUMN unipile_dsn TEXT,
ADD COLUMN unipile_enabled BOOLEAN DEFAULT false,
ADD COLUMN unipile_configured_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN clients.unipile_api_key IS 'Encrypted Unipile API key for this client - should be encrypted by application before storage';
COMMENT ON COLUMN clients.unipile_dsn IS 'Unipile API endpoint for this client (e.g., https://api3.unipile.com:13344)';
COMMENT ON COLUMN clients.unipile_enabled IS 'Whether Unipile integration is enabled for this client';
COMMENT ON COLUMN clients.unipile_configured_at IS 'Timestamp when Unipile was last configured for this client';

-- Create index for finding clients with configured Unipile
CREATE INDEX IF NOT EXISTS idx_clients_unipile_enabled ON clients(unipile_enabled) WHERE unipile_enabled = true;

-- Add RLS policy for clients table to include unipile fields in agency admin queries
-- (RLS policies already exist for clients table, just documenting that they apply to new columns too)
