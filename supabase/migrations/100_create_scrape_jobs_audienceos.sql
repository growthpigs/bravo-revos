-- Migration: Create scrape_jobs table for AudienceOS
-- Modified from 021_create_scrape_jobs.sql to use SINGULAR table names
-- Run on: ebxshdqfaqupnvpghodi (AudienceOS Supabase)

-- ============================================================
-- SCRAPE JOBS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS scrape_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships (SINGULAR table names for AudienceOS)
  campaign_id UUID REFERENCES campaign(id) ON DELETE CASCADE,
  post_id UUID REFERENCES post(id) ON DELETE CASCADE,

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

-- RLS policies
ALTER TABLE scrape_jobs ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for cron jobs)
CREATE POLICY "Service role full access" ON scrape_jobs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Permissive policy for authenticated users (simplified for initial setup)
CREATE POLICY "Authenticated users can manage scrape_jobs" ON scrape_jobs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE scrape_jobs IS 'Automated DM scraping jobs for LinkedIn posts';
