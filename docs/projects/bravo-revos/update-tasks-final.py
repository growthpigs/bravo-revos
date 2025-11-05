#!/usr/bin/env python3
"""
Update Supabase tasks with the final corrected 19 tasks from CORRECTED-TASKS-FINAL.md
"""

import os
from supabase import create_client, Client
from datetime import datetime

# Supabase credentials (from Archon)
SUPABASE_URL = "https://kvjcidxbyimoswntpjcp.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2amNpZHhieWltb3N3bnRwamNwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTEyMzc0MywiZXhwIjoyMDc2Njk5NzQzfQ.3y85fEIn6icsDTFUKPRlaDqedBCL7Mu0hKTIUNfhLW8"
PROJECT_ID = "de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531"

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Define the 19 corrected tasks
tasks = [
    # Session 1: Bolt.new UI Generation (15 points)
    {
        "title": "T001: Generate Database Schema with Bolt.new",
        "description": """User creates the database schema in Bolt.new, then pushes to GitHub for integration.

**Bolt.new Prompt:**
Create a Supabase database schema for a LinkedIn lead magnet system with:

MULTI-TENANT STRUCTURE (CRITICAL):
- agencies table (top level)
- clients table (belongs to agencies)
- users table (belongs to clients)

CAMPAIGN TABLES:
- campaigns (name, trigger_word, lead_magnet_id, webhook_config_id, dm_templates)
- lead_magnets (file_path for Supabase Storage, name, description)
- leads (email, linkedin_id, status: comment_detected→dm_sent→email_captured→webhook_sent→backup_sent)

LINKEDIN TABLES:
- linkedin_accounts (encrypted credentials, unipile_account_id, session)
- posts (content, trigger_word, unipile_post_id, last_polled_at)
- comments (has_trigger_word boolean, dm_sent boolean)
- dm_sequences (3-step tracking: step1_sent_at, step2_sent_at, step3_sent_at, download_url)

CARTRIDGE SYSTEM:
- cartridges (4-tier: system, workspace, user, skill)
- Voice parameters: tone, style, personality, vocabulary
- Parent-child relationships for inheritance

ENGAGEMENT PODS:
- pods (name, min 9 members, auto_engage=true)
- pod_members (user_id, pod_id, linkedin_account_id)
- pod_activities (like/comment/repost tracking)

WEBHOOK DELIVERY:
- webhook_configs (url, secret, headers, esp_type: zapier|make|convertkit)
- webhook_deliveries (payload, status, retry_count)

Include TypeScript types, Supabase client setup, and RLS policies for multi-tenancy.

**Reference:** data-model.md, spec.md lines 258-304""",
        "status": "todo",
        "feature": "Database Schema",
        "branch": "bolt-scaffold",
        "task_order": 10,
        "assignee": "User",
        "points": 5
    },
    {
        "title": "T002: Generate Admin Portal UI with Bolt.new",
        "description": """User creates the admin interface in Bolt.new for agency administrators.

**Bolt.new Prompt:**
Create Next.js 14 admin portal (route: /admin) with shadcn/ui:

IMPORTANT: This is ONE app with role-based routing, NOT a separate application.

PAGES NEEDED:
/admin/dashboard - System metrics, client overview
/admin/clients - Manage all clients (CRUD)
/admin/campaigns - View all campaigns across clients
/admin/linkedin - LinkedIn account health monitoring
/admin/webhooks - Webhook delivery analytics
/admin/pods - Engagement pod management

UI COMPONENTS:
- DataTable with filtering/sorting (use tanstack-table)
- Metric cards showing KPIs
- Real-time status indicators
- Campaign performance charts (use recharts)

FEATURES:
- Multi-tenant data filtering
- Client impersonation
- System-wide analytics
- API usage monitoring

Use App Router, TypeScript, Tailwind CSS, shadcn/ui components.
Role check: user.role === 'admin' at agency level.

**Reference:** spec.md lines 223-231""",
        "status": "todo",
        "feature": "Admin UI",
        "branch": "bolt-scaffold",
        "task_order": 11,
        "assignee": "User",
        "points": 5
    },
    {
        "title": "T003: Generate Client Dashboard UI with Bolt.new",
        "description": """User creates the client dashboard in Bolt.new for business users.

**Bolt.new Prompt:**
Create Next.js 14 client dashboard (route: /dashboard) with shadcn/ui:

IMPORTANT: Same app as admin, just different routes with role-based access.

PAGES NEEDED:
/dashboard - Campaign metrics, lead counts, conversion funnel
/dashboard/campaigns/new - Campaign creation wizard
/dashboard/campaigns/[id] - Campaign details, lead list
/dashboard/leads - Export leads as CSV
/dashboard/settings/webhooks - Configure ESP webhooks
/dashboard/settings/voice - Voice cartridge settings

CAMPAIGN WIZARD STEPS:
1. Lead magnet upload (to Supabase Storage)
2. Content creation (AI or manual mode toggle)
3. Trigger word selection
4. Webhook configuration (ESP presets: Zapier, Make, etc)
5. DM sequence settings (delays, backup DM toggle)
6. Review and launch

KEY COMPONENTS:
- Campaign creation wizard (multi-step form)
- Lead table with export
- Webhook test tool
- Voice preview
- Real-time metrics

Use App Router, TypeScript, Tailwind CSS, shadcn/ui.
Multi-tenant isolation via RLS.

**Reference:** spec.md lines 233-244, WEBHOOK-SETTINGS-UI.md""",
        "status": "todo",
        "feature": "Client UI",
        "branch": "bolt-scaffold",
        "task_order": 12,
        "assignee": "User",
        "points": 5
    },

    # Session 2: Cartridge System (20 points)
    {
        "title": "T004: Implement Cartridge Database & API",
        "description": """Create the 4-tier cartridge system for voice and knowledge management.

**Features:**
1. CRUD API endpoints for cartridges
2. 4-tier hierarchy: system → workspace → user → skills
3. RLS policies for tenant isolation
4. Inheritance merge logic
5. Load trigger mechanism

**API Endpoints:**
- POST /api/cartridges - Create cartridge
- GET /api/cartridges - List by tier
- PATCH /api/cartridges/:id - Update
- GET /api/cartridges/:id/merged - Get with inheritance

**Database Schema:**
```sql
CREATE TABLE cartridges (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  tier TEXT CHECK (tier IN ('system', 'workspace', 'user', 'skill')),
  name TEXT NOT NULL,
  voice JSONB DEFAULT '{}',
  knowledge JSONB DEFAULT '{}',
  parent_cartridge_id UUID REFERENCES cartridges(id),
  auto_generate BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true
);
```

**Reference:** spec.md lines 90-94, data-model.md lines 721-753""",
        "status": "todo",
        "feature": "Cartridge System",
        "branch": "cartridge-system",
        "task_order": 20,
        "assignee": "Assistant",
        "points": 8
    },
    {
        "title": "T005: Voice Auto-Generation from LinkedIn",
        "description": """Implement automatic voice generation by analyzing user's last 30 LinkedIn posts.

**Process:**
1. Fetch last 30 posts via Unipile API
2. GPT-4o analysis for pattern extraction
3. Extract: tone, style, personality, vocabulary, phrases
4. Store in user cartridge
5. Refresh capability

**Unipile API Call:**
```javascript
const posts = await unipile.getUserPosts({
  accountId: linkedinAccountId,
  limit: 30
});
```

**GPT-4 Analysis:**
- Writing tone (professional/casual/inspirational)
- Communication style (conversational/authoritative/storytelling)
- Personality traits (3-5)
- Vocabulary level
- Common phrases (5-10)
- Emoji usage patterns

**Reference:** spec.md line 92, SKILLS-AND-VOICE-INTEGRATION.md lines 96-122""",
        "status": "todo",
        "feature": "Voice Generation",
        "branch": "cartridge-system",
        "task_order": 21,
        "assignee": "Assistant",
        "points": 7
    },
    {
        "title": "T006: Cartridge Management UI",
        "description": """Build the UI for managing cartridges with progressive disclosure.

**Features:**
1. 4-tier progressive disclosure UI
2. System templates (read-only)
3. Workspace voices (editable)
4. Personal voice editor
5. Auto-generation trigger button
6. Voice preview with sample text
7. Inheritance visualization

**Components:**
- CartridgeManager (main container)
- CartridgeList (tier display)
- VoiceEditor (edit interface)
- VoicePreview (test output)

**Reference:** spec.md lines 252-254""",
        "status": "todo",
        "feature": "Cartridge UI",
        "branch": "cartridge-system",
        "task_order": 22,
        "assignee": "Assistant",
        "points": 5
    },

    # Session 3: Unipile + BullMQ + DM (20 points)
    {
        "title": "T007: Unipile Integration & Session Management",
        "description": """Set up Unipile API client with session management and encryption.

**CRITICAL:** All LinkedIn operations go through Unipile API. We NEVER connect directly to LinkedIn.

**Features:**
1. Username/password authentication (NOT OAuth)
2. Encrypted credential storage
3. Session refresh handling (90-day expiry)
4. Rate limit tracking
5. Account health monitoring

**Pricing:** $5.50/account/month

**Key Operations:**
- createPost() - Publish content
- getPostComments() - Poll for comments (NO webhook)
- sendMessage() - Send DMs
- getConversationMessages() - Monitor DM replies

**Reference:** spec.md lines 311-330, unipile-api-research.md""",
        "status": "todo",
        "feature": "Unipile Setup",
        "branch": "lead-magnet-features",
        "task_order": 30,
        "assignee": "Assistant",
        "points": 5
    },
    {
        "title": "T008: Comment Polling System",
        "description": """Implement polling system for comment detection since Unipile has NO webhook for comments.

**CRITICAL:** Must poll every 15-30 minutes. No real-time webhooks available for comments.

**Features:**
1. Randomized polling intervals (15-30 min)
2. Track last_polled_at timestamp per post
3. Trigger word detection (case-insensitive)
4. Comment deduplication
5. Queue DM jobs for matches

**Implementation:**
- Poll all active campaign posts
- Check for trigger word in new comments
- Queue DM with 2-15 min random delay
- Update last_polled_at timestamp

**Reference:** spec.md lines 118-131, COMPREHENSIVE-LEAD-FLOW.md lines 146-186""",
        "status": "todo",
        "feature": "Comment Polling",
        "branch": "lead-magnet-features",
        "task_order": 31,
        "assignee": "Assistant",
        "points": 7
    },
    {
        "title": "T009: BullMQ DM Automation",
        "description": """Implement rate-limited DM queue with BullMQ and Upstash Redis.

**Rate Limits:**
- Max 50 DMs/day per account
- Min 2 minutes between DMs
- Random delays 2-15 minutes

**Features:**
1. Upstash Redis connection
2. Daily limit tracking and reset
3. Copywriting skill integration
4. Voice cartridge transformation
5. Retry with exponential backoff
6. 3-step DM sequence support

**Message Generation Flow:**
Copywriting Skill → Voice Cartridge → Unipile Send

**Reference:** spec.md lines 133-157, THREE-STEP-DM-SEQUENCE.md""",
        "status": "todo",
        "feature": "DM Queue",
        "branch": "lead-magnet-features",
        "task_order": 32,
        "assignee": "Assistant",
        "points": 8
    },

    # Session 4: Lead Capture + Webhook Delivery (20 points)
    {
        "title": "T010: Email Extraction Pipeline",
        "description": """Extract emails from DM replies using regex + GPT-4 validation.

**Process:**
1. Monitor DM replies via Unipile webhook (new_message)
2. Try regex extraction first
3. GPT-4o fallback for complex cases
4. Handle multiple emails
5. Send clarification if needed
6. Update lead status: 'dm_sent' → 'email_captured'

**Email Validation:**
- RFC 5322 compliant
- Multiple email handling
- Clarification requests

**Reference:** spec.md lines 159-177, THREE-STEP-DM-SEQUENCE.md lines 329-383""",
        "status": "todo",
        "feature": "Email Extraction",
        "branch": "lead-magnet-features",
        "task_order": 40,
        "assignee": "Assistant",
        "points": 5
    },
    {
        "title": "T011: Webhook to Client ESP",
        "description": """POST lead data to client's webhook endpoint (Zapier, Make, or direct ESP).

**CRITICAL:** We do NOT send emails. We only POST data to webhooks. Client's ESP handles email delivery.

**Webhook Payload:**
```json
{
  "email": "john@example.com",
  "first_name": "John",
  "lead_magnet_name": "10x Leadership Framework",
  "lead_magnet_url": "https://storage.supabase.co/...",
  "campaign_id": "camp_123",
  "captured_at": "2025-11-03T10:00:00Z"
}
```

**Features:**
1. Configurable webhook endpoints
2. HMAC signature for security
3. Retry with exponential backoff (3 attempts)
4. Timeout handling (30s)
5. ESP presets (Zapier, Make, ConvertKit)
6. Delivery logging

**Reference:** spec.md lines 179-194, WEBHOOK-SETTINGS-UI.md""",
        "status": "todo",
        "feature": "Webhook Delivery",
        "branch": "lead-magnet-features",
        "task_order": 41,
        "assignee": "Assistant",
        "points": 10
    },
    {
        "title": "T012: Backup DM with Direct Link",
        "description": """Send backup DM with direct download link 5 minutes after confirmation.

**Features:**
1. 5-minute delay after confirmation
2. Generate 24-hour signed URLs from Supabase Storage
3. Optional URL shortening (bit.ly)
4. Toggle to enable/disable backup DM
5. Voice personalization for message

**Message Example:**
"Hey John! Here's that backup link I promised 🎁
10x Leadership Framework: https://bit.ly/abc123
(Link expires in 24 hours so grab it now!)"

**Reference:** spec.md lines 196-211, THREE-STEP-DM-SEQUENCE.md lines 385-468""",
        "status": "todo",
        "feature": "Backup DM",
        "branch": "lead-magnet-features",
        "task_order": 42,
        "assignee": "Assistant",
        "points": 5
    },

    # Session 5: Engagement Pods (15 points)
    {
        "title": "T013: Pod Infrastructure",
        "description": """Create database and API for engagement pod management.

**CRITICAL:** EVERYONE in pod engages with EVERYTHING. No rotation, no selection.

**Database Tables:**
- pods (min 9 members, auto_engage=true)
- pod_members (user_id, pod_id, linkedin_account_id)
- pod_activities (like/comment/repost tracking)

**Features:**
1. Minimum 9 members validation
2. Participation tracking (100% expected)
3. Activity logging
4. Pod health monitoring
5. Member management API

**Reference:** spec.md lines 213-221, data-model.md lines 663-719""",
        "status": "todo",
        "feature": "Pod Database",
        "branch": "lead-magnet-features",
        "task_order": 50,
        "assignee": "Assistant",
        "points": 5
    },
    {
        "title": "T014: LinkedIn Session Capture for Pods",
        "description": """Capture LinkedIn sessions for each pod member via Unipile.

**Features:**
1. Unipile hosted auth for each member
2. Encrypted credential storage
3. Session refresh before expiry (90 days)
4. Multi-account management
5. Re-authentication flow

**Each pod member needs:**
- LinkedIn credentials
- Unipile session
- Active status tracking

**Reference:** spec.md lines 311-318""",
        "status": "todo",
        "feature": "Pod Auth",
        "branch": "lead-magnet-features",
        "task_order": 51,
        "assignee": "Assistant",
        "points": 5
    },
    {
        "title": "T015: Pod Automation Engine",
        "description": """Implement automatic engagement when any pod member posts.

**CRITICAL BEHAVIOR:**
- When ANY member posts, ALL other members engage
- Like within 30 minutes (algorithm window)
- Comment within 1-3 hours
- Instant repost (NOT "repost with thoughts")
- NO selection, NO rotation - EVERYONE participates

**Why This Works:**
- LinkedIn algorithm heavily weights first 30 min - 3 hours
- Pod engagement discounted ~30% but volume overcomes
- Instant repost is 12x more effective than "repost with thoughts"

**Features:**
1. 100% participation (no exceptions)
2. Critical timing windows
3. AI-generated relevant comments
4. Instant repost only
5. Participation tracking

**Reference:** spec.md lines 213-221, FINAL-CORRECTIONS-SUMMARY.md lines 16-24""",
        "status": "todo",
        "feature": "Pod Automation",
        "branch": "lead-magnet-features",
        "task_order": 52,
        "assignee": "Assistant",
        "points": 5
    },

    # Session 6: AgentKit + Mem0 (10 points)
    {
        "title": "T016: AgentKit Campaign Orchestration",
        "description": """Integrate AgentKit for AI-powered campaign management.

**Custom Tools:**
- createCampaign - Create new lead generation campaign
- optimizeMessage - Optimize DM for conversion
- analyzePerformance - Analyze and suggest improvements
- generatePostContent - Create LinkedIn posts with trigger words

**Features:**
1. Campaign creation wizard
2. DM optimization
3. Performance analysis
4. Content generation with copywriting + voice
5. Custom tools for campaign operations

**Reference:** spec.md line 53""",
        "status": "todo",
        "feature": "AgentKit",
        "branch": "lead-magnet-features",
        "task_order": 60,
        "assignee": "Assistant",
        "points": 5
    },
    {
        "title": "T017: Mem0 Memory System",
        "description": """Implement Mem0 for persistent memory and learning.

**Features:**
1. Tenant isolation with composite keys: {clientId}::{userId}
2. Store successful patterns
3. Campaign performance learning
4. Memory-enhanced generation
5. Semantic search with PGVector

**Memory Types:**
- successful_post
- high_converting_campaign
- conversion_pattern
- effective_dm_template

**Pricing:** $20/month for Mem0 Pro

**Reference:** spec.md lines 52, 361-374, data-model.md lines 776-795""",
        "status": "todo",
        "feature": "Memory System",
        "branch": "lead-magnet-features",
        "task_order": 61,
        "assignee": "Assistant",
        "points": 5
    },

    # Session 7: Testing + Monitoring (5 points)
    {
        "title": "T018: Real-time Monitoring Dashboard",
        "description": """Build real-time analytics dashboard with key metrics.

**Metrics:**
- Active campaigns
- Leads today
- Conversion rate
- DMs remaining (daily limit)
- Conversion funnel visualization
- Pod activity heatmap
- Rate limit warnings

**Features:**
1. Real-time Supabase subscriptions
2. Conversion funnel (comments → triggers → DMs → emails → webhooks)
3. Pod activity heatmap
4. Rate limit monitoring
5. Activity feed

**Charts:** Using Recharts library

**Reference:** spec.md lines 448-456""",
        "status": "todo",
        "feature": "Monitoring",
        "branch": "lead-magnet-features",
        "task_order": 70,
        "assignee": "Assistant",
        "points": 3
    },
    {
        "title": "T019: End-to-End Testing Suite",
        "description": """Create comprehensive test suite for complete lead flow.

**Test Coverage:**
1. Complete flow: Post → Comment → DM → Email → Webhook → Backup
2. Pod engagement (verify EVERYONE engages)
3. Rate limiting (50 DMs/day)
4. Webhook retry logic
5. Email extraction edge cases
6. Voice transformation

**Test Framework:**
- Jest for unit tests
- Playwright for E2E tests
- Mock Unipile API responses
- Test database isolation

**Reference:** spec.md lines 429-446, quickstart.md lines 285-301""",
        "status": "todo",
        "feature": "Testing",
        "branch": "lead-magnet-features",
        "task_order": 71,
        "assignee": "Assistant",
        "points": 2
    }
]

