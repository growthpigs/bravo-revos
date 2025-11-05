-- E-01: Pod Infrastructure & Database
-- Creates engagement pod system for automated LinkedIn engagement
-- Run this migration in Supabase SQL editor

-- Create pods table
CREATE TABLE pods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Pod information
  name TEXT NOT NULL,
  description TEXT,

  -- Member requirements
  min_members INTEGER DEFAULT 3,
  max_members INTEGER DEFAULT 20,

  -- Participation thresholds
  participation_threshold DECIMAL(3,2) DEFAULT 0.80, -- 80% minimum
  suspension_threshold DECIMAL(3,2) DEFAULT 0.50, -- 50% triggers suspension

  -- Status
  status TEXT CHECK (status IN ('active', 'paused', 'archived')) DEFAULT 'active',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(client_id, name)
);

-- Create pod_members table
CREATE TABLE pod_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pod_id UUID NOT NULL REFERENCES pods(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  linkedin_account_id UUID REFERENCES linkedin_accounts(id) ON DELETE SET NULL,

  -- Role
  role TEXT CHECK (role IN ('owner', 'member')) DEFAULT 'member',

  -- Participation tracking
  participation_score DECIMAL(3,2) DEFAULT 1.00, -- 0.00 to 1.00
  total_engagements INTEGER DEFAULT 0,
  completed_engagements INTEGER DEFAULT 0,
  missed_engagements INTEGER DEFAULT 0,

  -- Status
  status TEXT CHECK (status IN ('active', 'suspended', 'left')) DEFAULT 'active',
  suspended_at TIMESTAMPTZ,
  suspension_reason TEXT,

  -- Timestamps
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ,

  UNIQUE(pod_id, user_id)
);

-- Create pod_activities table
CREATE TABLE pod_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pod_id UUID NOT NULL REFERENCES pods(id) ON DELETE CASCADE,

  -- Post information
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  post_url TEXT NOT NULL,
  post_author_id UUID REFERENCES pod_members(id) ON DELETE SET NULL,

  -- Engagement details
  engagement_type TEXT CHECK (engagement_type IN ('like', 'comment', 'repost')) NOT NULL,
  member_id UUID REFERENCES pod_members(id) ON DELETE SET NULL,

  -- Comment content (if engagement_type = 'comment')
  comment_text TEXT,

  -- Scheduling
  scheduled_for TIMESTAMPTZ NOT NULL,
  executed_at TIMESTAMPTZ,

  -- Status
  status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'skipped')) DEFAULT 'pending',
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_pods_client ON pods(client_id);
CREATE INDEX idx_pods_status ON pods(status);

CREATE INDEX idx_pod_members_pod ON pod_members(pod_id);
CREATE INDEX idx_pod_members_user ON pod_members(user_id);
CREATE INDEX idx_pod_members_status ON pod_members(status);
CREATE INDEX idx_pod_members_participation ON pod_members(participation_score);

CREATE INDEX idx_pod_activities_pod ON pod_activities(pod_id);
CREATE INDEX idx_pod_activities_member ON pod_activities(member_id);
CREATE INDEX idx_pod_activities_post ON pod_activities(post_id);
CREATE INDEX idx_pod_activities_scheduled ON pod_activities(scheduled_for)
  WHERE status = 'pending';
CREATE INDEX idx_pod_activities_status ON pod_activities(status);

-- RLS Policies
ALTER TABLE pods ENABLE ROW LEVEL SECURITY;
ALTER TABLE pod_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE pod_activities ENABLE ROW LEVEL SECURITY;

-- Pods policies
CREATE POLICY "Users can view pods for their clients" ON pods
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = pods.client_id
      AND clients.workspace_id = auth.uid()::uuid
    )
  );

CREATE POLICY "Users can create pods for their clients" ON pods
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = pods.client_id
      AND clients.workspace_id = auth.uid()::uuid
    )
  );

CREATE POLICY "Users can update pods for their clients" ON pods
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = pods.client_id
      AND clients.workspace_id = auth.uid()::uuid
    )
  );

CREATE POLICY "Users can delete pods for their clients" ON pods
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = pods.client_id
      AND clients.workspace_id = auth.uid()::uuid
    )
  );

