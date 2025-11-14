-- Add optimized indexes for background worker queries

-- DM Scraper: Query scheduled jobs
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_worker_poll
  ON scrape_jobs(next_check, status)
  WHERE status IN ('scheduled', 'running');

-- Pod Notifications: Query pending notifications
CREATE INDEX IF NOT EXISTS idx_notifications_worker_poll
  ON notifications(created_at, status, type)
  WHERE status = 'pending';
