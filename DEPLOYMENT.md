# Bravo revOS - Production Deployment Guide

**Last Updated**: 2025-11-09
**Target Date**: This Week
**Status**: Ready for Production

---

## Prerequisites

### Required Accounts
- [ ] Netlify account (frontend hosting)
- [ ] Render account (backend services)
- [ ] Upstash account (Redis)
- [ ] Supabase project (already set up: `kvjcidxbyimoswntpjcp`)
- [ ] GitHub repository access
- [ ] OpenAI API key (for voice generation)

### Optional Accounts (Feature-Specific)
- [ ] Unipile account (LinkedIn integration)
- [ ] Resend account (email notifications)

### Tools Required
- Git
- Node.js 18+
- npm or yarn
- PostgreSQL client (optional, for local testing)

---

## Phase 1: Environment Variables Setup

### 1.1 Generate Secrets

Run these commands to generate secure keys:

```bash
# Generate encryption key (32 bytes)
openssl rand -hex 32

# Generate cron secret (32 bytes)
openssl rand -hex 32
```

Save these values securely - you'll need them for environment variables.

### 1.2 Gather API Keys

Collect these from their respective dashboards:

**Supabase** (https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp):
- `NEXT_PUBLIC_SUPABASE_URL`: https://kvjcidxbyimoswntpjcp.supabase.co
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Settings → API → anon/public key
- `SUPABASE_SERVICE_ROLE_KEY`: Settings → API → service_role key

