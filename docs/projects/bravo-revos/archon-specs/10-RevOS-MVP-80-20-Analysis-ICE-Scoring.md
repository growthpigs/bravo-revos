# RevOS MVP "V1 V1 V1" - Engagement Pod Edition
## Revised Scope Based on Partner Requirements | 100-Point Sprint System

*Date:* October 30, 2025  
*Sprint Duration:* 7 days  
*Total Budget:* 100 points  
*Daily Capacity:* 10-15 points (AI-assisted dev with Claude Code in Cursor)

---

## Executive Summary

*What Changed:*
Based on Chase's clarification, RevOS MVP is *NOT* a full outreach platform. It's specifically an *engagement pod automation tool* - the first "tool" in the eventual RevOS platform.

*Core Workflow (Simplified):*

1. Comment posted on LinkedIn
2. RevOS scrapes commenter
3. RevOS sends DM asking for email
4. User replies with email
5. RevOS captures email → sends webhook to client's CRM
6. (Optional) RevOS sends lead magnet via Mailgun


*Key Insight from LeadShark Analysis:*
LeadShark does exactly this: "Automate DM outreach by sending automated messages to people who comment on your posts." They're our direct competitor and validation that this market exists.

*What We're Removing from Original Spec:*
- ❌ Email sequences (client handles via their newsletter)
- ❌ Lead enrichment (Apollo) - not needed for MVP
- ❌ Lead magnet library - client provides their link
- ❌ Complex analytics - basic tracking sufficient

*What We're Adding:*
- ✅ Webhook to client's CRM (Zapier/Make compatible)
- ✅ Email delivery via Mailgun (not DM)
- ✅ Engagement pod focus (group coordination)

---

## Competitive Analysis: LeadShark vs. RevOS

### LeadShark.io (Our Direct Competitor)

*What They Do:*
- Scrape LinkedIn post commenters
- Send automated DMs to commenters
- Deliver lead magnets
- "Warm outbound agent" positioning

*Their Value Prop:*
"Automate your B2B Lead Generation with LeadShark's Lead Magnet automation software. LeadShark simplifies DM outreach, by sending automated messages to people who comment on your posts."

*Pricing:* (Estimated from market research)
- Likely $49-99/month per user
- May have limits on DMs/month

### RevOS Competitive Advantages

*1. Engagement Pod Coordination*
- LeadShark = single-user tool
- RevOS = designed for pod groups (9+ members)
- Coordinate who scrapes whose posts
- Prevent duplicate outreach

*2. Webhook Integration*
- Send emails directly to client's existing CRM
- No vendor lock-in
- Works with any system (Zapier, Make, GoHighLevel)

*3. AI-Powered Personalization*
- AgentKit generates unique DMs per commenter
- References specific comment content
- Avoids spam detection

*4. Multi-Tenant from Day 1*
- Scale to 100+ pod groups
- Each pod isolated
- White-label ready for V2

---

## Revised User Flow (Chase's Version)

### The Actual Workflow


┌─────────────────────────────────────────────────┐
│ 1. Someone comments on VIP member's post        │
│    (VIP = Pod member with large audience)       │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│ 2. RevOS scrapes that user's profile            │
│    - Name, LinkedIn URL                          │
│    - Comment text                                │
│    - Timestamp                                   │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│ 3. RevOS sends DM from VIP member's account     │
│    Message: "Hey [Name], loved your comment      │
│    about [topic]. I'd love to send you our      │
│    [lead magnet name]. What's your best email?" │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│ 4. Commenter replies with email address         │
│    Example: "sure! it's john@company.com"        │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│ 5. RevOS extracts email using AI                │
│    Stores in Supabase                            │
│    Sends webhook to client's CRM/newsletter     │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│ 6. RevOS sends lead magnet via Mailgun          │
│    From: noreply@revos.io (or custom domain)    │
│    Subject: "Here's the [lead magnet name]"     │
│    Body: Link to PDF/resource                    │
└─────────────────────────────────────────────────┘


