# Background Workers Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build 3 background cron workers that execute AgentKit-triggered workflows for complete LinkedIn automation end-to-end.

**Architecture:** AgentKit creates database jobs (scrape_jobs, notifications, webhook_logs) → Vercel Cron triggers workers every 5-15 minutes → Workers query pending jobs → Execute via Unipile/Resend APIs → Update job status → Repeat. Fully autonomous, no manual intervention.

**Tech Stack:** Next.js API routes (cron endpoints), Vercel Cron, Unipile SDK (LinkedIn), Resend API (email), Supabase (job queue database), HMAC signing (webhook security)

**Estimated Time:** 2 hours (60min DM scraper + 30min webhook retry + 30min pod notifications)

---

## Prerequisites

**Required Environment Variables:**
```bash
UNIPILE_API_KEY=<from Unipile dashboard>
UNIPILE_DSN=https://api3.unipile.com:13344
RESEND_API_KEY=<from Resend dashboard>
CRON_SECRET=<generate: openssl rand -hex 32>
SUPABASE_SERVICE_ROLE_KEY=<from Supabase dashboard>
```

**Required Tables:** (Should already exist from migrations 021, 022)
- `scrape_jobs` (migration 021)
- `notifications` (migration 022)
- `webhook_logs` (needs verification)

**Required Dependencies:** (Check package.json)
- `unipile-node-sdk` ✅ (already installed)
- `resend` ❓ (may need: `npm install resend`)

---

## Task 1: Verify Database Schema & Dependencies (10 min)

**Files:**
- Check: `supabase/migrations/021_create_scrape_jobs.sql`
- Check: `supabase/migrations/022_create_notifications.sql`
- Check: `package.json`
- Create: `supabase/migrations/023_create_webhook_logs.sql` (if missing)

**Step 1: Verify scrape_jobs table exists**

Run:
```bash
cd /Users/rodericandrews/Obsidian/Master/_projects/bravo-revos
grep -A 20 "CREATE TABLE.*scrape_jobs" supabase/migrations/021_create_scrape_jobs.sql
```

Expected: Table definition with columns:
- `id`, `campaign_id`, `post_id`, `unipile_post_id`, `unipile_account_id`
- `trigger_word`, `status`, `poll_interval_minutes`, `next_check`
- `comments_scanned`, `trigger_words_found`, `dms_sent`, `emails_captured`

**Step 2: Verify notifications table exists**

Run:
```bash
grep -A 15 "CREATE TABLE.*notifications" supabase/migrations/022_create_notifications.sql
```

Expected: Table with:
- `id`, `user_id`, `type`, `post_id`, `linkedin_url`
- `status`, `sent_at`, `message`, `metadata`

**Step 3: Check if webhook_logs table exists**

Run:
```bash
grep -r "webhook_logs" supabase/migrations/
```

Expected: If no results, need to create migration 023

**Step 4: Create webhook_logs migration (if needed)**

Create: `supabase/migrations/023_create_webhook_logs.sql`

```sql
-- Migration: Create webhook_logs table for delivery tracking
-- Direct link: https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp/sql/new

CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relationships
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Webhook details
  webhook_url TEXT NOT NULL,
  payload JSONB NOT NULL,

  -- Delivery tracking
  status TEXT CHECK (status IN ('pending', 'sent', 'failed')) DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  response_status INTEGER,
  response_body TEXT,
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for worker queries
CREATE INDEX IF NOT EXISTS idx_webhook_logs_retry
  ON webhook_logs(status, retry_count, last_attempt_at)
  WHERE status = 'failed' AND retry_count < 3;

CREATE INDEX IF NOT EXISTS idx_webhook_logs_created
  ON webhook_logs(created_at DESC);

-- Update timestamp trigger
CREATE TRIGGER update_webhook_logs_updated_at
  BEFORE UPDATE ON webhook_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS policies
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON webhook_logs
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Users can view their campaign webhook logs" ON webhook_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = webhook_logs.campaign_id
      AND campaigns.client_id IN (
        SELECT client_id FROM users WHERE id = auth.uid()
      )
    )
  );

COMMENT ON TABLE webhook_logs IS 'Webhook delivery tracking with retry logic and exponential backoff';
```

**Step 5: Check Resend dependency**

Run:
```bash
grep "resend" package.json
```

Expected: `"resend": "^3.0.0"` or similar

If missing:
```bash
npm install resend
```

**Step 6: Add index to scrape_jobs (optimization)**

Create: `supabase/migrations/024_add_worker_indexes.sql`

```sql
-- Add optimized indexes for background worker queries

-- DM Scraper: Query scheduled jobs
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_worker_poll
  ON scrape_jobs(next_check, status)
  WHERE status IN ('scheduled', 'running');

-- Pod Notifications: Query pending notifications
CREATE INDEX IF NOT EXISTS idx_notifications_worker_poll
  ON notifications(created_at, status, type)
  WHERE status = 'pending';
```

**Step 7: Commit schema changes**

```bash
git add supabase/migrations/023_create_webhook_logs.sql
git add supabase/migrations/024_add_worker_indexes.sql
git add package.json  # if Resend was added
git commit -m "feat(db): Add webhook_logs table and worker indexes for background jobs"
```

---

## Task 2: Create Cron Secret & Environment Setup (5 min)

**Files:**
- Modify: `.env.local`
- Create: `lib/cron-auth.ts` (authentication helper)

**Step 1: Generate CRON_SECRET**

Run:
```bash
openssl rand -hex 32
```

Copy output to clipboard.

**Step 2: Add to .env.local**

Add line:
```bash
CRON_SECRET=<paste generated secret>
```

**Step 3: Verify other required env vars exist**

Check `.env.local` contains:
```bash
UNIPILE_API_KEY=...
UNIPILE_DSN=https://api3.unipile.com:13344
RESEND_API_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

**Step 4: Create cron authentication helper**

Create: `lib/cron-auth.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'

/**
 * Verify cron request is authenticated with CRON_SECRET
 *
 * Usage in cron endpoints:
 * ```typescript
 * const authResult = verifyCronAuth(request)
 * if (!authResult.authorized) {
 *   return authResult.response
 * }
 * ```
 */
