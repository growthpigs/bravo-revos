# Functional Specification Document - RevOS

## Overview

This document defines **how users interact with RevOS** from a functional perspective. It bridges business requirements (Product Vision) and technical implementation (Technical Architecture) by detailing:

- User personas
- User journey maps
- Detailed user flows
- Wireframe descriptions (for Bolt.new)
- Interaction patterns
- Acceptance criteria

---

## User Personas

### Persona 1: Chase (Super Admin)

**Demographics:**
- Age: 35-45
- Role: RevOS Founder
- Technical Skill: High
- LinkedIn: 10,000+ connections

**Goals:**
- Monitor all clients' campaigns
- Track costs (OpenAI, Apollo, Unipile)
- Identify performance issues
- Support clients when needed
- Optimize system performance

**Pain Points:**
- Need visibility across ALL tenants
- Must troubleshoot client issues quickly
- Track profitability per client
- Ensure quality (review AI-generated content)

**Primary Use Cases:**
1. View system-wide analytics
2. Access any client's account for support
3. Review AI-generated content quality
4. Monitor API costs and usage
5. Manage client subscriptions

**Preferred Interaction:**
- AgentKit chat: "Show me all campaigns with <10% reply rate"
- Dashboard: Quick overview of system health
- Slack: Alerts for issues

---

### Persona 2: Rachel (Client - Executive Coach)

**Demographics:**
- Age: 48
- Business: Leadership coaching for VPs/C-suite
- Revenue: $800k/year
- Team: Solo + 1 VA
- LinkedIn: 8,000 connections
- Tech Savvy: Medium (uses Calendly, Zoom, basic CRM)

**Goals:**
- Generate 20-30 qualified leads/month
- Book 10-15 discovery calls/month
- Close 2-3 new clients/month ($10k packages)
- Spend <1 hour/week on lead gen
- Maintain authentic voice

**Pain Points:**
- Too busy to post/engage daily on LinkedIn
- Inconsistent lead flow (feast or famine)
- Manual DM outreach takes forever
- Hard to track who she's messaged
- Doesn't want to "learn another tool"

**Primary Use Cases:**
1. Approve/edit AI-generated LinkedIn posts
2. Review leads generated from campaigns
3. See who replied to DMs/emails
4. Check weekly performance summary

**Preferred Interaction:**
- Slack: "New reply from [Lead Name]" notifications
- Email: Weekly summary (no login needed)
- Minimal dashboard use (only when curious)

---

### Persona 3: Jake (Client - Startup Founder)

**Demographics:**
- Age: 32
- Business: B2B SaaS (project management tool)
- Stage: Pre-seed ($500k raised)
- Team: 4 people (2 eng, 1 design, Jake)
- LinkedIn: 3,500 connections
- Tech Savvy: Very high

**Goals:**
- Find 50-100 early adopters
- Get 20 product demos booked/month
- Convert 10% to beta users
- Build personal brand as founder
- Network with other founders

**Pain Points:**
- Building product full-time, can't do outreach
- Generic cold emails don't work
- Need to show progress to investors
- Want data/metrics to optimize

**Primary Use Cases:**
1. Create campaigns around product updates
2. Generate content about startup lessons
3. Track conversion funnel (comment → demo → signup)
4. A/B test different messaging

**Preferred Interaction:**
- AgentKit chat: "Create campaign for our new feature launch"
- Dashboard: Loves metrics, checks daily
- PostHog: Wants to see detailed analytics

---

## User Journey Maps

### Journey 1: Rachel's First Campaign (Happy Path)

**Context:** Rachel just signed up. She posted on LinkedIn about "imposter syndrome in leadership" and got 50+ comments.

#### Step 1: Onboarding (5 minutes)

**What happens:**
1. Rachel receives welcome email with Slack invite
2. Joins RevOS Slack workspace
3. Sees message: "Hi Rachel! I'm your RevOS assistant. Let's create your first campaign. What LinkedIn post got good engagement recently?"

**User actions:**
- Clicks Slack invite
- Joins #rachel-campaigns channel
- Pastes LinkedIn post URL

**System actions:**
- Creates Slack channel
- Loads Rachel's default cartridge (Executive Coach)
- Prepares to scrape post

**UI elements:** (None - Slack only)