*Why Email Delivery Not DM:*
- DMs have character limits
- Can't send attachments in LinkedIn DMs
- Email feels more professional for resource delivery
- Avoids LinkedIn rate limits on the 2nd message

---

## 100-Point Sprint System

### Point Estimation Methodology

*Based on Agro Archon Reference:*
- *Built:* Substantial full-stack app in 3 days
- *Daily Output:* ~33 points/day solo with Claude Code
- *Conservative Estimate:* 10-15 points/day (accounting for unknowns)
- *7-Day Sprint:* 70-105 points capacity
- *Budget:* 100 points (allows 30% buffer)

*Point Scale:*
- *1 point* = 30 minutes AI-assisted coding
- *5 points* = Half-day feature (2-3 hours)
- *10 points* = Full-day feature (6-8 hours)
- *20 points* = Multi-day epic (2-3 days)

*Complexity Modifiers:*
- *+20%* = New API integration (learning curve)
- *+50%* = Complex AI logic (prompt engineering)
- *+100%* = Unknown territory (no clear solution path)

---

## Feature Breakdown with Points

### Critical Path (Must-Have: 75 points)

#### 1. LinkedIn Comment Scraping (15 points)

*What:* Unipile API integration to scrape post commenters

*Breakdown:*
- API setup + authentication: 2 points
- Comment scraping endpoint: 5 points
- Error handling + rate limits: 3 points
- Supabase storage integration: 3 points
- Testing with real posts: 2 points

*Dependencies:* Unipile API key, Supabase project

*Acceptance Criteria:*
- Paste LinkedIn post URL
- Returns list of commenters with names, URLs, comment text
- Stores in leads table
- Handles pagination (>50 comments)

---

#### 2. DM Automation (20 points)

*What:* Queue and send personalized DMs asking for email

*Breakdown:*
- BullMQ job queue setup: 5 points
- Unipile DM sending integration: 5 points
- Rate limiting (50/day per account): 3 points
- Random delay logic (2-15 min): 2 points
- Retry mechanism (3x exponential backoff): 3 points
- Status tracking + logging: 2 points

*Dependencies:* BullMQ, Redis, Unipile API

*Acceptance Criteria:*
- DMs sent with 2-15 minute delays
- Never exceeds 50/day per LinkedIn account
- Retries failed sends automatically
- Updates leads.dm_status field

---

#### 3. AI Email Extraction (15 points)

*What:* Parse reply DMs to extract email addresses

*Breakdown:*
- Unipile webhook handler: 5 points
- GPT-4o email extraction prompt: 5 points
- Validation (regex + verification): 2 points
- Edge case handling (no email, multiple emails): 3 points

*Dependencies:* OpenAI API, Unipile webhooks

*Acceptance Criteria:*
- Correctly extracts emails from natural language replies
- Handles: "sure it's john@company.com", "john at company dot com"
- Stores in leads.email field
- Marks leads.email_status = 'captured'

*Example Prompt:*

Extract the email address from this LinkedIn DM reply:

"{dm_text}"

Return ONLY the email address in valid format, or "NONE" if no email found.
Examples:
- "sure! john@acme.com" → john@acme.com
- "my email is jane dot smith at bigcorp dot org" → jane.smith@bigcorp.org
- "no thanks" → NONE


---

#### 4. Webhook to Client CRM (10 points)

*What:* Send captured emails to client's external system

*Breakdown:*
- Webhook configuration UI: 3 points
- HTTP POST with email data: 3 points
- Retry logic (3x with backoff): 2 points
- Webhook testing tool: 2 points

*Dependencies:* Client webhook URL (Zapier/Make)

*Acceptance Criteria:*
- POST to configured webhook URL
- Payload: { email, name, linkedin_url, comment_text, timestamp }
- Retries on 5xx errors
- Logs success/failure

