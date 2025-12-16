# Bravo revOS - Project Instructions

## MANDATORY SESSION START PROTOCOL

**YOU MUST DO THIS BEFORE ANYTHING ELSE:**

1. **Read these files (actually use Read tool):**
   - `~/.claude/CLAUDE.md` (PAI system rules)
   - `~/.claude/context/tools/CLAUDE.md` (MCP tools)
   - `~/.claude/context/projects/revos/CLAUDE.md` (project context)
   - `~/.claude/context/systems/error-patterns.md` (mistakes to avoid)

2. **Run health checks:**
   ```bash
   git branch --show-current
   git log -1 --format='%h %s'
   ```

3. **Output this EXACT compliance proof:**
   ```
   ## PAI System Loaded

   **Identity:** Chi - Personal AI Infrastructure
   **Project:** RevOS (bravo-revos)

   ### Files Read (with Read tool):
   **Global:**
   - [] ~/.claude/CLAUDE.md
   - [] ~/.claude/context/tools/CLAUDE.md
   - [] ~/.claude/context/systems/error-patterns.md

   **Project:**
   - [] ~/.claude/context/projects/revos/CLAUDE.md
   - [] This file (bravo-revos/CLAUDE.md)

   ### Environment:
   - Branch: [from git]
   - Last commit: [from git]

   ---
   **Ready to work.** What would you like to do?
   ```

**FAILURE TO OUTPUT COMPLIANCE PROOF = PROTOCOL VIOLATION**

---

## 🚨 LOAD PAI SYSTEM FIRST 🚨

**Key files to read:**
- `~/.claude/CLAUDE.md` (PAI system)
- `~/.claude/context/projects/revos/CLAUDE.md` (project context)
- `~/.claude/context/systems/error-patterns.md` (error patterns)

This loads the PAI system + RevOS context.

---

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

**After completing any proposal, plan, SITREP, or deployment, ALWAYS provide:**

- **MCPs Used:** List all MCP servers accessed (e.g., Archon, Sentry, Supabase)
- **Current Branch:** Branch you're working on (e.g., `staging`, `feat/feature-name`)
- **Repository:** `growthpigs/bravo-revos`
- **Last Commit:** Short hash and message
- **Deployed To:** Which environments were updated (staging, production, both, or none)
- **Status:** What's deployed where

**Example:**
```
MCPs Used: Archon, Supabase
Current Branch: staging
Repo: growthpigs/bravo-revos
Last Commit: 6aca0b7 - fix: Hardcode LinkedIn profile URL for recent activity link

DEPLOYMENT STATUS:
✅ Staging: https://bravo-revos-git-staging-agro-bros.vercel.app (6aca0b7)
✅ Production: https://bravo-revos.vercel.app (6aca0b7)
📝 Note: Both environments updated with LinkedIn posting fixes
```

**CRITICAL:** Always provide deployment status so user knows exactly what's deployed where.

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

## CURRENT WORKING STATE (2025-11-22)

**ACTIVE ROUTE: V2** (`/api/hgc-v2`)
- Frontend uses: `NEXT_PUBLIC_HGC_VERSION=v2` in .env and Vercel env vars
- Status: ✅ **PRODUCTION READY** - Full AgentKit architecture, tested and working
- Architecture: AgentKit SDK ✅ + Mem0 ✅ + Database workflows ✅
- Features: Write workflow functional, preserves context across decisions
- Latest Fix: Workflow context preservation (commit 34e21a4, 2025-11-24)

**V3 STATUS (DEPRECATED):**
- Route file: `/app/api/hgc-v3/route.ts` (exists but unused)
- Status: ❌ **DEPRECATED** - Raw OpenAI implementation, technical debt
- Architecture: Raw OpenAI SDK ❌ + No Mem0 ❌ + Hardcoded workflows ❌
- **DO NOT USE** - V2 is the production route

**V2 Infrastructure (ACTIVE AND TESTED):**
- `/lib/console/workflow-loader.ts` - Load workflows from database (250 lines) ✅
- `/lib/console/workflow-executor.ts` - Execute workflow steps (300+ lines) ✅
- `/lib/console/marketing-console.ts` - AgentKit wrapper (670+ lines) ✅
- `/lib/mem0/client.ts`, `/lib/mem0/memory.ts` - Mem0 integration ✅
- `/app/api/hgc-v2/route.ts` - Main API route (500+ lines) ✅

