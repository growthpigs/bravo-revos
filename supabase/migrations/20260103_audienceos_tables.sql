-- ============================================================
-- AUDIENCEOS TABLES MIGRATION (EXPERT REVIEWED)
-- Project: RevOS Supabase (trdoainmejxanrownbuz)
-- Purpose: Add AudienceOS tables to existing RevOS schema
-- Date: 2026-01-03
-- Fixes: No denormalized agency_id, FORCE RLS, unique constraints
-- Pattern: auth.uid() + JOINs (matches RevOS existing pattern)
-- ============================================================

-- ============================================================
-- IMPORTANT: DO NOT MODIFY EXISTING TABLES
-- Existing tables: agencies, clients, users, *_cartridges
-- This migration ONLY adds NEW tables
-- ============================================================

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================
-- Get user's agency_id via clients table
CREATE OR REPLACE FUNCTION get_user_agency_id()
RETURNS UUID AS $$
  SELECT c.agency_id
  FROM clients c
  INNER JOIN users u ON u.client_id = c.id
  WHERE u.id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Get all client_ids in user's agency
CREATE OR REPLACE FUNCTION get_agency_client_ids()
RETURNS SETOF UUID AS $$
  SELECT c.id
  FROM clients c
  WHERE c.agency_id = (SELECT get_user_agency_id());
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- 1. AGENCY CARTRIDGES (Agency-scoped)
-- ============================================================
CREATE TABLE IF NOT EXISTS agency_cartridges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('style', 'preference', 'instruction', 'brand')),
  name TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure only ONE default per type per agency
CREATE UNIQUE INDEX IF NOT EXISTS idx_agency_cartridges_default
ON agency_cartridges(agency_id, type) WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_agency_cartridges_agency ON agency_cartridges(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_cartridges_type ON agency_cartridges(type);

-- ============================================================
-- 2. COMMUNICATIONS (Client-scoped - NO agency_id)
-- ============================================================
CREATE TABLE IF NOT EXISTS communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('email', 'call', 'meeting', 'note')),
  direction TEXT CHECK (direction IN ('inbound', 'outbound')),
  subject TEXT,
  body TEXT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_communications_client ON communications(client_id);
CREATE INDEX IF NOT EXISTS idx_communications_timestamp ON communications(timestamp DESC);

-- ============================================================
-- 3. ALERTS (Client-scoped - NO agency_id)
-- ============================================================
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_client ON alerts(client_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);

-- ============================================================
-- 4. TICKETS (Client-scoped - NO agency_id)
-- ============================================================
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  assignee_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open',
  priority TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tickets_client ON tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_assignee ON tickets(assignee_id);

-- ============================================================
-- 5. DOCUMENTS (Client-scoped - NO agency_id)
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_client ON documents(client_id);

-- ============================================================
-- 6. UPDATED_AT TRIGGERS
-- ============================================================
-- Use existing function or create if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist (idempotent)
DROP TRIGGER IF EXISTS update_agency_cartridges_updated_at ON agency_cartridges;
DROP TRIGGER IF EXISTS update_communications_updated_at ON communications;
DROP TRIGGER IF EXISTS update_alerts_updated_at ON alerts;
DROP TRIGGER IF EXISTS update_tickets_updated_at ON tickets;

CREATE TRIGGER update_agency_cartridges_updated_at
  BEFORE UPDATE ON agency_cartridges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_communications_updated_at
  BEFORE UPDATE ON communications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at
  BEFORE UPDATE ON alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 7. ENABLE ROW LEVEL SECURITY WITH FORCE
-- ============================================================
ALTER TABLE agency_cartridges ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_cartridges FORCE ROW LEVEL SECURITY;

ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications FORCE ROW LEVEL SECURITY;

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts FORCE ROW LEVEL SECURITY;

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets FORCE ROW LEVEL SECURITY;

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;

-- ============================================================
-- 8. AGENCY_CARTRIDGES POLICIES (Agency-scoped)
-- ============================================================
CREATE POLICY "Users can view agency cartridges" ON agency_cartridges
  FOR SELECT TO authenticated
  USING (agency_id = (SELECT get_user_agency_id()));

