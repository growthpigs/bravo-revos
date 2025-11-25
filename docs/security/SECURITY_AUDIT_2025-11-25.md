# Security Audit Report - Bravo revOS
**Date:** 2025-11-25
**Auditor:** Claude Code (Sonnet 4.5)
**Scope:** Complete codebase security review
**Methods:** Automated codebase analysis + manual code review

---

## Executive Summary

**Overall Security Rating: 6.5/10**

The codebase demonstrates solid foundational security practices (RLS policies, authentication checks, encryption utilities) but contains **3 CRITICAL** and **5 HIGH** severity vulnerabilities that must be addressed before production deployment.

**Critical Findings:**
- ✅ RLS policies properly implemented on all tables
- ✅ Authentication enforced on most endpoints
- ✅ Encryption utilities properly structured
- ❌ Admin authentication bypass allows all users admin access
- ❌ Default hardcoded encryption key if env var missing
- ❌ Weak randomness (Math.random) used for security-critical operations

---

## CRITICAL VULNERABILITIES (Immediate Action Required)

### C-1: Admin Authentication Bypass 🚨
**File:** `lib/auth/admin.ts:26-28`
**Severity:** CRITICAL
**Impact:** ALL authenticated users can access admin features

**Current Code:**
```typescript
if (error || !data) {
  console.log('[ADMIN_CHECK] User is NOT admin:', userId)
  // TEMPORARY: Allow all authenticated users to test the flow
  console.log('[ADMIN_CHECK] BYPASSING - allowing user for testing')
  return true  // ⚠️ ALL USERS PASS AS ADMINS
}
```

**Attack Vector:**
1. User authenticates with any valid account
2. Calls admin endpoints (`/api/admin/*`)
3. `isUserAdmin()` returns `true` for everyone
4. User gains access to:
   - Admin dashboard
   - Console prompt management (override workflows)
   - System configuration
   - User creation/deletion

**Fix:**
```typescript
if (error || !data) {
  console.log('[ADMIN_CHECK] User is NOT admin:', userId)
  return false  // Deny access if not in admin_users table
}
```

**Affected Endpoints:**
- `/api/admin/create-user-direct`
- `/api/admin/console-config`
- `/api/admin/orchestration-dashboard`
- All routes using `getCurrentAdminUser()`

**Recommendation:** Remove lines 26-28 immediately. The `admin_users` table exists and is properly structured.

---

### C-2: Hardcoded Default Encryption Key 🚨
**File:** `lib/encryption.ts:22-26`
**Severity:** CRITICAL
**Impact:** All encrypted data can be decrypted by anyone with source code access

**Current Code:**
```typescript
if (!key) {
  console.warn('Warning: ENCRYPTION_KEY not set...');
  // Default 32-byte key for development (DO NOT USE IN PRODUCTION)
  return Buffer.from(
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    ENCODING
  );
}
```

**Attack Vector:**
1. If `ENCRYPTION_KEY` env var is missing in production
2. System falls back to hardcoded key visible in GitHub
3. Attacker can decrypt:
   - LinkedIn access tokens
   - API credentials
   - User secrets
   - Webhook signatures

**Fix:**
```typescript
if (!key) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('ENCRYPTION_KEY environment variable is required in production');
  }
  console.warn('Warning: ENCRYPTION_KEY not set, using default key for development');
  return Buffer.from(
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    ENCODING
  );
}
```

**Recommendation:** Make encryption key mandatory in production, fail hard if missing.

---

### C-3: Weak Cryptographic Randomness 🚨
**Files:** Multiple (`lib/unipile-client.ts`, `lib/chips/offerings.ts`, `lib/utils/crypto.ts`)
**Severity:** CRITICAL
**Impact:** Predictable IDs, tokens, and session values

**Problem Areas:**

**1. Mock Data Generation:**
```typescript
// lib/unipile-client.ts
account_id: `mock_${Math.random().toString(36).substr(2, 9)}`,
id: `mock_comment_${Math.random().toString(36).substr(2, 9)}`,
```

**2. Offering IDs:**
```typescript
// lib/chips/offerings.ts
id: `offering-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
```

**3. Random Integer Generation:**
```typescript
// lib/utils/crypto.ts
export function generateRandomInt(min: number, max: number): string {
  return Math.floor(Math.random() * (max - min + 1) + min).toString();
}
```

**Attack Vector:**
- `Math.random()` is NOT cryptographically secure
- If these IDs leak into production, attackers can brute-force/enumerate resources
- Session tokens generated with Math.random can be predicted

**Fix:**
```typescript
import crypto from 'crypto';

