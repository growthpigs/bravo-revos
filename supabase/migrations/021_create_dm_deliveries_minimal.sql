-- Migration: Create DM Deliveries Table (MINIMAL VERSION)
-- Project: Bravo revOS - LinkedIn Lead Generation
-- Purpose: Track individual DM sends and delivery status
-- NOTE: Assumes uuid-ossp extension and update_updated_at_column() function already exist

-- DM Deliveries Table (tracking individual sends)
CREATE TABLE IF NOT EXISTS dm_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id UUID NOT NULL REFERENCES dm_sequences(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  -- Delivery tracking
  step_number INTEGER NOT NULL CHECK (step_number IN (1, 2, 3)),
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, sent, delivered, failed
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  replied_at TIMESTAMP WITH TIME ZONE,

  -- Content
  message_content TEXT NOT NULL,
  unipile_message_id VARCHAR(255), -- External ID from Unipile

  -- Email extraction (step 2)
  email_extracted VARCHAR(255),
  extraction_confidence FLOAT,
  extraction_method VARCHAR(50), -- regex, gpt4o, manual

  -- Errors
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_retry_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_dm_deliveries_sequence') THEN
    CREATE INDEX idx_dm_deliveries_sequence ON dm_deliveries(sequence_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_dm_deliveries_lead') THEN
    CREATE INDEX idx_dm_deliveries_lead ON dm_deliveries(lead_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_dm_deliveries_status') THEN
    CREATE INDEX idx_dm_deliveries_status ON dm_deliveries(status);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_dm_deliveries_step') THEN
    CREATE INDEX idx_dm_deliveries_step ON dm_deliveries(step_number);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_dm_deliveries_sent_at') THEN
    CREATE INDEX idx_dm_deliveries_sent_at ON dm_deliveries(sent_at);
  END IF;
END $$;

-- RLS Policies
ALTER TABLE dm_deliveries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'dm_deliveries'
    AND policyname = 'dm_deliveries_client_isolation'
  ) THEN
    CREATE POLICY dm_deliveries_client_isolation ON dm_deliveries
      FOR ALL
      USING (
        sequence_id IN (
          SELECT id FROM dm_sequences WHERE client_id = (
            SELECT client_id FROM users WHERE id = auth.uid()
          )
        )
      );
  END IF;
END $$;

-- Updated_at trigger (drop and recreate to be safe)
DROP TRIGGER IF EXISTS dm_deliveries_updated_at ON dm_deliveries;
CREATE TRIGGER dm_deliveries_updated_at
  BEFORE UPDATE ON dm_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
