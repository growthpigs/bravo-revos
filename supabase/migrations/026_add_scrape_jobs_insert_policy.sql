-- ============================================================
-- Migration: Add INSERT policy for scrape_jobs
-- Purpose: Allow users to create scrape jobs for their campaigns
-- Issue: Users can't create scrape jobs (missing INSERT RLS policy)
-- ============================================================

CREATE POLICY "Users can insert scrape jobs for their campaigns" ON scrape_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = scrape_jobs.campaign_id
      AND campaigns.client_id IN (
        SELECT client_id FROM users WHERE id = auth.uid()
      )
    )
  );
