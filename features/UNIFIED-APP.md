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

## Next Steps

1. [ ] Choose between monorepo vs rewrites approach
2. [ ] Set up Vercel project configuration
3. [ ] Implement AppToggle component in both apps
4. [ ] Update routes with path prefixes
5. [ ] Test auth session sharing
6. [ ] Deploy and verify

---

**Author:** Chi CTO
**Validated:** Stress-tested with validator agents (2026-01-22)
