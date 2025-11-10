-- ============================================================
-- Migration: Make voice_id nullable in campaigns
-- Purpose: Allow campaigns to be created without a voice cartridge
-- Note: HGC will show warning when voice_id is missing
-- ============================================================

ALTER TABLE campaigns ALTER COLUMN voice_id DROP NOT NULL;

COMMENT ON COLUMN campaigns.voice_id IS 'Optional voice cartridge for content generation - campaigns can be created without one but a warning will be shown';
