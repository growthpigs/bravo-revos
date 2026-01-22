# UNIFIED-APP: RevOS + AudienceOS Full Merge

**Status:** Planning → Implementation
**Last Updated:** 2026-01-22
**Approach:** Option A - Full codebase merge (rewrites/subdomains blocked)

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

### Phase 1: Foundation (Build Must Pass)

**Objective:** Upgrade Supabase client without breaking RevOS

1. Copy `types/database.ts` from AudienceOS
2. Create `lib/supabase/helpers.ts` with auth utilities
3. Update `lib/supabase/server.ts` with AudienceOS patterns
4. Update imports in existing files

**Verification:**
```bash
npm run build && npm run typecheck
```

### Phase 2: AudienceOS Components (Build Must Pass)

**Objective:** Add AudienceOS components in isolated namespace

1. Create `components/audienceos/` directory
2. Copy AudienceOS components:
   - `dashboard/` → `components/audienceos/dashboard/`
   - `communications/` → `components/audienceos/communications/`
   - `views/` → `components/audienceos/views/`
   - `linear/` → `components/audienceos/linear/`
   - etc.
3. Update internal imports

**Verification:**
```bash
npm run build && npm run typecheck
```

### Phase 3: AudienceOS Lib (Build Must Pass)

**Objective:** Add AudienceOS lib code

1. Create `lib/audienceos/` directory
2. Copy stores, hooks, utils
3. Update imports to use unified Supabase

**Verification:**
```bash
npm run build && npm run typecheck
```

### Phase 4: AudienceOS Routes (Build Must Pass)

**Objective:** Add AudienceOS routes under /audienceos path

1. Create `app/audienceos/` directory
2. Copy route files from AudienceOS `app/` (except auth)
3. Create `app/audienceos/layout.tsx`
4. Update component imports to `@/components/audienceos/*`
5. Update lib imports to `@/lib/audienceos/*`

**Verification:**
```bash
npm run build && npm run typecheck
```

### Phase 5: Landing Page Update

**Objective:** Enable AudienceOS link

1. Update `app/page.tsx`:
   - Change AudienceOS path from external URL to `/audienceos`
   - Ensure not disabled

**Verification:**
```bash
npm run dev
# Browser: Click AudienceOS → Should navigate to /audienceos
```

### Phase 6: Auth Flow Testing

**Objective:** Verify shared authentication

1. Login via `/auth/login`
2. Navigate to `/dashboard` (RevOS) - should work
3. Navigate to `/audienceos` - should work WITHOUT re-login
4. Refresh - session should persist
5. Logout - both apps should redirect to login

---

## MoSCoW Prioritization

### Must Have
- [ ] Shared Supabase client
- [ ] Database types
- [ ] AudienceOS routes accessible at /audienceos
- [ ] Auth flow works across both apps

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
