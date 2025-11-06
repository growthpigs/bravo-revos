-- F-01 AgentKit Testing - Simplified Database Setup
-- This version creates minimal test data without relying on foreign keys

-- Step 1: Check if campaigns table has trigger_word column
-- If this fails with "column does not exist", your database needs migration
SELECT column_name FROM information_schema.columns
WHERE table_name='campaigns' AND column_name='trigger_word';

-- Step 2: Create test campaign (minimal fields)
-- Adjust based on what columns actually exist in your campaigns table
INSERT INTO campaigns (name, client_id, status)
VALUES ('Test AI Campaign', 'client-test-001', 'active')
RETURNING id as campaign_id;

-- Copy the returned campaign_id above and use it below as {CAMPAIGN_ID}

-- Step 3: Create test pod
INSERT INTO pods (name)
VALUES ('Test Pod')
RETURNING id as pod_id;

-- Copy the returned pod_id above and use it below as {POD_ID}

-- Step 4: Create pod members (replace {POD_ID} with actual ID from above)
INSERT INTO pod_members (pod_id, profile_id)
VALUES
  ('{POD_ID}', 'profile-123'),
  ('{POD_ID}', 'profile-456'),
  ('{POD_ID}', 'profile-789');

-- Step 5: Create test post (replace {CAMPAIGN_ID} and {POD_ID})
INSERT INTO posts (campaign_id, linkedin_post_id, linkedin_post_url, published_at)
VALUES (
  '{CAMPAIGN_ID}',
  'urn:li:activity:7234567890123456789',
  'https://www.linkedin.com/feed/update/urn:li:activity:7234567890123456789/',
  NOW()
)
RETURNING id as post_id;

-- VERIFY: Check all test data was created
SELECT 'Campaigns' as table_name, COUNT(*) as count FROM campaigns WHERE name = 'Test AI Campaign'
UNION ALL
SELECT 'Pods', COUNT(*) FROM pods WHERE name = 'Test Pod'
UNION ALL
SELECT 'Pod Members', COUNT(*) FROM pod_members WHERE profile_id IN ('profile-123', 'profile-456', 'profile-789')
UNION ALL
SELECT 'Posts', COUNT(*) FROM posts WHERE linkedin_post_id = 'urn:li:activity:7234567890123456789';
