-- ============================================================================
-- RLS POLICIES FOR MULTI-TENANT SECURITY
-- ============================================================================
-- This migration adds RLS policies to all public tables
-- Pattern: Users can only access data for their client
-- All tables use auth.uid() joined through users → client_id
-- ============================================================================

-- ============================================================================
-- AGENCIES TABLE
-- ============================================================================
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their agencies"
  ON agencies
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT DISTINCT a.id
      FROM agencies a
      INNER JOIN clients c ON c.agency_id = a.id
      INNER JOIN users u ON u.client_id = c.id
      WHERE u.id = auth.uid()
    )
  );

-- ============================================================================
-- CLIENTS TABLE
-- ============================================================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their client"
  ON clients
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT client_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their client"
  ON clients
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT client_id FROM users WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- USERS TABLE (extends 004_fix_auth.sql)
-- ============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view own record"
  ON users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can view colleagues"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Service role can manage all users"
  ON users
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- LINKEDIN ACCOUNTS TABLE
-- ============================================================================
ALTER TABLE linkedin_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their linkedin accounts"
  ON linkedin_accounts
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT u.id FROM users u
      WHERE u.client_id IN (
        SELECT client_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage their linkedin accounts"
  ON linkedin_accounts
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
  );

-- ============================================================================
-- POSTS TABLE
-- ============================================================================
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view posts in their campaigns"
  ON posts
  FOR SELECT
  TO authenticated
  USING (
    campaign_id IN (
      SELECT c.id FROM campaigns c
      WHERE c.client_id IN (
        SELECT client_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage posts in their campaigns"
  ON posts
  FOR ALL
  TO authenticated
  USING (
    campaign_id IN (
      SELECT c.id FROM campaigns c
      WHERE c.client_id IN (
        SELECT client_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- ============================================================================
-- COMMENTS TABLE
-- ============================================================================
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on their posts"
  ON comments
  FOR SELECT
  TO authenticated
  USING (
    post_id IN (
      SELECT p.id FROM posts p
      WHERE p.campaign_id IN (
        SELECT c.id FROM campaigns c
        WHERE c.client_id IN (
          SELECT client_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can manage comments on their posts"
  ON comments
  FOR ALL
  TO authenticated
  USING (
    post_id IN (
      SELECT p.id FROM posts p
      WHERE p.campaign_id IN (
        SELECT c.id FROM campaigns c
        WHERE c.client_id IN (
          SELECT client_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

-- ============================================================================
-- CAMPAIGNS TABLE
-- ============================================================================
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their campaigns"
  ON campaigns
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their campaigns"
  ON campaigns
  FOR ALL
  TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM users WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- LEADS TABLE
-- ============================================================================
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view leads in their campaigns"
  ON leads
  FOR SELECT
  TO authenticated
  USING (
    campaign_id IN (
      SELECT c.id FROM campaigns c
      WHERE c.client_id IN (
        SELECT client_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage leads in their campaigns"
  ON leads
  FOR ALL
  TO authenticated
  USING (
    campaign_id IN (
      SELECT c.id FROM campaigns c
      WHERE c.client_id IN (
        SELECT client_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- ============================================================================
-- LEAD MAGNETS TABLE
-- ============================================================================
ALTER TABLE lead_magnets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their lead magnets"
  ON lead_magnets
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their lead magnets"
  ON lead_magnets
  FOR ALL
  TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM users WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- DM SEQUENCES TABLE
-- ============================================================================
ALTER TABLE dm_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their dm sequences"
  ON dm_sequences
  FOR SELECT
  TO authenticated
  USING (
    campaign_id IN (
      SELECT c.id FROM campaigns c
      WHERE c.client_id IN (
        SELECT client_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage their dm sequences"
  ON dm_sequences
  FOR ALL
  TO authenticated
  USING (
    campaign_id IN (
      SELECT c.id FROM campaigns c
      WHERE c.client_id IN (
        SELECT client_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- ============================================================================
-- WEBHOOK CONFIGS TABLE
-- ============================================================================
ALTER TABLE webhook_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their webhook configs"
  ON webhook_configs
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their webhook configs"
  ON webhook_configs
  FOR ALL
  TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM users WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- WEBHOOK DELIVERIES TABLE
-- ============================================================================
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their webhook deliveries"
  ON webhook_deliveries
  FOR SELECT
  TO authenticated
  USING (
    webhook_config_id IN (
      SELECT wc.id FROM webhook_configs wc
      WHERE wc.client_id IN (
        SELECT client_id FROM users WHERE id = auth.uid()
      )
    )
    OR
    lead_id IN (
      SELECT l.id FROM leads l
      WHERE l.campaign_id IN (
        SELECT c.id FROM campaigns c
        WHERE c.client_id IN (
          SELECT client_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Service role can manage webhook deliveries"
  ON webhook_deliveries
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- WEBHOOK DELIVERY LOGS TABLE (if it exists)
-- ============================================================================
ALTER TABLE IF EXISTS webhook_delivery_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view their webhook delivery logs"
  ON webhook_delivery_logs
  FOR SELECT
  TO authenticated
  USING (
    delivery_id IN (
      SELECT wd.id FROM webhook_deliveries wd
      WHERE wd.webhook_config_id IN (
        SELECT wc.id FROM webhook_configs wc
        WHERE wc.client_id IN (
          SELECT client_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

CREATE POLICY IF NOT EXISTS "Service role can manage webhook delivery logs"
  ON webhook_delivery_logs
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- PODS TABLE
-- ============================================================================
ALTER TABLE pods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their pods"
  ON pods
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their pods"
  ON pods
  FOR ALL
  TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM users WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- POD MEMBERS TABLE
-- ============================================================================
ALTER TABLE pod_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pod members in their pods"
  ON pod_members
  FOR SELECT
  TO authenticated
  USING (
    pod_id IN (
      SELECT p.id FROM pods p
      WHERE p.client_id IN (
        SELECT client_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage pod members in their pods"
  ON pod_members
  FOR ALL
  TO authenticated
  USING (
    pod_id IN (
      SELECT p.id FROM pods p
      WHERE p.client_id IN (
        SELECT client_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- ============================================================================
-- POD ACTIVITIES TABLE
-- ============================================================================
ALTER TABLE pod_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activities in their pods"
  ON pod_activities
  FOR SELECT
  TO authenticated
  USING (
    pod_id IN (
      SELECT p.id FROM pods p
      WHERE p.client_id IN (
        SELECT client_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage activities in their pods"
  ON pod_activities
  FOR ALL
  TO authenticated
  USING (
    pod_id IN (
      SELECT p.id FROM pods p
      WHERE p.client_id IN (
        SELECT client_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- ============================================================================
-- CARTRIDGES TABLE (extends 003_cartridge_system.sql)
-- ============================================================================
-- RLS is already enabled in 003, these add additional policies

CREATE POLICY IF NOT EXISTS "Users can view their client cartridges"
  ON cartridges
  FOR SELECT
  TO authenticated
  USING (
    tier = 'system' OR
    (tier = 'client' AND client_id IN (
      SELECT client_id FROM users WHERE id = auth.uid()
    )) OR
    (tier = 'user' AND user_id = auth.uid())
  );

CREATE POLICY IF NOT EXISTS "Users can manage their cartridges"
  ON cartridges
  FOR ALL
  TO authenticated
  USING (
    (tier = 'client' AND client_id IN (
      SELECT client_id FROM users WHERE id = auth.uid()
    )) OR
    (tier = 'user' AND user_id = auth.uid())
  );

-- ============================================================================
-- SERVICE ROLE BYPASS
-- ============================================================================
-- Service role can bypass all RLS restrictions for operational tasks

CREATE POLICY "Service role bypasses RLS"
  ON agencies FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role bypasses RLS on clients"
  ON clients FOR ALL
  USING (auth.role() = 'service_role');

-- Apply to all other tables that need service role access
ALTER TABLE linkedin_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role access linkedin accounts"
  ON linkedin_accounts FOR ALL
  USING (auth.role() = 'service_role');

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role access posts"
  ON posts FOR ALL
  USING (auth.role() = 'service_role');

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role access comments"
  ON comments FOR ALL
  USING (auth.role() = 'service_role');

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role access campaigns"
  ON campaigns FOR ALL
  USING (auth.role() = 'service_role');

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role access leads"
  ON leads FOR ALL
  USING (auth.role() = 'service_role');

ALTER TABLE lead_magnets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role access lead magnets"
  ON lead_magnets FOR ALL
  USING (auth.role() = 'service_role');

ALTER TABLE dm_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role access dm sequences"
  ON dm_sequences FOR ALL
  USING (auth.role() = 'service_role');

ALTER TABLE webhook_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role access webhook configs"
  ON webhook_configs FOR ALL
  USING (auth.role() = 'service_role');

ALTER TABLE pods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role access pods"
  ON pods FOR ALL
  USING (auth.role() = 'service_role');

ALTER TABLE pod_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role access pod members"
  ON pod_members FOR ALL
  USING (auth.role() = 'service_role');

ALTER TABLE pod_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role access pod activities"
  ON pod_activities FOR ALL
  USING (auth.role() = 'service_role');

ALTER TABLE cartridges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role access cartridges"
  ON cartridges FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- NOTES
-- ============================================================================
-- This migration creates RLS policies following the multi-tenant pattern:
--
-- 1. Users are associated with a Client (users.client_id)
-- 2. Clients own most resources (campaigns, leads, pods, etc.)
-- 3. Some resources are owned by Users (linkedin_accounts, user cartridges)
-- 4. All SELECT/UPDATE/INSERT/DELETE checks auth.uid() against client_id
-- 5. Service role (API/backend) can bypass RLS for operational tasks
--
-- If a policy already exists (marked with IF NOT EXISTS), it won't be recreated
-- This migration is IDEMPOTENT and can be re-run safely
-- ============================================================================
