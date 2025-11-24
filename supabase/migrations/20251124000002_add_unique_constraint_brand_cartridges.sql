-- Supabase Project: trdoainmejxanrownbuz
-- Click: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new
--
-- ADD UNIQUE CONSTRAINT: Prevent multiple brand cartridges per user
--
-- PREREQUISITE: Run cleanup script first (20251124000001_cleanup_old_brand_cartridges.sql)
--                This ensures each user has exactly ONE cartridge before adding constraint
--
-- PROBLEM: Users could create multiple brand_cartridges, causing confusion
-- SOLUTION: Database-level unique constraint on user_id column
--
-- AFTER THIS MIGRATION:
-- ✅ Users can UPDATE their existing cartridge
-- ❌ Users CANNOT create a second cartridge
-- ✅ System always loads the ONE cartridge for each user

-- Step 1: Verify no duplicate user_ids exist (RUN THIS FIRST)
SELECT
  user_id,
  COUNT(*) as cartridge_count
FROM brand_cartridges
GROUP BY user_id
HAVING COUNT(*) > 1;
--
-- Expected result: No rows
-- If you see rows, run cleanup script first!

-- Step 2: Add unique constraint (RUN AFTER VERIFICATION)
ALTER TABLE brand_cartridges
  ADD CONSTRAINT brand_cartridges_user_id_unique
  UNIQUE (user_id);

-- Step 3: Add helpful comment
COMMENT ON CONSTRAINT brand_cartridges_user_id_unique
  ON brand_cartridges
  IS 'Ensures each user has exactly ONE brand cartridge. Users should UPDATE existing cartridge instead of creating new ones.';

-- Step 4: Verify constraint was added
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'brand_cartridges'::regclass
  AND conname = 'brand_cartridges_user_id_unique';
--
-- Expected result: One row showing the unique constraint
