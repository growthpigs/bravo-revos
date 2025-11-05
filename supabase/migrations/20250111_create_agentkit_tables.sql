-- ========================================
-- F-01: AgentKit Campaign Orchestration Tables
-- ========================================

-- AgentKit Orchestration Decisions
-- Stores AI decisions about campaign execution
CREATE TABLE IF NOT EXISTS agentkit_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  decision_type TEXT NOT NULL, -- 'engagement_strategy', 'timing', 'targeting'
  strategy JSONB NOT NULL, -- Full strategy object from agent
  activities_scheduled INTEGER DEFAULT 0,
  executed_at TIMESTAMPTZ,
  success BOOLEAN,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AgentKit Message Optimizations
-- Stores AI-optimized message versions
CREATE TABLE IF NOT EXISTS agentkit_optimizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL, -- 'post', 'dm_initial', 'dm_confirmation'
  original_message TEXT NOT NULL,
  optimized_message TEXT NOT NULL,
  confidence_score DECIMAL(3, 2), -- 0.00 - 1.00
  variants TEXT[], -- Array of A/B test variants
  selected_variant TEXT, -- Which variant was used
  performance_data JSONB, -- Actual performance metrics if tracked
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AgentKit Performance Analyses
-- Stores AI-generated campaign analytics
CREATE TABLE IF NOT EXISTS agentkit_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  time_range TEXT NOT NULL, -- '7d', '30d', etc.
  analysis JSONB NOT NULL, -- Complete analysis object from agent
  overall_score INTEGER, -- 0-100 performance score
  insights TEXT[], -- Key insights array
  recommendations TEXT[], -- Action recommendations array
  next_actions JSONB, -- Prioritized next actions
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_agentkit_decisions_campaign ON agentkit_decisions(campaign_id);
CREATE INDEX idx_agentkit_decisions_post ON agentkit_decisions(post_id);
CREATE INDEX idx_agentkit_decisions_created ON agentkit_decisions(created_at DESC);

CREATE INDEX idx_agentkit_optimizations_campaign ON agentkit_optimizations(campaign_id);
CREATE INDEX idx_agentkit_optimizations_type ON agentkit_optimizations(message_type);
CREATE INDEX idx_agentkit_optimizations_created ON agentkit_optimizations(created_at DESC);

CREATE INDEX idx_agentkit_analyses_campaign ON agentkit_analyses(campaign_id);
CREATE INDEX idx_agentkit_analyses_created ON agentkit_analyses(created_at DESC);

-- Row Level Security (RLS)
ALTER TABLE agentkit_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agentkit_optimizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agentkit_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see AgentKit data for their own campaigns
CREATE POLICY "Users can view their campaign decisions"
  ON agentkit_decisions FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns
      WHERE client_id IN (
        SELECT client_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view their campaign optimizations"
  ON agentkit_optimizations FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns
      WHERE client_id IN (
        SELECT client_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view their campaign analyses"
  ON agentkit_analyses FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns
      WHERE client_id IN (
        SELECT client_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Service role can do everything
CREATE POLICY "Service role full access to decisions"
  ON agentkit_decisions FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access to optimizations"
  ON agentkit_optimizations FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access to analyses"
  ON agentkit_analyses FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Updated_at trigger
CREATE TRIGGER update_agentkit_decisions_updated_at
  BEFORE UPDATE ON agentkit_decisions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agentkit_optimizations_updated_at
  BEFORE UPDATE ON agentkit_optimizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE agentkit_decisions IS 'AI-driven orchestration decisions for campaigns';
COMMENT ON TABLE agentkit_optimizations IS 'AI-optimized message versions with performance tracking';
COMMENT ON TABLE agentkit_analyses IS 'AI-generated performance analyses and recommendations';
