# Bravo revOS MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build LinkedIn lead generation system with AI-powered content, automated DM sequences, and lead magnet delivery via webhooks.

**Architecture:** ONE Next.js 14 application with role-based routing (/admin for agencies, /dashboard for clients), Supabase PostgreSQL with RLS for multi-tenancy, BullMQ + Unipile for LinkedIn automation, GPT-4o for copywriting → voice transformation pipeline.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Supabase, BullMQ, Upstash Redis, Unipile API, OpenAI GPT-4o, Mem0

**Branches (Epics):**
1. `bolt-scaffold` - Complete Next.js 14 app foundation
2. `cartridge-system` - AI content pipeline (copywriting + voice)
3. `lead-automation` - LinkedIn integration + 7-step lead flow

---

## Epic 1: bolt-scaffold Branch

**Branch:** `bolt-scaffold`
**Goal:** ONE complete Next.js 14 application with all routes, database schema, and UI components
**Points:** 15

**CRITICAL:** This is ONE application, not three separate projects. Single Bolt.new session creates everything.

### Task 1: Generate Complete Next.js App in Bolt.new (15 points)

**Files:**
- User will create via Bolt.new and push to GitHub
- ONE unified application structure

**Bolt.new Prompt (Complete):**

```
Create a Next.js 14 LinkedIn lead generation SaaS app with the following COMPLETE structure:

═══════════════════════════════════════════════════════════════════
CRITICAL: This is ONE APPLICATION with role-based routing, not separate apps
═══════════════════════════════════════════════════════════════════

APP STRUCTURE:
/ (landing page - public)
├── /admin/* (agency administrators)
│   ├── /admin/dashboard - System metrics, client overview
│   ├── /admin/clients - Manage all clients (CRUD)
│   ├── /admin/campaigns - View all campaigns across clients
│   ├── /admin/linkedin - LinkedIn account health monitoring
│   ├── /admin/webhooks - Webhook delivery analytics
│   └── /admin/pods - Engagement pod management (min 9 members each)
├── /dashboard/* (client users)
│   ├── /dashboard - Campaign metrics, lead counts, conversion funnel
│   ├── /dashboard/campaigns/new - Campaign creation wizard
│   ├── /dashboard/campaigns/[id] - Campaign details, lead list
│   ├── /dashboard/leads - Export leads as CSV
│   └── /dashboard/settings/* - Webhooks, voice cartridge, LinkedIn
└── /api/* (backend endpoints)
    ├── /api/campaigns - CRUD operations
    ├── /api/leads - Lead management
    ├── /api/linkedin - Unipile integration
    ├── /api/webhooks - Test and delivery
    └── /api/queue - BullMQ job management

═══════════════════════════════════════════════════════════════════
DATABASE SCHEMA (Supabase PostgreSQL)
═══════════════════════════════════════════════════════════════════

MULTI-TENANT HIERARCHY (agencies → clients → users):

CREATE TABLE agencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  subscription_tier TEXT DEFAULT 'starter',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company_name TEXT,
  industry TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agency_id, name)
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT CHECK (role IN ('admin', 'manager', 'member')) DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CAMPAIGN TABLES:

CREATE TABLE lead_magnets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL, -- Supabase Storage path
  file_size INTEGER,
  file_type TEXT,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  lead_magnet_id UUID REFERENCES lead_magnets(id),
  trigger_word TEXT NOT NULL,
  dm_template_step1 TEXT,
  dm_template_step2 TEXT,
  dm_template_step3 TEXT,
  webhook_config_id UUID REFERENCES webhook_configs(id),
  settings JSONB DEFAULT '{}',
  status TEXT CHECK (status IN ('draft', 'active', 'paused')) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, name)
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
    'dm_replied',
    'email_captured',
    'webhook_sent',
    'backup_sent',
    'completed'
  )) DEFAULT 'comment_detected',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, linkedin_id)
);

LINKEDIN INTEGRATION:

CREATE TABLE linkedin_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL,
  linkedin_email TEXT NOT NULL, -- Will be encrypted
  linkedin_password TEXT NOT NULL, -- Will be encrypted
  unipile_account_id TEXT UNIQUE,
  unipile_session JSONB, -- Will be encrypted
  session_expires_at TIMESTAMPTZ,
  daily_dm_count INTEGER DEFAULT 0,
  daily_post_count INTEGER DEFAULT 0,
  rate_limit_reset_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, account_name)
);

CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  linkedin_account_id UUID REFERENCES linkedin_accounts(id),
  unipile_post_id TEXT UNIQUE,
  post_url TEXT,
  content TEXT NOT NULL,
  trigger_word TEXT,
  status TEXT CHECK (status IN ('draft', 'scheduled', 'published', 'failed')) DEFAULT 'draft',
  scheduled_for TIMESTAMPTZ,
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
  dm_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE dm_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id),

  -- Step 1: Request email
  step1_scheduled_for TIMESTAMPTZ,
  step1_sent_at TIMESTAMPTZ,
  step1_message TEXT,
  step1_unipile_message_id TEXT,

  -- Step 2: Confirmation
  step2_sent_at TIMESTAMPTZ,
  step2_message TEXT,
  email_extracted TEXT,
  email_extracted_at TIMESTAMPTZ,

  -- Step 3: Backup with link
  step3_scheduled_for TIMESTAMPTZ,
  step3_sent_at TIMESTAMPTZ,
  step3_message TEXT,
  download_url TEXT,
  download_url_expires_at TIMESTAMPTZ,

  status TEXT CHECK (status IN ('in_progress', 'completed', 'failed')) DEFAULT 'in_progress',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

WEBHOOK DELIVERY:

CREATE TABLE webhook_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT, -- For HMAC signing, will be encrypted
  headers JSONB DEFAULT '{}',
  esp_type TEXT, -- 'zapier', 'make', 'convertkit', 'custom'
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
  attempt_count INTEGER DEFAULT 1,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ENGAGEMENT PODS:

CREATE TABLE pods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  min_members INTEGER DEFAULT 9,
  auto_engage BOOLEAN DEFAULT true,
  engagement_window_minutes INTEGER DEFAULT 30,
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
  post_url TEXT NOT NULL,
  engagement_type TEXT CHECK (engagement_type IN ('like', 'comment', 'repost')),
  member_id UUID REFERENCES pod_members(id),
  scheduled_for TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CARTRIDGE SYSTEM (voice + knowledge):

CREATE TABLE cartridges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  tier TEXT CHECK (tier IN ('system', 'workspace', 'user', 'skill')) NOT NULL,
  name TEXT NOT NULL,

  voice JSONB DEFAULT '{}', -- tone, style, personality, vocabulary
  knowledge JSONB DEFAULT '{}', -- industry, expertise, values

  auto_generate BOOLEAN DEFAULT false,
  source_posts_count INTEGER,
  parent_cartridge_id UUID REFERENCES cartridges(id),

  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE campaign_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL, -- 'copywriting', 'voice'
  execution_mode TEXT CHECK (execution_mode IN ('human', 'ai', 'scheduled')) DEFAULT 'ai',
  config JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, skill_name)
);

CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  mem0_memory_id TEXT UNIQUE,
  memory_type TEXT,
  content TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

RLS POLICIES (Row Level Security):

ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
-- (enable for all tables)

CREATE POLICY users_client_isolation ON users
  FOR ALL
  USING (client_id = auth.jwt() ->> 'client_id');

CREATE POLICY campaigns_client_isolation ON campaigns
  FOR ALL
  USING (client_id = auth.jwt() ->> 'client_id');

═══════════════════════════════════════════════════════════════════
UI COMPONENTS NEEDED
═══════════════════════════════════════════════════════════════════

Use shadcn/ui components throughout:
- Button, Input, Label, Textarea
- Card, Table, DataTable (tanstack-table)
- Dialog, Sheet, Tabs
- Form with react-hook-form + zod
- Toast notifications
- Charts (recharts)

ADMIN PORTAL (/admin):
- Client management table with CRUD
- System-wide analytics dashboard
- LinkedIn account health monitoring
- Webhook delivery logs
- Engagement pod management (min 9 members warning)

CLIENT DASHBOARD (/dashboard):
- Campaign wizard (6 steps):
  1. Upload lead magnet → Supabase Storage
  2. AI content creation or manual
  3. Trigger word input
  4. Webhook config (presets: Zapier, Make, ConvertKit, custom)
  5. DM sequence delays (step1: 2-15min, step3: 5min after step2)
  6. Review and launch
- Lead table with CSV export
- Conversion funnel visualization
- Real-time campaign metrics

SETTINGS PAGES:
- /dashboard/settings/webhooks - Test tool, delivery history
- /dashboard/settings/voice - Voice cartridge preview
- /dashboard/settings/linkedin - Connect accounts

═══════════════════════════════════════════════════════════════════
TECH STACK REQUIREMENTS
═══════════════════════════════════════════════════════════════════

Framework: Next.js 14 App Router
Language: TypeScript (strict mode)
Styling: Tailwind CSS
Components: shadcn/ui
Database: Supabase (PostgreSQL)
Storage: Supabase Storage
Auth: Supabase Auth
Queue: BullMQ + Upstash Redis
State: React Context + hooks
Forms: react-hook-form + zod
Tables: tanstack-table
Charts: recharts

ENVIRONMENT VARIABLES TEMPLATE:

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

UNIPILE_API_KEY=
OPENAI_API_KEY=
MEM0_API_KEY=

UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

NEXT_PUBLIC_APP_URL=http://localhost:3000

═══════════════════════════════════════════════════════════════════
PROJECT STRUCTURE
═══════════════════════════════════════════════════════════════════

app/
├── (auth)/
│   ├── login/
│   └── register/
├── admin/
│   ├── layout.tsx (role check)
│   ├── dashboard/page.tsx
│   ├── clients/page.tsx
│   ├── campaigns/page.tsx
│   ├── linkedin/page.tsx
│   ├── webhooks/page.tsx
│   └── pods/page.tsx
├── dashboard/
│   ├── layout.tsx (role check)
│   ├── page.tsx
│   ├── campaigns/
│   │   ├── new/page.tsx (wizard)
│   │   └── [id]/page.tsx
│   ├── leads/page.tsx
│   └── settings/
│       ├── webhooks/page.tsx
│       ├── voice/page.tsx
│       └── linkedin/page.tsx
├── api/
│   ├── campaigns/route.ts
│   ├── leads/route.ts
│   ├── linkedin/
│   │   ├── auth/route.ts
│   │   ├── posts/route.ts
│   │   └── comments/poll/route.ts
│   ├── webhooks/
│   │   ├── test/route.ts
│   │   └── deliver/route.ts
│   └── queue/
│       └── jobs/route.ts
├── layout.tsx
└── page.tsx (landing)

components/
├── ui/ (shadcn components)
├── admin/ (admin-specific)
├── dashboard/ (client-specific)
├── campaigns/
│   ├── campaign-wizard.tsx
│   ├── lead-table.tsx
│   └── metrics-card.tsx
└── shared/

lib/
├── supabase/
│   ├── client.ts
│   └── server.ts
├── unipile/
│   └── client.ts
├── queue/
│   ├── dm-queue.ts
│   ├── poll-queue.ts
│   └── webhook-queue.ts
├── skills/
│   ├── copywriting.ts
│   └── voice.ts
└── utils.ts

types/
└── database.ts (Supabase types)

═══════════════════════════════════════════════════════════════════

Generate complete working code with:
✅ All routes functional
✅ Database schema with migrations
✅ TypeScript types from database
✅ Role-based middleware
✅ Basic CRUD operations
✅ Supabase client setup
✅ Environment variable template
✅ README with setup instructions

Include placeholder comments for:
- Unipile API integration (to be implemented)
- BullMQ job processors (to be implemented)
- OpenAI skills (to be implemented)
- Mem0 integration (to be implemented)

Do NOT include actual API integrations yet - just scaffolding.
```

