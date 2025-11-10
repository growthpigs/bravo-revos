# Storage Buckets Setup Guide
**Date**: 2025-11-09
**Project**: RevOS (kvjcidxbyimoswntpjcp)
**Time**: 15 minutes

---

## Two Options: Dashboard UI (Easier) or SQL

### **OPTION A: Dashboard UI** (Recommended - 10 minutes)

Navigate to: https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp/storage/buckets

#### Step 1: Create `lead-magnets` Bucket

1. Click **"New bucket"**
2. Fill in details:
   - **Name**: `lead-magnets`
   - **Public bucket**: ✅ **YES** (enable toggle)
   - **File size limit**: `50 MB`
   - **Allowed MIME types**:
     ```
     application/pdf
     video/mp4
     video/quicktime
     image/jpeg
     image/png
     application/zip
     ```
3. Click **"Create bucket"**

4. **Configure RLS Policies**:
   - Click on `lead-magnets` bucket
   - Go to "Policies" tab
   - Add 3 policies:

   **Policy 1: Upload**
   - Name: `Clients can upload lead magnets`
   - Allowed operation: `INSERT`
   - Target roles: `authenticated`
   - USING expression:
     ```sql
     bucket_id = 'lead-magnets'
     AND (storage.foldername(name))[1] = (
       SELECT client_id::text FROM users WHERE id = auth.uid()
     )
     ```

   **Policy 2: View (Public)**
   - Name: `Public can view lead magnets`
   - Allowed operation: `SELECT`
   - Target roles: `public`
   - USING expression:
     ```sql
     bucket_id = 'lead-magnets'
     ```

   **Policy 3: Delete**
   - Name: `Clients can delete their lead magnets`
   - Allowed operation: `DELETE`
   - Target roles: `authenticated`
   - USING expression:
     ```sql
     bucket_id = 'lead-magnets'
     AND (storage.foldername(name))[1] = (
       SELECT client_id::text FROM users WHERE id = auth.uid()
     )
     ```

---

#### Step 2: Create `post-images` Bucket

1. Click **"New bucket"**
2. Fill in details:
   - **Name**: `post-images`
   - **Public bucket**: ❌ **NO** (keep private)
   - **File size limit**: `10 MB`
   - **Allowed MIME types**:
     ```
     image/jpeg
     image/png
     image/gif
     image/webp
     ```
3. Click **"Create bucket"**

4. **Configure RLS Policies**:
   - Click on `post-images` bucket
   - Go to "Policies" tab
   - Add 3 policies:

   **Policy 1: Upload**
   - Name: `Clients can upload post images`
   - Allowed operation: `INSERT`
   - Target roles: `authenticated`
   - USING expression:
     ```sql
     bucket_id = 'post-images'
     AND (storage.foldername(name))[1] = (
       SELECT client_id::text FROM users WHERE id = auth.uid()
     )
     ```

   **Policy 2: View (Private)**
   - Name: `Clients can view their post images`
   - Allowed operation: `SELECT`
   - Target roles: `authenticated`
   - USING expression:
     ```sql
     bucket_id = 'post-images'
     AND (storage.foldername(name))[1] = (
       SELECT client_id::text FROM users WHERE id = auth.uid()
     )
     ```

   **Policy 3: Delete**
   - Name: `Clients can delete their post images`
   - Allowed operation: `DELETE`
   - Target roles: `authenticated`
   - USING expression:
     ```sql
     bucket_id = 'post-images'
     AND (storage.foldername(name))[1] = (
       SELECT client_id::text FROM users WHERE id = auth.uid()
     )
     ```

---

### **OPTION B: SQL Script** (Faster if comfortable with SQL - 5 minutes)

1. Navigate to: https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp/sql/new
2. Copy contents of `/scripts/create-storage-buckets.sql`
3. Click **"Run"**
4. Verify output shows 2 buckets created

---

## Folder Structure (How Files Will Be Organized)

### lead-magnets bucket:
```
lead-magnets/
├── {client_id_1}/
│   ├── ultimate-seo-guide.pdf
│   ├── video-tutorial.mp4
│   └── case-study.pdf
├── {client_id_2}/
│   ├── marketing-toolkit.zip
│   └── webinar-recording.mp4
```

### post-images bucket:
```
post-images/
├── {client_id_1}/
│   ├── post-1234-image.jpg
│   ├── post-5678-image.png
│   └── post-9012-image.jpg
├── {client_id_2}/
│   ├── post-3456-image.jpg
│   └── post-7890-image.jpg
```

**File naming convention**: `{timestamp}-{original-filename}` or `post-{post_id}-{random}.jpg`

---

## Usage in Code

### Upload Example (Lead Magnet)

```typescript
// app/api/lead-magnets/upload/route.ts
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get client_id
  const { data: userData } = await supabase
    .from('users')
    .select('client_id')
    .eq('id', user.id)
    .single()

  const formData = await req.formData()
  const file = formData.get('file') as File

  const filePath = `${userData.client_id}/${Date.now()}-${file.name}`

  const { data, error } = await supabase.storage
    .from('lead-magnets')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) return Response.json({ error: error.message }, { status: 400 })

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('lead-magnets')
    .getPublicUrl(filePath)

  return Response.json({ url: publicUrl, path: filePath })
}
```

### Delete Example

```typescript
// Delete lead magnet file
const { error } = await supabase.storage
  .from('lead-magnets')
  .remove([filePath])
```

---

## Verification Steps

After creating buckets, verify:

1. ✅ **Buckets exist**:
   - Navigate to Storage tab
   - See `lead-magnets` (public) and `post-images` (private)

2. ✅ **RLS policies active**:
   - Each bucket has 3 policies (INSERT, SELECT, DELETE)
   - Policies show green checkmark

3. ✅ **Test upload** (optional):
   - In Supabase dashboard, try uploading a test file
   - Should work without errors

---

## Troubleshooting

### Error: "Bucket already exists"
**Solution**: Bucket was created previously. No action needed - verify it exists in dashboard.

### Error: "new row violates row-level security policy"
**Solution**: RLS policies not configured correctly. Re-run policy creation SQL or use dashboard UI.

### Error: "File size exceeds limit"
**Solution**: Adjust `file_size_limit` in bucket settings (50MB for lead-magnets, 10MB for post-images).

---

## ✅ Completion Checklist

- [ ] `lead-magnets` bucket created (public)
- [ ] `lead-magnets` has 3 RLS policies (INSERT, SELECT, DELETE)
- [ ] `post-images` bucket created (private)
- [ ] `post-images` has 3 RLS policies (INSERT, SELECT, DELETE)
- [ ] Both buckets visible in Supabase Storage dashboard
- [ ] File size limits set correctly (50MB, 10MB)
- [ ] MIME types configured

**Estimated time**: 10-15 minutes
**Status after completion**: Ready for Lead Magnets and Posts implementation

