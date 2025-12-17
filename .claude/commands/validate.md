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
- API routes (`__tests__/api/`)
- Components (`__tests__/components/`)
- Hooks (`__tests__/hooks/`)
- Lib utilities (`__tests__/lib/`)
- Health checks (`__tests__/health/`)
- Security (`__tests__/security/`)
- Validation (`__tests__/validation/`)

**Key test files:**
- `health-checks.test.ts` - System health monitoring
- `webhook-delivery.test.ts` - Webhook delivery pipeline
- `comment-processor.test.ts` - Bot detection, trigger matching (36 tests)
- `unipile-client.test.ts` - LinkedIn API integration, URN format (21 tests)
- `email-extraction.test.ts` - Lead email extraction
- `agentkit-orchestration.test.ts` - AgentKit SDK integration
- `hgc-*.test.ts` - Holy Grail Chat workflows

**Critical Comment-Reply Tests:**
```bash
# Run comment-reply specific tests
npm test -- --testPathPattern="comment-processor|unipile-client"
```

Expected: 57 tests pass (36 comment-processor + 21 unipile-client)

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

### 5.2 Complete User Workflow Tests

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
1. User publishes post → System triggers pod
2. Pod members repost → System watches for comments
3. Comments detected → DMs sent to commenters

Test script: `scripts/test-harvest-loop.ts`
```bash
npx tsx scripts/test-harvest-loop.ts
```

**Workflow 3: HGC Chat Flow**
1. User types "write" → Brand cartridge loaded
2. Topic buttons shown → User selects topic
3. LinkedIn post generated → Appears in working document

```bash
# Test HGC API
curl -X POST http://localhost:3000/api/hgc-v3 \
  -H "Content-Type: application/json" \
  -d '{"message":"write","sessionId":"test-session"}'
```

### 5.3 Comment-Reply System Validation (Critical)

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

### 5.4 External Integration Verification

**Supabase Database:**
```bash
# Via MCP or direct SQL
SELECT COUNT(*) FROM campaigns;
SELECT COUNT(*) FROM leads;
SELECT COUNT(*) FROM linkedin_accounts;
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

### 6.3 Rate Limiting Check
- DM rate limit: 100/day per account
- Comment polling: Randomized intervals (60-300s)
- Webhook delivery: Exponential backoff

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
| 1. Lint | `npm run lint` | ⬜ |
| 2. Types | `npm run typecheck` | ⬜ |
| 3. Build | `npm run build` | ⬜ |
| 4. Tests | `npm test` | ⬜ |
| 5. Health | `curl /api/health` | ⬜ |
| 6. Security | Manual check | ⬜ |

**All boxes checked = Production ready!**

---

## Troubleshooting

**Lint failures:**
- Run `npm run lint -- --fix` to auto-fix
- Check for unescaped entities in JSX (`'` → `&apos;`)

**Type errors:**
- Check for missing type definitions
- Verify interface compatibility

**Test failures:**
- Check test environment setup
- Verify mocks are correctly configured

**Health check failures:**
- Verify environment variables are set
- Check external service connectivity

---

Generated by Ultimate Validation skill for bravo-revos
Last updated: 2025-12-17
