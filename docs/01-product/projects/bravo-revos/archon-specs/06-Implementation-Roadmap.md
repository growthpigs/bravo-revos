# Implementation Roadmap - RevOS MVP

## Overview

**Timeline**: 8 weeks  
**Approach**: Dual development (Bolt.new + Claude Code in parallel)  
**Team**: You + Claude Code  
**Validation**: Chase approval at end

## Dual Development Strategy

### Bolt.new (UI Scaffolding)

**Generates in hours/days:**
- Database schemas
- React components
- API routes
- Authentication
- Dashboards

**You handle Bolt.new sprints:**
- Week 1: Initial scaffolding
- Week 4: Analytics dashboards
- Week 6: Approval workflows

### Claude Code (AgentKit + Logic)

**I build:**
- AgentKit workflows
- MCP integrations
- Background queues
- Complex orchestration

**My sprints:**
- Week 2-3: AgentKit agents
- Week 4-5: MCPs
- Week 6-7: Background systems

---

## Week 1: Foundation (Bolt.new Sprint)

### Goals

- Supabase project setup
- Complete database schema
- Authentication flow
- Basic UI scaffolding

### Tasks

#### Monday: Supabase Setup

- [ ] Create Supabase project
- [ ] Enable PGVector extension
- [ ] Set up authentication (email/password)
- [ ] Configure RLS policies
- [ ] Create service role API key

#### Tuesday-Wednesday: Bolt.new - Database Schema

**Bolt.new Prompt:**

```
Create a complete Supabase database schema for a multi-tenant LinkedIn growth engine:

Tables needed:
- users (auth integration, role: super_admin | client)
- clients (company_name, niche, created_at)
- cartridges (persona, writing_style, industry_knowledge JSONB)
- campaigns (client_id, status, target_keywords)
- leads (campaign_id, name, email, linkedin_url, status, enrichment_data JSONB)
- messages (lead_id, type: dm | email, content, status, sent_at)
- lead_magnets (title, category, niche, file_url, performance JSONB)
- posts (client_id, content, image_url, published_at, performance JSONB)

Vector tables:
- cartridge_embeddings (cartridge_id, embedding VECTOR(1536))
- lead_magnet_embeddings (lead_magnet_id, embedding VECTOR(1536))

Tracking:
- apollo_usage (client_id, credits_used, date)
- dm_queue_stats (account_id, hour, count)

RLS policies:
- Users see only their data (user_id filter)
- Super admins bypass RLS

Generate SQL migration file.
```

**Output**: `supabase/migrations/001_initial_schema.sql`

#### Thursday: Bolt.new - Auth + Landing

**Bolt.new Prompt:**

```
Create authentication flow for Supabase:

1. Login page (/login)
   - Email/password form
   - "Forgot password" link
   - Supabase auth integration

2. Dashboard layout (/dashboard)
   - Top nav: Logo, client selector (if admin), logout
   - Side nav: Campaigns, Leads, Content, Analytics
   - Main content area

3. Protected routes
   - Redirect to /login if not authenticated
   - Load user role from Supabase

Use React + TypeScript + Tailwind.
```

**Output**: Authentication system + layout components

#### Friday: Testing + Documentation

- [ ] Test auth flow (login, logout, session)
- [ ] Verify RLS policies (client can't see other clients' data)
- [ ] Document database schema
- [ ] Push to GitHub

### Deliverables

- ✅ Supabase project configured
- ✅ Database schema deployed
- ✅ Auth system working
- ✅ Basic dashboard shell

---

## Week 2-3: AgentKit Development (Claude Code Sprint)

### Goals

- 3 core AgentKit agents built
- MCP integrations configured
- Cartridge system functional

### Week 2 Tasks

#### Monday-Tuesday: MCP Setup

- [ ] Install all 6 MCPs (see MCP Integration Guide)
- [ ] Test each MCP individually
- [ ] Create Supabase Edge Functions for:
  - `apollo-enrich` (Apollo.io proxy)
  - `mem0-retrieve` (Mem0 cartridge retrieval)
  - `canva-generate` (Canva design creation)

#### Wednesday: Campaign Manager Agent

**Agent Builder Workflow:**

