-- Supabase Project: kvjcidxbyimoswntpjcp
-- Click: https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp/sql/new
--
-- Console 8-Cartridge System
--
-- ROLLBACK: To revert, run:
--   ALTER TABLE console_prompts
--     DROP COLUMN IF EXISTS operations_cartridge,
--     DROP COLUMN IF EXISTS system_cartridge,
--     DROP COLUMN IF EXISTS context_cartridge,
--     DROP COLUMN IF EXISTS skills_cartridge,
--     DROP COLUMN IF EXISTS plugins_cartridge,
--     DROP COLUMN IF EXISTS knowledge_cartridge,
--     DROP COLUMN IF EXISTS memory_cartridge,
--     DROP COLUMN IF EXISTS ui_cartridge;

-- ==================================================
-- Add 8 Cartridge Columns
-- ==================================================

ALTER TABLE console_prompts
  ADD COLUMN IF NOT EXISTS operations_cartridge JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS system_cartridge JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS context_cartridge JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS skills_cartridge JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS plugins_cartridge JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS knowledge_cartridge JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS memory_cartridge JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ui_cartridge JSONB DEFAULT '{}'::jsonb;

-- ==================================================
-- Add Indexes for Query Performance
-- ==================================================

CREATE INDEX IF NOT EXISTS idx_console_prompts_operations
  ON console_prompts USING gin(operations_cartridge);

CREATE INDEX IF NOT EXISTS idx_console_prompts_system
  ON console_prompts USING gin(system_cartridge);

CREATE INDEX IF NOT EXISTS idx_console_prompts_ui
  ON console_prompts USING gin(ui_cartridge);

-- ==================================================
-- UPSERT Marketing Console v1 (No Silent Failures)
-- ==================================================