**OpenAI** (https://platform.openai.com/api-keys):
- `OPENAI_API_KEY`: Create new secret key

**Upstash Redis** (https://console.upstash.com):
- `REDIS_URL`: Create Redis database → Copy connection URL (rediss://...)

---

## Phase 2: Database Migration

### 2.1 Open Supabase SQL Editor

Navigate to: https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp/sql/new

### 2.2 Run Migrations in Sequence

**Important**: Run migrations in numeric order. Skip `013_create_test_users_dev.sql` in production.

```sql
-- Copy and paste each migration file content, one at a time:

-- 001_initial_schema.sql
-- 002_storage_setup.sql
-- 003_cartridge_system.sql
-- 004_fix_auth.sql
-- 005_add_campaign_id_to_posts.sql
-- 006_d01_email_extraction.sql
-- 007_d02_webhook_delivery.sql
-- 008_enable_rls_all_tables.sql
-- 009_add_rls_policies_all_tables.sql
-- 010a_fix_rls_infinite_recursion.sql
-- 010b_e05_pod_engagement_executor.sql
-- 011_lead_magnet_library.sql
-- 012_campaigns_lead_magnet_source.sql
-- ⚠️ SKIP: 013_create_test_users_dev.sql (dev only)
-- 014_fix_linkedin_rls_service_role.sql
-- 015_add_client_unipile_credentials.sql
-- 016_add_agency_id_to_users.sql
-- 017_add_slug_to_clients.sql
-- 018_add_client_insert_rls_policy.sql
-- 019_fix_client_insert_rls_policy.sql
-- 020_add_agency_based_client_select_policy.sql
-- 20250111_create_agentkit_tables.sql
```

### 2.3 Verify Tables Created

In Supabase Dashboard → Table Editor, verify these tables exist:
- users
- agencies
- clients
- campaigns
- posts
- leads
- webhook_deliveries
- cartridges
- pods
- pod_members
- linkedin_accounts

### 2.4 Test RLS Policies

```sql
-- Test as authenticated user
SELECT * FROM clients; -- Should return only user's agency clients
```

---

## Phase 3: Netlify Deployment (Frontend)

### 3.1 Create New Site

1. Go to https://app.netlify.com/
2. Click "Add new site" → "Import an existing project"
3. Connect GitHub repository
4. Select `bravo-revos` repository

### 3.2 Configure Build Settings

- **Branch to deploy**: `main`
- **Build command**: `npm run build`
- **Publish directory**: `.next`
- **Node version**: 18 (Settings → Build & deploy → Environment → Node.js version)

### 3.3 Set Environment Variables

Navigate to: Site settings → Environment variables

Add these variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://kvjcidxbyimoswntpjcp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from Supabase dashboard>
SUPABASE_SERVICE_ROLE_KEY=<from Supabase dashboard>

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-site.netlify.app

# Security
ENCRYPTION_KEY=<generated in Phase 1>
CRON_SECRET=<generated in Phase 1>

# OpenAI
OPENAI_API_KEY=sk-...

# Redis
REDIS_URL=rediss://default:<password>@<host>.upstash.io:6379

# Optional: Unipile (if enabled)
UNIPILE_DSN=https://api3.unipile.com:13344
UNIPILE_API_KEY=<from Unipile dashboard>
UNIPILE_MOCK_MODE=false

# Optional: Email (if enabled)
RESEND_API_KEY=re_...
```

### 3.4 Deploy

Click "Deploy site" and wait for build to complete.

### 3.5 Verify Frontend

- Visit your Netlify URL
- Test login flow
- Verify dashboard loads
- Check API routes respond (Network tab)

---

## Phase 4: Render Deployment (Backend Services)

### 4.1 Create Web Service

1. Go to https://dashboard.render.com/
2. Click "New +" → "Web Service"
3. Connect GitHub repository: `bravo-revos`
4. Configure:
   - **Name**: `bravo-revos-web`
   - **Region**: Choose closest to users
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Free or Starter

### 4.2 Set Web Service Environment Variables

Add the SAME environment variables as Netlify (from Phase 3.3)

### 4.3 Create Background Worker: Webhook Delivery

1. Click "New +" → "Background Worker"
2. Connect same repository
3. Configure:
   - **Name**: `bravo-revos-webhook-worker`
   - **Branch**: `main`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run worker:webhook`
   - **Instance Type**: Free or Starter

4. Add environment variables (same as web service)

### 4.4 Create Background Worker: Pod Automation

1. Click "New +" → "Background Worker"
2. Connect same repository
3. Configure:
   - **Name**: `bravo-revos-pod-worker`
   - **Branch**: `main`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run worker:pod-automation`
   - **Instance Type**: Free or Starter

4. Add environment variables (same as web service)

### 4.5 Verify Workers Running

In each worker's dashboard:
- Check "Logs" tab
- Look for startup messages:
  - `[WEBHOOK_WORKER] Starting...`
  - `[POD_WORKER] Starting...`
- Verify Redis connection successful

---

## Phase 5: Smoke Tests

### 5.1 Frontend Tests

Visit your production site and verify:

- [ ] Homepage loads
- [ ] Login flow works
- [ ] Dashboard renders
- [ ] Can navigate to pages:
  - [ ] `/dashboard`
  - [ ] `/dashboard/campaigns`
  - [ ] `/dashboard/cartridges`
  - [ ] `/admin/clients`

### 5.2 Backend API Tests

Test API endpoints (use Postman or curl):

```bash
# Health check
curl https://your-site.netlify.app/api/health

# Authentication required (should return 401)
curl https://your-site.netlify.app/api/campaigns
```

### 5.3 Database Tests

In Supabase SQL Editor:

```sql
-- Verify RLS is enabled
SELECT tablename FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true;

-- Should return all tables with RLS
```

### 5.4 Worker Tests

Check Render worker logs:

- [ ] Workers connected to Redis
- [ ] No startup errors
- [ ] Queues initialized

---

## Phase 6: Post-Deployment Configuration

### 6.1 Create Admin User

1. Visit your site and sign up with admin email
2. In Supabase SQL Editor:

```sql
-- Create agency for admin
INSERT INTO agencies (name, slug) VALUES ('Your Agency', 'your-agency') RETURNING id;

-- Update admin user with agency_id (use ID from above)
UPDATE users SET agency_id = '<agency-id>' WHERE email = 'admin@yoursite.com';
```

### 6.2 Configure DNS (Optional)

If using custom domain:

1. In Netlify: Site settings → Domain management
2. Add custom domain
3. Update DNS records as instructed
4. Update `NEXT_PUBLIC_APP_URL` environment variable

### 6.3 Set Up Monitoring

#### Netlify
- Site settings → Build & deploy → Deploy notifications
- Configure Slack/Email alerts for failed builds

#### Render
- Each service → Settings → Notifications
- Enable health check alerts

#### Upstash Redis
- Console → Metrics tab
- Monitor connection count and memory usage

---

## Phase 7: Validation Checklist

### Critical Features
- [ ] User authentication works
- [ ] Agency/Client hierarchy enforced
- [ ] RLS policies block unauthorized access
- [ ] API routes require authentication
- [ ] Environment secrets are secure (not in code)

### Background Workers
- [ ] Webhook worker processing jobs
- [ ] Pod automation worker processing jobs
- [ ] Redis connection stable
- [ ] No memory leaks (monitor over 24 hours)

### Database
- [ ] All migrations applied
- [ ] RLS enabled on all tables
- [ ] Indexes created
- [ ] No test data in production

---

## Troubleshooting

### Build Fails on Netlify

**Issue**: `Module not found` errors
**Fix**: Check `package.json` has all dependencies. Run `npm install` locally first.

**Issue**: Environment variables not working
**Fix**: Ensure variables are set in Netlify dashboard, not just .env.local

### Workers Not Starting on Render

**Issue**: Worker shows "Starting..." but never connects
**Fix**: Check logs for Redis connection errors. Verify `REDIS_URL` is correct.

**Issue**: `EADDRINUSE` port already in use
**Fix**: Remove `WEBHOOK_WORKER_PORT` from environment variables (not needed on Render)

### Database Connection Issues

**Issue**: `Could not find column` errors
**Fix**: Verify all migrations ran successfully. Check migration order.

**Issue**: `Row Level Security policy violation`
**Fix**: Verify user has `agency_id` set. Check RLS policies for that table.

### API Routes Return 500

**Issue**: Internal server error
**Fix**: Check Netlify function logs. Verify `SUPABASE_SERVICE_ROLE_KEY` is set.

---

## Rollback Procedure

If deployment fails and you need to rollback:

### Netlify
1. Go to Deploys tab
2. Find last working deploy
3. Click "Publish deploy"

### Render
1. Each service has deploy history
2. Click "..." → "Redeploy" on last working deploy

### Database
⚠️ **Database rollback is complex** - migrations are forward-only.

If you need to rollback a migration:
1. Manually write a DOWN migration
2. Test thoroughly in staging first
3. Consider data loss implications

---

## Security Checklist

Before going live:

- [ ] All secrets in environment variables (not code)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` only on server (not exposed to browser)
- [ ] RLS policies tested for all tables
- [ ] API routes require authentication
- [ ] CORS configured (if needed)
- [ ] Rate limiting enabled (future: add Upstash rate limiting)
- [ ] Error messages don't leak sensitive info
- [ ] Production URL uses HTTPS
- [ ] Database backups configured (Supabase auto-backups enabled)

---

## Performance Optimization (Optional)

### Netlify
- Enable asset optimization in Build settings
- Configure caching headers
- Use Netlify CDN for static assets

### Render
- Upgrade to paid tier for zero-downtime deploys
- Enable horizontal scaling if traffic increases

### Database
- Monitor slow queries in Supabase logs
- Add indexes for common query patterns
- Consider read replicas for high traffic

---

## Support & Resources

### Documentation
- **This Repository**: `/docs` folder
- **Supabase Docs**: https://supabase.com/docs
- **Netlify Docs**: https://docs.netlify.com/
- **Render Docs**: https://render.com/docs

### Monitoring Dashboards
- **Frontend**: https://app.netlify.com/sites/your-site
- **Backend**: https://dashboard.render.com/
- **Database**: https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp
- **Redis**: https://console.upstash.com/

### Getting Help
- Check logs first (Netlify, Render, Supabase)
- Review `ENVIRONMENT_VARIABLES.md` for configuration reference
- Check GitHub Issues for known problems

---

## Deployment Complete! 🎉

Your Bravo revOS platform is now live in production.

**Next Steps**:
1. Test all critical user flows
2. Invite beta users
3. Monitor error rates for 24-48 hours
4. Set up production monitoring/alerts
5. Schedule regular database backups

**Maintenance**:
- Review logs weekly
- Monitor Upstash Redis usage
- Check Supabase database size
- Update dependencies monthly
- Review security policies quarterly

---

## Background Workers (Vercel Cron)

The application includes 3 background workers that run via Vercel Cron:

| Worker | Schedule | Function |
|--------|----------|----------|
| `/api/cron/dm-scraper` | Every 5 minutes | Poll Unipile for comments, send auto-DMs, collect emails |
| `/api/cron/webhook-retry` | Every 10 minutes | Retry failed webhook deliveries with exponential backoff |
| `/api/cron/pod-notifications` | Every 15 minutes | Send pod repost notifications via email |

### Authentication

All cron endpoints require `Authorization: Bearer $CRON_SECRET` header.

### Testing Locally

```bash
# Set CRON_SECRET in .env.local
export CRON_SECRET=$(grep CRON_SECRET .env.local | cut -d= -f2)

# Test each worker
curl -X POST http://localhost:3000/api/cron/dm-scraper -H "Authorization: Bearer $CRON_SECRET"
curl -X POST http://localhost:3000/api/cron/webhook-retry -H "Authorization: Bearer $CRON_SECRET"
curl -X POST http://localhost:3000/api/cron/pod-notifications -H "Authorization: Bearer $CRON_SECRET"
```

### Production Verification

After deployment:

1. Check Vercel Dashboard → Cron Jobs
2. Verify all 3 jobs appear in list
3. Wait for first execution (5-15 minutes)
4. Check logs in Vercel Dashboard
5. Verify database metrics are updating

### Monitoring

Check worker health with these database queries:

```sql
-- Check recent scrape job activity
SELECT id, status, comments_scanned, dms_sent, last_checked
FROM scrape_jobs
WHERE last_checked > NOW() - INTERVAL '1 hour';

-- Check webhook delivery rate
SELECT status, COUNT(*)
FROM webhook_logs
WHERE created_at > NOW() - INTERVAL '1 day'
GROUP BY status;

-- Check notification delivery
SELECT status, COUNT(*)
FROM notifications
WHERE created_at > NOW() - INTERVAL '1 day'
GROUP BY status;
```

