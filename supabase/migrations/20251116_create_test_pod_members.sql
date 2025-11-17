-- Supabase Project: trdoainmejxanrownbuz
-- Click: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new

-- Create test pod members for testing pod amplification
-- This is TEMPORARY test data - will be cleaned up after refactor

-- Create test client_id (using existing client or create dummy one)
DO $$
DECLARE
  test_client_id UUID;
  test_user_id_1 UUID;
  test_user_id_2 UUID;
  roderic_user_id UUID := '5ccd18cd-476a-4923-a6c4-b6cc7b4c5b84'; -- Your user ID
BEGIN
  -- Get or create test client (representing a "pod" temporarily)
  SELECT id INTO test_client_id FROM clients LIMIT 1;

  IF test_client_id IS NULL THEN
    INSERT INTO clients (name, agency_id, slug)
    VALUES ('Test Pod - Courageous Bear', 'c3ae8595-ba0a-44c8-aa44-db0bdfc3f951', 'test-pod-courageous-bear')
    RETURNING id INTO test_client_id;
  END IF;

  -- Create test user 1 (pod member 1)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'test-pod-member-1@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"email_verified":true}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
  RETURNING id INTO test_user_id_1;

  -- Create test user 2 (pod member 2)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'test-pod-member-2@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"email_verified":true}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
  RETURNING id INTO test_user_id_2;

  -- Create users table entries
  INSERT INTO users (id, email, client_id, agency_id, first_name, last_name)
  VALUES
    (test_user_id_1, 'test-pod-member-1@example.com', test_client_id, 'c3ae8595-ba0a-44c8-aa44-db0bdfc3f951', 'Test', 'Member One'),
    (test_user_id_2, 'test-pod-member-2@example.com', test_client_id, 'c3ae8595-ba0a-44c8-aa44-db0bdfc3f951', 'Test', 'Member Two')
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

  -- Create pod_members entries
  INSERT INTO pod_members (
    client_id,
    user_id,
    name,
    email,
    linkedin_url,
    unipile_account_id,
    is_active,
    onboarding_status,
    invite_token,
    invite_sent_at
  ) VALUES
    (
      test_client_id,
      test_user_id_1,
      'Test Member One',
      'test-pod-member-1@example.com',
      'https://www.linkedin.com/in/test-member-1',
      'UNIPILE_TEST_ACCOUNT_1',
      true,
      'active',
      'test-token-1',
      NOW()
    ),
    (
      test_client_id,
      test_user_id_2,
      'Test Member Two',
      'test-pod-member-2@example.com',
      'https://www.linkedin.com/in/test-member-2',
      'UNIPILE_TEST_ACCOUNT_2',
      true,
      'active',
      'test-token-2',
      NOW()
    ),
    (
      test_client_id,
      roderic_user_id,
      'Roderic Andrews',
      'rodericandrews@icloud.com',
      'https://www.linkedin.com/in/rodericandrews',
      'YOUR_REAL_UNIPILE_ACCOUNT_ID',
      true,
      'active',
      'roderic-token',
      NOW()
    )
  ON CONFLICT (email) DO UPDATE SET
    is_active = EXCLUDED.is_active,
    onboarding_status = EXCLUDED.onboarding_status;

  RAISE NOTICE 'Test pod members created successfully!';
  RAISE NOTICE 'Test Client ID: %', test_client_id;
  RAISE NOTICE 'Test User 1 ID: %', test_user_id_1;
  RAISE NOTICE 'Test User 2 ID: %', test_user_id_2;
END $$;

-- Verify creation
SELECT
  pm.id,
  pm.name,
  pm.email,
  pm.is_active,
  pm.onboarding_status,
  pm.client_id as pod_id
FROM pod_members pm
WHERE pm.is_active = true
  AND pm.onboarding_status = 'active';
