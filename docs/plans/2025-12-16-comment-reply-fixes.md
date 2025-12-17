# Comment Reply System - Critical Fixes Required

## Status: VALIDATOR FOUND 3 CRITICAL BUGS

**Confidence BEFORE validation:** 9/10
**Confidence AFTER validation:** 6/10

The validator stress-tested the implementation and found bugs that **will break production**.

---

## ✅ VERIFIED WORKING (No Changes Needed)

| Component | Status | Evidence |
|-----------|--------|----------|
| URN Format Construction | ✅ Solid | `lib/unipile-client.ts:487-513`, 4 unit tests pass |
| Multi-tenant Isolation | ✅ Enforced | `lib/workers/comment-monitor.ts:179-184` |
| Health Check | ✅ Implemented | `app/api/health/route.ts:335-379` |
| 404 Detection Patterns | ✅ Good | 5 patterns checked at lines 674-680 |

---

## ❌ CRITICAL BUG 1: error_count Never Resets (SEVERITY: 10/10)

**This WILL break production within days.**

### Problem
Line 623-629 updates job on success but doesn't reset `error_count` to 0.

### Real-world impact
```
Job gets 2 errors → error_count = 2
Job succeeds 100 times → error_count STILL = 2
Job gets 1 more error → error_count = 3 → AUTO-FAILS PERMANENTLY
```

**Every job will eventually accumulate 3 errors and fail forever.**

### File
`lib/workers/comment-monitor.ts` - TWO LOCATIONS

### Fix Location 1: Line 623-629 (main success path)
```typescript
await supabase.from('scrape_jobs').update({
  status: 'scheduled',
  error_count: 0, // ← ADD THIS
  comments_scanned: comments.length,
  trigger_words_found: processedCount,
  dms_sent: dmsSent,
  next_check: new Date(Date.now() + 5 * 60 * 1000).toISOString()
}).eq('id', job.id);
```

### Fix Location 2: Line 339-342 (no comments path)
```typescript
await supabase.from('scrape_jobs').update({
  status: 'scheduled',
  error_count: 0, // ← ALSO ADD HERE
  next_check: new Date(Date.now() + 5 * 60 * 1000).toISOString()
}).eq('id', job.id);
```

**Validator Note:** Both paths represent "job ran successfully" - both need reset.

---

## ❌ CRITICAL BUG 2: Race Condition on Status (SEVERITY: 7/10)

**Duplicate processing when cron jobs overlap.**

### Problem
No optimistic locking. Two concurrent cron jobs can process the same scrape job.

### How it breaks
```
5:00:00 - Cron Job A queries jobs with status='scheduled'
5:00:00 - Cron Job B queries jobs with status='scheduled' (same jobs)
5:00:01 - Job A sets job #123 to 'running'
5:00:01 - Job B ALSO sets job #123 to 'running'
Both process duplicate comments → duplicate replies sent
```

### File
`lib/workers/comment-monitor.ts` - THREE CHANGES NEEDED

### Fix Part A: Stale Job Cleanup (in `getActiveScrapeJobs`, before query)
```typescript
async function getActiveScrapeJobs(): Promise<ActiveScrapeJob[]> {
  const supabase = getSupabase();

  // Step 1: Clean up stale 'running' jobs (crashed workers)
  const STALE_THRESHOLD_MINUTES = 10;
  const staleTime = new Date(Date.now() - STALE_THRESHOLD_MINUTES * 60 * 1000).toISOString();

  const { data: staleJobs } = await supabase
    .from('scrape_jobs')
    .update({ status: 'scheduled' })
    .eq('status', 'running')
    .lt('last_checked', staleTime)
    .select('id');

  if (staleJobs && staleJobs.length > 0) {
    console.log(`[COMMENT_MONITOR] ⚠️ Recovered ${staleJobs.length} stale jobs`);
  }

  // Step 2: Query (existing code continues here...)
```