-- Pod members policies
CREATE POLICY "Users can view pod members for their pods" ON pod_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pods
      JOIN clients ON pods.client_id = clients.id
      WHERE pods.id = pod_members.pod_id
      AND clients.workspace_id = auth.uid()::uuid
    )
  );

CREATE POLICY "Users can add pod members to their pods" ON pod_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pods
      JOIN clients ON pods.client_id = clients.id
      WHERE pods.id = pod_members.pod_id
      AND clients.workspace_id = auth.uid()::uuid
    )
  );

CREATE POLICY "Users can update pod members in their pods" ON pod_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pods
      JOIN clients ON pods.client_id = clients.id
      WHERE pods.id = pod_members.pod_id
      AND clients.workspace_id = auth.uid()::uuid
    )
  );

CREATE POLICY "Users can remove pod members from their pods" ON pod_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM pods
      JOIN clients ON pods.client_id = clients.id
      WHERE pods.id = pod_members.pod_id
      AND clients.workspace_id = auth.uid()::uuid
    )
  );

-- Pod activities policies
CREATE POLICY "Users can view pod activities for their pods" ON pod_activities
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pods
      JOIN clients ON pods.client_id = clients.id
      WHERE pods.id = pod_activities.pod_id
      AND clients.workspace_id = auth.uid()::uuid
    )
  );

CREATE POLICY "Service role can manage pod activities" ON pod_activities
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Update triggers for updated_at
CREATE OR REPLACE FUNCTION update_pods_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pods_updated_at
BEFORE UPDATE ON pods
FOR EACH ROW
EXECUTE FUNCTION update_pods_timestamp();

-- Function to validate minimum pod members
CREATE OR REPLACE FUNCTION validate_pod_member_count()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  min_required INTEGER;
BEGIN
  -- Get current member count and minimum required
  SELECT COUNT(*), p.min_members INTO current_count, min_required
  FROM pod_members pm
  JOIN pods p ON p.id = pm.pod_id
  WHERE pm.pod_id = NEW.pod_id
  AND pm.status = 'active'
  GROUP BY p.min_members;

  -- If this would bring us below minimum, reject
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.status != 'active') THEN
    IF current_count - 1 < min_required THEN
      RAISE EXCEPTION 'Pod must have at least % active members', min_required;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_pod_member_count_trigger
BEFORE UPDATE OR DELETE ON pod_members
FOR EACH ROW
EXECUTE FUNCTION validate_pod_member_count();

-- Function to calculate participation score
CREATE OR REPLACE FUNCTION calculate_participation_score(member_id_param UUID)
RETURNS DECIMAL AS $$
DECLARE
  score DECIMAL;
BEGIN
  SELECT
    CASE
      WHEN total_engagements = 0 THEN 1.00
      ELSE ROUND(completed_engagements::DECIMAL / total_engagements::DECIMAL, 2)
    END INTO score
  FROM pod_members
  WHERE id = member_id_param;

  RETURN COALESCE(score, 1.00);
END;
$$ LANGUAGE plpgsql;

-- Function to auto-suspend low participation members
CREATE OR REPLACE FUNCTION check_participation_and_suspend()
RETURNS void AS $$
BEGIN
  -- Suspend members with participation < 50%
  UPDATE pod_members
  SET
    status = 'suspended',
    suspended_at = NOW(),
    suspension_reason = 'Participation below 50% threshold'
  WHERE
    status = 'active'
    AND participation_score < 0.50
    AND id IN (
      SELECT pm.id
      FROM pod_members pm
      JOIN pods p ON p.id = pm.pod_id
      WHERE pm.participation_score < p.suspension_threshold
    );
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE pods IS 'Engagement pod groups for automated LinkedIn interaction (minimum 3 members)';
COMMENT ON TABLE pod_members IS 'Members of engagement pods with participation tracking';
COMMENT ON TABLE pod_activities IS 'Tracks all scheduled and completed pod engagement activities';

COMMENT ON COLUMN pod_members.participation_score IS 'Ratio of completed to total engagements (0.00 to 1.00)';
COMMENT ON COLUMN pod_members.status IS 'active: participating, suspended: auto-suspended for low participation, left: manually left pod';
COMMENT ON COLUMN pods.participation_threshold IS 'Minimum participation rate before warnings (default 0.80 = 80%)';
COMMENT ON COLUMN pods.suspension_threshold IS 'Participation rate that triggers auto-suspension (default 0.50 = 50%)';
