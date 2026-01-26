# Expert Final Task Review: Bravo revOS MVP
**Date:** November 4, 2025
**Reviewer:** Claude (40-year expert perspective - Opus 4)
**Project:** Bravo revOS (de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531)
**Tasks Reviewed:** 19 tasks (T001-T019) + A-00 context hub

---

## Executive Summary

**Overall Assessment:** ⚠️ GOOD FOUNDATION WITH CRITICAL GAPS

**Status:** 75% ready for implementation with 5 critical issues to address

**Recommendation:** DO NOT START until addressing critical gaps below

---

## 🔴 CRITICAL ISSUES (Must Fix Before Starting)

### 1. **A-00 Task Not in Task List** ❌
**Problem:** The context-first A-00 task exists but isn't in the T001-T019 sequence

**Impact:**
- Developers won't know to read it first
- Context-first system breaks down
- 60% time savings lost

**Fix:**
- Renumber all tasks to include A-00 as T000
- OR create A-00 as mandatory prerequisite separate from sprint tasks
- Add A-00 verification checkpoint before T001

**Recommended Structure:**
```
A-00: Project Foundation & Context (0 points, prerequisite)
  ↓
T001-T003: Bolt.new Scaffold (15 points, Session 1)
  ↓
T004-T019: Implementation (85 points, Sessions 2-7)
```

---

### 2. **Missing A-01 Bolt.new Task** ❌
**Problem:** Tasks mention "Bolt.new prompt" but there's no actual A-01 task

**Current State:**
- T001-T003 contain Bolt.new prompts
- BOLT-PROMPT-FIX document shows A-01 was created
- But A-01 not in T001-T019 list

**Impact:**
- Confusion about task order
- Bolt scaffold might be skipped
- Foundation missing for Claude Code tasks

**Fix:**
- Create A-01 as T000.5 or separate Bolt task
- Use the optimized 300-word self-contained prompt from BOLT-PROMPT-FIX
- Mark as "User" assignee (not "Assistant")
- Make T004+ dependent on A-01 completion

**Recommended A-01:**
```markdown
Title: A-01: Bolt.new Full-Stack Scaffold
Assignee: User
Branch: bolt-scaffold
Points: 15
Dependencies: A-00
Blocks: T004-T019

Description: Use the 300-word self-contained Bolt.new prompt to generate:
- Complete Next.js 14 app structure
- Supabase database schema
- Admin portal (/admin/*)
- Client dashboard (/dashboard/*)
- All UI components with iOS-style toggles
- Auth middleware and RLS policies

[Include 300-word prompt from BOLT-PROMPT-FIX-2025-11-04.md]
```

---

### 3. **T001-T003 Redundant with A-01** ⚠️
**Problem:** T001-T003 describe Bolt.new tasks but should be ONE task (A-01)

**Current Duplication:**
- T001: Database schema (Bolt.new)
- T002: Admin portal (Bolt.new)
- T003: Client dashboard (Bolt.new)

**Reality:** Bolt.new generates ALL of these in ONE pass

**Impact:**
- Confused execution (run Bolt 3 times?)
- Wasted time splitting what should be atomic
- 3 tasks that are really 1 task

**Fix:**
- Delete T001-T003
- Replace with single A-01 task
- Renumber T004+ as T001+

---

### 4. **Missing Knowledge Base References** ⚠️
**Problem:** Only A-00 and 6 tasks have knowledge base query instructions

**Tasks WITHOUT references (13 tasks):**
- T001-T003: Bolt tasks
- T004-T006: Cartridge system
- T008: Comment polling
- T009: BullMQ DM
- T011: Webhook delivery
- T013-T015: Pod system
- T017-T019: Mem0, monitoring, testing

**Impact:**
- Developers won't know what docs to query
- 60% time savings only applies to 6 tasks
- Context-first system incomplete

**Fix:** Add knowledge base query sections to ALL tasks:
```markdown
📖 BEFORE YOU START: Read A-00 if you haven't!

📚 PROJECT DOCS:
- [Relevant project doc] ([what to find])

🔍 KNOWLEDGE BASE - [API/Service]:
Query Archon: "[Specific question about API]"
Query Archon: "[Another specific question]"
```

