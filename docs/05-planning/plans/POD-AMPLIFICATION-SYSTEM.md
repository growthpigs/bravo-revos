# Pod Amplification System

**Living Document** - Last Updated: 2025-12-18
**Status:** GoLogin Integration Complete - Awaiting Partner Validation

---

## Current State

### Architecture (Hybrid)

```
LIKES/COMMENTS → Unipile API (working)
REPOSTS → GoLogin + Puppeteer (implemented, needs validation)
```

### Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Database tables | Done | `pod_members`, `pod_activities` |
| BullMQ queue | Done | `pod-amplification-queue.ts` |
| GoLogin client | Done | `lib/gologin/client.ts` |
| Repost executor | Done | `lib/workers/repost-executor.ts` (Puppeteer) |
| Trigger API | Done | `app/api/pods/trigger-amplification/route.ts` |
| GoLogin auth routes | Done | `app/api/gologin/create-profile/`, `verify-session/` |
| Migration | Pending | `supabase/migrations/20251218_add_gologin_columns.sql` |

---

## Production Deployment Checklist

- [ ] Create GoLogin account (Professional: $24/mo)
- [ ] Get API token from GoLogin Dashboard
- [ ] Add `GOLOGIN_API_TOKEN` to Vercel
- [ ] Run Supabase migration
- [ ] Create test profile + authenticate LinkedIn
- [ ] Trigger test repost
- [ ] Partner validation

---

## Key Files

| File | Purpose |
|------|---------|
| `lib/gologin/client.ts` | GoLogin API (profile CRUD, launch, stop) |
| `lib/workers/repost-executor.ts` | Puppeteer automation |
| `lib/queues/pod-amplification-queue.ts` | BullMQ queue definition |
| `app/api/pods/trigger-amplification/route.ts` | Trigger reposts for pod |
| `lib/chips/pod-chip.ts` | Chat-driven pod commands |

---

## Schema Changes (Migration Pending)

```sql
-- linkedin_accounts
gologin_profile_id TEXT UNIQUE
gologin_status TEXT DEFAULT 'none' CHECK (IN 'none','pending_auth','active','expired')

-- pod_members
repost_enabled BOOLEAN DEFAULT true
```

---

## History

| Date | Change |
|------|--------|
| 2025-12-18 | GoLogin integration complete (Playwright→Puppeteer rewrite) |
| 2025-11-16 | Initial design and BullMQ setup |

---

## Next Actions

When partner validates:
1. Run migration
2. Test end-to-end with real GoLogin profile
3. Update this doc with results
