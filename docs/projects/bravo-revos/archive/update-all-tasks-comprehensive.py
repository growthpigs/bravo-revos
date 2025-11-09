#!/usr/bin/env python3
"""
Update all Bravo revOS tasks with comprehensive descriptions.
Expands minimal descriptions to full structure from COMPLETE-TASK-STRUCTURE.md
"""

import os
from supabase import create_client, Client

# Supabase credentials from environment
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

PROJECT_ID = "de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531"

# Comprehensive task descriptions from COMPLETE-TASK-STRUCTURE.md
TASKS_COMPREHENSIVE = [
    {
        "title": "A-01: Bolt.new Full-Stack Scaffold",
        "description": """📖 BEFORE YOU START: This is THE FOUNDATION. Everything else depends on this scaffold.

🎯 OBJECTIVE:
Generate a production-ready Next.js 14 + Supabase application with:
- Multi-tenant architecture (agencies → clients → users)
- Admin portal (/admin/*) and Client dashboard (/dashboard/*)
- Complete database schema with RLS policies
- Authentication middleware
- iOS-style toggle components
- Lead magnet delivery system foundation

🔧 BOLT.NEW PROMPT (300 WORDS - SELF-CONTAINED):

Create a Next.js 14 full-stack lead magnet delivery system with:

DATABASE SCHEMA:
Multi-tenant: agencies → clients → users
Campaign tables: campaigns, lead_magnets, leads (status flow: comment_detected→dm_sent→email_captured→webhook_sent)
LinkedIn: linkedin_accounts (encrypted), posts, comments, dm_sequences
Cartridges: 4-tier system (system/workspace/user/skill) with voice parameters
Pods: pods, pod_members, pod_activities (min 9 members)
Webhooks: webhook_configs, webhook_deliveries (retry tracking)

FRONTEND STRUCTURE:
/admin/* - Agency admin portal (client management, system analytics, pod monitoring)
/dashboard/* - Client dashboard (campaign wizard, lead export, webhook config)
/api/* - API routes (Supabase client, auth middleware)

UI REQUIREMENTS:
shadcn/ui components throughout
iOS-style toggles for features (rounded, smooth animation, blue/gray states)
Multi-step campaign wizard (6 steps: upload → content → trigger → webhook → DM → review)
Real-time metrics with recharts
DataTables with filtering/sorting (tanstack-table)

AUTH & SECURITY:
Supabase Auth with middleware
RLS policies for multi-tenancy
Role-based routing (admin vs client)
Encrypted credential storage

KEY FEATURES:
Lead magnet upload to Supabase Storage
Webhook configuration UI (Zapier/Make/ConvertKit presets)
Voice cartridge settings page
Campaign performance dashboard
Lead export as CSV

TECH STACK:
Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui, Supabase (Auth + Database + Storage), Recharts

OUTPUT:
SQL migrations, TypeScript types, RLS policies, all routes scaffolded, components styled

📚 REFERENCE DOCS:
- spec.md (complete system overview)
- data-model.md (database schema details)
- CONTEXT-FIRST-STANDARDIZATION-2025-11-04.md (Bolt optimization guide)

🔍 KNOWLEDGE BASE QUERIES:
- "Next.js 14 App Router with Supabase Auth middleware example"
- "shadcn/ui iOS-style toggle switch component"
- "Supabase Row Level Security policies for multi-tenant SaaS"
- "Next.js file upload to Supabase Storage with progress bar"

✅ DELIVERABLES:
1. Complete Next.js 14 project structure
2. Supabase schema with RLS policies
3. Admin portal routes (/admin/*)
4. Client dashboard routes (/dashboard/*)
5. Campaign wizard component
6. iOS-style toggle components
7. Authentication middleware
8. TypeScript type definitions

⚠️ CRITICAL REQUIREMENTS:
- ONE application with role-based routing (NOT separate apps)
- All database tables with proper foreign keys
- RLS policies enforcing tenant isolation
- Responsive design (mobile-first)
- Loading states for all async operations
- Error boundaries for all routes

📊 VALIDATION CHECKLIST:
- [ ] Can create agency/client/user hierarchy
- [ ] Admin can view all clients
- [ ] Client can only see their own data
- [ ] Campaign wizard completes all 6 steps
- [ ] File upload works to Supabase Storage
- [ ] Webhook config saves correctly
- [ ] iOS toggles animate smoothly
- [ ] RLS policies prevent cross-tenant access

🎯 SUCCESS CRITERIA:
User can generate entire scaffold in ONE Bolt.new session, push to GitHub, and have working foundation for all other epics.

**Points:** 15""",
        "task_order": 1
    },
    {
        "title": "B-01: Supabase Storage Setup",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🎯 OBJECTIVE:
Set up Supabase Storage bucket for lead magnet files with multi-tenant security.

📚 PROJECT DOCS:
- data-model.md (Storage schema)
- spec.md lines 258-304 (Cartridge system)

🔍 KNOWLEDGE BASE:
Query Archon: "Supabase Storage bucket creation with RLS policies"
Query Archon: "Supabase Storage public vs private bucket configuration"

✅ DELIVERABLES:
1. lead-magnets bucket (private)
2. RLS policies (tenant-isolated access)
3. File upload API endpoint
4. Download URL generation with 24-hour expiry
5. File size limit: 10MB per file
6. Allowed types: PDF, DOCX, PPTX, ZIP

VALIDATION: Upload file as client A, verify client B cannot access.

**Points:** 3""",
        "task_order": 2
    },
    {
        "title": "B-02: Cartridge Database & API",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🎯 OBJECTIVE:
Build cartridge database schema and CRUD API with 4-tier hierarchy.

📚 PROJECT DOCS:
- data-model.md (Cartridge schema)
- spec.md (Cartridge system details)

🔍 KNOWLEDGE BASE:
Query Archon: "Recursive database queries for hierarchical data in PostgreSQL"
Query Archon: "Supabase RLS policies for nested multi-tenant data"
Query Archon: "Supabase JSONB indexing performance"

✅ DELIVERABLES:
1. Cartridges table with parent_id
2. Voice parameters (tone, style, personality, vocabulary)
3. CRUD API endpoints (create, read, update, delete)
4. Inheritance resolution logic (system → workspace → user → skill)
5. RLS policies for multi-tenant isolation

VALIDATION: Create system→workspace→user→skill cartridges, verify inheritance cascades correctly.

**Points:** 8""",
        "task_order": 3
    },
    {
        "title": "B-03: Voice Auto-Generation from LinkedIn",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🎯 OBJECTIVE:
Automatically generate voice cartridge from user's LinkedIn content.

📚 PROJECT DOCS:
- spec.md (Voice generation)
- data-model.md (Cartridge parameters)

🔍 KNOWLEDGE BASE:
Query Archon: "Unipile LinkedIn API fetch user posts with pagination"
Query Archon: "OpenAI GPT-4 prompt for voice style analysis"
Query Archon: "Extract tone, personality, vocabulary from social media posts"

✅ DELIVERABLES:
1. Unipile posts fetch API (fetch 30 recent posts)
2. GPT-4 voice analysis prompt
3. Cartridge auto-creation endpoint
4. Voice preview UI component

EDGE CASES:
- <30 posts: Use what's available, note low confidence
- Private profile: Skip or use default workspace voice
- API failure: Graceful degradation to manual voice input

VALIDATION: Analyze 30 posts, generate cartridge, verify accuracy against sample posts.

**Points:** 7""",
        "task_order": 4
    },
    {
        "title": "B-04: Cartridge Management UI",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🎯 OBJECTIVE:
Create user-friendly interface for managing voice cartridges with progressive disclosure.

📚 PROJECT DOCS:
- spec.md (UI requirements)
- CONTEXT-FIRST-STANDARDIZATION-2025-11-04.md (UI patterns)

🔍 KNOWLEDGE BASE:
Query Archon: "Progressive disclosure UI patterns for complex forms"
Query Archon: "shadcn/ui collapsible accordion component"

✅ DELIVERABLES:
1. Cartridge list with hierarchy visualization
2. Edit form with progressive disclosure
3. Voice preview component
4. Auto-generate voice button

VALIDATION: Create/edit/delete cartridges, verify inheritance updates propagate.

**Points:** 5""",
        "task_order": 5
    },
    {
        "title": "C-01: Unipile Integration & Session Management",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🎯 OBJECTIVE:
Securely connect and manage LinkedIn accounts via Unipile.

📚 PROJECT DOCS:
- spec.md (Unipile integration)
- data-model.md (linkedin_accounts table)

🔍 KNOWLEDGE BASE:
Query Archon: "Unipile LinkedIn username password authentication flow"
Query Archon: "Unipile session management and token refresh"
Query Archon: "Encrypt sensitive credentials in Supabase PostgreSQL"

✅ DELIVERABLES:
1. Unipile auth API integration (username/password, NOT OAuth)
2. Encrypted credential storage (AES-256-GCM)
3. Session expiry monitoring
4. Auto-reconnect logic
5. Cost tracking: $5.50/account/month

CREDENTIAL ENCRYPTION:
- Use Supabase Vault for encryption keys
- AES-256-GCM encryption for passwords
- Never log credentials
- Rotate encryption keys quarterly

VALIDATION: Connect LinkedIn account, verify session persists across restarts.

**Points:** 5""",
        "task_order": 6
    },
    {
        "title": "C-02: Comment Polling System",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🎯 OBJECTIVE:
Detect trigger words in LinkedIn comments in real-time without hitting rate limits.

📚 PROJECT DOCS:
- spec.md (Comment polling)
- data-model.md (comments, posts tables)

🔍 KNOWLEDGE BASE:
Query Archon: "Unipile LinkedIn API fetch post comments"
Query Archon: "Detect bots in LinkedIn comments using Unipile"
Query Archon: "BullMQ recurring job with random delay"
Query Archon: "Unipile API error handling retry logic"

✅ DELIVERABLES:
1. Comment polling job (15-45min random intervals)
2. Trigger word detection
3. Bot filtering logic
4. Comment deduplication

POLLING STRATEGY (CRITICAL):
- Random intervals: 15-45 minutes (wider range)
- Only during working hours: 9am-5pm user's timezone
- Add random "skip" chance (10%) to break patterns
- Jitter: ±5 minutes from scheduled time

BOT FILTERING:
- Check for "bot" in profile headline
- Filter profiles with <10 connections
- Skip generic comments ("Great post!")
- Regex patterns for spam

VALIDATION: Post with trigger word, verify comment detected within 45min.

**Points:** 7""",
        "task_order": 7
    },
    {
        "title": "C-03: BullMQ Rate-Limited DM Queue",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🎯 OBJECTIVE:
Send DMs via Unipile without exceeding LinkedIn rate limits.

📚 PROJECT DOCS:
- spec.md (DM delivery)
- data-model.md (dm_sequences table)

🔍 KNOWLEDGE BASE:
Query Archon: "BullMQ rate limiting per job group"
Query Archon: "Unipile LinkedIn send direct message API"
Query Archon: "Exponential backoff retry strategy in BullMQ"
Query Archon: "BullMQ rate limiting per-group configuration"
Query Archon: "BullMQ concurrency and rate limiting best practices"
Query Archon: "Unipile API send message daily limits LinkedIn"

✅ DELIVERABLES:
1. BullMQ DM queue
2. Rate limiter (100 DMs/day/account - NOT 50!)
3. Retry logic with exponential backoff (15min, 30min, 60min)
4. Failure tracking

RATE LIMITS (CRITICAL):
Per LinkedIn Account:
- Max: 100 DMs/day (conservative, Unipile allows 100-150)
- Min delay: 2 minutes between DMs
- Random delays: 2-15 minutes
- Reset: Daily at midnight user TZ

BullMQ Configuration:
```javascript
{
  limiter: {
    max: 100,        // 100 DMs per day
    duration: 86400000,  // 24 hours in ms
    groupKey: 'linkedinAccountId'  // Per-account limits
  },
  concurrency: 1  // One DM at a time per account
}
```

MULTI-ACCOUNT SUPPORT:
- If client has 3 LinkedIn accounts
- Each gets separate 100 DM/day limit
- Total: 300 DMs/day across accounts

VALIDATION: Queue 150 DMs, verify only 100 sent in 24 hours.

**Points:** 8""",
        "task_order": 8
    },
    {
        "title": "D-01: Email Extraction from DM Replies",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🎯 OBJECTIVE:
Reliably extract email addresses from natural language DM responses.

📚 PROJECT DOCS:
- spec.md (Email extraction)
- data-model.md (leads table)

🔍 KNOWLEDGE BASE:
Query Archon: "Regex pattern for email extraction from text"
Query Archon: "OpenAI GPT-4 prompt for extracting email from message"
Query Archon: "Confidence scoring for extracted data"
Query Archon: "OpenAI GPT-4 email extraction confidence scoring"

✅ DELIVERABLES:
1. Regex email extraction
2. GPT-4 fallback for complex cases
3. Confidence score calculation
4. Manual review queue for low confidence

CONFIDENCE SCORING:
- High (90-100%): Clear email in reply
- Medium (70-89%): GPT-4 extraction
- Low (<70%): Manual review needed

MANUAL REVIEW TRIGGER:
- Confidence <70%
- Multiple emails found
- No email found after clarification

VALIDATION: Test with 20 sample DM replies, verify 95%+ accuracy.

**Points:** 5""",
        "task_order": 9
    },
    {
        "title": "D-02: Webhook to Client CRM/ESP",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🎯 OBJECTIVE:
Reliably deliver lead data to client systems with security and retries.

📚 PROJECT DOCS:
- spec.md (Webhook delivery)
- data-model.md (webhook_configs, webhook_deliveries)

🔍 KNOWLEDGE BASE:
Query Archon: "HMAC signature for webhook security"
Query Archon: "HTTP retry strategy with exponential backoff"
Query Archon: "Zapier webhook format requirements"
Query Archon: "Make.com webhook integration best practices"
Query Archon: "Webhook retry logic exponential backoff"

✅ DELIVERABLES:
1. Webhook delivery API
2. HMAC signature generation
3. 4-attempt retry with exponential backoff
4. Delivery status tracking
5. Webhook test tool UI

HMAC SIGNATURE:
```javascript
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(JSON.stringify(payload))
  .digest('hex');

headers: {
  'X-Webhook-Signature': signature,
  'X-Webhook-Timestamp': Date.now()
}
```

ESP PRESETS:
- Zapier: `https://hooks.zapier.com/hooks/catch/...`
- Make.com: `https://hook.make.com/...`
- ConvertKit: `https://api.convertkit.com/v3/forms/{id}/subscribe`
- Custom: User-defined endpoint + auth header

RETRY LOGIC (EXPLICIT):
- Attempt 1: Immediate
- Attempt 2: 15 minutes later
- Attempt 3: 30 minutes later
- Attempt 4: 60 minutes later
- After 4 failures: Dead letter queue + alert user

VALIDATION: Configure webhook, trigger lead, verify 4 retry attempts on failure.

**Points:** 10""",
        "task_order": 10
    },
    {
        "title": "D-03: Mailgun One-Time Lead Magnet Delivery",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🎯 OBJECTIVE:
Deliver lead magnet files to captured email addresses.

📚 PROJECT DOCS:
- spec.md (Email delivery)
- data-model.md (leads table status flow)

🔍 KNOWLEDGE BASE:
Query Archon: "Mailgun send email with attachment API"
Query Archon: "Mailgun free tier limits 5000 emails per month"
Query Archon: "Email deliverability best practices"
Query Archon: "Mailgun API send email with attachment"

✅ DELIVERABLES:
1. Mailgun API integration
2. Email template with attachment
3. Delivery status tracking
4. Bounce handling
5. Free tier: 5,000 emails/month

MAILGUN CONFIGURATION:
- From: noreply@{client-domain}.com
- Subject: "{lead_magnet_name} - As Requested"
- Attachment: PDF from Supabase Storage
- Tracking: Open rate, click rate

BACKUP DM (Optional):
- Only if toggle enabled
- 5-minute delay after webhook
- Signed URL expires in 24 hours
- URL shortening via bit.ly (optional)

VALIDATION: Send test email with PDF, verify delivery and tracking.

**Points:** 5""",
        "task_order": 11
    },
    {
        "title": "E-01: Pod Infrastructure & Database",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🎯 OBJECTIVE:
Build foundation for engagement pod automation.

📚 PROJECT DOCS:
- spec.md (Engagement pods, lines 213-221)
- data-model.md (pods, pod_members, pod_activities)

🔍 KNOWLEDGE BASE:
Query Archon: "LinkedIn engagement pod best practices"
Query Archon: "Multi-tenant pod membership in Supabase"

✅ DELIVERABLES:
1. Pods table (min 9 members constraint)
2. Pod members table
3. Pod activities tracking
4. Pod CRUD API

PARTICIPATION ENFORCEMENT:
- Track engagement per member per post
- Alert if <80% participation in 7 days
- Auto-suspend members with <50% participation
- Require re-activation after suspension

MEMBER REMOVAL:
- Super admin can remove members
- Member can leave pod
- Removal cascades to pod_activities (set member_id NULL)

VALIDATION: Create pod with 8 members, verify validation fails (min 9 required).

**Points:** 5""",
        "task_order": 12
    },
    {
        "title": "E-02: LinkedIn Session Capture for Pod Members",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🎯 OBJECTIVE:
Collect LinkedIn credentials from all pod members securely.

📚 PROJECT DOCS:
- spec.md (Pod session management)
- data-model.md (linkedin_accounts)

🔍 KNOWLEDGE BASE:
Query Archon: "Unipile LinkedIn session capture for multiple accounts"
Query Archon: "Session expiry monitoring and alerts"
Query Archon: "Unipile hosted authentication iframe"

✅ DELIVERABLES:
1. Hosted auth page for pod members
2. Session storage per member
3. Expiry alerts (email/SMS)
4. Re-auth flow

SESSION EXPIRY ALERTS:
- Alert 7 days before expiry
- Alert 1 day before expiry
- Alert on expiry (re-auth required)
- Slack/email notification options

VALIDATION: 9 members auth, verify all sessions active and tracked.

**Points:** 5""",
        "task_order": 13
    },
    {
        "title": "E-03: Pod Post Detection System",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🎯 OBJECTIVE:
Detect when pod members publish new LinkedIn posts.

📚 PROJECT DOCS:
- spec.md (Post detection)
- data-model.md (posts table)

🔍 KNOWLEDGE BASE:
Query Archon: "Unipile LinkedIn API fetch user's latest posts"
Query Archon: "BullMQ recurring job every 30 minutes"
Query Archon: "Unipile API get user posts authored content"

✅ DELIVERABLES:
1. Post polling job (30min intervals)
2. New post detection logic
3. Post deduplication
4. Notification system

CRITICAL: This task was MISSING from original plan!
Without this, pod automation cannot trigger.

VALIDATION: Pod member posts, verify detection within 30min and engagement workflow triggers.

**Points:** 5""",
        "task_order": 14
    },
    {
        "title": "E-04: Pod Automation Engine",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🎯 OBJECTIVE:
Automatically engage with pod posts to boost reach.

📚 PROJECT DOCS:
- spec.md (Pod automation)
- data-model.md (pod_activities)

🔍 KNOWLEDGE BASE:
Query Archon: "Unipile LinkedIn API like post"
Query Archon: "Unipile LinkedIn API comment on post"
Query Archon: "BullMQ delayed jobs for staggered execution"
Query Archon: "BullMQ delayed jobs scheduling"

✅ DELIVERABLES:
1. Like job (random 5-30min delay)
2. Comment job (random 1-6hr delay)
3. Engagement tracking
4. Activity analytics

STAGGERED ENGAGEMENT (CRITICAL):
- Like timing: Random 5-30 minutes (not all at once)
- Comment timing: Random 1-6 hours (wider spread)
- Stagger engagement across members (not simultaneous)
- Max 3 members engage within first hour (avoid pattern)

100% PARTICIPATION:
- EVERYONE engages with EVERYTHING
- NO selection, NO rotation
- Track participation compliance

VALIDATION: Post detected, verify 9 members engage with correct timing and staggering.

**Points:** 5""",
        "task_order": 15
    },
    {
        "title": "F-01: AgentKit Campaign Orchestration",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🎯 OBJECTIVE:
Enable AI agent to autonomously manage campaigns.

📚 PROJECT DOCS:
- spec.md (AI orchestration)

🔍 KNOWLEDGE BASE:
Query Archon: "Coinbase AgentKit setup and configuration"
Query Archon: "AgentKit custom tool creation guide"
Query Archon: "LangChain tool integration with AgentKit"
Query Archon: "OpenAI AgentKit custom tools registration"

✅ DELIVERABLES:
1. AgentKit setup
2. createCampaign custom tool
3. optimizeMessage custom tool
4. Campaign optimization logic

CUSTOM TOOL SCHEMAS:

createCampaign:
- Parameters: name, trigger_word, lead_magnet_id, webhook_url
- Returns: campaign_id, estimated_reach, suggested_post

optimizeMessage:
- Parameters: message, conversion_goal, audience
- Returns: optimized_message, confidence_score, A/B variants

analyzePerformance:
- Parameters: campaign_id, time_range
- Returns: metrics, insights, recommendations

generatePostContent:
- Parameters: topic, trigger_word, voice_cartridge_id
- Returns: post_text, hashtags, best_posting_time

VALIDATION: AI creates campaign via natural language request and executes autonomously.

**Points:** 5""",
        "task_order": 16
    },
    {
        "title": "F-02: Mem0 Memory System Integration",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🎯 OBJECTIVE:
Give AI long-term memory with multi-tenant isolation.

📚 PROJECT DOCS:
- spec.md (AI memory)
- data-model.md (Multi-tenant structure)

🔍 KNOWLEDGE BASE:
Query Archon: "Mem0 add memory with metadata Python example"
Query Archon: "Mem0 hierarchical tenant keys for multi-tenant isolation"
Query Archon: "Mem0 search memories with filters"
Query Archon: "Mem0 tenant isolation multi-tenant SaaS"

✅ DELIVERABLES:
1. Mem0 client setup
2. 3-level tenant key structure
3. Memory CRUD operations
4. Memory search API
5. Cost tracking: $20/month

MEM0 TENANT ISOLATION (CRITICAL):
- User-specific: `{agencyId}::{clientId}::{userId}`
- Client-specific: `{agencyId}::{clientId}::shared`
- Campaign-specific: `{agencyId}::{clientId}::campaign::{campaignId}`

WHY: Ensures agency-level isolation + client-level isolation + user-level isolation

VALIDATION: Add memory for client A user 1, verify client B cannot access.

**Points:** 5""",
        "task_order": 17
    },
    {
        "title": "G-01: Real-time Monitoring Dashboard",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🎯 OBJECTIVE:
Give admins visibility into system health and campaign performance.

📚 PROJECT DOCS:
- spec.md (Monitoring requirements)

🔍 KNOWLEDGE BASE:
Query Archon: "Supabase real-time subscriptions for live dashboard"
Query Archon: "Recharts line chart with live data updates"
Query Archon: "Real-time metrics dashboard UI patterns"
Query Archon: "Supabase real-time subscriptions React"
Query Archon: "Recharts real-time data"

✅ DELIVERABLES:
1. Real-time event subscriptions
2. Live metrics dashboard
3. Campaign performance charts
4. System health indicators

ALERT THRESHOLDS:
- DMs remaining <10: Warning (yellow)
- DMs remaining <5: Critical (red)
- Conversion rate <3%: Low performance alert
- Webhook failures >5%: Integration issue alert
- Queue depth alerts for job processing

VALIDATION: Trigger event, verify dashboard updates within 1 second.

**Points:** 3""",
        "task_order": 18
    },
    {
        "title": "G-02: End-to-End Testing Suite",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

🎯 OBJECTIVE:
Ensure system reliability with comprehensive E2E tests.

📚 PROJECT DOCS:
- spec.md (Testing requirements)
- quickstart.md (8 test scenarios reference)

🔍 KNOWLEDGE BASE:
Query Archon: "Playwright E2E testing with Next.js 14"
Query Archon: "Mock Unipile API responses for testing"
Query Archon: "Supabase test database setup"
Query Archon: "Playwright e2e testing"
Query Archon: "Jest mock Unipile API"

✅ DELIVERABLES:
1. E2E test suite (Playwright)
2. Mock Unipile fixtures
3. Test database seeding
4. CI/CD integration

TEST SCENARIOS (ALL 8 REQUIRED):
1. Campaign creation end-to-end
   - Create campaign with lead magnet
   - Configure trigger word and webhook
   - Verify campaign appears in dashboard

2. Comment detection → DM flow
   - Mock LinkedIn comment with trigger word
   - Verify comment detection
   - Verify DM queued and sent
   - Verify rate limiting works

3. Email extraction → Webhook
   - Mock DM reply with email
   - Verify email extraction (regex + GPT-4)
   - Verify webhook delivery with retry
   - Verify HMAC signature

4. Pod engagement automation
   - Mock pod member post
   - Verify post detection
   - Verify all 9 members engage
   - Verify staggered timing

5. Multi-tenant isolation
   - Create 2 clients with campaigns
   - Verify Client A can't access Client B data
   - Test RLS policies

6. Rate limit enforcement
   - Queue 150 DMs for single account
   - Verify only 100 sent in 24 hours
   - Verify queued items wait

7. Retry logic validation
   - Mock failing webhook endpoint
   - Verify 4 retry attempts: 0min, 15min, 30min, 60min
   - Verify dead letter queue

8. Error handling paths
   - Private LinkedIn profile
   - Invalid email in DM
   - Expired LinkedIn session
   - Unipile API errors

TEST FIXTURES:
- 100 mock LinkedIn comments with trigger word
- 50 mock DM replies with emails
- 20 mock DM replies without emails (edge cases)
- 10 mock webhook delivery scenarios

MOCK UNIPILE RESPONSES:
```javascript
// Comment polling
mockUnipile.getPostComments.mockResolvedValue({
  comments: [/* fixture data */],
  has_more: false
});

// DM sending
mockUnipile.sendMessage.mockImplementation(() => {
  if (Math.random() < 0.95) return { success: true };
  throw new Error('Rate limit exceeded');
});
```

TEST COVERAGE REQUIREMENTS:
- Unit tests: >80%
- Integration tests: All happy paths + top 10 edge cases
- E2E tests: All 8 scenarios above

VALIDATION: All 8 scenarios pass in CI/CD pipeline.

**Points:** 5""",
        "task_order": 19
    }
]

def update_tasks():
    """Update all tasks with comprehensive descriptions."""

    # Get existing tasks to match by title
    response = supabase.table("archon_tasks").select("*").eq("project_id", PROJECT_ID).execute()
    existing_tasks = {task["title"]: task for task in response.data}

    updated_count = 0

    for task_data in TASKS_COMPREHENSIVE:
        title = task_data["title"]

        if title in existing_tasks:
            task_id = existing_tasks[title]["id"]

            # Update task
            update_data = {
                "description": task_data["description"],
                "task_order": task_data["task_order"]
            }

            result = supabase.table("archon_tasks").update(update_data).eq("id", task_id).execute()

            print(f"✅ Updated: {title}")
            updated_count += 1
        else:
            print(f"⚠️  Not found: {title}")

    print(f"\n✅ Updated {updated_count} tasks with comprehensive descriptions")

if __name__ == "__main__":
    update_tasks()