**User Action Required:**

Step 1: Open Bolt.new

Step 2: Paste the complete prompt above

Step 3: Wait for Bolt.new to generate the app (5-10 minutes)

Step 4: Test the generated app in Bolt.new preview

Step 5: Download or push to GitHub: `bravo-revos`

Step 6: Clone locally and verify structure:
```bash
git clone [your-repo] bravo-revos
cd bravo-revos
npm install
cp .env.example .env
# Edit .env with Supabase credentials
npm run dev
```

Step 7: Verify routes work:
- http://localhost:3000 (landing)
- http://localhost:3000/admin/dashboard (requires admin role)
- http://localhost:3000/dashboard (requires client role)

Step 8: Commit the scaffold:
```bash
git add .
git commit -m "feat: add complete Next.js 14 app scaffold from Bolt.new

- ONE unified app with role-based routing
- Admin portal (/admin/*) for agencies
- Client dashboard (/dashboard/*) for businesses
- Complete Supabase schema with RLS
- shadcn/ui components throughout
- Multi-tenant architecture (agencies → clients → users)
- Campaign, lead, webhook, pod tables
- Cartridge system for voice/knowledge
- TypeScript strict mode

Generated via Bolt.new with comprehensive prompt.
Placeholders for Unipile, BullMQ, OpenAI, Mem0."

git push origin bolt-scaffold
```

