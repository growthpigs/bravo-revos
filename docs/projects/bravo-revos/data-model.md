# Bravo revOS - Data Model Specification

**Version:** 1.0.0
**Database:** Supabase (PostgreSQL)
**Last Updated:** November 3, 2025

## Overview

The Bravo revOS data model implements a multi-tenant SaaS architecture with strict data isolation via Row Level Security (RLS). The hierarchy flows from Agencies → Clients → Users, with all operations scoped to the appropriate tenant level.

---

## Core Schema

### Multi-Tenancy Tables

#### `agencies`
Top-level tenant container for white-label deployments.

```sql
CREATE TABLE agencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  subscription_tier TEXT DEFAULT 'starter',
  subscription_status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agencies_slug ON agencies(slug);
```

#### `clients`
Business accounts that belong to agencies.

```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company_name TEXT,
  industry TEXT,
  website TEXT,
  settings JSONB DEFAULT '{}',
  subscription_tier TEXT DEFAULT 'basic',
  subscription_status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(agency_id, name)
);

CREATE INDEX idx_clients_agency ON clients(agency_id);
```

#### `users`
Individual users within client organizations.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT CHECK (role IN ('admin', 'manager', 'member')) DEFAULT 'member',
  avatar_url TEXT,
  settings JSONB DEFAULT '{}',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_client ON users(client_id);
CREATE INDEX idx_users_email ON users(email);
```

---

## LinkedIn Integration Tables

#### `linkedin_accounts`
Stores encrypted LinkedIn credentials and session data.

```sql
CREATE TABLE linkedin_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL,
  linkedin_email TEXT NOT NULL ENCRYPTED,
  linkedin_password TEXT NOT NULL ENCRYPTED,
  unipile_account_id TEXT UNIQUE,
  unipile_session JSONB ENCRYPTED,
  session_expires_at TIMESTAMPTZ,
  profile_data JSONB,
  status TEXT CHECK (status IN ('active', 'expired', 'error')) DEFAULT 'active',
  last_sync_at TIMESTAMPTZ,
  rate_limit_reset_at TIMESTAMPTZ,
  daily_dm_count INTEGER DEFAULT 0,
  daily_post_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, account_name)
);

CREATE INDEX idx_linkedin_accounts_user ON linkedin_accounts(user_id);
CREATE INDEX idx_linkedin_accounts_status ON linkedin_accounts(status);
```

#### `posts`
LinkedIn posts created through the system.

```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  linkedin_account_id UUID REFERENCES linkedin_accounts(id),
  unipile_post_id TEXT UNIQUE,
  post_url TEXT,
  content TEXT NOT NULL,
  media_urls TEXT[],
  trigger_word TEXT,
  status TEXT CHECK (status IN ('draft', 'scheduled', 'published', 'failed')) DEFAULT 'draft',
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  metrics JSONB DEFAULT '{}', -- impressions, likes, comments, shares
  last_polled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_posts_campaign ON posts(campaign_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_scheduled ON posts(scheduled_for) WHERE scheduled_for IS NOT NULL;
```

#### `comments`
Comments on posts (detected via polling).

```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  unipile_comment_id TEXT UNIQUE,
  author_name TEXT NOT NULL,
  author_linkedin_id TEXT NOT NULL,
  author_profile_url TEXT,
  content TEXT NOT NULL,
  has_trigger_word BOOLEAN DEFAULT false,
  dm_sent BOOLEAN DEFAULT false,
  dm_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_trigger ON comments(has_trigger_word) WHERE has_trigger_word = true;
CREATE INDEX idx_comments_author ON comments(author_linkedin_id);
```

---

## Lead Management Tables

#### `campaigns`
Lead generation campaigns with magnet offers.

```sql
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
  webhook_config_id UUID REFERENCES webhook_configs(id),
  settings JSONB DEFAULT '{}', -- dmSequence, skills, voice, etc.
  status TEXT CHECK (status IN ('draft', 'active', 'paused', 'completed')) DEFAULT 'draft',
  metrics JSONB DEFAULT '{}',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(client_id, name)
);

