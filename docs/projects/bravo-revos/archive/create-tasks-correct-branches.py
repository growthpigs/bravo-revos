#!/usr/bin/env python3
"""Create Bravo revOS tasks with correct branch names matching Archon UI"""

import os
from dotenv import load_dotenv
from supabase import create_client
import uuid

load_dotenv('/Users/rodericandrews/Obsidian/Master/_agro-archon/agro-archon/python/.env')

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY')
PROJECT_ID = "de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Tasks with CORRECT branch names matching the UI
TASKS = [
    # BOLT SCAFFOLD (15 points)
    {
        "title": "A-01: Bolt.new Full-Stack Scaffold",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

Generate complete full-stack application using Bolt.new with 300-word self-contained prompt.

**300-Word Bolt.new Prompt:**
"Create a LinkedIn lead magnet system with Next.js 14, TypeScript, Tailwind, and Shadcn/ui. Database: Supabase with multi-tenant structure (agencies→clients→users). Tables: campaigns (name, trigger_word, dm_template, webhook_url, lead_magnet), leads (email, first_name, last_name, linkedin_url, status), linkedin_sessions (encrypted credentials), cartridges (4-tier: system/workspace/user/skills with voice parameters), messages (DM tracking), webhooks (delivery logs), pods (min 9 members), pod_members, pod_activities. Admin portal at /admin with: campaign management, lead tracking, webhook logs, pod management. Client dashboard at /dashboard with: 4-step campaign wizard, lead inbox, analytics. Features: iOS-style toggle switches, dark mode, responsive design. Auth: Email/password with RLS policies ensuring tenant isolation. Components: CampaignCard, LeadCard, WebhookStatus, PodMemberList. Campaign wizard steps: 1) Name & trigger word, 2) DM template with variables, 3) Webhook URL, 4) Lead magnet upload. Use modern App Router, server components where possible, client components for interactivity. Include loading states, error boundaries, and optimistic updates. Create comprehensive type definitions in types/index.ts. Style with Tailwind prose for content, shadcn/ui for components. Add sample data in Supabase migration. Deploy-ready with environment variables for Supabase URL/key. Focus on clean UI inspired by Linear/Notion."

**Points:** 15
**Assignee:** User (Bolt.new)""",
        "status": "todo",
        "branch": "bolt-scaffold",
        "priority": "critical",
        "assignee": "user",
        "task_order": 1
    },

    # CARTRIDGE SYSTEM (23 points)
    {
        "title": "B-01: Supabase Storage Setup",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🔍 KNOWLEDGE BASE - Supabase:
Query Archon: "Supabase Storage bucket creation with RLS policies multi-tenant"

Create lead-magnets bucket with RLS policies, 10MB limit, 24-hour signed URLs.

**Points:** 3""",
        "status": "todo",
        "branch": "cartridge-system",
        "priority": "high",
        "assignee": "assistant",
        "task_order": 2
    },
    {
        "title": "B-02: Cartridge Database & API",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

📚 PROJECT DOCS:
- 02-Cartridge-System-Specification.md (lines 143-196, 456-506)

Implement 4-tier cartridge system (System/Workspace/User/Skills) with RLS policies.

**Points:** 8""",
        "status": "todo",
        "branch": "cartridge-system",
        "priority": "high",
        "assignee": "assistant",
        "task_order": 3
    },
    {
        "title": "B-03: Voice Auto-Generation from LinkedIn",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🔍 KNOWLEDGE BASE - Unipile + OpenAI:
Query Archon: "Unipile API get user posts endpoint pagination"
Query Archon: "OpenAI GPT-4 writing style analysis"

Fetch 30 posts via Unipile, analyze with GPT-4o, generate voice cartridge.

**Points:** 7""",
        "status": "todo",
        "branch": "cartridge-system",
        "priority": "medium",
        "assignee": "assistant",
        "task_order": 4
    },
    {
        "title": "B-04: Cartridge Management UI",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

Build cartridge management interface with progressive disclosure, voice preview.

**Points:** 5""",
        "status": "todo",
        "branch": "cartridge-system",
        "priority": "medium",
        "assignee": "assistant",
        "task_order": 5
    },

    # UNIPILE INTEGRATION (20 points)
    {
        "title": "C-01: Unipile Integration & Session Management",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🔍 KNOWLEDGE BASE - Unipile:
Query Archon: "Unipile LinkedIn authentication username password flow"

Username/password auth (NOT OAuth), encrypted storage, $5.50/account/month.

**Points:** 5""",
        "status": "todo",
        "branch": "unipile-integration",
        "priority": "critical",
        "assignee": "assistant",
        "task_order": 6
    },
    {
        "title": "C-02: Comment Polling System",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🔍 KNOWLEDGE BASE - Unipile:
Query Archon: "Unipile API get post comments endpoint"

CRITICAL: Random intervals 15-45 minutes, working hours only, bot filtering.

**Points:** 7""",
        "status": "todo",
        "branch": "unipile-integration",
        "priority": "critical",
        "assignee": "assistant",
        "task_order": 7
    },
    {
        "title": "C-03: BullMQ Rate-Limited DM Queue",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🔍 KNOWLEDGE BASE - BullMQ:
Query Archon: "BullMQ rate limiting per-group configuration"

CRITICAL: 100 DMs/day per account (NOT 50), random delays 2-15 minutes.

**Points:** 8""",
        "status": "todo",
        "branch": "unipile-integration",
        "priority": "critical",
        "assignee": "assistant",
        "task_order": 8
    },

    # LEAD CAPTURE (20 points)
    {
        "title": "D-01: Email Extraction from DM Replies",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🔍 KNOWLEDGE BASE:
Query Archon: "OpenAI GPT-4 email extraction confidence scoring"

Two-stage: Regex first, GPT-4o fallback, confidence scoring.

**Points:** 5""",
        "status": "todo",
        "branch": "lead-capture",
        "priority": "high",
        "assignee": "assistant",
        "task_order": 9
    },
    {
        "title": "D-02: Webhook to Client CRM/ESP",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🔍 KNOWLEDGE BASE:
Query Archon: "Webhook retry logic exponential backoff"
Query Archon: "HMAC signature webhook security"

HTTP POST with HMAC, retry: 0min, 15min, 30min, 60min.

**Points:** 10""",
        "status": "todo",
        "branch": "lead-capture",
        "priority": "critical",
        "assignee": "assistant",
        "task_order": 10
    },
    {
        "title": "D-03: Mailgun One-Time Lead Magnet Delivery",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🔍 KNOWLEDGE BASE:
Query Archon: "Mailgun API send email with attachment"

One-time delivery, 5k emails/month free, backup DM optional.

**Points:** 5""",
        "status": "todo",
        "branch": "lead-capture",
        "priority": "high",
        "assignee": "assistant",
        "task_order": 11
    },

    # ENGAGEMENT PODS (20 points)
    {
        "title": "E-01: Pod Infrastructure & Database",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

📚 PROJECT DOCS:
- spec.md (engagement pods specification, lines 213-221)

Min 9 members, 100% participation, auto-suspend <50% participation.

**Points:** 5""",
        "status": "todo",
        "branch": "engagement-pods",
        "priority": "medium",
        "assignee": "assistant",
        "task_order": 12
    },
    {
        "title": "E-02: LinkedIn Session Capture for Pod Members",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🔍 KNOWLEDGE BASE:
Query Archon: "Unipile hosted authentication iframe"

Session expiry alerts: 7-day, 1-day, expiry.

**Points:** 5""",
        "status": "todo",
        "branch": "engagement-pods",
        "priority": "medium",
        "assignee": "assistant",
        "task_order": 13
    },
    {
        "title": "E-03: Pod Post Detection System",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🔍 KNOWLEDGE BASE:
Query Archon: "Unipile API get user posts authored content"

CRITICAL: Missing from original. Poll every 30 min, detect new posts.

**Points:** 5""",
        "status": "todo",
        "branch": "engagement-pods",
        "priority": "critical",
        "assignee": "assistant",
        "task_order": 14
    },
    {
        "title": "E-04: Pod Automation Engine",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🔍 KNOWLEDGE BASE:
Query Archon: "BullMQ delayed jobs scheduling"

CRITICAL: Stagger engagement. Like: 5-30min, Comment: 1-6hr.

**Points:** 5""",
        "status": "todo",
        "branch": "engagement-pods",
        "priority": "medium",
        "assignee": "assistant",
        "task_order": 15
    },

    # AI ORCHESTRATION (10 points)
    {
        "title": "F-01: AgentKit Campaign Orchestration",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🔍 KNOWLEDGE BASE:
Query Archon: "OpenAI AgentKit custom tools registration"

Custom tools: createCampaign, optimizeMessage, analyzePerformance.

**Points:** 5""",
        "status": "todo",
        "branch": "ai-orchestration",
        "priority": "low",
        "assignee": "assistant",
        "task_order": 16
    },
    {
        "title": "F-02: Mem0 Memory System Integration",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🔍 KNOWLEDGE BASE:
Query Archon: "Mem0 tenant isolation multi-tenant SaaS"

CRITICAL: 3-level keys (agencyId::clientId::userId), $20/month.

**Points:** 5""",
        "status": "todo",
        "branch": "ai-orchestration",
        "priority": "low",
        "assignee": "assistant",
        "task_order": 17
    },

    # MONITORING & TESTING (8 points)
    {
        "title": "G-01: Real-time Monitoring Dashboard",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🔍 KNOWLEDGE BASE:
Query Archon: "Supabase real-time subscriptions React"
Query Archon: "Recharts real-time data"

Alert thresholds: DMs <10, conversion <3%.

**Points:** 3""",
        "status": "todo",
        "branch": "monitoring-testing",
        "priority": "low",
        "assignee": "assistant",
        "task_order": 18
    },
    {
        "title": "G-02: End-to-End Testing Suite",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🔍 KNOWLEDGE BASE:
Query Archon: "Playwright e2e testing"
Query Archon: "Jest mock Unipile API"

8 test scenarios, >80% coverage.

**Points:** 5""",
        "status": "todo",
        "branch": "monitoring-testing",
        "priority": "medium",
        "assignee": "assistant",
        "task_order": 19
    }
]

print("=" * 80)
print("CREATING BRAVO REVOS TASKS WITH CORRECT BRANCH NAMES")
print("=" * 80)
print(f"Project ID: {PROJECT_ID}")
print(f"Total tasks: {len(TASKS)}")
print("\nBranch mapping:")
print("  bolt-scaffold → A-01")
print("  cartridge-system → B-01 to B-04")
print("  unipile-integration → C-01 to C-03")
print("  lead-capture → D-01 to D-03")
print("  engagement-pods → E-01 to E-04")
print("  ai-orchestration → F-01 to F-02")
print("  monitoring-testing → G-01 to G-02")
print()

created_count = 0
failed_count = 0

for i, task in enumerate(TASKS, 1):
    print(f"[{i}/{len(TASKS)}] Creating: {task['title']} (branch: {task['branch']})")

    task_data = {
        "id": str(uuid.uuid4()),
        "project_id": PROJECT_ID,
        **task
    }

    try:
        result = supabase.table('archon_tasks').insert(task_data).execute()
        print(f"   ✅ Created successfully")
        created_count += 1
    except Exception as e:
        print(f"   ❌ Failed: {str(e)}")
        failed_count += 1

print("\n" + "=" * 80)
print("SUMMARY")
print("=" * 80)
print(f"✅ Successfully created: {created_count} tasks")
print(f"❌ Failed: {failed_count} tasks")

# Verify
result = supabase.table('archon_tasks').select("*").eq('project_id', PROJECT_ID).execute()
print(f"\nTotal tasks in Bravo revOS: {len(result.data)}")

# Show branches
branches = set(task.get('branch', 'none') for task in result.data)
print(f"Branches: {', '.join(sorted(branches))}")

print("\n✅ Navigate to: http://localhost:3737/projects/de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531")
print("   Tasks should now appear in the correct branch tabs!")