# Comment Reply System

**What:** Automated threaded replies to LinkedIn post comments containing trigger words
**Who:** RevOS campaign owners monitoring engagement posts
**Why:** Deliver lead magnets and capture emails through natural comment interactions

---

## Setup Checklist (REQUIRED)

Before a campaign can monitor comments, ALL of these must be true:

- [ ] **Campaign has `user_id`** - Multi-tenant isolation requirement
- [ ] **Campaign has `trigger_word`** - No default fallback
- [ ] **scrape_job has `unipile_account_id`** - Must be in active accounts list
- [ ] **scrape_job has `unipile_post_id`** - Numeric ID (system converts to URN)
- [ ] **scrape_job `status` = 'scheduled'** - Not 'failed' or 'completed'
- [ ] **Post exists on LinkedIn** - Deleted posts return 404

**Silent failures if missing:** Jobs without `user_id` or `trigger_word` are skipped with only a warning log. Check Vercel logs for `[COMMENT_MONITOR] Skipping job`.

---

## How It Works

1. User creates campaign with trigger word (e.g., "GUIDE")
2. Campaign publishes LinkedIn post
3. System creates `scrape_job` to monitor post
4. When commenter writes trigger word, system:
   - Sends threaded reply to their comment
   - Sends DM with lead magnet
   - Captures lead in database

---

## Technical Implementation

### Data Flow

```
Campaign → scrape_job → comment-monitor → getAllPostComments → Unipile API
                                              ↓
                                    Match trigger word
                                              ↓
                              sendCommentReply + sendDirectMessage
```

### Critical: Unipile API Format

**Comments API requires URN format:**
```
GET /api/v1/posts/urn:li:activity:{POST_ID}/comments?account_id={ACCOUNT_ID}
```

**DO NOT use numeric format** - returns "invalid post_id"

**Code location:** `lib/unipile-client.ts` lines 487-513

```typescript
// Always construct URN from numeric post ID
socialId = postId.startsWith('urn:') ? postId : `urn:li:activity:${postId}`;
```

### Database Tables

**scrape_jobs:**
- `unipile_post_id` - LinkedIn activity ID (numeric, stored as string)
- `unipile_account_id` - Unipile account ID
- `trigger_word` - Word to match in comments
- `status` - scheduled | running | completed | failed

**processed_comments:**
- Tracks which comments have been handled
- Prevents duplicate replies

---

## Debugging

### Troubleshooting Flowchart

```
Poll returns jobs_processed: 0
│
├─► Check: Are there scheduled jobs?
│   └─► SQL: SELECT * FROM scrape_jobs WHERE status = 'scheduled'
│       └─► No jobs? → Create scrape_job or check if all failed
│
├─► Check: Do jobs have required fields?
│   └─► Vercel logs: "[COMMENT_MONITOR] Skipping job"
│       ├─► "missing Unipile IDs" → Set unipile_account_id + unipile_post_id
│       ├─► "no trigger_word" → Set trigger_word on scrape_job
│       └─► "no user_id" → Set user_id on CAMPAIGN (not scrape_job)
│
└─► Check: Is next_check in the future?
    └─► SQL: UPDATE scrape_jobs SET next_check = NOW() WHERE id = '...'
```

```
Poll returns errors or job keeps failing
│
├─► Check: Is post deleted?
│   └─► curl the comments API directly (see below)
│       └─► 404? → Post deleted, job will auto-fail after 3 attempts
│
├─► Check: Is account ID valid?
│   └─► curl https://api3.unipile.com:13344/api/v1/accounts
│       └─► Account not in list? → Update scrape_job with valid account
│
└─► Check: Is URN format correct?
    └─► Must be: urn:li:activity:NUMERIC_ID
        └─► Code handles this automatically now (lib/unipile-client.ts:487)
```

### Check Active Jobs
```sql
SELECT id, unipile_post_id, trigger_word, status, error_count, last_error
FROM scrape_jobs
WHERE status IN ('scheduled', 'running')
ORDER BY created_at DESC;
```

### Check Campaign Has user_id
```sql
SELECT c.id, c.name, c.user_id, c.trigger_word
FROM campaigns c
JOIN scrape_jobs sj ON sj.campaign_id = c.id
WHERE sj.status = 'scheduled';
```

### Test API Directly
```bash
# Replace POST_ID and ACCOUNT_ID
curl "https://api3.unipile.com:13344/api/v1/posts/urn:li:activity:POST_ID/comments?account_id=ACCOUNT_ID" \
  -H "X-API-KEY: $UNIPILE_API_KEY"
```

### Vercel Log Prefixes
- `[COMMENT_MONITOR]` - Job processing
- `[UNIPILE_COMMENTS]` - API calls
- `[COMMENT_REPLY]` - Reply sending

---

## Known Issues & Solutions

### "No new trigger comments found"

**Causes:**
1. Wrong post ID format (must be URN)
2. Stale account ID (check against `/api/v1/accounts`)
3. Post deleted (returns 404)
4. Comment already processed

**Solution:** Mark failed jobs as `status: 'failed'`, verify URN format

### 404 from Comments API

**Cause:** Post doesn't exist or wrong account ID
**Solution:** Test with curl, verify account ID is in active accounts list

---

## Valid Unipile Account IDs

Query fresh list: `GET /api/v1/accounts`

