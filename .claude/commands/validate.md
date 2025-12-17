# Bravo revOS - Ultimate Validation

Run all validation phases. Use this before pushing to main or production.

## Quick Validation (One Command)

```bash
npm run lint && npm run typecheck && npm run build && npm test
```

---

## Phase 1: Linting

```bash
npm run lint
```

Checks: ESLint, React/Next.js rules, accessibility

---

## Phase 2: Type Checking

```bash
npm run typecheck
```

Checks: TypeScript strict mode, no implicit any

---

## Phase 3: Build

```bash
npm run build
```

Checks: Next.js compilation, route generation

---

## Phase 4: Unit Tests (Jest)

```bash
npm test
```

**Test coverage areas:**
- API routes (`__tests__/api/`) - 30+ test files
- Components (`__tests__/components/`) - 12 test files
- Hooks (`__tests__/hooks/`) - 1 test file
- Lib utilities (`__tests__/lib/`) - 15+ test files
- Health checks (`__tests__/health/`) - 4 test files
- Security (`__tests__/security/`) - 1 test file
- Validation (`__tests__/validation/`) - 2 test files

**Key test files:**
- `pod-engagement-worker.test.ts` - E-05 worker (31 tests)
- `pod-automation.test.ts` - E-04 scheduler tests
- `comment-processor.test.ts` - Bot detection, trigger matching (36 tests)
- `unipile-client.test.ts` - LinkedIn API integration, URN format (21 tests)
- `webhook-delivery.test.ts` - Webhook delivery pipeline
- `hgc-*.test.ts` - Holy Grail Chat workflows

**Critical Pod Automation Tests:**
```bash
# Run E-05 engagement worker tests
npm test -- --testPathPattern="pod-engagement-worker"

# Run E-04 scheduler tests
npm test -- --testPathPattern="pod-automation"

# Run comment-reply specific tests
npm test -- --testPathPattern="comment-processor|unipile-client"
```

Expected: All tests pass

**Pass criteria:** All tests pass

---

## Phase 5: End-to-End Validation

### 5.1 Health API Verification

```bash
# Local dev server must be running
curl -s http://localhost:3000/api/health | jq .
```

**Expected response:**
```json
{
  "status": "healthy",
  "checks": {
    "database": { "status": "healthy" },
    "queue": { "status": "healthy" },
    "agentkit": { "status": "healthy" },
    "mem0": { "status": "healthy" },
    "unipile": { "status": "healthy" }
  }
}
```

### 5.2 E-05 Pod Engagement Worker Validation

**Worker Health Check:**
```bash
# Check worker health endpoint (if running)
curl -s http://localhost:3000/api/pods/[pod-id]/engagement/status | jq .
```

**E2E Test Script:**
```bash
# Test full E-05 pipeline (mock mode)
UNIPILE_MOCK_MODE=true npx tsx scripts/test-e05-flow.ts
```

**Expected output:**
```
[E05_TEST] ✅ Prerequisites
[E05_TEST] ✅ Profile Resolution
[E05_TEST] ✅ Create Activity
[E05_TEST] ✅ E-04 Scheduling
[E05_TEST] ✅ E-05 Queue
[E05_TEST] ✅ Queue Stats
[E05_TEST] All tests passed!
```

**Live Worker Test (requires running worker):**
```bash
# Test with real worker consuming jobs
npx tsx scripts/test-worker-live.ts
```

### 5.3 Redis Queue Health

**Check queue stats via API:**
```bash
curl -s http://localhost:3000/api/pods/[pod-id]/engagement/jobs | jq .
```

**Expected structure:**
```json
{
  "waiting": 0,
  "active": 0,
  "completed": 10,
  "failed": 0,
  "delayed": 0
}
```

**Direct Redis check (if needed):**
```bash
# Via Redis CLI or Upstash console
KEYS pod-engagement:*
```

### 5.4 Rate Limiting Validation

**Check per-account daily limits:**
```bash
# Verify rate limit counters exist in Redis
# Keys follow pattern: pod-engagement:daily:{account_id}
```

