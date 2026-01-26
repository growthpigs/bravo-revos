# Health Check System Specification

**Status**: ✅ IMPLEMENTED
**Date**: 2025-11-13
**Location**: Bravo revOS `/lib/health-checks/`

---

## Overview

The health check system provides **REAL** multi-source verification for all critical services. NO fake checks. NO hardcoded "healthy" statuses. Every status comes from actual verification.

### Core Principles

1. **Multi-Source Verification**: Every service must verify from 3 sources:
   - Environment variable present
   - Endpoint reachable (actual network request)
   - Code path valid (import check or functionality test)

2. **Immutable Audit Trail**: All checks logged to `system_health_log` table with:
   - Full diagnostics JSON
   - Verification sources used
   - Response times
   - Git commit/branch at time of check
   - 7-day retention (auto-cleanup)

3. **No Trust, Only Verify**: Never assume healthy. If we can't verify, return 'unknown', not 'healthy'.

---

## Architecture

### File Structure

```
lib/health-checks/
├── types.ts            # TypeScript interfaces
├── verifiers.ts        # Service verifiers (Supabase, Redis, etc.)
├── git-info.ts         # Git integration (branch, commit, deploy time)
├── orchestrator.ts     # Runs all checks, logs to database
└── (meta-check)        # Health check system self-check

components/health/
├── health-status-banner.tsx  # Dense 3-row display
└── diagnostic-modal.tsx      # Deep dive details

app/api/health/
└── route.ts            # Health check API endpoints

__tests__/
└── health-checks.test.ts     # Unit tests (test the tests!)

supabase/migrations/
└── 032_system_health_log.sql # Database schema
```

---

## Services Monitored

| Service | Env Var | Endpoint | Code | Notes |
|---------|---------|----------|------|-------|
| **Supabase** | URL, Key | Ping database | `createClient` | Tests RLS enabled |
| **Redis** | REDIS_URL | PING, SET/GET | `ioredis` | Tests memory ops |
| **Webhook Worker** | REDIS_URL | BullMQ queue | Worker file | Checks job counts |
| **Engagement Worker** | REDIS_URL | BullMQ queue | Worker file | Checks job counts |
| **UniPile** | API key, DSN | `/api/v1/users/me` | Integration | Checks account active |
| **OpenAI** | API key | `/v1/models` | - | Lists models |
| **Resend** | API key | `/domains` | - | Checks verified domain |
| **Environment** | All required | - | Validation | Checks 12 critical vars |
| **Git** | Deploy vars or `.git` | - | Git commands | Branch, commit, dirty |

---

## Status Levels

### ● **Healthy** (Green)
- All 3 verification sources passed
- Response time within threshold
- No errors

### ● **Degraded** (Amber)
- 1-2 verification sources passed
- Service reachable but with issues
- Example: Redis connects but slow

### ● **Unhealthy** (Red)
- 0 verification sources passed
- Service unreachable or misconfigured
- Critical failure

### ● **Unknown** (Gray)
- Unable to determine status
- Transient error during check
- Retry recommended

---

## API Endpoints

### `GET /api/health`
Run all health checks and return current snapshot.

**Response**:
```json
{
  "overallStatus": "healthy",
  "timestamp": "2025-11-13T10:30:00Z",
  "gitInfo": {
    "branch": "main",
    "commit": "9feee4a",
    "deployTimestamp": "..."
  },
  "services": {
    "supabase": { "status": "healthy", "responseTimeMs": 45, ... },
    ...
  },
  "summary": {
    "totalServices": 9,
    "healthyCount": 7,
    "degradedCount": 1,
    "unhealthyCount": 1
  }
}
```

### `GET /api/health?service=redis`
Check single service only.

### `GET /api/health?history=true&limit=100`
Get historical health check data from database.

### `GET /api/health?latest=true`
Get latest status for all services (from database, no new checks).

### `GET /api/health?uptime=true&service=redis`
Calculate 24-hour uptime percentage.

### `GET /api/health?meta=true`
Meta-health check (verify health check system itself).

### `POST /api/health/verify` (Admin only)
Manual "Verify Now" trigger. Requires admin authentication.