CREATE INDEX idx_campaigns_client ON campaigns(client_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
```

#### `lead_magnets`
Uploaded files and resources offered as lead magnets.

```sql
CREATE TABLE lead_magnets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL, -- Supabase Storage path
  file_size INTEGER,
  file_type TEXT,
  thumbnail_url TEXT,
  download_count INTEGER DEFAULT 0,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lead_magnets_client ON lead_magnets(client_id);
CREATE INDEX idx_lead_magnets_tags ON lead_magnets USING GIN(tags);
```

#### `leads`
Captured lead information.

```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  linkedin_id TEXT NOT NULL,
  linkedin_url TEXT,
  company TEXT,
  title TEXT,
  source TEXT CHECK (source IN ('comment', 'dm', 'manual')) DEFAULT 'comment',
  status TEXT CHECK (status IN (
    'comment_detected',
    'dm_sent',
    'dm_replied',
    'email_captured',
    'webhook_sent',
    'backup_sent',
    'completed',
    'failed'
  )) DEFAULT 'comment_detected',
  comment_id UUID REFERENCES comments(id),
  dm_sequence_id UUID REFERENCES dm_sequences(id),
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(campaign_id, linkedin_id)
);

CREATE INDEX idx_leads_campaign ON leads(campaign_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_email ON leads(email) WHERE email IS NOT NULL;
```

---

## DM & Communication Tables

#### `dm_sequences`
Tracks the 3-step DM sequence for each lead.

```sql
CREATE TABLE dm_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id),

  -- Step 1: Initial email request
  step1_scheduled_for TIMESTAMPTZ,
  step1_sent_at TIMESTAMPTZ,
  step1_message TEXT,
  step1_unipile_message_id TEXT,
  step1_status TEXT,

  -- Step 2: Confirmation
  step2_sent_at TIMESTAMPTZ,
  step2_message TEXT,
  step2_unipile_message_id TEXT,
  email_extracted TEXT,
  email_extracted_at TIMESTAMPTZ,

  -- Step 3: Backup with link
  step3_scheduled_for TIMESTAMPTZ,
  step3_sent_at TIMESTAMPTZ,
  step3_message TEXT,
  step3_unipile_message_id TEXT,
  download_url TEXT,
  download_url_expires_at TIMESTAMPTZ,
  link_clicked BOOLEAN DEFAULT false,
  link_clicked_at TIMESTAMPTZ,

  -- Overall tracking
  status TEXT CHECK (status IN ('in_progress', 'completed', 'failed', 'abandoned')) DEFAULT 'in_progress',
  completed_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dm_sequences_lead ON dm_sequences(lead_id);
CREATE INDEX idx_dm_sequences_campaign ON dm_sequences(campaign_id);
CREATE INDEX idx_dm_sequences_status ON dm_sequences(status);
CREATE INDEX idx_dm_sequences_step3_scheduled ON dm_sequences(step3_scheduled_for)
  WHERE step3_scheduled_for IS NOT NULL AND step3_sent_at IS NULL;
```

#### `dm_messages`
Individual DM messages for tracking and analytics.

```sql
CREATE TABLE dm_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dm_sequence_id UUID REFERENCES dm_sequences(id) ON DELETE CASCADE,
  direction TEXT CHECK (direction IN ('outbound', 'inbound')),
  message TEXT NOT NULL,
  unipile_message_id TEXT UNIQUE,
  unipile_conversation_id TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dm_messages_sequence ON dm_messages(dm_sequence_id);
CREATE INDEX idx_dm_messages_conversation ON dm_messages(unipile_conversation_id);
```

---

## Webhook & Delivery Tables

#### `webhook_configs`
Client webhook endpoint configuration.

```sql
CREATE TABLE webhook_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT ENCRYPTED, -- For HMAC signing
  headers JSONB DEFAULT '{}',
  esp_type TEXT, -- 'zapier', 'make', 'convertkit', 'custom'
  retry_enabled BOOLEAN DEFAULT true,
  max_retries INTEGER DEFAULT 3,
  retry_delay_ms INTEGER DEFAULT 1000,
  timeout_ms INTEGER DEFAULT 30000,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(client_id, name)
);

CREATE INDEX idx_webhook_configs_client ON webhook_configs(client_id);
CREATE INDEX idx_webhook_configs_active ON webhook_configs(active);
```

#### `webhook_deliveries`
Log of all webhook delivery attempts.

```sql
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
  response_time_ms INTEGER,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ
);

CREATE INDEX idx_webhook_deliveries_config ON webhook_deliveries(webhook_config_id);
CREATE INDEX idx_webhook_deliveries_lead ON webhook_deliveries(lead_id);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX idx_webhook_deliveries_retry ON webhook_deliveries(next_retry_at)
  WHERE status = 'failed' AND next_retry_at IS NOT NULL;
