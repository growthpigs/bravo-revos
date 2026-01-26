# Bravo RevOS - Architectural Fragility Audit

**Date:** 2025-11-26
**Scope:** Complete codebase analysis for architectural weaknesses
**Focus:** Patterns that make the system hard to maintain or prone to breaking

---

## Executive Summary

**Critical Findings:** 6 HIGH risk, 8 MEDIUM risk, 4 LOW risk
**Most Urgent:** Configuration sprawl, God objects in lib/, duplicate HGC implementations

### Risk Distribution

| Risk Level | Count | Primary Concerns |
|------------|-------|------------------|
| **HIGH** | 6 | Configuration scattered across 34 files, 3 parallel HGC routes (v1/v2/v3), 1000+ line God objects |
| **MEDIUM** | 8 | Chip circular dependencies, external API contract changes, missing error boundaries |
| **LOW** | 4 | TODO markers, inheritance depth, test coverage gaps |

---

## 🔴 HIGH RISK ISSUES

### 1. Configuration Sprawl - CRITICAL

**Risk Level:** HIGH
**Impact:** Security vulnerabilities, configuration drift, deployment failures

**Problem:**
Environment variables accessed directly in 34+ lib files via `process.env.*`:
- 98 direct `process.env` references found in `/lib`
- 69 additional references in `/app/api`
- Configuration mixed with business logic throughout codebase

**Files Affected:**
```
lib/unipile-client.ts - 16 process.env calls
lib/queues/pod-engagement-worker.ts - 6 process.env calls
lib/config.ts - 5 process.env calls (GOOD - centralized)
lib/supabase/server.ts - 4 process.env calls
lib/encryption.ts - 2 process.env calls
+ 29 more files
```

**Evidence:**
```typescript
// ❌ BAD: Direct access scattered everywhere
const apiKey = process.env.UNIPILE_API_KEY;
const dsn = process.env.UNIPILE_DSN || 'https://api1.unipile.com:13211';

// ❌ BAD: Validation logic duplicated
if (!apiKey) {
  throw new Error('UNIPILE_API_KEY not set');
}
```

**Current State:**
- ✅ GOOD: `/lib/config.ts` exists with centralized constants
- ✅ GOOD: UNIPILE_CONFIG, POD_AUTOMATION_CONFIG, etc. defined
- ❌ BAD: Most files bypass config.ts and access process.env directly

**Impact:**
- **Security:** API keys visible in stack traces, logs
- **Testing:** Hard to mock environment in tests
- **Deployment:** Missing env var only discovered at runtime
- **Multi-tenant:** Client-specific configs (Unipile per-client) mixed with system defaults

**Recommended Fix:**

1. **Centralize all config reads:**
```typescript
// lib/config/index.ts (NEW - single source of truth)
export const CONFIG = {
  unipile: {
    apiKey: process.env.UNIPILE_API_KEY || '',
    dsn: process.env.UNIPILE_DSN || 'https://api1.unipile.com:13211',
    mockMode: process.env.UNIPILE_MOCK_MODE === 'true',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o',
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  // ... all other configs
} as const;

// Validate on startup
export function validateConfig() {
  const missing: string[] = [];
  if (!CONFIG.unipile.apiKey && !CONFIG.unipile.mockMode) {
    missing.push('UNIPILE_API_KEY');
  }
  if (!CONFIG.openai.apiKey) missing.push('OPENAI_API_KEY');
  if (!CONFIG.supabase.url) missing.push('NEXT_PUBLIC_SUPABASE_URL');

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
```

2. **Replace all direct process.env calls:**
```typescript
// Before (scattered everywhere):
const apiKey = process.env.UNIPILE_API_KEY;

// After (centralized):
import { CONFIG } from '@/lib/config';
const apiKey = CONFIG.unipile.apiKey;
```

3. **Add startup validation:**
```typescript
// app/api/[route]/route.ts
import { validateConfig } from '@/lib/config';
validateConfig(); // Fail fast if missing required vars
```

