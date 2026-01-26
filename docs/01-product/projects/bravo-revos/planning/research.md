# Phase 0: Research - RevOS V1 V1 V1 LinkedIn Growth Engine

**Feature Branch**: `001-linkedin-growth-engine`  
**Research Completed**: 2025-11-02  
**Status**: Ready for Planning Phase

---

## 1. Unipile API Research

### Decision: Use Unipile API with Conservative Rate Limits + Webhook Monitoring

### Rationale
Unipile provides the only reliable API for LinkedIn DM automation and comment scraping without violating LinkedIn's TOS. Their managed infrastructure handles rate limiting automatically, and they provide webhooks for account status monitoring. Conservative limits (50 DMs/day, ramping from 15/day) ensure account safety while the webhook system provides real-time alerts for session issues.

### Alternatives Considered
- **LinkedIn Official API**: Rejected - Does not support DM automation or comment scraping
- **Puppeteer/Playwright Direct**: Rejected - High ban risk, requires session management
- **Phantombuster**: Rejected - Less control, higher cost, no custom tooling

### Implementation Notes

#### Rate Limits (LinkedIn Provider Limits)
- **Connection Requests**: 80-100 invitations/day (paid accounts), 5/month with message (free accounts), 150/week without note
- **DM Messaging**: 100-150 messages/day per account (recommended: 30-50 distributed randomly)
- **Profile Retrieval**: ~100 profiles/day (standard), 2,500/day (Sales Navigator/Recruiter)
- **Search Results**: Max 1,000 profiles/query (standard), 2,500 (premium)
- **Comment Scraping**: No explicit limit documented, but Unipile manages server-side synchronization
- **Error Codes**: HTTP 429 (rate limit exceeded), HTTP 500 (server error), HTTP 422 (cannot_resend_yet for invitations)

