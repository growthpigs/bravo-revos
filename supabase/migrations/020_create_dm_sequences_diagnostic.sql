-- Diagnostic SQL to check prerequisites for dm_sequences migration
-- Run this FIRST to see what's missing

-- 1. Check if required extension exists
SELECT EXISTS (
  SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp'
) AS uuid_extension_exists;

-- 2. Check if required tables exist
SELECT
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaigns') AS campaigns_exists,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') AS clients_exists,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cartridges') AS cartridges_exists,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') AS users_exists,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads') AS leads_exists;

-- 3. Check if update_updated_at_column function exists
SELECT EXISTS (
  SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
) AS update_trigger_function_exists;
