-- Supabase Project: kvjcidxbyimoswntpjcp
-- Click to open in SQL editor: https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp/sql/new
--
-- Chat Sessions and Messages Tables
-- Stores conversation state for V2 chat system with session persistence

-- ==================================================
-- Chat Sessions Table
-- ==================================================

CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  -- Session metadata
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,

  -- Session context
  voice_id UUID REFERENCES cartridges(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Indexes
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT fk_user
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE
);

-- ==================================================
-- Chat Messages Table
-- ==================================================

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,

  -- Message content
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,

  -- Optional fields for tool calls
  tool_calls JSONB,
  tool_call_id TEXT,
  name TEXT,

  -- Message metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Indexes
  CONSTRAINT valid_role CHECK (role IN ('user', 'assistant', 'system', 'tool'))
);

-- ==================================================
-- Indexes
-- ==================================================

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id
  ON chat_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_active
  ON chat_sessions(last_active_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_voice_id
  ON chat_sessions(voice_id) WHERE voice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id
  ON chat_messages(session_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at
  ON chat_messages(session_id, created_at);

-- ==================================================
-- Row Level Security (RLS)
-- ==================================================

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Chat Sessions Policies
CREATE POLICY "Users can view their own chat sessions"
  ON chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat sessions"
  ON chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat sessions"
  ON chat_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat sessions"
  ON chat_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Chat Messages Policies
CREATE POLICY "Users can view messages in their sessions"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in their sessions"
  ON chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update messages in their sessions"
  ON chat_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages in their sessions"
  ON chat_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

-- ==================================================
-- Functions
-- ==================================================

-- Function to update last_active_at on message insert
CREATE OR REPLACE FUNCTION update_session_last_active()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_sessions
  SET last_active_at = NOW()
  WHERE id = NEW.session_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update session activity
CREATE TRIGGER trigger_update_session_activity
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_session_last_active();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chat_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER trigger_chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_sessions_updated_at();

-- ==================================================
-- Comments
-- ==================================================

COMMENT ON TABLE chat_sessions IS 'Stores chat conversation sessions for V2 chat system';
COMMENT ON TABLE chat_messages IS 'Stores individual messages within chat sessions';
COMMENT ON COLUMN chat_sessions.voice_id IS 'Optional voice cartridge applied to this session';
COMMENT ON COLUMN chat_sessions.metadata IS 'Flexible storage for session-specific data';
COMMENT ON COLUMN chat_messages.tool_calls IS 'Agent tool calls (for assistant messages)';
COMMENT ON COLUMN chat_messages.tool_call_id IS 'ID of tool call this message responds to';
COMMENT ON COLUMN chat_messages.name IS 'Name of tool for tool messages';