#### Recommended Strategy for RevOS
- Start at **15 DMs/day** for first week
- Increase by **5 DMs/week** until reaching 50/day max
- Random delays: **2-15 minutes** between DMs
- Distribute sends across working hours (9 AM - 6 PM user's timezone)
- Use **2-minute minimum gap** between any DM sends

#### Webhook Configuration
**Account Status Webhook**:
```json
POST https://yourapp.com/webhooks/unipile/account-status
{
  "event": "account_status_changed",
  "account_id": "abc123",
  "status": "disconnected" | "active" | "rate_limited",
  "timestamp": "2025-11-02T10:30:00Z",
  "provider": "LINKEDIN"
}
```

**New Connection Webhook** (for accepted invitations):
```json
POST https://yourapp.com/webhooks/unipile/new-relation
{
  "event": "new_relation",
  "account_id": "abc123",
  "contact": {
    "name": "John Smith",
    "linkedin_url": "https://linkedin.com/in/johnsmith",
    "profile_data": {...}
  }
}
```

#### Error Handling Strategy
1. **HTTP 429**: Pause queue for 60 minutes, mark job as delayed
2. **HTTP 422 (cannot_resend_yet)**: Skip lead, reschedule for +24 hours
3. **HTTP 500**: Retry 3x with exponential backoff (2min, 4min, 8min)
4. **Session expired**: Trigger webhook alert to user, require re-authentication

#### API Endpoints Used
- `POST /api/v1/messages` - Send DM
- `GET /api/v1/posts/{postId}/comments` - Scrape comments (pagination supported)
- `GET /api/v1/posts/{userId}/list` - Get user's last 30 posts (for voice analysis)
- `POST /api/v1/webhooks` - Register webhook endpoints

---

## 2. Mem0 Configuration Research

### Decision: Mem0 with Supabase pgvector backend, 1536-dimensional vectors, composite keys `tenantId::userId`

### Rationale
Mem0 provides the simplest abstraction for persistent conversational memory with automatic extraction and retrieval. Supabase pgvector offers production-ready vector storage with HNSW indexing for fast similarity search. The 1536-dimensional vectors align with OpenAI's standard embedding models (text-embedding-3-small). Composite keys ensure multi-tenant isolation at the memory layer without complex RLS policies in Mem0 itself.

### Alternatives Considered
- **Pinecone**: Rejected - Additional cost, external dependency, overkill for memory use case
- **Chroma**: Rejected - Less production-ready, requires separate hosting
- **Plain PostgreSQL JSONB**: Rejected - No semantic search, manual memory management complexity

### Implementation Notes

#### Configuration Format
```python
from mem0 import Memory

config = {
    "vector_store": {
        "provider": "supabase",
        "config": {
            "connection_string": "postgresql://user:password@host:port/database?sslmode=require",
            "collection_name": "memories",
            "index_method": "hnsw",
            "index_measure": "cosine_distance",
            "embedding_model_dims": 1536
        }
    },
    "embedder": {
        "provider": "openai",
        "config": {
            "model": "text-embedding-3-small"
        }
    }
}

memory = Memory.from_config(config)
```

#### Vector Dimensions
- **Embedding Model**: `text-embedding-3-small` (OpenAI)
- **Dimensions**: 1536
- **Alternative**: If using different model (e.g., Supabase gte-small), change to 384 dimensions

#### Composite Key Pattern for Multi-Tenancy
```python
# Memory operations ALWAYS include tenant::user composite key
user_id = f"{tenant_id}::{user_id}"

# Add memory
memory.add(
    messages=[{"role": "user", "content": "I prefer casual tone, avoid sales language"}],
    user_id=user_id
)

# Search memories
relevant_memories = memory.search(
    query="What tone does the user prefer?",
    user_id=user_id,
    limit=5
)
```

#### Similarity Threshold
Mem0 does not expose explicit similarity threshold configuration - it handles this internally via the vector search function. Default behavior:
- Returns top K results (configurable via `limit` parameter)
- Results ordered by cosine similarity (highest first)
- Typical threshold range: 0.7-0.9 for relevant memories

#### Supabase SQL Migration
```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create memories table
CREATE TABLE memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(1536) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create HNSW index for fast similarity search
CREATE INDEX memories_embedding_idx ON memories 
USING hnsw (embedding vector_cosine_ops);

-- Create index on user_id for tenant isolation
CREATE INDEX memories_user_id_idx ON memories(user_id);

-- Optional: Create match function for similarity search
CREATE OR REPLACE FUNCTION match_memories(
    query_embedding VECTOR(1536),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 5,
    filter_user_id TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    user_id TEXT,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        memories.id,
        memories.user_id,
        memories.content,
        memories.metadata,
        1 - (memories.embedding <=> query_embedding) AS similarity
    FROM memories
    WHERE 
        (filter_user_id IS NULL OR memories.user_id = filter_user_id)
        AND 1 - (memories.embedding <=> query_embedding) > match_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;
```

#### Index Methods
- **HNSW** (Hierarchical Navigable Small World): Fastest, recommended for production
- **IVFFlat**: Balanced speed/accuracy, good for large datasets
- **Auto**: Mem0 selects based on data size

#### Memory TTL Strategy
Not implemented in MVP - deferred to post-launch. Future considerations:
- Archive memories older than 90 days
- Implement `last_accessed_at` tracking
- Periodic cleanup job (weekly cron)

#### Best Practices
1. **Memory Extraction**: Let Mem0 auto-extract from conversation context (no manual tagging)
2. **User Feedback Loop**: When user corrects AgentKit, trigger explicit memory add
3. **Progressive Context**: Start with System Cartridge, add memories only when needed (lazy loading)
4. **Tenant Isolation**: NEVER query memories without `tenantId::userId` composite key

---

## 3. BullMQ + Redis Production Patterns

### Decision: Upstash Redis with BullMQ, Fixed Pricing Plan, Worker-Level Rate Limiting

### Rationale
Upstash Redis provides managed Redis with global edge deployment and built-in persistence, eliminating DevOps overhead. **Critical**: Must use Fixed Pricing Plan (not Pay-As-You-Go) because BullMQ polls Redis continuously, generating high request counts even with no jobs. Worker-level rate limiting (10 jobs/min for DMs) ensures LinkedIn rate compliance while BullMQ's exponential backoff handles transient failures gracefully.

### Alternatives Considered
- **Self-Hosted Redis on Fly.io/Railway**: Rejected - Requires manual backups, monitoring, scaling
- **AWS ElastiCache**: Rejected - Overkill for MVP, higher cost, AWS lock-in
- **Upstash Pay-As-You-Go**: Rejected - BullMQ polling would incur massive costs

### Implementation Notes

#### Upstash Redis Configuration
```typescript
import { Queue, Worker, QueueScheduler } from 'bullmq';
import IORedis from 'ioredis';

// Upstash connection (MUST use TLS)
const connection = new IORedis({
  host: process.env.UPSTASH_REDIS_ENDPOINT,
  port: 6379,
  password: process.env.UPSTASH_REDIS_PASSWORD,
  tls: {}, // Required for Upstash
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
});

// DM Queue
const dmQueue = new Queue('dm-automation', { connection });

// Queue Scheduler (required for delayed jobs)
const dmScheduler = new QueueScheduler('dm-automation', { connection });
```

#### Worker-Level Rate Limiting (50 DMs/day)
```typescript
const dmWorker = new Worker(
  'dm-automation',
  async (job) => {
    const { leadId, campaignId, tenantId } = job.data;
    await sendDM(leadId, campaignId, tenantId);
  },
  {
    connection,
    limiter: {
      max: 10,        // Max 10 jobs
      duration: 60000 // Per 60 seconds (1 minute)
    }
  }
);
```

**Why 10 jobs/min?**
- 10 jobs/min × 60 min/hour = 600 jobs/hour
- For 50 DMs/day: spread over 8 hours (9 AM - 5 PM) = 6.25 DMs/hour
- **Safe buffer**: Actual rate will be ~6 DMs/hour due to random delays

#### Retry Strategy with Exponential Backoff
```typescript
// Add job with retry config
await dmQueue.add(
  'send-dm',
  { leadId: 'lead_123', campaignId: 'camp_456', tenantId: 'tenant_789' },
  {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2 * 60 * 1000, // Start at 2 minutes
    },
    removeOnComplete: {
      age: 24 * 60 * 60, // Keep completed jobs for 24 hours
      count: 1000,        // Keep max 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 60 * 60, // Keep failed jobs for 7 days (debugging)
    },
  }
);
```

**Exponential Backoff Calculation**:
- Attempt 1 fails → Retry after 2 minutes
- Attempt 2 fails → Retry after 4 minutes
- Attempt 3 fails → Move to failed state (dead letter queue)

#### Dead Letter Queue Pattern
```typescript
// Listen for failed jobs
dmWorker.on('failed', async (job, err) => {
  if (job.attemptsMade >= job.opts.attempts) {
    // Job exhausted retries - move to dead letter queue
    await deadLetterQueue.add('dead-dm', {
      originalJob: job.data,
      error: err.message,
      failedAt: new Date(),
      tenantId: job.data.tenantId,
    });
    
    // Send alert to Superadmin
    await sendSlackAlert({
      channel: '#revos-alerts',
      message: `DM job failed after 3 attempts: Lead ${job.data.leadId}`,
    });
  }
});

// Manual inspection/retry from dead letter queue
const deadLetterWorker = new Worker('dead-letter', async (job) => {
  // Log to admin dashboard for manual review
  await logToAdminDashboard(job.data);
}, { connection });
```

#### Queue Monitoring (Production)
```typescript
// Health check endpoint
app.get('/api/health/queues', async (req, res) => {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    dmQueue.getWaitingCount(),
    dmQueue.getActiveCount(),
    dmQueue.getCompletedCount(),
    dmQueue.getFailedCount(),
    dmQueue.getDelayedCount(),
  ]);
  
  res.json({
    dmQueue: { waiting, active, completed, failed, delayed },
    healthy: failed < 100, // Alert if >100 failed jobs
  });
});

// BullBoard UI (for Superadmin)
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

const serverAdapter = new ExpressAdapter();
createBullBoard({
  queues: [
    new BullMQAdapter(dmQueue),
    new BullMQAdapter(reshareQueue),
  ],
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());
```

#### Cost Optimization Strategy
1. **Use Upstash Fixed Plan**: Avoid per-request charges ($10-20/month vs $100+/month on PAYG)
2. **Job Cleanup**: Auto-remove completed jobs after 24 hours
3. **Limit Polling Frequency**: Use `QueueScheduler` sparingly (only for delayed jobs)
4. **Connection Pooling**: Reuse IORedis connection across queues

#### Additional BullMQ Queues
- **DM Queue**: LinkedIn DM automation (10 jobs/min)
- **Reshare Queue**: Playwright reshare jobs (20 jobs/hour, 1 job/3 min)
- **Email Webhook Queue**: POST to client webhooks (100 jobs/min)
- **Voice Analysis Queue**: Analyze user's LinkedIn posts (low priority, 1 job/5 min)
- **Dead Letter Queue**: Failed jobs requiring manual intervention

---

## 4. Playwright LinkedIn Automation

### Decision: Playwright with playwright-extra stealth plugin, Bezier curve mouse movements, variable typing speed (50-150ms), human behavior simulation

### Rationale
Playwright with stealth plugins is the ONLY viable approach for LinkedIn resharing since Unipile API doesn't support resharing. Stealth plugins remove automation signals (navigator.webdriver, CDP detection). Bezier curve mouse movements and variable typing speeds simulate human behavior, reducing ban risk. However, this remains the HIGHEST RISK feature - must implement ultra-conservative limits (20 reshares/day max) and test on burner accounts first.

### Alternatives Considered
- **Puppeteer**: Rejected - Similar to Playwright but less modern API
- **Selenium**: Rejected - Easier to detect, slower, outdated
- **Unipile API**: Not available - No reshare endpoint exists

### Implementation Notes

#### Stealth Configuration
```typescript
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Add stealth plugin
chromium.use(StealthPlugin());

// Launch browser with stealth mode
const browser = await chromium.launch({
  headless: true, // Use headless in production
  args: [
    '--disable-blink-features=AutomationControlled',
    '--disable-dev-shm-usage',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-web-security',
    '--disable-features=IsolateOrigins,site-per-process',
  ],
});

const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  locale: 'en-US',
  timezoneId: 'America/New_York',
});
```

#### LinkedIn Session Persistence
```typescript
// Store session cookies in database (encrypted with AES-256-GCM)
import crypto from 'crypto';

// After user logs in, capture cookies
const cookies = await context.cookies();
const encryptedCookies = encryptCookies(cookies, process.env.COOKIE_ENCRYPTION_KEY);

await db.linkedinSessions.create({
  data: {
    accountId: 'user_123',
    tenantId: 'tenant_abc',
    cookiesEncrypted: encryptedCookies,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  },
});

// Load session for automation
const session = await db.linkedinSessions.findUnique({ where: { accountId } });
const cookies = decryptCookies(session.cookiesEncrypted, process.env.COOKIE_ENCRYPTION_KEY);
await context.addCookies(cookies);
```

#### LinkedIn Reshare Selectors (2025)
**CRITICAL**: These selectors WILL change. Implement multiple fallbacks and screenshot debugging.

```typescript
// Reshare button selectors (try in order)
const RESHARE_SELECTORS = [
  'button[aria-label*="Repost"]',
  'button[data-test-id="share-action"]',
  'button:has-text("Repost")',
  '.share-actions__primary-action button',
  'button.share-action-button',
];

// Reshare with thoughts option
const RESHARE_WITH_THOUGHTS_SELECTORS = [
  'button:has-text("Repost with your thoughts")',
  'div[data-test-id="repost-with-thoughts"]',
  'span:has-text("with your thoughts")',
];

// Commentary textarea
const COMMENTARY_SELECTORS = [
  'div[data-placeholder*="Add your thoughts"]',
  'div[role="textbox"][contenteditable="true"]',
  'div.ql-editor[contenteditable="true"]',
];

// Post button
const POST_BUTTON_SELECTORS = [
  'button:has-text("Post")',
  'button[data-test-id="share-button"]',
  'button.share-actions__primary-action',
];
```

#### Human Behavior Simulation

**Bezier Curve Mouse Movement** (using OxyMouse or Ghost Cursor):
```typescript
import { installMouseHelper } from 'ghost-cursor';

const page = await context.newPage();
const cursor = await installMouseHelper(page);

// Move mouse naturally to target
await cursor.moveTo({ x: targetX, y: targetY }, {
  waitForClick: 500,   // Random delay before click (250-750ms)
  moveSpeed: 1.2,      // Slow enough to look human
  overshootThreshold: 5, // Slight overshoot before final position
});

await cursor.click();
```

**Variable Typing Speed** (50-150ms per keystroke):
```typescript
async function humanTypeText(page: Page, selector: string, text: string) {
  const element = await page.locator(selector);
  await element.click(); // Focus the input
  
  for (const char of text) {
    // Random delay between 50-150ms per character
    const delay = Math.random() * 100 + 50;
    await element.type(char, { delay });
    
    // 5% chance of typo + backspace
    if (Math.random() < 0.05) {
      const randomChar = String.fromCharCode(97 + Math.floor(Math.random() * 26));
      await element.type(randomChar, { delay: 50 });
      await page.keyboard.press('Backspace');
      await new Promise(r => setTimeout(r, 100)); // Pause after correction
    }
  }
}
```

**Reading Time Simulation**:
```typescript
// Simulate reading post before resharing (proportional to post length)
const postText = await page.locator('.feed-shared-update-v2__description').textContent();
const wordCount = postText.split(' ').length;
const readingTime = Math.max(3000, wordCount * 200); // 200ms per word, min 3 seconds

await new Promise(r => setTimeout(r, readingTime));
```

**Scroll Simulation**:
```typescript
// Scroll to post naturally before interacting
async function scrollToPost(page: Page, postUrl: string) {
  await page.goto('https://www.linkedin.com/feed', { waitUntil: 'networkidle' });
  
  // Scroll down in small increments
  for (let i = 0; i < 5; i++) {
    await page.mouse.wheel(0, 300 + Math.random() * 100); // Random scroll distance
    await new Promise(r => setTimeout(r, 500 + Math.random() * 500)); // Random pause
  }
  
  // Navigate to specific post
  await page.goto(postUrl, { waitUntil: 'networkidle' });
}
```

#### Reshare Automation Flow
```typescript
async function automatedReshare(
  accountId: string,
  postUrl: string,
  commentary: string
): Promise<{ success: boolean; screenshot?: string; error?: string }> {
  const startTime = Date.now();
  let page: Page;
  
  try {
    // 1. Load session
    const session = await loadLinkedInSession(accountId);
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    await context.addCookies(session.cookies);
    
    page = await context.newPage();
    const cursor = await installMouseHelper(page);
    
    // 2. Navigate to post
    await scrollToPost(page, postUrl);
    
    // 3. Find and click reshare button
    const reshareButton = await findElement(page, RESHARE_SELECTORS);
    await cursor.moveTo(reshareButton);
    await cursor.click();
    await page.waitForTimeout(1000 + Math.random() * 500);
    
    // 4. Click "Repost with your thoughts"
    const withThoughtsButton = await findElement(page, RESHARE_WITH_THOUGHTS_SELECTORS);
    await cursor.moveTo(withThoughtsButton);
    await cursor.click();
    await page.waitForTimeout(1500 + Math.random() * 500);
    
    // 5. Type commentary with human-like behavior
    const commentaryField = await findElement(page, COMMENTARY_SELECTORS);
    await humanTypeText(page, COMMENTARY_SELECTORS[0], commentary);
    await page.waitForTimeout(2000 + Math.random() * 1000); // Review before posting
    
    // 6. Click Post button
    const postButton = await findElement(page, POST_BUTTON_SELECTORS);
    await cursor.moveTo(postButton);
    await cursor.click();
    
    // 7. Verify reshare success
    await page.waitForSelector('text=Your post is live', { timeout: 10000 });
    
    await browser.close();
    
    return {
      success: true,
      executionTime: Date.now() - startTime,
    };
    
  } catch (error) {
    // Take screenshot for debugging
    const screenshot = await page.screenshot({ fullPage: true, encoding: 'base64' });
    
    await browser.close();
    
    return {
      success: false,
      error: error.message,
      screenshot, // Store in DB for admin review
    };
  }
}

// Helper to find element with multiple selector fallbacks
async function findElement(page: Page, selectors: string[]) {
  for (const selector of selectors) {
    const element = page.locator(selector);
    if (await element.count() > 0) {
      return element.first();
    }
  }
  throw new Error('Reshare button not found - LinkedIn UI may have changed');
}
```

#### Error Handling & Alerts
```typescript
// Error screenshot storage
await db.reshareHistory.update({
  where: { id: reshareJobId },
  data: {
    status: 'failed',
    errorMessage: error.message,
    screenshotBase64: screenshot, // Store for debugging
  },
});

// Slack alert for LinkedIn UI changes
if (error.message.includes('not found')) {
  await sendSlackAlert({
    channel: '#revos-critical',
    message: `🚨 LinkedIn UI changed! Reshare selectors failed. Screenshot attached.`,
    attachments: [{ image_url: `data:image/png;base64,${screenshot}` }],
  });
}

// Session expiry handling
if (error.message.includes('login required')) {
  await db.linkedinSessions.update({
    where: { accountId },
    data: { status: 'expired' },
  });
  
  await sendUserEmail({
    to: user.email,
    subject: 'LinkedIn session expired - action required',
    body: 'Please reconnect your LinkedIn account to continue automated resharing.',
  });
}
```

#### Rate Limiting for Reshare (Ultra-Conservative)
```typescript
const reshareWorker = new Worker(
  'reshare-automation',
  async (job) => {
    await automatedReshare(job.data.accountId, job.data.postUrl, job.data.commentary);
  },
  {
    connection,
    limiter: {
      max: 1,           // 1 reshare
      duration: 180000  // Every 3 minutes (20 reshares/hour max)
    }
  }
);
```

**Daily Limit Enforcement**:
```typescript
// Check account daily limit before queuing
const todayReshares = await db.reshareHistory.count({
  where: {
    accountId,
    executedAt: {
      gte: startOfDay(new Date()),
    },
    status: 'success',
  },
});

if (todayReshares >= 20) {
  throw new Error('Daily reshare limit reached (20/day)');
}
```

#### Anti-Detection Best Practices
1. **Headless Detection**: Use `--disable-blink-features=AutomationControlled`
2. **CDP Detection**: Stealth plugin removes CDP runtime
3. **WebDriver Property**: Stealth plugin deletes `navigator.webdriver`
4. **User Agent**: Use recent Chrome version UA
5. **Viewport Size**: Use common resolution (1920x1080)
6. **Timezone/Locale**: Match user's real timezone
7. **Mouse Movements**: Bezier curves with random speed variation
8. **Typing Speed**: 50-150ms variance + occasional typos
9. **Reading Time**: Proportional to post length (200ms/word)
10. **Scroll Behavior**: Natural incremental scrolling

#### Testing Strategy
**CRITICAL**: Test on burner accounts first. LinkedIn bans are PERMANENT.

1. **Phase 1**: Test with 1 burner account, 5 reshares/day for 2 weeks
2. **Phase 2**: Increase to 10 reshares/day for 2 weeks
3. **Phase 3**: Test with 3 burner accounts, 15 reshares/day for 2 weeks
4. **Phase 4**: Production rollout at 20 reshares/day max

---

## 5. shadcn/ui Component Selection

### Decision: Use shadcn/ui Dashboard Template + shadcn-chat CLI for floating widget + shadcn Admin for Superadmin UI

### Rationale
shadcn/ui provides production-ready React components with TypeScript, Tailwind CSS, and Radix UI primitives. The Dashboard Template includes pre-built layouts for metrics, tables, and analytics. shadcn-chat CLI offers customizable chat components for the AgentKit floating widget. shadcn Admin provides a complete admin interface with role-based access controls, perfect for Superadmin `/admin` routes. All components support dark mode out of the box and use Lucide icons for consistency.

### Alternatives Considered
- **Material UI**: Rejected - Heavyweight, opinionated styling, harder to customize
- **Ant Design**: Rejected - Chinese design language, not modern enough
- **Chakra UI**: Rejected - Less Tailwind integration, smaller component library
- **Custom Components**: Rejected - Too much build time for MVP

### Implementation Notes

#### Dashboard Components (Main User Interface)

**Metric Cards** (Campaign Stats):
```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, MessageSquare, Mail, TrendingUp } from 'lucide-react';

<Card>
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
    <Users className="h-4 w-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">+2,350</div>
    <p className="text-xs text-muted-foreground">+180 from last week</p>
  </CardContent>
</Card>
```

**Data Table** (Leads List):
```typescript
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>LinkedIn</TableHead>
      <TableHead>DM Status</TableHead>
      <TableHead>Email</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {leads.map((lead) => (
      <TableRow key={lead.id}>
        <TableCell className="font-medium">{lead.name}</TableCell>
        <TableCell>{lead.linkedinUrl}</TableCell>
        <TableCell>
          <Badge variant={lead.dmStatus === 'sent' ? 'success' : 'default'}>
            {lead.dmStatus}
          </Badge>
        </TableCell>
        <TableCell>{lead.email || '—'}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

**Charts** (Analytics):
```typescript
import { Chart, ChartConfig, ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis } from 'recharts';

const chartConfig = {
  leads: {
    label: 'Leads Captured',
    color: 'hsl(var(--chart-1))',
    icon: Users,
  },
} satisfies ChartConfig;

<ChartContainer config={chartConfig}>
  <LineChart data={analyticsData}>
    <XAxis dataKey="date" />
    <YAxis />
    <ChartTooltip />
    <Line type="monotone" dataKey="leads" stroke="var(--color-leads)" />
  </LineChart>
</ChartContainer>
```

#### Floating Chat Widget (AgentKit Interface)

**Installation**:
```bash
npx shadcn-chat-cli add --all
```

**Chat Component** (Bottom-right floating widget):
```typescript
import { ChatContainer, ChatMessages, ChatInput, ChatBubble } from '@/components/ui/chat';
import { Bot, User } from 'lucide-react';

export function AgentKitChat() {
  const [messages, setMessages] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating chat button */}
      <button
        className="fixed bottom-4 right-4 h-14 w-14 rounded-full bg-primary shadow-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bot className="h-6 w-6 text-white" />
      </button>

      {/* Chat widget */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 w-96 h-[600px] shadow-2xl rounded-lg overflow-hidden">
          <ChatContainer>
            <ChatMessages>
              {messages.map((msg) => (
                <ChatBubble
                  key={msg.id}
                  variant={msg.role === 'assistant' ? 'received' : 'sent'}
                  avatar={msg.role === 'assistant' ? <Bot /> : <User />}
                >
                  {msg.content}
                </ChatBubble>
              ))}
            </ChatMessages>
            <ChatInput
              placeholder="Ask me anything..."
              onSend={(text) => handleAgentKitMessage(text)}
            />
          </ChatContainer>
        </div>
      )}
    </>
  );
}
```

**Streaming Response (Server-Sent Events)**:
```typescript
// Frontend: Listen to SSE stream
async function handleAgentKitMessage(userMessage: string) {
  setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
  
  const response = await fetch('/api/agentkit/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: userMessage }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  let assistantMessage = { role: 'assistant', content: '' };
  setMessages((prev) => [...prev, assistantMessage]);
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    assistantMessage.content += chunk;
    setMessages((prev) => [...prev.slice(0, -1), { ...assistantMessage }]);
  }
}
```

#### Superadmin Interface (`/admin` routes)

**Components**:
- **Sidebar**: Navigation between Tenants, Users, Campaigns, Queues
- **Data Tables**: Tenant list, Campaign stats, Failed jobs
- **Role Management**: Superadmin, Admin, Member badges
- **BullBoard Integration**: Embedded `/admin/queues` for job monitoring

```typescript
import { Sidebar, SidebarContent, SidebarMenu, SidebarMenuItem } from '@/components/ui/sidebar';
import { Users, Briefcase, Settings, Activity } from 'lucide-react';

