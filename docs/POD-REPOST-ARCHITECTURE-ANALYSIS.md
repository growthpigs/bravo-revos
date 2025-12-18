# Pod Repost Architecture Analysis
**Date:** 2024-12-18
**Status:** DECISION MADE - Repost deferred, likes/comments shipped
**Last Updated:** 2024-12-18

---

## CTO Decision (2024-12-18)

### Verified Facts
1. **Unipile session endpoint does NOT exist** - Tested `GET /v1/accounts/{id}/session` → 404
2. **Unipile has NO native repost API** - Confirmed via docs search
3. **Likes work** - `POST /api/v1/posts/{postId}/reactions` ✅
4. **Comments work** - `POST /api/v1/posts/{postId}/comments` ✅

### Decision
**Ship likes + comments NOW. Defer reposts until Unipile adds session export or alternative solution.**

| Action | Timeline | Status |
|--------|----------|--------|
| Ship likes + comments | Immediate | ✅ Ready |
| Disable repost code path | Done | ✅ Feature-flagged |
| Email Unipile support | This week | Pending |
| Re-evaluate repost | After Unipile response | Backlog |

### Feature Flag
Set `ENABLE_REPOST_FEATURE=true` in env to enable reposts (will fail without solution).

---

## Executive Summary

The pod repost feature requires browser automation because **Unipile has no native repost API**. This is a KNOWN limitation. The intended architecture uses Unipile's authenticated session to inject cookies into a headless browser.

---

## What Works vs What's Broken

| Feature | Status | Implementation |
|---------|--------|----------------|
| **Likes** | WORKING | Unipile API: `POST /api/v1/posts/{postId}/reactions` |
| **Comments** | WORKING | Unipile API: `POST /api/v1/posts/{postId}/comments` |
| **Reposts** | BROKEN | `repost-executor.ts` calls non-existent endpoint |

---

## The Repost Problem

### Intended Architecture
```
1. User authenticates via Unipile (Unipile manages LinkedIn connection)
2. Export session/cookies FROM Unipile
3. Inject cookies into headless browser (Playwright/Puppeteer)
4. Browser performs repost action that Unipile API can't do
```

### What's Currently Broken

**File:** `lib/workers/repost-executor.ts:54`
```typescript
const unipileSessionRes = await fetch(
  `${unipileBaseUrl}/v1/accounts/${memberUnipileAccountId}/session`
);
```

**Problem:** This endpoint may not exist or may not return cookies in the expected format.

### Key Question
**Does Unipile have an endpoint to export session cookies?**
- Unipile docs show you PROVIDE cookies TO Unipile (li_at cookie)
- Unclear if they have an endpoint to EXPORT cookies back out
- Need to verify: `GET /v1/accounts/{id}/session` - does this exist?

---

## Infrastructure Options for Browser Automation

| Option | Pros | Cons |
|--------|------|------|
| **Cloudflare Browser Rendering** | Serverless, no Docker, CF integration | Limited concurrent sessions (2-10), unclear LinkedIn detection |
| **Browserless.io** | Managed service, battle-tested | External dependency, cost |
| **Render Docker Worker** | Full control, existing infra | Requires Docker, more complexity |
| **Dedicated VM** | Maximum control | Overkill for this use case |

### Recommended: Cloudflare Browser Rendering

**Why:**
- Already have Cloudflare Workers infrastructure
- No Docker needed
- Pay per use
- Can use `@cloudflare/puppeteer`

**Architecture:**
```
BullMQ Job → HTTP POST to CF Worker → Browser Rendering → LinkedIn Repost → Supabase Update
```

---

## Validation Findings

### Verified Working
- UNIPILE_DSN env var standardized
- Redis race condition fixed
- Column naming (`activity_type`) correct per migration
- Unipile account JOIN resolution works
- post_url included in INSERT
- Validation order fixed

### Cleaned Up (Deleted)
- `/api/pod/trigger-amplification/` - orphaned route, no worker
- `lib/queues/pod-queue.ts` - orphaned queue file
- `lib/workers/pod-amplification-worker.ts` - old worker, redundant

### Consolidated Architecture
```
/api/pods/trigger-amplification → podAmplificationQueue → repost-executor.ts
```

---

## Unverified Assumptions (RISKS)

| Assumption | Risk Level | Verification Needed |
|------------|------------|---------------------|
| Unipile `/session` endpoint exists | HIGH | Call API, check response |
| Cookie format matches Puppeteer | HIGH | Inspect actual response |
| LinkedIn won't detect CF browser | MEDIUM | Test with real account |
| CF timeout sufficient for LinkedIn | MEDIUM | Test page load times |

---

## Next Steps

### Immediate (Before Any Browser Work)
1. **Verify Unipile Session Endpoint**
   - Call `GET /v1/accounts/{account_id}/session`
   - Check if it returns cookies
   - Document response format

2. **Commit Current Fixes**
   - All cleanup work is staged
   - Ready to commit

### If Unipile Has Session Endpoint
1. Create Cloudflare Worker for repost execution
2. Test with one account in MOCK_MODE=false
3. Implement proper error handling
4. Deploy to production

### If Unipile Does NOT Have Session Endpoint
**Options:**
1. **Contact Unipile Support** - Ask for session export capability
2. **Manual Cookie Collection** - Users provide li_at cookie during onboarding
3. **Store Cookies at Auth Time** - Capture cookies when user connects via Unipile hosted auth
4. **Abandon Repost Feature** - Focus on likes/comments only

---

## Files Modified in This Session

| File | Changes |
|------|---------|
| `lib/workers/repost-executor.ts` | Fixed UNIPILE_DSN env var |
| `lib/redis.ts` | Fixed race condition in getRedisConnectionSync() |
| `lib/queues/pod-engagement-worker.ts` | Fixed column mapping, Unipile JOIN |
| `app/api/pods/trigger-amplification/route.ts` | Fixed JOIN, post_url, validation order |
| `lib/chips/pod-chip.ts` | Updated to use podAmplificationQueue |

---

## Pending Commit

```bash
cd /Users/rodericandrews/_PAI/projects/revos && git commit -m "fix(pods): consolidate queue architecture and critical fixes

- Standardize UNIPILE_DSN env var
- Fix Redis race condition in getRedisConnectionSync()
- Fix Unipile account resolution via linkedin_accounts JOIN
- Add missing post_url to pod_activities INSERT
- Fix validation order (check post_url before push)
- Delete orphaned /api/pod/ route (no worker)
- Delete orphaned pod-queue.ts and pod-amplification-worker.ts
- Update pod-chip.ts to use podAmplificationQueue"
```

---

## Critical Decision Required

**Before implementing Cloudflare Browser Rendering:**

Verify that Unipile can export session cookies. Without this, no browser automation approach will work.

**Action:** Make a test call to Unipile API to check `/v1/accounts/{id}/session` endpoint.
