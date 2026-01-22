# UNIFIED-APP: Same URL, Separate Apps Architecture

**Status:** PLANNED
**Last Updated:** 2026-01-22
**Approach:** Option C - Path-based routing on single domain

---

## Overview

Deploy RevOS and AudienceOS to the **same domain** with path-based routing. Apps remain separate codebases but share URL, auth, database, and memory.

```
unified.diiiploy.io/
├── /revos/*        → RevOS (React 18, Next.js 14, Tailwind v3)
├── /audienceos/*   → AudienceOS (React 19, Next.js 16, Tailwind v4)
└── /               → Landing/router
```

---

## Why Option C

| Requirement | Solution |
|-------------|----------|
| Same URL feel | ✅ Single domain, path routing |
| No version conflicts | ✅ Apps stay independent |
| Shared auth session | ✅ Supabase cookies work across paths (same domain) |
| Shared Mem0 memory | ✅ Same key format: `agencyId::clientId::userId` |
| Shared database | ✅ Both use `ebxshdqfaqupnvpghodi` |
| Fast toggle | ✅ `router.push('/audienceos')` - no re-auth |
| Effort | ✅ 1-2 days vs 2-3 weeks |

---

## Architecture

### Vercel Deployment Options

**Option C1: Monorepo (Recommended)**
```
unified-platform/
├── apps/
│   ├── revos/          → Existing RevOS codebase
│   └── audienceos/     → Existing AudienceOS codebase
├── packages/
│   └── shared/         → Shared types, utils (future)
├── vercel.json
└── turbo.json
```

**Option C2: Vercel Rewrites**
```json
// vercel.json at domain root
{
  "rewrites": [
    { "source": "/revos/:path*", "destination": "https://bravo-revos.vercel.app/:path*" },
    { "source": "/audienceos/:path*", "destination": "https://v0-audience-os.vercel.app/:path*" }
  ]
}
```

### Auth Session Sharing

Both apps use same Supabase project. Key insight:

```
Domain: unified.diiiploy.io
├── /revos/* → Supabase sets cookie for unified.diiiploy.io
├── /audienceos/* → Same cookie readable here
└── Result: User logged in once, works everywhere
```

**Cookie configuration required:**
- `cookieOptions.domain` must be set to root domain
- Both apps must use identical Supabase client config

---

## Implementation Plan

### Phase 1: Vercel Configuration (Day 1)

1. **Create unified Vercel project** (or use rewrites)
2. **Configure custom domain**: `unified.diiiploy.io` (or similar)
3. **Set up path routing**:
   - `/revos/*` → RevOS build
   - `/audienceos/*` → AudienceOS build
4. **Test auth session persists** across paths

### Phase 2: App Toggle Component (Day 1-2)

Create simple toggle in both app sidebars:

```typescript
// components/AppToggle.tsx
'use client'

import { useRouter, usePathname } from 'next/navigation'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Megaphone, Users } from 'lucide-react'

export function AppToggle() {
  const router = useRouter()
  const pathname = usePathname()

  const activeApp = pathname.startsWith('/audienceos') ? 'audienceos' : 'revos'

  const handleSwitch = (app: string) => {
    if (app === 'revos') {
      router.push('/revos/dashboard')
    } else {
      router.push('/audienceos/dashboard')
    }
  }

  return (
    <ToggleGroup
      type="single"
      value={activeApp}
      onValueChange={handleSwitch}
      className="w-full"
    >
      <ToggleGroupItem value="revos" className="flex-1">
        <Megaphone className="h-4 w-4 mr-2" />
        RevOS
      </ToggleGroupItem>
      <ToggleGroupItem value="audienceos" className="flex-1">
        <Users className="h-4 w-4 mr-2" />
        AudienceOS
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
```

### Phase 3: Route Updates (Day 2)

Update internal routes in both apps:

**RevOS changes:**
- `/dashboard/*` → `/revos/dashboard/*`
- `/admin/*` → `/revos/admin/*`
- `/api/*` → `/revos/api/*` (or keep as-is with rewrites)

**AudienceOS changes:**
- `/*` → `/audienceos/*`
- `/api/v1/*` → `/audienceos/api/v1/*` (or keep as-is with rewrites)

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

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Cookie domain mismatch | Configure `cookieOptions.domain` in both Supabase clients |
| Route conflicts | Use `/revos/*` and `/audienceos/*` prefixes |
| SEO/canonical issues | Set proper canonical URLs per app |
| Deep link breakage | Implement redirects from old URLs |

---

## Decision History

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-22 | Option C over Option A | Version blockers (React 18→19, Tailwind v3→v4) make merge costly |
| 2026-01-22 | Option C over Option B | Same-domain feels more unified than fast-redirect between domains |

---

## 🚨 BLOCKERS IDENTIFIED (Validated 2026-01-22)

**Validation Method:** Runtime verification via `npm ls` commands

### Blocker 1: React Version Mismatch (CRITICAL)
```
RevOS:      React 18.3.1   ← MUST UPGRADE
AudienceOS: React 19.2.0   ← Current
HGC:        React 19.2.3   ← Current
```
**Impact:** React 18 and 19 cannot coexist in same dependency tree.

### Blocker 2: Next.js Version Mismatch (CRITICAL)
```
RevOS:      Next.js 14.2.35  ← 2 MAJOR VERSIONS BEHIND
AudienceOS: Next.js 16.1.3   ← Current
HGC:        Next.js 16.1.1   ← Current
```
**Impact:** Different build systems, middleware changes, App Router API differences.

### Blocker 3: Tailwind Version Mismatch (CRITICAL)
```
RevOS:      Tailwind 3.4.18  ← v3 (JS config: @tailwind directives)
AudienceOS: Tailwind 4.1.18  ← v4 (CSS config: @import "tailwindcss")
HGC:        Tailwind 4.1.18  ← v4 (CSS config)
```
**Impact:** Fundamentally different configuration systems. Cannot share configs.

### RevOS Upgrade Scope Assessment
| Metric | Value | Risk |
|--------|-------|------|
| Total TS/TSX files | 558 | HIGH |
| @types/react | 18.3.12 | Must upgrade |
| Sentry integration | v10.25.0 | Must verify |
| Next.js router usage | 35 files | MEDIUM |

---

## Decision: Prerequisite Upgrade Required

**Confidence Score:** 3/10 → Cannot proceed with monorepo until upgrades complete

### Required Sequence

**Phase 0: RevOS Upgrades (BLOCKING)**
```
1. React 18 → 19
2. @types/react 18 → 19
3. Next.js 14 → 16
4. Tailwind v3 → v4
5. Verify Sentry compatibility
```
**Estimated:** 2-3 weeks dedicated effort

**Phase 1: Monorepo Setup (AFTER Phase 0)**
```
1. Initialize Turborepo
2. Move apps to apps/
3. Configure shared tsconfig
4. Deploy to Vercel
```

---

## Next Steps

1. [x] ~~Choose between monorepo vs rewrites~~ → **MONOREPO** (validated as right architecture)
2. [ ] **PREREQUISITE:** Upgrade RevOS to React 19 + Next.js 16 + Tailwind v4
3. [ ] Set up Vercel project configuration
4. [ ] Implement AppToggle component in both apps
5. [ ] Update routes with path prefixes
6. [ ] Test auth session sharing
7. [ ] Deploy and verify

---

**Author:** Chi CTO
**Validated:** Stress-tested with validator agents (2026-01-22)
**Runtime Verification:** `npm ls react next tailwindcss` executed on all repos