**Estimated Effort:** 8-12 hours
**Test Coverage Needed:** Config validation tests, missing env var tests

---

### 2. Three Parallel HGC Implementations

**Risk Level:** HIGH
**Impact:** Maintenance nightmare, user confusion, architectural debt

**Problem:**
Three separate HGC chat implementations exist simultaneously:

```
/app/api/hgc/route.ts       - 1,772 lines (LEGACY - v1)
/app/api/hgc-v2/route.ts    - 683 lines (AgentKit + Mem0, DISABLED)
/app/api/hgc-v3/route.ts    - 572 lines (ACTIVE but non-compliant)
```

**Architecture Violations:**

| Route | AgentKit | Mem0 | DB Workflows | Status |
|-------|----------|------|--------------|--------|
| v1 (hgc) | ❌ Raw OpenAI | ❌ No | ❌ Hardcoded | LEGACY (61KB) |
| v2 (hgc-v2) | ✅ Yes | ✅ Yes | ✅ Yes | DISABLED (404 errors) |
| v3 (hgc-v3) | ❌ Raw OpenAI | ❌ No | ❌ Hardcoded | ACTIVE (22KB) |

**Evidence from Code:**
```typescript
// v3 route.ts - Line 4-10 (acknowledges technical debt)
/**
 * HGC v3 - Minimal Working Implementation
 * Architecture violations (raw OpenAI):
 * - ✅ ACCEPTED as technical debt
 * - ✅ Will migrate to AgentKit SDK in Phase 2
 * - ✅ Gets user testing unblocked NOW
 */
```

**Current Usage:**
- Frontend uses: `NEXT_PUBLIC_HGC_VERSION=v3` (see CLAUDE.md)
- v2 has full infrastructure built but untested (2000+ lines in lib/console/)
- v1 still exists but unused (huge file)

**Impact:**
- **Confusion:** Which route is actually used? (v3)
- **Debt:** v3 shortcuts violate all NON-NEGOTIABLES (AgentKit, Mem0, DB workflows)
- **Workload:** 8-14 hours estimated to enable v2 properly
- **Risk:** v1 (1,772 lines) is dead code but could be accidentally reactivated

**Recommended Fix:**

1. **Delete v1 immediately:**
```bash
# v1 is confirmed dead code - 61KB of maintenance burden
rm app/api/hgc/route.ts
rm -rf app/api/hgc/campaigns app/api/hgc/linkedin app/api/hgc/pods
```

2. **Fix and activate v2:**
- Debug 404 errors in v2 route
- Enable `NEXT_PUBLIC_HGC_VERSION=v2` in .env
- Test end-to-end with AgentKit + Mem0
- Remove `.disabled` extension if present

3. **Deprecate v3 after v2 proven:**
```typescript
// app/api/hgc-v3/route.ts
export async function POST(req: Request) {
  return NextResponse.json({
    error: 'v3 deprecated - use /api/hgc-v2',
    redirectTo: '/api/hgc-v2'
  }, { status: 410 }); // 410 Gone
}
```

**Estimated Effort:** 12-16 hours (v2 debug + v1 removal + v3 deprecation)
**Test Coverage Needed:** v2 end-to-end tests, AgentKit integration tests

---

### 3. God Objects in /lib

**Risk Level:** HIGH
**Impact:** Hard to test, hard to understand, high change risk

**Problem:**
Multiple files >600 lines with mixed concerns:

| File | Lines | Concerns | Risk |
|------|-------|----------|------|
| `lib/queues/pod-engagement-worker.ts` | 1,027 | Worker + execution + retry logic + API calls | 🔴 HIGH |
| `lib/console/marketing-console.ts` | 816 | AgentKit wrapper + cartridge loading + Mem0 + execution | 🔴 HIGH |
| `lib/unipile-client.ts` | 774 | REST API + mock mode + error handling + credentials | 🔴 HIGH |
| `lib/console/console-loader.ts` | 597 | DB queries + prompt interpolation + validation | 🟡 MEDIUM |
| `lib/chips/lead-chip-full.ts` | 560 | Lead CRUD + email extraction + validation | 🟡 MEDIUM |

