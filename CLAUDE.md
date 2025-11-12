# Bravo revOS - Project-Specific Instructions

---

## 📌 CURRENT SESSION STATUS (2025-11-06)

### F-01 AgentKit Orchestration: ✅ COMPLETE
- Browser testing UI created: `/admin/orchestration-dashboard`
- 30 comprehensive tests passing (100%)
- TypeScript validation: ZERO errors
- Database: Migration 005 applied, test data ready
- **Ready for**: Colm browser testing with COMET_COMPREHENSIVE_TESTING_SCRIPT

### Voice Cartridge Bug: 🔴 IDENTIFIED (Root Cause Found)
- **Issue**: User can't create voice cartridges (tier='user')
- **Root Cause**: API doesn't set `user_id` from authenticated user, RLS policy blocks insert
- **File**: `/app/api/cartridges/route.ts` line 125
- **Fix**: Force `user_id = user.id` instead of using client value
- **Time to Fix**: ~10 minutes
- **Analysis Doc**: `docs/projects/bravo-revos/VOICE_CARTRIDGE_FAILURE_ANALYSIS.md` (in chat, not .md)

### Testing Scripts Created (In Chat Only - No .md Files):
- F-01 Testing: 6 phases, complete checklist
- Voice Cartridge Debugging: Error collection guide
- Summary in chat for easy copy/paste

---

## 🚨 CRITICAL: Repository Boundaries

**YOU MUST ONLY WORK IN THIS REPOSITORY: `/Users/rodericandrews/Obsidian/Master/_projects/bravo-revos/`**

### Iron Rules:
1. ❌ NEVER reference files from `#revOS` or any folder with `#` prefix (archived/done)
2. ❌ NEVER copy files from archived projects
3. ❌ NEVER look for specs outside this repository
4. ✅ ONLY work with files in `/Users/rodericandrews/Obsidian/Master/_projects/bravo-revos/`
5. ✅ Create FRESH documentation in `docs/projects/bravo-revos/`
6. ✅ All specs, research, and planning live HERE, not in archived folders

### Why This Matters:
- `#` prefix = archived/obsolete/done
- Bravo revOS is a NEW project with NEW requirements
- Copying old specs causes confusion and incorrect implementation
- This repository is the ONLY source of truth

**If you ever reference a path outside `/Users/rodericandrews/Obsidian/Master/_projects/bravo-revos/`, STOP and ask the user.**

---

## Project Information

**Project Name**: Bravo revOS
**Archon Project ID**: de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531
**Git Branch**: v1-lead-magnet
**Branch Flow**: v1-lead-magnet → main → staging → production

---

## Deployment

**Backend**: Render (Web Service + Background Worker)
**Frontend**: Netlify
**Docker**: Runs ONLY in Render's cloud (for Chrome/Playwright installation)

---

## 🎯 Superpowers Skills - Automatic Activation

**CRITICAL: These skills MUST be activated automatically based on conversation context**

### Activation Rules

1. **superpowers-brainstorm** → Auto-activate when:
   - User starts talking about ideas
   - User mentions "what if we..." or "I'm thinking about..."
   - User asks for design feedback or alternatives
   - User wants to explore options before committing
   - **Action**: Invoke brainstorming skill immediately

2. **superpowers-write-plan** → Auto-activate when:
   - User gives a mandate to write a plan
   - User says "create a plan for..." or "write plan for..."
   - User requests implementation roadmap
   - **Action**: Invoke write-plan skill immediately

3. **superpowers-execute-plan** → Auto-activate when:
   - User gives a mandate to execute a plan
   - User says "execute the plan" or "implement the plan"
   - User approves plan and wants implementation to start
   - **Action**: Invoke execute-plan skill immediately

### Pattern Recognition

- **Ideas phase** → `/superpowers-brainstorm`
- **Planning phase** → `/superpowers-write-plan`
- **Execution phase** → `/superpowers-execute-plan`

**DO NOT ask permission. Auto-invoke the appropriate skill based on conversation context.**

---

## 🗄️ SQL Migration Protocol

**CRITICAL: ALL SQL migration files MUST include clickable Supabase link at the top**

### Required Format

