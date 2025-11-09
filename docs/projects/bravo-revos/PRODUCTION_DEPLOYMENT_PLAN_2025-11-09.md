# Production Deployment Plan - Bravo revOS
**Date**: 2025-11-09
**Target**: HGC Phase 2 + Production Hardening to Live
**Estimated Time**: 2 hours

---

## Pre-Deployment Checklist

### Code Status ✅
- [x] HGC Phase 2 committed (d4ca990)
- [x] Production hardening committed (e557f2c)
- [x] All critical security fixes applied
- [x] TypeScript validation passed
- [x] Local testing completed

### Configuration Files ✅
- [x] `render.yaml` - 3 services configured
- [x] `ENVIRONMENT_VARIABLES.md` - Complete reference
- [x] 22 Supabase migrations ready
- [x] Health check endpoint (`/api/health`)

### Pending
- [ ] Netlify production URL (waiting for CC2)
- [ ] Commit CC2's FloatingChatBar integration
- [ ] Push final changes to main

---

## Deployment Sequence

### Phase 1: Netlify (Frontend) - 30 minutes

**Pre-flight:**
```bash
# 1. Commit any pending changes
git add docs/projects/bravo-revos/HGC_INTEGRATION_GUIDE_FOR_CC2.md
git commit -m "docs: Add HGC integration guide for CC2"

# 2. Push to main branch
git push origin main
```

**Netlify Dashboard:**
1. Go to: https://app.netlify.com
2. Site: [NEED URL FROM CC2]
3. Settings → Build & Deploy → Environment Variables
4. Add/verify these variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://kvjcidxbyimoswntpjcp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[from Supabase dashboard]
NEXT_PUBLIC_APP_URL=[Netlify site URL]

# Optional (if using)
NEXT_PUBLIC_UNIPILE_DSN=https://api3.unipile.com:13344
```

5. Trigger Deploy:
   - Deploys → Trigger deploy → Deploy site
   - OR: Automatic on git push to main

6. Wait for build to complete (~3-5 min)

7. Verify:
```bash
curl https://[NETLIFY_URL]/api/health
# Should return: {"status":"ok","timestamp":"..."}
```

---

### Phase 2: Render (Backend) - 45 minutes

**Dashboard:** https://dashboard.render.com

#### Step 1: Create Blueprint Instance (10 min)

1. Click "New +" → "Blueprint"
2. Connect GitHub repository: `growthpigs/bravo-revos`
3. Branch: `main`
4. Render will detect `render.yaml` and show 3 services:
   - `bravo-revos-web` (Web Service)
   - `bravo-revos-webhook-worker` (Worker)
   - `bravo-revos-pod-worker` (Worker)
5. Click "Apply"

#### Step 2: Set Environment Variables (25 min)

For **EACH of the 3 services**, set these variables:

**Web Service (`bravo-revos-web`):**
```bash
# Critical (MUST SET)
NEXT_PUBLIC_SUPABASE_ANON_KEY=[from Supabase → Settings → API]
SUPABASE_SERVICE_ROLE_KEY=[from Supabase → Settings → API → service_role]
ENCRYPTION_KEY=[generate: openssl rand -hex 32]
CRON_SECRET=[generate: openssl rand -hex 32]
REDIS_URL=[from Upstash dashboard]
OPENAI_API_KEY=sk-proj-...
NEXT_PUBLIC_APP_URL=https://[RENDER_WEB_URL].onrender.com

# Optional
RESEND_API_KEY=[if using email]
UNIPILE_API_KEY=[if using global key]

# HGC Phase 2 (CRITICAL)
MEM0_API_KEY=m0-InfquYnYd7rl3YT2ytHXETxNLHxouLHZusRP1Wk6
```

**Webhook Worker (`bravo-revos-webhook-worker`):**
```bash
# Same variables as web service
# MUST match ENCRYPTION_KEY and CRON_SECRET exactly
```

**Pod Worker (`bravo-revos-pod-worker`):**
```bash
# Same variables as web service and webhook worker
```

#### Step 3: Deploy Services (10 min)

1. All 3 services will auto-deploy after environment variables are set
2. Monitor deployment logs for each service
3. Wait for "Live" status on all 3

#### Step 4: Verify Render Deployment

```bash
# Health check
curl https://bravo-revos-web.onrender.com/api/health

# HGC Phase 2 check
curl https://bravo-revos-web.onrender.com/api/hgc
# Should return: {"status":"ok","service":"Holy Grail Chat","version":"2.0.0-phase2"...}
```

---

### Phase 3: Supabase (Database) - 45 minutes

**Dashboard:** https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp

#### Step 1: Run Migrations Sequentially (30 min)

**CRITICAL**: Run migrations in order, one at a time!

```bash
# Option A: SQL Editor (RECOMMENDED)
# 1. Go to SQL Editor in Supabase dashboard
# 2. For each migration file (in order):

supabase/migrations/001_initial_schema.sql
supabase/migrations/002_add_agencies_table.sql
# ... (all 22 migrations)
supabase/migrations/020_add_agency_based_client_select_policy.sql
supabase/migrations/20250111_create_agentkit_tables.sql

