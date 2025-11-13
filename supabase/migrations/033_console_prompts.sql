-- Supabase Project: kvjcidxbyimoswntpjcp
-- Click to open in SQL editor: https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp/sql/new
--
-- Console Prompts and Configuration
-- Stores console system instructions and behavior rules for database-driven agent configuration

-- ==================================================
-- Console Prompts Table
-- ==================================================

CREATE TABLE IF NOT EXISTS console_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,

  -- Configuration
  system_instructions TEXT NOT NULL,
  behavior_rules JSONB DEFAULT '[]'::jsonb,

  -- Version tracking
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================================================
-- Indexes
-- ==================================================

CREATE INDEX IF NOT EXISTS idx_console_prompts_name
  ON console_prompts(name);

CREATE INDEX IF NOT EXISTS idx_console_prompts_is_active
  ON console_prompts(is_active);

-- ==================================================
-- Row Level Security (RLS)
-- ==================================================

ALTER TABLE console_prompts ENABLE ROW LEVEL SECURITY;

-- Anyone can read active consoles
CREATE POLICY "Anyone can read active console prompts"
  ON console_prompts FOR SELECT
  USING (is_active = true);

-- Only admins can create consoles
CREATE POLICY "Only authenticated users can manage console prompts"
  ON console_prompts FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Only admins can update consoles
CREATE POLICY "Only authenticated users can update console prompts"
  ON console_prompts FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Only admins can delete consoles
CREATE POLICY "Only authenticated users can delete console prompts"
  ON console_prompts FOR DELETE
  USING (auth.role() = 'authenticated');

-- ==================================================
-- Function to update updated_at
-- ==================================================

CREATE OR REPLACE FUNCTION update_console_prompts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_console_prompts_updated_at
  BEFORE UPDATE ON console_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_console_prompts_updated_at();

-- ==================================================
-- Seed Data
-- ==================================================

-- Insert the default Marketing Console v1
INSERT INTO console_prompts (name, display_name, system_instructions, version, is_active)
VALUES (
  'marketing-console-v1',
  'Marketing Console V1',
  'You are the Marketing Console AI, a specialized assistant for LinkedIn lead generation campaigns.

You help users:
- Create and manage campaigns
- Write compelling LinkedIn content
- Post to LinkedIn
- Monitor DM responses for lead generation
- Track campaign performance

Always be helpful, professional, and focused on driving results.',
  1,
  true
)
ON CONFLICT (name) DO NOTHING;

-- ==================================================
-- Comments
-- ==================================================

COMMENT ON TABLE console_prompts IS 'Stores console system instructions and configuration for database-driven agent behavior';
COMMENT ON COLUMN console_prompts.name IS 'Unique identifier for console (e.g., marketing-console-v1)';
COMMENT ON COLUMN console_prompts.system_instructions IS 'System prompt sent to OpenAI for agent behavior';
COMMENT ON COLUMN console_prompts.behavior_rules IS 'JSON array of behavior rules and constraints';
COMMENT ON COLUMN console_prompts.version IS 'Version number for prompt iterations';
COMMENT ON COLUMN console_prompts.is_active IS 'Whether this console is currently in use';