**Evidence - marketing-console.ts:**
```typescript
// Lines 1-816 - Too many responsibilities:
// 1. AgentKit lazy-loading (lines 59-99)
// 2. Cartridge management (lines 113-139)
// 3. Mem0 integration (lines 195-246)
// 4. Message execution (lines 248-388)
// 5. Response extraction (lines 390-522)
// 6. Tool result handling (lines 524-671)
// 7. Session management (lines 673-816)
```

**Impact:**
- **Testing:** Hard to unit test (too many dependencies)
- **Changes:** High risk of breaking unrelated features
- **Onboarding:** New devs can't understand 800+ line files
- **Debugging:** Stack traces point to monolithic files

**Recommended Fix:**

1. **Split marketing-console.ts:**
```
lib/console/
  ├── marketing-console.ts (200 lines - facade only)
  ├── agent-loader.ts (AgentKit lazy-loading)
  ├── cartridge-manager.ts (Load/inject cartridges)
  ├── memory-manager.ts (Mem0 operations)
  ├── message-executor.ts (Execute + extract responses)
  └── session-manager.ts (Session CRUD)
```

2. **Split unipile-client.ts:**
```
lib/unipile/
  ├── client.ts (200 lines - API wrapper)
  ├── credentials.ts (Multi-tenant credential logic)
  ├── mock-handler.ts (Mock mode responses)
  ├── endpoints/ (One file per API endpoint)
  └── types.ts (Shared types)
```

3. **Extract common patterns:**
```typescript
// lib/patterns/retry-with-backoff.ts
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  // Reusable retry logic
}

// Used in: pod-engagement-worker, unipile-client, dm-worker
```

**Estimated Effort:** 16-24 hours (refactoring + tests)
**Test Coverage Needed:** Unit tests for each split module

---

### 4. LinkedIn Cartridge Import Explosion

**Risk Level:** HIGH (Circular dependency risk)
**Impact:** Build failures, runtime errors, hard to refactor

**Problem:**
`lib/cartridges/linkedin-cartridge.ts` imports 12 chips:

```typescript
// Lines 17-28 - Import explosion
import { Cartridge } from '@/lib/cartridges/types';
import { WriteChip } from '@/lib/chips/write-chip';
import { CampaignChip } from '@/lib/chips/campaign-chip';
import { PublishingChip } from '@/lib/chips/publishing-chip';
import { DMScraperChip } from '@/lib/chips/dm-scraper-chip';
import { AnalyticsChip } from '@/lib/chips/analytics-chip';
import { PodChip } from '@/lib/chips/pod-chip';
import { MonitorChip } from '@/lib/chips/monitor-chip';
import { DMChip } from '@/lib/chips/dm-chip';
import { WebhookChip } from '@/lib/chips/webhook-chip';
import { LeadMagnetChip } from '@/lib/chips/lead-magnet-chip';
import { LeadChip } from '@/lib/chips/lead-chip';
```

Each chip imports from:
- `@/lib/cartridges/types` (6+ chips)
- `@/lib/supabase/*`
- `@/lib/queues/*`
- Other chips (PodChip → queueAmplification from `@/lib/queues/pod-queue`)

**Circular Dependency Risk:**
```
LinkedInCartridge → PodChip → pod-queue → pod-engagement-worker → [Redis] → [back to cartridge types]
                 → LeadMagnetChip → openai-client → OPENAI_MODELS → config → [env vars]
                 → WritingChip → [needs cartridge data] → types → LinkedInCartridge
```

**Evidence:**
```bash
# Import count by file:
lib/cartridges/linkedin-cartridge.ts: 12 imports
lib/chips/monitor-chip.ts: 6 imports
lib/chips/pod-chip.ts: 7 imports
lib/chips/lead-magnet-chip.ts: 8 imports
```

