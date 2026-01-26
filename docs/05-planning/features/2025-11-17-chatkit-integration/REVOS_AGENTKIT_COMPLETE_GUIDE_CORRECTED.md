# RevOS + AgentKit Integration: Complete Technical Guide

**Version:** 4.0 - CORRECTED  
**Date:** November 17, 2025  
**Author:** Claude (Anthropic) + Perplexity Research  
**Purpose:** Technical reference for Cece and the development team

---

## EXECUTIVE SUMMARY

### What This Document Covers

This is the complete technical specification for integrating OpenAI's AgentKit into RevOS. After extensive research and correction, here's the accurate implementation path.

### The Corrected Architecture

**What Perplexity Confirmed:**
1. ✅ ChatKit is the ONLY official way to embed AgentKit workflows in SaaS products
2. ✅ Agent Builder canvas CANNOT be embedded (OpenAI-hosted only)
3. ✅ Agents SDK is for backend automation with tools like Playwright
4. ✅ You need BOTH: ChatKit for UI + Agents SDK for automation

**The Complete System:**
```
┌─────────────────────────────────────────────────────────┐
│           USER-FACING CHAT INTERFACE                    │
│                                                         │
│  ChatKit Component (embedded in FloatingChatBar)        │
│  - Connects to Agent Builder workflows by workflowId   │
│  - Handles streaming, chat UI, conversation state      │
│  - This is NON-NEGOTIABLE for AgentKit workflows       │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│        AGENT BUILDER (OpenAI-Hosted Only)               │
│                                                         │
│  Visual workflow canvas at platform.openai.com          │
│  - Design workflows with drag-and-drop                  │
│  - Topic generation workflow (wf_abc123)                │
│  - Content generation workflow (wf_def456)              │
│  - Published workflows run via ChatKit                  │
│  - CANNOT be embedded in your app                       │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│         BACKEND AUTOMATION (Agents SDK)                 │
│                                                         │
│  Agents SDK + Playwright Integration                    │
│  - Pod reposting automation (browser use)               │
│  - DM scraping workflows                                │
│  - LinkedIn engagement automation                       │
│  - Background workers + BullMQ                          │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│              EXTERNAL SERVICES                          │
│  - Unipile (LinkedIn API)                               │
│  - OpenAI (GPT-4o, Agents SDK)                          │
│  - Supabase (Database)                                  │
│  - Redis/Upstash (Queue)                                │
└─────────────────────────────────────────────────────────┘
```

---

## PART 1: UNDERSTANDING AGENTKIT

### What AgentKit Actually Is

AgentKit is OpenAI's platform for building AI agents, consisting of 4 components:

**1. Agent Builder (Visual Canvas)**
- Hosted at platform.openai.com/agent-builder
- Drag-and-drop workflow design
- Cannot be embedded or self-hosted
- Outputs workflows by workflowId
- Think of it like Figma - you design there, use elsewhere

**2. ChatKit (Embeddable UI)**
- React component for embedding chat interfaces
- THE ONLY way to run Agent Builder workflows in your app
- Handles streaming, UI, session management
- References workflows by workflowId
- This is what you embed in RevOS

**3. Agents SDK (Backend Framework)**
- Programmatic API for building agents
- Python/TypeScript/Go support
- For backend automation, not user-facing chat
- Supports tools like Playwright for browser automation
- This is for pod automation

**4. Evals (Performance Testing)**
- Not relevant for RevOS currently
- Used for testing/optimizing agents

### What You Can and Cannot Do

**✅ YOU CAN:**
- Create workflows in Agent Builder
- Embed ChatKit in your app (references workflows)
- Use Agents SDK for backend automation
- Export workflow code for custom runners
- Customize ChatKit styling

**❌ YOU CANNOT:**
- Embed Agent Builder canvas in your app
- Self-host Agent Builder
- Send arbitrary workflow JSON to execute
- Use Agents SDK for user-facing chat (use ChatKit instead)
- Run workflows without ChatKit or exported code

---

## PART 2: REVOS CURRENT STATE ANALYSIS

