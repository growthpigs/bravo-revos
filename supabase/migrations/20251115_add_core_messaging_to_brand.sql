-- Supabase Project: trdoainmejxanrownbuz
-- Click: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new
-- Add core messaging field to brand_cartridges for 10k+ word marketing messaging

-- Add core_messaging column for comprehensive marketing content
ALTER TABLE brand_cartridges
ADD COLUMN IF NOT EXISTS core_messaging TEXT;

-- Add comment for documentation
COMMENT ON COLUMN brand_cartridges.core_messaging IS 'Comprehensive marketing messaging including mission, vision, target audience, core values, avatar stories, market narrative, promises, objections, and marketing frameworks (10k+ words)';
