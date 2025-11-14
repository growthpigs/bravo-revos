-- Supabase Project: kvjcidxbyimoswntpjcp
-- Click: https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp/sql/new
-- Migration: Add 4 new client cartridge types (Style, Preferences, Instructions, Brand)

-- 1. STYLE CARTRIDGES TABLE
CREATE TABLE IF NOT EXISTS style_cartridges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,

  -- Uploaded files for style learning
  source_files JSONB DEFAULT '[]'::jsonb, -- [{file_path, file_name, file_type, uploaded_at}]

  -- AI-extracted style parameters
  learned_style JSONB DEFAULT '{}'::jsonb, -- {vocabulary_level, sentence_structure, tone_patterns, etc}

  -- Mem0 namespace for persistent style memory
  mem0_namespace TEXT, -- Generated: style::marketing::{tenantId}

  -- Status tracking
  analysis_status TEXT DEFAULT 'pending', -- pending, analyzing, completed, failed
  last_analyzed_at TIMESTAMPTZ,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PREFERENCE CARTRIDGES TABLE
CREATE TABLE IF NOT EXISTS preference_cartridges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Preferences',

  -- Simple preference fields
  language TEXT DEFAULT 'English',
  platform TEXT DEFAULT 'LinkedIn', -- LinkedIn, Twitter, Facebook, Email, Instagram
  tone TEXT DEFAULT 'Professional', -- Professional, Casual, Friendly, Authoritative, Playful
  content_length TEXT DEFAULT 'Medium', -- Short (50-100), Medium (100-200), Long (200+)

  -- Additional preferences
  use_emojis BOOLEAN DEFAULT false,
  use_hashtags BOOLEAN DEFAULT true,
  hashtag_count INTEGER DEFAULT 3,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. INSTRUCTION CARTRIDGES TABLE
CREATE TABLE IF NOT EXISTS instruction_cartridges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,

  -- Training documents
  training_docs JSONB DEFAULT '[]'::jsonb, -- [{file_path, file_name, file_type, uploaded_at}]

  -- AI-processed knowledge base
  extracted_knowledge JSONB DEFAULT '{}'::jsonb, -- {concepts, frameworks, guidelines, examples}

  -- Mem0 namespace for persistent instruction memory
  mem0_namespace TEXT, -- Generated: instructions::marketing::{tenantId}

  -- Processing status
  process_status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  last_processed_at TIMESTAMPTZ,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. BRAND CARTRIDGES TABLE
CREATE TABLE IF NOT EXISTS brand_cartridges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Brand',

  -- Company information
  company_name TEXT,
  company_description TEXT,
  company_tagline TEXT,
  industry TEXT,
  target_audience TEXT,

  -- Brand values and voice
  core_values TEXT[], -- Array of value statements
  brand_voice TEXT, -- How the brand speaks
  brand_personality TEXT[], -- Array of personality traits

  -- Visual assets
  logo_url TEXT, -- Path in brand-assets bucket
  logo_uploaded_at TIMESTAMPTZ,

  -- Brand colors
  brand_colors JSONB DEFAULT '{}'::jsonb, -- {primary: '#000000', secondary: '#FFFFFF', accent: '#0066CC'}

  -- Social media
  social_links JSONB DEFAULT '{}'::jsonb, -- {linkedin: 'url', twitter: 'url', website: 'url'}

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CREATE STORAGE BUCKETS

-- Style documents bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'style-documents',
  'style-documents',
  false,
  10485760, -- 10MB
  ARRAY['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/markdown']
) ON CONFLICT (id) DO NOTHING;

-- Instruction documents bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'instruction-documents',
  'instruction-documents',
  false,
  10485760, -- 10MB
  ARRAY['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/markdown', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
) ON CONFLICT (id) DO NOTHING;

-- Brand assets bucket (for logos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brand-assets',
  'brand-assets',
  false,
  5242880, -- 5MB
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- RLS POLICIES

-- Style Cartridges RLS
ALTER TABLE style_cartridges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own style cartridges"
  ON style_cartridges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own style cartridges"
  ON style_cartridges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own style cartridges"
  ON style_cartridges FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own style cartridges"
  ON style_cartridges FOR DELETE
  USING (auth.uid() = user_id);

-- Preference Cartridges RLS
ALTER TABLE preference_cartridges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preference cartridges"
  ON preference_cartridges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own preference cartridges"
  ON preference_cartridges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preference cartridges"
  ON preference_cartridges FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preference cartridges"
  ON preference_cartridges FOR DELETE
  USING (auth.uid() = user_id);

-- Instruction Cartridges RLS
ALTER TABLE instruction_cartridges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own instruction cartridges"
  ON instruction_cartridges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own instruction cartridges"
  ON instruction_cartridges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own instruction cartridges"
  ON instruction_cartridges FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own instruction cartridges"
  ON instruction_cartridges FOR DELETE
  USING (auth.uid() = user_id);

-- Brand Cartridges RLS
ALTER TABLE brand_cartridges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own brand cartridges"
  ON brand_cartridges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own brand cartridges"
  ON brand_cartridges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brand cartridges"
  ON brand_cartridges FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own brand cartridges"
  ON brand_cartridges FOR DELETE
  USING (auth.uid() = user_id);

-- Storage Bucket RLS Policies

-- Style Documents Storage RLS
CREATE POLICY "Users can view their own style documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'style-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload style documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'style-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own style documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'style-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Instruction Documents Storage RLS
CREATE POLICY "Users can view their own instruction documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'instruction-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload instruction documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'instruction-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own instruction documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'instruction-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Brand Assets Storage RLS
CREATE POLICY "Users can view their own brand assets"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'brand-assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload brand assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'brand-assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own brand assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'brand-assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_style_cartridges_user_id ON style_cartridges(user_id);
CREATE INDEX IF NOT EXISTS idx_preference_cartridges_user_id ON preference_cartridges(user_id);
CREATE INDEX IF NOT EXISTS idx_instruction_cartridges_user_id ON instruction_cartridges(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_cartridges_user_id ON brand_cartridges(user_id);

-- Update triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_style_cartridges_updated_at
  BEFORE UPDATE ON style_cartridges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_preference_cartridges_updated_at
  BEFORE UPDATE ON preference_cartridges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_instruction_cartridges_updated_at
  BEFORE UPDATE ON instruction_cartridges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brand_cartridges_updated_at
  BEFORE UPDATE ON brand_cartridges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();