# Comments API Fix - Complete Documentation

**Date:** 2025-12-16
**Status:** VERIFIED WORKING
**Commits:** `772e6e2`, `6bd38f7`

## Problem Statement

"Poll Comments Now" returned "No new trigger comments found" even when comments existed on LinkedIn posts.

## Root Causes

### 1. Wrong Post ID Format

**Location:** `lib/unipile-client.ts` lines 487-513

**Problem:** Unipile Comments API requires URN format (`urn:li:activity:XXXXX`), but code was sometimes passing numeric IDs.

**Evidence:**
```bash
# Numeric format - FAILS
curl "https://api3.unipile.com:13344/api/v1/posts/7406677961430548480/comments?account_id=XXX"
# Returns: {"error": "invalid post_id"}

# URN format - WORKS
curl "https://api3.unipile.com:13344/api/v1/posts/urn:li:activity:7406677961430548480/comments?account_id=XXX"
# Returns: {"items": [{"text": "GUIDE", "author": "Jonathan..."}]}
```

**Fix Applied:**
```typescript
// BEFORE (broken):
socialId = postData.social_id || postData.id || postId;

// AFTER (fixed):
if (postData.social_id && postData.social_id.startsWith('urn:')) {
  socialId = postData.social_id;
} else {
  socialId = postId.startsWith('urn:') ? postId : `urn:li:activity:${postId}`;
}
```

### 2. Stale Scrape Jobs Blocking Queue

**Problem:** Old scrape_jobs for deleted posts returned 404 errors and blocked processing of valid jobs.

**Fix:** Mark stale jobs as `status: 'failed'` in database.

```sql
UPDATE scrape_jobs
SET status = 'failed'
WHERE unipile_post_id = '7406655963400720384';
```

## API Reference

### Unipile Comments API

**Endpoint:** `GET /api/v1/posts/{post_id}/comments?account_id={account_id}`

**Required Format:**
- `post_id`: MUST be URN format: `urn:li:activity:XXXXX`
- `account_id`: Valid Unipile account ID from `/api/v1/accounts`

**Response:**
```json
{
  "object": "CommentList",
  "items": [
    {
      "id": "7406678582489620487",
      "post_id": "7406677961430548480",
      "post_urn": "urn:li:activity:7406677961430548480",
      "author": "Jonathan E. K. Andrews",
      "author_details": {
        "id": "ACoAAAV7FwYBRa4hV4DrlB7t3r1xM4bupggolLg",
        "profile_url": "https://www.linkedin.com/in/giffarddeclare"
      },
      "text": "GUIDE",
      "date": "2025-12-16T12:56:23.500Z"
    }
  ]
}
```

### Valid Account IDs (as of 2025-12-16)

| Account ID | Name | Created |
|------------|------|---------|
| `pJj4DVePS3umF9iJwSmx7w` | Roderic Andrews | 2025-11-11 |
| `-KRQ1uIkTxWhS48rx6JNCA` | Roderic Andrews | 2025-11-21 |
| `DIgesaRAQyCexn7rwPRo8A` | Roderic Andrews | 2025-11-20 |
| `KuzSe81MSPOrcVWdArKdtA` | Roderic Andrews | 2025-11-21 |
| `VeXXRfWcQGy0k4QZczsoKw` | Roderic Andrews | 2025-11-20 |
| `ct34zulkTUqAbQCf32ukNw` | Roderic Andrews | 2025-11-21 |

## Data Flow

```
Campaign Created
    ↓
POST /api/linkedin/posts
    ↓
Creates scrape_job with:
  - unipile_post_id (numeric: "7406677961430548480")
  - unipile_account_id (from linkedin_accounts table)
  - trigger_word (from campaign)
    ↓
Comment Monitor (cron or manual poll)
    ↓
getAllPostComments(account_id, post_id)
    ↓
Converts to URN: urn:li:activity:7406677961430548480
    ↓
Calls Unipile API
    ↓
Matches trigger words → Sends DM
```

## Debugging Checklist

### 1. Check Scrape Jobs
```bash
# Query active jobs
curl "https://trdoainmejxanrownbuz.supabase.co/rest/v1/scrape_jobs?select=*&status=in.(scheduled,running)" \
  -H "apikey: SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer SERVICE_ROLE_KEY"
```

### 2. Test Unipile API Directly
```bash
# Test comments endpoint
curl "https://api3.unipile.com:13344/api/v1/posts/urn:li:activity:POST_ID/comments?account_id=ACCOUNT_ID" \
  -H "X-API-KEY: YOUR_API_KEY"
```

### 3. Check Vercel Logs
Look for these prefixes:
- `[COMMENT_MONITOR]` - Job processing
- `[COMMENT_MONITOR_DEBUG]` - Detailed diagnostics
- `[UNIPILE_COMMENTS]` - API calls

### 4. Common Error Patterns

| Error | Cause | Fix |
|-------|-------|-----|
| `invalid post_id` | Numeric format instead of URN | Ensure URN conversion |
| `404 Resource not found` | Post deleted or wrong account | Check post exists, verify account ID |
| `401 Unauthorized` | Invalid API key | Check UNIPILE_API_KEY env var |

## Files Modified

1. **`lib/unipile-client.ts`** (lines 487-513)
   - URN format construction
   - Fallback handling

2. **`lib/workers/comment-monitor.ts`** (lines 318-392)
   - Debug logging added
   - Diagnostic output for troubleshooting

## Environment Variables

```env
UNIPILE_API_KEY="your-api-key"
UNIPILE_DSN="https://api3.unipile.com:13344"
UNIPILE_MOCK_MODE="false"
```

## Test Script

Save as `scripts/test-comments-api.sh`:
```bash
#!/bin/bash
API_KEY="YOUR_UNIPILE_API_KEY"
DSN="https://api3.unipile.com:13344"
ACCOUNT_ID="pJj4DVePS3umF9iJwSmx7w"
POST_ID="7406677961430548480"

echo "Testing Comments API..."
curl -s "$DSN/api/v1/posts/urn:li:activity:$POST_ID/comments?account_id=$ACCOUNT_ID" \
  -H "X-API-KEY: $API_KEY" \
  -H "Accept: application/json" | python3 -m json.tool
```

## Lessons Learned

1. **Always verify API format requirements** - Unipile docs say "use social_id" but don't specify URN is mandatory
2. **Test APIs directly before blaming code** - curl tests revealed the format issue
3. **Clean up stale data** - Old failing jobs can block new ones
4. **Add diagnostic logs** - `[PREFIX_DEBUG]` logs saved hours of debugging

---

**Last Updated:** 2025-12-16
**Verified By:** Roderic Andrews (manual test)