**Rate limit configuration:**
- Daily limit: 90 engagements per account (LinkedIn allows 100)
- Cooldown after 429: 15 minutes
- Worker concurrency: 2 jobs at a time

### 5.5 Complete User Workflow Tests

**Workflow 1: Campaign Creation Flow**
1. User creates campaign with trigger words
2. System saves to database
3. DM sequences configured
4. Webhook integration set up

```bash
# Test campaign API
curl -X POST http://localhost:3000/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Campaign","triggerWords":["guide"],"dm1":"Hello!"}'
```

**Workflow 2: LinkedIn DM Pod Flow**
1. User publishes post -> System triggers pod
2. Pod members repost -> System watches for comments
3. Comments detected -> DMs sent to commenters

Test script: `scripts/test-harvest-loop.ts`
```bash
npx tsx scripts/test-harvest-loop.ts
```

**Workflow 3: Pod Amplification Flow (E-04 + E-05)**
1. Pod created with members -> Unipile accounts linked
2. New post detected -> E-04 schedules engagement activities
3. Activities queued -> E-05 executes likes/comments
4. Rate limits respected -> 90/day per account

Test script: `scripts/test-pod-amplification.ts`
```bash
npx tsx scripts/test-pod-amplification.ts
```

**Workflow 4: HGC Chat Flow**
1. User types "write" -> Brand cartridge loaded
2. Topic buttons shown -> User selects topic
3. LinkedIn post generated -> Appears in working document

```bash
# Test HGC API
curl -X POST http://localhost:3000/api/hgc-v3 \
  -H "Content-Type: application/json" \
  -d '{"message":"write","sessionId":"test-session"}'
```

### 5.6 Comment-Reply System Validation (Critical)

**Database RPC Function Check:**
```sql
-- Verify atomic error increment RPC exists
SELECT proname FROM pg_proc WHERE proname = 'increment_scrape_job_error';
-- Expected: 1 row
```

**Scrape Jobs Health Check:**
```sql
-- Check for stale jobs (should be 0 after fix)
SELECT COUNT(*) FROM scrape_jobs
WHERE status = 'running'
AND last_checked < NOW() - INTERVAL '10 minutes';
-- Expected: 0 (stale job recovery working)

-- Check error accumulation (no jobs should have high error_count with successful polls)
SELECT id, error_count, status FROM scrape_jobs
WHERE error_count > 0 AND status = 'scheduled'
ORDER BY error_count DESC LIMIT 5;
-- Review: Jobs with errors should eventually reset or fail
```

**API Health Check:**
```bash
# Check comment-reply health status
curl -s http://localhost:3000/api/health | jq '.checks.commentReply'
```

**Expected:**
```json
{
  "status": "healthy",
  "activeJobs": <number>,
  "failedJobs": <number>
}
```

### 5.7 External Integration Verification

**Supabase Database:**
```bash
# Via MCP or direct SQL
SELECT COUNT(*) FROM campaigns;
SELECT COUNT(*) FROM leads;
SELECT COUNT(*) FROM linkedin_accounts;
SELECT COUNT(*) FROM pod_activities;
SELECT COUNT(*) FROM pods;
```

**Redis Queue:**
```bash
# Check queue health
curl -s http://localhost:3000/api/health | jq '.checks.queue'
```

**Mem0 Memory:**
```bash
# Check Mem0 connectivity
curl -s http://localhost:3000/api/health | jq '.checks.mem0'
```

**Unipile LinkedIn API:**
```bash
# Check Unipile connectivity
curl -s http://localhost:3000/api/health | jq '.checks.unipile'
```

---

## Phase 6: Security Validation

### 6.1 Environment Variables Check
```bash
# Verify no secrets in codebase
grep -r "sk-" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v ".env"
grep -r "SUPABASE_SERVICE_ROLE" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v ".env" | grep -v "process.env"
```

