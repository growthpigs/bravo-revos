# RevOS Runbook

## 🚨 CRITICAL: Pre-Work Checklist (Added 2026-01-21)

**Lesson Learned:** 5 duplicate AudienceOS directories caused confusion, wrong repo edited, wasted time. Follow this checklist EVERY session.

### Before Making ANY Changes

1. **Which repo deploys to production?**
   ```bash
   # Check .vercel/project.json for projectName
   cat .vercel/project.json | grep projectName
   ```
   | Project | Production Repo | Vercel Project |
   |---------|-----------------|----------------|
   | RevOS | `revos` | `bravo-revos` |
   | AudienceOS | `command_center_audience_OS` | `v0-audience-os-command-center` |

2. **Are you in the right directory?**
   ```bash
   pwd && git remote get-url origin
   ```

3. **Is there codebase sprawl?**
   ```bash
   ls ~/projects | grep -i revos   # Check for duplicates
   ls ~/projects | grep -i audience  # Check for duplicates
   ```

4. **Runtime-First Rule:**
   > "Verification requires Execution. File existence does not imply functionality. Repo existence does not imply production deployment."

   Always run `npm run build` after changes - don't assume syntax correctness means it works.

5. **Known Gotchas:**
   - `@/` path aliases don't work cross-package in monorepos (use relative imports)
   - Broken symlinks cause silent build failures (check with `ls -la`)
   - Same commit can have flaky builds on Vercel - check multiple deployments
   - Debug console.log statements MUST be removed before production

---

## Quick Links

| Resource | URL |
|----------|-----|
| Production (Standalone) | https://ra-diiiploy.vercel.app |
| Production (Unified) | https://unified.diiiploy.io/revos (TBD - pending Vercel setup) |
| Supabase | https://supabase.com/dashboard/project/ebxshdqfaqupnvpghodi |
| Vercel Team | https://vercel.com/diiiploy-platform |
| Vercel Project | `ra-diiiploy` |
| Sentry | org=badaboost |
| Monorepo | `~/projects/hgc-monorepo/packages/revos` |

---

## Credentials

**Stored in:** Supabase Vault (production), `.env.local` (development)

### API Keys Required

| Service | Purpose | Rotation |
|---------|---------|----------|
| OPENAI_API_KEY | AgentKit, GPT-4o | Quarterly |
| UNIPILE_API_KEY | LinkedIn automation | Annually |
| APOLLO_API_KEY | Lead enrichment | Quarterly |
| INSTANTLY_API_KEY | Email sequences | Quarterly |
| POSTHOG_API_KEY | Analytics | Never |
| CLARITY_PROJECT_ID | Session recordings | Never |
| MEM0_API_KEY | Memory/cartridges | Quarterly |

---

## Deployment

### Standalone Deploy (Vercel)

```bash
cd /Users/rodericandrews/_PAI/projects/revos
npm run build
vercel --prod
```

### Unified Platform Deploy (Monorepo)

```bash
cd ~/projects/hgc-monorepo/packages/revos
UNIFIED_PLATFORM=true npm run build  # Sets basePath: '/revos'
# Deploy via Vercel dashboard or CLI
```

**Environment Variables for Unified:**
- `UNIFIED_PLATFORM=true` → Enables basePath: `/revos`
- Without this env var → basePath: `` (empty, standalone mode)

### Database Migrations

```bash
supabase db push --project-ref ebxshdqfaqupnvpghodi
```

### Edge Functions

```bash
supabase functions deploy --project-ref ebxshdqfaqupnvpghodi
```

---

## Unified Platform Architecture (Added 2026-01-22)

### Stack Versions

| Package | Version |
|---------|---------|
| React | 19.2.0 |
| Next.js | 16.1.4 |
| Tailwind | 4.1.18 |

### Path-Based Routing

```
unified.diiiploy.io/
├── /revos/*        → RevOS (this app)
├── /audienceos/*   → AudienceOS
└── /               → Landing page
```

### Key Files

| File | Purpose |
|------|---------|
| `next.config.js:7` | basePath config (conditional on UNIFIED_PLATFORM) |
| `hgc-monorepo/vercel.json` | Rewrites for path routing |
| `hgc-monorepo/public/index.html` | Landing page |

### basePath Compatibility Rules