export function AdminLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem icon={<Users />} href="/admin/tenants">
              Tenants
            </SidebarMenuItem>
            <SidebarMenuItem icon={<Briefcase />} href="/admin/campaigns">
              Campaigns
            </SidebarMenuItem>
            <SidebarMenuItem icon={<Activity />} href="/admin/queues">
              Job Queues
            </SidebarMenuItem>
            <SidebarMenuItem icon={<Settings />} href="/admin/settings">
              Settings
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
```

#### Lucide Icons Usage

**Common Icons**:
- **Navigation**: Home, Users, Settings, LogOut, Menu
- **Actions**: Plus, Edit, Trash2, Download, Upload
- **Status**: CheckCircle, XCircle, AlertCircle, Clock
- **Data**: TrendingUp, TrendingDown, BarChart3, PieChart
- **Social**: MessageSquare, Mail, Linkedin, Send
- **AgentKit**: Bot, Sparkles, Zap, MessageCircle

**Import Pattern**:
```typescript
import { Home, Users, MessageSquare, Bot, TrendingUp } from 'lucide-react';

<Home className="h-5 w-5" />
<Users className="h-4 w-4 text-muted-foreground" />
```

#### Dark Mode Support

shadcn/ui includes built-in dark mode via `next-themes`:

```typescript
import { ThemeProvider } from '@/components/theme-provider';

