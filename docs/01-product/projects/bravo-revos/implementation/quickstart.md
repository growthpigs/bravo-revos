# Quickstart Guide - RevOS V1 V1 V1

**Feature**: LinkedIn Lead Magnet Automation + Engagement Pod Reshare
**Branch**: `001-linkedin-growth-engine`
**Last Updated**: 2025-11-02

This guide will help you set up, run, and test RevOS V1 V1 V1 locally.

---

## Prerequisites

Before starting, ensure you have:

- **Node.js 18+** (check with `node --version`)
- **pnpm 8+** (install with `npm install -g pnpm`)
- **Docker Desktop** (for local Redis)
- **Supabase CLI** (install with `brew install supabase/tap/supabase`)
- **Git** (for version control)

---

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/rodericandrews/revOS.git
cd revOS
git checkout 001-linkedin-growth-engine
```

### 2. Create `.env` File

Create `.env` in the project root with these variables:

```bash
# ============================================================
# Supabase Database
# ============================================================
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres?sslmode=require
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# ============================================================
# Unipile (LinkedIn API Integration)
# ============================================================
UNIPILE_API_KEY=your_unipile_api_key
UNIPILE_API_URL=https://api.unipile.com/v1

# Rate limits for DMs
LINKEDIN_DM_HOURLY_LIMIT=50
LINKEDIN_DM_MIN_DELAY_MINUTES=2
LINKEDIN_DM_DAILY_START_LIMIT=15  # Start conservative, ramp up

# ============================================================
# OpenAI (for AgentKit + Mem0 embeddings)
# ============================================================
OPENAI_API_KEY=sk-your-openai-api-key-here

# ============================================================
# Mem0 Configuration
# ============================================================
MEM0_API_KEY=your_mem0_api_key  # If using hosted Mem0
# OR for self-hosted Mem0 (uses Supabase pgvector):
MEM0_VECTOR_STORE=supabase
MEM0_VECTOR_DIMENSIONS=1536  # OpenAI text-embedding-3-small
MEM0_SIMILARITY_THRESHOLD=0.7

# ============================================================
# BullMQ + Redis (Job Queue)
# ============================================================
# Local development (Docker):
REDIS_URL=redis://localhost:6379

# OR Upstash Redis (production):
# REDIS_URL=rediss://default:your_password@your-redis.upstash.io:6379
# IMPORTANT: Use Fixed Pricing plan ($10-20/month), NOT Pay-As-You-Go
# BullMQ polls Redis constantly, making PAYG prohibitively expensive

# ============================================================
# Playwright (Reshare Automation)
# ============================================================
PLAYWRIGHT_HEADLESS=true  # Set to false for debugging
PLAYWRIGHT_SLOW_MO=100  # Slow down Playwright for human-like behavior

# Reshare rate limits
RESHARE_DAILY_LIMIT=20  # Ultra-conservative to avoid LinkedIn bans
RESHARE_MIN_DELAY_MINUTES=15  # Min gap between any member's reshares

# ============================================================
# AgentKit Configuration
# ============================================================
AGENTKIT_MODEL=gpt-4  # NOT gpt-4-realtime (cost savings)
AGENTKIT_MAX_TOKENS=2000
AGENTKIT_TEMPERATURE=0.7

# ============================================================
# Application
# ============================================================
NODE_ENV=development
PORT=5001
SESSION_SECRET=your_random_session_secret_here

# ============================================================
# Webhooks (for lead email delivery)
# ============================================================
# This is where RevOS will POST captured emails
# Client's CRM/email system should be listening here
WEBHOOK_TIMEOUT_MS=5000
WEBHOOK_RETRY_ATTEMPTS=3
```

### 3. Get API Keys

**Supabase**:
1. Go to https://supabase.com/dashboard
2. Create new project
3. Copy `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` from Settings → API

**Unipile** (LinkedIn API):
1. Sign up at https://dashboard.unipile.com
2. Create API key
3. Copy `UNIPILE_API_KEY`

**OpenAI**:
1. Get API key from https://platform.openai.com/api-keys
2. Copy to `OPENAI_API_KEY`

**Upstash Redis** (Production):
1. Create database at https://console.upstash.com
2. Select **Fixed Pricing** plan ($10-20/month)
3. Copy `REDIS_URL` (format: `rediss://default:password@host:6379`)

---

## Database Setup