```
[Start]
    ↓
[Ask User] "Which client are you working with?"
    ↓
[Call Function] search_cartridges(client_name)
    ↓
[File Search] Retrieve cartridge from Mem0
    ↓
[Ask User] "What's the LinkedIn post URL to scrape?"
    ↓
[Call Function] scrape_comments(post_url)
    ↓
[Generate Text] "Found {count} commenters. Creating campaign..."
    ↓
[Call Function] create_campaign(client_id, post_url, cartridge_id)
    ↓
[Notify User] "Campaign created! ID: {campaign_id}"
```

**Test:**

```
User: "Work on campaign for Rachel (Retirementality)"
Agent: "Loading Rachel's cartridge..."
Agent: "What LinkedIn post should I scrape?"
User: "https://linkedin.com/posts/rachel_retirement_12345"
Agent: "Scraping... Found 47 commenters. Creating campaign..."
Agent: "✅ Campaign created! ID: camp_abc123"
```

#### Thursday: Lead Enrichment Agent

**Agent Builder Workflow:**

```
[Start]
    ↓
[Call Function] get_pending_leads(campaign_id)
    ↓
[Loop] For each lead:
    [Call Function] apollo_enrich(linkedin_url)
    [Generate Text] Personalized DM based on:
      - Cartridge persona
      - Lead's comment text
      - Lead magnet offer
    [Call Function] queue_dm(lead_id, message, delay)
    ↓
[Notify User] "Enriched {count} leads. Queued {dm_count} DMs."
```

**Test:**

```
User: "Enrich leads for campaign camp_abc123"
Agent: "Found 47 leads. Enriching via Apollo..."
Agent: "Progress: 10/47..."
Agent: "Progress: 47/47 complete!"
Agent: "✅ Enriched 47 leads. Found emails for 32. Queued 32 DMs."
```

#### Friday: Content Generation Agent

**Agent Builder Workflow:**

```
[Start]
    ↓
[File Search] Retrieve cartridge
    ↓
[Search Web] Latest trends in [niche from cartridge]
    ↓
[Call Function] context7_research(topic, niche)
    ↓
[Generate Text] LinkedIn post:
  System: [Cartridge system prompt]
  Context: [Web trends + Context7 research]
  User: "Create post about {topic}"
    ↓
[Generate Image] Canva MCP:
  Title: [Post headline]
  Style: [Cartridge branding]
    ↓
[Ask User] "Approve this post?"
  [Show preview]
    ↓
If Yes:
  [Call Function] schedule_post(content, image_url, publish_at)
If No:
  [Loop] Regenerate with feedback
```

**Test:**

```
User: "Create post about overcoming imposter syndrome for executives"
Agent: "Loading cartridge... Researching trends..."
Agent: "Here's a draft post:

[Post content preview]

[Image preview]

Approve?"
User: "Yes"
Agent: "✅ Post scheduled for tomorrow 9 AM EST"
```

### Week 3 Tasks

#### Monday: Cartridge System Implementation

- [ ] Create cartridge CRUD functions
- [ ] Implement Mem0 storage
- [ ] Create Supabase backup (PGVector)
- [ ] Test retrieval in AgentKit

#### Tuesday-Wednesday: Lead Magnet Integration

- [ ] Upload 50+ lead magnets to Supabase Storage
- [ ] Generate embeddings for semantic search
- [ ] Create search function
- [ ] Test AgentKit lead magnet selection

#### Thursday: Human Approval Workflow (Slack)

- [ ] Set up Slack app
- [ ] Create approval message template
- [ ] Implement emoji reaction handlers (✅ ✏️ ❌)
- [ ] Connect to AgentKit Ask User nodes

#### Friday: End-to-End Test

**Full workflow test:**

```
1. Create campaign
2. Scrape comments
3. Enrich leads
4. Generate DMs
5. Queue messages
6. Generate post
7. Approve via Slack
8. Schedule post
```

### Deliverables (Week 2-3)

- ✅ 3 AgentKit agents functional
- ✅ 6 MCPs integrated
- ✅ Cartridge system working
- ✅ Lead magnet library searchable
- ✅ Slack approval workflow

---

## Week 4: Analytics + Background Systems

### Goals

- PostHog + Clarity integrated
- BullMQ queue system deployed
- Analytics dashboards (Bolt.new)

### Tasks

#### Monday: PostHog Setup

- [ ] Create PostHog project
- [ ] Add tracking code to frontend
- [ ] Implement server-side events:
  - `campaign_created`
  - `lead_enriched`
  - `dm_sent`
  - `email_sent`
  - `post_published`

#### Tuesday: Clarity Setup