def main():
    print("🚀 Starting Bravo revOS task update...")
    print(f"   Project ID: {PROJECT_ID}")

    # Step 1: Delete all existing tasks for this project
    print("\n📥 Fetching existing tasks...")
    existing = supabase.table('archon_tasks').select("*").eq('project_id', PROJECT_ID).execute()

    if existing.data:
        print(f"   Found {len(existing.data)} existing tasks")
        print("🗑️  Deleting old tasks...")

        for task in existing.data:
            supabase.table('archon_tasks').delete().eq('id', task['id']).execute()
            print(f"   ✓ Deleted: {task['title'][:50]}...")

        print(f"   ✓ Deleted {len(existing.data)} tasks")
    else:
        print("   No existing tasks found")

    # Step 2: Create new tasks
    print("\n📤 Creating new tasks...")
    created_count = 0

    for task in tasks:
        try:
            # Remove points field (not in database schema)
            points = task.pop('points', None)

            # Add project_id and timestamps
            task['project_id'] = PROJECT_ID
            task['created_at'] = datetime.utcnow().isoformat()
            task['updated_at'] = datetime.utcnow().isoformat()

            # Insert task
            result = supabase.table('archon_tasks').insert(task).execute()

            if result.data:
                created_count += 1
                print(f"   ✓ Created: {task['title']}")
            else:
                print(f"   ❌ Failed: {task['title']}")

        except Exception as e:
            print(f"   ❌ Error creating task '{task['title']}': {str(e)}")

    # Step 3: Summary
    print(f"\n✅ Task update complete!")
    print(f"   Tasks deleted: {len(existing.data) if existing.data else 0}")
    print(f"   Tasks created: {created_count}")
    print(f"   Total tasks now: {created_count}")

    # Verify branches
    branches_query = supabase.table('archon_tasks').select("branch").eq('project_id', PROJECT_ID).execute()
    branches = set([task['branch'] for task in branches_query.data])
    print(f"\n📊 Branch distribution:")
    for branch in sorted(branches):
        count = len([t for t in branches_query.data if t['branch'] == branch])
        points = sum([t['points'] for t in tasks if t['branch'] == branch])
        print(f"   - {branch}: {count} tasks ({points} points)")

    # Points summary
    total_points = sum([t['points'] for t in tasks])
    print(f"\n💯 Total points: {total_points}")

if __name__ == "__main__":
    main()