*Example Payload:*
json
{
  "event": "email_captured",
  "lead": {
    "email": "john@company.com",
    "name": "John Smith",
    "linkedin_url": "https://linkedin.com/in/johnsmith",
    "comment_text": "Great insights on leadership!",
    "captured_at": "2025-10-30T15:23:45Z"
  },
  "campaign": {
    "id": "abc123",
    "name": "Imposter Syndrome Post"
  }
}


---

#### 5. Lead Magnet Email Delivery (10 points)

*What:* Send PDF/resource link via Mailgun

*Breakdown:*
- Mailgun API setup: 2 points
- Email template system: 3 points
- Attachment handling: 2 points
- Delivery tracking: 3 points

*Dependencies:* Mailgun account, DNS setup (SPF/DKIM)

*Acceptance Criteria:*
- Sends within 5 minutes of email capture
- Professional template (HTML)
- Tracks opens/clicks
- Unsubscribe link included

*Example Email:*

From: Chase <chase@revos.io>
Subject: Here's the Leadership Guide you requested

Hi John,

Thanks for engaging on my recent post about imposter syndrome!

As promised, here's the guide:
👉 [Download: 5 Conversations Every Leader Must Have]

Let me know if you have questions.

- Chase

---
Unsubscribe: [link]


---

#### 6. Supabase Multi-Tenant Setup (5 points)

*What:* Database schema + RLS policies

*Breakdown:*
- Schema design: 2 points
- RLS policies: 2 points
- Test data + queries: 1 point

*Schema:*
sql
-- Minimal MVP schema
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  linkedin_post_url TEXT,
  lead_magnet_name TEXT,
  lead_magnet_url TEXT,
  webhook_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id),
  linkedin_profile_url TEXT,
  name TEXT,
  comment_text TEXT,
  
  -- Workflow tracking
  dm_status TEXT, -- pending, sent, replied, bounced
  dm_sent_at TIMESTAMPTZ,
  dm_reply_text TEXT,
  
  email TEXT,
  email_status TEXT, -- captured, sent, delivered, opened
  email_sent_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own campaigns"
  ON campaigns FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Users see own leads"
  ON leads FOR ALL
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );


---

### High Priority (Should-Have: 15 points)

#### 7. AgentKit Slack Interface (10 points)

*What:* Conversational UI for campaign management

*Breakdown:*
- Slack app setup: 2 points
- AgentKit integration: 3 points
- Tool definitions (scrape, check status): 3 points
- Approval workflow: 2 points

*Acceptance Criteria:*
- User: "Scrape this post: [URL]"
- Bot: "Found 47 commenters. Send DMs asking for email?"
- User: "Yes"
- Bot: "Queued 47 DMs. Sending over next 24 hours."

---

#### 8. Reply Notifications (5 points)

*What:* Alert user when commenter replies with email

*Breakdown:*
- Webhook → Slack notification: 3 points
- Notification formatting: 2 points

*Example:*

📧 New Email Captured!

John Smith replied:
"Sure! john@company.com"

Campaign: Imposter Syndrome Post
Webhook sent: ✅
Email sent: ✅

[View in LinkedIn]


---

### Nice-to-Have (Optional: 10 points)

#### 9. Basic Analytics Dashboard (10 points)

*What:* Simple metrics page

*Metrics:*
- Total leads scraped
- DMs sent vs. replied
- Emails captured
- Lead magnets delivered

*UI:* Simple table, no charts needed for MVP

---

## Points Allocation Summary

| Feature | Points | Priority | Status |
|---------|--------|----------|--------|
| 1. Comment Scraping | 15 | Critical | Must-have |
| 2. DM Automation | 20 | Critical | Must-have |
| 3. Email Extraction | 15 | Critical | Must-have |
| 4. Webhook to CRM | 10 | Critical | Must-have |
| 5. Mailgun Delivery | 10 | Critical | Must-have |
| 6. Supabase Setup | 5 | Critical | Must-have |
| 7. AgentKit Slack | 10 | High | Should-have |
| 8. Reply Notifications | 5 | High | Should-have |
| 9. Analytics Dashboard | 10 | Nice | Optional |
| *TOTAL* | *100* | | |

