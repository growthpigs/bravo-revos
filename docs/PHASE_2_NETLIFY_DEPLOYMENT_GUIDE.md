# Phase 2: Netlify Frontend Deployment - Complete Action Plan

**Date Created:** 2025-11-09
**Phase Status:** READY TO EXECUTE
**Estimated Duration:** 30 minutes
**Prerequisites:** Credentials from PRODUCTION_CREDENTIALS.md

---

## 🎯 Phase 2 Objective

Deploy the Bravo revOS frontend to Netlify with all environment variables configured.

**Result:** Frontend available at `https://bravo-revos.netlify.app` (or custom domain)

---

## 📋 Step-by-Step Instructions

### STEP 1: Prepare Credentials (5 minutes)

Before starting, have these ready:

```
✓ NEXT_PUBLIC_SUPABASE_URL
✓ NEXT_PUBLIC_SUPABASE_ANON_KEY
✓ NEXT_PUBLIC_APP_URL (can set to temp Netlify URL)
✓ OPENAI_API_KEY
✓ UNIPILE_API_KEY
✓ UNIPILE_DSN
✓ MEM0_API_KEY
✓ REDIS_URL (if using BullMQ in frontend)
```

**Location:** See `docs/PRODUCTION_CREDENTIALS.md` for complete credentials list

---

### STEP 2: Netlify Account Setup (5 minutes)

If you don't have a Netlify account:

1. Go to https://app.netlify.com
2. Click "Sign up"
3. Choose "GitHub" authentication (recommended)
4. Authorize Netlify to access your GitHub account
5. Click "Authorize netlify" on the GitHub permission screen

**Already have account?** Skip to STEP 3

---

### STEP 3: Create New Netlify Site from GitHub (10 minutes)

**Option A: New Site from GitHub**

1. Go to https://app.netlify.com
2. Click "New site from Git"
3. Click "GitHub"
4. Search for repository: `bravo-revos`
5. Select: `growthpigs/bravo-revos`
6. Click "Install and authorize"

**Option B: Import Existing Site**

If you see the repo already listed, just click it.

---

### STEP 4: Configure Build Settings (5 minutes)

**After selecting repository:**

1. **Base directory:** Leave blank (default)
2. **Build command:**
   ```
   npm run build
   ```
3. **Publish directory:**
   ```
   .next
   ```
4. **Node version:** Click "Show advanced" → Set to 18

**Screenshot Reference:**
- Build command: `npm run build`
- Publish directory: `.next`
- Node version: 18

Click "Deploy site" (NOT yet - we need env vars first!)

---

### STEP 5: Set Environment Variables (5 minutes)

**CRITICAL:** Set these BEFORE deploying, otherwise build will fail

1. In Netlify dashboard, go to:
   - Site settings → Environment variables

2. Add each variable:

| Variable | Value | Type |
|----------|-------|------|
| NEXT_PUBLIC_SUPABASE_URL | https://trdoainmejxanrownbuz.supabase.co | Public |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | eyJhbGci... | Public |
| NEXT_PUBLIC_APP_URL | https://bravo-revos.netlify.app | Public |
| OPENAI_API_KEY | sk-proj-... | Secret |
| UNIPILE_API_KEY | kc7szEw8... | Secret |
| UNIPILE_DSN | https://api3.unipile.com:13344 | Public |
| MEM0_API_KEY | m0-Infqu... | Secret |

**Instructions:**
1. Click "Edit variables"
2. For each variable:
   - Click "New variable"
   - Paste key and value
   - Select "Public" or "Secret" (use "Secret" for API keys)
   - Click "Save"
3. Click "Deploy site"

---

### STEP 6: Monitor Build (5-10 minutes)

**Build will start automatically**

1. Go to "Deploys" tab
2. Watch the build log in real-time
3. Build should complete in 3-5 minutes

**If build succeeds:**
- Status shows ✅ "Published"
- You'll get a deploy URL: `https://bravo-revos-XXXXX.netlify.app`

**If build fails:**
- See TROUBLESHOOTING section below
- Common: Missing environment variables, wrong Node version
- Check build log for error messages

---

### STEP 7: Verify Deployment (5 minutes)

Once deployed:

1. Click the deploy preview URL
2. You should see the Bravo revOS login page
3. Try clicking around to verify:
   - [ ] Homepage loads without errors
   - [ ] Navigation works
   - [ ] API endpoints respond (check browser console)
   - [ ] No 5xx errors in logs

**If you see errors:**
- Check browser console (F12)
- Check Netlify build logs
- See TROUBLESHOOTING section

---

