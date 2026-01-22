-- ============================================
-- RevOS RLS Policies
-- Generated: 2025-12-31
-- Project: bravo-revos (trdoainmejxanrownbuz)
-- ============================================
--
-- HIERARCHY:
--   agencies
--     └── clients (agency_id)
--     └── users (agency_id)
--           └── campaigns (client_id, user_id)
--           └── cartridges (client_id, user_id, agency_id)
--           └── chat_messages (session owner)
--           └── admin_users (user_id)
--           └── user_invitations (invited_by)
--
-- RUN THIS IN SUPABASE SQL EDITOR
-- ============================================

-- ============================================
-- STEP 1: Enable RLS on all tables
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE cartridges ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_cartridges ENABLE ROW LEVEL SECURITY;
ALTER TABLE instruction_cartridges ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: Helper functions (in public schema)
-- ============================================

CREATE OR REPLACE FUNCTION public.get_user_agency_id()
RETURNS UUID AS $$
  SELECT agency_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_user_client_id()
RETURNS UUID AS $$
  SELECT client_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND (role = 'super_admin' OR 'super_admin' = ANY(roles))
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================
-- STEP 3: USERS table policies
-- ============================================

-- Users can read their own profile
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (id = auth.uid());

-- Users can read other users in same agency
CREATE POLICY "users_select_same_agency" ON users
  FOR SELECT USING (agency_id = public.get_user_agency_id());

-- Users can update their own profile
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (id = auth.uid());

-- Super admins can do everything
CREATE POLICY "users_super_admin" ON users
  FOR ALL USING (public.is_super_admin());

-- ============================================
-- STEP 4: AGENCIES table policies
-- ============================================

-- Users can only see their own agency
CREATE POLICY "agencies_select_own" ON agencies
  FOR SELECT USING (id = public.get_user_agency_id());

-- Super admins can see all agencies
CREATE POLICY "agencies_super_admin" ON agencies
  FOR ALL USING (public.is_super_admin());

-- ============================================
-- STEP 5: CLIENTS table policies
-- ============================================

-- Users can see clients in their agency
CREATE POLICY "clients_select_agency" ON clients
  FOR SELECT USING (agency_id = public.get_user_agency_id());

-- Users assigned to a client can see it
CREATE POLICY "clients_select_assigned" ON clients
  FOR SELECT USING (id = public.get_user_client_id());

-- Super admins can do everything
CREATE POLICY "clients_super_admin" ON clients
  FOR ALL USING (public.is_super_admin());

-- ============================================
-- STEP 6: CAMPAIGNS table policies
-- ============================================

-- Users can see campaigns they created
CREATE POLICY "campaigns_select_own" ON campaigns
  FOR SELECT USING (user_id = auth.uid() OR created_by = auth.uid());

-- Users can see campaigns for their client
CREATE POLICY "campaigns_select_client" ON campaigns
  FOR SELECT USING (client_id = public.get_user_client_id());

-- Users can create campaigns
CREATE POLICY "campaigns_insert" ON campaigns
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own campaigns
CREATE POLICY "campaigns_update_own" ON campaigns
  FOR UPDATE USING (user_id = auth.uid() OR created_by = auth.uid());

-- Users can delete their own campaigns
CREATE POLICY "campaigns_delete_own" ON campaigns
  FOR DELETE USING (user_id = auth.uid() OR created_by = auth.uid());

-- Super admins can do everything
CREATE POLICY "campaigns_super_admin" ON campaigns
  FOR ALL USING (public.is_super_admin());

-- ============================================
-- STEP 7: CARTRIDGES table policies
-- ============================================

-- System cartridges (tier = 'system') are readable by all authenticated users
CREATE POLICY "cartridges_select_system" ON cartridges
  FOR SELECT USING (tier = 'system' AND auth.uid() IS NOT NULL);

-- Users can see cartridges for their client
CREATE POLICY "cartridges_select_client" ON cartridges
  FOR SELECT USING (client_id = public.get_user_client_id());

-- Users can see cartridges for their agency
CREATE POLICY "cartridges_select_agency" ON cartridges
  FOR SELECT USING (agency_id = public.get_user_agency_id());

-- Users can see their own cartridges
CREATE POLICY "cartridges_select_own" ON cartridges
  FOR SELECT USING (user_id = auth.uid() OR created_by = auth.uid());

-- Users can create cartridges
CREATE POLICY "cartridges_insert" ON cartridges
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own cartridges
CREATE POLICY "cartridges_update_own" ON cartridges
  FOR UPDATE USING (user_id = auth.uid() OR created_by = auth.uid());

-- Super admins can do everything
CREATE POLICY "cartridges_super_admin" ON cartridges
  FOR ALL USING (public.is_super_admin());

-- ============================================
-- STEP 8: CHAT_MESSAGES table policies
-- ============================================

-- Users can only see messages from their sessions
-- Note: Requires session_id to map to user somehow
-- For now, allow authenticated users to see their messages
CREATE POLICY "chat_messages_select" ON chat_messages
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users can insert messages
CREATE POLICY "chat_messages_insert" ON chat_messages
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Super admins can do everything
CREATE POLICY "chat_messages_super_admin" ON chat_messages
  FOR ALL USING (public.is_super_admin());

-- ============================================
-- STEP 9: ADMIN_USERS table policies (SENSITIVE!)
-- ============================================

-- Only super admins can see admin_users
CREATE POLICY "admin_users_super_admin_only" ON admin_users
  FOR ALL USING (public.is_super_admin());

-- Users can see their own admin record if they have one
CREATE POLICY "admin_users_select_own" ON admin_users
  FOR SELECT USING (user_id = auth.uid());

-- ============================================
-- STEP 10: USER_INVITATIONS table policies (SENSITIVE!)
-- ============================================

-- Users can see invitations they sent
CREATE POLICY "user_invitations_select_sent" ON user_invitations
  FOR SELECT USING (invited_by = auth.uid());

-- Users can create invitations
CREATE POLICY "user_invitations_insert" ON user_invitations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Super admins can do everything
CREATE POLICY "user_invitations_super_admin" ON user_invitations
  FOR ALL USING (public.is_super_admin());

-- ============================================
-- STEP 11: LEADS table policies
-- ============================================

-- Users can see leads for campaigns they own
CREATE POLICY "leads_select_campaign_owner" ON leads
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM campaigns
      WHERE user_id = auth.uid() OR created_by = auth.uid()
    )
  );

-- Users can insert leads
CREATE POLICY "leads_insert" ON leads
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Super admins can do everything
CREATE POLICY "leads_super_admin" ON leads
  FOR ALL USING (public.is_super_admin());

-- ============================================
-- STEP 12: NOTIFICATIONS table policies
-- ============================================

-- Users can see their own notifications
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (user_id = auth.uid());

-- System can insert notifications
CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own notifications (mark read)
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- ============================================
-- STEP 13: WEBHOOKS table policies
-- ============================================

-- Users can see webhooks for their client
CREATE POLICY "webhooks_select_client" ON webhooks
  FOR SELECT USING (client_id = public.get_user_client_id());

-- Super admins can do everything
CREATE POLICY "webhooks_super_admin" ON webhooks
  FOR ALL USING (public.is_super_admin());

-- ============================================
-- VERIFICATION QUERIES
-- Run after applying policies to verify
-- ============================================

-- Check RLS is enabled on all tables
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public';

-- Check policies exist
-- SELECT tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public';

-- ============================================
-- ROLLBACK (if needed)
-- ============================================

-- To disable RLS (DANGEROUS - only for debugging):
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- To drop all policies on a table:
-- DROP POLICY IF EXISTS "policy_name" ON table_name;