**Expected Output:**
- ✅ ONE working Next.js 14 app
- ✅ All routes accessible with proper role checks
- ✅ Database schema deployed to Supabase
- ✅ TypeScript types generated from schema
- ✅ Components render correctly
- ✅ Forms validate with zod
- ✅ No build errors
- ✅ No TypeScript errors

**Story Points:** 15 (User-driven Bolt.new generation)

---

## Epic 2: cartridge-system Branch

**Branch:** `cartridge-system`
**Goal:** AI content pipeline with copywriting → voice transformation
**Points:** 20

### Task 2: Set up voice cartridge database operations

**Files:**
- Create: `lib/cartridge/db.ts`
- Test: `tests/lib/cartridge/db.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/lib/cartridge/db.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@/lib/supabase/server';
import { createCartridge, getCartridgesByTier } from '@/lib/cartridge/db';

describe('Cartridge Database Operations', () => {
  let supabase: any;
  let testClientId: string;

  beforeAll(async () => {
    supabase = createClient();
    // Create test client
    const { data } = await supabase
      .from('clients')
      .insert({ name: 'Test Client', agency_id: 'test-agency-id' })
      .select()
      .single();
    testClientId = data.id;
  });

  it('should create a workspace-tier cartridge', async () => {
    const cartridge = await createCartridge({
      client_id: testClientId,
      tier: 'workspace',
      name: 'Professional Voice',
      voice: {
        tone: 'professional',
        style: 'conversational',
        personality: ['confident', 'helpful'],
        vocabulary: 'professional'
      }
    });

    expect(cartridge.id).toBeDefined();
    expect(cartridge.tier).toBe('workspace');
    expect(cartridge.voice.tone).toBe('professional');
  });

  it('should retrieve cartridges by tier', async () => {
    const cartridges = await getCartridgesByTier(testClientId, 'workspace');
    expect(cartridges.length).toBeGreaterThan(0);
    expect(cartridges[0].tier).toBe('workspace');
  });

  afterAll(async () => {
    // Cleanup
    await supabase.from('clients').delete().eq('id', testClientId);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test tests/lib/cartridge/db.test.ts`

