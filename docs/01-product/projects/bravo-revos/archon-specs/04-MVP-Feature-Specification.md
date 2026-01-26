# MVP Feature Specification - RevOS V1

## Philosophy

> **"Jobs to be done > Observability"**

Clients (coaches, small businesses) want **excellence delivered**, not dashboards to manage. AgentKit handles most operations via chat, with minimal UI for analytics and approvals.

## MVP Scope Summary

### ✅ IN Scope (MVP)

1. **LinkedIn Comment Scraping** (Unipile API)
2. **Lead Enrichment** (Apollo.io MCP)
3. **DM Automation** (Unipile + rate limiting)
4. **Email Sequences** (Instantly/Smartlead)
5. **Lead Magnet Library** (pre-built + AI generation)
6. **Content Generation** (AgentKit + Context7 + Canva)
7. **Cartridge System** (Mem0 + Supabase)
8. **Analytics** (PostHog + Clarity)
9. **Multi-tenant Auth** (Supabase)

### ❌ OUT of Scope (V2)

1. **Pod Resharing System** (60-min coordination)
2. **GoHighLevel CRM Sync**
3. **SMS/MMS Outreach**
4. **Advanced A/B testing**
5. **White-label branding**
6. **Mobile apps**

## Feature Breakdown

---

## 1. LinkedIn Comment Scraping

### User Story

**As a** client  
**I want to** automatically scrape engaged commenters from my LinkedIn posts  
**So that** I can reach out to warm leads who already showed interest

### Acceptance Criteria

- [ ] AgentKit accepts LinkedIn post URL via chat
- [ ] Calls Unipile API to scrape all comments
- [ ] Extracts: commenter name, profile URL, comment text, timestamp
- [ ] Stores in Supabase `leads` table with status='scraped'
- [ ] Returns count: "Found 47 commenters"
- [ ] Handles rate limiting (max 100 posts/hour)
- [ ] Skips duplicate commenters (same profile URL)

### Technical Implementation

```typescript
// Unipile API call
const response = await unipile.post('/comments/scrape', {
  post_url: linkedInPostUrl,
  include_nested: false, // Only top-level comments for MVP
  max_results: 500
});

// Store in Supabase
for (const comment of response.comments) {
  await supabase.from('leads').upsert({
    campaign_id,
    linkedin_profile_url: comment.author.profile_url,
    name: comment.author.name,
    comment_text: comment.text,
    commented_at: comment.created_at,
    status: 'scraped',
    enrichment_status: 'pending'
  }, {
    onConflict: 'linkedin_profile_url,campaign_id'
  });
}
```

### Dependencies

- Unipile API integration
- Supabase `leads` table
- AgentKit Lead Enrichment Agent

---

## 2. Lead Enrichment (Apollo.io)

### User Story

**As a** client  
**I want** scraped LinkedIn profiles enriched with email + company data  
**So that** I can reach leads via multiple channels

### Acceptance Criteria

- [ ] Automatically enriches all leads with status='scraped'
- [ ] Calls Apollo.io MCP for each lead
- [ ] Retrieves: email, company name, job title, company size
- [ ] Updates lead with enrichment data
- [ ] Sets enrichment_status='enriched' or 'not_found'
- [ ] Tracks Apollo credits used per client (billing)
- [ ] Handles failures gracefully (retry 3x)

### Technical Implementation

```typescript
import { apollo } from './mcp-clients';

async function enrichLead(leadId: string) {
  const lead = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single();
  
  try {
    const enrichment = await apollo.enrichPerson({
      linkedin_url: lead.linkedin_profile_url
    });
    
    await supabase.from('leads').update({
      email: enrichment.email,
      company_name: enrichment.organization?.name,
      job_title: enrichment.title,
      company_size: enrichment.organization?.employees,
      enrichment_status: enrichment.email ? 'enriched' : 'partial',
      enriched_at: new Date()
    }).eq('id', leadId);
    
    // Track usage
    await supabase.from('apollo_usage').insert({
      client_id: lead.client_id,
      credits_used: 1,
      result: enrichment.email ? 'success' : 'partial'
    });
    
  } catch (error) {
    await supabase.from('leads').update({
      enrichment_status: 'failed',
      enrichment_error: error.message
    }).eq('id', leadId);
  }
}
```

### Dependencies

- Apollo.io MCP server
- Supabase `apollo_usage` table (billing tracking)
- Background worker for batch enrichment

