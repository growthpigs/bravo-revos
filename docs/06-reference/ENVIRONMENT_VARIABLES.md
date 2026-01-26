# Environment Variables Reference

Complete reference for all environment variables used in Bravo revOS.

**Last Updated**: 2025-11-09

---

## Quick Reference

### Critical Variables (Required for Production)

| Variable | Required | Where Used | Example |
|----------|----------|------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | Frontend + Backend | `https://kvjcidxbyimoswntpjcp.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes | Frontend + Backend | `eyJhbGci...` |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Yes | Backend Only | `eyJhbGci...` |
| `REDIS_URL` | ✅ Yes | Workers Only | `rediss://default:pass@host:6379` |
| `ENCRYPTION_KEY` | ✅ Yes | Backend Only | `a1b2c3d4...` (64 chars hex) |
| `CRON_SECRET` | ✅ Yes | Backend Only | `x9y8z7...` (64 chars hex) |
| `OPENAI_API_KEY` | ✅ Yes | Backend Only | `sk-...` |
| `UNIPILE_WEBHOOK_SECRET` | ✅ Yes | Backend Only | `a1b2c3...` (64 chars hex) |
| `NEXT_PUBLIC_APP_URL` | ✅ Yes | Frontend + Backend | `https://your-site.netlify.app` |

---

## Detailed Variable Descriptions

### Supabase Configuration

#### `NEXT_PUBLIC_SUPABASE_URL`
- **Type**: Public
- **Required**: Yes
- **Where**: Frontend + Backend
- **Purpose**: Supabase project URL for database and auth
- **How to Get**: Supabase Dashboard → Settings → API → Project URL
- **Example**: `https://kvjcidxbyimoswntpjcp.supabase.co`
- **Production Value**: https://kvjcidxbyimoswntpjcp.supabase.co

#### `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Type**: Public (safe for browser exposure)
- **Required**: Yes
- **Where**: Frontend + Backend
- **Purpose**: Client-side Supabase auth and RLS-protected queries
- **How to Get**: Supabase Dashboard → Settings → API → Project API keys → anon/public
- **Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Security**: Safe to expose (RLS protects data)

#### `SUPABASE_SERVICE_ROLE_KEY`
- **Type**: Secret (⚠️ NEVER expose to browser)
- **Required**: Yes
- **Where**: Backend Only (API routes, workers)
- **Purpose**: Bypass RLS for admin operations, background jobs
- **How to Get**: Supabase Dashboard → Settings → API → Project API keys → service_role
- **Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Security**: ⚠️ CRITICAL - Never log, never send to client
- **Used In**:
  - `/lib/supabase/server.ts` (when `isServiceRole: true`)
  - Worker processes
  - Admin operations

---

### Redis Configuration

#### `REDIS_URL`
- **Type**: Secret
- **Required**: Yes (for workers)
- **Where**: Backend workers
- **Purpose**: BullMQ job queue storage
- **How to Get**:
  1. Create Upstash Redis database at https://console.upstash.com
  2. Copy "TLS URL" from dashboard
- **Example**: `rediss://default:password@host-12345.upstash.io:6379`
- **Used For**:
  - Webhook delivery queue
  - Pod automation queue
  - Post detection scheduling
  - Rate limiting (future)

---

### Security & Encryption

#### `ENCRYPTION_KEY`
- **Type**: Secret
- **Required**: Yes
- **Where**: Backend
- **Purpose**: Encrypt sensitive data (API keys, tokens) in database
- **How to Generate**:
  ```bash
  openssl rand -hex 32
  ```