**Specific Queries Needed:**

**T008 (Comment Polling):**
```
🔍 KNOWLEDGE BASE - Unipile:
- Query: "Unipile API get post comments endpoint parameters"
- Query: "Unipile LinkedIn comment polling best practices rate limits"
- Query: "Unipile API error handling retry logic"
```

**T009 (BullMQ DM):**
```
🔍 KNOWLEDGE BASE - BullMQ + Unipile:
- Query: "BullMQ rate limiting per-group configuration examples"
- Query: "BullMQ concurrency and rate limiting best practices"
- Query: "Unipile API send message daily limits LinkedIn"
```

**T011 (Webhook Delivery):**
```
🔍 KNOWLEDGE BASE - Webhooks:
- Query: "Webhook retry logic exponential backoff best practices"
- Query: "HMAC signature webhook security implementation"
- Query: "Zapier webhook integration authentication headers"
```

---

### 5. **Pod Automation Logic Mismatch** 🔴
**Problem:** T015 states "EVERYONE engages with EVERYTHING" but implementation unclear

**Spec says (line 213-221):**
- When ANY member posts, ALL other members engage
- 100% participation, NO rotation
- Like within 30 minutes
- Comment within 1-3 hours
- Instant repost

**T015 says:**
- "100% participation (no exceptions)"
- "NO selection, NO rotation - EVERYONE participates"

**But HOW is this detected?**
- How do we know when a pod member posts?
- Polling their posts?
- Webhook from Unipile?
- Manual trigger?