---

## 3. DM Automation

### User Story

**As a** client  
**I want** personalized DMs sent automatically to enriched leads  
**So that** I can engage prospects at scale without manual work

### Acceptance Criteria

- [ ] AgentKit generates personalized DM using cartridge + lead context
- [ ] DM mentions specific detail from comment
- [ ] Includes lead magnet offer (if applicable)
- [ ] Respects rate limits (50 DMs/hour per LinkedIn account)
- [ ] Staggered sending (2-15 min random delays)
- [ ] Tracks: sent, delivered, replied, bounced
- [ ] Retries failed sends (3x with exponential backoff)
- [ ] Human approval option (content only)

### Technical Implementation

**AgentKit Workflow:**

```
1. File Search: Retrieve cartridge from Mem0
2. Generate Text: Create personalized DM
   System: [Cartridge system prompt]
   User: "Write DM to [Name] who commented: '[comment]'.
          Offer: [lead magnet title].
          Keep under 300 characters."
3. Ask User (if approval enabled): "Approve this DM?"
4. Call Function: queue_dm(lead_id, message, delay_minutes)
```

**Background Queue:**

```typescript
import { Queue, Worker } from 'bullmq';

const dmQueue = new Queue('dm-queue', { connection: redis });

// Queue job
await dmQueue.add('send-dm', {
  lead_id,
  message,
  linkedin_account_id
}, {
  delay: delayMs,
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 60000 // 1 min, 2 min, 4 min
  }
});

// Worker
const worker = new Worker('dm-queue', async (job) => {
  const { lead_id, message, linkedin_account_id } = job.data;
  
  // Check rate limit
  const recentCount = await getRateLimitCount(linkedin_account_id, '1 hour');
  if (recentCount >= 50) {
    throw new Error('Rate limit exceeded');
  }
  
  // Send via Unipile
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
  
}, { connection: redis });
```

### Dependencies

- Unipile API integration
- BullMQ + Redis (job queue)
- Supabase `leads` table (dm_status tracking)
- AgentKit Content Generation Agent

---

## 4. Email Sequences

### User Story

**As a** client  
**I want** automated email follow-ups for leads who don't respond to DMs  
**So that** I maximize conversion across channels

### Acceptance Criteria

- [ ] Trigger email sequence if no DM response after 48 hours
- [ ] Only send to enriched leads with valid email
- [ ] 3-email sequence: intro, value, call-to-action
- [ ] Personalized using cartridge + lead context
- [ ] Tracks: sent, opened, clicked, replied
- [ ] Unsubscribe link in every email
- [ ] Stops sequence if lead replies to DM or email

### Technical Implementation

```typescript
import { instantly } from './integrations/instantly';

// Cron job: Check for DM non-responders
const leadsForEmail = await supabase
  .from('leads')
  .select('*')
  .eq('dm_status', 'sent')
  .is('dm_replied_at', null)
  .lte('dm_sent_at', new Date(Date.now() - 48 * 60 * 60 * 1000))
  .eq('email_status', null)
  .not('email', 'is', null);

for (const lead of leadsForEmail) {
  // Generate 3-email sequence via AgentKit
  const emails = await generateEmailSequence(lead, cartridge);
  
  // Create campaign in Instantly
  const campaign = await instantly.createCampaign({
    name: `${lead.campaign_id}-${lead.id}`,
    emails: [
      { subject: emails[0].subject, body: emails[0].body, delay_days: 0 },
      { subject: emails[1].subject, body: emails[1].body, delay_days: 3 },
      { subject: emails[2].subject, body: emails[2].body, delay_days: 7 }
    ]
  });
  
  // Add lead to campaign
  await instantly.addContact(campaign.id, {
    email: lead.email,
    first_name: lead.name.split(' ')[0],
    custom_vars: {
      company: lead.company_name,
      comment: lead.comment_text,
      lead_magnet_url: lead.lead_magnet_url
    }
  });
  
  // Track
  await supabase.from('leads').update({
    email_status: 'queued',
    email_campaign_id: campaign.id
  }).eq('id', lead.id);
}
```

### Dependencies

- Instantly/Smartlead API integration
- AgentKit Content Generation Agent
- Cron job for triggering sequences
- Webhook handler for email events (opened, clicked, replied)

---

## 5. Lead Magnet Library

### User Story

**As a** client  
**I want** to choose from pre-built lead magnets  
**So that** I don't have to create my own resources

