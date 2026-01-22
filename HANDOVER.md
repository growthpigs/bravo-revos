# RevOS - Session Handover

**Last Updated:** 2026-01-22
**Branch:** main
**Session:** Vercel Deployment + Unified Platform Setup

---

## Current State: PRODUCTION DEPLOYED

RevOS now shares the same Supabase database as AudienceOS and is deployed to Vercel under the unified "Diiiploy Platform" workspace.

| Item | Value |
|------|-------|
| **Production URL** | https://ra-diiiploy.vercel.app |
| **Vercel Team** | Diiiploy Platform (`diiiploy-platform`) |
| **Vercel Project** | `ra-diiiploy` |
| **Dashboard** | https://vercel.com/diiiploy-platform/ra-diiiploy |
| **Database** | `ebxshdqfaqupnvpghodi` (AudienceOS Supabase - unified) |
| **Table Convention** | SINGULAR (user, client, agency, campaign) |
| **Legacy URL** | `ra-revos.vercel.app` (still works, backward compat) |

---

## What Was Done (2026-01-22)

### 1. Vercel Deployment Fixed

**Build Errors Resolved:**
- `ENOENT: no such file or directory, stat '.env'` - Fixed by tracking empty `.env` in git
- Disabled `instrumentationHook` experimental feature (caused Next.js stat errors)
- Added missing production environment variables (Supabase credentials)

**Files Modified:**
| File | Change |
|------|--------|
| `next.config.js` | Disabled instrumentationHook |
| `.gitignore` | Changed to allow tracking `.env` |
| `.env` | Created empty tracked file |

### 2. Vercel Workspace Renamed

| Setting | Before | After |
|---------|--------|-------|
| Team Name | `rodericandrews-4022's projects` | `Diiiploy Platform` |
| Team URL | `vercel.com/rodericandrews-4022s-projects` | `vercel.com/diiiploy-platform` |
| Project Name | `ra-revos` | `ra-diiiploy` |
| Production URL | `ra-revos.vercel.app` | `ra-diiiploy.vercel.app` |

### 3. Domain Configuration

Both domains now point to production:
- `ra-diiiploy.vercel.app` (primary)
- `ra-revos.vercel.app` (legacy alias)

### 4. Known Issues Documented

**LinkedIn Integration UX:**
- Slow login (5+ seconds delay)
- Immediate redirect to LinkedIn connect after login (should be contextual)
- LinkedIn OAuth callback not completing properly

---

## What's Next: Unified Platform Architecture

### Approved Architecture

**Path-based routing on single domain:**
```
app.diiiploy.io/
├── /revos/*        → RevOS
├── /audienceos/*   → AudienceOS
└── /               → Landing/router
```

### Implementation Options

| Option | Description | Status |
|--------|-------------|--------|
| **C1: Monorepo** | Both apps in `apps/` with Turborepo | Recommended |
| **C2: Rewrites** | Vercel rewrites to separate deployments | Simpler |

### Next Steps

1. [ ] Choose monorepo vs rewrites approach
2. [ ] Set up custom domain `app.diiiploy.io`
3. [ ] Configure Vercel routing
4. [ ] Implement AppToggle component in both apps
5. [ ] Test auth session sharing (same domain = shared cookies)

**Full implementation plan:** `features/UNIFIED-APP.md`

---

## Branch Status

| Branch | Purpose | Status |
|--------|---------|--------|
| main | Primary development | ✅ Clean |
| staging | Staging deploys | ⚠️ Access lost (agro-bros) |
| production | Production deploys | 🔒 Trevor's only |

---

## Deploy Commands

```bash
# Production deploy (new unified project)
vercel --prod --scope diiiploy-platform --yes

# Check deployment status
vercel ls --scope diiiploy-platform
```

---

## Related Projects

| Project | Supabase | Vercel | Notes |
|---------|----------|--------|-------|
| **AudienceOS** | `ebxshdqfaqupnvpghodi` | TBD | PRIMARY database |
| **RevOS** | Same as above | `ra-diiiploy` | Unified platform |
| **Trevor's RevOS** | Same as above | `bravo-revos.vercel.app` | Separate (agro-bros) |

---

## Key Files

| Purpose | Location |
|---------|----------|
| Unified platform spec | `features/UNIFIED-APP.md` |
| Database merge spec | `features/DATABASE-MERGE.md` |
| Deployment guide | `DEPLOYMENT.md` |
| Project context | `CLAUDE.md` |

---

**Handover Author:** Chi CTO
**Session Date:** 2026-01-22
**Verification:** Production URL returns HTTP 200
