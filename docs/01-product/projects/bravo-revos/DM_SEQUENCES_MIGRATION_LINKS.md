# DM Sequences Migration - Supabase SQL Links

## Step 1: Check Prerequisites

First, let's verify which tables exist in your database:

**[→ Click to run diagnostic query](https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp/sql)**

```sql
-- Check which required tables exist
SELECT
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaigns') AS campaigns_exists,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') AS clients_exists,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cartridges') AS cartridges_exists,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') AS users_exists,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads') AS leads_exists;
```

Copy the SQL above and paste it into the Supabase SQL editor that opens when you click the link.

---

## Step 2: Create dm_sequences table (WITHOUT foreign keys first)

**[→ Click to open Supabase SQL Editor](https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp/sql/new)**

Copy and paste this SQL:

```sql
-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create update_updated_at_column function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- DM Sequences Table (NO foreign keys yet)
CREATE TABLE IF NOT EXISTS dm_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL,
  client_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  step1_template TEXT NOT NULL,
  step1_delay_min INTEGER NOT NULL DEFAULT 2,
  step1_delay_max INTEGER NOT NULL DEFAULT 15,
  voice_cartridge_id UUID,
  step2_auto_extract BOOLEAN NOT NULL DEFAULT true,
  step2_confirmation_template TEXT NOT NULL DEFAULT 'Got it! Sending your lead magnet now...',
  step3_enabled BOOLEAN NOT NULL DEFAULT true,
  step3_delay INTEGER NOT NULL DEFAULT 5,
  step3_template TEXT NOT NULL DEFAULT 'Here''s your direct download link: {{download_url}}',
  step3_link_expiry INTEGER NOT NULL DEFAULT 24,
  sent_count INTEGER NOT NULL DEFAULT 0,
  replied_count INTEGER NOT NULL DEFAULT 0,
  email_captured_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_dm_sequences_campaign ON dm_sequences(campaign_id);
CREATE INDEX idx_dm_sequences_client ON dm_sequences(client_id);
CREATE INDEX idx_dm_sequences_status ON dm_sequences(status);

-- RLS Policies
ALTER TABLE dm_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY dm_sequences_client_isolation ON dm_sequences
  FOR ALL
  USING (client_id = (SELECT client_id FROM users WHERE id = auth.uid()));

-- Updated_at trigger
CREATE TRIGGER dm_sequences_updated_at
  BEFORE UPDATE ON dm_sequences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Step 3: Add foreign keys (ONLY if campaigns/clients/cartridges tables exist)

**[→ Click to open Supabase SQL Editor](https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp/sql/new)**

```sql
-- Add foreign key constraints
ALTER TABLE dm_sequences
  ADD CONSTRAINT fk_dm_sequences_campaign
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;

ALTER TABLE dm_sequences
  ADD CONSTRAINT fk_dm_sequences_client
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

ALTER TABLE dm_sequences
  ADD CONSTRAINT fk_dm_sequences_cartridge
  FOREIGN KEY (voice_cartridge_id) REFERENCES cartridges(id) ON DELETE SET NULL;
```

**Skip this step if campaigns/clients/cartridges tables don't exist yet.**

---

## Step 4: Create dm_deliveries table

**[→ Click to open Supabase SQL Editor](https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp/sql/new)**

```sql
-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- DM Deliveries Table
CREATE TABLE IF NOT EXISTS dm_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id UUID NOT NULL REFERENCES dm_sequences(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL CHECK (step_number IN (1, 2, 3)),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  replied_at TIMESTAMP WITH TIME ZONE,
  message_content TEXT NOT NULL,
  unipile_message_id VARCHAR(255),
  email_extracted VARCHAR(255),
  extraction_confidence FLOAT,
  extraction_method VARCHAR(50),
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_retry_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_dm_deliveries_sequence ON dm_deliveries(sequence_id);
CREATE INDEX idx_dm_deliveries_lead ON dm_deliveries(lead_id);
CREATE INDEX idx_dm_deliveries_status ON dm_deliveries(status);
CREATE INDEX idx_dm_deliveries_step ON dm_deliveries(step_number);
CREATE INDEX idx_dm_deliveries_sent_at ON dm_deliveries(sent_at);

-- RLS Policies
ALTER TABLE dm_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY dm_deliveries_client_isolation ON dm_deliveries
  FOR ALL
  USING (
    sequence_id IN (
      SELECT id FROM dm_sequences WHERE client_id = (
        SELECT client_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Updated_at trigger
CREATE TRIGGER dm_deliveries_updated_at
  BEFORE UPDATE ON dm_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Troubleshooting

If you're still getting "syntax error at or near TEXT", it likely means:

1. **Foreign key tables don't exist** - Use Step 2 (without foreign keys) instead
2. **There's a character encoding issue** - Try the simplified version below

### Minimal Test Version

**[→ Click to open Supabase SQL Editor](https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp/sql/new)**

```sql
-- Super simple test
CREATE TABLE IF NOT EXISTS dm_sequences_test (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  template_field TEXT NOT NULL
);
```

If this works, then we know the issue is with the foreign keys or complexity.
