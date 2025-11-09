#!/usr/bin/env python3
"""
Fix Bravo revOS tasks directly via Supabase
Based on CRITICAL-REVIEW-TASK-ERRORS.md findings
"""

import os
import sys
from dotenv import load_dotenv
from supabase import create_client

# Load environment from Archon's .env
load_dotenv('/Users/rodericandrews/Obsidian/Master/_agro-archon/agro-archon/python/.env')

# Supabase setup
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY')
PROJECT_ID = 'de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531'  # Bravo revOS

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Missing Supabase credentials")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Corrected tasks (15 tasks, 100 points total)
TASKS = [
    # SESSION 1: Bolt.new Scaffold (15 points)
    {
        "title": "Bolt.new Project Scaffold",
        "description": """Initialize Bravo revOS project structure using Bolt.new.

**Tech Stack:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Shadcn/ui components
- Supabase client (@supabase/supabase-js)

**Deliverables:**
- Basic project structure with /app directory
- Environment variables setup (.env.local)
- Supabase connection configured
- Basic routing structure (/dashboard, /campaigns, /pods)

**Reference:** 10-RevOS-MVP-80-20-Analysis-ICE-Scoring.md lines 83-97
**Branch:** bolt-scaffold
**Points:** 15""",
        "status": "todo",
        "feature": "Infrastructure",
        "branch": "bolt-scaffold",
        "task_order": 100,
        "assignee": "User"
    },

    # SESSION 2: Cartridge System (20 points)
    {
        "title": "Cartridge Database Schema",
        "description": """Create cartridges table and RLS policies in Supabase.

**Schema (from 02-Cartridge-System-Specification.md lines 143-196):**
```sql
CREATE TABLE cartridges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  tier TEXT NOT NULL CHECK (tier IN ('system', 'workspace', 'user', 'skills')),
  name TEXT NOT NULL,
  description TEXT,
  instructions JSONB NOT NULL,
  load_triggers JSONB,
  voice JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS Policies:**
- Tenant isolation
- System tier = super admin only
- Workspace/User/Skills = tenant users

**Reference:** 02-Cartridge-System-Specification.md lines 143-196
**Branch:** cartridge-system
**Points:** 8""",
        "status": "todo",
        "feature": "Cartridge System",
        "branch": "cartridge-system",
        "task_order": 90,
        "assignee": "User"
    },
    {
        "title": "Voice Auto-Generation from LinkedIn",
        "description": """Implement voice parameter auto-generation from LinkedIn profile.

**Process (from 02-Cartridge-System-Specification.md lines 186-196):**
1. Fetch user's last 30 LinkedIn posts via Unipile API
2. Analyze posts with GPT-4o to extract tone and style
3. Generate voice JSONB with auto_generated flag

**Unipile Endpoint:** GET /api/v1/users/{provider_public_id}/posts
**Reference:** 02-Cartridge-System-Specification.md lines 186-196
**Branch:** cartridge-system
**Points:** 7""",
        "status": "todo",
        "feature": "Cartridge System",
        "branch": "cartridge-system",
        "task_order": 89,
        "assignee": "User"
    },
    {
        "title": "Cartridge Progressive Loading UI",
        "description": """Build cartridge management UI with progressive disclosure.

**4-Tier Hierarchy (from 02-Cartridge-System-Specification.md lines 456-506):**
1. System Tier (admin only)
2. Workspace Tier (shared across tenant)
3. User Tier (user-specific customizations)
4. Skills Tier (task-specific micro-cartridges)

**UI Components:**
- Cartridge selector with tier badges
- Load trigger configuration (keywords, contexts)
- Voice preview and editor
- Instruction templates

**Reference:** 02-Cartridge-System-Specification.md lines 456-506
**Branch:** cartridge-system
**Points:** 5""",
        "status": "todo",
        "feature": "Cartridge System",
        "branch": "cartridge-system",
        "task_order": 88,
        "assignee": "User"
    },

    # SESSION 3: Unipile + BullMQ + DM (20 points)
    {
        "title": "Unipile API Client Setup",
        "description": """Create Unipile API client for LinkedIn operations.

**Authentication:** Username/password flow via Unipile
**Pricing:** $5.50/account/month
**Reference:** unipile-api-research.md, 01-RevOS-Technical-Architecture-v3.md
**Branch:** lead-magnet-features
**Points:** 5""",
        "status": "todo",
        "feature": "LinkedIn Integration",
        "branch": "lead-magnet-features",
        "task_order": 87,
        "assignee": "User"
    },
    {
        "title": "Comment Polling System",
        "description": """Implement comment monitoring with randomized polling intervals.

**CRITICAL: Unipile does NOT support real-time comment webhooks.**

**Polling Strategy:**
- Poll every 15-30 minutes (randomized to avoid detection)
- Filter new comments (check against database)
- Extract commenter profile data
- Queue DM jobs in BullMQ

**Reference:** unipile-api-research.md, CRITICAL-REVIEW-TASK-ERRORS.md
**Branch:** lead-magnet-features
**Points:** 7""",
        "status": "todo",
        "feature": "Comment Monitoring",
        "branch": "lead-magnet-features",
        "task_order": 86,
        "assignee": "User"
    },
    {
        "title": "BullMQ Rate-Limited DM Queue",
        "description": """Implement DM sending queue with rate limiting and staggered timing.

**Tech Stack:**
- BullMQ with Upstash Redis
- Rate limit: 50 DMs/day per account
- Staggered delays: 2-15 minutes random

**Reference:** 01-RevOS-Technical-Architecture-v3.md, 04-MVP-Feature-Specification.md
**Branch:** lead-magnet-features
**Points:** 8""",
        "status": "todo",
        "feature": "DM Automation",
        "branch": "lead-magnet-features",
        "task_order": 85,
        "assignee": "User"
    },

    # SESSION 4: Email Capture + Webhook + Mailgun (20 points)
    {
        "title": "Email Extraction from DM Replies",
        "description": """Extract email addresses from LinkedIn DM replies using GPT-4o.

**Flow:**
1. Monitor DM replies via Unipile webhook (new_message)
2. Extract email with GPT-4o
3. Store in leads table with status 'email_captured'

**Reference:** 10-RevOS-MVP-80-20-Analysis-ICE-Scoring.md lines 264-277
**Branch:** lead-magnet-features
**Points:** 5""",
        "status": "todo",
        "feature": "Email Capture",
        "branch": "lead-magnet-features",
        "task_order": 84,
        "assignee": "User"
    },
    {
        "title": "Webhook to Client CRM/ESP",
        "description": """POST captured leads to client's webhook endpoint (Zapier, Make, CRM).

**CRITICAL: This is NOT email sending. Just HTTP POST to client's webhook.**

**Features:**
- Configurable webhook URL per campaign
- Retry logic (3 attempts with exponential backoff)
- Webhook delivery tracking (success/failed)
- Test webhook button in UI

**Reference:** 10-RevOS-MVP-80-20-Analysis-ICE-Scoring.md lines 264-277
**Branch:** lead-magnet-features
**Points:** 10""",
        "status": "todo",
        "feature": "CRM Integration",
        "branch": "lead-magnet-features",
        "task_order": 83,
        "assignee": "User"
    },
    {
        "title": "Mailgun One-Time Lead Magnet Delivery",
        "description": """Send lead magnet email via Mailgun (one-time only, NOT sequences).

**CRITICAL: Client handles sequences via their newsletter. This is ONLY for initial lead magnet.**

**Features:**
- Lead magnet download link (Supabase Storage URL)
- Unsubscribe link (required by CAN-SPAM)
- Client branding

**Mailgun Free Tier:** 5,000 emails/month
**Reference:** 10-RevOS-MVP-80-20-Analysis-ICE-Scoring.md lines 280-317
**Branch:** lead-magnet-features
**Points:** 5""",
        "status": "todo",
        "feature": "Email Delivery",
        "branch": "lead-magnet-features",
        "task_order": 82,
        "assignee": "User"
    },

    # SESSION 5: Engagement Pods (15 points)
    {
        "title": "Pod Database Schema",
        "description": """Create engagement pods tables and RLS policies.

**Tables:** pods, pod_members, pod_rotations
**RLS Policies:** Tenant isolation, member-only access

**Reference:** 10-RevOS-MVP-80-20-Analysis-ICE-Scoring.md lines 384-423
**Branch:** lead-magnet-features
**Points:** 5""",
        "status": "todo",
        "feature": "Engagement Pods",
        "branch": "lead-magnet-features",
        "task_order": 81,
        "assignee": "User"
    },
    {
        "title": "Pod Creation and LinkedIn Session Capture",
        "description": """Build pod management UI with LinkedIn session capture.

**Features:**
1. Create pod (name, description, min 9 members)
2. Invite members via email
3. LinkedIn session capture (Unipile hosted auth)
4. Store account_id in linkedin_sessions

**Security:** All session data encrypted at rest
**Reference:** 10-RevOS-MVP-80-20-Analysis-ICE-Scoring.md lines 384-423
**Branch:** lead-magnet-features
**Points:** 5""",
        "status": "todo",
        "feature": "Engagement Pods",
        "branch": "lead-magnet-features",
        "task_order": 80,
        "assignee": "User"
    },
    {
        "title": "Fair Rotation Algorithm",
        "description": """Implement pod engagement rotation with fairness algorithm.

**Algorithm:**
- Select members with lowest participation_score
- Exclude poster
- Assign 3-5 members to engage (like, comment)
- Track completion and update participation_score

**Reference:** 10-RevOS-MVP-80-20-Analysis-ICE-Scoring.md lines 384-423
**Branch:** lead-magnet-features
**Points:** 5""",
        "status": "todo",
        "feature": "Engagement Pods",
        "branch": "lead-magnet-features",
        "task_order": 79,
        "assignee": "User"
    },

    # SESSION 6: AgentKit + Mem0 (10 points)
    {
        "title": "AgentKit Campaign Orchestration",
        "description": """Integrate AgentKit for AI-powered campaign management.

**Custom Tools:**
- createCampaign(name, targetPost, dmTemplate)
- getDMStats(campaignId)
- optimizeMessage(currentMessage, performance)

**Reference:** 05-MCP-Integration-Guide.md, 01-RevOS-Technical-Architecture-v3.md
**Branch:** lead-magnet-features
**Points:** 5""",
        "status": "todo",
        "feature": "AI Orchestration",
        "branch": "lead-magnet-features",
        "task_order": 78,
        "assignee": "User"
    },
    {
        "title": "Mem0 Cartridge Memory Integration",
        "description": """Integrate Mem0 for persistent cartridge and conversation memory.

**Tenant Isolation:** Use composite keys tenantId::userId
**Pricing:** $20/month Pro plan (100k messages, 50k memories)
**Reference:** 05-MCP-Integration-Guide.md lines 60-120
**Branch:** lead-magnet-features
**Points:** 5""",
        "status": "todo",
        "feature": "AI Memory",
        "branch": "lead-magnet-features",
        "task_order": 77,
        "assignee": "User"
    },

    # SESSION 7: Monitoring + Testing (5 points)
    {
        "title": "Campaign Monitoring Dashboard",
        "description": """Build real-time monitoring dashboard for campaigns.

**Metrics:**
- Comments captured (total, today, this week)
- DMs sent (total, daily rate per account)
- Email extraction rate (%)
- Webhook delivery success rate (%)
- Lead magnet emails sent
- Engagement pod activity

**Tech:** React + Recharts, Supabase real-time subscriptions
**Reference:** 10-RevOS-MVP-80-20-Analysis-ICE-Scoring.md
**Branch:** lead-magnet-features
**Points:** 3""",
        "status": "todo",
        "feature": "Monitoring",
        "branch": "lead-magnet-features",
        "task_order": 76,
        "assignee": "User"
    }
]

