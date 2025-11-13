# Bravo revOS - Project Instructions

## HGC ARCHITECTURE NON-NEGOTIABLES (VIOLATIONS = REWRITE)

1. **AgentKit ONLY** - Never use `openai.chat.completions.create()` with manual tools
2. **Mem0 REQUIRED** - Scope: `agencyId::clientId::userId`, persistent memory
3. **Console DB Architecture** - Load with `loadConsolePrompt('marketing-console-v1')`, >50 lines hardcoded = violation, table: `console_prompts`
4. **Session Persistence** - `getOrCreateSession()`, `saveMessages()`, return `sessionId`, tables: `chat_sessions`, `chat_messages`
5. **Supabase RLS** - Backend: service role key, Frontend: anon key, always respect `auth.uid()`
6. **Admin Control** - Table `admin_users` only, never JWT claims, check with `isUserAdmin(userId)`

Hierarchy: LifeOS → 3 Desks (Wealth/Health/Relationships) → Consoles → Cartridges → Chips
RevOS = Marketing Console under Wealth Desk
Full spec: `/docs/HGC_COMPREHENSIVE_SPEC_FINAL.md`

## RevOS Tech Stack

**LinkedIn:** UniPile API ($5.50/account/month), poll every 5 min (NO webhooks), store: `unipile_account_id` + `linkedin_account_id`
**Queue:** BullMQ + Upstash Redis (DM scraper 5min, campaign queue, email extraction, webhooks)
**Voice:** 4-tier hierarchy: request → campaign → user → default
**Health:** Services: AgentKit, Mem0, Console, Database, Supabase, UniPile, Cache, API, System | Admin UI: `/admin/system-health`

## Required MCP Servers (Non-Negotiable)

Playwright (browser automation), Sentry (errors), Supabase (DB), Archon (tasks)
Verify: `mcp list` shows all 4 connected

## Archon-First Task Management (Never TodoWrite)

Workflow: `find_tasks(filter_by="status", filter_value="todo")` → `manage_task(status="doing")` → [Research RAG] → [Code] → `manage_task(status="review")` → [User marks done]

RAG Research: `rag_get_available_sources()` → `rag_search_knowledge_base(query="2-5 keywords", source_id="src_xyz")` → `rag_search_code_examples()`

Status flow: todo → doing → review → done

## Skills Auto-Activation (No Permission Needed)

Ideas phase → `/superpowers-brainstorm`
Planning phase → `/superpowers-write-plan`
Execution phase → `/superpowers-execute-plan`

## Development Workflow

**Branch Strategy:** feat/name → main (dev) → staging (review) → production (live)

**New Feature:**
1. `git checkout -b feat/name`
2. Create `docs/branches/YYYY-MM-DD-name/` (plan.md, sitrep.md, validation.md)
3. Code with regular commits
4. Test: `npm test && npx tsc --noEmit`
5. `git push -u origin feat/name`
6. Upload all .md to Archon: `manage_document('create', project_id='...', ...)`

**Completion Format:** `[BRANCH: feat/name] ✅ [What done] - [Status]`

## SQL Migrations

Every file starts with:
```sql
-- Supabase Project: kvjcidxbyimoswntpjcp
-- Click: https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp/sql/new
-- [Description]
```
Path: `supabase/migrations/YYYYMMDD_description.sql`

## Repository Boundaries

ONLY work in: `/Users/rodericandrews/Obsidian/Master/_projects/bravo-revos/`
NEVER reference `#revOS` or `#` prefix folders (archived)
Create FRESH docs in `docs/projects/bravo-revos/`

## Coding Standards

**Self-Review (Every 3-5 prompts):**
1. Following HGC? (AgentKit, Mem0, Console DB)
2. Console logs with unique prefix? `[DEBUG_FEATURE]`
3. RLS policies checked?
4. Code path tested?
5. Error handling present?

**Quality:** TypeScript strict, error boundaries, Zod validation, AgentKit (no manual), tests for critical paths, comments = "why" not "what"
**Performance:** Minimize bundles, React Server Components, lazy load, debounce inputs, cache computations
**Security:** Never trust client input, validate with Zod, RLS all data, sanitize UGC, no frontend secrets

## Current Architecture

**API:** `/api/hgc-v2` (production, AgentKit), `/api/hgc` (deprecated), `/api/cartridges`, `/api/linkedin/auth`, `/api/health`
**Admin:** `/admin/system-health`, `/admin/orchestration-dashboard`, `/admin/console-config`
**Dashboard:** `/dashboard`, `/dashboard/email-review`, `/dashboard/scheduled`
**Future:** Pod Cartridge (not implemented) - coordination, auto-repost, rewards, browser automation

## Project Info

**Name:** Bravo revOS
**Archon:** de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531
**Supabase:** kvjcidxbyimoswntpjcp
**Branch:** feat/health-system-production-ready
**Deploy:** Backend (Render), Frontend (Netlify), Docker (Render only)
**Links:**
- Dashboard: https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp
- SQL: https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp/sql/new

## Session Start Checklist

1. Verify Archon MCP: `mcp list`
2. Check tasks: `find_tasks(filter_by="status", filter_value="doing")`
3. Review: `git status`
4. Mark 'doing' before code
5. RAG research before implementing
6. Self-review every 3-5 prompts
7. Test before 'review'
8. Upload .md to Archon
9. State branch status on completion

**Before coding:** Read Archon docs, query knowledge base, review patterns, check health if relevant, verify MCPs

Console DB, AgentKit, Mem0, Archon = non-negotiable. Violations = rewrite.
