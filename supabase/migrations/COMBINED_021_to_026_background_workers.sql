-- ============================================================
-- COMBINED MIGRATION: Background Workers Setup (021-026)
-- Run all background worker migrations in one go
-- ============================================================
-- Supabase Project: kvjcidxbyimoswntpjcp
-- https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp/sql/new
-- ============================================================

-- MIGRATION 021: Create scrape_jobs table
CREATE TABLE IF NOT EXISTS scrape_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  unipile_post_id TEXT NOT NULL,
  unipile_account_id TEXT NOT NULL,
  trigger_word TEXT NOT NULL DEFAULT 'guide',
  lead_magnet_url TEXT,
  send_backup_link BOOLEAN DEFAULT false,
  webhook_url TEXT,
  status TEXT CHECK (status IN ('scheduled', 'running', 'paused', 'completed', 'failed')) DEFAULT 'scheduled',
  poll_interval_minutes INTEGER DEFAULT 5,
  next_check TIMESTAMPTZ,
  last_checked TIMESTAMPTZ,
  comments_scanned INTEGER DEFAULT 0,
  trigger_words_found INTEGER DEFAULT 0,
  dms_sent INTEGER DEFAULT 0,
  emails_captured INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  last_error_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scrape_jobs_post ON scrape_jobs(post_id);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_campaign ON scrape_jobs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status ON scrape_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_next_check ON scrape_jobs(next_check) WHERE status IN ('scheduled', 'running');

CREATE TRIGGER update_scrape_jobs_updated_at
  BEFORE UPDATE ON scrape_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE scrape_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON scrape_jobs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Users can view their campaign scrape jobs" ON scrape_jobs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = scrape_jobs.campaign_id
      AND campaigns.client_id IN (SELECT client_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can update their campaign scrape jobs" ON scrape_jobs
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = scrape_jobs.campaign_id
      AND campaigns.client_id IN (SELECT client_id FROM users WHERE id = auth.uid())
    )
  );

-- MIGRATION 022: Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('pod_repost', 'campaign_alert', 'system')),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  linkedin_url TEXT,
  message TEXT,
  status TEXT CHECK (status IN ('pending', 'sent', 'failed')) DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON notifications
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Users can view their notifications" ON notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their notifications" ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- MIGRATION 023: Create webhook_logs table
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT CHECK (status IN ('pending', 'sent', 'failed')) DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  response_status INTEGER,
  response_body TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_retry
  ON webhook_logs(status, retry_count, last_attempt_at)
  WHERE status = 'failed' AND retry_count < 3;

CREATE INDEX IF NOT EXISTS idx_webhook_logs_created
  ON webhook_logs(created_at DESC);

CREATE TRIGGER update_webhook_logs_updated_at
  BEFORE UPDATE ON webhook_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON webhook_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Users can view their campaign webhook logs" ON webhook_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = webhook_logs.campaign_id
      AND campaigns.client_id IN (SELECT client_id FROM users WHERE id = auth.uid())
    )
  );

-- MIGRATION 024: Add worker indexes
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_worker_poll
  ON scrape_jobs(next_check, status)
  WHERE status IN ('scheduled', 'running');

CREATE INDEX IF NOT EXISTS idx_notifications_worker_poll
  ON notifications(created_at, status, type)
  WHERE status = 'pending';

-- MIGRATION 026: Add INSERT policy for scrape_jobs
CREATE POLICY "Users can insert scrape jobs for their campaigns" ON scrape_jobs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = scrape_jobs.campaign_id
      AND campaigns.client_id IN (SELECT client_id FROM users WHERE id = auth.uid())
    )
  );
