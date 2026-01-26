# Bravo revOS MVP - Implementation Plan

**Project:** Bravo revOS
**Archon Project ID:** de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531
**Created:** November 3, 2025
**Status:** Ready for Execution

---

## Overview

Bravo revOS is an AI-powered LinkedIn lead generation system that automates the entire funnel from content creation to lead magnet delivery. This plan outlines the implementation across 3 branches (epics) with detailed tasks.

**Critical Architecture:** ONE unified Next.js 14 application with role-based routing, NOT three separate applications.

---

## Requirements Summary

### Core Features
1. **AI-Powered Content Pipeline** - Two-stage mandatory flow: Copywriting Skill → Voice Cartridge
2. **Lead Generation Flow** - 7 automated steps from post to delivery
3. **Unipile Integration** - ALL LinkedIn operations via Unipile API (NEVER direct)
4. **Engagement Pods** - EVERYONE engages with EVERYTHING (no rotation)
5. **Multi-Channel Delivery** - Webhook to ESP + backup DM with direct link
6. **Voice Cartridge System** - 4-tier hierarchy for authentic content
7. **Campaign Management** - Full lifecycle from creation to analytics

### Technical Requirements
- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API routes, tRPC
- **Database:** Supabase (PostgreSQL + RLS)
- **Queue:** BullMQ + Upstash Redis
- **AI:** GPT-4o, Mem0
- **LinkedIn:** Unipile API only

---

## Research Findings

### Architecture Decisions

**1. Unified Application Structure**
- ONE Next.js 14 app with role-based routing
- Routes: `/admin` (agencies), `/dashboard` (clients), `/api` (backend)
- Multi-tenant hierarchy: Agencies → Clients → Users
- Data isolation via Supabase RLS

**2. LinkedIn Integration via Unipile**
- **Available:** Posts, DMs, profile data, DM reply webhooks
- **NOT Available:** Comment webhooks (must poll every 15-30 min)
- Rate limits: 50 DMs/day, 25 posts/day per account
- Cost: $5.50/account/month

**3. AI Content Pipeline**
- Stage 1: Copywriting Skill (AIDA for posts, PAS for DMs, VALUE for comments)
- Stage 2: Voice Cartridge (MANDATORY - maintains authenticity)
- Optional: Additional skills (email deliverability, design, analytics)

**4. Engagement Pod Strategy**
- EVERYONE engages with EVERYTHING (100% participation)
- NO rotation or selection
- Like within 30 min, comment within 1-3 hours, instant repost
- Minimum 9 members per pod

**5. Lead Delivery**
- Webhook to client's ESP (Zapier, Make, ConvertKit, etc.)
- We do NOT send emails directly
- Backup DM with 24-hour signed URL after 5 minutes

---

## Implementation Plan by Branch (Epic)

---

## Epic 1: bolt-scaffold
**Purpose:** Generate ONE complete Next.js 14 application with all base infrastructure

**Duration:** Session 1-2 (30 story points)
**Branch:** `bolt-scaffold`

### Tasks

#### Task 1.1: Generate Next.js 14 Base Application (8 points)
**Description:** Use Bolt.new to generate ONE unified Next.js 14 application with all routes and base structure.

**Implementation Details:**
```
1. Go to Bolt.new
2. Prompt: "Create a Next.js 14 application with App Router that includes:
   - Authentication routes in (auth) group
   - Admin portal at /admin for agency administrators
   - Client dashboard at /dashboard for business clients
   - API routes at /api for backend
   - Settings routes at /settings
   - Landing page at /
   - TypeScript, Tailwind CSS, shadcn/ui
   - Multi-tenant architecture support
   - Role-based access control"

3. Download generated code
4. Initialize git repository
5. Verify structure matches requirements
```

**Expected Output:**
```
app/
├── (auth)/
│   ├── login/
│   └── register/
├── admin/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── clients/
│   └── analytics/
├── dashboard/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── campaigns/
│   ├── leads/
│   ├── pods/
│   └── settings/
├── api/
│   ├── campaigns/
│   ├── leads/
│   └── webhooks/
└── page.tsx  # Landing page
```

**Critical Notes:**
- This is ONE application, not three separate apps
- Role-based routing controls access to /admin vs /dashboard
- All routes live in the same Next.js project

**Validation:**
- [ ] App runs on http://localhost:3000
- [ ] All routes accessible (auth, admin, dashboard, api)
- [ ] TypeScript compiles with no errors
- [ ] Tailwind CSS working
- [ ] shadcn/ui components available

---

#### Task 1.2: Supabase Database Setup (8 points)
**Description:** Set up complete PostgreSQL database with all tables, RLS policies, and functions.

**Implementation Details:**

**1. Create Supabase Project**
- Go to supabase.com
- Create new project
- Save URL and keys to .env

**2. Run Database Migrations**

Create `supabase/migrations/001_initial_schema.sql`:

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Multi-tenancy tables
CREATE TABLE agencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  subscription_tier TEXT DEFAULT 'starter',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company_name TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agency_id, name)
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT CHECK (role IN ('admin', 'manager', 'member')) DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- LinkedIn integration tables
CREATE TABLE linkedin_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL,
  unipile_account_id TEXT UNIQUE,
  unipile_session JSONB,
  session_expires_at TIMESTAMPTZ,
  daily_dm_count INTEGER DEFAULT 0,
  daily_post_count INTEGER DEFAULT 0,
  rate_limit_reset_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('active', 'expired', 'error')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, account_name)
);

-- Campaign tables
CREATE TABLE lead_magnets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  lead_magnet_id UUID REFERENCES lead_magnets(id),
  trigger_word TEXT NOT NULL,
  post_template TEXT,
  dm_template_step1 TEXT,
  dm_template_step2 TEXT,
  dm_template_step3 TEXT,
  settings JSONB DEFAULT '{}',
  status TEXT CHECK (status IN ('draft', 'active', 'paused', 'completed')) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, name)
);

-- Lead management
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  linkedin_account_id UUID REFERENCES linkedin_accounts(id),
  unipile_post_id TEXT UNIQUE,
  content TEXT NOT NULL,
  trigger_word TEXT,
  status TEXT CHECK (status IN ('draft', 'scheduled', 'published', 'failed')) DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  last_polled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  unipile_comment_id TEXT UNIQUE,
  author_name TEXT NOT NULL,
  author_linkedin_id TEXT NOT NULL,
  content TEXT NOT NULL,
  has_trigger_word BOOLEAN DEFAULT false,
  dm_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  linkedin_id TEXT NOT NULL,
  linkedin_url TEXT,
  status TEXT CHECK (status IN (
    'comment_detected',
    'dm_sent',
    'email_captured',
    'webhook_sent',
    'backup_sent',
    'completed',
    'failed'
  )) DEFAULT 'comment_detected',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, linkedin_id)
);

-- DM sequence tracking
CREATE TABLE dm_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id),
  step1_sent_at TIMESTAMPTZ,
  step1_message TEXT,
  step2_sent_at TIMESTAMPTZ,
  step2_message TEXT,
  email_extracted TEXT,
  email_extracted_at TIMESTAMPTZ,
  step3_sent_at TIMESTAMPTZ,
  step3_message TEXT,
  download_url TEXT,
  download_url_expires_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('in_progress', 'completed', 'failed')) DEFAULT 'in_progress',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook delivery
CREATE TABLE webhook_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT,
  esp_type TEXT,
  retry_enabled BOOLEAN DEFAULT true,
  max_retries INTEGER DEFAULT 3,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, name)
);

CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_config_id UUID REFERENCES webhook_configs(id),
  lead_id UUID REFERENCES leads(id),
  payload JSONB NOT NULL,
  status TEXT CHECK (status IN ('pending', 'success', 'failed')) DEFAULT 'pending',
  status_code INTEGER,
  response_body JSONB,
  error_message TEXT,
  attempt_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Engagement pods
CREATE TABLE pods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  min_members INTEGER DEFAULT 9,
  auto_engage BOOLEAN DEFAULT true,
  status TEXT CHECK (status IN ('active', 'paused')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, name)
);

CREATE TABLE pod_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pod_id UUID REFERENCES pods(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  linkedin_account_id UUID REFERENCES linkedin_accounts(id),
  status TEXT CHECK (status IN ('active', 'paused')) DEFAULT 'active',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pod_id, user_id)
);

CREATE TABLE pod_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pod_id UUID REFERENCES pods(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id),
  member_id UUID REFERENCES pod_members(id),
  engagement_type TEXT CHECK (engagement_type IN ('like', 'comment', 'repost')),
  scheduled_for TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Voice cartridges (4-tier hierarchy)
CREATE TABLE cartridges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  tier TEXT CHECK (tier IN ('system', 'workspace', 'user', 'skill')) NOT NULL,
  name TEXT NOT NULL,
  voice JSONB DEFAULT '{}',
  knowledge JSONB DEFAULT '{}',
  parent_cartridge_id UUID REFERENCES cartridges(id),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Skills configuration
CREATE TABLE campaign_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  execution_mode TEXT CHECK (execution_mode IN ('human', 'ai', 'scheduled')) DEFAULT 'ai',
  config JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, skill_name)
);

-- Queue jobs
CREATE TABLE queue_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id TEXT UNIQUE NOT NULL,
  queue_name TEXT NOT NULL,
  job_type TEXT NOT NULL,
  payload JSONB,
  status TEXT CHECK (status IN ('pending', 'active', 'completed', 'failed')) DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_clients_agency ON clients(agency_id);
CREATE INDEX idx_users_client ON users(client_id);
CREATE INDEX idx_campaigns_client ON campaigns(client_id);
CREATE INDEX idx_leads_campaign ON leads(campaign_id);
CREATE INDEX idx_posts_campaign ON posts(campaign_id);
CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_pod_members_pod ON pod_members(pod_id);

