-- Supabase Project: trdoainmejxanrownbuz
-- Click: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new

-- Add service role bypass policies to cartridge tables
-- These tables were created in migration 037 AFTER migration 009 established service role policies

-- CONTEXT:
-- Migration 009 added service role bypass policies to all existing tables (agencies, clients, etc.)
-- Migration 037 created brand_cartridges, style_cartridges, preference_cartridges, instruction_cartridges
-- BUT migration 037 did NOT include service role bypass policies
-- This causes service role queries to fail because:
--   1. Service role client has no JWT token (cookies disabled)
--   2. RLS policy checks auth.uid() = user_id
--   3. auth.uid() returns NULL for service role requests
--   4. NULL = user_id is always FALSE
--   5. No rows returned
--
-- SOLUTION: Add service role bypass policies (same pattern as migration 009)

-- Brand Cartridges
ALTER TABLE brand_cartridges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role access brand cartridges"
  ON brand_cartridges FOR ALL
  USING (auth.role() = 'service_role');

-- Style Cartridges
ALTER TABLE style_cartridges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role access style cartridges"
  ON style_cartridges FOR ALL
  USING (auth.role() = 'service_role');

-- Preference Cartridges
ALTER TABLE preference_cartridges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role access preference cartridges"
  ON preference_cartridges FOR ALL
  USING (auth.role() = 'service_role');

-- Instruction Cartridges
ALTER TABLE instruction_cartridges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role access instruction cartridges"
  ON instruction_cartridges FOR ALL
  USING (auth.role() = 'service_role');