- **Example**: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2`
- **Length**: 64 hexadecimal characters (32 bytes)
- **Rotation**: Change every 90 days, re-encrypt data

#### `CRON_SECRET`
- **Type**: Secret
- **Required**: Yes
- **Where**: Backend (cron job endpoints)
- **Purpose**: Authenticate scheduled job webhooks
- **How to Generate**:
  ```bash
  openssl rand -hex 32
  ```
- **Example**: `x9y8z7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f9e8d7c6b5a4z3y2x1w0v9u8`
- **Used In**:
  - `/app/api/cron/session-monitor/route.ts`
  - `/app/api/cron/post-detection/route.ts`
- **Verification**:
  ```typescript
  if (request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return 401
  }
  ```

---

### AI & External APIs

#### `OPENAI_API_KEY`
- **Type**: Secret
- **Required**: Yes
- **Where**: Backend
- **Purpose**: Voice cartridge generation, text-to-speech
- **How to Get**: https://platform.openai.com/api-keys
- **Example**: `sk-proj-abc123...`
- **Cost**: Pay-per-use (GPT-4 for voice generation)
- **Used In**:
  - `/app/api/cartridges/generate-from-voice/route.ts`
  - Future: HGC chat integration

#### `UNIPILE_DSN`
- **Type**: Public
- **Required**: No (feature-specific)
- **Where**: Backend
- **Purpose**: Unipile API endpoint for LinkedIn integration
- **How to Get**: From Unipile dashboard
- **Example**: `https://api3.unipile.com:13344`
- **Default**: `https://api3.unipile.com:13344`
- **Used For**:
  - LinkedIn account connection
  - Post fetching
  - Comment/like actions

#### `UNIPILE_API_KEY`
- **Type**: Secret
- **Required**: No (feature-specific)
- **Where**: Backend
- **Purpose**: Authenticate with Unipile API
- **How to Get**: Unipile dashboard → API settings
- **Example**: `N6iCFCo2.qR5FtqsytD5...`
- **Per-Client**: Each client can have their own key (stored in `clients` table)
- **Global Key**: For system-level operations