**Impact:**
- **Build Time:** Webpack/Next.js must resolve entire graph on every build
- **Tree Shaking:** Hard for bundler to eliminate dead code
- **Runtime:** One chip failure cascades to entire cartridge
- **Testing:** Can't test chips in isolation

**Recommended Fix:**

1. **Lazy-load chips:**
```typescript
// lib/cartridges/linkedin-cartridge.ts (NEW)
export class LinkedInCartridge implements Cartridge {
  id = 'linkedin-cartridge';
  name = 'LinkedIn Marketing';
  type = 'marketing' as const;

  private _chips: Chip[] | null = null;

  get chips(): Chip[] {
    if (!this._chips) {
      // Lazy-load only when needed
      this._chips = [
        new (require('@/lib/chips/write-chip').WriteChip)(),
        new (require('@/lib/chips/campaign-chip').CampaignChip)(),
        // ... etc
      ];
    }
    return this._chips;
  }
}
```

2. **Use chip registry pattern:**
```typescript
// lib/chips/registry.ts (NEW)
export const CHIP_REGISTRY = {
  'write': () => import('@/lib/chips/write-chip').then(m => new m.WriteChip()),
  'campaign': () => import('@/lib/chips/campaign-chip').then(m => new m.CampaignChip()),
  // ... etc
};

// lib/cartridges/linkedin-cartridge.ts
import { CHIP_REGISTRY } from '@/lib/chips/registry';

export class LinkedInCartridge {
  async loadChips() {
    return Promise.all([
      CHIP_REGISTRY['write'](),
      CHIP_REGISTRY['campaign'](),
      // ... etc
    ]);
  }
}
```

3. **Break circular references:**
```typescript
// ❌ BAD: PodChip imports from queues
import { queueAmplification } from '@/lib/queues/pod-queue';

// ✅ GOOD: Inject queue dependency
export class PodChip {
  constructor(private queueManager: QueueManager) {}

  async execute(input, context) {
    await this.queueManager.queueAmplification(...);
  }
}
```

**Estimated Effort:** 12-16 hours
**Test Coverage Needed:** Lazy-loading tests, circular dependency detection

---

### 5. External API Contract Changes

**Risk Level:** HIGH
**Impact:** Production failures when APIs change without warning

**Problem:**
Hard dependencies on external API structures with no versioning or contract tests:

**Unipile API (lib/unipile-client.ts):**
```typescript
// 774 lines of direct fetch() calls - NO SDK
const response = await fetch(`${dsn}/api/v1/users/${accountId}/posts`, {
  method: 'POST',
  headers: { 'X-API-KEY': apiKey },
  body: JSON.stringify({ text, attachments })
});

// What if Unipile changes:
// - POST → PUT
// - /posts → /publications
// - X-API-KEY → Authorization: Bearer
// Answer: Production breaks
```

**OpenAI API (3 different patterns):**
```typescript
// Pattern 1: Raw OpenAI (v3 route)
const { default: OpenAI } = await import('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
await openai.chat.completions.create({ ... });

// Pattern 2: AgentKit SDK (v2 route)
const { Agent } = await import('@openai/agents');
const agent = new Agent({ model, tools, client: openai });

// Pattern 3: Singleton (lib/openai-client.ts)
export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
```

**Mem0 API (lib/mem0/client.ts):**
```typescript
import { MemoryClient } from 'mem0ai';
const client = new MemoryClient({ apiKey });
await client.add(messages, { user_id, metadata });

// What if Mem0 changes:
// - user_id → tenant_id
// - add() → addMemory()
// - MemoryClient → Mem0Client
// Answer: No tests, production breaks
```

**Impact:**
- **Unipile:** $5.50/account/mo, critical for LinkedIn integration
- **OpenAI:** Core AI functionality, affects all chat/generation
- **Mem0:** Memory persistence, affects conversation continuity
- **No monitoring:** Changes only discovered when users report errors

**Recommended Fix:**