**Acceptance criteria:**
- [ ] Onboarding email sent within 1 minute of signup
- [ ] Slack channel created automatically
- [ ] AgentKit introduces itself clearly

---

#### Step 2: Campaign Creation (3 minutes)

**What happens:**
1. AgentKit scrapes post via Unipile
2. Finds 47 commenters
3. Asks: "Found 47 people who commented. Should I enrich them and send personalized DMs?"

**User actions:**
- Rachel: "Yes, please!"

**System actions:**
- Creates campaign in database
- Queues 47 leads for enrichment
- Shows progress: "Enriching leads... 10/47... 47/47 complete!"
- "Found emails for 32 people. Generating personalized DMs..."

**UI elements:** (Slack messages with progress updates)

**Acceptance criteria:**
- [ ] Scraping completes in <30 seconds
- [ ] Progress updates every 10 leads
- [ ] Clear summary at end

---

#### Step 3: DM Approval (Optional, 2 minutes)

**What happens:**
1. AgentKit: "Here are 3 sample DMs I'll send. Want to review?"
2. Shows 3 examples:

```
DM 1 (to Sarah):
"Sarah - your comment about building trust with remote teams really hit home. 
I just created a guide on the 5 conversations every remote leader must have. 
Want me to send it over?"

DM 2 (to Mike):
"Mike - loved your point about vulnerability in leadership. 
I work with VPs navigating exactly this. 
Created a free assessment that might help - interested?"

DM 3 (to Lisa):
"Lisa - your story about that difficult team conversation resonated. 
I published a framework for these moments. 
Happy to share if useful?"
```

3. AgentKit: "Sound good? I'll send similar messages to all 32 people over the next 48 hours (rate-limited to stay safe)."

**User actions:**
- Rachel: "These are perfect! Send them."
- OR: "Can you make them a bit more casual?"

**System actions:**
- If approved: Queue all 32 DMs
- If feedback: Regenerate samples, show again
- Update Mem0 with approval/feedback

**UI elements:** (Slack message with DM previews)

**Acceptance criteria:**
- [ ] 3 diverse examples shown
- [ ] User can approve or request changes
- [ ] Changes applied to all messages

---

#### Step 4: DMs Sending (Automated, 48 hours)

**What happens:**
1. Background queue sends DMs staggered over 48 hours
2. Rachel receives Slack notification for each reply:
   - "📩 Sarah replied: 'Yes please! Send the guide.'"

**User actions:**
- Rachel clicks notification
- Sees full conversation
- Replies directly OR asks AgentKit to handle

**System actions:**
- Send DMs via Unipile (rate-limited)
- Monitor for replies via webhook
- Notify Rachel instantly when reply received

**UI elements:**
- Slack notifications (rich preview with reply text)
- Link to LinkedIn conversation

**Acceptance criteria:**
- [ ] All 32 DMs sent within 48 hours
- [ ] No more than 20/day (rate limit)
- [ ] Reply notifications <1 min delay

---

#### Step 5: Email Fallback (Automated, Day 3)

**What happens:**
1. AgentKit: "15 people haven't replied to DMs yet. Should I send them a follow-up email?"

**User actions:**
- Rachel: "Yes"

**System actions:**
- Generates 3-email sequence per non-responder
- Creates Instantly campaigns
- Sends Email 1 immediately
- Email 2 after 3 days
- Email 3 after 7 days

**UI elements:** (Slack message asking permission)

**Acceptance criteria:**
- [ ] Only targets non-responders (not everyone)
- [ ] Asks permission before emailing
- [ ] Email content matches LinkedIn tone

---

#### Step 6: Results Summary (Day 7)

**What happens:**
1. Rachel receives email: "Your first campaign results are in!"

```
Subject: Rachel, you got 12 leads this week! 🎉

Hey Rachel,

Your "Imposter Syndrome in Leadership" campaign just wrapped up.

Here's what happened:

✅ 47 people scraped from comments
✅ 32 emails found (68% success rate)
✅ 32 DMs sent
✅ 12 replied (37.5% reply rate!)
✅ 8 booked discovery calls

🔥 Top performing message:
"Sarah - your comment about building trust with remote teams..."
(5 replies from this variation)

Next steps:
- Follow up with the 8 scheduled calls
- Want to run another campaign? Just paste a new LinkedIn post URL in Slack!

Your RevOS Assistant
```

**User actions:**
- Reads email
- Clicks "View Full Report" (optional)
- Replies in Slack to start next campaign