```

---

## Engagement Pod Tables

#### `pods`
Engagement pod groups (minimum 9 members).

```sql
CREATE TABLE pods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  min_members INTEGER DEFAULT 9,
  auto_engage BOOLEAN DEFAULT true,
  engagement_window_minutes INTEGER DEFAULT 30, -- For likes
  comment_window_minutes INTEGER DEFAULT 180, -- For comments
  settings JSONB DEFAULT '{}',
  status TEXT CHECK (status IN ('active', 'paused')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(client_id, name)
);

CREATE INDEX idx_pods_client ON pods(client_id);
CREATE INDEX idx_pods_status ON pods(status);
```

#### `pod_members`
Members of engagement pods.

```sql
CREATE TABLE pod_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pod_id UUID REFERENCES pods(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  linkedin_account_id UUID REFERENCES linkedin_accounts(id),
  role TEXT CHECK (role IN ('owner', 'member')) DEFAULT 'member',
  participation_score DECIMAL(3,2) DEFAULT 1.00, -- 0.00 to 1.00
  total_engagements INTEGER DEFAULT 0,
  missed_engagements INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('active', 'paused', 'removed')) DEFAULT 'active',
  joined_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(pod_id, user_id)
);

CREATE INDEX idx_pod_members_pod ON pod_members(pod_id);
CREATE INDEX idx_pod_members_user ON pod_members(user_id);
CREATE INDEX idx_pod_members_status ON pod_members(status);
```

#### `pod_activities`
Tracks all pod engagement activities.

```sql
CREATE TABLE pod_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pod_id UUID REFERENCES pods(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id),
  post_url TEXT NOT NULL,
  post_author_id UUID REFERENCES pod_members(id),
  engagement_type TEXT CHECK (engagement_type IN ('like', 'comment', 'repost')),
  member_id UUID REFERENCES pod_members(id),
  scheduled_for TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'skipped')) DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pod_activities_pod ON pod_activities(pod_id);
CREATE INDEX idx_pod_activities_member ON pod_activities(member_id);
CREATE INDEX idx_pod_activities_scheduled ON pod_activities(scheduled_for)
  WHERE status = 'pending';
```

---

## AI & Skills Tables

#### `cartridges`
4-tier hierarchy for voice and knowledge management.

```sql
CREATE TABLE cartridges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  tier TEXT CHECK (tier IN ('system', 'workspace', 'user', 'skill')) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Voice parameters
  voice JSONB DEFAULT '{}', -- tone, style, personality, vocabulary, etc.

  -- Knowledge base
  knowledge JSONB DEFAULT '{}', -- industry, expertise, values

  -- Auto-generation settings
  auto_generate BOOLEAN DEFAULT false,
  source_posts_count INTEGER, -- Number of posts analyzed

  -- Inheritance
  parent_cartridge_id UUID REFERENCES cartridges(id),

  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cartridges_client ON cartridges(client_id);
CREATE INDEX idx_cartridges_user ON cartridges(user_id);
CREATE INDEX idx_cartridges_tier ON cartridges(tier);
CREATE INDEX idx_cartridges_parent ON cartridges(parent_cartridge_id);
```

#### `campaign_skills`
Skills configuration per campaign.

```sql
CREATE TABLE campaign_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL, -- 'copywriting', 'voice', 'deliverability', 'design'
  execution_mode TEXT CHECK (execution_mode IN ('human', 'ai', 'scheduled')) DEFAULT 'ai',
  schedule TIMESTAMPTZ, -- If mode is 'scheduled'
  config JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(campaign_id, skill_name)
);

CREATE INDEX idx_campaign_skills_campaign ON campaign_skills(campaign_id);
CREATE INDEX idx_campaign_skills_enabled ON campaign_skills(enabled);
```

#### `skill_executions`
Log of skill execution history.

```sql
CREATE TABLE skill_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id),
  skill_name TEXT NOT NULL,
  input_data JSONB,
  output_data JSONB,
  execution_time_ms INTEGER,
  tokens_used INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_skill_executions_campaign ON skill_executions(campaign_id);
CREATE INDEX idx_skill_executions_skill ON skill_executions(skill_name);
CREATE INDEX idx_skill_executions_created ON skill_executions(created_at DESC);
```

---

## Memory Tables

#### `memories`
Mem0 integration for persistent memory.

```sql
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  mem0_memory_id TEXT UNIQUE,
  memory_type TEXT, -- 'successful_post', 'conversion_pattern', etc.
  content TEXT,
  metadata JSONB DEFAULT '{}',
  embedding VECTOR(1536), -- PGVector for semantic search
  relevance_score DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_memories_user ON memories(user_id);
