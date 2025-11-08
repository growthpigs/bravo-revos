-- Migration: Add library_magnet_id and lead_magnet_source to campaigns
-- Project: Bravo revOS (trdoainmejxanrownbuz)
-- Execute at: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new

-- Add new columns to support both library and custom lead magnets
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS lead_magnet_source TEXT CHECK (lead_magnet_source IN ('library', 'custom', 'none')) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS library_magnet_id UUID REFERENCES lead_magnet_library(id) ON DELETE SET NULL;

-- Add index for library_magnet_id lookups
CREATE INDEX IF NOT EXISTS idx_campaigns_library_magnet ON campaigns(library_magnet_id);

-- Add webhook_config_id reference
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS webhook_config_id UUID REFERENCES webhook_configs(id) ON DELETE SET NULL;

-- Create index for webhook_config_id
CREATE INDEX IF NOT EXISTS idx_campaigns_webhook_config ON campaigns(webhook_config_id);

-- Update trigger_word to support arrays (keep as TEXT for now, store comma-separated)
-- Note: We'll handle array conversion in application code for backwards compatibility

-- Add comment explaining the dual lead magnet system
COMMENT ON COLUMN campaigns.lead_magnet_source IS 'Source of lead magnet: library (pre-built), custom (user upload), or none';
COMMENT ON COLUMN campaigns.library_magnet_id IS 'Reference to lead_magnet_library table when source=library';
COMMENT ON COLUMN campaigns.lead_magnet_id IS 'Reference to lead_magnets table when source=custom (user uploaded file)';
