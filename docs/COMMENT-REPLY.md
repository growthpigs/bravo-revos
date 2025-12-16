# Comment Reply System

**What:** Automated threaded replies to LinkedIn post comments containing trigger words
**Who:** RevOS campaign owners monitoring engagement posts
**Why:** Deliver lead magnets and capture emails through natural comment interactions

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

### Check Active Jobs
```sql
SELECT id, unipile_post_id, trigger_word, status
FROM scrape_jobs
WHERE status IN ('scheduled', 'running');
```

### Test API Directly
```bash
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
- Location: `lib/workers/comment-monitor.ts` line 676
- Prevents stale jobs from blocking the queue

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

## Changelog

**2025-12-16:** Hardened system with auto-fail, health checks, tests, and Sentry alerting. Commit: `29020c9`

**2025-12-16:** Fixed URN format issue. Comments API requires `urn:li:activity:XXX` format, not numeric IDs. Commits: `772e6e2`, `6bd38f7`, `48bdf22`
