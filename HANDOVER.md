# RevOS - Session Handover

**Last Updated:** 2026-01-20 16:30 CET
**Branch:** main
**Session:** Database Merge - Phase 0 Cleanup COMPLETE

---

## Current Task

**RevOS + AudienceOS Database Merge**

Combining RevOS and AudienceOS into a shared database with app toggle (like 11 Labs studio/agents).

### Progress

- [x] Researched both schemas
- [x] Created `features/DATABASE-MERGE.md` spec
- [x] **STRESS TEST PASSED** - Runtime verification via Claude in Chrome
- [x] Verified ABBY contamination (empty tables - safe to drop)
- [x] Verified active chat tables (plural = active, singular = orphan)
- [x] Verified RLS security warnings in both DBs
- [x] Decided naming convention (AudienceOS singular = gold standard)
- [x] Documented app_context table categorization
- [x] **PHASE 0 CLEANUP COMPLETE** - All scripts executed and verified
- [ ] Create migration scripts
- [ ] UI alignment research

### Phase 0 Cleanup Results (Confidence: 10/10)

| Task | Action | Status |
|------|--------|--------|
| ABBY tables | DROP `outfit_history`, `swatches`, `swipe_cartridges` | ✅ DONE |
| Orphan chat tables | DROP `chat_message`, `chat_session` (singular) | ✅ DONE |
| RLS RevOS | Enable on `backup_dm_sequences`, `campaigns_trigger_word_backup` | ✅ DONE |
| RLS AudienceOS | Enable on `user`, `permission` | ✅ DONE |
| Verification | Table Editor inspection in both DBs | ✅ VERIFIED |

### Key Decisions Made

1. **AudienceOS is gold standard** for UI/menus AND naming convention
2. **Single shared database** - AudienceOS Supabase (`ebxshdqfaqupnvpghodi`)
3. **App context pattern** - `app_context` column for app-specific data
4. **HGC will be shared** - same component, different backend per app
5. **SINGULAR naming** - All tables use singular names (agency, client, chat_message)

---

## Schema Merge Summary

### VERIFIED TABLE COUNTS

| Database | Original Estimate | Actual Count |
|----------|-------------------|--------------|
| AudienceOS | 19 | **26+** |
| RevOS | 30 | **55+** |

### SHARED (Merge)

| Concept | AudienceOS | RevOS | Action |
|---------|------------|-------|--------|
| Tenant | `agency` | `agencies` | Use AudienceOS |
| Users | `user` | `users` | Use AudienceOS |
| Clients | `client` | `clients` | Use AudienceOS |
| Chat | `chat_session` | `chat_sessions` | Unify (singular) |
| Cartridges | Multiple types | `brand_cartridges` etc | Unify |

### CLEANUP COMPLETE ✅

**RevOS - DROPPED tables:**
- ~~`outfit_history`~~ (ABBY - 0 rows) ✅
- ~~`swatches`~~ (ABBY - 0 rows) ✅
- ~~`swipe_cartridges`~~ (ABBY - 0 rows) ✅
- ~~`chat_message`~~ (orphan - 0 rows) ✅
- ~~`chat_session`~~ (orphan - 0 rows) ✅

**RLS Fixed:**
- RevOS: `backup_dm_sequences`, `campaigns_trigger_word_backup` ✅
- AudienceOS: `user`, `permission` ✅

---

## Blockers

**ALL RESOLVED:**
- ~~ABBY contamination~~ → Tables dropped ✅
- ~~Duplicate chat tables~~ → Orphans dropped ✅
- ~~RLS warnings~~ → Fixed in both DBs ✅
- ~~Naming convention~~ → Decision: use singular (AudienceOS) ✅

**REMAINING:**
- None - Phase 0 complete, ready for Phase 1

---

## Next Steps (For Next Session)

1. ~~**Run Phase 0 cleanup**~~ - ✅ COMPLETE
2. **Create migration script** - Schema additions to AudienceOS (add RevOS-only tables)
3. **UI alignment research** - Compare RevOS menus vs AudienceOS Linear design
4. **HGC extraction** - Plan shared component architecture

---

## Files Changed This Session

- `features/DATABASE-MERGE.md` - Phase 0 cleanup scripts documented
- `HANDOVER.md` - Updated with Phase 0 completion status

### SQL Executed This Session

**RevOS (`trdoainmejxanrownbuz`):**
```sql
DROP TABLE IF EXISTS outfit_history;
DROP TABLE IF EXISTS swatches;
DROP TABLE IF EXISTS swipe_cartridges;
DROP TABLE IF EXISTS chat_message;
DROP TABLE IF EXISTS chat_session;
ALTER TABLE backup_dm_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns_trigger_word_backup ENABLE ROW LEVEL SECURITY;
```

**AudienceOS (`ebxshdqfaqupnvpghodi`):**
```sql
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission ENABLE ROW LEVEL SECURITY;
```

---

## Branch Status

**Clean branches (keep):**
- `main` - Primary development
- `staging` - Staging deploys
- `production` - Production deploys

---

## Related Projects

- **AudienceOS:** `/Users/rodericandrews/_PAI/projects/audienceos`
  - Supabase: `ebxshdqfaqupnvpghodi` (will be PRIMARY)
  - Deployment: audienceos-agro-bros.vercel.app

- **RevOS:** This project
  - Supabase: `trdoainmejxanrownbuz` (will be DEPRECATED after merge)
  - Deployment: bravo-revos.vercel.app

---

**Handover Author:** Chi CTO
**Verification Method:** Claude in Chrome (Supabase SQL Editor + Table Editor runtime verification)
