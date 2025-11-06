-- Migration 005: Add campaign_id foreign key to posts table
-- This implements the specification: posts belong to campaigns
-- Reference: docs/projects/bravo-revos/data-model.md
-- Required by: F-01 Campaign Orchestration feature

-- Step 1: Add campaign_id column to posts (if it doesn't exist)
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE;

-- Step 2: Create index for performance (queries filtering by campaign_id)
CREATE INDEX IF NOT EXISTS idx_posts_campaign ON posts(campaign_id);

-- Step 3: Document the relationship
-- Posts are now linked to campaigns via campaign_id foreign key
-- This allows:
-- - Querying all posts for a campaign
-- - Campaign deletion cascades to posts
-- - Efficient filtering and joins

-- Note: campaign_id is currently nullable to allow for migration of existing data
-- To enforce NOT NULL, run:
-- ALTER TABLE posts ALTER COLUMN campaign_id SET NOT NULL;
-- (after all posts have been assigned to campaigns)
