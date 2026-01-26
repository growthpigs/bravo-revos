# RevOS Growth Engine - COMPLETE PRODUCTION ARCHITECTURE
## Replit-Native Full-Stack Multi-Channel Outreach System

---

## **🎯 PROJECT MANDATE**

**NOT AN MVP - THIS IS THE REAL PRODUCT**

- ✅ **Complete multi-channel orchestration**: LinkedIn → Email → SMS → AI agents
- ✅ **Nothing missing**: Every feature fully implemented
- ✅ **FAANG-quality design**: Light theme, JetBrains Mono, professional UI
- ✅ **Replit-native**: Leverage all Replit features, minimal external dependencies
- ✅ **Production-ready**: Scalable, secure, performant from day 1

**Development Approach:**
1. **Phase 1 (Today 1-2 hours)**: Replit auto-scaffolding + database setup
2. **Phase 2 (Today afternoon)**: Claude Code + Codex collaborative development
3. **Phase 3 (Evening)**: Testing, polish, deployment

---

## **🏗️ TECHNICAL ARCHITECTURE**

### **Stack Decision Matrix**

#### **Backend: Node.js + Express + TypeScript**
**Why:**
- Replit native support (best performance)
- Fast development with AI coding assistants
- Excellent async handling for multi-channel orchestration
- Rich ecosystem for integrations

#### **Frontend: React + TypeScript + Tailwind CSS**
**Why:**
- Codex GPT-5 excellence at React
- Tailwind for FAANG-quality rapid UI
- Component reusability
- SPA performance

#### **Database: Replit PostgreSQL (Native)**
**Why:**
- Zero configuration overhead
- Automatic backups and scaling
- Native Replit integration (no API latency)
- Production-grade Postgres
- **AVOID**: Neon/Supabase (unnecessary external dependency)

#### **Authentication: Clerk**
**Why:**
- Drop-in React components
- Production-ready security
- User management UI included
- B2B multi-tenant ready

#### **API Integrations:**
- **Unipile**: Multi-channel messaging (LinkedIn, Email, SMS, WhatsApp)
- **Perplexity**: Company research
- **OpenAI GPT-4**: Message generation
- **Claude 3.5 Sonnet**: Strategic analysis (via API)

---

## **📊 DATABASE SCHEMA - COMPLETE**

### **Core Tables**