export default function App({ children }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  );
}
```

Toggle button:
```typescript
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  
  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      {theme === 'dark' ? <Sun /> : <Moon />}
    </button>
  );
}
```

#### Complete Component List for RevOS

**Layout**:
- Card, CardHeader, CardTitle, CardContent
- Sidebar, SidebarContent, SidebarMenu, SidebarMenuItem
- Tabs, TabsList, TabsTrigger, TabsContent

**Data Display**:
- Table, TableHeader, TableRow, TableHead, TableCell, TableBody
- Chart, ChartContainer, ChartTooltip, ChartConfig
- Badge (status indicators)
- Avatar (user profiles)

**Forms** (Campaign Creation):
- Input, Label, Textarea
- Select, SelectTrigger, SelectContent, SelectItem
- Button, ButtonGroup
- Form, FormField, FormItem, FormLabel, FormControl

**Feedback**:
- Toast (notifications)
- Alert, AlertTitle, AlertDescription
- Dialog, DialogTrigger, DialogContent, DialogHeader
- Sheet (side panels)

**Chat** (via shadcn-chat):
- ChatContainer, ChatMessages, ChatBubble, ChatInput

**Note**: shadcn-chat maintainer is no longer actively maintaining the library, but it's stable for MVP. Consider migrating to Vercel AI SDK's chat components post-launch if issues arise.

---

## 6. AgentKit Integration Patterns

### Decision: Custom Tool Wrapper with Tenant Context Injection, Cartridge-Based Progressive Disclosure, Server-Sent Events for Streaming

### Rationale
OpenAI AgentKit (Agents SDK) requires custom tool wrapping to enforce multi-tenant isolation since it lacks built-in multi-tenancy. Every tool call must inject `tenantId` and verify permissions before execution. Cartridge-based progressive disclosure reduces context size by only loading relevant cartridges (System, User, Skills) based on the user's request. SSE (Server-Sent Events) provides real-time streaming responses, critical for conversational UX. This pattern ensures security, performance, and scalability across 100+ tenants.

### Alternatives Considered
- **LangChain**: Rejected - Overly complex, Python-first, heavy abstractions
- **AutoGen**: Rejected - Requires multi-agent orchestration, overkill for single-agent use case
- **Custom GPT-4 Integration**: Rejected - Too much boilerplate, reinventing the wheel

### Implementation Notes

#### Tool Wrapping for Tenant Isolation

**Base Tool Wrapper**:
```typescript
import { Tool } from '@openai/agents-sdk';