export function verifyCronAuth(request: NextRequest): {
  authorized: boolean
  response?: NextResponse
} {
  const authHeader = request.headers.get('authorization')
  const expectedSecret = process.env.CRON_SECRET

  if (!expectedSecret) {
    console.error('[CRON] CRON_SECRET not configured')
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Cron secret not configured' },
        { status: 500 }
      )
    }
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('[CRON] Unauthorized access attempt - no bearer token')
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
  }

  const providedSecret = authHeader.replace('Bearer ', '')

  if (providedSecret !== expectedSecret) {
    console.warn('[CRON] Unauthorized access attempt - invalid secret')
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
  }

  return { authorized: true }
}
```

**Step 5: Commit**

```bash
git add .env.local lib/cron-auth.ts
git commit -m "feat(cron): Add CRON_SECRET and authentication helper for background workers"
```

---

## Task 3: Build DM Scraper Worker (60 min)

**Files:**
- Create: `app/api/cron/dm-scraper/route.ts`
- Reference: `lib/unipile-client.ts`

### Subtask 3.1: Create Basic Cron Endpoint (10 min)

**Step 1: Create directory structure**

Run:
```bash
mkdir -p app/api/cron/dm-scraper
```

**Step 2: Create basic endpoint with auth**

Create: `app/api/cron/dm-scraper/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyCronAuth } from '@/lib/cron-auth'

