# DM Sequences Migration - Multiple Versions for Testing

## 🎯 Run Diagnostics First!
**Before trying these, run the tests in SQL_DIAGNOSTICS.md to identify the exact issue.**

---

## Version A: No Comments, Named Dollar Quotes

```sql
CREATE TABLE IF NOT EXISTS dm_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  step1_template TEXT NOT NULL,
  step1_delay_min INTEGER NOT NULL DEFAULT 2,
  step1_delay_max INTEGER NOT NULL DEFAULT 15,
  voice_cartridge_id UUID REFERENCES cartridges(id),
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

DO $body$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_dm_sequences_campaign') THEN
    CREATE INDEX idx_dm_sequences_campaign ON dm_sequences(campaign_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_dm_sequences_client') THEN
    CREATE INDEX idx_dm_sequences_client ON dm_sequences(client_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_dm_sequences_status') THEN
    CREATE INDEX idx_dm_sequences_status ON dm_sequences(status);
  END IF;
END $body$;

ALTER TABLE dm_sequences ENABLE ROW LEVEL SECURITY;

DO $policy$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'dm_sequences' AND policyname = 'dm_sequences_client_isolation'
  ) THEN
    CREATE POLICY dm_sequences_client_isolation ON dm_sequences
      FOR ALL USING (client_id = (SELECT client_id FROM users WHERE id = auth.uid()));
  END IF;
END $policy$;

DROP TRIGGER IF EXISTS dm_sequences_updated_at ON dm_sequences;
CREATE TRIGGER dm_sequences_updated_at
  BEFORE UPDATE ON dm_sequences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Version B: No DO Blocks, Direct Creation

```sql
CREATE TABLE IF NOT EXISTS dm_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  step1_template TEXT NOT NULL,
  step1_delay_min INTEGER NOT NULL DEFAULT 2,
  step1_delay_max INTEGER NOT NULL DEFAULT 15,
  voice_cartridge_id UUID REFERENCES cartridges(id),
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

CREATE INDEX IF NOT EXISTS idx_dm_sequences_campaign ON dm_sequences(campaign_id);
CREATE INDEX IF NOT EXISTS idx_dm_sequences_client ON dm_sequences(client_id);
CREATE INDEX IF NOT EXISTS idx_dm_sequences_status ON dm_sequences(status);

ALTER TABLE dm_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dm_sequences_client_isolation ON dm_sequences;
CREATE POLICY dm_sequences_client_isolation ON dm_sequences
  FOR ALL USING (client_id = (SELECT client_id FROM users WHERE id = auth.uid()));

DROP TRIGGER IF EXISTS dm_sequences_updated_at ON dm_sequences;
CREATE TRIGGER dm_sequences_updated_at
  BEFORE UPDATE ON dm_sequences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Version C: Multi-line Comments, Simplified Strings

```sql
/*
  Migration: Create DM Sequences Table
  Project: Bravo revOS
  Purpose: Store automated DM sequence configurations
  NOTE: Assumes uuid-ossp extension and update_updated_at_column function already exist
*/

CREATE TABLE IF NOT EXISTS dm_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  step1_template TEXT NOT NULL,
  step1_delay_min INTEGER NOT NULL DEFAULT 2,
  step1_delay_max INTEGER NOT NULL DEFAULT 15,
  voice_cartridge_id UUID REFERENCES cartridges(id),
  step2_auto_extract BOOLEAN NOT NULL DEFAULT true,
  step2_confirmation_template TEXT NOT NULL,
  step3_enabled BOOLEAN NOT NULL DEFAULT true,
  step3_delay INTEGER NOT NULL DEFAULT 5,
  step3_template TEXT NOT NULL,
  step3_link_expiry INTEGER NOT NULL DEFAULT 24,
  sent_count INTEGER NOT NULL DEFAULT 0,
  replied_count INTEGER NOT NULL DEFAULT 0,
  email_captured_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dm_sequences_campaign ON dm_sequences(campaign_id);
CREATE INDEX IF NOT EXISTS idx_dm_sequences_client ON dm_sequences(client_id);
CREATE INDEX IF NOT EXISTS idx_dm_sequences_status ON dm_sequences(status);

ALTER TABLE dm_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dm_sequences_client_isolation ON dm_sequences;
CREATE POLICY dm_sequences_client_isolation ON dm_sequences
  FOR ALL USING (client_id = (SELECT client_id FROM users WHERE id = auth.uid()));

DROP TRIGGER IF EXISTS dm_sequences_updated_at ON dm_sequences;
CREATE TRIGGER dm_sequences_updated_at
  BEFORE UPDATE ON dm_sequences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Note**: This version removes the complex default strings - we'll set them in the application instead.

---

## 📋 Testing Protocol

1. ✅ **Run SQL_DIAGNOSTICS.md tests first** to identify the exact issue
2. ✅ Try **Version B** first (simplest, most compatible)
3. ✅ If Version B works, use it for dm_deliveries too
4. ✅ Report back which version worked

---

## dm_deliveries Table (Version B - Recommended)

```sql
CREATE TABLE IF NOT EXISTS dm_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id UUID NOT NULL REFERENCES dm_sequences(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
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
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT dm_deliveries_step_check CHECK (step_number >= 1 AND step_number <= 3)
);

CREATE INDEX IF NOT EXISTS idx_dm_deliveries_sequence ON dm_deliveries(sequence_id);
CREATE INDEX IF NOT EXISTS idx_dm_deliveries_lead ON dm_deliveries(lead_id);
CREATE INDEX IF NOT EXISTS idx_dm_deliveries_status ON dm_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_dm_deliveries_step ON dm_deliveries(step_number);
CREATE INDEX IF NOT EXISTS idx_dm_deliveries_sent_at ON dm_deliveries(sent_at);

ALTER TABLE dm_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dm_deliveries_client_isolation ON dm_deliveries;
CREATE POLICY dm_deliveries_client_isolation ON dm_deliveries
  FOR ALL USING (
    sequence_id IN (
      SELECT id FROM dm_sequences WHERE client_id = (
        SELECT client_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP TRIGGER IF EXISTS dm_deliveries_updated_at ON dm_deliveries;
CREATE TRIGGER dm_deliveries_updated_at
  BEFORE UPDATE ON dm_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Key changes from original:**
- ❌ No `--` single-line comments (potential corruption)
- ❌ No `DO $$` blocks (compatibility issues)
- ❌ No complex default strings (escaping issues)
- ✅ Uses `CREATE INDEX IF NOT EXISTS` (PostgreSQL 9.5+)
- ✅ Uses `DROP POLICY IF EXISTS` (cleaner than DO blocks)
- ✅ Simplified CHECK constraint (named, uses >= and <=)