*Critical Path:* 75 points (5-6 days)  
*Full MVP:* 90 points (7 days)  
*Buffer:* 10 points (1 day debugging/polish)

---

## Daily Sprint Plan (7 Days)

### Day 1 (15 points) - Foundation
- ✅ Supabase project setup (5 pts)
- ✅ Unipile API integration (5 pts)
- ✅ Comment scraping endpoint (5 pts)

*Deliverable:* Can scrape LinkedIn post, stores commenters in database

---

### Day 2 (15 points) - DM Automation
- ✅ BullMQ + Redis setup (5 pts)
- ✅ DM queue + sending (10 pts)

*Deliverable:* DMs sent with rate limiting + random delays

---

### Day 3 (15 points) - Reply Processing
- ✅ Unipile webhook handler (5 pts)
- ✅ AI email extraction (10 pts)

*Deliverable:* Replies parsed, emails captured, stored in database

---

### Day 4 (15 points) - External Integrations
- ✅ Webhook to CRM (10 pts)
- ✅ Mailgun setup + email delivery (5 pts)

*Deliverable:* Emails sent to CRM + lead magnet delivered

---

### Day 5 (10 points) - AgentKit Interface
- ✅ Slack app + AgentKit (10 pts)

*Deliverable:* Conversational interface working

---

### Day 6 (10 points) - Polish
- ✅ Reply notifications (5 pts)
- ✅ Error handling improvements (3 pts)
- ✅ Testing with real accounts (2 pts)

*Deliverable:* Production-ready system

---

### Day 7 (10 points) - Launch Prep
- ✅ Documentation (3 pts)
- ✅ Analytics dashboard (optional) (5 pts)
- ✅ First customer onboarding (2 pts)

*Deliverable:* Live with first paying customer

---

## What We're NOT Building (Scope Discipline)

### Explicitly Removed per Chase

*1. Email Sequences*
- Why removed: Client has existing newsletter/CRM
- Alternative: Webhook sends to their system

*2. Lead Enrichment (Apollo)*
- Why removed: Not needed for engagement pod
- Alternative: Collect email directly via DM

*3. Lead Magnet Library*
- Why removed: Client provides their link
- Alternative: Simple text field for URL

*4. Content Generation*
- Why removed: Focus on engagement, not creation
- Alternative: User posts manually first

*5. Advanced Analytics*
- Why removed: Early customers don't need dashboards
- Alternative: Slack notifications + basic counts

*6. GoHighLevel Sync*
- Why removed: Webhook covers this
- Alternative: Zapier → GHL (client configures)

---

## Risk Assessment

### High Risk

*1. LinkedIn DM Rate Limits*
- *Risk:* Accounts get flagged/banned for automation
- *Mitigation:* 
  - Conservative limits (50/day)
  - Random delays (2-15 min, not fixed)
  - Human-like typing patterns (future)
  - Start with test accounts

*2. Email Extraction Accuracy*
- *Risk:* AI misses emails or extracts wrong text
- *Mitigation:*
  - Regex validation post-extraction
  - Human review option
  - Confidence scoring

*3. Webhook Reliability*
- *Risk:* Client's endpoint down, lost emails
- *Mitigation:*
  - Retry logic (3x with backoff)
  - Queue dead letters
  - Email fallback notification

### Medium Risk

*4. Unipile API Stability*
- *Risk:* Service outages
- *Mitigation:*
  - Queue-based architecture (persists jobs)
  - Monitor status page
  - Automatic retry on 5xx errors

*5. Mailgun Deliverability*
- *Risk:* Emails marked as spam
- *Mitigation:*
  - Proper SPF/DKIM setup
  - Warm up sending domain
  - Include unsubscribe
  - Personalized sender name

---

## Success Criteria

### Week 1 (MVP Complete)

✅ User can scrape LinkedIn post commenters  
✅ DMs sent asking for email (rate-limited)  
✅ Replies processed, emails extracted  
✅ Emails sent to webhook + Mailgun  
✅ *First paying customer using system*

