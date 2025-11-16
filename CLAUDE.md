# Bravo revOS - Project Instructions

## 🚨 CRITICAL DIRECTIVE - STOP V3 WORK IMMEDIATELY 🚨

**New Directive Acknowledged ✅**

**STOP all v3 work immediately.**

**TODAY'S GOAL:**
- ✅ AgentKit SDK integration (working)
- ✅ Mem0 memory (working)
- ✅ Workflow JSON as source of truth (working)
- ✅ Multi-tenant tested: Doctor + Coach industries
- ✅ Full "LinkedIn DM Pod" workflow end-to-end

**NO MORE:**
- ❌ "We'll migrate later"
- ❌ Raw OpenAI shortcuts
- ❌ Hard-coded anything
- ❌ Technical debt excuses

**V3 route is SUSPENDED. All work must use V2 with proper AgentKit architecture.**

---

## Session Reporting Requirements

**After completing any proposal, plan, or SITREP, always provide:**

- **MCPs Used:** List all MCP servers accessed (e.g., Archon, Sentry, Supabase)
- **Feature Branch:** Current branch name (e.g., `feat/v2-agentkit-architecture`)
- **Repository:** `growthpigs/bravo-revos`
- **Last Commit:** Short hash and message

**Example:**
```
MCPs Used: Archon, Supabase
Branch: feat/v2-agentkit-architecture
Repo: growthpigs/bravo-revos
Last Commit: 308d6de - docs: suspend V3, enforce AgentKit architecture
```

---

## Quick Start (Test Write Workflow)

```bash
# 1. Verify dev server running
npm run dev  # Should start on port 3000

# 2. Open browser
open http://localhost:3000/dashboard

# 3. In chat, type: write
# Expected: Brand context loaded message + topic buttons

# 4. Click any topic button
# Expected:
#   - Chat shows: "✅ LinkedIn post generated in working document"
#   - Working document area opens with generated post
#   - Post can be edited, copied, or saved

# 5. Check logs for debugging
# Look for [HGC_V3] prefix in terminal
```

## Write Workflow (Correct UX)

**User Journey:**
1. User types "write" → System loads brand cartridge
2. Chat shows: "📋 **Brand Context Loaded** - Industry: [X], Target: [Y]" + topic buttons
3. User clicks topic → System generates post using brand/style data
4. Chat shows: "✅ LinkedIn post generated in working document"
5. Post appears in **Working Document area** (dashed border panel)
6. User can edit, copy, or attach to campaign later

**Critical Rules:**
- ❌ NO campaign selection during write flow (campaigns are attached later)
- ❌ Generated content NEVER appears in chat
- ✅ Working Document = Content output (like Microsoft Word)
- ✅ Chat = Navigation, confirmations, buttons only

## CURRENT WORKING STATE (2025-11-16)

**ACTIVE ROUTE: V2** (`/api/hgc-v2`)
- Frontend uses: `NEXT_PUBLIC_HGC_VERSION=v2` in `.env.local`
- Status: ✅ **100% COMPLIANT** - All NON-NEGOTIABLES implemented
- Architecture: AgentKit SDK ✅ + Mem0 ✅ + Workflow JSON ✅ + Console DB ✅
- Features: Complete HGC workflow with proper multi-tenant support

**V2 COMPLETION UPDATE (2025-11-16):**
- ✅ AgentKit SDK integration complete (`@openai/agents`)
- ✅ Mem0 memory layer working (`agencyId::clientId::userId` scope)
- ✅ Console DB loading system prompts (`loadConsolePrompt`)
- ✅ **Workflow JSON refactoring complete** - 110 lines of hardcoded logic removed
- ✅ Database-driven workflow execution (`console_workflows` table)
- ✅ Session persistence to database
- ✅ Health monitors with multi-source verification

