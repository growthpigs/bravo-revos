# Task Corrections V2 - Based on User Feedback

## Critical Issues to Fix

### 1. ❌ Bolt.new Tasks - Missing 2 Critical Tasks!

**INCORRECT (Current):**
- 1 task: "Bolt.new Project Scaffold" (15 points)

**CORRECT (Should be):**
- T001: Generate Database Schema with Bolt.new (5 points)
- T002: Generate Admin Portal with Bolt.new (5 points)
- T003: Generate Client Portal with Bolt.new (5 points)

**Note:** User will create these in Bolt.new, push to GitHub, then we pull down. We don't create them.

---

### 2. ❌ Engagement Pods - Completely Wrong Understanding!

**MY MISTAKE:**
- "Fair rotation algorithm"
- "Select 3-5 members"
- "Lowest participation score"

**CORRECT IMPLEMENTATION:**
Engagement pods = EVERYONE engages with EVERYTHING
- 9+ members minimum
- When ANY member posts, ALL other members:
  - Like within 30 minutes
  - Comment within 1-3 hours
  - Instant repost (not "repost with thoughts" - 12x less effective)
- NO selection, NO rotation - EVERYONE participates EVERY time

**Critical timing:** First 30 min to 3 hours determines reach

---

### 3. ❌ Missing/Incorrect Features

**Missing:**
- Lead magnet file upload to Supabase Storage
- Campaign targeting (which posts to monitor)
- DM template management with variables
- Email template for Mailgun delivery
- Unsubscribe handling for CAN-SPAM compliance