- [ ] Create Clarity project
- [ ] Add tracking script
- [ ] Test session recordings
- [ ] Configure Clarity MCP

#### Wednesday: Bolt.new - Analytics Dashboard

**Bolt.new Prompt:**

```
Create analytics dashboard for LinkedIn growth engine:

Metrics to show:
1. Campaign Overview
   - Total campaigns
   - Active campaigns
   - Total leads (this month)
   - Avg conversion rate

2. Funnel Chart
   - Comments scraped
   - Emails found (Apollo success rate)
   - DMs sent
   - Replies received
   - Calls booked

3. Performance Table
   - Campaign name
   - Leads
   - DM sent
   - Reply rate
   - Created date

4. Cost Tracking (Super Admin only)
   - OpenAI tokens used
   - Apollo credits used
   - Total cost this month
   - Per-client breakdown

Use Recharts for visualizations.
Fetch data from Supabase.
```

**Output**: Analytics dashboard components

#### Thursday-Friday: Background Queue System

**Setup BullMQ + Redis:**

```bash
# Install dependencies
npm install bullmq ioredis

# Start Redis (Docker)
docker run -d -p 6379:6379 redis:alpine
```

**DM Queue Worker:**

```typescript
// workers/dm-queue.ts
import { Queue, Worker } from 'bullmq';
import { unipile } from '../integrations/unipile';
import { supabase } from '../lib/supabase';

const dmQueue = new Queue('dm-queue', {
  connection: { host: 'localhost', port: 6379 }
});

const worker = new Worker('dm-queue', async (job) => {
  const { lead_id, message, linkedin_account_id } = job.data;
  
  // Rate limit check
  const recent = await getRateLimitCount(linkedin_account_id, '1 hour');
  if (recent >= 50) {
    throw new Error('Rate limit exceeded - will retry');
  }
  
  // Send DM
  const result = await unipile.sendMessage({
    account_id: linkedin_account_id,
    recipient_profile_url: lead.linkedin_profile_url,
    message
  });
  
  // Update lead
  await supabase.from('leads').update({
    dm_status: 'sent',
    dm_sent_at: new Date(),
    dm_id: result.message_id
  }).eq('id', lead_id);
  
}, {
  connection: { host: 'localhost', port: 6379 },
  concurrency: 5
});

worker.on('completed', (job) => {
  console.log(`✅ DM sent: ${job.id}`);
});

worker.on('failed', (job, err) => {
  console.log(`❌ DM failed: ${job.id} - ${err.message}`);
});
```

**Test:**

```typescript
// Queue 10 test DMs
for (let i = 0; i < 10; i++) {
  await dmQueue.add('send-dm', {
    lead_id: `lead_${i}`,
    message: `Test DM ${i}`,
    linkedin_account_id: 'acc_123'
  }, {
    delay: i * 2 * 60 * 1000 // Stagger by 2 min each
  });
}

// Monitor queue
const waiting = await dmQueue.getWaiting();
const active = await dmQueue.getActive();
const completed = await dmQueue.getCompleted();

console.log({ waiting: waiting.length, active: active.length, completed: completed.length });
```

### Deliverables (Week 4)

- ✅ PostHog tracking events
- ✅ Clarity session recordings
- ✅ Analytics dashboard functional
- ✅ BullMQ queue system deployed
- ✅ DM worker processing jobs

---

## Week 5: Email Sequences + Unipile Integration

### Goals

- Unipile API fully integrated
- Instantly email sequences working
- End-to-end lead flow functional

### Tasks

#### Monday: Unipile Setup

- [ ] Create Unipile account
- [ ] Connect LinkedIn account
- [ ] Get API credentials
- [ ] Test comment scraping
- [ ] Test DM sending

#### Tuesday-Wednesday: Instantly Integration

**Setup:**

```typescript
// integrations/instantly.ts
import axios from 'axios';

const instantly = axios.create({
  baseURL: 'https://api.instantly.ai/v1',
  headers: {
    'Authorization': `Bearer ${process.env.INSTANTLY_API_KEY}`
  }
});

export async function createEmailCampaign(leadId: string, emails: EmailSequence[]) {
  const { data: lead } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single();
  
  // Create campaign
  const campaign = await instantly.post('/campaigns', {
    name: `${lead.campaign_id}-${leadId}`,
    from_name: lead.client.name,
    from_email: lead.client.email
  });
  
  // Add emails to sequence
  for (const [index, email] of emails.entries()) {
    await instantly.post(`/campaigns/${campaign.data.id}/sequences`, {
      step: index + 1,
      subject: email.subject,
      body: email.body,
      delay_days: email.delay_days
    });
  }
  
  // Add lead as contact
  await instantly.post(`/campaigns/${campaign.data.id}/contacts`, {
    email: lead.email,
    first_name: lead.name.split(' ')[0],
    variables: {
      company: lead.company_name,
      comment: lead.comment_text,
      lead_magnet_url: lead.lead_magnet_url
    }
  });
  
  return campaign.data;
}
```

