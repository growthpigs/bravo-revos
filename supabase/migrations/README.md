# Supabase Migrations

## Overview

This directory contains SQL migration files that set up the Bravo revOS database schema and storage configuration.

## Migration Files

### 001_initial_schema.sql
- Multi-tenancy tables (agencies, clients, users)
- LinkedIn integration tables (linkedin_accounts, posts, comments)
- Lead management tables (campaigns, leads, lead_magnets)
- Webhook tables (webhook_configs, webhook_deliveries)
- Engagement pod tables (pods, pod_members, pod_activities)
- Cartridge system tables (cartridges)
- Auto-update timestamp triggers

### 002_storage_setup.sql
- Supabase Storage bucket for lead magnets (private)
- Row Level Security (RLS) policies for multi-tenant isolation
- Helper function for retrieving client_id from authenticated user
- File upload/download access control

## Running Migrations

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of the migration file (e.g., `002_storage_setup.sql`)
4. Paste into the SQL Editor
5. Click **Run**

### Option 2: Supabase CLI

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations
supabase db push
```

## Storage Configuration

### Lead Magnets Bucket

- **Name**: `lead-magnets`
- **Type**: Private
- **Max File Size**: 10MB (10,485,760 bytes)
- **Allowed MIME Types**:
  - `application/pdf` (PDF)
  - `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (DOCX)
  - `application/vnd.openxmlformats-officedocument.presentationml.presentation` (PPTX)
  - `application/zip` (ZIP)

### Storage Path Structure

Files are stored with tenant isolation:
```
lead-magnets/
  {client_id}/
    {lead_magnet_id}/
      {filename}
```

Example: `lead-magnets/abc-123-def/xyz-789-ghi/ebook.pdf`

### RLS Policies

All storage policies enforce multi-tenant isolation using the authenticated user's `client_id`:

1. **Upload**: Clients can only upload to their own folder
2. **Read**: Clients can only read files in their own folder
3. **Update**: Clients can only update files in their own folder
4. **Delete**: Clients can only delete files in their own folder

## Testing Storage Setup

### Manual Test in Supabase Dashboard

1. Go to **Storage** in your Supabase dashboard
2. You should see the `lead-magnets` bucket
3. Try uploading a test PDF file
4. Verify the bucket is marked as **Private**

### API Test

Use the provided API endpoints:

```bash
# Upload a file (requires authentication)
curl -X POST http://localhost:3000/api/lead-magnets/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/test.pdf" \
  -F "lead_magnet_id=YOUR_LEAD_MAGNET_ID"

# Get download URL (requires authentication)
curl -X GET http://localhost:3000/api/lead-magnets/{id}/download \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Troubleshooting

### "Bucket already exists" error

If you see this error when running `002_storage_setup.sql`, the bucket may already exist. You can:

1. Check if the bucket exists in the Supabase dashboard
2. If it exists, comment out the `INSERT INTO storage.buckets` statement
3. Re-run the migration

### RLS Policy errors

If you get errors about policies already existing:

1. Drop existing policies first:
   ```sql
   DROP POLICY IF EXISTS "policy_name" ON storage.objects;
   ```
2. Re-run the migration

### Client ID not found

If you get errors about `client_id` not being found:

1. Ensure you've run `001_initial_schema.sql` first
2. Verify that the `users` table exists and has a `client_id` column
3. Check that the authenticated user has a record in the `users` table

## Security Notes

- All files are stored in a **private** bucket (not publicly accessible)
- Access is controlled through RLS policies based on the user's `client_id`
- File paths include the `client_id` to prevent cross-tenant access
- Signed URLs expire after 24 hours for security
- File uploads are validated for size (10MB max) and allowed types

## Next Steps

After running the migrations:

1. Test file upload via the API endpoint
2. Verify RLS policies work by trying to access files from different clients
3. Test download URL generation and expiry
4. Monitor storage usage in the Supabase dashboard