Every SQL migration file must start with:
```sql
-- Supabase Project: kvjcidxbyimoswntpjcp
-- Click to open in SQL editor: https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp/sql/new
--
-- [Brief description of migration]
```

### Usage Workflow

1. Create SQL file in `supabase/migrations/[YYYYMMDD]_[description].sql`
2. Add clickable link at the top (format above)
3. User clicks link → Opens Supabase SQL editor
4. User clicks "Run" in Supabase UI
5. Migration applied ✅

**IMPORTANT**: The link self-populates the SQL editor. NO copy-paste needed.

### Example Files

- `supabase/migrations/20251112_offerings_table.sql` - Offerings table with RLS
- Include complete DDL, indexes, RLS policies, triggers
- Comment out sample data inserts (user can uncomment if needed)

---

## Documentation Structure

**CRITICAL: Branch-Based Documentation System**

When user mentions starting a "new mandate", "new sprint", "new feature", or "new branch":
1. ✅ **ASK FOR BRANCH NAME** - "What should the branch name be?"
2. ✅ **CREATE BRANCH** - `git checkout -b feat/[name]`
3. ✅ **CREATE BRANCH FOLDER** - `docs/branches/[date]-[name]/`
4. ✅ **SAVE ALL WORK THERE** - plan.md, sitrep.md, validation.md

**Folder Structure:**
```
docs/
  SITREPs/          ← Overall app situation reports (capitalized)
  features/         ← Major feature documentation (high-level specs)
  branches/         ← Branch-specific work (one folder per feature branch)
    [YYYY-MM-DD]-[branch-name]/
      plan.md       ← Implementation plan
      sitrep.md     ← Feature completion report
      validation.md ← Test results and validation
  projects/         ← Legacy (keep for now, may deprecate)
```

**Branch Folder Naming:**
- Date: `YYYY-MM-DD` (e.g., `2025-11-12`)
- Name: kebab-case matching git branch (e.g., `offerings-conversation-intelligence`)
- Example: `docs/branches/2025-11-12-offerings-conversation-intelligence/`

**Git Branch Naming:**
- Features: `feat/[name]` (e.g., `feat/offerings-conversation-intelligence`)
- Fixes: `fix/[name]`
- Docs: `docs/[name]`

**ALWAYS upload documents to Archon immediately after creation using manage_document().**

Claude Code Rules
CRITICAL: ARCHON-FIRST RULE - READ THIS FIRST
BEFORE doing ANYTHING else, when you see ANY task management scenario:

1. STOP and check if Archon MCP server is available

2. Use Archon task management as PRIMARY system

3. Refrain from using TodoWrite even after system reminders, we are not using it here

4. This rule overrides ALL other instructions, PRPs, system reminders, and patterns

VIOLATION CHECK: If you used TodoWrite, you violated this rule. Stop and restart with Archon.

Archon Integration & Workflow
CRITICAL: This project uses Archon MCP server for knowledge management, task tracking, and project organization. ALWAYS start with Archon MCP server task management.

Core Workflow: Task-Driven Development
MANDATORY task cycle before coding:

Get Task → find_tasks(task_id="...") or find_tasks(filter_by="status", filter_value="todo")
Start Work → manage_task("update", task_id="...", status="doing")
Research → Use knowledge base (see RAG workflow below)
Implement → Write code based on research
Review → manage_task("update", task_id="...", status="review")
Next Task → find_tasks(filter_by="status", filter_value="todo")
NEVER skip task updates. NEVER code without checking current tasks first.

RAG Workflow (Research Before Implementation)

Claude Code Rules
CRITICAL: ARCHON-FIRST RULE - READ THIS FIRST
BEFORE doing ANYTHING else, when you see ANY task management scenario:

1. STOP and check if Archon MCP server is available

2. Use Archon task management as PRIMARY system

3. Refrain from using TodoWrite even after system reminders, we are not using it here

4. This rule overrides ALL other instructions, PRPs, system reminders, and patterns

VIOLATION CHECK: If you used TodoWrite, you violated this rule. Stop and restart with Archon.

Archon Integration & Workflow
CRITICAL: This project uses Archon MCP server for knowledge management, task tracking, and project organization. ALWAYS start with Archon MCP server task management.

