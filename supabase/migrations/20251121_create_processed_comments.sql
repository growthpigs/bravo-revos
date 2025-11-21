-- Supabase Project: trdoainmejxanrownbuz
-- Click: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new

-- Track processed comments to avoid duplicate DM triggers
CREATE TABLE IF NOT EXISTS processed_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id TEXT NOT NULL UNIQUE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  post_id TEXT NOT NULL,
  commenter_linkedin_id TEXT NOT NULL,
  trigger_word TEXT,
  dm_queued BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient lookups
CREATE INDEX idx_processed_comments_campaign ON processed_comments(campaign_id);
CREATE INDEX idx_processed_comments_post ON processed_comments(post_id);
CREATE INDEX idx_processed_comments_processed_at ON processed_comments(processed_at);

-- RLS
ALTER TABLE processed_comments ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for workers)
CREATE POLICY "Service role full access" ON processed_comments
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE processed_comments IS 'Tracks which LinkedIn comments have been processed to avoid duplicate DM triggers';
