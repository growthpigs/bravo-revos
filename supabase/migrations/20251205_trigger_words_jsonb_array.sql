-- Supabase Project: trdoainmejxanrownbuz
-- Migration: Convert trigger_word TEXT to trigger_words JSONB[] array
-- Purpose: Fix trigger words data loss when fetching campaigns
-- This enables proper multiple trigger word support for comment monitoring
-- Click: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new

-- ============================================================================
-- STEP 1: Create backup table (safety first)
-- ============================================================================
CREATE TABLE IF NOT EXISTS campaigns_trigger_word_backup AS
SELECT
  id,
  name,
  trigger_word,
  created_at,
  updated_at
FROM campaigns;

-- ============================================================================
-- STEP 2: Add new JSONB[] column for trigger words (backward compatible)
-- ============================================================================
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS trigger_words JSONB[] DEFAULT '{}'::JSONB[];

-- ============================================================================
-- STEP 3: Migrate existing data from TEXT to JSONB[] array
-- ============================================================================
-- Handle NULL values (set to empty array)
UPDATE campaigns
SET trigger_words = '{}'::JSONB[]
WHERE trigger_word IS NULL OR trigger_word = '';

-- Handle non-empty comma-separated strings
-- Split by comma, trim whitespace, remove empty strings, convert to JSONB array
UPDATE campaigns
SET trigger_words = array_agg(
  to_jsonb(TRIM(word))
  ORDER BY TRIM(word)
)
FROM (
  SELECT
    campaigns.id,
    TRIM(unnest(string_to_array(trigger_word, ','))) as word
  FROM campaigns
  WHERE trigger_word IS NOT NULL
    AND trigger_word != ''
    AND LENGTH(TRIM(trigger_word)) > 0
) AS words
WHERE campaigns.id = words.id
GROUP BY campaigns.id;

-- ============================================================================
-- STEP 4: Create GIN index for efficient querying
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_campaigns_trigger_words_gin
ON campaigns USING GIN (trigger_words);

-- ============================================================================
-- STEP 5: Add check constraint for data integrity
-- ============================================================================
ALTER TABLE campaigns
ADD CONSTRAINT check_trigger_words_not_null
CHECK (trigger_words IS NOT NULL AND trigger_words != '{}'::JSONB[]);

-- ============================================================================
-- STEP 6: Add comment documenting the new column
-- ============================================================================
COMMENT ON COLUMN campaigns.trigger_words IS
  'Array of trigger words (JSONB format) for comment monitoring. Each word triggers DM automation when found in LinkedIn comments. Example: ["GUIDE", "SWIPE", "LEAD"]. Replaces legacy trigger_word TEXT field.';

-- ============================================================================
-- MIGRATION VERIFICATION (run these queries to verify)
-- ============================================================================
-- SELECT COUNT(*) as campaigns_with_trigger_words
-- FROM campaigns
-- WHERE trigger_words != '{}'::JSONB[];
--
-- SELECT id, name, trigger_word, trigger_words
-- FROM campaigns
-- WHERE trigger_word IS NOT NULL
-- LIMIT 10;
--
-- SELECT COUNT(*) as total_migrated
-- FROM campaigns
-- WHERE trigger_words != '{}'::JSONB[] AND trigger_word IS NOT NULL;

-- ============================================================================
-- NOTE: Old trigger_word TEXT column retained for backward compatibility
-- It will be removed in a future migration after 2025-12-12 (1 week)
-- ============================================================================
