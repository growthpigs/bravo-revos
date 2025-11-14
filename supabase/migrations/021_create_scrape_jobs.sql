-- Migration: Create scrape_jobs table for DM automation
-- Direct link: https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp/sql/new

-- ============================================================
-- SCRAPE JOBS TABLE
-- ============================================================
-- Tracks automated DM scraping jobs for LinkedIn posts
-- Each job monitors a post for:
-- 1. Comments with trigger words
-- 2. DM replies with emails
-- 3. Lead magnet delivery via webhook

CREATE TABLE IF NOT EXISTS scrape_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relationships
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,

  -- LinkedIn/Unipile identifiers
  unipile_post_id TEXT NOT NULL,
  unipile_account_id TEXT NOT NULL,

  -- Scraping configuration
  trigger_word TEXT NOT NULL DEFAULT 'guide',
  lead_magnet_url TEXT,
  send_backup_link BOOLEAN DEFAULT false,
  webhook_url TEXT,

  -- Job status
  status TEXT CHECK (status IN ('scheduled', 'running', 'paused', 'completed', 'failed')) DEFAULT 'scheduled',

  -- Polling schedule
  poll_interval_minutes INTEGER DEFAULT 5,
  next_check TIMESTAMPTZ,
  last_checked TIMESTAMPTZ,

  -- Metrics
  comments_scanned INTEGER DEFAULT 0,
  trigger_words_found INTEGER DEFAULT 0,
  dms_sent INTEGER DEFAULT 0,
  emails_captured INTEGER DEFAULT 0,

  -- Error tracking
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  last_error_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_post ON scrape_jobs(post_id);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_campaign ON scrape_jobs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status ON scrape_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_next_check ON scrape_jobs(next_check) WHERE status IN ('scheduled', 'running');

-- Update timestamp trigger
CREATE TRIGGER update_scrape_jobs_updated_at
  BEFORE UPDATE ON scrape_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS policies
ALTER TABLE scrape_jobs ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for cron jobs)
CREATE POLICY "Service role full access" ON scrape_jobs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view scrape jobs for their campaigns
CREATE POLICY "Users can view their campaign scrape jobs" ON scrape_jobs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = scrape_jobs.campaign_id
      AND campaigns.client_id IN (
        SELECT client_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Users can update scrape jobs for their campaigns (pause/resume)
CREATE POLICY "Users can update their campaign scrape jobs" ON scrape_jobs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = scrape_jobs.campaign_id
      AND campaigns.client_id IN (
        SELECT client_id FROM users WHERE id = auth.uid()
      )
    )
  );

COMMENT ON TABLE scrape_jobs IS 'Automated DM scraping jobs for LinkedIn posts - monitors comments for trigger words and DMs for email replies';
COMMENT ON COLUMN scrape_jobs.trigger_word IS 'Word to detect in comments (e.g., "interested", "guide", "checklist")';
COMMENT ON COLUMN scrape_jobs.lead_magnet_url IS 'Backup link to send if webhook fails';
COMMENT ON COLUMN scrape_jobs.send_backup_link IS 'Whether to send backup DM with direct link after webhook';
COMMENT ON COLUMN scrape_jobs.poll_interval_minutes IS 'How often to check for new comments/DMs (default 5 minutes)';
