# DiiiployOS (RevOS + AudienceOS)

**Location:** `~/_PAI/projects/diiiploy/diiiploy-os/`
**Formerly:** `revos/` → `diiiploy-os/unified/`

Multi-tenant SaaS combining:
- **RevOS:** AI-powered LinkedIn content generation and campaign management
- **AudienceOS:** Client management & operations dashboard

Chat-driven UI orchestration (HGC), not a chatbot.

---

## Startup Sequence (DO THIS FIRST)

1. **Verify you're on correct branch:** `git branch --show-current`
2. **Check health:** `curl http://localhost:3000/api/health` or production URL
3. **Understand the hierarchy:** Agency → Client → User (all data is tenant-scoped)
4. **Know the active API:** `/api/hgc-v2` (V3 is deprecated, ignore it)

---

## Key Files

| Need | Location |
|------|----------|
| Feature plans | `docs/05-planning/[feature]/PLAN.md` |
| Planning roadmap | `docs/05-planning/ROADMAP.md` |
| **Dashboard** | [DiiiployOS Project Dashboard](https://docs.google.com/spreadsheets/d/1igBWxG0IbFyWrwaJ9nMNwpuX2pw5Na0q37ue_CHR9YY) |
| **Dashboard ID** | `1igBWxG0IbFyWrwaJ9nMNwpuX2pw5Na0q37ue_CHR9YY` |

---

## Absolute Rules (Non-Negotiable)

| Rule | Enforcement |
|------|-------------|
| **AgentKit SDK ONLY** | NO `openai.chat.completions.create()` - use `@openai/agents` |
| **Cartridge context ALWAYS** | Load brand/style/voice BEFORE generating content |
| **Mem0 3-tier scoping** | Format: `agencyId::clientId::userId` |
| **Workflows from DB** | Load via `console_workflows` table, never hardcode |
| **RLS enforcement** | Backend: service role key / Frontend: anon key |
| **Session persistence** | Always return `sessionId` from HGC responses |
| **No hardcoded prompts** | >50 lines → move to `console_prompts` table |

**Violations require rewrite.** Health check at `/api/health` verifies compliance.

---

## Core Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ USER INTERFACE (Next.js App Router)                             │
│ ├── app/dashboard/   → Main user dashboards                     │
│ ├── app/admin/       → Admin panels                             │
│ ├── app/api/hgc-v2/  → ACTIVE chat API (HGC = Holy Grail Chat)  │
│ └── components/chat/ → FloatingChatBar.tsx (main chat UI)       │
├─────────────────────────────────────────────────────────────────┤
│ BUSINESS LOGIC (lib/)                                           │
│ ├── chips/           → Modular AI skills (write, dm, lead...)   │
│ ├── cartridges/      → Client context (brand, voice, style)     │
│ ├── console/         → Workflow engine (loader, executor)       │
│ ├── mem0/            → Persistent memory integration            │
│ └── orchestration/   → UI navigation + response building        │
├─────────────────────────────────────────────────────────────────┤
│ BACKGROUND JOBS (workers/)                                      │
│ ├── dm-worker.ts           → DM queue processing                │
│ ├── pod-automation-worker  → Pod engagement                     │
│ └── webhook-delivery-worker → Webhook retries                   │
├─────────────────────────────────────────────────────────────────┤
│ DATA LAYER (Supabase)                                           │
│ ├── agencies, clients, users  → Multi-tenant hierarchy          │
│ ├── brand_cartridges, style_cartridges → Client context         │
│ ├── console_workflows         → Workflow definitions (JSON)     │
│ └── hgc_sessions, hgc_messages → Chat persistence               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Concepts

### HGC (Holy Grail Chat)
Chat-driven UI orchestration. NOT a chatbot. Every user utterance:
1. Triggers intent detection
2. Loads cartridge context
3. Executes action (may navigate UI, fill forms)
4. Returns inline response with optional buttons

### Chips
Modular AI capabilities. Each chip is a reusable skill:
- `write-chip` → Generate LinkedIn posts
- `dm-chip` → Direct message automation
- `lead-chip` → Lead capture/enrichment
- `campaign-chip` → Campaign management

All chips extend `BaseChip` in `lib/chips/base-chip.ts`.

### Cartridges
Client-specific context loaded BEFORE every response:
- **Brand Cartridge:** `core_messaging`, `industry`, `target_audience`
- **Style Cartridge:** `tone_of_voice`, `writing_style`, `personality_traits`
- **Voice Cartridge:** 4-tier cascade (request → campaign → user → default)

---

## Before You Write New Code

1. **Read existing patterns first:**
   - For chips: `lib/chips/base-chip.ts` + any existing chip
   - For API routes: `app/api/hgc-v2/route.ts`
   - For cartridges: `lib/cartridges/retrieval.ts`

2. **Check if chip exists:** Don't duplicate - extend or modify existing chips

3. **Use correct imports:**
   ```typescript
   // CORRECT
   import { Agent } from '@openai/agents'
   import { createClient } from '@/lib/supabase/server'

   // WRONG
   import OpenAI from 'openai' // NO direct OpenAI client
   ```

---

## Before You Generate AI Content

1. **Load cartridges:**
   ```typescript
   const brand = await loadCartridge('brand', { clientId, userId })
   const style = await loadCartridge('style', { clientId, userId })
   const voice = await loadCartridge('voice', { userId, campaignId })
   ```

2. **Use AgentKit, not raw OpenAI:**
   ```typescript
   // CORRECT
   const agent = new Agent({ name: 'hgc', model: 'gpt-4o' })
   const response = await agent.run(userMessage, { context })

   // WRONG
   const response = await openai.chat.completions.create({ ... })
   ```

3. **Route through voice cartridge:** ALL content must pass through user's voice settings

---

## Before You Debug

1. **Check health endpoint first:** `GET /api/health`
2. **Check Vercel logs:** `vercel logs --follow`
3. **Verify AgentKit version:** Should be `@openai/agents@0.3.0` (extraction depends on this)
4. **Check extraction errors:** Look for `[MarketingConsole] ❌ EXTRACTION FAILED`

If AgentKit response structure changed:
- Check `lib/console/marketing-console.ts` → `extractResponseText()`
- Verify `result.output[i].content[j].text` path still works

---

## Before You Deploy

1. **Run tests:** `npm test`
2. **Run typecheck:** `npm run typecheck`
3. **Run lint:** `npm run lint`
4. **Build succeeds:** `npm run build`
5. **Health check passes on staging**

---

## Commands

```bash
# Development
npm run dev           # Start dev server (uses tsx, port 3000)
npm run dev:clean     # Clear .next + start fresh

# Quality
npm run test          # Jest tests (75+ test files)
npm run test:coverage # With coverage report
npm run typecheck     # TypeScript check
npm run lint          # ESLint

# Production
npm run build         # Next.js build
npm run start         # Start production server

# Workers (background jobs)
npm run workers       # Start all BullMQ workers
npm run worker:webhook # Webhook delivery only
```

---

## Quick Reference

### Key Files

| Need | File |
|------|------|
| Main chat API | `app/api/hgc-v2/route.ts` |
| AgentKit wrapper | `lib/console/marketing-console.ts` |
| Workflow execution | `lib/console/workflow-executor.ts` |
| Workflow loading | `lib/console/workflow-loader.ts` |
| Cartridge retrieval | `lib/cartridges/retrieval.ts` |
| Base chip class | `lib/chips/base-chip.ts` |
| Mem0 integration | `lib/mem0/memory.ts` |
| Health endpoint | `app/api/health/route.ts` |
| Chat UI | `components/chat/FloatingChatBar.tsx` |

### Database Tables

| Table | Purpose |
|-------|---------|
| `agencies` | Top-level tenants |
| `clients` | Business accounts under agencies |
| `users` | Individual users under clients |
| `brand_cartridges` | Client brand data |
| `style_cartridges` | Style/voice settings |
| `console_workflows` | Workflow definitions (JSON) |
| `hgc_sessions` | Chat sessions |
| `hgc_messages` | Chat message history |
| `campaigns` | Lead generation campaigns |
| `leads` | Captured lead data |
| `pods` | Engagement pod groups |

### Environment Variables (Required)

```bash
OPENAI_API_KEY=           # For AgentKit
NEXT_PUBLIC_SUPABASE_URL= # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY= # Frontend Supabase key
SUPABASE_SERVICE_ROLE_KEY=     # Backend Supabase key (RLS bypass)
MEM0_API_KEY=             # Mem0 persistent memory (optional)
CRON_SECRET=              # Vercel cron authentication
```

---

## Deployment

| Branch | URL | Push Access |
|--------|-----|-------------|
| `main` | bravo-revos-git-main-agro-bros.vercel.app | Direct push |
| `staging` | bravo-revos-git-staging-agro-bros.vercel.app | Direct push |
| `production` | bravo-revos.vercel.app | PR only |

**No localhost testing** for OAuth/webhooks - they require deployed environment.

---

## Testing

- **Test location:** `__tests__/`
- **Framework:** Jest + ts-jest + @testing-library/react
- **Run all:** `npm test`
- **Watch mode:** `npm run test:watch`
- **Coverage:** `npm run test:coverage`

75+ test files covering:
- API routes (`__tests__/api/`)
- Chips and business logic (`__tests__/lib/`)
- Components (`__tests__/components/`)
- Security (`__tests__/security/`)
- E2E flows (`__tests__/e2e/`)

---

## Known Issues & Patterns

### AgentKit Response Extraction
AgentKit `@openai/agents@0.3.0` response structure:
```typescript
result.output[i].role === 'assistant'
result.output[i].content[j].type === 'text'
result.output[i].content[j].text // ← Response text here
```
If this path changes, extraction breaks. Check `extractResponseText()` method.

### Cartridge Loading
Always load cartridges BEFORE content generation. The pattern:
```typescript
const context = {
  brand: await loadCartridge('brand', { clientId, userId }),
  style: await loadCartridge('style', { clientId, userId }),
}
// Then generate with context
```

### Multi-Tenant RLS
- Backend API routes: Use `createClient()` with service role (bypasses RLS)
- Frontend/middleware: Use anon key (RLS enforced)
- Never expose service role key to frontend

---

## Project IDs

| Service | ID |
|---------|-----|
| Archon | `de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531` |
| Supabase | `trdoainmejxanrownbuz` |

---

## Documentation

| Doc | Location |
|-----|----------|
| Architecture | `ARCHITECTURE.md` |
| HGC Workflow Spec | `docs/HGC_WORKFLOW_SPECIFICATION.md` |
| Data Model | `docs/projects/bravo-revos/data-model.md` |
| Cartridge Spec | `docs/projects/bravo-revos/archon-specs/02-Cartridge-System-Specification.md` |
| Technical Architecture | `docs/projects/bravo-revos/archon-specs/01-RevOS-Technical-Architecture-v3.md` |

---

**Stack:** Next.js 14 + TypeScript + Supabase + @openai/agents + Mem0 + Unipile + BullMQ
**Status:** Production (V2 route active)
**Last Updated:** 2026-01-20