### 1. Initialize Supabase

```bash
# Link to your Supabase project
supabase link --project-ref [your-project-ref]

# OR initialize new local Supabase (for development)
supabase init
```

### 2. Run Migrations

```bash
# Apply all migrations (creates tables, RLS policies, indexes)
supabase db push

# OR run migrations individually
supabase db migrate up 001_core_schema
supabase db migrate up 002_v1_core
supabase db migrate up 003_v15_reshare
```

### 3. Verify Tables Created

```bash
# Check database schema
supabase db diff

# OR connect to psql and list tables
supabase db reset --linked
```

Expected tables:
- ✅ tenants
- ✅ users
- ✅ cartridges
- ✅ campaigns
- ✅ leads
- ✅ mem0_memories
- ✅ pods
- ✅ linkedin_sessions
- ✅ reshare_history
- ✅ reshare_rate_limits

### 4. Seed Development Data (Optional)

```bash
# Run seed script to create test tenant + user
pnpm run db:seed
```

---

## Installation

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Install Playwright Browsers

```bash
# Required for Reshare automation
npx playwright install chromium
```

### 3. Build TypeScript

```bash
pnpm run build
```

---

## Running Locally

### 1. Start Redis (Docker)

```bash
# Start Redis in Docker container
docker run -d -p 6379:6379 --name revos-redis redis:7-alpine

# Verify Redis is running
redis-cli ping
# Expected: PONG
```

### 2. Start Development Server

```bash
# Start backend + frontend concurrently
pnpm dev
```

Server starts at:
- **Frontend**: http://localhost:5173 (Vite dev server)
- **Backend**: http://localhost:5001 (Express API)
- **AgentKit Chat**: http://localhost:5001/api/agentkit/stream

### 3. Verify Services Running

```bash
# Check health endpoint
curl http://localhost:5001/api/health

# Expected response:
# {
#   "status": "ok",
#   "services": {
#     "database": "connected",
#     "redis": "connected",
#     "unipile": "configured",
#     "mem0": "initialized"
#   }
# }
```

---

## Testing V1 Core - Lead Magnet Automation

### Test Scenario 1: Create Campaign

```bash
curl -X POST http://localhost:5001/api/campaigns \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_DEV_TOKEN" \
  -d '{
    "name": "Leadership Guide Campaign",
    "linkedin_post_url": "https://linkedin.com/posts/your-post-activity-123456",
    "lead_magnet_name": "5 Conversations Every Leader Must Have",
    "trigger_word": "SWIPE",
    "webhook_url": "https://webhook.site/your-unique-url",
    "dm_template": "Hey {name}, loved your comment! What'\''s your best email? I'\''ll send you the {lead_magnet_name}."
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "campaign": {
    "id": "uuid",
    "name": "Leadership Guide Campaign",
    "status": "draft",
    "linkedin_post_url": "https://linkedin.com/posts/...",
    "trigger_word": "SWIPE",
    "stats": {
      "total_leads": 0,
      "dms_sent": 0,
      "emails_captured": 0
    }
  }
}
```

### Test Scenario 2: Scrape Comments

```bash
curl -X POST http://localhost:5001/api/leads/scrape \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_DEV_TOKEN" \
  -d '{
    "campaign_id": "uuid-from-step-1"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "leads_found": 47,
  "leads_with_trigger_word": 23,
  "job_id": "scrape-uuid"
}
```

### Test Scenario 3: AgentKit Chat

```bash
curl -X POST http://localhost:5001/api/agentkit/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_DEV_TOKEN" \
  -d '{
    "message": "Create a LinkedIn post about imposter syndrome targeting coaches",
    "tenant_id": "your-tenant-uuid",
    "user_id": "your-user-uuid"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "response": "Here's a post about imposter syndrome for coaches:\n\n[Generated post content in user's voice]",
  "memories_used": ["preference:tone", "context:audience"],
  "cartridges_loaded": ["system", "user", "linkedin-skill"]
}
```

### Test Scenario 4: SSE Streaming Chat

Open browser to:
```
http://localhost:5001/api/agentkit/stream?message=Show%20me%20campaign%20stats&tenant_id=uuid&user_id=uuid
```

**Expected**: Real-time streaming response from AgentKit

---

## Testing V1.5 Reshare Automation

**IMPORTANT**: Only test Reshare on **burner LinkedIn accounts** first. Never use your primary account for initial testing.