**System actions:**
- Compile campaign stats
- Send summary email
- Update dashboard

**UI elements:**
- Email with clear metrics
- Optional dashboard link

**Acceptance criteria:**
- [ ] Email sent exactly 7 days after campaign start
- [ ] Metrics accurate (matches database)
- [ ] Clear next steps provided

---

### Journey 2: Chase Monitoring System Health (Super Admin)

#### Step 1: Daily Health Check (2 minutes)

**What happens:**
1. Chase opens RevOS dashboard
2. Sees system overview:

```
[DASHBOARD - SUPER ADMIN VIEW]

System Health: ✅ All systems operational
Uptime: 99.8% (last 7 days)

Active Clients: 47
Campaigns Running: 23
DMs Sent Today: 342

Cost Overview (Today):
- OpenAI: $127.50
- Apollo: $45.00
- Total: $172.50
Per-Client Avg: $3.67/day

⚠️ Alerts:
- Client "Jake" exceeded 1000 Apollo credits (needs upgrade)
- 2 failed DMs (LinkedIn rate limit - retrying)
```

**User actions:**
- Reviews metrics
- Clicks "Jake" alert to investigate

**System actions:**
- Fetch real-time data from PostHog + Supabase
- Calculate costs from usage logs
- Surface alerts

**UI elements:**
- Dashboard (Cards for each metric)
- Color-coded alerts (yellow = warning, red = critical)

**Wireframe description:**
```
+--------------------------------------------------+
| RevOS | [All Clients v] | Chase (Super Admin) |
+--------------------------------------------------+
| 🟢 System Health | 📊 Active Campaigns | 💰 Costs |
|                  |                      |             |
| 99.8% Uptime     | 23 running           | $172/day    |
| 47 clients       | 342 DMs sent today   | $3.67/client|
+--------------------------------------------------+
| ⚠️ Alerts (2)                                     |
|                                                  |
| 🟡 Jake exceeded Apollo credits (1000/500)       |
|    [View Details] [Upgrade Client]              |
|                                                  |
| 🟡 2 failed DMs (rate limit) - Retrying...        |
|    [View Queue]                                  |
+--------------------------------------------------+
```

**Acceptance criteria:**
- [ ] Dashboard loads in <2s
- [ ] All metrics update real-time
- [ ] Alerts actionable (has "Fix" button)

---

#### Step 2: Client Support (5 minutes)

**What happens:**
1. Rachel messages Chase in Slack: "My DMs aren't sending?"
2. Chase asks AgentKit: "Debug Rachel's campaign"

**AgentKit response:**
```
Checking Rachel's campaigns...

✅ Campaign: "Imposter Syndrome" - Active
✅ 32 DMs queued
⚠️ Issue found: LinkedIn account not connected

Rachel's Unipile account expired (auth token refresh failed).

Fix: Send Rachel this link to re-authorize:
https://unipile.com/oauth?client=rachel

Want me to send it to her?
```

**User actions:**
- Chase: "Yes, send the link and explain what happened"

**System actions:**
- AgentKit sends Slack message to Rachel
- Logs support ticket
- Monitors for re-auth completion

**UI elements:** (Slack conversation)

**Acceptance criteria:**
- [ ] AgentKit can diagnose common issues
- [ ] Provides fix steps (not just "error")
- [ ] Chase can delegate response to AgentKit

---

### Journey 3: Jake Analyzing Performance (Power User)

#### Step 1: Campaign Analytics Deep Dive (10 minutes)

**What happens:**
1. Jake opens dashboard
2. Navigates to "Campaigns" tab
3. Clicks on "Product Launch - New Feature"
4. Sees detailed funnel:

```
[CAMPAIGN DETAIL VIEW]

Campaign: "Product Launch - New Feature"
Created: Oct 15, 2025 | Status: Active | Duration: 14 days

Funnel:
100 Comments Scraped
  ↓
68 Emails Found (68%)
  ↓
68 DMs Sent
  ↓
24 Replied (35.3%)
  ↓
12 Booked Demos (50% of replies)
  ↓
4 Converted to Beta (33% of demos)

Top Performing Message (8 replies):
"[Name] - saw you're building in the project management space too. 
We just shipped async updates - game changer for remote teams. 
Want a quick demo?"

Lead Magnet Used: "Remote Team Productivity Guide"
Downloads: 18 | Conversion: 75% (18/24 replies)

Next Steps:
- 8 demos scheduled (this week)
- 4 in trial (monitor usage)
- 12 no-response (trigger email sequence?)
```

