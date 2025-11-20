-- Supabase Project: trdoainmejxanrownbuz
-- Click: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new

-- Create gemini_documents table for storing indexed documents
CREATE TABLE IF NOT EXISTS gemini_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- File info
  filename TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'general',
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,

  -- Storage references
  supabase_path TEXT NOT NULL,
  gemini_file_uri TEXT NOT NULL,

  -- Metadata for filtering
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_gemini_documents_client_id ON gemini_documents(client_id);
CREATE INDEX idx_gemini_documents_user_id ON gemini_documents(user_id);
CREATE INDEX idx_gemini_documents_document_type ON gemini_documents(document_type);
CREATE INDEX idx_gemini_documents_metadata ON gemini_documents USING GIN (metadata);

-- RLS Policies
ALTER TABLE gemini_documents ENABLE ROW LEVEL SECURITY;

-- Users can view their own documents
CREATE POLICY "Users can view own documents"
  ON gemini_documents FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own documents
CREATE POLICY "Users can insert own documents"
  ON gemini_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own documents
CREATE POLICY "Users can update own documents"
  ON gemini_documents FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own documents
CREATE POLICY "Users can delete own documents"
  ON gemini_documents FOR DELETE
  USING (auth.uid() = user_id);

-- Service role has full access
CREATE POLICY "Service role full access"
  ON gemini_documents
  USING (current_setting('role') = 'service_role');

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_gemini_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gemini_documents_updated_at
  BEFORE UPDATE ON gemini_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_gemini_documents_updated_at();

-- Comments
COMMENT ON TABLE gemini_documents IS 'Documents indexed in Gemini File Search for RAG';
COMMENT ON COLUMN gemini_documents.gemini_file_uri IS 'Gemini File API URI (projects/xxx/files/yyy)';
COMMENT ON COLUMN gemini_documents.document_type IS 'Type: brand, style, financial, research, general';
