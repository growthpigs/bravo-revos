# Production Credentials - Bravo revOS

**Created:** 2025-11-09
**Status:** Ready for Netlify + Render setup
**Last Updated:** Phase 1 completion

---

## ✅ CREDENTIALS FOUND IN .env.local

These credentials are already available and verified:

```env
# ⚠️ SECURITY WARNING: Do NOT paste real credentials here!
# This is a template. All actual keys should be stored in .env.local (git-ignored)

# Supabase - NEW PROJECT
NEXT_PUBLIC_SUPABASE_URL=https://trdoainmejxanrownbuz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[GET_FROM_SUPABASE_DASHBOARD]
SUPABASE_SERVICE_ROLE_KEY=[GET_FROM_SUPABASE_DASHBOARD]

# Unipile (Real credentials from Brent - bravo-revos project)
UNIPILE_API_KEY=[GET_FROM_UNIPILE_DASHBOARD]
UNIPILE_DSN=https://api3.unipile.com:13344
UNIPILE_MOCK_MODE=false

# OpenAI (for voice generation & HGC)
OPENAI_API_KEY=[GET_FROM_OPENAI_DASHBOARD]

# Mem0 (for HGC persistent memory)
MEM0_API_KEY=[GET_FROM_MEM0_DASHBOARD]
```

**SECURITY NOTE:** All credentials are stored in `.env.local` which is git-ignored. Never commit real API keys to git!

---

## ⚠️ IMPORTANT: Supabase Project Mismatch

**CRITICAL ISSUE FOUND:**
- `.env.local` uses: `trdoainmejxanrownbuz` (NEW project)
- `render.yaml` specifies: `kvjcidxbyimoswntpjcp` (OLD project)

**ACTION REQUIRED:** Confirm which Supabase project is correct
- If NEW project (`trdoainmejxanrownbuz`) is correct: Update render.yaml
- If OLD project (`kvjcidxbyimoswntpjcp`) is correct: Update .env.local

**Recommendation:** Use the NEW project (`trdoainmejxanrownbuz`) since it's in .env.local and explicitly marked as the current one.

---

## 🔐 GENERATED SECURITY TOKENS (PRODUCTION)

**Generated:** 2025-11-09 10:39 UTC

### ENCRYPTION_KEY (32-byte hex)
```
31e77e98af31feda39dea281e40ba0f20cd9080cb675d4e4ec148162bea4b0c9
```
**Purpose:** AES-256-GCM encryption for storing LinkedIn credentials

### CRON_SECRET (32-byte hex)
```
deb323419a6b4a7c1d8f238f8833f5e7f76cc7243cda4eadc0531eb28431d252
```
**Purpose:** Authentication for /api/cron/session-monitor endpoint

---

## 📦 CREDENTIALS NEEDED FOR PRODUCTION

### 1. Redis URL (REQUIRED - MISSING)
**Source:** Upstash Redis Console
**Format:** `rediss://default:password@host:port`
**How to get:**
1. Go to https://upstash.com/console/redis
2. Create free Redis database
3. Copy connection string
4. Format should be: `rediss://default:xxxx@host.upstash.io:6379`

**Current:** Local development only (`redis://localhost:6379`)

### 2. App URL (SET AFTER FIRST DEPLOY)
**Set during Phase 2:** After Netlify deploys, update to actual domain
**Format:** `https://your-domain.com` or `https://yourapp.netlify.app`
**Temporary:** Can start with Render web service URL

---

## 📋 PRODUCTION ENV FILE TEMPLATE

**⚠️ SECURITY WARNING:** Never commit real credentials to documentation!

All credentials are stored in `.env.local` which is git-ignored. Use this as a reference for Netlify/Render setup:

```env
# ===== Supabase Configuration =====
NEXT_PUBLIC_SUPABASE_URL=https://trdoainmejxanrownbuz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[From Supabase dashboard > Settings > API > anon key]
SUPABASE_SERVICE_ROLE_KEY=[From Supabase dashboard > Settings > API > service_role key]

# ===== Security & Encryption =====
ENCRYPTION_KEY=31e77e98af31feda39dea281e40ba0f20cd9080cb675d4e4ec148162bea4b0c9
CRON_SECRET=deb323419a6b4a7c1d8f238f8833f5e7f76cc7243cda4eadc0531eb28431d252

# ===== OpenAI =====
OPENAI_API_KEY=[From OpenAI > Account > API keys]

# ===== Unipile (LinkedIn API) =====
UNIPILE_DSN=https://api3.unipile.com:13344
UNIPILE_API_KEY=[From Unipile dashboard]
UNIPILE_MOCK_MODE=false

# ===== Mem0 (HGC Memory) =====
MEM0_API_KEY=[From Mem0 dashboard]

# ===== Redis / BullMQ =====
REDIS_URL=[From Upstash console - rediss://...]

# ===== Application Configuration =====
NEXT_PUBLIC_APP_URL=https://YOUR_DOMAIN_HERE
NODE_ENV=production
NODE_VERSION=18
```

**👉 Get actual credentials from `.env.local` (not committed to git)**

---

## ✅ Credential Checklist

- [x] NEXT_PUBLIC_SUPABASE_URL - Ready
- [x] NEXT_PUBLIC_SUPABASE_ANON_KEY - Ready
- [x] SUPABASE_SERVICE_ROLE_KEY - Ready
- [x] OPENAI_API_KEY - Ready
- [x] UNIPILE_API_KEY - Ready
- [x] UNIPILE_DSN - Ready
- [x] UNIPILE_MOCK_MODE - Ready
- [x] MEM0_API_KEY - Ready
- [x] ENCRYPTION_KEY - Generated
- [x] CRON_SECRET - Generated
- [ ] REDIS_URL - NEEDED: Get from Upstash (10k free commands/month)
- [ ] NEXT_PUBLIC_APP_URL - To be set after Netlify deployment

---

## 🚀 Next Steps

1. **Confirm Supabase Project:** Which one is correct? (trdoainmejxanrownbuz or kvjcidxbyimoswntpjcp)
2. **Create Upstash Redis:** Get REDIS_URL from https://upstash.com/console/redis
3. **Proceed to Phase 2:** Netlify deployment with these credentials

**Status:** 83% ready (waiting for Redis URL and Supabase confirmation)

