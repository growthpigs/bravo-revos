# Bolt.new Prompt Fix - Self-Contained & Optimized

**Date:** November 4, 2025
**Issue:** A-01 referenced external docs that Bolt.new can't access
**Solution:** Self-contained 300-word prompt relying on Bolt's own knowledge

---

## The Problem You Identified

**Original A-01 said:**
```
📖 BEFORE YOU START: Read A-00...
📚 PROJECT DOCS: Read via Archon...
🔍 KNOWLEDGE BASE: Query Archon...
```

**But Bolt.new:**
- ❌ Can't access Archon
- ❌ Can't read your project docs
- ❌ Can't query knowledge base
- ✅ Has its own knowledge (Next.js, Supabase, React)
- ✅ Works best with high-level **WHAT** not **HOW**
- ✅ Needs **self-contained prompts**

---

## The Solution

### Two-Part Structure:

**Part 1: For YOU (Human) - Before Bolt:**
```markdown
### BEFORE Using Bolt.new (YOU do this):

1. ✅ Read A-00: Project Foundation & Context
2. ✅ Review in Archon: Master Specification, Data Model, Interface Spec
3. ✅ Understand: ONE app (not three), iOS-style toggles everywhere
```

**Part 2: For BOLT.NEW - Self-Contained Prompt:**
```markdown
## 🤖 BOLT.NEW PROMPT (Copy & Paste - 300 words)

Create a Next.js 14 multi-tenant SaaS for LinkedIn lead generation
using App Router, TypeScript, Tailwind, and shadcn/ui.

[Complete self-contained spec without external references]
```

---

## Prompt Optimization

### Word Count Analysis:

**Original Version:** 620 words ❌
- Too long
- Referenced external docs
- Not self-contained

**Optimized Version:** 300 words ✅
- Well under 500-word guideline
- ~390 tokens estimated
- Completely self-contained
- Relies on Bolt's knowledge of Next.js, Supabase, shadcn/ui

### What Was Removed:

❌ References to A-00
❌ References to Archon docs
❌ Detailed implementation HOW
❌ Code examples
❌ Verbose explanations

### What Was Kept:

✅ High-level WHAT to build
✅ Database schema (table names, key fields)
✅ Route structure
✅ Critical UI requirements (iOS-style toggles!)
✅ Deliverables checklist
✅ Validation criteria

---

## The Optimized Prompt

**300 words, self-contained, ready to paste:**

```
Create a Next.js 14 multi-tenant SaaS for LinkedIn lead generation using App Router, TypeScript, Tailwind, and shadcn/ui.

ONE APP with two portals:
- /admin → Agency admins manage multiple clients
- /dashboard → Client users manage campaigns

Auth & Routing:
Supabase Auth with middleware: /admin/* = agency_admin only, /dashboard/* = client users only. RLS policies for multi-tenant isolation.

Database (Supabase):

Multi-tenancy: agencies → clients → users (with roles)

Campaigns: campaigns, lead_magnets (Supabase Storage), leads (email, status)

LinkedIn: linkedin_accounts, posts (scheduled_for), comments, dm_sequences

Integrations: webhook_configs (ESP: Zapier/Make/ConvertKit), webhook_deliveries

Engagement: pods, pod_members, pod_activities

Admin Portal (/admin/*):
- Dashboard: metrics cards, charts (recharts)
- Clients page: DataTable (tanstack-table) with CRUD
- Campaigns & analytics pages

Client Dashboard (/dashboard/*):
- Dashboard: lead funnel viz, conversion metrics
- campaigns/new: 6-step wizard (lead magnet upload → content → trigger word → webhook config → DM delays → review)
- campaigns/[id]: details with lead list
- leads: DataTable with CSV export
- library: browse/upload lead magnets
- settings/webhooks: config + test tool

UI Requirements (CRITICAL):
- ALL toggles = iOS-style (shadcn Switch, NOT Checkbox)
  Examples: backup DM, follow-up sequence, AI generation, auto-engage
- Calendar for scheduling (shadcn Calendar + DatePicker)
- Rich text editor for posts (Tiptap)
- DataTables for all lists
- Progress bars for account health (e.g., "25/50 DMs today")
- Warning badges at 80% limit

Deliverables:
- Complete Next.js 14 app with App Router
- SQL migration + TypeScript types
- RLS policies
- Admin portal (4 pages) + Client dashboard (5 pages + wizard)
- All components with iOS-style toggles
- Campaign wizard (6 steps)
- CSV export functionality

Validation:
- Login works (Supabase Auth)
- Role-based access (/admin vs /dashboard)
- RLS prevents cross-client data access
- All toggles are Switch (not Checkbox)
- Wizard has 6 steps
- CSV export works
```