**Body** (optional):
```json
{ "service": "redis" }
```

---

## UI Components

### Health Status Banner

**Location**: Top of admin monitoring dashboard
**Layout**: 3 rows x multiple columns, 8pt font, right-justified

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Logo]                    [Row 1: Core Services (4 items)]          │
│ v1.2.3 (6pt)              [Row 2: External + Git info]              │
│ 2025-11-13 (6pt)          [Row 3: Summary + Last Check]             │
└─────────────────────────────────────────────────────────────────────┘
```

**Auto-refresh**: Every 30 seconds
**Click**: Opens diagnostic modal for that service

### Diagnostic Modal

**Triggered by**: Clicking any service status dot or "View Details"

**Shows**:
- Current status + response time
- Verification checklist (3 sources with ✓/✗)
- Raw diagnostics JSON (collapsible)
- File paths + line numbers where verifier implemented
- Historical status log (last 20 entries)
- "Verify Now" button (fresh check)

---

## Database Schema

### `system_health_log` Table

```sql
CREATE TABLE system_health_log (
  id UUID PRIMARY KEY,
  check_timestamp TIMESTAMPTZ NOT NULL,
  service_name TEXT NOT NULL,
  status TEXT CHECK (status IN ('healthy', 'degraded', 'unhealthy', 'unknown')),
  response_time_ms INTEGER,
  diagnostics JSONB NOT NULL,
  error_message TEXT,
  verified_sources JSONB NOT NULL, -- ['env_var', 'endpoint_test', 'code_check']
  git_commit TEXT,
  git_branch TEXT,
  created_at TIMESTAMPTZ
);
```

**Indexes**:
- `(service_name, check_timestamp DESC)` - Service history queries
- `(status)` - Failure queries
- `(check_timestamp DESC)` - Recent checks
- GIN on `diagnostics` - Full-text search

**RLS Policies**:
- Service role: Full access
- Admins: Read-only
- Users: No access

**Auto-cleanup**: Records older than 7 days deleted automatically via trigger.

---

## Testing

### Unit Tests (`__tests__/health-checks.test.ts`)

**Test Categories**:
1. **Environment Variable Detection** - Verify missing vars detected
2. **Endpoint Reachability** - Verify bad credentials fail
3. **Multi-Source Verification** - Verify all 3 sources required
4. **Git Integration** - Verify branch/commit detected
5. **Orchestrator** - Verify parallel execution
6. **Database Logging** - Verify audit trail created
7. **Error Handling** - Verify graceful failures
8. **Meta-Health Check** - Test the tests!
9. **Response Time Measurement** - Verify latency tracked
10. **Diagnostics Data** - Verify no sensitive data leaked

**Run Tests**:
```bash
npm test __tests__/health-checks.test.ts
```

---

## Usage Examples

### In Code

```typescript
import { runAllHealthChecks } from '@/lib/health-checks/orchestrator';

// Run all checks
const snapshot = await runAllHealthChecks();
console.log(`Overall status: ${snapshot.overallStatus}`);

// Check single service
import { verifyRedis } from '@/lib/health-checks/verifiers';
const redisHealth = await verifyRedis();

// Get git info
import { getGitInfo } from '@/lib/health-checks/git-info';
const git = await getGitInfo();
console.log(`${git.branch}@${git.commit}`);
```

### In Browser

```javascript
// Fetch current health
const response = await fetch('/api/health');
const snapshot = await response.json();

// Get Redis history
const history = await fetch('/api/health?history=true&service=redis&limit=20');
const data = await history.json();

// Trigger manual check (admin only)
await fetch('/api/health/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ service: 'redis' })
});
```

---

## Configuration

### Environment Variables

**Required**:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
REDIS_URL=redis://...
UNIPILE_API_KEY=...
UNIPILE_DSN=https://...
OPENAI_API_KEY=sk-...
RESEND_API_KEY=re_...
ENCRYPTION_KEY=...
CRON_SECRET=...
```

**Optional** (deployment platforms inject automatically):
```bash
VERCEL_GIT_COMMIT_SHA
VERCEL_GIT_COMMIT_REF
RENDER_GIT_COMMIT
RENDER_GIT_BRANCH
```