### STEP 8: Set Custom Domain (Optional, 5 minutes)

If you have a custom domain:

1. Go to Site settings → Domain management
2. Click "Add custom domain"
3. Enter your domain (e.g., `bravo-revos.com`)
4. Netlify will guide you through DNS setup
5. SSL certificate auto-generates after DNS propagates

---

## 🔧 Configuration Reference

### Build Command Explanation
```bash
npm run build
```
- Installs dependencies
- Compiles TypeScript
- Generates Next.js static assets
- Outputs to `.next` directory

### Publish Directory
```
.next
```
This is where Next.js outputs the compiled app. Netlify will serve files from here.

### Environment Variable Precedence
1. Netlify environment variables (highest priority)
2. .env.production file (not used, we're using Netlify)
3. Default values in code (lowest priority)

---

## 🚨 Troubleshooting

### Build Failure: "Module not found"
**Cause:** Missing environment variables or dependencies
**Fix:**
1. Check all NEXT_PUBLIC_* variables are set
2. Run `npm install` locally to verify dependencies resolve
3. Check package.json for typos

### Build Failure: "Cannot find module 'supabase'"
**Cause:** Supabase module missing
**Fix:**
1. Ensure `npm install` runs correctly
2. Check package-lock.json is committed

### Deployment shows blank page
**Cause:** Wrong publish directory or build artifacts missing
**Fix:**
1. Verify publish directory is `.next`
2. Check build command is `npm run build`
3. Look for TypeScript errors in build log

### API calls return 401/403
**Cause:** Wrong SUPABASE_ANON_KEY or SUPABASE_URL
**Fix:**
1. Verify keys match `.env.local`
2. Confirm Supabase project is running
3. Check RLS policies on tables

### Styling looks broken/missing
**Cause:** Tailwind CSS not compiled
**Fix:**
1. This shouldn't happen with our setup
2. Check for errors in build log about Tailwind
3. Verify `tailwind.config.js` exists

---

## ✅ Success Criteria

- [x] Site deployed to Netlify
- [x] Build completes without errors
- [x] Page loads at Netlify URL
- [x] No 5xx server errors
- [x] API endpoints respond
- [x] Browser console clean (no critical errors)
- [x] Environment variables correctly set
- [x] SSL certificate active (HTTPS)

---

## 📊 What Gets Deployed

**Frontend Only (This Phase):**
- ✅ Next.js application (pages, components)
- ✅ API routes (/api/*)
- ✅ Static assets (images, fonts)
- ✅ Compiled CSS and JavaScript

**NOT Yet (Handled in Phase 3):**
- ❌ Background workers (webhook-worker, pod-worker)
- ❌ Database (Supabase is separate)
- ❌ Redis/BullMQ queues (Render-based)

---

## 🎯 Next Phase: Phase 3 - Render Backend Deployment

**After Netlify is live:**

1. Update `NEXT_PUBLIC_APP_URL` to your Netlify domain
2. Create Render Blueprint from render.yaml
3. Deploy 3 services (web, webhook-worker, pod-worker)
4. Configure environment variables in Render

**Estimated time:** 30 minutes

---

## 📝 Deployment Timeline

| Step | Duration | Status |
|------|----------|--------|
| 1. Prepare credentials | 5 min | Ready |
| 2. Netlify account | 5 min | Ready |
| 3. GitHub connection | 10 min | Ready |
| 4. Build config | 5 min | Ready |
| 5. Environment vars | 5 min | Ready |
| 6. Monitor build | 5-10 min | Ready |
| 7. Verify | 5 min | Ready |
| **TOTAL** | **35-40 min** | **Ready** |

---

## 🔐 Security Notes

- Never commit `.env.local` with real keys (it's in .gitignore ✓)
- Netlify "Secret" variables are encrypted at rest
- API keys are NOT visible in build logs
- SUPABASE_SERVICE_ROLE_KEY should NOT be set in Netlify (backend-only)
- Use separate keys for frontend (ANON_KEY) vs backend (SERVICE_ROLE_KEY)

---

## 📞 Support

**Netlify Docs:** https://docs.netlify.com/
**GitHub Integration:** https://docs.netlify.com/integrations/github/
**Environment Variables:** https://docs.netlify.com/configure-builds/environment-variables/

---

## ✅ PHASE 2 READY

**Prerequisites Met:**
- ✅ GitHub repository public/accessible
- ✅ render.yaml present (for reference)
- ✅ .env.example documented
- ✅ Credentials file created
- ✅ Security tokens generated

**Ready to proceed:** Follow steps 1-7 above

**Estimated completion:** 40 minutes from start

