# Diiiploy OS - Unified Platform Roadmap

**Last Updated:** 2026-01-26
**Project:** Diiiploy OS (AudienceOS + RevOS unified)
**Stakeholders:** Trevor, Brent, Chase @ diiiploy.io

---

## Overview

Merging AudienceOS INTO RevOS codebase to achieve:
- Single login (shared Supabase auth)
- Path-based routing (`/dashboard` = RevOS, `/audienceos` = AudienceOS)
- Unified deployment on Vercel

---

## Phase Summary

| Phase | Focus | DUs | Days | Status |
|-------|-------|-----|------|--------|
| Phase 1 | Codebase Merge | 15 | 5 | ✅ COMPLETE |
| Phase 2 | Unified Platform | 17 | 7 | 🔄 IN PROGRESS |
| Phase 3 | Auth + Memory | 12 | 5 | ⏳ NOT STARTED |
| **TOTAL** | | **44** | **17** | |

---

## Phase 1: Codebase Merge ✅ COMPLETE

**Objective:** Merge AudienceOS code into RevOS without breaking either app.

| # | Task | DUs | Status | Commit |
|---|------|-----|--------|--------|
| 1.1 | Copy database types (2510 lines) | 2 | ✅ | ec67b79 |
| 1.2 | Create Supabase helpers | 2 | ✅ | ec67b79 |
| 1.3 | Copy AudienceOS components (152 files) | 3 | ✅ | 7b7dab3 |
| 1.4 | Copy AudienceOS lib (84 files) | 3 | ✅ | 357d37b |
| 1.5 | Add AudienceOS routes + 81 APIs | 3 | ✅ | 6c081fd |
| 1.6 | Update landing page | 2 | ✅ | 8edc172 |
| | **TOTAL** | **15** | **DONE** | |

**Deliverables:**
- AudienceOS accessible at `/audienceos`
- 81 API routes at `/api/v1/`
- Build passing on Vercel

---

## Phase 2: Unified Platform 🔄 IN PROGRESS

**Objective:** Fix blockers, enable bidirectional navigation, stabilize.

| # | Task | DUs | Status | Notes |
|---|------|-----|--------|-------|
| 2.1 | Fix build failure (OPENAI_API_KEY) | 1 | ⏳ | Dynamic import fix |
| 2.2 | Fix Render worker env vars | 1 | ⏳ | Add REDIS_URL, SUPABASE vars |
| 2.3 | Auth flow manual testing | 2 | ⏳ | Cross-app SSO verify |
| 2.4 | Add AppSwitcher to RevOS | 3 | ⏳ | Bidirectional nav |
| 2.5 | Fix 48 skipped tests | 5 | ⏳ | Supabase mock pattern |
| 2.6 | Address Next.js 16 warnings | 3 | ⏳ | 23 routes async params |
| 2.7 | Consolidate legacy docs | 2 | ⏳ | 15 non-PAI v2 folders |
| | **TOTAL** | **17** | **0/17** | |

**Deliverables:**
- Build passing with all env vars
- Bidirectional navigation working
- Test suite green
- Clean documentation

---

## Phase 3: Auth + Memory ⏳ NOT STARTED

**Objective:** Shared memory system, refined SSO, UI alignment.

| # | Task | DUs | Status | Notes |
|---|------|-----|--------|-------|
| 3.1 | Define memory tagging schema | 2 | ⏳ | `app::domain::topic` |
| 3.2 | Update apps to tag Mem0 writes | 3 | ⏳ | Cross-app context |
| 3.3 | Add cross-app intent detection | 2 | ⏳ | Smart routing |
| 3.4 | UI alignment (LinearSidebar) | 3 | ⏳ | Poppins font, gradients |
| 3.5 | Dark mode support | 2 | ⏳ | Both apps |
| | **TOTAL** | **12** | **0/12** | |

**Deliverables:**
- Shared memory across apps
- Consistent UI/branding
- Dark mode

---

## NOT DOING (Explicitly Descoped)

### Database Merge (20-25 DUs)
**Reason:** Table naming convention mismatch would require rewriting 15+ chips.
**Alternative:** Keep databases separate, share context via Mem0 memory tagging.

---

## Architecture

```
app/
├── page.tsx                    # App selector
├── auth/                       # Shared auth (RevOS)
├── dashboard/                  # RevOS dashboard
├── audienceos/                 # AudienceOS app
└── api/
    ├── [RevOS routes]          # 117 routes
    └── v1/                     # AudienceOS (81 routes)

lib/
├── supabase/                   # Unified client (AudienceOS base)
└── audienceos/                 # AudienceOS-specific

components/
├── ui/                         # Shared shadcn
└── audienceos/                 # AudienceOS-specific
```

---

## Resources

| Resource | Location |
|----------|----------|
| Project Dashboard | [Google Sheet](https://docs.google.com/spreadsheets/d/1VTM1IrqTT1nxncQmPlDbblVqkeMh671belOmWEp3DhE) |
| Vercel | bravo-revos.vercel.app |
| Render Worker | srv-d519ifqli9vc73b002ug |
| Slack Canvas | F0AATP37P1T in #diiiploy-os |
| Feature Doc | `features/UNIFIED-APP.md` |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-26 | Roadmap rewritten for Unified Platform phases |
| 2026-01-22 | Phase 1 complete (codebase merge) |
| 2026-01-03 | Original RevOS roadmap created |