### What You've Already Built

After analyzing the codebase at `/Users/rodericandrews/Obsidian/Master/_projects/bravo-revos`:

**✅ Working Components:**
1. Database-driven workflow system
   - `console_workflows` table
   - `workflow-loader.ts` - loads workflows from DB
   - `workflow-executor.ts` - executes workflow steps

2. Content generation pipeline
   - `marketing-console.ts` - uses OpenAI Chat Completions
   - Cartridge integration (brand, style, voice)
   - Topic generation + post generation

3. Pod automation infrastructure
   - BullMQ queues (`pod-queue.ts`)
   - Workers (`pod-automation-worker.ts`)
   - Database tables (`pod_activities`, `pod_members`)

4. LinkedIn integration
   - Unipile client
   - Post publishing
   - DM monitoring (polling)

5. UI Components
   - FloatingChatBar with multiple states
   - Working document view
   - Glassmorphic design system

**❌ What's Not Working:**
1. Frontend parsing error (field name mismatch)
2. Fullscreen document mode not triggering
3. AgentKit not actually being used (using OpenAI Chat Completions directly)
4. Pod automation not using Playwright/browser automation yet

**📊 Current vs. Target:**

| Component | Current State | Target State |
|-----------|---------------|--------------|
| Content Gen UI | Custom chat component | ChatKit embedded |
| Workflow Design | Database JSON | Agent Builder |
| Workflow Execution | OpenAI Chat Completions | Agent Builder via ChatKit |
| Pod Automation | BullMQ workers (incomplete) | Agents SDK + Playwright |
| DM Scraping | Polling only | Agents SDK + Browser Use |

---

## PART 3: THE IMPLEMENTATION PATH

### Phase 1: ChatKit Integration (6 hours)

**Goal:** Replace current content generation workflow with ChatKit

**Why This is Necessary:**
- Agent Builder workflows can ONLY run via ChatKit (for UI) or code export
- No API exists to POST workflow JSON and execute
- ChatKit provides better UX (streaming, auto-UI, session management)
- This is the official OpenAI integration path for SaaS products

**What You're Building:**

```typescript
// Old approach (what you have now):
User types "write" 
  → Backend calls workflow-executor.ts
  → Uses OpenAI Chat Completions directly
  → Returns { document: { content, title } }
  → Frontend parses response
  → Shows in working document

// New approach (ChatKit):
User types "write"
  → Frontend loads ChatKit with workflowId
  → ChatKit connects to Agent Builder workflow
  → Agent Builder executes (OpenAI-hosted)
  → ChatKit streams response
  → Frontend listens to events
  → Triggers fullscreen document view
```

**Steps:**
1. Create workflows in Agent Builder (manual)
2. Configure domain allowlist (manual)
3. Create ChatKit session endpoint (backend)
4. Create workflow finder API (backend)
5. Create ChatKitWrapper component (React)
6. Integrate into FloatingChatBar (React)
7. Add fullscreen document view (React)
8. Database migration (add agentkit_workflow_id)
9. Testing

**Files to Create/Modify:**
- `app/api/chatkit/session/route.ts` (NEW)
- `app/api/chatkit/workflow/route.ts` (NEW)
- `components/chat/ChatKitWrapper.tsx` (NEW)
- `components/chat/FloatingChatBar.tsx` (MODIFY)
- `supabase/migrations/xxx_add_agentkit_workflow_ids.sql` (NEW)
- `.env.local` (ADD WORKFLOW_IDs)

**Result:**
- User types "write" → ChatKit loads → Agent Builder workflow executes → Document appears

---

### Phase 2: Pod Automation with Agents SDK (8 hours)

**Goal:** Use Agents SDK + Playwright for LinkedIn pod reposting

**Why Agents SDK Here:**
- Pod reposting requires browser automation (Playwright)
- Agents SDK has ComputerTool for browser use
- This is a backend workflow, not user-facing UI
- No ChatKit needed for this - it's background automation

**What You're Building:**

