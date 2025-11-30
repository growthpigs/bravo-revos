-- Supabase Project: trdoainmejxanrownbuz
-- Click: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new
--
-- SECURITY FIX: Enable RLS on remaining tables that were missing it
-- Applied: 2025-11-30
--
-- Tables fixed:
-- 1. pods - Had RLS disabled, added tenant isolation via client_id
-- 2. dm_sequences - Had RLS disabled, added tenant isolation via campaigns.client_id
-- 3. dm_deliveries - Had RLS disabled, added tenant isolation via leads.campaign_id
-- 4. processed_comments - Had policies but RLS was disabled
-- 5. processed_messages - Had policies but RLS was disabled

-- ============================================
-- 1. PODS TABLE
-- ============================================
ALTER TABLE pods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their pods" ON pods
  FOR SELECT
  USING (
    client_id IN (
      SELECT users.client_id FROM users WHERE users.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their pods" ON pods
  FOR INSERT
  WITH CHECK (
    client_id IN (
      SELECT users.client_id FROM users WHERE users.id = auth.uid()
    )
  );

CREATE POLICY "Users can update their pods" ON pods
  FOR UPDATE
  USING (
    client_id IN (
      SELECT users.client_id FROM users WHERE users.id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their pods" ON pods
  FOR DELETE
  USING (
    client_id IN (
      SELECT users.client_id FROM users WHERE users.id = auth.uid()
    )
  );

CREATE POLICY "Service role full access to pods" ON pods
  FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE pods IS 'SECURITY: RLS enabled. Tenant isolation via client_id.';

-- ============================================
-- 2. DM_SEQUENCES TABLE
-- ============================================
ALTER TABLE dm_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their dm_sequences" ON dm_sequences
  FOR SELECT
  USING (
    campaign_id IN (
      SELECT c.id FROM campaigns c
      WHERE c.client_id IN (
        SELECT users.client_id FROM users WHERE users.id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert their dm_sequences" ON dm_sequences
  FOR INSERT
  WITH CHECK (
    campaign_id IN (
      SELECT c.id FROM campaigns c
      WHERE c.client_id IN (
        SELECT users.client_id FROM users WHERE users.id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update their dm_sequences" ON dm_sequences
  FOR UPDATE
  USING (
    campaign_id IN (
      SELECT c.id FROM campaigns c
      WHERE c.client_id IN (
        SELECT users.client_id FROM users WHERE users.id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete their dm_sequences" ON dm_sequences
  FOR DELETE
  USING (
    campaign_id IN (
      SELECT c.id FROM campaigns c
      WHERE c.client_id IN (
        SELECT users.client_id FROM users WHERE users.id = auth.uid()
      )
    )
  );

CREATE POLICY "Service role full access to dm_sequences" ON dm_sequences
  FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE dm_sequences IS 'SECURITY: RLS enabled. Tenant isolation via campaigns.client_id.';

-- ============================================
-- 3. DM_DELIVERIES TABLE
-- ============================================
ALTER TABLE dm_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their dm_deliveries" ON dm_deliveries
  FOR SELECT
  USING (
    lead_id IN (
      SELECT l.id FROM leads l
      WHERE l.campaign_id IN (
        SELECT c.id FROM campaigns c
        WHERE c.client_id IN (
          SELECT users.client_id FROM users WHERE users.id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can insert their dm_deliveries" ON dm_deliveries
  FOR INSERT
  WITH CHECK (
    lead_id IN (
      SELECT l.id FROM leads l
      WHERE l.campaign_id IN (
        SELECT c.id FROM campaigns c
        WHERE c.client_id IN (
          SELECT users.client_id FROM users WHERE users.id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can update their dm_deliveries" ON dm_deliveries
  FOR UPDATE
  USING (
    lead_id IN (
      SELECT l.id FROM leads l
      WHERE l.campaign_id IN (
        SELECT c.id FROM campaigns c
        WHERE c.client_id IN (
          SELECT users.client_id FROM users WHERE users.id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Service role full access to dm_deliveries" ON dm_deliveries
  FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE dm_deliveries IS 'SECURITY: RLS enabled. Tenant isolation via leads.campaign_id -> campaigns.client_id.';

-- ============================================
-- 4 & 5. PROCESSED_COMMENTS & PROCESSED_MESSAGES
-- ============================================
-- These already have "Service role only access" policies but RLS was disabled
ALTER TABLE processed_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_messages ENABLE ROW LEVEL SECURITY;