As of 2025-12-16:
- `pJj4DVePS3umF9iJwSmx7w`
- `-KRQ1uIkTxWhS48rx6JNCA`
- `DIgesaRAQyCexn7rwPRo8A`

---

## Files

| File | Purpose |
|------|---------|
| `lib/unipile-client.ts` | getAllPostComments, sendCommentReply |
| `lib/workers/comment-monitor.ts` | Job processing, trigger matching |
| `app/api/cron/poll-comments/route.ts` | Cron endpoint |

---

## Hardening Measures

### Auto-Fail Stale Jobs
Jobs with 3+ consecutive 404 errors are automatically marked as `failed`.
- Location: `lib/workers/comment-monitor.ts` - `increment_scrape_job_error` RPC
- Prevents stale jobs from blocking the queue

### Error Count Reset on Success
When a job succeeds, `error_count` resets to 0.
- Prevents accumulated transient errors from causing permanent failure
- Two locations: main success path (line 631) and no-comments path (line 359)

### Stale Job Recovery
Jobs stuck in `running` status for >10 minutes are reset to `scheduled`.
- Location: `lib/workers/comment-monitor.ts` line 148 (`getActiveScrapeJobs`)
- Handles crashed workers that left jobs locked

### Optimistic Locking (Race Condition Prevention)
Before processing, jobs are atomically claimed with a status check.
- Location: `lib/workers/comment-monitor.ts` line 332 (`processScrapeJob`)
- Prevents duplicate processing when cron jobs overlap
- `.eq('status', 'scheduled')` ensures only one worker processes each job

### Atomic Error Increment (RPC)
Error counting uses an atomic PostgreSQL RPC function.
- Migration: `supabase/migrations/20251216_atomic_scrape_job_errors.sql`
- Prevents race conditions on `error_count` when concurrent workers fail
- Returns `new_error_count`, `new_status`, `should_send_sentry` for caller logic
- Falls back to non-atomic update if RPC unavailable

### Health Check
`GET /api/health` includes `commentReply` status:
- `activeJobs`: Number of scheduled/running jobs
- `failedJobs`: Number of failed jobs
- Status degrades if error rate is high

### Unit Tests
4 tests verify URN format construction:
- `__tests__/unipile-client.test.ts` - "URN Format Construction" describe block
- Tests: numeric→URN, preserve existing URN, use social_id, ignore internal ID

### Sentry Alerts
- Jobs with 2+ errors: `captureException` with tags
- Auto-failed jobs: `captureMessage` with warning level
- Tags: `feature: comment-reply`, `job_id`, `campaign_id`

---

## Lessons Learned (2025-12-16)

### 1. URN Format is Non-Negotiable
```
❌ GET /api/v1/posts/7406677961430548480/comments → "invalid post_id"
✅ GET /api/v1/posts/urn:li:activity:7406677961430548480/comments → Works
```
The Unipile Comments API ONLY accepts URN format. No error message hints at this - it just fails.

### 2. Silent Job Skipping is Dangerous
Jobs missing `user_id` or `trigger_word` are skipped with only a `console.warn`. No error thrown, no Sentry alert. The poll endpoint returns `jobs_processed: 0` with no indication why.

**Fix:** Always check Vercel logs for `[COMMENT_MONITOR] Skipping job` when debugging.

### 3. Stale Account IDs Cause 404s
Unipile account IDs can become stale. Always verify against `GET /api/v1/accounts` before assuming the account is valid.

### 4. Auto-Fail Prevents Queue Blocking
Without auto-fail logic, a deleted post would cause infinite retries. The 3-strike rule (3 consecutive 404s → mark as `failed`) keeps the queue healthy.

### 5. Test with Real Posts
Mock mode doesn't catch API format issues. Always test with a real LinkedIn post before considering a fix complete.

---

## Changelog

**2025-12-16 (Late):** Critical bug fixes from validator stress test.
- **Bug 1 Fixed:** `error_count` now resets to 0 on success (was accumulating forever)
- **Bug 2 Fixed:** Added optimistic locking to prevent duplicate processing
- **Bug 2 Fixed:** Added stale job recovery (>10min running → reset to scheduled)
- **Bug 2 Fixed:** Query now only selects `scheduled` jobs (not `running`)
- **Bug 3 Fixed:** Atomic RPC for error increment (prevents race conditions)
- Migration: `supabase/migrations/20251216_atomic_scrape_job_errors.sql`
- All changes have rollback capability:
  - Phase 1: Remove `error_count: 0` lines
  - Phase 2: Revert query, remove lock check, remove stale cleanup
  - Phase 3: Restore old increment logic, drop RPC function

**2025-12-16 (14:07 UTC):** Full end-to-end verification passed.
- Created test post `7406695953682038785` via Unipile API
- Jonathan commented "TESTFLOW" → System detected trigger and sent threaded replies
- `processed_comments` table correctly tracked both comments
- `scrape_jobs` metrics updated: 2 comments scanned, 1 trigger found
- Auto-fail logic confirmed working on old deleted posts (marked as `failed` after 3+ 404s)

**2025-12-16:** Hardened system with auto-fail, health checks, tests, and Sentry alerting. Commit: `29020c9`

**2025-12-16:** Fixed URN format issue. Comments API requires `urn:li:activity:XXX` format, not numeric IDs. Commits: `772e6e2`, `6bd38f7`, `48bdf22`
