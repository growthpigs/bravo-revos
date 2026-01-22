# UNIFIED-APP: RevOS + AudienceOS Full Merge

**Status:** ✅ IMPLEMENTATION COMPLETE (Build Passing)
**Last Updated:** 2026-01-22
**Approach:** Option A - Full codebase merge (rewrites/subdomains blocked)
**Branch:** `feat/unified-platform-merge`

---

## Overview

Merging AudienceOS INTO RevOS codebase to achieve true shared authentication. Users log in once and access both apps via path-based routing (`/dashboard/*` for RevOS, `/audienceos/*` for AudienceOS).

**Why Full Merge?**
1. Vercel proxy rewrites do NOT share cookies (cookies set by target domain)
2. Subdomains blocked (diiiploy.io not verified on Vercel)
3. Full merge is the only path to shared Supabase auth cookies

---

## Red Team Findings (This Session)

| Finding | Status | Impact |
|---------|--------|--------|
| @pai/hgc was phantom dependency | FIXED | Removed from monorepo, build succeeds |
| Proxy rewrites don't share cookies | CONFIRMED | Blocked Option B (monorepo proxy) |
| diiiploy.io not on Vercel | CONFIRMED | Blocked Option C (subdomains) |
| AudienceOS: 81 API routes | VERIFIED | Namespaced at `/api/v1/` |
| AudienceOS Supabase: 297 lines | VERIFIED | More sophisticated than RevOS |
| AudienceOS database types: 2510 lines | VERIFIED | RevOS has none |

---

## Research Findings

### Supabase Client Comparison

| Metric | RevOS | AudienceOS | Winner |
|--------|-------|------------|--------|
| Lines | 55 | 297 | AudienceOS |
| Database types | None | 2510 lines | AudienceOS |
| Client variants | 1 (dual-mode) | 5 specialized | AudienceOS |
| Auth helpers | 0 | 3 | AudienceOS |

**Decision:** Use AudienceOS Supabase client. RevOS will import from unified `lib/supabase/`.

### API Routes (NO CONFLICT)

| App | Route Count | Namespace |
|-----|-------------|-----------|
| RevOS | 117 routes | `/api/*` |
| AudienceOS | 81 routes | `/api/v1/*` |

**Decision:** No changes needed. Keep as-is.

### Auth Routes (CONFLICT at /auth/callback)

| Route | RevOS | AudienceOS | Decision |
|-------|-------|------------|----------|
| `/auth/callback` | YES | YES | Keep RevOS version |
| `/auth/login` | YES | NO | Keep |
| `/login` | NO | YES | Delete (use shared auth) |
| `/signup` | NO | YES | Delete (use shared auth) |
| `/auth/debug` | YES | NO | Keep |

### Component Directories

**Overlapping (namespace under audienceos/):**
- `cartridges` - Different implementations
- `chat` - Different implementations
- `dashboard` - Different implementations
- `onboarding` - Different implementations
- `settings` - Different implementations
- `ui` - Shadcn (slight styling differences)

**RevOS-only:** admin, health, layout, modals, navigation, offers, voice

**AudienceOS-only:** automations, communications, integrations, knowledge-base, linear, rbac, views

**Decision:** Move AudienceOS components to `components/audienceos/*`

---

## Target Architecture

```
app/
├── page.tsx                    # App selector (existing)
├── auth/                       # Shared auth (RevOS)
│   ├── login/page.tsx
│   ├── callback/route.ts
│   └── debug/page.tsx
├── dashboard/                  # RevOS dashboard
├── admin/                      # RevOS admin
├── api/                        # RevOS APIs (117 routes)
│   └── v1/                     # AudienceOS APIs (81 routes)
└── audienceos/                 # NEW: AudienceOS app
    ├── layout.tsx
    ├── page.tsx
    ├── clients/
    ├── communications/
    └── [other routes]

components/
├── ui/                         # Shared shadcn (RevOS base)
├── chat/                       # RevOS chat
├── dashboard/                  # RevOS dashboard
└── audienceos/                 # NEW: AudienceOS-specific
    ├── dashboard/
    ├── communications/
    └── [other components]

lib/
├── supabase/                   # Unified (AudienceOS base)
│   ├── client.ts
│   ├── server.ts
│   ├── admin.ts
│   └── helpers.ts
├── chips/                      # RevOS
├── cartridges/                 # RevOS
└── audienceos/                 # NEW: AudienceOS lib

types/
└── database.ts                 # AudienceOS types (2510 lines)
```

---

## Implementation Plan

### Phase 1: Foundation ✅ COMPLETE (Commit: ec67b79)

