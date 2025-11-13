-- Supabase Project: kvjcidxbyimoswntpjcp
-- Click to open in SQL editor: https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp/sql/new
--
-- Migration 032: System Health Log - Immutable Audit Trail
--
-- Purpose: Track all health check results with multi-source verification
-- Retention: Auto-delete after 7 days
-- Created: 2025-11-13

-- =============================================================================
-- SYSTEM HEALTH LOG TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS system_health_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  check_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  service_name TEXT NOT NULL, -- 'supabase', 'redis', 'webhook_worker', 'engagement_worker', 'unipile', 'openai', 'resend', 'git'
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy', 'unknown')),
  response_time_ms INTEGER, -- Null for non-network checks (like env vars)
  diagnostics JSONB NOT NULL DEFAULT '{}', -- Raw data: env vars present, code paths verified, response bodies
  error_message TEXT, -- Human-readable error if unhealthy
  verified_sources JSONB NOT NULL DEFAULT '[]', -- Array of strings: ['env_var', 'endpoint_test', 'code_check']
  git_commit TEXT, -- SHA of commit at time of check
  git_branch TEXT, -- Branch name at time of check
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- INDEXES FOR FAST QUERIES
-- =============================================================================

-- Query by service and time (most common query pattern)
CREATE INDEX idx_health_log_service_timestamp
  ON system_health_log(service_name, check_timestamp DESC);

-- Query by status (find all failures)
CREATE INDEX idx_health_log_status
  ON system_health_log(status)
  WHERE status IN ('unhealthy', 'degraded');

-- Query recent checks
CREATE INDEX idx_health_log_timestamp
  ON system_health_log(check_timestamp DESC);

-- Full-text search on diagnostics
CREATE INDEX idx_health_log_diagnostics
  ON system_health_log USING gin(diagnostics);

-- =============================================================================
-- AUTO-CLEANUP (7-DAY RETENTION)
-- =============================================================================
--
-- UPDATED: Replaced trigger with pg_cron for better performance
-- Trigger ran on EVERY insert (25,920 times/day) - very expensive!
-- Cron runs once daily at 2 AM - much more efficient
--
-- MANUAL SETUP REQUIRED:
-- 1. Enable pg_cron extension in Supabase dashboard (if not already enabled)
-- 2. Run the pg_cron schedule command below (after this migration)
--
-- =============================================================================

-- OLD APPROACH (REMOVED): Trigger-based cleanup
-- CREATE OR REPLACE FUNCTION delete_old_health_logs()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   DELETE FROM system_health_log
--   WHERE check_timestamp < NOW() - INTERVAL '7 days';
--   RETURN NULL;
-- END;
-- $$ LANGUAGE plpgsql;
--
-- CREATE TRIGGER trigger_delete_old_health_logs
--   AFTER INSERT ON system_health_log
--   EXECUTE FUNCTION delete_old_health_logs();

-- NEW APPROACH: Cron-based cleanup (runs daily at 2 AM)

-- Step 1: Enable pg_cron extension (requires superuser - run in Supabase SQL editor)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Step 2: Schedule daily cleanup job
-- Note: Run this command AFTER enabling pg_cron extension
-- SELECT cron.schedule(
--   'cleanup-health-logs',           -- Job name
--   '0 2 * * *',                     -- Cron expression: 2 AM daily
--   $$DELETE FROM system_health_log WHERE check_timestamp < NOW() - INTERVAL '7 days'$$
-- );

-- To verify cron job was created:
-- SELECT * FROM cron.job;

-- To unschedule (if needed):
-- SELECT cron.unschedule('cleanup-health-logs');

-- =============================================================================
-- FALLBACK: Manual cleanup function (if pg_cron not available)
-- =============================================================================
-- Call this function manually via API or scheduled task if pg_cron cannot be enabled
--
CREATE OR REPLACE FUNCTION cleanup_old_health_logs()
RETURNS TABLE (deleted_count BIGINT) AS $$
DECLARE
  rows_deleted BIGINT;
BEGIN
  DELETE FROM system_health_log
  WHERE check_timestamp < NOW() - INTERVAL '7 days';

  GET DIAGNOSTICS rows_deleted = ROW_COUNT;

  RETURN QUERY SELECT rows_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Manual cleanup usage:
-- SELECT * FROM cleanup_old_health_logs();  -- Returns number of rows deleted

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

ALTER TABLE system_health_log ENABLE ROW LEVEL SECURITY;

-- Service role has full access (for health check API)
CREATE POLICY "Service role full access"
  ON system_health_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admins can view health logs (read-only for authenticated users with admin role)
CREATE POLICY "Admins can view health logs"
  ON system_health_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Prevent non-service-role writes (only API can insert)
CREATE POLICY "No direct user writes"
  ON system_health_log
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- =============================================================================
-- HELPER FUNCTION: GET LATEST HEALTH STATUS FOR ALL SERVICES
-- =============================================================================

CREATE OR REPLACE FUNCTION get_latest_health_status()
RETURNS TABLE (
  service_name TEXT,
  status TEXT,
  response_time_ms INTEGER,
  check_timestamp TIMESTAMPTZ,
  error_message TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (shl.service_name)
    shl.service_name,
    shl.status,
    shl.response_time_ms,
    shl.check_timestamp,
    shl.error_message
  FROM system_health_log shl
  ORDER BY shl.service_name, shl.check_timestamp DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- HELPER FUNCTION: GET HEALTH HISTORY FOR SPECIFIC SERVICE
-- =============================================================================

CREATE OR REPLACE FUNCTION get_service_health_history(
  p_service_name TEXT,
  p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  check_timestamp TIMESTAMPTZ,
  status TEXT,
  response_time_ms INTEGER,
  error_message TEXT,
  verified_sources JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    shl.check_timestamp,
    shl.status,
    shl.response_time_ms,
    shl.error_message,
    shl.verified_sources
  FROM system_health_log shl
  WHERE shl.service_name = p_service_name
    AND shl.check_timestamp > NOW() - (p_hours || ' hours')::INTERVAL
  ORDER BY shl.check_timestamp DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SAMPLE QUERY EXAMPLES (COMMENTED OUT)
-- =============================================================================

-- Example 1: Get current health status for all services
-- SELECT * FROM get_latest_health_status();

-- Example 2: Get Redis health history for last 24 hours
-- SELECT * FROM get_service_health_history('redis', 24);

-- Example 3: Find all failures in last 7 days
-- SELECT service_name, check_timestamp, status, error_message
-- FROM system_health_log
-- WHERE status IN ('unhealthy', 'degraded')
--   AND check_timestamp > NOW() - INTERVAL '7 days'
-- ORDER BY check_timestamp DESC;

-- Example 4: Calculate service uptime percentage
-- SELECT
--   service_name,
--   COUNT(*) FILTER (WHERE status = 'healthy') * 100.0 / COUNT(*) AS uptime_percentage
-- FROM system_health_log
-- WHERE check_timestamp > NOW() - INTERVAL '24 hours'
-- GROUP BY service_name;

-- =============================================================================
-- INITIAL TEST DATA (COMMENTED OUT - UNCOMMENT TO POPULATE)
-- =============================================================================

-- INSERT INTO system_health_log (service_name, status, response_time_ms, diagnostics, verified_sources, git_commit, git_branch)
-- VALUES
--   ('supabase', 'healthy', 45, '{"envVarPresent": true, "endpointReachable": true, "codePathValid": true}', '["env_var", "endpoint_test", "code_check"]', '9feee4a', 'main'),
--   ('redis', 'healthy', 12, '{"envVarPresent": true, "endpointReachable": true, "codePathValid": true}', '["env_var", "endpoint_test", "code_check"]', '9feee4a', 'main'),
--   ('webhook_worker', 'degraded', NULL, '{"envVarPresent": true, "endpointReachable": false, "queueEmpty": true}', '["env_var"]', '9feee4a', 'main'),
--   ('unipile', 'healthy', 234, '{"envVarPresent": true, "endpointReachable": true, "accountActive": true}', '["env_var", "endpoint_test"]', '9feee4a', 'main');

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
--
-- Next steps:
-- 1. Run this migration in Supabase SQL editor
-- 2. Verify table created: SELECT * FROM system_health_log;
-- 3. Test helper functions: SELECT * FROM get_latest_health_status();
-- 4. Implement health check verifiers in lib/health-checks/