### Fix Part B: Query Change (line 158)
```typescript
// BEFORE (queries running jobs unnecessarily)
.in('status', ['scheduled', 'running'])

// AFTER (only query scheduled - running = locked)
.eq('status', 'scheduled')
```

### Fix Part C: Optimistic Lock (at start of `processScrapeJob`, line 314)
```typescript
async function processScrapeJob(job: ActiveScrapeJob): Promise<number> {
  const supabase = getSupabase();

  // Optimistic lock - only process if still scheduled
  const { data: locked } = await supabase
    .from('scrape_jobs')
    .update({ status: 'running', last_checked: new Date().toISOString() })
    .eq('id', job.id)
    .eq('status', 'scheduled')
    .select('id')
    .single();

  if (!locked) {
    console.log(`[COMMENT_MONITOR] Job ${job.id} already locked, skipping`);
    return 0;
  }

  // Continue with existing code...
```

**Validator Note:** Without stale cleanup, crashed workers leave jobs stuck in 'running' forever.

---

## ❌ CRITICAL BUG 3: Race Condition on error_count (SEVERITY: 8/10)

**error_count can be wrong under concurrent execution.**

### Problem
Lines 666-672 use read-then-write pattern (not atomic).

### Current Code (BROKEN)
```typescript
// Read (could be stale by the time we write)
const { data: currentJob } = await supabase
  .from('scrape_jobs')
  .select('error_count')
  .eq('id', job.id)
  .single();

// Write (could overwrite concurrent update)
const newErrorCount = (currentJob?.error_count || 0) + 1;
```

### File
- `lib/workers/comment-monitor.ts` lines 666-724
- New migration: `supabase/migrations/20251216_atomic_scrape_job_errors.sql`

### Fix Part A: Create RPC Function (migration file)
```sql
-- Migration: Atomic error handling for scrape jobs
-- Supabase Project: trdoainmejxanrownbuz

CREATE OR REPLACE FUNCTION increment_scrape_job_error(
  p_job_id UUID,
  p_error_message TEXT,
  p_is_404_error BOOLEAN DEFAULT FALSE
) RETURNS TABLE(
  new_error_count INTEGER,
  new_status TEXT,
  should_send_sentry BOOLEAN
) AS $$
DECLARE
  v_error_count INTEGER;
  v_status TEXT;
  v_should_alert BOOLEAN;
  MAX_CONSECUTIVE_ERRORS CONSTANT INTEGER := 3;
BEGIN
  -- Atomically increment error count
  UPDATE scrape_jobs
  SET
    error_count = COALESCE(error_count, 0) + 1,
    last_error = p_error_message,
    last_error_at = NOW()
  WHERE id = p_job_id
  RETURNING error_count INTO v_error_count;

  -- Determine if job should auto-fail
  IF v_error_count >= MAX_CONSECUTIVE_ERRORS AND p_is_404_error THEN
    v_status := 'failed';
    UPDATE scrape_jobs SET status = 'failed' WHERE id = p_job_id;
  ELSE
    v_status := 'scheduled';
    UPDATE scrape_jobs SET status = 'scheduled' WHERE id = p_job_id;
  END IF;

  -- Should we send Sentry alert?
  v_should_alert := (v_error_count >= 2);

  RETURN QUERY SELECT v_error_count, v_status, v_should_alert;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Fix Part B: Update Caller Code (lines 666-724)
```typescript
// REPLACE the entire error handling block with:

// Detect 404
const is404Error =
  error.status === 404 ||
  error.statusCode === 404 ||
  error.message?.includes('404') ||
  error.message?.toLowerCase().includes('not found') ||
  error.message?.toLowerCase().includes('resource_not_found');

// Call atomic RPC
const { data: result, error: rpcError } = await supabase
  .rpc('increment_scrape_job_error', {
    p_job_id: job.id,
    p_error_message: error.message,
    p_is_404_error: is404Error
  })
  .single();

