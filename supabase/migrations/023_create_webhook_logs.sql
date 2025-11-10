-- Migration: Create webhook_logs table for delivery tracking
-- Direct link: https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp/sql/new

CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relationships
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Webhook details
  webhook_url TEXT NOT NULL,
  payload JSONB NOT NULL,

  -- Delivery tracking
  status TEXT CHECK (status IN ('pending', 'sent', 'failed')) DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  response_status INTEGER,
  response_body TEXT,
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for worker queries
CREATE INDEX IF NOT EXISTS idx_webhook_logs_retry
  ON webhook_logs(status, retry_count, last_attempt_at)
  WHERE status = 'failed' AND retry_count < 3;

CREATE INDEX IF NOT EXISTS idx_webhook_logs_created
  ON webhook_logs(created_at DESC);

-- Update timestamp trigger
CREATE TRIGGER update_webhook_logs_updated_at
  BEFORE UPDATE ON webhook_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS policies
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON webhook_logs
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Users can view their campaign webhook logs" ON webhook_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = webhook_logs.campaign_id
      AND campaigns.client_id IN (
        SELECT client_id FROM users WHERE id = auth.uid()
      )
    )
  );

COMMENT ON TABLE webhook_logs IS 'Webhook delivery tracking with retry logic and exponential backoff';
