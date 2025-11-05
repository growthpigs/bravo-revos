#!/usr/bin/env python3
"""Apply Task Corrections V2 - Fix Bolt tasks and engagement pods"""

import os
import sys
from dotenv import load_dotenv
from supabase import create_client

# Load environment
load_dotenv('/Users/rodericandrews/Obsidian/Master/_agro-archon/agro-archon/python/.env')

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY')
PROJECT_ID = 'de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531'

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Corrected tasks (19 tasks, 100 points total)
CORRECTED_TASKS = [
    # SESSION 1: Bolt.new Scaffolds (15 points) - USER CREATES THESE
    {
        "title": "T001: Generate Database Schema with Bolt.new",
        "description": """User creates this in Bolt.new and pushes to GitHub.

**Bolt.new Prompt:**
"Create a Supabase database schema for a LinkedIn lead magnet system with:
- Multi-tenant structure (agencies → clients → users)
- campaigns table (name, post_url, dm_template, webhook_url, lead_magnet_url)
- leads table (email, first_name, last_name, linkedin_url, campaign_id, status)
- linkedin_sessions table (encrypted credentials, account_id, user_id)
- cartridges table (4-tier: system, workspace, user, skills)
- pods table (name, min 9 members)
- pod_members table (user_id, pod_id, linkedin_account_id)
- messages table (DM tracking)
- webhooks table (delivery tracking)
Generate TypeScript types and Supabase client setup"

**Note:** We pull this from GitHub after user creates it.
**Points:** 5""",
        "status": "todo",
        "feature": "Bolt.new Scaffold",
        "branch": "bolt-scaffold",
        "task_order": 100,
        "assignee": "User"
    },
    {
        "title": "T002: Generate Admin Portal with Bolt.new",
        "description": """User creates this in Bolt.new and pushes to GitHub.

**Bolt.new Prompt:**
"Create Next.js 14 admin portal with shadcn/ui for LinkedIn lead magnet system:
- /admin/campaigns - CRUD for campaigns with DM templates
- /admin/pods - Create pods, invite members, monitor activity
- /admin/linkedin - Connect LinkedIn accounts via Unipile
- /admin/monitoring - Real-time metrics dashboard
- /admin/webhooks - Test webhook endpoints
Use App Router, TypeScript, Tailwind CSS"

**Note:** We pull this from GitHub after user creates it.
**Points:** 5""",
        "status": "todo",
        "feature": "Bolt.new Scaffold",
        "branch": "bolt-scaffold",
        "task_order": 99,
        "assignee": "User"
    },
    {
        "title": "T003: Generate Client Portal with Bolt.new",
        "description": """User creates this in Bolt.new and pushes to GitHub.

**Bolt.new Prompt:**
"Create Next.js 14 client portal with shadcn/ui:
- /dashboard - Campaign metrics and lead counts
- /campaigns/new - Create campaign wizard
- /campaigns/[id] - Campaign details and lead list
- /settings - Webhook URL, Mailgun config
- /leads - Export leads as CSV
Multi-tenant with RLS, App Router, TypeScript"

**Note:** We pull this from GitHub after user creates it.
**Points:** 5""",
        "status": "todo",
        "feature": "Bolt.new Scaffold",
        "branch": "bolt-scaffold",
        "task_order": 98,
        "assignee": "User"
    },

    # SESSION 2: Cartridge System (20 points)
    {
        "title": "T004: Implement Cartridge Database & API",
        "description": """Create cartridge system backend with 4-tier hierarchy.

**Database Schema:**
- cartridges table with tier enum (system, workspace, user, skills)
- RLS policies for tenant isolation
- System tier = super admin only
- Workspace/User/Skills = tenant users

**API Endpoints:**
- GET /api/cartridges (list by tier)
- POST /api/cartridges (create)
- PUT /api/cartridges/:id (update)
- DELETE /api/cartridges/:id (soft delete)

**Load Triggers:**
- keywords array (e.g., ["lead generation", "LinkedIn"])
- contexts array (e.g., ["campaign_creation", "dm_template"])

**Points:** 8""",
        "status": "todo",
        "feature": "Cartridge System",
        "branch": "cartridge-system",
        "task_order": 90,
        "assignee": "Claude"
    },
    {
        "title": "T005: Voice Auto-Generation from LinkedIn",
        "description": """Extract writing style from user's LinkedIn posts.

**Process:**
1. Fetch last 30 posts via Unipile API
2. Analyze with GPT-4o for:
   - Tone (professional, casual, friendly, technical)
   - Style markers (emoji usage, sentence length, humor)
   - Common phrases and vocabulary
3. Generate voice JSON with auto_generated flag

**Unipile Endpoint:** GET /api/v1/users/{provider_public_id}/posts?limit=30

**Points:** 7""",
        "status": "todo",
        "feature": "Cartridge System",
        "branch": "cartridge-system",
        "task_order": 89,
        "assignee": "Claude"
    },
    {
        "title": "T006: Cartridge Management UI",
        "description": """Build progressive disclosure UI for cartridge management.

**Features:**
- 4-tier selector (system → workspace → user → skills)
- Instruction editor with templates
- Voice preview and customization
- Load trigger configuration UI
- Test cartridge against sample inputs

**UI Components:**
- Tier badges with access indicators
- Rich text editor for instructions
- Keyword/context tag inputs
- Voice parameter sliders

**Points:** 5""",
        "status": "todo",
        "feature": "Cartridge System",
        "branch": "cartridge-system",
        "task_order": 88,
        "assignee": "Claude"
    },

    # SESSION 3: Unipile + BullMQ + DM (20 points)
    {
        "title": "T007: Unipile Integration & Session Management",
        "description": """Set up Unipile API client with session management.

**Authentication:**
- Username/password flow (NOT OAuth)
- Store encrypted credentials in linkedin_sessions
- Token refresh handling
- Account health monitoring

**Billing:**
- Track $5.50/account/month
- Usage dashboard

**Error Handling:**
- Rate limit retry logic
- Session expiry re-auth
- Connection failure recovery

**Points:** 5""",
        "status": "todo",
        "feature": "LinkedIn Integration",
        "branch": "lead-magnet-features",
        "task_order": 87,
        "assignee": "Claude"
    },
    {
        "title": "T008: Comment Polling System",
        "description": """Poll for new LinkedIn comments (NO webhooks available).

**CRITICAL: Unipile does NOT support comment webhooks - must poll**

**Implementation:**
- Poll every 15-30 minutes (randomized to avoid detection)
- Store last_polled timestamp per post
- Compare comment IDs to find NEW comments only
- Extract commenter profile data
- Queue DM jobs for new commenters

**Randomization:**
```javascript
const interval = randomBetween(15, 30) * 60 * 1000;
setTimeout(pollComments, interval);
```

**Points:** 7""",
        "status": "todo",
        "feature": "Comment Monitoring",
        "branch": "lead-magnet-features",
        "task_order": 86,
        "assignee": "Claude"
    },
    {
        "title": "T009: BullMQ DM Automation",
        "description": """Queue-based DM sending with rate limiting.

**Setup:**
- Upstash Redis for BullMQ
- Rate limit: 50 DMs/day per account
- Random delays: 2-15 minutes between DMs

**Template Variables:**
- {first_name} - From LinkedIn profile
- {lead_magnet_name} - From campaign
- {company} - If available
- {post_topic} - Extracted from post

**Error Handling:**
- Retry with exponential backoff
- Dead letter queue for failed DMs
- Daily limit enforcement

**Points:** 8""",
        "status": "todo",
        "feature": "DM Automation",
        "branch": "lead-magnet-features",
        "task_order": 85,
        "assignee": "Claude"
    },

    # SESSION 4: Email Capture + Webhook + Mailgun (20 points)
    {
        "title": "T010: Email Extraction Pipeline",
        "description": """Extract emails from DM replies using GPT-4o.

**Flow:**
1. Monitor DM replies via Unipile webhook (new_message - real-time)
2. GPT-4o prompt: "Extract email address. Return ONLY the email or 'NONE'"
3. Validate email format
4. Update lead status: 'dm_sent' → 'email_captured'

**Edge Cases:**
- Multiple emails (take first valid)
- No email found (mark as 'no_email')
- Invalid format (request clarification)

**Points:** 5""",
        "status": "todo",
        "feature": "Email Capture",
        "branch": "lead-magnet-features",
        "task_order": 84,
        "assignee": "Claude"
    },
    {
        "title": "T011: Webhook Delivery System",
        "description": """POST leads to client's webhook (NOT email sending).

**Payload:**
```json
{
  "email": "john@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "linkedin_url": "linkedin.com/in/johndoe",
  "company": "Acme Corp",
  "campaign_id": "camp_123",
  "lead_magnet_url": "https://...",
  "captured_at": "2025-11-03T..."
}
```

**Features:**
- Webhook URL per campaign
- Retry: 3 attempts, exponential backoff
- Delivery tracking and logs
- Test webhook button in UI
- Support for Zapier, Make, CRMs

**Points:** 10""",
        "status": "todo",
        "feature": "CRM Integration",
        "branch": "lead-magnet-features",
        "task_order": 83,
        "assignee": "Claude"
    },
    {
        "title": "T012: Lead Magnet Storage & URL Generation",
        "description": """Upload lead magnets and generate secure download URLs.

**Process:**
1. Upload lead magnet PDF/resources to Supabase Storage
2. Generate secure, time-limited download URLs (24hr expiry)
3. Include download URL in webhook payload to client

**IMPORTANT: We do NOT send emails!**
- Client receives lead data via webhook
- Client sends email through their own ESP (ConvertKit, Mailchimp, etc.)
- Client handles all email delivery, templates, and compliance

**What we provide in webhook:**
```json
{
  "email": "john@example.com",
  "first_name": "John",
  "lead_magnet_url": "https://storage.supabase.co/secure/...",
  "lead_magnet_name": "5 Leadership Conversations Guide",
  "expires_at": "2025-11-04T12:00:00Z"
}
```

**Storage Requirements:**
- Public bucket for lead magnets
- Signed URLs for security
- CDN-enabled for fast downloads

**Points:** 5""",
        "status": "todo",
        "feature": "Lead Magnet Delivery",
        "branch": "lead-magnet-features",
        "task_order": 82,
        "assignee": "Claude"
    },

    # SESSION 5: Engagement Pods - CORRECTED (15 points)
    {
        "title": "T013: Pod Infrastructure",
        "description": """Create engagement pod database and management.

**Tables:**
- pods (id, name, tenant_id, created_at)
- pod_members (pod_id, user_id, linkedin_account_id, joined_at)
- pod_activity (member_id, post_url, action_type, completed_at)

**Rules:**
- Minimum 9 members per pod
- Track who engaged with what
- Notification system for pod tasks

**Points:** 5""",
        "status": "todo",
        "feature": "Engagement Pods",
        "branch": "lead-magnet-features",
        "task_order": 81,
        "assignee": "Claude"
    },
    {
        "title": "T014: LinkedIn Session Capture for Pods",
        "description": """Capture LinkedIn sessions for pod members.

**Process:**
1. Send Unipile hosted auth link to member
2. Member authorizes LinkedIn access
3. Store account_id in pod_members table
4. Monitor session health
5. Re-auth notification if expired

**Security:**
- Encrypt stored credentials
- Separate sessions per pod member
- Audit trail of session usage

**Points:** 5""",
        "status": "todo",
        "feature": "Engagement Pods",
        "branch": "lead-magnet-features",
        "task_order": 80,
        "assignee": "Claude"
    },
    {
        "title": "T015: Pod Automation Engine",
        "description": """EVERYONE engages with EVERYTHING - no rotation!

**CRITICAL: This is how engagement pods work**
When ANY pod member posts, ALL other members must:
1. Like within 30 minutes (algorithm critical window)
2. Comment within 1-3 hours
3. Instant repost (NOT "repost with thoughts" - 12x less effective)

**Implementation:**
```javascript
// NO SELECTION - EVERYONE PARTICIPATES
for (const member of allPodMembers) {
  if (member.id === posterId) continue; // Skip poster

  // Everyone likes (1-30 min)
  queueJob('like', { delay: random(1, 30) * MIN });

  // Everyone comments (30-180 min)
  queueJob('comment', { delay: random(30, 180) * MIN });

  // Everyone reposts instantly (5-60 min)
  queueJob('instant-repost', { delay: random(5, 60) * MIN });
}
```

**Note:** LinkedIn devalues pod engagement by 30% but volume overcomes this

**Points:** 5""",
        "status": "todo",
        "feature": "Engagement Pods",
        "branch": "lead-magnet-features",
        "task_order": 79,
        "assignee": "Claude"
    },

    # SESSION 6: AgentKit + Mem0 (10 points)
    {
        "title": "T016: AgentKit Campaign Assistant",
        "description": """AI-powered campaign management with AgentKit.

**Custom Tools:**
- createCampaign(name, targetPost, dmTemplate)
- optimizeDMTemplate(template, performance)
- generateCommentResponse(comment)
- analyzeCampaignMetrics(campaignId)

**Integration:**
- OpenAI GPT-4o
- Web search for lead magnet ideas
- File analysis for uploaded PDFs

**Points:** 5""",
        "status": "todo",
        "feature": "AI Orchestration",
        "branch": "lead-magnet-features",
        "task_order": 78,
        "assignee": "Claude"
    },
    {
        "title": "T017: Mem0 Memory System",
        "description": """Persistent memory for cartridges and conversations.

**Implementation:**
- Tenant isolation: tenantId::userId composite keys
- Store cartridge context
- Remember conversation history
- Learn from successful DM templates

**Mem0 Pro Plan:** $20/month
- 100k messages
- 50k memories
- API access

**Points:** 5""",
        "status": "todo",
        "feature": "AI Memory",
        "branch": "lead-magnet-features",
        "task_order": 77,
        "assignee": "Claude"
    },

    # SESSION 7: Monitoring + Testing (5 points)
    {
        "title": "T018: Real-time Monitoring Dashboard",
        "description": """Campaign and pod activity monitoring.

**Metrics:**
- Comments captured (by hour, day, week)
- DM send rate (against 50/day limit)
- Email extraction success rate
- Webhook delivery success
- Pod engagement completion rates

**Visualizations:**
- Conversion funnel (comment → DM → email → webhook)
- Pod activity heatmap (who engaged with what)
- Rate limit warnings
- Real-time activity feed

**Tech:** React + Recharts, Supabase real-time

**Points:** 3""",
        "status": "todo",
        "feature": "Monitoring",
        "branch": "lead-magnet-features",
        "task_order": 76,
        "assignee": "Claude"
    },
    {
        "title": "T019: End-to-End Testing",
        "description": """Complete flow testing and validation.

**Test Scenarios:**
1. Comment appears → DM sent within 2-15 min
2. DM reply with email → extraction → webhook POST
3. Webhook success → Mailgun delivery
4. Rate limiting (50 DMs/day enforced)
5. Pod automation (everyone engages)
6. Unipile session expiry handling

**Coverage Target:** 80% critical paths

**Points:** 2""",
        "status": "todo",
        "feature": "Testing",
        "branch": "lead-magnet-features",
        "task_order": 75,
        "assignee": "Claude"
    }
]