/**
 * POST /api/cron/dm-scraper
 * Background worker that polls scheduled scrape jobs and processes DMs
 *
 * Schedule: Every 5 minutes via Vercel Cron
 * Function: Query scrape_jobs → Poll Unipile → Process DMs → Update status
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log('[DM_SCRAPER] Cron job started')

  // Verify authentication
  const authResult = verifyCronAuth(request)
  if (!authResult.authorized) {
    return authResult.response
  }

  try {
    const supabase = await createClient()

    // TODO: Query scheduled jobs
    // TODO: Process each job
    // TODO: Update job status

    const duration = Date.now() - startTime
    console.log(`[DM_SCRAPER] Completed in ${duration}ms`)

    return NextResponse.json({
      success: true,
      duration,
      jobs_processed: 0,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[DM_SCRAPER] Fatal error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
```

**Step 3: Test basic endpoint**

Run dev server:
```bash
npm run dev
```

Test (in separate terminal):
```bash
curl -X POST http://localhost:3000/api/cron/dm-scraper \
  -H "Authorization: Bearer $(grep CRON_SECRET .env.local | cut -d= -f2)"
```

Expected:
```json
{
  "success": true,
  "duration": 50,
  "jobs_processed": 0,
  "timestamp": "2025-11-10T..."
}
```

**Step 4: Commit skeleton**

```bash
git add app/api/cron/dm-scraper/route.ts
git commit -m "feat(cron): Add DM scraper worker skeleton with authentication"
```

### Subtask 3.2: Query Scheduled Jobs (10 min)

**Step 1: Add job query logic**

Modify: `app/api/cron/dm-scraper/route.ts`

Add after authentication check:

```typescript
    // Query scrape jobs ready for processing
    const now = new Date().toISOString()

    const { data: jobs, error: queryError } = await supabase
      .from('scrape_jobs')
      .select(`
        id,
        campaign_id,
        post_id,
        unipile_post_id,
        unipile_account_id,
        trigger_word,
        poll_interval_minutes,
        comments_scanned,
        trigger_words_found,
        dms_sent,
        emails_captured
      `)
      .in('status', ['scheduled', 'running'])
      .lte('next_check', now)
      .order('next_check', { ascending: true })
      .limit(10)  // Process max 10 jobs per run

    if (queryError) {
      console.error('[DM_SCRAPER] Failed to query jobs:', queryError)
      return NextResponse.json(
        { error: 'Failed to query jobs', details: queryError.message },
        { status: 500 }
      )
    }

    if (!jobs || jobs.length === 0) {
      console.log('[DM_SCRAPER] No jobs ready for processing')
      const duration = Date.now() - startTime
      return NextResponse.json({
        success: true,
        duration,
        jobs_processed: 0,
        timestamp: new Date().toISOString()
      })
    }

    console.log(`[DM_SCRAPER] Found ${jobs.length} jobs to process`)
```

**Step 2: Add job processing loop**

Add after query:

```typescript
    let processedCount = 0
    const results = []

    for (const job of jobs) {
      try {
        console.log(`[DM_SCRAPER] Processing job ${job.id}`)

        // TODO: Process job

        processedCount++
        results.push({ job_id: job.id, status: 'processed' })
      } catch (error) {
        console.error(`[DM_SCRAPER] Error processing job ${job.id}:`, error)
        results.push({
          job_id: job.id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const duration = Date.now() - startTime
    console.log(`[DM_SCRAPER] Completed in ${duration}ms - processed ${processedCount}/${jobs.length} jobs`)

    return NextResponse.json({
      success: true,
      duration,
      jobs_processed: processedCount,
      total_jobs: jobs.length,
      results,
      timestamp: new Date().toISOString()
    })
```

**Step 3: Test with empty database**

Run:
```bash
curl -X POST http://localhost:3000/api/cron/dm-scraper \
  -H "Authorization: Bearer $(grep CRON_SECRET .env.local | cut -d= -f2)"
```

Expected:
```json
{
  "success": true,
  "duration": 100,
  "jobs_processed": 0,
  "timestamp": "..."
}
```

**Step 4: Commit job query**

```bash
git add app/api/cron/dm-scraper/route.ts
git commit -m "feat(cron): Add job query and processing loop to DM scraper"
```

### Subtask 3.3: Poll Unipile for Comments (15 min)

**Step 1: Import Unipile client**

Add to imports:

```typescript
import { unipileGetPost, unipileGetComments } from '@/lib/unipile-client'
```

**Step 2: Add comment polling logic**

Replace `// TODO: Process job` with:

```typescript
        // Update status to running
        await supabase
          .from('scrape_jobs')
          .update({
            status: 'running',
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id)

        // Poll Unipile for comments
        console.log(`[DM_SCRAPER] Polling Unipile for post ${job.unipile_post_id}`)

        const comments = await unipileGetComments({
          account_id: job.unipile_account_id,
          post_id: job.unipile_post_id
        })

        console.log(`[DM_SCRAPER] Found ${comments.length} comments on post`)

        // Filter comments containing trigger word
        const triggerWord = job.trigger_word.toLowerCase()
        const triggeredComments = comments.filter(comment =>
          comment.body?.toLowerCase().includes(triggerWord)
        )

        console.log(`[DM_SCRAPER] Found ${triggeredComments.length} comments with trigger word "${job.trigger_word}"`)

        // TODO: Send auto-DM to commenters
        // TODO: Check for email replies

        // Update job metrics
        const nextCheck = new Date(Date.now() + job.poll_interval_minutes * 60 * 1000).toISOString()

        await supabase
          .from('scrape_jobs')
          .update({
            status: 'scheduled',
            next_check: nextCheck,
            last_checked: new Date().toISOString(),
            comments_scanned: job.comments_scanned + comments.length,
            trigger_words_found: job.trigger_words_found + triggeredComments.length,
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id)
```

**Step 3: Test comment polling**

Create test scrape job in Supabase SQL Editor:

```sql
INSERT INTO scrape_jobs (
  campaign_id,
  post_id,
  unipile_post_id,
  unipile_account_id,
  trigger_word,
  status,
  next_check
) VALUES (
  '<your-campaign-id>',
  '<your-post-id>',
  '<unipile-post-id>',
  '<unipile-account-id>',
  'guide',
  'scheduled',
  NOW() - INTERVAL '1 minute'
);
```

Run worker:
```bash
curl -X POST http://localhost:3000/api/cron/dm-scraper \
  -H "Authorization: Bearer $(grep CRON_SECRET .env.local | cut -d= -f2)"
```

Check logs for:
```
[DM_SCRAPER] Found 1 jobs to process
[DM_SCRAPER] Polling Unipile for post ...
[DM_SCRAPER] Found X comments on post
[DM_SCRAPER] Found Y comments with trigger word "guide"
```

**Step 4: Commit comment polling**

```bash
git add app/api/cron/dm-scraper/route.ts
git commit -m "feat(cron): Add Unipile comment polling and trigger word detection"
```

### Subtask 3.4: Send Auto-DM to Commenters (15 min)

**Step 1: Add DM sending logic**

After trigger word detection, add:

```typescript
        // Send auto-DM to commenters with trigger word
        let dmsSent = 0

        for (const comment of triggeredComments) {
          try {
            // Check if we already DM'd this commenter
            const { data: existingDM } = await supabase
              .from('leads')
              .select('id')
              .eq('campaign_id', job.campaign_id)
              .eq('linkedin_profile_url', comment.author_profile_url)
              .single()

            if (existingDM) {
              console.log(`[DM_SCRAPER] Already sent DM to ${comment.author_name}, skipping`)
              continue
            }

            // Send auto-DM asking for email
            const dmMessage = `Hey ${comment.author_name}! Thanks for your interest. To get the ${job.trigger_word}, could you reply with your best email address? I'll send it right over.`

            await unipileSendDirectMessage({
              account_id: job.unipile_account_id,
              recipient_id: comment.author_id,
              message: dmMessage
            })

            console.log(`[DM_SCRAPER] Sent auto-DM to ${comment.author_name}`)

            // Create lead record (pending email)
            await supabase
              .from('leads')
              .insert({
                campaign_id: job.campaign_id,
                linkedin_profile_url: comment.author_profile_url,
                name: comment.author_name,
                status: 'dm_sent',
                source: 'comment_trigger',
                metadata: {
                  comment_id: comment.id,
                  comment_text: comment.body,
                  trigger_word: job.trigger_word,
                  post_id: job.unipile_post_id
                }
              })

            dmsSent++

            // Rate limit: 100ms delay between DMs
            await new Promise(resolve => setTimeout(resolve, 100))

          } catch (error) {
            console.error(`[DM_SCRAPER] Failed to DM ${comment.author_name}:`, error)
          }
        }

        console.log(`[DM_SCRAPER] Sent ${dmsSent} auto-DMs`)
```

**Step 2: Update job metrics**

Update the final metrics update:

```typescript
        await supabase
          .from('scrape_jobs')
          .update({
            status: 'scheduled',
            next_check: nextCheck,
            last_checked: new Date().toISOString(),
            comments_scanned: job.comments_scanned + comments.length,
            trigger_words_found: job.trigger_words_found + triggeredComments.length,
            dms_sent: job.dms_sent + dmsSent,  // Add this line
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id)
```

**Step 3: Test auto-DM (mock or real)**

If UNIPILE_MOCK_MODE=true, check logs:
```
[DM_SCRAPER] Sent auto-DM to John Doe
[DM_SCRAPER] Sent 3 auto-DMs
```

Check database:
```sql
SELECT * FROM leads WHERE campaign_id = '<your-campaign-id>' AND status = 'dm_sent';
```

**Step 4: Commit auto-DM**

```bash
git add app/api/cron/dm-scraper/route.ts
git commit -m "feat(cron): Add auto-DM sending to triggered commenters"
```

### Subtask 3.5: Check for Email Replies & Fire Webhooks (10 min)

**Step 1: Add DM reply checking**

After auto-DM section, add:

```typescript
        // Check for DM replies with email addresses
        console.log(`[DM_SCRAPER] Checking for email replies from ${job.campaign_id}`)

        const { data: pendingLeads } = await supabase
          .from('leads')
          .select('id, name, linkedin_profile_url')
          .eq('campaign_id', job.campaign_id)
          .eq('status', 'dm_sent')

        if (!pendingLeads || pendingLeads.length === 0) {
          console.log('[DM_SCRAPER] No pending leads awaiting email reply')
        } else {
          let emailsCaptured = 0

          for (const lead of pendingLeads) {
            try {
              // Get DM conversation with this lead
              const messages = await unipileGetDirectMessages({
                account_id: job.unipile_account_id,
                conversation_id: lead.linkedin_profile_url  // Simplified - adjust as needed
              })

              // Look for email in recent messages
              const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/
              const recentMessage = messages[0]  // Most recent

              if (recentMessage && emailRegex.test(recentMessage.body)) {
                const extractedEmail = recentMessage.body.match(emailRegex)?.[0]

                if (extractedEmail) {
                  console.log(`[DM_SCRAPER] Extracted email ${extractedEmail} from ${lead.name}`)

                  // Update lead with email
                  await supabase
                    .from('leads')
                    .update({
                      email: extractedEmail,
                      status: 'email_captured',
                      email_captured_at: new Date().toISOString()
                    })
                    .eq('id', lead.id)

                  // Fire webhook (if configured)
                  const { data: campaign } = await supabase
                    .from('campaigns')
                    .select('webhook_url')
                    .eq('id', job.campaign_id)
                    .single()

                  if (campaign?.webhook_url) {
                    // Create webhook log entry
                    await supabase
                      .from('webhook_logs')
                      .insert({
                        lead_id: lead.id,
                        campaign_id: job.campaign_id,
                        webhook_url: campaign.webhook_url,
                        payload: {
                          email: extractedEmail,
                          name: lead.name,
                          source: 'linkedin_dm',
                          campaign_id: job.campaign_id,
                          timestamp: new Date().toISOString()
                        },
                        status: 'pending'
                      })

                    console.log(`[DM_SCRAPER] Queued webhook for ${extractedEmail}`)
                  }

                  emailsCaptured++
                }
              }

            } catch (error) {
              console.error(`[DM_SCRAPER] Error checking DMs for ${lead.name}:`, error)
            }
          }

          console.log(`[DM_SCRAPER] Captured ${emailsCaptured} email addresses`)

          // Update job metrics
          await supabase
            .from('scrape_jobs')
            .update({
              emails_captured: job.emails_captured + emailsCaptured
            })
            .eq('id', job.id)
        }
```

**Step 2: Test email extraction (mock)**

Create test DM reply in Supabase:

```sql
-- Simulate a lead waiting for email reply
INSERT INTO leads (campaign_id, name, linkedin_profile_url, status)
VALUES ('<your-campaign-id>', 'Test User', 'https://linkedin.com/in/test', 'dm_sent');
```

If using mock mode, manually test email regex:

```typescript
const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/
const testMessage = "Sure! My email is john.doe@example.com"
console.log(testMessage.match(emailRegex)?.[0])  // Should output: john.doe@example.com
```

**Step 3: Commit email extraction**

```bash
git add app/api/cron/dm-scraper/route.ts
git commit -m "feat(cron): Add email extraction from DM replies and webhook queueing"
```

### Subtask 3.6: Add Error Handling & Rate Limiting (10 min)

**Step 1: Add rate limit tracking**

At top of job processing loop:

```typescript
    // Track rate limits per account
    const accountRateLimits = new Map<string, { dmsSent: number, lastReset: Date }>()

    const DAILY_DM_LIMIT = 100
    const HOURLY_DM_LIMIT = 20

    let processedCount = 0
    const results = []

    for (const job of jobs) {
      try {
        // Check rate limits
        const accountKey = job.unipile_account_id
        const now = new Date()

        if (!accountRateLimits.has(accountKey)) {
          accountRateLimits.set(accountKey, { dmsSent: 0, lastReset: now })
        }

        const rateLimit = accountRateLimits.get(accountKey)!

        // Reset hourly counter
        if (now.getTime() - rateLimit.lastReset.getTime() > 60 * 60 * 1000) {
          rateLimit.dmsSent = 0
          rateLimit.lastReset = now
        }

        if (rateLimit.dmsSent >= HOURLY_DM_LIMIT) {
          console.warn(`[DM_SCRAPER] Rate limit reached for account ${accountKey}, skipping`)
          results.push({
            job_id: job.id,
            status: 'rate_limited',
            message: 'Hourly DM limit reached'
          })
          continue
        }
```

**Step 2: Add error tracking**

After job processing, add error tracking:

```typescript
      } catch (error) {
        console.error(`[DM_SCRAPER] Error processing job ${job.id}:`, error)

        // Update job error tracking
        await supabase
          .from('scrape_jobs')
          .update({
            status: 'scheduled',  // Keep scheduled to retry
            error_count: job.error_count + 1,
            last_error: error instanceof Error ? error.message : 'Unknown error',
            last_error_at: new Date().toISOString(),
            next_check: new Date(Date.now() + 10 * 60 * 1000).toISOString()  // Retry in 10 min on error
          })
          .eq('id', job.id)

        results.push({
          job_id: job.id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
```

**Step 3: Add Unipile 429 error handling**

In Unipile API calls, wrap with:

```typescript
try {
  const comments = await unipileGetComments({...})
} catch (error: any) {
  if (error.status === 429 || error.message?.includes('rate limit')) {
    console.warn('[DM_SCRAPER] Unipile rate limit hit, backing off')

    // Update job with backoff
    await supabase
      .from('scrape_jobs')
      .update({
        next_check: new Date(Date.now() + 60 * 60 * 1000).toISOString(),  // 1 hour backoff
        last_error: 'Unipile rate limit reached'
      })
      .eq('id', job.id)

    continue  // Skip this job
  }
  throw error  // Re-throw other errors
}
```

**Step 4: Commit error handling**

```bash
git add app/api/cron/dm-scraper/route.ts
git commit -m "feat(cron): Add rate limiting and error handling to DM scraper"
```

---

## Task 4: Build Webhook Retry Worker (30 min)

**Files:**
- Create: `app/api/cron/webhook-retry/route.ts`
- Reference: `lib/webhook-delivery.ts` (may need to create)

### Subtask 4.1: Create Webhook Delivery Helper (10 min)

**Step 1: Create webhook helper**

Create: `lib/webhook-delivery.ts`

```typescript
import crypto from 'crypto'

/**
 * Webhook delivery utilities with HMAC signing and retry logic
 */