**Files Created:**
- `/lib/console/workflow-loader.ts` - Load workflows from database
- `/lib/console/workflow-executor.ts` - Execute workflow steps
- `/supabase/migrations/20251116_create_console_workflows.sql` - Workflow table

**SUSPENDED ROUTES:**
- V3 (`/api/hgc-v3`) - **SUSPENDED** - Violated architecture (raw OpenAI, hardcoded workflows)
- Legacy (`/api/hgc`) - Old implementation

**HOW TO SWITCH ROUTES:**
```bash
# In .env.local:
NEXT_PUBLIC_HGC_VERSION=v2     # ✅ ACTIVE - 100% compliant architecture
NEXT_PUBLIC_HGC_VERSION=v3     # ❌ SUSPENDED - Violated architecture
NEXT_PUBLIC_HGC_VERSION=legacy # 🗑️ Old implementation
```

## CRITICAL ARCHITECTURE PRINCIPLES

**🚨 MULTI-TENANT & STATE AGNOSTIC:**
- This system serves MULTIPLE clients/agencies, NOT a single company
- "AI Big Pivot" is EXAMPLE DATA - not the actual system
- ALL content (topics, posts, messaging) generated FROM client's brand cartridge data
- NO hard-coded industry assumptions, topics, or messaging patterns
- State agnostic - no dependencies on specific client configurations

**Jon Benson Core Messaging Integration:**
- Clients should have 112-point core messaging in their brand cartridge
- System uses AI to analyze core messaging and generate personalized topics/content
- Flexible approach - if client has different structure, system adapts
- Simulation of Jon Benson's world-class copywriting methodology (Ethical Persuasion™)
- AI agent decides best approach based on client data, NOT hard-coded rules

## NON-NEGOTIABLES (MANDATORY - NO EXCEPTIONS)

**⚠️ V3 SUSPENDED - These rules are NOW ENFORCED (2025-11-16)**

1. **AgentKit SDK ONLY** (`@openai/agents`) - NO raw `openai.chat.completions.create()`
2. **Mem0 integration** - scope: `agencyId::clientId::userId` - MUST be working
3. **Console DB** - load via `loadConsolePrompt('marketing-console-v1')` - NO hardcoded prompts
4. **Workflow JSON** - load from `console_workflows` table - NO hardcoded workflow logic
5. **Session persistence** - save all conversations to DB
6. **Health monitors** - multi-source verification, no mocked data
6. RLS - backend: service role key, frontend: anon key, always respect `auth.uid()`
7. Admin control - `admin_users` table only, never JWT claims, use `isUserAdmin(userId)`
8. **🚨 NO HARD-CODING** - NEVER hard-code client-specific content in code

**Rule #8 Details:**

**VIOLATIONS:**
- ❌ Hard-coded topics: `["AI insights", "Innovation"]`
- ❌ Hard-coded buttons: `{ label: "Start Campaign" }`
- ❌ Client-specific logic: `if (industry === 'coaching') { ... }`
- ❌ Generic fallbacks that don't use client data

**CORRECT APPROACH:**
- ✅ Generate dynamically from cartridges (brand, style, voice, core_messaging)
- ✅ Use AI to analyze client data and create personalized content
- ✅ Store workflow patterns in JSON (for AgentKit migration)
- ✅ Client data lives in database, NOT in code

**ARCHITECTURE:**
- **Cartridges** = Client-specific data (industry, audience, core messaging, examples)
- **Workflows** = Universal patterns (how to generate topics, create content)

## Required Documentation & Research

**BEFORE implementing ANY AgentKit or Mem0 feature, research latest documentation.**

### OpenAI AgentKit SDK

**Official Docs (ALWAYS CHECK FIRST):**
- Platform Docs: `https://platform.openai.com/docs/guides/agents`
- Agents SDK: `https://platform.openai.com/docs/guides/agents-sdk`
- Python SDK: `https://openai.github.io/openai-agents-python/`
- Agent Builder: `https://platform.openai.com/agent-builder`