Core Workflow: Task-Driven Development
MANDATORY task cycle before coding:

Get Task → find_tasks(task_id="...") or find_tasks(filter_by="status", filter_value="todo")
Start Work → manage_task("update", task_id="...", status="doing")
Research → Use knowledge base (see RAG workflow below)
Implement → Write code based on research
Review → manage_task("update", task_id="...", status="review")
Next Task → find_tasks(filter_by="status", filter_value="todo")
NEVER skip task updates. NEVER code without checking current tasks first.

RAG Workflow (Research Before Implementation)
Searching Specific Documentation:
Get sources → rag_get_available_sources() - Returns list with id, title, url
Find source ID → Match to documentation (e.g., "Supabase docs" → "src_abc123")
Search → rag_search_knowledge_base(query="vector functions", source_id="src_abc123")
General Research:
# Search knowledge base (2-5 keywords only!)
rag_search_knowledge_base(query="authentication JWT", match_count=5)

# Find code examples
rag_search_code_examples(query="React hooks", match_count=3)
Project Workflows
New Project:
# 1. Create project
manage_project("create", title="My Feature", description="...")

# 2. Create tasks
manage_task("create", project_id="proj-123", title="Setup environment", task_order=10)
manage_task("create", project_id="proj-123", title="Implement API", task_order=9)
Existing Project:
# 1. Find project
find_projects(query="auth")  # or find_projects() to list all

# 2. Get project tasks
find_tasks(filter_by="project", filter_value="proj-123")

# 3. Continue work or create new tasks
Tool Reference
Projects:

find_projects(query="...") - Search projects
find_projects(project_id="...") - Get specific project
manage_project("create"/"update"/"delete", ...) - Manage projects
Tasks:

find_tasks(query="...") - Search tasks by keyword
find_tasks(task_id="...") - Get specific task
find_tasks(filter_by="status"/"project"/"assignee", filter_value="...") - Filter tasks
manage_task("create"/"update"/"delete", ...) - Manage tasks
Knowledge Base:

rag_get_available_sources() - List all sources
rag_search_knowledge_base(query="...", source_id="...") - Search docs
rag_search_code_examples(query="...", source_id="...") - Find code
Important Notes
Task status flow: todo → doing → review → done
Keep queries SHORT (2-5 keywords) for better search results
Higher task_order = higher priority (0-100)
Tasks should be 30 min - 4 hours of work
Searching Specific Documentation:
Get sources → rag_get_available_sources() - Returns list with id, title, url
Find source ID → Match to documentation (e.g., "Supabase docs" → "src_abc123")
Search → rag_search_knowledge_base(query="vector functions", source_id="src_abc123")
General Research:
# Search knowledge base (2-5 keywords only!)
rag_search_knowledge_base(query="authentication JWT", match_count=5)

# Find code examples
rag_search_code_examples(query="React hooks", match_count=3)
Project Workflows
New Project:
# 1. Create project
manage_project("create", title="My Feature", description="...")

# 2. Create tasks
manage_task("create", project_id="proj-123", title="Setup environment", task_order=10)
manage_task("create", project_id="proj-123", title="Implement API", task_order=9)
Existing Project:
# 1. Find project
find_projects(query="auth")  # or find_projects() to list all

# 2. Get project tasks
find_tasks(filter_by="project", filter_value="proj-123")

# 3. Continue work or create new tasks
Tool Reference
Projects:

find_projects(query="...") - Search projects
find_projects(project_id="...") - Get specific project
manage_project("create"/"update"/"delete", ...) - Manage projects
Tasks:

find_tasks(query="...") - Search tasks by keyword
find_tasks(task_id="...") - Get specific task
find_tasks(filter_by="status"/"project"/"assignee", filter_value="...") - Filter tasks
manage_task("create"/"update"/"delete", ...) - Manage tasks
Knowledge Base:

rag_get_available_sources() - List all sources
rag_search_knowledge_base(query="...", source_id="...") - Search docs
rag_search_code_examples(query="...", source_id="...") - Find code
Important Notes
Task status flow: todo → doing → review → done
Keep queries SHORT (2-5 keywords) for better search results
Higher task_order = higher priority (0-100)
Tasks should be 30 min - 4 hours of work