```sql
-- ============================================
-- USERS & AUTHENTICATION
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  company_name VARCHAR(255),
  company_domain VARCHAR(255),
  timezone VARCHAR(50) DEFAULT 'UTC',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_clerk_id ON users(clerk_user_id);
CREATE INDEX idx_users_email ON users(email);

-- ============================================
-- CAMPAIGNS (Multi-Channel Orchestration)
-- ============================================
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Campaign Details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'draft', -- draft, active, paused, completed, archived
  
  -- Channel Configuration
  channels JSONB NOT NULL, -- {"linkedin": true, "email": true, "sms": false}
  
  -- Targeting Rules
  target_criteria JSONB, -- Job titles, industries, company sizes, locations
  
  -- Timing & Rate Limits
  daily_linkedin_limit INTEGER DEFAULT 25,
  daily_email_limit INTEGER DEFAULT 100,
  timezone VARCHAR(50) DEFAULT 'UTC',
  sending_hours JSONB, -- {"start": "09:00", "end": "17:00"}
  
  -- Performance Tracking
  total_leads INTEGER DEFAULT 0,
  linkedin_sent INTEGER DEFAULT 0,
  linkedin_accepted INTEGER DEFAULT 0,
  linkedin_responses INTEGER DEFAULT 0,
  email_sent INTEGER DEFAULT 0,
  email_opened INTEGER DEFAULT 0,
  email_clicked INTEGER DEFAULT 0,
  email_replied INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX idx_campaigns_user ON campaigns(user_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);

-- ============================================
-- LEADS (Enriched Contact Data)
-- ============================================
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  
  -- Basic Info
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  company_name VARCHAR(255),
  company_domain VARCHAR(255),
  job_title VARCHAR(255),
  
  -- Social Profiles
  linkedin_url VARCHAR(500),
  twitter_url VARCHAR(500),
  
  -- Location
  city VARCHAR(255),
  state VARCHAR(255),
  country VARCHAR(255),
  
  -- Enrichment Data (from Perplexity/CIA)
  enrichment_data JSONB, -- Company pain points, recent news, tech stack, etc.
  enrichment_completed BOOLEAN DEFAULT FALSE,
  enrichment_attempts INTEGER DEFAULT 0,
  
  -- Lead Scoring
  lead_score INTEGER DEFAULT 0, -- 0-100
  lead_stage VARCHAR(50) DEFAULT 'new', -- new, contacted, engaged, qualified, converted
  
  -- Channel Status
  linkedin_status VARCHAR(50), -- pending, sent, accepted, messaged, responded, not_found
  email_status VARCHAR(50), -- pending, sent, opened, clicked, replied, bounced
  sms_status VARCHAR(50),
  
  -- Metadata
  source VARCHAR(100), -- csv_upload, manual, api, scraper
  tags TEXT[],
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_contacted_at TIMESTAMP
);

CREATE INDEX idx_leads_campaign ON leads(campaign_id);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_linkedin ON leads(linkedin_url);
CREATE INDEX idx_leads_stage ON leads(lead_stage);
CREATE INDEX idx_leads_score ON leads(lead_score);

-- ============================================
-- MESSAGES (All Outreach Across Channels)
-- ============================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  
  -- Message Details
  channel VARCHAR(50) NOT NULL, -- linkedin, email, sms
  message_type VARCHAR(100) NOT NULL, -- connection_request, follow_up_1, follow_up_2, etc.
  subject VARCHAR(500), -- For emails
  body TEXT NOT NULL,
  
  -- Personalization Metadata
  personalization_data JSONB, -- Variables used: {firstName, companyName, painPoint, etc.}
  ai_generated BOOLEAN DEFAULT TRUE,
  ai_model VARCHAR(100), -- gpt-4, claude-3-5-sonnet, etc.
  
  -- Status & Tracking
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, sent, delivered, opened, clicked, replied, failed
  
  -- Delivery Info
  external_message_id VARCHAR(255), -- Unipile/provider ID
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  replied_at TIMESTAMP,
  
  -- Response Tracking
  response_received BOOLEAN DEFAULT FALSE,
  response_text TEXT,
  response_sentiment VARCHAR(50), -- positive, neutral, negative
  
  -- Errors
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_lead ON messages(lead_id);
CREATE INDEX idx_messages_campaign ON messages(campaign_id);
CREATE INDEX idx_messages_channel ON messages(channel);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_sent_at ON messages(sent_at);

-- ============================================
-- MESSAGE SEQUENCES (Drip Campaign Logic)
-- ============================================
CREATE TABLE message_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  
  -- Sequence Configuration
  name VARCHAR(255) NOT NULL,
  channel VARCHAR(50) NOT NULL, -- linkedin, email, sms
  position INTEGER NOT NULL, -- Order in sequence (1, 2, 3...)
  
  -- Timing
  delay_days INTEGER NOT NULL, -- Days after previous message (or 0 for first)
  delay_hours INTEGER DEFAULT 0,
  
  -- Message Template
  subject_template VARCHAR(500), -- For emails, with {{variables}}
  body_template TEXT NOT NULL, -- With {{variables}} for personalization
  
  -- Conditions
  send_if_no_response BOOLEAN DEFAULT TRUE,
  send_if_no_open BOOLEAN DEFAULT FALSE, -- Email-specific
  
  -- AI Instructions
  ai_instructions TEXT, -- Special instructions for this sequence step
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sequences_campaign ON message_sequences(campaign_id);
CREATE INDEX idx_sequences_channel ON message_sequences(channel);

-- ============================================
-- SCHEDULED TASKS (Message Queue)
-- ============================================
CREATE TABLE scheduled_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  message_sequence_id UUID REFERENCES message_sequences(id) ON DELETE CASCADE,
  
  -- Task Details
  task_type VARCHAR(50) NOT NULL, -- send_message, enrich_lead, etc.
  scheduled_for TIMESTAMP NOT NULL,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed, cancelled
  
  -- Execution
  executed_at TIMESTAMP,
  result JSONB,
  error_message TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_scheduled_tasks_lead ON scheduled_tasks(lead_id);
CREATE INDEX idx_scheduled_tasks_scheduled_for ON scheduled_tasks(scheduled_for);
CREATE INDEX idx_scheduled_tasks_status ON scheduled_tasks(status);

-- ============================================
-- CONVERSATIONS (Thread Tracking)
-- ============================================
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  
  -- Conversation Details
  channel VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'active', -- active, closed, paused
  
  -- Engagement Metrics
  message_count INTEGER DEFAULT 0,
  last_message_from VARCHAR(50), -- us, lead
  last_message_at TIMESTAMP,
  
  -- Classification
  conversation_quality VARCHAR(50), -- high, medium, low
  intent_detected VARCHAR(100), -- demo_request, pricing_question, not_interested, etc.
  
  -- AI Analysis
  summary TEXT,
  next_best_action TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_conversations_lead ON conversations(lead_id);
CREATE INDEX idx_conversations_status ON conversations(status);

-- ============================================
-- INTEGRATIONS (API Keys & Configs)
-- ============================================
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Integration Details
  provider VARCHAR(100) NOT NULL, -- unipile, perplexity, openai, etc.
  status VARCHAR(50) DEFAULT 'active', -- active, inactive, error
  
  -- Credentials (encrypted)
  api_key_encrypted TEXT,
  config JSONB, -- Provider-specific settings
  
  -- Usage Tracking
  requests_made INTEGER DEFAULT 0,
  last_used_at TIMESTAMP,
  
  -- Health
  last_health_check TIMESTAMP,
  health_status VARCHAR(50), -- healthy, degraded, failed
  error_message TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, provider)
);

CREATE INDEX idx_integrations_user ON integrations(user_id);
CREATE INDEX idx_integrations_provider ON integrations(provider);

-- ============================================
-- ANALYTICS EVENTS (Detailed Tracking)
-- ============================================
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  
  -- Event Details
  event_type VARCHAR(100) NOT NULL, -- message_sent, link_clicked, reply_received, etc.
  channel VARCHAR(50),
  
  -- Event Data
  event_data JSONB,
  
  -- Context
  user_agent TEXT,
  ip_address INET,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_events_user ON analytics_events(user_id);
CREATE INDEX idx_events_campaign ON analytics_events(campaign_id);
CREATE INDEX idx_events_type ON analytics_events(event_type);
CREATE INDEX idx_events_created ON analytics_events(created_at);

-- ============================================
-- AI CHAT HISTORY (Master Agent Conversations)
-- ============================================
CREATE TABLE ai_chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  
  -- Message
  role VARCHAR(50) NOT NULL, -- user, assistant, system
  content TEXT NOT NULL,
  
  -- Context
  context_data JSONB, -- Campaign stats, lead info, etc. at time of message
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_chat_user ON ai_chat_history(user_id);
CREATE INDEX idx_chat_campaign ON ai_chat_history(campaign_id);
```