**V2 PRODUCTION STATUS:**
1. ✅ Database tables exist and populated
2. ✅ Workflow configuration loaded from DB
3. ✅ Mem0 API configured and working
4. ✅ Route active and handling requests
5. ✅ Tested and debugged (commit 34e21a4)
6. ✅ `NEXT_PUBLIC_HGC_VERSION=v2` locked in

**CURRENT ROUTE CONFIGURATION:**
```bash
# In .env and Vercel env vars:
NEXT_PUBLIC_HGC_VERSION=v2     # ✅ ACTIVE - Full architecture compliance
# ⚠️ DO NOT CHANGE BACK TO V3 - V2 is production route
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

**⚠️ V3 currently violates these rules - V2 was built to comply but is disabled**

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
Deploy: Vercel (frontend), Render (backend + workers)

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

## Deployment Strategy (Updated 2025-11-25)

**🚨 CRITICAL: THREE-TIER BRANCH STRATEGY - NO LOCALHOST TESTING**

### Current Workflow (AS OF 2025-11-25)

**ACTIVE BRANCHES:**
- **main** - Development environment (active, unrestricted pushes)
- **staging** - Code review/testing environment (active, unrestricted pushes)
- **production** - Live/production environment (🔒 LOCKED - PR-only)

### Environment URLs

1. **Main (Active Development)** - `https://bravo-revos-git-main-agro-bros.vercel.app`
   - **Branch:** `main`
   - **Use For:** Primary development, feature testing
   - **Deploy:** Auto-deploys when you push to main
   - **Push Access:** ✅ Unrestricted
   - **Works:** EVERYTHING ✅ - OAuth ✅, Webhooks ✅, LinkedIn ✅, All integrations ✅

2. **Staging (Code Review/Testing)** - `https://bravo-revos-git-staging-agro-bros.vercel.app`
   - **Branch:** `staging`
   - **Use For:** Pre-production validation, team review
   - **Deploy:** Auto-deploys when you push to staging
   - **Push Access:** ✅ Unrestricted
   - **Workflow:** Merge from main when ready for review

3. **Production (Live/LOCKED)** - `https://bravo-revos.vercel.app`
   - **Branch:** `production`
   - **Use For:** Live production serving real users
   - **Deploy:** Auto-deploys via GitHub PR approval only
   - **Push Access:** 🔒 **LOCKED** - GitHub branch protection enabled
   - **Workflow:** PR from staging after approval only

### Why No Localhost?