**Objective:** Upgrade Supabase client without breaking RevOS

- ✅ Copied `types/database.ts` from AudienceOS (2510 lines)
- ✅ Created `lib/supabase/helpers.ts` with auth utilities
- ✅ Build passes

### Phase 2: AudienceOS Components ✅ COMPLETE (Commit: 7b7dab3)

**Objective:** Add AudienceOS components in isolated namespace

- ✅ Created `components/audienceos/` directory
- ✅ Copied 152 component files
- ✅ Updated internal imports
- ✅ Build passes

### Phase 3: AudienceOS Lib ✅ COMPLETE (Commit: 357d37b)

**Objective:** Add AudienceOS lib code

- ✅ Created `lib/audienceos/` directory
- ✅ Copied 84 lib/hooks files
- ✅ Updated imports to use unified Supabase
- ✅ Build passes

### Phase 4: AudienceOS Routes ✅ COMPLETE (Commit: 6c081fd)

**Objective:** Add AudienceOS routes under /audienceos path

- ✅ Created `app/audienceos/` with all routes
- ✅ Copied 81 API routes to `/api/v1/`
- ✅ Created `app/audienceos/layout.tsx`
- ✅ Created `lib/audienceos/supabase.ts` (full client)
- ✅ Added stores, types, utilities
- ✅ Fixed 263 import errors
- ✅ Build passes (242 files, 27036 insertions)

### Phase 5: Landing Page Update ✅ COMPLETE (Commit: 8edc172)

**Objective:** Enable AudienceOS link

- ✅ Changed AudienceOS path from external URL to `/audienceos`
- ✅ Build passes

### Phase 6: Auth Flow Testing 🔄 READY FOR MANUAL TESTING

**Objective:** Verify shared authentication

Test steps (manual):
1. Login via `/auth/login`
2. Navigate to `/dashboard` (RevOS) - should work
3. Navigate to `/audienceos` - should work WITHOUT re-login
4. Refresh - session should persist
5. Logout - both apps should redirect to login

**Architecture verified:**
- ✅ Middleware refreshes Supabase session
- ✅ Same domain = shared cookies
- ✅ AudienceOS `use-auth` hook reads cookies correctly

---

## MoSCoW Prioritization

### Must Have
- [x] Shared Supabase client ✅
- [x] Database types ✅
- [x] AudienceOS routes accessible at /audienceos ✅
- [ ] Auth flow works across both apps (manual test needed)

### Should Have
- [ ] All AudienceOS components
- [ ] All AudienceOS lib code
- [ ] Landing page updated

### Could Have
- [ ] Consolidate duplicate UI components
- [ ] App switcher in header
- [ ] Unified sidebar

### Won't Have (This Sprint)
- [ ] Full design system unification
- [ ] Shared state between apps
- [ ] Combined dashboard

---

## Rollback Plan

If merge fails mid-way:
1. `git checkout main` - return to pre-merge state
2. AudienceOS continues on separate deploy
3. Landing page keeps external URL

---

## Files to Copy

From `/Users/rodericandrews/_PAI/projects/audienceos-unified-platform`:

**Phase 1:**
- `types/database.ts` → `types/database.ts`
- `lib/supabase.ts` → `lib/supabase/` (refactor into folder)

**Phase 2:**
- `components/dashboard/*`
- `components/communications/*`
- `components/views/*`
- `components/linear/*`
- `components/automations/*`
- `components/integrations/*`
- `components/knowledge-base/*`
- `components/rbac/*`

**Phase 3:**
- `lib/` files (stores, hooks, utils)
- `hooks/*`
- `store/*`

**Phase 4:**
- `app/` routes (except `/auth`, `/login`, `/signup`)

---

## Decision History

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-22 AM | Option C (monorepo) | Avoid merge complexity |
| 2026-01-22 PM | Option A (full merge) | Rewrites don't share cookies |
| 2026-01-22 PM | Use AudienceOS Supabase | More sophisticated (297 vs 55 lines) |
| 2026-01-22 PM | Namespace under /audienceos | Clean separation |

---

## Previous Approach (Archived)

The original Option C approach (monorepo with Vercel rewrites) was blocked because:
1. Vercel rewrites proxy requests but cookies are set by TARGET domain
2. diiiploy.io custom domain not verified on Vercel account

See commits in hgc-monorepo for the work done:
- `75ed1cb` - Router rewrites configured
- `9f73b14` - @pai/hgc dependency removed

---

**Author:** Chi CTO
**Created:** 2026-01-22
**Next:** Create feature branch and begin Phase 1
