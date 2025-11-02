# RevOS V1 - Complete Build Specification for Bolt.new v2

**Build Target**: Bolt.new v2 → 95% completion → Claude Code polish
**Architecture**: Multi-tenant B2B2C Agency Fulfillment System
**Paradigm**: "Factory Model" (assembly line) vs "Hotel Model" (separate tools)
**Date**: 2025-10-25
**GitHub**: https://github.com/growthpigs/1.0_alpha_revOS

---

## 🎯 CORE VISION

**What We're Building:**
A complete agency client fulfillment system where Diiiploy manages multiple clients through an automated content pipeline with LinkedIn pod engagement as the game-changing differentiator.

**The Factory Pipeline:**
```
Lead Magnet Selection → AI Post Generation → Human Approval →
Publishing → Pod Auto-Engagement (60min) → Comment Scraping (100s) →
DM Sequences (personalized) → Email Follow-up (conditional) →
Lead Nurturing → Conversion Tracking
```

**The Game Changer:**
When any pod member publishes content, the other 9 members automatically engage (like/comment) within the LinkedIn "golden hour" (60 minutes) to maximize algorithmic reach. This is based on Lords of LinkedIn methodology and detection-avoidance research.

---

## 🏗️ TECHNOLOGY STACK

### Core Platform
- **Frontend**: React + Vite + TypeScript
- **Backend**: Node.js + Express + TypeScript
- **Database**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Hosting**: Bolt.new v2 initial build → Replit/Vercel deployment

### External Services
- **LinkedIn Integration**: Unipile API ($5/account/month) - OAuth abstraction
- **Multi-platform Publishing**: LATE API or Ayrshare (LinkedIn + Twitter + IG + FB + TikTok)
- **AI Content**: Claude API (Sonnet 4) - post generation, comment generation, personalization
- **Image Generation**:
  - Phase 1: OpenAI DALL-E (user has key)
  - Phase 2: NanoBanana API (user has credits) OR custom graphic designer system (feature flagged)
- **Lead Enrichment**: Apollo.io API (optional)
- **Email Sequences**: Instantly.ai or Smartlead (cold outreach)
- **Transactional Email**: Mailgun
- **Webhooks**: Unipile webhooks for post publish events

### Development Tools
- **Testing**: Vitest
- **API Testing**: Postman/Insomnia collections
- **Database Migrations**: Supabase migrations
- **Version Control**: Git + GitHub

---

## 📊 DATABASE SCHEMA (Supabase PostgreSQL)

### Core Multi-Tenancy Tables

```sql
-- AGENCIES (Super Admin Tenants)
CREATE TABLE agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  owner_email VARCHAR(255) NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- USERS (Agency admins + Client users)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL, -- 'super_admin', 'agency_admin', 'client_admin', 'client_user'
  full_name VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- CLIENTS (Isolated Sub-Tenants)
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'paused', 'churned'
  onboarding_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'

  -- Service Configuration
  services_enabled JSONB DEFAULT '{}', -- { "pod_engagement": true, "dm_sequences": true, ... }

  -- Branding
  brand_colors JSONB,
  logo_url TEXT,

  -- Contact
  primary_contact_email VARCHAR(255),
  primary_contact_name VARCHAR(255),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(agency_id, slug)
);

-- SOCIAL ACCOUNTS (Unified OAuth via Unipile)
CREATE TABLE social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  platform VARCHAR(50) NOT NULL, -- 'linkedin', 'twitter', 'instagram', 'facebook', 'tiktok'
  account_name VARCHAR(255) NOT NULL,
  account_handle VARCHAR(255),
  account_id VARCHAR(255), -- Platform-specific ID

  -- Unipile Integration
  unipile_account_id VARCHAR(255) UNIQUE,
  access_token_encrypted TEXT,
  token_expires_at TIMESTAMP,

  status VARCHAR(50) DEFAULT 'active', -- 'active', 'expired', 'revoked'

  -- Metadata
  profile_picture_url TEXT,
  follower_count INTEGER,
  connection_count INTEGER,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Pod Engagement System

```sql
-- ENGAGEMENT PODS
CREATE TABLE engagement_pods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Settings
  max_members INTEGER DEFAULT 10,
  engagement_window_minutes INTEGER DEFAULT 60, -- Golden hour
  auto_engage BOOLEAN DEFAULT true,

  -- Randomization Settings
  min_delay_seconds INTEGER DEFAULT 20,
  max_delay_seconds INTEGER DEFAULT 300,
  comment_required_percentage INTEGER DEFAULT 70, -- 70% must comment, 30% can just like

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- POD MEMBERS (Cross-Tenant Permissions)
CREATE TABLE pod_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id UUID REFERENCES engagement_pods(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  social_account_id UUID REFERENCES social_accounts(id) ON DELETE CASCADE,

  -- Permissions
  can_engage BOOLEAN DEFAULT true,
  can_see_analytics BOOLEAN DEFAULT true,

  -- Engagement Settings
  engagement_preferences JSONB DEFAULT '{"reactions": ["Like", "Celebrate"], "auto_comment": true}',

  joined_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'active' -- 'active', 'paused', 'removed'
);

