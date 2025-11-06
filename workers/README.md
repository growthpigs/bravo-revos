# Webhook Delivery Worker

Background worker for processing webhook deliveries with automatic retry logic.

## Overview

The webhook delivery system consists of:
- **API Endpoint** (`/api/webhook-delivery`) - Queues webhook deliveries
- **Queue System** (`lib/queue/webhook-delivery-queue.ts`) - BullMQ queue with Redis
- **Background Worker** (`workers/webhook-delivery-worker.ts`) - Processes jobs

## Features

- ✅ HMAC-SHA256 webhook signatures
- ✅ Exponential backoff retry (5s → 25s → 125s → 625s)
- ✅ Rate limiting (50 jobs/second)
- ✅ 5 concurrent workers
- ✅ Delivery status tracking
- ✅ Audit logging
- ✅ ESP format support (Zapier, Make.com, ConvertKit)
- ✅ Graceful shutdown

## Setup

### 1. Install Dependencies

Already installed via `package.json`:
- `bullmq` - Redis-backed job queue
- `ioredis` - Redis client
- `tsx` - TypeScript execution (dev dependency)

### 2. Start Redis

The worker requires Redis to be running:

```bash
# Install Redis (if not already installed)
brew install redis  # macOS
# or
sudo apt install redis-server  # Ubuntu

# Start Redis server
redis-server

# Verify Redis is running
redis-cli ping  # Should return "PONG"
```

### 3. Configure Environment Variables

Add to `.env.local`:

```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379

# Supabase Configuration (already set)
NEXT_PUBLIC_SUPABASE_URL=https://cdoikmuoiccqllqdpoew.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Important:** Get the `SUPABASE_SERVICE_ROLE_KEY` from:
https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp/settings/api

### 4. Start the Worker

```bash
npm run worker:webhook
```

You should see:
```
[WEBHOOK_WORKER] Starting webhook delivery worker...
[WEBHOOK_WORKER] Worker started successfully
[WEBHOOK_WORKER] Redis: redis://localhost:6379
[WEBHOOK_WORKER] Supabase: https://cdoikmuoiccqllqdpoew.supabase.co
[WEBHOOK_WORKER] Processing queue: webhook-delivery
[WEBHOOK_WORKER] Concurrency: 5 workers
[WEBHOOK_WORKER] Rate limit: 50 jobs/second
[WEBHOOK_WORKER] Listening for jobs...
```

## Testing

### 1. Test Webhook Delivery API

Queue a test webhook:

```bash
curl -X POST http://localhost:3000/api/webhook-delivery \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "test-lead-id",
    "webhookUrl": "https://webhook.site/unique-url",
    "webhookSecret": "test-secret",
    "campaignName": "Test Campaign"
  }'
```

### 2. Monitor Queue Status

Check queue status:

```bash
curl http://localhost:3000/api/webhook-delivery
```

### 3. Check Worker Logs

The worker will log:
- Job processing: `[WEBHOOK_QUEUE] Processing delivery {id}`
- Successful deliveries: `[WEBHOOK_QUEUE] Delivery {id} succeeded`
- Failed attempts: `[WEBHOOK_QUEUE] Delivery {id} failed, retry {attempt} scheduled`
- Permanent failures: `[WEBHOOK_QUEUE] Delivery {id} permanently failed`

### 4. Inspect Redis

```bash
# List all webhook delivery jobs
redis-cli KEYS "bull:webhook-delivery:*"

# Check waiting jobs
redis-cli LLEN "bull:webhook-delivery:wait"

# Check active jobs
redis-cli LLEN "bull:webhook-delivery:active"

