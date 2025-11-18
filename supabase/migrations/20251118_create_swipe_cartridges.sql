-- Supabase Project: trdoainmejxanrownbuz
-- Click: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new

-- ============================================================================
-- SWIPE CARTRIDGES TABLE
-- External copywriting examples (Gary Halbert, Jon Benson, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS swipe_cartridges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,

  -- Category for organizing swipes
  category TEXT NOT NULL, -- 'linkedin_hooks', 'email_subjects', 'headlines', 'body_copy'

  -- Examples stored as JSONB array
  examples JSONB DEFAULT '[]'::jsonb,
  -- Structure: [{author, text, notes, performance, source_url}]

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_swipe_cartridges_user_id
  ON swipe_cartridges(user_id)
  WHERE is_active = true;

CREATE INDEX idx_swipe_cartridges_user_category
  ON swipe_cartridges(user_id, category)
  WHERE is_active = true;

CREATE INDEX idx_swipe_cartridges_category
  ON swipe_cartridges(category)
  WHERE is_active = true;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE swipe_cartridges ENABLE ROW LEVEL SECURITY;

-- Users can view their own swipe cartridges
CREATE POLICY "Users can view their own swipe cartridges"
  ON swipe_cartridges
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own swipe cartridges
CREATE POLICY "Users can create their own swipe cartridges"
  ON swipe_cartridges
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own swipe cartridges
CREATE POLICY "Users can update their own swipe cartridges"
  ON swipe_cartridges
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own swipe cartridges
CREATE POLICY "Users can delete their own swipe cartridges"
  ON swipe_cartridges
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- SEED DATA - Legendary Copywriters
-- ============================================================================

COMMENT ON TABLE swipe_cartridges IS 'External copywriting examples from legendary marketers for users to learn from and emulate';

-- Seed data will be added via application code or admin UI
-- Example structure for reference:
/*
INSERT INTO swipe_cartridges (user_id, name, category, description, examples)
VALUES (
  auth.uid(),
  'Gary Halbert - LinkedIn Hooks',
  'linkedin_hooks',
  'Legendary copywriter Gary Halbert''s best hooks adapted for LinkedIn',
  jsonb_build_array(
    jsonb_build_object(
      'author', 'Gary Halbert',
      'text', 'If you''re serious about making money, you need to understand this...',
      'notes', 'Pattern interrupt + high stakes',
      'performance', 'Classic Halbert opening that creates curiosity',
      'source_url', ''
    ),
    jsonb_build_object(
      'author', 'Gary Halbert',
      'text', 'Most people will never discover this secret to wealth...',
      'notes', 'Exclusivity + mystery',
      'performance', 'Creates FOMO and intrigue',
      'source_url', ''
    )
  )
);
*/