-- POD ENGAGEMENT QUEUE (Staggered Execution)
CREATE TABLE pod_engagement_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id UUID REFERENCES engagement_pods(id) ON DELETE CASCADE,
  post_id UUID REFERENCES content_posts(id) ON DELETE CASCADE,
  member_id UUID REFERENCES pod_members(id) ON DELETE CASCADE,

  -- Scheduling
  scheduled_at TIMESTAMP NOT NULL,
  executed_at TIMESTAMP,

  -- Action Details
  engagement_type VARCHAR(50), -- 'like', 'comment', 'reaction'
  reaction_type VARCHAR(50), -- 'Like', 'Love', 'Celebrate', 'Support', 'Insightful', 'Funny'
  comment_text TEXT,

  -- Status Tracking
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'executing', 'completed', 'failed'
  error_message TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);
```

### Content Pipeline

```sql
-- LEAD MAGNETS (Content Templates)
CREATE TABLE lead_magnets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,

  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_url TEXT, -- Supabase Storage link

  -- AI Prompt Template
  ai_prompt_template TEXT, -- Template for post generation
  target_audience TEXT,
  key_talking_points TEXT[],

  -- Delivery
  delivery_method VARCHAR(50) DEFAULT 'dm_link', -- 'dm_link', 'email_attachment', 'landing_page'
  landing_page_url TEXT,

  -- Analytics
  download_count INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- CAMPAIGNS
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  lead_magnet_id UUID REFERENCES lead_magnets(id) ON DELETE SET NULL,

  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'active', 'paused', 'completed'

  -- Campaign Flow
  enable_pod_engagement BOOLEAN DEFAULT true,
  enable_comment_scraping BOOLEAN DEFAULT true,
  enable_dm_sequences BOOLEAN DEFAULT true,
  enable_email_followup BOOLEAN DEFAULT true,

  -- Targeting
  target_platforms VARCHAR(50)[] DEFAULT ARRAY['linkedin'],

  -- Timeline
  start_date DATE,
  end_date DATE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- CONTENT POSTS
CREATE TABLE content_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,

  -- Content
  title VARCHAR(500),
  body TEXT NOT NULL,
  media_urls TEXT[],
  hashtags VARCHAR(100)[],

  -- AI Generation
  ai_generated BOOLEAN DEFAULT false,
  ai_prompt TEXT,
  human_edited BOOLEAN DEFAULT false,

  -- Publishing
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'scheduled', 'published', 'failed'
  scheduled_at TIMESTAMP,
  published_at TIMESTAMP,

  -- Platform-Specific IDs
  linkedin_post_id VARCHAR(255),
  twitter_post_id VARCHAR(255),
  instagram_post_id VARCHAR(255),
  facebook_post_id VARCHAR(255),
  tiktok_post_id VARCHAR(255),

  -- Analytics
  total_impressions INTEGER DEFAULT 0,
  total_engagements INTEGER DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  total_shares INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Lead Management