**User actions:**
- Reviews funnel
- Clicks "View Top Message" to see variations
- Decides to trigger email sequence for non-responders

**System actions:**
- Fetch campaign data from Supabase
- Calculate conversion rates
- Surface top-performing content

**UI elements:**
- Funnel visualization (Recharts)
- Expandable message previews
- Action buttons ("Trigger Email", "Duplicate Campaign")

**Wireframe description:**
```
+--------------------------------------------------+
| < Back to Campaigns                              |
+--------------------------------------------------+
| Product Launch - New Feature        [Active]     |
| Oct 15, 2025 | 14 days running                    |
+--------------------------------------------------+
| Funnel (Interactive Chart)                       |
|                                                  |
|  100 ----─68% Enrichment---→ 68                   |
|           └--35% Reply------→ 24                   |
|                    └--50% Demo--→ 12               |
|                             └--33%--→ 4           |
|                                                  |
| [Hover for details]                              |
+--------------------------------------------------+
| Top Message (8 replies / 24 sent = 33%)          |
|                                                  |
| "[Name] - saw you're building in the project..." |
| [View All Variations]                            |
+--------------------------------------------------+
| Actions                                          |
| [Trigger Email Sequence] [Duplicate Campaign]    |
| [Export Leads]           [Archive]               |
+--------------------------------------------------+
```

**Acceptance criteria:**
- [ ] Funnel updates real-time
- [ ] Can drill down into each stage
- [ ] Export leads to CSV

---

## Detailed User Flows

### Flow 1: Content Generation & Approval

**Trigger:** Client wants to create a LinkedIn post

**Flow:**

1. **User → AgentKit (Slack):**
   - "Create a post about overcoming team conflict"

2. **AgentKit:**
   - Loads cartridge (retrieves voice/tone from Mem0)
   - Searches web for latest trends on topic
   - Calls Context7 for research
   - Generates post using GPT-4o + cartridge prompt
   - Generates image using Canva MCP

3. **AgentKit → User (Slack):**
   - Posts preview:

```
📑 Draft Post:

"I had a VP tell me yesterday: 'My team isn't arguing anymore... 
and that terrifies me.'

Silence isn't harmony. It's fear.

Here's how to create psychological safety where healthy conflict thrives:

1. Reward dissent publicly
2. Share your own mistakes first  
3. Ask 'What am I missing?' in every meeting

Conflict isn't the problem. Silence is.

What's your take?"

🖼️ [Image Preview: Quote card with key point]

✅ Approve | ✏️ Edit | ❌ Reject
```

4. **User Decision Tree:**

**If Approve:**
- AgentKit: "Perfect! When should I post this?"
- User: "Tomorrow at 9 AM EST"
- AgentKit: "Scheduled for Oct 28, 9 AM EST. I'll notify you when it's live."
- System schedules post in Supabase
- Unipile publishes at scheduled time

**If Edit:**
- User: "Make it more casual, less formal"
- AgentKit: "Got it, regenerating..."
- Updates Mem0 with feedback ("prefer casual tone")
- Shows new version
- Loop until approved

**If Reject:**
- User: "Not the right angle. Focus on remote teams specifically."
- AgentKit: "Understood. Regenerating for remote teams..."
- Starts over with new angle

**UI Elements:**
- Slack message with rich preview
- Emoji reactions for quick approve/reject
- Reply for detailed feedback

**Acceptance Criteria:**
- [ ] Post generated in <30 seconds
- [ ] Image matches post content
- [ ] Scheduling works across time zones
- [ ] Feedback updates Mem0 for future posts

---

### Flow 2: Lead Magnet Selection

**Trigger:** AgentKit needs to offer lead magnet in DM

**Flow:**

1. **System (Automatic):**
   - Campaign created for "Team Building" topic
   - AgentKit needs relevant lead magnet

2. **AgentKit (Internal):**
   - Queries lead magnet library
   - Semantic search: "team building executive coach"
   - Returns top 3 matches:
     1. "5 Conversations Every Leader Must Have" (95% match)
     2. "Building High-Trust Teams Framework" (87% match)
     3. "1-on-1 Meeting Template" (82% match)