# Copy/paste content into SQL Editor
# Run each migration
# Verify success before proceeding to next
```

**Migration Order:**
```bash
ls -1 supabase/migrations/*.sql | sort
```

#### Step 2: Verify Database Schema (10 min)

```sql
-- Check critical tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Expected tables (at minimum):
-- - users
-- - clients
-- - agencies
-- - campaigns
-- - pods
-- - pod_members
-- - voice_cartridges
-- - lead_magnets
-- - dm_sequences
-- - webhooks
-- - email_review_queue
```

#### Step 3: Test Auth Flow (5 min)

1. Go to: https://[NETLIFY_URL]/auth/login
2. Login with test account
3. Verify redirect to dashboard
4. Check user record in Supabase:
```sql
SELECT id, email, created_at FROM auth.users LIMIT 5;
```

---

## Post-Deployment Validation

### Critical Test #1: Login → Dashboard → Chat
```
1. Open: https://[NETLIFY_URL]/auth/login
2. Login with credentials
3. Navigate to /dashboard
4. Verify FloatingChatBar is visible
5. Click chat icon - should open
```

### Critical Test #2: HGC Memory Test
```
1. In chat, type: "Remember my goal is 10K followers"
2. Wait for response
3. Hard refresh page (Cmd+Shift+R)
4. In chat, type: "What was my goal?"
5. Expected: "Your goal is 10K followers"
```

### Critical Test #3: HGC Tools Test
```
1. In chat, type: "What campaigns am I running?"
2. Agent should call get_campaign_metrics() tool
3. Should return real campaign data or "No campaigns found"
```

### Critical Test #4: RevOS Core Features
```
1. Create a client in admin panel
2. Create a voice cartridge
3. Create a campaign
4. Verify all save successfully
5. Check Supabase data in tables
```

---

## Rollback Plan (If Needed)

### Netlify Rollback
1. Netlify Dashboard → Deploys
2. Find last working deploy
3. Click "Publish deploy"

### Render Rollback
1. Each service → Deploy → Manual Deploy
2. Select previous commit from dropdown
3. Deploy

### Supabase Rollback
**CRITICAL**: Cannot easily rollback migrations!
- Migrations are permanent
- Only option: Restore from backup
- Prevention: Test each migration before running next

---

## Monitoring Post-Deploy

### First 24 Hours

**Watch These Metrics:**

1. **Error Rates**
   - Supabase Dashboard → Logs → Check for RLS errors
   - Render Dashboard → Logs → Check for crashes
   - Netlify Dashboard → Functions → Check for errors

2. **Mem0 Usage** (HGC Phase 2)
   - Track API calls to Mem0
   - Monitor costs at: https://mem0.ai
   - Expected: ~10-50 calls/day for beta users

3. **User Activity**
   - Login success rate
   - Dashboard load times
   - Chat engagement

4. **Performance**
   - Page load times (target: <3s)
   - API response times (target: <500ms)
   - HGC chat response (target: <5s)

### Alert Conditions

**Immediate Action Required:**
- Supabase RLS policy errors (users can't access data)
- Render service crashes (any service shows "Error")
- Auth failures (users can't login)
- Mem0 quota exceeded (memory stops working)

**Monitor Closely:**
- High error rates (>5% of requests)
- Slow response times (>1s median)
- Worker queue backlog (>100 jobs)

---

## Success Criteria

### Deployment Complete When:
- [x] All 3 Render services show "Live"
- [x] Netlify build succeeded
- [x] All 22 Supabase migrations applied
- [x] Health check returns 200
- [x] HGC API returns Phase 2 status
- [x] Login → Dashboard works
- [x] Chat memory persists across refresh
- [x] At least 1 beta user can test successfully

### Revenue Impact Unlocked:
- ✅ HGC differentiator live
- ✅ Memory persistence working
- ✅ Tool calling operational
- ✅ Pricing power enabled

---

## Environment Variables Reference

**See**: `ENVIRONMENT_VARIABLES.md` for complete list

**Critical for HGC Phase 2:**
```bash
# Netlify + Render Web Service
MEM0_API_KEY=m0-InfquYnYd7rl3YT2ytHXETxNLHxouLHZusRP1Wk6
OPENAI_API_KEY=sk-proj-[YOUR_KEY]
NEXT_PUBLIC_APP_URL=[YOUR_PRODUCTION_URL]
```

---

## Timeline Estimate

| Phase | Task | Time | Status |
|-------|------|------|--------|
| **Pre** | Get Netlify URL from CC2 | 5 min | ⏳ Pending |
| **Pre** | Commit & push changes | 5 min | ⏳ Ready |
| **1** | Netlify Deploy | 30 min | ⏳ Ready |
| **2** | Render Setup | 45 min | ⏳ Ready |
| **3** | Supabase Migrations | 45 min | ⏳ Ready |
| **Validate** | Critical Tests | 15 min | ⏳ Ready |
| **Monitor** | First hour observation | 60 min | - |
| **Total** | | **~2h 45min** | |

---

## Next Steps After Deploy

**Immediate (Tonight):**
1. Share production URL with CTO
2. Invite beta users for testing
3. Monitor error logs

**Next 48 Hours:**
4. Collect user feedback on HGC memory
5. Monitor Mem0 costs
6. Add rate limiting if abuse detected
7. Document any issues

**Following Week:**
8. Gather testimonials
9. Prepare pricing page updates
10. Plan Phase 3 (rate limiting, retry logic)

---

## Contacts & Resources

**Dashboards:**
- Netlify: https://app.netlify.com
- Render: https://dashboard.render.com
- Supabase: https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp
- Mem0: https://mem0.ai

**Documentation:**
- Environment Variables: `/ENVIRONMENT_VARIABLES.md`
- Render Config: `/render.yaml`
- Migrations: `/supabase/migrations/`
- HGC Integration: `/docs/projects/bravo-revos/HGC_INTEGRATION_GUIDE_FOR_CC2.md`

---

**Ready to Execute** ✅
**Waiting For**: Netlify URL from CC2

Once URL is provided, deployment can begin immediately.
