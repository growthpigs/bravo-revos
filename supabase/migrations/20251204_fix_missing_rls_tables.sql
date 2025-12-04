-- Supabase Project: trdoainmejxanrownbuz
-- Click: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new
--
-- SECURITY FIX: Enable RLS on tables that were created without it
-- Identified in multi-tenant security audit on 2025-12-04
--
-- Tables affected:
-- 1. pod_activities_dlq - Dead-letter queue (backend-only)
-- 2. backup_dm_sequences - Backup table (backend-only)

-- ==============================================================================
-- 1. pod_activities_dlq - Enable RLS with service role only access
-- ==============================================================================

-- Check if table exists before enabling RLS
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pod_activities_dlq') THEN
    -- Enable RLS
    ALTER TABLE public.pod_activities_dlq ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if any (cleanup)
    DROP POLICY IF EXISTS "Service role full access on pod_activities_dlq" ON public.pod_activities_dlq;

    -- Create service role only policy - this is a backend-only table
    CREATE POLICY "Service role full access on pod_activities_dlq"
      ON public.pod_activities_dlq
      FOR ALL
      USING (
        current_setting('request.jwt.claim.role', true) = 'service_role'
        OR auth.uid() IS NULL  -- Allow backend calls without user context
      )
      WITH CHECK (
        current_setting('request.jwt.claim.role', true) = 'service_role'
        OR auth.uid() IS NULL
      );

    RAISE NOTICE 'RLS enabled on pod_activities_dlq';
  ELSE
    RAISE NOTICE 'Table pod_activities_dlq does not exist, skipping';
  END IF;
END $$;

-- ==============================================================================
-- 2. backup_dm_sequences - Enable RLS with service role only access
-- ==============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'backup_dm_sequences') THEN
    -- Enable RLS
    ALTER TABLE public.backup_dm_sequences ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if any (cleanup)
    DROP POLICY IF EXISTS "Service role full access on backup_dm_sequences" ON public.backup_dm_sequences;

    -- Create service role only policy - this is a backup table for admin operations
    CREATE POLICY "Service role full access on backup_dm_sequences"
      ON public.backup_dm_sequences
      FOR ALL
      USING (
        current_setting('request.jwt.claim.role', true) = 'service_role'
        OR auth.uid() IS NULL
      )
      WITH CHECK (
        current_setting('request.jwt.claim.role', true) = 'service_role'
        OR auth.uid() IS NULL
      );

    RAISE NOTICE 'RLS enabled on backup_dm_sequences';
  ELSE
    RAISE NOTICE 'Table backup_dm_sequences does not exist, skipping';
  END IF;
END $$;

-- ==============================================================================
-- 3. Verification query - Run this to confirm RLS is enabled
-- ==============================================================================

-- SELECT
--   schemaname,
--   tablename,
--   rowsecurity as "RLS_Enabled"
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- AND tablename IN ('pod_activities_dlq', 'backup_dm_sequences')
-- ORDER BY tablename;
