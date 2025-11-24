-- Supabase Project: trdoainmejxanrownbuz
-- Click: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new
--
-- CLEANUP: Remove old/duplicate brand cartridges (keep newest only per user)
--
-- PROBLEM: Users may have multiple brand_cartridges due to previous bugs
-- SOLUTION: Keep only the NEWEST cartridge (by updated_at) for each user
--
-- SAFETY: This script uses a CTE to identify old cartridges BEFORE deleting
-- RUN THIS: Only after confirming you understand what will be deleted

-- Step 1: PREVIEW what will be deleted (DO THIS FIRST)
WITH ranked_cartridges AS (
  SELECT
    id,
    user_id,
    name,
    company_name,
    industry,
    updated_at,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY updated_at DESC
    ) AS rank
  FROM brand_cartridges
),
old_cartridges AS (
  SELECT * FROM ranked_cartridges WHERE rank > 1
)
SELECT
  id,
  user_id,
  name,
  company_name,
  industry,
  updated_at,
  'WILL BE DELETED' AS action
FROM old_cartridges
ORDER BY user_id, updated_at DESC;

-- Step 2: DELETE old cartridges (RUN THIS AFTER REVIEWING PREVIEW)
-- UNCOMMENT THE LINES BELOW TO EXECUTE DELETE:
/*
WITH ranked_cartridges AS (
  SELECT
    id,
    user_id,
    updated_at,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY updated_at DESC
    ) AS rank
  FROM brand_cartridges
),
old_cartridges AS (
  SELECT id FROM ranked_cartridges WHERE rank > 1
)
DELETE FROM brand_cartridges
WHERE id IN (SELECT id FROM old_cartridges);
*/

-- Step 3: VERIFY cleanup worked
-- SELECT
--   user_id,
--   COUNT(*) as cartridge_count,
--   MAX(updated_at) as newest_cartridge
-- FROM brand_cartridges
-- GROUP BY user_id
-- HAVING COUNT(*) > 1;
--
-- Expected result: No rows (each user should have exactly 1 cartridge)
