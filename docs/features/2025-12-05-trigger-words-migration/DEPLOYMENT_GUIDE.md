# Trigger Words JSONB Migration - Deployment Guide

**Date:** 2025-12-05
**Status:** Deployment in progress
**Current Branch:** staging (merged from main)
**Commit:** 8148beb - feat: Implement JSONB array migration for trigger words

## Overview

This guide covers deployment and testing of the JSONB array migration for trigger words, which fixes the root cause of trigger words being lost in the campaign workflow.

**Problem Solved:**
- Trigger words were stored in DB but never retrieved when posting to LinkedIn
- This caused no scrape_jobs to be created
- Result: No comment monitoring or DM automation

**Solution Implemented:**
- New `trigger_words` JSONB[] column for type-safe storage
- Migration script to convert legacy data
- Code changes to use new column with backward compatibility fallback

---

## Pre-Deployment Checklist

### 1. Code Review (✅ Complete)
- [x] Migration SQL reviewed and tested
- [x] normalizeTriggerWords() helper function robust
- [x] Campaign API stores both old and new formats
- [x] Campaign details page handles both formats
- [x] Unit tests comprehensive
- [x] Integration tests cover workflow
- [x] Commit message clear

### 2. Staging Build Status
**Staging URL:** https://bravo-revos-git-staging-agro-bros.vercel.app
**Check Status:**
1. Go to Vercel dashboard
2. Select bravo-revos project
3. Look for deployment of commit `8148beb`
4. Verify build completed successfully
5. Check "Deployments" tab for any build errors

**Expected:** Green checkmark, deployment complete

---

## Staging Testing (Phase 1)

### Step 1: Run Database Migration

**Location:** Supabase SQL Editor
**URL:** https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new

**Instructions:**

1. Open the SQL editor
2. Copy entire contents of:
   ```
   supabase/migrations/20251205_trigger_words_jsonb_array.sql
   ```
3. Paste into SQL editor
4. **BEFORE RUNNING:** Create backup table first
   ```sql
   -- Create backup of existing data
   CREATE TABLE campaigns_backup_20251205 AS
   SELECT id, name, trigger_word, trigger_words, created_at, updated_at FROM campaigns;
   ```
5. Click "Run" to execute migration
6. **Wait for completion** - should see "Successfully executed"

**Verification Queries (Run After Migration):**

```sql
-- Check table structure
\d campaigns;
-- Should show: trigger_word TEXT and trigger_words JSONB[]

-- Verify migration data
SELECT COUNT(*) as total_campaigns FROM campaigns;
SELECT COUNT(*) as campaigns_with_words
FROM campaigns
WHERE trigger_words != '{}'::JSONB[];

-- Sample data check
SELECT id, name, trigger_word, trigger_words
FROM campaigns
WHERE trigger_words != '{}'::JSONB[]
LIMIT 5;

-- Verify GIN index created
SELECT indexname FROM pg_indexes
WHERE tablename = 'campaigns'
AND indexname LIKE '%trigger_words%';
```

**Expected Results:**
- Total campaigns: X (whatever you had before)
- Campaigns with words: Should show migrated count
- Sample data shows both `trigger_word` (TEXT) and `trigger_words` (JSONB[])
- GIN index exists: `idx_campaigns_trigger_words_gin`

### Step 2: Test Campaign Creation

**Environment:** https://bravo-revos-git-staging-agro-bros.vercel.app

**Test 1 - New Campaign with Single Trigger Word:**
1. Navigate to `/dashboard/campaigns/new`
2. Fill in campaign details:
   - Name: "Test Migration - Single Word"
   - Description: "Testing single trigger word"
3. Go to Trigger Words step
4. Enter: `GUIDE`
5. Complete wizard and Launch
6. Check browser console for logs

**Expected in Console:**
```
[CAMPAIGN_LAUNCH] Trigger words received:
  triggerWordsArray: undefined
  triggerWord: undefined
  finalTriggerWords: ['GUIDE']
  count: 1

[LINKEDIN_POST_API] Trigger words normalized:
  input: {
    triggerWordsArray: ['GUIDE'],
    triggerWord: undefined
  }
  normalized: ['GUIDE']
  count: 1

[LINKEDIN_POST_API] Created 1 scrape jobs for monitoring
```

