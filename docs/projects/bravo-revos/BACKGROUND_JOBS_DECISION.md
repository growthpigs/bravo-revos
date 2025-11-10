# Background Jobs Strategy: Vercel Cron vs Render Worker
**Date**: 2025-11-09
**Decision Required**: Which system to use for scheduled tasks
**Time to Decide**: 30 minutes

---

## What Needs Background Jobs?

From the completion plan, these features require scheduled execution:

1. **DM Sequences** - Send queued DMs every 15 minutes
   - Check `dm_queue` table for pending DMs
   - Respect LinkedIn rate limits (20-50/day per account)
   - Update status (sent/failed)

2. **LinkedIn Post Scheduling** - Publish scheduled posts every 15 minutes
   - Check `posts` table for `status='scheduled'` and `scheduled_for < NOW()`
   - Call Unipile API to create post
   - Update status to `published`

3. **Analytics Aggregation** (optional) - Daily at midnight
   - Calculate platform-wide stats
   - Update materialized views
   - Cache expensive queries

---

## Option 1: Vercel Cron Jobs

### How It Works
```typescript
// app/api/cron/dm-queue/route.ts
export const runtime = 'edge'

export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Process DM queue
  const supabase = createClient()
  const { data: pending } = await supabase
    .from('dm_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('send_at', new Date().toISOString())
    .limit(50)

  // Send DMs via Unipile
  for (const dm of pending) {
    await sendDM(dm)
  }

  return Response.json({ processed: pending.length })
}
```

