-- RevOS Pre-Work: Database Table Verification
-- Run this in Supabase SQL Editor
-- Project: kvjcidxbyimoswntpjcp
-- Link: https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp/sql/new

-- ===================================
-- PHASE 1: Core Tables Check
-- ===================================

SELECT
  'Core Tables' as category,
  table_name,
  CASE
    WHEN table_name IN (
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM (
  VALUES
    ('users'),
    ('clients'),
    ('agencies'),
    ('campaigns'),
    ('leads'),
    ('linkedin_accounts')
) AS required_tables(table_name)

UNION ALL

-- ===================================
-- PHASE 2: Feature Tables Check
-- ===================================

SELECT
  'Feature Tables' as category,
  table_name,
  CASE
    WHEN table_name IN (
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM (
  VALUES
    ('cartridges'),
    ('lead_magnets'),
    ('lead_magnet_library'),
    ('dm_queue'),
    ('webhook_configs'),
    ('webhook_deliveries'),
    ('email_extraction_reviews'),
    ('posts'),
    ('pods'),
    ('pod_members'),
    ('pod_activities')
) AS feature_tables(table_name)

UNION ALL

-- ===================================
-- PHASE 3: Planned New Tables Check
-- ===================================

SELECT
  'Planned Tables (may not exist yet)' as category,
  table_name,
  CASE
    WHEN table_name IN (
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
    ) THEN '✅ EXISTS'
    ELSE '⚠️ NEEDS CREATION'
  END as status
FROM (
  VALUES
    ('dm_sequences'),
    ('lead_magnet_views'),
    ('agency_settings')
) AS planned_tables(table_name)

ORDER BY category, table_name;

-- ===================================
-- ADDITIONAL CHECK: Column Verification
-- ===================================

-- Check if posts table has metrics column (not individual count columns)
SELECT
  'Posts Metrics Column' as check_name,
  CASE
    WHEN column_name = 'metrics' THEN '✅ CORRECT (JSONB metrics exists)'
    ELSE '❌ INCORRECT'
  END as status,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'posts'
  AND column_name = 'metrics';

-- Check if lead_magnets table exists (needed for Phase 2)
SELECT
  'Lead Magnets Table Structure' as check_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'lead_magnets'
ORDER BY ordinal_position;

-- Check if webhook_configs exists (needed for Phase 2)
SELECT
  'Webhook Configs Table Structure' as check_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'webhook_configs'
ORDER BY ordinal_position;

-- ===================================
-- SUMMARY QUERY
-- ===================================

SELECT
  COUNT(*) FILTER (WHERE table_name IN (
    'users', 'clients', 'campaigns', 'leads', 'linkedin_accounts',
    'cartridges', 'lead_magnets', 'webhook_configs', 'posts', 'pods'
  )) as existing_tables_count,
  COUNT(*) FILTER (WHERE table_name IN (
    'dm_sequences', 'lead_magnet_views', 'agency_settings'
  )) as tables_to_create,
  (SELECT COUNT(DISTINCT tablename) FROM pg_tables WHERE schemaname = 'public') as total_public_tables
FROM pg_tables
WHERE schemaname = 'public';