3. **AgentKit → User (Slack):**

```
🎯 Choosing lead magnet for your campaign...

Top match: "5 Conversations Every Leader Must Have"
- Category: Guide
- Performance: 78% download rate, 42% conversion
- Best for: Executive coaches targeting new managers

[Preview PDF]

Use this one? Or see alternatives?
```

4. **User Decision:**

**If Approved:**
- AgentKit uses in all DMs

**If Alternatives:**
- Shows #2 and #3
- User picks one

**If Custom:**
- User: "Can you create one specifically about remote teams?"
- AgentKit: "Sure! Generating custom version..."
- Calls Context7 for research
- Generates content via GPT-4o
- Designs PDF via Canva
- Shows preview
- User approves
- Saves to library

**UI Elements:**
- PDF preview (thumbnail + download link)
- Performance data (builds trust)
- Option to customize

**Acceptance Criteria:**
- [ ] Search returns relevant matches
- [ ] Can preview before approving
- [ ] Custom generation works in <2 minutes
- [ ] New lead magnets saved to library

---

## Wireframe Descriptions (For Bolt.new)

### Screen 1: Super Admin Dashboard

**Purpose:** Chase's daily health check

**Layout:**

```
+--------------------------------------------------+
|  RevOS Logo  |  [All Clients ▼]  |  Chase 👤  |
+--------------------------------------------------+
| 🏗️ Dashboard | 📊 Campaigns | 👥 Clients | ⚙️ |
+--------------------------------------------------+
|                                                  |
|  System Health                                   |
|  +--------------------------------------------+  |
|  | 🟢 All Systems Operational               |  |
|  | Uptime: 99.8% (7 days)                     |  |
|  | Last incident: None                        |  |
|  +--------------------------------------------+  |
|                                                  |
|  +--------------------+  +--------------------+  |
|  | 👥 Active Clients  |  | 📊 Campaigns      |  |
|  |                    |  |                    |  |
|  |   47 clients       |  |   23 running       |  |
|  |   +12% vs last mo  |  |   342 DMs today    |  |
|  +--------------------+  +--------------------+  |
|                                                  |
|  +--------------------+  +--------------------+  |
|  | 💰 Costs Today    |  | 📈 Performance    |  |
|  |                    |  |                    |  |
|  |   $172.50          |  |   34% avg reply    |  |
|  |   $3.67/client     |  |   12% call rate    |  |
|  +--------------------+  +--------------------+  |
|                                                  |
|  ⚠️ Alerts (2)                                   |
|  +--------------------------------------------+  |
|  | 🟡 Jake exceeded Apollo credits          |  |
|  |    [View] [Upgrade]                        |  |
|  |                                            |  |
|  | 🟡 2 DMs failed (rate limit)              |  |
|  |    [View Queue]                            |  |
|  +--------------------------------------------+  |
|                                                  |
|  Recent Activity                                 |
|  +--------------------------------------------+  |
|  | 2 min ago | Rachel's campaign got 3 replies |  |
|  | 15 min ago | Jake created new campaign      |  |
|  | 1 hr ago | System sent 47 DMs             |  |
|  +--------------------------------------------+  |
|                                                  |
+--------------------------------------------------+
```

**Components:**
- Header with client selector (dropdown)
- 4 metric cards (clients, campaigns, costs, performance)
- Alerts section (dismissible)
- Activity feed (real-time via Supabase real-time)

**Interactions:**
- Click metric card → Drill down view
- Click alert → Detail modal
- Hover activity → Show full details

**Bolt.new Prompt:**

```
Create a Super Admin dashboard with:
- Header: Logo left, client dropdown center, user menu right
- Nav tabs: Dashboard, Campaigns, Clients, Settings
- System health card (green if ok, red if issues)
- 4 metric cards in 2x2 grid: Active Clients, Campaigns, Costs, Performance
- Alerts section with yellow warning cards
- Activity feed (scrollable)

Use Tailwind, Recharts for charts, Supabase for data.
Make it responsive (mobile: stack cards vertically).
```

---

### Screen 2: Campaign Detail View

**Purpose:** Analyze single campaign performance

**Layout:**