# Check delayed jobs (retries)
redis-cli ZCARD "bull:webhook-delivery:delayed"
```

## Database Tables

The webhook system uses these tables (created in migration 007):

### `webhook_deliveries`
Tracks each webhook delivery attempt:
- `id` - UUID
- `lead_id` - Foreign key to leads table
- `webhook_url` - Destination URL
- `payload` - JSON webhook payload
- `signature` - HMAC-SHA256 signature
- `status` - pending | sent | success | failed
- `attempt` - Current attempt number (1-4)
- `max_attempts` - Maximum retry attempts (4)
- `response_status` - HTTP status code
- `response_body` - Response body (truncated to 1000 chars)
- `last_error` - Last error message
- `sent_at` - Timestamp of last send attempt
- `next_retry_at` - Scheduled retry time

### `webhook_delivery_logs`
Audit log for all delivery attempts:
- `id` - UUID
- `delivery_id` - Foreign key to webhook_deliveries
- `attempt_number` - Attempt number
- `attempted_at` - Timestamp
- `response_status` - HTTP status code
- `response_body` - Response body
- `error` - Error message
- `error_type` - network | http | null
- `will_retry` - Boolean
- `retry_at` - Next retry timestamp

## Deployment

### Local Development

Run worker in a separate terminal alongside Next.js dev server:

```bash
# Terminal 1: Next.js dev server
npm run dev

# Terminal 2: Redis server
redis-server

# Terminal 3: Webhook worker
npm run worker:webhook
```

### Production (Render)

The worker will be deployed as a **Background Worker** on Render:

1. Create new Background Worker service
2. Set build command: `npm install`
3. Set start command: `npm run worker:webhook`
4. Add environment variables:
   - `REDIS_URL` (from Render Redis addon)
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Link to same Redis instance as main backend

## Monitoring

### Check Queue Health

```bash
# API endpoint for queue stats
curl http://localhost:3000/api/webhook-delivery
```

Returns:
```json
{
  "status": "success",
  "deliveries": [...],
  "total": 10
}
```

### Worker Metrics

The worker logs these metrics:
- Jobs processed per second
- Success rate
- Average retry count
- Failed deliveries

### Supabase Dashboard

Monitor in real-time:
- `webhook_deliveries` table - Current delivery status
- `webhook_delivery_logs` - Complete audit trail

## Troubleshooting

### Worker won't start

**Error:** "Missing required environment variables"
- **Fix:** Add `REDIS_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`

**Error:** "Could not connect to Redis"
- **Fix:** Start Redis with `redis-server`

### Jobs not processing

1. Check Redis is running: `redis-cli ping`
2. Check worker is running: Look for "[WEBHOOK_WORKER] Listening for jobs..." in logs
3. Check queue status: `curl http://localhost:3000/api/webhook-delivery`
4. Check Redis keys: `redis-cli KEYS "bull:webhook-delivery:*"`

### Deliveries failing

1. Check webhook URL is valid and accessible
2. Check webhook endpoint returns 2xx status
3. Review `webhook_delivery_logs` table for error details
4. Verify HMAC signature is correct (if endpoint validates)

### Rate limiting

The worker processes max 50 jobs/second with 5 concurrent workers. If deliveries are slow:
- Check webhook endpoint response time
- Consider increasing concurrency (edit `createWebhookWorker()`)
- Monitor queue `delayed` count (should be low)

## Architecture

### Flow

1. Lead captured → DM sent → Email extracted
2. API creates `webhook_deliveries` record
3. API queues job to BullMQ
4. Worker picks up job from queue
5. Worker sends webhook with HMAC signature
6. Worker updates delivery status
7. Worker logs attempt to `webhook_delivery_logs`
8. On failure: Worker queues retry with exponential backoff
9. On success: Lead status updated to `webhook_sent`

### Retry Strategy

- **Attempt 1:** Immediate (no delay)
- **Attempt 2:** 5 seconds delay
- **Attempt 3:** 25 seconds delay
- **Attempt 4:** 125 seconds delay (final attempt)

Retries only on:
- Network errors
- HTTP 5xx errors
- Timeout errors

Does NOT retry on:
- HTTP 4xx errors (except 429 Rate Limit)
- Invalid webhook URL
- Missing required data

## Related Files

- `/app/api/webhook-delivery/route.ts` - API endpoint
- `/lib/queue/webhook-delivery-queue.ts` - Queue and worker logic
- `/lib/webhook-delivery.ts` - Webhook utilities (HMAC, retry, ESP formatters)
- `/lib/redis.ts` - Redis connection singleton
- `/supabase/migrations/007_webhook_delivery.sql` - Database schema