**Cron Job (trigger email sequences):**

```typescript
// crons/email-sequence-trigger.ts
import cron from 'node-cron';

// Run every hour
cron.schedule('0 * * * *', async () => {
  // Find leads with no DM response after 48 hours
  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('dm_status', 'sent')
    .is('dm_replied_at', null)
    .lte('dm_sent_at', new Date(Date.now() - 48 * 60 * 60 * 1000))
    .is('email_campaign_id', null)
    .not('email', 'is', null);
  
  for (const lead of leads) {
    // Generate email sequence via AgentKit
    const emails = await generateEmailSequence(lead);
    
    // Create Instantly campaign
    const campaign = await createEmailCampaign(lead.id, emails);
    
    // Track
    await supabase.from('leads').update({
      email_campaign_id: campaign.id,
      email_status: 'queued'
    }).eq('id', lead.id);
  }
});
```

#### Thursday: Webhook Handlers

**Unipile webhooks (DM replies):**

```typescript
// api/webhooks/unipile.ts
export async function POST(req: Request) {
  const { event, data } = await req.json();
  
  if (event === 'message.received') {
    // Find lead by conversation
    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('dm_id', data.conversation_id)
      .single();
    
    if (lead) {
      // Mark as replied
      await supabase.from('leads').update({
        dm_replied_at: new Date(),
        dm_reply_text: data.text
      }).eq('id', lead.id);
      
      // Notify via Slack
      await slackNotify(`📩 Lead replied: ${lead.name}\n${data.text}`);
    }
  }
  
  return new Response('OK');
}
```

**Instantly webhooks (email events):**

```typescript
// api/webhooks/instantly.ts
export async function POST(req: Request) {
  const { event, data } = await req.json();
  
  const eventMap = {
    'email.sent': 'sent',
    'email.opened': 'opened',
    'email.clicked': 'clicked',
    'email.replied': 'replied'
  };
  
  if (eventMap[event]) {
    await supabase.from('leads').update({
      email_status: eventMap[event],
      [`email_${eventMap[event]}_at`]: new Date()
    }).eq('email', data.email);
  }
  
  return new Response('OK');
}
```

#### Friday: End-to-End Test

**Complete flow:**

1. Create campaign
2. Scrape 50 comments
3. Enrich all leads
4. Queue DMs (rate limited)
5. Wait 48 hours (or simulate)
6. Trigger email sequences
7. Verify webhooks working

### Deliverables (Week 5)

- ✅ Unipile fully integrated
- ✅ Email sequences automated
- ✅ Webhooks capturing events
- ✅ Complete lead flow working

---

## Week 6: Polish + Content Approval

### Goals

- Content approval UI (Bolt.new)
- Error handling improved
- User experience polish

### Tasks

#### Monday-Tuesday: Bolt.new - Approval Queue

**Bolt.new Prompt:**

```
Create content approval dashboard:

Pending Approvals view:
- Filter: Posts | DMs | Emails
- Each item shows:
  - Preview (text + image if applicable)
  - Target (who it's for)
  - Generated at timestamp
  - Action buttons: Approve | Edit | Reject

Approve → Publishes/sends immediately
Edit → Opens editor (simple textarea)
Reject → Deletes and notifies AgentKit to regenerate

Use optimistic updates (instant UI feedback).
```

**Output**: Approval queue component

#### Wednesday: Error Handling

- [ ] Add retry logic to all API calls
- [ ] Implement exponential backoff
- [ ] Create error logging (Supabase table)
- [ ] Add Slack notifications for critical errors

```typescript
// utils/retry.ts
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

// Usage
const enrichment = await retryWithBackoff(() => 
  apollo.enrichPerson({ linkedin_url })
);
```

#### Thursday-Friday: UX Polish