```
+--------------------------------------------------+
| < Back to Campaigns                              |
+--------------------------------------------------+
| Product Launch - New Feature        [Active 🟢] |
| Created: Oct 15, 2025 | Duration: 14 days        |
| Client: Jake (@jakestartup)                      |
+--------------------------------------------------+
|                                                  |
| Conversion Funnel                                |
| +----------------------------------------------+ |
| |                                              | |
| |  100 Comments --------─68%-------→ 68 Enriched | |
| |                                           |  | |
| |                     35% ↓                 |  | |
| |                                           |  | |
| |                  24 Replied               |  | |
| |                     |                     |  | |
| |                  50% ↓                    |  | |
| |                                           |  | |
| |                 12 Demos                  |  | |
| |                     |                     |  | |
| |                  33% ↓                    |  | |
| |                                           |  | |
| |                 4 Signups                 |  | |
| |                                              | |
| +----------------------------------------------+ |
|                                                  |
| Messages Sent (68 total)                         |
| +----------------------------------------------+ |
| | Top Performer (24 sent, 8 replies = 33%)     | |
| |                                              | |
| | "[Name] - saw you're building in the         | |
| | project management space too..."             | |
| |                                              | |
| | [View Full] [Use in New Campaign]           | |
| +----------------------------------------------+ |
|                                                  |
| Lead Magnet Performance                          |
| +----------------------------------------------+ |
| | "Remote Team Productivity Guide"             | |
| | Downloads: 18 / 24 (75%)                     | |
| | Conversions: 12 / 18 (67%)                   | |
| +----------------------------------------------+ |
|                                                  |
| Actions                                          |
| [Trigger Email Sequence] [Duplicate Campaign]    |
| [Export Leads (CSV)]     [Archive Campaign]      |
|                                                  |
+--------------------------------------------------+
```

**Components:**
- Breadcrumb navigation
- Campaign header (status badge)
- Funnel chart (Recharts Sankey diagram)
- Message performance cards
- Lead magnet stats
- Action buttons

**Interactions:**
- Click funnel stage → See lead list at that stage
- Click message → Expand full text + variations
- Click "Trigger Email" → Confirmation modal
- Click "Export" → Download CSV

**Bolt.new Prompt:**

```
Create campaign detail page with:
- Breadcrumb back navigation
- Campaign title + status badge (Active/Complete/Paused)
- Sankey diagram funnel (100 → 68 → 24 → 12 → 4)
- Top performing message card (expandable)
- Lead magnet performance metrics
- Action buttons: Trigger Email, Duplicate, Export, Archive

Fetch data from Supabase campaigns + leads tables.
Use Recharts for funnel visualization.
```

---

### Screen 3: Approval Queue

**Purpose:** Client reviews AI-generated content before publishing

**Layout:**

```
+--------------------------------------------------+
| Approval Queue                    Rachel's View  |
+--------------------------------------------------+
| Filter: [All ▼] [Posts] [DMs] [Emails]           |
+--------------------------------------------------+
|                                                  |
| Pending (3)                                      |
|                                                  |
| +----------------------------------------------+ |
| | POST | Created 2 hrs ago                     | |
| |----------------------------------------------| |
| | "I had a VP tell me yesterday: 'My team..." | |
| |                                              | |
| | [Preview Image]                              | |
| |                                              | |
| | Scheduled: Tomorrow 9 AM EST                 | |
| |                                              | |
| | [✅ Approve] [✏️ Edit] [❌ Reject]              | |
| +----------------------------------------------+ |
|                                                  |
| +----------------------------------------------+ |
| | DM | For campaign: "Imposter Syndrome"       | |
| |----------------------------------------------| |
| | To: Sarah Johnson                            | |
| | "Sarah - your comment about building trust...| |
| |                                              | |
| | [✅ Approve] [✏️ Edit] [❌ Reject]              | |
| +----------------------------------------------+ |
|                                                  |
| +----------------------------------------------+ |
| | EMAIL | Sequence Step 1 (15 recipients)      | |
| |----------------------------------------------| |
| | Subject: "Quick question about your team..."| |
| | "Hi [Name], I noticed you commented on..."  | |
| |                                              | |
| | [✅ Approve All] [✏️ Edit Template] [❌ Reject] | |
| +----------------------------------------------+ |
|                                                  |
| Approved (Last 7 days) - 12 items                |
| [Show History]                                   |
|                                                  |
+--------------------------------------------------+
```

