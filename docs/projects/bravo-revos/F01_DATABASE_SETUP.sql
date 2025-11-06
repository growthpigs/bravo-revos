-- F-01 AgentKit Testing - Database Setup
-- Run this SQL directly (NO markdown formatting)
-- Copy and paste the queries below into your database client

-- Create test campaign
INSERT INTO campaigns (id, name, trigger_word, lead_magnet_id, client_id, status)
VALUES (
  'campaign-test-001',
  'Test AI Campaign',
  'SCALE',
  'lead-magnet-test-001',
  'client-test-001',
  'active'
);

-- Create test pod with members
INSERT INTO pods (id, name, voice_cartridge_id)
VALUES ('pod-test-001', 'Test Pod', NULL);

-- Create pod members
INSERT INTO pod_members (id, pod_id, profile_id)
VALUES
  ('member-1', 'pod-test-001', 'profile-123'),
  ('member-2', 'pod-test-001', 'profile-456'),
  ('member-3', 'pod-test-001', 'profile-789');

-- Create test post
INSERT INTO posts (
  id,
  campaign_id,
  linkedin_post_id,
  linkedin_post_url,
  published_at
)
VALUES (
  'post-test-001',
  'campaign-test-001',
  'urn:li:activity:7234567890123456789',
  'https://www.linkedin.com/feed/update/urn:li:activity:7234567890123456789/',
  NOW()
);

-- Verify setup worked
SELECT 'Campaigns' as table_name, COUNT(*) as count FROM campaigns WHERE id = 'campaign-test-001'
UNION ALL
SELECT 'Pods', COUNT(*) FROM pods WHERE id = 'pod-test-001'
UNION ALL
SELECT 'Pod Members', COUNT(*) FROM pod_members WHERE pod_id = 'pod-test-001'
UNION ALL
SELECT 'Posts', COUNT(*) FROM posts WHERE id = 'post-test-001';