**Configuration** (vercel.json):
```json
{
  "crons": [
    {
      "path": "/api/cron/dm-queue",
      "schedule": "*/15 * * * *"  // Every 15 minutes
    },
    {
      "path": "/api/cron/post-scheduler",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

### Pros ✅
- **Zero infrastructure setup** - Just deploy, it works
- **Built into Vercel** - No additional services needed
- **Edge runtime** - Fast, globally distributed
- **Free tier generous** - 500 invocations/month on Hobby plan
- **Simple authentication** - Bearer token verification
- **Deploy with main app** - Single deployment process

### Cons ❌
- **Vercel vendor lock-in** - Can't migrate to another host easily
- **Minimum 1-minute interval** - Can't run more frequently than every minute
- **Execution time limit**: 10 seconds (Hobby), 60 seconds (Pro), 300 seconds (Enterprise)
- **No job retries** - If cron fails, you lose that execution
- **No job queue** - Each cron runs independently, no priority
- **Cold starts** - Edge functions may have 0-500ms cold start
- **Pro plan required for production** - Free tier is limited

### Best For
- Simple scheduled tasks
- Stateless operations
- Low-frequency jobs (every 15+ mins)
- MVP/prototyping phase
- Small-scale deployments

---

## Option 2: Render Background Worker

### How It Works
```typescript
// worker.ts (separate process)
import cron from 'node-cron'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Job 1: Process DM Queue (every 15 minutes)
cron.schedule('*/15 * * * *', async () => {
  console.log('[CRON] Processing DM queue...')

  const { data: pending } = await supabase
    .from('dm_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('send_at', new Date().toISOString())
    .limit(50)

  for (const dm of pending) {
    try {
      await sendDM(dm)
      await supabase
        .from('dm_queue')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', dm.id)
    } catch (error) {
      await supabase
        .from('dm_queue')
        .update({ status: 'failed', error: error.message })
        .eq('id', dm.id)
    }
  }

  console.log(`[CRON] Processed ${pending.length} DMs`)
})

// Job 2: Process Post Scheduler (every 15 minutes)
cron.schedule('*/15 * * * *', async () => {
  console.log('[CRON] Processing post scheduler...')
  // Similar logic for posts
})

// Job 3: Analytics Aggregation (daily at midnight)
cron.schedule('0 0 * * *', async () => {
  console.log('[CRON] Running analytics aggregation...')
  // Aggregate stats
})

// Keep process alive
console.log('[WORKER] Background worker started')
process.on('SIGTERM', () => {
  console.log('[WORKER] Shutting down gracefully')
  process.exit(0)
})
```

**render.yaml**:
```yaml
services:
  - type: web
    name: revos-api
    runtime: node
    buildCommand: npm install
    startCommand: npm start

  - type: worker
    name: revos-worker
    runtime: node
    buildCommand: npm install
    startCommand: node worker.ts
    envVars:
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false
      - key: UNIPILE_API_KEY
        sync: false
```

### Pros ✅
- **No vendor lock-in** - Can move to any hosting provider
- **Long-running process** - No execution time limits
- **Built-in retries** - node-cron handles failures gracefully
- **Full Node.js environment** - Access to all npm packages
- **Persistent connections** - Can maintain DB pools, Redis connections
- **Complex workflows** - Can implement job queues (BullMQ), priorities
- **Better logging** - Render provides persistent logs
- **Scales independently** - Worker can scale separately from web app
- **Cost-effective** - $7/month for worker (same as web service)

### Cons ❌
- **Requires separate deployment** - Additional infrastructure to manage
- **Setup complexity** - Need to configure worker service in Render
- **Health monitoring** - Need to implement heartbeat/health checks
- **Resource usage** - Uses memory even when idle (unlike Vercel Cron)
- **Restart handling** - Need graceful shutdown logic
- **Not serverless** - Always-on process (but that's also a pro)

### Best For
- Production applications
- Complex job workflows
- High-frequency tasks
- Long-running operations
- Need for retries/queues
- Multi-step workflows

---

## Option 3: Hybrid Approach

### What It Is
- Use **Vercel Cron** for triggering
- Call **Render API endpoints** to do heavy lifting

**Example**:
```typescript
// Vercel: app/api/cron/trigger-dm-queue/route.ts
export async function GET(req: Request) {
  // Lightweight trigger - just calls Render
  const response = await fetch('https://revos-api.onrender.com/api/jobs/dm-queue', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.JOB_SECRET}` }
  })

  return Response.json({ triggered: true })
}

// Render: api/jobs/dm-queue (long-running endpoint)
app.post('/api/jobs/dm-queue', async (req, res) => {
  // Heavy processing happens here
  // No time limits, full Node.js environment
  await processDMQueue()
  res.json({ success: true })
})
```

### Pros ✅
- **Best of both worlds** - Simple trigger + powerful execution
- **Vercel handles scheduling** - No need for separate cron service
- **Render handles execution** - No time limits
- **Graceful degradation** - If Render is down, Vercel cron retries

### Cons ❌
- **Network overhead** - Extra HTTP call between services
- **Complexity** - Two systems to manage
- **Authentication** - Need to secure Render endpoints

---

## Decision Matrix

| Criteria | Vercel Cron | Render Worker | Hybrid |
|----------|-------------|---------------|--------|
| **Setup Time** | 1 hour | 2-3 hours | 2 hours |
| **Cost (monthly)** | $0 (Hobby) → $20 (Pro) | $7 | $7 |
| **Execution Limit** | 10s → 300s | None | None |
| **Vendor Lock-in** | High | Low | Medium |
| **Scalability** | Low | High | High |
| **Retries** | Manual | Built-in | Built-in |
| **Complexity** | Low | Medium | Medium |
| **Production Ready** | ⚠️ | ✅ | ✅ |

---

## Recommendation

### **For RevOS: Render Background Worker** 🏆

**Why:**
1. **Already using Render for backend** - No new infrastructure
2. **DM sequences are mission-critical** - Need reliability and retries
3. **Long-running tasks** - Sending 50 DMs may take > 10 seconds
4. **Cost-effective** - $7/month is reasonable for production app
5. **Future-proof** - Can add BullMQ, Redis, more complex workflows later
6. **No vendor lock-in** - Can migrate if needed

### Implementation Timeline

**Phase 1: Basic Worker** (2 hours)
1. Create `worker.ts` with node-cron
2. Implement DM queue processor
3. Implement post scheduler
4. Deploy to Render as worker service

**Phase 2: Enhanced Monitoring** (1 hour)
5. Add health check endpoint
6. Implement Sentry error tracking
7. Add job execution metrics

**Phase 3: Advanced Features** (optional - 3 hours)
8. Add BullMQ for job queue
9. Implement job priorities
10. Add Redis for caching

---

## Quick Start: Minimal Render Worker

**File: `worker.ts`**
```typescript
import cron from 'node-cron'
import { processDMQueue } from './jobs/dm-queue'
import { processPostScheduler } from './jobs/post-scheduler'

console.log('[WORKER] Starting background worker...')

// DM Queue (every 15 minutes)
cron.schedule('*/15 * * * *', async () => {
  await processDMQueue()
})

// Post Scheduler (every 15 minutes)
cron.schedule('*/15 * * * *', async () => {
  await processPostScheduler()
})

// Health check server (so Render knows worker is alive)
import express from 'express'
const app = express()
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }))
app.listen(process.env.PORT || 3001)

console.log('[WORKER] Background worker ready')
```

**File: `render.yaml`** (add to existing):
```yaml
services:
  # ... existing web service ...

  - type: worker
    name: revos-worker
    runtime: node
    buildCommand: npm install && npm run build
    startCommand: node dist/worker.js
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: revos-db
          property: connectionString
```

**Package.json additions**:
```json
{
  "dependencies": {
    "node-cron": "^3.0.3",
    "express": "^4.18.2"
  },
  "scripts": {
    "worker": "tsx worker.ts",
    "worker:dev": "tsx watch worker.ts"
  }
}
```

---

## Alternative: Start Simple, Upgrade Later

### **MVP Approach** (if time-constrained)

**Phase 1: Vercel Cron** (1 hour setup)
- Use Vercel Cron for MVP launch
- Get product to market faster
- Validate DM sequence feature works

**Phase 2: Migrate to Render Worker** (when needed - 2 hours)
- Move to Render Worker when hitting limitations
- Smooth migration path (same job logic, different scheduler)

**This is acceptable** if you want to ship Week 1 features ASAP without background jobs blocking.

---

## Final Verdict

| Scenario | Recommendation |
|----------|----------------|
| **Ship MVP fast** | Vercel Cron (migrate later) |
| **Production app** | Render Background Worker ✅ |
| **Enterprise scale** | Render Worker + BullMQ + Redis |
| **Unsure** | Start Vercel Cron → Migrate when needed |

**My Strong Recommendation**: **Render Background Worker**
- Setup time: 2-3 hours (worth the investment)
- Production-ready from day 1
- No migration needed later
- Already using Render infrastructure

---

## Next Steps

1. **Decision**: Choose Render Worker or Vercel Cron
2. **Setup**: Implement chosen solution (2-3 hours)
3. **Test**: Verify jobs run correctly
4. **Deploy**: Push to production
5. **Monitor**: Add logging and alerts

**Don't block Week 1 work** - This can be done in parallel with UI development.

