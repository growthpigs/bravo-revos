-- E-05: Pod Engagement Executor
-- Add columns for execution result tracking, idempotency, error handling, and dead-letter queue
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

-- Create dead-letter queue table for permanently failed activities
-- E-05-5: Error handling & retry logic
CREATE TABLE IF NOT EXISTS pod_activities_dlq (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id UUID NOT NULL,
  error_message TEXT NOT NULL,
  error_type TEXT NOT NULL,
  attempts INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT
);

-- Create index for quick lookup of DLQ entries
CREATE INDEX IF NOT EXISTS idx_pod_activities_dlq_activity_id ON pod_activities_dlq(activity_id);
CREATE INDEX IF NOT EXISTS idx_pod_activities_dlq_error_type ON pod_activities_dlq(error_type);
CREATE INDEX IF NOT EXISTS idx_pod_activities_dlq_created_at ON pod_activities_dlq(created_at);

-- Add comments for DLQ table
COMMENT ON TABLE pod_activities_dlq IS 'Dead-letter queue for permanently failed pod engagement activities';
COMMENT ON COLUMN pod_activities_dlq.activity_id IS 'Reference to the pod_activities record that failed';
COMMENT ON COLUMN pod_activities_dlq.error_type IS 'Classification of error (auth_error, not_found, rate_limit, etc.)';
COMMENT ON COLUMN pod_activities_dlq.resolution_notes IS 'Notes on how the failure was resolved or why it was skipped';