Expected: FAIL - "Cannot find module '@/lib/cartridge/db'"

**Step 3: Write minimal implementation**

```typescript
// lib/cartridge/db.ts
import { createClient } from '@/lib/supabase/server';

export interface CartridgeVoice {
  tone: 'professional' | 'casual' | 'inspirational' | 'analytical';
  style: 'conversational' | 'authoritative' | 'storytelling';
  personality: string[];
  vocabulary: 'basic' | 'professional' | 'technical';
  sentenceStructure?: 'simple' | 'complex' | 'varied';
  phrases?: string[];
}

export interface CartridgeKnowledge {
  industry?: string;
  expertise?: string[];
  audience?: string;
  values?: string[];
}

export interface CreateCartridgeParams {
  client_id: string;
  user_id?: string;
  tier: 'system' | 'workspace' | 'user' | 'skill';
  name: string;
  description?: string;
  voice: CartridgeVoice;
  knowledge?: CartridgeKnowledge;
  parent_cartridge_id?: string;
}

export async function createCartridge(params: CreateCartridgeParams) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('cartridges')
    .insert({
      client_id: params.client_id,
      user_id: params.user_id,
      tier: params.tier,
      name: params.name,
      description: params.description,
      voice: params.voice,
      knowledge: params.knowledge || {},
      parent_cartridge_id: params.parent_cartridge_id,
      active: true
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getCartridgesByTier(
  clientId: string,
  tier: 'system' | 'workspace' | 'user' | 'skill'
) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('cartridges')
    .select('*')
    .eq('client_id', clientId)
    .eq('tier', tier)
    .eq('active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getCartridgeById(cartridgeId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('cartridges')
    .select('*')
    .eq('id', cartridgeId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateCartridge(
  cartridgeId: string,
  updates: Partial<CreateCartridgeParams>
) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('cartridges')
    .update(updates)
    .eq('id', cartridgeId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test tests/lib/cartridge/db.test.ts`

Expected: PASS (all tests green)

**Step 5: Commit**

```bash
git add lib/cartridge/db.ts tests/lib/cartridge/db.test.ts
git commit -m "feat(cartridge): add database operations for voice cartridges

- Create cartridge with voice/knowledge params
- Get cartridges by tier (system/workspace/user/skill)
- Get cartridge by ID
- Update cartridge
- Full test coverage"
```

---

### Task 3: Implement voice transformation engine

**Files:**
- Create: `lib/skills/voice.ts`
- Test: `tests/lib/skills/voice.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/lib/skills/voice.test.ts
import { describe, it, expect } from 'vitest';
import { VoiceCartridge } from '@/lib/skills/voice';

describe('Voice Cartridge Transformation', () => {
  it('should transform copy with professional voice', async () => {
    const voice = new VoiceCartridge({
      tone: 'professional',
      style: 'conversational',
      personality: ['confident', 'helpful'],
      vocabulary: 'professional'
    });

    const input = "Hey! Check out this awesome framework I built. It's super cool and you'll love it!";

    const output = await voice.transform(input);

    // Should be more professional
    expect(output.toLowerCase()).not.toContain('hey!');
    expect(output.toLowerCase()).not.toContain('super cool');
    expect(output).toContain('framework');
    expect(output.length).toBeGreaterThan(50);
  });

  it('should preserve CTAs when maintainCTA is true', async () => {
    const voice = new VoiceCartridge({
      tone: 'casual',
      style: 'conversational',
      personality: ['friendly'],
      vocabulary: 'basic'
    });

    const input = "This is content. What's the best email to send it to?";

    const output = await voice.transform(input, {
      maintainCTA: true,
      preserveKeywords: ['email']
    });

    expect(output.toLowerCase()).toContain('email');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test tests/lib/skills/voice.test.ts`

Expected: FAIL - "Cannot find module '@/lib/skills/voice'"

**Step 3: Write minimal implementation**