1. **Add API contract tests:**
```typescript
// __tests__/contracts/unipile.contract.test.ts
describe('Unipile API Contract', () => {
  it('should POST to /api/v1/users/{id}/posts', async () => {
    const mockFetch = jest.spyOn(global, 'fetch');
    await createLinkedInPost(accountId, { text: 'test' });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/users/'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-API-KEY': expect.any(String)
        })
      })
    );
  });

  it('should handle expected response format', async () => {
    // Mock Unipile response structure
    const mockResponse = {
      object: 'AttendeeMessage',
      id: 'msg_123',
      account_id: 'acc_123',
      text: 'test post',
      created_at: 1234567890
    };

    // Validate our code expects this structure
    const result = await createLinkedInPost(accountId, { text: 'test' });
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('account_id');
  });
});
```

2. **Version lock external SDKs:**
```json
// package.json
{
  "dependencies": {
    "openai": "4.77.0",  // Lock exact version
    "mem0ai": "0.1.30",  // Lock exact version
    "@openai/agents": "0.3.0"  // Lock exact version (see marketing-console.ts:22)
  }
}
```

3. **Add API health checks:**
```typescript
// lib/health/external-apis.ts
export async function checkUnipileHealth() {
  try {
    const response = await fetch(`${UNIPILE_DSN}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

export async function checkOpenAIHealth() {
  try {
    const openai = new OpenAI({ apiKey: CONFIG.openai.apiKey });
    await openai.models.list();
    return true;
  } catch {
    return false;
  }
}

// Call on startup + cron job
```

4. **Abstract API calls:**
```typescript
// lib/adapters/unipile-adapter.ts
export interface LinkedInPostAdapter {
  createPost(accountId: string, data: PostData): Promise<Post>;
  deletePost(accountId: string, postId: string): Promise<void>;
}

export class UnipileAdapter implements LinkedInPostAdapter {
  async createPost(accountId: string, data: PostData) {
    // Unipile-specific implementation
    // If Unipile changes, only update this adapter
  }
}

// Usage:
const adapter: LinkedInPostAdapter = new UnipileAdapter();
await adapter.createPost(accountId, data);
```

**Estimated Effort:** 16-20 hours
**Test Coverage Needed:** Contract tests for each external API

---

### 6. Database Query Patterns - Missing RLS Validation

**Risk Level:** HIGH
**Impact:** Data leaks, unauthorized access

**Problem:**
280 files use `supabase.from()` but not all validate RLS:

**Query Pattern Analysis:**
```bash
# Files with Supabase queries:
app/api/: 280 files use createClient() or supabase.from()
lib/: 91 files use Supabase

# Files with .execute() or .single():
app/api/: 30+ files (many missing RLS checks)
```

**Evidence - Missing tenant validation:**
```typescript
// ❌ BAD: No RLS check
const { data } = await supabase
  .from('campaigns')
  .select('*')
  .eq('id', campaignId)
  .single();

// What if campaignId belongs to another client?
// Answer: RLS should prevent, but is it enabled on ALL tables?

// ✅ GOOD: Explicit tenant check
const { data } = await supabase
  .from('campaigns')
  .select('*')
  .eq('id', campaignId)
  .eq('client_id', user.client_id) // Explicit filter
  .single();
```

**RLS Gaps Found:**
1. No centralized RLS validation helper
2. Some tables may not have RLS policies enabled
3. Admin routes use service role key (bypasses RLS) without explicit checks

**Admin Route Risk:**
```typescript
// app/api/admin/*/route.ts
const supabase = createClient(); // Uses service role key
const { data } = await supabase.from('users').select('*'); // Gets ALL users

// ❌ Missing: isUserAdmin() check
// ❌ Missing: Explicit tenant filtering
```

**Impact:**
- **Data Leak:** User A could access User B's data if RLS not enforced
- **Admin Bypass:** Service role key bypasses RLS, needs manual checks
- **Multi-tenant:** Critical for agency/client/user isolation

**Recommended Fix:**

1. **Create RLS validation helper:**
```typescript
// lib/supabase/rls-helpers.ts
export async function validateTenantAccess(
  supabase: SupabaseClient,
  table: string,
  recordId: string,
  user: User
): Promise<boolean> {
  const { data, error } = await supabase
    .from(table)
    .select('id, client_id, user_id')
    .eq('id', recordId)
    .single();

  if (error || !data) return false;

  // Check ownership
  if (data.user_id && data.user_id !== user.id) return false;
  if (data.client_id && data.client_id !== user.client_id) return false;

  return true;
}