```sql
-- LEADS (Scraped from comments)
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  post_id UUID REFERENCES content_posts(id) ON DELETE SET NULL,

  -- LinkedIn Data (from Unipile scraping)
  linkedin_profile_url VARCHAR(500),
  linkedin_profile_id VARCHAR(255),
  full_name VARCHAR(255),
  headline TEXT,
  profile_picture_url TEXT,

  -- Connection Degree
  connection_degree INTEGER, -- 1, 2, or 3
  mutual_connections INTEGER,

  -- Apollo.io Enrichment
  email VARCHAR(255),
  phone VARCHAR(50),
  company_name VARCHAR(255),
  company_domain VARCHAR(255),
  job_title VARCHAR(255),
  seniority_level VARCHAR(100),
  department VARCHAR(100),

  -- Lead Scoring
  lead_score INTEGER DEFAULT 0, -- 0-100
  lead_quality VARCHAR(50), -- 'hot', 'warm', 'cold', 'spam'

  -- Engagement History
  commented_at TIMESTAMP,
  comment_text TEXT,
  dm_sent_at TIMESTAMP,
  dm_opened BOOLEAN DEFAULT false,
  dm_replied BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMP,
  email_opened BOOLEAN DEFAULT false,

  -- Enrichment Status
  enrichment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'enriched', 'failed'
  enriched_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- DM SEQUENCES
CREATE TABLE dm_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,

  sequence_step INTEGER DEFAULT 1, -- 1 = initial DM with lead magnet

  -- Message Content
  message_text TEXT NOT NULL,
  lead_magnet_link TEXT,

  -- AI Personalization
  ai_personalized BOOLEAN DEFAULT true,
  personalization_variables JSONB, -- { "name": "John", "company": "Acme", "comment": "Great insight!" }

  -- Delivery
  status VARCHAR(50) DEFAULT 'queued', -- 'queued', 'sent', 'opened', 'replied', 'failed'
  sent_at TIMESTAMP,
  opened_at TIMESTAMP,
  replied_at TIMESTAMP,

  -- Rate Limiting
  rate_limit_bucket VARCHAR(100), -- For hourly DM limit tracking

  created_at TIMESTAMP DEFAULT NOW()
);

-- EMAIL SEQUENCES (Fallback if DM unopened)
CREATE TABLE email_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,

  sequence_step INTEGER DEFAULT 1,

  -- Email Content
  subject_line VARCHAR(500),
  body_html TEXT,
  body_text TEXT,

  -- Conditions
  trigger_condition VARCHAR(100) DEFAULT 'dm_unopened_48h',

  -- Delivery (via Instantly/Smartlead)
  status VARCHAR(50) DEFAULT 'queued',
  sent_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  replied_at TIMESTAMP,

  -- Integration IDs
  instantly_campaign_id VARCHAR(255),
  smartlead_campaign_id VARCHAR(255),

  created_at TIMESTAMP DEFAULT NOW()
);
```

### Analytics & Reporting

```sql
-- ANALYTICS EVENTS
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  post_id UUID REFERENCES content_posts(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,

  event_type VARCHAR(100) NOT NULL, -- 'post_published', 'comment_scraped', 'dm_sent', 'email_opened', etc.
  event_data JSONB,

  occurred_at TIMESTAMP DEFAULT NOW()
);

-- CAMPAIGN METRICS (Aggregated)
CREATE TABLE campaign_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Posting Metrics
  posts_published INTEGER DEFAULT 0,
  total_impressions INTEGER DEFAULT 0,
  total_engagements INTEGER DEFAULT 0,

  -- Pod Metrics
  pod_engagements_executed INTEGER DEFAULT 0,
  avg_engagement_time_minutes DECIMAL(10,2),

  -- Lead Metrics
  comments_scraped INTEGER DEFAULT 0,
  leads_created INTEGER DEFAULT 0,
  leads_enriched INTEGER DEFAULT 0,

  -- Outreach Metrics
  dms_sent INTEGER DEFAULT 0,
  dms_opened INTEGER DEFAULT 0,
  dms_replied INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,

  -- Conversion Metrics
  lead_magnets_delivered INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(campaign_id, date)
);
```

---

## 🎨 DESIGN SYSTEM (Extract from Existing LGE)

### Color Palette
```css
/* Primary Colors */
--purple-primary: #8B5CF6;
--purple-dark: #6D28D9;
--purple-light: #A78BFA;

/* Secondary Colors */
--green-success: #10B981;
--orange-warning: #F59E0B;

/* Neutrals */
--gray-50: #F9FAFB;
--gray-100: #F3F4F6;
--gray-900: #111827;

/* Status Colors */
--status-draft: #6B7280;
--status-active: #10B981;
--status-paused: #F59E0B;
--status-completed: #3B82F6;
```

### Typography
```css
/* Headings */
font-family: 'Libre Baskerville', serif;

/* Body Text */
font-family: 'Inter', sans-serif;

/* Mono (Code/Data) */
font-family: 'JetBrains Mono', monospace;
```

### Component Patterns
- Kanban boards for campaigns/tasks
- Slide-out panels for details (like GitHub issues)
- Write/Preview markdown editors
- Real-time progress indicators
- Toast notifications for actions

---

## 🔐 AUTHENTICATION & AUTHORIZATION

### Multi-Portal Architecture

**Admin Portal** (`admin.revos.com`):
- Agency super admins
- Full access to all clients
- Tenant management
- Pod configuration
- System-wide analytics

**Client Portal** (`app.revos.com`):
- Client admins + users
- Tenant-isolated views
- Campaign management
- Lead tracking
- Limited analytics (own data only)

### Auth Flow (Supabase)

