-- Supabase Project: trdoainmejxanrownbuz
-- Click: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new

-- Fix Roderic's user to have agency_id so he can create clients
UPDATE users
SET agency_id = 'c3ae8595-ba0a-44c8-aa44-db0bdfc3f951'
WHERE email = 'rodericandrews@icloud.com';

-- Verify it worked
SELECT id, email, agency_id FROM users WHERE email = 'rodericandrews@icloud.com';
