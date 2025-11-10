-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Knowledge Base Documents table
-- Stores text/markdown, file references, and URLs for each client's knowledge base
CREATE TABLE knowledge_base_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,  -- For markdown/text documents
  file_url TEXT,  -- For uploaded files stored in Supabase Storage
  file_type TEXT,  -- 'markdown', 'pdf', 'docx', 'url', etc.
  url TEXT,  -- For external link references
  metadata JSONB DEFAULT '{}',  -- Flexible metadata: tags, author notes, etc.
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document Embeddings table
-- Stores vector embeddings for semantic search
-- Supports chunked embeddings for large documents
CREATE TABLE document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES knowledge_base_documents(id) ON DELETE CASCADE,
  embedding VECTOR(1536),  -- OpenAI ada-002 embedding dimension
  chunk_index INTEGER DEFAULT 0,  -- Index for multi-chunk documents
  chunk_text TEXT,  -- The text that was embedded
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign Documents junction table
-- Links documents to campaigns for context-aware operations
CREATE TABLE campaign_documents (
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES knowledge_base_documents(id) ON DELETE CASCADE,
  added_by UUID REFERENCES users(id) ON DELETE SET NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (campaign_id, document_id)
);

-- Indexes for performance
CREATE INDEX idx_kb_docs_client ON knowledge_base_documents(client_id);
CREATE INDEX idx_kb_docs_created ON knowledge_base_documents(created_at DESC);
CREATE INDEX idx_kb_docs_title ON knowledge_base_documents(title);
CREATE INDEX idx_embeddings_doc_id ON document_embeddings(document_id);
CREATE INDEX idx_embeddings_vector ON document_embeddings USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_campaign_docs_campaign ON campaign_documents(campaign_id);
CREATE INDEX idx_campaign_docs_document ON campaign_documents(document_id);

-- Enable Row Level Security
ALTER TABLE knowledge_base_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for knowledge_base_documents
-- Users can view documents from their client
CREATE POLICY "Users can view their client's documents"
  ON knowledge_base_documents FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM users WHERE id = auth.uid()
    )
  );

-- Users can create documents for their client
CREATE POLICY "Users can create documents for their client"
  ON knowledge_base_documents FOR INSERT
  WITH CHECK (
    client_id IN (
      SELECT client_id FROM users WHERE id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- Users can update their own documents
CREATE POLICY "Users can update their documents"
  ON knowledge_base_documents FOR UPDATE
  USING (
    client_id IN (
      SELECT client_id FROM users WHERE id = auth.uid()
    )
  );

-- Users can delete their own documents
CREATE POLICY "Users can delete their documents"
  ON knowledge_base_documents FOR DELETE
  USING (
    client_id IN (
      SELECT client_id FROM users WHERE id = auth.uid()
    )
  );

-- RLS Policies for document_embeddings
-- Users can view embeddings for their client's documents
CREATE POLICY "Users can view embeddings for their documents"
  ON document_embeddings FOR SELECT
  USING (
    document_id IN (
      SELECT id FROM knowledge_base_documents
      WHERE client_id IN (
        SELECT client_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Service role can insert embeddings during document creation
CREATE POLICY "Service role can manage embeddings"
  ON document_embeddings FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for campaign_documents
-- Users can view campaign document links from their client's campaigns
CREATE POLICY "Users can view their campaign document links"
  ON campaign_documents FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns
      WHERE client_id IN (
        SELECT client_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Users can add documents to their campaigns
CREATE POLICY "Users can link documents to their campaigns"
  ON campaign_documents FOR INSERT
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM campaigns
      WHERE client_id IN (
        SELECT client_id FROM users WHERE id = auth.uid()
      )
    )
    AND document_id IN (
      SELECT id FROM knowledge_base_documents
      WHERE client_id IN (
        SELECT client_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Users can remove document links from their campaigns
CREATE POLICY "Users can unlink documents from their campaigns"
  ON campaign_documents FOR DELETE
  USING (
    campaign_id IN (
      SELECT id FROM campaigns
      WHERE client_id IN (
        SELECT client_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Create Supabase Storage bucket for knowledge base files (if not exists)
-- Note: This is a placeholder - bucket creation should be done via Supabase UI or API
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('knowledge-base-files', 'knowledge-base-files', false)
-- ON CONFLICT (id) DO NOTHING;