export interface WebhookPayload {
  email: string
  name?: string
  campaign_id: string
  source: string
  timestamp: string
  [key: string]: any
}

/**
 * Generate HMAC signature for webhook payload
 * Allows recipient to verify webhook authenticity
 */
export function generateWebhookSignature(
  payload: WebhookPayload,
  secret: string
): string {
  const payloadString = JSON.stringify(payload)
  return crypto
    .createHmac('sha256', secret)
    .update(payloadString)
    .digest('hex')
}

/**
 * Send webhook with HMAC signature and timeout
 *
 * @returns Object with success status and response details
 */
export async function sendWebhook(
  url: string,
  payload: WebhookPayload,
  secret: string,
  timeoutMs: number = 10000
): Promise<{
  success: boolean
  status?: number
  body?: string
  error?: string
}> {
  try {
    const signature = generateWebhookSignature(payload, secret)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Timestamp': payload.timestamp,
        'User-Agent': 'BravoRevOS-Webhook/1.0'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    })

    clearTimeout(timeout)

    const responseBody = await response.text()

    return {
      success: response.ok,
      status: response.status,
      body: responseBody.substring(0, 1000)  // Limit body size
    }

  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Webhook request timeout'
        }
      }
      return {
        success: false,
        error: error.message
      }
    }
    return {
      success: false,
      error: 'Unknown error'
    }
  }
}

/**
 * Calculate exponential backoff delay
 * Retry 1: 5 minutes
 * Retry 2: 15 minutes
 * Retry 3: 60 minutes
 */
