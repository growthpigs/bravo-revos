#!/usr/bin/env python3
"""Create all Bravo revOS tasks with proper epic structure directly in Supabase"""

import os
from dotenv import load_dotenv
from supabase import create_client
import uuid

# Load environment
load_dotenv('/Users/rodericandrews/Obsidian/Master/_agro-archon/agro-archon/python/.env')

# Supabase configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY')
PROJECT_ID = "de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# All tasks with proper epic structure
TASKS = [
    # Epic A: Bolt.new Scaffold (15 points)
    {
        "title": "A-01: Bolt.new Full-Stack Scaffold",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

Generate complete full-stack application using Bolt.new with 300-word self-contained prompt.

**What to Generate:**
- Next.js 14 with App Router + TypeScript
- Supabase database schema (all tables from data-model.md)
- Admin portal (/admin/*) with all management screens
- Client dashboard (/dashboard/*) with campaign wizard
- All UI components with iOS-style toggle switches
- Auth middleware and RLS policies
- Tailwind CSS + Shadcn/ui component library

**300-Word Bolt.new Prompt:**
"Create a LinkedIn lead magnet system with Next.js 14, TypeScript, Tailwind, and Shadcn/ui. Database: Supabase with multi-tenant structure (agencies→clients→users). Tables: campaigns (name, trigger_word, dm_template, webhook_url, lead_magnet), leads (email, first_name, last_name, linkedin_url, status), linkedin_sessions (encrypted credentials), cartridges (4-tier: system/workspace/user/skills with voice parameters), messages (DM tracking), webhooks (delivery logs), pods (min 9 members), pod_members, pod_activities. Admin portal at /admin with: campaign management, lead tracking, webhook logs, pod management. Client dashboard at /dashboard with: 4-step campaign wizard, lead inbox, analytics. Features: iOS-style toggle switches, dark mode, responsive design. Auth: Email/password with RLS policies ensuring tenant isolation. Components: CampaignCard, LeadCard, WebhookStatus, PodMemberList. Campaign wizard steps: 1) Name & trigger word, 2) DM template with variables, 3) Webhook URL, 4) Lead magnet upload. Use modern App Router, server components where possible, client components for interactivity. Include loading states, error boundaries, and optimistic updates. Create comprehensive type definitions in types/index.ts. Style with Tailwind prose for content, shadcn/ui for components. Add sample data in Supabase migration. Deploy-ready with environment variables for Supabase URL/key. Focus on clean UI inspired by Linear/Notion."

**Points:** 15
**Branch:** epic-A-bolt-scaffold
**Assignee:** User (Bolt.new)""",
        "status": "todo",
        "branch": "epic-A-bolt-scaffold",
        "priority": "critical",
        "assignee": "user",
        "task_order": 1,
        "feature": "Epic A: Bolt Scaffold"
    },

    # Epic B: Cartridge System (23 points)
    {
        "title": "B-01: Supabase Storage Setup",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

📚 PROJECT DOCS:
- data-model.md (Storage bucket requirements)

🔍 KNOWLEDGE BASE - Supabase:
Query Archon: "Supabase Storage bucket creation with RLS policies multi-tenant"
Query Archon: "Supabase Storage signed URLs 24-hour expiry implementation"

**Create Supabase Storage for Lead Magnets:**
- Bucket name: lead-magnets
- File size limit: 10MB
- Allowed types: PDF, DOCX, PPTX, ZIP
- RLS policies for tenant isolation
- 24-hour signed URLs
- Cleanup job for orphaned files

**Points:** 3
**Branch:** epic-B-cartridge-system""",
        "status": "todo",
        "branch": "epic-B-cartridge-system",
        "priority": "high",
        "assignee": "assistant",
        "task_order": 2,
        "feature": "Epic B: Cartridge System"
    },
    {
        "title": "B-02: Cartridge Database & API",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

📚 PROJECT DOCS:
- 02-Cartridge-System-Specification.md (lines 143-196, 456-506)
- data-model.md (cartridges table schema)

🔍 KNOWLEDGE BASE - Supabase:
Query Archon: "Supabase RLS policies multi-tenant best practices SaaS"
Query Archon: "Supabase JSONB indexing performance optimization"

**Implement 4-tier cartridge system:**
- System (global, read-only)
- Workspace (client-level, admin editable)
- User (individual, owner editable)
- Skills (per-task, temporary)

**API Endpoints:** Full CRUD for cartridges with RLS policies

**Points:** 8
**Branch:** epic-B-cartridge-system""",
        "status": "todo",
        "branch": "epic-B-cartridge-system",
        "priority": "high",
        "assignee": "assistant",
        "task_order": 3,
        "feature": "Epic B: Cartridge System"
    },
    {
        "title": "B-03: Voice Auto-Generation from LinkedIn",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

📚 PROJECT DOCS:
- 02-Cartridge-System-Specification.md (voice generation logic)

🔍 KNOWLEDGE BASE - Unipile + OpenAI:
Query Archon: "Unipile API get user posts endpoint pagination limit parameters"
Query Archon: "OpenAI GPT-4 prompt engineering for writing style tone analysis"

**Auto-generate voice cartridge from LinkedIn profile:**
- Fetch last 30 posts via Unipile API
- Analyze tone, style, formality with GPT-4o
- Generate voice cartridge with auto_generated flag
- Handle edge cases (<30 posts, private profiles)

**Points:** 7
**Branch:** epic-B-cartridge-system""",
        "status": "todo",
        "branch": "epic-B-cartridge-system",
        "priority": "medium",
        "assignee": "assistant",
        "task_order": 4,
        "feature": "Epic B: Cartridge System"
    },
    {
        "title": "B-04: Cartridge Management UI",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

📚 PROJECT DOCS:
- 02-Cartridge-System-Specification.md (UI specifications)

**Build cartridge management interface:**
- List view with tier-based filtering
- Create/edit forms with progressive disclosure
- Voice preview with real-time samples
- Load trigger configuration

**Points:** 5
**Branch:** epic-B-cartridge-system""",
        "status": "todo",
        "branch": "epic-B-cartridge-system",
        "priority": "medium",
        "assignee": "assistant",
        "task_order": 5,
        "feature": "Epic B: Cartridge System"
    },

    # Epic C: Unipile & BullMQ (20 points)
    {
        "title": "C-01: Unipile Integration & Session Management",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

📚 PROJECT DOCS:
- unipile-api-research.md (complete Unipile documentation)

🔍 KNOWLEDGE BASE - Unipile:
Query Archon: "Unipile LinkedIn authentication username password flow not OAuth"
Query Archon: "Unipile API pricing per account monthly cost"

**Integrate Unipile API for LinkedIn operations:**
- Username/password flow (NOT OAuth)
- Hosted auth flow via iframe
- Encrypted session storage in Supabase
- Token refresh before expiry
- $5.50/account/month pricing

**Points:** 5
**Branch:** epic-C-unipile-bullmq""",
        "status": "todo",
        "branch": "epic-C-unipile-bullmq",
        "priority": "critical",
        "assignee": "assistant",
        "task_order": 6,
        "feature": "Epic C: Unipile & BullMQ"
    },
    {
        "title": "C-02: Comment Polling System",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🔍 KNOWLEDGE BASE - Unipile:
Query Archon: "Unipile API get post comments endpoint parameters pagination"
Query Archon: "Unipile LinkedIn comment polling best practices rate limits"

**Poll LinkedIn comments for trigger words:**
- CRITICAL: Random intervals 15-45 minutes (wider range)
- Working hours only: 9am-5pm user's timezone
- 10% random skip chance (breaks patterns)
- Bot comment filtering
- Trigger word matching with fuzzy search

**Points:** 7
**Branch:** epic-C-unipile-bullmq""",
        "status": "todo",
        "branch": "epic-C-unipile-bullmq",
        "priority": "critical",
        "assignee": "assistant",
        "task_order": 7,
        "feature": "Epic C: Unipile & BullMQ"
    },
    {
        "title": "C-03: BullMQ Rate-Limited DM Queue",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🔍 KNOWLEDGE BASE - BullMQ + Unipile:
Query Archon: "BullMQ rate limiting per-group configuration examples"
Query Archon: "Unipile API send message daily limits LinkedIn"

**BullMQ queue for rate-limited DM sending:**
- CRITICAL: 100 DMs/day per account (NOT 50)
- Min delay: 2 minutes between DMs
- Random delays: 2-15 minutes
- Per-account rate limiting with groupKey
- Exponential backoff retry: 15min, 30min, 60min

**Points:** 8
**Branch:** epic-C-unipile-bullmq""",
        "status": "todo",
        "branch": "epic-C-unipile-bullmq",
        "priority": "critical",
        "assignee": "assistant",
        "task_order": 8,
        "feature": "Epic C: Unipile & BullMQ"
    },

    # Epic D: Email & Webhook (20 points)
    {
        "title": "D-01: Email Extraction from DM Replies",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🔍 KNOWLEDGE BASE - OpenAI + Regex:
Query Archon: "OpenAI GPT-4 email extraction from text with confidence scoring"
Query Archon: "Regex patterns for email validation RFC 5322 compliant"

**Extract email from DM replies:**
- Two-stage: Regex first, GPT-4o fallback
- Confidence scoring (High/Medium/Low)
- Manual review queue for <70% confidence
- Clarification DM if no email found

**Points:** 5
**Branch:** epic-D-email-webhook""",
        "status": "todo",
        "branch": "epic-D-email-webhook",
        "priority": "high",
        "assignee": "assistant",
        "task_order": 9,
        "feature": "Epic D: Email & Webhook"
    },
    {
        "title": "D-02: Webhook to Client CRM/ESP",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🔍 KNOWLEDGE BASE - Webhooks:
Query Archon: "Webhook retry logic exponential backoff best practices"
Query Archon: "HMAC signature webhook security implementation Node.js"

**Send captured lead data to client's CRM/ESP:**
- HTTP POST with HMAC signature
- ESP presets (Zapier, Make, ConvertKit, Custom)
- Retry logic: 4 attempts (0min, 15min, 30min, 60min)
- Dead letter queue after failures

**Points:** 10
**Branch:** epic-D-email-webhook""",
        "status": "todo",
        "branch": "epic-D-email-webhook",
        "priority": "critical",
        "assignee": "assistant",
        "task_order": 10,
        "feature": "Epic D: Email & Webhook"
    },
    {
        "title": "D-03: Mailgun One-Time Lead Magnet Delivery",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🔍 KNOWLEDGE BASE - Mailgun + Supabase:
Query Archon: "Mailgun API send email with attachment Node.js example"
Query Archon: "Supabase Storage signed URLs 24-hour expiry"

**One-time lead magnet email delivery via Mailgun:**
- Send immediately after email capture
- Attachment from Supabase Storage
- Open/click tracking
- 5,000 emails/month free tier
- Optional backup DM with 24-hour link

**Points:** 5
**Branch:** epic-D-email-webhook""",
        "status": "todo",
        "branch": "epic-D-email-webhook",
        "priority": "high",
        "assignee": "assistant",
        "task_order": 11,
        "feature": "Epic D: Email & Webhook"
    },

    # Epic E: Engagement Pods (20 points)
    {
        "title": "E-01: Pod Infrastructure & Database",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

📚 PROJECT DOCS:
- spec.md (engagement pods specification, lines 213-221)
- data-model.md (pods, pod_members, pod_activities tables)

**Build engagement pod infrastructure:**
- Min 9 members per pod, max 15
- 100% participation (EVERYONE engages with EVERYTHING)
- Participation tracking and enforcement
- Auto-suspend members with <50% participation

**Points:** 5
**Branch:** epic-E-engagement-pods""",
        "status": "todo",
        "branch": "epic-E-engagement-pods",
        "priority": "medium",
        "assignee": "assistant",
        "task_order": 12,
        "feature": "Epic E: Engagement Pods"
    },
    {
        "title": "E-02: LinkedIn Session Capture for Pod Members",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🔍 KNOWLEDGE BASE - Unipile:
Query Archon: "Unipile hosted authentication iframe implementation"
Query Archon: "Unipile LinkedIn session token storage encryption"

**Capture LinkedIn sessions for pod members:**
- Hosted auth flow via Unipile iframe
- Encrypted token storage
- Session expiry alerts (7-day, 1-day, expiry)
- Auto-refresh if <7 days until expiry

**Points:** 5
**Branch:** epic-E-engagement-pods""",
        "status": "todo",
        "branch": "epic-E-engagement-pods",
        "priority": "medium",
        "assignee": "assistant",
        "task_order": 13,
        "feature": "Epic E: Engagement Pods"
    },
    {
        "title": "E-03: Pod Post Detection System",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🔍 KNOWLEDGE BASE - Unipile:
Query Archon: "Unipile API get user posts authored content filtering"
Query Archon: "Unipile LinkedIn post detection polling frequency best practices"

**CRITICAL: This task was missing from original list**

**Detect when pod members create new posts:**
- Poll all pod member posts every 30 minutes
- Detect new posts since last check
- Trigger engagement workflow for ALL other members
- Track participation compliance

**Points:** 5
**Branch:** epic-E-engagement-pods""",
        "status": "todo",
        "branch": "epic-E-engagement-pods",
        "priority": "critical",
        "assignee": "assistant",
        "task_order": 14,
        "feature": "Epic E: Engagement Pods"
    },
    {
        "title": "E-04: Pod Automation Engine",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🔍 KNOWLEDGE BASE - Unipile + BullMQ:
Query Archon: "Unipile API like comment repost endpoints rate limits"
Query Archon: "BullMQ delayed jobs scheduling future execution"

**Execute pod engagement actions:**
- CRITICAL: Stagger engagement (not simultaneous)
- Like: Random 5-30 minutes after post
- Comment: Random 1-6 hours after post
- Max 3 members engage within first hour
- Comment generation with voice cartridge

**Points:** 5
**Branch:** epic-E-engagement-pods""",
        "status": "todo",
        "branch": "epic-E-engagement-pods",
        "priority": "medium",
        "assignee": "assistant",
        "task_order": 15,
        "feature": "Epic E: Engagement Pods"
    },

    # Epic F: AI Integration (10 points)
    {
        "title": "F-01: AgentKit Campaign Orchestration",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🔍 KNOWLEDGE BASE - OpenAI AgentKit:
Query Archon: "OpenAI AgentKit custom tools registration examples"
Query Archon: "AgentKit best practices for campaign orchestration"

**AgentKit for campaign management:**
- Custom tools: createCampaign, optimizeMessage, analyzePerformance, generatePostContent
- Tool schemas with parameters and return types
- Campaign creation via AgentKit
- Message optimization with A/B variants

**Points:** 5
**Branch:** epic-F-ai-integration""",
        "status": "todo",
        "branch": "epic-F-ai-integration",
        "priority": "low",
        "assignee": "assistant",
        "task_order": 16,
        "feature": "Epic F: AI Integration"
    },
    {
        "title": "F-02: Mem0 Memory System Integration",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🔍 KNOWLEDGE BASE - Mem0:
Query Archon: "Mem0 tenant isolation best practices multi-tenant SaaS"
Query Archon: "Mem0 semantic search examples with metadata filtering"

**Mem0 for persistent cartridge memory:**
- CRITICAL: 3-level tenant keys (agencyId::clientId::userId)
- Memory types: user preferences, campaign learnings, conversations
- Semantic search with metadata filtering
- $20/month Pro plan

**Points:** 5
**Branch:** epic-F-ai-integration""",
        "status": "todo",
        "branch": "epic-F-ai-integration",
        "priority": "low",
        "assignee": "assistant",
        "task_order": 17,
        "feature": "Epic F: AI Integration"
    },

    # Epic G: Monitoring & Testing (8 points)
    {
        "title": "G-01: Real-time Monitoring Dashboard",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🔍 KNOWLEDGE BASE - Supabase + Recharts:
Query Archon: "Supabase real-time subscriptions React hooks example"
Query Archon: "Recharts line chart area chart examples with real-time data"

**Build campaign monitoring dashboard:**
- Real-time metrics via Supabase subscriptions
- Alert thresholds (DMs <10, conversion <3%)
- Charts with Recharts (line, area, bar, pie)
- Responsive design

**Points:** 3
**Branch:** epic-G-monitoring-testing""",
        "status": "todo",
        "branch": "epic-G-monitoring-testing",
        "priority": "low",
        "assignee": "assistant",
        "task_order": 18,
        "feature": "Epic G: Monitoring & Testing"
    },
    {
        "title": "G-02: End-to-End Testing Suite",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🔍 KNOWLEDGE BASE - Testing:
Query Archon: "Playwright end-to-end testing best practices"
Query Archon: "Jest mock Unipile API responses"

**Comprehensive E2E testing:**
- 8 test scenarios from quickstart.md
- Mock fixtures (100 comments, 50 DM replies)
- Unit test coverage >80%
- CI/CD pipeline integration

**Points:** 5
**Branch:** epic-G-monitoring-testing""",
        "status": "todo",
        "branch": "epic-G-monitoring-testing",
        "priority": "medium",
        "assignee": "assistant",
        "task_order": 19,
        "feature": "Epic G: Monitoring & Testing"
    }
]

print("=" * 80)
print("CREATING BRAVO REVOS TASKS WITH EPIC STRUCTURE (DIRECT)")
print("=" * 80)
print(f"Total tasks to create: {len(TASKS)}\n")

# Create each task
created_count = 0
failed_count = 0

for i, task in enumerate(TASKS, 1):
    print(f"[{i}/{len(TASKS)}] Creating: {task['title']}")

    # Add required fields
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

# Verify final count
result = supabase.table('archon_tasks').select("*").eq('project_id', PROJECT_ID).execute()
print(f"\nTotal tasks in database: {len(result.data)}")
print("\nDone!")