if (rpcError || !result) {
  console.error('[COMMENT_MONITOR] Failed to increment error:', rpcError);
  return;
}

const { new_error_count, new_status, should_send_sentry } = result;

// Sentry alerting
if (new_status === 'failed') {
  console.log(`[COMMENT_MONITOR] Auto-failing job ${job.id} after ${new_error_count} errors`);
  Sentry.captureMessage(`Comment Reply Job Auto-Failed: ${job.id}`, {
    level: 'warning',
    tags: { feature: 'comment-reply', job_id: job.id, campaign_id: job.campaign_id },
    extra: { error_count: new_error_count, last_error: error.message }
  });
} else if (should_send_sentry) {
  Sentry.captureException(error, {
    tags: { feature: 'comment-reply', job_id: job.id },
    extra: { error_count: new_error_count }
  });
}
```

**Validator Note:** RPC returns TABLE with status + count so caller knows if job auto-failed.

---

## Implementation Order (Phased Rollout)

### Phase 1: Low Risk (5 min)
**Fix Bug 1 - Reset error_count on success**
- Add `error_count: 0` to line 340 (no comments path)
- Add `error_count: 0` to line 623 (main success path)
- Deploy and verify jobs recover after transient errors
- **Rollback:** Remove the two lines

### Phase 2: Medium Risk (15 min)
**Fix Bug 2 - Race condition protection**
- Add stale job cleanup in `getActiveScrapeJobs()` (before query)
- Change query from `.in(['scheduled','running'])` to `.eq('scheduled')`
- Add optimistic lock in `processScrapeJob()` (line 314)
- Deploy and monitor for duplicate processing
- **Rollback:** Revert to old query, remove lock check

### Phase 3: Higher Risk (20 min)
**Fix Bug 3 - Atomic error increment**
- Create migration `20251216_atomic_scrape_job_errors.sql`
- Run migration in Supabase
- Update caller code (lines 666-724) to use RPC
- Deploy and verify Sentry alerts work
- **Rollback:** Restore old increment logic, drop RPC function

---

## Files to Modify

| File | Lines | Changes |
|------|-------|---------|
| `lib/workers/comment-monitor.ts` | 142-160 | Stale job cleanup |
| `lib/workers/comment-monitor.ts` | 158 | Query change |
| `lib/workers/comment-monitor.ts` | 314 | Optimistic lock |
| `lib/workers/comment-monitor.ts` | 340 | Reset error_count |
| `lib/workers/comment-monitor.ts` | 623 | Reset error_count |
| `lib/workers/comment-monitor.ts` | 666-724 | Atomic RPC call |
| `supabase/migrations/20251216_atomic_scrape_job_errors.sql` | New | RPC function |

---

## Test Scenarios (Must Pass Before Done)

| Test | Expected Behavior |
|------|-------------------|
| Normal success | Job processes → error_count resets to 0 |
| Transient error | Fails once → succeeds → error_count resets |
| Permanent failure | 3x 404 errors → status='failed' |
| Stale job recovery | Crashed worker → next poll recovers job |
| Duplicate prevention | Two workers poll → only one processes |
| Concurrent errors | Two workers error → both increments counted |

---

## Confidence Score

| Stage | Confidence | Notes |
|-------|------------|-------|
| Before validation | 9/10 | Thought it was solid |
| After first validation | 6/10 | Found 3 critical bugs |
| After fix validation | 8.5/10 | Fixes verified correct |
| After implementation | TBD | Need to test |

**Why 8.5/10 (not 10/10)?**
- Stale job cleanup is new logic (not tested yet)
- RPC function changes error flow significantly
- Multiple moving parts need coordination

**Why confident overall?**
- Core problems correctly identified
- RPC pattern proven (20+ similar functions in codebase)
- Each phase can be rolled back independently
- End-to-end flow verified working