**Test 2 - New Campaign with Multiple Trigger Words:**
1. Navigate to `/dashboard/campaigns/new`
2. Fill in campaign details:
   - Name: "Test Migration - Multiple Words"
   - Description: "Testing multiple trigger words"
3. Go to Trigger Words step
4. Enter: `GUIDE`, `SWIPE`, `LEAD` (add each separately)
5. Complete wizard and Launch
6. Check browser console

**Expected in Console:**
```
[CAMPAIGN_LAUNCH] Trigger words received:
  triggerWordsArray: ['GUIDE', 'SWIPE', 'LEAD']
  triggerWord: undefined
  finalTriggerWords: ['GUIDE', 'SWIPE', 'LEAD']
  count: 3

[LINKEDIN_POST_API] Created 3 scrape jobs for monitoring
[LINKEDIN_POST_API] Monitoring for trigger words: ['GUIDE', 'SWIPE', 'LEAD']
```

### Step 3: Verify Database Writes

**In Supabase SQL Editor:**

```sql
-- Check newly created campaign
SELECT id, name, trigger_word, trigger_words
FROM campaigns
WHERE name LIKE 'Test Migration%'
ORDER BY created_at DESC
LIMIT 2;

-- Expected:
-- - trigger_word: 'GUIDE, SWIPE, LEAD' (legacy format)
-- - trigger_words: {'"GUIDE"', '"SWIPE"', '"LEAD"'} (JSONB array format)

-- Check scrape_jobs created
SELECT id, campaign_id, trigger_word, status
FROM scrape_jobs
WHERE campaign_id IN (
  SELECT id FROM campaigns WHERE name LIKE 'Test Migration%'
)
ORDER BY created_at DESC;

-- Expected: One job per trigger word (3 total for multi-word test)
```

### Step 4: Test Campaign Fetch Endpoint

**In Browser Console:**

```javascript
// Test fetching campaign
const response = await fetch('/api/campaigns', {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' }
});
const data = await response.json();
const testCampaign = data.data.find(c => c.name.includes('Test Migration'));

console.log('Campaign:', testCampaign);
console.log('Trigger words:', testCampaign.trigger_words);

// Expected: trigger_words field should contain JSONB array
```

### Step 5: Verify Campaign Details Page

1. Go to `/dashboard/campaigns`
2. Click on "Test Migration - Multiple Words" campaign
3. Scroll to "Trigger Words" section
4. **Verify:** All trigger words displayed correctly (GUIDE, SWIPE, LEAD)
5. Check browser DevTools Network tab:
   - Confirm campaign fetch returned `trigger_words` field
   - Confirm parsing logic worked (should see in React DevTools)

---

## Staging Validation Queries

**Run these in Supabase SQL Editor to validate migration success:**

```sql
-- 1. Table structure validation
\d campaigns;
-- Should show trigger_word TEXT and trigger_words JSONB[]

-- 2. Data validation
SELECT COUNT(*) as total FROM campaigns WHERE trigger_words != '{}'::JSONB[];
SELECT COUNT(*) as expected_migrated FROM campaigns WHERE trigger_word IS NOT NULL AND trigger_word != '';
-- These two numbers should match (or new migrations + old campaigns)

-- 3. Sample data
SELECT id, name, trigger_word, trigger_words FROM campaigns
WHERE trigger_words != '{}'::JSONB[]
LIMIT 10;

-- 4. GIN index verification
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename = 'campaigns' AND indexname LIKE '%trigger_words%';

-- 5. Scrape jobs validation (for campaigns created after migration)
SELECT
  c.id,
  c.name,
  COUNT(sj.id) as scrape_job_count,
  array_agg(DISTINCT sj.trigger_word) as trigger_words_in_jobs
FROM campaigns c
LEFT JOIN scrape_jobs sj ON c.id = sj.campaign_id
WHERE c.created_at >= '2025-12-05'::date
GROUP BY c.id, c.name;
```

---

## Troubleshooting

### Issue: "trigger_words" field not in campaign response

**Symptom:** Campaign GET returns only `trigger_word` (no `trigger_words`)

**Cause:** Migration not run yet, or column not created

**Fix:**
1. Check migration execution in Supabase SQL Editor
2. Run verification queries above
3. If migration not run, execute it now
4. Clear browser cache and retry

### Issue: scrape_jobs not created even though trigger words present

**Symptom:** Campaign created successfully but "No active posts to monitor" error

**Cause:** normalizeTriggerWords not handling JSONB array correctly

