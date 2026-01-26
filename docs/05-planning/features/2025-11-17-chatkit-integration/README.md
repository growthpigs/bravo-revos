# ChatKit Integration - Project Overview

**Project:** bravo-revos
**Project ID:** de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531
**Feature:** ChatKit Integration for AgentKit Workflows
**Created:** 2025-11-17
**Status:** Planning Complete - Ready for Implementation

---

## 📚 Documentation Structure

This feature folder contains:

1. **REVOS_AGENTKIT_COMPLETE_GUIDE_CORRECTED.md** ⭐ **START HERE**
   - Complete technical specification (v4.0)
   - Architecture decisions and rationale
   - What AgentKit actually is (corrected understanding)
   - Why ChatKit + Agents SDK is the only path
   - Detailed code examples for all components
   - **READ THIS FIRST** before creating any tasks

2. **TASK_BREAKDOWN.md**
   - 11 structured tasks for Archon
   - Each task has detailed implementation steps
   - Acceptance criteria for each task
   - Dependency graph and timeline
   - Ready to copy into Archon task management

3. **README.md** (this file)
   - Quick reference and navigation
   - Next steps for implementation

---

## 🎯 Executive Summary

### The Problem

RevOS currently uses a custom workflow executor with direct OpenAI Chat Completions API calls. We need to integrate OpenAI's AgentKit to:
- Enable visual workflow design via Agent Builder
- Provide better UX with ChatKit's built-in streaming and UI
- Add backend automation for pod reposts using Agents SDK + Playwright
- Make the system easier to maintain and extend

### The Solution

**Two-Part Integration:**

1. **ChatKit (Frontend)** - For user-facing content generation
   - Embeds Agent Builder workflows in RevOS chat interface
   - Handles streaming, session management, UI automatically
   - User types "write" → ChatKit loads → Agent Builder executes → Document displays

2. **Agents SDK (Backend)** - For automation workflows
   - Playwright browser automation for LinkedIn pod reposts
   - AI-powered DM scraping and lead extraction
   - Background workers with BullMQ queues

### Critical Understanding

From the comprehensive guide (confirmed via Perplexity research):

✅ **ChatKit is the ONLY official way** to embed Agent Builder workflows in SaaS products
✅ **Agent Builder canvas CANNOT be embedded** (OpenAI-hosted only)
✅ **Agents SDK is for backend automation** with tools like Playwright
✅ **You need BOTH:** ChatKit for UI + Agents SDK for automation

❌ **You CANNOT:**
- Embed Agent Builder canvas in your app
- Send arbitrary workflow JSON to execute via API
- Use Agents SDK for user-facing chat (use ChatKit instead)

---

## 📋 Implementation Phases

### Phase 1: ChatKit Integration (6 hours)

**Goal:** Replace current content generation with ChatKit

**What You're Building:**
```
User types "write"
  → Frontend loads ChatKit with workflowId
  → ChatKit connects to Agent Builder workflow
  → Agent Builder executes (OpenAI-hosted)
  → ChatKit streams response
  → Frontend listens to events
  → Triggers fullscreen document view
```

**Tasks:**
- Task 1: Manual Setup (Agent Builder workflows) - 30 min
- Task 2: Environment Setup - 15 min
- Task 3: ChatKit Session API - 30 min
- Task 4: Workflow Finder API - 20 min
- Task 5: ChatKitWrapper Component - 45 min
- Task 6: FloatingChatBar Integration - 90 min
- Task 7: Fullscreen Document View - 45 min
- Task 8: Database Migration - 30 min
- Task 9: Integration Test Script - 45 min
- Task 10: Manual Testing - 30 min
- Task 11: Documentation & Cleanup - 30 min

**Files Created:**
- `app/api/chatkit/session/route.ts`
- `app/api/chatkit/workflow/route.ts`
- `components/chat/ChatKitWrapper.tsx`
- `supabase/migrations/20251117_add_agentkit_workflow_ids.sql`
- `scripts/test-chatkit-integration.ts`

**Files Modified:**
- `components/chat/FloatingChatBar.tsx`
- `.env.local`

### Phase 2: Pod Automation (8 hours)

**Goal:** Use Agents SDK + Playwright for LinkedIn pod reposting

**What You're Building:**
```
BullMQ job triggers
  → Agents SDK agent starts
  → Playwright browser launches
  → Agent navigates to LinkedIn
  → Agent finds post and clicks repost
  → Database updated with result
```

**Files Created:**
- `lib/agents/playwright-computer.ts`
- `lib/agents/pod-repost-agent.ts`

**Files Modified:**
- `workers/pod-automation-worker.ts`

### Phase 3: DM Scraping (4 hours)

**Goal:** Use Agents SDK for intelligent DM parsing

**What You're Building:**
```
Polling detects new DM
  → Agents SDK analyzes content
  → AI extracts email address
  → Agent sends followup via Unipile
  → Lead added to database
```

---

## 🚀 Next Steps

### For User (Manual Setup Required)

**Before any coding can start:**

