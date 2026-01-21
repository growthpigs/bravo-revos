# Phase 0 Database Cleanup Plan - RevOS + AudienceOS

## PAI V2 DEVELOPMENT PROTOCOL

### Task Summary
**What:** Complete Phase 0 database cleanup for RevOS + AudienceOS merge
**Why:** Pre-requisite for database merge - cannot merge with contaminated tables and security gaps

---

## 80/20 STRATIFICATION (MoSCoW)

| Priority | Task | Status |
|----------|------|--------|
| **MUST HAVE** | RevOS: Drop ABBY tables | ✅ DONE |
| **MUST HAVE** | RevOS: Drop orphan chat tables | ✅ DONE |
| **MUST HAVE** | RevOS: Enable RLS on backup tables | ✅ DONE |
| **MUST HAVE** | AudienceOS: Enable RLS on user/permission | ✅ DONE |
| **MUST HAVE** | Verify all cleanup via Table Editor | ✅ DONE |
| **SHOULD HAVE** | Update HANDOVER.md with completion | ✅ DONE |

---

## RISK & DEFINITION TABLE

| Category | Details |
|----------|---------|
| **Assumptions** | Tables are empty (verified via SQL COUNT queries); RLS enable won't break existing queries |
| **Definition of Done** | No UNRESTRICTED badges in Table Editor; No dropped tables visible; RLS warnings cleared |
| **Rollback Plan** | Tables can be recreated from schema if needed; RLS can be disabled with `DISABLE ROW LEVEL SECURITY` |
| **Minimum Viable Proof** | SQL queries executed with "Success" message; Table Editor shows no warnings |

---

## TEST PLAN

| Test Type | Command/Action | Expected Result | Status |
|-----------|----------------|-----------------|--------|
| **RevOS Tables** | Check Table Editor for dropped tables | outfit_history, swatches, swipe_cartridges NOT visible | ✅ VERIFIED |
| **RevOS Chat** | Check Table Editor | chat_message, chat_session (singular) NOT visible | ✅ VERIFIED |
| **RevOS RLS** | Check Table Editor badges | No UNRESTRICTED on backup tables | ✅ VERIFIED |
| **AudienceOS RLS** | Check Table Editor | No RLS warnings on user/permission | ✅ VERIFIED |

---

## Current Status: ✅ COMPLETE

### Already Executed (RevOS) ✅
The following cleanup was successfully executed on RevOS (`trdoainmejxanrownbuz`):

```sql
-- COMPLETED: Drop ABBY contamination tables
DROP TABLE IF EXISTS outfit_history;    ✅
DROP TABLE IF EXISTS swatches;          ✅
DROP TABLE IF EXISTS swipe_cartridges;  ✅

-- COMPLETED: Drop orphan chat tables
DROP TABLE IF EXISTS chat_message;      ✅
DROP TABLE IF EXISTS chat_session;      ✅

-- COMPLETED: Fix RLS on backup tables
ALTER TABLE backup_dm_sequences ENABLE ROW LEVEL SECURITY;         ✅
ALTER TABLE campaigns_trigger_word_backup ENABLE ROW LEVEL SECURITY; ✅
```

**Result:** "Success. No rows returned" - All commands executed successfully.

---

### AudienceOS Cleanup ✅ COMPLETE

**Target Database:** `ebxshdqfaqupnvpghodi` (audienceos-cc-fresh)

```sql
-- AudienceOS Phase 0 Cleanup - EXECUTED
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;      ✅
ALTER TABLE permission ENABLE ROW LEVEL SECURITY;  ✅
```

**Result:** "Success. No rows returned" - All commands executed successfully.

---

## Verification Steps

After cleanup, verify by checking the Table Editor in both databases:

1. **RevOS Verification:**
   - Navigate to Table Editor
   - Confirm `outfit_history`, `swatches`, `swipe_cartridges` no longer exist
   - Confirm `chat_message`, `chat_session` (singular) no longer exist
   - Confirm `backup_dm_sequences` and `campaigns_trigger_word_backup` no longer show UNRESTRICTED badge

2. **AudienceOS Verification:**
   - Navigate to Table Editor
   - Confirm `user` table no longer shows RLS warning
   - Confirm `permission` table no longer shows UNRESTRICTED badge

---

## Files Updated

- `features/DATABASE-MERGE.md` - Phase 0 cleanup scripts documented
- `HANDOVER.md` - Session progress tracked

---

## Next Steps After Cleanup

1. Complete AudienceOS RLS fix (if not already done)
2. Verify all cleanup successful via Table Editor inspection
3. Update HANDOVER.md with completion status
4. Ready for Phase 1: Schema Migration