---

## **🎨 DESIGN SYSTEM - FAANG QUALITY**

### **Typography**

```css
/* JetBrains Mono - UI Components & Labels */
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');

/* Barlow - Body Text */
@import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&display=swap');

/* Barlow Condensed - Compact Data */
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700&display=swap');

:root {
  /* Typography */
  --font-ui: 'JetBrains Mono', monospace;
  --font-body: 'Barlow', sans-serif;
  --font-condensed: 'Barlow Condensed', sans-serif;
  
  /* Type Scale */
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */
  --text-4xl: 2.25rem;   /* 36px */
}
```

### **Color System - Light Theme**

```css
:root {
  /* Primary - Blue (Professional) */
  --color-primary-50: #eff6ff;
  --color-primary-100: #dbeafe;
  --color-primary-200: #bfdbfe;
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --color-primary-700: #1d4ed8;
  --color-primary-900: #1e3a8a;
  
  /* Neutral - Gray (Clean & Professional) */
  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  --color-gray-300: #d1d5db;
  --color-gray-400: #9ca3af;
  --color-gray-500: #6b7280;
  --color-gray-600: #4b5563;
  --color-gray-700: #374151;
  --color-gray-800: #1f2937;
  --color-gray-900: #111827;
  
  /* Success */
  --color-success-50: #f0fdf4;
  --color-success-500: #22c55e;
  --color-success-600: #16a34a;
  
  /* Warning */
  --color-warning-50: #fffbeb;
  --color-warning-500: #f59e0b;
  --color-warning-600: #d97706;
  
  /* Error */
  --color-error-50: #fef2f2;
  --color-error-500: #ef4444;
  --color-error-600: #dc2626;
  
  /* Backgrounds */
  --bg-primary: #ffffff;
  --bg-secondary: var(--color-gray-50);
  --bg-tertiary: var(--color-gray-100);
  
  /* Borders */
  --border-light: var(--color-gray-200);
  --border-medium: var(--color-gray-300);
  
  /* Text */
  --text-primary: var(--color-gray-900);
  --text-secondary: var(--color-gray-600);
  --text-tertiary: var(--color-gray-500);
}
```