// Wrapper that injects tenant context and verifies permissions
export function createTenantAwareTool<T extends (...args: any[]) => any>(
  toolName: string,
  toolDescription: string,
  toolFunction: T,
  requiredRole: 'superadmin' | 'admin' | 'member' = 'member'
): Tool {
  return {
    name: toolName,
    description: toolDescription,
    parameters: toolFunction.parameters, // JSON Schema for params
    
    async execute(params: any, context: { tenantId: string; userId: string; role: string }) {
      // 1. Verify tenant isolation
      if (!context.tenantId) {
        throw new Error('Tenant context missing - security violation');
      }
      
      // 2. Check role-based permissions
      if (requiredRole === 'superadmin' && context.role !== 'superadmin') {
        throw new Error('Unauthorized: Superadmin access required');
      }
      
      if (requiredRole === 'admin' && !['admin', 'superadmin'].includes(context.role)) {
        throw new Error('Unauthorized: Admin access required');
      }
      
      // 3. Inject tenant context into all params
      const tenantScopedParams = {
        ...params,
        tenantId: context.tenantId,
        userId: context.userId,
      };
      
      // 4. Execute tool with tenant context
      return await toolFunction(tenantScopedParams);
    },
  };
}
```

**Example Tool Implementation**:
```typescript
// LinkedIn Campaign Tool
const createCampaignTool = createTenantAwareTool(
  'create_linkedin_campaign',
  'Creates a new LinkedIn lead magnet campaign',
  async (params: {
    name: string;
    postUrl: string;
    triggerWord: string;
    leadMagnetName: string;
    webhookUrl: string;
    tenantId: string; // Injected by wrapper
    userId: string;   // Injected by wrapper
  }) => {
    // Validate LinkedIn post URL
    if (!params.postUrl.includes('linkedin.com')) {
      throw new Error('Invalid LinkedIn post URL');
    }
    
    // Create campaign with tenant isolation
    const campaign = await db.campaigns.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        name: params.name,
        linkedinPostUrl: params.postUrl,
        triggerWord: params.triggerWord.toLowerCase(),
        leadMagnetName: params.leadMagnetName,
        webhookUrl: params.webhookUrl,
        status: 'draft',
      },
    });
    
    return {
      success: true,
      campaignId: campaign.id,
      message: `Campaign "${params.name}" created successfully. Run /start-scraping to begin.`,
    };
  },
  'member' // Minimum role required
);
```

#### Cartridge System for Progressive Disclosure

**Cartridge Types**:
1. **System Cartridge**: RevOS core instructions (always loaded)
2. **User Cartridge**: User's voice, business context, goals (always loaded)
3. **Skills Cartridge**: Task-specific capabilities (loaded on-demand)
4. **Preferences Cartridge**: User settings, style preferences (loaded on-demand)

**Lazy Loading Strategy**:
```typescript
interface Cartridge {
  id: string;
  type: 'system' | 'user' | 'skill' | 'preferences';
  name: string;
  content: string; // Markdown text
  loadTriggers: string[]; // Keywords that trigger loading
  priority: number; // Loading order
}

