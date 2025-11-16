# Pod Amplification Testing Guide

## Setup Complete! ✅

All code for automated LinkedIn pod amplification has been created.

---

## What Was Built

### 1. Queue Infrastructure (`lib/queues/pod-queue.ts`)
- BullMQ queues for job processing
- Two queues: `pod-amplification` (orchestrator) and `pod-repost` (individual reposts)
- Automatic retries with exponential backoff

### 2. API Endpoint (`app/api/pod/trigger-amplification/route.ts`)
- Triggered when a LinkedIn post is published
- Creates `pod_activity` record
- Queues amplification job

### 3. Amplification Worker (`lib/workers/pod-amplification-worker.ts`)
- Finds all active pod members (excluding author)
- Creates individual repost jobs for each member
- Staggers reposts by 5 seconds each

### 4. Repost Worker (`lib/workers/repost-worker.ts`)
- Playwright browser automation
- Logs into LinkedIn using Unipile session cookies
- Navigates to post
- Finds and clicks "Repost" button
- Confirms repost
- Updates `pod_activity` status

### 5. Worker Starter (`scripts/start-workers.ts`)
- Starts both workers
- Graceful shutdown on Ctrl+C
- Run with: `npm run workers`

---

## Prerequisites

### 1. Run SQL Migrations

Open Supabase SQL Editor:
👉 https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new

Run these migrations **in order**:

**Migration 1: Fix your agency_id**
```sql
-- File: supabase/migrations/20251116_fix_roderic_agency_id.sql
UPDATE users
SET agency_id = 'c3ae8595-ba0a-44c8-aa44-db0bdfc3f951'
WHERE email = 'rodericandrews@icloud.com';

SELECT id, email, agency_id FROM users WHERE email = 'rodericandrews@icloud.com';
```

**Migration 2: Update pod_activities table**
```sql
-- File: supabase/migrations/20251116_update_pod_activities_for_workers.sql
ALTER TABLE pod_activities
ADD COLUMN IF NOT EXISTS pod_id UUID REFERENCES clients(id),
ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES pod_members(id),
ADD COLUMN IF NOT EXISTS activity_type TEXT DEFAULT 'repost',
ADD COLUMN IF NOT EXISTS post_url TEXT,
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE pod_activities
DROP CONSTRAINT IF EXISTS pod_activities_status_check;

ALTER TABLE pod_activities
ADD CONSTRAINT pod_activities_status_check
CHECK (status IN ('pending', 'queued', 'processing', 'success', 'failed'));

CREATE INDEX IF NOT EXISTS idx_pod_activities_status ON pod_activities(status);
CREATE INDEX IF NOT EXISTS idx_pod_activities_pod_id ON pod_activities(pod_id);
```

### 2. Verify Redis is Running

```bash
brew services list | grep redis
# Should show "redis started"

# If not running:
brew services start redis
```

### 3. Verify Dependencies Installed

```bash
npm list bullmq ioredis playwright
# Should show all three installed
```

---

## Testing End-to-End

### Terminal 1: Start Workers

```bash
cd /Users/rodericandrews/Obsidian/Master/_projects/bravo-revos
npm run workers
```

You should see:
```
🚀 Starting Pod Amplification Workers...
  - Pod Amplification Worker: Running
  - Repost Worker (Playwright): Running

Press Ctrl+C to stop workers
```

### Terminal 2: Start Dev Server

```bash
npm run dev
```

### Terminal 3: Test Trigger (Manual Test)

```bash
curl -X POST http://localhost:3000/api/pod/trigger-amplification \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_AUTH_COOKIE_HERE" \
  -d '{
    "postId": "test-post-123",
    "postUrl": "https://www.linkedin.com/feed/update/urn:li:activity:1234567890"
  }'
```

**Note:** You'll need to replace `YOUR_AUTH_COOKIE_HERE` with your actual Supabase auth cookie. You can get this from browser DevTools.

---

## What Happens When You Trigger

1. **API receives request** (`/api/pod/trigger-amplification`)
   - Verifies user is authenticated
   - Finds user's active pod membership
   - Creates `pod_activity` record with status='queued'
   - Adds job to `pod-amplification` queue

2. **Amplification Worker processes** (`pod-amplification-worker.ts`)
   - Finds all active pod members (excluding author)
   - Creates `pod_activity` records for each member
   - Adds jobs to `pod-repost` queue (staggered by 5s each)

3. **Repost Worker processes each member** (`repost-worker.ts`)
   - Updates `pod_activity` status to 'processing'
   - Launches Playwright browser
   - Gets LinkedIn session from Unipile
   - Navigates to post URL
   - Finds and clicks "Repost" button
   - Confirms repost
   - Updates `pod_activity` status to 'success' or 'failed'

---

## Monitoring

### Check Queue Status (Redis CLI)

```bash
redis-cli

# List all queues
KEYS *

# Check queue length
LLEN bull:pod-amplification:waiting
LLEN bull:pod-repost:waiting

# Check failed jobs
LLEN bull:pod-amplification:failed
LLEN bull:pod-repost:failed
```

### Check Database (Supabase)

```sql
-- Check pod_activities statuses
SELECT
  id,
  pod_id,
  post_id,
  member_id,
  status,
  processed_at,
  completed_at,
  error_message
FROM pod_activities
ORDER BY created_at DESC
LIMIT 10;
```

### Worker Logs

Workers output detailed logs:
- `[POD_AMPLIFICATION_WORKER]` - Amplification orchestration
- `[REPOST_WORKER]` - Browser automation steps

---

## Troubleshooting

### Issue: "Could not find Repost button"

**Cause:** LinkedIn's UI changes frequently, selectors might be outdated.

**Fix:** Open browser in non-headless mode to debug:

Edit `lib/workers/repost-worker.ts` line 71:
```typescript
headless: false, // Set to false for debugging
```

Then watch the browser automation and see where it gets stuck.

### Issue: "Unipile API error: 401"

**Cause:** Invalid or expired Unipile credentials.

**Fix:** Verify `.env.local` has correct Unipile credentials:
```
UNIPILE_DSN=https://api3.unipile.com:13344
UNIPILE_API_KEY=your-actual-api-key
```

### Issue: Workers crash immediately

**Cause:** Redis not running or wrong Redis URL.

**Fix:**
```bash
# Check Redis
brew services list | grep redis

# Restart if needed
brew services restart redis

# Verify .env.local
cat .env.local | grep REDIS_URL
# Should be: REDIS_URL=redis://localhost:6379
```

---

## Next Steps (Tomorrow's Refactor)

**DO NOT do this tonight** - ship the feature first, refactor tomorrow:

1. Delete `clients` table (or rename to `companies`)
2. Treat `users` as clients
3. Create proper `pods` table with auto-generated names
4. Create `pod_memberships` join table
5. Update all FK references
6. Update RLS policies

---

## Success Criteria

✅ **Minimum viable for tonight:**
- [ ] Workers start without errors
- [ ] Playwright logs into LinkedIn
- [ ] Repost button found and clicked
- [ ] At least 1 repost appears on a pod member's profile
- [ ] `pod_activities` shows status='success'

**That's it. Ship this, refactor tomorrow.** 🚀
