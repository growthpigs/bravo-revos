# Database Schema Sync - Acceptance Criteria

**Feature:** Database Schema Sync (Phase 3)
**Created:** 2026-01-26

---

## Definition of Done

- [ ] All code references point to existing tables
- [ ] Health check returns `healthy` status
- [ ] Build passes (`npm run build`)
- [ ] Tests pass (0 new failures from baseline)
- [ ] Login flow works on production
- [ ] Documentation updated (HANDOVER, CHANGELOG, feature.md)

---

## Acceptance Criteria by Story

### AC-1: Table References Fixed
**Criteria:** All `supabase.from('table')` calls reference tables that exist
**Verification:** `grep` shows 0 references to non-existent tables
**Evidence:** `comm -23 expected.txt existing.txt` returns empty

### AC-2: Plural→Singular Consistency
**Criteria:** Codebase uses singular table names (AudienceOS convention)
**Verification:** No plural table refs (`campaigns`, `users`, `posts`)
**Evidence:** `grep -r "from('.*s')" | wc -l` = 0 (after filtering valid singular)

### AC-3: Missing Tables Created
**Criteria:** Required tables exist in AudienceOS Supabase
**Verification:** Query `information_schema.tables`
**Evidence:** All tables in migration exist

### AC-4: Health Check Green
**Criteria:** `/api/health` returns `{"status": "healthy"}`
**Verification:** `curl /api/health | jq .status`
**Evidence:** Output = "healthy"

### AC-5: No Test Regressions
**Criteria:** Test count: 1246+ pass, ≤11 fail (baseline)
**Verification:** `npm test`
**Evidence:** Test summary shows no new failures

### AC-6: Production Verified
**Criteria:** User can log in and perform basic actions
**Verification:** Manual test on ra-revos.vercel.app
**Evidence:** Screenshot or recording

---

## Verification Commands

```bash
# AC-1: Table references
comm -23 /tmp/expected_tables.txt /tmp/existing_tables.txt | wc -l
# Expected: 0

# AC-2: No plural refs (spot check)
grep -r "from('campaigns')" lib/ app/ | wc -l
# Expected: 0

# AC-3: Tables exist
curl -s "https://ebxshdqfaqupnvpghodi.supabase.co/rest/v1/webhook_config?limit=1" \
  -H "apikey: $ANON_KEY" | jq .
# Expected: [] (empty array, not error)

# AC-4: Health check
curl -s "https://ra-revos.vercel.app/api/health" | jq .status
# Expected: "healthy"

# AC-5: Tests
npm test 2>&1 | tail -5
# Expected: Tests: X passed, ≤11 failed

# AC-6: Login
# Manual: Go to ra-revos.vercel.app/auth/login, sign in, verify dashboard loads
```

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Dev | Deputy | | |
| QA | Manual verification | | |
| PM | Roderic | | |