INSERT INTO console_prompts (
  name,
  display_name,
  system_instructions,
  version,
  is_active,
  operations_cartridge,
  system_cartridge,
  context_cartridge,
  skills_cartridge,
  plugins_cartridge,
  knowledge_cartridge,
  memory_cartridge,
  ui_cartridge
) VALUES (
  'marketing-console-v1',
  'Marketing Console V1',
  'Legacy system prompt for backward compatibility',
  2,
  true,

  -- Operations
  jsonb_build_object(
    'prd', 'RevOS is an AI-powered LinkedIn growth platform with pod amplification, campaign management, and lead capture.',
    'userStories', jsonb_build_array(
      'As a campaign creator, I want my posts automatically amplified by my pod',
      'As a pod member, I want to easily support my pod''s content',
      'As a user, I want to capture leads through LinkedIn DMs'
    ),
    'requirements', 'Pod coordination, campaign management, email extraction, Mem0 memory, AgentKit orchestration'
  ),

  -- System
  jsonb_build_object(
    'systemPrompt', 'You are RevOS Intelligence, an AI co-founder for LinkedIn growth. Help users create campaigns, coordinate pods, and capture leads through natural conversation.',
    'role', 'Strategic marketing partner with deep LinkedIn expertise and proactive approach',
    'rules', 'AGENCY PRINCIPLES: Use judgment over rigid scripts. Default to action when user intent is clear. Ask clarifying questions only when truly ambiguous. Provide inline buttons 80% of the time. Navigate user to relevant pages when helpful.'
  ),

  -- Context
  jsonb_build_object(
    'domain', 'LinkedIn B2B marketing, lead generation, pod amplification, and social selling',
    'appFeatures', jsonb_build_array(
      'Campaigns: Create and manage LinkedIn outreach with AI assistance',
      'Offers: Build lead magnets (PDFs, templates) with AI generation',
      'Pods: Coordinate resharing with network members for viral reach',
      'Analytics: Track performance, leads captured, pod participation'
    ),
    'structure', 'Agency → Client → User hierarchy. Multi-tenant with RLS. AgentKit + Mem0 core.'
  ),

  -- Skills
  jsonb_build_object(
    'chips', jsonb_build_array(
      jsonb_build_object('name', 'create_campaign', 'description', 'Create new LinkedIn campaign with AI'),
      jsonb_build_object('name', 'schedule_post', 'description', 'Schedule LinkedIn post for optimal time'),
      jsonb_build_object('name', 'extract_email', 'description', 'Extract email from LinkedIn DM'),
      jsonb_build_object('name', 'alert_pod', 'description', 'Send reshare alert to pod members'),
      jsonb_build_object('name', 'create_offer', 'description', 'Generate lead magnet with AI')
    )
  ),

  -- Plugins
  jsonb_build_object(
    'enabled', jsonb_build_array('playwright', 'sentry', 'supabase', 'archon'),
    'config', jsonb_build_object(
      'playwright', jsonb_build_object('headless', true, 'purpose', 'LinkedIn automation'),
      'sentry', jsonb_build_object('environment', 'production', 'purpose', 'Error tracking'),
      'supabase', jsonb_build_object('purpose', 'Database operations'),
      'archon', jsonb_build_object('purpose', 'Multi-agent orchestration')
    ),
    'required', jsonb_build_array('playwright', 'sentry', 'supabase', 'archon'),
    'description', 'MCP servers must be configured and working. Non-negotiable.'
  ),

  -- Knowledge
  jsonb_build_object(
    'documentation', 'See /docs for RevOS architecture, /docs/AGENTKIT_ENFORCEMENT.md for rules',
    'examples', jsonb_build_array(
      'Campaign creation: "Create campaign targeting CTOs in SaaS with lead magnet offer"',
      'Pod coordination: "Alert my pod to reshare my latest post about AI trends"',
      'Lead capture: "Extract emails from DM conversations about my LinkedIn guide"'
    ),
    'bestPractices', 'Always verify user intent before major actions. Provide specific next steps with inline buttons. Use Mem0 to remember preferences and past campaigns. Keep responses scannable with bullets when listing options.'
  ),

  -- Memory
  jsonb_build_object(
    'scoping', 'agencyId::clientId::userId (3-tier isolation via Mem0)',
    'whatToRemember', jsonb_build_array(
      'User communication style and preferences',
      'Past campaigns, performance, what worked',
      'Pod relationships and activity patterns',
      'Lead capture success rates',
      'Content topics user focuses on'
    ),
    'contextInjection', 'Retrieve relevant memories before each request. Include in system prompt as context. Update memories after significant interactions.',
    'guidelines', 'Remember outcomes, not just actions. Focus on what helps user succeed.'
  ),

  -- UI (CRITICAL)
  jsonb_build_object(
    'inlineButtons', jsonb_build_object(
      'style', 'JetBrains Mono, 9pt, UPPERCASE, black bg (#000), white text (#FFF), 4px padding, left-justified',
      'frequency', '80% of responses should include action buttons',
      'placement', 'Directly below AI message, stacked vertically, jagged edges (left-justified)',
      'examples', jsonb_build_array(
        'User: "I have a post about AI" → [EDIT POST] [ADD IMAGE] [POST TO LINKEDIN]',
        'User: "Write article" → [TECH TRENDS] [LEADERSHIP] [CASE STUDY]',
        'User: "Create campaign" → [LEAD MAGNET] [DIRECT OUTREACH] [POD BOOST]'
      )
    ),
    'buttonActions', jsonb_build_object(
      'navigation', 'Clicking button navigates to relevant page (campaigns, offers, system-health, etc.)',
      'verification', 'User SEES page change - builds trust and transparency',
      'philosophy', 'Chat is primary. Buttons are shortcuts. User never NEEDS buttons but they help.'
    ),
    'fullscreenTriggers', jsonb_build_object(
      'when', jsonb_build_array('write', 'create', 'draft', 'compose'),
      'never', jsonb_build_array('hi', 'hello', 'thanks', 'yes', 'no', 'ok', 'sure')
    ),
    'principle', 'Agent decides UI dynamically. Conversational by default. Fullscreen only when explicitly writing. Inline buttons almost always.'
  )
)
ON CONFLICT (name) DO UPDATE SET
  operations_cartridge = EXCLUDED.operations_cartridge,
  system_cartridge = EXCLUDED.system_cartridge,
  context_cartridge = EXCLUDED.context_cartridge,
  skills_cartridge = EXCLUDED.skills_cartridge,
  plugins_cartridge = EXCLUDED.plugins_cartridge,
  knowledge_cartridge = EXCLUDED.knowledge_cartridge,
  memory_cartridge = EXCLUDED.memory_cartridge,
  ui_cartridge = EXCLUDED.ui_cartridge,
  version = EXCLUDED.version,
  updated_at = NOW();

-- ==================================================
-- Verify RLS Policies Cover New Columns
-- ==================================================

-- Check that SELECT policy allows reading new columns
DO $$
BEGIN
  -- Policies already cover entire row, including new columns
  -- No changes needed, but verify policies exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'console_prompts' AND policyname = 'Anyone can read active console prompts'
  ) THEN
    RAISE EXCEPTION 'Missing RLS policy: Anyone can read active console prompts';
  END IF;
END $$;

-- ==================================================
-- Comments
-- ==================================================

COMMENT ON COLUMN console_prompts.operations_cartridge IS 'PRD, user stories, requirements (JSONB)';
COMMENT ON COLUMN console_prompts.system_cartridge IS 'System prompt, role, behavioral rules (JSONB)';
COMMENT ON COLUMN console_prompts.context_cartridge IS 'Domain knowledge, app structure (JSONB)';
COMMENT ON COLUMN console_prompts.skills_cartridge IS 'Available chips/capabilities (JSONB)';
COMMENT ON COLUMN console_prompts.plugins_cartridge IS 'MCP server configuration (JSONB)';
COMMENT ON COLUMN console_prompts.knowledge_cartridge IS 'Docs, examples, best practices (JSONB)';
COMMENT ON COLUMN console_prompts.memory_cartridge IS 'Mem0 scoping and guidelines (JSONB)';
COMMENT ON COLUMN console_prompts.ui_cartridge IS 'Inline button config and UI principles (JSONB)';