1. **Sign Up/Login**: Supabase Auth (email/password or OAuth)
2. **Role Assignment**: Auto-assigned based on invite (agency vs client)
3. **Session Management**: JWT tokens, refresh tokens
4. **Row-Level Security (RLS)**:
   ```sql
   -- Example RLS policy for clients table
   CREATE POLICY "Clients can only see their own data"
   ON clients
   FOR SELECT
   USING (
     id IN (
       SELECT client_id FROM users WHERE id = auth.uid()
     )
   );

   -- Agency admins can see all clients
   CREATE POLICY "Agency admins see all clients"
   ON clients
   FOR SELECT
   USING (
     agency_id IN (
       SELECT agency_id FROM users WHERE id = auth.uid() AND role = 'agency_admin'
     )
   );
   ```

### Social OAuth (Unipile)

**Flow**:
1. User clicks "Connect LinkedIn" in RevOS
2. RevOS calls Unipile OAuth initiation endpoint
3. User redirects to LinkedIn authorization page
4. User approves
5. Unipile receives tokens and stores them
6. RevOS receives `unipile_account_id`
7. Store in `social_accounts` table with encrypted tokens

**Token Refresh**: Unipile handles automatically

---

## 🚀 CORE FEATURE SPECIFICATIONS

### Feature #1: LinkedIn Pod Auto-Engagement

**User Story**: When any pod member publishes a post, the other 9 members automatically engage (like/comment) within 60 minutes, staggered naturally to avoid detection.

**Technical Implementation**:

1. **Webhook Listener** (`/api/webhooks/unipile/post-published`):
   ```typescript
   // When Unipile sends webhook for new post
   POST /api/webhooks/unipile/post-published
   {
     "account_id": "unipile_abc123",
     "post_id": "linkedin_xyz789",
     "platform": "linkedin",
     "published_at": "2025-10-25T14:30:00Z"
   }

   // Handler:
   1. Find post in content_posts by linkedin_post_id
   2. Find pod membership for this social_account
   3. Get all OTHER pod members (exclude author)
   4. For each member:
      a. Generate random delay (20s to 5min)
      b. Decide: comment (70% chance) or just react (30% chance)
      c. If comment: call Claude API to generate unique comment
      d. If react: randomize reaction type (Like 40%, Celebrate 30%, Support 20%, Insightful 10%)
      e. Insert into pod_engagement_queue with scheduled_at = NOW() + random_delay
   ```

2. **Background Worker** (runs every 30 seconds):
   ```typescript
   // Process pending engagements
   SELECT * FROM pod_engagement_queue
   WHERE status = 'pending' AND scheduled_at <= NOW()
   ORDER BY scheduled_at ASC
   LIMIT 10;

   // For each engagement:
   1. Set status = 'executing'
   2. Call Unipile API:
      - POST /api/posts/{post_id}/comment (if comment)
      - POST /api/posts/{post_id}/reaction (if reaction)
   3. Simulate dwell time (wait 5-30 seconds before API call)
   4. Set status = 'completed', executed_at = NOW()
   5. Update analytics_events
   ```

3. **AI Comment Generation** (Claude API):
   ```typescript
   const prompt = `
   You are a LinkedIn engagement pod member. Generate a unique, authentic comment for this post.

   Post Content: "${postBody}"

   Requirements:
   - 15-50 words
   - Sound natural and authentic
   - Add value or ask a thoughtful question
   - Avoid generic phrases like "Great post!" or "Thanks for sharing"
   - Match professional tone
   - No emojis unless post has emojis

   Comment:
   `;

   const response = await claudeAPI.generate(prompt);
   return response.content;
   ```

4. **Detection Avoidance**:
   - ✅ Randomized delays (20s, 40s, 1m, 2m, 5m)
   - ✅ Unique AI-generated comments (no templates)
   - ✅ Mixed reaction types (Like, Celebrate, Support, Insightful)
   - ✅ Simulated dwell time (5-30s pause before engagement)
   - ✅ 70/30 comment/react ratio (not all members comment)
   - ✅ Within 60-minute golden hour window

---

### Feature #2: Comment Scraping & Lead Capture

**User Story**: After a post is published and pod engages, scrape ALL commenters (hundreds), prioritize 1st/2nd degree connections, filter spam, and create leads.

**Technical Implementation**:

1. **Scraping Trigger** (90 minutes after post published):
   ```typescript
   // Cron job runs every 5 minutes
   SELECT * FROM content_posts
   WHERE published_at <= NOW() - INTERVAL '90 minutes'
   AND scraping_status = 'pending';

   // For each post:
   1. Call Unipile API: GET /api/posts/{post_id}/comments?limit=500
   2. For each commenter:
      a. Check if already exists in leads table (by linkedin_profile_id)
      b. If new: INSERT INTO leads
      c. Extract: name, headline, profile_url, connection_degree, comment_text
      d. Queue for enrichment (Apollo.io batch job)
   ```

