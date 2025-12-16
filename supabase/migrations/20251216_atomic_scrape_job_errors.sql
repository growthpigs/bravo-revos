-- Migration: Atomic error handling for scrape jobs
-- Supabase Project: trdoainmejxanrownbuz
-- Click: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new
--
-- Purpose: Prevents race conditions when multiple workers concurrently update error_count
-- The read-then-write pattern in TypeScript is not atomic; this RPC function is.

-- Drop existing function if it exists (for idempotent migrations)
DROP FUNCTION IF EXISTS increment_scrape_job_error(UUID, TEXT, BOOLEAN);

CREATE OR REPLACE FUNCTION increment_scrape_job_error(
  p_job_id UUID,
  p_error_message TEXT,
  p_is_404_error BOOLEAN DEFAULT FALSE
) RETURNS TABLE(
  new_error_count INTEGER,
  new_status TEXT,
  should_send_sentry BOOLEAN
) AS $$
DECLARE
  v_error_count INTEGER;
  v_status TEXT;
  v_should_alert BOOLEAN;
  MAX_CONSECUTIVE_ERRORS CONSTANT INTEGER := 3;
BEGIN
  -- Atomically increment error count and update error info
  UPDATE scrape_jobs
  SET
    error_count = COALESCE(error_count, 0) + 1,
    last_error = p_error_message,
    last_error_at = NOW(),
    last_checked = NOW()
  WHERE id = p_job_id
  RETURNING error_count INTO v_error_count;

  -- If job not found, return null values
  IF v_error_count IS NULL THEN
    new_error_count := NULL;
    new_status := NULL;
    should_send_sentry := FALSE;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Determine if job should auto-fail (only for 404 errors after 3+ failures)
  IF v_error_count >= MAX_CONSECUTIVE_ERRORS AND p_is_404_error THEN
    v_status := 'failed';
    UPDATE scrape_jobs SET status = 'failed' WHERE id = p_job_id;
  ELSE
    v_status := 'scheduled';
    UPDATE scrape_jobs SET status = 'scheduled' WHERE id = p_job_id;
  END IF;

  -- Should we send Sentry alert? (after 2+ errors)
  v_should_alert := (v_error_count >= 2);

  -- Return results
  new_error_count := v_error_count;
  new_status := v_status;
  should_send_sentry := v_should_alert;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (service role will call this)
GRANT EXECUTE ON FUNCTION increment_scrape_job_error(UUID, TEXT, BOOLEAN) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION increment_scrape_job_error IS
'Atomically increments error_count for a scrape job. Prevents race conditions when multiple workers process errors concurrently. Auto-fails jobs with 3+ consecutive 404 errors.';