**Components:**
- Filter tabs
- Pending items (cards)
- Each card shows: type, preview, target, actions
- Approved history (collapsible)

**Interactions:**
- Click "✅ Approve" → Instant publish/queue
- Click "✏️ Edit" → Inline editor opens
- Click "❌ Reject" → Sends to AgentKit to regenerate
- Click "Show History" → Expand approved list

**Bolt.new Prompt:**

```
Create approval queue dashboard:
- Filter tabs (All, Posts, DMs, Emails)
- Pending items as cards with:
  - Type badge (POST/DM/EMAIL)
  - Preview text (truncated)
  - Image preview (if applicable)
  - Target info (who/when)
  - Action buttons (Approve, Edit, Reject)
- Approved history section (collapsible)
- Use optimistic updates (instant UI feedback)

Fetch from Supabase approval_queue table.
Update via PostgREST API on button click.
```

---

## Interaction Patterns

### Pattern 1: AgentKit Chat (Primary Interface)

**Where:** Slack (primary), Dashboard chat widget (secondary)

**Interaction:**
- User types natural language
- AgentKit responds conversationally
- Can ask follow-up questions
- Can request approvals
- Can show rich previews (images, links, buttons)

**Example:**

```
User: "How's my campaign doing?"

AgentKit: "Your 'Imposter Syndrome' campaign is crushing it! 🚀

24 replies so far (37.5% reply rate)
8 discovery calls booked

Want to see the full breakdown?"

User: "Yes"

AgentKit: [Sends dashboard link + inline summary]
```

**Guidelines:**
- Keep responses <200 words
- Use emojis sparingly (not every message)
- Always offer next action ("Want me to...?")
- Link to dashboard for deep dives

---

### Pattern 2: Slack Notifications

**Triggers:**
- Lead replied to DM
- Campaign completed
- Error/issue occurred
- Weekly summary ready

**Format:**

```
📩 New Reply - Sarah Johnson

Campaign: "Imposter Syndrome"

"Yes please! Send the guide. Also, do you offer 1-on-1 coaching?"

[Reply in LinkedIn] [Ask AgentKit to Respond]
```

**Guidelines:**
- Actionable (has buttons)
- Shows context (campaign name)
- Includes full reply text
- Link to conversation

---

### Pattern 3: Email Summaries (Weekly)

**Sent:** Every Monday 9 AM client's timezone

**Format:**

```
Subject: Rachel, you got 27 leads last week! 🎉

[Plain text email]

Hey Rachel,

Your LinkedIn growth last week:

✅ 2 campaigns running
✅ 84 comments scraped
✅ 57 emails found
✅ 27 people replied
✅ 14 discovery calls booked

Top campaign:
"Building High-Trust Teams" - 15 replies (42% rate!)

Low performer:
"Executive Presence" - 4 replies (18% rate)
Want to tweak the messaging?

Reply to this email or ping me in Slack to adjust!

Your RevOS Assistant

P.S. You have 3 posts waiting for approval in Slack.
```

**Guidelines:**
- Plain text (not HTML)
- Celebratory tone for wins
- Constructive for underperformers
- Clear next actions

---

## Acceptance Criteria Summary

### Global Requirements

**Performance:**
- [ ] All pages load in <2s
- [ ] Dashboard updates real-time (Supabase real-time)
- [ ] Slack notifications <1 min delay
- [ ] Mobile responsive (works on phone)

**Accessibility:**
- [ ] Keyboard navigation works
- [ ] Color contrast meets WCAG AA
- [ ] Screen reader compatible

**Security:**
- [ ] RLS policies enforce tenant isolation
- [ ] Super admin can access all tenants
- [ ] Session expires after 7 days
- [ ] API keys never exposed client-side

**UX:**
- [ ] Empty states for new users ("No campaigns yet")
- [ ] Loading states for all async operations
- [ ] Error messages actionable ("Try X" not "Error 500")
- [ ] Success toasts for confirmations

---

## Next Steps

Use this FSD to:

1. **Generate UI with Bolt.new** (paste wireframe descriptions as prompts)
2. **Validate with Chase** (are these the right user journeys?)
3. **Configure AgentKit** (user flows define agent workflows)
4. **Test with beta clients** (Rachel, Jake personas)

See companion documents:
- **Product Vision** - Business strategy
- **Technical Architecture** - How it's built
- **Interface Spec** - API contracts (next document)