**Installation:**
```bash
npm install @openai/agents
# or
pip install openai-agents
```

**Core Concepts:**
- **Agents**: LLMs with instructions, tools, and context
- **Handoffs**: Delegation between specialized agents
- **Sessions**: Conversation history and state
- **Guardrails**: Input/output validation
- **Tools**: Functions agents can call

**Key Patterns:**
- Multi-agent workflows with handoffs
- Session-based conversation management
- Tool calling with structured outputs
- Guardrails for safety/validation

### Mem0 AI Memory

**Official Docs:**
- Main Site: `https://mem0.ai`
- Documentation: `https://docs.mem0.ai`
- API Reference: `https://docs.mem0.ai/api-reference`

**Memory Scopes (CRITICAL for Multi-Tenant):**
```javascript
// Correct multi-tenant scope
const memoryScope = {
  agency_id: user.agency_id,
  client_id: user.client_id,
  user_id: user.id
}

// Mem0 API call
await mem0.add({
  messages: conversationHistory,
  user_id: `${agency_id}::${client_id}::${user_id}`, // Hierarchical scope
  metadata: { workflow: 'linkedin_post', industry: brandData.industry }
})
```

**Use Cases:**
- Remember user preferences across sessions
- Store conversation context
- Personalize agent responses
- Track workflow state

### Research Protocol

**When implementing features:**
1. WebSearch: `"[Technology] [Feature] documentation 2025"`
2. Check official docs (links above)
3. Verify syntax hasn't changed
4. Test with simple example first
5. Document findings in code comments
- **Code** = Workflow executor (loads cartridges, runs AI, returns results)

BEFORE coding: Read HGC spec, check current working route
AFTER coding: Test with active route, run health check

## Core Workflows

**HGC = Chat-Driven UI Orchestration**

User says "campaign" → HGC navigates to `/dashboard/campaigns`
User says "write" → HGC loads brand/style cartridges → generates personalized topic suggestions → shows inline buttons in chat

ALL interactions query cartridges for context (brand, voice, style).
Chat shows inline buttons. Working Document shows ONLY content output (no buttons, no questions).

**Hierarchy:** LifeOS → Desks (Wealth/Health/Relationships) → Consoles → Cartridges → Chips
RevOS = Marketing Console under Wealth Desk

## Tech Stack

Frontend: Next.js 14 App Router, TypeScript, Tailwind, shadcn/ui
Backend: Next.js API routes
Database: Supabase PostgreSQL + RLS
Queue: BullMQ + Upstash Redis
AI: OpenAI AgentKit (`@openai/agents`), GPT-4o
Memory: Mem0 Cloud + PGVector
LinkedIn: Unipile API ($5.50/account/mo), NO comment webhooks (poll every 5min)
Deploy: Netlify (frontend), Render (backend + workers)

## Project Info

Archon: de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531
Supabase: trdoainmejxanrownbuz
Branch: main
Links:
- Supabase: https://supabase.com/dashboard/project/trdoainmejxanrownbuz
- SQL Editor: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new
- Archon: https://statesman-ai.netlify.app/projects/de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531

## Essential Docs

Core:
- HGC Workflow: `/docs/HGC_WORKFLOW_SPECIFICATION.md` (READ THIS FIRST)
- HGC Architecture: `/docs/HGC_COMPREHENSIVE_SPEC_CORRECTED.md`
- RevOS Features: `/docs/projects/bravo-revos/spec.md`
- Data Model: `/docs/projects/bravo-revos/data-model.md`
- FSD: `/docs/projects/bravo-revos/archon-specs/08-Functional-Specification-Document.md`

Architecture:
- `/docs/projects/bravo-revos/archon-specs/01-RevOS-Technical-Architecture-v3.md`
- `/docs/projects/bravo-revos/archon-specs/02-Cartridge-System-Specification.md`

## Development Workflow

Branch: `feat/name → main (dev) → staging (review) → production (live)`

