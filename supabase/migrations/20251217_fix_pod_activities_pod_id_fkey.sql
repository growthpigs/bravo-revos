-- Supabase Project: trdoainmejxanrownbuz
-- Click: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new
--
-- Fix pod_activities_pod_id_fkey - currently references clients(id) but should reference pods(id)
--
-- The FK was incorrectly created to point to clients table instead of pods table.
-- This breaks all pod activity inserts since pod_id values are pod UUIDs, not client UUIDs.
--

-- Drop the incorrect FK constraint
ALTER TABLE pod_activities
DROP CONSTRAINT IF EXISTS pod_activities_pod_id_fkey;

-- Add the correct FK constraint referencing pods(id)
ALTER TABLE pod_activities
ADD CONSTRAINT pod_activities_pod_id_fkey
FOREIGN KEY (pod_id) REFERENCES pods(id) ON DELETE CASCADE;

-- Verify: Run this to confirm the FK now points to pods
-- SELECT
--   tc.constraint_name,
--   kcu.column_name,
--   ccu.table_name AS foreign_table_name
-- FROM information_schema.table_constraints AS tc
-- JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
-- WHERE tc.table_name = 'pod_activities' AND tc.constraint_type = 'FOREIGN KEY';
