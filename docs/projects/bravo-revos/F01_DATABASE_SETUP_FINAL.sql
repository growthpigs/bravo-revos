-- F-01 AgentKit Testing - FINAL Database Setup
-- Uses ONLY columns that actually exist in your schema
-- Uses proper UUIDs for all IDs

-- Step 1: Create test campaign (no lead_magnet_id, use real UUID for client_id)
INSERT INTO campaigns (client_id, name, description, trigger_words, status)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000'::uuid,  -- Real UUID for client_id
  'Test AI Campaign',
  'Test campaign for F-01 orchestration testing',
  'SCALE',
  'active'
)
RETURNING id as campaign_id;

-- COPY THE campaign_id FROM ABOVE

-- Step 2: Create test pod (auto-generates UUID)
INSERT INTO pods (name)
VALUES ('Test Pod')
RETURNING id as pod_id;

-- COPY THE pod_id FROM ABOVE

-- Step 3: Create pod members (use the pod_id from above)
INSERT INTO pod_members (id, pod_id, profile_id)
VALUES
  ('550e8400-e29b-41d4-a716-446655440001'::uuid, 'POD_ID_HERE', 'profile-123'),
  ('550e8400-e29b-41d4-a716-446655440002'::uuid, 'POD_ID_HERE', 'profile-456'),
  ('550e8400-e29b-41d4-a716-446655440003'::uuid, 'POD_ID_HERE', 'profile-789');

-- Step 4: Create test post (use campaign_id from Step 1)
INSERT INTO posts (id, campaign_id, linkedin_post_id, linkedin_post_url, published_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440004'::uuid,
  'CAMPAIGN_ID_HERE',
  'urn:li:activity:7234567890123456789',
  'https://www.linkedin.com/feed/update/urn:li:activity:7234567890123456789/',
  NOW()
)
RETURNING id as post_id;

-- VERIFY: Check all test data was created
-- Should return: 1, 1, 3, 1
SELECT 'Campaigns' as table_name, COUNT(*) as count FROM campaigns WHERE name = 'Test AI Campaign'
UNION ALL
SELECT 'Pods', COUNT(*) FROM pods WHERE name = 'Test Pod'
UNION ALL
SELECT 'Pod Members', COUNT(*) FROM pod_members WHERE profile_id IN ('profile-123', 'profile-456', 'profile-789')
UNION ALL
SELECT 'Posts', COUNT(*) FROM posts WHERE linkedin_post_id = 'urn:li:activity:7234567890123456789';
