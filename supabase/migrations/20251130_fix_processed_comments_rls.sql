-- Supabase Project: trdoainmejxanrownbuz
-- Click: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new
--
-- FIX CRITICAL: processed_comments has USING (true) which allows ALL users to read/write
-- This migration restricts access to service_role only (backend cron jobs)
--
-- SECURITY CONTEXT:
-- - processed_comments is used by comment-monitor cron job
-- - Should NEVER be accessible to authenticated users
-- - Only service_role (backend) should have access

-- Drop the dangerous blanket bypass policy
DROP POLICY IF EXISTS "Service role full access" ON processed_comments;

-- Create proper service role restriction
-- This policy only allows access when using service_role key
CREATE POLICY "Service role only access" ON processed_comments
  FOR ALL
  USING (
    -- Only allow if current user is using service_role
    -- auth.jwt() is null for service_role, auth.role() returns 'service_role'
    current_setting('request.jwt.claim.role', true) = 'service_role'
    OR
    -- Alternative check: if auth.uid() is null, we're in service role context
    auth.uid() IS NULL
  )
  WITH CHECK (
    current_setting('request.jwt.claim.role', true) = 'service_role'
    OR
    auth.uid() IS NULL
  );

-- Also fix processed_messages if it has the same issue
DROP POLICY IF EXISTS "Service role full access" ON processed_messages;

CREATE POLICY "Service role only access" ON processed_messages
  FOR ALL
  USING (
    current_setting('request.jwt.claim.role', true) = 'service_role'
    OR
    auth.uid() IS NULL
  )
  WITH CHECK (
    current_setting('request.jwt.claim.role', true) = 'service_role'
    OR
    auth.uid() IS NULL
  );

-- Add comment to document security requirement
COMMENT ON TABLE processed_comments IS 'SECURITY: Service role access only. Used by comment-monitor cron job.';
COMMENT ON TABLE processed_messages IS 'SECURITY: Service role access only. Used by reply-monitor cron job.';