**Incorrect:**
- Comment scraping via webhooks (Unipile doesn't support - must poll)
- Resharing in MVP (V2 only with Playwright)

---

## Corrected Task List (100 Points Total)

### SESSION 1: Bolt.new Scaffolds (15 points)

#### T001: Generate Database Schema with Bolt.new (5 points)
**User Action Required:** Create in Bolt.new
```
Prompt for Bolt.new:
"Create a Supabase database schema for a LinkedIn lead magnet system with:
- Multi-tenant structure (agencies → clients → users)
- campaigns table (name, post_url, dm_template, webhook_url, lead_magnet_url)
- leads table (email, first_name, last_name, linkedin_url, campaign_id, status)
- linkedin_sessions table (encrypted credentials, account_id, user_id)
- cartridges table (4-tier: system, workspace, user, skills)
- pods table (name, min 9 members)
- pod_members table (user_id, pod_id, linkedin_account_id)
- messages table (DM tracking)
- webhooks table (delivery tracking)
Generate TypeScript types and Supabase client setup"
```

#### T002: Generate Admin Portal with Bolt.new (5 points)
**User Action Required:** Create in Bolt.new
```
Prompt for Bolt.new:
"Create Next.js 14 admin portal with shadcn/ui for LinkedIn lead magnet system:
- /admin/campaigns - CRUD for campaigns with DM templates
- /admin/pods - Create pods, invite members, monitor activity
- /admin/linkedin - Connect LinkedIn accounts via Unipile
- /admin/monitoring - Real-time metrics dashboard
- /admin/webhooks - Test webhook endpoints
Use App Router, TypeScript, Tailwind CSS"
```

#### T003: Generate Client Portal with Bolt.new (5 points)
**User Action Required:** Create in Bolt.new
```
Prompt for Bolt.new:
"Create Next.js 14 client portal with shadcn/ui:
- /dashboard - Campaign metrics and lead counts
- /campaigns/new - Create campaign wizard
- /campaigns/[id] - Campaign details and lead list
- /settings - Webhook URL, Mailgun config
- /leads - Export leads as CSV
Multi-tenant with RLS, App Router, TypeScript"
```

---

### SESSION 2: Cartridge System (20 points)

#### T004: Implement Cartridge Database & API (8 points)
- Create cartridges table with 4-tier hierarchy
- RLS policies for tenant isolation
- CRUD API endpoints
- Load trigger mechanism (keywords, contexts)

#### T005: Voice Auto-Generation from LinkedIn (7 points)
- Fetch last 30 posts via Unipile API
- GPT-4o analysis for tone/style extraction
- Store voice parameters in cartridge
- Auto-generation flag

#### T006: Cartridge Management UI (5 points)
- Progressive disclosure (system → workspace → user → skills)
- Instruction editor with templates
- Voice preview and customization
- Load trigger configuration

---

### SESSION 3: Unipile + BullMQ + DM (20 points)

#### T007: Unipile Integration & Session Management (5 points)
- Username/password authentication flow
- Session storage in linkedin_sessions (encrypted)
- Token refresh handling
- $5.50/account/month billing tracking

#### T008: Comment Polling System (7 points)
**CRITICAL:** NO webhooks for comments - must poll
- Poll every 15-30 min (randomized)
- Store last_polled timestamp
- Extract NEW comments only
- Queue DM jobs for new commenters

#### T009: BullMQ DM Automation (8 points)
- Upstash Redis setup
- Rate limiting: 50 DMs/day per account
- Random delays: 2-15 minutes
- Template variables: {first_name}, {lead_magnet_name}
- Retry logic with exponential backoff

---

### SESSION 4: Email Capture + Webhook + Mailgun (20 points)

#### T010: Email Extraction Pipeline (5 points)
- Monitor DM replies via Unipile webhook (new_message)
- GPT-4o email extraction
- Update lead status: 'dm_sent' → 'email_captured'
- Handle edge cases (no email, multiple emails)

#### T011: Webhook Delivery System (10 points)
**NOT email sending - just HTTP POST**
- Configure webhook URL per campaign
- POST payload with lead data
- Retry logic (3 attempts, exponential backoff)
- Delivery tracking and logs
- Test webhook UI button

#### T012: Lead Magnet Storage & URL Generation (5 points)
**Upload lead magnets and generate download URLs**
- Upload PDF/resources to Supabase Storage
- Generate secure download links (24hr expiry)
- Include download URL in webhook payload
- Client's ESP sends the actual email
- We ONLY provide the data, client handles delivery

---

### SESSION 5: Engagement Pods - CORRECTED (15 points)

#### T013: Pod Infrastructure (5 points)
- pods, pod_members, pod_activity tables
- Min 9 members validation
- Activity tracking (who engaged with what)
- Notification system for pod members

#### T014: LinkedIn Session Capture for Pods (5 points)
- Unipile hosted auth for each member
- Store account_id in pod_members
- Session health monitoring
- Re-authentication flow

#### T015: Pod Automation Engine (5 points)
**EVERYONE engages with EVERYTHING:**
```javascript
// When any pod member posts
async function onPodMemberPost(postUrl, posterId, podId) {
  const members = await getPodMembers(podId);
  const otherMembers = members.filter(m => m.id !== posterId);

  for (const member of otherMembers) {
    // Like within 30 minutes (critical window)
    await queueJob('like-post', {
      accountId: member.linkedin_account_id,
      postUrl,
      delay: randomBetween(1, 30) * 60 * 1000 // 1-30 min
    });

    // Comment within 1-3 hours
    await queueJob('comment-post', {
      accountId: member.linkedin_account_id,
      postUrl,
      comment: generateComment(member.voice),
      delay: randomBetween(30, 180) * 60 * 1000 // 30-180 min
    });

    // Instant repost (NOT "repost with thoughts")
    await queueJob('repost-instant', {
      accountId: member.linkedin_account_id,
      postUrl,
      delay: randomBetween(5, 60) * 60 * 1000 // 5-60 min
    });
  }
}
```

---

### SESSION 6: AgentKit + Mem0 Integration (10 points)

#### T016: AgentKit Campaign Assistant (5 points)
- Campaign creation wizard
- DM template optimization
- Performance analytics
- Custom tools for campaign management

#### T017: Mem0 Memory System (5 points)
- Tenant isolation with composite keys
- Cartridge context storage
- Conversation history
- $20/month Pro plan setup

---

### SESSION 7: Monitoring + Testing (5 points)

#### T018: Real-time Monitoring Dashboard (3 points)
- Metrics: comments, DMs, emails, webhooks
- Conversion funnel visualization
- Pod activity heatmap
- Rate limit warnings

#### T019: End-to-End Testing (2 points)
- Complete flow: comment → DM → email → webhook → delivery
- Pod automation testing
- Rate limit enforcement
- Error handling verification

---

## Summary of Corrections

### Fixed Issues:
1. ✅ Restored 3 Bolt.new tasks (was 1, now 3)
2. ✅ Fixed engagement pods - EVERYONE engages with EVERYTHING
3. ✅ Added missing features (lead magnet upload, templates, unsubscribe)
4. ✅ Clarified that we DON'T build Bolt scaffolds (user does)
5. ✅ Emphasized comment polling (NO webhooks available)

### Key Technical Corrections:
- **Engagement Pods:** No rotation - everyone participates always
- **Critical Window:** 30 min to 3 hours for LinkedIn algorithm
- **Instant Reposts:** 12x more effective than "repost with thoughts"
- **Unipile Limits:** No comment webhooks, must poll
- **Mailgun:** One-time only, client handles sequences

### V2 Features (NOT in MVP):
- Playwright browser automation
- LinkedIn resharing automation
- Advanced pod coordination
- Email sequences

Total: 19 tasks, 100 points (7 sessions)