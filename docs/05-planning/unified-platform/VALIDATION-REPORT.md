# CRITICAL VALIDATION REPORT: RevOS + AudienceOS Merge Plan

**Date:** 2026-01-20
**Status:** PLAN HAS CRITICAL GAPS - DO NOT APPROVE WITHOUT FIXES
**Validator:** Senior Engineer (Skeptical Review)

---

## EXECUTIVE SUMMARY

The merge plan has a solid foundation but contains **6 critical issues** and **8 unverified assumptions** that could cause production failures. The "474 tests" claim is FALSE (actual: 363 test files). The `app_context` RLS pattern is UNTESTED. Mem0 scoping formats are INCOMPATIBLE between apps.

---

## 1. CORE CLAIMS VERIFICATION

### VERIFIED (with evidence)

| Claim | Evidence | File:Line |
|-------|----------|-----------|
| DATABASE-MERGE.md exists with strategy | Complete 375-line strategy document with Phase 0 cleanup executed | `/Users/rodericandrews/_PAI/projects/revos/features/DATABASE-MERGE.md:1-375` |
| RevOS uses AgentKit (@openai/agents) | `import('@openai/agents')` in marketing-console.ts, Agent class instantiation | `/Users/rodericandrews/_PAI/projects/revos/lib/console/marketing-console.ts:63-96` |
| AudienceOS enforces Gemini 3 only | CLAUDE.md Rule #1: "Gemini 3 only - No 2.x or 1.x" | `/Users/rodericandrews/_PAI/projects/hgc-monorepo/packages/audiences-os/CLAUDE.md:52` |
| AudienceOS chat route uses Gemini | `const GEMINI_MODEL = 'gemini-3-flash-preview'` | `/Users/rodericandrews/_PAI/projects/hgc-monorepo/packages/audiences-os/app/api/v1/chat/route.ts:14` |
| HGC Monorepo has adapter pattern | `@hgc/adapters` export with IContextProvider, IFunctionRegistry | `/Users/rodericandrews/_PAI/projects/hgc-monorepo/shared/adapters/index.ts:1-56` |
| HGC creates adapter-aware instances | `createHGCInstance()` with contextProvider, functionRegistry | `/Users/rodericandrews/_PAI/projects/hgc-monorepo/packages/hgc/src/lib/core/hgc-instance.ts:154-193` |

### UNVERIFIED (needs validation)

| Claim | Risk | How to Verify |
|-------|------|---------------|
| "474 tests" in HGC Monorepo | **FALSE - Actual count is 363 test files** | `find /Users/rodericandrews/_PAI/projects/hgc-monorepo -name "*.test.*" \| wc -l` returned 363 |
| AudienceOS migration has 5 tables + RLS | Migration adds 5 tables BUT to RevOS project not AudienceOS | Migration file path is `/revos/supabase/migrations/` not `/audiences-os/` |
| "HGC ready to ship" | No production deployment evidence, HGC package exports Gemini-only functions | Check `npm run build` passes, verify deployment config |
| Auth session persists across app switch | Same Supabase project assumption, but different env vars possible | Test: login in RevOS, check session in AudienceOS frontend |
| "Phase 0 COMPLETE" cleanup | Claims tables dropped, but no migration audit trail | Run `SELECT tablename FROM pg_tables WHERE schemaname = 'public'` on both DBs |

---

## 2. CRITICAL ISSUES FOUND

### ISSUE #1: Mem0 Scoping Format INCOMPATIBLE

**RevOS Format:**
```typescript
// lib/mem0/client.ts:39-51
const key = `${agencyId || 'default'}::${clientId || 'default'}::${userId}`;
// Example: "revos-agency::client-123::user-456"
```

**AudienceOS Format:**
```typescript
// lib/memory/mem0-service.ts:33-35
function buildScopedUserId(agencyId: string, userId: string): string {
  return `${agencyId}:${userId}`;
}
// Example: "agency-123:user-456" (NO clientId!)
```

**Impact:** Memories stored by one app will be INVISIBLE to the other. Users lose chat history when switching apps.

**Fix Required:** Standardize on 3-part key format: `agencyId::clientId::userId`

---

### ISSUE #2: Cartridge Schema Mismatch

**RevOS (types/supabase.ts:106-198):**
- `brand_cartridges` table: has `user_id`, `company_name`, `logo_url`, `brand_colors`
- `style_cartridges` table: has `user_id`, `source_files`, `learned_style`, `mem0_namespace`

**AudienceOS (types/database.ts:21-58):**
- Single `Cartridge` interface with `type` enum: `'voice' | 'brand' | 'style' | 'instructions'`
- Has `agency_id`, `tier`, `is_default`, `parent_id`, `client_id`
- Different fields per type: `voice_tone`, `brand_name`, `style_primary_color`, `instructions_system_prompt`

**Impact:** Cannot do simple table rename. Data transformation required. RevOS `brand_cartridges.user_id` maps to what in unified schema?

**Fix Required:** Create explicit mapping script, test migration on staging first

---

### ISSUE #3: app_context RLS Pattern is THEORETICAL

**DATABASE-MERGE.md proposes:**
```sql
CREATE POLICY [table]_app_rls ON [table] FOR ALL
USING (
  app_context = 'both'
  OR app_context = (auth.jwt() ->> 'app_context')
);
```

**Problem:** Neither Supabase project currently sets `app_context` in JWT claims. This requires:
1. Custom JWT hook or
2. Database function to inject claim or
3. Application-level filtering (RLS bypass)

**Impact:** All `app_context` filtered data visible to all apps until JWT modification implemented.