**Debug:** In browser console during post creation:
```javascript
// Check what gets sent to API
const body = {
  text: "test",
  campaignId: "xxx",
  triggerWords: campaign.trigger_words // Check this value
};
console.log('Request body:', body);
```

**Fix:** Check `/app/api/linkedin/posts/route.ts` logs for normalization output

### Issue: "Error: check constraint violation"

**Symptom:** Migration fails with constraint error

**Cause:** Check constraint `check_trigger_words_not_null` prevents certain values

**Fix:** Remove or modify constraint if needed:
```sql
-- Temporarily disable
ALTER TABLE campaigns DROP CONSTRAINT check_trigger_words_not_null;

-- Then re-enable after fixing data:
ALTER TABLE campaigns
ADD CONSTRAINT check_trigger_words_not_null
CHECK (trigger_words IS NOT NULL);
```

---

## Production Pre-Deployment Checklist

Before deploying to production, verify:

- [ ] Staging migration tested successfully
- [ ] All diagnostic queries show expected results
- [ ] Campaign creation flow tested with 1, 2, 3+ trigger words
- [ ] Campaign details page displays all trigger words correctly
- [ ] Scrape jobs created correctly
- [ ] Comment monitoring works (at least basic detection)
- [ ] No errors in Vercel staging deployment logs
- [ ] No performance degradation on staging
- [ ] Backward compatibility verified (old campaigns still work)

---

## Production Deployment Steps

**ONLY AFTER staging validation completes:**

### 1. Create PR staging → production
```bash
# Ensure on staging branch and up to date
git checkout staging
git pull origin staging

# Create PR on GitHub
# Title: "fix: Deploy trigger words JSONB migration to production"
# Description: Link to staging validation results
```

### 2. Get PR approval
- Link staging test results
- Confirm production migration plan reviewed
- Get approval from authorized reviewer

### 3. Merge PR and Auto-Deploy
- GitHub will merge and auto-deploy to production
- Monitor Vercel production deployment in dashboard

### 4. Run Migration on Production
- Same steps as staging migration
- On production Supabase instance
- Create backup table first
- Verify with validation queries

### 5. Post-Deployment Verification
- Test production deployment at https://bravo-revos.vercel.app
- Run validation queries
- Monitor error logs for 24 hours
- Check for any API errors or performance issues

---

## Rollback Plan

**If production migration fails:**

### Option 1: Quick Rollback (Remove new column)
```sql
-- Keep old data, just remove new column
ALTER TABLE campaigns DROP COLUMN trigger_words;

-- Revert code to use only trigger_word field
-- (code already has fallback logic, so no code change needed)
```

### Option 2: Full Restore (Restore from backup)
```sql
-- If data is corrupted, restore from backup table
TRUNCATE campaigns CASCADE;

INSERT INTO campaigns
SELECT * FROM campaigns_backup_20251205;

DROP TABLE campaigns_backup_20251205;
```

### Option 3: Emergency PR
```bash
# Create emergency revert branch
git checkout production
git pull origin production
git checkout -b emergency/revert-trigger-words-<timestamp>
git revert <commit-hash>
git push origin emergency/revert-trigger-words-<timestamp>

# Create PR on GitHub with "EMERGENCY" label
# Get immediate approval and merge
```

---

## Success Metrics

**After full deployment, confirm:**

1. **Data Integrity**
   - All existing campaigns retain trigger words
   - New campaigns store in both formats
   - No data loss detected

2. **Feature Functionality**
   - New campaigns with trigger words create scrape_jobs
   - Comment monitoring detects trigger words
   - DM automation replies to matching comments

3. **Performance**
   - Campaign fetch still <100ms
   - Trigger word searches use GIN index (checked via EXPLAIN ANALYZE)
   - No increased database load

4. **Backward Compatibility**
   - Old campaigns (before migration) still work
   - Campaign details page displays old format correctly
   - LinkedIn posting still works with legacy data

---

## Timeline

- **Dec 05 AM:** Staging deployment (push to staging)
- **Dec 05 PM:** Staging migration and testing
- **Dec 06 AM:** Production PR and approval
- **Dec 06 AM:** Production deployment
- **Dec 06-07:** Production monitoring (24 hours)
- **Dec 07:** Finalize and cleanup

---

**Created:** 2025-12-05
**Last Updated:** 2025-12-05
**Status:** Ready for Staging Testing