### 6.2 RLS Policy Verification
All data queries should respect Row-Level Security:
- Frontend uses `anon` key (user-scoped)
- Backend uses `service_role` key (admin operations only)
- Workers use `{ isServiceRole: true }` for service role client

### 6.3 Rate Limiting Check
- DM rate limit: 100/day per account
- Pod engagement limit: 90/day per account (via Redis counters)
- Comment polling: Randomized intervals (60-300s)
- Webhook delivery: Exponential backoff

### 6.4 Service Role Client Usage
Workers must use service role client to avoid cookies context error:
```typescript
// Correct usage in workers
const supabase = await createClient({ isServiceRole: true });
```

Verify all worker files use isServiceRole:
```bash
grep -n "createClient(" lib/queues/*.ts lib/pods/*.ts workers/*.ts | grep -v "isServiceRole"
```

Expected: No results (all createClient calls should have isServiceRole: true)

---

## Phase 7: Worker Deployment Validation

### 7.1 Render Worker Health

Check all workers are running on Render:
- `bravo-revos-webhook-worker` - Webhook delivery
- `bravo-revos-pod-worker` - E-04 Pod automation
- `bravo-revos-engagement-worker` - E-05 Engagement executor

```bash
# Check Render dashboard or use API
# Workers should show "Running" status
```

### 7.2 Worker Logs Check

```bash
# Check for any startup errors
vercel logs bravo-revos-engagement-worker --since 1h | grep -E "(ERROR|error|Error)"
```

### 7.3 Queue Connection Test

Workers should connect to Redis on startup:
```
[POD_ENGAGEMENT_WORKER] Worker initialized successfully
[POD_ENGAGEMENT_WORKER] Queue stats: waiting: 0, active: 0, completed: X, failed: X
```

---

## Quick Validation (CI-Safe)

Run all phases that don't require external services:

```bash
npm run lint && npm run typecheck && npm run build && npm test
```

**If this passes, the codebase is structurally sound.**

---

## Full Validation Checklist

| Phase | Command | Status |
|-------|---------|--------|
| 1. Lint | `npm run lint` | [ ] |
| 2. Types | `npm run typecheck` | [ ] |
| 3. Build | `npm run build` | [ ] |
| 4. Tests | `npm test` | [ ] |
| 5. Health | `curl /api/health` | [ ] |
| 6. E-05 Flow | `npx tsx scripts/test-e05-flow.ts` | [ ] |
| 7. Security | Manual check | [ ] |
| 8. Workers | Render dashboard | [ ] |

**All boxes checked = Production ready!**

---

## Troubleshooting

**Lint failures:**
- Run `npm run lint -- --fix` to auto-fix
- Check for unescaped entities in JSX (`'` -> `&apos;`)

**Type errors:**
- Check for missing type definitions
- Verify interface compatibility

**Test failures:**
- Check test environment setup
- Verify mocks are correctly configured

**Health check failures:**
- Verify environment variables are set
- Check external service connectivity

**Worker failures:**
- Check Redis connection (REDIS_URL format: `rediss://...`)
- Verify `{ isServiceRole: true }` in all createClient calls
- Check for esbuild platform issues (run `npm rebuild esbuild`)

**E-05 specific issues:**
- Rate limit errors: Check Redis counters with `KEYS pod-engagement:daily:*`
- Job stuck in queue: Check worker is running with `getEngagementQueueStats()`
- Profile resolution failed: Verify pod_members have unipile_account_id set

---

## Test Coverage Analysis

**Current test files: 90+ files**

| Area | Files | Tests |
|------|-------|-------|
| API Routes | 30+ | 200+ |
| Components | 12 | 50+ |
| Lib Utilities | 15 | 100+ |
| Workers | 4 | 50+ |
| Health | 4 | 20+ |
| Security | 1 | 10+ |

**Key coverage commands:**
```bash
# Full coverage report
npm run test:coverage

# Coverage for specific area
npm test -- --coverage --collectCoverageFrom='lib/queues/**/*.ts'
```

---

Generated by Ultimate Validation skill for bravo-revos
Last updated: 2025-12-17
