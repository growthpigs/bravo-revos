# LinkedIn DM Pod - Complete Workflow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or subagent-driven-development) to implement this plan task-by-task with code review between tasks.

**Date:** November 24, 2025
**Status:** Ready for Implementation
**Priority:** FLAGSHIP FEATURE - Must be perfect
**Estimated Effort:** 8-12 hours

---

## Executive Summary

This plan implements the complete LinkedIn DM Pod workflow, the **FLAGSHIP FEATURE** of Bravo revOS. The workflow converts LinkedIn post comments into qualified email leads through automated DM sequences, email capture, ESP integration, and pod amplification.

**User Journey:**
1. **Lead Magnet Selection** - User picks/creates lead magnet (PDF), determines trigger keyword
2. **Post Auto-Generation** - Post generated from brand cartridge with trigger keyword embedded
3. **DM Sequence** - 3-step semi-automated DM flow (initial ask, backup link, follow-up)
4. **Webhook Setup** - Connect to user's ESP (GetResponse, Mailchimp, etc.)
5. **Email Delivery** - ESP (primary) or Mailgun (secondary) with toggles
6. **Pod Amplification** - Playwright-based reposting by 3-50+ pod members to boost visibility

**CRITICAL:** This is NOT a simple feature - it's the primary value proposition that must work flawlessly.

---

## Architecture

**Backend (100% Complete):**
- ✅ Comment monitoring worker (`lib/workers/comment-monitor.ts`)
- ✅ DM sending worker (`lib/workers/dm-worker.ts`)
- ✅ Reply monitoring worker (`lib/workers/reply-monitor.ts`)
- ✅ Cron endpoints (`/api/cron/poll-comments`, `/api/cron/poll-replies`)
- ✅ Database schema extended for DM flow
- ✅ BullMQ queue infrastructure with Redis
- ✅ Email extraction (regex + GPT-4 fallback)
- ✅ ESP webhook delivery with HMAC signing

**What We're Building:**
- Lead magnet template system
- Post generation with trigger keyword embedding
- HGC chat workflow integration
- Pod amplification with Playwright browser automation
- Campaign dashboard UI
- Activity monitoring and alerts

**Integration Points:**
- Existing DM sequences MVP (from `2025-11-11-dm-sequences-mvp.md`)
- Existing pod amplification design (from `2025-11-16-pod-amplification-design.md`)
- HGC console workflow system
- Cartridge system (brand, style, voice)

---

## Tech Stack

- **Frontend:** Next.js 14 App Router, TypeScript, Tailwind, shadcn/ui
- **Backend:** Next.js API routes, Supabase PostgreSQL + RLS
- **Queue:** BullMQ + Upstash Redis
- **AI:** OpenAI AgentKit (`@openai/agents`), GPT-4o
- **LinkedIn:** Unipile API ($5.50/account/month)
- **Browser:** Playwright (for reposting - Unipile auth only)
- **Storage:** Supabase Storage (lead magnets)
- **Email:** Mailgun (secondary option)
- **ESP:** Webhooks with HMAC signing

---

## Prerequisites Verification

**Before starting ANY task, verify:**

```bash
# 1. Verify Redis connection
redis-cli ping  # Expected: PONG

# 2. Verify Supabase connection
psql $DATABASE_URL -c "SELECT 1"  # Expected: 1

# 3. Verify Playwright installed
npx playwright --version  # Expected: Version 1.56.1

# 4. Verify environment variables
cat .env.local | grep -E "(REDIS_URL|UNIPILE_API_KEY|OPENAI_API_KEY|MAILGUN_API_KEY)"

# 5. Verify dev server running
curl http://localhost:3000/api/health
```

**If ANY prerequisite fails, STOP and fix before proceeding.**

---

## Task 1: Database Schema - Lead Magnets & Campaigns Extension (30 min)

**Goal:** Add lead_magnets table and extend campaigns table for DM pod workflow

**Files:**
- Create: `supabase/migrations/20251124_lead_magnets_and_campaigns.sql`

**Step 1: Write migration SQL**

```sql
-- Supabase Project: trdoainmejxanrownbuz
-- Click: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new

-- Lead Magnets Table
CREATE TABLE IF NOT EXISTS lead_magnets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Magnet details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL, -- Supabase Storage URL
  file_size_bytes INTEGER,
  file_type VARCHAR(50), -- e.g., 'application/pdf'

  -- Download link config
  short_link VARCHAR(255) UNIQUE, -- e.g., 'bravo.link/guide-123'
  link_expiry_hours INTEGER NOT NULL DEFAULT 24,

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Extend campaigns table for DM pod workflow
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS lead_magnet_id UUID REFERENCES lead_magnets(id) ON DELETE SET NULL;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS trigger_keyword VARCHAR(255);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS dm_sequence_enabled BOOLEAN DEFAULT true;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS pod_amplification_enabled BOOLEAN DEFAULT true;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lead_magnets_client ON lead_magnets(client_id);
CREATE INDEX IF NOT EXISTS idx_lead_magnets_user ON lead_magnets(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_magnets_active ON lead_magnets(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_campaigns_lead_magnet ON campaigns(lead_magnet_id);

-- RLS Policies
ALTER TABLE lead_magnets ENABLE ROW LEVEL SECURITY;

CREATE POLICY lead_magnets_client_isolation ON lead_magnets
  FOR ALL
  USING (client_id = (SELECT client_id FROM users WHERE id = auth.uid()));

-- Updated_at trigger
CREATE TRIGGER lead_magnets_updated_at
  BEFORE UPDATE ON lead_magnets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Step 2: Apply migration via Supabase SQL editor**

```bash
# Copy migration SQL to clipboard
cat supabase/migrations/20251124_lead_magnets_and_campaigns.sql | pbcopy

# Open Supabase SQL editor
open "https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new"