### Week 2 (Validation)

✅ 3+ engagement pods using system  
✅ 100+ emails captured  
✅ >50% DM reply rate (asking for email)  
✅ Zero LinkedIn account bans  
✅ Positive testimonials

### Week 4 (Scale Decision)

*If successful:*
- Build pod coordination features
- Add multi-account management
- Expand to other social platforms (Twitter/X)

*If not successful:*
- Pivot to different workflow
- Interview churned users
- Consider acqui-hire

---

## Cost Analysis (7-Day MVP)

### Infrastructure

| Service | Cost | Purpose |
|---------|------|---------|
| Supabase (Free Tier) | $0 | Database + Auth |
| Unipile | $99/mo | LinkedIn API |
| OpenAI API | ~$20 | Email extraction (GPT-4o) |
| Redis (Upstash Free) | $0 | Job queue |
| Mailgun (Flex Plan) | $0-15 | Email delivery (first 5K free) |
| Slack (Free) | $0 | User interface |
| *TOTAL* | *$120-135/mo* | |

### Per-Customer Revenue

*Pricing:* $49/month (beta) → $99/month (post-beta)

*Break-even:* 2-3 customers  
*Profitable:* 5+ customers

---

## Engagement Pod Features (Future V2)

*What Chase mentioned but NOT in MVP:*