```typescript
// lib/skills/voice.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export interface VoiceParams {
  tone: 'professional' | 'casual' | 'inspirational' | 'analytical';
  style: 'conversational' | 'authoritative' | 'storytelling';
  personality: string[];
  vocabulary: 'basic' | 'professional' | 'technical';
  sentenceStructure?: 'simple' | 'complex' | 'varied';
  phrases?: string[];
}

export interface TransformOptions {
  maintainCTA?: boolean;
  preserveKeywords?: string[];
  maxLength?: number;
}

export class VoiceCartridge {
  constructor(private voiceParams: VoiceParams) {}

  async transform(content: string, options: TransformOptions = {}): Promise<string> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(content, options);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: options.maxLength || 500
    });

    return completion.choices[0].message.content || content;
  }

  private buildSystemPrompt(): string {
    const { tone, style, personality, vocabulary, phrases } = this.voiceParams;

    let prompt = `You are a voice transformation engine. Transform the given content to match this voice profile:

TONE: ${tone}
- ${this.getToneGuidelines(tone)}

STYLE: ${style}
- ${this.getStyleGuidelines(style)}

PERSONALITY: ${personality.join(', ')}
VOCABULARY LEVEL: ${vocabulary}
`;

    if (phrases && phrases.length > 0) {
      prompt += `\nSIGNATURE PHRASES (use naturally when appropriate):
${phrases.map(p => `- "${p}"`).join('\n')}
`;
    }

    prompt += `\nRULES:
1. Maintain the core message and intent
2. Transform tone, style, and vocabulary to match profile
3. Do not add new information
4. Keep approximately the same length
5. Output ONLY the transformed content, no explanations`;

    return prompt;
  }

  private buildUserPrompt(content: string, options: TransformOptions): string {
    let prompt = `Transform this content:\n\n${content}`;

    if (options.maintainCTA) {
      prompt += '\n\nIMPORTANT: Keep any call-to-action (CTA) or questions at the end intact.';
    }

    if (options.preserveKeywords && options.preserveKeywords.length > 0) {
      prompt += `\n\nMust include these keywords: ${options.preserveKeywords.join(', ')}`;
    }

    return prompt;
  }

  private getToneGuidelines(tone: string): string {
    const guidelines = {
      professional: 'Business-appropriate, polished, credible. Avoid slang, emojis, or overly casual language.',
      casual: 'Friendly and approachable. Use conversational language, contractions okay. Natural and relaxed.',
      inspirational: 'Uplifting and motivational. Focus on possibilities and transformation. Energetic but not aggressive.',
      analytical: 'Logical and data-driven. Precise language, facts and evidence. Measured and objective.'
    };
    return guidelines[tone as keyof typeof guidelines] || guidelines.professional;
  }

  private getStyleGuidelines(style: string): string {
    const guidelines = {
      conversational: 'Write as if speaking directly to the reader. Use "you" and "I". Natural flow.',
      authoritative: 'Confident and commanding. Expert positioning. Clear statements without hedging.',
      storytelling: 'Narrative structure. Use examples, anecdotes, and vivid details. Engaging flow.'
    };
    return guidelines[style as keyof typeof guidelines] || guidelines.conversational;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test tests/lib/skills/voice.test.ts`

Expected: PASS (transformation works correctly)

**Step 5: Commit**

```bash
git add lib/skills/voice.ts tests/lib/skills/voice.test.ts
git commit -m "feat(skills): implement voice cartridge transformation

- GPT-4o-powered voice transformation
- Tone: professional/casual/inspirational/analytical
- Style: conversational/authoritative/storytelling
- Preserve CTAs and keywords
- Signature phrases support
- Full test coverage"
```

---

### Task 4: Implement copywriting skill

**Files:**
- Create: `lib/skills/copywriting.ts`
- Test: `tests/lib/skills/copywriting.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/lib/skills/copywriting.test.ts
import { describe, it, expect } from 'vitest';
import { CopywritingSkill, type GenerateParams } from '@/lib/skills/copywriting';

describe('Copywriting Skill', () => {
  const skill = new CopywritingSkill();

  it('should generate LinkedIn post with AIDA framework', async () => {
    const params: GenerateParams = {
      contentType: 'linkedin_post',
      objective: 'Generate leads for leadership framework',
      framework: 'AIDA',
      leadMagnet: {
        title: '10x Leadership Framework',
        description: 'Scale teams from 10 to 100+ employees',
        valueProposition: 'Proven system used by 500+ CEOs'
      },
      context: {
        triggerWord: 'SCALE',
        targetAudience: 'CEOs and founders'
      }
    };

    const result = await skill.generate(params);

    expect(result.hook).toBeDefined();
    expect(result.body).toBeDefined();
    expect(result.cta).toBeDefined();
    expect(result.metadata.framework).toBe('AIDA');
    expect(result.body.toLowerCase()).toContain('scale');
  });

  it('should generate DM with PAS framework', async () => {
    const params: GenerateParams = {
      contentType: 'dm_message',
      objective: 'request_email',
      framework: 'PAS',
      leadMagnet: {
        title: '10x Leadership Framework',
        description: 'Scale teams efficiently',
        valueProposition: 'Transform your leadership'
      },
      context: {
        recipientName: 'John',
        triggerWord: 'SCALE'
      }
    };

    const result = await skill.generate(params);

    expect(result.hook).toContain('John');
    expect(result.cta.toLowerCase()).toContain('email');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test tests/lib/skills/copywriting.test.ts`