### Test Scenario 5: Capture LinkedIn Session

1. Navigate to session capture UI:
```bash
open http://localhost:5001/sessions/capture
```

2. Click "Capture LinkedIn Session"
3. Log in to **burner LinkedIn account**
4. Complete 2FA if required
5. Click "Save Session"

**Expected**: Session cookies encrypted and stored in `linkedin_sessions` table

### Test Scenario 6: Create Engagement Pod

```bash
curl -X POST http://localhost:5001/api/pods \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_DEV_TOKEN" \
  -d '{
    "name": "Executive Coaches Pod",
    "member_account_ids": [
      "uuid-session-1",
      "uuid-session-2",
      "uuid-session-3"
    ],
    "reshare_limit_daily": 5,
    "reshare_window_minutes": 60
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "pod": {
    "id": "uuid",
    "name": "Executive Coaches Pod",
    "member_count": 3,
    "reshare_limit_daily": 5
  }
}
```

### Test Scenario 7: Trigger Reshare (Manual)

```bash
curl -X POST http://localhost:5001/api/reshare/trigger \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_DEV_TOKEN" \
  -d '{
    "post_url": "https://linkedin.com/posts/member-activity-123456",
    "pod_id": "uuid-from-step-6"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "reshares_queued": 2,
  "excluded_author": true,
  "estimated_completion_minutes": 60,
  "jobs": [
    {
      "account_id": "uuid",
      "scheduled_for": "2025-11-02T10:15:00Z",
      "commentary": "This framework saved us 10 hours/week. The delegation matrix is gold."
    },
    {
      "account_id": "uuid",
      "scheduled_for": "2025-11-02T10:37:00Z",
      "commentary": "We tried this exact approach last quarter. Results were incredible."
    }
  ]
}
```

### Test Scenario 8: Monitor Reshare Execution

```bash
# Watch BullMQ dashboard
open http://localhost:5001/admin/queues

# OR check reshare history
curl http://localhost:5001/api/reshare/history?pod_id=uuid
```

**Expected**: Jobs processed every 15-30 minutes with staggered timing

---

## Troubleshooting

### Error: "Unipile API key not set"

**Cause**: Missing `UNIPILE_API_KEY` in `.env`

**Fix**:
```bash
# Add to .env
UNIPILE_API_KEY=your_actual_key_here

# Restart server
pnpm dev
```

### Error: "Mem0 connection failed"

**Cause**: PostgreSQL missing `vector` extension

**Fix**:
```bash
# Connect to database
supabase db reset --linked

# Run extension creation
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Verify extension
psql $DATABASE_URL -c "\dx"
# Should show "vector" extension
```

### Error: "BullMQ worker not starting"

**Cause**: Redis not running or wrong `REDIS_URL`

**Fix**:
```bash
# Check Redis is running
redis-cli ping
# Expected: PONG

# If not running, start Docker container
docker start revos-redis

# Verify .env has correct REDIS_URL
echo $REDIS_URL
# Expected: redis://localhost:6379
```

### Error: "Playwright navigation timeout"

**Cause**: LinkedIn UI changed or session expired

**Fix**:
```bash
# Enable headed mode for debugging
# In .env:
PLAYWRIGHT_HEADLESS=false

# Re-run reshare and watch browser
# Check selectors in server/services/reshare.service.ts

# Update selectors if LinkedIn UI changed
```

### Error: "Rate limit exceeded (LinkedIn)"

**Cause**: Too many DMs or reshares sent too quickly

**Fix**:
```bash
# Check current rate limits
curl http://localhost:5001/api/rate-limits?account_id=uuid

# Adjust limits in .env
LINKEDIN_DM_HOURLY_LIMIT=25  # Reduce from 50
RESHARE_DAILY_LIMIT=10  # Reduce from 20

# Wait 24 hours before resuming
```

### Error: "Database connection refused"

**Cause**: Wrong `DATABASE_URL` or Supabase project paused

**Fix**:
```bash
# Verify Supabase project is active
supabase projects list

# Check DATABASE_URL format
echo $DATABASE_URL
# Expected: postgresql://postgres:password@host:5432/postgres?sslmode=require

# Test connection
psql $DATABASE_URL -c "SELECT NOW();"
```

### Error: "Webhook delivery failed"

**Cause**: Webhook endpoint down or invalid URL

