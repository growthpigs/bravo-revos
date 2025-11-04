-- First, let's check what columns your users table actually has
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- If the above shows you have the columns, run this simpler version:
DO $$
DECLARE
  user_id UUID;
BEGIN
  -- Generate a new UUID
  user_id := gen_random_uuid();

  -- Delete any existing test user
  DELETE FROM users WHERE email = 'test@example.com';

  -- Try to insert with only the essential columns
  -- Adjust this based on what columns exist from the query above
  INSERT INTO users (
    id,
    email,
    role
  ) VALUES (
    user_id,
    'test@example.com',
    'admin'  -- Using 'admin' which should exist based on the schema
  );

  RAISE NOTICE 'User record created with ID: %', user_id;
  RAISE NOTICE 'Now create this user in Supabase Auth with this ID!';
END $$;

-- Alternative: If your users table has different columns entirely, try this minimal version:
-- This will work with almost any users table structure
INSERT INTO users (email)
VALUES ('test@example.com')
ON CONFLICT (email) DO UPDATE
SET email = 'test@example.com'
RETURNING id;

-- After running one of the above, you'll need to:
-- 1. Copy the User ID that was created
-- 2. Go to Supabase Dashboard > Authentication > Users
-- 3. Click "Add user" > "Create new user"
-- 4. Enter:
--    - Email: test@example.com
--    - Password: TestPassword123!
--    - Check "Auto Confirm User"
-- 5. After the auth user is created, get its UID
-- 6. Update the users table to link them:

-- UPDATE users SET id = 'paste-auth-uid-here' WHERE email = 'test@example.com';