2. **Priority Queue** (1st degree → 2nd degree → 3rd degree):
   ```typescript
   // Process in batches throughout the day
   SELECT * FROM leads
   WHERE enrichment_status = 'pending'
   ORDER BY connection_degree ASC, created_at ASC
   LIMIT 50;

   // Enrich with Apollo.io
   POST https://api.apollo.io/v1/people/match
   {
     "first_name": "John",
     "last_name": "Smith",
     "linkedin_url": "https://linkedin.com/in/johnsmith"
   }

   // Update leads with email, phone, company, etc.
   ```

3. **Spam Filtering** (AI):
   ```typescript
   const prompt = `
   Analyze this LinkedIn commenter profile. Is this a legitimate lead or spam/bot?

   Name: "${name}"
   Headline: "${headline}"
   Comment: "${comment}"

   Respond with JSON:
   {
     "is_spam": boolean,
     "lead_quality": "hot" | "warm" | "cold",
     "reason": "explanation"
   }
   `;

   const result = await claudeAPI.generate(prompt);
   if (result.is_spam) {
     UPDATE leads SET lead_quality = 'spam';
   }
   ```

4. **Rate Limiting**:
   - Max 100 comments scraped per post
   - Throttle: 1 request per 2 seconds to Unipile
   - Batch Apollo enrichment: 50 leads per batch, 1 batch per hour

---

### Feature #3: Personalized DM Sequences

**User Story**: After lead is enriched, automatically send personalized DM with lead magnet link, staggered naturally.

**Technical Implementation**:

1. **DM Queue Trigger** (after enrichment):
   ```typescript
   // When lead enrichment completes
   UPDATE leads SET enrichment_status = 'enriched';

   // Trigger:
   INSERT INTO dm_sequences (campaign_id, lead_id, message_text, status)
   VALUES (
     campaign_id,
     lead_id,
     generatePersonalizedDM(lead, leadMagnet),
     'queued'
   );
   ```

2. **AI Personalization**:
   ```typescript
   const prompt = `
   Generate a personalized LinkedIn DM for this lead.

   Lead Info:
   - Name: ${lead.full_name}
   - Company: ${lead.company_name}
   - Job Title: ${lead.job_title}
   - Their Comment: "${lead.comment_text}"

   Lead Magnet: ${leadMagnet.title}

   Requirements:
   - Thank them for commenting
   - Reference their comment specifically
   - Offer lead magnet as valuable resource
   - Include download link
   - Keep under 300 characters
   - Conversational, not salesy

   DM:
   `;

   const dm = await claudeAPI.generate(prompt);
   return dm + `\n\nDownload: ${leadMagnetUrl}`;
   ```

3. **DM Sending Worker** (runs every 2 minutes):
   ```typescript
   // Respect hourly limit (50 DMs/hour)
   const hourlyLimit = 50;
   const sentThisHour = await countDMsSentInLastHour();

   if (sentThisHour >= hourlyLimit) {
     return; // Wait until next hour
   }

   // Get next queued DM
   SELECT * FROM dm_sequences
   WHERE status = 'queued'
   ORDER BY created_at ASC
   LIMIT 1;

   // Send via Unipile
   POST /api/messages/send
   {
     "account_id": "unipile_abc",
     "recipient_profile_url": lead.linkedin_profile_url,
     "message": dm.message_text
   }

   // Update status
   UPDATE dm_sequences SET status = 'sent', sent_at = NOW();
   ```

4. **Staggered Delivery**:
   - 50 DMs per hour max
   - 2-minute minimum delay between DMs
   - Randomize: some sent immediately, some delayed 5-10 minutes

---

### Feature #4: Conditional Email Follow-up

**User Story**: If DM is not opened within 48 hours, automatically send email follow-up (if email was enriched).

**Technical Implementation**:

1. **Condition Check** (cron job every 4 hours):
   ```typescript
   // Find DMs sent 48+ hours ago, unopened, with email available
   SELECT dm.*, l.email FROM dm_sequences dm
   JOIN leads l ON dm.lead_id = l.id
   WHERE dm.sent_at <= NOW() - INTERVAL '48 hours'
   AND dm.status = 'sent' -- not 'opened'
   AND l.email IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM email_sequences es
     WHERE es.lead_id = dm.lead_id
   );

   // For each: create email sequence
   INSERT INTO email_sequences (campaign_id, lead_id, subject_line, body_html, status)
   VALUES (
     dm.campaign_id,
     dm.lead_id,
     generateEmailSubject(lead, leadMagnet),
     generateEmailBody(lead, leadMagnet),
     'queued'
   );
   ```

