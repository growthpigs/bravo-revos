# Brand Cartridge Cleanup - SQL Migration Instructions

**Date:** 2025-11-24
**Commit:** 5fb8a29
**Issue:** Write workflow loading old "Tony Hawk" cartridge instead of current brand

---

## Problem Summary

- Write workflow was generating topics about "Tony Hawk" and "life coaching"
- User's current brand (helping young men) was being ignored
- Multiple brand cartridges existed in database (old + new)
- Query had no ordering, so Supabase returned arbitrary cartridge

---

## Code Fixes (Already Deployed)

✅ Added `ORDER BY updated_at DESC` to cartridge query
✅ Enhanced diagnostic logging with cartridge ID, timestamp, preview
✅ Updated BrandCartridge interface with timestamps
✅ Deployed to main: https://bravo-revos-git-main-agro-bros.vercel.app

---

## SQL Migrations (Run These in Supabase)

**Supabase Project:** trdoainmejxanrownbuz
**SQL Editor:** https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new

### Migration 1: Cleanup Old Cartridges

**Step 1 - PREVIEW what will be deleted:**

```sql
-- Copy/paste this into Supabase SQL editor
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
```

**Expected Result:** Should show "Tony Hawk" cartridge and any other old cartridges marked "WILL BE DELETED"

---

**Step 2 - DELETE old cartridges:**

```sql
-- Run this AFTER reviewing the preview above
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
```

**Expected Result:** Query should return number of rows deleted (likely 1-3 old cartridges)

---

**Step 3 - VERIFY cleanup worked:**

```sql
SELECT
  user_id,
  COUNT(*) as cartridge_count,
  MAX(updated_at) as newest_cartridge
FROM brand_cartridges
GROUP BY user_id
HAVING COUNT(*) > 1;
```

**Expected Result:** NO ROWS (each user should have exactly 1 cartridge)

---

### Migration 2: Add Unique Constraint

**Run this AFTER cleanup completes successfully**

**Step 1 - Verify no duplicates exist:**

```sql
SELECT
  user_id,
  COUNT(*) as cartridge_count
FROM brand_cartridges
GROUP BY user_id
HAVING COUNT(*) > 1;
```

**Expected Result:** NO ROWS

---

**Step 2 - Add unique constraint:**

```sql
ALTER TABLE brand_cartridges
  ADD CONSTRAINT brand_cartridges_user_id_unique
  UNIQUE (user_id);
```

**Expected Result:** `ALTER TABLE` success message

---

**Step 3 - Add helpful comment:**

```sql
COMMENT ON CONSTRAINT brand_cartridges_user_id_unique
  ON brand_cartridges
  IS 'Ensures each user has exactly ONE brand cartridge. Users should UPDATE existing cartridge instead of creating new ones.';
```

---

**Step 4 - Verify constraint was added:**

```sql
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'brand_cartridges'::regclass
  AND conname = 'brand_cartridges_user_id_unique';
```

**Expected Result:** One row showing the unique constraint

---

## Testing After Migrations

1. **Go to:** https://bravo-revos-git-main-agro-bros.vercel.app/dashboard
2. **Type:** `write`
3. **Check topics:** Should be based on YOUR current brand, NOT "Tony Hawk" or "life coaching"
4. **Check browser console:** Look for diagnostic logs showing correct brand name/industry
5. **Verify terminal logs:** Should show correct cartridge with ID, timestamp, and content preview

---

## What This Prevents

✅ No more old/deleted cartridges interfering with workflow
✅ Database-level constraint prevents multiple cartridges per user
✅ Always loads NEWEST cartridge when multiple somehow exist
✅ Clear diagnostic logs show exactly which cartridge is being used

---

## Migration Files

- `supabase/migrations/20251124000001_cleanup_old_brand_cartridges.sql`
- `supabase/migrations/20251124000002_add_unique_constraint_brand_cartridges.sql`

Both files are in the repository with detailed comments and safety checks.

---

## Status

- ✅ Code deployed to main
- ⏳ SQL migrations pending (run manually in Supabase)
- 🎯 After migrations: Tony Hawk cartridge issue will be resolved