Expected: FAIL - module not found

**Step 3: Write minimal implementation**

```typescript
// lib/skills/copywriting.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export type ContentType = 'linkedin_post' | 'dm_message' | 'comment' | 'email_subject';
export type Framework = 'AIDA' | 'PAS' | 'BAB' | 'VALUE';

export interface GenerateParams {
  contentType: ContentType;
  objective: string;
  framework?: Framework;
  leadMagnet?: {
    title: string;
    description: string;
    valueProposition: string;
  };
  context?: Record<string, any>;
}

export interface GeneratedContent {
  headline?: string;
  hook: string;
  body: string;
  cta: string;
  metadata: {
    framework: Framework;
    readingLevel: number;
    emotionalTone: string;
  };
}

export class CopywritingSkill {
  async generate(params: GenerateParams): Promise<GeneratedContent> {
    const framework = params.framework || this.selectFramework(params.contentType);
    const systemPrompt = this.buildSystemPrompt(framework, params.contentType);
    const userPrompt = this.buildUserPrompt(params);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' }
    });

    const parsed = JSON.parse(completion.choices[0].message.content || '{}');

    return {
      headline: parsed.headline,
      hook: parsed.hook,
      body: parsed.body,
      cta: parsed.cta,
      metadata: {
        framework,
        readingLevel: 8,
        emotionalTone: parsed.emotionalTone || 'neutral'
      }
    };
  }

  private selectFramework(contentType: ContentType): Framework {
    const defaultFrameworks: Record<ContentType, Framework> = {
      linkedin_post: 'AIDA',
      dm_message: 'PAS',
      comment: 'VALUE',
      email_subject: 'AIDA'
    };
    return defaultFrameworks[contentType];
  }

  private buildSystemPrompt(framework: Framework, contentType: ContentType): string {
    const frameworkGuides = {
      AIDA: `AIDA Framework (Attention-Interest-Desire-Action):
1. ATTENTION: Pattern-interrupt headline or opening
2. INTEREST: Compelling problem or opportunity
3. DESIRE: Benefits and transformation
4. ACTION: Clear, specific call-to-action`,

      PAS: `PAS Framework (Problem-Agitate-Solution):
1. PROBLEM: Identify the pain point
2. AGITATE: Make them feel the problem
3. SOLUTION: Present your offer as the answer`,

      BAB: `BAB Framework (Before-After-Bridge):
1. BEFORE: Current problematic situation
2. AFTER: Desired future state
3. BRIDGE: How to get from before to after`,

      VALUE: `VALUE Framework (Validation-Authority-Logic-Urgency-Emotion):
1. VALIDATION: Acknowledge their experience
2. AUTHORITY: Establish credibility
3. LOGIC: Present rational reasons
4. URGENCY: Create time pressure
5. EMOTION: Appeal to feelings`
    };

    return `You are an expert copywriter specializing in conversion-optimized content.

FRAMEWORK: ${framework}
${frameworkGuides[framework]}

CONTENT TYPE: ${contentType}

REQUIREMENTS:
- Write compelling, benefit-focused copy
- Use proven copywriting frameworks
- Clear call-to-action
- Appropriate length for ${contentType}
- Professional yet engaging tone
- Focus on transformation and results

OUTPUT FORMAT (JSON):
{
  "headline": "Attention-grabbing headline (if applicable)",
  "hook": "Opening line that captures attention",
  "body": "Main message body",
  "cta": "Specific call-to-action",
  "emotionalTone": "primary emotion (curiosity/urgency/desire/etc)"
}`;
  }

  private buildUserPrompt(params: GenerateParams): string {
    let prompt = `Generate ${params.contentType} copy:\n\n`;
    prompt += `OBJECTIVE: ${params.objective}\n\n`;

    if (params.leadMagnet) {
      prompt += `LEAD MAGNET:
- Title: ${params.leadMagnet.title}
- Description: ${params.leadMagnet.description}
- Value: ${params.leadMagnet.valueProposition}\n\n`;
    }

    if (params.context) {
      prompt += `CONTEXT:\n`;
      Object.entries(params.context).forEach(([key, value]) => {
        prompt += `- ${key}: ${value}\n`;
      });
    }

    return prompt;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test tests/lib/skills/copywriting.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add lib/skills/copywriting.ts tests/lib/skills/copywriting.test.ts
git commit -m "feat(skills): implement copywriting skill with frameworks

- AIDA framework for LinkedIn posts
- PAS framework for DM messages
- BAB and VALUE frameworks
- GPT-4o powered generation
- JSON structured output
- Full test coverage"
```