New Feature:
1. `git checkout -b feat/name`
2. Create `docs/features/YYYY-MM-DD-name/` (001-spec.md, 002-plan.md, 003-sitrep-DATE.md, 999-final.md)
3. Code + commit
4. Test: `npm test && npx tsc --noEmit`
5. Push: `git push -u origin feat/name`
6. Upload all .md to Archon via `manage_document()`

SQL migrations start with:
```sql
-- Supabase Project: trdoainmejxanrownbuz
-- Click: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new
```

Path: `supabase/migrations/YYYYMMDD_description.sql`

## Coding Standards

TypeScript strict, no `any`
Zod validation for all API inputs
AgentKit only (never manual OpenAI calls)
Comments = "why" not "what"
Console logs: unique prefix `[DEBUG_FEATURE]`
RLS all data access
Secrets in env only

Performance: minimize bundles, Server Components, debounce inputs, cache responses
Security: never trust client, validate everything, sanitize UGC

## API Routes

**Chat/HGC:**
- ✅ **ACTIVE:** `/api/hgc-v3` - Pragmatic implementation (raw OpenAI, working now)
- ⏸️ **DEPRECATED:** `/api/hgc-v2` - Full AgentKit architecture (has 404 issues, debug Phase 2)
- 🗑️ **LEGACY:** `/api/hgc` - Original implementation

**Other Routes:**
- Cartridges: `/api/cartridges/*`
- LinkedIn: `/api/linkedin/auth`
- Health: `/api/health`

**Frontend Pages:**
- Admin: `/admin/system-health`, `/admin/orchestration-dashboard`, `/admin/console-config`
- Dashboard: `/dashboard`, `/dashboard/campaigns`, `/dashboard/leads`, `/dashboard/email-review`

**V3 Implementation Details:**
- File: `/app/api/hgc-v3/route.ts`
- Auth: Supabase (required for all requests)
- Features:
  1. "write" command → Returns personalized topic suggestions from brand_cartridges
  2. Topic selection → Generates LinkedIn post with brand/style context
  3. Returns generated post content
- Technical debt: Uses `openai.chat.completions.create()` directly (not AgentKit)
- Migration plan: Phase 2 will refactor to use MarketingConsole + AgentKit SDK

## Required MCP Servers

Verify: `claude mcp list`

MUST HAVE: Sentry, Supabase, Playwright, Netlify
Optional: Context7, Archon

## Session Start Checklist

1. Verify Archon MCP: `claude mcp list`
2. Check tasks: `find_tasks(filter_by="status", filter_value="doing")`
3. Review: `git status`
4. Mark doing: `manage_task(status="doing")`
5. Use superpowers: `/superpowers-brainstorm`, `/superpowers-write-plan`, `/superpowers-execute-plan`
6. RAG + WebSearch for latest docs (training data outdated)
7. Explore: `Task(subagent_type='Explore')` or `Task(subagent_type='codebase-analyst')`
8. Self-review every 3-5 prompts
9. Test: `npm test && npx tsc --noEmit`
10. Upload all .md to Archon immediately
11. Mark review: `manage_task(status="review")` (never mark done)

## Scope Management

User mentions 5+ features → acknowledge ALL → ask which ONE to focus on → document others in `/docs/features/future-ideas.md`

NEVER start coding without research. Training data is January 2025 (outdated).

Research flow:
1. Superpowers skills (`/superpowers-brainstorm`, `/superpowers-write-plan`)
2. WebSearch for external APIs/frameworks: "[Tech] [feature] documentation 2025"
3. Task tool: `Task(subagent_type='Explore', prompt='Find similar code')`
4. Read related files
5. Code with full context

Always WebSearch before using: External APIs (Unipile, Mem0, Supabase, AgentKit), frameworks (Next.js, React), MCP specs, security patterns

## Feature Documentation

Every feature: `docs/features/YYYY-MM-DD-name/`