def main():
    print("=" * 60)
    print("BRAVO REVOS - TASK CORRECTION VIA SUPABASE")
    print("=" * 60)
    print("\nBased on: CRITICAL-REVIEW-TASK-ERRORS.md")
    print("Source: 10-RevOS-MVP-80-20-Analysis-ICE-Scoring.md\n")

    # Test connection
    try:
        result = supabase.table('archon_projects').select('id, title').eq('id', PROJECT_ID).execute()
        if not result.data:
            print("❌ Project not found")
            sys.exit(1)
        print(f"✓ Connected to Supabase")
        print(f"✓ Project: {result.data[0]['title']}")
    except Exception as e:
        print(f"❌ Supabase connection failed: {e}")
        sys.exit(1)

    # Step 1: Get existing tasks
    print("\n" + "=" * 60)
    print("STEP 1: FETCH EXISTING TASKS")
    print("=" * 60)

    try:
        existing = supabase.table('archon_tasks')\
            .select('id, title, status')\
            .eq('project_id', PROJECT_ID)\
            .execute()

        print(f"\nFound {len(existing.data)} existing tasks")

        if len(existing.data) > 0:
            proceed = input(f"\nDelete all {len(existing.data)} existing tasks? (yes/no): ")
            if proceed.lower() != 'yes':
                print("Aborted.")
                sys.exit(0)

            # Delete existing tasks
            print("\nDeleting existing tasks...")
            for task in existing.data:
                supabase.table('archon_tasks').delete().eq('id', task['id']).execute()
                print(f"  ✓ Deleted: {task['title'][:50]}...")

            print(f"\n✓ Deleted {len(existing.data)} tasks")

    except Exception as e:
        print(f"❌ Failed to fetch/delete tasks: {e}")
        sys.exit(1)

    # Step 2: Create corrected tasks
    print("\n" + "=" * 60)
    print("STEP 2: CREATE CORRECTED TASKS")
    print("=" * 60)
    print(f"\nTotal tasks to create: {len(TASKS)}")
    print(f"Total points: 100")

    created_count = 0
    failed_count = 0

    for idx, task in enumerate(TASKS, 1):
        try:
            task_data = {
                "project_id": PROJECT_ID,
                "title": task["title"],
                "description": task["description"],
                "status": task["status"],
                "feature": task.get("feature"),
                "branch": task.get("branch"),
                "task_order": task.get("task_order"),
                "assignee": task.get("assignee", "User")
            }

            supabase.table('archon_tasks').insert(task_data).execute()
            created_count += 1

            # Extract points from description
            points = task['description'].split('**Points:** ')[1].split('\n')[0] if '**Points:**' in task['description'] else '?'
            print(f"✓ [{idx}/{len(TASKS)}] Created: {task['title'][:40]}... ({points} pts, {task['branch']})")

        except Exception as e:
            failed_count += 1
            print(f"❌ [{idx}/{len(TASKS)}] Failed: {task['title'][:40]}...")
            print(f"   Error: {e}")

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"✓ Created: {created_count} tasks")
    if failed_count > 0:
        print(f"❌ Failed: {failed_count} tasks")
    print(f"\n📊 Total MVP Points: 100")
    print(f"📦 Branches: bolt-scaffold, cartridge-system, lead-magnet-features")
    print(f"🎯 Tech Stack: Unipile API, BullMQ, Mailgun, Supabase, AgentKit, Mem0")
    print(f"⚠️  NO Playwright in MVP (V2 only)")
    print("\n✅ Task correction complete!")
    print("🎯 Next: Verify tasks in AgroArchon UI")

if __name__ == "__main__":
    main()