---

### Task 5: Create two-stage content pipeline

**Files:**
- Create: `lib/pipeline/content.ts`
- Test: `tests/lib/pipeline/content.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/lib/pipeline/content.test.ts
import { describe, it, expect } from 'vitest';
import { ContentPipeline } from '@/lib/pipeline/content';

describe('Two-Stage Content Pipeline', () => {
  it('should transform content through copywriting → voice', async () => {
    const pipeline = new ContentPipeline();

    const result = await pipeline.generate({
      contentType: 'linkedin_post',
      objective: 'Generate leads',
      leadMagnet: {
        title: 'Leadership Guide',
        description: 'Scale your team',
        valueProposition: 'Proven system'
      },
      voice: {
        tone: 'professional',
        style: 'conversational',
        personality: ['confident'],
        vocabulary: 'professional'
      }
    });

    expect(result.rawCopy).toBeDefined();
    expect(result.transformed).toBeDefined();
    expect(result.metadata.stages).toEqual(['copywriting', 'voice']);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test tests/lib/pipeline/content.test.ts`

Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// lib/pipeline/content.ts
import { CopywritingSkill, type GenerateParams as CopyParams } from '@/lib/skills/copywriting';
import { VoiceCartridge, type VoiceParams, type TransformOptions } from '@/lib/skills/voice';

export interface PipelineParams extends CopyParams {
  voice: VoiceParams;
  transformOptions?: TransformOptions;
}

export interface PipelineResult {
  rawCopy: {
    headline?: string;
    hook: string;
    body: string;
    cta: string;
  };
  transformed: string;
  metadata: {
    stages: string[];
    framework: string;
    voice: VoiceParams;
  };
}

export class ContentPipeline {
  private copywriting: CopywritingSkill;

  constructor() {
    this.copywriting = new CopywritingSkill();
  }

  async generate(params: PipelineParams): Promise<PipelineResult> {
    // Stage 1: Copywriting Skill
    const rawCopy = await this.copywriting.generate(params);

    // Combine parts into full content
    const fullContent = this.combineContent(rawCopy);

    // Stage 2: Voice Cartridge
    const voiceCartridge = new VoiceCartridge(params.voice);
    const transformed = await voiceCartridge.transform(
      fullContent,
      params.transformOptions
    );

    return {
      rawCopy: {
        headline: rawCopy.headline,
        hook: rawCopy.hook,
        body: rawCopy.body,
        cta: rawCopy.cta
      },
      transformed,
      metadata: {
        stages: ['copywriting', 'voice'],
        framework: rawCopy.metadata.framework,
        voice: params.voice
      }
    };
  }

