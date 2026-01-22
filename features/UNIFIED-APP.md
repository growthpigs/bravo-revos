# UNIFIED-APP: Same URL, Separate Apps Architecture

**Status:** IN PROGRESS - Phase 3 Complete (RevOS), Ready for Vercel Setup
**Last Updated:** 2026-01-22
**Approach:** Option C - Path-based routing on single domain via monorepo

---

## Overview

Deploy RevOS and AudienceOS to the **same domain** with path-based routing. Apps remain separate codebases but share URL, auth, database, and memory.

```
unified.diiiploy.io/
├── /revos/*        → RevOS (React 19, Next.js 16, Tailwind v4) ✅ UPGRADED
├── /audienceos/*   → AudienceOS (React 19, Next.js 16, Tailwind v4) ✅ READY
└── /               → Landing/router
```

---

## Completed Work (2026-01-22)

### Phase 0: RevOS Upgrades ✅ COMPLETE

All blockers resolved:

| Component | Before | After | Status |
|-----------|--------|-------|--------|
| React | 18.3.1 | 19.2.0 | ✅ |
| Next.js | 14.2.35 | 16.1.4 | ✅ |
| Tailwind | 3.4.18 | 4.1.18 | ✅ |
| @types/react | 18.x | 19.x | ✅ |

**Key migrations:**
- `postcss.config.js` → `postcss.config.mjs` with `@tailwindcss/postcss`
- `globals.css`: `@tailwind` directives → `@import "tailwindcss"` + `@theme inline`
- `next.config.js`: webpack externals → `serverExternalPackages` (Turbopack)
- Removed `tailwind.config.ts` (not needed in v4)
- Disabled gologin routes (incompatible import assertions)

### Phase 1: Monorepo Setup ✅ COMPLETE

RevOS added to existing `hgc-monorepo` (now `pai-unified-platform`):

```
hgc-monorepo/
├── packages/
│   ├── revos/           ✅ React 19, Next.js 16, Tailwind v4
│   ├── audiences-os/    ✅ React 19, Next.js 16, Tailwind v4
│   └── hgc/             ✅ Shared chat library
├── package.json         ✅ Updated with revos scripts
└── package-lock.json    ✅ Workspaces configured
```

**Commits:**
- `ba5d6ca` (revos): Upgrade to React 19, Next.js 16, Tailwind v4
- `b871789` (hgc-monorepo): Add RevOS to unified monorepo

### Phase 2: Vercel Routing Infrastructure ✅ COMPLETE

Configuration for path-based routing:

```
hgc-monorepo/
├── vercel.json          ✅ Rewrites for /revos/* and /audienceos/*
├── public/index.html    ✅ Landing page with app selection
├── packages/
│   ├── revos/next.config.js       ✅ basePath: '/revos' (when UNIFIED_PLATFORM=true)
│   └── audiences-os/next.config.mjs ✅ basePath: '/audienceos' (when UNIFIED_PLATFORM=true)
```

**Key implementation:**
- `basePath` controlled by `UNIFIED_PLATFORM` env var
- Standalone deployments unaffected (basePath empty)
- Unified deployments use path prefixes
- Router vercel.json proxies to internal deployments

**Commits:**
- `d7aacc3` (revos): Add basePath config for unified platform deployment
- `7a8bd8c` (hgc-monorepo): Add unified platform routing infrastructure

### Phase 2.5: basePath Bug Fixes ✅ COMPLETE (Red Team Validated)

Runtime-verified fixes for basePath compatibility:

| File | Bug | Fix | Evidence |
|------|-----|-----|----------|
| `products-services/page.tsx` | `window.location.href = '/auth/login'` | `router.push('/auth/login')` | grep shows 0 remaining |
| `pod-activity/page.tsx` | Same hardcoded redirect (2x) | `router.push('/auth/login')` | Build passes |
| `auth/login/page.tsx` | Callback URL missing basePath | Dynamic detection from pathname | `basePath: "/revos"` in build |

**Red Team Validation (Confidence: 9.5/10):**
- ✅ vercel.json parses as valid JSON
- ✅ Build passes with `UNIFIED_PLATFORM=true` → `basePath: "/revos"`
- ✅ Build passes without env var → `basePath: ""`
- ✅ No hardcoded `/auth/login` redirects remaining
- ✅ Supabase callback URL includes basePath detection

