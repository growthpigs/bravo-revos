# Database Schema Sync - Pre-Implementation Checklist

**Feature:** Database Schema Sync (Phase 3)
**Created:** 2026-01-26
**Status:** IN PROGRESS

---

## Gate 1: External Dependencies (BLOCKING)

| Check | Status | Evidence |
|-------|--------|----------|
| Supabase API accessible | ✅ PASS | HTTP 200 from `ebxshdqfaqupnvpghodi.supabase.co` |
| Service role key valid | ⏳ | Need to verify write access |
| Supabase CLI installed | ⏳ | Check `supabase --version` |
| Project linked | ⏳ | Check `supabase link` status |

**Sign-off:** [ ] Gate 1 PASSED

---

## Gate 2: Schema Audit (BLOCKING)

| Check | Status | Evidence |
|-------|--------|----------|
| Existing tables documented | ✅ PASS | 40 tables in AudienceOS |
| Missing tables identified | ✅ PASS | 64 code refs to non-existent tables |
| Plural/singular categorized | ✅ PASS | ~20 naming mismatches |
| Tables to create identified | ⏳ | Need to filter dead code |
| Migration script generated | ⏳ | SQL file ready |

**Sign-off:** [ ] Gate 2 PASSED

---

## Gate 3: Code Alignment (Before Migration)

| Check | Status | Evidence |
|-------|--------|----------|
| Fix plural→singular refs | ⏳ | sed/replace in codebase |
| Remove dead table refs | ⏳ | Delete agentkit_*, gemini_* refs |
| TypeScript passes | ⏳ | `npm run typecheck` |
| Tests pass | ⏳ | `npm test` |

**Sign-off:** [ ] Gate 3 PASSED

---

## Gate 4: Migration & Verification (Before Merge)

| Check | Status | Evidence |
|-------|--------|----------|
| Migration runs successfully | ⏳ | `supabase db push` |
| Health check green | ⏳ | `/api/health` → healthy |
| All 1246 tests pass | ⏳ | No regressions |
| Runtime verification | ⏳ | Login + create content works |

**Sign-off:** [ ] Gate 4 PASSED

---

## Timeline

| Phase | Task | ETA |
|-------|------|-----|
| Gate 1 | Verify Supabase access | 10 min |
| Gate 2 | Audit & generate migration | 30 min |
| Gate 3 | Fix code refs | 1 hour |
| Gate 4 | Run migration & verify | 30 min |

**Total:** ~2 hours

---

## GO/NO-GO Decision

| Gate | Status | Signed Off |
|------|--------|------------|
| Gate 1: Dependencies | [ ] PASS / [ ] FAIL | |
| Gate 2: Schema Audit | [ ] PASS / [ ] FAIL | |
| Gate 3: Code Alignment | [ ] PASS / [ ] FAIL | |
| Gate 4: Migration | [ ] PASS / [ ] FAIL | |

**Decision:** [ ] GO - Ready for implementation / [ ] NO-GO - Address blockers first