1. **NEVER use** `window.location.href = '/path'` for navigation
2. **ALWAYS use** `router.push('/path')` from next/navigation
3. router.push() automatically prepends basePath
4. Supabase callback URL detection in `auth/login/page.tsx`

### Monorepo Structure

```
hgc-monorepo/ (pai-unified-platform)
├── packages/
│   ├── revos/           ← This app
│   ├── audiences-os/    ← AudienceOS
│   └── hgc/             ← Shared chat library
├── vercel.json          ← Path routing rewrites
└── public/index.html    ← Landing page
```

### Commands (from monorepo root)

```bash
npm run dev:revos       # Start RevOS dev server
npm run build:revos     # Build RevOS
npm run dev:aos         # Start AudienceOS dev server
npm run build           # Build all packages
```

---

## Monitoring

### Health Checks

- **API:** `/api/health` → 200 OK
- **Supabase:** Dashboard → Service Status
- **Background Workers:** Check BullMQ dashboard
- **Unipile:** Check rate limit headers

### Alerts

**Slack Notifications:**
- DM queue backed up (>100 pending)
- Enrichment failure rate >20%
- API response time >5s
- Error rate >1%

---

## Common Operations

### Add New Client

1. Create user in Supabase Auth
2. Create default cartridge
3. Configure LinkedIn account in Unipile
4. Send onboarding email

### Reset Rate Limits

```sql
UPDATE rate_limits
SET count = 0, reset_at = NOW()
WHERE user_id = '[UUID]';
```

### Force Re-enrichment

```sql
UPDATE leads
SET enrichment_status = 'pending'
WHERE campaign_id = '[UUID]' AND enrichment_status = 'failed';
```

---

## Troubleshooting

### DMs Not Sending

1. Check Unipile rate limits
2. Verify LinkedIn account connected
3. Check BullMQ queue status
4. Review error logs

### Enrichment Failing

1. Check Apollo credit balance
2. Verify API key valid
3. Check LinkedIn URL format
4. Review enrichment_error column

### AgentKit Not Responding

1. Check OpenAI API status
2. Verify API key in Supabase Vault
3. Check Edge Function logs
4. Restart Edge Function if needed

### Tests Failing with Supabase Mock Errors

**Symptom:** `TypeError: Cannot read properties of undefined (reading 'select')` or similar chain errors

**Root Cause:** `mockReturnThis()` doesn't work for Supabase chainable query builders because it returns the wrong `this` context.

**Fix:**
```typescript
// WRONG - mockReturnThis() returns wrong context
mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
};

// CORRECT - use shared queryBuilder with mockReturnValue()
const queryBuilder = {
  select: jest.fn(),
  limit: jest.fn().mockResolvedValue({ data: [], error: null }),
};
queryBuilder.select.mockReturnValue(queryBuilder);
mockSupabase = {
  from: jest.fn().mockReturnValue(queryBuilder),
};
```

**Helper Available:** Use `createMockSupabaseClient()` from `__tests__/helpers/supabase-mock.ts`

**Test Debt:** 48 tests currently skipped - see `TEST-DEBT.md` for tracking

---

## Testing

### Commands

```bash
npm test                    # Run all tests (51 passing, 48 skipped)
npm test -- --watch         # Watch mode
npm test -- --coverage      # With coverage
npm test -- --testPathPattern="health"  # Specific test
```

### Current Status (2026-01-22)

| Metric | Value |
|--------|-------|
| Passing | 51 |
| Failed | 0 |
| Skipped | 48 |
| Total | 99 |

**Why 48 skipped?** Outdated Supabase mocks using `mockReturnThis()`. See `TEST-DEBT.md` for fix strategy.

### Mock Helpers

- `__tests__/helpers/supabase-mock.ts` - Shared Supabase mock creator
- `__mocks__/@supabase/ssr.ts` - Global SSR mock

---

## Incident Response

### Severity Levels

| Level | Description | Response Time |
|-------|-------------|---------------|
| P1 | System down, all clients affected | 15 min |
| P2 | Major feature broken | 1 hour |
| P3 | Minor issue, workaround exists | 4 hours |
| P4 | Cosmetic/low impact | Next sprint |

### Escalation

1. Check Slack #revos-alerts
2. Page on-call (Chase)
3. If infra: Roderic
4. Post-mortem within 24h for P1/P2

---

*Last Updated: 2026-01-22*
