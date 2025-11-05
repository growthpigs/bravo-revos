-- Fix Authentication and Create Working Test User
-- Run this if you're having login issues

-- First, ensure RLS is enabled on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own record" ON users;
DROP POLICY IF EXISTS "Service role can manage all users" ON users;

-- Create comprehensive RLS policies for users table
CREATE POLICY "Users can view own record" ON users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Service role can manage all users" ON users
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create a function to properly create test users
CREATE OR REPLACE FUNCTION create_test_user()
RETURNS void AS $$
DECLARE
  test_user_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
BEGIN
  -- Check if user already exists in users table
  IF EXISTS (SELECT 1 FROM users WHERE id = test_user_id) THEN
    -- Update existing user
    UPDATE users
    SET
      email = 'test@example.com',
      role = 'client_admin',
      first_name = 'Test',
      last_name = 'User',
      is_active = true,
      updated_at = NOW()
    WHERE id = test_user_id;

    RAISE NOTICE 'Test user updated in users table';
  ELSE
    -- Create new user
    INSERT INTO users (
      id,
      email,
      agency_id,
      client_id,
      role,
      first_name,
      last_name,
      is_active
    ) VALUES (
      test_user_id,
      'test@example.com',
      NULL,
      NULL,
      'client_admin',
      'Test',
      'User',
      true
    );

    RAISE NOTICE 'Test user created in users table';
  END IF;

  RAISE NOTICE 'Test user setup complete!';
  RAISE NOTICE 'Email: test@example.com';
  RAISE NOTICE 'User ID: %', test_user_id;
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT: You must create this user in Supabase Auth Dashboard:';
  RAISE NOTICE '1. Go to Authentication > Users in Supabase Dashboard';
  RAISE NOTICE '2. Click "Add user" → "Create new user"';
  RAISE NOTICE '3. Enter email: test@example.com';
  RAISE NOTICE '4. Set a password (e.g., TestPassword123!)';
  RAISE NOTICE '5. Check "Auto Confirm User"';
  RAISE NOTICE '6. After creation, update the user in the users table to link the IDs';
END;
$$ LANGUAGE plpgsql;

-- Execute the function
SELECT create_test_user();

-- Create additional test users with different roles if needed
CREATE OR REPLACE FUNCTION create_additional_test_users()
RETURNS void AS $$
BEGIN
  -- Agency Admin Test User
  INSERT INTO users (
    id,
    email,
    agency_id,
    client_id,
    role,
    first_name,
    last_name,
    is_active
  ) VALUES (
    'b1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'agency@example.com',
    NULL, -- Would need an agency ID
    NULL,
    'agency_admin',
    'Agency',
    'Admin',
    true
  ) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    updated_at = NOW();

  -- Client Admin Test User
  INSERT INTO users (
    id,
    email,
    agency_id,
    client_id,
    role,
    first_name,
    last_name,
    is_active
  ) VALUES (
    'c1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'client@example.com',
    NULL, -- Would need an agency ID
    NULL, -- Would need a client ID
    'client_admin',
    'Client',
    'Admin',
    true
  ) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    updated_at = NOW();

  RAISE NOTICE 'Additional test users created/updated';
  RAISE NOTICE 'Remember to create these in Supabase Auth Dashboard too!';
END;
$$ LANGUAGE plpgsql;

-- Uncomment to create additional test users
-- SELECT create_additional_test_users();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;