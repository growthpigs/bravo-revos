-- ============================================================
-- SUPABASE STORAGE: LEAD MAGNETS BUCKET
-- ============================================================

-- Create the lead-magnets bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lead-magnets',
  'lead-magnets',
  false, -- Private bucket
  10485760, -- 10MB in bytes
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', -- DOCX
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', -- PPTX
    'application/zip'
  ]
);

-- ============================================================
-- RLS POLICIES: TENANT-ISOLATED ACCESS
-- ============================================================

-- Policy 1: Clients can upload files to their own folder
CREATE POLICY "Clients can upload to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lead-magnets' AND
  (storage.foldername(name))[1] = auth.jwt() ->> 'client_id'
);

-- Policy 2: Clients can read their own files
CREATE POLICY "Clients can read own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'lead-magnets' AND
  (storage.foldername(name))[1] = auth.jwt() ->> 'client_id'
);

-- Policy 3: Clients can update their own files
CREATE POLICY "Clients can update own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'lead-magnets' AND
  (storage.foldername(name))[1] = auth.jwt() ->> 'client_id'
)
WITH CHECK (
  bucket_id = 'lead-magnets' AND
  (storage.foldername(name))[1] = auth.jwt() ->> 'client_id'
);

-- Policy 4: Clients can delete their own files
CREATE POLICY "Clients can delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'lead-magnets' AND
  (storage.foldername(name))[1] = auth.jwt() ->> 'client_id'
);

-- ============================================================
-- HELPER FUNCTION: GET CLIENT_ID FROM AUTH
-- ============================================================

-- Function to get client_id for the current user
CREATE OR REPLACE FUNCTION get_current_client_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_client_id UUID;
BEGIN
  SELECT client_id INTO user_client_id
  FROM users
  WHERE id = auth.uid();

  RETURN user_client_id;
END;
$$;

-- ============================================================
-- UPDATED RLS POLICIES USING HELPER FUNCTION
-- ============================================================

-- Drop the previous policies
DROP POLICY IF EXISTS "Clients can upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Clients can read own files" ON storage.objects;
DROP POLICY IF EXISTS "Clients can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Clients can delete own files" ON storage.objects;

-- Policy 1: Clients can upload files to their own folder (using helper)
CREATE POLICY "Clients can upload to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lead-magnets' AND
  (storage.foldername(name))[1] = get_current_client_id()::text
);

-- Policy 2: Clients can read their own files (using helper)
CREATE POLICY "Clients can read own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'lead-magnets' AND
  (storage.foldername(name))[1] = get_current_client_id()::text
);

-- Policy 3: Clients can update their own files (using helper)
CREATE POLICY "Clients can update own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'lead-magnets' AND
  (storage.foldername(name))[1] = get_current_client_id()::text
)
WITH CHECK (
  bucket_id = 'lead-magnets' AND
  (storage.foldername(name))[1] = get_current_client_id()::text
);

-- Policy 4: Clients can delete their own files (using helper)
CREATE POLICY "Clients can delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'lead-magnets' AND
  (storage.foldername(name))[1] = get_current_client_id()::text
);

-- ============================================================
-- HELPER FUNCTION: INCREMENT DOWNLOAD COUNT
-- ============================================================

-- Function to increment download count atomically
CREATE OR REPLACE FUNCTION increment_download_count(lead_magnet_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE lead_magnets
  SET download_count = download_count + 1
  WHERE id = lead_magnet_id;
END;
$$;

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON FUNCTION get_current_client_id() IS
'Returns the client_id for the authenticated user. Used for RLS policies in storage.';

COMMENT ON FUNCTION increment_download_count(UUID) IS
'Atomically increments the download_count for a lead magnet.';