CREATE INDEX idx_memories_type ON memories(memory_type);
CREATE INDEX idx_memories_embedding ON memories USING ivfflat (embedding vector_cosine_ops);
```

---

## Queue & Job Tables

#### `queue_jobs`
BullMQ job tracking.

```sql
CREATE TABLE queue_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id TEXT UNIQUE NOT NULL, -- BullMQ job ID
  queue_name TEXT NOT NULL, -- 'dms', 'posts', 'webhooks', etc.
  job_type TEXT NOT NULL,
  payload JSONB,
  status TEXT CHECK (status IN ('pending', 'active', 'completed', 'failed', 'delayed')) DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,
  scheduled_for TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_queue_jobs_status ON queue_jobs(status);
CREATE INDEX idx_queue_jobs_queue ON queue_jobs(queue_name);
CREATE INDEX idx_queue_jobs_scheduled ON queue_jobs(scheduled_for) WHERE status = 'delayed';
```

---

## Row Level Security (RLS) Policies

### Enable RLS on all tables
```sql
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ... (enable for all tables)
```

### Example RLS Policies

```sql
-- Users can only see data from their client
CREATE POLICY users_client_isolation ON users
  FOR ALL
  USING (client_id = auth.jwt() ->> 'client_id');

-- Campaigns are isolated by client
CREATE POLICY campaigns_client_isolation ON campaigns
  FOR ALL
  USING (client_id = auth.jwt() ->> 'client_id');

-- Leads are accessible via campaign ownership
CREATE POLICY leads_campaign_access ON leads
  FOR ALL
  USING (
    campaign_id IN (
      SELECT id FROM campaigns
      WHERE client_id = auth.jwt() ->> 'client_id'
    )
  );
```

---

## Indexes for Performance

### Critical Query Patterns

```sql
-- Finding leads by campaign and status
CREATE INDEX idx_leads_campaign_status ON leads(campaign_id, status);

-- Finding pending DM sequences
CREATE INDEX idx_dm_sequences_pending ON dm_sequences(status, step1_scheduled_for)
  WHERE status = 'in_progress';

-- Pod activity scheduling
CREATE INDEX idx_pod_activities_execution ON pod_activities(status, scheduled_for)
  WHERE status = 'pending';

-- Webhook retry queue
CREATE INDEX idx_webhook_deliveries_retry_queue ON webhook_deliveries(status, next_retry_at)
  WHERE status = 'failed';
```

---

## Database Functions

### Automatic updated_at timestamps

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_agencies_updated_at BEFORE UPDATE ON agencies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ... (create for all tables)
```

### Daily rate limit reset

```sql
CREATE OR REPLACE FUNCTION reset_daily_limits()
RETURNS void AS $$
BEGIN
  UPDATE linkedin_accounts
  SET daily_dm_count = 0,
      daily_post_count = 0,
      rate_limit_reset_at = NOW() + INTERVAL '24 hours'
  WHERE rate_limit_reset_at < NOW();
END;
$$ language 'plpgsql';

-- Schedule via pg_cron or external scheduler
```

---

## Migration Strategy

### Initial Setup
```sql
-- 001_initial_schema.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create all tables
-- Create all indexes
-- Create all functions
-- Enable RLS
-- Create RLS policies
```

### Seed Data
```sql
-- 002_seed_data.sql
-- Insert default system cartridges
INSERT INTO cartridges (tier, name, description, voice, knowledge) VALUES
  ('system', 'Professional', 'Professional business voice', ...),
  ('system', 'Casual', 'Friendly casual voice', ...);
```

---

## Backup & Recovery

### Backup Strategy
- Supabase automatic daily backups
- Point-in-time recovery (7 days)
- Export critical tables to S3 weekly

### Data Retention
- Leads: Indefinite (client owns data)
- Logs: 90 days
- Queue jobs: 30 days after completion
- Webhook deliveries: 60 days

---

## Performance Considerations

### Expected Scale
- 1000+ campaigns active
- 10,000+ leads/day
- 100,000+ DMs/day across all accounts
- 1M+ pod activities/day

### Optimization Strategies
- Partition large tables by created_at (monthly)
- Archive completed campaigns
- Use materialized views for analytics
- Implement connection pooling

---

## Security Notes

### Encryption
- All sensitive fields use Supabase vault
- LinkedIn credentials double-encrypted
- Webhook secrets encrypted at rest

### Access Control
- RLS enforces tenant isolation
- API keys per client
- Audit logs for all mutations

---

**Document Version:** 1.0.0
**Last Updated:** November 3, 2025
**Database:** Supabase PostgreSQL with RLS