**Fix**:
```bash
# Test webhook endpoint manually
curl -X POST https://webhook.site/your-unique-url \
  -H "Content-Type: application/json" \
  -d '{"test": "payload"}'

# Check webhook logs
curl http://localhost:5001/api/webhooks/logs?campaign_id=uuid

# Update webhook URL if needed
curl -X PATCH http://localhost:5001/api/campaigns/uuid \
  -d '{"webhook_url": "https://new-webhook-url.com"}'
```

---

## Running Tests

### Unit Tests

```bash
# Run all unit tests
pnpm test

# Run specific test file
pnpm test campaigns.test.ts

# Run with coverage
pnpm test:coverage
```

### Integration Tests

```bash
# Run integration tests (requires running server)
pnpm test:integration

# Test specific feature
pnpm test:integration -- --grep "Lead Magnet"
```

### E2E Tests (Reshare)

```bash
# IMPORTANT: Only run on burner LinkedIn accounts
# Set PLAYWRIGHT_TEST_ACCOUNT=true in .env

pnpm test:e2e
```

---

## Development Workflow

### 1. Create Feature Branch

```bash
git checkout -b feat/your-feature-name
```

### 2. Make Changes

```bash
# Edit files in server/, client/, shared/
code .
```

### 3. Run Linter

```bash
pnpm lint
pnpm lint:fix  # Auto-fix issues
```

### 4. Test Changes

```bash
pnpm test
pnpm test:integration
```

### 5. Commit Changes

```bash
git add .
git commit -m "feat: Add your feature description"
```

### 6. Push and Create PR

```bash
git push origin feat/your-feature-name
# Create PR on GitHub
```

---

## Production Deployment Checklist

Before deploying to production:

- [ ] Environment variables set in production (Vercel, Railway, etc.)
- [ ] Supabase project in production mode (not paused)
- [ ] Upstash Redis on **Fixed Pricing** plan (NOT Pay-As-You-Go)
- [ ] All migrations applied to production database
- [ ] RLS policies tested and verified
- [ ] Webhook endpoints verified and accessible
- [ ] LinkedIn accounts use ultra-conservative rate limits (15 DMs/day start)
- [ ] Reshare tested on burner accounts first (never production accounts)
- [ ] Playwright selectors verified against current LinkedIn UI
- [ ] Monitoring and alerts configured (Sentry, LogRocket, etc.)
- [ ] Backup strategy for PostgreSQL (Supabase automatic backups enabled)
- [ ] Session encryption keys rotated and secure

---

## Useful Commands

```bash
# Development
pnpm dev                    # Start dev server
pnpm build                  # Build for production
pnpm start                  # Start production server

# Database
pnpm db:push                # Apply migrations
pnpm db:pull                # Pull schema from Supabase
pnpm db:seed                # Seed development data
pnpm db:reset               # Reset local database

# Testing
pnpm test                   # Run unit tests
pnpm test:watch             # Run tests in watch mode
pnpm test:integration       # Run integration tests
pnpm test:e2e               # Run end-to-end tests

# Linting
pnpm lint                   # Check for linting issues
pnpm lint:fix               # Auto-fix linting issues

# Type checking
pnpm type-check             # Check TypeScript types

# BullMQ/Redis
pnpm queue:dashboard        # Open BullMQ dashboard (http://localhost:5001/admin/queues)
pnpm queue:clear            # Clear all queues (dev only)

# Docker
docker ps                   # List running containers
docker logs revos-redis     # View Redis logs
docker stop revos-redis     # Stop Redis container
```

---

## Next Steps

1. ✅ Complete V1 Core (Days 1-4): Lead magnet automation + AgentKit + Cartridges
2. ✅ Test on burner LinkedIn accounts
3. ⏳ Complete V1.5 Premium (Days 5-6): Reshare automation with Playwright
4. ⏳ Deploy to staging environment
5. ⏳ User acceptance testing
6. ⏳ Production deployment

---

## Support & Resources

- **Unipile Docs**: https://developer.unipile.com/docs
- **Mem0 Docs**: https://docs.mem0.ai
- **BullMQ Docs**: https://docs.bullmq.io
- **Playwright Docs**: https://playwright.dev/docs/intro
- **Supabase Docs**: https://supabase.com/docs
- **AgentKit Docs**: https://github.com/openai/agentkit

For issues or questions, create an issue on GitHub or contact the development team.
