-- Supabase Project: trdoainmejxanrownbuz
-- Click: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new

-- ==================================================================
-- MIGRATION: Add LinkedIn Connection Tracking to Users Table
-- ==================================================================
-- Purpose: Track if user has completed LinkedIn connection
-- Use cases:
--   - Show connection prompt on subsequent logins if not connected
--   - Dashboard warnings if LinkedIn not connected
--   - Admin UI showing connection status

-- Add column to track LinkedIn connection status
ALTER TABLE users
ADD COLUMN IF NOT EXISTS linkedin_connected BOOLEAN DEFAULT false;

-- Create function to automatically update linkedin_connected when unipile_account_id is set
CREATE OR REPLACE FUNCTION update_linkedin_connected()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.unipile_account_id IS NOT NULL AND NEW.unipile_account_id != '' THEN
    NEW.linkedin_connected = true;
  ELSE
    NEW.linkedin_connected = false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run function on INSERT or UPDATE
DROP TRIGGER IF EXISTS set_linkedin_connected ON users;
CREATE TRIGGER set_linkedin_connected
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_linkedin_connected();

-- Backfill existing users who already have unipile_account_id
UPDATE users
SET linkedin_connected = true
WHERE unipile_account_id IS NOT NULL AND unipile_account_id != '';
