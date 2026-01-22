# UNIFIED-APP: Same URL, Separate Apps Architecture

**Status:** IN PROGRESS - Prerequisites Complete
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

### Phase 2: Vercel Deployment Configuration

1. [ ] Configure Vercel for monorepo deployment
2. [ ] Set up path routing in vercel.json
3. [ ] Configure custom domain: `unified.diiiploy.io`
4. [ ] Test builds for all packages

### Phase 3: App Toggle Component

1. [ ] Create `AppToggle.tsx` component
2. [ ] Add to both app sidebars
3. [ ] Test navigation between apps

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