```typescript
// Pod repost workflow:
BullMQ job triggers
  → Agents SDK agent starts
  → Playwright browser launches
  → Agent navigates to LinkedIn
  → Agent finds post
  → Agent clicks repost button
  → Agent adds optional comment
  → Agent confirms action
  → Database updated with result
```

**Steps:**
1. Create PlaywrightComputer class (implements AsyncComputer)
2. Create pod repost agent definition
3. Integrate with BullMQ workers
4. Test with real LinkedIn account
5. Add error handling and retries
6. Monitor and optimize

**Files to Create/Modify:**
- `lib/agents/playwright-computer.ts` (NEW)
- `lib/agents/pod-repost-agent.ts` (NEW)
- `workers/pod-automation-worker.ts` (MODIFY)
- `lib/queue/pod-automation-queue.ts` (MODIFY)

**Result:**
- Pod member activities execute automatically via browser automation

---

### Phase 3: DM Scraping (4 hours)

**Goal:** Use Agents SDK for intelligent DM parsing

**Why Agents SDK Here:**
- DM scraping benefits from AI understanding context
- Can use tools to extract emails, detect keywords
- Background workflow, not user-facing

**What You're Building:**

```typescript
// DM scraping workflow:
Polling detects new DM
  → Agents SDK agent analyzes content
  → AI extracts email address
  → AI detects trigger keywords
  → Agent calls Unipile to send followup
  → Lead added to database
```

**Steps:**
1. Create DM analyzer agent
2. Add email extraction tool
3. Add keyword detection
4. Integrate with existing polling
5. Connect to lead database

**Result:**
- Intelligent DM processing with AI understanding

---

## PART 4: DETAILED TECHNICAL SPECIFICATIONS

### ChatKit Integration Details

#### Session Management

```typescript
// app/api/chatkit/session/route.ts
export async function POST(req: Request) {
  // 1. Authenticate user via Supabase
  const { user } = await supabase.auth.getUser();
  
  // 2. Create ChatKit session with OpenAI
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const session = await openai.chatkit.sessions.create({
    user_id: user.id,
    metadata: {
      email: user.email,
      client_id: user.user_metadata.client_id,
      agency_id: user.user_metadata.agency_id,
    }
  });
  
  // 3. Return client_secret
  return NextResponse.json({
    client_secret: session.client_secret
  });
}
```

**Security Notes:**
- Never expose OPENAI_API_KEY to frontend
- Session creation must be authenticated
- Client secrets are single-use tokens
- User metadata passed for context

#### Workflow Discovery

```typescript
// app/api/chatkit/workflow/route.ts
export async function POST(req: Request) {
  const { trigger } = await req.json();
  
  // Map triggers to workflow IDs
  // (these come from Agent Builder after publishing)
  const workflowMap = {
    'write': process.env.TOPIC_GENERATION_WORKFLOW_ID,
    'post': process.env.TOPIC_GENERATION_WORKFLOW_ID,
  };
  
  const workflowId = workflowMap[trigger.toLowerCase()];
  
  return NextResponse.json({ workflowId });
}
```

**Alternative Approach:**
Store workflow IDs in database with triggers:
```sql
ALTER TABLE console_workflows 
ADD COLUMN agentkit_workflow_id TEXT;

-- Then query:
SELECT agentkit_workflow_id 
FROM console_workflows 
WHERE 'write' = ANY(triggers) 
AND is_active = true;
```

#### ChatKit Component

```typescript
// components/chat/ChatKitWrapper.tsx
import { ChatKit, useChatKit } from '@openai/chatkit-react';

export function ChatKitWrapper({ workflowId, onDocumentReady }) {
  const { control } = useChatKit({
    api: {
      async getClientSecret(existing) {
        if (existing) return existing;
        
        const res = await fetch('/api/chatkit/session', {
          method: 'POST'
        });
        const { client_secret } = await res.json();
        return client_secret;
      }
    },
    workflowId,
  });

  // Listen to events
  useEffect(() => {
    if (!control) return;

    const handleMessage = (event) => {
      const data = event.detail;
      
      // Check if document is ready
      if (data.document || data.type === 'document') {
        onDocumentReady({
          content: data.document?.content || data.content,
          title: data.document?.title || 'Generated Content'
        });
      }
    };

    control.addEventListener('message', handleMessage);
    return () => control.removeEventListener('message', handleMessage);
  }, [control, onDocumentReady]);

  return <ChatKit control={control} className="h-full w-full" />;
}
```