-- RLS Policies
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY clients_client_isolation ON clients
  FOR ALL USING (id = auth.jwt() ->> 'client_id');

CREATE POLICY campaigns_client_isolation ON campaigns
  FOR ALL USING (client_id = auth.jwt() ->> 'client_id');

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agencies_updated_at BEFORE UPDATE ON agencies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**3. Seed Initial Data**

Create `supabase/seed.sql`:

```sql
-- Insert default system cartridges
INSERT INTO cartridges (tier, name, voice, knowledge) VALUES
  ('system', 'Professional',
    '{"tone": "professional", "style": "authoritative"}',
    '{"industry": "general", "expertise": ["business", "leadership"]}'),
  ('system', 'Casual',
    '{"tone": "casual", "style": "conversational"}',
    '{"industry": "general", "expertise": ["startups", "tech"]}');
```

**Validation:**
- [ ] All tables created successfully
- [ ] RLS policies enabled
- [ ] Indexes created
- [ ] Seed data inserted
- [ ] Can connect from Next.js app

**Dependencies:** Task 1.1

**Files Created:**
- `supabase/migrations/001_initial_schema.sql`
- `supabase/seed.sql`

---

#### Task 1.3: Authentication & RLS Setup (5 points)
**Description:** Implement Supabase Auth with role-based access control and Row Level Security policies.

**Implementation Details:**

**1. Set up Supabase Auth Client**

Create `lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

Create `lib/supabase/server.ts`:

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}
```

**2. Implement Auth Middleware**

Create `middleware.ts`:

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response = NextResponse.next({ request });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response = NextResponse.next({ request });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Protect admin routes
  if (request.nextUrl.pathname.startsWith('/admin') && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*'],
};
```

**3. Create Login/Register Pages**

Create `app/(auth)/login/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      router.push('/dashboard');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 p-8">
        <h1 className="text-2xl font-bold">Login to Bravo revOS</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full">
            Login
          </Button>
        </form>
      </div>
    </div>
  );
}
```

**Validation:**
- [ ] Users can register and login
- [ ] Auth state persists across page refreshes
- [ ] Protected routes redirect to login
- [ ] RLS policies enforce client isolation
- [ ] JWT contains client_id claim

**Dependencies:** Task 1.2

**Files Created:**
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `middleware.ts`
- `app/(auth)/login/page.tsx`
- `app/(auth)/register/page.tsx`

---

#### Task 1.4: Environment Configuration & Deployment Setup (3 points)
**Description:** Configure all environment variables and prepare for deployment to Render + Netlify.

**Implementation Details:**

**1. Create Environment Files**

Create `.env.example`:

```env
# Database
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# LinkedIn Integration (will add in Epic 3)
UNIPILE_API_KEY=
UNIPILE_BASE_URL=https://api.unipile.com

# AI Services (will add in Epic 2)
OPENAI_API_KEY=
MEM0_API_KEY=

# Queue System (will add in Epic 3)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Security
JWT_SECRET=your-secret-key-minimum-32-chars
ENCRYPTION_KEY=another-secret-key-for-encryption
```

**2. Configure Render Deployment**

Create `render.yaml`:

```yaml
services:
  - type: web
    name: bravo-revos-api
    env: node
    region: oregon
    buildCommand: npm install && npm run build
    startCommand: npm run start
    envVars:
      - key: NODE_ENV
        value: production
      - key: NEXT_PUBLIC_SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false
```

**3. Configure Netlify Deployment**

Create `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[redirects]]
  from = "/api/*"
  to = "https://bravo-revos-api.onrender.com/api/:splat"
  status = 200
  force = true

[build.environment]
  NODE_VERSION = "18"
```

**Validation:**
- [ ] All environment variables documented
- [ ] .env.local created with actual values
- [ ] render.yaml configured
- [ ] netlify.toml configured
- [ ] .gitignore excludes secrets

**Dependencies:** Task 1.1, 1.2, 1.3

**Files Created:**
- `.env.example`
- `render.yaml`
- `netlify.toml`

---

#### Task 1.5: BullMQ Queue System Setup (6 points)
**Description:** Set up BullMQ with Upstash Redis for rate-limited operations (DMs, posts, webhooks).

**Implementation Details:**

**1. Install Dependencies**

```bash
npm install bullmq ioredis @upstash/redis
```

**2. Create Queue Infrastructure**

Create `lib/queue/connection.ts`:

```typescript
import { Redis } from 'ioredis';

export const redisConnection = new Redis({
  host: process.env.UPSTASH_REDIS_HOST,
  port: 6379,
  password: process.env.UPSTASH_REDIS_PASSWORD,
  maxRetriesPerRequest: null,
});
```

Create `lib/queue/queues.ts`:

```typescript
import { Queue } from 'bullmq';
import { redisConnection } from './connection';

export const dmQueue = new Queue('dms', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      count: 100,
    },
    removeOnFail: {
      count: 500,
    },
  },
});

export const postQueue = new Queue('posts', {
  connection: redisConnection,
});

export const webhookQueue = new Queue('webhooks', {
  connection: redisConnection,
});

export const pollingQueue = new Queue('polling', {
  connection: redisConnection,
});
```

**3. Create Queue Workers**

Create `lib/queue/workers/dm-worker.ts`:

```typescript
import { Worker, Job } from 'bullmq';
import { redisConnection } from '../connection';

interface DMJobData {
  recipientId: string;
  message: string;
  campaignId: string;
  step: 1 | 2 | 3;
}

