-- ============================================================
-- CARTRIDGE SYSTEM: 4-TIER VOICE HIERARCHY
-- ============================================================
-- System → Agency → Client → Campaign/User

-- ============================================================
-- CARTRIDGES TABLE
-- ============================================================

CREATE TABLE cartridges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Hierarchy (parent_id determines tier)
  parent_id UUID REFERENCES cartridges(id) ON DELETE CASCADE,

  -- Ownership (determines which tier)
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Cartridge metadata
  name TEXT NOT NULL,
  description TEXT,
  tier TEXT NOT NULL CHECK (tier IN ('system', 'agency', 'client', 'user')),

  -- Voice parameters (JSONB for flexibility)
  voice_params JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Constraints
  CONSTRAINT valid_tier_ownership CHECK (
    (tier = 'system' AND agency_id IS NULL AND client_id IS NULL AND user_id IS NULL) OR
    (tier = 'agency' AND agency_id IS NOT NULL AND client_id IS NULL AND user_id IS NULL) OR
    (tier = 'client' AND client_id IS NOT NULL AND user_id IS NULL) OR
    (tier = 'user' AND user_id IS NOT NULL)
  )
);

-- ============================================================
-- VOICE PARAMETERS STRUCTURE
-- ============================================================
-- voice_params JSONB structure:
-- {
--   "tone": {
--     "formality": "professional|casual|friendly",
--     "enthusiasm": 0-10,
--     "empathy": 0-10
--   },
--   "style": {
--     "sentence_length": "short|medium|long",
--     "paragraph_structure": "single|multi",
--     "use_emojis": boolean,
--     "use_hashtags": boolean
--   },
--   "personality": {
--     "traits": ["authoritative", "helpful", "humorous", "inspiring"],
--     "voice_description": "Brief description of voice character"
--   },
--   "vocabulary": {
--     "complexity": "simple|moderate|advanced",
--     "industry_terms": ["term1", "term2"],
--     "banned_words": ["word1", "word2"],
--     "preferred_phrases": ["phrase1", "phrase2"]
--   },
--   "content_preferences": {
--     "topics": ["topic1", "topic2"],
--     "content_types": ["how-to", "case-study", "opinion"],
--     "call_to_action_style": "direct|subtle|question"
--   }
-- }

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX idx_cartridges_parent_id ON cartridges(parent_id);
CREATE INDEX idx_cartridges_agency_id ON cartridges(agency_id);
CREATE INDEX idx_cartridges_client_id ON cartridges(client_id);
CREATE INDEX idx_cartridges_user_id ON cartridges(user_id);
CREATE INDEX idx_cartridges_tier ON cartridges(tier);
CREATE INDEX idx_cartridges_active ON cartridges(is_active);

-- GIN index for JSONB queries
CREATE INDEX idx_cartridges_voice_params ON cartridges USING GIN (voice_params);

-- ============================================================
-- HELPER FUNCTION: GET RESOLVED VOICE PARAMETERS
-- ============================================================
-- Resolves voice parameters by merging hierarchy: system → agency → client → user