### Acceptance Criteria

- [ ] Library of 50+ lead magnets across 3 niches
- [ ] Semantic search by niche, pain points, audience
- [ ] Preview before selecting
- [ ] Performance data shown (conversion rate, downloads)
- [ ] Custom generation option (Context7 + Canva MCPs)
- [ ] Human approval for custom magnets (content only)
- [ ] Stores in Supabase Storage

### Technical Implementation

See companion document: **Lead Magnet Library & Content Pipeline**

### Dependencies

- Supabase Storage
- Context7 MCP (research)
- Canva MCP (design)
- Supabase `lead_magnets` table + embeddings

---

## 6. Content Generation

### User Story

**As a** client  
**I want** AgentKit to generate LinkedIn posts in my voice  
**So that** I can maintain consistent posting without writing myself

### Acceptance Criteria

- [ ] Generates posts using cartridge persona + writing style
- [ ] Optional: Include lead magnet promotion
- [ ] Creates accompanying graphic (Canva MCP)
- [ ] Human approval required (content only)
- [ ] Publishes via Unipile after approval
- [ ] Tracks performance (likes, comments, shares)

### Technical Implementation

**AgentKit Workflow:**

```
1. File Search: Load cartridge from Mem0
2. Search Web: Research latest trends in [niche]
3. Generate Text:
   System: [Cartridge system prompt]
   User: "Create LinkedIn post about [topic]. 
          Target: [audience from cartridge].
          Include: [lead magnet CTA if applicable]."
4. Generate Image: Canva MCP with post content
5. Ask User: "Approve this post?"
   [Show post + image preview]
6. If approved:
   - Call Function: schedule_post(content, image_url, publish_at)
   - Unipile publishes to LinkedIn
7. If edited:
   - Update Mem0 with feedback
   - Regenerate
```

### Dependencies

- AgentKit Content Generation Agent
- Mem0 (cartridge retrieval)
- Context7 MCP (trend research)
- Canva MCP (graphics)
- Unipile (publishing)
- Slack (approval workflow)

---

## 7. Cartridge System

### User Story

**As a** client  
**I want** all content generated in my unique voice and style  
**So that** it sounds authentic and matches my brand

### Acceptance Criteria

- [ ] Cartridge defines persona, writing style, industry knowledge
- [ ] Stored in Mem0 for flexible retrieval
- [ ] Backed up in Supabase PGVector
- [ ] AgentKit loads cartridge for every content generation
- [ ] Learns from user feedback (approvals/edits)
- [ ] 3 default cartridges provided (Executive Coach, Startup Founder, B2B Sales)
- [ ] Custom cartridge creation via AgentKit

### Technical Implementation

See companion document: **Cartridge System Specification**

### Dependencies

- Mem0 MCP
- Supabase PGVector
- AgentKit File Search tool

---

## 8. Analytics (PostHog + Clarity)

### User Story

**As a** super admin  
**I want** to track per-tenant usage and costs  
**So that** I can bill accurately and optimize operations

**As a** client  
**I want** to see campaign performance  
**So that** I know ROI and what's working

### Acceptance Criteria

**Super Admin Dashboard:**
- [ ] Per-tenant API usage (OpenAI, Apollo, Unipile)
- [ ] Cost breakdown by client
- [ ] Feature adoption rates
- [ ] System health metrics

**Client Dashboard:**
- [ ] Campaign overview (leads scraped, enriched, contacted)
- [ ] Conversion funnel (scrape → DM → reply → call)
- [ ] Lead magnet performance
- [ ] Post engagement trends

### Technical Implementation

**PostHog Events:**

```typescript
import { PostHog } from 'posthog-node';

const posthog = new PostHog(POSTHOG_API_KEY);

// Track lead enrichment
posthog.capture({
  distinctId: userId,
  event: 'lead_enriched',
  properties: {
    client_id: clientId,
    campaign_id: campaignId,
    apollo_credits_used: 1,
    result: 'success'
  }
});

// Track DM sent
posthog.capture({
  distinctId: userId,
  event: 'dm_sent',
  properties: {
    client_id: clientId,
    campaign_id: campaignId,
    lead_id: leadId
  }
});
```

**Clarity MCP:**

```typescript
import { clarity } from './mcp-clients';

// Get session recordings for UX optimization
const sessions = await clarity.getSessions({
  project_id: CLARITY_PROJECT_ID,
  filters: {
    url_contains: '/campaign',
    date_range: 'last_7_days'
  },
  limit: 50
});
```