  private combineContent(copy: any): string {
    const parts = [];

    if (copy.headline) parts.push(copy.headline);
    parts.push(copy.hook);
    parts.push(copy.body);
    parts.push(copy.cta);

    return parts.join('\n\n');
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test tests/lib/pipeline/content.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add lib/pipeline/content.ts tests/lib/pipeline/content.test.ts
git commit -m "feat(pipeline): implement two-stage content pipeline

- Stage 1: Copywriting Skill (professional copy)
- Stage 2: Voice Cartridge (personalization)
- Mandatory voice filter for all content
- Full test coverage

PIPELINE FLOW:
Input → Copywriting → Voice → Output"
```

**Story Points:** 20 (Complete cartridge system with voice + copywriting)

---

## Epic 3: lead-automation Branch

**Branch:** `lead-automation`
**Goal:** LinkedIn integration + 7-step lead flow automation
**Points:** 65

### Task 6: Implement Unipile client wrapper

**Files:**
- Create: `lib/unipile/client.ts`
- Create: `lib/unipile/types.ts`
- Test: `tests/lib/unipile/client.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/lib/unipile/client.test.ts
import { describe, it, expect, vi } from 'vitest';
import { UnipileClient } from '@/lib/unipile/client';

describe('Unipile Client', () => {
  it('should authenticate LinkedIn account', async () => {
    const client = new UnipileClient(process.env.UNIPILE_API_KEY!);

    const result = await client.connectLinkedInAccount({
      email: 'test@example.com',
      password: 'password123'
    });

    expect(result.account_id).toBeDefined();
    expect(result.provider).toBe('LINKEDIN');
  });

  it('should create LinkedIn post', async () => {
    const client = new UnipileClient(process.env.UNIPILE_API_KEY!);

    const result = await client.createPost({
      accountId: 'test-account-id',
      content: 'Test post content'
    });

    expect(result.id).toBeDefined();
    expect(result.url).toBeDefined();
  });

  it('should poll comments on post', async () => {
    const client = new UnipileClient(process.env.UNIPILE_API_KEY!);

    const comments = await client.getPostComments({
      postId: 'test-post-id',
      since: new Date(Date.now() - 3600000) // 1 hour ago
    });

    expect(Array.isArray(comments)).toBe(true);
  });

  it('should send DM', async () => {
    const client = new UnipileClient(process.env.UNIPILE_API_KEY!);

    const result = await client.sendMessage({
      accountId: 'test-account-id',
      recipientId: 'test-recipient-id',
      message: 'Test message'
    });

    expect(result.id).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test tests/lib/unipile/client.test.ts`

Expected: FAIL - module not found

**Step 3: Write minimal implementation**

```typescript
// lib/unipile/types.ts
export interface UnipileAccount {
  account_id: string;
  provider: 'LINKEDIN';
  api_url: string;
  account_name: string;
  metadata: Record<string, any>;
}

export interface UnipilePost {
  id: string;
  url: string;
  text: string;
  created_at: string;
  metrics?: {
    likes: number;
    comments: number;
    reposts: number;
  };
}

export interface UnipileComment {
  id: string;
  post_id: string;
  author_id: string;
  author_name: string;
  text: string;
  created_at: string;
}

export interface UnipileMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  text: string;
  sent_at: string;
  delivered_at?: string;
  read_at?: string;
}

// lib/unipile/client.ts
import type {
  UnipileAccount,
  UnipilePost,
  UnipileComment,
  UnipileMessage
} from './types';

export class UnipileClient {
  private baseUrl = 'https://api.unipile.com/api/v1';

  constructor(private apiKey: string) {}

  async connectLinkedInAccount(params: {
    email: string;
    password: string;
  }): Promise<UnipileAccount> {
    const response = await fetch(`${this.baseUrl}/accounts`, {
      method: 'POST',
      headers: {
        'X-API-KEY': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        provider: 'LINKEDIN',
        username: params.email,
        password: params.password
      })
    });

    if (!response.ok) {
      throw new Error(`Unipile API error: ${response.statusText}`);
    }

    return response.json();
  }

  async createPost(params: {
    accountId: string;
    content: string;
    media?: string[];
  }): Promise<UnipilePost> {
    const response = await fetch(`${this.baseUrl}/posts`, {
      method: 'POST',
      headers: {
        'X-API-KEY': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        account_id: params.accountId,
        provider: 'LINKEDIN',
        text: params.content,
        attachments: params.media
      })
    });

    if (!response.ok) {
      throw new Error(`Unipile API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getPostComments(params: {
    postId: string;
    since?: Date;
  }): Promise<UnipileComment[]> {
    const url = new URL(`${this.baseUrl}/posts/${params.postId}/comments`);
    if (params.since) {
      url.searchParams.append('since', params.since.toISOString());
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-API-KEY': this.apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Unipile API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.items || [];
  }

  async sendMessage(params: {
    accountId: string;
    recipientId: string;
    message: string;
  }): Promise<UnipileMessage> {
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'X-API-KEY': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        account_id: params.accountId,
        attendees_ids: [params.recipientId],
        provider: 'LINKEDIN',
        text: params.message
      })
    });

    if (!response.ok) {
      throw new Error(`Unipile API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getConversationMessages(params: {
    accountId: string;
    conversationId: string;
  }): Promise<UnipileMessage[]> {
    const response = await fetch(
      `${this.baseUrl}/messages/${params.conversationId}`,
      {
        method: 'GET',
        headers: {
          'X-API-KEY': this.apiKey
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Unipile API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.items || [];
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test tests/lib/unipile/client.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add lib/unipile/ tests/lib/unipile/
git commit -m "feat(unipile): implement LinkedIn API client wrapper

- Connect LinkedIn accounts
- Create posts
- Poll comments (NO webhook available)
- Send DMs
- Get conversation messages
- Type-safe interfaces
- Full test coverage"
```

---

**Tasks 7-12: Additional Lead Automation Tasks (To Be Added)**

Epic 3 will include:
- Task 7: BullMQ job queues setup (comment polling, DM sending, webhook delivery)
- Task 8: Comment polling worker (every 15-30 minutes, trigger word detection)
- Task 9: 3-step DM sequence automation (Step 1: email request → Step 2: confirmation → Step 3: backup link)
- Task 10: Email extraction from DM replies (regex + GPT-4o fallback)
- Task 11: Webhook delivery system with retry logic
- Task 12: Engagement pod automation (EVERYONE engages with EVERYTHING)

**Reference Documents:**
- `COMPREHENSIVE-LEAD-FLOW.md` - Complete 7-step flow
- `THREE-STEP-DM-SEQUENCE.md` - DM automation details
- `WEBHOOK-SETTINGS-UI.md` - ESP integration specs

---

## Execution Options

**Plan complete and saved to `docs/plans/2025-11-03-bravo-revos-mvp.md`.**

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**