-- F-01 AgentKit Testing - Database Setup (CORRECTED FOR ACTUAL SCHEMA)
-- Your campaigns table has these columns:
-- id, client_id, name, description, trigger_words, status, created_at, updated_at

-- Step 1: Create test campaign (using actual column names)
INSERT INTO campaigns (client_id, name, description, trigger_words, status)
VALUES (
  'client-test-001',
  'Test AI Campaign',
  'Test campaign for F-01 orchestration testing',
  'SCALE',
  'active'
)
RETURNING id as campaign_id;

-- COPY THE CAMPAIGN_ID FROM ABOVE AND PASTE BELOW

-- Step 2: Create test pod
INSERT INTO pods (name)
VALUES ('Test Pod')
RETURNING id as pod_id;

-- COPY THE POD_ID FROM ABOVE AND PASTE BELOW

-- Step 3: Create pod members (replace POD_ID_HERE with your pod ID from above)
INSERT INTO pod_members (pod_id, profile_id)
VALUES
  ('POD_ID_HERE', 'profile-123'),
  ('POD_ID_HERE', 'profile-456'),
  ('POD_ID_HERE', 'profile-789');

-- Step 4: Create test post (replace CAMPAIGN_ID_HERE with campaign ID from above)
INSERT INTO posts (campaign_id, linkedin_post_id, linkedin_post_url, published_at)
VALUES (
  'CAMPAIGN_ID_HERE',
  'urn:li:activity:7234567890123456789',
  'https://www.linkedin.com/feed/update/urn:li:activity:7234567890123456789/',
  NOW()
)
RETURNING id as post_id;

-- COPY THE POST_ID FROM ABOVE FOR REFERENCE

-- VERIFY: Check all test data was created
-- This should return counts of 1, 1, 3, 1
SELECT 'Campaigns' as table_name, COUNT(*) as count FROM campaigns WHERE name = 'Test AI Campaign'
UNION ALL
SELECT 'Pods', COUNT(*) FROM pods WHERE name = 'Test Pod'
UNION ALL
SELECT 'Pod Members', COUNT(*) FROM pod_members WHERE profile_id IN ('profile-123', 'profile-456', 'profile-789')
UNION ALL
SELECT 'Posts', COUNT(*) FROM posts WHERE linkedin_post_id = 'urn:li:activity:7234567890123456789';