Localhost cannot test:
- ❌ OAuth (requires public HTTPS callback)
- ❌ Webhooks (can't reach localhost)
- ❌ LinkedIn account connection
- ❌ Any external API callbacks

**Solution:** Always test on deployed `main` environment where everything works.

### Standard Workflow (Follow This)

```bash
# 1. Development on main
git checkout main
git add .
git commit -m "feat: your feature"
git push origin main
# Vercel auto-deploys to main: https://bravo-revos-git-main-agro-bros.vercel.app

# 2. Code review on staging (when ready)
git checkout staging
git merge main
git push origin staging
# Vercel auto-deploys to staging: https://bravo-revos-git-staging-agro-bros.vercel.app
# Team reviews and validates

# 3. Production deployment (PR-only - DO NOT PUSH DIRECTLY)
# Create PR from staging → production on GitHub
# After PR approval, GitHub auto-deploys to production
# 🔒 production branch is LOCKED - direct pushes will fail
```

### Post-Deploy Verification Checklist

**MANDATORY after every production deploy:**

```bash
# 1. Hard refresh the production URL (Cmd+Shift+R or Ctrl+Shift+R)
open https://bravo-revos.vercel.app

# 2. Check build info next to logo (top-left of TopBar)
#    Expected: commit hash matches your push, timestamp within 5 minutes

# 3. Verify in browser DevTools Network tab:
#    - Fetch /build-info.json
#    - Confirm "environment": "production"
#    - Confirm "commit": "<your-commit-hash>"

# 4. Test critical path (if applicable):
#    - Login works
#    - Dashboard loads
#    - Chat responds
```

**If build info is stale:**
1. Check Vercel dashboard for deployment status
2. Verify `prebuild` script ran (check build logs for `[BUILD_INFO]`)
3. Clear browser cache and CDN cache if needed
4. If still stale, trigger manual redeploy in Vercel

### Important Notes

- **No localhost** - Can't test OAuth, webhooks, or LinkedIn integration
- **main + staging** - Active development and review environments
- **production** - 🔒 LOCKED via GitHub branch protection (PR-only)
- **Test on deployed environments** - Full environment with all integrations working
- **Always verify build info** - Check commit hash and timestamp after every deploy

### Emergency Rollback

**For main or staging:**
```bash
# Find last good commit
git log --oneline -5

# Rollback branch
git checkout main  # or staging
git reset --hard <good-commit-hash>
git push origin main --force  # or staging

# Vercel auto-deploys reverted version
```

**For production (LOCKED):**
```bash
# 1. Create emergency revert branch from last good production commit
git checkout production
git pull origin production
git log --oneline -5  # Find last good commit
git checkout -b emergency/revert-to-<commit-hash>
git reset --hard <good-commit-hash>
git push origin emergency/revert-to-<commit-hash>

# 2. Create PR on GitHub: emergency/revert-to-<commit-hash> → production
# 3. Get emergency approval and merge PR
# 4. GitHub auto-deploys reverted version to production

# NOTE: Cannot force push to production - it is GitHub protected
```

### Why Localhost is Limited

**What DOESN'T work on localhost:**
- ❌ LinkedIn OAuth (requires public HTTPS callback)
- ❌ Unipile webhooks (can't reach localhost)
- ❌ ESP webhooks (ConvertKit, Mailchimp, etc.)
- ❌ LinkedIn account connection
- ❌ Any external API callbacks

**What DOES work on localhost:**
- ✅ UI changes, styling, layout
- ✅ Chat interface (messages, responses)
- ✅ Content generation (AI/GPT calls)
- ✅ Database queries (Supabase remote)
- ✅ Mock mode (`UNIPILE_MOCK_MODE=true`)

**Bottom Line:** Use staging as your primary test environment, not localhost.

### SQL Migrations

Path: `supabase/migrations/YYYYMMDD_description.sql`

Always start with:
```sql
-- Supabase Project: trdoainmejxanrownbuz
-- Click: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new
```

### Documentation for Features

Create: `docs/features/YYYY-MM-DD-name/`
- `001-spec.md` - What & why
- `002-plan.md` - Tasks, timeline
- `003-sitrep-DATE.md` - Progress updates
- `999-final.md` - What shipped, learnings

Upload all .md to Archon: `manage_document()`

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

MUST HAVE: Sentry, Supabase, Playwright
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

**2025-11-22: ⚠️ CLAUDE.MD CORRECTED - V2 STATUS CLARIFIED**
- **V2 is DISABLED** - Route file has `.disabled` extension, not active
- **V3 is ACTIVE** - Working but non-compliant (raw OpenAI, no Mem0)
- **V2 Code Exists** - 2000+ lines of infrastructure built but untested
- **Workload to Enable V2** - Estimated 8-14 hours to debug and activate
- **CLAUDE.md was incorrect** - Previously claimed V2 was "100% compliant" and "active"

**2025-11-16: V2 INFRASTRUCTURE CREATED (but disabled)**
- Created workflow loader + executor (`workflow-loader.ts`, `workflow-executor.ts`)
- Created MarketingConsole with AgentKit integration
- Created Mem0 client and memory integration
- Route disabled due to runtime errors - v3 created as workaround
- **NOTE**: Code was written but never successfully tested end-to-end

**Files Created (exist but untested):**
- `/lib/console/workflow-loader.ts` (250 lines)
- `/lib/console/workflow-executor.ts` (300+ lines)
- `/lib/console/marketing-console.ts` (670+ lines)
- `/app/api/hgc-v2/route.ts.disabled` (485 lines)

**V2 Architecture (exists in code, not proven working):**
1. AgentKit SDK (`@openai/agents`) - Installed, used in MarketingConsole
2. Mem0 integration - Client exists, scoping defined
3. Console DB - Loader exists, prompts table needed
4. Workflow JSON - Loader/executor exist, workflows table needed
5. Session persistence - Code exists
6. Health monitors - Implemented

**2025-11-15:**
- ~~Switched to V3 route~~ (REVERSED - V3 suspended)
- V3 attempted shortcuts that violated architecture
- Learned lesson: Technical debt accumulates fast

**2025-01-15:**
- Initial V2 implementation with AgentKit + Cartridge architecture
- Mem0 integration for persistent memory
- Console DB for prompt management

---

VERSION: 2.2.0 (V3 Active - V2 Code Complete but Disabled)
LAST UPDATED: 2025-11-22 13:45
STATUS: ⚠️ V3 Working but Non-Compliant - V2 Needs 8-14h to Enable

ARCHITECTURE: V3 uses raw OpenAI (non-compliant) | V2 has AgentKit+Mem0 but is disabled