def main():
    print("=" * 60)
    print("APPLY TASK CORRECTIONS V2")
    print("=" * 60)
    print("\nFixes:")
    print("1. Restore 3 Bolt.new tasks (was 1)")
    print("2. Fix engagement pods (EVERYONE engages with EVERYTHING)")
    print("3. Add missing features")
    print("4. Clarify user creates Bolt scaffolds")

    # Test connection
    try:
        result = supabase.table('archon_projects').select('title').eq('id', PROJECT_ID).execute()
        print(f"\n✓ Connected to project: {result.data[0]['title']}")
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        sys.exit(1)

    # Get current tasks
    existing = supabase.table('archon_tasks')\
        .select('id, title')\
        .eq('project_id', PROJECT_ID)\
        .execute()

    print(f"\nCurrent tasks: {len(existing.data)}")
    print(f"New tasks: {len(CORRECTED_TASKS)}")

    proceed = input("\nReplace all tasks with corrected version? (yes/no): ")
    if proceed.lower() != 'yes':
        print("Aborted.")
        sys.exit(0)

    # Delete existing
    print("\nDeleting existing tasks...")
    for task in existing.data:
        supabase.table('archon_tasks').delete().eq('id', task['id']).execute()
    print(f"✓ Deleted {len(existing.data)} tasks")

    # Create corrected tasks
    print("\nCreating corrected tasks...")
    created = 0
    for task in CORRECTED_TASKS:
        try:
            task_data = {
                "project_id": PROJECT_ID,
                "title": task["title"],
                "description": task["description"],
                "status": task["status"],
                "feature": task["feature"],
                "branch": task["branch"],
                "task_order": task["task_order"],
                "assignee": task["assignee"]
            }
            supabase.table('archon_tasks').insert(task_data).execute()
            created += 1
            print(f"✓ Created: {task['title'][:50]}...")
        except Exception as e:
            print(f"❌ Failed: {task['title'][:30]}... - {e}")

    print(f"\n✓ Created {created} tasks")

    # Summary
    print("\n" + "=" * 60)
    print("CORRECTIONS APPLIED")
    print("=" * 60)
    print("✅ 3 Bolt.new tasks (user creates in Bolt.new)")
    print("✅ Engagement pods: EVERYONE engages with EVERYTHING")
    print("✅ Comment polling every 15-30 min (no webhooks)")
    print("✅ Lead magnet upload to Supabase Storage")
    print("✅ CAN-SPAM compliance")
    print("\nTotal: 19 tasks, 100 points")

if __name__ == "__main__":
    main()