#### Integration with FloatingChatBar

```typescript
// components/chat/FloatingChatBar.tsx
export function FloatingChatBar() {
  const [chatState, setChatState] = useState<'floating' | 'fullscreen'>('floating');
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [document, setDocument] = useState(null);

  const loadWorkflow = async (message: string) => {
    const firstWord = message.split(' ')[0].toLowerCase();
    
    const res = await fetch('/api/chatkit/workflow', {
      method: 'POST',
      body: JSON.stringify({ trigger: firstWord })
    });
    
    const { workflowId } = await res.json();
    setWorkflowId(workflowId);
  };

  return (
    <div className={chatState === 'fullscreen' ? 'fixed inset-0' : 'fixed bottom-4 right-4'}>
      {chatState === 'fullscreen' && document ? (
        <div className="grid grid-cols-[400px_1fr]">
          {/* Left: ChatKit sidebar */}
          <ChatKitWrapper 
            workflowId={workflowId} 
            onDocumentReady={setDocument}
          />
          
          {/* Right: Working document */}
          <WorkingDocument content={document.content} />
        </div>
      ) : (
        <ChatKitWrapper 
          workflowId={workflowId}
          onDocumentReady={(doc) => {
            setDocument(doc);
            setChatState('fullscreen');
          }}
        />
      )}
    </div>
  );
}
```

---

### Agents SDK Integration Details

#### Playwright Computer Implementation

```typescript
// lib/agents/playwright-computer.ts
import { AsyncComputer } from '@openai/agents';
import { chromium, Browser, Page } from 'playwright';

export class PlaywrightComputer implements AsyncComputer {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async start() {
    this.browser = await chromium.launch({
      headless: false,  // Show browser for debugging
      args: ['--disable-blink-features=AutomationControlled']
    });
    
    const context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...'
    });
    
    this.page = await context.newPage();
  }

  async close() {
    if (this.page) await this.page.close();
    if (this.browser) await this.browser.close();
  }

  async execute(action: string, ...args: any[]) {
    if (!this.page) throw new Error('Browser not started');

    switch (action) {
      case 'navigate':
        await this.page.goto(args[0], { waitUntil: 'networkidle' });
        return { success: true, url: this.page.url() };

      case 'click':
        await this.page.click(args[0]);
        await this.page.waitForTimeout(1000);
        return { success: true };

      case 'type':
        await this.page.fill(args[0], args[1]);
        return { success: true };

      case 'screenshot':
        const screenshot = await this.page.screenshot();
        return { image: screenshot.toString('base64') };

      case 'waitForSelector':
        await this.page.waitForSelector(args[0], { timeout: 10000 });
        return { success: true };

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  // Implement other AsyncComputer interface methods
  async getState() {
    return {
      url: this.page?.url(),
      title: await this.page?.title(),
    };
  }
}
```

#### Pod Repost Agent

```typescript
// lib/agents/pod-repost-agent.ts
import { Agent, Runner, ComputerTool } from '@openai/agents';
import { PlaywrightComputer } from './playwright-computer';

export async function executePodRepost(params: {
  postUrl: string;
  memberEmail: string;
  memberPassword: string;
  addComment?: boolean;
  commentText?: string;
}) {
  const computer = new PlaywrightComputer();
  await computer.start();

  const agent = new Agent({
    name: 'LinkedIn Repost Agent',
    instructions: `You are a LinkedIn automation agent.

Your task: Repost a LinkedIn post and optionally add a comment.

Steps:
1. Navigate to LinkedIn
2. Log in with credentials (if not already logged in)
3. Navigate to ${params.postUrl}
4. Find and click the "Repost" button
5. ${params.addComment ? `Add comment: "${params.commentText}"` : 'Skip commenting'}
6. Confirm the repost
7. Capture the repost URL
8. Return success status