---

## Why This Works

### Bolt.new's Strengths:
- ✅ Knows Next.js 14 App Router patterns
- ✅ Knows Supabase Auth & RLS
- ✅ Knows shadcn/ui components
- ✅ Knows TypeScript best practices
- ✅ Can infer implementation details from high-level specs

### What Bolt Doesn't Need:
- ❌ Step-by-step implementation HOW
- ❌ Code snippets
- ❌ External documentation
- ❌ Detailed explanations

### The Formula:
```
High-level WHAT + Critical constraints + Validation criteria = Perfect Bolt prompt
```

---

## Workflow Integration

### Step 1: Human Preparation (YOU)
1. Read A-00 in Archon
2. Review Master Specification
3. Review Data Model
4. Understand project context

### Step 2: Bolt.new Generation (AI)
1. Copy 300-word prompt
2. Paste into Bolt.new
3. Let Bolt generate scaffold
4. Bolt uses its own knowledge

### Step 3: Claude Code Enhancement (AI)
1. Takes Bolt's scaffold
2. Reads A-00 + project docs
3. Queries knowledge base
4. Adds business logic in A-02+

---

## Bolt.new Best Practices Applied

### ✅ Plan Before Prompting
- User reads A-00 first
- Reviews specs in Archon
- Understands requirements

### ✅ Be Specific and Focused
- Database schema (table names, key fields)
- Route structure (/admin vs /dashboard)
- UI requirements (iOS toggles, Calendar, DataTable)

### ✅ Avoid Vague Requests
- NOT: "Build a LinkedIn tool"
- YES: "Multi-tenant SaaS with /admin and /dashboard portals, 6-step campaign wizard"

### ✅ Self-Contained
- No external references
- Relies on Bolt's knowledge
- Complete in one prompt

---

## The Division of Labor

**Bolt.new (A-01):**
- Scaffold structure
- Database schema
- Basic routes
- UI components
- Auth setup

**Claude Code (A-02+):**
- Business logic
- API integrations (Unipile, Mem0, AgentKit)
- Complex workflows
- Rate limiting
- LinkedIn automation

**Human:**
- Requirements gathering (read A-00)
- Context understanding
- Testing & validation
- Deployment

---

## Verification

**Prompt Stats:**
- ✅ 300 words
- ✅ 2,133 characters
- ✅ ~390 tokens estimated
- ✅ Self-contained
- ✅ No external references
- ✅ Leverages Bolt's knowledge

**Task Updated:**
- ✅ A-01 in Archon updated
- ✅ Two-part structure (human prep + Bolt prompt)
- ✅ Ready to copy & paste

---

## Key Insight

**Your observation was critical:**
> "When we paste this into bolt, it won't have access to the knowledge base and project docs. However, bolt.new is very powerful and it has its own sources."

**You understood:**
- Bolt can't access your Archon docs
- Bolt has its own knowledge (Next.js, Supabase, etc.)
- Prompts must be self-contained
- Keep under word/token limits

**This is exactly how professionals use Bolt.new.** 🎯

---

## Summary

**Problem:** A-01 referenced external docs Bolt.new can't access

**Solution:** Two-part task:
1. Human reads context (A-00, specs)
2. Bolt gets self-contained 300-word prompt

**Result:**
- ✅ Optimized for Bolt.new
- ✅ Leverages Bolt's knowledge
- ✅ Under word limit
- ✅ Self-contained
- ✅ Ready to use

**You're ready to paste into Bolt.new and generate your scaffold!** 🚀
