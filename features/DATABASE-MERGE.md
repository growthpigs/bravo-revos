# DATABASE-MERGE: RevOS + AudienceOS Unified Platform

**Status:** 🔴 IN PROGRESS - Tables missing in production
**Last Updated:** 2026-01-26
**Verified:** ❌ FAILED - `campaign` table missing

---

## Current Issue (2026-01-26)

**Spec-to-Implementation Gap:** Documentation said "COMPLETE" but RevOS tables were never actually created in AudienceOS Supabase.

| Problem | Evidence |
|---------|----------|
| Health check fails | `database: unhealthy` - missing `campaign` table |
| Code points to AudienceOS | `.env.local` → `ebxshdqfaqupnvpghodi` ✅ |
| Tables don't exist | Migrations never run on AudienceOS |

### Plan to Fix

| Step | Action | Verification |
|------|--------|--------------|
| 1 | Audit which tables exist vs needed | Query `information_schema.tables` |
| 2 | Generate migration for missing tables | SQL file in `supabase/migrations/` |
| 3 | Run migration on AudienceOS | `supabase db push` |
| 4 | Verify health check | `/api/health` → all green |

---

## Overview

RevOS and AudienceOS will share a single Supabase database. Users can switch between apps while sharing clients, agencies, and users.

---

## Current State

### Database Connection

| Setting | Value |
|---------|-------|
| Supabase Project | `ebxshdqfaqupnvpghodi` (AudienceOS) |
| URL | `https://ebxshdqfaqupnvpghodi.supabase.co` |
| Table Convention | SINGULAR (user, client, agency) |

### Environment Files (Both Updated)

- ✅ `.env.local` - Local development
- ✅ `.env.vercel` - Production deployment

### Code References (293 Updated)

| Pattern | Count |
|---------|-------|
| campaigns → campaign | 53 |
| posts → post | 32 |
| leads → lead | 39 |
| linkedin_accounts → linkedin_account | 30 |
| console_workflows → console_workflow | 21 |
| users → user | 94 |
| clients → client | 18 |
| agencies → agency | 6 |

---

## Tables

### Shared Tables (AudienceOS Core)

- `agency` - Tenant root
- `user` - Auth users
- `client` - Both apps need clients
- `chat_session` - Unified HGC sessions
- `chat_message` - Unified HGC messages

### RevOS Tables (Created 2026-01-22)

- `linkedin_account` - UniPile connections
- `lead_magnet` - Downloadable content
- `campaign` - Marketing campaigns
- `post` - LinkedIn posts
- `comment` - Post engagements
- `lead` - Captured leads
- `webhook_config` - Outbound webhook configurations
- `webhook_delivery` - Webhook delivery tracking
- `pod`, `pod_member`, `pod_activity` - Engagement pods
- `dm_sequence`, `dm_delivery` - DM automation
- `console_workflow` - AI workflow definitions

---

## Mem0 Format

Memory keys use 3-part format:

```typescript
function buildScopedUserId(
  agencyId: string,
  userId: string,
  clientId?: string | null
): string {
  const client = clientId || '_';
  const user = userId || '_';
  return `${agencyId}::${client}::${user}`;
}
```

---

## Verification Results (2026-01-22)

```
=== COMPLETE UNIFIED PLATFORM VERIFICATION ===

--- Tables that SHOULD exist (SINGULAR) ---
✅ agency: exists
✅ client: exists
✅ user: exists
✅ campaign: exists
✅ post: exists
✅ lead: exists
✅ linkedin_account: exists
✅ console_workflow: exists

--- Tables that should NOT exist (PLURAL) ---
✅ agencies: correctly NOT exists
✅ clients: correctly NOT exists
✅ users: correctly NOT exists
✅ campaigns: correctly NOT exists

=== RESULT: 12/12 tests passed ===
```

---

## History

### 2026-01-22: Unification Complete

- Created 14 RevOS tables in AudienceOS Supabase
- Updated 293 table references (plural → singular)
- Updated both .env.local and .env.vercel
- CTO audit caught 3 critical issues (.env.vercel, users/clients/agencies refs)
- Runtime verification: 12/12 passed

### 2026-01-20: Phase 0 Cleanup

- Dropped ABBY contamination tables
- Dropped orphan chat tables
- Fixed RLS on backup tables
- Decision: AudienceOS SINGULAR naming = gold standard

---

## Next Steps (From CTO Analysis)

The tables exist but API routes are missing:

1. **Webhook API Routes** - CRUD for webhook_config + delivery
2. **LinkedIn Sync Verification** - Test from RevOS context
3. **Campaign API Routes** - CRUD operations

---

**Last Verified:** 2026-01-22 (Runtime test 12/12)