// Determine which cartridges to load based on user request
function selectCartridges(
  userMessage: string,
  allCartridges: Cartridge[]
): Cartridge[] {
  const selectedCartridges: Cartridge[] = [];
  
  // ALWAYS load System + User cartridges
  selectedCartridges.push(
    ...allCartridges.filter((c) => c.type === 'system' || c.type === 'user')
  );
  
  // Load Skills cartridges if keywords match
  const skillCartridges = allCartridges.filter((c) => c.type === 'skill');
  for (const skill of skillCartridges) {
    if (skill.loadTriggers.some((trigger) => userMessage.toLowerCase().includes(trigger))) {
      selectedCartridges.push(skill);
    }
  }
  
  // Load Preferences if user is giving feedback
  if (userMessage.match(/too|don't like|prefer|not|wrong/i)) {
    const preferencesCartridge = allCartridges.find((c) => c.type === 'preferences');
    if (preferencesCartridge) selectedCartridges.push(preferencesCartridge);
  }
  
  // Sort by priority (System = 1, User = 2, Skills = 3+, Preferences = 99)
  return selectedCartridges.sort((a, b) => a.priority - b.priority);
}

// Example Skill Cartridge with Load Triggers
const linkedinSkillCartridge = {
  id: 'skill_linkedin',
  type: 'skill',
  name: 'LinkedIn Automation',
  loadTriggers: ['linkedin', 'post', 'campaign', 'lead', 'dm', 'scrape', 'reshare'],
  priority: 10,
  content: `
# LinkedIn Automation Skill

You have access to the following LinkedIn tools:
- create_linkedin_campaign: Create a new lead magnet campaign
- start_comment_scraping: Scrape commenters from a LinkedIn post
- pause_dm_automation: Pause DM sending for a campaign
- get_campaign_stats: Retrieve campaign analytics

When creating campaigns, always validate the LinkedIn post URL format first.
Trigger words are case-insensitive and configurable per campaign.
  `,
};
```

**Build AgentKit Context**:
```typescript
import { Agent } from '@openai/agents-sdk';
import { Memory } from 'mem0';

async function buildAgentContext(
  userMessage: string,
  tenantId: string,
  userId: string
): Promise<string> {
  // 1. Select relevant cartridges
  const cartridges = await db.cartridges.findMany({
    where: { tenantId, active: true },
  });
  const selectedCartridges = selectCartridges(userMessage, cartridges);
  
  // 2. Retrieve relevant memories from Mem0
  const memory = Memory.from_config(mem0Config);
  const memories = await memory.search({
    query: userMessage,
    user_id: `${tenantId}::${userId}`,
    limit: 5,
  });
  
  // 3. Build combined context
  const systemPrompt = `
# RevOS AI Assistant

${selectedCartridges.map((c) => c.content).join('\n\n---\n\n')}

## Relevant Memories
${memories.map((m) => `- ${m.content}`).join('\n')}

## Current Date/Time
${new Date().toISOString()}

## Instructions
- Always use tenant-aware tools with proper context
- Provide concise, actionable responses
- Ask clarifying questions if needed
- Update memories when user provides feedback
  `;
  
  return systemPrompt;
}
```

#### Streaming via Server-Sent Events (SSE)

**Backend SSE Endpoint**:
```typescript
import { Agent } from '@openai/agents-sdk';

app.post('/api/agentkit/chat', async (req, res) => {
  const { message } = req.body;
  const { tenantId, userId, role } = req.user; // From auth middleware
  
  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  try {
    // Build agent context with cartridges + memories
    const systemPrompt = await buildAgentContext(message, tenantId, userId);
    
    // Initialize agent with tools
    const agent = new Agent({
      model: 'gpt-4',
      tools: [
        createCampaignTool,
        startScrapingTool,
        pauseDMTool,
        getCampaignStatsTool,
        createLinkedInPostTool,
      ],
      systemPrompt,
    });
    
    // Stream response
    const stream = await agent.run({
      messages: [{ role: 'user', content: message }],
      context: { tenantId, userId, role }, // Passed to tool wrappers
    });
    
    for await (const chunk of stream) {
      if (chunk.type === 'text') {
        res.write(`data: ${chunk.content}\n\n`);
      }
      
      if (chunk.type === 'tool_call') {
        res.write(`data: [TOOL: ${chunk.tool_name}]\n\n`);
      }
    }
    
    res.write('data: [DONE]\n\n');
    res.end();
    
    // Store conversation in Mem0
    await memory.add({
      messages: [
        { role: 'user', content: message },
        { role: 'assistant', content: stream.finalResponse },
      ],
      user_id: `${tenantId}::${userId}`,
    });
    
  } catch (error) {
    res.write(`data: [ERROR: ${error.message}]\n\n`);
    res.end();
  }
});
```

**Frontend SSE Consumer** (already shown in Section 5):
```typescript
const response = await fetch('/api/agentkit/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: userMessage }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  // Update UI with streaming text
}
```

#### Security Patterns

**1. Input Validation in Tool Wrappers**:
```typescript
// Validate LinkedIn URLs
if (!params.postUrl.match(/^https:\/\/(www\.)?linkedin\.com\/posts\//)) {
  throw new Error('Invalid LinkedIn post URL format');
}

// Sanitize webhook URLs
if (!params.webhookUrl.match(/^https:\/\//)) {
  throw new Error('Webhook URL must use HTTPS');
}
```

**2. Rate Limiting AgentKit Requests**:
```typescript
import rateLimit from 'express-rate-limit';

const agentKitLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // Max 20 requests per minute per tenant
  keyGenerator: (req) => req.user.tenantId,
  message: 'Too many AgentKit requests. Please slow down.',
});

app.post('/api/agentkit/chat', agentKitLimiter, async (req, res) => {
  // ... SSE endpoint logic
});
```

**3. Audit Logging**:
```typescript
await db.agentKitAuditLog.create({
  data: {
    tenantId,
    userId,
    userMessage: message,
    assistantResponse: stream.finalResponse,
    toolsCalled: stream.toolsUsed.map((t) => t.name),
    timestamp: new Date(),
  },
});
```

**4. Tool Permission Matrix**:
```typescript
const TOOL_PERMISSIONS = {
  create_linkedin_campaign: ['member', 'admin', 'superadmin'],
  delete_campaign: ['admin', 'superadmin'],
  view_all_tenants: ['superadmin'],
  edit_system_cartridge: ['superadmin'],
};

// Enforce in tool wrapper
if (!TOOL_PERMISSIONS[toolName].includes(context.role)) {
  throw new Error(`Unauthorized: ${toolName} requires ${TOOL_PERMISSIONS[toolName][0]} role`);
}
```

#### Best Practices Summary

1. **Tenant Isolation**: ALWAYS inject `tenantId` in tool wrappers, NEVER trust client-provided tenant IDs
2. **Progressive Disclosure**: Load only relevant cartridges based on user intent (saves tokens + latency)
3. **Memory Hygiene**: Store every AgentKit conversation in Mem0 for future context retrieval
4. **Streaming First**: Use SSE for real-time feedback, critical for conversational UX
5. **Error Handling**: Gracefully handle tool failures with user-friendly error messages
6. **Audit Everything**: Log all tool calls, especially destructive actions (delete, pause, etc.)

---

## Summary of Key Decisions

### Technology Stack Confirmed
- **LinkedIn Integration**: Unipile API (DM automation, comment scraping, voice analysis)
- **Memory Layer**: Mem0 with Supabase pgvector (1536 dimensions, HNSW indexing)
- **Job Queue**: BullMQ with Upstash Redis (Fixed Plan to avoid PAYG costs)
- **Reshare Automation**: Playwright with stealth plugins (HIGHEST RISK - test on burners first)
- **UI Components**: shadcn/ui Dashboard + shadcn-chat + shadcn Admin
- **AI Orchestration**: OpenAI AgentKit with custom tool wrappers for tenant isolation

### Critical Implementation Patterns
1. **Rate Limiting**: 50 DMs/day (ramp from 15), 20 reshares/day, 10 jobs/min via BullMQ
2. **Multi-Tenancy**: Composite keys `tenantId::userId` in Mem0, RLS in Supabase, tool wrapper injection
3. **Human Behavior**: Bezier mouse movements, 50-150ms typing, reading time simulation, occasional typos
4. **Error Handling**: Exponential backoff (2min, 4min, 8min), dead letter queue, screenshot debugging
5. **Progressive Disclosure**: Lazy-load cartridges based on user intent (System + User always loaded)

### Risk Mitigation Strategies
- **LinkedIn Bans**: Ultra-conservative limits, stealth plugins, test on burner accounts
- **Upstash Costs**: Use Fixed Plan (not PAYG) to avoid BullMQ polling charges
- **Selector Changes**: Multiple fallback selectors, screenshot debugging, Slack alerts
- **Tenant Isolation**: Tool wrappers enforce `tenantId` injection on EVERY query

### Outstanding Questions Resolved
✅ Unipile rate limits and webhook formats documented  
✅ Mem0 setup with Supabase pgvector configuration finalized  
✅ BullMQ production patterns with Upstash Redis pricing model clarified  
✅ Playwright stealth techniques and human behavior simulation patterns identified  
✅ shadcn/ui component selection for dashboard, chat, and admin interfaces completed  
✅ AgentKit tool wrapping and tenant isolation patterns established  

**Status**: All research complete. Ready for `/plan` execution.

---

**Next Steps**:
1. Run `/plan` to generate implementation tasks
2. Set up development environment (Supabase, Upstash, Unipile API keys)
3. Implement core infrastructure (multi-tenant DB, BullMQ queues, Mem0 config)
4. Build V1 Core features (Days 1-4)
5. Build V1.5 Reshare automation (Days 5-6) AFTER V1 Core validation