export const dmWorker = new Worker<DMJobData>(
  'dms',
  async (job: Job<DMJobData>) => {
    const { recipientId, message, campaignId, step } = job.data;

    // TODO: Implement in Epic 3
    console.log(`Sending DM to ${recipientId} for campaign ${campaignId}`);

    // Track in database
    await trackDM({
      leadId: recipientId,
      campaignId,
      step,
      status: 'sent',
      message,
    });

    return { success: true };
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

dmWorker.on('completed', (job) => {
  console.log(`DM job ${job.id} completed`);
});

dmWorker.on('failed', (job, err) => {
  console.error(`DM job ${job?.id} failed:`, err);
});
```

**4. Create Queue Management API**

Create `app/api/queue/status/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { dmQueue, postQueue, webhookQueue } from '@/lib/queue/queues';

export async function GET() {
  const [dmCounts, postCounts, webhookCounts] = await Promise.all([
    dmQueue.getJobCounts(),
    postQueue.getJobCounts(),
    webhookQueue.getJobCounts(),
  ]);

  return NextResponse.json({
    dms: dmCounts,
    posts: postCounts,
    webhooks: webhookCounts,
  });
}
```

**5. Create Worker Startup Script**

Create `scripts/start-workers.ts`:

```typescript
import { dmWorker } from '@/lib/queue/workers/dm-worker';
import { postWorker } from '@/lib/queue/workers/post-worker';
import { webhookWorker } from '@/lib/queue/workers/webhook-worker';

console.log('Starting BullMQ workers...');

process.on('SIGTERM', async () => {
  console.log('Shutting down workers...');
  await Promise.all([
    dmWorker.close(),
    postWorker.close(),
    webhookWorker.close(),
  ]);
  process.exit(0);
});
```

**Validation:**
- [ ] Redis connection successful
- [ ] Queues can add jobs
- [ ] Workers process jobs
- [ ] Failed jobs retry with backoff
- [ ] Queue status API returns counts

**Dependencies:** Task 1.1

**Files Created:**
- `lib/queue/connection.ts`
- `lib/queue/queues.ts`
- `lib/queue/workers/dm-worker.ts`
- `lib/queue/workers/post-worker.ts`
- `lib/queue/workers/webhook-worker.ts`
- `app/api/queue/status/route.ts`
- `scripts/start-workers.ts`

---

## Epic 2: cartridge-system
**Purpose:** Implement AI content pipeline with copywriting skill and voice cartridge transformation

**Duration:** Session 3-4 (35 story points)
**Branch:** `cartridge-system`

### Tasks

#### Task 2.1: OpenAI Integration & Base Infrastructure (5 points)
**Description:** Set up OpenAI GPT-4o client and create base infrastructure for AI operations.

**Implementation Details:**

**1. Install Dependencies**

```bash
npm install openai
```

**2. Create OpenAI Client**

Create `lib/ai/openai-client.ts`:

```typescript
import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateCompletion(
  prompt: string,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: options?.model || 'gpt-4o',
    temperature: options?.temperature || 0.7,
    max_tokens: options?.maxTokens || 1000,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  return response.choices[0].message.content || '';
}
```

**3. Create AI Service Base**

Create `lib/ai/types.ts`:

```typescript
export interface SkillInput {
  contentType: 'linkedin_post' | 'dm_message' | 'comment';
  objective: string;
  context?: Record<string, any>;
  leadMagnet?: {
    title: string;
    description: string;
    valueProposition: string;
  };
}

export interface CopywritingOutput {
  headline?: string;
  hook: string;
  body: string;
  cta: string;
  metadata: {
    framework: string;
    readingLevel: number;
    emotionalTone: string;
  };
}

export interface VoiceParameters {
  tone: 'professional' | 'casual' | 'inspirational' | 'analytical';
  style: 'conversational' | 'authoritative' | 'storytelling';
  personality: string[];
  vocabulary: 'basic' | 'professional' | 'technical';
  phrases: string[];
  emojis: boolean;
}
```

**Validation:**
- [ ] OpenAI API key valid
- [ ] Can generate completions
- [ ] Error handling for rate limits
- [ ] Types properly defined

**Dependencies:** Task 1.1

**Files Created:**
- `lib/ai/openai-client.ts`
- `lib/ai/types.ts`

---

#### Task 2.2: Copywriting Skill Implementation (10 points)
**Description:** Implement copywriting skill that generates conversion-optimized content using proven frameworks (AIDA, PAS, VALUE).

**Implementation Details:**

**1. Create Copywriting Service**

Create `lib/skills/copywriting/index.ts`:

```typescript
import { openai } from '@/lib/ai/openai-client';
import type { SkillInput, CopywritingOutput } from '@/lib/ai/types';

export class CopywritingSkill {
  async generate(input: SkillInput): Promise<CopywritingOutput> {
    const framework = this.selectFramework(input.contentType);
    const prompt = this.buildPrompt(input, framework);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: this.getSystemPrompt(framework),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.choices[0].message.content || '';
    return this.parseResponse(content, input.contentType);
  }

  private selectFramework(contentType: string): string {
    switch (contentType) {
      case 'linkedin_post':
        return 'AIDA'; // Attention, Interest, Desire, Action
      case 'dm_message':
        return 'PAS'; // Problem, Agitate, Solution
      case 'comment':
        return 'VALUE'; // Value-first approach
      default:
        return 'AIDA';
    }
  }

  private getSystemPrompt(framework: string): string {
    const prompts = {
      AIDA: `You are an expert copywriter specializing in LinkedIn content.
Use the AIDA framework:
- Attention: Create a pattern-interrupt headline
- Interest: Present a compelling problem or opportunity
- Desire: Show transformation and benefits
- Action: Clear CTA with urgency

Write professionally, concisely, and conversationally.
Focus on value delivery and authentic connection.`,

      PAS: `You are an expert at writing persuasive DM messages.
Use the PAS framework:
- Problem: Acknowledge their challenge
- Agitate: Emphasize pain of status quo
- Solution: Present the lead magnet as the answer

Keep messages short (2-3 sentences), friendly, and personalized.
Always include a clear request for their email.`,

      VALUE: `You are an expert at writing engaging LinkedIn comments.
Use the VALUE framework:
- Value-first: Lead with genuine insight
- Acknowledge: Reference the original post
- Link: Connect naturally to your lead magnet
- Urgency: Time-sensitive language
- Engage: End with question or invitation

Be authentic, helpful, and non-salesy.`,
    };

    return prompts[framework] || prompts.AIDA;
  }

  private buildPrompt(input: SkillInput, framework: string): string {
    if (input.contentType === 'linkedin_post') {
      return `
Create a LinkedIn post using the ${framework} framework.

Lead Magnet: ${input.leadMagnet?.title}
Value Proposition: ${input.leadMagnet?.valueProposition}
Objective: ${input.objective}

Requirements:
- Include clear trigger word CTA (e.g., "Comment SCALE below")
- Make it engaging and valuable
- 150-250 words
- Professional but conversational tone

Output format:
HEADLINE: [attention-grabbing headline]
HOOK: [compelling opening line]
BODY: [main content with value]
CTA: [clear call to action with trigger word]
`;
    }

    if (input.contentType === 'dm_message') {
      return `
Create a DM message using the ${framework} framework.

Recipient: ${input.context?.recipientName || 'there'}
Lead Magnet: ${input.leadMagnet?.title}
Context: They commented "${input.context?.triggerWord}" on a post

Requirements:
- Keep it short (2-3 sentences max)
- Request their email address
- Be friendly and personalized
- Natural, not salesy

Output format:
MESSAGE: [complete DM message]
`;
    }

    return '';
  }

  private parseResponse(
    content: string,
    contentType: string
  ): CopywritingOutput {
    if (contentType === 'linkedin_post') {
      const headlineMatch = content.match(/HEADLINE:(.+)/i);
      const hookMatch = content.match(/HOOK:(.+)/i);
      const bodyMatch = content.match(/BODY:(.+)/si);
      const ctaMatch = content.match(/CTA:(.+)/i);

      return {
        headline: headlineMatch?.[1].trim(),
        hook: hookMatch?.[1].trim() || '',
        body: bodyMatch?.[1].trim() || '',
        cta: ctaMatch?.[1].trim() || '',
        metadata: {
          framework: 'AIDA',
          readingLevel: 8,
          emotionalTone: 'inspiring_authoritative',
        },
      };
    }

    if (contentType === 'dm_message') {
      const messageMatch = content.match(/MESSAGE:(.+)/si);
      const message = messageMatch?.[1].trim() || content;

      return {
        hook: message,
        body: '',
        cta: '',
        metadata: {
          framework: 'PAS',
          readingLevel: 6,
          emotionalTone: 'friendly_helpful',
        },
      };
    }

    return {
      hook: content,
      body: '',
      cta: '',
      metadata: {
        framework: 'VALUE',
        readingLevel: 7,
        emotionalTone: 'helpful_engaging',
      },
    };
  }
}

export const copywritingSkill = new CopywritingSkill();
```

**2. Create API Endpoint**

Create `app/api/skills/copywriting/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { copywritingSkill } from '@/lib/skills/copywriting';

export async function POST(request: Request) {
  try {
    const input = await request.json();
    const output = await copywritingSkill.generate(input);
    return NextResponse.json(output);
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

**3. Create Test Suite**

Create `__tests__/skills/copywriting.test.ts`:

```typescript
import { copywritingSkill } from '@/lib/skills/copywriting';

describe('CopywritingSkill', () => {
  it('generates LinkedIn post with AIDA framework', async () => {
    const output = await copywritingSkill.generate({
      contentType: 'linkedin_post',
      objective: 'Generate leads for leadership guide',
      leadMagnet: {
        title: '10x Leadership Framework',
        description: 'Transform your team in 30 days',
        valueProposition: 'Used by 500+ CEOs',
      },
    });

    expect(output.headline).toBeDefined();
    expect(output.hook).toBeDefined();
    expect(output.body).toBeDefined();
    expect(output.cta).toContain('comment');
    expect(output.metadata.framework).toBe('AIDA');
  });

  it('generates DM with PAS framework', async () => {
    const output = await copywritingSkill.generate({
      contentType: 'dm_message',
      objective: 'Request email for lead magnet',
      context: {
        recipientName: 'John',
        triggerWord: 'SCALE',
      },
      leadMagnet: {
        title: '10x Leadership Framework',
        description: 'Scale your team effectively',
        valueProposition: 'Proven by 500+ CEOs',
      },
    });

    expect(output.hook).toBeDefined();
    expect(output.hook.toLowerCase()).toContain('email');
    expect(output.metadata.framework).toBe('PAS');
  });
});
```

**Validation:**
- [ ] Generates LinkedIn posts with AIDA
- [ ] Generates DMs with PAS
- [ ] Generates comments with VALUE
- [ ] All outputs include required fields
- [ ] API endpoint works correctly
- [ ] Tests pass

**Dependencies:** Task 2.1

**Files Created:**
- `lib/skills/copywriting/index.ts`
- `app/api/skills/copywriting/route.ts`
- `__tests__/skills/copywriting.test.ts`

---

#### Task 2.3: Voice Cartridge System - 4-Tier Hierarchy (10 points)
**Description:** Implement 4-tier voice cartridge hierarchy (System → Workspace → User → Skills) for voice parameter management.

**Implementation Details:**

**1. Create Voice Service**

Create `lib/cartridge/voice-service.ts`:

```typescript
import { createClient } from '@/lib/supabase/server';
import type { VoiceParameters } from '@/lib/ai/types';

export interface VoiceCartridge {
  id: string;
  tier: 'system' | 'workspace' | 'user' | 'skill';
  name: string;
  voice: VoiceParameters;
  knowledge: {
    industry: string;
    expertise: string[];
    audience: string;
    values: string[];
  };
  parentCartridgeId?: string;
}

export class VoiceService {
  private supabase = createClient();

  async getEffectiveVoice(userId: string): Promise<VoiceParameters> {
    // Get all cartridges in hierarchy
    const cartridges = await this.getCartridgeHierarchy(userId);

    // Merge from system → workspace → user → skill
    return this.mergeVoiceParameters(cartridges);
  }

  private async getCartridgeHierarchy(
    userId: string
  ): Promise<VoiceCartridge[]> {
    const { data: user } = await this.supabase
      .from('users')
      .select('client_id')
      .eq('id', userId)
      .single();

    // Get all relevant cartridges
    const { data: cartridges } = await this.supabase
      .from('cartridges')
      .select('*')
      .or(`tier.eq.system,client_id.eq.${user.client_id},user_id.eq.${userId}`)
      .order('tier', { ascending: true });

    return cartridges || [];
  }

  private mergeVoiceParameters(
    cartridges: VoiceCartridge[]
  ): VoiceParameters {
    let merged: VoiceParameters = {
      tone: 'professional',
      style: 'conversational',
      personality: [],
      vocabulary: 'professional',
      phrases: [],
      emojis: false,
    };

    // Apply each tier in order (system → workspace → user → skill)
    for (const cartridge of cartridges) {
      merged = {
        ...merged,
        ...cartridge.voice,
        personality: [
          ...merged.personality,
          ...(cartridge.voice.personality || []),
        ],
        phrases: [...merged.phrases, ...(cartridge.voice.phrases || [])],
      };
    }

    return merged;
  }

  async createCartridge(
    data: Partial<VoiceCartridge>
  ): Promise<VoiceCartridge> {
    const { data: cartridge, error } = await this.supabase
      .from('cartridges')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return cartridge;
  }

  async updateCartridge(
    id: string,
    updates: Partial<VoiceCartridge>
  ): Promise<void> {
    const { error } = await this.supabase
      .from('cartridges')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  }
}

export const voiceService = new VoiceService();
```

**2. Create Voice Transformation Service**

Create `lib/cartridge/voice-transformer.ts`:

```typescript
import { openai } from '@/lib/ai/openai-client';
import type { VoiceParameters, CopywritingOutput } from '@/lib/ai/types';

export class VoiceTransformer {
  async transform(
    content: CopywritingOutput,
    voice: VoiceParameters
  ): Promise<string> {
    const prompt = this.buildTransformationPrompt(content, voice);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: this.getSystemPrompt(),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    return response.choices[0].message.content || '';
  }

  private getSystemPrompt(): string {
    return `You are a voice transformation expert. Your job is to rewrite content to match a specific voice profile while maintaining:
1. The core message and value proposition
2. The persuasive structure and framework
3. All call-to-actions and trigger words
4. The conversion effectiveness

Transform the writing style, tone, vocabulary, and personality to match the target voice, but keep the substance intact.`;
  }

  private buildTransformationPrompt(
    content: CopywritingOutput,
    voice: VoiceParameters
  ): string {
    const fullContent = [
      content.headline && `HEADLINE: ${content.headline}`,
      `HOOK: ${content.hook}`,
      content.body && `BODY: ${content.body}`,
      content.cta && `CTA: ${content.cta}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    return `
Transform this content to match the following voice profile:

ORIGINAL CONTENT:
${fullContent}

VOICE PROFILE:
- Tone: ${voice.tone}
- Style: ${voice.style}
- Personality: ${voice.personality.join(', ')}
- Vocabulary: ${voice.vocabulary}
- Common phrases: ${voice.phrases.join(', ')}
- Emojis: ${voice.emojis ? 'Yes, use moderately' : 'No, avoid emojis'}

REQUIREMENTS:
1. Maintain all CTAs and trigger words exactly
2. Keep the same persuasive structure
3. Preserve the core message and value
4. Match the target voice naturally
5. Sound authentic, not forced

OUTPUT:
[Transformed content maintaining the same structure]
`;
  }
}

export const voiceTransformer = new VoiceTransformer();
```

**3. Create Voice Auto-Generation**

Create `lib/cartridge/voice-generator.ts`:

```typescript
import { openai } from '@/lib/ai/openai-client';
import type { VoiceParameters } from '@/lib/ai/types';

export class VoiceGenerator {
  async analyzePostsAndGenerateVoice(
    posts: string[]
  ): Promise<VoiceParameters> {
    const prompt = `
Analyze these LinkedIn posts and extract the author's unique voice profile:

POSTS:
${posts.map((p, i) => `Post ${i + 1}:\n${p}`).join('\n\n---\n\n')}

Based on these posts, determine:
1. Overall tone (professional/casual/inspirational/analytical)
2. Writing style (conversational/authoritative/storytelling/educational)
3. Personality traits (3-5 adjectives)
4. Vocabulary level (basic/professional/technical)
5. Common phrases or patterns (3-5 examples)
6. Emoji usage (yes/no and frequency)

OUTPUT FORMAT (JSON):
{
  "tone": "...",
  "style": "...",
  "personality": ["...", "..."],
  "vocabulary": "...",
  "phrases": ["...", "..."],
  "emojis": true/false
}
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.choices[0].message.content || '{}';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const voice = JSON.parse(jsonMatch?.[0] || '{}');

    return voice;
  }
}

export const voiceGenerator = new VoiceGenerator();
```

**4. Create API Endpoints**

Create `app/api/cartridges/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { voiceService } from '@/lib/cartridge/voice-service';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  const voice = await voiceService.getEffectiveVoice(userId);
  return NextResponse.json(voice);
}

export async function POST(request: Request) {
  const data = await request.json();
  const cartridge = await voiceService.createCartridge(data);
  return NextResponse.json(cartridge);
}
```

Create `app/api/cartridges/generate/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { voiceGenerator } from '@/lib/cartridge/voice-generator';
import { voiceService } from '@/lib/cartridge/voice-service';

export async function POST(request: Request) {
  const { posts, userId } = await request.json();

  // Analyze posts and generate voice
  const voice = await voiceGenerator.analyzePostsAndGenerateVoice(posts);

  // Create cartridge
  const cartridge = await voiceService.createCartridge({
    user_id: userId,
    tier: 'user',
    name: 'Auto-Generated Voice',
    voice,
    knowledge: {},
  });

  return NextResponse.json(cartridge);
}
```

**Validation:**
- [ ] Can create cartridges at all tiers
- [ ] Hierarchy merging works correctly
- [ ] Voice transformation maintains CTAs
- [ ] Auto-generation from posts works
- [ ] API endpoints functional

**Dependencies:** Task 2.1, 2.2

**Files Created:**
- `lib/cartridge/voice-service.ts`
- `lib/cartridge/voice-transformer.ts`
- `lib/cartridge/voice-generator.ts`
- `app/api/cartridges/route.ts`
- `app/api/cartridges/generate/route.ts`

---

#### Task 2.4: Full Content Pipeline Integration (10 points)
**Description:** Integrate copywriting skill + voice cartridge into complete pipeline, with skill execution modes (AI/Human/Scheduled).

**Implementation Details:**

**1. Create Content Pipeline Service**

Create `lib/skills/content-pipeline.ts`:

```typescript
import { copywritingSkill } from './copywriting';
import { voiceService } from '@/lib/cartridge/voice-service';
import { voiceTransformer } from '@/lib/cartridge/voice-transformer';
import type { SkillInput } from '@/lib/ai/types';

export interface PipelineConfig {
  copywritingMode: 'ai' | 'human' | 'scheduled';
  voiceEnabled: boolean; // Always true in production
  cartridgeId?: string;
  scheduledFor?: Date;
}

export class ContentPipeline {
  async execute(
    input: SkillInput,
    userId: string,
    config: PipelineConfig
  ): Promise<string> {
    // Step 1: Get copywriting output
    let copywritingOutput;

    if (config.copywritingMode === 'human') {
      // Human mode - return placeholder for manual input
      return '[Manual input required]';
    }

    if (config.copywritingMode === 'scheduled') {
      // Schedule for later
      await this.scheduleGeneration(input, userId, config);
      return '[Scheduled for generation]';
    }

    // AI mode - generate immediately
    copywritingOutput = await copywritingSkill.generate(input);

    // Step 2: Apply voice transformation (MANDATORY)
    const voice = await voiceService.getEffectiveVoice(userId);
    const transformed = await voiceTransformer.transform(
      copywritingOutput,
      voice
    );

    // Step 3: Track execution
    await this.trackExecution({
      userId,
      skillName: 'copywriting_voice_pipeline',
      input,
      output: transformed,
      config,
    });

    return transformed;
  }

  private async scheduleGeneration(
    input: SkillInput,
    userId: string,
    config: PipelineConfig
  ): Promise<void> {
    // Add to queue for scheduled execution
    // TODO: Implement with BullMQ delayed jobs
    console.log(`Scheduling for ${config.scheduledFor}`);
  }

  private async trackExecution(data: {
    userId: string;
    skillName: string;
    input: SkillInput;
    output: string;
    config: PipelineConfig;
  }): Promise<void> {
    // Track in skill_executions table
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = createClient();

    await supabase.from('skill_executions').insert({
      skill_name: data.skillName,
      input_data: data.input,
      output_data: { content: data.output },
      execution_time_ms: Date.now(), // TODO: Track actual time
      success: true,
    });
  }
}

export const contentPipeline = new ContentPipeline();
```

**2. Create UI for Skill Configuration**

Create `components/campaigns/skill-configuration.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SkillConfig {
  copywritingMode: 'ai' | 'human' | 'scheduled';
  voiceEnabled: boolean;
  cartridgeId?: string;
}

export function SkillConfiguration({ onChange }: { onChange: (config: SkillConfig) => void }) {
  const [config, setConfig] = useState<SkillConfig>({
    copywritingMode: 'ai',
    voiceEnabled: true,
  });

  const updateConfig = (updates: Partial<SkillConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onChange(newConfig);
  };

  return (
    <div className="space-y-6">
      <div>
        <Label>Copywriting Mode</Label>
        <Select
          value={config.copywritingMode}
          onValueChange={(value) =>
            updateConfig({ copywritingMode: value as any })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ai">AI Generated</SelectItem>
            <SelectItem value="human">Manual Input</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label>Voice Filter</Label>
          <p className="text-sm text-gray-500">
            Always applied to maintain consistency
          </p>
        </div>
        <Switch checked={true} disabled />
      </div>
    </div>
  );
}
```

**3. Create Post Generation Flow**

Create `app/api/campaigns/[id]/generate-post/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { contentPipeline } from '@/lib/skills/content-pipeline';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { userId } = await request.json();

  // Get campaign details
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*, lead_magnets(*)')
    .eq('id', params.id)
    .single();

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  // Generate post content
  const content = await contentPipeline.execute(
    {
      contentType: 'linkedin_post',
      objective: 'Generate leads for lead magnet',
      leadMagnet: {
        title: campaign.lead_magnets.name,
        description: campaign.lead_magnets.description || '',
        valueProposition: campaign.description || '',
      },
    },
    userId,
    {
      copywritingMode: 'ai',
      voiceEnabled: true,
    }
  );

  // Save as draft post
  const { data: post } = await supabase
    .from('posts')
    .insert({
      campaign_id: campaign.id,
      content,
      trigger_word: campaign.trigger_word,
      status: 'draft',
    })
    .select()
    .single();

  return NextResponse.json(post);
}
```

**Validation:**
- [ ] Full pipeline executes correctly
- [ ] Copywriting → Voice transformation works
- [ ] All three modes (AI/Human/Scheduled) implemented
- [ ] Voice filter always applied
- [ ] Execution tracking works
- [ ] UI configuration functional

**Dependencies:** Task 2.2, 2.3

**Files Created:**
- `lib/skills/content-pipeline.ts`
- `components/campaigns/skill-configuration.tsx`
- `app/api/campaigns/[id]/generate-post/route.ts`

---

## Epic 3: lead-automation
**Purpose:** Implement Unipile integration and complete 7-step lead generation flow

**Duration:** Session 5-7 (35 story points)
**Branch:** `lead-automation`

### Tasks

#### Task 3.1: Unipile API Client Integration (8 points)
**Description:** Implement complete Unipile API client for LinkedIn operations (posts, DMs, comments polling).

**Implementation Details:**

**1. Install Unipile SDK (if available) or create client**

```bash
npm install axios
```

**2. Create Unipile Client**

Create `lib/unipile/client.ts`:

```typescript
import axios, { AxiosInstance } from 'axios';

export interface UnipileConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface LinkedInPost {
  account_id: string;
  text: string;
  media?: string[];
  visibility?: 'PUBLIC' | 'CONNECTIONS';
}

export interface LinkedInMessage {
  account_id: string;
  recipient_id: string;
  text: string;
}

export interface LinkedInComment {
  id: string;
  author_id: string;
  author_name: string;
  text: string;
  created_at: string;
}

export class UnipileClient {
  private client: AxiosInstance;

  constructor(config: UnipileConfig) {
    this.client = axios.create({
      baseURL: config.baseUrl || 'https://api.unipile.com/v1',
      headers: {
        'X-API-KEY': config.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  // Authentication
  async createAccount(credentials: {
    provider: 'LINKEDIN';
    username: string;
    password: string;
  }) {
    const { data } = await this.client.post('/accounts', credentials);
    return data;
  }

  async listAccounts() {
    const { data } = await this.client.get('/accounts');
    return data.items || [];
  }

  // Posts
  async createPost(post: LinkedInPost) {
    const { data } = await this.client.post('/posts', post);
    return data;
  }

  async getPost(postId: string) {
    const { data } = await this.client.get(`/posts/${postId}`);
    return data;
  }

  // Comments (NO webhook - must poll)
  async getPostComments(postId: string, since?: Date): Promise<LinkedInComment[]> {
    const params: any = { post_id: postId };
    if (since) {
      params.since = since.toISOString();
    }

    const { data } = await this.client.get('/comments', { params });
    return data.items || [];
  }

  // Messages (DMs)
  async sendMessage(message: LinkedInMessage) {
    const { data } = await this.client.post('/messages', message);
    return data;
  }

  async getConversation(conversationId: string) {
    const { data } = await this.client.get(`/conversations/${conversationId}`);
    return data;
  }

  async getConversationMessages(conversationId: string) {
    const { data } = await this.client.get(`/conversations/${conversationId}/messages`);
    return data.items || [];
  }

  // Rate Limit Information
  async getAccountInfo(accountId: string) {
    const { data } = await this.client.get(`/accounts/${accountId}`);
    return data;
  }
}

// Singleton instance
let unipileClient: UnipileClient | null = null;

export function getUnipileClient(): UnipileClient {
  if (!unipileClient) {
    unipileClient = new UnipileClient({
      apiKey: process.env.UNIPILE_API_KEY!,
      baseUrl: process.env.UNIPILE_BASE_URL,
    });
  }
  return unipileClient;
}
```

**3. Create Rate Limiter**

Create `lib/unipile/rate-limiter.ts`:

```typescript
import { createClient } from '@/lib/supabase/server';

export class RateLimiter {
  async canSendDM(accountId: string): Promise<boolean> {
    const supabase = createClient();

    const { data: account } = await supabase
      .from('linkedin_accounts')
      .select('daily_dm_count, rate_limit_reset_at')
      .eq('id', accountId)
      .single();

    if (!account) return false;

    // Reset daily count if needed
    const now = new Date();
    if (
      !account.rate_limit_reset_at ||
      new Date(account.rate_limit_reset_at) < now
    ) {
      await supabase
        .from('linkedin_accounts')
        .update({
          daily_dm_count: 0,
          rate_limit_reset_at: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        })
        .eq('id', accountId);

      return true;
    }

    // Check daily limit (50 DMs/day)
    return account.daily_dm_count < 50;
  }

  async incrementDMCount(accountId: string): Promise<void> {
    const supabase = createClient();

    await supabase.rpc('increment_dm_count', { account_id: accountId });
  }

  async canCreatePost(accountId: string): Promise<boolean> {
    const supabase = createClient();

    const { data: account } = await supabase
      .from('linkedin_accounts')
      .select('daily_post_count, rate_limit_reset_at')
      .eq('id', accountId)
      .single();

    if (!account) return false;

    // Check daily limit (25 posts/day)
    return account.daily_post_count < 25;
  }
}

export const rateLimiter = new RateLimiter();
```

**4. Create Database Function for Rate Limiting**

Add to Supabase:

```sql
CREATE OR REPLACE FUNCTION increment_dm_count(account_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE linkedin_accounts
  SET daily_dm_count = daily_dm_count + 1
  WHERE id = account_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_post_count(account_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE linkedin_accounts
  SET daily_post_count = daily_post_count + 1
  WHERE id = account_id;
END;
$$ LANGUAGE plpgsql;
```

**Validation:**
- [ ] Can authenticate LinkedIn accounts
- [ ] Can create posts
- [ ] Can send DMs
- [ ] Can fetch comments (polling)
- [ ] Rate limiting works
- [ ] Error handling for API failures

**Dependencies:** Task 1.2, 1.5

**Files Created:**
- `lib/unipile/client.ts`
- `lib/unipile/rate-limiter.ts`
- Migration for rate limiting functions

---

#### Task 3.2: Comment Polling Service (7 points)
**Description:** Implement scheduled comment polling (15-30 min intervals) to detect trigger words. NO webhooks available.

**Implementation Details:**

**1. Create Polling Service**

Create `lib/polling/comment-monitor.ts`:

```typescript
import { getUnipileClient } from '@/lib/unipile/client';
import { createClient } from '@/lib/supabase/server';
import { dmQueue } from '@/lib/queue/queues';

export class CommentMonitor {
  private unipile = getUnipileClient();
  private supabase = createClient();

  async pollActiveCampaigns(): Promise<void> {
    // Get all active campaigns with published posts
    const { data: campaigns } = await this.supabase
      .from('campaigns')
      .select('*, posts!inner(*)')
      .eq('status', 'active')
      .eq('posts.status', 'published');

    if (!campaigns) return;

    for (const campaign of campaigns) {
      await this.pollCampaignComments(campaign);
    }
  }

  private async pollCampaignComments(campaign: any): Promise<void> {
    for (const post of campaign.posts) {
      try {
        // Fetch new comments since last poll
        const lastPoll = post.last_polled_at
          ? new Date(post.last_polled_at)
          : new Date(0);

        const comments = await this.unipile.getPostComments(
          post.unipile_post_id,
          lastPoll
        );

        // Process each comment
        for (const comment of comments) {
          await this.processComment(comment, campaign, post);
        }

        // Update last polled timestamp
        await this.supabase
          .from('posts')
          .update({ last_polled_at: new Date().toISOString() })
          .eq('id', post.id);
      } catch (error) {
        console.error(`Error polling post ${post.id}:`, error);
      }
    }
  }

  private async processComment(
    comment: any,
    campaign: any,
    post: any
  ): Promise<void> {
    const triggerWord = campaign.trigger_word.toLowerCase();
    const hasTrigger = comment.text.toLowerCase().includes(triggerWord);

    // Store comment in database
    const { data: storedComment } = await this.supabase
      .from('comments')
      .insert({
        post_id: post.id,
        unipile_comment_id: comment.id,
        author_name: comment.author_name,
        author_linkedin_id: comment.author_id,
        content: comment.text,
        has_trigger_word: hasTrigger,
      })
      .select()
      .single();

    // If trigger word detected, create lead and queue DM
    if (hasTrigger) {
      await this.handleTriggerComment(storedComment, campaign);
    }
  }

  private async handleTriggerComment(
    comment: any,
    campaign: any
  ): Promise<void> {
    // Create or update lead
    const { data: lead } = await this.supabase
      .from('leads')
      .upsert(
        {
          campaign_id: campaign.id,
          linkedin_id: comment.author_linkedin_id,
          first_name: comment.author_name.split(' ')[0],
          status: 'comment_detected',
        },
        {
          onConflict: 'campaign_id,linkedin_id',
        }
      )
      .select()
      .single();

    // Create DM sequence record
    await this.supabase.from('dm_sequences').insert({
      lead_id: lead.id,
      campaign_id: campaign.id,
      status: 'in_progress',
    });

    // Queue Step 1 DM with random delay (2-15 minutes)
    const delayMs = (2 + Math.random() * 13) * 60 * 1000;

    await dmQueue.add(
      'send-initial-dm',
      {
        recipientId: comment.author_linkedin_id,
        recipientName: comment.author_name,
        campaignId: campaign.id,
        leadId: lead.id,
        step: 1,
      },
      {
        delay: delayMs,
      }
    );

    // Mark comment as DM queued
    await this.supabase
      .from('comments')
      .update({ dm_sent: true })
      .eq('id', comment.id);
  }
}

export const commentMonitor = new CommentMonitor();
```

**2. Create Polling Worker**

Create `lib/queue/workers/polling-worker.ts`:

```typescript
import { Worker } from 'bullmq';
import { redisConnection } from '../connection';
import { commentMonitor } from '@/lib/polling/comment-monitor';

export const pollingWorker = new Worker(
  'polling',
  async (job) => {
    await commentMonitor.pollActiveCampaigns();
    return { success: true };
  },
  {
    connection: redisConnection,
  }
);

pollingWorker.on('completed', (job) => {
  console.log(`Polling job ${job.id} completed`);
});

pollingWorker.on('failed', (job, err) => {
  console.error(`Polling job ${job?.id} failed:`, err);
});
```

**3. Create Polling Scheduler**

Create `lib/polling/scheduler.ts`:

```typescript
import { pollingQueue } from '@/lib/queue/queues';

export async function scheduleCommentPolling() {
  // Schedule polling every 15-30 minutes (randomized)
  const intervalMinutes = 15 + Math.random() * 15;

  await pollingQueue.add(
    'poll-comments',
    {},
    {
      repeat: {
        every: intervalMinutes * 60 * 1000,
      },
    }
  );

  console.log(`Comment polling scheduled every ${intervalMinutes} minutes`);
}

// Call on server startup
scheduleCommentPolling();
```

**4. Create Polling Status API**

Create `app/api/polling/status/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createClient();

  // Get polling status for all active campaigns
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name, posts(last_polled_at)')
    .eq('status', 'active');

  const status = campaigns?.map((c) => ({
    campaignId: c.id,
    campaignName: c.name,
    lastPoll: c.posts[0]?.last_polled_at,
    nextPoll: new Date(
      new Date(c.posts[0]?.last_polled_at || Date.now()).getTime() +
        20 * 60 * 1000
    ),
  }));

  return NextResponse.json(status);
}
```

**Validation:**
- [ ] Polling runs on schedule (15-30 min)
- [ ] Detects trigger words correctly
- [ ] Creates leads in database
- [ ] Queues DMs with random delay
- [ ] Handles API failures gracefully
- [ ] Updates last_polled_at timestamps

**Dependencies:** Task 3.1, 1.5

**Files Created:**
- `lib/polling/comment-monitor.ts`
- `lib/queue/workers/polling-worker.ts`
- `lib/polling/scheduler.ts`
- `app/api/polling/status/route.ts`

---

#### Task 3.3: 3-Step DM Sequence (10 points)
**Description:** Implement complete 3-step DM sequence: (1) Request email, (2) Confirmation, (3) Backup link after 5 minutes.

**Implementation Details:**

**1. Update DM Worker with Full Sequence**

Update `lib/queue/workers/dm-worker.ts`:

```typescript
import { Worker, Job } from 'bullmq';
import { redisConnection } from '../connection';
import { getUnipileClient } from '@/lib/unipile/client';
import { rateLimiter } from '@/lib/unipile/rate-limiter';
import { contentPipeline } from '@/lib/skills/content-pipeline';
import { createClient } from '@/lib/supabase/server';

interface DMJobData {
  recipientId: string;
  recipientName: string;
  campaignId: string;
  leadId: string;
  step: 1 | 2 | 3;
  email?: string; // For step 2
  downloadUrl?: string; // For step 3
}

export const dmWorker = new Worker<DMJobData>(
  'dms',
  async (job: Job<DMJobData>) => {
    const unipile = getUnipileClient();
    const supabase = createClient();
    const { recipientId, campaignId, leadId, step } = job.data;

    // Get campaign details
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('*, lead_magnets(*), linkedin_accounts(*)')
      .eq('id', campaignId)
      .single();

    // Check rate limits
    const canSend = await rateLimiter.canSendDM(
      campaign.linkedin_accounts.id
    );
    if (!canSend) {
      throw new Error('Rate limit exceeded');
    }

    // Generate message based on step
    let message: string;

    if (step === 1) {
      // Step 1: Request email
      message = await contentPipeline.execute(
        {
          contentType: 'dm_message',
          objective: 'Request email for lead magnet',
          context: {
            recipientName: job.data.recipientName,
            triggerWord: campaign.trigger_word,
          },
          leadMagnet: {
            title: campaign.lead_magnets.name,
            description: campaign.lead_magnets.description || '',
            valueProposition: campaign.description || '',
          },
        },
        campaign.linkedin_accounts.user_id,
        {
          copywritingMode: 'ai',
          voiceEnabled: true,
        }
      );
    } else if (step === 2) {
      // Step 2: Confirmation
      message = await generateConfirmationMessage(
        job.data.recipientName,
        job.data.email!,
        campaign.lead_magnets.name
      );
    } else {
      // Step 3: Backup with link
      message = await generateBackupMessage(
        job.data.recipientName,
        campaign.lead_magnets.name,
        job.data.downloadUrl!
      );
    }

    // Send via Unipile
    const result = await unipile.sendMessage({
      account_id: campaign.linkedin_accounts.unipile_account_id,
      recipient_id: recipientId,
      text: message,
    });

    // Update rate limit
    await rateLimiter.incrementDMCount(campaign.linkedin_accounts.id);

    // Track in database
    await supabase.from('dm_sequences').update({
      [`step${step}_sent_at`]: new Date().toISOString(),
      [`step${step}_message`]: message,
    }).eq('lead_id', leadId);

    // Update lead status
    const statusMap = {
      1: 'dm_sent',
      2: 'email_captured',
      3: 'backup_sent',
    };
    await supabase
      .from('leads')
      .update({ status: statusMap[step] })
      .eq('id', leadId);

    return { success: true, messageId: result.id };
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

async function generateConfirmationMessage(
  firstName: string,
  email: string,
  leadMagnetName: string
): Promise<string> {
  return `Perfect! Sending the ${leadMagnetName} to ${email} now.

Check your inbox (and spam folder) in the next few minutes.

If you don't see it within 5 minutes, I'll send you a direct download link right here.`;
}

async function generateBackupMessage(
  firstName: string,
  leadMagnetName: string,
  downloadUrl: string
): Promise<string> {
  return `Hey ${firstName}!

Here's that backup link I promised 🎁

${leadMagnetName}: ${downloadUrl}

(Link expires in 24 hours so grab it now!)

Should also be in your email, but wanted to make sure you got it 💪`;
}
```

**2. Create Email Extraction Service**

Create `lib/dm/email-extractor.ts`:

```typescript
import { openai } from '@/lib/ai/openai-client';

export class EmailExtractor {
  async extractEmail(dmReply: string): Promise<string | null> {
    // Try regex first
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const matches = dmReply.match(emailRegex);

    if (matches && matches.length === 1) {
      return this.validateEmail(matches[0]);
    }

    // If no match or multiple matches, use GPT-4
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: `Extract the email address from this message. Return ONLY the email address, nothing else:\n\n${dmReply}`,
        },
      ],
    });

    const extracted = response.choices[0].message.content?.trim();
    return extracted ? this.validateEmail(extracted) : null;
  }

  private validateEmail(email: string): string | null {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email) ? email : null;
  }
}

export const emailExtractor = new EmailExtractor();
```

**3. Create DM Reply Webhook Handler**

Create `app/api/webhooks/unipile/dm-reply/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { emailExtractor } from '@/lib/dm/email-extractor';
import { dmQueue, webhookQueue } from '@/lib/queue/queues';

export async function POST(request: Request) {
  const payload = await request.json();
  const supabase = createClient();

  // Unipile webhook format
  const { message, conversation_id, sender_id, text } = payload;

  // Find lead waiting for email
  const { data: dmSequence } = await supabase
    .from('dm_sequences')
    .select('*, leads(*), campaigns(*, lead_magnets(*))')
    .eq('leads.linkedin_id', sender_id)
    .eq('status', 'in_progress')
    .is('email_extracted', null)
    .single();

  if (!dmSequence) {
    return NextResponse.json({ received: true });
  }

  // Extract email from reply
  const email = await emailExtractor.extractEmail(text);

  if (!email) {
    // Send clarification DM
    await dmQueue.add('send-clarification-dm', {
      recipientId: sender_id,
      message: "I didn't catch your email address. Could you send it again?",
    });
    return NextResponse.json({ received: true });
  }

  // Update lead with email
  await supabase
    .from('leads')
    .update({ email, status: 'email_captured' })
    .eq('id', dmSequence.lead_id);

  await supabase
    .from('dm_sequences')
    .update({
      email_extracted: email,
      email_extracted_at: new Date().toISOString(),
    })
    .eq('id', dmSequence.id);

  // Send Step 2: Confirmation DM (immediately)
  await dmQueue.add('send-confirmation-dm', {
    recipientId: sender_id,
    recipientName: dmSequence.leads.first_name,
    campaignId: dmSequence.campaign_id,
    leadId: dmSequence.lead_id,
    step: 2,
    email,
  });

  // Send webhook to ESP (immediately)
  await webhookQueue.add('deliver-lead', {
    leadId: dmSequence.lead_id,
    email,
    campaignId: dmSequence.campaign_id,
  });

  // Schedule Step 3: Backup DM (5 minutes delay)
  await dmQueue.add(
    'send-backup-dm',
    {
      recipientId: sender_id,
      recipientName: dmSequence.leads.first_name,
      campaignId: dmSequence.campaign_id,
      leadId: dmSequence.lead_id,
      step: 3,
      downloadUrl: '[TO_BE_GENERATED]',
    },
    {
      delay: 5 * 60 * 1000,
    }
  );

  return NextResponse.json({ received: true, email });
}
```

**Validation:**
- [ ] Step 1 DM sent with voice filter
- [ ] Email extraction works (regex + GPT)
- [ ] Step 2 confirmation sent immediately
- [ ] Step 3 backup sent after 5 minutes
- [ ] All steps tracked in dm_sequences table
- [ ] Lead status updated correctly

**Dependencies:** Task 3.1, 3.2, 2.4

**Files Created:**
- Updated `lib/queue/workers/dm-worker.ts`
- `lib/dm/email-extractor.ts`
- `app/api/webhooks/unipile/dm-reply/route.ts`

---

#### Task 3.4: Webhook Delivery to ESP (5 points)
**Description:** Implement webhook delivery system to send lead data to client's ESP (Zapier, Make, ConvertKit, etc.).

**Implementation Details:**

**1. Create Webhook Service**

Create `lib/webhook/delivery-service.ts`:

```typescript
import axios from 'axios';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';

export interface WebhookPayload {
  email: string;
  first_name: string;
  last_name?: string;
  linkedin_url: string;
  lead_magnet_name: string;
  lead_magnet_url: string;
  campaign_id: string;
  campaign_name: string;
  captured_at: string;
  source: string;
  metadata: Record<string, any>;
}

export class WebhookDeliveryService {
  async deliverLead(leadId: string): Promise<void> {
    const supabase = createClient();

    // Get lead with campaign and webhook config
    const { data: lead } = await supabase
      .from('leads')
      .select('*, campaigns(*, webhook_configs(*), lead_magnets(*))')
      .eq('id', leadId)
      .single();

    if (!lead || !lead.campaigns.webhook_configs) {
      throw new Error('No webhook configured for campaign');
    }

    const config = lead.campaigns.webhook_configs;

    // Generate signed download URL
    const downloadUrl = await this.generateSignedUrl(
      lead.campaigns.lead_magnets.file_path,
      leadId
    );

    // Build payload
    const payload: WebhookPayload = {
      email: lead.email,
      first_name: lead.first_name,
      last_name: lead.last_name,
      linkedin_url: lead.linkedin_url,
      lead_magnet_name: lead.campaigns.lead_magnets.name,
      lead_magnet_url: downloadUrl,
      campaign_id: lead.campaign_id,
      campaign_name: lead.campaigns.name,
      captured_at: new Date().toISOString(),
      source: 'linkedin_comment',
      metadata: {},
    };

    // Send webhook with retries
    await this.sendWithRetry(config, payload, leadId);
  }

  private async sendWithRetry(
    config: any,
    payload: WebhookPayload,
    leadId: string
  ): Promise<void> {
    const supabase = createClient();

    // Create delivery record
    const { data: delivery } = await supabase
      .from('webhook_deliveries')
      .insert({
        webhook_config_id: config.id,
        lead_id: leadId,
        payload,
        status: 'pending',
      })
      .select()
      .single();

    let lastError: Error | null = null;
    const maxRetries = config.max_retries || 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const startTime = Date.now();

        // Sign payload if secret provided
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...config.headers,
        };

        if (config.secret) {
          const timestamp = Math.floor(Date.now() / 1000);
          const signature = this.signPayload(payload, config.secret);

          headers['X-RevOS-Signature'] = `sha256=${signature}`;
          headers['X-RevOS-Timestamp'] = timestamp.toString();
          headers['X-RevOS-Event'] = 'lead.captured';
        }

        // Send webhook
        const response = await axios.post(config.url, payload, {
          headers,
          timeout: config.timeout || 30000,
        });

        const responseTime = Date.now() - startTime;

        // Update delivery as success
        await supabase
          .from('webhook_deliveries')
          .update({
            status: 'success',
            status_code: response.status,
            response_body: response.data,
            response_time_ms: responseTime,
            delivered_at: new Date().toISOString(),
          })
          .eq('id', delivery.id);

        // Update lead status
        await supabase
          .from('leads')
          .update({ status: 'webhook_sent' })
          .eq('id', leadId);

        return;
      } catch (error: any) {
        lastError = error;

        await supabase
          .from('webhook_deliveries')
          .update({
            attempt_count: attempt,
            error_message: error.message,
          })
          .eq('id', delivery.id);

        // Don't retry on 4xx errors (except 429)
        if (
          error.response?.status >= 400 &&
          error.response?.status < 500 &&
          error.response?.status !== 429
        ) {
          break;
        }

        if (attempt < maxRetries) {
          const delay = config.retry_delay * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    await supabase
      .from('webhook_deliveries')
      .update({
        status: 'failed',
        error_message: lastError?.message,
      })
      .eq('id', delivery.id);

    throw lastError;
  }

  private signPayload(payload: any, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
  }

  private async generateSignedUrl(
    filePath: string,
    leadId: string
  ): Promise<string> {
    const supabase = createClient();

    const { data } = await supabase.storage
      .from('lead-magnets')
      .createSignedUrl(filePath, 86400); // 24 hours

    if (!data) throw new Error('Failed to generate download URL');

    // Add tracking parameters
    const url = new URL(data.signedUrl);
    url.searchParams.append('lid', leadId);
    url.searchParams.append('source', 'webhook');

    return url.toString();
  }
}

export const webhookDeliveryService = new WebhookDeliveryService();
```

**2. Create Webhook Worker**

Create `lib/queue/workers/webhook-worker.ts`:

```typescript
import { Worker, Job } from 'bullmq';
import { redisConnection } from '../connection';
import { webhookDeliveryService } from '@/lib/webhook/delivery-service';

interface WebhookJobData {
  leadId: string;
  email: string;
  campaignId: string;
}

export const webhookWorker = new Worker<WebhookJobData>(
  'webhooks',
  async (job: Job<WebhookJobData>) => {
    await webhookDeliveryService.deliverLead(job.data.leadId);
    return { success: true };
  },
  {
    connection: redisConnection,
    concurrency: 10,
  }
);

webhookWorker.on('completed', (job) => {
  console.log(`Webhook job ${job.id} completed`);
});

webhookWorker.on('failed', (job, err) => {
  console.error(`Webhook job ${job?.id} failed:`, err);
});
```

**3. Create Webhook Test API**

Create `app/api/webhooks/test/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { webhookDeliveryService } from '@/lib/webhook/delivery-service';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const { webhookConfigId } = await request.json();
  const supabase = createClient();

  // Get webhook config
  const { data: config } = await supabase
    .from('webhook_configs')
    .select('*')
    .eq('id', webhookConfigId)
    .single();

  if (!config) {
    return NextResponse.json(
      { error: 'Webhook config not found' },
      { status: 404 }
    );
  }

  // Send test payload
  const testPayload = {
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    linkedin_url: 'https://linkedin.com/in/testuser',
    lead_magnet_name: 'Test Lead Magnet',
    lead_magnet_url: 'https://example.com/test.pdf',
    campaign_id: 'test_campaign',
    campaign_name: 'Test Campaign',
    captured_at: new Date().toISOString(),
    source: 'test',
    metadata: {},
  };

  try {
    const startTime = Date.now();

    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      body: JSON.stringify(testPayload),
    });

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      success: response.ok,
      statusCode: response.status,
      responseTime,
      response: await response.json(),
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}
```

**Validation:**
- [ ] Webhooks sent successfully
- [ ] Retry logic works with backoff
- [ ] HMAC signing implemented
- [ ] Signed URLs generated correctly
- [ ] Test endpoint works
- [ ] Delivery tracking complete

**Dependencies:** Task 3.3, 1.2

**Files Created:**
- `lib/webhook/delivery-service.ts`
- `lib/queue/workers/webhook-worker.ts`
- `app/api/webhooks/test/route.ts`

---

#### Task 3.5: Engagement Pods - EVERYONE Engages (5 points)
**Description:** Implement engagement pod automation where EVERYONE engages with EVERYTHING (no rotation).

**Implementation Details:**

**1. Create Pod Service**

Create `lib/pods/pod-service.ts`:

```typescript
import { createClient } from '@/lib/supabase/server';
import { Queue } from 'bullmq';
import { redisConnection } from '@/lib/queue/connection';

const podQueue = new Queue('pod-engagement', { connection: redisConnection });

export class PodService {
  private supabase = createClient();

  async triggerPodEngagement(postId: string, authorMemberId: string): Promise<void> {
    // Get pod members (exclude author)
    const { data: author } = await this.supabase
      .from('pod_members')
      .select('pod_id')
      .eq('id', authorMemberId)
      .single();

    const { data: members } = await this.supabase
      .from('pod_members')
      .select('*, linkedin_accounts(*)')
      .eq('pod_id', author.pod_id)
      .eq('status', 'active')
      .neq('id', authorMemberId);

    if (!members || members.length < 8) {
      throw new Error('Pod must have at least 9 members (8 + author)');
    }

    // Schedule engagement for ALL members
    for (const member of members) {
      await this.scheduleEngagements(postId, member);
    }
  }

  private async scheduleEngagements(postId: string, member: any): Promise<void> {
    const post = await this.getPost(postId);

    // Schedule like (within 30 minutes)
    const likeDelay = Math.random() * 30 * 60 * 1000;
    await podQueue.add(
      'engage-like',
      {
        postId,
        postUrl: post.post_url,
        memberId: member.id,
        linkedinAccountId: member.linkedin_account_id,
      },
      { delay: likeDelay }
    );

    // Schedule comment (within 1-3 hours)
    const commentDelay = (60 + Math.random() * 120) * 60 * 1000;
    await podQueue.add(
      'engage-comment',
      {
        postId,
        postUrl: post.post_url,
        memberId: member.id,
        linkedinAccountId: member.linkedin_account_id,
      },
      { delay: commentDelay }
    );

    // Schedule instant repost (within 5-60 minutes)
    const repostDelay = (5 + Math.random() * 55) * 60 * 1000;
    await podQueue.add(
      'engage-repost',
      {
        postId,
        postUrl: post.post_url,
        memberId: member.id,
        linkedinAccountId: member.linkedin_account_id,
      },
      { delay: repostDelay }
    );

    // Track scheduled activities
    await this.supabase.from('pod_activities').insert([
      {
        pod_id: member.pod_id,
        post_id: postId,
        member_id: member.id,
        engagement_type: 'like',
        scheduled_for: new Date(Date.now() + likeDelay),
        status: 'pending',
      },
      {
        pod_id: member.pod_id,
        post_id: postId,
        member_id: member.id,
        engagement_type: 'comment',
        scheduled_for: new Date(Date.now() + commentDelay),
        status: 'pending',
      },
      {
        pod_id: member.pod_id,
        post_id: postId,
        member_id: member.id,
        engagement_type: 'repost',
        scheduled_for: new Date(Date.now() + repostDelay),
        status: 'pending',
      },
    ]);
  }

  private async getPost(postId: string): Promise<any> {
    const { data } = await this.supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single();
    return data;
  }
}

export const podService = new PodService();
```

**2. Create Pod Engagement Worker**

Create `lib/queue/workers/pod-worker.ts`:

```typescript
import { Worker, Job } from 'bullmq';
import { redisConnection } from '../connection';
import { getUnipileClient } from '@/lib/unipile/client';
import { createClient } from '@/lib/supabase/server';
import { contentPipeline } from '@/lib/skills/content-pipeline';

interface PodEngagementData {
  postId: string;
  postUrl: string;
  memberId: string;
  linkedinAccountId: string;
}

export const podWorker = new Worker(
  'pod-engagement',
  async (job: Job<PodEngagementData>) => {
    const unipile = getUnipileClient();
    const supabase = createClient();
    const { postId, memberId, linkedinAccountId } = job.data;

    // Get member details
    const { data: member } = await supabase
      .from('pod_members')
      .select('*, users(*), linkedin_accounts(*)')
      .eq('id', memberId)
      .single();

    if (job.name === 'engage-like') {
      // Like the post
      await unipile.client.post('/posts/like', {
        account_id: member.linkedin_accounts.unipile_account_id,
        post_id: postId,
      });
    } else if (job.name === 'engage-comment') {
      // Generate comment using VALUE framework
      const { data: post } = await supabase
        .from('posts')
        .select('content')
        .eq('id', postId)
        .single();

      const comment = await contentPipeline.execute(
        {
          contentType: 'comment',
          objective: 'Add value to pod member post',
          context: {
            postContent: post.content,
          },
        },
        member.user_id,
        {
          copywritingMode: 'ai',
          voiceEnabled: true,
        }
      );

      await unipile.client.post('/comments', {
        account_id: member.linkedin_accounts.unipile_account_id,
        post_id: postId,
        text: comment,
      });
    } else if (job.name === 'engage-repost') {
      // Instant repost (NOT "repost with thoughts")
      await unipile.client.post('/posts/repost', {
        account_id: member.linkedin_accounts.unipile_account_id,
        post_id: postId,
      });
    }

    // Update activity status
    await supabase
      .from('pod_activities')
      .update({
        status: 'completed',
        executed_at: new Date().toISOString(),
      })
      .eq('post_id', postId)
      .eq('member_id', memberId)
      .eq('engagement_type', job.name.replace('engage-', ''));

    return { success: true };
  },
  {
    connection: redisConnection,
    concurrency: 10,
  }
);
```

**3. Hook Pod Engagement on Post Creation**

Create `lib/posts/post-service.ts`:

```typescript
import { createClient } from '@/lib/supabase/server';
import { getUnipileClient } from '@/lib/unipile/client';
import { podService } from '@/lib/pods/pod-service';

export class PostService {
  private supabase = createClient();
  private unipile = getUnipileClient();

  async publishPost(postId: string): Promise<void> {
    // Get post details
    const { data: post } = await this.supabase
      .from('posts')
      .select('*, linkedin_accounts(*), campaigns(*, pod_members(*))')
      .eq('id', postId)
      .single();

    // Publish to LinkedIn
    const result = await this.unipile.createPost({
      account_id: post.linkedin_accounts.unipile_account_id,
      text: post.content,
    });

    // Update post with Unipile ID and status
    await this.supabase
      .from('posts')
      .update({
        unipile_post_id: result.id,
        post_url: result.url,
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .eq('id', postId);

    // Trigger pod engagement if member is in a pod
    if (post.campaigns.pod_members.length > 0) {
      const authorMember = post.campaigns.pod_members[0];
      await podService.triggerPodEngagement(postId, authorMember.id);
    }
  }
}

export const postService = new PostService();
```

**Validation:**
- [ ] ALL pod members (8+) engage with posts
- [ ] Likes within 30 min
- [ ] Comments within 1-3 hours
- [ ] Instant reposts (5-60 min)
- [ ] Activities tracked in database
- [ ] No rotation - 100% participation

**Dependencies:** Task 3.1, 2.4

**Files Created:**
- `lib/pods/pod-service.ts`
- `lib/queue/workers/pod-worker.ts`
- `lib/posts/post-service.ts`

---

## Success Criteria

### Epic 1 (bolt-scaffold) Complete When:
- [ ] ONE unified Next.js 14 app running
- [ ] All routes accessible (/admin, /dashboard, /api)
- [ ] Supabase database with all tables
- [ ] Authentication working with RLS
- [ ] BullMQ queues operational
- [ ] Environment configured for all services

### Epic 2 (cartridge-system) Complete When:
- [ ] Copywriting skill generates posts, DMs, comments
- [ ] Voice cartridge 4-tier hierarchy working
- [ ] Full pipeline: Copywriting → Voice → Output
- [ ] All 3 execution modes (AI/Human/Scheduled)
- [ ] Voice auto-generation from posts
- [ ] Skills tracked in database

### Epic 3 (lead-automation) Complete When:
- [ ] Unipile client working for all operations
- [ ] Comment polling every 15-30 min
- [ ] 3-step DM sequence complete
- [ ] Email extraction working
- [ ] Webhook delivery to ESPs
- [ ] Engagement pods: EVERYONE engages
- [ ] Complete 7-step lead flow operational

---

## Testing Strategy

### Unit Tests
- Copywriting skill generation
- Voice cartridge transformation
- Email extraction regex + GPT
- Webhook payload construction
- Rate limiting logic

### Integration Tests
- Unipile API operations
- Supabase RLS policies
- BullMQ job processing
- Full content pipeline

### E2E Tests
- Complete lead flow (post → lead → delivery)
- Pod engagement automation
- Webhook delivery + retry
- Multi-tenant isolation

---

## Deployment Plan

### Phase 1: Staging Deployment
1. Deploy to Render (backend + workers)
2. Deploy to Netlify (frontend)
3. Run smoke tests
4. Test with 1-2 test accounts

### Phase 2: Production Rollout
1. Deploy database migrations
2. Deploy application
3. Monitor error rates
4. Gradual rollout to users

---

## Technical Debt & Future Improvements

### Known Limitations
- Comment polling delay (15-30 min) - acceptable for MVP
- No email sending (relying on ESP) - by design
- Rate limits per account - LinkedIn constraint

### V2 Features (Post-MVP)
- Playwright browser automation for resharing
- Advanced pod coordination
- Email sequences after webhook
- Apollo.io integration
- Enhanced analytics and reporting

---

## Monitoring & Alerting

### Key Metrics to Track
- Lead velocity (leads/day)
- Content performance (engagement rates)
- System health (API errors, queue depth)
- Pod efficiency (participation rate)
- Webhook success rate

### Alerting Triggers
- Failed webhook deliveries > 3
- Comment polling failures > 3 consecutive
- DM rate limit approaching
- Low pod participation (<80%)

---

## Risk Mitigation

### Technical Risks
1. **Unipile API changes** - Monitor API docs, maintain fallback
2. **Rate limiting** - Implement strict tracking, alerts before limits
3. **Email extraction failure** - GPT-4 fallback + clarification DMs
4. **Webhook failures** - Retry logic + backup DM ensures delivery

### Business Risks
1. **LinkedIn ToS** - Stay within rate limits, natural delays
2. **Deliverability** - Client's ESP handles, not our responsibility
3. **Data loss** - Supabase backups, lead data never deleted

---

## Resource Requirements

### Development
- 3 implementation sessions (bolt, cartridge, automation)
- 2-3 testing/refinement sessions
- 1 deployment session

### Infrastructure
- Supabase (database): $25/month
- Upstash Redis (queues): $10/month
- Unipile (LinkedIn): $5.50/account/month
- Mem0 (memory): $20/month
- OpenAI (GPT-4): Variable usage
- Render (backend): $7/month
- Netlify (frontend): Free tier

**Total:** ~$70/month + OpenAI usage

---

## Timeline Estimate

**Epic 1 (bolt-scaffold):** 2 sessions (10-15 hours)
**Epic 2 (cartridge-system):** 2 sessions (10-15 hours)
**Epic 3 (lead-automation):** 3 sessions (15-20 hours)

**Total MVP:** 7 sessions (~35-50 hours)

---

## Conclusion

This implementation plan provides a complete roadmap for building Bravo revOS MVP across 3 branches:

1. **bolt-scaffold** - ONE unified Next.js 14 app with all infrastructure
2. **cartridge-system** - AI content pipeline with voice personalization
3. **lead-automation** - Complete 7-step lead flow via Unipile

Each task includes detailed implementation steps, code examples, validation criteria, and dependencies. The plan respects all critical constraints:

- ONE application (not three)
- ALL LinkedIn via Unipile (never direct)
- MANDATORY voice filter on all content
- EVERYONE in pods engages (no rotation)
- Comment polling (no webhooks)
- Webhook to ESP (we don't send emails)

**Ready for execution with `/execute-plan PRPs/bravo-revos-mvp-implementation-plan.md`**

---

**Document Version:** 1.0.0
**Created:** November 3, 2025
**Status:** Ready for Review and Execution
