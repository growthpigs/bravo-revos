# RevOS - Quick Reference

**Repository:** ~/Obsidian/Master/_projects/bravo-revos/

---

## Load PAI System First

**BEFORE DOING ANYTHING:**
- `~/.claude/CLAUDE.md` (PAI system)
- `./pai-context/CLAUDE.md` (project context - symlinked to PAI-System)

**Project Documentation:** `./pai-context/`
- CLAUDE.md, RUNBOOK.md - Full project context
- features/ - Living feature specifications
- _docs/ - A-F system documents

---

## Tech Stack

- **Frontend:** Next.js 14.2.18 + React 18 + TypeScript
- **UI:** Radix UI + Tailwind CSS + shadcn/ui
- **State:** React hooks + TanStack Table
- **Database:** Supabase (PostgreSQL)
- **AI:** OpenAI AgentKit (@openai/agents) + ChatKit + Vercel AI SDK
- **LinkedIn:** Unipile SDK (unipile-node-sdk)
- **Memory:** Mem0 (mem0ai)
- **Background Jobs:** BullMQ + Redis (ioredis)
- **Deployment:** Vercel
- **Monitoring:** Sentry

---

## Quick Commands

```bash
npm run dev          # Dev server (tsx scripts/dev.ts)
npm run build        # Production build
npm run typecheck    # TypeScript check
npm run lint         # ESLint
npm run test         # Jest tests
npm run workers      # Start background workers
vercel logs          # Check deployment logs
```

---

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `app/` | Next.js App Router pages |
| `components/` | UI components (shadcn) |
| `lib/` | Core business logic |
| `workers/` | BullMQ background workers |
| `scripts/` | Dev/build scripts |
| `__tests__/` | Jest test suites |
| `docs/` | Documentation |

---

## Environment Files

- `.env` - Main environment variables
- `.env.local` - Local overrides
- `.env.vercel` - Vercel-specific config
- `.env.example` - Template

---

## MCP Servers

Project MCP config in `.mcp.json`:
- Archon (enabled in settings.local.json)

---

## In-Project Docs

- `CLAUDE.md` (root) - Development guide
- `ARCHITECTURE.md` - System design
- `DEPLOYMENT.md` - Deployment guide
- `BRANCH_STRATEGY.md` - Git workflow
- `docs/` - Feature documentation

---

**Full docs:** See `~/.claude/context/projects/revos/CLAUDE.md`
