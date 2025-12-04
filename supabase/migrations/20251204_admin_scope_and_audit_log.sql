-- Supabase Project: trdoainmejxanrownbuz
-- Click: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new
-- Migration: Admin Scope and Audit Logging
-- Purpose: Add super admin vs tenant admin distinction and audit trail for admin actions

-- ============================================
-- 1. ADD ADMIN SCOPE TO admin_users TABLE
-- ============================================

-- Add scope column to distinguish super admins from tenant admins
ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'tenant' CHECK (scope IN ('super', 'tenant'));

-- Add agency_id to scope admin access to specific agency (for tenant admins)
ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE;

-- Add notes/reason for admin privileges
ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add who granted admin access
ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS granted_by UUID REFERENCES auth.users(id);

-- Add when admin access was granted
ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS granted_at TIMESTAMPTZ DEFAULT NOW();

-- Comment on columns
COMMENT ON COLUMN admin_users.scope IS 'Admin scope: super (all tenants) or tenant (agency-specific)';
COMMENT ON COLUMN admin_users.agency_id IS 'For tenant admins, which agency they can administer';
COMMENT ON COLUMN admin_users.notes IS 'Notes about why this user has admin access';
COMMENT ON COLUMN admin_users.granted_by IS 'User ID of who granted admin privileges';
COMMENT ON COLUMN admin_users.granted_at IS 'When admin privileges were granted';

-- ============================================
-- 2. CREATE ADMIN AUDIT LOG TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Who performed the action
    admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    admin_email TEXT NOT NULL,

    -- What action was performed
    action TEXT NOT NULL, -- 'create', 'update', 'delete', 'access', 'export'
    resource_type TEXT NOT NULL, -- 'workflow', 'user', 'client', 'campaign', 'lead', etc.
    resource_id TEXT, -- ID of the affected resource (nullable for list/export operations)

    -- Context
    endpoint TEXT, -- API endpoint that was called
    method TEXT, -- HTTP method (GET, POST, PUT, DELETE)

    -- What changed
    old_value JSONB, -- Previous state (for updates/deletes)
    new_value JSONB, -- New state (for creates/updates)

    -- Metadata
    ip_address TEXT,
    user_agent TEXT,
    request_id TEXT, -- For correlating with logs

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_user ON admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_resource ON admin_audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created ON admin_audit_log(created_at DESC);

-- Enable RLS
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only super admins can view audit logs
CREATE POLICY "Super admins can read audit logs" ON admin_audit_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.user_id = auth.uid()
            AND admin_users.scope = 'super'
        )
    );

-- Service role can always write (for API routes)
CREATE POLICY "Service role can write audit logs" ON admin_audit_log
    FOR INSERT
    WITH CHECK (true);

-- Comments
COMMENT ON TABLE admin_audit_log IS 'Audit trail of all admin actions for security and compliance';
COMMENT ON COLUMN admin_audit_log.action IS 'Type of action: create, update, delete, access, export';
COMMENT ON COLUMN admin_audit_log.resource_type IS 'Type of resource affected: workflow, user, client, etc.';

-- ============================================
-- 3. UPDATE EXISTING ADMIN TO SUPER ADMIN
-- ============================================

-- Mark existing admin (roderic) as super admin
UPDATE admin_users
SET scope = 'super', notes = 'Original system admin'
WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'roderic@me.com'
);

-- ============================================
-- 4. CREATE HELPER FUNCTION FOR AUDIT LOGGING
-- ============================================

CREATE OR REPLACE FUNCTION log_admin_action(
    p_action TEXT,
    p_resource_type TEXT,
    p_resource_id TEXT DEFAULT NULL,
    p_endpoint TEXT DEFAULT NULL,
    p_method TEXT DEFAULT NULL,
    p_old_value JSONB DEFAULT NULL,
    p_new_value JSONB DEFAULT NULL,
    p_request_id TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_admin_email TEXT;
    v_log_id UUID;
BEGIN
    -- Get admin email
    SELECT email INTO v_admin_email
    FROM auth.users
    WHERE id = auth.uid();

    -- Insert audit log
    INSERT INTO admin_audit_log (
        admin_user_id,
        admin_email,
        action,
        resource_type,
        resource_id,
        endpoint,
        method,
        old_value,
        new_value,
        request_id
    ) VALUES (
        auth.uid(),
        COALESCE(v_admin_email, 'unknown'),
        p_action,
        p_resource_type,
        p_resource_id,
        p_endpoint,
        p_method,
        p_old_value,
        p_new_value,
        p_request_id
    ) RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users (function handles auth internally)
GRANT EXECUTE ON FUNCTION log_admin_action TO authenticated;

-- ============================================
-- 5. ADD client_id TO TABLES MISSING IT
-- ============================================

-- Add client_id to lead_magnets if missing
ALTER TABLE lead_magnets
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_lead_magnets_client ON lead_magnets(client_id);

-- ============================================
-- VERIFICATION QUERIES (run these to confirm)
-- ============================================

-- Check admin_users columns
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'admin_users';

-- Check audit log table exists
-- SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'admin_audit_log');

-- Check existing admins
-- SELECT au.user_id, u.email, au.scope, au.agency_id FROM admin_users au JOIN auth.users u ON au.user_id = u.id;