### **Component Standards**

```css
/* Buttons */
.btn {
  font-family: var(--font-ui);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
  font-size: var(--text-sm);
  padding: 0.625rem 1.25rem;
  border-radius: 0.375rem;
  transition: all 0.15s ease;
}

.btn-primary {
  background: var(--color-primary-600);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-700);
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}

/* Cards */
.card {
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: 0.5rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
}

/* Inputs */
.input {
  font-family: var(--font-body);
  font-size: var(--text-base);
  padding: 0.625rem 0.875rem;
  border: 1px solid var(--border-medium);
  border-radius: 0.375rem;
  background: var(--bg-primary);
  transition: all 0.15s ease;
}

.input:focus {
  outline: none;
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 3px var(--color-primary-100);
}

/* Labels */
.label {
  font-family: var(--font-ui);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 0.375rem;
}

/* Stats / Metrics */
.metric-label {
  font-family: var(--font-ui);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

.metric-value {
  font-family: var(--font-condensed);
  font-size: var(--text-3xl);
  font-weight: 700;
  color: var(--text-primary);
}

/* Tables - Condensed Data */
.table-header {
  font-family: var(--font-ui);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: var(--text-xs);
  font-weight: 600;
}

.table-cell {
  font-family: var(--font-condensed);
  font-size: var(--text-sm);
}
```

---

## **🚀 REPLIT SETUP PROMPT**

### **Phase 1: Initial Replit Configuration**

```
Create a production-ready full-stack TypeScript application with the following:

STACK:
- Backend: Node.js + Express + TypeScript
- Frontend: React + TypeScript + Vite
- Database: PostgreSQL (Replit native)
- Styling: Tailwind CSS
- Authentication: Clerk

PROJECT STRUCTURE:
/
├── server/
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── models/
│   │   ├── middleware/
│   │   └── utils/
│   ├── package.json
│   └── tsconfig.json
├── client/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   └── styles/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── shared/
│   └── types/
├── package.json (root)
└── .replit

REQUIREMENTS:
1. Set up PostgreSQL database connection using Replit's native Postgres
2. Configure Clerk authentication with React components
3. Install dependencies: 
   - Server: express, pg, cors, dotenv, zod, axios
   - Client: react, react-router-dom, @clerk/clerk-react, axios, tailwindcss
4. Configure TypeScript strict mode
5. Set up hot reload for both client and server
6. Configure CORS for local development
7. Create .env.example files with required variables

DESIGN SYSTEM:
- Import Google Fonts: JetBrains Mono, Barlow, Barlow Condensed
- Configure Tailwind with custom colors (light theme, blue primary)
- Create base component styles following FAANG design principles

AUTO-START:
- Server on port 3001
- Client on port 5173
- Database connection on startup
```

---

## **📦 COMPLETE FEATURE LIST**

### **Authentication & User Management**
- [ ] Clerk authentication (sign up, sign in, password reset)
- [ ] User profile management
- [ ] Company/organization setup
- [ ] Timezone configuration
- [ ] Integration credentials management

### **Campaign Management**
- [ ] Create new campaigns with wizard
- [ ] Configure multi-channel settings (LinkedIn, Email, SMS)
- [ ] Set targeting criteria (job titles, industries, locations)
- [ ] Configure rate limits and sending windows
- [ ] Pause/resume/archive campaigns
- [ ] Duplicate campaigns
- [ ] Campaign performance dashboard