export function calculateRetryDelay(retryCount: number): number {
  const delays = [
    5 * 60 * 1000,   // 5 minutes
    15 * 60 * 1000,  // 15 minutes
    60 * 60 * 1000   // 60 minutes
  ]
  return delays[Math.min(retryCount, delays.length - 1)]
}
```

**Step 2: Test webhook signature generation**

Create: `lib/webhook-delivery.test.ts` (optional)

```typescript
import { generateWebhookSignature } from './webhook-delivery'

describe('generateWebhookSignature', () => {
  it('should generate consistent HMAC signature', () => {
    const payload = {
      email: 'test@example.com',
      campaign_id: 'abc-123',
      source: 'linkedin',
      timestamp: '2025-11-10T12:00:00Z'
    }
    const secret = 'test-secret'

    const sig1 = generateWebhookSignature(payload, secret)
    const sig2 = generateWebhookSignature(payload, secret)

    expect(sig1).toBe(sig2)
    expect(sig1).toHaveLength(64)  // SHA256 hex = 64 chars
  })
})
```

Run:
```bash
npm test -- webhook-delivery
```

**Step 3: Commit webhook helper**

```bash
git add lib/webhook-delivery.ts lib/webhook-delivery.test.ts
git commit -m "feat(webhooks): Add webhook delivery helper with HMAC signing"
```

### Subtask 4.2: Create Webhook Retry Endpoint (20 min)

**Step 1: Create cron endpoint**

Create: `app/api/cron/webhook-retry/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyCronAuth } from '@/lib/cron-auth'
import { sendWebhook, calculateRetryDelay } from '@/lib/webhook-delivery'

/**
 * POST /api/cron/webhook-retry
 * Background worker that retries failed webhook deliveries
 *
 * Schedule: Every 10 minutes via Vercel Cron
 * Function: Query failed webhooks → Retry POST → Update status
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log('[WEBHOOK_RETRY] Cron job started')

  // Verify authentication
  const authResult = verifyCronAuth(request)
  if (!authResult.authorized) {
    return authResult.response
  }

  try {
    const supabase = await createClient()

    // Query failed webhooks ready for retry
    const { data: failedWebhooks, error: queryError } = await supabase
      .from('webhook_logs')
      .select(`
        id,
        lead_id,
        campaign_id,
        webhook_url,
        payload,
        retry_count,
        last_attempt_at
      `)
      .eq('status', 'failed')
      .lt('retry_count', 3)
      .order('last_attempt_at', { ascending: true })
      .limit(20)  // Process max 20 per run

    if (queryError) {
      console.error('[WEBHOOK_RETRY] Failed to query webhooks:', queryError)
      return NextResponse.json(
        { error: 'Failed to query webhooks', details: queryError.message },
        { status: 500 }
      )
    }

    if (!failedWebhooks || failedWebhooks.length === 0) {
      console.log('[WEBHOOK_RETRY] No failed webhooks to retry')
      const duration = Date.now() - startTime
      return NextResponse.json({
        success: true,
        duration,
        retried: 0,
        timestamp: new Date().toISOString()
      })
    }

    console.log(`[WEBHOOK_RETRY] Found ${failedWebhooks.length} failed webhooks to retry`)

    let successCount = 0
    let failCount = 0
    const results = []

    for (const webhook of failedWebhooks) {
      try {
        // Check if enough time has passed for retry
        const lastAttempt = webhook.last_attempt_at ? new Date(webhook.last_attempt_at) : null
        if (lastAttempt) {
          const requiredDelay = calculateRetryDelay(webhook.retry_count)
          const elapsed = Date.now() - lastAttempt.getTime()

          if (elapsed < requiredDelay) {
            console.log(`[WEBHOOK_RETRY] Webhook ${webhook.id} not ready for retry (${elapsed}ms < ${requiredDelay}ms)`)
            continue
          }
        }

        console.log(`[WEBHOOK_RETRY] Retrying webhook ${webhook.id} (attempt ${webhook.retry_count + 1}/3)`)

        // Send webhook
        const result = await sendWebhook(
          webhook.webhook_url,
          webhook.payload,
          process.env.WEBHOOK_SECRET || process.env.CRON_SECRET!,
          10000  // 10 second timeout
        )

        if (result.success) {
          // Success - mark as sent
          await supabase
            .from('webhook_logs')
            .update({
              status: 'sent',
              response_status: result.status,
              response_body: result.body,
              last_attempt_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', webhook.id)

          console.log(`[WEBHOOK_RETRY] Webhook ${webhook.id} delivered successfully`)
          successCount++
          results.push({ webhook_id: webhook.id, status: 'sent' })

        } else {
          // Failed - increment retry count
          const newRetryCount = webhook.retry_count + 1

          await supabase
            .from('webhook_logs')
            .update({
              status: newRetryCount >= 3 ? 'failed' : 'failed',  // Keep failed status
              retry_count: newRetryCount,
              response_status: result.status,
              error_message: result.error,
              last_attempt_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', webhook.id)

          console.warn(`[WEBHOOK_RETRY] Webhook ${webhook.id} failed (${newRetryCount}/3): ${result.error}`)
          failCount++
          results.push({
            webhook_id: webhook.id,
            status: 'failed',
            error: result.error,
            attempts: newRetryCount
          })
        }

        // Rate limit: 100ms delay between requests
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.error(`[WEBHOOK_RETRY] Error processing webhook ${webhook.id}:`, error)
        results.push({
          webhook_id: webhook.id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const duration = Date.now() - startTime
    console.log(`[WEBHOOK_RETRY] Completed in ${duration}ms - ${successCount} sent, ${failCount} failed`)

    return NextResponse.json({
      success: true,
      duration,
      retried: successCount + failCount,
      sent: successCount,
      failed: failCount,
      results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[WEBHOOK_RETRY] Fatal error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
```

**Step 2: Test webhook retry**

Create test failed webhook:

```sql
INSERT INTO webhook_logs (
  lead_id,
  campaign_id,
  webhook_url,
  payload,
  status,
  retry_count,
  last_attempt_at
) VALUES (
  '<lead-id>',
  '<campaign-id>',
  'https://webhook.site/<your-unique-url>',  -- Use webhook.site for testing
  '{"email":"test@example.com","source":"test"}'::jsonb,
  'failed',
  0,
  NOW() - INTERVAL '10 minutes'
);
```

Run worker:
```bash
curl -X POST http://localhost:3000/api/cron/webhook-retry \
  -H "Authorization: Bearer $(grep CRON_SECRET .env.local | cut -d= -f2)"
```

Check webhook.site for delivery.

**Step 3: Commit webhook retry worker**

```bash
git add app/api/cron/webhook-retry/route.ts
git commit -m "feat(cron): Add webhook retry worker with exponential backoff"
```

---

## Task 5: Build Pod Notifications Worker (30 min)

**Files:**
- Create: `app/api/cron/pod-notifications/route.ts`
- Create: `lib/email-templates.ts` (email HTML templates)

### Subtask 5.1: Create Email Templates (10 min)

**Step 1: Create email template helper**

Create: `lib/email-templates.ts`

```typescript
/**
 * Email templates for pod notifications and system emails
 */

