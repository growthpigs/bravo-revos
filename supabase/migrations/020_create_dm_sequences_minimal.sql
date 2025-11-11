-- Migration: Create DM Sequences Table (MINIMAL VERSION)
-- Project: Bravo revOS - LinkedIn Lead Generation
-- Purpose: Store automated DM sequence configurations for campaigns
-- NOTE: Assumes uuid-ossp extension and update_updated_at_column() function already exist

-- DM Sequences Table
CREATE TABLE IF NOT EXISTS dm_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Metadata
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, paused, archived

  -- Step 1: Initial DM
  step1_template TEXT NOT NULL,
  step1_delay_min INTEGER NOT NULL DEFAULT 2, -- minutes
  step1_delay_max INTEGER NOT NULL DEFAULT 15, -- minutes
  voice_cartridge_id UUID REFERENCES cartridges(id),

  -- Step 2: Email capture
  step2_auto_extract BOOLEAN NOT NULL DEFAULT true,
  step2_confirmation_template TEXT NOT NULL DEFAULT 'Got it! Sending your lead magnet now...',

  -- Step 3: Backup DM
  step3_enabled BOOLEAN NOT NULL DEFAULT true,
  step3_delay INTEGER NOT NULL DEFAULT 5, -- minutes
  step3_template TEXT NOT NULL DEFAULT 'Here''s your direct download link: {{download_url}}',
  step3_link_expiry INTEGER NOT NULL DEFAULT 24, -- hours

  -- Analytics
  sent_count INTEGER NOT NULL DEFAULT 0,
  replied_count INTEGER NOT NULL DEFAULT 0,
  email_captured_count INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_dm_sequences_campaign') THEN
    CREATE INDEX idx_dm_sequences_campaign ON dm_sequences(campaign_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_dm_sequences_client') THEN
    CREATE INDEX idx_dm_sequences_client ON dm_sequences(client_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_dm_sequences_status') THEN
    CREATE INDEX idx_dm_sequences_status ON dm_sequences(status);
  END IF;
END $$;

-- RLS Policies
ALTER TABLE dm_sequences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'dm_sequences'
    AND policyname = 'dm_sequences_client_isolation'
  ) THEN
    CREATE POLICY dm_sequences_client_isolation ON dm_sequences
      FOR ALL
      USING (client_id = (SELECT client_id FROM users WHERE id = auth.uid()));
  END IF;
END $$;

-- Updated_at trigger (drop and recreate to be safe)
DROP TRIGGER IF EXISTS dm_sequences_updated_at ON dm_sequences;
CREATE TRIGGER dm_sequences_updated_at
  BEFORE UPDATE ON dm_sequences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
