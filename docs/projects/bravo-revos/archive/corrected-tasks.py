#!/usr/bin/env python3
"""
Corrected Bravo revOS MVP Tasks
Based on CRITICAL-REVIEW-TASK-ERRORS.md findings

Total: 100 points across 7 sessions
Tech Stack: Unipile API (NOT direct LinkedIn), BullMQ, Mailgun, Supabase, AgentKit, Mem0
NO Playwright in MVP (V2 only)
"""

import requests
import json

# Archon API Configuration
API_BASE = "http://localhost:3000"
PROJECT_ID = "de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531"  # Bravo revOS

# Session-based task organization (7 sessions, 100 points total)

TASKS = [
    # ========================================
    # SESSION 1: Bolt.new Scaffold (15 points)
    # ========================================
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
        "task_order": 100
    },

    # ========================================
    # SESSION 2: Cartridge System (20 points)
    # ========================================
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
  load_triggers JSONB, -- {keywords: [...], contexts: [...]}
  voice JSONB, -- {tone, style, auto_generated}
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
        "task_order": 90
    },
    {
        "title": "Voice Auto-Generation from LinkedIn",
        "description": """Implement voice parameter auto-generation from LinkedIn profile.

**Process (from 02-Cartridge-System-Specification.md lines 186-196):**
1. Fetch user's last 30 LinkedIn posts via Unipile API:
   ```javascript
   GET /api/v1/users/{provider_public_id}/posts?limit=30
   ```
2. Analyze posts with GPT-4o to extract:
   - Tone (professional, casual, technical, friendly)
   - Style markers (emoji usage, sentence length, humor level)
   - Common phrases and vocabulary
3. Generate voice JSONB:
   ```json
   {
     "tone": "professional-friendly",
     "style": {
       "emoji_frequency": "occasional",
       "sentence_length": "medium",
       "humor_level": "subtle"
     },
     "sample_phrases": [...],
     "auto_generated": true,
     "generated_at": "2025-11-03T..."
   }
   ```

**Unipile Endpoint:** GET /api/v1/users/{provider_public_id}/posts
**Reference:** 02-Cartridge-System-Specification.md lines 186-196
**Branch:** cartridge-system
**Points:** 7""",
        "status": "todo",
        "feature": "Cartridge System",
        "branch": "cartridge-system",
        "task_order": 89
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

**Load Triggers Example:**
```json
{
  "keywords": ["lead generation", "LinkedIn outreach"],
  "contexts": ["campaign_creation", "dm_composition"]
}
```

**Reference:** 02-Cartridge-System-Specification.md lines 456-506
**Branch:** cartridge-system
**Points:** 5""",
        "status": "todo",
        "feature": "Cartridge System",
        "branch": "cartridge-system",
        "task_order": 88
    },

    # ========================================
    # SESSION 3: Unipile + BullMQ + DM (20 points)
    # ========================================
    {
        "title": "Unipile API Client Setup",
        "description": """Create Unipile API client for LinkedIn operations.

**Authentication (from unipile-api-research.md):**
- Use username/password flow via Unipile
- Store account credentials in linkedin_sessions table
- Handle token refresh and rate limiting

**Client Initialization:**
```typescript
import { Unipile } from 'unipile-node';

const client = new Unipile({
  apiKey: process.env.UNIPILE_API_KEY,
  baseURL: 'https://api.unipile.com/api/v1'
});

// Connect LinkedIn account
const account = await client.accounts.create({
  provider: 'LINKEDIN',
  username: linkedinEmail,
  password: linkedinPassword
});
```

**Pricing:** $5.50/account/month
**Reference:** unipile-api-research.md, 01-RevOS-Technical-Architecture-v3.md
**Branch:** lead-magnet-features
**Points:** 5""",
        "status": "todo",
        "feature": "LinkedIn Integration",
        "branch": "lead-magnet-features",
        "task_order": 87
    },
    {
        "title": "Comment Polling System",
        "description": """Implement comment monitoring with randomized polling intervals.

**CRITICAL: Unipile does NOT support real-time comment webhooks.**

**Polling Strategy (from unipile-api-research.md):**
1. Poll every 15-30 minutes (randomized to avoid detection)
2. Fetch comments for monitored posts:
   ```javascript
   const comments = await client.users.getAllPostComments({
     account_id: accountId,
     post_id: postSocialId
   });
   ```
3. Filter new comments (check against database)
4. Extract commenter profile data
5. Queue DM jobs in BullMQ

**Randomization:**
```javascript
const pollInterval = randomBetween(15, 30) * 60 * 1000;
setInterval(async () => {
  await monitorPostComments();
}, pollInterval);
```

**Reference:** unipile-api-research.md, CRITICAL-REVIEW-TASK-ERRORS.md
**Branch:** lead-magnet-features
**Points:** 7""",
        "status": "todo",
        "feature": "Comment Monitoring",
        "branch": "lead-magnet-features",
        "task_order": 86
    },
    {
        "title": "BullMQ Rate-Limited DM Queue",
        "description": """Implement DM sending queue with rate limiting and staggered timing.

**Tech Stack:**
- BullMQ with Upstash Redis
- Rate limit: 50 DMs/day per account
- Staggered delays: 2-15 minutes random

**Queue Configuration:**
```typescript
import { Queue, Worker } from 'bullmq';

const dmQueue = new Queue('linkedin-dms', {
  connection: {
    url: process.env.UPSTASH_REDIS_URL
  }
});

// Add DM job with random delay
await dmQueue.add('send-dm', {
  accountId,
  recipientId,
  message,
  campaignId
}, {
  delay: randomBetween(2, 15) * 60 * 1000 // 2-15 min
});

// Worker with rate limiting
const worker = new Worker('linkedin-dms', async (job) => {
  const { accountId, recipientId, message } = job.data;

  // Check rate limit (50/day)
  const count = await getDailyDMCount(accountId);
  if (count >= 50) {
    throw new Error('Daily rate limit reached');
  }

  // Send DM via Unipile
  await client.chats.sendMessage({
    account_id: accountId,
    recipients_ids: [recipientId],
    text: message
  });
});
```

**Reference:** 01-RevOS-Technical-Architecture-v3.md, 04-MVP-Feature-Specification.md
**Branch:** lead-magnet-features
**Points:** 8""",
        "status": "todo",
        "feature": "DM Automation",
        "branch": "lead-magnet-features",
        "task_order": 85
    },

    # ========================================
    # SESSION 4: Email Capture + Webhook + Mailgun (20 points)
    # ========================================
    {
        "title": "Email Extraction from DM Replies",
        "description": """Extract email addresses from LinkedIn DM replies using GPT-4o.

**Flow:**
1. Monitor DM replies via Unipile webhook (`new_message`):
   ```javascript
   POST /api/webhooks/unipile
   {
     "type": "new_message",
     "data": {
       "message": "Sure! My email is john@example.com",
       "sender_id": "linkedin_user_id",
       "conversation_id": "conv_123"
     }
   }
   ```

2. Extract email with GPT-4o:
   ```javascript
   const completion = await openai.chat.completions.create({
     model: "gpt-4o",
     messages: [{
       role: "system",
       content: "Extract email address from message. Return only the email or 'NONE'."
     }, {
       role: "user",
       content: message
     }]
   });
   ```

3. Store in leads table with status 'email_captured'

**Webhook Setup:** Configure in Unipile dashboard for `new_message` events
**Reference:** 10-RevOS-MVP-80-20-Analysis-ICE-Scoring.md lines 264-277
**Branch:** lead-magnet-features
**Points:** 5""",
        "status": "todo",
        "feature": "Email Capture",
        "branch": "lead-magnet-features",
        "task_order": 84
    },
    {
        "title": "Webhook to Client CRM/ESP",
        "description": """POST captured leads to client's webhook endpoint (Zapier, Make, CRM).

**CRITICAL: This is NOT email sending. Just HTTP POST to client's webhook.**

**Payload (from 10-RevOS-MVP-80-20-Analysis-ICE-Scoring.md lines 264-277):**
```json
POST {client_webhook_url}
{
  "email": "john@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "linkedin_url": "https://linkedin.com/in/johndoe",
  "source": "revos-lead-magnet",
  "campaign_id": "camp_123",
  "lead_magnet_url": "https://storage.supabase.co/...",
  "captured_at": "2025-11-03T12:00:00Z"
}
```

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
        "task_order": 83
    },
    {
        "title": "Mailgun One-Time Lead Magnet Delivery",
        "description": """Send lead magnet email via Mailgun (one-time only, NOT sequences).

**CRITICAL: Client handles sequences via their newsletter. This is ONLY for initial lead magnet.**

**Flow (from 10-RevOS-MVP-80-20-Analysis-ICE-Scoring.md lines 280-317):**
1. After webhook POST succeeds
2. Send email via Mailgun:
   ```javascript
   await mailgun.messages.create(process.env.MAILGUN_DOMAIN, {
     from: campaign.from_email,
     to: lead.email,
     subject: campaign.email_subject,
     html: campaign.email_body,
     'h:List-Unsubscribe': `<mailto:unsubscribe@${domain}?subject=unsubscribe>`
   });
   ```

3. Email includes:
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
        "task_order": 82
    },

    # ========================================
    # SESSION 5: Engagement Pods (15 points)
    # ========================================
    {
        "title": "Pod Database Schema",
        "description": """Create engagement pods tables and RLS policies.

**Schema:**
```sql
CREATE TABLE pods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  min_members INT DEFAULT 9,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pod_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pod_id UUID NOT NULL REFERENCES pods(id),
  user_id UUID NOT NULL REFERENCES users(id),
  linkedin_account_id UUID REFERENCES linkedin_sessions(id),
  participation_score INT DEFAULT 0, -- Track engagement activity
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pod_id, user_id)
);

CREATE TABLE pod_rotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pod_id UUID NOT NULL REFERENCES pods(id),
  post_url TEXT NOT NULL,
  assigned_members JSONB, -- [{user_id, assigned_at, completed}]
  rotation_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS Policies:**
- Tenant isolation for pods
- Users can only see pods they're members of

**Reference:** 10-RevOS-MVP-80-20-Analysis-ICE-Scoring.md lines 384-423
**Branch:** lead-magnet-features
**Points:** 5""",
        "status": "todo",
        "feature": "Engagement Pods",
        "branch": "lead-magnet-features",
        "task_order": 81
    },
    {
        "title": "Pod Creation and LinkedIn Session Capture",
        "description": """Build pod management UI with LinkedIn session capture.

**Features:**
1. Create pod (name, description, min 9 members)
2. Invite members via email
3. LinkedIn session capture for each member:
   - Member logs into LinkedIn via browser
   - Capture session cookies/tokens
   - Store in linkedin_sessions table (encrypted)
   - Associate with pod_members.linkedin_account_id

**Session Capture Flow:**
```javascript
// Using Unipile hosted auth
const authUrl = await client.accounts.getHostedAuthUrl({
  provider: 'LINKEDIN',
  success_redirect_url: `${appUrl}/pods/${podId}/link-success`
});

// After user authorizes
const account = await client.accounts.get(accountId);
// Store account_id in linkedin_sessions
```

**Security:** All session data encrypted at rest
**Reference:** 10-RevOS-MVP-80-20-Analysis-ICE-Scoring.md lines 384-423
**Branch:** lead-magnet-features
**Points:** 5""",
        "status": "todo",
        "feature": "Engagement Pods",
        "branch": "lead-magnet-features",
        "task_order": 80
    },
    {
        "title": "Fair Rotation Algorithm",
        "description": """Implement pod engagement rotation with fairness algorithm.

**Algorithm (from 10-RevOS-MVP-80-20-Analysis-ICE-Scoring.md lines 384-423):**
1. When member posts content, add to pod_rotations
2. Select members fairly:
   - Exclude poster
   - Prioritize members with lowest participation_score
   - Randomly select from lowest-scored members
3. Assign 3-5 members to engage (like, comment)
4. Send notifications to assigned members
5. Track completion:
   - Members mark tasks complete manually OR
   - Auto-detect via Unipile API (check if they liked/commented)
6. Update participation_score on completion

**Fairness Formula:**
```javascript
// Members sorted by participation score (ascending)
const sortedMembers = members
  .filter(m => m.user_id !== posterId)
  .sort((a, b) => a.participation_score - b.participation_score);

// Select 3-5 from bottom 50%
const bottomHalf = sortedMembers.slice(0, Math.floor(sortedMembers.length / 2));
const selected = randomSample(bottomHalf, randomBetween(3, 5));
```

**Reference:** 10-RevOS-MVP-80-20-Analysis-ICE-Scoring.md lines 384-423
**Branch:** lead-magnet-features
**Points:** 5""",
        "status": "todo",
        "feature": "Engagement Pods",
        "branch": "lead-magnet-features",
        "task_order": 79
    },

    # ========================================
    # SESSION 6: AgentKit + Mem0 (10 points)
    # ========================================
    {
        "title": "AgentKit Campaign Orchestration",
        "description": """Integrate AgentKit for AI-powered campaign management.

**AgentKit Setup (from 05-MCP-Integration-Guide.md):**
```typescript
import { Agent } from '@openai/agentkit';

const campaignAgent = new Agent({
  model: 'gpt-4o',
  instructions: `You are a LinkedIn lead generation campaign manager.
    You help users create campaigns, monitor performance, and optimize DM messaging.`,
  tools: [
    // Built-in tools
    { type: 'web_search' },
    { type: 'file_search' },

    // Custom tools
    createCampaignTool,
    getDMStatsTool,
    optimizeMessageTool
  ]
});

// Use in campaign creation
const response = await campaignAgent.run({
  messages: [{
    role: 'user',
    content: 'Create a campaign for SaaS founders interested in AI tools'
  }]
});
```

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
        "task_order": 78
    },
    {
        "title": "Mem0 Cartridge Memory Integration",
        "description": """Integrate Mem0 for persistent cartridge and conversation memory.

**Mem0 Setup (from 05-MCP-Integration-Guide.md):**
```python
from mem0 import MemoryClient

client = MemoryClient(api_key=os.environ["MEM0_API_KEY"])

# Store cartridge context
client.add(
    messages=[{
        "role": "user",
        "content": "This cartridge handles LinkedIn DM outreach for SaaS products"
    }],
    user_id=f"{tenant_id}::{user_id}",
    metadata={
        "cartridge_id": cartridge_id,
        "tier": "workspace"
    }
)

# Retrieve relevant memories
memories = client.search(
    query="LinkedIn DM best practices",
    user_id=f"{tenant_id}::{user_id}",
    limit=5
)
```

**Tenant Isolation:** Use composite keys `tenantId::userId`
**Pricing:** $20/month Pro plan (100k messages, 50k memories)
**Reference:** 05-MCP-Integration-Guide.md lines 60-120
**Branch:** lead-magnet-features
**Points:** 5""",
        "status": "todo",
        "feature": "AI Memory",
        "branch": "lead-magnet-features",
        "task_order": 77
    },

    # ========================================
    # SESSION 7: Monitoring + Testing (5 points)
    # ========================================
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

**Charts:**
- Comment volume over time
- DM sending velocity
- Conversion funnel (comment → DM → email → webhook → delivery)
- Pod participation heatmap

**Tech:**
- React + Recharts for visualizations
- Supabase real-time subscriptions for live updates
- Server-sent events for BullMQ job status

**Reference:** 10-RevOS-MVP-80-20-Analysis-ICE-Scoring.md
**Branch:** lead-magnet-features
**Points:** 3""",
        "status": "todo",
        "feature": "Monitoring",
        "branch": "lead-magnet-features",
        "task_order": 76
    },
    {
        "title": "End-to-End Testing",
        "description": """Create integration tests for complete lead magnet flow.

**Test Scenarios:**
1. LinkedIn comment → DM queue → DM sent
2. DM reply → email extraction → webhook POST
3. Webhook success → Mailgun email delivery
4. Rate limiting enforcement (50 DMs/day)
5. Engagement pod rotation fairness
6. Unipile API error handling and retry logic

**Test Data:**
- Mock Unipile API responses
- Test LinkedIn accounts
- Test webhook endpoint
- Test Mailgun sandbox

**Tech:** Vitest or Jest with Supertest
**Coverage Target:** 80%+ for critical paths
**Reference:** 10-RevOS-MVP-80-20-Analysis-ICE-Scoring.md
**Branch:** lead-magnet-features
**Points:** 2""",
        "status": "todo",
        "feature": "Testing",
        "branch": "lead-magnet-features",
        "task_order": 75
    }
]

def delete_all_tasks():
    """Delete all existing tasks in the project."""
    print("\n" + "="*60)
    print("STEP 1: DELETE EXISTING TASKS")
    print("="*60)

    # Get all tasks
    response = requests.get(
        f"{API_BASE}/projects/{PROJECT_ID}/tasks",
        params={"include_closed": True}
    )

    if response.status_code != 200:
        print(f"❌ Failed to fetch tasks: {response.text}")
        return

    tasks = response.json()
    print(f"\nFound {len(tasks)} existing tasks to delete")

    # Delete each task
    for task in tasks:
        task_id = task["id"]
        delete_response = requests.delete(f"{API_BASE}/tasks/{task_id}")

        if delete_response.status_code == 200:
            print(f"✅ Deleted task: {task['title'][:50]}...")
        else:
            print(f"❌ Failed to delete task {task_id}: {delete_response.text}")

    print(f"\n✅ Deleted {len(tasks)} tasks")

def create_corrected_tasks():
    """Create corrected tasks based on review findings."""
    print("\n" + "="*60)
    print("STEP 2: CREATE CORRECTED TASKS")
    print("="*60)
    print(f"\nTotal tasks to create: {len(TASKS)}")
    print(f"Total points: {sum(int(t['description'].split('**Points:** ')[1].split('**')[0]) for t in TASKS if '**Points:**' in t['description'])}")

    created_count = 0
    failed_count = 0

    for idx, task in enumerate(TASKS, 1):
        payload = {
            "project_id": PROJECT_ID,
            "title": task["title"],
            "description": task["description"],
            "status": task["status"],
            "feature": task["feature"],
            "branch": task["branch"],
            "task_order": task["task_order"],
            "assignee": "User"  # Default to User
        }

        response = requests.post(f"{API_BASE}/tasks", json=payload)

        if response.status_code == 201:
            created_count += 1
            # Extract points from description
            points = task['description'].split('**Points:** ')[1].split('\n')[0] if '**Points:**' in task['description'] else '?'
            print(f"✅ [{idx}/{len(TASKS)}] Created: {task['title'][:40]}... ({points} pts, {task['branch']})")
        else:
            failed_count += 1
            print(f"❌ [{idx}/{len(TASKS)}] Failed: {task['title'][:40]}...")
            print(f"   Error: {response.text}")

    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    print(f"✅ Created: {created_count} tasks")
    if failed_count > 0:
        print(f"❌ Failed: {failed_count} tasks")
    print(f"\n📊 Total MVP Points: 100")
    print(f"📦 Branches: bolt-scaffold, cartridge-system, lead-magnet-features")
    print(f"🎯 Tech Stack: Unipile API, BullMQ, Mailgun, Supabase, AgentKit, Mem0")
    print(f"⚠️  NO Playwright in MVP (V2 only)")

if __name__ == "__main__":
    print("="*60)
    print("BRAVO REVOS - CORRECTED TASK CREATION")
    print("="*60)
    print("\nBased on: CRITICAL-REVIEW-TASK-ERRORS.md")
    print("Source: 10-RevOS-MVP-80-20-Analysis-ICE-Scoring.md (7-session breakdown)")
    print("\nThis script will:")
    print("1. Delete all 22 existing tasks (with errors)")
    print("2. Create 15 corrected tasks (100 points total)")

    proceed = input("\nProceed? (yes/no): ")
    if proceed.lower() != 'yes':
        print("Aborted.")
        exit(0)

    delete_all_tasks()
    create_corrected_tasks()

    print("\n✅ Task correction complete!")
    print("🎯 Next: Verify tasks in AgroArchon UI")
