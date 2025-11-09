# Production Credentials - Bravo revOS

**Created:** 2025-11-09
**Status:** Ready for Netlify + Render setup
**Last Updated:** Phase 1 completion

---

## ✅ CREDENTIALS FOUND IN .env.local

These credentials are already available and verified:

```env
# Supabase - NEW PROJECT
NEXT_PUBLIC_SUPABASE_URL=https://trdoainmejxanrownbuz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZG9haW5tZWp4YW5yb3duYnV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0OTQ5MTUsImV4cCI6MjA3ODA3MDkxNX0.42jDkJvFkrSkHWitgnTTc_58Hq1H378LPdB0u8-aGfI
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZG9haW5tZWp4YW5yb3duYnV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ5NDkxNSwiZXhwIjoyMDc4MDcwOTE1fQ.-_DnyCrCh_UDEuNwGddPL_LFKDYTocICU4L6Tx-G3Do

# Unipile (Real credentials from Brent - bravo-revos project)
UNIPILE_API_KEY=kc7szEw8.FWyZ8rlM+Ael9oMwcn5OaKE5COkpsutMZe/ZSs5RST8=
UNIPILE_DSN=https://api3.unipile.com:13344
UNIPILE_MOCK_MODE=false

# OpenAI (for voice generation & HGC)
OPENAI_API_KEY=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

# Mem0 (for HGC persistent memory)
MEM0_API_KEY=m0-InfquYnYd7rl3YT2ytHXETxNLHxouLHZusRP1Wk6
```

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

## 📋 COMPLETE PRODUCTION ENV FILE

Use this for Netlify and Render environment variables:

```env
# ===== Supabase Configuration =====
NEXT_PUBLIC_SUPABASE_URL=https://trdoainmejxanrownbuz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZG9haW5tZWp4YW5yb3duYnV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0OTQ5MTUsImV4cCI6MjA3ODA3MDkxNX0.42jDkJvFkrSkHWitgnTTc_58Hq1H378LPdB0u8-aGfI
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZG9haW5tZWp4YW5yb3duYnV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ5NDkxNSwiZXhwIjoyMDc4MDcwOTE1fQ.-_DnyCrCh_UDEuNwGddPL_LFKDYTocICU4L6Tx-G3Do

# ===== Security & Encryption =====
ENCRYPTION_KEY=31e77e98af31feda39dea281e40ba0f20cd9080cb675d4e4ec148162bea4b0c9
CRON_SECRET=deb323419a6b4a7c1d8f238f8833f5e7f76cc7243cda4eadc0531eb28431d252

# ===== OpenAI =====
OPENAI_API_KEY=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

# ===== Unipile (LinkedIn API) =====
UNIPILE_DSN=https://api3.unipile.com:13344
UNIPILE_API_KEY=kc7szEw8.FWyZ8rlM+Ael9oMwcn5OaKE5COkpsutMZe/ZSs5RST8=
UNIPILE_MOCK_MODE=false

# ===== Mem0 (HGC Memory) =====
MEM0_API_KEY=m0-InfquYnYd7rl3YT2ytHXETxNLHxouLHZusRP1Wk6

# ===== Redis / BullMQ =====
REDIS_URL=rediss://YOUR_UPSTASH_URL_HERE  # ← REQUIRED: Get from Upstash console

# ===== Application Configuration =====
NEXT_PUBLIC_APP_URL=https://YOUR_DOMAIN_HERE  # ← Set after Netlify deploys
NODE_ENV=production
NODE_VERSION=18
```

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

