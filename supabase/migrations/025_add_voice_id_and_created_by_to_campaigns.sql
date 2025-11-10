-- ============================================================
-- Migration: Add voice_id and created_by columns to campaigns
-- Purpose: Fix HGC handleCreateCampaign database schema error
-- ============================================================

ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS voice_id UUID REFERENCES cartridges(id) ON DELETE SET NULL;

ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_campaigns_voice_id ON campaigns(voice_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_by ON campaigns(created_by);

DO $$
BEGIN
  ALTER TABLE campaigns ALTER COLUMN trigger_word DROP NOT NULL;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

COMMENT ON COLUMN campaigns.voice_id IS 'Voice cartridge/personality used for campaign content generation';
COMMENT ON COLUMN campaigns.created_by IS 'User who created this campaign';
COMMENT ON COLUMN campaigns.trigger_word IS 'Keyword that triggers auto-DM when found in LinkedIn comments';