2. **Email Sending** (via Instantly/Smartlead API):
   ```typescript
   // Send to Instantly.ai campaign
   POST https://api.instantly.ai/api/v1/campaign/send
   {
     "campaign_id": "instantly_camp_123",
     "email": lead.email,
     "variables": {
       "first_name": lead.first_name,
       "company": lead.company_name,
       "lead_magnet_link": leadMagnetUrl
     }
   }

   // Update status
   UPDATE email_sequences SET status = 'sent', sent_at = NOW();
   ```

3. **Webhook Tracking** (Instantly sends open/click events):
   ```typescript
   POST /api/webhooks/instantly/email-opened
   {
     "email": "john@example.com",
     "campaign_id": "instantly_camp_123",
     "opened_at": "2025-10-25T16:00:00Z"
   }

   // Handler:
   UPDATE email_sequences SET opened_at = NOW();
   UPDATE leads SET email_opened = true;
   ```

---

### Feature #5: AI Post Generation

**User Story**: Select lead magnet, click "Generate Post", AI creates LinkedIn post based on template, user edits and approves.

**Technical Implementation**:

1. **Generation Request**:
   ```typescript
   POST /api/content/generate
   {
     "lead_magnet_id": "uuid",
     "tone": "professional" | "casual" | "thought_leadership",
     "length": "short" | "medium" | "long",
     "include_image": boolean
   }

   // Handler:
   const leadMagnet = await getLeadMagnet(lead_magnet_id);
   const prompt = leadMagnet.ai_prompt_template;

   const aiPost = await claudeAPI.generate(
     `${prompt}\n\nTone: ${tone}\nLength: ${length}\n\nGenerate LinkedIn post:`
   );

   // If include_image:
   const imagePrompt = await claudeAPI.generate(
     `Generate DALL-E prompt for image to accompany this LinkedIn post:\n\n${aiPost}`
   );
   const image = await dalleAPI.generate(imagePrompt);

   return {
     body: aiPost,
     media_urls: [image.url],
     ai_generated: true
   };
   ```

2. **Human Approval Flow**:
   ```
   Draft → Review → Edit → Approve → Schedule → Publish
   ```

3. **Publishing** (via Unipile or LATE):
   ```typescript
   POST /api/posts/publish
   {
     "post_id": "uuid",
     "platforms": ["linkedin", "twitter"],
     "schedule_at": "2025-10-25T14:00:00Z" // or publish immediately
   }

   // Call Unipile:
   POST https://api.unipile.com/v1/posts
   {
     "account_id": "unipile_abc",
     "text": post.body,
     "media_urls": post.media_urls
   }

   // Store platform IDs
   UPDATE content_posts SET linkedin_post_id = response.id, published_at = NOW();
   ```

---

## 📱 USER INTERFACE SPECIFICATIONS

### Admin Portal Views

1. **Dashboard** (`/dashboard`):
   - Agency overview: Total clients, active campaigns, leads this month
   - Recent activity feed
   - Quick actions: New client, New campaign, View analytics

2. **Clients** (`/clients`):
   - Table view: Name, Status, Active Campaigns, Total Leads, Actions
   - Filters: Status, Service enabled
   - Actions: View details, Edit, Pause, Delete

3. **Client Detail** (`/clients/:id`):
   - Tabs: Overview, Campaigns, Leads, Social Accounts, Settings
   - Overview: Service configuration, recent activity, metrics
   - Campaigns: List with status, metrics, actions
   - Social Accounts: Connected platforms, OAuth status, reconnect

4. **Pod Management** (`/pods`):
   - List all pods
   - Create/edit pod: Name, Members (drag-drop), Settings (engagement window, delays)
   - Pod detail: Member list, engagement history, analytics

5. **Campaign Builder** (`/campaigns/new`):
   - Step 1: Select client, name campaign, dates
   - Step 2: Select lead magnet (or create new)
   - Step 3: Configure services (pod, scraping, DM, email)
   - Step 4: Generate or upload content
   - Step 5: Schedule/publish

6. **Analytics** (`/analytics`):
   - Date range selector
   - Metrics cards: Posts published, Impressions, Engagements, Leads, DMs sent, Emails sent
   - Charts: Engagement over time, Lead funnel, Campaign comparison
   - Export: PDF report, CSV data

### Client Portal Views

1. **Dashboard** (`/dashboard`):
   - My campaigns
   - Recent leads
   - Content calendar

2. **Campaigns** (`/campaigns`):
   - Kanban board: Draft, Scheduled, Active, Completed
   - Click card → Slide-out detail panel (like GitHub)

3. **Leads** (`/leads`):
   - Table view with filters (quality, source, date)
   - Click row → Lead detail (profile, engagement history, actions)

4. **Content Library** (`/content`):
   - All posts: Grid or list view
   - Filters: Status, Platform, Date
   - Actions: Edit, Duplicate, Delete, View analytics

