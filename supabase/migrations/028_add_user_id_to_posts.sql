-- ============================================================
-- Migration: Add user_id to posts table
-- Purpose: Track which user created/scheduled each post
-- ============================================================

ALTER TABLE posts
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);

COMMENT ON COLUMN posts.user_id IS 'User who created/scheduled this post';
