-- D-02: Webhook Delivery to Client CRM/ESP
-- Delivers captured lead data with HMAC signatures and retry logic
-- Run this migration in Supabase SQL editor

-- Create webhook_deliveries table for tracking all webhook delivery attempts
CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  -- Webhook target information
  webhook_url TEXT NOT NULL,

  -- Payload and signature
  payload JSONB NOT NULL,
  signature TEXT NOT NULL,

  -- Retry logic
  attempt INTEGER DEFAULT 1,
  max_attempts INTEGER DEFAULT 4,
  status TEXT CHECK (status IN ('pending', 'sent', 'failed', 'success')) DEFAULT 'pending',

  -- Error tracking
  last_error TEXT,
  next_retry_at TIMESTAMPTZ,

  -- Response tracking
  sent_at TIMESTAMPTZ,
  response_status INTEGER,
  response_body TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance and queries
CREATE INDEX idx_webhook_deliveries_lead ON webhook_deliveries(lead_id);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX idx_webhook_deliveries_created ON webhook_deliveries(created_at DESC);
CREATE INDEX idx_webhook_deliveries_next_retry ON webhook_deliveries(next_retry_at)
  WHERE status IN ('pending', 'sent');

-- RLS Policies
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view deliveries for their campaigns
CREATE POLICY "Users can view webhook deliveries for their leads" ON webhook_deliveries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leads
      JOIN campaigns ON leads.campaign_id = campaigns.id
      WHERE leads.id = webhook_deliveries.lead_id
      AND campaigns.client_id IN (
        SELECT id FROM clients
        WHERE workspace_id = auth.uid()::uuid
      )
    )
  );

-- Allow service role to insert and update (from background worker)
CREATE POLICY "Service role can manage webhook deliveries" ON webhook_deliveries
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update webhook deliveries" ON webhook_deliveries
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Update trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_webhook_deliveries_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER webhook_deliveries_updated_at
BEFORE UPDATE ON webhook_deliveries
FOR EACH ROW
EXECUTE FUNCTION update_webhook_deliveries_timestamp();

-- Create webhook_delivery_logs table for detailed delivery history
CREATE TABLE webhook_delivery_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id UUID NOT NULL REFERENCES webhook_deliveries(id) ON DELETE CASCADE,

  -- Attempt information
  attempt_number INTEGER NOT NULL,
  attempted_at TIMESTAMPTZ DEFAULT NOW(),

  -- Response information
  response_status INTEGER,
  response_body TEXT,
  response_headers JSONB,

  -- Error information
  error TEXT,
  error_type TEXT,

  -- Retry decision
  will_retry BOOLEAN DEFAULT false,
  retry_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit trail
CREATE INDEX idx_webhook_delivery_logs_delivery ON webhook_delivery_logs(delivery_id);
CREATE INDEX idx_webhook_delivery_logs_attempted ON webhook_delivery_logs(attempted_at DESC);

-- RLS Policies for logs
ALTER TABLE webhook_delivery_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view webhook delivery logs for their deliveries" ON webhook_delivery_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM webhook_deliveries
      JOIN leads ON webhook_deliveries.lead_id = leads.id
      JOIN campaigns ON leads.campaign_id = campaigns.id
      WHERE webhook_deliveries.id = webhook_delivery_logs.delivery_id
      AND campaigns.client_id IN (
        SELECT id FROM clients
        WHERE workspace_id = auth.uid()::uuid
      )
    )
  );

CREATE POLICY "Service role can insert webhook delivery logs" ON webhook_delivery_logs
  FOR INSERT
  WITH CHECK (true);

-- Create webhook_endpoints table for storing client webhook URLs
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Endpoint information
  url TEXT NOT NULL,
  name TEXT, -- e.g., "Zapier", "Make.com", "Custom CRM"
  type TEXT CHECK (type IN ('zapier', 'makecom', 'convertkit', 'custom')),
  secret TEXT NOT NULL, -- HMAC secret for signature verification

  -- Status
  active BOOLEAN DEFAULT true,
  last_tested_at TIMESTAMPTZ,
  last_test_status INTEGER,

  -- Metadata
  headers JSONB, -- Custom headers to send with webhooks
  format TEXT CHECK (format IN ('zapier', 'makecom', 'convertkit', 'raw')), -- Payload format

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for webhook endpoints
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_client ON webhook_endpoints(client_id);
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_active ON webhook_endpoints(active);

-- RLS Policies
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their webhook endpoints" ON webhook_endpoints
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = webhook_endpoints.client_id
      AND clients.workspace_id = auth.uid()::uuid
    )
  );

CREATE POLICY "Users can update their webhook endpoints" ON webhook_endpoints
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = webhook_endpoints.client_id
      AND clients.workspace_id = auth.uid()::uuid
    )
  );

-- Update trigger for webhook_endpoints
CREATE OR REPLACE FUNCTION update_webhook_endpoints_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER webhook_endpoints_updated_at
BEFORE UPDATE ON webhook_endpoints
FOR EACH ROW
EXECUTE FUNCTION update_webhook_endpoints_timestamp();

-- Comments for documentation
COMMENT ON TABLE webhook_deliveries IS 'Tracks all webhook delivery attempts to client CRM/ESP with retry logic and HMAC signatures';
COMMENT ON TABLE webhook_delivery_logs IS 'Detailed audit trail of each webhook delivery attempt including responses and errors';
COMMENT ON TABLE webhook_endpoints IS 'Stores webhook URLs and credentials for client CRM/ESP integrations';