Files:
- `001-spec.md` - what & why (write FIRST)
- `002-plan.md` - tasks, timeline (write SECOND)
- `003-sitrep-DATE.md` - progress (multiple files)
- `005-validation.md` - test results (before PR)
- `999-final.md` - what shipped, learnings (LAST)

Branch name = folder name
Upload ALL .md to Archon immediately after creation

## Archon Workflow

NEVER use TodoWrite for project tasks - ALWAYS use Archon MCP

```
find_tasks() → manage_task(status='doing') → [RAG] → [Code] → manage_task(status='review') → [User marks done]
```

RAG: `rag_get_available_sources()` → `rag_search_knowledge_base(query="2-5 keywords", source_id="src_xyz")`

Status flow: todo → doing → review → done (NEVER mark done yourself)

## Repository Boundaries

ONLY work in: `/Users/rodericandrews/Obsidian/Master/_projects/bravo-revos/`
NEVER reference: `#revOS` or `#` prefix folders (archived)
Create docs in: `docs/projects/bravo-revos/` or `docs/features/YYYY-MM-DD-name/`

---

## Changelog

**2025-11-16: ✅ V2 WORKFLOW JSON REFACTORING COMPLETE**
- **Achieved 100% NON-NEGOTIABLE compliance** - All 8 rules now enforced
- **Removed 110 lines of hardcoded workflow logic** from V2 route handler
- **Created workflow loader + executor** (`workflow-loader.ts`, `workflow-executor.ts`)
- **Database-driven workflows** - All logic now loads from `console_workflows` table
- **Tested TypeScript compilation** - No errors in refactored code
- **Frontend switched to V2** - ENV updated to use compliant route
- **Time to complete:** ~2 hours (as estimated in plan)

**Files Created:**
- `/lib/console/workflow-loader.ts` (239 lines)
- `/lib/console/workflow-executor.ts` (300+ lines)
- `/supabase/migrations/20251116_create_console_workflows.sql`
- `/docs/plans/2025-11-16-v2-workflow-json-refactoring.md`
- `/docs/plans/2025-11-16-pod-amplification-implementation.md`
- `/docs/plans/2025-11-16-pod-amplification-design.md`

**Architecture Validation:**
1. ✅ AgentKit SDK ONLY (`@openai/agents`) - No raw OpenAI calls
2. ✅ Mem0 integration - scope: `agencyId::clientId::userId`
3. ✅ Console DB - load via `loadConsolePrompt('marketing-console-v1')`
4. ✅ **Workflow JSON** - load from `console_workflows` table ← **COMPLETED TODAY**
5. ✅ Session persistence - save all conversations to DB
6. ✅ Health monitors - multi-source verification
7. ✅ RLS - backend: service role, frontend: anon key
8. ✅ Admin control - `admin_users` table only

**Earlier Today (2025-11-16):**
- **V3 SUSPENDED** - Violated core architecture principles (raw OpenAI, hardcoded workflows)
- **V2 RE-ACTIVATED** - Committed to proper AgentKit + Mem0 + Workflow JSON architecture
- NO MORE technical debt excuses - enforcing NON-NEGOTIABLES immediately

**2025-11-15:**
- ~~Switched to V3 route~~ (REVERSED - V3 suspended)
- V3 attempted shortcuts that violated architecture
- Learned lesson: Technical debt accumulates fast

**2025-01-15:**
- Initial V2 implementation with AgentKit + Cartridge architecture
- Mem0 integration for persistent memory
- Console DB for prompt management

---

VERSION: 2.1.0 (V2 Active - 100% Architecture Compliant)
LAST UPDATED: 2025-11-16 17:30
STATUS: ✅ Complete - V2 Workflow JSON Refactoring Done

ARCHITECTURE: AgentKit SDK + Mem0 + Workflow JSON from DB + Console DB (ALL NON-NEGOTIABLES ✅)
