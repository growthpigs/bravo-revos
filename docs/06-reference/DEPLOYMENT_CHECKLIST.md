# Production Deployment Checklist - Bravo revOS

**Document Version:** 1.0
**Last Updated:** 2025-11-09
**Status:** Phase 1 - Pre-Deployment Checks (IN PROGRESS)

---

## 📋 Phase 1: Pre-Deployment Checks

### ✅ Git Repository Status

- [x] All work committed to main branch
- [x] Latest commits pushed to origin (GitHub)
- [x] No uncommitted changes in working directory
- [x] render.yaml present and valid

**Latest Commit:** 4a3edf2 - "fix: Switch to simple chat API due to missing Python dependencies"

**Remote URL:** https://github.com/growthpigs/bravo-revos.git

### ✅ Environment Variables Documented

- [x] .env.example complete with all required variables
- [x] render.yaml specifies all environment variables
- [x] Comments describe each variable purpose
- [x] render.yaml lists which variables require manual setup

### 📋 REQUIRED CREDENTIALS TO GATHER

**Instructions:** Gather all of these before Phase 2. Copy into Render Dashboard.

#### 1. **Supabase** (From https://supabase.com/dashboard)
   - [ ] Project ID: `kvjcidxbyimoswntpjcp` (already in render.yaml)
   - [ ] **NEXT_PUBLIC_SUPABASE_ANON_KEY** - Anon key (Settings > API Keys)
   - [ ] **SUPABASE_SERVICE_ROLE_KEY** - Service role key (Settings > API Keys) ⚠️ CRITICAL SECRET

#### 2. **OpenAI** (From https://platform.openai.com/account/api-keys)
   - [ ] **OPENAI_API_KEY** - API key (format: sk-...)

#### 3. **Redis** (Upstash - https://upstash.com/console/redis)
   - [ ] **REDIS_URL** - Redis connection URL (format: rediss://...)
   - Note: Free tier provides 10k commands/day

#### 4. **Security Tokens** (GENERATE - see instructions below)
   - [ ] **ENCRYPTION_KEY** - 32-byte hex (for credential encryption)
   - [ ] **CRON_SECRET** - 32-byte hex (for cron job protection)

#### 5. **Unipile** (Optional - https://www.unipile.com)
   - [ ] **UNIPILE_API_KEY** - API key (optional global key)
   - Note: Can also use per-client keys stored in database

#### 6. **Email** (Optional - https://resend.com/api-keys)
   - [ ] **RESEND_API_KEY** - API key for email notifications (optional)

#### 7. **Application URL** (Set after first deployment)
   - [ ] **NEXT_PUBLIC_APP_URL** - Render web service URL (e.g., https://bravo-revos-web.onrender.com)

---

## 🔐 GENERATE SECURITY TOKENS

Run these commands to generate the required security tokens:

```bash
# Generate ENCRYPTION_KEY (32-byte hex)
openssl rand -hex 32

# Generate CRON_SECRET (32-byte hex)
openssl rand -hex 32
```

**Save both values securely** - you'll need them for Render setup.

---

## 📊 DEPLOYMENT OVERVIEW

### Services to Deploy

| Service | Type | Purpose | Start Command |
|---------|------|---------|----------------|
| bravo-revos-web | Web Service | Next.js API + Frontend | npm start |
| bravo-revos-webhook-worker | Background Worker | Deliver webhooks to ESPs | npm run worker:webhook |
| bravo-revos-pod-worker | Background Worker | Pod automation engine | npm run worker:pod-automation |

### Environment Variables by Service

All 3 services require the same environment variables (they all need Supabase, Redis, OpenAI, etc.)

- **Public (visible in client):** Variables prefixed with `NEXT_PUBLIC_`
- **Secret (server-only):** Variables without prefix (ENCRYPTION_KEY, SUPABASE_SERVICE_ROLE_KEY, etc.)

---

## 🎯 What Happens in Each Phase

### Phase 1: Pre-Deployment Checks ← YOU ARE HERE
- [x] Verify git status and commits
- [x] Check render.yaml and environment variables
- [x] Create this deployment checklist
- [ ] **TODO:** Gather all credentials before Phase 2

### Phase 2: Netlify Frontend Deployment
- Connect GitHub repository to Netlify
- Set environment variables
- Deploy frontend to https://bravo-revos.netlify.app (or custom domain)

### Phase 3: Render Backend Deployment
- Create Render Blueprint Instance from render.yaml
- Deploy 3 services (web + 2 workers)
- Verify health checks passing

### Phase 4: Supabase Migrations
- Run 22 pending migrations
- Verify database schema
- Check RLS policies

### Phase 5: Post-Deployment Validation
- Test authentication flow
- Test chat functionality
- Test pod automation
- Monitor for errors

### Phase 6: Monitoring & Go-Live
- Configure Sentry error tracking
- Set up performance monitoring
- Create runbook documentation
- Launch to users

---

## 🔍 Current Status

**Git Commits:** 10 recent commits all pushed to main ✅

**Files Ready:**
- render.yaml ✅ (3 services defined, environment variables specified)
- .env.example ✅ (complete variable template)
- Migration files ✅ (22 migrations ready to apply)

**Next Steps:**
1. Gather credentials from Supabase, OpenAI, Upstash
2. Generate ENCRYPTION_KEY and CRON_SECRET
3. Proceed to Phase 2

---

## 📞 Support & Troubleshooting

**For Phase 1 Help:**
- render.yaml documentation: See comments in file (lines 189-231)
- Environment variables: See .env.example
- Render Blueprints: https://docs.render.com/infrastructure-as-code

**Before Phase 2:**
- Ensure all credentials gathered
- Test that Supabase project is accessible
- Test that OpenAI API key works (create simple completion)
- Test that Redis URL is valid

---

## ✅ Deployment Checklist Complete

**Phase 1 Status:** READY FOR NEXT PHASE

**Approval Required:** Gather all credentials listed above before proceeding to Phase 2

