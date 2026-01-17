# RevOS (Bravo)

**What:** Marketing automation console with AI-powered LinkedIn content generation and campaign management.
**Stack:** Next.js 14 + Supabase + OpenAI AgentKit + Mem0 + Unipile (LinkedIn)
**Status:** Production (V2 route active)

---

## Quick Context

- Multi-tenant SaaS - serves multiple agencies/clients (NOT single company)
- HGC = Holy Grail Chat = Chat-driven UI orchestration
- Cartridges = Client-specific data (brand, voice, style, core messaging)
- Workflows = Universal patterns stored in database

---

## Key Files

| Need | Location |
|------|----------|
| HGC workflow spec | `docs/HGC_WORKFLOW_SPECIFICATION.md` |
| HGC integration guide | `docs/projects/bravo-revos/HGC_INTEGRATION_GUIDE_FOR_CC2.md` |
| Data model | `docs/projects/bravo-revos/data-model.md` |
| Cartridge spec | `docs/projects/bravo-revos/archon-specs/02-Cartridge-System-Specification.md` |
| Architecture | `ARCHITECTURE.md` |

---

## Commands

```bash
npm run dev        # Start dev server (port 3000)
npm run build      # Production build
npm run lint       # ESLint
```

---

## Architecture

**Active Route:** `/api/hgc-v2` (V3 deprecated)

```
lib/
├── console/
│   ├── workflow-loader.ts    # Load from DB
│   ├── workflow-executor.ts  # Execute steps
│   └── marketing-console.ts  # AgentKit wrapper
├── mem0/                     # Memory integration
└── supabase/                 # DB client

app/api/hgc-v2/route.ts       # Main API (ACTIVE)
```

---

## Non-Negotiables

1. AgentKit SDK only (`@openai/agents`) - NO raw OpenAI
2. Mem0 integration with scope: `agencyId::clientId::userId`
3. Workflows loaded from `console_workflows` table
4. NO hard-coded client content - generate from cartridges

---

## Deployment

| Branch | URL | Access |
|--------|-----|--------|
| main | bravo-revos-git-main-agro-bros.vercel.app | ✅ Push |
| staging | bravo-revos-git-staging-agro-bros.vercel.app | ✅ Push |
| production | bravo-revos.vercel.app | 🔒 PR only |

No localhost testing - OAuth/webhooks require deployed environment.

---

## Project IDs

- Archon: `de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531`
- Supabase: `trdoainmejxanrownbuz`
