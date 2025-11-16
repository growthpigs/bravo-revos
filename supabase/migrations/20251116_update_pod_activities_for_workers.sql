-- Supabase Project: trdoainmejxanrownbuz
-- Click: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new

-- Update pod_activities table to support worker processing
-- Add missing columns needed by pod amplification workers

ALTER TABLE pod_activities
ADD COLUMN IF NOT EXISTS pod_id UUID REFERENCES clients(id),  -- TEMPORARY: using clients as pods
ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES pod_members(id),
ADD COLUMN IF NOT EXISTS activity_type TEXT DEFAULT 'repost',
ADD COLUMN IF NOT EXISTS post_url TEXT,
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Update status CHECK constraint to include new statuses
ALTER TABLE pod_activities
DROP CONSTRAINT IF EXISTS pod_activities_status_check;

ALTER TABLE pod_activities
ADD CONSTRAINT pod_activities_status_check
CHECK (status IN ('pending', 'queued', 'processing', 'success', 'failed'));

-- Create index for faster worker queries
CREATE INDEX IF NOT EXISTS idx_pod_activities_status ON pod_activities(status);
CREATE INDEX IF NOT EXISTS idx_pod_activities_pod_id ON pod_activities(pod_id);
