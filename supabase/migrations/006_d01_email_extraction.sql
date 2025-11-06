-- D-01: Email Extraction Manual Review Queue
-- Supabase Project: kvjcidxbyimoswntpjcp
--
-- 🔗 OPEN IN SUPABASE EDITOR:
-- https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp/sql/new
-- (Copy this entire file and paste into the SQL editor above)
--
-- Or use this quick link to go directly to SQL editor:
-- Click: Dashboard → SQL Editor → New Query → Paste content

-- Create email_extraction_reviews table for manual review queue
CREATE TABLE IF NOT EXISTS email_extraction_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  -- Original DM reply text
  original_text TEXT NOT NULL,

  -- Extraction results
  extracted_email TEXT,
  confidence TEXT CHECK (confidence IN ('high', 'medium', 'low')) DEFAULT 'low',
  score INTEGER DEFAULT 0,
  method TEXT CHECK (method IN ('regex', 'gpt4')) DEFAULT 'regex',
  alternative_emails TEXT[] DEFAULT '{}',

  -- Review status
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'manual_entered')) DEFAULT 'pending',
  manual_email_override TEXT,
  reviewer_id UUID,
  reviewed_at TIMESTAMPTZ,
  reviewer_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_extraction_reviews_lead ON email_extraction_reviews(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_extraction_reviews_status ON email_extraction_reviews(status);
CREATE INDEX IF NOT EXISTS idx_email_extraction_reviews_created ON email_extraction_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_extraction_reviews_confidence ON email_extraction_reviews(confidence);

-- RLS Policies
ALTER TABLE email_extraction_reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view email extraction reviews for their campaigns" ON email_extraction_reviews;
DROP POLICY IF EXISTS "Users can update email extraction reviews for their campaigns" ON email_extraction_reviews;
DROP POLICY IF EXISTS "Service role can insert email extraction reviews" ON email_extraction_reviews;

-- Allow authenticated users to view reviews for their campaigns
CREATE POLICY "Users can view email extraction reviews for their campaigns" ON email_extraction_reviews
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leads
      JOIN campaigns ON leads.campaign_id = campaigns.id
      WHERE leads.id = email_extraction_reviews.lead_id
      AND campaigns.client_id IN (
        SELECT client_id FROM users
        WHERE id = auth.uid()
      )
    )
  );

-- Allow authenticated users to update reviews they can view
CREATE POLICY "Users can update email extraction reviews for their campaigns" ON email_extraction_reviews
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM leads
      JOIN campaigns ON leads.campaign_id = campaigns.id
      WHERE leads.id = email_extraction_reviews.lead_id
      AND campaigns.client_id IN (
        SELECT client_id FROM users
        WHERE id = auth.uid()
      )
    )
  );

-- Allow service role to insert (from API)
CREATE POLICY "Service role can insert email extraction reviews" ON email_extraction_reviews
  FOR INSERT
  WITH CHECK (true);

-- Update trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_extraction_reviews_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS email_extraction_reviews_updated_at ON email_extraction_reviews;
CREATE TRIGGER email_extraction_reviews_updated_at
BEFORE UPDATE ON email_extraction_reviews
FOR EACH ROW
EXECUTE FUNCTION update_email_extraction_reviews_timestamp();

-- Backup DM sequences table (if not exists) - for manual DM sending
CREATE TABLE IF NOT EXISTS backup_dm_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  -- DM content
  message_1 TEXT,
  message_2 TEXT,
  message_3 TEXT,

  -- Delivery status
  status TEXT CHECK (status IN ('pending', 'sent', 'failed')) DEFAULT 'pending',
  current_step INTEGER DEFAULT 1,

  -- Timing
  message_1_sent_at TIMESTAMPTZ,
  message_2_sent_at TIMESTAMPTZ,
  message_3_sent_at TIMESTAMPTZ,
  last_error TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backup_dm_sequences_lead ON backup_dm_sequences(lead_id);
CREATE INDEX IF NOT EXISTS idx_backup_dm_sequences_status ON backup_dm_sequences(status);

COMMENT ON TABLE email_extraction_reviews IS 'Manual review queue for email extractions with confidence < 70%';
COMMENT ON TABLE backup_dm_sequences IS 'Backup DM delivery if email extraction fails (optional feature)';