// For security-critical randomness
const randomId = crypto.randomBytes(9).toString('base64url');

// For random integers
const randomInt = crypto.randomInt(min, max);
```

**Recommendation:** Replace ALL `Math.random()` in security contexts with `crypto.randomBytes()` or `crypto.randomInt()`.

---

## HIGH SEVERITY VULNERABILITIES

### H-1: TypeScript `any` Type Overuse (50+ instances)
**Files:** Multiple (`app/api/cartridges/route.ts`, `lib/console/*.ts`)
**Severity:** HIGH
**Impact:** Type safety disabled, allows malformed data, hard to catch bugs

**Examples:**

**Cartridge Creation:**
```typescript
// app/api/cartridges/route.ts:116
const insertData: any = {  // ⚠️ Bypasses all type safety
  name,
  description,
  tier,
  voice_params: voice_params || {},
  created_by: user.id,
};
```

**Workflow Execution:**
```typescript
// lib/console/workflow-executor.ts:24
const result: any = await executeStep(step, state);
```

**Marketing Console:**
```typescript
// lib/console/marketing-console.ts:18,29,34
private tools: any[];
private openai: any;
private config: any;
```

**Impact:**
- Required fields can be missing (no compile-time check)
- API contract violations go undetected
- Data corruption possible
- Harder to refactor safely

**Fix:** Replace with Zod schemas:
```typescript
import { z } from 'zod';

const CartridgeInsertSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  tier: z.enum(['agency', 'client', 'user']),
  voice_params: z.record(z.any()).default({}),
  created_by: z.string().uuid(),
});

const insertData = CartridgeInsertSchema.parse({
  name,
  description,
  tier,
  voice_params: voice_params || {},
  created_by: user.id,
});
```

---

### H-2: RLS Policies Using JWT Claims
**File:** `supabase/migrations/034_fix_console_rls_admin_only.sql:17-22`
**Severity:** HIGH
**Impact:** JWT claims can be forged if authentication is compromised

**Current Policy:**
```sql
CREATE POLICY "Only admins can create console prompts"
  ON console_prompts FOR INSERT
  WITH CHECK (
    (auth.jwt() ->> 'role')::text = 'admin'  -- ⚠️ JWT claims not trustworthy
    OR
    auth.uid() IN (SELECT id FROM auth.users WHERE id IN (SELECT user_id FROM admin_users))
  );
```

**Issue:** Relying on `auth.jwt() ->> 'role'` is dangerous because:
- JWT claims can be forged if signing key is compromised
- Custom claims may not be properly validated
- Database should be the single source of truth for authorization

**Fix:**
```sql
CREATE POLICY "Only admins can create console prompts"
  ON console_prompts FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE deleted_at IS NULL)
  );
```

**Recommendation:** Remove JWT claim checks, rely ONLY on `admin_users` table.

---

### H-3: Missing Input Validation (20+ Endpoints)
**Pattern:** Many API routes accept JSON without Zod validation
**Severity:** HIGH
**Impact:** Malformed data, type confusion, injection attacks

**Example:**
```typescript
// app/api/webhook-delivery/route.ts:53
const { test, leadId, webhookUrl, webhookSecret, campaignName, customFields } = body;

// Only webhookUrl is validated, others are not
if (!webhookUrl) {
  return NextResponse.json({ error: 'webhookUrl is required' }, { status: 400 });
}
```

**Issues:**
- `test` field not validated (could be any type)
- `customFields` potentially unsafe objects
- `leadId` not validated (could be SQL injection if used in raw query)

**Fix:** Use Zod for all request validation:
```typescript
const WebhookDeliverySchema = z.object({
  test: z.boolean().optional(),
  leadId: z.string().uuid().optional(),
  webhookUrl: z.string().url(),
  webhookSecret: z.string().optional(),
  campaignName: z.string().min(1).max(255).optional(),
  customFields: z.record(z.string()).optional(),
});

const validatedBody = WebhookDeliverySchema.parse(body);
```

---

### H-4: No Rate Limiting on Critical Endpoints
**Files:** All API routes
**Severity:** HIGH
**Impact:** DDoS, brute-force attacks, resource exhaustion

**Missing Rate Limiting On:**
- `/api/hgc-v2` (chat endpoint - expensive OpenAI calls)
- `/api/cartridges` (CRUD operations)
- `/api/webhook-delivery` (external requests)
- `/api/linkedin/auth` (OAuth flow)

**Recommendation:** Implement rate limiting using Upstash Redis:
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
});

// In API route
const { success } = await ratelimit.limit(user.id);
if (!success) {
  return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
}
```

---

### H-5: Incomplete Implementations (TODOs in Production Code)
**Files:** `lib/chips/dm-chip-full.ts`, `lib/chips/pod-chip.ts`, `lib/email/pod-invites.ts`
**Severity:** HIGH
**Impact:** Silent failures, unexpected behavior

**Examples:**

**DM Chip:**
```typescript
// lib/chips/dm-chip-full.ts
async execute(state: ChipState): Promise<ChipResult> {
  // TODO: Implement actual UniPile API call
  return {
    success: true,
    data: { status: 'DM sent (mock)' },
  };
}
```

**Pod Chip:**
```typescript
// lib/chips/pod-chip.ts
// TODO: Implement actual webhook calls
console.log('[POD_CHIP] Would send webhook to:', webhookUrl);
```

**Email Invites:**
```typescript
// lib/email/pod-invites.ts
// TODO: Integrate with Resend API in production
console.log('[EMAIL] Would send pod invite to:', memberEmail);
```

**Impact:** These features appear to work but silently fail. Users think emails are sent, DMs are delivered, but nothing actually happens.

**Recommendation:** Complete implementations or add explicit warnings.

---

## MEDIUM SEVERITY ISSUES

### M-1: Session/State Race Conditions
**Files:** `lib/console/workflow-executor.ts`, `lib/console/marketing-console.ts`
**Severity:** MEDIUM
**Impact:** Concurrent requests could corrupt state

**Issue:** No distributed locking mechanism for workflow execution. Multiple simultaneous requests could execute steps out of order.

**Recommendation:** Implement optimistic locking or transaction-based state management.

---

### M-2: Console Prompts World-Readable
**File:** `supabase/migrations/034_fix_console_rls_admin_only.sql:49-50`
**Severity:** MEDIUM
**Impact:** Reveals system architecture to all authenticated users

**Current Policy:**
```sql
-- SELECT policy remains: anyone can read active consoles
-- (already exists, don't need to modify)
```

**Issue:** Any authenticated user can read all console prompts (workflow definitions). While less critical than admin operations, this reveals:
- System architecture
- Workflow logic
- AI prompts
- Could be used to find vulnerabilities

**Recommendation:** Restrict SELECT to admins if prompts are sensitive.

---

### M-3: V2/V3 Architecture Confusion
**Status:** V3 active (raw OpenAI), V2 disabled
**Severity:** MEDIUM
**Impact:** Security model unclear, technical debt

**Issue:** Documentation claims V2 is "100% compliant" but it's actually disabled. Creates confusion about which security controls are active.

**Recommendation:** Complete V2 migration or formally remove V2 code.

---

## POSITIVE SECURITY FINDINGS ✅

**Strong Points:**
1. ✅ **RLS Policies Implemented** - All major tables protected
2. ✅ **Service Role Key** - Properly stored in env vars, not committed
3. ✅ **Authentication Checks** - Most endpoints verify `auth.getUser()`
4. ✅ **User ID Forced from Auth** - Cartridge creation uses `user.id` from session
5. ✅ **Webhook Signature Verification** - HMAC signing implemented
6. ✅ **Basic Input Validation** - Present in most endpoints
7. ✅ **Encryption Utilities** - AES-256-GCM properly structured
8. ✅ **Cookie Size Validation** - Middleware prevents oversized cookies
9. ✅ **Type Safety** - Most code uses TypeScript properly (except `any` issues)
10. ✅ **Error Handling** - Try-catch blocks present

---

## REMEDIATION PRIORITY

### Phase 1: CRITICAL (Deploy Blocker - Fix Immediately)
| Priority | Issue | File | Action |
|----------|-------|------|--------|
| 🚨 P0 | Admin bypass | `lib/auth/admin.ts:26-28` | Remove bypass, return false |
| 🚨 P0 | Default encryption key | `lib/encryption.ts:22-26` | Fail hard in production |
| 🚨 P0 | Weak randomness | Multiple files | Replace Math.random with crypto |

**Estimated Time:** 2-3 hours
**Deploy Status:** BLOCK PRODUCTION until fixed

---

### Phase 2: HIGH (Fix Before Next Sprint)
| Priority | Issue | File | Action |
|----------|-------|------|--------|
| ⚠️ P1 | 50+ `any` types | Multiple files | Replace with Zod schemas |
| ⚠️ P1 | JWT claim checks | Migrations | Use admin_users table only |
| ⚠️ P1 | Missing validation | 20+ routes | Add Zod validation |
| ⚠️ P1 | No rate limiting | All routes | Implement Upstash rate limits |
| ⚠️ P1 | TODO stubs | chips/*.ts | Complete or warn users |

**Estimated Time:** 1-2 days
**Deploy Status:** HIGH priority before public launch

---

### Phase 3: MEDIUM (Technical Debt Cleanup)
| Priority | Issue | File | Action |
|----------|-------|------|--------|
| 📋 P2 | Race conditions | console/*.ts | Add distributed locking |
| 📋 P2 | Console prompts readable | RLS policies | Restrict to admins |
| 📋 P2 | V2/V3 confusion | Multiple files | Complete migration |

**Estimated Time:** 3-5 days
**Deploy Status:** Can defer but creates risk

---

## IMMEDIATE ACTIONS (Next 24 Hours)

### 1. Fix Admin Bypass (30 minutes)
```bash
# File: lib/auth/admin.ts
# Remove lines 26-28 (the bypass)
# Ensure admin_users table check is the only gate
```

### 2. Fix Encryption Key (15 minutes)
```bash
# File: lib/encryption.ts
# Add production check, throw error if ENCRYPTION_KEY missing
```

### 3. Fix Weak Randomness (1 hour)
```bash
# Files: lib/unipile-client.ts, lib/chips/offerings.ts, lib/utils/crypto.ts
# Replace Math.random() with crypto.randomBytes() for IDs/tokens
```

### 4. Verify ENCRYPTION_KEY Set (5 minutes)
```bash
# Check production environment variables
# Ensure ENCRYPTION_KEY is a strong 32-byte random value
```

---

## TESTING RECOMMENDATIONS

### Security Test Checklist
- [ ] Attempt admin access with non-admin user (should fail)
- [ ] Verify encryption uses strong key (not default)
- [ ] Check all IDs generated use crypto.randomBytes
- [ ] Run `npx tsc --noEmit` to catch type errors
- [ ] Attempt to bypass RLS policies
- [ ] Test rate limiting (if implemented)
- [ ] Validate all API inputs with malformed data
- [ ] Check for SQL injection in custom queries

---

## FILES WITH SECURITY ISSUES (Quick Reference)

**CRITICAL:**
- `lib/auth/admin.ts` - Admin bypass
- `lib/encryption.ts` - Default key
- `lib/unipile-client.ts` - Weak randomness
- `lib/chips/offerings.ts` - Weak randomness
- `lib/utils/crypto.ts` - Weak randomness

**HIGH:**
- `app/api/cartridges/route.ts` - `any` types, missing validation
- `lib/console/marketing-console.ts` - `any` types
- `lib/console/workflow-executor.ts` - `any` types, race conditions
- `app/api/webhook-delivery/route.ts` - Missing validation
- `lib/chips/dm-chip-full.ts` - TODO stub
- `lib/chips/pod-chip.ts` - TODO stub
- `lib/email/pod-invites.ts` - TODO stub
- All RLS migrations - JWT claim checks

**MEDIUM:**
- `supabase/migrations/034_fix_console_rls_admin_only.sql` - World-readable prompts
- Multiple files - V2/V3 architecture debt

---

## CONCLUSION

The bravo-revos codebase demonstrates solid security fundamentals but has **3 CRITICAL vulnerabilities** that MUST be fixed before production deployment:

1. Admin authentication bypass
2. Default hardcoded encryption key
3. Weak cryptographic randomness

**Overall Assessment:**
- **Current State:** 6.5/10 security score
- **After Phase 1 Fixes:** 8.5/10 security score (production-ready)
- **After Phase 2 Fixes:** 9.5/10 security score (industry best practices)

**Recommendation:** Complete Phase 1 fixes (3 hours) before any production deployment. Phase 2 fixes should be completed within next sprint.

---

**Report Generated:** 2025-11-25
**Next Review:** After Phase 1 fixes implemented
**Contact:** Claude Code Security Audit