// Usage in API routes:
const canAccess = await validateTenantAccess(supabase, 'campaigns', campaignId, user);
if (!canAccess) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
}
```

2. **Add RLS check to all admin routes:**
```typescript
// lib/auth/admin-check.ts (already exists)
import { isUserAdmin } from '@/lib/auth/admin-check';

// app/api/admin/*/route.ts
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !await isUserAdmin(user.id, supabase)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Now safe to use service role queries
}
```

3. **Audit RLS policies:**
```sql
-- Run in Supabase SQL editor
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check for tables WITHOUT RLS:
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT IN (
    SELECT DISTINCT tablename FROM pg_policies WHERE schemaname = 'public'
  );
```

**Estimated Effort:** 20-24 hours
**Test Coverage Needed:** RLS bypass tests, multi-tenant isolation tests

---

## 🟡 MEDIUM RISK ISSUES

### 7. Chip Execution Error Boundaries

**Risk Level:** MEDIUM
**Impact:** One chip failure breaks entire cartridge

**Problem:**
`BaseChip` has error handling, but cartridge execution doesn't isolate failures:

```typescript
// lib/cartridges/linkedin-cartridge.ts
chips = [
  new WriteChip(),      // If this fails...
  new CampaignChip(),   // ...these never execute
  new PublishingChip(),
  // ... 8 more chips
];
```

**No circuit breaker pattern** - one chip crash takes down all chips.

**Recommended Fix:**
```typescript
// lib/cartridges/base-cartridge.ts
export abstract class BaseCartridge {
  async executeChipSafely(chip: Chip, input: any, context: AgentContext) {
    try {
      return await chip.execute(input, context);
    } catch (error) {
      console.error(`[${this.name}] Chip ${chip.name} failed:`, error);
      return {
        success: false,
        error: `${chip.name} temporarily unavailable`,
        chipId: chip.id,
      };
    }
  }
}
```

**Estimated Effort:** 4-6 hours

---

### 8. TODO Markers in Production Code

**Risk Level:** MEDIUM (Quality/Completeness)
**Impact:** Features incomplete, users expecting functionality

**Found:**
```bash
lib/cartridges/voice-cartridge.ts: TODO: Implement full hierarchy resolution
lib/chips/dm-chip-full.ts: TODO: Implement actual UniPile API call
lib/chips/pod-chip.ts: TODO: Implement actual webhook calls to Slack/Discord
lib/chips/lead-magnet-chip.ts: TODO: Implement actual file generation (PDF, etc.)
```

**Recommended Fix:**
1. Convert TODOs to Archon tasks with deadlines
2. Feature-flag incomplete features
3. Document known limitations in API responses

**Estimated Effort:** 2-4 hours (triage + planning)

---

### 9. Dynamic Import Overhead

**Risk Level:** MEDIUM (Performance)
**Impact:** Every request pays lazy-load cost

**Problem:**
```typescript
// lib/console/marketing-console.ts:62
const imported = await import('@openai/agents');
AgentClass = imported.Agent;

// Called on EVERY chat message
// No caching of imported class
```

**Fix:**
Cache imported modules in memory.

**Estimated Effort:** 2-3 hours

---

### 10. Hardcoded Unipile DSN

**Risk Level:** MEDIUM
**Impact:** Can't test against staging, hard to switch providers

**Problem:**
```typescript
// lib/config.ts:10
DSN: process.env.UNIPILE_DSN || 'https://api1.unipile.com:13211',