export interface PodRepostEmailData {
  recipientName: string
  posterName: string
  linkedinUrl: string
  postPreview?: string
}

/**
 * Generate HTML email for pod repost notification
 */
export function generatePodRepostEmail(data: PodRepostEmailData): {
  subject: string
  html: string
  text: string
} {
  const subject = `🚀 New post to engage: ${data.posterName}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #0077B5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; padding: 12px 24px; background: #0077B5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🚀 Pod Engagement Alert</h2>
    </div>
    <div class="content">
      <p>Hey ${data.recipientName}!</p>

      <p><strong>${data.posterName}</strong> just published a new LinkedIn post and needs your engagement support.</p>

      ${data.postPreview ? `<p><em>"${data.postPreview}"</em></p>` : ''}

      <p>Click below to view and engage (like, comment, or repost):</p>

      <a href="${data.linkedinUrl}" class="button">View Post on LinkedIn →</a>

      <p>Remember: Meaningful engagement helps everyone in the pod grow their reach! 🌟</p>

      <p>Thanks for being an active pod member!</p>
    </div>
    <div class="footer">
      <p>You're receiving this because you're a member of a LinkedIn engagement pod.</p>
      <p>Bravo revOS • Automated LinkedIn Lead Generation</p>
    </div>
  </div>
</body>
</html>
  `.trim()

  const text = `
Hey ${data.recipientName}!

${data.posterName} just published a new LinkedIn post and needs your engagement support.

${data.postPreview ? `"${data.postPreview}"\n` : ''}

View and engage here: ${data.linkedinUrl}

Remember: Meaningful engagement helps everyone in the pod grow their reach!

Thanks for being an active pod member!

---
You're receiving this because you're a member of a LinkedIn engagement pod.
Bravo revOS • Automated LinkedIn Lead Generation
  `.trim()

  return { subject, html, text }
}
```

**Step 2: Commit email templates**

```bash
git add lib/email-templates.ts
git commit -m "feat(email): Add pod notification email templates"
```

### Subtask 5.2: Create Pod Notifications Endpoint (20 min)

**Step 1: Create cron endpoint**

Create: `app/api/cron/pod-notifications/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyCronAuth } from '@/lib/cron-auth'
import { Resend } from 'resend'
import { generatePodRepostEmail } from '@/lib/email-templates'

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * POST /api/cron/pod-notifications
 * Background worker that sends pod repost notifications via email
 *
 * Schedule: Every 15 minutes via Vercel Cron
 * Function: Query pending notifications → Send emails → Update status
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log('[POD_NOTIFICATIONS] Cron job started')

  // Verify authentication
  const authResult = verifyCronAuth(request)
  if (!authResult.authorized) {
    return authResult.response
  }

  try {
    const supabase = await createClient()

    // Query pending pod notifications
    const { data: notifications, error: queryError } = await supabase
      .from('notifications')
      .select(`
        id,
        user_id,
        post_id,
        linkedin_url,
        message,
        metadata
      `)
      .eq('status', 'pending')
      .eq('type', 'pod_repost')
      .order('created_at', { ascending: true })
      .limit(50)  // Process max 50 per run

    if (queryError) {
      console.error('[POD_NOTIFICATIONS] Failed to query notifications:', queryError)
      return NextResponse.json(
        { error: 'Failed to query notifications', details: queryError.message },
        { status: 500 }
      )
    }

    if (!notifications || notifications.length === 0) {
      console.log('[POD_NOTIFICATIONS] No pending notifications')
      const duration = Date.now() - startTime
      return NextResponse.json({
        success: true,
        duration,
        sent: 0,
        timestamp: new Date().toISOString()
      })
    }

    console.log(`[POD_NOTIFICATIONS] Found ${notifications.length} pending notifications`)

    let sentCount = 0
    let failCount = 0
    const results = []

    for (const notification of notifications) {
      try {
        // Get user email
        const { data: user } = await supabase
          .from('users')
          .select('email, full_name')
          .eq('id', notification.user_id)
          .single()

        if (!user || !user.email) {
          console.warn(`[POD_NOTIFICATIONS] User ${notification.user_id} has no email, skipping`)
          await supabase
            .from('notifications')
            .update({
              status: 'failed',
              error_message: 'User has no email address',
              updated_at: new Date().toISOString()
            })
            .eq('id', notification.id)
          failCount++
          continue
        }

        // Generate email
        const emailData = generatePodRepostEmail({
          recipientName: user.full_name || user.email.split('@')[0],
          posterName: notification.metadata?.poster_name || 'A pod member',
          linkedinUrl: notification.linkedin_url,
          postPreview: notification.metadata?.post_preview
        })

        // Send via Resend
        console.log(`[POD_NOTIFICATIONS] Sending notification ${notification.id} to ${user.email}`)

        const { data: emailResult, error: emailError } = await resend.emails.send({
          from: 'Bravo revOS <notifications@bravorevos.com>',  // Update with your domain
          to: user.email,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text
        })

        if (emailError) {
          throw emailError
        }

        // Mark as sent
        await supabase
          .from('notifications')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            metadata: {
              ...notification.metadata,
              email_id: emailResult?.id
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', notification.id)

        console.log(`[POD_NOTIFICATIONS] Sent notification ${notification.id} successfully`)
        sentCount++
        results.push({ notification_id: notification.id, status: 'sent', email: user.email })

        // Rate limit: 100ms delay between emails
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.error(`[POD_NOTIFICATIONS] Error sending notification ${notification.id}:`, error)

        await supabase
          .from('notifications')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            updated_at: new Date().toISOString()
          })
          .eq('id', notification.id)

        failCount++
        results.push({
          notification_id: notification.id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const duration = Date.now() - startTime
    console.log(`[POD_NOTIFICATIONS] Completed in ${duration}ms - ${sentCount} sent, ${failCount} failed`)

    return NextResponse.json({
      success: true,
      duration,
      sent: sentCount,
      failed: failCount,
      results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[POD_NOTIFICATIONS] Fatal error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
```

**Step 2: Test pod notifications**

Create test notification:

```sql
-- Get a user ID first
SELECT id, email FROM users LIMIT 1;

-- Create test notification
INSERT INTO notifications (
  user_id,
  type,
  post_id,
  linkedin_url,
  status,
  metadata
) VALUES (
  '<user-id>',
  'pod_repost',
  '<post-id>',
  'https://www.linkedin.com/feed/update/urn:li:activity:test123/',
  'pending',
  '{"poster_name":"John Doe","post_preview":"This is a test post for pod engagement"}'::jsonb
);
```

Run worker:
```bash
curl -X POST http://localhost:3000/api/cron/pod-notifications \
  -H "Authorization: Bearer $(grep CRON_SECRET .env.local | cut -d= -f2)"
```

Check email inbox for delivery.

**Step 3: Commit pod notifications worker**

```bash
git add app/api/cron/pod-notifications/route.ts
git commit -m "feat(cron): Add pod notifications worker with email delivery"
```

---

## Task 6: Configure Vercel Cron (10 min)

**Files:**
- Create: `vercel.json`

**Step 1: Create Vercel configuration**

Create: `vercel.json` (root directory)

```json
{
  "crons": [
    {
      "path": "/api/cron/dm-scraper",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/webhook-retry",
      "schedule": "*/10 * * * *"
    },
    {
      "path": "/api/cron/pod-notifications",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

**Step 2: Document cron schedule**

Add to README.md or DEPLOYMENT.md:

```markdown
## Cron Workers

Background workers run via Vercel Cron:

| Worker | Schedule | Function |
|--------|----------|----------|
| `/api/cron/dm-scraper` | Every 5 minutes | Poll Unipile for comments, send auto-DMs, collect emails |
| `/api/cron/webhook-retry` | Every 10 minutes | Retry failed webhook deliveries with exponential backoff |
| `/api/cron/pod-notifications` | Every 15 minutes | Send pod repost notifications via email |

**Authentication**: All cron endpoints require `Authorization: Bearer $CRON_SECRET` header.

**Testing locally**:
```bash
# Set CRON_SECRET in .env.local
export CRON_SECRET=$(grep CRON_SECRET .env.local | cut -d= -f2)

# Test each worker
curl -X POST http://localhost:3000/api/cron/dm-scraper -H "Authorization: Bearer $CRON_SECRET"
curl -X POST http://localhost:3000/api/cron/webhook-retry -H "Authorization: Bearer $CRON_SECRET"
curl -X POST http://localhost:3000/api/cron/pod-notifications -H "Authorization: Bearer $CRON_SECRET"
```
```

**Step 3: Commit Vercel config**

```bash
git add vercel.json README.md
git commit -m "feat(cron): Configure Vercel Cron for 3 background workers"
```

---

## Task 7: End-to-End Testing (20 min)

**Files:**
- Create: `docs/testing/cron-workers-test-plan.md`

**Step 1: Create test plan document**

Create: `docs/testing/cron-workers-test-plan.md`

```markdown
# Background Workers End-to-End Test Plan

## Test 1: DM Scraper Full Flow

**Duration**: 10-15 minutes

**Steps**:
1. Create campaign via AgentKit:
   - Chat: "Create campaign called Test DM Flow with voice ID voice-123"

2. Schedule test post:
   - Chat: "Schedule post 'Test post - reply GUIDE to get the checklist' for tomorrow"

3. Trigger DM scraper:
   - Chat: "Start DM monitoring for that post with trigger word GUIDE"

4. Verify scrape_job created:
   ```sql
   SELECT * FROM scrape_jobs WHERE status = 'scheduled' ORDER BY created_at DESC LIMIT 1;
   ```

5. Manually trigger worker:
   ```bash
   curl -X POST http://localhost:3000/api/cron/dm-scraper \
     -H "Authorization: Bearer $CRON_SECRET"
   ```

6. Check logs for:
   - ✅ Job queried successfully
   - ✅ Unipile comments polled
   - ✅ Trigger word detected (if test comment exists)
   - ✅ Auto-DM sent (if triggered)
   - ✅ Job metrics updated

7. Simulate email reply in Unipile:
   - Use Unipile dashboard to create test DM with email

8. Run worker again:
   ```bash
   curl -X POST http://localhost:3000/api/cron/dm-scraper \
     -H "Authorization: Bearer $CRON_SECRET"
   ```

9. Verify lead created with email:
   ```sql
   SELECT * FROM leads WHERE email IS NOT NULL ORDER BY created_at DESC LIMIT 1;
   ```

10. Verify webhook queued:
    ```sql
    SELECT * FROM webhook_logs WHERE status = 'pending' ORDER BY created_at DESC LIMIT 1;
    ```

**Expected Results**:
- ✅ Scrape job processes without errors
- ✅ Comments scanned and counted
- ✅ Auto-DM sent on trigger word
- ✅ Email extracted from reply
- ✅ Lead record created
- ✅ Webhook queued

## Test 2: Webhook Retry Flow

**Duration**: 5 minutes

**Steps**:
1. Create failed webhook log:
   ```sql
   INSERT INTO webhook_logs (lead_id, campaign_id, webhook_url, payload, status, retry_count)
   VALUES ('<lead-id>', '<campaign-id>', 'https://webhook.site/<your-url>',
           '{"email":"test@example.com"}'::jsonb, 'failed', 0);
   ```

2. Trigger webhook retry worker:
   ```bash
   curl -X POST http://localhost:3000/api/cron/webhook-retry \
     -H "Authorization: Bearer $CRON_SECRET"
   ```

3. Check webhook.site for delivery

4. Verify status updated:
   ```sql
   SELECT status, retry_count FROM webhook_logs WHERE id = '<webhook-id>';
   ```

**Expected Results**:
- ✅ Webhook retried with HMAC signature
- ✅ Status changed to 'sent' on success
- ✅ Retry count incremented on failure
- ✅ Exponential backoff respected

## Test 3: Pod Notifications Flow

**Duration**: 5 minutes

**Steps**:
1. Create test notification:
   ```sql
   INSERT INTO notifications (user_id, type, linkedin_url, status, metadata)
   VALUES ('<your-user-id>', 'pod_repost',
           'https://www.linkedin.com/feed/update/urn:li:activity:test/',
           'pending',
           '{"poster_name":"Test Poster","post_preview":"Test post content"}'::jsonb);
   ```

2. Trigger pod notifications worker:
   ```bash
   curl -X POST http://localhost:3000/api/cron/pod-notifications \
     -H "Authorization: Bearer $CRON_SECRET"
   ```

3. Check email inbox for notification

4. Verify status updated:
   ```sql
   SELECT status, sent_at FROM notifications WHERE id = '<notification-id>';
   ```

**Expected Results**:
- ✅ Email sent with correct template
- ✅ LinkedIn link clickable
- ✅ Status changed to 'sent'
- ✅ sent_at timestamp recorded

## Test 4: Complete Autonomous Flow

**Duration**: 15 minutes (with 5-minute wait)

**Steps**:
1. User creates campaign via chat
2. User schedules post via chat
3. User triggers DM monitoring via chat
4. Post goes live on LinkedIn (simulated)
5. User comments with trigger word
6. Wait 5 minutes for cron to run
7. Auto-DM sent automatically
8. User replies with email in DM
9. Wait 5 minutes for cron to run
10. Email extracted and webhook fired automatically
11. ESP receives lead data

**Expected Results**:
- ✅ Complete automation from trigger word to ESP delivery
- ✅ No manual intervention required
- ✅ All metrics tracked in database
- ✅ Error handling graceful

## Success Criteria

- [ ] All 3 workers execute without fatal errors
- [ ] DM scraper polls Unipile successfully
- [ ] Trigger word detection works
- [ ] Auto-DM sends successfully
- [ ] Email extraction from replies works
- [ ] Webhook fires with correct payload
- [ ] Optional backup link sends (if configured)
- [ ] Pod notifications deliver emails
- [ ] Rate limits respected (100ms delays)
- [ ] HMAC signatures valid
- [ ] Exponential backoff working
- [ ] Error handling logs properly
```

**Step 2: Run end-to-end test**

Follow test plan step by step, documenting results.

**Step 3: Commit test results**

```bash
git add docs/testing/cron-workers-test-plan.md
git commit -m "docs: Add comprehensive test plan for background workers"
```

---

## Task 8: Production Deployment (10 min)

**Files:**
- Update: `DEPLOYMENT.md`
- Update: `ENVIRONMENT_VARIABLES.md`

**Step 1: Update deployment documentation**

Add to `DEPLOYMENT.md`:

```markdown
## Background Workers Deployment

### Vercel Cron Configuration

Cron jobs are configured in `vercel.json` and run automatically on Vercel/Netlify.

**Required Environment Variables**:
```bash
CRON_SECRET=<generate with: openssl rand -hex 32>
UNIPILE_API_KEY=<from Unipile dashboard>
RESEND_API_KEY=<from Resend dashboard>
SUPABASE_SERVICE_ROLE_KEY=<from Supabase dashboard>
```

**Verify Deployment**:
1. Deploy to Vercel: `vercel --prod`
2. Check Vercel Dashboard → Cron Jobs
3. Verify all 3 jobs appear in list
4. Wait for first execution (5-15 minutes)
5. Check logs in Vercel Dashboard

**Manual Trigger** (for testing):
```bash
curl -X POST https://your-domain.com/api/cron/dm-scraper \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Monitoring

**Check Worker Health**:
- Vercel Dashboard → Functions → Filter by "/api/cron"
- Look for errors, timeouts, or high execution times
- Set up email alerts for failures

**Database Queries**:
```sql
-- Check recent scrape job activity
SELECT id, status, comments_scanned, dms_sent, last_checked
FROM scrape_jobs
WHERE last_checked > NOW() - INTERVAL '1 hour';

-- Check webhook delivery rate
SELECT status, COUNT(*)
FROM webhook_logs
WHERE created_at > NOW() - INTERVAL '1 day'
GROUP BY status;

-- Check notification delivery
SELECT status, COUNT(*)
FROM notifications
WHERE created_at > NOW() - INTERVAL '1 day'
GROUP BY status;
```
```

**Step 2: Update environment variables documentation**

Add to `ENVIRONMENT_VARIABLES.md`:

```markdown
### Background Worker Variables

**CRON_SECRET** (REQUIRED)
- Purpose: Authentication for cron endpoints
- Generate: `openssl rand -hex 32`
- Example: `7a8b9c0d1e2f3g4h5i6j7k8l9m0n1o2p3q4r5s6t7u8v9w0x1y2z3a4b5c6d7e8f`
- Used by: All 3 cron workers

**UNIPILE_API_KEY** (REQUIRED for DM scraper)
- Purpose: LinkedIn API access via Unipile
- Get from: https://dashboard.unipile.com/
- Example: `unipile_sk_...`
- Used by: DM scraper worker

**RESEND_API_KEY** (REQUIRED for pod notifications)
- Purpose: Email delivery via Resend
- Get from: https://resend.com/api-keys
- Example: `re_...`
- Used by: Pod notifications worker

**WEBHOOK_SECRET** (OPTIONAL)
- Purpose: HMAC signing for outgoing webhooks
- Default: Uses CRON_SECRET if not set
- Generate: `openssl rand -hex 32`
- Used by: Webhook retry worker
```

**Step 3: Commit deployment updates**

```bash
git add DEPLOYMENT.md ENVIRONMENT_VARIABLES.md
git commit -m "docs: Add background workers deployment and environment variable documentation"
```

---

## Completion Checklist

### Development
- [ ] All 3 workers created and tested locally
- [ ] Database migrations applied (021, 022, 023, 024)
- [ ] Dependencies installed (resend)
- [ ] Environment variables configured
- [ ] CRON_SECRET generated and added
- [ ] Authentication helper created
- [ ] Webhook delivery helper created
- [ ] Email templates created

### Testing
- [ ] DM scraper tested with mock/real Unipile
- [ ] Webhook retry tested with webhook.site
- [ ] Pod notifications tested with real email
- [ ] End-to-end flow tested successfully
- [ ] Rate limiting verified (100ms delays)
- [ ] Error handling tested
- [ ] HMAC signatures validated

### Deployment
- [ ] vercel.json created with cron schedules
- [ ] Documentation updated (DEPLOYMENT.md, ENVIRONMENT_VARIABLES.md)
- [ ] Test plan documented
- [ ] Code committed to main branch
- [ ] Ready for production deployment

### Monitoring
- [ ] Worker execution logs reviewed
- [ ] Database metrics checked
- [ ] Error tracking configured
- [ ] Alert system planned

---

## Execution Handoff

**Plan complete and saved to `docs/plans/2025-11-10-background-workers.md`.**

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
