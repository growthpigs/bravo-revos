#!/usr/bin/env python3
"""
Clean Slate Task Recreation for Bravo revOS
Deletes all 49 duplicate tasks and recreates clean structure
Based on SITREP + Expert Review corrections
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment
load_dotenv('/Users/rodericandrews/Obsidian/Master/_agro-archon/agro-archon/python/.env')

# Supabase configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY')
PROJECT_ID = "de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531"

if not SUPABASE_KEY:
    raise ValueError("SUPABASE_KEY environment variable not set")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# A-00 task ID (should already exist)
A00_TASK_ID = "a5fbfebb-5d31-44f2-b4e2-a4f0b5fee8b4"


def delete_all_tasks():
    """Delete all tasks except A-00"""
    print("🗑️  Deleting all tasks except A-00...")

    # Get all tasks
    result = supabase.table('archon_tasks').select("*").eq('project_id', PROJECT_ID).execute()
    tasks = result.data
    print(f"   Found {len(tasks)} tasks")

    # Delete all except A-00
    deleted_count = 0
    for task in tasks:
        if task['id'] != A00_TASK_ID:
            supabase.table('archon_tasks').delete().eq('id', task['id']).execute()
            deleted_count += 1

    print(f"   ✅ Deleted {deleted_count} tasks (kept A-00)")


def create_task(task_data):
    """Create a single task"""
    result = supabase.table('archon_tasks').insert(task_data).execute()
    task_id = result.data[0]['id']
    # Extract points from description for logging
    points_text = "unknown pts"
    if "**Points:**" in task_data.get('description', ''):
        try:
            points = task_data['description'].split("**Points:**")[1].split()[0]
            points_text = f"{points} pts"
        except:
            pass
    print(f"   ✅ Created: {task_data['title']} ({points_text})")
    return task_id


def create_all_tasks():
    """Create all 17 tasks (A-01 + T001-T016) based on SITREP + Expert Review"""

    print("\n📝 Creating tasks...")

    # ============================================================================
    # A-01: Bolt.new Full-Stack Scaffold (Session 1 - 15 points)
    # ============================================================================

    create_task({
        "project_id": PROJECT_ID,
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

**Tech Stack:**
- Next.js 14.0+
- TypeScript 5.3+
- Tailwind CSS
- Shadcn/ui
- Supabase client
- Next-auth v5

**Acceptance Criteria:**
- ✅ Complete project structure generated
- ✅ All database tables created in Supabase
- ✅ Admin portal accessible at /admin
- ✅ Client dashboard accessible at /dashboard
- ✅ iOS-style toggles implemented
- ✅ Authentication working
- ✅ RLS policies applied
- ✅ Push to GitHub on bolt-scaffold branch

**Verification:**
- Run `npm run build` successfully
- Login as admin and client
- Verify all pages load without errors

**Branch:** bolt-scaffold
**Assignee:** User (Bolt.new)
**Blocks:** All other tasks

**Points:** 15""",
        "status": "todo",
        "branch": "bolt-scaffold",
        "task_order": 1,
        "assignee": "user",
        "priority": "high"
    })

    # ============================================================================
    # SESSION 2: Foundation (23 points)
    # ============================================================================

    # T001: Supabase Storage Setup (NEW - from expert review)
    create_task({
        "project_id": PROJECT_ID,
        "title": "T001: Supabase Storage Setup",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

📚 PROJECT DOCS:
- data-model.md (Storage bucket requirements)

🔍 KNOWLEDGE BASE - Supabase:
Query Archon: "Supabase Storage bucket creation with RLS policies multi-tenant"
Query Archon: "Supabase Storage signed URLs 24-hour expiry implementation"
Query Archon: "Supabase Storage file size limits and validation best practices"

**Create Supabase Storage for Lead Magnets:**

**Bucket Configuration:**
- Name: `lead-magnets`
- Public: No (requires signed URLs)
- File size limit: 10MB per file
- Allowed MIME types: PDF, DOCX, PPTX, ZIP

**RLS Policies:**
```sql
-- Users can only upload to their client's folder
CREATE POLICY "Users can upload lead magnets"
  ON storage.objects FOR INSERT
  TO authenticated
  USING (bucket_id = 'lead-magnets' AND
         (storage.foldername(name))[1] = auth.jwt() ->> 'client_id');

-- Users can read their client's files
CREATE POLICY "Users can read lead magnets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'lead-magnets' AND
         (storage.foldername(name))[1] = auth.jwt() ->> 'client_id');
```

**API Endpoints:**
- POST /api/lead-magnets/upload - Upload file
- GET /api/lead-magnets/:id/url - Generate signed URL (24-hour expiry)
- DELETE /api/lead-magnets/:id - Delete file

**File Organization:**
```
lead-magnets/
  {client_id}/
    {lead_magnet_id}/
      {filename}
```

**Cleanup Job:**
- Cron job to delete orphaned files (no database reference)
- Run weekly via Supabase Edge Function

**Acceptance Criteria:**
- ✅ lead-magnets bucket created
- ✅ RLS policies applied and tested
- ✅ Upload API working with size/type validation
- ✅ Signed URLs generated correctly (24-hour expiry)
- ✅ Multi-tenant isolation verified

**Branch:** foundation
**Assignee:** Assistant""",
        "status": "todo",
        "branch": "foundation",
        "task_order": 2,
        "assignee": "assistant",
        "priority": "high"
    })

    # T002: Cartridge Database & API
    create_task({
        "project_id": PROJECT_ID,
        "title": "T002: Cartridge Database & API",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

📚 PROJECT DOCS:
- 02-Cartridge-System-Specification.md (lines 143-196, 456-506)
- data-model.md (cartridges table schema)

🔍 KNOWLEDGE BASE - Supabase:
Query Archon: "Supabase RLS policies multi-tenant best practices SaaS"
Query Archon: "Supabase JSONB indexing performance optimization"
Query Archon: "Supabase row-level security composite policies examples"

**Implement 4-tier cartridge system:**

**Database Schema:**
- `cartridges` table (System/Workspace/User/Skills tiers)
- `user_cartridge_selections` (tracks active cartridges per user)
- RLS policies for tenant isolation

**API Endpoints (CRUD):**
- POST /api/cartridges - Create cartridge
- GET /api/cartridges - List cartridges (filtered by tier and access)
- GET /api/cartridges/:id - Get single cartridge
- PATCH /api/cartridges/:id - Update cartridge
- DELETE /api/cartridges/:id - Delete cartridge (soft delete)

**Cartridge Tiers:**
1. System (global, read-only for users)
2. Workspace (client-level, editable by admins)
3. User (individual, editable by owner)
4. Skills (per-task, temporary)

**Load Triggers:**
- Campaign creation → User + Workspace + System cartridges
- Task execution → Skills cartridge
- Manual override → Custom selection

**Acceptance Criteria:**
- ✅ Cartridge CRUD API complete
- ✅ RLS policies prevent cross-client access
- ✅ Tier hierarchy enforced (Skills > User > Workspace > System)
- ✅ Load trigger logic implemented
- ✅ Soft delete (status = 'archived')

**Branch:** foundation
**Assignee:** Assistant""",
        "status": "todo",
        "branch": "foundation",
        "task_order": 3,
        "assignee": "assistant",
        "priority": "high"
    })

    # T003: Voice Auto-Generation from LinkedIn
    create_task({
        "project_id": PROJECT_ID,
        "title": "T003: Voice Auto-Generation from LinkedIn",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

📚 PROJECT DOCS:
- 02-Cartridge-System-Specification.md (voice generation logic)

🔍 KNOWLEDGE BASE - Unipile + OpenAI:
Query Archon: "Unipile API get user posts endpoint pagination limit parameters"
Query Archon: "Unipile LinkedIn private profile handling error codes"
Query Archon: "OpenAI GPT-4 prompt engineering for writing style tone analysis"
Query Archon: "OpenAI function calling with structured output for text analysis"

**Auto-generate voice cartridge from LinkedIn profile:**

**Process:**
1. User connects LinkedIn account via Unipile
2. Fetch last 30 posts via Unipile API
3. Analyze tone, style, formality with GPT-4o
4. Generate voice cartridge with:
   - Tone (professional, casual, witty, authoritative)
   - Formality level (1-10 scale)
   - Emoji usage (yes/no, frequency)
   - Sentence structure (short punchy vs long detailed)
   - Common phrases/patterns

**Unipile API Call:**
```typescript
GET /api/v1/posts
Parameters:
  - account_id: {linkedin_account_id}
  - limit: 30
  - type: "authored"  // Only user's posts, not shared
```

**GPT-4o Analysis Prompt:**
"Analyze the writing style of these 30 LinkedIn posts. Extract:
- Overall tone (professional, casual, witty, authoritative, inspirational)
- Formality level (1-10 scale, 1=very casual, 10=very formal)
- Emoji usage (frequency and types)
- Sentence structure preferences
- Common phrases or linguistic patterns
- Engagement triggers (questions, CTAs, storytelling)

Return as structured JSON."

**Edge Cases:**
- <30 posts: Use available posts, note low confidence in cartridge
- Private profile: Skip or use default workspace voice
- API failure: Graceful degradation to manual voice input
- No posts: Prompt user for manual voice creation

**Acceptance Criteria:**
- ✅ Fetches 30 LinkedIn posts via Unipile
- ✅ GPT-4o analysis generates structured voice data
- ✅ Voice cartridge created in database
- ✅ Edge cases handled (private profiles, <30 posts)
- ✅ Confidence score included (based on post count)

**Branch:** foundation
**Assignee:** Assistant""",
        "status": "todo",
        "branch": "foundation",
        "task_order": 4,
        "assignee": "assistant",
        "priority": "medium"
    })

    # T004: Cartridge Management UI
    create_task({
        "project_id": PROJECT_ID,
        "title": "T004: Cartridge Management UI",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

📚 PROJECT DOCS:
- 02-Cartridge-System-Specification.md (UI specifications)

**Build cartridge management interface:**

**Pages:**
1. /dashboard/cartridges - List all cartridges
2. /dashboard/cartridges/new - Create new cartridge
3. /dashboard/cartridges/:id/edit - Edit existing cartridge

**Progressive Disclosure UI:**
- Tier selection (System/Workspace/User/Skills)
- Voice settings (tone, formality, emoji usage)
- Context settings (audience, topics, constraints)
- Skills settings (task-specific instructions)
- Preview pane (real-time sample text generation)

**Voice Preview:**
- Show 3 sample sentences in selected voice
- "Write about AI trends in a [tone] and [formality] style"
- Regenerate samples on settings change

**Load Trigger Configuration:**
- Checkboxes: "Load on campaign creation", "Load on task execution"
- Priority slider (1-10, higher = loaded first)

**Acceptance Criteria:**
- ✅ List view with tier-based filtering
- ✅ Create/edit forms with progressive disclosure
- ✅ Voice preview with real-time samples
- ✅ Load trigger configuration
- ✅ Responsive design (works on tablet/desktop)

**Branch:** foundation
**Assignee:** Assistant""",
        "status": "todo",
        "branch": "foundation",
        "task_order": 5,
        "assignee": "assistant",
        "priority": "medium"
    })

    # ============================================================================
    # SESSION 3: Unipile + BullMQ (20 points)
    # ============================================================================

    # T005: Unipile Integration
    create_task({
        "project_id": PROJECT_ID,
        "title": "T005: Unipile Integration & Session Management",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

📚 PROJECT DOCS:
- unipile-api-research.md (complete Unipile documentation)

🔍 KNOWLEDGE BASE - Unipile:
Query Archon: "Unipile LinkedIn authentication username password flow not OAuth"
Query Archon: "Unipile API pricing per account monthly cost"
Query Archon: "Unipile API error handling rate limits status codes"
Query Archon: "Unipile hosted authentication session persistence storage"

**Integrate Unipile API for LinkedIn operations:**

**Authentication:**
- **CRITICAL:** Username/password flow (NOT OAuth)
- Hosted auth flow via Unipile iframe
- Session tokens stored encrypted in Supabase

**Credential Encryption:**
- Use Supabase Vault for encryption keys
- AES-256-GCM encryption for passwords
- Never log credentials
- Rotate encryption keys quarterly

**API Client Setup:**
```typescript
const unipile = new UnipileClient({
  apiKey: process.env.UNIPILE_API_KEY,
  apiUrl: 'https://api.unipile.com'
});
```

**Session Management:**
- Store `account_id`, `access_token`, `refresh_token`
- Track session expiry (LinkedIn sessions expire every 30-60 days)
- Auto-refresh tokens before expiry
- Alert user 7 days before session expiry

**Pricing:**
- $5.50/account/month
- NOT per-API-call
- Unlimited requests within rate limits

**Acceptance Criteria:**
- ✅ Unipile client initialized
- ✅ Hosted auth flow working
- ✅ Sessions stored encrypted
- ✅ Token refresh implemented
- ✅ Session expiry alerts
- ✅ Error handling for expired sessions

**Branch:** lead-magnet
**Assignee:** Assistant""",
        "status": "todo",
        "branch": "lead-magnet",
        "task_order": 6,
        "assignee": "assistant",
        "priority": "critical"
    })

    # T006: Comment Polling System (FIXED rate limits from expert review)
    create_task({
        "project_id": PROJECT_ID,
        "title": "T006: Comment Polling System",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

📚 PROJECT DOCS:
- spec.md (comment polling requirements)

🔍 KNOWLEDGE BASE - Unipile:
Query Archon: "Unipile API get post comments endpoint parameters pagination"
Query Archon: "Unipile LinkedIn comment polling best practices rate limits"
Query Archon: "Unipile API error handling retry logic exponential backoff"

**Poll LinkedIn comments for trigger words:**

**CRITICAL:** Unipile does NOT support real-time comment webhooks. MUST poll.

**Polling Strategy (CORRECTED from expert review):**
- Random intervals: **15-45 minutes** (wider range to avoid detection)
- Working hours only: 9am-5pm user's timezone
- 10% random skip chance (breaks patterns)
- Jitter: ±5 minutes from scheduled time
- **WHY:** LinkedIn bans predictable automation patterns

**BullMQ Job Configuration:**
```typescript
{
  repeat: {
    cron: '*/20 * * * *',  // Base: every 20 min
    // Add randomization in job handler
  },
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 15 * 60 * 1000  // 15min, 30min, 60min
  }
}
```

**Bot Comment Filtering:**
- Check for "bot" in profile headline
- Filter profiles with <10 connections
- Skip generic comments ("Great post!", "Thanks for sharing")
- Regex patterns for spam detection

**Trigger Word Matching:**
- Case-insensitive
- Exact match or fuzzy match (90% similarity)
- Extract trigger word + full comment text
- Store in `comments` table

**Acceptance Criteria:**
- ✅ Polls every 15-45 minutes (randomized)
- ✅ Only during working hours (9am-5pm)
- ✅ Trigger word matching working
- ✅ Bot filtering implemented
- ✅ Stores detected comments in database

**Branch:** lead-magnet
**Assignee:** Assistant""",
        "status": "todo",
        "branch": "lead-magnet",
        "task_order": 7,
        "assignee": "assistant",
        "priority": "critical"
    })

    # T007: BullMQ DM Automation (FIXED rate limits from expert review)
    create_task({
        "project_id": PROJECT_ID,
        "title": "T007: BullMQ Rate-Limited DM Queue",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

📚 PROJECT DOCS:
- spec.md (DM automation requirements)

🔍 KNOWLEDGE BASE - BullMQ + Unipile:
Query Archon: "BullMQ rate limiting per-group configuration examples"
Query Archon: "BullMQ concurrency and rate limiting best practices"
Query Archon: "Unipile API send message daily limits LinkedIn"

**BullMQ queue for rate-limited DM sending:**

**Rate Limits (CORRECTED from expert review):**
- **100-150 DMs/day per LinkedIn account** (conservative: use 100)
- **NOT 50** (expert review fixed this)
- Min delay: 2 minutes between DMs
- Random delays: 2-15 minutes

**BullMQ Configuration:**
```typescript
{
  limiter: {
    max: 100,        // 100 DMs per day per account
    duration: 86400000,  // 24 hours in ms
    groupKey: 'linkedinAccountId'  // Per-account limits
  },
  concurrency: 1  // One DM at a time per account
}
```

**Multi-Account Support:**
- If client has 3 LinkedIn accounts
- Each gets separate 100 DM/day limit
- Total: 300 DMs/day across accounts
- Round-robin distribution

**DM Template Variables:**
```typescript
{
  first_name: string;
  trigger_word: string;
  lead_magnet_name: string;
  custom_message?: string;  // From voice cartridge
}
```

**Retry Logic:**
- Attempts: 3
- Delays: 15min, 30min, 60min (exponential backoff)
- Dead letter queue after final failure
- Monitoring alert on 2nd failure

**Acceptance Criteria:**
- ✅ BullMQ queue configured with rate limiting
- ✅ 100 DMs/day per account enforced
- ✅ Random delays (2-15 min) between DMs
- ✅ Multi-account round-robin working
- ✅ Template variable substitution
- ✅ Retry logic with exponential backoff

**Branch:** lead-magnet
**Assignee:** Assistant""",
        "status": "todo",
        "branch": "lead-magnet",
        "task_order": 8,
        "assignee": "assistant",
        "priority": "critical"
    })

    # ============================================================================
    # SESSION 4: Email Capture + Webhook (20 points)
    # ============================================================================

    # T008: Email Extraction
    create_task({
        "project_id": PROJECT_ID,
        "title": "T008: Email Extraction from DM Replies",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

📚 PROJECT DOCS:
- spec.md (email extraction logic)

🔍 KNOWLEDGE BASE - OpenAI + Regex:
Query Archon: "OpenAI GPT-4 email extraction from text with confidence scoring"
Query Archon: "Regex patterns for email validation RFC 5322 compliant"

**Extract email from DM replies:**

**Two-Stage Approach:**
1. Regex pattern matching (fast, deterministic)
2. GPT-4o fallback (for complex cases)

**Regex Pattern:**
```typescript
const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
```

**GPT-4o Extraction:**
```typescript
const prompt = `Extract the email address from this message.
If multiple emails found, return the most relevant one.
If no email found, return null.

Message: "${dmReply}"

Return JSON: { "email": "...", "confidence": 0.95 }`;
```

**Confidence Scoring:**
- High (90-100%): Clear email in reply
- Medium (70-89%): GPT-4o extraction
- Low (<70%): Manual review needed

**Manual Review Trigger:**
- Confidence <70%
- Multiple emails found
- No email found after clarification DM

**Clarification DM:**
- If no email found: "Could you share your email so I can send you the {lead_magnet_name}?"
- Max 1 clarification attempt
- If still no email: Mark as failed, notify user

**Acceptance Criteria:**
- ✅ Regex extraction working
- ✅ GPT-4o fallback implemented
- ✅ Confidence scoring accurate
- ✅ Manual review queue for <70% confidence
- ✅ Clarification DM sent when needed

**Branch:** lead-magnet
**Assignee:** Assistant""",
        "status": "todo",
        "branch": "lead-magnet",
        "task_order": 9,
        "assignee": "assistant",
        "priority": "high"
    })

    # T009: Webhook to Client ESP
    create_task({
        "project_id": PROJECT_ID,
        "title": "T009: Webhook to Client CRM/ESP",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

📚 PROJECT DOCS:
- spec.md (webhook delivery requirements)

🔍 KNOWLEDGE BASE - Webhooks:
Query Archon: "Webhook retry logic exponential backoff best practices"
Query Archon: "HMAC signature webhook security implementation Node.js"
Query Archon: "Zapier webhook integration authentication headers"

**Send captured lead data to client's CRM/ESP:**

**CRITICAL:** This is HTTP POST only, NOT email sending

**Webhook Payload:**
```typescript
{
  first_name: string;
  last_name: string;
  email: string;
  linkedin_profile: string;
  trigger_word: string;
  campaign_id: string;
  timestamp: string;
  source: "revos_lead_magnet"
}
```

**HMAC Signature:**
```typescript
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(JSON.stringify(payload))
  .digest('hex');

headers: {
  'X-Webhook-Signature': signature,
  'X-Webhook-Timestamp': Date.now(),
  'Content-Type': 'application/json'
}
```

**ESP Presets:**
- Zapier: `https://hooks.zapier.com/hooks/catch/...`
- Make.com: `https://hook.make.com/...`
- ConvertKit: `https://api.convertkit.com/v3/forms/{id}/subscribe`
- Custom: User-defined endpoint + auth header

**Retry Logic (EXPLICIT from expert review):**
- Attempt 1: Immediate
- Attempt 2: 15 minutes later
- Attempt 3: 30 minutes later
- Attempt 4: 60 minutes later
- After 4 failures: Dead letter queue + alert user

**Acceptance Criteria:**
- ✅ Webhook POST working
- ✅ HMAC signature implemented
- ✅ ESP presets (Zapier, Make, ConvertKit, Custom)
- ✅ 4-attempt retry with exponential backoff
- ✅ Dead letter queue for failures
- ✅ User alerts on webhook failures

**Branch:** lead-magnet
**Assignee:** Assistant""",
        "status": "todo",
        "branch": "lead-magnet",
        "task_order": 10,
        "assignee": "assistant",
        "priority": "critical"
    })

    # T010: Mailgun Delivery
    create_task({
        "project_id": PROJECT_ID,
        "title": "T010: Mailgun One-Time Lead Magnet Delivery",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

📚 PROJECT DOCS:
- spec.md (Mailgun delivery requirements)

🔍 KNOWLEDGE BASE - Mailgun + Supabase:
Query Archon: "Mailgun API send email with attachment Node.js example"
Query Archon: "Mailgun tracking open rates click rates configuration"
Query Archon: "Supabase Storage signed URLs 24-hour expiry"

**One-time lead magnet email delivery via Mailgun:**

**Flow:**
1. Email captured successfully
2. Send to webhook (primary delivery)
3. ALSO send via Mailgun (backup delivery)
4. Wait 5 minutes
5. Send backup DM with 24-hour link (if toggle enabled)

**Mailgun Configuration:**
```typescript
{
  from: 'noreply@{client-domain}.com',
  to: extractedEmail,
  subject: '{lead_magnet_name} - As Requested',
  text: 'Here is your {lead_magnet_name}...',
  html: '<p>Here is your {lead_magnet_name}...</p>',
  attachment: signedUrl  // From Supabase Storage
}
```

**Tracking:**
- Open rate tracking (Mailgun pixel)
- Click rate tracking (link tracking)
- Store stats in `email_deliveries` table

**Free Tier:**
- 5,000 emails/month
- Sufficient for MVP

**Backup DM:**
- Only if toggle enabled in campaign settings
- 5-minute delay after webhook delivery
- Signed URL expires in 24 hours
- URL shortening via bit.ly (optional)

**Acceptance Criteria:**
- ✅ Mailgun API client configured
- ✅ Email sending with attachment
- ✅ Open/click tracking working
- ✅ Backup DM sent (if enabled)
- ✅ 24-hour signed URLs from Supabase Storage

**Branch:** lead-magnet
**Assignee:** Assistant""",
        "status": "todo",
        "branch": "lead-magnet",
        "task_order": 11,
        "assignee": "assistant",
        "priority": "high"
    })

    # ============================================================================
    # SESSION 5: Engagement Pods (20 points)
    # ============================================================================

    # T011: Pod Infrastructure
    create_task({
        "project_id": PROJECT_ID,
        "title": "T011: Pod Infrastructure & Database",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

📚 PROJECT DOCS:
- spec.md (engagement pods specification, lines 213-221)
- data-model.md (pods, pod_members, pod_activities tables)

🔍 KNOWLEDGE BASE - Supabase:
Query Archon: "Supabase RLS policies for many-to-many relationships"
Query Archon: "Supabase real-time subscriptions for collaborative features"

**Build engagement pod infrastructure:**

**Database Tables:**
- `pods` - Pod definitions
- `pod_members` - Member associations with participation tracking
- `pod_activities` - Activity log (likes, comments, reposts)

**Pod Rules:**
- Min 9 members per pod
- Max 15 members per pod (optional limit)
- 100% participation (EVERYONE engages with EVERYTHING)
- NO rotation, NO selection

**Participation Enforcement (from expert review):**
- Track engagement per member per post
- Alert if <80% participation in 7 days
- Auto-suspend members with <50% participation
- Require re-activation after suspension

**Member Removal:**
- Super admin can remove members
- Member can leave pod
- Removal cascades to pod_activities (set member_id NULL)

**API Endpoints:**
- POST /api/pods - Create pod
- GET /api/pods - List pods
- POST /api/pods/:id/members - Add member
- DELETE /api/pods/:id/members/:userId - Remove member
- GET /api/pods/:id/stats - Participation stats

**Acceptance Criteria:**
- ✅ Pod CRUD operations working
- ✅ Min 9 members enforced
- ✅ Participation tracking implemented
- ✅ Auto-suspension for <50% participation
- ✅ Member removal handling

**Branch:** lead-magnet
**Assignee:** Assistant""",
        "status": "todo",
        "branch": "lead-magnet",
        "task_order": 12,
        "assignee": "assistant",
        "priority": "medium"
    })

    # T012: LinkedIn Session Capture for Pods
    create_task({
        "project_id": PROJECT_ID,
        "title": "T012: LinkedIn Session Capture for Pod Members",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

📚 PROJECT DOCS:
- unipile-api-research.md (session management)

🔍 KNOWLEDGE BASE - Unipile:
Query Archon: "Unipile hosted authentication iframe implementation"
Query Archon: "Unipile LinkedIn session token storage encryption"

**Capture LinkedIn sessions for pod members:**

**Hosted Auth Flow:**
1. Display Unipile iframe in modal
2. User enters LinkedIn username/password
3. Unipile returns `account_id` and tokens
4. Store encrypted in `linkedin_accounts` table

**Session Expiry Alerts (from expert review):**
- Alert 7 days before expiry
- Alert 1 day before expiry
- Alert on expiry (re-auth required)
- Slack/email notification options

**Session Storage:**
```typescript
{
  account_id: string;
  user_id: string;
  access_token: string;  // Encrypted
  refresh_token: string; // Encrypted
  expires_at: timestamp;
  status: 'active' | 'expired' | 'suspended';
}
```

**Session Validation:**
- Check expiry before EVERY API call
- Auto-refresh if <7 days until expiry
- Pause pod activities if session expired

**Acceptance Criteria:**
- ✅ Hosted auth iframe working
- ✅ Sessions stored encrypted
- ✅ Expiry alerts (7-day, 1-day, expiry)
- ✅ Session validation before API calls
- ✅ Auto-refresh implemented

**Branch:** lead-magnet
**Assignee:** Assistant""",
        "status": "todo",
        "branch": "lead-magnet",
        "task_order": 13,
        "assignee": "assistant",
        "priority": "medium"
    })

    # T013: Pod Post Detection System (NEW from expert review)
    create_task({
        "project_id": PROJECT_ID,
        "title": "T013: Pod Post Detection System",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

📚 PROJECT DOCS:
- spec.md (pod automation requirements)

🔍 KNOWLEDGE BASE - Unipile:
Query Archon: "Unipile API get user posts authored content filtering"
Query Archon: "Unipile LinkedIn post detection polling frequency best practices"

**Detect when pod members create new posts:**

**CRITICAL:** This task was missing from original list (expert review #5)

**Polling Strategy:**
- Poll all pod member posts every 30 minutes
- Detect new posts since last check (timestamp comparison)
- Trigger engagement workflow for ALL other members

**Detection Logic:**
```typescript
for (const member of podMembers) {
  const posts = await unipile.getUserPosts({
    account_id: member.account_id,
    limit: 10,
    since: lastCheckTimestamp
  });

  for (const newPost of posts) {
    // Queue engagement jobs for ALL other members
    await queueEngagementJobs(newPost, otherMembers);
  }
}
```

**Engagement Job Queuing:**
- For each new post, create jobs for:
  - Like (all members, random 5-30 min delay)
  - Comment (all members, random 1-6 hour delay)
  - Repost (optional, random subset)

**Participation Tracking:**
- Log each queued job
- Track completion
- Calculate participation_score

**Acceptance Criteria:**
- ✅ Polls pod member posts every 30 minutes
- ✅ Detects new posts accurately
- ✅ Queues engagement jobs for ALL members
- ✅ Participation tracking working
- ✅ No duplicate engagement (idempotent)

**Branch:** lead-magnet
**Assignee:** Assistant""",
        "status": "todo",
        "branch": "lead-magnet",
        "task_order": 14,
        "assignee": "assistant",
        "priority": "critical"
    })

    # T014: Pod Automation Engine (FIXED timing from expert review)
    create_task({
        "project_id": PROJECT_ID,
        "title": "T014: Pod Automation Engine",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

📚 PROJECT DOCS:
- spec.md (pod automation timing, lines 213-221)

🔍 KNOWLEDGE BASE - Unipile + BullMQ:
Query Archon: "Unipile API like comment repost endpoints rate limits"
Query Archon: "BullMQ delayed jobs scheduling future execution"

**Execute pod engagement actions:**

**Engagement Rules (CORRECTED from expert review):**
- **Like:** Random 5-30 minutes after post (NOT all at once)
- **Comment:** Random 1-6 hours after post (wider spread)
- **Repost:** Instant (optional, if enabled)
- **Stagger engagement:** Max 3 members engage within first hour

**CRITICAL:** Avoid simultaneous engagement (LinkedIn detection)

**BullMQ Job Delays:**
```typescript
// Like job (random 5-30 min)
await queue.add('pod-like', {
  post_id: newPost.id,
  member_id: member.id
}, {
  delay: randomDelay(5 * 60 * 1000, 30 * 60 * 1000)
});

// Comment job (random 1-6 hours)
await queue.add('pod-comment', {
  post_id: newPost.id,
  member_id: member.id,
  comment: await generateComment(newPost, member)
}, {
  delay: randomDelay(1 * 60 * 60 * 1000, 6 * 60 * 60 * 1000)
});
```

**Comment Generation:**
- Use member's voice cartridge
- Context-aware (read post content)
- Avoid generic comments
- Min 10 words, max 100 words

**Failure Handling:**
- If engagement fails: Retry 2 times (15min, 30min)
- If still fails: Mark member session as expired
- Alert member to re-authenticate

**Acceptance Criteria:**
- ✅ Engagement staggered (not simultaneous)
- ✅ Like timing: 5-30 minutes (random)
- ✅ Comment timing: 1-6 hours (random)
- ✅ Comments generated with voice cartridge
- ✅ Failure handling and retry logic

**Branch:** lead-magnet
**Assignee:** Assistant""",
        "status": "todo",
        "branch": "lead-magnet",
        "task_order": 15,
        "assignee": "assistant",
        "priority": "medium"
    })

    # ============================================================================
    # SESSION 6: AI Integration (10 points)
    # ============================================================================

    # T015: AgentKit Integration
    create_task({
        "project_id": PROJECT_ID,
        "title": "T015: AgentKit Campaign Orchestration",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

📚 PROJECT DOCS:
- spec.md (AgentKit integration requirements)

🔍 KNOWLEDGE BASE - OpenAI AgentKit:
Query Archon: "OpenAI AgentKit custom tools registration examples"
Query Archon: "OpenAI AgentKit function calling with structured outputs"
Query Archon: "AgentKit best practices for campaign orchestration"

**AgentKit for campaign management:**

**Custom Tools (from expert review with schemas):**

**createCampaign:**
```typescript
{
  name: string;
  trigger_word: string;
  lead_magnet_id: string;
  webhook_url: string;
  returns: {
    campaign_id: string;
    estimated_reach: number;
    suggested_post: string;
  }
}
```

**optimizeMessage:**
```typescript
{
  message: string;
  conversion_goal: 'email_capture' | 'engagement';
  audience: string;
  returns: {
    optimized_message: string;
    confidence_score: number;
    ab_variants: string[];
  }
}
```

**analyzePerformance:**
```typescript
{
  campaign_id: string;
  time_range: '7d' | '30d' | 'all';
  returns: {
    metrics: {...};
    insights: string[];
    recommendations: string[];
  }
}
```

**generatePostContent:**
```typescript
{
  topic: string;
  trigger_word: string;
  voice_cartridge_id: string;
  returns: {
    post_text: string;
    hashtags: string[];
    best_posting_time: string;
  }
}
```

**Acceptance Criteria:**
- ✅ AgentKit client initialized
- ✅ All 4 custom tools registered
- ✅ Campaign creation via AgentKit
- ✅ Message optimization working
- ✅ Performance analysis generating insights

**Branch:** lead-magnet
**Assignee:** Assistant""",
        "status": "todo",
        "branch": "lead-magnet",
        "task_order": 16,
        "assignee": "assistant",
        "priority": "low"
    })

    # T016: Mem0 Memory System (FIXED tenant keys from expert review)
    create_task({
        "project_id": PROJECT_ID,
        "title": "T016: Mem0 Memory System Integration",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

📚 PROJECT DOCS:
- 02-Cartridge-System-Specification.md (memory persistence)
- data-model.md (multi-tenant structure)

🔍 KNOWLEDGE BASE - Mem0:
Query Archon: "Mem0 tenant isolation best practices multi-tenant SaaS"
Query Archon: "Mem0 semantic search examples with metadata filtering"
Query Archon: "Mem0 pricing Pro plan monthly cost limits"

**Mem0 for persistent cartridge memory:**

**Tenant Isolation (CORRECTED from expert review):**

**CRITICAL:** Use 3-level tenant keys (NOT 2-level)

```typescript
// User-specific memory
const memoryKey = `${agencyId}::${clientId}::${userId}`;

// Client-specific (shared across users)
const clientMemory = `${agencyId}::${clientId}::shared`;

// Campaign-specific
const campaignMemory = `${agencyId}::${clientId}::campaign::${campaignId}`;
```

**WHY 3 levels:** Ensures agency-level isolation + client-level isolation + user-level isolation

**Memory Types:**
1. User preferences (cartridge selections, voice settings)
2. Campaign learnings (what works, what doesn't)
3. Conversation history (DM exchanges for context)

**Memory Operations:**
```typescript
// Store memory
await mem0.add({
  user_id: memoryKey,
  messages: [...],
  metadata: { type: 'user_preference' }
});

// Search memories
const results = await mem0.search({
  query: 'previous DM conversations about AI',
  user_id: memoryKey,
  limit: 10
});
```

**Pricing:**
- $20/month Pro plan
- Sufficient for MVP

**Acceptance Criteria:**
- ✅ Mem0 client initialized
- ✅ 3-level tenant isolation working
- ✅ Memory storage for user preferences
- ✅ Memory storage for campaign learnings
- ✅ Semantic search working

**Branch:** lead-magnet
**Assignee:** Assistant""",
        "status": "todo",
        "branch": "lead-magnet",
        "task_order": 17,
        "assignee": "assistant",
        "priority": "low"
    })

    # ============================================================================
    # SESSION 7: Monitoring + Testing (8 points)
    # ============================================================================

    # T017: Monitoring Dashboard
    create_task({
        "project_id": PROJECT_ID,
        "title": "T017: Real-time Monitoring Dashboard",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

📚 PROJECT DOCS:
- spec.md (monitoring requirements)

🔍 KNOWLEDGE BASE - Supabase + Recharts:
Query Archon: "Supabase real-time subscriptions React hooks example"
Query Archon: "Recharts line chart area chart examples with real-time data"

**Build campaign monitoring dashboard:**

**Real-time Metrics:**
- Comments detected (last 24 hours)
- DMs sent (daily count + remaining)
- Emails captured (conversion rate)
- Webhook deliveries (success rate)
- Pod engagement (participation %)

**Alert Thresholds (from expert review):**
- DMs remaining <10: Warning (yellow)
- DMs remaining <5: Critical (red)
- Conversion rate <3%: Low performance alert
- Webhook failures >5%: Integration issue alert

**Supabase Real-time:**
```typescript
const subscription = supabase
  .channel('campaign_metrics')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'messages'
  }, (payload) => {
    updateMetrics(payload);
  })
  .subscribe();
```

**Charts (Recharts):**
- Line chart: DMs sent over time
- Area chart: Email captures over time
- Bar chart: Conversion rate by campaign
- Pie chart: Webhook delivery status

**Acceptance Criteria:**
- ✅ Real-time metrics updating via Supabase subscriptions
- ✅ All 5 key metrics displayed
- ✅ Alert thresholds working
- ✅ Charts rendering with Recharts
- ✅ Responsive on mobile/tablet/desktop

**Branch:** lead-magnet
**Assignee:** Assistant""",
        "status": "todo",
        "branch": "lead-magnet",
        "task_order": 18,
        "assignee": "assistant",
        "priority": "low"
    })

    # T018: End-to-End Testing
    create_task({
        "project_id": PROJECT_ID,
        "title": "T018: End-to-End Testing Suite",
        "description": """📖 BEFORE YOU START: Read A-00 if you haven't!

📚 PROJECT DOCS:
- quickstart.md (8 scenarios to test)

🔍 KNOWLEDGE BASE - Testing:
Query Archon: "Playwright end-to-end testing best practices"
Query Archon: "Jest mock Unipile API responses"

**Comprehensive E2E testing:**

**Test Fixtures (from expert review):**
- 100 mock LinkedIn comments with trigger word
- 50 mock DM replies with emails
- 20 mock DM replies without emails (edge cases)
- 10 mock webhook delivery scenarios

**Mock Unipile Responses:**
```typescript
// Comment polling
mockUnipile.getPostComments.mockResolvedValue({
  comments: [/* fixture data */],
  has_more: false
});

// DM sending (95% success rate)
mockUnipile.sendMessage.mockImplementation(() => {
  if (Math.random() < 0.95) return { success: true };
  throw new Error('Rate limit exceeded');
});
```

**Test Scenarios (from quickstart.md):**
1. Campaign creation → Post → Comment detection → DM → Email capture → Webhook
2. Rate limit handling (101st DM fails)
3. Email extraction fallback (regex → GPT-4o)
4. Webhook retry logic (3 attempts)
5. Pod engagement (9 members, 100% participation)
6. Session expiry handling
7. Multi-tenant isolation (client A can't see client B's data)
8. Backup DM delivery (24-hour signed URL)

**Test Coverage Requirements:**
- Unit tests: >80%
- Integration tests: All happy paths + top 10 edge cases
- E2E tests: All 8 scenarios from quickstart.md

**Acceptance Criteria:**
- ✅ 8 E2E scenarios passing
- ✅ Mock fixtures created
- ✅ Unit test coverage >80%
- ✅ CI/CD pipeline running tests
- ✅ Edge cases covered

**Branch:** lead-magnet
**Assignee:** Assistant""",
        "status": "todo",
        "branch": "lead-magnet",
        "task_order": 19,
        "assignee": "assistant",
        "priority": "medium"
    })

    print(f"\n✅ All {17} tasks created successfully!")


def main():
    """Main execution"""
    print("=" * 80)
    print("BRAVO REVOS - CLEAN SLATE TASK RECREATION")
    print("=" * 80)

    # Step 1: Delete all tasks except A-00
    delete_all_tasks()

    # Step 2: Create all new tasks
    create_all_tasks()

    # Step 3: Verify final count
    print("\n🔍 Verification:")
    result = supabase.table('archon_tasks').select("*").eq('project_id', PROJECT_ID).execute()
    final_count = len(result.data)
    print(f"   Final task count: {final_count} tasks")

    # Calculate total points from descriptions
    total_points = 0
    for task in result.data:
        desc = task.get('description', '')
        if '**Points:**' in desc:
            try:
                points = int(desc.split('**Points:**')[1].split()[0])
                total_points += points
            except:
                pass
    print(f"   Total story points: {total_points} points")

    print("\n" + "=" * 80)
    print("✅ CLEAN SLATE COMPLETE!")
    print("=" * 80)
    print("\nTask Breakdown:")
    print("  A-00: Project Foundation (0 pts) - Already exists")
    print("  A-01: Bolt.new Scaffold (15 pts)")
    print("  T001-T004: Foundation (23 pts)")
    print("  T005-T007: Unipile + BullMQ (20 pts)")
    print("  T008-T010: Email + Webhook (20 pts)")
    print("  T011-T014: Engagement Pods (20 pts)")
    print("  T015-T016: AI Integration (10 pts)")
    print("  T017-T018: Monitoring + Testing (8 pts)")
    print(f"\n  TOTAL: {final_count} tasks, {total_points} points")


if __name__ == "__main__":
    main()
