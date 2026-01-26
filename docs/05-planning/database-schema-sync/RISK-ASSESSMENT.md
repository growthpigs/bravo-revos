# Database Schema Sync - Risk Assessment

**Feature:** Database Schema Sync (Phase 3)
**Created:** 2026-01-26

---

## Risk Matrix

| Risk | Likelihood | Impact | Score | Mitigation |
|------|------------|--------|-------|------------|
| 1. Wrong tables created | LOW | HIGH | 🟡 | Audit before migration, use singular naming |
| 2. Data loss during migration | LOW | CRITICAL | 🔴 | No DROP statements, only CREATE |
| 3. RLS policy breaks | MEDIUM | HIGH | 🟡 | Copy existing RLS patterns |
| 4. Code refs still broken after fix | MEDIUM | MEDIUM | 🟡 | Run typecheck + tests |
| 5. Production downtime | LOW | CRITICAL | 🔴 | Test on staging first |
| 6. Supabase rate limits | LOW | LOW | 🟢 | Single migration batch |

---

## Risk Details

### Risk 1: Wrong Tables Created
**Description:** Creating tables that aren't needed or with wrong schema
**Mitigation:**
- Audit which tables are actually used at runtime
- Cross-reference with existing migrations
- Only create tables that have active code paths

### Risk 2: Data Loss
**Description:** Migration accidentally drops or corrupts data
**Mitigation:**
- Migration is CREATE-only, no DROP or ALTER
- Backup before migration (Supabase point-in-time)
- Test migration on local first

### Risk 3: RLS Policy Breaks
**Description:** New tables missing RLS = security hole
**Mitigation:**
- Enable RLS on all new tables
- Copy policy patterns from existing tables
- Verify with service role vs anon key tests

### Risk 4: Code Still Broken
**Description:** Not all plural→singular refs fixed
**Mitigation:**
- Automated grep/sed replacement
- TypeScript compile check
- Runtime smoke test

### Risk 5: Production Downtime
**Description:** Migration causes outage
**Mitigation:**
- CREATE IF NOT EXISTS (idempotent)
- Run during low-traffic window
- Rollback = no action (tables just exist unused)

---

## Contingency Plans

| Scenario | Response |
|----------|----------|
| Migration fails | Check Supabase logs, fix syntax, retry |
| New tables wrong schema | ALTER TABLE to fix, or drop and recreate |
| RLS blocks access | Add permissive policy, audit later |
| Tests still fail | Revert code changes, investigate |

---

## Monitoring Plan

| Metric | Tool | Alert Threshold |
|--------|------|-----------------|
| Health check status | `/api/health` | != healthy |
| Supabase errors | Supabase Dashboard | Any 500s |
| Build status | Vercel | Build fails |
| Test failures | npm test | Any new failures |