---

## 🔌 API INTEGRATION GUIDES

### Unipile API Integration

**Base URL**: `https://api.unipile.com/v1`

**Authentication**: Bearer token in headers

**Key Endpoints**:
- `POST /accounts/connect` - OAuth initiation
- `GET /accounts/:id` - Get account details
- `POST /posts` - Publish post
- `GET /posts/:id/comments` - Scrape comments
- `POST /posts/:id/reaction` - Add reaction
- `POST /posts/:id/comment` - Add comment
- `POST /messages/send` - Send DM
- `GET /webhooks` - List webhooks
- `POST /webhooks` - Create webhook

**Webhook Events**:
- `post.published` - Post went live
- `message.received` - DM reply received
- `account.expired` - Token expired

### Claude API Integration (Sonnet 4)

**Use Cases**:
- Post generation
- Comment generation
- DM personalization
- Spam filtering
- Email subject lines

**Example**:
```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
});

const message = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  messages: [{
    role: 'user',
    content: prompt
  }]
});

return message.content[0].text;
```

### Apollo.io API Integration

**Base URL**: `https://api.apollo.io/v1`

**Key Endpoints**:
- `POST /people/match` - Match LinkedIn profile to enriched data
- `POST /people/search` - Search people by criteria

**Batch Processing**:
```typescript
// Batch 50 leads at a time
const leads = await getUnenrichedLeads(50);

for (const lead of leads) {
  const enrichedData = await apolloAPI.match({
    linkedin_url: lead.linkedin_profile_url
  });

  await updateLead(lead.id, {
    email: enrichedData.email,
    phone: enrichedData.phone,
    company_name: enrichedData.company?.name,
    enrichment_status: 'enriched'
  });
}
```

### DALL-E / NanoBanana Integration

**For MVP**: OpenAI DALL-E 3

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const response = await openai.images.generate({
  model: 'dall-e-3',
  prompt: imagePrompt,
  size: '1024x1024',
  quality: 'standard',
  n: 1
});

const imageUrl = response.data[0].url;

// Upload to Supabase Storage
const { data, error } = await supabase.storage
  .from('generated-images')
  .upload(`${uuid()}.png`, imageBlob);

return data.publicUrl;
```

---

## 🧪 TESTING STRATEGY

### Unit Tests (Vitest)
- AI generation functions
- DM personalization logic
- Rate limiting calculations
- Lead scoring algorithms

### Integration Tests
- Unipile API mocking
- Webhook handling
- Queue processing
- Database transactions

### E2E Tests (Playwright)
- Campaign creation flow
- Post generation → approval → publish
- Lead detail viewing
- Pod member management

### Manual Testing Checklist
- [ ] OAuth flow (LinkedIn)
- [ ] Pod engagement timing
- [ ] DM sending with rate limits
- [ ] Email fallback trigger
- [ ] Analytics accuracy
- [ ] Multi-tenant isolation (RLS)

---

## 🚀 DEPLOYMENT & ENVIRONMENT

### Environment Variables

```bash
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx

# Unipile
UNIPILE_API_KEY=upk_xxx
UNIPILE_API_URL=https://api.unipile.com/v1
UNIPILE_WEBHOOK_SECRET=whsec_xxx

# Claude API
CLAUDE_API_KEY=sk-ant-xxx

# OpenAI (DALL-E)
OPENAI_API_KEY=sk-xxx

# Apollo.io
APOLLO_API_KEY=xxx

# Instantly.ai
INSTANTLY_API_KEY=xxx

# Mailgun
MAILGUN_API_KEY=xxx
MAILGUN_DOMAIN=revos.com