# Paste and execute
```

**Step 3: Verify tables exist**

```bash
psql $DATABASE_URL -c "\d lead_magnets"
psql $DATABASE_URL -c "\d campaigns"
```

Expected: Tables show with all columns and indexes

**Step 4: Test RLS policies**

```bash
# Insert test lead magnet (should succeed with valid client_id)
psql $DATABASE_URL -c "INSERT INTO lead_magnets (client_id, user_id, name, file_url) VALUES ('CLIENT_UUID', 'USER_UUID', 'Test Guide', 'https://storage.supabase.co/test.pdf');"

# Try to select as different user (should fail or return empty)
psql $DATABASE_URL -c "SELECT * FROM lead_magnets WHERE client_id = 'DIFFERENT_CLIENT_UUID';"
```

Expected: RLS prevents cross-client access

**Step 5: Commit**

```bash
git add supabase/migrations/20251124_lead_magnets_and_campaigns.sql
git commit -m "feat(db): add lead_magnets table and extend campaigns for DM pod workflow"
```

**Success Criteria:**
- ✅ lead_magnets table created
- ✅ campaigns table extended with 4 new columns
- ✅ Indexes created for performance
- ✅ RLS policies enforce client isolation
- ✅ Migration applies without errors

---

## Task 2: Lead Magnet Upload API (30 min)

**Goal:** API endpoint to upload lead magnet files to Supabase Storage

**Files:**
- Create: `app/api/lead-magnets/upload/route.ts`

**Step 1: Create upload endpoint**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';

// POST /api/lead-magnets/upload
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's client_id
    const { data: userData } = await supabase
      .from('users')
      .select('client_id')
      .eq('id', user.id)
      .single();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string || null;

    if (!file || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: file, name' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/zip', 'application/vnd.ms-excel'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: PDF, ZIP, Excel' },
        { status: 400 }
      );
    }

    // Validate file size (max 50MB)
    const maxSizeBytes = 50 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${userData.client_id}/${nanoid()}.${fileExt}`;

    // Upload to Supabase Storage
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('lead-magnets')
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('[LEAD_MAGNETS] Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('lead-magnets')
      .getPublicUrl(fileName);

    // Generate short link
    const shortLink = `bravo.link/${nanoid(8)}`;

    // Create lead magnet record
    const { data: leadMagnet, error: createError } = await supabase
      .from('lead_magnets')
      .insert({
        client_id: userData.client_id,
        user_id: user.id,
        name,
        description,
        file_url: urlData.publicUrl,
        file_size_bytes: file.size,
        file_type: file.type,
        short_link: shortLink,
        link_expiry_hours: 24
      })
      .select()
      .single();

    if (createError) {
      console.error('[LEAD_MAGNETS] Create error:', createError);
      return NextResponse.json(
        { error: 'Failed to create lead magnet record' },
        { status: 500 }
      );
    }

    return NextResponse.json({ leadMagnet }, { status: 201 });

  } catch (error) {
    console.error('[LEAD_MAGNETS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Step 2: Test upload endpoint**

```bash
# Create test PDF file
echo "Test PDF content" > /tmp/test-lead-magnet.pdf

# Upload via curl
curl -X POST http://localhost:3000/api/lead-magnets/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/tmp/test-lead-magnet.pdf" \
  -F "name=Test Lead Magnet" \
  -F "description=This is a test"
```

Expected: `{"leadMagnet":{...}}` with 201 status

**Step 3: Verify file in Supabase Storage**

```bash
# Check Supabase Storage bucket
open "https://supabase.com/dashboard/project/trdoainmejxanrownbuz/storage/buckets/lead-magnets"
```

Expected: File appears in storage with correct path

**Step 4: Commit**

```bash
git add app/api/lead-magnets/upload/route.ts
git commit -m "feat(api): add lead magnet file upload endpoint"
```

**Success Criteria:**
- ✅ Accepts file upload via multipart form data
- ✅ Validates file type and size
- ✅ Uploads to Supabase Storage
- ✅ Creates lead magnet database record
- ✅ Generates short link
- ✅ Returns created lead magnet

---

## Task 3: Console Workflow - "pod" Command (45 min)

**Goal:** Add "pod" command to HGC chat that triggers campaign management workflow

**Files:**
- Create: `supabase/migrations/20251124_create_pod_workflow.sql`

**Step 1: Create console workflow migration**

```sql
-- Supabase Project: trdoainmejxanrownbuz
-- Click: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new

INSERT INTO console_workflows (
  name,
  description,
  triggers,
  system_prompt,
  steps,
  created_at
) VALUES (
  'linkedin-dm-pod',
  'Complete LinkedIn DM Pod workflow for automated lead generation',
  '{"commands": ["pod", "campaign", "leads", "dm"], "case_insensitive": true}',

  'You are the LinkedIn DM Pod campaign manager for Bravo revOS. Help users create and monitor automated lead generation campaigns that convert post comments into email leads through DM sequences and pod amplification.

Your role:
- Guide users through campaign setup (lead magnet selection, post generation, trigger keyword)
- Monitor active campaigns and show real-time metrics
- Manage pod members for amplification
- Troubleshoot issues and optimize performance

Always be concise, action-oriented, and show data visually when possible.',

  jsonb_build_array(
    -- Step 1: Main Menu
    jsonb_build_object(
      'id', 'main_menu',
      'type', 'menu',
      'description', 'Show campaign management options',
      'message', '📊 **LinkedIn DM Pod Campaigns**\n\nWhat would you like to do?',
      'buttons', jsonb_build_array(
        jsonb_build_object('label', 'Create Campaign', 'value', 'create_campaign'),
        jsonb_build_object('label', 'View Campaigns', 'value', 'view_campaigns'),
        jsonb_build_object('label', 'Check Leads', 'value', 'view_leads'),
        jsonb_build_object('label', 'Manage Pod', 'value', 'manage_pod')
      )
    ),

    -- Step 2: Create Campaign Flow
    jsonb_build_object(
      'id', 'create_campaign',
      'type', 'multi_step',
      'description', 'Guide user through campaign creation',
      'steps', jsonb_build_array(
        -- 2.1: Lead Magnet Selection
        jsonb_build_object(
          'id', 'select_lead_magnet',
          'type', 'query',
          'description', 'Load existing lead magnets or prompt upload',
          'query', 'lead_magnets',
          'message', '📥 **Select or Upload Lead Magnet**\n\nLead magnets: {{lead_magnets.length}}\n\nChoose an existing lead magnet or upload a new one.',
          'buttons', jsonb_build_array(
            jsonb_build_object('label', 'Upload New', 'value', 'upload_lead_magnet')
          ),
          'next', 'set_trigger_keyword'
        ),

        -- 2.2: Trigger Keyword
        jsonb_build_object(
          'id', 'set_trigger_keyword',
          'type', 'input',
          'description', 'Get trigger keyword for DM automation',
          'input_type', 'text',
          'message', '🔑 **Set Trigger Keyword**\n\nWhat word/phrase should trigger the DM?\n\n(Default: "GUIDE", "SEND", "INTERESTED")',
          'placeholder', 'GUIDE',
          'validation', 'min:2,max:50',
          'next', 'generate_post'
        ),

        -- 2.3: Post Generation
        jsonb_build_object(
          'id', 'generate_post',
          'type', 'ai_action',
          'description', 'Generate LinkedIn post with trigger keyword',
          'prompt', 'Generate a LinkedIn post for lead magnet: {{lead_magnet.name}}. Embed trigger keyword: {{trigger_keyword}}. Use brand cartridge context.',
          'message', '✍️ **Generating Post...**\n\nCreating LinkedIn post with your trigger keyword embedded.',
          'next', 'configure_dm_sequence'
        ),

        -- 2.4: DM Sequence Config
        jsonb_build_object(
          'id', 'configure_dm_sequence',
          'type', 'form',
          'description', 'Configure DM sequence settings',
          'message', '💬 **DM Sequence Settings**\n\nConfigure your automated DM flow:',
          'fields', jsonb_build_array(
            jsonb_build_object('name', 'dm1_template', 'label', 'Initial DM Template', 'type', 'textarea', 'default', 'Hi {{name}}! Drop your email and I''ll send {{lead_magnet_name}} right over.'),
            jsonb_build_object('name', 'dm2_enabled', 'label', 'Enable Backup DM', 'type', 'checkbox', 'default', true),
            jsonb_build_object('name', 'dm3_enabled', 'label', 'Enable Follow-up DM', 'type', 'checkbox', 'default', false)
          ),
          'next', 'configure_webhook'
        ),

        -- 2.5: ESP Webhook
        jsonb_build_object(
          'id', 'configure_webhook',
          'type', 'input',
          'description', 'Get ESP webhook URL',
          'input_type', 'url',
          'message', '🔗 **Connect Your ESP**\n\nPaste your GetResponse/Mailchimp webhook URL (optional):',
          'placeholder', 'https://api.getresponse.com/webhooks/...',
          'optional', true,
          'next', 'configure_pod'
        ),

        -- 2.6: Pod Amplification
        jsonb_build_object(
          'id', 'configure_pod',
          'type', 'toggle',
          'description', 'Enable pod amplification',
          'message', '🚀 **Pod Amplification**\n\nAutomatically repost from {{pod_members.length}} pod members?\n\nThis boosts visibility 10-50x.',
          'default', true,
          'next', 'confirm_campaign'
        ),

        -- 2.7: Confirmation
        jsonb_build_object(
          'id', 'confirm_campaign',
          'type', 'confirmation',
          'description', 'Review and activate campaign',
          'message', '✅ **Campaign Ready!**\n\n**Lead Magnet:** {{lead_magnet.name}}\n**Trigger:** "{{trigger_keyword}}"\n**Pod Members:** {{pod_members.length}}\n**ESP:** {{webhook_url || "Mailgun (default)"}}\n\nActivate this campaign?',
          'buttons', jsonb_build_array(
            jsonb_build_object('label', 'Activate Campaign', 'value', 'activate'),
            jsonb_build_object('label', 'Cancel', 'value', 'cancel')
          )
        )
      )
    ),

    -- Step 3: View Campaigns
    jsonb_build_object(
      'id', 'view_campaigns',
      'type', 'query',
      'description', 'Show active campaigns with metrics',
      'query', 'campaigns',
      'message', '📊 **Your Campaigns**\n\n{{#each campaigns}}- **{{name}}**\n  Status: {{status}}\n  Leads: {{leads_count}}\n  Trigger: "{{trigger_keyword}}"\n{{/each}}\n\nClick a campaign to see details.',
      'next', 'main_menu'
    ),

    -- Step 4: View Leads
    jsonb_build_object(
      'id', 'view_leads',
      'type', 'query',
      'description', 'Show captured leads',
      'query', 'leads',
      'message', '📧 **Captured Leads ({{leads.length}})**\n\n{{#each leads}}- {{name}} ({{email}})\n  Campaign: {{campaign.name}}\n  Status: {{status}}\n{{/each}}',
      'next', 'main_menu'
    ),

    -- Step 5: Manage Pod
    jsonb_build_object(
      'id', 'manage_pod',
      'type', 'redirect',
      'description', 'Redirect to admin pod management',
      'url', '/admin/pods',
      'message', '🤝 **Pod Management**\n\nRedirecting to pod member dashboard...'
    )
  ),

  NOW()
);
```

**Step 2: Apply migration**

```bash
# Copy SQL to clipboard
cat supabase/migrations/20251124_create_pod_workflow.sql | pbcopy

# Open Supabase SQL editor
open "https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new"

# Paste and execute
```

**Step 3: Test workflow trigger in chat**

```bash
# Start dev server
npm run dev

# Open browser
open "http://localhost:3000/dashboard"

# In chat, type: pod
```

Expected: Chat shows "📊 LinkedIn DM Pod Campaigns" menu with buttons

**Step 4: Verify workflow in database**

```bash
psql $DATABASE_URL -c "SELECT name, triggers FROM console_workflows WHERE name = 'linkedin-dm-pod';"
```

Expected: Row exists with correct triggers

**Step 5: Commit**

```bash
git add supabase/migrations/20251124_create_pod_workflow.sql
git commit -m "feat(console): add 'pod' command workflow for DM pod campaign management"
```

**Success Criteria:**
- ✅ "pod" command triggers workflow in chat
- ✅ Main menu shows with 4 buttons
- ✅ Workflow stored in console_workflows table
- ✅ Workflow structure matches design

---

## Task 4: Pod Amplification - Database Schema (30 min)

**Goal:** Create pod_members and pod_activities tables for Playwright-based reposting

**Files:**
- Create: `supabase/migrations/20251124_create_pod_tables.sql`

**Step 1: Create pod tables migration**

```sql
-- Supabase Project: trdoainmejxanrownbuz
-- Click: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new

-- Pod Members Table
CREATE TABLE IF NOT EXISTS pod_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Member identification
  name TEXT NOT NULL,
  linkedin_url TEXT NOT NULL,
  unipile_account_id TEXT NOT NULL UNIQUE, -- Unipile account ID for session tokens

  -- Status tracking
  is_active BOOLEAN DEFAULT true,
  last_activity_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pod Activities Table (tracks individual repost attempts)
CREATE TABLE IF NOT EXISTS pod_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  pod_member_id UUID NOT NULL REFERENCES pod_members(id) ON DELETE CASCADE,

  -- Action details
  action TEXT NOT NULL DEFAULT 'repost',
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'success', 'failed')),
  error_message TEXT,

  -- Timing
  scheduled_for TIMESTAMPTZ NOT NULL,
  executed_at TIMESTAMPTZ,

  -- Result
  repost_url TEXT, -- Link to member's repost on LinkedIn

  -- Retry tracking
  attempt_number INTEGER DEFAULT 1,
  max_attempts INTEGER DEFAULT 3,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pod_members_client ON pod_members(client_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_pod_members_user ON pod_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pod_members_unipile ON pod_members(unipile_account_id);

CREATE INDEX IF NOT EXISTS idx_pod_activities_post ON pod_activities(post_id);
CREATE INDEX IF NOT EXISTS idx_pod_activities_member ON pod_activities(pod_member_id);
CREATE INDEX IF NOT EXISTS idx_pod_activities_status ON pod_activities(status) WHERE status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS idx_pod_activities_scheduled ON pod_activities(scheduled_for) WHERE status = 'pending';

-- RLS Policies
ALTER TABLE pod_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE pod_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY pod_members_client_isolation ON pod_members
  FOR ALL
  USING (client_id = (SELECT client_id FROM users WHERE id = auth.uid()));

CREATE POLICY pod_activities_client_isolation ON pod_activities
  FOR ALL
  USING (
    pod_member_id IN (
      SELECT id FROM pod_members WHERE client_id = (
        SELECT client_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Updated_at trigger
CREATE TRIGGER pod_members_updated_at
  BEFORE UPDATE ON pod_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Step 2: Apply migration**

```bash
# Copy SQL to clipboard
cat supabase/migrations/20251124_create_pod_tables.sql | pbcopy

# Open Supabase SQL editor
open "https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new"

# Paste and execute
```

**Step 3: Verify tables exist**

```bash
psql $DATABASE_URL -c "\d pod_members"
psql $DATABASE_URL -c "\d pod_activities"
```

Expected: Both tables show with all columns and indexes

**Step 4: Test RLS policies**

```bash
# Insert test pod member
psql $DATABASE_URL -c "INSERT INTO pod_members (client_id, user_id, name, linkedin_url, unipile_account_id) VALUES ('CLIENT_UUID', 'USER_UUID', 'Test Member', 'https://linkedin.com/in/test', 'unipile_test_123');"

# Verify RLS prevents cross-client access
psql $DATABASE_URL -c "SELECT * FROM pod_members WHERE client_id = 'DIFFERENT_CLIENT_UUID';"
```

Expected: RLS prevents access

**Step 5: Commit**

```bash
git add supabase/migrations/20251124_create_pod_tables.sql
git commit -m "feat(db): add pod_members and pod_activities tables for amplification"
```

**Success Criteria:**
- ✅ pod_members table created with RLS
- ✅ pod_activities table created with RLS
- ✅ Indexes created for performance
- ✅ Foreign keys working
- ✅ RLS policies enforce client isolation

---

## Task 5: Pod Amplification - BullMQ Queue (45 min)

**Goal:** Configure pod repost queue with Playwright worker

**Files:**
- Create: `lib/queues/pod-repost-queue.ts`
- Create: `lib/workers/repost-executor.ts`

**Step 1: Create BullMQ queue configuration**

```typescript
// lib/queues/pod-repost-queue.ts
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { executeRepost } from '@/lib/workers/repost-executor';

const connection = new Redis(
  process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL
);

export const podRepostQueue = new Queue('pod-repost', {
  connection,
  defaultJobOptions: {
    attempts: 2, // Only 2 attempts (Playwright reposts are expensive)
    backoff: {
      type: 'exponential',
      delay: 120000 // Start with 2 minutes
    },
    removeOnComplete: {
      age: 3600 * 24 * 7 // Keep completed jobs for 7 days
    },
    removeOnFail: false // Keep failed jobs for debugging
  }
});

export const podRepostWorker = new Worker(
  'pod-repost',
  async (job) => {
    console.log('[PodWorker] Executing repost:', job.data.activityId);
    await executeRepost(job.data.activityId);
  },
  {
    connection,
    limiter: {
      max: 2, // Max 2 concurrent Playwright instances (resource intensive)
      duration: 60000 // Per minute
    },
    concurrency: 2 // Process 2 jobs simultaneously max
  }
);

// Event handlers
podRepostWorker.on('completed', (job) => {
  console.log('[PodWorker] ✅ Completed:', job.id);
});

podRepostWorker.on('failed', (job, err) => {
  console.error('[PodWorker] ❌ Failed:', job?.id, err.message);
});

podRepostWorker.on('error', (err) => {
  console.error('[PodWorker] ⚠️ Worker error:', err);
});
```

**Step 2: Create Playwright repost executor**

```typescript
// lib/workers/repost-executor.ts
import { chromium } from 'playwright';
import { createClient } from '@/lib/supabase/server';

export async function executeRepost(activityId: string) {
  const supabase = createClient();

  // 1. Load activity + member + post details
  const { data: activity, error } = await supabase
    .from('pod_activities')
    .select(`
      *,
      pod_members!inner(*),
      posts!inner(*)
    `)
    .eq('id', activityId)
    .single();

  if (error || !activity) {
    throw new Error(`Activity not found: ${activityId}`);
  }

  const member = activity.pod_members;
  const post = activity.posts;

  console.log(`[Repost] Starting for member: ${member.name}, post: ${post.post_url}`);

  // Update status to processing
  await supabase
    .from('pod_activities')
    .update({ status: 'processing' })
    .eq('id', activityId);

  try {
    // 2. Get Unipile session token
    const sessionToken = await getUnipileSessionToken(member.unipile_account_id);

    console.log(`[Repost] Retrieved Unipile session for: ${member.unipile_account_id}`);

    // 3. Launch Playwright browser
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    // 4. Inject Unipile session cookies
    await context.addCookies([
      {
        name: 'li_at',
        value: sessionToken.li_at,
        domain: '.linkedin.com',
        path: '/',
        secure: true,
        httpOnly: true
      },
      // Add any additional cookies from Unipile
      ...(sessionToken.additional_cookies || [])
    ]);

    const page = await context.newPage();

    // 5. Navigate to original post
    console.log(`[Repost] Navigating to: ${post.post_url}`);
    await page.goto(post.post_url, { waitUntil: 'networkidle', timeout: 30000 });

    // 6. Wait for page load and find repost button
    await page.waitForTimeout(2000); // LinkedIn needs time to render

    // Multiple selector strategies (LinkedIn changes frequently)
    const repostSelectors = [
      'button[aria-label*="Repost"]',
      'button[aria-label*="Share"]',
      'button:has-text("Repost")',
      '.share-actions-container button'
    ];

    let repostButton = null;
    for (const selector of repostSelectors) {
      repostButton = await page.$(selector);
      if (repostButton) {
        console.log(`[Repost] Found repost button with selector: ${selector}`);
        break;
      }
    }

    if (!repostButton) {
      throw new Error('Repost button not found on page');
    }

    // 7. Click repost button
    await repostButton.click();
    await page.waitForTimeout(2000);

    // 8. Wait for repost dialog
    await page.waitForSelector('div[role="dialog"]', { timeout: 10000 });

    // 9. Optional: Add randomized comment (30% chance)
    const shouldComment = Math.random() > 0.7;
    if (shouldComment) {
      const comments = [
        'Great insights!',
        'This is valuable.',
        'Worth reading.',
        'Exactly what I needed.',
        'Thanks for sharing!',
        'Very helpful.'
      ];
      const randomComment = comments[Math.floor(Math.random() * comments.length)];

      const commentInput = await page.$('[contenteditable="true"]');
      if (commentInput) {
        await commentInput.fill(randomComment);
        console.log(`[Repost] Added comment: "${randomComment}"`);
      }
    }

    // 10. Confirm repost
    const confirmButton = await page.$('button:has-text("Repost")');
    if (!confirmButton) {
      throw new Error('Repost confirmation button not found');
    }

    await confirmButton.click();
    await page.waitForTimeout(3000); // Wait for navigation

    // 11. Capture repost URL
    const repostUrl = page.url();
    console.log(`[Repost] Success! Repost URL: ${repostUrl}`);

    await browser.close();

    // 12. Update activity as success
    await supabase
      .from('pod_activities')
      .update({
        status: 'success',
        executed_at: new Date().toISOString(),
        repost_url: repostUrl,
        attempt_number: activity.attempt_number
      })
      .eq('id', activityId);

    // 13. Update pod member last activity
    await supabase
      .from('pod_members')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', member.id);

    console.log(`[Repost] ✅ Completed for ${member.name}`);

  } catch (error: any) {
    console.error(`[Repost] ❌ Failed for ${member.name}:`, error.message);

    // Update activity as failed
    await supabase
      .from('pod_activities')
      .update({
        status: 'failed',
        executed_at: new Date().toISOString(),
        error_message: error.message,
        attempt_number: activity.attempt_number
      })
      .eq('id', activityId);

    // Re-throw for BullMQ retry logic
    throw error;
  }
}

// Helper: Get Unipile session token
async function getUnipileSessionToken(unipileAccountId: string) {
  const response = await fetch(
    `https://api.unipile.com/v1/accounts/${unipileAccountId}/session`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.UNIPILE_API_KEY}`,
        'X-API-Version': '1.0'
      }
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get Unipile session: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  // Unipile returns session data with LinkedIn cookie
  return {
    li_at: data.session.li_at,
    additional_cookies: data.session.additional_cookies || []
  };
}
```

**Step 3: Test queue with mock job**

```bash
# Create test script
cat > scripts/test-pod-queue.ts << 'EOF'
import { podRepostQueue } from '../lib/queues/pod-repost-queue';

async function test() {
  // Add test job
  const job = await podRepostQueue.add('test-repost', {
    activityId: 'test-activity-123'
  });

  console.log('Job added:', job.id);
  console.log('Waiting for completion...');

  // Wait for result
  const result = await job.waitUntilFinished();
  console.log('Result:', result);
}

test().catch(console.error);
EOF

# Run test
npx tsx scripts/test-pod-queue.ts
```

Expected: Job queues successfully, worker picks it up

**Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit lib/queues/pod-repost-queue.ts
npx tsc --noEmit lib/workers/repost-executor.ts
```

Expected: No errors

**Step 5: Commit**

```bash
git add lib/queues/pod-repost-queue.ts lib/workers/repost-executor.ts scripts/test-pod-queue.ts
git commit -m "feat(queue): add pod repost queue with Playwright executor"
```

**Success Criteria:**
- ✅ BullMQ queue configured correctly
- ✅ Worker processes jobs
- ✅ Playwright launches and navigates to LinkedIn
- ✅ Handles errors and retries
- ✅ Updates database on success/failure

---

## Task 6: Pod Trigger API Endpoint (30 min)

**Goal:** API endpoint to trigger pod amplification after post publishes

**Files:**
- Create: `app/api/pod/trigger-amplification/route.ts`

**Step 1: Create trigger endpoint**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { podRepostQueue } from '@/lib/queues/pod-repost-queue';

export const runtime = 'nodejs';

// POST /api/pod/trigger-amplification
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { postId } = await request.json();

    if (!postId) {
      return NextResponse.json(
        { error: 'Missing required field: postId' },
        { status: 400 }
      );
    }

    // 1. Get post details with campaign
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select(`
        *,
        campaigns!inner(*)
      `)
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // 2. Check if pod amplification is enabled for this campaign
    if (!post.campaigns.pod_amplification_enabled) {
      return NextResponse.json({
        success: false,
        message: 'Pod amplification disabled for this campaign'
      });
    }

    // 3. Get all active pod members for this client
    const { data: podMembers, error: membersError } = await supabase
      .from('pod_members')
      .select('*')
      .eq('client_id', post.campaigns.client_id)
      .eq('is_active', true);

    if (membersError) {
      console.error('[POD_TRIGGER] Error fetching pod members:', membersError);
      return NextResponse.json(
        { error: 'Failed to fetch pod members' },
        { status: 500 }
      );
    }

    if (!podMembers || podMembers.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No active pod members found'
      });
    }

    // 4. Calculate randomized delays for each member (2-15 minutes)
    const now = Date.now();
    const activities = podMembers.map((member) => {
      // Random delay between 2 and 15 minutes
      const delayMs = (2 + Math.random() * 13) * 60000;
      const scheduledFor = new Date(now + delayMs);

      return {
        post_id: postId,
        pod_member_id: member.id,
        action: 'repost',
        status: 'pending',
        scheduled_for: scheduledFor.toISOString(),
        attempt_number: 1,
        max_attempts: 2
      };
    });

    // 5. Insert activities into database
    const { data: insertedActivities, error: insertError } = await supabase
      .from('pod_activities')
      .insert(activities)
      .select();

    if (insertError) {
      console.error('[POD_TRIGGER] Error inserting activities:', insertError);
      return NextResponse.json(
        { error: 'Failed to create activities' },
        { status: 500 }
      );
    }

    // 6. Queue BullMQ jobs with calculated delays
    for (const activity of insertedActivities) {
      const delay = new Date(activity.scheduled_for).getTime() - Date.now();

      await podRepostQueue.add(
        'repost',
        { activityId: activity.id },
        { delay: Math.max(delay, 0) } // Ensure non-negative delay
      );
    }

    console.log(`[POD_TRIGGER] ✅ Scheduled ${insertedActivities.length} reposts for post: ${postId}`);

    return NextResponse.json({
      success: true,
      activitiesScheduled: insertedActivities.length,
      podMembers: podMembers.map(m => ({ id: m.id, name: m.name })),
      activities: insertedActivities.map(a => ({
        id: a.id,
        member_id: a.pod_member_id,
        scheduled_for: a.scheduled_for
      }))
    });

  } catch (error) {
    console.error('[POD_TRIGGER] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Step 2: Test trigger endpoint**

```bash
# Create test post and pod member first
# Then trigger amplification
curl -X POST http://localhost:3000/api/pod/trigger-amplification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"postId": "POST_UUID"}'
```

Expected: `{"success":true,"activitiesScheduled":3,...}`

**Step 3: Verify activities created in database**

```bash
psql $DATABASE_URL -c "SELECT * FROM pod_activities WHERE post_id = 'POST_UUID' ORDER BY scheduled_for;"
```

Expected: Rows exist with randomized scheduled_for times

**Step 4: Verify BullMQ jobs queued**

```bash
# Check Redis for queued jobs
redis-cli LLEN bull:pod-repost:waiting
```

Expected: Number matches activities scheduled

**Step 5: Commit**

```bash
git add app/api/pod/trigger-amplification/route.ts
git commit -m "feat(api): add pod amplification trigger endpoint"
```

**Success Criteria:**
- ✅ Accepts postId in request body
- ✅ Loads post and campaign
- ✅ Gets active pod members
- ✅ Creates activities with randomized delays
- ✅ Queues BullMQ jobs
- ✅ Returns success response

---

## Task 7: Admin Pod Management UI (1 hour)

**Goal:** UI for managing pod members

**Files:**
- Create: `app/admin/pods/page.tsx`
- Create: `components/admin/AddPodMemberModal.tsx`

**Step 1: Create pod management page**

```typescript
// app/admin/pods/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { AddPodMemberModal } from '@/components/admin/AddPodMemberModal';

interface PodMember {
  id: string;
  name: string;
  linkedin_url: string;
  unipile_account_id: string;
  is_active: boolean;
  last_activity_at: string | null;
  created_at: string;
}

export default function PodsPage() {
  const [members, setMembers] = useState<PodMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadPodMembers();
  }, []);

  const loadPodMembers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('pod_members')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setMembers(data || []);
    } catch (error) {
      console.error('Error loading pod members:', error);
      toast.error('Failed to load pod members');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('pod_members')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast.success(`Pod member ${!currentStatus ? 'activated' : 'deactivated'}`);
      loadPodMembers();
    } catch (error) {
      toast.error('Failed to update pod member');
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pod member?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('pod_members')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Pod member deleted');
      loadPodMembers();
    } catch (error) {
      toast.error('Failed to delete pod member');
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading pod members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pod Management</h1>
          <p className="text-gray-600 mt-2">
            Manage pod members for automated post amplification
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Pod Member
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Total Members</p>
            <p className="text-3xl font-bold">{members.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Active Members</p>
            <p className="text-3xl font-bold text-green-600">
              {members.filter(m => m.is_active).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Inactive Members</p>
            <p className="text-3xl font-bold text-gray-400">
              {members.filter(m => !m.is_active).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Members Table */}
      {members.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500 mb-4">No pod members yet</p>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Pod Member
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Pod Members</CardTitle>
            <CardDescription>
              Manage LinkedIn accounts for pod amplification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{member.name}</h3>
                      <Badge
                        className={
                          member.is_active
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-700'
                        }
                      >
                        {member.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <a
                        href={member.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-blue-600"
                      >
                        LinkedIn Profile
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <span>Unipile ID: {member.unipile_account_id}</span>
                      {member.last_activity_at && (
                        <span>
                          Last Active:{' '}
                          {new Date(member.last_activity_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(member.id, member.is_active)}
                    >
                      {member.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteMember(member.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <AddPodMemberModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={loadPodMembers}
      />
    </div>
  );
}
```

**Step 2: Create add pod member modal**

```typescript
// components/admin/AddPodMemberModal.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface AddPodMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddPodMemberModal({
  open,
  onOpenChange,
  onSuccess,
}: AddPodMemberModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    linkedin_url: '',
    unipile_account_id: '',
  });

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.linkedin_url || !formData.unipile_account_id) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not found');
      }

      // Get user's client_id
      const { data: userData } = await supabase
        .from('users')
        .select('client_id')
        .eq('id', user.id)
        .single();

      if (!userData) {
        throw new Error('Client ID not found');
      }

      // Create pod member
      const { error } = await supabase
        .from('pod_members')
        .insert({
          client_id: userData.client_id,
          user_id: user.id,
          name: formData.name,
          linkedin_url: formData.linkedin_url,
          unipile_account_id: formData.unipile_account_id,
          is_active: true
        });

      if (error) throw error;

      toast.success('Pod member added successfully');
      onSuccess();
      onOpenChange(false);

      // Reset form
      setFormData({
        name: '',
        linkedin_url: '',
        unipile_account_id: '',
      });
    } catch (error: any) {
      console.error('Error adding pod member:', error);
      toast.error(error.message || 'Failed to add pod member');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Pod Member</DialogTitle>
          <DialogDescription>
            Add a LinkedIn account to your pod for post amplification
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., John Smith"
            />
          </div>

          <div>
            <Label htmlFor="linkedin_url">LinkedIn Profile URL *</Label>
            <Input
              id="linkedin_url"
              type="url"
              value={formData.linkedin_url}
              onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
              placeholder="https://linkedin.com/in/johnsmith"
            />
          </div>

          <div>
            <Label htmlFor="unipile_account_id">Unipile Account ID *</Label>
            <Input
              id="unipile_account_id"
              value={formData.unipile_account_id}
              onChange={(e) => setFormData({ ...formData, unipile_account_id: e.target.value })}
              placeholder="acc_1234567890"
            />
            <p className="text-xs text-gray-500 mt-1">
              Get this from Unipile dashboard after connecting LinkedIn account
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Pod Member'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 3: Test pod management UI**

```bash
# Navigate to admin pods page
open "http://localhost:3000/admin/pods"

# Add pod member via UI
# Verify table shows member
# Toggle active/inactive
# Delete member
```

Expected: All CRUD operations work

**Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit app/admin/pods/page.tsx
npx tsc --noEmit components/admin/AddPodMemberModal.tsx
```

Expected: No errors

**Step 5: Commit**

```bash
git add app/admin/pods/page.tsx components/admin/AddPodMemberModal.tsx
git commit -m "feat(admin): add pod management UI with CRUD operations"
```

**Success Criteria:**
- ✅ Page loads and shows pod members
- ✅ Can add new pod member
- ✅ Can toggle active/inactive status
- ✅ Can delete pod member
- ✅ RLS enforced (only see own client's members)

---

## Task 8: Integration & End-to-End Testing (1 hour)

**Goal:** Validate complete workflow from end to end

**Testing Checklist:**

### Phase 1: Prerequisites (10 min)
```bash
# 1. Verify Redis running
redis-cli ping  # Expected: PONG

# 2. Verify Playwright installed
npx playwright install chromium

# 3. Start dev server
npm run dev

# 4. Start BullMQ workers
npm run workers  # Or: npx tsx scripts/start-workers.ts
```

### Phase 2: Pod Setup (10 min)
```bash
# 1. Navigate to admin pods
open "http://localhost:3000/admin/pods"

# 2. Add 2-3 test pod members
#    - Use real Unipile account IDs
#    - Or use test/mock accounts

# 3. Verify members show as active
```

### Phase 3: Campaign Creation (15 min)
```bash
# 1. In chat, type: pod
# Expected: Main menu appears

# 2. Click "Create Campaign"
# Expected: Lead magnet selection appears

# 3. Upload test lead magnet (PDF)
# Expected: File uploads successfully

# 4. Set trigger keyword: "GUIDE"
# Expected: Input accepted

# 5. Generate post
# Expected: Post generated with trigger keyword

# 6. Configure DM sequence
# Expected: Form shows with defaults

# 7. Optional: Add ESP webhook
# Expected: URL input accepted

# 8. Enable pod amplification
# Expected: Toggle works

# 9. Confirm campaign
# Expected: Campaign created
```

### Phase 4: Post Publishing & Amplification (20 min)
```bash
# 1. Publish LinkedIn post via Unipile
#    (Or manually trigger amplification with test post)

# 2. Trigger pod amplification
curl -X POST http://localhost:3000/api/pod/trigger-amplification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"postId": "POST_UUID"}'

# Expected: {"success":true,"activitiesScheduled":3}

# 3. Verify activities created in database
psql $DATABASE_URL -c "SELECT * FROM pod_activities WHERE post_id = 'POST_UUID';"

# Expected: 3 rows with randomized scheduled_for times

# 4. Verify BullMQ jobs queued
redis-cli LLEN bull:pod-repost:waiting

# Expected: 3 jobs queued

# 5. Wait for first job execution (2-15 min)
#    Or manually trigger: redis-cli DEL bull:pod-repost:delayed

# 6. Monitor worker logs
tail -f logs/worker.log

# Expected: [PodWorker] Executing repost: <activity-id>

# 7. Verify reposts appear on LinkedIn
#    Check each pod member's profile

# Expected: Reposts visible on LinkedIn

# 8. Verify database updates
psql $DATABASE_URL -c "SELECT status, repost_url FROM pod_activities WHERE post_id = 'POST_UUID';"

# Expected: status = 'success', repost_url populated
```

### Phase 5: Error Handling (10 min)
```bash
# 1. Force failure by using invalid Unipile account ID
#    Edit pod member, set unipile_account_id = 'invalid_id'

# 2. Trigger amplification again

# 3. Verify BullMQ retry logic
#    Worker should retry 2 times with exponential backoff

# 4. Check failed job in database
psql $DATABASE_URL -c "SELECT status, error_message, attempt_number FROM pod_activities WHERE status = 'failed';"

# Expected: status = 'failed', error_message populated, attempt_number = 2
```

### Phase 6: DM Sequence Flow (5 min)
```bash
# 1. Comment on LinkedIn post with trigger keyword: "GUIDE"

# 2. Wait 5 minutes (cron polls every 5 min)
#    Or manually trigger: curl http://localhost:3000/api/cron/poll-comments

# 3. Verify DM sent
#    Check Unipile dashboard or LinkedIn messages

# Expected: DM sent to commenter

# 4. Reply to DM with email address

# 5. Wait 5 minutes
#    Or manually trigger: curl http://localhost:3000/api/cron/poll-replies

# 6. Verify email extracted
psql $DATABASE_URL -c "SELECT email FROM pod_activities WHERE campaign_id = 'CAMPAIGN_UUID';"

# Expected: Email populated

# 7. Verify ESP webhook called (if configured)
#    Check ESP dashboard for new lead
```

**Success Criteria:**
- ✅ Complete workflow works end-to-end
- ✅ Pod reposts appear on LinkedIn
- ✅ DMs send automatically
- ✅ Emails extracted correctly
- ✅ ESP webhook delivers
- ✅ Failed jobs retry 2 times
- ✅ Error messages clear and actionable

---

## Deployment Checklist

### Environment Variables
```bash
# Required
REDIS_URL=redis://...
UNIPILE_API_KEY=...
OPENAI_API_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Optional
MAILGUN_API_KEY=...
CRON_SECRET=...
URL_SIGNING_SECRET=...
```

### Cron Jobs (Render/Vercel/Other)
```bash
# Poll comments every 5 minutes
*/5 * * * * curl -H "Authorization: Bearer $CRON_SECRET" https://app.com/api/cron/poll-comments

# Poll replies every 5 minutes
*/5 * * * * curl -H "Authorization: Bearer $CRON_SECRET" https://app.com/api/cron/poll-replies
```

### Worker Process
```bash
# Start BullMQ workers (Render background worker service)
npm run workers
# Or: npx tsx scripts/start-workers.ts
```

### Database Migrations
```bash
# Apply all migrations
supabase db push

# Verify migrations applied
psql $DATABASE_URL -c "SELECT * FROM supabase_migrations ORDER BY version DESC LIMIT 5;"
```

### Playwright in Production
```bash
# Install Playwright in production environment
npx playwright install --with-deps chromium

# Verify installation
npx playwright --version
```

---

## Rollback Plan

If issues occur, rollback in reverse order:

```bash
# 1. Stop workers
pkill -f "tsx scripts/start-workers.ts"

# 2. Disable cron jobs
# Comment out cron jobs in cron config

# 3. Remove console workflow
psql $DATABASE_URL -c "DELETE FROM console_workflows WHERE name = 'linkedin-dm-pod';"

# 4. Drop tables (CAREFUL!)
psql $DATABASE_URL << 'EOF'
DROP TABLE IF EXISTS pod_activities CASCADE;
DROP TABLE IF EXISTS pod_members CASCADE;
DROP TABLE IF EXISTS lead_magnets CASCADE;
EOF

# 5. Revert code changes
git revert HEAD~8
```

---

## Success Metrics

- **Pod Repost Success Rate:** >95%
- **DM Delivery Success Rate:** >98%
- **Email Extraction Accuracy:** >90%
- **Average Time from Comment to DM:** <10 minutes
- **Average Time from DM Reply to ESP:** <10 minutes
- **Pod Amplification Execution Time:** <30 seconds per repost
- **Manual Intervention Rate:** <5%

---

## Next Steps (Future Enhancements)

1. **AI-Generated Comments** - Personalized comments per pod member
2. **Smart Delay Algorithm** - ML-based optimal timing
3. **Engagement Tracking** - Measure repost performance
4. **A/B Testing** - Test different DM templates
5. **Advanced Analytics** - Campaign ROI dashboard
6. **Multi-Platform Support** - Twitter, Facebook pods
7. **Voice Cartridge Integration** - DMs in brand voice
8. **Lead Scoring** - Qualify leads automatically

---

**Plan Status:** ✅ Complete and Ready for Implementation
**Total Estimated Time:** 8-12 hours
**Execution Method:** Use superpowers:executing-plans or subagent-driven-development
**Priority:** FLAGSHIP FEATURE - Must be perfect

---

## Execution Notes

When implementing:
1. Follow TDD approach (test → fail → implement → pass → commit)
2. Use code review between tasks
3. Update Archon task status after each task
4. Take screenshots of UI for documentation
5. Document any deviations from plan
6. Keep detailed notes for SITREP

**This is the FLAGSHIP FEATURE. Take your time, test thoroughly, and ensure quality.**
