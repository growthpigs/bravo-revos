-- Supabase Project: trdoainmejxanrownbuz
-- Click: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new
--
-- E-05 Pod Engagement Executor - Fix Status Constraint
--
-- Problem: E-04 scheduler sets `status: 'scheduled'` but DB constraint only allows:
--   ('pending', 'queued', 'processing', 'success', 'failed')
--
-- This causes ALL scheduling to silently fail.
--
-- Solution: Add missing statuses that the code expects:
--   'scheduled' - Activity is scheduled for future execution
--   'executed' - Activity has been executed (legacy)
--   'completed' - Activity completed successfully

-- Drop old constraint
ALTER TABLE pod_activities
DROP CONSTRAINT IF EXISTS pod_activities_status_check;

-- Add new constraint with all required statuses
-- Includes both old values (for backwards compatibility) and new values (for worker code)
ALTER TABLE pod_activities
ADD CONSTRAINT pod_activities_status_check
CHECK (status IN (
  'pending',     -- Initial state
  'scheduled',   -- Scheduled for execution (E-04 sets this)
  'queued',      -- In queue (legacy)
  'processing',  -- Being processed (legacy)
  'executed',    -- Executed (E-05 sets this)
  'completed',   -- Completed successfully (E-05 sets this)
  'success',     -- Success (legacy)
  'failed'       -- Failed
));

-- Add index for E-05 worker polling (find scheduled activities ready for execution)
CREATE INDEX IF NOT EXISTS idx_pod_activities_scheduled
ON pod_activities(status, scheduled_for)
WHERE status = 'scheduled';

-- Add index for finding executed activities
CREATE INDEX IF NOT EXISTS idx_pod_activities_executed
ON pod_activities(status, executed_at)
WHERE status IN ('executed', 'completed');

COMMENT ON CONSTRAINT pod_activities_status_check ON pod_activities IS
'Status values: pending → scheduled → executed/completed/failed. Legacy values (queued, processing, success) kept for backwards compatibility.';
