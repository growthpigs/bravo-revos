-- Fix RLS Policies for knowledge_base_documents
-- The original policies had syntax issues; this recreates them with corrected syntax

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their client's documents" ON knowledge_base_documents;
DROP POLICY IF EXISTS "Users can create documents for their client" ON knowledge_base_documents;
DROP POLICY IF EXISTS "Users can update their documents" ON knowledge_base_documents;
DROP POLICY IF EXISTS "Users can delete their documents" ON knowledge_base_documents;

-- Recreate policies with simpler, more reliable syntax
CREATE POLICY "Users can view their client's documents"
  ON knowledge_base_documents FOR SELECT
  USING (
    client_id = (
      SELECT client_id FROM users WHERE id = auth.uid() LIMIT 1
    )
  );

CREATE POLICY "Users can create documents for their client"
  ON knowledge_base_documents FOR INSERT
  WITH CHECK (
    client_id = (
      SELECT client_id FROM users WHERE id = auth.uid() LIMIT 1
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update their own documents"
  ON knowledge_base_documents FOR UPDATE
  USING (
    client_id = (
      SELECT client_id FROM users WHERE id = auth.uid() LIMIT 1
    )
  );

CREATE POLICY "Users can delete their own documents"
  ON knowledge_base_documents FOR DELETE
  USING (
    client_id = (
      SELECT client_id FROM users WHERE id = auth.uid() LIMIT 1
    )
  );

-- Drop and recreate document_embeddings policies
DROP POLICY IF EXISTS "Users can view embeddings for their client's documents" ON document_embeddings;
DROP POLICY IF EXISTS "Service role can insert embeddings" ON document_embeddings;

CREATE POLICY "Users can view embeddings for their client's documents"
  ON document_embeddings FOR SELECT
  USING (
    document_id IN (
      SELECT id FROM knowledge_base_documents
      WHERE client_id = (
        SELECT client_id FROM users WHERE id = auth.uid() LIMIT 1
      )
    )
  );

CREATE POLICY "Service role can insert embeddings"
  ON document_embeddings FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Drop and recreate campaign_documents policies
DROP POLICY IF EXISTS "Users can view campaign documents for their client's campaigns" ON campaign_documents;
DROP POLICY IF EXISTS "Users can create campaign document links for their client" ON campaign_documents;
DROP POLICY IF EXISTS "Users can delete campaign document links for their client" ON campaign_documents;

CREATE POLICY "Users can view campaign documents for their client's campaigns"
  ON campaign_documents FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns
      WHERE client_id = (
        SELECT client_id FROM users WHERE id = auth.uid() LIMIT 1
      )
    )
  );

CREATE POLICY "Users can create campaign document links for their client"
  ON campaign_documents FOR INSERT
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM campaigns
      WHERE client_id = (
        SELECT client_id FROM users WHERE id = auth.uid() LIMIT 1
      )
    )
  );

CREATE POLICY "Users can delete campaign document links for their client"
  ON campaign_documents FOR DELETE
  USING (
    campaign_id IN (
      SELECT id FROM campaigns
      WHERE client_id = (
        SELECT client_id FROM users WHERE id = auth.uid() LIMIT 1
      )
    )
  );