### **Lead Management**
- [ ] CSV upload with validation and preview
- [ ] Manual lead entry
- [ ] Bulk lead import from APIs
- [ ] Lead enrichment with Perplexity (automatic)
- [ ] Lead scoring algorithm
- [ ] Lead stage progression
- [ ] Lead notes and tagging
- [ ] Lead search and filtering
- [ ] Lead export

### **Multi-Channel Outreach**

#### **LinkedIn Automation (via Unipile)**
- [ ] Connection request sending (with daily limits)
- [ ] Personalized connection messages
- [ ] Auto-accept connection requests
- [ ] Follow-up message sequences
- [ ] Response detection and tracking
- [ ] LinkedIn profile scraping
- [ ] InMail support (premium)

#### **Email Sequences**
- [ ] Email sending (SMTP/SendGrid)
- [ ] Subject line + body personalization
- [ ] Email open tracking (pixel)
- [ ] Link click tracking
- [ ] Reply detection
- [ ] Bounce handling
- [ ] Unsubscribe management
- [ ] Email deliverability monitoring

#### **SMS Outreach (Optional)**
- [ ] SMS sending via Unipile
- [ ] SMS personalization
- [ ] Reply tracking
- [ ] Opt-out management

### **Message Sequencing**
- [ ] Visual sequence builder (drag-and-drop)
- [ ] Multi-step sequences per channel
- [ ] Conditional logic (if no response, switch channel)
- [ ] Time delays (days + hours)
- [ ] A/B testing support
- [ ] Template library
- [ ] Variable personalization system

### **AI-Powered Features**

#### **Message Generation**
- [ ] AI-generated connection requests
- [ ] AI-generated follow-up messages
- [ ] AI-generated email subject lines
- [ ] Tone adjustment (professional, casual, friendly)
- [ ] Industry-specific templates
- [ ] Company research integration
- [ ] Real-time preview

#### **Master AI Agent (Chat Interface)**
- [ ] Conversational AI assistant
- [ ] Campaign performance queries
- [ ] Lead insights and recommendations
- [ ] Message optimization suggestions
- [ ] Natural language campaign creation
- [ ] Historical chat persistence

### **Enrichment & Intelligence**
- [ ] Automatic company research (Perplexity)
- [ ] Pain point extraction
- [ ] Recent news and announcements
- [ ] Technology stack identification
- [ ] Social media activity analysis
- [ ] Competitive intelligence

### **Analytics & Reporting**

#### **Campaign Analytics**
- [ ] Real-time performance dashboard
- [ ] Channel-specific metrics (LinkedIn, Email, SMS)
- [ ] Conversion funnel visualization
- [ ] Response rate trends
- [ ] Time-of-day optimization
- [ ] Geographic performance
- [ ] A/B test results

#### **Lead Analytics**
- [ ] Lead score distribution
- [ ] Stage progression tracking
- [ ] Engagement heatmaps
- [ ] Best-performing segments
- [ ] Cohort analysis

#### **Conversation Analytics**
- [ ] Response sentiment analysis
- [ ] Intent detection
- [ ] Common objections
- [ ] Conversation quality scoring
- [ ] Next best action suggestions

### **Integrations**
- [ ] Unipile (LinkedIn, Email, SMS, WhatsApp)
- [ ] Perplexity API (research)
- [ ] OpenAI GPT-4 (message generation)
- [ ] Claude 3.5 Sonnet (strategic analysis)
- [ ] Webhook system (for CRM sync)
- [ ] API for external tools

### **Admin & Settings**
- [ ] Integration health monitoring
- [ ] API usage tracking
- [ ] Rate limit configuration
- [ ] Timezone settings
- [ ] Notification preferences
- [ ] Export/backup data
- [ ] Activity logs
- [ ] Team member management (future)

---

## **🎯 SESSION PLAN - COMPLETE BUILD**

### **Session 1-2: Replit Foundation (2-3 hours)**
**Automated by Replit + Minimal Claude Code**