### Pod Coordination
- 9+ members per pod
- Track who scraped whose posts
- Prevent duplicate DMs to same person
- Rotation schedule
- Member analytics (who's active)

*Point Estimate:* 40 points (Week 2-3)

*Why Not Now:*
- MVP proves core workflow first
- Can coordinate manually via Slack initially
- Complexity doesn't justify value yet

---

## LeadShark Comparison (Post-MVP)

### Feature Parity Matrix

| Feature | LeadShark | RevOS MVP | RevOS V2 |
|---------|-----------|-----------|----------|
| Comment Scraping | ✅ | ✅ | ✅ |
| Auto DM | ✅ | ✅ | ✅ |
| Email Capture | ? | ✅ | ✅ |
| Lead Magnet Delivery | ✅ | ✅ | ✅ |
| CRM Webhook | ❌ | ✅ | ✅ |
| AI Personalization | ? | ✅ | ✅ |
| Pod Coordination | ❌ | ❌ | ✅ |
| Multi-Account | ? | ❌ | ✅ |
| WhiteLabel | ❌ | ❌ | ✅ |

*Competitive Advantage:* Webhook integration + pod coordination

---

## Technical Architecture (Simplified)


┌─────────────────────────────────────────────────┐
│           Slack (User Interface)                │
│    "Scrape this post: linkedin.com/..."         │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│         AgentKit (AI Orchestration)             │
│  - Parse user intent                            │
│  - Call appropriate functions                   │
│  - Generate responses                           │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│         Express.js API Layer                    │
│  POST /scrape-post                              │
│  POST /send-dms                                 │
│  POST /webhooks/unipile (inbound DMs)           │
└────────────┬────────────────────────────────────┘
             │
     ┌───────┴────────┐
     │                │
     ↓                ↓
┌─────────┐    ┌──────────────┐
│ Unipile │    │ BullMQ/Redis │
│  API    │    │  Job Queue   │
└────┬────┘    └──────┬───────┘
     │                │
     │                ↓
     │         ┌─────────────┐
     │         │ DM Worker   │
     │         │ - Send DMs  │
     │         │ - Rate limit│
     │         └──────┬──────┘
     │                │
     └────────┬───────┘
              │
              ↓
┌─────────────────────────────────────────────────┐
│         Supabase PostgreSQL                     │
│  - campaigns table                              │
│  - leads table                                  │
│  - Row-Level Security (multi-tenant)            │
└────────────┬────────────────────────────────────┘
             │
     ┌───────┴────────┐
     │                │
     ↓                ↓
┌──────────┐    ┌───────────┐
│ Mailgun  │    │ Webhook   │
│  SMTP    │    │ to CRM    │
└──────────┘    └───────────┘


---

## Acceptance Criteria Checklist

### Core Workflow

- [ ] User pastes LinkedIn post URL in Slack
- [ ] System scrapes all commenters (names, URLs, comments)
- [ ] DMs sent asking for email (rate-limited to 50/day)
- [ ] DMs sent with random 2-15 min delays
- [ ] Replies processed, emails extracted via AI
- [ ] Emails validated (regex check)
- [ ] Webhook POSTs email to client's CRM
- [ ] Lead magnet emailed via Mailgun
- [ ] User notified in Slack when email captured

### Quality Standards

- [ ] Zero LinkedIn account warnings/bans
- [ ] >90% DM delivery rate (not bounced)
- [ ] >80% email extraction accuracy
- [ ] >95% webhook delivery (with retries)
- [ ] >90% Mailgun delivery rate
- [ ] <5 sec response time (Slack commands)

### Business Validation

- [ ] First paying customer using system
- [ ] >50% DM reply rate (benchmark: 10-20% for cold)
- [ ] Positive feedback from beta users
- [ ] System runs 24 hours without manual intervention
- [ ] Revenue covers infrastructure costs

---

## Next Steps (Immediate)

### Today (Oct 30)
1. *Get approvals:*
   - Chase: Confirm this scope is correct
   - Jonathan: Allocate development time

2. *Acquire credentials:*
   - Unipile API key ($99/mo)
   - Mailgun account (free tier)
   - OpenAI API key (existing?)

3. *Set up infrastructure:*
   - Supabase project
   - Redis instance (Upstash)
   - Slack workspace

### Tomorrow (Oct 31) - Day 1 Begins
- Session 1: Supabase schema + RLS policies
- Session 2: Unipile API integration + comment scraping
- Session 3: Test with real LinkedIn posts

---

## FAQ

*Q: Why not use LinkedIn's official API?*  
A: LinkedIn's API doesn't allow automated DMs. Unipile provides unofficial but reliable access.

*Q: Is this legal/ToS-compliant?*  
A: Gray area. Use test accounts first, conservative limits, human-like patterns. Risk accepted per Chase.

*Q: Why Mailgun instead of Instantly/Smartlead?*  
A: Simpler for MVP. One-off emails, not sequences. Mailgun is $0 for first 5K/month.

*Q: Can we add pod coordination later?*  
A: Yes! Designed for it. V2 adds pod member management, rotation schedules, duplicate prevention.

*Q: What if Unipile goes down?*  
A: Queue persists jobs. Automatic retry. Manual CSV export as fallback.

---

## Appendix: AgroArchon Comparison

*Agro Archon Complexity (Reference Point):*
- Full-stack app (React + Express + database)
- Multi-tenant auth
- Complex workflow orchestration
- Built in 3 days solo

*Estimated at:* ~100 points (33 pts/day × 3 days)

*RevOS MVP Complexity:*
- Similar stack, simpler workflows
- Fewer features than AgroArchon
- More API integrations (Unipile, Mailgun)
- *Estimate:* 90-100 points (7 days @ 13-15 pts/day)

*Confidence:* High. This is achievable with AI-assisted dev in Cursor.

---

## Conclusion

*The V1 V1 V1:*
- *V1:* Engagement pod automation (this MVP)
- *V2:* Multi-account management + pod coordination
- *V3:* Full RevOS platform (Google Ads, Meta, analytics)

*This 7-day sprint builds:*
✅ Comment scraping  
✅ DM automation  
✅ Email capture  
✅ CRM webhook  
✅ Lead magnet delivery  
✅ Slack interface  

*What it proves:*
- Market demand (LeadShark exists, we can compete)
- Technical feasibility (workflow automation)
- Business model (SaaS pricing, break-even at 3 customers)

*Total Budget:* 100 points over 7 days  
*Critical Path:* 75 points (MVP complete)  
*Buffer:* 25 points (polish + contingency)

*Ready to build?* 🚀