Important:
- Wait for elements to load before clicking
- Handle popups and overlays gracefully
- If login fails, report the error clearly
- If repost button not found, try alternative selectors
- Verify action completed before returning

LinkedIn Selectors (update if needed):
- Repost button: [aria-label="Repost"]
- Comment field: .ql-editor
- Post button: [data-test-modal-submit]`,
    tools: [new ComputerTool(computer)],
    model: 'gpt-4o',
  });

  try {
    const result = await Runner.run(agent, 
      `Repost this LinkedIn post: ${params.postUrl}`
    );

    return {
      success: true,
      repostUrl: result.final_output,
      executed_at: new Date().toISOString(),
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      executed_at: new Date().toISOString(),
    };
  } finally {
    await computer.close();
  }
}
```

#### Worker Integration

```typescript
// workers/pod-automation-worker.ts (UPDATED)
import { Job } from 'bullmq';
import { executePodRepost } from '@/lib/agents/pod-repost-agent';
import { createClient } from '@/lib/supabase/server';

async function processPodActivity(job: Job) {
  const { activityId, postUrl, memberId } = job.data;
  
  console.log('[POD_WORKER] Processing activity:', activityId);

  // Get member credentials
  const supabase = createClient();
  const { data: member } = await supabase
    .from('pod_members')
    .select('linkedin_email, linkedin_password')
    .eq('id', memberId)
    .single();

  if (!member) {
    throw new Error('Member not found');
  }

  // Execute repost via Agents SDK + Playwright
  const result = await executePodRepost({
    postUrl,
    memberEmail: member.linkedin_email,
    memberPassword: member.linkedin_password,
    addComment: Math.random() > 0.7,  // 30% chance
    commentText: 'Great insights! 👏',
  });

  // Update database
  await supabase
    .from('pod_activities')
    .update({
      status: result.success ? 'success' : 'failed',
      executed_at: result.executed_at,
      repost_url: result.repostUrl,
      error_message: result.error,
    })
    .eq('id', activityId);

  return result;
}

// BullMQ worker processor
const worker = new Worker('pod-automation', processPodActivity, {
  connection: redis,
  concurrency: 2,  // Process 2 reposts simultaneously
});
```

---

## PART 5: DATABASE SCHEMA UPDATES

### Required Migrations

```sql
-- Migration 1: Add AgentKit workflow IDs
ALTER TABLE console_workflows 
ADD COLUMN IF NOT EXISTS agentkit_workflow_id TEXT;

CREATE INDEX IF NOT EXISTS idx_console_workflows_agentkit_id 
ON console_workflows(agentkit_workflow_id);

COMMENT ON COLUMN console_workflows.agentkit_workflow_id IS 
'Agent Builder workflow ID from OpenAI platform. References published workflows.';

-- Migration 2: Add browser automation fields
ALTER TABLE pod_activities
ADD COLUMN IF NOT EXISTS browser_session_id TEXT,
ADD COLUMN IF NOT EXISTS screenshot_url TEXT,
ADD COLUMN IF NOT EXISTS execution_log JSONB;

-- Migration 3: Add DM analysis fields
ALTER TABLE dm_sequences
ADD COLUMN IF NOT EXISTS ai_analysis JSONB,
ADD COLUMN IF NOT EXISTS extracted_email TEXT,
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2);
```

---

## PART 6: ENVIRONMENT VARIABLES

### Required Configuration

```bash
# .env.local

# OpenAI
OPENAI_API_KEY=sk-...

# AgentKit Workflow IDs (from Agent Builder)
TOPIC_GENERATION_WORKFLOW_ID=wf_abc123def456
POST_GENERATION_WORKFLOW_ID=wf_def456ghi789

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Redis (for BullMQ)
REDIS_URL=redis://localhost:6379
# OR Upstash: rediss://default:xxx@xxx.upstash.io:6379

# Unipile (LinkedIn API)
UNIPILE_API_KEY=...
UNIPILE_DSN=...

# Node
NODE_ENV=development
```