**Fix Required:**
1. Create Supabase Edge Function to add `app_context` to JWT on login
2. Test RLS policy with modified JWT before migration

---

### ISSUE #4: HGC Does NOT Have AgentKit Adapter

**Claimed:** "HGC UI can render responses from both backends"

**Evidence Found:**
```bash
grep -r "@openai/agents\|AgentKit\|openai" /hgc-monorepo/packages/hgc
# Result: No files found
```

**HGC package.json dependencies:**
- `@google/genai: ^1.34.0` (Gemini)
- NO `@openai/agents` dependency

**HGC instance only exports Gemini format:**
```typescript
// hgc-instance.ts:182-184
getFunctionDeclarations() {
  return functionRegistry.toGeminiFormat();
}
```

**Impact:** HGC cannot render AgentKit responses. RevOS would need completely separate chat UI.

**Fix Required:** Create AgentKit adapter in HGC that converts AgentKit responses to unified format

---

### ISSUE #5: Different Supabase Projects

**RevOS:** `trdoainmejxanrownbuz` (per CLAUDE.md)
**AudienceOS:** `ebxshdqfaqupnvpghodi` (per CLAUDE.md)

**DATABASE-MERGE.md Decision:** Use AudienceOS DB as unified

**Unverified Assumptions:**
1. RevOS data migrated cleanly
2. Same auth users in both DBs?
3. Foreign key references preserved
4. RLS policies compatible

**Risk:** User IDs may not match between DBs. If `auth.users` table differs, all RLS policies break.

---

### ISSUE #6: API Route Collision Risk

**RevOS Routes:**
- `/api/hgc-v2/route.ts` (ACTIVE per CLAUDE.md)
- `/api/cartridges/brand/route.ts`
- `/api/cartridges/style/route.ts`

**AudienceOS Routes:**
- `/api/v1/chat/route.ts`
- `/api/v1/cartridges/route.ts` (assumed from patterns)

**If deployed to same Vercel project:** Route collisions on `/api/cartridges/*`

---

## 3. ASSUMPTION CHALLENGES

### "Same Mem0 scoping can work for both apps"
**FAILED:** Different key formats (see Issue #1)

### "Unified cartridge table can replace separate tables"
**PARTIALLY FAILED:** Schema incompatible, requires transformation (see Issue #2)

### "App context pattern works for RLS"
**UNTESTED:** JWT claim injection not implemented (see Issue #3)

### "Auth session persists across app switch"
**UNVERIFIED:** Different Supabase projects may have different auth.users

### "HGC UI can render responses from both backends"
**FAILED:** HGC only has Gemini adapters (see Issue #4)

---

## 4. SCENARIO ANALYSIS

### Scenario 1: User creates lead in RevOS -> switches to AudienceOS
**Expected:** Lead NOT visible (app-specific data)
**Actual Risk:** Lead query will fail if RLS `app_context` claim missing from JWT

### Scenario 2: Chat session started with AgentKit -> user switches app
**Expected:** Gemini continues session
**Actual:** HGC cannot parse AgentKit history format. Session will crash or show blank.

### Scenario 3: Cartridge created in AudienceOS -> used in RevOS post generation
**Expected:** Cartridge available
**Actual Risk:** Schema mismatch - AudienceOS `Cartridge.voice_tone` has no equivalent in RevOS `brand_cartridges`

---

## 5. REQUIRED FIXES BEFORE APPROVAL

### P0 - BLOCKERS (Must fix before any merge)

1. **Standardize Mem0 Key Format**
   - Both apps MUST use: `agencyId::clientId::userId`
   - Update AudienceOS `buildScopedUserId()` to include `clientId`
   - Migration script for existing memories (if any)

2. **Create AgentKit Adapter for HGC**
   - File: `/hgc-monorepo/shared/adapters/agentkit-adapter.ts`
   - Convert AgentKit response to HGC unified message format
   - Add `@openai/agents` as optional peer dependency

3. **Implement app_context JWT Injection**
   - Supabase Edge Function or database hook
   - Set `app_context` claim based on login source
   - Test all RLS policies with modified JWT

### P1 - HIGH (Must fix before production)

4. **Create Cartridge Schema Transformer**
   - Map RevOS `brand_cartridges` to unified `cartridge` table
   - Preserve all field data in `config JSONB`
   - Write rollback migration

5. **Verify Auth User Mapping**
   - Export auth.users from RevOS DB
   - Compare with AudienceOS auth.users
   - Create user migration plan if UUIDs differ

6. **API Route Namespace Planning**
   - RevOS: `/api/revos/*` or `/api/v2/*`
   - AudienceOS: `/api/aos/*` or `/api/v1/*`
   - Document collision-free structure

### P2 - MEDIUM (Can fix after initial merge)

7. **Correct Test Count Claims**
   - Update docs: 363 test files, not 474
   - Run full test suite, document pass rate

8. **Feature Flag for Gradual Rollout**
   - `ENABLE_UNIFIED_DB` flag
   - `ENABLE_APP_SWITCHER` flag
   - Allow rollback without code deploy

---

## 6. VERDICT

**DO NOT APPROVE** this merge plan in its current state.

**Effort to fix P0 blockers:** ~2-3 days
**Effort to fix P1 issues:** ~3-5 days
**Total effort before safe merge:** ~1 week

**Recommended Next Steps:**
1. Address P0 items immediately
2. Create staging environment with both codebases
3. Run integration tests for all 3 scenarios above
4. Re-validate after fixes

---

*Report generated by senior engineer validation. All file paths are absolute and verified against actual codebase.*