```
REPLIT AGENT PROMPT:
Set up complete full-stack TypeScript application with:
- PostgreSQL database with complete schema (see above)
- Express API with CORS configured
- React + Vite frontend with Tailwind
- Clerk authentication
- Basic routing structure
- Environment variable configuration
- Development hot reload

DELIVERABLE: Working authentication + empty dashboard
```

### **Session 3-5: Campaign Management Core (6-8 hours)**
**Claude Code + Codex (frontend)**

**Backend (Claude Code):**
- Campaign CRUD API endpoints
- Lead CRUD API endpoints
- CSV upload processing
- Database queries with Postgres

**Frontend (Codex GPT-5):**
- Campaign creation wizard (multi-step form)
- Campaign list view (table with filters)
- Campaign detail page (stats + lead list)
- FAANG-quality UI components
- Responsive design

**DELIVERABLE: Create campaign, upload leads, view dashboard**

### **Session 6-10: Multi-Channel Orchestration (12-16 hours)**
**Claude Code (heavy lifting)**

**Unipile Integration:**
- LinkedIn connection request API
- Email sending API
- SMS API (optional)
- Webhook handling for responses

**Message Sequencing Engine:**
- Sequence creation and storage
- Task scheduling system (cron jobs)
- Message queue processing
- Retry logic with exponential backoff

**AI Message Generation:**
- OpenAI GPT-4 integration
- Personalization variable system
- Template rendering
- Message approval workflow

**DELIVERABLE: Send LinkedIn connection requests + email follow-ups automatically**

### **Session 11-13: Lead Enrichment & Intelligence (8-10 hours)**
**Claude Code**

**Perplexity Integration:**
- Company research API
- Pain point extraction
- Recent news scraping
- Data structuring

**Enrichment Queue:**
- Background job processing
- Rate limiting
- Error handling and retries
- Enrichment status tracking

**DELIVERABLE: Automatic lead enrichment with company insights**

### **Session 14-16: Analytics & Master Agent (8-10 hours)**
**Codex (analytics UI) + Claude Code (agent logic)**

**Analytics Dashboard:**
- Real-time campaign metrics
- Channel performance comparison
- Conversion funnel charts
- Lead score distribution
- Time-series graphs

**Master AI Agent:**
- Chat interface component
- Claude API integration
- Context injection (campaign data)
- Conversational query handling

**DELIVERABLE: Complete analytics + working AI chat assistant**

### **Session 17-18: Polish & Testing (6-8 hours)**
**Codex + Claude Code + Manual QA**

- End-to-end testing
- Bug fixes
- UI polish and animations
- Error handling improvements
- Loading states
- Empty states
- Success/error messages
- Responsive design verification

**DELIVERABLE: Production-ready Growth Engine**

---

## **TOTAL DEVELOPMENT TIME**
**18 sessions × 3 hours avg = 54 hours**
**Timeline: 3-4 days of focused development**

---

## **🎨 KEY UI SCREENS**

### **1. Dashboard Home**
```
┌─────────────────────────────────────────────────────────┐
│ REVOS GROWTH ENGINE                    [Profile] [Chat] │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ACTIVE CAMPAIGNS                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Q4 OUTREACH  │  │ ENTERPRISE   │  │ STARTUP      │  │
│  │ 847 LEADS    │  │ 234 LEADS    │  │ 1,234 LEADS  │  │
│  │ 23% RESPONSE │  │ 31% RESPONSE │  │ 18% RESPONSE │  │
│  │ 67 CONVOS    │  │ 43 CONVOS    │  │ 89 CONVOS    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  PERFORMANCE TODAY                      [View Details]   │
│  ╔═══════════════════════════════════════════════════╗  │
│  ║ LINKEDIN    234 SENT   47 ACCEPTED   23 REPLIES  ║  │
│  ║ EMAIL       456 SENT   123 OPENED    34 CLICKS   ║  │
│  ║ CONVERSIONS 12 QUALIFIED   5 BOOKED              ║  │
│  ╚═══════════════════════════════════════════════════╝  │
│                                                          │
│  [+ NEW CAMPAIGN]                                        │
└─────────────────────────────────────────────────────────┘
```