---

## PART 7: TESTING STRATEGY

### Phase 1 Testing (ChatKit)

**Manual Tests:**
1. User types "write" → ChatKit loads
2. Agent generates 4 topics
3. User selects topic
4. Content generates
5. Fullscreen document opens
6. Copy button works
7. Can exit fullscreen

**Automated Tests:**
```typescript
// __tests__/chatkit-integration.test.ts
describe('ChatKit Integration', () => {
  test('Session endpoint creates valid session', async () => {
    const res = await fetch('/api/chatkit/session', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer mock-token' }
    });
    
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.client_secret).toBeTruthy();
  });

  test('Workflow finder returns correct ID', async () => {
    const res = await fetch('/api/chatkit/workflow', {
      method: 'POST',
      body: JSON.stringify({ trigger: 'write' })
    });
    
    const data = await res.json();
    expect(data.workflowId).toBe(process.env.TOPIC_GENERATION_WORKFLOW_ID);
  });
});
```

### Phase 2 Testing (Pod Automation)

**Manual Tests:**
1. Create test pod with 2 members
2. Publish LinkedIn post
3. Trigger pod amplification
4. Verify BullMQ job created
5. Watch browser automation execute
6. Verify database updates
7. Check LinkedIn for repost

**Automated Tests:**
```typescript
// __tests__/pod-automation.test.ts
describe('Pod Automation', () => {
  test('Playwright computer launches browser', async () => {
    const computer = new PlaywrightComputer();
    await computer.start();
    
    const result = await computer.execute('navigate', 'https://linkedin.com');
    expect(result.success).toBe(true);
    
    await computer.close();
  });

  test('Pod repost agent executes successfully', async () => {
    const result = await executePodRepost({
      postUrl: 'https://linkedin.com/posts/test-123',
      memberEmail: 'test@example.com',
      memberPassword: 'test-password',
    });
    
    expect(result.success).toBe(true);
    expect(result.repostUrl).toBeTruthy();
  });
});
```

---

## PART 8: DEPLOYMENT CONSIDERATIONS

### Infrastructure Requirements

**Development:**
- Node.js 18+
- Redis (local or Upstash)
- Playwright browsers installed
- OpenAI API access

**Production:**
- Netlify (frontend hosting)
- Render/Railway (worker processes)
- Upstash Redis (managed)
- Supabase (database)

### Worker Deployment

```yaml
# render.yaml
services:
  - type: worker
    name: pod-automation-worker
    env: node
    buildCommand: npm install && npx playwright install chromium
    startCommand: npm run worker:pod-automation
    envVars:
      - key: REDIS_URL
        sync: false
      - key: OPENAI_API_KEY
        sync: false
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false
```

### Monitoring

**Key Metrics:**
- ChatKit session creation rate
- Workflow execution time
- Pod automation success rate
- Browser automation failures
- LinkedIn rate limits

**Logging:**
```typescript
// Structured logging for debugging
console.log('[CHATKIT]', event, data);
console.log('[POD_AUTOMATION]', jobId, status);
console.log('[PLAYWRIGHT]', action, result);
```

---

## PART 9: TIMELINE & RESOURCES

### Realistic Implementation Timeline

**Week 1: ChatKit Integration (6 hours)**
- Day 1: Agent Builder setup + backend endpoints (2 hours)
- Day 2: ChatKit component + integration (3 hours)
- Day 3: Testing + fixes (1 hour)

**Week 2: Pod Automation (8 hours)**
- Day 1: Playwright computer implementation (3 hours)
- Day 2: Pod repost agent + worker integration (3 hours)
- Day 3: Testing + error handling (2 hours)

**Week 3: Polish & Production (4 hours)**
- Day 1: Database migrations + cleanup (2 hours)
- Day 2: Deployment + monitoring (2 hours)

**Total: 18 hours (~3 weeks at 6 hours/week pace)**

### Required Resources