**Commits:**
- `73786f8` (revos): Fix basePath compatibility for unified platform
- `7f2a4cb` (hgc-monorepo): Synced basePath fixes

---

## Why Option C (Monorepo)

| Requirement | Solution |
|-------------|----------|
| Same URL feel | ✅ Single domain, path routing |
| No version conflicts | ✅ All apps now on same versions |
| Shared auth session | ✅ Supabase cookies work across paths (same domain) |
| Shared Mem0 memory | ✅ Same key format: `agencyId::clientId::userId` |
| Shared database | ✅ Both use `ebxshdqfaqupnvpghodi` |
| Fast toggle | ✅ `router.push('/audienceos')` - no re-auth |
| Reduce repos | ✅ Single monorepo instead of 5+ repos |

---

## Remaining Work

### Phase 2: Vercel Deployment Configuration ✅ CODE COMPLETE

1. [x] Configure basePath in both apps
2. [x] Set up path routing in vercel.json
3. [ ] Create Vercel projects in dashboard (manual step)
4. [ ] Configure custom domain: `unified.diiiploy.io` (manual step)
5. [ ] Set `UNIFIED_PLATFORM=true` in Vercel env vars (manual step)

**Next manual steps:**
1. Create 3 Vercel projects from monorepo (router, revos, audienceos)
2. Configure rewrites destinations with actual deployment URLs
3. Add custom domain to router project

### Phase 3: App Toggle Component ✅ COMPLETE (RevOS)

1. [x] Create `stores/app-store.ts` - Zustand store with persist
2. [x] Create `components/app-switcher.tsx` - Dropdown UI
3. [x] Add to dashboard sidebar
4. [ ] Add to AudienceOS sidebar (separate task)
5. [ ] Test navigation between apps (needs Vercel deploy)

### Phase 4: Route Prefixes (Optional)

May not be needed if Vercel rewrites handle routing:
- `/dashboard/*` → `/revos/dashboard/*`
- AudienceOS routes → `/audienceos/*`

### Phase 5: Auth Session Sharing Verification

1. [ ] Configure `cookieOptions.domain` in both Supabase clients
2. [ ] Test auth session persists when switching apps
3. [ ] Verify Mem0 memories accessible from both apps

---

## Validation Checklist

Before deployment:
- [ ] Auth session persists when switching `/revos` ↔ `/audienceos`
- [ ] Mem0 memories accessible from both apps
- [ ] API routes work from both contexts
- [ ] No cookie conflicts
- [ ] Toggle feels instant (< 500ms perceived)

---

## Verified Shared Resources

| Resource | Project ID | Verified |
|----------|------------|----------|
| Supabase | `ebxshdqfaqupnvpghodi` | ✅ 2026-01-22 |
| Mem0 key format | `agencyId::clientId::userId` | ✅ 2026-01-22 |
| Table naming | SINGULAR | ✅ 2026-01-22 |
| React version | 19.2.0 | ✅ 2026-01-22 |
| Next.js version | 16.x | ✅ 2026-01-22 |
| Tailwind version | 4.1.x | ✅ 2026-01-22 |

---

## Monorepo Commands

```bash
# From hgc-monorepo root:
npm run dev:revos       # Start RevOS dev server
npm run dev:aos         # Start AudienceOS dev server
npm run dev:hgc         # Start HGC dev server

npm run build:revos     # Build RevOS
npm run build:aos       # Build AudienceOS
npm run build           # Build all packages

npm run test:revos      # Test RevOS
npm run test:aos        # Test AudienceOS
npm run test            # Test all packages
```

---

## Decision History

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-22 | Option C over Option A | Version blockers made merge costly |
| 2026-01-22 | Option C over Option B | Same-domain feels more unified |
| 2026-01-22 | Upgrade RevOS first | Prerequisite for monorepo |
| 2026-01-22 | Use existing hgc-monorepo | Reduces repos instead of creating new one |

---

**Author:** Chi CTO
**Validated:** Stress-tested with validator agents (2026-01-22)
**Runtime Verification:** `npm ls react next tailwindcss` executed on all repos
