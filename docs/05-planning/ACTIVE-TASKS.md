# Diiiploy OS - Active Tasks

**Last Updated:** 2026-01-26
**Status:** 🟡 Operational with blockers

---

## Current Priority (P0)

### 1. Fix Build Failure
**Problem:** Build fails due to missing OPENAI_API_KEY during page data collection
**Location:** `/api/test-email-generation` route
**Fix:** Use dynamic import or move API key validation to runtime
**Effort:** 30 minutes

### 2. Fix Render Worker
**Service:** bravo-revos-engagement-worker (srv-d519ifqli9vc73b002ug)
**Problem:** Server exiting with status 1 - missing env vars
**Required on Render Dashboard:**
- `REDIS_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `UNIPILE_API_KEY`
**Effort:** 15 minutes

---

## Roadmap Queue (P1)

### Phase 2: Bidirectional Navigation
- Add AppSwitcher to RevOS sidebar
- Configure RevOS as native app
- **Effort:** 1-2 days
- **Status:** Partially done (AudienceOS → RevOS works)

### Phase 3: Shared Memory
- Define memory tagging schema (`app::domain::topic`)
- Update both apps to tag Mem0 writes
- Add cross-app intent detection
- **Effort:** 5 days

### Phase 4: Unified Auth (SSO)
- Add RevOS tables to AudienceOS Supabase
- Update RevOS .env to use AudienceOS Supabase
- Migrate RLS policies to function-based pattern
- **Effort:** 2-3 days

### Phase 5: UI Alignment
- Replace RevOS sidebar with LinearSidebar
- Add Poppins font and gradient branding
- Add dark mode support
- **Effort:** 2-3 days

---

## Tech Debt (P2)

- [ ] Fix 48 skipped test files (Supabase mock pattern)
- [ ] Consolidate 15 legacy non-PAI v2 folders in `docs/`
- [ ] Resolve HGC monorepo git status (untracked)
- [ ] Address Next.js 16 async params warnings (23 routes)

---

## NOT DOING

### Phase 6: Database Merge (20-25 days)
**Reason:** Table naming convention mismatch would require rewriting 15+ chips
**Alternative:** Keep databases separate, share context via Mem0 memory tagging

---

## Quick Reference

| Resource | Location |
|----------|----------|
| Tracking Sheet | [Diiiploy-OS Issues](https://docs.google.com/spreadsheets/d/1QdTBb5eJJiKsrb2Zj1n5qahYZ_A-ODXmLf4C34xMEsc/edit) |
| Vercel | bravo-revos.vercel.app |
| Render Worker | srv-d519ifqli9vc73b002ug |
| Slack Canvas | F0AATP37P1T in #diiiploy-os |

---

*Next session: Fix P0 blockers first, then continue Phase 2*