- [ ] Loading states for all async operations
- [ ] Toast notifications for success/error
- [ ] Empty states (no campaigns yet, no leads, etc.)
- [ ] Keyboard shortcuts (Cmd+K for AgentKit chat)
- [ ] Mobile responsive (basic support)

### Deliverables (Week 6)

- ✅ Approval queue functional
- ✅ Robust error handling
- ✅ Polished UX
- ✅ Mobile responsive

---

## Week 7: Testing + Bug Fixes

### Goals

- Comprehensive testing
- Bug fixes
- Performance optimization

### Tasks

#### Monday-Tuesday: Unit Tests

```typescript
// tests/cartridge.test.ts
import { describe, test, expect } from 'vitest';
import { generateSystemPrompt, searchCartridges } from '../lib/cartridge';

const describe('Cartridge System', () => {
  test('generates system prompt correctly', () => {
    const cartridge = executiveCoachCartridge;
    const prompt = generateSystemPrompt(cartridge);
    
    expect(prompt).toContain('Executive Coach');
    expect(prompt).toContain('authoritative');
  });
  
  test('searches cartridges by client name', async () => {
    const results = await searchCartridges('Rachel');
    expect(results).toHaveLength(1);
    expect(results[0].name).toContain('Retirementality');
  });
});
```

#### Wednesday: Integration Tests

```typescript
// tests/end-to-end.test.ts
import { describe, test, expect } from 'vitest';

describe('End-to-End Flow', () => {
  test('complete campaign creation flow', async () => {
    // 1. Create campaign
    const campaign = await createCampaign({
      client_id: testClientId,
      post_url: 'https://linkedin.com/posts/test'
    });
    expect(campaign.id).toBeDefined();
    
    // 2. Scrape comments
    const leads = await scrapeComments(campaign.id);
    expect(leads.length).toBeGreaterThan(0);
    
    // 3. Enrich first lead
    const enriched = await enrichLead(leads[0].id);
    expect(enriched.email).toBeDefined();
    
    // 4. Generate DM
    const dm = await generateDM(leads[0].id);
    expect(dm.length).toBeLessThan(300); // LinkedIn limit
    
    // 5. Queue DM
    const job = await queueDM(leads[0].id, dm);
    expect(job.id).toBeDefined();
  });
});
```

#### Thursday: Performance Testing

