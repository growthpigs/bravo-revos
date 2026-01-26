-- F-01 AgentKit Testing - FINAL Database Setup
-- Complete test data in one transaction
-- All steps linked together with CTEs (Common Table Expressions)

WITH client_insert AS (
  -- Step 1: Create test client (required by foreign key constraint)
  INSERT INTO clients (id, name, slug)
  VALUES (
    '550e8400-e29b-41d4-a716-446655440000'::uuid,
    'Test Client for F-01',
    'test-client-f01'
  )
  RETURNING id as client_id
),

campaign_insert AS (
  -- Step 2: Create test campaign (uses client_id from Step 1)
  INSERT INTO campaigns (client_id, name, description, trigger_words, status)
  SELECT
    c.client_id,
    'Test AI Campaign',
    'Test campaign for F-01 orchestration testing',
    ARRAY['SCALE'],
    'active'
  FROM client_insert c
  RETURNING id as campaign_id
),

pod_insert AS (
  -- Step 3: Create test pod (uses client_id from Step 1)
  INSERT INTO pods (client_id, name, min_members, auto_engage, status)
  SELECT
    c.client_id,
    'Test Pod',
    3,
    false,
    'active'
  FROM client_insert c
  RETURNING id as pod_id
),

pod_members_insert AS (
  -- Step 4: Create pod members (uses pod_id from Step 3)
  INSERT INTO pod_members (pod_id, linkedin_account_id, role, joined_at)
  SELECT
    p.pod_id,
    gen_uuid,
    'member',
    NOW()
  FROM pod_insert p
  CROSS JOIN (
    VALUES
      ('550e8400-e29b-41d4-a716-446655440010'::uuid),
      ('550e8400-e29b-41d4-a716-446655440011'::uuid),
      ('550e8400-e29b-41d4-a716-446655440012'::uuid)
  ) AS uuids(gen_uuid)
  RETURNING id
),

post_insert AS (
  -- Step 5: Create test post (uses campaign_id from Step 2)
  INSERT INTO posts (campaign_id, linkedin_account_id, unipile_post_id, content, url, posted_at)
  SELECT
    c.campaign_id,
    '550e8400-e29b-41d4-a716-446655440020'::uuid,
    'urn:li:activity:7234567890123456789',
    'Test post content for F-01 orchestration testing',
    'https://www.linkedin.com/feed/update/urn:li:activity:7234567890123456789/',
    NOW()
  FROM campaign_insert c
  RETURNING id as post_id
)

-- VERIFY: Check all test data was created successfully
SELECT 'Clients' as table_name, COUNT(*) as count FROM clients WHERE slug = 'test-client-f01'
UNION ALL
SELECT 'Campaigns', COUNT(*) FROM campaigns WHERE name = 'Test AI Campaign'
UNION ALL
SELECT 'Pods', COUNT(*) FROM pods WHERE name = 'Test Pod'
UNION ALL
SELECT 'Pod Members', COUNT(*) FROM pod_members WHERE role = 'member' AND joined_at > NOW() - INTERVAL '1 minute'
UNION ALL
SELECT 'Posts', COUNT(*) FROM posts WHERE unipile_post_id = 'urn:li:activity:7234567890123456789';
