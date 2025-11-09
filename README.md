# Bravo revOS - AI-Powered LinkedIn Lead Generation Platform

Transform LinkedIn engagement into qualified leads automatically with AI-powered content, automated DM sequences, and multi-channel delivery.

---

## 🚀 Quick Start (Development)

### Prerequisites
- Node.js 18+
- Supabase account (https://supabase.com)
- Redis (local or Upstash for workers)
- OpenAI API key (for voice cartridges)

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Copy `.env.local.example` to `.env.local` and set required variables:

```bash
# Supabase (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://kvjcidxbyimoswntpjcp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from Supabase dashboard>
SUPABASE_SERVICE_ROLE_KEY=<from Supabase dashboard>

# Security (REQUIRED)
ENCRYPTION_KEY=<generate: openssl rand -hex 32>
CRON_SECRET=<generate: openssl rand -hex 32>

# OpenAI (REQUIRED)
OPENAI_API_KEY=sk-...

# Redis (REQUIRED for workers)
REDIS_URL=redis://localhost:6379

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**See `ENVIRONMENT_VARIABLES.md` for complete reference.**

### 3. Database Setup

Run all migrations in sequence in Supabase SQL Editor:

```bash
# Navigate to: https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp/sql/new
# Run migrations 001 through 020 (skip 013 in production)
```

**See `DEPLOYMENT.md` for complete migration guide.**

### 4. Run Development Server

```bash
# Start Next.js dev server
npm run dev

# In separate terminals (if testing workers):
npm run worker:webhook
npm run worker:pod-automation
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🌐 Production Deployment

**Target Platform**: Netlify (frontend) + Render (backend services)

### Quick Deploy

1. **Frontend (Netlify)**:
   - Connect GitHub repo
   - Auto-deploy from `main` branch
   - Set environment variables in dashboard

2. **Backend (Render)**:
   - Push `render.yaml` to repo
   - Create Blueprint Instance
   - Set environment variables for all 3 services

**Complete deployment guide**: See `DEPLOYMENT.md`

### Architecture

- **Frontend**: Netlify (Next.js static + serverless functions)
- **Backend API**: Render Web Service (Next.js API routes)
- **Workers**: 2 Render Background Workers (BullMQ)
  - Webhook Delivery Worker
  - Pod Automation Worker
- **Database**: Supabase (PostgreSQL with RLS)
- **Queue**: Upstash Redis (BullMQ job queues)
- **Storage**: Supabase Storage (lead magnets, attachments)

---

## 🛠️ Tech Stack

### Core
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Supabase (PostgreSQL with RLS)
- **Auth**: Supabase Auth (email/password)

### Infrastructure
- **Queue**: BullMQ + Redis (Upstash)
- **Storage**: Supabase Storage
- **Hosting**: Netlify (frontend) + Render (backend)
- **Monitoring**: Sentry (future)

### Integrations
- **LinkedIn**: Unipile API (account management, DM automation)
- **AI**: OpenAI (voice cartridges, text generation)
- **Email**: Resend (notifications, future)
- **Webhooks**: Custom delivery system with retry logic

### UI Components
- **Charts**: Recharts
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod validation

---

## 📁 Project Structure

```
bravo-revos/
├── app/                          # Next.js 14 App Router
│   ├── admin/                   # Agency admin portal
│   │   ├── clients/             # Client management
│   │   │   └── [id]/integrations/ # Unipile configuration
│   │   └── orchestration-dashboard/ # AgentKit UI (F-01)
│   ├── dashboard/               # Client dashboard
│   │   ├── campaigns/           # Campaign creation wizard
│   │   ├── leads/               # Lead management
│   │   ├── cartridges/          # Content library
│   │   └── email-review/        # Email extraction review
│   ├── auth/                    # Authentication pages
│   └── api/                     # API routes
│       ├── campaigns/           # Campaign CRUD
│       ├── cartridges/          # Content management
│       │   └── generate-from-voice/ # Voice cartridge AI
│       ├── clients/             # Client management
│       ├── pods/                # Engagement pod APIs
│       ├── webhooks/            # Webhook endpoints
│       └── cron/                # Scheduled jobs
├── components/                   # React components
│   ├── admin/                   # Admin-specific components
│   ├── dashboard/               # Client dashboard components
│   └── ui/                      # shadcn/ui components
├── lib/                          # Utility libraries
│   ├── supabase/                # Supabase client factories
│   ├── queue/                   # BullMQ job queues
│   │   ├── webhook-delivery-queue.ts
│   │   ├── comment-polling-queue.ts
│   │   ├── dm-queue.ts
│   │   └── pod-automation-queue.ts
│   ├── notifications/           # Email/notification services
│   ├── unipile-client.ts        # Unipile API wrapper
│   ├── encryption.ts            # Data encryption utilities
│   └── validations/             # Zod schemas
├── supabase/
│   └── migrations/              # SQL migrations (001-020)
├── workers/                      # Background worker processes
│   ├── webhook-delivery/        # Webhook delivery worker
│   └── pod-automation/          # Pod engagement worker
├── docs/                         # Documentation
│   ├── projects/bravo-revos/    # Project-specific docs
│   └── sitreps/                 # Session reports
├── DEPLOYMENT.md                 # Production deployment guide
├── ENVIRONMENT_VARIABLES.md      # Environment variable reference
└── render.yaml                   # Render.com configuration
```

---

## 🎯 Core Features

### Admin Portal (`/admin`)
- ✅ **Client Management**: Create/manage clients, configure Unipile credentials per client
- ✅ **Orchestration Dashboard**: AgentKit integration (tasks, agents, orchestration)
- ⏳ **System Analytics**: Usage metrics, performance monitoring (future)
- ⏳ **Pod Monitoring**: Real-time engagement tracking (future)

### Client Dashboard (`/dashboard`)
- ✅ **Campaign Wizard**: Multi-step campaign creation with trigger words, DM sequences
- ✅ **Lead Management**: View leads, email extraction, webhook delivery status
- ✅ **Email Review**: Manual review and approval of extracted emails before delivery
- ✅ **Cartridge Library**: Content templates with voice-to-text AI generation
- ✅ **Webhook Configuration**: ESP integration (ActiveCampaign, GoHighLevel, custom)
- ⏳ **Pod Management**: Create engagement pods, invite members (partial)

### Automation Features
- ✅ **Comment Polling**: Randomized, human-like detection of trigger words in LinkedIn comments
- ✅ **DM Automation**: Multi-step DM sequences with rate limiting
- ✅ **Email Extraction**: GPT-4 powered extraction from DM replies with confidence scoring
- ✅ **Webhook Delivery**: Reliable delivery with exponential backoff, HMAC signing, retry logic
- ⏳ **Pod Engagement**: Automated like/comment from pod members (partial)

### Security & Compliance
- ✅ **Row-Level Security**: Agency-based multi-tenant data isolation
- ✅ **Encrypted Storage**: API keys and sensitive data encrypted at rest
- ✅ **Rate Limiting**: Per-account DM limits to avoid LinkedIn restrictions
- ✅ **Audit Logging**: Complete audit trail for all operations

---

## 📊 Database Schema

Multi-tenant architecture: `agencies → clients → users → campaigns → leads`

### Key Tables
- **agencies**: Top-level tenant (agency owns multiple clients)
- **clients**: Client companies (owned by agencies)
- **users**: Agency admins and client users (agency-scoped)
- **campaigns**: Lead generation campaigns (client-scoped)
- **leads**: Captured leads with email extraction and webhook delivery tracking
- **pods**: Engagement pods (minimum 3 members)
- **pod_members**: Pod membership with LinkedIn account linking
- **linkedin_accounts**: Unipile-connected LinkedIn accounts
- **webhook_configs**: ESP integration configurations
- **cartridges**: Content template library
- **lead_magnets**: Lead magnet library with file storage
- **archon_***: AgentKit integration tables (tasks, agents, orchestration)

**Migrations**: 20 migrations (001-020) in `/supabase/migrations/`

See `DEPLOYMENT.md` for complete migration guide.

---

## 📚 Documentation

### Essential Guides
- **Deployment Guide**: `DEPLOYMENT.md` - Complete production deployment process
- **Environment Variables**: `ENVIRONMENT_VARIABLES.md` - All configuration options
- **Master Spec**: `docs/projects/bravo-revos/spec.md` - Feature specifications
- **Data Model**: `docs/projects/bravo-revos/data-model.md` - Database architecture

### Project Management
- **Archon Tasks**: 20 tasks (A-00 through G-02)
- **Archon Project ID**: `de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531`
- **Task Management**: Via Archon MCP Server

---

## 🗺️ Implementation Status

### ✅ Completed (Epics A-D, F-01)
- **Epic A**: Authentication & Multi-Tenancy (agencies, clients, users, RLS)
- **Epic B**: Campaign Creation Wizard (trigger words, DM sequences, lead magnets)
- **Epic C**: LinkedIn Automation (comment polling, DM automation, rate limiting)
- **Epic D**: Email Extraction & Webhook Delivery (GPT-4 extraction, ESP integration, retry logic)
- **Epic F-01**: AgentKit Integration (orchestration dashboard UI)

### ⏳ In Progress
- **Epic E**: Engagement Pods (partial - core tables and invite system)
- **Epic F-02**: Mem0 Integration (memory management for personalized DMs)

### 📋 Planned
- **Epic G**: Testing & Monitoring (comprehensive test suite, observability)
- **HGC**: Holy Grail Chat (separate implementation by CC1)

**Current Completion**: ~57% of MVP features

---

## 🚀 Production Readiness

### This Week Deployment Checklist
- ✅ Code cleanup (debug logs removed)
- ✅ Production documentation (DEPLOYMENT.md, ENVIRONMENT_VARIABLES.md)
- ✅ Render configuration (render.yaml)
- ✅ Security audit (RLS policies, encryption, secrets management)
- ⏳ Netlify frontend deployment
- ⏳ Render backend deployment (web + 2 workers)
- ⏳ Database migration to production
- ⏳ Smoke tests and validation

**See `DEPLOYMENT.md` for complete deployment process.**

---

## 🛡️ Security

- **Authentication**: Supabase Auth with email/password
- **Authorization**: Row-Level Security (RLS) with agency-based isolation
- **Encryption**: AES-256 encryption for API keys and sensitive data
- **Secrets Management**: Environment variables only (never committed to git)
- **Rate Limiting**: Per-account DM limits, webhook retry limits
- **Audit Trail**: Complete logging of all operations

---

## 🤝 Contributing

This project is managed via Archon MCP Server.

**Development Workflow**:
1. Check tasks: `find_tasks(filter_by="status", filter_value="todo")`
2. Start work: `manage_task("update", task_id="...", status="doing")`
3. Implement changes
4. Validate: Use `validator` subagent
5. Mark for review: `manage_task("update", status="review")`

**Branch Strategy**: `feat/feature-name` → `main` → `staging` → `production`

---

## 📞 Support & Resources

- **Supabase Project**: https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp
- **Archon Project**: https://statesman-ai.netlify.app/projects/de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531
- **Documentation**: `/docs/projects/bravo-revos/`

---

**Managed via Archon MCP Server | Project ID: de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531**