1. **Create Agent Builder Workflows**
   - Go to: https://platform.openai.com/agent-builder
   - Create "LinkedIn Topic Generator" workflow
   - Create "LinkedIn Post Writer" workflow
   - Save both workflow IDs to `.chatkit-workflows.txt`

2. **Configure Domain Allowlist**
   - Go to: https://platform.openai.com/settings
   - Add domains: `localhost:3002`, `localhost:3000`, `*.netlify.app`
   - Wait 5 minutes for propagation

3. **Restart Claude Code Session**
   - Archon MCP server is running (port 8051)
   - Need to restart to connect MCP tools
   - Then create tasks in Archon from TASK_BREAKDOWN.md

### For Claude Code (After Restart)

1. **Connect to Archon MCP**
   - Verify connection with `find_projects`
   - Load bravo-revos project

2. **Create Tasks in Archon**
   - Use TASK_BREAKDOWN.md as source
   - Create 11 tasks with proper dependencies
   - Assign priorities and estimates
   - Link tasks to this feature folder

3. **Begin Implementation**
   - Start with Task 2 (after user completes Task 1)
   - Follow task order respecting dependencies
   - Test after each task completion
   - Update Archon status as progress is made

---

## 📖 Key Documents Reference

### Must Read (In Order)

1. **REVOS_AGENTKIT_COMPLETE_GUIDE_CORRECTED.md**
   - Read sections 1-3 for architecture understanding
   - Reference sections 4-7 during implementation
   - Use section 10 to avoid common pitfalls

2. **TASK_BREAKDOWN.md**
   - Review dependency graph before starting
   - Use as checklist during implementation
   - Copy task descriptions into Archon

3. **bravo-revos CLAUDE.md** (project instructions)
   - Core architecture principles
   - Multi-tenant requirements
   - Port 3002 for dev server
   - No hard-coding rules

### During Implementation

Refer to the complete guide for:
- Code examples (Part 4)
- Database migrations (Part 5)
- Testing strategy (Part 7)
- Deployment setup (Part 8)
- Success criteria (Part 11)

---

## ⚠️ Critical Reminders

### Architecture Non-Negotiables

From bravo-revos CLAUDE.md:

1. **AgentKit SDK ONLY** - No raw `openai.chat.completions.create()`
2. **Mem0 integration** - Scope: `agencyId::clientId::userId`
3. **Console DB** - Load via `loadConsolePrompt()`
4. **Workflow JSON** - Load from `console_workflows` table
5. **Session persistence** - Save all conversations to DB
6. **No hard-coding** - Never hard-code client-specific content
7. **Multi-tenant** - System serves multiple clients/agencies
8. **Port 3002** - Always use port 3002 for dev server

### What ChatKit Changes

**Before:**
- Custom workflow executor
- OpenAI Chat Completions directly
- Manual response parsing
- No visual workflow editor

**After:**
- Agent Builder for workflow design
- ChatKit for UI execution
- Automatic response handling
- Visual workflow editor at platform.openai.com

**What Stays the Same:**
- Database-driven workflow triggers
- Cartridge integration (brand/style/voice)
- FloatingChatBar UI patterns
- BullMQ queue infrastructure
- Supabase authentication

---

## 📊 Timeline Estimate

| Phase | Time | Tasks |
|-------|------|-------|
| ChatKit Integration | 6 hours | 11 tasks |
| Pod Automation | 8 hours | 3 tasks |
| DM Scraping | 4 hours | 2 tasks |
| **Total** | **18 hours** | **16 tasks** |

**Realistic Schedule:** ~3 weeks at 6 hours/week pace

---

## ✅ Success Criteria

**Phase 1 Complete When:**
- User types "write" → ChatKit loads
- Agent generates 4 topics
- Selecting topic generates content
- Fullscreen document opens
- Copy/save buttons work
- Can exit fullscreen

**Phase 2 Complete When:**
- Pod automation via Playwright works
- Browser launches and navigates
- LinkedIn reposting succeeds
- Database updates correctly
- Error handling works

**Phase 3 Complete When:**
- DM scraping extracts emails
- AI analysis works
- Leads added to database
- All tests passing

---

## 🔗 Quick Links

- **Archon Project:** http://localhost:3737/projects/de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531
- **Agent Builder:** https://platform.openai.com/agent-builder
- **OpenAI Settings:** https://platform.openai.com/settings
- **Supabase SQL:** https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new

---

## 📝 Notes

- **Package Already Installed:** `@openai/chatkit` v1.0.1 is in package.json
- **Existing Component:** `components/chat/HGCChatKit.tsx` exists but is unused
- **Current Route:** Using v2 (`/api/hgc-v2`) with workflow system
- **MCP Server:** Running on port 8051 (started successfully)

---

**Created:** 2025-11-17
**Last Updated:** 2025-11-17
**Status:** ✅ Planning Complete - Ready for Archon Task Creation
**Next Step:** User completes Agent Builder setup → Restart Claude Code → Create Archon tasks