### Health Check Config

**File**: `lib/health-checks/types.ts`

```typescript
export const DEFAULT_HEALTH_CHECK_CONFIG = {
  timeoutMs: 5000,       // 5 seconds max per check
  retryAttempts: 2,      // Retry failed checks twice
  retryDelayMs: 1000,    // 1 second between retries
  logToDatabase: true,   // Store in system_health_log
};
```

---

## Deployment Checklist

### Before First Use

1. **Apply Migration**: Run `032_system_health_log.sql` in Supabase
2. **Verify Table**: `SELECT * FROM system_health_log LIMIT 1;`
3. **Test API**: `curl http://localhost:3000/api/health`
4. **Check Logs**: Ensure logs being written to table
5. **Run Tests**: `npm test __tests__/health-checks.test.ts`
6. **Meta-Check**: `curl http://localhost:3000/api/health?meta=true`

### Production Deployment

1. Set all required environment variables
2. Verify deployment platform injects git env vars
3. Test health endpoint returns 200 OK
4. Verify logs appear in `system_health_log` table
5. Check banner displays correctly in `/admin/monitoring`
6. Test "Verify Now" button works
7. Confirm 7-day retention cleanup runs

---

## Troubleshooting

### Issue: All services show "unknown"

**Cause**: Environment variables not set
**Fix**: Check `.env.local` file, ensure all required vars present

### Issue: Endpoint tests fail but env vars present

**Cause**: Network timeout or bad credentials
**Fix**: Check service status (e.g., Redis server running?), verify API keys valid

### Issue: Health checks not logging to database

**Cause**: Migration not applied or RLS blocking writes
**Fix**:
1. Run migration `032_system_health_log.sql`
2. Verify service role key configured
3. Check Supabase logs for errors

### Issue: Modal shows "Loading..." forever

**Cause**: API endpoint not reachable or CORS issue
**Fix**: Check browser console for errors, verify `/api/health` responds

### Issue: Git info shows "unknown"

**Cause**: Not a git repository or deployment env vars missing
**Fix**:
1. Run `git status` to verify git repo
2. Check deployment platform injects git env vars
3. See `/lib/health-checks/git-info.ts` for supported platforms

---

## Future Enhancements

### Phase 2 (Future)

- [ ] Browser notifications for critical failures
- [ ] Email alerts via Resend
- [ ] Slack/Discord webhook integration
- [ ] Historical trends visualization (response time graphs)
- [ ] SLA uptime tracking (99.9% targets)
- [ ] Automated incident reports
- [ ] Public status page (unauthenticated read-only)
- [ ] Performance profiling (identify slow services)
- [ ] Rate limit monitoring (track API quotas)
- [ ] Cost tracking (OpenAI token usage, etc.)

### Integration Ideas

- **Sentry**: Send health failures to Sentry for alerting
- **DataDog/New Relic**: Export metrics for APM
- **PagerDuty**: On-call escalation for critical failures
- **GitHub Actions**: Run health checks in CI/CD
- **Render/Netlify**: Display health badge in deploy status

---

## References

### Related Files

- [Git Branch Strategy](/docs/templates/BRANCH_STRATEGY_TEMPLATE.md)
- [Agile Workflow Rules](/docs/templates/AGILE_WORKFLOW_RULES.md)
- [Security Audit Report](/docs/SECURITY_AUDIT_REPORT_2025-11-09.md)

### External Docs

- [Supabase RPC Functions](https://supabase.com/docs/guides/database/functions)
- [BullMQ Queue Monitoring](https://docs.bullmq.io/guide/queues/observability)
- [UniPile API Docs](https://developer.unipile.com)
- [OpenAI Models API](https://platform.openai.com/docs/api-reference/models)
- [Resend Domains API](https://resend.com/docs/api-reference/domains)

---

## Maintainers

**Primary**: Claude Code (AI Assistant)
**Reviewers**: Colm (CTO), Engineering Team
**Last Updated**: 2025-11-13

---

## License

Internal use only - Bravo revOS proprietary code