CREATE OR REPLACE FUNCTION get_resolved_voice_params(cartridge_uuid UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result_params JSONB := '{}'::jsonb;
  current_id UUID := cartridge_uuid;
  current_params JSONB;
BEGIN
  -- Build array of cartridge IDs from leaf to root
  WITH RECURSIVE cartridge_hierarchy AS (
    -- Start with the given cartridge
    SELECT id, parent_id, voice_params, tier, 1 as level
    FROM cartridges
    WHERE id = cartridge_uuid

    UNION ALL

    -- Recursively get parents
    SELECT c.id, c.parent_id, c.voice_params, c.tier, ch.level + 1
    FROM cartridges c
    INNER JOIN cartridge_hierarchy ch ON c.id = ch.parent_id
  )
  -- Merge voice_params from root to leaf (system → agency → client → user)
  SELECT INTO result_params
    jsonb_object_agg(key, value)
  FROM (
    SELECT key, value
    FROM cartridge_hierarchy
    CROSS JOIN LATERAL jsonb_each(voice_params)
    ORDER BY level DESC, key
  ) merged;

  RETURN COALESCE(result_params, '{}'::jsonb);
END;
$$;

-- ============================================================
-- HELPER FUNCTION: GET CARTRIDGE HIERARCHY
-- ============================================================
-- Returns full hierarchy path from system to given cartridge

CREATE OR REPLACE FUNCTION get_cartridge_hierarchy(cartridge_uuid UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  tier TEXT,
  level INTEGER
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE hierarchy AS (
    -- Start with the given cartridge
    SELECT c.id, c.name, c.tier, c.parent_id, 1 as level
    FROM cartridges c
    WHERE c.id = cartridge_uuid

    UNION ALL

    -- Recursively get parents
    SELECT c.id, c.name, c.tier, c.parent_id, h.level + 1
    FROM cartridges c
    INNER JOIN hierarchy h ON c.id = h.parent_id
  )
  SELECT h.id, h.name, h.tier, h.level
  FROM hierarchy h
  ORDER BY h.level DESC;
END;
$$;

-- ============================================================
-- HELPER FUNCTION: VALIDATE CARTRIDGE HIERARCHY
-- ============================================================
-- Ensures tier order is correct (system → agency → client → user)

CREATE OR REPLACE FUNCTION validate_cartridge_hierarchy()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  parent_tier TEXT;
BEGIN
  -- If no parent, must be system tier
  IF NEW.parent_id IS NULL THEN
    IF NEW.tier != 'system' THEN
      RAISE EXCEPTION 'Cartridge without parent must be system tier';
    END IF;
    RETURN NEW;
  END IF;

  -- Get parent tier
  SELECT tier INTO parent_tier
  FROM cartridges
  WHERE id = NEW.parent_id;

  -- Validate tier progression
  IF (parent_tier = 'system' AND NEW.tier NOT IN ('agency', 'system')) OR
     (parent_tier = 'agency' AND NEW.tier NOT IN ('client', 'agency')) OR
     (parent_tier = 'client' AND NEW.tier NOT IN ('user', 'client')) OR
     (parent_tier = 'user') THEN
    RAISE EXCEPTION 'Invalid cartridge hierarchy: % cannot be child of %', NEW.tier, parent_tier;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for hierarchy validation
CREATE TRIGGER validate_cartridge_hierarchy_trigger
  BEFORE INSERT OR UPDATE ON cartridges
  FOR EACH ROW
  EXECUTE FUNCTION validate_cartridge_hierarchy();

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Enable RLS
ALTER TABLE cartridges ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view cartridges in their hierarchy
CREATE POLICY "Users can view accessible cartridges"
ON cartridges
FOR SELECT
TO authenticated
USING (
  -- System cartridges are visible to all
  tier = 'system' OR
  -- Agency cartridges visible to agency members
  (tier = 'agency' AND agency_id IN (
    SELECT agency_id FROM users WHERE id = auth.uid()
  )) OR
  -- Client cartridges visible to client members
  (tier = 'client' AND client_id IN (
    SELECT client_id FROM users WHERE id = auth.uid()
  )) OR
  -- User cartridges visible to owner only
  (tier = 'user' AND user_id = auth.uid())
);

-- Policy: Only admins can create/update system cartridges
CREATE POLICY "Admins can manage system cartridges"
ON cartridges
FOR ALL
TO authenticated
USING (
  tier = 'system' AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- Policy: Agency admins can manage agency cartridges
CREATE POLICY "Agency admins can manage agency cartridges"
ON cartridges
FOR ALL
TO authenticated
USING (
  tier = 'agency' AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND agency_id = cartridges.agency_id
    AND role IN ('agency_admin', 'agency_member')
  )
);

-- Policy: Client admins can manage client cartridges
CREATE POLICY "Client admins can manage client cartridges"
ON cartridges
FOR ALL
TO authenticated
USING (
  tier = 'client' AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND client_id = cartridges.client_id
    AND role IN ('client_admin', 'client_member')
  )
);

-- Policy: Users can manage their own user cartridges
CREATE POLICY "Users can manage own cartridges"
ON cartridges
FOR ALL
TO authenticated
USING (
  tier = 'user' AND user_id = auth.uid()
);

-- ============================================================
-- AUTO-UPDATE TIMESTAMP TRIGGER
-- ============================================================

CREATE TRIGGER update_cartridges_updated_at
  BEFORE UPDATE ON cartridges
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SEED DATA: DEFAULT SYSTEM CARTRIDGE
-- ============================================================

INSERT INTO cartridges (
  id,
  name,
  description,
  tier,
  voice_params
) VALUES (
  '00000000-0000-0000-0000-000000000001', -- Fixed UUID for system default
  'Default System Voice',
  'Base voice parameters for all cartridges. Professional, clear, and engaging.',
  'system',
  '{
    "tone": {
      "formality": "professional",
      "enthusiasm": 7,
      "empathy": 8
    },
    "style": {
      "sentence_length": "medium",
      "paragraph_structure": "multi",
      "use_emojis": false,
      "use_hashtags": false
    },
    "personality": {
      "traits": ["authoritative", "helpful", "clear"],
      "voice_description": "Professional and approachable expert"
    },
    "vocabulary": {
      "complexity": "moderate",
      "industry_terms": [],
      "banned_words": [],
      "preferred_phrases": []
    },
    "content_preferences": {
      "topics": [],
      "content_types": ["how-to", "insights", "tips"],
      "call_to_action_style": "direct"
    }
  }'::jsonb
);

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE cartridges IS
'Voice parameter cartridges with 4-tier hierarchy: system → agency → client → user.
Each tier inherits and overrides parameters from parent tiers.';

COMMENT ON FUNCTION get_resolved_voice_params(UUID) IS
'Resolves final voice parameters by merging hierarchy from system to specific cartridge.';

COMMENT ON FUNCTION get_cartridge_hierarchy(UUID) IS
'Returns full hierarchy path from system tier to given cartridge.';

COMMENT ON FUNCTION validate_cartridge_hierarchy() IS
'Validates that cartridge tier hierarchy is correct (no invalid parent-child relationships).';