- [ ] Load test: 1,000 leads enrichment
- [ ] Load test: 100 concurrent DMs
- [ ] Database query optimization (add indexes)
- [ ] Supabase RLS policy optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_leads_campaign_status ON leads(campaign_id, status);
CREATE INDEX idx_leads_dm_status ON leads(dm_status, dm_sent_at);
CREATE INDEX idx_messages_lead_sent ON messages(lead_id, sent_at);
```

#### Friday: Bug Bash

- [ ] Test all user flows manually
- [ ] Fix critical bugs
- [ ] Document known issues
- [ ] Prioritize fixes for Week 8

### Deliverables (Week 7)

- ✅ Test coverage >70%
- ✅ Performance optimized
- ✅ Critical bugs fixed
- ✅ Known issues documented

---

## Week 8: Launch Prep + Chase Demo

### Goals

- Documentation complete
- 3 beta clients onboarded
- Chase demo delivered

### Tasks

#### Monday: Documentation

- [ ] User guide (how to create campaigns)
- [ ] AgentKit commands reference
- [ ] Troubleshooting guide
- [ ] API documentation (if exposing APIs)

#### Tuesday-Wednesday: Beta Client Onboarding

**Onboard 3 beta clients:**

1. Executive Coach (use default cartridge)
2. Startup Founder (use default cartridge)
3. B2B Sales (use default cartridge)

**Per client:**

- [ ] Create account
- [ ] Set up cartridge (or use default)
- [ ] Connect LinkedIn via Unipile
- [ ] Create first campaign
- [ ] Monitor first 48 hours
- [ ] Collect feedback

#### Thursday: Chase Demo Prep

**Demo script:**

1. **Intro** (2 min)
   - Show dashboard
   - Explain architecture (AgentKit + MCPs)

2. **Campaign Creation** (5 min)
   - Chat with AgentKit: "Create campaign for Rachel"
   - Show comment scraping
   - Show Apollo enrichment
   - Show DM generation

3. **Content Generation** (5 min)
   - "Create LinkedIn post about imposter syndrome"
   - Show Canva graphic generation
   - Show approval workflow

4. **Analytics** (3 min)
   - Dashboard overview
   - Funnel metrics
   - Cost tracking (super admin view)

5. **Q&A** (5 min)

**Prepare:**

- [ ] Demo video recording (backup if live demo fails)
- [ ] Sample data (pre-loaded campaigns with results)
- [ ] Answers to likely questions

#### Friday: Chase Demo

- [ ] Deliver demo to Chase
- [ ] Collect feedback
- [ ] Discuss V2 features (pod resharing, GoHighLevel)
- [ ] Get approval to proceed

### Deliverables (Week 8)

- ✅ Complete documentation
- ✅ 3 beta clients using system
- ✅ Chase demo delivered
- ✅ Feedback incorporated
- ✅ **MVP COMPLETE**

---

## Success Criteria

**MVP is complete when:**

### Technical Criteria

- [ ] All 9 features functional (see MVP Feature Spec)
- [ ] Test coverage >70%
- [ ] Uptime >99% (past 7 days)
- [ ] DM delivery rate >95%
- [ ] Email delivery rate >90%
- [ ] API response time <2s

### Business Criteria

- [ ] 3 beta clients successfully onboarded
- [ ] >50 leads scraped per campaign (avg)
- [ ] >10% DM reply rate (across all campaigns)
- [ ] <$350/client/month operating cost
- [ ] Chase approval obtained

### User Experience Criteria

- [ ] Time to first campaign <10 minutes
- [ ] Content approval rate >80% (first draft)
- [ ] Client satisfaction >4/5 stars
- [ ] <2 support tickets per client/month

---

## Risk Mitigation

### Risk: Unipile API changes/downtime

**Mitigation:**
- Monitor Unipile status page
- Have fallback: Manual CSV upload for comments
- Document workaround in troubleshooting guide

### Risk: Apollo enrichment rate too low

**Mitigation:**
- Test with real LinkedIn profiles (not test data)
- If <50% success rate, consider Hunter.io as backup
- Cache successful enrichments to reduce API calls

### Risk: AgentKit not generating quality content

**Mitigation:**
- Iterate on cartridge system prompts
- Collect human feedback (Slack approvals)
- Update Mem0 with approved examples
- Use Context7 for better research context

### Risk: Rate limits exceeded

**Mitigation:**
- Implement conservative limits (40 DMs/hour, not 50)
- Add buffer time between sends
- Monitor queue depth, alert if backlog >100

---

## Post-MVP (V2 Planning)

### V2 Features (Priority Order)

1. **Pod Resharing System** (Chase's priority)
   - 60-minute coordination
   - Member vetting
   - Pod management UI

2. **GoHighLevel CRM Sync**
   - OAuth setup
   - Field mapping
   - Bi-directional sync

3. **SMS/MMS Outreach**
   - Phone number enrichment
   - Twilio integration
   - Compliance (TCPA)

4. **Advanced Analytics**
   - Attribution tracking
   - ROI calculator
   - Predictive lead scoring

5. **White-label Branding**
   - Custom domains
   - Logo/colors per client
   - Embed options

---

## Next Steps

After MVP completion:

1. ✅ Chase reviews and approves
2. ✅ Prioritize V2 features with Chase
3. ✅ Onboard 10 more clients (scaling test)
4. ✅ Monitor system performance
5. ✅ Begin V2 development

---

## Appendix: Weekly Checklist

### Week 1
- [ ] Supabase project created
- [ ] Database schema deployed
- [ ] Auth working
- [ ] Dashboard shell

### Week 2-3
- [ ] 6 MCPs installed
- [ ] 3 AgentKit agents built
- [ ] Cartridge system functional
- [ ] Slack approval workflow

### Week 4
- [ ] PostHog tracking
- [ ] Clarity recordings
- [ ] Analytics dashboard
- [ ] BullMQ queue system

### Week 5
- [ ] Unipile integrated
- [ ] Email sequences working
- [ ] Webhooks functional
- [ ] End-to-end flow tested

### Week 6
- [ ] Approval queue UI
- [ ] Error handling robust
- [ ] UX polished
- [ ] Mobile responsive

### Week 7
- [ ] Tests written (>70% coverage)
- [ ] Performance optimized
- [ ] Bugs fixed
- [ ] Load tested

### Week 8
- [ ] Documentation complete
- [ ] 3 beta clients onboarded
- [ ] Chase demo delivered
- [ ] **MVP COMPLETE**