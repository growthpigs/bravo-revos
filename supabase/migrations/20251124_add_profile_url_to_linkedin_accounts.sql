-- Supabase Project: trdoainmejxanrownbuz
-- Click: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new

-- Add profile_url column to linkedin_accounts table
-- This stores the user's LinkedIn profile URL for building recent activity links

ALTER TABLE linkedin_accounts
ADD COLUMN IF NOT EXISTS profile_url TEXT;

COMMENT ON COLUMN linkedin_accounts.profile_url IS 'LinkedIn profile URL (e.g., https://www.linkedin.com/in/username)';

-- Update existing accounts with known profile URLs
-- Add more UPDATE statements as needed for other users
UPDATE linkedin_accounts
SET profile_url = 'https://www.linkedin.com/in/rodericandrews'
WHERE user_id IN (
  SELECT id FROM users WHERE email = 'rodericthedeveloper@gmail.com'
)
AND profile_url IS NULL;