### Dependencies

- PostHog SDK
- Clarity MCP
- Bolt.new generated dashboard components

---

## 9. Multi-Tenant Authentication

### User Story

**As a** client  
**I want** secure access to only my data  
**So that** my campaigns and leads are private

**As a** super admin  
**I want** access to all tenants  
**So that** I can provide support and monitor the system

### Acceptance Criteria

- [ ] Supabase Auth with email/password
- [ ] JWT tokens for API authentication
- [ ] Row-Level Security (RLS) policies on all tables
- [ ] Super admin role bypasses RLS
- [ ] Client role sees only their data
- [ ] Session management (auto-logout after 7 days)

### Technical Implementation

**RLS Policies:**

```sql
-- Leads table
CREATE POLICY "Users see own leads"
  ON leads FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns 
      WHERE user_id = auth.uid()
    )
  );

-- Super admin sees all
CREATE POLICY "Super admins see all leads"
  ON leads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );
```

**Cartridge Access:**

```typescript
// Super admin cartridge (full backend access)
const superAdminCartridge = {
  name: "Super Admin",
  tools_enabled: [
    "all_campaigns",
    "all_leads",
    "billing_data",
    "system_health"
  ]
};

// Client cartridge (tenant-isolated)
const clientCartridge = {
  name: "Client",
  tools_enabled: [
    "my_campaigns",
    "my_leads",
    "my_analytics"
  ]
};
```

### Dependencies

- Supabase Auth
- RLS policies on all tables
- AgentKit cartridge system (super admin vs client)

---

## Out of Scope (V2)

### 1. Pod Resharing System

**Why V2:**
- Complex timing coordination (60-min window)
- Requires member vetting/onboarding
- Needs pod management UI
- Rate limiting across 9+ members

**MVP workaround:**
- Manual pod coordination via Slack
- Focus on comment scraping (core value)

### 2. GoHighLevel CRM Sync

**Why V2:**
- Not all clients use GHL
- Requires OAuth setup per client
- Mapping custom fields is complex
- Apollo.io + Supabase covers MVP needs

**MVP workaround:**
- CSV export for manual import
- Zapier integration (client-configured)

### 3. SMS/MMS Outreach

**Why V2:**
- Requires phone number collection (not in Apollo)
- Higher cost per send (~$0.01/SMS)
- Compliance complexity (TCPA, opt-in)
- LinkedIn + Email sufficient for MVP

**MVP workaround:**
- Email sequences cover multi-channel

---

## Success Metrics (MVP)

### Technical Metrics

- [ ] **Uptime**: 99% availability
- [ ] **DM delivery rate**: >95%
- [ ] **Email delivery rate**: >90%
- [ ] **Enrichment success**: >70% (Apollo finds email)
- [ ] **API response time**: <2s (AgentKit chat)

### Business Metrics

- [ ] **Time to first campaign**: <10 minutes
- [ ] **Leads scraped per campaign**: >50
- [ ] **DM → Reply rate**: >10%
- [ ] **Email → Reply rate**: >5%
- [ ] **Cost per client**: <$350/month

### User Experience Metrics

- [ ] **Client satisfaction**: 4.5/5 stars
- [ ] **Content approval rate**: >80% (first draft)
- [ ] **Support tickets**: <2 per client/month

---

## Acceptance Criteria Summary

**MVP is complete when:**

1. ✅ Client can create campaign via AgentKit chat
2. ✅ AgentKit scrapes LinkedIn comments automatically
3. ✅ Apollo enriches leads with emails
4. ✅ DMs sent with rate limiting + personalization
5. ✅ Email sequences trigger for non-responders
6. ✅ Lead magnet library available (50+ assets)
7. ✅ Content generation works (posts + graphics)
8. ✅ Cartridge system personalizes all content
9. ✅ Analytics dashboards show performance
10. ✅ Multi-tenant auth isolates client data

**AND:**

- [ ] All tests pass (see Implementation Roadmap)
- [ ] Documentation complete
- [ ] 3 beta clients successfully using system
- [ ] Chase approves final demo

---

## Next Steps

See companion documents:
1. **Implementation Roadmap** - Week-by-week build plan
2. **MCP Integration Guide** - Setup instructions for all MCPs
3. **Technical Architecture v3** - How features fit together