// Hardcoded production URL as fallback
```

**Fix:**
Remove fallback, require explicit env var.

**Estimated Effort:** 1 hour

---

### 11. Workflow Execution Context Missing Validation

**Risk Level:** MEDIUM
**Impact:** Runtime errors in workflow execution

**Problem:**
```typescript
// lib/console/workflow-executor.ts:22
export interface WorkflowExecutionContext {
  supabase: SupabaseClient;
  openai: any; // ❌ any type
  user: any;   // ❌ any type
  session: any; // ❌ any type
  // ...
}
```

**Fix:**
Add Zod schema validation for WorkflowExecutionContext.

**Estimated Effort:** 3-4 hours

---

### 12. OpenAI Model Selection Scattered

**Risk Level:** MEDIUM
**Impact:** Inconsistent models, hard to change default

**Problem:**
```typescript
// lib/config/openai-models.ts (centralized)
export const OPENAI_MODELS = { ... }

// But many files bypass this:
const model = 'gpt-4o'; // Hardcoded in 5+ files
```

**Fix:**
Enforce `OPENAI_MODELS.DEFAULT` usage via linter rule.

**Estimated Effort:** 2-3 hours

---

### 13. Queue Configuration Duplication

**Risk Level:** MEDIUM
**Impact:** Config drift, hard to tune performance

**Problem:**
```typescript
// lib/config.ts has:
POD_AUTOMATION_CONFIG
POD_ENGAGEMENT_CONFIG
COMMENT_POLLING_CONFIG
DM_QUEUE_CONFIG

// But some queues define config inline:
const WORKER_CONCURRENCY = 5; // In worker file
const QUEUE_ATTEMPTS = 3;     // In queue file
```

**Fix:**
Move ALL queue config to lib/config.ts.

**Estimated Effort:** 3-4 hours

---

### 14. Mem0 Tenant Key Security

**Risk Level:** MEDIUM
**Impact:** Tenant isolation bypass if key format changes

**Problem:**
```typescript
// lib/mem0/client.ts:49
const key = `${agencyId}::${clientId}::${userId}`;

// What if someone passes: "malicious::injection::attack"?
// Answer: No validation, only basic null checks
```

**Fix:**
Add UUID validation for all tenant IDs.

**Estimated Effort:** 2-3 hours

---

## 🟢 LOW RISK ISSUES

### 15. Inheritance Depth in Chips

**Risk Level:** LOW
**Impact:** Slight complexity increase

**Problem:**
```typescript
export abstract class BaseChip { ... }
export class WriteChip extends BaseChip { ... }
export class LeadChip extends BaseChip { ... }
// 15+ chip classes
```

**Fix:**
Acceptable pattern. Consider composition over inheritance if >2 levels.

**Estimated Effort:** 0 hours (monitor only)

---

### 16. Type Safety Gaps

**Risk Level:** LOW
**Impact:** Runtime type errors

**Problem:**
```typescript
openai: any; // In WorkflowExecutionContext
user: any;   // In AgentContext
```

**Fix:**
Replace `any` with proper OpenAI/Supabase types.

**Estimated Effort:** 4-6 hours

---

### 17. Missing Test Coverage

**Risk Level:** LOW (Quality)
**Impact:** Regressions undetected

**Problem:**
No tests found for:
- `lib/console/marketing-console.ts` (816 lines)
- `lib/console/workflow-executor.ts` (553 lines)
- Most lib/chips/* files

**Fix:**
Add unit tests, aim for 60%+ coverage.

**Estimated Effort:** 40-60 hours

---

### 18. Console Logs in Production

**Risk Level:** LOW (Noise)
**Impact:** CloudWatch cost, log spam

**Problem:**
343 `console.error` calls found in lib/
Unknown number of `console.log` calls

**Fix:**
Replace with structured logging library (e.g., Pino).

**Estimated Effort:** 8-12 hours

---

## Priority Recommendations

### Immediate (This Week)
1. ✅ **Delete HGC v1** (1 hour) - 61KB dead code
2. ✅ **Centralize config** (8-12 hours) - Security + maintainability
3. ✅ **Add RLS validation helper** (4-6 hours) - Security critical

### Short-term (This Month)
4. ✅ **Fix and activate HGC v2** (12-16 hours) - Architecture compliance
5. ✅ **Add external API contract tests** (16-20 hours) - Production stability
6. ✅ **Split God objects** (16-24 hours) - Maintainability

### Long-term (This Quarter)
7. ✅ **Fix chip lazy-loading** (12-16 hours) - Performance + circular deps
8. ✅ **Add test coverage** (40-60 hours) - Quality
9. ✅ **Structured logging** (8-12 hours) - Observability

---

## Test Coverage Needed

### Critical Tests (Add First)
```typescript
// __tests__/config/validation.test.ts
describe('Configuration Validation', () => {
  it('should fail fast if required env vars missing', () => {
    delete process.env.OPENAI_API_KEY;
    expect(() => validateConfig()).toThrow('Missing required environment variables: OPENAI_API_KEY');
  });
});