# App Config
NODE_ENV=production
VITE_APP_URL=https://app.revos.com
VITE_ADMIN_URL=https://admin.revos.com
```

### Deployment Steps (Bolt.new → Production)

1. **Bolt.new Development**:
   - Build entire app in Bolt.new v2
   - Test all features in Bolt environment
   - Export code when 95% complete

2. **GitHub Repository**:
   - Push to https://github.com/growthpigs/1.0_alpha_revOS
   - Create `main`, `staging`, `development` branches

3. **Supabase Setup**:
   - Create project
   - Run database migrations
   - Configure RLS policies
   - Set up storage buckets
   - Enable auth providers

4. **Production Deploy** (Vercel or Replit):
   - Connect GitHub repo
   - Set environment variables
   - Configure custom domains
   - Enable auto-deploy on push

5. **Webhook Configuration**:
   - Add webhook URLs in Unipile dashboard
   - Test webhook delivery
   - Monitor webhook logs

---

## 📋 BUILD PHASES

### Phase 1: Core Infrastructure (Week 1)
- [ ] Database schema (Supabase)
- [ ] Authentication (agency + client portals)
- [ ] Multi-tenant RLS policies
- [ ] Basic UI shell (admin + client)

### Phase 2: Social Integration (Week 2)
- [ ] Unipile OAuth flow
- [ ] Social accounts CRUD
- [ ] Account status monitoring
- [ ] Token refresh handling

### Phase 3: Content Pipeline (Week 3)
- [ ] Lead magnet CRUD
- [ ] AI post generation (Claude)
- [ ] Image generation (DALL-E)
- [ ] Content approval workflow
- [ ] Publishing (Unipile)

### Phase 4: Pod Engagement (Week 4) ⭐ CORE DIFFERENTIATOR
- [ ] Pod CRUD
- [ ] Pod member management
- [ ] Webhook listener (post published)
- [ ] Engagement queue system
- [ ] AI comment generation
- [ ] Randomized timing/reactions
- [ ] Background worker execution

### Phase 5: Lead Capture (Week 5)
- [ ] Comment scraping (Unipile)
- [ ] Lead creation
- [ ] Apollo.io enrichment
- [ ] AI spam filtering
- [ ] Lead scoring

### Phase 6: Outreach Automation (Week 6)
- [ ] DM sequence templates
- [ ] AI personalization
- [ ] DM sending worker
- [ ] Rate limiting
- [ ] Email sequence templates
- [ ] Instantly.ai integration
- [ ] Conditional email trigger

### Phase 7: Analytics & Reporting (Week 7)
- [ ] Event tracking
- [ ] Campaign metrics aggregation
- [ ] Dashboard charts
- [ ] PDF report generation
- [ ] CSV export

### Phase 8: Polish & Testing (Week 8)
- [ ] UI/UX refinements
- [ ] Error handling
- [ ] Loading states
- [ ] Toast notifications
- [ ] E2E tests
- [ ] Performance optimization

---

## 🎯 SUCCESS CRITERIA

### Technical Goals
- ✅ Multi-tenant isolation (RLS enforced)
- ✅ Pod engagement within 60 minutes (90%+ success rate)
- ✅ No LinkedIn detection warnings
- ✅ DM rate limit compliance (50/hour max)
- ✅ Sub-2-second page load times
- ✅ 99.9% uptime

### Business Goals
- ✅ 10 clients onboarded
- ✅ 100+ pods configured
- ✅ 1,000+ posts published with pod engagement
- ✅ 10,000+ leads captured
- ✅ 5,000+ DMs sent
- ✅ 20% DM → reply conversion rate
- ✅ Agency can manage all clients from one portal

---

## 🔗 REFERENCE LINKS

- **Unipile Docs**: https://docs.unipile.com
- **Claude API**: https://docs.anthropic.com
- **Apollo.io API**: https://apolloio.github.io/apollo-api-docs
- **Supabase**: https://supabase.com/docs
- **LATE API**: https://late.ai/docs
- **Instantly.ai**: https://instantly.ai/docs

---

## 📝 NOTES FOR BOLT.NEW v2

**Key Prompts to Use**:

1. **Initial Setup**:
   > "Create a multi-tenant B2B2C platform with Supabase backend. Two portals: admin (agency) and client. Use React + Vite + TypeScript. Include authentication with RLS policies for tenant isolation."

2. **Pod Engagement Feature**:
   > "Build LinkedIn pod engagement automation: When post published, webhook triggers background worker to queue staggered engagement (likes/comments) for 9 other pod members within 60 minutes. Use AI (Claude) to generate unique comments. Implement randomized timing (20s-5min delays) and reaction types to avoid detection."

3. **Comment Scraping**:
   > "Create comment scraping pipeline: 90 minutes after post, scrape all commenters via Unipile API, prioritize 1st/2nd degree connections, filter spam with AI, create leads in database, queue for Apollo.io enrichment."

4. **DM Automation**:
   > "Build personalized DM sequences: After lead enrichment, generate AI-personalized DM referencing their comment, include lead magnet link, send via Unipile with rate limiting (50/hour), track opens/replies."

5. **Design System**:
   > "Use purple (#8B5CF6) primary color, Libre Baskerville for headings, Inter for body text. Build GitHub-style UI: Kanban boards for campaigns, slide-out panels for details, Write/Preview markdown editors."

**Bolt.new Best Practices**:
- Start with database schema
- Build authentication first
- Create one feature at a time, fully working before next
- Test API integrations early
- Use mock data for development
- Add error handling from the start

---

**END OF SPECIFICATION**

This document contains everything needed for Bolt.new v2 to build RevOS V1 to 95% completion. Final 20% polish in Claude Code with Archon task management.
