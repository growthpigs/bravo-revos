# Feature Specification: RevOS V1 V1 V1 - LinkedIn Lead Magnet Automation + Engagement Pod Reshare

**Feature Branch**: `001-linkedin-growth-engine`
**Created**: 2025-11-02
**Status**: Ready for Planning
**Version**: V1 V1 V1 (Complete Rewrite)

---

## Executive Summary

RevOS V1 V1 V1 is a LinkedIn growth automation platform with TWO core features:

**V1 Core (Days 1-4):** Lead Magnet Automation
- User posts lead magnet on LinkedIn with trigger word (e.g., "SWIPE", "BANANA", etc.)
- System scrapes commenters who used trigger word
- Sends personalized DM asking for email
- AI extracts email from natural language replies
- Sends email to webhook (client's CRM/email system)
- Client handles email delivery (NOT RevOS)

**V1.5 Premium (Days 5-6):** Engagement Pod Reshare Automation
- Engagement pods (9+ members) coordinate resharing each other's posts
- Automated browser-based resharing with AI-generated commentary
- Staggered timing to avoid spam detection
- First-to-market feature (no competitor has this)

**Key Differentiators:**
- ✅ Conversational AgentKit interface (vs traditional dashboards)
- ✅ Cartridge system for extensibility (System, User, Skills)
- ✅ Mem0 persistent memory (learns user preferences)
- ✅ Automated resharing (ONLY product with this feature)
- ✅ Modern UI (shadcn/ui, not old-school buttons)

---

## User Scenarios & Testing

### Primary User Story - Lead Magnet Automation

**As a** business coach posting lead magnets on LinkedIn
**I want to** automatically capture emails from engaged commenters
**So that** I can build my email list without manual DM outreach

### Acceptance Scenarios - V1 Core

1. **Given** user posts on LinkedIn: "Want my leadership guide? Comment 'SWIPE'",
   **When** 47 people comment "SWIPE",
   **Then** system scrapes all 47 commenters and stores them as leads

2. **Given** 47 leads scraped from post,
   **When** DM automation runs,
   **Then** personalized DMs sent asking for email with 2-15 min random delays, max 50/day

3. **Given** lead replies "sure! john@company.com",
   **When** AI extraction runs,
   **Then** email extracted, validated, stored, and sent to webhook

4. **Given** email captured successfully,
   **When** webhook fires,
   **Then** POST to client's webhook URL with complete lead data

5. **Given** user chats with AgentKit: "Create a LinkedIn post about burnout",
   **When** AgentKit processes request,
   **Then** post generated in user's authentic voice from User Cartridge

6. **Given** user says "that's too salesy",
   **When** Mem0 processes feedback,
   **Then** preference stored and future posts adjust tone automatically

### Acceptance Scenarios - V1.5 Reshare

7. **Given** pod member Alice posts on LinkedIn,
   **When** system detects new post,
   **Then** 8 other pod members automatically reshare with unique AI commentary over 60 minutes

8. **Given** Bob's account reshares Alice's post,
   **When** LinkedIn displays the reshare,
   **Then** commentary is unique, authentic, adds value (not generic "Great post!")

9. **Given** pod member hits daily limit (20 reshares),
   **When** rotation algorithm runs,
   **Then** member automatically skipped, no LinkedIn warnings triggered

### Edge Cases

- **Invalid LinkedIn post URL**: Block campaign creation immediately with error
- **Private profile commenter**: Store minimal data (name, URL only), mark "limited_profile"
- **Email extraction failure**: Create manual review task with confidence score
- **Webhook endpoint down**: Retry 3x with exponential backoff, then dead letter queue
- **LinkedIn session expired (Reshare)**: Alert user via Slack, require re-login
- **Post author resharing own post**: Never happens (rotation excludes author)
- **Configurable trigger word**: User sets per campaign (not hard-coded "SWIPE")

---

## Requirements

### Functional Requirements - V1 Core

#### FR-001: Campaign Management
- System MUST allow users to create campaigns with:
  - Name
  - LinkedIn post URL
  - Lead magnet name/description
  - Configurable trigger word (e.g., "SWIPE", "BANANA", "YES")
  - Webhook URL for email delivery
- System MUST validate LinkedIn post URLs before campaign creation
- System MUST allow pause/resume/archive of campaigns

#### FR-002: Comment Scraping with Trigger Detection
- System MUST scrape all comments from LinkedIn post
- System MUST filter comments containing the configured trigger word (case-insensitive)
- System MUST extract commenter data: name, LinkedIn URL, headline, company, job title
- System MUST handle 500+ comments with pagination
- System MUST prevent duplicate lead creation

#### FR-003: DM Automation
- System MUST queue DMs for leads with trigger word match
- System MUST personalize DM asking for email:
  - "Hey [Name], loved your comment! What's your best email? I'll send you the [Lead Magnet]."
- System MUST enforce rate limits:
  - Max 50 DMs/day per account
  - 2-15 minute random delays between DMs
  - Start at 15/day, increase by 5/week
- System MUST track DM status: pending, sent, delivered, replied, failed
- System MUST retry failed DMs 3x with exponential backoff

#### FR-004: AI Email Extraction
- System MUST extract email addresses from natural language replies using GPT-4
- Examples:
  - "sure! john@company.com" → john@company.com
  - "my email is jane at company dot com" → jane@company.com
- System MUST validate email format with regex after extraction
- System MUST assign confidence score (0-100%)
- System MUST create manual review task if confidence < 80%

#### FR-005: Webhook Integration
- System MUST send POST request to configured webhook URL when email captured
- Payload format:
  ```json
  {
    "email": "john@company.com",
    "name": "John Smith",
    "linkedin_url": "https://linkedin.com/in/johnsmith",
    "comment_text": "SWIPE",
    "lead_magnet_name": "5 Conversations Every Leader Must Have",
    "campaign_id": "abc123",
    "captured_at": "2025-11-02T10:30:00Z"
  }
  ```
- System MUST retry webhook failures 3x with exponential backoff
- System MUST log webhook success/failure for monitoring

#### FR-006: AgentKit Conversational Interface
- System MUST provide floating chat widget (always visible at bottom)
- System MUST support natural language queries:
  - "Create a post about imposter syndrome"
  - "How's the Leadership campaign doing?"
  - "Pause the Burnout post DMs"
- System MUST stream responses in real-time (Server-Sent Events)
- System MUST persist conversation history in Mem0

#### FR-007: Cartridge System
- System MUST support four cartridge types:
  1. **System Cartridge** (Superadmin only): RevOS core instructions
  2. **User Cartridge**: User's voice, business context, target audience
  3. **Skills Cartridge**: Task-specific capabilities (LinkedIn, copywriting, etc.)
  4. **Preferences Cartridge**: User-specific settings and style preferences
- System MUST load cartridges dynamically per AgentKit request (progressive disclosure)
- System MUST allow users to edit their own cartridges
- System MUST restrict System Cartridge editing to Superadmin only
- System MUST support adding new skill cartridges without code changes

#### FR-008: Mem0 Persistent Memory
- System MUST store memories across conversations:
  - User preferences ("don't use salesy language")
  - Goals ("target audience is coaches")
  - Patterns ("always checks analytics first")
  - Campaign context ("Lead magnet is '5 Conversations'")
  - Entity relationships ("Pod member: Sarah Chen")
- System MUST retrieve relevant memories on each AgentKit request
- System MUST auto-extract memories from user feedback
- System MUST use composite keys for tenant isolation: `tenantId::userId`

#### FR-009: User Voice Auto-Generation
- System MUST analyze user's last 30 LinkedIn posts via Unipile
- System MUST extract:
  - Tone (conversational, formal, etc.)
  - Paragraph length
  - Opening/closing patterns
  - Emotional hooks
  - Signature phrases
- System MUST generate User Cartridge automatically
- System MUST allow user to review/edit generated voice profile

#### FR-010: LinkedIn Post Creation
- System MUST generate LinkedIn posts in user's authentic voice
- System MUST apply professional copywriting frameworks (AIDA, PAS, Hook-Story-CTA)
- System MUST optimize for LinkedIn algorithm (1,300-2,000 characters)
- System MUST provide editable draft before posting

### Functional Requirements - V1.5 Reshare

#### FR-011: Session Capture & Management
- System MUST allow users to connect LinkedIn accounts via browser login
- System MUST capture and encrypt session cookies (AES-256)
- System MUST support 2FA during login
- System MUST persist sessions for 30 days
- System MUST auto-refresh sessions weekly
- System MUST alert users 7 days before session expiry

#### FR-012: Post Detection for Pods
- System MUST detect when pod member creates new LinkedIn post via Unipile webhooks
- System MUST fall back to polling (every 5 minutes) if webhooks fail
- System MUST process new posts within 2 minutes of detection

#### FR-013: Automated Resharing via Playwright
- System MUST use Playwright to:
  1. Navigate to post URL
  2. Click reshare button
  3. Select "Repost with thoughts"
  4. Type AI-generated commentary
  5. Click Post button
  6. Verify reshare success
- System MUST complete reshare in 30-90 seconds
- System MUST take screenshot on failure for debugging
- System MUST retry failed reshares 3x with exponential backoff

#### FR-014: AI Commentary Generation
- System MUST generate unique commentary per pod member
- System MUST use original post content + member context
- System MUST avoid generic phrases ("Great post!", "Check this out")
- System MUST keep commentary 50-150 characters
- Examples of GOOD commentary:
  - "This framework saved us 10 hours/week. The delegation matrix is gold."
  - "We tried this exact approach last quarter. Results were incredible."

#### FR-015: Pod Coordination & Rotation
- System MUST exclude post author from resharing their own post
- System MUST rotate which pod members reshare (fairness algorithm)
- System MUST respect daily limits (20 reshares/day per account)
- System MUST track reshare participation for balanced distribution

#### FR-016: Staggered Timing
- System MUST spread reshares over 60-minute window
- System MUST randomize delays (±25% of base interval)
- System MUST enforce minimum 15-minute gap between any member's reshares
- System MUST ensure max 1 reshare every 5 minutes from pod

#### FR-017: Human Behavior Simulation
- System MUST vary typing speed (50-150ms per keystroke)
- System MUST simulate reading time proportional to post length
- System MUST move mouse before clicking
- System MUST scroll naturally
- System MUST include occasional typo + backspace (5% chance)

#### FR-018: Reshare Error Handling
- Session expired → Alert user, require re-login
- Rate limit hit → Skip member, reschedule for tomorrow
- LinkedIn UI changed → Screenshot + alert admin
- Post deleted → Cancel all pending reshares

### Non-Functional Requirements

#### NFR-001: Multi-Tenant Isolation
- System MUST enforce tenant_id on ALL database queries
- System MUST use Row-Level Security (RLS) policies in Supabase
- System MUST use composite Mem0 keys: `tenantId::userId`
- System MUST wrap all AgentKit tools with tenant verification
- System MUST prevent ANY cross-tenant data leakage

#### NFR-002: Performance
- DM queue processing: 10 jobs/minute max
- AgentKit response time: <2 seconds
- Reshare execution: 30-90 seconds per job
- Webhook delivery: <200ms (excluding external endpoint latency)

#### NFR-003: Scalability
- Support 100 tenants simultaneously
- 1,000 DMs/day across all tenants
- 100 active LinkedIn sessions (Reshare)
- 10,000 queued jobs in Redis

#### NFR-004: Security
- Cookies encrypted at rest (AES-256-GCM)
- API keys in environment variables only
- Audit log for all reshare actions
- GDPR: User data deletion on request

#### NFR-005: Reliability
- Uptime: 99.5%
- Queue persistence across server restarts
- Session backup to S3 daily
- Automatic retry for transient failures

---

## Key Entities

### Core Entities

**users**
- id, email, tenant_id
- role (superadmin, admin, member)
- created_at, updated_at

**cartridges**
- id, tenant_id, user_id (nullable for system cartridges)
- name, type (system, user, skill, preferences)
- content (markdown text)
- editable_by (superadmin, user, both)
- active, priority (for loading order)
- load_triggers (JSONB - keywords for lazy loading)

**campaigns**
- id, tenant_id, user_id
- name, linkedin_post_url, lead_magnet_name
- trigger_word (configurable, e.g., "SWIPE")
- webhook_url (for email delivery)
- status (draft, active, paused, completed)
- dm_template (personalization variables)
- stats (total_leads, dms_sent, emails_captured)

**leads**
- id, campaign_id, tenant_id
- name, email, linkedin_url, company, job_title
- comment_text, comment_timestamp
- dm_status (pending, sent, replied, failed)
- dm_sent_at, dm_reply_text
- email_status (captured, sent_to_webhook, failed)
- email_captured_at, email_confidence_score

**dm_queue** (BullMQ jobs)
- id, lead_id, campaign_id, tenant_id
- scheduled_for (timestamp with random delay)
- status (pending, processing, success, failed)
- retry_count, error_message

### Reshare Entities

**pods**
- id, tenant_id
- name, member_account_ids (array)
- reshare_limit_daily (default 20)
- reshare_window_minutes (default 60)

**linkedin_sessions**
- id, tenant_id, account_id
- email, cookies_encrypted, session_token_encrypted
- expires_at, last_used_at, status (active, expired)

**reshare_history**
- id, pod_id, post_url, post_author_account_id
- resharer_account_id, commentary
- status (queued, processing, success, failed)
- execution_time_ms, error_message, screenshot_base64
- executed_at

**reshare_rate_limits**
- account_id, hourly_count, daily_count, weekly_count
- last_reshare_at, reset_daily_at

---

## Clarifications

### Session 2025-11-02

**V1 Core Clarifications:**

- Q: Is trigger word hard-coded to "SWIPE"? → A: NO - configurable per campaign (could be "BANANA", "YES", anything)
- Q: Does RevOS send the lead magnet email? → A: NO - RevOS sends webhook, client handles email delivery
- Q: Which AI orchestration framework? → A: OpenAI AgentKit with GPT-4 (NOT Realtime API, use standard GPT-4 for cost)
- Q: Voice cartridge = just voice? → A: NO - "User Cartridge" includes voice + business context + target audience
- Q: How many cartridges per user? → A: Four types: System (1), User (1+), Skills (multiple), Preferences (1)
- Q: Are all cartridges editable? → A: User can edit their own cartridges; Superadmin can edit System cartridges
- Q: Memory storage? → A: Mem0 with Supabase pgvector backend
- Q: Pricing concerns? → A: Not our concern (will be $2K/month, but that's business decision)

**V1.5 Reshare Clarifications:**

- Q: Should Reshare be built first or last? → A: LAST (Days 5-6 after V1 Core proven)
- Q: Browser automation tool? → A: Playwright with Chromium
- Q: Why Playwright if Unipile exists? → A: Unipile can't reshare posts (no API), only Playwright can click UI buttons
- Q: LinkedIn ban risk mitigation? → A: Ultra-conservative limits (20/day max), human behavior simulation, test accounts first
- Q: Pod size? → A: 9-10 members typical, but system supports any size
- Q: What if LinkedIn UI changes? → A: Multiple selector fallbacks, screenshot debugging, Slack alerts

---

## Outstanding Questions (Deferred to Planning)

1. **Unipile API specifics**: Exact rate limits, webhook payload format, error codes
2. **Mem0 setup**: Configuration, vector dimensions, similarity thresholds
3. **Redis/BullMQ production**: Upstash vs self-hosted, monitoring dashboard
4. **shadcn/ui components**: Which specific components for Superadmin UI
5. **Playwright stealth**: Additional anti-detection measures beyond typing/mouse

---

## MVP vs Future Evolution

### Fixed for MVP (V1 V1 V1)

- Unipile for LinkedIn API
- AgentKit with standard GPT-4 (not Realtime)
- Supabase PostgreSQL + pgvector
- BullMQ + Redis job queue
- Mem0 for persistent memory
- Playwright for Reshare automation
- Multi-tenant isolation (RLS policies)
- Webhook-based email delivery (no Mailgun)

### Designed for Evolution

- **Cartridge marketplace**: Future pre-built cartridges users can install
- **Additional skills**: Facebook, Twitter, email automation
- **Memory cleanup**: TTL policies, archive old memories
- **Reshare platforms**: Expand beyond LinkedIn (Twitter, Facebook)
- **Pricing tiers**: Usage limits configurable per tenant
- **Team collaboration**: Multi-user access to campaigns

---

## Integration with RevOS Ecosystem

This V1 V1 V1 build establishes the foundation for:

- **Cartridge architecture**: Extensible system for future features
- **AgentKit interface**: Conversational control across all RevOS features
- **Mem0 memory**: Persistent learning across user sessions
- **Multi-tenancy**: Scales to 100+ clients without code changes
- **Superadmin tools**: White-label management for agencies

Future "rooms" (features) will reuse:
- Same cartridge system
- Same AgentKit orchestration
- Same Mem0 memory layer
- Same multi-tenant database structure

---

## Timeline & Scope

**Days 1-4: V1 Core (Lead Magnet Automation) - 100 points**
- Supabase multi-tenant setup
- Unipile integration (comment scraping, DM automation)
- BullMQ + Redis job queue
- AgentKit + Cartridge system
- Mem0 integration
- User Voice auto-generation
- LinkedIn post creation
- Floating chat UI
- Simple dashboard (metric cards)
- Superadmin `/admin` interface

**Days 5-6: V1.5 Premium (Reshare Automation) - 90 points**
- Playwright integration
- Session capture UI
- Automated resharing with AI commentary
- Pod coordination algorithm
- Human behavior simulation
- Reshare analytics dashboard

**Total: 190 points over 6 days**

**This spec is ready for `/plan` execution.**
