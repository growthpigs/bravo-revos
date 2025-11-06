-- F-01: AgentKit Campaign Orchestration Tables

-- AgentKit Orchestration Decisions
CREATE TABLE IF NOT EXISTS agentkit_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  decision_type TEXT NOT NULL,
  strategy JSONB NOT NULL,
  activities_scheduled INTEGER DEFAULT 0,
  executed_at TIMESTAMPTZ,
  success BOOLEAN,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AgentKit Message Optimizations
CREATE TABLE IF NOT EXISTS agentkit_optimizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL,
  original_message TEXT NOT NULL,
  optimized_message TEXT NOT NULL,
  confidence_score DECIMAL(3, 2),
  variants TEXT[],
  selected_variant TEXT,
  performance_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AgentKit Performance Analyses
CREATE TABLE IF NOT EXISTS agentkit_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  time_range TEXT NOT NULL,
  analysis JSONB NOT NULL,
  overall_score INTEGER,
  insights TEXT[],
  recommendations TEXT[],
  next_actions JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_agentkit_decisions_campaign ON agentkit_decisions(campaign_id);
CREATE INDEX idx_agentkit_decisions_post ON agentkit_decisions(post_id);
CREATE INDEX idx_agentkit_decisions_created ON agentkit_decisions(created_at DESC);

CREATE INDEX idx_agentkit_optimizations_campaign ON agentkit_optimizations(campaign_id);
CREATE INDEX idx_agentkit_optimizations_type ON agentkit_optimizations(message_type);
CREATE INDEX idx_agentkit_optimizations_created ON agentkit_optimizations(created_at DESC);

CREATE INDEX idx_agentkit_analyses_campaign ON agentkit_analyses(campaign_id);
CREATE INDEX idx_agentkit_analyses_created ON agentkit_analyses(created_at DESC);

-- Enable RLS
ALTER TABLE agentkit_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agentkit_optimizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agentkit_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users view own campaign decisions"
  ON agentkit_decisions FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns
      WHERE client_id IN (
        SELECT client_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users view own campaign optimizations"
  ON agentkit_optimizations FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns
      WHERE client_id IN (
        SELECT client_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users view own campaign analyses"
  ON agentkit_analyses FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns
      WHERE client_id IN (
        SELECT client_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Service role full access decisions"
  ON agentkit_decisions FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access optimizations"
  ON agentkit_optimizations FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access analyses"
  ON agentkit_analyses FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Triggers
CREATE TRIGGER update_agentkit_decisions_updated_at
  BEFORE UPDATE ON agentkit_decisions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agentkit_optimizations_updated_at
  BEFORE UPDATE ON agentkit_optimizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE agentkit_decisions IS 'AI-driven orchestration decisions';
COMMENT ON TABLE agentkit_optimizations IS 'AI-optimized messages';
COMMENT ON TABLE agentkit_analyses IS 'AI performance analyses';
