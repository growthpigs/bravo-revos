-- E-05: Pod Engagement Executor
-- Add columns for execution result tracking, idempotency, and error handling
-- Project ID: kvjcidxbyimoswntpjcp

-- Track execution results and enable idempotency checks
ALTER TABLE pod_activities
ADD COLUMN IF NOT EXISTS execution_result JSONB,
ADD COLUMN IF NOT EXISTS execution_attempts INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_error TEXT,
ADD COLUMN IF NOT EXISTS idempotency_key UUID;

-- Create index for idempotency checks (prevent duplicate execution)
CREATE INDEX IF NOT EXISTS idx_pod_activities_idempotency_key ON pod_activities(idempotency_key)
WHERE status IN ('completed', 'executed');

-- Create index for error tracking (find activities that failed)
CREATE INDEX IF NOT EXISTS idx_pod_activities_failed_status ON pod_activities(status, last_error)
WHERE status = 'failed';

-- Add comment explaining execution_result structure
COMMENT ON COLUMN pod_activities.execution_result IS 'JSON object containing {success: boolean, timestamp: ISO string, error: string|null, error_type: string|null, api_response?: object}';
COMMENT ON COLUMN pod_activities.execution_attempts IS 'Number of execution attempts (for retry tracking)';
COMMENT ON COLUMN pod_activities.last_error IS 'Most recent error message (null if successful)';
COMMENT ON COLUMN pod_activities.idempotency_key IS 'Unique key to prevent duplicate executions from concurrent requests';
