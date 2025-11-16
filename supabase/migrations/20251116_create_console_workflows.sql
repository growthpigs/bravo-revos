-- Supabase Project: trdoainmejxanrownbuz
-- Click: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new

/**
 * Console Workflows Table
 *
 * Stores workflow definitions as JSON to eliminate hardcoded workflow logic.
 * AgentKit loads workflows from this table to determine how to handle commands.
 *
 * Architecture: Workflow JSON → AgentKit → Execution
 * NO hardcoded logic in route handlers.
 */

CREATE TABLE IF NOT EXISTS console_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Workflow identification
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  workflow_type TEXT NOT NULL CHECK (workflow_type IN ('command', 'navigation', 'content_generation', 'orchestration')),

  -- Workflow definition (JSON)
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Triggers (what activates this workflow)
  triggers JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Example: {"commands": ["write"], "patterns": ["^write\\W*$"]}

  -- Decision options (buttons, choices)
  decision_options JSONB DEFAULT '[]'::jsonb,
  -- Example: [{"label": "Topic 1", "value": "topic_1", "icon": "brain"}]

  -- Prompts and instructions
  prompts JSONB DEFAULT '{}'::jsonb,
  -- Example: {"topic_generation": "Generate 4 topics...", "confirmation": "Any personal story?"}

  -- Output configuration
  output_config JSONB DEFAULT '{}'::jsonb,
  -- Example: {"target": "working_document", "clear_previous": true}

  -- Multi-tenant support
  tenant_scope TEXT DEFAULT 'system' CHECK (tenant_scope IN ('system', 'agency', 'client', 'user')),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,

  -- Status
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_console_workflows_name ON console_workflows(name);
CREATE INDEX idx_console_workflows_type ON console_workflows(workflow_type);
CREATE INDEX idx_console_workflows_active ON console_workflows(is_active) WHERE is_active = true;
CREATE INDEX idx_console_workflows_tenant ON console_workflows(tenant_scope, agency_id, client_id);

-- RLS Policies
ALTER TABLE console_workflows ENABLE ROW LEVEL SECURITY;

-- System workflows: readable by all authenticated users
CREATE POLICY "System workflows are readable by all"
  ON console_workflows
  FOR SELECT
  TO authenticated
  USING (tenant_scope = 'system' AND is_active = true);

-- Agency workflows: readable by agency members
CREATE POLICY "Agency workflows are readable by agency members"
  ON console_workflows
  FOR SELECT
  TO authenticated
  USING (
    tenant_scope = 'agency'
    AND is_active = true
    AND agency_id IN (SELECT agency_id FROM users WHERE id = auth.uid())
  );

-- Client workflows: readable by client members
CREATE POLICY "Client workflows are readable by client members"
  ON console_workflows
  FOR SELECT
  TO authenticated
  USING (
    tenant_scope = 'client'
    AND is_active = true
    AND client_id IN (SELECT client_id FROM users WHERE id = auth.uid())
  );

-- Admin: full access to manage workflows
CREATE POLICY "Admins can manage workflows"
  ON console_workflows
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users WHERE user_id = auth.uid()
    )
  );

-- Insert default "write" workflow
INSERT INTO console_workflows (
  name,
  display_name,
  description,
  workflow_type,
  steps,
  triggers,
  prompts,
  output_config,
  tenant_scope
) VALUES (
  'write-linkedin-post',
  'Write LinkedIn Post',
  'AI-powered LinkedIn post generation using brand cartridge and Jon Benson copywriting principles',
  'content_generation',

  -- Steps
  '[
    {
      "step": "load_brand_cartridge",
      "description": "Load user brand cartridge including core messaging"
    },
    {
      "step": "generate_topics",
      "description": "Generate 4 personalized topic headlines using AI",
      "ai_prompt_key": "topic_generation"
    },
    {
      "step": "await_topic_selection",
      "description": "Show topic buttons and wait for user selection"
    },
    {
      "step": "confirmation",
      "description": "Ask if user wants to add personal story",
      "ai_prompt_key": "confirmation"
    },
    {
      "step": "generate_post",
      "description": "Generate LinkedIn post using brand/style context",
      "ai_prompt_key": "post_generation"
    },
    {
      "step": "display_output",
      "description": "Show generated post in working document area"
    }
  ]'::jsonb,

  -- Triggers
  '{
    "commands": ["write"],
    "patterns": ["^write\\\\W*$"],
    "case_insensitive": true
  }'::jsonb,

  -- Prompts
  '{
    "topic_generation": "You are a world-class content strategist trained in Jon Benson''s copywriting methodology.\\n\\nBRAND CONTEXT:\\n- Industry: {industry}\\n- Target Audience: {target_audience}\\n- Brand Voice: {brand_voice}\\n{core_messaging}\\n\\nTASK: Generate 4 compelling LinkedIn POST topic headlines (thought leadership content).\\n\\nCRITICAL CONSTRAINTS:\\n- These are POSTS, NOT campaigns or advertisements\\n- Focus on: insights, stories, lessons, industry trends, personal experiences\\n- FORBIDDEN: campaign creation topics, ''select from'' prompts, promotional/ad content\\n- FORBIDDEN: Any mention of ''campaigns'', ''existing campaigns'', ''create campaign''\\n\\nJon Benson Principles to Apply:\\n- Create curiosity gaps (tease the payoff)\\n- Use pattern interrupts (challenge assumptions)\\n- Future pace (paint the transformation)\\n- Agreeance principle (validate their struggle first)\\n\\nREQUIREMENTS:\\n- Each headline should be a complete, compelling hook (not generic categories)\\n- Target THIS specific audience''s pain points and desires\\n- Use specific language from their industry\\n- Make them feel ''this is written for ME''\\n\\nFORMAT: Return ONLY a JSON array of 4 headline strings. No explanations.",

    "confirmation": "Perfect! Writing about: \\"{topic}\\"\\n\\nAny personal story or specific angle to add?",

    "post_generation": "You are an expert LinkedIn content creator. Generate engaging LinkedIn posts that drive engagement.\\n\\n{brand_context}\\n\\n{style_context}\\n\\nRULES:\\n- Hook in first line (not ''Imagine...'' or ''Picture this...'')\\n- 3-5 short paragraphs max\\n- Include relevant emoji strategically (not excessive)\\n- End with engagement question or call-to-action\\n- Professional yet conversational\\n- NO hashtags unless brand uses them"
  }'::jsonb,

  -- Output configuration
  '{
    "target": "working_document",
    "clear_previous": true,
    "fullscreen": true,
    "format": "markdown"
  }'::jsonb,

  'system'
) ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE console_workflows IS 'Workflow definitions loaded by AgentKit to eliminate hardcoded logic. Each workflow defines triggers, steps, prompts, and output configuration.';
COMMENT ON COLUMN console_workflows.steps IS 'Ordered array of workflow steps executed by AgentKit';
COMMENT ON COLUMN console_workflows.triggers IS 'Conditions that activate this workflow (commands, patterns, contexts)';
COMMENT ON COLUMN console_workflows.prompts IS 'AI prompts used at different workflow steps, supporting template variables';
COMMENT ON COLUMN console_workflows.output_config IS 'Configuration for where and how to display workflow output';