#### `UNIPILE_MOCK_MODE`
- **Type**: Public (boolean)
- **Required**: No
- **Where**: Backend
- **Purpose**: Use mock data instead of real Unipile API
- **Values**: `true` | `false`
- **Development**: `true` (don't call real API)
- **Production**: `false` (use real LinkedIn data)
- **Default**: `false`

#### `UNIPILE_WEBHOOK_SECRET`
- **Type**: Secret
- **Required**: Yes (for pod campaign integration)
- **Where**: Backend Only
- **Purpose**: Verify HMAC signatures on UniPile webhooks for pod amplification
- **How to Generate**:
  ```bash
  openssl rand -hex 32
  ```
- **Example**: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2`
- **Length**: 64 hexadecimal characters (32 bytes)
- **Security**: ⚠️ CRITICAL - Must match secret configured in UniPile dashboard
- **Used In**:
  - `/app/api/webhooks/unipile/route.ts` (webhook signature verification)
- **Configuration**: Set same value in:
  1. Environment variables (Netlify/Render)
  2. UniPile dashboard webhook settings
- **Algorithm**: HMAC-SHA256
- **Attack Prevention**: Uses `crypto.timingSafeEqual()` to prevent timing attacks

#### `RESEND_API_KEY`
- **Type**: Secret
- **Required**: No (feature-specific)
- **Where**: Backend
- **Purpose**: Send email notifications (session expiry, invitations)
- **How to Get**: https://resend.com/api-keys
- **Example**: `re_abc123...`
- **Used In**:
  - `/lib/notifications/email.ts`
  - Session expiry alerts
  - Pod member invitations

---

### Application Configuration

#### `NEXT_PUBLIC_APP_URL`
- **Type**: Public
- **Required**: Yes
- **Where**: Frontend + Backend
- **Purpose**: Base URL for redirects, webhooks, email links
- **Development**: `http://localhost:3000`
- **Production**: `https://your-site.netlify.app` or custom domain
- **Used For**:
  - OAuth callbacks
  - Email verification links
  - Webhook callback URLs

---

### Development/Debug Variables

#### `ENABLE_LOGGING`
- **Type**: Public
- **Required**: No
- **Where**: Frontend + Backend
- **Purpose**: Enable/disable verbose logging
- **Values**: `true` | `false`
- **Default**: `true` (development), `false` (production)
- **Note**: Structured logging with `[PREFIX]` always enabled

#### `DEBUG_MODE`
- **Type**: Public
- **Required**: No
- **Where**: Frontend + Backend
- **Purpose**: Enable debug features (verbose errors, dev tools)
- **Values**: `true` | `false`
- **Default**: `false`
- **Production**: ❌ Never set to `true`

---

### Worker Configuration

#### `WEBHOOK_WORKER_PORT`
- **Type**: Public
- **Required**: No
- **Where**: Webhook worker
- **Purpose**: Single-instance lock port (prevent duplicate workers)
- **Default**: `4732`
- **Note**: Render handles this automatically, no need to set

#### `DEV_SERVER_LOCK_PORT`
- **Type**: Public
- **Required**: No
- **Where**: Development server
- **Purpose**: Prevent multiple dev servers
- **Default**: `4700`
- **Note**: Development only

---

## Environment Variable Files

### Development (`.env.local`)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://kvjcidxbyimoswntpjcp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<get from Supabase>
SUPABASE_SERVICE_ROLE_KEY=<get from Supabase>

# Redis (local or Upstash)
REDIS_URL=redis://localhost:6379

# Security
ENCRYPTION_KEY=<generate with: openssl rand -hex 32>
CRON_SECRET=<generate with: openssl rand -hex 32>

# OpenAI
OPENAI_API_KEY=sk-...

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Unipile (use mock mode for dev)
UNIPILE_MOCK_MODE=true
UNIPILE_WEBHOOK_SECRET=<generate with: openssl rand -hex 32>

# Optional: Email (skip in dev)
# RESEND_API_KEY=re_...
```

### Production (Netlify/Render Dashboard)

**Set ALL variables in hosting dashboards** (never commit `.env.production`!)

---

## Security Best Practices

### ✅ DO

- Store secrets in hosting platform environment variables
- Rotate secrets every 90 days
- Use different secrets for dev/staging/production
- Prefix public vars with `NEXT_PUBLIC_`
- Generate secrets with `openssl rand -hex 32`
- Use `SUPABASE_SERVICE_ROLE_KEY` only on backend

### ❌ DON'T

- Commit `.env.local` or `.env.production` to Git
- Log secret values (even in errors)
- Send `SUPABASE_SERVICE_ROLE_KEY` to browser
- Reuse secrets across environments
- Share secrets in Slack/email (use 1Password/Bitwarden)
- Hardcode secrets in code

---

## Validation Checklist

Before deploying, verify:

- [ ] All required variables set in both Netlify and Render
- [ ] Public variables prefixed with `NEXT_PUBLIC_`
- [ ] Service role key ONLY on backend (never frontend)
- [ ] Secrets generated with strong randomness
- [ ] Production URLs use HTTPS
- [ ] No secrets committed to Git
- [ ] `.env.local` in `.gitignore`
- [ ] Different secrets for dev/staging/production

---

## Troubleshooting

### "Missing environment variable" Error

**Symptom**: Build fails with `process.env.X is undefined`

**Fix**: Add variable to hosting platform (Netlify/Render) dashboard

### Frontend Can't Connect to Supabase

**Symptom**: Network errors, auth fails

**Fix**: Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set and have `NEXT_PUBLIC_` prefix

### Workers Can't Connect to Redis

**Symptom**: `ECONNREFUSED` or timeout errors

**Fix**: Verify `REDIS_URL` format: `rediss://` (TLS) for Upstash, `redis://` for local

### RLS Policy Errors on Backend

**Symptom**: "Row level security policy violation" in API routes

**Fix**: Verify using service role client:
```typescript
const supabase = await createClient({ isServiceRole: true })
```

---

## Adding New Variables

When adding a new environment variable:

1. **Update this document** with description
2. **Add to `.env.local`** with example value
3. **Update DEPLOYMENT.md** if required for production
4. **Test locally** before deploying
5. **Set in Netlify** (if frontend needs it)
6. **Set in Render** (all 3 services: web + 2 workers)
7. **Document security level** (public/secret)

---

## Reference Links

- **Supabase Docs**: https://supabase.com/docs/guides/api/api-keys
- **Next.js Env Vars**: https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
- **Netlify Env Vars**: https://docs.netlify.com/environment-variables/overview/
- **Render Env Vars**: https://render.com/docs/environment-variables
- **Upstash Redis**: https://docs.upstash.com/redis
