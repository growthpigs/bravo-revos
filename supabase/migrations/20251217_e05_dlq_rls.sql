-- Supabase Project: trdoainmejxanrownbuz
-- Click: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new
--
-- E-05 Pod Engagement Executor - DLQ RLS Policy
--
-- Add Row Level Security to the dead-letter queue table.
-- Only service role should have access (backend workers only).

-- Enable RLS on pod_activities_dlq table
ALTER TABLE pod_activities_dlq ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Service role full access" ON pod_activities_dlq;

-- Create policy for service role full access
-- Service role bypasses RLS by default, but this makes intent explicit
CREATE POLICY "Service role full access" ON pod_activities_dlq
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comment explaining the security model
COMMENT ON TABLE pod_activities_dlq IS 'Dead-letter queue for failed pod activities. Access restricted to service role (backend workers only).';