// __tests__/security/rls-isolation.test.ts
describe('RLS Multi-tenant Isolation', () => {
  it('should prevent user A from accessing user B data', async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();

    const campaignB = await createCampaign(userB.id);

    const supabaseA = createClientForUser(userA);
    const { data, error } = await supabaseA
      .from('campaigns')
      .select('*')
      .eq('id', campaignB.id)
      .single();

    expect(error).toBeTruthy();
    expect(data).toBeNull();
  });
});

// __tests__/contracts/unipile.contract.test.ts
describe('Unipile API Contract', () => {
  it('should match expected POST /posts endpoint', async () => {
    // See HIGH RISK #5 for full example
  });
});
```

---

## Monitoring Recommendations

### Add Health Checks
```typescript
// app/api/health/route.ts (enhance existing)
export async function GET() {
  const checks = await Promise.all([
    checkSupabaseHealth(),
    checkRedisHealth(),
    checkUnipileHealth(),
    checkOpenAIHealth(),
    checkMem0Health(),
  ]);

  return NextResponse.json({
    status: checks.every(c => c.healthy) ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
}
```

### Add Sentry Error Tracking
```typescript
// lib/monitoring/sentry.ts
import * as Sentry from '@sentry/nextjs';

export function captureArchitecturalIssue(
  issue: 'config_missing' | 'rls_bypass' | 'api_contract_change',
  context: Record<string, any>
) {
  Sentry.captureMessage(`Architectural Issue: ${issue}`, {
    level: 'error',
    tags: { type: 'architecture' },
    extra: context,
  });
}
```

---

## Summary Statistics

**Total Files Analyzed:** 500+
**lib/ TypeScript Files:** 100+
**API Routes:** 46+

**Configuration Issues:**
- 98 direct `process.env` calls in lib/
- 69 direct `process.env` calls in app/api/
- 34 files accessing environment variables directly

**God Objects:**
- 5 files >600 lines with mixed concerns
- Largest: 1,027 lines (pod-engagement-worker.ts)

**Dependency Issues:**
- 12-chip import in LinkedInCartridge
- Circular dependency risk in 3+ chains

**External APIs:**
- 3 critical dependencies (Unipile, OpenAI, Mem0)
- 0 contract tests currently
- 0 health checks for external APIs

**Database:**
- 280 files using Supabase
- 91 lib files with DB access
- Unknown RLS policy coverage

**Code Quality:**
- 8 TODO markers in production code
- 343 console.error calls
- Unknown test coverage (estimate <30%)

---

## Next Steps

1. **Triage with team:** Review HIGH risk items, assign owners
2. **Create Archon tasks:** Convert each issue to trackable task
3. **Set deadlines:** Immediate (1 week), Short-term (1 month), Long-term (3 months)
4. **Start with config:** Highest ROI for security + maintainability
5. **Add monitoring:** Health checks + Sentry error tracking
6. **Iterate:** Fix HIGH risks before adding new features

---

**Document Version:** 1.0
**Generated:** 2025-11-26
**Tool:** Claude Code (codebase-analyst)
**Repository:** growthpigs/bravo-revos
**Branch:** main