**Tools:**
- OpenAI API account (with billing)
- Agent Builder access
- Playwright license (free)
- Redis instance (Upstash free tier works)

**Knowledge:**
- React/TypeScript
- Next.js API routes
- Playwright basics
- BullMQ queue patterns

---

## PART 10: CRITICAL REMINDERS

### What This Changes From Current System

**Before (Current):**
- Custom workflow executor
- OpenAI Chat Completions directly
- Manual response parsing
- No visual workflow editor
- Pod automation incomplete

**After (Target):**
- Agent Builder for workflow design
- ChatKit for UI execution
- Automatic response handling
- Visual workflow editor
- Full pod automation with Playwright

### What Stays The Same

**Keep These:**
- Database-driven workflow triggers
- Cartridge integration (brand/style/voice)
- FloatingChatBar UI patterns (floating/fullscreen/sidebar)
- BullMQ queue infrastructure
- Unipile LinkedIn integration
- Supabase authentication

### Common Pitfalls to Avoid

1. **Don't try to embed Agent Builder canvas**
   - It's OpenAI-hosted only
   - No iframe/API available
   - Design workflows there, use ChatKit to run them

2. **Don't use Agents SDK for user-facing chat**
   - Use ChatKit for that
   - Agents SDK is for backend automation

3. **Don't skip domain allowlist**
   - ChatKit won't work without it
   - Add ALL domains (localhost, preview, production)

4. **Don't hardcode workflow IDs**
   - Store in environment variables
   - Or in database with migration

5. **Don't forget Playwright installation**
   - Run `npx playwright install chromium`
   - Required for browser automation

---

## PART 11: SUCCESS CRITERIA

### Phase 1: ChatKit Integration

- [ ] Workflows created in Agent Builder
- [ ] Domain allowlist configured
- [ ] Session endpoint working
- [ ] Workflow finder API functional
- [ ] ChatKitWrapper component renders
- [ ] FloatingChatBar shows ChatKit
- [ ] User can type "write" and see response
- [ ] Topics display correctly
- [ ] Selecting topic generates content
- [ ] Fullscreen document view opens
- [ ] Copy/save buttons work

### Phase 2: Pod Automation

- [ ] PlaywrightComputer class implemented
- [ ] Pod repost agent created
- [ ] Worker processes BullMQ jobs
- [ ] Browser launches and navigates
- [ ] LinkedIn login succeeds
- [ ] Post reposting works
- [ ] Database updates correctly
- [ ] Error handling works
- [ ] Rate limits respected

### Phase 3: Production Ready

- [ ] All tests passing
- [ ] TypeScript compiles with no errors
- [ ] Workers deployed to production
- [ ] Monitoring dashboards configured
- [ ] Error alerting set up
- [ ] Documentation complete

---

## CONCLUSION

### The Path Forward

**ChatKit + Agents SDK = Complete Solution**

- **ChatKit:** User-facing content generation (Agent Builder workflows)
- **Agents SDK:** Backend automation (pod reposts, DM scraping)

**Not Either/Or - You Need Both**

This is the official OpenAI integration path for SaaS products. There is no alternative for embedding Agent Builder workflows in your app except ChatKit.

### Next Steps for Cece

1. **Review this document** - Understand the architecture
2. **Review the prompts document** - See implementation steps
3. **Set up Agent Builder** - Create the workflows manually
4. **Execute the 6 prompts** - Build the integration
5. **Test thoroughly** - Verify each phase works
6. **Deploy to production** - Ship the complete system

### Estimated Timeline

- **ChatKit Integration:** 6 hours
- **Pod Automation:** 8 hours
- **Testing & Polish:** 4 hours
- **Total:** 18 hours (~3 weeks)

### Questions?

Refer back to:
- This document (architecture & reference)
- CHATKIT_IMPLEMENTATION_PROMPTS.md (step-by-step execution)
- Perplexity research (source confirmation)

**Ready to build! 🚀**

---

**Document Version:** 4.0 CORRECTED  
**Last Updated:** November 17, 2025  
**Status:** Ready for Implementation
