-- RevOS Pre-Work: Storage Buckets Setup
-- Run this in Supabase SQL Editor OR use Supabase Dashboard → Storage
-- Project: kvjcidxbyimoswntpjcp
-- Link: https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp/storage/buckets

-- ===================================
-- BUCKET 1: lead-magnets
-- ===================================
-- Purpose: Store lead magnet files (PDFs, videos, guides)
-- Access: Public read (so lead magnet landing pages can display files)
-- Max file size: 50MB

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lead-magnets',
  'lead-magnets',
  true,  -- public read access
  52428800,  -- 50MB in bytes
  ARRAY[
    'application/pdf',
    'video/mp4',
    'video/quicktime',
    'image/jpeg',
    'image/png',
    'application/zip'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS Policy: Clients can upload their own lead magnets
CREATE POLICY "Clients can upload lead magnets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lead-magnets'
  AND (storage.foldername(name))[1] = (
    SELECT client_id::text
    FROM users
    WHERE id = auth.uid()
  )
);

-- RLS Policy: Public can view lead magnets
CREATE POLICY "Public can view lead magnets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'lead-magnets');

-- RLS Policy: Clients can delete their own lead magnets
CREATE POLICY "Clients can delete their lead magnets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'lead-magnets'
  AND (storage.foldername(name))[1] = (
    SELECT client_id::text
    FROM users
    WHERE id = auth.uid()
  )
);

-- ===================================
-- BUCKET 2: post-images
-- ===================================
-- Purpose: Store LinkedIn post images
-- Access: Private (images uploaded to LinkedIn, not served from our storage)
-- Max file size: 10MB

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-images',
  'post-images',
  false,  -- private access
  10485760,  -- 10MB in bytes
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS Policy: Clients can upload post images
CREATE POLICY "Clients can upload post images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'post-images'
  AND (storage.foldername(name))[1] = (
    SELECT client_id::text
    FROM users
    WHERE id = auth.uid()
  )
);

-- RLS Policy: Clients can view their own post images
CREATE POLICY "Clients can view their post images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'post-images'
  AND (storage.foldername(name))[1] = (
    SELECT client_id::text
    FROM users
    WHERE id = auth.uid()
  )
);

-- RLS Policy: Clients can delete their post images
CREATE POLICY "Clients can delete their post images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'post-images'
  AND (storage.foldername(name))[1] = (
    SELECT client_id::text
    FROM users
    WHERE id = auth.uid()
  )
);

-- ===================================
-- VERIFICATION
-- ===================================

-- Check if buckets exist
SELECT
  id,
  name,
  public,
  file_size_limit / 1048576 as max_size_mb,
  allowed_mime_types,
  created_at
FROM storage.buckets
WHERE id IN ('lead-magnets', 'post-images')
ORDER BY name;

-- Check RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%lead%'
  OR policyname LIKE '%post%'
ORDER BY policyname;