### **2. Campaign Detail View**
```
┌─────────────────────────────────────────────────────────┐
│ ← CAMPAIGNS  /  Q4 ENTERPRISE OUTREACH                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─ METRICS ──────────────────────────────────────────┐ │
│  │  847        234 (28%)    67 (8%)     12 (1.4%)    │ │
│  │  TOTAL      RESPONDED    ENGAGED     QUALIFIED     │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─ CHANNELS ─────────────────────────────────────────┐ │
│  │  LinkedIn  ████████████░░ 67% (567 sent)          │ │
│  │  Email     ███████░░░░░░░ 42% (234 sent)          │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  LEADS                          [Search] [Filter] [CSV]  │
│  ┌────────────────────────────────────────────────────┐ │
│  │ NAME           COMPANY      STAGE      LAST TOUCH  │ │
│  ├────────────────────────────────────────────────────┤ │
│  │ John Smith     Acme Corp    ENGAGED    2h ago ●   │ │
│  │ Sarah Johnson  Tech Inc     CONTACTED  1d ago     │ │
│  │ Mike Williams  StartupXYZ   QUALIFIED  3h ago ●   │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  [PAUSE CAMPAIGN]  [EDIT SETTINGS]  [EXPORT DATA]       │
└─────────────────────────────────────────────────────────┘
```

### **3. Message Sequence Builder**
```
┌─────────────────────────────────────────────────────────┐
│ CAMPAIGN: Q4 OUTREACH  /  MESSAGE SEQUENCES             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  LINKEDIN SEQUENCE                                       │
│  ┌────────────────────────────────────────────────────┐ │
│  │  1. CONNECTION REQUEST          [EDIT] [PREVIEW]   │ │
│  │     Send immediately                                │ │
│  │     "Hi {{firstName}}, noticed your work at..."    │ │
│  │                                                     │ │
│  │  ↓ WAIT 3 DAYS (if accepted)                       │ │
│  │                                                     │ │
│  │  2. FOLLOW-UP MESSAGE #1        [EDIT] [PREVIEW]   │ │
│  │     "Thanks for connecting! I saw..."              │ │
│  │                                                     │ │
│  │  ↓ WAIT 7 DAYS (if no response)                    │ │
│  │                                                     │ │
│  │  3. FOLLOW-UP MESSAGE #2        [EDIT] [PREVIEW]   │ │
│  │     "Quick follow-up on my last..."                │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  EMAIL FALLBACK SEQUENCE (if no LinkedIn response)      │
│  ┌────────────────────────────────────────────────────┐ │
│  │  ↓ WAIT 14 DAYS (if no LinkedIn response)          │ │
│  │                                                     │ │
│  │  4. EMAIL #1                    [EDIT] [PREVIEW]   │ │
│  │     Subject: "Following up from LinkedIn"           │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  [+ ADD STEP]  [SAVE SEQUENCE]  [TEST WITH AI]          │
└─────────────────────────────────────────────────────────┘
```

---

## **🔐 SECURITY CHECKLIST**

- [ ] All API keys stored as environment variables
- [ ] Database credentials never in code
- [ ] Clerk authentication on all protected routes
- [ ] CSRF protection enabled
- [ ] Rate limiting on API endpoints
- [ ] Input validation with Zod
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (React auto-escaping)
- [ ] CORS configured for production domain only
- [ ] HTTPS enforced in production

---

## **🚀 DEPLOYMENT CHECKLIST**

- [ ] Environment variables configured in Replit Secrets
- [ ] Database migrations run successfully
- [ ] All integrations tested (Unipile, Perplexity, OpenAI)
- [ ] Clerk production keys configured
- [ ] Error logging set up (Sentry optional)
- [ ] Backup system configured
- [ ] Monitoring alerts configured
- [ ] Custom domain connected (optional)
- [ ] GitHub repository synced
- [ ] README documentation complete

---

## **NEXT STEPS**

1. **Confirm Architecture** - Are you aligned with this complete build?
2. **Start Replit Setup** - I'll provide the exact Replit agent prompt
3. **GitHub Setup** - Create repo and sync
4. **Session 1 Begin** - Foundation setup

Ready to start? Should I provide the **EXACT Replit setup prompt** to paste into Replit Agent?
