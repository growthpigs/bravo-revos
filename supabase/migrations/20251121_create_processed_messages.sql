-- Supabase Project: trdoainmejxanrownbuz
-- Click: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new

-- Track processed DM messages to avoid duplicate email extraction
CREATE TABLE IF NOT EXISTS processed_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT NOT NULL UNIQUE,
  lead_id UUID NOT NULL,
  email_extracted TEXT,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_processed_messages_lead ON processed_messages(lead_id);
CREATE INDEX idx_processed_messages_processed_at ON processed_messages(processed_at);

-- RLS
ALTER TABLE processed_messages ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for workers)
CREATE POLICY "Service role full access" ON processed_messages
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE processed_messages IS 'Tracks which DM messages have been processed for email extraction';