CREATE POLICY "Users can insert agency cartridges" ON agency_cartridges
  FOR INSERT TO authenticated
  WITH CHECK (agency_id = (SELECT get_user_agency_id()));

CREATE POLICY "Users can update agency cartridges" ON agency_cartridges
  FOR UPDATE TO authenticated
  USING (agency_id = (SELECT get_user_agency_id()));

CREATE POLICY "Users can delete agency cartridges" ON agency_cartridges
  FOR DELETE TO authenticated
  USING (agency_id = (SELECT get_user_agency_id()));

-- ============================================================
-- 9. COMMUNICATIONS POLICIES (Client-scoped via agency)
-- ============================================================
CREATE POLICY "Users can view agency communications" ON communications
  FOR SELECT TO authenticated
  USING (client_id IN (SELECT get_agency_client_ids()));

CREATE POLICY "Users can insert agency communications" ON communications
  FOR INSERT TO authenticated
  WITH CHECK (client_id IN (SELECT get_agency_client_ids()));

CREATE POLICY "Users can update agency communications" ON communications
  FOR UPDATE TO authenticated
  USING (client_id IN (SELECT get_agency_client_ids()));

CREATE POLICY "Users can delete agency communications" ON communications
  FOR DELETE TO authenticated
  USING (client_id IN (SELECT get_agency_client_ids()));

-- ============================================================
-- 10. ALERTS POLICIES (Client-scoped via agency)
-- ============================================================
CREATE POLICY "Users can view agency alerts" ON alerts
  FOR SELECT TO authenticated
  USING (client_id IN (SELECT get_agency_client_ids()));

CREATE POLICY "Users can insert agency alerts" ON alerts
  FOR INSERT TO authenticated
  WITH CHECK (client_id IN (SELECT get_agency_client_ids()));

CREATE POLICY "Users can update agency alerts" ON alerts
  FOR UPDATE TO authenticated
  USING (client_id IN (SELECT get_agency_client_ids()));

CREATE POLICY "Users can delete agency alerts" ON alerts
  FOR DELETE TO authenticated
  USING (client_id IN (SELECT get_agency_client_ids()));

-- ============================================================
-- 11. TICKETS POLICIES (Client-scoped via agency)
-- ============================================================
CREATE POLICY "Users can view agency tickets" ON tickets
  FOR SELECT TO authenticated
  USING (client_id IN (SELECT get_agency_client_ids()));

CREATE POLICY "Users can insert agency tickets" ON tickets
  FOR INSERT TO authenticated
  WITH CHECK (client_id IN (SELECT get_agency_client_ids()));

CREATE POLICY "Users can update agency tickets" ON tickets
  FOR UPDATE TO authenticated
  USING (client_id IN (SELECT get_agency_client_ids()));

CREATE POLICY "Users can delete agency tickets" ON tickets
  FOR DELETE TO authenticated
  USING (client_id IN (SELECT get_agency_client_ids()));

-- ============================================================
-- 12. DOCUMENTS POLICIES (Client-scoped via agency)
-- ============================================================
CREATE POLICY "Users can view agency documents" ON documents
  FOR SELECT TO authenticated
  USING (client_id IN (SELECT get_agency_client_ids()));

CREATE POLICY "Users can insert agency documents" ON documents
  FOR INSERT TO authenticated
  WITH CHECK (client_id IN (SELECT get_agency_client_ids()));

CREATE POLICY "Users can update agency documents" ON documents
  FOR UPDATE TO authenticated
  USING (client_id IN (SELECT get_agency_client_ids()));

CREATE POLICY "Users can delete agency documents" ON documents
  FOR DELETE TO authenticated
  USING (client_id IN (SELECT get_agency_client_ids()));

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
-- Tables added: 5
--   - agency_cartridges (agency-scoped)
--   - communications (client-scoped)
--   - alerts (client-scoped)
--   - tickets (client-scoped)
--   - documents (client-scoped)
-- Indexes added: 11
-- Triggers added: 4
-- Helper functions added: 2
--   - get_user_agency_id()
--   - get_agency_client_ids()
-- RLS policies added: 20 (4 per table)
-- Existing tables modified: 0
-- ============================================================