**Missing Implementation Details:**
1. Post detection mechanism (polling? webhook?)
2. Notification system (how to alert other members?)
3. Engagement triggering (automated or manual?)
4. Participation enforcement (what if member can't engage?)

**Fix:** Add T014.5:
```markdown
T014.5: Pod Post Detection System
- Poll all pod member posts every 30 minutes
- Detect new posts since last check
- Trigger engagement workflow for ALL other members
- Queue engagement jobs (like, comment, repost)
- Track participation compliance
```

---

## ⚠️ MAJOR CONCERNS (Address Before Implementation)

### 6. **No Error Handling or Retry Logic Specs** ⚠️
**Problem:** Tasks mention "retry" but don't spec the behavior

**Examples:**
- T009: "Retry with exponential backoff" - what intervals?
- T011: "Retry with exponential backoff (3 attempts)" - what delays?
- T010: "Send clarification if needed" - what triggers this?

**Industry Best Practice (from BullMQ docs 2025):**
```javascript
{
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 15 * 60 * 1000  // 15min, 30min, 60min
  }
}
```

**Fix:** Add explicit retry specs to T009, T010, T011:
```markdown
**Retry Configuration:**
- Attempts: 3
- Delays: 15min, 30min, 60min (exponential backoff)
- Dead letter queue after final failure
- Monitoring alert on 2nd failure
```

---

### 7. **LinkedIn Rate Limit Violations Risk** ⚠️
**Problem:** Tasks don't account for LinkedIn's strict automation detection

**Current Specs:**
- T009: "2-15 minute random delays"
- T008: "Poll every 15-30 minutes"
- T015: "Like within 30 minutes"

**LinkedIn Reality (from Unipile docs 2025):**
- Message sending: **100-150/day** (not 50)
- Connection requests: **80-100/day**
- **Must emulate human behavior with random spacing**
- **Distribute across working hours only**
- Chains at regular intervals = instant ban

**Current Risk:**
- T008 polling "every 15-30 min" is TOO regular
- T015 "like within 30 min" is TOO fast for 9+ members

**Fix:**
```markdown
T008: Comment Polling System
- Random intervals: 15-45 minutes (wider range)
- Only during working hours: 9am-5pm user's timezone
- Add random "skip" chance (10%) to break patterns
- Jitter: ±5 minutes from scheduled time

T015: Pod Automation
- Like timing: Random 5-30 minutes (not all at once)
- Comment timing: Random 1-6 hours (wider spread)
- Stagger engagement across members (not simultaneous)
- Max 3 members engage within first hour (avoid pattern)
```

---

### 8. **No Mailgun Implementation Task** ❌
**Problem:** ICE scoring doc mentions Mailgun, but NO task exists for it

**From SITREP (Session 4):**
> "**T012:** Mailgun One-Time Lead Magnet Delivery (5 points)"

**But T012 in current list is:**
> "T012: Backup DM with Direct Link"

**Missing:**
- Mailgun API client
- One-time email delivery
- Lead magnet attachment handling
- Email tracking

**Fix:** Add T012.5 or modify T012:
```markdown
T012: Mailgun One-Time Lead Magnet Delivery
- Mailgun API client setup
- Email template with lead magnet attachment
- Supabase Storage signed URLs (24-hour expiry)
- Delivery tracking and status updates
- 5,000 emails/month free tier
- Fallback to backup DM if Mailgun fails

Reference: ICE scoring doc lines 280-317
```

---

### 9. **Mem0 Tenant Isolation Incorrect** 🔴
**Problem:** T017 says "{clientId}::{userId}" but should use Supabase tenant structure

**T017 Current:**
```
Tenant isolation with composite keys: {clientId}::{userId}
```

**Reality from data model:**
```
agencies → clients → users
```

**Correct Isolation:**
```javascript
// For multi-tenancy with agencies
const memoryKey = `${agencyId}::${clientId}::${userId}`;

// For client-specific memories
const campaignMemory = `${clientId}::campaign::${campaignId}`;
```

**Fix:** Update T017:
```markdown
**Mem0 Tenant Isolation:**
- User-specific: `{agencyId}::{clientId}::{userId}`
- Client-specific: `{agencyId}::{clientId}::shared`
- Campaign-specific: `{agencyId}::{clientId}::campaign::{campaignId}`

**Why:** Ensures agency-level isolation + client-level isolation + user-level isolation
```

---

### 10. **No Supabase Storage Task** ⚠️
**Problem:** Lead magnets go to Supabase Storage, but no setup task exists

**References in Tasks:**
- T001: "lead_magnets (file_path for Supabase Storage)"
- T003: "Lead magnet upload (to Supabase Storage)"
- T012: "Generate 24-hour signed URLs from Supabase Storage"

**Missing:**
- Storage bucket creation
- RLS policies for multi-tenant storage
- File upload API
- Signed URL generation
- File size limits and validation

**Fix:** Add T002.5:
```markdown
T002.5: Supabase Storage Setup
- Create 'lead-magnets' bucket
- RLS policies: users can only access their client's files
- File upload API: POST /api/lead-magnets/upload
- File size limit: 10MB per file
- Allowed types: PDF, DOCX, PPTX, ZIP
- Generate signed URLs with 24-hour expiry
- Clean up orphaned files (cron job)

Points: 3
Branch: bolt-scaffold
Assignee: Assistant
```

---

## 📊 TASK-BY-TASK REVIEW

### Session 1: Bolt.new Scaffold (15 points)

**T001: Generate Database Schema** ⚠️
- **Status:** Should be part of A-01, not separate
- **Issue:** Bolt generates entire app, not just schema
- **Fix:** Merge T001-T003 into A-01

**T002: Generate Admin Portal** ⚠️
- **Status:** Should be part of A-01
- **Issue:** Same as T001
- **Fix:** Merge into A-01

**T003: Generate Client Dashboard** ⚠️
- **Status:** Should be part of A-01
- **Issue:** Campaign wizard described but no A-01 reference
- **Fix:** Merge into A-01, add wizard details

**Recommendation:** Replace T001-T003 with:
```
A-01: Bolt.new Full-Stack Scaffold (15 points)
- Use 300-word self-contained prompt
- Generate complete app in ONE pass
- Push to GitHub when done
- Verify all iOS-style toggles
```

---

### Session 2: Cartridge System (20 points)

**T004: Cartridge Database & API** ✅
- **Status:** GOOD
- **Strength:** Clear CRUD endpoints, RLS policies specified
- **Missing:** Add knowledge base query:
  ```
  🔍 KNOWLEDGE BASE - Supabase:
  - Query: "Supabase RLS policies multi-tenant best practices"
  - Query: "Supabase JSONB indexing performance"
  ```

**T005: Voice Auto-Generation** ⚠️
- **Status:** GOOD but incomplete
- **Missing:** Error handling for private profiles
- **Missing:** What if user has <30 posts?
- **Fix:** Add edge cases:
  ```markdown
  **Edge Cases:**
  - <30 posts: Use what's available, note low confidence
  - Private profile: Skip or use default workspace voice
  - API failure: Graceful degradation to manual voice input
  ```
- **Add knowledge base query:**
  ```
  🔍 KNOWLEDGE BASE - Unipile + OpenAI:
  - Query: "Unipile API get user posts endpoint pagination"
  - Query: "OpenAI GPT-4 prompt for writing style analysis"
  - Query: "Unipile LinkedIn private profile handling"
  ```

**T006: Cartridge Management UI** ✅
- **Status:** GOOD
- **Strength:** Progressive disclosure clearly specified
- **Add:** Voice preview sample text examples

---

### Session 3: Unipile + BullMQ + DM (20 points)

**T007: Unipile Integration** ✅
- **Status:** EXCELLENT
- **Strength:** Correctly identifies username/password (NOT OAuth)
- **Strength:** Mentions encryption for credentials
- **Missing:** Encrypted storage implementation details
- **Fix:** Add:
  ```markdown
  **Credential Encryption:**
  - Use Supabase Vault for encryption keys
  - AES-256-GCM encryption for passwords
  - Never log credentials
  - Rotate encryption keys quarterly
  ```

**T008: Comment Polling System** ⚠️
- **Status:** GOOD but rate limit risk
- **Issue:** "Every 15-30 min" too regular (see #7)
- **Missing:** Bot comment filtering
- **Fix:**
  ```markdown
  **Polling Strategy:**
  - Random intervals: 15-45 minutes
  - Working hours only (9am-5pm user TZ)
  - 10% random skip chance
  - Jitter: ±5 minutes

  **Bot Filtering:**
  - Check for "bot" in profile headline
  - Filter profiles with <10 connections
  - Skip generic comments ("Great post!")
  - Regex patterns for spam
  ```
- **Add knowledge base query** (see #4)

**T009: BullMQ DM Automation** 🔴
- **Status:** CRITICAL ISSUES
- **Issue 1:** Says "50 DMs/day" but Unipile docs show **100-150/day**
- **Issue 2:** "Min 2 minutes" not specified as rate limit config
- **Issue 3:** No per-account vs global limit distinction
- **Fix:**
  ```markdown
  **Rate Limits (Per LinkedIn Account):**
  - Max: 100 DMs/day (conservative, Unipile allows 100-150)
  - Min delay: 2 minutes between DMs
  - Random delays: 2-15 minutes
  - Reset: Daily at midnight user TZ

  **BullMQ Configuration:**
  ```javascript
  {
    limiter: {
      max: 100,        // 100 DMs per day
      duration: 86400000,  // 24 hours in ms
      groupKey: 'linkedinAccountId'  // Per-account limits
    },
    concurrency: 1  // One DM at a time per account
  }
  ```

  **Multi-Account Support:**
  - If client has 3 LinkedIn accounts
  - Each gets separate 100 DM/day limit
  - Total: 300 DMs/day across accounts
  ```

---

### Session 4: Email Capture + Webhook (20 points)

**T010: Email Extraction** ✅
- **Status:** GOOD
- **Strength:** Regex + GPT-4 fallback is smart
- **Add:** Confidence scoring
  ```markdown
  **Confidence Scoring:**
  - High (90-100%): Clear email in reply
  - Medium (70-89%): GPT-4 extraction
  - Low (<70%): Manual review needed

  **Manual Review Trigger:**
  - Confidence <70%
  - Multiple emails found
  - No email found after clarification
  ```

**T011: Webhook to Client ESP** ⚠️
- **Status:** GOOD but missing details
- **Issue:** HMAC signature mentioned but not spec'd
- **Issue:** "ESP presets" mentioned but not defined
- **Fix:**
  ```markdown
  **HMAC Signature:**
  ```javascript
  const signature = crypto
    .createHmac('sha256', webhookSecret)
    .update(JSON.stringify(payload))
    .digest('hex');

  headers: {
    'X-Webhook-Signature': signature,
    'X-Webhook-Timestamp': Date.now()
  }
  ```

  **ESP Presets:**
  - Zapier: `https://hooks.zapier.com/hooks/catch/...`
  - Make.com: `https://hook.make.com/...`
  - ConvertKit: `https://api.convertkit.com/v3/forms/{id}/subscribe`
  - Custom: User-defined endpoint + auth header

  **Retry Logic (EXPLICIT):**
  - Attempt 1: Immediate
  - Attempt 2: 15 minutes later
  - Attempt 3: 30 minutes later
  - Attempt 4: 60 minutes later
  - After 4 failures: Dead letter queue + alert user
  ```

**T012: Backup DM** ⚠️
- **Status:** INCOMPLETE - should include Mailgun
- **Issue:** Says "optional" but ICE doc says CRITICAL
- **Issue:** 24-hour signed URLs could expire before user clicks
- **Fix:**
  ```markdown
  T012: Backup DM with Mailgun Delivery

  **Flow:**
  1. Email captured successfully
  2. Send to webhook (primary delivery)
  3. ALSO send via Mailgun (backup delivery)
  4. Wait 5 minutes
  5. Send backup DM with 24-hour link

  **Mailgun Configuration:**
  - From: noreply@{client-domain}.com
  - Subject: "{lead_magnet_name} - As Requested"
  - Attachment: PDF from Supabase Storage
  - Tracking: Open rate, click rate
  - Free tier: 5,000 emails/month

  **Backup DM:**
  - Only if toggle enabled
  - 5-minute delay after webhook
  - Signed URL expires in 24 hours
  - URL shortening via bit.ly (optional)
  ```

---

### Session 5: Engagement Pods (15 points)

**T013: Pod Infrastructure** ⚠️
- **Status:** GOOD but needs clarification
- **Issue:** "EVERYONE engages with EVERYTHING" but how is this enforced?
- **Missing:** Pod member removal/suspension logic
- **Fix:**
  ```markdown
  **Participation Enforcement:**
  - Track engagement per member per post
  - Alert if <80% participation in 7 days
  - Auto-suspend members with <50% participation
  - Require re-activation after suspension

  **Member Removal:**
  - Super admin can remove members
  - Member can leave pod
  - Removal cascades to pod_activities (set member_id NULL)
  ```

**T014: LinkedIn Session Capture** ✅
- **Status:** GOOD
- **Add:** Session expiry notification
  ```markdown
  **Session Expiry Alerts:**
  - Alert 7 days before expiry
  - Alert 1 day before expiry
  - Alert on expiry (re-auth required)
  - Slack/email notification options
  ```

**T015: Pod Automation Engine** 🔴
- **Status:** CRITICAL GAP - post detection mechanism missing
- **Issue:** Says "when ANY member posts" but HOW do we detect this?
- **Missing:** See Critical Issue #5
- **Fix:** Add post detection task (T014.5) before T015

---

### Session 6: AgentKit + Mem0 (10 points)

**T016: AgentKit Integration** ⚠️
- **Status:** INCOMPLETE
- **Issue:** Lists custom tools but no implementation details
- **Missing:** Tool schemas, parameters, return types
- **Fix:**
  ```markdown
  **Custom Tool Schemas:**

  createCampaign:
  - Parameters: name, trigger_word, lead_magnet_id, webhook_url
  - Returns: campaign_id, estimated_reach, suggested_post

  optimizeMessage:
  - Parameters: message, conversion_goal, audience
  - Returns: optimized_message, confidence_score, A/B variants

  analyzePerformance:
  - Parameters: campaign_id, time_range
  - Returns: metrics, insights, recommendations

  generatePostContent:
  - Parameters: topic, trigger_word, voice_cartridge_id
  - Returns: post_text, hashtags, best_posting_time
  ```

**T017: Mem0 Memory System** 🔴
- **Status:** CRITICAL ISSUE - wrong tenant isolation (see #9)
- **Issue:** Tenant key should be `{agencyId}::{clientId}::{userId}`
- **Missing:** Memory search and retrieval API
- **Fix:** (see Critical Issue #9)

---

### Session 7: Monitoring + Testing (5 points)

**T018: Monitoring Dashboard** ✅
- **Status:** GOOD
- **Add:** Alert thresholds
  ```markdown
  **Alert Thresholds:**
  - DMs remaining <10: Warning (yellow)
  - DMs remaining <5: Critical (red)
  - Conversion rate <3%: Low performance alert
  - Webhook failures >5%: Integration issue alert
  ```

**T019: End-to-End Testing** ⚠️
- **Status:** GOOD but needs specifics
- **Issue:** "Mock Unipile API responses" but no details
- **Missing:** Test data fixtures
- **Fix:**
  ```markdown
  **Test Fixtures:**
  - 100 mock LinkedIn comments with trigger word
  - 50 mock DM replies with emails
  - 20 mock DM replies without emails (edge cases)
  - 10 mock webhook delivery scenarios

  **Mock Unipile Responses:**
  ```javascript
  // Comment polling
  mockUnipile.getPostComments.mockResolvedValue({
    comments: [/* fixture data */],
    has_more: false
  });

  // DM sending
  mockUnipile.sendMessage.mockImplementation(() => {
    if (Math.random() < 0.95) return { success: true };
    throw new Error('Rate limit exceeded');
  });
  ```

  **Test Coverage Requirements:**
  - Unit tests: >80%
  - Integration tests: All happy paths + top 10 edge cases
  - E2E tests: All 8 scenarios from quickstart.md
  ```

---

## 📚 KNOWLEDGE BASE INTEGRATION REVIEW

**Current State:** 6 tasks have knowledge base references
**Required State:** ALL 19 tasks should have references

**Missing Knowledge Base Queries (Priority Order):**

1. **T008 (Comment Polling)** - CRITICAL
   - Unipile API documentation
   - Rate limiting best practices

2. **T009 (BullMQ DM)** - CRITICAL
   - BullMQ rate limiting examples
   - Unipile message sending limits

3. **T011 (Webhook Delivery)** - HIGH
   - Webhook retry patterns
   - HMAC signature examples
   - ESP integration docs

4. **T004 (Cartridge DB)** - MEDIUM
   - Supabase RLS multi-tenant
   - JSONB indexing

5. **T017 (Mem0)** - MEDIUM
   - Mem0 tenant isolation docs
   - Semantic search examples

6. **T013-T015 (Pods)** - MEDIUM
   - Unipile post detection
   - LinkedIn algorithm timing windows

**Action Required:** Add query sections to ALL tasks using this template:
```markdown
📖 BEFORE YOU START: Read A-00 if you haven't!

📚 PROJECT DOCS:
- [Document name] ([what to look for])

🔍 KNOWLEDGE BASE - [API/Service]:
Query Archon: "[Specific actionable question]"
Query Archon: "[Another specific question]"
```

---

## 💯 STORY POINT VALIDATION

**Total Points:** 100 (per ICE scoring doc) ✅

**Session Breakdown:**
| Session | Features | Points | Assessment |
|---------|----------|--------|------------|
| 1 | Bolt Scaffold | 15 | ⚠️ Should be A-01 (not T001-T003) |
| 2 | Cartridge System | 20 | ✅ Reasonable |
| 3 | Unipile + BullMQ | 20 | ✅ Reasonable |
| 4 | Email + Webhook | 20 | ⚠️ Add Mailgun (+5) = 25 |
| 5 | Engagement Pods | 15 | ⚠️ Add post detection (+5) = 20 |
| 6 | AgentKit + Mem0 | 10 | ✅ Reasonable |
| 7 | Monitoring + Testing | 5 | ⚠️ Light for comprehensive testing |

**Adjustments Needed:**
- Session 1: Consolidate T001-T003 into A-01 (same 15 points)
- Session 4: Add Mailgun task (+5 points) = 25 total
- Session 5: Add post detection task (+5 points) = 20 total
- Session 7: May need +3 points for comprehensive E2E tests

**Revised Total:** 105-110 points (slightly over, acceptable)

**Recommendation:**
- Keep Session 1 at 15 (consolidated)
- Increase Session 4 to 25 (Mailgun)
- Increase Session 5 to 20 (post detection)
- Keep Session 7 at 5 (or increase to 8)
- **New Total: 110 points** (10% buffer over MVP baseline)

---

## 🎯 RECOMMENDATIONS

### Immediate Actions (Before Starting T001)

1. **Create A-00 Task** ✅ (Already exists per context-first doc)
   - Verify it's in Archon
   - Make it mandatory prerequisite
   - Story points: 0 (reading task)

2. **Create A-01 Task** ❌ (Missing)
   - Use 300-word Bolt.new prompt from BOLT-PROMPT-FIX doc
   - Consolidate T001-T003 into this single task
   - Story points: 15
   - Assignee: User

3. **Renumber Tasks**
   - Delete T001-T003
   - Renumber T004-T019 as T001-T016
   - Add new tasks:
     - T002.5: Supabase Storage Setup (3 points)
     - T008.5: Post Detection for Pods (5 points)
     - T012.5: Mailgun Integration (5 points)

4. **Add Knowledge Base Queries to ALL Tasks**
   - Use template from Critical Issue #4
   - Priority: T008, T009, T011, T017

5. **Fix T009 Rate Limits**
   - Change 50 → 100 DMs/day
   - Add BullMQ config code
   - Clarify per-account vs global

6. **Fix T017 Mem0 Tenant Isolation**
   - Change to `{agencyId}::{clientId}::{userId}`
   - Add memory types and search API

7. **Add Retry Specs**
   - T009, T010, T011: Explicit retry intervals
   - Use exponential backoff: 15min, 30min, 60min

8. **Validate Bolt.new Prompt**
   - Ensure 300-word version from BOLT-PROMPT-FIX is used
   - Verify self-contained (no Archon references)
   - Test in Bolt.new before starting

### Medium Priority (During Implementation)

9. **Add Error Scenarios**
   - T005: <30 posts, private profiles
   - T010: Multiple emails, no emails
   - T015: Member can't engage (session expired)

10. **Add Security Specs**
    - T007: Credential encryption details
    - T011: HMAC signature implementation
    - T014: Session token storage

11. **Add Monitoring**
    - T008: Polling job health check
    - T009: Queue depth alerts
    - T015: Participation compliance tracking

### Low Priority (Nice to Have)

12. **Add Performance Benchmarks**
    - T008: Polling should complete <30s
    - T009: DM sending <500ms
    - T018: Dashboard load <2s

13. **Add Cleanup Jobs**
    - Supabase Storage: Delete orphaned files
    - Messages: Archive after 90 days
    - Webhook logs: Purge after 30 days

---

## 🏗️ PROPOSED FINAL TASK STRUCTURE

### Prerequisites (0 points)
- **A-00:** Project Foundation & Context
  - Status: ✅ Already created (a5fbfebb-5d31-44f2-b4e2-a4f0b5fee8b4)
  - Lists all 29 project docs + 29 knowledge base sources
  - Assignee: All (read before starting)

### Session 1: Bolt.new Scaffold (15 points)
- **A-01:** Bolt.new Full-Stack Scaffold (15 pts)
  - Use 300-word self-contained prompt
  - Generate complete app structure
  - Database schema + Admin + Client dashboards
  - Assignee: User
  - Branch: bolt-scaffold
  - Blocks: All other tasks

### Session 2: Foundation (23 points)
- **T001:** Supabase Storage Setup (3 pts) 🆕
- **T002:** Cartridge Database & API (8 pts)
- **T003:** Voice Auto-Generation from LinkedIn (7 pts)
- **T004:** Cartridge Management UI (5 pts)

### Session 3: Unipile + BullMQ (20 points)
- **T005:** Unipile Integration & Session Management (5 pts)
- **T006:** Comment Polling System (7 pts)
- **T007:** BullMQ DM Automation (8 pts)

### Session 4: Email Capture + Delivery (25 points)
- **T008:** Email Extraction Pipeline (5 pts)
- **T009:** Webhook to Client ESP (10 pts)
- **T010:** Mailgun One-Time Delivery (5 pts) 🆕
- **T011:** Backup DM with Direct Link (5 pts)

### Session 5: Engagement Pods (20 points)
- **T012:** Pod Infrastructure (5 pts)
- **T013:** LinkedIn Session Capture for Pods (5 pts)
- **T014:** Pod Post Detection System (5 pts) 🆕
- **T015:** Pod Automation Engine (5 pts)

### Session 6: AI Integration (10 points)
- **T016:** AgentKit Campaign Orchestration (5 pts)
- **T017:** Mem0 Memory System (5 pts)

### Session 7: Monitoring + Testing (8 points)
- **T018:** Real-time Monitoring Dashboard (3 pts)
- **T019:** End-to-End Testing Suite (5 pts) *increased*

**New Total:** 121 points (A-00 = 0, A-01 = 15, T001-T019 = 106)

**Justification for 21-point increase:**
- 3 critical missing tasks (Storage, Post Detection, Mailgun)
- More realistic E2E testing effort
- Still under 7-session constraint (avg 17 pts/session)

---

## 📝 SUMMARY & VERDICT

**Current State:**
- ✅ Correct tech stack (Unipile, BullMQ, Mem0)
- ✅ No V2 features in MVP
- ✅ Context-first A-00 exists
- ⚠️ Missing A-01 consolidation
- ⚠️ Missing 3 critical tasks
- ⚠️ Incomplete knowledge base integration
- ⚠️ Some spec mismatches (rate limits, tenant isolation)

**Readiness Score:** 75/100

**Critical Path to 100:**
1. Create A-01 (consolidate Bolt tasks)
2. Add 3 missing tasks (Storage, Post Detection, Mailgun)
3. Add knowledge base queries to ALL tasks
4. Fix rate limits, retry specs, tenant isolation

**Time to Fix:** 2-3 hours

**Recommendation:** **DO NOT START until critical issues fixed**

**Once fixed, this will be a SOLID, production-ready task list.**

---

## 🔗 REFERENCES CONSULTED

1. **Project Documents:**
   - spec.md (RevOS V1 V1 V1 specification)
   - data-model.md (database schema)
   - SITREP-task-correction-2025-11-03.md
   - CONTEXT-FIRST-STANDARDIZATION-2025-11-04.md
   - BOLT-PROMPT-FIX-2025-11-04.md

2. **External Documentation (2025):**
   - Unipile API Provider Limits: https://developer.unipile.com/docs/provider-limits-and-restrictions
   - BullMQ Rate Limiting Guide: https://docs.bullmq.io/guide/rate-limiting
   - LinkedIn API Rate Limits: https://learn.microsoft.com/en-us/linkedin/shared/api-guide/concepts/rate-limits

3. **Best Practices:**
   - BullMQ Advanced Features (Aug 2025): Rate limiting, concurrency, group-based limits
   - Handling 2M Jobs/Day with BullMQ (Medium): Production-scale patterns
   - Unipile Human Behavior Emulation: Random spacing, working hours only

---

**End of Expert Review**
**Next Action:** Address 5 critical issues before starting implementation
**Estimated Fix Time:** 2-3 hours
**Result:** Production-ready 121-point MVP task list
